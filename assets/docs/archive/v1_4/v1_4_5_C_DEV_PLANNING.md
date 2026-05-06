# v1.4.5 — TRACK C Prep & Plan Restoration

## Context

The current `v1_4_4_C_IMPLEMENT.md` violates the project's "exclusively executable" plan standard (defined in `.agent/DEV_RULES.md` § 347–425). It mixes accurate forward-looking spec with bug-fix patches, gap-fill corrections, and 5+ "Required Pre-Reads" pointing at post-hoc closeout reports — exactly what `DEV_RULES.md` warns against. The TRACK A orchestrator's report (`v1_4_3_A_SESSION_REPORT.md`) confirms the prior plan was "truly exclusively executable"; that quality bar has been lost.

Symptoms catalogued in the current Track C draft:

- **Code specs deleted, replaced with redirects.** Major frontend wiring (`assets/js/cart.js`, `checkout.js`, `complete.html`, `recovery.js`, plus C2 per-page modules `product.js`, `shop.js`, `homepage.js`, `newsletter.js`) appear as task bullets or as "Carry forward verbatim from `v1_4_3_C_IMPLEMENT.md` lines 615–770" — not as inline production code.
- **Phase 0 = 7 pre-flight bugs (Gaps A–G) treated as implementation gates.** Sourced from `v1_4_3_B_PRE_FLIGHT_BUG.md`. The plan asks the executing agent to switch the Cloudinary flow, fix a `test_` prefix validator, add inline stripe-sync, and patch idempotency *as part of Track C* — feeding LLM both the broken and fixed truth at once.
- **Closeout reports listed as required reads.** Lines 49–60 require the agent to ingest `v1_4_3_A_SESSION_REPORT.md`, `v1_4_3_A_UPDATE_REPORT.md`, `v1_4_3_B_SESSION_REPORT.md`, `v1_4_3_B_PRE_FLIGHT_BUG.md` because "contracts shifted from the original IMPLEMENT specs." That admission belongs in an archive doc, not a forward-looking plan.
- **"Sean" named as orchestrator.** Lines 6, 14, 18, 28, 369, 449, etc. The orchestrator role is an XHIGH agent that delegates to subagents (per the TRACK A pattern in `v1_4_3_A_SESSION_DEV.md` lines 7–8, 44–54). Sean is the human reviewer, not the executor.
- **Supporting docs carry stale truth.** `EVERLASTINGS_STORE.md` still lists pre-consolidation endpoints (`/api/checkout/reserve.ts`, `/api/session-status.ts`, `/api/orders/[id].ts`) that were merged into `/api/checkout.ts`, `/api/orders.ts`, `/api/cart.ts` in commit `2085c42`. AR #34 (Hobby cap → consolidation pattern) is missing. The four reconciliation edits flagged in `v1_4_3_B_PRE_FLIGHT_BUG.md` lines 71–120 were never applied.
- **`PRODUCT_PROTOCOL.md` has zero Custom GPT setup instructions.** It explains how Emy *uses* the assistant and assumes "Sean will have set this up for you" — but no setup procedure exists anywhere.

The intended outcome of this prep session: TRACK C ships in v1.4.5 against a single, clean, exclusively-executable plan. The agent that runs it never sees a bug, gap, patch, or closeout reference — only the world as it will be when execution begins.

## Goals

1. **Code fixes land first.** Track A bug-fix gaps (A/B/C/D) merged to `dev`, so Track C's plan can describe the system as it actually is, not as it needs to become.
2. **Supporting docs reconciled.** `EVERLASTINGS_STORE.md` matches shipped code; `PRODUCT_PROTOCOL.md` includes end-to-end Custom GPT setup; brand voice / live-launch directives are coherent.
3. **One historical archive.** A single `v1_4_4_IMPLEMENT_UPDATES.md` captures every delta against the v1.4.3 baseline — replacing the need to read across A/B SESSION_REPORTS, UPDATE_REPORT, PRE_FLIGHT_BUG, etc. **This doc is for human/historical reference only — it is NOT a required read for the Track C orchestrator.** Track C's context contains exactly one truth.
4. **Clean exclusively-executable Track C plan.** `v1_4_5_C_IMPLEMENT.md` matches the TRACK A gold standard: pre-flight checklist (verification only, no fixes), file-by-file phases with full production code blocks inline, contract tests per deliverable, explicit subagent groupings, verification gates with sign-off criteria, agent-as-orchestrator (XHIGH) framing.
5. **Versioning principle.** Highest version number = current source of truth. All new artifacts of this session use the `v1_4_5_` prefix. Superseded docs get a DEPRECATED banner pointing forward; nothing is deleted, but readers always know where to look.

### Governing principle (carried throughout)

Implementation plans contain **only confirmed decisions**. No on-the-fly thinking during execution. The agent's job is borderline cut-and-paste — every "should I do X or Y?" must have been resolved in planning. Anything that looks like a fix, gap, decision, alternative, or correction belongs in archive docs (or in the EVERLASTINGS_STORE.md "presumptions" section, see Phase 2a) — never in the executable plan itself.

## What "done" looks like

A new agent opening `v1_4_5_C_IMPLEMENT.md` cold should:

- Need exactly **one** required read (the plan itself).
- Find every file deliverable as a path + production-ready code block + contract test.
- See no reference to "gap," "fix," "correction," "carry forward from v1.4.3," "Track A pre-flight," or "Track B PRE_FLIGHT_BUG."
- Understand its role as XHIGH orchestrator delegating to subagents in named groups.
- Know exactly what blocks each phase gate and how to verify it.

---

## Phase 1: Code-level reconciliation (do before any plan rewrite)

Apply the four `BEFORE` gaps from `v1_4_3_B_PRE_FLIGHT_BUG.md` to `dev` so they cease to exist as outstanding work. These are *not* presented as fixes in the new plan — they are the baseline.

**Critical files to modify:**

- **Gap A (Cloudinary signed-flow switch, CRITICAL).** Per `v1_4_3_B_PRE_FLIGHT_BUG.md`. Touch the upload/sign endpoint and the admin upload path that consume it. Verify the existing helper used in `api/_lib/` rather than introducing a new utility.
- **Gap B (`test_` prefix validator, CRITICAL).** `api/products.ts`. Single-function fix to the validator.
- **Gap C (inline stripe-sync via `?sync=true`, Decision D2).** `api/products.ts` (or the admin-create handler that currently relies on webhook for stripe propagation). Idempotent path keyed off the existing stripe product id field.
- **Gap D (stripe-sync idempotency).** Same handler; defensive guard so retries don't double-create.

Each fix lands as one focused commit with a message that does not reference "gap" or "pre-flight bug" — describes the behavior change in product terms.

**Verification:**

- Curl-based contract tests against the relevant `/api/*` endpoints on the preview URL (per `feedback_no_localhost_testing` rule — never localhost).
- Confirm `api/_lib/env.ts` and other shared helpers are unchanged (no scope creep into Track A's code beyond the four gaps).
- `vercel build` clean; preview deploy green.

**Excluded from Phase 1:** Gaps E, F, G — those are doc-only or knowledge-only and dissolve naturally into Phase 2/3 outputs.

## Phase 2: Supporting-doc reconciliation

### 2a. `EVERLASTINGS_STORE.md`

Apply the four reconciliation edits documented at `v1_4_3_B_PRE_FLIGHT_BUG.md` lines 71–120:

- **Edit A** — Verify function list block matches shipped endpoints.
- **Edit B** — Update file tree: drop `api/checkout/reserve.ts`, `api/session-status.ts`, `api/orders/[id].ts`, `api/cart-recovery.ts` references; replace with the consolidated `api/checkout.ts`, `api/orders.ts`, `api/cart.ts`.
- **Edit C** — Add **AR #34**: "Vercel Hobby tier function-cap drives endpoint consolidation." Brief rationale + which endpoints are bundled where.
- **Edit D** — Add to "Things That Look Like Bugs But Aren't" / "Presumptions Agents Might Make That Would Be Mistakes" section: API file path ≠ public URL mapping (e.g. why `api/checkout.ts` serves `/api/checkout`, `/api/checkout/reserve`, `/api/session-status`).

**Defensive entries to add to the "Presumptions" section** (so future agents don't try to "fix" things that are intentional):

- **Endpoint consolidation is intentional, not lazy.** Vercel Hobby tier caps Serverless Functions at 12. To stay under, related endpoints are co-located in single `.ts` files behind path-based routing inside the handler. Do not split them back out without confirming the function-cap impact and getting explicit sign-off.
- **Inline stripe-sync via `?sync=true` (Decision D2) is intentional, not a webhook bypass.** Admin product creation calls Stripe synchronously during create rather than relying on the webhook to backfill. Rationale: webhook delivery is best-effort with retries; admin-flow needs the Stripe product id available immediately for the response. The path is idempotent (keyed off the existing stripe product id field) so retries are safe. Do not "simplify" this back to a webhook-only flow.
- **`test_` prefix on test products** is enforced at the validator and is real product behavior, not a debug artifact. Live products must not carry the prefix; test products must carry it.
- **Cloudinary signed-flow** is the production path; do not introduce unsigned upload variants.

Also apply Gap F (`materials` array type clarification — schema documentation).

Stamp the doc with an updated `Last reviewed:` date so future agents trust it.

### 2b. `PRODUCT_PROTOCOL.md`

Add a new section: **"Custom GPT Setup (one-time)"** — to be placed before the existing "Using Your AI Product Assistant" section. Required content:

- What a Custom GPT is in plain language (so Emaline can read it too).
- Step-by-step ChatGPT setup: create GPT → name + description → instructions (system prompt to author or reference) → Actions configuration (OpenAPI schema source, authentication via `PRODUCT_API_KEY` Bearer) → testing the action against the live `/api/*` endpoint → publishing privately → bookmarking the link.
- Required artifacts the setup needs: the OpenAPI schema (where it lives in the repo or as a copy-paste block), the `PRODUCT_API_KEY` source (Vercel env var name only — never the value), the live API base URL.
- End-to-end test flow: one example product creation walked through from GPT prompt → expected API call → expected response → DB row visible in Supabase.
- Owner/handoff note: who maintains this (Sean), how Emaline gets the link, what to do if the key rotates.

This section is the artifact that lets us say "tested end-to-end and used ourselves before handoff" — see Sean's L:14 question in the feedback doc.

### 2c. `BRAND.md` and any other doc referenced in Track C

Quick scan of `assets/docs/BRAND.md` for stale references to old endpoint shapes or to the splintered "track" structure that no longer applies to a forward-looking reader. Update only if mismatched against shipped code; otherwise leave alone.

## Phase 3: Build the historical archive (`v1_4_4_IMPLEMENT_UPDATES.md`)

Single archive doc that supersedes the need to ever read A/B SESSION_REPORTs, UPDATE_REPORT, PRE_FLIGHT_BUG, or the messy `v1_4_4_C_IMPLEMENT.md` for context. Lives at `assets/docs/archive/v1_4/v1_4_4_IMPLEMENT_UPDATES.md`.

**Top of doc — references the originals:**

> Baseline: `v1_4_3_IMPLEMENT_PRESPLIT.md` (= `v1_4_3_IMPLEMENT.md` + `v1_4_3_A_IMPLEMENT.md` + `v1_4_3_B_IMPLEMENT.md`).
> This document records every change against that baseline before Track C executes in v1.4.5.

**Body — organized by area, not by track:**

- **Endpoint consolidation** — what merged into what, why (Vercel Hobby cap), commit refs.
- **Cloudinary flow change** (Gap A resolution).
- **Validator + sync + idempotency fixes** (Gaps B/C/D resolution).
- **Schema clarifications** (Gap F).
- **Knowledge items that didn't change code** (Gap G `?slug` 404 behavior; Gap E `vercel curl` exit code 3).
- **Track B placeholder seed manifest** — pointer to `v1_4_3_B_PLACEHOLDER_SEED.md` IDs/slugs for cleanup; consolidated table of test products to delete.
- **Cookie consent research outcome** — settled decisions only (not the research process).
- **Design Review settled-vs-iterating ledger** — frozen snapshot from `v1_4_4_C_DESIGN_REVIEWS.md` § 8 of what's locked.

**Bottom — explicit deprecation notes:**

> The following docs are archived and should not be read by Track C executors: `v1_4_4_C_IMPLEMENT.md`, `v1_4_3_C_IMPLEMENT.md`, `v1_4_3_A_SESSION_REPORT.md`, `v1_4_3_A_UPDATE_REPORT.md`, `v1_4_3_B_SESSION_REPORT.md`, `v1_4_3_B_PRE_FLIGHT_BUG.md`. Their content is folded into `v1_4_5_C_IMPLEMENT.md` (forward-looking) and this doc (historical).

Also stamp a **DEPRECATED** banner at the top of `v1_4_4_C_IMPLEMENT.md` itself pointing to v1.4.5.

## Phase 4: Build `v1_4_5_C_IMPLEMENT.md` to gold standard

Lives at `assets/docs/archive/v1_4/v1_4_5_C_IMPLEMENT.md`. Modeled directly on `v1_4_3_A_IMPLEMENT.md` structure (the stated gold standard).

### Required structural sections (in order)

1. **Header** — version, branch (`dev`), audience ("Track C orchestrator agent at XHIGH"), one-line goal.
2. **Pre-flight Checklist (verification only, bash-only).** What must be true before C1 starts. No fixes, no installs — just `git status`, `vercel env ls`, `supabase migration list`, curl probes against `/api/*`, asset directory exists, etc. Stop conditions enumerated.
3. **Phase C1 — Custom GPT operationalization.** Includes the demo gate (Emy creates one product) referenced in the current draft; cleaned up to remove "Sean watches" framing — instead, the orchestrator runs the verification curl + reads back DB row.
4. **Phase C2 — Per-page wiring (product.js, shop.js, homepage.js, newsletter.js).** Each module: exact file path, full production code block (drawn from `v1_4_3_C_IMPLEMENT.md` and `v1_4_3_IMPLEMENT_PRESPLIT.md` where the code already exists, freshly authored where it doesn't), contract test, error-state matrix.
5. **Phase C3 — Cart + checkout flow (cart.js, recovery.js, checkout.js, complete.html).** Full code blocks inline. Race-condition handling, hold-expiry handling, redirect contracts — all spelled out. No "carry forward."
6. **Phase C4 — Contact + admin click-path verification.** Subagent group can run in parallel with C3 finalization.
7. **Phase C5 — Launch checklist.** Placeholder cleanup (Supabase IDs, R2 paths, Stripe archive list — copied inline from `v1_4_3_B_PLACEHOLDER_SEED.md`), live Stripe switchover env-var swap, production smoke test.
8. **Verification Gates** — per phase, with explicit pass criteria.
9. **Subagent groupings** — table of what runs in parallel, dependencies between groups, what the orchestrator does *not* delegate (gate decisions, branch state, commit cadence).
10. **Escalation triggers** — when to stop and ask, in product terms (not "if a gap is found" — that framing is gone).
11. **Rollback section** — what reverts cleanly, what doesn't.

### Code-block sourcing

- **`assets/js/cart.js`** — extract from `v1_4_3_C_IMPLEMENT.md` lines 499–605 (or equivalent in `v1_4_3_IMPLEMENT_PRESPLIT.md`); update any references that broke after endpoint consolidation; inline.
- **`assets/js/checkout.js`** — extract from `v1_4_3_C_IMPLEMENT.md` lines 615–770 / presplit equivalent; same treatment.
- **`assets/js/complete.html`** (script block) — extract; inline.
- **`assets/js/product.js`, `shop.js`, `homepage.js`, `newsletter.js`, `recovery.js`** — author full code blocks now (currently bullets only). Each must be production-ready: error handling, ARIA, no placeholders, matches BRAND voice for any user-visible strings.

Every code block ends with:

- A `curl` or browser-flow contract test that proves it works.
- An error-state row in the appendix matrix.

### Tone fixes

- "Sean" appears only where Sean is doing a human action that the agent cannot do (e.g., "Sean does the real-card-then-refund smoke test on production"). Everywhere else: "the orchestrator," "the agent," or simply imperative sentences.
- No "Track A pipeline gaps," "carry forward," "Phase 0 fixes," "PRE_FLIGHT_BUG," "closeout."
- No "Required Pre-Reads" section pointing outside the plan.

### Critical files referenced in this plan

- `assets/docs/archive/v1_4/v1_4_3_A_IMPLEMENT.md` — gold-standard structural template.
- `assets/docs/archive/v1_4/v1_4_3_A_SESSION_DEV.md` — orchestrator framing reference (lines 7–8, 44–54).
- `assets/docs/archive/v1_4/v1_4_3_C_IMPLEMENT.md` — code-block source for cart/checkout/complete.
- `assets/docs/archive/v1_4/v1_4_3_IMPLEMENT_PRESPLIT.md` — secondary code-block source (more complete in places).
- `assets/docs/archive/v1_4/v1_4_3_B_PLACEHOLDER_SEED.md` — placeholder cleanup manifest for C5.
- `assets/docs/archive/v1_4/v1_4_4_C_DESIGN_REVIEWS.md` — settled design decisions § 8 (folded into IMPLEMENT_UPDATES, then referenced from Track C only as inputs to copy/voice work).
- `.agent/DEV_RULES.md` — quality bar (lines 347–425).

## Verification

End-of-session sign-off, performed by the orchestrator, before this prep session closes:

1. **Phase 1 verification.** Curl every consolidated `/api/*` endpoint on a live preview deploy; confirm Gap A/B/C/D behaviors. Run an admin-create flow that exercises the inline stripe-sync. No 5xx, no timeouts.
2. **Phase 2 verification.** Diff `EVERLASTINGS_STORE.md` against actual repo `api/` directory — every endpoint listed exists, every endpoint that exists is listed. AR #34 present. `PRODUCT_PROTOCOL.md` Custom GPT section walked through end-to-end (create one real test product via the GPT → see DB row → archive product).
3. **Phase 3 verification.** Read `v1_4_4_IMPLEMENT_UPDATES.md` cold (no other context) — does it answer "what changed since v1.4.3 baseline?" without sending the reader to other docs? If yes: pass.
4. **Phase 4 verification — the gold-standard test.** Open `v1_4_5_C_IMPLEMENT.md` and run a checklist:
   - [ ] Contains zero references to "gap," "fix," "patch," "correction," "carry forward," "PRE_FLIGHT_BUG," "Open Threads."
   - [ ] Every `Create assets/js/*.js` deliverable has a full inline code block (not a redirect).
   - [ ] Every code block has a contract test.
   - [ ] "Sean" appears only as the human doing human-only actions (final card test, etc.).
   - [ ] Plan's "Required Pre-Reads" section either doesn't exist or contains only this plan + DEV_RULES.
   - [ ] Subagent groupings are explicit and parallelizable.
   - [ ] Phase gates have measurable pass criteria.
   - [ ] Escalation triggers framed in product terms, not bug terms.
5. **Cold-read test.** Spawn a fresh Explore subagent, hand it only `v1_4_5_C_IMPLEMENT.md`, ask: "list any ambiguity, missing detail, or implicit reference to outside context that an executing agent would need to resolve before starting." Two consecutive clean passes = ready for Track C execution.

## Decisions confirmed with Sean

- **Same-session execution.** Phase 1 code fixes + Phase 2 doc reconciliation + Phase 3 archive doc + Phase 4 plan rebuild all happen in this prep session. Goal: never expose Track C's clean context to anything wrong.
- **D2 is confirmed.** Bake inline stripe-sync into v1.4.5 as standing behavior; capture the rationale in EVERLASTINGS_STORE.md "Presumptions" section so a reading agent doesn't second-guess and try to "fix" it.
- **DEPRECATED banner in place.** Superseded docs stay at current paths with a banner pointing forward to v1_4_5. Highest version number is always the current truth.
- **IMPLEMENT_UPDATES is historical only.** It exists for Sean and future humans/agents who want to know "what changed since v1.4.3 baseline." It is explicitly NOT in the Track C orchestrator's required-reads list.

## Files that will be created/modified during this session

Created:
- `assets/docs/archive/v1_4/v1_4_5_C_IMPLEMENT.md` — the new exclusively-executable Track C plan.
- `assets/docs/archive/v1_4/v1_4_4_IMPLEMENT_UPDATES.md` — single historical archive of all v1.4.3 → v1.4.5 deltas.

Modified:
- Code: the four files touched by Gaps A/B/C/D (Cloudinary handler, `api/products.ts`, related shared helpers under `api/_lib/`).
- `assets/docs/EVERLASTINGS_STORE.md` — Edits A–D + Presumptions section additions + AR #34 + `materials` type clarification + Last reviewed date.
- `assets/docs/PRODUCT_PROTOCOL.md` — new Custom GPT Setup section.
- `assets/docs/archive/v1_4/v1_4_4_C_IMPLEMENT.md` — DEPRECATED banner top of file.
- `assets/docs/archive/v1_4/v1_4_3_C_IMPLEMENT.md` — DEPRECATED banner top of file.
- `assets/docs/archive/v1_4/v1_4_3_A_SESSION_REPORT.md`, `v1_4_3_A_UPDATE_REPORT.md`, `v1_4_3_B_SESSION_REPORT.md`, `v1_4_3_B_PRE_FLIGHT_BUG.md` — DEPRECATED banner top of each, pointer to `v1_4_4_IMPLEMENT_UPDATES.md`.

Not touched (and out of scope for this session):
- Anything in `assets/css/` (Track B's domain; design iteration is separate).
- Anything in `assets/js/` outside what Phase 1 code fixes require (Track C will create those in v1.4.5 execution).
- `BRAND.md` unless a stale endpoint reference is found during Phase 2c scan.
