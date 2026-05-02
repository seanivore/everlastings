# v1.4.3 Track A — Bug Report: Vercel Hobby Function Cap Tripped

**Date filed**: 2026-05-02
**Filed by**: Track B orchestrator (during pre-flight before B0.2 placeholder seeding)
**Severity**: Blocker (preview deploys failing since 2026-05-02 09:00 ET)
**Status**: Patched on `dev` 2026-05-02 — commit `2085c42` (`fix(api): consolidate 15 functions into 11 to clear Vercel Hobby cap`)

---

## Summary

Vercel Hobby tier limits each deployment to **12 serverless functions**. Track A shipped 14 endpoint files (15 deployable when counted post-merge of late additions). Deploys past commit `6bc0bf6` failed with:

> "No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan. Create a team (Pro plan) to deploy more."

This was not surfaced during Track A's verification because:
- Track A's local development used `vercel dev`, which does not enforce the deployment-time function-count cap.
- Integration tests (`tests/integration/*.sh`) hit endpoints by URL via `vercel dev`, so they passed without a cloud deploy.
- The first commits to `dev` after Track A's wave landed under the cap; the subsequent wave (commits between `6bc0bf6` and `384ddd9`) added the file that pushed the count from 12 → 13, at which point all builds since have errored at "Deploying outputs."

The deploys themselves built successfully (TypeScript compiled, no source errors). The cap is a Vercel platform constraint applied **after** build, **before** routes are wired.

---

## Failed deploy reference

- First failure: commit `384ddd9` at ~2026-05-02 09:00 ET.
- Last successful deploy: commit `6bc0bf6`.
- Sample failed `dpl_id`: `dpl_ABtJvch8wzJPRiBeLXDDPRKKzQeD` (Sat May 02 17:56:34 ET).
- Inspect any failed deploy's GitHub UI — the error chip links to a Vercel CLI inspect command and the function-count message.

---

## Root cause

`api/` had 15 files outside the underscore-prefixed helper directories:

```
api/cart-activity.ts
api/cart-recovery.ts
api/checkout.ts
api/checkout/reserve.ts
api/config.ts
api/contact.ts
api/orders.ts
api/orders/[id].ts
api/product-feed.ts
api/products.ts
api/session-status.ts
api/stripe-sync.ts
api/subscribe.ts
api/upload.ts
api/webhook.ts
```

Vercel deploys each `*.ts` file under `api/` (excluding `_*`-prefixed paths) as a separate function. Hobby tier hard cap: 12.

---

## Fix applied (commit `2085c42`)

Three internal consolidations dropping 15 → 11 deployable functions. **Public URLs are preserved** via `vercel.json` rewrites — frontend, integration tests, the Custom GPT, and the curl protocol in `assets/docs/PRODUCT_PROTOCOL.md` all keep working unchanged.

### Consolidation 1: `api/checkout.ts` absorbs `reserve` + `session-status`

| Old file                      | New routing                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `api/checkout.ts` (POST)      | `api/checkout.ts` POST handler, `_action=null \| 'session'` |
| `api/checkout/reserve.ts`     | `api/checkout.ts` POST handler, `_action='reserve'`        |
| `api/session-status.ts`       | `api/checkout.ts` GET handler, `_action='session-status'`  |

Vercel rewrites:
- `/api/checkout/reserve` → `/api/checkout?_action=reserve`
- `/api/session-status` → `/api/checkout?_action=session-status`

### Consolidation 2: `api/orders.ts` absorbs `[id]` PATCH

| Old file                  | New routing                                  |
| ------------------------- | -------------------------------------------- |
| `api/orders.ts` (GET)     | `api/orders.ts` GET (unchanged)              |
| `api/orders/[id].ts` PATCH | `api/orders.ts` PATCH, `id` from query param |

Vercel rewrite:
- `/api/orders/:id` → `/api/orders?id=:id`

### Consolidation 3: New `api/cart.ts` absorbs activity + recovery

| Old file                  | New routing                              |
| ------------------------- | ---------------------------------------- |
| `api/cart-activity.ts`    | `api/cart.ts` POST, `_action='activity'` |
| `api/cart-recovery.ts`    | `api/cart.ts` POST, `_action='recovery'` |

Vercel rewrites:
- `/api/cart-activity` → `/api/cart?_action=activity`
- `/api/cart-recovery` → `/api/cart?_action=recovery`

### Final function inventory (11)

```
api/cart.ts
api/checkout.ts
api/config.ts
api/contact.ts
api/orders.ts
api/product-feed.ts
api/products.ts
api/stripe-sync.ts
api/subscribe.ts
api/upload.ts
api/webhook.ts
```

Underscore-prefixed helpers (`api/_lib/*`, `api/_emails/index.ts`, `api/_bootstrap/coupons.ts`) are not deployed as functions per Vercel convention — they're imported as modules by the deployable files.

Buffer: 1 below the cap leaves room for at most 1 more endpoint without re-architecting. Future endpoints should consolidate into existing namespaces (e.g., a new admin GET endpoint goes into `api/orders.ts` or a new admin namespace file, not as a stand-alone file) unless the project upgrades to Vercel Pro.

---

## Verification owed (post-deploy)

1. Confirm the preview deploy on `dev` after commit `2085c42` shows green ("Ready" not "Error") in `npx vercel ls`. (Done in Track B pre-flight before delegating to subagents.)
2. Re-run the full Track A integration test suite against the `dev` preview URL:
   - `tests/integration/06_checkout.sh` — POST `/api/checkout/reserve` → POST `/api/checkout`
   - `tests/integration/07_race_condition.sh` — POST `/api/checkout/reserve` (expect 409)
   - `tests/integration/08_hold_expiry.sh` — POST `/api/checkout` (expect 410)
   - `tests/integration/10_full_purchase_flow.sh` — full reserve → session flow
   - `tests/integration/12_shipping_mark.sh` — PATCH `/api/orders/:id`
   - `tests/integration/16_admin_orders_needs_shipping.sh` — GET `/api/orders?status=needs_shipping`
3. Spot-check the GET `/api/session-status?session_id=...` path (no integration test currently exercises it; complete.html will exercise it once Track C wires it).
4. Cart endpoints (`/api/cart-activity`, `/api/cart-recovery`) have no current callers in tests; verify by direct curl against the `dev` preview.

If any test fails, the issue is most likely:
- A missing case in the `_action` switch in `api/checkout.ts` or `api/cart.ts`.
- A rewrite path mismatch in `vercel.json`.
- A query-param-shape mismatch (e.g., `?id=` vs `?_id=`).

---

## Why this should not have happened

Track A's planning phase did not include a "Vercel deployment-time limit audit." This is a generally useful pre-launch check that should be added to:

- The IMPLEMENT.md "Verification Gate" template — explicit checkbox: "Function count under deployment-tier cap (Hobby: 12, Pro: 1000)."
- `EVERLASTINGS_STORE.md` Common Pitfalls section — note the Hobby cap and that `vercel dev` does not enforce it.
- `.agent/DEV_RULES.md` — Pre-flight checklist before merging to `main`: "Deploy succeeds on Vercel preview" (not just "build succeeds locally").

The Track B SESS_DEV_REPORT will record this as a postmortem item to be folded into Track A's report after the dust settles.

---

## Track C impact

**None on the wire.** Public URLs are unchanged via rewrites. Track C continues to consume the same endpoint URLs documented in `EVERLASTINGS_STORE.md` and the IMPLEMENT guides.

**One thing to know.** The internal file structure changed. If Track C plans to add new endpoints, they should follow the consolidation pattern (route by `_action` query into an existing file) unless Vercel Pro is on the table. See `Final function inventory` above for the current 11.

**One subtle gotcha for tests added in Track C.** If Track C's new tests use the `?_action=...` URLs directly (rather than the public URLs), they bind to internal routing that we may revisit. Tests should hit the public URLs (`/api/checkout/reserve`, `/api/session-status`, `/api/orders/:id`, `/api/cart-activity`, `/api/cart-recovery`) — the rewrites do the rest.

---

## Open thread for Track A's SESS_DEV_REPORT

This bug should be folded into `v1_4_3_A_SESS_DEV_REPORT.md` as an addendum, not a brand-new section. Suggested location: append to the existing "Open Threads For Next Session" with a `Resolved` marker pointing to commit `2085c42` and to this BUGS file.

`EVERLASTINGS_STORE.md` should be updated in two places:
1. **Architecture Reference** — add a new AR (probably #34) titled "Vercel Hobby tier function cap drives endpoint consolidation" describing the 12-function cap and the `_action` query-routing convention.
2. **Tech Stack at a Glance / What we are NOT using** — note that the project stays on Vercel Hobby and the consolidation pattern is intentional, not technical debt.
