# The Sunkeeper — Custom GPT brain + AI pipeline protocol

**What this is.** The complete, canonical reference for the store's AI pipeline. Two readers:
1. **The Custom GPT "The Sunkeeper"** — its knowledge, system prompt, and Actions. Parts 1–3 are everything it must know and the exact config to paste when setting it up.
2. **Claude Code / Sean** — the shell/curl protocol for programmatic product work. Part 4.

This supersedes the archived setup record `archive/v1_4/v1_4_5_C_GPT_SETUP.md` and the retired `PRODUCT_PROTOCOL.md` (its content lives here + in `STORE_ADMINISTRATION.md`). Emy's *simple how-to* lives in `STORE_ADMINISTRATION.md`; this doc is the GPT's brain + the technical protocol.

**Status note (2026-06):** the GPT is set up **from scratch** with this doc (any earlier "Sunkeeper" attempt is discarded). The order/fulfillment Actions (`listOrders`, `markShipped`) require the `PRODUCT_API_KEY` Bearer path on `/api/orders`, shipped in `v1_4_6_FINISH_TRACK_C.md` Phase 6 — set the GPT up after that deploys (product creation works independently and can be set up anytime).

---

## Part 1 — What the GPT must know (its knowledge)

### 1A. Product protocol — the fields she provides

Every product is a row in Supabase; saving it auto-creates the Stripe product so it's purchasable immediately. These are the fields and how to write them.

**She writes:**
- **title** — the name of the piece, exactly as shown.
- **headline** — 5–7 word tagline. Short, poetic; appears under the title.
- **story_card** — the full story (2–8 paragraphs). The emotional heart; her natural poetic voice (see `BRAND.md`).
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
- **product_type** — one of `miniature`, `printable`, `storybook`.
- **series** — one or none of `Portals to Peace`, `Book Nooks`, `Story Lofts`, `Seasonal`, `Limited Edition` (new names auto-appear on the site).
- **available** — `true`/`false` (auto-set `false` on purchase).
- **quantity** — number; `1` for one-of-a-kind, `0` sold out, higher for editions.
- **featured** — `true`/`false` (homepage carousel).

**The system handles (never set):** `slug` (from title, immutable), `sku`, `seo_title`/`seo_description`, `stripe_product_id`/`stripe_price_id`, `thumbnail`/`images` CDN URLs, `homepage_theme`.

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
- Roles for `uploadImage`: `hero`, `thumbnail`, `gallery-01`…`gallery-15`, `detail-01`…`detail-05`, `video-01`…`video-05`, `gif-01`…`gif-05`. Use `skip_transform=true` for videos and GIFs.
- Shots: hero (clean front, = thumbnail), angles (3–4), details (2–3), lighting modes (2–3), one scale reference, 1–2 lifestyle.
- The system crops to 4:5, converts to WebP, compresses, and uploads to the CDN. She just sends the photos.

### 1D. Order & fulfillment protocol (what the GPT does for orders)

The GPT is Emy's whole console — it handles fulfillment too, not just products.

- **View orders** (`listOrders`): no filter = all orders newest-first; `status=needs_shipping` = paid orders awaiting shipping; `status=shipped` = already sent; `q=` searches by order id, customer email, or tracking number. Read results back to her plainly (who, what, address, total, shipped/not).
- **Mark shipped + send tracking** (`markShipped`): record a tracking number + carrier on an order. This **emails the buyer their tracking link automatically** and flips the order to `shipped`. The carrier MUST be exactly one of `USPS`, `UPS`, `FedEx`, `DHL` — normalize her wording ("the post office" → `USPS`). **Always confirm before calling** (it emails the buyer and can't be undone).
- **Find information**: use `listOrders` to answer "what did she order," "what's the shipping address," "did the tracking email send" (the order carries `tracking_email_sent_at`).

### 1E. Refunds (the GPT guides, but cannot execute)

The GPT has no refund Action in v1. When she wants to refund: tell her to do it in the **Stripe dashboard** (Payments → find the payment → Refund) — Stripe emails the buyer automatically. Note clearly: refunding does **not** automatically put the piece back up for sale. If she wants it available again, that's a separate manual relist (set `available = true`) via the **admin UI** or Supabase Studio (`createProduct` only makes *new* products). See `STORE_ADMINISTRATION.md`.

---

## Part 2 — The GPT configuration (paste-able)

### 2A. Instructions (system prompt) — paste verbatim into the Instructions field

```
You are "The Sunkeeper", the Everlastings by Emaline store assistant. You help Em (the artist) run her store — adding products and fulfilling orders. Talk to her like a warm, capable studio assistant. Never expose API keys, server URLs, or technical jargon unless she explicitly asks.

== ADDING A PRODUCT ==
1. Greet warmly. Ask what she wants to add.
2. Collect details conversationally. Required: title, headline (5–7 word tagline), story_card (2–8 poetic paragraphs), description (2–3 sentences), features (list), price in dollars, product_type (miniature / printable / storybook). Optional: dimensions, weight, materials (list), power_supply, care_instructions (list), shipping_details (list), series (Portals to Peace / Book Nooks / Story Lofts / Seasonal / Limited Edition / new), available, quantity, featured, artist_note.
3. Ask for photos — at least 7 total (1 hero, 1 thumbnail, ≥5 gallery). Drag-and-drop is fine. Upload each via the uploadImage action with the right role (hero, thumbnail, gallery-01…gallery-15, detail-01…05, video-01…05, gif-01…05). Use skip_transform=true for videos and GIFs. Use the slug derived from the title (lowercase, spaces become hyphens).
4. Show a clean preview before creating: title, price (in dollars), headline, all photo URLs grouped by role. Ask "Look right?"
5. On confirmation, call createProduct with sync=true. Convert materials, features, care_instructions, shipping_details to arrays of strings. Price goes in CENTS ($245 → 24500) — but always show her dollars.
6. After success, give her the live link: https://everlastingsbyemaline.com/product/{slug}.
Product rules: never create without showing the preview; never set a price different from what she said; never proceed with fewer than 7 photos; never edit an existing product (direct her to the admin UI); on 409 (slug taken) suggest a new title; on 400 tell her exactly which field is missing in plain language; on 401 stop and say "the connection key needs Sean's attention."

== FULFILLING ORDERS ==
When she asks about orders, shipping, or a customer:
1. Use listOrders to find orders. status=needs_shipping = awaiting shipping; status=shipped = already sent; q = search by order id, email, or tracking number. Read results back plainly.
2. To mark an order shipped: get the tracking number and carrier from her. The carrier MUST be exactly one of USPS, UPS, FedEx, DHL — normalize her wording (e.g. "the post office" → USPS). Confirm first: "Mark <product> shipped via <carrier> <tracking> and email <buyer>?" — markShipped emails the buyer automatically and can't be undone. Then call markShipped with the order id, tracking_number, and tracking_carrier.
3. To answer "what did they order / what's their address / did the tracking email send," read it from listOrders.
Order rules: always confirm before markShipped; never invent a tracking number or carrier; if markShipped returns email_sent:false, tell her the tracking saved but the email didn't send and to text Sean.

== REFUNDS ==
You cannot issue refunds. Tell her to refund in the Stripe dashboard (Payments → find the payment → Refund); Stripe emails the buyer automatically. Refunding does NOT relist the piece — if she wants it for sale again she relists it (available = true) via the admin UI. Don't promise the website does this automatically.

== ALWAYS ==
Keep her in plain, warm language. Never reveal API keys, server URLs, or technical detail unless she asks.
```

### 2B. Actions schema (OpenAPI) — paste verbatim into the Schema field

```yaml
openapi: 3.1.0
info:
  title: Everlastings Store API
  description: Create products, upload media, and fulfill orders on everlastingsbyemaline.com.
  version: 1.1.0
servers:
  - url: https://everlastingsbyemaline.com
paths:
  /api/upload:
    post:
      operationId: uploadImage
      summary: Upload a product image (or video / GIF). Images transform to 4:5 WebP automatically; videos and GIFs pass through with skip_transform=true.
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [file, slug, role]
              properties:
                file: { type: string, format: binary }
                slug: { type: string }
                role:
                  type: string
                  description: One of hero, thumbnail, gallery-01..gallery-15, detail-01..detail-05, video-01..video-05, gif-01..gif-05.
                skip_transform:
                  type: string
                  description: Set to "true" to skip transforms (videos, GIFs).
      responses:
        '200':
          description: Upload succeeded.
          content:
            application/json:
              schema:
                type: object
                properties:
                  url: { type: string }
                  filename: { type: string }
  /api/products:
    post:
      operationId: createProduct
      summary: Create a new product. Pass sync=true to receive Stripe product/price IDs inline.
      parameters:
        - in: query
          name: sync
          schema: { type: string }
          description: Set to "true" to run Stripe sync inline and include stripe_sync in the response.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [title, headline, story_card, description, price, product_type, slug, images, thumbnail]
              properties:
                title: { type: string }
                slug: { type: string }
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
                product_type: { type: string, enum: [miniature, printable, storybook] }
                series: { type: string }
                available: { type: boolean }
                quantity: { type: integer }
                featured: { type: boolean }
                artist_note: { type: string }
                images:
                  type: array
                  items:
                    type: object
                    required: [url]
                    properties:
                      url: { type: string }
                      alt: { type: string }
                thumbnail: { type: string }
                seo_title: { type: string }
                seo_description: { type: string }
      responses:
        '200':
          description: Product created.
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  product: { type: object }
                  stripe_sync:
                    type: object
                    properties:
                      success: { type: boolean }
                      no_op: { type: boolean }
                      stripe_product_id: { type: string }
                      stripe_price_id: { type: string }
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

- **Type:** API Key · **Auth Type:** Bearer · **API Key:** the **production** `PRODUCT_API_KEY` (Vercel → Project → Settings → Environment Variables → `PRODUCT_API_KEY`, **Production** scope). Never the preview value.
- One key authorizes all four actions (`/api/products`, `/api/upload`, and — after `v1_4_6` Phase 6 — `/api/orders`).

### 2D. Settings

- **Name:** `The Sunkeeper` · **Description:** `Everlastings by Emaline store assistant — adds products and fulfills orders by chat.`
- **Capabilities:** Web Browsing off, DALL·E off, Code Interpreter on (lets it inspect uploaded images if needed).
- **Privacy policy URL:** `https://everlastingsbyemaline.com/privacy`
- **Share:** **Only me** (it carries a live API key — never public).
- **Knowledge files (optional):** upload `BRAND.md` if you want richer voice; the protocol above is already in the instructions.

---

## Part 3 — From-scratch setup (Sean, with Em at the keyboard)

The GPT lives in **Em's** ChatGPT (she has Plus; she's the owner). Sean drives; she pastes.

1. ChatGPT → **Explore GPTs → Create → Configure** tab.
2. Paste **Name** + **Description** (2D).
3. Paste **Instructions** (2A) verbatim.
4. **Capabilities** per 2D. Optional: upload `BRAND.md` as Knowledge.
5. **Create new action** → **Authentication**: API Key, Bearer, paste the **production** `PRODUCT_API_KEY` (2C).
6. **Schema**: paste the whole YAML (2B) verbatim (YAML is whitespace-sensitive — copy clean).
7. **Privacy URL** (2D). **Save** → **Only me**.
8. **Smoke test** (with Em watching): "Add a quick test product. Title: Setup Smoke Test. Price: $1. Headline: setup smoke test. Story: setup smoke test. Description: setup smoke test." Drag in 7 throwaway images. It should upload 7 times, show a preview, then on "go ahead" call `createProduct` with `sync=true` and return a `prod_…` id. Open `https://everlastingsbyemaline.com/product/setup-smoke-test` to confirm it renders. Then **archive it**: Stripe dashboard → archive the product; Supabase Studio → `products` → set the row `available = false` (or delete).
   - *If `uploadImage` 404s:* the production `/api/upload` deploy or the `servers:` URL is the cause — confirm Track C is deployed to production and the base URL is `https://everlastingsbyemaline.com`. (This was the failure on the earlier attempt, before Track C shipped.)
9. **Hand-off:** the GPT is already in Em's sidebar. Remind her: always ≥7 photos; it always previews before creating; it can't edit existing products (admin UI for edits); if she ever sees "the connection key needs Sean's attention," text you.

**Maintenance:** if `PRODUCT_API_KEY` rotates, reopen the GPT → Actions → Authentication → paste the new production value → Save. Nothing else changes. If the API base URL changes, repeat step 6 with the new `servers:` URL.

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

### Step 3 — Create product (use `?sync=true` for inline Stripe IDs)
```bash
curl -X POST "$BASE_URL/api/products?sync=true" \
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
# → { "success": true, "product": {...}, "stripe_sync": { "success": true, "stripe_product_id": "prod_…", "stripe_price_id": "price_…" } }
```
The sync helper is idempotent: the Supabase DB webhook still fires after the inline path but sees the IDs already set and no-ops. On a **preview** the DB webhook points at production, so test-mode seeding will not auto-sync — **always use `?sync=true` on previews.**

### Editing / marking sold (PUT)
```bash
# Non-price fields:
curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" -d '{"headline": "Updated tagline", "featured": false}'
# Price change (archives old Stripe price, creates new):
curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" -d '{"price": 29500}'
# Mark sold (also happens automatically on purchase):
curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" -d '{"available": false, "quantity": 0}'
```

### Error handling
- **Image upload fails:** retry once; if it fails again, STOP — do not create the product with missing images.
- **Create fails:** do NOT blind-retry. `409` = slug conflict; `400` = missing/invalid field; `401` = wrong/missing key.
- **Rollback:** if the product was created but images are incomplete, set `available = false` immediately.

### API quick reference
| Action         | Method | Endpoint                           |
| -------------- | ------ | ---------------------------------- |
| Create product | POST   | `/api/products` (add `?sync=true`) |
| Update product | PUT    | `/api/products?id=UUID`            |
| Get product    | GET    | `/api/products?slug=SLUG`          |
| Upload image   | POST   | `/api/upload`                      |
| List orders    | GET    | `/api/orders` (`?status=`, `?q=`)  |
| Mark shipped   | PATCH  | `/api/orders/{id}`                 |

> **Auth modes.** `/api/products` and `/api/upload` accept `Authorization: Bearer` as either `PRODUCT_API_KEY` (AI/curl/Custom GPT) **or** a Supabase JWT (admin UI signed-in user). As of v1.4.6, **`/api/orders` and `/api/orders/{id}` also accept `PRODUCT_API_KEY`** (the Bearer path added in `v1_4_6_FINISH_TRACK_C.md` Phase 6) in addition to the admin JWT — that's what lets the Custom GPT fulfill orders. `PRODUCT_API_KEY` is per-environment (test in `.env.local`, live in Production); never ship it to the browser.

> **`npx vercel curl` quirk:** against a protection-enabled preview, the underlying `curl` exits code `3` ("No host part in the URL") even on success; the JSON body still delivers. In `set -e` scripts use `set -uo pipefail` or `|| true`.

---

*Questions? Sean — sean@august.style*
