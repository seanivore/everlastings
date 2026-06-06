# v1.5.0 — AI Store Management + Design — IMPLEMENT (exclusively executable)

**Version**: v1.5.5
**Initiative**: AI store-management functionality (the store managed entirely through chat) + the
v1.5 design pass. Functionality first; design second.
**Revision history**: hardened through four cold Gap-Review-A passes + two in-house subagent breadth
passes, each adjudicated against the live repo and folded. The accumulated decisions are stated inline
below as plain current-state (no pass-by-pass narration); the full review trail lives in the superseded
`v1_5_1…v1_5_4_IMPLEMENT.md` and the `v1_5_*_GAP_REVIEW_*` files. Net feature set: GPT/admin
create→preview→publish with a real preview link; edit stages a draft (publish XOR discard); **price**
and the **sold flag** apply live immediately while copy/SEO stage; same-product Stripe-price rotation;
coupons (create/list/deactivate, owner-isolated); archive (reversible, never hard-delete);
media-by-link upload; `charge.refunded` order-status reflection; strict `is_test` isolation; and an
extensible per-`product_type` create ruleset. Everything folds into existing functions (no new Vercel
function).
**Required reading first**: `assets/docs/EVERLASTINGS_STORE.md` (architecture) · **this doc only** —
do NOT read the superseded `v1_5_0_*` / `v1_5_1_*` / `v1_5_2_*` / `v1_5_3_*` / `v1_5_4_*` files; their content is folded in here.
**Supersedes (history — do not build from them)**: `v1_5_4_IMPLEMENT.md`, `v1_5_3_IMPLEMENT.md`, `v1_5_2_IMPLEMENT.md`,
`v1_5_1_IMPLEMENT.md`, `v1_5_0_IMPLEMENT.md`, `v1_5_0_BUILD_STORE_MGMT.md`.

> **How to use this doc (anti-fragility rule).** Every code edit quotes a **CURRENT** block (the
> locator) and a **NEW** block. **Line numbers are hints; the quoted CURRENT text is the anchor.**
> If a CURRENT block doesn't match the working tree byte-for-byte, **STOP and reconcile** — never
> guess. Everything here is a confirmed decision (no "we could X or Y"); if a builder hits a
> decision-shaped question, that's a plan bug → stop, surface to Sean, fix the plan, continue.

> ## ⭐ Product North Star (the lens for every decision and every gap review)
> **Minimize the owner's friction to manage her entire digital product — the site, the store, and her
> sales — by offloading the work to her Custom GPT.** Em runs everything by chatting with the GPT
> (OpenAI web / iOS / Android); the GPT should be able to do anything a capable agent (e.g. Claude Code
> armed with skills + MCPs) could do on her behalf. **Judge every feature, gap, and trade-off against
> this**, not against whether the existing docs are internally consistent: the question is always
> "does this let Em do the thing by chat, with the least friction?" When a capability is asserted but
> can't actually be driven by the GPT (as the photo-upload path was before v1.5.5), that's a real gap —
> name it, and either build the by-chat path or state the honest limit on the page. The one structural
> limit to respect: a Custom GPT **Action** sends JSON and cannot forward a file a user pastes into the
> ChatGPT thread (and Code Interpreter has no network) — so media arrives by **link** (the GPT fetches
> a Drive/direct URL), and the GPT asks for a link when a photo is pasted directly.

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
- **No new functions.** Everything folds into existing `api/*.ts`; publish + coupon + archive are
  `?_action=` sub-routes of `products.ts` reached via `vercel.json` rewrites (Phase 6); the deferred
  purge is `pg_cron`. Function count stays **11/12** on Vercel Hobby.
- **Migration via Supabase CLI** (the Supabase MCP rejects writes on this project; anchor CWD at the
  repo root).
- **`is_test` isolation holds** — every new read/write stays scoped to the deployment's `isTest`
  (`api/_lib/env.ts:2` → `isTest = process.env.VERCEL_ENV !== 'production'`). `is_test` is **never**
  user-editable.
- **Stripe-lock** — the checkout *identity* fields (`checkout_name`/`checkout_description`/
  `checkout_image`) are frozen after publish (1.3); **`price` rotates in place** (a change deactivates
  the old Stripe Price and creates a new one on the *same* product — 1.3); marketing/SEO edits
  never touch Stripe.
- **Strict test isolation** — the public site shows only products whose `is_test` matches the
  deployment (1.11); production never shows test data.
- **Archive, never hard-delete** — "remove" sets `archived_at` + Stripe `active:false` (reversible,
  1.12); the only hard delete is the deferred `pg_cron` purge.

---

# Part 1 — Decisions & architecture (the why)

## 1.1 Field taxonomy — three tiers (resolved against the client's own docs)

Confirmed against `assets/docs/archive/resources/processed/{PLANNING_GUIDE,BUILD_GUIDE,CONTENT_PLANNING}.md`
and the GPT's canonical `assets/docs/gpt/product-reference.md`. **All four text fields are distinct —
nothing collapses.** The client's terms map to existing columns; "tagline" became `headline`.

Every product field belongs to one of three tiers. The GPT generates **all** of them (1.2), so the
owner never thinks about "which title goes where."

**Tier 1 — Stripe-bound. Identity fields set once + frozen at publish; `price` rotates in place:**
- `checkout_name` *(new)* — the product name on the Stripe checkout summary / `/complete` / receipt.
  **Falls back to `title`** when blank (Em needn't author a separate one). **Frozen after publish.**
- `checkout_description` *(new)* — the single short line shown at checkout / on the receipt.
  **Stays its own field for flexibility; falls back to `description` → `headline`** when blank.
  **Frozen after publish.**
- `checkout_image` *(new)* — the Stripe product image. **Falls back to `thumbnail`** when blank.
  **Frozen after publish.**
- `price` *(exists)* — **rotatable**: a change on a published product deactivates the old Stripe
  Price and creates a new one on the **same** Stripe product (keeping slug / URL / page / SEO), updating
  `stripe_price_id`. Editable freely while still a draft. *(Reverses the earlier "price change = a new
  product" decision.)*

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
the photo CDN URLs, and the v1.5 machinery below. *(`homepage_theme` is **admin/owner-editable** via
the admin panel and is draftable — but the GPT doesn't author it; its `editProduct` schema omits it.)*

**System (draft/publish machinery, new columns):** `is_published` (bool, default false),
`published_at` (timestamptz), `draft` (jsonb overlay), `preview_token` (text, unique), `archived_at`
(timestamptz; null = active, set = archived/removed — 1.12).

**Why the split works.** The site (shop, product page, cart) reads the **database**; the Stripe
checkout summary / `/complete` / receipt read the **Stripe catalog** (`checkout.ts` builds line items
from `stripe_price_id`). By making the three checkout *identity* fields **frozen and Stripe-bound** —
set once, pushed to Stripe at publish, never edited — editing marketing/SEO copy **never touches
Stripe**, so the catalog can't go stale. `price` is the one Stripe-bound field that can still change
after publish: because a Stripe **Price object is itself immutable**, a price change *rotates* it
(create a new Price on the same product, point the product at it, then deactivate the old one) — which
also keeps the catalog current (the product always charges its live Price; the retired Price is
`active:false`). The fallbacks mean Em only
authors checkout copy when she wants it to differ from the page copy.

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
- **After publish:** the checkout *identity* fields (`checkout_name` / `checkout_description` /
  `checkout_image`) + `sku` are **frozen**. **`price` is not frozen — it rotates**: a price change
  on a published product creates a new Stripe Price on the *same* Stripe product (same slug / URL /
  page / SEO), points `stripe_price_id` at it, then deactivates the old Price (the order matters — see
  Phase 3.4); the change applies to the live columns immediately. To run a *temporary*
  discount → a coupon (1.5), which leaves the list price
  intact; a permanent re-price is the rotation above.
- **Marketing/SEO edits never call Stripe.** (The only post-publish Stripe write from an edit is the
  price rotation; checkout identity + the product object are untouched.)
- **Two fields apply LIVE immediately on a published row (no preview/publish step):** `price` (rotates
  the Stripe Price) and **`available`** (the sold flag — a real purchase already writes
  it live, so a chat "mark it sold" must too). Everything else (copy/SEO/photos/media) stages as a draft.

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

*Create (new product):* (1) Owner: "add this piece…" and shares the photos as a **link** — a Google
Drive "anyone with the link" share, or any direct file URL (a Custom GPT Action can't receive a
file pasted into the chat, so the GPT asks for a link if she pastes one). (1a) For each photo/video the
GPT calls **`uploadImage({url, slug, role})`**; the server fetches the link, runs it through the
Cloudinary→R2 pipeline, and returns the CDN `url`. (2) GPT drafts every field (all three tiers, 1.1),
placing the returned URLs in `images[]`/`thumbnail`/`checkout_image`/`seo_thumbnail`/`media[]` →
`createProduct`. (3) Saved **unpublished**, **no Stripe object yet**; the response
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
product are the checkout *identity* fields (`checkout_name`/`checkout_description`/`checkout_image`)
(1.3); **price she can change anytime** — it rotates in place, effective immediately on the same
page/URL; for a temporary sale, a coupon (1.5).

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
- **Owner sales are tagged + isolated.** The store **already** auto-creates Stripe promotion
  codes for cart-recovery + newsletter-welcome (`api/cart.ts`, `api/subscribe.ts`). So every
  owner-created coupon is stamped `metadata.source: 'owner_sale'`, and `listCoupons` / `deactivateCoupon`
  act **only** on those — the GPT never lists or ends a system-generated code. (Build: Phase 3.5.)

## 1.6 Admin panel — unify, show status, light vibe

- **Unify:** admin create/edit go through the **same draft → preview → publish** path as the GPT.
  One safety path everywhere (matters once Em is on her own after the support window).
- **Status (Sean's "Page Status" ask):** the admin product list shows **Live / Draft** and **"edits
  pending"** when a published row has a staged `draft` (Phase 8.8).
- **Archive, not delete (1.12):** the admin "Delete" becomes **Archive** (removes from the
  store, reversible) + **Resurface**; the list gains an "archived" pill + filter. No hard delete from
  the UI (Phase 8).
- **Vibe (light brand pass):** not a redesign — apply the site tokens, comfortable spacing, on-brand
  type/colour so it doesn't feel like a debug screen. *(The deeper visual restyle stays in Part 3 /
  a later slice; the status + draft/publish wiring is functionality and ships here.)*

## 1.7 GPT understanding — author early, evolve (brand-critical)

The GPT's knowledge + instructions are the **most prominent brand surface.** If thin, the GPT is
wrong or clunky enough that DIY beats it. Authored in Phase 9 (knowledge = `assets/docs/gpt/*`;
instructions + schema = `GPT_SETUP.md`). It must understand: every field by tier (1.1); the
create/edit→preview→publish flow; the preview-handoff language; coupon semantics; confirm-vs-expedite;
plain-language errors; price changes (rotate in place); discarding staged edits;
**media-by-link** (Em shares a Drive/direct link → `uploadImage`; a pasted file can't be forwarded, so
ask for a link); and what it does **not** do (edit the frozen checkout identity fields after
publish; touch `is_test`).

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
  edits-pending / **archived**) and `getProduct` (fetch the one she names, by slug, live or draft) — so
  the GPT pulls exactly the piece it needs before editing, not the whole catalog.
- **Products — write:** `createProduct` (→ **draft** + preview link; no Stripe yet);
  `editProduct` (→ stages a `draft` on a published row, or edits a still-unpublished draft — `checkout_*`
  edit **only while it's still a draft** and freeze at first publish, while **`price` stays editable and
  *rotates* in place after publish**; returns the preview link); `publishProduct` (new → creates
  Stripe + goes live; edit → applies the draft); **`discardEdits`** (→ scrap a published row's staged
  draft without publishing — the inverse of publish).
- **Products — lifecycle:** `archiveProduct` (remove from the store — reversible; mirrors Stripe
  `active:false`) and `unarchiveProduct` (bring it back). "Delete / take down" **always means archive**,
  never a hard delete (1.12). A published price change is **not** a new product — `editProduct {price}`
  rotates the Stripe Price in place (same slug / URL / page).
- **Media:** `uploadImage({url, slug, role})` — Em shares a photo/video as a **link** (Google Drive
  "anyone with the link", or a direct file URL) and the server fetches it; roles incl. the new
  `checkout_image` (1:1) + `seo_thumbnail` (1.91:1); videos pass `skip_transform:true`. A file pasted
  directly into the chat can't be forwarded by an Action → the GPT asks for a link (North Star).
  The create/edit `media` array sets the page's optional MP4 / YouTube (renders in order, hides when absent).
- **Discounts:** `createCoupon` (Coupon + Promotion Code), `listCoupons`, `deactivateCoupon` (end a
  sale anytime) — all scoped to owner-tagged coupons so system codes are never touched (1.5).
- **Orders:** `listOrders`; `markShipped` (emails the buyer; confirm first). *(Already shipped in
  v1.4.9 — the GPT schema + instructions exist; v1.5 adds nothing on the order side.)*
- **Refunds:** guided only — Em issues them in the Stripe dashboard (no GPT Action in v1.5; a
  GPT-initiated refund is a v1.1 thesis item). A **full** dashboard refund now flips the order to
  `refunded` automatically via the `charge.refunded` webhook branch (Phase 4.7), so the order
  status the GPT reports stays truthful.

*Decided:* `product_type` **is** editable (not Stripe-frozen — 1.2). Coupons are **create + list +
deactivate**, owner-tagged so system codes stay untouched (1.5). **Dynamic product media** is **in**
(optional MP4 / rare YouTube, hides when absent — 3.3 + Phase 7). **Remove = archive** (reversible, full
GPT parity — 1.12). **Re-price = rotate in place**: `checkout_*` freeze at first publish; `price`
stays changeable forever and rotates the Stripe Price (the old "price change = new product" is retired).
A staged draft can be **published or discarded**. Nothing left open here.

## 1.11 Strict test-product isolation (the public site never shows test data)

The public shop + product pages read Supabase through the **anon client** (`main.js`
`getProducts` / `getProductBySlug`), which historically filtered only on `stripe_price_id IS NOT NULL`
— **never on `is_test`** (an intentional pre-v1.5 posture that let `is_test=true` placeholders show
during launch prep). v1.5 turns that into a hazard: testing the new **publish** flow on the dev preview
creates a *published* test product in the shared Supabase project, which production's anon client would
then display (and it'd be unbuyable). v1.5's drafts now cover "not-yet-live content" properly, so the
placeholder hack is obsolete.

**Decision (Sean): filter `is_test` on the public path to match the deployment.**
- `api/config.ts` returns an `isTest` flag (it knows `VERCEL_ENV`); `main.js` reads it and adds
  `.eq('is_test', <isTest>)` to both public reads.
- **Production shows only live products (`is_test=false`); the dev preview shows only test ones** — so
  the dev-preview publish test (Phase 11 #3) still renders, and prod can never surface a test row.
- Read-only and env-derived; `is_test` stays **never user-editable**. (Build: Phase 4.5.)

## 1.12 Remove = archive (reversible; no hard delete)

A Stripe product that has a price **cannot be hard-deleted** — Stripe keeps a forever-archive via
`active:false`. Admin's current "Delete" is a hard Supabase row delete (`admin.js`, "cannot be undone",
no Stripe call) that would also fail on any ordered product (the `orders → products` FK has no
`ON DELETE CASCADE`). So v1.5 formalizes **archive**, the way Stripe itself works.

- **New column `archived_at timestamptz`** (null = active; set = archived). Distinct from `available`
  (sold / not-buyable — *stays visible with a Sold badge*, unchanged) and `is_published` (draft / live).
- **Archive** = `archived_at = now()` + mirror Stripe `products.update(active:false)` (when a Stripe id
  exists). The piece leaves the shop, feed, product page, and checkout but stays in the DB —
  **searchable and resurfaceable**. **Unarchive** reverses both.
- **Everywhere "remove / delete / take down" = archive** (admin + GPT) — full GPT parity, non-destructive.
- **Hidden via RLS** (`archived_at IS NULL` on the public read policy), so the anon site + feed drop it
  automatically; the authorized admin/GPT GET still sees it (with an "archived" status).
- **TTL hard-purge — specified, enablement deferred.** A `pg_cron` job (in-DB, no Vercel function) can
  later hard-delete genuinely dead rows (abandoned drafts / long-archived items), always skipping any
  order-referenced row (the FK is the backstop). Product rows are tiny (images live in R2, not
  Supabase), so this is about keeping lists fast — already handled by the archive filter — not storage;
  enable post-launch only if needed. Phase 1 ships it **commented/disabled**.

---

# Part 2 — Exclusively-executable build

## Pre-flight — verify these anchors before editing (line numbers are hints)

- `supabase/migrations/20260421000002_rls_policies.sql` — policy `"Products are publicly readable" …
  USING (true)`.
- `supabase/migrations/20260421000003_stripe_sync_webhook.sql` — the **whole** `notify_stripe_sync()`
  body + `CREATE TRIGGER notify_stripe_sync_on_insert AFTER INSERT ON products` (both quoted verbatim in
  Phase 1). The only change is the guard: `IF NEW.is_test = true …` → `… OR NEW.is_published = false`.
- `supabase/migrations/20260421000001_initial_schema.sql` — `products` columns (incl. `available`,
  `is_test`); `orders.product_id uuid REFERENCES products(id)` — **no `ON DELETE CASCADE`**, so order
  history is FK-protected from the purge (1.12).
- `api/_lib/stripeSync.ts` — `SyncableProduct` (11–22); `stripe.products.create` (61–70); the Price
  create + ID write-back + idempotent short-circuit (36–96, quoted in Phase 2).
- `api/products.ts` — `createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)` (**6–8 — service-role, so it
  bypasses RLS and reads drafts/archived**); `authorize` (17–25); `jsonResponse` (27–32); GET (38–94 —
  list returns `{ products }`, slug/id return a bare row); POST create+sync (96–211); PUT (213–291).
  **No `DELETE`.**
- `api/checkout.ts` — `createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)` (**10–12 — service-role; *why*
  Phase 4 adds explicit `is_published`/`archived_at` guards**); session select+guard (68–79); reserve
  select+filter (186–205).
- `api/config.ts` — the GET response object (1.11 adds `isTest`); `api/_lib/env.ts` — `isTest` (line 2).
- `api/upload.ts` — `ROLE_PATTERN` (52–53); transform (170–172). **Video passthrough + `skip_transform`
  already exist** (95, 118–131, 199–203) — Phase 5 adds only roles + crops.
- `vercel.json` — `rewrites` array.
- `assets/js/main.js` — `getProductBySlug` (51–63), `getProducts` (65–82) — the public anon reads (1.11).
- `assets/js/product.js` — `DOMContentLoaded` handler (7–39, quoted verbatim in Phase 7).
- `assets/js/admin.js` — `dollarsToCents` (**46–50 — `Math.round(num*100)`**) + `centsToDollars`
  (**52–55 — `(cents/100).toFixed(2)`**); `state.client` = publishable-key + session (**109–111 — an
  *authenticated*-role client, RLS-bound**); `authHeader` (213–216 — the Bearer-JWT helper that publish
  + archive reuse; it **exists**); `loadProducts` (**218–222 — reads via
  `fetch('/api/products', {authHeader})`, i.e. the service-role API, NOT `state.client`**);
  `renderProductList` (235–256); `openEditor` SEO lines (288–289) + price populate (**274 —
  `centsToDollars(product.price)`**); `buildProductPayload` SEO lines (407–408) **and `price` at 394**
  (always emitted — the root of the published-edit-400 bug); `onSaveProduct` `body = await res.json()` (**454**) + status line
  (461–462) + the edit PUT (440–446 — sends the full payload); `onDeleteProduct` (470–485 — the hard
  delete Phase 8 replaces with archive **via `fetch('/api/products/archive', {authHeader})`, also the
  API not `state.client`**).
- `admin/index.html` — `.pill` styles (68–70); SEO row (156–159); upload-role `<select>` (204–206);
  `form-actions` (218–223).
- `assets/docs/GPT_SETUP.md` — status note (16, 26); Instructions (97–124); schema `version` (133),
  `createProduct` block (167–213), curl Step 3 + PUT (376–417), quick-ref (425–432); orders schema +
  instructions **already present** (231–283, 109–114).
- `assets/docs/gpt/product-reference.md` — "system fills these" (31–33); "Before you create" (64).
- `assets/docs/STORE_ADMINISTRATION.md` — Em's plain how-to (refreshed in Phase 10b).

**Verify before Phase 1:** confirm in Supabase Studio → Database → Triggers that
`notify_stripe_sync_on_insert` is the **only** INSERT trigger on `products`, and that **no** Studio
Database-Webhook points at `products` INSERT. (Migration `…0003` implements the sync as a SQL trigger
*specifically to avoid* the Studio Webhooks UI, so there should be exactly one path — this just proves
it. If a duplicate exists, disable it.)

**`is_test` on the anon path (1.11).** The public site reads via the **anon
client** (`main.js`), which filters `stripe_price_id IS NOT NULL`, **not** `is_test`. The new RLS hides
*drafts* + *archived* rows automatically; **`is_test` isolation is added in Phase 4.5** (a config flag +
a `main.js` filter), not by RLS. Two reader checks the cold reviewer flagged, both confirmed safe in the
working tree:
- **Meta feed (already safe; Phase 4.6 hardens it).** `api/product-feed.ts` is on the
  anon/publishable client, so the new RLS hides drafts + archived; **and it already hardcodes
  `.eq('is_test', false)` (line 22)**, so the production feed *never* emits a test row regardless of RLS.
  No leak today — but Phase 4.6 adds an explicit `is_published`/`archived_at` filter so this public
  catalog never depends on the client type alone (and survives a future refactor that adds an authorized
  branch).
- **Every other public read (G5 — already routed, no change).** The only anon product readers are
  `main.js`'s `getProductBySlug` / `getProducts`; **`shop.js:9`, `homepage.js:10`, `product.js:20`, and
  `renderRelatedProducts` (`product.js:292`) all call those two** — none issues its own
  `supabase.from('products')`. So the Phase 4.5b `is_test` filter covers shop, homepage, the product
  page, and the related rail in one place.

`api/config.ts` reads no products. Only the **service-role** readers (the API GET + checkout) get the
explicit `is_published` / `archived_at` guards below.

**Read-path client identity (the load-bearing anchor).** The v1.5 migration is the
**first time RLS hides rows the app still has to read** (drafts + archived, bound to *both* `anon` and
`authenticated`). So which client each reader uses decides whether it sees drafts. **All four are
verified in the working tree — confirm them before Phase 1, because a single wrong one silently inverts
the feature:**
- `api/products.ts` → **`SUPABASE_SECRET_KEY`** (service-role) → preview / publish-lookup / PUT-`current`
  / archive-lookup all see drafts + archived. ✓
- `api/checkout.ts` → **`SUPABASE_SECRET_KEY`** (service-role) → must self-guard; Phase 4 does. ✓
- `api/product-feed.ts` → **`SUPABASE_PUBLISHABLE_KEY`** (anon) → RLS *does* hide drafts/archived from
  the Meta catalog. Phase 4.6 *also* adds an explicit `is_published`/`archived_at` filter so a public
  catalog never rides on the client-type alone (defense-in-depth, matching checkout). ✓
- `assets/js/admin.js` → `loadProducts` + `onArchiveToggle` both go through **the service-role API**
  (`fetch('/api/products…', {authHeader})`), **not** the RLS-bound `state.client`. So the admin
  draft/publish/archive UI never goes blind. (The only product op that ever used `state.client` was the
  old hard delete — Phase 8.11 replaces it with the archive API.) ✓

**Price round-trip (the change-detect `!==` guard depends on it).** The published-edit guard rejects
a frozen field only when `updates[f] !== current[f]`. For the admin path that is safe **only if the
price field round-trips to the identical integer** — and it does: `dollarsToCents` uses
**`Math.round(num * 100)`** (admin.js:49), the editor populates via `centsToDollars`
(`(cents/100).toFixed(2)`, 52–55) at 274, so `24599 → "245.99" → Math.round(245.99*100) = 24599` is
exact (no float drift). And `price` is no longer frozen anyway (it rotates), so the guard no longer
gates price at all; this round-trip now only matters for the rotation's own `price !== current.price`
*change-detection*, where the identical-integer round-trip means an unchanged re-save never triggers a
spurious Stripe rotation.

## Phase 1 — Migration (new file)

> **Anti-fragility quote the live trigger before replacing it.** The migration below
> `CREATE OR REPLACE`s `notify_stripe_sync()`. First confirm the working tree's
> `supabase/migrations/20260421000003_stripe_sync_webhook.sql` currently contains **exactly** this
> function + trigger — the replacement changes only the one guard line, and the trigger is
> `AFTER INSERT` **only** (so the publish-time `UPDATE` can never re-fire it → no double Stripe create):
>
> ```sql
> -- CURRENT (live) — supabase/migrations/20260421000003_stripe_sync_webhook.sql
> CREATE OR REPLACE FUNCTION notify_stripe_sync()
> RETURNS TRIGGER AS $$
> DECLARE
>   payload jsonb;
> BEGIN
>   -- Skip test inserts entirely — they never trigger Stripe sync
>   IF NEW.is_test = true THEN
>     RETURN NEW;
>   END IF;
>   payload := jsonb_build_object(
>     'type', 'INSERT', 'table', 'products', 'schema', 'public',
>     'record', row_to_json(NEW), 'old_record', null
>   );
>   PERFORM net.http_post(
>     url := 'https://everlastingsbyemaline.com/api/stripe-sync',
>     body := payload::text,
>     headers := '{"Content-Type": "application/json"}'::jsonb
>   );
>   RETURN NEW;
> END;
> $$ LANGUAGE plpgsql;
>
> CREATE TRIGGER notify_stripe_sync_on_insert
>   AFTER INSERT ON products
>   FOR EACH ROW
>   EXECUTE FUNCTION notify_stripe_sync();
> ```
>
> If it differs, STOP and reconcile — the NEW body must equal the above **plus**
> `OR NEW.is_published = false`. We do **not** touch `CREATE TRIGGER` (it stays INSERT-only).

Create `supabase/migrations/20260605000001_v1_5_draft_publish.sql`:

```sql
-- v1.5 — draft → preview → publish, 3-tier fields, Stripe-lock, archive.

-- New columns -----------------------------------------------------------------
ALTER TABLE products ADD COLUMN checkout_name        text;
ALTER TABLE products ADD COLUMN checkout_description text;
ALTER TABLE products ADD COLUMN checkout_image       text;
ALTER TABLE products ADD COLUMN seo_thumbnail        text;
ALTER TABLE products ADD COLUMN is_published         boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN published_at         timestamptz;
ALTER TABLE products ADD COLUMN draft                jsonb;
ALTER TABLE products ADD COLUMN preview_token        text UNIQUE;
ALTER TABLE products ADD COLUMN archived_at          timestamptz;   -- 1.12: null = active, set = archived

-- Backfill: existing live (already Stripe-synced) products are published. Fail-closed:
-- anything without a Stripe price stays an unpublished draft.
-- Expected in prod: 0 rows that were actually VISIBLE become hidden — the public site already
-- hides anything without a stripe_price_id (main.js). Verify the count on the dev preview.
UPDATE products
   SET is_published = true, published_at = created_at
 WHERE stripe_price_id IS NOT NULL;

-- Indexes: token lookups + fast "active" lists (exclude drafts + archived).
CREATE INDEX idx_products_preview_token ON products (preview_token) WHERE preview_token IS NOT NULL;
CREATE INDEX idx_products_active ON products (created_at DESC)
  WHERE is_published = true AND archived_at IS NULL;

-- RLS: the public (anon/authenticated) client may read ONLY published, non-archived rows.
-- (Admin + GPT read via the service-role API, which bypasses RLS.) IF EXISTS so a partial
-- re-run can't hard-fail; the exact policy name is the anchor.
DROP POLICY IF EXISTS "Products are publicly readable" ON products;
CREATE POLICY "Published products are publicly readable"
  ON products FOR SELECT TO anon, authenticated
  USING (is_published = true AND archived_at IS NULL);

-- Safety guard: the DROP above is keyed to the EXACT legacy policy name. Postgres ORs
-- permissive SELECT policies, so if that name ever drifted, `DROP POLICY IF EXISTS` would no-op
-- SILENTLY and the old `USING (true)` policy would survive ALONGSIDE the new one → `true OR (...)` →
-- every draft, archived, and test row publicly readable, with the migration still reporting success.
-- Fail LOUD instead: abort the migration if any permissive SELECT policy on products still has an
-- unconditional qual. (The name matches today — this is defense-in-depth on a silent, catastrophic
-- failure mode; near-zero cost.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'products'
       AND cmd = 'SELECT' AND permissive = 'PERMISSIVE'
       AND qual = 'true'
  ) THEN
    RAISE EXCEPTION 'Unsafe RLS on products: a permissive SELECT policy still has USING(true) — drafts/archived/test rows would be publicly readable. Drop the stale policy and re-run.';
  END IF;
END $$;

-- Stripe auto-create trigger must skip drafts. Stripe objects are created only at publish
-- (api/products.ts ?_action=publish calls syncProductToStripe inline). REPLACES the live
-- function (quoted above) — the ONLY delta is the added `OR NEW.is_published = false` guard.
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

-- TTL hard-purge (1.12) — SPEC'D BUT DISABLED. Uncomment + tune the intervals post-launch only if
-- active-list size ever warrants it (product rows are tiny; images live in R2, not Supabase). The
-- orders FK (no ON DELETE CASCADE) already blocks purging any ordered row; the NOT EXISTS makes that
-- explicit so the job never errors. archive (archived_at) is the everyday "remove"; this is janitorial.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('purge_dead_products', '0 4 * * 0', $purge$
--   DELETE FROM products p
--    WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.product_id = p.id)
--      AND (
--        (p.is_published = false  AND p.created_at  < now() - interval '90 days') OR
--        (p.archived_at IS NOT NULL AND p.archived_at < now() - interval '180 days')
--      );
-- $purge$);
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

**2.3 — no change here; just confirm the publish path is sound.** `handlePublish`
(Phase 3.5) relies on `syncProductToStripe` doing three things, which the **current** helper already
does — so a first publish lands buyable, and a retry after a partial publish is safe:
```ts
  // (a) creates the Price from product.price                       — api/_lib/stripeSync.ts:72–76
  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id, unit_amount: product.price, currency: 'usd',
  });
  // (b) writes BOTH ids back to the row                            — :78–84
  await supabase.from('products')
    .update({ stripe_product_id: stripeProduct.id, stripe_price_id: stripePrice.id })
    .eq('id', product.id);
  // (c) short-circuits if a stripe_product_id already exists (payload OR a fresh DB read) — :37–59
```
No edit — this is the verification the reviewer asked for. (Were any of (a)–(c) missing, a published
product could have no `stripe_price_id` → unbuyable; all three are present, so publish is safe + idempotent.)

## Phase 3 — `api/products.ts` (create-as-draft, edit-to-draft, publish, coupon, preview)

> The authorized GET (slug / id / list) already returns full rows (`select('*')`), so **`listProducts`
> and `getProduct` (Phase 9) need no new handler** — they map to this GET (`getProduct` via a by-slug
> rewrite). Only the **public** (unauthorized) branches gain the `is_published` guard below.

**3.1 — imports + helpers.**

CURRENT (the full import cluster, 1–5) — quoted in full so the added `import type
Stripe` is provably non-colliding: the Stripe **instance** is the lowercase `{ stripe }` from
`./_lib/stripe`, and there is **no** capital-`Stripe` identifier yet, so the type import adds no
duplicate:
```ts
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest, env } from './_lib/env';
import { stripe } from './_lib/stripe';
import { syncProductToStripe, StripeSyncResult, SyncableProduct } from './_lib/stripeSync';
```
NEW (add `randomUUID` + the `Stripe` **type** namespace — used by `handleCoupon` /
`handleCouponDeactivate`; the lowercase `stripe` value import is untouched):
```ts
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type Stripe from 'stripe';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest, env } from './_lib/env';
import { stripe } from './_lib/stripe';
import { syncProductToStripe, StripeSyncResult, SyncableProduct } from './_lib/stripeSync';
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

> **Origin assumption (recorded, not a bug).** Both helpers derive the host from
> `new URL(request.url).origin`, which is what makes "relay the link, never hardcode the domain" work
> across prod **and** the dev preview. This relies on `request.url` carrying the
> **public** origin on this deployment — true here: the store is reached on its custom domain in
> production and on the `*.vercel.app` preview host in test, and Vercel passes that public host through
> to the function's `request.url` (it is *not* an internal proxy hostname). Phase 11 #3 asserts the
> returned `preview_url` host == the host the request came in on, so the premise is tested, not assumed.

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
NEW (public branch also hides archived — 1.12; `.is(col, null)`, not `.eq`):
```ts
  if (slug) {
    let query = supabase.from('products').select('*').eq('slug', slug);
    if (!isAuthorized) {
      query = query.eq('is_test', false).eq('is_published', true).is('archived_at', null);
    } else {
      query = query.eq('is_test', isTest);
    }
```

CURRENT (slug return, 51–57):
```ts
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('Product GET (slug) failed:', error.message);
      return jsonResponse(request, { error: 'Failed to load product' }, 500);
    }
    if (!data) return jsonResponse(request, { error: 'Product not found' }, 404);
    return jsonResponse(request, data);
```
NEW (hand authorized callers an origin-correct `preview_url` so the GPT relays it
instead of string-building a host; public callers never reach here with a token):
```ts
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('Product GET (slug) failed:', error.message);
      return jsonResponse(request, { error: 'Failed to load product' }, 500);
    }
    if (!data) return jsonResponse(request, { error: 'Product not found' }, 404);
    if (isAuthorized && data.preview_token) {
      return jsonResponse(request, {
        ...data,
        preview_url: previewUrl(request, String(data.slug), String(data.preview_token)),
      });
    }
    return jsonResponse(request, data);
```

CURRENT (list public filter, 82–86):
```ts
  if (!isAuthorized) {
    listQuery = listQuery.eq('is_test', false);
  } else {
    listQuery = listQuery.eq('is_test', isTest);
  }
```
NEW (public branch also hides archived — 1.12):
```ts
  if (!isAuthorized) {
    listQuery = listQuery.eq('is_test', false).eq('is_published', true).is('archived_at', null);
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
  if (action === 'archive') return handleArchive(request, true);    // 1.12 — remove from store
  if (action === 'unarchive') return handleArchive(request, false); // 1.12 — bring it back
  if (action === 'discard') return handleDiscard(request);          // Scrap a staged draft

  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }
```

**Make the create validation product-type-aware.** Today only `miniature` exists, so this
changes **nothing** operationally — but it turns "add a new product_type" (storybook / printable / …)
into a CONFIG entry rather than a validator rewrite: a new type reuses the miniature shape by default and
may override its required scalar fields and photo minimums (incl. dropping a field's obligation). Unknown
types fall back to `default` (= miniature) so a new type is never silently un-validated.

CURRENT (the required-fields + image-count validation, 108–156):
```ts
  const required = ['title', 'description', 'price', 'product_type', 'headline', 'story_card'];
  const missing = required.filter((f) => {
    const v = product[f];
    if (v === undefined || v === null) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  });
  if (missing.length) {
    return jsonResponse(
      request,
      { error: `Missing required fields: ${missing.join(', ')}` },
      400,
    );
  }

  if (!Number.isInteger(product.price) || (product.price as number) <= 0) {
    return jsonResponse(
      request,
      { error: 'Price must be a positive integer in cents' },
      400,
    );
  }

  const images = Array.isArray(product.images) ? (product.images as ImageEntry[]) : null;
  if (!images || images.length === 0) {
    return jsonResponse(request, { error: 'images array is required' }, 400);
  }

  const filenameOf = (img: ImageEntry): string => {
    const u = typeof img?.url === 'string' ? img.url : '';
    return u.split('/').pop() ?? '';
  };
  const roleName = (img: ImageEntry): string => filenameOf(img).replace(/^test_/, '');
  const heroImages = images.filter((img) => roleName(img).startsWith('hero-'));
  const galleryImages = images.filter((img) => roleName(img).startsWith('gallery-'));

  if (heroImages.length < 1) {
    return jsonResponse(request, { error: 'At least 1 hero image required' }, 400);
  }
  if (typeof product.thumbnail !== 'string' || !product.thumbnail.trim()) {
    return jsonResponse(request, { error: 'Thumbnail URL required' }, 400);
  }
  if (galleryImages.length < 5) {
    return jsonResponse(request, { error: 'Minimum 5 gallery images required' }, 400);
  }
```
NEW (rules looked up per `product_type`; `miniature` keeps the exact current values):
```ts
  // Per-type create requirements. miniature is the only type today; new types are added
  // here, not by editing the checks below. `default` (= miniature) catches any unknown/new type so it
  // is never left un-validated. A type may drop a required field or lower a photo minimum.
  type TypeRules = { required: string[]; minHero: number; minGallery: number; requireThumbnail: boolean };
  const PRODUCT_TYPE_RULES: Record<string, TypeRules> = {
    miniature: {
      required: ['title', 'description', 'price', 'product_type', 'headline', 'story_card'],
      minHero: 1, minGallery: 5, requireThumbnail: true,
    },
  };
  const typeKey = typeof product.product_type === 'string' ? product.product_type : '';
  const rules: TypeRules = PRODUCT_TYPE_RULES[typeKey] ?? PRODUCT_TYPE_RULES.miniature; // default = miniature

  const missing = rules.required.filter((f) => {
    const v = product[f];
    if (v === undefined || v === null) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  });
  if (missing.length) {
    return jsonResponse(
      request,
      { error: `Missing required fields: ${missing.join(', ')}` },
      400,
    );
  }

  if (!Number.isInteger(product.price) || (product.price as number) <= 0) {
    return jsonResponse(
      request,
      { error: 'Price must be a positive integer in cents' },
      400,
    );
  }

  const needsImages = rules.minHero > 0 || rules.minGallery > 0 || rules.requireThumbnail;
  const images = Array.isArray(product.images) ? (product.images as ImageEntry[]) : null;
  if (needsImages && (!images || images.length === 0)) {
    return jsonResponse(request, { error: 'images array is required' }, 400);
  }
  const imgList = images ?? [];

  const filenameOf = (img: ImageEntry): string => {
    const u = typeof img?.url === 'string' ? img.url : '';
    return u.split('/').pop() ?? '';
  };
  const roleName = (img: ImageEntry): string => filenameOf(img).replace(/^test_/, '');
  const heroImages = imgList.filter((img) => roleName(img).startsWith('hero-'));
  const galleryImages = imgList.filter((img) => roleName(img).startsWith('gallery-'));

  if (heroImages.length < rules.minHero) {
    return jsonResponse(request, { error: `At least ${rules.minHero} hero image(s) required` }, 400);
  }
  if (rules.requireThumbnail && (typeof product.thumbnail !== 'string' || !product.thumbnail.trim())) {
    return jsonResponse(request, { error: 'Thumbnail URL required' }, 400);
  }
  if (galleryImages.length < rules.minGallery) {
    return jsonResponse(request, { error: `Minimum ${rules.minGallery} gallery images required` }, 400);
  }
```

> **Adding a new product_type later = one config entry.** e.g. a low-photo `storybook` would be
> `storybook: { required: ['title','description','price','product_type','headline','story_card'],
> minHero: 1, minGallery: 0, requireThumbnail: true }` — no other code changes, and `miniature` is
> untouched. (We only ship `miniature` now; this is the extensibility scaffold, not a new type.)

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
  // build the insert from an explicit allow-list (mirrors the PUT `pick(...)`), so the
  // v1.5 system columns (draft, archived_at, published_at, stripe_*, is_published, is_test,
  // preview_token) can never be injected by a caller. `product` is the raw request body; only these
  // keys pass through, then the server-set columns are layered on. Defined inline (DRAFTABLE is module
  // scope, resolved at request time) to avoid any declaration-order TDZ.
  const CREATE_FIELDS = [
    ...DRAFTABLE,
    'price', 'checkout_name', 'checkout_description', 'checkout_image', 'title', 'slug', 'sku',
  ];
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
```

> **`slug`/`sku` provenance — why the allow-list captures them (anchor).** `CREATE_FIELDS`
> picks `slug`/`sku` **from `product`**, and the generation code upstream (unchanged, **above** this
> insert) assigns the generated slug back **onto `product`**, so the pick captures it:
> ```ts
> // api/products.ts 158–163 (CURRENT — runs before the allow-list pick):
> const title = String(product.title).trim();
> const slug =
>   typeof product.slug === 'string' && product.slug.trim()
>     ? product.slug.trim()
>     : title.toLowerCase().replace(/ /g, '-');
> product.slug = slug;   // ← lands on `product`, so CREATE_FIELDS' pick of 'slug' captures it
> ```
> `sku` is **not** auto-generated (it's caller-supplied or absent — never in the `required` list), so the
> allow-list captures it when present and the NOT-NULL/unique `slug` is always set. No required file-open.

**3.4 — PUT: edit stages copy/SEO into `draft` (published rows) or updates live columns (unpublished
drafts); `price` rotates in place on a published row.** Full-function replacement.

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
// `available` stays in DRAFTABLE for the UNPUBLISHED-draft branch (where everything applies to live
// columns anyway — nothing's live yet). On a PUBLISHED row it's pulled out and applied LIVE immediately
// (applies live, like price) — see the published branch's `DRAFTABLE.filter(k => k !== 'available')`.
// `price` is NOT frozen — it rotates in place (handled in the published branch below). The
// checkout IDENTITY fields + sku + the Stripe IDs stay frozen after publish.
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

    // `available` (the sold / on-sale flag) goes LIVE immediately on a published
    // row, like price — it isn't a visual change that needs a preview, and a real purchase already
    // writes `available:false` to the live row (webhook.ts). Staging it would let "mark it sold" sit
    // un-applied until publish (an oversell trap). So apply it live, and exclude it from staging below.
    if (updates.available !== undefined && typeof updates.available === 'boolean') {
      liveUpdate.available = updates.available;
    }

    // Stage copy/SEO edits (only when there are any — a price-only / availability-only change must NOT
    // flag "edits pending"). `available` is handled live above, so it never stages.
    const draftable = pick(DRAFTABLE.filter((k) => k !== 'available'));
    const hasDraftable = Object.keys(draftable).length > 0;
    const rowUpdate: Record<string, unknown> = { ...liveUpdate };
    if (hasDraftable) {
      const existingDraft =
        current.draft && typeof current.draft === 'object'
          ? (current.draft as Record<string, unknown>)
          : {};
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
```

> **Note:** the PUT published branch **keeps** `stripe.prices.*` (deactivate + create) for the
> price rotation — the same calls the pre-v1.5 PUT used, just relocated into the `is_published` branch.
> `stripe` is also used by `handleCoupon` + `handleArchive` (`stripe.products.update`);
> `syncProductToStripe`/`StripeSyncResult`/`SyncableProduct` by `handlePublish`; `randomUUID` by
> create + PUT; the `Stripe` type by `handleCoupon`/`handleCouponDeactivate`. Run `tsc` to confirm no
> unused-import errors.

## Phase 4 — `api/checkout.ts` (a draft must never be reservable or purchasable)

**4.1 — `handleSession`.**

CURRENT (68–71):
```ts
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, slug, stripe_price_id, available, quantity')
      .in('id', productIds);
```
NEW (also fetch archived_at — 1.12):
```ts
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, slug, stripe_price_id, available, quantity, is_published, archived_at')
      .in('id', productIds);
```

CURRENT (79):
```ts
      if (!product || product.available !== true || (product.quantity ?? 0) < 1) {
```
NEW (archived ⇒ not purchasable — 1.12):
```ts
      if (!product || product.is_published !== true || product.archived_at != null || product.available !== true || (product.quantity ?? 0) < 1) {
```

**4.2 — `handleReserve`.**

CURRENT (186–189):
```ts
        supabase
          .from('products')
          .select('id, slug, available, quantity, series')
          .in('id', productIds),
```
NEW (also fetch archived_at — 1.12):
```ts
        supabase
          .from('products')
          .select('id, slug, available, quantity, series, is_published, archived_at')
          .in('id', productIds),
```

CURRENT (205):
```ts
        if (!product || product.available !== true || (product.quantity ?? 0) < 1) return true;
```
NEW (archived ⇒ unavailable — 1.12):
```ts
        if (!product || product.is_published !== true || product.archived_at != null || product.available !== true || (product.quantity ?? 0) < 1) return true;
```

**4.3 — `handleReserve` "related / alternatives" queries (`checkout.ts` is service-role,
so RLS does NOT protect it; without this the suggested-alternative rail would surface drafts + archived
pieces as dead/unbuyable links when a cart item is sold).** Both sub-queries need the same
`is_published`/`archived_at` guard the primary read got.

CURRENT (series-related, 226–232):
```ts
        const { data: seriesRelated } = await supabase
          .from('products')
          .select('id, slug, available, series')
          .in('series', seriesValues)
          .eq('available', true)
          .eq('is_test', isTest)
          .limit(12);
```
NEW:
```ts
        const { data: seriesRelated } = await supabase
          .from('products')
          .select('id, slug, available, series')
          .in('series', seriesValues)
          .eq('available', true)
          .eq('is_test', isTest)
          .eq('is_published', true)
          .is('archived_at', null)
          .limit(12);
```

CURRENT (fallback, 240–245):
```ts
        const { data: fallback } = await supabase
          .from('products')
          .select('id, slug, available')
          .eq('available', true)
          .eq('is_test', isTest)
          .limit(6);
```
NEW:
```ts
        const { data: fallback } = await supabase
          .from('products')
          .select('id, slug, available')
          .eq('available', true)
          .eq('is_test', isTest)
          .eq('is_published', true)
          .is('archived_at', null)
          .limit(6);
```

## Phase 4.5 — strict test isolation on the public path (1.11)

The public anon reads (`main.js`) must filter `is_test` to the deployment so production never shows a
published *test* product (and the preview shows only test ones). `/api/config` runs server-side, so it
hands the browser the env flag.

**4.5a — `api/config.ts`: return `isTest`.**

CURRENT:
```ts
import { corsHeaders, preflight } from './_lib/cors';
import { env } from './_lib/env';

export async function GET(req: Request) {
  return Response.json(
    {
      publishableKey: env('STRIPE_PUBLISHABLE_KEY'),
      supabaseUrl: env('SUPABASE_URL'),
      supabasePublishableKey: env('SUPABASE_PUBLISHABLE_KEY'),
      metaPixelId: env('META_PIXEL_ID') || null,
    },
    { headers: corsHeaders(req) },
  );
}
```
NEW (import `isTest`, add it to the payload):
```ts
import { corsHeaders, preflight } from './_lib/cors';
import { env, isTest } from './_lib/env';

export async function GET(req: Request) {
  return Response.json(
    {
      publishableKey: env('STRIPE_PUBLISHABLE_KEY'),
      supabaseUrl: env('SUPABASE_URL'),
      supabasePublishableKey: env('SUPABASE_PUBLISHABLE_KEY'),
      metaPixelId: env('META_PIXEL_ID') || null,
      isTest,
    },
    { headers: corsHeaders(req) },
  );
}
```

**4.5b — `assets/js/main.js`: store the flag + filter both public reads.**

CURRENT (`initConfig`, 15–17):
```js
    META_PIXEL_ID = config.metaPixelId;
    window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    window._stripePublishableKey = STRIPE_PUBLISHABLE_KEY;
```
NEW:
```js
    META_PIXEL_ID = config.metaPixelId;
    window._isTest = config.isTest === true;   // 1.11 — prod=false, preview=true
    window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    window._stripePublishableKey = STRIPE_PUBLISHABLE_KEY;
```

CURRENT (`getProductBySlug`, 57):
```js
  const { data, error } = await supabase.from('products').select('*').eq('slug', slug).not('stripe_price_id', 'is', null).maybeSingle();
```
NEW (also scope to this deployment's world):
```js
  const { data, error } = await supabase.from('products').select('*').eq('slug', slug).eq('is_test', window._isTest === true).not('stripe_price_id', 'is', null).maybeSingle();
```

CURRENT (`getProducts`, 69):
```js
  let query = supabase.from('products').select('*').not('stripe_price_id', 'is', null);
```
NEW:
```js
  let query = supabase.from('products').select('*').eq('is_test', window._isTest === true).not('stripe_price_id', 'is', null);
```

> Safe because `isTest = VERCEL_ENV !== 'production'` is the deployment's own world — already what every
> server read uses. The browser only *learns* which world it's in (obvious from the URL); `is_test`
> stays server-set, never user-editable. The dev-preview publish test (Phase 11 #3) still renders
> (preview's `window._isTest` is `true`). RLS already hides drafts + archived, so these filters add
> **only** the `is_test` dimension.
>
> **Why no explicit `is_published`/`archived_at` filter here (vs. Phase 4.6's product-feed)?** `main.js`
> is the **browser anon client** — it can *only ever* be the anon/publishable key (the service key can't
> ship to the browser), so RLS permanently governs it; there's no "future refactor to service-role" risk
> the way there is for the server-side `product-feed.ts`. The existing `stripe_price_id IS NOT NULL`
> filter already hides drafts (a draft has no Stripe price until publish); RLS hides archived. So the
> explicit filter would be a redundant no-op here — deliberately omitted, not overlooked.

## Phase 4.6 — `api/product-feed.ts` (defense-in-depth on the public Meta catalog)

The Meta/Instagram feed is **anon/publishable**, so the new RLS already hides drafts + archived. This
adds an **explicit** `is_published`/`archived_at` filter anyway — the same treatment `checkout.ts` got
(Phase 4) — so the highest-consequence public surface never depends on the client-type assumption alone,
and survives a future refactor that adds an authorized branch here. One-line change to the query.

CURRENT (`api/product-feed.ts`, 19–22):
```ts
  const { data: products, error } = await supabase
    .from('products')
    .select('slug, title, description, price, available, thumbnail')
    .eq('is_test', false);
```
NEW (also require published + non-archived — `.is(col, null)` for the timestamp):
```ts
  const { data: products, error } = await supabase
    .from('products')
    .select('slug, title, description, price, available, thumbnail')
    .eq('is_test', false)
    .eq('is_published', true)
    .is('archived_at', null);
```

> No other change to `product-feed.ts`. The CSV builder, headers, and caching are untouched.

## Phase 4.7 — `api/webhook.ts` (reflect dashboard refunds)

`orders.status` enumerates `refunded`, and §1.10 says refunds are *guided* (Em issues them in the Stripe
dashboard). But the webhook only handles `checkout.session.completed` (everything else is a logged
no-op, current line 60), so a dashboard refund **never** flips the Supabase order — the `refunded`
status is unreachable and "order status" silently lies. Add a `charge.refunded` branch **before** the
no-op guard (no new function — `webhook.ts` is already deployed). It runs *after* the existing
idempotency claim (so a refund event is claimed + de-duped like any other), looks up the order(s) by the
charge's payment intent, and sets `status='refunded'` on a **full** refund (a partial refund is logged,
not status-changed — the enum has no partial state; flag a `partially_refunded` value for v1.1).

CURRENT (the no-op guard for non-checkout events, 60–63):
```ts
  if (event.type !== 'checkout.session.completed') {
    console.log(`Webhook event ${event.id} (${event.type}) recorded, no-op handler`);
    return new Response(JSON.stringify({ received: true }), { status: 200, headers });
  }
```
NEW (handle `charge.refunded` first, then keep the existing no-op for everything else):
```ts
  if (event.type === 'charge.refunded') {
    try {
      const charge = event.data.object as Stripe.Charge;
      const piId = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id ?? null;
      const fullyRefunded = charge.amount_refunded >= charge.amount;
      if (piId && fullyRefunded) {
        // `refunded` is terminal truth: this intentionally overwrites a prior 'shipped'/'delivered'
        // status (a refund after shipping is still a refund). The partial-shipping-queue index
        // (WHERE status='completed') drops the row, so a refunded order leaves the GPT's shipping
        // list cleanly. The admin order view reads `status` directly, so it reflects the flip.
        const { error: refundErr } = await supabase
          .from('orders')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent', piId);
        if (refundErr) {
          console.error(`Refund status update failed for ${event.id} (PI ${piId}):`, refundErr);
        } else {
          console.log(`Order(s) marked refunded (${event.id}): PI ${piId}`);
        }
      } else {
        console.log(`charge.refunded ${event.id}: partial or no PI (refunded ${charge.amount_refunded}/${charge.amount}) — no status change`);
      }
    } catch (err) {
      // Claim already inserted; never 5xx (would trigger a Stripe retry we'd then no-op).
      console.error(`Refund handler error after claim for ${event.id} (returning 200):`, err);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers });
  }

  if (event.type !== 'checkout.session.completed') {
    console.log(`Webhook event ${event.id} (${event.type}) recorded, no-op handler`);
    return new Response(JSON.stringify({ received: true }), { status: 200, headers });
  }
```

> **Stripe Dashboard / event wiring:** `charge.refunded` must be enabled on the webhook endpoint in the
> Stripe Dashboard (it isn't part of `checkout.session.*`). One-line operator add; note it in
> `STORE_ADMINISTRATION.md`. `Stripe.Charge` is already covered by the imported `Stripe` types — no new
> import. The match is by `stripe_payment_intent` (set on every order row at checkout, webhook.ts:161),
> which uniquely keys the order(s) in a Stripe mode, so no `is_test` filter is needed.
>
> **Owner-facing honesty:** only a **full** refund flips the status. A **partial**
> refund is logged, not reflected — so `STORE_ADMINISTRATION.md` + the GPT's orders guidance must say:
> "partial refunds aren't shown in order status yet — check Stripe for partial-refund history." (A
> `partially_refunded` status is a v1.1 item.)

## Phase 5 — `api/upload.ts` (URL-intake for the GPT + two new image roles + their crops)

This phase does three things: (1) add a JSON/URL intake path so the Custom GPT
can upload media (Actions send JSON, not multipart, and can't forward a pasted file → Em shares a
Drive/direct link and the server fetches it); (2) the two new image roles (`checkout_image`,
`seo_thumbnail`) + their crops; (3) quote the existing MP4 leg so the cold builder needn't open the file.

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

**Add the Drive/URL normalizer helper** (a Google Drive *share* link returns an HTML page, not the file
— rewrite the common share forms to the direct-download form; leave any other URL untouched).
CURRENT (the `sha1Hex` helper, 69–74 — anchor; the new function goes right after it):
```ts
async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```
NEW (append after `sha1Hex`):
```ts
// Google Drive "share" URLs (…/file/d/<id>/view, …/open?id=<id>, …/uc?id=<id>) serve an HTML page,
// not the bytes. Rewrite them to the direct-download form. Any non-Drive URL passes through unchanged.
// NOTE: very large Drive files (videos > ~25 MB) hit Google's virus-scan interstitial and return HTML,
// not the file — the content-type check in POST catches that and returns a friendly "share as a direct
// link" error. Em's typical product clips are small; flag a confirm-token follow-up for v1.1 if needed.
function normalizeMediaUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.hostname !== 'drive.google.com') return raw;
    const pathMatch = u.pathname.match(/\/file\/d\/([^/]+)/);
    const id = pathMatch?.[1] ?? u.searchParams.get('id');
    return id ? `https://drive.google.com/uc?export=download&id=${id}` : raw;
  } catch {
    return raw; // not a parseable URL — let the fetch fail with the friendly error
  }
}
```

**Add the JSON/URL intake path** so the GPT can upload by link. Resolve the input into a `File` from
EITHER a JSON body (`{url, slug, role, skip_transform}` — the GPT/agent path) OR the existing multipart
form (admin UI drag-drop, curl); both converge on the **same** `file`/`slug`/`role`/`skipTransformField`
locals, so the entire Cloudinary→R2 pipeline below is unchanged for every caller.
CURRENT (the multipart parse at the top of `POST`, 85–105):
```ts
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse(request, { error: 'Invalid multipart form' }, 400);
  }

  const file = formData.get('file');
  const slugField = formData.get('slug');
  const roleField = formData.get('role');
  const skipTransformField = formData.get('skip_transform');

  if (!(file instanceof File) || typeof slugField !== 'string' || typeof roleField !== 'string') {
    return jsonResponse(request, { error: 'Missing file, slug, or role' }, 400);
  }

  const slug = slugField.trim();
  const role = roleField.trim();
  if (!slug || !role) {
    return jsonResponse(request, { error: 'Missing file, slug, or role' }, 400);
  }
```
NEW:
```ts
  // dual intake. JSON {url,...} = the Custom GPT path (Actions are JSON-only and
  // can't forward a pasted file); multipart = admin UI / curl. Both yield a `File` for the pipeline.
  let file: File;
  let slug: string;
  let role: string;
  let skipTransformField: string | null = null;

  if ((request.headers.get('content-type') ?? '').includes('application/json')) {
    let body: { url?: unknown; slug?: unknown; role?: unknown; skip_transform?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return jsonResponse(request, { error: 'Invalid JSON body' }, 400);
    }
    if (typeof body.url !== 'string' || typeof body.slug !== 'string' || typeof body.role !== 'string') {
      return jsonResponse(request, { error: 'Missing url, slug, or role' }, 400);
    }
    // validate the role BEFORE fetching, so a bad role can't trigger a server-side
    // fetch of an arbitrary owner-supplied URL (the multipart path checks ROLE_PATTERN downstream too).
    if (!ROLE_PATTERN.test(body.role.trim())) {
      return jsonResponse(request, { error: 'Invalid role' }, 400);
    }
    let mediaRes: Response;
    try {
      mediaRes = await fetch(normalizeMediaUrl(body.url.trim()), { redirect: 'follow' });
    } catch {
      return jsonResponse(request, { error: 'Could not fetch that media link' }, 400);
    }
    if (!mediaRes.ok) {
      return jsonResponse(
        request,
        { error: `That link isn't directly downloadable (HTTP ${mediaRes.status}). Share it as "anyone with the link," or give me a direct file URL.` },
        400,
      );
    }
    const fetchedType = (mediaRes.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_MIME.has(fetchedType)) {
      return jsonResponse(
        request,
        { error: `That link didn't return an allowed image/video (got "${fetchedType || 'unknown'}") — it may be a share page, not the file itself. Share it as "anyone with the link," or send a direct file URL.` },
        400,
      );
    }
    const bytes = Buffer.from(await mediaRes.arrayBuffer());
    file = new File([bytes], `upload.${MIME_TO_EXT[fetchedType] ?? 'bin'}`, { type: fetchedType });
    slug = body.slug.trim();
    role = body.role.trim();
    skipTransformField = body.skip_transform === true || body.skip_transform === 'true' ? 'true' : null;
  } else {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonResponse(request, { error: 'Invalid multipart form' }, 400);
    }
    const fileField = formData.get('file');
    const slugField = formData.get('slug');
    const roleField = formData.get('role');
    const stf = formData.get('skip_transform');
    skipTransformField = typeof stf === 'string' ? stf : null;
    if (!(fileField instanceof File) || typeof slugField !== 'string' || typeof roleField !== 'string') {
      return jsonResponse(request, { error: 'Missing file, slug, or role' }, 400);
    }
    file = fileField;
    slug = slugField.trim();
    role = roleField.trim();
  }

  if (!slug || !role) {
    return jsonResponse(request, { error: 'Missing file, slug, or role' }, 400);
  }
```

> **Pipeline unchanged below.** Everything after this point still reads `file.type` / `file.size` /
> `await file.arrayBuffer()` and `skipTransformField`, so the role check, the `ALLOWED_MIME` re-check
> (a defensive double-check; the JSON path already validated the fetched type), the 10 MB image / 50 MB
> video size cap (now applied to the **fetched** bytes via `file.size`), the Cloudinary transform, and
> the R2 `PutObjectCommand` need **no edit**. A `File` built from a `Buffer` reports `.size ===
> bytes.length`, so the size cap protects the URL path too. `File` is a Node global on the Vercel
> runtime (`request.formData()` already returns `File` instances).

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

> **Video (MP4) is handled by the same code — anchored, not assumed.** The MP4 leg is
> the **existing** `upload.ts` logic (no new transform code); quoting the anchors so the cold builder
> needn't open the file:
> ```ts
> const ALLOWED_MIME = new Set([             // upload.ts 34–41
>   'image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm',
> ]);
> const isVideo = file.type.startsWith('video/');                       // 118
> const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;        // 119
> if (file.size > maxSize) { /* 400 "File too large" */ }              // 120–126
> const skipTransform = typeof skipTransformField === 'string' && skipTransformField === 'true'; // 128–129
> const isImageMime = file.type.startsWith('image/') && file.type !== 'image/gif';               // 130
> const shouldTransform = isImageMime && !skipTransform;               // 131
> // else-branch (199–203): non-image passes straight through —
> //   finalBuffer = Buffer.from(await file.arrayBuffer()); contentType = file.type;
> //   extension = MIME_TO_EXT[file.type] ?? 'bin';
> ```
> So an MP4 at role `video-0x` is never Cloudinary-transformed (`shouldTransform=false`) and streams
> as-is to R2, at a 50 MB cap, **whether it arrives by multipart or by the new URL path** (the dual
> intake above feeds the identical pipeline). Phase 5's only *new transform code* is the two image roles
> + their crops. (The GPT MEDIA instruction keeps `skip_transform=true` for video — a harmless no-op.)

## Phase 6 — `vercel.json` (clean routes for publish + coupon → `products.ts`, no new function)

CURRENT (the **whole** `rewrites` array, 7–15) — quoted in full to prove there is **no**
`/api/products/:x` param rewrite that Vercel's first-match would let shadow the new literals:
```json
  "rewrites": [
    { "source": "/product/:slug", "destination": "/product" },
    { "source": "/admin/:path*", "destination": "/admin" },
    { "source": "/api/checkout/reserve", "destination": "/api/checkout?_action=reserve" },
    { "source": "/api/session-status", "destination": "/api/checkout?_action=session-status" },
    { "source": "/api/orders/:id", "destination": "/api/orders?id=:id" },
    { "source": "/api/cart-activity", "destination": "/api/cart?_action=activity" },
    { "source": "/api/cart-recovery", "destination": "/api/cart?_action=recovery" }
  ]
```
NEW (append after the `/api/orders/:id` line — all distinct literals plus one `by-slug/:slug` route;
nothing is shadowed because no `/api/products/:x` rule precedes them):
```json
    { "source": "/api/orders/:id", "destination": "/api/orders?id=:id" },
    { "source": "/api/products/publish", "destination": "/api/products?_action=publish" },
    { "source": "/api/products/archive", "destination": "/api/products?_action=archive" },
    { "source": "/api/products/unarchive", "destination": "/api/products?_action=unarchive" },
    { "source": "/api/products/discard", "destination": "/api/products?_action=discard" },
    { "source": "/api/products/by-slug/:slug", "destination": "/api/products?slug=:slug" },
    { "source": "/api/coupons", "destination": "/api/products?_action=coupon" },
    { "source": "/api/coupons/deactivate", "destination": "/api/products?_action=coupon_deactivate" },
```

> URL rewrites to the existing `products.ts` function — function count stays 11/12. `/api/coupons`
> serves **POST** (create) and **GET** (list) via the same rewrite; deactivate is its own route. The
> GET preview needs no rewrite (`/api/products?slug=…&preview=…`); `listProducts` is plain GET
> `/api/products`; `getProduct` is the `/api/products/by-slug/{slug}` rewrite → the existing `?slug=`.

## Phase 7 — `assets/js/product.js` (preview mode + Publish bar)

CURRENT (7–39) — verbatim (every function the NEW handler calls already exists; the only
additions are `fetchPreviewProduct`, `populateMedia`, `mountPreviewBanner`, defined below):
```js
document.addEventListener('DOMContentLoaded', async () => {
  const slug = (() => {
    const path = window.location.pathname.match(/^\/product\/([^/]+)\/?$/);
    if (path) return path[1];
    return new URLSearchParams(window.location.search).get('slug');
  })();
  if (!slug) {
    revealNotFound();
    return;
  }

  await waitForSupabase();

  const product = await getProductBySlug(slug);
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
});
```
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
  if (!previewToken) fireViewItem(product); // no view_item/ViewContent on an owner preview load
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
      label.textContent = 'Could not publish — try again, or open your admin panel and tap “Publish now” there. If it still fails, text Sean.';
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

**7.2 — `product.html`: the media container (functionality owns it, not the design slice).**
`populateMedia` no-ops without a `[data-product-media]` target, so the container swap lives **here** in
Phase 7 (not Part 3) — otherwise a functionality-only ship stores `media` but renders nothing and Phase
11 #9 can't pass. Replace the **static** `.product-gallery__media` block (placeholder video + GIF +
Rickroll iframe) with an empty, hidden, data-bound container (this also drops the GIF + the placeholder
embed). CURRENT (`product.html:235–258`, **verbatim** — so the swap is locate-and-replace,
not locate-and-judge):
```html
            <!-- Media examples (video, GIF, YouTube). Static for v1.4.5 — Track A hasn't shipped media-row fields yet. -->
            <div class="product-gallery__media" style="margin-top: var(--space-lg); display: grid; gap: var(--space-md); grid-template-columns: 1fr;">

              <video controls preload="metadata"
                     poster="https://cdn.everlastingsbyemaline.com/test/placeholder-haven-i/hero-placeholder-haven-i.webp"
                     style="width: 100%; aspect-ratio: 16/9; background: var(--color-ink); border-radius: var(--radius-md);">
                <source src="https://cdn.everlastingsbyemaline.com/test/placeholder-haven-i/test_video-01-placeholder-haven-i.mp4" type="video/mp4">
                Your browser does not support the video tag.
              </video>

              <img src="https://cdn.everlastingsbyemaline.com/test/placeholder-haven-i/test_gif-01-placeholder-haven-i.gif"
                   alt="Placeholder Haven I — animated detail"
                   loading="lazy"
                   onerror="this.onerror=null;this.style.display='none'"
                   style="width: 100%; aspect-ratio: 4/5; object-fit: cover; border-radius: var(--radius-md);">

              <!-- YouTube embed example (privacy-enhanced; placeholder ID for now) -->
              <iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
                      title="Behind the work"
                      loading="lazy"
                      allowfullscreen
                      style="width: 100%; aspect-ratio: 16/9; border: 0; border-radius: var(--radius-md);"></iframe>

            </div>
```
NEW (empty, hidden, data-bound container):
```html
<!-- v1.5: optional media (MP4 / YouTube) — product.js populateMedia fills it; hidden when none. -->
<div class="product-gallery__media hidden" data-product-media></div>
```
The media **CSS** (intrinsic-ratio video, 16/9 embed) + its placement in the reflow stay in Part 3 §3.3
(design); the container above + `populateMedia` ship and are tested together (Phase 11 #9). The `hidden`
class keeps it invisible until `populateMedia` finds items.

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
      .pill.archived { background: #e0e0e0; color: #555; }
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

**8.7 — `assets/js/admin.js`: on save, show the preview + Publish panel.** (the anchor
is widened to line 454 so it's explicit that `body` is the **parsed API response**
`{ success, product, preview_url, preview_token }`, which is what `renderPublishPanel` reads — not the
request payload.)

CURRENT (454–462):
```js
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 409) {
        throw new Error('A product with that slug already exists. Pick a different title.');
      }
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    setStatus('editor-status', editing ? 'Saved.' : 'Created.', 'success');
    await loadProducts();
```
NEW (only the status text + the two added lines change; `body` is the parsed response from line 454):
```js
    const body = await res.json().catch(() => ({}));   // body = { success, product, preview_url, preview_token }
    if (!res.ok) {
      if (res.status === 409) {
        throw new Error('A product with that slug already exists. Pick a different title.');
      }
      throw new Error(body.error || `HTTP ${res.status}`);
    }
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
NEW (archived takes precedence — 1.12):
```js
    const priceLabel = typeof p.price === 'number' ? `$${centsToDollars(p.price)}` : '—';
    const availPill = p.available ? '<span class="pill">available</span>' : '<span class="pill unsent">sold</span>';
    const statusPill = p.archived_at
      ? '<span class="pill archived">archived</span>'
      : p.is_published
        ? (p.draft ? '<span class="pill edits">live · edits pending</span>' : '<span class="pill shipped">live</span>')
        : '<span class="pill draft">draft</span>';
    card.innerHTML = `
      <img src="${escapeHtml(thumb)}" alt="${escapeHtml(p.thumbnail_alt || p.title || '')}" />
      <p class="pc-title">${escapeHtml(p.title || '(untitled)')}</p>
      <p class="pc-meta">${priceLabel} · qty ${p.quantity ?? '—'} ${statusPill} ${availPill}</p>
    `;
```

**8.9 — `assets/js/admin.js`: add the panel + publish + discard calls.** Append near
`onSaveProduct` (module scope):
```js
function renderPublishPanel(body, id) {
  const panel = $('publish-panel');
  if (!panel) return;
  const previewUrl = body.preview_url;
  // There's only something to publish when a draft exists (a new product, or staged edits) — both
  // return a preview_url. A price-only change goes live immediately and stages nothing.
  const publishable = !!previewUrl;
  panel.classList.remove('hidden');
  panel.innerHTML = '';
  const p = document.createElement('p');
  p.style.margin = '0 0 8px';
  if (previewUrl) {
    p.innerHTML =
      'Preview how it looks: <a href="' + previewUrl + '" target="_blank" rel="noopener">open preview</a> — then publish when it looks right.';
  } else if (body.price_updated || body.availability_updated) {
    // Price- or availability-only change: live now, nothing staged → say so, NO Publish button
    //. `available` goes live immediately like price.
    const bits = [];
    if (body.price_updated) bits.push('Price change');
    if (body.availability_updated) bits.push('Availability change');
    p.textContent = bits.join(' and ') + ' is live now — nothing else to publish.';
  } else {
    p.textContent = 'Saved.';
  }
  panel.appendChild(p);
  // When a price change rides ALONGSIDE staged copy edits, add the "price already live" detail
  // (the copy still needs publishing). For a price-ONLY change the line above already covers it.
  if (body.price_updated && previewUrl) {
    const note = document.createElement('p');
    note.style.margin = '0 0 8px';
    note.textContent = 'Price change is live now (price updates immediately; it isn’t part of the draft preview).';
    panel.appendChild(note);
  }
  // Publish button only when there's a draft to publish — never for a price-only (already-live) change.
  if (publishable) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'primary';
    btn.textContent = 'Publish now';
    btn.addEventListener('click', () => publishProduct(id, btn));
    panel.appendChild(btn);
  }
  // When edits are STAGED on a published product, offer to discard them (the inverse of publish).
  // Not shown for a brand-new draft (no staged overlay) or a price-only change (nothing staged).
  if (body.staged) {
    const discardBtn = document.createElement('button');
    discardBtn.type = 'button';
    discardBtn.className = 'danger';
    discardBtn.style.marginLeft = '8px';
    discardBtn.textContent = 'Discard pending edits';
    discardBtn.addEventListener('click', () => discardEdits(id, discardBtn));
    panel.appendChild(discardBtn);
  }
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

// Scrap a published product's staged draft without publishing. Live page is untouched.
async function discardEdits(id, btn) {
  if (!id) return;
  if (!window.confirm('Discard the pending edits? The live page stays exactly as it is now.')) return;
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Discarding…';
  try {
    const res = await fetch('/api/products/discard', {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    setStatus('editor-status', 'Pending edits discarded — the live page is unchanged.', 'success');
    $('publish-panel').classList.add('hidden');
    await loadProducts();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = original;
    setStatus('editor-status', err.message, 'error');
  }
}
```

> Admin auth is the Supabase JWT (`authHeader()`), so publish-by-`id` (and discard-by-`id`) is
> authorized through the admin/GPT path — no token needed in the panel. The discard button appears
> **only when edits are staged** (`body.staged`) — a price change (live immediately) or a brand-new
> draft (use Archive to drop it) never shows it.

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

**8.11 — `assets/js/admin.js`: archive / resurface (replaces the hard delete — 1.12).**
The current admin "Delete" is a hard client-side row delete; v1.5 makes it a reversible **archive** +
**resurface** via the new API routes — one safe path, no way to lose order history. The button keeps its
id (`delete-product`); only its handler + label change (the static "Delete" is overwritten by
`openEditor`, which only shows the button while editing).

CURRENT (the click wiring, ~151):
```js
  $('delete-product').addEventListener('click', onDeleteProduct);
```
NEW:
```js
  $('delete-product').addEventListener('click', onArchiveToggle);
```

CURRENT (`openEditor` shows/hides the button, ~301):
```js
  $('delete-product').classList.toggle('hidden', !product);
```
NEW (also flip the label — archived rows resurface, others archive):
```js
  const archiveBtn = $('delete-product');
  archiveBtn.classList.toggle('hidden', !product);
  archiveBtn.textContent = product?.archived_at ? 'Resurface' : 'Archive';
```

CURRENT (`onDeleteProduct`, 470–487) — replace the whole function:
```js
async function onDeleteProduct() {
  const editing = state.editing;
  if (!editing) return;
  const confirmed = window.confirm(`Delete "${editing.title}"? This cannot be undone.`);
  if (!confirmed) return;
  setStatus('editor-status', '', 'info');
  try {
    // Delete via Supabase JS — RLS allows authenticated users to delete.
    // /api/products has no DELETE handler; using the client respects the same
    // auth boundary because the user JWT is what authenticates.
    const { error } = await state.client.from('products').delete().eq('id', editing.id);
    if (error) throw new Error(error.message);
    setStatus('editor-status', 'Deleted.', 'success');
    await loadProducts();
  } catch (err) {
    setStatus('editor-status', `Delete failed: ${err.message}`, 'error');
  }
}
```
NEW (archive / unarchive via the API — never a hard delete):
```js
async function onArchiveToggle() {
  const editing = state.editing;
  if (!editing) return;
  const archiving = !editing.archived_at;
  const verb = archiving ? 'Archive' : 'Resurface';
  const note = archiving
    ? 'It leaves the shop but stays here — you can resurface it anytime.'
    : 'It goes back into the shop.';
  if (!window.confirm(`${verb} "${editing.title}"? ${note}`)) return;
  setStatus('editor-status', '', 'info');
  try {
    const res = await fetch(`/api/products/${archiving ? 'archive' : 'unarchive'}`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing.id }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    setStatus('editor-status', archiving ? 'Archived.' : 'Resurfaced.', 'success');
    await loadProducts();
  } catch (err) {
    setStatus('editor-status', `${verb} failed: ${err.message}`, 'error');
  }
}
```

> Uses `authHeader()` (same as the publish call, 8.9) — the admin JWT authorizes the archive routes.
> Archived products still show in the admin list (with the "archived" pill, 8.8) so she can find +
> resurface them; an optional "hide archived" filter is a later nicety, not required for v1.5.
>
> **Mark-sold vs. archive.** **Archive** is the instant takedown. Un-checking
> **Available** in the editor and clicking **Save draft** instead *stages* a draft on a published
> product (the change previews but isn't live until Publish) — same draft semantics as any copy edit, so
> it's expected, just not instant. A real purchase still flips the live `available` to sold on its own.
> (The same note goes in `STORE_ADMINISTRATION.md`, Phase 10b.)

## Phase 9 — GPT docs (author only; Sean configures the GPT later)

This phase also **repairs mixed truth**: the current GPT docs say the GPT *can't edit*, *never sets
SEO*, and that *create auto-syncs Stripe* — all false under v1.5. Fix in place (no contradictions
left beside the new text).

> **Doc-phase note.** Phases 9 / 10 / 10b edit **documentation** (`GPT_SETUP.md`,
> `product-reference.md`, `EVERLASTINGS_STORE.md`, `STORE_ADMINISTRATION.md`), **not code** — they use
> line hints + prose, so they are **interpret-with-care, not byte-anchored** like the code phases
> (Phases 1–8). B/fidelity should treat a CURRENT line-ref here as a locator to confirm, not a hard byte
> match. The one structured, error-prone block — the `createProduct` request schema — is quoted verbatim
> below so it stays locate-and-replace.

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

**CURRENT** `createProduct` block (`GPT_SETUP.md:167–213`, **verbatim** — the one structured edit quoted
per G10):
```yaml
  /api/products:
    post:
      operationId: createProduct
      summary: Create a new product. Pass sync=true to receive Stripe product/price IDs inline.
      parameters:
        - in: query
          name: sync
          schema: { type: string }
          description: Set to "true" to run Stripe sync inline and include stripe_sync in the response.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [title, headline, story_card, description, price, product_type, slug, images, thumbnail]
              properties:
                title: { type: string }
                slug: { type: string }
                headline: { type: string }
                story_card: { type: string }
                description: { type: string }
                features: { type: array, items: { type: string } }
                price: { type: integer, description: Price in cents. }
                dimensions: { type: string }
                weight: { type: string }
                materials: { type: array, items: { type: string } }
                power_supply: { type: string }
                care_instructions: { type: array, items: { type: string } }
                shipping_details: { type: array, items: { type: string } }
                product_type: { type: string, enum: [miniature, printable, storybook] }
                series: { type: string }
                available: { type: boolean }
                quantity: { type: integer }
                featured: { type: boolean }
                artist_note: { type: string }
                images:
                  type: array
                  items:
                    type: object
                    required: [url]
                    properties:
                      url: { type: string }
                      alt: { type: string }
                thumbnail: { type: string }
                seo_title: { type: string }
                seo_description: { type: string }
```
In that block, drop the `sync=true` `summary` language + the whole `sync` query `parameters` entry —
create now makes a **draft** (the checkout / SEO / `media` fields are added to its `properties` per the
note after the new paths below). Then after the `/api/products` `post` block, add a `get`
(listProducts), a `put` (editProduct), and the two new paths:

```yaml
    get:
      operationId: listProducts
      summary: List all products with their status (live, draft, live-with-edits-pending, or archived). Use this to find a product (and its id) before editing, and to tell Em what is live vs still a draft vs archived. Read is_published + draft + archived_at to report status.
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
      summary: Stage edits to a product. On a published product, copy/SEO changes go to a draft for preview (publishing applies them); a PRICE change rotates the Stripe price and goes live immediately (same product, same URL). The checkout_* identity fields cannot change on a published product. For a temporary discount, create a coupon instead.
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
                price: { type: integer, description: "Price in CENTS — editable anytime. On a published product a change ROTATES the Stripe price and goes live immediately (same product/URL); no need to publish a price change." }
                checkout_name: { type: string, description: "Editable only before first publish (frozen after)." }
                checkout_description: { type: string, description: "Editable only before first publish (frozen after)." }
                checkout_image: { type: string, description: "Editable only before first publish (frozen after)." }
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
  /api/products/archive:
    post:
      operationId: archiveProduct
      summary: Remove a product from the store (reversible). Hides it from the shop + feed and archives it in Stripe; it stays findable and can be resurfaced. Use this to take a piece down — there is no hard delete.
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
        '200': { description: Archived. }
  /api/products/unarchive:
    post:
      operationId: unarchiveProduct
      summary: Bring an archived product back into the store (reverses archiveProduct).
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
        '200': { description: Resurfaced. }
  /api/products/discard:
    post:
      operationId: discardEdits
      summary: Scrap a published product's pending (staged) edits without publishing them — the inverse of publish. The live page is left exactly as it is. Use when she changes her mind about edits she previewed. Only for a published product with edits pending; to drop a brand-new draft, archive it.
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
        '200': { description: Pending edits discarded; the live product is unchanged. }
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
                product_ids: { type: array, items: { type: string }, description: "Stripe product IDs (the stripe_product_id field from listProducts — NOT the Supabase id) to limit the discount to. Omit for store-wide." }
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
      summary: Get ONE product (live or draft) by its slug, with full current values — use this when she names a specific piece, instead of listing everything. When the row has pending preview state it also returns a ready-to-share preview_url (origin-correct).
      parameters:
        - in: path
          name: slug
          required: true
          schema: { type: string }
      responses:
        '200': { description: "The product (full row, incl. is_published + any staged draft), plus preview_url when a preview_token exists (relay this link; do not build a URL by hand)." }
  /api/upload:
    post:
      operationId: uploadImage
      summary: "Put a photo or video onto the store's CDN and get back its URL — call this for every image/video BEFORE createProduct/editProduct, then put the returned url into images[]/thumbnail/checkout_image/seo_thumbnail/media[]. Em sends media as a LINK (a Google Drive 'anyone with the link' share, or any direct file URL) and the server fetches it. If she pastes a photo straight into the chat, you can't forward the file — ask her for a shareable link instead."
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [url, slug, role]
              properties:
                url: { type: string, description: "A link to the image/video — a Google Drive share link ('anyone with the link') or a direct file URL. The server downloads it." }
                slug: { type: string, description: "The product's slug (lowercase-hyphenated title). Names the file on the CDN." }
                role: { type: string, description: "What this media is: hero, thumbnail, gallery-01..15, detail-01..05, video-01..05, checkout_image (Stripe 1:1), or seo_thumbnail (1.91:1 OG card)." }
                skip_transform: { type: boolean, description: "true for videos and GIFs (uploaded as-is, no crop). Leave off / false for photos so they're cropped + web-optimized." }
      responses:
        '200': { description: "Uploaded; returns { url, filename }. Use url verbatim in the product fields." }
        '400': { description: "The link wasn't directly downloadable (often a Drive share PAGE rather than the file, or not shared as 'anyone with the link'), or the type/size wasn't allowed — relay the message and ask Em for a direct/shared link." }
```

Also add `checkout_name`, `checkout_description`, `checkout_image`, `seo_thumbnail`, and the **`media`
array** (same shape as in `editProduct` above) to the `createProduct` request schema (so the GPT
drafts them too). The `uploadImage` `role` description above already includes `checkout_image` +
`seo_thumbnail`.

> `getProduct` is `GET /api/products/by-slug/{slug}` — a `vercel.json` rewrite to the existing
> authorized `GET /api/products?slug=` (which already returns the row **live or draft**). No new
> function or handler; it maps to the GET that's already there. `listProducts` (GET `/api/products`)
> returns the full list for browsing.

> **Orders are already wired.** `listOrders` + `markShipped` shipped in v1.4.9 — they're
> already in this schema (`/api/orders` + `/api/orders/{id}`) and the Instructions (with confirm-first).
> v1.5 adds nothing on the order side; leave those blocks as-is.

> **Archive is the only "remove".** `archiveProduct` / `unarchiveProduct` — no hard-delete
> Action exists (a Stripe product with a price can't be deleted; archive is Stripe's own model).
> **Re-pricing is NOT a remove:** `editProduct {price}` rotates the Stripe price in place on the
> same product (same slug/URL) — no new product, no archive.

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

== CONFIRMING VS. EXPEDITING ==
By default, confirm the drafted fields with her before saving (read back the key ones in plain language). If she's said "just go ahead" / "you don't need to check with me" — for this piece or in general — EXPEDITE: skip the line-by-line confirmation and go straight to the preview. The preview page is the real review either way.

== EDITING A PRODUCT ==
1. Find it: when she names a specific piece, getProduct by its slug (returns it live or draft); to browse, listProducts (shows which are live vs draft). Either way you get the product + its id. A row may carry a `draft` object — those are edits previewed but NOT yet live; the top-level fields are what shoppers see right now, so never report `draft` values as the live copy.
2. Call editProduct with the id and only the fields she's changing. On a published product, copy/SEO changes are STAGED as a draft (the live page is untouched until publish); a PRICE change is different — it rotates the Stripe price and goes live IMMEDIATELY (same product, same URL — no publish step needed). The checkout_* identity fields (checkout_name / checkout_description / checkout_image) are frozen once published; PRICE is not.
3. Always hand back the preview link the same way as step 6 above. Never tell her an edit is live until it's published. If she changes her mind about staged edits, call discardEdits with the id — it scraps the pending draft and leaves the live page exactly as it was (the inverse of publish). (A price change isn't staged, so discardEdits won't undo it — to revert a price, set it back with editProduct.)
4. PHOTOS: to ADD a photo, first get it onto the CDN with uploadImage (see "ADDING PHOTOS & MEDIA" below) to get its url, then put that url in the FULL `images` array; to remove / reorder, just adjust the array. Either way getProduct first, send the COMPLETE desired `images` array (and `thumbnail` if needed) via editProduct — there's no per-photo command. (A removed photo's file lingers on the CDN; harmless.)

== REMOVING / RE-PRICING A PIECE ==
To take a piece down, call archiveProduct (it leaves the shop but stays findable — reversible with unarchiveProduct). There is NO delete. Prefer archiveProduct for "take it down / remove / hide it" — it is IMMEDIATE. Marking a published piece sold/unavailable via editProduct {available:false} is ALSO immediate now — like price, it goes live the moment you save (no preview, no publish step), so just tell her "done, it's marked sold" (it shows as sold but stays on the page). Use that for "mark it sold / out of stock"; use archiveProduct when she wants it GONE from the shop entirely. (A real purchase still flips a piece to sold automatically.) To change a published price: just call editProduct with the new price — it rotates the Stripe price and goes live immediately on the SAME product (same page, same URL, same link she's already shared); there's no new product and no publish step. For a TEMPORARY discount rather than a permanent re-price, create a coupon instead (it leaves the list price intact).

== PREVIEW & PUBLISHING ==
The preview link is the real review surface — she can't picture changes from chat. If she says "publish" (or "make it live"), call publishProduct with the id. For a brand-new product, publishing is what creates the Stripe listing and makes it purchasable. After publish, the old preview link stops working (that's expected).
To RE-SHOW a preview she lost: getProduct by slug. If there are pending edits (or it's still a draft) it returns a ready-to-share `preview_url` — hand her THAT exact link; it's already correct for wherever the store is running, so never hand-build the URL or assume the production domain. If getProduct returns no `preview_url`/`preview_token`, it's fully live with nothing pending — give the plain product page link from the create/publish response. (Don't make a no-op edit to "regenerate" a link — that would stage an empty draft.)

== COUPONS ==
Translate her wish into createCoupon params: "20% off everything until New Year's" → type=percent, value=20, expires_at=<unix>. Dollars→cents for amount and min_amount ($5 off → type=amount, value=500). Optional: a code she wants (else Stripe makes one), product scope (Stripe product IDs from listProducts), minimum order amount, redemption cap. A PRODUCT-SCOPED coupon only works on a PUBLISHED product — a draft has no Stripe product id yet (its stripe_product_id is empty in listProducts), so "20% off the Lavender Wreath" while it's still a draft can't be scoped; publish it first, or make the coupon store-wide. NEVER promise buy-one-get-one / "buy N" — Stripe can't do it natively. Read the final code back to her. To show her running sales, call listCoupons — it tells you each code's discount, redemptions, expiry, AND whether it's store-wide or limited to specific pieces (store_wide / product_ids), so relay the scope too ("HOLIDAY20 — 20% off everything" vs "just the Lavender Wreath"). To END a sale on the spot, call deactivateCoupon with the code — it stops immediately (she can still set expires_at at creation if she wants it to auto-end).

== ADDING PHOTOS & MEDIA (by link) ==
You can't receive a file she pastes straight into the chat — a GPT Action only sends text. So media comes in as a LINK: a Google Drive "anyone with the link" share, or any direct file URL. For EACH photo or video, call uploadImage({ url: <her link>, slug: <product slug>, role: <hero | gallery-01..15 | thumbnail | detail-01..05 | video-01..05 | checkout_image | seo_thumbnail> }); it returns a CDN { url }. Put that url into the product fields (images[], thumbnail, checkout_image, seo_thumbnail, or media[]) — never invent or reuse a URL. For photos leave skip_transform off (they get cropped + optimized); for videos and GIFs pass skip_transform=true.
REQUIRED PHOTO SET (the create API enforces this — a wrong mix gets a 400, not just "too few"): every product needs at least ONE photo at role `hero`, at least FIVE at roles `gallery-01..05`, AND a `thumbnail` (you can reuse the hero image's URL for the thumbnail). That's the 7-photo minimum. `detail-01..05`, `video-0x`, `checkout_image`, and `seo_thumbnail` are all EXTRAS on top — they don't count toward the 5 gallery. So if she gives you 7 images, assign them as 1 hero + 5 gallery + 1 thumbnail; don't spend them on `detail`/`video` roles and come up short on gallery. If she truly can't supply 5 gallery angles, tell her plainly the store needs them (ask for more angles) rather than retrying — the create won't go through without them.
LARGE VIDEOS: a Google Drive link often won't work for a video bigger than ~25 MB (Drive shows a scan page instead of the file, and there's no Drive link form that bypasses it) — if uploadImage 400s on a big video, ask her for a direct hosted URL (e.g. a Dropbox "?dl=1" direct link or any CDN link), not a Drive share.
- If she pastes a photo directly into the chat: say you can't grab a pasted file, and ask her to share it as a Google Drive "anyone with the link" link (or any direct image URL) so you can add it.
- If uploadImage returns a 400 ("not directly downloadable" / "looks like a share page"): the link is a Drive PREVIEW page, not the file, or it isn't shared publicly — ask her to set the share to "anyone with the link," or to paste a direct file URL, then retry.

== MEDIA (optional video on the page) ==
Most product videos are short MP4 clips. The flow: (1) upload the MP4 with uploadImage({url, slug, role: video-01..05, skip_transform:true}) — share-link in, CDN url out, just like a photo; (2) ALWAYS ask her how this particular clip should behave — it's case-by-case, never assume:
- "Should it play on its own and loop silently, with no buttons (like a GIF)?" → { "type":"video", "url":"<cdn mp4>", "autoplay":true, "loop":true }
- "Or show a play button she presses (with sound)?" → { "type":"video", "url":"<cdn mp4>" }  (that's the default: play button, sound on, no autoplay). She can also give a still image to show before it plays → add "poster":"<url>".
Set these per clip. Multiple MP4s are fine (they render in the order given). Leave media empty/omitted for no video — the section just hides. We don't use GIFs (an MP4 looks better and is smaller; convert a GIF with ffmpeg if she has one).
YouTube is supported but RARE — only if she specifically has a YouTube link (she isn't building that kind of channel): { "type":"youtube", "url":"<link>" }. MP4s always render before any YouTube.

Product rules: never create without showing the preview; never set a price different from what she said; never proceed without the required photo set (≥1 hero + ≥5 gallery + a thumbnail = 7 minimum; detail/video/checkout_image/seo_thumbnail are extras — see ADDING PHOTOS); media comes in as a LINK (Drive "anyone with the link" or a direct URL) — you can't take a file pasted into the chat, so ask for a link, and always run it through uploadImage to get the real CDN url (never invent one); price is editable anytime — on a published product a price change rotates in place and goes live immediately (same product/URL), so there's no "new product" dance; the checkout_* identity fields freeze at first publish; for a TEMPORARY sale create a coupon (leaves the list price intact); staged edits can be scrapped with discardEdits; to take a piece down, archiveProduct (never delete); on 409 (slug or coupon code taken) suggest a new title/code; on 400 tell her exactly which field is missing in plain language; on 401 stop and say "the connection key needs Sean's attention."
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

Also update the status note (16): drop the stale **`see archive/v1_5/v1_5_0_IMPLEMENT.md`** pointer
(that file is superseded) and the "coming in v1.5.0" framing — edit / draft / publish / coupons /
archive are specified here (this v1.5.5 plan); keep "the GPT only ever sees the environment its
Action points at." And fix the two **GIF** references (1C line 75 + instruction line 103,
"skip_transform=true for videos and GIFs") → just **videos** — GIFs are retired (3.3); MP4 is the path.

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
- **Checkout (Stripe — identity set once, frozen after publish)** — `checkout_name`,
  `checkout_description` (one short line shown at checkout / on the receipt), `checkout_image` (square).
  Each **defaults to** the page `title` / `description` / `thumbnail` if you leave it blank, so only
  fill them when the checkout copy should differ. After a product is published these can't change —
  **but `price` can**: editing the price rotates the Stripe price in place (same product/URL),
  effective immediately.

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
shoppers will see it"), better than reading fields back. Never create without the required photo set
(at least 1 hero + 5 gallery + a thumbnail = 7 minimum; detail/video are extras), and
never set a price different from what she told you. You **can edit** a product now (copy, photos,
SEO) — edits stage as a draft she previews, then publishes. The only frozen things after publish are
the **checkout identity** fields (name / description / image); **price you can change anytime** — it
rotates in place on the same product/URL, effective immediately; for a temporary sale, make a
coupon.
```

**9.4 — `assets/docs/gpt/product-reference.md`: append a "Draft → Preview → Publish" + "Coupons"
section** (Knowledge the GPT reads):
- *Draft → Preview → Publish* — create/edit make a draft + a private preview link; publishing makes
  it live and, for a new product, creates the Stripe listing; the preview link rotates on publish.
- *Coupons* — percent or amount off; optional code, product scope, minimum order, expiry, redemption
  cap; no buy-N/BOGO; **list active sales and deactivate one anytime** (owner sales only — the store's
  automatic cart-recovery / newsletter codes are hidden from these).
- *Media* — optional short MP4 clip(s) on the page via the `media` array; **ask her per clip** whether
  it should autoplay + loop silently (GIF-like, no buttons) or show a play button (default,
  click-to-play with sound); YouTube is a rare fallback; MP4s render first; hides when empty; no GIFs.
- *Archive / resurface* — "removing" a piece **archives** it (leaves the shop, stays findable,
  reversible) — there is no delete. A row may also carry a `draft` (edits previewed, not yet live); the
  top-level fields are the live copy shoppers see now.

**9.5 — `assets/docs/GPT_SETUP.md` Part 4 (agentic/curl protocol) — reflect v1.5 (mixed-truth repair).**
Part 4 still describes the old auto-sync-on-create world; three fixes:
- **Step 3 "Create product" (376–404)** — drop `?sync=true` from the create call **and** the "always use
  `?sync=true` on previews" / "the Supabase DB webhook still fires" note (~404). Create now makes a
  **draft** (no Stripe); the response carries `preview_url`; add a separate
  `POST /api/products/publish {id}` step (publish creates Stripe + goes live).
- **"Editing / marking sold (PUT)" (406–417)** — PUT stages a **draft** for copy/SEO (returns
  `preview_url`); publish applies it. **Price can change anytime** — on a published product a price
  change rotates the Stripe price in place (same product/URL) and goes live immediately, no new product
  and no publish step; only the `checkout_*` identity fields are frozen after publish. Marking sold
  still works via PUT `{available:false, quantity:0}` on a published product (a draftable field →
  stages, then publish).
- **API quick-reference table (425–432)** — add `publishProduct` (POST `/api/products/publish`),
  `listProducts` (GET `/api/products`), `getProduct` (GET `/api/products/by-slug/{slug}`),
  `createCoupon`/`listCoupons` (POST/GET `/api/coupons`), `deactivateCoupon`
  (POST `/api/coupons/deactivate`), and `archiveProduct`/`unarchiveProduct`
  (POST `/api/products/archive` · `/api/products/unarchive`).

## Phase 10 — `assets/docs/EVERLASTINGS_STORE.md` (reflect the new architecture)

**Additive** — products schema table: add `checkout_name`, `checkout_description`, `checkout_image`,
`seo_thumbnail`, `is_published`, `published_at`, `draft (jsonb)`, `preview_token`, **`archived_at`**;
add a **"Draft → Preview → Publish"** subsection (the model, the preview-token capability,
Stripe-at-publish, frozen checkout fields, the `is_published` + `archived_at` RLS gate, the INSERT
trigger now skips drafts) and an **"Archive"** note (remove = `archived_at` + Stripe `active:false`,
reversible, no hard delete; the deferred `pg_cron` purge); note the new `?_action=` routes (publish /
coupon / coupon_deactivate / archive / unarchive) + the `vercel.json` rewrites; note `media` jsonb now
renders on the page (`populateMedia`); note the GPT gained edit / publish / coupon (create+list+
deactivate) / archive / media actions; note `/api/config` now returns `isTest` + `main.js` filters
`is_test` (1.11).

**REWRITE, do not append (these sections now state the OPPOSITE of v1.5; leaving them is
mixed truth).** The sync model **inverts**: INSERT no longer creates Stripe (drafts skip it; Stripe is
created **only at publish**). The PUT price-rotation is **kept** but **relocated** into the
published-edit branch — a published price change rotates the Stripe Price in place. Rewrite each to
the publish-time-sync model:
- Glossary **"Supabase DB webhook"** (59–60) — clarify it's a **SQL trigger** (`notify_stripe_sync`,
  migration `…0003`), *not* a Studio setting, and it now **skips drafts** (fires only for published,
  non-test inserts). This is the line that first misled the cold review.
- Stripe-sync **ASCII diagrams** (105–107, 138–144) + the **Product-Creation data-flow** (605–624) —
  INSERT → draft (no Stripe); Stripe is created at the publish action.
- **AR #8** (175) and **AR #35** (342–343) — drop "INSERT → webhook → Stripe → LIVE" + the
  `?sync=true`-on-create story; create makes a draft, publish syncs.
- **Stripe Sync Rules** (356–367) — "on INSERT → create Stripe" → "on **publish** → create Stripe"; the
  PUT price-rotation rule **stays** but is described as the published-edit behaviour: a price change
  rotates the Stripe Price in place on the same product; only the `checkout_*` identity fields are
  frozen post-publish.
- **Pitfall #6 "adding a product makes it live immediately"** (739) → it creates a **draft** (live at
  publish). **Pitfall #7** (752–755, the `?sync=true` rationale) → create no longer syncs.
- "Stripe catalog auto-syncs when products are added (via database webhook)" (388) → at publish.
- The `media` column shape → `{ type, url, alt, loop, autoplay, controls, poster }` (drop the GIF ref).

## Phase 10b — `assets/docs/STORE_ADMINISTRATION.md` (Em's plain how-to)

The client-facing how-to (135 lines) still describes the pre-v1.5 world (no draft/preview/publish, no
chat editing, no coupons-by-chat, a hard "delete"). For a version whose whole thesis is "she runs it by
chat," her reference must match. Refresh it in plain, non-technical language: **create → preview →
publish** (she taps Publish on the preview page, or tells the GPT "publish"); **editing by chat** (edits
stage as a draft she previews, then publishes — the live page is untouched until then; she can also
**discard** edits she previewed but doesn't want, leaving the live page as-is); **coupons** (start a
sale, see what's running, end one on the spot); **archive / resurface** ("remove" takes a piece down but
keeps it — she can bring it back; nothing is truly deleted); **price changes** (just tell the GPT the new
price — it updates in place on the same page and link, effective immediately; no new listing);
**marking a piece sold** (toggling it unavailable is **immediate**, like a price change — it shows as
sold but stays on the page; for removing it from the shop entirely she uses Archive; a real purchase
marks it sold automatically); and the
**status meanings** (live / draft / live·edits-pending / archived). Keep her warm voice + reassurance; no
API/CSS detail (that lives in `GPT_SETUP.md` / this doc).

**Operator note (for Sean; also add to Phase 10's `EVERLASTINGS_STORE.md`
data-flow).** A product row created directly in **Supabase Studio** now defaults to `is_published=false`,
so it's a **draft** — the INSERT trigger skips it (no Stripe object). **Never publish from Studio** —
use the **admin panel** (load it → **Publish now**) or the GPT. The two Studio shortcuts both fail, in
*different* ways, because the trigger is `AFTER INSERT` only:
- **(a) Studio INSERT with `is_published=true`** *does* fire the AFTER-INSERT trigger and create Stripe,
  but it **bypasses `handlePublish`** (no checkout-field validation; `published_at` stays null) — so it
  sidesteps the draft→publish gate. Don't.
- **(b) Studio UPDATE flipping an existing draft's `is_published` false→true** is an **UPDATE**, which
  does **not** fire the AFTER-INSERT trigger at all → the row goes "published" with **no Stripe Price**.
  It passes the new RLS (`is_published=true AND archived_at IS NULL`) but `main.js` hides it (no
  `stripe_price_id`) → an invisible, unbuyable **published-but-no-Stripe zombie**. Don't.

Bottom line: Studio is fine to inspect/patch a row; product *publishing* goes through the admin panel or
the GPT, both of which run `handlePublish` (validation + inline `syncProductToStripe`).

## Phase 11 — Verify + test

**Static (before deploy):**
- `npx tsc --noEmit -p tsconfig.json` → clean.
- Function count unchanged (publish / coupon / archive / discard are `?_action=` rewrites, not files;
  the `uploadImage` URL branch edits the existing `upload.ts`, and the `charge.refunded` branch edits the
  existing `webhook.ts` — neither adds a file): `ls api/*.ts` = 11.
- `vercel.json` is valid JSON; the new `?_action=` rewrites present (incl. `/api/products/discard`).

**Live (dev preview — point any GPT/curl at the preview; `is_test=true`, no real money; SSO off for
third-party calls):**
1. **Create → draft:** `createProduct` → response has `preview_url`; product does **not** appear in
   `/shop` or via the anon client; no Stripe product yet; admin list shows a **draft** pill.
2. **Preview:** open `preview_url` → renders with draft values + the "Draft preview" bar; and the
   preview fires **no** GA4/Pixel `view_item` and **no** cart-interest ping (an owner's preview loads
   must not pollute analytics).
3. **Publish (new):** tap Publish (or `publishProduct`) → redirect to live `/product/{slug}`; appears
   in `/shop`; Stripe product + price exist; old preview link 404s; admin shows **live**.
4. **List + status:** `listProducts` returns the product with `is_published`; admin shows the right
   pill (live / draft / live·edits-pending).
5. **Edit (published) → draft — BOTH paths:** (a) **GPT** `editProduct` with only the
   changed fields → live page unchanged; admin shows **edits pending**; preview shows the change;
   publish → applies to live; Stripe catalog untouched. (b) **Admin** edits a published product's copy
   and clicks **Save draft** — `buildProductPayload` re-sends the *full* payload (incl. unchanged
   `price` + `checkout_*`) and it must **NOT** 400 (the frozen guard rejects only *changed* frozen
   fields); it stages a draft, the preview shows it, **Publish now** applies it. *This is the published-edit
   regression — exercise the admin-published-edit path, not just the GPT path.*
6. **Stripe-lock + price rotation:** **changing a `checkout_*` identity field** on
   a **published** product (GPT or admin) → 400 "frozen after publish"; re-sending `checkout_*` **and
   `price` unchanged** (as the admin always does on every save) → **accepted, no 400** (the guard
   rejects only *changed* frozen fields, and the price round-trips to an identical integer via
   `Math.round`); **changing `price` on a published product** → **accepted + rotated, NOT 400**: a new
   active Stripe Price is created on the *same* product, the old Price flips `active:false`,
   `stripe_price_id` updates, the DB `price` updates immediately, and the response carries
   `price_updated:true` with **no draft staged** for a price-only change; the *same edits* on a
   **still-unpublished draft** → applied directly to live columns (returns a fresh preview).
7. **Purchasability guard:** a draft cannot be reserved/checked out (reserve → unavailable; session
   → rejected).
8. **Coupons:** percent + amount; store-wide + product-scoped; `min_amount`; `expires_at`; redeem the
   code at checkout (`applyPromotionCode`); duplicate code → 409; BOGO refused. **`listCoupons`** shows
   it active; **`deactivateCoupon`** ends it (the code then fails at checkout). **Isolation:**
   `listCoupons` returns only owner-created sales (a cart-recovery / newsletter code is **not** listed),
   and `deactivateCoupon` on such a system code → 403.
9. **Media:** set `media` (an MP4 item + a YouTube item) via create/edit → the page renders the video
   (MP4 first), respects its aspect ratio, YouTube after; empty/absent `media` → the section stays
   hidden; no GIF element.
10. **GPT behaviour:** drafts every tier; hands back the preview link with good language; picks coupon
    params; lists/deactivates a sale; sets `media`; archives / resurfaces a piece; confirms-vs-expedites;
    fails gracefully.
11. **Archive (1.12):** `archiveProduct` (admin "Archive" or GPT) → the piece leaves
    `/shop`, the product feed, and its `/product/{slug}` page (and can't be checked out); the Stripe
    product flips `active:false`; admin shows the **archived** pill. `unarchiveProduct` reverses all of
    it. No row is ever hard-deleted.
12. **Strict test isolation (1.11):** `/api/config` returns `isTest`; on the **dev preview**
    the shop shows the published *test* product (as in #3), but pointed at **production** that same test
    row does **not** appear in `/shop` or on its page (prod shows only `is_test=false`).
13. **Re-price rotation keeps identity:** change a published product's price by chat → its page
    keeps the **same slug/URL**, and the new price shows on `/shop`, the product page, and at checkout
    immediately; in Stripe the old Price is `active:false` and a new active Price exists on the **same**
    product (no second product created, no publish step). A new Checkout Session charges the new price; a
    session opened just before the change keeps its locked price (expected Stripe behaviour).
14. **Discard a staged draft:** stage an edit on a published product (admin or GPT) → admin shows
    **live · edits pending** + a **"Discard pending edits"** button. Discard (button or `discardEdits`)
    → `draft` + `preview_token` cleared, the live page **unchanged**, the pill back to **live**, the old
    preview link dead. `discardEdits` on an unpublished draft → friendly 400 ("nothing to discard"); on a
    published row with no pending edits → idempotent success.
15. **Create injection guard:** a `createProduct` body that also includes `is_published`,
    `archived_at`, `published_at`, `draft`, or `stripe_product_id` → those are **ignored** (the row is an
    unpublished draft with no Stripe ids); only allow-listed fields persist.
16. **Coupon pagination:** `listCoupons` returns every owner-tagged sale even when many
    system codes exist (no single-page truncation of real sales); the `owner_sale` filter still excludes
    cart-recovery / newsletter codes.
17. **Checkout never suggests a hidden product:** when a cart item is unavailable, the
    reserve "related/alternatives" response (series-related + fallback) must contain **only** published,
    non-archived, non-test rows — archive or unpublish a piece, then trigger the unavailable-item path,
    and confirm it never appears as a suggested alternative (no dead/unbuyable links).
18. **No publishing an archived piece:** publishing via a *stale* preview link (or by id)
    for an archived product → **409** "resurface it first" (no split state where Stripe goes active while
    `archived_at` is set). Unarchive, then publish → works.
19. **Rotation stays buyable on a Stripe failure:** simulate `stripe.prices.create`
    throwing mid-rotation (e.g. a bad key / forced error on a test product) → the request 502s, the DB is
    **untouched** (`price` + `stripe_price_id` unchanged), and the product **remains buyable** at its old
    price (its referenced Price is still `active`). On the success path, confirm the *old* Price ends
    `active:false` **after** the DB points at the new one, and that an old-Price-deactivate failure (if it
    occurs) does **not** fail the request (the product is buyable at the new price regardless).
20. **Upload by URL — the GPT path:** `POST /api/upload` with a JSON body
    `{url, slug, role}` pointing at a public **image** URL → 200 `{url, filename}`; the file lands on R2
    (transformed/cropped per role) and the returned URL works in `images[]`. Same with an **MP4** URL +
    `role: video-01`, `skip_transform: true` → streams as-is (no transform), 200. The **multipart** path
    (admin UI / curl) still works unchanged.
21. **Upload by URL — failure messaging:** a Google Drive **share-page** link (`…/file/d/<id>/view`)
    → normalized to `uc?export=download&id=<id>` and fetched; a link that returns HTML / a non-allowed
    type → **400** with the "share as a direct link" message (the GPT relays it); an over-cap file
    (image > 10 MB / video > 50 MB) once fetched → **400** "File too large"; a JSON body missing
    `url`/`slug`/`role` → **400**.
22. **Refund reflects in order status:** on a **test** order, issue a **full** refund
    from the Stripe dashboard → the `charge.refunded` event arrives and the order's `status` flips to
    `refunded` (verify via `listOrders` / the order row); a **partial** refund logs but does **not**
    change status; a duplicate `charge.refunded` delivery is de-duped by the existing idempotency claim
    (no error, no double-write). (Requires `charge.refunded` enabled on the Stripe webhook endpoint.)
23. **Mark-sold is immediate on a published piece:** on a PUBLISHED product, `editProduct
    {available:false}` (GPT or admin) → the live row flips to sold **immediately** (no draft staged, no
    preview, no publish step); `/shop` + the product page show it sold at once; the response carries
    `availability_updated:true` and admin shows "Availability change is live now — nothing to publish"
    with **no** Publish button; `editProduct {available:true}` re-lists it the same way. On an
    UNPUBLISHED draft, `available` still applies to live columns directly (nothing live yet). Confirm an
    availability-only change does NOT set "edits pending."
24. **Per-type create validation is extensible:** a `miniature` create enforces exactly the
    current rules (≥1 hero + ≥5 gallery + thumbnail + the required scalar fields); an unknown/new
    `product_type` falls back to the `miniature` ruleset (never un-validated). Confirm the `miniature`
    error messages/behaviour are byte-identical to today (no regression), and that adding a hypothetical
    `PRODUCT_TYPE_RULES` entry would change only that type's minimums.

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

**Media is data-driven** (Phase 7 `populateMedia` renders `p.media`; §1.1). The container swap (the
static `.product-gallery__media` placeholder → an empty `[data-product-media]` div) **moved to Phase 7.2**
(functionality, not the design slice), so it ships + is tested with `populateMedia`. What stays here (design) is the
media **CSS** — MP4 respects its intrinsic ratio (no forced 16/9 black bars); YouTube embeds get 16/9:
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

The gap-review gate — angles **A / B / C**, with **A first** (cold / out-of-repo, the holistic
self-containment + completeness pass) — runs against this doc + `EVERLASTINGS_STORE.md`. The full
process, sequencing, the reviewer landmines, and the per-angle prompts live in the single source
**`v1_5_5_REVIEW_PROMPTS.md`** (adapted from `.agent/DEV_RULES.md` §gap-gate). Fold each round → bump
the doc → re-run A until a fresh pass finds nothing load-bearing, then B + C, then Sean approves and a
fresh agent executes on the dev preview.

---

# Open items

- **Hero spec (3.7)** — Sean to write (CSS vs. Hyperframe); ignore until then.
- **Render-tune (not blockers):** story-card exact size (3.3); glow palette + intensity (3.6);
  product-page sticky behaviour + `.product-details` spacing after the reflow (3.2).
- **Deferred (post-launch, data-gated):** enable the `pg_cron` archive/draft **purge** (Phase 1 ships it
  commented) once active-list size warrants it; an optional admin **"hide archived"** filter (the
  archived pill already ships, 8.8).
- **Known limitations (noted, not blocking):** no granular per-photo edit — the GPT resends
  the full `images` array, and a removed photo's R2 object lingers (harmless); the preview page's
  cart-button visual treatment (disable / "preview only") is a Part 3 design-slice call — only the
  analytics-skip is wired now.
- **Resolved (`available` now applies live):** the prior known-edge — a *stale* `available:true` in a
  pending draft re-raising a sold piece on publish — **no longer applies on a published row**, because
  `available` is now applied LIVE immediately and never staged into the draft (it can't sit stale).
  `available` only flows through the draft on a still-*unpublished* product, where there's no live row to
  contradict. So the timestamp-aware clamp is no longer needed; Archive remains the instant full takedown.
- **Admin polish (noted, not blocking):** (a) after **unarchive**, the editor doesn't
  re-open to the piece, so resurfacing an archived *draft* then publishing it is a two-step (find →
  re-open → publish) — acceptable for v1, a one-call convenience later. (b) `openEditor` shows the
  preview link only right after a save; reopening a draft later needs a no-op "Save draft" to resurface
  the link (which rotates the token) — a later nicety would surface the current `preview_token`'s link on
  open. (c) Optional bulletproofing: re-`pick(DRAFTABLE)` the `draft` at publish-apply so a *Studio
  hand-edit* of the `draft` jsonb can't inject a system column — negligible (Studio access = service-role
  already), so deferred.
- **Known edge (noted, not blocking):** concurrent **first-publish** can duplicate a
  Stripe product. `syncProductToStripe` idempotency is read-then-write (skip if `stripe_product_id`
  exists), so two near-simultaneous first-publishes — e.g. Em taps the preview-page **Publish** *and*
  tells the GPT "publish" at the same moment, or a client retry — can both read `null` and both create a
  Stripe product; the row keeps whichever id wrote last, leaving one orphaned (manual cleanup). The
  preview button's `disabled=true` covers the everyday double-tap; the button+GPT race is rare. A correct
  hardening claims the publish atomically before the Stripe create (a conditional update with a row-count
  check, or a Postgres advisory lock on the id) — not a naive reorder, which would reintroduce a
  published-with-no-Stripe window. Deferred to v1.1.
