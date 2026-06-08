import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type Stripe from 'stripe';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest, env } from './_lib/env';
import { stripe } from './_lib/stripe';
import { syncProductToStripe, StripeSyncResult, SyncableProduct } from './_lib/stripeSync';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type ImageEntry = { url: string; alt?: string };

// Accepts either:
//   - Bearer ${PRODUCT_API_KEY}        (AI agents / curl)
//   - Bearer <Supabase JWT>            (admin UI authenticated user)
async function authorize(request: Request): Promise<boolean> {
  const auth = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  if (token === env('PRODUCT_API_KEY')) return true;
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data?.user;
}

function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  });
}

function previewUrl(request: Request, slug: string, token: string): string {
  return `${new URL(request.url).origin}/product/${slug}?preview=${token}`;
}

function liveUrl(request: Request, slug: string): string {
  return `${new URL(request.url).origin}/product/${slug}`;
}

// Public reads return only the public projection — never the publish capability
// (preview_token), the staged draft, the test flag, or the internal status/checkout
// columns. (The live frontend reads via the anon client's explicit list; this is the
// server-side mirror of that boundary. New *public* columns flow through automatically;
// only a new secret/internal column ever needs adding here.)
function publicView<T extends Record<string, unknown>>(row: T) {
  const {
    draft, preview_token, is_test,
    is_published, published_at, archived_at, stripe_product_id,
    checkout_name, checkout_description, checkout_image,
    ...pub
  } = row;
  return pub;
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const id = url.searchParams.get('id');
  const previewToken = url.searchParams.get('preview');
  const isAuthorized = await authorize(request);

  // v1.5: list active discounts (?_action=coupon, GET) — admin/GPT only.
  if (url.searchParams.get('_action') === 'coupon') return handleCouponList(request);

  // v1.5 preview: a valid preview_token grants a one-off read of the unpublished/draft
  // row (capability URL — no login). Returns the live row with `draft` overlaid, so the
  // product page renders exactly what publishing will make live.
  if (slug && previewToken) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('preview_token', previewToken)
      .eq('is_test', isTest)
      .maybeSingle();
    if (error) {
      console.error('Product GET (preview) failed:', error.message);
      return jsonResponse(request, { error: 'Failed to load preview' }, 500);
    }
    if (!data) return jsonResponse(request, { error: 'Preview not found' }, 404);
    const merged =
      data.draft && typeof data.draft === 'object'
        ? { ...data, ...(data.draft as Record<string, unknown>), draft: null }
        : data;
    return jsonResponse(request, merged);
  }

  if (slug) {
    let query = supabase.from('products').select('*').eq('slug', slug);
    if (!isAuthorized) {
      query = query.eq('is_test', false).eq('is_published', true).is('archived_at', null);
    } else {
      query = query.eq('is_test', isTest);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('Product GET (slug) failed:', error.message);
      return jsonResponse(request, { error: 'Failed to load product' }, 500);
    }
    if (!data) return jsonResponse(request, { error: 'Product not found' }, 404);
    if (isAuthorized && (data.preview_token || data.draft)) {
      const draftObj =
        data.draft && typeof data.draft === 'object' ? (data.draft as Record<string, unknown>) : {};
      return jsonResponse(request, {
        ...data,
        effective: { ...(data as Record<string, unknown>), ...draftObj },
        ...(data.preview_token
          ? { preview_url: previewUrl(request, String(data.slug), String(data.preview_token)) }
          : {}),
      });
    }
    return jsonResponse(request, isAuthorized ? data : publicView(data));
  }

  if (id) {
    if (!isAuthorized) {
      return jsonResponse(request, { error: 'Unauthorized' }, 401);
    }
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_test', isTest)
      .maybeSingle();
    if (error) {
      console.error('Product GET (id) failed:', error.message);
      return jsonResponse(request, { error: 'Failed to load product' }, 500);
    }
    if (!data) return jsonResponse(request, { error: 'Product not found' }, 404);
    return jsonResponse(request, data);
  }

  let listQuery = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (!isAuthorized) {
    listQuery = listQuery.eq('is_test', false).eq('is_published', true).is('archived_at', null);
  } else {
    listQuery = listQuery.eq('is_test', isTest);
  }

  const { data, error } = await listQuery;
  if (error) {
    console.error('Product GET (list) failed:', error.message);
    return jsonResponse(request, { error: 'Failed to load products' }, 500);
  }
  return jsonResponse(request, {
    products: isAuthorized ? (data ?? []) : (data ?? []).map(publicView),
  });
}

export async function POST(request: Request) {
  const action = new URL(request.url).searchParams.get('_action');
  if (action === 'publish') return handlePublish(request);
  if (action === 'coupon') return handleCoupon(request);
  if (action === 'coupon_deactivate') return handleCouponDeactivate(request);
  if (action === 'archive') return handleArchive(request, true);    // 1.12 — remove from store
  if (action === 'unarchive') return handleArchive(request, false); // 1.12 — bring it back
  if (action === 'discard') return handleDiscard(request);          // Scrap a staged draft

  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }

  let product: Record<string, unknown>;
  try {
    product = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(request, { error: 'Invalid JSON' }, 400);
  }

  // Per-type product-shape validation, shared with first-publish (handlePublish) via the module-scope
  // helper below. Reports ALL problems at once (joined) instead of one-at-a-time.
  const problems = validateProductRules(product as Record<string, unknown>);
  if (problems.length) {
    return jsonResponse(request, { error: problems.join('; ') }, 400);
  }

  const title = String(product.title).trim();
  // Normalize whatever slug we land on (caller-supplied OR title-derived) to a URL-safe handle:
  // ASCII-FOLD accents first (café → cafe) so this CONVERGES with the GPT's client-side slug — the GPT
  // uploads photos to R2 under the slug it computed, BEFORE the row exists, so the two MUST agree or the
  // images land in a different folder than the product (page renders, photos 404). Without the fold, the
  // server would *strip* `é` (→ "caf") while an LLM typically folds it (→ "cafe") = divergence. Then:
  // lowercase, spaces→'-', drop anything not [a-z0-9-], collapse repeat hyphens, trim edge hyphens.
  const slugify = (s: string): string =>
    s
      .normalize('NFKD')                 // decompose accents: 'é' → 'e' + combining mark
      .replace(/[\u0300-\u036f]/g, '')   // strip the combining marks → plain ASCII letter
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
  const rawSlug =
    typeof product.slug === 'string' && product.slug.trim() ? product.slug : title;
  // Empty-guard: a title with NO ascii-foldable chars (e.g. all-CJK) slugifies to '' — which would let
  // the hidden `set_slug` DB trigger (below) fire and store the RAW, un-normalized title as the slug.
  // Fall back to a safe unique handle so `product.slug` is ALWAYS a non-empty normalized value and the
  // trigger never wins. (This store's titles are English; this is the degenerate-input backstop.)
  const slug = slugify(rawSlug) || `product-${randomUUID().slice(0, 8)}`;
  product.slug = slug;   // ← lands on `product`, so CREATE_FIELDS' pick of 'slug' captures it

  const { data: existing, error: lookupError } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (lookupError) {
    console.error('Slug lookup failed:', lookupError.message);
    return jsonResponse(request, { error: 'Failed to verify slug' }, 500);
  }
  if (existing) {
    return jsonResponse(request, { error: 'slug_conflict' }, 409);
  }

  const previewToken = randomUUID();
  // build the insert from an explicit allow-list (mirrors the PUT `pick(...)`), so the
  // v1.5 system columns (draft, archived_at, published_at, stripe_*, is_published, is_test,
  // preview_token) can never be injected by a caller. `product` is the raw request body; only these
  // keys pass through, then the server-set columns are layered on. Defined inline (DRAFTABLE is module
  // scope, resolved at request time) to avoid any declaration-order TDZ.
  const CREATE_FIELDS = [
    ...DRAFTABLE,
    'price', 'checkout_name', 'checkout_description', 'checkout_image', 'title', 'slug',
  ];
  // NB: `sku` is intentionally NOT allow-listed — it is DB-generated by a column DEFAULT
  // (`'EVE-' || substr(gen_random_uuid()::text,1,8)`, schema below). Allow-listing a caller `sku`
  // would let a stray caller override the auto value and risk a UNIQUE violation; omit it so the
  // default always fires.
  const cleanCreate: Record<string, unknown> = {};
  for (const k of CREATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(product, k)) cleanCreate[k] = product[k];
  }
  const insertRow = { ...cleanCreate, is_test: isTest, is_published: false, preview_token: previewToken };

  const { data, error } = await supabase
    .from('products')
    .insert(insertRow)
    .select()
    .single();

  if (error) {
    console.error('Product insert failed:', error.message);
    return jsonResponse(request, { error: error.message }, 400);
  }

  // v1.5: products are created as UNPUBLISHED drafts. No Stripe object is created here —
  // the Stripe product/price are created at publish (?_action=publish), so an abandoned
  // draft never orphans a Stripe product. The DB INSERT trigger also skips drafts.
  return jsonResponse(request, {
    success: true,
    product: data,
    preview_url: previewUrl(request, String(data.slug), previewToken),
    preview_token: previewToken,
  });
}

// Shared product-shape validator — used by BOTH create (POST) and first-publish (handlePublish), so a
// product can never go LIVE in a state create would reject (an edit that blanked `story_card`/`images`,
// then publish, would otherwise ship a malformed product). Returns human-readable problems; [] = OK.
// Per-type rules: `miniature` is the only type today; new types are added HERE, not by editing checks.
// `default` (= miniature) catches any unknown/new type so it is never left un-validated.
// SCOPE: the store is miniatures-only for now, so the GPT schemas advertise enum:[miniature]
// only. Supporting another product type (printable / storybook / etc.) is deferred future work, NOT a
// one-line enum edit — it needs (1) a new PRODUCT_TYPE_RULES entry here defining that type's gallery/
// field/thumbnail minimums, (2) re-adding the type to BOTH the createProduct AND editProduct schema
// enums (§9.1), and (3) any page-render differences for that type. Until then the miniature fallback is
// the safe default (a stray/legacy type validates as a miniature rather than going un-checked).
type TypeRules = { required: string[]; minHero: number; minGallery: number; requireThumbnail: boolean };
const PRODUCT_TYPE_RULES: Record<string, TypeRules> = {
  miniature: {
    required: ['title', 'description', 'price', 'product_type', 'headline', 'story_card'],
    minHero: 1, minGallery: 5, requireThumbnail: true,
  },
};
function validateProductRules(p: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const typeKey = typeof p.product_type === 'string' ? p.product_type : '';
  const rules: TypeRules = PRODUCT_TYPE_RULES[typeKey] ?? PRODUCT_TYPE_RULES.miniature;

  const missing = rules.required.filter((f) => {
    const v = p[f];
    if (v === undefined || v === null) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  });
  if (missing.length) problems.push(`Missing required fields: ${missing.join(', ')}`);

  if (!Number.isInteger(p.price) || (p.price as number) <= 0) {
    problems.push('Price must be a positive integer in cents');
  }

  const needsImages = rules.minHero > 0 || rules.minGallery > 0 || rules.requireThumbnail;
  const images = Array.isArray(p.images) ? (p.images as ImageEntry[]) : null;
  if (needsImages && (!images || images.length === 0)) problems.push('images array is required');
  const imgList = images ?? [];
  const filenameOf = (img: ImageEntry): string => {
    const u = typeof img?.url === 'string' ? img.url : '';
    return u.split('/').pop() ?? '';
  };
  const roleName = (img: ImageEntry): string => filenameOf(img).replace(/^test_/, '');
  const heroImages = imgList.filter((img) => roleName(img).startsWith('hero-'));
  const galleryImages = imgList.filter((img) => roleName(img).startsWith('gallery-'));
  if (heroImages.length < rules.minHero) problems.push(`At least ${rules.minHero} hero image(s) required`);
  if (rules.requireThumbnail && (typeof p.thumbnail !== 'string' || !(p.thumbnail as string).trim())) {
    problems.push('Thumbnail URL required');
  }
  if (galleryImages.length < rules.minGallery) problems.push(`Minimum ${rules.minGallery} gallery images required`);

  return problems;
}

const DRAFTABLE = [
  'title', 'description', 'headline', 'story_card', 'features', 'images', 'media',
  'thumbnail', 'thumbnail_alt', 'seo_title', 'seo_description', 'seo_thumbnail',
  'available', 'featured', 'quantity', 'dimensions', 'weight', 'materials',
  'power_supply', 'care_instructions', 'shipping_details', 'series', 'product_type', 'artist_note',
  'homepage_theme',
];
// `available` + `quantity` stay in DRAFTABLE for the UNPUBLISHED-draft branch (where everything applies
// to live columns anyway — nothing's live yet). On a PUBLISHED row they're BOTH pulled out and applied
// LIVE immediately (like price) — see the published branch's
// `DRAFTABLE.filter(k => k !== 'available' && k !== 'quantity')`. `price` is NOT frozen — it rotates in
// place (handled in the published branch below). The checkout IDENTITY fields + the Stripe IDs stay
// frozen after publish; `sku` is DB-generated (never caller-set) and also immutable.
const FROZEN_AFTER_PUBLISH = [
  'checkout_name', 'checkout_description', 'checkout_image',
  'sku', 'stripe_product_id', 'stripe_price_id',
];

export async function PUT(request: Request) {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return jsonResponse(request, { error: 'Missing id parameter' }, 400);
  }

  let updates: Record<string, unknown>;
  try {
    updates = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(request, { error: 'Invalid JSON' }, 400);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'slug')) {
    return jsonResponse(request, { error: 'slug is immutable' }, 400);
  }

  const { data: current, error: currentError } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('is_test', isTest)
    .maybeSingle();
  if (currentError) {
    console.error('Product lookup failed:', currentError.message);
    return jsonResponse(request, { error: 'Failed to load product' }, 500);
  }
  if (!current) {
    return jsonResponse(request, { error: 'Product not found' }, 404);
  }

  const pick = (keys: string[]): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(updates, k)) out[k] = updates[k];
    }
    return out;
  };

  const previewToken = randomUUID();

  // Published product: copy/SEO edits are STAGED in `draft` (live columns keep serving the site until
  // publish). The checkout IDENTITY fields stay frozen; `price` is NOT frozen — it ROTATES in place
  // and applies to the live columns immediately (a number needs no visual preview).
  if (current.is_published) {
    // Reject a frozen field only when it actually CHANGES. The admin's
    // buildProductPayload ALWAYS emits checkout_* (blank → null, admin.js:394 + Phase 8.5), so a
    // presence-only check 400'd EVERY admin edit of a published product — §1.6's "one safety path"
    // dead on arrival. (The GPT path escaped only because §9.2 tells it to send changed fields.) All
    // FROZEN fields are scalars (string|null) so `!==` is a correct value-compare: re-sending an
    // unchanged value passes; a genuine checkout change still gets the explanatory 400. `price` is
    // excluded — it rotates below.
    const frozenAttempt = FROZEN_AFTER_PUBLISH.filter(
      (f) =>
        Object.prototype.hasOwnProperty.call(updates, f) &&
        updates[f] !== (current as Record<string, unknown>)[f],
    );
    if (frozenAttempt.length) {
      return jsonResponse(
        request,
        { error: `Frozen after publish: ${frozenAttempt.join(', ')}. The checkout name, description, and image are set once at publish. (Price can change — it rotates in place.)` },
        400,
      );
    }

    // Price rotation: a real price change rotates the Stripe Price on the SAME product and applies
    // to the LIVE columns immediately (a price needs no preview, so it never stages).
    //
    // ORDER MATTERS: create-new → write-DB → deactivate-old (best-effort). The naive
    // "deactivate old, then create new" is a real bug: if `prices.create` throws after the deactivate
    // succeeds, the handler 502s WITHOUT writing the DB, so `stripe_price_id` still points at the
    // now-INACTIVE old Price — Stripe rejects an inactive Price in a new Checkout Session, so the live
    // product is silently UNBUYABLE until a later rotation happens to succeed. By creating first and
    // only deactivating after the DB commit, every failure path leaves a buyable product (old
    // active+referenced before the commit, or new active+referenced after it). The old Price is never
    // referenced once the DB points at the new one, so its deactivation is non-fatal cleanup. (This
    // intentionally diverges from the pre-v1.5 PUT ordering — the prior approach is not presumed best.)
    const liveUpdate: Record<string, unknown> = {};
    let oldPriceIdToDeactivate: string | null = null;
    if (
      updates.price !== undefined &&
      updates.price !== (current as Record<string, unknown>).price
    ) {
      if (!Number.isInteger(updates.price) || (updates.price as number) <= 0) {
        return jsonResponse(request, { error: 'Price must be a positive integer in cents' }, 400);
      }
      if (current.stripe_product_id && current.stripe_price_id) {
        try {
          const newPrice = await stripe.prices.create({
            product: current.stripe_product_id as string,
            unit_amount: updates.price as number,
            currency: 'usd',
          });
          liveUpdate.stripe_price_id = newPrice.id;
          oldPriceIdToDeactivate = current.stripe_price_id as string; // deactivate AFTER the DB commit
        } catch (err) {
          console.error('Stripe price rotation failed (DB untouched; old price still active):', err);
          return jsonResponse(request, { error: 'Failed to update the price in Stripe' }, 502);
        }
      }
      liveUpdate.price = updates.price;
    }

    // `available` (the sold / on-sale flag) and `quantity` (stock count) go LIVE immediately on a
    // published row, like price — neither is a visual change that needs a preview, and both gate
    // purchasability (checkout.ts:79 `available !== true || (quantity ?? 0) < 1`). `available` is also
    // flipped live by a real purchase (webhook.ts:128). Staging them would let "mark it sold" /
    // "restock to 3" sit un-applied until publish (an oversell / stale-stock trap). So apply them live,
    // and exclude them from staging below. CHANGE-DETECT (like price) so a no-op re-send (the admin's
    // buildProductPayload emits both on every save) doesn't write or report a spurious update.
    if (
      updates.available !== undefined &&
      updates.available !== (current as Record<string, unknown>).available
    ) {
      // parity with the quantity guard below: reject a malformed value rather than silently ignoring it
      // (the admin/GPT schemas type it boolean, so this only fires on a bad caller).
      if (typeof updates.available !== 'boolean') {
        return jsonResponse(request, { error: 'Availability must be true or false' }, 400);
      }
      liveUpdate.available = updates.available;
    }
    if (
      updates.quantity !== undefined &&
      updates.quantity !== (current as Record<string, unknown>).quantity
    ) {
      if (!Number.isInteger(updates.quantity) || (updates.quantity as number) < 0) {
        return jsonResponse(request, { error: 'Quantity must be a non-negative integer (0 = sold out)' }, 400);
      }
      liveUpdate.quantity = updates.quantity;
    }

    // Stage copy/SEO edits — but ONLY the ones that genuinely differ from what's LIVE. The invariant:
    // `draft` is exactly the set of fields whose desired value differs from the LIVE column. So
    // value-compare each draftable key against the live column `current[k]` and keep only the keys that
    // differ. (Do NOT compare against the staged value instead: the admin form is populated from the
    // live columns and buildProductPayload re-sends the FULL payload every save, so comparing against
    // the staged value would re-stage the live value over a staged edit and silently lose it.) Comparing
    // against LIVE means a re-sent live value never re-stages: any staged field the caller didn't touch
    // is preserved by the `{...existingDraft, ...draftable}` spread below, and Phase 8's openEditor feeds
    // the staged values back so an unchanged re-save round-trips as a no-op. It also self-prunes (editing
    // a staged field back to its live value drops it). Without this, an availability/price/quantity-only
    // save (e.g. "mark it sold") would stage a phantom no-op copy draft and the panel would wrongly show
    // "Preview … Publish/Discard" instead of "live now — nothing to publish" (Tests #6/#23/#27 cover it).
    // JSON.stringify because DRAFTABLE is mostly jsonb/array — a plain `!==` is a reference compare
    // (always true) and would always-stage. `available` + `quantity` are handled live above, so they're
    // excluded here and never stage. (The price/available/quantity scalar guards above correctly use
    // plain `!==` — those three are scalars; only the draftable compare needs stringify.) KNOWN+ACCEPTED
    // edge: `homepage_theme` is the one DRAFTABLE object whose stringify compare is key-ORDER sensitive
    // — the admin re-parses the textarea (its key order) while Postgres jsonb returns normalized key
    // order, so an UNCHANGED theme can spuriously stage a phantom theme draft. Cosmetic (no data loss;
    // self-corrects on publish/discard) and `homepage_theme` is rarely-used + GPT-never-set — not worth
    // a canonicalizing deep-equal here.
    const existingDraft =
      current.draft && typeof current.draft === 'object'
        ? (current.draft as Record<string, unknown>)
        : {};
    const draftable = pick(
      DRAFTABLE.filter(
        (k) =>
          k !== 'available' &&
          k !== 'quantity' &&
          JSON.stringify(updates[k]) !== JSON.stringify((current as Record<string, unknown>)[k]),
      ),
    );
    const hasDraftable = Object.keys(draftable).length > 0;
    const rowUpdate: Record<string, unknown> = { ...liveUpdate };
    if (hasDraftable) {
      rowUpdate.draft = { ...existingDraft, ...draftable };
      rowUpdate.preview_token = previewToken;
    }
    if (Object.keys(rowUpdate).length === 0) {
      return jsonResponse(request, { success: true, product: current, no_changes: true });
    }
    const { data, error } = await supabase
      .from('products')
      .update(rowUpdate)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Product update failed:', error.message);
      return jsonResponse(request, { error: error.message }, 400);
    }
    // The DB now points at the new (active) Price — deactivate the old one as cleanup. Best-effort:
    // a failure here is harmless (the old Price is no longer referenced) and must NOT fail the request.
    if (oldPriceIdToDeactivate) {
      try {
        await stripe.prices.update(oldPriceIdToDeactivate, { active: false });
      } catch (err) {
        console.error('Old price deactivate failed (harmless — DB points at the new active price):', err);
      }
    }
    return jsonResponse(request, {
      success: true,
      product: data,
      staged: hasDraftable,
      ...(liveUpdate.price !== undefined ? { price_updated: true } : {}),
      ...(liveUpdate.available !== undefined ? { availability_updated: true } : {}),
      ...(liveUpdate.quantity !== undefined ? { quantity_updated: true } : {}),
      ...(hasDraftable
        ? { preview_url: previewUrl(request, String(data.slug), previewToken), preview_token: previewToken }
        : {}),
    });
  }

  // Unpublished draft: edits apply to live columns directly (nothing is live yet).
  // Price + checkout fields are still editable here — they freeze at publish.
  const clean = pick([...DRAFTABLE, 'checkout_name', 'checkout_description', 'checkout_image']);
  if (updates.price !== undefined) {
    if (!Number.isInteger(updates.price) || (updates.price as number) <= 0) {
      return jsonResponse(request, { error: 'Price must be a positive integer in cents' }, 400);
    }
    clean.price = updates.price;
  }
  const { data, error } = await supabase
    .from('products')
    .update({ ...clean, preview_token: previewToken })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Product update failed:', error.message);
    return jsonResponse(request, { error: error.message }, 400);
  }
  return jsonResponse(request, {
    success: true,
    product: data,
    preview_url: previewUrl(request, String(data.slug), previewToken),
    preview_token: previewToken,
  });
}

// ?_action=publish — Em's Publish button (capability via preview_token) or admin/GPT (auth + id).
async function handlePublish(request: Request): Promise<Response> {
  let body: { id?: string; token?: string };
  try {
    body = (await request.json()) as { id?: string; token?: string };
  } catch {
    return jsonResponse(request, { error: 'Invalid JSON' }, 400);
  }

  let query = supabase.from('products').select('*').eq('is_test', isTest);
  if (body.token) {
    query = query.eq('preview_token', body.token); // possessing the link = authority
  } else {
    if (!(await authorize(request))) {
      return jsonResponse(request, { error: 'Unauthorized' }, 401);
    }
    if (!body.id) return jsonResponse(request, { error: 'Missing id' }, 400);
    query = query.eq('id', body.id);
  }

  const { data: row, error: findError } = await query.maybeSingle();
  if (findError) {
    console.error('Publish lookup failed:', findError.message);
    return jsonResponse(request, { error: 'Failed to load product' }, 500);
  }
  if (!row) return jsonResponse(request, { error: 'Product not found' }, 404);

  // Breadth-pass guard: a product archived AFTER a preview link was shared still carries its
  // preview_token (archive doesn't clear it), so a stale link could publish an archived row →
  // split state (is_published=true + Stripe active, but archived_at set so RLS hides it). Refuse;
  // unarchive first. (Covers both the token path and the admin/GPT id path.)
  if (row.archived_at) {
    return jsonResponse(
      request,
      { error: 'This product is archived — resurface it (unarchive) before publishing.' },
      409,
    );
  }

  // Edit-publish: published row with staged draft → apply draft → live columns.
  if (row.is_published) {
    const draft =
      row.draft && typeof row.draft === 'object' ? (row.draft as Record<string, unknown>) : null;
    if (!draft) {
      return jsonResponse(request, { success: true, product: row, url: liveUrl(request, String(row.slug)), no_changes: true });
    }
    // Re-validate the MERGED result before it touches the live columns. A staged draft can
    // legitimately carry story_card:"" or images:[] (admin clears a field → `… || null`), and the
    // published-PUT stages whatever value arrives — so without this guard, publishing that edit would
    // ship a malformed, purchasable live product (empty story, or an empty images[] that breaks
    // populateHero/populateGallery). This is the SAME validator first-publish runs (see the branch
    // below), so the well-formed-product invariant holds on BOTH publish branches, not just first-publish.
    const merged = { ...(row as Record<string, unknown>), ...draft };
    const shapeProblems = validateProductRules(merged);
    if (shapeProblems.length) {
      return jsonResponse(request, { error: `Cannot publish — ${shapeProblems.join('; ')}` }, 400);
    }
    const { data: updated, error: applyError } = await supabase
      .from('products')
      .update({ ...draft, draft: null, preview_token: null })
      .eq('id', row.id)
      .select()
      .single();
    if (applyError) {
      console.error('Publish (apply draft) failed:', applyError.message);
      return jsonResponse(request, { error: applyError.message }, 400);
    }
    return jsonResponse(request, { success: true, product: updated, url: liveUrl(request, String(updated.slug)) });
  }

  // First publish: re-validate the SAME product-shape rules create enforces, THEN the checkout
  // essentials, THEN create Stripe + flip live. An unpublished product's edits write straight to its live
  // columns (the unpublished-draft PUT branch), so `row` already holds the current values — no draft
  // overlay to merge here. Together with the edit-publish guard above, validateProductRules now runs on
  // BOTH publish branches, so the invariant holds: a published product is always well-formed even if an
  // earlier edit blanked story_card / images.
  const shapeProblems = validateProductRules(row as Record<string, unknown>);
  if (shapeProblems.length) {
    return jsonResponse(request, { error: `Cannot publish — ${shapeProblems.join('; ')}` }, 400);
  }
  const checkoutImage = (row.checkout_image as string) || (row.thumbnail as string) || '';
  const missing: string[] = [];
  if (!row.checkout_name && !row.title) missing.push('checkout_name (or title)');
  if (!row.checkout_description && !row.description && !row.headline) missing.push('checkout_description');
  if (!checkoutImage) missing.push('checkout_image (or thumbnail)');
  if (!row.price) missing.push('price');
  if (missing.length) {
    return jsonResponse(request, { error: `Cannot publish — missing: ${missing.join(', ')}` }, 400);
  }

  let stripeSync: StripeSyncResult;
  try {
    stripeSync = await syncProductToStripe({ ...(row as SyncableProduct), checkout_image: checkoutImage });
  } catch (err) {
    console.error('Publish Stripe sync failed:', err);
    return jsonResponse(request, { error: 'Failed to create the Stripe product' }, 502);
  }

  const { data: published, error: pubError } = await supabase
    .from('products')
    .update({ is_published: true, published_at: new Date().toISOString(), draft: null, preview_token: null })
    .eq('id', row.id)
    .select()
    .single();
  if (pubError) {
    console.error('Publish (flip live) failed:', pubError.message);
    return jsonResponse(request, { error: pubError.message }, 400);
  }
  return jsonResponse(request, { success: true, product: published, url: liveUrl(request, String(published.slug)), stripe_sync: stripeSync });
}

// ?_action=coupon — create a Stripe Coupon + Promotion Code (admin/GPT only).
async function handleCoupon(request: Request): Promise<Response> {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }
  let body: {
    type?: 'percent' | 'amount';
    value?: number;
    code?: string;
    product_ids?: string[];
    min_amount?: number;
    expires_at?: number;
    max_redemptions?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse(request, { error: 'Invalid JSON' }, 400);
  }

  if (body.type !== 'percent' && body.type !== 'amount') {
    return jsonResponse(request, { error: "type must be 'percent' or 'amount'" }, 400);
  }
  if (typeof body.value !== 'number' || body.value <= 0) {
    return jsonResponse(request, { error: 'value must be a positive number' }, 400);
  }
  if (body.type === 'percent' && body.value > 100) {
    return jsonResponse(request, { error: 'percent value cannot exceed 100' }, 400);
  }

  // duration is required by Stripe; for one-time payments it is effectively moot —
  // the real limiters are max_redemptions + redeem_by/expires_at.
  const couponParams: Stripe.CouponCreateParams =
    body.type === 'percent'
      ? { duration: 'once', percent_off: body.value }
      : { duration: 'once', amount_off: Math.round(body.value), currency: 'usd' };
  if (Array.isArray(body.product_ids) && body.product_ids.length) {
    couponParams.applies_to = { products: body.product_ids };
  }
  if (typeof body.max_redemptions === 'number') couponParams.max_redemptions = body.max_redemptions;
  if (typeof body.expires_at === 'number') couponParams.redeem_by = body.expires_at;
  couponParams.metadata = { source: 'owner_sale' }; // tag so list/deactivate skip system codes

  try {
    const coupon = await stripe.coupons.create(couponParams);
    const promoParams: Stripe.PromotionCodeCreateParams = { coupon: coupon.id };
    if (body.code) promoParams.code = body.code;
    if (typeof body.min_amount === 'number') {
      promoParams.restrictions = { minimum_amount: Math.round(body.min_amount), minimum_amount_currency: 'usd' };
    }
    if (typeof body.expires_at === 'number') promoParams.expires_at = body.expires_at;
    const promo = await stripe.promotionCodes.create(promoParams);
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id });
  } catch (err) {
    if ((err as { code?: string })?.code === 'resource_already_exists') {
      return jsonResponse(request, { error: 'That coupon code already exists. Choose a different code.' }, 409);
    }
    console.error('Coupon create failed:', err);
    return jsonResponse(request, { error: 'Failed to create the coupon' }, 502);
  }
}

// ?_action=coupon (GET) — list active discounts so the owner can see/manage them.
async function handleCouponList(request: Request): Promise<Response> {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }
  try {
    // Stripe nests the FULL coupon object on each promotion code by default (no `expand` needed),
    // so pc.coupon.metadata is available here (verified API behaviour, not a guess).
    // AUTO-PAGINATE. The store auto-creates a system promo code per cart-recovery /
    // newsletter event (cart.ts:87 / subscribe.ts:40), all active until their expiry; a single
    // limit:100 page + client-side owner_sale filter would silently drop the owner's real sales once
    // >100 active codes accumulate. `for await` walks every page (Stripe's list is async-iterable);
    // a SCAN_CAP bounds the worst case so a pathological code count can't blow the function budget
    // (owner sales are few — found long before the cap).
    const coupons: Array<Record<string, unknown>> = [];
    let scanned = 0;
    const SCAN_CAP = 2000; // far above any realistic active-code count for this store
    for await (const pc of stripe.promotionCodes.list({ active: true, limit: 100 })) {
      scanned += 1;
      // Isolation keys on the COUPON's positive owner_sale tag (stamped in handleCoupon's create). This
      // is safe despite an asymmetry: system codes tag the PROMOTION CODE (cart.ts) or nothing
      // (subscribe.ts / _bootstrap), never the coupon — so they lack owner_sale and are correctly
      // excluded. Keep keying on the coupon-level tag; don't switch to promo metadata.
      if (pc.coupon?.metadata?.source === 'owner_sale') { // owner sales only
        // surface SCOPE so Em can verify by chat whether a sale is store-wide or
        // tied to specific pieces. applies_to.products holds the Stripe product ids the coupon is
        // limited to (empty/absent = store-wide).
        const scopedProducts = pc.coupon?.applies_to?.products ?? null;
        coupons.push({
          code: pc.code,
          promotion_code_id: pc.id,
          percent_off: pc.coupon?.percent_off ?? null,
          amount_off: pc.coupon?.amount_off ?? null,
          times_redeemed: pc.times_redeemed,
          max_redemptions: pc.max_redemptions ?? null,
          expires_at: pc.expires_at ?? null,
          store_wide: !scopedProducts || scopedProducts.length === 0,
          product_ids: scopedProducts && scopedProducts.length ? scopedProducts : null,
        });
      }
      if (scanned >= SCAN_CAP) break;
    }
    return jsonResponse(request, { coupons, truncated: scanned >= SCAN_CAP });
  } catch (err) {
    console.error('Coupon list failed:', err);
    return jsonResponse(request, { error: 'Failed to list coupons' }, 502);
  }
}

// ?_action=coupon_deactivate (POST) — end a sale now (promotion code active:false).
async function handleCouponDeactivate(request: Request): Promise<Response> {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }
  let body: { code?: string; promotion_code_id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse(request, { error: 'Invalid JSON' }, 400);
  }
  try {
    let promo: Stripe.PromotionCode | undefined;
    if (body.promotion_code_id) {
      promo = await stripe.promotionCodes.retrieve(body.promotion_code_id);
    } else if (body.code) {
      const found = await stripe.promotionCodes.list({ code: body.code, limit: 1 });
      promo = found.data[0];
    }
    if (!promo) return jsonResponse(request, { error: 'Coupon code not found' }, 404);
    if (promo.coupon?.metadata?.source !== 'owner_sale') { // never end a system code
      return jsonResponse(request, { error: "That code is system-managed and can't be ended here." }, 403);
    }
    const updated = await stripe.promotionCodes.update(promo.id, { active: false });
    return jsonResponse(request, { success: true, code: updated.code, active: updated.active });
  } catch (err) {
    console.error('Coupon deactivate failed:', err);
    return jsonResponse(request, { error: 'Failed to deactivate the coupon' }, 502);
  }
}

// ?_action=archive / unarchive (POST) — remove a product from the store (reversible) or bring it
// back (1.12). Archive sets archived_at + mirrors Stripe active:false; unarchive reverses both.
// "Delete" never hard-deletes — that's the deferred pg_cron purge.
async function handleArchive(request: Request, archive: boolean): Promise<Response> {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }
  let body: { id?: string };
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    return jsonResponse(request, { error: 'Invalid JSON' }, 400);
  }
  if (!body.id) return jsonResponse(request, { error: 'Missing id' }, 400);

  const { data: row, error: findError } = await supabase
    .from('products')
    .select('id, slug, stripe_product_id')
    .eq('id', body.id)
    .eq('is_test', isTest)
    .maybeSingle();
  if (findError) {
    console.error('Archive lookup failed:', findError.message);
    return jsonResponse(request, { error: 'Failed to load product' }, 500);
  }
  if (!row) return jsonResponse(request, { error: 'Product not found' }, 404);

  // Mirror to Stripe (forever-archive). Best-effort: if Stripe fails we still flip the DB so the
  // store reflects her intent — a stale-active Stripe product is harmless (the DB gates the site).
  if (row.stripe_product_id) {
    try {
      await stripe.products.update(row.stripe_product_id as string, { active: !archive });
    } catch (err) {
      console.error('Archive Stripe mirror failed (non-fatal):', err);
    }
  }

  const { data, error } = await supabase
    .from('products')
    .update({ archived_at: archive ? new Date().toISOString() : null })
    .eq('id', row.id)
    .select()
    .single();
  if (error) {
    console.error('Archive update failed:', error.message);
    return jsonResponse(request, { error: error.message }, 400);
  }
  return jsonResponse(request, { success: true, product: data, archived: archive });
}

// ?_action=discard (POST) — scrap a published row's STAGED draft without publishing. The inverse
// of publish. AUTH-ONLY (admin JWT / GPT key) — unlike publish, there is no discard control on the
// preview page, so it deliberately does NOT accept a preview_token (a token path here
// would let anyone holding a shared preview link wipe Em's staged edits, with no UX that needs it).
// Only meaningful on a published row with pending edits; an unpublished row IS its own draft (edit it,
// or archive it).
async function handleDiscard(request: Request): Promise<Response> {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }
  let body: { id?: string };
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    return jsonResponse(request, { error: 'Invalid JSON' }, 400);
  }
  if (!body.id) return jsonResponse(request, { error: 'Missing id' }, 400);

  const query = supabase.from('products').select('*').eq('is_test', isTest).eq('id', body.id);

  const { data: row, error: findError } = await query.maybeSingle();
  if (findError) {
    console.error('Discard lookup failed:', findError.message);
    return jsonResponse(request, { error: 'Failed to load product' }, 500);
  }
  if (!row) return jsonResponse(request, { error: 'Product not found' }, 404);

  if (!row.is_published) {
    return jsonResponse(
      request,
      { error: "Nothing to discard — this product isn't published yet (it's still a draft you can edit or archive)." },
      400,
    );
  }
  if (!row.draft) {
    // No staged edits — already clean. Idempotent success.
    return jsonResponse(request, { success: true, product: row, discarded: false });
  }

  const { data, error } = await supabase
    .from('products')
    .update({ draft: null, preview_token: null })
    .eq('id', row.id)
    .select()
    .single();
  if (error) {
    console.error('Discard update failed:', error.message);
    return jsonResponse(request, { error: error.message }, 400);
  }
  return jsonResponse(request, { success: true, product: data, discarded: true });
}
