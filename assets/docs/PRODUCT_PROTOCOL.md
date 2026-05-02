# Product Protocol — Everlastings by Emaline

**Created**: 2026-04-12
**Updated**: 2026-05-02 — v1.4.3: corrected gallery filename pattern to match the upload endpoint output (`gallery-NN-{slug}` not `gallery-{slug}-NN`); added `gif-NN` role; noted that `/api/products` and `/api/upload` accept either `PRODUCT_API_KEY` (curl/AI) **or** a Supabase JWT (admin UI signed-in user) on the `Authorization: Bearer` header.
**Previous**: 2026-04-16 — v1.4.0: no schema changes; `shipping_details` remains a free-text array displayed on the product page. Admin UI now includes an Orders tab for shipping fulfillment (see `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md` > Admin Orders Tab).

---

## For Emy (Client Guide)

### How It Works

Every product on the website is stored in a database table (Supabase). You can add products three ways:

  1. **Admin UI** (simplest manual option) — Fill out a form on the website at `/admin`
  2. **Supabase Studio** (free web app; good for quick updates) — Edit the database table directly
  3. **AI assistant** (most powerful) — Tell ChatGPT or Claude the product details and it creates the entry via API

All three create the same database row. When you save a product, a behind-the-scenes script automatically creates it in Stripe too — so it becomes purchasable immediately.

### Complete Example: The Sunkeeper

| Field                 | Value                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------ |
| **title**             | The Sunkeeper                                                                              |
| **headline**          | A garden where time stands still                                                           |
| **story_card**        | *The Sunkeeper stands watch ...* (2-8 paragraphs)                                          |
| **description**       | Handcrafted miniature garden scene with warm LED lighting and hand-placed botanicals.      |
| **features**          | Warm LED glow with 3 modes, Hand-placed dried botanicals, USB-C powered (adapter included) |
| **price**             | $245.00 (we convert to cents for the database)                                             |
| **dimensions**        | 8" W x 6" D x 10" H                                                                        |
| **weight**            | 2.5 lbs                                                                                    |
| **materials**         | Wood, resin, LED lights, natural moss, dried flowers                                       |
| **power_supply**      | USB-C (adapter included)                                                                   |
| **care_instructions** | Dust gently with soft brush, Keep away from direct sunlight                                |
| **shipping_details**  | Ships within 3-5 business days, Insured shipping included                                  |
| **product_type**      | miniature                                                                                  |
| **series**            | Portals to Peace                                                                           |
| **available**         | true                                                                                       |
| **quantity**          | 1                                                                                          |
| **featured**          | true                                                                                       |

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

### Using Your AI Product Assistant (optional)

If filling out the form feels slow, or if you want to think through a product description conversationally, there's a second path: a **Custom GPT** inside your ChatGPT called **"Everlastings Product Assistant."** It does exactly what the admin form does, but you talk to it instead of typing into boxes.

**How to use it:**

  1. Open ChatGPT. In the sidebar under "My GPTs," click **Everlastings Product Assistant**. (Sean will have set this up for you once and sent the direct link — bookmark it.)
  2. Say something like: *"I want to add a new product. It's called The Sunkeeper, it's $245, here are the photos and the story..."*
  3. Drag and drop your product photos into the chat (7 minimum — 1 hero, 1 thumbnail, at least 5 gallery).
  4. Paste or type the product details. You can write casually — the Assistant will pull out the fields. If anything is missing (e.g., weight), it will ask.
  5. The Assistant shows you a preview of what it will create. **Review it carefully** — this is your chance to catch typos or wrong prices before the product goes live.
  6. Say "looks good" or "go ahead" — the Assistant creates the product. It will give you a link to the live product page within ~10 seconds.

**What the Assistant will NOT do:**
  - It won't create a product without showing you the preview first.
  - It won't set a price different from what you said.
  - It won't upload fewer than 7 photos (it will stop and ask for more).
  - It won't change existing products — for edits, use the admin UI.

**If something goes wrong:**
  - "Error 409" means a product with that title already exists. Rename it (e.g., "The Sunkeeper II") and try again.
  - "Error 400" means something's missing from the product details. The Assistant will tell you what.
  - For anything else, take a screenshot and text Sean.

**About privacy + security**: the Assistant runs in your ChatGPT account, but the connection to the website uses a private key that only Sean manages — you never see it or type it. The photos and text you share only go to the Everlastings website (not shared anywhere else). Sean can disable or rotate the key instantly if anything ever feels off.

**Quick note on "test mode"**: your Assistant always creates real, live products. If Sean ever asks you to test something without it going live, he'll use a separate test tool — you don't need to worry about a test-vs-real setting.

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

## For Agentic AI / Sean's Programmatic Use (Creation Protocol)

> **Audience**: Claude Code, Cursor, custom automation scripts, or Sean doing test-data seeding. This is the shell-based curl protocol — it requires an AI that can execute HTTP requests directly (Claude Code, ChatGPT-with-code-interpreter, custom scripts). For Emy's ChatGPT web workflow, see [Using Your AI Product Assistant](#using-your-ai-product-assistant-optional) above — the Custom GPT wraps these same API calls in a conversational interface.

This protocol enables any AI assistant with HTTP + file capabilities to create a complete product entry — from gathering details to uploading images to a live, purchasable product page.

**End result**: Client describes a product → agentic AI handles everything → client gets a permalink to review immediately.

### Base URL Convention

All curl commands below use `$BASE_URL` for the API host. Set it once at the start of the session based on which environment the AI is targeting:

| Use case                                      | `BASE_URL` value                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| Real product creation (default)               | `https://everlastingsbyemaline.com`                                                  |
| Test/dev product seeding (preview deployment) | `https://everlastings-git-dev-{team}.vercel.app` (or any `*.vercel.app` preview URL) |
| Local testing (`vercel dev`)                  | `http://localhost:3000`                                                              |

```bash
# Production (default)
export BASE_URL="https://everlastingsbyemaline.com"

# Test on the dev branch's preview deployment
export BASE_URL="https://everlastings-git-dev-team.vercel.app"
```

When `BASE_URL` points to a preview URL, the API automatically tags created rows with `is_test = true` and uploads images under R2's `test/` namespace (CDN URLs become `https://cdn.everlastingsbyemaline.com/test/{slug}/test_{role}-{slug}.webp`). No manual cleanup is needed before launch — see the implementation guide's [Dev/Test Data Hygiene](archive/v1_4/v1_4_3_IMPLEMENT.md#devtest-data-hygiene-reference) section.

`PRODUCT_API_KEY` differs per environment too — use the test value from `.env.local` when `BASE_URL` is a preview URL, and the live value (managed by Sean) only for production seeding.

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

The upload endpoint composes the filename as `{role}-{slug}.{ext}` (e.g. role `gallery-01` + slug `the-sunkeeper` becomes `gallery-01-the-sunkeeper.webp`). For test/preview environments the prefix `test_` is added (see Base URL Convention).

| Role                          | Filename                       | Purpose                                |
| ----------------------------- | ------------------------------ | -------------------------------------- |
| hero                          | `hero-{slug}.webp`             | Main product image                     |
| thumbnail                     | `thumbnail-{slug}.webp`        | Shop grid thumbnail (600px)            |
| gallery-01 through gallery-15 | `gallery-NN-{slug}.webp`       | Gallery images (NN = 01–15)            |
| video-01 through video-05     | `video-NN-{slug}.mp4`          | Product videos (skip Cloudinary)       |
| detail-01 through detail-05   | `detail-NN-{slug}.{ext}`       | Detail close-ups                       |
| gif-01 through gif-05         | `gif-NN-{slug}.gif`            | Detail animation GIFs (skip Cloudinary)|

#### Upload via API (Recommended)

The API endpoint handles Cloudinary transform internally:

  ```bash
  curl -X POST "$BASE_URL/api/upload" \
    -H "Authorization: Bearer PRODUCT_API_KEY" \
    -F "file=@/path/to/raw-image.jpg" \
    -F "slug=the-sunkeeper" \
    -F "role=hero"
  # Returns: { "url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/hero-the-sunkeeper.webp" }
  ```

For videos and GIFs — skip Cloudinary:

  ```bash
  curl -X POST "$BASE_URL/api/upload" \
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
  curl -X POST "$BASE_URL/api/upload" \
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
  curl -X POST "$BASE_URL/api/products" \
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
        {"url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/gallery-01-the-sunkeeper.webp", "alt": "Side angle"},
        {"url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/gallery-02-the-sunkeeper.webp", "alt": "Detail"}
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

  1. **Check permalink**: `$BASE_URL/product/{slug}` (production permalink for live products; preview URL for test seeding)
  2. **Check shop page**: Product should appear in grid (production reads filter `is_test = false`, so test products only appear on preview URLs)
  3. **Check Stripe Dashboard**: Product + Price should exist (test mode dashboard for preview, live mode for production)
  4. **Share permalink with client** for immediate review (only when seeding real products against production)

### Editing a Product

  ```bash
  # Update non-price fields
  curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" \
    -H "Authorization: Bearer PRODUCT_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"headline": "Updated tagline", "featured": false}'

  # Update price (automatically archives old Stripe Price, creates new one)
  curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" \
    -H "Authorization: Bearer PRODUCT_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"price": 29500}'
  ```

### Marking as Sold

  ```bash
  curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" \
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

| Action         | Method | Endpoint                                |
| -------------- | ------ | --------------------------------------- |
| Create product | POST   | `/api/products`                         |
| Update product | PUT    | `/api/products?id=UUID`                 |
| Get product    | GET    | `/api/products?slug=SLUG`               |
| Upload image   | POST   | `/api/upload`                           |
| Auth header    | —      | `Authorization: Bearer PRODUCT_API_KEY` |

> **Auth modes** (v1.4.3+): `/api/products` and `/api/upload` accept the `Authorization: Bearer` header in two flavors. Use `PRODUCT_API_KEY` for AI / curl / the Custom GPT (the value differs per environment — test in `.env.local`, live for production). The admin UI at `/admin` instead sends the signed-in user's Supabase JWT (`session.access_token`); the server falls back to `supabase.auth.getUser(jwt)` when the bearer token is not the API key. This means you do not need to (and must not) ship `PRODUCT_API_KEY` to the browser. Other endpoints (`/api/orders`, `/api/orders/:id`) only accept the JWT path.

---

*Questions? Email Sean at sean@august.style*