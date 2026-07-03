# v3.7.1 — Gap Review, Angle B (fidelity / repo byte-check)

**Reviewer:** fresh isolated Sonnet 5 peer, MAX effort, full repo access.
**Scope:** `v3_7_1_IMPLEMENT.md` (3737 lines) + `v3_7_1_ADDENDUM_DESIGN.md` (161 lines) + `v3_7_1_ADDENDUM_TESTING.md` (122 lines), read end-to-end, byte-checked against the working tree (pre-build state — none of the CURRENT→NEW deltas have landed yet) and against `assets/docs/archive/v3_5/design-handoff/out/`.

**Method.** Every CURRENT block across WS1–WS10 was opened at its named file/line and diffed by eye against the actual tree (via `sed -n`/`grep -n`, cross-checked against `cat -n` line numbers) — roughly 70 distinct anchors across `api/products.ts`, `api/orders.ts`, `api/webhook.ts`, `api/checkout.ts`, `api/product-feed.ts`, `api/upload.ts`, `api/_lib/*`, `assets/js/{main,checkout,shop,product,homepage,cart,complete}.js`, `assets/css/styles.css`, `{index,shop,complete}.html`, `vercel.json`, `admin/index.html`, `assets/js/admin.js`, the `design-handoff/out/*` source files, the `v3_3_0` GPT base files, and `supabase/migrations/`. All three of the charge's named NEEDS-VERIFY items (#219 Stripe probe, the PostgREST `.or()` fallback, the CRON_SECRET/PRODUCT_API_KEY/SUPABASE_SECRET_KEY deploy-env trio) were run down explicitly (see part 1, items 2–3 folded into the summary below).

**Headline result: content-level fidelity is exceptionally high.** Of ~70 checked anchors, the quoted CURRENT text was byte-**identical** to the tree in every single case — including the two highest-risk shared-file coordination points (`shop.js:126-144`'s WS6→WS4→WS9 merged card block, and `homepage.js:41-67`'s merged `populateFeatured`), the newest fold (§2.7a's freeze-on-ever-published block at `api/products.ts:385-390`), the full GPT schema/instruction anchor set (including the exact 7787-byte base-file count), and every WS8 `logActivity` insertion point. I found **zero cases** where the quoted CURRENT text itself was wrong. The three findings below are real but are either (a) a documentation-fidelity problem in the *ledger*, not the build plan, or (b) minor anchor-adjacency/line-label imprecision that the doc's own repeated disclaimer ("line numbers are hints; the quoted text is the anchor") already covers.

---

## 1. Ranked gap list

### #1 — `.mitem--errored` CSS does not exist anywhere in the tree; ledger 61/70(a) assert it does (LOAD-BEARING-leaning, but self-healing — see below)

**Location:** `v3_7_1_REVIEW_PROMPTS.md` ledger entries **61** and **70(a)**, plus the "High-frequency FALSE-ALARM classes" bullet `"'.mitem--errored is referenced but has no CSS.' — .mitem--errored IS AUTHORED..."`. Cross-referenced against `v3_7_1_IMPLEMENT.md` WS5 **§5.4c.i** (~line 2019) and the actual source `assets/docs/archive/v3_5/design-handoff/out/products.html` (403 lines total, embedded `<style>` block spans lines 9–304).

**What's wrong.** Ledger 61 states, in the present/perfect tense, as a settled fact not to be re-raised:
> "`.mitem--errored` is **AUTHORED** — the partial-failure red-ring modifier **is written** into products.html's embedded `<style>` beside `.mitem`'s base (`out/products.html:248`): `border-color:var(--danger); box-shadow:0 0 0 2px var(--danger-bd);`. Do NOT re-raise '.mitem--errored is referenced but has no CSS.'"

Ledger 70(a) independently reinforces this a round later: *"portal `--danger-bd` IS defined (portal.css:46 + :82 mobile fallback) → **the `.mitem--errored` ring renders**."*

I opened the actual file. Line 248 of `out/products.html` is just the base `.mitem{...}` rule:
```css
.mitem{display:flex; gap:11px; padding:11px; border:1px solid var(--hairline); border-radius:var(--r-md); background:var(--surface);}
```
`grep -n "mitem--errored" products.html products-app.js` returns **zero matches**. A repo-wide grep for `mitem--errored` returns hits **only inside the gap-review/IMPLEMENT doc files themselves** — never in any actual CSS, HTML, or JS. Both `--danger` (portal.css:33) and `--danger-bd` (portal.css:46, mobile fallback :82) genuinely exist as tokens (that half of ledger 70a is accurate), but the **rule that would consume them, `.mitem--errored`, is not present**.

Tracing the origin: `v3_6_1_GAP_REVIEW_BREADTH_JOURNEY.md` (round-1 breadth) originally **proposed** `.mitem--errored` as a suggested implementation detail inside a fix recommendation ("...keep the modal open with the failed items visibly flagged (add `.mitem--errored` on the row)..."). That proposal correctly became an **imperative build instruction** in `IMPLEMENT.md` WS5 §5.4c.i ("**author this modifier** in `products.html`'s embedded `<style>`..." — this part is fine, clear, and actionable). But somewhere in the fold-in, the ledger's language drifted from "the plan specifies this correctly" into "this already exists in the shipped design" — a claim the tree does not support.

**Concrete fix.** Reword ledger 61 (and its echo at 70a, and the false-alarm-class bullet) from a past-tense "already shipped" claim to a forward-looking "plan is complete + buildable" claim, e.g.: *"`.mitem--errored` is SPECIFIED, not yet shipped — WS5 §5.4c.i instructs authoring it in `products.html`'s embedded `<style>` beside `.mitem`'s base; both `--danger`/`--danger-bd` tokens exist so the instruction is buildable as written. The CLASS ITSELF is a WS5 BUILD OUTPUT — confirm it lands during WS5, don't assume it's already present."* This also argues for adding one line to the WS5 TESTING checklist (item 21, or a new sub-item) asserting the red ring actually renders on a simulated partial-failure, since nothing currently exercises this path end-to-end.

**Load-bearing vs polish.** I'm calling this **moderate, not hard load-bearing**, for a specific reason: WS5 §5.4c.i's own instruction text (the thing a builder actually executes) is complete and correctly imperative — it doesn't merely reference the ledger's false "already done" framing, it independently tells the builder what to write. So the risk isn't "the build literally can't produce this CSS" — it's that the *ledger*, which this same gate explicitly tells every reviewer is "a VERIFIED truth... do NOT re-raise," is wrong on this one point, and has now been reinforced across three separate rounds (v3.6.1 breadth → ledger 61 → ledger 70a) without anyone re-opening the file. That's exactly the failure mode Angle B exists to catch. I'd rank it #1 because it's the most concrete, evidence-backed finding, and because an execution-phase agent skimming the ledger for "what's already done" (rather than reading WS5's phase text carefully) could plausibly skip verifying the CSS actually landed — silently shipping the exact "hides without explaining" failure the project's thesis forbids (a failed re-role retries silently with no visual cue).

---

### #2 — WS4 §4.1.c / WS8 §8.1c.g (`handleCoupon`'s two-line CURRENT anchor breaks apart after the first edit lands, undocumented) (POLISH)

**Location:** `v3_7_1_IMPLEMENT.md` Phase 4.1.c (~line 1231) and Phase 8.1c(g) (~line 3165), both anchored at `api/products.ts:745–746`.

**What's wrong.** Both phases quote the **identical** two-line CURRENT block:
```ts
    const promo = await stripe.promotionCodes.create(promoParams);
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id, expires_display: typeof body.expires_at === 'number' ? formatExpiry(body.expires_at) : null });
```
I confirmed this is byte-exact against the current tree at `api/products.ts:745-746`. Per the Shared-file edit coordination section (ledger 25), WS4 applies first: its NEW block for 4.1.c inserts a ~13-line supersede-sweep `if (autoApply) { ... }` block **between** those two lines. After that lands, `const promo = ...` and `return jsonResponse(...)` are **no longer adjacent** — the literal two-line CURRENT text WS8's Phase 8.1c(g) quotes will not be found as a contiguous block anywhere in the post-WS4 tree.

This is a different (and less-covered) case than the analogous `handleCouponList`-tail append-stack (WS4 §4.2.b / WS8 §8.1d.b, ledger 74), where the coordination note explicitly says the second edit "re-anchors on the still-present `}\n}\n\n// ?_action=coupon_deactivate` text — **now the tail of `handleActiveSale`**" — i.e., that case is *explicitly* flagged as needing re-anchoring. The `handleCoupon` case gets no equivalent warning; ledger 25's note only says "WS4's edits land first, then WS8's log," without flagging that the two-line anchor itself splits.

**Concrete fix.** Add one clause to ledger 25's `handleCoupon` bullet (or to Phase 8.1c(g) directly): *"After WS4 §4.1.c lands, `return jsonResponse(...)` is no longer adjacent to `const promo = ...` — it now follows the supersede-sweep block. Re-anchor the `logActivity` insertion on the (still-unique) `return jsonResponse(request, { success: true, code: promo.code, ...})` line alone."*

**Load-bearing vs polish.** Polish. The `return jsonResponse(...)` line's text is unique in the file (no other line matches it), so a builder searching by text (not literal adjacency) still lands in the right place, and the resulting code is correct either way. Flagging only because my charge specifically asked me to pressure-test the shared-file coordination claims, and this is a real, findable gap in that coordination's completeness.

---

### #3 — Minor recurring line-number-label off-by-ones (content always correct) (POLISH)

**Location(s), all confirmed content-perfect / line-label-imprecise:**
- Phase 2.8 `publicView`, labeled `api/products.ts:49-56` — the quoted 9-line block (including the closing `}`) actually spans **49-57** (tree confirmed: line 57 is the missing `}`).
- Phase 7.2g, labeled `api/webhook.ts:244-256` — the quoted 14-line block actually starts at **243**, not 244 (tree line 243 = the leading `}` the quote opens with).
- Phase 8.1d.b, labeled `api/products.ts:836-838` — the quoted 4-line block actually starts at **835**.
- Phase 4.6's integration-seam citation "`renderStoreWide()` reads `D.storeWideSale` (sales-app.js:**11**,28)" — the actual `let storeWide = { ...D.storeWideSale };` line is at **10**, not 11 (the `renderStoreWide()` function itself is correctly at 28).

**What's wrong.** In every case I checked, the labeled line-number range is off by exactly one line relative to the fully-quoted text, but the **quoted text itself is always byte-perfect** and exists verbatim in the tree. This reads as a systematic off-by-one in how ranges were counted when the anchors were authored (sometimes under-counting the start, sometimes the end), not a content-drift problem.

**Concrete fix.** None urgent — the doc's own preamble states this exact caveat repeatedly ("line numbers are hints; the quoted CURRENT text is the anchor — if it doesn't match the working tree byte-for-byte, STOP and reconcile"), and in every instance the quoted text does match. Worth a mechanical sweep at the next full-document CONSOLIDATE pass (re-running `grep -n` for each CURRENT block's first line and correcting the label) purely for hygiene, not urgency.

**Load-bearing vs polish.** Pure polish — zero functional risk, self-disclaimed by the doc's own methodology.

---

## 2. If you fix one thing

**Correct ledger 61 (and its echo at 70a + the false-alarm-class bullet) so it stops asserting `.mitem--errored` is already shipped.** It's the one place in this entire document where the "settled — do not re-raise" ledger's language doesn't match reality, and it's been silently reinforced across three rounds now (v3.6.1 → v3.6.6 fold → v3.6.6 breadth) without anyone re-opening the actual file. The underlying WS5 build instruction is fine and will very likely produce correct code regardless — but the point of the ledger is that reviewers and (eventually) an execution agent are told to trust it without re-verifying, and on this one entry that trust isn't earned. Everything else in this review — all ~70 other byte-anchors, across every workstream, including the two most complex shared-file merge points and the entire GPT schema/instruction byte-budget — checked out exactly as written.

---

## 3. Verdict

**READY TO BUILD.**

All three findings are polish-tier (a ledger-accuracy correction, a documentation-completeness note on one shared-edit anchor, and a cosmetic line-label pattern) — none of them block or derail execution, and none required a code change to the IMPLEMENT/addenda content itself beyond the ledger correction in finding #1. The byte-anchoring discipline across this triplet is exceptionally high; I did not find a single instance of quoted CURRENT text actually diverging from the tree's real content.
