# Product lifecycle, inventory & the "Sold" question — for Everlastings

A decision doc for the Everlastings admin (the `design-handoff/out/` package). It came
out of building the portfolio demo, where the "Sold" tab started feeling ambiguous. The
goal here is to make the model airtight so you (or the integration agent) can decide what
Everlastings should do — the demo and Everlastings legitimately want *different* answers.

---

## The core idea: three orthogonal things, not one

Most of the confusion comes from one word ("Live", "Sold") trying to mean several things.
Pull them apart and it's simple:

1. **The product record** — never deleted. Like a **Stripe product**, it persists forever;
   you *deactivate* it, you don't destroy it, and a price change is a **new Price object**,
   not an edit to the old one. So every "state" below is just a flag on a record that
   always exists. (Our Draft / Archive are `active=false`-style flags — reversible, lossless.)

2. **Publish state** — *is this listing on the storefront at all?*
   - **Live / published** — on the site.
   - **Draft** — hidden (never published yet, or unpublished).
   - **Archived** — deliberately retired (maps to Stripe `product.active=false`).

3. **Inventory** — *can someone buy it right now?* Just the `quantity` number.
   `quantity = 0` → **sold out**. This is **not** a lifecycle state on its own; it's a fact
   that the UI reacts to.

**Storefront visibility rule:** a product appears on the site when it is **published AND
in stock**. Sold-out behavior (below) decides what "sold out" *does* to that.

---

## The one real decision: what happens when quantity hits 0?

There are three sensible policies. None is "more correct" — they fit different businesses.

### A. Stay **Live**, shown as "Sold out" (buy disabled)  — *restockable goods*
The listing stays on the site and in the **Live** tab, flagged "Sold out," with the buy
button disabled. Restock (qty > 0) and it's buyable again. Keeps the URL, SEO, and a
"notify me when back" hook. **This is the Shopify/Etsy default** and what the **portfolio
demo uses** (apparel/merch with real quantities — a "Sold out" wall would just be clutter).

### B. Auto-unpublish → **Drafts** (hidden until restock)
Selling out pulls it off the storefront and parks it in Drafts (flagged "Sold out", a blue
pill, distinct from unfinished drafts). You restock + relist. Good if you never want a
sold-out item visible to customers. (Reuses the existing "Available off → Draft" rule.)

### C. Dedicated **Sold** category, kept until you **Archive**  — *one-of-a-kind*
Sold pieces move into a **Sold** tab and *stay there as a record* until you choose to
Archive them. This is the right model for **Everlastings**, because every diorama is
one-of-a-kind: a sold piece is genuinely, permanently *sold* (not "out of stock pending
restock"), and a browsable Sold shelf doubles as a portfolio of past work. **This is what
the current handoff already implements.**

---

## Recommendation for Everlastings: keep C, with two clean-ups

Your one-of-a-kind model means **C is correct** — keep the **Sold** category. Two
refinements worth making so it reads cleanly:

1. **Wording.** "Sold" is right for you (the piece sold and is gone) — keep it, *not*
   "Sold out / out of stock" (that implies a restock that will never come). Just make sure
   the empty state and tooltips say "Sold," meaning a completed, archived-eligible sale.

2. **Don't hang Orders signals on the Sold tab.** The handoff put an "unseen orders" blink
   on the Sold tab as a cross-surface nudge. That conflates **inventory** (Sold) with
   **sales activity** (Orders) and is the main thing that felt "overlapping." Orders already
   has its own home + badge in the rail — let that carry the order signal, and let **Sold**
   mean only "pieces that have sold." (The demo removed this; recommend the same here.)

Everything else about your lifecycle holds: `archived_at` → Archived; `!is_published` →
Draft; `is_published && draft` → staged Edits; sold (qty 0, a real sale) → **Sold**;
otherwise → Live. The dots/words already encode this.

## If Everlastings ever sells multiples (prints, future merch)
Switch *those* product types to policy **A** (stay Live as "Sold out", restockable) while
keeping one-of-a-kind dioramas on **C**. The cleanest implementation is a per-type (or
per-product) flag — `restockable: true|false` — that picks the sell-out behavior, rather
than a global rule. Inventory stays a number; only the *reaction* to 0 differs.

## Implementation notes (for the integration pass)
- Keep `computeState()` as the single source of truth for the dot/word; it already returns
  `sold` for `quantity === 0`. The only thing that changes between policies A/B/C is **which
  tab `sold` falls under** (Live / Drafts / its own Sold tab) — a one-line `inTab()` change.
- Nothing here deletes data; "remove from shop" = unpublish or archive, mirroring Stripe.
  A price change should create a new Price and deactivate the old, never mutate in place.
- The storefront should gate the buy button on **published && quantity > 0**, independent
  of the admin tab, so a "Sold/Sold out" item is never accidentally purchasable.

## Parked (out of scope, noted so it isn't lost)
- **"Request more stock" / back-in-stock notify** on sold-out items. Only meaningful under
  policy **A** (item stays Live as "Sold out"), and irrelevant to one-of-a-kind pieces.
  A nice future enhancement; not part of this redesign.

## List ergonomics — default order, sorting & pagination (note)

Surfaced while building the demo; worth a decision for Everlastings' real catalog.

- **What sets the default ("natural") order?** The list currently renders in the order the
  API returns rows. Pick an explicit default — almost always **newest first**
  (`created_at DESC`) or a manual `sort_order` column you can drag to arrange — and sort the
  query by it, rather than leaving it to chance.
- **Column-header sorting (now in the demo):** clicking a header cycles
  **ascending → descending → back to natural order** (spreadsheet-style). Sortable by
  Product (A–Z), Price, Qty (handy for "what's sold out / low stock?"), Available, and
  Featured. Cheap to do — it's a client-side sort over loaded rows. At scale it should
  become a server-side `ORDER BY` so it sorts the whole catalog, not just the visible page.
- **Pagination:** the list renders *every* product (fine at ~10–30). Past ~50, paginate:
  standard pattern is **25/page** default with a **per-page dropdown (25/50/100)** and page
  controls, with sort/filter applied server-side. Until then a big catalog is just a long
  scroll. Not in scope for the redesign — flagged for when the catalog grows.

## TL;DR
- **Demo (here):** restockable → sold-out **stays Live**, shown "Sold out." Done.
- **Everlastings:** one-of-a-kind → keep the **Sold** category (policy C); just fix the
  wording and stop hanging the Orders alert on it.
