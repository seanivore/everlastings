# v1.5.x — Gap-review prompts (fresh instances)

All three angles review the **single living plan** `assets/docs/archive/v1_5/v1_5_3_IMPLEMENT.md`.
Adapted from `.agent/DEV_RULES.md` §The Gap-Review Gate. **Effort: maximum. A new instance per
pass** (no context contamination). Reviewers change **nothing** — output is findings only.

> **A has run twice.** Pass 1 (`v1_5_1_GAP_REVIEW_A.md`, 22 findings) → folded into v1.5.2; pass 2
> (`v1_5_2_GAP_REVIEW_A.md`, 16 findings incl. one real blocker) → folded into `v1_5_3_IMPLEMENT.md`.
> This is the **re-run of A against v1.5.3**. Landmines 7–8 below are the pass-2 fixes — confirm they
> hold; don't re-raise the originals.

## Sequencing (per Sean's gap-review flow)

1. **A first** (cold / out-of-repo — the holistic gate). Fold findings → bump the doc
   (`v1_5_4_IMPLEMENT.md`…) → **re-run A** until a fresh A pass finds nothing load-bearing.
   Big-picture functionality gaps must surface here, before the detailed reviews.
2. **B + C** (in repo) — run consecutively, fold both at once, re-run if either finds something
   load-bearing.
3. All three clean → **Sean approves** → a fresh agent executes on the dev preview.

## What to hand each reviewer

- **A:** `v1_5_3_IMPLEMENT.md` **+ `assets/docs/EVERLASTINGS_STORE.md`** — and **no repo**. (The
  architecture doc is what lets a cold reviewer judge *functionality completeness*, not just
  self-containment. Paste both into a non-Claude tool or a no-filesystem session.) The landmines are
  **inlined in each prompt block below** — no separate paste needed.
- **B / C:** the repo + `v1_5_3_IMPLEMENT.md`; **C** also reads `EVERLASTINGS_STORE.md` first.

## Landmines — given to EVERY reviewer (validate against reality, not training data)

These are inlined verbatim into each prompt block below. Items 7–8 are the 2nd-Gap-A fixes — confirm
they hold rather than re-flagging the originals.

- **(Validate the fix, G1)** the published-edit **frozen-field guard rejects only a CHANGED frozen
  value, not mere presence** — the admin always re-sends `price` + `checkout_*`, so a presence-only
  check would 400 every admin edit of a published product; the admin-published-edit path must be tested.
- **(Validate the fix, G2)** the RLS swap is name-keyed and carries a **self-checking guard** — the
  migration RAISEs if any `products` SELECT policy still has `qual = 'true'` (Postgres ORs permissive
  policies, so a missed DROP would silently leave `USING(true)` alive → everything public).
- The Postgres **INSERT trigger** `notify_stripe_sync` (`supabase/migrations/20260421000003_*`)
  auto-creates Stripe objects — it is a **SQL trigger, not a Supabase Studio webhook**; drafts must skip
  it (Phase 1) and Stripe is created **only at publish**.
- Public reads go via the **anon client + RLS**, not the API → hiding drafts/archived is the RLS change
  (Phase 1); **`is_test` is filtered in `main.js`** (Phase 4.5), *not* by RLS; **preview reads go
  through the service-role API** (Phase 3.2 / Phase 7), never the anon client.
- **Stripe-lock:** `price` + `checkout_*` are frozen after publish (a price change is a **new
  product**); a draft's price **is** editable until first publish.
- **Archive, never hard-delete:** "remove" = `archived_at` + Stripe `active:false` (reversible);
  archived rows are hidden everywhere public; order history is FK-protected (no `ON DELETE CASCADE`).
- **No new functions** — publish / coupon / archive are `?_action=` rewrites; the purge is `pg_cron`;
  the Vercel Hobby cap is **11/12**.
- **`is_test`** is never user-editable; every new read/write stays scoped to `isTest`.

---

## Angle A — cold / out-of-repo (self-containment + completeness)  — RUN FIRST

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT change anything —
your only output is findings (write them to v1_5_3_GAP_REVIEW_A.md, or print the full file contents
if you have no filesystem).

CONTEXT
- You are given TWO documents and NO repository: (1) v1_5_3_IMPLEMENT.md — a single living plan a
  FRESH agent will execute against the repo, then test on the dev preview; it is meant to be
  "exclusively executable" (it embeds the exact current code and exact replacement for every edit, so
  the builder only LOCATES and APPLIES — never DISCOVERS or DECIDES). (2) EVERLASTINGS_STORE.md — the
  store's architecture/state doc, so you can judge whether the plan covers everything the store needs.
- This is the THIRD A-pass; the plan has absorbed two prior ones. Landmines 7-8 are the most recent
  fixes — confirm they hold rather than re-raising the originals.
- Landmines to respect (validate the plan against these, not your training data):
  1. The Postgres INSERT trigger notify_stripe_sync (migration 20260421000003) auto-creates Stripe
     objects — it is a SQL TRIGGER, not a Supabase Studio webhook; drafts must skip it and Stripe is
     created ONLY at publish.
  2. Public reads go via the anon Supabase client + RLS, not the API. Hiding drafts/archived is the RLS
     change; is_test is filtered in main.js (Phase 4.5), NOT by RLS; preview reads go through the
     service-role API, never the anon client.
  3. Stripe-lock: price + checkout_* are frozen after publish (a price change is a NEW product); a
     draft's price IS editable until first publish.
  4. Archive, never hard-delete: "remove" sets archived_at + Stripe active:false (reversible); archived
     rows are hidden everywhere public; order history is FK-protected.
  5. No new functions: publish/coupon/archive are ?_action= rewrites; the purge is pg_cron; the Vercel
     Hobby cap is 11/12.
  6. is_test is never user-editable; every new read/write stays scoped to isTest.
  7. (2nd-Gap-A fix to validate) The published-edit frozen-field guard must reject only a CHANGED frozen
     value, NOT mere presence — the admin always re-sends price + checkout_*, so a presence check would
     400 every admin edit of a published product. Confirm the admin-published-edit path is tested.
  8. (2nd-Gap-A fix to validate) The RLS swap is name-keyed and carries a self-checking guard that
     RAISEs if any products SELECT policy still has qual='true' (Postgres ORs permissive policies, so a
     missed DROP would silently leave USING(true) alive → everything public).

ANGLE A — cold / out-of-repo. Your lack of a repo is the point. Two jobs:
1. SELF-CONTAINMENT: find every place the builder would have to open a file, guess, recall a
   library's behaviour, or make a decision the plan didn't make for it.
2. COMPLETENESS / ARCHITECTURE (the holistic pass): using EVERLASTINGS_STORE.md, judge whether the
   plan lets the owner FULLY run the store by chat. Cross-check the "Custom GPT capability outline"
   (§1.10) against everything a non-technical owner needs end-to-end (create, find, edit, preview,
   publish, price changes, sales/coupons, archive/resurface, photos/media, orders, status
   visibility). Also stress the system design: the preview-token capability model, the draft→publish
   state machine (create vs edit; partial-publish / failure recovery), the Stripe-lock invariant, the
   archive model (archived_at + Stripe mirror; hidden everywhere public; resurface), is_test integrity
   across the new columns/actions AND the public main.js path (1.11), the 11/12 function cap, and
   whether the GPT knowledge makes it genuinely helpful vs. clunky-enough-that-DIY-wins.

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
output findings only (write them to v1_5_3_GAP_REVIEW_B.md).

CONTEXT
- v1_5_3_IMPLEMENT.md (Part 2) is an exclusively-executable build a FRESH agent will apply to THIS
  repo, then test on the dev preview. Every CODE edit quotes a CURRENT block (locator) + a NEW block;
  the doc-edit phases (9 / 10 / 10b) are line-hinted prose, NOT byte-anchored (the plan says so) — so
  treat a CURRENT line-ref there as a locator to confirm, not a hard byte match.
- Landmines (validate against the repo, not training data):
  1. The INSERT trigger notify_stripe_sync (migration 20260421000003) is a SQL TRIGGER (not a Studio
     webhook); confirm the plan's quoted CURRENT trigger matches the file and the only change is the
     added guard line.
  2. Public reads go via the anon client + RLS; is_test is filtered in main.js (Phase 4.5), not RLS;
     preview reads go through the service-role API.
  3. Stripe-lock: price + checkout_* frozen after publish; a draft's price is editable until publish.
  4. Archive = archived_at + Stripe active:false (reversible); no hard delete; order FK has no
     ON DELETE CASCADE.
  5. No new api/*.ts files: publish/coupon/archive are ?_action= rewrites; purge is pg_cron; cap 11/12.
  6. is_test is never user-editable.
  7. (G1) Phase 3.4's frozen-field guard must compare updates[f] !== current[f] (CHANGE), not just
     hasOwnProperty (presence) — confirm the quoted NEW block does the value-compare.
  8. (G2) Phase 1's migration must contain the DO-block that RAISEs on a leftover qual='true' products
     SELECT policy — confirm it's valid PL/pgSQL and queries pg_policies correctly.

ANGLE B — fidelity. Open every file the plan edits and verify:
- Every CURRENT block matches the working tree BYTE-FOR-BYTE (whitespace, line content). Line numbers
  are hints; the quoted text is the anchor — flag any CURRENT block that no longer matches. (The
  product.html media block, the products.ts import cluster (1-5), and the vercel.json rewrites array
  are now quoted in full — confirm each.)
- Every NEW block applies cleanly at that anchor (no overlapping/ambiguous matches; imports resolve;
  the migration is valid SQL incl. the DO-block guard; the OpenAPI YAML is well-formed; vercel.json
  stays valid JSON).
- The tsc-clean + 11/12-function claims hold (no new api/*.ts file; removed imports aren't still
  referenced; added imports — randomUUID, the Stripe type, isTest in config — exist/resolve; and the
  `import type Stripe from 'stripe'` does NOT collide with the lowercase `stripe` instance imported
  from ./_lib/stripe).

OUTPUT
- Ranked list: location, the mismatch, the corrected anchor/fix.
- The single most important fix.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
```

## Angle C — integration (repo + architecture)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT change code or docs —
output findings only (write them to v1_5_3_GAP_REVIEW_C.md).

CONTEXT
- Read EVERLASTINGS_STORE.md FIRST, then v1_5_3_IMPLEMENT.md. A FRESH agent will apply Part 2 to this
  repo and test on the dev preview.
- Landmines (validate against reality, not training data):
  1. INSERT trigger notify_stripe_sync (migration 20260421000003) is a SQL TRIGGER, not a Studio
     webhook; drafts skip it; Stripe created only at publish.
  2. Public reads go via the anon client + RLS; is_test is filtered in main.js (Phase 4.5), not RLS;
     preview reads go through the service-role API.
  3. Stripe-lock: price + checkout_* frozen after publish; a draft's price is editable until publish.
  4. Archive = archived_at + Stripe active:false (reversible); hidden everywhere public; order history
     FK-protected.
  5. No new functions: publish/coupon/archive are ?_action= rewrites; purge is pg_cron; cap 11/12.
  6. is_test is never user-editable.
  7. (G1) The published-edit guard rejects only CHANGED frozen fields — so the admin (which re-sends the
     full payload incl. unchanged price + checkout_*) can edit a published product's copy without a 400.
  8. (G4/G5, already-handled — don't re-flag) product-feed.ts already filters .eq('is_test', false);
     shop.js / homepage.js / product.js + renderRelatedProducts all route through main.js
     getProducts/getProductBySlug — confirm no OTHER public read bypasses the is_test filter.

ANGLE C — integration / system fit. Hunt for gaps where an edit is locally correct but breaks the
wider system:
- is_test scoping holds across every new read/write/action (preview, publish, coupon, archive, list)
  AND the public main.js path now filters is_test (1.11) — confirm prod shows only live, non-test,
  non-archived rows and the dev preview still renders a published test product; confirm the Meta
  product-feed (already .eq('is_test', false)) never emits a test row.
- The admin path specifically (G1): admin create AND edit of a PUBLISHED product go through the same
  draft→publish gate and must NOT 400 on unchanged frozen fields (the admin re-sends the full payload).
- Idempotency / state machine: re-publishing, publishing a draft with no changes, a stale/rotated
  preview_token, an edit staged then re-edited, archiving then unarchiving (Stripe active round-trip).
- The RLS change vs. every reader (anon client, product-feed, homepage, checkout, admin, GPT) — does
  anything that should see drafts/archived now can't, or vice-versa?
- Coupon isolation: listCoupons/deactivateCoupon must touch only owner_sale-tagged codes, never the
  system cart-recovery/newsletter promotion codes (api/cart.ts, api/subscribe.ts).
- Resource caps (11/12 functions), conventions (cleanUrls rewrites must drop .html; CORS per-route),
  AR conflicts, and stale pointers (docs that still say "GPT can't edit" / "create auto-syncs Stripe"
  / "adding a product makes it live immediately" after Phases 9–10b).

OUTPUT
- Ranked list: location, the integration risk, the concrete fix.
- The single most important fix.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
```
