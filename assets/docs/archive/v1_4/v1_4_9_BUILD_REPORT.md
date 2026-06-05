# v1.4.9 — Finish Track C: BUILD REPORT

**Build doc:** `assets/docs/archive/v1_4/v1_4_9_FINISH_TRACK_C.md` (exclusively-executable packet)
**Branch:** `dev` · **Started:** 2026-06-05
**Executor:** Claude Code (Opus 4.8 1M)
**Purpose:** Record what was done, any deviations from the packet (with reasoning), typecheck results, and the Phase 8 verification outcomes. Per the packet's close-out + `.agent/DEV_RULES.md` session-report convention.

---

## Pre-flight — anchor verification (before any edit)

Per the packet's anti-fragility rule (every CURRENT block is the locator; STOP and reconcile on any mismatch), I verified **every** quoted CURRENT block against the working tree across all 13 target files before starting.

**Result: ALL anchors match byte-for-byte. No drift.** Verified including the subtle ones:

| File | Anchor(s) checked | Match |
| --- | --- | --- |
| `api/checkout.ts` | body destructure (30–37), customer pre-create (104–118), `sessions.create` incl. `.html` return_url (120–164), `handleSessionStatus` retrieve (360–371) | ✅ |
| `api/webhook.ts` | no email imports (1–5), `CartItemMeta` (12), `customerEmail` (80), `shippingAddress` (84), `productIds`+mark-sold (124–128), orders-insert anchor (149–174) | ✅ |
| `api/_emails/index.ts` | `escapeHtml` (20), `shell` (35), `cartRecoveryCouponEmailHtml` (129–153), `SendEmailOpts` (155), `sendEmail` (162) — insert lands cleanly in the 153→155 gap | ✅ |
| `api/_lib/adminAuth.ts` | JWT-only current shape (full file) | ✅ |
| `api/_lib/env.ts` | `env()` trims; `isTest` | ✅ |
| `api/orders.ts` | GET (53–56) + PATCH (98–101) destructure only `supabase` (widened union safe) | ✅ |
| `api/products.ts` / `api/upload.ts` | `token === env('PRODUCT_API_KEY')` at :22 / :29 (the trimmed compare C1 mirrors) | ✅ |
| `checkout.html` | MAIN fence (148 / `<main>` 149 / 283) | ✅ |
| `cart.html` | 3-field prefill `<section>` (183–200) + all sibling selectors present | ✅ |
| `assets/js/cart.js` | header comment (3), `prefillEmailName` (82–89) + call site (19), reads (130–135), reserve body (143–148), 409 handler (151–179), redirect (203) | ✅ |
| `assets/js/product.js` | `/cart.html` buy-now redirect (223) | ✅ |
| `assets/js/admin.js` | `buildOrderCard` locals (539/542/552/567), Order line (608), shipForm submit (628–633) | ✅ |
| `assets/js/complete.js` | reader contract — all fields the Phase 1b server must return (33/34/35/39–41/47–52/65/70) | ✅ |
| `vercel.json` | current (no `crons` yet); `tsconfig.json` `module:"CommonJS"` | ✅ |
| `.env.example` | `ORDER_NOTIFY_EMAIL` absent (needs adding) | ✅ |

**Tooling confirmed:** git remote `git@github.com:seanivore/everlastings.git`, branch `dev`; Vercel CLI authenticated (scope `everlastings`); `tsconfig.json` → CommonJS.

**Operating decisions (from Sean):** commit per phase, single push to `dev` once `tsc` clean; Phase 8 browser test via Claude-in-Chrome in Sean's already-Vercel-authenticated Chrome.

---

## Phase log

### Phase 1 + 1b — `api/checkout.ts` ✅ (clean, no deviation)
- **1.1** body destructure reduced to `{ items, session_id }`.
- **1.2** deleted the Stripe Customer pre-create block (collapsed the leading blank so one separator remains before `sessions.create`).
- **1.3** `sessions.create`: omitted `customer_creation`, kept `phone_number_collection`, return_url → clean `/complete?session_id=…`.
- **1b** `handleSessionStatus`: expanded `['line_items','payment_intent']`; now returns `customer_name`, `amount_total`, `shipping_cost.amount_total`, `items[{slug,title,price}]`, `stripe_event_id: session.id` — exactly the keys `complete.js` reads.
- **Post-edit check:** `grep` confirms no orphaned `email/name/phone/customerId/emailValid` in `handleSession`; remaining matches are all in `handleReserve` (its own destructure) + the new 1b fields.

### Phase 2 — `checkout.html` ✅ (clean)
- Replaced the whole `<main>…</main>` (Stage A/B markup) with one section between the MAIN START/END fence. Four Stripe mount slots present: `data-stripe-contact`, `data-stripe-address-shipping`, `data-stripe-payment`, `data-stripe-address-billing`. Removed all `data-checkout-stage` / `#checkout-stage-a/b` / "Continue to payment" / collapse markup. `<head>` (Basil tag :88), header, footer, modals untouched. Only `disabled` attr left is the Pay button.

### Phase 3 — `assets/js/checkout.js` ✅ (clean — the core fix)
- Full-file replacement. Old file confirmed as the two-stage version carrying the double-writer calls (`updateShippingAddress` @199, `updateBillingAddress` @254) — the saga's root cause.
- New file: single-phase; session created on load; mounts contact / shipping (`display:{name:'split'}`) / payment (`billingDetails:'never'`) / billing elements; `syncAddressCheckbox:'billing'`; one read-only `change` listener gates the Pay button + paints totals; `applyPromotionCode` only.
- **Verified by grep:** ZERO `update*` calls; all four mount slots referenced; no `defaultValues`, no `initCheckoutElementsSdk`; clean `/cart` + `/complete` URLs.

### Phase 4 — `cart.html` + `cart.js` + `product.js` ✅
- **4.1** `cart.html`: 3-field form → single email field ("Join the Firelight Council"). `data-cart-prefill` + `name="email"` preserved so JS selectors resolve.
- **4.2a** `prefillEmailName` → `prefillEmail` (email only) + call site at :19.
- **4.2b** dropped the `name`/`phone` reads + sessionStorage writes; reserve body now sends `email` only.
- **4.2c** 409 handler rewritten for `[{ product_id, slug }]` objects (was treating them as slug strings) — matches by `product_id`-or-`slug`, strips by `product_id`.
- **4.2d** redirect `/checkout.html` → `/checkout` (:194); header comment (line 3) updated.
- **4.3** `product.js` buy-now `/cart.html` → `/cart`.
- **Verified by grep:** no `prefillEmailName`/`unavailableSlugs`/`checkout_name`/`checkout_phone`/`.html` residue; `cart.html` has only email inputs.
- **Minor deviation (beyond the packet's explicit edits):** also corrected the stale `cart.js:2` header comment ("prefills email/name" → "prefills email") — the packet's 4.2d only named line 3; line 2 was left mentioning the now-removed name field. Comment-only, no behavior change. Recorded per the no-mixed-truth rule.

### Phase 5 — merchant new-order email ✅
- **5.1** added `NewOrderNotificationArgs` + `newOrderNotificationEmailHtml` to `api/_emails/index.ts` in the 153→155 gap (uses module-private `shell()` / `escapeHtml()`).
- **5.2a** imported `{ sendEmail, newOrderNotificationEmailHtml }` from `./_emails/index` in `webhook.ts` (same path `orders.ts` already uses).
- **5.2b** inserted the non-blocking merchant-notification block right after the orders-insert (before the cart-holds clear), inside the outer `try`, with its own try/catch. `notifyTo` hoisted to a const (B2 narrowing-across-await). Title lookup keyed by PK only (C4 — no `is_test` filter). Reads only in-scope vars: `productIds`, `items` (typed `CartItemMeta[]`), `orderRows`, `totalAmount`, `customerEmail`, `shippingAddress`, `session`, `event.id`.
- **5.4 part 1** added `ORDER_NOTIFY_EMAIL=orders@everlastingsbyemaline.com` to `.env.example` (with a one-line comment). Vercel scopes set in Step 8.
- Typecheck deferred to Step 9 (after Phase 6 — the last `api/*.ts` edit).

### Phase 6 — admin + GPT auth ✅
- **6.1** full-file replace `api/_lib/adminAuth.ts`: widened `RequireAdminResult` union (adds `{ supabase; viaApiKey: true }`); added the `PRODUCT_API_KEY` path comparing the **trimmed** `env('PRODUCT_API_KEY')` — the C1 fix, mirroring `products.ts:22` / `upload.ts:29` (a raw `process.env` read would 401 the GPT scope-locally on trailing newlines). `orders.ts` unchanged — it destructures only `supabase`, which both non-error variants carry.
- **6.2a** `admin.js` Order line appends `· <created_at locale date>` when present.
- **6.2b** `admin.js` mark-shipped now `window.confirm(...)` before submit (irreversible + emails the buyer); uses in-scope `productTitle` / `customerEmail`.
- **6.3** NO edit — verified `GPT_SETUP.md` already carries the `listOrders`/`markShipped` OpenAPI schema (224–265), the Wave 2 gate, and the trimmed-key note (427). GPT recreation is Sean's (after Phase 6 deploys).
