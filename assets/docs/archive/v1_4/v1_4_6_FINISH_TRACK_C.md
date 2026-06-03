# v1.4.6 — Finish Track C (BUILD packet)

**Initiative:** Repair checkout, simplify it to a single page, finish the order/fulfillment loop, validate end-to-end on the Vercel preview — so the store can launch and the Custom-GPT pipeline can be finalized.
**Revision driven by:** Five failed checkout rounds (see `v1_4_5_C_SESSION_REPORT.md` Rounds 1–5 + `v1_4_5_C_TESTING_BUG_LOG.md`). Root cause now isolated; planning loop ran to "exclusively executable" before any code.
**Status:** ready for execution (after Phase 0 probe fills the verified contract).
**Branch:** `dev`. Test only on the Vercel preview, never localhost.

> ⚠️ This packet is self-contained. Do NOT re-read past IMPLEMENTs/BUGS/FEEDBACK — their content is folded in here. The one historical file worth opening is the reference sample named in Phase 0.

---

## READ FIRST — the three rules that prevent a sixth failed round

1. **Trust the live Stripe.js bundle over every doc. Probe before you build (Phase 0).** The Custom-Checkout ("Basil") client API is a moving target and its public docs are wrong for the bundle we load. Across three research passes, agents insisted the init method is `initCheckoutElementsSdk` and that you must call `update*` manually — both are false here. If a doc disagrees with the Phase 0 probe, the probe wins.

2. **Never put a second writer on a Stripe element.** Stripe's mounted elements (`createShippingAddressElement`, `createBillingAddressElement`, `createPaymentElement`) collect and sync their own data to the session. Calling `checkout.updateShippingAddress()` / `updateBillingAddress()` on top of them creates two writers for the same field → `IntegrationError: …Payment Element may also be collecting this field` → `confirm()` is blocked. This single mistake caused the whole saga. There are **zero** `update*` bridge calls in the corrected client.

3. **Lead with the repo-proven calls.** The current code already proves the real surface: `stripe.initCheckout({ fetchClientSecret })` initializes, and `checkout.confirm()` runs (Round 5's error came *from* it). Write those; Phase 0 only confirms them.

---

## Diagnosis (why it broke — for context, already resolved by this plan)

- The client mounted Stripe's shipping element **and** called `checkout.updateShippingAddress()` on every change; likewise billing via the Payment Element + `updateBillingAddress()`. Double-writes → `canConfirm` stuck false / IntegrationError on confirm.
- A two-phase flow (Stage A contact → Stage B payment) added a disable-after-Continue step that grayed out fields (incl. the email), which Sean correctly flagged as broken UX. The two-phase split was built on a false premise — that a Stripe Customer object must exist before a Checkout Session. It need not.
- Earlier rounds also fixed real issues that we KEEP: Basil script tag, the `$0` `shipping_options` (makes the total resolve), the `Number.isFinite` total guard.

---

## Decisions locked (do not relitigate at build time)

- **Custom UI stays** (`ui_mode:'custom'`, Stripe elements themed to the brand). Not hosted, not embedded.
- **Single-phase `/checkout`** — session created quietly on page load; one Pay button calls `confirm()`.
- **Cart = one email-only newsletter field.** Sold-out recovery overlay keeps its own email field.
- **Email prefills from cart but stays editable.**
- **Name typed once** in shipping; billing inherits via a default-checked "same as shipping" checkbox.
- **GPT is the client's whole console** (products + orders/fulfillment). Admin panel is the backstop. GPT not built yet → extend its setup doc only.
- **Shipping manual** (Shippo suggested, not committed). System records the tracking number she provides → buyer "shipped + tracking" email (already built). No carrier API in v1.
- **Buyer order confirmation = Stripe's branded receipt** (configured in the Stripe dashboard). Only new email to build is the **merchant new-order notification**.

---

## PHASE 0 — Probe the live bundle (MANDATORY first step; fills the verified contract)

Do this before writing any checkout code. Use Claude-in-Chrome against the dev preview. The current deployed `/checkout` already calls `stripe.initCheckout(...)` and exposes `window.__checkout`, so the real object can be enumerated there.

**Reference (read once):** Stripe's official vanilla sample — `/Users/seanivore/Development/freelance-payments-dev/assets/docs/RESOURCES/stripe-sample-code/public/checkout.js`. It mounts `createPaymentElement()` + `createBillingAddressElement()` with **no** `update*` calls and confirms via the actions object. Treat its *shape* as canonical; treat its exact method names as version-dated (the probe is authoritative).

**Probe procedure:**
1. Open the preview, add a product to the cart, go to `/checkout`, and get the checkout object initialized (the current build initializes after the Stage-A "Continue"; reaching it is enough to capture `window.__checkout`). If Vercel SSO blocks the page, do the probe in a browser already authenticated to Vercel (Sean's), or pause and ask Sean — do not guess the surface.
2. In the console, capture and record verbatim:
   - `typeof Stripe(...).initCheckout` and `typeof Stripe(...).initCheckoutElementsSdk` — which exists?
   - `Object.getOwnPropertyNames(Object.getPrototypeOf(window.__checkout))` — the real method names.
   - Presence of: `createContactDetailsElement`, `createShippingAddressElement`, `createBillingAddressElement`, `createPaymentElement`, `confirm`, `loadActions`, `applyPromotionCode`, `session`, `on`.
3. Behavior checks (record pass/fail + notes):
   - **Auto-sync:** mount a shipping element, type a full address, then read `window.__checkout.session().shippingAddress` — does it populate with **no** `update*` call?
   - **billingDetails:'never':** does `createPaymentElement({ fields:{ billingDetails:'never' } })` accept the option (no throw)? AND, with only the separate billing element supplying billing, does `canConfirm` reach true / `confirm()` succeed — i.e. is `billing_address_collection:'required'` needed server-side, or not? (Record the answer; Phase 1 depends on it.)
   - **syncAddressCheckbox:** does passing `elementsOptions.syncAddressCheckbox:'billing'` render ONE "same as shipping" checkbox on the billing element? Is it checked by default? Do billing fields hide when checked? Does `confirm()` still succeed when checked?
   - **defaultValues:** does top-level `initCheckout({ defaultValues:{ email } })` show the email in the contact element, still editable? (A prior round found the *per-element* `defaultValues` form rejected — treat that as a probe result to re-confirm, and lead with the top-level form regardless.)
   - **display:{ name:'split' }:** does the shipping element render First/Last?
   - **confirm shape:** with a valid test card + complete address, call `window.__checkout.confirm()` — does it redirect to `return_url`? On a forced error, is the shape `{ type:'error', error }`?
   - **Chrome autofill:** fill the shipping element via Chrome's native autofill — does `session().shippingAddress` register it? Note any "doesn't take until change event" behavior + workaround.

**Record the results** in the "VERIFIED CONTRACT" block below (replace the bracketed expectations with observed truth). The Phase 1–3 code uses these exact tokens.

### VERIFIED CONTRACT (fill from probe; expectations in brackets are the lead hypotheses)
- Init: `[stripe.initCheckout({ fetchClientSecret: async () => secret, elementsOptions, defaultValues })]`
- Confirm: `[await checkout.confirm()]` → `[{ type:'error', error } on error; redirect on success]`
- Elements auto-sync, no `update*`: `[CONFIRMED]`
- Payment element billing off: `[createPaymentElement({ fields:{ billingDetails:'never' } })]`
- Same-as-shipping: `[elementsOptions.syncAddressCheckbox:'billing'; default-checked; hides fields]`
- Email prefill: `[top-level defaultValues:{ email }, editable]`
- Name split: `[createShippingAddressElement({ display:{ name:'split' } })]`
- Server customer: `[no customers.create / customer / customer_update / customer_email, BUT keep customer_creation:'always' so session.customer survives; webhook reads session.customer_details + session.customer]`
- Billing collection server flag: `[billing_address_collection — omit unless the probe shows confirm() needs 'required']`

If any token differs from the bracket, use the observed value and adjust Phase 1–3 accordingly. If an element/option is rejected by the bundle, fall back per the note in Phase 3.

**Acceptance:** the VERIFIED CONTRACT block is filled with observed values; no remaining brackets.

---

## PHASE 1 — Checkout server: `api/checkout.ts` (`handleSession`)

Simplify session creation. Keep `handleReserve` unchanged. **Extend `handleSessionStatus`** per Phase 1b — the `/complete` success page needs more fields than it returns today.

**Keep:** `ui_mode:'custom'`, `mode:'payment'`, `line_items`, `allow_promotion_codes:true`, `shipping_address_collection:{ allowed_countries:['US'] }`, the `$0` free-shipping `shipping_options`, `metadata:{ items: JSON.stringify(itemsMeta), session_id }`, the hold re-check that returns 410, and `return_url`.

**Change:**
- Remove the `stripe.customers.create(...)` call and the `customer` + `customer_update` + `customer_email` keys — but **KEEP `customer_creation: 'always'`**. It's valid in `payment` mode with no pre-made customer, and it preserves `session.customer` so the webhook still records `stripe_customer_id` (dropping it would null that on every order). Verified against the installed SDK + `api/webhook.ts`, which reads `session.customer`, `session.customer_details`, and `session.collected_information.shipping_details.address` — name/email/phone/shipping populate regardless of pre-creation; only `stripe_customer_id` depends on `customer_creation`.
- Remove `phone_number_collection` **iff** the Phase 0 probe shows the shipping element collects phone via `fields:{ phone:'always' }`; otherwise keep it. (Avoid asking for phone twice.)
- Only add `billing_address_collection:'required'` if the Phase 0 probe shows `confirm()` needs it with a separate billing element; default: omit.
- `return_url`: `` `${getBaseUrl(request)}/complete?session_id={CHECKOUT_SESSION_ID}` `` (drop `.html` — `cleanUrls` is on).
- The request body now only needs `{ items, session_id }`. Leave tolerant parsing of any extra fields.

**Acceptance:** `POST /api/checkout` with `{ items, session_id }` returns `{ clientSecret }`; no customer is pre-created but `session.customer` is still set (`customer_creation:'always'`); an expired/absent hold still returns 410. (`api/*.ts` compiles to CommonJS — confirm `tsc` clean.)

---

## PHASE 1b — Extend `handleSessionStatus` so `/complete` renders the order

The success page (`assets/js/complete.js`) already reads these from `/api/session-status`, but the route returns only `{ status, payment_status, customer_email }` today — so the page shows `$0.00` and no items. Extend the retrieve + response to the exact contract `complete.js` consumes:

- Retrieve with `expand: ['line_items']` (keep `payment_intent` if useful).
- Return, in addition to the current fields:
  - `customer_name`: `session.customer_details?.name ?? null`
  - `amount_total`: `session.amount_total ?? 0` (cents)
  - `shipping_cost`: `{ amount_total: session.shipping_cost?.amount_total ?? 0 }`
  - `items`: array of `{ slug, title, price }` — build by pairing `session.metadata.items` (the `[{id,slug}]` written in `handleSession`, in order) with `line_items.data` (same creation order): `title = line_items.data[i].description`, `price = line_items.data[i].amount_total`, `slug = metadata.items[i].slug`.
  - `stripe_event_id`: `session.id` (used only for the client-side Meta `Purchase` dedup; the session id is stable per order).

**Acceptance:** for a completed test session, `/api/session-status` returns name, real `amount_total`, `shipping_cost`, and an `items` array with title+price+slug; the `/complete` page then shows the correct total and line items (no `$0.00`, no empty list).

---

## PHASE 2 — Checkout page: `checkout.html`

Replace the Stage A / Stage B two-section body with ONE flow. Keep `<head>` (incl. the Basil script tag `https://js.stripe.com/basil/stripe.js`), header, footer, modals.

Order, top to bottom, inside `<main>`:
1. Breadcrumb + `<h1>Checkout</h1>`.
2. **Contact** — `<div data-stripe-contact></div>` (email mounts here).
3. **Ship to** — `<div data-stripe-address-shipping></div>` + the existing US-only restriction + address-incomplete error slots.
4. **Payment** — `<div data-stripe-payment></div>`.
5. **Bill to** — `<div data-stripe-address-billing></div>` (billing element + the same-as-shipping checkbox live here; if the probe shows billing is collected inside the Payment Element instead, this slot is unused — keep it empty/hidden per the probe outcome).
6. **Order summary** — keep `[data-checkout-line-items]`, `[data-checkout-shipping]`, `[data-checkout-total]`.
7. **Promo code** — keep `#promo-code` + `[data-promo-apply]`.
8. **Confirm & Pay** — `[data-checkout-confirm]` (starts disabled).
9. Error slots — keep `[data-checkout-error]` / `[data-checkout-error-message]` and `[data-hold-expired]`.

Remove: the `#checkout-stage-a` contact form, the "Continue to payment" button, and all `data-checkout-stage` / collapse markup. No element is ever `disabled` except the Pay button (gated by `canConfirm`).

**Acceptance:** one visible section; four Stripe mount slots present; no Stage A/B; no disable/collapse attributes.

---

## PHASE 3 — Checkout client: `assets/js/checkout.js` (full rewrite — the fix)

On `DOMContentLoaded`:
1. `getCart()`; if empty → `/cart`.
2. `getOrCreateBrowserSessionId()`; `renderOrderSummary(cart)`.
3. Wait for `window._stripePublishableKey` (existing pattern) + `typeof Stripe === 'function'`.
4. `POST /api/checkout` with `{ items: cart.map(i => ({ product_id: i.product_id, slug: i.slug })), session_id }` (the server looks up `stripe_price_id` from the DB — the client need not send it).
   - `410` → reveal `[data-hold-expired]`, redirect `/cart` after ~2s.
   - non-OK → show error.
   - OK → `{ clientSecret }`.
5. Initialize + mount using the **VERIFIED CONTRACT** tokens (lead hypotheses shown):

```js
const stripe = Stripe(window._stripePublishableKey);
const checkout = await stripe.initCheckout({
  fetchClientSecret: async () => clientSecret,
  elementsOptions: {
    appearance: { theme: 'stripe', variables: { colorPrimary: '#4A1942', fontFamily: '…brand…' } },
    syncAddressCheckbox: 'billing',
  },
  defaultValues: { email: sessionStorage.getItem('checkout_email') || undefined },
});

checkout.createContactDetailsElement().mount('[data-stripe-contact]');
checkout.createShippingAddressElement({ display: { name: 'split' }, fields: { phone: 'always' } })
        .mount('[data-stripe-address-shipping]');
checkout.createBillingAddressElement().mount('[data-stripe-address-billing]');
checkout.createPaymentElement({ fields: { billingDetails: 'never' } })
        .mount('[data-stripe-payment]');

window.__checkout = checkout; // keep for probing/debug

const confirmBtn = document.querySelector('[data-checkout-confirm]');
checkout.on('change', (session) => {
  confirmBtn.disabled = !session.canConfirm;
  const total = session.total?.total?.amount;
  if (Number.isFinite(total)) { const el = document.querySelector('[data-checkout-total]'); if (el) el.textContent = formatPrice(total); }
  const ship = session.shippingOption?.total?.amount;
  if (Number.isFinite(ship)) { const el = document.querySelector('[data-checkout-shipping]'); if (el) el.textContent = ship === 0 ? 'Free' : formatPrice(ship); }
});

confirmBtn.addEventListener('click', async () => {
  confirmBtn.disabled = true;
  const res = await checkout.confirm();
  if (res && res.type === 'error') { showError(res.error?.message || 'Payment could not be processed.'); confirmBtn.disabled = false; }
  // success → Stripe redirects to return_url
});
```

- **No `updateShippingAddress` / `updateBillingAddress` anywhere.**
- This is a FULL file rewrite — re-include the file-local helpers the page still needs: `renderOrderSummary(cart)`, `escapeHTML`, `showError`/`hideError`. There is **no** shared `setText` helper (it's file-local to complete.js/product.js), so use `.textContent` directly as shown above.
- Source the prefill email from `sessionStorage.getItem('checkout_email')` only — the old `[data-checkout-info-form]` contact form is deleted in Phase 2, so do not read from it.
- Keep the existing promo-apply wiring with its `checkout.applyPromotionCode || checkout.applyDiscount` guard (probe-confirm the method name).
- Keep the US-only restriction messaging by reading the shipping element's `change` event country (read-only; do not write back to the session).

**Fallback (only if Phase 0 shows Stripe's elements can't render the layout):** build plain HTML shipping/billing fields and push them ONCE on Pay via `checkout.updateShippingAddress(...)` / `updateBillingAddress(...)` *instead of* mounting the Stripe address elements (never both). Not expected — US-only + no company field makes the native elements sufficient.

**Acceptance:** on the preview, `/checkout` mounts contact + shipping + payment + billing with no console errors; typing a complete address + card makes `canConfirm` true; Pay completes and redirects to `/complete`. The email field is editable throughout.

---

## PHASE 4 — Cart: `cart.html` + `assets/js/cart.js`

- `cart.html`: replace the "Almost there" email/name/phone form with a single **email** newsletter field. **Keep the `data-cart-prefill` attribute on the form and `name="email"` on the input** so `cart.js`'s existing `[data-cart-prefill] input[name="email"]` selector still resolves. Keep line items, subtotal (`[data-cart-subtotal]`/`[data-cart-estimate]`), `[data-cart-checkout]`, the sold-recovery overlay, and `[data-cart-error]`.
- `cart.js`: on `[Checkout]`, read the email via `[data-cart-prefill] input[name="email"]`, `sessionStorage.setItem('checkout_email', email)`, and POST `/api/checkout/reserve` with `{ items, session_id, email }` (drop name/phone). Keep the 200→`/checkout` and GA4 `begin_checkout` paths.
- **Fix the pre-existing 409 handler in this file:** `handleReserve` returns `unavailable` as objects `{ product_id, slug }` (`api/checkout.ts`), but `cart.js` currently treats them as slug strings (`cart.find(i => i.slug === slug)`), so the recovery overlay mis-renders and sold items aren't stripped. Read `data.unavailable` as objects (`u.slug` / `u.product_id`) before `showSoldRecovery`. Phase 7.2 verifies this.

**Acceptance:** cart shows one email field; entering it + Checkout reserves the hold and lands on `/checkout` with the email pre-filled and editable.

---

## PHASE 5 — Emails: `api/webhook.ts` + `api/_emails/index.ts`

Reuse `sendEmail()` + the `shell()`/`escapeHtml()` helpers already in `api/_emails/index.ts`.

1. **Add `newOrderNotificationEmailHtml(args)`** to `api/_emails/index.ts` — it MUST live in this file because it uses the module-private `shell()` + `escapeHtml()` helpers (not exported). Follow the existing `trackingEmailHtml` pattern. Args: order id(s), buyer name, buyer email, item title(s), shipping address (formatted), total. Body = the order facts **plus a fulfillment walkthrough**: "Make a shipping label (Shippo or your preferred tool), package the piece, then tell the GPT (or open the admin Orders tab) the tracking number + carrier — that notifies the buyer automatically."
2. **Wire it in `api/webhook.ts`** inside the `checkout.session.completed` handler, after the `orders` insert and **inside the existing outer `try`** (before the final `console.log` near line 225) so a throw can't escape and 5xx. Wrap the send in its own try/catch + log on failure (the handler returns 200 after the idempotency claim — never 5xx here or Stripe retries). Send to `process.env.ORDER_NOTIFY_EMAIL`. Pull buyer name/email from `session.customer_details`, shipping from `session.collected_information?.shipping_details?.address`. (Note: `sendEmail()` adds `RESEND_REPLY_TO_EMAIL` as Reply-To on every send — harmless for this internal notice.)
3. **Buyer confirmation = Stripe receipt** — no code. (See Phase 7 checklist for the dashboard setup.)
4. **Env:** add `ORDER_NOTIFY_EMAIL` to `.env.example` and to Vercel (preview + production). Confirm `RESEND_FROM_EMAIL` is set (required by `sendEmail`).

**Acceptance:** completing a test purchase produces a `/api/webhook` 200 and an email to `ORDER_NOTIFY_EMAIL` containing the order + the fulfillment steps. The existing buyer tracking email (via `api/orders.ts` PATCH) still fires when tracking is recorded.

---

## PHASE 6 — Admin + GPT-driven fulfillment

The admin Orders panel (`assets/js/admin.js` + `admin/index.html`, backed by `api/orders.ts`) already lists orders, shows the address with a Copy button, and has a mark-shipped → tracking form that emails the buyer. Work here is *validate + expose to GPT + minor polish*.

1. **Expose order actions to the GPT.** `api/orders.ts` GET + PATCH currently call `requireAdmin(request)` (`api/_lib/adminAuth.ts`), which is JWT-only and returns `{ user, supabase }` — and orders.ts uses that returned `supabase` client for its queries. (Heads-up: `products.ts`'s `authorize()` is a *boolean with no client*, so it is NOT a drop-in here.) So **extend `requireAdmin` in `api/_lib/adminAuth.ts`** to also accept `Authorization: Bearer <PRODUCT_API_KEY>`: when matched, return the same shape with a service-role client — `{ supabase: <service-role>, viaApiKey: true }` — so the orders handlers need no change (they already destructure `{ supabase }`). Admin UI keeps its JWT path. Scope to GET list + PATCH record-tracking; log key-authed calls.
2. **Extend the GPT setup doc** `assets/docs/archive/v1_4/v1_4_5_C_GPT_SETUP.md` (the GPT isn't built yet — doc only): add OpenAPI actions `listOrders` (GET `/api/orders`) and `markShipped` (PATCH `/api/orders/:id` with `tracking_number` + `tracking_carrier`) alongside `uploadImage`/`createProduct`. `tracking_carrier` MUST be an enum of exactly `USPS | UPS | FedEx | DHL` (the API 400s on anything else — see `api/orders.ts`). Add system-prompt guidance so the GPT walks Emaline through fulfillment, normalizes her carrier wording to one of the four, and confirms before marking shipped (it emails the buyer).
3. **Admin polish (small):** a confirm step before "Mark as shipped" (it's irreversible and emails the buyer), and show the order date on the card. Nothing else (no bulk actions, inventory, RMA).

**Acceptance:** `/api/orders` GET + PATCH succeed with the Bearer key (curl test) and still work via the admin JWT; the GPT setup doc lists the two order actions; admin shows a confirm prompt + order date.

---

## PHASE 7 — Verification (all on the dev preview)

Preview: `https://everlastings-website-git-dev-everlastingsbyemaline.vercel.app`. Stripe TEST webhook already registered.

0. **`/complete` resolves clean:** open `https://<preview>/complete?session_id=test` → confirm 200 (serves `complete.html` via `cleanUrls`), not 404, before trusting the bare `/complete` in `return_url`. If it 404s, the `return_url` must use `/complete.html`.
1. **Purchase:** `/shop` → product → cart (email field) → Checkout → single-page `/checkout` → fill contact/shipping/card, leave "same as shipping" checked → Pay `4242 4242 4242 4242` → `/complete` shows the correct total + line items (Phase 1b). No console errors; total real (no `$NaN`); email editable; `canConfirm` resolves.
2. **Sold-recovery (409):** mark the cart item sold in Supabase → Checkout → recovery overlay + 10% code email. Restore `available=true` after.
3. **Hold-expiry (410):** delete the hold row (or idle 16 min) → Checkout → bounce to `/cart`.
4. **Downstream:** Vercel logs `/api/webhook` 200 for `checkout.session.completed`; Supabase `orders` row written + product `available=false`; GA4 DebugView `begin_checkout` + `purchase` (ignore the DevTools "failed" beacon labels — known artifact).
5. **Merchant email:** new-order notification arrives at `ORDER_NOTIFY_EMAIL` with the fulfillment walkthrough.
6. **Admin + tracking:** `/admin` → Orders → new order shows → mark shipped + tracking → buyer tracking email fires; copy-address works.
7. **GPT path:** curl `/api/orders` GET + PATCH with the Bearer key → records tracking + sends buyer email.
8. **Stripe receipt (dashboard checklist for Sean):** Stripe Dashboard → Settings → enable customer email receipts (live mode) + brand it (logo/colors/business info).

---

## Guardrails

- Probe-first; trust the bundle over docs. Discard `initCheckoutElementsSdk` and "must call `update*`."
- No `update*` bridges over Stripe elements.
- `api/*.ts` must compile to CommonJS (tsconfig) — ES2020 output crashes the deployed runtime, only visible on a real preview URL.
- `cleanUrls:true` — redirect/return destinations drop `.html` (`/complete`).
- Stripe test/live via Vercel env scoping; verify Production via runtime curl, not file inspection.
- Supabase schema changes via the Supabase CLI, not MCP.
- This doc = verified/post-fix truth only; no speculation; no time estimates.

---

## Out of scope / v1.1+

Branded buyer confirmation email; carrier tracking webhooks → auto delivered/ETA emails; review-request follow-up; Shippo/EasyPost label API + GPT label-buying; returning-customer address prefill; refund admin action. Meta Pixel (v1.5), launch copy placeholders, and C5 cutover (live keys, DNS, merge/tag) are Sean-owned and tracked in `v1_4_5_C_SESSION_REPORT.md`.

---

## Handoff / close-out

On completion, append to (or create) the session report per `.agent/DEV_RULES.md`: a three-column expected/planned/actual table, the filled VERIFIED CONTRACT (the real bundle surface), any deviations, and the Phase 7 results. Leave the codebase on `dev`, preview green, ready for Sean's final walkthrough.
