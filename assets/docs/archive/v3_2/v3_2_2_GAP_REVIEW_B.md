# v3.2.2 — Gap Review B (fidelity) · round 3 (scoped delta re-run)

**Angle:** B — fidelity, narrowed. v3.2.1 already cleared the full build byte-for-byte; this round re-checks **only** the four v3.2.1→v3.2.2 folds that touched the fidelity lane. Repo on `dev`, working tree clean — confirmed unchanged since the last pass (the folds were docs-only). The ~20 anchors cleared at v3.2.1 were not re-audited (deliberate, per the round-3 charter). Read-only — findings only.

**Verdict: READY TO BUILD.** All four delta edits are byte-accurate, every NEW reference resolves to a real symbol/column/file, the commented migration is valid SQL with `record_sale` intact, and the `.media-row__head` class is defined + overridden with no leftover inline grid. No fidelity defect introduced by the v3.2.2 delta. Zero findings.

---

```
  Angle B (fidelity), round 3 — verdict: READY TO BUILD, zero findings

  I byte-checked exactly the four v3.2.1→v3.2.2 folds against the working tree (confirmed
  clean/unchanged on dev), and left the ~20 already-cleared anchors alone per the scoped charter.
  All four are correct:
  
  - Auth comment (admin.js:6-7) — CURRENT matches byte-for-byte, and the NEW line is a true fix, not
  a new lie: adminAuth.ts:40-44 really does accept PRODUCT_API_KEY (Path 1) as well as a JWT
  (Path 2). The ops it names — listOrders/markShipped — are real GPT operations over /api/orders,
  and GPT_SETUP.md:511 already says they ride the PRODUCT_API_KEY path.
  - Coupon min_amount readback — both CURRENT anchors match; pc.restrictions?.minimum_amount
  resolves because pc is the Stripe.PromotionCode from promotionCodes.list, and it's the exact
  mirror of what create writes; centsToDollars exists; renderCoupons folds the · min $NN.NN segment
  into the row.
  - WS6 cutover SQL — the SELECT and the set quantity = 0 UPDATE are fully commented; record_sale
  stays live and intact; the file collapses to one valid CREATE FUNCTION so db push applies only the
  function. Timestamp is monotonic.
  - .media-row__head — the head row is a bare class (no inline grid), the base rule lives in DESIGN
  P3c, the P5 1fr mobile override can now reach it, and .m-url carries min-width:0. The outer
  .media-row display:grid is just a single-column stack — not the three-column grid in scope, so not
  a leftover.
  
  One non-finding I noted (flag-don't-assert): the coupon-minimum readback is statically symmetric
  with the create write, but a live "list a coupon that has a minimum" response is TESTING's to
  confirm — not a fidelity blocker.
  
  Net for the round-3 loop: B re-verifies clean, consistent with its round-2 READY verdict. The
  delta-scoped re-run found nothing to fold.
```

---

## Per-edit detail (ranked — all CLEAN)

### Edit 1 — `admin.js:6-7` auth-model header comment (IMPLEMENT 1.5, doc lines 311-320) — CLEAN
- **CURRENT byte-match:** the quoted block equals `assets/js/admin.js:6-7` exactly:
  `// Supabase JWT (for this UI). \`/api/orders\` and \`/api/orders/<id>\` only` / `// accept a Supabase JWT via requireAdmin.`
- **NEW claim is TRUE (not a new lie):** `api/_lib/adminAuth.ts:40-44` — Path 1 authorizes when `apiKey && token === apiKey` where `apiKey = env('PRODUCT_API_KEY')` and returns the service-role client; Path 2 is the Supabase-JWT `getUser`. So `/api/orders` does accept `PRODUCT_API_KEY` via `requireAdmin`; the prior "only … a Supabase JWT" comment was the stale lie being corrected.
- **Parenthetical op names are real:** `listOrders` / `markShipped` are live GPT operationIds over `/api/orders` (GPT_SETUP.md:420, :442; instructions :21). GPT_SETUP.md:511 already states those Actions "need the `PRODUCT_API_KEY` Bearer path on `/api/orders`" — exactly the comment's assertion. `refundOrder` is the new WS1 POST. It's a code comment pasted verbatim from the NEW block, so the builder discovers/decides nothing.

### Edit 2 — coupon `min_amount` readback: `handleCouponList` push + `renderCoupons` segment (IMPLEMENT 2.2b + line 724) — CLEAN
- **CURRENT byte-match (2.2a):** `products.ts:751-752` = `// ?_action=coupon (GET) — list active discounts so the owner can see/manage them.` + `async function handleCouponList(request: Request): Promise<Response> {` — exact.
- **CURRENT byte-match (2.2b):** `products.ts:786` = `          expires_at: pc.expires_at ?? null,` (10-space indent) — exact; it's the `expires_at` line inside the `coupons.push({…})` object (real lines 779-789), matching the doc's stated `:779-789` list shape.
- **NEW reference resolves:** `pc.restrictions?.minimum_amount ?? null` — `pc` is the `Stripe.PromotionCode` yielded by `for await (const pc of stripe.promotionCodes.list({active:true, limit:100}))` (products.ts:768). Stripe's PromotionCode carries `restrictions.minimum_amount` (`number | null`); this is the symmetric **read** of what create **writes** to `restrictions.minimum_amount` (IMPLEMENT line 507). `formatExpiry` (the 2.2b sibling add) is defined just above at 2.2a. Compiles clean — the file already uses the same `pc.coupon?.…` optional-chaining defensiveness; function count unchanged (edit to existing `products.ts`).
- **Client side resolves:** `renderCoupons` (new this build) line 724 `const min = c.min_amount ? \` · min $${centsToDollars(c.min_amount)}\` : '';` — `centsToDollars` exists (`admin.js:52`, top-level, in scope); `c.min_amount` is now populated by 2.2b; `${min}` is concatenated into the rendered row at line 729 (`…${used}${min}${ends}</p>`). Null/0 minimum → falsy → segment omitted (correct guard, no NaN). Separator matches the sibling `· ends …` style.
- **No schema/instruction edit (settled, ledger #61):** the coupon ops declare an opaque-200, so the GPT reads `min_amount` off the raw body — same path as `expires_display`. Not a defect.
- *End-to-end note (not a finding, flag-don't-assert):* the read is the documented symmetric counterpart of the create write; a live "list a coupon that has a minimum" response is TESTING's confirmation, not a fidelity blocker.

### Edit 3 — Phase 6.1 migration: cutover UPDATE shipped COMMENTED (IMPLEMENT doc lines 1405-1444) — CLEAN
- **UPDATE fully commented:** the eyeball SELECT (1421-1423) and `update products p set quantity = 0 …` (1424-1426) are every-line `--`-commented.
- **`record_sale` live + intact:** `create or replace function record_sale(p_ids uuid[]) returns void language sql as $$ with counts as (select id, count(*)::int as n from unnest(p_ids) as id group by id) update products p set quantity = greatest(coalesce(p.quantity,0) - c.n, 0), available = greatest(coalesce(p.quantity,0) - c.n, 0) > 0 from counts c where p.id = c.id; $$;` — a valid CTE + UPDATE…FROM.
- **Migration is valid SQL:** it now reduces to exactly ONE live statement (the function) plus line comments → `supabase db push` applies only `record_sale` and never auto-zeros stock, matching the 1416 comment's intent (C-R2-1). Commenting the UPDATE left no half-statement fragment (SELECT and UPDATE were independent, wholly commented).
- **Applyable:** filename `20260616000001_…` > the latest existing migration `20260605000001_v1_5_draft_publish.sql`, so already monotonic. The webhook caller (Phase 6.2 `supabase.rpc('record_sale', { p_ids })`) is unchanged and resolves.

### Edit 4 — structured media editor head row → `.media-row__head` class (IMPLEMENT 3.7b + DESIGN P3c/P5) — CLEAN
- **Class, no inline grid:** addMediaRow builds `<div class="media-row__head">` (IMPLEMENT:1261) with **no** inline `style=` on the head element; it holds exactly 3 children — `.m-type` select / `.m-url` input / `.remove-row` button — matching the `110px 1fr auto` track.
- **Base rule present:** DESIGN P3c concrete-CSS block, line 432: `.media-row__head { display: grid; grid-template-columns: 110px 1fr auto; gap: 6px; align-items: center; }`.
- **Mobile override reachable:** DESIGN P5 ≤640px block, line 453: `.media-row__head{grid-template-columns:1fr}` — overridable now precisely because the desktop grid is a class, not inline (the AR#D3 `.img-url-row` fix's media-editor sibling, AR#D-R2-1).
- **`.m-url` min-width:0:** present inline once (IMPLEMENT:1263, `style="min-width:0;…border:1px solid var(--c-border-strong,#ccc);…"`) so its `1fr` track can shrink below the URL's intrinsic width; border uses the `var(--c-border-strong,#hex)` fallback matching every sibling input.
- **No leftover inline grid:** the outer `.media-row` wrapper's `display:grid` (IMPLEMENT:1259) is a **single-column** vertical stack (head / video-opts / alt, `gap:6px`, no `grid-template-columns`) — intentional and non-overflowing, not the three-column grid in scope. Grep for an inline-styled `media-row__head` returns only prose sentences, no styled element.

## Single most important fix
**None — the v3.2.2 delta introduces no fidelity defect.** If forced to name the highest-leverage verification: Edit 1's NEW comment, because it is the one NEW block asserting runtime **auth** behavior — confirmed accurate against `adminAuth.ts:40-44` + GPT_SETUP.md:511, so it's a correct lie-fix, not a new lie.

## One-line verdict
**READY TO BUILD.**
