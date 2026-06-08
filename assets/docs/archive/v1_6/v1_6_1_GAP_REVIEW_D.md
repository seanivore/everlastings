# GAP REVIEW — Angle D (holistic design correctness) — v1.6.1

**Scope:** `v1_6_1_ADDENDUM_DESIGN.md` (D1–D8) read against the repo it edits + `v1_5_0_FEEDBACK.md` + parent Phase 7/7.2 + `v1_6_1_ADDENDUM_TESTING.md` Part T2. Lens: whole-build design correctness, completeness, and exclusive-executability — not a re-run of the closed functionality A-loop. Findings only; nothing changed.

**Headline:** the spec is mostly sound and several of its riskiest cascade claims check out (D1 columns fix, D3 class contract, D6 glow stacking, D4 shop.js safety — all verified correct below). But there is one true *silent would-render-wrong* (D7 hero spotlight), one layout/intent + accessibility miss on the primary product page (D2), and one global-token over-reach (D5), plus a cluster of smaller under-specifications. Net verdict at the end.

---

## Ranked findings

### D-1 · HIGH · D7 — the hero "spotlight" warm glow is dead on arrival (cascade) · `index.html:353-366` vs `assets/css/styles.css`

**What's wrong (columns-bug-class — applies cleanly, renders wrong).** D7 says "the `.hero__overlay` scrim + `.hero__spotlight` already exist" and "Activate the existing `.hero__spotlight`," then supplies a new rule: a **warm**, `mix-blend-mode: screen` radial that **breathes** (`animation: glow-breathe 18s`). But `.hero__spotlight` is *already an active, different effect*: `index.html:353-366` declares it as a **dark** `mix-blend-mode: multiply` vignette with **no animation**, inside the page's in-body `<style>`. That in-body block loads *after* `styles.css` (head `<link>` at `index.html:71`), and both rules have identical specificity `(0,0,1,0)`, so **source order decides — the in-page vignette wins.** If the builder adds D7's rule to `styles.css` (the natural reading — D7's own reduced-motion block says "add to `styles.css`"), the warm breathing glow never paints; the page keeps the old vignette. The requested theatrical hero layer silently does not appear, and the spec's premise ("activate the existing spotlight") is factually wrong — it's not inert, it's a conflicting live rule the spec never mentions removing.

**Concrete fix.** Make D7 **replace** the rule at `index.html:353-366` in place (edit that in-page block so the warm-glow rule is the one that wins), or delete the in-page `.hero__spotlight` rule *and* add the new one to `styles.css`. Either way the spec must explicitly name the existing vignette rule and say "replace, don't add." While there, reconcile reduced-motion: the in-page block already has `@media (prefers-reduced-motion){ .hero__media { animation/transition/transform: none } }` (compatible, different properties) and D7 adds `.hero__video{display:none}` + `.hero__spotlight{animation:none}` — keep both, but the spotlight reduced-motion line is moot until the override above is fixed.

*(Note, not a blocker: the existing `.hero__media { will-change; transition }` + the `@supports (animation-timeline: scroll())` counter-scroll on `.hero__media` are compatible with the img→video swap — the `<video>` fills `.hero__media` and parallax-scales with it. Leave them.)*

---

### D-2 · MED-HIGH · D2 — sticky behavior + DOM source order don't fully meet FEEDBACK #3/#8 · `product.html` layout + `assets/css/styles.css:885-890`

Two related issues in the product-page grid.

**(a) The BUY card stops following before the left column ends.** The buy `.product-sticky-card` is assigned `grid-area: card`, which spans only rows 1-2 (`"gallery card"` / `"story card"`). A `position: sticky` grid item is bounded by its **grid area**, so the card sticks through gallery + story, then **releases at the media row (row 3)** — the BUY button is *not* in view while the user looks at the media. FEEDBACK #3 is explicit: "keeping the BUY button in view, as they look at the rest of the elements in the left column" (and the left column now includes the media). Separately, `.product-details` is placed top-right (good) but in row 3, **not sticky** — so it does not "follow the user" either, also contrary to #3 ("these two components in the right column will follow the user as they scroll").

**(b) The primary CTA is buried in DOM/reading/focus order on mobile.** After D2's moves the DOM source order is `gallery → story → media → card → details`, but the mobile **visual** order (grid areas) is `gallery → card → story → media → details`. So the BUY card is **4th in DOM** (after the video/YouTube controls) while **2nd visually**. Keyboard and screen-reader users hit the media controls before Add-to-Cart/Buy-Now (WCAG 1.3.2 Meaningful Sequence / 2.4.3 Focus Order), and it diverges from FEEDBACK #8 ("featured images first and the sticky card after").

**Concrete fix.** (a) Decide with Sean whether card+details should follow through the *whole* left column. If yes, give the right column a single sticky track that spans all left rows — e.g. areas `"gallery right" / "story right" / "media right"` with a `.product-aside` wrapper holding card+details and `position: sticky` on the wrapper (accepting the tall-details caveat: a sticky element taller than the viewport can't fully show). (b) Regardless of (a), **relocate `.product-sticky-card` to be the 2nd DOM child** (immediately after `.product-gallery`) so source order matches the mobile visual order and the BUY CTA isn't behind the media in reading/focus order — grid-areas keep the desktop visual identical, so this move is purely beneficial and costs nothing. D2's current move-list (unwrap story, relocate media after story, move details in) leaves the aside where it is; add "move the aside up."

---

### D-3 · MED · D5 — the token change reaches far past "cart/checkout/cards" · `assets/css/styles.css:76-77, 196-208, 187-193, 362-368`

**What's wrong.** D5 is framed as "scale spacing down on desktop so cart/checkout/cards don't push content below the fold" and is implemented by redeclaring `--space-2xl`/`--space-3xl` at `≥1024`. But those tokens are referenced widely, so the change *also* retunes, on every desktop page:

- `--container-padding` at `≥1024` (`= var(--space-2xl)`, `styles.css:202`) → **horizontal page gutters shrink** (3rem → 2.25rem), and at `≥1440` (`= var(--space-3xl)`, `:207`) → 4rem → 3rem.
- All `.section` vertical padding (`= var(--space-2xl)`, `:188-189`), `.section-loose` (`= var(--space-3xl)`, `:193`), and footer `padding`/`margin-top` (`:366-367`).

So D5 changes site-wide horizontal gutters and global vertical rhythm — not just the dense components it names. That can read as "cramped" on large screens and is arguably at odds with "keep the already-beautiful site intact."

**Concrete fix.** Either (a) **accept it as a global density pass** and render-check the *whole site* at 1280-1440px (not just cart/checkout) including the narrower gutters, or (b) **scope the reduction to the specific components** (cart/checkout/cards) instead of the global tokens. Also correct the D5 prose per D-4 (the shop-layout-gap claim is wrong). *(Placement note: D5's `@media(min-width:1024px){:root{…}}` must be appended after the existing `≥1024 :root` block at `:201-204` so it wins; if a builder drops it at end-of-file that's satisfied, but say so.)*

---

### D-4 · LOW-MED · D1/D2/D5 — inline `gap` overrides the page `<style>` desktop gap (same class D1 fixes for columns) · `product.html:162`, `shop.html:164`

**What's wrong (rule that doesn't win).** D1 correctly removes the inline `grid-template-columns` so the `<style>` columns win — but leaves the inline **`gap`**: `product.html:162` keeps `gap: var(--space-2xl)` and `shop.html:164` keeps `gap: var(--space-xl)`. Inline styles beat any stylesheet selector regardless of media query, so the desktop gap declarations in the page `<style>` blocks — `.product-layout{… gap: var(--space-3xl)}` at `≥1024` (`product.html:448`) and `.shop-layout{… gap: var(--space-2xl)}` at `≥1024` (`shop.html:372`) — **never apply.** Consequently D5's statement that it "tightens … the shop `.shop-layout` gap (`--space-2xl`)" is **false** — the shop gap is locked to inline `--space-xl` and D5 doesn't touch `--space-xl`. Visual impact is small, but this is precisely the cascade trap this review hunts, and the spec's NEW D2 `<style>` carries a gap line that can't win.

**Concrete fix.** Remove `gap` from both inline styles too, and let the `<style>` own gap end-to-end: add a base `gap` to the base `.product-layout` rule (e.g. `gap: var(--space-2xl)`) and `.shop-layout` rule (`gap: var(--space-xl)`) and keep the `≥1024` overrides. Then both the mobile gap and the desktop-tighter gap come from one place and the breakpoint wins.

---

### D-5 · LOW · D2 — stacking-era inline margins survive the move; only `.product-details` is flagged · `product.html:265`, `:158-166`, `:279-281`

**What's wrong.** Once the blocks become grid items with `gap`, their old stacking-flow `margin-top`s double up (gap + margin). D2's RENDER-TUNE note flags this for `.product-details`, but **`.story-card` carries the same inline `margin-top: var(--space-3xl)`** (`product.html:265`) and isn't mentioned — so the story will sit with `gap + 3rem` above it in row 2 (uneven vs the gallery/media rhythm). Secondary: the HTML comments "LEFT COLUMN: gallery + story" / "RIGHT COLUMN: sticky details card" (`product.html:158-166`, `:279-281`) describe a two-`div` structure that D2 deletes — after the unwrap they're misleading.

**Concrete fix.** Add `.story-card`'s inline `margin-top` to the trim list (drop it or replace with a grid-friendly value), and update/remove the now-inaccurate column comments so the source reflects the flat grid.

---

### D-6 · LOW · D3/Phase 7.2 — autoplay ("GIF-like") product video isn't covered by `prefers-reduced-motion`

**What's wrong (completeness across states).** `populateMedia` (parent `:2411-2415`) sets `autoplay:true` for GIF-like clips irrespective of the user's reduced-motion preference. The reduced-motion handling in the testing/design addendums (T2.4) covers only the firelight glow + hero spotlight. An autoplaying looping video is motion, so a reduced-motion user still gets it. This straddles design/functionality, but reduced-motion is a design/a11y cross-cut, so it belongs in the holistic pass.

**Concrete fix (decide).** Either have GIF-like clips honor reduced-motion (don't autoplay → show controls/paused poster — a few lines in `populateMedia`), or state explicitly that decorative looping product video is intentionally out of reduced-motion scope. FEEDBACK #6 wants the silent looping MP4, so a documented decision is fine; the gap is that it's currently unaddressed.

---

### D-7 · LOW · D2/D3 — the "no media" state leaves a double gap in the grid · `product.html` (post-7.2 container)

**What's wrong.** The media container ships `class="product-gallery__media hidden"` and stays `display:none` when empty (correct). But as a named grid area it still sits between siblings: on mobile the two surrounding row-gaps collapse into a visibly **double** gap (story ↔ details), and on desktop the row-3 left cell is empty next to details. Purely cosmetic, and only when a product has no media.

**Concrete fix.** Render-check the images-only / no-media products from the D8 matrix; if the gap reads oddly, it's harmless but trivially tightened. Render-tune, not a blocker — flagged for completeness because the spec doesn't mention the empty-area behavior.

---

### D-8 · LOW · D8/T2.1 — the media-matrix placeholders aren't specified to zero-guesswork

**What's wrong (exclusive-executability).** D8 + T2.1 enumerate the five media **shapes** (GIF-like, click-to-play, YouTube, images-only, no-media) but not *which* placeholder product carries *which* shape, the concrete media URLs, or the YouTube placeholder id — and D8 explicitly says the YouTube content must come from a placeholder product's `media`, not markup. The existing CDN `test_video-01-…mp4` covers the video case, but the per-product `media` arrays, a real YouTube id, and the seed mechanism are left for the builder to invent.

**Concrete fix.** Name the placeholder→shape mapping + the concrete URLs/ids (or the `createProduct`/seed call) so the matrix is buildable without discovery. Low severity (it's test-fixture setup), but "no discovery left to the builder" is the bar.

---

### D-9 · LOW · note — build-order coupling on `product.html`

Phase 7.2 (verbatim replace of `product.html:235-258`), D1 (`:162`), and D2 (`:442-450` + block moves) all edit `product.html`, and each shifts the others' line numbers. The spec correctly states the 7.2 → D2 order (D2 relocates the very block 7.2 replaces). Reinforce in the build notes: **run 7.2 before D2**, and apply every product.html edit by its verbatim CURRENT-block content, not by raw line number, since earlier edits move later lines.

---

## Render-pass watch items (not blockers; for the design feedback pass)

- **Gallery hero height (FEEDBACK #2).** The gallery main image is `aspect-ratio: 4/5` (`product.html:182`). At the desktop left-column width (~770px) that's ~960px tall — very dominant. FEEDBACK #2 wanted "half the top of the page." Confirm on render whether the hero needs a `max-height`.
- **Story-card size (FEEDBACK #4).** D3 keeps `font-size: var(--text-lg)` (18px); FEEDBACK asked it to "feel like main page text" (body is `--text-base`, 16px). Probably fine as comfortable body copy — eye-check it.
- **Glow visibility (D6).** The `z-index:-1` glow shows through transparent sections but is covered by opaque cream `.section`s (e.g. homepage featured strip) and the cream header/footer. Confirm the ambient bleed reads on content-dense, cream-section pages.
- **Filter open/closed defaults + caret (D4).** Series `open`, others closed; the `+`/`–` caret. Sean's eye.
- **Preview-mode disabled controls.** The design addendum doesn't style a "Preview only" disabled state; the existing `.btn[disabled]` (`styles.css:458-466`) covers a greyed button if the parent disables buy controls in preview. Confirm that reads as intentional, not broken.

---

## Verified correct (cascade/contract checks that PASS — credit where due)

- **D1 columns fix wins.** Removing inline `grid-template-columns` lets the `<style>` rules own columns: `product.html:444-448` (`1fr 360px` / `1fr 400px`) and `shop.html:368-372` (`220px 1fr` / `240px 1fr`) exist and have nothing overriding them once the inline value is gone. Mobile stays single-column. ✓ (gap is the separate D-4 issue.)
- **No duplicate `.product-layout`/`.shop-layout`.** Neither class is declared in `styles.css` (or any other CSS) — only inline + the page `<style>` blocks. D2's "don't add a second rule" concern has nothing to collide with. ✓
- **D3 class contract matches `populateMedia` exactly.** Parent `:2391-2441` emits `<div class="product-media__item"><video…></div>` and `<div class="product-media__item product-media__item--embed"><iframe…></div>` inside `<div class="product-gallery__media" data-product-media>`. D3's selectors (`.product-media__item video`, `.product-media__item--embed`, `.product-media__item--embed iframe`, `.product-gallery__media`) target precisely those. MP4 gets intrinsic ratio (`width:100%; height:auto`), embeds get 16/9, YouTube sorts after MP4, empty stays hidden via the `!important` `.hidden`. ✓
- **D4 leaves shop.js untouched.** `getActiveFilters`/`wireFilters`/`initFromURL` select `[data-shop-filter]`/`[data-shop-sort]`/`[data-shop-clear-filters]` (`shop.js:48,63,159,169,181`) by attribute regardless of DOM nesting; checkboxes inside a closed `<details>` keep their `:checked` state and remain in the DOM, so collapsing a group doesn't drop its filter. `.checkbox-label` is a `display:flex` utility (`styles.css:542-555`) that works inside `<details>`. ✓
- **D6 glow stacking is right; no content-lift needed.** `body` (`styles.css:118-130`) has an opaque cream background that propagates to the canvas and is *not* a stacking context. A `z-index:-1` fixed child therefore paints **above the canvas, below normal content** — content sits correctly over it. `position:fixed` keeps it out of the body flex flow (no layout shift from `prepend`). It's covered by opaque sections/header/footer and shows through transparent ones — exactly the intended edge-bleed. ✓
- **D6 injection point is valid + universal.** `main.js:264` is the real `DOMContentLoaded` handler calling `initConfig()`; `document.body` exists there. `main.js` is loaded on **all 13** storefront pages (verified). ✓
- **D7 element exists.** `.hero__spotlight` is present at `index.html:166` (and `.hero__overlay` at `:165`, `.hero__content` at `:168`); the img→video swap target is `index.html:159-163`; homepage.js does **not** touch the hero media, so the swap breaks no JS. ✓ (the *CSS* for it is the D-1 problem, not the element.)
- **D5 token values.** `--space-2xl: 3rem`, `--space-3xl: 4rem` at `styles.css:76-77` — D5's stated current values are correct. ✓

---

## The single most important fix

**D-1 — fix the D7 hero-spotlight cascade.** It's the only finding where the spec, applied as written, *silently produces the wrong result*: the requested warm, breathing "firelight" hero layer never renders because an existing in-page `multiply` vignette (`index.html:353-366`) out-cascades it, and the spec's framing ("activate the existing spotlight") is itself wrong about the current state. Make D7 explicitly **replace** that rule in place. (D-2 — the product-page sticky/DOM-order miss against FEEDBACK #3/#8 — is a very close second and is partly a design call, so resolve it with Sean rather than silently.)

## Verdict

**NEEDS ANOTHER PASS** — one true would-render-wrong (D-1), one layout/intent + a11y miss (D-2), one global-token over-reach (D-3), and small but real cascade/spec corrections (D-4…D-9). All fixes are concrete and fold-able; nothing here is architectural, and the verified-correct list shows the spec's core is solid.
