# v1.2 Planning Session — Close All Gaps Before Code

## Context

Everlastings by Emaline has complete architecture docs (~85% production-ready) but zero implementation code. The v1.1 docs describe *what* to build but not *how the code looks*. A client agent review identified 10 gaps (7 critical) plus 5 code-level gaps that would cause mid-session research and wasted time.

This session produces the final, executable v1.2 documentation — code snippets, locked decisions, no ambiguity — so that implementation sessions can write correct code on the first pass.

**Critical correction**: All everlastings docs currently say `ui_mode: 'embedded'`, but the proven pattern from freelance-payments uses `ui_mode: 'custom'` (Checkout Sessions API + Stripe Elements). Sean confirmed: follow the quickstart guide pattern (`docs.stripe.com/payments/quickstart-checkout-sessions`) that worked in freelance-payments. The client expects checkout hosted on-site with full control, not Stripe's pre-built iframe.

**Proven reference files** (in `freelance-payments-dev`):
- `assets/docs/v5/v5_1_16/QUICKSTART_CHECKOUT_SESSIONS/server.js` — session creation with `ui_mode: 'custom'`
- `assets/docs/v5/v5_1_16/QUICKSTART_CHECKOUT_SESSIONS/checkoutForm.jsx` — PaymentElement + email + confirm pattern
- `assets/docs/v5/v5_1_16/QUICKSTART_CHECKOUT_SESSIONS/complete.jsx` — return page with session-status fetch
- `assets/docs/v5/v5_1_16/QUICKSTART_CHECKOUT_SESSIONS/POST_API_CHECKOUT_SESSION_CREATE.md` — complete API request/response (API version `2025-12-15.clover`)

---

## Phase 1: Research (Parallel Tracks)

### Track A — Stripe `ui_mode: 'custom'` for Vanilla JS

The quickstart is React-based (`CheckoutProvider`, `useCheckout()`, `PaymentElement`). Everlastings is vanilla JS. Research needed:

- [ ] **Vanilla JS equivalent of custom checkout** — Stripe provides `stripe.initCustomCheckout({clientSecret})` for non-React. Confirm this API exists and get the exact pattern: `checkout.createElement('payment')` → `.mount('#payment-element')` → `checkout.confirm()`
- [ ] **Email collection in custom mode** — quickstart uses `checkout.updateEmail(email)`. Confirm this works in vanilla JS custom checkout
- [ ] **Shipping address collection** — everlastings needs US shipping. How to add `shipping_address_collection` to a `ui_mode: 'custom'` session? Does it auto-render in Elements, or do we need `AddressElement`?
- [ ] **Current Stripe API version** — freelance-payments workbench used `2025-12-15.clover`. Check if newer as of April 2026
- [ ] **Metadata on sessions** — confirm `metadata: { product_id, product_slug }` passes through to `checkout.session.completed` webhook event
- [ ] **Stripe Prices immutability** — confirm prices can't be updated (only archived + new created) to validate "write-once" decision
- [ ] **Webhook raw body on Vercel TS** — freelance-payments webhook.js tries 4 approaches for raw body. Get current best practice for Vercel serverless TypeScript

### Track B — Supabase + R2 (parallel with Track A)

- [ ] **Supabase Database Webhooks** — confirm payload format on INSERT, confirm full row data is sent
- [ ] **Supabase JS client for vanilla JS** — confirm browser init pattern with CDN script tag (no build step). Is hardcoding anon key the recommended approach?
- [ ] **Supabase RLS policy syntax** — confirm for all 4 tables
- [ ] **Cloudflare R2 upload from Vercel** — S3-compatible API pattern using `@aws-sdk/client-s3`, auth, public URL serving
- [ ] **R2 custom domain** — does `cdn.everlastingsbyemaline.com` require Cloudflare DNS?

### Track C — Vercel (depends on A + B findings)

- [ ] **`vercel.json` body parsing** — does webhook raw body need config?
- [ ] **TypeScript API auto-compile** — confirm Vercel auto-detects `.ts` in `/api/`
- [ ] **Stripe.js loading** — confirm `<script src="https://js.stripe.com/v3/"></script>` is the correct CDN load for vanilla JS (no npm needed for frontend)

---

## Phase 2: Lock Decisions

| #   | Decision                                                                    | Rationale                                                                                                                   |
| --- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`ui_mode: 'custom'`** (not 'embedded')                                    | Proven in freelance-payments. Full UI control. Checkout hosted on-site per client contract. Follows Stripe quickstart guide |
| 2   | **Buy Now only, no cart** for v1                                            | Everything is 1-of-1. Cart adds race conditions and complexity for no value                                                 |
| 3   | **Availability check on checkout creation**                                 | Query `available === true` before creating Stripe session. Simple race condition fix                                        |
| 4   | **Stripe products are write-once**                                          | No UPDATE to Stripe. Price change = archive old Price + create new. "Stripe is a payment mirror, not source of truth"       |
| 5   | **R2 path convention**: `/products/{slug}/{timestamp}.webp`                 | Predictable, collision-free, CDN-friendly                                                                                   |
| 6   | **Image aspect ratio**: 4:5 for products                                    | Prevents messy grids. Enforced in admin upload UI                                                                           |
| 7   | **Slug rules**: `title.toLowerCase().replaceAll(' ', '-')`, immutable       | URL stability, SEO preservation                                                                                             |
| 8   | **Stripe metadata**: `{ product_id, product_slug }`                         | Webhook can identify what to mark sold without querying line_items                                                          |
| 9   | **Error state strategy**: fallback message + disabled buttons + console.log | Minimum viable UX for all failure modes                                                                                     |
| 10  | **Supabase anon key hardcoded in main.js**                                  | Public by design, RLS-protected. No build step = no env var injection                                                       |
| 11  | **Stripe.js via CDN** `<script>` tag, not npm                               | No build step. Supabase JS also via CDN                                                                                     |

---

## Phase 3: Create Documents

### 3a. `assets/docs/archive/v1/v1_2_IMPLEMENTATION.md` — Primary Deliverable

```
# Everlastings — v1.2 Implementation Guide

## Locked Decisions (numbered, with rationale)

## Product Schema
  - Hard TypeScript interface for API functions
  - Supabase SQL CREATE TABLE statement
  - Field-by-field notes (which are required, which are auto-populated)

## Configuration Files
  - Complete vercel.json (rewrites, headers)
  - Complete tsconfig.json
  - Complete package.json with exact dependency versions
  - .env.example with every variable documented

## SESSION 1: Foundation
  (Same scope as v1.1 PLUS:)
  - SQL for all 4 tables + RLS policies
  - DB webhook configuration steps
  - Stripe dashboard setup (webhook endpoint, event subscriptions)

## SESSION 2: Design System
  (Same scope + image aspect ratio 4:5, error state styling)

## SESSION 3: Product Page + Supabase Client
  CODE SNIPPETS:
  - assets/js/main.js — Supabase CDN load, client init, formatPrice, slugify, getProductBySlug
  - assets/js/product.js — slug from URL, fetch, render, error states
  ERROR STATES: product not found, image load fail, Supabase fetch fail

## SESSION 4: Stripe Integration (MAJOR REWRITE from v1.1)
  CODE SNIPPETS:
  - api/checkout.ts — availability check → session create (ui_mode: 'custom', metadata, shipping) → return client_secret
  - api/webhook.ts — raw body → constructEvent → extract metadata → update inventory → create order
  - api/stripe-sync.ts — receive DB webhook → products.create → prices.create → write IDs back
  - api/session-status.ts — retrieve session for return page (NEW, from quickstart pattern)
  - assets/js/checkout.js — Stripe.js CDN → initCustomCheckout → createElement('payment') → mount → email input → confirm
  - checkout.html — complete HTML with mount point, email field, pay button, return handling
  ERROR STATES: product unavailable (409), checkout failure, payment declined, webhook failure
  NO CART — removed entirely

## SESSION 5-10: (enhanced from v1.1 with error states, schema refs)
  - Session 7 header: NO cart icon (Buy Now only)

## Error States Reference (consolidated table: page → failure → user sees → code behavior)
## Slug Rules (generation, immutability, URL pattern)
## Caching Strategy (deferred — note only)
```

### 3b. `assets/docs/archive/v1/v1_2_ACTION_STEPS.md`

ADHD-friendly checklist version:
- Every checkbox = ONE action
- Bold the action verb
- Cross-reference to implementation guide section
- No paragraph longer than 3 lines
- Grouped by session with "YOU WILL HAVE" outcome at top

### 3c. `assets/docs/BRAND.md`

Promote `v1_1_BRAND.md` to canonical location:
- Add "Photography Standards" section (4:5 aspect, WebP, naming)
- Add "Error & Empty State Voice" section (on-brand messages for sold, unavailable, error)
- Verify hex codes match EVERLASTINGS_STORE.md
- Verify Google Fonts load line is complete
- Remove "v1.1" versioning — this is now the canonical brand guide

### 3d. Update `assets/docs/EVERLASTINGS_STORE.md`

- **Change `ui_mode: 'embedded'` → `ui_mode: 'custom'` everywhere**
- Add all 11 locked decisions
- Remove all cart references
- Add error states section
- Add `api/session-status.ts` to API function list
- Update "What's Reused from freelance-payments" section with accurate info
- Verify schema matches implementation guide

### 3e. Update `assets/docs/PRODUCT_GUIDE.md`

- Add photo aspect ratio requirement (4:5)
- Add slug immutability note
- Verify price field explanation is consistent

### 3f. Delete legacy files

- `_config.yml` — Jekyll artifact, Vercel ignores it
- `CNAME` — GitHub Pages artifact, Vercel handles domains via dashboard
- `assets/products/` — empty directory, products live in Supabase
- Locate and delete any `uid-xxx-xxx.json` files

---

## Phase 4: Second Pass — DUAL REVIEW

### 4a. Self-Review Checklist

- [ ] **Data flow trace**: for every API endpoint, trace trigger → input → external calls → DB writes → response → failure mode
- [ ] **Frontend credential check**: how does each JS file get Supabase URL/key? Is it consistent?
- [ ] **Schema cross-reference**: does products schema match across IMPLEMENTATION, STORE, and PRODUCT_GUIDE?
- [ ] **Env var audit**: does every env var in code snippets appear in the env var table?
- [ ] **Race condition walkthrough**: step through "two users buy same item" — confirm availability check blocks second session
- [ ] **Error state completeness**: every page has a failure mode documented
- [ ] **`vercel.json` ↔ file structure**: do rewrites match actual HTML file paths?
- [ ] **Cart removal completeness**: no cart references remain in any document
- [ ] **`ui_mode` consistency**: no references to 'embedded' remain — all updated to 'custom'
- [ ] **Quickstart alignment**: does checkout flow match the proven server.js + checkoutForm pattern?

### 4b. Fresh Agent Review

After self-review, spawn a fresh Explore agent with NO prior context to:
- Read only the v1.2 docs (IMPLEMENTATION + ACTION_STEPS + STORE)
- Attempt to "build" each API endpoint mentally — identify any missing info
- Flag any ambiguity, contradictions, or assumptions
- Verify the complete data flow from product creation through purchase through webhook

---

## Phase 5: Finalize

- Apply any fixes from dual review
- Update `README.md` to reference v1.2 docs
- Note branch structure setup needed before Session 1 (`main`/`dev`/`feat/*` per DEV_RULES.md)
- Commit all changes

---

## Key Files

| File                                                       | Role                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `assets/docs/archive/v1/v1_1_FEEDBACK.md`                  | Source of truth for gaps (this session's input)                                      |
| `assets/docs/EVERLASTINGS_STORE.md`                        | Architecture doc to update                                                           |
| `assets/docs/archive/v1/v1_1_IMPL_GUIDE.md`                | Being replaced by v1.2 docs                                                          |
| `assets/docs/archive/v1/v1_1_BRAND.md`                     | Being promoted to BRAND.md                                                           |
| `assets/docs/PRODUCT_GUIDE.md`                             | Client-facing doc to update                                                          |
| `freelance-payments-dev/.../QUICKSTART_CHECKOUT_SESSIONS/` | **Proven pattern** — server.js, checkoutForm.jsx, complete.jsx, API request/response |
| `freelance-payments/api/webhook.js`                        | Reference: webhook raw body handling                                                 |
| `freelance-payments/vercel.json`                           | Reference: Vercel config pattern                                                     |

---

## Verification

After all documents are complete:
1. A developer reading only v1_2_IMPLEMENTATION.md + EVERLASTINGS_STORE.md can build every API endpoint without additional research
2. Every code snippet is copy-paste ready (correct imports, correct types, correct API calls)
3. The checkout flow matches the proven quickstart pattern adapted for vanilla JS
4. ACTION_STEPS covers every file that needs to exist, with no gaps
5. PRODUCT_GUIDE is accurate enough for Emy to add products correctly on day one
6. No references to `ui_mode: 'embedded'` remain anywhere in the project
