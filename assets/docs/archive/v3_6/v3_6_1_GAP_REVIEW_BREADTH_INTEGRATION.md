# v3.6.1 — Breadth pass (INTEGRATION lens, post-round-1-A fold)

**Role.** Cross-lane integration backstop after the A-Type round-1 fold; NOT the formal C gate. Effort: high. Lens: does the delta still FIT the system after the fold?

**Scope read.** IMPLEMENT + both addenda end-to-end (focused on the eight A-round-1 fold sites), the REVIEW_PROMPTS ledger 1-46, plus repo spot-checks: `api/product-feed.ts`, `api/webhook.ts`, `api/checkout.ts`, `api/_lib/{env,stripe}.ts`, `api/_emails/index.ts`, `assets/js/checkout.js`, `cart.html`, `supabase/migrations/20260616000001_v3_1_inventory_decrement.sql`.

Angle-A ledger entries 39-46 hold; the eight A-round-1 folds compose cleanly with the rest of the delta. Nothing load-bearing.

---

## Ranked digest

Only advisory nits — none block. Ranked by weight.

### N1 (advisory — moderate) — PostgREST `.or()` fallback is a MANUAL build-time step, not a MECHANISM gate

**Where:** `v3_6_1_IMPLEMENT.md` Phase 2.6, the paragraph immediately after `publishDueScheduled` (the "PostgREST `.or()` syntax — pre-test at build" block).

**What's up.** The fold documents the failure mode ("Never silently narrow the query without the warn") and stipulates the exact `console.warn` copy, but the fallback is **doc-gated**: the builder has to (a) run the exact REST-tester query against the preview DB, (b) if it errors/drops the draft branch, hand-edit `publishDueScheduled` to drop the `,draft.not.is.null` OR-arm and add the `console.warn`. If the REST test is skipped (the "remember to run it" failure Sean explicitly rejected for the commented `DROP TABLE cart_holds` — mechanism-gated, not doc-gated), a version-sensitive `.or()` could silently narrow the query in production, exactly the "hides without explaining" outcome ledger 41 says was closed.

**Concrete fix (cheap; still under-budget).** Make the fallback runtime-gated inside `publishDueScheduled`: attempt the `.or()` form first; on PostgREST error (or empty error + zero rows with a distinct known-draft-due sentinel row shape) fall back to `.eq('is_published', false)` alone and emit the specified `console.warn` once per cold start. This turns the doc-only pre-test into a mechanism (mirrors the "commented DROP" convention Sean applied to `cart_holds` — the fallback ships wired, so the human step can't be skipped). If runtime-gating is deemed over-engineered, at minimum re-flag the pre-test in the TESTING addendum preflight list next to the cron-gate `curl` check (it's a Section-17 sibling: one visible assertion the operator either sees or doesn't).

**Verdict on N1.** Not-broken — the current authored path is likely to work on the shipped Basil/PostgREST stack; flagged as *needs-hardening* against the doc-gated-vs-mechanism-gated rule Sean has already codified elsewhere.

### N2 (advisory — low) — `wirePromo` remove+apply sequence is prose-only, no byte-anchored NEW block

**Where:** Phase 4.0 fallback bullet #4 ("If answer (4) = STACK-AND-ERROR, `wirePromo`'s Apply handler MUST attempt a `removePromotionCode()` first…") + Phase 4.4 (which edits `checkout.js` around `wirePromo` but does NOT modify `wirePromo` itself).

**What's up.** Ledger 40 says "wirePromo Apply-handler branch is encoded off answer (4); no downstream NEEDS-VERIFY." Reading the phases, that's true for the REPLACE branch (no edit needed) and the STACK-AND-BOTH branch (surface + stop). For the STACK-AND-ERROR branch it's prose only: the builder has to author the wirePromo Apply-handler modification (removePromotionCode → applyPromotionCode) without a byte-anchored CURRENT/NEW block. Given the round-1 A already validated this as a fold, calling this an open gap would re-litigate ledger 40 — flagging only so the executor knows the wirePromo edit is discover-and-write if the probe returns STACK-AND-ERROR.

**Concrete fix (optional).** In Phase 4.0's post-probe branch enumeration, add a compact `wirePromo` before/after skeleton for the STACK-AND-ERROR path (one 4-line block) — matches the "concrete-default" bar the rest of the doc holds itself to. Non-blocking.

### N3 (advisory — low) — Composition note between `wirePromo` (user-click) and `autoApplyStoreWideSale` (init)

**Where:** Phase 4.4.b + Phase 4.4.c around `checkout.js:106`.

**What's up.** Reviewed for cross-flow conflict: `autoApplyStoreWideSale` runs at init and (assuming answer 1 = success) applies the store-wide code before any user interaction. A later user Apply through `wirePromo` fires only on click and must replace the auto-applied code — under answer (4) = REPLACE this is a single-call swap (no code change); under STACK-AND-ERROR it's the N2 remove-then-apply sequence. **Not** a conflict; the two paths never race (init vs click), the sequence is well-defined per branch, and the §4.7 `?code=` share-link path is explicitly mutually exclusive with the auto-sale (Stripe one-discount-per-order — one apply-order race removed). Flagging only to record that the integration was checked.

### N4 (advisory — low) — Feed's own `.eq('is_test', false)` (line 22) vs `publishDueScheduled`'s `.eq('is_test', isTest)`

**Where:** `api/product-feed.ts:22` (the pristine feed query) after WS2 2.6 lands.

**What's up.** After the merge, `product-feed.ts` will hold two Supabase queries with **different** `is_test` scopes: the feed CSV itself hardcodes `is_test=false` (prod-only feed content, intentional — the feed is a public product feed for Google/Meta), while `publishDueScheduled` uses `.eq('is_test', isTest)` (env-aware). That's correct (the feed body is prod-only, the cron-gated jobs are env-aware), but the divergence in the merged file could confuse a fresh reader. Consider a one-line comment above `.eq('is_test', false)` — "feed body is always prod (public consumers); cron-gated jobs below use isTest." Non-blocking; the ADDENDUM_TESTING preflight cron-gate check catches any real leak.

### N5 (advisory — very low) — Per-request cost of WS5 §5.4c.i re-role fan-out

**What's up.** A re-role Apply that promotes N gallery images to hero triggers N sequential `POST /api/upload` JSON by-link calls (one per role-renaming diff, each re-crops in Sharp and rewrites R2). At the single-admin scale of Everlastings this is trivially bounded (< 20 per Apply worst case) and per the ledger the diff algorithm's "unchanged items pass through their URL as-is" precludes the naive-rewrite path. No concern flagged; recording that the cost surface was checked.

### N6 (advisory — very low) — `logActivity` import into `product-feed.ts` composes cleanly with WS7's imports

**Verified.** `api/_lib/activityLog.ts` (WS8 8.1b) uses its OWN service-role client and imports only `env` + `isTest` from `./env` — no dependency on `feedAdmin` and no shared module with `./_lib/stripe` or `./_emails/index`. WS7 §7.3a's added imports (`stripe`, `sendEmail`) sit next to the WS2 imports without cycling through activityLog. Ledger 43 stands.

### N7 (verified — not a gap) — Cart hooks + `console.warn` visibility

- `cart.html:170` (`[data-cart-subtotal]`) + `:178` (`[data-cart-estimate]`) — both present. Phase 4.5.i two-hook shape holds; ledger 42 stands.
- `console.warn` fired from a Vercel serverless function is captured in the function's runtime logs (verified pattern with the existing `console.error` sites in `product-feed.ts:27` / `webhook.ts` / `activityLog.ts`). N1's warn will surface *if* the fallback path actually fires — which is the N1 concern.

### N8 (verified — not a gap) — Sold-policy consistency across the four enforcers

Cross-checked and clean:
- **`computeState()` (portal, WS2)** — precedence `archived > draft > staged-edits > sold(qty0) > live`, no `!available→sold` branch (per Phase 2.2 comment + ledger 20).
- **Storefront display gate (WS6 §6.5a/§6.5b/§6.5d)** — `sold = p.quantity != null ? p.quantity <= 0 : !p.available` (known-qty wins; null falls back to flag). Applied identically on shop cards, PDP sticky, related-products card.
- **Webhook `record_sale` (WS7-adjacent, existing SQL)** — `available = greatest(coalesce(p.quantity,0) - n, 0) > 0`, i.e. available follows post-decrement quantity. Consistent with the display gate: quantity is authoritative; available is a consequence.
- **Server checkout/reserve gate (4th enforcer, `checkout.ts:79/:205`)** — deliberately stricter AND-logic `available===true && quantity>=1`, fails safe. Ledger 33b stands.

Legacy caveat (pre-v3.3 `available:false` + stale non-null `quantity ≥ 1`) is properly captured in TESTING preflight (the `20260616000001` commented-DROP-style backfill must run before a `%` sale).

### N9 (verified — not a gap) — Function budget + cron budget

`ls api/*.ts` = 11 (cart, checkout, config, contact, orders, product-feed, products, stripe-sync, subscribe, upload, webhook). No new file added by the delta. One cron entry; both jobs (WS2 scheduled-publish flip + WS7 reconciliation) inside the ONE `isCronRequest(req)` gate at top of `GET`, `publishDueScheduled` `.eq('is_test', isTest)` scoped. Ledger 1-2 stands.

---

## If you fix one thing

**Harden the PostgREST `.or()` fallback into a mechanism (N1).** Ship the runtime-gated fallback (try the `.or()` form → catch narrows to the unpublished-only form + emits the specified `console.warn` once per cold start), so a skipped REST-tester step can't silently ship a narrowed query. This is the one place the round-1-A fold is doc-gated where Sean has an explicit mechanism-gated precedent (`cart_holds` DROP, `20260616000001` cutover) — bringing this fold in line with that precedent closes the loop.

---

## Verdict

**READY.** The delta still FITS the system after the round-1-A fold. Budgets held (11/12 + 1 cron); `is_test` isolation on the merged `product-feed.ts` is correct (both jobs gated + `publishDueScheduled` env-scoped); the four sold-policy enforcers agree; imports compose without a cycle; no stale `file:line` anchors introduced by the fold. N1 is the only substantive advisory (mechanism-gated hardening); N2-N4 are noted but non-blocking; N5-N9 are verify-recording.
