# v1.4.9 — Finish Track C (BUILD packet)

**Initiative:** Repair checkout, simplify it to a single page, finish the order/fulfillment loop, validate end-to-end on the Vercel preview — so the store can launch and the Custom-GPT pipeline can be finalized.
**Revision driven by:** Five failed checkout rounds (`v1_4_5_C_SESSION_REPORT.md` Rounds 1–5 + `v1_4_5_C_TESTING_BUG_LOG.md`). Root cause isolated; planning loop run to "exclusively executable" before any code.
**Status:** Phase 0 probe COMPLETE (2026-06-04, dev preview) — VERIFIED CONTRACT filled with observed values below. Ready for execution of Phases 1–8.
**v1.4.9 (from v1.4.8):** folded the two repo-aware gap reviews (`v1_4_8_GAP_REVIEW_B.md` fidelity + `v1_4_8_GAP_REVIEW_C.md` integration; both verdict READY). The one real bug: the GPT Bearer-auth path now compares against the **trimmed** `env('PRODUCT_API_KEY')` — this project's Vercel vars carry trailing newlines, and raw `process.env` would 401 the GPT scope-locally. Also: the merchant-email env read is hoisted to a const (TS narrowing across `await`), the title lookup drops a redundant `is_test` filter, Phase 2 is now string-anchored on the `<!-- MAIN START/END -->` fence, the last `.html` nav is cleaned (`product.js`), and a Meta-Pixel double-count guard is added (SEAN MUST DO). **Build-ready.** v1.4.8 kept for history.
**v1.4.8 (from v1.4.7):** folded the cold/no-repo self-containment review (`v1_4_7_GAP_REVIEW_A.md`). Every delete/replace now anchors on a **quoted CURRENT block** (no edit is located by line number alone); the cross-file contracts are *shown* not asserted (`complete.js` fields, the pre-existing `available=false` write, the `orders.ts` auth consumer, the shared `cart.js`/`checkout.js` session id); the `vercel.json` example is valid JSON; and every ambient helper is quoted in an appendix. v1.4.7 kept for history.
**Branch:** `dev`. Test only on the Vercel preview, never localhost.

> ⚠️ This packet is self-contained. Every file edit below shows the **current** code and the **exact replacement**.
>
> **How to apply every edit (read once — this is the whole anti-fragility rule):** each edit quotes a **CURRENT** block verbatim from the repo, and *that quoted text is the only authoritative locator.* **Find the exact string, replace it — never trust a line number.** All line numbers here are pre-edit hints and *will* drift as you apply earlier edits in the same file (e.g. Phase 1.1 shortens `checkout.ts`, so every number below it shifts down). If a quoted CURRENT block doesn't match the file verbatim, STOP and reconcile — the repo moved under the packet. Do NOT re-read past IMPLEMENTs/BUGS — their content is folded in here.

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
- [ ] **Keep `META_PIXEL_ID` and `META_ACCESS_TOKEN` UNSET** in Preview **and** Production until v1.5. `api/config.ts` ships `metaPixelId` to the browser the moment it's set, which lights up the client-side Meta `Purchase` — keyed on the session id (`cs_…`) — while the webhook's server-side `Purchase` is keyed on the event id (`evt_…`), so the two **double-count** until the v1.5 dedup fix. Left unset, no Pixel fires at all (intended for v1).

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

**Reference (optional — NOT in this repo, not required):** Stripe's official vanilla sample lives in the **sibling** project `freelance-payments-dev` (on Sean's machine at `…/freelance-payments-dev/assets/docs/RESOURCES/stripe-sample-code/public/checkout.js`) — a fresh agent or CI checkout won't have it, so do not depend on it. You don't need to: **the VERIFIED CONTRACT below is the authoritative surface** and the probe has already superseded the sample. It is noted only as provenance — the sample mounts `createPaymentElement()` + `createBillingAddressElement()` with **no** `update*` calls, which is exactly the shape the contract confirmed.

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

### VERIFIED CONTRACT (probed live on the dev preview, 2026-06-04)

**Observed** values from the live `https://js.stripe.com/basil/stripe.js` bundle (`pk_test_…`) — not hypotheses. Phases 1–3 use these exact tokens. ✅ = confirmed in-browser; "(Phase 8)" = deferred to the filled-form verification with a test card.
- Init: `stripe.initCheckout({ fetchClientSecret, elementsOptions })` ✅ works. **`initCheckoutElementsSdk` also exists on the bundle but is the WRONG surface — it MUST NOT appear in the final code.**
- Confirm: `await checkout.confirm()` — `confirm` present; success redirects to `return_url`, errors return `{ type:'error', error }`. (Full round-trip: Phase 8.)
- Elements auto-sync, no `update*`: all four elements mount together with **NO `IntegrationError`** ✅. (Typed-address→`session.shippingAddress` sync with no `update*`: Phase 8.)
- Contact element: `createContactDetailsElement()` ✅ (a `createEmailElement()` also exists; not needed).
- Payment billing off: `createPaymentElement({ fields:{ billingDetails:'never' } })` ✅ accepted + mounts.
- Same-as-shipping: `elementsOptions.syncAddressCheckbox:'billing'` ✅ accepted; renders the default-checked **"Billing is same as shipping information"** checkbox on the billing element.
- Email prefill: ❌ **`defaultValues` is REJECTED** — `initCheckout({ defaultValues })` throws `IntegrationError: options.defaultValues is not an accepted parameter`. **Do NOT pass `defaultValues`.** Email prefill is dropped (optional); never inject via `update*` (double-writer bug).
- Name split: `createShippingAddressElement({ display:{ name:'split' } })` ✅ renders First/Last. **`fields` is REJECTED** on this element (`options.fields is not an accepted parameter`) — do NOT pass `fields:{ phone:'always' }`.
- Promo method: `checkout.applyPromotionCode(code)` ✅ present. **`applyDiscount` does NOT exist** — drop that fallback.
- Phone: shipping element rejects `fields`, so phone is collected **server-side** — **KEEP `phone_number_collection: { enabled: true }`**.
- Server customer: **OMIT `customer_creation`** — not verified to populate `session.customer` under `ui_mode:'custom'` without a deploy, and forcing it risked the 500 from past rounds. The webhook null-guards `stripe_customer_id`, so omitting is safe. (Re-add + verify in v1.1 if a Stripe Customer link is wanted.)
- Billing server flag: omit `billing_address_collection` (the separate billing element + `syncAddressCheckbox` supplies billing; confirm() reachability: Phase 8 — add `'required'` only if it's blocked).

**Acceptance:** the VERIFIED CONTRACT is filled with observed values; no remaining brackets. If a token differs, use the observed value and adjust Phases 1–3.

---

## PHASE 1 — `api/checkout.ts` `handleSession`: drop the pre-created customer

**File:** `api/checkout.ts`. Keep `handleReserve` unchanged. Extend `handleSessionStatus` per Phase 1b.

### 1.1 — Request body: stop requiring email/name/phone

**FIND this exact block** (hint: ~`checkout.ts` lines 30–37):
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

**FIND this exact block** (hint: ~`checkout.ts` lines 104–118 — it sits immediately after `const itemsMeta = …`) **and DELETE it entirely** — we no longer create a customer up front:
```ts
    // Pre-create a Stripe Customer with the contact data captured in Stage A.
    // Binding the session to a customer (vs customer_email) lets Stripe's
    // AddressElement pre-fill "Full name" from customer.name — no duplicate
    // typing for the buyer. Same pattern as the freelance-payments project.
    const emailValid = email && typeof email === 'string' && email.includes('@');
    let customerId: string | undefined;
    if (emailValid) {
      const customer = await stripe.customers.create({
        email: email!,
        ...(name && typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
        ...(phone && typeof phone === 'string' && phone.trim() ? { phone: phone.trim() } : {}),
        metadata: { session_id },
      });
      customerId = customer.id;
    }
```
(After Phase 1.1 removed `email`/`name`/`phone` from the body destructure, this block no longer compiles — so deleting it is mandatory, not optional. It is the *only* reader of `emailValid`/`customerId`, both of which the Phase 1.3 replacement also drops.)

### 1.3 — Simplify the session create (omit `customer_creation`; keep `phone_number_collection`)

**Context already in scope** (quoted so you needn't open the file — these are the names the replacement relies on): `line_items` + `itemsMeta` are built just above the customer block you deleted in 1.2, and `getBaseUrl` is a top-of-file helper:
```ts
    // checkout.ts:23–26 — top-of-file helper:
    function getBaseUrl(request: Request): string {
      const url = new URL(request.url);
      return `${url.protocol}//${url.host}`;
    }
    // …~checkout.ts:97–102, inside handleSession, just above the deleted customer block:
    const line_items = items.map((item) => {
      const product = productMap.get(item.product_id)!;
      return { price: product.stripe_price_id!, quantity: 1 };
    });
    const itemsMeta = items.map((i) => ({ id: i.product_id, slug: i.slug }));
```
*(`itemsMeta` is a **distinct** local from `metaItems` introduced in Phase 1b's `handleSessionStatus` — different function; don't conflate the two.)*

**FIND this exact call** (hint: ~`checkout.ts` lines 120–164 — the entire `const stripeSession = …` statement, including the `customerId ? … : …` branch and the `.html` return_url):
```ts
    const stripeSession = await stripe.checkout.sessions.create({
      ui_mode: 'custom',
      mode: 'payment',
      line_items,
      allow_promotion_codes: true,
      shipping_address_collection: { allowed_countries: ['US'] },
      // v1: static $0 "Free shipping" — Emy factors shipping into product price.
      // v1.1: replace with Shippo per-product rate using sum of line_items[].shipping_cents.
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
      phone_number_collection: { enabled: true },
      ...(customerId
        ? {
            customer: customerId,
            // Write the shipping address (and any name change) the buyer
            // enters in Stripe's AddressElement back to the Customer record,
            // so the customer object ends up complete for fulfillment and
            // future receipts. Required when binding a session to a customer
            // while collecting shipping/billing info.
            customer_update: {
              shipping: 'auto',
              address: 'auto',
              name: 'auto',
            },
          }
        : emailValid
          ? { customer_email: email!, customer_creation: 'always' }
          : { customer_creation: 'always' }),
      metadata: {
        items: JSON.stringify(itemsMeta),
        session_id,
      },
      return_url: `${getBaseUrl(request)}/complete.html?session_id={CHECKOUT_SESSION_ID}`,
    });
```
**REPLACE the whole statement WITH:**
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
      // Phone: the shipping element rejects `fields` (Phase 0), so collect phone server-side.
      phone_number_collection: { enabled: true },
      // customer_creation: OMITTED (Phase 0). Not verified to populate session.customer under
      // ui_mode:'custom' without a pre-made customer, and forcing it risked the 500 that burned
      // past rounds. Safe to omit: the webhook null-guards stripe_customer_id and derives
      // customer_id from the email-keyed customers upsert. (Re-add + verify in v1.1 if wanted.)
      metadata: {
        items: JSON.stringify(itemsMeta),
        session_id,
      },
      return_url: `${getBaseUrl(request)}/complete?session_id={CHECKOUT_SESSION_ID}`,
    });
```

**Conditional on Phase 0:**
- **`phone_number_collection`** — **KEPT** (`{ enabled: true }`, now in the create block above): Phase 0 confirmed the shipping element rejects `fields`, so phone is collected server-side.
- **`billing_address_collection: 'required'`** — add it **only if** the probe shows `confirm()` needs it with a separate billing element. Default: omit.

**Why this is safe (verified against `api/webhook.ts`):** the webhook reads `session.customer` (line 81), `session.customer_details` (name/email/phone, lines 80/96/97), and `session.collected_information.shipping_details.address` (line 84). All of those populate from the elements at confirm time regardless of pre-creation; only `stripe_customer_id` depends on `customer_creation`. And `stripe_customer_id` is non-load-bearing: the webhook defaults it to `null`, still upserts the customer by **email** (lines 89–113), and derives the order's `customer_id` from that upsert — not from Stripe. **So the worst case of omitting `customer_creation` is a null `stripe_customer_id`, never a broken checkout.** That is why Phase 0 treats this as a pass/fail probe, not a fixed assumption.

**Acceptance:** `POST /api/checkout` with `{ items, session_id }` returns `{ clientSecret }` (it must NOT 500 — if `customer_creation` is the reason it would, omit it per the probe); `session.customer` is set iff the probe kept `customer_creation` (else null, which the webhook tolerates); an expired/absent hold still returns 410. `tsc` clean (CommonJS output).

---

## PHASE 1b — Extend `handleSessionStatus` so `/complete` renders the order

`assets/js/complete.js` reads `customer_name`, `amount_total`, `shipping_cost.amount_total`, `items[{title,price,slug}]`, and `stripe_event_id` — but the route returns only `{ status, payment_status, customer_email }`, so the success page shows blanks and `$0.00`.

**The reader contract, quoted from `complete.js` (so field names are shown, not assumed):**
```js
  setText('[data-complete-customer-name]', data.customer_name || 'collector');     // complete.js:33
  setText('[data-complete-customer-email]', data.customer_email || 'your email');  // :34
  setText('[data-complete-total]', formatPrice(data.amount_total || 0));           // :35
  const shippingCost = (data.shipping_cost && Number.isFinite(data.shipping_cost.amount_total))
    ? data.shipping_cost.amount_total : 0;                                         // :39–41
  // then data.items[].title + .price (:47–52), data.items[].slug (:65), data.stripe_event_id (:70)
```
The Phase-1b server below returns **exactly** these keys. (`data.already_subscribed` is optional — `complete.js:82` defaults to showing the newsletter prompt when it's absent, so the server need not send it.)

**FIND this exact block** (hint: ~`checkout.ts` lines 360–371 — inside `handleSessionStatus`):
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

*(Scope check: `corsHeaders`, `stripe`, `sessionId`, and `Response` are all visible in the CURRENT block above — this edit only swaps the `retrieve` expand options and the returned object's fields; nothing new to import.)*

*Note: `stripe_event_id` here is the **session** id (`cs_…`), which `complete.js` uses as the browser-side Meta `Purchase` dedup key. The webhook's server-side `Purchase` currently sends `event_id: event.id` (the `evt_…` id) — to dedupe browser + server it must instead send `session.id`. **This mismatch is dormant only while the Meta env vars are unset:** `api/config.ts:10` returns `metaPixelId` to the browser the instant `META_PIXEL_ID` is set in any scope (no separate "v1.5 flag" gates it), so if `META_PIXEL_ID` + `META_ACCESS_TOKEN` are set before the v1.5 dedup fix, Purchases double-count immediately. Guard: keep both env vars unset until v1.5 (see SEAN MUST DO). Permanent fix (v1.5): change the webhook to send `event_id: session.id`.*

**Acceptance:** for a completed test session, `/api/session-status` returns name, real `amount_total`, `shipping_cost`, and an `items` array with title+price+slug; `/complete` shows the correct total and line items (no `$0.00`, no empty list).

---

## PHASE 2 — `checkout.html`: collapse two stages into one

Replace the entire `<main>…</main>` **element** with ONE section. It is fenced by the unique comment markers `<!-- MAIN START -->` (checkout.html:148) and `<!-- MAIN END -->` (:283); there is exactly **one** real `<main>` element (lines 149–282 — the Stage A `#checkout-stage-a` form + Stage B `#checkout-stage-b` section). (Note: `<main>` also appears in *prose* in the head comment at checkout.html:11 — do NOT match that; anchor on the MAIN START/END fence, or on the `<main>` at line 149.) Keep `<head>` (incl. the Basil tag `https://js.stripe.com/basil/stripe.js`, line 88), header, footer, and global modals untouched.

**REPLACE the whole `<main>…</main>` element (the block below INCLUDES the `<main>` and `</main>` tags — replace the element itself, not just its inner content) WITH:**
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

**Billing element — KEEP (Phase 0 RESOLVED):** the probe confirmed a separate billing element + `syncAddressCheckbox:'billing'` mounts and renders the default-checked "Billing is same as shipping". Keep the "Bill to" fieldset and mount the billing element in Phase 3 — do **not** collapse billing into the Payment Element.

**Acceptance:** one visible section; four Stripe mount slots present (`contact`, `address-shipping`, `payment`, `address-billing`); no Stage A/B; no `disabled`/collapse attributes except the Pay button.

---

## PHASE 3 — `assets/js/checkout.js`: full rewrite (the fix)

This is a **full file replacement.** The new file creates the session on load, mounts Stripe's own elements, and has **zero `update*` calls.** Every Stripe token below is a **VERIFIED CONTRACT** value (Phase 0 is complete) — there are no bracketed placeholders left to resolve; write them as-is.

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
      // Renders the default-checked "Billing is same as shipping" checkbox on the billing element. (Phase 0 ✅)
      syncAddressCheckbox: 'billing',
    },
    // NO defaultValues: Phase 0 confirmed initCheckout REJECTS it (IntegrationError:
    // options.defaultValues is not an accepted parameter). Email prefill is dropped (optional);
    // never inject the email via an update* call (that's the double-writer bug).
  });

  if (typeof window !== 'undefined') window.__checkout = checkout; // keep for probing/debug

  // Mount Stripe's elements. They auto-sync to the session — NO update* calls anywhere.
  checkout.createContactDetailsElement().mount('[data-stripe-contact]');
  checkout
    // Phase 0: `fields` is rejected on this element; phone is collected server-side (phone_number_collection).
    .createShippingAddressElement({ display: { name: 'split' } })
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

    // session.total.total.amount / session.shippingOption.total.amount are the standard Basil
    // Custom-Checkout session shape. NOTE: this shape was NOT separately captured in the Phase 0
    // probe — it is verified FUNCTIONALLY at Phase 8.1 (apply a promo, confirm this Total drops).
    // The optional chaining is deliberate: if the shape ever differs, the pre-painted cart total
    // stands in rather than printing $NaN — and Phase 8.1 catches a wrong accessor.
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
      const apply = checkout.applyPromotionCode; // Phase 0: applyDiscount does not exist on the bundle.
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

- **No `updateShippingAddress` / `updateBillingAddress` anywhere.** Phase 0 confirmed the elements own collection and auto-sync with no `IntegrationError`, so there is no legitimate `update*` in this file. Do not add one.
- `getCart`, `getCartTotal`, `getOrCreateBrowserSessionId`, `formatPrice` are ambient globals from `main.js` (`escapeHTML` is defined file-local at the bottom of this rewrite). Each one's source + signature is quoted in the **Ambient helpers** appendix.
- **Session-id invariant (load-bearing — see D2 history):** `getOrCreateBrowserSessionId()` here is the **same `main.js` helper `cart.js` uses** — it reads/writes localStorage key `everlastings_session_id` (`main.js:86`). The hold `cart.js` reserves and the session this page creates are keyed on that one id; if they ever diverged, `/api/checkout` would find no hold and **410 every checkout**. They must stay identical (Phase 8.3 asserts it).
- **`[data-address-incomplete]` is intentionally inert** — the Stripe shipping element surfaces incompleteness inline and `canConfirm` gates the Pay button; do NOT wire a handler for it.
- **Email prefill is dropped (Phase 0):** `initCheckout` rejects `defaultValues`, and pushing email via `updateEmail()` over the mounted contact element would recreate the double-writer bug. The contact element starts empty and the buyer types their email; the cart's newsletter email is captured separately. Intentional and acceptable for v1.

**Fallback — NOT NEEDED (Phase 0 RESOLVED this):** the probe confirmed all four elements mount and render with no `IntegrationError`, so the native Stripe elements are sufficient (US-only + no company field). The plain-HTML-fields contingency (push once on Pay via a single `update*` *instead of* mounting an address element, never both) is recorded only as history — do not build it.

**Acceptance:** `/checkout` mounts contact + shipping + payment + billing with no console errors; typing a complete address + card makes `canConfirm` true; Pay completes and redirects to `/complete`. The email field is editable throughout.

---

## PHASE 4 — Cart: `cart.html` + `assets/js/cart.js`

### 4.1 — `cart.html`: email-only newsletter field

**FIND this exact `<section>`** (hint: ~`cart.html` lines 183–200 — the "Almost there" 3-field prefill form):
```html
        <!-- Optional email/name capture before checkout (Track C wires) -->
        <section style="margin-top: var(--space-xl); padding: var(--space-lg); border: 1px solid var(--color-fog); border-radius: var(--radius-md);">
          <h3 style="margin-top: 0;">Almost there</h3>
          <p style="color: var(--text-secondary); font-size: var(--text-sm);">Save your email so we can hold your cart and send order updates. Not required to checkout, but recommended.</p>
          <form id="cart-prefill-form" data-cart-prefill style="display: grid; gap: var(--space-md); grid-template-columns: 1fr 1fr;">
            <div class="form-field" style="margin: 0;">
              <label class="form-label" for="cart-email">Email</label>
              <input id="cart-email" name="email" type="email" autocomplete="email">
            </div>
            <div class="form-field" style="margin: 0;">
              <label class="form-label" for="cart-name">Name</label>
              <input id="cart-name" name="name" type="text" autocomplete="name">
            </div>
            <div class="form-field" style="margin: 0; grid-column: 1 / -1;">
              <label class="form-label" for="cart-phone">Phone (optional)</label>
              <input id="cart-phone" name="phone" type="tel" autocomplete="tel">
            </div>
          </form>
        </section>
```
**REPLACE the whole `<section>…</section>` WITH:**
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
**Keep `data-cart-prefill` on the form and `name="email"` on the input** so the JS selectors still resolve. Leave the surrounding markup intact — these sibling selectors the cart JS relies on are already present in `cart.html` and are **not** edited here: `[data-cart-with-items]` (`#cart-with-items`, ~line 162), `[data-cart-empty]` (`#cart-empty`, ~217), `[data-cart-checkout]` (~204), the `[data-sold-recovery]` overlay (~227), `[data-cart-error]` (~269), plus the line items and subtotal block.

### 4.2 — `cart.js`: email-only prefill + fix the 409 handler + clean redirect

**(a) Replace `prefillEmailName`** (hint: ~`cart.js` lines 82–89). **FIND this exact function:**
```js
function prefillEmailName() {
  const emailInput = document.querySelector('[data-cart-prefill] input[name="email"]');
  const nameInput = document.querySelector('[data-cart-prefill] input[name="name"]');
  const phoneInput = document.querySelector('[data-cart-prefill] input[name="phone"]');
  if (emailInput) emailInput.value = sessionStorage.getItem('checkout_email') || '';
  if (nameInput) nameInput.value = sessionStorage.getItem('checkout_name') || '';
  if (phoneInput) phoneInput.value = sessionStorage.getItem('checkout_phone') || '';
}
```
**REPLACE WITH (email only):**
```js
function prefillEmail() {
  const emailInput = document.querySelector('[data-cart-prefill] input[name="email"]');
  if (emailInput) emailInput.value = sessionStorage.getItem('checkout_email') || '';
}
```
and update its call site in `DOMContentLoaded` (line 19) from `prefillEmailName();` to `prefillEmail();`.

**(b) In `onCheckoutClick`** (hint: ~`cart.js` lines 119–209) — two verbatim swaps, no judgment about "which lines are name/phone":

**Swap 1 — FIND this exact block** (the email/name/phone reads + sessionStorage writes, ~lines 130–135):
```js
  const email = (document.querySelector('[data-cart-prefill] input[name="email"]')?.value || '').trim();
  const name = (document.querySelector('[data-cart-prefill] input[name="name"]')?.value || '').trim();
  const phone = (document.querySelector('[data-cart-prefill] input[name="phone"]')?.value || '').trim();
  if (email) sessionStorage.setItem('checkout_email', email);
  if (name) sessionStorage.setItem('checkout_name', name);
  if (phone) sessionStorage.setItem('checkout_phone', phone);
```
**REPLACE WITH (email only):**
```js
  const email = (document.querySelector('[data-cart-prefill] input[name="email"]')?.value || '').trim();
  if (email) sessionStorage.setItem('checkout_email', email);
```

**Swap 2 — FIND this exact reserve `body`** (~lines 143–148):
```js
      body: JSON.stringify({
        items: cart.map((i) => ({ product_id: i.product_id, slug: i.slug })),
        session_id,
        email: email || undefined,
        name: name || undefined,
      }),
```
**REPLACE WITH** (drop the now-undefined `name`):
```js
      body: JSON.stringify({
        items: cart.map((i) => ({ product_id: i.product_id, slug: i.slug })),
        session_id,
        email: email || undefined,
      }),
```

**(c) FIX the 409 handler** (hint: ~`cart.js` lines 151–179). The API returns `unavailable` as `[{ product_id, slug }]` objects; the current code treats them as slug strings, so nothing is stripped and the overlay mis-renders. **FIND this exact block:**
```js
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      const unavailableSlugs = Array.isArray(data.unavailable) ? data.unavailable : [];
      const unavailableItems = unavailableSlugs.map((slug) => {
        const item = cart.find((i) => i.slug === slug);
        return item
          ? { slug, title: item.title, thumbnail: item.thumbnail }
          : { slug, title: slug };
      });
      // Strip sold items from localStorage cart.
      unavailableSlugs.forEach((slug) => {
        const item = cart.find((i) => i.slug === slug);
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
The five helpers it calls — `removeFromCart`, `renderLineItems`, `updateTotals`, `wireRemoveButtons`, `showSoldRecovery` — are listed with source + signature in the **Ambient helpers** appendix; the `[data-cart-with-items]`/`[data-cart-empty]` selectors are confirmed present in 4.1. **REPLACE WITH:**
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

**(d) Clean redirect:** change `window.location.href = '/checkout.html';` (line 203) to `window.location.href = '/checkout';`. Also fix the now-stale header comment at the top of `cart.js` (line 3): change `redirect /checkout.html` to `redirect /checkout`.

**Acceptance:** cart shows one email field; entering it + Checkout reserves the hold and lands on `/checkout` with the email pre-filled and editable; a 409 strips the sold item and shows the recovery overlay correctly (Phase 8.2).

### 4.3 — `assets/js/product.js`: clean-URL parity (the last `.html` nav)

The clean-URL pass (Phase 4.2(d) + the Phase 3 `checkout.js` rewrite) left exactly one functional `.html` navigation in the codebase: the Add-to-Cart "Buy now" redirect in `product.js`. It still works (with `cleanUrls:true`, `/cart.html` 301-redirects to `/cart`), so this is parity/cleanliness, not a bug fix.

**FIND this exact line** (hint: ~`product.js` line 223, inside the `[data-product-buy-now]` click handler):
```js
      window.location.href = '/cart.html';
```
**REPLACE WITH:**
```js
      window.location.href = '/cart';
```

**Acceptance:** Buy-now still lands on `/cart`; this clears the lone surviving functional `.html` navigation flagged in gap review C.

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

**(b)** Insert the send **right after the orders insert block** and **inside the existing outer `try`** (before the cart-holds clear). It must never throw out — own try/catch, log on failure.

**Context already in scope** (quoted so every name the new block reads is shown — all pre-existing, declared earlier in the same `POST` handler; do NOT redeclare):
```ts
type CartItemMeta = { id: string; slug: string };   // webhook.ts:12 — so items[i].id AND items[i].slug are typed/guaranteed
// …inside POST, before the anchor:
let items: CartItemMeta[] = [];                       // :67, parsed from session.metadata.items at :69
const customerEmail = session.customer_details?.email ?? null;                            // :80
const shippingAddress = session.collected_information?.shipping_details?.address ?? null; // :84
const productIds = items.map((i) => i.id);            // :124
// Pre-existing mark-sold write — UNCHANGED in v1.4.9; this is exactly what Phase 8.4 verifies:
const { error: productUpdateErr } = await supabase
  .from('products')
  .update({ available: false })
  .in('id', productIds);                              // :125–128
```
`isTest` is an **import** (`webhook.ts:4` — `import { isTest } from './_lib/env'`), not a local. With those in scope, the new block needs nothing it can't already see.

**ANCHOR — find this exact code in `api/webhook.ts` (hint: ~lines 149–174) and insert the new block immediately after it:**
```ts
    const totalAmount = session.amount_total ?? 0;
    const fallbackEach = items.length > 0 ? Math.floor(totalAmount / items.length) : 0;
    const fallbackRemainder = totalAmount - fallbackEach * items.length;

    const orderRows = items.map((item, idx) => {
      const explicit = perItemAmounts[item.id];
      const amount = typeof explicit === 'number'
        ? explicit
        : fallbackEach + (idx === 0 ? fallbackRemainder : 0);
      return {
        stripe_session_id: session.id,
        stripe_payment_intent: paymentIntentId,
        product_id: item.id,
        customer_id: customerId,
        customer_email: customerEmail,
        amount,
        status: 'completed',
        shipping_address: shippingAddress,
        is_test: isTest,
      };
    });

    const { error: orderInsertErr } = await supabase.from('orders').insert(orderRows);
    if (orderInsertErr) {
      console.error(`Orders insert failed for ${event.id}:`, orderInsertErr);
    }
    // ↓↓↓ INSERT THE NEW MERCHANT-NOTIFICATION BLOCK HERE ↓↓↓
```

Then the block to insert:
```ts
    // Merchant new-order notification (non-blocking — never 5xx here or Stripe retries).
    // Hoist the env read to a const so the `string` narrowing survives the awaits below
    // (TS drops process.env.X narrowing across an await → would fail `to: string` with TS2345).
    const notifyTo = process.env.ORDER_NOTIFY_EMAIL;
    if (notifyTo) {
      try {
        // Title lookup keyed by PK only — mirrors the mark-sold write above (no is_test filter:
        // id uniquely identifies the row, and a stray is_test skew would needlessly drop the title).
        const { data: titleRows } = await supabase
          .from('products')
          .select('id, title')
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
        await sendEmail({ to: notifyTo, subject, html });
      } catch (notifyErr) {
        console.error(`New-order notification failed for ${event.id} (non-blocking):`, notifyErr);
      }
    }
```
**Variables this block reads — all shown in the "Context already in scope" + ANCHOR quotes above (do NOT redeclare):** `productIds` (`webhook.ts:124`), `items` (typed `CartItemMeta[]`, so `it.id`/`it.slug` are guaranteed — not assumptions), `orderRows` (built `:153–169`; `orderRows[idx].amount` is per-line cents), `totalAmount` (`:149`), `customerEmail` (`:80`), `shippingAddress` (`:84`), `session` (`:65`), and `event.id` (the handler param). (v1.4.9 dropped the `is_test` filter on the title lookup, so this block no longer reads `isTest` — it remains an import at `:4` for the rest of the handler.) Match the quoted ANCHOR text — don't reconstruct it from line numbers.

*(Per-line `price` in the merchant email is best-effort — the same split logic the order rows use; the email's `total` is authoritative.)*

### 5.3 — Buyer confirmation = Stripe receipt (no code; see SEAN MUST DO).

### 5.4 — Env var (agent edit)

Add `ORDER_NOTIFY_EMAIL=orders@everlastingsbyemaline.com` to `.env.example` so the variable is documented in-repo. Sean sets the real value in Vercel (Preview + Production) per SEAN MUST DO. `RESEND_FROM_EMAIL` must also be set (it already is). If `ORDER_NOTIFY_EMAIL` is unset at runtime the merchant-email block is skipped silently — so confirm it's set before Phase 8.5.

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
import { env } from './env';

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
  // Compare against the TRIMMED value via env(): this project's Vercel env vars were imported with
  // trailing newlines (api/_lib/env.ts), and the two sibling key-consumers — products.ts:22 and
  // upload.ts:29 — already compare against env('PRODUCT_API_KEY'). A raw process.env read here would
  // make the check "<typed key>" === "<key>\n" → false → fall through to the JWT path → a silent,
  // scope-local 401 that breaks the GPT order pipeline (and can pass a preview-only curl while
  // failing in production). env() returns '' for unset, so the `apiKey &&` guard still holds.
  const apiKey = env('PRODUCT_API_KEY');
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
`api/orders.ts` is **unchanged** — and here's the proof it's safe with the widened union (it only ever destructures `supabase`, never `auth.user`):
```ts
// api/orders.ts GET (:53–56). PATCH (:98–101) is byte-identical:
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;   // error variant handled
  const { supabase } = auth;                 // only supabase is read — auth.user is never touched
```
Both non-error variants carry `supabase`, so the new `{ supabase; viaApiKey: true }` branch (which has no `user`) both type-checks and runs. The `is_test` scoping in orders.ts still applies to key-authed calls (good — the GPT only sees its environment's rows).

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
**Scope check — these locals are declared at the top of `buildOrderCard(order)` (do NOT redeclare):**
```js
  const productTitle = order.products?.title ?? '(unknown product)';            // ~line 539
  const customerEmail = order.customers?.email ?? order.customer_email ?? '';   // ~line 542
  const totalLabel = totalCents !== null ? `$${centsToDollars(totalCents)}` : '—'; // ~line 552
  const orderIdShort = String(order.id).slice(0, 8);                            // ~line 567
```
`productTitle` + `customerEmail` (used in the confirm dialog) and `orderIdShort` + `totalLabel` + `order` (used in the Order line) are all in scope — visible above.

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

**GPT pipeline readiness (closes last round's trap).** The GPT's order Actions (`listOrders`, `markShipped`) work **only after this phase deploys** to the environment the GPT targets — which is why `GPT_SETUP.md` splits setup into **Wave 1 (products, verifiable anytime — `/api/upload` + `/api/products` already accept the Bearer key)** and **Wave 2 (orders, only after Phase 8.7 passes here)**. Also note: the GPT is a third-party Actions runner and **cannot authenticate through Vercel SSO**, so it can't be tested against the protected dev preview — order Actions are verified against the environment the GPT actually points at (production at launch). The product pipeline is proven independently via curl on the preview. See `GPT_SETUP.md` Wave 1 / Wave 2.

---

## PHASE 7 — Supabase keep-alive cron (`vercel.json`)

Supabase's free tier **pauses a project after ~7 days of inactivity**; a paused DB means products don't load and checkout breaks. The store owner is non-technical, so prevention must be automatic and hands-off: a daily cron that runs a **real** DB read keeps the inactivity timer from ever tripping.

**Why this endpoint, and why no new function:** `api/product-feed.ts` already runs a live Supabase `select` on GET (see `product-feed.ts:18–22` — `.from('products').select(...).eq('is_test', false)`), is public/read-only, and has no side effects — an ideal heartbeat. Reusing it means **no new serverless function**, so the **11-function Hobby cap is preserved** (the project is at 11). `api/config.ts` only returns env vars (no DB call), so it would NOT count as activity — not a candidate.

**EDIT `vercel.json` — add a top-level `crons` array, leaving `rewrites` byte-for-byte unchanged.** The file is short; here is the **complete file with `crons` merged in** — write it verbatim. (JSON has no comments, so there is no `//` line to paste; the only change from the current file is the added `crons` key.)
```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "crons": [
    { "path": "/api/product-feed", "schedule": "0 9 * * *" }
  ],
  "rewrites": [
    { "source": "/product/:slug", "destination": "/product" },
    { "source": "/admin/:path*", "destination": "/admin" },
    { "source": "/api/checkout/reserve", "destination": "/api/checkout?_action=reserve" },
    { "source": "/api/session-status", "destination": "/api/checkout?_action=session-status" },
    { "source": "/api/orders/:id", "destination": "/api/orders?id=:id" },
    { "source": "/api/cart-activity", "destination": "/api/cart?_action=activity" },
    { "source": "/api/cart-recovery", "destination": "/api/cart?_action=recovery" }
  ]
}
```
`"0 9 * * *"` = once daily at 09:00 UTC. (Hobby clamps cron frequency to once/day; once/day is well inside the 7-day window — even a few missed runs won't pause it.)

**Notes (true at build time):**
- Vercel **crons run only on the production deployment**, so this activates at launch (when `main` deploys). Pre-launch, the team's own activity keeps the project warm.
- There is **one** Supabase project (test + live rows separated by `is_test`), so one production heartbeat keeps the whole project — including the preview's `is_test=true` rows — awake.
- Honest scope: this is the standard free-tier mitigation, **not a Supabase guarantee** (only the paid tier guarantees no pause); a daily real query is robust in practice.
- **Reactive recovery is a Sean-only step** (Supabase dashboard → Restore, or the Management API) and is documented in `STORE_ADMINISTRATION.md`. The owner/GPT cannot unpause (no Action; it needs a Supabase access token, not `PRODUCT_API_KEY`).

**Acceptance:** `vercel.json` has a `crons` entry pointing at `/api/product-feed`; `rewrites` is unchanged; the function count is still 11; the build is unaffected (config-only change).

---

## PHASE 8 — Verification (all on the dev preview)

Preview: `https://everlastings-website-git-dev-everlastingsbyemaline.vercel.app`. Stripe TEST webhook already registered.

0. **`/complete` resolves clean:** open `https://<preview>/complete?session_id=test` → confirm 200 (serves `complete.html` via `cleanUrls`), not 404, before trusting the bare `/complete` in `return_url`. If it 404s, the `return_url` must use `/complete.html`.
1. **Purchase:** `/shop` → product → cart (email field) → Checkout → single-page `/checkout` → contact/shipping/card, leave "same as shipping" checked → Pay `4242 4242 4242 4242` → `/complete` shows the correct total + line items (Phase 1b). No console errors; total real (no `$NaN`); email editable; `canConfirm` resolves. (The order summary briefly pre-paints the cart total in dollars before Stripe's first `change` event settles it to the authoritative amount — confirm it lands correctly with no lingering stale/`$NaN` figure.) **Total-accessor check (proves `session.total.total.amount`, which the probe did not capture):** apply the test promo code and confirm the displayed **Total drops** to the discounted amount; if it doesn't move, the accessor is wrong — log `session.total` in the `change` handler and pin the real path before launch.
2. **Sold-recovery (409):** mark the cart item sold in Supabase → Checkout → the sold item is stripped + recovery overlay + 10% code email (verifies the Phase 4 fix). Restore `available=true` after.
3. **Hold-expiry (410):** delete the hold row (or idle 16 min) → reload `/checkout` → bounce to `/cart`. (This also proves the **session-id invariant**: the hold is keyed on `getOrCreateBrowserSessionId()` / localStorage `everlastings_session_id`, and `/checkout` resolves it only because `cart.js` and `checkout.js` share that one helper — a divergence would 410 *every* checkout, not just expired ones.)
4. **Downstream:** Vercel logs `/api/webhook` 200 for `checkout.session.completed`; Supabase `orders` row written + product `available=false`; GA4 DebugView `begin_checkout` + `purchase` (ignore the DevTools "failed" beacon labels — known artifact).
5. **Merchant email:** new-order notification arrives at `ORDER_NOTIFY_EMAIL` with the fulfillment walkthrough.
6. **Admin + tracking:** `/admin` → Orders → new order shows (with date) → mark shipped (confirm prompt) + tracking → buyer tracking email fires; copy-address works.
7. **GPT path:** curl `/api/orders` GET + PATCH with the Bearer key → records tracking + sends buyer email. **Run this against BOTH the preview key and the production `PRODUCT_API_KEY`** — the `env()` trim (Phase 6.1) handles trailing newlines, but a preview-only pass can mask a production-scope key issue, so verify the live key with a runtime curl before declaring Wave 2 ready.
8. **Stripe receipt:** confirm the branded receipt is configured (SEAN MUST DO) — buyer gets it on a test purchase.
9. **Keep-alive cron (static check):** `vercel.json` has the `crons` entry → `/api/product-feed` (Phase 7) and `rewrites` is intact. (Crons run on production only, so this can't fire on the preview — confirm the config entry exists; it activates at launch.)

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

`[data-address-undeliverable]` from the old markup is dropped — the Stripe element surfaces deliverability inline, and Phase 0 surfaced no session-level signal to drive a separate slot, so it stays dropped. (Country-restriction UX is handled separately via `[data-restricted-country]` in the `change` handler.)

**Post-load race (item sells, or hold expires, *after* the page loaded — at Pay time):** the session was created on load, so a buyer who lingers then pays may hit a sold-out/expired condition that only surfaces when `confirm()` returns `{ type:'error' }`. That falls through to the generic `[data-checkout-error]` with Stripe's message — **acceptable for v1.** Do NOT add a re-reserve step or any `update*`/bridge to "fix" this (that re-introduces the double-writer that caused the saga). The friendly hold-expiry redirect intentionally only covers the page-load window.

---

## Coverage cross-check vs `v1_4_5_C_IMPLEMENT.md`

The IMPLEMENT's C1/C2/C4 (foundations, per-page wiring, SEO) shipped and are untouched here. This packet covers the C3 (cart/checkout/complete/webhook) + orders surface that the five rounds left broken:

| IMPLEMENT item                              | Status in v1.4.9                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| C3.2 `cart.js` (reserve, 409 recovery)      | Phase 4 — email-only + **409 objects-vs-strings fix**                                                         |
| C3.3 `checkout.js` (Stripe mount + confirm) | Phase 3 — full rewrite, single-phase, no bridges                                                              |
| C3.4 `complete.js` (success page)           | Phase 1b — server now returns the fields it reads                                                             |
| C3.5 Stripe webhook E2E                     | Phase 8.4 (already registered)                                                                                |
| `api/checkout.ts` session create            | Phase 1 — drop pre-created customer; **omit `customer_creation`** (Phase 0 resolved)                          |
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
- Supabase schema changes via the Supabase CLI, not MCP. (No schema changes needed in v1.4.9.)
- This doc = verified/post-fix truth only; no speculation; no time estimates.

---

## Out of scope / v1.1+

`charge.refunded` auto-handling (status flip + relist); branded buyer confirmation email (v1 uses the Stripe receipt); carrier tracking webhooks → auto delivered/ETA emails; review-request follow-up; Shippo/EasyPost label API + GPT label-buying; returning-customer address prefill. Meta Pixel (v1.5), launch copy placeholders, and C5 cutover (live keys, DNS, merge/tag) are Sean-owned and tracked in `v1_4_5_C_SESSION_REPORT.md`.

---

## Appendix — Ambient helpers (quoted from source; do not open the files)

Every global the edits above call, with its source + signature, so the build never has to discover a name or shape:

| Helper | Source | Signature / behavior |
| ------ | ------ | -------------------- |
| `getOrCreateBrowserSessionId()` | `main.js:86` | `() => string` — returns/creates localStorage `everlastings_session_id` (via `crypto.randomUUID()`). **The same instance `cart.js` and `checkout.js` both call** — this is the hold key (D2 invariant). |
| `getCart()` | `main.js:99` | `() => Array<{product_id, slug, title, price, thumbnail, series?, quantity?}>` — parses localStorage `cart`; returns `[]` on empty/parse-fail. |
| `getCartTotal()` | `main.js:162` | `() => number` — sum of `price * (quantity||1)`, in **cents**. |
| `formatPrice(cents)` | `main.js:27` | `(number) => string` — `Intl.NumberFormat` USD; divides by 100. |
| `removeFromCart(productId)` | `main.js:144` | `(string) => void` — drops the item from localStorage `cart`, fires GA4 `remove_from_cart`. |
| `showSoldRecovery({ unavailable, related })` | `recovery.js:6` | `({unavailable=[], related=[]}) => void` — populates the `[data-sold-recovery]` overlay. |
| `renderLineItems(cart, container)` | `cart.js:38` (same file) | `(cartArray, HTMLElement) => void` — re-renders the `.cart-line` rows into `container`. |
| `updateTotals()` | `cart.js:74` (same file) | `() => void` — repaints `[data-cart-subtotal]` / `[data-cart-estimate]`. |
| `wireRemoveButtons()` | `cart.js:91` (same file) | `() => void` — idempotently wires `[data-cart-remove]` clicks. |
| `escapeHtml(input)` | `api/_emails/index.ts:20` (module-private) | `(string) => string` — HTML-escapes for email bodies. |
| `shell(bodyHtml)` | `api/_emails/index.ts:35` (module-private) | `(string) => string` — wraps a body in the branded email shell. |
| `sendEmail({ to, subject, html, replyTo? })` | `api/_emails/index.ts:162` | `=> Promise<{ id: string\|null; error: unknown\|null }>` — Resend send; needs `RESEND_FROM_EMAIL` (returns an error object if unset, never throws). |

`escapeHTML` inside `checkout.js` is a **file-local** copy (defined at the bottom of the Phase 3 rewrite), *not* the `_emails` `escapeHtml` — both exist by design; don't try to share them across the client/server boundary.

---

## Handoff / close-out

On completion, append to (or create) the session report per `.agent/DEV_RULES.md`: a three-column expected/planned/actual table, the filled VERIFIED CONTRACT (the real bundle surface), any deviations, and the Phase 8 results. Leave the codebase on `dev`, preview green, ready for Sean's final walkthrough.
