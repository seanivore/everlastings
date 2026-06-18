# The Sunkeeper — Custom GPT brain + AI pipeline protocol

**What this is.** The complete, canonical reference for the store's AI pipeline. Two readers:
1. **The Custom GPT "The Sunkeeper"** — its knowledge, system prompt, and Actions. Parts 1–3 are everything it must know and the exact config to paste when setting it up.
2. **Claude Code / Sean** — the shell/curl protocol for programmatic product work. Part 4.

This supersedes the archived setup record `archive/v1_4/v1_4_5_C_GPT_SETUP.md` and the retired `PRODUCT_PROTOCOL.md` (its content lives here + in `STORE_ADMINISTRATION.md`). Emy's *simple how-to* lives in `STORE_ADMINISTRATION.md`; this doc is the GPT's brain + the technical protocol.

**Status note (2026-06):** the GPT is set up **from scratch** with this doc (any earlier "Sunkeeper" attempt is discarded), in **two waves** (Part 3): **Wave 1 (products)** anytime now, **Wave 2 (orders)** after the `/api/orders` Bearer path is live on the target environment. That path **shipped in v1.4.9** (verified on the dev preview), so Wave 2 is unblocked — it just needs verifying against whichever environment the GPT points at (production, at launch). Product creation (`/api/upload`, `/api/products`) works independently and is verifiable today.

**Which environment the GPT talks to (read this first).** The GPT only ever sees the environment its Action `servers:` URL + key point at — `isTest = VERCEL_ENV !== 'production'` (`api/_lib/env.ts`) scopes *every* product/order read and write, so test data lives only on a preview and live data only on production.
- **To test the GPT on throwaway data:** point the Action at the **dev preview** + the **preview** `PRODUCT_API_KEY`, with Vercel SSO **off** (a third-party Actions runner can't pass SSO). Everything it creates/lists is `is_test=true` — create products, list orders, mark shipped, with no real money.
- **To hand off:** switch the Action to **production** + the production key. From then on it sees only live data.
- The **owner's day-to-day never touches this** — her safety net is the draft preview (v1.5). The test↔live switch is Sean's testing/demo tool.

**Store management (this plan):** the GPT can **edit** products, run **draft → preview → publish**, manage **coupons**, and **archive / resurface** pieces — the Actions + Knowledge in this doc cover all of it. As always, the GPT only ever sees the environment its Action points at.

---

## Part 1 — What the GPT must know (its knowledge)

> **Canonical knowledge = two uploaded files.** The GPT's product and voice knowledge live in **`assets/docs/gpt/product-reference.md`** (fields, enums, photos, worked example) and **`assets/docs/gpt/voice-guide.md`** (brand voice for writing copy). Those two files are the **source of truth** and are what you upload as Knowledge (§2D). 1A–1C below are a quick summary of `product-reference.md`; keep the uploaded files current and treat them as authoritative. 1D–1E (orders/refunds) are behavioral and live only here + in the Instructions.

### 1A. Product protocol — the fields she provides

Every product is a row in Supabase. Creating or editing a product makes a DRAFT with a private preview link; the Stripe listing is created when it's PUBLISHED. These are the fields and how to write them.

**She writes:**
- **title** — the name of the piece, exactly as shown.
- **headline** — 5–7 word tagline. Short, poetic; appears under the title.
- **story_card** — the full story (2–8 paragraphs). The emotional heart; her natural poetic voice (see `voice-guide.md`).
- **description** — 2–3 sentence summary. Used in previews, search, social shares.
- **features** — list of notable features, written beautifully ("Softly illuminated by warm LED glow," not "LED lights").
- **price** — in **dollars**; we store cents ($245.00 → 24500). Never show her the integer.
- **dimensions** — W × D × H in inches (e.g. `8" W x 6" D x 10" H`).
- **weight** — for shipping, in pounds (e.g. `2.5 lbs`).
- **materials** — list; each material a separate string.
- **power_supply** — e.g. `USB-C (adapter included)`, `Battery (included)`, or empty.
- **care_instructions** — list; each step a string.
- **shipping_details** — list; timeframe, packaging notes, insurance.
- **artist_note** — optional brief personal note.

**She chooses:**
- **product_type** — `miniature` (the only type the store supports today; printable/storybook are future work, not something the GPT can add on its own).
- **series** — one or none of `Portals to Peace`, `Book Nooks`, `Story Lofts`, `Seasonal`, `Limited Edition` (new names auto-appear on the site).
- **available** — `true`/`false` (auto-set `false` on purchase).
- **quantity** — number; `1` for one-of-a-kind, `0` sold out, higher for editions.
- **featured** — `true`/`false` (homepage carousel).

**You also write (SEO + checkout):** `seo_title`, `seo_description`, `seo_thumbnail` (OG image); and the checkout line `checkout_name` / `checkout_description` (one short line) / `checkout_image` — each falls back to the page title / description / thumbnail if left blank, and all freeze once the product is published.
**You derive `slug` from the title (compute once, reuse) — see "THE SLUG" in the Instructions:** required on createProduct and on every uploadImage; the server normalizes it; permanent after creation.
**The system handles (never set):** `sku`, `stripe_product_id`/`stripe_price_id`, the photo CDN URLs, `homepage_theme`, and the draft/publish machinery.

### 1B. Worked example — The Sunkeeper

| Field                           | Value                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| title                           | The Sunkeeper                                                                              |
| headline                        | A garden where time stands still                                                           |
| story_card                      | *The Sunkeeper stands watch …* (2–8 paragraphs)                                            |
| description                     | Handcrafted miniature garden scene with warm LED lighting and hand-placed botanicals.      |
| features                        | Warm LED glow with 3 modes; Hand-placed dried botanicals; USB-C powered (adapter included) |
| price                           | $245.00 (stored as 24500)                                                                  |
| dimensions                      | 8" W x 6" D x 10" H                                                                        |
| weight                          | 2.5 lbs                                                                                    |
| materials                       | Wood, resin, LED lights, natural moss, dried flowers                                       |
| power_supply                    | USB-C (adapter included)                                                                   |
| care_instructions               | Dust gently with soft brush; Keep away from direct sunlight                                |
| shipping_details                | Ships within 3–5 business days; Insured shipping included                                  |
| product_type                    | miniature                                                                                  |
| series                          | Portals to Peace                                                                           |
| available / quantity / featured | true / 1 / true                                                                            |

### 1C. Photos

- **Minimum 7** per product: 1 hero, 1 thumbnail, ≥5 gallery. Ideal 10–15.
- Roles for `uploadImage`: `hero`, `thumbnail`, `gallery-01`…`gallery-15`, `detail-01`…`detail-05`, `video-01`…`video-05`. Use `skip_transform=true` for videos. (GIFs are retired — use a short MP4 instead.)
- Shots: hero (clean front, = thumbnail), angles (3–4), details (2–3), lighting modes (2–3), one scale reference, 1–2 lifestyle.
- The system crops to 4:5, converts to WebP, compresses, and uploads to the CDN. She just sends the photos.

### 1D. Order & fulfillment protocol (what the GPT does for orders)

The GPT is Emy's whole console — it handles fulfillment too, not just products.

- **View orders** (`listOrders`): no filter = all orders newest-first; `status=needs_shipping` = paid orders awaiting shipping; `status=shipped` = already sent; `q=` searches by order id, customer email, or tracking number. Read results back to her plainly (who, what, address, total, shipped/not).
- **Mark shipped + send tracking** (`markShipped`): record a tracking number + carrier on an order. This **emails the buyer their tracking link automatically** and flips the order to `shipped`. The carrier MUST be exactly one of `USPS`, `UPS`, `FedEx`, `DHL` — normalize her wording ("the post office" → `USPS`). **Always confirm before calling** (it emails the buyer and can't be undone).
- **Find information**: use `listOrders` to answer "what did she order," "what's the shipping address," "did the tracking email send" (the order carries `tracking_email_sent_at`).

### 1E. Refunds (the GPT can issue them — v3.3)

The GPT has a **`refundOrder`** Action (v3.3, on `api/orders.ts`). Flow: find the order (`listOrders q=<email|id>`), read back the piece(s) + amount + buyer, get her **yes**, then refund — Stripe emails the buyer automatically. A Stripe refund is an **amount against the payment**, and one purchase can be several pieces sharing one payment, so it refunds (and offers to re-list) **only** the pieces she marks returned (`relist_product_ids`), never the whole cart by surprise. It then **always offers to re-list each returned piece** (re-list a sold-out piece, or +1 a multi-stock one) — a refund never re-lists on its own. **/admin** has the same "Refund this purchase…" panel. A **full** refund flips the order to `refunded`; a **partial** usually won't (refunding the full cart total does). Payouts + payment history still live in **Stripe** (the GPT can web-look-up its current screens). See `STORE_ADMINISTRATION.md`.

---

## Part 2 — The GPT configuration (paste-able)

### 2A. Instructions (system prompt)

> **⚠ Snapshot — paste from the canonical file, not this block.** The live, paste-able instructions are **`assets/docs/archive/v2_0/v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt`** (the Phase 3.9 v3.3 rewrite — adds amount-based refund, chat-attach `uploadImages`, and coupon `expires_date` + plain-date readback; 7788/8000 chars). The block below is the **v2.0.0 snapshot**, kept for reference and now **out of date** — do not paste it.

```
You are "The Sunkeeper", Everlastings by Emaline's store assistant. You help Em (the artist) run her store: add/edit products, run sales, fulfill orders. Be a warm, capable studio assistant; always plain language; never expose API keys, URLs, or jargon unless she asks. Field definitions and how to write each field = your "product-reference" Knowledge file; brand voice = "voice-guide". Each Action's own description gives its mechanics; rely on them.

PRODUCT FLOW (create): slug -> upload photos -> createProduct -> hand her the preview -> publish.
1. Ask what she wants to add; collect details conversationally. Required: title, headline (5-7 word tagline), story_card (2-8 poetic paragraphs), description, features, price (dollars), product_type=miniature. Optional fields are in "product-reference".
2. Compute the slug ONCE (see THE SLUG) before any upload.
3. Photos/videos arrive as LINKS only (a Google Drive "anyone with the link" share, or a direct file URL); you cannot use a file pasted into chat. uploadImage each (roles are in the uploadImage Action); it returns a CDN url, use that verbatim, never invent one. REQUIRED or the create fails: at least 1 hero + at least 5 gallery + a thumbnail (you may reuse the hero url) = 7 minimum; other roles are extras. If she cannot give 5 gallery angles, say so plainly; do not retry.
4. createProduct: also draft the checkout line (checkout_name/description/image, each defaults to title/description/thumbnail) and SEO (seo_title/description/thumbnail); send materials/features/care/shipping as arrays; price in CENTS (245 dollars -> 24500) but always speak dollars. It returns a PREVIEW link (a draft). Hand it over: "Here's your preview: <preview_url> - exactly how shoppers will see it. Tap Publish there, or tell me 'publish'." The preview is the real review; don't read fields back except to confirm (below).

CONFIRM VS EXPEDITE: by default confirm the key drafted fields plainly before saving. If she has said "just go ahead" (this piece or in general), EXPEDITE straight to the preview. Either way the preview is the review.

THE SLUG (derive ONCE, before uploading): it is the URL handle and the CDN photo folder, required on createProduct, and photos upload before the row exists, so derive it first. From the title: FOLD accented letters to plain ASCII (café->cafe, piñata->pinata), lowercase, spaces->hyphens, strip anything not a-z/0-9/hyphen ("Em's Lavender & Sage" -> "ems-lavender-sage"), collapse repeats. FOLD, do NOT DROP, accents: the server folds the same way, so folding keeps your slug identical to its; dropping makes the photos land in a different CDN folder and show broken. Reuse the EXACT same string for every uploadImage and createProduct. Permanent; never set on edits. (No Latin letters in the title -> ask her for a Latin-letters title.)

EDITING: find the piece - getProduct by slug (returns live/draft + the id), or listProducts to browse. If getProduct 404s (an apostrophe/ampersand title makes a slug you can't reconstruct), listProducts, match her wording to a title, then getProduct AGAIN with that exact slug before editing; never say "I couldn't find it" without listing first. getProduct returns `effective` (live + staged); ALWAYS build your edit values from `effective` so you don't wipe staged edits, and never report a `draft` value as the live copy (top-level = what shoppers see now). editProduct with the id + only the changed fields: price, availability, and quantity apply LIVE immediately; everything else (copy/SEO/photos/media) STAGES a draft to preview then publish. So "mark it sold" / "set the price to X" / "we got 3 more in" -> save and say it's done; copy/photo edits -> stage and hand back the preview link; never call a staged edit live until published. "Feature on the homepage" -> {featured:true}; "add to the <name> collection" -> {series:"<name>"} (both stage on a published piece). discardEdits {id} scraps a pending draft (a price change isn't staged; revert it with another editProduct). HEADS-UP: a live price/availability/quantity change leaves earlier staged copy edits untouched; if getProduct still shows a `draft` afterward, tell her she has unpublished copy edits to preview+publish or discard. PHOTOS: no per-photo command; getProduct first, send the COMPLETE `images` array (+thumbnail). When edits are pending, build it from `effective.images`, not the live top-level, or a second edit drops the first. Same for `media`.

REMOVING: take a piece down -> archiveProduct (stays findable; reverse with unarchiveProduct). There is NO delete.

PUBLISHING: "publish" / "make it live" -> publishProduct {id}; for a new product this creates the Stripe listing and makes it purchasable. After publish the old preview link stops (expected). A publish 400 ("Missing required fields: story_card", "Minimum 5 gallery images") -> translate to plain language (story_card = the story, headline = the tagline) and tell her what to add. To re-show a lost preview: getProduct and hand back its `preview_url` EXACTLY (never hand-build a URL); if none is returned the piece is fully live -> give the plain product page link. Don't make a no-op edit to "regenerate" a link.

COUPONS: translate her wish into createCoupon (percent, or amount-off in cents; dollars->cents; optional code/scope/min/expiry/cap). A product-scoped coupon needs a PUBLISHED product (a draft has no Stripe id); else make it store-wide. NEVER promise BOGO / "buy N". Read the code back. listCoupons shows running sales and each one's scope (store-wide vs specific); relay it. deactivateCoupon {code} ends one now. For a temporary sale, a coupon (not a price cut) keeps the list price intact.

ORDERS: listOrders to find them (status=needs_shipping / shipped; q = order id, email, or tracking) and read back plainly. markShipped: get the tracking number + carrier (exactly USPS, UPS, FedEx, or DHL; "the post office" -> USPS). CONFIRM FIRST: "Mark <product> shipped via <carrier> <tracking> and email <buyer>?" - it emails the buyer and can't be undone. If it returns email_sent:false, tell her the tracking saved but the email didn't send; text Sean.

REFUNDS: you can SEE order status but have NO refund Action. Walk her through Stripe (Payments -> find the payment -> Refund); Stripe emails the buyer. Stripe changes its dashboard, so if unsure of the current steps USE WEB SEARCH first. A full refund flips the order's status to "refunded" on its own; a partial one won't show (tell her to check Stripe). A refund does NOT relist the piece: getProduct, then editProduct {available:true} if still published-but-sold, or unarchiveProduct if archived. Revenue/payouts live in Stripe; point her there.

MEDIA (optional page video): upload the MP4 (uploadImage, skip_transform:true), then ALWAYS ask her, per clip, how it behaves (never assume): autoplay + loop silent with no buttons (GIF-like), or click-to-play with sound (the default; she can add a still "poster"). Set the media flags accordingly. MP4s render before YouTube; YouTube is rare. Empty media -> the section hides. No GIFs.

LINK TROUBLE: if uploadImage 400s (a Drive share PAGE not the file, not public, or a video over ~25 MB showing a scan page), ask her for an "anyone with the link" Drive share or a direct URL (Dropbox "?dl=1" / CDN), then retry. A photo pasted in chat -> say you can't use a pasted file; ask for a link.

ALWAYS: write copy in Em's voice (warm, poetic, quietly magical, never sales-y; full guidance + word lists in "voice-guide"). On 409 (slug/code taken) suggest a new title/code; 400 -> name the missing field plainly; 401 -> stop and say "the connection key needs Sean's attention." Never invent a tracking number, carrier, or URL; never set a price she didn't say. Keep her in plain, warm language.
```

### 2B. Actions schema (OpenAPI)

> **⚠ Snapshot — paste from the canonical file, not this block.** The live, paste-able schema is **`assets/docs/archive/v2_0/v2_0_0_GPT_SCHEMA.txt`** (v3.3 adds the `refundOrder` + `uploadImages` operations and `expires_date` on `createCoupon`). The block below is the **v2.0.0 snapshot**, kept for reference and now **out of date** — do not paste it.

```yaml
openapi: 3.1.0
info:
  title: Everlastings Store API
  description: Create products, upload media, and fulfill orders on everlastingsbyemaline.com.
  version: 1.2.0
servers:
  - url: https://everlastingsbyemaline.com
paths:
  /api/products:
    post:
      operationId: createProduct
      summary: Create a new product as a draft (no Stripe yet). The response includes preview_url; publishProduct is what creates the Stripe listing and makes it live.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [title, headline, story_card, description, price, product_type, slug, images, thumbnail]
              properties:
                title: { type: string }
                slug: { type: string, description: "URL-safe handle you derive from the title (lowercase, spaces→hyphens, strip anything not a-z0-9-, collapse repeats) and reuse for every uploadImage call. Required because photos upload before the row exists. The server normalizes it again; it's permanent after creation." }
                headline: { type: string }
                story_card: { type: string }
                description: { type: string }
                features: { type: array, items: { type: string } }
                price: { type: integer, description: Price in cents. }
                dimensions: { type: string }
                weight: { type: string }
                materials: { type: array, items: { type: string } }
                power_supply: { type: string }
                care_instructions: { type: array, items: { type: string } }
                shipping_details: { type: array, items: { type: string } }
                product_type: { type: string, enum: [miniature] }
                series: { type: string, description: "Collection/series name shoppers filter by, e.g. \"Portals to Peace\"." }
                available: { type: boolean }
                quantity: { type: integer }
                featured: { type: boolean, description: "Show this piece in the homepage carousel." }
                artist_note: { type: string }
                images:
                  type: array
                  items:
                    type: object
                    required: [url]
                    properties:
                      url: { type: string }
                      alt: { type: string }
                media:
                  type: array
                  items:
                    type: object
                    required: [type, url]
                    properties:
                      type: { type: string, enum: [video, youtube], description: "video = an MP4 you uploaded (the usual); youtube = a YouTube link (rare)." }
                      url: { type: string, description: "MP4 CDN URL (from uploadImage role video-0x) or a YouTube link." }
                      alt: { type: string }
                      loop: { type: boolean, description: "Replay automatically — true for a GIF-like clip." }
                      autoplay: { type: boolean, description: "Start on its own (always silent — autoplay must be muted). true = GIF-like; false/omit = she presses play." }
                      controls: { type: boolean, description: "Show play/volume buttons. true or omit = normal click-to-play; false = GIF-like, no buttons." }
                      poster: { type: string, description: "Optional still-frame image URL shown before a click-to-play video starts." }
                thumbnail: { type: string }
                seo_title: { type: string }
                seo_description: { type: string }
                seo_thumbnail: { type: string }
                checkout_name: { type: string, description: "Editable only before first publish (frozen after)." }
                checkout_description: { type: string, description: "Editable only before first publish (frozen after)." }
                checkout_image: { type: string, description: "Editable only before first publish (frozen after)." }
      responses:
        '200': { description: Draft created; returns preview_url. }
    get:
      operationId: listProducts
      summary: List all products with their status (live, draft, live-with-edits-pending, or archived). Use this to find a product (and its id) before editing, and to tell Em what is live vs still a draft vs archived. Read is_published + draft + archived_at to report status.
      responses:
        '200':
          description: Products list.
          content:
            application/json:
              schema:
                type: object
                properties:
                  products:
                    type: array
                    items:
                      type: object
                      description: "A product row. Read these to find a piece, report its status, and scope a coupon: id (UUID — pass to editProduct/publishProduct/archiveProduct/createCoupon), slug, title, price (cents), available, quantity, is_published, archived_at, draft (non-null = edits pending), stripe_product_id (needed to scope a coupon to ONE piece — only present once published)."
                      properties:
                        id: { type: string }
                        slug: { type: string }
                        title: { type: string }
                        price: { type: integer }
                        available: { type: boolean }
                        quantity: { type: integer }
                        is_published: { type: boolean }
                        archived_at: { type: string }
                        draft: { type: object }
                        stripe_product_id: { type: string }
    put:
      operationId: editProduct
      summary: Stage edits. On a published product, copy/SEO/photo changes stage a draft to preview (publish applies them); price, availability, and quantity apply live immediately (a price change rotates the Stripe price, same product/URL). checkout_* freeze after publish; for a temp discount, make a coupon.
      parameters:
        - in: query
          name: id
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title: { type: string }
                description: { type: string }
                headline: { type: string }
                story_card: { type: string }
                features: { type: array, items: { type: string } }
                dimensions: { type: string }
                weight: { type: string }
                materials: { type: array, items: { type: string } }
                power_supply: { type: string }
                care_instructions: { type: array, items: { type: string } }
                shipping_details: { type: array, items: { type: string } }
                series: { type: string, description: "Collection/series name shoppers filter by, e.g. \"Portals to Peace\". Stages like copy on a published piece — publish to apply." }
                product_type: { type: string, enum: [miniature] }
                artist_note: { type: string }
                quantity: { type: integer }
                available: { type: boolean }
                featured: { type: boolean, description: "Show this piece in the homepage carousel. Stages like copy on a published piece — publish to apply." }
                thumbnail: { type: string }
                thumbnail_alt: { type: string }
                images: { type: array, items: { type: object, properties: { url: { type: string }, alt: { type: string } } } }
                media:
                  type: array
                  items:
                    type: object
                    required: [type, url]
                    properties:
                      type: { type: string, enum: [video, youtube], description: "video = an MP4 you uploaded (the usual); youtube = a YouTube link (rare)." }
                      url: { type: string, description: "MP4 CDN URL (from uploadImage role video-0x) or a YouTube link." }
                      alt: { type: string }
                      loop: { type: boolean, description: "Replay automatically — true for a GIF-like clip." }
                      autoplay: { type: boolean, description: "Start on its own (always silent — autoplay must be muted). true = GIF-like; false/omit = she presses play." }
                      controls: { type: boolean, description: "Show play/volume buttons. true or omit = normal click-to-play; false = GIF-like, no buttons." }
                      poster: { type: string, description: "Optional still-frame image URL shown before a click-to-play video starts." }
                seo_title: { type: string }
                seo_description: { type: string }
                seo_thumbnail: { type: string }
                price: { type: integer, description: "Price in CENTS — editable anytime. On a published product a change ROTATES the Stripe price and goes live immediately (same product/URL); no need to publish a price change." }
                checkout_name: { type: string, description: "Editable only before first publish (frozen after)." }
                checkout_description: { type: string, description: "Editable only before first publish (frozen after)." }
                checkout_image: { type: string, description: "Editable only before first publish (frozen after)." }
      responses:
        '200': { description: Draft staged; returns preview_url. }
  /api/products/publish:
    post:
      operationId: publishProduct
      summary: Publish a product (or apply staged edits). For a new product this creates the Stripe product/price and makes it live.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [id]
              properties:
                id: { type: string, description: The product UUID (from listProducts). }
      responses:
        '200': { description: Published; returns the live url. }
  /api/products/archive:
    post:
      operationId: archiveProduct
      summary: Remove a product from the store (reversible). Hides it from the shop + feed and archives it in Stripe; it stays findable and can be resurfaced. Use this to take a piece down — there is no hard delete.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [id]
              properties:
                id: { type: string, description: The product UUID (from listProducts). }
      responses:
        '200': { description: Archived. }
  /api/products/unarchive:
    post:
      operationId: unarchiveProduct
      summary: Bring an archived product back into the store (reverses archiveProduct).
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [id]
              properties:
                id: { type: string, description: The product UUID (from listProducts). }
      responses:
        '200': { description: Resurfaced. }
  /api/products/discard:
    post:
      operationId: discardEdits
      summary: Scrap a published product's pending (staged) edits without publishing them — the inverse of publish. The live page is left exactly as it is. Use when she changes her mind about edits she previewed. Only for a published product with edits pending; to drop a brand-new draft, archive it.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [id]
              properties:
                id: { type: string, description: The product UUID (from listProducts). }
      responses:
        '200': { description: Pending edits discarded; the live product is unchanged. }
  /api/coupons:
    post:
      operationId: createCoupon
      summary: Create a discount — a Stripe Coupon plus a shareable Promotion Code. Percent or amount off; optional product scope, minimum order amount, expiry, redemption cap. No buy-N/BOGO.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [type, value]
              properties:
                type: { type: string, enum: [percent, amount], description: percent off, or a fixed amount off in CENTS. }
                value: { type: number, description: "percent (1–100) or amount in cents (e.g. 500 = $5)." }
                code: { type: string, description: The shareable code, e.g. HOLIDAY20. Optional — Stripe generates one if omitted. }
                product_ids: { type: array, items: { type: string }, description: "Stripe product IDs (the stripe_product_id field from listProducts — NOT the Supabase id) to limit the discount to. Omit for store-wide." }
                min_amount: { type: integer, description: Minimum order total in cents to qualify. Optional. }
                expires_at: { type: integer, description: Unix timestamp when the code expires. Optional. }
                max_redemptions: { type: integer, description: Max total redemptions. Optional. }
      responses:
        '200': { description: Coupon created; returns the code. }
    get:
      operationId: listCoupons
      summary: List active discounts (codes, percent/amount off, redemptions, expiry) so you can tell Em what's running and end one.
      responses:
        '200': { description: Active coupons. }
  /api/coupons/deactivate:
    post:
      operationId: deactivateCoupon
      summary: End a discount now — deactivates the promotion code so it stops working. Existing orders keep their history.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [code]
              properties:
                code: { type: string, description: The shareable code to end, e.g. HOLIDAY20. }
      responses:
        '200': { description: Coupon deactivated. }
  /api/products/by-slug/{slug}:
    get:
      operationId: getProduct
      summary: Get ONE product (live or draft) by its slug, with full current values — use this when she names a specific piece, instead of listing everything. When the row has pending preview state it also returns a ready-to-share preview_url (origin-correct).
      parameters:
        - in: path
          name: slug
          required: true
          schema: { type: string }
      responses:
        '200': { description: "The product (full row, incl. is_published + any staged draft), plus preview_url when a preview_token exists (relay this link; do not build a URL by hand)." }
  /api/upload:
    post:
      operationId: uploadImage
      summary: "Upload a photo or video to the store's CDN and return its url; call it for every image/video before createProduct/editProduct, then put the url into images[]/thumbnail/checkout_image/seo_thumbnail/media[]. Media comes as a LINK (a Drive share or direct URL); you can't forward a pasted file."
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [url, slug, role]
              properties:
                url: { type: string, description: "A link to the image/video — a Google Drive share link ('anyone with the link') or a direct file URL. The server downloads it." }
                slug: { type: string, description: "The product's slug (lowercase-hyphenated title). Names the file on the CDN." }
                role: { type: string, description: "What this media is: hero, thumbnail, gallery-01..15, detail-01..05, video-01..05, checkout_image (Stripe 1:1), or seo_thumbnail (1.91:1 OG card)." }
                skip_transform: { type: boolean, description: "true for videos and GIFs (uploaded as-is, no crop). Leave off / false for photos so they're cropped + web-optimized." }
      responses:
        '200': { description: "Uploaded; returns { url, filename }. Use url verbatim in the product fields." }
        '400': { description: "The link wasn't directly downloadable (often a Drive share PAGE rather than the file, or not shared as 'anyone with the link'), or the type/size wasn't allowed — relay the message and ask Em for a direct/shared link." }
  /api/orders:
    get:
      operationId: listOrders
      summary: List orders for fulfillment. Optional status filter and free-text search.
      parameters:
        - in: query
          name: status
          schema: { type: string, enum: [needs_shipping, shipped] }
          description: Filter to orders awaiting shipping or already shipped.
        - in: query
          name: q
          schema: { type: string }
          description: Search by order id, customer email, or tracking number.
      responses:
        '200':
          description: Orders list.
          content:
            application/json:
              schema:
                type: object
                properties:
                  orders: { type: array, items: { type: object } }
  /api/orders/{id}:
    patch:
      operationId: markShipped
      summary: Record a tracking number + carrier on an order and email the buyer automatically.
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
          description: The order UUID (from listOrders).
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [tracking_number, tracking_carrier]
              properties:
                tracking_number: { type: string }
                tracking_carrier: { type: string, enum: [USPS, UPS, FedEx, DHL] }
      responses:
        '200':
          description: Tracking recorded; buyer notified.
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  email_sent: { type: boolean }
```

### 2C. Authentication

- **Type:** API Key · **Auth Type:** Bearer · **API Key:** use the `PRODUCT_API_KEY` **whose Vercel scope matches the environment the Action's `servers:` URL points at** (Vercel → Project → Settings → Environment Variables → `PRODUCT_API_KEY`):
  - **Testing against the dev preview** (where setup happens): the **Preview**-scoped value — the same key in `.env.local` that ran the curl tests (the preview deploy runs `is_test=true`).
  - **Production hand-off:** the **Production**-scoped value.
  - Never mix scopes — a key from the wrong environment returns `401`.
- One key authorizes all the actions (`/api/products`, `/api/upload`, `/api/coupons`, and `/api/orders`).

### 2D. Settings

- **Name:** `The Sunkeeper` · **Description:** `Everlastings by Emaline store assistant — adds products and fulfills orders by chat.`
- **Capabilities:** Web Browsing **on** (required — the refund walkthrough confirms Stripe's current dashboard steps by web search), DALL·E off, Code Interpreter on (lets it inspect uploaded images if needed).
- **Privacy policy URL:** `https://everlastingsbyemaline.com/privacy`
- **Share:** **Only me** (it carries a live API key — never public).
- **Knowledge files (required):** upload the two curated files **`assets/docs/gpt/product-reference.md`** and **`assets/docs/gpt/voice-guide.md`**. Do **not** upload `BRAND.md`, `EVERLASTINGS_STORE.md`, or `STORE_ADMINISTRATION.md` — they carry developer/CSS/architecture detail that confuses the GPT and risks leaking technical jargon to Em. (Role context is already in the Instructions; the GPT doesn't need the human operator how-to.)

---

## Part 3 — Setup, in two waves (Sean drives; Em at the keyboard)

The GPT lives in **Em's** ChatGPT (she has Plus; she's the owner). It's built in **two waves** for two reasons learned the hard way: the order Actions depend on the `/api/orders` Bearer path that **shipped in v1.4.9 (Phase 6)**, and a third-party Actions runner **cannot authenticate through a Vercel SSO-protected preview** — so each wave is verified against an environment the GPT can actually call (point the Action at the dev preview to test, production to hand off — see the Status note's environment rule). Don't configure an Action you can't immediately verify.

### Wave 1 — Products (after the v2.0.0 build is live on the environment the GPT points at)

The v1.5 management Actions (`editProduct`, `publishProduct`, `discardEdits`, the coupon/archive routes, and the rewritten **JSON** `uploadImage`) need the **v2.0.0 build deployed** to the target environment first — so this wave runs *after* that deploy, not "anytime." (`/api/upload` + `/api/products` accept the Bearer key; the new management/coupon/archive routes and the by-link JSON upload come with v2.0.0.)

1. ChatGPT → **Explore GPTs → Create → Configure**.
2. Paste **Name** + **Description** (2D).
3. Paste **Instructions** (2A) verbatim.
4. **Capabilities** per 2D — turn **Web Browsing ON** (required for the refund walkthrough). **Knowledge:** upload `assets/docs/gpt/product-reference.md` + `assets/docs/gpt/voice-guide.md` (2D) — never the raw dev docs.
5. **Create new action → Authentication:** API Key, Bearer, paste the `PRODUCT_API_KEY` for the environment you'll verify against (see the smoke test).
6. **Schema:** paste the YAML (2B) verbatim (whitespace-sensitive — copy clean). You may paste the full schema now; the `/api/orders` Actions simply won't work until Wave 2.
7. **Privacy URL** (2D). **Save → Only me**.
8. **Wave 1 smoke test** — because the GPT can't reach the SSO-protected preview, verify the product pipeline one of two ways. Either way the path is: **create-draft → open the returned `preview_url` → publish (publish creates Stripe + goes live) → archive the throwaway.**
   - **Recommended (no live clutter):** Sean curls the **dev preview** first to prove the pipeline (test key from `.env.local`). A bogus-key call → `401` (proves the endpoint is deployed + gated); a real-key `createProduct` returns a draft + `preview_url` and tags the row `is_test=true`; then `publishProduct {id}` creates the Stripe listing. The GPT wraps these exact calls — green curl = green GPT path.
   - **GPT end-to-end (at launch):** point the schema `servers:` + key at **production**, then have the GPT add "Setup Smoke Test, $1," give it 7 throwaway photo links → it uploads 7×, hands back the `preview_url`, then **publish** → `prod_…` id. Open `https://everlastingsbyemaline.com/product/setup-smoke-test`, then archive it (`archiveProduct`, or Stripe → archive product / Supabase Studio).

### Wave 2 — Orders (the `/api/orders` Bearer path shipped in v1.4.9; verify it on the environment the GPT targets)

The order Actions (`listOrders`, `markShipped`) need the `PRODUCT_API_KEY` Bearer path on `/api/orders`, which **Phase 6 ships**. Until it's deployed to the environment the GPT targets, these Actions return `401` — this is exactly the trap from the earlier attempt, so honor the gate:

1. **Confirm Phase 8.7 passed** on the target environment (Sean curls `/api/orders` GET + PATCH with that environment's key → `200`).
2. GPT → **Edit → Actions → Schema:** confirm the `/api/orders` + `/api/orders/{id}` paths are present (2B).
3. **Wave 2 smoke test** (with Em watching): "What orders need shipping?" → it calls `listOrders` and reads them back plainly. Then mark a **test** order shipped → it confirms first, calls `markShipped`, the order flips to shipped and the buyer tracking email fires. **A "test order" exists only on the dev preview** — point the GPT there to rehearse with `is_test` data and no real money. In **production** there are no test orders; for a launch sanity check, make one $1 throwaway purchase, ship it via the GPT, then refund + archive. Never mark a real customer's order as a rehearsal.

**Hand-off:** the GPT is in Em's sidebar. Remind her: always the required photo set (≥1 hero + ≥5 gallery + a thumbnail); create and edits make a **draft with a preview link** — she reviews it, then **publishes** to go live; it manages products end-to-end (edit, draft → preview → publish, coupons, archive/resurface) and handles orders; it confirms before marking shipped (that emails the buyer); if she ever sees "the connection key needs Sean's attention," text Sean.

**Maintenance:** if `PRODUCT_API_KEY` rotates, reopen the GPT → Actions → Authentication → paste the new value → Save — nothing else changes. If the API base URL changes, update the `servers:` URL in the schema (2B).

---

## Part 4 — Agentic / curl protocol (Claude Code, Cursor, scripts, Sean)

> **Audience:** an AI/agent that executes HTTP directly (Claude Code, ChatGPT code interpreter, scripts), or Sean seeding test data. For Emy's chat workflow, that's Parts 1–3 (the Custom GPT wraps these same calls).

### Base URL

| Use case                          | `BASE_URL`                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Real product creation (default)   | `https://everlastingsbyemaline.com`                                                                  |
| Test/dev seeding (preview deploy) | `https://everlastings-website-git-dev-everlastingsbyemaline.vercel.app` (any `*.vercel.app` preview) |
| Local (`vercel dev`)              | `http://localhost:3000`                                                                              |

```bash
export BASE_URL="https://everlastingsbyemaline.com"        # production
# export BASE_URL="https://everlastings-website-git-dev-everlastingsbyemaline.vercel.app"  # dev preview
```

When `BASE_URL` is a preview, the API tags rows `is_test = true` and uploads under R2's `test/` namespace (URLs become `…/test/{slug}/test_{role}-{slug}.webp`); no cleanup needed before launch. `PRODUCT_API_KEY` differs per environment — use the test value from `.env.local` for previews, the production value only for production.

### Step 0 — Generate slug (FIRST, before any image upload)
```
slug = title.toLowerCase().replaceAll(' ', '-')   # "The Sunkeeper" → "the-sunkeeper"
```
Immutable after creation; used in image paths and the URL; 409 if it already exists.

### Step 1 — Required fields
`title`, `headline`, `story_card`, `description`, `features` (array), `price` (cents), `product_type`. Optional: `dimensions`, `weight`, `materials`/`care_instructions`/`shipping_details` (arrays), `power_supply`, `series`, `available` (default true), `quantity` (default 1), `featured` (default false), `artist_note`.

### Step 2 — Upload images
The endpoint composes the filename as `{role}-{slug}.{ext}` and handles the Cloudinary transform internally.
```bash
curl -X POST "$BASE_URL/api/upload" \
  -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -F "file=@/path/to/raw-image.jpg" \
  -F "slug=the-sunkeeper" \
  -F "role=hero"
# → { "url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/hero-the-sunkeeper.webp" }

# Videos / GIFs — skip the transform:
curl -X POST "$BASE_URL/api/upload" \
  -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -F "file=@clip.mp4" -F "slug=the-sunkeeper" -F "role=video-01" -F "skip_transform=true"
```
Roles: `hero`, `thumbnail`, `gallery-01..gallery-15`, `detail-01..05`, `video-01..05`, `gif-01..05`.

### Step 3 — Create product (makes a DRAFT; no Stripe yet)
```bash
curl -X POST "$BASE_URL/api/products" \
  -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Sunkeeper",
    "slug": "the-sunkeeper",
    "headline": "A garden where time stands still",
    "story_card": "The Sunkeeper stands watch...",
    "description": "Handcrafted miniature garden scene with warm LED lighting.",
    "features": ["Warm LED glow with 3 modes", "Hand-placed dried botanicals"],
    "materials": ["Wood", "resin", "natural moss"],
    "care_instructions": ["Dust gently with a soft brush", "Keep away from direct sunlight"],
    "shipping_details": ["Ships within 3-5 business days", "Insured shipping included"],
    "price": 24500,
    "product_type": "miniature",
    "series": "Portals to Peace",
    "images": [
      {"url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/hero-the-sunkeeper.webp", "alt": "Front view"},
      {"url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/gallery-01-the-sunkeeper.webp", "alt": "Side angle"}
    ],
    "thumbnail": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/thumbnail-the-sunkeeper.webp",
    "seo_title": "The Sunkeeper | Everlastings by Emaline",
    "seo_description": "Handcrafted miniature garden scene with warm LED lighting."
  }'
# → { "success": true, "product": {...}, "preview_url": "https://…/product/the-sunkeeper?preview=…" }
```
Create returns a **draft** plus a `preview_url` — no Stripe product/price is created yet, and there's no `stripe_sync` block.

### Step 3b — Publish (creates Stripe + goes live)
```bash
curl -X POST "$BASE_URL/api/products/publish" \
  -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "PRODUCT_UUID"}'
```
Publishing a new product is what creates the Stripe product/price and makes it purchasable; the preview link rotates on publish.

### Editing / marking sold (PUT)
On a **published** product, `price`, `available`, and `quantity` apply **LIVE immediately** (no preview, no publish). Everything else — copy, SEO, photos/media — **stages a draft** and returns a `preview_url`; call `/api/products/publish {id}` to apply it. Only the `checkout_*` identity fields freeze after first publish.
```bash
# Copy / SEO / photo edits — STAGE a draft (returns preview_url; publish to apply):
curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" -d '{"headline": "Updated tagline", "featured": false}'
# Price change — rotates the Stripe price in place (same product/URL), LIVE immediately:
curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" -d '{"price": 29500}'
# Mark sold — {available:false} ONLY (also happens automatically on purchase); LIVE immediately:
curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" -d '{"available": false}'
# Restock — LIVE immediately:
curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" -d '{"quantity": 3}'
```

### Error handling
- **Image upload fails:** retry once; if it fails again, STOP — do not create the product with missing images.
- **Create fails:** do NOT blind-retry. `409` = slug conflict; `400` = missing/invalid field; `401` = wrong/missing key.
- **Rollback:** if the product was created but images are incomplete, set `available = false` immediately.

### API quick reference
| Action            | Method | Endpoint                                                      |
| ----------------- | ------ | ------------------------------------------------------------- |
| Create product    | POST   | `/api/products`                                               |
| List products     | GET    | `/api/products`                                               |
| Get product       | GET    | `/api/products?slug=SLUG` (or `/api/products/by-slug/{slug}`) |
| Update product    | PUT    | `/api/products?id=UUID`                                       |
| Publish product   | POST   | `/api/products/publish`                                       |
| Discard edits     | POST   | `/api/products/discard`                                       |
| Archive product   | POST   | `/api/products/archive`                                       |
| Unarchive product | POST   | `/api/products/unarchive`                                     |
| Upload image      | POST   | `/api/upload`                                                 |
| Create coupon     | POST   | `/api/coupons`                                                |
| List coupons      | GET    | `/api/coupons`                                                |
| Deactivate coupon | POST   | `/api/coupons/deactivate`                                     |
| List orders       | GET    | `/api/orders` (`?status=`, `?q=`)                             |
| Mark shipped      | PATCH  | `/api/orders/{id}`                                            |

> **Auth modes.** `/api/products` and `/api/upload` accept `Authorization: Bearer` as either `PRODUCT_API_KEY` (AI/curl/Custom GPT) **or** a Supabase JWT (admin UI signed-in user). As of v1.4.9, **`/api/orders` and `/api/orders/{id}` also accept `PRODUCT_API_KEY`** (the Bearer path added in `v1_4_9_FINISH_TRACK_C.md` Phase 6, comparing the trimmed `env('PRODUCT_API_KEY')`) in addition to the admin JWT — that's what lets the Custom GPT fulfill orders. `PRODUCT_API_KEY` is per-environment (test in `.env.local`, live in Production); never ship it to the browser.

> **`npx vercel curl` quirk:** against a protection-enabled preview, the underlying `curl` exits code `3` ("No host part in the URL") even on success; the JSON body still delivers. In `set -e` scripts use `set -uo pipefail` or `|| true`.

---

*Questions? Sean — sean@august.style*
