# Product Protocol — Everlastings by Emaline

**Created**: 2026-04-12
**Updated**: 2026-05-06 — v1.4.5: added Custom GPT setup walkthrough; agentic creation protocol now uses `POST /api/products?sync=true` so Stripe IDs are returned in the response inline; clarified that `materials`, `features`, `care_instructions`, and `shipping_details` are arrays of strings on the API surface; added note about `vercel curl` exit-code-3-on-success when using preview deployments.
**Previous**: 2026-05-02 — v1.4.3: corrected gallery filename pattern to match the upload endpoint output (`gallery-NN-{slug}` not `gallery-{slug}-NN`); added `gif-NN` role; noted that `/api/products` and `/api/upload` accept either `PRODUCT_API_KEY` (curl/AI) **or** a Supabase JWT (admin UI signed-in user) on the `Authorization: Bearer` header.

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
What it's made of. List each material as a separate item — the form lets you add one at a time. (Behind the scenes, the API expects an array of strings, e.g. `["wood", "resin", "natural moss"]`. The Custom GPT Assistant handles this conversion automatically.)

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

### Custom GPT Setup (one-time, by Sean)

This section is the setup walkthrough Sean follows once to create the **Everlastings Product Assistant** GPT in ChatGPT and connect it to the live API. After this is done, Emy gets a direct link to the GPT and never needs to touch the setup again. If the API key rotates or the API base URL changes, Sean revisits this section.

**What a Custom GPT is, in plain terms.** A Custom GPT is a version of ChatGPT that has been pre-configured with a specific personality, set of instructions, and (optionally) the ability to call external APIs. It lives inside your ChatGPT account, looks and feels like a normal ChatGPT conversation, but knows it's specifically helping with Everlastings products. The "calling APIs" part is what lets it actually create real products on the website.

**What you need before starting.** The values below all already exist; this is a checklist of what to have open.

  - A ChatGPT account with **ChatGPT Plus** (or Team / Enterprise). Custom GPTs require a paid plan.
  - The **production `PRODUCT_API_KEY`** — found in Vercel → Project → Settings → Environment Variables → `PRODUCT_API_KEY` (Production scope). Do not use the preview value, and do not paste it anywhere except step 6 below.
  - The **production API base URL**: `https://everlastingsbyemaline.com`.
  - The **OpenAPI schema** for the GPT to import — provided inline in step 5.

**Step-by-step.**

  1. Go to [chat.openai.com/gpts/editor](https://chat.openai.com/gpts/editor) and click **Create**. Choose the **Configure** tab (not the chat-based "Create" wizard) so you can paste structured config directly.
  2. **Name**: `Everlastings Product Assistant`. **Description**: `Helps Emy add new handcrafted miniature products to everlastingsbyemaline.com — accepts photos and casual descriptions, walks through a preview, and creates the product on confirmation.`
  3. **Profile picture**: upload the small Everlastings emblem from `assets/favicon/` (or any branded square image). Optional but makes it identifiable in the sidebar.
  4. **Instructions** (the system prompt). Paste the following:

     ```
     You are the Everlastings Product Assistant. Your only job is to help Emy add new handcrafted miniature products to everlastingsbyemaline.com.

     Workflow:
     1. Greet warmly. Ask Emy what she wants to add today.
     2. Collect the product details conversationally. Required fields: title, headline (5–7 word tagline), story_card (2–8 poetic paragraphs), description (2–3 sentence summary), features (list), price in dollars, product_type (miniature / printable / storybook). Optional: dimensions, weight, materials (list), power_supply, care_instructions (list), shipping_details (list), series (Portals to Peace / Book Nooks / Story Lofts / Seasonal / Limited Edition / new), available, quantity, featured, artist_note.
     3. Ask for photos. Need at least 7 total: 1 hero, 1 thumbnail, at least 5 gallery. Drag-and-drop into the chat is fine. Upload each one via the `uploadImage` action with the right `role` (`hero`, `thumbnail`, `gallery-01` … `gallery-15`, `video-01`–`05`, `gif-01`–`05`, `detail-01`–`05`). Use `skip_transform=true` for videos and GIFs. Use the slug derived from the title.
     4. Show Emy a clean preview of the product before creating it: title, price, headline, all photo URLs grouped by role. Ask: "Look right?"
     5. On confirmation, call `createProduct` with `sync=true` so Stripe IDs come back inline. Convert `materials`, `features`, `care_instructions`, `shipping_details` to arrays of strings before sending.
     6. After success, give Emy the live product link: `https://everlastingsbyemaline.com/product/{slug}`. Note the new Stripe IDs in passing.

     Rules:
     - Never create a product without showing the preview first.
     - Never set a price different from what Emy said. If she says "$245", that's `24500` cents in the API call — show "$245" to her, never the integer.
     - Never proceed with fewer than 7 photos. Stop and ask.
     - Never edit existing products — direct her to the admin UI for edits.
     - Never expose API keys, server URLs, or technical details unless she explicitly asks for them.
     - On 409 Conflict (slug taken), suggest a new title. On 400, tell her exactly which field is missing in plain language. On 401, stop and tell her "the connection key needs Sean's attention."
     ```

  5. **Knowledge files**: optional. The brand voice and tone are already encoded in the instructions. If you want the GPT to write more in Emy's voice, upload `assets/docs/BRAND.md` here.
  6. **Capabilities**: enable **Web Browsing** (off is fine), **DALL·E** (off — Emy provides photos), **Code Interpreter** (on, so it can normalize/inspect uploaded images if needed).
  7. **Actions**: click **Create new action**. Set the **Authentication** to:
     - Type: **API Key**
     - API Key: paste the production `PRODUCT_API_KEY`
     - Auth Type: **Bearer**
  8. **Schema**: paste the OpenAPI schema below. This tells the GPT exactly which two endpoints it can call and the shape of each.

     ```yaml
     openapi: 3.1.0
     info:
       title: Everlastings Product API
       description: Endpoints for creating products and uploading product images on everlastingsbyemaline.com.
       version: 1.0.0
     servers:
       - url: https://everlastingsbyemaline.com
     paths:
       /api/upload:
         post:
           operationId: uploadImage
           summary: Upload a product image (or video / GIF). Cloudinary transforms images to 4:5 WebP automatically; videos and GIFs pass through with skip_transform=true.
           requestBody:
             required: true
             content:
               multipart/form-data:
                 schema:
                   type: object
                   required: [file, slug, role]
                   properties:
                     file:
                       type: string
                       format: binary
                     slug:
                       type: string
                     role:
                       type: string
                       description: One of hero, thumbnail, gallery-01..gallery-15, video-01..video-05, detail-01..detail-05, gif-01..gif-05.
                     skip_transform:
                       type: string
                       description: Set to "true" to skip Cloudinary transforms (videos, GIFs).
           responses:
             '200':
               description: Upload succeeded.
               content:
                 application/json:
                   schema:
                     type: object
                     properties:
                       url:
                         type: string
                       filename:
                         type: string
       /api/products:
         post:
           operationId: createProduct
           summary: Create a new product. Pass sync=true to receive Stripe product/price IDs in the response.
           parameters:
             - in: query
               name: sync
               schema:
                 type: string
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
                     features:
                       type: array
                       items: { type: string }
                     price:
                       type: integer
                       description: Price in cents.
                     dimensions: { type: string }
                     weight: { type: string }
                     materials:
                       type: array
                       items: { type: string }
                     power_supply: { type: string }
                     care_instructions:
                       type: array
                       items: { type: string }
                     shipping_details:
                       type: array
                       items: { type: string }
                     product_type:
                       type: string
                       enum: [miniature, printable, storybook]
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
     ```

  9. **Privacy policy URL**: link to `https://everlastingsbyemaline.com/privacy.html`.
  10. **Save** the GPT. Choose **Only me** for the share setting (Emy gets the link from Sean — it must not be public, since it has a live API key behind it).
  11. **End-to-end test before handing off**:
      - In a fresh chat with the new GPT, say: *"Add a quick test product. Title: Setup Smoke Test. Price: $1. Headline: setup smoke test. Story: setup smoke test. Description: setup smoke test."*
      - Drag in 7 throwaway images (any JPGs or PNGs).
      - Confirm the GPT walks through preview → calls `createProduct` with `sync=true` → returns a `prod_…` Stripe ID inline.
      - Visit `https://everlastingsbyemaline.com/product/setup-smoke-test` in a private window — page should render.
      - Archive the test product immediately: in Stripe dashboard archive `prod_…`; in Supabase Studio set the row's `available = false` (or delete it).
  12. **Hand-off**: send Emy the GPT's share link. Bookmark it for her in her ChatGPT sidebar if you have access. Add a note to her welcome doc (or text her) saying the link goes only into ChatGPT; nowhere else.

**Maintenance.** If `PRODUCT_API_KEY` is rotated (per `EVERLASTINGS_STORE.md` § Post-Launch Operations), Sean repeats step 7 with the new value — nothing else changes. If the API base URL changes, repeat step 8 with the updated `servers:` URL.

**Cost.** Free, beyond Sean's existing ChatGPT Plus subscription. The GPT itself costs nothing to host; each conversation Emy has consumes her ChatGPT Plus quota normally.

---

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
  - `dimensions` (string), `weight` (string), `materials` (array of strings), `power_supply` (string), `care_instructions` (array of strings), `shipping_details` (array of strings)
  - `features` is also an array of strings
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

| Role                          | Filename                 | Purpose                                 |
| ----------------------------- | ------------------------ | --------------------------------------- |
| hero                          | `hero-{slug}.webp`       | Main product image                      |
| thumbnail                     | `thumbnail-{slug}.webp`  | Shop grid thumbnail (600px)             |
| gallery-01 through gallery-15 | `gallery-NN-{slug}.webp` | Gallery images (NN = 01–15)             |
| video-01 through video-05     | `video-NN-{slug}.mp4`    | Product videos (skip Cloudinary)        |
| detail-01 through detail-05   | `detail-NN-{slug}.{ext}` | Detail close-ups                        |
| gif-01 through gif-05         | `gif-NN-{slug}.gif`      | Detail animation GIFs (skip Cloudinary) |

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

After all images are uploaded and you have CDN URLs. Use `?sync=true` so Stripe IDs come back in the create response — this is the recommended path for any agent-driven seeding.

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
      "materials": ["Wood", "resin", "natural moss", "dried flowers"],
      "care_instructions": ["Dust gently with a soft brush", "Keep away from direct sunlight"],
      "shipping_details": ["Ships within 3-5 business days", "Insured shipping included"],
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

**Response (with `?sync=true`)**:

  ```json
  {
    "success": true,
    "product": { "id": "...", "slug": "the-sunkeeper", ... },
    "stripe_sync": {
      "success": true,
      "no_op": false,
      "stripe_product_id": "prod_...",
      "stripe_price_id": "price_..."
    }
  }
  ```

The shared sync helper is idempotent: the Supabase database webhook still fires after the inline path completes, but it sees the row already has `stripe_product_id` and returns immediately as a no-op.

If you call `POST /api/products` *without* `?sync=true`, the response omits the `stripe_sync` block and the database webhook handles Stripe creation asynchronously (the standard admin-UI / Studio path).

**Note on test/preview environments**: the Supabase database webhook is configured to point at the production URL, so test-mode seeding against a preview deployment will *not* receive automatic Stripe sync. Always use `?sync=true` when `BASE_URL` is a preview URL.

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
  3. **Stripe sync**: Use `?sync=true` for agent-driven creation so the response includes Stripe IDs immediately. If you used the default (non-`?sync=true`) path and `stripe_product_id` is null after 30 seconds, check Supabase logs — the database webhook may not be reaching the target environment (this is expected on preview URLs; production routing is direct).
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

> **Note on `vercel curl` and shell scripts**: when targeting a protection-enabled preview deployment via `npx vercel curl --deployment <url> -- ...`, the underlying `curl` exits with code `3` ("URL rejected: No host part in the URL") even on a successful response. The JSON body still delivers correctly. Scripts using `set -e` should drop it (use `set -uo pipefail` instead) or pipe through `|| true` where exit code is checked.

---

*Questions? Email Sean at sean@august.style*