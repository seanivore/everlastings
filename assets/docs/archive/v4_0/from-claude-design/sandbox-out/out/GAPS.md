# out/ — Gaps found while building the demo (design-currency backlog)

These are real design/behavior gaps discovered while building the public demo
(`shop-admin/`) that also apply to the clean handoff in **`out/`** and/or the live
Everlastings site. Each is described so a fresh chat can fix it directly in `out/`
(or hand the live-site team a file-specific change). None of the demo-only stuff
(fake login, session store, welcome modal, playful popups) belongs in `out/`.

For the lifecycle/sold-out reasoning, see the companion **`out/PRODUCT_LIFECYCLE.md`**.

---

## 1. "New" product button is a stub — must create a blank draft + open editor
**Where:** `out/products-app.js` — the `#newBtn` click handler.
**Now:** it only fires a toast ("Start a new product — opens a blank draft editor");
no product is created and no editor opens. Clicking New does nothing usable.
**Fix:** on click, create a blank draft product (all fields empty, `is_published:false`,
`draft:null`, `archived_at:null`, a fresh id), unshift it into `products`, switch to the
**Drafts** tab, and open its editor (accordion on desktop, sheet on mobile) with the
required-field gate active. Also `e.stopPropagation()` on the New handler so the click
doesn't bubble to the "click-outside-to-close" document listener and immediately shut the
editor. (In the demo this also writes through the session store; `out/` just mutates
`products` + re-renders.)

## 2. Publish must be gated on "previewed at least once"
**Where:** `out/products-app.js` — `publishBtn()`, `refreshGate()`, `openPreview()`.
**Now:** a ready product can be published without ever opening the storefront preview.
**Fix:** track a per-product `_previewed` flag. In `publishBtn()`, if readiness is OK but
`!_previewed`, return the **disabled** Publish button (not the active one). In the actions
row show the note: *"Preview this product before publishing — you can publish right from
the preview."* Set `p._previewed = true` inside `openPreview()` and refresh the gate so the
editor's Publish enables after a preview. Mirror the same note logic in `refreshGate()` so
it stays correct as fields fill in live.

## 3. Publish from the preview (the review bar's Publish button)
**Where:** the storefront **preview/review bar** (live site: `assets/js/product.js`
`mountPreviewBanner`; demo: `preview-app.js`).
**Note:** the live site already has the correct review bar (SEO title/description, checkout
name/line each with Copy, + Thumbnail 4:5 / OG 1.91:1 / Checkout 1:1 image crops, gold
Publish, "Hide draft details" toggle). It publishes via `POST /api/products/publish`.
The demo ports this verbatim and publishes by posting a message back to the dashboard.
**For `out/`:** if `out/` is meant to show the preview experience, it should reference this
same review bar as the canonical spec — don't invent a different one. Publish-from-preview
is the intended primary publish path that gate #2 leads into.

## 4. Remove the "Relist this piece" button on never-published drafts
**Where:** `out/products-app.js` — editor Lifecycle/row-actions section.
**Now:** the relist button shows whenever `quantity === 0 || !available`, which is true for
a brand-new draft — so new products wrongly show "Relist this piece."
**Fix:** only show relist when the piece was previously published, i.e.
`p.is_published && (p.quantity === 0 || !p.available)`.

## 5. Sold-out wording + the "Sold" tab (see PRODUCT_LIFECYCLE.md)
**Where:** `out/products-app.js` — tabs (`TABS`/`inTab`), state words, and the Orders
alert that was pinned to the Sold tab.
**Decision for Everlastings (one-of-a-kind):** keep the dedicated **Sold** category
(sold pieces stay there until archived) — but (a) keep the word "Sold" (not "Sold out /
out of stock", which implies a restock that never comes), and (b) **stop hanging the
"unseen orders" blink on the Sold tab** — that conflates inventory with sales activity, and
Orders already has its own rail badge. Full three-policy reasoning (stay-Live / auto-draft /
dedicated-Sold) is in `PRODUCT_LIFECYCLE.md`.
*(The demo, being restockable goods, dropped the Sold tab and keeps sold-out under Live with
a "Sold out" badge — that's the demo's choice, not necessarily Everlastings'.)*

## 6. Orders badge should be a live, shared count (not hardcoded)
**Where:** shell/nav badge + Orders surface.
**Now:** the rail/tab "unfulfilled orders" badge was a hardcoded `2` on some surfaces, so it
didn't drop when an order shipped, and the blink never cleared at zero.
**Fix:** compute the unfulfilled count from the data (orders grouped by payment intent that
have a paid-but-unshipped line), paint it on the Orders nav item, and refresh it after any
ship/refund. When the count is 0, remove the badge and the blink entirely.

## 7. Product list ergonomics — default order, column sorting, pagination
**Where:** `out/products-app.js` list + `out/products.html` list header.
- **Default order:** define it explicitly (newest-first `created_at DESC`, or a draggable
  `sort_order`) instead of relying on API return order.
- **Column sorting:** make the list header columns (Product / Price / Qty / Avail / Feat)
  clickable to cycle **asc → desc → natural** (spreadsheet-style). Client-side is fine for a
  small catalog; at scale move to a server-side `ORDER BY`.
- **Pagination:** the list renders every product (fine ~10–30). Past ~50, paginate:
  25/page default + a 25/50/100 per-page dropdown, server-side sort/filter.

## 8. Minor polish also worth carrying
- **Dimension/weight units:** show the unit suffix (W / D / H, and `lbs`) as the value is
  typed, and store weight as e.g. `"3 lbs"`.
- **Staged-edit ring:** the orange "edited field" ring needs to be clearly visible (border +
  soft glow at rest, not only on focus).
- **Empty-state copy:** drop redundant "products show up here once they reach this state"
  lines — the tab label already says it.
- **"Price · live" header:** drop the "· live" — price saves instantly, so it's noise.

---

### How to work this list
Fix items **1, 2, 4, 5, 6, 7, 8** directly in `out/` (they're the design deliverable).
Item **3** is a spec pointer — the live site already has the real review bar; `out/` should
point at it rather than reinvent. Re-run the normal gap-review after editing `out/`.
