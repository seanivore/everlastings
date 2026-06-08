# ADDENDUM · DESIGN — v1.6.0 (exclusively executable)

**Parent:** `v1_6_0_IMPLEMENT.md` (this is an addendum; it carries the same version and is **always** part of the same build + every gap review). **Required reading with it:** `assets/docs/EVERLASTINGS_STORE.md` + the parent. **Scope:** the presentation layer — CSS, markup structure, and render-tuned aesthetics for the pages. Behavior that ships data (the `media` model, `populateMedia`, the Phase 7.2 container, GPT schema) stays in the parent; this doc styles and arranges what that behavior produces.

> **How design is "executable" here (read once).** Design is built and validated **exactly like functionality**: the spec gives the builder concrete CURRENT/NEW blocks or concrete default values so it never *guesses* — and then, like every functionality phase, it gets a **testing + feedback pass** on the dev preview (see `v1_6_0_ADDENDUM_TESTING.md`). Render-dependent aesthetics (glow palette, density, hero treatment) ship with a **stated default** plus a **RENDER-TUNE** note; tuning them on the live render is the design test phase, not a plan gap. "Executable" means *no discovery/decision is left to the builder*, not *frozen forever*.

> ## ⭐ The lens (same North Star as the parent)
> Minimize the owner's friction to run her whole digital product by chat via her Custom GPT. The site itself is the other place we out-class a Shopify/"AI-website" feel — through a distinctive, custom **experience**. This addendum keeps the already-beautiful site intact and fills the narrow gaps the original design plan specified but the build missed (optional product video behaviors, the filter layout), fixes the one real layout bug (columns), and adds the small requested touches (filter dropdowns, ambient glow, the animated hero). The richer interactive homepage vision is a **separate v3.0.0 initiative** (see `assets/docs/archive/v3_0/`), not this build.

> **No real content is required to build or test.** Every section is exercised on **production-grade placeholder assets that mimic the GPT-validated real-asset specs** (existing AI pipeline). Real imagery/copy arrive later, by chat, after handoff. The placeholder set must cover the full media test matrix (D8 + testing addendum).

---

## D1 — Columns root-cause bug (EXECUTABLE) — was §3.1

Both pages set `grid-template-columns: 1fr` as an **inline style** on the layout div, overriding the desktop two-column rule in the page's `<style>` block (inline beats a stylesheet selector) — so both are permanently single-column on desktop. Fix = delete the inline `grid-template-columns` and let the media-queried `<style>` rule own it. Mobile stays single-column naturally (a grid with no explicit columns flows to one column).

**`product.html:162` CURRENT:**
```html
      <div class="product-layout" style="display: grid; gap: var(--space-2xl); grid-template-columns: 1fr; margin-top: var(--space-md);">
```
**NEW:**
```html
      <div class="product-layout" style="display: grid; gap: var(--space-2xl); margin-top: var(--space-md);">
```

**`shop.html:164` CURRENT:**
```html
        <div class="shop-layout" style="display: grid; gap: var(--space-xl); grid-template-columns: 1fr;">
```
**NEW:**
```html
        <div class="shop-layout" style="display: grid; gap: var(--space-xl);">
```

RENDER-TUNE: confirm on the dev preview that mobile still stacks and desktop shows two columns.

---

## D2 — Product-page layout: two-column + sticky (EXECUTABLE, structural) — was §3.2

Restores the intended layout the D1 bug flattened, plus the element order from `v1_5_0_FEEDBACK.md`. Driven by `grid-template-areas` so the desktop two-column and the mobile interleave (card between gallery and story) both come from one grid.

- **Desktop:** left = gallery → story → media; right (sticky) = the buy **card** + the **details/features**.
- **Mobile (one column):** gallery → card → story → media → details.

> **Order dependency (integration note for Angle C):** this runs **after parent Phase 7.2**, which already swaps the static `.product-gallery__media` block for the empty data-bound container `<div class="product-gallery__media hidden" data-product-media></div>`. D2 operates on that post-7.2 markup. `product.js` binds by `data-*` attributes, so relocating elements does **not** affect population.

**CSS — add to `assets/css/styles.css` (new rules; the existing sticky rule at 878-890 stays and supplies the stickiness):**
```css
.product-layout {
  grid-template-areas: "gallery" "card" "story" "media" "details";   /* mobile order */
}
.product-layout > .product-gallery        { grid-area: gallery; }
.product-layout > .product-sticky-card    { grid-area: card; }
.product-layout > .story-card             { grid-area: story; }
.product-layout > .product-gallery__media { grid-area: media; }
.product-layout > .product-details        { grid-area: details; }
@media (min-width: 768px) {
  .product-layout {
    grid-template-columns: 1fr 380px;
    grid-template-areas: "gallery card" "story card" "media details";
  }
  .product-layout > .product-sticky-card { align-self: start; } /* let the existing sticky rule work in-grid */
}
```
(The `grid-template-columns`/`gap`/`margin-top` stay inline on `.product-layout` per D1; the desktop column override above wins inside the media query. Keep the existing `.product-sticky-card { position: sticky; … }` at `styles.css:885-890`.)

**HTML moves in `product.html` (make the four blocks direct children of `.product-layout`):**
1. **Unwrap `.product-story`** (`product.html:167`, closing `</div>` at `:277`): delete the wrapping `<div class="product-story">` and its close so `.product-gallery` (`:173`) and `.story-card` (`:265`) become direct children of `.product-layout`.
2. **Relocate the media container** (the post-7.2 `[data-product-media]` div) out of `.product-gallery` to a **direct child of `.product-layout`, placed immediately after `.story-card`**.
3. **Move `.product-details`** (`product.html:321`, currently after the layout's closing `</div>` at `:316`) to a **direct child of `.product-layout`** (before its close).
4. `grid-template-columns` already removed from the inline style by D1.

RENDER-TUNE (not blockers): the sticky card keeps BUY in view; `.product-details` top margin/border may want trimming once it sits in-column.

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
(The container + `populateMedia` ship + are tested in parent Phase 7/7.2; **GIFs are retired** — an MP4 `<video loop muted playsinline>` is smaller and cleaner. The `gif-0[1-5]` `ROLE_PATTERN` entries can be retired in a follow-up; harmless if left.)

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
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="product_type" value="storybook"> Storybooks</label>
                <label class="checkbox-label"><input type="checkbox" data-shop-filter="product_type" value="printable"> Printables</label>
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
RENDER-TUNE: open/closed defaults (Series open, others closed above) and caret styling. NOTE (optional, original-intent, kept OUT of this narrow cut unless trivial): "smart-hide a filter group whose tag has only one value" — a `shop.js` enhancement, not a markup change; deferred.

---

## D5 — Desktop density (EXECUTABLE with defaults + RENDER-TUNE) — was §3.5

Scale spacing/sizing down on desktop so cart / checkout / cards don't push content below the fold at smaller desktop widths. Concrete default = tighten the large spacing tokens at the desktop breakpoint only (mobile untouched), so the change is global, reversible, and design-token-driven rather than per-component.

**Default (add to `assets/css/styles.css`):**
```css
@media (min-width: 1024px) {
  :root {
    --space-3xl: 4rem;   /* from the larger default — tighten vertical rhythm on desktop */
    --space-2xl: 2.5rem;
  }
}
```
RENDER-TUNE: the exact reductions are confirmed against the cart/checkout/card renders on the dev preview (start from the values above; adjust until nothing critical sits below the fold at 1280–1440px). Verify the values against the real token defaults in `:root` before applying (anchor: the `--space-*` scale at the top of `styles.css`).

---

## D6 — "Firelight" ambient glow (EXECUTABLE with default palette + RENDER-TUNE) — was §3.6

A warm bloom seeping inward from all four viewport edges (ref `assets/docs/archive/images/everlastings-website-red-glow.jpg`): fog-like, subtle scale "breathing," opacity drift, slow clockwise travel. One overlay element; two custom properties control it (`--glow-color` RGB triplet, `--glow-intensity`). Honors `prefers-reduced-motion`.

**Palette — drawn from the existing brand palette (BRAND_GUIDE):** Deep Plum `74,25,66` · Amethyst `155,107,158` · Soft Gold `212,175,122` · Deep Star Blue `27,58,82`. The "firelight" default leans **warm** (the reference glow is warm), so the page default blends toward Soft Gold/plum; per-page context can theme it (homepage warm-gold firelight, shop amethyst, product page seeded from the piece). These are best-thoughts defaults — confirmed/adjusted on render.

**CSS (add to `assets/css/styles.css`):**
```css
:root { --glow-color: 212, 175, 122; --glow-intensity: 0.45; } /* warm firelight default; page JS may override */
.firelight-glow { position: fixed; inset: 0; z-index: 0; pointer-events: none;
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
**Placement:** one fixed, non-interactive overlay behind content — injected once from `main.js` on every page (cleaner than editing each page's template): create `<div class="firelight-glow" aria-hidden="true">` as the first child of `<body>`. The main content wrapper gets `position: relative; z-index: 1` if a stacking fix is needed. **Per-page color (`main.js`):** set `document.documentElement.style.setProperty('--glow-color', <triplet>)` per context from the brand palette above (default warm-gold; shop → amethyst; product page → seed from the piece). Deferred: a per-product `accent_color` column feeding `--glow-color`.

RENDER-TUNE: the exact `--glow-color` per page + `--glow-intensity` are confirmed against the live effect (palette-first); the mechanism above is fixed.

---

## D7 — Animated hero (EXECUTABLE baseline + theatrical layering) — was §3.7

The hero mp4 is an actual photograph of the client's artwork that AI generation extended into a video where the **sun rises and sets**, shadows rising and falling — itself drawn from the original "theatrical lighting" homepage idea. The hero is **already CSS-ready for video** (`styles.css:953-954` styles `.hero__media video { object-fit: cover }`; `.hero__overlay` scrim + `.hero__spotlight` already exist). So this is a markup swap + a reduced-motion fallback + a light theatrical layer — not a rebuild.

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

**Reduced-motion fallback (add to `styles.css`):**
```css
@media (prefers-reduced-motion: reduce) {
  .hero__video { display: none; }
  .hero__media {
    background-image: url('https://cdn.everlastingsbyemaline.com/hero-bg-anim/hero-bg-image-not-anim.jpg');
    background-size: cover; background-position: center;
  }
}
```

**Theatrical layering (best-thoughts default; in the spirit of the artwork's moving light).** Activate the existing `.hero__spotlight` as a soft, slow-drifting warm light over the video — reusing the firelight palette so the hero and the page glow feel of a piece. Honors reduced-motion:
```css
.hero__spotlight {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(60% 50% at 50% 35%, rgba(var(--glow-color, 212, 175, 122), 0.25), transparent 70%);
  mix-blend-mode: screen;
  animation: glow-breathe 18s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) { .hero__spotlight { animation: none; } }
```

**DESIGN-EXPLORATION (for the design test phase — Sean's eye; not blockers):**
- Baseline (above) = scrim + drifting spotlight over the video.
- Richer options to try on render: a **frosted-glass panel** behind the hero text (the 360-design technique: `backdrop-filter: blur()` on a partial overlay) for extra contrast/sophistication; a **Hyperframe**-driven layer (`.agent/CLAUDE_DESIGN_HYPERFRAMES_SKILL_SUB.md`) keyed to the sunrise/sunset beats; tying the page `--glow-color` to the hero's warm tone.
- These are exploration, not required for the build to ship; the baseline is complete and testable.

RENDER-TUNE: spotlight intensity/position, overlay strength for text contrast over the moving video, and mobile autoplay behavior (poster shows until interaction is acceptable on mobile).

---

## D8 — Placeholders + content-gated polish (EXECUTABLE) — was §3.8

**Placeholder principle:** build/test on production-grade placeholders that mimic the GPT-validated real-asset specs (existing AI pipeline). **Real content is never a build/test gate**; the client adds it by chat after handoff.

**Placeholder set must cover the full media test matrix** (so D3/Phase 7 render is provable without real assets) — see `v1_6_0_ADDENDUM_TESTING.md`:
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
