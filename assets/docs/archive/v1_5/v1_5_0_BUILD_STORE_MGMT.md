# v1.5.0 — AI Store Management: EXECUTABLE BUILD DOC

> **⚠️ SUPERSEDED — history only; do not build from this.** Re-merged into the single living plan `v1_5_1_IMPLEMENT.md` (its Part 2). Build from that doc.

**Source spec:** `assets/docs/archive/v1_5/v1_5_0_IMPLEMENT.md` (Part 1 — functionality).
**Branch:** `dev` · **Scope:** draft→preview→publish, the 3-tier field model, the Stripe-lock, coupons, admin draft/publish wiring + new fields, GPT actions/knowledge.
**Out of scope (separate later doc):** Part 2 design (glow/nav/filters/hero) + the admin *visual* restyle. GPT *configuration* is Sean's (this only authors the GPT docs).

---

## How to use this doc (anti-fragility rule)

Every edit quotes a **CURRENT** block (the locator) and a **NEW** block. **Line numbers are hints; the quoted CURRENT text is the anchor.** If a CURRENT block doesn't match the working tree byte-for-byte, **STOP and reconcile** — do not guess.

Invariants to preserve:
- **CommonJS / tsc-clean.** Run `npx tsc --noEmit -p tsconfig.json` after the `api/*.ts` edits; it must be clean.
- **No new functions.** Everything folds into existing `api/*.ts`; publish + coupon are `?_action=` sub-routes of `products.ts` reached via `vercel.json` rewrites (Phase 6). Function count stays 11/12.
- **Migration via Supabase CLI** (the MCP rejects writes on this project; anchor CWD at the repo root).
- **`is_test` isolation holds** — every new read/write stays scoped to the deployment's `isTest`.

---

## Pre-flight — verify these anchors before editing

| File                                                         | Anchor to confirm                                                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260421000002_rls_policies.sql`        | policy `"Products are publicly readable" … USING (true)` (lines 10–11)                                                  |
| `supabase/migrations/20260421000003_stripe_sync_webhook.sql` | `notify_stripe_sync()` with `IF NEW.is_test = true THEN RETURN NEW;` (22–25)                                            |
| `api/_lib/stripeSync.ts`                                     | `SyncableProduct` (11–22); `stripe.products.create({ name: product.title, …})` (61–70)                                  |
| `api/products.ts`                                            | imports (1–5); `authorize` (17–25); `jsonResponse` (27–32); `GET` (38–94); `POST` create+sync (96–211); `PUT` (213–291) |
| `api/checkout.ts`                                            | session select+guard (68–92); reserve select+filter (184–211)                                                           |
| `api/upload.ts`                                              | `ROLE_PATTERN` (52–53); transform (170–172)                                                                             |
| `vercel.json`                                                | `rewrites` array (7–15)                                                                                                 |
| `assets/js/product.js`                                       | `DOMContentLoaded` handler (7–39)                                                                                       |
| `assets/js/admin.js`                                         | `buildProductPayload` (382–429); `onSaveProduct` (431–468); `openEditor` seo lines (288–289)                            |
| `admin/index.html`                                           | SEO row (156–159); upload-role `<select>` (183–206); `form-actions` (218–223)                                           |
| `assets/docs/GPT_SETUP.md`                                   | Instructions block (97–124); schema `paths:` (136–283)                                                                  |

**Sweep already cleared (no change needed):** `api/product-feed.ts` and the homepage read via the **publishable/anon** client, so the new RLS policy (`is_published = true`) hides drafts from them automatically. `api/config.ts` reads no products. Only the **service-role** readers below get explicit guards.

---

## Phase 1 — Migration (new file)

Create `supabase/migrations/20260605000001_v1_5_draft_publish.sql`:

```sql
-- v1.5.0 — draft → preview → publish, 3-tier fields, Stripe-lock.

-- New columns -----------------------------------------------------------------
ALTER TABLE products ADD COLUMN checkout_name        text;
ALTER TABLE products ADD COLUMN checkout_description text;
ALTER TABLE products ADD COLUMN checkout_image       text;
ALTER TABLE products ADD COLUMN seo_thumbnail        text;
ALTER TABLE products ADD COLUMN is_published         boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN published_at         timestamptz;
ALTER TABLE products ADD COLUMN draft                jsonb;
ALTER TABLE products ADD COLUMN preview_token        text UNIQUE;

-- Backfill: existing live (already Stripe-synced) products are published. Fail-closed:
-- anything without a Stripe price stays an unpublished draft.
UPDATE products
   SET is_published = true, published_at = created_at
 WHERE stripe_price_id IS NOT NULL;

-- Token lookups
CREATE INDEX idx_products_preview_token ON products (preview_token) WHERE preview_token IS NOT NULL;

-- RLS: the public (anon/authenticated) client may read ONLY published rows.
-- (Admin + GPT read via the service-role API, which bypasses RLS.)
DROP POLICY "Products are publicly readable" ON products;
CREATE POLICY "Published products are publicly readable"
  ON products FOR SELECT TO anon, authenticated USING (is_published = true);

-- Stripe auto-create trigger must skip drafts. Stripe objects are created only at
-- publish (api/products.ts ?_action=publish calls syncProductToStripe inline).
CREATE OR REPLACE FUNCTION notify_stripe_sync()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Skip test inserts AND unpublished drafts — neither should create a Stripe product.
  IF NEW.is_test = true OR NEW.is_published = false THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'products',
    'schema', 'public',
    'record', row_to_json(NEW),
    'old_record', null
  );

  PERFORM net.http_post(
    url := 'https://everlastingsbyemaline.com/api/stripe-sync',
    body := payload::text,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Apply: `supabase db push` (or `supabase migration up`) from the repo root, linked to project `rvnxftbfeaxymhzxxhjm`.

---

## Phase 2 — `api/_lib/stripeSync.ts` (build the Stripe product from the frozen checkout fields)

**2.1 — add the frozen fields to the type.**

CURRENT (11–22):
```ts
export type SyncableProduct = {
  id: string;
  title: string;
  price: number;
  slug?: string | null;
  sku?: string | null;
  description?: string | null;
  headline?: string | null;
  images?: Array<{ url: string }> | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
};
```
NEW:
```ts
export type SyncableProduct = {
  id: string;
  title: string;
  price: number;
  slug?: string | null;
  sku?: string | null;
  description?: string | null;
  headline?: string | null;
  images?: Array<{ url: string }> | null;
  checkout_name?: string | null;
  checkout_description?: string | null;
  checkout_image?: string | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
};
```

**2.2 — map the frozen fields (fall back to the old fields so it stays robust).**

CURRENT (61–65):
```ts
  const stripeProduct = await stripe.products.create({
    name: product.title,
    description: product.description || product.headline || undefined,
    images: product.images?.slice(0, 8).map((img) => img.url) ?? [],
    metadata: {
```
NEW:
```ts
  const stripeProduct = await stripe.products.create({
    name: product.checkout_name || product.title,
    description: product.checkout_description || product.description || product.headline || undefined,
    images: product.checkout_image ? [product.checkout_image] : (product.images?.slice(0, 1).map((img) => img.url) ?? []),
    metadata: {
```

---

## Phase 3 — `api/products.ts` (create-as-draft, edit-to-draft, publish, coupon, preview)

**3.1 — imports + helpers.**

CURRENT (1):
```ts
import { createClient } from '@supabase/supabase-js';
```
NEW:
```ts
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type Stripe from 'stripe';
```

CURRENT (`jsonResponse`, 27–32):
```ts
function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  });
}
```
NEW (append two URL helpers after it):
```ts
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
```

**3.2 — GET: preview-by-token branch + public `is_published` guards.**

CURRENT (38–44):
```ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const id = url.searchParams.get('id');
  const isAuthorized = await authorize(request);

  if (slug) {
```
NEW:
```ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const id = url.searchParams.get('id');
  const previewToken = url.searchParams.get('preview');
  const isAuthorized = await authorize(request);

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
```

CURRENT (slug public filter, 45–50):
```ts
  if (slug) {
    let query = supabase.from('products').select('*').eq('slug', slug);
    if (!isAuthorized) {
      query = query.eq('is_test', false);
    } else {
      query = query.eq('is_test', isTest);
    }
```
NEW:
```ts
  if (slug) {
    let query = supabase.from('products').select('*').eq('slug', slug);
    if (!isAuthorized) {
      query = query.eq('is_test', false).eq('is_published', true);
    } else {
      query = query.eq('is_test', isTest);
    }
```

CURRENT (list public filter, 82–86):
```ts
  if (!isAuthorized) {
    listQuery = listQuery.eq('is_test', false);
  } else {
    listQuery = listQuery.eq('is_test', isTest);
  }
```
NEW:
```ts
  if (!isAuthorized) {
    listQuery = listQuery.eq('is_test', false).eq('is_published', true);
  } else {
    listQuery = listQuery.eq('is_test', isTest);
  }
```

**3.3 — POST: route `_action`, and make create insert a draft (no Stripe).**

CURRENT (96–99):
```ts
export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }
```
NEW:
```ts
export async function POST(request: Request) {
  const action = new URL(request.url).searchParams.get('_action');
  if (action === 'publish') return handlePublish(request);
  if (action === 'coupon') return handleCoupon(request);

  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }
```

CURRENT (create insert + inline sync, 179–210):
```ts
  const insertRow = { ...product, is_test: isTest };

  const { data, error } = await supabase
    .from('products')
    .insert(insertRow)
    .select()
    .single();

  if (error) {
    console.error('Product insert failed:', error.message);
    return jsonResponse(request, { error: error.message }, 400);
  }

  // Inline Stripe sync: callers (Custom GPT, curl protocol, admin UI) opt in
  // with `?sync=true` to receive Stripe IDs in the create response rather than
  // wait for the Supabase database webhook. The sync helper is idempotent,
  // so the database webhook firing afterward is a safe no-op.
  const url = new URL(request.url);
  let stripeSync: StripeSyncResult | null = null;
  if (url.searchParams.get('sync') === 'true' && data) {
    try {
      stripeSync = await syncProductToStripe(data as SyncableProduct);
    } catch (err) {
      console.error('Inline Stripe sync failed (product row was created):', err);
    }
  }

  return jsonResponse(request, {
    success: true,
    product: data,
    ...(stripeSync ? { stripe_sync: stripeSync } : {}),
  });
}
```
NEW:
```ts
  const previewToken = randomUUID();
  const insertRow = { ...product, is_test: isTest, is_published: false, preview_token: previewToken };

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
```

**3.4 — PUT: edit stages into `draft` (published rows) or updates live columns (unpublished drafts).** Full-function replacement.

CURRENT (213–291):
```ts
export async function PUT(request: Request) {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
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

  if (updates.price !== undefined) {
    if (!Number.isInteger(updates.price) || (updates.price as number) <= 0) {
      return jsonResponse(
        request,
        { error: 'Price must be a positive integer in cents' },
        400,
      );
    }

    const { data: current, error: currentError } = await supabase
      .from('products')
      .select('price, stripe_product_id, stripe_price_id')
      .eq('id', id)
      .maybeSingle();

    if (currentError) {
      console.error('Product price lookup failed:', currentError.message);
      return jsonResponse(request, { error: 'Failed to load product' }, 500);
    }
    if (!current) {
      return jsonResponse(request, { error: 'Product not found' }, 404);
    }

    if (
      current.price !== updates.price &&
      current.stripe_product_id &&
      current.stripe_price_id
    ) {
      try {
        await stripe.prices.update(current.stripe_price_id, { active: false });
        const newPrice = await stripe.prices.create({
          product: current.stripe_product_id,
          unit_amount: updates.price as number,
          currency: 'usd',
        });
        updates.stripe_price_id = newPrice.id;
      } catch (err) {
        console.error('Stripe price rotation failed:', err);
        return jsonResponse(request, { error: 'Failed to update Stripe price' }, 502);
      }
    }
  }

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Product update failed:', error.message);
    return jsonResponse(request, { error: error.message }, 400);
  }

  return jsonResponse(request, { success: true, product: data });
}
```
NEW:
```ts
const DRAFTABLE = [
  'title', 'description', 'headline', 'story_card', 'features', 'images',
  'thumbnail', 'thumbnail_alt', 'seo_title', 'seo_description', 'seo_thumbnail',
  'available', 'featured', 'quantity', 'dimensions', 'weight', 'materials',
  'power_supply', 'care_instructions', 'shipping_details', 'series', 'artist_note',
  'homepage_theme',
];
const FROZEN_AFTER_PUBLISH = [
  'price', 'checkout_name', 'checkout_description', 'checkout_image',
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

  // Published product: edits are STAGED in `draft`; live columns keep serving the site
  // until publish. The Stripe-locked fields + price are frozen (change price = new product;
  // run a sale = create a coupon).
  if (current.is_published) {
    const frozenAttempt = FROZEN_AFTER_PUBLISH.filter((f) =>
      Object.prototype.hasOwnProperty.call(updates, f),
    );
    if (frozenAttempt.length) {
      return jsonResponse(
        request,
        { error: `Frozen after publish: ${frozenAttempt.join(', ')}. Create a new product to change price; the checkout fields are set once.` },
        400,
      );
    }
    const existingDraft =
      current.draft && typeof current.draft === 'object'
        ? (current.draft as Record<string, unknown>)
        : {};
    const newDraft = { ...existingDraft, ...pick(DRAFTABLE) };
    const { data, error } = await supabase
      .from('products')
      .update({ draft: newDraft, preview_token: previewToken })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Product draft update failed:', error.message);
      return jsonResponse(request, { error: error.message }, 400);
    }
    return jsonResponse(request, {
      success: true,
      product: data,
      staged: true,
      preview_url: previewUrl(request, String(data.slug), previewToken),
      preview_token: previewToken,
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
```

**3.5 — publish + coupon handlers.** Append at the end of `api/products.ts` (module scope):

```ts
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

  // Edit-publish: published row with staged draft → apply draft → live columns.
  if (row.is_published) {
    const draft =
      row.draft && typeof row.draft === 'object' ? (row.draft as Record<string, unknown>) : null;
    if (!draft) {
      return jsonResponse(request, { success: true, product: row, url: liveUrl(request, String(row.slug)), no_changes: true });
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

  // First publish: validate checkout essentials, create Stripe, flip live.
  const checkoutImage = (row.checkout_image as string) || (row.thumbnail as string) || '';
  const missing: string[] = [];
  if (!row.checkout_name) missing.push('checkout_name');
  if (!row.checkout_description) missing.push('checkout_description');
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
```

> **Note:** this removes the only use of `stripe.prices.*` (the old PUT price rotation). `stripe` is still used by `handleCoupon`; `syncProductToStripe`/`StripeSyncResult`/`SyncableProduct` by `handlePublish`. `randomUUID` by create + PUT. Run `tsc` to confirm no unused-import errors.

---

## Phase 4 — `api/checkout.ts` (a draft must never be reservable or purchasable)

**4.1 — `handleSession`.**

CURRENT (68–71):
```ts
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, slug, stripe_price_id, available, quantity')
      .in('id', productIds);
```
NEW:
```ts
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, slug, stripe_price_id, available, quantity, is_published')
      .in('id', productIds);
```

CURRENT (79):
```ts
      if (!product || product.available !== true || (product.quantity ?? 0) < 1) {
```
NEW:
```ts
      if (!product || product.is_published !== true || product.available !== true || (product.quantity ?? 0) < 1) {
```

**4.2 — `handleReserve`.**

CURRENT (186–189):
```ts
        supabase
          .from('products')
          .select('id, slug, available, quantity, series')
          .in('id', productIds),
```
NEW:
```ts
        supabase
          .from('products')
          .select('id, slug, available, quantity, series, is_published')
          .in('id', productIds),
```

CURRENT (205):
```ts
        if (!product || product.available !== true || (product.quantity ?? 0) < 1) return true;
```
NEW:
```ts
        if (!product || product.is_published !== true || product.available !== true || (product.quantity ?? 0) < 1) return true;
```

---

## Phase 5 — `api/upload.ts` (two new image roles + their crops)

CURRENT (52–53):
```ts
const ROLE_PATTERN =
  /^(hero|thumbnail|gallery-(0[1-9]|1[0-5])|video-0[1-5]|detail-0[1-5]|gif-0[1-5])$/;
```
NEW:
```ts
const ROLE_PATTERN =
  /^(hero|thumbnail|gallery-(0[1-9]|1[0-5])|video-0[1-5]|detail-0[1-5]|gif-0[1-5]|checkout_image|seo_thumbnail)$/;
```

CURRENT (170–172):
```ts
      const isThumb = role.startsWith('thumbnail');
      const width = isThumb ? 600 : 1200;
      const transformUrl = `https://res.cloudinary.com/${cloud.cloudName}/image/upload/c_fill,ar_4:5,w_${width},f_webp,q_auto,g_auto/${publicId}`;
```
NEW:
```ts
      let aspectRatio = '4:5';
      let width = role.startsWith('thumbnail') ? 600 : 1200;
      if (role === 'seo_thumbnail') { aspectRatio = '1.91:1'; width = 1200; } // OG / Twitter card
      else if (role === 'checkout_image') { aspectRatio = '1:1'; width = 600; } // Stripe product image
      const transformUrl = `https://res.cloudinary.com/${cloud.cloudName}/image/upload/c_fill,ar_${aspectRatio},w_${width},f_webp,q_auto,g_auto/${publicId}`;
```

> The R2 filename becomes `checkout_image-{slug}.webp` / `seo_thumbnail-{slug}.webp` (or `test_…` on preview). These are stored in their own scalar columns, so they bypass the `images[]` hero/gallery min-count validation in `products.ts` — no change there.

---

## Phase 6 — `vercel.json` (clean routes for publish + coupon → `products.ts`, no new function)

CURRENT (12):
```json
    { "source": "/api/orders/:id", "destination": "/api/orders?id=:id" },
```
NEW:
```json
    { "source": "/api/orders/:id", "destination": "/api/orders?id=:id" },
    { "source": "/api/products/publish", "destination": "/api/products?_action=publish" },
    { "source": "/api/coupons", "destination": "/api/products?_action=coupon" },
```

> These are URL rewrites to the existing `products.ts` function — function count stays 11/12. The GET preview needs no rewrite (it's `/api/products?slug=…&preview=…`).

---

## Phase 7 — `assets/js/product.js` (preview mode + Publish button)

CURRENT (7–39): the whole `DOMContentLoaded` handler.
NEW (replace it):
```js
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = (() => {
    const path = window.location.pathname.match(/^\/product\/([^/]+)\/?$/);
    if (path) return path[1];
    return params.get('slug');
  })();
  if (!slug) {
    revealNotFound();
    return;
  }

  const previewToken = params.get('preview');

  await waitForSupabase();

  const product = previewToken
    ? await fetchPreviewProduct(slug, previewToken)
    : await getProductBySlug(slug);
  if (!product) {
    revealNotFound();
    return;
  }

  populateMeta(product);
  populateOpenGraph(product);
  injectProductJsonLd(product);
  populateStickyCard(product);
  populateHero(product);
  populateGallery(product);
  populateStory(product);
  populateFeatures(product);
  wireCartButtons(product);
  wireProductInterestForm(product);
  wireContemplationOfferSuccess(product);
  fireViewItem(product);
  renderRelatedProducts(product);

  if (previewToken) mountPreviewBanner(product, previewToken);
});

// v1.5 — preview fetches the draft via the service-role API (the anon client can't
// read unpublished rows under RLS). The token in the URL is the read capability.
async function fetchPreviewProduct(slug, token) {
  try {
    const res = await fetch(
      `/api/products?slug=${encodeURIComponent(slug)}&preview=${encodeURIComponent(token)}`,
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// The Publish bar is the one thing not in the shopper view — it doubles as the
// "not live yet" signal. Tapping it publishes via the token capability (no login).
function mountPreviewBanner(product, token) {
  const bar = document.createElement('div');
  bar.setAttribute('role', 'status');
  bar.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;align-items:center;justify-content:center;gap:16px;padding:10px 16px;background:var(--accent-primary,#4A1942);color:var(--text-inverse,#FFF8E7);font-family:var(--font-body,sans-serif);font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
  const label = document.createElement('span');
  label.textContent = 'Draft preview — not yet live. This is how shoppers will see it.';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Publish';
  btn.style.cssText =
    'padding:6px 18px;border:0;border-radius:6px;background:var(--accent-gold,#D4AF7A);color:var(--color-ink,#1A1A1A);font:inherit;font-weight:600;cursor:pointer;';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Publishing…';
    try {
      const res = await fetch('/api/products/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error('Publish failed');
      window.location.href = `/product/${product.slug}`;
    } catch {
      btn.disabled = false;
      btn.textContent = 'Publish';
      label.textContent = 'Could not publish — please try again, or text Sean.';
    }
  });
  bar.appendChild(label);
  bar.appendChild(btn);
  document.body.appendChild(bar);
  document.body.style.paddingTop = '48px';
}
```

---

## Phase 8 — Admin panel (new fields + draft/publish wiring; visual restyle deferred)

**8.1 — `admin/index.html`: add the checkout + SEO-thumbnail fields.**

CURRENT (156–159):
```html
              <div class="row-2">
                <label class="field"><span>SEO Title</span><input id="p-seo-title" /></label>
                <label class="field"><span>SEO Description</span><input id="p-seo-description" /></label>
              </div>
```
NEW:
```html
              <div class="row-2">
                <label class="field"><span>SEO Title</span><input id="p-seo-title" /></label>
                <label class="field"><span>SEO Description</span><input id="p-seo-description" /></label>
              </div>
              <label class="field"><span>SEO Thumbnail URL (OG image, 1.91:1)</span><input id="p-seo-thumbnail" /></label>

              <fieldset style="border:1px solid #ddd; border-radius:6px; padding:12px;">
                <legend>Checkout (Stripe — set once, frozen after publish)</legend>
                <label class="field"><span>Checkout Name</span><input id="p-checkout-name" /></label>
                <label class="field"><span>Checkout Description (one short line)</span><input id="p-checkout-description" /></label>
                <label class="field"><span>Checkout Image URL (1:1; defaults to thumbnail if blank)</span><input id="p-checkout-image" /></label>
              </fieldset>
```

**8.2 — `admin/index.html`: add the two upload roles.**

CURRENT (204–206):
```html
                      <option value="detail-01">detail-01</option>
                      <option value="detail-02">detail-02</option>
                    </select>
```
NEW:
```html
                      <option value="detail-01">detail-01</option>
                      <option value="detail-02">detail-02</option>
                      <option value="checkout_image">checkout_image</option>
                      <option value="seo_thumbnail">seo_thumbnail</option>
                    </select>
```

**8.3 — `admin/index.html`: rename Save → Save draft, add a publish panel.**

CURRENT (218–223):
```html
              <div class="form-actions">
                <button type="button" id="cancel-edit">Cancel</button>
                <span class="spacer"></span>
                <button type="button" id="delete-product" class="danger hidden">Delete</button>
                <button type="submit" class="primary" id="save-product">Save</button>
              </div>
```
NEW:
```html
              <div class="form-actions">
                <button type="button" id="cancel-edit">Cancel</button>
                <span class="spacer"></span>
                <button type="button" id="delete-product" class="danger hidden">Delete</button>
                <button type="submit" class="primary" id="save-product">Save draft</button>
              </div>
              <div id="publish-panel" class="hidden" style="margin-top:12px; padding:12px; border:1px solid #ddd; border-radius:6px;"></div>
```

**8.4 — `assets/js/admin.js`: collect the new fields.**

CURRENT (407–408):
```js
    seo_title: $('p-seo-title').value.trim() || null,
    seo_description: $('p-seo-description').value.trim() || null,
```
NEW:
```js
    seo_title: $('p-seo-title').value.trim() || null,
    seo_description: $('p-seo-description').value.trim() || null,
    seo_thumbnail: $('p-seo-thumbnail').value.trim() || null,
    checkout_name: $('p-checkout-name').value.trim() || null,
    checkout_description: $('p-checkout-description').value.trim() || null,
    checkout_image: $('p-checkout-image').value.trim() || null,
```

**8.5 — `assets/js/admin.js`: populate the new fields when editing.**

CURRENT (288–289):
```js
  $('p-seo-title').value = product?.seo_title ?? '';
  $('p-seo-description').value = product?.seo_description ?? '';
```
NEW:
```js
  $('p-seo-title').value = product?.seo_title ?? '';
  $('p-seo-description').value = product?.seo_description ?? '';
  $('p-seo-thumbnail').value = product?.seo_thumbnail ?? '';
  $('p-checkout-name').value = product?.checkout_name ?? '';
  $('p-checkout-description').value = product?.checkout_description ?? '';
  $('p-checkout-image').value = product?.checkout_image ?? '';
```

**8.6 — `assets/js/admin.js`: on save, show the preview + Publish panel.**

CURRENT (461–462):
```js
    setStatus('editor-status', editing ? 'Saved.' : 'Created.', 'success');
    await loadProducts();
```
NEW:
```js
    setStatus('editor-status', editing ? 'Draft saved.' : 'Draft created.', 'success');
    renderPublishPanel(body, editing ? editing.id : body.product?.id);
    await loadProducts();
```

**8.7 — `assets/js/admin.js`: add the panel + publish call.** Append near `onSaveProduct` (module scope):
```js
function renderPublishPanel(body, id) {
  const panel = $('publish-panel');
  if (!panel) return;
  const previewUrl = body.preview_url;
  panel.classList.remove('hidden');
  panel.innerHTML = '';
  const p = document.createElement('p');
  p.style.margin = '0 0 8px';
  if (previewUrl) {
    p.innerHTML =
      'Preview how it looks: <a href="' + previewUrl + '" target="_blank" rel="noopener">open preview</a> — then publish when it looks right.';
  } else {
    p.textContent = 'Saved. Publish when ready.';
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'primary';
  btn.textContent = 'Publish now';
  btn.addEventListener('click', () => publishProduct(id, btn));
  panel.appendChild(p);
  panel.appendChild(btn);
}

async function publishProduct(id, btn) {
  if (!id) return;
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Publishing…';
  try {
    const res = await fetch('/api/products/publish', {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    setStatus('editor-status', 'Published — it is now live.', 'success');
    $('publish-panel').classList.add('hidden');
    await loadProducts();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = original;
    setStatus('editor-status', err.message, 'error');
  }
}
```

> Admin auth is the Supabase JWT (`authHeader()`), so publish-by-`id` is authorized through the admin/GPT path — no token needed in the panel.

---

## Phase 9 — GPT docs (author only; Sean configures the GPT later)

**9.1 — `assets/docs/GPT_SETUP.md` schema:** add three operations to the `paths:` map (2B). After the `/api/products` `post` (createProduct) block, add a `put` to the same path, and two new paths:

```yaml
    put:
      operationId: editProduct
      summary: Stage edits to a product. On a published product the changes go to a draft for preview; publish applies them. Cannot change price or the checkout_* fields on a published product.
      parameters:
        - in: query
          name: id
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title: { type: string }
                description: { type: string }
                headline: { type: string }
                story_card: { type: string }
                images: { type: array, items: { type: object, properties: { url: { type: string }, alt: { type: string } } } }
                thumbnail: { type: string }
                thumbnail_alt: { type: string }
                seo_title: { type: string }
                seo_description: { type: string }
                seo_thumbnail: { type: string }
                available: { type: boolean }
                featured: { type: boolean }
      responses:
        '200': { description: Draft staged; returns preview_url. }
  /api/products/publish:
    post:
      operationId: publishProduct
      summary: Publish a product (or apply staged edits). For a new product this creates the Stripe product/price and makes it live.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [id]
              properties:
                id: { type: string, description: The product UUID. }
      responses:
        '200': { description: Published; returns the live url. }
  /api/coupons:
    post:
      operationId: createCoupon
      summary: Create a discount — a Stripe Coupon plus a shareable Promotion Code. Percent or amount off; optional product scope, minimum order amount, expiry, redemption cap. No buy-N/BOGO.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [type, value]
              properties:
                type: { type: string, enum: [percent, amount], description: percent off, or a fixed amount off in CENTS. }
                value: { type: number, description: "percent (1–100) or amount in cents (e.g. 500 = $5)." }
                code: { type: string, description: The shareable code, e.g. HOLIDAY20. Optional — Stripe generates one if omitted. }
                product_ids: { type: array, items: { type: string }, description: Stripe product IDs to limit the discount to. Omit for store-wide. }
                min_amount: { type: integer, description: Minimum order total in cents to qualify. Optional. }
                expires_at: { type: integer, description: Unix timestamp when the code expires. Optional. }
                max_redemptions: { type: integer, description: Max total redemptions. Optional. }
      responses:
        '200': { description: Coupon created; returns the code. }
```

Also bump the schema `version:` to `1.2.0` and update the `uploadImage` role description to include `checkout_image, seo_thumbnail`.

**9.2 — `assets/docs/GPT_SETUP.md` Instructions (2A):** replace the `== ADDING A PRODUCT ==` rule line and add three sections. Key changes (provide the full updated Instructions block in the build):
- Step 5/6 of ADDING A PRODUCT: `createProduct` no longer takes `sync=true` and does **not** go live — it creates a **draft** and returns a **preview link**. The GPT also fills the three checkout fields + `seo_thumbnail` (it knows checkout copy is one short line vs. the longer page summary vs. the search-shaped SEO).
- Remove "never edit an existing product"; replace with the editing flow.
- Add:
  - `== EDITING A PRODUCT ==` — find by listing/slug; call `editProduct`; on a published product the change is staged; **always** hand back the preview link.
  - `== PREVIEW & PUBLISHING ==` — the handoff language: "Here's your preview: <preview_url> — that's exactly how shoppers will see it. Tap **Publish** on that page when it looks right (or tell me 'publish')." If she says publish, call `publishProduct`.
  - `== COUPONS ==` — translate her wish into params ("20% off everything until New Year's" → type=percent, value=20, expires_at=<unix>); convert dollars→cents for amount/min_amount; never promise buy-N/BOGO; read back the code.
- Keep: never reveal keys/URLs; confirm before `markShipped`; the voice rules.

**9.3 — `assets/docs/gpt/product-reference.md`:** append three sections (Knowledge the GPT reads): **"The three field tiers"** (checkout = one line, frozen; page = the marketing copy + gallery; SEO = title/description/1.91:1 thumbnail — the GPT writes all of them), **"Draft → Preview → Publish"** (create/edit make a draft + preview link; publishing makes it live and, for new products, creates the Stripe listing), and **"Coupons"** (percent or amount, optional code/scope/minimum/expiry; no BOGO).

---

## Phase 10 — `assets/docs/EVERLASTINGS_STORE.md` (reflect the new architecture)

Additive edits: in the products schema table add rows for `checkout_name`, `checkout_description`, `checkout_image`, `seo_thumbnail`, `is_published`, `published_at`, `draft (jsonb)`, `preview_token`; add a **"Draft → Preview → Publish"** subsection (the model, the preview-token capability, Stripe-at-publish, the frozen checkout fields); note the `?_action=publish` / `?_action=coupon` routes + the two `vercel.json` rewrites; note the RLS change (public reads = `is_published = true`) and that the INSERT trigger now skips drafts.

---

## Phase 11 — Verify + test

**Static (before deploy):**
- `npx tsc --noEmit -p tsconfig.json` → clean.
- Confirm function count unchanged (publish/coupon are rewrites, not files): `ls api/*.ts` = 11.
- `vercel.json` is valid JSON; the two new rewrites present.

**Live (dev preview — point any GPT/curl at the preview; `is_test=true`, no real money; SSO off for third-party calls):**
1. **Create → draft:** `createProduct` → response has `preview_url`; the product does **not** appear in `/shop` or via the anon client; no Stripe product yet.
2. **Preview:** open `preview_url` → the product page renders with the draft values + the "Draft preview" bar.
3. **Publish (new):** tap Publish (or `publishProduct`) → redirect to the live `/product/{slug}`; it now appears in `/shop`; a Stripe product + price exist; `preview_token` cleared (the old preview link 404s).
4. **Edit (published) → draft:** `editProduct` a published product → live page unchanged; preview link shows the change; publish → applies to live; Stripe catalog untouched.
5. **Stripe-lock:** `editProduct` with `price`/`checkout_name` on a published product → 400 "frozen after publish."
6. **Purchasability guard:** a draft cannot be reserved/checked out (reserve → unavailable; session → 410).
7. **Coupons:** percent + amount; store-wide + product-scoped; `min_amount`; `expires_at`; redeem the code at checkout (`applyPromotionCode`); duplicate code → 409; confirm BOGO is refused.
8. **GPT behavior:** drafts every tier correctly, hands back the preview link with good language, picks coupon params, confirms-vs-expedites, fails gracefully.

Then the **A/B/C/D gap-review loop** (`v1_5_0_REVIEW_PROMPTS.md`) before a fresh agent executes against the repo.

---

## Open items (confirm during build/review)

- **`duration: 'once'`** on coupons — fine for one-time payments (Stripe requires a value; redemption cap + expiry are the real limiters). Confirm in Phase 11.7 / the D-review.
- **`checkout_image` fallback to `thumbnail`** at publish is intentional (Em needn't supply a separate image). Keep unless Sean wants it mandatory.
- **Preview-token expiry:** none (rotates on publish). Add only if the D-review wants it.
