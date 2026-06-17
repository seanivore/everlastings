# v3.2.2 — Angle D (design-correctness) — Round-3 findings

**Round-3 Angle-D pass on the v3.2.2 delta (B+C re-verify folds; D close).** Read all three v3.2.2 docs end-to-end (IMPLEMENT + DESIGN + TESTING), plus the live repo (`admin/index.html`, `assets/js/admin.js`, `assets/css/styles.css` hero region, `index.html` hero, `assets/js/product.js`, `assets/js/homepage.js`, `api/products.ts`, `api/upload.ts`, `api/_lib/stripeSync.ts`, `main.js`) and `FEEDBACK_ADMIN_v2_1_0.md`. No grep-jump diagnosing — every byte-anchor and cascade claim was checked against the actual file. Validated against the Settled ledger (1–61); nothing below re-raises a settled entry.

**Reviewer lens:** does the v3.2.2 UI actually render right, is it accessible/responsive, and does it match the design addendum — the "columns-bug" class (a spec that applies cleanly but renders wrong/incomplete) is home turf. Flag-don't-assert on anything not visible in code; where I could verify against the repo I say so. Scope = the v3.2.2 delta on a settled, shipped base.

---

```
  Round-3 Angle-D verdict: NEEDS ANOTHER PASS (narrow) — driven by one real, code-verified gap (#1,
  the seo_thumbnail/checkout_image zones not setting their attributes), with four low/render-tune
  items and a nit behind it. Everything load-bearing — byte-anchors, the WS5 cascade claims, media
  parity, and the prior D folds (AR#D1, AR#D-R2-1) — verified clean against the live files, so the
  narrow finding set is what's actually left.

  Two things worth flagging back to the orchestrator as you fold:

  - #1 has an in-scope judgment call. The column-not-set behavior is pre-existing in the old upload
  control, but the build rewrites that control and elevates these two roles to "first-class" (F6) —
  so it's the natural place to close it, and the fix is the one-line pattern the thumbnail zone
  already uses. If you rule it out-of-scope-as-pre-existing, the residual is render-tune-only and
  this becomes READY TO BUILD with nits. Either way it's a one-fold delta.
  - The test plan wouldn't catch #1 — TESTING item 22 checks the preview/role-tag and coverage hint,
  not whether a zone upload actually sets the attribute end-to-end. If you fold the fix, add that
  assertion so the loop doesn't have to find it again by inspection.

  No memory write needed — the finding lives in the gap-review doc (kept standing per the archive
  policy), and the round-3 status under project_v3_1_management_parity is the orchestrator's to bump
  after the fold.
```

---

## Verified clean (so the narrow verdict is trustworthy)

This build is unusually well-anchored. I checked, and these all hold against the live files:

- **Every WS4 byte-anchor matches exactly:** `renderProductList` (admin.js:235-261), `openEditor`'s `$('upload-status')` reset (:322), `closeEditor` (:325), the `:152-161` `attachEventListeners` region incl. the **unscoped** orders `.subtab-btn` loop the build correctly re-scopes to `#tab-orders`, `onUploadImage` (:358-400), `addImageRow` (:331-345), `buildProductPayload` thumbnail (:433) + media parse (:449-455), the order-card pill insertion point (:770-771), the **retained** `.pill.shipped`/`.pill.unsent` email pills (:720-723), `formatAddress` (:669-678), copy-address (:775-783), `loadOrders` "Loading…" (:651), the `.tab-btn` loop (:143), `switchTab` (:196-201), `refreshActiveTab` (:203-211).
- **The `#222 → --c-accent` claim is correct:** the only `#222` literals are `button.primary` + `.subtab-btn.active` backgrounds/borders (admin/index.html:25, 34) — both accent fills; body text is already `--c-text`. Role-match is right.
- **All WS5 cascade claims verify:** `.hero h1` is a **descendant** selector at styles.css:975 (so wrapping the `<h1>` in `.hero__title` keeps it matching), `--font-display` (:51) and `--text-5xl` (:63) both exist, `index.html:170` is exactly `<h1>Step into Elsewhere</h1>`, `homepage.js` **is** loaded `defer` (index.html:89) so the defer-ordering premise holds, and the three hero URLs are at index.html:161/162/379 incl. the reduced-motion poster swap.
- **Prior D folds are present:** AR#D1 (Lottie `color:transparent`, `<h1>` kept in flow — DESIGN:481-484) and AR#D-R2-1 (`.media-row__head` is a real **class**, not an inline grid — used at IMPLEMENT:1261, base rule DESIGN:432, P5 override DESIGN:453, defined once). The breadth-pass half-fold (the base rule's home) is resolved.
- **Admin media editor ↔ frontend parity holds:** `collectMedia` output shape (IMPLEMENT:1293-1312) matches `product.js` `populateMedia` reads (:230-281), including the `controls` round-trip (autoplay→no-buttons; explicit `controls:false`; `openEditor` rebuild via `m?.controls !== false`).
- **Loading / empty / error states exist on every surface** (products skeleton + two-state empty, orders, coupons, refund panel, per-zone upload errors).

## Ranked findings

### 1 — [MEDIUM · most important] The `seo_thumbnail` and `checkout_image` upload zones don't set those attributes

- **Location:** DESIGN P3d `wireUploadZone` success branch (ADDENDUM_DESIGN.md:386-398); the thumbnail special-case it mirrors (admin.js:391); `buildProductPayload` (admin.js:429, 432); consumers — `api/products.ts:658`, `main.js:60/74`, `product.js:204`.
- **Gap (verified in code, not a guess):** the seven zones route every non-video upload through `addImageRow` into `#p-images` (the `images[]` array). Only the **thumbnail** zone additionally writes its dedicated field (`#p-thumbnail`). But `seo_thumbnail` and `checkout_image` are **column-backed, not images-derived**: `buildProductPayload` reads them from the `#p-seo-thumbnail` / `#p-checkout-image` **fields** (admin.js:429, 432), and the consumers read the **columns** — `checkout_image` at `api/products.ts:658` (`row.checkout_image || row.thumbnail` → fed to Stripe via stripeSync.ts:67) and `seo_thumbnail` from the public column select (main.js:60/74) + the unseen-attribute preview (product.js:204). No code derives either column from an `images[]` role prefix — only `hero-` is derived (product.js:576), and the gallery is `gallery-`-filtered (product.js:415), so the uploaded URL sitting in `images[]` is **harmless but inert**. Net: an owner who uploads a SEO thumbnail or checkout image **via its dedicated zone** gets the file in the image list, but the actual attribute stays unset — the OG image is absent and Stripe checkout silently falls back to the thumbnail. The F6 "first-class home for these two roles" is cosmetic for the upload path.
- **Why it's the top finding:** it's silent (no error), it's on a money/SEO path (Stripe checkout image, social card), it undercuts the build's own North-Star/parity claim (the GPT sets these as explicit fields; `/admin`'s zone can't), and **the test plan misses it** — TESTING item 22 asserts the preview/role-tag + coverage hint, never that a zone upload actually sets the attribute end-to-end.
- **Honest caveat (in-scope call for the orchestrator):** the *old* single-select control had the same field-population omission (only thumbnail was special-cased), so the underlying behavior is pre-existing. But this build **rewrites** that control into role zones and **explicitly elevates** these two roles to first-class (F6), and the thumbnail branch already models the one-line fix — so closing it here is natural and cheap, not a redesign.
- **Fix:** in `wireUploadZone`'s success branch, mirror the thumbnail special-case for the two column-backed roles:
  ```js
  if (resolvedRole === 'thumbnail' && !$('p-thumbnail').value.trim()) $('p-thumbnail').value = body.url;
  else if (resolvedRole === 'seo_thumbnail') $('p-seo-thumbnail').value = body.url;
  else if (resolvedRole === 'checkout_image') $('p-checkout-image').value = body.url;
  ```
  (Appending to `images[]` can stay — the gallery is `gallery-`-filtered — or skip `addImageRow` for these two to keep `images[]` clean; populating the field is the load-bearing part.) Add a TESTING item-22 assertion that a zone-uploaded SEO/checkout image sets the attribute (publish → OG tag present; Stripe checkout uses the uploaded 1:1 image).

### 2 — [LOW-MEDIUM] Coupon code's `class="label"` gets no styling (the rule is scoped to `.order-info`)

- **Location:** `renderCoupons` (IMPLEMENT 2.1f, admin.js:729) emits `<span class="label">${code}</span>` inside `#coupons-list`; the only `.label` rule is `admin/index.html:51` → `.order-info .label`. IMPLEMENT:814 states "`.label` … already exist[s]."
- **Gap:** `.label` is a **descendant** selector scoped to `.order-info`; the coupon row is in `#coupons-list`, not `.order-info`, so the rule never matches — the coupon code renders as plain inherited text, not the muted/uppercase/letter-spaced label affordance the class implies. The doc's "already exists" is technically true but doesn't apply here, and WS4's sweep doesn't touch `.label`. (Columns-bug cousin: a class assumed to style an element, but the rule doesn't match.)
- **Fix:** generalize to a standalone `.label { … }` (it would also restyle the order-card labels — same intent), or scope-add `#tab-coupons .label`, or drop the class and style the code inline with tokens. Visual-polish severity, but the doc misstates it.

### 3 — [LOW-MEDIUM] The new P0 subtabs + P2 legend stay visible while editing a product

- **Location:** `openEditor` (admin.js:275-276) hides only `#products-list`; `closeEditor` (:325-329) un-hides only it. The new `#product-subtabs` (DESIGN P0(i)) and `.state-legend` (DESIGN P2) — plus the existing `.toolbar` — are siblings of `#products-list` (admin/index.html:111-115).
- **Gap:** when a product is open in the editor, the state-filter subtabs, the color legend, and the New Product / Refresh toolbar all remain above the editor form. The filter UI is meaningless mid-edit, and a stray subtab click silently re-renders the hidden list. (The toolbar-during-edit is pre-existing/shipped; the subtabs + legend are **new this build** and compound it.) Works against the P0 "clear nav" intent.
- **Fix:** in `openEditor`/`closeEditor`, toggle `.hidden` on `#product-subtabs` + `.state-legend` (and ideally the toolbar) alongside `#products-list` — or wrap the list + its chrome in one `#products-list-view` toggled as a unit. The editor already has its own ← Products control (P0(ii)).

### 4 — [LOW] The P5-before-P3d fold order leaves the mobile-override cascade-win unpinned

- **Location:** fold order (DESIGN:68 — …→P5→…→P3); P5 is "one block at the stylesheet end" (DESIGN:453); the P3d base rules `.media-row__head` (DESIGN:432) and `.upload-zones` (DESIGN:411) are "add to the inline `<style>`"; P5 overrides both to `1fr`.
- **Gap:** the mobile collapse wins only if the P3d base rule precedes the P5 `@media` block in **source order**. Since P5 is folded before P3d and is "the stylesheet end," a builder appending folded CSS sequentially would place the P3d base **after** the P5 query → equal specificity → base wins even at ≤640px → the stacked-mobile layout silently doesn't render. (AR#D-R2-1 made `.media-row__head` a class so a query *can* override it; this is the next layer — the query must also physically follow the base.) Practical harm is limited — `.m-url`'s `min-width:0` prevents hard overflow (the row stays 3-col/cramped, not off-screen), and TESTING item 28's "collapse to a single column" check would catch it — but the build should be right the first time.
- **Fix:** one sentence pinning that P3d's component CSS (`.media-row__head`, `.upload-zones`, `.img-thumb`) is inserted **above** the P5 end-block — i.e., the P5 `@media` block stays physically last in `<style>` regardless of fold order.

### 5 — [LOW] The focus-visible ring is input-only; buttons / tabs / subtabs / links lack it

- **Location:** DESIGN §4.1 global base (:62) specifies `:focus-visible` for inputs/textareas/selects; P7 (:455) styles tabs/topbar/login but adds no focus state; the new `.link-btn` / `.subtab-btn` / `.tab-btn` have none.
- **Gap:** §4.1 frames the ring as fixing the "no focus state (a11y gap)," but only inputs get the custom ring. Buttons/tabs/subtabs/links fall back to the UA default outline (still present — nothing sets a global `outline:none` — so it's an inconsistency, not a total loss). Uneven keyboard-focus treatment for a "genuinely polished + accessible" bar.
- **Fix:** broaden the ring to interactive controls, e.g. `button, .tab-btn, .subtab-btn, .link-btn, a` on `:focus-visible` → `box-shadow:0 0 0 3px var(--c-accent-ring); border-radius:var(--r-sm); outline:none;` (or a shared selector).

### 6 — [LOW · nit] P6 "Copy address top-right" has no concrete mechanism

- **Location:** DESIGN P6 (:454) — "Pair the existing 'Copy address' button top-right as a ghost button"; the button renders as a sibling **after** `<pre class="address-block">` (admin.js:769).
- **Gap:** P6 ships concrete CSS only for `.address-block`; "top-right" needs a markup/flex change (a header row with the "Ship to" label + button) or absolute positioning — CSS on the existing after-the-pre sibling can't place it top-right. P6 is executable-design, so the `.link-btn` restyle is the concrete default and "top-right" is render-tune — honestly labeled enough, but the positioning is unspecified.
- **Fix:** either drop "top-right" to pure render-tune, or give the concrete markup (wrap "Ship to" + Copy in a flex `.address-head` with the button pushed right).

## Single most important fix

**Finding 1 — wire the `seo_thumbnail` + `checkout_image` zones to their fields.** It's the one gap that silently breaks a real attribute on a money/SEO path, isn't caught by the test plan, and contradicts the build's own F6/full-parity claim. The fix is the same one-line pattern the thumbnail zone already uses.

## Verdict

**NEEDS ANOTHER PASS (narrow).** One fold: complete the two column-backed upload zones (#1); fold the coupon `.label` (#2) and the editor-chrome-hide (#3); pin the P5/P3d source order (#4); broaden the focus ring (#5); #6 is a nit. Everything else — byte-anchors, WS5 cascade, media parity, prior D folds — verified clean. If the orchestrator rules #1 pre-existing-and-out-of-scope, the residual is render-tune-only and this is **READY TO BUILD with nits**.
