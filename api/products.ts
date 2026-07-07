import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type Stripe from 'stripe';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest, env } from './_lib/env';
import { stripe } from './_lib/stripe';
import { syncProductToStripe, StripeSyncResult, SyncableProduct } from './_lib/stripeSync';
import { logActivity, resolveActor } from './_lib/activityLog';
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
    is_published, published_at, archived_at, stripe_product_id, scheduled_publish_at,
    checkout_name, checkout_description, checkout_image,
    ...pub
  } = row;
  return pub;
}

// --- Authorized list projection (GPT/admin) -------------------------------------------------
// The list endpoint returns full rows by default (the dashboard renders its tabs from them).
// An authorized caller can instead ask for a subset with ?view=summary or ?fields=a,b,c so a
// large catalog — or a pile of archived test pieces each dragging its images/media JSON — can't
// burst ChatGPT's ~100k-char Action response cap. `id` is ALWAYS returned (the capability to act
// on the piece); `preview_token` is NEVER projectable; derived tokens compute a compact value
// instead of the raw blob (e.g. `hero` = one URL, not the whole images array).
function heroImageUrl(row: Record<string, unknown>): string | null {
  const imgs = Array.isArray(row.images) ? (row.images as Array<Record<string, unknown>>) : [];
  const hero = imgs.find((i) => /\/(?:test_)?hero-/.test(String((i && i.url) || '')));
  return (hero && (hero.url as string)) || (imgs[0] && (imgs[0].url as string)) || null;
}
function thumbFieldUrl(row: Record<string, unknown>): string | null {
  if (row.thumbnail) return row.thumbnail as string;
  return heroImageUrl(row);
}
const DERIVED_FIELDS: Record<string, (row: Record<string, unknown>) => unknown> = {
  hero: heroImageUrl,
  thumbnail: thumbFieldUrl,
  has_pending_edits: (row) => row.draft != null,
  status: (row) =>
    row.archived_at ? 'archived' : row.draft != null ? 'pending' : row.is_published ? 'live' : 'draft',
};
const SUMMARY_FIELDS = [
  'slug', 'title', 'price', 'available', 'quantity', 'featured',
  'is_published', 'archived_at', 'has_pending_edits', 'stripe_product_id',
];
function projectRow(row: Record<string, unknown>, fields: string[]) {
  const out: Record<string, unknown> = { id: row.id };
  for (const f of fields) {
    if (!f || f === 'id' || f === 'preview_token') continue;
    if (f in DERIVED_FIELDS) out[f] = DERIVED_FIELDS[f](row);
    else if (f in row) out[f] = row[f];
  }
  return out;
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

  // v3.5: PUBLIC active store-wide sale read (?_action=active_sale, GET) — NO auth. The storefront
  // reads the single active auto_apply owner_sale % coupon for struck pricing + checkout auto-apply.
  if (url.searchParams.get('_action') === 'active_sale') return handleActiveSale(request);

  // v1.5: list active discounts (?_action=coupon, GET) — admin/GPT only.
  if (url.searchParams.get('_action') === 'coupon') return handleCouponList(request);

  // v3.5: recent activity feed (?_action=activity, GET) — admin/GPT only. Feeds the Account activity card.
  if (url.searchParams.get('_action') === 'activity') return handleActivityLog(request);

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

  const status = (url.searchParams.get('status') || '').toLowerCase();  // active|live|draft|pending|archived|all
  const view = (url.searchParams.get('view') || '').toLowerCase();       // summary|full
  const fieldsParam = url.searchParams.get('fields');                    // e.g. title,hero,price (any combo)

  let listQuery = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (!isAuthorized) {
    listQuery = listQuery.eq('is_test', false).eq('is_published', true).is('archived_at', null);
  } else {
    listQuery = listQuery.eq('is_test', isTest);
    // Opt-in status filter (authorized callers). No/unknown status ('all') = the full set — the
    // dashboard relies on that, it renders its live/draft/archived tabs client-side.
    if (status === 'active') listQuery = listQuery.is('archived_at', null);
    else if (status === 'live') listQuery = listQuery.eq('is_published', true).is('archived_at', null);
    else if (status === 'draft') listQuery = listQuery.eq('is_published', false).is('archived_at', null);
    else if (status === 'pending') listQuery = listQuery.not('draft', 'is', null).is('archived_at', null);
    else if (status === 'archived') listQuery = listQuery.not('archived_at', 'is', null);
  }

  const { data, error } = await listQuery;
  if (error) {
    console.error('Product GET (list) failed:', error.message);
    return jsonResponse(request, { error: 'Failed to load products' }, 500);
  }
  if (!isAuthorized) {
    return jsonResponse(request, { products: (data ?? []).map(publicView) });
  }
  // Authorized field trimming (opt-in): ?fields=a,b,c wins; else ?view=summary; else full rows
  // (the dashboard sends neither and is unchanged). Keeps a large catalog under the Action cap.
  let rows: unknown[] = data ?? [];
  if (fieldsParam) {
    const fields = fieldsParam.split(',').map((s) => s.trim()).filter(Boolean);
    rows = (data ?? []).map((r) => projectRow(r as Record<string, unknown>, fields));
  } else if (view === 'summary') {
    rows = (data ?? []).map((r) => projectRow(r as Record<string, unknown>, SUMMARY_FIELDS));
  }
  return jsonResponse(request, { products: rows });
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
  const problems = validateCreateShape(product as Record<string, unknown>);
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
  // price defaults to 0 for an unpriced draft (the column is NOT NULL; publish still gates price > 0).
  // cleanCreate.price overrides when the caller supplied one.
  const insertRow = { price: 0, ...cleanCreate, is_test: isTest, is_published: false, preview_token: previewToken };

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
  await logActivity({
    actor: await resolveActor(request),
    action: 'product.create',
    summary: `Created draft “${String(data.title)}”`,
    entityId: String(data.id),
  });
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
// PUBLISH gate — Sean v3.5 authoritative required set. Runs on BOTH publish branches (never on create),
// so a piece can go live only fully-formed. The auto-generated identity fields (checkout_*, seo_title,
// seo_description) are deliberately NOT here — publish fills them, so they never block. EXCEPTION (v4.0):
// seo_thumbnail (the Share / og:image) IS gated below — it's a real required asset, not auto-filled.
// Reports ALL problems at once.
function validatePublishRules(p: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const typeKey = typeof p.product_type === 'string' ? p.product_type : '';
  const rules: TypeRules = PRODUCT_TYPE_RULES[typeKey] ?? PRODUCT_TYPE_RULES.miniature;

  const str = (k: string) => (typeof p[k] === 'string' ? (p[k] as string).trim() : '');
  const list = (k: string) => (Array.isArray(p[k]) ? (p[k] as unknown[]).filter((x) => String(x).trim()) : []);

  // v3.7.3 (snake_case-400 RESOLVED, Sean option A): report missing fields in plain maker's language,
  // not raw snake_case keys — so the 400 reads legibly on BOTH surfaces (the portal + the GPT relay).
  const FIELD_LABELS: Record<string, string> = {
    title: 'Title', slug: 'Slug', headline: 'Headline', description: 'Description', story_card: 'Story',
    product_type: 'Product type', weight: 'Weight', features: 'Features', materials: 'Materials',
    care_instructions: 'Care instructions', shipping_details: 'Shipping details', quantity: 'Quantity',
  };
  const label = (k: string) => FIELD_LABELS[k] ?? k;

  const REQUIRED_STR = ['title', 'slug', 'headline', 'description', 'story_card', 'product_type', 'weight'];
  const missing = REQUIRED_STR.filter((f) => !str(f));
  const REQUIRED_LIST = ['features', 'materials', 'care_instructions', 'shipping_details'];
  for (const f of REQUIRED_LIST) if (!list(f).length) missing.push(f);
  if (p.quantity === undefined || p.quantity === null) missing.push('quantity');
  if (missing.length) problems.push(`Missing required fields: ${missing.map(label).join(', ')}`);

  if (!Number.isInteger(p.price) || (p.price as number) <= 0) {
    problems.push('Price must be a positive integer in cents');
  }
  if (p.quantity !== undefined && p.quantity !== null && (!Number.isInteger(p.quantity) || (p.quantity as number) < 0)) {
    problems.push('Quantity must be a non-negative integer');
  }

  // dimensions must parse to W · D · H (validate-and-format is a SURFACE concern; here we only gate).
  const dims = str('dimensions');
  const hasWDH = /([\d.]+)\s*"?\s*W/i.test(dims) && /([\d.]+)\s*"?\s*D/i.test(dims) && /([\d.]+)\s*"?\s*H/i.test(dims);
  if (!hasWDH) problems.push('dimensions (W × D × H) required');

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

  // v4.0 — a Share image (og:image = the seo_thumbnail column) is REQUIRED at publish. The old behavior
  // auto-filled it from the 4:5 hero, which makes an off-shape social card (Sean: not a helpful fallback).
  // Now the maker/GPT must set one — assign the Share role to any image and it crops 16:9. Gated on BOTH
  // publish branches, so the portal (client-gated too) and the GPT (self-corrects on this 400) agree.
  if (!str('seo_thumbnail')) problems.push('A Share image is required (seo_thumbnail) — give any image the Share role');

  // alt on every media asset (images + media[]).
  const altMissing = imgList.some((img) => !(typeof img?.alt === 'string' && img.alt.trim()));
  if (altMissing) problems.push('Every image needs alt text');
  const media = Array.isArray(p.media) ? (p.media as Array<Record<string, unknown>>) : [];
  if (media.some((m) => !(typeof m?.alt === 'string' && (m.alt as string).trim()))) {
    problems.push('Every video needs alt text');
  }

  return problems;
}

// CREATE shape — the DB-satisfiable minimum so an incomplete draft can persist (auto-save-as-draft).
// The full gate runs at publish (validatePublishRules), which re-validates on BOTH publish branches.
function validateCreateShape(p: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (typeof p.title !== 'string' || !p.title.trim()) problems.push('title is required');
  // Price is NOT required to CREATE a draft — it's a PUBLISH-gate field (validatePublishRules requires
  // price > 0), so media/preview can happen before pricing. An unpriced draft is price 0/absent (the
  // insert defaults an absent price to 0; the column is NOT NULL). If a price IS given, shape-check it.
  if (p.price !== undefined && p.price !== null && (!Number.isInteger(p.price) || (p.price as number) < 0)) {
    problems.push('Price must be a non-negative integer in cents');
  }
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

  // v3.7.1 (breadth journey #1): checkout identity is frozen for the LIFE of the piece, not just while
  // live. A paused/unpublished-but-previously-published row (published_at set, is_published=false) must
  // NOT re-open checkout_* — an edit sticks in the DB while syncProductToStripe short-circuits on the
  // existing stripe_product_id and never pushes it → a silent site↔Stripe desync. (Re-issuing checkout
  // identity is a deliberate, confirmed future feature, never a casual edit.)
  if (current.published_at) {
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
  }

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
      if (updates.available === false) {
        // v3.5 §3.6: turning Available OFF on a LIVE piece makes it a DRAFT (hidden), NOT "sold."
        // "Sold" is quantity===0 from a real sale (computed client-side; never stored). Unpublish so
        // computeState() resolves to `draft`. Republish is the maker turning it back ON → the surface
        // re-runs the publish flow (?_action=publish); Stripe is a no-op the 2nd time (stripe_product_id
        // already set — stripeSync.ts:40), so the piece comes back live without a duplicate Stripe product.
        liveUpdate.is_published = false;
        liveUpdate.available = false;
      } else {
        liveUpdate.available = updates.available;
      }
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
    // scheduled_publish_at: an auto-publish directive, applied LIVE (never staged — it's not copy). A
    // string ISO timestamp arms it; null clears it. The daily product-feed fold (WS2 Phase 2.6) does the
    // actual publish, and publishing clears it (Phase 2.5) so it fires at most once.
    if (
      updates.scheduled_publish_at !== undefined &&
      updates.scheduled_publish_at !== (current as Record<string, unknown>).scheduled_publish_at
    ) {
      const sched = updates.scheduled_publish_at;
      if (sched !== null && (typeof sched !== 'string' || Number.isNaN(Date.parse(sched)))) {
        return jsonResponse(request, { error: 'scheduled_publish_at must be an ISO timestamp or null' }, 400);
      }
      liveUpdate.scheduled_publish_at = sched;
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
    await logActivity({
      actor: await resolveActor(request),
      action: 'product.update',
      summary: hasDraftable ? `Staged edits on “${String(data.title)}”` : `Updated “${String(data.title)}”`,
      entityId: String(data.id),
    });
    return jsonResponse(request, {
      success: true,
      product: data,
      staged: hasDraftable,
      ...(liveUpdate.price !== undefined ? { price_updated: true } : {}),
      ...(liveUpdate.available !== undefined ? { availability_updated: true } : {}),
      ...(liveUpdate.quantity !== undefined ? { quantity_updated: true } : {}),
      ...(liveUpdate.is_published === false ? { unpublished: true } : {}),
      ...(liveUpdate.scheduled_publish_at !== undefined ? { scheduled_updated: true } : {}),
      ...(hasDraftable
        ? { preview_url: previewUrl(request, String(data.slug), previewToken), preview_token: previewToken }
        : {}),
    });
  }

  // Unpublished draft: edits apply to live columns directly (nothing is live yet).
  // Price + checkout fields are still editable here — they freeze at publish.
  const clean = pick([...DRAFTABLE, 'checkout_name', 'checkout_description', 'checkout_image', 'scheduled_publish_at']);
  if (
    updates.scheduled_publish_at !== undefined &&
    updates.scheduled_publish_at !== null &&
    (typeof updates.scheduled_publish_at !== 'string' || Number.isNaN(Date.parse(updates.scheduled_publish_at)))
  ) {
    return jsonResponse(request, { error: 'scheduled_publish_at must be an ISO timestamp or null' }, 400);
  }
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
  await logActivity({
    actor: await resolveActor(request),
    action: 'product.update',
    summary: `Updated draft “${String(data.title)}”`,
    entityId: String(data.id),
  });
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
    const shapeProblems = validatePublishRules(merged);
    if (shapeProblems.length) {
      return jsonResponse(request, { error: `Cannot publish — ${shapeProblems.join('; ')}` }, 400);
    }
    const { data: updated, error: applyError } = await supabase
      .from('products')
      .update({ ...draft, draft: null, preview_token: null, scheduled_publish_at: null })
      .eq('id', row.id)
      .select()
      .single();
    if (applyError) {
      console.error('Publish (apply draft) failed:', applyError.message);
      return jsonResponse(request, { error: applyError.message }, 400);
    }
    await logActivity({
      actor: await resolveActor(request),
      action: 'product.publish',
      summary: `Published edits to “${String(updated.title)}”`,
      entityId: String(updated.id),
    });
    return jsonResponse(request, { success: true, product: updated, url: liveUrl(request, String(updated.slug)) });
  }

  // First publish: re-validate the SAME product-shape rules create enforces, THEN the checkout
  // essentials, THEN create Stripe + flip live. An unpublished product's edits write straight to its live
  // columns (the unpublished-draft PUT branch), so `row` already holds the current values — no draft
  // overlay to merge here. Together with the edit-publish guard above, validatePublishRules now runs on
  // BOTH publish branches, so the invariant holds: a published product is always well-formed even if an
  // earlier edit blanked story_card / images.
  const shapeProblems = validatePublishRules(row as Record<string, unknown>);
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

  // Required-but-auto-generated (Sean v3.5): fill from other fields when blank so publish never blocks
  // on them; checkout_* then LOCK (FROZEN_AFTER_PUBLISH). checkoutImage is already resolved above (:658).
  const autoGen = {
    checkout_name: (row.checkout_name as string) || (row.title as string),
    checkout_description:
      (row.checkout_description as string) || (row.description as string) || (row.headline as string) || '',
    checkout_image: checkoutImage,
    seo_title: (row.seo_title as string) || (row.title as string),
    seo_description: (row.seo_description as string) || (row.description as string) || '',
    // NOTE: seo_thumbnail is NO LONGER auto-filled here — v4.0 REQUIRES a real Share image (gated in
    // validatePublishRules above), so the row already carries the maker's/GPT's own 16:9 card.
  };
  const { data: published, error: pubError } = await supabase
    .from('products')
    // available:true — publishing means "go live in the shop", so it flips the Available switch ON (the
    // model couples them: turning Available OFF unpublishes → PUT branch above). Without this, a first
    // publish left is_published:true + available:false = published-but-not-purchasable, an inconsistent
    // state. Covers scheduled auto-publish too (the cron POSTs this same ?_action=publish). quantity is
    // left as-is (a 0-stock piece still reads "sold out" via checkout.ts's quantity gate).
    .update({ is_published: true, available: true, published_at: (row.published_at as string) ?? new Date().toISOString(), draft: null, preview_token: null, scheduled_publish_at: null, ...autoGen })
    .eq('id', row.id)
    .select()
    .single();
  if (pubError) {
    console.error('Publish (flip live) failed:', pubError.message);
    return jsonResponse(request, { error: pubError.message }, 400);
  }
  await logActivity({
    actor: await resolveActor(request),
    action: 'product.publish',
    summary: `Published “${String(published.title)}”`,
    entityId: String(published.id),
  });
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
    expires_date?: string;   // YYYY-MM-DD — preferred; normalized to a store-TZ end-of-day below
    expires_at?: number;     // Unix (legacy/back-compat)
    max_redemptions?: number;
    auto_apply?: boolean;    // v3.5 — the no-code store-wide sale: apply on-site + struck pricing (percent only)
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

  if (typeof body.expires_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.expires_date)) {
    body.expires_at = endOfDayET(body.expires_date); // store-TZ end-of-day → redeem_by + promo.expires_at + the echo
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
  // v3.5 — auto_apply is the store-wide "no code needed" sale. Percent ONLY (struck pricing on-site
  // needs a ratio, not a flat cents amount); a $-off "store-wide" stays a plain shareable code.
  const autoApply = body.auto_apply === true && body.type === 'percent' && !(Array.isArray(body.product_ids) && body.product_ids.length); // v3.6.6 — auto_apply is store-wide ONLY: a product-scoped % coupon is never stamped auto_apply, so "auto_apply ⇒ store_wide" is a SERVER invariant (was caller-convention only); active_sale/struck then only ever reflect a whole-store sale (round-1 breadth #D)
  couponParams.metadata = autoApply
    ? { source: 'owner_sale', auto_apply: 'true' }
    : { source: 'owner_sale' }; // tag so list/deactivate skip system codes

  try {
    const coupon = await stripe.coupons.create(couponParams);
    const promoParams: Stripe.PromotionCodeCreateParams = { coupon: coupon.id };
    if (body.code) promoParams.code = body.code;
    if (typeof body.min_amount === 'number') {
      promoParams.restrictions = { minimum_amount: Math.round(body.min_amount), minimum_amount_currency: 'usd' };
    }
    if (typeof body.expires_at === 'number') promoParams.expires_at = body.expires_at;
    const promo = await stripe.promotionCodes.create(promoParams);
    // v3.5 — exactly ONE auto-apply store-wide sale runs at a time. Now that the new one exists,
    // end every OTHER active auto_apply owner_sale promo (best-effort: a failure here is non-fatal —
    // the storefront's active-sale read returns the first match, so the newest simply wins).
    if (autoApply) {
      let swept = 0;
      const SWEEP_CAP = 2000;
      for await (const pc of stripe.promotionCodes.list({ active: true, limit: 100 })) {
        swept += 1;
        if (pc.id !== promo.id && pc.coupon?.metadata?.source === 'owner_sale' && pc.coupon?.metadata?.auto_apply === 'true') {
          try { await stripe.promotionCodes.update(pc.id, { active: false }); }
          catch (err) { console.error('Superseding prior auto-sale failed (non-fatal):', err); }
        }
        if (swept >= SWEEP_CAP) break;
      }
    }
    await logActivity({
      actor: await resolveActor(request),
      action: 'sale.create',
      summary: `Created sale “${String(promo.code)}” — ${body.type === 'percent' ? `${body.value}% off` : `$${((body.value as number) / 100).toFixed(2)} off`}`,
      entityId: promo.id,
    });
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id, expires_display: typeof body.expires_at === 'number' ? formatExpiry(body.expires_at) : null });
  } catch (err) {
    if ((err as { code?: string })?.code === 'resource_already_exists') {
      return jsonResponse(request, { error: 'That coupon code already exists. Choose a different code.' }, 409);
    }
    console.error('Coupon create failed:', err);
    return jsonResponse(request, { error: 'Failed to create the coupon' }, 502);
  }
}

// One place to retarget if a future template "User" store isn't in ET — both expiry helpers read it
// instead of a literal, so cloning the project for another client is a one-line edit (AR#F14).
const STORE_TIMEZONE = 'America/New_York';

// Human-readable coupon expiry in the store's timezone, so the GPT/admin never decode a raw Unix
// timestamp (FEEDBACK_COUPON_v2_1_0: a raw expires_at was misread as July). Returned ALONGSIDE expires_at.
function formatExpiry(unixSeconds: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIMEZONE,
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(unixSeconds * 1000));
}

// End-of-day (23:59:59) on a YYYY-MM-DD calendar date, interpreted in the STORE timezone, as a Unix
// timestamp — so a coupon's stored expiry matches the date the owner picked regardless of their
// browser locale. Offset for THIS date is read EXPLICITLY via Intl formatToParts:
// never round-trip a localized string through `new Date()` — only ISO 8601 is guaranteed to parse,
// and toLocaleString's output is locale/ICU-version-dependent, so a Node/ICU bump could break it
// silently with no tsc warning. `shortOffset` yields "GMT-5" (EST) / "GMT-4" (EDT) for ET.
function endOfDayET(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: STORE_TIMEZONE, timeZoneName: 'shortOffset' })
    .formatToParts(new Date(Date.UTC(y, m - 1, d, 23, 59, 59)))
    .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-5';
  const offsetHours = Number(off.replace(/^GMT/, '').replace('−', '-')) || -5; // EST -5, EDT -4
  return Math.floor(Date.UTC(y, m - 1, d, 23 - offsetHours, 59, 59) / 1000);
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
          created: pc.created,   // promo creation epoch(s) — feeds the admin store-wide "since <date>"
          percent_off: pc.coupon?.percent_off ?? null,
          amount_off: pc.coupon?.amount_off ?? null,
          times_redeemed: pc.times_redeemed,
          max_redemptions: pc.max_redemptions ?? null,
          expires_at: pc.expires_at ?? null,
          expires_display: pc.expires_at ? formatExpiry(pc.expires_at) : null,
          min_amount: pc.restrictions?.minimum_amount ?? null,
          min_display: pc.restrictions?.minimum_amount != null ? '$' + (pc.restrictions.minimum_amount / 100).toFixed(2) : null,
          amount_display: pc.coupon?.amount_off != null ? '$' + (pc.coupon.amount_off / 100).toFixed(2) : null,
          store_wide: !scopedProducts || scopedProducts.length === 0,
          auto_apply: pc.coupon?.metadata?.auto_apply === 'true',
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

// ?_action=active_sale (GET) — PUBLIC, no auth. Returns the ONE active store-wide auto-apply sale
// (a % owner_sale coupon tagged auto_apply='true') for on-site struck pricing + checkout auto-apply,
// or { active:false }. Stripe test/live keys are env-scoped (api/_lib/stripe.ts), so this returns
// TEST codes on preview and LIVE codes in prod — the isTest boundary holds via the key, no DB filter.
// Edge-cached (s-maxage) so a busy storefront doesn't hit Stripe on every page view. Fails SOFT:
// any error reads as "no sale" (full price) so the store never breaks on a Stripe hiccup.
async function handleActiveSale(request: Request): Promise<Response> {
  const cacheHeaders = {
    ...corsHeaders(request),
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=15, s-maxage=30',   // short: storefront sees a sale start/end in ~30s (admin no longer reads this — it derives from the uncached coupon list)
  };
  try {
    let scanned = 0;
    const SCAN_CAP = 2000;
    for await (const pc of stripe.promotionCodes.list({ active: true, limit: 100 })) {
      scanned += 1;
      if (
        pc.coupon?.metadata?.source === 'owner_sale' &&
        pc.coupon?.metadata?.auto_apply === 'true' &&
        pc.coupon?.percent_off != null
      ) {
        return new Response(JSON.stringify({
          active: true,
          type: 'percent',
          value: pc.coupon.percent_off,
          code: pc.code,
          amount_display: pc.coupon.percent_off + '% off',
        }), { status: 200, headers: cacheHeaders });
      }
      if (scanned >= SCAN_CAP) break;
    }
    return new Response(JSON.stringify({ active: false }), { status: 200, headers: cacheHeaders });
  } catch (err) {
    console.error('Active-sale read failed (soft — treated as no sale):', err);
    return new Response(JSON.stringify({ active: false }), { status: 200, headers: corsHeaders(request) });
  }
}

// ?_action=activity (GET) — recent activity feed for the Account surface's activity card. Admin/GPT only
// (audit trail is not public). Newest-first, capped at 25, scoped by isTest. Returns the exact
// { at, actor, action, summary } shape window.PORTAL_DATA.activityLog expects (design-handoff out/data.js).
async function handleActivityLog(request: Request): Promise<Response> {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }
  const { data, error } = await supabase
    .from('activity_log')
    .select('at, actor, action, summary')
    .eq('is_test', isTest)
    .order('at', { ascending: false })
    .limit(25);
  if (error) {
    console.error('Activity log GET failed:', error.message);
    return jsonResponse(request, { error: 'Failed to load activity' }, 500);
  }
  return jsonResponse(request, { activityLog: data ?? [] });
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
    await logActivity({
      actor: await resolveActor(request),
      action: 'sale.end',
      summary: `Ended sale “${String(updated.code)}”`,
      entityId: updated.id,
    });
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
  await logActivity({
    actor: await resolveActor(request),
    action: archive ? 'product.archive' : 'product.unarchive',
    summary: archive ? `Archived “${String(data.title)}”` : `Resurfaced “${String(data.title)}”`,
    entityId: String(data.id),
  });
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
  await logActivity({
    actor: await resolveActor(request),
    action: 'product.discard',
    summary: `Discarded staged edits on “${String(data.title)}”`,
    entityId: String(data.id),
  });
  return jsonResponse(request, { success: true, product: data, discarded: true });
}
