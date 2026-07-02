# v3.5.3 — Gap-review prompts (round-2 A/B/C/D folds applied → re-run the gate)

> **Revision driven by**: round-1 A/B/C/D + breadth fold, then round-2 A/B/C/D subagent fold — v3.5.0 → v3.5.1 → v3.5.2 → **v3.5.3** (living docs renamed to `v3_5_3_*`). Round-2 verdicts were C+D READY, A+B NARROW; the two load-bearing folds (shop/homepage/product card-render collision + the `?code=` site-wide capture) + 8 small are now applied and settled (ledger 30–33b) — round-3 re-runs scoped to A/B, with C/D re-confirming only their touched deltas.
> **Gate status.** Round-1 + round-2 validated A/B/C/D findings + the breadth-regression findings have been folded into the triplet (this is the v3.5.3 state); all four angles **re-run from here** — an angle re-runs only when a later fold lands in its lane (scoped + narrowed), otherwise it stays closed. This file is the paste-ready driver for the in-session A/B/C/D subagent sweep AND the seed that minor-bumps into `v3_6/` for the formal fresh-instance A-Type gate. It is **current-only** (rename/bump, don't accrete copies). Reviewers change nothing — output is findings only, written to the named `GAP_REVIEW_<angle>.md` file (or printed in full if no filesystem).

## The build under review

The v3.5.3 triplet, all in `assets/docs/archive/v3_5/`, one build / one source of truth:
- **`v3_5_3_IMPLEMENT.md`** — 10 workstreams (WS1 portal shell/routing/auth · WS2 Products + sold-policy + scheduled-publish · WS3 Orders + refund-preserve · WS4 store-wide sale + struck pricing + top-bar/popup · WS5 media rebuild · WS6 storefront bugs · WS7 webhook/money · WS8 activity log + seen/unseen · WS9 buy-on-tile info-scent · WS10 GPT+docs parity).
- **`v3_5_3_ADDENDUM_DESIGN.md`** — the design third (always in scope).
- **`v3_5_3_ADDENDUM_TESTING.md`** — the testing third (always in scope).

Effort: **maximum**. A **new instance per pass** (no context contamination). Read ALL THREE end-to-end.

## Sequencing (how the loop converges)

Fold real findings → bump PATCH → regenerate this file (carrying the updated ledger) → re-run. **B/C/D close angle-by-angle:** an angle that returns READY re-runs *only* when a later fold lands in **its** lane, and is then **scoped + narrowed** ("you passed; confirm only X; the narrow is deliberate, not a violation"). If a round's folds touch no lane, that angle stays closed; the 2-subagent breadth pass (owner-journey + integration) is the cross-lane backstop, run after every fold. Convergence is **non-monotonic** — a fix can create the next finding; the exit is *a fresh pass that finds nothing load-bearing*, never "it feels close."

## What to hand each reviewer

- **A — cold / no-repo:** the three docs ONLY, no repo (the absence is the point). Run in a non-Claude tool or a fresh no-repo instance.
- **B — fidelity:** the repo + the three docs + this file. Byte-check CURRENT blocks against the tree; byte-check the DESIGN addendum's DECIDED blocks against `design-handoff/out/`.
- **C — integration:** the repo + the three docs + this file; **read `assets/docs/EVERLASTINGS_STORE.md` first**.
- **D — design-correctness:** the repo + the three docs + this file; also read `design-handoff/brief.md`, `design-handoff/out/`, `design-handoff/feedback/FEEDBACK_v1.md`, `design-handoff/controls.html` + `tokens.css`, `design-handoff/reference/`.

---

## The settled base — don't re-litigate what's shipped

The current system — **all of `EVERLASTINGS_STORE.md` + the repo as it stands on `dev` today** — is built, tested, and live/approved: the fixed substrate. This build is a **delta**: a *presentation swap* of `/admin` (its backend is already complete) + a defined set of new/changed backend (the store-wide-sale display/auto-apply layer, the media modal rebuild, the state-semantics reconciliation, the money-integrity fixes, the activity log). **Review the delta for gaps + whether it FITS the base; do NOT re-litigate, redesign, or flag settled/shipped behavior** — a finding must be about what this build adds/changes, or a real conflict it creates with the base.

---

## ⭐ The review lens (in EVERY block — all three parts, never trimmed)

**(a) The North Star / thesis (the value lens).** Minimize the maker's friction to run her store, mostly from her phone: intent over data-model (she never learns "drafts vs staged vs live"), entropy-lowering details in familiar layouts, nothing hides without explaining, and **full parity** — every capability equally doable in the portal AND the Custom GPT (either could be down). A capability that reads "covered" but isn't truly *drivable* least-friction is a real gap.

**(b) The broader mandate — the North Star does NOT shrink the scope.** Search the **whole build (the IMPLEMENT + both addenda), every element** — *do not neglect the design addendum even if you're "not the design reviewer."* Hunt anything not truly **exclusively-executable** (a step where the builder must open a file, guess, recall an API, or decide), any **unvalidated assumption**, and any **design-correctness** failure (the "renders wrong/incomplete though the spec applies cleanly" class). The lens is the primary functionality filter, not the boundary of what counts as a gap.

**(c) Read in full · co-design, don't just audit · flag-don't-assert.** Read all three docs **end-to-end**; **don't ration tokens** (context is managed for you — grep/skim reading has produced real mis-diagnoses here). **Co-design:** a gap is a gap whether it's a flaw in what we wrote OR something the build should address but omitted. **Flag-don't-assert:** when a finding depends on runtime/code you can't see, FLAG it *needs-verification* — never assert "broken" (whole prior rounds were false alarms from confident "broken" calls the code disproved; on a delta, prefer "I can't verify X" over "X is broken"). The orchestrator validates before folding.

---

## Settled — do not re-raise (the shared ledger; current-only + bounded)

Every entry is a **verified** truth of this project/build — validate against reality, not training data; do NOT re-raise. A superseding fold **replaces** an entry (never appends a contradiction). Shared once here (B/C/D see it inline; the cold-A paste re-inlines it).

**Platform / invariants (v3.2 carry-overs, still binding)**
1. **No new Vercel serverless function** — Hobby is at **11/12**; the one slot is reserved headroom. Everything new folds into an existing `api/*.ts` (verified: store-wide-sale set + public active-sale read + activity-log read all fold into `api/products.ts`).
2. **No new cron** — 1 usable cron (`/api/product-feed`, daily `0 9 * * *`). Scheduled-publish and the #227 reconciliation BOTH fold into that one function; the feed's Supabase read is already the DB keep-alive.
3. **CommonJS / tsc-clean** — `api/*.ts` compile to CommonJS; ES-module output crashes the deployed runtime (masked by `vercel dev`). `npx tsc --noEmit` clean after every TS edit.
4. **`is_test` isolation** — every product/order/sale/activity lookup is scoped by `isTest`; the Stripe secret key is env-scoped (test vs live). A test action can never touch a live row.
5. **Auth unchanged** — `PRODUCT_API_KEY` Bearer OR admin Supabase JWT (`requireAdmin` for orders, `authorize` for products/upload). No new auth.
6. **Single-admin** — one operator; reads-then-writes, no cross-tab/seat locking. Multi-seat is out of scope.
7. **Money in integer cents** everywhere.
8. **Brand separation** — the portal is cool indigo-slate (a reusable template); the storefront is warm-plum Everlastings. The new struck-pricing/top-bar/popup use the STOREFRONT's tokens; the portal never imports plum.
9. **GPT instructions hard cap 8000 chars** — the shipped `.txt` is re-counted with `wc -c` (projected 7988, 12 headroom). A Custom GPT can ONLY call its declared Action endpoints — you widen capability with a param + instruction beat, NEVER by adding Stripe docs to KNOWLEDGE.
10. **Stripe allows ONE discount per order** — the always-on checkout keyword field lets a shopper swap the auto-applied sale code for a personal one; don't use the server `discounts` param (mutually exclusive with `allow_promotion_codes:true`, which stays).
11. **Reduced-motion preserved**; storefront hero fallback intact.
12. **No hard delete** — "delete" = archive; everything revivable (mirrors Stripe `active=false`; a price change is a new Price, never an in-place edit).

**v3.5 facts this drafting pass VERIFIED against the code (do not "discover" them as gaps)**
13. **Refund already works — WS3 PRESERVES it, does not rebuild.** `orders.ts:246-341` + `admin.js:1005-1122`: one amount-based Stripe refund against the PI (a $30 + $270 merge into one refund), all pieces loaded by PaymentIntent, amount auto-sums but stays freely editable, per-piece relist is separate + also doable later. Empty `relist_product_ids` ⇒ status does NOT flip.
14. **`orders.shipping_address` IS a top-level column** (`initial_schema.sql:109`, written by `webhook.ts:195`, returned by `orders.ts:65`) — the earlier "only nested under customers" claim was WRONG; WS3's either-source fallback is defensive. The buyer name is `customers.name`, not in the address JSON.
15. **`api/upload.ts` needs ZERO backend change** — batch = client fan-out of single POSTs; by-link, video (MP4+WebM), Drive-rewrite, all role tokens, transform/skip gate all already exist. WS5 is a new client + 3 data-op reconciliations (video shape `mute`→`muted`+`poster`; role-from-filename not array-index; add/re-upload/remove diff).
16. **#228 is a one-line fix** — `webhook.ts:165` `listLineItems` gains `expand:['data.price.product']`; `metadata.supabase_id` (`stripeSync.ts:69`) then resolves and `order.amount` becomes the real per-item `amount_total`. The `total/n` split survives only as the fetch-failure fallback.
17. **Store-wide sale folds into `handleCoupon`** (`products.ts:735` metadata) + a public `?_action=active_sale` GET branch (`products.ts:70`) — PERCENT-only for on-site struck pricing + auto-apply; a $-off "store-wide" stays a plain code. One active auto-apply sale at a time (create supersedes prior). NO new function.
18. **Scheduled-publish reuses the `?_action=publish` handler** via an authenticated self-call inside the daily `product-feed` cron (prod-only, date-granular) — zero publish-logic duplication, no new cron/function. `scheduled_publish_at` clears on any publish.
19. **`last_viewed` (seen/unseen) reuses the existing `site_config` table** (per-env key) — NO migration. `activity_log` is the one new table (migration).
20. **Sold policy (Sean's final word):** Available-OFF on a LIVE piece → **Draft** (unpublish `is_published=false`), never "sold." **Sold = `quantity===0` from a real sale** (computed by `computeState()`, never stored). `data-flow.md:55`'s `is_published && !available → sold` is **SUPERSEDED**. `computeState` precedence: archived > draft > staged-edits > sold > live. The row LED colors **ALL FIVE states** (green live, orange edits, yellow draft, blue sold, purple-gray archived — `out/products-app.js:91 ledFor()`, `portal.css:401-405`); sold/archived **ALSO** get their own tabs — **both the LED color AND a tab, not either/or**. Storefront buy-gate = `published && quantity>0`. Wording "Sold," not "Sold out."
21. **`product_type = miniature` ONLY** in the picker — the API validates every type as miniature; printable/storybook are deferred (NOT a one-line enum add).
22. **The hot public GET path stays raw** — `GET ?slug=`/`?id=` return the raw row; the portal merges `draft` client-side (as `admin.js:310` does). Do NOT add server-side `effective` to the hot path.
23. **Alt text is a HARD server publish gate** — WS2's `validatePublishRules` checks alt on every image + every `media[]` entry; WS5's client gate is the friendly pre-check. (Two-tier validation: lenient `validateCreateShape` [title+price] so drafts persist; full `validatePublishRules` at publish.)
24. **`checkout_image` is FROZEN after first publish** (`FROZEN_AFTER_PUBLISH`) — the media modal locks the checkout role post-publish; `seo_thumbnail`/`media`/`images` stay draftable.

**Shared-file edit coordination (independently-drafted sections overlap here)**
25. **`api/products.ts` — apply WS2 → WS4 → WS8.** GET dispatch: WS4 inserts `?_action=active_sale` **just BEFORE** the coupon branch (§4.2.a — the public/no-auth read ahead of the auth'd coupon list) and WS8 inserts `?_action=activity` **just AFTER** it (§8.1d) — the two bracket the coupon branch, they are NOT adjacent to each other. `handleCoupon`/`handlePublish`/returns are edited by WS2 then wrapped by WS8's `logActivity`; WS2's validation split lands first. Re-anchor each stacked edit.
26. **`api/product-feed.ts` — WS2 + WS7 merge into ONE service-role client + both jobs** in `GET` (`publishDueScheduled` + `reconcileOrders`). Do not create two clients.
27. **`api/orders.ts` — WS3 + WS8 together;** the POST `const actor` + the `_action` dispatch fork are single-definition (WS8 owns them; WS3's refund phase must not re-declare `actor`).

**Settled decisions (the builder chooses nothing here)**
28. **Buy-on-tile = NO raw buy button** (research: the lift is off-thesis for one-of-a-kind emotional art). WS9 = info-scent: full-tile tap target + a concrete "One of a kind" `badge badge-unique` (spec DESIGN §D.4 — ledger 32b) + clear grid Sold state.
29. **Portal routing:** keep `/admin/*` (4 pages: `/admin/{products,orders,sales,account}`, landing = products; a `/admin`→`/admin/products` redirect; the SPA catch-all rewrite is removed). Site title `Creator Portal | Everlastings by Emaline` + `robots noindex`.
30. **Orders signal:** the nav blink keys off `unseen_count`; the numeric badge stays the unfulfilled count. Poster = one-per-product for v3.5. Reconciliation alerts go to the existing order-notify address. `?code=` share link: the link lands on the homepage root, so **`main.js` captures `?code=` site-wide → `sessionStorage` (§4.7.0)** and the `checkout.js` reader consumes the stash (reusing the auto-apply path), mutually exclusive with the store-wide auto-apply. **Wired end-to-end (v3.5.3)** — not a checkout-only reader.

**Round-2 folds (v3.5.3 — do not re-raise the closed halves)**
31b. **Storefront card renders — `shop.js`/`homepage.js` apply WS6 → WS4 → WS9** (ONE merged NEW per card block: the quantity-based `sold` state + struck price gated on `!sold` + the "One of a kind" badge). §6.5a/§6.3d carry the merged block; **§4.5.b/§4.5.f/§9.2 are POINTERS**, not standalone edits. `product.js` sticky is a semantic (not line) reconcile — §4.5.d struck gated on the same block-local `!sold`. *(This is the WS4↔WS6 collision the coordination section previously mis-called "non-overlapping" — now fixed; do not re-raise it as open.)*
32b. **The "One of a kind" tile badge is CONCRETE** — `badge badge-unique`, copy "One of a kind", placement in `card__media`, gated `!sold`; full visual spec (class/copy/CSS/trigger) is **DESIGN §D.4**, render folded into §6.5a/§6.3d. The only open item is the render-tune trigger confirm (all-`!sold` vs non-featured) flagged in §D.4 — not a gap.
33b. **The server checkout/reserve gate is the intentional strict FOURTH sold-policy enforcer** (`checkout.ts:79`/`:205`, `available===true && quantity>=1`) — named so "three enforcers" isn't read as exhaustive. §6.5's null-fallback preserves (never introduces) the legacy display-vs-checkout edges; all fail safe. Do not raise it as a leak.

**High-frequency FALSE-ALARM classes (seen in prior loops — do not raise without new evidence)**
- "This needs a new API function/cron" — no; it folds into an existing one (entries 1-2, 17-19).
- "The refund/store-wide-sale doesn't exist / must be built from scratch" — the foundations exist (13, 17); this is a display/preserve delta.
- "`shipping_address` is only nested" (14) · "`upload.ts` must change" (15) · "`data-flow.md:55` is the sold rule" (20, superseded).
- "`getCartTotal`/`getCart` aren't in scope on `/checkout`" — they are **`main.js` globals** (`:104`/`:167`) and `main.js` loads on every storefront page (A2-2, settled) · "the Orders-nav badge class `.badge` won't match `mountShell`" — it does (A2-6, settled) · "WS3's line-911 `authHeader` is unsatisfied" — satisfied by WS1 §1.3b (A2-7, settled).

---

## Angle A — cold / out-of-repo (self-containment + completeness)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. You have ONLY the three documents pasted below — NO repo (the absence is the point). Do NOT change anything; your only output is your findings (write them to `v3_5_3_GAP_REVIEW_A.md`, or print the full file contents if you have no filesystem).

[REVIEW LENS — paste parts (a)(b)(c) verbatim from above]
[SETTLED BASE — paste the delta-on-proven-substrate paragraph]
[LANDMINES — paste the full "Settled — do not re-raise" ledger, entries 1-30 + the false-alarm classes]

ANGLE A — cold / self-containment: the docs are meant to be EXCLUSIVELY EXECUTABLE — a fresh builder LOCATES and APPLIES, never DISCOVERS or DECIDES. Find every place you would have to open a file, guess a value, recall a library's behavior, or make a decision the doc didn't make for you. A byte-anchored CURRENT block you can't see the file for is fine (that's B's job) — flag only where the DOC ITSELF is incomplete: an unstated field shape, an undefined selector/id, a "wire it to the endpoint" with no endpoint named, a phase that assumes a value computed nowhere, a NEEDS-VERIFY that hides a real decision. Include the design + testing addenda.

OUTPUT
- A gap list RANKED by how likely each is to derail the build: location (doc §/phase), what's missing/ambiguous, the concrete fix.
- The single most important "if you fix one thing" insight.
- One-line verdict — one of: READY TO BUILD / NEEDS ANOTHER PASS / NEEDS ANOTHER PASS (NARROW).
Be concrete: "WS4 Phase 4.4 calls getActiveSale() but no phase defines its return shape" beats "check the sale wiring."
[paste v3_5_3_IMPLEMENT.md + v3_5_3_ADDENDUM_DESIGN.md + v3_5_3_ADDENDUM_TESTING.md in full]
```

## Angle B — fidelity (repo)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. You have the repo + the three docs. Do NOT change anything; write findings to `v3_5_3_GAP_REVIEW_B.md`.

[REVIEW LENS (a)(b)(c)] · [SETTLED BASE] · [LANDMINES 1-30 — you share this file's context, so it's above]

ANGLE B — fidelity: open every file the docs edit. Verify (1) each **CURRENT** block byte-matches the working tree (line numbers are hints; the quoted text is the anchor — flag drift), and (2) each **NEW** block applies cleanly and references only things that exist. Pay special attention to the **shared-file edit coordination** (ledger 25-27): after WS2's edits, do WS4's and WS8's CURRENT anchors in `products.ts` still match? Does the merged `product-feed.ts` service-role client collide? Byte-check the DESIGN addendum's DECIDED blocks against `design-handoff/out/` (for render-tuned defaults, judge "concrete enough the builder never guesses," not "final"). Confirm the remaining NEEDS-VERIFY flags (round-1 resolved the alt-gate, `shipping_address`, and `auto_apply` param-name ones; the rest are the #219 Stripe probe, the PostgREST `.or(...)` form + fallback, and the deploy-env items — `CRON_SECRET`/`PRODUCT_API_KEY`/`SUPABASE_SECRET_KEY`) are each either resolvable from the repo (resolve it) or a genuine build-time/runtime item (say which).

OUTPUT — [same three-part output + verdict as Angle A, written to v3_5_3_GAP_REVIEW_B.md]
```

## Angle C — integration (repo + architecture)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. You have the repo + the three docs. **Read `assets/docs/EVERLASTINGS_STORE.md` end-to-end FIRST.** Do NOT change anything; write findings to `v3_5_3_GAP_REVIEW_C.md`.

[REVIEW LENS (a)(b)(c)] · [SETTLED BASE] · [LANDMINES 1-30]

ANGLE C — integration: does the delta FIT the system? Hunt system-fit gaps through the lens — the function/cron budget (11/12, 1 cron — ledger 1-2), `is_test` scoping, auth, idempotency (webhook/refund), the **sold-policy consistency across all three surfaces** (`computeState` [WS2] ↔ storefront buy-gate [WS6] ↔ webhook decrement [WS7] — the highest-value cross-lane check), Stripe one-discount reality, AR conflicts, stale `file:line` pointers in the docs, and the shared-file edit coordination (ledger 25-27). Watch for STORE.md drift (its header may lag the code — verify against the newest facts, not the header). Include the design + testing addenda.

OUTPUT — [same output + verdict, to v3_5_3_GAP_REVIEW_C.md]
```

## Angle D — design-correctness (repo + design addendum + design research)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. You have the repo + the three docs. Also read `design-handoff/brief.md`, `design-handoff/out/`, `design-handoff/feedback/FEEDBACK_v1.md`, `design-handoff/controls.html` + `tokens.css`, `design-handoff/reference/`. Do NOT change anything; write findings to `v3_5_3_GAP_REVIEW_D.md`.

[REVIEW LENS (a)(b)(c) — the North Star here is design-flavored] · [SETTLED BASE] · [LANDMINES 1-30]

ANGLE D — design-correctness: A can't see the repo and B/C lean fidelity/integration, so YOU own whether the UI actually RENDERS right. Check: the `out/` markup ships verbatim and the seam swaps (mock→API, no-op→endpoint) don't require touching markup/class-names; the state-color system is correct (color reserved for state; the row LED colors ALL FIVE states live/edits/draft/sold/archived per `out/`, field rings; sold/archived ALSO get tabs — both the LED color AND a tab, not either/or); the KILL list holds (no tiles, no nested components, no words in pills, no portal-name header); mobile-primary correctness (NYT-dense, 16px inputs, one component in both row + phone layouts); reduced-motion / a11y / focus / honest enable-disable; and the NEW components not in `out/` (struck-`%` pricing, the top bar + once-only popup, the env chip) are specified concretely enough to render right. The design addendum is ALWAYS in scope.

OUTPUT — [same output + verdict, to v3_5_3_GAP_REVIEW_D.md]
```

---

**Verdict trichotomy** (each angle's one-liner): **READY TO BUILD** · **NEEDS ANOTHER PASS** · **NEEDS ANOTHER PASS (NARROW)** — NARROW = "almost there, only a bounded area left," which triggers the end-game clean-up read and lets the next pass be scoped tight. The per-angle GAP_REVIEW files are kept standing (the rigor trail); THIS prompts file is current-only (rename on bump).
