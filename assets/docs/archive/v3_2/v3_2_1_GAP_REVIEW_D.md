# v3.2.1 — Gap Review, Angle D (design-correctness) · round 2

**Reviewer lens:** design-correctness — does the UI actually render right, is it accessible + responsive, and does it match the design addendum's spec? The "columns-bug" class is the focus: a spec that *applies* cleanly but *renders* wrong/incomplete. Findings only — no code or docs changed.

**Scope read in full:** `v3_2_1_IMPLEMENT.md`, `v3_2_1_ADDENDUM_DESIGN.md`, `v3_2_1_ADDENDUM_TESTING.md`, the settled ledger (entries 1-53), and the live repo it depends on — `admin/index.html` (inline CSS + markup), `assets/js/admin.js`, `assets/js/product.js` (populateMedia), `assets/js/homepage.js`, `assets/css/styles.css` (hero region), `index.html` (hero). Every design claim was checked against the actual code, flag-don't-assert where it depends on runtime rendering.

---

```
  Verdict: NEEDS ANOTHER PASS (narrow). One real design-correctness defect, plus minor completeness
  nits. Everything load-bearing in the redesign — token cascade, Lottie title a11y/SEO,
  reduced-motion poster, the new Coupons tab wiring, refund/coupon mobile-safety, the media controls
  round-trip — verified correct against the actual code.
  
  The one fix that matters — the structured video editor overflows on a phone. The new MP4/YouTube
  clip rows (addMediaRow) set their column grid as an inline 110px 1fr auto. The mobile breakpoint
  (P5) stacks .img-url-row and the upload zones but never mentions .media-row — and because the grid
  is inline, a media query couldn't override it even if it tried (inline wins the cascade). So at
  ~360px the URL input's min-width pushes the row past the screen edge — exactly the horizontal
  overflow TESTING item 28 says must not happen. It's the same class of bug AR#D3 already fixed for
  the image rows; the sibling video editor, added in the same build, was just left out. Fix: lift
  its inline grid into a real CSS class (like .img-url-row already is) and add it to the P5 stack —
  that also lets its inputs pick up the §4.1 border token for free.

  The minor nits: the token sweep enumerates #ddd/#666/#222 but never names a token for the a link
  color or the two order pills it keeps (.pill.shipped/.unsent) — the grep gate forces a mapping but
  leaves the builder guessing; the product-grid legend shows a Refunded swatch that productState
  never produces (it's an order pill); and P3d drops the "Upload" section heading. Two render-tune
  observations (badge sits in the card's padding corner; skeleton card is taller than the real card)
  are flagged honestly, not as blockers.

  The file is structured to fold directly: ranked findings → single most important → verdict → a
  "verified correct" list and a "not re-raised" list so the next round and the orchestrator don't
  re-litigate what I already checked.
```

---

## Ranked findings

### 1. [MOST IMPORTANT] The structured media editor (`.media-row`) will overflow horizontally on mobile — its clip-row grid is an inline `110px 1fr auto` that the P5 breakpoint neither covers nor *can* override.

- **Location:** IMPLEMENT 3.7b — `addMediaRow` (`v3_2_1_IMPLEMENT.md:1247-1259`; the inner head row at `:1249` is `<div style="display:grid;grid-template-columns:110px 1fr auto;…">`); DESIGN P5 (`v3_2_1_ADDENDUM_DESIGN.md:451`).
- **Gap (columns-bug class):** P5's `@media (max-width:640px)` stacks nine selectors (`.row-2,.row-3,.ship-form,.order-card,.img-url-row,.upload-zones,.product-list,.tabs,.subtabs`) but **not `.media-row`** — confirmed: the addendum's only `media-row` mentions are the P0(iii) button *wiring*, never CSS. And the inner type/URL/Remove grid columns are set **inline**, so even if P5 *did* add a `.media-row` rule, a media-query selector cannot override an inline `grid-template-columns` (inline wins the cascade short of `!important`). The `.m-url` input's intrinsic min-width (~150px from its default `size`) keeps that `1fr` track from shrinking, so at a narrow phone width the head row's min-width (~110 + ~150 + ~74 button + gaps ≈ 340px) exceeds the available column (~280px inside the Media fieldset at 360px) → horizontal page overflow. This is the same class AR#D3 already fixed for `.img-url-row` — but `.img-url-row` is a real `<style>` class (so P5 *can* stack it), whereas the sibling media editor added in the same build is inline and was left out of the mobile spec. TESTING item 28 asserts "no horizontal overflow" at ≤640px, so the spec-as-written produces a bug the test forbids.
- **Same root cause, second symptom:** because the media-row inputs are styled inline (`border:1px solid var(--c-border,#ccc)`), they also can't pick up §4.1's global input rule (`border:1px solid var(--c-border-strong)`) — they'll render with a slightly lighter border than every other input. One fix resolves both.
- **Concrete fix:** lift the media-row's inline grid + input styles into real classes in the inline `<style>` (e.g. `.media-row` and `.media-row__head { display:grid; grid-template-columns:110px 1fr auto; gap:6px; align-items:center }`, plus `min-width:0` on the grid's URL input so the `1fr` track can shrink), then add `.media-row__head { grid-template-columns:1fr }` to the P5 `≤640px` block — mirroring exactly how `.img-url-row` (a real class) is already stacked. The inputs then inherit the §4.1 token border for free.
- **FLAG (needs-verification):** the *overflow* depends on the browser's form-field min-content sizing — verify at 360px. The two structural facts (`.media-row` is absent from P5, and its grid is inline so a media query can't reach it) are certain from the docs.

### 2. The §4.1 token sweep enumerates `#ddd/#666/#f7f7f7/#222` but leaves several real literals to "by-role" inference with no named target — notably the `a` link color and the two retained order pills.

- **Location:** DESIGN §4.1 (`:64`); `admin/index.html:66-67` (`a{color:#06c}` / `a:hover{color:#03f}`), `:69-70` (`.pill.shipped` `#cfe/#060`, `.pill.unsent` `#fee/#800`).
- **Gap:** TESTING item 24 greps for bare hex and demands zero, so the builder *must* map these — but the addendum names no token for a link. The only existing fit is `--c-accent` (#3a4a63), which renders links as dark slate (low link affordance); there is no link-blue token. And `.pill.shipped`/`.pill.unsent` are **not dead** after P2 — orders still use them for email state (`admin.js:722-723`), yet P2 enumerates every *other* pill and never says to retoken these two in place. A builder following P2 literally could leave their hex bare (tripping item 24) or guess.
- **Concrete fix:** in §4.1, (a) name the link mapping explicitly — either add `--c-link`/`--c-link-hover` tokens or state `a`→`--c-accent` / `a:hover`→`--c-accent-hover`; and (b) note that `.pill.shipped`→success and `.pill.unsent`→danger tokens retoken **in place** (kept for the orders email pills), so the sweep doesn't leave them bare or delete them.
- **Severity:** low-medium. The blanket "replace every literal by role" + the grep gate will force *some* resolution; this just removes the guess.

### 3. The product-state legend advertises a `Refunded` swatch, but `productState` never returns `refunded` (it's an order-card pill, not a product state).

- **Location:** DESIGN §4.2 state-legend (`:205`, six swatches incl. `<span class="pill refunded">Refunded</span>`) vs `productState` (`:79-86`, exactly five: archived/draft/edits/sold/live).
- **Gap:** the legend renders above the **product** grid as a color key, but no product card is ever `refunded` (that pill lives only on order cards, IMPLEMENT 1.5b). So the key promises a state the grid never shows — mildly misleading.
- **Concrete fix:** drop `<span class="pill refunded">Refunded</span>` from the product-grid legend (keep the `.pill.refunded` rule itself — the order cards need it). `Edits` correctly stays (it *is* a product badge, listed under the Live filter).
- **Severity:** low.

### 4. P3d removes the "Upload new image" section heading wholesale; the seven zones float without a section title.

- **Location:** DESIGN P3d (`:280-336`) replaces `admin/index.html:188-229`, which includes the `<strong>Upload new image</strong>` heading + instructional `<p>`; the NEW `.upload-zones` markup drops both.
- **Gap:** each zone is self-labeled (Hero/Gallery/Detail/…), so it's not broken — but the upload area loses its section header, a small clarity/scannability loss against the FEEDBACK_ADMIN screenshots' goal of an obviously-organized panel.
- **Concrete fix:** keep a short heading (`<strong>Upload</strong>` or "Add photos") above `.upload-zones`. Render-tune; low.

### 5. Honestly-labeled render-tune nits (noted for Sean's eye, not blockers).

- The `.pc-badge` is positioned `top:var(--s-2)/left:var(--s-2)` (8px) over a `.product-card` with `padding:12px` (`admin/index.html:36`), so the badge sits in the card's padding corner, ~4px off the image's top-left rather than flush on it — likely want `var(--s-3)` (12px, = the padding). DESIGN P2 (`:194`).
- The P4 skeleton card uses `aspect-ratio:1/1` for the image block (DESIGN `:446-448`) while the real `.product-card img` is `height:140px` — cards reflow vertically when skeletons resolve. Both are explicitly render-tune; flagging only so the jump isn't a surprise on the live preview.

---

## The single most important fix

**Make the structured media editor responsive (finding #1):** lift its inline `110px 1fr auto` clip-row grid into a real CSS class and add it to the P5 `≤640px` stack, exactly like `.img-url-row`. It's the one place a v3.2.1-added component renders wrong (horizontal overflow) on a phone — the columns-bug class this lens exists to catch — and an inline grid is un-fixable by a media query, so it can't be papered over at render-tune time; it has to be structured correctly in the spec.

## One-line verdict

**NEEDS ANOTHER PASS** (narrow) — one real design-correctness defect (media-row mobile overflow) + minor token-completeness / legend / heading nits; everything else verified correct.

---

## Verified correct — checked and NOT flagged (so they aren't re-litigated)

- **Token cascade wins:** /admin is one self-contained inline `<style>`; `styles.css` never imports, so the `:root` tokens cascade to everything with no competing sheet. The `#222`→`--c-accent` map is correct (ledger 33 — the two `#222` rules are accent backgrounds + their border-colors, not body text).
- **Lottie title a11y/SEO:** real `<h1>` stays in flow via `color:transparent` on success only (ledger 49 — not the zero-height clip idiom); `prefers-reduced-motion:reduce` → `.hero__title-lottie{display:none}` → static `<h1>`; `data_failed` + `svg path` guard means 404/blocked/empty JSON leaves the real title showing. `.hero h1` is a descendant selector (`styles.css:975`), so the `.hero__title` wrapper keeps it matching; `--font-display`/`--text-5xl` both present (`:51`/`:63`).
- **Old-film hero reduced-motion:** all three URL edits are genuinely in `index.html` (`:161` poster, `:162` src, and the reduced-motion `.hero__media` background-image in the inline `<style>` at `~:379`) — the poster fallback is preserved and points at the re-graded `-v2.jpg`. Overlay/spotlight/glow layers (`styles.css:963/988`) untouched.
- **New tab is wired:** IMPLEMENT 2.1c/2.1d patch both `switchTab` and `refreshActiveTab` to add the `coupons` branch (not just the auto-wired `.tab-btn`), so the Coupons tab actually shows + loads.
- **Refund panel + coupon form are mobile-safe:** refund pieces use a single-column `display:grid` + `.checkbox-row` flex rows; the coupon form reuses `.row-3` (which P5 stacks) + a scrollable (`max-height:180px;overflow-y:auto`) picker — no uncovered wide grid in either.
- **Media round-trip renders right:** `collectMedia` (IMPLEMENT 3.7b) ↔ `product.js` populateMedia (`:252-258`) agree on the `controls` derivation (autoplay→buttonless; explicit `controls:false`→buttonless click-to-play; default→buttons), so the new `controls` toggle round-trips (AR#F16).
- **States covered:** product list has skeleton (P4) + branched empty ("No products yet" vs "No products match this filter") + error; refund panel has a loading line + fetch-failure fallback; coupon tab + picker have loading/empty/error; media editor empty = just the Add button. No skipped loading/empty/error state.
- **a11y of new inputs:** upload-zone file inputs wrapped inside their `<label>`, media inputs (`.m-url/.m-poster/.m-alt`) carry `aria-label`s, refund/coupon checkboxes are `<label>`-wrapped, `.img-thumb` is `alt=""` (ledger 52). §4.1 adds the missing input `:focus-visible` ring; `.empty` uses `--c-text-muted` (~AA), not `--c-text-faint`.
- **homepage.js coexistence:** the new Lottie init is a self-contained second `DOMContentLoaded` listener — no conflict with the existing featured-carousel listener.

## Not re-raised (settled-ledger items validated against the repo)

`#222`→accent (33), homepage.js `defer` + `.hero h1` descendant (33), the `var(--token,#hex)` admin.js fallback styles + item-24 bare-hex grep (51), `.img-url-row` mobile stack + legend anchor + `.pill` inline-block (53), the `openEditor` `#upload-status`→`.zone-msg` repoint (48), the `color:transparent` Lottie hide (49), byte-anchored `renderProductList` (50), upload-zone `<label>` nesting + `.empty` contrast (52). All verified present/correct; none re-flagged.
