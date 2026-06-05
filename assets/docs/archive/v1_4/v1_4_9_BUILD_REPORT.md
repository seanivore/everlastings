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

### Phase 7 — `vercel.json` keep-alive cron ✅
- Added top-level `crons: [{ path: "/api/product-feed", schedule: "0 9 * * *" }]`. `rewrites` byte-for-byte unchanged (7 entries). JSON validated. Deployable-function count still **11/12** (cron reuses an existing function — no new file). Crons run production-only → activates at launch; pre-launch the team's own activity keeps Supabase warm.

---

## Steps 8–10 — Verification & deploy

### Step 9 — Typecheck ✅
`npx tsc --noEmit -p tsconfig.json` → **clean** (CommonJS output, the deploy-runtime guardrail). Covers the `api/*.ts` edits (Phases 1/1b/5/6): the webhook `notifyTo` const-hoist (B2) and the widened `adminAuth` union both compile.

### Step 8 — `ORDER_NOTIFY_EMAIL` set in Vercel ✅
Set via `printf` (no trailing newline) to **Production** and **Preview (dev)**; `vercel env ls` confirms two rows. (Project linked: `everlastings-website`. `RESEND_FROM_EMAIL` confirmed already present in all scopes.)
- **Deviation from the packet's literal command:** the packet showed `vercel env add … preview` (all-preview); I scoped it `preview dev` to match this project's existing convention (`RESEND_FROM_EMAIL` is "Preview (dev)") and to guarantee the `dev`-branch preview we test reads it. Functionally equivalent for the test; tidier against the project's env layout.

### Step 10 — Push to `dev` → preview rebuild
Per-phase commits `7e280dc` → `100bc5d`. Pushed once after tsc clean + env var set, so the rebuild picks up `ORDER_NOTIFY_EMAIL`. Preview built **Ready** (`vercel ls`).

---

## Step 11 — Phase 8 verification (dev preview)

### What PASSED (structural — validated live in Sean's authed Chrome)
- **8.0** `/checkout` reachable via clean URL; cart→reserve(hold)→`/checkout` redirect works (no 410).
- **Checkout mounts cleanly:** all four Stripe elements render (Contact email, Ship-to with **First/Last split** via `display:{name:'split'}`, Payment with the method tabs, **Bill-to with the default-checked "Billing is same as shipping"** via `syncAddressCheckbox:'billing'`). **Zero console errors/exceptions.** No `IntegrationError` at mount — the saga's mount-time failure does NOT reproduce.
- Order summary **Total renders $185 (no `$NaN`)**; Pay button correctly **disabled** until the session is confirmable; contact **email syncs** to the session.
- Phase 4 cart: single email field renders; reserve + clean redirect work.

### 🔴 CRITICAL FINDING (8.1) — checkout still cannot confirm; root cause identified
A full purchase could **not** be completed. `canConfirm` never becomes true through normal UI use, so **Confirm & Pay stays disabled**. Diagnosed live via `window.__checkout.session()` + a `change` logger + console experiments:

**The decisive `confirm()` error** (after forcing the session full via console bridges):
> "You called confirm() while the **Address Element is mounted**, but you previously also called **updateBillingAddress()**. If you intend to use the value from the Address Element, you should not call updateBillingAddress()…"

**Evidence chain:**
- With the address typed/selected into the mounted elements, `session.shippingAddress` / `billingAddress` read null **and** `canConfirm` stayed false.
- Forcing `updateShippingAddress()` + `updateBillingAddress()` from the console → both returned `"success"` (no error) and set the session, **but `canConfirm` was still false** (change log: `cc:false` with ship+bill set).
- Adding `updatePhoneNumber()` → **`canConfirm` flipped true** (change log: `cc:true`). So the phone was the final missing requirement.
- Clicking **Confirm & Pay** then failed with the integration error above — because the mounted Address/Billing elements + my `updateBillingAddress()` are **two writers for one field**.

**Root cause (refined — narrower than "elements don't sync"):**
1. The mounted Address/Billing/Payment elements **are** the confirm-time source of truth (the error proves the Address Element holds the value). So v1.4.9's "no `update*` on address/billing" design is **correct** — calling those bridges *breaks* `confirm()`.
2. The real blocker is **`phone_number_collection: { enabled: true }`** (kept in Phase 1.3 / `api/checkout.ts`): it makes a phone **required**, but **no mounted element collects a phone** (the Contact element renders email only; Phase 0 found the Shipping element rejects `fields:{phone}`). So `canConfirm` is **unsatisfiable from the UI** → Pay never enables.

**Why Phase 0 missed it:** the probe only confirmed the elements *mount*; it explicitly deferred the typed-input→confirm round-trip to Phase 8. The phone-collection gap only surfaces at confirm/`canConfirm` time.

**Candidate fixes (Sean to decide — see handoff):**
- **A (simplest):** remove `phone_number_collection: { enabled: true }` from `api/checkout.ts` `handleSession`. No phone collected; mounted elements satisfy `canConfirm`; `checkout.js` stays bridge-free. Loses the (nice-to-have) phone.
- **B (keep phone, safe):** keep `phone_number_collection`; add a plain HTML phone `<input>` to `checkout.html` and call `checkout.updatePhoneNumber(value)` from `checkout.js` on input. This bridge is **safe** because there is **no mounted phone element to conflict** (unlike address/billing). Preserves phone for carrier questions (AR #30 intent).
- Both keep the address/billing/payment as mounted elements with **no `update*`** (required, per the confirm error).

**Residual unknown to verify before coding:** that the mounted address elements satisfy `canConfirm` *on their own* once phone is resolved (the confirm error strongly implies yes). Confirm via a clean browser test: fresh `/checkout`, fill address via the element + card via magic-fill, set **only** phone via `updatePhoneNumber` (no address bridge), then `confirm()` should succeed and redirect to `/complete`.

### PROOF the fix is correct (live, before changing code)
On a fresh `/checkout` with the address + card filled via the form (no bridges), setting **only** the phone via `updatePhoneNumber()` flipped **`canConfirm: false → true`**, the Pay button enabled (the `checkout.js` change-listener works), and **the test payment went through** → redirected to `/complete`, which rendered correctly: customer name, email, **Total $185.00**, line item, order id (**Phase 1b validated live**). So the mounted address/billing/payment elements satisfy `canConfirm` on their own; the phone requirement was the sole blocker, and `confirm()` succeeds when no `update*` is called on the mounted address elements.

### FIX APPLIED (deviation from the packet — justified by the Phase 8 finding)
- **`api/checkout.ts`**: removed `phone_number_collection: { enabled: true }` from `handleSession`'s `sessions.create`. (The packet/Phase-0 contract said keep it; Phase 8 proved it makes the Pay button permanently un-enableable because no element collects a phone. A card needs none.) `checkout.js` stays **bridge-free** (correct per the confirm() error). tsc clean.
- **`assets/js/checkout.js`**: added `friendlyPaymentError()` — buyers now get Stripe's user-safe text for `card_error`/`validation_error` and a friendly generic for integration/network errors, instead of raw Stripe jargon (Sean's catch from the live error box).
- **Phone deferred:** if Emy wants a phone later, the right approach is a real field in the Contact section + `checkout.updatePhoneNumber()` (safe — no mounted phone element to conflict). v1.1.

### Re-verification pending (on the rebuilt preview, post-fix)
- **8.1 real-buyer checkout** (no console): Pay enables on its own → confirm → `/complete`.
- **8.6 admin Orders panel**: the just-created order shows (with date) → mark shipped (Phase 6.2 confirm dialog) → buyer tracking email fires → copy-address works. *(Phase 6 code shipped; this is the live review Sean asked about.)*
- **8.4 webhook→order row + `available=false`** and **8.5 merchant email** — verify via `vercel logs` + Supabase REST `curl` (MCP is 403 on this project).
- **8.2 sold-recovery 409**, **8.3 hold-expiry 410**, **8.7 GPT Bearer curl**, **8.8 Stripe receipt**. (8.9 cron static check = done at Phase 7.)

### 🔴 SECOND FINDING (8.4/8.5/8.7) — preview Vercel SSO blocks the Stripe webhook
After the successful test payment, `orders`, `customers`, and `webhook_events` were **all empty** (Supabase REST) and Placeholder Book Nook stayed `available:true`. Root cause: a direct `POST` to `https://…git-dev…/api/webhook` returns **`401 Authentication Required` (Vercel Deployment Protection / SSO HTML wall)** — Stripe's webhook delivery is blocked before it reaches the function, so the idempotency claim + order insert never run. The Stripe test endpoint itself is correctly configured (verified via `stripe webhook_endpoints list`: `…git-dev…/api/webhook`, `checkout.session.completed`, enabled).

**This is the same SSO limitation the packet flagged for the GPT** (a third-party caller can't auth through Vercel SSO). It applies to the **Stripe webhook too** (the packet implied the webhook "works" on preview — it can't, while the preview is SSO-protected). **Production is not SSO-protected, so the webhook + GPT both work at launch** — but the order/fulfillment loop (8.4 order creation, 8.5 merchant email, the rows the admin panel 8.6 shows, 8.7 GPT curl) **cannot be verified on the protected preview** as-is.

**Options to verify now (Sean-owned — it's a security setting, agent must not toggle it):**
1. Temporarily set Vercel **Deployment Protection → off (or Production-only)** for this project → Stripe + GPT reach the preview → run the full loop once → re-enable. (Simplest; one clean pass verifies 8.1 visual + 8.4 + 8.5 + 8.6 + 8.7.)
2. **Protection Bypass for Automation**: generate the bypass secret, append `?x-vercel-protection-bypass=…` to the Stripe webhook URL (Stripe allows query params) + add the header to the GPT Action. Keeps human SSO on; more setup.
3. **Defer to launch** — accept the checkout UI as verified; verify the order loop in production at cutover (where there's no SSO). Matches how the packet already treats the GPT.
