# v3.5.3 — Gap Review, Angle D (design-correctness) — Round 3 (SCOPED re-run)

**Scope (deliberate narrow).** Angle D returned READY in round 2; this pass re-confirms ONLY the round-2 design deltas:
(1) the new `badge-unique` "One of a kind" spec in DESIGN §D.4 — render-correct + brand-consistent + placement/stacking; (2) the §A surgical-edits manifest now that the `products.html:334` View-Site href bullet was added — is the markup-diff set exhaustive for the Angle-B byte-check; (3) the merged card blocks (§6.5a / §6.3d) rendering struck price + unique badge + sold-state together. Everything outside these deltas is settled (ledger 1–33b) and was NOT re-litigated.

**Method.** Read the driver, the design addendum, and the design source (`out/products.html`, `out/products-app.js`, `out/account-app.js`, `out/sales-app.js`, `out/portal.js`, storefront `styles.css` badge + token block, and the IMPLEMENT §6.5a/§6.3d merged blocks + §9.2). Flag-don't-assert; where I assert, the CSS/markup was read directly.

---

## Part 1 — Findings (ranked)

### D3-1 (NARROW / render-correctness) — The default "show on all !sold tiles" path renders **Featured + One of a kind overlapping**; no stacking mechanic is specified. *(code-confirmed, not a guess)*

DESIGN §D.4 lists, as a render-tune item, *"its stack position when both Featured + One of a kind show (confirm they don't overlap in `card__media`'s corner)."* I checked whether the shipped CSS can satisfy that confirm — it cannot:

- `styles.css:592-598` — `.card__media .badge { position: absolute; top: var(--space-sm); left: var(--space-sm); z-index: 1; }` pins **every** badge in the media corner to the **identical** `top`/`left`.
- There is **no** sibling / `nth-child` / flex-container offset rule anywhere in `styles.css` (grep for `badge +` / `badge ~` / `badge:nth`/`:not`/`:last`/`:first` returns nothing).
- The merged blocks render two badges simultaneously on the common case:
  - **§6.5a shop** (IMPLEMENT:2390-2392): `${sold ? Sold}` · `${p.featured ? Featured}` · `${!sold ? One of a kind}` → a **live, featured** tile emits Featured **and** One of a kind.
  - **§6.3d homepage** (IMPLEMENT:2286-2287): `<span class="badge badge-featured">Featured</span>` is **unconditional** (populateFeatured renders featured products only) + `${!sold ? One of a kind}` → **every in-stock homepage tile** emits two badges.

Result: on every in-stock featured shop tile — and on **all** in-stock homepage carousel tiles — Featured and One of a kind render **dead-on-top of each other** at the same corner coordinates. In the shipped base this two-badge condition was a rare operator-oversight edge (`!available && featured`); this build makes it **guaranteed and common** on the showcase tiles, so it is newly load-bearing.

Why this is more than the flagged aesthetic confirm: §D.4 frames "all-tiles vs non-featured" as a single *taste* dial, but the two branches have **different build cost**, and only one is specified:
- **Non-featured gate** (`!sold && !p.featured`) → Featured and One of a kind become mutually exclusive → zero overlap, zero new CSS. BUT on the homepage carousel (all tiles featured) this suppresses "One of a kind" **entirely** — a consequence worth surfacing, not silently accepting.
- **Show-on-all** (the stated default) → **requires** a stacking mechanic that exists nowhere: either a sibling-offset rule (needs a concrete badge-height value — `--space-*` alone won't do it) or a `.card__media` badge-wrapper `<div>` with `display:flex; flex-direction:column; gap` (which is a **markup** change to the §6.5a/§6.3d blocks, i.e. it must be folded into the merged NEW, not just CSS).

**Fix (pick one, concretely):**
- **(a) Cheapest, no new CSS/markup:** make the **non-featured gate the default** (`!sold && !p.featured`) in §6.5a/§6.3d and in §D.4's "Trigger," and note the homepage-carousel consequence (One of a kind won't show there since every tile is Featured — acceptable, the tile already says Featured). This also collapses D.4's two coupled questions back into one.
- **(b) If "show on all" is wanted:** add the stacking spec to §D.4 + fold it into the merged blocks — a corner badge-stack container, e.g. `.card__badges { position:absolute; top:var(--space-sm); left:var(--space-sm); display:flex; flex-direction:column; gap:var(--space-xs); z-index:1; }` wrapping the badges, with `.card__media .card__badges .badge { position:static; }`. This is a markup edit to §6.5a/§6.3d (a wrapper `<div>`), so enumerate it (it would also need a mirror in `product.js`'s PDP related-card if that ever stacks).

Either way, the render-tune line as written ("confirm they don't overlap") is not confirmable against the shipped CSS — the overlap is the default outcome. This is the one open item beyond the flagged trigger.

### D3-2 (LOW / needs-verify — graceful, likely fine) — `badge-unique` is the **first** `color-mix()` in the storefront, which has **no** OKLCH fallback (the portal deliberately keeps one).

DESIGN §D.4 spec: `.badge-unique { background: color-mix(in oklch, var(--accent-primary) 12%, white); color: var(--accent-primary); border: 1px solid color-mix(in oklch, var(--accent-primary) 30%, transparent); }`.

- **Brand + token check PASS:** `--accent-primary` resolves to `--color-plum` = `#4A1942` (styles.css:28,46) — a genuine warm-plum **storefront** token. No portal indigo-slate leak. The `color-mix(in oklch, #4A1942 12%, white)` form is valid CSS (hex is fine as a color-mix operand). Brand-consistent. ✓
- **Fallback gap:** `styles.css` uses **zero** `color-mix` today and has **no** `@supports not (color: color-mix(...))` block (unlike `portal.css:70-88`, which ledger 8 says to keep on purpose). On a pre-2023 engine without OKLCH `color-mix`, both the `background` and `border` declarations are invalid→dropped; the badge falls back to `.badge` base (`background: var(--bg-primary)` cream) + its own non-mix `color: var(--accent-primary)` (plum, survives) → **cream bg, plum text, no border** — legible, but visually near-identical to `.badge-featured` (cream + gold border + plum text). Degradation is **graceful**, not broken.
- **Flag, not a blocker:** For a 2026 storefront OKLCH `color-mix` is ~97%+ supported, so this is low-severity. Surface only so the builder makes a conscious call: either accept the graceful fallback, or add a flat-hex `background`/`border` **before** the `color-mix` lines (progressive-enhancement order) for parity with the portal's deliberate fallback stance. Needs-verify against the target browser floor.

### D3-3 (PASS, no action) — §A markup-diff manifest is now **exhaustive** with `products.html:334` added.

Verified the `out/`→`admin/` shell/markup diff set is complete:
- `products.html:334` is confirmed a **static** hardcoded `href="https://everlastingsbyemaline.com"` on the rail-foot View-Site link — correctly enumerated as the one markup-attribute swap. ✓
- The other two storefront links in `out/` are **JS-rendered and already config-parameterized**, so they correctly do NOT belong in the markup-diff manifest (they ride the mock-`config`→real-config data seam, not a markup edit): `account-app.js:100` (`href="${cfg.siteUrl || "https://…"}"`) and `sales-app.js:83` (`const base = (D.config && D.config.siteUrl) || "https://…"`). Both are covered by the §A umbrella "WS1 … account-app.js" wiring bullet + the config swap. No omission.
- `badge-unique` adds **no** markup to the `out/`/admin files (it is a storefront-only addition in `shop.js`/`homepage.js`/`styles.css`), so it doesn't affect this manifest. ✓

The Angle-B byte-check on the admin/`out/` files is now exhaustive: head `robots` meta (WS1), miniature-only picker options (WS2), removed Sold-tab `data-alert` (WS8), removed Delivered pill + CSS (WS3), `--staged`→`--waiting` token value (F4, `products.html:288`), and the `products.html:334` href swap (WS1). No further markup diff is implied by the round-2 deltas.

### D3-4 (PASS, no action) — merged card blocks render the sold/live matrix correctly.

Walked the two branches of §6.5a (and §6.3d mirrors it):
- **Sold piece:** `sold` true → `<badge badge-sold>Sold</badge>`; price is `formatPrice(p.price)` **plain** (no struck — DESIGN §D.1); `${!sold ? unique}` is false → **no** One-of-a-kind. Correct: a sold piece = plain price + "Sold" + no unique badge. ✓
- **Live piece:** `sold` false → no Sold badge; price `priceHTML(p.price, window._activeSale)` → struck-was/now **only** when a percent sale is active (`priceHTML` renders plain otherwise, so the `!sold` branch is safe with or without a sale); `${!sold ? unique}` true → "One of a kind." Correct: struck (when sale) + "One of a kind." ✓
- §6.5b PDP-related fallback (`(rp.quantity != null ? rp.quantity <= 0 : !rp.available)`, IMPLEMENT:2432) matches the qty-based sold rule. ✓

The only render defect in this matrix is the **two-badge overlap on the live+featured cell** (D3-1) — the struck/sold/unique *logic* itself is correct.

---

## Part 2 — The single most important insight

**§D.4's "one design confirm" is actually two coupled decisions, and its **default** branch has an unspecified render dependency.** The flagged trigger (all `!sold` tiles vs non-featured) is not a pure taste dial: the **show-on-all** default renders Featured + One of a kind at the *same* corner coordinates (`\.card__media .badge` pins every badge to one `top`/`left`, with no sibling-offset rule), so it visibly overlaps on every in-stock featured shop tile and on **every** homepage carousel tile — while the **non-featured** branch resolves the overlap for free but silently removes "One of a kind" from the entire homepage. Close it by picking: default to the non-featured gate (cheapest, zero new CSS — note the homepage consequence), **or** add a concrete badge-stack container to §D.4 and fold that wrapper markup into the §6.5a/§6.3d merged blocks. Everything else in the round-2 delta (token/brand correctness, the manifest, the sold/struck/unique logic) checks out.

## Part 3 — Verdict

**NEEDS ANOTHER PASS (NARROW)** — bounded to DESIGN §D.4: specify how Featured + One of a kind coexist (either default to the non-featured gate, or add the corner badge-stack mechanic + fold its wrapper into §6.5a/§6.3d), and optionally add a flat-hex fallback before the `color-mix` lines. The `products.html:334` manifest and the merged-block sold/struck/unique logic are confirmed correct — no re-run needed there.
