# Testing 1.2 — three reported issues, two real bugs

## Context

Sean ran the Bucket 1.2 real-test-card walkthrough on the dev preview and reported three symptoms in `assets/docs/archive/v1_4/v1_4_5_C_SESSION_REPORT.md:74-83`:

1. GA4 events show "FAILED" in DevTools console next to every `google-analytics.com/g/collect` POST.
2. Stage A's "Shipping address" and "Billing address" sections render only the section labels — no input fields below them.
3. `stripe.initCheckout` throws on the checkout page:
   > `IntegrationError: You must upgrade to the Basil release or higher to use initCheckout.`
   (`v1_4_5_C_TESTING_1_2_CONSOLE_LOG.md:796`)

After reading the console log, `checkout.html`, `assets/js/checkout.js`, and `api/checkout.ts`, two of the three are the **same bug**, and one is a **false alarm**.

---

## Diagnosis

### A. Stripe Basil error (root cause, real)

- `checkout.html:88` loads `https://js.stripe.com/v3/` — the standard release.
- `assets/js/checkout.js:136` calls `stripe.initCheckout(...)` — the Custom Checkout API.
- `api/checkout.ts:105-119` creates the session with `ui_mode: 'custom'`, which is the Custom Checkout server contract.

`stripe.initCheckout` (client) only exists in Stripe.js's **Basil** release channel. The standard `/v3/` URL serves an older pinned release that does not include this method, so the call fails immediately at line 136. Per Stripe versioning docs (https://docs.stripe.com/sdks/stripejs-versioning), to use Basil features the script tag must point at the Basil URL.

### B. Missing shipping/billing input fields (same root cause as A)

`checkout.html:194` and `checkout.html:212` are empty `<div>` slots (`#address-element-shipping`, `#address-element-billing`) with the `hidden` class. `assets/js/checkout.js:152-177` removes `hidden` and mounts Stripe `AddressElement` into them — but only **inside `mountStageB()` after `stripe.initCheckout` returns**. Because (A) throws on line 136, mounting never runs, and the slots stay empty under the section labels. The screenshot at `assets/docs/archive/images/checkout-shipping-billing-form-console-log.jpg` shows exactly this: labels with no fields.

This will fix itself when (A) is fixed. No HTML change needed.

### C. GA4 "Fetch failed" messages (false alarm)

The 30+ `Fetch failed loading: POST "https://www.google-analytics.com/g/collect?..."` lines are a well-known Chrome DevTools artifact, not real failures. GA4's `gtag` sends hits via `navigator.sendBeacon` and `fetch({ keepalive: true })` so they survive page navigation. Chrome's network stack labels those "failed" in the console whenever the page doesn't read the response (which the page never does for analytics), even though the hits reach Google's servers.

Evidence in the log itself: the `add_to_cart` and `view_item` beacons fire from `assets/js/main.js:118` and `assets/js/product.js:263` correctly, with full `pr1=...~pr245~qt1` ecommerce payloads — exactly what GA4 expects. The "failed" label appears on every beacon, including ones that demonstrably contain the right data.

The right verification path is the one already in the playbook (`v1_4_5_C_SESSION_REPORT.md:101`): GA4 → Admin → DebugView, with the **Google Analytics Debugger** Chrome extension enabled. DebugView shows events as they arrive at Google; DevTools console cannot.

No code change. The session-report note for Bucket 1.2 just needs a one-line clarification so future testers don't chase this.

---

## Fix

### Single edit: `checkout.html:88`

Change:
```html
<script src="https://js.stripe.com/v3/"></script>
```
to:
```html
<script src="https://js.stripe.com/basil/stripe.js"></script>
```

That is the entire code change. The Basil-release script exposes `stripe.initCheckout`, the Custom Checkout flow mounts, and the AddressElement slots populate.

### Optional alignment: `api/checkout.ts:11`

Currently `new Stripe(process.env.STRIPE_SECRET_KEY!)` — no `apiVersion` pin. The Node SDK (`stripe ^18.5.0`) is new enough to default to the Basil API version on the server side, so the session create call already returns a Basil-compatible `client_secret`. Pinning explicitly is a hardening step, not a fix:

```ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});
```

Recommend doing this in the same change so the server contract is locked to the version the client expects. (Confirm the exact dated Basil version string against the Stripe dashboard's API-version page before pinning.)

### Doc note: `v1_4_5_C_SESSION_REPORT.md` around line 78

Add a short clarification under the GA4 bullet that the "FAILED" labels in DevTools are a known sendBeacon artifact and DebugView is the only authoritative check. This prevents the next tester (Emaline or Sean) from re-filing it as a bug.

---

## Files to touch

- `checkout.html` — line 88 only.
- `api/checkout.ts` — line 11 (optional but recommended).
- `assets/docs/archive/v1_4/v1_4_5_C_SESSION_REPORT.md` — short clarification near line 78.

No JS changes. No HTML structural changes. No env-var changes.

---

## Verification

1. Commit + push to `dev`; let Vercel preview redeploy.
2. Re-run Bucket 1.2 walkthrough from `v1_4_5_C_SESSION_REPORT.md:85-104` against the new preview URL.
3. Expected at Stage A → "Continue to payment":
   - No `IntegrationError` in console.
   - `#address-element-shipping` slot fills with Stripe's hosted address form (country, name, address lines, city, state, ZIP).
   - Unchecking "Same as shipping" reveals a second Stripe address form in `#address-element-billing`.
   - Stage B reveals the Stripe `PaymentElement`.
4. Complete the purchase with test card `4242 4242 4242 4242` → land on `/complete?session_id=cs_test_...`.
5. Verify the three downstream signals exactly as the playbook already lists at `v1_4_5_C_SESSION_REPORT.md:100-103`:
   - GA4 DebugView shows `view_item`, `add_to_cart`, `begin_checkout`, `purchase` (this is what proves GA is fine; the DevTools "failed" labels can be ignored).
   - Vercel logs show 200s on `/api/webhook` for the three Stripe events.
   - Supabase `orders` has the new row; the purchased product's `available` flipped to `false`.

---

# Round 2 — wrong client method name (2026-05-28, post-deploy retest)

## Context

After Round 1 shipped (Basil script tag + centralized server pin), retesting Bucket 1.2 produced a new console error:

> `IntegrationError: Invalid initCheckout() parameter: options.clientSecret is not an accepted parameter.`
> at `mountStageB (checkout.js:136:33)`

Shipping/billing fields are still missing (same cascade as before — `mountStageB` throws before the AddressElement mounts run). Sean recalled the freelance-payments bug-hunt where the fix was tied to "init vs Checkout Sessions" and pointed to `/Users/seanivore/Development/freelance-payments-dev` as reference.

## Diagnosis

Sean's hypothesis ("should be the same checkout as the other project but we pick up the customer on the fly rather than ahead of time") is correct on architecture. Both projects use **Custom Checkout** = `stripe.checkout.sessions.create({ ui_mode: 'custom' })` server-side. Our server (`api/checkout.ts:105-119`) already does this and passes `customer_email` so Stripe creates the customer on demand from Stage A's email field. **Server contract is correct, no change needed.**

The bug is the **client-side method name**. Per Stripe's vanilla-JS docs (confirmed against https://docs.stripe.com/js/custom_checkout/init and https://docs.stripe.com/checkout/custom/quickstart):

- `stripe.initCheckout()` is a **different method** that does not accept `clientSecret` — that's why the error says exactly that.
- The correct method for Custom Checkout in **vanilla JS** is `stripe.initCheckoutElementsSdk()`. It accepts `clientSecret: string | Promise<string>`, `elementsOptions`, `defaultValues`, etc.
- The React equivalent is `<CheckoutProvider options={{ clientSecret: Promise<string> }}>` from `@stripe/react-stripe-js/checkout` (which is what freelance-payments-dev uses at `src/components/PaymentView.tsx:55-78`). Different binding, same underlying contract.

The confirm step also has a shape issue. Per docs:
```js
const { actions } = await checkout.loadActions();
const error = await actions.confirm();  // returns error object directly, or redirects
```
Our current `assets/js/checkout.js:207-208` does:
```js
const actions = await checkout.loadActions();  // missing .actions destructure
const result = await actions.confirm();        // treats result as { type, error }
```
The `actions.confirm()` return shape per docs is either undefined (success → redirect) or an error object directly, not `{ type: 'error', error }`.

## Fix

**`assets/js/checkout.js`** — three surgical changes inside `mountStageB`:

1. Line 136: rename `stripe.initCheckout(` → `stripe.initCheckoutElementsSdk(`. Options object stays identical (`clientSecret`, `elementsOptions`).
2. Line 207: destructure the loadActions return: `const { actions } = await checkout.loadActions();`
3. Line 208-213: update the error-handling shape:
   ```js
   const error = await actions.confirm();
   if (error) {
     showError(error.message || 'Payment could not be processed.');
     confirmBtn.disabled = false;
     confirmBtn.textContent = originalLabel;
   }
   // On success, Stripe redirects via return_url; this block doesn't run.
   ```

No HTML changes. No server changes. No new files. The rest of `checkout.js` (`createAddressElement`, `createPaymentElement`, `checkout.on('change')`, `applyPromotionCode`) are valid methods on the object returned by `initCheckoutElementsSdk` and stay as-is.

## Why Sean's "Custom Checkout vs Checkout Sessions API" framing maps to a method-name fix, not an API swap

- "Custom Checkout" in Stripe's terminology **is** the Checkout Sessions API with `ui_mode: 'custom'`. They are the same thing, not alternatives.
- The freelance-payments project lands on the React abstraction (`<CheckoutProvider>` + `useCheckout()`) and `checkout.confirm()` directly. That works in React because the React SDK exposes a simplified surface.
- The vanilla JS SDK we're using on this site exposes the same machinery via two methods (`initCheckoutElementsSdk` to bootstrap, `loadActions().actions.confirm()` to charge). Same flow, lower-level binding.

## Cross-checked against Sean's saved wizard walkthrough

Read `/Users/seanivore/Development/freelance-payments-dev/assets/docs/v5/v5_1_16/QUICKSTART_CHECKOUT_SESSIONS/`:
- `server.js` + `POST_API_CHECKOUT_SESSION_CREATE.md` — confirm the server uses `ui_mode: 'custom'` and returns `client_secret`. Identical to our `api/checkout.ts`.
- `App.jsx:37-43` — Stripe's React example passes `clientSecret: Promise<string>` to `<CheckoutProvider options={{ ... }}>`. Confirms `clientSecret` IS the correct param name in this universe; everlastings is just on the vanilla SDK where the method is `initCheckoutElementsSdk` instead of the React `<CheckoutProvider>` component.
- `checkoutForm.jsx:83-91` — React calls `checkout.confirm()` directly because the React hook hides the loadActions step. Vanilla JS still needs `loadActions().actions.confirm()` per Stripe's vanilla-JS docs.

Conclusion: the wizard validates the architecture; the only thing wrong on our side is the method name + the destructure shape, both inside `assets/js/checkout.js`. We do not need to adopt React or change the server.

## Rejected alternatives (so they don't get re-litigated)

- **Adopt React `<CheckoutProvider>`** — violates the everlastings "no React" architectural constraint and is a multi-day rewrite of the entire frontend for a problem that's three lines of vanilla JS.
- **Switch to Embedded Checkout (`ui_mode: 'embedded'` + `stripe.initEmbeddedCheckout`)** — Stripe takes over the whole UI; we'd lose the custom Stage A/B layout, the brand styling, and the address-element placement that Track B intentionally designed.

## Verification

1. After the patch, push to `dev` → wait for preview ● Ready.
2. Walk Bucket 1.2 from `/shop` through `/checkout`. Click "Continue to payment".
3. Expected: no IntegrationError; the Stripe AddressElement form renders inside `#address-element-shipping`; Stage B reveals; the PaymentElement renders; test card `4242 4242 4242 4242` completes; Stripe redirects to `/complete?session_id=cs_test_...`.
4. Same downstream-signal checks as Round 1 (GA4 DebugView, Vercel webhook logs, Supabase `orders` row).

## Doc note update

After the patch lands, append a short follow-up paragraph to the explanation block in `assets/docs/archive/v1_4/v1_4_5_C_SESSION_REPORT.md` (just above the existing FIXED entry for item 1) noting Round 2: "Post-Basil retest surfaced a second bug — wrong vanilla-JS method name (`initCheckout` doesn't accept `clientSecret`; the correct method is `initCheckoutElementsSdk`). Fixed at `assets/js/checkout.js:136` plus the matching `loadActions()` destructure at line 207." Keep it short — the diff and this plan file carry the full story.

---

# Round 3 — checkout session never finalizes + Stage A/B UI bugs (2026-05-28)

## Context

Round 2 got Stripe Elements mounting. Sean ran the formal walkthrough and surfaced four new issues, documented with annotated screenshots at `assets/docs/archive/v1_4/v1_4_5_C_SESSION_REPORT.md:118-136` and the five `checkout-issues-bug-round-three-*.jpg` files. Diagnosis below: **one server-side root cause cascades into three functional symptoms**, plus **three independent UI/UX bugs** in the Stage A → Stage B transition.

## Diagnosis

### Root cause (functional blocker): missing `shipping_options` on the Stripe session

`api/checkout.ts:105-119` sets `shipping_address_collection: { allowed_countries: ['US'] }` but does NOT set `shipping_options`. Stripe Custom Checkout (`ui_mode: 'custom'`) requires the session to resolve a shipping rate before it can compute a final total. With no `shipping_options` and no external shipping-rate calculation hook, the session stays in a "waiting for shipping" state indefinitely after the user enters their address. Cascade:

- `session.shippingOption.total.amount` never resolves → "Calculates by Stripe" placeholder text in `checkout.html:247` is never replaced (screenshot #7).
- `session.total.total.amount` resolves to NaN once shipping becomes required-but-unresolved → `formatPrice(NaN)` returns `"$NaN"` via `Intl.NumberFormat` (screenshot #8). Same family of bug as the freelance-payments-dev v5_1_16 NaN incident (their fix was multi-strategy fallback; ours is to remove the root cause).
- `session.canConfirm` stays false → CONFIRM & PAY button stays disabled, "LOADING PAYMENT…" label never changes (screenshots #4, #6, #9).

### UI bug 1 (independent): empty Shipping/Billing fieldsets visible in Stage A

`checkout.html:189-213` puts both `<fieldset>Shipping address...</fieldset>` and `<fieldset>Billing address...</fieldset>` inside Stage A's `#checkout-stage-a` section. The mount slots (`<div data-stripe-address-shipping class="hidden">`, etc.) are hidden, but the fieldset legends and the "Same as shipping" checkbox are visible — Sean sees blank-looking address sections that look broken (screenshot #1). The Stripe AddressElement only renders after clicking Continue, by which point Stage A's visual state has already confused the user.

### UI bug 2 (cascade from disable-all): "Same as shipping" checkbox can never be toggled in Stage B

`assets/js/checkout.js:128-130` disables every input inside `#checkout-stage-a` after the user clicks Continue. The Billing fieldset's checkbox (`#billing-same-as-shipping`) lives inside Stage A's HTML, so it gets disabled along with everything else (screenshots #3, #5 — "Same as shipping" greyed). User can never uncheck it to expose the billing AddressElement. Auto-fixed by moving the Billing fieldset to Stage B HTML.

### UX bug 3 (over-aggressive disable): optional phone field locked even when empty

Same `disable-all` loop locks the optional Phone (optional) field. Sean's correct expectation: only inputs the user actually filled should be locked (so they can't tamper with submitted data); empty optional fields should stay editable so the user can add them later if they realize they want to (e.g., adding phone for shipping carrier).

## Fix

### Server — `api/checkout.ts` + Supabase migration

**v1 strategy (Sean's call):** "Free shipping" everywhere — Emy factors shipping cost into product price. No buyer ever sees a $50 shipping fee at checkout. v1.1 will replace this with Shippo per-product calculation using product weight/dims + zip distance.

**Migration** (via Supabase CLI per [[reference_supabase_mcp_limits]]):
```sql
ALTER TABLE products ADD COLUMN shipping_cents INT NOT NULL DEFAULT 0;
```
Sets the column up so v1.1 can read per-product rates without another migration. All existing products default to 0; no app-code change needed elsewhere for v1.

**`api/checkout.ts`** — add to the `stripe.checkout.sessions.create(...)` call (~line 105):
```ts
shipping_options: [
  {
    shipping_rate_data: {
      type: 'fixed_amount',
      fixed_amount: { amount: 0, currency: 'usd' },
      display_name: 'Free shipping',
      delivery_estimate: {
        minimum: { unit: 'business_day', value: 5 },
        maximum: { unit: 'business_day', value: 10 },
      },
    },
  },
],
// TODO v1.1: replace static $0 with Shippo-calculated rate using sum of
// line_items[].shipping_cents + product weight/dims + buyer ZIP distance.
```

Single shipping_option with amount=0 satisfies Stripe's "session needs a shipping rate to resolve total" requirement. Display shows "Free shipping" in the order summary. No changes needed to `api/products.ts`, the AI product-creation pipeline, or Emy's Custom GPT for v1 — the new column defaults to 0 silently.

### HTML — `checkout.html`

Move both fieldsets out of Stage A and into Stage B, and add a Name field to Stage A so it doesn't feel sparse:

- Cut `checkout.html:189-213` (the two `<fieldset>` blocks for Shipping address and Billing address).
- Paste them into Stage B (`#checkout-stage-b`), right above the existing `<div id="payment-element">` slot at ~line 237.
- In Stage A's Contact fieldset (~lines 175-187), add a Name input **between** Email and Phone:
  ```html
  <div class="form-field">
    <label class="form-label" for="checkout-name">Full name</label>
    <input id="checkout-name" name="name" type="text" autocomplete="name" required>
    <span class="form-help">For your order confirmation.</span>
  </div>
  ```
- Stage A's final shape: Email (required) → Full name (required) → Phone (optional) → Continue button.
- Stage B reveal already does `classList.remove('hidden')` on the section, so the moved address fieldsets reveal with the rest of Stage B.

### Name pre-fill pass-through (Stage A → newsletter → Stripe)

- `assets/js/checkout.js` already has the `prefillEmail()` pattern at lines 50-55 reading from `sessionStorage.getItem('checkout_email')`. Add a parallel `prefillName()` reading from `sessionStorage.getItem('checkout_name')`.
- In `wireStageA`'s Continue handler (~lines 71-83), also read the name input, validate non-empty, and `sessionStorage.setItem('checkout_name', name)` before the fetch.
- The `/api/checkout` POST body at line 90-99 already includes `name: sessionStorage.getItem('checkout_name') || undefined` — no change needed.
- Pass the name into `stripe.createShippingAddressElement({ defaultValues: { name } })` in `mountStageB` (~line 155) so Stripe's address form pre-fills the "Full name" field. **Verify at impl time that `defaultValues` is accepted by `createShippingAddressElement`** — earlier rounds taught us not to trust doc-fetched option names. If rejected, fallback is: skip the option and let the user retype the name in the Stripe form (acceptable for v1; not a launch blocker).
- Newsletter plumbing: `api/checkout/reserve` (called by the cart's Checkout button before Stage A) already upserts the email into `subscribers`. Extending that to include `name` is a one-line later enhancement — not in scope for this round.

### JS — `assets/js/checkout.js`

Replace the disable-all loop at lines 128-130:

```js
// Before
document.querySelectorAll('[data-checkout-stage="a"] input, [data-checkout-stage="a"] button').forEach((el) => {
  el.disabled = true;
});

// After — lock only filled inputs; leave empty optional fields editable
document.querySelectorAll('[data-checkout-stage="a"] input').forEach((el) => {
  if (el.value && el.type !== 'checkbox') el.disabled = true;
});
document.querySelectorAll('[data-checkout-stage="a"] button[data-checkout-continue]').forEach((el) => {
  el.disabled = true;
});
```

Defensive: add a `Number.isFinite` guard in the `checkout.on('change')` handler (~line 187-197) so a transient NaN from Stripe never reaches `formatPrice`:

```js
checkout.on('change', (session) => {
  if (confirmBtn) confirmBtn.disabled = !session.canConfirm;
  const totalAmount = session.total?.total?.amount;
  if (Number.isFinite(totalAmount)) {
    const totalEl = document.querySelector('[data-checkout-total]');
    if (totalEl) totalEl.textContent = formatPrice(totalAmount);
  }
  const shipAmount = session.shippingOption?.total?.amount;
  if (Number.isFinite(shipAmount)) {
    const shipEl = document.querySelector('[data-checkout-shipping]');
    if (shipEl) shipEl.textContent = formatPrice(shipAmount);
  }
});
```

This is belt-and-suspenders — once `shipping_options` is set server-side, NaN shouldn't appear; the guard prevents regression.

## Files to touch

- `api/checkout.ts` — add `shipping_options` array to `sessions.create(...)` call.
- `checkout.html` — move Shipping + Billing fieldsets from Stage A to Stage B.
- `assets/js/checkout.js` — refine disable-after-Continue logic; add NaN guard in `change` handler.
- `assets/docs/archive/v1_4/v1_4_5_C_SESSION_REPORT.md` — append Round 3 note above the existing Round 2 note.

No new files. No schema changes (we're not adding a `shipping_cents` column for v1).

## Open question for Sean (will ask via AskUserQuestion before exiting plan mode)

**Shipping rate amount and tier strategy** — what should the flat rate be for launch, and is one tier enough? Common options: single "Standard $10", or two tiers ("Standard $8 / Express $20"). I'll default to a single tier for simplicity unless Sean wants otherwise.

## Verification

1. After patch, push to `dev` → wait for preview ● Ready.
2. Run Bucket 1.2 walkthrough from `/shop` through purchase.
3. **Stage A expected**: Email + Full name + Phone (optional) fields visible. No empty Shipping/Billing section legends. Continue button enabled once email + name are filled.
4. **Stage B expected**: Stripe Shipping AddressElement appears with the name pre-filled (if `defaultValues` is accepted); the "Same as shipping" checkbox is unlocked and toggling it shows/hides the Billing AddressElement; PaymentElement renders.
5. **Stage A state after Continue**: Email + Full name locked (both filled, required); Phone unlocked if left empty, locked if filled.
6. **Order summary expected**: Shipping row shows "Free shipping" with $0.00; Total resolves to product subtotal (e.g., $245.00); CONFIRM & PAY enables once Stripe is satisfied (address complete + payment method valid).
7. Confirm with test card `4242 4242 4242 4242` → Stripe redirects to `/complete?session_id=cs_test_...`.
8. Downstream-signal checks (GA4 DebugView, Vercel webhook logs 200s, Supabase `orders` row + product `available=false`) as originally documented.

If the session still doesn't finalize after shipping_options lands, fall back to `stripe listen --forward-to ...` and inspect `checkout.session.created` / `.updated` events for residual config errors — same Stripe CLI path Sean suggested in the report.
