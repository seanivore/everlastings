# v3.7.2 — Gap Review, Angle C (integration — repo + architecture) — SCOPED RE-RUN

**Reviewer**: fresh isolated Sonnet-5·MAX peer, repo access, effort MAXIMUM, review-only.
**Scope**: (1) confirm the C#1 fold (`cart_holds` → SUPERSEDED in STORE.md + go-live note) landed coherently; (2) a fresh integration pass on what v3.7.2's folds introduced — the 11/12-function + 1-cron budget, the four sold-policy enforcers, `CRON_SECRET`, the shared-file edit-coordination stacks (incl. the NEW `handleCoupon` re-anchor note, ledger 80), and the GPT `.txt` 8000-char cap (incl. the NEW named trim-target note, ledger 82).
**Method**: read `v3_7_2_REVIEW_PROMPTS.md`'s full Angle C block (ledger 1–84) end-to-end; read `EVERLASTINGS_STORE.md` end-to-end first; read the v3.7.2 triplet end-to-end; cross-checked every claim against the live tree (`api/checkout.ts`, `api/webhook.ts`, `api/products.ts`, `supabase/migrations/20260616000001_v3_1_inventory_decrement.sql`, `vercel.json`, `api/*.ts` file count). Ledger 1–84 not re-raised.

---

## Ranked gap list

### 1. WS8 §8.1c(g)'s `handleCoupon` logActivity insertion still quotes the STALE, pre-WS4 anchor — the ledger-80 re-anchor was described but never actually applied to the executable phase text (LOAD-BEARING)

**Location**: `v3_7_2_IMPLEMENT.md` Phase 8.1c(g) "create sale — `handleCoupon`" (lines ~3167–3182), vs. the Shared-file edit coordination note for `handleCoupon` (line 42, the B#2/ledger-80 fold).

**The gap**: The coordination note (line 42) correctly *describes* the fix: "WS4 §4.1.c and WS8 §8.1c's (g) create-sale log quote the SAME 2-line CURRENT anchor `products.ts:745-746`; §4.1.c inserts its supersede-prior block BETWEEN those two lines, so by the time §8.1c(g) applies, `:745-746` is no longer contiguous — WS8 re-anchors on the unique `return jsonResponse(...)` success return of `handleCoupon` and wraps THAT." But Phase 8.1c(g)'s actual CURRENT/NEW block (lines 3167–3182) was **never rewritten** to reflect this — it is byte-identical to what it must have read before this fold was identified:

```
CURRENT (`api/products.ts:745-746`):
    const promo = await stripe.promotionCodes.create(promoParams);
    return jsonResponse(request, { success: true, code: promo.code, ... });
```

This is the exact SAME two-line block WS4 §4.1.c (line 1233) quotes as ITS OWN "CURRENT" — and §4.1.c's NEW block (lines 1238–1257) inserts a ~12-line `if (autoApply) { ... }` supersede-sweep loop *between* those two lines. Applying phases in the doc's own prescribed order (ledger 25: "apply WS2 → WS4 → WS8") means by the time a builder reaches (g), the real file no longer contains this contiguous two-line text — the literal find-and-replace anchor is gone. A builder following (g) literally must stop and improvise where the `logActivity` call goes, exactly the "exclusively executable" failure this doc otherwise guards hard against.

**Contrast — proof the doc's own convention does this correctly elsewhere**: the sibling case in the SAME coordination note — `handleActiveSale`/`handleActivityLog` both appending after `handleCouponList` (ledger 74) — IS implemented correctly. WS8 §8.1d.b (lines 3255–3269) quotes `CURRENT (api/products.ts:836-838): }\n}\n\n// ?_action=coupon_deactivate...` — and I verified WS4 §4.2.b's own NEW block (lines 1293–1340) genuinely ends with that exact tail (the closing `}` of `handleActiveSale` followed by the still-present `// ?_action=coupon_deactivate` comment). So §8.1d.b's CURRENT anchor is the ACTUAL post-WS4 state of the file, not the pre-WS4 state. This proves the re-anchor discipline is achievable and is the doc's own standard elsewhere — (g) is the one place it wasn't carried through.

**Fix (concrete)**: Rewrite (g)'s CURRENT/NEW block to anchor on the true post-§4.1.c tail:
```
CURRENT (api/products.ts, after WS4 §4.1.c has applied — the tail of the supersede-sweep block):
    }
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id, expires_display: typeof body.expires_at === 'number' ? formatExpiry(body.expires_at) : null });
NEW:
    }
    await logActivity({ actor: await resolveActor(request), action: 'sale.create', summary: `Created sale "${String(promo.code)}" — ...`, entityId: promo.id });
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id, expires_display: typeof body.expires_at === 'number' ? formatExpiry(body.expires_at) : null });
```

**Load-bearing** — real build-time correctness risk in a revenue-adjacent function (`handleCoupon`), not a cosmetic issue. Directly within my scoped charge (ledger 80).

---

### 2. C#1's Doc-impact bucket list omits "Architecture Reference" #28/#29 — a second, near-verbatim STORE.md location documenting the same hold mechanism as live, which STORE.md's OWN precedence rule says would win over the marked-SUPERSEDED KAD entries (MODERATE)

**Location**: C#1's Doc-impact note, `v3_7_2_IMPLEMENT.md` §7.2i (line 2817); target text at `EVERLASTINGS_STORE.md` "Architecture Reference" #28 (lines 310–314) and #29 (lines 315–319).

**The gap**: C#1 explicitly enumerates 4 buckets to mark `cart_holds` SUPERSEDED: "KAD #18/#19 + schema + API map + 8→7 tables." I read STORE.md end-to-end and confirmed `cart_holds` is documented as fully live in **eight** distinct locations, not four:
1. System diagram "Tables (8):" list (line 140–148) — schema bucket ✓ covered
2. System diagram API list, `POST /api/checkout/reserve → availability + 15-min soft hold` (line 107) — API map bucket ✓ covered
3. KAD #18 "Availability check BEFORE any PII" (line 203) — explicitly named ✓ covered
4. KAD #19 "Soft cart holds, not hard reservations" (line 205) — explicitly named ✓ covered
5. **AR #28 "Availability check BEFORE any PII is entered" (line 310–314)** — NOT named anywhere in the fold
6. **AR #29 "Soft cart holds, not hard reservations" (line 315–319)** — NOT named anywhere in the fold
7. Key API Functions `api/checkout.ts` bullet (line 597–601) — API map bucket ✓ covered
8. The full `### cart_holds table` schema section + "is_test isolation (all six core tables)" prose (lines 1129–1142) — schema bucket ✓ covered

Items 5–6 (the "Architecture Reference" numbered list, AR #28/#29) are the gap. This isn't a minor duplicate: STORE.md's own stated rule (line 217) is **"Where any conflict exists between this list and Key Architectural Decisions above, this list [AR] takes precedence."** KAD #18 itself even cross-references "See IMPL_GUIDE AR #28, #29" (line 203) — so a reader who sees KAD #18 flagged SUPERSEDED and follows that pointer for detail lands on AR #28/#29, which (if left untouched) fully describe the 15-min hold as current, unflagged. If the eventual as-built pass applies literally the four named buckets, the shipped STORE.md would contain a genuine internal contradiction: KAD says superseded, AR — which the doc says wins conflicts — still says live.

**Fix**: Extend the Doc-impact bucket list (or the as-built pass) to explicitly also flip AR #28/#29 to SUPERSEDED — or, cleaner, retire the AR #28/#29 entries as duplicates and point them at the corrected KAD #18/#19 text, since AR #28/#29 restate KAD #18/#19 almost verbatim.

**Moderate/polish-leaning** — not a runtime/build risk (this is documentation-only), but a real completeness gap in exactly the fold I was asked to confirm landed coherently. Mitigated somewhat by the project's own as-built convention (a fresh agent reads STORE.md linearly, code-tiebreaker), which would likely catch this on a careful pass — but the Doc-impact note itself should name it so that safety net isn't the only thing standing between this and a shipped contradiction.

---

### 3. "Sold-policy consistency" is stated as "three enforcers/places" (not four) in the two most-visible summary locations — the disambiguating note ledger 33b describes exists only in WS6 §6.5's prose, and no TESTING item exercises the 4th enforcer's specific fail-safe edge cases (MODERATE)

**Location**: `v3_7_2_IMPLEMENT.md` Invariants section, line 73 ("Sold-policy consistency (cross-cutting — **the reviewers' highest-value check**)... honored identically in **three places**..."); `v3_7_2_ADDENDUM_TESTING.md` Cross-cutting invariants, line 107 ("Sold-policy consistency across **the three enforcers**..."). Contrast: the complete, correct 4-enforcer treatment lives ONLY in `v3_7_2_IMPLEMENT.md` WS6 §6.5 (line 2489).

**The gap**: Ledger 33b (settled) explicitly names the server checkout/reserve gate "the intentional strict FOURTH sold-policy enforcer... named so 'three enforcers' isn't read as exhaustive" — i.e., the authors already knew this exact phrase is a trap. My own task charge names this "the highest-value cross-lane check." I verified WS6 §6.5 (line 2489) DOES carry the correct, thorough disambiguation (the AND-logic strictness at `checkout.ts:79`/`:205`, the specific fail-safe edge cases: a `quantity>0 & available===false` row renders buyable+struck but 410s at checkout; a `quantity=null & available===true` row is treated unavailable server-side). But the TWO most prominent summary statements of this exact invariant — IMPLEMENT's own top-level Invariants line (explicitly labeled "the reviewers' highest-value check," i.e. where a reviewer looks first) and TESTING's "Cross-cutting invariants" section (the checklist a tester scans) — both still say "three enforcers/places" with zero qualifier and no pointer to WS6 §6.5.

I also confirmed no numbered TESTING item (1–31) asserts the 4th enforcer's specific divergent-display edge cases. TESTING item 26 ("Cart-hold removed; availability still gates") verifies the happy-path strict gate (a genuinely unavailable piece 410s/409s) but not the specific scenario that makes the 4th enforcer meaningfully stricter than the storefront's quantity-primary display gate (display says buyable, server still blocks). I confirmed the live code (`api/checkout.ts:79,205`: `available !== true || (quantity ?? 0) < 1`) matches the doc's description exactly — this is a documentation/test-coverage gap, not a code defect.

**Fix**: Add the same "(named so 'three' isn't exhaustive — see WS6 §6.5 / the server checkout/reserve gate)" qualifier to IMPLEMENT line 73 and TESTING line 107; add one numbered TESTING assertion for the display-vs-buy-gate divergence itself (manually set `quantity:2, available:false` on a seeded row → confirm it renders buyable+struck on the storefront but 410s at `/api/checkout` — the exact scenario WS6 §6.5 names).

**Moderate** — the underlying code is correct (verified), so this is about whether a future regression in this specific edge case would ever get caught, not a present bug.

---

### 4. The GPT `.txt` "named trim target" (ledger 82, C#2) points at a reserve that doesn't cleanly reconcile against the doc's own byte tally (POLISH)

**Location**: `v3_7_2_IMPLEMENT.md` Invariants section, line 80 (the new C#2 note); cross-reference WS10 §10.1c's residual note (line 3633) and §10.2b (lines 3648–3667, 3716–3719).

**The gap**: Both the C#2 note and the pre-existing §10.1c residual note call "§10.2b's freed clauses (~40+ bytes)" **"the SAME reserve"** — implying one identifiable, still-available byte pool two different fallback scenarios can draw from. But §10.2b's own phase text shows its trim (−29B dropping `:13`'s "no need to read fields back.") was already spent funding its own addition (+87B insert / −48B drop = net +39B at `:34`), netting **+10B overall** — a value already folded into the final "projected `wc -c` = 7988/8000 (12 headroom)" tally (line 3719). There is no separately-itemized, currently-unspent ~40-byte pool sitting in reserve; if EITHER fallback (§10.1c's TESTING-6b-failure case, or a hypothetical future WS10 overage) actually needs to draw on it, that requires a NEW cut beyond what §10.2b already ships — not yet specified anywhere.

**Fix**: Either name a concrete, still-untrimmed clause as the actual reserve, or reword both notes from "the SAME reserve (~40+ bytes)" to "apply the SAME trimming technique demonstrated in §10.2b (drop a non-essential trailing clause) to free further bytes."

**Polish** — non-blocking. The static gate (re-run `wc -c` on every ship, explicitly orchestrator-owned, never delegated — line 31) is the real hard backstop; an over-cap `.txt` cannot ship regardless of whether this specific fallback pointer is precise. Worst case is one extra trim-cycle iteration, which the doc's own "worst case is one trim cycle" framing already treats as acceptable.

---

### 5. "The EVERLASTINGS_STORE.md go-live checklist" is referenced by name (twice now) but no section titled that exists in STORE.md today (POLISH, inherited pattern — not new)

**Location**: `v3_7_2_IMPLEMENT.md` §7.2i's new C#1 go-live note (line 2817) and the pre-existing §7.3 `CRON_SECRET` handoff (line 2942, ledger 59); `v3_7_2_ADDENDUM_TESTING.md` preflight item (line 16).

**The gap**: I grepped `EVERLASTINGS_STORE.md` for "go-live"/"go live" — zero hits. No section is literally titled a "go-live checklist." The closest analogs are the doc header's inline "Launch/cutover to-dos remain (...)" parenthetical (STORE.md line 15) or the "Post-Launch Operations"/"First-month warm-up checklist" sections (lines 936–975) — none of which is a natural fit for "one-time cutover items this specific build introduces." The new cart_holds go-live note explicitly mirrors the CRON_SECRET pattern ("the same way CRON_SECRET was promoted to the go-live checklist, ledger 59") — but that pattern was itself already a bit aspirational (CRON_SECRET is likewise absent from STORE.md today, consistent with the as-built edit being deferred post-build, per the doc's own convention).

**Fix**: None required before build — this is squarely an as-built-time concern, and the as-built sync's own convention (fresh agent, full linear STORE.md read, code as tiebreaker) will naturally find or create the right home. Optionally, formalize a literal "Go-Live Checklist" heading the first time either item lands, so future doc-impact notes have a concrete target.

**Polish** — not a new defect from C#1; it's an inherited, already-settled (ledger 59) naming imprecision the new note simply reuses.

---

## Verified — no issue (due diligence notes, not gaps)

- **Function/cron budget holds**: `find api -maxdepth 1 -name "*.ts"` = 11 files; `vercel.json` crons = 1 entry. None of v3.7.2's folds (B#1 CSS reword, C#1 doc-impact, D#2 reduced-motion, B#2 re-anchor note, D#6 picker filter, C#2 trim-target note) touch function/cron topology.
- **`record_sale`'s quantity floor is real and race-safe**: `supabase/migrations/20260616000001_v3_1_inventory_decrement.sql:34` — `quantity = greatest(coalesce(p.quantity,0) - c.n, 0)` is a single atomic SQL `UPDATE`, not a read-then-write from application code. This is the load-bearing safety property the cart_holds go-live note's "accepted trade-off" reasoning depends on ("record_sale keeps quantity ≥ 0") — confirmed accurate against the actual migration.
- **WS7 §7.2's checkout.ts edits preserve the 4th sold-policy enforcer**: I read the live `api/checkout.ts` and confirmed the availability-gate loops the doc's CURRENT anchors quote (`:79` in `handleSession`, `:205` in `handleReserve`) are byte-accurate, and traced that §7.2a/§7.2c's edits remove ONLY the hold-check/hold-conflict logic, leaving the `available !== true || quantity < 1` gate fully intact in both functions post-edit.
- **The C#1 fold's core content (where it does land) reads coherent**: the "return to no-reservation" framing, the `?_action=reserve` endpoint's redefined role (availability + subscriber capture, no hold), and the migration's commented-DROP convention (matching `20260616000001`'s precedent) are all internally consistent and correctly cross-referenced.

---

## If you fix one thing

**Rewrite Phase 8.1c(g)'s CURRENT/NEW block in `v3_7_2_IMPLEMENT.md`** so it anchors on the actual post-§4.1.c state of `handleCoupon` (the tail of the supersede-sweep block), instead of the stale pre-fold two-line pair. This is the one finding with a direct, mechanical build-time consequence — everything else here is a documentation-completeness gap with a real (if imperfect) safety net downstream. It's also a fast, bounded, one-block fix, and it directly closes out ledger 80's stated intent, which the prose note describes but the executable phase text doesn't yet implement.

## Verdict

**NEEDS ANOTHER PASS (NARROW)** — one load-bearing, mechanical fix (finding #1) plus a genuine completeness gap in the specific fold I was asked to confirm (finding #2, C#1's AR #28/#29 omission). Both are bounded, quick, single-block edits — not an architectural problem. Findings #3–#5 are lower-severity and could ship as acknowledged residuals if Sean prefers, but #1 and #2 are squarely inside this scoped charge and worth one more narrow C pass to confirm the fold + the re-anchor block both actually land.
