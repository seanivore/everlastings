# v3.1.1 Gap Review — Angle A (cold / out-of-repo)

**Reviewer**: cold fresh instance, no repo access. Saw only the 4 provided docs.
**Lenses**: (a) North Star parity (every management capability doable in /admin AND GPT, equally); (b) Broader mandate — exclusively-executable, unvalidated assumptions, design-correctness, completeness against the base.
**Method**: full read of IMPLEMENT + DESIGN + TESTING + EVERLASTINGS_STORE. Settled base treated as fixed (no re-litigation). Code-behavior claims I can't verify are **flagged**, never asserted broken. Landmines list used as the validation grid, not training data.

---

v3.1.1 Angle A — first pass. NEEDS ANOTHER PASS.
Top of the stack — fix this one: record_sale uses where id = any(p_ids) which matches each row once regardless of array multiplicity. With the line-item-qty=1 architecture (IMPLEMENT:1047), a 2-unit cart of one piece silently decrements by 1. Ships healthy, corrupts inventory. Six lines of SQL with unnest + group by + count(*) closes it.
The next four (all HIGH):

GPT createCoupon schema still demands Unix timestamps — the v2.1 FEEDBACK_COUPON regression class is only half-closed. /admin got expires_date + endOfDayET; the GPT didn't. Add expires_date to the OpenAPI schema + one-line instruction.
Phase 3.7c byte-anchors edits on code that P3d eliminates. The load-bearing video skip_transform=true behavior has no anchored home in P3d. Collapse 3.7c, push the rule into P3d explicitly.
Phase 6.3 reads additive but every change is already inside WS1's NEW blocks. Builder will scan for missing "before" state and stall. One-line cross-reference.
Refund relist prompt only fires when !available || archived — multi-qty refund on a still-available piece leaves stock un-restored. WS6.3 framing says always-offer; testing item 5 reads no-prompt-needed. Need to pick: always-offer with "did the customer return the piece?" or document the current behavior as deliberate (compensation refund).

Cross-cutting wins: parity matrix holds (every capability in both surfaces), settled-base alignment clean, static gates well-chosen. Executable-design boundary slips at exactly two places — P3d functional rules and P0's productState function — both fixable with prose, not rework.
Twelve more findings (MEDIUM through LOW) in the file. None structural.

---

## Ranked findings

### CRITICAL — would silently corrupt data, no error path

**1. `record_sale` RPC mis-decrements when one cart buys >1 of the same multi-qty product.**

Location: IMPLEMENT Phase 6.1 — `supabase/migrations/20260616000001_v3_1_inventory_decrement.sql`.

The RPC uses `where id = any(p_ids)` — Postgres matches each row **once** regardless of how many times that id appears in `p_ids`. The IMPLEMENT itself locks the architecture at line 1047: *"the line-item quantity stays 1 (one of each piece per order)"* — so a customer buying 2 units of a qty=2 product produces `items: [{id:X}, {id:X}]` → `p_ids: [X, X]` → row matched once → quantity decrements by **1 instead of 2**. Result: DB says qty=1 + available=true after a sale of 2 units; the next shopper buys ghost stock. Tests 33–34 don't catch it (they exercise sequential single-unit purchases). The atomicity claim in Test 34 is true at the row-lock level but doesn't address the multiplicity-in-one-call case.

Fix (drop into the migration body):
```sql
create or replace function record_sale(p_ids uuid[])
returns void language sql as $$
  with counts as (select id, count(*)::int as n from unnest(p_ids) as id group by id)
  update products p
  set quantity  = greatest(coalesce(p.quantity, 0) - c.n, 0),
      available = greatest(coalesce(p.quantity, 0) - c.n, 0) > 0
  from counts c
  where p.id = c.id;
$$;
```
+ add a TESTING row: *"Multi-qty same-product, one cart: set qty=2 → add to cart twice → checkout → quantity 2→0, available=false (proves duplicates in items[] decrement correctly)."*

Why this is the worst finding: every other gap surfaces visibly (build break, schema reject, missing UI). This one ships, looks healthy, and is invisible until a customer hits "out of stock" on a product the DB swears is available.

---

### HIGH — regression risk + self-containment defects a fresh builder will stumble on

**2. The GPT `createCoupon` path still requires the GPT to compute a Unix timestamp — the v2.1 `FEEDBACK_COUPON` regression class isn't closed on this surface.**

Location: IMPLEMENT Phase 2.2d + GPT schema (`v3_3_0_GPT_SCHEMA.txt`) for `createCoupon` — schema is NOT updated.

The /admin path is fixed: it sends raw `expires_date` (YYYY-MM-DD), the new `endOfDayET()` helper computes the ET end-of-day instant server-side. Clean. The **GPT** path still posts `expires_at` as Unix seconds. The note at IMPLEMENT line 675 — *"the GPT may still send expires_at directly (back-compat — both resolve to the same store-TZ instant for an Eastern owner)"* — is wishful: it presumes the GPT correctly constructs ET end-of-day from a date intent. The v2.1 regression was exactly the GPT getting that wrong. Instruction 2.3 only says "never invent an expiry" and "never decode a timestamp on read" — it doesn't teach the write side.

Fix: add `expires_date` to the `createCoupon` schema as an optional alternative to `expires_at`, with model-facing wording "Prefer this — the server normalizes to end-of-day in the store timezone, so you don't compute a timestamp." Then one line in the GPT instruction at 2.3 NEW: *"Send the date as `expires_date` (e.g. `2026-06-21`); never construct a Unix timestamp."* `handleCoupon`'s 2.2d normalization already accepts `expires_date` — only the schema/instructions need to expose it.

**3. Phase 3.7c is byte-anchored against code that DESIGN P3d eliminates — stale anchor + load-bearing logic with no byte-anchored home.**

Location: IMPLEMENT 3.7c (anchored to `admin.js:371-372`) vs DESIGN §WS4 P3d (replaces the single `#upload-role` select with role-sectioned upload zones).

3.7c surgically adds `isVideo` auto-skip-transform to the existing single-select upload handler. P3d throws that handler away. IMPLEMENT line 858 acknowledges this in prose — *"3.7c's video auto-skip moves into the Video zone's handler"* — but leaves 3.7c sitting in WS3 as a byte-anchored mandatory edit, and the new Video-zone handler is "executable design — concrete default + render-tune," not byte-anchored. A fresh builder has three failure modes:

(a) apply 3.7c, then strip it for P3d (double work / merge conflict),
(b) skip 3.7c and find the new P3d code doesn't carry the skip-transform behavior — Cloudinary will choke on the unflagged video upload, silently or with a 4xx,
(c) apply both and have a dead code path lingering.

This is the *exact* hazard the byte-anchored discipline is supposed to prevent.

Fix: collapse. Either (a) **remove 3.7c entirely** and add an explicit one-liner to P3d: *"Video zone's upload handler sets `skip_transform=true` unconditionally on the multipart POST — this replaces the old global checkbox/auto-infer."* Or (b) keep 3.7c only if WS3 is required to land **before** P3d, and call out the strip-and-replace as a numbered step in P3d.

**4. Phase 6.3 reads as additive but every change it describes is already in WS1's NEW blocks — builder will either no-op-re-edit or get confused looking for the "before" state.**

Location: IMPLEMENT Phase 6.3 (lines 1085–1089) vs WS1.1b (lines 116–153), WS1.5c (lines 312–333), Phase 1.4a (line 219).

6.3 says *"This supersedes WS1's `available:true`-only relist"* and instructs:
- *"WS1.1b — add `quantity` to the refund handler's products(...) select and to the returned `relist` object"* → WS1.1b NEW already selects `quantity` (line 118) and returns `quantity: p.quantity ?? 0` (line 151).
- *"WS1.5c `relistPiece` — PUT `{quantity: r.quantity + 1, available: true}`"* → WS1.5c NEW already does this verbatim (line 326).
- *"GPT instruction 1.4a — relist via editProduct {quantity: <current+1>, available:true}"* → Phase 1.4a NEW already says *"editProduct {available:true, quantity: relist.quantity + 1}"* (line 219).

So WS1 is the post-WS6.3 state. 6.3 is documentation describing the design rationale, not an additive diff. But it reads like a diff. A fresh builder following the workstream order (1 → 6) reads WS1, applies it, then hits 6.3 and either thinks "I missed something" (scans WS1 for `available`-only code that no longer exists) or applies the changes a second time (mostly no-op but confusing).

Fix: restructure 6.3 to be a one-line cross-reference: *"WS1's NEW blocks above already incorporate the canonical stock-restore (this section is the spec they implement)."* OR present 6.3 as a real diff by splitting WS1.1b/1.5c into "Step A — refund handler (available-only)" then "Step B — fold stock restore (per WS6.3)" — but that's more invasive. The one-liner is the right move.

**5. Refund relist prompt skips for still-available pieces — multi-qty refund leaves stock un-restored AND WS6.3 spec and WS1 code disagree on whether it should.**

Location: IMPLEMENT 1.5c `submitRefund` (line 297) vs WS6.3 framing (line 1085).

WS1.5c's prompt fires only when `r.available === false || r.archived`. Multi-qty scenario: qty=2 → one sold → qty=1, available=true → refund → still available=true → **no prompt** → stock is not incremented even though the unit returned. Em has zero chance to acknowledge.

But WS6.3's framing reads *"A refunded unit returns to stock when the owner confirms 'put it back up for sale'"* — implying always-offer. And testing addendum item 5 reads the other way: *"refund a piece that is still available (e.g. multi-qty) → refund succeeds, no relist prompt (nothing to relist), no error."* So the test is consistent with WS1.5c's code, but WS6.3's prose is consistent with the always-offer reading. Two specs.

Two equally legitimate user-intent questions: refund = compensation (don't touch stock) vs refund = return (restore stock). The current code defaults to compensation-style for available pieces and asks for sold/archived. There's a real product question here.

Fix: pick one and commit, in writing.
- **Option A — always offer**: change 1.5c's guard from `if (r.available === false || r.archived)` to `if (r)`, and rephrase the prompt to *"Did the customer return the piece? (puts +1 back in stock)"* — Yes triggers the restore, No leaves stock alone. Update testing item 5 to expect the prompt.
- **Option B — current behavior is the spec**: WS6.3's wording is updated to *"A refunded unit returns to stock only when the piece is currently sold-out or archived (refund of an in-stock unit is treated as compensation)."* Em handles the rare multi-qty-return case via manual qty bump in the editor.

A is closer to the North Star (Em never thinks "I need to bump qty"). B is closer to the safe-default invariant at IMPLEMENT line 29 (never silently relist). I'd lean A with the explicit "Yes/No" framing — but the choice is Sean's, not the builder's.

---

### MEDIUM — visible defects but not build-blocking

**6. Phase 3.7a image-role regex misses `checkout_image` and `seo_thumbnail`.**

Location: IMPLEMENT 3.7a (line 898): `/\/(?:test_)?(hero|thumbnail|gallery-\d+|detail-\d+|video-\d+)[-.]/`.

The settled role set (EVERLASTINGS_STORE.md AR #37) is `hero | gallery-NN | detail-NN | thumbnail | checkout_image | seo_thumbnail | video-NN`. The regex matches 5 of 7. An uploaded `checkout_image` or `seo_thumbnail` URL gets an empty role tag in the preview — silent, no error.

Fix: extend the regex: `/\/(?:test_)?(hero|thumbnail|seo_thumbnail|checkout_image|gallery-\d+|detail-\d+|video-\d+)[-.]/`. Same regex used in `updateCoverage` (line 914-915) doesn't need this fix — it intentionally only counts hero and gallery for the "what's missing" hint.

**7. DESIGN P3d (role-sectioned upload zones) is prose only — but the logic it replaces is load-bearing functional, not visual.**

Location: DESIGN §WS4 P3d (line 86), referenced from IMPLEMENT line 858.

The zone-determines-role design is conceptually clear, and per executable-design rules visual tuning is fine to leave for render-tune. But several decisions inside P3d are functional, not visual:

- **Gallery auto-numbering**: "Gallery (auto-numbers gallery-01..NN)" — what's the rule? Next = max(existing N) + 1? Sequential by upload order? Holes after a delete — re-fill or skip? Renumbering existing files would mean renaming on the CDN, which violates the "nobody renames a file" invariant (Landmine 4).
- **Video zone skip_transform**: the only home for the 3.7c logic (see #3) — not specified inside P3d.
- **Per-zone landing into `#p-images`**: Hero zone inserts at top? Detail inserts after Gallery rows? This affects the order images render on the product page.
- **Empty-zone state + per-zone error reporting**: where does an upload failure render?

Fix: add 4–6 explicit one-liners to P3d covering each of these. None require code — short prose locking-down. Recommend for Gallery numbering: *"Next N = max(existing gallery-NN in `#p-images`) + 1; ignore holes (deleting gallery-02 leaves gallery-01 + gallery-03 + next upload becomes gallery-04 — never rename)."*

**8. P0 product-list state-filter is described concretely on taxonomy but the `productState(p)` function and the subtab JS are left for the builder to infer.**

Location: DESIGN §WS4 P0 (line 79) + the productState taxonomy (lines 70–77).

The 5-state taxonomy is locked (Archived → Draft → Edits → Sold → Live, first match wins) and the 4 filter tabs are locked (All / Live / Draft / Sold / Archived; Edits lives under Live with a badge). But:

- `productState(p)` itself isn't written. It's 6 lines.
- The subtab HTML pattern is "mirror admin/index.html:243-256." A fresh builder is told to read another part of the file and copy a pattern — fine for design but not for the function that drives the canonical state classification across the whole admin (Landmine 21 explicitly warns against divergent predicates).
- Filter wiring: click-handler delegate? Re-render `state.products` or filter in-place?

For an element that drives both P0 (filter tabs) and P2 (status pill), variance between two builders' guesses is a real risk.

Fix: write out `productState` explicitly (6 lines), the subtab markup (~5 lines mirroring orders subtabs), and the click-handler delegate (~10 lines using existing `state.products`). At that point the rest is mechanical.

**9. `openaiFileIdRefs` schema declares `items: { type: string }` but the handler reads each ref as an object — flag, needs smoke-test.**

Location: IMPLEMENT 3.4a (schema, line 813-814) vs 3.2 handler (line 753 onward).

The platform-substitution dance (OpenAI replaces the string array with `{name, id, mime_type, download_link}` objects at runtime) is documented in the v3_0_0 brief and confirmed across the OpenAI Custom GPT docs — so this **probably** works as designed. But:

- If a future Custom GPT runtime tightens validation, `items: { type: string }` rejects an object array.
- A stricter Action validator might already reject it; we won't know until item 14 of the testing addendum runs on the real preview.

Mitigation today: declare the actual shape so the schema matches the handler's reality:
```yaml
openaiFileIdRefs:
  type: array
  items:
    type: object
    properties:
      name: { type: string }
      id: { type: string }
      mime_type: { type: string }
      download_link: { type: string }
    additionalProperties: true
```
Keep the model-facing description "Leave the values to the platform — just include this property so the attached files are forwarded." If this BREAKS OpenAI's substitution (i.e. OpenAI requires the string-array placeholder to fire its substitution behavior), revert with a comment — but the smoke test will tell. Adding the explicit shape is the lower-regret default.

**10. `collectMedia` GIF-like preset omits `controls` — flag against `populateMedia`'s default.**

Location: IMPLEMENT 3.7b `collectMedia` (lines 991–995).

EVERLASTINGS_STORE.md line 1024 says: *"a click-to-play clip shows controls by default — omit controls … autoplay+loop = silent GIF-like, no controls."* The new editor's GIF-like preset emits `{type:'video', url, autoplay:true, loop:true, poster?, alt?}` — `controls` omitted. The base doc *implies* `populateMedia` infers no-controls from `autoplay && loop`, but I can't verify the inference exists in `product.js`. If `populateMedia` defaults `controls=true` whenever the field is missing (a common pattern), every GIF-like clip set up via the new editor will render WITH controls — breaking the GIF-like UX.

Fix: verify `populateMedia`'s exact controls-default logic. If it doesn't infer from autoplay+loop, change collectMedia to set `controls: false` explicitly inside the GIF-like branch:
```js
if (row.querySelector('.m-autoplay').checked) { item.autoplay = true; item.loop = true; item.controls = false; }
```
Cheap and harmless to ship even if `populateMedia` *does* infer.

---

### MEDIUM-LOW — verification needed, single-line fixes if wrong

**11. Refund confirm prompt assumes `customerEmail`, `totalLabel`, `productTitle` are in `buildOrderCard`'s scope — flag.**

Location: IMPLEMENT 1.5b (lines 261–263), footnote at line 335.

The footnote claims these identifiers are in scope at the click-handler attachment site. I can't verify against the repo. If any of them isn't actually in `buildOrderCard`'s closure at the moment `addEventListener('click', ...)` runs, the prompt throws `ReferenceError` on click — the refund button silently fails to do anything.

Fix: builder verifies before applying 1.5b. If they aren't in scope, derive them from `order` at the top of the click handler.

**12. `listOrders` `q=<buyer email or id>` is referenced in GPT instructions but the parameter isn't anywhere in IMPLEMENT — flag.**

Location: Phase 1.4a NEW (line 219) — *"find the order first (listOrders q=<buyer email or id>)"*.

If `listOrders`' actual signature accepts a `status` filter but not a free-text `q`, the GPT can't find an order to refund by buyer email. The GPT would have to fall back to listing all + filtering in its own context — possible but the instruction reads as if `q` is supported.

Fix: verify `api/orders.ts > GET` accepts a `q` query parameter. If not, either add one (small addition to orders.ts, on-spec for the admin search bar that already exists at `#orders-search` per Phase 2.1e line 449) or rewrite the GPT instruction to describe the actual filter capability.

---

### LOW — minor

**13. /admin coupon scope is single-product only; GPT can scope to multiple.**

Location: IMPLEMENT 2.1b — `<select id="c-product">` single-select (line 387) → `payload.product_ids = [product]` (line 562).

`createCoupon` backend accepts `product_ids: array`. The GPT can ask for "10% off these 3 lofts." The /admin form can't. Strict parity gap. Probably not worth fixing (Em likely doesn't scope coupons to arbitrary multi-product sets), but if true parity is the bar, the picker becomes a checkbox list.

Fix: optional. If skipped, note as deliberate in the as-built doc so a future audit doesn't surface it as a defect.

**14. No proactive char budget for `v3_3_0_GPT_INSTRUCTIONS_TRIMMED.txt` against the 8000-char cap (F5).**

Location: Testing addendum static gate; IMPLEMENT doesn't quote current file size or per-edit deltas.

The gate catches an over-budget file at test-time. Bytes added (rough estimate from reading 1.4a, 1.4b, 2.3, 3.5a, 3.5b net replacements): WS1 ≈ +250, WS2 ≈ +200, WS3 ≈ +400 net. Total ~+850 chars. If the current file is at ~7200, the WS edits land at ~8050 — over. If it's at ~6500, there's room. **Worth a 30-second `wc -c` on the current file + a one-line note in IMPLEMENT** so the builder knows the headroom before, not after.

**15. Lottie `loadAnimation` lacks try/catch.**

Location: DESIGN §5.1 (lines 130–141).

User-visible outcome is correct either way (no `.has-lottie` class → static `<h1>` stays visible), so the fallback works on a thrown exception just as well as on a never-fired `DOMLoaded`. The only cost is a console error if `loadAnimation` throws sync. Defensive `try { … } catch {}` is one-line + zero downside.

**16. `refundOrder` response schema declares `relist: { type: object }` without inner properties.**

Location: IMPLEMENT 1.3 (line 207).

GPT instruction 1.4a reads `relist.archived`, `relist.quantity`, `relist.available`, `relist.title`, `relist.slug`, `relist.product_id`. The schema is opaque — the GPT figures it out from the description + the example fields named in the instruction. Probably works but explicit is better and cheaper to write than debug.

Fix: enumerate the properties (6 lines in the YAML, no behavior change).

**17. WS6 `record_sale` `available` derivation reads pre-update `quantity` — verify intent.**

Location: IMPLEMENT Phase 6.1 SQL.

The SET clause `available = greatest(coalesce(quantity, 0) - 1, 0) > 0` references `quantity` — which in Postgres UPDATE refers to the **old** column value (all SET expressions see the pre-update row). So this evaluates to `(old_quantity - 1) > 0` = `new_quantity > 0`. Correct for the desired behavior, but it's brittle reading: a future maintainer might "fix" it to `available = quantity > 0` thinking it should reference the new value, and break it. Worth a one-line SQL comment: `-- both expressions reference the OLD row state (Postgres UPDATE semantics); together they = (new_quantity > 0)`.

---

## Cross-cutting observations (not gaps, but worth a paragraph)

- **Parity matrix is solid.** Every management capability I traced exists in both /admin and the GPT after v3.1.1 lands: refund (#WS1), refund-relist (#WS1.5c + GPT 1.4a), coupons (#WS2 closes the /admin gap), upload-by-attach (GPT-only by design — chat is the GPT's surface, not /admin's; the by-link upload remains the universal backstop, plus /admin has the multipart upload), structured media editor (WS3.7b in /admin, the GPT sends the same structured shape conversationally), inventory decrement (automatic, both surfaces). North Star holds.
- **Settled-base alignment is clean.** The plan's claims about webhook idempotency, the `is_test` boundary, the `?_action=` rewrite pattern, the no-new-function constraint, the price-rotation rule, the role-from-filename load-bearing-ness, and the `media` shape `populateMedia` reads — all match the EVERLASTINGS_STORE.md as-built. No conflicts with the substrate.
- **Static gates are well-chosen.** The testing addendum's first-line gates (`tsc --noEmit`, function count, `vercel.json` JSON validity, GPT schema char caps, the 8000-char assembled-instructions cap, the `record_sale` migration applied) are the right pre-runtime checks. Adding a `wc -c` reality check on the instructions file ahead of the build (per #14) would close the last reactive loop.
- **Executable-design vs byte-anchored boundary.** WS4–5 are correctly scoped as executable design — the visual decisions ride on render-tune. The two places where this boundary slips (P3d's functional load-bearing decisions, #7; P0's productState function, #8) need a small amount of explicit prose to push back across the line. Those are the two design-side fixes worth making before build.

---

## "If you fix one thing"

**Fix #1 — the `record_sale` duplicate-id mis-decrement.** Everything else fails loudly (build break, schema reject, missing UI, console error, ReferenceError, render glitch). Only this one ships, looks healthy, and silently corrupts inventory the first time a multi-qty piece sells >1 in a single cart. Six lines of SQL + one new test row.

## Verdict

**NEEDS ANOTHER PASS.**

Drivers: #1 is a real correctness bug; #2 leaves the v2.1 regression class half-closed; #3–#5 are self-containment / spec-alignment issues a fresh builder will trip on. None require structural rework — all are surgical edits inside the existing plan. One more pass to fold these in, then it's ready.
