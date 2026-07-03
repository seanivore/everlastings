# v3.6.4 breadth (integration) — consolidation-verification

## Verdict
READY

## Invariants + budget check
- **Function count (11/12).** Invariant asserted at IMPLEMENT :70 ("We are at 11/12 on Hobby — one slot free, reserved as headroom"). Repeated in the WS-level notes at :146 (WS1), :950 (WS2 tail), :1644 (WS4 header), :1755 (WS5), :2521 (WS6 gate), :2891 (WS7 net surface), :3178 (WS8 §8.1d "no new function"). No new `api/*.ts` added; every fold (WS2 §2.6, WS4 §4.2, WS7 §7.3, WS8 §8.1d) rides an existing file. OK.
- **Cron count (1).** :71 invariant intact. WS2 §2.6 (:693) and WS7 §7.3 (:2856-2887) both fold into the existing `/api/product-feed` GET behind ONE `isCronRequest(req)` gate — no new cron entry in `vercel.json`. OK.
- **`is_test` isolation.** :73 invariant intact. Verified scoping at: WS2 §2.6 `.eq('is_test', isTest)` on the scheduled-publish scan (:734, and preserved in the fallback branch at :784); WS3 §3.2 mark-shipped pre-check `.eq('is_test', isTest)` (:1027, cross-env note :1039); WS7 §7.3 reconciliation `.eq('is_test', isTest)` on the orders lookup (:2817). OK.
- **Brand separation.** :78 invariant intact ("portal cool indigo-slate … storefront warm-plum … the WS4 struck-price/top-bar/popup use the storefront's own tokens, not the portal's"). Re-stated at :146 (WS1) and Locked-decisions :114. OK.
- **CommonJS / tsc-clean, auth unchanged, integer cents, no hard delete, single-admin, reduced-motion, go-live untouched.** All present at :69–81. OK.

## Shared-file edit coordination section — all five bullets present?
Yes — all five bullets survive the consolidation intact at IMPLEMENT :34–51:
1. `api/products.ts` — order WS2 → WS4 → WS8 (:38–44), with the GET-dispatch "brackets the coupon branch" wording preserved (:39), the PUT/handleCoupon/handlePublish/validation-split call-order preserved (:40–43), and `publicView` + success-return wrapping preserved (:44).
2. `api/product-feed.ts` — WS2 (2.6) → WS7 (7.3) merge, ONE `feedAdmin` client, both jobs inside ONE `isCronRequest(req)` gate (:45).
3. `api/orders.ts` — WS3 + WS8 together; `const actor` + `_action` dispatch fork are single-definition (:46).
4. `shop.js` + `homepage.js` — WS6 → WS4 → WS9 merged NEW card-render block; §4.5.b/§4.5.f/§9.2 are POINTERS (:47).
5. `main.js` — WS4 §4.3.b + §4.7.0 both append to the SAME `DOMContentLoaded` handler at :269 (:49).
Trailing paragraph (:51) preserved: names the two storefront exceptions vs. everywhere else being single-owner. OK.

## Sold-policy 4-enforcer consistency
OK — all four enforcers present + consistent:
- **Portal `computeState()`** (WS2) — invariant call-out at :72, precedence line at :104 (`archived > draft > staged-edits > sold(qty0) > live`), confirmed no `!available→sold` branch at :468.
- **Storefront display gate** (WS6 §6.5, :2434) — `p.quantity != null ? p.quantity <= 0 : !p.available`.
- **Webhook `record_sale`** (WS7 decrement) — cited at :72 invariant and :488 (WS2 §2.2 rationale: `record_sale` sets `available = (qty>0)`, `20260616000001:35`).
- **Server checkout/reserve gate (`checkout.ts:79` / `:205`)** — explicitly named the intentional strict FOURTH enforcer at :556 and :2434 ("This server gate is the intentional strict 4th sold-policy enforcer behind the storefront display gate"). Ledger 33b in REVIEW_PROMPTS also carries the "fourth enforcer" language.
- **Legacy pre-v3.3 sold-row caveat + backfill** preserved at IMPLEMENT :2434 and TESTING preflight :19 ("Legacy sold-row backfill — run BEFORE enabling any % sale"). OK.

## Code fence integrity (parity check: count of ``` should be even)
- `v3_6_4_IMPLEMENT.md` — 474 (EVEN). OK.
- `v3_6_4_ADDENDUM_DESIGN.md` — 0 (EVEN, no fences). OK.
- `v3_6_4_ADDENDUM_TESTING.md` — 0 (EVEN, no fences). OK.

## Load-bearing fold blocks (PostgREST fallback / STACK-AND-ERROR / re-role diff / GPT budget)
- **PostgREST `.or()` runtime-gated fallback (WS2 §2.6, :762–792).** Byte-preserved. Try-block issues the `.or('is_published.eq.false,draft.not.is.null')` form with `select('id, title')`; catch branch re-issues without OR AND emits `console.warn('Scheduled-publish: PostgREST .or() negation unsupported on this stack…')` guarded by a `globalThis.__postgrestOrWarned` flag (once-per-cold-start). Concluding prose at :792 ("closes the 'hides without explaining' failure by construction") intact. OK.
- **STACK-AND-ERROR `wirePromo` skeleton (WS4 §4.0, :1114–1130).** Byte-preserved. `saleCode = window._activeSale?.code`; try block: `removePromotionCode()` first (guarded by `typeof … === 'function'`), then `applyPromotionCode(input.value)`; catch: best-effort re-apply of `saleCode` + friendly toast. Trailing REPLACE / STACK-AND-BOTH branch guidance at :1130 intact. OK.
- **WS5 §5.4c.i re-role diff algorithm (:1957–1966).** All three required bullets present:
  - openedRoles baseline stashed on open (:1959).
  - Sequential gallery-NN resolve with `p.images` splice after each POST (:1961: "Resolve added-gallery roles SEQUENTIALLY, splicing the response URL into `p.images` after EACH POST … a parallel resolve would hand out the same NN twice").
  - Partial-failure recovery (:1966: mark `mItem.errored`, render `.mitem--errored`, DO NOT clear `openedRoles`, re-Apply is idempotent).
  OK.
- **GPT `.txt` 8000-char cap + running budget math (WS10 §10.5, :3641–3648).** Invariant at :79 intact. Base 7787 + Phase 10.2 +263 + 10.2b +10 + 10.3 −28 + 10.4 −44 = net +201 → projected `wc -c` = **7988 / 8000** (12 headroom). Explicitly stated at :3646 and re-stated in TESTING preflight :21. OK.

## Ledger cross-refs from IMPLEMENT prose
All checked pointers resolve to real entries in the unchanged `v3_6_4_REVIEW_PROMPTS.md` ledger (entries 1–54):
- IMPLEMENT :7 "REVIEW_PROMPTS ledger 39-54" → ledger 39-54 present (round-1 A folds + breadth folds + owner-decisions folds).
- :1059 "ledger 14 — SETTLED" (`orders.shipping_address` top-level column) → ledger 14 matches.
- :2434 "ledger 20" (sold policy — Sean's final word) → ledger 20 matches.
- :1933, :2019 "ledger 23" (alt as hard server publish gate) → ledger 23 matches.
- :1653, :1662, :1737 "ledger 30" (`?code=` share link, homepage-root capture) → ledger 30 matches.
OK — no broken pointers.

## Findings (real, load-bearing, not already on ledger)
None. The consolidation is byte-clean against every anchor named in this pass: invariants preserved, the five shared-file coordination bullets intact, the four sold-policy enforcers named and consistent, code-fence parity even in all three docs, the four load-bearing fold blocks byte-preserved, `is_test` scoping intact on all three cited sites, and every ledger back-reference resolves.

## One-sentence recommendation
Ship v3.6.4 as the settled base for the next round — the v3.6.3 → v3.6.4 condensation preserved integration fit end-to-end, so the pre-execution loop can proceed without an integration-lane re-open.
