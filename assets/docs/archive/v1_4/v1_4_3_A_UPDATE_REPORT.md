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

| Old file                  | New routing                                                 |
| ------------------------- | ----------------------------------------------------------- |
| `api/checkout.ts` (POST)  | `api/checkout.ts` POST handler, `_action=null \| 'session'` |
| `api/checkout/reserve.ts` | `api/checkout.ts` POST handler, `_action='reserve'`         |
| `api/session-status.ts`   | `api/checkout.ts` GET handler, `_action='session-status'`   |

Vercel rewrites:
- `/api/checkout/reserve` → `/api/checkout?_action=reserve`
- `/api/session-status` → `/api/checkout?_action=session-status`

### Consolidation 2: `api/orders.ts` absorbs `[id]` PATCH

| Old file                   | New routing                                  |
| -------------------------- | -------------------------------------------- |
| `api/orders.ts` (GET)      | `api/orders.ts` GET (unchanged)              |
| `api/orders/[id].ts` PATCH | `api/orders.ts` PATCH, `id` from query param |

Vercel rewrite:
- `/api/orders/:id` → `/api/orders?id=:id`

### Consolidation 3: New `api/cart.ts` absorbs activity + recovery

| Old file               | New routing                              |
| ---------------------- | ---------------------------------------- |
| `api/cart-activity.ts` | `api/cart.ts` POST, `_action='activity'` |
| `api/cart-recovery.ts` | `api/cart.ts` POST, `_action='recovery'` |

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

## Verification status

**Deploy build green.** Commit `2085c42` builds and deploys successfully — the function-count cap is no longer tripped. `npx vercel ls` shows `● Ready`.

**Local fix verified.** All 5 consolidated routes return correct shapes via `vercel dev`:

| Route                                  | Local result                                     |
| -------------------------------------- | ------------------------------------------------ |
| `POST /api/checkout/reserve`           | 400 `{"error":"Missing items or session_id"}`    |
| `GET  /api/session-status?session_id=` | 400 `{"error":"Missing session_id"}`             |
| `POST /api/cart-activity`              | 200 `{"ok":true}`                                |
| `POST /api/cart-recovery`              | 400 `{"error":"Valid email required"}`           |
| `PATCH /api/orders/:id`                | 401 `{"error":"Unauthorized"}` (auth middleware) |

Each rewrite reaches the correct consolidated handler with the right behavior.

**Preview-deploy runtime — second separate bug, FIXED in commit `ff27ecc`.** Calling endpoints against the green preview returned `FUNCTION_INVOCATION_FAILED` on every endpoint (including `/api/config`, untouched by the consolidation). Initial diagnosis pointed to Track A SESS_DEV_REPORT Open Thread #1 (Vercel env trailing-newline cleanup) — that diagnosis was **wrong**.

**Actual cause:** `tsconfig.json` set `"module": "ES2020"` while `package.json` had no `"type": "module"`. Vercel's deployed Node runtime tried to load the compiled `.js` files as CommonJS and failed with `Cannot use import statement outside a module`. Adding `"type": "module"` introduced a second error (`ERR_MODULE_NOT_FOUND` because Node ESM requires `.js` extensions on imports). The cleanest fix was the opposite direction: change tsconfig to `"module": "CommonJS"` and revert the `package.json` change. Two-line fix; no source-file edits needed.

**Why this was masked until now:** `vercel dev` (local) bundles TypeScript differently than the deployed runtime — local worked, deployed didn't. Track A's integration tests were run via `vercel dev` and never exercised the deployed preview URL. **This is exactly the localhost-vs-preview-URL testing pitfall** documented in user feedback memory.

**Implication for Track A Open Thread #1:** the trailing-newline cleanup may still be a worthwhile defensive cleanup, but it is **not** the cause of the runtime failures we attributed to it. The defensive `env(key)` helper that trims whitespace was working correctly all along. Open Thread #1 can be re-scoped to "optional defensive hygiene" rather than "blocker."

After commit `ff27ecc`, all sanity-checked endpoints return correct shapes against the preview:
- `GET /api/config` → 200 with full JSON payload
- `GET /api/products?slug=does-not-exist` → 404 `{"error":"Product not found"}`
- `POST /api/cart-activity` → 200 `{"ok":true}`
- `GET /api/session-status` (no session_id) → 400 `{"error":"Missing session_id"}`

---

## Integration test re-run owed

Re-run the full Track A integration test suite against the `dev` preview URL — the runtime is now healthy:

  - `tests/integration/06_checkout.sh` — POST `/api/checkout/reserve` → POST `/api/checkout`
  - `tests/integration/07_race_condition.sh` — POST `/api/checkout/reserve` (expect 409)
  - `tests/integration/08_hold_expiry.sh` — POST `/api/checkout` (expect 410)
  - `tests/integration/10_full_purchase_flow.sh` — full reserve → session flow
  - `tests/integration/12_shipping_mark.sh` — PATCH `/api/orders/:id`
  - `tests/integration/16_admin_orders_needs_shipping.sh` — GET `/api/orders?status=needs_shipping`

Plus spot checks (no integration test currently exercises these):

  - `GET /api/session-status?session_id=cs_test_xxx` — returns expected shape (404/200).
  - `POST /api/cart-activity` with `{"slug":"the-sunkeeper"}` — returns `{"ok":true}`.
  - `POST /api/cart-recovery` with `{"email":"x@y.z","lost_items":[{"slug":"x"}]}` — returns `{"code":...}`.

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
