# v3.5.3 — Gap Review B (fidelity / repo) — round 3

Angle B, scoped to the round-2 folds + the standing byte-anchors. Effort: maximum. I opened every file the round-3 priority names, byte-checked each CURRENT block against the working tree, and traced each NEW block's references to things that exist. Findings only — nothing changed except this file. Flag-don't-assert; where I could see the code, the code is the evidence.

---

## Part 1 — Ranked gap list (most-likely-to-derail first)

### B-1 (LOAD-BEARING) — §6.5b's `!previewToken` guard references a variable that is out of scope in `populateStickyCard` → a ReferenceError that breaks the whole product page

- **Location:** IMPLEMENT §6.5b (`v3_5_3_IMPLEMENT.md:2406-2414`) + its doc-impact note (`:2436`). The NEW block replaces `assets/js/product.js:382` (`if (p.available === false) {`) with:
  ```js
  const sold = !previewToken && (p.quantity != null ? p.quantity <= 0 : (p.available === false));
  if (sold) {
  ```
- **The drift:** the doc-impact note asserts *"`product.js` has `previewToken` in scope from init."* That is **wrong**. In the tree, `previewToken` is declared `const previewToken = params.get('preview');` at **`product.js:19`, inside the `document.addEventListener('DOMContentLoaded', async () => { … })` handler** (grep-confirmed: the only `previewToken` declaration; its other uses at `:43`/`:46` are all inside that same arrow function). `populateStickyCard` is defined at **`product.js:365` at module top level** — a sibling of the init arrow function, not nested in it. It is *called* from inside the init fn (`:34`) but its lexical closure is the module scope, which does **not** contain `previewToken`.
- **Consequence (verifiable from the code, not runtime-guessed):** reading an undeclared identifier throws `ReferenceError: previewToken is not defined` regardless of strict mode. The throw fires the moment `populateStickyCard` runs — which is on **every** product-page load, not just `?preview=`. Because `populateStickyCard(product)` is called at `:34` ahead of `populateHero`/`populateGallery`/`populateStory`/`wireCartButtons`/… , the uncaught throw aborts the rest of the init chain: no hero, no gallery, no wired buy buttons, no price. A headline feature (the whole PDP) silently breaks with only a console error. (Secondary: the sold-state reveal/disable never runs either, so a sold piece would look buyable — the server 4th-enforcer at `checkout.ts:79/:205` still blocks the actual purchase, so it fails safe at checkout, but the page is broken regardless.)
- **Why round-2 missed it:** this is one of the "8 small" round-2 folds ("the `?preview=` guard into code"). It was folded but its scope claim was never verified — exactly the non-monotonic "a fold introduces the next bug" case.
- **Concrete fix (scoped, ~1 line):** re-derive the token inside `populateStickyCard` so the block is self-contained — `const previewToken = new URLSearchParams(location.search).get('preview');` at the top of the function (mirrors how §4.5.d already reads `window._activeSale` locally in the same function). Alternatively pass it as a param: change the definition to `populateStickyCard(p, previewToken)` and the call at `:34` to `populateStickyCard(product, previewToken)`. Then correct the doc-impact note — `previewToken` is init-scoped, not module/global.

### B-2 (MINOR) — two WS4 sub-phases anchor the SAME `main.js:269-270` lines; each shows only its own insert

- **Location:** IMPLEMENT §4.3.b (`:1266-1276`) and §4.7.0 (`:1598-1611`). Both quote the identical CURRENT (`main.js:269-270`):
  ```js
  document.addEventListener('DOMContentLoaded', () => {
    initConfig();
  ```
  and both insert a single line **after `initConfig();`** — §4.3.b inserts `getActiveSale().then(mountSaleChrome);`, §4.7.0 inserts the `try { … sessionStorage.setItem('everlastings.shareCode', …) } catch {}` capture. (§4.3.c additionally places `mountSaleChrome` "just above line 269" — so three WS4 phases key off line 269.)
- **Assessment:** NOT a hard collision — both are additive inserts after the same line and are order-independent, so applying both yields a correct merged block either way. The risk is procedural: a builder applying §4.3.b first will find §4.7.0's 2-line CURRENT no longer describes the post-4.3.b tree, and each NEW omits the other's line. The Shared-file coordination section (`:47`) lists `main.js` in WS4 as "distinct functions" and only calls out §4.7 capture vs. the `checkout.js` reader — it does **not** note that §4.3.b and §4.7.0 share the DOMContentLoaded anchor.
- **Concrete fix:** add one intra-WS4 note (in the coordination section or at §4.7.0) that §4.3.b + §4.7.0 both insert after `main.js` `initConfig();` and must be merged (both inserts kept), not treated as mutually-exclusive CURRENT states.

### B-3 (MINOR / asymmetry note) — §4.5.d's struck sticky-price path does NOT carry the `!previewToken` preview guard that §6.5b applies

- **Location:** IMPLEMENT §4.5.d (`:1491-1506`) vs §6.5b (`:2406-2414`), both editing `populateStickyCard`.
- **Observation:** §6.5b guards the Sold/buy-disable path with `!previewToken`; §4.5.d's struck-price gate is `!sold` only (no preview guard). So on a `?preview=` load of a *published* piece with a live % sale, the sticky card would render the struck sale price. Low impact (an in-review published piece showing its real live sale price is arguably correct), but the two edits to the same function treat "preview" inconsistently. If B-1 is fixed by re-deriving `previewToken` at function scope, §4.5.d can trivially reuse it if a plain-price-under-preview is desired. Flagging for a decision, not asserting a bug.

### Standing NEEDS-VERIFY flags — classification (per the Angle-B brief)

- **`?status=needs_shipping` (WS8 §8.3):** RESOLVED from repo — it is an **existing** `orders.ts` GET filter (`api/orders.ts:71-72`, `query.is('shipped_at', null).eq('status','completed')`). The signal reads a real branch.
- **PostgREST `.or(...)` form:** RESOLVED from repo — `api/orders.ts:92` already ships `query.or(orFilters.join(','))` and runs today; not a novel construct.
- **`unseen_count` (WS8 §8.3 reads `body.unseen_count`):** intra-WS8 dependency — added by §8.2a(b), which rewrites the GET return (`orders.ts:101` today `return jsonResponse(request, { orders: data ?? [] })` → `{ orders, unseen_count, last_viewed }`). Consistent; not a gap.
- **`CRON_SECRET` / `PRODUCT_API_KEY` / `SUPABASE_SECRET_KEY`:** genuine **build-time/runtime deploy-env** items (not repo-resolvable) — correctly enumerated as preconditions in the TESTING addendum (`:14`, plus the `SUPABASE_SECRET_KEY` NEEDS-VERIFY). Leave as runtime gates.
- **#219 Stripe `applyPromotionCode()`-at-init probe:** genuine **build-time live probe** on the dev preview (TESTING item 13, gating) — not repo-resolvable by design.

---

## Part 2 — What byte-checked CLEAN (the round-3 priority anchors)

- **§6.5a merged block vs `shop.js:126-144`** — CURRENT byte-matches the tree exactly. NEW merged block is well-formed: one `sold` computed, drives `data-available`, Sold badge, image dim, `text-muted`, struck price, and `badge badge-unique` — WS6+WS4+WS9 folded correctly; §4.5.b/§9.2 are pointers only. ✓
- **§6.3d `tile` closure vs `homepage.js:41-67`** — CURRENT byte-matches. NEW keeps tile markup identical, adds `sold` + unique badge + struck price, emits per-row. §4.5.e's `await getActiveSale();` anchor (`homepage.js:5-7`) also byte-matches. ✓
- **§4.5.d vs `product.js:369-370` AND §6.5b vs `product.js:382`** — both CURRENT blocks byte-match the tree. **The two `const sold` do NOT collide:** §4.5.d's `sold` is block-scoped **inside `if (priceEl) { … }`**; §6.5b's `sold` is at the **function-body level of `populateStickyCard`** (declared at what is line 382 today, after the `if (priceEl)` block closes). Different lexical scopes → the inner one legally shadows within its block; no redeclaration/`SyntaxError`. The doc's "sibling scopes, no collision" claim is correct. *(The separate previewToken issue is B-1 — that's a scope-of-a-DIFFERENT-variable bug, not a `sold` collision.)* ✓
- **§4.7.0 vs `main.js:269-270`** — CURRENT byte-matches. `readShareCode()` + `applyShareLinkCode()` + the §4.7.a gate are self-consistent (stash-then-`location.search` fallback; one-shot `removeItem`; mutually-exclusive with `autoApplyStoreWideSale`; reuses `checkout.applyPromotionCode`). NOTE: §4.7.a/§4.7.b CURRENT blocks are stated "as Phase 4.4 left it" (post-4.4 state), so they are **not** byte-checkable against the pristine tree — the doc acknowledges this. The pristine `checkout.js` foundation they build on exists (`wirePromo` `:106`/`:144`, `applyPromotionCode` `:155`, `#promo-code`). ✓
- **§8.3 `refreshOrdersSignal` (out/portal.js)** — §8.3a CURRENT byte-matches `out/portal.js:162-164`. The selector `.rail__item[href="orders.html"], .tabbar__item[href="orders.html"]` matches the emitted markup (`portal.js:147`/`:154` emit `href="${k}.html"` → `orders.html`; the `.badge` class matches too). The `?status=needs_shipping` read + `body.orders` + `body.unseen_count` are all real (see Part 1 classification). ✓
- **`priceHTML(cents, sale)` reachability** — DEFINED by WS4 §4.3.a as a **top-level `function priceHTML(...)` in `main.js`** (`IMPLEMENT:1256`), i.e. a global. Confirmed `main.js` loads **before** the page script on every storefront page (`index.html`/`shop.html`/`product.html`/`cart.html`/`checkout.html` each load `main.js` then the page JS). This is the **same mechanism** by which `formatPrice` (also a `main.js` global) is already called cross-file in `shop.js`/`homepage.js`/`product.js` today. So the merged blocks' unconditional `priceHTML(...)` in the `!sold` branch resolves. NOT a finding. ✓
- **WS6→WS4→WS9 shared-file order** — mechanically applicable: the pristine `shop.js`/`homepage.js` anchors match, the merged NEW blocks carry the WS4 struck value + WS9 badge inline, and §4.5.b/§4.5.f/§9.2 are explicitly non-standalone pointers, so nothing double-applies or reverts. ✓
- **§D.4 / §D.1 storefront-brand CSS** — `.badge-unique` + `.price-sale` reference `--accent-primary` / `--text-muted` (both defined in `styles.css:43/46`) and layer on the existing `.badge` base + `.card__media .badge` (present, `styles.css:568/593`). `badge-unique`/`price-sale` are net-new (correct — not pre-existing). Concrete enough the builder never guesses. ✓

---

## Part 3 — The single most important "if you fix one thing"

**Fix B-1.** `previewToken` is init-scoped (`product.js:19`), not module/global, so §6.5b's `!previewToken` throws a `ReferenceError` inside the top-level `populateStickyCard` on every product-page load — breaking the entire PDP, not just the preview path. Re-derive `previewToken` inside the function (or pass it as a param) and correct the doc-impact note that wrongly claims it is "in scope from init." Everything else in the round-3 lane byte-confirmed; this is the one place the docs would ship a broken page.

---

**Verdict: NEEDS ANOTHER PASS (NARROW)** — one load-bearing fidelity bug (B-1, page-breaking but a bounded ~1-line scoped fix in the `product.js` sticky-card fold) plus two minor coordination/asymmetry notes (B-2, B-3). All standing byte-anchors and the other round-2 folds verified clean; the remaining area is tight and self-contained.
