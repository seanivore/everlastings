# ADDENDUM · DESIGN — v1.6.2 (exclusively executable)

**Parent:** `v1_6_2_IMPLEMENT.md` (this is an addendum; it carries the same version and is **always** part of the same build + every gap review). **Required reading with it:** `assets/docs/EVERLASTINGS_STORE.md` + the parent. **Scope:** the presentation layer — CSS, markup structure, and render-tuned aesthetics for the pages. Behavior that ships data (the `media` model, `populateMedia`, the Phase 7.2 container, GPT schema) stays in the parent; this doc styles and arranges what that behavior produces.

> **How design is "executable" here (read once).** Design is built and validated **exactly like functionality**: the spec gives the builder concrete CURRENT/NEW blocks or concrete default values so it never *guesses* — and then, like every functionality phase, it gets a **testing + feedback pass** on the dev preview (see `v1_6_2_ADDENDUM_TESTING.md`). Render-dependent aesthetics (glow palette, density, hero treatment) ship with a **stated default** plus a **RENDER-TUNE** note; tuning them on the live render is the design test phase, not a plan gap. "Executable" means *no discovery/decision is left to the builder*, not *frozen forever*. **Design/functionality overlap is real:** several items here straddle the line — the filter dropdowns (D4) also bind to `shop.js`, the glow (D6) is injected by JS, and the D2 layout moves depend on parent Phase 7.2. They're specced here for *presentation*, but the **whole build is reviewed together**, never siloed by the design-vs-functionality split.

> ## ⭐ The lens (same North Star as the parent)
> Minimize the owner's friction to run her whole digital product by chat via her Custom GPT. The site itself is the other place we out-class a Shopify/"AI-website" feel — through a distinctive, custom **experience**. This addendum keeps the already-beautiful site intact and fills the narrow gaps the original design plan specified but the build missed (optional product video behaviors, the filter layout), fixes the one real layout bug (columns), and adds the small requested touches (filter dropdowns, ambient glow, the animated hero). The richer interactive homepage vision is a **separate v3.0.0 initiative** (see `assets/docs/archive/v3_0/`), not this build.

> **No real content is required to build or test.** Every section is exercised on **production-grade placeholder assets that mimic the GPT-validated real-asset specs** (existing AI pipeline). Real imagery/copy arrive later, by chat, after handoff. The placeholder set must cover the full media test matrix (D8 + testing addendum).

---

## D1 — Columns root-cause bug (EXECUTABLE) — was §3.1

Both pages set `grid-template-columns: 1fr` as an **inline style** on the layout div, overriding the desktop two-column rule in the page's `<style>` block (inline beats a stylesheet selector) — so both are permanently single-column on desktop. Fix = delete the inline `grid-template-columns` and let the media-queried `<style>` rule own it — **that desktop rule already exists** (this is the columns-bug-class check: the rule that must win is present): `product.html:444-448` (`.product-layout` → `1fr 360px` at ≥768, `1fr 400px` at ≥1024) and `shop.html:368-372` (`.shop-layout` → `220px 1fr` / `240px 1fr`). Removing the inline override is all it takes — no new column rule is needed (D2 only *adds grid-areas* to product's existing rule; it does not re-declare the columns). Mobile stays single-column naturally (a grid with no explicit columns flows to one column).

**Same trap, the inline `gap` (D-4).** Both layout divs also set `gap` **inline** (`product.html:162` `gap: var(--space-2xl)`, `shop.html:164` `gap: var(--space-xl)`), which likewise out-cascades the `<style>` desktop gap — so the `≥1024` gap override never applied (and D5's "tightens the shop gap" was impossible). Fix the whole cascade the same way: remove the inline `gap` too (NEW blocks below) and let the `<style>` own gap end-to-end — a **base** gap on the un-queried rule plus the existing `≥1024` override. Product's base+override live in the D2 `<style>` rewrite; shop's base is added here.

**`product.html:162` CURRENT:**
```html
      <div class="product-layout" style="display: grid; gap: var(--space-2xl); grid-template-columns: 1fr; margin-top: var(--space-md);">
```
**NEW (drop inline `grid-template-columns` *and* `gap` — both now owned by the `<style>` block):**
```html
      <div class="product-layout" style="display: grid; margin-top: var(--space-md);">
```

**`shop.html:164` CURRENT:**
```html
        <div class="shop-layout" style="display: grid; gap: var(--space-xl); grid-template-columns: 1fr;">
```
**NEW (drop inline `grid-template-columns` *and* `gap`):**
```html
        <div class="shop-layout" style="display: grid;">
```

**Shop `<style>` — add a base `.shop-layout` gap so mobile keeps its gap and the `≥1024` override can win.** CURRENT (`shop.html:366-374`):
```html
    <style>
      /* shop.html-only layout escalations */
      @media (min-width: 768px) {
        .shop-layout { grid-template-columns: 220px 1fr; }
      }
      @media (min-width: 1024px) {
        .shop-layout { grid-template-columns: 240px 1fr; gap: var(--space-2xl); }
      }
    </style>
```
NEW (add the base rule; the `≥1024` gap override is unchanged and now actually applies):
```html
    <style>
      /* shop.html-only layout escalations */
      .shop-layout { gap: var(--space-xl); }
      @media (min-width: 768px) {
        .shop-layout { grid-template-columns: 220px 1fr; }
      }
      @media (min-width: 1024px) {
        .shop-layout { grid-template-columns: 240px 1fr; gap: var(--space-2xl); }
      }
    </style>
```

RENDER-TUNE: confirm on the dev preview that mobile still stacks (with a gap) and desktop shows two columns.

---

## D2 — Product-page layout: two-column + sticky (EXECUTABLE, structural) — was §3.2

Restores the intended layout the D1 bug flattened, plus the element order from `v1_5_0_FEEDBACK.md`. Driven by `grid-template-areas` so the desktop two-column and the mobile interleave (card between gallery and story) both come from one grid.

- **Desktop:** left column = gallery → story → media; right column = a sticky **aside** holding the buy **card** with the **details/features directly beneath it** (standard product-page right rail). The aside spans the gallery+story rows and **releases at the media row** — BUY stays in view through gallery + story, then the page scrolls on to the media.
- **Mobile (one column):** gallery → aside (card + details) → story → media. Images first, the buy card and its details right after (FEEDBACK #8), the long story below.

> **Order dependency (integration note for Angle C):** this runs **after parent Phase 7.2**, which already swaps the static `.product-gallery__media` block for the empty data-bound container `<div class="product-gallery__media hidden" data-product-media></div>`. D2 operates on that post-7.2 markup. `product.js` binds by `data-*` attributes, so relocating elements does **not** affect population.

**CSS — EXTEND the existing product-page `<style>` block (`product.html:442-450`), which already declares the desktop columns. Do NOT add a second `.product-layout` rule (e.g. in `styles.css`) — that would conflict with this one. We ADD `grid-template-areas` + child area assignments + a **base `gap`** (D-4) + the **aside sticky**; the existing `1fr 360px`/`1fr 400px` columns stay.**

CURRENT (`product.html:442-450`):
```html
    <style>
      /* product.html-only layout: two-column on desktop, stacked on mobile */
      @media (min-width: 768px) {
        .product-layout { grid-template-columns: 1fr 360px; }
      }
      @media (min-width: 1024px) {
        .product-layout { grid-template-columns: 1fr 400px; gap: var(--space-3xl); }
      }
    </style>
```
NEW (adds the base `gap`, mobile + desktop `grid-template-areas`, child `grid-area` assignments, and the aside sticky; columns unchanged):
```html
    <style>
      /* product.html-only layout: two-column on desktop, stacked on mobile */
      .product-layout {
        gap: var(--space-2xl);                                   /* base gap (was inline; D-4) */
        grid-template-areas: "gallery" "aside" "story" "media";  /* mobile: images, buy card+details, story, media */
      }
      .product-layout > .product-gallery        { grid-area: gallery; }
      .product-layout > .product-aside          { grid-area: aside; }
      .product-layout > .story-card             { grid-area: story; }
      .product-layout > .product-gallery__media { grid-area: media; }
      @media (min-width: 768px) {
        .product-layout {
          grid-template-columns: 1fr 360px;
          grid-template-areas: "gallery aside" "story aside" "media .";
        }
        /* The aside (buy card + details beneath it) is the sticky unit: bounded by its grid area
           (gallery+story rows), it holds through gallery+story and releases at the media row.
           align-self:start keeps it content-height so it pins cleanly. Neutralize the card's own
           sticky inside it so there is a single sticky context. */
        .product-layout > .product-aside {
          align-self: start;
          position: sticky;
          top: calc(var(--header-height) + var(--space-lg));
        }
        .product-layout > .product-aside > .product-sticky-card { position: static; }
      }
      @media (min-width: 1024px) {
        .product-layout { grid-template-columns: 1fr 400px; gap: var(--space-3xl); }
      }
    </style>
```
(The inline `display:grid; margin-top` on `.product-layout` at `product.html:162` stays; `gap` now comes from the `<style>` base rule (D-4). Stickiness lives on `.product-aside`; the existing `.product-sticky-card` sticky at `styles.css:885-890` is neutralized inside the aside so there is one sticky context, and the card keeps its own background/border/padding.)

**HTML moves in `product.html` (apply each by its CURRENT-block content, not by raw line number — earlier edits shift later lines (D-9); and run parent Phase 7.2 first, since it replaces the very media block step 3 relocates):**
1. **Unwrap `.product-story`** (`<div class="product-story">` at `product.html:167`, closing `</div>` at `:277`): delete the wrapper open + close so `.product-gallery` (`:173`) and `.story-card` (`:265`) become direct children of `.product-layout`.
2. **Wrap the buy card + details in a `.product-aside`**, a direct child of `.product-layout` placed **immediately after `.product-gallery`** (2nd child — so the BUY CTA precedes the media in DOM/reading/focus order; D-2 a11y). Move the existing `<aside class="product-sticky-card" data-product-card>…</aside>` into it, then move `.product-details` (the `<section class="product-details" …>` at `:321`, currently after the layout's closing `</div>` at `:316`) in **directly below the card**. Result: `<div class="product-aside"><aside class="product-sticky-card">…</aside><section class="product-details">…</section></div>`.
3. **Relocate the media container** (the post-7.2 `[data-product-media]` div) out of `.product-gallery` to a **direct child of `.product-layout`, immediately after `.story-card`**.
4. **Trim the stacking-era inline margins (D-5).** `.story-card` (`product.html:265`) and `.product-details` (`:321`) each carry `margin-top: var(--space-3xl)`, which now doubles up with the grid `gap`. Drop the inline `margin-top` from both (the grid `gap` owns the spacing). Keep the story-card's `border-left`/cream background and the details' `padding-top`/`border-top`.
5. **Fix the now-stale structure comments (D-5).** The `<!-- Two-column layout … gallery + story (left) / sticky card (right) … gallery → sticky card (in flow) → story -->` block comment (`product.html:158-160`), the `<!-- LEFT COLUMN: gallery + story -->` comment (`:166`), and the `<!-- RIGHT COLUMN: sticky details card … -->` comment (`:279-281`) describe the pre-D2 two-`div` structure. Update them to the flat grid (gallery / aside [card + details] / story / media).
6. `grid-template-columns` and inline `gap` already removed from the inline style by D1.

RENDER-TUNE (not blockers): the aside (card + details) keeps BUY in view through gallery+story and releases at the media row. Confirm the card+details combined height fits the viewport while sticky — if it exceeds it, the bottom of details clips near the release point (acceptable, or reduce details density). `.product-details` `border-top`/`padding-top` may want trimming now it sits in-column under the card. **No-media product (D-7):** the hidden media grid area can read as a double gap on a product with no `media` — confirm it looks clean (trivially tightened if not).

---

## D3 — Story-card text + media CSS (EXECUTABLE) — was §3.3

**Story card reads too small** because it's the display serif, italic, at `--text-lg`. Make it read like body copy (keeps the blockquote framing — the `border-left` + cream background are inline on the section at `product.html:265`).

**`styles.css:929-935` CURRENT:**
```css
.story-card {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  line-height: var(--leading-loose);
  color: var(--text-primary);
  font-style: italic;
}
```
**NEW:**
```css
.story-card {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  line-height: var(--leading-loose);
  color: var(--text-primary);
  font-style: normal;
}
```

**Media CSS (new rules) — both render modes use the same `<video>` element, so this styles GIF-like *and* click-to-play identically; MP4 respects its intrinsic ratio (no forced 16/9 black bars), YouTube embeds get 16/9:**
```css
.product-gallery__media { display: grid; gap: var(--space-md); }
.product-media__item video { width: 100%; height: auto; display: block; border-radius: var(--radius-md); }
.product-media__item--embed { aspect-ratio: 16 / 9; }
.product-media__item--embed iframe { width: 100%; height: 100%; border: 0; border-radius: var(--radius-md); }
```
(The container + `populateMedia` ship + are tested in parent Phase 7/7.2. **Prereq:** these class names — `.product-media__item` and `.product-media__item--embed` — style exactly what Phase 7.2's `populateMedia` emits (verified against the Phase 7 code), so Phase 7.2 runs first or these rules have nothing to target. **GIFs are retired** — an MP4 `<video loop muted playsinline>` is smaller and cleaner. The `gif-0[1-5]` `ROLE_PATTERN` entries can be retired in a follow-up; harmless if left.)

---

## D4 — Shop filters → compact dropdowns (EXECUTABLE) — was §3.4

The original plan specified a real filter sidebar (the column notes are in the markup); after D1 it returns. Sean's added request: make the always-open checkbox fieldsets **compact dropdowns** that fit the site, **keeping every `data-shop-filter` / `data-shop-sort` hook so `shop.js` is untouched.** Use native `<details>` (accessible, zero-JS, styleable) — one per filter group, closed by default; the sort `<select>` stays as-is.

**`shop.html:183-206` CURRENT (the three `<fieldset>` groups):**
```html
              <!-- Series filter -->
              <fieldset style="border: 0; padding: 0; margin: var(--space-lg) 0 0;">
                <legend style="font-family: var(--font-display); font-size: var(--text-lg); margin-bottom: var(--space-sm); padding: 0;">Series</legend>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="series" value="portals-to-peace"> Portals to Peace</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="series" value="book-nooks"> Book Nooks</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="series" value="story-lofts"> Story Lofts</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="series" value="seasonal"> Seasonal</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="series" value="limited-edition"> Limited Edition</label>
              </fieldset>

              <!-- Product type filter -->
              <fieldset style="border: 0; padding: 0; margin: var(--space-lg) 0 0;">
                <legend style="font-family: var(--font-display); font-size: var(--text-lg); margin-bottom: var(--space-sm); padding: 0;">Type</legend>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="product_type" value="miniature"> Miniatures</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="product_type" value="storybook"> Storybooks</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="product_type" value="printable"> Printables</label>
              </fieldset>

              <!-- Availability filter -->
              <fieldset style="border: 0; padding: 0; margin: var(--space-lg) 0 0;">
                <legend style="font-family: var(--font-display); font-size: var(--text-lg); margin-bottom: var(--space-sm); padding: 0;">Availability</legend>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="available" value="true" checked> Available</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="available" value="false"> Sold Archive</label>
              </fieldset>
```
**NEW (same hooks + values; each group becomes a `<details class="filter-group">` with a `<summary>` label):**
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

              <!-- Product type filter -->
              <details class="filter-group">
                <summary>Type</summary>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="product_type" value="miniature"> Miniatures</label>
              </details>

              <!-- Availability filter -->
              <details class="filter-group">
                <summary>Availability</summary>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="available" value="true" checked> Available</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="available" value="false"> Sold Archive</label>
              </details>
```
**Supporting CSS (new rules, matching the existing legend styling so it reads as the same design):**
```css
.filter-group { border: 0; margin: var(--space-lg) 0 0; }
.filter-group > summary {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  margin-bottom: var(--space-sm);
  cursor: pointer;
  list-style: none;            /* hide default marker; use a custom caret */
  display: flex; align-items: center; justify-content: space-between;
}
.filter-group > summary::-webkit-details-marker { display: none; }
.filter-group > summary::after { content: "+"; color: var(--text-muted); font-weight: 400; }
.filter-group[open] > summary::after { content: "–"; }
```
RENDER-TUNE: open/closed defaults (Series open, others closed above) and caret styling. **Type group is now miniatures-only (C3):** the `storybook`/`printable` options are dropped from the NEW markup — the store is miniatures-only and the `createProduct`/`editProduct` enums are `[miniature]`, so those filters could never match and a dead filter reads as broken on a showcase storefront (restore them if a second product type ships). That leaves a single-value "Type" group; the "smart-hide a filter group whose tag has only one value" enhancement (a `shop.js` change, not markup) is the clean follow-up — **deferred**; on render, decide whether to keep the lone "Miniatures" toggle or hide the group until there's a second type.

---

## D5 — Desktop density on the dense flows (EXECUTABLE, component-scoped + RENDER-TUNE) — was §3.5

Cart / checkout / card-heavy pages can push content below the fold at smaller desktop widths. The earlier draft redeclared the global `--space-2xl`/`--space-3xl` tokens at `≥1024` — but those tokens also drive `--container-padding` (page gutters, `styles.css:202/207`) and `.section`/`.section-loose` (global vertical rhythm, `:187-193`), so that would have shrunk the **whole** site, not the dense flows (D-3). And most of the product page's "huge" feel was actually the columns bug (D1), now fixed. So scope the reduction to the dense flows and leave site-wide gutters + rhythm intact.

**Mechanism: a `density-compact` scope class on the cart + checkout pages.** It tightens `.section`/`.section-loose` vertical padding at the desktop breakpoint *within that scope only* — `--container-padding` (gutters) and every other page are untouched.

**CSS (add to `assets/css/styles.css`):**
```css
@media (min-width: 1024px) {
  .density-compact .section       { padding-top: var(--space-xl);  padding-bottom: var(--space-xl); }
  .density-compact .section-loose { padding-top: var(--space-2xl); padding-bottom: var(--space-2xl); }
}
```

**HTML hooks.** `cart.html:149` CURRENT `  <main>` → NEW `  <main class="density-compact">`; same for `checkout.html:149`.

RENDER-TUNE: confirm on the cart + checkout renders at 1280–1440px that nothing critical sits below the fold; adjust the two values above. Product cards (`.card`) and the shop grid stay at site defaults (the columns fix resolved the product page) — tighten them only if a render shows a need, again via component selectors, never the global tokens.

---

## D6 — "Firelight" ambient glow (EXECUTABLE with default palette + RENDER-TUNE) — was §3.6

A warm bloom seeping inward from all four viewport edges (ref `assets/docs/archive/images/everlastings-website-red-glow.jpg`): fog-like, subtle scale "breathing," opacity drift, slow clockwise travel. One overlay element; two custom properties control it (`--glow-color` RGB triplet, `--glow-intensity`). Honors `prefers-reduced-motion`.

**Palette — drawn from the existing brand palette (BRAND_GUIDE):** Deep Plum `74,25,66` · Amethyst `155,107,158` · Soft Gold `212,175,122` · Deep Star Blue `27,58,82`. The "firelight" default leans **warm** (the reference glow is warm), so the page default blends toward Soft Gold/plum; per-page context can theme it (homepage warm-gold firelight, shop amethyst, product page seeded from the piece). These are best-thoughts defaults — confirmed/adjusted on render.

**CSS (add to `assets/css/styles.css`):**
```css
:root { --glow-color: 212, 175, 122; --glow-intensity: 0.45; } /* warm firelight default; page JS may override */
.firelight-glow { position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(var(--glow-color), var(--glow-intensity)), transparent 60%),
    radial-gradient(120% 80% at 50% 110%, rgba(var(--glow-color), var(--glow-intensity)), transparent 60%),
    radial-gradient(80% 120% at -10% 50%, rgba(var(--glow-color), var(--glow-intensity)), transparent 60%),
    radial-gradient(80% 120% at 110% 50%, rgba(var(--glow-color), var(--glow-intensity)), transparent 60%);
  animation: glow-breathe 14s ease-in-out infinite; }
.firelight-glow::before { content: ""; position: absolute; inset: -20%;
  background: conic-gradient(from 0deg, transparent, rgba(var(--glow-color), calc(var(--glow-intensity) * 0.6)), transparent 60%);
  animation: glow-rotate 40s linear infinite; }
@keyframes glow-breathe { 0%,100% { opacity: .85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
@keyframes glow-rotate  { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .firelight-glow, .firelight-glow::before { animation: none; } }
```
**Placement + injection (EXECUTABLE — `main.js` runs on every page; add to its `DOMContentLoaded` handler, ~`main.js:264`, alongside `initConfig()`):** the glow is `z-index: -1`, so it sits behind all in-flow content with **no content-lift needed** (no per-page wrapper or `<main>` z-index edits — the earlier "add z-index:1 to the wrapper" idea is unnecessary with a negative z-index). Inject once + apply an optional per-page tint:
```js
// v1.6 Firelight ambient glow (design addendum D6) — inject once, sits behind content.
if (!document.querySelector('.firelight-glow')) {
  const glow = document.createElement('div');
  glow.className = 'firelight-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.prepend(glow);
}
// optional per-page tint (brand palette); the warm-gold default lives in :root.
const glowTint = { '/shop': '155, 107, 158' /* amethyst */ }[location.pathname.replace(/\/$/, '')];
if (glowTint) document.documentElement.style.setProperty('--glow-color', glowTint);
```
RENDER-TUNE: `--glow-intensity` + per-page `--glow-color`, and whether any full-bleed section needs a transparent/translucent background to let the edge-bleed read (a `z-index:-1` glow shows through wherever a section doesn't paint an opaque background over it). Deferred: a per-product `accent_color` column feeding `--glow-color`.

RENDER-TUNE: the exact `--glow-color` per page + `--glow-intensity` are confirmed against the live effect (palette-first); the mechanism above is fixed.

---

## D7 — Animated hero (EXECUTABLE baseline + theatrical layering) — was §3.7

The hero mp4 is an actual photograph of the client's artwork that AI generation extended into a video where the **sun rises and sets**, shadows rising and falling — itself drawn from the original "theatrical lighting" homepage idea. The hero is **already CSS-ready for video** (`styles.css:953-954` styles `.hero__media video { object-fit: cover }`; `.hero__overlay` scrim + `.hero__spotlight` already exist as elements). So this is a markup swap + a reduced-motion fallback + a light theatrical layer — not a rebuild.

> **One cascade trap (D-1/C2) — `.hero__spotlight` is NOT inert.** `index.html` defines it in an **in-page `<style>` (`:353-366`) as a dark `multiply` vignette**, and that in-page block loads **after** `styles.css` (`<link>` at `index.html:71`), so any `.hero__spotlight` rule added to `styles.css` would *lose* the cascade and the warm glow would never paint. Therefore the hero CSS edits below **edit the in-page `<style>` block in place** — replace the vignette rule, and extend the existing in-page reduced-motion rule — **not** `styles.css`.

**Assets are LIVE on the CDN (done; no handoff needed):**
- Video: `https://cdn.everlastingsbyemaline.com/hero-bg-anim/homepage-hero-animation.mp4` (16:9, `video/mp4`)
- Poster / reduced-motion fallback: `https://cdn.everlastingsbyemaline.com/hero-bg-anim/hero-bg-image-not-anim.jpg`

**`index.html` — swap the `<img>` in `.hero__media` for a `<video>` (CURRENT is the placeholder `<img>` block at `index.html:160-165`; NEW):**
```html
      <div class="hero__media" data-hero-media>
        <video class="hero__video" autoplay muted loop playsinline
               poster="https://cdn.everlastingsbyemaline.com/hero-bg-anim/hero-bg-image-not-anim.jpg"
               src="https://cdn.everlastingsbyemaline.com/hero-bg-anim/homepage-hero-animation.mp4"></video>
      </div>
```
(Keep `.hero__overlay`, `.hero__spotlight`, and `.hero__content` exactly as they are — title "Step into Elsewhere", tagline, CTA "Enter Elsewhere".)

**Reduced-motion fallback — EXTEND the existing in-page rule (do NOT add to `styles.css`).** `index.html:380-382` already has a reduced-motion block for `.hero__media`; fold the video-hide + poster into it so all hero reduced-motion lives in one place. CURRENT (`index.html:380-382`):
```css
      @media (prefers-reduced-motion: reduce) {
        .hero__media { animation: none !important; transition: none !important; transform: none !important; }
      }
```
NEW (also hide the video, show the poster still, freeze the spotlight):
```css
      @media (prefers-reduced-motion: reduce) {
        .hero__media {
          animation: none !important; transition: none !important; transform: none !important;
          background-image: url('https://cdn.everlastingsbyemaline.com/hero-bg-anim/hero-bg-image-not-anim.jpg');
          background-size: cover; background-position: center;
        }
        .hero__video { display: none; }
        .hero__spotlight { animation: none; }
      }
```

**Theatrical layering — REPLACE the existing in-page `.hero__spotlight` rule in place (D-1/C2).** The current rule is the dark `multiply` vignette; replace it (same selector, same in-page `<style>`) with a soft, slow-drifting **warm** light over the video, reusing the firelight palette so the hero and the page glow feel of a piece. (`glow-breathe` is defined in D6's `styles.css` and is a global keyframe, so it's available here; its reduced-motion `animation: none` is already folded into the block above.) CURRENT (`index.html:353-366`):
```css
      .hero__spotlight {
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        background: radial-gradient(
          ellipse at 50% 38%,
          transparent 0%,
          transparent 30%,
          rgba(26, 26, 26, 0.45) 70%,
          rgba(26, 26, 26, 0.85) 100%
        );
        mix-blend-mode: multiply;
      }
```
NEW (warm firelight spotlight — same selector, so it wins by living in the same later-loading in-page block):
```css
      .hero__spotlight {
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        background: radial-gradient(60% 50% at 50% 35%, rgba(var(--glow-color, 212, 175, 122), 0.25), transparent 70%);
        mix-blend-mode: screen;
        animation: glow-breathe 18s ease-in-out infinite;
      }
```
(Leave the existing `.hero__media` `will-change`/`transition` and the `@supports (animation-timeline: scroll())` counter-scroll at `index.html:368-378` — they're compatible with the `<img>`→`<video>` swap: the video fills `.hero__media` and parallax-scales with it.)

**DESIGN-EXPLORATION (for the design test phase — Sean's eye; not blockers):**
- Baseline (above) = scrim + drifting spotlight over the video.
- Richer options to try on render: a **frosted-glass panel** behind the hero text (the 360-design technique: `backdrop-filter: blur()` on a partial overlay) for extra contrast/sophistication; a **Hyperframe**-driven layer (`.agent/CLAUDE_DESIGN_HYPERFRAMES_SKILL_SUB.md`) keyed to the sunrise/sunset beats; tying the page `--glow-color` to the hero's warm tone.
- These are exploration, not required for the build to ship; the baseline is complete and testable.

RENDER-TUNE: spotlight intensity/position, overlay strength for text contrast over the moving video, and mobile autoplay behavior (poster shows until interaction is acceptable on mobile).

---

## D8 — Placeholders + content-gated polish (EXECUTABLE) — was §3.8

**Placeholder principle:** build/test on production-grade placeholders that mimic the GPT-validated real-asset specs (existing AI pipeline). **Real content is never a build/test gate**; the client adds it by chat after handoff.

**Placeholder set must cover the full media test matrix** (so D3/Phase 7 render is provable without real assets) — see `v1_6_2_ADDENDUM_TESTING.md`:
- a product with a **GIF-like** video (`autoplay:true, loop:true` → silent, no controls),
- a product with a **click-to-play** video (controls, sound, no autoplay),
- a product with a **YouTube** item,
- a product with **images only** (no `media`),
- a product with **no media at all** (section stays hidden).

**Replace the placeholder Rickroll embed:** the static YouTube id `dQw4w9WgXcQ` at `product.html:252` is removed when parent Phase 7.2 swaps the static media block for `[data-product-media]`; the YouTube placeholder content then comes from a placeholder product's `media` item, not hardcoded markup.

Post-handoff: a design feedback round once real imagery/copy land (the client's, by chat).

---

## Appendix — relationship to v3.0.0 (the homepage experience)

The original interactive vision (theatrical "spotlight on scroll," candlelight load, scrolly-telling down the homepage, theme rotation) is **not** folded here — it is the seed of a **separate v3.0.0 initiative** (`assets/docs/archive/v3_0/v3_0_0_HOMEPAGE_EXPERIENCE.md`) that can ride the gap-review flow alongside or right after v1.6's, so the client can start managing products now while the leveled-up homepage is planned. The only piece of that spirit pulled into *this* build is the hero's theatrical layering (D7), because the asset and the hero already exist.
