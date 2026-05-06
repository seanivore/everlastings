# v1.4.x Implementation Updates — Consolidated Archive

**Created**: 2026-05-06
**Audience**: Humans, future agents, and historical reference only. **This document is NOT in any executing agent's required-reads list.** Track C executes against `v1_4_5_C_IMPLEMENT.md`, which already incorporates everything below as standing truth.

**Baseline**: `v1_4_3_IMPLEMENT_PRESPLIT.md` (the original monolithic spec, equivalent to the union of `v1_4_3_IMPLEMENT.md` + `v1_4_3_A_IMPLEMENT.md` + `v1_4_3_B_IMPLEMENT.md`).

**Purpose**: Single record of every change between the v1.4.3 baseline and v1.4.5 — endpoint consolidation, AI-pipeline fixes, schema clarifications, settled design decisions, placeholder cleanup manifest. Removes the need to read across the deprecated A/B SESSION_REPORTS, UPDATE_REPORT, PRE_FLIGHT_BUG, and v1.4.4 Track C draft to reconstruct the current state.

---

## 1. Endpoint consolidation (Vercel Hobby function-cap)

**What changed.** Track A as originally specified deployed 14 functions. The Vercel Hobby tier caps deployments at 12 functions and the cap surfaced as a deploy-time blocker (not caught by `vercel dev` or Track A's integration tests). Five files were folded into existing handlers; one new shared handler was added. Public URLs are unchanged via `vercel.json` rewrites.

**Final shape** — 11 deployable functions:

```text
api/cart.ts          — POST /api/cart-activity, /api/cart-recovery
api/checkout.ts      — POST /api/checkout, /api/checkout/reserve
                       GET  /api/session-status
api/config.ts        — GET  /api/config
api/contact.ts       — POST /api/contact
api/orders.ts        — GET  /api/orders, PATCH /api/orders/:id
api/product-feed.ts  — GET  /api/product-feed
api/products.ts      — GET/POST/PUT /api/products
api/stripe-sync.ts   — POST /api/stripe-sync
api/subscribe.ts     — POST /api/subscribe
api/upload.ts        — POST /api/upload
api/webhook.ts       — POST /api/webhook
```

**Files deleted**: `api/cart-activity.ts`, `api/cart-recovery.ts`, `api/checkout/reserve.ts`, `api/orders/[id].ts`, `api/session-status.ts`.

**Files added**: `api/cart.ts` (merges activity + recovery via `?_action=` dispatch).

**Files modified**: `api/checkout.ts` (absorbs `reserve` + `session-status`), `api/orders.ts` (absorbs `:id` PATCH via `?id=`), `vercel.json` (5 rewrites preserving public URLs).

**Pattern** (codified as **AR #34** in `EVERLASTINGS_STORE.md`): related public URLs route through a single deployed `.ts` file via `?_action=…` query param + `vercel.json` rewrites. New endpoints consolidate into existing namespaces rather than create standalone files. `vercel dev` does NOT enforce the cap — verify against a real preview deploy.

**Commits on `dev`**: `2085c42` (consolidation), `8b0c8e3` (incident report).

**Where to look this up going forward**: `EVERLASTINGS_STORE.md` → System Diagram, AR #34, "Things That Look Like Bugs But Aren't" #4 and #5.

---

## 2. AI product-creation pipeline finalized (v1.4.5)

The pipeline (`POST /api/upload` → `POST /api/products` → Stripe Product+Price) had four end-to-end gaps surfaced by Track B's placeholder-seeding subagent. All four resolved this session as standing behavior (not "fixes" — the v1.4.5 plan describes this as how the pipeline works).

### 2a. `POST /api/upload` uses signed Cloudinary uploads

The transform path previously sent `upload_preset=unsigned_temp`, which did not exist on the Cloudinary account. Returned `502 {"error":"Cloudinary upload failed"}` for any non-`skip_transform` image upload. Now signs `timestamp` against the account secret using the same SHA-1 pattern the file already used for the post-transform `destroy` call. No dashboard-side preset configuration required.

Codified as **AR #36** in `EVERLASTINGS_STORE.md`.

### 2b. `POST /api/products` strips `test_` prefix in role validation

`/api/upload` namespaces test-mode objects under `test/{slug}/test_{role}-{slug}.{ext}` (so they're R2-distinguishable from live). The product validator was previously rejecting these URLs because `filenameOf(img).startsWith('hero-')` failed against `test_hero-…`. The validator now strips a leading `test_` before role-matching, so URLs returned by `/api/upload` validate identically in test and live modes.

Codified as **AR #37** in `EVERLASTINGS_STORE.md`.

### 2c. `POST /api/products?sync=true` runs Stripe sync inline

The Supabase database webhook is configured to point at the production URL, so test-mode seeding against any preview deployment did not auto-receive the Stripe product/price IDs. Adding `?sync=true` to the create call runs the same shared sync helper inline before the response returns, so any agent-driven flow (Custom GPT, curl protocol, programmatic seeding) gets a deterministic round-trip with `stripe_product_id` and `stripe_price_id` in the response body. The DB webhook still fires; the helper is idempotent so the post-create webhook fire is a safe no-op.

Codified as **AR #35** and Decision **D2** (settled in v1.4.4 alignment session, see Design Review Ledger snapshot below).

### 2d. Stripe sync helper is idempotent on uninitialized rows

A retry path during placeholder seeding created a duplicate Stripe Product because the original webhook handler in `api/stripe-sync.ts` only checked the payload for an existing `stripe_product_id` and not the database row. The shared helper at `api/_lib/stripeSync.ts` now performs both checks: payload first, then a fresh DB read against the row's `id`. Either short-circuits to a no-op response.

Both `api/stripe-sync.ts` (DB webhook entrypoint) and `api/products.ts > POST` (inline `?sync=true`) share the same helper, so the two paths cannot diverge.

**Verification on dev preview** (this session): `POST /api/upload` of a 64×64 PNG → `200` WebP URL; `POST /api/products?sync=true` with `test_`-prefixed URLs → `200` with `stripe_sync.no_op: false, stripe_product_id: prod_UT4eVWVpnwZKal`; second call to `/api/stripe-sync` for the same record → `200` with `no_op: true`, same IDs.

---

## 3. Schema and protocol clarifications

### 3a. `materials` is an array of strings (not a comma-separated string)

The Postgres column is `text[]`. The "For Emy" form-field guide in `PRODUCT_PROTOCOL.md` previously implied a single string. Updated to clarify that the API surface expects an array (`["wood", "resin", …]`); the human-facing form lets Emy add one at a time and the Custom GPT does the conversion. `features`, `care_instructions`, `shipping_details` are arrays of strings on the same basis.

### 3b. Custom GPT setup formally documented

`PRODUCT_PROTOCOL.md` previously assumed the Custom GPT already existed ("Sean will have set this up for you once"). It now contains a one-time setup walkthrough — naming, system prompt, OpenAPI schema for the two Actions (`uploadImage`, `createProduct`), Bearer-key authentication wiring, end-to-end smoke-test, and key-rotation/maintenance notes. Reproducible from this doc alone.

### 3c. `vercel curl` exits with code 3 on success against protected previews

`npx vercel curl --deployment <url> -- ...` ends with `curl: (3) URL rejected: No host part in the URL` after the JSON body delivers correctly. Real `curl` exit-code-3, not a JSON error. Scripts using `set -e` against preview deployments must drop it (use `set -uo pipefail`) or `|| true` where the exit code is checked. Documented as a footnote in `PRODUCT_PROTOCOL.md`. Out of our scope to fix — Vercel CLI behavior.

### 3d. Unauthenticated `GET /api/products?slug=…` filters out `is_test=true` rows

Without `Authorization: Bearer`, the GET filters `is_test=false` and returns 404 for any test product. With the bearer, it filters `is_test=isTest` (matches the deployment's environment scope). This is correct behavior — production must not surface test products. Worth noting only because an agent might assume their POST silently failed when their unauthenticated GET 404s. No action needed; documented as standing behavior.

---

## 4. Track B placeholder seed manifest (cleanup directive for Track C C5)

Track B seeded six placeholder products into Supabase against the `dev` preview during B0.2 to validate the design system end-to-end. All tagged `is_test = true`. R2 objects under the `test/` namespace.

Track C deletes these as part of the v1.4.5 launch checklist (C5). Full per-product detail with all CDN URLs and Stripe IDs lives in `v1_4_3_B_PLACEHOLDER_SEED.md`; consolidated cleanup table below for fast execution:

| # | Slug | Supabase ID | Stripe Product ID |
| - | ---- | ----------- | ----------------- |
| 1 | `placeholder-haven-i` | `29ac18a0-b655-40d0-bf26-2c45b172a24c` | `prod_URosENLviu9cvl` |
| 2 | `placeholder-haven-ii` | `ea7d7f19-0244-4280-9b31-48df448e76c2` | `prod_URosFK96ajZXhv` |
| 3 | `placeholder-book-nook` | `3f5556ba-f994-4af6-b5dc-03fb50c1377c` | `prod_URossmI3zF8nRV` |
| 4 | `placeholder-storyloft` | `e64612cf-8121-4114-8e02-14814ce0bc78` | `prod_URosdv1l5IQIgk` |
| 5 | `placeholder-seasonal-piece` | `f6d6b62a-d14f-4914-bfbf-c9e120ba3730` | `prod_URosODYnsDGLnv` |
| 6 | `placeholder-printable-set` | `979d50a3-85ea-4fb8-aa15-75a7929816b2` | `prod_URosuo6PXiQ90q` |
| — | (orphan from initial validation) | — | `prod_URor3D0ITLFa2E` |
| — | (v1.4.5 prep verify) | `b32bb955-1960-4708-810e-27b8713029d9` | `prod_UT4eVWVpnwZKal` |

**Cleanup steps** (folded into the v1.4.5 C5 launch checklist):

1. **Supabase**: `DELETE FROM products WHERE is_test = true;` (or delete each by slug via the `/admin` UI — placeholders all begin with `placeholder-` plus the prep-verify row above).
2. **R2**: purge the entire `test/` prefix at `cdn.everlastingsbyemaline.com/test/` via Cloudflare R2 dashboard or Wrangler. Sweeps both the `test_`-prefixed originals and the duplicate workaround copies (the duplicate copies were a pre-AR-#37 workaround and no longer need to be created, but the existing R2 objects remain to be cleaned).
3. **Stripe** (test mode dashboard): archive the seven products listed above. Search "Placeholder" plus the prep-verify product. Associated Prices archive automatically.

---

## 5. Cookie consent — settled outcome

Track B's research wave (`v1_4_3_B_RESEARCH_COOKIE_CONSENT.md`, ~40k tokens) closed with the following decisions, locked into the v1.4.5 build:

- **Default state**: `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization` all `denied`. Fired via `gtag('consent', 'default', {…})` BEFORE `gtag.js` loads (and before the Meta Pixel base code runs).
- **Banner**: appears on first visit. Three buttons: **Accept**, **Decline**, **Customize** — symmetric weight (no dark pattern; CIPA-defensive).
- **Persistence**: choice in `localStorage` under a versioned key with shape `{ analytics, advertising, timestamp, version }`.
- **Update path**: a `consent-change` `CustomEvent` is dispatched whenever the banner / preferences modal updates state. A single global listener in `main.js` translates that into the appropriate `gtag('consent','update', …)` and `fbq('consent','grant'|'revoke')` calls.
- **Revoke**: persistent footer link reopens the banner. Privacy policy enumerates categories and how to revoke.
- **GA4 setup note**: turn ON Google Signals so the June 2026 Google change causes no drift; Consent Mode still governs `ad_storage`.

This is **AR #33** in `EVERLASTINGS_STORE.md` (already merged). No further research needed; copy of the banner ("longer vs. shorter") is the only iterating piece, addressed at Checkpoint A in the v1.4.5 design review cadence.

---

## 6. Design review — settled decisions ledger (frozen snapshot)

From `v1_4_4_C_DESIGN_REVIEWS.md` § 8 as of 2026-05-06. Items in **Settled** are inputs to the v1.4.5 plan and must not be reopened during execution.

| #   | Decision                                                                  | Status    | Locked in                                |
| --- | ------------------------------------------------------------------------- | --------- | ---------------------------------------- |
| 1   | Cookie consent strategy (default-deny, deferred state, symmetric buttons) | Settled   | Track B (research §6.1, §7.2)            |
| 2   | `email-cta-submit` source enum                                            | Settled   | Track B SESSION_REPORT                   |
| 3   | `data-*` attribute names                                                  | Settled   | Track B per-page placeholder inventory   |
| 4   | 11-endpoint consolidation                                                 | Settled   | Track A UPDATE_REPORT (commit `2085c42`) |
| 5   | Image roles 1+1+5                                                         | Settled   | Track A                                  |
| 6   | Cloudinary signed flow (D1)                                               | Settled   | v1.4.4 alignment session                 |
| 7   | Inline Stripe sync via `?sync=true` (D2)                                  | Settled   | v1.4.4 alignment session                 |
| 8   | Emaline feedback channel (shared Google Doc, one section per page)        | Settled   | v1.4.4 alignment session (D5)            |
| 9   | Cookie banner copy (longer vs. shorter)                                   | Iterating | TBD at Checkpoint A                      |
| 10  | Real testimonials                                                         | Iterating | TBD at Checkpoint A or B                 |
| 11  | "Meet Emy" copy + photo                                                   | Iterating | TBD at Checkpoint C or D                 |
| 12  | Footer "Privacy preferences" link text                                    | Iterating | TBD post-launch                          |

Iterating items (#9–12) are intentionally fluid. They get applied at the next checkpoint after feedback arrives, batched, never hot-patched mid-wiring (per § 5.4 of `v1_4_4_C_DESIGN_REVIEWS.md`).

---

## 7. Track A's pre-existing open threads (status as of v1.4.5)

These were Track A's "Open Threads For Next Session" from `v1_4_3_A_SESSION_REPORT.md`. Status updated with v1.4.5 disposition:

1. **Vercel env trailing-newline cleanup** — Track A added an `env()` helper at `api/_lib/env.ts` that trims defensively. New code uses `env()`. Pre-existing `process.env.X!` call sites in `api/products.ts` (top-of-file Stripe + Supabase clients) were intentionally left in place this session (out-of-scope for the four code changes); they continue to work because the trailing newlines have already been cleaned in Vercel.
2. **`env()` helper sweep** — same as above. Defensive, not load-bearing. Carried into the v2 backlog as a hygiene item.
3. **Stripe webhook registration** — registered to dev preview alias. Production endpoint registers at first prod deploy.
4. **Admin user seed** — three admins identical permissions per `project_rls_v1_decision`; user_roles upgrade is v1.1+.
5. **`localhost:3000/admin` round-trip** — superseded by the no-localhost-testing rule (`feedback_no_localhost_testing`). Round-trip is now: open the dev preview alias, log in, exercise the admin click-path. Folded into Track C's verification gate at C5.

---

## 8. Sources rolled into this archive

The following docs were the primary sources for the consolidations above. They remain in the archive as historical record but are no longer required reading for any executing agent:

- `v1_4_3_A_SESSION_REPORT.md` — Track A delivery report + open threads (folded into §7 above)
- `v1_4_3_A_UPDATE_REPORT.md` — Track A bug-fix wave for the Hobby cap (folded into §1)
- `v1_4_3_B_SESSION_REPORT.md` — Track B delivery report (referenced in §5 cookie consent + §4 placeholders)
- `v1_4_3_B_PLACEHOLDER_SEED.md` — six placeholder products with full detail (cleanup table folded into §4; full per-product detail still lives in that file as the canonical record)
- `v1_4_3_B_PRE_FLIGHT_BUG.md` — original gap report A–G (Gaps A/B/C/D resolved in §2; Gaps E/F/G in §3)
- `v1_4_3_B_RESEARCH_COOKIE_CONSENT.md` — research wave (settled outcome in §5)
- `v1_4_4_C_IMPLEMENT.md` — superseded Track C draft (fully replaced by `v1_4_5_C_IMPLEMENT.md`)
- `v1_4_3_C_IMPLEMENT.md` — earlier Track C draft (code-block source for the new plan; superseded otherwise)
- `v1_4_4_C_DESIGN_REVIEWS.md` — design review protocol + § 8 ledger (snapshot folded into §6 above; the full protocol document is still in active use for Track C execution cadence)

---

## 9. Versioning and what's current

- **Current version**: v1.4.5
- **Current build guide**: `assets/docs/archive/v1_4/v1_4_5_C_IMPLEMENT.md`
- **Current architecture truth**: `assets/docs/EVERLASTINGS_STORE.md` (header bumped to v1.4.5 this session)
- **Current product protocol**: `assets/docs/PRODUCT_PROTOCOL.md` (v1.4.5)
- **This document**: historical reference; not a build input

When a future contributor wonders "what changed since v1.4.3?" — this is the one document that answers without sending the reader on an archive scavenger hunt.
