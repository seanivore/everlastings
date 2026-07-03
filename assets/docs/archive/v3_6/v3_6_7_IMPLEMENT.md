# v3.6.7 Implementation Plan — the Content Creator Portal redesign + the v3.5 store/checkout backlog

> **📁 Directory note (read first).** This `v3_6/` package is the **formal Agent-SDK A-Type gate copy** of the converged v3.5.5 build docs. The three living docs live here in `assets/docs/archive/v3_6/` (`v3_6_7_IMPLEMENT.md` + the two addenda). **All source material — the design handoff (`design-handoff/…`, `out/…`), `v3_5_0_ROADMAP.md`, the GPT base files, `v3_5_0_RATIONALE.md` — lives in the SIBLING `assets/docs/archive/v3_5/` directory.** Every `design-handoff/…`, `out/…`, and `v3_5_0_…` path in these docs is relative to that `v3_5/` dir. The frozen in-session `v3_5_5_*` copies + the full `GAP_REVIEW_*` rigor trail (rounds 1–4) also remain in `v3_5/`.

**Initiative**: One dev cycle (built/tested on `dev`, shipped to `main` only when Sean signs off) that (1) integrates the finished **Content Creator Portal** front-end design (`assets/docs/archive/v3_5/design-handoff/out/`) as the new `/admin`, preserving the backend-complete management contract while adopting the mobile-first, intent-based, brand-neutral redesign; (2) builds the **automatic store-wide sale** display/auto-apply layer + storefront struck-pricing + a thin utility bar + a once-only popup (ROADMAP #219–222) on top of the existing coupon foundation; (3) rebuilds the **media upload** UX to the designed modal; (4) reconciles the **sold-policy / product-state** model to Sean's final word (§3.6 + PRODUCT_LIFECYCLE policy C); (5) fixes the discrete **storefront bugs** (product-page fields, series filter, featured carousel, /complete order-id) and **webhook/money-integrity** items (#228 even-split, #224 cart-hold removal, #227 reconciliation); (6) adds the **activity log** + **seen/unseen order tracking** + **scheduled publish**; (7) researches **buy-on-tile** (#225) and builds it iff the lift is real; (8) restores **GPT/admin parity** for the sale + folds the shared-payment refund guidance (#222/#228 GPT half).

**Revision**: consolidated at v3.6.4; QA pre-flight at v3.6.5; round-1 cold-A + breadth folded at v3.6.6; **v3.6.7 — owner decision RESOLVED + its forward fold.** Sean's call on the round-1 surfaced decision: the **strict publish gate STANDS** for every piece (no grandfather, no backfill) — there is **no live catalog yet** (empty), so nothing predates the strict rules, and products were always intended to carry the full field set. The one forward requirement Sean flagged is folded: **both surfaces + the admin docs must COLLECT the full publish-required set** so a maker never hits a confusing publish-400. §2.7's decision block is now RESOLVED; a new **WS10 §10.1c** flags the seven publish-required detail fields (`dimensions, weight, features, materials, care_instructions, shipping_details, quantity`) as "required to publish" on the GPT `createProduct`+`editProduct` schema (schema-only, **no instruction-`.txt` byte** — the `.txt` stays 7988/8000), so the GPT gathers them up front like the dashboard does; STORE_ADMINISTRATION.md + the PRODUCT-REFERENCE knowledge file gain the required-to-publish set (§10.6 doc-impact); TESTING item 6b is reframed to test the strict gate on BOTH surfaces. Folds to date: round-1 A + round-1 breadth + owner-decisions + this decision (see REVIEW_PROMPTS ledger 39-72). Rationale stays inline through the pre-execution loop; relocates to sibling `RATIONALE.md` only at the v4.0.0 execution cut (DEV_RULES → Build Guide Final Cuts).

**Required reading first**: `assets/docs/EVERLASTINGS_STORE.md` · `README.md` · THIS doc + its two addenda **in this same `assets/docs/archive/v3_6/` directory** (`v3_6_7_ADDENDUM_DESIGN.md`, `v3_6_7_ADDENDUM_TESTING.md`) · the design handoff (in the sibling `v3_5/` dir per the directory note above) in its own read order — `design-handoff/out/INTEGRATION.md` → `out/PRODUCT_LIFECYCLE.md` → `design-handoff/brief.md` → `design-handoff/data-flow.md` → the `out/` files (`products.html`+`products-app.js`, `orders*`, `sales*`, `account*`, `portal.css`, `portal.js`, `data.js`) → `design-handoff/controls.html`+`tokens.css` → `design-handoff/feedback/FEEDBACK_v1.md` + `design-handoff/reference/` → `out/README.md` · `assets/docs/archive/v3_5/v3_5_0_ROADMAP.md` · `.agent/DEV_RULES.md`.

**If you find missing context**: `EVERLASTINGS_STORE.md` is living — confirm with Sean and update it; don't paper over the gap here.

> **Status / depth.** This is the **initial planning draft** entering the fresh-instance gap-review gate — NOT yet the clean execution copy. Backend reconciliations + new backend (WS2 state semantics, WS4 sale extension + public read, WS5 upload, WS6 storefront fixes, WS7 webhook/money, WS8 activity log, WS9 buy-on-tile) are **byte-anchored** where the code is settled (exact CURRENT/NEW — line numbers are hints, the quoted CURRENT text is the anchor; STOP + reconcile if it drifts). The **presentation-integration** workstreams (WS1 shell, WS2/WS3/WS4 the per-surface data→API seams) carry **integration-seam tables** (each mock/no-op `<surface>-app.js` call → its real endpoint) rather than full byte-blocks, because the delivered `out/` files are the canonical markup source — see `v3_6_7_ADDENDUM_DESIGN.md`. Design ships as concrete-default + render-tune per DEV_RULES; the verification plan is `v3_6_7_ADDENDUM_TESTING.md`.

> **The delta framing (name the settled base).** The current system — all of `EVERLASTINGS_STORE.md` + the repo as it stands on `dev` today — is **built, tested, and live/approved**: the fixed substrate. This build is a **delta** on top: a *presentation swap* of `/admin` (the backend it calls is already complete) + a **defined set of new/changed backend** (the sale display/auto-apply layer, the upload rebuild, the state-semantics reconciliation, the money-integrity fixes, the activity log). Review the delta for gaps + whether it FITS the base; don't re-litigate settled/shipped behavior.

---

## Orchestration — the execution blueprint (evaluate at execution time)

This is a complete plan-it-all. At execution (after the gate clears → v4.0.0) it carves into parallel **TRACK BUILDs** by execution boundary; the arrangement below is the starting suggestion, not a contract.

- **Foundation first (blocking):** **WS1** (portal shell / routing / design-system / `portal.js` env wiring) — every portal surface renders in it; and **WS8's schema + activity-log write-helper** early, so WS2/WS3/WS4/WS5 instrument their own mutations at build time (no pass-through).
- **Then, in parallel:**
  - **Track B:** WS5 media backend (`api/upload.ts` + persisted image order) → WS2 Products surface (the editor's media display consumes WS5's shape).
  - **Track C:** WS3 Orders surface + WS8 seen/unseen wiring.
  - **Track D:** WS4 Sales surface + store-wide-sale layer (gated on the #219 probe) + storefront struck-pricing.
  - **Track E:** WS6 storefront bugs + WS9 buy-on-tile (independent of the portal).
  - **Track F:** WS7 webhook / money integrity (independent).
- **Last, sequenced:** WS10 GPT + docs parity (needs WS4's sale surface defined), then the **as-built `EVERLASTINGS_STORE.md` doc-sync** — a **fresh agent**, line-by-line, NEVER the tail of the build session (see the As-built section).
- **What NOT to delegate** (orchestrator-owned): gate/promotion calls, branch state + commit cadence, escalation when a decision-shaped question surfaces (stop → surface to Sean, never decide), the end-to-end verification reads, and any file that ships verbatim (the GPT instruction `.txt` — re-run `wc -c` < 8000).
- **Placeholders as decouplers:** the design layer builds against the `out/` markup + class names and the `data-flow.md` field/endpoint contract; a design subagent and a backend subagent run in parallel against that stable contract. The `#219` probe result is a placeholder the WS4 auto-apply path resolves against (a documented fallback lets WS4 proceed if auto-apply-at-init proves unreliable).

### Shared-file edit coordination (single-edit regions — the workstreams were drafted independently)

Three backend files are edited by more than one workstream. Apply their edits in the fixed order below and **re-anchor each stacked edit against the tree as the prior edit left it** (line hints drift; the quoted CURRENT text is the anchor). This is the one place the independently-drafted sections overlap.

- **`api/products.ts` — order: WS2 → WS4 → WS8.**
  - *GET dispatch* (around the `?_action=coupon` branch, ~:70-71): **WS4** inserts the public `?_action=active_sale` branch **just BEFORE** the coupon branch (§4.2.a — public/no-auth read ahead of the auth'd list) **and WS8** inserts the admin `?_action=activity` branch **just AFTER** the coupon branch (§8.1d). The two BRACKET the coupon branch (active_sale · coupon · activity) — they are NOT adjacent to each other; each anchors on the coupon line independently.
  - *PUT handler*: **WS2** is the sole editor (available-off→draft, `scheduled_publish_at` set/clear, the new response flags).
  - *`handleCoupon`* (~:735 metadata, ~:745 return): **WS4** stamps `metadata.auto_apply` + the supersede-prior sweep, **WS8** wraps the return with a `sale.create` log — WS4's edits land first, then WS8's log.
  - *`handlePublish`* (~:635 edit-publish update, ~:676 first-publish update): **WS2** edits the update objects (clear `scheduled_publish_at`, auto-generate `checkout_*`/`seo_*`), **then WS8** adds the `product.publish` log before each return.
  - *Validation*: **WS2** renames `validateProductRules`→`validatePublishRules`, adds `validateCreateShape`, and retargets the 3 call sites — do this FIRST so WS8's logging inserts reference the post-split success returns.
  - *`publicView`* + create/edit success returns: **WS2** owns the shape; **WS8** wraps each success return with a `logActivity` call.
- **`api/product-feed.ts` — WS2 + WS7 merge into ONE edit; apply order WS2 (2.6) → WS7 (7.3), re-anchoring 7.3 against the post-2.6 tree.** Both need a service-role client + a job in `GET`. **WS2 2.6 establishes the single service-role client `feedAdmin`** (one `const`) + imports `isTest` + defines `publishDueScheduled`; **WS7 7.3 reuses `feedAdmin`** (does NOT re-declare it), adds the stripe/email imports, and defines `isCronRequest` + `reconcileOrders`. **BOTH jobs run inside ONE `isCronRequest(req)` gate at the top of `GET`** — `if (isCronRequest(req)) { try { await publishDueScheduled(req) } …; try { await reconcileOrders() } … }` — so a public/preview feed poll (Google/Meta, or a preview hit) NEVER self-publishes or reconciles. `publishDueScheduled` scopes `.eq('is_test', isTest)` so a preview cron scans TEST rows and prod scans LIVE (the `is_test` isolation the ungated per-GET version broke). Do NOT create two clients, two `GET` wrappers, or run either job outside the gate.
- **`api/orders.ts` — WS3 + WS8 together.** WS3 adds the mark-shipped `409`-refunded guard (PATCH) + the `shipping_address` read-resilience + the `delivered` UI prune. WS8 adds `logActivity` calls + the `?_action=seen` action + `last_viewed` in GET + a `const actor` in POST. The `actor` const and the POST `_action` dispatch fork are **single-definition** (WS8 adds them; WS8's refund log uses `actor`) — WS3's refund phase must not also declare `actor`.
- **`assets/js/shop.js` + `assets/js/homepage.js` — order: WS6 → WS4 → WS9 (ONE merged NEW per card-render block).** WS6, WS4, and WS9 all edit the SAME card-render line(s): **WS6** (§6.5a shop card / §6.3d homepage tile) rewrites the whole render block for the quantity-based `sold` state; **WS4** (§4.5.b / §4.5.f) makes the `card__price` struck; **WS9** (§9.2) adds the "One of a kind" badge in `card__media`. Their CURRENT anchors are the SAME pristine lines, so applied independently the last edit silently reverts the others (WS6-last drops the struck price; WS4-last breaks WS6's block anchor — a headline feature vanishing with no error). **Apply WS6 first (its block rewrite is the base), then fold WS4's struck value + WS9's badge INTO that block as ONE merged NEW:** §6.5a and §6.3d carry the fully-merged block; **§4.5.b, §4.5.f, and §9.2 are POINTERS into it, not standalone edits.** The struck price is gated on **`!sold`** (never a struck sale price on an unbuyable piece — DESIGN §D.1 "Sold items always render plain"). *(`product.js` sticky card is NOT a line collision — §4.5.d [`:369`] and §6.5b [`:382`] land on different lines — but §4.5.d's struck gate is still reconciled to the same quantity-based `!sold` via a block-local `sold`, so a qty-0 piece never renders struck on its PDP.)*

- **`assets/js/main.js` — WS4 §4.3.b + §4.7.0 both append to the SAME `DOMContentLoaded` handler** (`main.js:269`, right after `initConfig()`): §4.3.b mounts the sale chrome (`getActiveSale().then(mountSaleChrome)` — top bar + popup), §4.7.0 captures `?code=` → `sessionStorage`. They compose in **any** order (neither touches the consent/config work already in that handler), but a builder must apply **BOTH** appends — do NOT treat `main.js` as single-owner or as "distinct functions." (`getCart`/`getCartTotal`/`priceHTML` are separate top-level `main.js` globals, untouched by these two.)

Everywhere else each file has one owner or genuinely non-overlapping regions (`checkout.js`/`cart.js` in WS4·WS7 by distinct functions — the `checkout.js` `?code=` reader (§4.7) vs. its other handlers; the `out/*-app.js` surfaces in WS1·WS2·WS3·WS5·WS8 by distinct functions; and the migrations). The two storefront exceptions — `shop.js`/`homepage.js` card renders (WS6+WS4+WS9) and `main.js`'s shared `DOMContentLoaded` (WS4 §4.3.b + §4.7.0) — are the two bullets directly above.

---

## Goal (the thesis this build serves — settled)

**Minimize the maker's friction to run her store, mostly from her phone.** The portal's innovation is **simple, entropy-lowering details** — a per-row state LED, field-border color rings, hard toggles, preview-anytime — wrapped in **familiar layouts** (a spreadsheet of rows, plain forms). Organize around **intent, not the data model** ("put this up," "take it down," "run a sale," "send a refund," "mark it shipped") — the maker never has to understand "drafts vs staged vs live columns" or "payment-intent-level refunds." **Nothing hides without explaining** (a disabled control shows and says why). **Mobile is the primary context.**

**The parity rule (standing principle):** every management capability is equally doable in **the portal** AND the **Custom GPT** — the GPT could be down, and the portal is easier for some moods. Design for the reusable-template **"User,"** not for Emy specifically.

## Parity audit (what's already there, what the redesign must preserve, what's new)

- **Backend already complete** (the redesign wires to it, doesn't rebuild it): products list/get/create/update, draft→preview→publish, discard, archive/unarchive, live-apply price/quantity/available, coupons create/list/deactivate (incl. store-wide), orders list/mark-shipped, **refund** (amount-based, sibling-aware, Stripe-merged, per-piece relist — already works; see WS3), upload (the 7 role-zones + by-link + multipart + chat-attach). Auth (`PRODUCT_API_KEY` Bearer OR admin Supabase JWT) unchanged.
- **The redesign MUST preserve** (don't lose these in the presentation swap): the two-speed field behavior (live-apply price/quantity/available vs staged `draft` overlay), the **client-side `effective` merge** (`admin.js:310` — `GET ?id=` returns the raw row, no `effective`; keep merging client-side), the sibling-aware refund panel (`GET ?payment_intent=`), the coupon scope picker, and the strict upload role enum.
- **Genuinely new / changed:** the store-wide-sale **display + auto-apply** layer + storefront struck-pricing + top bar + popup (WS4); the **media modal rebuild** + persisted image order (WS5); the **state-semantics reconciliation** (available-off→draft; WS2); the storefront-field render + 3 discrete bug fixes (WS6); the webhook even-split + cart-hold removal + reconciliation (WS7); the **activity log** + seen/unseen + **scheduled publish** (WS8/WS2); buy-on-tile (WS9, research-gated).

## Invariants (hold in every phase)

- **CommonJS / tsc-clean.** `npx tsc --noEmit -p tsconfig.json` clean after each TS edit (api/*.ts compile to CommonJS — ES2020 output crashes the deployed runtime).
- **No new Vercel serverless function.** We are at **11/12** on Hobby — one slot free, reserved as headroom, not spent. The store-wide-sale set/end + the **public active-sale read** fold into `api/products.ts`; the activity-log read folds into `api/products.ts`; nothing adds an `api/*.ts` file. Function count unchanged.
- **No new cron.** We are at 1/1 usable cron (`/api/product-feed` daily). Scheduled-publish's flip and the #227 reconciliation both fold into that **existing daily function** (the feed's Supabase read already serves as the DB keep-alive). Cron count unchanged.
- **Sold-policy consistency (cross-cutting — the reviewers' highest-value check).** The state model is honored identically in three places: the portal's `computeState()` (WS2), the storefront buy-gate (WS6), and the webhook decrement (WS7). See *Locked decisions → Product state / sold policy*.
- **`is_test` isolation holds.** Every order/product/sale lookup is scoped by `isTest` (`api/_lib/env.ts`); a test-env action can never touch a live row; the Stripe secret key is already env-scoped.
- **Auth unchanged.** `requireAdmin` (orders) / `authorize` (products/upload) accept `PRODUCT_API_KEY` **or** an admin Supabase JWT — no new auth.
- **No hard delete anywhere.** "Delete" = archive; everything is revivable (archive↔resurface, sold↔relist, draft↔publish). Mirrors Stripe (`product.active=false`, a price change is a new Price, never an in-place edit).
- **Single-admin operation (scope boundary).** One operator at a time; reads-then-writes without cross-tab/cross-operator locking. Multi-seat is out of scope (a future formal effort, never patched piecemeal here).
- **Money in integer cents everywhere.** Render with the portal's `PORTAL_DATA.money()` / storefront `formatPrice()`; never store or compare dollars.
- **Brand separation.** The portal is **cool indigo-slate** (a reusable template), deliberately distinct from the storefront's **warm-plum** Everlastings brand. The storefront brand is untouched except the WS6 fixes + the WS4 struck-price/top-bar/popup additions (which use the storefront's own tokens, not the portal's).
- **GPT instruction char budget — hard cap 8000.** Any WS10 instruction add re-runs `wc -c` on the shipped `.txt`; over-cap, the GPT silently truncates its own instructions.
- **Reduced-motion preserved.** Portal motion is "weight, not bounce" and honors `prefers-reduced-motion`; the storefront hero's reduced-motion fallback stays.
- **The go-live cutover is untouched.** ROADMAP section A (Em-gated) is a separate runbook, not this build.

---

## Roadmap (coarse direction — NOT a build queue)

1. **Portal shell** — stand up the 4 designed surfaces as the new `/admin`; design system, nav, routing, env chip.
2. **Products** — the spreadsheet + row→editor, wired to the products API; state-semantics reconciliation; scheduled publish.
3. **Orders** — the CRM surface; preserve the working refund + mark-shipped; small reconciliations.
4. **Sales + store-wide** — the sale surface; the auto-apply + struck-price + banner + popup layer over the existing coupon foundation.
5. **Media** — the rebuilt upload modal + persisted image order.
6. **Storefront bugs** — product-page fields, series filter, featured carousel, /complete order-id.
7. **Webhook / money** — even-split, cart-hold removal, reconciliation.
8. **Activity log + seen/unseen** — audit trail; the new-order signal's data source.
9. **Buy-on-tile** — research-gated micro-build.
10. **GPT + docs parity** — sale parity, initiative nudge, refund guidance, vocabulary, rules.

## Locked decisions (confirmed — the builder chooses nothing)

**Product state / sold policy (§3.6 + PRODUCT_LIFECYCLE policy C — Sean's final word).** Three orthogonal things: (a) the **record** (never deleted), (b) **publish state** — Live (published) / Draft (never-published or unpublished) / Archived (retired = Stripe `active=false`), (c) **inventory** — the `quantity` number; `quantity=0` = **Sold**. Rules:
- Turning the **Available toggle OFF on a live product → makes it a Draft** (unpublish/hide), NOT "sold." Turning Available back on from a row prompts to add stock if quantity is 0.
- **Sold** = `quantity` hits 0 from a **real sale** (automatic). Everlastings is one-of-a-kind, so **Sold is a persistent category kept until the maker Archives it** (a browsable record of past work). Sold/archived pieces also have Available off, but that's a *consequence*, not the user action.
- **Wording is "Sold"** (a completed, archived-eligible sale), NOT "Sold out / out of stock" (which implies a restock that never comes).
- **`computeState()` is the single source of truth** for the dot/word (precedence: `archived > draft > staged-edits > sold(qty0) > live`); the only per-policy variable is which tab `sold` falls under (Everlastings = its own **Sold** tab). The row LED colors **ALL FIVE states** per the delivered `out/` (`products-app.js:91 ledFor()` → `.led--{state}`; `portal.css:401-405`): green=live, orange (`--waiting`)=staged-edits, yellow=draft, blue (`#297fb4`)=sold, purple-gray (`#83718a`)=archived. Sold + archived **ALSO** appear as tabs — **both the LED color AND a tab, not either/or** (Sean's FEEDBACK §3 + `out/README.md`). (live/draft/edits blink; sold/archived are steady.)
- **The Orders "unseen" blink is removed from the Sold tab** (PRODUCT_LIFECYCLE) — Orders carries its own signal; Sold means only "pieces that have sold."
- **SUPERSEDED:** `data-flow.md:55`'s `is_published && !available → sold` is wrong under this policy and is annotated superseded in the DESIGN addendum (a dead-end decision kept in context, not silently deleted).
- **Storefront buy-gate = `published && quantity > 0`** (WS6), independent of the admin tab, so a Sold item is never accidentally purchasable.
- Future: a per-type/per-product `restockable` flag would switch multiples (prints/merch) to "stay Live as Sold out" — **out of scope**, noted so it isn't lost.

**Store-wide sale (ROADMAP #220; the foundation already exists — this is the display/auto-apply layer).**
- **Represented as ONE owner coupon** (percentage sales only for on-site struck pricing; `$`-off stays a checkout code) tagged `metadata.source='owner_sale'` **+ `metadata.auto_apply='true'`** + a known promo code. NO new `discounts` server param (mutually exclusive with `allow_promotion_codes`; keep `allow_promotion_codes:true`).
- **Auto-apply at checkout:** the storefront auto-applies that promo code on Custom Checkout load → the shopper types nothing (feels code-free); the keyword field **stays visible + removable/replaceable** (delete the sale code, enter a personal newsletter code — Stripe allows one discount/order). **GATED on the #219 probe** (does Stripe.js `applyPromotionCode()` fire reliably at `ui_mode:'custom'` session init for the loaded bundle — docs are unreliable, probe on the dev preview). Documented fallback if unreliable: apply on first interaction / prefill the field + a one-tap apply.
- **Backend folds into `api/products.ts`** (extend `handleCoupon` with the `auto_apply` marker; add a **public GET** returning the active auto-apply store-wide sale — code + percent — for the storefront). **No new function.**
- **On-site display:** struck **%** sale prices on shop cards + product page + cart/total; a thin **top utility bar** (free-shipping reminder normally, sale line when active) + a **once-only** upper-right popup (brand-fitting, dismissible, `localStorage`-gated). These use the storefront's own tokens.

**Refund (WS3 — PRESERVE, not build).** The amount-based, sibling-aware, Stripe-merged refund with per-piece relist **already works** (`orders.ts:246-341` + `admin.js:1005-1122`). The redesign **ports the existing refund UI into `orders-app.js`** unchanged in behavior: load all pieces by PaymentIntent, pre-check the clicked piece, auto-sum the amount but keep it freely editable, relist as a separate per-piece choice (also doable later). INTEGRATION §3.11 is a preserve-this note.

**Editor field rules (§3.3–3.8).** Required-field publish gate uses Sean's authoritative set (`title, slug, headline, description, price, quantity, product_type, story_card, features, materials, care_instructions, shipping_details, dimensions(W·D·H), weight, hero image, ≥5 gallery images, alt text on every media`) + **required-but-auto-generated-if-blank** (never block publish): `seo_title, seo_description, checkout_name, checkout_description, checkout_image, seo_thumbnail` — generated server-side from other fields if empty. **Optional:** `series`, `artist_note`. **Only `product_type = miniature` is in scope** (the picker must not offer printable/storybook — the API validates every type as miniature; a new type is separate development). **Dimensions = 3 inputs (W/D/H)** assembled/parsed to the `dimensions` string; **validate-and-auto-format, never reject** a good value (coerce; show the expected format in the label tooltip) — same for `weight`. **List fields** (`materials, features, care_instructions, shipping_details`) are one-item-per-line textareas ↔ `string[]`, with a live bullet preview. **Auto-save on close** (click the sticky row / click outside on desktop / ✕ on mobile) → `PUT /api/products` (a draft if new, staged edits if published); the explicit **Save** saves and returns to the list. **Publish requires a Preview** for a new, never-published product (the preview page carries the real Publish via `preview_token`). **Lock-after-publish** (show locked, not missing): `slug, checkout_name, checkout_description, checkout_image`.

**Media (WS5 — full rebuild).** Rebuild `api/upload.ts` + the editor media modal to the FEEDBACK_v1 §8 spec: batch upload / drag-drop / URL / YouTube embed; per-image **role checkboxes** with logic (one hero; hero≠gallery; share/checkout/poster combine freely); per-video **Loop / Mute / Hide controls / Autoplay**; required **alt text** on every item; reorder with **persisted image order**; a coverage counter ("hero ✓, gallery 5/5"); "hero is reused for share/checkout if those are missing." Its own review pass.

**Scheduled publish (WS2 — no new cron).** `scheduled_publish_at` (ISO) column + a "Scheduled · <when>" chip; the **flip folds into the existing daily `product-feed` cron** (date-granular). An **optional lazy on-read flip** (a past-due scheduled draft flips live when next read) adds time-precision without a new cron — decide during authoring/gate. The schedule control ships working (never a dead button).

**Activity log (WS8 — IN).** A Postgres `activity_log` table (`id, at, actor, action, summary, entity_id?, meta?`); a **write-helper** called from every mutating endpoint (publish, save-draft, create/end sale, refund, mark-shipped, archive, …) at the same call sites; a read (most-recent ~25) folded into `api/products.ts` feeding the Account surface's activity card.

**Seen/unseen (WS8).** A `last_viewed` notion clears the Orders-nav blink; the blink is removed from the Sold tab (see sold policy).

**Reconciliation (#227 — WS7, IN, folded into the daily feed).** The existing `product-feed` cron gains a second job: compare Stripe's completed checkout sessions vs the `orders` table for the day → email Sean on any paid-session-without-order gap (do NOT email on raw signature-400s — bot noise). The Stripe-native webhook-failure email (the "immediate half") stays an ops step, not code.

**Storefront fixes (WS6).** Product page renders the missing detail fields (add populate code — they're never read today); series filter slugifies both sides + reconciles the taxonomy; featured carousel becomes independent horizontal-scroll rows (Netflix-style; ≤5 = one row, >5 = ~3-per-row decoupled scrollers); /complete drops the raw `cs_…` id (or shows a short friendly reference).

**Buy-on-tile (WS9 — research-gated).** Build a tile-level buy affordance **iff** the conversion research shows a real lift for one-of-a-kind emotional purchases; if built, reuse the existing buy-now/cart logic. Decision recorded before the gate.

**Portal routing.** Keep the `/admin` base — serve the 4 pages under `/admin/*` (generalize the existing `/admin` rewrite); bookmarks/GPT/muscle-memory unchanged. **Site title** on every portal page: `Creator Portal | Everlastings by Emaline` (generic admin paths are a bot target; the title doesn't advertise "admin").

**`GET ?id=`.** Keep the **client-side `effective` merge** (don't touch the hot public GET path to add server-side enrichment). The portal editor merges `draft` client-side exactly as `admin.js:310` does today.

---

---

## WS1 — Portal shell / routing / design-system / env wiring

> **Foundation. Adopt the out/ markup verbatim (DESIGN addendum is the markup source); byte-anchor the routing + config wiring.**

This workstream stands the delivered 4-page portal up under the existing `/admin` base and preserves the current auth/config bootstrap — it changes **routing** (`vercel.json`), **shell wiring** (`portal.js`), and the **auth surface** (`account-app.js`); it does not touch product/order/sales *logic* (later workstreams swap `data.js`'s mock arrays for the documented endpoints). Invariants held here: **no new serverless function** (auth reuses the existing `/api/config` + the CDN `@supabase/supabase-js`), the **`/admin` base stays**, the portal keeps its **cool indigo-slate** tokens (lifted verbatim in `out/portal.css` / `design-handoff/tokens.css` — the storefront plum is never imported), and there is **no `api/*.ts` edit**, so `npx tsc --noEmit -p tsconfig.json` stays trivially clean.

*(Design/topology already confirmed by the handoff: `INTEGRATION.md §3.1` fixes `PORTAL.env()` to the hostname rule below, §165 fixes the env-aware View Site, and §"Site title" fixes the generic title — WS1 wires to those, it does not re-decide them.)*

---

**Phase 1.1 — Land the `out/` package in `admin/`; retire the old SPA; harden each shell's `<head>`.**

*1.1a — copy the eleven runtime files into `admin/` (verbatim).* The delivered runtime set is `portal.css`, `portal.js`, `data.js` (3), the four shells (`products.html`, `orders.html`, `sales.html`, `account.html`), and the four surface apps (`products-app.js`, `orders-app.js`, `sales-app.js`, `account-app.js`) — **eleven** files, all currently in `assets/docs/archive/v3_5/design-handoff/out/`. Copy those **eleven** into `admin/` unchanged (WS1's own diffs are Phases 1.3–1.5; later workstreams make their own named surgical `*-app.js`/markup edits — WS2 miniature-only picker, WS8 Sold-tab alert removal, WS3 Delivered-pill removal, the `--staged` token fix — see DESIGN §A's surgical-edits list). The three docs (`README.md`, `INTEGRATION.md`, `PRODUCT_LIFECYCLE.md`) stay in the handoff dir — **do not ship them**. All internal references are relative (`<link href="portal.css">`, `<script src="data.js">`, rail hrefs `products.html`…), so under `admin/` every asset resolves as `/admin/<file>` with zero path rewriting.

*(`data.js` ships as the mock so the shells render on day one; its arrays are the integration seam — later workstreams replace them with the `/api/products|orders` responses per `INTEGRATION.md`. Its `config` object is mock too; real config now comes from `PORTAL.config` via `/api/config`, wired in Phase 1.3.)*

*1.1b — retire the single-page admin.* Delete `admin/index.html` (the 431-line 3-tab SPA). Its only outbound reference — the module load `admin/index.html:429` `<script type="module" src="/assets/js/admin.js"></script>` — dies with it, so `assets/js/admin.js` becomes unreferenced (verified: the only other `admin.js` mention in the tree is a stale code *comment* in `api/products.ts:392`, not a load). Keep `assets/js/admin.js` **on disk, unshipped, as the canonical logic port-source** for the data-wiring workstreams (its product/order/coupon calls + the auth bootstrap re-used in 1.3 are the reference); delete it in the redesign's final cleanup once the four `*-app.js` reach parity. <!-- NEEDS-VERIFY: confirm no build/deploy manifest bundles assets/js/admin.js independently of the index.html load before final deletion -->

*1.1c — add `robots` noindex + confirm the title, in all four shells.* The retired SPA carried `<meta name="robots" content="noindex, nofollow" />` (`admin/index.html:6`); the delivered shells dropped it. Generic `/admin/*` paths are a bot target — restore noindex on every page. The title is already correct verbatim (locked decision + `INTEGRATION.md §Site title`) — confirm, don't retype. **CURRENT (`account.html:6-8`, and byte-identical in the other three shells):**
```html
<meta name="color-scheme" content="light">
<title>Creator Portal | Everlastings by Emaline</title>
<link rel="stylesheet" href="portal.css">
```
**NEW (insert the robots meta; title unchanged — repeat this edit in all four shells):**
```html
<meta name="color-scheme" content="light">
<meta name="robots" content="noindex, nofollow">
<title>Creator Portal | Everlastings by Emaline</title>
<link rel="stylesheet" href="portal.css">
```

**Doc impact:** `EVERLASTINGS_STORE.md` — the admin surface is now four static pages under `admin/` (`portal.css`/`portal.js`/`data.js` + per-page shell + `*-app.js`), replacing `admin/index.html` + `assets/js/admin.js`.

---

**Phase 1.2 — `vercel.json`: retire the SPA catch-all rewrite; add the default-landing redirect. (Clean-path scheme: `/admin/{products,orders,sales,account}`, landing = products.)**

The four shells are **real static files** under `admin/`; with `cleanUrls: true` already set (`vercel.json:2`), Vercel serves them extensionless (`/admin/products` → `admin/products.html`) and 308-canonicalizes any `.html` request. So the verbatim `.html` hrefs in the markup (static rail in `products.html`; `mountShell` emits `${k}.html`) resolve correctly with **no rewrite** — a click on `products.html` from `/admin/orders` becomes `/admin/products.html` → 308 → `/admin/products`. The two required `vercel.json` changes are: **remove** the old SPA catch-all (it would swallow every sub-path into the deleted `admin/index.html`), and **add** a `/admin` → `/admin/products` landing redirect.

*1.2a — delete the SPA catch-all rewrite.* **CURRENT (`vercel.json:8-9`):**
```json
    { "source": "/product/:slug", "destination": "/product" },
    { "source": "/admin/:path*", "destination": "/admin" },
```
**NEW (drop the `/admin/:path*` line — the four pages are served as static files, no rewrite needed):**
```json
    { "source": "/product/:slug", "destination": "/product" },
```

*1.2b — add the bare-`/admin` landing redirect.* Use a **redirect** (not a rewrite): a rewrite serving `admin/products.html` at the URL `/admin` would resolve the shell's relative `data.js`/`portal.css` against base `/` → 404s; a redirect lands the browser on `/admin/products` where base dir `/admin/` makes every relative asset resolve. `permanent: false` (307) keeps the landing relocatable later. **CURRENT (`vercel.json:1-7`):**
```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "crons": [
    { "path": "/api/product-feed", "schedule": "0 9 * * *" }
  ],
  "rewrites": [
```
**NEW (insert a `redirects` block before `rewrites`):**
```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "crons": [
    { "path": "/api/product-feed", "schedule": "0 9 * * *" }
  ],
  "redirects": [
    { "source": "/admin", "destination": "/admin/products", "permanent": false }
  ],
  "rewrites": [
```

*(Why redirect over renaming `products.html`→`index.html`: renaming would make `/admin/products` 404 and break `mountShell`'s `products` active-key symmetry with `${k}.html`. The redirect keeps all four routes symmetric and the markup verbatim. `vercel dev` does not always honor `cleanUrls`/redirects — validate this scheme on a real Vercel **preview** URL, never localhost.)*

**Doc impact:** none beyond WS1 §Routing in this doc (record the `/admin/{products|orders|sales|account}` scheme + products landing).

---

**Phase 1.3 — `portal.js`: confirm `PORTAL.env()`/`siteUrl()` (verify-only); add the `/api/config` + Supabase auth bootstrap.**

*1.3a — env / siteUrl are already correct for the deploy topology — verify the anchor, do not edit.* `PORTAL.env()` derives Test/Live purely from `location.hostname`; `everlastingsbyemaline.com` (and any subdomain) → **Live** green, everything else — `*.vercel.app` previews, `localhost`, `file://` (hostname `""`) — → **Test** amber. `siteUrl()` returns the current preview origin on Test and prod on Live. This matches the real topology (prod custom domain `everlastingsbyemaline.com`; previews/localhost are Test) and `INTEGRATION.md §3.1`/§165. **CURRENT (`portal.js:13-27`) — ships verbatim, NO CHANGE (if it has drifted byte-for-byte, STOP and reconcile):**
```js
  P.env = function () {
    const h = (location.hostname || "").toLowerCase();
    const isProd = /everlastingsbyemaline\.com$/.test(h);
    const isTest = !isProd; // vercel.app previews, localhost, file:// all read as test
    return { isTest, label: isTest ? "Test" : "Live" };
  };
  P.applyEnvChip = function (el) {
    if (!el) return;
    const e = P.env();
    el.textContent = e.label;
    el.classList.toggle("test-chip--live", !e.isTest);
    el.title = e.isTest ? "You're viewing test data (preview environment)" : "You're on the live shop";
  };
  /* the storefront URL for the CURRENT environment (test → this deployment's root; live → prod) */
  P.siteUrl = function () { return P.env().isTest ? location.origin : "https://everlastingsbyemaline.com"; };
```
*(Integration seam: the chip is hostname-derived per the locked decision; the server's own `isTest` (from `/api/config`, env-scoped Stripe test/live) is the source of truth for the Account card's key display. In the normal Vercel env-scoping topology the two always agree; if a preview were ever mis-scoped to live keys, the chip follows hostname per the lock.)*

*1.3b — add the config + Supabase auth bootstrap (preserves `admin.js:90-221`).* The delivered `portal.js` has **no** config fetch and **no** Supabase — the prototype fakes sign-in. Add a shared `PORTAL.boot()` that reproduces the retired `admin.js` bootstrap: load `/api/config` (**field names VERIFIED against `api/config.ts:5-11`: `publishableKey` · `supabaseUrl` · `supabasePublishableKey` · `isTest` — port these exact reads, don't retype them, or the whole portal fails to boot**), create one Supabase client (same options as `admin.js:109-111`), resolve the session, optionally gate the page, and expose `PORTAL.authHeader()` for the data-wiring workstreams. **CURRENT (`portal.js:26-28`):**
```js
  /* the storefront URL for the CURRENT environment (test → this deployment's root; live → prod) */
  P.siteUrl = function () { return P.env().isTest ? location.origin : "https://everlastingsbyemaline.com"; };

  /* ---- icons reused across helpers ---- */
```
**NEW (insert the bootstrap between `siteUrl` and the icons block):**
```js
  /* the storefront URL for the CURRENT environment (test → this deployment's root; live → prod) */
  P.siteUrl = function () { return P.env().isTest ? location.origin : "https://everlastingsbyemaline.com"; };

  /* ---- config + Supabase auth bootstrap (preserved from the retired admin.js:90-221) ----
     Each surface calls PORTAL.boot() before its render. It loads /api/config (Stripe
     publishable key + Supabase URL/publishable key + isTest), creates the shared Supabase
     client, and resolves the current session. Pages that require a session redirect to
     /admin/account (which hosts sign-in) when signed out. No new serverless function:
     /api/config + the CDN @supabase/supabase-js are the existing surfaces. */
  P.config = null; P.supabase = null; P.session = null;
  P.loadConfig = async function () {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error("Failed to load /api/config");
    const cfg = await res.json();
    if (!cfg.supabaseUrl || !cfg.supabasePublishableKey) throw new Error("Supabase config missing from /api/config response");
    return cfg;
  };
  P.boot = async function (opts) {
    opts = opts || {};
    P.config = await P.loadConfig();
    P.supabase = window.supabase.createClient(P.config.supabaseUrl, P.config.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    const { data } = await P.supabase.auth.getSession();
    P.session = (data && data.session) || null;
    if (typeof opts.onAuth === "function") {
      P.supabase.auth.onAuthStateChange(function (_e, session) { P.session = session || null; opts.onAuth(P.session); });
    }
    if (opts.requireSession && !P.session) { location.replace("/admin/account"); return false; }
    return true;
  };
  P.authHeader = function () {
    const t = P.session && P.session.access_token;
    return t ? { Authorization: "Bearer " + t } : {};
  };

  /* ---- icons reused across helpers ---- */
```

*1.3c — load `@supabase/supabase-js` before `portal.js` in every shell.* `P.boot` calls `window.supabase.createClient`, so the UMD build must load ahead of `portal.js` — the same pin the retired SPA used (`admin/index.html:428`). **CURRENT (`account.html:80-82`, and byte-identical script order in `products.html:399-401`, `orders.html:145-147`, `sales.html:117-119`):**
```html
<script src="data.js"></script>
<script src="portal.js"></script>
<script src="account-app.js"></script>
```
**NEW (prepend the Supabase CDN; per-page the third line is that page's `*-app.js` — repeat in all four shells):**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="data.js"></script>
<script src="portal.js"></script>
<script src="account-app.js"></script>
```

**Doc impact:** `EVERLASTINGS_STORE.md` — auth/config bootstrap moved from `assets/js/admin.js` to `portal.js` (`PORTAL.boot`/`loadConfig`/`authHeader`); `/api/config` + `@supabase/supabase-js` unchanged, still no admin-specific function.

---

**Phase 1.4 — `account-app.js`: rewire the sign-in/out surface to the real Supabase session.**

The prototype hardcodes `signedIn = true` and fakes the form; wire it to `PORTAL.supabase` (`signInWithPassword` / `signOut`) and drive `signedIn` from `PORTAL.session`, mirroring `admin.js:179-201`. Account is the **only** page that must NOT `requireSession` (it hosts sign-in).

*1.4a — session-driven initial state.* **CURRENT (`account-app.js:9-12`):**
```js
  const cfg = D.config || {};
  const env = P.env();
  let signedIn = true;
  const account = { email: "admin@everlastingsbyemaline.com" };
```
**NEW:**
```js
  const cfg = D.config || {};
  const env = P.env();
  let signedIn = false;                 // real: set from the Supabase session in the boot() entry below
  const account = { email: "" };
```

*1.4b — real Stripe key in the Account card (read `PORTAL.config`, not the mock `data.js`).* **CURRENT (`account-app.js:77`):**
```js
          <div class="kv" style="margin-top:10px">Stripe key · ${esc(maskKey(cfg.publishableKey))}</div>
```
**NEW:**
```js
          <div class="kv" style="margin-top:10px">Stripe key · ${esc(maskKey((P.config || cfg).publishableKey))}</div>
```

*1.4c — real sign-out.* **CURRENT (`account-app.js:89`):**
```js
      view.querySelector("#signout").onclick = () => { signedIn = false; render(); P.toast("Signed out"); };
```
**NEW:**
```js
      view.querySelector("#signout").onclick = async () => { await P.supabase.auth.signOut(); signedIn = false; render(); P.toast("Signed out"); };
```

*1.4d — real sign-in (`signInWithPassword`, surface errors as a danger toast).* **CURRENT (`account-app.js:103-109`):**
```js
      view.querySelector("#signinForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const pass = view.querySelector("#si-pass").value;
        if (!pass) { view.querySelector("#si-pass").focus(); return; }
        account.email = view.querySelector("#si-email").value || account.email;
        if (window.__fxStop) window.__fxStop(); signedIn = true; render(); P.toast("Signed in", { kind: "live" });
      });
```
**NEW:**
```js
      view.querySelector("#signinForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = view.querySelector("#si-email").value.trim();
        const pass = view.querySelector("#si-pass").value;
        if (!pass) { view.querySelector("#si-pass").focus(); return; }
        const btn = view.querySelector('button[type="submit"]'); btn.disabled = true;
        const { error } = await P.supabase.auth.signInWithPassword({ email, password: pass });
        btn.disabled = false;
        if (error) { P.toast(error.message, { kind: "danger" }); return; }
        account.email = (P.session && P.session.user && P.session.user.email) || email;
        if (window.__fxStop) window.__fxStop(); signedIn = true; render(); P.toast("Signed in", { kind: "live" });
      });
```

*1.4e — boot the page (no session gate here), keeping `onAuthStateChange` live.* **CURRENT (`account-app.js:188-189`):**
```js
  P.mountShell("account", { ordersBadge: 2 });
  render();
```
**NEW:**
```js
  P.boot({ onAuth: function (session) {
      signedIn = !!session;
      if (session) account.email = (session.user && session.user.email) || account.email;
      render();
    } })
    .then(function () {
      signedIn = !!P.session;
      if (P.session) account.email = (P.session.user && P.session.user.email) || account.email;
      P.mountShell("account", { ordersBadge: 2 });
      render();
    })
    .catch(function (err) { P.mountShell("account", { ordersBadge: 2 }); P.toast(err.message, { kind: "danger" }); render(); });
```

*(The prototype's prefilled `value="${esc(account.email)}"` on the email input now starts blank; that's the correct sign-in behavior. The sign-in canvas FX and identicon are untouched.)*

**Doc impact:** none beyond WS1.

---

**Phase 1.5 — `products-app.js` / `orders-app.js` / `sales-app.js`: adopt the boot-gate at each entry (`requireSession: true`).**

Each of the other three surfaces must not render for a signed-out visitor — wrap **EVERY entry statement** of the surface (not just the last one) in `PORTAL.boot({ requireSession: true }).then(...)`, which redirects to `/admin/account` when there's no session and otherwise proceeds. If only the *final* call is wrapped, the earlier entry statements (a `mountShell`, a `renderStoreWide`) still paint chrome/data before the redirect — so a signed-out visitor briefly sees the surface. Move the surface's whole terminal entry sequence inside `.then()`, in order. The bodies (data calls) are wired in later workstreams; WS1 only establishes this shared entry contract. Their entry points differ in COUNT (confirmed by reading each file):

- **`sales-app.js`** — **THREE** entry statements before `})();` (`:225`): `P.mountShell("sales", { ordersBadge: 2 });` (`:222`) + `renderStoreWide();` (`:223`) + `renderCoupons();` (`:224`). Wrap all three inside `.then()`, in order.
- **`orders-app.js`** — **TWO** entry statements before `})();` (`:236`): `P.mountShell("orders", { ordersBadge: groups().filter((g) => inTab(g, "needs")).length });` (`:234`) + `render();` (`:235`). Wrap both.
- **`products-app.js`** — its whole init tail must run inside `.then()`: the env-chip IIFE (`:788-793`), the rail-collapse IIFE (`:796-805`), and `render();` (`:807`). Wrap all three so a signed-out visitor never paints the chip, the rail, or the surface. (Products self-manages its static rail + env chip rather than `mountShell`, so the two IIFEs are part of its entry, not shell chrome that runs elsewhere.)

**products-app.js concrete NEW block (verbatim wrap):**
```js
  PORTAL.boot({ requireSession: true }).then(function (ok) {
    if (!ok) return;                 // signed out → boot() already redirected to /admin/account
    (function () { /* env-chip IIFE from :788-793 verbatim */ })();
    (function () { /* rail-collapse IIFE from :796-805 verbatim */ })();
    render();
  }).catch(function (err) { PORTAL.toast(err.message, { kind: "danger" }); });
```
*(Copy each IIFE's body byte-for-byte into its wrapper; the `PORTAL.refreshOrdersSignal()` call added by WS8 Phase 8.3.b sits at the END of this `.then()` — inside the wrap, not outside — so the landing-page blink lights only for a signed-in maker. Prevents the "chrome-flash-before-redirect" glitch for signed-out visitors.)*

**Pattern (apply at each surface; keep the surface's existing entry statements verbatim inside, in order):**
```js
  P.boot({ requireSession: true }).then(function (ok) {
    if (!ok) return;                 // signed out → boot() already redirected to /admin/account
    /* ALL of the surface's existing entry statements here, unchanged and in order */
  }).catch(function (err) { P.toast(err.message, { kind: "danger" }); });
```
*(Entry-line anchors confirmed by reading each file: `sales-app.js:222-224` = 3 statements, `orders-app.js:234-235` = 2, `products-app.js:788-807` = env-chip IIFE + rail IIFE + `render()`. Re-anchor byte-for-byte if the tree has drifted.)*

**Doc impact:** none beyond WS1.

---

**Integration seams / notes to carry into later workstreams (not WS1 blockers):**

- **`products.html` static View Site link is hardcoded to prod** (`products.html:334` `href="https://everlastingsbyemaline.com"`), diverging from `mountShell`'s env-aware `P.siteUrl()` (`portal.js:151`) and `INTEGRATION.md §165`. On a Test preview the products-page View Site should point at the preview storefront — reconcile in the products data-wiring workstream (swap the static href for `P.siteUrl()` or inject the rail via `mountShell`).
- **`products.html` env chip already hides on Live (SETTLED — no action).** The env-chip IIFE `products-app.js:788-793` DOES have a Live branch: `if (env.isTest) { applyEnvChip(...) } else { chip.style.display = "none"; strip.style.display = "none"; }` — so on Live it hides `#envChip`/`#envStrip` exactly like `mountShell` (`portal.js:159`). The earlier "products shows a stale Test chip on Live" note was WRONG; both surfaces hide the marker on Live. *(Low-priority cleanup, not this build: the green `.test-chip--live` / `.envstrip.is-live` CSS in `portal.css:471-472,481-482` is dead — both surfaces hide rather than green-flip the marker on Live, so those rules are never hit. Harmless; leave or prune later.)*
- **`data.js` is mock and ships in WS1 so the shell renders;** its `products`/`orders`/`coupons`/`storeWideSale` arrays and its `config` object are the integration seam replaced downstream (README + INTEGRATION.md). WS1's Account card already reads the real key via `PORTAL.config`; the rest follow.

---

## WS2 — Products surface + sold-policy/state reconciliations + scheduled publish

> **Integration-seam for the surface wiring; byte-anchored for the backend reconciliations.** The redesigned surface (`assets/docs/archive/v3_5/design-handoff/out/products-app.js` + `out/products.html`) is a mock: `products = D.products` (`:11`), `autosave()` is a no-op (`:557`), and every commerce/lifecycle action mutates the in-memory model with an honest toast. Phase 2.1 maps each mock/no-op onto the real `api/products.ts` + `api/upload.ts` contract (no backend change — the surface ports `admin.js`'s behavior). Phases 2.2–2.8 are byte-anchored backend edits: line numbers are hints, the quoted **CURRENT** text is the anchor — if it doesn't match the working tree byte-for-byte, STOP and reconcile. Run `npx tsc --noEmit` clean after the TS edits; the migration applies via the Supabase CLI (the MCP rejects writes).

**Thesis check.** The surface exists so the maker (or her GPT) never fights the tool: state is *computed*, not typed (sold = qty 0 from a real sale; draft = unpublished), the publish gate reads what's missing in plain words, and the scheduled-publish control ships working, never a dead button. Judge every seam by "does this lower the maker's friction," not doc-internal tidiness.

### Integration seam — `products-app.js` → real endpoints

| `products-app.js` (mock / no-op)                                        | Real call                                                                                                                                     |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `products = D.products` (`:11`)                                         | `GET /api/products` → `{products: Product[]}` (admin = full rows: `draft`, `is_published`, `quantity`, `archived_at`, `scheduled_publish_at`) |
| `openPreview` toast (`:251`)                                            | open `preview_url` (`/product/<slug>?preview=<token>`); clean live row → `/product/<slug>`                                                    |
| `newBtn` toast (`:780`) → blank editor                                  | first Save/autosave → `POST /api/products` (returns `id` + `preview_token`)                                                                   |
| `autosave()` no-op (`:557`)                                             | existing row → `PUT /api/products?id=`; brand-new + title/price present → `POST`                                                              |
| `commitPrice` (`:212`)                                                  | `PUT ?id=` `{price}` — live-apply (rotates Stripe price)                                                                                      |
| `commitQty` (`:218`)                                                    | `PUT ?id=` `{quantity}` — live-apply                                                                                                          |
| `commitAvail` OFF (`:234`)                                              | `PUT ?id=` `{available:false}` → server **unpublishes to draft** (Phase 2.2)                                                                  |
| `commitAvail` ON / `promptStock` (`:228`,`:265`)                        | republish: `[PUT {quantity}]` → `PUT {available:true}` → `POST ?_action=publish {id}` — an under-filled piece can **400** here (the strict publish gate); **SURFACE it** as a field-list toast, not a silent no-op (§2.7 — RESOLVED: strict gate stands)                                                         |
| `commitFeature` (`:242`)                                                | `PUT ?id=` `{featured}` (staged on published, live on draft — server routes it)                                                               |
| `commitArchive` (`:244`)                                                | `POST ?_action=archive {id}` / `?_action=unarchive {id}`                                                                                      |
| `discard` (`:451`)                                                      | `POST ?_action=discard {id}`                                                                                                                  |
| `relist` (`:452`)                                                       | `unarchive` (if archived) → `PUT {quantity, available}` → republish if it was unpublished                                                     |
| `doPublish` (`:560`)                                                    | never-published → open preview, real `POST ?_action=publish {token}`; staged edits → `POST {id}`                                              |
| `openSchedule` save (`:490`)                                            | `PUT ?id=` `{scheduled_publish_at: <ISO>}` (Phase 2.4)                                                                                        |
| `unschedule` (`:454`)                                                   | `PUT ?id=` `{scheduled_publish_at: null}`                                                                                                     |
| `handleFiles` FileReader base64 (`:720`) + `applyMedia` (`:745`)        | per asset `POST /api/upload` (`file`/`url` + `slug` + `role`) → then `PUT {images, media, thumbnail, seo_thumbnail, checkout_image}`          |
| `product_type` options `["miniature","printable","storybook"]` (`:364`) | picker → **`["miniature"]` only** (surface edit — Phase 2.1)                                                                                  |

*(`computeState()` at `:16-22` already encodes Sean's precedence — `archived > draft(!is_published) > edits(draft) > sold(quantity===0) > live` — with NO `!available→sold` branch. Confirmed: the surface never derives "sold" from the toggle; sold is qty-0-only. No client change to `computeState`. The editor's `eff = (k) => (p.draft && p.draft[k] != null ? p.draft[k] : p[k])` (`:340`) is the SAME client-side draft merge as `admin.js:310` — keep it; do NOT add `effective` to the hot GET.)*

**Phase 2.1 — surface wiring (integration-seam, not byte-anchored).**

- **a. Port `buildProductPayload` (the behavioral contract, `admin.js:561-617`).** The editor collects fields via `bindField`/`setEff` (`:529-544`) into the in-memory `p`; the real save serializes that to the API body exactly as `admin.js` does: `price` → integer cents (`dollarsToCents`), list fields → `string[]` (`linesToArray` over the one-per-line textareas), `dimensions` already assembled by `bindField` (`:533`) as `` `${w}" W x ${d}" D x ${h}" H` `` and `weight` as `` `${n} lbs` `` (`:534`), `homepage_theme` parsed if present, empty scalars → `null`. On save/close: existing row → `PUT ?id=` (strip `slug` — it 400s as immutable, `products.ts:359`); new row → `POST`.
- **b. `autosave()` (`:557`) becomes the real PUT/POST.** Guard the brand-new case: only `POST` when `title` + `price` are present (a truly-blank New that's closed writes no row). Subsequent saves are `PUT`. *(This is why Phase 2.7 splits create-validation — a partial draft must persist.)*
- **c. `product_type` picker → miniature-only.** Edit `editorHTML` (`:364`) `options: ["miniature", "printable", "storybook"]` → `options: ["miniature"]`. The server already treats every type as miniature (`PRODUCT_TYPE_RULES` has only `miniature`, `products.ts:281-286`, and the §9.1 comment at `:274-279` says printable/storybook are deferred, NOT a one-line enum edit) — offering them would store a mismatched `product_type` validated as a miniature. No server change; surface-only.
- **d. Media modal → `POST /api/upload`.** Replace `handleFiles`'s FileReader base64 data URLs (`:720-722`) with real uploads: each dropped/linked asset `POST /api/upload` (multipart `file` or JSON `{url}`, plus `slug` + `role` from the modal's role toggles — `hero`, `gallery-01..15`, `checkout_image`, `seo_thumbnail`, `video-01..05`) returns a role-prefixed `{url}`; `applyMedia` (`:745`) then `PUT`s `{images, media, thumbnail, seo_thumbnail, checkout_image}`. The role-prefixed filenames (`hero-`, `gallery-`) are what Phase 2.7's publish gate counts — the upload roles and the gate's filename detection must agree.
- **e. Publish-requires-preview (never-published).** `doPublish` (`:560`) for a row with no `published_at` must first ensure the draft is persisted (so a `preview_token` exists), then open `preview_url`; the real Publish fires on the preview page as `POST ?_action=publish {token}`. Staged-edit publish (published + `draft`) may `POST {id}` directly.
- **f. Fix the undefined `--staged` token on the scheduled chip (surgical markup edit — DESIGN §A).** `products.html:288`'s `.sched-chip` uses `var(--staged)` in three `color-mix()`s, but `--staged` is defined **nowhere** in `portal.css` (the only undefined token in `out/`), so the scheduled "Scheduled · <when>" chip renders with **no background**. The scheduled/staged state is the orange `--waiting` — replace all three `var(--staged)` with `var(--waiting)`. **CURRENT (`assets/docs/archive/v3_5/design-handoff/out/products.html:288`, applied in `admin/products.html` after the WS1 copy):**
```css
.sched-chip{display:inline-flex; align-items:center; gap:7px; padding:5px 11px; border-radius:var(--r-pill); background:color-mix(in oklch,var(--staged),white 80%); color:color-mix(in oklch,var(--staged),black 16%); border:1px solid color-mix(in oklch,var(--staged),white 52%); font-size:var(--t-xs); font-weight:600;}
```
**NEW (three `var(--staged)` → `var(--waiting)`):**
```css
.sched-chip{display:inline-flex; align-items:center; gap:7px; padding:5px 11px; border-radius:var(--r-pill); background:color-mix(in oklch,var(--waiting),white 80%); color:color-mix(in oklch,var(--waiting),black 16%); border:1px solid color-mix(in oklch,var(--waiting),white 52%); font-size:var(--t-xs); font-weight:600;}
```

**Doc impact:** `STORE_ADMINISTRATION.md` — the /admin Products walkthrough now mirrors the GPT (create draft → fill → preview → publish); note the maker previews before first publish.

**Phase 2.2 — `api/products.ts` PUT: Available-OFF on a published piece → unpublish to Draft (§3.6, Sean's final word).** Turning Available off does NOT mean "sold" — sold is qty-0-from-a-sale only (computed). On a published row, a real OFF transition unpublishes (`is_published=false`) so `computeState` lands on `draft`, never a stored "sold." *(A genuinely-sold row already has `available=false` — `record_sale` sets `available = (qty>0)`, migration `20260616000001:35` — so this OFF branch never fires there; the change-detect `!==` guards a no-op re-send from the full admin payload.)* We're already inside `if (current.is_published)`, so `updates.available === false` ⇒ unpublish. **CURRENT (`api/products.ts:456-466`):**
```ts
    if (
      updates.available !== undefined &&
      updates.available !== (current as Record<string, unknown>).available
    ) {
      // parity with the quantity guard below: reject a malformed value rather than silently ignoring it
      // (the admin/GPT schemas type it boolean, so this only fires on a bad caller).
      if (typeof updates.available !== 'boolean') {
        return jsonResponse(request, { error: 'Availability must be true or false' }, 400);
      }
      liveUpdate.available = updates.available;
    }
```
**NEW (OFF unpublishes; ON stays live-apply):**
```ts
    if (
      updates.available !== undefined &&
      updates.available !== (current as Record<string, unknown>).available
    ) {
      // parity with the quantity guard below: reject a malformed value rather than silently ignoring it
      // (the admin/GPT schemas type it boolean, so this only fires on a bad caller).
      if (typeof updates.available !== 'boolean') {
        return jsonResponse(request, { error: 'Availability must be true or false' }, 400);
      }
      if (updates.available === false) {
        // v3.5 §3.6: turning Available OFF on a LIVE piece makes it a DRAFT (hidden), NOT "sold."
        // "Sold" is quantity===0 from a real sale (computed client-side; never stored). Unpublish so
        // computeState() resolves to `draft`. Republish is the maker turning it back ON → the surface
        // re-runs the publish flow (?_action=publish); Stripe is a no-op the 2nd time (stripe_product_id
        // already set — stripeSync.ts:40), so the piece comes back live without a duplicate Stripe product.
        liveUpdate.is_published = false;
        liveUpdate.available = false;
      } else {
        liveUpdate.available = updates.available;
      }
    }
```
Then surface the flag on the response. **CURRENT (`:538-548`):**
```ts
    return jsonResponse(request, {
      success: true,
      product: data,
      staged: hasDraftable,
      ...(liveUpdate.price !== undefined ? { price_updated: true } : {}),
      ...(liveUpdate.available !== undefined ? { availability_updated: true } : {}),
      ...(liveUpdate.quantity !== undefined ? { quantity_updated: true } : {}),
      ...(hasDraftable
        ? { preview_url: previewUrl(request, String(data.slug), previewToken), preview_token: previewToken }
        : {}),
    });
```
**NEW (add `unpublished` + `scheduled_updated` — the latter feeds Phase 2.4):**
```ts
    return jsonResponse(request, {
      success: true,
      product: data,
      staged: hasDraftable,
      ...(liveUpdate.price !== undefined ? { price_updated: true } : {}),
      ...(liveUpdate.available !== undefined ? { availability_updated: true } : {}),
      ...(liveUpdate.quantity !== undefined ? { quantity_updated: true } : {}),
      ...(liveUpdate.is_published === false ? { unpublished: true } : {}),
      ...(liveUpdate.scheduled_publish_at !== undefined ? { scheduled_updated: true } : {}),
      ...(hasDraftable
        ? { preview_url: previewUrl(request, String(data.slug), previewToken), preview_token: previewToken }
        : {}),
    });
```
*(`checkout.ts:79`/`:205` gate on `is_published===true && available===true && quantity>=1`, so an unpublished row is doubly out-of-shop; the webhook's `available` flip is a direct SQL RPC, untouched by this PUT. The surface's `commitAvail` OFF already renders the "Moved to Drafts" toast — `products-app.js:238`.)*

**Doc impact:** `EVERLASTINGS_STORE.md` Data-States — add "Available toggled off on a live piece → Draft (unpublish), never Sold; Sold is quantity=0 from a sale."

**Phase 2.3 — migration: `scheduled_publish_at` column + partial index.** New `supabase/migrations/20260701000001_v3_5_scheduled_publish.sql` (rename the timestamp prefix to stay monotonic at apply time if a later migration already exists — Supabase orders by filename; latest today is `20260616000001`).
```sql
-- v3.5 — scheduled publish (no new cron): a timestamptz + a partial index for the daily fold.
ALTER TABLE products ADD COLUMN scheduled_publish_at timestamptz;   -- null = not scheduled

-- The daily product-feed cron (vercel.json: "0 9 * * *") scans this to auto-publish due rows. The
-- partial index keeps the scan cheap (only ever a handful of scheduled rows) and matches the fold's
-- predicate. archived_at IS NULL because a scheduled-then-archived row must not silently go live.
CREATE INDEX idx_products_scheduled_publish ON products (scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL AND archived_at IS NULL;
```

**Doc impact:** `EVERLASTINGS_STORE.md` schema reference — add the `scheduled_publish_at` column + "date-granular auto-publish folds into the daily product-feed cron."

**Phase 2.4 — `api/products.ts` PUT: accept `scheduled_publish_at` (set/clear) on both branches.** It's an operational directive applied LIVE like availability/quantity — never staged (not previewable copy). It's NOT in `DRAFTABLE` (`:324-330`), so the published-branch draftable filter naturally excludes it. Published branch — insert a block directly after the quantity block. **CURRENT (`api/products.ts:467-475`):**
```ts
    if (
      updates.quantity !== undefined &&
      updates.quantity !== (current as Record<string, unknown>).quantity
    ) {
      if (!Number.isInteger(updates.quantity) || (updates.quantity as number) < 0) {
        return jsonResponse(request, { error: 'Quantity must be a non-negative integer (0 = sold out)' }, 400);
      }
      liveUpdate.quantity = updates.quantity;
    }
```
**NEW (append the scheduled_publish_at block):**
```ts
    if (
      updates.quantity !== undefined &&
      updates.quantity !== (current as Record<string, unknown>).quantity
    ) {
      if (!Number.isInteger(updates.quantity) || (updates.quantity as number) < 0) {
        return jsonResponse(request, { error: 'Quantity must be a non-negative integer (0 = sold out)' }, 400);
      }
      liveUpdate.quantity = updates.quantity;
    }
    // scheduled_publish_at: an auto-publish directive, applied LIVE (never staged — it's not copy). A
    // string ISO timestamp arms it; null clears it. The daily product-feed fold (WS2 Phase 2.6) does the
    // actual publish, and publishing clears it (Phase 2.5) so it fires at most once.
    if (
      updates.scheduled_publish_at !== undefined &&
      updates.scheduled_publish_at !== (current as Record<string, unknown>).scheduled_publish_at
    ) {
      const sched = updates.scheduled_publish_at;
      if (sched !== null && (typeof sched !== 'string' || Number.isNaN(Date.parse(sched)))) {
        return jsonResponse(request, { error: 'scheduled_publish_at must be an ISO timestamp or null' }, 400);
      }
      liveUpdate.scheduled_publish_at = sched;
    }
```
Unpublished branch — add to the allow-list + validate. **CURRENT (`:553-559`):**
```ts
  const clean = pick([...DRAFTABLE, 'checkout_name', 'checkout_description', 'checkout_image']);
  if (updates.price !== undefined) {
    if (!Number.isInteger(updates.price) || (updates.price as number) <= 0) {
      return jsonResponse(request, { error: 'Price must be a positive integer in cents' }, 400);
    }
    clean.price = updates.price;
  }
```
**NEW:**
```ts
  const clean = pick([...DRAFTABLE, 'checkout_name', 'checkout_description', 'checkout_image', 'scheduled_publish_at']);
  if (
    updates.scheduled_publish_at !== undefined &&
    updates.scheduled_publish_at !== null &&
    (typeof updates.scheduled_publish_at !== 'string' || Number.isNaN(Date.parse(updates.scheduled_publish_at)))
  ) {
    return jsonResponse(request, { error: 'scheduled_publish_at must be an ISO timestamp or null' }, 400);
  }
  if (updates.price !== undefined) {
    if (!Number.isInteger(updates.price) || (updates.price as number) <= 0) {
      return jsonResponse(request, { error: 'Price must be a positive integer in cents' }, 400);
    }
    clean.price = updates.price;
  }
```
*(The surface's `openSchedule` (`:490-495`) already emits `new Date(dv+"T"+tv).toISOString()` and `unschedule` (`:454`) sets null. The chip + "Scheduled · <when>" render off `p.scheduled_publish_at`, `:409-410`. **Gate the Schedule control on publish-READINESS (field-completeness), not merely "a publish is pending":** only offer "Schedule publish…" when the piece passes the **required-field** gate — the `validatePublishRules`-equivalent check (title, price, images + alt, dimensions, …). Reuse the surface's own `readiness()` — **VERIFIED: `out/products-app.js:47` `readiness()` keys purely off the required-field set, with NO bundled preview step** — so gate Schedule directly on it: a complete-but-un-previewed draft IS offered Schedule (resolves J2), and the cron (§2.6) enforces the same `validatePublishRules` `readiness()` mirrors, so a scheduled piece always publishes. **Fallback (belt-and-suspenders — not expected to fire, since `readiness()` is confirmed reusable + field-only):** if a future refactor makes `readiness()` non-reusable, gate on an **inline required-field predicate** (the §C.1 list — title, price, ≥ required images + alt, dimensions, …), NOT "always offer" — so the control never silently offers a Schedule the cron would 400-skip. The cron flip runs the full `validatePublishRules`, so a missing-field draft that got scheduled would **400 and be silently skipped every day, forever** — the exact "hides without explaining" failure the thesis forbids. Offering Schedule only on a publish-ready piece (a complete unpublished draft, or a published row with complete staged edits) guarantees a scheduled value always fires at cron. This also subsumes the clean-published-no-draft case — nothing to auto-publish there, so Schedule stays hidden.)*

**Doc impact:** `EVERLASTINGS_STORE.md` — note scheduled publish is set/cleared via `PUT` and is live (never staged).

**Phase 2.5 — `api/products.ts` handlePublish: clear the schedule + persist the auto-generated checkout/SEO fields.** Publishing by ANY path (manual, capability token, or the scheduled fold) must clear `scheduled_publish_at` so it fires once. Edit-publish update. **CURRENT (`:635-640`):**
```ts
    const { data: updated, error: applyError } = await supabase
      .from('products')
      .update({ ...draft, draft: null, preview_token: null })
      .eq('id', row.id)
      .select()
      .single();
```
**NEW:**
```ts
    const { data: updated, error: applyError } = await supabase
      .from('products')
      .update({ ...draft, draft: null, preview_token: null, scheduled_publish_at: null })
      .eq('id', row.id)
      .select()
      .single();
```
First-publish — the checkout essentials already fall back on the fly (`:658-666`) but the row columns stay null; the redesign's "show locked, not missing" needs them PERSISTED (they lock via `FROZEN_AFTER_PUBLISH`), and Sean's required-but-auto-generated set (`seo_title, seo_description, checkout_name, checkout_description, checkout_image, seo_thumbnail`) is generated here so publish is NEVER blocked on them. **CURRENT (`:676-681`):**
```ts
  const { data: published, error: pubError } = await supabase
    .from('products')
    .update({ is_published: true, published_at: new Date().toISOString(), draft: null, preview_token: null })
    .eq('id', row.id)
    .select()
    .single();
```
**NEW (generate-if-blank, then flip + clear the schedule):**
```ts
  // Required-but-auto-generated (Sean v3.5): fill from other fields when blank so publish never blocks
  // on them; checkout_* then LOCK (FROZEN_AFTER_PUBLISH). checkoutImage is already resolved above (:658).
  const autoGen = {
    checkout_name: (row.checkout_name as string) || (row.title as string),
    checkout_description:
      (row.checkout_description as string) || (row.description as string) || (row.headline as string) || '',
    checkout_image: checkoutImage,
    seo_title: (row.seo_title as string) || (row.title as string),
    seo_description: (row.seo_description as string) || (row.description as string) || '',
    seo_thumbnail: (row.seo_thumbnail as string) || (row.thumbnail as string) || checkoutImage,
  };
  const { data: published, error: pubError } = await supabase
    .from('products')
    .update({ is_published: true, published_at: new Date().toISOString(), draft: null, preview_token: null, scheduled_publish_at: null, ...autoGen })
    .eq('id', row.id)
    .select()
    .single();
```
*(`syncProductToStripe` still reads `checkout_name || title` etc., so Stripe is unchanged; this just writes the same values back so /admin shows them locked, not blank.)*

**Doc impact:** `EVERLASTINGS_STORE.md` — document that first-publish persists auto-generated `checkout_*`/`seo_*` (then `checkout_*` lock) and clears any schedule.

**Phase 2.6 — `api/product-feed.ts`: fold the scheduled-publish flip into the existing daily cron (no new cron, no new function).** The cron (`vercel.json:5`, `0 9 * * *`) is date-granular by design. This phase establishes the **single shared service-role client `feedAdmin`** (WS7 §7.3 reuses it) + imports `isTest`, and defines `publishDueScheduled`; the feed's own query keeps the RLS-scoped publishable key, which CANNOT see unpublished rows, which is why the scan needs `feedAdmin`. The actual publish reuses the `?_action=publish` handler over an authenticated self-call (ZERO publish-logic duplication — it gets Stripe-create + shape re-validation + token/schedule clear for free). **The scan is `is_test`-scoped (`.eq('is_test', isTest)`) — the daily Vercel cron runs against production (Live rows), a preview cron hit scans TEST rows. This job runs ONLY inside the shared `isCronRequest(req)` gate assembled in §7.3c — never on a bare `GET`** (a public/preview feed poll must not self-publish; the ungated per-GET version was an `is_test` isolation break — a preview poll would publish LIVE rows against the preview's TEST Stripe key). **CURRENT (`api/product-feed.ts:1-7`):**
```ts
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!,
);
```
**NEW (add the shared `feedAdmin` service-role client + the `isTest` import + the fold helper — WS7 §7.3 reuses `feedAdmin`, does not re-declare it):**
```ts
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest } from './_lib/env';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!,
);

// Single service-role client (bypasses RLS) shared by BOTH cron-gated jobs: the scheduled-publish scan
// (below, sees due-but-still-unpublished rows the anon feed client can't) and the §7.3 reconciliation
// (reads the authenticated-only orders table). Same key api/webhook.ts:7-11 uses. The feed query itself
// keeps the publishable client above. DECLARE ONCE — §7.3 reuses this const, never a second client.
const feedAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// v3.5 scheduled publish (no new cron): the cron-gated feed run publishes any product whose
// scheduled_publish_at has passed. is_test-scoped (Vercel's daily cron runs against prod = Live; a
// preview cron hit scans TEST) so the isTest boundary holds. Reuses /api/products?_action=publish
// (Stripe create + validation + token/schedule clear) via an authenticated self-call, so there is no
// publish logic here. Best-effort per row: a failure is logged and skipped so one bad row never blocks
// the feed. Runs ONLY inside the §7.3c isCronRequest gate — never on a bare public GET.
async function publishDueScheduled(req: Request): Promise<void> {
  const { data: due, error } = await feedAdmin
    .from('products')
    .select('id')
    .eq('is_test', isTest)
    .is('archived_at', null)
    .not('scheduled_publish_at', 'is', null)
    .lte('scheduled_publish_at', new Date().toISOString())
    .or('is_published.eq.false,draft.not.is.null');
  if (error) {
    console.error('Scheduled-publish scan failed:', error.message);
    return;
  }
  const origin = new URL(req.url).origin;
  for (const row of (due ?? []) as Array<{ id: string }>) {
    try {
      const res = await fetch(`${origin}/api/products?_action=publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PRODUCT_API_KEY}`,
          'X-Actor': 'cron', // v3.6.6 — attribute this scheduled auto-publish to 'cron', not 'gpt'; resolveActor honors it ONLY on a valid PRODUCT_API_KEY self-call
        },
        body: JSON.stringify({ id: row.id }),
      });
      if (!res.ok) console.error('Scheduled publish failed for', row.id, await res.text());
    } catch (err) {
      console.error('Scheduled publish threw for', row.id, err);
    }
  }
}
```
**The `GET` call site is NOT edited here.** `publishDueScheduled(req)` is invoked from inside the shared `isCronRequest(req)` gate that WS7 §7.3c assembles at the top of `GET` (both cron jobs run in that one gate, publish first so freshly-published rows appear in the same run). This phase adds only the imports + `feedAdmin` client + the helper above; §7.3c owns the single `GET` wrapper. Do NOT add a bare `await publishDueScheduled(req)` to `GET` — that ran on every request (including public/preview polls) and was the `is_test` isolation break.
**PostgREST `.or()` syntax — RUNTIME-GATED mechanism fallback.** The `.or('is_published.eq.false,draft.not.is.null')` clause uses `not.is.null` inside a comma-composed OR — version-sensitive on supabase-js/PostgREST. Rather than a doc-gated "remember to run a REST-tester query" step (the pattern Sean rejected for the `cart_holds` DROP), the fallback ships wired. Replace the `.or(...)` single-query with a runtime try/catch — attempt the `.or()` form first; on PostgREST error catch and re-issue the query WITHOUT the OR + emit the specified `console.warn` once per cold start. Also `title` on the select for J4's log summary:
```ts
// v3.6.2 — runtime-gate the PostgREST .or() negation form; a supabase-js/PostgREST version bump could
// silently narrow the query, so ship the fallback as a mechanism, not a build-time note. `title` for
// the A2-4 skipped-summary log below.
let dueRes = await feedAdmin
  .from('products')
  .select('id, title')
  .eq('is_test', isTest)
  .is('archived_at', null)
  .not('scheduled_publish_at', 'is', null)
  .lte('scheduled_publish_at', new Date().toISOString())
  .or('is_published.eq.false,draft.not.is.null');
if (dueRes.error) {
  // .or() negation form unsupported on this stack — fall back to unpublished-only + WARN once per cold start.
  if (!(globalThis as { __postgrestOrWarned?: boolean }).__postgrestOrWarned) {
    console.warn('Scheduled-publish: PostgREST .or() negation unsupported on this stack; staged-edit auto-publish disabled — schedule only fires for unpublished drafts.');
    (globalThis as { __postgrestOrWarned?: boolean }).__postgrestOrWarned = true;
  }
  dueRes = await feedAdmin
    .from('products')
    .select('id, title')
    .eq('is_test', isTest)
    .is('archived_at', null)
    .not('scheduled_publish_at', 'is', null)
    .lte('scheduled_publish_at', new Date().toISOString())
    .eq('is_published', false);
}
const { data: due, error } = dueRes;
```
This closes the "hides without explaining" failure by construction: the fallback ships in code, the warn fires the first time it triggers, Vercel function logs capture it (verified pattern with existing `console.error` sites).

**A2-4 backstop (secondary to the §2.4 readiness gate) — SETTLED.** The §2.4 fix — only offering Schedule on a publish-READY piece — prevents the common "scheduled an incomplete draft" case. For the residual (a required field cleared *after* scheduling), surface the skip via a WS8 activity-log entry so nothing hides without explaining. `api/_lib/activityLog.ts` (WS8 8.1b) is a plain CommonJS module with its own per-invocation service-role client — no shared-client dependency on `feedAdmin`, so it imports cleanly into `product-feed.ts`. **Concrete insert** inside the fold's `if (!res.ok)` branch above (add above the `console.error(...)`):
```ts
await logActivity({ actor: 'cron', action: 'product.schedule_skipped', summary: `Scheduled publish skipped — "${row.title ?? 'piece'}" not publish-ready`, entityId: row.id });
```
(Add `import { logActivity } from './_lib/activityLog';` alongside `feedAdmin`'s imports; the cron actor `'cron'` matches the "not a JWT / not the GPT" case per WS8 §8.1b actor convention.)

**Optional (deferred) — lazy on-read time-precision flip.** The cron is date-granular (worst case ~1 day latency to the 09:00 UTC run). A lazy flip (publish on first read after the scheduled time) would add minute-precision — but it must NOT touch the hot public GET (`products.ts:96-121`, `:123-139` return the raw row; the client merges `draft`). Ship the cron fold; leave the lazy flip as a future enhancement scoped to an admin-only read, so it never adds a write side-effect to the public path.

**Doc impact:** `EVERLASTINGS_STORE.md` — document the scheduled-publish fold in the daily `product-feed` cron (prod-only, date-granular, reuses the publish handler).

**Phase 2.7 — `api/products.ts`: split validation into create-minimum vs the full publish gate.** Today `validateProductRules` (`:287-322`) is shared by create (`POST :183`) AND publish (`:631`, `:654`) and already demands the miniature shape (title/description/price/type/headline/story_card + hero + 5 gallery + thumbnail). That BLOCKS the redesign's auto-save-as-draft flow (a partial New can't persist). Sean's authoritative PUBLISH set is larger still. So: create keeps only a DB-satisfiable minimum; publish enforces the full authoritative set. Delta vs current publish validator — publish now ALSO requires `slug, quantity, features, materials, care_instructions, shipping_details, dimensions (parseable W·D·H), weight`, and `alt` on every image + media entry; the six auto-generated fields (Phase 2.5) are NEVER blocking. **CURRENT (`:287-322`, the shared validator):**
```ts
function validateProductRules(p: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const typeKey = typeof p.product_type === 'string' ? p.product_type : '';
  const rules: TypeRules = PRODUCT_TYPE_RULES[typeKey] ?? PRODUCT_TYPE_RULES.miniature;

  const missing = rules.required.filter((f) => {
    const v = p[f];
    if (v === undefined || v === null) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  });
  if (missing.length) problems.push(`Missing required fields: ${missing.join(', ')}`);

  if (!Number.isInteger(p.price) || (p.price as number) <= 0) {
    problems.push('Price must be a positive integer in cents');
  }

  const needsImages = rules.minHero > 0 || rules.minGallery > 0 || rules.requireThumbnail;
  const images = Array.isArray(p.images) ? (p.images as ImageEntry[]) : null;
  if (needsImages && (!images || images.length === 0)) problems.push('images array is required');
  const imgList = images ?? [];
  const filenameOf = (img: ImageEntry): string => {
    const u = typeof img?.url === 'string' ? img.url : '';
    return u.split('/').pop() ?? '';
  };
  const roleName = (img: ImageEntry): string => filenameOf(img).replace(/^test_/, '');
  const heroImages = imgList.filter((img) => roleName(img).startsWith('hero-'));
  const galleryImages = imgList.filter((img) => roleName(img).startsWith('gallery-'));
  if (heroImages.length < rules.minHero) problems.push(`At least ${rules.minHero} hero image(s) required`);
  if (rules.requireThumbnail && (typeof p.thumbnail !== 'string' || !(p.thumbnail as string).trim())) {
    problems.push('Thumbnail URL required');
  }
  if (galleryImages.length < rules.minGallery) problems.push(`Minimum ${rules.minGallery} gallery images required`);

  return problems;
}
```
**NEW (rename → `validatePublishRules`, expand to the authoritative set; add a lean `validateCreateShape`):**
```ts
// PUBLISH gate — Sean v3.5 authoritative required set. Runs on BOTH publish branches (never on create),
// so a piece can go live only fully-formed. The six auto-generated fields (checkout_*/seo_*, Phase 2.5)
// are deliberately NOT here — publish fills them, so they never block. Reports ALL problems at once.
function validatePublishRules(p: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const typeKey = typeof p.product_type === 'string' ? p.product_type : '';
  const rules: TypeRules = PRODUCT_TYPE_RULES[typeKey] ?? PRODUCT_TYPE_RULES.miniature;

  const str = (k: string) => (typeof p[k] === 'string' ? (p[k] as string).trim() : '');
  const list = (k: string) => (Array.isArray(p[k]) ? (p[k] as unknown[]).filter((x) => String(x).trim()) : []);

  const REQUIRED_STR = ['title', 'slug', 'headline', 'description', 'story_card', 'product_type', 'weight'];
  const missing = REQUIRED_STR.filter((f) => !str(f));
  const REQUIRED_LIST = ['features', 'materials', 'care_instructions', 'shipping_details'];
  for (const f of REQUIRED_LIST) if (!list(f).length) missing.push(f);
  if (p.quantity === undefined || p.quantity === null) missing.push('quantity');
  if (missing.length) problems.push(`Missing required fields: ${missing.join(', ')}`);

  if (!Number.isInteger(p.price) || (p.price as number) <= 0) {
    problems.push('Price must be a positive integer in cents');
  }
  if (p.quantity !== undefined && p.quantity !== null && (!Number.isInteger(p.quantity) || (p.quantity as number) < 0)) {
    problems.push('Quantity must be a non-negative integer');
  }

  // dimensions must parse to W · D · H (validate-and-format is a SURFACE concern; here we only gate).
  const dims = str('dimensions');
  const hasWDH = /([\d.]+)\s*"?\s*W/i.test(dims) && /([\d.]+)\s*"?\s*D/i.test(dims) && /([\d.]+)\s*"?\s*H/i.test(dims);
  if (!hasWDH) problems.push('dimensions (W × D × H) required');

  const needsImages = rules.minHero > 0 || rules.minGallery > 0 || rules.requireThumbnail;
  const images = Array.isArray(p.images) ? (p.images as ImageEntry[]) : null;
  if (needsImages && (!images || images.length === 0)) problems.push('images array is required');
  const imgList = images ?? [];
  const filenameOf = (img: ImageEntry): string => {
    const u = typeof img?.url === 'string' ? img.url : '';
    return u.split('/').pop() ?? '';
  };
  const roleName = (img: ImageEntry): string => filenameOf(img).replace(/^test_/, '');
  const heroImages = imgList.filter((img) => roleName(img).startsWith('hero-'));
  const galleryImages = imgList.filter((img) => roleName(img).startsWith('gallery-'));
  if (heroImages.length < rules.minHero) problems.push(`At least ${rules.minHero} hero image(s) required`);
  if (rules.requireThumbnail && (typeof p.thumbnail !== 'string' || !(p.thumbnail as string).trim())) {
    problems.push('Thumbnail URL required');
  }
  if (galleryImages.length < rules.minGallery) problems.push(`Minimum ${rules.minGallery} gallery images required`);

  // alt on every media asset (images + media[]).
  const altMissing = imgList.some((img) => !(typeof img?.alt === 'string' && img.alt.trim()));
  if (altMissing) problems.push('Every image needs alt text');
  const media = Array.isArray(p.media) ? (p.media as Array<Record<string, unknown>>) : [];
  if (media.some((m) => !(typeof m?.alt === 'string' && (m.alt as string).trim()))) {
    problems.push('Every video needs alt text');
  }

  return problems;
}

// CREATE shape — the DB-satisfiable minimum so an incomplete draft can persist (auto-save-as-draft).
// The full gate runs at publish (validatePublishRules), which re-validates on BOTH publish branches.
function validateCreateShape(p: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (typeof p.title !== 'string' || !p.title.trim()) problems.push('title is required');
  if (!Number.isInteger(p.price) || (p.price as number) <= 0) {
    problems.push('Price must be a positive integer in cents');
  }
  return problems;
}
```
Retarget the three call sites. **CURRENT — create (`:183`):** `  const problems = validateProductRules(product as Record<string, unknown>);` → **NEW:** `  const problems = validateCreateShape(product as Record<string, unknown>);`. **CURRENT — edit-publish (`:631`):** `    const shapeProblems = validateProductRules(merged);` → **NEW:** `    const shapeProblems = validatePublishRules(merged);`. **CURRENT — first-publish (`:654`):** `  const shapeProblems = validateProductRules(row as Record<string, unknown>);` → **NEW:** `  const shapeProblems = validatePublishRules(row as Record<string, unknown>);`. *(`PRODUCT_TYPE_RULES` `:281-286` + `TypeRules` `:280` stay — `validatePublishRules` still reads `minHero`/`minGallery`/`requireThumbnail`; `required` on the rule object is now unused by the publish path but harmless.)*
*(Relaxing CREATE to title+price is a GPT-contract change — createProduct today gets full-shape feedback at create. **SETTLED:** WS10 **Phase 10.2b** adds the instruction beat "createProduct is lenient (title+price min); the field gate is at PUBLISH" so the GPT still assembles a full product but isn't surprised by a lenient 200 on a partial create. Client-side `buildProductPayload` already requires title+price.)*

> **✅ OWNER DECISION — RESOLVED (round-1 cold-A #1; Sean, v3.6.7; REVIEW_PROMPTS ledger 66).** The expanded `validatePublishRules` re-runs on **edit-publish (`:631`)** and **first-publish (`:654`)**, so it also gates **republish** and the **Available OFF→ON round-trip** (Phase 2.2 unpublishes to draft on OFF; the `commitAvail` ON seam then re-publishes, hitting the full gate). The surfaced worry was that a piece published under the OLD looser `validateProductRules` could 400 on republish for fields it never had to carry (`features / materials / care_instructions / shipping_details / dimensions(W·D·H) / weight` + alt on every image/media — alt is a NEW hard gate, ledger 23). **Sean's decision: the strict gate STANDS for every piece — no grandfather, no backfill.** Rationale: there are **no live pieces yet** (the catalog is empty), so nothing predates the strict rules, and products were always intended to carry the full set. The concern therefore shifts from *rescuing legacy pieces* (moot — none exist) to **forward collection**: making sure **every create path gathers the full publish set** so a maker never hits a confusing publish-400. **Folded (v3.6.7):** (1) **WS10 §10.1c** flags the seven publish-required detail fields `required to publish` on the GPT `createProduct`+`editProduct` schema (schema-only, no `.txt` cost) so the GPT collects them up front, just like the dashboard's form fields already do; (2) STORE_ADMINISTRATION.md + the PRODUCT-REFERENCE knowledge file document the required-to-publish set (§10.6 doc-impact, both surfaces); (3) the `commitAvail` ON seam (WS2 seam table, `:457`) still **surfaces the 400 as a field-list toast** — never a silent no-op; (4) TESTING item 6b now tests the strict gate on BOTH surfaces. **Stray pre-cutover piece:** if a piece is created before this ships (unplanned, via the old flow), filling its fields is a normal part of getting it live — item 6b covers the 400's legibility. Do NOT re-raise this as an *unaddressed regression* — the decision is made and its forward fold has landed.

**Doc impact:** `EVERLASTINGS_STORE.md` + `GPT_SETUP.md` — document the two-tier validation (create-minimum vs the full publish gate), the authoritative publish required set, and that `seo_*`/`checkout_*` auto-generate at publish (never block).

**Phase 2.8 — `api/products.ts` publicView: strip `scheduled_publish_at` from the public projection.** It's a new INTERNAL column — per the `:44-48` boundary note, a new secret/internal column is the one thing that must be added here (public columns flow through automatically). **CURRENT (`:49-56`):**
```ts
function publicView<T extends Record<string, unknown>>(row: T) {
  const {
    draft, preview_token, is_test,
    is_published, published_at, archived_at, stripe_product_id,
    checkout_name, checkout_description, checkout_image,
    ...pub
  } = row;
  return pub;
}
```
**NEW:**
```ts
function publicView<T extends Record<string, unknown>>(row: T) {
  const {
    draft, preview_token, is_test,
    is_published, published_at, archived_at, stripe_product_id, scheduled_publish_at,
    checkout_name, checkout_description, checkout_image,
    ...pub
  } = row;
  return pub;
}
```
*(`tsc` will flag `scheduled_publish_at` as unused-destructure only if `noUnusedLocals` is on; the sibling internals here are already destructured-to-discard, so it matches the existing pattern — no `_`-prefix needed.)*

**Doc impact:** none beyond the schema note in Phase 2.3.

---

**Cross-cutting notes for this WS:**
- **No new serverless function, no new cron** — the schedule fold rides the existing `product-feed` GET; the migration adds one column + one index; every other change is inside `api/products.ts`. All scoped by `isTest` (fold is prod-only; PUT/publish inherit `.eq('is_test', isTest)`). Money stays integer cents. `tsc --noEmit` clean, CommonJS output preserved (no new ESM-only imports).
- **Hot GET untouched** — the public `GET ?slug=`/`GET ?id=` paths (`:96-139`) still return the raw row; the surface merges `draft` client-side exactly as `editorHTML`'s `eff()` (`:340`) and `admin.js:310` do.
- **Republish is Stripe-safe** — `stripeSync.ts:39-47` short-circuits when `stripe_product_id` is set, so unpublish→republish never creates a duplicate Stripe product.

---

## WS3 — Orders surface + reconciliations

> **Integration-seam for the surface; PRESERVE the existing refund behavior; byte-anchored for the small backend reconciliations.**

The redesigned Orders surface (`assets/docs/archive/v3_5/design-handoff/out/orders-app.js` + `out/orders.html`) is a pure design mock: it reads `window.PORTAL_DATA.orders` (`orders-app.js:10`) and every "mutation" edits that in-memory array and re-renders. No `fetch` exists anywhere in it — `portal.js` exposes only `toast` / `esc` / `mountShell`, **no auth or fetch helper**. This workstream wires each mock/no-op to its real endpoint on `api/orders.ts` and lands three backend reconciliations. **No new serverless function** (all four verbs already live in `api/orders.ts`); `isTest` and `supabase` are already imported/in-scope; run `npx tsc --noEmit` clean after the TS edits.

<!-- RESOLVED (v3.6.6, round-1 #tiny): the portal auth helper IS provided — WS1 §1.3b exposes `PORTAL.authHeader()` (session token off `P.supabase`), and every data-wiring call below carries `...P.authHeader()`. No separate investigation needed before wiring. -->

### Integration seam — `orders-app.js` mock/no-op → real endpoint

| orders-app.js — current (mock / no-op)                             | Real call the seam wires                                                                                   | Response / notes                                                                                                                        |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `orders = D.orders.map(...)` load (`:10`)                          | `GET /api/orders?status=&q=`                                                                               | `{orders: Order[]}` — replace the mock array; re-render on load                                                                         |
| tab filter + search over the array (`:42-52`, `:74-81`)            | keep client-side, or pass `?status=needs_shipping\|shipped` + `&q=`                                        | server filters mirror the client ones (`orders.ts:71-93`) — either is correct; client-side is simplest                                  |
| mark-shipped `ship-go` local mutate (`:161-166`)                   | `PATCH /api/orders/:id` `{tracking_number, tracking_carrier}`                                              | `{ok, order, email_sent, email_skipped?, email_error?}` — carrier value ("FedEx" etc.) maps 1:1; server canonicalizes (`orders.ts:133`) |
| resend `data-resend` local stamp (`:144`)                          | re-`PATCH /api/orders/:id` with the existing `{tracking_number, tracking_carrier}`                         | server re-stamps `tracking_email_sent_at` (mirrors `/admin` `submitShip(…, isResend)`, `admin.js:964`)                                  |
| refund open — `groups().find` in-memory (`:174`)                   | `GET /api/orders?payment_intent=<pi>`                                                                      | `{orders}` → filter `status !== 'refunded'` (Phase 3.1a)                                                                                |
| refund submit `doRefund` local mutate (`:217-226`)                 | `POST /api/orders/:id/refund` `{amount_cents, relist_product_ids}`                                         | `{ok, status, relist:[{product_id,slug,title,available,quantity,archived}]}`; `409`/`502` inline (Phase 3.1)                            |
| `seen` Set + "new" highlight, "no data source yet" (`:12`, `:133`) | poll `GET /api/orders`; new = a fresh `completed` row by `created_at`; badge from the needs-shipping count | data-flow.md:116-117 (no push channel)                                                                                                  |
| copy address `navigator.clipboard` (`:141`)                        | none — client-only                                                                                         | keep as-is                                                                                                                              |
| `#envChip` static "Test" (`orders.html:118`)                       | `GET /api/config` → `{isTest}`                                                                             | show/hide the chip from `isTest` (data-flow.md:154)                                                                                     |

*(After a successful PATCH/POST the design's mutate-then-`render()` may stay as an optimistic update, but a `GET /api/orders` reload is authoritative — the backend owns the status/relist flip, mirroring `/admin`'s `setTimeout(loadOrders, …)`.)*

**Doc impact:** none (INTEGRATION.md's "unseen/new — no data source yet" note becomes "poll + `created_at`").

---

**Phase 3.1 — Refund = PRESERVE the UI, port the behavior (`orders-app.js`).** Do **not** rebuild the refund modal — the design's model (a per-piece **+ Add** that sums into a **freely editable** amount + a **separate per-piece Relist switch**) already matches the backend's `{amount_cents, relist_product_ids}` split and the "refund and relist are independent decisions" contract (data-flow.md:114) *better* than `/admin` does. `POST /api/orders/:id/refund` is **unchanged**. The wiring closes four gaps between the mock's local logic and the real contract:

**a. Load siblings by PaymentIntent.** `openRefund(pi)` rebuilds the piece list from the in-memory `groups()` (`orders-app.js:174`). Wired, it must fetch the cart's full sibling set — a multi-piece cart can straddle needs/shipped subtabs — exactly as `/admin` does (`admin.js:1016-1022`):
- `GET /api/orders?payment_intent=<pi>` → filter `o.status !== 'refunded'` → render those as the modal's `rpiece` rows.
- *(This is the contract the backend already added for this purpose — `orders.ts:79-80`.)*

**b. Pre-fill the single-item case.** `/admin` pre-checks the clicked line and pre-fills the amount (`admin.js:1029`, `:1047`); the design opens per-**purchase** (`data-refund="${g.pi}"`, `:115`) and starts the amount at `"0.00"` with nothing added (`:190`). Adapt, don't fight the per-purchase card: when the purchase has **exactly one** non-refunded piece, pre-toggle its **+ Add** so `refundAmount` pre-fills (the common single-item case, matching `admin.js:1004`); multi-piece stays owner-selected (the design's current behavior).

**c. Replace the local status/quantity mutation with the POST.** `doRefund` currently flips added-but-not-relisted pieces to `refunded` and bumps `quantity` locally (`:222-223`). That is the mock guessing at semantics the backend owns. Wired: `POST /api/orders/:id/refund` with `amount_cents = refundCents()` (`:210`) and `relist_product_ids` = the **Relist switches** (`[data-rrelist]:checked`, `:220`) — **not** the +Add toggles (those only build the amount). The backend flips + relists exactly the returned pieces (`orders.ts:293-341`); a goodwill/partial amount with no relist flips nothing (`status` stays). Then reload the list. *(The response's `relist[]` can drive the success toast the design already shows, `:225`; the `/admin` per-piece restore-confirm loop, `admin.js:1083-1089`, is optional parity, not required — the Relist switches already carry the intent up front.)*

**d. Owner-confirm + error surfacing.** Invariant: **refund is owner-confirmed, never auto-issued.** The design's deliberate modal + red destructive **Refund** button (`orders.html:140`, `btn--danger`) satisfies this; a second `window.confirm` (as in `admin.js:1060`) is optional. Surface `409` ("already refunded" / "no payment") and `502` ("Stripe refund failed — check the amount, then the Stripe dashboard") **inline**, not as a dead screen (data-flow.md:161-163).

*Verified against the `/admin` contract:* the editable-amount + auto-sum behavior (`orders-app.js:196-210`) already matches `admin.js:1044-1050`; only the four items above diverge. No refund-modal markup or CSS changes.

**Doc impact:** none (backend refund behavior unchanged; STORE already documents "one cart = N `orders` rows on one PaymentIntent; refund is an amount + per-piece relist").

---

**Phase 3.2 — `api/orders.ts` PATCH: add a refunded 409 guard (byte-anchored).** The mark-shipped handler goes straight from id-validation to the `orders` UPDATE + tracking email (`orders.ts:155-209`) with **no status check** — it will ship a refunded order and email the buyer. Add the same 409 guard the refund handler already carries (`orders.ts:280-282`), scoped by `isTest` per invariant.

> Line numbers are hints; the quoted CURRENT text is the anchor. If it doesn't match the working tree byte-for-byte, STOP and reconcile.

**CURRENT (`api/orders.ts:111-115`):**
```ts
  if (!id || !UUID_RE.test(id)) {
    return jsonResponse(request, { error: 'Invalid order id' }, 400);
  }

  let body: PatchBody;
```

**NEW (insert the refunded guard between the id check and the body parse):**
```ts
  if (!id || !UUID_RE.test(id)) {
    return jsonResponse(request, { error: 'Invalid order id' }, 400);
  }

  // Never ship (or re-email) a refunded order — mirror the refund handler's 409 guard (:280-282).
  // A refunded piece must not trigger a tracking email to the buyer.
  const { data: existing, error: existingErr } = await supabase
    .from('orders')
    .select('status')
    .eq('id', id)
    .eq('is_test', isTest)
    .single();
  if (existingErr || !existing) {
    return jsonResponse(request, { error: 'Order not found' }, 404);
  }
  if (existing.status === 'refunded') {
    return jsonResponse(request, { error: "This order is refunded — it can't be shipped." }, 409);
  }

  let body: PatchBody;
```

*(Bonus: the pre-check's `.eq('is_test', isTest)` also closes a cross-env hole — today's UPDATE at `:155-167` scopes only by `id`, so a valid id from the other env would mark-ship + email. The guard now 404s it first. `supabase` and `isTest` are already in scope, `orders.ts:7`/`:57`/`:68` — no new import, tsc-clean.)* The surface reads this as data-flow.md:110's `409 "already refunded"` state on mark-shipped.

**Doc impact:** `STORE_ADMINISTRATION.md` mark-shipped note — "a refunded order can't be marked shipped (409)"; test-script mark-shipped case gains the refunded→409 expectation. *(As-built, post-build — no mid-build STORE edit.)*

---

**Phase 3.3 — `shipping_address` read: make it source-resilient (byte-anchored).** The design reads a **top-level** `order.shipping_address` (`orders-app.js:36`), and the API returns it under the `customers` embed too (`orders.ts:66`). Verified against the code, **both exist** — see the note below — so this is a defensive fallback that honors the embed as the contract, not a bug-fix.

**CURRENT (`orders-app.js:36`, inside `groups()`):**
```js
      address: lines[0].shipping_address,
```

**NEW (resolve from either the top-level column or the `customers` embed):**
```js
      address: lines[0].shipping_address || lines[0].customers?.shipping_address || null,
```

The address-render at `orders-app.js:99-100` (`a.line1`/`line2`/`city`/`state`/`postal_code`) needs no change and needs **no `.name` handling** — the address JSON carries no name in either source; the buyer name is the sibling column `customers.name`, which the design already renders correctly at `:104`/`:106` via `g.customer.name`.

> **Source confirmed (ledger 14 — SETTLED).** The `orders` table has its **own** top-level `shipping_address jsonb` column (`supabase/migrations/20260421000001_initial_schema.sql:109`), written per row by the webhook (`api/webhook.ts:195`), and `GET`'s `select('*, …')` (`orders.ts:65`) returns it. So `order.shipping_address` **does** resolve top-level (matching the design *and* data-flow.md:95); the `customers` embed (`orders.ts:66`) carries a duplicate. The earlier "shipping_address is ONLY nested under customers, with a name field" claim was WRONG — the top-level column is canonical and the either-source read is a defensive fallback. Neither source carries a `name` — the value is Stripe's `session.collected_information.shipping_details.address` (`webhook.ts:116`), i.e. `{line1,line2,city,state,postal_code,country}`; the buyer name is `customers.name` (`webhook.ts:128`, `initial_schema.sql:84`).

**Byte-anchor for the seam contract — CURRENT (`orders.ts:66`):**
```ts
      '*, products(title, slug, thumbnail, thumbnail_alt), customers(name, email, phone, shipping_address)',
```

**Doc impact:** none (read-shape only; no API change).

---

**Phase 3.4 — Drop `delivered` from the UI enum (verified: no writer).** `delivered` is enumerated in the schema comment and has a `delivered_at` column marked *"post-launch, via Shippo webhook"* (`initial_schema.sql:108`, `:116`) and in data-flow.md:92 — but **no code writes `status='delivered'`**. Verified: `api/webhook.ts` writes only `'completed'` (`:194`) and `'refunded'` (`:74`); `orders.ts` PATCH writes `'shipped'` (`:161`) and the refund POST writes `'refunded'`; the sole cron is `/api/product-feed` (`vercel.json:5`) — no Shippo/delivery integration exists yet.

**DECISION: prune the dead `delivered` UI now** — it renders a state the data never reaches. This is a UI-only prune; the schema's `delivered`/`delivered_at` stay intact for the post-launch Shippo webhook, and the pill is re-added when that writer lands.
- Remove the `delivered` branch in `statusPill` (`orders-app.js:69`):
  ```js
      if (l.status === "delivered") return `<span class="tpill tpill--delivered"><span class="pdot"></span>Delivered</span>`;
  ```
- Remove the now-unused `.tpill--delivered` rules (`orders.html:51-52`).

**Doc impact:** INTEGRATION.md / the data-flow Order-status list note "`delivered` is deferred (Shippo, post-launch) — not rendered until a writer exists."

---

## WS4 — Sales surface + store-wide-sale display/auto-apply + storefront struck-pricing

> **Byte-anchored where backend; integration-seam for the surface wiring.**

The foundation already exists: `handleCoupon` / `handleCouponList` / `handleCouponDeactivate` in `api/products.ts` already create, list, and end owner coupons tagged `metadata.source='owner_sale'`, and `checkout.js` already owns `checkout.applyPromotionCode` (`wirePromo`, checkout.js:144–167). This workstream is the **DISPLAY + AUTO-APPLY** layer on top of that: one owner `%` coupon becomes the store-wide sale, the storefront reads it publicly, auto-applies it at checkout, and paints struck pricing everywhere a price renders.

*The locked shape: the store-wide sale is ONE owner coupon — PERCENTAGE only for on-site struck pricing + auto-apply — tagged `metadata.source='owner_sale'` + `metadata.auto_apply='true'` + a known promo code. A `$`-off "store-wide" sale from the design's toggle stays a plain owner coupon with a code (no `auto_apply`, no struck pricing). We do NOT touch the server `discounts` param — `allow_promotion_codes:true` (checkout.ts:105) stays, and auto-apply happens client-side via `applyPromotionCode`.*

---

### Phase 4.0 — the #219 probe (GATING — do this FIRST on the dev preview)

Before auto-apply is locked into `checkout.js`, **probe on the dev preview** whether Stripe.js `checkout.applyPromotionCode(code)` fires reliably at Custom Checkout session **INIT** (immediately after the elements mount, before any user interaction). The loaded Basil bundle's real surface has repeatedly diverged from the published docs (memory `reference_stripe_custom_checkout`: *"docs are wrong for the loaded bundle; probe-first, never add update\* bridges over mounted elements"*), so this is a known landmine, not a formality.

**How to probe (dev preview URL, never localhost):** create a live test `%` sale via the coupon endpoint, open `/checkout` with an item in cart, and in the console inspect the object the code already stashes:

```
window.__checkout                                  // checkout.js:70 keeps this for probing
typeof window.__checkout.applyPromotionCode        // expect 'function' (already used by wirePromo)
typeof window.__checkout.removePromotionCode       // <-- probe: does a remove exist on THIS bundle?
await window.__checkout.applyPromotionCode('<CODE>')// call at INIT; does session.total drop? any error?
```

Record FOUR answers: (1) does `applyPromotionCode` succeed when called at init (before the shopper touches a field), (2) does the `change` listener then see the discounted `session.total.total.amount`, (3) does a `removePromotionCode` (or equivalent) exist so a shopper can strip the sale code and enter a personal one, **(4) does a SECOND `applyPromotionCode(OTHER_TEST_CODE)` after the sale succeeds REPLACE (new code wins → `session.total.discount.promotionCode` = OTHER), STACK-AND-ERROR (call rejects), or STACK-AND-BOTH (both apply — a Stripe contract violation, would surprise us).** Answer (4) determines the `wirePromo` Apply-handler branch below: on REPLACE it stays a single `applyPromotionCode(newCode)`; on STACK-AND-ERROR it must `removePromotionCode()` first (assuming answer (3) says one exists), then `applyPromotionCode(newCode)`; on STACK-AND-BOTH stop and surface — that's outside Stripe's documented one-discount-per-order contract.

**Fallbacks (the build proceeds either way — pick per probe result):**
- **Init works →** auto-apply on `initCheckout` completion (the primary path below).
- **Init is flaky →** apply on the first `checkout.on('change')` tick instead (defer one event loop), still invisible to the shopper.
- **Apply-at-init rejected entirely →** *prefill* the promo field (`#promo-code`, checkout.html) with the sale code + a visible one-tap "Apply sale" — degrades to one tap, never blocks purchase.
- **No `removePromotionCode` on the bundle →** the keyword field stays the removal path IF answer (4) = REPLACE (typing a personal code and pressing Apply swaps the promotion, "delete the sale, use mine" still works without a dedicated remove call). If answer (4) = STACK-AND-ERROR, `wirePromo`'s Apply handler MUST attempt a `removePromotionCode()` first — if neither exists (3 said no, 4 said stack-error), the fallback becomes the prefilled promo field + a visible "Apply sale" button per the third fallback above (the shopper can then clear it manually and enter their own).

**STACK-AND-ERROR concrete `wirePromo` skeleton.** If Phase 4.0 answer (4) = STACK-AND-ERROR, `wirePromo`'s Apply-click handler (`checkout.js:~144-167`) needs the remove-then-apply sequence. Concrete NEW block (locate-and-apply on the existing `.addEventListener('click', ...)`; adjacent to Phase 4.4's edits):
```js
// v3.6.2 — STACK-AND-ERROR fallback (per Phase 4.0 answer 4). Remove any active sale FIRST, then apply
// the shopper's code. If remove succeeds but apply throws, RE-APPLY the sale so the shopper is never
// left with NO discount + surface a friendly retry toast (Journey-#5 race guard).
const saleCode = window._activeSale?.code;              // set at init by autoApplyStoreWideSale
try {
  if (saleCode && typeof checkout.removePromotionCode === 'function') {
    await checkout.removePromotionCode();
  }
  await checkout.applyPromotionCode(input.value);
} catch (err) {
  if (saleCode) { try { await checkout.applyPromotionCode(saleCode); } catch {} } // best-effort restore
  toast("Couldn't apply that code — try again?");
}
```
On REPLACE (answer 4 = REPLACE), skip the remove — a single `applyPromotionCode(newCode)` swaps the promotion (the existing branch). On STACK-AND-BOTH, DO NOT auto-apply — surface + stop (out-of-contract).

**Doc impact:** none (records a verified platform behavior; fold the probe result into `EVERLASTINGS_STORE.md` only if it changes the auto-apply contract).

---

### Phase 4.1 — `api/products.ts`: extend `handleCoupon` to accept + stamp `metadata.auto_apply` and supersede the prior auto-sale.

*4.1.a — accept the flag on the request body.* **CURRENT (`api/products.ts:694–703`):**
```ts
  let body: {
    type?: 'percent' | 'amount';
    value?: number;
    code?: string;
    product_ids?: string[];
    min_amount?: number;
    expires_date?: string;   // YYYY-MM-DD — preferred; normalized to a store-TZ end-of-day below
    expires_at?: number;     // Unix (legacy/back-compat)
    max_redemptions?: number;
  };
```
**NEW (add `auto_apply`):**
```ts
  let body: {
    type?: 'percent' | 'amount';
    value?: number;
    code?: string;
    product_ids?: string[];
    min_amount?: number;
    expires_date?: string;   // YYYY-MM-DD — preferred; normalized to a store-TZ end-of-day below
    expires_at?: number;     // Unix (legacy/back-compat)
    max_redemptions?: number;
    auto_apply?: boolean;    // v3.5 — the no-code store-wide sale: apply on-site + struck pricing (percent only)
  };
```

*4.1.b — stamp `auto_apply='true'` on the coupon (percent-only).* **CURRENT (`api/products.ts:735`):**
```ts
  couponParams.metadata = { source: 'owner_sale' }; // tag so list/deactivate skip system codes
```
**NEW:**
```ts
  // v3.5 — auto_apply is the store-wide "no code needed" sale. Percent ONLY (struck pricing on-site
  // needs a ratio, not a flat cents amount); a $-off "store-wide" stays a plain shareable code.
  const autoApply = body.auto_apply === true && body.type === 'percent' && !(Array.isArray(body.product_ids) && body.product_ids.length); // v3.6.6 — auto_apply is store-wide ONLY: a product-scoped % coupon is never stamped auto_apply, so "auto_apply ⇒ store_wide" is a SERVER invariant (was caller-convention only); active_sale/struck then only ever reflect a whole-store sale (round-1 breadth #D)
  couponParams.metadata = autoApply
    ? { source: 'owner_sale', auto_apply: 'true' }
    : { source: 'owner_sale' }; // tag so list/deactivate skip system codes
```

*4.1.c — after the new promo is created, supersede any PRIOR active auto-sale.* Only ONE active auto-apply store-wide `%` sale exists at a time; "set a new one" **ends the prior automatically**. Create-new-first, then deactivate-old (mirrors the price-rotation ordering at products.ts:411–447 — a failure never leaves zero sales). **CURRENT (`api/products.ts:745–746`):**
```ts
    const promo = await stripe.promotionCodes.create(promoParams);
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id, expires_display: typeof body.expires_at === 'number' ? formatExpiry(body.expires_at) : null });
```
**NEW:**
```ts
    const promo = await stripe.promotionCodes.create(promoParams);
    // v3.5 — exactly ONE auto-apply store-wide sale runs at a time. Now that the new one exists,
    // end every OTHER active auto_apply owner_sale promo (best-effort: a failure here is non-fatal —
    // the storefront's active-sale read returns the first match, so the newest simply wins).
    if (autoApply) {
      let swept = 0;
      const SWEEP_CAP = 2000;
      for await (const pc of stripe.promotionCodes.list({ active: true, limit: 100 })) {
        swept += 1;
        if (pc.id !== promo.id && pc.coupon?.metadata?.source === 'owner_sale' && pc.coupon?.metadata?.auto_apply === 'true') {
          try { await stripe.promotionCodes.update(pc.id, { active: false }); }
          catch (err) { console.error('Superseding prior auto-sale failed (non-fatal):', err); }
        }
        if (swept >= SWEEP_CAP) break;
      }
    }
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id, expires_display: typeof body.expires_at === 'number' ? formatExpiry(body.expires_at) : null });
```

*Note: `handleCouponList` (products.ts:808) already keys isolation on `pc.coupon?.metadata?.source === 'owner_sale'`, so the new `auto_apply` coupon lists + deactivates through the existing owner paths with no change there. Ending the store-wide sale is just `coupon_deactivate` on that promo.*

*4.1.d — surface `auto_apply` on the coupon-list output for unambiguous end-sale identification (round-1 #5).* `handleCouponList`'s per-entry return (`products.ts:816-826`) **already** carries `percent_off` + `store_wide` (`!scopedProducts || scopedProducts.length === 0`); add one field — `auto_apply: pc.coupon?.metadata?.auto_apply === 'true'` — to the same return object so **either** surface (portal OR GPT) can pick the store-wide sale without guessing. **End-sale heuristic (both surfaces):** the store-wide sale is the single active owner coupon that is `store_wide:true` **and** `percent_off != null` **and** `auto_apply:true` — supersede (Phase 4.1.c) guarantees exactly one such coupon, so "end the sale" = `coupon_deactivate` on THAT promo. The `store_wide + percent_off` pair already disambiguates it from a product-scoped % owner coupon; the added `auto_apply` marker also disambiguates it from a *manual* store-wide % coupon a maker might create without auto-apply. This needs **no** new GPT Action and **no** GPT-instruction `.txt` bytes. **Parity (precise — round-1 breadth #B):** the GPT already ends the sale via its COUPONS beat (§10.2 — "auto_apply:true = the automatic store-wide sale; end via `deactivateCoupon {code}`") using the `store_wide` scope + `percent` that `listCoupons` **already** returns and relays; the added `auto_apply` field is a belt-and-suspenders disambiguator — to expose it to the GPT too (belt-and-suspenders against a manual store-wide % coupon), include `auto_apply` in the `listCoupons` Action **response schema** (schema-only, no `.txt` cost, WS10). So "rides the existing output" holds for the portal outright and for the GPT via scope+percent, with `auto_apply` as the added tiebreaker — the deactivate op already exists on both surfaces.*

**Doc impact:** `EVERLASTINGS_STORE.md` — new fact: the store-wide sale is ONE owner `%` coupon tagged `metadata.auto_apply='true'`; creating a new one supersedes the prior; only one active at a time.

---

### Phase 4.2 — `api/products.ts`: public active-sale read folded into the GET dispatch (NO new function, NO auth).

*4.2.a — hook it into the GET router BEFORE the auth'd coupon list.* **CURRENT (`api/products.ts:70–71`):**
```ts
  // v1.5: list active discounts (?_action=coupon, GET) — admin/GPT only.
  if (url.searchParams.get('_action') === 'coupon') return handleCouponList(request);
```
**NEW:**
```ts
  // v3.5: PUBLIC active store-wide sale read (?_action=active_sale, GET) — NO auth. The storefront
  // reads the single active auto_apply owner_sale % coupon for struck pricing + checkout auto-apply.
  if (url.searchParams.get('_action') === 'active_sale') return handleActiveSale(request);

  // v1.5: list active discounts (?_action=coupon, GET) — admin/GPT only.
  if (url.searchParams.get('_action') === 'coupon') return handleCouponList(request);
```

*4.2.b — the handler, folded into the SAME module (no new `api/*.ts` file → function count unchanged).* Append after `handleCouponList`. **CURRENT (`api/products.ts:831–836`, the tail of `handleCouponList`):**
```ts
    return jsonResponse(request, { coupons, truncated: scanned >= SCAN_CAP });
  } catch (err) {
    console.error('Coupon list failed:', err);
    return jsonResponse(request, { error: 'Failed to list coupons' }, 502);
  }
}
```
**NEW (same, then the new function):**
```ts
    return jsonResponse(request, { coupons, truncated: scanned >= SCAN_CAP });
  } catch (err) {
    console.error('Coupon list failed:', err);
    return jsonResponse(request, { error: 'Failed to list coupons' }, 502);
  }
}

// ?_action=active_sale (GET) — PUBLIC, no auth. Returns the ONE active store-wide auto-apply sale
// (a % owner_sale coupon tagged auto_apply='true') for on-site struck pricing + checkout auto-apply,
// or { active:false }. Stripe test/live keys are env-scoped (api/_lib/stripe.ts), so this returns
// TEST codes on preview and LIVE codes in prod — the isTest boundary holds via the key, no DB filter.
// Edge-cached (s-maxage) so a busy storefront doesn't hit Stripe on every page view. Fails SOFT:
// any error reads as "no sale" (full price) so the store never breaks on a Stripe hiccup.
async function handleActiveSale(request: Request): Promise<Response> {
  const cacheHeaders = {
    ...corsHeaders(request),
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
  };
  try {
    let scanned = 0;
    const SCAN_CAP = 2000;
    for await (const pc of stripe.promotionCodes.list({ active: true, limit: 100 })) {
      scanned += 1;
      if (
        pc.coupon?.metadata?.source === 'owner_sale' &&
        pc.coupon?.metadata?.auto_apply === 'true' &&
        pc.coupon?.percent_off != null
      ) {
        return new Response(JSON.stringify({
          active: true,
          type: 'percent',
          value: pc.coupon.percent_off,
          code: pc.code,
          amount_display: pc.coupon.percent_off + '% off',
        }), { status: 200, headers: cacheHeaders });
      }
      if (scanned >= SCAN_CAP) break;
    }
    return new Response(JSON.stringify({ active: false }), { status: 200, headers: cacheHeaders });
  } catch (err) {
    console.error('Active-sale read failed (soft — treated as no sale):', err);
    return new Response(JSON.stringify({ active: false }), { status: 200, headers: corsHeaders(request) });
  }
}
```

*The `%`-off + `auto_apply='true'` guard means a $-off store-wide coupon never reports here (it has no `percent_off` and isn't stamped auto_apply) — it stays a plain shareable code, per the locked decision.*

**Doc impact:** `EVERLASTINGS_STORE.md` — new fact: `GET /api/products?_action=active_sale` is a public (no-auth) read returning `{active,type:'percent',value,code,amount_display}` or `{active:false}`, edge-cached.

---

### Phase 4.3 — `assets/js/main.js`: shared active-sale fetch + struck-price helper (loaded on every page).

*`main.js` is the one script present on all 14 storefront pages (verified) and already owns the shared price/config helpers — the sale plumbing lives here so no per-page HTML edit is needed.*

*4.3.a — add the fetch + struck helper after `formatPrice`.* **CURRENT (`assets/js/main.js:28–30`):**
```js
function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
```
**NEW:**
```js
function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

// v3.5 — store-wide sale (public read, cached once per page load onto window._activeSale). Percent-only.
let _activeSalePromise = null;
async function getActiveSale() {
  if (_activeSalePromise) return _activeSalePromise;
  _activeSalePromise = fetch('/api/products?_action=active_sale')
    .then((r) => (r.ok ? r.json() : { active: false }))
    .catch(() => ({ active: false }))
    .then((s) => { window._activeSale = s; return s; });
  return _activeSalePromise;
}

// Struck-price markup for a cents amount when a % store-wide sale is live; plain price otherwise.
// Numbers only (no user text) → the innerHTML sites that consume this are injection-safe.
function priceHTML(cents, sale) {
  sale = sale || window._activeSale;
  if (sale && sale.active && sale.type === 'percent' && Number.isFinite(cents)) {
    const discounted = Math.round(cents * (1 - sale.value / 100));
    return `<span class="price-sale"><span class="price-sale__was">${formatPrice(cents)}</span> <span class="price-sale__now">${formatPrice(discounted)}</span></span>`;
  }
  return formatPrice(cents);
}
```

*4.3.b — mount the top bar + popup on every page load.* **CURRENT (`assets/js/main.js:269–270`):**
```js
document.addEventListener('DOMContentLoaded', () => {
  initConfig();
```
**NEW:**
```js
document.addEventListener('DOMContentLoaded', () => {
  initConfig();
  getActiveSale().then(mountSaleChrome); // v3.5 — top utility bar + once-only sale popup (#221)
```

*4.3.c — the chrome injector (top bar + popup), appended near the end of `main.js` before the final closing of the DOMContentLoaded block.* Add as a module-level function (place it just above the `document.addEventListener('DOMContentLoaded', () => {` at line 269):
```js
// v3.5 — thin reusable top utility bar (free-shipping reminder by default, sale line when active) +
// a once-only dismissible upper-right sale popup. Storefront tokens only (this is the shopper brand,
// NOT the neutral portal). The bar sits in normal flow above the sticky header, so it scrolls away and
// the header then pins to top:0 (no layout hack needed — verified against .site-header position:sticky).
function mountSaleChrome(sale) {
  sale = sale || window._activeSale || { active: false };

  // --- top utility bar ---
  const bar = document.createElement('div');
  bar.className = 'sale-bar' + (sale.active ? ' sale-bar--on' : '');
  bar.setAttribute('role', 'status');
  bar.textContent = (sale.active && sale.type === 'percent')
    ? `${sale.value}% off everything — applied automatically at checkout, no code needed.`
    : 'Free shipping on every order.';
  document.body.insertBefore(bar, document.body.firstChild);

  // --- once-only upper-right popup (only when a sale is live) ---
  if (!(sale.active && sale.type === 'percent')) return;
  // localStorage key carries the CODE so a NEW sale re-announces once; the same sale never nags twice.
  const SEEN_KEY = 'everlastings.saleSeen';
  if (localStorage.getItem(SEEN_KEY) === sale.code) return;

  const pop = document.createElement('div');
  pop.className = 'sale-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Store-wide sale');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'sale-pop__close';
  close.setAttribute('aria-label', 'Dismiss');
  close.textContent = '✕';
  const body = document.createElement('div');
  body.className = 'sale-pop__body';
  const h = document.createElement('strong');
  h.textContent = `${sale.value}% off, storewide`;
  const p = document.createElement('p');
  p.textContent = 'The discount is applied automatically at checkout — no code to remember.';
  body.append(h, p);
  pop.append(close, body);
  const dismiss = () => { localStorage.setItem(SEEN_KEY, sale.code); pop.remove(); };
  close.addEventListener('click', dismiss);
  document.body.appendChild(pop);
}
```

*4.3.d — struck-price CSS (append to `assets/css/styles.css`, storefront tokens only).* Add at the end of the file:
```css
/* ---------------------------------------------------------------------------
   12. Store-wide sale — struck pricing, top utility bar, once-only popup (v3.5)
   --------------------------------------------------------------------------- */
.price-sale { display: inline-flex; align-items: baseline; gap: var(--space-sm); }
.price-sale__was { text-decoration: line-through; color: var(--text-muted); font-weight: 400; }
.price-sale__now { color: var(--accent-primary); font-weight: 600; }

.sale-bar {
  text-align: center;
  font-size: var(--text-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-ink);
  color: var(--text-inverse);
  letter-spacing: 0.02em;
}
.sale-bar--on { background: var(--accent-primary); }

.sale-pop {
  position: fixed;
  top: calc(var(--header-height) + var(--space-md));
  right: var(--space-md);
  z-index: calc(var(--z-modal) + 10);   /* above header, below cookie banner (--z-cookie: 400) */
  max-width: 320px;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--color-gold);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-lg);
}
.sale-pop__close {
  position: absolute; top: var(--space-sm); right: var(--space-sm);
  background: none; border: 0; cursor: pointer;
  font-size: var(--text-lg); line-height: 1; color: var(--text-muted);
}
.sale-pop__body strong { display: block; font-family: var(--font-display); font-size: var(--text-2xl); color: var(--accent-primary); margin-bottom: var(--space-xs); }
.sale-pop__body p { margin: 0; font-size: var(--text-sm); color: var(--text-secondary); }

@media (prefers-reduced-motion: no-preference) {
  .sale-pop { animation: sale-pop-in var(--transition-base) both; }
  @keyframes sale-pop-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
}
```

**Doc impact:** `EVERLASTINGS_STORE.md` — new fact: a top utility bar + once-only (`localStorage everlastings.saleSeen`, code-scoped) sale popup render on every storefront page from `main.js`; struck pricing uses `.price-sale`.

---

### Phase 4.4 — `assets/js/checkout.js`: auto-apply the store-wide sale (gated on 4.0) + struck total.

*4.4.a — struck checkout total in the read-only `change` listener.* **CURRENT (`assets/js/checkout.js:95–96`):**
```js
    const total = session.total?.total?.amount;
    if (Number.isFinite(total)) setText('[data-checkout-total]', formatPrice(total));
```
**NEW (strike only once the discount actually landed — `total < pre-sale subtotal`):**
```js
    const total = session.total?.total?.amount;
    if (Number.isFinite(total)) {
      const sale = window._activeSale;
      const totalEl = document.querySelector('[data-checkout-total]');
      if (totalEl && sale && sale.active && sale.type === 'percent' && total < getCartTotal()) {
        totalEl.innerHTML = `<span class="price-sale"><span class="price-sale__was">${formatPrice(getCartTotal())}</span> <span class="price-sale__now">${formatPrice(total)}</span></span>`;
      } else {
        setText('[data-checkout-total]', formatPrice(total));
      }
    }
```
*The Stripe session total is authoritative — it already reflects the auto-applied promo — so this only adds the struck "was"; it never computes the discount client-side.*

*4.4.b — call the auto-apply after `wirePromo`.* **CURRENT (`assets/js/checkout.js:106`):**
```js
  wirePromo(checkout);
```
**NEW:**
```js
  wirePromo(checkout);
  autoApplyStoreWideSale(checkout); // v3.5 — apply the store-wide sale on init (gated on the 4.0 probe)
```

*4.4.c — the auto-apply function, appended after `wirePromo`.* **CURRENT (`assets/js/checkout.js:160–167`, the tail of `wirePromo`):**
```js
    } catch (err) {
      showError('Could not apply this code. Please try again.');
    } finally {
      promoBtn.disabled = false;
      promoBtn.textContent = original;
    }
  });
}
```
**NEW (same, then the new function):**
```js
    } catch (err) {
      showError('Could not apply this code. Please try again.');
    } finally {
      promoBtn.disabled = false;
      promoBtn.textContent = original;
    }
  });
}

// v3.5 — read the public active store-wide sale and apply it at INIT (no shopper action). The keyword
// field (wirePromo) stays VISIBLE + usable: a shopper can type a personal code, which REPLACES the sale
// code via applyPromotionCode (Stripe swaps the promotion), so "delete the sale, use mine" still works.
// Gated on Phase 4.0: if apply-at-init proved flaky there, switch the trigger to the first `change` tick;
// if it was rejected outright, prefill #promo-code with sale.code instead and let the shopper tap Apply.
async function autoApplyStoreWideSale(checkout) {
  let sale;
  try { sale = await getActiveSale(); } catch { return; }
  if (!sale || !sale.active || sale.type !== 'percent' || !sale.code) return;
  const apply = checkout.applyPromotionCode; // Phase 0/4.0: the verified call on this bundle
  if (typeof apply !== 'function') return;
  try {
    const r = await apply.call(checkout, sale.code);
    if (r && r.type === 'error') {
      // Fallback: prefill the visible field so the shopper can one-tap apply.
      const input = document.getElementById('promo-code');
      if (input) input.value = sale.code;
    }
  } catch (err) {
    const input = document.getElementById('promo-code');
    if (input) input.value = sale.code;
  }
}
```
*`getActiveSale` (main.js) also sets `window._activeSale`, so 4.4.a's struck total reads the same cached result — no second fetch.*

**Doc impact:** none (wires an existing endpoint into an existing surface).

---

### Phase 4.5 — struck-`%` render on the shop grid, product page, homepage carousel, and cart.

Percent-only; each site reads `window._activeSale` (populated by `getActiveSale`, awaited before first render). Sold items always render plain (no struck on an unbuyable piece).

*4.5.a — `assets/js/shop.js`: await the sale before rendering.* **CURRENT (`assets/js/shop.js:4–5`):**
```js
document.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabase();
```
**NEW:**
```js
document.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabase();
  await getActiveSale(); // v3.5 — sets window._activeSale before the first renderTiles
```

*4.5.b — `assets/js/shop.js`: struck card price. **POINTER — do NOT apply as a standalone edit.*** WS6 §6.5a rewrites this entire shop-card block (`shop.js:126-144`) for the quantity-based `sold` state, which subsumes line 139. Apply the struck price **inside §6.5a's merged NEW block** (order WS6→WS4→WS9, per the Shared-file edit coordination section): the `card__price` line reads `${sold ? formatPrice(p.price) : priceHTML(p.price, window._activeSale)}` — struck gated on `!sold` so a sold piece renders plain (DESIGN §D.1). Applying this separately against the pristine `shop.js:139` anchor would either be reverted by §6.5a (WS6-last) or break §6.5a's block anchor (WS4-last) — the collision this pointer prevents.

*4.5.c — `assets/js/product.js`: await the sale.* **CURRENT (`assets/js/product.js:21–23`):**
```js
  await waitForSupabase();

  const product = previewToken
```
**NEW:**
```js
  await waitForSupabase();
  await getActiveSale(); // v3.5 — sets window._activeSale before populateStickyCard

  const product = previewToken
```

*4.5.d — `assets/js/product.js`: struck sticky-card price.* **CURRENT (`assets/js/product.js:369–370`):**
```js
  const priceEl = document.querySelector('[data-product-price]');
  if (priceEl) priceEl.textContent = formatPrice(p.price);
```
**NEW:**
```js
  const priceEl = document.querySelector('[data-product-price]');
  if (priceEl) {
    const sale = window._activeSale;
    const sold = p.quantity != null ? p.quantity <= 0 : !p.available; // v3.5 — struck only on a PURCHASABLE piece, never a sold one (DESIGN §D.1); same rule as §6.5b. v3.6.6 — null-fallback HARMONIZED to !p.available across every storefront site (a null-qty+null-available row now reads Sold uniformly, matching the server checkout gate's fail-safe: available!==true ⇒ not buyable, so a Sold display is honest)
    if (!sold && sale && sale.active && sale.type === 'percent') priceEl.innerHTML = priceHTML(p.price, sale);
    else priceEl.textContent = formatPrice(p.price);
  }
```
*The struck gate is `!sold` (quantity-based), NOT `p.available` — a qty-0/flag-lagged piece must render plain on its PDP sticky card, matching the storefront buy-gate (§6.5b) and DESIGN §D.1. This `const sold` is block-scoped inside `if (priceEl)`, so it does not collide with §6.5b's `const sold` at `product.js:382` (a sibling block in the same `populateStickyCard` — NOT a line collision, so no coordination-list entry needed; just the same rule applied twice). Do NOT touch `injectProductJsonLd` (product.js:338–363) — the JSON-LD `offers.price` stays the true (undiscounted) unit price; a sale is a promotion, not a permanent price change.*

*4.5.e — `assets/js/homepage.js`: await the sale.* **CURRENT (`assets/js/homepage.js:5–7`):**
```js
document.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabase();

```
**NEW:**
```js
document.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabase();
  await getActiveSale(); // v3.5 — sets window._activeSale before populateFeatured

```

*4.5.f — `assets/js/homepage.js`: struck featured price. **POINTER — do NOT apply as a standalone edit.*** WS6 §6.3d rewrites the entire `populateFeatured` (`homepage.js:41-67`) into a `tile` closure, which subsumes the price line. Apply the struck price **inside §6.3d's merged `tile` block** (order WS6→WS4→WS9): the price line reads `${sold ? formatPrice(p.price) : priceHTML(p.price, window._activeSale)}` — struck gated on `!sold` so a sold-but-featured piece renders plain (DESIGN §D.1). Applying this against the pristine `homepage.js:61` anchor would either be reverted by §6.3d or break its block anchor.

*4.5.g — `assets/js/cart.js`: re-render once the sale resolves (the cart handler is sync).* **CURRENT (`assets/js/cart.js:17–18`):**
```js
  renderLineItems(cart, withItems);
  updateTotals();
```
**NEW:**
```js
  renderLineItems(cart, withItems);
  updateTotals();
  getActiveSale().then(() => { renderLineItems(getCart(), withItems); updateTotals(); }); // v3.5 struck preview
```
*(`getCart` and `getCartTotal` are **`main.js` globals** — `main.js:104` / `:167` — and `main.js` loads on every storefront page ahead of `cart.js`/`checkout.js`, so both are in scope wherever WS4 calls them [confirms the cold-read question about where these live]. `getCart()` here re-reads the current cart after the async sale resolves; the in-scope `cart` local would be equivalent since contents don't change — either is correct.)*

*4.5.h — `assets/js/cart.js`: struck line-item price.* **CURRENT (`assets/js/cart.js:64`):**
```js
        <p style="margin: 0 0 var(--space-sm); font-family: var(--font-display); font-size: var(--text-xl); color: var(--accent-primary);">${formatPrice(item.price || 0)}</p>
```
**NEW:**
```js
        <p style="margin: 0 0 var(--space-sm); font-family: var(--font-display); font-size: var(--text-xl); color: var(--accent-primary);">${priceHTML(item.price || 0, window._activeSale)}</p>
```

*4.5.i — `assets/js/cart.js`: struck subtotal/estimate (client PREVIEW — the real discount lands at checkout).* **CURRENT (`assets/js/cart.js:74–80`):**
```js
function updateTotals() {
  const total = getCartTotal();
  const subtotalEl = document.querySelector('[data-cart-subtotal]');
  const estimateEl = document.querySelector('[data-cart-estimate]');
  if (subtotalEl) subtotalEl.textContent = formatPrice(total);
  if (estimateEl) estimateEl.textContent = formatPrice(total);
}
```
**NEW:**
```js
function updateTotals() {
  const total = getCartTotal();
  const sale = window._activeSale;
  const struck = sale && sale.active && sale.type === 'percent';
  const subtotalEl = document.querySelector('[data-cart-subtotal]');
  const estimateEl = document.querySelector('[data-cart-estimate]');
  // Subtotal is the pre-sale line sum; the estimate previews the store-wide discount (applied for real
  // by Stripe at checkout). Percent-only, no minimum on the auto sale, so this preview matches checkout.
  if (subtotalEl) subtotalEl.textContent = formatPrice(total);
  if (estimateEl) estimateEl.innerHTML = struck ? priceHTML(total, sale) : formatPrice(total);
}
```
*(Verified: `cart.html:170` carries `[data-cart-subtotal]` and `:178` carries `[data-cart-estimate]` — two hooks, matches the phase shape.)*

**Doc impact:** none (display only; struck pricing reads the public active-sale).

---

### Phase 4.6 — integration-seam table: `sales-app.js` (design) → real endpoints.

Each mock/no-op call in the prototype (`assets/docs/archive/v3_5/design-handoff/out/sales-app.js`) wires to an existing endpoint — **no new `api/*.ts` function**. The `%` store-wide "Start sale" is the only call that sends `auto_apply:true`.

- **List coupons** — `renderCoupons()` reads `D.coupons` (sales-app.js:9) → **`GET /api/products?_action=coupon`** → `{coupons[], truncated?}` (auth'd). Render with the `*_display` fields (plain money).
- **Render store-wide banner** — `renderStoreWide()` reads `D.storeWideSale` (sales-app.js:11,28) → **`GET /api/products?_action=active_sale`** → `{active,type:'percent',value,code,amount_display}` or `{active:false}` (public read; the admin can reuse it, or filter the coupon list for `metadata.auto_apply`). *(The design's `storeWideSale` also modeled `$`-off; per the locked decision only `%` is auto/struck — a `$` store-wide is created as a plain coupon below.)*
- **Start store-wide sale (`%`)** — `#startStoreWide` onclick (sales-app.js:49–54) → **`POST /api/products?_action=coupon`** with `{type:'percent', value, auto_apply:true, code:'<code>'}`. A promo code is required for auto-apply + the share link, but it need **not** be human-chosen — `active_sale` / struck pricing / popup all read the code **back** from Stripe, so a Stripe-auto-generated code works everywhere (round-1 #10). Send whatever `sales-app` collects (a typed code OR a generated one); do **not** invent a code-input requirement the surface doesn't have. Server supersedes any prior auto-sale (Phase 4.1.c).
- **Start store-wide sale (`$`)** — same control with type `amount` → **`POST /api/products?_action=coupon`** with `{type:'amount', value, code:'<code>'}` (NO `auto_apply`) — a plain shareable code, not auto-applied, not struck.
- **End store-wide sale** — `#endStoreWide` → `confirmDialog` (sales-app.js:37) → **`POST /api/products?_action=coupon_deactivate`** with `{promotion_code_id}` (or `{code}`) of the active auto-sale — identify it as the single active `store_wide` + `percent_off` + `auto_apply` owner coupon from the coupon list (§4.1.d; the GPT uses the same heuristic, so both surfaces end a sale identically).
- **Create coupon** — `createSale()` (sales-app.js:177–206) → **`POST /api/products?_action=coupon`** with `{type, value, code?, product_ids?, min_amount?, expires_date?:'YYYY-MM-DD', max_redemptions?}`. *(`product_ids` are **`stripe_product_id`**, not Supabase ids — map published products first, per the v3.3 coupon decision.)* `409` = code exists; `400` = bad type/value.
- **End coupon** — `[data-end]` (sales-app.js:77–81) → **`POST /api/products?_action=coupon_deactivate`** with `{code}` → `{success, code, active:false}`; `403` system-managed; `404` not found.
- **Copy share link** — `[data-share]` (sales-app.js:82–86) → client-only: `((D.config && D.config.siteUrl) || 'https://everlastingsbyemaline.com') + '/?code=' + encodeURIComponent(code)`, where **`code` is the coupon's own `code` field** (the promo code from `createCoupon` / the row the share button sits on — the same string a shopper would type into `#promo-code`). Already correct; no endpoint. The storefront **honors** that `?code=` param — **Phase 4.7** adds a small `checkout.js` reader that prefills `#promo-code` and applies the code via the same `applyPromotionCode` path the auto-apply uses (ledger 30). Not a flag-for-scope; it's built.
- **Env-aware chrome (`#envChip` / View Site)** — `D.config` (sales-app.js:83) → **`GET /api/config`** → `{isTest, siteUrl?, …}`; render the "TEST" chip when `isTest:true`; "View Site" links to `siteUrl` (falls back to `/`).

**Doc impact:** none (the seam maps the design surface onto endpoints defined in Phases 4.1–4.2 and pre-existing coupon handlers).

---

### Phase 4.7 — `assets/js/checkout.js`: honor a `?code=` share link (prefill + apply, same path).

The coupon "Copy share link" (§4.6) produces `<siteUrl>/?code=CODE` — the **site root** (`/?code=`), so the shopper lands on the **homepage**, not `/checkout`. `checkout.js` doesn't run there, and by the time they add items and reach `/checkout` the `?code=` param is gone. So the code must be **captured site-wide and persisted**: `main.js` (loaded on every page — `index.html`/`shop.html`/`product.html`/`checkout.html:88-89`) reads `?code=` on load and stashes it in `sessionStorage` (§4.7.0); the checkout reader then consumes the stash (with `location.search` as a fallback for a direct `/checkout?code=` hit). The reader prefills the visible `#promo-code` field and applies the code via the **same** `checkout.applyPromotionCode` path `autoApplyStoreWideSale` uses (Phase 4.4). An explicit `?code=` runs **instead of** the store-wide auto-apply — **mutually exclusive** (Stripe allows one discount/order), which also removes the apply-order race between the two async paths: if a code is present we apply IT and skip the auto-sale. Fails soft: a bad/inactive code just leaves the field prefilled for a manual retry, never blocks checkout. *(Ledger 30 SETTLES the intent — WS4 honors the link; this phase is the missing end-to-end wiring that actually delivers `?code=` to the reader.)*

*4.7.0 — `assets/js/main.js`: capture a `?code=` share link on ANY page → `sessionStorage`.* **CURRENT (`assets/js/main.js:269-270`):**
```js
document.addEventListener('DOMContentLoaded', () => {
  initConfig();
```
**NEW (stash the code so the checkout reader can consume it after navigation):**
```js
document.addEventListener('DOMContentLoaded', () => {
  initConfig();
  // v3.5 — a coupon "Copy share link" lands on the homepage root (<siteUrl>/?code=CODE, §4.6). main.js
  // runs on every page, so capture ?code= here and stash it; the /checkout reader (§4.7) applies it once
  // the shopper has items in the cart. sessionStorage survives the same-tab navigation to /checkout.
  try { const _sc = new URLSearchParams(location.search).get('code'); if (_sc) sessionStorage.setItem('everlastings.shareCode', _sc); } catch {}
```

*4.7.a — apply a share code INSTEAD of the auto-sale when a share code is present (stash or query).* **CURRENT (`assets/js/checkout.js:106`, as Phase 4.4.b left it):**
```js
  wirePromo(checkout);
  autoApplyStoreWideSale(checkout); // v3.5 — apply the store-wide sale on init (gated on the 4.0 probe)
```
**NEW:**
```js
  wirePromo(checkout);
  // v3.5 — an explicit ?code= share link WINS over the automatic store-wide sale (Stripe = one
  // discount/order). Apply the share code if present (from the main.js stash or ?code=) and SKIP the
  // auto-sale; else auto-apply the sale. Mutually exclusive → no apply-order race between the two paths.
  if (readShareCode()) applyShareLinkCode(checkout);
  else autoApplyStoreWideSale(checkout); // v3.5 — store-wide sale on init (gated on the 4.0 probe)
```

*4.7.b — the reader, appended after `autoApplyStoreWideSale` (Phase 4.4.c).* **CURRENT (`assets/js/checkout.js`, the closing brace of `autoApplyStoreWideSale`):**
```js
  } catch (err) {
    const input = document.getElementById('promo-code');
    if (input) input.value = sale.code;
  }
}
```
**NEW (same, then the new function):**
```js
  } catch (err) {
    const input = document.getElementById('promo-code');
    if (input) input.value = sale.code;
  }
}

// v3.5 — resolve a "Copy share link" code from the main.js stash (§4.7.0 — set when the shopper landed
// on the homepage /?code=) OR a direct /checkout?code=. The stash is how the code survives homepage →
// add-to-cart → /checkout; location.search is the fallback for a direct checkout hit.
function readShareCode() {
  let code = null;
  try { code = sessionStorage.getItem('everlastings.shareCode'); } catch {}
  if (!code) code = new URLSearchParams(location.search).get('code');
  return code;
}

// v3.5 — honor a coupon "Copy share link" (<siteUrl>/?code=CODE, §4.6/ledger 30). Resolve the code
// (stash or query), prefill the visible #promo-code field, and apply it through the SAME
// applyPromotionCode path the store-wide auto-apply uses. Called INSTEAD of autoApplyStoreWideSale when
// a code is present (mutually exclusive — Stripe = one discount/order — the intended "use this code
// instead"). Fails soft: a bad/inactive code just leaves the field prefilled for a manual retry.
async function applyShareLinkCode(checkout) {
  const code = readShareCode();
  if (!code) return;
  try { sessionStorage.removeItem('everlastings.shareCode'); } catch {} // one-shot — consumed, so a stale code can't re-apply on a later checkout
  const input = document.getElementById('promo-code');
  if (input) input.value = code;
  const apply = checkout.applyPromotionCode; // Phase 4.0: the verified call on this bundle
  if (typeof apply !== 'function') return;   // fallback: field is prefilled; shopper taps Apply
  try { await apply.call(checkout, code); } catch (err) { /* prefilled for manual retry */ }
}
```

**Files (WS4):** this phase touches **`assets/js/main.js`** (§4.7.0 capture — new to WS4's roster) + `assets/js/checkout.js` (the reader). **Doc impact:** none (wires an existing endpoint/param into the existing storefront; `EVERLASTINGS_STORE.md` may note the storefront honors a `?code=` share link — captured site-wide, applied at checkout).

---

## WS5 — Media upload rebuild

> **Byte-anchored where backend; the modal UI is spec'd in the DESIGN addendum (`out/` is the markup source — do NOT rebuild the modal markup/UX here).** This workstream is the single most intricate item and gets its own review pass. The headline finding: **`api/upload.ts` needs no change and no new `api/*.ts` function** — every capability the FEEDBACK §8 flow asks for (batch, drag-drop, by-link, YouTube, video) is already served by the existing endpoints. WS5 is a **new client** (`out/products-app.js`, the media modal) fanning out to those endpoints, plus a handful of **data-shape reconciliations** in the modal's `applyMedia`/`openMedia` data ops so what it persists matches what the storefront reads. Line numbers are hints; the quoted text is the anchor. Run `npx tsc --noEmit` clean after any TS touch.

---

**Phase 5.1 — `api/upload.ts`: confirm the new flow is already supported (no change).**

The batch / drag-drop / URL-paste / video paths in FEEDBACK §8 all map onto capabilities `upload.ts` already ships. Each sub-step below quotes the anchor that proves it, so the integrator wires the modal to the existing seam rather than adding endpoints.

**a. Batch + drag-drop = client-side fan-out of single-file multipart POSTs — no batch endpoint.** The `POST` multipart branch reads exactly one file per request:

**CURRENT (`api/upload.ts:375-385`):**
```ts
    const fileField = formData.get('file');
    const slugField = formData.get('slug');
    const roleField = formData.get('role');
    const stf = formData.get('skip_transform');
    skipTransformField = typeof stf === 'string' ? stf : null;
    if (!(fileField instanceof File) || typeof slugField !== 'string' || typeof roleField !== 'string') {
      return jsonResponse(request, { error: 'Missing file, slug, or role' }, 400);
    }
    file = fileField;
    slug = slugField.trim();
    role = roleField.trim();
```

*(The only batch path in the file is `handleAttachedRefs` — the GPT chat-attach JSON path (`openaiFileIdRefs`), images-only, ≤10, not a browser multipart batch. The modal must NOT try to reuse it.)* The modal drops N files → issues **N single-file `POST /api/upload` multipart requests** (mirror the existing per-zone uploader `wireUploadZone`, `assets/js/admin.js:500-554`), showing the per-item progress bar (`out/products-app.js:676` `it._uploading`) per request. This honors the "NO new `api/*.ts` function" invariant.

**b. URL paste (direct `.mp4`/`.jpg` or Drive/Dropbox share) = the existing JSON by-link branch — no change.**

**CURRENT (`api/upload.ts:329-341`):**
```ts
    if (typeof body.url !== 'string' || typeof body.slug !== 'string' || typeof body.role !== 'string') {
      return jsonResponse(request, { error: 'Missing url, slug, or role' }, 400);
    }
    // validate the role BEFORE fetching, so a bad role can't trigger a server-side
    // fetch of an arbitrary owner-supplied URL (the multipart path checks ROLE_PATTERN downstream too).
    if (!ROLE_PATTERN.test(body.role.trim())) {
      return jsonResponse(request, { error: 'Invalid role' }, 400);
    }
    // SSRF guard (see isPublicHttpUrl): https-only, no loopback/private/link-local hosts.
    const safeUrl = normalizeMediaUrl(body.url.trim());
    if (!isPublicHttpUrl(safeUrl)) {
      return jsonResponse(request, { error: 'Media link must be a public https URL (no local or internal addresses).' }, 400);
    }
```

Drive share URLs are already rewritten (`normalizeMediaUrl`, `:81`) and the friendly "share as a direct link" errors already exist. The modal's URL row fires `POST /api/upload` **JSON** `{url, slug, role, skip_transform?}` for a pasted image/video link. (Dropbox is not rewritten — a Dropbox `?dl=0` share returns HTML and hits the `ALLOWED_MIME` reject; the modal should surface that error as-is. <!-- NEEDS-VERIFY: confirm Em's Dropbox links are direct-download (?dl=1) or drop Dropbox from the placeholder copy -->)

**c. Video (dropped, picked, or by-link) is already accepted — images transform, video/gif skip.** The transform gate keys off MIME, so video never transforms regardless of `skip_transform`:

**CURRENT (`api/upload.ts:136-139`):**
```ts
  const skipTransform =
    typeof skipTransformField === 'string' && skipTransformField === 'true';
  const isImageMime = file.type.startsWith('image/') && file.type !== 'image/gif';
  const shouldTransform = isImageMime && !skipTransform;
```

with `ALLOWED_MIME` (`:34-41`) already listing `video/mp4` + `video/webm` and the 50 MB video ceiling at `:131`. The modal sends `skip_transform: 'true'` on a **video** multipart POST (parity with `admin.js:526`); for a by-link video it may omit it (the gate ignores it for non-images anyway). `skip_transform` matters only for **images** you want stored uncropped. *(Answer to FEEDBACK §8 "I think it is just .mp4 but we have to confirm": accepted video = **MP4 + WebM** only, per `ALLOWED_MIME`; the modal's placeholder/error copy should say so.)*

**d. All role tokens the modal needs already exist in the enum — nothing to add.**

**CURRENT (`api/upload.ts:52-53`):**
```ts
const ROLE_PATTERN =
  /^(hero|thumbnail|gallery-(0[1-9]|1[0-5])|video-0[1-5]|detail-0[1-5]|gif-0[1-5]|checkout_image|seo_thumbnail)$/;
```

The modal's role checkboxes map to these tokens (Phase 5.5 table): `hero`→`hero`, `gallery`→`gallery-01..15`, `share`→`seo_thumbnail`, `checkout`→`checkout_image`, video→`video-01..05`. **Gallery caps at 15**, video at 5 — the modal's numberer must respect that (reuse `nextNumberedRole`, `admin.js:490-498`, which scans existing `{base}-NN` and never renumbers a live file). **Poster needs no role token** (see Phase 5.4d — a poster is a URL copied into `media[].poster`, not an uploaded role).

**Doc impact:** none for `upload.ts`; note in `STORE_ADMINISTRATION.md` that the modal batches by firing one upload per file against the same endpoint the GPT/curl use.

---

**Phase 5.2 — YouTube as a `media[]` type: shape, storage, and storefront render (render path already exists).**

**a. YouTube never touches `/api/upload`.** A YouTube URL is not a stored asset — it's held in the modal's in-memory `mItems` and written into the product's `media[]` array on Apply, then persisted by `PUT`/`POST /api/products`. The modal already classifies it (`detectKind`, `out/products-app.js:601-606`) and validates the host (`addUrl`, `:708`).

**b. The `media[]` shape is fixed by what the storefront reads.** `populateMedia` consumes these exact keys — the modal must emit them verbatim:

**CURRENT (`assets/js/product.js:263-275` — the YouTube branch, already shipped):**
```js
    } else if (m.type === 'youtube') {
      const id = youtubeId(m.url);
      if (!id) continue;
      const wrap = document.createElement('div');
      wrap.className = 'product-media__item product-media__item--embed';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}`;
      iframe.title = m.alt || 'Video';
      iframe.loading = 'lazy';
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
      frag.appendChild(wrap);
    }
```

So a YouTube item stores as `{ type: 'youtube', url, alt }` — the render path parses the 11-char id (`youtubeId`, `:283-285`), builds a **youtube-nocookie** iframe (no raw embed HTML stored → GPT-safe), and `product.html:345` (`<div class="product-gallery__media hidden" data-product-media>`) is the render container, hidden until populated. **No storefront change is needed for YouTube** — it already works end-to-end; WS5 only has to make the modal *store* it. `data-flow.md` already declares the type: `media` = `{type:'video'|'youtube', url, autoplay, controls, poster, alt}[]`.

**c. Video-item field names must match — the prototype `applyMedia` has two shape mismatches to fix.** The storefront reads `m.muted` and `m.poster`; the prototype emits neither (and carries `mute`, the wrong key):

**CURRENT (`out/products-app.js:761` — prototype apply, in-memory only):**
```js
    p.media = mItems.filter((m) => m.kind === "video" || m.kind === "youtube").map((m) => ({ type: m.kind === "youtube" ? "youtube" : "video", url: m.url, alt: m.alt, loop: !!m.loop, autoplay: !!m.autoplay, controls: !!m.controls }));
```

**NEW (integration target — emit the keys `product.js:236-260` actually reads: rename `mute`→`muted`, add `poster`; YouTube stays `{type,url,alt}`):**
```js
    p.media = mItems.filter((m) => m.kind === "video" || m.kind === "youtube").map((m) =>
      m.kind === "youtube"
        ? { type: "youtube", url: m.url, alt: m.alt }
        : { type: "video", url: m.url, alt: m.alt, loop: !!m.loop, autoplay: !!m.autoplay, controls: !!m.controls, muted: !!m.mute, ...(m.poster ? { poster: m.poster } : {}) });
```

*(`populateMedia` derives no-buttons from `autoplay` and forces `muted:true` for autoplay clips at `product.js:252-254`; the explicit `muted` above only bites for click-to-play clips where the modal's Mute box is the sole source. Emitting the raw four flags is correct — the storefront resolves the GIF-like vs click-to-play presets. This matches the LOCKED "Loop / Mute / Hide controls / Autoplay" spec: `controls:false` = "hide controls".)*

**Doc impact:** `EVERLASTINGS_STORE.md` media contract — pin the four video flags + `poster` + `alt`, and that `media[]` order is "MP4s first, YouTube last" (the storefront re-sorts anyway, `product.js:232`).

---

**Phase 5.3 — Persisted image order: `PUT /api/products` writing the reordered `images` array (confirmed, no backend change).**

**a. `images` (and `media`) are already draftable — reorder persists through the existing PUT.**

**CURRENT (`api/products.ts:324-330`):**
```ts
const DRAFTABLE = [
  'title', 'description', 'headline', 'story_card', 'features', 'images', 'media',
  'thumbnail', 'thumbnail_alt', 'seo_title', 'seo_description', 'seo_thumbnail',
  'available', 'featured', 'quantity', 'dimensions', 'weight', 'materials',
  'power_supply', 'care_instructions', 'shipping_details', 'series', 'product_type', 'artist_note',
  'homepage_theme',
];
```

On a **published** product a changed `images` array stages into `draft.images` (the stringify value-compare, `products.ts:502-509`); on an **unpublished** draft it writes straight to the `images` column (`products.ts:553`). So the reorder mechanism is: modal reorders `p.images` → `PUT /api/products?id=` `{images: [...]}`. **No `products.ts` change.**

**b. Array order — not the `gallery-NN` suffix — drives storefront gallery order.** The storefront filters by filename prefix but renders in **array order**:

**CURRENT (`assets/js/product.js:415-417`):**
```js
  const galleryImages = (Array.isArray(p.images) ? p.images : []).filter((i) => /\/(?:test_)?gallery-/.test(i.url || ''));
  if (galleryImages.length === 0) return; // leave Track B fallback visible
  thumbs.innerHTML = galleryImages.map((img, i) => `
```

`.filter().map()` preserves array order, so reordering the `images` array reorders the on-page gallery. The numeric suffix (`gallery-01..15`) is a **role-uniqueness token** (prevents R2 key collisions), **not** a display-order key — reorder does **not** rename files or re-upload. This is the load-bearing distinction for FEEDBACK §8.3 ("click and drag rearrange the order… persisted"). The prototype already reorders in memory (`wireGalleryDrag` → `p.images = [p.images[0], ...reordered]`, `out/products-app.js:519-523`); integration replaces the no-op `autosave` (`:557`) with the `PUT`.

**c. `openMedia` must derive roles from the FILENAME, not array index (prototype bug to fix).** The storefront's source of truth for role is the filename prefix:

**CURRENT (`assets/js/product.js:575-576` — `pickHero`):**
```js
  const imgs = Array.isArray(p.images) ? p.images : [];
  return imgs.find((i) => /\/(?:test_)?hero-/.test(i.url || '')) || imgs[0] || null;
```

But the modal seeds roles by array position:

**CURRENT (`out/products-app.js:592`):**
```js
    (p.images || []).forEach((im, i) => mItems.push({ kind: "image", url: im.url, alt: im.alt || "", roles: new Set(i === 0 ? ["hero"] : ["gallery"]) }));
```

**NEW (integration target — role from the `{role}-{slug}` filename, mirroring `pickHero`/the gallery filter, so a persisted non-`hero-`-at-[0] array reopens with correct roles):**
```js
    (p.images || []).forEach((im) => {
      const u = im.url || "";
      const roles = new Set();
      if (/\/(?:test_)?hero-/.test(u)) roles.add("hero");
      if (/\/(?:test_)?gallery-/.test(u)) roles.add("gallery");
      mItems.push({ kind: "image", url: im.url, alt: im.alt || "", roles });
    });
```

*(`share`/`checkout` are top-level columns, not in `images[]` — the prototype re-adds them at `:593-594` by matching `p.seo_thumbnail`/`p.checkout_image`; keep that.)*

**Doc impact:** `STORE_ADMINISTRATION.md` — "drag to reorder the gallery; order saves with the piece"; note the filename number is not the position.

---

**Phase 5.4 — Alt-text-required + role logic + coverage (client-enforced) and the two server-side constraints the modal must respect.**

**a. Alt-required is a client publish-gate (matches the existing bar; no server change required).** The modal already blocks Apply on any missing alt:

**CURRENT (`out/products-app.js:748-749`):**
```js
    const missingAlt = mItems.some((m) => !String(m.alt || "").trim());
    if (missingAlt) { P.toast("Every piece of media needs alt text", { kind: "danger" }); return; }
```

The `images` type is `{url, alt?}` (`data-flow.md` A) — `alt` is **optional in the schema**, but alt-presence IS a **hard SERVER publish gate** (SETTLED — ledger 23): WS2 **Phase 2.7**'s `validatePublishRules` checks `alt` on every image + every `media[]` entry, so a publish with any blank alt is rejected server-side (today's shared `validateProductRules` did not — Phase 2.7 adds it). WS5's modal alt gate is the **friendly client pre-check** on top (mirrors today's admin's client nudge, `admin.js:548`) — WS5 itself needs no `products.ts` edit for alt; the server gate lives in Phase 2.7.

**b. Role logic (one hero; hero≠gallery; share/checkout/poster combine freely) is client logic + a structural server guarantee.** The toggle logic is already correct in the prototype:

**CURRENT (`out/products-app.js:726-737` — keep as-is at integration):**
```js
  function toggleRole(i, role) {
    const it = mItems[i]; if (!it.roles) return;
    const has = it.roles.has(role);
    if (role === "hero") {
      if (!has) { mItems.forEach((m) => m.roles && m.roles.delete("hero")); it.roles.add("hero"); it.roles.delete("gallery"); }
      else it.roles.delete("hero");
    } else if (role === "gallery") {
      if (!has) { if (it.roles.has("hero")) { P.toast("This is the hero — it can't also be a gallery image. Make it gallery?", {}); it.roles.delete("hero"); it.roles.add("gallery"); } else it.roles.add("gallery"); }
      else it.roles.delete("gallery");
    } else { has ? it.roles.delete(role) : it.roles.add(role); }
    renderMedia();
  }
```

"One hero" is **also** guaranteed server-side by the filename scheme: uploading role `hero` always writes the same key `{hero}-{slug}` (`upload.ts:215-231`), so a second hero overwrites the first — two heroes cannot coexist in R2. The coverage counter (`coverage()`/`updateFallback`, `:607-613`/`:738-744`) and the "hero reused for share/checkout" fallback (`:743`, mirrored on the storefront by `pickHero`'s `|| imgs[0]`) are client-only display — no backend.

**c. Role REASSIGNMENT of an already-uploaded image requires a re-upload under the new role filename (via the by-link path — no new endpoint).** Because the storefront reads role from the filename, unchecking `gallery` and checking `hero` on an existing `gallery-03-slug.webp` does **not** make it the hero on-page — the file is still named `gallery-03`. To truly re-role it, the modal must `POST /api/upload` **JSON** `{url: <existing CDN url>, slug, role: 'hero'}` — the server re-fetches the public R2 URL (passes `isPublicHttpUrl`), re-crops to the new role's aspect (`upload.ts:178-182`), and writes `hero-slug.webp`; then the old-role entry is dropped/kept per the new checkbox set. **This is the seam mechanic that makes the checkbox model honest against the filename invariant** — the exact Apply-diff algorithm is spelled out in **§5.4c.i below**.

**c.i — Apply-time re-role diff algorithm (SETTLED — spells out the mechanic above).** The naive failure mode is a one-pass `mItems → p.images` rewrite: a promoted-to-hero image ends up matching BOTH `/hero-/` (via `pickHero`'s `imgs[0]` fallback) AND `/gallery-/` (its unchanged filename), duplicating on the PDP. The diff below avoids it.

- **On open** (inside `openMedia`, right after the role-derivation loop from 5.3c): stash the opened role set per item: `mItem.openedRoles = new Set(mItem.roles);` — this is the baseline the Apply diff compares against.
- **On Apply** (inside `applyMedia`, before writing `p.images`/`p.media`/`p.thumbnail`/`p.seo_thumbnail`/`p.checkout_image`): compute per-item `added = [...mItem.roles].filter(r => !mItem.openedRoles.has(r))` and `removed = [...mItem.openedRoles].filter(r => !mItem.roles.has(r))`. Only items where `added.length || removed.length` need any write; unchanged items pass through their URL as-is.
- **For each `added` role that renames the R2 key** (`hero`, `gallery`, `seo_thumbnail`, `checkout_image`): call `POST /api/upload` JSON `{url: mItem.url, slug, role: <resolvedRole>}`. `gallery` resolves via a ported `nextNumberedRole` that scans the CURRENT `p.images` filenames (retired `admin.js:490-498` — copy the helper into the modal). **Resolve added-gallery roles SEQUENTIALLY, splicing the response URL into `p.images` after EACH POST** so the next `nextNumberedRole()` call sees the freshly-taken NN (a parallel resolve would hand out the same NN twice and silently overwrite the earlier R2 key). Write the response's `url` into `p.images` (or the top-level column for `seo_thumbnail` / `checkout_image`; `checkout_image` obeys Phase 5.4e's post-publish freeze — skip the write there). **`alt`** propagates from `mItem.alt` on every write.
- **For each `removed` role**: drop the matching entry from `p.images` (identify by filename prefix + the original `NN` in the case of `gallery-NN`) OR null the top-level column (`seo_thumbnail`/`checkout_image`). Do **not** delete the R2 object — that's out of scope for the modal (an orphaned R2 file is invisible; a mistaken delete would be data loss).
- **Poster** (per 5.4d, one-per-product): after the added/removed loop, find the single `poster`-checked `mItem` and set `poster: mItem.url` on every `p.media[]` video that lacks its own poster. If no `poster` is checked, leave every video's `poster` as-is.
- **Zero-role items**: drop the `mItem` from local state; do NOT write any entry back to `p.images` or `p.media` for it. (A role-less image has no role-tied filename; the storefront wouldn't render it anyway.)

- **Partial-failure recovery:** the sequential fan-out means a Nth POST can fail after N-1 have succeeded (auth blip, R2 hiccup, invalid alt). On any POST throw or non-2xx: (i) stop the fan-out — do NOT roll back the successful writes (the R2 objects exist, `p.images` already carries them, no orphan); (ii) mark the failed `mItem.errored = true` (render as `.mitem--errored` in the modal — a small red ring; **author this modifier in `products.html`'s embedded `<style>` beside `.mitem`'s base at `out/products.html:248`: `.mitem--errored{ border-color:var(--danger); box-shadow:0 0 0 2px var(--danger-bd); }` — both `--danger` and `--danger-bd` are portal.css tokens (`:33`/`:46`, with mobile fallbacks `:76`/`:82`), available to `products.html`'s embedded style via the linked `portal.css`, so the ring renders (round-1 breadth #A — token-existence verified). The `.mitem` base already sets a 1px hairline border, so this just re-hues it red + adds the ring; parallels how §9.2a authors `.badge-unique` so the class is never referenced-but-unstyled — round-1 #6**); (iii) toast the failure with the field-role that failed (`"Couldn't set <hero> — try Apply again."`); (iv) DO NOT clear `mItem.openedRoles` on the failed item so the next Apply retries only the remaining diff (the succeeded items now have `mItem.openedRoles` = their new state, so their diff is empty on retry — a re-Apply is idempotent). This keeps the R2 + `p.images` states consistent even mid-failure: the server is always the source of truth, the local model is always ≤ server, and retry converges. Never leaves the maker with a "stuck" modal that requires a page reload.


**d. Poster = a URL copied into `media[].poster`, no upload role, association unspecified.** The storefront consumes poster as a plain URL:

**CURRENT (`assets/js/product.js:241`):**
```js
      if (m.poster) v.poster = m.poster;
```

So a "video still poster" is any already-uploaded image URL written into the matching video's `media[].poster` — it needs **no** new role token and **no** re-upload. The prototype's `applyMedia` (`:750-761`) extracts hero/gallery/share/checkout but **never writes poster** (the `poster` checkbox in `ROLE_DEFS`, `:657`, is currently cosmetic). **SETTLED — poster = one-per-product for v3.5:** the single poster-checked image is written to `media[].poster` on **every MP4 that lacks its own poster**. A per-video poster picker (distinct posters per clip) is explicitly **out of scope** for v3.5 (larger modal work); Apply implements the one-poster-per-product rule.

**e. `checkout_image` is FROZEN after first publish — the modal must lock the "checkout" role post-publish.**

**CURRENT (`api/products.ts:337-340`):**
```ts
const FROZEN_AFTER_PUBLISH = [
  'checkout_name', 'checkout_description', 'checkout_image',
  'sku', 'stripe_product_id', 'stripe_price_id',
];
```

A published-product `PUT` that changes `checkout_image` returns `400 "Frozen after publish: checkout_image…"` (`products.ts:398-409`). So on a **published** product the modal must (i) show the "checkout" checkbox as locked (reuse the "locks after first publish" lock-chip pattern, `out/products-app.js:274`) and (ii) **not** include `checkout_image` in the Apply `PUT` unless it's unchanged. By contrast `seo_thumbnail` (share) and `media`/`images`/`thumbnail` are all draftable — freely stageable after publish. This is a real per-role divergence the modal has to encode.

**Doc impact:** `STORE_ADMINISTRATION.md` — "the checkout image locks at first publish (like the checkout name); the share image and gallery can change anytime."

---

**Phase 5.5 — Integration seam: the media modal's data ops (`out/products-app.js`) → endpoints.**

Everything routes to the two **existing** endpoints; nothing new is added. Client-assigned role tokens are in parentheses.

| modal action (fn in `products-app.js`)            | endpoint · method                          | key payload / notes                                                                                                   |
| ------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| open modal, read current media (`openMedia :589`) | `GET /api/products?id=`                    | roles derived from filename (Phase 5.3c), not array index                                                             |
| drop / pick image (`handleFiles :714`)            | `POST /api/upload` · multipart             | `{file, slug, role}` role∈`hero`\|`gallery-NN`\|`seo_thumbnail`\|`checkout_image`; →`{url}`                           |
| drop / pick video (`handleFiles :714`)            | `POST /api/upload` · multipart             | `{file, slug, role:video-NN, skip_transform:'true'}` → `{url}`                                                        |
| paste image/video URL (`addUrl :705`)             | `POST /api/upload` · JSON                  | `{url, slug, role, skip_transform?}`; Drive rewritten server-side                                                     |
| paste YouTube URL (`addUrl :705`)                 | (none — in-memory)                         | validated client-side; stored in `media[]` on Apply                                                                   |
| re-role an existing image (Phase 5.4c)            | `POST /api/upload` · JSON                  | `{url:<existing CDN url>, slug, role:<new>}` → re-crops, new filename                                                 |
| reorder gallery (`wireGalleryDrag :498`)          | `PUT /api/products?id=`                    | `{images:[…reordered {url,alt}]}` (array order = page order)                                                          |
| delete an item (`:703`)                           | `PUT /api/products?id=`                    | omit it from `images[]`/`media[]` on next Apply                                                                       |
| Apply (`applyMedia :745`)                         | `PUT /api/products?id=` (or `POST` if new) | `{images, media, seo_thumbnail, thumbnail, thumbnail_alt}`; add `checkout_image` **only if unpublished** (Phase 5.4e) |

**Prerequisites the modal must satisfy (mirrors `admin.js`):** a `slug` must exist before any upload — new products `POST /api/products` first (or derive via `deriveSlug`, `admin.js:511`). **New-product guard:** since uploads need a saved slug, on a brand-new product the modal must prompt/require **title (+ price)** and save first — never silently 400 a media-first attempt before the product row exists. every call carries the Bearer header (`authHeader`); on a **published** product, `images`/`media`/`seo_thumbnail` **stage** into `draft` and the Apply response returns `preview_url`+`preview_token` (surface "changes waiting to publish"), while an **unpublished** product writes through live. Replace the prototype's no-op `autosave` (`:557`) and in-memory `applyMedia` mutations with these calls.

**Doc impact:** `data-flow.md` "Media upload" section already matches this seam; add the re-role-via-by-link mechanic and the poster resolution once Phase 5.4c/d are settled.

---

### Findings the reviewer should weigh (flagged inline above)

- **`api/upload.ts`: zero changes needed.** Batch = client fan-out of single POSTs; by-link, video, Drive-rewrite, all role tokens, transform/skip gate — all already present. No new `api/*.ts` function (invariant held).
- **`api/products.ts`: zero changes needed** for reorder/persist (`images`+`media` ∈ `DRAFTABLE`). The **hard alt publish-gate is SETTLED** and lives in WS2 Phase 2.7's `validatePublishRules` (ledger 23), not in WS5 — WS5's modal alt gate is the friendly client pre-check (Phase 5.4a).
- **YouTube render path already ships** in `product.js:263-275`; WS5 only makes the modal *store* `{type:'youtube', url, alt}`.
- **Three prototype data-op reconciliations are load-bearing** (not UI): (1) `applyMedia` video shape — rename `mute`→`muted`, add `poster` (5.2c); (2) `openMedia` role-from-filename not array-index (5.3c); (3) Apply must compute an add/re-upload/remove **diff** so a role change re-uploads under the new filename instead of duplicating an image the storefront reads by prefix (5.4c).
- **`checkout_image` is frozen after publish** — the modal must lock the checkout role post-publish and exclude it from the staged `PUT` (5.4e).
- **Poster = one-per-product (SETTLED, 5.4d)** — the prototype never wrote poster; Apply writes the single poster-checked image to every MP4 lacking its own. A per-video picker is out of scope for v3.5.
- **Accepted video = MP4 + WebM only**, gallery caps at 15, video at 5 (per `ALLOWED_MIME` + `ROLE_PATTERN`); the modal's copy/numberer must reflect these.

---

## WS6 — Storefront bugs

> **Byte-anchored. Discrete, independent fixes.** Each phase quotes a **CURRENT** block (the locator) + a **NEW** block. Line numbers are hints; the quoted CURRENT text is the anchor — if it doesn't match the working tree byte-for-byte, STOP and reconcile. Pure storefront (HTML/CSS/JS): **no backend/API change, no `tsc`.** Storefront brand untouched except these fixes; the `prefers-reduced-motion` layers stay intact.

**Phase 6.1 — product page: render the real spec fields (`product.html` + `product.js`).** The columns `dimensions, weight, materials, power_supply, care_instructions, shipping_details, artist_note` are **fetched** (`main.js` `getProductBySlug` selects all of them, `:60`) but Track B shipped **no render code** — the static Details `<ul>` shows six hardcoded placeholder bullets regardless of the DB. *(This is missing render code, NOT a `populateFeatures` clobber: `populateFeatures` only ever touches the generic `p.features` array. It stays untouched — we add a separate `populateDetails`.)* Fix: bind the structured fields to a clean details list; render only fields that are set.

*6.1a — replace the placeholder Details list with data-bound containers.* Replace the entire placeholder list — from the `<!-- Features list… -->` comment through its closing `</ul>` (the six hardcoded `<li>` with SVG icons). **CURRENT (`product.html:279-280`, the opening boundary):**
```html
        <!-- Features list. Track B fallback content stays unless Supabase p.features is provided. -->
        <ul class="feature-list" data-product-features style="margin-top: var(--space-sm);">
```
**CURRENT (`product.html:324`, the closing boundary of that same `<ul>`):**
```html
        </ul>
```
**NEW (the whole `<ul>…</ul>` block — comment through `</ul>` — becomes):**
```html
        <!-- Structured spec fields — product.js populateDetails() binds these from Supabase
             (dimensions, weight, materials, power_supply, care_instructions, shipping_details);
             empty fields are omitted, so nothing renders until real data loads. -->
        <ul class="feature-list" data-product-details style="margin-top: var(--space-sm);"></ul>

        <!-- Optional free-form features — product.js populateFeatures() fills from p.features when set. -->
        <ul class="feature-list" data-product-features style="margin-top: var(--space-sm);"></ul>

        <!-- Artist's note — product.js populateDetails() reveals + fills from p.artist_note when set. -->
        <p class="product-artist-note hidden" data-product-artist-note style="margin-top: var(--space-md); font-style: italic; color: var(--text-secondary);"></p>
```
*(The six SVG icons carried no data and were hidden by CSS anyway — `styles.css:930` `.feature-list svg { display: none; }` — so dropping them loses nothing. `.feature-list` (`styles.css:918`) is a disc-bulleted list; both `<ul>`s reuse it. `.hidden` = `display:none !important` (`styles.css:625`). Emptying the two lists matches the page's established "no fake data before load" behavior; `data-product-features` keeps its hook so `populateFeatures` is unchanged.)*

*6.1b — call the new populate fn in the orchestration.* **CURRENT (`product.js:38-40`):**
```js
  populateMedia(product);
  populateFeatures(product);
  wireCartButtons(product);
```
**NEW:**
```js
  populateMedia(product);
  populateFeatures(product);
  populateDetails(product);
  wireCartButtons(product);
```

*6.1c — add `populateDetails` right after `populateFeatures`.* **CURRENT (`product.js:439-441`, the close of `populateFeatures`):**
```js
    list.innerHTML = p.features.map((item) => `<li>${escapeHTML(String(item))}</li>`).join('');
  }
}
```
**NEW (same, then the new function):**
```js
    list.innerHTML = p.features.map((item) => `<li>${escapeHTML(String(item))}</li>`).join('');
  }
}

// v3.5 — bind the structured spec fields to the Details list. These columns ARE fetched
// (main.js getProductBySlug select) but Track B shipped no render code for them; the old static <ul>
// showed fixed placeholder bullets regardless of the DB. Render only the fields that are set (empty
// ones omitted); labels mirror the /admin form; array fields (materials/care/shipping) join with ", ".
// artist_note is prose, revealed as its own note. Mirrors the populateFeatures/populateGallery
// "only overwrite when data is present" pattern.
function populateDetails(p) {
  const list = document.querySelector('[data-product-details]');
  if (list) {
    const asText = (v) => Array.isArray(v)
      ? v.map((x) => String(x).trim()).filter(Boolean).join(', ')
      : (v == null ? '' : String(v).trim());
    const rows = [
      ['Dimensions', asText(p.dimensions)],
      ['Weight', asText(p.weight)],
      ['Materials', asText(p.materials)],
      ['Power Supply', asText(p.power_supply)],
      ['Care', asText(p.care_instructions)],
      ['Shipping', asText(p.shipping_details)],
    ].filter(([, val]) => val !== '');
    if (rows.length) {
      list.innerHTML = rows
        .map(([label, val]) => `<li><strong>${escapeHTML(label)}</strong> &mdash; ${escapeHTML(val)}</li>`)
        .join('');
    }
  }
  const note = document.querySelector('[data-product-artist-note]');
  if (note && p.artist_note) {
    note.textContent = String(p.artist_note);
    note.classList.remove('hidden');
  }
}
```
*(`escapeHTML` already exists `:583`. Field types confirmed against the /admin write path: `dimensions`/`weight`/`power_supply`/`artist_note` are strings, `materials`/`care_instructions`/`shipping_details` are arrays (`admin.js:576-585` `linesToArray`); labels match the admin field names (`admin/index.html:266-279`). `weight` is in both public selects (`main.js:60`,`:74`). `populateFeatures`'s "hardcoded list is a great fallback" comment is now slightly stale but left alone — the decision scopes this to added render code, not a `populateFeatures` edit.)*

**Doc impact:** update `EVERLASTINGS_STORE.md` — the product page **now renders** the seven structured fields (`dimensions, weight, materials, power_supply, care_instructions, shipping_details` as a Details list; `artist_note` as a note), only when set. This corrects the prior fact that they were fetched-but-never-shown.

---

**Phase 6.2 — `shop.js` / `shop.html`: series filter never matches.** `applyFilters` compares hardcoded kebab checkbox values (`shop.html:186-190`, e.g. `portals-to-peace`) against the free-text `series` field (e.g. `"Portals to Peace"`) via `includes(p.series)` → never true. Fix: normalize both sides to one slug **and** derive the options from the live catalog so the filter can't drift from the data again.

*6.2a — normalize both sides in the comparison.* **CURRENT (`shop.js:70-72`):**
```js
function applyFilters(products, filters) {
  return products.filter((p) => {
    if (filters.series.length && !filters.series.includes(p.series)) return false;
```
**NEW:**
```js
function applyFilters(products, filters) {
  return products.filter((p) => {
    if (filters.series.length && !filters.series.includes(seriesSlug(p.series))) return false;
```

*6.2b — derive the Series checkboxes from live series (before init).* **CURRENT (`shop.js:22-26`):**
```js
  initFromURL();
  renderTiles(products);
  wireFilters(products);
  wireSort(products);
  hideState('data-shop-loading');
```
**NEW (populate the options first, so `initFromURL` can pre-check a URL-deep-linked box and `wireFilters` binds the freshly-rendered inputs):**
```js
  populateSeriesFilter(products);
  initFromURL();
  renderTiles(products);
  wireFilters(products);
  wireSort(products);
  hideState('data-shop-loading');
```

*6.2c — add `seriesSlug` + `populateSeriesFilter` after `escapeAttr`.* **CURRENT (`shop.js:154-156`):**
```js
function escapeAttr(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```
**NEW (same, then the two new functions):**
```js
function escapeAttr(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// v3.5 — series filter fix. Checkbox VALUES were hardcoded kebab slugs while `series` is free text
// ("Portals to Peace"), so includes(p.series) never matched. Normalize both sides to one slug, and
// derive the options from the live catalog's distinct series so the filter can't drift from the data.
function seriesSlug(s) {
  return String(s ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function populateSeriesFilter(products) {
  const group = document.querySelector('[data-shop-series-options]');
  if (!group) return;
  const bySlug = new Map(); // slug -> original label (first-seen wins)
  (Array.isArray(products) ? products : []).forEach((p) => {
    const label = (p.series || '').trim();
    if (!label) return;
    const slug = seriesSlug(label);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, label);
  });
  if (bySlug.size === 0) {
    group.closest('.filter-group')?.classList.add('hidden'); // no series in catalog → drop the group
    return;
  }
  group.innerHTML = [...bySlug.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([slug, label]) => `<label class="checkbox-label"><input type="checkbox" data-shop-filter="series" value="${escapeAttr(slug)}"> ${escapeAttr(label)}</label>`)
    .join('');
}
```
*(`escapeAttr` is defined at `:154`. `getActiveFilters`/`syncURL`/`initFromURL` all key off `[data-shop-filter="series"]` `value` — now slugs — so they stay consistent end-to-end: a checked box yields a slug, `applyFilters` compares it to `seriesSlug(p.series)`, `?series=<slug>` round-trips. `product_type` isn't touched — its one value `miniature` already matches the field.)*

*6.2d — swap the hardcoded checkboxes for a JS-filled container.* **CURRENT (`shop.html:183-191`):**
```html
              <!-- Series filter -->
              <details class="filter-group" open>
                <summary>Series</summary>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="series" value="portals-to-peace"> Portals to Peace</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="series" value="book-nooks"> Book Nooks</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="series" value="story-lofts"> Story Lofts</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="series" value="seasonal"> Seasonal</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="series" value="limited-edition"> Limited Edition</label>
              </details>
```
**NEW:**
```html
              <!-- Series filter — shop.js populateSeriesFilter() fills this from the live catalog's
                   distinct series values (label = the real series text, value = its slug). -->
              <details class="filter-group" open>
                <summary>Series</summary>
                <div data-shop-series-options></div>
              </details>
```
*(The `<div>` wrapper is safe: `.filter-group > summary` (`styles.css:1029-1040`) targets the summary by direct child only, and `.checkbox-label` (`:544`) styles independently of its parent. **Taxonomy reconcile-at-build (D-v361-1 SETTLED → path B, per the reusable-template thesis):** the series taxonomy is reconciled against the **live catalog** at build — the filter options are derived from live products' `series` (already handled by `populateSeriesFilter` §6.2c above), AND the header/footer `?series=` deep-link slugs are **realigned in the nav/footer templates to whatever `seriesSlug()` yields on the live catalog** (not the reverse — the reusable-template thesis favors adaptable nav over hardcoded catalog names, so a future template client's series names auto-propagate without editing the addendum). **Build step:** open each template that carries a series deep-link, query the live catalog's distinct `series` values (or the derived `bySlug` map from `populateSeriesFilter` — same data), rewrite each `?series=<slug>` link to the matching live slug. Everlastings example: if the live series are "Portals to Peace", "Book Nooks", the nav's `?series=portals-to-peace` and `?series=book-nooks` stand; if the shop adds "Winter Editions", the nav gets a `?series=winter-editions` entry (from the same derived map). Compound-name case ("Book Nooks & Story Lofts" → `book-nooks-story-lofts`) is handled automatically — nav emits the compound slug, catalog derivation yields the same, they match. **Files to touch:** every page template carrying series deep-links (typical set: header nav in every `*.html` page + footer nav; `index.html` "browse by series" section). A mismatch is a soft failure — shows all, no crash — but the reconcile removes it. **Rationale:** hardcoding catalog names would force a per-project rename every time this template ships elsewhere; realigning nav slugs makes the nav a derived view of the catalog, which is what reuse requires.)*

**Doc impact:** minor — note in `EVERLASTINGS_STORE.md` that the shop **Series filter is now data-derived** (options come from live products' `series`), and that header/footer `?series=` deep-links pre-check a box only when the target slug matches a live series' slug.

---

**Phase 6.3 — featured carousel wraps on mobile (`index.html` + `homepage.js`).** `.featured-carousel` is `grid-template-columns: repeat(3, …)` + `overflow-x: auto`, so a 4th tile wraps to a hidden second row instead of scrolling. Fix (Sean's design): independent horizontal-scroll rows, Netflix-style — ≤5 items = one row; >5 = rows of ~3, **each its own** `overflow-x` scroller. The carousel becomes a vertical stack of `.featured-row` scrollers; `populateFeatured` chunks products into them.

*6.3a — the CSS.* **CURRENT (`index.html:386-405`):**
```css
      /* FEATURED CAROUSEL — horizontal scroll on mobile, grid on desktop */
      .featured-carousel {
        display: grid;
        gap: var(--space-lg);
        grid-template-columns: repeat(3, minmax(260px, 1fr));
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        padding-bottom: var(--space-md);
        -webkit-overflow-scrolling: touch;
      }
      .featured-carousel > .product-tile {
        scroll-snap-align: start;
        min-width: 260px;
      }
      @media (min-width: 768px) {
        .featured-carousel {
          overflow-x: visible;
          grid-template-columns: repeat(3, 1fr);
        }
      }
```
**NEW:**
```css
      /* FEATURED CAROUSEL — independent horizontal-scroll rows (Netflix-style).
         The carousel is a vertical stack of rows; each .featured-row is its own overflow-x scroller.
         ≤5 featured items = one row; >5 = rows of ~3 (homepage.js chunks them). */
      .featured-carousel {
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
      }
      .featured-row {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(260px, 1fr);
        gap: var(--space-lg);
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        padding-bottom: var(--space-md);
        -webkit-overflow-scrolling: touch;
      }
      .featured-row > .product-tile {
        scroll-snap-align: start;
        min-width: 260px;
      }
      @media (min-width: 768px) {
        /* Rows of ≤3 fit the container, so no scrollbar; the min-width still forces one on narrow screens. */
        .featured-row { overflow-x: visible; }
      }
```
*(`grid-auto-flow: column` + `grid-auto-columns: minmax(260px, 1fr)` lays each row's tiles in one track: they stretch to fill on desktop (like the old `repeat(3, 1fr)`) and clamp to 260px → scroll on mobile. No animation involved, so `prefers-reduced-motion` is unaffected.)*

*6.3b — wrap the fallback tiles in a `.featured-row` (opening).* **CURRENT (`index.html:201-204`):**
```html
        <!-- homepage.js renders into [data-featured-carousel] from products.featured = true; markup below is a fallback. -->
        <div class="featured-carousel" data-featured-carousel>

          <article class="card product-tile" data-product-slug="placeholder-haven-i">
```
**NEW:**
```html
        <!-- homepage.js renders into [data-featured-carousel] from products.featured = true; markup below is a fallback. -->
        <div class="featured-carousel" data-featured-carousel>
          <div class="featured-row">

          <article class="card product-tile" data-product-slug="placeholder-haven-i">
```

*6.3c — close the `.featured-row` (closing).* **CURRENT (`index.html:249-253`, the last fallback tile's `</article>` → carousel `</div>`):**
```html
            </a>
          </article>

        </div>

        <p style="text-align: center; margin-top: var(--space-xl);">
```
**NEW:**
```html
            </a>
          </article>

          </div>
        </div>

        <p style="text-align: center; margin-top: var(--space-xl);">
```
*(Wrapping the fallback keeps the fetch-failure fallback laid out as a row too; the tile markup itself is unchanged.)*

*6.3d — `populateFeatured` chunks into rows.* **CURRENT (`homepage.js:41-67`):**
```js
function populateFeatured(items) {
  const carousel = document.querySelector('[data-featured-carousel]');
  if (!carousel) return;
  if (!Array.isArray(items) || items.length === 0) {
    // Leave Track B's fallback tiles visible if no live featured products yet.
    return;
  }
  carousel.innerHTML = items.map((p) => {
    const thumb = pickThumb(p);
    const alt = escapeAttr(p.thumbnail_alt || p.title || '');
    return `
      <article class="card product-tile" data-product-slug="${escapeAttr(p.slug)}">
        <a href="/product/${escapeAttr(p.slug)}" style="display: block; color: inherit; text-decoration: none;">
          <div class="card__media">
            <span class="badge badge-featured">Featured</span>
            <img loading="lazy" alt="${alt}" src="${escapeAttr(thumb)}">
          </div>
          <div class="card__body">
            <h3 class="card__title">${escapeAttr(p.title || '')}</h3>
            ${p.headline ? `<p style="font-style: italic; color: var(--text-muted); font-size: var(--text-sm); margin: 0 0 var(--space-xs);">${escapeAttr(p.headline)}</p>` : ''}
            <p class="card__price">${formatPrice(p.price)}</p>
          </div>
        </a>
      </article>
    `;
  }).join('');
}
```
**NEW (identical tile markup, now emitted per-row):**
```js
function populateFeatured(items) {
  const carousel = document.querySelector('[data-featured-carousel]');
  if (!carousel) return;
  if (!Array.isArray(items) || items.length === 0) {
    // Leave Track B's fallback tiles visible if no live featured products yet.
    return;
  }
  const tile = (p) => {
    const thumb = pickThumb(p);
    const alt = escapeAttr(p.thumbnail_alt || p.title || '');
    const sold = p.quantity != null ? p.quantity <= 0 : !p.available; // v3.5 — match shop.js: known qty<=0 is Sold; null qty falls back to the available flag
    return `
      <article class="card product-tile" data-product-slug="${escapeAttr(p.slug)}">
        <a href="/product/${escapeAttr(p.slug)}" style="display: block; color: inherit; text-decoration: none;">
          <div class="card__media">
            ${!sold && p.featured ? '<span class="badge badge-featured">Featured</span>' : ''}
            ${!sold && !p.featured ? '<span class="badge badge-unique">One of a kind</span>' : ''}
            <img loading="lazy" alt="${alt}" src="${escapeAttr(thumb)}">
          </div>
          <div class="card__body">
            <h3 class="card__title">${escapeAttr(p.title || '')}</h3>
            ${p.headline ? `<p style="font-style: italic; color: var(--text-muted); font-size: var(--text-sm); margin: 0 0 var(--space-xs);">${escapeAttr(p.headline)}</p>` : ''}
            <p class="card__price">${sold ? formatPrice(p.price) : priceHTML(p.price, window._activeSale)}</p>
          </div>
        </a>
      </article>
    `;
  };
  // Netflix-style independent rows: ≤5 items ride in a single scroller; >5 split into rows of ~3
  // (each row is its own .featured-row overflow-x scroller, so the rows scroll independently).
  const perRow = items.length <= 5 ? items.length : 3;
  const rows = [];
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow));
  carousel.innerHTML = rows
    .map((row) => `<div class="featured-row">${row.map(tile).join('')}</div>`)
    .join('');
}
```
*(`pickThumb`/`escapeAttr`/`formatPrice` unchanged. 6 items → rows of [3,3]; 7 → [3,3,1]; ≤5 → one row.)*

**Doc impact:** none (homepage visual behavior only).

---

**Phase 6.4 — `/complete`: stop leaking the raw Stripe session id (`complete.js` + `complete.html`).** `complete.js:36` prints the raw `cs_…` session id as "Order ID". It is not test-gated, so in production a `cs_live_…` id is exposed on the page. Fix: drop it — the Stripe receipt email carries the customer's reference.

*6.4a — remove the JS binding.* **CURRENT (`complete.js:33-36`):**
```js
  setText('[data-complete-customer-name]', data.customer_name || 'collector');
  setText('[data-complete-customer-email]', data.customer_email || 'your email');
  setText('[data-complete-total]', formatPrice(data.amount_total || 0));
  setText('[data-complete-order-id]', sessionId);
```
**NEW:**
```js
  setText('[data-complete-customer-name]', data.customer_name || 'collector');
  setText('[data-complete-customer-email]', data.customer_email || 'your email');
  setText('[data-complete-total]', formatPrice(data.amount_total || 0));
```

*6.4b — remove the "Order ID" row.* **CURRENT (`complete.html:189-196`):**
```html
          <div style="display: flex; justify-content: space-between; padding-top: var(--space-sm); margin-top: var(--space-sm); border-top: 1px solid rgba(0,0,0,0.1); font-weight: 600; font-size: var(--text-lg);">
            <span>Total</span>
            <span data-complete-total>$245.00</span>
          </div>
          <p style="margin-top: var(--space-md); font-size: var(--text-sm); color: var(--text-muted);">
            Order ID: <span data-complete-order-id style="font-family: ui-monospace, monospace;">—</span>
          </p>
        </div>
```
**NEW:**
```html
          <div style="display: flex; justify-content: space-between; padding-top: var(--space-sm); margin-top: var(--space-sm); border-top: 1px solid rgba(0,0,0,0.1); font-weight: 600; font-size: var(--text-lg);">
            <span>Total</span>
            <span data-complete-total>$245.00</span>
          </div>
        </div>
```
*(Removing the `[data-complete-order-id]` element makes the dropped `setText` moot either way; both edits keep them in sync. No other code references `data-complete-order-id`.)*

**Doc impact:** none (the Stripe receipt email carries the order reference; the page no longer displays a session id).

---

**Phase 6.5 — storefront sold-state + buy-gate become quantity-based (`shop.js` + `product.js`).** The storefront currently derives "Sold" + un-buyable purely from `p.available`, but the sold policy (Locked decisions → Product state / sold policy; ledger 20) makes the **storefront buy-gate `published && quantity > 0`**. A sold piece is `quantity ≤ 0`; `available` is only a *consequence*. To make the three enforcers agree (`computeState()` [WS2] ↔ this storefront gate ↔ `record_sale` [WS7]) and guarantee a sold piece is **never purchasable regardless of the `available` flag**, treat `p.quantity != null ? p.quantity <= 0 : !p.available` as sold/unbuyable — a known quantity decides, else fall back to `available`. Minimal + safe (a nullish `quantity` on a legacy row falls back to the `available` flag; a real 0 is always sold). **Fourth enforcer (named so "three" isn't read as exhaustive):** the server checkout/reserve gate (`checkout.ts:79` session · `:205` reserve) is deliberately STRICTER — `available === true && quantity >= 1` (AND-logic), not the storefront's quantity-primary *display* gate — so any display-vs-flag mismatch on a legacy/anomalous row fails SAFE at the buy step (a `quantity>0 & available===false` row renders buyable but 410s at checkout; a `quantity=null & available===true` row is treated unavailable server-side). §6.5's null-fallback *preserves* these pre-existing edges rather than introducing them, and both fail safe. This server gate is the intentional strict 4th sold-policy enforcer behind the storefront display gate. **Legacy caveat (go-live, from Angle C):** a *pre-v3.3* SOLD row can carry `available:false` with a **non-null stale `quantity ≥ 1`** (old sales didn't decrement) — the quantity-primary rule would then render it **buyable + struck** instead of "Sold/plain" (the null-fallback doesn't catch it — the quantity is non-null, just stale). It still 410s at the server checkout gate (no *buy* leak), but it *displays* wrong. The fix already exists — the `20260616000001` cutover backfill zeroes `quantity` on `available:false` rows — but it ships commented and must be **RUN before relying on this gate / enabling any % sale**. Sequenced in the TESTING deploy preflight; unverifiable whether any such row exists in the live catalog, so it's a go-live checklist item, not a code change here.

*6.5a — `shop.js` card render: sold state from quantity, not just `available`.* **CURRENT (`assets/js/shop.js:126-144`):**
```js
  grid.innerHTML = visible.map((p) => {
    const heroImg = pickHeroThumb(p);
    const altText = escapeAttr(p.thumbnail_alt || p.title || '');
    return `
      <article class="card product-tile" data-product-slug="${escapeAttr(p.slug)}" data-series="${escapeAttr(p.series || '')}" data-product-type="${escapeAttr(p.product_type || '')}" data-available="${p.available ? 'true' : 'false'}">
        <a href="/product/${escapeAttr(p.slug)}" style="display: block; color: inherit; text-decoration: none;">
          <div class="card__media">
            ${p.available ? '' : '<span class="badge badge-sold">Sold</span>'}
            ${p.featured ? '<span class="badge badge-featured">Featured</span>' : ''}
            <img loading="lazy" alt="${altText}" src="${escapeAttr(heroImg)}"${p.available ? '' : ' style="opacity: 0.55;"'}>
          </div>
          <div class="card__body">
            <h3 class="card__title">${escapeAttr(p.title || '')}</h3>
            <p class="card__price${p.available ? '' : ' text-muted'}">${formatPrice(p.price)}</p>
          </div>
        </a>
      </article>
    `;
  }).join('');
```
**NEW — the ONE merged shop-card block (compute `sold` once → drives the Sold badge, the image dim, the struck price gate, and the "One of a kind" badge). This block folds WS6 sold-state + WS4 §4.5.b struck price + WS9 §9.2 badge; §4.5.b and §9.2 are pointers into it (see the Shared-file edit coordination section — apply order WS6→WS4→WS9):**
```js
  grid.innerHTML = visible.map((p) => {
    const heroImg = pickHeroThumb(p);
    const altText = escapeAttr(p.thumbnail_alt || p.title || '');
    const sold = p.quantity != null ? p.quantity <= 0 : !p.available; // v3.5 sold policy: known qty<=0 is Sold; a null qty falls back to the available flag
    return `
      <article class="card product-tile" data-product-slug="${escapeAttr(p.slug)}" data-series="${escapeAttr(p.series || '')}" data-product-type="${escapeAttr(p.product_type || '')}" data-available="${sold ? 'false' : 'true'}">
        <a href="/product/${escapeAttr(p.slug)}" style="display: block; color: inherit; text-decoration: none;">
          <div class="card__media">
            ${sold ? '<span class="badge badge-sold">Sold</span>' : ''}
            ${!sold && p.featured ? '<span class="badge badge-featured">Featured</span>' : ''}
            ${!sold && !p.featured ? '<span class="badge badge-unique">One of a kind</span>' : ''}
            <img loading="lazy" alt="${altText}" src="${escapeAttr(heroImg)}"${sold ? ' style="opacity: 0.55;"' : ''}>
          </div>
          <div class="card__body">
            <h3 class="card__title">${escapeAttr(p.title || '')}</h3>
            <p class="card__price${sold ? ' text-muted' : ''}">${sold ? formatPrice(p.price) : priceHTML(p.price, window._activeSale)}</p>
          </div>
        </a>
      </article>
    `;
  }).join('');
```
*(Merged edits, each with its own home section: the `sold` computation + Sold badge / dim / `text-muted` are WS6 §6.5a; the `${sold ? formatPrice(p.price) : priceHTML(p.price, window._activeSale)}` struck price is WS4 §4.5.b gated on `!sold`; the `badge badge-unique` "One of a kind" is WS9 §9.2, spec in DESIGN §D.4, its CSS written by **§9.2a**. `priceHTML` renders plain when there's no active percent sale, so the `!sold` branch is safe with or without a sale. The three badges are now **mutually exclusive by gate** — Sold when `sold`; Featured when `!sold && p.featured`; "One of a kind" when `!sold && !p.featured` — so **exactly one** renders and none overlap (`.card__media .badge` pins every badge to the same corner, `styles.css:593`, so mutual exclusion is the zero-CSS way to avoid overlap). Gating Featured on `!sold` also retires the **pre-existing Sold+Featured co-occurrence** a sold featured tile used to show (`record_sale` never clears `featured`) — it now shows only "Sold." DESIGN §D.4 carries the optional badge-stack rule if you later want two badges to coexist.)*

*6.5b — `product.js` buy-gate: disable purchase when sold by quantity.* **CURRENT (`assets/js/product.js:382`):**
```js
  if (p.available === false) {
```
**NEW (a sold-by-quantity piece is unbuyable even if the `available` flag lags; a `?preview=` draft never reads "Sold"):**
```js
  const previewToken = new URLSearchParams(location.search).get('preview'); // v3.5 — RE-DERIVE locally: populateStickyCard is a top-level function, so the init handler's previewToken (product.js:19) is out of scope here (referencing it directly throws a ReferenceError on every PDP load)
  const sold = !previewToken && (p.quantity != null ? p.quantity <= 0 : !p.available); // v3.5 buy-gate: known qty<=0 is Sold, null qty falls back to the flag; under ?preview= (a draft being reviewed) never render Sold — it isn't purchasable anyway, "nothing shows wrong without a reason". v3.6.6 — null-fallback is !p.available (harmonized with §4.5.d/§6.5a/§6.3d/§6.5d; server-consistent)
  if (sold) {
```

*6.5c — `product.js` JSON-LD availability reflects quantity.* **CURRENT (`assets/js/product.js:353`):**
```js
      availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
```
**NEW (OutOfStock once sold by quantity — matches the buy-gate above):**
```js
      availability: (p.quantity != null ? p.quantity > 0 : p.available) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
```
*(This is availability only — the JSON-LD `offers.price` still stays the true undiscounted unit price per DESIGN §D.1; do NOT add sale math to `injectProductJsonLd`. `product.js`'s `getProductBySlug` already selects `quantity` for the sticky card, so no fetch change.)*

*6.5d — related-products card: same null-safe sold rule (`product.js:~558`).* **CURRENT:**
```js
            ${rp.available ? '' : '<span class="badge badge-sold">Sold</span>'}
```
**NEW (match 6.5a — sold by quantity, else fall back to the flag):**
```js
            ${(rp.quantity != null ? rp.quantity <= 0 : !rp.available) ? '<span class="badge badge-sold">Sold</span>' : ''}
```
*(Cosmetic — the related pool is fetched `getProducts({ available: true })`, so a click-through still hits the 6.5b buy-gate; this just closes the lag-window on the card badge.)*

**Doc impact:** `EVERLASTINGS_STORE.md` — the storefront sold-state + buy-gate are **quantity-based** (`published && quantity > 0`), consistent with `computeState()` and `record_sale`; `available` is a consequence, not the gate. *(The §6.5b `?preview=` guard — a draft being reviewed never reads "Sold" — is folded INTO the NEW code block above via `!previewToken`. **`populateStickyCard` is a TOP-LEVEL function**, so the init handler's `previewToken` (`product.js:19`) is OUT of scope — the guard **re-derives it locally** (`new URLSearchParams(location.search).get('preview')`), else it throws a ReferenceError on every PDP load. §4.5.d's struck gate intentionally does NOT preview-guard: a previewed draft SHOULD show its struck sale price — only the Sold badge/buy-gate is suppressed in preview.)*

---

## WS7 — Webhook / money integrity

> **Byte-anchored. Touches live money — CURRENT blocks must byte-match.** Line numbers are hints; the quoted CURRENT text is the anchor — if it doesn't match the working tree byte-for-byte, STOP and reconcile. Run `npx tsc --noEmit -p tsconfig.json` clean after each TS edit (CommonJS target; no new `api/*.ts` function; every lookup scoped by `isTest`).

**Phase 7.1 — `api/webhook.ts`: expand line items so the real per-item amount lands (#228).**

The order-row split is *silently wrong for a multi-item cart with unequal prices.* `listLineItems` is called **without** `expand`, so `li.price.product` is a **string** (the Stripe product id), the `typeof li.price.product !== 'string'` guard fails, `supabaseId` is always `undefined`, `perItemAmounts` stays **empty**, and every `order.amount` falls back to `total/n`. A $200 + $40 cart writes $120/$120 instead of $200/$40 — real money, wrong per-row. The one-line fix expands the product so `metadata.supabase_id` is readable.

*7.1a — add the expand.* **CURRENT (`api/webhook.ts:165`):**
```ts
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
```
**NEW (expand `data.price.product` → `li.price.product` resolves to the `Stripe.Product`):**
```ts
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100, expand: ['data.price.product'] });
```
*(Verified load-bearing: `api/_lib/stripeSync.ts:64-73` creates each Stripe Product with `metadata.supabase_id = product.id`, and `session.metadata.items` carries that same `id`. So after the expand, `(li.price.product as Stripe.Product).metadata?.supabase_id` equals the cart item's `id`, and `perItemAmounts[supabaseId] = li.amount_total` keys line up with the `item.id` lookup below. `expand: ['data.price.product']` is the documented list-expansion path for `listLineItems`. `tsc` clean — the block was already written for the object shape; only the runtime value changes.)*

*7.1b — confirm the amount assignment now reads the real per-item amount (no edit).* **CURRENT (`api/webhook.ts:182-198`) — verify byte-match, do NOT change:**
```ts
    const orderRows = items.map((item, idx) => {
      const explicit = perItemAmounts[item.id];
      const amount = typeof explicit === 'number'
        ? explicit
        : fallbackEach + (idx === 0 ? fallbackRemainder : 0);
      return {
        stripe_session_id: session.id,
        stripe_payment_intent: paymentIntentId,
        product_id: item.id,
        customer_id: customerId,
        customer_email: customerEmail,
        amount,
        status: 'completed',
        shipping_address: shippingAddress,
        is_test: isTest,
      };
    });
```
*(With 7.1a in place, `explicit` is now a populated integer-cents value per item, so `amount` = Stripe's authoritative `li.amount_total`. The `fallbackEach`/`fallbackRemainder` split (`:178-180`) survives **only** as the degraded path when the `listLineItems` call itself throws — its catch (`:174-176`) is unchanged. Nothing else in this branch changes.)*

**Doc impact:** correct the `EVERLASTINGS_STORE.md` money-flow note — `orders.amount` is the **real per-line** `amount_total` from Stripe (was documented/behaving as an even `total/n` split); the even split is now the fetch-failure fallback only.

---

**Phase 7.2 — Remove the 15-min cart-hold reservation entirely (#224).**

Return to the original no-reservation design. The hold self-locked an abandoning/retrying shopper and mis-fired the apology coupon; without holds, sold-recovery fires only on a *real* sold-out (the availability re-check, which stays). Every `cart_holds` read/write is removed across `api/checkout.ts` + `api/webhook.ts`; the availability check, subscriber upsert, and customer prefill all stay. The `?_action=reserve` route + its `vercel.json` rewrite (`vercel.json:10`) **stay** — the endpoint keeps serving as the availability/subscriber-capture gate, just with no reservation side effect.

*7.2a — `api/checkout.ts` `handleSession`: drop the hold check, keep the availability re-check.* **CURRENT (`api/checkout.ts:43-68`):**
```ts
    const productIds = items.map((i) => i.product_id);
    const nowIso = new Date().toISOString();

    const { data: holds, error: holdsError } = await supabase
      .from('cart_holds')
      .select('product_id, session_id')
      .in('product_id', productIds)
      .gt('expires_at', nowIso);

    if (holdsError) throw holdsError;

    const ownHeldIds = new Set(
      (holds || [])
        .filter((h) => h.session_id === session_id)
        .map((h) => h.product_id),
    );
    const missingHolds = productIds.filter((id) => !ownHeldIds.has(id));

    if (missingHolds.length > 0) {
      return Response.json(
        { error: 'hold_expired' },
        { status: 410, headers: corsHeaders(request) },
      );
    }

    const { data: products, error: productsError } = await supabase
```
**NEW (keep `productIds`, go straight to the products/availability query):**
```ts
    const productIds = items.map((i) => i.product_id);

    const { data: products, error: productsError } = await supabase
```
*(`nowIso` was used only by the deleted holds query — safe to drop. The availability re-check at `:77-92` is untouched and still returns `410 { error: 'hold_expired' }` when a piece has since gone unavailable, so `assets/js/checkout.js:35` still bounces to `/cart` correctly. The `hold_expired` body string is now a slight misnomer meaning "unavailable," but harmless — the frontend branches on the **410 status**, not the string. `session_id` stays required + written to `metadata` (`:132`), unchanged.)*

*7.2b — `handleReserve`: collapse the `Promise.all` (products + holds) to the products query alone.* **CURRENT (`api/checkout.ts:182-198`):**
```ts
    const nowIso = new Date().toISOString();

    const [{ data: products, error: productsError }, { data: activeHolds, error: holdsError }] =
      await Promise.all([
        supabase
          .from('products')
          .select('id, slug, available, quantity, series, is_published, archived_at')
          .in('id', productIds),
        supabase
          .from('cart_holds')
          .select('product_id, session_id')
          .in('product_id', productIds)
          .gt('expires_at', nowIso),
      ]);

    if (productsError) throw productsError;
    if (holdsError) throw holdsError;
```
**NEW:**
```ts
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, slug, available, quantity, series, is_published, archived_at')
      .in('id', productIds);

    if (productsError) throw productsError;
```

*7.2c — `handleReserve`: drop the hold-conflict from the `unavailable` filter (keep availability).* **CURRENT (`api/checkout.ts:202-211`):**
```ts
    const unavailable = items
      .filter((item) => {
        const product = productMap.get(item.product_id);
        if (!product || product.is_published !== true || product.archived_at != null || product.available !== true || (product.quantity ?? 0) < 1) return true;
        const conflict = (activeHolds || []).some(
          (h) => h.product_id === item.product_id && h.session_id !== session_id,
        );
        return conflict;
      })
      .map((item) => ({ product_id: item.product_id, slug: item.slug }));
```
**NEW (availability only — no cross-session conflict):**
```ts
    const unavailable = items
      .filter((item) => {
        const product = productMap.get(item.product_id);
        return !product || product.is_published !== true || product.archived_at != null || product.available !== true || (product.quantity ?? 0) < 1;
      })
      .map((item) => ({ product_id: item.product_id, slug: item.slug }));
```
*(The `409 { error: 'unavailable', unavailable, related }` response + the series/fallback related-product lookup (`:213-259`) are untouched — a genuinely sold-out piece still triggers the sold-recovery overlay. `activeHolds` was the only other consumer of the deleted holds query.)*

*7.2d — `handleReserve`: remove the hold delete+insert block.* **CURRENT (`api/checkout.ts:261-279`):**
```ts
    const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: deleteError } = await supabase
      .from('cart_holds')
      .delete()
      .eq('session_id', session_id)
      .in('product_id', productIds);

    if (deleteError) throw deleteError;

    const holdRows = items.map((i) => ({
      session_id,
      product_id: i.product_id,
      expires_at: expiresAt,
      is_test: isTest,
    }));

    const { error: insertError } = await supabase.from('cart_holds').insert(holdRows);
    if (insertError) throw insertError;
```
**NEW:** *(remove the entire block — the customer-prefill lookup at `:281` follows directly after the `unavailable` guard).*

*7.2e — `handleReserve`: drop `expires_at` from the success response (`expiresAt` no longer exists).* **CURRENT (`api/checkout.ts:306-313`):**
```ts
    return Response.json(
      {
        ok: true,
        expires_at: expiresAt,
        customer_prefill: customerPrefill,
      },
      { headers: corsHeaders(request) },
    );
```
**NEW:**
```ts
    return Response.json(
      {
        ok: true,
        customer_prefill: customerPrefill,
      },
      { headers: corsHeaders(request) },
    );
```
*(`assets/js/cart.js` never reads `expires_at` — its 200-path branches on `res.ok` and reads only `data.unavailable`/`data.related` on the 409 (`cart.js:142-166`). Dropping the field is invisible to the client. `isTest` stays imported — still used by the subscriber upsert `:174`, the prefill `.eq('is_test', isTest)` `:293`, and the related/fallback queries `:231`/`:246`.)*

*7.2f — `api/checkout.ts`: remove the now-unused `HOLD_TTL_MINUTES` const.* **CURRENT (`api/checkout.ts:13-16`):**
```ts
);

const HOLD_TTL_MINUTES = 15;

interface CartItem {
```
**NEW:**
```ts
);

interface CartItem {
```

*7.2g — `api/webhook.ts`: remove the post-order hold cleanup.* **CURRENT (`api/webhook.ts:244-256`):**
```ts
    }

    const holdSessionId = session.metadata?.hold_session_id ?? session.metadata?.session_id ?? null;
    if (holdSessionId) {
      const { error: holdsErr } = await supabase
        .from('cart_holds')
        .delete()
        .eq('session_id', holdSessionId);
      if (holdsErr) {
        console.error(`Cart holds clear failed for ${event.id} (session ${holdSessionId}):`, holdsErr);
      }
    }

    if (process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN) {
```
**NEW (the Meta-CAPI block follows the new-order notification directly):**
```ts
    }

    if (process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN) {
```
*(`session.metadata.session_id` is still written by `handleSession` and stored harmlessly — nothing reads it after this removal, so no further edit needed.)*

*7.2h — `assets/js/cart.js`: KEEP the reserve POST as-is (decision).* **No code change.** The `fetch('/api/checkout/reserve', …)` at `cart.js:132-140` stays — post-#224 the endpoint is a pure **availability check + subscriber capture + prefill**, and its client-facing contract (200 `{ ok }` / 409 `{ unavailable, related }`) is unchanged. Removing the POST would delete the sold-recovery trigger + the checkout-started subscriber capture, so it must stay. *(Verified: `cart.js` reads only status codes + `data.unavailable`/`data.related`; it never read `expires_at` or any hold field, so 7.2e/7.2d are transparent to it.)*

*7.2i — migration: retire the `cart_holds` table (commented per convention).* Create `supabase/migrations/20260701000002_v3_5_drop_cart_holds.sql` (prefix `…000002`: WS2 §2.3's `scheduled_publish` already took `20260701000001`, so this sorts after it — no two migrations share a prefix; `db push` orders deterministically). Following the project's destructive-op convention (`20260616000001_v3_1_inventory_decrement.sql`), the `DROP` ships **commented** so `supabase db push` records the migration but never auto-drops — Sean runs it by hand after confirming the code is deployed. **NEW file (verbatim):**
```sql
-- v3.5 — retire cart_holds (#224). The 15-minute soft reservation is removed: it self-locked an
-- abandoning/retrying shopper and mis-fired the apology coupon. After the WS7 code deploy, NOTHING
-- reads or writes cart_holds — api/checkout.ts (handleSession + handleReserve) and api/webhook.ts no
-- longer touch it, and its RLS policy (rls_policies.sql:88-91) + index (initial_schema.sql:165) are dead.
--
-- The DROP ships COMMENTED on purpose (mirrors 20260616000001's cutover convention): `supabase db push`
-- applies this file as a no-op and never destroys a table automatically. Once the WS7 build is LIVE on
-- prod (confirm no lingering cart_holds reference), uncomment the line below and run it once by hand.
-- DROP TABLE cascades the "Service role can manage cart holds" policy and idx_cart_holds_product_active.
--
-- DROP TABLE IF EXISTS cart_holds;
```

**Doc impact:** remove `cart_holds` from the `EVERLASTINGS_STORE.md` schema + the checkout-flow description (no reservation; sold-out is caught at the availability re-check, which drives sold-recovery); note the `reserve` endpoint is now "availability check + subscriber capture," not a hold.

---

**Phase 7.3 — Fold order↔Stripe reconciliation into the existing daily `product-feed` cron (#227).**

No new function, no new cron: the daily cron already hits `/api/product-feed` at `0 9 * * *` (`vercel.json:4-5`) and its Supabase read doubles as the DB keep-alive. Add a second job to the same GET handler that compares **Stripe's completed-and-paid checkout sessions** for the day against the `orders` table and **emails on any paid-session-without-order gap** (a webhook that never landed — signature drift, a deploy blip, Deployment-Protection eating the delivery). It reads Stripe's authoritative completed-session ledger, so it inherently never alerts on raw signature-400s (bot/replay noise). The feed's public consumers (Google/Meta) must never trigger it, so it's gated to the **authenticated cron hit** via the documented `CRON_SECRET` mechanism.

*Constraint that shapes this:* `api/product-feed.ts` uses the **publishable** key (`:6`), but `orders` is `authenticated`-read only (`rls_policies.sql:38-39`). So reconciliation needs a **service-role** client — which is exactly the shared **`feedAdmin`** client WS2 §2.6 already declared (`SUPABASE_SECRET_KEY`, same key `api/webhook.ts:9` uses). Reuse it; do NOT declare a second client.

*7.3a — add the stripe/email imports (reuse `feedAdmin`, don't re-declare a client). Re-anchor against the post-§2.6 tree.* **CURRENT (the import block as §2.6 left it — §2.6 already added the `isTest` import + the `feedAdmin` client):**
```ts
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest } from './_lib/env';
```
**NEW (append stripe + email imports; the `feedAdmin` client from §2.6 is reused as-is — no new client):**
```ts
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest } from './_lib/env';
import { stripe } from './_lib/stripe';
import { sendEmail } from './_emails/index';
```

*7.3b — the cron gate + reconciliation helper (add above the `GET` export, after the `FeedRow` type `:16`).* **NEW (insert this block):**
```ts
// Vercel Cron auth (documented): when CRON_SECRET is set, Vercel adds `Authorization: Bearer <secret>`
// to the cron request only. The product feed is PUBLIC (Google/Meta poll it), so we gate reconciliation
// on this header — a public feed hit never triggers it, and no secret configured = never runs (safe).
function isCronRequest(req: Request): boolean {
  const secret = (process.env.CRON_SECRET ?? '').trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

// Reconcile Stripe's source-of-truth against our orders table. A paid+completed checkout session with
// NO matching orders row = a completion webhook that never landed (one cart = one session spanning N
// sibling rows sharing stripe_session_id). We do NOT inspect signature-400s — those are bot/replay
// noise; Stripe's completed-session list is the authoritative ledger. Scoped by isTest; the Stripe key
// is already env-scoped (test vs live), so on the prod cron both sides are LIVE data.
async function reconcileOrders(): Promise<void> {
  const sinceUnix = Math.floor(Date.now() / 1000) - 26 * 60 * 60; // 26h overlaps the 24h cadence
  const sessions = await stripe.checkout.sessions.list({
    created: { gte: sinceUnix },
    status: 'complete',
    limit: 100,
  });
  const paid = sessions.data.filter((s) => s.payment_status === 'paid');
  if (paid.length === 0) return;

  const sessionIds = paid.map((s) => s.id);
  const { data: rows, error } = await feedAdmin
    .from('orders')
    .select('stripe_session_id')
    .eq('is_test', isTest)
    .in('stripe_session_id', sessionIds);
  if (error) {
    console.error('Reconciliation: orders lookup failed:', error);
    return;
  }

  const haveOrder = new Set((rows ?? []).map((r) => r.stripe_session_id));
  const gaps = paid.filter((s) => !haveOrder.has(s.id));
  if (gaps.length === 0) {
    console.log(`Reconciliation OK: ${paid.length} paid session(s), all have orders.`);
    return;
  }

  const alertTo = (process.env.RECONCILE_ALERT_EMAIL || process.env.ORDER_NOTIFY_EMAIL || '').trim();
  if (!alertTo) {
    console.error(`Reconciliation: ${gaps.length} gap(s) but no alert address configured.`);
    return;
  }

  // Auto-replay path: Stripe Dashboard -> Developers -> Events -> the session's checkout.session.completed
  // -> Resend. The webhook's idempotency claim (webhook_events, webhook.ts:50) makes a resend safe and it
  // rebuilds the missing orders row(s). (A future step could POST the event back to /api/webhook directly.)
  const items = gaps
    .map((s) => {
      const pi = typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent?.id ?? 'unknown');
      const amt = ((s.amount_total ?? 0) / 100).toFixed(2);
      const email = s.customer_details?.email ?? 'unknown buyer';
      return `<li>Session <code>${s.id}</code> — $${amt} — PI <code>${pi}</code> — ${email}</li>`;
    })
    .join('');
  const html = `<p>${gaps.length} Stripe checkout session(s) completed &amp; paid in the last 26h with NO matching orders row (${isTest ? 'TEST' : 'LIVE'} data). The completion webhook likely never landed:</p>
<ul>${items}</ul>
<p><strong>Replay:</strong> Stripe Dashboard → Developers → Events → find each session's <code>checkout.session.completed</code> → Resend. The webhook is idempotent, so a resend safely rebuilds the missing order(s).</p>`;
  await sendEmail({ to: alertTo, subject: `Reconciliation: ${gaps.length} paid session(s) missing an order`, html });
  console.error(`Reconciliation: emailed ${gaps.length} gap(s) to ${alertTo}.`);
}
```

*7.3c — the ONE shared cron gate at the top of `GET` (both jobs: WS2's scheduled-publish + this reconciliation).* This is the single `GET` edit for the merged file — WS2 §2.6 deliberately did NOT edit `GET`. Both jobs are gated to the authenticated cron hit so a PUBLIC/preview feed poll triggers neither (Google/Meta poll the feed; a preview hit must not self-publish). Publish runs FIRST so freshly-published rows appear in the same feed run; each job is independently wrapped so one failing never blocks the other or the feed. **CURRENT (`api/product-feed.ts:18-19`, as §2.6 left it — §2.6 added no `GET` wrapper):**
```ts
export async function GET(req: Request) {
  const { data: products, error } = await supabase
```
**NEW (both cron jobs inside one `isCronRequest` gate; each non-fatal):**
```ts
export async function GET(req: Request) {
  // Cron-gated jobs (#227 reconcile + v3.5 scheduled-publish). Gated to the authenticated cron hit so
  // the PUBLIC feed never triggers them; a public/preview poll runs neither. A failure in either must
  // never break the feed response. Publish first so due rows appear in this same run.
  if (isCronRequest(req)) {
    try {
      await publishDueScheduled(req); // v3.5: auto-publish any scheduled-and-due rows (is_test-scoped)
    } catch (err) {
      console.error('Scheduled-publish job failed (non-fatal):', err);
    }
    try {
      await reconcileOrders();
    } catch (err) {
      console.error('Reconciliation job failed (non-fatal):', err);
    }
  }

  const { data: products, error } = await supabase
```

*(No `vercel.json` change — the cron already targets `/api/product-feed`. `stripe.checkout.sessions.list` `status`/`payment_status`/`created` are stable Basil params (`STRIPE_API_VERSION` `_lib/stripe.ts:7`); `limit: 100` covers this store's daily volume — a `has_more` day would under-report, acceptable for v1 and grep-able in logs. `tsc` clean.)*

*Alert address (SETTLED):* reconciliation alerts go to the existing **`ORDER_NOTIFY_EMAIL`** (the merchant-notify address, `webhook.ts:208`); `RECONCILE_ALERT_EMAIL` is an optional override if Sean later wants a dedicated ops inbox. No new decision — reuse the order-notify address.

**Doc impact:** add the reconciliation job to `EVERLASTINGS_STORE.md` (daily cron now does feed **+** order↔Stripe reconciliation, alerting on a paid-session-without-order gap, with the Stripe-resend replay path); document the new `CRON_SECRET` (required to arm it) and optional `RECONCILE_ALERT_EMAIL` env vars in `GPT_SETUP.md`/the env reference. **Go-live handoff — REQUIRED build output (round-1 #3), even though the cutover runbook is separate (see the "go-live cutover is untouched" invariant):** `CRON_SECRET` is a **net-new production dependency this build introduces** (`isCronRequest` is new — it exists nowhere in `api/` today) and it gates **BOTH** the §2.6 scheduled-publish flip **and** this §7.3 reconciliation. It must be set in the **Production** Vercel scope at cutover, or both jobs are silently inert in prod — a maker schedules a piece for Friday and it **never publishes**, with no error, no log, no activity row (the A2-4 backstop only fires on a publish-ready-but-skipped row, never on "the cron never authenticated"). Add **"set `CRON_SECRET` in the Production scope"** to the go-live checklist in `EVERLASTINGS_STORE.md` and hand it to the ROADMAP-A runbook — this build created the dependency, so naming it is this build's responsibility.

---

**WS7 net surface:** `api/webhook.ts` (7.1a expand + 7.2g cleanup removal), `api/checkout.ts` (7.2a–7.2f), `assets/js/cart.js` (7.2h — no change, decision recorded), one new commented migration (7.2i), `api/product-feed.ts` (7.3a–7.3c). No new `api/*.ts` function, no new cron, no `vercel.json` change. New env: `CRON_SECRET` (required to arm 7.3), `RECONCILE_ALERT_EMAIL` (optional).

---

## WS8 — Activity log + seen/unseen order tracking

> **Byte-anchored (migration + write-helper + call-site inserts + read) + integration-seam.** Each phase quotes a **CURRENT** block (the locator) + a **NEW** block. Line numbers are hints; the quoted CURRENT text is the anchor — if it doesn't match the working tree byte-for-byte, STOP and reconcile. Run `npx tsc --noEmit` clean after the TS edits (all `api/*.ts` must stay CommonJS-compilable — no new function, no ESM-only construct). Scope everything by `isTest`; no hard delete; single-admin.

**Design premise.** The Account surface renders an **Activity log** card from `window.PORTAL_DATA.activityLog` (`out/account-app.js:53,82-86`) — a UI stub with no backend. Two cross-surface **blink** signals (`data-alert`) also have no data source (`INTEGRATION.md §3.9`): the Orders-nav item and the Sold product tab. 8.1 gives the log a real audit trail; 8.2 gives the Orders blink a `last_viewed` data source and **removes** the Sold-tab blink per `PRODUCT_LIFECYCLE.md` ("let Sold mean only pieces that have sold; Orders carries its own signal").

---

**Phase 8.1a — migration: the `activity_log` table.** New `supabase/migrations/20260702000001_v3_5_activity_log.sql` (apply via the Supabase CLI — the MCP rejects writes). **Renumber the timestamp prefix to stay monotonic at apply time** if a later migration already exists (Supabase orders by filename). *(`entity_id` is `text`, not `uuid`: it must hold a product/order uuid **and** a Stripe promo id like `promo_1S…` — a mixed-source key. RLS is service-role-only, mirroring `webhook_events`/`cart_holds` — the admin/GPT read goes through the service-role API, which bypasses RLS; anon/authenticated get no access. `is_test` isolates env like every transactional table.)*

```sql
-- v3.5 — audit trail behind the Account activity card. Admin-only; one row per mutating action.
create table activity_log (
  id         uuid default gen_random_uuid() primary key,
  at         timestamptz not null default now(),
  actor      text,                          -- signed-in email (JWT) or 'gpt' (PRODUCT_API_KEY)
  action     text not null,                 -- machine key: product.* | sale.* | order.* (prefix → dot color)
  summary    text not null,                 -- human one-liner rendered on the card
  entity_id  text,                          -- product/order uuid OR Stripe promo id (mixed → text)
  meta       jsonb,
  is_test    boolean not null default false
);

-- Read pattern: newest-first, capped, scoped by env.
create index idx_activity_log_recent on activity_log (is_test, at desc);

-- Admin-only: service-role writes/reads bypass RLS; anon/authenticated get nothing (mirrors webhook_events).
alter table activity_log enable row level security;
create policy "Service role can manage activity log"
  on activity_log for all to service_role using (true) with check (true);
```

**Doc impact:** `EVERLASTINGS_STORE.md` — add `activity_log` to the table list + the audit-trail fact (every mutation writes one row; admin-only, `is_test`-scoped, newest-25 read).

---

**Phase 8.1b — `api/_lib/activityLog.ts`: the write-helper (new file).** Its own service-role client (mirrors `stripeSync.ts`). `logActivity` is **best-effort** — it never throws and never fails the caller's mutation, but callers **await** it (a Vercel function can freeze once the `Response` resolves, dropping an un-awaited insert). `resolveActor` exists for `products.ts`, whose `authorize()` returns only a boolean; `orders.ts` skips it (`requireAdmin` already returns the user).

```ts
import { createClient } from '@supabase/supabase-js';
import { env, isTest } from './env';

// Own service-role client (mirrors _lib/stripeSync.ts) — the audit write must not depend on a
// request-scoped client, and service-role bypasses RLS on the admin-only activity_log table.
const supabase = createClient(
  env('SUPABASE_URL'),
  env('SUPABASE_SECRET_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export type ActivityEntry = {
  actor: string;
  action: string;                     // machine key, e.g. 'product.publish' — the prefix drives the dot color
  summary: string;                    // human one-liner rendered on the Account card
  entityId?: string | null;           // product/order uuid, or a Stripe promo id — text, not uuid (mixed sources)
  meta?: Record<string, unknown> | null;
};

// Best-effort audit write. NEVER throws and NEVER fails the caller's mutation — a logging outage must not
// block a publish/refund/ship. AWAIT it (don't fire-and-forget): a Vercel function can freeze once the
// Response resolves, dropping an un-awaited insert.
export async function logActivity(entry: ActivityEntry): Promise<void> {
  try {
    const { error } = await supabase.from('activity_log').insert({
      actor: entry.actor,
      action: entry.action,
      summary: entry.summary,
      entity_id: entry.entityId ?? null,
      meta: entry.meta ?? null,
      is_test: isTest,
    });
    if (error) console.error('activity_log insert failed (non-fatal):', error.message);
  } catch (err) {
    console.error('activity_log insert threw (non-fatal):', err);
  }
}

// Resolve the acting identity for products.ts call sites, where authorize() returns only a boolean.
// PRODUCT_API_KEY (GPT/curl) → 'gpt' with no round-trip; an admin JWT → the signed-in email (falls back
// to the user id, then 'admin'). One extra getUser on the JWT path is acceptable — logging is best-effort
// and this is single-admin, low-traffic. (orders.ts skips this — requireAdmin already returns the user.)
export async function resolveActor(request: Request): Promise<string> {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  const token = header && header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return 'unknown';
  if (token === env('PRODUCT_API_KEY')) {
    // v3.6.6 — the scheduled-publish cron self-call (product-feed.ts §2.6) sets X-Actor:cron so its
    // publish activity attributes to 'cron', not 'gpt'. Honored ONLY alongside a valid PRODUCT_API_KEY
    // (a trusted internal caller); a real GPT publish never sets it. Single-admin, so a key-holder
    // mislabeling its OWN action is negligible.
    return request.headers.get('x-actor') === 'cron' ? 'cron' : 'gpt';
  }
  const { data } = await supabase.auth.getUser(token);
  return data?.user?.email ?? data?.user?.id ?? 'admin';
}
```

**Doc impact:** none (internal helper); the audit-trail fact is documented in 8.1a. *(actor = admin email via JWT, `'gpt'` via `PRODUCT_API_KEY`.)*

---

**Phase 8.1c — `api/products.ts`: instrument the mutating call sites.** Import the helper, then insert one awaited `logActivity(...)` immediately before each **success** return (skip the no-op returns — `no_changes:true`, `discarded:false`). Actions use the `product.*` / `sale.*` prefixes the dot color keys off (`out/account-app.js:83`).

**(a) import.** **CURRENT (`api/products.ts:7`):**
```ts
import { syncProductToStripe, StripeSyncResult, SyncableProduct } from './_lib/stripeSync';
```
**NEW:**
```ts
import { syncProductToStripe, StripeSyncResult, SyncableProduct } from './_lib/stripeSync';
import { logActivity, resolveActor } from './_lib/activityLog';
```

**(b) create (`POST`).** **CURRENT (`api/products.ts:258-262`):**
```ts
  // v1.5: products are created as UNPUBLISHED drafts. No Stripe object is created here —
  // the Stripe product/price are created at publish (?_action=publish), so an abandoned
  // draft never orphans a Stripe product. The DB INSERT trigger also skips drafts.
  return jsonResponse(request, {
    success: true,
```
**NEW:**
```ts
  // v1.5: products are created as UNPUBLISHED drafts. No Stripe object is created here —
  // the Stripe product/price are created at publish (?_action=publish), so an abandoned
  // draft never orphans a Stripe product. The DB INSERT trigger also skips drafts.
  await logActivity({
    actor: await resolveActor(request),
    action: 'product.create',
    summary: `Created draft “${String(data.title)}”`,
    entityId: String(data.id),
  });
  return jsonResponse(request, {
    success: true,
```

**(c) edit — published branch (`PUT`).** **CURRENT (`api/products.ts:537-541`):**
```ts
    }
    return jsonResponse(request, {
      success: true,
      product: data,
      staged: hasDraftable,
```
**NEW:**
```ts
    }
    await logActivity({
      actor: await resolveActor(request),
      action: 'product.update',
      summary: hasDraftable ? `Staged edits on “${String(data.title)}”` : `Updated “${String(data.title)}”`,
      entityId: String(data.id),
    });
    return jsonResponse(request, {
      success: true,
      product: data,
      staged: hasDraftable,
```

**(d) edit — unpublished-draft branch (`PUT`).** **CURRENT (`api/products.ts:566-570`):**
```ts
  if (error) {
    console.error('Product update failed:', error.message);
    return jsonResponse(request, { error: error.message }, 400);
  }
  return jsonResponse(request, {
```
*(This `if (error)`/`Product update failed` block appears twice — 525-528 and 566-569; the 5th line disambiguates: only here is it followed by `return jsonResponse(request, {`, not a comment.)*
**NEW:**
```ts
  if (error) {
    console.error('Product update failed:', error.message);
    return jsonResponse(request, { error: error.message }, 400);
  }
  await logActivity({
    actor: await resolveActor(request),
    action: 'product.update',
    summary: `Updated draft “${String(data.title)}”`,
    entityId: String(data.id),
  });
  return jsonResponse(request, {
```

**(e) publish — edit-publish (`handlePublish`).** **CURRENT (`api/products.ts:644-645`):**
```ts
    }
    return jsonResponse(request, { success: true, product: updated, url: liveUrl(request, String(updated.slug)) });
```
**NEW:**
```ts
    }
    await logActivity({
      actor: await resolveActor(request),
      action: 'product.publish',
      summary: `Published edits to “${String(updated.title)}”`,
      entityId: String(updated.id),
    });
    return jsonResponse(request, { success: true, product: updated, url: liveUrl(request, String(updated.slug)) });
```

**(f) publish — first-publish (`handlePublish`).** **CURRENT (`api/products.ts:685-686`):**
```ts
  }
  return jsonResponse(request, { success: true, product: published, url: liveUrl(request, String(published.slug)), stripe_sync: stripeSync });
```
**NEW:**
```ts
  }
  await logActivity({
    actor: await resolveActor(request),
    action: 'product.publish',
    summary: `Published “${String(published.title)}”`,
    entityId: String(published.id),
  });
  return jsonResponse(request, { success: true, product: published, url: liveUrl(request, String(published.slug)), stripe_sync: stripeSync });
```

**(g) create sale — `handleCoupon`.** **CURRENT (`api/products.ts:745-746`):**
```ts
    const promo = await stripe.promotionCodes.create(promoParams);
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id, expires_display: typeof body.expires_at === 'number' ? formatExpiry(body.expires_at) : null });
```
**NEW:** *(`body.value` is a percent for `type:'percent'` and cents for `type:'amount'` — see `couponParams` at `:726-729`, `amount_off: Math.round(body.value)`.)*
```ts
    const promo = await stripe.promotionCodes.create(promoParams);
    await logActivity({
      actor: await resolveActor(request),
      action: 'sale.create',
      summary: `Created sale “${String(promo.code)}” — ${body.type === 'percent' ? `${body.value}% off` : `$${((body.value as number) / 100).toFixed(2)} off`}`,
      entityId: promo.id,
    });
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id, expires_display: typeof body.expires_at === 'number' ? formatExpiry(body.expires_at) : null });
```

**(h) end sale — `handleCouponDeactivate`.** **CURRENT (`api/products.ts:861-862`):**
```ts
    const updated = await stripe.promotionCodes.update(promo.id, { active: false });
    return jsonResponse(request, { success: true, code: updated.code, active: updated.active });
```
**NEW:**
```ts
    const updated = await stripe.promotionCodes.update(promo.id, { active: false });
    await logActivity({
      actor: await resolveActor(request),
      action: 'sale.end',
      summary: `Ended sale “${String(updated.code)}”`,
      entityId: updated.id,
    });
    return jsonResponse(request, { success: true, code: updated.code, active: updated.active });
```

**(i) archive / unarchive — `handleArchive`.** *(The update `.select().single()` at `:906-911` returns the full row, so `data.title` is present even though the earlier lookup at `:886` selected only `id, slug, stripe_product_id`.)* **CURRENT (`api/products.ts:915-916`):**
```ts
  }
  return jsonResponse(request, { success: true, product: data, archived: archive });
```
**NEW:**
```ts
  }
  await logActivity({
    actor: await resolveActor(request),
    action: archive ? 'product.archive' : 'product.unarchive',
    summary: archive ? `Archived “${String(data.title)}”` : `Resurfaced “${String(data.title)}”`,
    entityId: String(data.id),
  });
  return jsonResponse(request, { success: true, product: data, archived: archive });
```

**(j) discard staged draft — `handleDiscard`.** **CURRENT (`api/products.ts:967-968`):**
```ts
  }
  return jsonResponse(request, { success: true, product: data, discarded: true });
```
**NEW:**
```ts
  }
  await logActivity({
    actor: await resolveActor(request),
    action: 'product.discard',
    summary: `Discarded staged edits on “${String(data.title)}”`,
    entityId: String(data.id),
  });
  return jsonResponse(request, { success: true, product: data, discarded: true });
```

**Doc impact:** none beyond 8.1a (the instrumented actions ARE the mutations STORE already documents).

---

**Phase 8.1d — `api/products.ts` GET: fold in the activity READ (no new function).** A `?_action=activity` branch in the existing GET dispatch, admin/GPT-only, mirroring `handleCouponList` (self-authorizing). Returns the exact `{ at, actor, action, summary }` shape `window.PORTAL_DATA.activityLog` expects.

**(a) dispatch.** **CURRENT (`api/products.ts:70-71`):**
```ts
  // v1.5: list active discounts (?_action=coupon, GET) — admin/GPT only.
  if (url.searchParams.get('_action') === 'coupon') return handleCouponList(request);
```
**NEW:**
```ts
  // v1.5: list active discounts (?_action=coupon, GET) — admin/GPT only.
  if (url.searchParams.get('_action') === 'coupon') return handleCouponList(request);

  // v3.5: recent activity feed (?_action=activity, GET) — admin/GPT only. Feeds the Account activity card.
  if (url.searchParams.get('_action') === 'activity') return handleActivityLog(request);
```

**(b) handler.** Add after `handleCouponList` ends. **CURRENT (`api/products.ts:836-838`):**
```ts
  }
}

// ?_action=coupon_deactivate (POST) — end a sale now (promotion code active:false).
```
**NEW:**
```ts
  }
}

// ?_action=activity (GET) — recent activity feed for the Account surface's activity card. Admin/GPT only
// (audit trail is not public). Newest-first, capped at 25, scoped by isTest. Returns the exact
// { at, actor, action, summary } shape window.PORTAL_DATA.activityLog expects (design-handoff out/data.js).
async function handleActivityLog(request: Request): Promise<Response> {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }
  const { data, error } = await supabase
    .from('activity_log')
    .select('at, actor, action, summary')
    .eq('is_test', isTest)
    .order('at', { ascending: false })
    .limit(25);
  if (error) {
    console.error('Activity log GET failed:', error.message);
    return jsonResponse(request, { error: 'Failed to load activity' }, 500);
  }
  return jsonResponse(request, { activityLog: data ?? [] });
}

// ?_action=coupon_deactivate (POST) — end a sale now (promotion code active:false).
```

**Doc impact:** `EVERLASTINGS_STORE.md` API surface — note `GET /api/products?_action=activity` → `{ activityLog: [newest 25] }`.

---

**Phase 8.1e — `api/orders.ts`: instrument mark-shipped + refund.** `requireAdmin` already returns the user, so the actor is computed once per handler with no extra round-trip.

**(a) import.** **CURRENT (`api/orders.ts:9`):**
```ts
import { sendEmail, trackingEmailHtml, trackingUrl } from './_emails/index';
```
**NEW:**
```ts
import { sendEmail, trackingEmailHtml, trackingUrl } from './_emails/index';
import { logActivity } from './_lib/activityLog';
```

**(b) mark-shipped (`PATCH`) — actor + log.** First add the actor. **CURRENT (`api/orders.ts:104-107`):**
```ts
export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;
```
**NEW:**
```ts
export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;
  const actor = 'user' in auth ? (auth.user.email ?? auth.user.id) : 'gpt';
```
Then log once after the status flip (covers every downstream email-branch return). **CURRENT (`api/orders.ts:174-176`):**
```ts
  const order = updated as unknown as OrderRow;

  const recipient = order.customers?.email ?? order.customer_email ?? null;
```
**NEW:**
```ts
  const order = updated as unknown as OrderRow;

  await logActivity({
    actor,
    action: 'order.ship',
    summary: `Marked order #${order.id.slice(0, 8)} shipped`,
    entityId: order.id,
  });

  const recipient = order.customers?.email ?? order.customer_email ?? null;
```

**(c) refund (`POST`) — log before the final return.** *(The `actor` const for refund is added in Phase 8.2a's POST refactor — do that phase's block first, or add `const actor = 'user' in auth ? (auth.user.email ?? auth.user.id) : 'gpt';` after `:256` if building 8.1e alone.)* **CURRENT (`api/orders.ts:338-341`):**
```ts
  // (relistIds empty = goodwill/partial, nothing returned → NO status flip, empty relist; the response
  // `status` mirrors that — 'refunded' only when pieces actually flipped, else the order's unchanged
  // status, so the field never lies to the GPT. A full-PI refund still flips every sibling via charge.refunded.)
  return jsonResponse(request, { ok: true, status: relistIds.length ? 'refunded' : order.status, relist });
```
**NEW:**
```ts
  // (relistIds empty = goodwill/partial, nothing returned → NO status flip, empty relist; the response
  // `status` mirrors that — 'refunded' only when pieces actually flipped, else the order's unchanged
  // status, so the field never lies to the GPT. A full-PI refund still flips every sibling via charge.refunded.)
  await logActivity({
    actor,
    action: 'order.refund',
    summary: `Refunded $${(refundAmount / 100).toFixed(2)} on order #${id.slice(0, 8)}`,
    entityId: id,
  });
  return jsonResponse(request, { ok: true, status: relistIds.length ? 'refunded' : order.status, relist });
```

**Doc impact:** none beyond 8.1a.

---

**Phase 8.2a — `api/orders.ts`: `last_viewed` seen/unseen (no migration — `site_config` already exists).** `site_config` (`(key text unique, value jsonb)`, `initial_schema:132-138`) is the simplest single-admin mechanism: one per-env row holds the last time Orders was viewed. It has **no `is_test` column** (a non-transactional table, `initial_schema:169`), so env lives in the **key**. GET returns `unseen_count` + `last_viewed` (drives the blink); a new `POST ?_action=seen` stamps `now()` (clears it).

**(a) per-env key const.** **CURRENT (`api/orders.ts:11`):**
```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```
**NEW:**
```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// v3.5: per-env last-viewed key for the Orders-nav unseen blink. site_config has no is_test column
// (a non-transactional table — initial_schema :169), so the ENV lives in the key, not a column.
const ORDERS_LAST_VIEWED_KEY = isTest ? 'orders_last_viewed_test' : 'orders_last_viewed_live';
```

**(b) GET — return the unseen count + last_viewed.** **CURRENT (`api/orders.ts:95-101`):**
```ts
  const { data, error } = await query;
  if (error) {
    console.error('Orders GET failed:', error.message);
    return jsonResponse(request, { error: 'Failed to load orders' }, 500);
  }

  return jsonResponse(request, { orders: data ?? [] });
```
**NEW:** *(`supabase` here is the service-role client from `requireAdmin`, destructured at `:57`. The unseen count is filter-independent — it's a global nudge, not the current subtab's slice. Two extra lightweight reads; single-admin traffic makes the cost a no-op.)*
```ts
  const { data, error } = await query;
  if (error) {
    console.error('Orders GET failed:', error.message);
    return jsonResponse(request, { error: 'Failed to load orders' }, 500);
  }

  // v3.5: unseen-order signal for the Orders-nav blink. Count completed, unshipped orders created AFTER
  // the owner last viewed Orders (site_config, per-env). Independent of the list filter.
  const { data: lv } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', ORDERS_LAST_VIEWED_KEY)
    .maybeSingle();
  const lastViewed = (lv?.value as { at?: string } | null)?.at ?? null;
  let unseenQuery = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('is_test', isTest)
    .is('shipped_at', null)
    .eq('status', 'completed');
  if (lastViewed) unseenQuery = unseenQuery.gt('created_at', lastViewed);
  const { count: unseenCount } = await unseenQuery;

  return jsonResponse(request, { orders: data ?? [], unseen_count: unseenCount ?? 0, last_viewed: lastViewed });
```

**(c) POST — add the `seen` action (stamps last_viewed) + compute the actor.** **CURRENT (`api/orders.ts:256-261`):**
```ts
  const { supabase } = auth;

  const url = new URL(request.url);
  if (url.searchParams.get('_action') !== 'refund') {
    return jsonResponse(request, { error: 'Unknown action' }, 400);
  }
```
**NEW:** *(One dispatch, same shape as `products.ts`'s `_action` fork — not a new function. `site_config.key` is UNIQUE, so `upsert(onConflict:'key')` is the whole write. The `actor` const also serves the Phase 8.1e refund log below.)*
```ts
  const { supabase } = auth;
  const actor = 'user' in auth ? (auth.user.email ?? auth.user.id) : 'gpt';

  const url = new URL(request.url);
  const action = url.searchParams.get('_action');

  // v3.5: mark Orders as seen — stamp a per-env last-viewed time in site_config so the Orders-nav blink
  // clears. Single-admin, so one timestamp per env is the whole mechanism.
  if (action === 'seen') {
    const { error: seenErr } = await supabase
      .from('site_config')
      .upsert({ key: ORDERS_LAST_VIEWED_KEY, value: { at: new Date().toISOString() } }, { onConflict: 'key' });
    if (seenErr) {
      console.error('Orders seen-stamp failed:', seenErr.message);
      return jsonResponse(request, { error: 'Failed to record the view' }, 500);
    }
    return jsonResponse(request, { ok: true });
  }

  if (action !== 'refund') {
    return jsonResponse(request, { error: 'Unknown action' }, 400);
  }
```

**Doc impact:** `EVERLASTINGS_STORE.md` — add the `site_config.orders_last_viewed_{env}` key + the unseen-order signal (GET returns `unseen_count`/`last_viewed`; `POST ?_action=seen` stamps it).

---

**Phase 8.2b — `out/products-app.js`: remove the Sold-tab blink.** Per `PRODUCT_LIFECYCLE.md` ("stop hanging the Orders alert on the Sold tab") — the Sold tab means only "pieces that have sold"; Orders carries its own signal (8.2a). *(Anchored against the design-handoff prototype `assets/docs/archive/v3_5/design-handoff/out/products-app.js`; if integration has already relocated this JS into `/admin`, apply the same byte edits there. `unseenOrders` is referenced ONLY at `:13` and `:98` — grep-confirmed — so removing both leaves no dangling reference.)*

**(a) drop the stub const.** **CURRENT (`out/products-app.js:12-13`):**
```js
  let tab = "live", query = "", openId = null;
  const unseenOrders = 2; // drives the Sold-tab + Orders-nav blink (no data source yet — see INTEGRATION.md)
```
**NEW:**
```js
  let tab = "live", query = "", openId = null;
```

**(b) drop the `data-alert` on the Sold chip.** **CURRENT (`out/products-app.js:98`):**
```js
      `<button class="seg__chip" role="tab" data-tab="${t.id}" aria-selected="${t.id === tab}" ${t.id === "sold" && unseenOrders ? "data-alert" : ""}>
```
**NEW:**
```js
      `<button class="seg__chip" role="tab" data-tab="${t.id}" aria-selected="${t.id === tab}">
```

**Doc impact:** `PRODUCT_LIFECYCLE.md` decision resolved (Sold no longer blinks); note in `STORE_ADMINISTRATION.md` if it references a Sold-tab alert.

---

**Integration seam** — how the redesigned surfaces get real data (client wiring, not byte-anchored here; the prototype's in-memory model is replaced by these calls without changing markup/class names):

- **Account activity card** (`out/account-app.js:53,82-86`, `window.PORTAL_DATA.activityLog`, shape `{ at, actor, action, summary }`) → **`GET /api/products?_action=activity`** → `{ activityLog: [...] }` (newest 25, `isTest`-scoped). *(`actor` is stored but not rendered — single-admin; the card shows `summary` + relative `at` + the dot.)*
- **Activity dot color** (`.logitem__dot--{prefix}`, `out/account-app.js:83`) → derived client-side from `action.split(".")[0]` (`product`→green, `sale`→blue, `order`→orange, per `INTEGRATION.md:183`). All WS8 actions use those three prefixes — no CSS case to add.
- **Orders-nav blink — SETTLED: blink ← `unseen_count`, numeric badge ← unfulfilled count; `mountShell` fetches `unseen_count` centrally on EVERY page.** The blink is a cross-page nav element (rail + tabbar `data-alert`, `out/portal.js:147,154`), but the prototype only the Orders surface knows `unseen_count` — Sales/Account pass a mock `ordersBadge: 2` and Products self-manages a static rail — so the blink would never light on the **landing** page (products). Fix: `portal.js`/`mountShell` does its own authed **`GET /api/orders`** on every page (reading `unseen_count`) and drives the blink from it (`data-alert` when `unseen_count > 0`), independent of the caller's `ordersBadge`. The visible numeric **badge stays the unfulfilled count** (`ordersBadge`, e.g. Orders' `groups().filter((g) => inTab(g, "needs")).length`); the two are decoupled — a page can show the blink (a new unseen order arrived) even when its `ordersBadge` is a stale/mock number. **Products' static-rail path needs the same wiring** — its rail isn't built by `mountShell`, so wire the central `unseen_count` fetch → `data-alert` there too (or route the products rail through the shared helper). Clearing is the `?_action=seen` stamp below. **→ implemented byte-anchored in Phase 8.3 below.**
- **Clear the blink (Orders viewed)** (`out/orders-app.js:12,98,132-133` in-memory `seen` Set) → **`POST /api/orders?_action=seen`** on Orders mount/view → stamps `site_config.orders_last_viewed_{env}` → next `GET` returns `unseen_count: 0` until a newer order arrives.
- **Sold product-tab blink** (`out/products-app.js:13,98`) → **removed** (Phase 8.2b) — no data source; Orders owns the order signal.

**Phase 8.3 — `portal.js`: the central new-order signal (byte-anchored — makes the SETTLED bullet above executable).** A shared `PORTAL.refreshOrdersSignal()` does the authed `GET /api/orders?status=needs_shipping` (a small payload — it runs on every page just to read `unseen_count` + the needs count) and drives the nav `data-alert` (from `unseen_count`, which is filter-independent) + the numeric badge (from the real needs-shipping count) on the Orders nav items — decoupled, on every page (`mountShell` pages **and** the Products static rail). It runs after `PORTAL.boot()`, so `authHeader()` is set.

*8.3a — add the helper (after `mountShell`, before the IIFE close).* **CURRENT (`out/portal.js:162-164`):**
```js
    rt.addEventListener("click", () => { const c = app.classList.toggle("rail-collapsed"); localStorage.setItem("portalRailCollapsed", c ? "1" : "0"); rt.setAttribute("aria-label", c ? "Expand menu" : "Collapse menu"); rt.title = c ? "Expand menu" : "Collapse menu"; });
  };
})();
```
**NEW (same, then the shared helper before `})();`):**
```js
    rt.addEventListener("click", () => { const c = app.classList.toggle("rail-collapsed"); localStorage.setItem("portalRailCollapsed", c ? "1" : "0"); rt.setAttribute("aria-label", c ? "Expand menu" : "Collapse menu"); rt.title = c ? "Expand menu" : "Collapse menu"; });
  };

  /* ---- central new-order signal: light the Orders blink from the REAL unseen count and show the REAL
     needs-shipping badge (not the caller's mock ordersBadge). Called by mountShell AND the Products
     static-rail init. Runs after PORTAL.boot() so authHeader() is set. Best-effort; blink (data-alert)
     ← unseen_count (decoupled), badge ← needs-shipping count. ---- */
  P.refreshOrdersSignal = async function () {
    try {
      // v3.5 — ?status=needs_shipping keeps the payload small (this runs on EVERY page just to read two
      // numbers). unseen_count is returned REGARDLESS of the list filter (orders.ts §8.2a — a separate
      // count query, filter-independent), so the blink is unaffected. The needs count stays a defensive
      // client filter over the (already-narrowed) list, so it's correct even if the server predicate drifts.
      const res = await fetch("/api/orders?status=needs_shipping", { headers: { ...P.authHeader() } });
      if (!res.ok) return;
      const body = await res.json().catch(() => ({}));
      const unseen = Number(body.unseen_count) || 0;
      const needs = Array.isArray(body.orders) ? body.orders.filter((o) => !o.shipped_at && o.status === "completed").length : 0;
      document.querySelectorAll('.rail__item[href="orders.html"], .tabbar__item[href="orders.html"]').forEach((el) => {
        el.toggleAttribute("data-alert", unseen > 0);
        let b = el.querySelector(".badge");
        if (needs > 0) { if (!b) { b = document.createElement("span"); b.className = "badge"; el.appendChild(b); } b.textContent = String(needs); }
        else if (b) { b.remove(); }
      });
    } catch { /* best-effort — nav stays as rendered */ }
  };
})();
```
*8.3b — call it from both rail paths.* In `mountShell`, append `P.refreshOrdersSignal();` after the collapse wiring (out/portal.js:162). In `products-app.js`, after its static rail renders (inside the WS1 §1.5 `boot().then`), call `P.refreshOrdersSignal();` so the **landing** page lights too. *(Both run post-boot → `authHeader()` available. The mock `ordersBadge: 2` the callers pass is now cosmetic — `refreshOrdersSignal` overwrites the badge with the real count and the blink with the real unseen state.)*

**Doc impact:** `EVERLASTINGS_STORE.md` — the Orders new-order signal is a per-page `GET /api/orders` (`unseen_count` → blink; needs-shipping count → badge), cleared by `?_action=seen`.

---

## WS9 — Buy-on-tile → on-thesis "information scent" (research decision: NO raw buy button)

> **Storefront-only. Small. Shares the card-render edit region with WS6 (single-edit region — coordinate).** Research (ROADMAP #225) concluded the grid-buy-button conversion evidence is commodity e-comm and does **not** transfer to one-of-a-kind, emotional, $200–500 art — the product page is the conversion engine, "fewer clicks" is a debunked premise, and scarcity is realized on the PDP. **Decision (Sean, deferring to the research): do NOT add a raw "Buy Now" / "Add to Cart" on tiles.** Instead spend the small effort on *information scent* that pulls buyers into the story. (Full sourced research summary in `v3_5_0_RATIONALE.md` at the execution cut.)

**Phase 9.1 — shop card + featured tile: full-tile tap target (verify, no code edit).** The whole product tile is **already** a generous tap target — §6.5a (shop) + §6.3d (homepage) wrap the entire card in a single `<a href="/product/…">` (big image, obvious price, whole-card link), with no competing in-tile button — so WS9's "full-tile tap" is delivered by those blocks; there's **no separate `shop.js`/`homepage.js` edit** to make. Any affordance polish (a hover/press cue) is a CSS-only render-tune on `.product-tile` in `styles.css`, not a build gate. **Doc impact:** none.

**Phase 9.2 — "One of a kind" scarcity badge on tiles (concrete).** A small `badge badge-unique` with the copy **"One of a kind"** renders in the tile's `card__media`, next to the Featured badge, on **purchasable (`!sold`) tiles** — the proven scarcity lever for unique inventory (pulls into the story, doesn't short-circuit it). **Render markup is already folded into the merged card blocks** — `§6.5a` (shop grid) and `§6.3d` (homepage carousel), gated on `!sold` (see the Shared-file edit coordination section; do NOT add a separate card edit). **Visual spec (class + copy + CSS + placement + the one trigger to confirm) is DESIGN §D.4** — it's a NEW storefront-brand component (not in `out/`, which is the portal), so its look lives with the other storefront additions in the design addendum. **Doc impact:** none (storefront-only presentational).

*9.2a — `assets/css/styles.css`: write the `.badge-unique` hue rule (the badge's CSS wiring — without this phase the badge renders UNSTYLED; the §D.1 struck CSS is wired by §4.3.d, but nothing else writes this one).* **CURRENT (`assets/css/styles.css:586-593`):**
```css
.badge-featured {
  background: var(--bg-primary);
  border: 1px solid var(--color-gold);
  color: var(--accent-primary);
}

/* Overlay placement on top of card media */
.card__media .badge {
```
**NEW (insert `.badge-unique` after `.badge-featured`; solid storefront tokens — no `color-mix()`, so no OKLCH browser-floor question):**
```css
.badge-featured {
  background: var(--bg-primary);
  border: 1px solid var(--color-gold);
  color: var(--accent-primary);
}

.badge-unique {
  background: var(--bg-primary);
  border: 1px solid var(--accent-primary);
  color: var(--accent-primary);
}

/* Overlay placement on top of card media */
.card__media .badge {
```
*(Storefront tokens only — `--bg-primary` + `--accent-primary` (warm-plum), mirroring `.badge-featured`'s structure with a plum border instead of gold so it reads distinct; no `color-mix()` → no fallback concern. `.badge-unique` inherits `.card__media .badge`'s absolute placement (`:593`); the `!sold && !p.featured` render gate (§6.5a/§6.3d) guarantees it never co-occupies the corner with Sold or Featured. Full rationale + the optional badge-stack upgrade: DESIGN §D.4.)*

**Phase 9.3 — clear grid Sold state.** Sold pieces (`published && quantity===0`, WS2 sold policy) show a clear **"Sold"** state on the grid (the sold-policy wording — "Sold," not "Sold out"), never a purchasable affordance. Ties to the WS6 storefront buy-gate (`published && quantity > 0`). **Doc impact:** none.

---

## WS10 — GPT + docs parity (#222)

The Custom GPT ("The Sunkeeper") must be able to run the new **automatic store-wide sale** and handle a **shared-payment refund** exactly as `/admin` does — the parity rule holds for this build's new capabilities too (the GPT could be down; neither surface is second-class). This workstream is the GPT half only: it adds the `auto_apply` **schema param** on the coupon Action (the backend `handleCoupon` marker is WS4's job), folds the store-wide-sale set/end beat + the initiative nudge + the #228 shared-payment refund guidance into the instruction text, and restores the precise Coupon/Promotion Code/Discount vocabulary. **Sequenced after WS4** (needs the sale surface + `auto_apply` marker defined). The instruction file **ships verbatim** from the CURRENT/NEW blocks below — do not paraphrase; re-run `wc -c` < 8000 on the shipped `.txt` as the last step (static gate).

*Base files (latest shipped): `assets/docs/archive/v3_3/v3_3_0_GPT_INSTRUCTIONS_TRIMMED.txt` (`wc -c` = **7787 / 8000**, 213 headroom) + `v3_3_0_GPT_SCHEMA.txt` (no total cap; per-`summary`/`description` soft cap 300). Copy both to `assets/docs/archive/v3_5/` as `v3_5_0_GPT_INSTRUCTIONS_TRIMMED.txt` + `v3_5_0_GPT_SCHEMA.txt`, bump the schema `version: 3.3.0` → `version: 3.5.0` (`:5`), apply the deltas below, then paste both into Em's Custom GPT (Actions schema + Instructions). No Stripe API docs go into the GPT KNOWLEDGE — a Custom GPT can only call its declared Action endpoints; you widen capability by adding the param + instruction beat, never by documenting Stripe in KNOWLEDGE.*

*(Param name SETTLED: `auto_apply` matches across WS4 (§4.1/§4.6 `handleCoupon` reads `auto_apply` → writes `metadata.auto_apply='true'`) and WS10 (this schema param + the COUPONS beat). One name, verified consistent — no rename needed.)*
<!-- NEEDS-VERIFY: the auto-apply store-wide sale is PERCENT-only here (locked decision — on-site struck pricing needs a percent; a $-off store-wide sale stays a plain checkout code). `data-flow.md:146` reads "Percent and dollar both supported" for the sales surface generally — that's the coupon surface, not the auto_apply/struck layer. Reconcile against WS4 as authored before shipping. -->

**Phase 10.1 — GPT schema (`v3_5_0_GPT_SCHEMA.txt`): add the `auto_apply` param on `createCoupon`.** The GPT sets the automatic store-wide sale by passing `auto_apply:true` on `createCoupon` and ends it with the existing `deactivateCoupon` — no new op. Add the property to `createCoupon`'s `properties` (16-space indent, same as its siblings) and name it in the op `summary`.

**CURRENT (`createCoupon` summary, `:217`):**
```
      summary: Create a discount — a Stripe Coupon plus a shareable Promotion Code. Percent or amount off; optional product scope, minimum order amount, expiry, redemption cap. No buy-N/BOGO.
```
**NEW:**
```
      summary: Create a discount — a Stripe Coupon plus a shareable Promotion Code. Percent or amount off; optional product scope, minimum order amount, expiry, redemption cap, or auto_apply for the automatic store-wide sale. No buy-N/BOGO.
```

**CURRENT (last property of `createCoupon`, `:233`):**
```
                max_redemptions: { type: integer, description: Max total redemptions. Optional. }
```
**NEW (append the new property directly after it, same 16-space indent):**
```
                max_redemptions: { type: integer, description: Max total redemptions. Optional. }
                auto_apply: { type: boolean, description: "true = the automatic store-wide sale: the storefront shows struck prices and auto-applies this code at checkout (no code to type). Percent + store-wide only. End it via deactivateCoupon, same as any coupon." }
```
*(summary → **225 chars**, `auto_apply` description → **206 chars**, both under the per-`summary`/`description` 300 soft cap that the testing static gate asserts. The schema file has no total byte cap; only the instruction `.txt` does. `deactivateCoupon` is unchanged — it already ends any promotion code by `{code}`, which is how the GPT ends the store-wide sale, matching `data-flow.md:144`'s `coupon_deactivate` end-sale action.)*
**Doc impact:** `EVERLASTINGS_STORE.md` Key Architectural Decision #10 (the GPT action-set) gains "`createCoupon` `auto_apply` = the automatic store-wide sale (v3.5)."

**Phase 10.1b — GPT schema (`v3_5_0_GPT_SCHEMA.txt`): `editProduct` parity for take-down + scheduled-publish (schema-only, no instruction-`.txt` budget).** The `.txt` is near its cap, but the SCHEMA has no total-char cap — so both new parities go here as `editProduct` param annotations (no instruction-text cost).

*10.1b.a — annotate `available` (the v3.5 take-down→draft reality) + add `scheduled_publish_at`.* **CURRENT (`editProduct` properties, `v3_3_0_GPT_SCHEMA.txt:127` — anchor by CONTEXT, not the bare string):** the token `available: { type: boolean }` is **non-unique** — it appears at `:36`, `:91`, `:127`, `:403` (`:36`/`:403` are deeper-nested schemas; `:91` is `createProduct`; **`:127` is the `editProduct` target** — the `available` sitting between `product_type`/`quantity` and `featured`). Annotate ONLY the `editProduct` occurrence at `:127`. (Scoping the take-down→draft annotation to `editProduct` and NOT `createProduct` at `:91` is correct, not a gap: a created piece is a draft regardless of `available`.)
```
                available: { type: boolean }
```
**NEW (annotate `available`; add `scheduled_publish_at` — both are `editProduct` properties):**
```
                available: { type: boolean, description: "false takes the piece DOWN — it unpublishes to a hidden DRAFT (not 'sold'). To put a taken-down piece back UP, call publishProduct {id} (NOT available:true — on a draft that only flips the flag, it stays hidden). true on an in-stock live piece is a normal availability toggle." }
                scheduled_publish_at: { type: string, description: "ISO 8601 timestamp to auto-publish a ready draft at a future date (date-granular, via the daily cron); null clears it. Parity with the panel's Schedule control (PUT /api/products accepts it). Em says 'schedule for Friday morning' → parse to local ISO, ECHO the resolved date/time back plainly for confirmation before writing ('Scheduled for Fri Jun 26, morning ~9am ET — set it?'); NEVER schedule a piece that isn't publish-ready (call getProduct first, verify story_card/features/materials/care/shipping/dimensions/weight/quantity/≥5 gallery + alt); if missing, name the fields and offer to fix first. Date-granular by design — sub-day precision is not guaranteed." }
```
*(Both parities land in the schema so **no instruction-`.txt` byte is spent** — the `.txt` stays 7988/8000. The `available` annotation closes the "GPT can't re-list a taken-down piece" journey gap [breadth owner-journey #1]; `scheduled_publish_at` gives the GPT the panel's schedule capability, honoring the parity rule. `PUT /api/products` already accepts both, WS2 §2.2/§2.4.)*
**Doc impact:** `EVERLASTINGS_STORE.md` KAD #10 — `editProduct` gains `scheduled_publish_at` + the take-down→draft / re-list-via-`publishProduct` semantics, both surfaces.

**Phase 10.1c — GPT schema (`v3_5_0_GPT_SCHEMA.txt`): flag the publish-required detail fields so the GPT collects them like the dashboard (schema-only, no instruction-`.txt` budget — folds Sean's v3.6.7 decision, §2.7).** WS2 §2.7's strict publish gate now stands for **every** piece (no grandfather/backfill — empty catalog), so a maker driving via the GPT must gather the same full set the dashboard's form does, or `publishProduct` 400s. The schema **already exposes** all these fields on `createProduct` + `editProduct` (`dimensions, weight, materials, care_instructions, shipping_details, quantity`, plus `images[].alt`), and §10.1b.a's `scheduled_publish_at` description already lists them as a publish-readiness check — but they carry **no description**, and `createProduct`'s `required` array + instruction line 4 frame them as *optional*. Annotate them so the GPT gathers them up front. **Create stays lenient** (a partial draft still persists — §2.7 / §10.2b); this only guides the *normal* create→publish flow so it doesn't dead-end at a publish-400.

*10.1c.a — annotate the seven publish-required detail fields on BOTH `createProduct` and `editProduct`.* Set/extend each field's `description` with **"Required to publish."**. **Pattern (e.g. `createProduct.materials`, currently `:30` `materials: { type: array, items: { type: string } }`):**
```
                materials: { type: array, items: { type: string }, description: "Required to publish." }
```
Repeat on `dimensions`, `weight`, `features`, `care_instructions`, `shipping_details`, `quantity` (and their `editProduct` twins). **`features` is included deliberately (integration breadth): it is publish-required (`validatePublishRules` REQUIRED_LIST, §2.7) but is NOT in `createProduct.required` (schema `:19` = `[title, headline, story_card, description, price, product_type, slug, images, thumbnail]`), so — like its list-field siblings materials/care/shipping — it needs the `Required to publish.` flag; an earlier draft miscounted it as already-required-on-create.** The genuinely already-required-on-create fields are `title/headline/story_card/description/price/product_type/slug/thumbnail`+`images` (they ARE in `createProduct.required`). `alt` is publish-required but stays **schema-optional** — it can't be `required`-on-create without breaking lenient partial-draft create, so it rides instruction line 10 + the per-image `images[].alt` publish gate, not a schema flag (an acknowledged asymmetry: the seven top-level detail fields get the flag; `alt` rides the instruction + server gate). Schema descriptions have **no total cap** → **zero instruction-`.txt` cost** (stays 7988/8000), mirroring §10.1b's schema-only pattern.

**Doc impact:** STORE_ADMINISTRATION.md "Add a new piece" + the `PRODUCT-REFERENCE` knowledge file document the **required-to-publish** set (both surfaces) — those detail fields move out of "optional" framing; refreshed in the §10.6 as-built docs phase.

**Phase 10.2 — GPT instructions (`v3_5_0_GPT_INSTRUCTIONS_TRIMMED.txt`): store-wide-sale parity + restored vocabulary (the COUPONS beat, `:36`).** Fold in (a) the precise Stripe vocabulary — a sale = a **Coupon** (the rule) + a **Promotion Code** (the shareable code) = the **Discount**; (b) the automatic store-wide sale set/end path via `createCoupon` + `auto_apply:true` / `deactivateCoupon {code}`, "same as the panel"; (c) the one-discount-per-order Stripe reality stated plainly (stop the apologizing). Trim the illustrative date example + the "never a Unix timestamp" tail (the schema's `expires_date` description already carries that) to hold the budget.

**CURRENT (`:36`):**
```
COUPONS: createCoupon = percent OR amount-off in cents (dollars→cents); optional code/scope/min/expiry/cap. A product-scoped coupon needs a PUBLISHED piece (a draft has no Stripe id) — else store-wide. NEVER promise BOGO / "buy N". CONFIRM FIRST: read the terms back plainly ("20% off store-wide, through Sun Jun 21 — create it?"); never invent an expiry; pass her end date as expires_date (YYYY-MM-DD), never a Unix timestamp. listCoupons gives expires_display (a plain date) + min_display/amount_display (plain dollars) + each sale's scope — relay those, never decode a raw cents/timestamp. deactivateCoupon {code} ends one now. A temp sale = a coupon, not a price cut (keeps the list price).
```
**NEW:**
```
COUPONS (a sale = a Stripe Coupon + Promotion Code = the Discount): createCoupon = percent OR amount-off in cents (dollars→cents); optional code/scope/min/expiry/cap. Product-scoped needs a PUBLISHED piece (a draft has no Stripe id) — else store-wide. NEVER promise BOGO / "buy N". CONFIRM FIRST: read terms back before creating; never invent an expiry; pass her end date as expires_date (YYYY-MM-DD). AUTOMATIC STORE-WIDE SALE = a store-wide percent createCoupon + auto_apply:true — the site shows struck prices + auto-applies at checkout (no code typed); end via deactivateCoupon {code}, same as the panel. Stripe allows ONE discount/order — a shopper swaps the sale code for a personal one; don't apologize. listCoupons gives expires_display + min_display/amount_display (dollars) + each sale's scope — relay those, never decode raw cents/timestamps. deactivateCoupon {code} ends one now. A temp sale = a coupon, not a price cut (keeps the list price).
```
*(line delta **+263 B** → running `wc -c` = 7787 + 263 = **8050**; the 10.3/10.4 trims bring it back under — all instruction edits ship as one set, recount once at 10.5. The one-discount line is the "stop apologizing" fix. `deactivateCoupon {code} ends one now` stays as the general end-any-coupon action; the store-wide beat's "end via deactivateCoupon" is the sale-specific echo.)*
**Doc impact:** `EVERLASTINGS_STORE.md` coupon glossary + STORE_ADMINISTRATION restore the Coupon/Promotion Code/Discount terms; note the GPT can now run/end the automatic store-wide sale.

**Phase 10.2b — GPT instructions: "create is lenient; the gate is PUBLISH" (the PUBLISHING beat `:34`, funded by a redundant `:13` trim).** WS2 §2.7 relaxes `createProduct` to a title+price minimum so partial drafts persist, with the full required-field gate moved to publish — but the GPT is never told, so a lenient 200 on a partial create could read as "it accepted everything." Add a short beat to the PUBLISHING line (`:34`) — its natural home, since that line already teaches the publish-400 gate — telling the GPT create is lenient and the field gate is at publish; it still assembles the whole piece (line 4 lists the fields), it just isn't surprised by a partial-create 200. Self-funded: drop `:34`'s now-niche "Never make a no-op edit to "regenerate" a link" clause (the preceding "never build a URL" already covers link-fabrication) and `:13`'s redundant "no need to read fields back." tail (the reworked `:15` in 10.3 now carries "don't read fields back").

**CURRENT (`:34`):**
```
PUBLISHING: "publish" / "make it live" = publishProduct {id} — for a new piece this creates the Stripe listing + makes it buyable, and the old preview link then stops (expected). A publish 400 ("Missing required fields: story_card" / "Minimum 5 gallery images") = say plainly what to add (story_card = the story, headline = the tagline). Lost preview? getProduct + hand back its preview_url EXACTLY (never build a URL); none returned = it's fully live, give the plain product page link. Never make a no-op edit to "regenerate" a link.
```
**NEW (insert the lenient clause after `PUBLISHING:`, drop the trailing no-op clause):**
```
PUBLISHING: createProduct is lenient (title+price min saves a partial) — the field gate is HERE. "publish" / "make it live" = publishProduct {id} — for a new piece this creates the Stripe listing + makes it buyable, and the old preview link then stops (expected). A publish 400 ("Missing required fields: story_card" / "Minimum 5 gallery images") = say plainly what to add (story_card = the story, headline = the tagline). Lost preview? getProduct + hand back its preview_url EXACTLY (never build a URL); none returned = it's fully live, give the plain product page link.
```

**CURRENT (`:13`):**
```
PREVIEW draft returned, say "Preview just like customers see it <preview_url>. Tap PUBLISH or tell me to." no need to read fields back.
```
**NEW (drop the redundant tail — now carried by the reworked `:15`):**
```
PREVIEW draft returned, say "Preview just like customers see it <preview_url>. Tap PUBLISH or tell me to."
```
*(deltas: `:34` **+39** [insert +87, drop the no-op clause −48], `:13` **−29** → phase net **+10 B**. Measured byte-exact against the base file; recount at 10.5.)*
**Doc impact:** the GPT create/publish walkthrough (STORE_ADMINISTRATION / GPT_SETUP) notes create is lenient (title+price min) and the required-field gate is at publish.

**Phase 10.3 — GPT instructions: the initiative nudge (`:1`), funded by two now-redundant trims (`:15`, `:30`).** Add the standing posture — do the reversible things without asking, confirm only the irreversible — to the intro, replacing the vague "Action description show mechanics to rely on." tail. Fund it by tightening two beats the nudge makes redundant: `:15` (a draft is reversible, so "drafted fields get CONFIRMED before saving" contradicts the nudge — the PREVIEW is the review) and `:30` (its two-speed reminder overlaps `:27`).

**CURRENT (`:1`):**
```
You're 'The Sunkeeper', warm, capable Everlastings by Emaline store studio assistant. Help artist Em add/edit product, run sales, fulfill orders, in plain language. Never expose API keys, URLs, jargon unless asked. Field definitions, how to write each, is your PRODUCT-REFERENCE knowledge file. Use brand VOICE-GUIDE. Action description show mechanics to rely on.
```
**NEW:**
```
You're 'The Sunkeeper', warm, capable Everlastings by Emaline store studio assistant. Help artist Em add/edit product, run sales, fulfill orders, in plain language. Never expose API keys, URLs, jargon unless asked. Field definitions, how to write each, is your PRODUCT-REFERENCE knowledge file. Use brand VOICE-GUIDE. DO reversible things without asking; confirm only irreversible ones.
```

**CURRENT (`:15`):**
```
PREVIEW is the REVIEW. Drafted fields get CONFIRMED before saving unless directed to EXPEDITE straight to preview.
```
**NEW:**
```
PREVIEW is the REVIEW — a draft is reversible; don't read fields back before saving unless she says.
```

**CURRENT (`:30`):**
```
HEADS-UP: a live price/availability/quantity change leaves earlier staged copy edits alone; if getProduct still shows a `draft`, tell her to preview+publish or discard them.
```
**NEW:**
```
HEADS-UP: a live price/qty/available change leaves staged copy edits pending — a lingering `draft` means preview+publish or discard.
```
*(deltas: `:1` **+23**, `:15` **−12**, `:30` **−39** → phase net **−28 B**. The per-action CONFIRM FIRST beats (mark-shipped `:38`, refund `:40`, coupon `:36`) already name the irreversible ones, so the nudge drops examples and stays a one-line principle.)*
**Doc impact:** none in STORE; the initiative posture is a GPT-behavior beat (test-script parity item, not a doc-model change).

**Phase 10.4 — GPT instructions: shared-payment refund guidance, #228 GPT half (`:40`).** The refund code is sound (WS3 preserves it) — this is GPT guidance only. On a multi-item shared payment, when Em names ONE piece: identify that named line, default the amount to that line, relist ONLY the named piece, confirm clearly, and never silently swap a sibling's piece or amount. Add the named-piece clause; condense the relist mechanics to hold budget (the field paths stay verbatim — they're load-bearing).

**CURRENT (`:40`):**
```
REFUNDS: find the order first (listOrders q=<buyer email or id> — reaches past/shipped orders). A Stripe refund is an AMOUNT against the whole purchase, and one cart can be several orders on one payment. refundOrder {id} refunds THIS order's amount + relists THIS piece. CONFIRM FIRST: read back piece(s) + amount + buyer ("Refund <buyer> $X for <product>? Can't be undone."). Several pieces, one purchase: confirm which came back, pass relist_product_ids:[their ids] + amount_cents=summed cents. Goodwill/partial, nothing back: amount_cents + relist_product_ids:[] (refunding the FULL CART total as goodwill still flips status — a smaller goodwill amount doesn't — tell her). It returns `relist`, one entry r per returned piece; a refund never relists itself, so for EACH r ALWAYS offer to restore it — down (r.available false or r.archived) "Put it back up for sale?", else "Add 1 to its quantity?". Yes = editProduct {id:r.product_id, available:true, quantity:r.quantity+1}; if r.archived, ALSO unarchiveProduct {id:r.product_id}. Revenue/payouts live in Stripe.
```
**NEW:**
```
REFUNDS: find the order (listOrders q=<buyer email or id> — reaches past/shipped orders). A Stripe refund is an AMOUNT against the whole purchase; one cart can be several orders on one payment. refundOrder {id} refunds THIS order's amount + relists THIS piece. Names ONE piece on a shared multi-item payment? THAT line is the default — its amount, relist ONLY it; never silently swap a sibling's piece/amount. CONFIRM FIRST: read back piece(s) + amount + buyer ("Refund <buyer> $X for <product>? Can't be undone."). Several pieces: confirm which came back, pass relist_product_ids:[ids] + amount_cents=summed cents. Goodwill/partial, nothing back: amount_cents + relist_product_ids:[] (the FULL CART total as goodwill still flips status, a smaller amount doesn't — tell her). Returns `relist`, one r per returned piece; never auto-relists, so offer to restore EACH: editProduct {id:r.product_id, available:true, quantity:r.quantity+1}; if r.archived, ALSO unarchiveProduct {id:r.product_id}. Revenue/payouts live in Stripe.
```
*(line delta **−44 B** — the new named-piece default clause is more than offset by condensing the relist prose; `editProduct`/`unarchiveProduct` field paths ship byte-identical.)*
**Doc impact:** `EVERLASTINGS_STORE.md` Stripe-sync note + STORE_ADMINISTRATION refund section add "name one piece on a shared payment → its line is the default; never swap piece/amount silently."

**Phase 10.5 — recount + ship (static gate).** Apply 10.2–10.4 as one edit set, then re-run `wc -c` on the shipped `v3_5_0_GPT_INSTRUCTIONS_TRIMMED.txt`.

*Running budget (measured against the byte-exact NEW blocks above):*
- base `v3_3_0_GPT_INSTRUCTIONS_TRIMMED.txt` = **7787**
- 10.2 (`:36`) **+263** · 10.2b (`:34 +39`, `:13 −29` = **+10**) · 10.3 (`:1 +23`, `:15 −12`, `:30 −39` = **−28**) · 10.4 (`:40`) **−44**
- **net +201 → projected `wc -c` = 7988 / 8000 (12 headroom).**

*(Over-cap = the GPT silently truncates its own instructions and the gate fails; the projected 7988 is deterministic if the NEW blocks ship byte-for-byte, but the shipped `.txt` must still be re-counted — orchestrator-owned, never delegated. Then the one human touchpoint: re-paste schema + instructions into Em's ChatGPT and spot-check the sale set/end + a shared-payment refund — the surface curl can't drive.)*

**Phase 10.6 — docs (as-built, after the build — a fresh agent, per the As-built section; not mid-build).** Apply the `Doc impact:` annotations above into `EVERLASTINGS_STORE.md` (KAD #10 action-set gains `auto_apply`; the coupon glossary restores Coupon/Promotion Code/Discount; the Stripe-sync note gains the shared-payment named-piece default), then refresh `STORE_ADMINISTRATION.md` (run/end the automatic store-wide sale by chat; the refund named-piece default) + `GPT_SETUP.md` (the shipped v3.5 instruction/schema text) + the GPT behavior test script (parity items: set the store-wide sale via `createCoupon auto_apply`, end it via `deactivateCoupon`; refund one named piece on a shared payment without swapping). Code is the tiebreaker where doc and behavior disagree (cite `file:line`).

**DEV_RULES note (for the docs phase — do NOT edit DEV_RULES in this workstream).** Two additions surfaced by this build, to be folded into `.agent/DEV_RULES.md` in the as-built/docs pass: (1) the **admin-quality rule** — a management surface (portal or GPT) is held to the same built/tested/feedback'd bar as customer-facing work; (2) **"a UI that hides or disables an action owes you the reason"** — a hidden/disabled control must show and state why (the portal's "nothing hides without explaining" thesis, promoted to a cross-project rule).

---

## Verification (end-to-end, dev preview — full plan in `v3_6_7_ADDENDUM_TESTING.md`)

Per-surface + backend E2E on seeded **test** products (production-grade placeholders — real content is never a build/test gate): store-wide sale live/struck/at-checkout + removable keyword; refund partial + relist (preserved behavior); media modal roles/reorder/persist; product-page fields render; series filter matches; carousel rows decoupled; webhook even-split correct per-item amounts; cart-hold gone; sold-policy transitions (available-off→draft, qty0→sold, sold persists until archive); seen/unseen clears + not-on-Sold-tab; publish + preview gates; scheduled publish flips; activity-log rows written; buy-on-tile (if built). Plus the **static gate** (tsc/CJS clean · function count unchanged · no new cron · `node --check` · valid `vercel.json` · GPT `.txt` `wc -c` < 8000) and the **GPT-parity spot-check** (the one human touchpoint, in Em's ChatGPT).

## As-built doc-sync — LINE-BY-LINE (the final phase; a fresh agent; NEVER mid-build)

When the gate clears and execution completes, a **fresh agent** (not the tired tail of the build session) brings `EVERLASTINGS_STORE.md` current: (1) read STORE **end-to-end, linearly, like a human** first so it coheres and contradictions surface; (2) walk the build-adjusted IMPLEMENT **line by line** as the change-source (with the `BUILD_REPORT` for build-time deltas) — a memory summary is what let details fall through the cracks last cycle and compound; (3) where the IMPLEMENT/report and the doc disagree on a **behavior, the actual code is the tiebreaker** (cite `file:line`). Each phase below carries a one-line **`Doc impact:`** annotation so the as-built is *apply the annotations* + the coherence read, not a re-derive. Then refresh `STORE_ADMINISTRATION.md` (owner runbook) + `README.md`. Two reconciler landmines: the STORE Status/Version header drifts a release behind (verify vs the newest `*_BUILD_REPORT.md` first); stale `file:line` anchors survive code growth (re-open before trusting).

## Cross-references

Architecture/glossary/schema → `EVERLASTINGS_STORE.md` · design intent + contract → `design-handoff/brief.md` + `data-flow.md` + `out/INTEGRATION.md` + `out/PRODUCT_LIFECYCLE.md` · the finished design markup → `design-handoff/out/` · backlog → `v3_5_0_ROADMAP.md` · branching/versioning/gap-gate → `.agent/DEV_RULES.md`.
