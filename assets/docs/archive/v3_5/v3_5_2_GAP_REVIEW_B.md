# v3.5.2 — Gap Review B (fidelity) · ROUND 2 (convergence)

**Angle B — fidelity (repo + the three docs).** Convergence pass: byte-verify the round-1 + breadth FOLD DELTAS against the working tree, confirm the shared-file edit-coordination still holds, flag only NEW fidelity gaps. Effort: maximum. Reviewer changes nothing.

**Base verified against:** `dev` working tree today. Every named fold-delta anchor below was opened in the real file. Ledger 1–30 respected (no re-raise of settled truths).

---

## Verified clean (the fold deltas the task named — all byte-match the tree)

- **WS4 §4.7 `?code=` reader (checkout.js).** `checkout.js:95-96` (4.4.a total anchor), `:106` `wirePromo(checkout);` (4.4.b/4.7.a anchor), and `:160-167` (the `wirePromo` tail, 4.4.c anchor) all byte-match. The `?code=` reader's mutually-exclusive `if (…get('code')) applyShareLinkCode(checkout); else autoApplyStoreWideSale(checkout);` **applies cleanly against the Phase-4.4 output** — 4.7's CURRENT honestly quotes the post-4.4.b/4.4.c intermediate state (not the raw tree), and the append chain (wirePromo → autoApplyStoreWideSale → applyShareLinkCode) is well-ordered. `getCartTotal()` (used by 4.4.a's struck total) is already in scope (`checkout.js:141`), and `window.__checkout` is still stashed at `:70` for the #219 probe.
- **Merged `product-feed.ts`.** CURRENT anchors byte-match: imports `:1-7`, `FeedRow` ends `:16`, `GET` head `:18-19`. The merge is coherent — WS2 §2.6 declares the **single** `feedAdmin` service-role client + `isTest` import + `publishDueScheduled` and does NOT touch `GET`; WS7 §7.3 reuses `feedAdmin` (no second client), adds `stripe`/`sendEmail` imports + `isCronRequest` + `reconcileOrders`, and owns the ONE `GET` wrapper running **both** jobs inside one `isCronRequest(req)` gate (publish first). All new imports resolve: `isTest`+`env` (`_lib/env.ts:2,6`), `stripe` (`_lib/stripe.ts:9`), `sendEmail` (`_emails/index.ts:201`). `req` param name is consistent throughout.
- **WS8 §8.3 central signal (out/portal.js).** `out/portal.js:162-164` byte-matches; `P.refreshOrdersSignal` inserts cleanly between `mountShell`'s closing `};` (`:163`) and the IIFE `})();` (`:164`), in `P` scope. The `.rail__item[href="orders.html"]` / `.tabbar__item[href="orders.html"]` selectors and the `.badge` child it drives all match the real `mountShell` markup (`:147`,`:154`).
- **WS6 §6.5a–d storefront (shop.js / product.js).** `shop.js:126-144` (6.5a block), `product.js:382` (6.5b buy-gate), `product.js:353` (6.5c JSON-LD availability) byte-match; `product.js:~558` (6.5d related-card badge) is at the real line **561** (+3 line drift, quoted text exact — harmless). WS4's sticky-card struck edit (`4.5.d`, `product.js:369-370`) and WS6's buy-gate (`6.5b`, `:382`) land on **different lines** — no collision there.
- **WS10 §10.1b GPT schema.** `v3_3_0_GPT_SCHEMA.txt:127` `available: { type: boolean }` (10.1b.a anchor), `:217` createCoupon summary (10.1), `:233` `max_redemptions` (10.1) all byte-match at the stated 16-space indent; `scheduled_publish_at` inserts cleanly between `available` (127) and `featured` (128). `PUT /api/products` accepts both params (WS2 §2.2/§2.4), so the schema exposure is backend-consistent.
- **Backend shared-file coordination (ledger 25-27) holds.** products.ts `:70-71` (WS4 active_sale before / WS8 activity after — bracket the coupon branch), `:735` (WS4 metadata stamp), `:745-746` (WS4 supersede + WS8 sale.create log) all byte-match; orders.ts `:104-107` (WS8 PATCH actor), `:111-115` (WS3 409 guard), `:256-261` (WS8 POST actor + `_action` fork) all byte-match. The stacked-edit re-anchor notes are correct and the two `actor` consts live in distinct function scopes (PATCH vs POST) — no double-declare.

---

## Findings (ranked by likelihood of derailing the build)

### 1 — WS4 struck-price edits collide with WS6 block-rewrites on `shop.js` + `homepage.js`; the coordination section wrongly calls them "non-overlapping." (load-bearing)

Two storefront files are edited by **both** WS4 (single-line struck-price) and WS6 (whole-block rewrite), on the **same line/region**, and the docs give **no apply-order and no merged NEW** — so the headline struck-price feature silently reverts to plain price wherever WS6's block lands last.

- **`shop.js:139` (the shop-grid card price).**
  - `4.5.b` NEW keeps the `p.available` class and swaps the value: `…${p.available ? priceHTML(p.price, window._activeSale) : formatPrice(p.price)}…`
  - `6.5a` NEW rewrites the whole `126-144` block, computes `sold`, and re-emits line 139 as `…class="card__price${sold ? ' text-muted' : ''}">${formatPrice(p.price)}…` — **plain `formatPrice`, struck price dropped.**
  - Neither order lets both edits apply by their quoted anchors: after `6.5a` the class condition is `sold` (so `4.5.b`'s `${p.available ? '' : ' text-muted'}` CURRENT no longer matches); after `4.5.b` the value is `priceHTML` (so `6.5a`'s CURRENT no longer matches). They **must be merged by hand.**
  - Correct merged line: `<p class="card__price${sold ? ' text-muted' : ''}">${sold ? formatPrice(p.price) : priceHTML(p.price, window._activeSale)}</p>`
- **`homepage.js:61` (the featured-carousel tile price).** `4.5.f` converts line 61 to `priceHTML`; `6.3d` rewrites `populateFeatured` (`41-67`, verified byte-match) into a `tile` template whose price line is plain `${formatPrice(p.price)}`. Same collision — WS6-last drops the struck price; WS4-last breaks `6.3d`'s block CURRENT. (Here `6.3d`'s `tile` template does retain the exact original price string, so WS6-then-WS4 *happens* to still text-match — but that's luck, not a stated contract.)
- **Why this matters:** DESIGN addendum §D.1 names shop grid + homepage carousel as struck-price surfaces. This bug silently drops 2 of the 5 struck surfaces — no error, no crash, just no sale display where a shopper most expects it.
- **The claim to fix:** the IMPLEMENT's *Shared-file edit coordination* section says "Everywhere else each file has one owner or **non-overlapping regions**." That is **false for `shop.js` and `homepage.js`** (and WS9 §9.1/§9.3 will touch the same `shop.js` card region again). These belong in the coordination list with an explicit apply-order + a single merged NEW per line, exactly like products.ts gets (WS2→WS4→WS8).
- **Concrete fix:** add a `shop.js` / `homepage.js` entry to the coordination section: apply order **WS6 → WS4**, and replace `4.5.b`/`4.5.f` + `6.5a`/`6.3d` with one merged NEW block per file that carries *both* the `sold` logic and the `sold ? formatPrice : priceHTML` value.

### 2 — GPT-schema `available: { type: boolean }` is a NON-unique anchor (4 occurrences); the doc's "quoted text is the anchor" convention breaks here. (low, easily mitigated)

`grep` finds `available: { type: boolean }` at **lines 36, 91, 127, 403** of `v3_3_0_GPT_SCHEMA.txt` (36/403 are deeper-indented nested schemas; 91 is 16-space — likely `createProduct`; 127 is the `editProduct` target). WS10 §10.1b.a quotes only the bare string and relies on the `:127` line hint. A builder following the doc's own rule ("line numbers are hints; the **quoted CURRENT text is the anchor**") could annotate the wrong one, since the text matches four places.
- **Concrete fix:** in §10.1b.a, note the string is non-unique and make the anchor the `available` that sits **between `product_type`/`quantity` and `featured` in `editProduct`** (line 127), not the bare text. (Scoping the take-down annotation to `editProduct` only — not `createProduct` at :91 — is a correct decision, not a gap: a created piece is a draft regardless of `available`.)

### 3 — Remaining NEEDS-VERIFY flags: each is either resolvable from the repo or a genuine build/runtime item (no doc gap)

- **`SUPABASE_SECRET_KEY` reachable by `product-feed` (WS7 §7.3 flag) — RESOLVED toward "available."** The key is already consumed project-wide by `api/webhook.ts:9`, `api/_lib/adminAuth.ts:29`, and `api/_lib/stripeSync.ts:7`. On this solo-owner Vercel project envs are project-wide (not function-scoped) unless deliberately scoped, so the shared `feedAdmin` client will resolve it. Genuine one-time deploy confirm remains, but the repo evidence points to yes.
- **PostgREST `.or('is_published.eq.false,draft.not.is.null')` (WS2 §2.6 flag) — genuine runtime probe.** Cannot be byte-resolved from the repo; the doc already carries the correct fallback (scope the scan to `.eq('is_published', false)`, which covers the primary "schedule a new piece live" case). Keep the flag as a build-time probe, not a doc gap.
- **`CRON_SECRET` (prod) + `PRODUCT_API_KEY` (prod) — genuine deploy-env items.** `isCronRequest` safely no-ops until `CRON_SECRET` is set; the scheduled-publish self-call 401s harmlessly (logged) if `PRODUCT_API_KEY` is absent in prod. Correctly flagged as ops steps.
- **#219 Stripe `applyPromotionCode` at init + second-code-replaces-not-stacks — genuine platform probe.** Runtime-only (the Basil bundle diverges from docs); the doc gates on it with documented fallbacks. Not resolvable from the tree.

---

## If you fix one thing

**Fold `shop.js` and `homepage.js` into the Shared-file edit-coordination list with an explicit WS6→WS4 apply-order and a single merged NEW per price line (Finding 1).** It's the one place two independently-authored workstreams overwrite the same lines with conflicting NEW blocks, the anchors provably can't both apply, and the failure is silent — the struck-price display (a headline WS4 deliverable) just vanishes from the shop grid and homepage carousel. Everything else the task named byte-verified clean.

---

## One-line verdict

**NEEDS ANOTHER PASS (NARROW)** — one bounded storefront edit-coordination gap (shop.js/homepage.js WS4×WS6 overlap) plus a non-unique GPT-schema anchor; every named fold delta (checkout.js `?code=`, merged product-feed.ts, out/portal.js §8.3, product.js §6.5, GPT-schema §10.1b, products.ts/orders.ts stacked edits) byte-matches the tree.
