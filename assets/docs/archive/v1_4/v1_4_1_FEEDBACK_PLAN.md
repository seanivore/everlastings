# v1.4.0 IMPL_GUIDE — Audit & Restructure

## Context

After countless rounds of feedback integration, `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md` (3,715 lines) has accumulated three classes of problems that break sequential human reading:

1. **Triple duplication of setup actions.** The same commands appear in Phase 0 (lines 282-305), Phase 1 (307-325), and A1 Services Setup (821-1019) with inconsistent `(SEAN)`/`(AGENT)` tagging. Example: `git checkout -b dev` appears three times; `openssl rand -hex 32` twice; Supabase SQL execution three times; env-var setting scattered across five A1 subsections.

2. **Forward references.** The 8-table Supabase SQL is *defined* at line 518 in "Product Schema Hard Reference." The *action* that runs it is at line 846 — a 328-line jump. Same pattern for Configuration Files (defined 692, executed 1013). A human walking linearly has to flip forward-and-back.

3. **Unlabeled reference sections interleaved with action sections.** ~15 sections have no checkboxes (Architecture Reference, Git Branching Strategy, Environment Strategy, Source of Truth, Stripe Sync Rules, Product Schema, Configuration Files, Webhook Contract, 409 Recovery Flow, Error States, Slug Rules, Image Pipeline, Deferred Items, etc.) — but only the last three (lines 3577+) are labeled "Reference Sections." The rest are ambiguous: read-only? skip? act later?

Sean has also flagged six specific content/flow issues (answered in conversation; captured below).

**Goal:** Restructure the guide into one consolidated REFERENCE block up top + three clean ACTION blocks (Setup / Build Backend / Build Frontend+Integration). Every section gets an explicit **REFERENCE** or **ACTION** label. Every checkbox gets a `(SEAN)` or `(AGENT)` tag. Secrets are handled once. No forward references. Close the six content gaps along the way.

---

## Files Modified

| File                                            | Action                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md` | **Major restructure** (no content loss — reorganization + 6 fixes)                        |
| `assets/docs/archive/v1_4/v1_4_2_IMPL_STEPS.md` | **Align to restructured guide** (mirror section order, re-verify `(SEAN)`/`(AGENT)` tags) |

No other files change. `EVERLASTINGS_STORE.md`, `BRAND.md`, `PRODUCT_PROTOCOL.md`, `README.md` are already consistent with v1.4 content.

---

## Phase 1: Audit (two subagents in parallel, fresh context)

Purpose: produce a precise punch list so the restructure doesn't miss duplicated steps or orphan reference content.

### Agent A — Sequential walker

**Prompt intent**: "You are a human contractor starting at line 1. Walk forward. Every step you hit, ask: (1) is the context complete here, or do I have to jump somewhere else? (2) is the jump signposted? (3) have I seen this same action already? Continue through Phase 0 → Phase 1 → TRACK A → C4 Launch. Stop at end of Track C. Produce a table: {step line, what it says, where the referent lives, line distance, is it a duplicate of an earlier step}."

### Agent B — Section classifier

**Prompt intent**: "List every `##` and `###` heading. Tag each ACTION (has checkboxes), REFERENCE (no checkboxes), or HYBRID (mixed — this is a bug). For each REFERENCE section, list which ACTION sections link to it and which ACTION sections need it but don't link. Flag every ACTION checkbox that references content defined *later* in the doc (forward dependency)."

Both run in parallel. Their reports feed the restructure punch list in Phase 2.

---

## Phase 2: Restructure (target shape)

```
1. Title + TOC
2. Overview (brief — what this doc is, who does what, how to read)
3. REFERENCE SECTIONS — read once, link back from actions
   3.1  Architecture Reference (ARs #1-#32)
   3.2  Source of Truth Hierarchy
   3.3  Stripe Sync Rules
   3.4  Product Schema Hard Reference (SQL + TS interfaces for all 8 tables)
   3.5  Environment Strategy (secrets locations + env var table)
   3.6  Git Branching Strategy
   3.7  Configuration Files (vercel.json, tsconfig.json, package.json, .env.example)
   3.8  Webhook Contract
   3.9  409 Cart Recovery Flow
   3.10 Error States Reference
   3.11 Slug Rules
   3.12 Image Pipeline (Cloudinary → R2)
   3.13 Coupon + Promotion Code Strategy
   3.14 Shipping + Order Fulfillment Pipeline
   3.15 Placeholder Hygiene
   3.16 Enhanced E-commerce GA4 Event Definitions
   3.17 Agentic Pipeline Error Handling
   3.18 Deferred Items / Deferred Caching / Post-Launch
4. ACTION — Setup (merged Phase 0 + Phase 1 + A1 Services Setup; SEAN and AGENT steps interleaved per service, each secret handled once end-to-end)
5. ACTION — Build Backend (Track A2-A4: API endpoints, admin UI, API integration testing)
6. ACTION — Build Frontend (Track B: design system, pages)
7. ACTION — Integration + Launch (Track C: wire-up, checkout flow, SEO, testing, launch)
8. Reference Documents table (external: BRAND.md, PRODUCT_PROTOCOL.md, EVERLASTINGS_STORE.md)
9. Post-Session Consistency Sweep instructions
```

### Per-section rules

- **Every section** opens with a one-line callout: `> REFERENCE — no action` OR `> ACTION — (SEAN) / (AGENT) / both`.
- **Every checkbox** starts with `(SEAN)`, `(AGENT)`, or `(SEAN+AGENT)` — no exceptions, no untagged checkboxes.
- **No action references content defined below it.** All forward-references get flipped or inlined.
- **No duplicate checkboxes.** If Phase 0 and A1 both say "create dev branch," it becomes one checkbox.

### Setup block shape (replaces Phase 0 + Phase 1 + A1 Services Setup)

Organized per-service so Sean handles each secret in one pass (dashboard → `.env.local` → `vercel env add`):

```
ACTION — Setup
  1. Repo reconciliation
     - (SEAN+AGENT) Reconcile current `everlastings` branch → merge to `main`; create `dev` from `main`
     - (AGENT) Generate PRODUCT_API_KEY via `openssl rand -hex 32`
     - (AGENT) Create config files (.env.example, vercel.json, tsconfig.json, package.json — content in REFERENCE 3.7)
     - (AGENT) Run `npm install`, verify `vercel dev`
  2. Vercel project + domain
  3. Supabase (dashboard create → keys → env → migrations → RLS → admin invites → webhook)
  4. Cloudflare R2 (dashboard create → custom domain → token → env)
  5. Cloudinary (dashboard → env)
  6. Stripe (dashboard keys → env → webhook endpoints → coupons bootstrapped via API, not dashboard)
  7. Resend (dashboard → domain verify → env)
  8. Shippo (Phase 0 decision captured; see fix #4 below)
  9. Meta Pixel + Instagram Shopping
  10. GA4 + Search Console
```

Each service block has **all** its steps co-located — Sean does the full flow for one service before moving to the next. No more hunting for "wait, did I already do the Vercel env for R2?"

---

## Six content gaps to close during restructure

These come from Sean's direct questions and my answers. They are fixes to content, not just reorganization:

1. **API key handling flow.** In the Setup block opening, add: "As you copy each key from its dashboard, paste it into `.env.local` (gitignored) AND run `vercel env add` immediately — one secret, one touch. Do not paste keys into this doc or any commit." This replaces the current silent gap between Phase 0 "gather" and Phase 1 "set."

2. **Start from current `everlastings` branch.** First Setup step adds a reconciliation checkbox: "(SEAN) You are currently on `everlastings`. Merge `everlastings` → `main`, delete `everlastings`, then create `dev` from `main`." (Confirm merge strategy with Sean at question time if needed.)

3. **REFERENCE vs ACTION labeling.** Per-section callout rule above. Every section gets the label.

4. **Shippo v1 decision — document explicitly.** Sean confirmed: **web UI only for v1** (no Shippo API integration). Rewrite the Shippo section to state the trade plainly rather than leaving it a silent default: "v1: Emy uses Shippo's web UI to buy/print labels, pastes tracking number into admin UI — ~7 steps/order across two tools, zero integration complexity. API integration is deferred to post-launch as a labeled enhancement with documented trade-off." No `SHIPPO_API_KEY` in v1.

5. **R2 env vars via CLI.** Confirm and state in Setup step: `vercel env add R2_ACCOUNT_ID preview` (etc.) — fully scriptable; AGENT-tagged. Already correct in current doc but scatter obscures it.

6. **Stripe coupon bootstrap via API, not dashboard.** Replace the current "`SEAN or AGENT-via-MCP` create coupons in dashboard" with an idempotent bootstrap script approach: coupons `cart-recovery-10` and `newsletter-welcome-5` are created via `stripe.coupons.create({ id, percent_off, duration: 'forever' })` with idempotency key. Lives in an `api/_bootstrap/coupons.ts` script invoked once by AGENT during setup. No manual Sean step.

---

## Critical files to reference when writing

- `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md:1-3715` — source of truth (being restructured)
- `assets/docs/archive/v1_4/v1_4_2_IMPL_STEPS.md:1-398` — mirror updates after guide is done
- `assets/docs/EVERLASTINGS_STORE.md` — verify cross-references after restructure
- `assets/docs/archive/v1_4/FEEDBACK_FROM_v1_3_1.md` — original feedback source; re-check nothing from v1.3.1→v1.4 was lost in the reorg

---

## Execution order

1. Spawn Audit Agents A + B in parallel (read-only, fresh context). Wait for both reports.
2. Synthesize a single punch list: {duplicated checkboxes to collapse, forward refs to flip, reference sections to relocate, missing labels}.
3. Rewrite IMPL_GUIDE section by section into target shape. Content preserved; no deletions except true duplicates. Fix #4 (Shippo) and fix #6 (coupon bootstrap) are the only content changes beyond labeling/reorg.
4. Update IMPL_STEPS to mirror new section order and re-verify every checkbox has a `(SEAN)`/`(AGENT)` tag.
5. Final sanity grep: no section without a REFERENCE/ACTION callout; no checkbox without a role tag; no forward-reference jumps >50 lines.

---

## Verification

After restructure, these must all be true:

1. Every `##` and `###` heading is preceded by a `> REFERENCE` or `> ACTION` callout line.
2. Every checkbox line matches regex `^\s*-\s*\[\s*\]\s*\((SEAN|AGENT|SEAN\+AGENT)\)` — zero untagged checkboxes.
3. No action checkbox references a section by name that is defined after it in the doc (flip or inline).
4. `git diff --stat` shows roughly equal insertions and deletions (reorg, not rewrite).
5. Line count ≤ current 3,715 (restructure should slightly shrink via deduplication).
6. Setup block: every service has all its steps co-located; no service's steps are split across two places.
7. Shippo decision captured as a labeled decision block, not a default.
8. Stripe coupon creation is now an AGENT bootstrap script step, not a SEAN dashboard step.
9. IMPL_STEPS section headings match IMPL_GUIDE section headings 1:1.
10. Post-restructure spot-check: Sean reads the Setup block top-to-bottom without flipping backward once.
