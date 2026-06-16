# v3.1.6 — Angle A Pre-Build Gap Review

**Lens:** Em's parity (every capability triggerable in BOTH /admin and the GPT) + broader exclusively-executable / unvalidated-assumption / design-correctness checks on what THIS delta adds.
**Method:** four uploaded docs only (no repo); flag-don't-assert on runtime behavior; settled v2.0.0 base is fixed substrate, not in scope.
**Verification done in-pass:** all 10 new schema description/summary strings counted (max 286, under the 300 cap); Phase 3.9 instruction file `wc -c` = 7652 (under the 8000 cap); Phase 3.9 wholesale text checked to carry the WS1.4a / 2.3 / 3.5a / 3.5b rule deltas through (substance preserved; full-goodwill-flip wording in 3.9 is actually clearer than in 1.4a).

---

## Ranked Findings

### HIGH — most likely to derail the build or leave a real capability missing

**1. WS4 init-wiring deltas are prose-anchored, not CURRENT/NEW — and the doc itself flags them as load-bearing.**
*Location:* `v3_1_6_ADDENDUM_DESIGN.md` P0 (line 161), P3d (line 204), and the "fix one bug = die" call-out at lines 264–266.
*What's wrong:* Four `attachEventListeners` changes are required and only one is byte-anchored. **Remove** `$('upload-btn').addEventListener('click', onUploadImage)` + the now-dead `onUploadImage` function at `admin.js:153`. **Add** `wireProductSubtabs()`, `wireUploadZones()`, and `$('editor-back').addEventListener('click', closeEditor)`. The doc explicitly warns "else init throws → orders subtabs, search, refund + coupon handlers that follow NEVER bind" — i.e. one missed delta silently breaks every WS1/2/3 capability behind it. Phase 2.1e wires `wireCouponEvents()` with a proper CURRENT/NEW block; the WS4 ones aren't held to the same standard.
*Concrete fix:* one consolidated CURRENT/NEW block for `attachEventListeners` showing the full before→after diff (remove the upload-btn line and the dead `onUploadImage` fn; add the three new wiring calls adjacent to the existing `wireCouponEvents()` call). 1→6 sequential builder then can't miss any of the four.

**2. `.upload-zones` / `.upload-zone` CSS is missing — the visual baseline doesn't exist to render-tune.**
*Location:* `v3_1_6_ADDENDUM_DESIGN.md` P3d (lines 207–217); also P5 mobile breakpoint (line 287).
*What's wrong:* P3d gives the markup (7 zones) and the JS contract (`wireUploadZones()`, dropzone behavior). No CSS — grid vs flex, gap, per-zone padding/border, dropzone hover/active state, mobile stacking. P5's mobile block doesn't mention `.upload-zones` either. P3d is the load-bearing parity bit (closes the video-role gap, kills the wrong-role footgun), and the doc admits the prior single-role UI was the bug. Render-tune polish is fine; render-tune from nothing is a decision the plan didn't make.
*Concrete fix:* concrete-default CSS for `.upload-zones` (grid template, gap, neutral background per `--c-bg-2`), `.upload-zone` (border, padding, dropzone visual on `:hover` and `.is-dragover`), and a P5 single-column override at the existing mobile breakpoint.

**3. Three valid upload roles aren't reachable from the GPT.**
*Location:* `v3_1_6_IMPLEMENT.md` Phase 3.4a `uploadImages` schema (`roles[]` description, line ~1063) and Phase 3.9 instruction step 2 (line ~1302).
*What's wrong:* Both the schema description and the instruction enumerate only `hero, gallery-01..15, detail-01..05`. The server's `ROLE_PATTERN` (and the new admin `.upload-zone` UI per P3d) recognise **seven** roles: those plus `thumbnail`, `seo_thumbnail`, `checkout_image`. The by-link `uploadImage` exposes all 7 via dedicated args (per 3.4b CURRENT at :269 it writes into `images[]`/`thumbnail`/`checkout_image`/`seo_thumbnail`). The attach path can't easily ask for those three. Direct parity hole: /admin gains 7-role assignment in this build; GPT keeps the 4-role view. The current 233-char roles description has plenty of room under 300.
*Concrete fix:* extend the `roles[]` description (3.4a) to enumerate all 7 with the prefix pattern; add one short line to Phase 3.9 step 2 mentioning `thumbnail`/`seo_thumbnail`/`checkout_image` as additional attach roles. Re-run the `wc -c` gate after the instruction edit.

**4. Silent role collisions in `handleAttachedRefs` overwrite uploaded files in R2.**
*Location:* `v3_1_6_IMPLEMENT.md` Phase 3.2 lines 982–1015.
*What's wrong:* `roles[]` is taken as-is per index; invalid entries fall back to `positionalRole(i)`. If GPT passes `['hero','typo','gallery-01']`, index 1 falls back to `gallery-01` AND index 2 is already `gallery-01` → server names both `gallery-01-{slug}.{ext}` → R2 silently overwrites file 1 with file 2. The product ends up with the wrong image at `gallery-01` and no error surfaced. The risk grows with finding #3 unfixed (the GPT will occasionally guess mis-typed/legacy role strings).
*Concrete fix:* in `handleAttachedRefs`, track `usedRoles` Set; on collision either auto-bump to the next free positional role (`gallery-NN`), or skip-with-failure (`{ok:false, role, error:"role already assigned to file <i>"}`). Either is concrete; the doc should pick one and embed it.

---

### MEDIUM — won't derail but creates ambiguity at build or test time

**5. TESTING #1 references an "All Orders / Shipped subtab" not established anywhere upstream.**
*Location:* `v3_1_6_ADDENDUM_TESTING.md` line ~22; settled base in `EVERLASTINGS_STORE.md` and Phase 1.1c CURRENT (`orders.ts:70-74`) only handle `needs_shipping` and `shipped`.
*What's wrong:* Test wording ("All Orders / Shipped subtab") doesn't match a subtab known from the docs. Test runner has to discover/decide. Needs-verification against actual admin markup.
*Concrete fix:* either confirm "All" exists and quote the subtab DOM, or rewrite the test step to "the Shipped subtab" only.

**6. The full-goodwill-flip warning is ambiguous on multi-piece carts.**
*Location:* `v3_1_6_IMPLEMENT.md` Phase 3.9 REFUNDS section (line ~1336): "a FULL-amount goodwill refund still flips the order to refunded — tell her."
*What's wrong:* The webhook's auto-flip on `charge.refunded` fires only when the full PI total is refunded. On a 3-piece $150 cart, a goodwill refund of $50 (one piece's amount, no relist) does NOT flip any sibling. "FULL-amount" reads as "full of the order Em clicked" — which can mean either the line amount (no flip) or the PI total (flip). Em can be told the wrong thing.
*Concrete fix:* tighten the wording in Phase 3.9 — e.g. "if she refunds the FULL purchase total (every dollar Stripe charged across the cart) as goodwill, the affected order(s) flip to refunded automatically; a goodwill refund of less than the full cart total does not flip status."

**7. P3d "Replace `admin/index.html:195`…" doesn't quote the CURRENT markup.**
*Location:* `v3_1_6_ADDENDUM_DESIGN.md` P3d line ~207.
*What's wrong:* Phase calls out a specific file:line and tells the builder to replace "the file input + #upload-role select + admin.js:onUploadImage" without quoting the CURRENT block. WS1–3 hold the quote-the-current-block standard; WS4 P3d drops it on the highest-leverage replacement.
*Concrete fix:* paste the verbatim `admin/index.html:195` CURRENT block (the file input + `<select id="upload-role">` + adjacent button) above the NEW seven-zone markup, in the same shape as Phase 1.1b/2.1b.

---

### LOW — cleanup, minor risk, or test-time NEEDS-VERIFICATION

**8. `.pill.available` CSS rule has no producer.**
*Location:* `v3_1_6_ADDENDUM_DESIGN.md` P2 line ~192. `productState(p)` returns `published / draft / sold-out / archived / refunded` per the canonical predicate; never `available`. Either drop the rule or document where it's intentionally reserved.

**9. `refundOrder` response `status: 'refunded'` is hardcoded even when no flip occurred.**
*Location:* `v3_1_6_IMPLEMENT.md` Phase 1.1b line ~195. On a partial / goodwill refund that doesn't equal the PI total, status remains `paid` in DB but the response field still claims `refunded`. Neither surface ACTS on this field (both branch on `relist[]`), so cosmetic — but it lies to the GPT, and the GPT may relay it to Em verbatim. Either omit when no flip occurred, or rename to `refund_id` / `refund_amount`.

**10. Migration timestamp collision risk.**
*Location:* `v3_1_6_IMPLEMENT.md` Phase 6.1 line ~1353 — `20260616000001`. Doc already notes "renumber if a later migration already exists"; flag as NEEDS-VERIFICATION at apply time.

**11. Lottie blank-render guard (`path, g` selector) — partial protection.**
*Location:* `v3_1_6_ADDENDUM_DESIGN.md` 5.1 line ~353. lottie-web can mount empty `<g>` containers; the guard would see a truthy match and add `has-lottie` → real `<h1>` hidden → blank hero. Manual lottie-web preview check (line 361) is the real gate. Acceptable per executable-design but worth noting the guard's limit and keeping the manual gate as a hard pre-ship step.

**12. Phase 2.1b coupon form embeds raw hex literals (`#ddd`, `#666`).**
*Location:* `v3_1_6_IMPLEMENT.md` Phase 2.1b lines ~542–543. WS4 has a token sweep — this block needs to be included in that sweep so it ends up on `--c-border` / `--c-text-2`.

**13. `new File([bytes], …)` is a Node 20+ runtime global.**
*Location:* `v3_1_6_IMPLEMENT.md` line ~1021 (self-flagged in the doc). NEEDS-VERIFICATION on the Vercel preview runtime. `api/upload.ts` already does file-shaped work in the existing pipeline so this is probably fine; flag for the preview smoke step.

---

## Fix-one-thing

**Byte-anchor the WS4 `attachEventListeners` deltas as a single consolidated CURRENT/NEW block** (finding #1). It's the same self-containment standard WS1–3 already hold, it consolidates three orthogonal load-bearing additions plus one load-bearing removal in one place, and it eliminates the doc's own documented "init throws → everything after silently fails to bind" failure mode that would otherwise hide WS1/2/3 capability breaks behind a clean-looking build.

## Verdict

**NEEDS ANOTHER PASS** — close findings #1 (WS4 init-wiring byte-anchor), #2 (concrete `.upload-zones` CSS), and #3 (expand `uploadImages` roles to all 7 in both schema and instruction); finding #4 is a small targeted edit in `handleAttachedRefs` that closes a silent-data-loss path made more likely by #3. Everything below #4 is minor.
