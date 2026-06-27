# Content Creator Portal — Data-Flow Contract (for Claude Design)

**Design to this contract; do not implement it.** This is the literal shape of the data each surface reads and the actions each surface fires — the seam that lets you design backend-aware states (the empty table, the 403, the optimistic toggle, the "already refunded" 409) **without touching any backend code**. Field names and types match the live API line-for-line. Endpoints are the *contract*, not an instruction to wire them.

**Auth:** every admin call carries a Bearer token (an admin session or an API key). Assume it's always present; you don't design login plumbing beyond the Account sign-in screen. A call without it returns `401 {error:"Unauthorized"}` → design a "session expired, sign in again" permission state.

**Money:** all amounts are **integer cents** in the API. Always render as plain money ("$25.00"), never raw numbers. Prices/qty use the mono lane with tabular figures so columns align.

---

## A. Products

### Entity — `Product`
| field | type | notes |
|---|---|---|
| `id` | uuid | immutable |
| `slug` | string | URL handle; **locks after first publish**; server-normalized |
| `sku` | string | DB-generated (`EVE-xxxxxxxx`), never editable |
| `title` | string | required |
| `headline` | string | |
| `description` | string | required |
| `story_card` | string (long) | required for a miniature |
| `price` | int (cents) | **LIVE-APPLY** (changes the shop the moment it's saved) |
| `quantity` | int ≥ 0 | **LIVE-APPLY** (0 = sold out) |
| `available` | bool | **LIVE-APPLY** (in/out of shop now) |
| `featured` | bool | staged; homepage feature flag |
| `product_type` | enum | `miniature` today (printable/storybook exist in the picker); locks after publish |
| `series` | string | collection/grouping (free text, e.g. "Portals to Peace") |
| `features` / `materials` / `care_instructions` / `shipping_details` | string[] | simple lists (one per line) |
| `dimensions` / `weight` / `power_supply` | string | |
| `artist_note` | string (long) | |
| `images` | `{url, alt?}[]` | role-prefixed URLs (hero-, gallery-NN, detail-NN, thumbnail, seo_thumbnail, checkout_image) |
| `media` | `{type:'video'|'youtube', url, autoplay, controls, poster, alt}[]` | silent-loop MP4s and/or YouTube |
| `thumbnail` / `thumbnail_alt` | string | or auto-derived from hero |
| `seo_title` / `seo_description` / `seo_thumbnail` | string | staged |
| `checkout_name` / `checkout_description` / `checkout_image` | string | **lock after first publish** |
| `homepage_theme` | object | homepage accent config |
| `is_published` | bool | false = draft |
| `published_at` | timestamp / null | |
| `draft` | object / null | **staged edits** (only the fields that differ from live); null = nothing pending |
| `preview_token` | uuid / null | capability token for the preview URL; regenerated on each draft change; cleared on publish |
| `archived_at` | timestamp / null | null = active; set = out of shop (reversible) |

### Field classes (drives the two-speed UI + field rings)
- **LIVE-APPLY (instant on save, no preview):** `price`, `quantity`, `available`.
- **STAGED (waits for publish):** everything else editable — copy, lists, media, SEO, featured, series, etc. On a *published* product these go into `draft`; on an *unpublished* product they just write straight through.
- **LOCK-AFTER-FIRST-PUBLISH (show locked, not missing):** `slug`, `checkout_name`, `checkout_description`, `checkout_image`. (`sku` is always read-only.)

### State (the row LED + grid tabs) — computed, precedence top-down
```
archived_at set                         → archived   (tab only; no LED color)
!is_published                           → draft      (LED red)
is_published & draft != null            → edits      (LED yellow — needs publish)
is_published & !available               → sold       (tab only; no LED color)
is_published & available & draft==null  → live       (LED green)
```
So the **row LED is 3 colors only** (green live / red draft / yellow edits). **Sold + archived are reached via tabs**, not LED color.

### Reads
- **List:** `GET /api/products` → `{products: Product[]}`. One row per product. (Loading → skeleton rows; empty → "no pieces yet"; filtered-empty → "nothing matches this filter".)
- **Get one (admin):** `GET /api/products?id=<uuid>` → `Product` (includes `effective` = live + draft merged, and the `draft` overlay). `404 {error:"Product not found"}`.
- **Preview:** the create/update responses hand back `preview_url` + `preview_token`; the preview page is `/product/<slug>?preview=<token>` (capability URL, no login). **Preview must be reachable any time** there's something to preview.

### Actions (what each fires + emits)
| action | call | request | emits | reversible? |
|---|---|---|---|---|
| Create (draft) | `POST /api/products` | full product body (`title`,`price`,`description`,`images`≥1 hero +≥5 gallery,`thumbnail`,`story_card`, …) | `{success, product, preview_url, preview_token}`; `400 {error:"…all problems listed…"}`; `409 slug_conflict` | n/a (creates unpublished) |
| Edit | `PUT /api/products?id=` | only changed fields | `{success, product, staged?, price_updated?, availability_updated?, quantity_updated?, preview_url?, preview_token?}` or `{success, no_changes:true}`; `400` "Frozen after publish: …" / "slug is immutable" | yes (Discard) |
| Publish | `POST /api/products?_action=publish` | `{id}` (admin) or `{token}` (capability) | `{success, product (draft:null), url, stripe_sync}` or `{success,no_changes:true}`; `400 "Cannot publish — missing: …"`; `409 "archived — resurface first"` | — |
| Discard staged edits | `POST /api/products?_action=discard` | `{id}` | `{success, product(draft:null), discarded:bool}`; `400 "Nothing to discard…"` | — |
| Archive | `POST /api/products?_action=archive` | `{id}` | `{success, product(archived_at set), archived:true}` | yes (unarchive) |
| Resurface | `POST /api/products?_action=unarchive` | `{id}` | `{success, product(archived_at:null), archived:false}` | yes |
| Relist a sold piece | (first-class) → `unarchive` if archived, then `PUT` `{quantity:+1}` | | quantity +1, available derives true | yes |

**Inline row edits** (price, Available, Featured, archive) map to `PUT` / the action calls above. Price/Available/Quantity are **optimistic-safe** (they apply live; show a brief "saved · live now" confirm). Turning Available **on** while `quantity==0` should prompt for stock. Archive is reversible (no scary confirm needed, but make it deliberate).

### Media upload — `POST /api/upload`
- Multipart (`file`,`slug`,`role`) **or** JSON by-link (`{url, slug, role}`). Returns `{url, filename}` (or a batch `{uploads[], failures[]}`).
- **Roles (strict enum):** `hero`, `thumbnail`, `gallery-01..15`, `detail-01..05`, `video-01..05`, `gif-01..05`, `checkout_image`, `seo_thumbnail`.
- Images ≤10MB (auto-transformed to role aspect/size); video ≤50MB, **link-only** for big files. Errors: `400` (bad role / too large / bad type / not-a-public-URL), `401`, `502` (transform/upload failed). Design the dropzone's idle / drag-over / uploading / done-✓ / error states, and "video must be a link" messaging.

---

## B. Orders (the CRM surface)

### Entity — `Order` (one row **per product per checkout**; N pieces in a cart → N rows sharing one `stripe_payment_intent`)
| field | type | notes |
|---|---|---|
| `id` | uuid | show short (first 8) as a friendly ref |
| `stripe_payment_intent` | string | **groups a multi-piece purchase** (refund panel loads siblings by this) |
| `amount` | int (cents) | this line's amount |
| `status` | enum | `completed` \| `shipped` \| `delivered` \| `refunded` |
| `customer_email` | string | |
| `customers` | `{name, email, phone, shipping_address}` | the **person** |
| `shipping_address` | `{line1,line2,city,state,postal_code,country}` | copy-address affordance |
| `products` | `{title, slug, thumbnail}` | the piece |
| `tracking_number` | string / null | |
| `tracking_carrier` | enum / null | `USPS`\|`UPS`\|`FedEx`\|`DHL` |
| `shipped_at` | timestamp / null | drives Needs-Shipping vs Shipped |
| `tracking_email_sent_at` | timestamp / null | drives the sent/unsent pill |
| `created_at` | timestamp | new-order signal source |

### Reads
- **List:** `GET /api/orders?status=needs_shipping|shipped&q=<search>` → `{orders: Order[]}`. `status=needs_shipping` = `shipped_at IS NULL & status='completed'`; `shipped` = shipped. Search matches id / email / tracking. (Design loading / empty / "no matches".)
- **Refund siblings:** `GET /api/orders?payment_intent=<pi>` → all rows on that payment (the refund panel's full cart).

### Actions
| action | call | request | emits | irreversible? |
|---|---|---|---|---|
| Mark shipped (+ email buyer) | `PATCH /api/orders?id=` | `{tracking_number, tracking_carrier, shipped_at?}` | `{ok, order, email_sent, email_skipped?, email_error?}`; `400` missing/invalid; `409 "already refunded"` | sends an email — **confirm-ish**; resend allowed |
| Resend tracking | (re-PATCH / resend) | | re-stamps `tracking_email_sent_at` | — |
| Refund | `POST /api/orders?id=&_action=refund` | `{amount_cents?, relist_product_ids?[]}` | `{ok, status, relist:[{product_id,slug,title,available,quantity,archived}]}`; `409 "already refunded"`/"no payment"; `502 "Stripe refund failed"` | **money out — explicit confirm** |

**Refund design notes (where confusion lives):** the panel shows **every piece on the payment** (load by `stripe_payment_intent`), each with its own amount; the user checks which piece(s) to refund, the amount auto-sums but is **editable** (partial/goodwill), and each piece has its **own relist choice**. Empty `relist_product_ids` = goodwill/partial → status does **not** flip to refunded. Refunding a piece + relisting it are **separate decisions**.

### New-order signal
There's no push channel; the signal is **a new `completed` order appearing in the list** (poll/refresh). Design the **faint flashing-orange behind the Orders tab** to mean "unshipped order(s) waiting." (The "buyer emailed back / payment problem" indicators have **no data source yet** — design may hint at the slot, the build won't populate it.)

---

## C. Sales (coupons / discounts)

### Entity — `Coupon` (owner sales only; system codes are filtered out)
| field | type | notes |
|---|---|---|
| `code` | string | |
| `promotion_code_id` | string | the handle to end it |
| `percent_off` | number / null | |
| `amount_off` | int cents / null | |
| `amount_display` | string / null | e.g. "$10.00" (pre-formatted) |
| `min_amount` / `min_display` | int cents / "$5.00" | optional minimum |
| `times_redeemed` / `max_redemptions` | number / null | usage |
| `expires_at` / `expires_display` | unix / "Jun 30" | optional end |
| `store_wide` | bool | true if not scoped to products |
| `product_ids` | string[] / null | scope (Stripe product ids) |

### Reads
- **List:** `GET /api/products?_action=coupon` → `{coupons: Coupon[], truncated?}`. Render in **plain money** (use the `*_display` fields). (Empty → "no sales running".)

### Actions
| action | call | request | emits |
|---|---|---|---|
| Create sale | `POST /api/products?_action=coupon` | `{type:'percent'|'amount', value, code?, product_ids?[], min_amount?, expires_date?'YYYY-MM-DD', max_redemptions?}` | `{success, code, coupon_id, promotion_code_id, expires_display?}`; `400` bad type/value; `409` code exists | 
| End sale | `POST /api/products?_action=coupon_deactivate` | `{promotion_code_id}` or `{code}` | `{success, code, active:false}`; `403` system-managed; `404` not found |

- **Store-wide:** omit `product_ids`. The **new no-code automatic store-wide sale** (v3.5) is the holiday case — design a clear **set / running / end** control for it (a toggle + plain-money summary). It goes live immediately (no draft step). Percent and dollar both supported; percent shows as struck pricing on the storefront.

---

## D. Account / nav

- **Sign in:** email + password → admin session (Bearer thereafter). **Sign out** clears it.
- **View Site:** a plain link to the live storefront (`/`).
- **Config (public):** `GET /api/config` → `{publishableKey, supabaseUrl, supabasePublishableKey, metaPixelId?, isTest}`. `isTest:true` means a test/preview environment — a subtle "TEST" marker somewhere in the chrome is welcome so a maker never confuses test data for live.

---

## Cross-cutting states to design (every surface)
- **Loading:** skeleton rows/cards (controls.html has a skeleton treatment).
- **Empty vs filtered-empty:** distinct copy ("nothing here yet" vs "nothing matches this filter/search").
- **Error:** inline, plain-language, with the action still visible (e.g. a 502 on refund → "Stripe refund failed — check the amount, then your Stripe dashboard").
- **Permission/expired:** a 401 anywhere → a gentle "session expired — sign in again," not a dead screen.
- **Optimistic vs confirm:** reversible/instant things (Available, price, Featured, archive) update optimistically with a quiet confirm; **money + emails** (refund, mark-shipped) get an explicit confirm and a clear result.
