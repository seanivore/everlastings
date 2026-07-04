# v4.0.0 — Design Addendum

**Addendum to** `v4_0_0_IMPLEMENT.md`. The presentation layer for the Content Creator Portal redesign — the four portal surfaces (WS1 shell + WS2 Products + WS3 Orders + WS4 Sales + Account) — plus the three storefront-brand additions the portal design implies but can't carry (WS4 struck-`%` pricing + top utility bar + sale popup).

**Status.** The front-end design is finished and delivered by Claude Design in `v4_0/design-source/out/` (four vanilla HTML/CSS/JS surfaces + shared `portal.css`/`portal.js`, running on a mock `data.js`). This addendum does **not** re-author that markup — it names the byte-source, the boundary the integration honors, the design deltas `out/` can't carry (which the IMPLEMENT wires), and the render-tune surface Sean adjusts on the live preview.

> **Design-file anchors — re-verify against the polished set.** The `out/` here is Claude Design's **polished** set — richer than the earlier `/out/` these design blocks were first written against. So every class/token/surgical-edit anchor below is re-verified against `v4_0/design-source/out/` at build: the quoted text is the anchor; if CD already did a listed surgical edit (e.g. the Sold-tab alert removal, per CD's `CHANGELOG_GAPS.md`) or renamed a class, that edit is moot — skip it and note why. Same discipline as the IMPLEMENT's design-file caveat.

> **Executable-design bar.** Design is planned exactly like functionality: **concrete-default + render-tune**, tested + feedback'd, never frozen-no-feedback. The bar is *"concrete enough the builder never guesses, and Sean render-tunes on the live preview"* — NOT final-pixel. Real content is never a build/test gate (production-grade placeholders via the existing AI pipeline). **Brand separation is load-bearing:** the portal is a **cool indigo-slate** reusable template (`--accent: oklch(42% 0.055 262)`), deliberately distinct from the storefront's **warm-plum** brand — plum/serif tokens are never imported into `admin/`; the three storefront additions in §D use the storefront's own tokens.

**KILL list (the delivered `out/` already avoids these; the integration must not reintroduce one).**
- **No product tiles.** A product is a **row** (the spreadsheet), never an image-led card grid. (`reference/vCCP-3-1.jpg`)
- **No components-inside-components / dropdowns-inside-cards.** Each field gets clear space + an obvious label. (`reference/vCCP-2-2.jpg`)
- **No redundant color *text-tags*.** State is encoded by **color alone** (the row LED, the field-border ring) — never a printed "LIVE NOW"/"WAITING" label. (`reference/vCCP-1-3.jpg`, `vCCP-1-2.jpg`)
- **No words inside state pills/LEDs.** A pill/LED is just color; learned in 2-3 clicks (or ask the GPT). (`reference/vCCP-1-8.jpg`)
- **No oversized mobile fonts / wasted space.** Mobile type is **small and dense — NYT scale**. (`reference/vCCP-1-2-example.jpg`)
- **No portal-name header.** The top-left "Content Creator Portal" is dropped.
- **No multi-click state changes** and **no helper text stacked under fields** (helper text lives in the label tooltip; context reveals on field focus).

---

# A. `out/` is the canonical byte-source

**Ship the delivered markup / class-names / `portal.css` verbatim EXCEPT the few surgical `*-app.js`/markup edits the integration makes (below).** The finished design in `v4_0/design-source/out/` IS the source of truth for every portal pixel — not a mockup to re-derive. WS1 Phase 1.1a lands these files in `admin/` unchanged; the data-wiring workstreams swap **mock arrays → API responses** and **no-op mutations → the documented endpoints** *without changing markup or class names*, plus the named surgical edits. From `INTEGRATION.md §2`:

> Design to the **contract** (`data-flow.md`); do not assume these files call it. All actions in the prototype mutate an **in-memory model** and show the honest confirm/optimistic state a real call would. Replace those mutations with the documented endpoints; **do not** change markup or class names to do it.

**The eleven files that ship (WS1 Phase 1.1a — copied into `admin/`, then surgically edited):**
- `portal.css` — the whole design system (tokens in `:root` re-hueable from there; every shared component: shell, rail, tab bar, buttons, `.switch` toggles, `.field`/`data-ring` fields, `.tip` tooltips, `.led`, `.pill`, `.seg` segmented filter, `.skel`, `.toast`, `.modal`/`.scrim`). **Zero literal hex in component CSS** (the semantic state literals `#D95301`/`#297fb4`/`#83718a` are token *values* in `:root`).
- `portal.js` — framework-free shared helpers: `PORTAL.env()`, `PORTAL.mountShell()`, `PORTAL.toast()`, `PORTAL.money`, `PORTAL.siteUrl()`, auto-grow textareas, character counters, tap-tooltips.
- `data.js` — the **mock** dataset, shaped to `data-flow.md`. **This is the seam that gets replaced** (its `products`/`orders`/`coupons`/`storeWideSale` arrays + `config` → the real `/api/*` responses); markup keys off the same field names.
- the four **shells** — `products.html`, `orders.html`, `sales.html`, `account.html`.
- the four **surface apps** — `products-app.js`, `orders-app.js`, `sales-app.js`, `account-app.js`.

The three docs (`README.md`, `INTEGRATION.md`, `PRODUCT_LIFECYCLE.md`) are handoff reading — **they do not ship** to `admin/`.

**Surgical edits to the shipped files (the ONLY diffs; everything ELSE is verbatim — re-verify each against the polished set, some may already be done):**
- **WS1** — the `robots` noindex meta in each shell's `<head>` (Phase 1.1c); the routing/config/auth wiring in `portal.js` + `account-app.js` (Phases 1.3–1.5).
- **WS2** — narrow the `product_type` picker `options` in `products-app.js` (editorHTML) to **miniature-only** (`["miniature"]`).
- **WS8** — remove the Sold-tab `data-alert` in `products-app.js` (Phase 8.2b). *(CD's CHANGELOG says they already removed this — verify, likely moot.)*
- **WS3** — remove the **Delivered** pill in `orders-app.js` + its `.tpill--delivered` CSS.
- **§A token fix** — in `products.html` `.sched-chip`, replace the three `var(--staged)` (a token defined **nowhere**) with `var(--waiting)`.
- **WS2 lock cue re-key** — the editor's checkout-identity lock fields compute `locked:` off `everPublished = !!p.published_at`, NOT `is_published`, so a PAUSED (ever-published) piece keeps them locked (matches the server `FROZEN_AFTER_PUBLISH` guard, §2.7a). The media modal likewise locks the checkout role + excludes `checkout_image` from the terminal `PUT` on any `published_at != null` piece (IMPLEMENT §5.4e). See the field-lock taxonomy below.
- **WS1 — View-Site href** — swap the static `products.html` rail-foot link (`href="https://everlastingsbyemaline.com"`, hardcoded prod) → env-aware `P.siteUrl()`, so preview points at the preview storefront (behavior in §D.3). The one markup-attribute swap in the otherwise "no markup/class changes" data-wiring.

**Byte-check discipline.** Every DECIDED design block here (and every markup/class the IMPLEMENT's integration-seam tables key off) is verified against `out/` except the surgical edits. If a review round wants a class renamed or markup re-shaped beyond that list, that's a *design* change — it goes back through `out/` (or a `<!-- NEEDS-VERIFY -->` here), never a silent edit during data-wiring. This is what lets the IMPLEMENT carry integration-seam tables instead of full byte-blocks for the presentation surfaces.

---

# B. Reference sources + the design system

**Read order (the aesthetic anchor before the deltas):**
1. `design-handoff/controls.html` — **the look.** Its typography, spacing, container blending, the weight-not-bounce feel, and especially its **nav** (the desktop notebook-spine rail ↔ mobile thumb-zone tab bar, one component in both layouts) are the gold standard. `portal.css`'s shell/rail/tabbar/button/toggle/field primitives are lifted from it verbatim.
2. `design-handoff/tokens.css` — the exact OKLCH token values lifted from `controls.html`. Every color is OKLCH or `color-mix()` from one hue token, so the template is re-hueable by editing a couple of tokens. Lift, don't approximate.
3. `design-handoff/reference/` — the annotated review shots (`vCCP-*.jpg`) grounding each KILL-list item; consult a shot when a decision's *why* is unclear.
4. `design-handoff/feedback/FEEDBACK_v1.md` — Sean's v1 review, esp. **§8 the media-modal spec** (§C below), §3 (the LED/tab color palette), §9 (the sticky row-bar + auto-save-on-close mechanic).

**The token system (what "re-hue" means).** `portal.css` `:root` (verbatim from `tokens.css`) carries the structural indigo-slate + a semantic-STATE palette **reserved strictly for state**:
- `--live: oklch(58% 0.13 150)` — **green** = live / published / required-met
- `--waiting: #D95301` — **orange** = staged edits, needs publish (blinks — more urgent than draft)
- `--draft: oklch(80% 0.142 88)` — **yellow** = draft (never published; blinks)
- `--sold: #297fb4` — **blue** = sold
- `--archived: #83718a` — **purple-gray** = archived
- `--danger: oklch(55% 0.16 25)` — **red** = destructive / blocking publish

Re-hue happens **only** through these tokens (edit `:root`, never a component rule). An `@supports not (color: color-mix(in oklch, red, blue))` block (`portal.css`) provides a flat-hex fallback — keep it. **State color is never spent on decoration:** all five state hues live on the row LED, plus green/yellow/orange on the field-border rings; sold + archived ALSO get their own tabs.

---

# C. Integration deltas `out/` carries as design but can't wire

`out/` is a finished *design* on a mock model. The behaviors below are **designed** (markup, colors, interaction all exist in `out/`), but the live wiring lives in the IMPLEMENT — this addendum references the workstream, it does not duplicate the code.

## C.1 — Field → behavior mapping (WS2; `data-flow.md §Products` is the field taxonomy)

**Two-speed, taught by color not words.** Some fields apply to the shop **instantly when saved** — `price`, `quantity`, `available` (the live-commerce group; `commitPrice`/`commitQty`/`commitAvail`); the rest (wording, photos, SEO) are **staged** and go live on publish. The field rings + grouping carry this; the words "draft/staged/live" never appear. Wiring: **WS2 Integration seam** maps each `commit*` / `autosave()` no-op onto `PUT /api/products?id=` (live-apply rotates the Stripe price) vs a staged draft `PUT`/`POST`. Do not add `effective`-merge to the hot GET — the editor's client-side `eff()` draft-merge (`products-app.js:340`) mirrors `admin.js:310`.

**The 5-color row LED (`portal.css` `.led--*`; blink is designed).** `out/` colors the row LED for **all five** states (`products-app.js` `ledFor()` → `.led--{state}`): `.led--live` (green), `.led--edits` (orange `--waiting`, faster `led-pulse` blink — staged is the more urgent nudge), `.led--draft` (yellow, `led-pulse` blink), `.led--sold` (blue `#297fb4`, steady), `.led--archived` (purple-gray `#83718a`, steady). The `.led--*` classes are the **ROW LEDs**; the **`.dot--*`** classes are the separate **segmented-filter dots**. Sold + archived **ALSO** appear as tabs — both the LED color AND a tab. The single source of truth for the dot/word is `computeState()` (precedence `archived > draft > staged-edits > sold(qty0) > live`, **no `!available→sold` branch**). Wiring is WS2.

**Field-border rings green / red / yellow (`portal.css` `.field[data-ring="…"]`).** The ring lives on the field border, never a tag beside it: **green** = required + valid; **red** = blocking publish (required + missing/invalid); **yellow** = edited text needing review before re-publishing. The gate + red-ring set uses the authoritative required set (see IMPLEMENT Locked-decisions §"Editor field rules"), plus required-but-auto-generated-if-blank (`seo_*`/`checkout_*`, never block publish). The `data-ring` attribute is set by the surface's `readiness()`/`refreshGate()`; wiring the *set* to real fields is WS2 Phase 2.7. Publish also requires a **Preview** for a never-published product, and the control names what's missing in plain maker's language.

**Field-lock taxonomy — show locked, not missing.** Locked fields render with a **lock chip + `disabled`** (the CD dashboard's affordance — reads clearly on its own; the earlier dashed `.field--locked` style is unused), never removed. Lock timing is **3-tier** (IMPLEMENT Locked-decisions → **Field-lock taxonomy**): `sku` **born-locked** (generated at create, never editable); `slug` **locks on first persist** (`!!p.slug`; auto-generates from the title, immutable server-side from creation); `checkout_name/description/image` **lock at publish** (`everPublished = !!p.published_at`, matching the server `FROZEN_AFTER_PUBLISH`). Wiring is WS2 + the media modal (§5.4e).

**Sold / archived get BOTH an LED color AND a tab (`portal.css` `.seg` segmented filter).** The Products tabs are **Live · Drafts · Sold · Archived · All** (default Live) — sold + archived each get their own tab **in addition to** their row-LED color. Turning **Available OFF on a live piece makes it a Draft** (unpublish/hide), NOT "sold". Turning Available back on from a row prompts to add stock if quantity is 0 (`promptStock`). "Sold" is `quantity===0` from a real sale only. Wiring: WS2 Phase 2.2. *(The old `data-flow.md:52-57` computed-state table derived state from the `available` flag — superseded; `computeState()` is authoritative, and the IMPLEMENT makes the server semantics match (WS2 §2.2 + WS6 §6.5). Don't re-derive state from `available`.)*

## C.2 — The media modal (WS5; full spec is FEEDBACK_v1 §8)

The media UX is **one "Add / edit media" modal** — do **not** re-author its markup (it ships in `out/products.html` + `products-app.js`: `.modal`/`.modal__card`, `.dropzone`, `.mitems`/`.mitem`, role pills, coverage counter; `openMedia`/`handleFiles`/`addUrl`/`applyMedia`/`renderMedia`/`coverage`). The **full behavioral spec is FEEDBACK_v1 §8** (batch upload / drag-drop / device pick / URL paste / YouTube embed; per-image **role checkboxes with logic** — one hero, hero≠gallery, share/checkout/poster combine freely; per-video **Loop / Mute / Hide-controls / Autoplay**; required **alt text** on every item; reorder + delete; a live coverage counter; "hero reused for share/checkout if missing"; new uploads insert at top and pulse). **This is the most intricate integration item and gets its own review pass.**

The design is finished — the integration reconciles **data-shape** in `applyMedia`/`openMedia` (WS5) so what the modal persists matches what the storefront reads: batch/drag-drop = a client fan-out of single-file `POST /api/upload` multipart calls (WS5 §5.1a); URL paste = the existing by-link JSON branch (§5.1b); video already accepted, MP4+WebM only, `skip_transform:true` (§5.1c); YouTube stores `{type:'youtube', url, alt}` and the render path already exists (§5.2); the two key mismatches (`mute`→`muted`, add `poster`) fixed in `applyMedia` (§5.2c). All roles map to the existing `ROLE_PATTERN` enum (§5.1d).

## C.3 — Character counters + recommended targets (FEEDBACK §8.7)

`portal.css` ships `.count` + `.count.is-over` and `portal.js` wires the live counter. **Ship BARE counts by default** for on-page copy fields (title/headline/description/story_card): the `.count` counter increments with keystrokes and turns `.is-over` only where a REAL cap applies. SEO fields keep their platform caps as `data-target` attributes: `seo_title` ≤ 60, `seo_description` ≤ 155. Only those two have `data-target`; every other field is a bare count (no 0/limit ratio that reads as always-over). Per-field targets belong to the field DATA MODEL, not this addendum — the future upgrade path is a first-class `FIELD_CONFIG` (or a `site_config` row) that `portal.js`'s counter reads on mount; does NOT ship in this build.

---

# D. NEW components NOT in `out/` (authored here; storefront brand, not portal)

These three additions live on the **storefront** (warm-plum) and are **not** in the delivered `out/` package — they use the storefront's own tokens. Concrete-default + render-tune, wired in the IMPLEMENT.

## D.1 — Struck-`%` sale pricing render (WS4 Phase 4.3–4.5; `.price-sale`)

**Concrete default (storefront tokens, `styles.css`).** When a store-wide **percent** sale is active, the price renders struck-through-was + now, via `priceHTML(cents, sale)` on every storefront surface (shop grid, product sticky card, homepage carousel, cart line + estimate):
- `.price-sale { display: inline-flex; align-items: baseline; gap: var(--space-sm); }`
- `.price-sale__was { text-decoration: line-through; color: var(--text-muted); font-weight: 400; }`
- `.price-sale__now { color: var(--accent-primary); font-weight: 600; }`

Percent-only (a `$`-off store-wide stays a plain checkout code). **Sold items always render plain.** The JSON-LD `offers.price` stays the true undiscounted unit price — do NOT touch `injectProductJsonLd`. Wiring is WS4 Phase 4.5. **Render-tune:** the strike weight, the was/now spacing, whether the cart estimate shows the struck preview.

## D.2 — The thin top utility bar + once-only sale popup (WS4 Phase 4.3.b–4.3.d; storefront tokens)

**Concrete default (`main.js` `mountSaleChrome`, storefront tokens only).** A thin reusable **top utility bar** (free-shipping reminder by default, the sale line when active) + a **once-only, dismissible, upper-right sale popup** on every storefront page load, `localStorage`-gated (`everlastings.saleSeen`, **code-scoped** so a new sale re-shows). Mounts from `getActiveSale().then(mountSaleChrome)`. **Render-tune:** the bar copy/height, the popup's brand treatment + entrance, the dismiss affordance — the load-bearing parts are the once-only gate and the storefront-token palette.

## D.3 — The env chip topology (WS1; `PORTAL.env()` hostname rule)

**Concrete default (`portal.css` `.test-chip` / `.test-chip--live` / `.envstrip`; `portal.js` `PORTAL.env()`).** The Test/Live marker is **derived from `window.location.hostname`, never hardcoded**. Desktop = a chip top-right; mobile = a full-width strip. The hostname rule:
- `*.vercel.app`, `localhost`, `file://` → **Test** (amber `--waiting`)
- `everlastingsbyemaline.com` → **Live** (green `--live`)

The **env-aware "View Site"** link targets the current environment's storefront via `PORTAL.siteUrl()` (`location.origin` on Test/preview, the prod domain on Live). WS1 wires these; it does not re-decide them.

<!-- NEEDS-VERIFY: confirm the preview/prod hostname split in PORTAL.env() matches the actual Vercel deploy topology (custom domain on prod, *.vercel.app on preview). -->

## D.4 — "One of a kind" tile scarcity badge (WS9 Phase 9.2/9.2a; `.badge.badge-unique`, storefront tokens)

**Concrete default (storefront tokens, written to `styles.css` by IMPLEMENT §9.2a).** A small `badge badge-unique` with the exact copy **"One of a kind"** renders in the tile's `.card__media`, reusing the storefront `.badge` base (position/shape/size already defined for Sold + Featured — the new class only sets its hue). **Solid tokens, no `color-mix()`:**
- `.badge-unique { background: var(--bg-primary); border: 1px solid var(--accent-primary); color: var(--accent-primary); }` — warm-plum, distinct from Featured's gold border.

**Render markup** is folded into the merged card blocks — shop grid `§6.5a` and homepage carousel `§6.3d` — as `${!sold && !p.featured ? '<span class="badge badge-unique">One of a kind</span>' : ''}`. **Trigger — mutually exclusive by gate (exactly one badge, zero extra CSS):** Sold (`sold`), Featured (`!sold && p.featured`), "One of a kind" (`!sold && !p.featured`). Since `.card__media .badge` pins **every** badge to the same corner (no sibling-offset rule), mutual exclusion is the zero-CSS way to prevent overlap — and it's structural (gating Featured on `p.featured` + `!sold` in both blocks means no stack can occur). *(Consequence: the homepage carousel is featured-only, so "One of a kind" shows on the shop grid's non-featured pieces, not the homepage — fine.)*

**The one design confirm (surface, don't silently decide) — want "One of a kind" on featured tiles too?** If yes, do NOT just drop the `!p.featured` gate (the badges would overlap). Add a stack rule so a second badge drops below the first, then gate the render on `!sold` only:
- `.card__media .badge ~ .badge { top: calc(var(--space-sm) + 1.9rem); }`

Ship the non-featured default; adopt the stack rule + `!sold`-only gate on the live preview only if Sean wants the badge everywhere. **Render-tune:** the badge hue/weight, the exact stack offset if adopted, the copy.

---

# E. Render-tune + the design checklist

The design ships concrete; Sean render-tunes on the live preview. A design pass confirms each of these holds — they are not re-decides.

- **Re-hue via `tokens.css` only.** The portal is **cool indigo-slate** (`--accent: oklch(42% 0.055 262)`), distinct from the storefront's **warm-plum** brand — verify no storefront plum/serif token leaks into `admin/`, and no portal token leaks into the §D storefront additions. Re-hue is editing `:root`, never a component rule.
- **Mobile-first is the PRIMARY context.** Type is **NYT-dense small**, zero wasted space; text **inputs are 16px-min** so iOS never zoom-jumps (`portal.css .input` is 16px on mobile, tightening to 14px only at `≥860px`). Prove mobile-first by construction: one component renders correctly in *both* the desktop row and the phone list (the row collapses to a dense tap-friendly list item — a row, never a tile); the nav is one component rotating between the desktop rail and the mobile bottom tab bar. No phone-mockup wrapper.
- **Motion = weight, not bounce** (`--ease-weight: cubic-bezier(.2,.7,.3,1)`; a 1px sink + collapsing shadow + instant focus ring — never a spring/overshoot), and **`prefers-reduced-motion` is honored** (`portal.css` collapses transitions/animations, drops the skeleton shimmer, disables press-transforms). Confirm the LED/tab blink, the new-order alert, **and the sign-in canvas FX** respect it (the sign-in canvas is a JS `requestAnimationFrame` loop CSS can't reach — IMPLEMENT WS1 §1.4f guards `initLoginFx`).
- **Accessibility — honest, not CSS-faked.** Focus rings reach every interactive control (`:focus-visible` box-shadow); enable/disable is **computed and honest** (the Publish gate genuinely disables + explains, never fakes validity); the `.vh` visually-hidden helper carries screen-reader labels; the lock icon exposes its tooltip on hover AND focus. State is never *only* color where it blocks an action — the red publish-gate ring is paired with plain-language "what's missing" text.
- **Responsive.** Verify the rail↔tab-bar swap at the 860px breakpoint, the collapsible desktop rail (icon-only + hover-label tooltip), the segmented filter's horizontal scroll on narrow screens, and that no field truncates a long title mid-word.
- **State-color correctness.** The row LED colors **all five** states (green live, orange edits, yellow draft, blue sold, purple-gray archived); sold + archived **ALSO** get their own tabs. live/draft/edits blink (staged is the faster, more urgent pulse); sold/archived are steady. Green = on/in-the-shop for the Available + Featured toggles. Confirm no color is spent on decoration, and that both the row LED (`.led--*`) and the segmented-filter dots (`.dot--*`) use the full 5-state palette.

---

**Constraints honored:** vanilla HTML/CSS/JS, no build step, `out/` markup + class names shipped verbatim (only the enumerated surgical edits), the portal's indigo-slate never mixed with the storefront plum, mobile-first by construction, every design decision either byte-anchored to `out/` or referenced to its IMPLEMENT workstream.
