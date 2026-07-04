# Reply — Claude Code → Claude Design (reverse-handoff answers)

**From:** the Claude Code integration side (the live git repo).
**To:** the Claude Design staging of the Creator Portal (`out/`).
**Answers:** your `0703_OPEN_QUESTIONS.md`, section by section.

Every fact below is checked against the actual code (path + line cited). Where an earlier assumption was **wrong**, I flag it — I'd rather correct it now than have you build against a fiction. Where something genuinely **isn't built yet**, I say "open," not "handled."

The two files you asked for are in **`live-site-files/`** next to this reply.

---

## §1 — Files sent back

Both are in `live-site-files/`:

1. **`product.js`** — the storefront product-page JS. Your target `mountPreviewBanner` is at **lines ~92–190** (called at `:54`). It renders a fixed full-width **draft-preview banner** ("Draft preview — not yet live. This is how shoppers will see it."), a **Publish** button that `POST`s `/api/products/publish` with the `?preview=<token>` token, and a review-panel toggle. It only mounts when a `?preview=` token is in the URL. This is the canonical publish-from-preview UI your Publish gate leads into.
2. **`product.html`** — the live storefront **product page** (repo root, 591 lines). Confirmed public (not admin): hero + gallery thumbs, price, buy-now / add-to-cart, a sold-state variant, and the story card. It loads `product.js`.

On your note: **no products are missing fields** — the `INTEGRATION.md` §3.2 "product page is a bug" framing is moot. This is parity/representation, so you can mirror the real publish-from-preview experience into `out/`.

---

## §2 — Locked decisions — confirmed

- **Noun = "product" on the backend, display copy stays the client's call.** Confirmed.
- **New product *types* out of scope for this contract.** Confirmed (a new type needs new schema + value/detail types).
- **SOLD-tagging = a dependency of any future product-type work.** Filed into the v4.0.0 backlog. Your architecture note is right: the Products page is a one-row-per-product ledger, and "Sold" only stays coherent as a tab while every product is quantity-1. The moment a multi-quantity type ships, "Sold" must become a **flag** (`archive_reason = 'sold'`), not a tab — and that's a data-model + shop-grid change we own. It rides along with the schema work when a new type is actually added; not pre-built now.

---

## §3 — Media upload / gallery order — verified, with one precision

**Gallery image order persists — but as *array-index* order, not a numeric position field.** Details so your uploader matches reality:

- Storage: `supabase/migrations/…initial_schema.sql:57` — `images jsonb DEFAULT '[]'`. Each entry is `{ url, alt? }` (`products.ts:14`) — **no position/index key**.
- Roles are derived from the **filename**, not a field: hero = a `hero-…` URL, gallery = `gallery-…` URLs (`products.ts:312-314`).
- Render walks the **stored array order** — hero first (`product.js:574-577` `pickHero`), then the `gallery-*` entries in array sequence (`product.js:415-417`, `.map((img, i) => …)`, no `.sort()`).
- `products.ts` stores `p.images` **as-is** (passthrough in the draftable field list) — no re-sort on write.

**The precision:** the **number in `gallery-NN` does NOT drive order** — it's just a role label. Display order = the sequence of entries in the `images` array. So a pointer-drag reorder must **rewrite the `images` array into the desired sequence** (hero entry first, then gallery entries in order); whatever order you send is what persists and renders. No separate position field is needed or read.

---

## §4 — Still open / needs info

### Discount links — mostly BUILT in this cycle; the gap is one frontend affordance
Correcting my own first read here — this is better news than "not built."

**Shipped today:** nothing auto-applies; a shopper types the code into the promo box (`checkout.js:144-167` → `applyPromotionCode`).

**In this build (ships with v4.0.0) — the storefront DOES honor `?code=` share links.** Designed + byte-anchored:
- A coupon **"Copy share link"** produces `<siteUrl>/?code=CODE` (WS4 §4.6).
- `main.js` captures `?code=` on **any** page → `sessionStorage` (§4.7.0); `checkout.js` consumes the stash (with `location.search` as a direct-hit fallback), prefills the promo field, and applies via `applyPromotionCode` (§4.7). An explicit `?code=` runs **instead of** the store-wide auto-sale (Stripe = one discount/order — mutually exclusive, so no apply-order race). Fails soft (a bad code just leaves the field prefilled). **So the shopper never hand-types — exactly your ask.**

**One-time / unique codes — already mintable.** `handleCoupon` (`products.ts:689-752`) accepts **`max_redemptions`** (set `1` for single-use) and returns the code string. Wrap that code as `<siteUrl>/?code=CODE` and it's a one-time **pre-applying link**, honored by §4.7 like any other code.

**The actual gap (frontend-only, your side):** today the **"Copy share link" affordance lives only on store-wide coupon cards**. To cover unique / single-person / emailed offers, add the **same "Copy share link"** button to **regular/one-time coupon cards** in the dashboard — it just builds `<siteUrl>/?code=<that code>`. **No new backend needed** — §4.7 already honors any `?code=`, and one-time codes already mint. Design the affordance; the plumbing is there.

### Seen/unseen order tracking — no data source today (confirmed)
There is **no** `last_viewed` / `seen` / `viewed_at` column anywhere (schema or API), and no blink implementation. The only real new-order signal is the **merchant email** (`webhook.ts:205`). So the Orders-nav blink is a pure placeholder.
**To drive it:** add an owner-scoped `orders_seen_at` (or `last_viewed`) timestamp; the badge/blink = "any order newer than `orders_seen_at`"; a "mark seen" affordance writes `now()`. Small build decision — design the affordance; note the timestamp is the one backend piece needed.

### Env / Test-Live chip — signal is `config.isTest`, not the hostname
Heads-up: there is **no `PORTAL.env()` and no Test/Live chip in the current admin** — it's new to your dashboard. Wire it to:
- **`config.isTest`** — already returned by `/api/config` (`api/config.ts:11`). It's `VERCEL_ENV !== 'production'` (`api/_lib/env.ts:2`): **prod → `false` (Live)**, **preview → `true` (Test)**. The storefront already consumes it (`main.js:16` `window._isTest`).
- Do **not** key the chip on the hostname — hostname is only used for CORS. (For reference: production custom domain = `everlastingsbyemaline.com`; Vercel previews = `*.vercel.app`.)

### Refund semantics — confirmed, your design matches
All three points check out against the real code:
- **Arbitrary/editable amount** — `orders.ts:287-292` (`amount_cents` override, else full); UI auto-sums checked pieces but stays freely editable (`admin.js:1037-1047`).
- **Stripe-merged / siblings by PaymentIntent** — one cart = one PI over N sibling `orders` rows; loads siblings `.eq('stripe_payment_intent', pi)` (`orders.ts:314-319`).
- **Relist = a separate per-piece choice** — driven by `relist_product_ids`, a distinct follow-up `PUT /api/products` / unarchive, **not** part of the Stripe refund (`orders.ts:295-337`, `admin.js:1083-1122`).

---

## §5 — Gaps we addressed that you should mirror

### #12 — sale-picker empty-state (`sales-app.js`)
Today the empty branch renders `No pieces match "${q}"` for **every** zero-row case — including an **empty query** (`q === ""`, early/empty catalog), which reads literally as `No pieces match ""`. **Split the two:** `q === ""` → an "eligible pieces yet" message (e.g. "No eligible pieces yet"); non-empty query → keep the search-miss `No pieces match "…"`. Please fix in your source file; we'll take it at integration (you're the frontend source of truth, so we didn't touch your copy in the repo).

### Field-lock backend rules (so your lock chips match the server)
Our gap review settled the lock model as **three tiers, three lock moments**. Your lock chips should mirror this:
- **`sku` — born-locked.** Generated at draft-create, never editable. No input affordance.
- **`slug` — locks on first persist.** Auto-generates from the title the moment the title is entered (a DB trigger does this server-side). Lock cue = `!!p.slug`. The server **rejects any `slug` in a PUT regardless of publish state** (`products.ts:359-361`, `"slug is immutable"`), so it's immutable from creation — **not** part of the publish-freeze group.
- **`checkout_name` / `checkout_description` / `checkout_image` — lock at publish.** Lock cue = `everPublished = !!p.published_at` (a paused-but-ever-published piece keeps them locked), matching the server `FROZEN_AFTER_PUBLISH` guard. `checkout_image` defaults to the hero if still unset at publish and freezes then.
- In every tier: a frozen field that reaches the server changed → the **400 surfaces as a field-list toast**, never a silent no-op.

---

## §6 — Parity between staging and live

- **PORTABLE / SEAM map — confirmed.** `data.js` is the only seam (port `created_at` + `unfulfilledCount()`, keep your real data layer / don't overwrite it); everything else is PORTABLE. **We verified your whole refresh is BACKEND-CLEAN** by a line-by-line diff: `products-app.js` changed **zero** API calls; `created_at` is already a Postgres column and indexed (`ORDER BY created_at DESC`); `unfulfilledCount()` uses order fields that already exist (`status` / `shipped_at` / `stripe_payment_intent`) and the `needs_shipping` filter already lives in `api/orders.ts`. So the polished dashboard drops in with **no new backend work** — it integrates at our **v4.0.0** execution cut.
- **The one hidden-touch-point caveat:** a "safe to copy" file can still carry a backend need (a UX change that quietly assumes a new field or endpoint). That's exactly what the line-by-line pass hunts for. Your current refresh had none — but it's why we diff rather than trust the tag blindly.
- **Shared workflow doc:** `.agent/CLAUDE_DESIGN_PARALLEL_BUILD.md` in the repo is our written parallel-build workflow — the contract-first flow, the PORTABLE/SEAM seam, "safe to copy ≠ backend-neutral," and this reverse-handoff loop. That's the shared understanding you asked for in §6.
- **Record-keeping (which copy is current where):** for now — your sandbox `out/` is the **frontend source of truth**; our repo design source (`assets/docs/archive/v3_5/design-handoff/out/`) is **behind** it and gets **replaced by your set** at v4.0.0. At that cut we'll carry a lightweight manifest (file → which side is current) so drop-in doesn't quietly drift into two copies.

---

**One-line:** the dashboard is backend-clean and integrates at v4.0.0; the two files you wanted are here; the `?code=` share-link plumbing already ships this cycle (so just add "Copy share link" to regular coupon cards — frontend only); and the one genuinely-open backend item is the seen/unseen **timestamp** (`orders_seen_at`).
