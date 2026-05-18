# v1.4.5 Track C Session Report

**Driving**: `v1_4_5_C_IMPLEMENT.md` → execution (Phases 0–5)
**Type**: Build (Track C integration orchestration)
**Branch**: `dev`
**Status**: in progress

This is the live build log for Track C. Footers (`## Session Notes`, `## Picked Up From / Stopped At`, `## Open Threads For Next Session`) get appended at session close per `.agent/DEV_RULES.md` § *Master Documents → Session document behavior*.

---

## Context

Track A and Track B closeouts surfaced gaps and bugs that were folded into a corrected `v1_4_5_C_IMPLEMENT.md` after the planning loop ran a clean revision. The intent: an exclusively executable playbook with no mixed truth.

During execution, the orchestrator discovered that **the playbook's Appendix A (data-* attribute contract) and several JS code blocks in C2/C3 still reference the original, pre-Track-B-revision attribute names**. Track B shipped a different (and internally consistent, generally cleaner) `data-*` convention than Appendix A documents. The revision pass that produced v1.4.5 appears to have updated the operational text (preflight, escalation, phase structure) but missed Appendix A and the related JS selectors.

Sean's call (escalated 2026-05-18): **adapt the Track C JS to Track B's actual shipped contract** (Option 1). The shipped HTML is the source of truth; the playbook's JS LOGIC stays verbatim but the SELECTORS are rewritten per module. Each rewrite gets recorded in § *Contract Drift Catalog* below so the next planning round can update `v1_4_6_C_IMPLEMENT.md` cleanly without re-discovering each delta.

---

## Phase 0 — Pre-flight verification

**Status**: green. One non-blocking finding surfaced to Sean.

| Check                                 | Result                                                                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch = `dev`, working tree clean    | ✓ (committed dirty doc as `1905249 docs(v1.4.3): refresh Track C IMPLEMENT path reference`)                                                                                                                                                                  |
| Function count under Hobby cap        | 11 ✓                                                                                                                                                                                                                                                          |
| Latest preview ● Ready                | ✓ (`9wdx6hvrm`, then `pl3fyydbg` after the C1 push)                                                                                                                                                                                                           |
| `/api/config` returns 200 with keys   | ✓ (`publishableKey`, `supabaseUrl`, `supabasePublishableKey`; `metaPixelId: null` — env not set, intentional)                                                                                                                                                |
| `/api/products` unauth → 200 + `[]`   | ✓ (correct filter `is_test=false` with no live products yet)                                                                                                                                                                                                  |
| `/api/products` authed → placeholders | **NOT VERIFIABLE FROM SEAN'S LAPTOP**. Local `.env.local` `PRODUCT_API_KEY` is stale relative to commit `e54ce87` (rotated 40 min after `.env.local` last touched). Bypassed via direct Supabase REST with publishable key + RLS — 9 rows visible including all 6 `placeholder-*`. Track C frontend uses the publishable key + RLS, so this is not a wiring blocker. |
| All 8 frontend pages present          | ✓                                                                                                                                                                                                                                                             |
| `vercel.json` rewrites                | 5 ✓                                                                                                                                                                                                                                                           |

**Action for Sean** (non-blocking, when convenient): refresh `.env.local` with the rotated `PRODUCT_API_KEY` so local curl scripts and the AI-pipeline preflight check return populated rows.

---

## Phase 1 — C1 Foundations

**Status**: complete. Sean owns the remaining manual browser checks (cookie banner walkthrough, devtools console clean, Design Review Checkpoint A); per the playbook these don't block C2.

**Files written / edited**:
- Created `assets/js/main.js`.
- Wired Supabase CDN + `main.js` into the `<head>` of all 13 public pages (`index`, `shop`, `product`, `cart`, `checkout`, `complete`, `about`, `contact`, `faq`, `policies`, `privacy`, `shipping`, `terms`).

**Contract test on preview alias `pl3fyydbg`** (via `vercel curl` to bypass SSO):
- Default-deny consent block present on every page ✓
- Supabase CDN + main.js loaded on every page ✓
- `main.js` exports `initConfig`, `getProductBySlug`, `buildGa4Item`, `email-cta-submit` + `consent-change` listeners ✓

### Deviation from the playbook (mid-build correction)

The playbook's `main.js` block stored cart state under `localStorage.everlastings_cart` and used `document.getElementById('cart-badge')` to update the header badge. Track B's `cart-ui.js` (already shipped) stores under `localStorage.cart` and updates `document.querySelectorAll('[data-cart-badge]')`. The shipped HTML uses `data-cart-badge` (no `id="cart-badge"` exists anywhere). Without a fix, the playbook's main.js was silently broken.

**Fix landed in `assets/js/main.js`**:
- `CART_STORAGE_KEY = 'cart'` (was `'everlastings_cart'`)
- Removed `updateCartBadge()` (cart-ui.js owns the badge)
- Added `persistCart(cart)` helper that writes localStorage AND dispatches `window.dispatchEvent(new Event('cart-updated'))` so cart-ui.js's badge listener triggers immediately
- `addToCart` normalizes new items to include `quantity: 1` (Track B's cart shape) plus the metadata C2/C3 need (`title`, `price`, `thumbnail`, `stripe_price_id`)
- `getCartTotal()` now multiplies by `quantity` (was implicit `quantity=1`)

This is a Track-C-only change; `cart-ui.js` was not touched.

---

## Contract Drift Catalog

Authoritative source: **the shipped HTML in `cart.html`, `checkout.html`, `complete.html`, `product.html`, `shop.html`, `index.html`, `_components.html` plus `assets/js/ui.js` + `cart-ui.js` + `lightbox.js`**. Playbook Appendix A is a stale snapshot; the entries below are the actual contract Track C's JS modules wire against. Future planning rounds should replace Appendix A with this table.

### Cross-page conventions Track B established (Track C reuses, never replaces)

- **Newsletter forms (every page)**: `<form data-email-cta="<source>">` where `<source>` matches Appendix B enum (`newsletter-footer`, `newsletter-homepage`, `newsletter-shop-empty`, `newsletter-customer`, `cart-exit`, `contemplation-offer`, `product-interest`). `ui.js` already catches the form `submit` and dispatches `window` `email-cta-submit` event with `{ source, email, productSlug? }`. **Track C does NOT need to re-attach per-form submit handlers** — `main.js`'s global `email-cta-submit` listener catches them and POSTs `/api/subscribe`.
- **Cart storage**: `localStorage.cart` = `[{ product_id, slug, quantity, ...metadata }]`. Mutations dispatch `window` `cart-updated` event. `cart-ui.js` listens and updates every `[data-cart-badge]`.
- **Exit-intent modal**: `[data-exit-modal]` (one global instance per page). `ui.js` owns the mouseleave/visibilitychange triggers + close button.
- **Contemplation popup**: `[data-contemplation]` (global per page, session-gated). `ui.js` owns the 3-min timer + close button.
- **Cookie banner**: `[data-cookie-banner]`, `[data-cookie-accept]`, `[data-cookie-decline]`, `[data-cookie-revoke]`. `ui.js` owns accept/decline/revoke wiring + persists consent and dispatches `window` `consent-change`. `main.js`'s consent-change listener persists to `localStorage.everlastings.consent` and re-applies on subsequent loads.
- **Lightbox**: `[data-lightbox-trigger]` opens, `[data-lightbox-close]`/`[data-lightbox-prev]`/`[data-lightbox-next]` navigate. `lightbox.js` owns it. **Product gallery does NOT need a custom lightbox in product.js** — Track B's existing markup + `lightbox.js` already handles it once the JS-rendered gallery thumbs carry the right `data-lightbox-*` attributes.

### Page-by-page selector deltas (Appendix A → Track B as shipped)

| Page | Appendix A | Track B actual | Notes |
| ---- | ---------- | -------------- | ----- |
| Cart | `[data-cart-lines]` | `[data-cart-with-items]` | container for line-item articles |
| Cart | `[data-cart-empty]` | `[data-cart-empty]` | ✓ matches |
| Cart | `[data-cart-total]` | `[data-cart-subtotal]` + `[data-cart-estimate]` | Track B splits subtotal from shipping estimate; C2 populates subtotal only (shipping handled by Stripe in checkout) |
| Cart | `[data-cart-email]` | (form inside `[data-cart-prefill]` block with `name="email"`) | C2 selects via `[data-cart-prefill] input[name="email"]` |
| Cart | `[data-cart-name]` | (form inside `[data-cart-prefill]` block with `name="name"`) | same pattern |
| Cart | `[data-cart-checkout]` | `[data-cart-checkout]` | ✓ matches |
| Cart | `[data-cart-error]` | `[data-cart-error]` | ✓ matches |
| Cart | `[data-sold-recovery]` | `[data-sold-recovery]` | ✓ matches |
| Cart | `[data-sold-recovery-list]` | `[data-sold-recovery-list]` | ✓ matches |
| Cart | `[data-sold-recovery-related-grid]` | `[data-sold-recovery-related-grid]` | ✓ matches |
| Cart | `[data-sold-recovery-form]` | `[data-sold-recovery-form]` | ✓ matches |
| Cart | `[data-sold-recovery-code]` | `[data-sold-recovery-code]` | ✓ matches |
| Cart | `[data-sold-recovery-code-value]` | `[data-sold-recovery-code-value]` | ✓ matches |
| Cart | `[data-sold-recovery-continue]` | NOT FOUND in Track B | C2 adds this button into the recovery overlay's inner markup (rendered by recovery.js) |
| Checkout | `[data-stage-a-info]` | `[data-checkout-stage="a"]` | C2 selects via the attribute-value pair |
| Checkout | `[data-stage-b-payment]` | `[data-checkout-stage="b"]` | same |
| Checkout | `[data-checkout-email]` | (inside `[data-checkout-info-form]` form, `name="email"`) | C2 selects `[data-checkout-info-form] input[name="email"]` |
| Checkout | `[data-checkout-name]` | (same form, `name="name"`) | same pattern |
| Checkout | `[data-checkout-continue]` | `[data-checkout-continue]` | ✓ matches |
| Checkout | `[data-checkout-billing-toggle]` | TBD when wiring checkout.js | likely the `<input type="checkbox" name="billing-same">` inside the form |
| Checkout | `[data-stripe-address-shipping]` | `[data-stripe-address-shipping]` | ✓ matches |
| Checkout | `[data-stripe-address-billing]` | `[data-stripe-address-billing]` | ✓ matches |
| Checkout | `[data-stripe-payment]` | `[data-stripe-payment]` | ✓ matches |
| Checkout | `[data-checkout-confirm]` | `[data-checkout-confirm]` | ✓ matches |
| Checkout | `[data-checkout-form]` | (form wraps stage B; selector TBD when wiring) |  |
| Checkout | `[data-checkout-error]` | `[data-checkout-error]` | ✓ matches |
| Checkout | `[data-checkout-error-message]` | `[data-checkout-error-message]` | ✓ matches |
| Checkout | `[data-hold-expired]` | `[data-hold-expired]` | ✓ matches |
| Checkout | `[data-checkout-order-summary]` | `[data-checkout-line-items]` (rows) + `[data-checkout-total]` (total) | C2 renders rows into the items container and writes total separately |
| Complete | `[data-complete-loading]` | `[data-complete-loading]` | ✓ matches |
| Complete | `[data-complete-success]` | `[data-complete-success]` | ✓ matches |
| Complete | `[data-complete-customer-name]` | `[data-complete-customer-name]` | ✓ matches |
| Complete | `[data-complete-email]` | `[data-complete-customer-email]` | RENAME in JS |
| Complete | `[data-complete-line-items]` | `[data-complete-line-items]` | ✓ matches |
| Complete | `[data-complete-shipping]` | `[data-complete-shipping]` | ✓ matches |
| Complete | `[data-complete-total]` | `[data-complete-total]` | ✓ matches |
| Complete | `[data-complete-order-id]` | `[data-complete-order-id]` | ✓ matches |
| Complete | `[data-complete-newsletter]` | `[data-complete-newsletter]` | ✓ matches |
| Complete | `[data-complete-newsletter-success]` | NOT IN HTML | C2 adds this empty wrapper inside the newsletter block |
| Complete | `[data-complete-error]` | `[data-complete-error]` | ✓ matches |
| Complete | `[data-complete-error-message]` | NOT IN HTML | C2 adds this inside the error block |
| Shop | `[data-shop-grid]`, `[data-shop-filter]`, `[data-shop-sort]`, `[data-shop-clear-filters]`, `[data-shop-loading]`, `[data-shop-no-products]`, `[data-shop-all-sold]`, `[data-shop-filter-empty]`, `[data-shop-fetch-error]` | all match ✓ | shop.js can use Appendix A selectors as-is for this page |
| Product | `[data-product-title]`, `[data-product-headline]`, `[data-product-price]`, `[data-product-features]`, `[data-product-not-found]`, `[data-product-sold]` | match ✓ |  |
| Product | `[data-product-content]` | `[data-product]` | RENAME |
| Product | `[data-product-related-grid]` | `[data-related-havens]` | RENAME |
| Product | `[data-product-buy-button]` (single) | `[data-product-add-to-cart]` + `[data-product-buy-now]` (two distinct buttons) | C2 wires both; the "buy now" path redirects to `/cart.html` after adding |
| Product | `[data-product-contemplation-popup]` | `[data-contemplation]` (global) | C2 does NOT re-wire — ui.js owns the timer + open/close; product.js only listens for `email-cta-success` to update the popup UI |
| Product | `[data-product-story]`, `[data-product-series]`, `[data-product-product-type]`, `[data-product-dimensions]`, `[data-product-weight]`, `[data-product-power-supply]`, `[data-product-materials]`, `[data-product-care-instructions]`, `[data-product-shipping-details]`, `[data-product-hero]`, `[data-product-gallery-thumbs]`, `[data-product-lightbox]`, `[data-product-lightbox-close]`, `[data-product-interest-form]`, `[data-product-interest-success]`, `[data-product-video]` | NOT IN HTML | C2 adds the missing hooks into product.html by replacing the corresponding `<!-- PLACEHOLDER: ... -->` blocks with production markup that carries the data-* attributes. Lightbox does NOT need re-wiring (Track B's lightbox.js + `data-lightbox-*` on gallery thumbs handles it). |
| Product | `[data-product-availability]`, `[data-product-breadcrumb-title]` | (EXTRA in Track B) | C2 populates these too — they're useful breadcrumb + availability text slots |
| Homepage | `[data-homepage-featured]` | `[data-featured-carousel]` | RENAME |
| Homepage | `[data-homepage-related-row]` | NOT IN HTML | C2 either skips this row OR adds a wrapper to index.html if Sean wants it. Punt until homepage.js wiring. |
| Homepage | `[data-homepage-newsletter-form]` + `[data-homepage-newsletter-success]` | `<form data-email-cta="newsletter-homepage">` (no -success wrapper) | C2 dispatches via `data-email-cta`; success-state UI is just a class flip on the form itself, no separate wrapper |
| Newsletter (cross-page) | `[data-cart-exit-modal]`, `[data-newsletter-footer-form]`, `[data-newsletter-footer-success]` | `[data-exit-modal]`, `<form data-email-cta="newsletter-footer">` (no -success wrapper) | C2 skips writing a separate `newsletter.js` — ui.js already owns the exit-intent trigger and form dispatch. The only Track C work is verifying the existing wiring fires the right `email-cta-submit` events. |

### Other contract corrections

- **`ga4-init` + `meta-pixel-init` PLACEHOLDER blocks** (every page): Track B left the literal `G-XXXXXXXXXX` and `META_PIXEL_ID_HERE` strings inline in `<head>`. These PLACEHOLDER markers will block the C4 hygiene gate (`grep -rn 'PLACEHOLDER:' .` must return zero). Resolution: deferred to C4 launch prep — Sean needs to either provide the real IDs (one-time substitution) or accept dynamic injection via `main.js` reading from `/api/config`. Surfaced to Sean as a C4 item.
- **Cookie banner copy in `_components.html`**: still uses placeholder copy; Sean owns the brand-final copy for Checkpoint A. Out of Track C's scope.

---

## C2 — Per-page wiring (in progress)

(Each module's contract test result + selector audit lands here as it ships.)

