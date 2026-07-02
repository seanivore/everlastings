# v3.5.4 — Gap Review, Angle A (cold / out-of-repo) — ROUND 4 (scoped to the round-3 fixes)

**Reviewer stance.** Cold / self-containment. Only the three v3.5.4 docs + the ledger were in scope (no repo — the absence is the point). Round-4 is **deliberately narrowed** to the six round-3 folds; I did NOT re-open the whole build or re-raise any ledger entry (1–36b). The question for each item was the same: *is it now self-complete — could a fresh builder LOCATE and APPLY it with zero DISCOVER/DECIDE?*

---

## Part 1 — Findings, ranked by likelihood to derail the build

Every round-3 fix I was asked to confirm reads as self-complete. Ranked below from "closest to a real snag" down to "clean" — but note: **none is a blocker; the top item is a properly-flagged NEEDS-VERIFY, not a hidden decision.**

### 1. §2.4 — Schedule-on-field-completeness gate (the SURFACE control side) — SOFT FLAG, floor-protected
- **What I checked.** The server-side PUT half (both branches, `api/products.ts:467-475` + `:553-559`) is byte-anchored CURRENT/NEW and fully executable — `scheduled_publish_at` validation is a literal ISO-or-null check, no helper assumed. The *control-gating* half (only offer "Schedule publish…" on a publish-READY piece) is prose, not a byte block.
- **Is it executable?** Yes, via an explicit three-tier fallback: (1) reuse the surface's `readiness()`/`refreshGate()` **iff** it keys off field-completeness only; (2) else replicate the same required-field predicate client-side (the authoritative field set is enumerated verbatim in DESIGN §C.1 + IMPLEMENT Locked-decisions §"Editor field rules", so a cold builder CAN reproduce it — zero guessing); (3) worst case, always offer Schedule and lean on the §2.6 cron backstop. There is a `<!-- NEEDS-VERIFY -->` on tier-1's reachability.
- **The one residual worth naming (flag-don't-assert).** Tier-3 ("always offer") crosses with the §2.6 cron backstop notice (A2-4, line 752), which is *itself* a NEEDS-VERIFY (whether `logActivity` is importable into `product-feed.ts`). If a builder fell all the way to tier-3 AND the backstop notice were deferred, a field-incomplete scheduled draft could 400-skip at cron silently ("hides without explaining"). **This is not a doc gap** — the doc's PRIMARY directive is the gate (tier-1/2), which *prevents* scheduling an incomplete draft, and the delivered surface demonstrably has a `readiness()` mechanism (DESIGN §C.1 says `data-ring` is set by `readiness()`/`refreshGate()`), so tier-1/2 is very likely reachable. The decision is **surfaced with all branches defined**, which is exactly what the lens permits. I flag only that this is the softest of the six fixes (prose + three tiers + a verify), not a defect.

### 2. main.js coordination (§4.3.b + §4.7.0 share one `DOMContentLoaded`) — CLEAN
- Both phases show the **identical** 2-line CURRENT anchor (`DOMContentLoaded … initConfig();`) and each NEW appends only its own line (§4.3.b → `getActiveSale().then(mountSaleChrome)`; §4.7.0 → the `?code=` stash). Applied sequentially as block-replaces they compose correctly (each matches the original 2-line prefix and inserts after `initConfig()`; the first-applied line survives on the line below). The orchestration bullet (line 47) + ledger 36b explicitly say "apply BOTH appends; compose in any order." `mountSaleChrome` (§4.3.c) and `getActiveSale` (§4.3.a) are both defined within WS4. **Self-complete — zero guessing.**

### 3. §6.5b — `previewToken` re-derivation — CLEAN
- The NEW block re-derives locally: `const previewToken = new URLSearchParams(location.search).get('preview');` with an inline comment stating exactly *why* (top-level function → the init handler's `previewToken` at `product.js:19` is out of scope). No reliance on any out-of-scope state. `sold`, `priceHTML`, `window._activeSale` are all defined within the doc (§4.3.a). The §4.5.d sibling block (same `populateStickyCard`) re-derives its own block-local `sold` and *intentionally* does not preview-guard — that asymmetry is documented in the phase note and ledger 34b. **Self-contained.**

### 4. §9.2a — `.badge-unique` written to `styles.css` — CLEAN (self-proving tokens)
- Byte-anchored CURRENT (`.badge-featured {…}` + the `/* Overlay placement */` comment + the `.card__media .badge {` opener) → NEW inserts `.badge-unique` between them. Solid tokens only (`--bg-primary`, `--accent-primary`), no `color-mix()`. Notably the tokens are **self-proving**: the CURRENT `.badge-featured` block right above uses `var(--bg-primary)` + `var(--accent-primary)`, so a cold reviewer can confirm they exist without the repo. Placement inheritance (`.card__media .badge`) + the `!sold && !p.featured` render gate (§6.5a/§6.3d) close the overlap question. **Unambiguous.**

### 5. DESIGN §D.4 — badge default + optional stack-CSS upgrade — CLEAN
- The "one confirm" is cleanly stated: **default ships** `!sold && !p.featured` (no overlap, zero extra CSS); the single Sean-facing question ("want 'One of a kind' on featured tiles too?") has both branches concretely defined — if yes, add the exact stack rule `.card__media .badge ~ .badge { top: calc(var(--space-sm) + 1.9rem); }` AND switch the gate to `!sold`-only (with an explicit warning *not* to just drop `!p.featured`, which would overlap). Surfaced, not silently decided. **Correct per "surface, don't decide."**

### 6. TESTING legacy-backfill preflight · §4.6 `code`-source note · §9.1 "no code edit" — CLEAN
- **TESTING preflight (line 16):** run the `20260616000001` cutover backfill before any % sale, then the verify query is given verbatim (`SELECT id FROM products WHERE available = false AND coalesce(quantity,0) > 0` → expect zero rows). The backfill "ships commented" (a repo locate — B's lane), but the *action* + *verification* are literal. Self-complete.
- **§4.6 `code`-source note (line 1589):** names exactly what `code` resolves to — "the coupon's own `code` field … the same string a shopper would type into `#promo-code`. Already correct; no endpoint." No ambiguity about which value seeds the share link.
- **§9.1 (line 3404):** explicitly "verify, no code edit"; points to where the full-tile tap target is already delivered (§6.5a/§6.3d single `<a>` wrap), states "no separate shop.js/homepage.js edit," Doc impact none. Nothing to execute, nothing to guess.

---

## Part 2 — The single most important "if you fix one thing" insight

**Nothing needs fixing in doc text.** The one thing worth doing at build time is to **resolve §2.4's tier-1 NEEDS-VERIFY first** (is the surface `readiness()`/`refreshGate()` reachable to gate the Schedule *affordance*, not just the Publish button?) — because that single answer collapses the three-tier fallback to one path and removes the only scenario (tier-3 + a deferred cron backstop) where a field-incomplete scheduled draft could silently 400 forever. It is a one-line reachability check, and the primary gate already makes the bad state near-unreachable; confirm it and §2.4 is unconditionally clean.

---

## Part 3 — Verdict

**READY TO BUILD** — all six round-3 fixes are self-complete and cold-executable; the only residual (§2.4 client-gate reachability) is a properly-surfaced, floor-protected NEEDS-VERIFY, not a hidden decision.
