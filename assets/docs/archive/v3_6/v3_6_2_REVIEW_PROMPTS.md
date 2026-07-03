# v3.6.2 — Gap-review prompts (formal Agent-SDK A-Type gate kickoff)

> **📁 Directory note (read first).** This is the **formal A-Type gate driver** — the converged v3.5.5 copy minor-bumped into `assets/docs/archive/v3_6/`. The build under review (`v3_6_2_IMPLEMENT.md` + the two `v3_6_0_ADDENDUM_*.md`) is HERE in `v3_6/`. **All source material — `design-handoff/…`, `out/…`, `v3_5_0_ROADMAP.md`, the GPT base files — lives in the SIBLING `assets/docs/archive/v3_5/` directory;** every such path below is relative to that `v3_5/` dir. The frozen `v3_5_5_*` copies + the full in-session `GAP_REVIEW_*` trail (rounds 1–4) also remain in `v3_5/`. A-Type reviewers write their findings to `v3_6_2_GAP_REVIEW_<angle>.md` in `v3_6/`.

> **Revision driven by**: A-Type round-1 fold + round-1 breadth-regression fold — v3.6.0 → v3.6.1 → **v3.6.2** (living docs renamed `v3_6_2_*`; standing round-1 finding at `v3_6_0_GAP_REVIEW_A.md`; round-1 breadth at `v3_6_1_GAP_REVIEW_BREADTH_{JOURNEY,INTEGRATION}.md`). **Round-1 verdicts:** A NARROW → 8/10 folded, 2 decisions surfaced, 1 not-a-gap. **Round-1 breadth verdicts:** Journey NARROW (5 real folds — GPT scheduled_publish beat + WS5 error-recovery/gallery-NN + STACK-AND-ERROR race + activity title) all folded; Integration READY (advisory N1 mechanism-hardened PostgREST fallback + N2 STACK-AND-ERROR skeleton) folded.
> **Gate status.** **A** re-runs SCOPED to the eight A-fold deltas + six v3.6.2 breadth-fold deltas (see the scoped block below). **B / C / D** have not yet run in `v3_6/` — they run as FIRST passes (fresh instance, full lens). The 2-subagent breadth pass (owner-journey + integration) runs concurrently as the cross-lane backstop. Reviewers change nothing — output is findings only, written to `v3_6_2_GAP_REVIEW_<angle>.md`.
>
> **Open decisions (surface-to-Sean; do NOT decide silently in review):**
> **D-v361-1 — WS6 §6.2d series-taxonomy reconcile-at-build side.** Two paths: **(a)** rename live series so their `seriesSlug()` values match the fixed nav slugs (`portals-to-peace|book-nooks|story-lofts|seasonal|limited-edition`) — touches owner-visible catalog names; or **(b)** realign the nav/footer `?series=` deep-link slugs to whatever `seriesSlug()` yields on the LIVE catalog — touches internal template markup only. **Recommended default: (b) realign nav slugs** (internal-facing, no owner-visible rename; safer). Owner decides at build.
> **D-v361-2 — DESIGN §C.3 per-field char-target values (FEEDBACK §8.7).** Two paths: **(a)** ship BARE counts (the `.count` counter increments but never turns `is-over` for non-SEO fields; per-field targets deferred to render-tune on the live preview); or **(b)** author a per-field target table in the addendum now (title ~60 desktop / ~40 mobile · headline ~50 · description ~155 · story_card 200–800 · seo_title ≤60 · seo_description ≤155 — Sean-picked). **Recommended default: (a) bare counts + declare targets DEFERRED to render-tune** (matches the concrete-default + render-tune posture; SEO fields still enforce Stripe/Google-standard caps). Owner decides at build.

## The build under review

The v3.5.5 triplet, all in `assets/docs/archive/v3_5/`, one build / one source of truth:
- **`v3_6_2_IMPLEMENT.md`** — 10 workstreams (WS1 portal shell/routing/auth · WS2 Products + sold-policy + scheduled-publish · WS3 Orders + refund-preserve · WS4 store-wide sale + struck pricing + top-bar/popup · WS5 media rebuild · WS6 storefront bugs · WS7 webhook/money · WS8 activity log + seen/unseen · WS9 buy-on-tile info-scent · WS10 GPT+docs parity).
- **`v3_6_2_ADDENDUM_DESIGN.md`** — the design third (always in scope).
- **`v3_6_2_ADDENDUM_TESTING.md`** — the testing third (always in scope).

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

**Round-3 folds (v3.5.4 — do not re-raise the closed halves)**
34b. **`previewToken` is RE-DERIVED locally in `populateStickyCard`** (§6.5b: `new URLSearchParams(location.search).get('preview')`) — the function is top-level so the init handler's `previewToken` (`product.js:19`) is out of scope; referencing it directly threw a ReferenceError on every PDP (fixed v3.5.4). §4.5.d's struck gate intentionally does NOT preview-guard (a previewed draft SHOULD show its struck price). Do not re-raise the scope bug or the §4.5.d asymmetry.
35b. **The `.badge-unique` CSS is WRITTEN by IMPLEMENT §9.2a** (solid storefront tokens — `--bg-primary` + `--accent-primary`, no `color-mix()`), not just speced in DESIGN §D.4. The badge is gated **`!sold && !p.featured`** so it never overlaps Sold/Featured in the shared `card__media` corner (`styles.css:593`). "Show on featured too" is an optional stack-CSS upgrade in §D.4. Do not re-raise "unstyled badge" or "badge overlap."
36b. **`main.js` §4.3.b (sale chrome) + §4.7.0 (`?code=` capture) share ONE `DOMContentLoaded` anchor** (`main.js:269`, after `initConfig()`) — listed in the coordination section; apply BOTH appends. **§2.4 Schedule gate keys off field-completeness** (`validatePublishRules`-equivalent), NOT a preview step (has a fallback if `readiness()` isn't reusable). **Legacy `available:false` rows with stale non-null `quantity`** must get the `20260616000001` cutover backfill before a % sale (TESTING preflight) — the quantity-primary storefront gate assumes it (server checkout still fails safe regardless).

**Round-4 folds (v3.5.5 — do not re-raise)**
37b. **The three card badges are MUTUALLY EXCLUSIVE by gate** — Sold (`sold`), Featured (`!sold && p.featured`), "One of a kind" (`!sold && !p.featured`) — so **exactly one** renders per tile on both surfaces; no overlap, structural (not dependent on the homepage-all-featured invariant), and the **pre-existing Sold+Featured co-occurrence is retired** (Featured now gated `!sold`). Closes round-4 D4-R4-1 + the breadth Sold+Featured flags. Do not re-raise badge overlap.
38b. **§2.4 Schedule gate — `out/products-app.js:47 readiness()` is VERIFIED field-only + reusable** (no preview step): gate on it directly; the fallback is a concrete inline field-check (§C.1 list), never "always offer." Closes the round-4 §2.4 fallback-intersection flag + J2.

**A-Type round-1 folds (v3.6.0 → v3.6.1 — orchestrator-validated, do NOT re-raise as gaps):**
39. **WS5 §5.4c.i — re-role Apply diff algorithm authored** (fold #1). `openedRoles`-baseline diff, per-item `added`/`removed` fan-out; the "naive rewrite → duplicate hero+gallery on PDP" failure mode is precluded by construction. Do NOT re-flag "the diff isn't spelled out."
40. **WS4 Phase 4.0 probe — fourth answer added: SECOND `applyPromotionCode` = REPLACE vs STACK-AND-ERROR vs STACK-AND-BOTH** (fold #2). `wirePromo` Apply-handler branch is encoded off answer (4); no downstream NEEDS-VERIFY. Do NOT re-flag "second-code behavior unknown."
41. **WS2 Phase 2.6 PostgREST `.or()` — explicit build-time REST-tester pre-test + `console.warn` fallback** (fold #4). Never silently narrows the query; the "hides without explaining" failure mode is closed. Do NOT re-flag as an open NEEDS-VERIFY.
42. **WS4 Phase 4.5.i cart hooks — VERIFIED both exist** (fold #5). `cart.html:170 [data-cart-subtotal]` + `:178 [data-cart-estimate]` — two-hook phase shape confirmed. Do NOT re-open "confirm which hook cart carries."
43. **WS2 A2-4 backstop — `logActivity` imports cleanly into `product-feed.ts`; concrete cron-actor insert authored** (fold #6). `api/_lib/activityLog.ts` is a plain CommonJS module with its own per-invocation service-role client — no `feedAdmin` dependency. Do NOT re-flag as importability-uncertain.
44. **WS1 Phase 1.5 products-app wrap — concrete NEW block authored** (fold #8). The three-statement wrap (env-chip IIFE + rail IIFE + `render`) is shown verbatim inside the `.then()`; `PORTAL.refreshOrdersSignal()` sits INSIDE the wrap so it never fires for a signed-out visitor.
45. **TESTING Preflight — one 30-second observable cron-gate assertion** (fold #9). `curl` with the `CRON_SECRET` header MUST log "Reconciliation OK"; without the header the log line MUST NOT appear. Turns three silent env-presence NEEDS-VERIFYs (`CRON_SECRET` / `SUPABASE_SECRET_KEY` / `PRODUCT_API_KEY`) into one visible check.
46. **DESIGN §D.4 "One of a kind on featured too?" — CONFIRMED NOT A GAP** (round-1 A #10). The default (`!p.featured` gate → no badge stack) is intentional; the upgrade path is a proper render-tune surface deferred to Sean on the live preview. Do NOT re-flag.

**Breadth-round-1 folds (v3.6.1 → v3.6.2 — orchestrator-validated, do NOT re-raise):**
47. **WS10 GPT scheduled_publish_at instruction beat — CLOSED** (Journey-#1 fold). The `editProduct.scheduled_publish_at` schema description now teaches natural-time parse + confirm-back echo + publish-readiness verification + date-granular semantics. Zero instruction-`.txt` byte cost (schema has no total cap). Parity closed with the portal's Schedule control. Do NOT re-flag "GPT can't drive scheduled-publish."
48. **WS5 §5.4c.i partial-failure recovery — CLOSED** (Journey-#2 fold). On any POST throw or non-2xx mid-fan-out: stop, mark `mItem.errored`, toast the failed role, preserve `openedRoles` on the failed item so re-Apply retries only the remaining diff (idempotent). R2 + `p.images` stay consistent; no "stuck modal" state.
49. **WS5 §5.4c.i gallery-NN sequential resolve — CLOSED** (Journey-#3 fold). Added-gallery roles resolve sequentially with `p.images` spliced after each POST so `nextNumberedRole()` sees the freshly-taken NN. Parallel resolve would silent-overwrite; explicitly precluded.
50. **WS2 A2-4 activity summary carries the piece title — CLOSED** (Journey-#4 fold). `select('id, title')` on the runtime-gated query above (see 51), summary interpolates `row.title` so the Account activity card shows "Scheduled publish skipped — <title> not publish-ready" not a nameless generic.
51. **WS2 §2.6 PostgREST `.or()` → RUNTIME MECHANISM** (Integration-N1 / Journey-#6 fold). Rather than a doc-gated build-time REST-tester step, the fallback ships wired: try/catch on the `.or()` form; catch → re-issue query without OR + one-per-cold-start `console.warn`. Mirrors Sean's mechanism-gated `cart_holds` DROP convention. Silent-narrowing failure precluded by construction.
52. **WS4 §4.0 STACK-AND-ERROR `wirePromo` byte-anchored skeleton — CLOSED** (Integration-N2 / Journey-#5 fold). One `try/catch` block: remove sale first, apply shopper code, on apply-throw best-effort re-apply the sale + friendly toast. Closes the race window where the shopper is left with NO discount. Locate-and-apply on the existing click handler.

**High-frequency FALSE-ALARM classes (seen in prior loops — do not raise without new evidence)**
- "This needs a new API function/cron" — no; it folds into an existing one (entries 1-2, 17-19).
- "The refund/store-wide-sale doesn't exist / must be built from scratch" — the foundations exist (13, 17); this is a display/preserve delta.
- "`shipping_address` is only nested" (14) · "`upload.ts` must change" (15) · "`data-flow.md:55` is the sold rule" (20, superseded).
- "`getCartTotal`/`getCart` aren't in scope on `/checkout`" — they are **`main.js` globals** (`:104`/`:167`) and `main.js` loads on every storefront page (A2-2, settled) · "the Orders-nav badge class `.badge` won't match `mountShell`" — it does (A2-6, settled) · "WS3's line-911 `authHeader` is unsatisfied" — satisfied by WS1 §1.3b (A2-7, settled).

---

## Angle A — cold / out-of-repo (SCOPED + NARROWED re-run)

```
⚠️ SCOPED RE-RUN — NOT A FRESH REVIEW. You returned NEEDS ANOTHER PASS (NARROW) on v3.6.0 with 10 ranked findings. Eight have been folded into the triplet you're now reading (v3.6.1). Two are surfaced as owner decisions (D-v361-1 series taxonomy, D-v361-2 char targets — do NOT re-flag either; they're not review calls). One (round-1 #10) was confirmed not-a-gap. YOUR SCOPE THIS ROUND = confirm the eight fold deltas are self-contained (a fresh builder LOCATES-and-APPLIES them; nothing new introduced). Do NOT re-audit what you already cleared. The narrow is DELIBERATE — the round-1 verdict called this "one authorial pass + one ops sweep from ready," and the eight folds are that pass + sweep.

You are a senior engineer, effort maximum, docs only (no repo — Angle A's constraint). Do NOT change anything; write findings to `v3_6_2_GAP_REVIEW_A.md`.

[REVIEW LENS — paste parts (a)(b)(c) verbatim from above]
[SETTLED BASE — paste the delta-on-proven-substrate paragraph]
[LANDMINES — paste the full "Settled — do not re-raise" ledger, entries 1-46 + the false-alarm classes; ledger 39-46 encode the round-1 folds — do NOT re-raise them]

CONFIRM the EIGHT round-1-A fold deltas + the SIX v3.6.2 breadth folds (ledger 47-52) are exclusively-executable (a fresh builder LOCATES-and-APPLIES; nothing left to DISCOVER or DECIDE). Specifically for v3.6.2 additions: is the GPT `scheduled_publish_at` description a real locate-and-apply beat for Em (natural-time parse + confirm-back + readiness verify), or does it hide a decision? Does the WS5 §5.4c.i partial-failure recovery describe error-state rendering (`.mitem--errored`) concretely enough? Is the sequential gallery-NN splice unambiguous? Does the WS2 §2.6 runtime-gated PostgREST try/catch block quote correctly against the surrounding phase code (globalThis flag, `_dueRes.error` handling)? Does the WS4 §4.0 STACK-AND-ERROR skeleton apply cleanly to the existing `wirePromo` click handler? Round-1-A confirmations still hold:
1. **WS5 §5.4c.i** — the Apply-time re-role diff algorithm (`openedRoles` baseline; per-item `added`/`removed`; role-per-write; poster fold; zero-role drop). Does the algorithm cover every re-role case named in §5.4c prose?
2. **WS4 §4.0 probe — fourth answer** (REPLACE vs STACK-AND-ERROR vs STACK-AND-BOTH) + the encoded `wirePromo` Apply-handler branch on 4.4c. Is answer (4) unambiguous? Is the STACK-AND-ERROR branch (`removePromotionCode` first, `applyPromotionCode(newCode)` after) spelled to LOCATE-and-APPLY?
3. **WS2 §2.6 PostgREST `.or()`** — the pre-test-at-build step + explicit `console.warn` fallback. Does the phase name the exact REST-tester query? Is the fallback narrowing (`is_published.eq.false` only) + `console.warn` copy stated verbatim?
4. **WS4 §4.5.i cart hooks** — the NEEDS-VERIFY is struck (verified: two hooks, cart.html:170 / :178). Does the phase read cleanly without the flag?
5. **WS2 A2-4 backstop** — `logActivity` import + concrete cron-actor insert (`action: 'product.schedule_skipped'`). Is the actor string named? Is the entry-shape a LOCATE-and-APPLY fill (no builder decision)?
6. **WS1 §1.5 products-app wrap** — the concrete NEW block (env-chip IIFE + rail IIFE + `render()` inside `.then()`; `PORTAL.refreshOrdersSignal()` INSIDE the wrap). Are all three statements shown verbatim in the wrapped position?
7. **TESTING Preflight cron-gate check** — the two curl assertions (with header → "Reconciliation OK" in logs; without → line absent). Is either curl locate-and-apply, or does it hide a discover step (e.g. "figure out which URL prefix")?
8. **Ledger entries 39-46** — do they accurately describe the eight folds (nothing over-claimed)?

If ALL eight are locate-and-apply → verdict READY TO BUILD (or READY with named nits). If ANY has a residual discover/decide step → NEEDS ANOTHER PASS (NARROW) naming the specific fold.

OUTPUT — same 3-part structure (ranked list + "if you fix one thing" + verdict) written to `v3_6_2_GAP_REVIEW_A.md`.
[paste v3_6_2_IMPLEMENT.md + v3_6_2_ADDENDUM_DESIGN.md + v3_6_2_ADDENDUM_TESTING.md in full]
```

## Angle B — fidelity (repo)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. You have the repo + the three docs. Do NOT change anything; write findings to `v3_6_2_GAP_REVIEW_B.md`.

[REVIEW LENS (a)(b)(c)] · [SETTLED BASE] · [LANDMINES 1-30 — you share this file's context, so it's above]

FIRST PASS in `v3_6/` (B has not yet run in the formal gate). ANGLE B — fidelity: open every file the docs edit. Verify (1) each **CURRENT** block byte-matches the working tree (line numbers are hints; the quoted text is the anchor — flag drift), and (2) each **NEW** block applies cleanly and references only things that exist. Pay special attention to the **shared-file edit coordination** (ledger 25-27): after WS2's edits, do WS4's and WS8's CURRENT anchors in `products.ts` still match? Does the merged `product-feed.ts` service-role client collide? Byte-check the DESIGN addendum's DECIDED blocks against `design-handoff/out/` (for render-tuned defaults, judge "concrete enough the builder never guesses," not "final"). Pay special attention to the **A-Type round-1 fold deltas** (ledger 39-46): the WS5 §5.4c.i algorithm; the WS4 §4.0 probe extension; the WS2 §2.6 PostgREST fallback prose; the WS4 §4.5.i verification note; the WS2 A2-4 backstop insert; the WS1 §1.5 concrete wrap; the Preflight curl assertions. Confirm the remaining NEEDS-VERIFY flags (only the #219 Stripe probe survives as a genuine runtime item; ledger 41-45 resolved the rest) are each either repo-resolvable (resolve it) or a genuine build-time/runtime item (say which).

OUTPUT — [same three-part output + verdict as Angle A, written to v3_6_2_GAP_REVIEW_B.md]
```

## Angle C — integration (repo + architecture)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. You have the repo + the three docs. **Read `assets/docs/EVERLASTINGS_STORE.md` end-to-end FIRST.** Do NOT change anything; write findings to `v3_6_2_GAP_REVIEW_C.md`.

[REVIEW LENS (a)(b)(c)] · [SETTLED BASE] · [LANDMINES 1-30]

ANGLE C — integration: does the delta FIT the system? Hunt system-fit gaps through the lens — the function/cron budget (11/12, 1 cron — ledger 1-2), `is_test` scoping, auth, idempotency (webhook/refund), the **sold-policy consistency across all three surfaces** (`computeState` [WS2] ↔ storefront buy-gate [WS6] ↔ webhook decrement [WS7] — the highest-value cross-lane check), Stripe one-discount reality, AR conflicts, stale `file:line` pointers in the docs, and the shared-file edit coordination (ledger 25-27). Watch for STORE.md drift (its header may lag the code — verify against the newest facts, not the header). Include the design + testing addenda.

OUTPUT — [same output + verdict, to v3_6_2_GAP_REVIEW_C.md]
```

## Angle D — design-correctness (repo + design addendum + design research)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. You have the repo + the three docs. Also read `design-handoff/brief.md`, `design-handoff/out/`, `design-handoff/feedback/FEEDBACK_v1.md`, `design-handoff/controls.html` + `tokens.css`, `design-handoff/reference/`. Do NOT change anything; write findings to `v3_6_2_GAP_REVIEW_D.md`.

[REVIEW LENS (a)(b)(c) — the North Star here is design-flavored] · [SETTLED BASE] · [LANDMINES 1-30]

ANGLE D — design-correctness: A can't see the repo and B/C lean fidelity/integration, so YOU own whether the UI actually RENDERS right. Check: the `out/` markup ships verbatim and the seam swaps (mock→API, no-op→endpoint) don't require touching markup/class-names; the state-color system is correct (color reserved for state; the row LED colors ALL FIVE states live/edits/draft/sold/archived per `out/`, field rings; sold/archived ALSO get tabs — both the LED color AND a tab, not either/or); the KILL list holds (no tiles, no nested components, no words in pills, no portal-name header); mobile-primary correctness (NYT-dense, 16px inputs, one component in both row + phone layouts); reduced-motion / a11y / focus / honest enable-disable; and the NEW components not in `out/` (struck-`%` pricing, the top bar + once-only popup, the env chip) are specified concretely enough to render right. The design addendum is ALWAYS in scope.

OUTPUT — [same output + verdict, to v3_6_2_GAP_REVIEW_D.md]
```

---

**Verdict trichotomy** (each angle's one-liner): **READY TO BUILD** · **NEEDS ANOTHER PASS** · **NEEDS ANOTHER PASS (NARROW)** — NARROW = "almost there, only a bounded area left," which triggers the end-game clean-up read and lets the next pass be scoped tight. The per-angle GAP_REVIEW files are kept standing (the rigor trail); THIS prompts file is current-only (rename on bump).
