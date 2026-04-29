# v1.4.3 Pre-Implementation Preparation Plan

## Context

You wrapped Phase 0 last session and want this session to be the final ramp before launching parallel implementation tracks (A, B, C). You wrote `assets/docs/archive/v1_4/v1_4_3_PREP.md` covering four asks: (1) Meta Business setup research, (2) splitting the 40k-token implementation guide so orchestrators aren't drowned in irrelevant context, (3) a Shippo email response draft, and (4) confirmation that everything is ready. You explicitly asked for my own opinion on the context-management approach rather than rubber-stamping yours.

**My read on your context strategy** (after auditing the docs):

Your instinct to split is right. The 4,188-line `v1_4_3_IMPLEMENT.md` has clean structural seams — Tracks A, B, C are roughly 65% of the doc and live in well-bounded line ranges (A: 961–2631, B: 2632–3079, C: 3080–3667). The pre-track reference (lines 1–958) and post-track reference (lines 3668–4188) form bookends that don't need to load when an orchestrator is executing one track.

**One refinement to your proposal — and you essentially called this in the AskUserQuestion answers:** Reference material should go *into the track guides where it's used*, not centralized in `assets/docs/EVERLASTINGS_STORE.md`. The reason it lives in a separate "Reference" section of the original guide is DRY (some refs are needed by multiple tracks). But for orchestrator execution, *self-sufficiency* beats DRY — duplicating Webhook Contract content into Track A's webhook-handler section means the orchestrator never context-switches to find it. Same for Error States in Tracks B/C, GA4 events in Track C, etc.

So `EVERLASTINGS_STORE.md` stays the architectural primer it already is (loaded in every session via `.claude/CLAUDE.md`). The track guides become **fully self-contained execution playbooks** — everything needed to make decisions inline. We accept some duplication across A/B/C as a feature, not a bug.

---

## Scope of Work — All in This Session

1. Phase 0 verification + condensation
2. `EVERLASTINGS_STORE.md` reconciliation (additions only where genuinely architecture-level)
3. Three track-specific implementation guides (self-sufficient)
4. Track initiation prompts
5. Meta Business research + step-by-step setup guide
6. Shippo email response draft
7. Final confirmation pass

---

## 1. Phase 0 Verification + Condensation

**Current state** (lines 189–375 of `v1_4_3_IMPLEMENT.md`):

- Repo scaffolding: 3/3 ✓
- Supabase: 9/10 ✓ (Emy member access deferred — non-blocking)
- Vercel: 4/4 ✓
- Cloudinary: 3/3 ✓
- Stripe: 5/6 ✓ (Preview scope deferred to Pass 2 — likely now done)
- Cloudflare R2: 5/5 ✓
- Resend: 3/3 ✓
- Shippo: 1/3 (USPS account deferred — non-blocking, see Section 6 below)
- Meta Business: 1/5 (token + pixel — Section 5 of this plan addresses)
- Google Analytics: 3/3 ✓
- Product API: 1/4 (Production/Preview keys deferred to Pass 2 — likely now done)
- Pass 2 (branch reconciliation, live keys, Preview scope): 0/6 marked but you noted *"the agent did set up branches and did bootstrapping. Those items did not get checked off"*
- Pass 3 (config files, schema push, DB webhook, coupons, CORS test): 0/6 marked, same situation

**Action:**

- Verify what's actually done by inspection: `git branch -a`, `vercel env ls --environment production/preview/development`, presence of config files (`vercel.json`, `tsconfig.json`, `package.json`, `.env.example`), Supabase tables (via MCP), Stripe coupons (via Stripe CLI or dashboard if accessible).
- For each completed-but-unchecked Pass 2 / Pass 3 item, mark `[x]` with a one-line "verified via X on 2026-04-29" annotation.
- For genuinely deferred items (Emy member access, USPS, Meta tokens), keep `[ ]` and note "deferred — non-blocking for v1.4.3 implementation, addressed in {section}".

**Phase 0 condensation:** Once verified, condense to a flat checklist (~40–60 lines) at the top of `v1_4_3_IMPLEMENT.md` showing only checkbox state + one-line item descriptions. The detailed prose explaining each pass's *why* moves into a single short "Phase 0 Notes" section beneath, or is dropped entirely if redundant with `EVERLASTINGS_STORE.md`. **Do not delete unchecked deferred items** — they serve as a "what's still pending" reminder.

**Critical files:**
- `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_IMPLEMENT.md` (lines 189–375)

---

## 2. EVERLASTINGS_STORE.md Reconciliation

`EVERLASTINGS_STORE.md` (871 lines) is already the project's architectural primer and is auto-loaded via `.claude/CLAUDE.md` → `.agent/AGENTS.md`. It already has: Tech Stack, Architecture Overview, File Structure, Data Flow, Design System summary (with pointer to BRAND.md), Supabase Schema, Deployment.

**What to add to it** (architecture-level only, not tactical):

- **Architecture Reference (33 ARs)** from `v1_4_3_IMPLEMENT.md` lines 60–187 — *if* not already covered by the existing "Architecture Overview" section. Reconcile: read both side-by-side, merge missing ARs into a single Architecture Decisions section. These are project-wide design rules referenced as "AR #N" throughout.
- **Plain-English Glossary** (lines 37–57) — universal terminology, belongs in the primer.
- **Source of Truth Hierarchy** (lines 580–590) — short architectural principle.
- **Stripe Sync Rules** (lines 593–603) — operational rule, not tactical step.

**What to NOT move into EVERLASTINGS_STORE.md** (these go into track guides instead):

- Product Schema Hard Reference (lines 605–840, 236 lines) — Track A needs this inline to write migrations and API code; the existing Supabase Schema section in EVERLASTINGS_STORE.md is summary-level, that stays as-is.
- Configuration Files Reference (lines 843–931) — Track A needs the full config file contents inline.
- Environment Strategy Reference (lines 446–509) — Track A needs the env var table inline.
- Dev/Test Data Hygiene (lines 511–578) — split: CORS into A2 endpoint setup, is_test into A2 schema work, R2 namespacing into A2 upload, webhook pinning into A2 webhook.
- Git Branching Strategy (lines 378–444) — already in `DEV_RULES.md`. Just point to it.
- Webhook Contract, GA4 Events, Error States, Slug Rules, Image Pipeline, Coupon Strategy, Shipping Pipeline, Placeholder Hygiene — all distributed to relevant tracks (see Section 3).

**Critical files:**
- `/Users/seanivore/Development/everlastings-website/assets/docs/EVERLASTINGS_STORE.md`
- Source: `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_IMPLEMENT.md` lines 60–187, 580–603

---

## 3. Three Track-Specific Implementation Guides

Each guide is **self-sufficient** for its domain. Orchestrator's loaded context is:
- The track-specific guide
- `assets/docs/EVERLASTINGS_STORE.md` (auto-loaded)
- `.agent/DEV_RULES.md` (auto-loaded)
- `.agent/AGENTS.md` (auto-loaded)
- `assets/docs/BRAND.md` (Tracks B and C only)

### Common structure for all three guides

Each starts with a **standardized preamble** (~80 lines) containing:

1. **Track Goal** (1 paragraph)
2. **Pre-loaded context** — list of files orchestrator already has and should NOT re-read
3. **DO NOT EXPLORE list** — explicit dirs/files irrelevant to this track (e.g., for Track A: `assets/css/`, `assets/js/main.js`, all `*.html` except `admin/index.html`)
4. **Other tracks at a glance** — 1 paragraph each on A/B/C, just enough to understand sequencing and contracts
5. **Subagent delegation guidance** — track-specific recommendations on what to delegate (see per-track below)
6. **Verification gate** — what "done" looks like for this track
7. **Branch + commit policy** — which branch, commit cadence, PR target

Then the executable content + inlined references the track needs.

### Track A: `v1_4_3_A_IMPLEMENT.md` — Foundation + Backend

**Source:** `v1_4_3_IMPLEMENT.md` lines 961–2631 (1,671 lines), plus inlined references.

**Inlined references** (move/copy from elsewhere in original):
- Product Schema Hard Reference (605–840) — into A1 schema section
- Configuration Files Reference (843–931) — into A1 services setup
- Environment Strategy + variable table (446–509) — into A1 services setup
- Dev/Test Data Hygiene split appropriately (511–578) — CORS into A2 helpers, `is_test` into A1 schema, R2 namespacing into A2 upload, webhook pinning into A2 webhook
- Webhook Contract (3668–3700) — into A2 `webhook.ts` section
- Agentic Pipeline Error Handling (3771–3786) — into A2 `products.ts` admin endpoints
- Slug Rules (3958–3973) — into A2 `products.ts`
- Cloudinary → R2 Image Pipeline (3974–4005) — into A2 `upload.ts`
- Coupon + Promotion Code Strategy (4052–4097) — into A2 `stripe-sync.ts` (Stripe-side mechanics)
- Shipping + Order Fulfillment Pipeline (4099–4133) — into A2 Shippo + A3 Admin Orders
- GA4 server-side concerns (server-side events from webhook) — into A2 `webhook.ts`

**Subagent guidance for Track A:** Aggressive delegation. Each major API endpoint in A2 (~14 endpoints) is independently scoped — orchestrator should delegate each to a coding subagent with the relevant section as the spec, then integration-test in A4. A1 services setup is mostly already done in Phase 0 (verify + check, don't redo). A3 Admin UI is one subagent. A4 testing is one subagent.

**Verification gate:** All 14 API endpoints respond correctly to smoke tests; webhook contract test passes; admin UI loads at `/admin`; Product Protocol curl test from PRODUCT_PROTOCOL.md works.

**Estimated final length:** ~2,500 lines.

### Track B: `v1_4_3_B_IMPLEMENT.md` — Frontend Design

**Source:** `v1_4_3_IMPLEMENT.md` lines 2632–3079 (448 lines), plus inlined references.

**Inlined references:**
- Error States Reference (3853–3957) — full list, B is where the UX surfaces
- Placeholder Hygiene (4136–4170) — B creates the placeholders
- GA4 script tag setup (already in B at 2780) — keep
- Meta Pixel script tag (already in B at 2794) — keep
- A few relevant ARs from Architecture Reference — pull only the design/accessibility/UX ones (e.g., AR around mobile-first, perf budget, lightbox approach)

**Subagent guidance for Track B:** Moderate delegation. B1 (Design System) must be done first by the orchestrator directly — it's the foundation everything else depends on. B2–B6 (header/footer/nav, product, shop, homepage, remaining pages) can each be delegated to a subagent given the design system tokens are now in CSS. Each page subagent gets B1 output + page-specific section.

**Verification gate:** All pages load with placeholder content; design system tokens render correctly; Lighthouse mobile score ≥ 90; placeholder grep convention working (`grep -r 'PLACEHOLDER:' .` returns expected matches).

**Estimated final length:** ~700 lines.

### Track C: `v1_4_3_C_IMPLEMENT.md` — Integration

**Source:** `v1_4_3_IMPLEMENT.md` lines 3080–3667 (588 lines), plus inlined references.

**Inlined references:**
- 409 Conflict Cart Recovery Flow (3701–3770) — into C2 checkout flow
- Error States Reference (3853–3957) — full, C wires the actual error handling
- Enhanced E-commerce GA4 Event Definitions (3787–3852) — full, C calls these
- Meta Pixel Events (3835–3852) — full
- Coupon + Promotion Code Strategy (4052–4097) — cart-recovery side, into C2
- Placeholder Hygiene (4136–4170) — C replaces them, full guide needed
- Source of Truth Hierarchy (580–590) — short reminder for data-flow decisions

**Subagent guidance for Track C:** Light delegation. C is integration work — sequencing and cross-page state matter. Orchestrator should do C1 (wire pages to backend) directly because it requires holistic understanding of which placeholders connect to which APIs. C2 checkout flow is the most complex and benefits from subagent for the cart.js implementation. C3 (SEO finalization) is one subagent. C4 (testing + launch prep) is one subagent.

**Verification gate:** Full purchase flow works end-to-end on preview deployment (browse → cart → checkout → payment → email → order in Supabase). Placeholder grep returns zero matches. Error states render correctly when triggered. GA4 + Meta Pixel events fire correctly per the inlined event definitions.

**Estimated final length:** ~900 lines.

### Cross-track sequencing note (in all three guides)

```
Phase 0 ✓ → Track A (backend) ─┐
                               ├──→ Track C (integration) → Launch
            Track B (frontend) ┘
A and B run in parallel. C cannot start until A2 (API endpoints) and B1+B2–B6 (pages with placeholders) are both complete.
```

**Critical files to create:**
- `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_A_IMPLEMENT.md`
- `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_B_IMPLEMENT.md`
- `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_C_IMPLEMENT.md`

**Original `v1_4_3_IMPLEMENT.md`** stays at its current path (per your archive-by-design convention). After this refactor it will contain: condensed Phase 0 + a "Document Split Notice" pointing to the three track guides + (optionally) the cross-track sequencing diagram. The full content has migrated; the file becomes a chronological landmark in the version folder rather than an executable artifact.

---

## 4. Track Initiation Prompts

Three init prompts saved as a single companion file alongside the track guides:

- `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_INIT_PROMPTS.md`

Each prompt is ~250–400 words and includes:

1. **Role + goal statement** — "You are the Track A orchestrator. Your goal is to deliver the complete backend foundation per `v1_4_3_A_IMPLEMENT.md`."
2. **Required reading order** — track guide first, then `EVERLASTINGS_STORE.md` only if a question arises. *Explicitly tell them not to read other track guides unless required by the cross-track section.*
3. **Branch instruction** — "Work on branch `dev`, commit small increments with the convention in `DEV_RULES.md`, do not merge to `main`."
4. **Subagent delegation expectation** — "Effort is set to extra-high; conserve context. Use Explore subagents for codebase searches, Plan subagents for cross-cutting design decisions, and coding subagents for each major endpoint/page."
5. **Definition of done** — points to the Verification Gate in the track guide.
6. **Escalation policy** — "If you encounter a decision not covered in the guide, stop and ask the user. Do not invent."
7. **Track-specific kickstart command** — e.g., for Track A: "Begin with A1 verification — confirm Phase 0 services state matches expected, then proceed to A2."

---

## 5. Meta Business Research + Step-by-Step Setup

You need: `META_ACCESS_TOKEN` and `META_PIXEL_ID`. You're creating Pages from your Facebook account first, then transferring ownership to Emy later.

**Action:** Launch a research subagent (`general-purpose` with `WebSearch` + `WebFetch`) with this prompt:

> Produce the most direct step-by-step guide (current as of April 2026) to:
> 1. Create a Facebook Page for a small e-commerce business
> 2. Create an Instagram business profile linked to that Page
> 3. Set up Meta Business Manager / Business Suite around them
> 4. Generate a long-lived `META_ACCESS_TOKEN` for the Conversions API
> 5. Create a Meta Pixel and obtain its `META_PIXEL_ID`
> 6. (Bonus) Note the prerequisites for transferring Page ownership later
>
> Source exclusively from current Meta help documentation (`facebook.com/business/help`, `developers.facebook.com/docs`). Avoid third-party tutorials except as cross-checks. Account for Meta's frequent UI changes by noting "as of {date} the path is X, but if the menu shows Y, click that instead."
> Output as a numbered checklist with exact menu paths. Flag any step that requires phone verification, ID verification, or 2FA so user can prepare.

The output becomes a new file: `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_META_SETUP.md` (sibling to the track guides — it's a one-time-use operational doc that fits the chronological-archive convention).

---

## 6. Shippo Email Response Draft

LOW priority per your prep doc, but easy to deliver in this session. Deliverable: a polished response email saved at `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_SHIPPO_REPLY.md` (or simply pasted into chat for you to copy — your call).

Content covers each item Shippo asked for:
- Business description + URL (everlastings.com or current domain)
- Use case: own platform, custom integration via Shippo API for label generation + tracking
- Item types (handcrafted miniature collectibles), customer profile, primary regions (US-first)
- Articles of Incorporation reference (you'll attach Emy's LLC docs if available)

I'll draft the language; you review/edit/send.

---

## 7. Final Confirmation Pass

After all the above is complete, I'll produce a **Readiness Checklist** (in chat, not a file) covering:

- [ ] Phase 0 fully reconciled with annotations
- [ ] `EVERLASTINGS_STORE.md` updated with architectural additions
- [ ] Three track guides created and self-sufficient
- [ ] Init prompts ready
- [ ] Meta setup guide produced (tokens may still need user action)
- [ ] Shippo response drafted
- [ ] Original `v1_4_3_IMPLEMENT.md` updated to its archive role
- [ ] Branch `dev` clean, no pending merges to `main`
- [ ] Outstanding deferred items listed (with owner: you, Emy, or external service)

If anything is not green, I'll flag it explicitly with what's blocking and what the next move is.

---

## Verification (How to Test This Plan's Output End-to-End)

After execution:

1. **Self-sufficiency check:** Read each track guide cold (no other context). For Track A, can you answer "what schema does the products table use?" without leaving the file? For Track B, can you find the error state for "404 product not found"? For Track C, can you find the GA4 `purchase` event field mapping? Yes/yes/yes = pass.

2. **Context-load simulation:** Estimate token count of (track guide + EVERLASTINGS_STORE.md + DEV_RULES.md + AGENTS.md + BRAND.md if relevant). Target: each track session loads under ~25k tokens of pre-context, leaving plenty of room for orchestrator's working context. (Original guide alone was ~40k.)

3. **Cross-reference check:** Grep each track guide for references to other tracks. They should appear only in the "Other tracks at a glance" preamble section. If Track C body references "see Track A line 1537" — that's a smell; should be inlined.

4. **No-decision-left-behind check:** Read each track guide looking for hedges like "decide later," "TBD," "depends on." There should be zero. The original guide is detailed precisely because you wanted no decisions during implementation — preserve that.

5. **Phase 0 verification:** Run the bash checks listed in Section 1 to confirm checked items reflect reality.

6. **Init prompt dry-run:** Read each init prompt as if you were the orchestrator. Is your first action obvious? Do you know what you can/can't read? Is the verification gate clear?

---

## Critical Files Touched

**Read:**
- `assets/docs/archive/v1_4/v1_4_3_IMPLEMENT.md` (source for split)
- `assets/docs/archive/v1_4/v1_4_3_PREP.md` (your prep doc)
- `assets/docs/EVERLASTINGS_STORE.md` (architecture primer to reconcile)
- `assets/docs/BRAND.md` (cross-cutting brand reference)
- `.agent/DEV_RULES.md` (workflow protocol)
- `.agent/AGENTS.md` (agent instructions)

**Modified:**
- `assets/docs/archive/v1_4/v1_4_3_IMPLEMENT.md` (condensed to Phase 0 + split notice)
- `assets/docs/EVERLASTINGS_STORE.md` (architectural additions only)

**Created:**
- `assets/docs/archive/v1_4/v1_4_3_A_IMPLEMENT.md`
- `assets/docs/archive/v1_4/v1_4_3_B_IMPLEMENT.md`
- `assets/docs/archive/v1_4/v1_4_3_C_IMPLEMENT.md`
- `assets/docs/archive/v1_4/v1_4_3_INIT_PROMPTS.md`
- `assets/docs/archive/v1_4/v1_4_3_META_SETUP.md`
- `assets/docs/archive/v1_4/v1_4_3_SHIPPO_REPLY.md` (or delivered in-chat)

---

## Risks / Open Considerations

1. **Schema reference duplication.** `EVERLASTINGS_STORE.md` already has a Supabase Schema section (lines 718–847). The Product Schema Hard Reference (lines 605–840 of IMPLEMENT.md) is more detailed (TypeScript interface + full SQL). Inline the detailed version into Track A; keep the summary in EVERLASTINGS_STORE.md. They will diverge over time — call this out in `EVERLASTINGS_STORE.md` with a "for the executable schema definition see Track A guide" pointer.

2. **Architecture Reference (33 ARs) reconciliation.** May overlap with EVERLASTINGS_STORE.md's existing Architecture Overview section. Will need careful merge. If in doubt, prefer the IMPLEMENT.md version (more recent and more thorough) and update EVERLASTINGS_STORE.md to match.

3. **Phase 0 verification might surface gaps.** If a "likely done" item turns out incomplete, we'll need to either complete it now or explicitly defer it with a blocking flag on whichever track depends on it.

4. **Meta research subagent quality.** Meta's docs are notoriously scattered and the UI does change. The subagent may produce something with stale screenshots or paths. Plan: read the output critically before saving as the canonical guide. If it's weak, run a second cross-check subagent.

5. **Original IMPLEMENT.md size after condensation.** May end up ~80–120 lines (Phase 0 + pointers). That's fine for the archive convention you described — short doesn't mean wrong.
