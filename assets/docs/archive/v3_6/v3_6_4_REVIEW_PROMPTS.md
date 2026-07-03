# v3.6.4 — Gap-review prompts (formal Agent-SDK A-Type gate — FINAL NARROW cold-A pass)

> **📁 Directory note (read first).** This is the **formal A-Type gate driver** — the CONSOLIDATED converged copy in `assets/docs/archive/v3_6/`. The build under review (`v3_6_4_IMPLEMENT.md` + the two `v3_6_4_ADDENDUM_*.md`) is HERE in `v3_6/`. **All source material — `design-handoff/…`, `out/…`, `v3_5_0_ROADMAP.md`, the GPT base files — lives in the SIBLING `assets/docs/archive/v3_5/` directory;** every such path below is relative to that `v3_5/` dir. The frozen `v3_5_5_*` copies + the full in-session `GAP_REVIEW_*` trail (rounds 1–4) also remain in `v3_5/`. The `v3_6/` standing rigor trail: `v3_6_0_GAP_REVIEW_A.md` + `v3_6_1_GAP_REVIEW_BREADTH_{JOURNEY,INTEGRATION}.md` + `v3_6_4_GAP_REVIEW_BREADTH_{JOURNEY,INTEGRATION}.md`. The final cold-A reviewer writes to `v3_6_4_GAP_REVIEW_A.md` in `v3_6/`.

> **Revision driven by**: A-Type round-1 fold + round-1 breadth fold + owner-decisions fold + **CONSOLIDATE step (v3.6.3 → v3.6.4)** — living docs renamed `v3_6_4_*` via `git mv`, ~4.5 KB of round-N archaeology stripped (20 attribution parentheticals + 4 resolved NEEDS-VERIFYs + collapsed preamble revision paragraph), ALL CURRENT/NEW code fences preserved byte-identical, all phases + decisions + tables + Doc-impact annotations intact. **Consolidation verified clean by BOTH breadth lenses** (owner-journey READY, integration READY — see `v3_6_4_GAP_REVIEW_BREADTH_{JOURNEY,INTEGRATION}.md`).
>
> **Gate status.** This is the **presumed-final cold-A pass** — the end-game clean-up read (DEV_RULES → End-game) is complete, so a fresh no-repo instance re-reads the CONSOLIDATED triplet against the same lens that ran round-1 and confirms nothing load-bearing remains. **B / C / D are OMITTED this round** — they ran first-pass in v3.6.0/3 and stayed closed; the consolidation touched no lane (no CURRENT/NEW fence edited, no phase/decision/table removed) so per the angle-by-angle closure rule they stay closed. The 2-subagent breadth pass ran on v3.6.4 and cleared. Reviewers change nothing — output is findings only, written to `v3_6_4_GAP_REVIEW_A.md`.
>
> **Open decisions:** none.

## The build under review

The v3.6.4 CONSOLIDATED triplet, all in `assets/docs/archive/v3_6/`, one build / one source of truth:
- **`v3_6_4_IMPLEMENT.md`** — 10 workstreams (WS1 portal shell/routing/auth · WS2 Products + sold-policy + scheduled-publish · WS3 Orders + refund-preserve · WS4 store-wide sale + struck pricing + top-bar/popup · WS5 media rebuild · WS6 storefront bugs · WS7 webhook/money · WS8 activity log + seen/unseen · WS9 buy-on-tile info-scent · WS10 GPT+docs parity).
- **`v3_6_4_ADDENDUM_DESIGN.md`** — the design third (always in scope).
- **`v3_6_4_ADDENDUM_TESTING.md`** — the testing third (always in scope).

Effort: **maximum**. A **new instance** (no context contamination). Read ALL THREE end-to-end.

## Sequencing (how the gate exits)

The final cold-A pass either returns **READY TO BUILD** → gate CLOSED → hand to Sean for the formal Agent-SDK driver + the v4.0.0 execution copy cut; or **NEEDS ANOTHER PASS (NARROW)** naming the specific residual — one more fold + one more cold-A. Convergence is **non-monotonic** — a fix can create the next finding; the exit is *a fresh pass that finds nothing load-bearing*, never "it feels close."

## What to hand the reviewer

- **A — cold / no-repo:** the three docs ONLY, no repo (the absence is the point). Run in a non-Claude tool or a fresh no-repo instance.

---

## The settled base — don't re-litigate what's shipped

The current system — **all of `EVERLASTINGS_STORE.md` + the repo as it stands on `dev` today** — is built, tested, and live/approved: the fixed substrate. This build is a **delta**: a *presentation swap* of `/admin` (its backend is already complete) + a defined set of new/changed backend (the store-wide-sale display/auto-apply layer, the media modal rebuild, the state-semantics reconciliation, the money-integrity fixes, the activity log). **Review the delta for gaps + whether it FITS the base; do NOT re-litigate, redesign, or flag settled/shipped behavior** — a finding must be about what this build adds/changes, or a real conflict it creates with the base.

---

## ⭐ The review lens (all three parts, never trimmed)

**(a) The North Star / thesis (the value lens).** Minimize the maker's friction to run her store, mostly from her phone: intent over data-model (she never learns "drafts vs staged vs live"), entropy-lowering details in familiar layouts, nothing hides without explaining, and **full parity** — every capability equally doable in the portal AND the Custom GPT (either could be down). A capability that reads "covered" but isn't truly *drivable* least-friction is a real gap.

**(b) The broader mandate — the North Star does NOT shrink the scope.** Search the **whole build (the IMPLEMENT + both addenda), every element** — *do not neglect the design addendum even if you're "not the design reviewer."* Hunt anything not truly **exclusively-executable** (a step where the builder must open a file, guess, recall an API, or decide), any **unvalidated assumption**, and any **design-correctness** failure (the "renders wrong/incomplete though the spec applies cleanly" class). The lens is the primary functionality filter, not the boundary of what counts as a gap.

**(c) Read in full · co-design, don't just audit · flag-don't-assert.** Read all three docs **end-to-end**; **don't ration tokens** (context is managed for you — grep/skim reading has produced real mis-diagnoses here). **Co-design:** a gap is a gap whether it's a flaw in what we wrote OR something the build should address but omitted. **Flag-don't-assert:** when a finding depends on runtime/code you can't see, FLAG it *needs-verification* — never assert "broken" (whole prior rounds were false alarms from confident "broken" calls the code disproved; on a delta, prefer "I can't verify X" over "X is broken"). The orchestrator validates before folding.

---

## Settled — do not re-raise (the shared ledger; current-only + bounded)

Every entry is a **verified** truth of this project/build — validate against reality, not training data; do NOT re-raise. A superseding fold **replaces** an entry (never appends a contradiction).

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
30. **Orders signal:** the nav blink keys off `unseen_count`; the numeric badge stays the unfulfilled count. Poster = one-per-product for v3.5. Reconciliation alerts go to the existing order-notify address. `?code=` share link: the link lands on the homepage root, so **`main.js` captures `?code=` site-wide → `sessionStorage` (§4.7.0)** and the `checkout.js` reader consumes the stash (reusing the auto-apply path), mutually exclusive with the store-wide auto-apply. **Wired end-to-end** — not a checkout-only reader.

**Round-2 folds (do not re-raise the closed halves)**
31b. **Storefront card renders — `shop.js`/`homepage.js` apply WS6 → WS4 → WS9** (ONE merged NEW per card block: the quantity-based `sold` state + struck price gated on `!sold` + the "One of a kind" badge). §6.5a/§6.3d carry the merged block; **§4.5.b/§4.5.f/§9.2 are POINTERS**, not standalone edits. `product.js` sticky is a semantic (not line) reconcile — §4.5.d struck gated on the same block-local `!sold`.
32b. **The "One of a kind" tile badge is CONCRETE** — `badge badge-unique`, copy "One of a kind", placement in `card__media`, gated `!sold`; full visual spec (class/copy/CSS/trigger) is **DESIGN §D.4**, render folded into §6.5a/§6.3d. The only open item is the render-tune trigger confirm (all-`!sold` vs non-featured) flagged in §D.4 — not a gap.
33b. **The server checkout/reserve gate is the intentional strict FOURTH sold-policy enforcer** (`checkout.ts:79`/`:205`, `available===true && quantity>=1`) — named so "three enforcers" isn't read as exhaustive. §6.5's null-fallback preserves (never introduces) the legacy display-vs-checkout edges; all fail safe. Do not raise it as a leak.

**Round-3 folds (do not re-raise the closed halves)**
34b. **`previewToken` is RE-DERIVED locally in `populateStickyCard`** (§6.5b: `new URLSearchParams(location.search).get('preview')`) — the function is top-level so the init handler's `previewToken` (`product.js:19`) is out of scope; referencing it directly threw a ReferenceError on every PDP. §4.5.d's struck gate intentionally does NOT preview-guard (a previewed draft SHOULD show its struck price).
35b. **The `.badge-unique` CSS is WRITTEN by IMPLEMENT §9.2a** (solid storefront tokens — `--bg-primary` + `--accent-primary`, no `color-mix()`), not just speced in DESIGN §D.4. The badge is gated **`!sold && !p.featured`** so it never overlaps Sold/Featured in the shared `card__media` corner (`styles.css:593`). "Show on featured too" is an optional stack-CSS upgrade in §D.4.
36b. **`main.js` §4.3.b (sale chrome) + §4.7.0 (`?code=` capture) share ONE `DOMContentLoaded` anchor** (`main.js:269`, after `initConfig()`) — listed in the coordination section; apply BOTH appends. **§2.4 Schedule gate keys off field-completeness** (`validatePublishRules`-equivalent), NOT a preview step. **Legacy `available:false` rows with stale non-null `quantity`** must get the `20260616000001` cutover backfill before a % sale (TESTING preflight) — the quantity-primary storefront gate assumes it (server checkout still fails safe regardless).

**Round-4 folds (do not re-raise)**
37b. **The three card badges are MUTUALLY EXCLUSIVE by gate** — Sold (`sold`), Featured (`!sold && p.featured`), "One of a kind" (`!sold && !p.featured`) — so **exactly one** renders per tile on both surfaces; no overlap, structural (not dependent on the homepage-all-featured invariant), and the **pre-existing Sold+Featured co-occurrence is retired** (Featured now gated `!sold`).
38b. **§2.4 Schedule gate — `out/products-app.js:47 readiness()` is VERIFIED field-only + reusable** (no preview step): gate on it directly; the fallback is a concrete inline field-check (§C.1 list), never "always offer."

**A-Type round-1 folds (do NOT re-raise as gaps):**
39. **WS5 §5.4c.i — re-role Apply diff algorithm authored**. `openedRoles`-baseline diff, per-item `added`/`removed` fan-out; the "naive rewrite → duplicate hero+gallery on PDP" failure mode is precluded by construction.
40. **WS4 Phase 4.0 probe — fourth answer added: SECOND `applyPromotionCode` = REPLACE vs STACK-AND-ERROR vs STACK-AND-BOTH**. `wirePromo` Apply-handler branch is encoded off answer (4); no downstream NEEDS-VERIFY.
41. **WS2 Phase 2.6 PostgREST `.or()` — runtime-gated try/catch with `console.warn` fallback** — never silently narrows the query; the "hides without explaining" failure mode is closed.
42. **WS4 Phase 4.5.i cart hooks — VERIFIED both exist**. `cart.html:170 [data-cart-subtotal]` + `:178 [data-cart-estimate]` — two-hook phase shape confirmed.
43. **WS2 A2-4 backstop — `logActivity` imports cleanly into `product-feed.ts`; concrete cron-actor insert authored**. `api/_lib/activityLog.ts` is a plain CommonJS module with its own per-invocation service-role client — no `feedAdmin` dependency.
44. **WS1 Phase 1.5 products-app wrap — concrete NEW block authored**. The three-statement wrap (env-chip IIFE + rail IIFE + `render`) is shown verbatim inside the `.then()`; `PORTAL.refreshOrdersSignal()` sits INSIDE the wrap so it never fires for a signed-out visitor.
45. **TESTING Preflight — one 30-second observable cron-gate assertion**. `curl` with the `CRON_SECRET` header MUST log "Reconciliation OK"; without the header the log line MUST NOT appear. Turns three silent env-presence NEEDS-VERIFYs into one visible check.
46. **DESIGN §D.4 "One of a kind on featured too?" — CONFIRMED NOT A GAP**. The default (`!p.featured` gate → no badge stack) is intentional; the upgrade path is a proper render-tune surface deferred to Sean on the live preview.

**Breadth-round-1 folds (do NOT re-raise):**
47. **WS10 GPT scheduled_publish_at instruction beat — CLOSED**. The `editProduct.scheduled_publish_at` schema description now teaches natural-time parse + confirm-back echo + publish-readiness verification + date-granular semantics. Zero instruction-`.txt` byte cost.
48. **WS5 §5.4c.i partial-failure recovery — CLOSED**. On any POST throw or non-2xx mid-fan-out: stop, mark `mItem.errored`, toast the failed role, preserve `openedRoles` on the failed item so re-Apply retries only the remaining diff (idempotent). R2 + `p.images` stay consistent; no "stuck modal" state.
49. **WS5 §5.4c.i gallery-NN sequential resolve — CLOSED**. Added-gallery roles resolve sequentially with `p.images` spliced after each POST so `nextNumberedRole()` sees the freshly-taken NN.
50. **WS2 A2-4 activity summary carries the piece title — CLOSED**. `select('id, title')` on the runtime-gated query, summary interpolates `row.title` so the Account activity card shows "Scheduled publish skipped — <title> not publish-ready".
51. **WS2 §2.6 PostgREST `.or()` → RUNTIME MECHANISM**. Try/catch on the `.or()` form; catch → re-issue query without OR + one-per-cold-start `console.warn`. Silent-narrowing failure precluded by construction.
52. **WS4 §4.0 STACK-AND-ERROR `wirePromo` byte-anchored skeleton — CLOSED**. One `try/catch` block: remove sale first, apply shopper code, on apply-throw best-effort re-apply the sale + friendly toast. Locate-and-apply on the existing click handler.

**Owner-decisions folds (do NOT re-surface):**
53. **WS6 §6.2d series-taxonomy reconcile — SETTLED path B (D-v361-1).** Nav/footer `?series=` deep-link slugs are **realigned in the templates to whatever `seriesSlug()` yields on the live catalog** — not the reverse. Concrete build step + files-to-touch + rationale spelled out inline. Reason for B over A: the portal is a reusable template; hardcoding catalog names would force a per-project catalog rename every time this template ships elsewhere.
54. **DESIGN §C.3 char targets — SETTLED path A + upgrade-path note (D-v361-2).** Ship **BARE counts by default** for on-page copy fields; SEO caps stay as `data-target`-driven `.is-over` (`seo_title ≤ 60`, `seo_description ≤ 155`). Upgrade path (does NOT ship now): per-field targets belong to the field DATA MODEL, not the design addendum — a future `FIELD_CONFIG` in `portal.js` (or `data-target-chars` attributes, or a Supabase `site_config` row for zero-code) is the right home.

**CONSOLIDATE step (v3.6.3 → v3.6.4 — do NOT re-raise as a fold-in-flight):**
55. **v3.6.4 CONSOLIDATE — the end-game clean-up read applied + verified by BOTH breadth lenses.** Living docs renamed `v3_6_4_*` via `git mv`; ~4.5 KB of round-N archaeology stripped (20 attribution parentheticals + 4 resolved NEEDS-VERIFYs + collapsed line-7 preamble revision paragraph); ALL CURRENT/NEW code fences preserved byte-identical; all phases (WS1 §1.1–1.5 · WS2 §2.1–2.8 · WS3 §3.1–3.4 · WS4 §4.0–4.7 · WS5 §5.1–5.5 · WS6 §6.1–6.5 · WS7 §7.1–7.3 · WS8 §8.1a–8.3 · WS9 §9.1–9.3 · WS10 §10.1–10.6), all 13 locked decisions, all 58 Doc-impact annotations, all 5 shared-file coordination bullets intact. **Owner-journey breadth READY** (cross-refs clean, drivability intact for all 8 named capabilities, no residual archaeology, no dangling grammar, zero new findings — see `v3_6_4_GAP_REVIEW_BREADTH_JOURNEY.md`). **Integration breadth READY** (invariants intact, sold-policy 4-enforcer preserved, `is_test` scoping preserved, PostgREST `.or()` runtime fallback byte-preserved, STACK-AND-ERROR `wirePromo` skeleton byte-preserved, WS5 §5.4c.i three-bullet re-role diff byte-preserved, GPT budget math projecting 7988/8000 survived, code-fence parity 474 (even) in IMPLEMENT — see `v3_6_4_GAP_REVIEW_BREADTH_INTEGRATION.md`). Do NOT re-flag "the consolidation dropped X" — both lenses verified byte-preservation.

**High-frequency FALSE-ALARM classes (seen in prior loops — do not raise without new evidence)**
- "This needs a new API function/cron" — no; it folds into an existing one (entries 1-2, 17-19).
- "The refund/store-wide-sale doesn't exist / must be built from scratch" — the foundations exist (13, 17); this is a display/preserve delta.
- "`shipping_address` is only nested" (14) · "`upload.ts` must change" (15) · "`data-flow.md:55` is the sold rule" (20, superseded).
- "`getCartTotal`/`getCart` aren't in scope on `/checkout`" — they are **`main.js` globals** (`:104`/`:167`) and `main.js` loads on every storefront page · "the Orders-nav badge class `.badge` won't match `mountShell`" — it does · "WS3's line-911 `authHeader` is unsatisfied" — satisfied by WS1 §1.3b.

---

## Angle A — cold / out-of-repo (FINAL NARROW cold pass — the gate-exit read)

```
⚠️ FINAL NARROW COLD-A PASS — the gate-exit read. This is the CONSOLIDATED v3.6.4 triplet after the end-game clean-up (DEV_RULES → End-game). Round-1 A returned NARROW with 10 findings; 8 folded (ledger 39-46), 1 not-a-gap (ledger 46), 2 became owner decisions (ledger 53-54). Round-1 breadth added 6 folds (ledger 47-52). CONSOLIDATE step (ledger 55) stripped ~4.5 KB of round-N archaeology, verified byte-preservation by BOTH breadth lenses (owner-journey + integration both READY, zero new findings). YOUR SCOPE THIS ROUND = a fresh cold read of the CONSOLIDATED triplet, running the SAME lens that ran round-1, confirming NOTHING LOAD-BEARING REMAINS. This is the presumed-last round.

You are a senior engineer, effort MAXIMUM, docs ONLY (no repo — Angle A's constraint). Do NOT change anything; write findings to `v3_6_4_GAP_REVIEW_A.md`.

[REVIEW LENS — paste parts (a)(b)(c) verbatim from above]
[SETTLED BASE — paste the delta-on-proven-substrate paragraph]
[LANDMINES — paste the full "Settled — do not re-raise" ledger, entries 1-55 + the false-alarm classes]

READ ALL THREE DOCS END-TO-END (do NOT skim — the condensation made them shorter but no less dense). Judge the CONSOLIDATED build against the full lens: exclusively-executable (a fresh builder LOCATES-and-APPLIES every step, nothing left to DISCOVER or DECIDE), unvalidated assumptions FLAGGED (not asserted broken), design-correctness (renders as speced given the delta framing), owner-journey drivability (Em can drive every capability in BOTH the portal AND the GPT, mostly from her phone), integration fit against the settled base.

The consolidation was archaeology-stripping only. If you find a real, load-bearing gap that survived rounds 1-4 + the round-1 A + breadth + owner-decisions + CONSOLIDATE steps, name it precisely with the workstream/phase/anchor. If not, verdict READY TO BUILD → the gate CLOSES and this hands to the formal Agent-SDK execution driver (v4.0.0 execution copy is the next MAJOR phase).

OUTPUT — same 3-part structure written to `v3_6_4_GAP_REVIEW_A.md`:
  1. Ranked list of findings (empty if none; each finding names the exact workstream/phase/line/anchor + a plain-language failure-scenario).
  2. "If you fix one thing" (or "nothing load-bearing" if the list is empty).
  3. Verdict: READY TO BUILD · NEEDS ANOTHER PASS · NEEDS ANOTHER PASS (NARROW).

[paste v3_6_4_IMPLEMENT.md + v3_6_4_ADDENDUM_DESIGN.md + v3_6_4_ADDENDUM_TESTING.md in full]
```

## Angles B / C / D — OMITTED this round

They ran first-pass in v3.6.0/3 and stayed closed (B fidelity + C integration + D design-correctness). The v3.6.3 → v3.6.4 consolidation touched NO lane (no CURRENT/NEW fence edited, no phase/decision/table/Doc-impact annotation removed), so per the angle-by-angle closure rule (DEV_RULES §The Gap-Review Gate) they stay closed. The 2-subagent breadth pass ran on v3.6.4 and both returned READY (see `v3_6_4_GAP_REVIEW_BREADTH_{JOURNEY,INTEGRATION}.md`). If the final cold-A pass surfaces a NARROW residual in a specific lane, that lane's angle re-runs SCOPED to the named delta; else the gate exits with cold-A alone.

---

**Verdict trichotomy** (the one-liner): **READY TO BUILD** · **NEEDS ANOTHER PASS** · **NEEDS ANOTHER PASS (NARROW)** — NARROW = "almost there, only a bounded area left," which would trigger one more surgical fold + one more cold-A. **READY TO BUILD** exits the gate → Sean drives the formal Agent-SDK execution + the v4.0.0 execution-copy cut. The per-angle GAP_REVIEW files are kept standing (the rigor trail); THIS prompts file is current-only (rename on bump).
