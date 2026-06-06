> ⚠️ **SUPERSEDED by `v1_5_5_REVIEW_PROMPTS.md`** (adds the Product North Star review lens + the 4th-A
> fold landmines; output targets `v1_5_5_GAP_REVIEW_*`). Kept for history; **use the v1.5.5 prompts.**

# v1.5.x — Gap-review prompts (fresh instances)

All three angles review the **single living plan** `assets/docs/archive/v1_5/v1_5_4_IMPLEMENT.md`.
Adapted from `.agent/DEV_RULES.md` §The Gap-Review Gate. **Effort: maximum. A new instance per
pass** (no context contamination). Reviewers change **nothing** — output is findings only.

> **A has run three times.** Pass 1 (`v1_5_1_GAP_REVIEW_A.md`, 22 findings) → folded into v1.5.2;
> pass 2 (`v1_5_2_GAP_REVIEW_A.md`, 16 findings incl. one real blocker, G1) → folded into v1.5.3;
> pass 3 (`v1_5_3_GAP_REVIEW_A.md`, 10 findings, **no code-breaking logic bug** — three "blockers" were
> true-in-repo-but-unquoted; plus one missing capability and one owner decision) → folded into
> `v1_5_4_IMPLEMENT.md`. This is the **re-run of A against v1.5.4.** Landmines 7–12 below are the
> recent fixes/changes — confirm they hold; don't re-raise the originals.

> **Before this A-pass:** a fast in-house **subagent breadth pass** (owner-journey completeness +
> integration/state-machine) runs against `v1_5_4_IMPLEMENT.md` to clear the obvious; cold A then does
> the thorough self-containment/completeness gate. (Subagents are pre-gate breadth — never the gate
> itself; per DEV_RULES.)

## Sequencing (per Sean's gap-review flow)

1. **A first** (cold / out-of-repo — the holistic gate). Fold findings → bump the doc
   (`v1_5_5_IMPLEMENT.md`…) → **re-run A** until a fresh A pass finds nothing load-bearing.
   Big-picture functionality gaps must surface here, before the detailed reviews.
2. **B + C** (in repo) — run consecutively, fold both at once, re-run if either finds something
   load-bearing.
3. All three clean → **Sean approves** → a fresh agent executes on the dev preview.

## What to hand each reviewer

- **A:** `v1_5_4_IMPLEMENT.md` **+ `assets/docs/EVERLASTINGS_STORE.md`** — and **no repo**. (The
  architecture doc is what lets a cold reviewer judge *functionality completeness*, not just
  self-containment. Paste both into a non-Claude tool or a no-filesystem session.) The landmines are
  **inlined in each prompt block below** — no separate paste needed.
- **B / C:** the repo + `v1_5_4_IMPLEMENT.md`; **C** also reads `EVERLASTINGS_STORE.md` first.

## Landmines — given to EVERY reviewer (validate against reality, not training data)

These are inlined verbatim into each prompt block below. Items 7–12 are the most recent fixes/changes —
confirm they hold rather than re-flagging.

- The Postgres **INSERT trigger** `notify_stripe_sync` (`supabase/migrations/20260421000003_*`)
  auto-creates Stripe objects — it is a **SQL trigger, not a Supabase Studio webhook**; drafts must skip
  it (Phase 1) and Stripe is created **only at publish**.
- Public reads go via the **anon client + RLS**, not the API → hiding drafts/archived is the RLS change
  (Phase 1); **`is_test` is filtered in `main.js`** (Phase 4.5), *not* by RLS; **preview reads go
  through the service-role API** (Phase 3.2 / Phase 7), never the anon client. Client identities are now
  anchored in the pre-flight: `products.ts` + `checkout.ts` = service-role (`SUPABASE_SECRET_KEY`),
  `product-feed.ts` = anon (`SUPABASE_PUBLISHABLE_KEY`), admin reads/archives via the service-role API
  (not its `state.client`).
- **Stripe-lock (Q1 — CHANGED this pass):** the checkout *identity* fields
  (`checkout_name`/`checkout_description`/`checkout_image`) + `sku` are frozen after publish; **`price`
  is NOT frozen — it ROTATES in place** (a published price change deactivates the old Stripe Price,
  creates a new one on the *same* product, updates `stripe_price_id`, and goes live immediately — same
  slug/URL; **not** a new product). A draft's `price`/`checkout_*` are freely editable until first
  publish. (The old "price change = new product" model is retired.)
- **Archive, never hard-delete:** "remove" = `archived_at` + Stripe `active:false` (reversible);
  archived rows are hidden everywhere public; order history is FK-protected (no `ON DELETE CASCADE`).
- **No new functions** — publish / coupon / archive / **discard** are `?_action=` rewrites; the purge is
  `pg_cron`; the Vercel Hobby cap is **11/12**.
- **`is_test`** is never user-editable; every new read/write stays scoped to `isTest`.
- **(Prior fix, confirm it holds — G1)** the published-edit **frozen-field guard rejects only a CHANGED
  frozen value, not mere presence** — the admin always re-sends `checkout_*` (and `price`), so a
  presence-only check would 400 every admin edit; `price` is now excluded from the guard entirely (it
  rotates). The admin-published-edit path must be tested.
- **(Prior fix, confirm it holds — G2)** the RLS swap is name-keyed and carries a **self-checking guard**
  — the migration RAISEs if any `products` SELECT policy still has `qual = 'true'`.
- **(Q2 — new) Discard exists:** `?_action=discard` clears `draft` + `preview_token` on a published row
  (the inverse of publish); GPT `discardEdits`, admin "Discard pending edits" button. A staged draft can
  be **published or discarded**.
- **(#5 — new) Create is allow-listed:** the create insert is built from an explicit field allow-list
  (mirrors the PUT `pick`), so the v1.5 system columns (`draft`, `archived_at`, `published_at`,
  `stripe_*`, `is_published`, `preview_token`) can't be injected at create.
- **(#10 — new) `getProduct` returns an origin-correct `preview_url`** when the row has a
  `preview_token`; the GPT relays that link rather than hard-coding a host.
- **(#6 — new) `listCoupons` auto-paginates** (`for await` over `promotionCodes.list`, bounded by a scan
  cap) so the owner's real sales aren't truncated once >100 active system codes exist; the `owner_sale`
  filter still excludes cart-recovery/newsletter codes.

---

## Angle A — cold / out-of-repo (self-containment + completeness)  — RUN FIRST

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT change anything —
your only output is findings (write them to v1_5_4_GAP_REVIEW_A.md, or print the full file contents
if you have no filesystem).

CONTEXT
- You are given TWO documents and NO repository: (1) v1_5_4_IMPLEMENT.md — a single living plan a
  FRESH agent will execute against the repo, then test on the dev preview; it is meant to be
  "exclusively executable" (it embeds the exact current code and exact replacement for every edit, so
  the builder only LOCATES and APPLIES — never DISCOVERS or DECIDES). (2) EVERLASTINGS_STORE.md — the
  store's architecture/state doc, so you can judge whether the plan covers everything the store needs.
- This is the FOURTH A-pass; the plan has absorbed three prior ones. Landmines 7-12 are the most recent
  fixes/changes — confirm they hold rather than re-raising the originals.
- Landmines to respect (validate the plan against these, not your training data):
  1. The Postgres INSERT trigger notify_stripe_sync (migration 20260421000003) auto-creates Stripe
     objects — it is a SQL TRIGGER, not a Supabase Studio webhook; drafts must skip it and Stripe is
     created ONLY at publish.
  2. Public reads go via the anon Supabase client + RLS, not the API. Hiding drafts/archived is the RLS
     change; is_test is filtered in main.js (Phase 4.5), NOT by RLS; preview reads go through the
     service-role API, never the anon client.
  3. Stripe-lock (CHANGED): checkout_* identity + sku are frozen after publish; PRICE is NOT frozen —
     it ROTATES in place (deactivate old Stripe Price, create a new one on the SAME product, update
     stripe_price_id, live immediately; same slug/URL; not a new product). A draft's price/checkout_*
     are editable until first publish.
  4. Archive, never hard-delete: "remove" sets archived_at + Stripe active:false (reversible); archived
     rows are hidden everywhere public; order history is FK-protected.
  5. No new functions: publish/coupon/archive/discard are ?_action= rewrites; the purge is pg_cron; the
     Vercel Hobby cap is 11/12.
  6. is_test is never user-editable; every new read/write stays scoped to isTest.
  7. (fix to validate) The published-edit frozen-field guard rejects only a CHANGED frozen value, NOT
     mere presence; price is excluded entirely (it rotates). The admin-published-edit path is tested.
  8. (fix to validate) The RLS swap is name-keyed and carries a self-checking guard that RAISEs if any
     products SELECT policy still has qual='true'.
  9. (new) Discard exists: ?_action=discard clears draft + preview_token on a published row (inverse of
     publish); GPT discardEdits + admin button.
  10. (new) Create is allow-listed (system columns can't be injected at create).
  11. (new) getProduct returns an origin-correct preview_url when a preview_token exists; the GPT relays
     it rather than hardcoding a host.
  12. (new) listCoupons auto-paginates so owner sales aren't truncated by a single 100-page.

ANGLE A — cold / out-of-repo. Your lack of a repo is the point. Two jobs:
1. SELF-CONTAINMENT: find every place the builder would have to open a file, guess, recall a
   library's behaviour, or make a decision the plan didn't make for it.
2. COMPLETENESS / ARCHITECTURE (the holistic pass): using EVERLASTINGS_STORE.md, judge whether the
   plan lets the owner FULLY run the store by chat. Cross-check the "Custom GPT capability outline"
   (§1.10) against everything a non-technical owner needs end-to-end (create, find, edit, preview,
   publish, re-price [now in-place rotation], discard staged edits, sales/coupons, archive/resurface,
   photos/media, orders, status visibility). Also stress the system design: the preview-token capability
   model, the draft→publish state machine (create vs edit; publish vs discard; partial-publish / failure
   recovery), the price-rotation invariant (Stripe Price round-trip; checkout uses the new price), the
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
output findings only (write them to v1_5_4_GAP_REVIEW_B.md).

CONTEXT
- v1_5_4_IMPLEMENT.md (Part 2) is an exclusively-executable build a FRESH agent will apply to THIS
  repo, then test on the dev preview. Every CODE edit quotes a CURRENT block (locator) + a NEW block;
  the doc-edit phases (9 / 10 / 10b) are line-hinted prose, NOT byte-anchored (the plan says so) — so
  treat a CURRENT line-ref there as a locator to confirm, not a hard byte match.
- Landmines (validate against the repo, not training data):
  1. The INSERT trigger notify_stripe_sync (migration 20260421000003) is a SQL TRIGGER (not a Studio
     webhook); confirm the plan's quoted CURRENT trigger matches the file and the only change is the
     added guard line.
  2. Public reads go via the anon client + RLS; is_test is filtered in main.js (Phase 4.5), not RLS;
     preview reads go through the service-role API. Confirm the pre-flight's quoted client identities:
     products.ts/checkout.ts = SUPABASE_SECRET_KEY (6-8 / 10-12); product-feed.ts = SUPABASE_PUBLISHABLE_KEY
     (4-6); admin loadProducts (218-222) + onArchiveToggle read via fetch('/api/products…'), not state.client.
  3. Stripe-lock (CHANGED): checkout_* + sku frozen after publish; price ROTATES in place. Confirm
     Phase 3.4's published branch removes price from FROZEN_AFTER_PUBLISH and runs the Stripe rotation
     (deactivate old price, create new on same product, update stripe_price_id) applied to live columns.
  4. Archive = archived_at + Stripe active:false (reversible); no hard delete; order FK has no
     ON DELETE CASCADE.
  5. No new api/*.ts files: publish/coupon/archive/discard are ?_action= rewrites; purge is pg_cron;
     cap 11/12. Confirm the new /api/products/discard rewrite + the action dispatch line.
  6. is_test is never user-editable.
  7. (G1) Phase 3.4's frozen-field guard compares updates[f] !== current[f] (CHANGE), not just
     hasOwnProperty (presence); price is no longer in the frozen list — confirm.
  8. (G2) Phase 1's migration contains the DO-block that RAISEs on a leftover qual='true' products
     SELECT policy — confirm it's valid PL/pgSQL and queries pg_policies correctly.

ANGLE B — fidelity. Open every file the plan edits and verify:
- Every CURRENT block matches the working tree BYTE-FOR-BYTE (whitespace, line content). Line numbers
  are hints; the quoted text is the anchor — flag any CURRENT block that no longer matches. (The
  product.html media block, the products.ts import cluster (1-5), the vercel.json rewrites array, the
  admin price helpers (dollarsToCents/centsToDollars), the product-feed query (19-22), and the create
  insert / PUT current blocks are quoted — confirm each.)
- Every NEW block applies cleanly at that anchor (no overlapping/ambiguous matches; imports resolve;
  the migration is valid SQL incl. the DO-block guard; the OpenAPI YAML is well-formed incl. the new
  discardEdits path; vercel.json stays valid JSON). Confirm the new handleDiscard + the price-rotation
  branch are syntactically sound and reference only existing helpers (stripe, pick, previewUrl, isTest).
- The tsc-clean + 11/12-function claims hold (no new api/*.ts file; removed imports aren't still
  referenced; added imports — randomUUID, the Stripe type, isTest in config — exist/resolve; the
  `import type Stripe from 'stripe'` does NOT collide with the lowercase `stripe` instance from
  ./_lib/stripe; and stripe.prices.* is now USED again by the PUT rotation, so it is not an unused import).
- The create allow-list (CREATE_FIELDS) references DRAFTABLE at request time (no module-load TDZ), and
  the for-await coupon pagination is valid against the Stripe SDK.

OUTPUT
- Ranked list: location, the mismatch, the corrected anchor/fix.
- The single most important fix.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
```

## Angle C — integration (repo + architecture)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT change code or docs —
output findings only (write them to v1_5_4_GAP_REVIEW_C.md).

CONTEXT
- Read EVERLASTINGS_STORE.md FIRST, then v1_5_4_IMPLEMENT.md. A FRESH agent will apply Part 2 to this
  repo and test on the dev preview.
- Landmines (validate against reality, not training data):
  1. INSERT trigger notify_stripe_sync (migration 20260421000003) is a SQL TRIGGER, not a Studio
     webhook; drafts skip it; Stripe created only at publish.
  2. Public reads go via the anon client + RLS; is_test is filtered in main.js (Phase 4.5), not RLS;
     preview reads go through the service-role API. (products.ts/checkout.ts = service-role;
     product-feed.ts = anon, now also explicitly filtering is_published/archived_at; admin via the API.)
  3. Stripe-lock (CHANGED): checkout_* + sku frozen after publish; PRICE rotates in place (new Stripe
     Price on the same product; live immediately; same slug/URL).
  4. Archive = archived_at + Stripe active:false (reversible); hidden everywhere public; order history
     FK-protected.
  5. No new functions: publish/coupon/archive/discard are ?_action= rewrites; purge is pg_cron; cap 11/12.
  6. is_test is never user-editable.
  7. (G1) The published-edit guard rejects only CHANGED frozen fields — so the admin (which re-sends the
     full payload incl. unchanged checkout_* + price) can edit a published product's copy without a 400;
     a price CHANGE is accepted and rotated, not 400'd.
  8. (G4/G5, already-handled — don't re-flag) product-feed.ts already filters .eq('is_test', false) and
     now also .eq('is_published', true).is('archived_at', null); shop.js / homepage.js / product.js +
     renderRelatedProducts all route through main.js getProducts/getProductBySlug — confirm no OTHER
     public read bypasses the filters.

ANGLE C — integration / system fit. Hunt for gaps where an edit is locally correct but breaks the
wider system:
- is_test scoping holds across every new read/write/action (preview, publish, coupon, archive, discard,
  list) AND the public main.js path now filters is_test (1.11) — confirm prod shows only live, non-test,
  non-archived rows and the dev preview still renders a published test product; confirm the Meta
  product-feed never emits a test/draft/archived row.
- Price rotation integration (Q1): after a published price change, checkout.ts charges the NEW price
  (reads the row's stripe_price_id); the old Price is active:false; a Checkout Session opened before the
  change keeps its locked price (expected). The DB price column and stripe_price_id stay consistent.
- The admin path specifically (G1): admin create AND edit of a PUBLISHED product go through the same
  draft→publish gate and must NOT 400 on unchanged frozen fields (the admin re-sends the full payload);
  a price change rotates live + stages copy as a draft in the same save — confirm the response is coherent.
- Idempotency / state machine: re-publishing, publishing a draft with no changes, a stale/rotated
  preview_token, an edit staged then re-edited, discard then re-edit, archiving then unarchiving (Stripe
  active round-trip), discard on an unpublished draft (friendly 400) vs on a published row with no draft
  (idempotent).
- The RLS change vs. every reader (anon client, product-feed, homepage, checkout, admin, GPT) — does
  anything that should see drafts/archived now can't, or vice-versa?
- Coupon isolation: listCoupons/deactivateCoupon must touch only owner_sale-tagged codes, never the
  system cart-recovery/newsletter promotion codes (api/cart.ts, api/subscribe.ts); the new pagination
  must still exclude system codes.
- Resource caps (11/12 functions), conventions (cleanUrls rewrites must drop .html; CORS per-route),
  AR conflicts, and stale pointers (docs that still say "GPT can't edit" / "create auto-syncs Stripe" /
  "adding a product makes it live immediately" / "price change = new product" after Phases 9–10b).

OUTPUT
- Ranked list: location, the integration risk, the concrete fix.
- The single most important fix.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
```
