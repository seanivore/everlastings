# Angle C — Integration / system-fit gap review, RE-PASS round 2 (v1.6.2)

**Reviewer lens (North Star):** minimize the owner's friction to run her entire store by chat via her Custom GPT — the GPT should do what a capable agent (Claude Code + skills/MCPs) could. Hunt for gaps where an edit is locally correct but, in the wider system, makes a by-chat capability fail or leak. Structural limit respected: a GPT Action is JSON-only and can't forward a pasted file → media arrives by URL.

**Scope of this pass.** Round 2 is narrow: confirm the C-relevant v1.6.2 folds landed, re-scan only the touched regions for a non-monotonic regression, and verdict. Round-1 C cleared the server state machine + isolation; not re-litigated here.

**Method.** Validated every claim against the working tree, not training data: `api/products.ts`, `assets/js/main.js` / `product.js` / `shop.js` / `homepage.js` / `admin.js`, `index.html`, `shop.html`, both `supabase/migrations` files (schema + RLS), and the v1.6.2 build docs (`v1_6_2_IMPLEMENT.md` + `ADDENDUM_DESIGN` + `ADDENDUM_TESTING`) against round-1 `v1_6_1_GAP_REVIEW_C.md`. Cross-checks run: every public-rendered product column vs. the C1 list; every listed column vs. the post-migration schema; every anon `.from('products')` reader; the preview-fetch path; the Phase 7.2 ↔ D2 ↔ D3 media chain.

---

## Verdict

**READY TO BUILD.** All three round-1 C findings are folded correctly and verified at both ends of each integration; the byte-anchors match the working tree; and the re-scan of the touched regions found **no fold-introduced regression**. One optional LOW tidiness note (publicView strip-set), explicitly non-blocking.

## The single most important confirmation

**C1's explicit `main.js` public column list is complete AND every column in it exists after the Phase 1 migration — so the anon read neither under-renders nor errors into a blank store.** This was the one fold most able to introduce a fresh regression: swapping `select('*')` for a hand-maintained projection can silently drop a rendered column (a by-chat capability stops showing) or name a column the migration forgot (PostgREST errors the whole query → empty shop/product pages). Both axes are clean — see C1 below.

---

## Confirmed landed (the three round-1 C folds)

### C1 — public token/column leak — CLOSED at both read sites ✓

**Server (`api/products.ts`, IMPLEMENT §3.2).** `publicView()` (helper at IMPLEMENT:498) strips `draft, preview_token, is_test` and is applied on exactly the two unauthorized GET returns — slug branch `return jsonResponse(request, isAuthorized ? data : publicView(data))` (602) and list branch `products: isAuthorized ? (data ?? []) : (data ?? []).map(publicView)` (629). Authorized callers and the preview-by-token branch keep the full row; the GET-by-`id` branch still 401s the public; `product-feed.ts` (explicit columns) is unaffected. The public slug + list branches **also** filter `.eq('is_published', true).is('archived_at', null)` (567/616) — correct, because `products.ts` runs the service-role client (RLS-bypassing), so it must filter rows explicitly rather than rely on RLS.

**Client (`assets/js/main.js`, IMPLEMENT §4.5b).** `getProductBySlug` (1840) and `getProducts` (1849) both project the identical explicit list and add `.eq('is_test', window._isTest === true)`. `window._isTest` is set in `initConfig` (1829) on the line **before** `window._supabase` (1830), and every reader gates on `await waitForSupabase()` (which polls for `_supabase`) — so `_isTest` is always set before the first query; an undefined value degrades safely to `false` (prod behavior). The conscious decision to skip `REVOKE SELECT (draft, preview_token)` is recorded (IMPLEMENT:1869) and correct — a column REVOKE is a silent no-op under Supabase's table-level anon SELECT grant.

**RE-SCAN (the C1 charter question): does the explicit list omit any column a public page renders?** **No.** Cross-checked the list against every column read by `product.js`, `shop.js`, `homepage.js`, and `main.js`'s `buildGa4Item`. Every render-critical column is present:
- `media` (Phase 7.2 `populateMedia` → the by-chat video capability — load-bearing; its omission would silently kill the headline media feature)
- `sku` (JSON-LD `p.sku || p.slug`), `stripe_price_id` (the `.not(..., null)` public-read gate **and** the cart item), `homepage_theme` (homepage theme apply), `created_at` (shop "newest" sort), `featured` (sort float + featured filter)
- plus `id, slug, title, headline, story_card, description, features, price, dimensions, weight, materials, power_supply, care_instructions, shipping_details, product_type, series, available, quantity, images, thumbnail, thumbnail_alt, seo_title, seo_description, seo_thumbnail, artist_note`.

Correctly **omitted** (never rendered): `draft, preview_token, is_test, is_published, published_at, archived_at, stripe_product_id, updated_at, checkout_*`.

**RE-SCAN (the regression the fold itself could add): does the list name a column that won't exist post-migration?** **No.** The only non-original column in the list is `seo_thumbnail`, and the v1.5 migration adds it (`ALTER TABLE products ADD COLUMN seo_thumbnail text;`, IMPLEMENT:264). `media` already exists (initial schema; IMPLEMENT:259 note). All other listed columns are in `20260421000001_initial_schema.sql`. So no "selected a non-existent column → PostgREST errors the whole query → blank store" failure.

**RE-SCAN (re-leak path): is there a third anon reader that still uses `select('*')`?** **No.** `grep` confirms the only anon `.from('products')` reads are `main.js:57/69` (both get the fold). `admin.js:480` is the hard-`delete()` (a write, not a column-leaking read) that Phase 8.11 replaces with the archive API and the Phase-8 hard-gate grep removes. No stray reader bypasses the fix.

**End-to-end (token can't be harvested → publish-by-token attack has nothing to steal):** the live page (anon `main.js`, explicit list — no `preview_token`) and the unauthorized `products.ts` GET (publicView — no `preview_token`) both withhold the token; the preview page fetches `/api/products?slug=…&preview=<token>` which hits the token branch first (529–547) and returns the full merged row only to a link-holder. Closed loop. Testing #29 asserts it.

### C2 — hero spotlight cascade — FIXED in place ✓

Verified the byte-anchors in `index.html`: the dark `rgba(26,26,26,…)` `mix-blend-mode: multiply` `.hero__spotlight` rule is in the **in-page `<style>` at 353–366**; the external `styles.css` `<link>` is at **:71** (loads earlier). D7 **replaces that in-page rule in place** (same `.hero__spotlight` selector, same later-loading block) with the warm `screen` radial + `animation: glow-breathe 18s` — so it wins the cascade by source order, and the round-1 trap (adding a competing rule to `styles.css`, which would lose) is avoided. `glow-breathe` is a global keyframe defined by D6 in `styles.css` (loaded first), so it's available to the in-page rule; `--glow-color` has an inline fallback regardless. Reduced-motion is consolidated into the existing in-page block at **380–382** (adds `.hero__video { display:none }`, the poster `background-image`, and `.hero__spotlight { animation:none }`); the `@supports` counter-scroll at **368–378** is left intact and is compatible with the `<img>`→`<video>` swap. No regression.

### C3 — dead miniatures-only filters — DROPPED, shop.js still binds ✓

Verified `shop.html:183–206`: the three `<fieldset>` groups match D4's CURRENT block exactly, including the `storybook` (197) and `printable` (198) options D4 removes. The NEW markup keeps `data-shop-filter="product_type" value="miniature"` and the `data-shop-sort` select (175) unchanged. `shop.js` binds generically — `getActiveFilters` reads `[data-shop-filter]:checked` keyed by `cb.dataset.shopFilter` into `{series, product_type, available}`, and `applyFilters` does `filters.product_type.length && !filters.product_type.includes(p.product_type)`. Dropping two never-matching options changes nothing in the JS; no `shop.js` edit is needed and none is made. No regression.

---

## Design integration (in scope this pass) — re-scanned, clean

- **D2 ↔ Phase 7.2 ordering + `product.js` population.** Phase 7.2 (IMPLEMENT:2486–2516) swaps the static media block for `<div class="product-gallery__media hidden" data-product-media>`; D2 then relocates that exact post-7.2 container to a direct child of `.product-layout`. `populateMedia` finds it by `document.querySelector('[data-product-media]')` (2424) and is called in the **shared** render path (2322) for both live and preview, so the moves don't affect population. All `product.js` binding is `querySelector` by `data-*`/class — position-independent. The D2 `grid-template-areas` rewrite extends the **existing** product `<style>` columns rule (no second `.product-layout` rule), and D1's inline `grid-template-columns`/`gap` removal is restored by the `<style>` base gap (D2) + shop base gap (D5) — the cascade now actually applies. ✓
- **D6 glow injection.** `main.js` injects one `.firelight-glow` (guarded by `!document.querySelector('.firelight-glow')`), `z-index:-1`, `pointer-events:none`, `aria-hidden` — sits behind content, blocks no interaction, on every page. ✓
- **D7 hero assets** are referenced as live on the CDN (`…/hero-bg-anim/`); consistent with the project's CDN drop path. (Not independently fetched — read-only review; the addendum states they're live.) ✓
- **D4 hooks** preserved (every `data-shop-filter`/`data-shop-sort`); D3 media classes (`.product-media__item`, `--embed`) match exactly what `populateMedia` emits. ✓

---

## Re-scan: no fold-introduced (non-monotonic) regression

Walked each v1.6.2 fold for "did this fold introduce the next bug":
- **publicView** — applied only to the two unauthorized returns; authorized/preview/feed paths untouched; never receives null (`!data` 404 precedes it). Clean.
- **main.js explicit columns** — complete projection; all columns exist post-migration; `is_test` scoping intact; row-hiding of drafts/archived still comes from RLS (`USING (is_published = true AND archived_at IS NULL)`, IMPLEMENT:288–290) untouched by the column change (archived rows retain `stripe_price_id`, so RLS — not the `stripe_price_id` filter — is what hides them; confirmed RLS does). Clean.
- **hero in-place replace** — same selector, later block wins; reduced-motion consolidated; no competing `styles.css` rule. Clean.
- **shop filters** — JS binds by dataset key; dropping never-matching options is inert. Clean.
- **product aside / density / inline-gap** — data-binding is selector-based and position-independent; gap restored via `<style>`. Clean.

---

## Ranked findings

### C-R2-1 — [LOW · optional, non-blocking] `publicView` strips the capability columns but not the (non-secret) `checkout_*` / status columns on the unauthorized `products.ts` GET

**Where** `api/products.ts` `publicView` (IMPLEMENT:498–501) strips `{draft, preview_token, is_test}`. The unauthorized slug/list returns therefore still include `checkout_name`, `checkout_description`, `checkout_image`, `is_published`, `published_at`, `archived_at`, `stripe_product_id`.

**The integration risk — assessed and dismissed as a leak.** None of these are capabilities or secrets: `checkout_*` are the public checkout **display** copy (shown at Stripe checkout anyway); `stripe_product_id` is a `prod_…` identifier (useless without the secret key); the status columns are constant for any row that passes the public `is_published=true / archived_at=null` filter. And the **live frontend never calls `products.ts` unauthorized GET** — it reads through the anon Supabase client (`main.js`), whose explicit list already omits all of these. So there is no exposure on any real read path; this is tidiness, not a vulnerability.

**Concrete fix (optional).** For defense-in-depth and to keep the public/authorized contract obvious, widen the strip to `const { draft, preview_token, is_test, is_published, published_at, archived_at, stripe_product_id, checkout_name, checkout_description, checkout_image, ...pub } = row;`. Pure tidiness — do it or skip it; not a build gate. (Recording it so the strip-set is a conscious choice, matching how the REVOKE skip was recorded.)

### C-R2-2 — [INFO · note, not a finding] the explicit `main.js` list is now a maintenance coupling

Because the browser is the anon key and RLS can't column-filter, the public projection is hand-maintained. It is **complete today**, but any **future** public-rendered product column must be added to both `getProductBySlug` and `getProducts` or it will silently not render. Worth a one-line comment at the list (e.g. "keep in sync with what product.js/shop.js/homepage.js render") so the coupling is visible to the next editor. No action required for this build.

---

## Coverage note

Round-1 C's clean verifications (server state machine, create→draft→publish, price-rotation create→write→deactivate order, `validateProductRules` on both publish branches, the published-edit changed-frozen-only guard, change-detection invariant, the admin service-role read path + Phase-8 hard-gate, checkout/feed row-isolation, the refund branch ordering, coupon owner-isolation + pagination, the operationId→rewrite map, the effective-fallback, SSRF guard, featured/series triggerability, site-vs-store boundary, idempotency/zombie edges) were **not** re-litigated per the re-pass charter; v1.6.2's folds did not touch those regions (the field taxonomy `DRAFTABLE`/`FROZEN_AFTER_PUBLISH`/`CREATE_FIELDS` is at module scope and unchanged, with `media` staging asserted by testing #9/#28), so their round-1 clearance stands.

---

## One-line verdict

**READY TO BUILD.**
