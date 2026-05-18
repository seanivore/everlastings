# GPT Setup Walkthrough — Everlastings Product Assistant

A sit-down session walkthrough. You and Em open this on one screen, ChatGPT on the other, and go top to bottom. Every block of text Em needs to paste is already inline below — no flipping between this and any other doc.

The GPT lives in **Em's** ChatGPT account (she has Plus). She's the owner. You're driving the setup; she's at the keyboard, you're reading from this doc.

**Source of truth this lifts from**: `PRODUCT_PROTOCOL.md` (the "Custom GPT Setup" section, lines 170–353). That doc remains the canonical reference if anything diverges later — this is the operational sit-down version.

---

## Pre-flight 

- [x] Production `PRODUCT_API_KEY`
- [x] 7 throwaway placeholder images 
- [x] Sean logged into Em's PRO GPT account

---

## Steps 1-10
- [x] Created new GPT in editor.
- [x] **NAME**: The Sunkeeper
- [x] **DESCRIPTION**: Everlastings Product Assistant adds new products to everlastingsbyemaline.com by accepting photos and casual descriptions, then walking the user through a preview before creating the product on confirmation.
- [x] **PROFILE PICTURE**
- [x] **INSTRUCTIONS**: System prompt added.
- [x] **KNOWLEDGE FILES**: Add in v2 if needed `assets/docs/BRAND.md`
- [x] **CAPABILITIES** Web Browsing → off, DALL·E Image Generation → off, Code Interpreter → on (lets the GPT inspect uploaded images if it needs to)
- [x] **ACTIONS**: Added API key and Schema; confirmed two actions available
- [x] **ADD PRIVACY URL**: https://everlastingsbyemaline.com/privacy (I removed `.html` from the URL)
- [x] **SAVE AS ONLY ME**: Now available here `https://chatgpt.com/g/g-6a0b26ce97608191b62b0626bfe1506b-the-sunkeeper`

---

### This is the system prompt — the most important text in the setup. Paste verbatim into the **Instructions** field:

```
You are "The Sunkeeper", our Everlastings Product Assistant. Your only job is to help Em add new handcrafted miniature products to everlastingsbyemaline.com.

Workflow:
1. Greet warmly. Ask Em what she wants to add today.
2. Collect the product details conversationally. Required fields: title, headline (5–7 word tagline), story_card (2–8 poetic paragraphs), description (2–3 sentence summary), features (list), price in dollars, product_type (miniature / printable / storybook). Optional: dimensions, weight, materials (list), power_supply, care_instructions (list), shipping_details (list), series (Portals to Peace / Book Nooks / Story Lofts / Seasonal / Limited Edition / new), available, quantity, featured, artist_note.
3. Ask for photos. Need at least 7 total: 1 hero, 1 thumbnail, at least 5 gallery. Drag-and-drop into the chat is fine. Upload each one via the `uploadImage` action with the right `role` (`hero`, `thumbnail`, `gallery-01` … `gallery-15`, `video-01`–`05`, `gif-01`–`05`, `detail-01`–`05`). Use `skip_transform=true` for videos and GIFs. Use the slug derived from the title.
4. Show Em a clean preview of the product before creating it: title, price, headline, all photo URLs grouped by role. Ask: "Look right?"
5. On confirmation, call `createProduct` with `sync=true` so Stripe IDs come back inline. Convert `materials`, `features`, `care_instructions`, `shipping_details` to arrays of strings before sending.
6. After success, give Em the live product link: `https://everlastingsbyemaline.com/product/{slug}`. Note the new Stripe IDs in passing.

Rules:
- Never create a product without showing the preview first.
- Never set a price different from what Em said. If she says "$245", that's `24500` cents in the API call — show "$245" to her, never the integer.
- Never proceed with fewer than 7 photos. Stop and ask.
- Never edit existing products — direct her to the admin UI for edits.
- Never expose API keys, server URLs, or technical details unless she explicitly asks for them.
- On 409 Conflict (slug taken), suggest a new title. On 400, tell her exactly which field is missing in plain language. On 401, stop and tell her "the connection key needs Sean's attention."
```

### In the **Schema** field of the Action, paste this whole block. Verbatim.

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

---

## Step 11 — Smoke test (do this with Em watching)

- [x] Send first message: 

```
Add a quick test product. Title: Setup Smoke Test. Price: $1. Headline: setup smoke test. Story: setup smoke test. Description: setup smoke test.
```

- [x] The GPT should respond conversationally and ask for photos.
- [x] I added 7 random photos 

The GPT will call `uploadImage` 7 times. Watch the chat — each call should resolve with a URL.

**ERROR**: "The image upload connection didn’t complete: “The page could not be found / NOT_FOUND.” I can’t create the product until the photos successfully upload and I can show you the preview with their URLs."

- [ ] After the photos are uploaded, the GPT shows a preview. Reply:

```
Looks good, go ahead.
```

The GPT calls `createProduct` with `sync=true`. The response should include a `stripe_product_id` starting with `prod_`.

**Verify it worked**:

- The GPT gives a link to `https://everlastingsbyemaline.com/product/setup-smoke-test`. Open it in a new tab — the page should render with the test images.
- Open Stripe dashboard, search for `Setup Smoke Test` — there should be a product with that name and a `prod_…` ID.
- Open Supabase Studio for the production project, table `products`, search by slug `setup-smoke-test` — the row should exist with `stripe_product_id` populated.

If any of those three is missing, stop and debug before handing the GPT to Em. Most likely culprits: API key wrong (Step 7), schema paste corrupted (Step 8), or `PRODUCT_API_KEY` is the preview value instead of production.

---

## Step 12 — Cleanup the smoke-test product

The smoke-test product is real — it lives in production Stripe and the production database. Remove it before launch.

**In Supabase Studio** (production project):
1. Open table `products`.
2. Filter by `slug = 'setup-smoke-test'`.
3. Delete the row, or (safer) set `available = false`.

**In Stripe dashboard**:
1. Find the `Setup Smoke Test` product.
2. Click into it → **Archive product** (top right). This also archives the price.

**In R2 / Cloudinary**:
The seven test images sit in the CDN under `products/setup-smoke-test/`. They're tiny and harmless, but if you want them gone:
```bash
# Manual via R2 dashboard: open the bucket, navigate to products/setup-smoke-test/, delete the folder.
# Or via wrangler if you've got it set up:
# wrangler r2 object delete <bucket>/products/setup-smoke-test/<filename>
```

This is housekeeping, not a launch-blocker.

---

## Step 13 — Hand-off to Em

Em already has the GPT in her sidebar (it's in her account). The hand-off is just: tell her she can use it whenever, and remind her of the rules.

Suggested text (copy and adjust the tone for your relationship):

```
The Product Assistant is ready in your ChatGPT sidebar. Open it
whenever you want to add a new product. It walks you through
everything — title, story, photos, price — and shows you a preview
before anything goes live. Just drag photos straight into the chat
and talk to it like ChatGPT.

A few things to know:
- Always at least 7 photos per product.
- It will show you a preview before creating anything. Always check
  the price.
- It can't edit existing products. For edits, use the admin UI.
- If you ever see "the connection key needs Sean's attention," text me.
```

That's the setup done.

---

## Maintenance (rare)

If `PRODUCT_API_KEY` ever rotates (you'll know — it's a deliberate Sean-side decision, not something that happens silently):

1. You retrieve the new value from Vercel (Production scope).
2. Sit with Em (or screen-share) again.
3. She opens the GPT in **Edit GPT** mode → **Actions** → the existing action → **Authentication**.
4. She pastes the new key, saves.

That's the only future-maintenance touch. Everything else stays put.

---

## If something goes sideways

- **GPT doesn't appear in Em's sidebar after Save**: refresh ChatGPT, check the Plus subscription is still active.
- **`401 Unauthorized` on `uploadImage` or `createProduct`**: the API key in Step 7 is wrong. Likely pasted with whitespace, or it's the preview value not production.
- **`409 Conflict` on `createProduct`**: a product with that slug already exists. Pick a different title (the smoke test uses `Setup Smoke Test`; if you've run setup once before, switch to `Setup Smoke Test Two`).
- **`400 Bad Request`**: a required field is missing. The error response usually names which one. Check Step 4's required-fields list against what Em told the GPT.
- **Schema validation fails on paste in Step 8**: a YAML indentation got mangled. Re-copy from this doc cleanly; YAML is whitespace-sensitive.

For anything else, the canonical reference is `PRODUCT_PROTOCOL.md`'s "Custom GPT Setup" section.
