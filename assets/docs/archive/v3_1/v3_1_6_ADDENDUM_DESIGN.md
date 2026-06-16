# v3.1.6 — Design Addendum

**Addendum to**: `v3_1_6_IMPLEMENT.md` (same version; bumps in lockstep; always in gap-review scope).
**Covers**: the presentation layer for **Workstream 4 (admin polish)** and **Workstream 5 (homepage experience)**.
**Status**: WS4 (admin) + WS5 (Lottie title + HyperFrames hero) both authored from their research passes; byte-anchored to source files during execution.

> **Executable-design bar.** Design is planned exactly like functionality: concrete defaults + a render-tune note, tested + feedback'd, never frozen-no-feedback. Real content is never a build/test gate (production-grade placeholders). Storefront brand is **untouched**; the admin gets a **neutral/template** aesthetic (NOT Everlastings plum/lavender/serif) — it's the reusable management-layer UI.

---

# Workstream 4 — Admin polish (brand-neutral / reusable-template)

**Aesthetic bar (Sean).** Clean, professional, genuinely **polished + smart, high-appeal** (it can have a vibe) — brand-**neutral**, NOT the Everlastings storefront brand and **not** anchored to august.style tokens; the bar is "looks excellent + ports to any future client," not "matches a palette." Two fronts, in order: (1) full /admin↔GPT parity made obvious (**P0**), then (2) make it pleasant (**P1–P7**). The slate + indigo-slate accent below is the working default to *refine*, not a constraint.

**Current state.** The admin is one self-contained file: `admin/index.html` carries the entire stylesheet inline in a `<style>` block (~lines 8-74) — hardcoded hex literals (`#222`, `#ddd`, `#f5f5f5`, `#b00`…), **no CSS custom properties**, **no `@media` breakpoints**, fixed-px grids (`.order-card` `120px 1fr`; `.img-url-row` `140px 1fr 1fr auto`; `.ship-form` `2fr 1fr auto`) with no mobile fallback. Type is `system-ui` (already neutral — keep). All components are built in vanilla DOM in `assets/js/admin.js`. So this is a **re-skin + restructure, not a rewrite**, touching only `admin/index.html` + `assets/js/admin.js`. The storefront `styles.css` is referenced only for its *scale conventions* (radius 4/8/12, shadow sm/md/lg, spacing 4/8/16/24/32/48/64) — its palette/serif never import.

## 4.1 — Design system (drop this `:root` at the top of the inline `<style>`, after `* { box-sizing: border-box; }`)

```css
:root {
  /* === Neutrals (cool slate gray ramp) === */
  --c-bg:          #f6f7f9;   /* app canvas */
  --c-surface:     #ffffff;   /* cards, panels, inputs */
  --c-surface-2:   #f1f3f5;   /* subtle fills: subtab rest, address block */
  --c-border:      #e3e6ea;   /* hairlines, card borders */
  --c-border-strong:#cdd2d9;  /* input borders */
  --c-text:        #1c2530;   /* primary text (near-black, slightly cool) */
  --c-text-muted:  #5b6573;   /* labels, meta */
  --c-text-faint:  #8a929e;   /* placeholders, empty states */

  /* === Accent (single, restrained: indigo-slate — distinct from storefront plum) === */
  --c-accent:      #3a4a63;   /* primary buttons, active tab, focus ring base */
  --c-accent-hover:#2c3a50;
  --c-accent-soft: #eef1f6;   /* accent-tinted fill behind active states */
  --c-accent-ring: rgba(58, 74, 99, 0.35);

  /* === Semantic (status pills + status-msg) === */
  --c-success:#2f7d52; --c-success-bg:#e8f5ee; --c-success-bd:#bfe3cd;
  --c-danger: #b03a3a; --c-danger-bg: #fcecec; --c-danger-bd: #f3c9c9;
  --c-warn:   #8a5a00; --c-warn-bg:   #fbf2dd; --c-warn-bd:   #ecd8a8;
  --c-info:   #2a4d7a; --c-info-bg:   #e9f0fa; --c-info-bd:   #c5d8f0;
  --c-neutral-bg:#eceef1; --c-neutral-tx:#5b6573;

  /* === Type (system stack — NO serif) === */
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --fs-xs:0.75rem; --fs-sm:0.8125rem; --fs-base:0.9375rem; --fs-md:1.0625rem; --fs-lg:1.25rem; --fs-xl:1.5rem;
  --lh-tight:1.25; --lh-base:1.5; --fw-medium:500; --fw-semibold:600;

  /* === Spacing / radius / shadow (mirror storefront scale) === */
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:24px; --s-6:32px; --s-7:48px; --s-8:64px;
  --r-sm:4px; --r-md:8px; --r-lg:12px; --r-pill:999px;
  --sh-sm:0 1px 2px rgba(20,30,45,0.06);
  --sh-md:0 2px 6px rgba(20,30,45,0.08);
  --sh-lg:0 8px 24px rgba(20,30,45,0.10);
  --transition:150ms ease; --container-max:1200px;
}
```

**Global base (so the whole tool inherits, not just touched components):**
- `body` → `background:var(--c-bg); color:var(--c-text); font-family:var(--font); font-size:var(--fs-base); line-height:var(--lh-base);`
- inputs/textareas/selects → `border:1px solid var(--c-border-strong); border-radius:var(--r-sm); background:var(--c-surface);` + a shared **focus state** (none exists today — a11y gap): `:focus-visible { outline:none; border-color:var(--c-accent); box-shadow:0 0 0 3px var(--c-accent-ring); }`
- buttons → base `background:var(--c-surface); border:1px solid var(--c-border-strong); border-radius:var(--r-sm);`; `.primary`→accent (hover `--c-accent-hover`); `.danger`→`--c-danger`.
- Replace every literal with a token **by the property's role**, not a blind find-replace (text→`--c-text`, surface fills→`--c-surface*`, hairlines→`--c-border`, accents→`--c-accent`) so no raw hex remains. The current literals map cleanly: `#ddd`→`--c-border`, `#666`→`--c-text-muted`, `#f7f7f7`→`--c-surface-2`, and **`#222`→`--c-accent`** — verified: the only two `#222` usages are `button.primary` and `.subtab-btn.active` **backgrounds** (`admin/index.html:25,34`), both accent fills, so `--c-accent` is correct; body text is already `--c-text` via the global base. (Role-match guards a future `#222`-as-text from being mis-swept to the accent color.)

## 4.2 — Prioritized component changes (ranked; each is apply-not-decide)

**Fold order (parity/usability first, then visual de-risk, logic last):** §4.1 tokens+base → **P0** → P1 → P7 → P5 → P6 → P2 → P4 → P3 (3a→3b→3c).

**Product-state taxonomy (ONE source for the P0 filter tabs AND the P2 badge — F7).** Derive a single `productState(p)` from `is_published` / `draft` / `available` / `archived_at`, in this precedence (first match wins):
- **Archived** — `archived_at != null` (overrides everything else).
- **Draft** — `!is_published` (and not archived).
- **Edits** — `is_published && draft != null` (published with staged edits pending).
- **Sold** — `is_published && !available` (and no staged edits).
- **Live** — `is_published && available` (the default healthy state).

Write it once, verbatim (F8 — don't make the builder re-derive the canonical predicate):
```js
function productState(p) {
  if (p.archived_at) return 'archived';   // overrides everything
  if (!p.is_published) return 'draft';
  if (p.draft != null) return 'edits';    // published with a staged draft pending
  if (!p.available) return 'sold';
  return 'live';
}
```
P0's filter tabs = **All / Live / Draft / Sold / Archived** ("Edits" pieces list under **Live** with the edits badge — no separate tab, so the Live filter matches `live` **or** `edits`). P2's card badge renders `productState(p)` directly; `available`/`quantity` show as quiet meta, not a second status axis. **Both call the same function** — no divergent predicates for the builder to invent. *(edits-precedence is deliberate: a sold piece that also has staged copy edits returns `'edits'` (checked before `sold`), so it lists under **Live**, not **Sold**. Kept that way because the unpublished staged edit is the actionable state the owner needs to act on; the badge still reads "edits". Flagged for Sean's render-tune eye — flip the precedence if a sold-first view reads better.)*

- **P0 · Navigation + product-list state-filter (parity/usability — do first; from `FEEDBACK_ADMIN_v2_1_0.md`).** (a) **In-admin back/nav:** the browser Back button leaves /admin entirely and clicking into a product gives no obvious return — add a clear **"← Products"** control in the editor header + an obvious active-tab state. (The editor is a view-swap in `admin.js` — `openEditor`/`closeEditor` — not a route, so this is a button calling the existing list view, NOT `history.back()`.) (b) **Product-list state-filter:** subtabs over the product list, mirroring the orders subtabs (`admin/index.html:243-256`). Concrete shape (F8 — written out so two builders don't diverge):
Reuse the **shipped** subtab classes (`.subtab-btn` / `.subtab-btn.active`, already styled at `admin/index.html:34` and what the orders subtabs use) so the product subtabs are styled immediately and the two tab strips stay consistent — NOT a new `.subtab` class:
```html
<div class="subtabs" id="product-subtabs">
  <button class="subtab-btn active" data-pstate="all">All</button>
  <button class="subtab-btn" data-pstate="live">Live</button>
  <button class="subtab-btn" data-pstate="draft">Draft</button>
  <button class="subtab-btn" data-pstate="sold">Sold</button>
  <button class="subtab-btn" data-pstate="archived">Archived</button>
</div>
```
```js
let activeProductFilter = 'all';                  // module-level, beside `state`
function matchesProductFilter(p) {
  if (activeProductFilter === 'all') return true;
  const s = productState(p);                      // the ONE canonical predicate above
  if (activeProductFilter === 'live') return s === 'live' || s === 'edits'; // Edits list under Live
  return s === activeProductFilter;
}
function wireProductSubtabs() {                    // call once from init/attachEventListeners
  document.querySelectorAll('#product-subtabs .subtab-btn').forEach((b) => {
    b.addEventListener('click', () => {
      activeProductFilter = b.dataset.pstate;
      document.querySelectorAll('#product-subtabs .subtab-btn').forEach((x) => x.classList.toggle('active', x === b));
      renderProductList();                         // re-render from the already-fetched state.products — NO refetch
    });
  });
}
```
In `renderProductList`, filter the already-fetched list: `const shown = (state.products || []).filter(matchesProductFilter);` then render `shown` (and show the `.empty` state when `shown.length === 0`). Pure additive UI; no backend change.

**Byte-anchored insertion points (P0 is load-bearing parity, so it's anchored to the WS1-3 standard, not left as a pattern):**

*(i) `#product-subtabs` mounts in the products tab, after the status line and before the toolbar (mirroring the orders subtabs, which sit above their toolbar at `admin/index.html:243-248`).* **CURRENT (`admin/index.html:109-115`):**
```html
        <section id="tab-products">
          <div id="products-status"></div>
          <div class="toolbar">
            <button id="new-product-btn" class="primary">New Product</button>
            <button id="refresh-products-btn">Refresh</button>
          </div>
          <div id="products-list" class="product-list"></div>
```
**NEW (insert the subtabs strip after the status line):**
```html
        <section id="tab-products">
          <div id="products-status"></div>
          <div class="subtabs" id="product-subtabs">
            <button class="subtab-btn active" data-pstate="all">All</button>
            <button class="subtab-btn" data-pstate="live">Live</button>
            <button class="subtab-btn" data-pstate="draft">Draft</button>
            <button class="subtab-btn" data-pstate="sold">Sold</button>
            <button class="subtab-btn" data-pstate="archived">Archived</button>
          </div>
          <div class="toolbar">
            <button id="new-product-btn" class="primary">New Product</button>
            <button id="refresh-products-btn">Refresh</button>
          </div>
          <div id="products-list" class="product-list"></div>
```

*(ii) the `← Products` back control mounts in the editor header (`openEditor` swaps to this view — `admin.js:263`; the back button calls the existing `closeEditor()` at `admin.js:325`, NOT `history.back()`).* **CURRENT (`admin/index.html:116-117`):**
```html
          <div id="product-editor" class="hidden">
            <h2 id="editor-heading">New Product</h2>
```
**NEW (a back control above the heading; styled as a ghost button in WS4 P7):**
```html
          <div id="product-editor" class="hidden">
            <button type="button" id="editor-back" class="link-btn">← Products</button>
            <h2 id="editor-heading">New Product</h2>
```
Wire it once (beside `wireProductSubtabs`): `$('editor-back').addEventListener('click', closeEditor);`

*(iii) scope the SHIPPED orders-subtab handler so the product subtabs don't trigger it (the product subtabs reuse `.subtab-btn`, and the shipped handler binds `.subtab-btn` **globally**, so a product-subtab click would also set `state.ordersStatus = undefined`, strip the orders `.active`, and fire `loadOrders()`).* **CURRENT (`admin.js:155-161`):**
```js
  document.querySelectorAll('.subtab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.ordersStatus = btn.dataset.status;
      document.querySelectorAll('.subtab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      loadOrders();
    });
  });
```
**NEW (scope both selectors to the orders tab):**
```js
  document.querySelectorAll('#tab-orders .subtab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.ordersStatus = btn.dataset.status;
      document.querySelectorAll('#tab-orders .subtab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      loadOrders();
    });
  });
```
`wireProductSubtabs` is already scoped to `#product-subtabs .subtab-btn`, so once the orders handler is scoped to `#tab-orders .subtab-btn` the two strips never cross-fire.
- **P1 · Editor form sectioning.** `#product-form` (`index.html:119-239`) is ~20 stacked `.field`s with only 2 fieldsets. Wrap into **5 labeled `<fieldset>`s** in workflow order: **Essentials** (title, slug, headline, description, price, qty, type, available, featured) · **Story & Details** (story, features, materials, care, shipping, dimensions, weight, power, series, artist note) · **Media** (P3) · **Checkout (Stripe)** (existing `167-171`, keep verbatim, restyle legend) · **SEO & Sharing** (seo title/desc/thumbnail). Remove the inline `style="border:1px solid #ddd…"` on `166`/`173`; add one reusable rule: `fieldset { border:1px solid var(--c-border); border-radius:var(--r-md); padding:var(--s-4); background:var(--c-surface); } fieldset>legend { font-size:var(--fs-md); font-weight:var(--fw-semibold); padding:0 var(--s-2); } .product-form { gap:var(--s-5); }`. Pure HTML+CSS; `openEditor` targets the same `#p-*` IDs.
- **P2 · Product-state visibility.** State lives in one cramped meta line (`renderProductList`, `admin.js:246-256`); pills are tiny grey lozenges (`index.html:68-73`). Promote the **status pill to a badge overlaid top-left on the card image** (`.product-card{position:relative} .pc-badge{position:absolute;top:var(--s-2);left:var(--s-2)}`); give pills semantic color + shape (`.pill{border-radius:var(--r-pill);padding:3px 9px;font-size:var(--fs-xs);font-weight:var(--fw-semibold)}` mapped draft→warn, edits→info, live→success, archived→neutral, sold→accent-soft (a sale is a GOOD state — NOT a red error; F12), available→neutral-bg; and **refunded**→neutral/muted as its OWN `.pill.refunded` class — the order-card "Refunded" pill (IMPLEMENT 1.5b) uses it instead of reusing `.unsent`, which is semantically an email-not-sent state); **dim archived cards** (`.product-card.is-archived{opacity:.6}`, class added in JS when `p.archived_at`). Status becomes the loud signal, price the quiet meta. Minimal JS: build the pill as a separate `.pc-badge` node + the conditional class. **Concrete per-state rules (a status pill is load-bearing, not pure render-tune, so it ships a concrete default; emit these literally rather than leaving the builder to translate the prose mapping, and note `.pill.refunded` was the one with no rule at all):**
```css
.pill.live      { background: var(--c-success-bg); color: var(--c-success); }
.pill.draft     { background: var(--c-warn-bg);    color: var(--c-warn); }
.pill.edits     { background: var(--c-info-bg);    color: var(--c-info); }
.pill.sold      { background: var(--c-accent-soft); color: var(--c-accent); }   /* a sale is GOOD — not a red error */
.pill.archived  { background: var(--c-neutral-bg); color: var(--c-neutral-tx); }
.pill.available { background: var(--c-neutral-bg); color: var(--c-neutral-tx); }
.pill.refunded  { background: var(--c-neutral-bg); color: var(--c-neutral-tx); } /* its OWN class — never reuse .unsent (an email-not-sent state); T3·3 */
```
*(Tokens are the real ones at §4.1 `:42` — `--c-neutral-bg`/`--c-neutral-tx`, NOT `--c-text-muted`, though they share `#5b6573`. Color/saturation is still render-tune; the mapping is the concrete default.)*
- **P3 · Media (the biggest win — removes the only raw-JSON field).**
  - **3a Image-list previews.** `addImageRow` (`admin.js:331-345`) renders URL+alt+Remove only. Prepend a 40×40 `<img class="img-thumb">` (`object-fit:cover; var(--r-sm); background:var(--c-surface-2)`) whose `src` tracks the URL input, + a role-prefix tag from the filename covering **all 7 roles** (`hero`/`thumbnail`/`seo_thumbnail`/`checkout_image`/`gallery-NN`/`detail-NN`/`video-NN` — matches IMPLEMENT 3.7a's regex; the earlier 5-role version dropped `seo_thumbnail`/`checkout_image`, F6). Regrid `.img-url-row` → `40px 64px 1fr 1fr auto` (thumb, role, url, alt, remove) — matches IMPLEMENT 3.7a.
  - **3b "Still need" coverage hint.** The "≥1 hero + 5 gallery" requirement is static prose (`index.html:182-184`). Add a live `#img-coverage` line above the Add button counting rows by role prefix → `Hero ✓ · Gallery 3 / 5 needed · Thumbnail ✓` (`--c-success` met / `--c-warn` unmet). New `updateCoverage()` called from add/remove/url-change. Additive JS.
  - **3c Structured MP4 / YouTube editor (replaces the raw-JSON `#p-media` textarea, `index.html:159`).** `buildProductPayload` (`admin.js:449-455`) currently `JSON.parse`s it and throws on any typo. Replace with a repeatable row builder (sibling of the image list): `#p-media-list` + "Add video" button; each row = `<select>` (video/youtube) + URL input + (video-only) `loop` & `autoplay` checkboxes + a poster picker + Remove. New `collectMedia()` (sibling of `collectImages`, `347-356`) serializes the **identical** array shape; in `buildProductPayload` swap the parse block for `payload.media = collectMedia() || null;`; in `openEditor` (`298`) build rows from `eff.media` instead of `JSON.stringify`. Eliminates the JSON.parse throw path entirely; **backend untouched**. *(This is also where v3.1's admin↔GPT video parity lands — the structured editor exposes the same flags the GPT sets conversationally, incl. poster.)*
  - **3d Role-sectioned upload control (U2 — subsumes F6).** Replace the single file-input + one big role `<select>` (`admin/index.html:195`, `admin.js:onUploadImage`) with **labeled upload zones per role group**: **Hero** · **Gallery** (auto-numbers `gallery-01..NN`) · **Detail** · **Thumbnail** · **SEO thumbnail** · **Checkout image** · **Video** (`video-0N`, auto-skips the Cloudinary crop). The role is chosen by **which zone you drop into**, not a dropdown — so every upload carries the correct role (load-bearing: the frontend reads role from the filename), the role-select footgun is gone, and video gets a first-class home (**closes F6**). Each zone lists its uploads inline, feeding the 3a previews + 3b coverage hint. Vanilla DOM; same per-file `/api/upload` multipart call with the zone's role. Concrete default + render-tune (executable design).
    - **Functional rules — lock these (they're behavior, not visual; F7 / F3):**
      - **Gallery auto-numbering:** next `N = max(existing gallery-NN in #p-images) + 1`; **ignore holes** (deleting `gallery-02` leaves `gallery-01` + `gallery-03`, and the next upload becomes `gallery-04`) — **never renumber/rename an existing file** (the CDN filename is the role; renaming breaks the "nobody renames a file" invariant + orphans the object). Same scheme for `detail-NN`/`video-NN`.
      - **Video zone `skip_transform`:** every Video-zone upload POSTs `skip_transform=true` **unconditionally** (a video always skips the Cloudinary crop) — this is the home for the old 3.7c rule (IMPLEMENT 3.7c is collapsed into here; do NOT edit the removed `#upload-role` handler).
      - **Remove the dangling wiring (else init throws):** replacing the upload control deletes `#upload-btn` from the markup, so ALSO delete its event wiring `$('upload-btn').addEventListener('click', onUploadImage);` (`admin.js:153`) and the now-dead `onUploadImage` fn. If the wiring stays, `$('upload-btn')` is `null` at init → `.addEventListener` throws → the rest of `attachEventListeners` never binds (the orders subtabs, search, refund + coupon handlers that follow it). Wire `wireUploadZones()` in its place.
      - **Landing order:** each upload appends an `addImageRow` to `#p-images` (the existing single image list) — the zones are just role-routers, not separate stores; the final `images[]` order = `#p-images` DOM order (so a Hero zone can prepend if you want hero first, but the payload shape is unchanged). Video uploads append to the `#p-media-list` (3c), not `#p-images`.
      - **Per-zone errors + empty state:** an upload failure renders inline in that zone — write to the zone's own `.zone-msg` (the JS skeleton below does exactly this; NOT the global `setStatus`), not a global alert; an empty zone shows a quiet "Drop or choose a {role} image" placeholder. No silent failures.
    - **Concrete default (markup + JS skeleton; render-tune the look, not the routing).** P0 ships exact markup; so does this, so two builders don't diverge on the load-bearing role routing. Replace `admin/index.html:195` (the file input + `#upload-role` select + `admin.js:onUploadImage`) with seven zones — one shown verbatim, the other six identical but for `data-role` + label (`gallery`, `detail`, `thumbnail`, `seo_thumbnail`, `checkout_image`, `video`; the Video zone's input is `accept="video/*"`):
```html
<div class="upload-zones">
  <div class="upload-zone" id="upload-zone-hero" data-role="hero">
    <label>Hero</label>
    <input type="file" class="zone-file" accept="image/*" />
    <div class="zone-msg" style="font-size:12px;color:var(--c-text-muted)">Drop or choose a hero image</div>
  </div>
  <!-- …six more: gallery · detail · thumbnail · seo_thumbnail · checkout_image · video -->
</div>
```
A shared wirer + a numbered-role resolver (gallery/detail/video number per-upload; single roles use the base). Mirrors the existing `onUploadImage` POST (`admin.js:358-400`) — `deriveSlug`/`addImageRow`/`addMediaRow`/`authHeader` already exist:
```js
function nextNumberedRole(base) {
  // base = 'gallery' | 'detail' | 'video'. Scan the relevant list for the highest base-NN, IGNORE
  // holes, return base-0(N+1). NEVER renumber an existing file (the CDN filename is the role).
  const sel = base === 'video' ? '#p-media-list .m-url' : '#p-images .img-url';
  const re = new RegExp(`\\/(?:test_)?${base}-(\\d+)[-.]`);
  let max = 0;
  document.querySelectorAll(sel).forEach((i) => { const m = i.value.match(re); if (m) max = Math.max(max, +m[1]); });
  return `${base}-${String(max + 1).padStart(2, '0')}`;
}

async function wireUploadZone(zoneEl, role) {
  const fileInput = zoneEl.querySelector('.zone-file');
  const msg = zoneEl.querySelector('.zone-msg');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const slug = $('p-slug').value.trim() || deriveSlug($('p-title').value);
    if (!slug) { msg.textContent = 'Enter a title or slug first.'; return; }
    const numbered = role === 'gallery' || role === 'detail' || role === 'video';
    const resolvedRole = numbered ? nextNumberedRole(role) : role;
    const fd = new FormData();
    fd.append('file', file); fd.append('slug', slug); fd.append('role', resolvedRole);
    if (role === 'video') fd.append('skip_transform', 'true'); // a video always skips the Cloudinary crop (old 3.7c rule)
    msg.textContent = 'Uploading…';
    try {
      const res = await fetch('/api/upload', { method: 'POST', headers: { ...authHeader() }, body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      msg.textContent = `Added ${resolvedRole}.`;
      if (role === 'video') addMediaRow({ type: 'video', url: body.url });
      else {
        if (role === 'thumbnail' && !$('p-thumbnail').value.trim()) $('p-thumbnail').value = body.url;
        addImageRow(body.url, '');
        // Alt-text parity nudge: the GPT writes a descriptive alt for every image
        // (IMPLEMENT 3.5a); /admin should hold the same bar, so focus + prompt the new row's alt input.
        // Soft, not a publish gate (validateProductRules doesn't require alt) — just stops blank alts slipping by.
        const altInput = $('p-images').lastElementChild?.querySelector('.img-alt');
        if (altInput) { altInput.placeholder = 'alt — what the photo shows'; altInput.focus(); }
      }
      fileInput.value = ''; // ready for the next drop in this zone
    } catch (err) { msg.textContent = `Failed: ${err.message}`; }
  });
}

function wireUploadZones() { // call once from init/attachEventListeners
  document.querySelectorAll('.upload-zone').forEach((z) => wireUploadZone(z, z.dataset.role));
}
```
The zones are role-routers into the same `#p-images`/`#p-media-list` (3a/3b/3c read them) — no separate store, payload shape unchanged. Sean render-tunes the visual (drop targets, grid, hover); the routing is fixed.
- **P4 · Loading / error / empty states.** Orders loading is bare text (`admin.js:651`); products has no loading state (`218-232`). Add **skeleton** cards (`.skeleton{background:linear-gradient(90deg,var(--c-surface-2) 25%,#e9ecef 37%,var(--c-surface-2) 63%);background-size:400% 100%;animation:shimmer 1.4s infinite;border-radius:var(--r-sm)}` + `@keyframes shimmer{to{background-position:-200% 0}}` + `@media (prefers-reduced-motion:reduce){.skeleton{animation:none}}`). Empty states: `.empty{color:var(--c-text-faint);padding:var(--s-7);text-align:center;border:1px dashed var(--c-border);border-radius:var(--r-md)}` + a CTA where one exists. Errors keep `.status-msg.error` + token colors + a `border-left:3px solid var(--c-danger)` accent (success/info likewise) so they're distinguishable beyond tint.
  - **Concrete default — where the skeletons render (the CSS alone left the emission point unstated; this is behavioral, so it's anchored).** `loadProducts` clears the status then awaits the fetch with the list area blank — paint skeleton cards there during the await. **CURRENT (`admin.js:218-220`):**
```js
async function loadProducts() {
  setStatus('products-status', '', 'info');
  closeEditor();
```
**NEW (fill `#products-list` with a few skeleton cards while the fetch is in flight; `renderProductList()` overwrites them on success, the `catch` shows the error):**
```js
async function loadProducts() {
  setStatus('products-status', '', 'info');
  closeEditor();
  $('products-list').innerHTML = Array.from({ length: 6 }, () =>
    '<div class="product-card"><div class="skeleton" style="aspect-ratio:1/1"></div>'
    + '<div class="skeleton" style="height:14px;margin:8px 0 6px"></div>'
    + '<div class="skeleton" style="height:12px;width:60%"></div></div>').join('');
```
  Render-tune the count/shape; the behavior (skeletons during fetch, not a blank/"Loading…" gap) is the fix. **Orders:** `loadOrders` (`admin.js:651`) already paints a `<div class="empty">Loading...</div>` — that's functional, so it's the concrete default for orders; extending the skeleton treatment to the orders list is optional render-tune (the order-card grid differs from the product-card grid), NOT a required edit. The skeleton concrete default above is products-only.
- **P5 · Mobile (zero breakpoints today).** One block at the stylesheet end: `@media (max-width:640px){ .container{padding:var(--s-4)} .row-2,.row-3,.ship-form{grid-template-columns:1fr} .order-card{grid-template-columns:1fr} .order-card img{height:180px} .img-url-row{grid-template-columns:40px 1fr;grid-auto-flow:row} .upload-row{grid-template-columns:1fr} .product-list{grid-template-columns:1fr 1fr} .tabs,.subtabs{overflow-x:auto} }`. Pure CSS.
- **P6 · Address block.** `formatAddress` (`admin.js:669-678`) renders a monospace `<pre class="address-block">` (`index.html:52`) — reads as debug output. Restyle to the body font: `.address-block{background:var(--c-surface-2);border:1px solid var(--c-border);border-radius:var(--r-md);padding:var(--s-3);font-size:var(--fs-sm);line-height:var(--lh-base);white-space:pre-wrap;font-family:var(--font)}`. Pair the existing "Copy address" button (`admin.js:775-783`) top-right as a ghost button. Reserve `var(--font-mono)` for the tracking number only.
- **P7 · Tabs / topbar / login chrome (CSS-only, high showcase value).** Topbar → `background:var(--c-surface);border-bottom:1px solid var(--c-border);box-shadow:var(--sh-sm)`, `h1` `var(--fs-lg)/600/-0.01em`. Tabs → underline indicator (`.tab-btn.active{color:var(--c-accent);box-shadow:inset 0 -2px 0 var(--c-accent);font-weight:var(--fw-semibold)}`, drop the `-1px` margin hack). Subtabs → pill toggle group. Login card (`.login-card` confirmed real — CSS `admin/index.html:16`, markup `:78`) → `background:var(--c-surface);box-shadow:var(--sh-lg);border-radius:var(--r-lg);border:none;margin-top:12vh`.

**Constraints honored:** vanilla HTML/CSS/JS, same `#p-*` IDs + `state`/`fetch` flow, identical backend payload shape (image + media arrays unchanged → `api/products` needs no change), incremental re-skin + restructure. Only `admin/index.html` + `assets/js/admin.js` change; `styles.css` is never imported.

---

# Workstream 5 — Homepage experience (authored from research)

## 5.1 — Hero title write-on (Lottie)

**Decisions (locked by the research pass).**
- **Two-stage workflow.** Author + QA the JSON in the `text-to-lottie` skill's Skottie harness (`npx degit diffusionstudio/lottie …`, write `public/lottie.json`, verify frames at `?frame=N&paused=1`); **embed on the live site with `lottie-web`, `renderer:'svg'`** (the harness's Skia/Skottie is authoring-only, NOT the website player). SVG is the reliable target for trim-path write-on (lottie-web's canvas renderer has documented trim-path artifacts).
- **Title as vector outline paths**, not a Lottie text layer and not a baked font (avoids font-embed bloat/inconsistency). The words live as real text in the `<h1>` (SEO/SR); the Lottie is `aria-hidden` decoration — so baking the visual does **not** hurt SEO. Match the outlines to Cormorant Garamond so the animation and the static `<h1>` look identical.
- **Effect:** stroke **Trim Path** `end` 0→100% (draw-on / handwriting), staggered left-to-right ("Step into" then "Elsewhere"); ~1.6–2.2 s total (`fr:60`), ease-out, `loop:false` (holds fully drawn). Optional fill settle in the last ~0.3 s to match the static color.

**A11y / SEO / reduced-motion DOM + CSS (exact shape).** CURRENT `index.html:170` is exactly `<h1>Step into Elsewhere</h1>` (copy confirmed — the swap only adds the wrapper + Lottie div, it never rewrites the copy; F10). Replace the `.hero__content` `<h1>` with:
```html
<div class="hero__title">
  <h1 class="hero__title-text">Step into Elsewhere</h1>            <!-- SEO + SR + no-JS + reduced-motion -->
  <div class="hero__title-lottie" data-hero-title-lottie aria-hidden="true"></div>
</div>
```
```css
.hero__title { position: relative; }
.hero__title-lottie { position: absolute; inset: 0; pointer-events: none; }
.hero__title-lottie svg { width: 100%; height: 100%; }
/* Only after a successful mount (JS adds .has-lottie), visually hide the real <h1> but KEEP it in the a11y tree (clip, never display:none). */
@media (prefers-reduced-motion: no-preference) {
  .hero__title.has-lottie .hero__title-text {
    position: absolute; width: 1px; height: 1px; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;
  }
}
@media (prefers-reduced-motion: reduce) { .hero__title-lottie { display: none; } }  /* static <h1> only */
```

**Embed (init in `homepage.js`; pin the lottie-web version). Insert the lottie `<script defer>` BEFORE the existing `homepage.js` tag.** The current tag is verbatim (`homepage.js` **is** loaded `defer`, so the defer-ordering premise holds):
```html
<!-- index.html:89 (CURRENT) -->
<script src="/assets/js/homepage.js" defer></script>
```
`defer` scripts run in document order, so a `defer` lottie tag inserted before this one runs first → `window.lottie` is defined when `homepage.js`'s `DOMContentLoaded` fires. (If `homepage.js` were ever made synchronous, the lottie tag would have to move with it; today both are `defer` — ordering is safe. A mis-order would silently fall back to the static `<h1>` even when motion is wanted.)
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js" defer></script>
```
```js
document.addEventListener('DOMContentLoaded', () => {
  const el = document.querySelector('[data-hero-title-lottie]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!el || reduce || !window.lottie) return;            // reduced-motion / no-JS → static <h1>
  try {
    const anim = lottie.loadAnimation({
      container: el, renderer: 'svg', loop: false, autoplay: true,
      path: '/assets/lottie/hero-title-writeon.json',
      rendererSettings: { progressiveLoad: false, preserveAspectRatio: 'xMidYMid meet' },
    });
    // Async fetch/parse failure (404, blocked, bad JSON) fires data_failed, never DOMLoaded → leave the
    // real <h1> visible.
    anim.addEventListener('data_failed', () => { /* never add .has-lottie → static <h1> stays */ });
    // Only hide the real <h1> once the SVG has ACTUALLY mounted shape content. A JSON that parses but
    // renders empty (no layers, or a Skottie-subset lottie-web can't draw) still fires DOMLoaded — guard
    // against that "blank hero" case instead of relying on the manual lottie-web preview gate.
    anim.addEventListener('DOMLoaded', () => {
      const svg = el.querySelector('svg');
      if (svg && svg.querySelector('path, g')) el.closest('.hero__title').classList.add('has-lottie');
      // else: nothing visible mounted → leave the static <h1> showing
    });
  } catch { /* lottie threw synchronously → leave the real <h1> visible (never add .has-lottie); F15 */ }
});
```
The static `<h1>` paints immediately (no FOUC / no blank hero); `.has-lottie` hides it only once the SVG actually mounts, so a 404/blocked-script leaves the real title visible.

**Gotchas:** outline-paths only (no baked font); SVG renderer (not canvas); author in the skill's supported subset (shape/stroke/trim/fill — no exotic AE effects/expressions) so Skottie-harness and lottie-web agree, and **verify the final JSON once in lottie-web's SVG renderer** before shipping (Skottie coverage is broader). File is small (low-tens-of-kB); lottie-web runtime ~84 kB gz, load `defer`.

**Files touched:** `index.html` (`.hero__title` wrapper + the `defer` script before `homepage.js`), `assets/css/styles.css` (`.hero__title*` near the existing `.hero h1` rule + the hero's reduced-motion block — locate by content; the line hints have drifted; `.hero__title-text` inherits `--font-display`/`--text-5xl` so the fallback matches — **the rule is `.hero h1` at `styles.css:975` (a DESCENDANT selector, not `.hero > h1` — verified), so wrapping the `<h1>` in `.hero__title` keeps it matching; both tokens confirmed present (`styles.css:51` `--font-display`, `:63` `--text-5xl`); if either is ever renamed OR the selector is ever tightened to a direct child, hardcode `font-family:'Cormorant Garamond',Georgia,serif; font-size:clamp(2rem,5vw,3.5rem)` on `.hero__title-text` so the swap-in isn't jarring**), `assets/js/homepage.js` (init), `assets/lottie/hero-title-writeon.json` (new — authored + bg-transparentized).

## 5.2 — Old-film hero (HyperFrames) — DECISION: build-time re-rendered MP4

**Resolved: (a) build-time re-render, NOT a runtime overlay.** The HyperFrames runtime artifact (`@hyperframes/player`) is a web component that *plays a composition* — it is **not** a real-time filter for an arbitrary site `<video>`, so "runtime via HyperFrames" doesn't exist; (b) would mean hand-rolling a WebGL/CSS-grain shader (fragile, per-frame mobile cost, would fight the existing parallax transform). Build-time matches "the *experience* is the subject," is deterministic (HyperFrames' core property), costs the browser exactly one `<video>` decode (today's cost), and is a **drop-in asset swap** that preserves every existing layer.

**Workflow.** Prereqs satisfied on this machine (Node 22.21, FFmpeg 8.1.1) — confirm with `npx hyperframes doctor`.
1. **Probe the source** so the composition matches exactly (hero is `object-fit:cover` — aspect must match): `ffprobe` the current MP4 for width/height/duration/fps.
2. `npx hyperframes init hero-oldfilm --example warm-grain --video ./homepage-hero-animation.mp4` (warm-grain starter + "Soft Signal" warm/intimate identity).
3. **Single full-frame video clip** composition (`muted playsinline`, framework owns playback — never `video.play()`); effects are CSS/SVG/canvas layers on the **seekable GSAP `tl`** (ambient pulses via `tl.to`, never bare `gsap.to`); **seeded mulberry32** for grain/weave jitter (no `Math.random`/`Date.now`); finite repeats (`Math.ceil(duration/cycle)-1`, no `repeat:-1`); grain via **CSS radial-gradient**, never an SVG-filter `data:` URL (taints capture).
4. `npx hyperframes lint` → `inspect` → `preview` (scrub the grade at `http://localhost:3002`) → `render index.html -o homepage-hero-animation.mp4 --fps <src> --quality high` (`--quality draft` while tuning; `--docker` for byte-identical repro).
5. **Re-grade the poster to match** (so the reduced-motion fallback isn't a clean image against graded footage): pull frame 1 of the render (`ffmpeg -i … -frames:v 1 -q:v 2 hero-bg-image-not-anim.jpg`).

**Effects (subtle — timeless, not gimmicky; back→front): ** warm grade on the video (`filter: sepia(.18) saturate(1.12) contrast(.94) brightness(1.02) hue-rotate(-6deg)`) · halation (screen-blend warm gold glow, opacity ~.06–.10) · fine 35mm grain (overlay, ~.10–.14 — lower than the skill's .18 default) · gate weave (≤1.5–2px seeded translate) + flicker (.97–1.00 opacity wobble), both on `tl` · gentle vignette (edges ~.30–.40, soft) — the live `.hero__overlay` already carries most text-contrast, so keep the baked vignette light to avoid doubling. Expose as `data-composition-variables` (`grainOpacity .12`, `halationOpacity .08`, `weaveAmplitude 1.5`, `flickerDepth .03`, `vignetteStrength .35`, `warmth .18`) so renders tune without HTML edits.

**CDN + integration (the only live-site change is bytes/URLs).** Existing objects are served `immutable, max-age=31536000`, so overwriting the same key won't bust caches. **Use a versioned key** (recommended over a cache purge): drop `hero-bg-anim/homepage-hero-animation-v2.mp4` + `hero-bg-image-not-anim-v2.jpg` to R2 (bucket `everlastings`, creds in `.env.local` per `reference_cdn_r2_drop`; `--cache-control "public, max-age=31536000, immutable"`), verify via public-URL `curl -I` (200 + correct content-type), then update **the three current URL strings** in `index.html` (CURRENT confirmed — swap each to the `-v2` key; F10):
> - `:161` `poster="…/hero-bg-anim/hero-bg-image-not-anim.jpg"` → `…/hero-bg-image-not-anim-v2.jpg`
> - `:162` `src="…/hero-bg-anim/homepage-hero-animation.mp4"` → `…/homepage-hero-animation-v2.mp4`
> - `:379` reduced-motion `background-image: url('…/hero-bg-anim/hero-bg-image-not-anim.jpg')` → `…-v2.jpg`
>
> No new layer, no z-index change, no runtime JS — the parallax `scale(1.2)/translateY`, `.hero__overlay`/`.hero__spotlight`/`.hero__glow`, and the reduced-motion poster swap all keep working untouched (the ≤2px baked weave never reveals an edge under the 20% zoom).

> **Reusable gotcha (also fold to `reference_cdn_r2_drop`):** the hero CDN objects are `immutable, max-age=1yr` — any static-asset *update* needs a **versioned key** (or a Cloudflare cache purge), not an in-place overwrite.
