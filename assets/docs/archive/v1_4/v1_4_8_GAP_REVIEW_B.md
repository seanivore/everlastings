# v1.4.8 — Gap Review B (pre-build fidelity)

Senior pre-build fidelity check of `v1_4_8_FINISH_TRACK_C.md` against the repo on `dev`.
Method: opened every file the packet edits, compared each quoted CURRENT/FIND block
byte-for-byte, checked each "context already in scope" line number, cross-checked
selectors/fields/env vars across files, and grepped for Stripe-doc-trap drift.

**Headline:** the packet is exceptionally faithful. Of its 14 file edits, 13 are
quoted-string-anchored and **every one matches the repo verbatim** — and the line
hints are not merely close, they are exact (no drift even before the build starts).
The findings below are minor; none blocks the build.

---

## Gap list — ranked by likelihood of derailing the build

### 1. Phase 2 is the only edit NOT string-anchored — and its replacement re-includes the `<main>` tags. [LOW absolute risk · highest relative]
- **Location in the doc:** PHASE 2 ("collapse two stages into one"). Instruction: *"Replace
  the entire `<main>…</main>` body (current lines 149–282 …)"* then *"REPLACE the `<main>`
  inner (everything between `<main>` and `</main>`) WITH:"* — followed by a block that itself
  opens `  <main>` and closes `  </main>`.
- **What's off vs the repo / the packet's own rule:** the packet's load-bearing safety rule
  (doc line 11) is *"each edit quotes a CURRENT block verbatim … Find the exact string,
  replace it — never trust a line number."* Phase 2 is the sole exception: it gives **no quoted
  current block**, only a line range + prose ("the Stage A `#checkout-stage-a` form + Stage B
  `#checkout-stage-b` section"). Two secondary frictions compound it: (a) the instruction says
  replace *"everything between `<main>` and `</main>`"* but the supplied replacement *includes*
  `<main>`/`</main>` — a literal reading double-nests `<main><main>…</main></main>`; (b) a raw
  search for `<main>` returns two hits — the real element (`checkout.html:149`) **and a prose
  mention in the top-of-file comment** (`checkout.html:11`: "The `<main>...</main>` region").
- **Why it still almost certainly succeeds:** there is exactly **one** real `<main>` element
  (`checkout.html:149–282`), bracketed by unmistakable `<!-- MAIN START -->` (148) /
  `<!-- MAIN END -->` (283) comments, and the supplied block is the complete element. A
  competent agent produces one clean `<main>`. Risk is real only for a careless literal apply.
- **Concrete fix (1 line):** reword to *"Replace the whole `<main>…</main>` element
  (`checkout.html:149–282`, between the MAIN START / MAIN END comments) with the block below —
  it includes the `<main>` tags, so replace the element, not just its inner."* Optional: bring
  it to the doc's own standard by quoting the unique first anchor
  `<section id="checkout-stage-a" data-checkout-stage="a" …>` through the trailing
  `</section>` + closing `<p>…Secure payment processing…</p>`.

### 2. Phase 5.2 merchant block reads `process.env.ORDER_NOTIFY_EMAIL` twice (guard + `to:`) across `await`s. [VERY LOW · low confidence it even bites]
- **Location:** PHASE 5.2(b) inserted block — `if (process.env.ORDER_NOTIFY_EMAIL) { …await
  supabase…; await sendEmail({ to: process.env.ORDER_NOTIFY_EMAIL, … }) }`.
- **What to watch:** `sendEmail`'s `SendEmailOpts.to` is `string` (`api/_emails/index.ts:156`),
  while `process.env.X` is `string | undefined`. TS normally keeps the dotted-name narrowing
  from the `if` across the intervening `await`s, so this compiles — but the repo has **no
  existing precedent that proves narrow-to-`string`-across-`await`** for a parameter that
  *requires* `string` (webhook.ts's `process.env.META_*` reads only feed a template literal /
  untyped fetch body, both of which tolerate `undefined`). Given the packet's own acceptance
  bar is *"tsc clean (CommonJS output),"* this is the one spot that could throw a surprise
  `TS2345`.
- **Concrete fix (defensive, optional):** hoist once —
  `const notifyTo = process.env.ORDER_NOTIFY_EMAIL; if (notifyTo) { … await sendEmail({ to: notifyTo, … }) }`.
  Costs nothing and removes the ambiguity.

### 3. Three Phase-3 session-shape accessors are asserted, not probed. [VERY LOW · already self-flagged]
- **Location:** PHASE 3 `change` handler — `session.canConfirm`, `checkout.on('change', …)`,
  and `session.total?.total?.amount` / `session.shippingOption?.total?.amount`.
- **State:** the VERIFIED CONTRACT explicitly confirms init/confirm/elements/contact/sync/
  promo and explicitly flags `session.total.total.amount` as *not separately probed → verified
  functionally at Phase 8.1* (with optional chaining + a pre-painted fallback so a wrong path
  prints the cart total, not `$NaN`). `on(...)` and `canConfirm` are standard, stable Custom-
  Checkout members the prior (Round-5) code already exercised, so they're safe; they're listed
  here only for "shown-not-asserted" parity. **No fix needed** — Phase 8.1's promo-drops-the-
  total check is the right gate.

---

## Verified ACCURATE — no action (the breadth that passed)

Every item below was confirmed against the repo at the cited `file:line`.

**String-anchored FIND/REPLACE blocks — all match verbatim & are unique:**
- Phase 1.1 body destructure — `api/checkout.ts:30–37` (unique vs the 4-var `handleReserve`
  destructure at :181–187, which has no `phone`). ✅
- Phase 1.2 customer pre-create block — `api/checkout.ts:104–118`; it is the **only** reader of
  `emailValid`/`customerId`, so deletion leaves nothing dangling. ✅
- Phase 1.3 `stripe.checkout.sessions.create({…})` — `api/checkout.ts:120–164` (incl. the
  `customerId ? … : emailValid ? … : …` branch and the `.html` return_url). After 1.1+1.2+1.3
  no `email`/`name`/`phone`/`emailValid`/`customerId` reference survives. ✅
- Phase 1b `retrieve(… expand:['payment_intent'])` + return — `api/checkout.ts:360–371`. The new
  return keeps `status` (load-bearing: `complete.js:25` gates on `data.status !== 'complete'`).
  ✅
- Phase 4.1 "Almost there" `<section>` — `cart.html:182–200` (comment + section). ✅
- Phase 4.2(a) `prefillEmailName()` — `cart.js:82–89`; single call site at `cart.js:19`. ✅
- Phase 4.2(b) Swap 1 (email/name/phone reads) — `cart.js:130–135`; Swap 2 (reserve body) —
  `cart.js:143–148`. After both, no `name`/`phone` reference survives. ✅
- Phase 4.2(c) 409 handler — `cart.js:151–179`. The fix is correct: `handleReserve` returns
  `unavailable` as `[{product_id, slug}]` objects (`api/checkout.ts:240`), so the old
  slug-string `.find()` never matched; the new object-aware map/strip is right, and
  `recovery.js` already accepts `{slug,title,thumbnail}` objects (`recovery.js:38,102`). ✅
- Phase 4.2(d) redirect `'/checkout.html'` — `cart.js:203` (unique). ✅
- Phase 5.2 ANCHOR (`totalAmount` … orders insert) — `api/webhook.ts:149–174`; insertion point
  is after the orders insert (174) and before the cart-holds clear (176), inside the outer
  `try` (64–230), with its own try/catch. ✅
- Phase 6.2(a) Order line — `admin.js:608` (the `·`-separated template; unique). ✅
- Phase 6.2(b) `shipForm` submit handler — `admin.js:628–633` (unique vs the resend handler at
  :638). ✅

**"Context already in scope" line claims — all exact:**
- webhook.ts: `CartItemMeta`:12, `items`:67, `customerEmail`:80, `shippingAddress`:84,
  `productIds`:124, mark-sold `available:false` write:125–128, `totalAmount`:149,
  `orderRows`:153–169, `session`:65, `isTest` **import**:4. ✅ (the pre-existing
  `available=false` write that Phase 8.4 verifies is present and **unchanged**.)
- checkout.ts: `getBaseUrl`:23–26, `line_items`/`itemsMeta`:97–102. ✅
- admin.js scope locals: `productTitle`:539, `customerEmail`:542, `totalLabel`:552,
  `orderIdShort`:567. ✅
- orders.ts auth consumer: GET destructures `{ supabase }`:53–56, PATCH byte-identical:98–101,
  and **`auth.user` is never read anywhere** → the widened `RequireAdminResult` union (adding
  `{supabase; viaApiKey:true}`) is type-safe and runtime-safe. ✅

**Cross-file contracts — consistent:**
- `complete.js` reader fields (`customer_name`:33, `customer_email`:34, `amount_total`:35,
  `shipping_cost.amount_total`:39–41, `items[].title/.price`:47–52, `items[].slug`:65,
  `stripe_event_id`:70, optional `already_subscribed`:82) ↔ **exactly** the keys Phase 1b
  returns. ✅
- Session-id invariant (D2): `cart.js:137` and the Phase 3 rewrite both call the same
  `getOrCreateBrowserSessionId()` (localStorage `everlastings_session_id`, `main.js:86`). ✅
- Phase 2 mount slots ↔ Phase 3 selectors: `[data-stripe-contact]`, `-address-shipping`,
  `-payment`, `-address-billing`, `[data-checkout-confirm/-total/-shipping/-line-items/-error/
  -error-message]`, `[data-restricted-country]`, `[data-hold-expired]`, `#promo-code`,
  `[data-promo-apply]` — all present in the Phase 2 HTML; `[data-address-incomplete]` present &
  intentionally inert. ✅
- Phase 4.1 sibling selectors left intact: `#cart-with-items`:162, `#cart-empty`:217,
  `[data-cart-checkout]`:204, `[data-sold-recovery]`:227, `[data-cart-error]`:269. ✅

**Ambient-helpers appendix — every signature/line correct:**
- `main.js`: `getOrCreateBrowserSessionId`:86, `getCart`:99, `getCartTotal`:162 (cents),
  `formatPrice`:27 (÷100 USD), `removeFromCart`:144. ✅
- `recovery.js`: `showSoldRecovery`:6. ✅  `cart.js` self: `renderLineItems`:38,
  `updateTotals`:74, `wireRemoveButtons`:91. ✅
- `api/_emails/index.ts`: `escapeHtml`:20 (module-private), `shell`:35 (module-private),
  `sendEmail`:162 (returns `{id,error}`, needs `RESEND_FROM_EMAIL`). Phase 5.1 inserts between
  `cartRecoveryCouponEmailHtml` (ends :153) and `SendEmailOpts` (:155); new fn uses only
  `escapeHtml`+`shell`. ✅  `checkout.js` `escapeHTML` is correctly file-local, not the
  `_emails` one. ✅

**Config / infra claims:**
- `vercel.json` merge: `rewrites` byte-for-byte unchanged; only `crons` added; valid JSON. ✅
- Function count = **11** (non-underscore `api/*.ts`); reusing `api/product-feed.ts` for the
  cron adds no 12th. `product-feed.ts:18–22` does a real `.from('products').select(…)
  .eq('is_test', false)` (good heartbeat); `config.ts` is env-only (no DB → correctly rejected
  as a candidate). ✅
- `tsconfig.json` → `"module": "CommonJS"` (deployed-runtime requirement satisfied). ✅
- `.env.example`: `RESEND_FROM_EMAIL` already present (:32); `ORDER_NOTIFY_EMAIL` absent (Phase
  5.4 adds it) — exactly as the packet states. ✅

**No Stripe doc-trap drift in the FINAL code:**
- `initCheckoutElementsSdk` appears only in prohibitions/probe/contract (doc :17,:80,:99,:1258)
  — never written. ✅
- The init uses `fetchClientSecret: async () => clientSecret` (:511) — no bare `clientSecret:`
  option is ever passed. ✅
- Zero `updateShippingAddress`/`updateBillingAddress`/`updateEmail` calls in any final code; all
  mentions are "do NOT" warnings (doc :19,:27,:646,:650). The `change` handler is read-only. ✅

---

## Single most important insight

The packet's entire anti-fragility model is *"anchor on the quoted string, never the line
number,"* and it honors that model **perfectly for 13 of 14 edits** — every quoted block is a
byte-exact, unique match, and even the line hints haven't drifted. That makes **Phase 2 the only
soft spot**: it is the one edit located structurally (line range + prose) rather than by a quoted
anchor, and it ships a replacement that re-includes the `<main>` tags it tells you to replace
"between." It will almost certainly apply correctly (one real `<main>`, fenced by clear MAIN
START/END comments), but it is the single place to tighten — bring Phase 2 up to the same
string-anchored standard as the rest and the packet is uniformly airtight.

---

## Verdict

**READY TO BUILD.** (Optionally tighten Phase 2's wording to "replace the whole `<main>…</main>`
element" first — a 1-line edit, not a blocker.)
