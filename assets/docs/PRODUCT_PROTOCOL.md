# Product Protocol — Everlastings by Emaline

**Created**: 2026-04-12
**Updated**: 2026-04-12 — v1.3.0: consolidated from PRODUCT_GUIDE.md + PRODUCT_CREATION_PROTOCOL.md

---

## For Emy (Client Guide)

### How It Works

Every product on the website is stored in a database table (Supabase). You can add products three ways:

  1. **Admin UI** (simplest manual option) — Fill out a form on the website at `/admin`
  2. **Supabase Studio** (free web app; good for quick updates) — Edit the database table directly
  3. **AI assistant** (most powerful) — Tell ChatGPT or Claude the product details and it creates the entry via API

All three create the same database row. When you save a product, a behind-the-scenes script automatically creates it in Stripe too — so it becomes purchasable immediately.

### Complete Example: The Sunkeeper

| Field                 | Value                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| **title**             | The Sunkeeper                                                                                   |
| **headline**          | A garden where time stands still                                                                |
| **story_card**        | *The Sunkeeper stands watch ...* (2-8 paragraphs)                                               |
| **description**       | Handcrafted miniature garden scene with warm LED lighting and hand-placed botanicals.           |
| **features**          | Warm LED glow with 3 modes, Hand-placed dried botanicals, USB-C powered (adapter included)      |
| **price**             | $245.00 (we convert to cents for the database)                                                  |
| **dimensions**        | 8" W x 6" D x 10" H                                                                            |
| **weight**            | 2.5 lbs                                                                                        |
| **materials**         | Wood, resin, LED lights, natural moss, dried flowers                                            |
| **power_supply**      | USB-C (adapter included)                                                                        |
| **care_instructions** | Dust gently with soft brush, Keep away from direct sunlight                                     |
| **shipping_details**  | Ships within 3-5 business days, Insured shipping included                                       |
| **product_type**      | miniature                                                                                       |
| **series**            | Portals to Peace                                                                                |
| **available**         | true                                                                                            |
| **quantity**          | 1                                                                                               |
| **featured**          | true                                                                                            |

### What You Write

#### title
The name of the piece. Your display name exactly as you want it shown.

#### headline
5-7 word tagline. Short, poetic, appears under the title.

#### story_card
The full story (2-8 paragraphs). This is the emotional heart. Write from the heart — the poetic voice you use naturally is perfect. See the brand guide for tone.

#### description
Short summary (2-3 sentences). Used in previews, search results, social shares.

#### features
List of notable features. Write them beautifully: "Softly illuminated by warm LED glow" not "LED lights."

#### price
Price in dollars — we convert to cents for the database. $245.00 becomes 24500 on our end.

#### dimensions
Physical size. Format: W x D x H in inches (e.g. 8" W x 6" D x 10" H).

#### weight
For shipping. In pounds, e.g. "2.5 lbs."

#### materials
What it's made of. List each material.

#### power_supply
How it's powered. e.g. "USB-C (adapter included)" or "Battery (included)" or leave empty.

#### care_instructions
How to maintain it. List each care step.

#### shipping_details
Shipping info — timeframe, packaging notes, insurance.

#### artist_note
Optional personal note. Brief, from the heart. "This piece was inspired by..."

### What You Choose

#### product_type
Pick one: `miniature`, `printable`, or `storybook`.

#### series
Pick one or none: `Portals to Peace`, `Book Nooks`, `Story Lofts`, `Seasonal`, `Limited Edition`. New series names you use will automatically appear on the website.

#### available
`true` or `false`. Set to false when sold (this also happens automatically when purchased).

#### quantity
A number. 1 for one-of-a-kind, 0 for sold out, higher for editions.

#### featured
`true` or `false`. Featured products appear on the homepage carousel.

### What We Handle (Don't Worry About These)

  - **slug** — URL-friendly version of the title (generated before product creation, never changes)
  - **sku** — Unique product ID (auto-generated)
  - **seo_title / seo_description** — Search engine titles (we write these)
  - **stripe_product_id / stripe_price_id** — Stripe catalog links (auto-populated)
  - **thumbnail / images** — CDN URLs for photos (we upload and optimize)
  - **homepage_theme** — Dynamic homepage color/mood settings (we configure)

### Photo Requirements

#### How Many

  - **Minimum**: 7 photos per product
  - **Ideal**: 10-15 photos per product
  - **Required**: 1 clear "hero" shot for product grids

#### What to Capture

| Shot Type     | Description                                                  | Count |
| ------------- | ------------------------------------------------------------ | ----- |
| **Hero**      | Clean, well-lit front view. This is the thumbnail.           | 1     |
| **Angles**    | Front, back, sides, top-down                                 | 3-4   |
| **Details**   | Close-ups of special features, textures, tiny details        | 2-3   |
| **Lighting**  | Each lighting mode (on/off, warm/cool/candle)                | 2-3   |
| **Scale**     | Next to a common object (book, hand, mug) for size reference | 1     |
| **Lifestyle** | On a bookshelf, desk, or in its intended setting             | 1-2   |

#### Videos and GIFs

You can also include short videos and GIFs for your products. These appear in the gallery alongside photos.

  - **Videos**: Short clips showing lighting modes, detail reveals, or the piece in its setting (30-60 seconds ideal)
  - **GIFs**: Short animations showing a detail or lighting transition
  - **YouTube**: If you have a longer video on YouTube, we can embed it on the product page

Just send these along with your photos — we handle the formatting and upload.

#### Photo Tips

  - **Natural lighting** works best for detail shots
  - **Consistent background** — neutral/cream preferred
  - **No blur** — use a tripod or steady surface
  - **No frame numbers or timestamps visible**
  - **Highest resolution your camera allows** — we'll optimize for web
  - **Landscape AND portrait** orientations both welcome (we crop to 4:5)

#### File Delivery

Upload photos to the shared Google Drive folder or send via the admin UI. We handle:
  - Cropping and resizing (to 4:5 portrait via Cloudinary)
  - Converting to WebP format
  - Compressing for web performance
  - Uploading to CDN (Cloudflare R2 at `cdn.everlastingsbyemaline.com`)

### How the Admin UI Works

  1. Go to `everlastingsbyemaline.com/admin`
  2. Log in with your email and password
  3. Click "New Product"
  4. Fill in the form fields (they match the fields above)
  5. Upload photos directly in the form
  6. Click "Save" — the product goes live immediately
  7. Use "Preview" to see how it looks before publishing

To edit an existing product: find it in the product list, click "Edit", make changes, save.

To mark something sold manually: edit the product, set available to false, save.

### Quick Reference: What You Provide vs What We Handle

| You Provide                         | We Handle                       |
| ----------------------------------- | ------------------------------- |
| Title, headline, story card         | URL slug, SKU                   |
| Description, features               | SEO title and description       |
| Price (in dollars, we convert)      | Stripe product/price creation   |
| Dimensions, weight, materials       | Image optimization + CDN upload |
| Care instructions, shipping details | Homepage theme configuration    |
| Photos (7-15 per product)           | Responsive image sizing         |
| Series and product type selection   | Filter/search indexing          |
| Featured flag                       | Homepage carousel placement     |

---

## For AI Assistants (Creation Protocol)

This protocol enables any AI assistant to create a complete product entry — from gathering details to uploading images to a live, purchasable product page.

**End result**: Client describes a product → AI handles everything → client gets a permalink to review immediately.

### Step 0: Generate Slug

**Do this FIRST, before uploading any images.** The slug is needed for image file paths.

  ```
  slug = title.toLowerCase().replaceAll(' ', '-')
  Example: "The Sunkeeper" → "the-sunkeeper"
  ```

The slug is:
  - Used in image paths: `/products/the-sunkeeper/hero-the-sunkeeper.webp`
  - Used in URLs: `/product/the-sunkeeper`
  - Immutable after creation (never changes)
  - Unique (API returns 409 if slug already exists)

### Step 1: Gather Product Details

Ask the client for all required fields:

**Required**:
  - `title` — name of the piece
  - `headline` — 5-7 word tagline
  - `story_card` — 2-8 paragraphs, poetic (see BRAND.md for voice)
  - `description` — 2-3 sentence summary
  - `features` — array of feature strings (write beautifully)
  - `price` — in cents ($245 = 24500)
  - `product_type` — `miniature`, `printable`, or `storybook`

**Optional**:
  - `dimensions`, `weight`, `materials`, `power_supply`, `care_instructions`, `shipping_details`
  - `series` — "Portals to Peace", "Book Nooks", "Story Lofts", "Seasonal", "Limited Edition"
  - `available` (default: true), `quantity` (default: 1), `featured` (default: false)
  - `artist_note` — brief personal note

**Auto-generated (don't set)**:
  - `sku` — auto-generated by database
  - `stripe_product_id`, `stripe_price_id` — auto-populated by webhook

### Validation Checklist (Before Submission)

Verify before calling `POST /api/products`:
  - [ ] All required fields present and non-empty
  - [ ] `price` is a positive integer in cents
  - [ ] `images` array has at least 7 items
  - [ ] Exactly 1 hero image (filename starts with `hero-`)
  - [ ] `thumbnail` URL is set
  - [ ] At least 5 gallery images (filename starts with `gallery-`)
  - [ ] `slug` is set (generated from title in Step 0)
  - [ ] `title` and `description` are not empty strings

### Step 2: Process Images

#### Image Roles

| Role                          | Filename                 | Purpose                                |
| ----------------------------- | ------------------------ | -------------------------------------- |
| hero                          | `hero-{slug}.webp`       | Main product image                     |
| gallery-01 through gallery-15 | `gallery-{slug}-01.webp` | Gallery images                         |
| thumbnail                     | `thumbnail-{slug}.webp`  | Shop grid thumbnail (600px)            |
| video-01                      | `video-{slug}-01.mp4`    | Product video (skip Cloudinary)        |
| detail-01                     | `detail-{slug}-01.gif`   | Detail animation GIF (skip Cloudinary) |

#### Upload via API (Recommended)

The API endpoint handles Cloudinary transform internally:

  ```bash
  curl -X POST "https://everlastingsbyemaline.com/api/upload" \
    -H "Authorization: Bearer PRODUCT_API_KEY" \
    -F "file=@/path/to/raw-image.jpg" \
    -F "slug=the-sunkeeper" \
    -F "role=hero"
  # Returns: { "url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/hero-the-sunkeeper.webp" }
  ```

For videos and GIFs — skip Cloudinary:

  ```bash
  curl -X POST "https://everlastingsbyemaline.com/api/upload" \
    -H "Authorization: Bearer PRODUCT_API_KEY" \
    -F "file=@video.mp4" \
    -F "slug=the-sunkeeper" \
    -F "role=video-01" \
    -F "skip_transform=true"
  ```

#### Manual Pipeline (if API endpoint is unavailable)

  ```bash
  # 1. Upload to Cloudinary
  curl -X POST "https://api.cloudinary.com/v1_1/CLOUD_NAME/image/upload" \
    -u "API_KEY:API_SECRET" \
    -F "file=@/path/to/raw-image.jpg"

  # 2. Download transformed (4:5, WebP, compressed)
  curl -o "hero-the-sunkeeper.webp" \
    "https://res.cloudinary.com/CLOUD_NAME/image/upload/c_fill,ar_4:5,w_1200,f_webp,q_auto,g_auto/PUBLIC_ID"
  # For thumbnails: use w_600 instead of w_1200

  # 3. Upload to R2 via API
  curl -X POST "https://everlastingsbyemaline.com/api/upload" \
    -H "Authorization: Bearer PRODUCT_API_KEY" \
    -F "file=@hero-the-sunkeeper.webp" \
    -F "slug=the-sunkeeper" \
    -F "role=hero"

  # 4. Delete from Cloudinary (stay on free tier)
  curl -X POST "https://api.cloudinary.com/v1_1/CLOUD_NAME/image/destroy" \
    -u "API_KEY:API_SECRET" \
    -d "public_id=PUBLIC_ID"
  ```

### Step 3: Create Product

After all images are uploaded and you have CDN URLs:

  ```bash
  curl -X POST "https://everlastingsbyemaline.com/api/products" \
    -H "Authorization: Bearer PRODUCT_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "The Sunkeeper",
      "slug": "the-sunkeeper",
      "headline": "A garden where time stands still",
      "story_card": "The Sunkeeper stands watch...",
      "description": "Handcrafted miniature garden scene with warm LED lighting.",
      "features": ["Warm LED glow with 3 modes", "Hand-placed dried botanicals"],
      "price": 24500,
      "product_type": "miniature",
      "series": "Portals to Peace",
      "images": [
        {"url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/hero-the-sunkeeper.webp", "alt": "Front view"},
        {"url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/gallery-the-sunkeeper-01.webp", "alt": "Side angle"},
        {"url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/gallery-the-sunkeeper-02.webp", "alt": "Detail"}
      ],
      "thumbnail": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/thumbnail-the-sunkeeper.webp",
      "seo_title": "The Sunkeeper | Everlastings by Emaline",
      "seo_description": "Handcrafted miniature garden scene with warm LED lighting."
    }'
  ```

**Response**: `{ "success": true, "product": { "id": "...", "slug": "the-sunkeeper", ... } }`

The database webhook automatically:
  1. Fires webhook to `/api/stripe-sync`
  2. Creates Stripe Product + Price
  3. Writes `stripe_product_id` + `stripe_price_id` back to the record

### Step 4: Verify

  1. **Check permalink**: `https://everlastingsbyemaline.com/product/{slug}`
  2. **Check shop page**: Product should appear in grid
  3. **Check Stripe Dashboard**: Product + Price should exist
  4. **Share permalink with client** for immediate review

### Editing a Product

  ```bash
  # Update non-price fields
  curl -X PUT "https://everlastingsbyemaline.com/api/products?id=PRODUCT_UUID" \
    -H "Authorization: Bearer PRODUCT_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"headline": "Updated tagline", "featured": false}'

  # Update price (automatically archives old Stripe Price, creates new one)
  curl -X PUT "https://everlastingsbyemaline.com/api/products?id=PRODUCT_UUID" \
    -H "Authorization: Bearer PRODUCT_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"price": 29500}'
  ```

### Marking as Sold

  ```bash
  curl -X PUT "https://everlastingsbyemaline.com/api/products?id=PRODUCT_UUID" \
    -H "Authorization: Bearer PRODUCT_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"available": false, "quantity": 0}'
  ```

This happens automatically on customer purchase. Manual marking only if Emy sells outside the website.

### Error Handling Rules

  1. **Image upload failure**: Retry once. If second attempt fails, **STOP**. Do not proceed to product creation with missing images.
  2. **Product creation failure**: Do **NOT** retry blindly. Check the error:
     - 409: slug conflict (product with that title already exists)
     - 400: missing required fields or validation failure
     - 401: wrong or missing `PRODUCT_API_KEY`
  3. **Stripe sync**: Automatic via webhook. If `stripe_product_id` is null after 30 seconds, check Supabase logs.
  4. **Sequential dependency**: Do not skip steps. Do not proceed if current step fails.
  5. **Rollback**: If product created but images incomplete, set `available = false` immediately.

### API Quick Reference

| Action         | Method | Endpoint                |
| -------------- | ------ | ----------------------- |
| Create product | POST   | `/api/products`         |
| Update product | PUT    | `/api/products?id=UUID` |
| Get product    | GET    | `/api/products?slug=SLUG` |
| Upload image   | POST   | `/api/upload`           |
| Auth header    | —      | `Authorization: Bearer PRODUCT_API_KEY` |

---

*Questions? Ask in the group chat or email Sean at sean@august.style*
