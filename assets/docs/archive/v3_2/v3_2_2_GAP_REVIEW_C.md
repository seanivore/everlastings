# v3.2.2 — Gap Review C (integration) · Round 3 (scoped delta re-run)

**Lens:** (a) North Star — minimize Em's friction; every capability doable in BOTH /admin AND the GPT. (b) The v3.2.2 delta hunted through the *integration* angle — a locally-correct edit that, in the wider system, makes a by-chat/by-admin capability fail or leak, or breaks a render. Scope this round = the two folds that landed in the integration lane between v3.2.1 and v3.2.2; the rest of the system was cleared on the v3.2.1 pass and the repo is unchanged (docs-only folds), so it is not re-litigated.

---

```
  Verdict: READY TO BUILD

  Both v3.2.2 integration-lane folds compose. I traced each against the actual shipped code, not
  just the docs.
  
  Edit 1 — WS6 cutover ships COMMENTED — fully clear.
  - record_sale is the only live statement in the migration, so supabase db push applies just the
  function — self-contained, idempotent, and products.quantity already exists in the base schema.
  - The webhook swap byte-anchors exactly, and record_sale's SELECT and UPDATE share an identical
  predicate, so the eyeball equals the zeroing set. System stays consistent whether or not the
  manual cutover has run. This is exactly the mechanism my round-2 finding recommended.

  Edit 2 — coupon min_amount readback — composes, one low finding.
  - Wire reads the right path (pc.restrictions?.minimum_amount — promotion-code level, where create
  wrote it). /admin converts dollars↔cents correctly across the form, onCreateCoupon, and
  renderCoupons. GPT visibility confirmed: listCoupons is an opaque 200 in the shipped schema, so
  the new field reaches the model with no schema edit — the no-schema-edit claim holds.
  
  The one finding (C-R3-1 · LOW · needs-verification)

  The fold protected the date readback with a decode-free helper (expires_display) so the GPT never
  decodes a raw value — but left its own new money field (min_amount, and the pre-existing
  amount_off) as raw cents for the GPT to scale by 100 itself. /admin renders $50.00 unambiguously;
  the GPT's dollar figure rests on inference, and the test gate (item 13) checks the field is
  visible, not that the GPT speaks dollars — so a 100×-off readback would pass.

  I flagged it as needs-verification, not broken: the createCoupon schema tells the GPT min_amount
  is "in cents," so a capable model likely infers correctly. The clean fix mirrors the date pattern
  — emit a min_display dollar string and relay it — or one read-side cents line in the instruction
  plus a unit-correctness assertion in test item 13.
  
  It's the single most important fix but non-blocking — fold it for completeness at your discretion;
  it doesn't hold the build. That leaves C clear on both folds for the round-3 close.
```

---

## What I re-traced (and what I deliberately did not)

- **Re-traced (the v3.2.2 delta in my lane):** the WS6 Phase 6.1 migration (cutover UPDATE now COMMENTED; `record_sale` the only live statement) and the coupon `min_amount` readback path (`handleCouponList` wire field → `renderCoupons` → the GPT's opaque-200 raw-body read).
- **Not re-traced (blessed on the v3.2.1 pass, repo unchanged):** refund optimistic-flip vs `charge.refunded` idempotency + `is_test` scoping; the `products(...)` relist embed + `relistPiece` reuse; `requireAdmin` accepting the GPT; chat-attach → the shared pipeline → `product.js` filename regexes; the admin-redesign composition with the WS1–3 same-file edits; the homepage hero swap (layers + reduced-motion + the real `<h1>`).

## Headline

Both folds compose end-to-end against the working tree.

- **Edit 1 — WS6 cutover ships COMMENTED — CLEAR.** `record_sale` is the only live statement in `20260616000001_v3_1_inventory_decrement.sql`, so `supabase db push` applies just the function; it is self-contained, idempotent (`create or replace`), and references only base-schema columns (`products.quantity` exists — `initial_schema.sql:55`, `integer DEFAULT 1`; the checkout gate already reads it — `checkout.ts:79`/`:205`). The webhook Phase 6.2 swap byte-anchors exactly (`webhook.ts:156-160` matches the CURRENT block) and `supabase.rpc('record_sale', { p_ids })` maps the `productIds` string array to the `uuid[]` signature. The commented cutover SELECT and UPDATE share an **identical** WHERE predicate, so the eyeball matches what gets zeroed, and the TESTING static gate enforces the commented state by `grep`. The system is consistent whether or not the manual cutover has run yet: new sales decrement correctly; pre-WS6 sold rows simply wait at `(available:false, quantity:1)` for the by-hand UPDATE. This is exactly the mechanism my own round-2 C-R2-1 recommended and Sean accepted (manual-run-once). No defect introduced by commenting.
- **Edit 2 — coupon `min_amount` readback — composes, one low/needs-verification finding.** The wire add reads the right path — `min_amount: pc.restrictions?.minimum_amount ?? null` (`restrictions` is on the **promotion code**, which is exactly where `handleCoupon` create wrote it — `products.ts:736-737` — not on the coupon). The /admin render converts correctly and consistently: the form collects dollars (`#c-value`/`#c-min`, `step=0.01`, "$" labels), `onCreateCoupon` posts cents (`Math.round(min*100)`), and `renderCoupons` renders cents→dollars (`· min $${centsToDollars(c.min_amount)}`); `centsToDollars`/`dollarsToCents` exist in the shipped `admin.js` (52/46). GPT visibility is confirmed at the artifact level: `listCoupons` has an **opaque 200** in the shipped schema (`v2_0_0_GPT_SCHEMA.txt:236-239` — `'200': { description: Active coupons. }`, no `schema.properties`), so a new wire field reaches the model with no schema edit — the no-schema-edit claim holds. The one open seam is the GPT's *unit* interpretation on readback (C-R3-1 below).

---

## Ranked findings

### C-R3-1 (LOW · needs-verification · the single finding this round) — the coupon money fields are GPT-readable but the GPT read path has no decode-free dollar helper or read-side cents instruction, unlike the date sibling the same fold protected

- **Location:** `products.ts` `handleCouponList` push (IMPLEMENT 2.2b — adds `min_amount: pc.restrictions?.minimum_amount` in **cents**, beside the existing `amount_off` in **cents**) → the GPT COUPONS read instruction (IMPLEMENT 3.9 / `:1383`: "listCoupons gives expires_display (a plain date) + each sale's scope — relay that, never decode a timestamp") → TESTING item 13 (asserts `min_amount` is **visible**/not-write-only on both surfaces, not that the GPT speaks the right dollar figure).
- **The integration gap (flag, not assert):** the fold's stated goal (AR#C-R2-3) is that a coupon is *fully verifiable on both surfaces*. /admin meets that unambiguously — `centsToDollars` renders `· min $50.00`, and TESTING item 11 pins that exact string. The GPT meets *visibility* (it can read `min_amount`/`amount_off` off the opaque-200 raw body) but its **unit** correctness rests on inference: the read instruction names only `expires_display` + scope, and there is no dollar display field for the money values, so the GPT decodes a raw cents integer (`min_amount: 5000`, `amount_off: 5000`) sitting next to a non-cents `percent_off: 20` in the same object. This is the *same class of bug* the fold deliberately designed around for the date — `expires_display` exists precisely "so the GPT never decodes a raw value" (the FEEDBACK_COUPON regression where a raw `expires_at` was misread). The delta gave the date a decode-free helper but left its own new money field (and the pre-existing `amount_off`) for the model to scale by 100 — and TESTING item 13 checks visibility, not unit-correctness, so a 100×-off readback ("minimum order $5,000" for a $50 minimum) would pass the gate. **Why needs-verification, not broken:** the `createCoupon` schema tells the GPT `min_amount` is "in cents" on input (`v2_0_0_GPT_SCHEMA.txt:230`) and the instruction says "amount-off in cents; dollars→cents", so a capable model likely carries the cents convention into its readback; Stripe's minor-unit convention is also well known to it. I cannot confirm a misreport from the docs — only that the read path lacks the decode-free guarantee the /admin render and the date field both have.
- **Concrete fix (pick one; non-blocking):**
  - **Pattern-consistent (recommended):** mirror `expires_display` — have `handleCouponList` (and the create echo) also emit a formatted dollar string, e.g. `min_display: pc.restrictions?.minimum_amount != null ? '$' + (pc.restrictions.minimum_amount/100).toFixed(2) : null` (and an `amount_off` companion), and add "relay `min_display` / the amount in dollars" to the COUPONS read instruction. This makes the GPT money readback exactly as robust as the date — no decode anywhere.
  - **Lighter:** add one read-side line to the COUPONS instruction — "listCoupons `amount_off`/`min_amount` are in **cents** — report them in dollars" — and harden TESTING item 13 to assert the GPT *states the minimum in dollars* (not just that the field is present).

---

## Verified clean (the Angle-C delta checklist — traced to code, recorded so the loop doesn't re-raise it)

- **WS6 migration leaves a consistent system.** `record_sale` applies cleanly via `db push` (only live statement; idempotent; base-schema columns only; `p_ids uuid[]` ↔ `supabase.rpc('record_sale', { p_ids: productIds })`). The commented cutover's SELECT and UPDATE share an identical predicate (`available=false AND quantity>0 AND exists(orders … is_test=p.is_test)`) so the eyeball equals the zeroing set; the env dimension is in the SQL, not a comment. Timestamp prefix `20260616000001` is already monotonic over the base top of `20260605000001` — no renumber. Mid-build STORE divergence (`:614`/`:699-700`/`:709` still describe the available-only model) is the shipped truth and is correctly deferred to the Phase 6.4 as-built sync, not edited mid-build — no mixed-truth conflict.
- **Cutover sequencing is gated, not auto-destructive.** The TESTING static gate `grep`s the UPDATE is `--`-commented and documents the by-hand SELECT→confirm→UPDATE-once procedure (AR#C-R2-1). The only residual is operational (an operator who runs `db push` + goes live but defers the manual cutover, *then* refunds+relists a pre-WS6 sold piece, would land `quantity` at 2 — a phantom unit). This is the accepted tradeoff from round-2 (favor a mechanical-safe default over an auto-zeroing migration), moot for Emy's all-qty-1 catalog, and low-exposure for the template "User"; I note it only so the deploy runbook keeps "run the cutover at `db push` time, before live refunds" — not a code defect.
- **Coupon `min_amount` read path is correct end-to-end.** Wire reads `pc.restrictions?.minimum_amount` (promotion-code level — matches where create writes it), tsc-clean (`restrictions` is a typed `PromotionCode` property, `minimum_amount: number|null`). /admin render uses `centsToDollars` (exists) with a truthy guard (null/absent → no render). The fold is purely additive — no existing wire field or render changed, so no regression to the shipped coupon list.
- **No-schema-edit claim holds at the artifact.** `listCoupons` and `createCoupon` both declare opaque 200s in the *shipped* `v2_0_0_GPT_SCHEMA.txt` (`:239`, `:234`), so `min_amount` on the wire (and the `expires_display` create echo) reach the model with no schema change — and conversely a future addition to `refundOrder`'s *enumerated* `relist` response would still need a schema edit (the contrast the IMPLEMENT note draws is accurate).
- **The coupon fold composes with the admin redesign.** The coupon form/refresh/search wiring is applied at its own anchor (Phase 2.1e, `admin.js:164-170`), explicitly NOT in WS4's consolidated `attachEventListeners` diff (DESIGN P0(iii) note) — disjoint regions, no double-edit. WS4 only *restyles* the coupon list rows with tokens; it does not re-author `renderCoupons`' min/ends string logic, so the cents→dollars conversion survives the re-skin.

## The single most important fix

**C-R3-1** — give the GPT a decode-free dollar form of the coupon money fields (mirror `expires_display` with a `min_display`, or a one-line read-side cents instruction + a unit-correctness assertion in TESTING item 13), so the "fully verifiable on both surfaces" goal the fold sets is met on the GPT exactly as it is on /admin. Low and non-blocking — the model likely infers cents — but it is the one place the readback fold is less robust than its own date sibling.

## Verdict

**READY TO BUILD.** Both v3.2.2 integration-lane folds compose: the WS6 cutover ships safely COMMENTED with `record_sale` applying cleanly and the system consistent, and the coupon `min_amount` readback is correct on the wire, in the /admin render, and for GPT visibility (opaque-200 confirmed against the shipped schema). The single finding (C-R3-1) is LOW / needs-verification with a trivial, pattern-consistent fold — fold it for completeness at Sean's discretion; it does not hold the build.
