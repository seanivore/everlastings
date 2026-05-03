# v1.4.3 Track B — Pre-Flight Bug & Cross-Track Update Brief

**Date filed**: 2026-05-02
**Filed by**: Track B orchestrator (during pre-flight before B0.2 placeholder seeding)
**Bug status**: Patched on `dev` 2026-05-02 — commits `2085c42` (fix) and `8b0c8e3` (incident report).
**Update status**: Cross-track doc updates pending — this file enumerates them for an executing agent.
**Reference**: Full incident report → `v1_4_3_A_BUGS.md` (this file does not duplicate that content).

---

## Why this file exists

Track B's pre-flight uncovered a Vercel Hobby tier blocker that Track A unintentionally introduced (15 deployable functions vs. the 12-function Hobby cap). The code fix is shipped. The remaining work is **doc consistency** across multiple project documents so a future agent (Track C, or anyone reading the architecture) doesn't re-litigate this or build on stale information.

The full bug technical detail lives in `v1_4_3_A_BUGS.md`. **This file is the executable to-do list** for the cross-track update conversation Sean will run after Track B's design work begins. An agent receiving this file can act on it directly without needing prior context.

---

## What changed in code (summary; full detail in `v1_4_3_A_BUGS.md`)

### Commits on `dev`

- `2085c42` — `fix(api): consolidate 15 functions into 11 to clear Vercel Hobby cap`
- `8b0c8e3` — `docs(v1_4_3_A_BUGS): file Vercel Hobby function-cap blocker + fix`

### File deletions (5)

- `api/cart-activity.ts`
- `api/cart-recovery.ts`
- `api/checkout/reserve.ts`
- `api/orders/[id].ts`
- `api/session-status.ts`

### File additions (1)

- `api/cart.ts` — merges activity + recovery via `?_action=` query routing

### File modifications (3)

- `api/checkout.ts` — absorbs `reserve` (POST) + `session-status` (GET)
- `api/orders.ts` — absorbs `[id]` PATCH via `?id=` query
- `vercel.json` — adds 5 rewrites preserving public URLs

### Final endpoint list — 11 deployable functions

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

Underscore-prefixed helpers (not deployed as functions): `api/_lib/*`, `api/_emails/index.ts`, `api/_bootstrap/coupons.ts`.

**Public URLs are unchanged.** Frontend, integration tests, the Custom GPT, and the curl protocol in `assets/docs/PRODUCT_PROTOCOL.md` all continue to work without modification.

---

## Document updates required

The cross-track update agent should make each of these edits in order. After each edit, confirm via `git diff` before moving on.

### 1. `assets/docs/EVERLASTINGS_STORE.md`

Three edits.

#### Edit A — VERCEL SERVERLESS FUNCTIONS block (Architecture Overview > System Diagram, ~lines 93–113)

The function list inside the diagram is by URL, which is still accurate. Verify no file references in this block point to the deleted files (`cart-activity`, `cart-recovery`, `checkout/reserve`, `orders/[id]`, `session-status`). The URL-based descriptions stay.

#### Edit B — File Structure tree (~lines 458–489)

Remove these lines:

```text
  │   ├── cart-recovery.ts                # Sold-in-cart promo code + email
```

The tree currently lists `api/checkout.ts`, `api/session-status.ts`, etc. Update to:

```text
  ├── api/                              # Vercel serverless functions (11)
  │   ├── cart.ts                       # Cart activity ping + sold-in-cart recovery
  │   ├── checkout.ts                   # Stripe session create + reserve + status
  │   ├── config.ts                     # Public config (Stripe key per environment)
  │   ├── contact.ts                    # Contact form handler
  │   ├── orders.ts                     # Admin: list orders + record tracking
  │   ├── product-feed.ts               # CSV feed for Meta Commerce Catalog
  │   ├── products.ts                   # CRUD for AI product creation
  │   ├── stripe-sync.ts                # Create Stripe Product+Price on new product
  │   ├── subscribe.ts                  # Newsletter email capture
  │   ├── upload.ts                     # Cloudinary transform → R2 upload
  │   ├── webhook.ts                    # Handle Stripe webhooks
  │   ├── _bootstrap/                   # One-time helpers (coupons.ts) — not deployed as functions
  │   ├── _emails/                      # Resend email templates (index.ts) — not deployed as functions
  │   └── _lib/                         # Shared utilities (cors, env, adminAuth) — not deployed as functions
```

Also update the "Key API Functions" section that follows (~lines 516–549) to reflect the consolidated files. Replace the discrete `api/checkout.ts`, `api/session-status.ts`, etc. bullets with the new namespaced descriptions.

#### Edit C — Architecture Reference section (currently ends at AR #33, ~line 320)

Add **AR #34**:

```markdown
  34. **Vercel Hobby tier function-cap drives endpoint consolidation**
      - Hobby plan caps deployments at 12 serverless functions. Project stays on Hobby (~$0/mo for compute) by routing related actions through a single file via `?_action=...` query param + `vercel.json` rewrites.
      - Pattern: `api/checkout.ts` handles `session | reserve | session-status`; `api/orders.ts` handles `list | :id` (PATCH); `api/cart.ts` handles `activity | recovery`.
      - Public URLs unchanged via rewrites in `vercel.json`. Frontend, integration tests, AI product pipeline (curl protocol in PRODUCT_PROTOCOL.md), and the Custom GPT all hit unchanged URLs.
      - Adding new endpoints: consolidate into existing namespaces (e.g., new admin endpoint joins `api/orders.ts` or a new `api/admin.ts`) rather than creating standalone files. Buffer is 1 below cap (11/12).
      - `vercel dev` does NOT enforce the cap — must verify against a real preview deploy before merging.
      - History: introduced 2026-05-02 in commit `2085c42`. See `assets/docs/archive/v1_4/v1_4_3_A_BUGS.md` and `v1_4_3_B_PRE_FLIGHT_BUG.md`.
```

#### Edit D — "Common Pitfalls & Important Notes" > "Things That Look Like Bugs But Aren't" section

Append a new entry:

```markdown
  4. **`api/` is not 1:1 of public URLs**
    - `vercel.json` rewrites map several public URLs (`/api/checkout/reserve`, `/api/session-status`, `/api/orders/:id`, `/api/cart-activity`, `/api/cart-recovery`) to internal `?_action=...` query params on consolidated files. See AR #34. Frontend code should always hit the public URL, never `?_action=...` directly.
```

---

### 2. `assets/docs/archive/v1_4/v1_4_3_A_IMPLEMENT.md`

Add a single postmortem note near the top of the document (under the Verification Gate, or wherever the gate-level checklist lives — search for "Verification Gate" and place this immediately above or below it):

```markdown
> **Postmortem 2026-05-02**: this plan shipped 14 endpoint files; Vercel Hobby caps at 12 deployed functions and the cap surfaced as a deploy-time blocker (not caught by `vercel dev` or integration tests). Resolved in commit `2085c42` via internal consolidation + `vercel.json` rewrites. See `v1_4_3_A_BUGS.md` and `v1_4_3_B_PRE_FLIGHT_BUG.md`. Future Track A-style backend plans must include a "function count under deploy-tier cap" verification step.
```

---

### 3. `assets/docs/archive/v1_4/v1_4_3_A_SESS_DEV_REPORT.md`

Append to the existing "Open Threads For Next Session" section:

```markdown
### #N (Resolved 2026-05-02 by Track B pre-flight): Vercel Hobby function-cap blocker

Tripped Hobby's 12-function cap at commit `384ddd9`. Track B fixed during pre-flight before B0.2 placeholder seeding. See `v1_4_3_A_BUGS.md` for the full incident report and `v1_4_3_B_PRE_FLIGHT_BUG.md` for the cross-track doc-update brief.

**Track A integration test re-run is owed against the dev preview after the fix:**

- `tests/integration/06_checkout.sh`
- `tests/integration/07_race_condition.sh`
- `tests/integration/08_hold_expiry.sh`
- `tests/integration/10_full_purchase_flow.sh`
- `tests/integration/12_shipping_mark.sh`
- `tests/integration/16_admin_orders_needs_shipping.sh`

This is the only structural change to `api/`. Track C consumes unchanged public URLs.
```

Replace `#N` with whatever the next thread number is in the existing list.

---

### 4. `assets/docs/archive/v1_4/v1_4_3_C_IMPLEMENT.md`

Add a heads-up note in the Pre-flight or "Required Pre-Reads" section near the top:

```markdown
> **2026-05-02 update**: `api/` was consolidated from 14 → 11 files to clear Vercel Hobby's 12-function cap. Public URLs are unchanged — Track C continues consuming the same endpoints. See `v1_4_3_A_BUGS.md` and `v1_4_3_B_PRE_FLIGHT_BUG.md` for context. When adding new endpoints during Track C wiring, follow the consolidation pattern: route new actions through existing files via `?_action=...` query (and add a rewrite in `vercel.json`) rather than creating standalone files. Buffer is 11/12.
```

---

### 5. `assets/docs/PRODUCT_PROTOCOL.md`

**No edits required.** All curl examples already use public URLs (`/api/products`, `/api/upload`) which are unchanged.

---

### 6. `.agent/DEV_RULES.md`

Optional but recommended addition to the "Ready To Ship Updates Merged To Main" pre-flight checklist (currently 5 items):

```markdown
  6. Vercel preview deploy succeeds (not just local `vercel dev`). For projects on Hobby tier: function file count under 12 — verify with:
     ```bash
     find api -type f -name '*.ts' \! -path 'api/_*/*' | wc -l
     ```
```

This is project-agnostic and prevents the same bug class on future projects.

---

## Validation checklist for the cross-track update agent

After all edits land, run these checks. Each should be green before the agent declares the update wave complete.

### Codebase consistency

- [ ] **No orphan file references**: `grep -rn 'api/cart-activity\|api/cart-recovery\|api/checkout/reserve\|api/orders/\[id\]\|api/session-status' .` returns matches ONLY inside `v1_4_3_A_BUGS.md`, `v1_4_3_B_PRE_FLIGHT_BUG.md`, and historical SESS_DEV_REPORTs (the archive is intentionally preserved).
- [ ] **Public URLs intact**: `grep -rn '/api/checkout/reserve\|/api/session-status\|/api/cart-activity\|/api/cart-recovery\|/api/orders/' .` shows the URLs still referenced in `tests/integration/`, `assets/js/admin.js`, and the docs that should still mention them.
- [ ] **Function count matches reality**: `find api -type f -name '*.ts' \! -path 'api/_*/*' | wc -l` returns exactly `11`.
- [ ] **AR #34 is the only place that names the cap**: `grep -rn '12 Serverless Functions\|Hobby.*cap\|function.*cap' assets/docs/` returns coherent, non-conflicting mentions.

### Track A test re-run

Run each test against the `dev` preview URL (see `v1_4_3_A_BUGS.md` § "Verification owed (post-deploy)" for the BASE_URL setup):

- [ ] `tests/integration/06_checkout.sh` — passes.
- [ ] `tests/integration/07_race_condition.sh` — passes.
- [ ] `tests/integration/08_hold_expiry.sh` — passes.
- [ ] `tests/integration/10_full_purchase_flow.sh` — passes.
- [ ] `tests/integration/12_shipping_mark.sh` — passes.
- [ ] `tests/integration/16_admin_orders_needs_shipping.sh` — passes.

If any fail, the issue is most likely:

- A missing case in the `_action` switch in `api/checkout.ts` or `api/cart.ts`.
- A rewrite path mismatch in `vercel.json`.
- A query-param-shape mismatch (e.g., `?id=` vs `?_id=`).

### Spot checks (no integration test currently exercises these)

- [ ] Direct curl: `GET /api/session-status?session_id=cs_test_xxx` returns expected shape (404 if session unknown, 200 with status/payment_status/customer_email if known).
- [ ] Direct curl: `POST /api/cart-activity` with `{ "slug": "the-sunkeeper" }` returns `{ "ok": true }`.
- [ ] Direct curl: `POST /api/cart-recovery` with `{ "email": "x@y.z", "lost_items": [{ "slug": "x" }] }` returns a `code` field.

---

## Other Track A items the cross-track update should also address

From `v1_4_3_A_SESS_DEV_REPORT.md`'s existing Open Threads (per memory `project_track_a_complete.md`). Confirm these are either resolved or carried forward:

1. **#1 Vercel env trailing-newline cleanup** — Sean owns; interactive. Confirm it's done before Track C end-to-end testing.
2. **#5 `env()` helper sweep across remaining endpoints** — defensive hygiene; should land before Track C exercises endpoints from the browser. Audit which files still pull `process.env.X!` directly via `grep -rn 'process\.env\.[A-Z]' api/`.
3. **#6 Dual-auth model documentation** — `api/products.ts` + `api/upload.ts` accept either `PRODUCT_API_KEY` or Supabase JWT. `PRODUCT_PROTOCOL.md` already documents it (line 449). Confirm `EVERLASTINGS_STORE.md` mentions it (this is independent of the consolidation work but listed for completeness).
4. **#2/#3/#4** — Stripe webhook registration, admin user seed, stripe-sync test path. Track C may fold into its preflight.
5. **Manual `localhost:3000/admin` round-trip** — owed by Track A; cross-track agent could either run it or hand it to Track C with a note.

---

## What Track B is doing in parallel

Track B continues its design work on `dev`:

- B0.1 cookie consent research wave (relaunch after API rate limit clears).
- B0.2 placeholder product seeding (now unblocked by the green preview deploy).
- B1 design system, B1.5 cookie banner, B2–B6 page builds (subagent-delegated).
- Final deliverable: `v1_4_3_B_SESS_DEV_REPORT.md` modeled on Track A's, with the pre-flight bug folded in as an "Unexpected Adjustment" entry.

The cross-track update agent's work runs independently and does not block Track B.

---

## Suggested commit messages for the cross-track update wave

When the agent commits the doc changes:

```text
docs(EVERLASTINGS_STORE): consolidate api/ inventory + add AR #34 (Hobby cap)

Updates the file-structure tree and Key API Functions section to reflect
the 15 → 11 endpoint consolidation. Adds AR #34 documenting the
?_action=... query-routing pattern + vercel.json rewrite convention.
References v1_4_3_A_BUGS.md and v1_4_3_B_PRE_FLIGHT_BUG.md.
```

```text
docs(v1_4_3_A_IMPLEMENT/SESS_DEV_REPORT): note Hobby function-cap incident

Postmortem note in the IMPLEMENT verification gate; resolved-thread entry
in the SESS_DEV_REPORT pointing at the fix commit and the integration-
test re-run owed against the dev preview.
```

```text
docs(v1_4_3_C_IMPLEMENT): heads-up about api/ consolidation

Track C consumes unchanged public URLs. New endpoints during Track C
should consolidate into existing namespaces, not create standalone files.
Cap buffer is 11/12.
```

```text
chore(.agent/DEV_RULES): add deploy-tier cap check to pre-flight

Adds checklist item to pre-flight: function count under 12 for Vercel
Hobby projects, with a one-line verification command. Prevents the same
bug class on future projects.
```

---

## Pointers

- Full bug detail: `assets/docs/archive/v1_4/v1_4_3_A_BUGS.md`
- Track A's plan: `assets/docs/archive/v1_4/v1_4_3_A_IMPLEMENT.md`
- Track A's report: `assets/docs/archive/v1_4/v1_4_3_A_SESS_DEV_REPORT.md`
- Track B's plan: `~/.claude/plans/you-are-the-track-jaunty-ullman.md` (will be filed as `v1_4_3_B_SESSION_DEV.md` by Sean)
- Track C's plan: `assets/docs/archive/v1_4/v1_4_3_C_IMPLEMENT.md`
- Architecture truth: `assets/docs/EVERLASTINGS_STORE.md`
- Brand voice (relevant for any banner/error copy choices): `assets/docs/BRAND.md`
- Workflow protocol: `.agent/DEV_RULES.md`
