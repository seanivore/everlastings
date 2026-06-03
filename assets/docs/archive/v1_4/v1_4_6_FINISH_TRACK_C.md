# v1.4.6 — Finish Track C (BUILD packet)

**Initiative:** Repair checkout, simplify it to a single page, finish the order/fulfillment loop, validate end-to-end on the Vercel preview — so the store can launch and the Custom-GPT pipeline can be finalized.
**Revision driven by:** Five failed checkout rounds (`v1_4_5_C_SESSION_REPORT.md` Rounds 1–5 + `v1_4_5_C_TESTING_BUG_LOG.md`). Root cause isolated; planning loop run to "exclusively executable" before any code.
**Status:** ready for execution after the Phase 0 probe fills the VERIFIED CONTRACT.
**Branch:** `dev`. Test only on the Vercel preview, never localhost.

> ⚠️ This packet is self-contained. Every file edit below shows the **current** code and the **exact replacement**. Do NOT re-read past IMPLEMENTs/BUGS — their content is folded in here. The one historical file worth opening is the Stripe sample named in Phase 0.

---

## READ FIRST — the three rules that prevent a sixth failed round

1. **Trust the live Stripe.js bundle over every doc. Probe before you build (Phase 0).** The Custom-Checkout ("Basil") client API is a moving target and its public docs are wrong for the bundle we load. Across three research passes, agents insisted the init method is `initCheckoutElementsSdk` and that you must call `update*` manually — both are false here. If a doc disagrees with the Phase 0 probe, the probe wins.

2. **Never put a second writer on a Stripe element.** Stripe's mounted elements (`createShippingAddressElement`, `createBillingAddressElement`, `createPaymentElement`) collect and sync their own data to the session. Calling `checkout.updateShippingAddress()` / `updateBillingAddress()` on top of them creates two writers for one field → `IntegrationError: …Payment Element may also be collecting this field` → `confirm()` is blocked. This single mistake caused the whole saga. The corrected client has **zero** `update*` calls.

3. **Lead with the repo-proven calls.** The current code already proves the real surface: `stripe.initCheckout({ fetchClientSecret })` initializes, and `checkout.confirm()` runs (Round 5's error came *from* it). Write those; Phase 0 only confirms them.

---

## Diagnosis (why it broke — already resolved by this plan)

- `assets/js/checkout.js` mounted Stripe's shipping element **and** called `checkout.updateShippingAddress()` on every change (line ~199), and pushed billing via `updateBillingAddress()` from the Payment Element's change handler (line ~254). Double-writes → `canConfirm` stuck false / `IntegrationError` on confirm.
- The two-phase flow (Stage A contact → Stage B payment) added a disable-after-Continue step that grayed out fields (incl. email). It was built on a false premise — that a Stripe Customer object must exist before a Checkout Session. It need not (`api/checkout.ts` currently pre-creates one; we remove that).
- Earlier rounds also fixed real issues we KEEP: the Basil script tag, the `$0` `shipping_options` (makes the total resolve), the `Number.isFinite` total guard.

---

## Decisions locked (do not relitigate at build time)

- **Custom UI stays** (`ui_mode:'custom'`, Stripe elements themed to the brand). Not hosted, not embedded.
- **Single-phase `/checkout`** — session created quietly on page load; one Pay button calls `confirm()`.
- **Cart = one email-only newsletter field.** Sold-out recovery overlay keeps its own email field.
- **Email prefills from cart but stays editable.** No field is ever disabled.
- **Name typed once** in shipping; billing inherits via a default-checked "same as shipping" checkbox.
- **GPT is the client's whole console** (products + orders/fulfillment). Admin panel is the backstop. GPT not built yet → its setup doc (`GPT_SETUP.md`) is rebuilt separately; this packet only ships the API/auth the GPT needs.
- **Shipping manual** (Shippo suggested, not committed). System records the tracking number she provides → buyer "shipped + tracking" email (already built). No carrier API in v1.
- **Buyer order confirmation = Stripe's branded receipt** (configured in the Stripe dashboard — see SEAN MUST DO). The only new email to build is the **merchant new-order notification**.
- **Refunds = document-only in v1.** `charge.refunded` is received but no-op'd by the webhook (no status flip, no relist). Emy refunds in the Stripe dashboard; she relists manually if she wants the piece available again. Auto-handling is v1.1.

---

## SEAN MUST DO (the human-owned steps — clean checklist)

These are the things the executing agent cannot do for you. Each is short and standalone.

### Before launch validation
- [ ] **Add `ORDER_NOTIFY_EMAIL`** to Vercel (Preview **and** Production scope) = `orders@everlastingsbyemaline.com`. This is where the new merchant notification lands. (The agent adds it to `.env.example` in Phase 5.4 — you just set the real value in Vercel.)
- [ ] **Confirm `RESEND_FROM_EMAIL` is set** in Vercel (it should already be `sunkeeper@everlastingsbyemaline.com`). `sendEmail()` fails without it.
- [ ] **Phase 0 probe** needs a Vercel-authenticated browser (the preview has SSO). Either you run the probe with the agent watching, or hand it your authed browser. Do this before the agent writes any checkout code.

### Stripe dashboard (the buyer's order confirmation — no code)
- [ ] **TEST mode** (for preview validation): Settings → Emails → turn ON "Successful payments." That's the buyer receipt the `/complete` page promises.
- [ ] **Brand it**: Settings → Branding → add the logo, brand colors, business name/address so the receipt looks like Everlastings.
- [ ] **LIVE mode** (at launch): repeat both toggles in live mode. Also confirm "Refunds" email is ON (that's the refund notification to buyers).

### After Phase 6 ships (the GPT)
- [ ] **Recreate the Custom GPT** from the rebuilt `GPT_SETUP.md` (delete the old "Sunkeeper" GPT; paste fresh — it's minutes). The order actions only work once Phase 6's Bearer auth is deployed.

### Carried from `v1_4_5_C_SESSION_REPORT.md` (still yours)
- [ ] **C5 cutover** (live keys + coupon bootstrap, DNS flip, `dev→main` merge/tag) — unchanged; do after Checkpoint-C testing passes.
- [ ] **`.env.local` `PRODUCT_API_KEY` refresh** (post-rotation) so local curl + the GPT smoke test work.
- [ ] **`PLACEHOLDER:` hygiene gate**: `grep -rn 'PLACEHOLDER:' .` must return zero before launch (the 8 content placeholders in about/contact/terms/privacy are yours to fill).

---

## PHASE 0 — Probe the live bundle (MANDATORY first step; fills the VERIFIED CONTRACT)

Do this before writing any checkout code. Use Claude-in-Chrome against the dev preview. The current deployed `/checkout` already calls `stripe.initCheckout(...)` and exposes `window.__checkout` (after the Stage-A "Continue"), so the real object can be enumerated there.

**Reference (read once):** Stripe's official vanilla sample — `/Users/seanivore/Development/freelance-payments-dev/assets/docs/RESOURCES/stripe-sample-code/public/checkout.js`. It mounts `createPaymentElement()` + `createBillingAddressElement()` with **no** `update*` calls. Treat its *shape* as canonical; treat its exact method names as version-dated (the probe is authoritative).

**Probe procedure:**
1. Open the preview, add a product to the cart, go to `/checkout`, click "Continue to payment" to reach the initialized checkout object (`window.__checkout`). If Vercel SSO blocks the page, do the probe in a browser already authenticated to Vercel (Sean's), or pause and ask — do not guess the surface.
2. In the console, capture verbatim:
   - `typeof Stripe(window._stripePublishableKey).initCheckout` and `…initCheckoutElementsSdk` — which exists?
   - `Object.getOwnPropertyNames(Object.getPrototypeOf(window.__checkout))` — the real method names.
   - Presence of: `createContactDetailsElement`, `createShippingAddressElement`, `createBillingAddressElement`, `createPaymentElement`, `confirm`, `applyPromotionCode`, `applyDiscount`, `session`, `on`.
3. Behavior checks (record pass/fail + notes):
   - **Auto-sync:** mount a shipping element, type a full address, read `window.__checkout.session().shippingAddress` — populated with **no** `update*` call?
   - **`createContactDetailsElement`:** exists and mounts an email field? (Round 2 listed it among the per-type factories.)
   - **`billingDetails:'never'`:** does `createPaymentElement({ fields:{ billingDetails:'never' } })` accept the option? With only the separate billing element supplying billing, does `canConfirm` reach true / `confirm()` succeed — i.e. is `billing_address_collection:'required'` needed server-side, or not?
   - **`syncAddressCheckbox`:** does `elementsOptions.syncAddressCheckbox:'billing'` render ONE "same as shipping" checkbox on the billing element, default-checked, hiding billing fields when checked, and does `confirm()` still succeed when checked?
   - **`defaultValues`:** does top-level `initCheckout({ defaultValues:{ email } })` show the email in the contact element, editable? (A prior round found the *per-element* form rejected — confirm the top-level form.)
   - **`display:{ name:'split' }`:** does the shipping element render First/Last?
   - **confirm shape:** with a valid test card + address, `window.__checkout.confirm()` redirects to `return_url`? On a forced error, shape is `{ type:'error', error }`?
   - **Chrome autofill:** fill the shipping element via Chrome native autofill — does `session().shippingAddress` register it? Note any "doesn't take until change event" behavior + workaround.
   - **`customer_creation` under custom UI (load-bearing — Phase 1 depends on it):** create a session with `ui_mode:'custom'` + `customer_creation:'always'` + NO pre-made customer. Does the create call accept the option without throwing? On a completed test session, is `session.customer` a real `cus_…`? If it throws or `session.customer` stays null, Phase 1 **omits** `customer_creation` (the webhook tolerates a null `stripe_customer_id`).

**Record results in the VERIFIED CONTRACT** (replace bracketed expectations with observed truth). The Phase 1–3 code uses these exact tokens.

### VERIFIED CONTRACT (fill from probe; brackets are the lead hypotheses)
- Init: `[stripe.initCheckout({ fetchClientSecret, elementsOptions, defaultValues })]` — repo-proven; `initCheckoutElementsSdk` MUST NOT appear in the final code
- Confirm: `[await checkout.confirm()]` → `[{ type:'error', error } on error; redirect on success]`
- Elements auto-sync, no `update*`: `[CONFIRMED]`
- Contact element: `[createContactDetailsElement()]`
- Payment billing off: `[createPaymentElement({ fields:{ billingDetails:'never' } })]`
- Same-as-shipping: `[elementsOptions.syncAddressCheckbox:'billing'; default-checked; hides fields]`
- Email prefill: `[top-level defaultValues:{ email }, editable]`
- Name split: `[createShippingAddressElement({ display:{ name:'split' } })]`
- Promo method: `[checkout.applyPromotionCode — fallback applyDiscount]`
- Server customer: `[no customers.create / customer / customer_update / customer_email; customer_creation:'always' ONLY if the probe shows session.customer populates under ui_mode:'custom' — ELSE omit it (webhook null-guards stripe_customer_id)]`
- Phone: `[shipping fields:{ phone:'always' } collects it → remove server phone_number_collection]`
- Billing server flag: `[omit billing_address_collection unless confirm() needs 'required']`

**Acceptance:** the VERIFIED CONTRACT is filled with observed values; no remaining brackets. If a token differs, use the observed value and adjust Phases 1–3.

---

## PHASE 1 — `api/checkout.ts` `handleSession`: drop the pre-created customer

**File:** `api/checkout.ts`. Keep `handleReserve` unchanged. Extend `handleSessionStatus` per Phase 1b.

### 1.1 — Request body: stop requiring email/name/phone

**CURRENT (lines 30–37):**
```ts
    const body = (await request.json()) as {
      items?: CartItem[];
      session_id?: string;
      email?: string;
      name?: string;
      phone?: string;
    };
    const { items, session_id, email, name, phone } = body;
```
**REPLACE WITH** (tolerant of extra fields; we only need items + session_id now):
```ts
    const body = (await request.json()) as {
      items?: CartItem[];
      session_id?: string;
    };
    const { items, session_id } = body;
```

*The server resolves `stripe_price_id` from Supabase by `product_id` (lines 88–99), so the client no longer sends it and Phase 3's payloads don't include it. Leave the `CartItem.stripe_price_id?` field optional — it's simply unused server-side now.*

### 1.2 — Remove the Stripe Customer pre-creation block

**DELETE entirely (current lines 104–118):** the comment + the `const emailValid …` + `let customerId …` + `if (emailValid) { await stripe.customers.create(...) }`. We no longer create a customer up front.

### 1.3 — Simplify the session create (keep `customer_creation:'always'`)

**CURRENT (lines 120–164):** the `stripe.checkout.sessions.create({...})` call with `phone_number_collection`, the `...(customerId ? { customer, customer_update } : emailValid ? { customer_email, customer_creation } : { customer_creation })` branch, and the `.html` return_url.

**REPLACE the `create({...})` call body WITH:**
```ts
    const stripeSession = await stripe.checkout.sessions.create({
      ui_mode: 'custom',
      mode: 'payment',
      line_items,
      allow_promotion_codes: true,
      shipping_address_collection: { allowed_countries: ['US'] },
      // v1: static $0 "Free shipping" — keeps the total resolvable so canConfirm works.
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
      // customer_creation: KEEP this line ONLY if the Phase 0 probe confirms that a
      // ui_mode:'custom' session with no pre-made customer actually populates
      // session.customer when this option is set. If the probe shows the option is
      // rejected, or session.customer stays null anyway, OMIT this line — do NOT let
      // it 500 the create (that was the failure mode of the past rounds). It is safe
      // to omit: the webhook null-guards stripe_customer_id and derives its own
      // customer_id from the email-keyed customers upsert.
      customer_creation: 'always',
      metadata: {
        items: JSON.stringify(itemsMeta),
        session_id,
      },
      return_url: `${getBaseUrl(request)}/complete?session_id={CHECKOUT_SESSION_ID}`,
    });
```

**Conditional on Phase 0:**
- **`phone_number_collection`** — REMOVE it (as above) **iff** the probe confirms the shipping element collects phone via `fields:{ phone:'always' }`. If the probe shows it does not, re-add `phone_number_collection: { enabled: true },`.
- **`billing_address_collection: 'required'`** — add it **only if** the probe shows `confirm()` needs it with a separate billing element. Default: omit.

**Why this is safe (verified against `api/webhook.ts`):** the webhook reads `session.customer` (line 81), `session.customer_details` (name/email/phone, lines 80/96/97), and `session.collected_information.shipping_details.address` (line 84). All of those populate from the elements at confirm time regardless of pre-creation; only `stripe_customer_id` depends on `customer_creation`. And `stripe_customer_id` is non-load-bearing: the webhook defaults it to `null`, still upserts the customer by **email** (lines 89–113), and derives the order's `customer_id` from that upsert — not from Stripe. **So the worst case of omitting `customer_creation` is a null `stripe_customer_id`, never a broken checkout.** That is why Phase 0 treats this as a pass/fail probe, not a fixed assumption.

**Acceptance:** `POST /api/checkout` with `{ items, session_id }` returns `{ clientSecret }` (it must NOT 500 — if `customer_creation` is the reason it would, omit it per the probe); `session.customer` is set iff the probe kept `customer_creation` (else null, which the webhook tolerates); an expired/absent hold still returns 410. `tsc` clean (CommonJS output).

---

## PHASE 1b — Extend `handleSessionStatus` so `/complete` renders the order

`assets/js/complete.js` reads `customer_name`, `amount_total`, `shipping_cost.amount_total`, `items[{title,price,slug}]`, and `stripe_event_id` — but the route returns only `{ status, payment_status, customer_email }`, so the success page shows blanks and `$0.00`.

**CURRENT (lines 360–371):**
```ts
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    return Response.json(
      {
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email ?? session.customer_email ?? null,
      },
      { headers: corsHeaders(request) },
    );
```
**REPLACE WITH:**
```ts
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    });

    // Pair metadata.items (creation order) with line_items.data (same order)
    // to recover slug + title + per-line price for the success page.
    let metaItems: Array<{ id: string; slug: string }> = [];
    try {
      metaItems = JSON.parse(session.metadata?.items || '[]') as Array<{ id: string; slug: string }>;
    } catch {
      metaItems = [];
    }
    const lines = session.line_items?.data ?? [];
    const items = lines.map((li, i) => ({
      slug: metaItems[i]?.slug ?? null,
      title: li.description ?? null,
      price: li.amount_total ?? 0,
    }));

    return Response.json(
      {
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email ?? session.customer_email ?? null,
        customer_name: session.customer_details?.name ?? null,
        amount_total: session.amount_total ?? 0,
        shipping_cost: { amount_total: session.shipping_cost?.amount_total ?? 0 },
        items,
        stripe_event_id: session.id,
      },
      { headers: corsHeaders(request) },
    );
```
*(`complete.js` treats `already_subscribed` as optional — if absent it shows the newsletter prompt, which is fine. No need to add it.)*

*Note: `stripe_event_id` here is the **session** id (`cs_…`), which `complete.js` uses as the browser-side Meta `Purchase` dedup key. Meta Pixel is deferred to v1.5; when it's turned on, the webhook's server-side Purchase currently sends `event_id: event.id` (the `evt_…` id) — to dedupe browser + server it must instead send `session.id`. Latent until then; flagged so v1.5 doesn't double-count.*

**Acceptance:** for a completed test session, `/api/session-status` returns name, real `amount_total`, `shipping_cost`, and an `items` array with title+price+slug; `/complete` shows the correct total and line items (no `$0.00`, no empty list).

---

## PHASE 2 — `checkout.html`: collapse two stages into one

Replace the entire `<main>…</main>` body (current lines 149–282, the Stage A `#checkout-stage-a` form + Stage B `#checkout-stage-b` section) with ONE section. Keep `<head>` (incl. the Basil tag `https://js.stripe.com/basil/stripe.js`, line 88), header, footer, and global modals untouched.

**REPLACE the `<main>` inner (everything between `<main>` and `</main>`) WITH:**
```html
  <main>
    <div class="container section" style="max-width: 880px;">

      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span class="breadcrumb-separator">›</span>
        <a href="/cart">Cart</a><span class="breadcrumb-separator">›</span>
        <span aria-current="page">Checkout</span>
      </nav>

      <h1>Checkout</h1>
      <p style="color: var(--text-muted); font-size: var(--text-sm);">All payments are processed securely by Stripe. We never see your card number.</p>

      <!-- Contact (Stripe ContactDetails element mounts the email here; prefilled + editable) -->
      <fieldset style="border: 0; padding: 0; margin: var(--space-xl) 0 var(--space-lg);">
        <legend style="font-family: var(--font-display); font-size: var(--text-xl); margin-bottom: var(--space-md); padding: 0;">Contact</legend>
        <div data-stripe-contact style="min-height: 60px;"></div>
      </fieldset>

      <!-- Ship to (Stripe ShippingAddress element, US only, name split, phone) -->
      <fieldset style="border: 0; padding: 0; margin: 0 0 var(--space-lg);">
        <legend style="font-family: var(--font-display); font-size: var(--text-xl); margin-bottom: var(--space-md); padding: 0;">Ship to</legend>
        <div data-stripe-address-shipping style="min-height: 200px;"></div>
        <div data-restricted-country class="hidden inline-error" style="margin-top: var(--space-sm);">
          We currently only ship within the United States. <a href="/contact">Contact us</a> for international inquiries.
        </div>
        <div data-address-incomplete class="hidden inline-error" style="margin-top: var(--space-sm);">
          Please complete your shipping address.
        </div>
      </fieldset>

      <!-- Payment (Stripe Payment element; billingDetails:'never' so it does NOT collect billing) -->
      <fieldset style="border: 0; padding: 0; margin: 0 0 var(--space-lg);">
        <legend style="font-family: var(--font-display); font-size: var(--text-xl); margin-bottom: var(--space-md); padding: 0;">Payment</legend>
        <div data-stripe-payment style="min-height: 200px;"></div>
      </fieldset>

      <!-- Bill to (Stripe Billing element; syncAddressCheckbox renders the default-checked "same as shipping") -->
      <fieldset style="border: 0; padding: 0; margin: 0 0 var(--space-xl);">
        <legend style="font-family: var(--font-display); font-size: var(--text-xl); margin-bottom: var(--space-md); padding: 0;">Bill to</legend>
        <div data-stripe-address-billing style="min-height: 60px;"></div>
      </fieldset>

      <!-- Order summary -->
      <div style="margin-top: var(--space-xl); padding: var(--space-lg); background: var(--color-cream); border-radius: var(--radius-md);">
        <h3 style="margin-top: 0;">Order summary</h3>
        <div data-checkout-line-items></div>
        <div style="display: flex; justify-content: space-between; padding-top: var(--space-sm); margin-top: var(--space-sm); border-top: 1px solid rgba(0,0,0,0.1);">
          <span>Shipping</span><span data-checkout-shipping>Free</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: var(--space-sm); margin-top: var(--space-sm); border-top: 1px solid rgba(0,0,0,0.1); font-weight: 600; font-size: var(--text-lg);">
          <span>Total</span><span data-checkout-total>—</span>
        </div>
      </div>

      <!-- Promotion code -->
      <div class="form-field" style="margin-top: var(--space-lg);">
        <label class="form-label" for="promo-code">Promotion code (optional)</label>
        <div style="display: grid; grid-template-columns: 1fr auto; gap: var(--space-sm);">
          <input id="promo-code" name="promo_code" type="text" placeholder="Enter code">
          <button type="button" class="btn btn-secondary" data-promo-apply>Apply</button>
        </div>
      </div>

      <!-- Confirm & Pay -->
      <button type="button" class="btn btn-primary btn-lg btn-block" data-checkout-confirm disabled style="margin-top: var(--space-xl);">Confirm &amp; Pay</button>

      <!-- Generic checkout error (decline, intent fail, network) -->
      <div data-checkout-error class="hidden error-state" style="margin-top: var(--space-md);">
        <p data-checkout-error-message>Something went awry. Please try again.</p>
      </div>

      <!-- Hold expired (410) -->
      <div data-hold-expired class="hidden error-state" style="margin-top: var(--space-md);">
        <h3>Your reservation timed out.</h3>
        <p>Please return to your cart to re-check availability.</p>
        <a href="/cart" class="btn btn-primary" style="margin-top: var(--space-sm);">Back to Cart</a>
      </div>

      <p style="margin-top: var(--space-2xl); font-size: var(--text-sm); color: var(--text-muted); text-align: center;">
        Secure payment processing by Stripe · No cards stored on our servers
      </p>

    </div>
  </main>
```

**What changed:** the hand-built `#checkout-info-form` (email/name/phone) is gone — the **Contact element** collects email now. Stage A/B split and all `data-checkout-stage`, `#checkout-stage-a/b`, the "Continue to payment" button, and the collapse markup are removed. New slots added: `data-stripe-contact` and `data-stripe-address-billing`. `data-stripe-address-shipping`, `data-stripe-payment`, order summary, promo, confirm, and error slots are retained.

**If Phase 0 shows billing stays inside the Payment Element** (no separate billing element): delete the "Bill to" fieldset and skip mounting the billing element in Phase 3.

**Acceptance:** one visible section; four Stripe mount slots present (`contact`, `address-shipping`, `payment`, `address-billing`); no Stage A/B; no `disabled`/collapse attributes except the Pay button.

---

## PHASE 3 — `assets/js/checkout.js`: full rewrite (the fix)

This is a **full file replacement.** The new file creates the session on load, mounts Stripe's own elements, and has **zero `update*` calls.** Method names/options in brackets are the Phase-0 lead hypotheses — swap to observed values if they differ.

**REPLACE the entire file with:**
```js
// assets/js/checkout.js
// Single-phase Stripe Custom Checkout (Basil). The session is created quietly on
// page load; Stripe's own elements own ALL field collection and auto-sync to the
// session. There are NO update* bridges (the double-writer bug that burned 5 rounds).
// One Pay button → checkout.confirm(). 410 (hold expired) → bounce to /cart.
// 409 is owned by cart.js and never reached here.

document.addEventListener('DOMContentLoaded', async () => {
  const cart = getCart();
  if (cart.length === 0) {
    window.location.href = '/cart';
    return;
  }
  const sessionId = getOrCreateBrowserSessionId();
  renderOrderSummary(cart);

  // Wait for /api/config → Stripe publishable key (main.js initConfig) + Stripe.js.
  for (let i = 0; i < 80 && !window._stripePublishableKey; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!window._stripePublishableKey) { showError('Could not load checkout. Please refresh.'); return; }
  if (typeof Stripe !== 'function') { showError('Could not load Stripe. Please refresh.'); return; }

  // Create the Checkout Session (single-phase). 410 → hold expired → /cart.
  let clientSecret;
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map((i) => ({ product_id: i.product_id, slug: i.slug })),
        session_id: sessionId,
      }),
    });
    if (res.status === 410) {
      document.querySelector('[data-hold-expired]')?.classList.remove('hidden');
      setTimeout(() => { window.location.href = '/cart'; }, 2200);
      return;
    }
    if (!res.ok) { showError('Something went awry. Please try again.'); return; }
    const data = await res.json();
    clientSecret = data.clientSecret;
  } catch (err) {
    showError('Could not reach the server. Please refresh.');
    return;
  }
  if (!clientSecret) { showError('Checkout not ready. Please refresh.'); return; }

  const stripe = Stripe(window._stripePublishableKey);

  // ---- VERIFIED CONTRACT tokens (Phase 0). Lead with repo-proven calls. ----
  const checkout = await stripe.initCheckout({
    fetchClientSecret: async () => clientSecret,
    elementsOptions: {
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#4A1942',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      },
      // Renders ONE default-checked "same as shipping" checkbox on the billing element. (PROBE)
      syncAddressCheckbox: 'billing',
    },
    // Top-level prefill: shows in the contact element, stays editable. (PROBE)
    defaultValues: { email: sessionStorage.getItem('checkout_email') || undefined },
  });

  if (typeof window !== 'undefined') window.__checkout = checkout; // keep for probing/debug

  // Mount Stripe's elements. They auto-sync to the session — NO update* calls anywhere.
  checkout.createContactDetailsElement().mount('[data-stripe-contact]');
  checkout
    .createShippingAddressElement({ display: { name: 'split' }, fields: { phone: 'always' } })
    .mount('[data-stripe-address-shipping]');
  checkout.createBillingAddressElement().mount('[data-stripe-address-billing]');
  checkout
    .createPaymentElement({ fields: { billingDetails: 'never' } })
    .mount('[data-stripe-payment]');

  const confirmBtn = document.querySelector('[data-checkout-confirm]');

  // Read-only listener: gate the Pay button, paint totals, and surface US-only / incomplete states.
  // NEVER write back to the session here.
  checkout.on('change', (session) => {
    if (confirmBtn) confirmBtn.disabled = !session.canConfirm;

    const total = session.total?.total?.amount;
    if (Number.isFinite(total)) setText('[data-checkout-total]', formatPrice(total));

    const ship = session.shippingOption?.total?.amount;
    if (Number.isFinite(ship)) setText('[data-checkout-shipping]', ship === 0 ? 'Free' : formatPrice(ship));

    // US-only messaging (server enforces allowed_countries; this is just UX).
    const country = session.shippingAddress?.address?.country;
    document.querySelector('[data-restricted-country]')?.classList.toggle('hidden', !(country && country !== 'US'));
  });

  wirePromo(checkout);

  confirmBtn?.addEventListener('click', async () => {
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    const label = confirmBtn.textContent;
    confirmBtn.textContent = 'Processing…';
    hideError();
    try {
      const result = await checkout.confirm();
      if (result && result.type === 'error') {
        showError(result.error?.message || 'Payment could not be processed.');
        confirmBtn.disabled = false;
        confirmBtn.textContent = label;
      }
      // On success Stripe redirects to return_url (/complete?session_id=…).
    } catch (err) {
      showError(`Payment could not be processed: ${err?.message || 'unknown error'}`);
      confirmBtn.disabled = false;
      confirmBtn.textContent = label;
    }
  });
});

function renderOrderSummary(cart) {
  const lineEl = document.querySelector('[data-checkout-line-items]');
  if (lineEl) {
    lineEl.innerHTML = cart.map((item) => `
      <div style="display: flex; justify-content: space-between; padding: var(--space-sm) 0;">
        <span>${escapeHTML(item.title || 'Item')}</span>
        <span>${formatPrice(item.price || 0)}</span>
      </div>
    `).join('');
  }
  const totalEl = document.querySelector('[data-checkout-total]');
  if (totalEl) totalEl.textContent = formatPrice(getCartTotal());
}

function wirePromo(checkout) {
  const promoBtn = document.querySelector('[data-promo-apply]');
  const promoInput = document.getElementById('promo-code');
  if (!promoBtn || !promoInput) return;
  promoBtn.addEventListener('click', async () => {
    const code = promoInput.value.trim();
    if (!code) return;
    promoBtn.disabled = true;
    const original = promoBtn.textContent;
    promoBtn.textContent = 'Applying…';
    try {
      const apply = checkout.applyPromotionCode || checkout.applyDiscount;
      if (typeof apply === 'function') {
        const r = await apply.call(checkout, code);
        if (r?.type === 'error') showError(r.error?.message || 'Could not apply this code.');
      }
    } catch (err) {
      showError('Could not apply this code. Please try again.');
    } finally {
      promoBtn.disabled = false;
      promoBtn.textContent = original;
    }
  });
}

function setText(sel, val) {
  const el = document.querySelector(sel);
  if (el && val !== undefined && val !== null) el.textContent = val;
}
function showError(msg) {
  const err = document.querySelector('[data-checkout-error]');
  const msgEl = document.querySelector('[data-checkout-error-message]') || err;
  if (!err || !msgEl) return;
  msgEl.textContent = msg;
  err.classList.remove('hidden');
}
function hideError() {
  document.querySelector('[data-checkout-error]')?.classList.add('hidden');
}
function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

- **No `updateShippingAddress` / `updateBillingAddress` anywhere.** If the probe shows an address must be pushed (it should not — the elements own collection), that is the *only* legitimate `update*` use and must replace the mounted element, never sit on top of it.
- `getCart`, `getCartTotal`, `getOrCreateBrowserSessionId`, `formatPrice` come from `main.js` (already global; the current file uses them).
- The prefill email is sourced ONLY from `sessionStorage.getItem('checkout_email')` (the old `[data-checkout-info-form]` is deleted).
- **If the Phase 0 probe shows `initCheckout` rejects or ignores top-level `defaultValues`:** drop the `defaultValues` key entirely — email prefill is optional and must NEVER block init or throw. Do not inject the email via an `update*` call.

**Fallback (only if Phase 0 shows Stripe's elements can't render the layout):** build plain HTML shipping/billing fields and push them ONCE on Pay via `checkout.updateShippingAddress(...)` / `updateBillingAddress(...)` *instead of* mounting the Stripe address elements (never both). Not expected — US-only + no company field makes the native elements sufficient.

**Acceptance:** `/checkout` mounts contact + shipping + payment + billing with no console errors; typing a complete address + card makes `canConfirm` true; Pay completes and redirects to `/complete`. The email field is editable throughout.

---

## PHASE 4 — Cart: `cart.html` + `assets/js/cart.js`

### 4.1 — `cart.html`: email-only newsletter field

**CURRENT (lines 182–200):** the "Almost there" `<section>` with the 3-field `#cart-prefill-form` (email/name/phone).

**REPLACE that `<section>` WITH:**
```html
        <!-- Email capture (optional). Prefills the checkout contact field + holds the cart. -->
        <section style="margin-top: var(--space-xl); padding: var(--space-lg); border: 1px solid var(--color-fog); border-radius: var(--radius-md);">
          <h3 style="margin-top: 0;">Join the Firelight Council</h3>
          <p style="color: var(--text-secondary); font-size: var(--text-sm);">Save your email for first look at new havens and order updates. Not required to check out.</p>
          <form id="cart-prefill-form" data-cart-prefill style="display: grid; gap: var(--space-md); max-width: 420px;">
            <div class="form-field" style="margin: 0;">
              <label class="form-label visually-hidden" for="cart-email">Email</label>
              <input id="cart-email" name="email" type="email" autocomplete="email" placeholder="Your email">
            </div>
          </form>
        </section>
```
**Keep `data-cart-prefill` on the form and `name="email"` on the input** so the JS selector still resolves. Keep line items, subtotal block, `data-cart-checkout`, the sold-recovery overlay, and `data-cart-error`.

### 4.2 — `cart.js`: email-only prefill + fix the 409 handler + clean redirect

**(a) Replace `prefillEmailName` (lines 82–89) — which currently sets email, name, AND phone from sessionStorage — WITH (email only):**
```js
function prefillEmail() {
  const emailInput = document.querySelector('[data-cart-prefill] input[name="email"]');
  if (emailInput) emailInput.value = sessionStorage.getItem('checkout_email') || '';
}
```
and update its call site in `DOMContentLoaded` (line 19) from `prefillEmailName();` to `prefillEmail();`.

**(b) In `onCheckoutClick` (lines 119–209):** drop the name/phone reads + sessionStorage writes; keep email. Replace lines 130–135 WITH:
```js
  const email = (document.querySelector('[data-cart-prefill] input[name="email"]')?.value || '').trim();
  if (email) sessionStorage.setItem('checkout_email', email);
```
and the reserve `body` (lines 143–149) WITH:
```js
      body: JSON.stringify({
        items: cart.map((i) => ({ product_id: i.product_id, slug: i.slug })),
        session_id,
        email: email || undefined,
      }),
```

**(c) FIX the 409 handler (lines 151–179).** The API returns `unavailable` as `[{ product_id, slug }]` objects; the current code treats them as slug strings, so nothing is stripped and the overlay mis-renders. **REPLACE the 409 block WITH:**
```js
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      const unavailable = Array.isArray(data.unavailable) ? data.unavailable : []; // [{ product_id, slug }]
      const unavailableItems = unavailable.map((u) => {
        const item = cart.find((i) => i.product_id === u.product_id || i.slug === u.slug);
        return item
          ? { slug: u.slug, title: item.title, thumbnail: item.thumbnail }
          : { slug: u.slug, title: u.slug };
      });
      // Strip sold items from localStorage cart.
      unavailable.forEach((u) => {
        const item = cart.find((i) => i.product_id === u.product_id || i.slug === u.slug);
        if (item) removeFromCart(item.product_id);
      });
      // Re-render remaining items (if any).
      const remaining = getCart();
      if (remaining.length === 0) {
        document.querySelector('[data-cart-with-items]')?.classList.add('hidden');
        document.querySelector('[data-cart-empty]')?.classList.remove('hidden');
      } else {
        renderLineItems(remaining, document.querySelector('[data-cart-with-items]'));
        updateTotals();
        wireRemoveButtons();
      }
      showSoldRecovery({ unavailable: unavailableItems, related: data.related || [] });
      btn.disabled = false;
      btn.textContent = originalLabel;
      return;
    }
```

**(d) Clean redirect:** change `window.location.href = '/checkout.html';` (line 203) to `window.location.href = '/checkout';`.

**Acceptance:** cart shows one email field; entering it + Checkout reserves the hold and lands on `/checkout` with the email pre-filled and editable; a 409 strips the sold item and shows the recovery overlay correctly (Phase 7.2).

---

## PHASE 5 — Emails: merchant new-order notification

### 5.1 — Add `newOrderNotificationEmailHtml` to `api/_emails/index.ts`

It MUST live here — it uses the module-private `shell()` + `escapeHtml()`. **ADD after `cartRecoveryCouponEmailHtml` (before `SendEmailOpts`):**
```ts
export interface NewOrderNotificationArgs {
  sessionId: string;
  buyerName: string | null;
  buyerEmail: string | null;
  items: Array<{ title: string; price: number }>; // price in cents
  shippingAddressText: string | null;
  total: number; // cents
}

export function newOrderNotificationEmailHtml(args: NewOrderNotificationArgs): { subject: string; html: string } {
  const name = escapeHtml(args.buyerName || 'Unknown');
  const email = escapeHtml(args.buyerEmail || 'unknown');
  const total = `$${(args.total / 100).toFixed(2)}`;
  const itemsHtml = args.items.length
    ? `<ul style="margin:0 0 16px 0;padding-left:20px;">${args.items
        .map((i) => `<li style="margin:0 0 6px 0;">${escapeHtml(i.title)} — $${(i.price / 100).toFixed(2)}</li>`)
        .join('')}</ul>`
    : '<p style="margin:0 0 16px 0;">(no line items)</p>';
  const addr = args.shippingAddressText
    ? `<pre style="font-family:ui-monospace,Menlo,monospace;background:#f6f4ef;padding:12px;border-radius:4px;white-space:pre-wrap;">${escapeHtml(args.shippingAddressText)}</pre>`
    : '<p style="margin:0 0 16px 0;">No shipping address on file.</p>';

  const body = `
<h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;color:#2a2a2a;">New order — ${total}</h1>
<p style="margin:0 0 8px 0;"><strong>${name}</strong> &lt;${email}&gt;</p>
<p style="margin:16px 0 8px 0;">Items:</p>${itemsHtml}
<p style="margin:16px 0 8px 0;">Ship to:</p>${addr}
<p style="margin:24px 0 8px 0;font-weight:bold;">To fulfill this order:</p>
<ol style="margin:0 0 16px 0;padding-left:20px;">
  <li style="margin:0 0 6px 0;">Make a shipping label (Shippo or your preferred tool) for the address above.</li>
  <li style="margin:0 0 6px 0;">Package the piece.</li>
  <li style="margin:0 0 6px 0;">Tell the Sunkeeper GPT (or open the admin Orders tab) the tracking number + carrier — that emails the buyer automatically.</li>
</ol>
<p style="margin:24px 0 0 0;font-size:13px;color:#7a6f5f;">Order reference: ${escapeHtml(args.sessionId)}</p>
`;

  return { subject: `New order — ${total} — ${name}`, html: shell(body) };
}
```

### 5.2 — Wire it into `api/webhook.ts`

**(a)** Change the email import (line 1 region — webhook.ts currently imports no email helpers). **ADD near the top imports:**
```ts
import { sendEmail, newOrderNotificationEmailHtml } from './_emails/index';
```

**(b)** Insert the send **right after the orders insert block** (after current line 174, the `if (orderInsertErr) {...}` close) and **inside the existing outer `try`** (before the cart-holds clear). It must never throw out — own try/catch, log on failure:
```ts
    // Merchant new-order notification (non-blocking — never 5xx here or Stripe retries).
    if (process.env.ORDER_NOTIFY_EMAIL) {
      try {
        const { data: titleRows } = await supabase
          .from('products')
          .select('id, title')
          .eq('is_test', isTest)
          .in('id', productIds);
        const titleMap = new Map((titleRows || []).map((r) => [r.id, r.title as string | null]));
        const notifyItems = items.map((it, idx) => ({
          title: titleMap.get(it.id) || it.slug,
          price: orderRows[idx]?.amount ?? 0,
        }));
        const a = shippingAddress as Record<string, string | null> | null;
        const shippingAddressText = a
          ? [
              session.customer_details?.name ?? null,
              a.line1, a.line2,
              [a.city, a.state, a.postal_code].filter(Boolean).join(', '),
              a.country,
            ].filter(Boolean).join('\n')
          : null;
        const { subject, html } = newOrderNotificationEmailHtml({
          sessionId: session.id,
          buyerName: session.customer_details?.name ?? null,
          buyerEmail: customerEmail,
          items: notifyItems,
          shippingAddressText,
          total: totalAmount,
        });
        await sendEmail({ to: process.env.ORDER_NOTIFY_EMAIL, subject, html });
      } catch (notifyErr) {
        console.error(`New-order notification failed for ${event.id} (non-blocking):`, notifyErr);
      }
    }
```
*(`productIds`, `items`, `orderRows`, `totalAmount`, `customerEmail`, `shippingAddress`, `session` are all already in scope at that point.)*

*(Per-line `price` in the merchant email is best-effort — the same split logic the order rows use; the email's `total` is authoritative.)*

### 5.3 — Buyer confirmation = Stripe receipt (no code; see SEAN MUST DO).

### 5.4 — Env var (agent edit)

Add `ORDER_NOTIFY_EMAIL=orders@everlastingsbyemaline.com` to `.env.example` so the variable is documented in-repo. Sean sets the real value in Vercel (Preview + Production) per SEAN MUST DO. `RESEND_FROM_EMAIL` must also be set (it already is). If `ORDER_NOTIFY_EMAIL` is unset at runtime the merchant-email block is skipped silently — so confirm it's set before Phase 7.5.

**Acceptance:** completing a test purchase produces `/api/webhook` 200 and an email to `ORDER_NOTIFY_EMAIL` with the order facts + fulfillment steps. The existing buyer tracking email (via `api/orders.ts` PATCH) still fires when tracking is recorded.

---

## PHASE 6 — Admin + GPT-driven fulfillment

The admin Orders panel (`assets/js/admin.js` + `admin/index.html`, backed by `api/orders.ts`) already lists orders, shows the address with a Copy button, and has a mark-shipped → tracking form that emails the buyer. Work here is *expose to GPT + small polish.*

### 6.1 — Extend `requireAdmin` to accept the GPT's Bearer key

`api/orders.ts` GET + PATCH call `requireAdmin(request)` and destructure `{ supabase }`. Today that's JWT-only. Add a `PRODUCT_API_KEY` path returning the same `{ supabase }` shape (service-role), so the handlers need **no** change.

**File `api/_lib/adminAuth.ts` — REPLACE the whole file WITH:**
```ts
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { corsHeaders } from './cors';

export type RequireAdminResult =
  | { user: User; supabase: SupabaseClient; viaApiKey?: false }
  | { supabase: SupabaseClient; viaApiKey: true }
  | { error: Response };

export async function requireAdmin(request: Request): Promise<RequireAdminResult> {
  const unauthorized = (message: string): Response =>
    new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
    });

  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { error: unauthorized('Unauthorized') };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { error: unauthorized('Unauthorized') };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Path 1 — server-to-server / Custom GPT via PRODUCT_API_KEY (service-role client).
  const apiKey = process.env.PRODUCT_API_KEY;
  if (apiKey && token === apiKey) {
    console.log('requireAdmin: authorized via PRODUCT_API_KEY');
    return { supabase, viaApiKey: true };
  }

  // Path 2 — admin UI via Supabase JWT.
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { error: unauthorized('Unauthorized') };
  }
  return { user: data.user, supabase };
}
```
`api/orders.ts` is unchanged (it already does `if ('error' in auth) return auth.error; const { supabase } = auth;`). Both non-error variants carry `supabase`. The `is_test` scoping in orders.ts still applies to key-authed calls (good — the GPT only sees its environment's rows).

### 6.2 — Admin polish (`assets/js/admin.js`)

**(a) Show the order date.** In `buildOrderCard`, the "Order" line (line 608) — REPLACE:
```js
      <p><span class="label">Order</span> ${escapeHtml(orderIdShort)} · ${escapeHtml(productTitle)} · ${totalLabel}</p>
```
WITH:
```js
      <p><span class="label">Order</span> ${escapeHtml(orderIdShort)} · ${escapeHtml(productTitle)} · ${totalLabel}${order.created_at ? ` · ${escapeHtml(new Date(order.created_at).toLocaleDateString())}` : ''}</p>
```

**(b) Confirm before mark-shipped** (it's irreversible and emails the buyer). In the `shipForm` submit handler (lines 628–633) — REPLACE:
```js
    shipForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const trackingNumber = card.querySelector('.ship-tracking').value.trim();
      const carrier = card.querySelector('.ship-carrier').value;
      submitShip(order.id, trackingNumber, carrier, card);
    });
```
WITH:
```js
    shipForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const trackingNumber = card.querySelector('.ship-tracking').value.trim();
      const carrier = card.querySelector('.ship-carrier').value;
      const confirmed = window.confirm(
        `Mark "${productTitle}" as shipped and email ${customerEmail || 'the buyer'} their ${carrier} tracking number? This can't be undone.`,
      );
      if (!confirmed) return;
      submitShip(order.id, trackingNumber, carrier, card);
    });
```
(`productTitle` and `customerEmail` are already in scope in `buildOrderCard`.)

Nothing else (no bulk actions, inventory, or RMA in v1).

### 6.3 — GPT order Actions (documented in `GPT_SETUP.md`; schema shown here for the build)

The GPT calls these with `Authorization: Bearer <PRODUCT_API_KEY>` (now accepted via 6.1). The OpenAPI to add to the GPT's schema:
```yaml
  /api/orders:
    get:
      operationId: listOrders
      summary: List orders for fulfillment. Optional status filter and free-text search.
      parameters:
        - in: query
          name: status
          schema: { type: string, enum: [needs_shipping, shipped] }
          description: Filter to orders awaiting shipping or already shipped.
        - in: query
          name: q
          schema: { type: string }
          description: Search by order id, customer email, or tracking number.
      responses:
        '200':
          description: Orders list.
          content:
            application/json:
              schema:
                type: object
                properties:
                  orders:
                    type: array
                    items: { type: object }
  /api/orders/{id}:
    patch:
      operationId: markShipped
      summary: Record a tracking number + carrier on an order and email the buyer automatically.
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
          description: The order UUID (from listOrders).
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [tracking_number, tracking_carrier]
              properties:
                tracking_number: { type: string }
                tracking_carrier:
                  type: string
                  enum: [USPS, UPS, FedEx, DHL]
      responses:
        '200':
          description: Tracking recorded; buyer notified.
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  email_sent: { type: boolean }
```
`tracking_carrier` MUST be exactly one of `USPS | UPS | FedEx | DHL` — `api/orders.ts` 400s on anything else. The GPT's system prompt (in `GPT_SETUP.md`) normalizes her wording ("usps", "the postal service") to one of the four and confirms before calling `markShipped` (it emails the buyer).

**Acceptance:** `/api/orders` GET + PATCH succeed with the Bearer key (curl test) and still work via the admin JWT; admin shows a confirm prompt + order date.

---

## PHASE 7 — Verification (all on the dev preview)

Preview: `https://everlastings-website-git-dev-everlastingsbyemaline.vercel.app`. Stripe TEST webhook already registered.

0. **`/complete` resolves clean:** open `https://<preview>/complete?session_id=test` → confirm 200 (serves `complete.html` via `cleanUrls`), not 404, before trusting the bare `/complete` in `return_url`. If it 404s, the `return_url` must use `/complete.html`.
1. **Purchase:** `/shop` → product → cart (email field) → Checkout → single-page `/checkout` → contact/shipping/card, leave "same as shipping" checked → Pay `4242 4242 4242 4242` → `/complete` shows the correct total + line items (Phase 1b). No console errors; total real (no `$NaN`); email editable; `canConfirm` resolves. (The order summary briefly pre-paints the cart total in dollars before Stripe's first `change` event settles it to the authoritative amount — confirm it lands correctly with no lingering stale/`$NaN` figure.)
2. **Sold-recovery (409):** mark the cart item sold in Supabase → Checkout → the sold item is stripped + recovery overlay + 10% code email (verifies the Phase 4 fix). Restore `available=true` after.
3. **Hold-expiry (410):** delete the hold row (or idle 16 min) → reload `/checkout` → bounce to `/cart`.
4. **Downstream:** Vercel logs `/api/webhook` 200 for `checkout.session.completed`; Supabase `orders` row written + product `available=false`; GA4 DebugView `begin_checkout` + `purchase` (ignore the DevTools "failed" beacon labels — known artifact).
5. **Merchant email:** new-order notification arrives at `ORDER_NOTIFY_EMAIL` with the fulfillment walkthrough.
6. **Admin + tracking:** `/admin` → Orders → new order shows (with date) → mark shipped (confirm prompt) + tracking → buyer tracking email fires; copy-address works.
7. **GPT path:** curl `/api/orders` GET + PATCH with the Bearer key → records tracking + sends buyer email.
8. **Stripe receipt:** confirm the branded receipt is configured (SEAN MUST DO) — buyer gets it on a test purchase.

---

## Error-states reference (the rewritten checkout.js must handle all of these)

Inherited from `v1_4_5_C_IMPLEMENT.md` Appendix C, mapped to the single-phase build:

| State                                | Trigger                                            | Where it surfaces                                     | Handled by                                              |
| ------------------------------------ | -------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| Cart empty                           | `getCart()` empty on load                          | redirect to `/cart`                                   | Phase 3 load guard                                      |
| Session create fails (non-410)       | `POST /api/checkout` not ok                        | `[data-checkout-error]`                               | `showError(...)`                                        |
| Hold expired (410)                   | server hold re-check fails                         | `[data-hold-expired]` → `/cart`                       | Phase 3 410 branch                                      |
| Network error reaching server        | fetch throws                                       | `[data-checkout-error]`                               | catch → `showError`                                     |
| Shipping incomplete                  | element reports incomplete                         | `[data-address-incomplete]` (or element's own inline) | element + `canConfirm` false                            |
| Address not deliverable / restricted | `session.shippingAddress.address.country !== 'US'` | `[data-restricted-country]`                           | `checkout.on('change')` toggle                          |
| Payment declined / intent fail       | `confirm()` → `{ type:'error' }`                   | `[data-checkout-error]`                               | confirm handler                                         |
| Billing/shipping mismatch            | n/a in v1                                          | —                                                     | `syncAddressCheckbox` owns billing; no manual reconcile |

`[data-address-undeliverable]` from the old markup is dropped (the Stripe element surfaces deliverability inline); if the probe shows a session-level signal for it, re-add the slot and toggle it in `checkout.on('change')`.

**Post-load race (item sells, or hold expires, *after* the page loaded — at Pay time):** the session was created on load, so a buyer who lingers then pays may hit a sold-out/expired condition that only surfaces when `confirm()` returns `{ type:'error' }`. That falls through to the generic `[data-checkout-error]` with Stripe's message — **acceptable for v1.** Do NOT add a re-reserve step or any `update*`/bridge to "fix" this (that re-introduces the double-writer that caused the saga). The friendly hold-expiry redirect intentionally only covers the page-load window.

---

## Coverage cross-check vs `v1_4_5_C_IMPLEMENT.md`

The IMPLEMENT's C1/C2/C4 (foundations, per-page wiring, SEO) shipped and are untouched here. This packet covers the C3 (cart/checkout/complete/webhook) + orders surface that the five rounds left broken:

| IMPLEMENT item                              | Status in v1.4.6                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| C3.2 `cart.js` (reserve, 409 recovery)      | Phase 4 — email-only + **409 objects-vs-strings fix**                                                         |
| C3.3 `checkout.js` (Stripe mount + confirm) | Phase 3 — full rewrite, single-phase, no bridges                                                              |
| C3.4 `complete.js` (success page)           | Phase 1b — server now returns the fields it reads                                                             |
| C3.5 Stripe webhook E2E                     | Phase 7.4 (already registered)                                                                                |
| `api/checkout.ts` session create            | Phase 1 — drop pre-created customer, keep `customer_creation`                                                 |
| `api/orders.ts` + admin Orders tab          | Phase 6 — Bearer auth for GPT + polish (exists otherwise)                                                     |
| Merchant new-order email                    | Phase 5 — **the missing launch blocker, now built**                                                           |
| Appendix A data-map                         | Re-derived from the session report's Contract Drift Catalog + the actual current HTML (Phase 2/3/4 selectors) |
| Appendix C error states                     | Error-states reference table above                                                                            |
| Buyer order confirmation                    | Stripe receipt (SEAN MUST DO) — IMPLEMENT AR #19                                                              |
| Cart-recovery / welcome emails              | Exist (`api/_emails`, `api/cart.ts`) — unchanged                                                              |

---

## Guardrails

- Probe-first; trust the bundle over docs. Discard `initCheckoutElementsSdk` and "must call `update*`."
- No `update*` bridges over Stripe elements. Ever.
- `api/*.ts` must compile to CommonJS (tsconfig) — ES2020 output crashes the deployed runtime, only visible on a real preview URL.
- `cleanUrls:true` — redirect/return destinations drop `.html` (`/complete`, `/checkout`, `/cart`).
- Stripe test/live via Vercel env scoping; verify Production via runtime curl, not file inspection.
- Supabase schema changes via the Supabase CLI, not MCP. (No schema changes needed in v1.4.6.)
- This doc = verified/post-fix truth only; no speculation; no time estimates.

---

## Out of scope / v1.1+

`charge.refunded` auto-handling (status flip + relist); branded buyer confirmation email (v1 uses the Stripe receipt); carrier tracking webhooks → auto delivered/ETA emails; review-request follow-up; Shippo/EasyPost label API + GPT label-buying; returning-customer address prefill. Meta Pixel (v1.5), launch copy placeholders, and C5 cutover (live keys, DNS, merge/tag) are Sean-owned and tracked in `v1_4_5_C_SESSION_REPORT.md`.

---

## Handoff / close-out

On completion, append to (or create) the session report per `.agent/DEV_RULES.md`: a three-column expected/planned/actual table, the filled VERIFIED CONTRACT (the real bundle surface), any deviations, and the Phase 7 results. Leave the codebase on `dev`, preview green, ready for Sean's final walkthrough.
