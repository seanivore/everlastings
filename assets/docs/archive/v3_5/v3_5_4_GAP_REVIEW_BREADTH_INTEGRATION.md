# v3.5.4 — Breadth-regression pass · INTEGRATION MECHANICS (round 4, post-round-3-fold backstop)

Scope: whether the round-3 fixes **compose** — not per-edit correctness (that's A/B/D). Flag-don't-assert. Changed nothing but this file.

---

## Verdict

**READY TO BUILD** — every round-3 fix composes cleanly and every system invariant held. The round-3 breadth finding (undocumented `main.js` shared `DOMContentLoaded` anchor) is now **folded** (coordination bullet at `IMPLEMENT:47` + ledger 36b). No new fold-mechanic regression. One low-severity, out-of-delta observation on the badge-corner invariant (below) — inherited from the shipped base, not introduced or worsened by this build.

---

## Checks (5) — result + evidence

### 1. `main.js` §4.3.b + §4.7.0 coordination — composes in any order ✅ CLEAN (round-3 finding now folded)
- Both phases quote the **byte-identical CURRENT anchor** (`main.js:269-270`: `DOMContentLoaded … {` + `  initConfig();`) and both append **after `initConfig()`**. Verified the live anchor byte-matches (`main.js:269-279`).
- Composed handler = `initConfig()` → `getActiveSale().then(mountSaleChrome)` (§4.3.b) → the `try{…sessionStorage.setItem('everlastings.shareCode',…)}catch{}` (§4.7.0) → the existing consent restore (`CONSENT_STORAGE_KEY` → `applyConsent`, `main.js:273-276`) → the firelight comment. The three appended/existing bodies are mutually independent: §4.3.b is fire-and-forget async (touches neither the code-capture nor consent), §4.7.0 is a synchronous `sessionStorage` write (touches neither the sale chrome nor consent), and the consent restore is an independent `localStorage` read. **Order-independent; neither clobbers the consent/config logic.**
- The prior round-3 breadth gap (a second occupant landed on this anchor without a coordination-section entry) is **resolved**: `IMPLEMENT:47` now carries the explicit "apply BOTH appends" bullet and ledger 36b names it. §4.3.c's `mountSaleChrome` definition is a module-level insert **above** line 269 — outside the handler, no collision with the appends.

### 2. Badge gate composition — the NEW unique badge never overlaps; ✅ CLEAN for the delta (⚠ one out-of-delta note)
- **Homepage (§6.3d, all-featured via `getProducts({featured:true, available:true})`):** the tile hardcodes the Featured badge and has **no `badge-sold` span at all**; the unique badge is gated `!sold && !p.featured`, and since every homepage item is featured it **never renders**. So the homepage corner shows **exactly one badge (Featured)** in all cases. Clean; the inert unique line is by-design (Featured owns the corner there), not dead-code rot.
- **Shop grid (§6.5a, mixed featured/non-featured):** the unique badge (`!sold && !p.featured`) is mutually exclusive with **both** Sold and Featured — it can never join them in the shared `.card__media` corner. That is exactly what ledger 35b claims, and it holds. The DELTA composes with **no new overlap and no duplicate render**.
- **⚠ Flag (low, out-of-delta):** Sold (`sold`) and Featured (`p.featured`) are gated **independently**, so a *featured, sold-out* shop tile renders **both** — two badges pinned to the same `.card__media .badge` corner (`styles.css:593`). This is **pre-existing shipped behavior** — the CURRENT (pre-fold) block already gated `badge-sold` and `badge-featured` independently (`IMPLEMENT:2369-2370`). This build neither introduces nor worsens it, and ledger 35b's claim is correctly scoped to the *unique* badge only (it does not assert Sold≠Featured). Noted for completeness so the prompt's "at most one of {Sold, Featured, One of a kind}" isn't read as a global guarantee: it holds for the new badge and for the homepage; the Sold+Featured pair on shop is a settled-base item, out of scope to re-litigate.

### 3. `previewToken` re-derive + the two `const sold` sibling scopes ✅ CLEAN / legal
- Confirmed `previewToken` at `product.js:19` lives in the `init` async function (its `const product = previewToken ? …` chain, `:19-24`); `populateStickyCard` is a **separate top-level function** (`:365`), so line 19 is genuinely out of scope — the §6.5b local re-derive (`new URLSearchParams(location.search).get('preview')`) is required and correct (ledger 34b).
- Within `populateStickyCard`, `previewToken` is declared **exactly once** (§6.5b, function-body level). §4.5.d's block (inside `if (priceEl){…}`) declares only `sale` + `sold`, never `previewToken` — so **no shadow, no collision, no use-before-declare** in this function.
- The two `const sold`: §4.5.d's is **block-scoped inside `if (priceEl){}`** (near the top, `:369-370` region); §6.5b's is at **function-body level** (near `:382`). Different lexical scopes → two separate bindings → **legal, no redeclaration error, no TDZ conflict** (const block-scoping keeps them independent). The doc's own note at `IMPLEMENT:1508` asserts exactly this and it checks out.

### 4. Budget invariant — 11/12 functions + 1 cron unchanged ✅ HELD
- `api/*.ts` = **11** (cart, checkout, config, contact, orders, product-feed, products, stripe-sync, subscribe, upload, webhook). No new function.
- `vercel.json` crons = **1** (`/api/product-feed`, `0 9 * * *`). No new cron.
- Every round-3 fix is JS/CSS/doc only: §6.5b = `product.js`; §9.2a = `styles.css`; the badge gate = `shop.js`/`homepage.js`; the `main.js` coordination = `main.js`/doc. **No `api/*.ts` or `vercel.json` change slipped in** (git working tree carries only the four `GAP_REVIEW_*` files; last api/vercel commits are all v3.3-era). Held.

### 5. §9.2a `.badge-unique` CSS composes without breaking the `.badge` cascade ✅ CLEAN
- CURRENT anchor (`styles.css:586-593`) **byte-matches** the tree (verified `.badge-featured {…}` + `/* Overlay placement… */ .card__media .badge {`).
- NEW inserts `.badge-unique` **between** `.badge-featured` and `.card__media .badge` — a clean insertion that disturbs neither neighbor.
- Cascade is intact: the element ships `class="badge badge-unique"`, so it inherits the base `.badge` rule (`:568`, display/padding/font/radius/bg). `.badge-unique` (later in source than `.badge`) overrides only `background`/`border`/`color` — identical `--bg-primary` bg, adds an `--accent-primary` border + color. The positioning rule `.card__media .badge` (`:593`, specificity 0,2,0) still matches (via the `.badge` class) and sets **disjoint** properties (position/top/left/z-index) — no conflict with `.badge-unique`'s color trio. Solid tokens, **no `color-mix()`** → no OKLCH-floor question. Composes clean.

---

## Fold-mechanic regressions found

**None load-bearing.** The round-3 folds compose in every dimension checked: the `main.js` dual-append is order-independent and no longer undocumented (the round-3 breadth finding is folded); the unique badge is mutually exclusive with Sold+Featured and never adds a third badge to the corner; the local `previewToken` re-derive and the two sibling-scoped `const sold` are legal JS; the function/cron budget is untouched; and `.badge-unique` slots into the badge cascade without breaking the base or the overlay-placement rule.

**One low-severity, out-of-delta note:** on the shop grid a *featured + sold-out* tile can render Sold **and** Featured in the same corner — but that is pre-existing shipped behavior (independent gates inherited from the base block), not introduced by this build, and ledger 35b's invariant is correctly scoped to the new unique badge only. Recorded so the "at most one badge" phrasing isn't over-read; no action required for this delta.
