# v1.5.x — Gap-review prompts (fresh instances)

> ⚠️ **SUPERSEDED by `v1_5_2_REVIEW_PROMPTS.md`** — the five landmines are now **inlined** into each
> prompt block (they shipped as an empty `[paste …]` placeholder here), plus archive + strict-isolation
> landmines. Use that file for the A re-run.

All three angles review the **single living plan** `assets/docs/archive/v1_5/v1_5_2_IMPLEMENT.md`.
Adapted from `.agent/DEV_RULES.md` §The Gap-Review Gate. **Effort: maximum. A new instance per
pass** (no context contamination). Reviewers change **nothing** — output is findings only.

## Sequencing (per Sean's gap-review flow)

1. **A first** (cold / out-of-repo — the holistic gate). Fold findings → bump the doc
   (`v1_5_2_IMPLEMENT.md`…) → **re-run A** until a fresh A pass finds nothing load-bearing.
   Big-picture functionality gaps must surface here, before the detailed reviews.
2. **B + C** (in repo) — run consecutively, fold both at once, re-run if either finds something
   load-bearing.
3. All three clean → **Sean approves** → a fresh agent executes on the dev preview.

## What to hand each reviewer

- **A:** `v1_5_1_IMPLEMENT.md` **+ `assets/docs/EVERLASTINGS_STORE.md`** — and **no repo**. (The
  architecture doc is exactly what was missing last time; it's what lets a cold reviewer judge
  *functionality completeness*, not just self-containment. Paste both into a non-Claude tool or a
  no-filesystem session.)
- **B / C:** the repo + `v1_5_1_IMPLEMENT.md`; **C** also reads `EVERLASTINGS_STORE.md` first.

## Landmines — give to EVERY reviewer (validate against reality, not training data)

- The Postgres **INSERT trigger** (`supabase/migrations/20260421000003_*`) auto-creates Stripe
  objects on product insert → drafts must skip it (Phase 1); Stripe is created **only at publish**.
- Public reads go via the **anon client + RLS**, not the API → hiding drafts is the RLS change
  (Phase 1); **preview reads must go through the service-role API** (Phase 3.2 / Phase 7), not the
  anon client.
- **Stripe-lock:** `price` + `checkout_*` are frozen after publish; a price change is a **new
  product**, never an edit.
- **No new functions** — publish/coupon are `?_action=` rewrites; the Vercel Hobby cap is **11/12**.
- **`is_test`** is never user-editable; every new read/write stays scoped to `isTest`.

---

## Angle A — cold / out-of-repo (self-containment + completeness)  — RUN FIRST

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT change anything —
your only output is findings (write them to v1_5_1_GAP_REVIEW_A.md, or print the full file contents
if you have no filesystem).

CONTEXT
- You are given TWO documents and NO repository: (1) v1_5_1_IMPLEMENT.md — a single living plan a
  FRESH agent will execute against the repo, then test on the dev preview; it is meant to be
  "exclusively executable" (it embeds the exact current code and exact replacement for every edit, so
  the builder only LOCATES and APPLIES — never DISCOVERS or DECIDES). (2) EVERLASTINGS_STORE.md — the
  store's architecture/state doc, so you can judge whether the plan covers everything the store needs.
- Landmines to respect (validate the plan against these, not your training data):
  [paste the five Landmines above]

ANGLE A — cold / out-of-repo. Your lack of a repo is the point. Two jobs:
1. SELF-CONTAINMENT: find every place the builder would have to open a file, guess, recall a
   library's behaviour, or make a decision the plan didn't make for it.
2. COMPLETENESS / ARCHITECTURE (the holistic pass): using EVERLASTINGS_STORE.md, judge whether the
   plan lets the owner FULLY run the store by chat. Cross-check the "Custom GPT capability outline"
   (§1.10) against everything a non-technical owner needs end-to-end (create, find, edit, preview,
   publish, price changes, sales/coupons, photos, orders, status visibility). Also stress the system
   design: the preview-token capability model, the draft→publish state machine (create vs edit;
   partial-publish / failure recovery), the Stripe-lock invariant, is_test integrity across the new
   columns/actions, the 11/12 function cap, and whether the GPT knowledge makes it genuinely helpful
   vs. clunky-enough-that-DIY-wins.

OUTPUT
- A gap list RANKED by how likely each is to derail the build or leave a capability missing:
  location (section/phase), what's wrong or missing, the concrete fix.
- The single most important "if you fix one thing" insight.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
Be concrete: "§1.10 lists listProducts but no way for the GPT to deactivate a coupon she made"
beats "coupons look incomplete."
```

## Angle B — fidelity (repo)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT change code or docs —
output findings only (write them to v1_5_1_GAP_REVIEW_B.md).

CONTEXT
- v1_5_1_IMPLEMENT.md (Part 2) is an exclusively-executable build a FRESH agent will apply to THIS
  repo, then test on the dev preview. Every edit quotes a CURRENT block (locator) + a NEW block.
- Landmines: [paste the five Landmines above]

ANGLE B — fidelity. Open every file the plan edits and verify:
- Every CURRENT block matches the working tree BYTE-FOR-BYTE (whitespace, line content). Line numbers
  are hints; the quoted text is the anchor — flag any CURRENT block that no longer matches.
- Every NEW block applies cleanly at that anchor (no overlapping/ambiguous matches; imports resolve;
  the migration is valid SQL; the OpenAPI YAML is well-formed; vercel.json stays valid JSON).
- The tsc-clean + 11/12-function claims hold (no new api/*.ts file; removed imports aren't still
  referenced; added imports exist).

OUTPUT
- Ranked list: location, the mismatch, the corrected anchor/fix.
- The single most important fix.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
```

## Angle C — integration (repo + architecture)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT change code or docs —
output findings only (write them to v1_5_1_GAP_REVIEW_C.md).

CONTEXT
- Read EVERLASTINGS_STORE.md FIRST, then v1_5_1_IMPLEMENT.md. A FRESH agent will apply Part 2 to this
  repo and test on the dev preview.
- Landmines: [paste the five Landmines above]

ANGLE C — integration / system fit. Hunt for gaps where an edit is locally correct but breaks the
wider system:
- is_test scoping holds across every new read/write/action (preview, publish, coupon, list).
- Idempotency / state machine: re-publishing, publishing a draft with no changes, a stale/rotated
  preview_token, an edit staged then re-edited, deleting a draft.
- The RLS change vs. every reader (anon client, product-feed, homepage, checkout, admin, GPT) — does
  anything that should see drafts now can't, or vice-versa?
- Resource caps (11/12 functions), conventions (cleanUrls rewrites must drop .html; CORS per-route),
  AR conflicts, and stale pointers (docs that still say "GPT can't edit" / "create auto-syncs
  Stripe" after Phase 9).

OUTPUT
- Ranked list: location, the integration risk, the concrete fix.
- The single most important fix.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
```
