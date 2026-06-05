# v1.4.7 Track C — Self-Containment Gap Review (A)

**Reviewed:** `v1_4_7_FINISH_TRACK_C.md` (BUILD packet)
**Bar being tested:** "Exclusively executable" — a fresh agent, given only this packet and the repo, must *locate and apply* every edit. It must never *discover* a name, *recall* a library's behavior, or *decide* something the packet left open.
**Method:** Read the whole packet with no repo access. Every defect below is a point where carrying out a step forces the agent to open a file to confirm a name/boundary, recall framework behavior, or make a judgment the packet didn't make for it.

---

**FINAL COMMENT FROM AI BEFORE SHARING REST OF DOCUMENT BELOW**

  ```
  Sixteen defects, ranked by how likely each is to make the build agent guess wrong. The shape of the problem: the packet *knows* how to be self-contained — Phases 1.1, 1b, 5.2, and 6.2 all quote the current block and string-anchor the replace — but the most dangerous edits don't follow that pattern.

  The three that actually threaten a sixth round:

  1. **Phase 1.2 + 1.3** delete and replace the `sessions.create(...)` call with no quoted current code, located only by line numbers — and Phase 1.1 already shortened the file above them, so those numbers are stale by the time the agent arrives. Wrong span on the exact path this packet exists to repair, failing silently.
  2. **The `cart.js` `session_id` source is never shown.** `checkout.js` uses `getOrCreateBrowserSessionId()`; if `cart.js`'s reserve keys the hold on anything else, `/api/checkout` finds no hold and 410s every checkout.
  3. **Phase 4.2(b)** asks the agent to "drop the name/phone reads" across a 90-line function with no quoted before-state — a discover-and-decide step, not locate-and-apply.

  Also worth your attention before the agent runs: `session.total.total.amount` (Phase 3) is presented as settled fact but was never in the Phase 0 probe, and Phase 8.4 tests for product `available=false` with no phase showing that write anywhere in `webhook.ts`.

  Fix-one pick is D1 — quoting the current block there both kills the highest-probability misfire and, applied across the doc, dissolves the systemic line-drift issue (D12). Verdict: **needs more inlining**, but the gaps are mechanical to close, not architectural.
  ```

---

## Self-containment defects, ranked by likelihood of a wrong guess

### D1 — Phase 1.2 + 1.3 delete and replace the session-create path with NO quoted current code, located only by line numbers that have already drifted. (CRITICAL)
- **Where:** Phase 1.2 ("DELETE entirely (current lines 104–118): the comment + `const emailValid…` + `let customerId…` + `if (emailValid) {…}`") and Phase 1.3 ("CURRENT (lines 120–164): the `stripe.checkout.sessions.create({...})` call with `phone_number_collection`, the `…(customerId ? … : …)` branch, and the `.html` return_url").
- **What the agent must discover/decide:** Neither step quotes the current code — they *describe* it and rely on absolute line numbers as the only locator. But Phase 1.1 just replaced a 9-line block (orig. lines 30–37) with a 6-line block, so the file is ~3 lines shorter by the time the agent reaches 1.2/1.3. "Lines 104–118" and "120–164" now point ~3 lines too low. With no quoted before-state to anchor against, the agent has to open `api/checkout.ts`, eyeball which lines are "the customer block" and "the create call," and guess the span. A wrong boundary silently corrupts the exact call this entire packet exists to repair → round 6.
- **Fix to inline:** Paste the verbatim current 104–118 and 120–164 blocks (as Phase 1.1, 1b, 5.2-anchor, and 6.2 already do) and convert both to string-anchored replaces ("find this exact block → replace with"). Drop the line numbers to "hint" status.

### D2 — `session_id` source is never shown for `cart.js`, but it must byte-match `checkout.js` or every checkout 410s. (CRITICAL, cross-phase)
- **Where:** Phase 3 `checkout.js:378` sets `const sessionId = getOrCreateBrowserSessionId();` and POSTs it to `/api/checkout`. Phase 4.2(b) shows `cart.js` reserving with `session_id` in the body — but never shows where `cart.js`'s `session_id` is derived.
- **What the agent must discover:** The hold written by `cart.js`'s reserve and the session created by `checkout.js` are keyed on `session_id`. If `cart.js` gets its id from anything other than the same `getOrCreateBrowserSessionId()` (a different helper, a fresh `crypto.randomUUID()`, a different storage key), the keys won't match and `/api/checkout` will find no hold → the Phase 3 `410` branch fires → bounce to `/cart` on *every* attempt. The packet asserts neither side's source nor that they're identical.
- **Fix to inline:** Quote `cart.js`'s `session_id` derivation line and state explicitly: "both `cart.js` and `checkout.js` MUST use `getOrCreateBrowserSessionId()` from `main.js`; same function, same storage key." Make it a Phase 8 assertion too.

### D3 — Phase 4.2(b) tells the agent to "drop the name/phone reads + sessionStorage writes" across a 90-line function with no quoted before-state. (HIGH)
- **Where:** Phase 4.2(b): "In `onCheckoutClick` (lines 119–209): drop the name/phone reads + sessionStorage writes; keep email. Replace lines 130–135 WITH: …" and "the reserve `body` (lines 143–149) WITH: …".
- **What the agent must decide:** "Drop the name/phone reads + sessionStorage writes" is a judgment call over a 90-line span — the agent has to find *every* name/phone read and *every* sessionStorage write and decide what counts. Then "Replace lines 130–135" gives no quoted current text, so the agent can't confirm 130–135 is the email read (and after the 4.2(a) edit, those numbers have drifted too).
- **Fix to inline:** Quote the full current head of `onCheckoutClick` (through the reserve `fetch`) and present this as a single verbatim-block replacement, so it's locate-and-swap with zero "which lines are name/phone?" judgment.

### D4 — `session.total.total.amount` and `session.shippingOption.total.amount` are used as settled session shape but were never probed in Phase 0. (HIGH, silently assumed)
- **Where:** Phase 3 `checkout.on('change')` handler: `const total = session.total?.total?.amount;` and `const ship = session.shippingOption?.total?.amount;`.
- **What the agent must recall:** The Phase 0 probe enumerated *method names* plus `session.shippingAddress`, `canConfirm`, and `confirm` shape — it never captured the shape of `session.total` or `session.shippingOption`. The doubly-nested `.total.total.amount` is recalled-from-memory Stripe shape, not observed. The optional chaining means a wrong shape *silently* leaves the total at the pre-painted figure — which directly fails Phase 8.1's "lands correctly with no lingering stale/`$NaN` figure." This is exactly the "value presented as fact that depends on unverified live behavior" the bar forbids, and it is **not** marked as a probe item.
- **Fix to inline:** Add a Phase 0 probe line: `JSON.stringify(window.__checkout.session().total)` and `…session().shippingOption` (with a card-filled session), then pin the exact accessor in the VERIFIED CONTRACT. If unverifiable pre-confirm, mark it `(Phase 8)` like the other deferred items rather than presenting it as fact.

### D5 — Phase 4.2(c)'s new 409 block calls five helpers and two selectors that are never shown declared; the current 409 block isn't quoted. (HIGH)
- **Where:** Phase 4.2(c) "REPLACE the 409 block WITH:" uses `removeFromCart(item.product_id)`, `renderLineItems(remaining, container)`, `updateTotals()`, `wireRemoveButtons()`, `showSoldRecovery({ unavailable, related })`, and toggles `[data-cart-with-items]` / `[data-cart-empty]`.
- **What the agent must discover:** None of the five functions are shown, so their signatures are inferred from call sites — e.g. does `renderLineItems` really take `(items, containerEl)` in that order? does `removeFromCart` key on `product_id`? does `showSoldRecovery` take exactly `{ unavailable, related }`? The two `[data-cart-*]` selectors are assumed to exist in `cart.html` but Phase 4.1's "keep … the sold-recovery overlay" never confirms them. And the *current* 409 block (lines 151–179) isn't quoted, so the agent can't bound the replace.
- **Fix to inline:** Quote the current 409 block, and add a one-line signature for each of the five helpers (name, params, return). Confirm `[data-cart-with-items]` / `[data-cart-empty]` exist in the retained `cart.html` markup.

### D6 — Phase 8.4 asserts product `available=false` after purchase, but no phase shows or adds that write in `webhook.ts`. (HIGH, cross-phase)
- **Where:** Phase 8.4 acceptance: "Supabase `orders` row written + product `available=false`." The only quoted `webhook.ts` region (Phase 5.2 anchor) shows the `orders` insert and the new email block — **no** products-availability update.
- **What the agent must discover:** To trust 8.4, the agent assumes `webhook.ts` already flips `available=false` somewhere outside the quoted window. If that code doesn't exist (or lives in a branch the agent can't see), the test fails and the agent is back to discovering webhook internals — the failure mode the packet is meant to end.
- **Fix to inline:** Quote the existing `webhook.ts` line(s) that set `available=false` and state "pre-existing, unchanged in v1.4.7," or, if it's actually missing, add it as an explicit edit.

### D7 — `line_items`, `itemsMeta`, and `getBaseUrl` in the Phase 1.3 create() block are never shown; `itemsMeta` collides nominally with Phase 1b's `metaItems`. (MEDIUM)
- **Where:** Phase 1.3 replacement reads `line_items`, `metadata.items: JSON.stringify(itemsMeta)`, and `return_url: \`${getBaseUrl(request)}/complete?…\``.
- **What the agent must discover:** `line_items`, `itemsMeta`, and `getBaseUrl` are used but never quoted in a code block (the 1.1 note mentions "lines 88–99" resolve the price, but doesn't show the variable names). The agent must open the file to confirm it's `itemsMeta` not `items_meta`/`metaItems` — and Phase 1b introduces a *different* local named `metaItems`, which is easy to conflate.
- **Fix to inline:** Quote the ~88–99 block that builds `line_items` and `itemsMeta` so both names and `getBaseUrl`'s import are visible.

### D8 — The `complete.js` field contract (Phase 1b) is asserted, never shown. (MEDIUM, cross-phase)
- **Where:** Phase 1b: "`complete.js` reads `customer_name`, `amount_total`, `shipping_cost.amount_total`, `items[{title,price,slug}]`, and `stripe_event_id`." The server is rewritten to return exactly those.
- **What the agent must trust:** This is a reader↔payload contract with the reader (`complete.js`) never quoted. If `complete.js` actually reads `total` instead of `amount_total`, or `shipping.amount` instead of `shipping_cost.amount_total`, the page shows blanks and the agent can't catch it from the doc.
- **Fix to inline:** Quote the `complete.js` read sites (the few lines that destructure the response), or add a Phase 8.0-style grep to confirm the field names before trusting them.

### D9 — Phase 5.2's insert reads vars declared above the quoted anchor on assertion only; `it.slug` on `items` is unverified. (MEDIUM)
- **Where:** Phase 5.2(b) insert block reads `productIds`, `items` (with `it.slug` and `it.id`), `isTest`, `customerEmail`, `totalAmount`, `orderRows`, `session`, `event.id`. The quoted ANCHOR covers `totalAmount`→`orderRows`→insert, but `productIds` / `items` / `isTest` / `customerEmail` are declared *above* it and only named in a prose note (`productIds` "= items.map(i => i.id)" at `:124`, etc.).
- **What the agent must trust:** That `productIds` (not `product_ids`), `items`, and especially `items[i].slug` exist with those exact names/fields above the anchor. `it.slug` is load-bearing for the email's item titles fallback and is never shown.
- **Fix to inline:** Extend the quoted anchor *upward* to include the `metadata.items` parse and the `productIds`/`items` declarations, so every var the new block touches is in a quoted block.

### D10 — Phase 6.1 changes the `RequireAdmin` return union; `orders.ts` (the consumer) is asserted compatible but never shown. (MEDIUM, cross-phase)
- **Where:** Phase 6.1's new union adds `{ supabase: SupabaseClient; viaApiKey: true }` (no `user`). "`api/orders.ts` is unchanged (it already does `if ('error' in auth) return auth.error; const { supabase } = auth;`)."
- **What the agent must trust:** That `orders.ts` never reads `auth.user` after the error guard. On the new key-auth path `user` is absent; if any handler line touches `auth.user`, it's `undefined` at runtime (and may not even `tsc`-error depending on access pattern). The consumer isn't quoted.
- **Fix to inline:** Quote the `orders.ts` lines that consume the auth result (the guard + destructure + any `user` use) to prove the union widening is safe.

### D11 — The Phase 7 `vercel.json` example contains a `//` comment, which is invalid JSON; current `rewrites` aren't quoted. (MEDIUM)
- **Where:** Phase 7's JSON shows `"rewrites": [ // ← keep every existing rewrite unchanged ]`.
- **What the agent must decide:** The instruction is "add the `crons` key, leave `rewrites` as-is," but the shown block is *not valid JSON* (comments are illegal in `vercel.json`). A literal-minded agent that overwrites the file with the shown block ships a config that fails to parse and breaks the deploy. The real `rewrites` content is never quoted, so the agent also can't reconstruct the file if it does overwrite.
- **Fix to inline:** Either quote the current full `vercel.json` (it's short) with `crons` already merged in, or replace the example with an explicit instruction: "edit in place — insert only the `crons` key; do NOT paste this block (JSON has no comments)."

### D12 — Systemic: edits are located by absolute line numbers, applied top-to-bottom, so every later number in a file drifts after an earlier edit. (MEDIUM, systemic)
- **Where:** Throughout — `checkout.ts` (30–37 → 104–118 → 120–164 → 360–371), `cart.js` (19, 82–89, 119–209, 130–135, 143–149, 151–179, 203), `webhook.ts`, `admin.js`. The packet even contradicts itself on one anchor: prose says "~lines 149–174," the note says "`:153–169`."
- **What goes wrong:** Any file with ≥2 edits has stale numbers for the 2nd edit onward. Combined with D1/D3 (where numbers are the *only* locator), this is where the agent most plausibly mis-targets.
- **Fix to inline:** Re-anchor every edit on a unique quoted string ("find this exact block"), and demote all line numbers to non-authoritative hints. The packet already does this correctly in 1.1 / 1b / 5.2 / 6.2 — apply that pattern everywhere.

### D13 — Residual "if the probe shows…" conditionals remain after the contract is filled, inviting the agent to re-open settled decisions. (LOW-MED)
- **Where:** Phase 3 header ("Method names/options in brackets are the Phase-0 lead hypotheses — swap if they differ" — but the Phase 3 code contains *no* brackets); Phase 3 "Fallback (only if Phase 0 shows…)" and "If the probe shows an address must be pushed"; Phase 2 "If Phase 0 shows billing stays inside the Payment Element"; error-table line "if the probe shows a session-level signal … re-add the slot."
- **What the agent must decide:** Each is a live "if needed / as appropriate" branch. The filled VERIFIED CONTRACT already resolves all of them (separate billing element confirmed, `fields` rejected, etc.), but the agent has to cross-reference the contract to *realize* they're dead — and the "swap the brackets" line points at brackets that don't exist, which reads like something's missing.
- **Fix to inline:** Delete the dead branches or tag each "RESOLVED by VERIFIED CONTRACT — do not act." Remove the stale "brackets" sentence.

### D14 — Ambient globals/helpers are asserted to exist with specific names but never shown. (LOW)
- **Where:** Phase 3 note ("`getCart`, `getCartTotal`, `getOrCreateBrowserSessionId`, `formatPrice` come from `main.js`"); Phase 5.1 ("uses the module-private `shell()` + `escapeHtml()`"); Phase 5.2(a) (`sendEmail` from `./_emails/index`).
- **What the agent must trust:** Exact names and signatures — `getOrCreateBrowserSessionId` (vs `getSessionId`), `shell(body): string` (arg shape), `sendEmail({to,subject,html})`. None are quoted. (`getOrCreateBrowserSessionId` is also the crux of D2.)
- **Fix to inline:** Add a one-time "Ambient helpers" appendix: each name, its source file, and its signature, quoted from the declaration.

### D15 — The Stripe-sample reference is an absolute machine-specific path. (LOW)
- **Where:** Phase 0: `/Users/seanivore/Development/freelance-payments-dev/assets/docs/RESOURCES/stripe-sample-code/public/checkout.js`.
- **What goes wrong:** A fresh agent (or CI checkout) won't have `/Users/seanivore/…`. Impact is low because the filled contract supersedes the sample, but it's a non-portable locator.
- **Fix to inline:** Make it repo-relative: `assets/docs/RESOURCES/stripe-sample-code/public/checkout.js`.

### D16 — `[data-address-incomplete]` is mounted in Phase 2 but never driven in Phase 3. (LOW)
- **Where:** Phase 2 markup includes `<div data-address-incomplete …>`; the error-states table maps it; Phase 3 `checkout.js` never toggles it (it toggles `[data-restricted-country]` and `[data-checkout-error]` only).
- **What goes wrong:** Harmless (the Stripe element shows its own inline incompleteness), but it's a selector defined in one phase and consumed in none — the agent may waste time hunting for the missing handler.
- **Fix to inline:** One line in Phase 3: "`[data-address-incomplete]` is intentionally inert — the Stripe element surfaces incompleteness inline; do not wire it."

---

## If you fix one thing

**D1 — inline the verbatim current code for Phase 1.2 and 1.3.** It is both the highest-probability misfire (a delete + a replace located only by line numbers that Phase 1.1 has already shifted, with no quoted before-state to anchor on) *and* it sits on the exact `sessions.create(...)` path the whole packet was written to repair. A wrong span there fails silently — no `tsc` error, a 200 that creates the wrong session — and lands you in the sixth round. It also generalizes: the same paste-the-current-block fix neutralizes the systemic line-drift problem (D12) and is already the packet's own proven pattern (1.1, 1b, 5.2, 6.2). Closest runner-up is D2 (the unshown `cart.js` `session_id` source), because a mismatch there 410s every checkout deterministically.

---

## Verdict

**NEEDS MORE INLINING** — several replace/delete steps (1.2, 1.3, 4.2b, 4.2c, 4.1) describe the current code instead of quoting it and rely on drift-prone line numbers, and a handful of API shapes and cross-file contracts (`session.total.*`, `complete.js` fields, the `available=false` write, the `cart.js` session id) are asserted rather than shown. The fixes are mechanical: quote the current block at each described edit, and pull the asserted-but-unshown shapes into the VERIFIED CONTRACT or a helpers appendix.
