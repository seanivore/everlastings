# v1.5.0 — AI Store Management + Design — IMPLEMENT (exclusively executable)

**Version**: v1.5.1
**Initiative**: AI store-management functionality (the store managed entirely through chat) + the
v1.5 design pass. Functionality first; design second.
**Revision driven by**: post-feedback (`v1_5_0_FEEDBACK.md`) — **re-merge** of
`v1_5_0_BUILD_STORE_MGMT.md` (the string-anchored build) back into `v1_5_0_IMPLEMENT.md` (the spec),
pushed toward exclusively executable, plus the feedback + research findings folded in.
**Required reading first**: `assets/docs/EVERLASTINGS_STORE.md` (architecture) · **this doc only** —
do NOT read the superseded `v1_5_0_*` files; their content is folded in here.
**Supersedes (history — do not build from them)**: `v1_5_0_IMPLEMENT.md`,
`v1_5_0_BUILD_STORE_MGMT.md`.

> **How to use this doc (anti-fragility rule).** Every code edit quotes a **CURRENT** block (the
> locator) and a **NEW** block. **Line numbers are hints; the quoted CURRENT text is the anchor.**
> If a CURRENT block doesn't match the working tree byte-for-byte, **STOP and reconcile** — never
> guess. Everything here is a confirmed decision (no "we could X or Y"); if a builder hits a
> decision-shaped question, that's a plan bug → stop, surface to Sean, fix the plan, continue.

---

## Why this version (the value)

The thing that makes this store unique — and why a custom build out-paces Webflow / WordPress — is
that **the whole website is managed through chat.** A non-technical owner shouldn't need practice to
move like a tornado through updates. v1.4.9 proved the buy→fulfill loop. v1.5.0 delivers the
management layer that was always part of the value: the AI can **create, edit, preview, publish, and
discount** — safely, with a real visual preview before anything goes live.

A boundary slipped into v1.4.x that Sean did not sign off on: the Custom GPT was **create-only**,
edits were routed to the admin panel, and there was **no draft/preview**. v1.5.0 corrects that. The
owner manages everything by chatting; sees a true preview of how it will look to shoppers; clicks
publish herself.

## Invariants to preserve (every phase)

- **CommonJS / tsc-clean.** Run `npx tsc --noEmit -p tsconfig.json` after the `api/*.ts` edits; clean.
- **No new functions.** Everything folds into existing `api/*.ts`; publish + coupon are `?_action=`
  sub-routes of `products.ts` reached via `vercel.json` rewrites (Phase 6). Function count stays
  **11/12** on Vercel Hobby.
- **Migration via Supabase CLI** (the Supabase MCP rejects writes on this project; anchor CWD at the
  repo root).
- **`is_test` isolation holds** — every new read/write stays scoped to the deployment's `isTest`
  (`api/_lib/env.ts:2` → `isTest = process.env.VERCEL_ENV !== 'production'`). `is_test` is **never**
  user-editable.
- **Stripe-lock** — the checkout fields + price are frozen after publish (1.3); marketing/SEO edits
  never touch Stripe.

---

# Part 1 — Decisions & architecture (the why)

## 1.1 Field taxonomy — three tiers (resolved against the client's own docs)

Confirmed against `assets/docs/archive/resources/processed/{PLANNING_GUIDE,BUILD_GUIDE,CONTENT_PLANNING}.md`
and the GPT's canonical `assets/docs/gpt/product-reference.md`. **All four text fields are distinct —
nothing collapses.** The client's terms map to existing columns; "tagline" became `headline`.

Every product field belongs to one of three tiers. The GPT generates **all** of them (1.2), so the
owner never thinks about "which title goes where."

**Tier 1 — Stripe-locked (set once at create; frozen at publish like price):**
- `checkout_name` *(new)* — the product name on the Stripe checkout summary / `/complete` / receipt.
  **Falls back to `title`** when blank (Em needn't author a separate one).
- `checkout_description` *(new)* — the single short line shown at checkout / on the receipt.
  **Stays its own field for flexibility; falls back to `description` → `headline`** when blank.
- `checkout_image` *(new)* — the Stripe product image. **Falls back to `thumbnail`** when blank.
- `price` *(exists)* — immutable after publish; a price change = a **new product** (never an edit).

**Tier 2 — Page / marketing (drafted + freely edited via draft→publish):**
- `title` — the name of the piece (sticky-card `<h1>`, `product.html:284`).
- `headline` — the 5–7 word **tagline**: the short italic line under the title
  (`data-product-headline`, `product.html:285`). *This is "that short line of text" in the feedback.*
- `story_card` — the 2–8 paragraph narrative (`section.story-card`, `product.html:265`).
- `description` — a 2–3 sentence summary (previews, search, social shares).
- `features` *(jsonb array)*, `dimensions`, `weight`, `materials` *(text[])*, `power_supply`,
  `care_instructions` *(text[])*, `shipping_details` *(text[])*, `artist_note`, `series`,
  `product_type` *(miniature / printable / storybook)*, `quantity`, `available`, `featured`,
  `images` *(jsonb)*, `thumbnail` + `thumbnail_alt`.
- `media` *(jsonb array, optional)* — ordered MP4 video(s) (+ rare YouTube) for the product page; each
  clip carries its own behaviour (autoplay + loop silent "GIF-like", or click-to-play with a button);
  renders only if present (hides when absent). See 3.3 + Phase 7.

**Tier 3 — SEO (drafted + edited):**
- `seo_title`, `seo_description` *(exist)*.
- `seo_thumbnail` *(new)* — the OG / Twitter card image (~1.91:1 crop).

**System-filled (never set by GPT or owner):** `slug` (from title, immutable), `sku`, the Stripe IDs,
the photo CDN URLs, `homepage_theme`, and the v1.5 machinery below.

**System (draft/publish machinery, new columns):** `is_published` (bool, default false),
`published_at` (timestamptz), `draft` (jsonb overlay), `preview_token` (text, unique).

**Why the split works.** The site (shop, product page, cart) reads the **database**; the Stripe
checkout summary / `/complete` / receipt read the **Stripe catalog** (`checkout.ts` builds line items
from `stripe_price_id`). By making the four checkout fields **frozen and Stripe-bound** — set once,
pushed to Stripe at publish, never edited — editing marketing/SEO copy **never touches Stripe**, so
the catalog can't go stale. The fallbacks mean Em only authors checkout copy when she wants it to
differ from the page copy.

## 1.2 The GPT sets every value

No field is left for the owner to fill by hand. For a create or an edit, the GPT **drafts every
field in all three tiers** from her intent + photos, then either presents them for review or
**expedites** (skips line-by-line confirmation) when she's said to just go ahead. Either way the
**visual preview (1.4) is the real review surface** — she approves the *result*, not a field list.

## 1.3 Stripe binding — the lock

- **At publish of a new product:** create the Stripe product from `checkout_name` /
  `checkout_description` / `checkout_image` (with the 1.1 fallbacks), create the Price from `price`,
  store the IDs. (This **moves from create to publish** so abandoned drafts never orphan Stripe
  objects.)
- **After publish:** the checkout fields + price are **frozen**. To change price → new product. To
  run a sale → a coupon (1.5), never a price edit.
- **Marketing/SEO edits never call Stripe.**

## 1.4 Draft → preview → publish

The safety UX. People can't picture changes from chat text — they need to **see the page** (standard
CMS behaviour; it's also the footage that sells the piece).

- **Model:** `is_published` (default false), `published_at`, a `draft` jsonb overlay, and an
  unguessable `preview_token` on the products row. Single table — **folds into `products.ts`, no new
  function.**
- **Create:** insert an **unpublished** row with all fields; **no Stripe object yet**; return the
  preview URL + token.
- **Edit (published row):** write the changes into `draft`; the live columns keep serving the site
  until publish.
- **Edit (still-unpublished draft):** apply directly to the live columns (nothing is live yet).
- **Preview:** `GET /product/{slug}?preview=<token>` — `product.js` fetches the draft **through the
  service-role API** (the anon client can't read unpublished rows under RLS) and renders the real
  page with `draft` overlaid. A fixed **Publish bar** is the one addition vs. the shopper view; it
  doubles as the **"Draft preview — not yet live"** signal (label confirmed in feedback).
- **Publish** (her button posts the token, or she tells the GPT "publish"): validate token (or
  admin/key + id) → new product: create Stripe then flip `is_published=true`, `published_at=now`;
  edit: apply `draft` → live columns. Then **clear `draft` + rotate/clear `preview_token`** so a
  stale link can't republish.
- **Access model:** the token is a **capability** — possessing the link is the authority to publish,
  so it's effectively Em's (and still works if she's logged into admin). Unguessable; rotates on
  publish. No expiry in v1 (rotation is the limiter).

**The two flows, step by step.**

*Create (new product):* (1) Owner: "add this piece…" + photos. (2) GPT drafts every field (all three
tiers, 1.1) → `createProduct`. (3) Saved **unpublished**, **no Stripe object yet**; the response
carries a `preview_url`. (4) GPT: "Here's your preview: <preview_url> — exactly how shoppers will see
it. Tap **Publish** when it looks right." (5) Owner opens it (no login), reviews, taps **Publish** (or
tells the GPT "publish"). (6) Publish creates the Stripe product + price, flips `is_published=true`,
clears draft/token. Live + purchasable; the old preview link stops working.

*Edit (change a live product) — the part that also needs the gate:* (1) Owner: "change the Lavender
Wreath's description to …". (2) GPT pulls it up (`getProduct` by slug when she names it, else `listProducts` to browse), then `editProduct(id, {description})`.
(3) Because the row is **published**, the change is **staged in `draft`** — **the live page is
untouched** (shoppers still see the current version) and admin shows **"live · edits pending."** The
response carries a fresh `preview_url`. (4) GPT hands her the preview the same way. (5) Owner reviews
on the preview page, taps **Publish** (or says "publish") → the draft applies to the live columns and
clears. The change is now live. (6) Each new edit **re-stages the draft and rotates the preview
token**, so only the latest preview link works (an earlier one 404s) — the GPT always returns the
current link.

So **every change — new product or edit — passes the same review gate**: nothing reaches shoppers
until the owner sees it on a real page and publishes. The only things she can't change on a published
product are the checkout fields + price (1.3): to change price she makes a new product; to run a sale,
a coupon (1.5).

## 1.5 Coupons / discounts via the GPT (include in v1.5.0)

- **Vocabulary:** **Coupon** = the rule (`percent_off` **or** `amount_off`+currency, optional
  `applies_to.products`, `max_redemptions`, `redeem_by`). **Promotion Code** = the shareable code
  (e.g. `HOLIDAY20`) on a coupon (optional `restrictions.minimum_amount`, `expires_at`). **Discount**
  = the applied result.
- **GPT action:** create a Coupon + Promotion Code in one call. Params: type (`percent`/`amount`),
  value, optional code, product scope, minimum **order amount**, expiry, redemption cap.
- **Supported vs. not:** percent/amount, product scope, min order amount, expiry, redemption caps =
  native. **No buy-N / BOGO** (not native Stripe) → the GPT never promises it.
- **`duration: 'once'`** is sent because Stripe requires a value; for one-time payments it is moot —
  the real limiters are `max_redemptions` + `redeem_by`/`expires_at`. (Confirmed.)
- **Redemption already works** (`checkout.js` → `applyPromotionCode`). We add only the **create**
  side, folded into `products.ts` (no new file).
- **v1.5 scope = create, list, deactivate** (so she can pull a sale as spontaneously as she starts
  one — no calendar planning required). Create makes the Coupon + Promotion Code; `listCoupons` shows
  what's active; `deactivateCoupon` ends one immediately (sets the promotion code `active:false` —
  existing orders keep their history; no new redemptions). She can still set `expires_at` /
  `max_redemptions` at creation for auto-expiry. For a **product-scoped** coupon the GPT passes Stripe
  **product IDs**, read from `listProducts` (each published product carries its `stripe_product_id`).

## 1.6 Admin panel — unify, show status, light vibe

- **Unify:** admin create/edit go through the **same draft → preview → publish** path as the GPT.
  One safety path everywhere (matters once Em is on her own after the support window).
- **Status (Sean's "Page Status" ask):** the admin product list shows **Live / Draft** and **"edits
  pending"** when a published row has a staged `draft` (Phase 8.8).
- **Vibe (light brand pass):** not a redesign — apply the site tokens, comfortable spacing, on-brand
  type/colour so it doesn't feel like a debug screen. *(The deeper visual restyle stays in Part 3 /
  a later slice; the status + draft/publish wiring is functionality and ships here.)*

## 1.7 GPT understanding — author early, evolve (brand-critical)

The GPT's knowledge + instructions are the **most prominent brand surface.** If thin, the GPT is
wrong or clunky enough that DIY beats it. Authored in Phase 9 (knowledge = `assets/docs/gpt/*`;
instructions + schema = `GPT_SETUP.md`). It must understand: every field by tier (1.1); the
create/edit→preview→publish flow; the preview-handoff language; coupon semantics; confirm-vs-expedite;
plain-language errors; and what it does **not** do (change price → new product; edit frozen checkout
fields; touch `is_test`).

## 1.8 Environments & the owner's independence

- The owner **never touches environments.** Her GPT points at production; the **draft preview is her
  safety net** — she previews safely on production via drafts, never a "test mode."
- The **test ↔ live switch is Sean's tool** (and the demo path): point the GPT's Action at the dev
  preview + preview key (SSO off) to exercise everything on `is_test=true` data with no real money,
  then switch to production for hand-off.

## 1.9 Function-cap discipline

Treat the Vercel Hobby cap as **full (11 deployed).** Everything folds into existing functions:
draft/edit/preview/publish + coupon-create live in `products.ts` (publish/coupon via `?_action=` +
`vercel.json` rewrites); `stripeSync` is a helper; `product.js` / `admin.js` are frontend. **No new
function files.** Confirm the exact ceiling before anything would ever add one.

## 1.10 Custom GPT capability outline (the complete action set)

So the cold/A reviewer can logic-check that Em can fully run the store by chat. **`listProducts` is
required, not optional** (the GPT can't edit a product, or tell her "draft vs live," without it).
After v1.5 the GPT's Actions are:

- **Products — read:** `listProducts` (browse all — full values + status: live / draft /
  edits-pending) and `getProduct` (fetch the one she names, by slug, live or draft) — so the GPT pulls
  exactly the piece it needs before editing, not the whole catalog.
- **Products — write:** `createProduct` (→ **draft** + preview link; no Stripe yet);
  `editProduct` (→ stages a `draft` on a published row, or edits a still-unpublished draft; returns
  the preview link); `publishProduct` (new → creates Stripe + goes live; edit → applies the draft).
- **Media:** `uploadImage` (roles incl. the new `checkout_image`, `seo_thumbnail`); the create/edit
  `media` array sets the page's optional MP4 / YouTube (renders in order, hides when absent).
- **Discounts:** `createCoupon` (Coupon + Promotion Code), `listCoupons`, `deactivateCoupon` (end a
  sale anytime).
- **Orders:** `listOrders`; `markShipped` (emails the buyer; confirm first).
- **Refunds:** guided only — Em does them in the Stripe dashboard (no Action in v1).

*Decided:* `product_type` **is** editable (not Stripe-frozen — 1.2). Coupons are **create + list +
deactivate** (she can end a sale on a whim — 1.5). **Dynamic product media** is **in** v1.5 too
(optional MP4 / YouTube, hides when absent — 3.3 + Phase 7) — nothing left open here.

---

# Part 2 — Exclusively-executable build

## Pre-flight — verify these anchors before editing (line numbers are hints)

- `supabase/migrations/20260421000002_rls_policies.sql` — policy `"Products are publicly readable" …
  USING (true)`.
- `supabase/migrations/20260421000003_stripe_sync_webhook.sql` — `notify_stripe_sync()` with
  `IF NEW.is_test = true THEN RETURN NEW;` and `body := payload::text`.
- `api/_lib/stripeSync.ts` — `SyncableProduct` (11–22); `stripe.products.create({ name: product.title,
  …})` (61–70).
- `api/products.ts` — `authorize` (17–25); `jsonResponse` (27–32); GET (38–94); POST create+sync
  (96–211); PUT (213–291).
- `api/checkout.ts` — session select+guard (68–79); reserve select+filter (186–205).
- `api/upload.ts` — `ROLE_PATTERN` (52–53); transform (170–172).
- `vercel.json` — `rewrites` array.
- `assets/js/product.js` — `DOMContentLoaded` handler (7–39).
- `assets/js/admin.js` — `renderProductList` (235–256); `openEditor` SEO lines (288–289);
  `buildProductPayload` SEO lines (407–408); `onSaveProduct` status line (461–462).
- `admin/index.html` — `.pill` styles (68–70); SEO row (156–159); upload-role `<select>` (204–206);
  `form-actions` (218–223).
- `assets/docs/GPT_SETUP.md` — status note (16, 26); Instructions (97–124); schema `version` (133),
  `createProduct` block (167–213), curl PUT (406–417), quick-ref (425–432).
- `assets/docs/gpt/product-reference.md` — "system fills these" (31–33); "Before you create" (64).

**Sweep already cleared:** `api/product-feed.ts` + the homepage read via the **publishable/anon**
client, so the new RLS policy hides drafts from them automatically. `api/config.ts` reads no
products. Only the **service-role** readers below get explicit guards.

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

Apply: `supabase db push` (or `supabase migration up`) from the repo root, linked to project
`rvnxftbfeaxymhzxxhjm`.

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

**2.2 — map the frozen fields (fall back to the page fields so it stays robust).**

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

## Phase 3 — `api/products.ts` (create-as-draft, edit-to-draft, publish, coupon, preview)

> The authorized GET (slug / id / list) already returns full rows (`select('*')`), so **`listProducts`
> and `getProduct` (Phase 9) need no new handler** — they map to this GET (`getProduct` via a by-slug
> rewrite). Only the **public** (unauthorized) branches gain the `is_published` guard below.

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
  if (action === 'coupon_deactivate') return handleCouponDeactivate(request);

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

**3.4 — PUT: edit stages into `draft` (published rows) or updates live columns (unpublished
drafts).** Full-function replacement.

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
  'title', 'description', 'headline', 'story_card', 'features', 'images', 'media',
  'thumbnail', 'thumbnail_alt', 'seo_title', 'seo_description', 'seo_thumbnail',
  'available', 'featured', 'quantity', 'dimensions', 'weight', 'materials',
  'power_supply', 'care_instructions', 'shipping_details', 'series', 'product_type', 'artist_note',
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
    const promos = await stripe.promotionCodes.list({ active: true, limit: 100 });
    const coupons = promos.data.map((pc) => ({
      code: pc.code,
      promotion_code_id: pc.id,
      percent_off: pc.coupon?.percent_off ?? null,
      amount_off: pc.coupon?.amount_off ?? null,
      times_redeemed: pc.times_redeemed,
      max_redemptions: pc.max_redemptions ?? null,
      expires_at: pc.expires_at ?? null,
    }));
    return jsonResponse(request, { coupons });
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
    let promoId = body.promotion_code_id;
    if (!promoId && body.code) {
      const found = await stripe.promotionCodes.list({ code: body.code, limit: 1 });
      promoId = found.data[0]?.id;
    }
    if (!promoId) return jsonResponse(request, { error: 'Coupon code not found' }, 404);
    const updated = await stripe.promotionCodes.update(promoId, { active: false });
    return jsonResponse(request, { success: true, code: updated.code, active: updated.active });
  } catch (err) {
    console.error('Coupon deactivate failed:', err);
    return jsonResponse(request, { error: 'Failed to deactivate the coupon' }, 502);
  }
}
```

> **Note:** this removes the only use of `stripe.prices.*` (the old PUT price rotation). `stripe` is
> still used by `handleCoupon`; `syncProductToStripe`/`StripeSyncResult`/`SyncableProduct` by
> `handlePublish`; `randomUUID` by create + PUT. Run `tsc` to confirm no unused-import errors.

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

> The R2 filename becomes `checkout_image-{slug}.webp` / `seo_thumbnail-{slug}.webp` (or `test_…` on
> preview). These store in their own scalar columns, so they bypass the `images[]` hero/gallery
> min-count validation in `products.ts` — no change there.

## Phase 6 — `vercel.json` (clean routes for publish + coupon → `products.ts`, no new function)

CURRENT (the `/api/orders/:id` rewrite line):
```json
    { "source": "/api/orders/:id", "destination": "/api/orders?id=:id" },
```
NEW:
```json
    { "source": "/api/orders/:id", "destination": "/api/orders?id=:id" },
    { "source": "/api/products/publish", "destination": "/api/products?_action=publish" },
    { "source": "/api/products/by-slug/:slug", "destination": "/api/products?slug=:slug" },
    { "source": "/api/coupons", "destination": "/api/products?_action=coupon" },
    { "source": "/api/coupons/deactivate", "destination": "/api/products?_action=coupon_deactivate" },
```

> URL rewrites to the existing `products.ts` function — function count stays 11/12. `/api/coupons`
> serves **POST** (create) and **GET** (list) via the same rewrite; deactivate is its own route. The
> GET preview needs no rewrite (`/api/products?slug=…&preview=…`); `listProducts` is plain GET
> `/api/products`; `getProduct` is the `/api/products/by-slug/{slug}` rewrite → the existing `?slug=`.

## Phase 7 — `assets/js/product.js` (preview mode + Publish bar)

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
  populateMedia(product);
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

// v1.5 — optional media (MP4 + YouTube), data-driven, hides when absent. Mirrors the portfolio's
// renderMedia pattern (structured + createElement + hide-when-empty, 360-design
// media-controller.js); we build the YouTube iframe from a parsed video id rather than storing raw
// embed HTML — safer for GPT-generated values (no innerHTML injection).
function populateMedia(p) {
  const container = document.querySelector('[data-product-media]');
  if (!container) return;
  const items = Array.isArray(p.media) ? p.media : [];
  if (!items.length) return; // stays hidden — media is optional
  const ordered = [...items].sort((a, b) => (a?.type === 'youtube' ? 1 : 0) - (b?.type === 'youtube' ? 1 : 0)); // MP4s first
  const frag = document.createDocumentFragment();
  for (const m of ordered) {
    if (!m || !m.url) continue;
    if (m.type === 'video') {
      const wrap = document.createElement('div');
      wrap.className = 'product-media__item';
      const v = document.createElement('video');
      v.src = m.url;
      if (m.poster) v.poster = m.poster;
      v.playsInline = true;
      v.preload = 'metadata';
      // Per-clip behaviour — the GPT/admin sets these case-by-case. Two presets:
      //   GIF-like      : autoplay:true, loop:true → plays itself, silent, no buttons.
      //   click-to-play : default → she presses play; buttons shown; sound on.
      v.autoplay = m.autoplay === true;
      v.loop = m.loop === true;
      if (v.autoplay) {
        v.muted = true;                    // browsers only allow muted autoplay
        v.controls = m.controls === true;  // GIF-like → no buttons unless asked
      } else {
        v.muted = m.muted === true;        // has sound unless she asks to mute
        v.controls = m.controls !== false; // click-to-play → buttons shown
      }
      if (m.alt) v.setAttribute('aria-label', m.alt);
      wrap.appendChild(v);
      frag.appendChild(wrap);
    } else if (m.type === 'youtube') {
      const id = youtubeId(m.url);
      if (!id) continue;
      const wrap = document.createElement('div');
      wrap.className = 'product-media__item product-media__item--embed';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}`;
      iframe.title = m.alt || 'Video';
      iframe.loading = 'lazy';
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
      frag.appendChild(wrap);
    }
  }
  if (!frag.childNodes.length) return;
  container.innerHTML = '';
  container.appendChild(frag);
  container.classList.remove('hidden');
}

function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
```

## Phase 8 — Admin panel (new fields + draft/publish wiring + status column)

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
                <label class="field"><span>Checkout Name (defaults to Title)</span><input id="p-checkout-name" /></label>
                <label class="field"><span>Checkout Description — one short line (defaults to Description)</span><input id="p-checkout-description" /></label>
                <label class="field"><span>Checkout Image URL (1:1; defaults to thumbnail)</span><input id="p-checkout-image" /></label>
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

**8.4 — `admin/index.html`: add a Draft pill colour.** (The list status pill, 8.8.)

CURRENT (68–70):
```html
      .pill { display: inline-block; padding: 2px 8px; border-radius: 10px; background: #eee; font-size: 11px; }
      .pill.shipped { background: #cfe; color: #060; }
      .pill.unsent { background: #fee; color: #800; }
```
NEW:
```html
      .pill { display: inline-block; padding: 2px 8px; border-radius: 10px; background: #eee; font-size: 11px; }
      .pill.shipped { background: #cfe; color: #060; }
      .pill.unsent { background: #fee; color: #800; }
      .pill.draft { background: #fdf0d5; color: #7a4a00; }
      .pill.edits { background: #e7e0ff; color: #4a1942; }
```

**8.5 — `assets/js/admin.js`: collect the new fields.**

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

**8.6 — `assets/js/admin.js`: populate the new fields when editing.**

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

**8.7 — `assets/js/admin.js`: on save, show the preview + Publish panel.**

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

**8.8 — `assets/js/admin.js`: add the status pill to the product list.**

CURRENT (`renderProductList`, 246–252):
```js
    const priceLabel = typeof p.price === 'number' ? `$${centsToDollars(p.price)}` : '—';
    const availPill = p.available ? '<span class="pill">available</span>' : '<span class="pill unsent">sold</span>';
    card.innerHTML = `
      <img src="${escapeHtml(thumb)}" alt="${escapeHtml(p.thumbnail_alt || p.title || '')}" />
      <p class="pc-title">${escapeHtml(p.title || '(untitled)')}</p>
      <p class="pc-meta">${priceLabel} · qty ${p.quantity ?? '—'} ${availPill}</p>
    `;
```
NEW:
```js
    const priceLabel = typeof p.price === 'number' ? `$${centsToDollars(p.price)}` : '—';
    const availPill = p.available ? '<span class="pill">available</span>' : '<span class="pill unsent">sold</span>';
    const statusPill = p.is_published
      ? (p.draft ? '<span class="pill edits">live · edits pending</span>' : '<span class="pill shipped">live</span>')
      : '<span class="pill draft">draft</span>';
    card.innerHTML = `
      <img src="${escapeHtml(thumb)}" alt="${escapeHtml(p.thumbnail_alt || p.title || '')}" />
      <p class="pc-title">${escapeHtml(p.title || '(untitled)')}</p>
      <p class="pc-meta">${priceLabel} · qty ${p.quantity ?? '—'} ${statusPill} ${availPill}</p>
    `;
```

**8.9 — `assets/js/admin.js`: add the panel + publish call.** Append near `onSaveProduct` (module
scope):
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

> Admin auth is the Supabase JWT (`authHeader()`), so publish-by-`id` is authorized through the
> admin/GPT path — no token needed in the panel.

**8.10 — `admin/index.html` + `assets/js/admin.js`: a media field (JSON).** Em sets media by chat
(the GPT is the friendly path); this is admin/Sean parity.

`admin/index.html` CURRENT (155):
```html
              <label class="field"><span>Artist Note</span><textarea id="p-artist-note" rows="2"></textarea></label>
```
NEW:
```html
              <label class="field"><span>Artist Note</span><textarea id="p-artist-note" rows="2"></textarea></label>
              <label class="field"><span>Media (JSON array — optional MP4 / YouTube, in order)</span><textarea id="p-media" rows="3" placeholder='[{"type":"video","url":"https://cdn.../video-01-slug.mp4","loop":true,"autoplay":true},{"type":"youtube","url":"https://youtu.be/ID"}]'></textarea></label>
```

`assets/js/admin.js` CURRENT (`buildProductPayload`, homepage_theme tail, ~421–423):
```js
  } else {
    payload.homepage_theme = null;
  }
```
NEW:
```js
  } else {
    payload.homepage_theme = null;
  }

  const mediaRaw = $('p-media').value.trim();
  if (mediaRaw) {
    try { payload.media = JSON.parse(mediaRaw); }
    catch { throw new Error('Media must be a valid JSON array or empty'); }
  } else {
    payload.media = null;
  }
```

`assets/js/admin.js` CURRENT (`openEditor`, 284):
```js
  $('p-theme').value = product?.homepage_theme ? JSON.stringify(product.homepage_theme) : '';
```
NEW:
```js
  $('p-theme').value = product?.homepage_theme ? JSON.stringify(product.homepage_theme) : '';
  $('p-media').value = product?.media ? JSON.stringify(product.media) : '';
```

## Phase 9 — GPT docs (author only; Sean configures the GPT later)

This phase also **repairs mixed truth**: the current GPT docs say the GPT *can't edit*, *never sets
SEO*, and that *create auto-syncs Stripe* — all false under v1.5. Fix in place (no contradictions
left beside the new text).

**9.1 — `assets/docs/GPT_SETUP.md` schema.** Bump the version, add the read ops, add `editProduct`
(full draftable fields), `publishProduct`, `createCoupon`.

CURRENT (133):
```yaml
  version: 1.1.0
```
NEW:
```yaml
  version: 1.2.0
```

In `createProduct`'s `summary` (168–170) drop the `sync=true` language and the `sync` query param
(167, 171–175) — create now makes a **draft**. Then after the `/api/products` `post` block, add a
`get` (listProducts), a `put` (editProduct), and the two new paths:

```yaml
    get:
      operationId: listProducts
      summary: List all products with their status (live, draft, or live-with-edits-pending). Use this to find a product (and its id) before editing, and to tell Em what is live vs still a draft.
      responses:
        '200':
          description: Products list.
          content:
            application/json:
              schema:
                type: object
                properties:
                  products: { type: array, items: { type: object } }
    put:
      operationId: editProduct
      summary: Stage edits to a product. On a published product the changes go to a draft for preview; publishing applies them. Cannot change price or the checkout_* fields on a published product (to change price, create a new product; to run a sale, create a coupon).
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
                features: { type: array, items: { type: string } }
                dimensions: { type: string }
                weight: { type: string }
                materials: { type: array, items: { type: string } }
                power_supply: { type: string }
                care_instructions: { type: array, items: { type: string } }
                shipping_details: { type: array, items: { type: string } }
                series: { type: string }
                product_type: { type: string, enum: [miniature, printable, storybook] }
                artist_note: { type: string }
                quantity: { type: integer }
                available: { type: boolean }
                featured: { type: boolean }
                thumbnail: { type: string }
                thumbnail_alt: { type: string }
                images: { type: array, items: { type: object, properties: { url: { type: string }, alt: { type: string } } } }
                media:
                  type: array
                  items:
                    type: object
                    required: [type, url]
                    properties:
                      type: { type: string, enum: [video, youtube], description: "video = an MP4 you uploaded (the usual); youtube = a YouTube link (rare)." }
                      url: { type: string, description: "MP4 CDN URL (from uploadImage role video-0x) or a YouTube link." }
                      alt: { type: string }
                      loop: { type: boolean, description: "Replay automatically — true for a GIF-like clip." }
                      autoplay: { type: boolean, description: "Start on its own (always silent — autoplay must be muted). true = GIF-like; false/omit = she presses play." }
                      controls: { type: boolean, description: "Show play/volume buttons. true or omit = normal click-to-play; false = GIF-like, no buttons." }
                      poster: { type: string, description: "Optional still-frame image URL shown before a click-to-play video starts." }
                seo_title: { type: string }
                seo_description: { type: string }
                seo_thumbnail: { type: string }
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
                id: { type: string, description: The product UUID (from listProducts). }
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
    get:
      operationId: listCoupons
      summary: List active discounts (codes, percent/amount off, redemptions, expiry) so you can tell Em what's running and end one.
      responses:
        '200': { description: Active coupons. }
  /api/coupons/deactivate:
    post:
      operationId: deactivateCoupon
      summary: End a discount now — deactivates the promotion code so it stops working. Existing orders keep their history.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [code]
              properties:
                code: { type: string, description: The shareable code to end, e.g. HOLIDAY20. }
      responses:
        '200': { description: Coupon deactivated. }
  /api/products/by-slug/{slug}:
    get:
      operationId: getProduct
      summary: Get ONE product (live or draft) by its slug, with full current values — use this when she names a specific piece, instead of listing everything.
      parameters:
        - in: path
          name: slug
          required: true
          schema: { type: string }
      responses:
        '200': { description: The product (full row, incl. is_published + any staged draft). }
```

Also add `checkout_name`, `checkout_description`, `checkout_image`, `seo_thumbnail`, and the **`media`
array** (same shape as in `editProduct` above) to the `createProduct` request schema (so the GPT
drafts them too), and update the `uploadImage` `role` description to include `checkout_image,
seo_thumbnail`.

> `getProduct` is `GET /api/products/by-slug/{slug}` — a `vercel.json` rewrite to the existing
> authorized `GET /api/products?slug=` (which already returns the row **live or draft**). No new
> function or handler; it maps to the GET that's already there. `listProducts` (GET `/api/products`)
> returns the full list for browsing.

**9.2 — `assets/docs/GPT_SETUP.md` Instructions (2A) — mixed-truth repairs + new flows.**

CURRENT (105–107):
```
5. On confirmation, call createProduct with sync=true. Convert materials, features, care_instructions, shipping_details to arrays of strings. Price goes in CENTS ($245 → 24500) — but always show her dollars.
6. After success, give her the live link: https://everlastingsbyemaline.com/product/{slug}.
Product rules: never create without showing the preview; never set a price different from what she said; never proceed with fewer than 7 photos; never edit an existing product (direct her to the admin UI); on 409 (slug taken) suggest a new title; on 400 tell her exactly which field is missing in plain language; on 401 stop and say "the connection key needs Sean's attention."
```
NEW:
```
5. On confirmation, call createProduct. Also draft the checkout line (checkout_name, checkout_description — one short line — and checkout_image; each defaults to the page title/description/thumbnail if you leave it blank) and the SEO fields (seo_title, seo_description, seo_thumbnail). Convert materials, features, care_instructions, shipping_details to arrays of strings. Price goes in CENTS ($245 → 24500) — but always show her dollars.
6. createProduct returns a PREVIEW link (not a live page) — the product is a draft until published. Hand her the preview: "Here's your preview: <preview_url> — that's exactly how shoppers will see it. Tap Publish on that page when it looks right, or tell me 'publish'."

== EDITING A PRODUCT ==
1. Find it: when she names a specific piece, getProduct by its slug (returns it live or draft); to browse, listProducts (shows which are live vs draft). Either way you get the product + its id.
2. Call editProduct with the id and only the fields she's changing. On a published product the change is STAGED as a draft; the live page is untouched until publish.
3. Always hand back the preview link the same way as step 6 above. Never tell her an edit is live until it's published.

== PREVIEW & PUBLISHING ==
The preview link is the real review surface — she can't picture changes from chat. If she says "publish" (or "make it live"), call publishProduct with the id. For a brand-new product, publishing is what creates the Stripe listing and makes it purchasable. After publish, the old preview link stops working (that's expected).

== COUPONS ==
Translate her wish into createCoupon params: "20% off everything until New Year's" → type=percent, value=20, expires_at=<unix>. Dollars→cents for amount and min_amount ($5 off → type=amount, value=500). Optional: a code she wants (else Stripe makes one), product scope (Stripe product IDs from listProducts), minimum order amount, redemption cap. NEVER promise buy-one-get-one / "buy N" — Stripe can't do it natively. Read the final code back to her. To show her running sales, call listCoupons. To END a sale on the spot, call deactivateCoupon with the code — it stops immediately (she can still set expires_at at creation if she wants it to auto-end).

== MEDIA (optional video on the page) ==
Most product videos are short MP4 clips. The flow: (1) upload the MP4 with uploadImage (role video-01..05, skip_transform=true) — it goes to the CDN just like a photo; (2) ALWAYS ask her how this particular clip should behave — it's case-by-case, never assume:
- "Should it play on its own and loop silently, with no buttons (like a GIF)?" → { "type":"video", "url":"<cdn mp4>", "autoplay":true, "loop":true }
- "Or show a play button she presses (with sound)?" → { "type":"video", "url":"<cdn mp4>" }  (that's the default: play button, sound on, no autoplay). She can also give a still image to show before it plays → add "poster":"<url>".
Set these per clip. Multiple MP4s are fine (they render in the order given). Leave media empty/omitted for no video — the section just hides. We don't use GIFs (an MP4 looks better and is smaller; convert a GIF with ffmpeg if she has one).
YouTube is supported but RARE — only if she specifically has a YouTube link (she isn't building that kind of channel): { "type":"youtube", "url":"<link>" }. MP4s always render before any YouTube.

Product rules: never create without showing the preview; never set a price different from what she said; never proceed with fewer than 7 photos; to change a published product's PRICE, make a NEW product (price is frozen after publish); to run a sale, create a coupon — never edit price; on 409 (slug or coupon code taken) suggest a new title/code; on 400 tell her exactly which field is missing in plain language; on 401 stop and say "the connection key needs Sean's attention."
```

CURRENT (26):
```
Every product is a row in Supabase; saving it auto-creates the Stripe product so it's purchasable immediately. These are the fields and how to write them.
```
NEW:
```
Every product is a row in Supabase. Creating or editing a product makes a DRAFT with a private preview link; the Stripe listing is created when it's PUBLISHED. These are the fields and how to write them.
```

CURRENT (50):
```
**The system handles (never set):** `slug` (from title, immutable), `sku`, `seo_title`/`seo_description`, `stripe_product_id`/`stripe_price_id`, `thumbnail`/`images` CDN URLs, `homepage_theme`.
```
NEW:
```
**You also write (SEO + checkout):** `seo_title`, `seo_description`, `seo_thumbnail` (OG image); and the checkout line `checkout_name` / `checkout_description` (one short line) / `checkout_image` — each falls back to the page title / description / thumbnail if left blank, and all freeze once the product is published.
**The system handles (never set):** `slug` (from title, immutable), `sku`, `stripe_product_id`/`stripe_price_id`, the photo CDN URLs, `homepage_theme`, and the draft/publish machinery.
```

Also update the status note (16) so it no longer says these arrive "in v1.5.0" (they're specified
now — see this doc), and keep "the GPT only ever sees the environment its Action points at."

**9.3 — `assets/docs/gpt/product-reference.md` — mixed-truth repairs + the three tiers.**

CURRENT (31–33):
```markdown
## The system fills these in — never set them

`slug` (made from the title, permanent), `sku`, the SEO fields, the Stripe IDs, the photo CDN URLs, and the homepage theme.
```
NEW:
```markdown
## The three field tiers (you write all of them)

- **Page / marketing** — `title`, `headline`, `story_card`, `description`, `features`, and the detail
  fields above. The product page reads these; edits preview, then publish.
- **SEO** — `seo_title`, `seo_description`, `seo_thumbnail` (the share/OG image, ~1.91:1). Search- and
  social-shaped; you write them.
- **Checkout (Stripe — set once, frozen after publish)** — `checkout_name`, `checkout_description`
  (one short line shown at checkout / on the receipt), `checkout_image` (square). Each **defaults to**
  the page `title` / `description` / `thumbnail` if you leave it blank, so only fill them when the
  checkout copy should differ. After a product is published these (and `price`) can't change.

## The system fills these in — never set them

`slug` (made from the title, permanent), `sku`, the Stripe IDs, the photo CDN URLs, the homepage
theme, and the draft/publish machinery.
```

CURRENT (64):
```markdown
Always show Em a clean **preview** first — title, price in dollars, headline, and the photos grouped by role — and ask "Look right?" Never create with fewer than 7 photos, and never set a price different from what she told you. You can't edit an existing product (that's the admin panel) — so get it right at creation.
```
NEW:
```markdown
Always hand Em the **preview link** the create/edit returns — that's the real review ("here's how
shoppers will see it"), better than reading fields back. Never create with fewer than 7 photos, and
never set a price different from what she told you. You **can edit** a product now (copy, photos,
SEO) — edits stage as a draft she previews, then publishes. The only frozen things after publish are
**price** and the **checkout** fields; to change price, make a new product; to run a sale, make a
coupon.
```

**9.4 — `assets/docs/gpt/product-reference.md`: append a "Draft → Preview → Publish" + "Coupons"
section** (Knowledge the GPT reads):
- *Draft → Preview → Publish* — create/edit make a draft + a private preview link; publishing makes
  it live and, for a new product, creates the Stripe listing; the preview link rotates on publish.
- *Coupons* — percent or amount off; optional code, product scope, minimum order, expiry, redemption
  cap; no buy-N/BOGO; **list active sales and deactivate one anytime**.
- *Media* — optional short MP4 clip(s) on the page via the `media` array; **ask her per clip** whether
  it should autoplay + loop silently (GIF-like, no buttons) or show a play button (default,
  click-to-play with sound); YouTube is a rare fallback; MP4s render first; hides when empty; no GIFs.

**9.5 — `assets/docs/GPT_SETUP.md` Part 4 (agentic/curl protocol) — reflect v1.5.** Replace the
"Editing / marking sold (PUT)" example (406–417) so it shows: PUT stages a draft (returns
`preview_url`); `POST /api/products/publish {id}` publishes; price is not editable after publish
(make a new product); and add `POST /api/coupons` + the `listProducts` GET to the **API quick
reference** table (425–432). (Marking sold still works via PUT `{available:false, quantity:0}` on a
published product — that's a draftable field.)

## Phase 10 — `assets/docs/EVERLASTINGS_STORE.md` (reflect the new architecture)

Additive edits: in the products schema table add `checkout_name`, `checkout_description`,
`checkout_image`, `seo_thumbnail`, `is_published`, `published_at`, `draft (jsonb)`, `preview_token`;
add a **"Draft → Preview → Publish"** subsection (the model, the preview-token capability,
Stripe-at-publish, the frozen checkout fields, the `is_published` RLS gate, the INSERT trigger now
skips drafts); note the `?_action=publish` / `?_action=coupon` / `?_action=coupon_deactivate` routes
+ the `vercel.json` rewrites; note the `media` jsonb is now rendered on the page (optional MP4 /
YouTube via `populateMedia`); note the GPT gained edit / publish / coupon (create + list +
deactivate) / media actions.

## Phase 11 — Verify + test

**Static (before deploy):**
- `npx tsc --noEmit -p tsconfig.json` → clean.
- Function count unchanged (publish/coupon are rewrites, not files): `ls api/*.ts` = 11.
- `vercel.json` is valid JSON; the two new rewrites present.

**Live (dev preview — point any GPT/curl at the preview; `is_test=true`, no real money; SSO off for
third-party calls):**
1. **Create → draft:** `createProduct` → response has `preview_url`; product does **not** appear in
   `/shop` or via the anon client; no Stripe product yet; admin list shows a **draft** pill.
2. **Preview:** open `preview_url` → renders with draft values + the "Draft preview" bar.
3. **Publish (new):** tap Publish (or `publishProduct`) → redirect to live `/product/{slug}`; appears
   in `/shop`; Stripe product + price exist; old preview link 404s; admin shows **live**.
4. **List + status:** `listProducts` returns the product with `is_published`; admin shows the right
   pill (live / draft / live·edits-pending).
5. **Edit (published) → draft:** `editProduct` → live page unchanged; admin shows **edits pending**;
   preview shows the change; publish → applies to live; Stripe catalog untouched.
6. **Stripe-lock:** `editProduct` with `price`/`checkout_name` on a published product → 400 "frozen
   after publish."
7. **Purchasability guard:** a draft cannot be reserved/checked out (reserve → unavailable; session
   → rejected).
8. **Coupons:** percent + amount; store-wide + product-scoped; `min_amount`; `expires_at`; redeem the
   code at checkout (`applyPromotionCode`); duplicate code → 409; BOGO refused. **`listCoupons`** shows
   it active; **`deactivateCoupon`** ends it (the code then fails at checkout).
9. **Media:** set `media` (an MP4 item + a YouTube item) via create/edit → the page renders the video
   (MP4 first), respects its aspect ratio, YouTube after; empty/absent `media` → the section stays
   hidden; no GIF element.
10. **GPT behaviour:** drafts every tier; hands back the preview link with good language; picks coupon
    params; lists/deactivates a sale; sets `media`; confirms-vs-expedites; fails gracefully.

Then the **gap-review gate** (below) before a fresh agent executes against the repo.

---

# Part 3 — Design (push to executable where decided)

> Captured from `v1_5_0_FEEDBACK.md` + the product/shop page reads. The **two root-cause fixes (3.1)
> are executable now**; the rest are decision-complete direction whose exact values get confirmed
> against the live render. Hero + glow stay direction (Sean's hero spec pending).

## 3.1 Two-column ROOT CAUSE — the "columns don't display" bug (EXECUTABLE)

Both the product page and the shop set `grid-template-columns: 1fr` as an **inline style** on the
layout div, which **overrides** the desktop two-column rule in the page's `<style>` block (inline
beats a stylesheet selector). So both pages are permanently single-column on desktop. Fix = remove
the inline `grid-template-columns` and let the `<style>` media-queries own it.

`product.html` CURRENT (162):
```html
      <div class="product-layout" style="display: grid; gap: var(--space-2xl); grid-template-columns: 1fr; margin-top: var(--space-md);">
```
NEW:
```html
      <div class="product-layout" style="display: grid; gap: var(--space-2xl); margin-top: var(--space-md);">
```

`shop.html` CURRENT (164):
```html
        <div class="shop-layout" style="display: grid; gap: var(--space-xl); grid-template-columns: 1fr;">
```
NEW:
```html
        <div class="shop-layout" style="display: grid; gap: var(--space-xl);">
```

> The `<style>` blocks already define the desktop grids (`.product-layout` 1fr/360–400px at
> ≥768/1024; `.shop-layout` 220–240px/1fr). The mobile default (single column) comes from CSS grid's
> natural one-column flow when no `grid-template-columns` is set — confirm on the dev preview that
> mobile still stacks (it should; a grid with no explicit columns is a single column).

## 3.2 Product-page layout — restore the intended two-column + sticky (per FEEDBACK)

This is the original two-column design that the 3.1 bug flattened, plus the element order from
`v1_5_0_FEEDBACK.md`. Target:

- **Left column:** featured image + clickable thumbnails → **story_card** → **MP4 video(s)** →
  YouTube (if any). All media optional except the featured image.
- **Right column (sticky):** the buy **card** *and* the **details/features** section, so the BUY
  button + details follow the scroll.
- **Mobile (one column):** featured images → **card** → story → media → details (card pulled up;
  not sticky).

**Structure.** Make the blocks **direct children** of `.product-layout` (unwrap the current
`.product-story` div, and move `.product-details` in from below the grid), and drive both layouts with
`grid-template-areas` — that's what cleanly gives the desktop two-column *and* the mobile interleave
where the card sits between images and story:

```css
.product-layout { display: grid; gap: var(--space-2xl); margin-top: var(--space-md);
  grid-template-columns: 1fr;
  grid-template-areas: "gallery" "card" "story" "media" "details"; }   /* mobile order */
.product-layout > .product-gallery        { grid-area: gallery; }
.product-layout > .product-sticky-card    { grid-area: card; }
.product-layout > .story-card             { grid-area: story; }
.product-layout > .product-gallery__media { grid-area: media; }
.product-layout > .product-details        { grid-area: details; }
@media (min-width: 768px) {
  .product-layout { grid-template-columns: 1fr 380px;
    grid-template-areas: "gallery card" "story card" "media details"; }
  .product-layout > .product-sticky-card { align-self: start; } /* lets the existing sticky rule work in the grid */
}
```

(The existing `.product-sticky-card { position: sticky; top: … }` at ≥768px, `styles.css:885–890`,
supplies the stickiness — keep it.)

**HTML moves** (string-anchored in the build): (1) unwrap `.product-story` so `.product-gallery` and
`.story-card` are **direct children** of `.product-layout`; (2) lift `.product-gallery__media` out of
`.product-gallery` to its own direct child **after** `.story-card`, order its children **video →
YouTube**, and **delete the GIF `<img>`**; (3) move the `.product-details` section from below the grid
to a direct child of `.product-layout`; (4) move `grid-template-columns` out of the inline style per
3.1. `product.js` targets data-attributes (`data-product-*`), so relocating the elements does **not**
affect population.

**Render check (not a blocker):** the sticky card keeps BUY in view down the page; details read well
in the right column; the `.product-details` top margin/border may want trimming once it's in-column.

## 3.3 Story card + media (executable)

**Story card reads too small** because `.story-card` is the display serif, italic, at `--text-lg`
(`styles.css:929–935`). Sean wants it to read like body copy:
```css
.story-card {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  line-height: var(--leading-loose);
  color: var(--text-primary);
  font-style: normal;
}
```
(Keeps the blockquote framing — the `border-left` + `--color-cream` background are inline on the
section; confirm the exact size on render.)

**Media is data-driven** (Phase 7 `populateMedia` renders `p.media`; §1.1). Replace the **static**
`.product-gallery__media` block in `product.html` (the placeholder video + GIF + Rickroll iframe,
~lines 235–258) with an empty, hidden, data-bound container — this also drops the GIF and the
placeholder embed:
```html
<!-- v1.5: optional media (MP4 / YouTube) — product.js populateMedia fills it; hidden when none. -->
<div class="product-gallery__media hidden" data-product-media></div>
```
CSS — MP4 respects its intrinsic ratio (no forced 16/9 black bars); YouTube embeds get 16/9:
```css
.product-gallery__media { display: grid; gap: var(--space-md); }
.product-media__item video { width: 100%; height: auto; display: block; border-radius: var(--radius-md); }
.product-media__item--embed { aspect-ratio: 16 / 9; }
.product-media__item--embed iframe { width: 100%; height: 100%; border: 0; border-radius: var(--radius-md); }
```
**GIFs are out** — an MP4 `<video loop muted playsinline>` looks better and is smaller; convert with
`ffmpeg -i input.gif -movflags +faststart -pix_fmt yuv420p output.mp4`. (The `gif-0[1-5]` upload
roles in `ROLE_PATTERN` can be retired in a follow-up; harmless if left.)

## 3.4 Shop filters → compact dropdowns (direction)

After 3.1 the filters live in a real sidebar again. Sean wants them **compact** (dropdowns /
`<details>`) instead of the always-open checkbox fieldsets (`shop.html:184–206`). Keep the
`data-shop-filter` / `data-shop-sort` hooks so `shop.js` is untouched. (Design slice.)

## 3.5 Desktop density (direction)

Scale sizing down so cart / checkout / cards don't push content below the fold on desktop at smaller
widths.

## 3.6 Glow — "Firelight" ambient glow (planned; executable — tune colours on render)

Decided last session: a warm bloom seeping inward from all four viewport edges (ref
`assets/docs/archive/images/everlastings-website-red-glow.jpg` — strongest on the right there; we
intensify + even it out). Fog-like: subtle scale "breathing", opacity drift, slow **clockwise**
travel. One CSS custom property `--glow-color` is the only colour control; `--glow-intensity` tunes
strength. Honors `prefers-reduced-motion`.

**Build.** One fixed, non-interactive overlay behind content (add once per page — in the template
before `</body>`, or inject from `main.js`):

```css
:root { --glow-color: 74, 25, 66; --glow-intensity: 0.5; } /* RGB triplet; page JS overrides */
.firelight-glow { position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(var(--glow-color), var(--glow-intensity)), transparent 60%),
    radial-gradient(120% 80% at 50% 110%, rgba(var(--glow-color), var(--glow-intensity)), transparent 60%),
    radial-gradient(80% 120% at -10% 50%, rgba(var(--glow-color), var(--glow-intensity)), transparent 60%),
    radial-gradient(80% 120% at 110% 50%, rgba(var(--glow-color), var(--glow-intensity)), transparent 60%);
  animation: glow-breathe 14s ease-in-out infinite; }
.firelight-glow::before { content: ""; position: absolute; inset: -20%;
  background: conic-gradient(from 0deg, transparent, rgba(var(--glow-color), calc(var(--glow-intensity) * 0.6)), transparent 60%);
  animation: glow-rotate 40s linear infinite; }
@keyframes glow-breathe { 0%,100% { opacity: .85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
@keyframes glow-rotate  { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .firelight-glow, .firelight-glow::before { animation: none; } }
```

Page content sits above it (the main wrapper gets `position: relative; z-index: 1` if needed).
**Colour behaviour:** `main.js` sets `--glow-color` per context — page-themed, randomized across the
gallery, and reflecting the featured / cart / checkout piece (seed the palette from `BRAND.md`). The
exact RGB palette + intensity get **tuned against the live effect** (Sean's "palette-first") — that's
the one render step; the mechanism above is the plan. Deferred: a per-product `accent_color` column
feeding `--glow-color`.

## 3.7 Hero (Open — Sean's spec pending)

Animated layered homepage hero with Sean's video. Build path (CSS layering vs. Hyperframe) TBD —
Sean writes a design spec after studying the glow ref. `.hero__media` already supports `<video>`
(`styles.css:953–958`).

## 3.8 Content-gated (revisit once real images/copy land)

Entry/landing sizing sanity pass; replace the product-page Rickroll placeholder YouTube id
(`product.html:252`) with real footage; a design feedback round once real imagery is in.

---

# Part 4 — Carry-overs & sequencing

- **Meta Pixel** + webhook `event_id: session.id` dedup (already planned for v1.5).
- **v1.1 cosmetic:** the 409-overlay related-products show `$0.00` (reserve API `related` omits price).
- **Harden `products.ts` PUT** to ignore a client-sent `is_test` (latent; the DRAFTABLE/FROZEN
  allow-lists in 3.4 already exclude it — confirm no path writes it).
- **Post-launch — productize as a reusable template.** This management layer is the differentiator (a
  store run entirely by chat, usable day one). Plan the packaging right after launch; roadmap dir
  `assets/docs/archive/v2_0/`.
- **Mobile QA** pending (Sean — SSO left off partly to check mobile; re-enable SSO after — Sean does
  the toggle, not the agent).

---

# Gap-review & validation plan

The Track-C build proved the gate pays for itself (the executor called the packet "absurdly
thorough"; the one real bug would have been far costlier without the loop). v1.5 is a larger
architectural change, so it earns the same rigor. **All reviews run against THIS single doc**
(`v1_5_1_IMPLEMENT.md`). Prompts: `v1_5_1_REVIEW_PROMPTS.md` (adapted from `.agent/DEV_RULES.md`
§gap-gate).

Per `DEV_RULES.md` the angles are **A / B / C** (no "D" — the "holistic" pass is angle A done well):

- **A — cold / out-of-repo, FIRST (the holistic gate).** A fresh non-repo instance gets **only this
  doc + `EVERLASTINGS_STORE.md`** (the architecture doc is what was missing last time — it's what
  lets a cold reviewer judge *functionality completeness*, e.g. "can Em fully run the store; is any
  capability in 1.10 missing"). It tests both **self-containment** (anywhere it must open a file,
  guess, or recall = a defect) **and** big-picture completeness + architecture/security coherence
  (preview-token capability, draft→publish state machine, Stripe-lock invariant, `is_test`,
  function-cap, GPT brand-UX). Fold findings → bump the doc (`v1_5_2`…); **re-run A** if it found
  anything load-bearing, until a fresh A pass is clean. *Big-picture functionality gaps land here,
  before the detailed reviews — so B/C aren't wasted on a spec that's about to change.*
- **B — fidelity (repo).** A fresh repo instance verifies every CURRENT block matches the working
  tree byte-for-byte and every NEW block applies cleanly.
- **C — integration (repo + `EVERLASTINGS_STORE.md`).** System fit: `is_test` scoping, idempotency,
  the 11/12 function cap, conventions, stale pointers, the RLS/anon-preview interaction.

Run B + C after A converges (they can run consecutively; fold both at once); re-run if either finds
something load-bearing. Stop when a fresh pass of each angle finds nothing load-bearing → Sean
approves → a fresh agent executes on the dev preview.

**v1.5 landmines to hand every reviewer** (so they validate against reality, not training data):
- The Postgres **INSERT trigger auto-creates Stripe objects** (`20260421000003`) — drafts must skip
  it (Phase 1) and Stripe is created **only at publish**.
- The public site reads via the **anon client + RLS**, not the API — hiding drafts is the RLS change
  (Phase 1); **preview reads must go through the service-role API** (Phase 3.2 / Phase 7).
- **Stripe-lock invariant** — `price` + `checkout_*` frozen after publish; a price change is a new
  product, never an edit.
- **No new functions** — publish/coupon are `?_action=` rewrites; **11/12** Hobby cap.
- **`is_test` is never user-editable**; every new read/write stays scoped to `isTest`.

**Research support:** spin up a subagent only for a genuinely open question (e.g. a Stripe
promotion-code edge case) — not for routine checks.

---

# Open items

- **Hero spec (3.7)** — Sean to write (CSS vs. Hyperframe); ignore until then.
- **Render-tune (not blockers):** story-card exact size (3.3); glow palette + intensity (3.6);
  product-page sticky behaviour + `.product-details` spacing after the reflow (3.2).
