# Product Guide — Everlastings by Emaline

**For**: Emy (and G)
**Purpose**: How to add products to the website
**Created**: 2026-03-16
**Updated**: 2026-04-09 — v1.2: added photo aspect ratio, slug immutability, price clarification

---

## How It Works

Every product on the website is stored in a database table (Supabase). You can add products three ways:

  1. **Admin UI** (simplest manual option) — Fill out a form on the website at `/admin`
  2. **Supabase Studio** (free web app; good for quick updates) — Edit the database table directly
  3. **GPT skill** (most powerful; need to research MCP needs) — Tell ChatGPT the product details and it creates the entry via API
  4. **GPT create CSV** (might be easier than MCP but lacks easy updates) — Tell GPT to create CSV file for all table entries, then you upload 

All three create the same database row. When you save a product, a behind-the-scenes script automatically creates it in Stripe too — so it becomes purchasable immediately.

---

## Complete Example: The Sunkeeper

Here's what a full product entry looks like. Every field is explained below.

| Field                 | Value                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **title**             | The Sunkeeper                                                                                                           |
| **headline**          | A garden where time stands still                                                                                        |
| **story_card**        | *The Sunkeeper stands watch ...* (2-8 paragraphs)                                                                       |
| **description**       | Handcrafted miniature garden scene with warm LED lighting and hand-placed botanicals. A sanctuary of golden hour light. |
| **features**          | Warm LED glow with 3 modes, Hand-placed dried botanicals, USB-C powered (adapter included), Signed and numbered         |
| **price**             | 24500 (that's $245.00 — always in cents)                                                                                |
| **dimensions**        | 8" W x 6" D x 10" H                                                                                                     |
| **weight**            | 2.5 lbs                                                                                                                 |
| **materials**         | Wood, resin, LED lights, natural moss, dried flowers                                                                    |
| **power_supply**      | USB-C (adapter included)                                                                                                |
| **care_instructions** | Dust gently with soft brush, Keep away from direct sunlight, Do not submerge in water                                   |
| **shipping_details**  | Ships within 3-5 business days, Carefully packaged with custom foam insert, Insured shipping included                   |
| **product_type**      | miniature                                                                                                               |
| **series**            | Portals to Peace                                                                                                        |
| **available**         | true                                                                                                                    |
| **quantity**          | 1                                                                                                                       |
| **featured**          | true                                                                                                                    |

---

## Field-by-Field Explanations

### What You Write

| Field                 | What It Is                      | Tips                                                                                                                             |
| --------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **title**             | The name of the piece           | Your display name exactly as you want it shown                                                                                   |
| **headline**          | 5-7 word tagline                | Short, poetic, appears under the title                                                                                           |
| **story_card**        | The full story (2-8 paragraphs) | This is the emotional heart. Write from the heart — the poetic voice you use naturally is perfect. See the brand guide for tone. |
| **description**       | Short summary (2-3 sentences)   | Used in previews, search results, social shares                                                                                  |
| **features**          | List of notable features        | Write them beautifully: "Softly illuminated by warm LED glow" not "LED lights"                                                   |
| **price**             | Price in cents                  | $245.00 = 24500. Always multiply by 100.                                                                                         |
| **dimensions**        | Physical size                   | Format: W x D x H in inches                                                                                                      |
| **weight**            | For shipping                    | In pounds, e.g. "2.5 lbs"                                                                                                        |
| **materials**         | What it's made of               | List each material                                                                                                               |
| **power_supply**      | How it's powered                | e.g. "USB-C (adapter included)" or "Battery (included)" or leave empty                                                           |
| **care_instructions** | How to maintain it              | List each care step                                                                                                              |
| **shipping_details**  | Shipping info                   | Timeframe, packaging notes, insurance                                                                                            |
| **artist_note**       | Optional personal note          | Brief, from the heart. "This piece was inspired by..."                                                                           |

### What You Choose

| Field            | Options                                                                                        | Notes                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **product_type** | `miniature`, `printable`, `storybook`                                                          | Pick one                                                                             |
| **series**       | `Portals to Peace`, `Book Nooks`, `Story Lofts`, `Seasonal`, `Limited Edition`, or leave empty | Pick one or none. New series names you use will automatically appear on the website. |
| **available**    | `true` or `false`                                                                              | Set to false when sold (this also happens automatically when purchased)              |
| **quantity**     | A number                                                                                       | 1 for one-of-a-kind, 0 for sold out, higher for editions                             |
| **featured**     | `true` or `false`                                                                              | Featured products appear on the homepage carousel                                    |

### What We Handle (Don't Worry About These)

| Field                 | What It Is                                          |
| --------------------- | --------------------------------------------------- |
| **slug**              | URL-friendly version of the title (auto-generated, never changes)  |
| **sku**               | Unique product ID (auto-generated)                  |
| **seo_title**         | Search engine title (we write this)                 |
| **seo_description**   | Search engine description (we write this)           |
| **stripe_product_id** | Stripe catalog link (auto-populated)                |
| **stripe_price_id**   | Stripe price link (auto-populated)                  |
| **thumbnail**         | CDN URL for the grid image (we upload)              |
| **images**            | CDN URLs for all gallery photos (we upload)         |
| **homepage_theme**    | Dynamic homepage color/mood settings (we configure) |

---

## Photo Requirements

### Aspect Ratio

All product photos must be **4:5 portrait orientation**. This prevents messy grids on the shop page. We handle cropping if needed, but shooting in portrait helps.

### How Many

- **Minimum**: 7 photos per product
- **Ideal**: 10-15 photos per product
- **Required**: 1 clear "hero" shot for product grids

### What to Capture

| Shot Type     | Description                                                  | Count |
| ------------- | ------------------------------------------------------------ | ----- |
| **Hero**      | Clean, well-lit front view. This is the thumbnail.           | 1     |
| **Angles**    | Front, back, sides, top-down                                 | 3-4   |
| **Details**   | Close-ups of special features, textures, tiny details        | 2-3   |
| **Lighting**  | Each lighting mode (on/off, warm/cool/candle)                | 2-3   |
| **Scale**     | Next to a common object (book, hand, mug) for size reference | 1     |
| **Lifestyle** | On a bookshelf, desk, or in its intended setting             | 1-2   |

### Photo Tips

- **Natural lighting** works best for detail shots
- **Consistent background** — neutral/cream preferred
- **No blur** — use a tripod or steady surface
- **No frame numbers or timestamps visible**
- **Highest resolution your camera allows** — we'll optimize for web
- **Landscape AND portrait** orientations both welcome

### File Delivery

Upload photos to the shared Google Drive folder or send via the admin UI. We handle:
- Cropping and resizing
- Converting to WebP format
- Compressing for web performance
- Uploading to CDN (Cloudflare R2)

---

## How the Admin UI Works

1. Go to `everlastingsbyemaline.com/admin`
2. Log in with your email and password
3. Click "New Product"
4. Fill in the form fields (they match the fields above)
5. Upload photos directly in the form
6. Click "Save" — the product goes live immediately
7. Use "Preview" to see how it looks before publishing

To edit an existing product: find it in the product list, click "Edit", make changes, save.

To mark something sold manually: edit the product, set available to false, save.

---

## Quick Reference: What You Provide vs What We Handle

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

*Questions? Ask in the group chat or email Sean at sean@august.style*
