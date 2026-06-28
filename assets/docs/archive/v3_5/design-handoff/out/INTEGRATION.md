# Content Creator Portal — Integration Guide (read me first)

**Audience:** the Claude Code gap-review + integration agent.
**Status:** front-door doc for the v3.5 portal redesign. Design-only; no app code here.

This package is **finished front-end design** built to the contract in
`../data-flow.md`. It is intentionally **not wired** to any backend. Your job is the
careful, reviewed integration. This doc tells you what each file is, what's mocked,
and — most importantly — the **gaps and decisions** the design assumes that need
real implementation or reconciliation.

---

## 1. What's in `out/`

| file | what it is |
|---|---|
| `portal.css` | The shared design system — tokens lifted verbatim from `controls.html` + every shared component (shell, rail, tabbar, buttons, toggles, fields, rings, LEDs, pills, toasts, skeletons). Re-hue from the `:root` tokens; **no literal hex** in component CSS. |
| `portal.js` | Shared, framework-free helpers: `PORTAL.env()` (hostname→Test/Live), `PORTAL.toast()`, auto-grow textareas, char counters, tap tooltips. Attach once per page after `data.js`. |
| `data.js` | **MOCK** dataset, shaped to `data-flow.md` line-for-line. Provenance is documented at the top of the file (real DB rows vs. a few illustrative rows flagged `_illustrative:true`). Swap these arrays for real API responses — markup keys off the same field names. |
| `products.html` + `products-app.js` | The Products surface (the spreadsheet + the row→editor). |
| `orders.html`, `sales.html`, `account.html` | The other three surfaces (built on the same shell). |

Everything is **vanilla HTML/CSS/JS** and opens directly in a browser. Money is
**integer cents** everywhere; render with `PORTAL_DATA.money()`. Product state is
**computed**, never stored — see §3.

---

## 2. The boundary (unchanged from the brief)

- Design to the **contract** (`../data-flow.md`); do not assume these files call it.
- All actions in the prototype mutate an **in-memory model** and show the honest
  confirm/optimistic state a real call would. Replace those mutations with the
  documented endpoints; **do not** change markup or class names to do it.

---

## 3. ⚠ Gaps & decisions to implement / reconcile

These came out of the v1 design review (`../feedback/FEEDBACK_v1.md` + the annotated
shots in `../feedback/v1-images/`). Each is a real integration task.

### 3.1 TEST / Live environment chip — derive from hostname
The chip (desktop top-right; full-width strip on mobile) is **not hardcoded**. It reads
`window.location.hostname` in `portal.js` → `PORTAL.env()`:
- `*.vercel.app`, `localhost`, `file://` → **Test** (amber)
- `everlastingsbyemaline.com` → **Live** (green)

Confirm this matches your deploy topology. If preview/prod hostnames differ, that's the
one line to adjust (`PORTAL.env`).

### 3.2 BUG — editor fields missing on the live product page
The editor exposes the full field set (dimensions, weight, materials, features, care,
shipping, artist note, etc.). Sean confirmed **several of these render in the editor but
are not shown on the live storefront product page** — a real gap/bug to fix during
integration. See:
- prototype editor: `../feedback/v1-images/ccpv1-6-1.jpg`
- **live dev product page (missing fields): `../feedback/v1-images/ccpv1-6-2.jpg`**
- live dev `/admin` panel: `../feedback/v1-images/ccpv1-6-3.jpg`

### 3.3 Dimensions → three inputs (W / D / H)
The editor takes **Width, Depth, Height as separate fields** and assembles the
`dimensions` string (`'9" W x 6" D x 10" H'`). Integration needs to:
- accept the three values and assemble/parse consistently, and
- **validate + auto-format** input (don't reject a good value — coerce it, and show the
  expected format in the field-label tooltip). Same idea requested for `weight`.
GPT-authored products already send consistent values; the by-hand path is where the
3-field + autoformat helps.

### 3.4 List fields are line-arrays
`materials`, `features`, `care_instructions`, `shipping_details` are edited as
**one-item-per-line** textareas with a live bullet preview, and map to `string[]`. Same
validate-don't-reject + auto-format guidance as §3.3 (the UI auto-bullets the preview).

### 3.5 Auto-save while editing
The editor assumes **auto-save**: closing the editor (clicking the sticky row, clicking
outside on desktop, or the ✕ on mobile) saves with **no confirm dialog** — a draft if
new, staged edits if published. The explicit **Save** button saves *and* returns to the
list. Wire these to `PUT /api/products` (and the draft/publish actions). The prototype
calls a no-op `autosave()` you can replace.

### 3.6 ⚠ "Available OFF → Draft" diverges from the computed-state table
**Decision (Sean, final word):** when the user turns the **Available** toggle OFF on a
**live** product, it should become a **Draft** (unpublish / hide). "Sold" is reserved for
when **quantity hits 0 from a sale** (automatic). Sold/archived products also have
Available off, but that's a *consequence*, not the user action.

This **diverges from `data-flow.md`'s computed-state table**, which reads
`is_published && !available → sold`. Reconcile during integration — most likely:
turning Available off on a published, in-stock piece should set `is_published=false`
(draft), while `quantity==0` independently yields the "sold" tab state. The prototype's
`computeState()` in `products-app.js` already encodes the desired behavior; make the
server semantics match.

### 3.7 Required-field set (publish gate)
The publish gate (and red field-rings) uses this **required set** (Sean's authoritative
list), which is broader than the create-contract minimum:
`title, slug, headline, description, price, quantity, product_type, story_card,
features, materials, care_instructions, shipping_details, dimensions (W·D·H), weight,
hero image, ≥5 gallery images, alt text on every media`.
Plus **required-but-auto-generated-if-blank** (never block publish): `seo_title,
seo_description, checkout_name, checkout_description, checkout_image, seo_thumbnail
(share)` — generate from other fields server-side if empty. **Optional:** `series`,
`artist_note`. **Note:** only `product_type = miniature` is in scope; a new type needs
additional development.

### 3.8 Publish requires a Preview for new products
Publish stays disabled for a **new, never-published** product until it's been previewed
at least once (the preview page carries the real Publish action via `preview_token`).
The prototype gates on missing fields; add the "must preview first" gate in integration.

### 3.9 Order "seen / unseen" tracking (drives the blink)
Two cross-surface blink signals have **no data source yet**:
- the **Orders** nav item blinks when an unshipped/unseen order is waiting, and
- the **Sold** product tab blinks the same faint orange when it holds orders not yet seen.
There's no push channel (poll/refresh per `data-flow.md`). Integration needs a notion of
**seen vs. unseen** (e.g. a last-viewed timestamp) to clear the blink. Design the data
for it.

### 3.10 ⚠ Media upload — examine carefully (intricate)
The media UX was substantially redesigned (modal: batch upload / drag-drop / URL /
YouTube embed; per-image **role checkboxes** with logic — one hero, hero≠gallery,
share/checkout/poster combine freely; per-video **Loop / Mute / Hide controls /
Autoplay**; required **alt text** on every item; reorder + delete; coverage counter;
"hero is reused if share/checkout missing"). Full spec: `../feedback/FEEDBACK_v1.md` §8.

Sean's flag: the **current upload setup is functional-but-lazy** and likely needs work to
support this UX. The `POST /api/upload` contract (`role` enum, multipart **or** by-link
JSON, skip-Cloudinary-edit, GPT sending role-tagged JSON) should be **examined carefully**
to confirm it can drive the new flow or what must change. This is the single most
intricate integration item — treat it as its own review pass. Roles enum and limits are
in `data-flow.md` (Media upload).

### 3.11 Refund (Orders) — arbitrary amount, Stripe-merged, relist is separate
From Sean's notes: the refund **amount per piece pre-fills** with that line's amount but
is **fully editable** before processing (partial / goodwill — e.g. $30 on one piece,
full price on another; **Stripe merges** them into one refund total and only the *logs*
show two transactions). **Relisting is a separate decision**: on refund you get a
**checklist of pieces to relist + a quantity per piece**, and relisting can also happen
**later, independent of any refund** (and independently from the product editor's
"Relist" action). Empty `relist_product_ids` ⇒ status does **not** flip to `refunded`.

---

## 4. Design system notes for integration
- **No hard delete anywhere** — "delete" is **archive** on every surface, and everything
  is revivable (archive↔resurface, sold↔relist, draft↔publish).
- **State color is reserved for state only.** LEDs: green = live, **orange `#D95301`** =
  staged edits (needs publish), **yellow** = draft, **blue `#297fb4`** = sold,
  **purple-gray `#83718a`** = archived. Orange + yellow blink (staged is more urgent).
- **Context is on-demand:** helper text lives in label tooltips (hover desktop / tap
  mobile); "applies live" / "locks after publish" reveal on field focus — they are not
  persistent clutter.
- **Mobile is primary.** Bottom tab nav mirrors the desktop rail; 16px-min inputs; dense
  NYT-scale type; slim margins.

---


### 3.12 Sales — coupon sharing, optional fields, env-aware View Site
- **Coupon share link:** each coupon card has a **Copy share link** action; the prototype copies `<siteUrl>/?code=<CODE>`. Wire this to whatever the storefront reads to pre-apply a code at checkout (a `?code=`/`?coupon=` querystring, or a Stripe Checkout Link that pre-fills the promotion code). For a **newsletter / distro embed**, the durable handle is the Stripe **promotion_code_id** on the Coupon object — surface a "copy Stripe handle" affordance if wanted. Note for the storefront: it must accept and apply the code from the link.
- **Optional fields:** end date, minimum order, and usage cap are all optional on create. The store-wide automatic sale needs no code and goes live immediately.
- **Confirm on end:** ending any sale (coupon or store-wide) now shows a confirm dialog first.
- **Env-aware View Site:** the **View Site** link (rail + Account) targets the CURRENT environment's storefront — `location.origin` on Test/preview, `everlastingsbyemaline.com` on Live (see `PORTAL.siteUrl()` in portal.js). Set the real dev/preview storefront URL here if it differs from the admin origin.


### 3.13 Product media system (rebuilt)
- **Editor display:** hero is larger; gallery is a draggable strip with live 1..N numbers underneath; only FILLED secondary media (share/checkout/videos) render as uniform squares — empty roles never render as upload buttons. Videos show a real preview (`<video preload=metadata>` or YouTube glyph). One **Add / edit media** button; a quiet note says share/checkout reuse the hero unless given their own image.
- **Gallery order = p.images order** (hero first, then gallery left→right = numbers 1..N). Pointer-drag reorder in the strip rewrites `p.images` and the numbers; the modal reflects that order on reopen. Wire this to the real persistence (PATCH image order).
- **Modal labels/numbering:** type word is only Image / Video / YouTube. A single-slot role relabels the item ("Hero image", "Share image", "Checkout image", "Video poster") and drops its number. Gallery items read "Gallery image N". Unrouted images and 2+ videos/youtubes get a disambiguating number (bottom = 1, newest on top = highest). Role pills fill solid accent when applied (scannable).
- **New uploads** insert at the TOP of the list and pulse pale-yellow twice (`.mitem.is-new`).
- **Apply** now stays on the open product (desktop no longer kicks you to the list — was the outside-click handler catching the in-modal click; now guarded) and blurs the active field to avoid iOS focus-zoom lingering; modal inputs are 16px on mobile to stop auto-zoom.
- **Schedule publish** is now a real date+time popover writing `scheduled_publish_at` (ISO) with a "Scheduled · <when>" chip + clear. Back end needs a cron/edge job to flip the product live at that time — NOT yet wired.

## Activity log (v3.5 — newly scoped, wire or hide)

The Account page renders an **Activity log** card from `window.PORTAL_DATA.activityLog` (see data.js). It is a UI stub awaiting a backend audit trail.

**To wire it:**
- Add a Postgres `activity_log` table: `id`, `at timestamptz default now()`, `actor text` (the signed-in email/user id), `action text` (machine key, e.g. `product.publish`, `sale.create`, `order.refund`, `order.ship`, `product.update`), `summary text` (human one-liner), optional `entity_id` / `meta jsonb`.
- Write one row from every mutating endpoint (publish, save-draft, create/end sale, refund, mark-shipped, archive, etc.) — these are exactly the actions the prototype already performs, so instrument them at the same call sites.
- Feed the most-recent N (≈25) rows, newest first, to the page in the `activityLog` shape: `{ at, actor, action, summary }`. The card's left dot is colored by the `action` prefix (`product`→green, `sale`→blue, `order`→orange) via `.logitem__dot--{prefix}`; add cases as new prefixes appear.
- Timestamps render relative ("Today · 3:42 PM", "Yesterday", then "Jun 27 · …") client-side from the ISO `at`.

**To defer it:** leave `activityLog` as `[]` (the card shows an empty-state line) or hide the `.logcard` element. No other surface depends on it.

## Site title

All portal pages use `<title>Creator Portal | Everlastings by Emaline</title>` (generic admin paths are a common bot target; the title intentionally does not advertise "admin").

---

*All four surfaces (Products / Orders / Sales / Account) are built. Questions that aren't
answerable from here or `data-flow.md` should go back to Sean, not be guessed.*


