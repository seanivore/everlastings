# v1.4.4 Track C — Integration Implementation Guide

**Date filed**: 2026-05-06
**Supersedes**: `v1_4_3_C_IMPLEMENT.md` (kept for archival; do not act on it)
**Branch**: `dev`
**Audience**: Track C executing agent + Sean (orchestrator)

---

## What changed since v1.4.3

This guide is v1.4.3 Track C, restructured to match the reality that Track A and Track B delivered. Five things changed:

1. **Phase 0 added** — Track A pipeline gaps surfaced by Track B's pre-flight (Gaps A–G) are now an explicit pre-wiring phase. Phase 0's Cloudinary fix is the gate that unlocks parallelism: once it ships, Emaline can begin loading real products via the Custom GPT pipeline at the same time Sean iterates on design with placeholder data.
2. **Endpoint count corrected to 11** (from 14). `vercel.json` rewrites preserve all public URLs Track C consumes.
3. **All localhost-based verification removed.** Hard rule per `feedback_no_localhost_testing.md`: verify on Vercel preview URLs only. Stripe webhook testing uses the Stripe Dashboard "Send test webhook" against the dev-branch alias, not `stripe listen`.
4. **Consent + email-CTA contracts pinned** to the actual events Track B's pages dispatch (`email-cta-submit`, `consent-change`) — single global listener pattern replaces per-form wiring.
5. **Design Review Checkpoints A/B/C/D inserted** between phases. Sean iterates on placeholder design in parallel with Emaline loading real products via the Custom GPT pipeline; Emaline's design review starts later and works on a partly-real catalog instead of pure placeholders. See `v1_4_4_PREP_DESIGN_REVIEWS.md` for the full review protocol.

## Decisions locked at v1.4.4 alignment session

**D1 — Cloudinary signed flow.** `/api/upload` switches to signed flow matching `/Users/seanivore/Development/360-design/assets/docs/ENTRY_SOP.md` pattern: HTTP basic auth with `API_KEY:API_SECRET` extracted from `CLOUDINARY_URL`, transforms via URL params (`c_fill,w_X,h_Y,q_auto,f_webp`), result stored to R2.

**D2 — Inline stripe-sync.** New `?sync=true` query param on `POST /api/products` invokes `/api/stripe-sync` inline before responding. Removes dependency on Supabase webhook reaching preview deploys.

**D3 — Phase 0 in execution session.** Phase 0 fixes execute in the Track C *execution* session (this plan's first checklist), not the planning session.

**D5 — Emaline feedback channel.** Shared Google Doc with one section per page. Sean runs his own review loop first, in parallel with Emaline loading real products via the Custom GPT.

---

## Track Goal

Wire Track B's 13 placeholder pages (63 PLACEHOLDER markers across 16 files) to Track A's 11 deployed endpoints, ship the cart + checkout flow end-to-end including 409 cart-recovery and 410 hold-expiry edge cases, finalize SEO, and launch — with iterative design review baked into checkpoints A/B/C/D so Sean's iteration loop runs alongside Emaline's real-product loading via the Custom GPT pipeline.

---

## Required Pre-Reads

Read in this order before any code work:

**Project context (full reads):**
- `.agent/AGENTS.md` — agent instructions
- `.agent/DEV_RULES.md` — workflow protocol
- `assets/docs/EVERLASTINGS_STORE.md` — architectural primer (consume API contracts, AR #N references)
- `assets/docs/BRAND.md` — voice/tone for any remaining copy work
- `assets/docs/PRODUCT_PROTOCOL.md` — Custom GPT product creation contract (so you know what shape `/api/products` accepts)

**Track A & B closeouts (full reads — contracts shifted from the original IMPLEMENT specs):**
- `assets/docs/archive/v1_4/v1_4_3_A_SESSION_REPORT.md` — what Track A actually delivered, Open Threads carrying into Track C
- `assets/docs/archive/v1_4/v1_4_3_A_UPDATE_REPORT.md` — Track B's fix to Track A's function-cap and module-loading bugs
- `assets/docs/archive/v1_4/v1_4_3_B_SESSION_REPORT.md` — what Track B actually delivered, placeholder inventory, `data-*` map
- `assets/docs/archive/v1_4/v1_4_3_B_PRE_FLIGHT_BUG.md` — exact wording for Phase 0 Gaps A–G
- `assets/docs/archive/v1_4/v1_4_3_B_PLACEHOLDER_SEED.md` — what test-mode placeholder products exist (purged in C5)

**Reference (consult, do not full-read):**
- `assets/docs/archive/v1_4/v1_4_3_A_IMPLEMENT.md` (~107k tokens — for endpoint-shape lookup only)
- `assets/docs/archive/v1_4/v1_4_3_B_IMPLEMENT.md` (~26k — for placeholder convention)
- `assets/docs/archive/v1_4/v1_4_3_B_RESEARCH_COOKIE_CONSENT.md` — already digested in Track B SESSION_REPORT; consult only for §6.2 copy variants and §7.3 California LDU specifics

---

## Do Not Modify Without Explicit Reason

- `api/**` — Track A's domain. Phase 0 fixes are the only sanctioned changes; consume contracts as-is otherwise.
- `assets/css/**` — Track B's. Add CSS only if a hook is genuinely missing.
- `_template.html` and the canonical header/footer regions — Track B's. Drift detection is one-shot diff against this template.

---

## Endpoint Reality Map

Replaces v1.4.3's "14 endpoints" mental model. 11 deployed function files + 3 helper
namespaces. Public URLs preserved by `vercel.json` rewrites.

### `api/cart.ts`
- **URLs**: `POST /api/cart-activity`, `POST /api/cart-recovery`
- **Consumers**: `main.js` (activity ping), `cart.js` (recovery overlay submit)

### `api/checkout.ts`
- **URLs**: `POST /api/checkout`, `POST /api/checkout/reserve`, `GET /api/session-status`
- **Consumers**: `cart.js` (reserve), `checkout.js` (session create), `complete.html` (status)

### `api/config.ts`
- **URLs**: `GET /api/config`
- **Consumers**: `main.js` (Supabase + Stripe keys)

### `api/contact.ts`
- **URLs**: `POST /api/contact`
- **Consumers**: `contact.html` form handler

### `api/orders.ts`
- **URLs**: `GET /api/orders`, `PATCH /api/orders/:id`
- **Consumers**: `admin/index.html` (Track A's surface)

### `api/product-feed.ts`
- **URLs**: `GET /api/product-feed`
- **Consumers**: Meta Commerce (not Track C frontend)

### `api/products.ts`
- **URLs**: `GET /api/products`, `GET /api/products?slug=`, `POST /api/products`, `PUT /api/products`
- **Consumers**: `shop.js`, `product.js`, `homepage.js` (reads); admin path (writes)

### `api/stripe-sync.ts`
- **URLs**: `POST /api/stripe-sync`
- **Consumers**: server-to-server only (not Track C frontend)

### `api/subscribe.ts`
- **URLs**: `POST /api/subscribe`
- **Consumers**: `main.js` global `email-cta-submit` listener

### `api/upload.ts`
- **URLs**: `POST /api/upload`
- **Consumers**: Custom GPT only; admin write path

### `api/webhook.ts`
- **URLs**: `POST /api/webhook`
- **Consumers**: Stripe → backend (not called from frontend)

**Helpers (not deployed as functions)**: `api/_lib/*`, `api/_emails/index.ts`, `api/_bootstrap/coupons.ts`.

**Hobby cap rule**: 11/12. **If a new endpoint feels needed during Track C wiring, stop
and consolidate via `?_action=` query routing into an existing file**, plus a rewrite in
`vercel.json`. Adding a 12th file deletes our buffer; Vercel Pro is the only alternative.

---

## Verification Convention (Hard Rule)

- **Verify on Vercel preview URLs only, never localhost.** Per `feedback_no_localhost_testing.md`. `vercel dev` masks both the function-cap and module-loading bug classes; only real preview deploys catch them.
- **Stripe webhook testing**: use Stripe Dashboard → Developers → Webhooks → "Send test webhook" against the dev-branch alias. Do NOT use `stripe listen`. Document the dev-branch alias in the Phase 0 verification step.
- **Sharing preview URLs with stakeholders**: copy the Vercel deployment URL (e.g. `https://everlastings-website-git-dev-everlastingsbyemaline.vercel.app/<page>`) into the shared Google Doc per page. Do not point Emaline at the custom domain until C5 launch.
- **Sensitive-marked env vars**: `vercel env pull` returns `""` for "Sensitive" values. Verify by exercising the runtime endpoint, not by inspecting the pulled file. (Lesson from B's pre-flight, see Track B SESSION_REPORT §B-pre-flight 3.)

---

# Phase 0: Pre-Wiring Bug Fixes

Resolves the seven gaps Track B's pre-flight surfaced before any wiring begins. Each gap is classified:

- **BEFORE** — must merge before C1 starts (blocks the first wiring step or unlocks parallelism)
- **DURING** — lands inline within a specific C-section that touches the same code
- **AFTER** — doc-only or non-blocking polish; deferred to C5 launch-prep

> Source for each gap: `assets/docs/archive/v1_4/v1_4_3_B_PRE_FLIGHT_BUG.md` § Track A pipeline gaps from B0.2.

## 0.1 Gap A — Cloudinary signed-flow switch (BEFORE, CRITICAL)

**Why critical**: blocks Emy's Custom GPT product creation. Without this, real-product
loading cannot run in parallel with Track C wiring, and Emaline reviews placeholders
instead of partial-real catalog.

**Decision (D1)**: switch `/api/upload` to signed flow matching `/Users/seanivore/Development/360-design/assets/docs/ENTRY_SOP.md` pattern. The 360-design SOP is the canonical reference — same auth scheme, same transform-via-URL pattern, just lifted server-side.

**Files**:
- `api/upload.ts`
- `.env` (CLOUDINARY_URL — already present in Vercel env scopes; no rotation needed)

**Implementation**:
- Extract `API_KEY` and `API_SECRET` from `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME` at module load
- Replace `upload_preset=unsigned_temp` flow with `POST https://api.cloudinary.com/v1_1/{cloud}/image/upload` using HTTP basic auth (`-u "API_KEY:API_SECRET"` semantics in fetch headers)
- After upload, request the transformed image via URL: `GET https://res.cloudinary.com/{cloud}/image/upload/c_fill,w_{w},h_{h},q_auto,g_auto,f_webp/v1/{public_id}`
- Stream transformed bytes to R2 at the documented role-based path
- Call Cloudinary `image/destroy` to clean up source from Cloudinary (free-plan hygiene; see ENTRY_SOP §4 step 3)

**Verify on preview**:
- `npx vercel curl --deployment <dev-alias> -- -X POST /api/upload -F "file=@/tmp/sample.jpg" -F "slug=test-haven" -F "role=hero"` returns 200 with `{ url: "https://cdn.everlastingsbyemaline.com/..." }`
- One full Custom-GPT product-create flow lands a product with all 7 images (1 hero + 1 cover + 5 detail) without 502s

**Demo at gate close**: Sean watches the GPT create one product; preview shop page renders the new product on next deploy.

## 0.2 Gap B — `test_` prefix validator (BEFORE, CRITICAL)

`api/products.ts` rejects test-mode URLs because `api/upload.ts` prepends `test_` to
filenames in test mode but the validator checks `startsWith('hero-')` directly.

**Files**: `api/products.ts`

**Implementation**: in the validator that derives role from filename, change the check
to `filenameOf(img).replace(/^test_/, '').startsWith('hero-')` (and same for `gallery-`,
`cover-`, `detail-`).

**Verify on preview**: POST a product whose hero URL is `…/test_hero-{slug}.webp` → 201,
not 400. Recheck against B0.2's seed manifest URLs.

## 0.3 Gap C — Inline stripe-sync via `?sync=true` (BEFORE)

**Decision (D2)**: add a `?sync=true` query param on `POST /api/products` that invokes
`/api/stripe-sync` inline before responding. This sidesteps the question of whether the
Supabase webhook is even configured for preview deploys and removes a class of "product
created but stripe_price_id null for 45s" bugs.

**Files**: `api/products.ts`

**Implementation**:
- After successful Supabase INSERT and before returning the new row, if `req.query._action !== ...` AND `req.query.sync === 'true'`, synchronously call the stripe-sync handler with the inserted row as the synthetic webhook envelope
- On stripe-sync success, refetch the row (now with `stripe_product_id` and `stripe_price_id`) and return that
- On stripe-sync failure, log the error but still return the inserted row with a `warning` field — do not roll back the INSERT

**Document fallback**: in `assets/docs/PRODUCT_PROTOCOL.md`, note that `?sync=true` is the
recommended flag for preview-environment seeding; production webhook is the long-term path
once configured.

**Verify on preview**: POST a product with `?sync=true` → response has populated
`stripe_product_id` and `stripe_price_id` fields. Stripe Dashboard test mode shows the
new Product+Price with the expected name.

## 0.4 Gap D — stripe-sync idempotency (BEFORE)

Calling `/api/stripe-sync` twice with the same `record.id` but no existing
`stripe_product_id` creates an orphaned Stripe Product. Cheap defensive fix; protects
the `?sync=true` retry path and any future webhook-driven retries.

**Files**: `api/stripe-sync.ts`

**Implementation**: at the top of the handler, after parsing the envelope, query
`products WHERE id = record.id AND stripe_product_id IS NOT NULL`. If found, return the
existing Stripe IDs in the response and skip the create call.

**Verify on preview**: call `/api/stripe-sync` twice for the same record → second call
returns 200 with the same `stripe_product_id` from the first call. Stripe Dashboard shows
exactly one Product for that slug.

## 0.5 Gap G — `?slug` 404 behavior for `is_test` (DURING C2.2)

`GET /api/products?slug=...` filters out `is_test=true` rows when unauthenticated. This
is correct production behavior, but `shop.js` and `product.js` need to know: in
preview/test environments where placeholder products are `is_test=true`, the public read
path returns 404 unless authenticated.

**Files**: `api/products.ts` (no change), `assets/js/shop.js` and `product.js` (knowledge only)

**Implementation**: confirm during C2.2 wiring that the shop and product page code paths
(reading via Supabase JS SDK with the publishable key, not via `/api/products`) hit the
RLS-gated read path and surface placeholder products correctly in the preview environment.

**Verify on preview**: shop page on dev preview renders all 6 placeholder products;
production-mode build (after C5.1 cleanup) renders zero placeholders.

## 0.6 Gap E — `vercel curl` exit code 3 note (AFTER, doc-only)

**Files**: `assets/docs/PRODUCT_PROTOCOL.md`

**Implementation**: add a one-liner to the curl-protocol examples noting that scripts
using `set -e` must allow exit code 3 (or drop `set -e`, keep `set -uo pipefail`, pipe
through `|| true` where exit is checked). Reference Track B's pre-flight findings.

## 0.7 Gap F — `materials` array type doc fix (AFTER, doc-only)

**Files**: `assets/docs/PRODUCT_PROTOCOL.md`

**Implementation**: in the AI-protocol field table, clarify that `materials` is a
`text[]` array (`["wood", "resin"]`), not a comma-separated string. Existing text may
mix string and array forms; standardize on array.

## Phase 0 exit gate

- [ ] All BEFORE items merged on `dev`
- [ ] Preview deployment green (`npx vercel ls` shows latest deploy as Ready)
- [ ] One end-to-end Custom-GPT product create runs cleanly: upload all images → POST products with `?sync=true` → response has populated Stripe IDs → row visible on preview shop page
- [ ] Sean signs off → C1 unlocks AND Emaline starts the parallel real-product loading loop
- [ ] AFTER (doc-only) items deferred to C5 explicitly listed in the C5 checklist below

---

# C1: Page Wiring Foundations

Stand up `main.js` plus the two **global event listeners** Track B's pages already
dispatch. After C1, every per-page module just consumes these foundations.

## C1.1 main.js foundation

Carry forward verbatim from v1.4.3 (`v1_4_3_C_IMPLEMENT.md` lines 186–339): Supabase
client init via `/api/config`, R2 base URL constant, `formatPrice`, `slugify`,
`buildGa4Item`, `trackMeta`, `getProductBySlug`, `getProducts`, cart helpers
(`getCart`, `addToCart`, `removeFromCart`, `clearCart`, `getCartTotal`,
`updateCartBadge`), `DOMContentLoaded` boot.

**Critical files**: `assets/js/main.js`

**Verify on preview**: open any page on the dev preview URL with devtools open. In the
console, `window._supabase` is defined after first paint. `formatPrice(12345)` returns
`$123.45`. `getCart()` returns `[]` on first load.

## C1.2 Global `email-cta-submit` listener

Track B's pages dispatch `window.dispatchEvent(new CustomEvent('email-cta-submit', {
detail: { source, email, productSlug? } }))` on every email-form submit. C1.2 adds one
global listener that POSTs `/api/subscribe` with the detail.

**Source enum** (single source of truth, see Appendix B):
- `product-interest` (product page sticky card)
- `cart-exit` (exit-intent modal)
- `contemplation-offer` (3-min popup; generates promo code via `newsletter-welcome-5` coupon)
- `newsletter-footer`
- `newsletter-shop-empty` (shop "all sold" inline form)
- `newsletter-homepage` (homepage closing newsletter)
- `newsletter-customer` (complete page newsletter prompt)

**Implementation**:
- One `document.addEventListener('email-cta-submit', handler)` registration in `main.js`
- Handler validates email, POSTs to `/api/subscribe` with `{ source, email, productSlug? }`
- On 200: dispatch `email-cta-success` (event-name TBD when wiring; pages may consume to flip UI state). Fire GA4 `email_cta_capture` and Meta `Lead`
- On 23505 (already subscribed): dispatch `email-cta-already-subscribed` (UI surfaces friendly "You're already part of the Firelight Council")
- On other errors: dispatch `email-cta-error` with detail.message

**Critical files**: `assets/js/main.js` (handler registration); page-level JS only manages local UI flip in response to outcome events.

**Verify on preview**: open dev preview, devtools console, `window.dispatchEvent(new
CustomEvent('email-cta-submit', { detail: { source: 'newsletter-footer', email: 'test@x.com' } }))`
→ Network tab shows POST `/api/subscribe` with the payload, 200 response. GA4 DebugView
shows `email_cta_capture` event.

## C1.3 Global `consent-change` listener + default-deny snippet

Track B's cookie banner dispatches `window.dispatchEvent(new CustomEvent('consent-change',
{ detail: { analytics, advertising } }))` on Accept/Decline. C1.3 adds:

(a) A `<head>`-level **default-deny** gtag snippet that fires BEFORE `gtag.js` loads
(CIPA defense per Track B's research §6.1):

```html
<!-- In every page <head>, BEFORE the gtag.js script tag -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied'
  });
</script>
```

(b) A global `consent-change` listener in `main.js` that maps the localStorage shape
`{ analytics, advertising, timestamp, version }` to `gtag('consent', 'update', { ... })`
+ `fbq('consent', 'grant'|'revoke')`. For California-detected visitors who Accept
advertising: also `fbq('dataProcessingOptions', ['LDU'], 0, 0)` (auto-geo). California
detection is per Track B's research §7.3.

(c) Page-load re-fire: on every `DOMContentLoaded`, if `localStorage.getItem('everlastings.consent')`
exists, parse it and re-apply via the same listener path so consent persists across
navigation without a banner re-prompt.

**Critical files**: `assets/js/main.js` (listener); `_template.html` (head snippet — confirm Track B already includes this; if not, add).

**Verify on preview**: clear localStorage, reload preview page, banner appears. Click
Accept → console shows `gtag('consent', 'update', {...granted})` + `fbq('consent', 'grant')`
in network. localStorage now has `everlastings.consent`. Reload page → banner does NOT
reappear; console re-fires `consent-change` from localStorage.

## C1.4 Cookie banner persistence

Most of this is shipped by Track B already. C1.4 confirms:

- Banner only renders on first visit (no localStorage value)
- Footer "Privacy preferences" link (`data-cookie-revoke`) re-opens the banner
- Decline path is symmetric (no asymmetric weighting — CIPA defense from research §6.2)

**Critical files**: `assets/js/ui.js` (Track B owns; C1 only verifies hooks fire)

**Verify on preview**: Decline → all consent values denied; click footer "Privacy preferences" → banner reopens; localStorage state cleared on revoke.

## Design Review Checkpoint A

After C1 ships:

- Sean reviews preview URL: cookie banner copy/placement, consent flow UX, newsletter forms on every page that has one
- Sean classifies feedback per `v1_4_4_PREP_DESIGN_REVIEWS.md` (Bucket 1 / 2 / 3)
- Cosmetic feedback flows to the parallel iteration loop and does NOT block C2

---

# C2: Per-Page Wiring

Per-page modules consuming the C1 foundation.

## C2.1 product.js

Replaces `<!-- PLACEHOLDER: product-* -->` blocks. The product page form CTAs
(product-interest sticky card, contemplation-offer popup) dispatch `email-cta-submit`
events that C1.2's global listener handles — `product.js` only manages local UI state
flips in response to outcome events.

**Tasks**:
- [ ] Create `assets/js/product.js`
- [ ] Read slug from URL (`/product/<slug>` or `?slug=<slug>` per the existing routing)
- [ ] Fetch via `getProductBySlug(slug)` (or via `GET /api/products?slug=<slug>` if RLS path requires auth in preview — verify in Gap G test)
- [ ] Populate `data-product-*` hooks per Appendix A
- [ ] On not-found → reveal `data-product-not-found`
- [ ] On `available === false` → reveal `data-product-sold`, disable Add to Cart + Buy Now buttons
- [ ] Wire Add to Cart / Buy Now buttons via `addToCart()` from main.js (fires GA4 `add_to_cart` + Meta `AddToCart`)
- [ ] Gallery lightbox (Track B owns the lightbox JS; C2.1 only wires click handlers)
- [ ] Fire `view_item` and Meta `ViewContent` on page load
- [ ] Fire `video_play` event when product video plays
- [ ] Related products: fetch 3-4 from same series, render below story (use canonical `.product-tile` snippet)
- [ ] Wire CTA #3 (contemplation popup): 3-min `setTimeout`, dispatch `email-cta-submit` with `source: 'contemplation-offer'` on submit. C1.2's listener generates the promo code via `/api/subscribe` (which checks source and creates a promotion code from `newsletter-welcome-5` coupon)

## C2.2 shop.js

Filter sidebar, URL state, skeleton loaders, `search_filter` event. Honors `is_test=false`
filter (Gap G fix exercised here).

**Tasks**:
- [ ] Create `assets/js/shop.js`
- [ ] Fetch via `getProducts({ available: undefined, ... })` — render all, sort by featured then created_at
- [ ] Wire `data-shop-filter` checkboxes (series, product_type, availability) — client-side filter on rendered tiles
- [ ] Wire `data-shop-sort` select (price-asc, price-desc, newest, oldest)
- [ ] URL state: `?series=portals-to-peace&sort=price-asc` syncs to filter/sort UI
- [ ] Replace `data-shop-loading` skeletons with real content on load
- [ ] Empty states (Track B's hidden DOM blocks):
  - `data-shop-no-products` when DB returns 0 products with no filter active
  - `data-shop-all-sold` when all products `available = false` AND no filter active (reveal inline newsletter form, dispatches `email-cta-submit` with `source: 'newsletter-shop-empty'`)
  - `data-shop-filter-empty` when filters yield 0 matches (with Clear filters CTA)
  - `data-shop-fetch-error` on Supabase failure
- [ ] Fire GA4 `search_filter` event on each filter change

## C2.3 homepage.js

**Tasks**:
- [ ] Create `assets/js/homepage.js`
- [ ] Fetch featured products: `getProducts({ featured: true, available: true })`, render into the carousel slot
- [ ] Fetch theme tokens from `site_config` table; apply as dynamic CSS variables on `:root`
- [ ] Closing newsletter form dispatches `email-cta-submit` with `source: 'newsletter-homepage'`
- [ ] Theatrical lighting hero is pure CSS (Track B); homepage.js does not touch it

## C2.4 newsletter.js

Most behavior already lives in C1.2's global listener. C2.4 is a thin wrapper for the
exit-intent modal:

**Tasks**:
- [ ] Create `assets/js/newsletter.js`
- [ ] Detect mouse-leave / `visibilitychange` to show exit-intent modal IF cart not empty AND modal not yet shown this session
- [ ] Modal form dispatches `email-cta-submit` with `source: 'cart-exit'`
- [ ] Footer newsletter form already dispatches `email-cta-submit` with `source: 'newsletter-footer'` (Track B); C2.4 confirms

## C2 verification

- [ ] On preview: per page, devtools `grep` for `PLACEHOLDER:` (use `Inspect Element` source view) shows zero remaining markers in the dynamic content blocks
- [ ] GA4 DebugView: `view_item` fires on product load, `add_to_cart` fires on button click, `search_filter` fires on filter change
- [ ] Full browse flow on preview: homepage → shop → filter → product page → add to cart (no checkout yet)

## Design Review Checkpoint B

After C2 ships — biggest feedback window.

- Sean reviews preview URLs page-by-page using the protocol from `v1_4_4_PREP_DESIGN_REVIEWS.md`
- This is when Sean's iteration loop is most active. Cosmetic feedback fed into Bucket 1; structural feedback escalates to Sean for v1.4.4 vs. v2 decision
- Emaline may start her review here IF she has loaded enough real products via the Custom GPT pipeline that the placeholder catalog is partially replaced

---

# C3: Cart + Checkout End-to-End

Cart UX, two-stage progressive-disclosure checkout, recovery overlay, hold-expiry. The
v1.3.1 behavior of "409 at the Pay button moment" is removed entirely — 409 happens at
`/cart.html` BEFORE any PII is entered. Reference: AR #28 in `EVERLASTINGS_STORE.md`.

## C3.1 cart.js

**Tasks**:
- [ ] Create `assets/js/cart.js`
- [ ] Page load: read `localStorage.cart`, render line items into `.cart-line` template repeats. Show `data-cart-empty` if 0 items
- [ ] Pre-fill email/name from `sessionStorage.checkout_email/checkout_name` if present
- [ ] On `data-cart-checkout` button click:
  - Persist email/name to sessionStorage
  - POST `/api/checkout/reserve` with `{ items, session_id, email, name }`
  - On 200 → `gtag('event', 'begin_checkout', ...)` + `fbq('InitiateCheckout', ...)` → redirect to `/checkout.html`
  - On 409 → reveal `data-sold-recovery` overlay; populate `data-sold-recovery-list` with `unavailable[]`, `data-sold-recovery-related-grid` with `related[]`. Remove sold items from localStorage cart
  - On other errors → reveal `data-cart-error`
- [ ] Recovery overlay form (`data-sold-recovery-form`) submit → POST `/api/cart-recovery` → on 200 reveal `data-sold-recovery-code` with returned `code` + 30-day expiry note
- [ ] Recovery overlay "Continue with remaining items" link → triggers fresh `POST /api/checkout/reserve` with reduced cart

Carry forward verbatim from v1.4.3's cart.js code listing (`v1_4_3_C_IMPLEMENT.md` lines
499–605) — the structure is correct; only the localhost references in adjacent prose
need updating to preview URLs.

## C3.2 recovery.js (shared overlay rendering)

**Tasks**:
- [ ] Create `assets/js/recovery.js` — shared `renderRecoveryStep1()` and `wireRecoveryForm()` consumed by `cart.js`
- [ ] Renders the email-form HTML, the related-products mini cards from API response
- [ ] Handles email persistence to sessionStorage so navigating to a related product card and back retains the recovery state

## C3.3 checkout.js — two-stage progressive disclosure

**Tasks**:
- [ ] Create `assets/js/checkout.js`
- [ ] Page load: redirect to `/cart.html` if cart empty or no `everlastings_session_id`
- [ ] Render order summary
- [ ] Fetch `/api/config` for Stripe publishable key, instantiate Stripe
- [ ] Stage A (`stage-a-info`): name + email; "Same as shipping" toggle controls `data-stripe-address-billing` visibility; mount `data-stripe-address-shipping` at AddressElement init
- [ ] Stage A "Continue" → POST `/api/checkout` with `{ items, session_id, email, name }`
  - On 200 → mount Stripe PaymentElement at `data-stripe-payment`, mount AddressElement at `data-stripe-address-shipping`/`data-stripe-address-billing`. Reveal Stage B
  - On 410 (hold expired) → reveal `data-hold-expired`, redirect to `/cart.html` after 2s
  - On other errors → reveal `data-checkout-error` with `data-checkout-error-message` text
- [ ] AddressElement `change` event: incomplete → `data-checkout-error` shows "Please complete your shipping address."
- [ ] AddressElement validation error (undeliverable) → `data-checkout-error` shows "We couldn't verify this address. Please double-check."
- [ ] Restricted country (not in `allowed_countries: ['US']`) → "We currently only ship within the United States. Contact us for international inquiries." + link to `/contact.html`
- [ ] `data-checkout-confirm` button → `actions.confirm()` from Stripe checkout session
  - On error → display Stripe error message, re-enable button
  - On success → Stripe redirects to `/complete.html?session_id=...`

Carry forward the code structure from v1.4.3's checkout.js (`v1_4_3_C_IMPLEMENT.md`
lines 611–762). Single mechanical edit: any inline comments referencing `localhost` get
removed.

## C3.4 complete.html return logic

**Tasks**:
- [ ] Inline `<script>` in `complete.html` (or a small `assets/js/complete.js` if Track B already wired a script tag — verify)
- [ ] Read `?session_id=...` from URL; if missing → `data-complete-error`
- [ ] GET `/api/session-status?session_id=...`
- [ ] On `status === 'complete'`:
  - Hide `data-complete-loading`, reveal `data-complete-success`
  - Populate `data-complete-customer-name`, `-email`, `-line-items`, `-shipping`, `-total`, `-order-id`
  - Fire GA4 `purchase` (with full items array) + Meta `Purchase` (deduped with CAPI via `event_id = stripe_event.id`)
  - Clear localStorage cart
  - If user not yet a subscriber (check via `/api/subscribe?check=email` if such an endpoint exists, otherwise skip): reveal `data-complete-newsletter` (form dispatches `email-cta-submit` with `source: 'newsletter-customer'`)
- [ ] On other status → reveal `data-complete-error`

Carry forward from v1.4.3 (`v1_4_3_C_IMPLEMENT.md` lines 770–812).

## C3.5 Stripe webhook end-to-end on preview

**Tasks**:
- [ ] Stripe Dashboard → Developers → Webhooks: register a webhook pointed at the dev-branch alias `https://everlastings-website-git-dev-everlastingsbyemaline.vercel.app/api/webhook` with the events `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`. Use the **test-mode** webhook secret in the dev preview env.
- [ ] Dashboard "Send test webhook" against each registered event → verify Vercel logs show 200 from `/api/webhook` for each
- [ ] Resolves Track A Open Thread #2 (Stripe test webhook registration)

## C3 verification

- [ ] Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC) — full happy path on preview deployment URL: cart → checkout → pay → complete page renders with success state
- [ ] 409 simulation: manually flip a placeholder product's `available = false` mid-session via Supabase Studio → click checkout → recovery overlay appears with promo code on email submit
- [ ] 410 simulation: open checkout page, wait out the 15-min hold TTL, click confirm → redirect to `/cart.html` with hold-expired message
- [ ] Vercel logs show `/api/webhook` 200 responses for each Stripe event during the happy path

## Design Review Checkpoint C

After C3 ships:

- Sean does a real-card-then-refund smoke test on preview (one purchase, refund within 24h)
- Recovery overlay copy ("These havens have found their homes") gets explicit Emaline sign-off — copy is brand-sensitive and Emaline owns voice
- Cart + checkout flow feels complete; v1.4.4 launch-prep work begins

---

# C4: SEO + Launch Sprint

Merged from v1.4.3's C3 + C4. SEO finalization is mechanical and tightly coupled to
launch verification; splitting them adds ceremony without value.

**Tasks**:
- [ ] Per-page meta titles + descriptions (product pages from Supabase `seo_title` / `seo_description` if those columns exist, otherwise generated from `title` + `subtitle`)
- [ ] Open Graph + Twitter Card tags (per-page where dynamic, static for legal/info pages)
- [ ] Product `schema.org` JSON-LD (`Product` schema with `offers`, `aggregateRating` only if testimonials exist)
- [ ] Generate `sitemap.xml` (build-time or runtime via `/api/sitemap` if needed). Discriminator: `noindex` on preview URLs (check `VERCEL_ENV !== 'production'` and serve `<meta name="robots" content="noindex">`)
- [ ] `robots.txt`: production allows all; preview disallows all (or use the env-discriminator approach)
- [ ] Lighthouse mobile audit ≥ 90 on all 13 pages — resolves Track B Open Thread (audit owed). Run via `npx lighthouse <preview-url> --view --form-factor=mobile`. Document scores per page; address any < 90
- [ ] Track A integration tests re-run against preview post-consolidation (resolves both Track A and Track B Open Threads):
  - `tests/integration/04_*.sh`, `05_*.sh`, `06_checkout.sh`
  - `tests/integration/07_race_condition.sh`, `08_hold_expiry.sh`
  - `tests/integration/09_*.sh`, `10_full_purchase_flow.sh`, `11_*.sh`
  - `tests/integration/12_shipping_mark.sh`, `16_admin_orders_needs_shipping.sh`
- [ ] Cross-browser + mobile QA matrix: Chrome, Safari, Firefox, Edge desktop; iPhone Safari, iPad Safari, Android Chrome
- [ ] Final `grep -rn "PLACEHOLDER:" .` returns zero (gate item)
- [ ] OG validators against preview: Facebook Sharing Debugger, Twitter Card Validator, LinkedIn Post Inspector

## Design Review Checkpoint D

After C4 ships — final design review.

- Sean + Emaline final design review on preview
- Last chance for v1.4.4 cosmetic fixes
- Anything below the bar is logged into the v2 facelift queue (per `project_v2_homepage_facelift.md` memory)

---

# C5: Launch Cutover

## C5.1 Placeholder data purge

Per `v1_4_3_B_PLACEHOLDER_SEED.md` § Track C cleanup directive:

- [ ] DELETE Supabase rows where `is_test = true` (the 6 placeholder products: `placeholder-haven-i`, `placeholder-haven-ii`, `placeholder-book-nook`, `placeholder-storyloft`, `placeholder-seasonal-piece`, `placeholder-printable-set`)
- [ ] Purge R2 `test/` namespace (all 84 objects)
- [ ] Archive 7 Stripe Products in test mode: the 6 seed products + 1 orphan `prod_URor3D0ITLFa2E` from Gap D's idempotency test
- [ ] Verify: `SELECT COUNT(*) FROM products WHERE is_test = true` returns 0
- [ ] Verify: R2 console shows `test/` namespace empty
- [ ] Verify: Stripe test-mode Products list shows only archived entries for the 7 placeholders

## C5.2 Resolve remaining Track A/B Open Threads

- [ ] **Stripe production webhook registration** (Track A Open Thread #2): in Stripe live mode, register a webhook pointed at `https://everlastingsbyemaline.com/api/webhook` with the live-mode secret in Vercel production env scope
- [ ] **`env()` helper sweep** (Track A Open Thread #5): audit `grep -rn 'process\.env\.[A-Z]' api/` and apply `env()` helper across remaining endpoints. Highest-risk: `api/webhook.ts` and `api/contact.ts` for Resend `from/to/replyTo`; `api/webhook.ts` for Meta CAPI URL composition
- [ ] **Admin UI manual click-path** (Track A Open Thread, Gate criterion #3): Sean opens the production admin URL, logs in, creates a product via the form, uploads images, saves, sees it on the shop list. This is the click-path that was code-tested but not browser-verified during Track A
- [ ] **Trailing-newline Vercel env cleanup** (Track A Open Thread #1): now optional defensive hygiene per UPDATE_REPORT; can be done if convenient but is not a launch blocker
- [ ] Apply Phase 0 AFTER items: Gap E note to PRODUCT_PROTOCOL.md, Gap F materials-array fix

## C5.3 Real product load (≥ 5 minimum)

- [ ] Emaline loads ≥5 real products via the Custom GPT against preview deployment (this is the **final** validation of the loading pipeline; earlier rounds happened in parallel with C1–C4 once Phase 0 unlocked it)
- [ ] Each real product has all 7 image roles populated, real Stripe Product+Price IDs, real materials/dimensions/copy
- [ ] Verify each renders correctly on preview shop and product pages

## C5.4 Stripe live keys + coupon bootstrap

- [ ] Stripe live publishable + secret keys added to Vercel production env scope (NOT preview, NOT development)
- [ ] Run `/api/_bootstrap/coupons` against live mode to create the two coupons (`cart-recovery-10`, `newsletter-welcome-5`) in live Stripe — see v1.4.3 plan § Coupon Setup for the exact spec
- [ ] Verify in Stripe live-mode dashboard: both coupons exist with `Duration: Forever`, blank `max_redemptions`, correct percent-off values

## C5.5 DNS flip + branch merge

- [ ] DNS: point `everlastingsbyemaline.com` (and `www.`) at Vercel per their custom-domain instructions
- [ ] SSL: confirm Vercel auto-provisions; verify `https://everlastingsbyemaline.com` returns 200 with valid cert
- [ ] Tag `dev` HEAD as `v1.4.4`; merge `dev` → `main`; tag `main` HEAD as `v1.4.4-prod`
- [ ] Confirm production deploy from `main` is Ready and serves the production catalog

## C5.6 Post-launch monitoring

- [ ] 24h watch on Vercel logs for 5xx spikes
- [ ] 24h watch on Stripe live dashboard for webhook 4xx/5xx
- [ ] 24h watch on Resend deliveries for any bounces / spam-folder reports
- [ ] One real-card test purchase + refund within first 24h (Sean) to confirm live mode is healthy

---

# Branch + Commit Policy

- All Track C work on `dev`
- Small commits per logical unit (one C-section per commit, Phase 0 as one commit per gap)
- Push frequently for preview testing
- Do NOT merge to `main` until C5.5 is the merge gate

---

# Verification Gate (Done Means)

- [ ] All Phase 0 BEFORE items merged on `dev`; preview Custom-GPT smoke test passes
- [ ] All 63 PLACEHOLDER markers wired (`grep -rn "PLACEHOLDER:" .` returns ZERO)
- [ ] Full purchase flow works end-to-end on preview deployment
- [ ] All inlined error states render correctly when their condition is triggered
- [ ] GA4 Enhanced Ecommerce events fire correctly per Appendix
- [ ] Meta Pixel events fire correctly per Appendix
- [ ] 409 cart-recovery flow tested with simulated concurrent purchase on preview
- [ ] 410 hold-expiry flow tested by waiting out the soft hold on preview
- [ ] Lighthouse mobile score ≥ 90 across all 13 pages on preview
- [ ] Track A integration tests 04, 05, 06, 07, 08, 09, 10, 11, 12, 16 pass against preview post-consolidation
- [ ] Sitemap.xml + robots.txt + structured data validated; OG validators show clean previews
- [ ] Stripe in live mode for production environment
- [ ] All test-mode placeholder data purged (Supabase rows, R2 test namespace, Stripe test Products archived)
- [ ] DNS flipped, SSL active, production deploy from `main` healthy
- [ ] Sean + Emaline final review approval

---

# Appendix A — `data-*` Attribute → Module Wiring Map

Comprehensive table from Track B's placeholder inventory (per `v1_4_3_B_SESSION_REPORT.md`).
Future-Claude consumes this during C2/C3.

## Cart page (`cart.html`)

| Attribute                         | Purpose                     | Wired by                  |
| --------------------------------- | --------------------------- | ------------------------- |
| `.cart-line` (template)           | Repeat per line item        | `cart.js`                 |
| `data-cart-empty`                 | Empty-state container       | `cart.js`                 |
| `data-cart-checkout`              | CHECKOUT button             | `cart.js`                 |
| `data-cart-error`                 | Error state                 | `cart.js`                 |
| `data-sold-recovery`              | 409 overlay                 | `cart.js` + `recovery.js` |
| `data-sold-recovery-list`         | Unavailable items list      | `recovery.js`             |
| `data-sold-recovery-related-grid` | Related products mini cards | `recovery.js`             |
| `data-sold-recovery-form`         | Email form for promo code   | `recovery.js`             |
| `data-sold-recovery-code`         | Generated promo code reveal | `recovery.js`             |

## Checkout page (`checkout.html`)

| Attribute                      | Purpose                                               | Wired by      |
| ------------------------------ | ----------------------------------------------------- | ------------- |
| `stage-a-info`                 | Stage A container (name + email)                      | `checkout.js` |
| `stage-b-payment`              | Stage B container (Stripe Elements)                   | `checkout.js` |
| `data-stripe-address-shipping` | AddressElement (shipping) mount                       | `checkout.js` |
| `data-stripe-address-billing`  | AddressElement (billing) mount, conditional on toggle | `checkout.js` |
| `data-stripe-payment`          | PaymentElement mount                                  | `checkout.js` |
| `data-checkout-confirm`        | Confirm & Pay button                                  | `checkout.js` |
| `data-checkout-error`          | Error surface                                         | `checkout.js` |
| `data-checkout-error-message`  | Error text node                                       | `checkout.js` |
| `data-hold-expired`            | 410 redirect surface                                  | `checkout.js` |

## Complete page (`complete.html`)

| Attribute                     | Purpose                              | Wired by               |
| ----------------------------- | ------------------------------------ | ---------------------- |
| `data-complete-loading`       | Skeleton state                       | inline / `complete.js` |
| `data-complete-success`       | Success container                    | inline / `complete.js` |
| `data-complete-customer-name` | Customer name slot                   | inline / `complete.js` |
| `data-complete-email`         | Customer email slot                  | inline / `complete.js` |
| `data-complete-line-items`    | Order items list                     | inline / `complete.js` |
| `data-complete-shipping`      | Shipping address summary             | inline / `complete.js` |
| `data-complete-total`         | Total price slot                     | inline / `complete.js` |
| `data-complete-order-id`      | Order ID slot                        | inline / `complete.js` |
| `data-complete-newsletter`    | Subscribe prompt for non-subscribers | inline / `complete.js` |
| `data-complete-error`         | Error state                          | inline / `complete.js` |

## Shop page (`shop.html`)

| Attribute                       | Purpose                                            | Wired by  |
| ------------------------------- | -------------------------------------------------- | --------- |
| `data-shop-filter` (checkboxes) | Filter inputs (series, product_type, availability) | `shop.js` |
| `data-shop-sort` (select)       | Sort dropdown                                      | `shop.js` |
| `data-shop-loading`             | Skeleton tiles                                     | `shop.js` |
| `data-shop-no-products`         | "Crafting new havens" empty state                  | `shop.js` |
| `data-shop-all-sold`            | All-sold + inline newsletter form                  | `shop.js` |
| `data-shop-filter-empty`        | Filter yielded zero matches                        | `shop.js` |
| `data-shop-fetch-error`         | Supabase failure                                   | `shop.js` |
| `data-series` (on tile)         | Filter discriminator                               | `shop.js` |
| `data-product-type` (on tile)   | Filter discriminator                               | `shop.js` |
| `data-available` (on tile)      | Filter discriminator                               | `shop.js` |

## Product page (`product.html`)

`data-product-*` hooks per Track B: `data-product-title`, `data-product-price`,
`data-product-series`, `data-product-product-type`, `data-product-hero`,
`data-product-gallery-thumbs`, `data-product-cover`, `data-product-detail-1` through `-5`,
`data-product-story`, `data-product-features-*`, `data-product-related-grid`,
`data-product-not-found`, `data-product-sold`. Confirm exact set when wiring against
`product.html` source.

## Global (every page)

| Attribute            | Purpose                           | Wired by                       |
| -------------------- | --------------------------------- | ------------------------------ |
| `data-cookie-revoke` | Footer "Privacy preferences" link | Track B (`ui.js`); C1 verifies |
| `cart-badge` (id)    | Header cart count                 | `main.js`                      |

---

# Appendix B — `email-cta-submit` Source Enum

Single source of truth for which page dispatches which `source` value. C1.2's global
listener is the only consumer.

| Source                  | Dispatched from                       | Track A handler behavior                                           |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `product-interest`      | `product.html` sticky right card form | Insert into `product_interests` table; subscribe with this source  |
| `cart-exit`             | Exit-intent modal (`newsletter.js`)   | Standard subscribe                                                 |
| `contemplation-offer`   | Product page 3-min popup              | Subscribe + generate promo code from `newsletter-welcome-5` coupon |
| `newsletter-footer`     | Footer form on every page             | Standard subscribe                                                 |
| `newsletter-shop-empty` | Shop page "all sold" inline form      | Standard subscribe                                                 |
| `newsletter-homepage`   | Homepage closing newsletter           | Standard subscribe                                                 |
| `newsletter-customer`   | Complete page subscribe prompt        | Standard subscribe (post-purchase opt-in)                          |

---

# Appendix C — Error States Reference

Carry forward verbatim from v1.4.3 (`v1_4_3_C_IMPLEMENT.md` lines 873–975). All copy is
correct as written there. The only mechanical change: any code samples that referenced
`localhost` are replaced with the preview URL convention from § Verification Convention.

Headline list (full content in v1.4.3 reference):

- Product: Not Found, Supabase Fetch Fails, Image Fails to Load, Sold
- Checkout: Cart Empty, Items Sold Before Reserve (409), Hold Expired (410), Session Creation Fails, Payment Declined, Network Error, Shipping Address Incomplete, Address Not Deliverable, Restricted Country, Billing/Shipping Mismatch
- Complete: Success, Error
- Shop: Loading, No Products at All, All Products Sold (none available, no filter), Filter Returned Zero Matches, Fetch Failed
- Newsletter: Already Subscribed, Invalid Email
- Admin: Not Authenticated, Upload Too Large

---

# Appendix D — Migration Notes from v1.4.3

Diff log of structural changes for anyone reading both versions.

| Change                        | v1.4.3 → v1.4.4                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Endpoint count                | 14 → 11 (consolidated; public URLs preserved)                                                     |
| Phase ordering                | C1 → C4 → C5 with Design Review Checkpoints A/B/C/D                                               |
| Phase 0                       | Did not exist → 7 gaps with BEFORE/DURING/AFTER classification                                    |
| Localhost references          | Removed; verification on preview URLs only                                                        |
| Stripe webhook testing        | `stripe listen` localhost → Stripe Dashboard "Send test webhook" against dev-branch alias         |
| C1 structure                  | All page wiring lumped → split into C1 (foundations + global listeners) and C2 (per-page modules) |
| C3 + C4                       | Separate phases → merged C4 (SEO + launch sprint)                                                 |
| C5                            | Did not exist → split out for launch cutover including placeholder purge, live keys, DNS flip     |
| Cookie consent wiring         | Implicit → explicit C1.3 with default-deny snippet placement                                      |
| `email-cta-submit` listener   | Per-form wiring assumed → single global listener pattern                                          |
| `?sync=true` on POST products | Did not exist → required for preview-environment seeding                                          |
| Cloudinary                    | `unsigned_temp` preset (broken) → signed flow per 360-design SOP                                  |

---

# Cross-Track Sequencing

```
Track A ✓ ─┐
Track B ✓ ─┼── Phase 0 ─→ C1 ─→ C2 ─→ C3 ─→ C4 ─→ C5 ─→ Launch
           │              ↓     ↓     ↓     ↓
           │            Chk A Chk B Chk C Chk D
           │
           └── Real-product loading via Custom GPT (parallel with C1→C4, kicked off after Phase 0)
```

Phase 0 is the gate. Once it passes, Track C wiring and Emaline's real-product loading
proceed in parallel — by the time Design Review Checkpoint D runs, the catalog should be
mostly real, not placeholders.
