# v3.2.0 — Gap Review D (design-correctness)

**Reviewer lens:** (a) North Star — /admin must do everything the GPT can, polished + clear; (b) design-correctness — does it RENDER right, is it ACCESSIBLE / RESPONSIVE / spec-matching. Home turf = the "columns-bug" class (a spec that applies cleanly but renders wrong/incomplete). Bar = "concrete enough to build + correct + accessible," not final pixels. Settled base not re-litigated; ledger 1–44 not re-raised.

**Scope read:** all four v3.2.0 docs end-to-end (IMPLEMENT, ADDENDUM_DESIGN, ADDENDUM_TESTING, REVIEW_PROMPTS incl. the 1–44 ledger) + every repo file the design touches — `admin/index.html` (full), `assets/js/admin.js` (key regions), `assets/css/styles.css` (hero), `index.html` (hero), `assets/js/product.js` (populateMedia). Anchors verified against the working tree, not the docs' drifted line hints. Runtime-dependent points are flagged, not asserted; no finding re-raises a ledger entry (1–44).

**Verdict up front:** NEEDS ANOTHER PASS — but a light, surgical one. The build is fundamentally sound; the findings are small and local. One is a genuine rendering bug in the marquee homepage feature (#1), two are load-bearing executability/honesty gaps (#2, #4), one is a concrete mobile breakage (#3). None are architectural.

---

```
  Outcome: NEEDS ANOTHER PASS (light/surgical — nothing architectural).

  10 ranked findings, the load-bearing ones:
  1. Headline — Lottie title collapses to zero height. Under .has-lottie, both .hero__title children
  go position:absolute, so the wrapper has no in-flow content → height 0 → the write-on renders
  invisible and the <p>/CTA jump up. It's pure CSS box-model (not a runtime guess), and it only
  breaks in the success path while every fallback looks fine. One-line fix: color: transparent on the
  in-flow <h1> instead of the absolute-clip.
  2. renderProductList's P0/P2 rewrite is prose-only over code that contradicts it (current reuses
  .pill.shipped for live + .pill.unsent for sold — the exact "sale = red error" thing P2 removes) →
  needs a byte-anchored block like everything else.
  3. P5 mobile .img-url-row mis-stacks the new 5-cell row (URL + Remove land in the 40px column).
  4. Hex-sweep is scoped to the stylesheet, but admin.js adds raw hex (updateCoverage's
  #2f7d52/#8a5a00 literally equal the token values) → contradicts TESTING item 24's grep-able "no raw
  hex remains."
  
  Then filtered-empty copy, label a11y on the new inputs, faint-text contrast (flagged to verify),
  and three low doc-hardening notes.

  I also recorded a "what's solid" section so the fold doesn't second-guess the verified parts (all
  WS5 anchors, the token mechanics, the media-shape round-trip, the fallback guards). No finding
  re-raises a ledger entry (1–44); runtime-dependent points are flagged, not asserted.
  
  The B/C/D batch can now fold #1–#4, fix #5–#7, harden #8–#10, bump, and re-spin per the loop.
```

---

## Ranked findings

### 1. [HEADLINE] `.has-lottie` collapses the hero title to zero height — the Lottie write-on renders invisible in its success path
**Location:** `ADDENDUM_DESIGN.md` §5.1, the a11y/reduced-motion CSS (the `.hero__title` block + the `.has-lottie` clip rule) and the wrapper markup; against `index.html:169-173` (`.hero__content`) + `styles.css:969-979` (`.hero__content` is plain block, `.hero h1` descendant).

**The gap (CSS-deterministic, not a runtime guess):** the wrapper has exactly two children — the `<h1 class="hero__title-text">` and `<div class="hero__title-lottie">`. The Lottie div is `position:absolute; inset:0`. The `.has-lottie` rule makes the `<h1>` `position:absolute` too (the visually-hidden clip idiom). So once `.has-lottie` is added, **both** children are out of flow, `.hero__title` has no in-flow content and no explicit height → it **collapses to height 0**. `.hero__title-lottie{inset:0}` then resolves to a 0-height box, and `svg{height:100%}` → the SVG renders at height 0 (the design's own `.hero__title-lottie svg{width:100%;height:100%}` confirms the Lottie takes its size from the container, not vice-versa). Net: the visible title disappears (h1 clipped + Lottie 0-height) and the `<p>` + CTA jump up to fill the gap. `.hero` is `min-height:80vh` so the hero doesn't shrink — the title just vanishes.

The cruel part: this fires in the **success** path (motion enabled, JSON valid, SVG mounts a `path` → `.has-lottie` added). The fallbacks (reduced-motion, 404, no-JS) all keep the `<h1>` in flow and look correct — so testing the fallbacks passes while the actual animation case is broken. (Before `.has-lottie`, the in-flow `<h1>` gives the box height and the Lottie overlays it fine — so the bug is specifically the hide step.)

**Concrete fix:** keep the static `<h1>` in normal flow so it always defines the box, and hide only its **ink** (not its layout/a11y) once the Lottie draws. Replace the absolute-clip `.has-lottie` rule with:
```css
@media (prefers-reduced-motion: no-preference) {
  .hero__title.has-lottie .hero__title-text { color: transparent; }  /* stays in flow + a11y tree; absolute Lottie overlays it */
}
```
`color:transparent` keeps the text in the box (preserves height + the `.hero h1 { margin-bottom }` spacing to `<p>`), keeps it in the a11y tree and DOM for SEO/SR, and lets the absolute Lottie draw on top. (Alternatives: give `.hero__title` a reserved `min-height`, or make `.hero__title-lottie` the in-flow element sized by the title's aspect-ratio and absolutely-position only the `<h1>` — but `color:transparent` on the in-flow `<h1>` is the one-line, lowest-risk fix.) Verify on the preview with motion enabled + a real JSON.

### 2. P0/P2 `renderProductList` rewrite is prose-only, sitting on top of code that contradicts the new spec
**Location:** `ADDENDUM_DESIGN.md` §4.2 P0 (filter) + P2 (badge); against `admin.js:235-261` (current `renderProductList`).

**The gap:** the current `renderProductList` builds **two** pills with its own inline predicate (`admin.js:247-252`): "live" reuses `.pill.shipped` (a green *shipped* class) and "sold" reuses `.pill.unsent` (a red *email-not-sent* class) — exactly the semantics P2 sets out to replace (F12: "a sale is GOOD — not a red error"). P2 wants ONE `.pc-badge` from `productState(p)`, the `is-archived` dim class, and price demoted to quiet meta. The design supplies `productState` / `matchesProductFilter` / `wireProductSubtabs` **verbatim**, but does **not** byte-anchor a NEW `renderProductList` — so the badge/filter/`is-archived`/meta rewrite is left to reconstruct over code that actively contradicts it. P0 and the P4 skeleton were both explicitly byte-anchored "so two builders don't diverge"; this load-bearing visual (the headline WS4 win) is the one spot that isn't. Risk: a builder ADDS the badge but leaves the old two-pill meta line → doubled/contradictory status, or keeps `.unsent` "sold."

**Concrete fix:** add a byte-anchored CURRENT/NEW for `renderProductList` (lines ~242-260): filter `state.products` via `matchesProductFilter`; render the single `.pc-badge` node from `productState(p)` with the `.pill.<state>` class; add `is-archived` when `p.archived_at`; move `available`/`quantity`/price to quiet `.pc-meta` (no second status pill); show the empty state when `shown.length===0` (see #5). Explicitly note the old `.pill.shipped`-for-live and `.pill.unsent`-for-sold reuses are removed.

### 3. P5 mobile `.img-url-row` rule mis-stacks the new 5-cell image row
**Location:** `ADDENDUM_DESIGN.md` §4.2 P5 (`.img-url-row{grid-template-columns:40px 1fr;grid-auto-flow:row}`); against the 5-cell row from IMPLEMENT 3.7a (thumb · role · url · alt · remove → desktop grid `40px 64px 1fr 1fr auto`).

**The gap:** P5's mobile rule was sized for a narrower row, but 3.7a adds a 5th cell (the thumbnail). With `grid-template-columns:40px 1fr` + `grid-auto-flow:row` and **five** auto-placed children, items fill 40px,1fr,40px,1fr,40px → the **URL input and the Remove button land in the 40px column** (items 3 and 5), squished to ~40px and unusable at phone width. (`grid-auto-flow:row` doesn't make the 40px thumb span rows.) Responsive usability at ≤640px is an explicit Angle-D mandate + TESTING item 28.

**Concrete fix:** stack cleanly at ≤640px — either `.img-url-row{grid-template-columns:1fr}` (full single-column stack), or keep the 40px thumb with explicit placement (`grid-template-columns:40px 1fr` and assign the thumb `grid-row:1/span 4`, the rest into column 2). Verify at 360px.

### 4. Token literal-sweep scope vs TESTING item 24's "no raw hex literals remain"
**Location:** `ADDENDUM_DESIGN.md` §4.1 (the sweep is scoped to `admin/index.html`'s inline `<style>`) vs `ADDENDUM_TESTING.md` item 24 ("no raw hex literals remain") + the new admin.js inline styles.

**The gap:** WS3.7 introduces new raw hex **inside `admin.js` template strings**, which the §4.1 stylesheet sweep never visits: the rewritten `addImageRow` keeps `color:#666` (IMPLEMENT 3.7a, the `.img-role` span); `addMediaRow` hardcodes `#eee`/`#ccc` borders (3.7b); `updateCoverage` hardcodes `#2f7d52` / `#8a5a00` (3.7a) — which are **literally the `--c-success` / `--c-warn` token values** from §4.1. After the full build, admin.js still contains raw hex, so item 24's blanket assertion (gradeable by `grep`) fails as written. (The defensive `var(--c-token, #hex)` fallbacks in the refund/coupon inline styles are a separate, acceptable pattern — call those out so they aren't mistaken for the offenders.)

**Concrete fix:** either (a) extend the sweep into those admin.js spots once §4.1 lands — `#666`→`var(--c-text-muted)`, `#eee`→`var(--c-surface-2)`, `#2f7d52`/`#8a5a00`→`var(--c-success)`/`var(--c-warn)` — or (b) honestly scope item 24 to "no raw hex in the stylesheet; admin.js inline styles use tokens (with optional `var(--c-x, #hex)` fallbacks)." (a) is the cleaner, do-it-once option and removes the token/literal duplication in updateCoverage.

### 5. Product-list empty state can't tell "no products" from "none match this filter"
**Location:** `ADDENDUM_DESIGN.md` §4.2 P0 ("show the `.empty` state when `shown.length===0`"); against `admin.js:238` ("No products yet. Click \"New Product\"…").

**The gap:** P0 reuses the existing `.empty` copy, which reads "No products yet. Click New Product" — wrong and confusing when a filter (e.g. **Archived** with nothing archived) yields zero but products exist. The orders list already handles this correctly ("No orders match this view," `admin.js:684`); the product filter should match that honesty.

**Concrete fix:** in the rewritten `renderProductList` (#2), branch the empty copy — `state.products.length===0` → "No products yet…"; `state.products.length>0 && shown.length===0` → "No products match this filter."

### 6. A11y: the new admin inputs lack programmatic labels
**Location:** `ADDENDUM_DESIGN.md` §4.2 P3d upload-zone markup; IMPLEMENT 3.7b media-row markup.

**The gap:** the seven upload zones use a sibling `<label>Hero</label>` that does **not** wrap or `for`-associate its `<input type="file">` — so clicking the label does nothing and SR users get no zone name beyond the browser default ("Choose File"). The structured media rows' `.m-url` / `.m-poster` / `.m-alt` inputs are **placeholder-only** (no label) — placeholder-as-label disappears on input and is low-contrast. For the "genuinely polished + accessible" reusable-template bar, both should match the form's existing wrapping-`.field` pattern.

**Concrete fix:** wrap each zone's file input inside its `<label>` (or `<label for>`+`id`), and give `.m-url`/`.m-poster`/`.m-alt` a visible label or at minimum `aria-label`. The video-opts checkboxes are already correctly labeled (wrapped in `.checkbox-row` labels) — match that.

### 7. Faint-text contrast falls below WCAG AA for empty-state body copy (verify)
**Location:** `ADDENDUM_DESIGN.md` §4.1 `--c-text-faint:#8a929e` used by §4.2 P4 `.empty{color:var(--c-text-faint)}`.

**The gap (flag — verify the exact ratio):** `--c-text-faint` (#8a929e) on `--c-bg`/`--c-surface` (#f6f7f9/#fff) computes to roughly ~2.7:1 — below the 4.5:1 AA threshold for normal-size body text (the `.empty` block inherits `--fs-base` ≈15px). Faint placeholders are partially exempt, but empty-state copy is real content. Contrast in the admin redesign is a charter-named check.

**Concrete fix:** use `--c-text-muted` (#5b6573, ~5:1) for `.empty` body copy, or darken `--c-text-faint` to ≥ ~#6b7280; keep the faintest token for true input placeholders only. Confirm with a contrast checker on the preview.

### 8. P0(iii)'s consolidated wiring block doesn't mention 3.7b's `add-media-row` binding (merge hazard)
**Location:** `ADDENDUM_DESIGN.md` §4.2 P0(iii) consolidated `attachEventListeners` diff; vs IMPLEMENT 3.7b ("wire the add button," same `admin.js:152` anchor).

**The gap (low — applied in fold order it composes; the risk is the framing):** both edits touch line 152. In fold order P0(iii) rewrites the block keeping `$('add-image-row')`, then 3.7b finds that surviving anchor and inserts `$('add-media-row')` after it — so applied as written, both land. But P0(iii) is framed as "ALL FOUR WS4 init deltas in ONE diff… One block, so 1→6 can't miss any," which could lead a builder to treat its NEW as the complete final state of lines 152-161 and drop the WS3 `add-media-row` line → the "Add video" button never binds → /admin can't add MP4/YouTube clips (a media-parity regression, the exact North-Star failure class). P0(iii) already disclaims the coupon 2.1e wiring as applied separately; it's silent on 3.7b.

**Concrete fix:** either include `$('add-media-row').addEventListener('click', () => addMediaRow(null));` in the P0(iii) NEW block, or add a one-line disclaimer like the 2.1e one ("3.7b wires `add-media-row` at its own anchor").

### 9. The state-legend (P2/F18) has no insertion anchor or emission logic
**Location:** `ADDENDUM_DESIGN.md` §4.2 P2 state-legend ("render a one-line key above the product grid").

**The gap (low):** the legend's HTML + CSS are concrete, but unlike P0 and the skeleton — both explicitly byte-anchored precisely "so two builders don't diverge" — the legend says only "above the product grid" with no insertion point and no toggle logic ("when subtabs are active" / "hide on All"). It's trivially buildable as static markup, but the inconsistency is exactly the executable-design gap the round keeps closing elsewhere.

**Concrete fix:** anchor it — drop the static `<div class="state-legend">` in `admin/index.html` right after `#product-subtabs` and before `#products-list` (labels are static, so no JS needed), and mark the All-tab hide as render-tune.

### 10. [watch] P2's new `.pill` base rule drops `display:inline-block`
**Location:** `ADDENDUM_DESIGN.md` §4.2 P2 (`.pill{border-radius:var(--r-pill);padding:3px 9px;font-size:var(--fs-xs);font-weight:var(--fw-semibold)}`); vs `admin/index.html:68` (`.pill{display:inline-block;…;background:#eee;…}`).

**The gap (low / depends on edit style):** if a builder retypes the `.pill` base rule wholesale from P2 rather than editing it in place, `display:inline-block` is lost — and the inline pills (order `.shipped`/`.unsent`, the product meta pills) need inline-block for their padding to render correctly. The `.pc-badge` overlay is `position:absolute` so it's unaffected, but the inline pills aren't.

**Concrete fix:** keep `display:inline-block` in the merged `.pill` rule (state it explicitly in P2 so the rule reads as additive, not a replacement).

---

## What's solid (verified, not flagged)

- **WS5 anchors all correct:** `.hero h1` is a descendant selector at `styles.css:975` (the `.hero__title` wrap keeps it matching); `--font-display`/`--text-5xl` present at `:51`/`:63`; the three hero URL edits land at `index.html:161` (poster) / `:162` (src) / `:379` (reduced-motion bg); `homepage.js` is `defer` at `:89`; the `<h1>Step into Elsewhere</h1>` copy is verbatim at `:170`; `.hero__overlay`/`.hero__spotlight`/`.hero__glow` preserved (markup 165-167). The reduced-motion / 404 / no-JS Lottie fallbacks are correctly guarded (`data_failed` + the `svg path` mount check). Only the `.has-lottie` hide step (#1) is wrong.
- **Token sweep mechanics (stylesheet):** the two `#222` rules (`button.primary`, `.subtab-btn.active`, `admin/index.html:25,34`) are accent backgrounds → `--c-accent` is the correct map (ledger 33); the `.upload-row` orphan-CSS cleanup (`:63-64`) is correctly called out; the focus-visible ring (`:focus-visible`) closes a real a11y gap.
- **Media editor:** `collectMedia`/`addMediaRow` emit the exact `{type,url,autoplay?,loop?,controls?,poster?,alt?}` shape `product.js` `populateMedia` reads (`:249-258`); the `controls` toggle closes the last /admin↔GPT video-flag gap (ledger 43). Role regexes (`:415` gallery, `:576` hero) unchanged.
- **Fold order + fallbacks:** WS1-3 inline styles use `var(--c-token, fallback)` so they render before §4.1 lands (deliberate); the refund/coupon/skeleton/upload-zone CSS and the P4 skeleton's reduced-motion guard are all concrete. Loading/empty/error states exist for coupons, the refund panel, and orders.

---

## Single most important fix

**#1 — the Lottie `.has-lottie` zero-height collapse.** It's the only finding that ships a *wrong render* (not just an under-specified or honesty gap), it breaks the marquee homepage feature in exactly its success path while every fallback looks fine, and it's CSS-deterministic. One line — `.hero__title.has-lottie .hero__title-text { color: transparent; }` instead of the absolute-clip — fixes it while preserving SEO/SR/layout.

## One-line verdict

**NEEDS ANOTHER PASS** (light/surgical — fold #1–#4, fix the states/a11y in #5–#7, harden #8–#10; nothing architectural).
