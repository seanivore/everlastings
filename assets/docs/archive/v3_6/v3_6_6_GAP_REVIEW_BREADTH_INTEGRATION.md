# v3.6.6 — Breadth review: INTEGRATION lens (post round-1-cold-A fold)

**Verdict: READY.** All six round-1 cold-A folds fit the live `dev` tree cleanly (code is the tiebreaker, verified file:line); the standing invariants hold; no fold added a function/cron, broke `is_test`, or introduced a sold-policy inconsistency. The only surfaced items are documentation-precision polish (P1) and by-design build-order notes (P2/P3), none blocking.

**Scope.** Fresh end-to-end read of the CONSOLIDATED v3.6.6 triplet with each round-1 fold checked directly against the current `dev` repo. Advisory breadth pass, not the formal gate.

## Numbered verifications — code is the tiebreaker (all CONFIRMED)
1. **§4.1.d coupon-list `auto_apply` add → CONFIRMED.** `handleCouponList`'s return (`api/products.ts` ~817-828) already carries `percent_off` + `store_wide: !scopedProducts || scopedProducts.length === 0` — exactly the doc's expression. Adding `auto_apply` is a one-field add, not a structural change.
2. **§2.6 `X-Actor:cron` + resolveActor → CONFIRMED coherent.** `resolveActor` is net-new in the already-planned `api/_lib/activityLog.ts` (not `api/products.ts` — the doc's "~:2976" is a doc line). It returns `'cron'` only when the token equals `PRODUCT_API_KEY` AND `x-actor === 'cron'` — exactly the self-call's shape (`Bearer ${PRODUCT_API_KEY}` + `'X-Actor':'cron'`). `Headers.get` is case-insensitive (`X-Actor` set / `x-actor` get) — safe.
3. **CRON_SECRET / isCronRequest net-new → CONFIRMED.** `grep -rn "CRON_SECRET\|isCronRequest" api/` = zero hits today; both genuinely absent, matching the doc. The Production-scope go-live handoff (§7.3 + TESTING) is the correct consequence.
4. **Sold null-fallback harmonized to `!p.available` → CONFIRMED.** Both changed NEW blocks read `: !p.available` (§4.5.d PDP-sticky IMPLEMENT:1572; §6.5b PDP buy-gate). The lone `if (p.available === false)` is the CURRENT (pre-build) `product.js:382` shown for context; the NEW block replaces it. Matches the server fail-safe (`checkout.ts:79`/`:205` require `available===true && quantity>=1` to buy) — display direction agrees.
5. **#4 false-alarm dismissal (styles.css tokens) → CONFIRMED.** `--text-inverse` (:44), `--shadow-lg` (:82), `--radius-lg` (:87), `--transition-base` (:91), `--z-modal` (:96), `--z-cookie` (:98), `--header-height` (:101) all defined; `.site-header` is `position:sticky` (:216).
6. **api/config.ts return shape → CONFIRMED (nuance).** The four anchored fields are present with exact casing (`config.ts:6-11`). The real return also includes a 5th field `metaPixelId` — a non-issue: `PORTAL.boot()` reads only the four; the anchor's claim (the four the boot reads) is accurate. Only the earlier "exactly" paraphrase was loose — corrected in ledger 57/70(b).

## Invariants re-check (all HOLD)
- **11/12 functions, no new `api/*.ts`** — `ls api/*.ts` = 11; the new `activityLog.ts` lives in `api/_lib/` (a `_`-prefixed shared lib, not a Vercel route, not matched by the `api/*.ts` glob). One free Hobby slot preserved.
- **1 cron, no new cron** — `vercel.json` crons block has one `path` (`/api/product-feed`, `0 9 * * *`); both new jobs fold into that handler.
- **is_test isolation** — single `feedAdmin` client; both cron jobs inside one `isCronRequest` gate; `publishDueScheduled` scopes `.eq('is_test', isTest)`; `logActivity` writes `is_test: isTest`; a bare/public feed GET runs neither job.
- **Sold-policy 4-enforcer consistency** — `computeState` / storefront display gate (`!p.available` fallback) / `record_sale` / `checkout.ts:79,:205` (strict AND-gate) all agree; the harmonization tightens display without touching the server gate.
- **CommonJS output** — `tsconfig.json` `"module":"CommonJS"` (target ES2020 is language level, not module format).
- **GPT `.txt` ≤ 8000 (proj. 7988)** — see P2.

## Findings
**Load-bearing: none.** All six folds fit the substrate cleanly.

- **P1 — polish (folded).** `api/config.ts` carries a 5th field (`metaPixelId`); the boot reads only the four anchored fields, so the anchor claim is scoped-accurate. The "returns exactly {4}" paraphrase was corrected (ledger 57/70(b)).
- **P2 — by-design note (folded).** The GPT instruction `.txt` static-gate target `v3_5_0_GPT_INSTRUCTIONS_TRIMMED.txt` is FILE-NOT-FOUND today; it is a WS10 build output (Phase 10.2/10.5 writes it from the `v3_3_0` base = 7787 bytes). A pre-WS10 `wc -c` error is expected; the 7988/8000 projection is post-WS10. This round added zero `.txt` bytes. Noted in the TESTING static gate (ledger 70(c)).
- **P3 — pre-existing dependency (not fold-introduced).** The legacy sold-row backfill (commented migration `20260616000001`) must run before enabling any % sale — already carried in the TESTING preflight + §6.5 legacy caveat. Ledger 70(e).

## If you fix one thing
Nothing load-bearing remains — the six round-1 folds are coherent with the live tree, invariants hold, and the only items are doc-precision (P1) + by-design build-order notes (P2/P3), all recorded.
