# Changelog — GAPS.md fixes (front-end design pass)

Worked the punch-list in **`GAPS.md`** directly in `out/`. This log is written for a
**modular sync workflow**: each entry says *what* changed, *which files*, and *how*, so a
fix made here can be dropped into the live directory (or reconciled with another agent's
gap review) file-by-file.

## Portability key
Each changed file is tagged for drop-in safety:

- **PORTABLE** — pure front-end; identical filename lives (or should live) in the real
  directory. Safe to copy over wholesale after review.
- **SEAM** — the design/backend boundary. Its *logic* ports, but you never overwrite the
  live version wholesale. Here that's only **`data.js`** (mock arrays → real API responses).
  Copy the *added helper functions / field additions*, not the mock data itself.

| File | Tag |
|---|---|
| `products.html`, `products-app.js`, `orders-app.js`, `sales-app.js`, `account-app.js`, `portal.js`, `portal.css` | **PORTABLE** |
| `data.js` | **SEAM** (port the `created_at` field + `unfulfilledCount()` helper; keep the real data layer) |

## Build order used
Items were worked in a dependency-aware order (all of 1–8 done, nothing skipped):
**foundations** (`created_at` + shared unfulfilled-count helper) → **6** → **5** →
**1 + 2 + 4** (one publish/editor cluster) → **7** → **8**; **3** is a spec pointer folded in.

---

## Foundations (shared, pulled out first)

**`data.js`** *(SEAM)* — two additions near the end of the IIFE, before `window.PORTAL_DATA`:
- **`created_at`** on every product (real Postgres schema field). Seeded via a `CREATED_AT`
  id→date map so the list has a stable, explicit **default order** instead of leaning on API
  return order. A product created in the UI gets `new Date()`, so new pieces sort to the top.
  *Port:* add the `created_at` column + `ORDER BY created_at DESC` server-side; drop the mock map.
- **`unfulfilledCount()`** — single source of truth for the unshipped-orders nav badge. Groups
  order rows by `stripe_payment_intent` and counts purchases with a paid-but-unshipped
  (`status === "completed" && !shipped_at`) line. Exported on `PORTAL_DATA`.
- Both are exported: `window.PORTAL_DATA = { …, unfulfilledCount }`.

**`portal.js`** *(PORTABLE)* — added **`PORTAL.setOrdersBadge(n)`**: paints the count onto the
Orders item in the rail + mobile tab bar; at `0` it removes the badge **and** the attention
blink. Called with no arg it reads `PORTAL_DATA.unfulfilledCount()`. `mountShell()` now defaults
its Orders badge to that shared count (an explicit `opts.ordersBadge` still wins).

---

## 1. "New" button creates a blank draft + opens the editor
**Files:** `products-app.js` *(PORTABLE)*
- Replaced the `#newBtn` toast stub with `createDraft()`: builds a blank one-of-a-kind draft
  (empty fields, `is_published:false`, `draft:null`, `archived_at:null`, fresh `id`, generated
  `sku`, `created_at:now`, `quantity:1`), `unshift`s it into `products`, switches to **Drafts**,
  resets to page 1, sets `openId`, and opens the editor (accordion on desktop, sheet on mobile)
  with the required-field gate live.
- Added **`e.stopPropagation()`** to the New handler so the click never bubbles to the
  click-outside-to-close listener (which would otherwise slam the just-opened editor shut).
- *Integration note:* out/ only mutates `products` + re-renders; the real app also POSTs the
  new draft (see `data-flow.md`).

## 2. Publish gated on "previewed at least once"
**Files:** `products-app.js` *(PORTABLE)*
- Per-product **`_previewed`** flag. `publishBtn()` now returns the **disabled** Publish button
  when the product is ready **but** not yet previewed (applies to first publish and to pushing
  staged edits). `openPreview()` sets `p._previewed = true` and refreshes the gate so Publish
  enables immediately after a preview.
- New **`actionsNote()`** helper drives the note under the actions row: readiness message first,
  then *"Preview this product before publishing — you can publish right from the preview."*
  Used by both `editorHTML()` and `refreshGate()`, so it stays correct as fields fill in live.

## 3. Publish from the preview (review bar) — spec pointer only
**Files:** `products-app.js` *(comment)*, `README.md`
- **Did not reinvent** a review bar. Added a pointer comment at `openPreview()` naming the
  live-site canonical bar (`assets/js/product.js` → `mountPreviewBanner`: SEO title/description
  + checkout name/line with Copy, Thumbnail 4:5 / OG 1.91:1 / Checkout 1:1 crops, gold Publish,
  "Hide draft details" toggle; publishes via `POST /api/products/publish`). Gate #2 is the path
  that leads into it.

## 4. Relist hidden on never-published drafts
**Files:** `products-app.js` *(PORTABLE)*
- Relist now shows only when the piece was previously published:
  `p.is_published && (p.quantity === 0 || !p.available)` — so a brand-new draft no longer wrongly
  offers "Relist this piece."

## 5. Sold wording + Sold-tab blink removed
**Files:** `products-app.js`, `products.html` *(both PORTABLE)* — Everlastings' one-of-a-kind
policy **C** (dedicated Sold tab), per `PRODUCT_LIFECYCLE.md`.
- Kept the **Sold** tab; changed the state word from *"Sold — out of stock"* to **"Sold"**
  (a completed sale, not a pending restock).
- Removed the `data-alert` blink from the Sold tab (dropped the `unseenOrders` constant and the
  tab's alert branch) and deleted its now-dead CSS. Order signals live only on the Orders nav.

## 6. Orders badge is a live, shared count
**Files:** `portal.js`, `data.js` (foundations above) + `orders-app.js`, `sales-app.js`,
`account-app.js`, `products.html`, `products-app.js`
- Removed the hardcoded `2`: `sales-app.js` / `account-app.js` now call `mountShell(...)` with no
  badge (uses the shared count); `products.html`'s static rail/tab bar had its `data-alert` +
  `<span class="badge">2</span>` stripped and is painted at init by `PORTAL.setOrdersBadge()`.
- `orders-app.js` calls `PORTAL.setOrdersBadge(counts().needs)` inside `render()` — it owns a
  live copy of `orders`, so it paints *its* count; the badge drops after a ship/refund and the
  badge + blink both clear at zero. Other surfaces (products/sales/account) don't mutate orders,
  so they read the shared `PORTAL_DATA.unfulfilledCount()` on load. (When integrated against one
  real backend, every surface reads the same source and this copy nuance disappears.)

## 7. List ergonomics — default order, column sorting, pagination + mobile sort
**Files:** `products-app.js`, `products.html` *(both PORTABLE)*; default order uses `data.js`
`created_at`.
- **Default order:** explicit **newest-first** (`created_at` DESC) — the natural/"reset" state.
- **Column sorting (desktop):** the header columns (Product / Price / Qty / Avail / Feat) are now
  buttons that cycle **asc → desc → natural**, with a ▲/▼ indicator on the active column.
- **Mobile sort (desktop has no headers):** a compact **Sort** dropdown in the tools row (shown
  only < 860px) — Newest / Oldest / Name A–Z·Z–A / Price ↑·↓ / Qty most·fewest. It shares the
  **same sort state** as the desktop headers, so the two never disagree.
- **Pagination:** 25/page with a 25/50/100 per-page dropdown + Prev/Next. Correctly **dormant
  until the catalog exceeds one page (>25)** — with the current ~11 rows it stays hidden by design
  (to see it: add products, or lower `pageSize`). Client-side for now; move sort/filter/paginate
  server-side (`ORDER BY` / `LIMIT`/`OFFSET`) at scale.

## 8. Minor polish
**Files:** `products-app.js`, `products.html`, `portal.css`
- **"Price · live" header → "Price"** (`products.html`): price saves instantly, so "· live" was noise.
- **Staged-edit ring** (`portal.css`, PORTABLE): the orange `data-ring="yellow"` ring now has a
  firmer border + soft outer glow **at rest** (not only on focus), so an edited field reads clearly.
- **Empty-state copy** (`products-app.js`): dropped the redundant *"Products show up here once they
  reach this state."* line — the tab label already says it. (Search / no-products states keep their
  useful copy.)
- **Dimension / weight units** — verified already correct: W / D / H and `lbs` suffixes reveal as the
  value is typed (`.dimunit` on `:not(:placeholder-shown)`), and weight is stored as e.g. `"3 lbs"`
  in `bindField`. No change needed; noted here so the item isn't lost.

---

## Architecture note (for the integration team) — "Sold" rests on a one-of-a-kind assumption

Not a bug; a design invariant worth naming before the catalog grows a second product type.
We kept the dedicated **Sold** tab (per `PRODUCT_LIFECYCLE.md` policy C, correct for
one-of-a-kind pieces today), but the tab is only *coherent* under that assumption.

**The invariant:** the Products page is a **one-row-per-product ledger — one row, one
lifecycle bucket** (Live / Draft / Sold / Archived). A row can only ever be in one bucket.

**Why "Sold" works today and breaks later:** `PRODUCT_LIFECYCLE.md` separates two axes —
**publish state** (on the shop or not) and **inventory** (the `quantity` number). At
**quantity 1 they collapse into one event**: sold = qty 0 = off the shop = permanent, so
"Sold" reads cleanly as a *state*. The moment a product type allows **quantity > 1** they
**decouple** — a listing can be *published, Live, and have sold 12 of 20 at once*. "Sold" is
then a *fact about units*, not a bucket, and the row would need to be in **both** the Live
and Sold tabs — which a one-row-per-product register cannot represent. (The client notes a
drafty second/third type — "maybe storybook" etc. — that would carry real multiples; that's
the trigger.)

**Cleaner target model** (already consistent with the doc's policy A + per-type
`restockable` flag): **make "Sold" a flag, not a tab.** Inventory stays a number; a per-type
policy decides the reaction to 0. For Everlastings' one-of-a-kind pieces a sale is terminal,
so the record is really **Archived with an `archive_reason` of `sold`** (vs `retired` for a
piece deliberately pulled). The storefront's "Sold Havens" grid filters on that flag;
dropping the flag in Archive removes a piece from the sold shelf **without** moving it
between admin tabs. One Archive surface + a sub-filter replaces the dedicated tab.

**Why we did NOT change it here:** it's correct for a 100%-one-of-a-kind catalog now; the
connected assistant almost certainly already speaks "show sold" / "archive this"; and the
switch is cheap later — the doc notes it's "which tab `sold` falls under — a one-line
`inTab()` change." Most importantly it's a **data-model + shop-grid decision the integration
team owns** (needs a real `archive_reason`/`sold` flag, not a front-end tweak), so this is a
flag-the-invariant note, not a pre-build for a product type that doesn't exist yet.
**New product *types* are explicitly out of scope for this contract** (they need new schema +
value/detail types) — so when that work happens, this Sold-tagging change rides along with it.
See `OPEN_QUESTIONS.md` §2.

**One line:** unlike a normal store — where Orders + Stripe are the sales record and the
catalog holds restockable SKUs — this Products page *is* a one-of-a-kind ledger, so "Sold"
only holds as a tab while every SKU sells exactly once. **Make "Sold" a flag before the
first multi-quantity product ships.**

---

### How to re-run the review
Open `products.html`, then: New → confirm a blank draft opens in Drafts and can't publish until
required fields are in **and** it's been previewed; toggle a piece to Draft/relist; sort by each
header (and via the mobile Sort control); watch the Orders badge track a ship on `orders.html`.
