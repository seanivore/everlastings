# Product Creation Protocol — Everlastings by Emaline

**For**: AI assistants (ChatGPT, Claude, etc.) creating products on behalf of Emy
**Created**: 2026-04-09
**Adapted from**: 360-design ENTRY_SOP

---

## Overview

This protocol enables any AI assistant to create a complete product entry — from gathering details to uploading images to a live, purchasable product page — with zero friction for the client.

**End result**: Client describes a product → AI handles everything → client gets a permalink to review immediately.

---

## Step 1: Gather Product Details

Ask the client for all required fields. Use `PRODUCT_GUIDE.md` as reference.

### Required Fields

| Field            | Description                     | Example                               |
| ---------------- | ------------------------------- | ------------------------------------- |
| **title**        | Name of the piece               | The Sunkeeper                         |
| **headline**     | 5-7 word tagline                | A garden where time stands still      |
| **story_card**   | 2-8 paragraphs, poetic          | (see BRAND.md for voice)              |
| **description**  | 2-3 sentence summary            | Handcrafted miniature garden scene... |
| **features**     | Array of feature strings        | ["Warm LED glow with 3 modes", ...]   |
| **price**        | In cents ($245 = 24500)         | 24500                                 |
| **product_type** | miniature, printable, storybook | miniature                             |

### Optional Fields

| Field                 | Description                                 |
| --------------------- | ------------------------------------------- |
| **dimensions**        | e.g. "8\" W x 6\" D x 10\" H"               |
| **weight**            | e.g. "2.5 lbs"                              |
| **materials**         | Array: ["Wood", "resin", "LED lights", ...] |
| **power_supply**      | e.g. "USB-C (adapter included)"             |
| **care_instructions** | Array of care steps                         |
| **shipping_details**  | Array of shipping info                      |
| **series**            | "Portals to Peace", "Book Nooks", etc.      |
| **available**         | true (default)                              |
| **quantity**          | 1 (default)                                 |
| **featured**          | true/false for homepage carousel            |
| **artist_note**       | Brief personal note                         |

### Auto-Generated (don't set)

  - `slug` — generated from title by database trigger
  - `sku` — auto-generated
  - `stripe_product_id`, `stripe_price_id` — auto-populated by stripe-sync webhook

---

## Step 2: Process Images

### Requirements

  - **Minimum**: 7 photos per product
  - **Ideal**: 10-15 photos
  - **Aspect ratio**: 4:5 portrait (enforced by Cloudinary transform)
  - **Format**: WebP (converted by Cloudinary)

### Image Roles

| Role                          | Filename                 | Purpose                                    |
| ----------------------------- | ------------------------ | ------------------------------------------ |
| hero                          | `hero-{slug}.webp`       | Main product image, used as thumbnail base |
| gallery-01 through gallery-15 | `gallery-{slug}-01.webp` | Gallery images                             |
| thumbnail                     | `thumbnail-{slug}.webp`  | Shop grid thumbnail (smaller, 600px)       |
| video-01                      | `video-{slug}-01.mp4`    | Product video (skip Cloudinary)            |
| detail-01                     | `detail-{slug}-01.gif`   | Detail animation GIF (skip Cloudinary)     |

### Image Pipeline (Cloudinary → R2)

For each image:

  ```bash
  # 1. Upload to Cloudinary
  curl -X POST "https://api.cloudinary.com/v1_1/CLOUD_NAME/image/upload" \
    -u "API_KEY:API_SECRET" \
    -F "file=@/path/to/raw-image.jpg"
  # Returns: { "public_id": "abc123", ... }

  # 2. Download transformed image
  curl -o "hero-the-sunkeeper.webp" \
    "https://res.cloudinary.com/CLOUD_NAME/image/upload/c_fill,ar_4:5,w_1200,f_webp,q_auto,g_auto/abc123"

  # For thumbnails, use w_600 instead of w_1200:
  curl -o "thumbnail-the-sunkeeper.webp" \
    "https://res.cloudinary.com/CLOUD_NAME/image/upload/c_fill,ar_4:5,w_600,f_webp,q_auto,g_auto/abc123"

  # 3. Upload to R2 via API endpoint
  curl -X POST "https://everlastingsbyemaline.com/api/upload" \
    -H "Authorization: Bearer SUPABASE_SERVICE_KEY" \
    -F "file=@hero-the-sunkeeper.webp" \
    -F "slug=the-sunkeeper" \
    -F "role=hero"
  # Returns: { "url": "https://pub-xxx.r2.dev/products/the-sunkeeper/hero-the-sunkeeper.webp" }

  # 4. Delete from Cloudinary (stay on free tier)
  curl -X POST "https://api.cloudinary.com/v1_1/CLOUD_NAME/image/destroy" \
    -u "API_KEY:API_SECRET" \
    -d "public_id=abc123"
  ```

**Or use the API upload endpoint directly** — it handles Cloudinary transform internally:

  ```bash
  curl -X POST "https://everlastingsbyemaline.com/api/upload" \
    -H "Authorization: Bearer SUPABASE_SERVICE_KEY" \
    -F "file=@/path/to/raw-image.jpg" \
    -F "slug=the-sunkeeper" \
    -F "role=hero"
  # The endpoint handles: Cloudinary upload → transform → R2 upload → Cloudinary delete
  # Returns: { "url": "https://pub-xxx.r2.dev/products/the-sunkeeper/hero-the-sunkeeper.webp" }
  ```

**For videos and GIFs** — skip Cloudinary, upload directly:

  ```bash
  curl -X POST "https://everlastingsbyemaline.com/api/upload" \
    -H "Authorization: Bearer SUPABASE_SERVICE_KEY" \
    -F "file=@video.mp4" \
    -F "slug=the-sunkeeper" \
    -F "role=video-01" \
    -F "skip_transform=true"
  ```

### Sourcing Images

  - **Google Drive**: Download from client's shared folder manually
  - **Client upload**: Client sends files directly to AI
  - **Future**: Google Drive API integration for direct pull

---

## Step 3: Create Product

After all images are uploaded and you have CDN URLs:

  ```bash
  curl -X POST "https://everlastingsbyemaline.com/api/products" \
    -H "Authorization: Bearer SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "The Sunkeeper",
      "headline": "A garden where time stands still",
      "story_card": "The Sunkeeper stands watch over a garden...\n\n...",
      "description": "Handcrafted miniature garden scene with warm LED lighting.",
      "features": ["Warm LED glow with 3 modes", "Hand-placed dried botanicals", "USB-C powered"],
      "price": 24500,
      "dimensions": "8\" W x 6\" D x 10\" H",
      "weight": "2.5 lbs",
      "materials": ["Wood", "resin", "LED lights", "natural moss", "dried flowers"],
      "power_supply": "USB-C (adapter included)",
      "care_instructions": ["Dust gently with soft brush", "Keep away from direct sunlight"],
      "shipping_details": ["Ships within 3-5 business days", "Insured shipping included"],
      "product_type": "miniature",
      "series": "Portals to Peace",
      "available": true,
      "quantity": 1,
      "featured": true,
      "images": [
        {"url": "https://pub-xxx.r2.dev/products/the-sunkeeper/hero-the-sunkeeper.webp", "alt": "The Sunkeeper - front view"},
        {"url": "https://pub-xxx.r2.dev/products/the-sunkeeper/gallery-the-sunkeeper-01.webp", "alt": "Side angle"},
        {"url": "https://pub-xxx.r2.dev/products/the-sunkeeper/gallery-the-sunkeeper-02.webp", "alt": "Detail close-up"}
      ],
      "thumbnail": "https://pub-xxx.r2.dev/products/the-sunkeeper/thumbnail-the-sunkeeper.webp",
      "thumbnail_alt": "The Sunkeeper miniature garden",
      "media": [
        {"type": "video", "url": "https://pub-xxx.r2.dev/products/the-sunkeeper/video-the-sunkeeper-01.mp4", "caption": "LED lighting modes"}
      ],
      "seo_title": "The Sunkeeper | Everlastings by Emaline",
      "seo_description": "Handcrafted miniature garden scene with warm LED lighting and hand-placed botanicals.",
      "artist_note": "This piece was inspired by golden hour in my grandmother's garden."
    }'
  ```

**Response**: `{ "success": true, "product": { "id": "...", "slug": "the-sunkeeper", ... } }`

  The database webhook will automatically:
  1. Generate the slug from the title
  2. Fire a webhook to `/api/stripe-sync`
  3. Create a Stripe Product + Price
  4. Write `stripe_product_id` + `stripe_price_id` back to the record

---

## Step 4: Verify

  1. **Check permalink**: `https://everlastingsbyemaline.com/product/the-sunkeeper`
  2. **Check shop page**: Product should appear in grid
  3. **Check Stripe Dashboard**: Product + Price should exist
  4. **Share permalink with client** for immediate review

---

## Editing a Product

  ```bash
  # Update non-price fields (title, description, images, etc.)
  curl -X PUT "https://everlastingsbyemaline.com/api/products?id=PRODUCT_UUID" \
    -H "Authorization: Bearer SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"headline": "Updated tagline", "featured": false}'

  # Update price (automatically archives old Stripe Price, creates new one)
  curl -X PUT "https://everlastingsbyemaline.com/api/products?id=PRODUCT_UUID" \
    -H "Authorization: Bearer SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"price": 29500}'
  ```

**Important**: Stripe Prices are immutable. When you change a price, the API endpoint:
  1. Archives the old Stripe Price
  2. Creates a new Stripe Price
  3. Updates `stripe_price_id` in Supabase

This is handled automatically — just pass the new price.

---

## Marking as Sold

  ```bash
  curl -X PUT "https://everlastingsbyemaline.com/api/products?id=PRODUCT_UUID" \
    -H "Authorization: Bearer SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"available": false, "quantity": 0}'
  ```

Note: This happens automatically when a customer purchases via checkout. Manual marking is only needed if Emy sells outside the website.

---

## Quick Reference

| Action         | Method | Endpoint                                     |
| -------------- | ------ | -------------------------------------------- |
| Create product | POST   | `/api/products`                              |
| Update product | PUT    | `/api/products?id=UUID`                      |
| Get product    | GET    | `/api/products?slug=SLUG`                    |
| Upload image   | POST   | `/api/upload`                                |
| Auth header    | —      | `Authorization: Bearer SUPABASE_SERVICE_KEY` |

---
*This protocol is designed for AI assistants. For manual product entry, see `PRODUCT_GUIDE.md`.*