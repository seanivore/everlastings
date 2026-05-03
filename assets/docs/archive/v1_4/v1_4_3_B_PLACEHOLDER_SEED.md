---
title: v1.4.3 Track B — Placeholder Product Seed Manifest
date: 2026-05-03
purpose: Documentation of test-mode placeholder products seeded into Supabase + R2 during B0.2. Track C deletes these before launch.
---

## Summary

Six placeholder products were seeded into Supabase against the `dev` preview deployment, all tagged `is_test = true`. A total of 44 R2 objects were uploaded under the `test/` namespace: 42 product images (7 per product — 1 hero + 1 thumbnail + 5 gallery), 1 video (`placeholder-haven-i` only), and 1 animated GIF (`placeholder-haven-i` only). Each WebP image was additionally duplicated under a non-`test_`-prefixed filename to satisfy a validation gap in `/api/products` (see Pipeline notes), bringing R2 object count to 84 image objects + 2 media objects = 86 R2 objects total in `test/` for these placeholders.

Stripe webhook coverage: 6/6. The Supabase `products` INSERT webhook did not auto-fire on the dev preview deployment, so `/api/stripe-sync` was invoked manually for each product. All six rows now carry `stripe_product_id` and `stripe_price_id`. One orphaned Stripe Product (`prod_URor3D0ITLFa2E`) was created during initial manual webhook validation for `placeholder-haven-i` before the batch script ran; it is not referenced by any Supabase row and should be archived during Track C cleanup along with the rest.

Gaps documented: (1) `/api/products` filename validator does not account for the `test_` prefix the upload endpoint adds in test mode (workaround: R2 object duplication); (2) Supabase products INSERT webhook either does not target preview deployments or is misconfigured for the dev branch (workaround: manual `/api/stripe-sync` call). Both folded into Pipeline notes below for Track A backlog.

---

## Per-product details

### placeholder-haven-i

- Title: Placeholder Haven I
- Headline: A quiet portal in waiting
- Price: $245.00 (24500 cents)
- Series: Portals to Peace
- Product type: miniature
- Available: true | Featured: true
- Quantity: 1
- Supabase ID: `29ac18a0-b655-40d0-bf26-2c45b172a24c`
- SKU: `EVE-dedff826`
- Stripe Product ID: `prod_URosENLviu9cvl`
- Stripe Price ID: `price_1TSvEGCdjx9YjCROszRkwG9v`
- Hero CDN URL: `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-i/hero-placeholder-haven-i.webp`
- Thumbnail CDN URL: `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-i/thumbnail-placeholder-haven-i.webp`
- Gallery CDN URLs:
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-i/gallery-01-placeholder-haven-i.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-i/gallery-02-placeholder-haven-i.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-i/gallery-03-placeholder-haven-i.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-i/gallery-04-placeholder-haven-i.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-i/gallery-05-placeholder-haven-i.webp`
- Media (placeholder-haven-i only):
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-i/test_video-01-placeholder-haven-i.mp4`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-i/test_gif-01-placeholder-haven-i.gif`

### placeholder-haven-ii

- Title: Placeholder Haven II
- Headline: A second portal, paler than the first
- Price: $265.00 (26500 cents)
- Series: Portals to Peace
- Product type: miniature
- Available: true | Featured: true
- Quantity: 1
- Supabase ID: `ea7d7f19-0244-4280-9b31-48df448e76c2`
- SKU: `EVE-12dc2f8d`
- Stripe Product ID: `prod_URosFK96ajZXhv`
- Stripe Price ID: `price_1TSvEJCdjx9YjCROfruOjz6P`
- Hero CDN URL: `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-ii/hero-placeholder-haven-ii.webp`
- Thumbnail CDN URL: `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-ii/thumbnail-placeholder-haven-ii.webp`
- Gallery CDN URLs:
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-ii/gallery-01-placeholder-haven-ii.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-ii/gallery-02-placeholder-haven-ii.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-ii/gallery-03-placeholder-haven-ii.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-ii/gallery-04-placeholder-haven-ii.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-haven-ii/gallery-05-placeholder-haven-ii.webp`

### placeholder-book-nook

- Title: Placeholder Book Nook
- Headline: A warm corner, not yet built
- Price: $185.00 (18500 cents)
- Series: Book Nooks
- Product type: miniature
- Available: true | Featured: false
- Quantity: 1
- Supabase ID: `3f5556ba-f994-4af6-b5dc-03fb50c1377c`
- SKU: `EVE-4525b06b`
- Stripe Product ID: `prod_URossmI3zF8nRV`
- Stripe Price ID: `price_1TSvEcCdjx9YjCROcJC7SdOP`
- Hero CDN URL: `https://cdn.everlastingsbyemaline.com/test/placeholder-book-nook/hero-placeholder-book-nook.webp`
- Thumbnail CDN URL: `https://cdn.everlastingsbyemaline.com/test/placeholder-book-nook/thumbnail-placeholder-book-nook.webp`
- Gallery CDN URLs:
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-book-nook/gallery-01-placeholder-book-nook.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-book-nook/gallery-02-placeholder-book-nook.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-book-nook/gallery-03-placeholder-book-nook.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-book-nook/gallery-04-placeholder-book-nook.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-book-nook/gallery-05-placeholder-book-nook.webp`

### placeholder-storyloft

- Title: Placeholder Storyloft
- Headline: A loft drawn in lavender
- Price: $325.00 (32500 cents)
- Series: Story Lofts
- Product type: miniature
- Available: true | Featured: false
- Quantity: 1
- Supabase ID: `e64612cf-8121-4114-8e02-14814ce0bc78`
- SKU: `EVE-c3108747`
- Stripe Product ID: `prod_URosdv1l5IQIgk`
- Stripe Price ID: `price_1TSvEeCdjx9YjCRO2eoUec1p`
- Hero CDN URL: `https://cdn.everlastingsbyemaline.com/test/placeholder-storyloft/hero-placeholder-storyloft.webp`
- Thumbnail CDN URL: `https://cdn.everlastingsbyemaline.com/test/placeholder-storyloft/thumbnail-placeholder-storyloft.webp`
- Gallery CDN URLs:
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-storyloft/gallery-01-placeholder-storyloft.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-storyloft/gallery-02-placeholder-storyloft.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-storyloft/gallery-03-placeholder-storyloft.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-storyloft/gallery-04-placeholder-storyloft.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-storyloft/gallery-05-placeholder-storyloft.webp`

### placeholder-seasonal-piece

- Title: Placeholder Seasonal Piece
- Headline: A season already passed
- Price: $215.00 (21500 cents)
- Series: Seasonal
- Product type: miniature
- Available: false | Featured: false  (sold-state UI test variant)
- Quantity: 0
- Supabase ID: `f6d6b62a-d14f-4914-bfbf-c9e120ba3730`
- SKU: `EVE-5a5dbe81`
- Stripe Product ID: `prod_URosODYnsDGLnv`
- Stripe Price ID: `price_1TSvEhCdjx9YjCROcP9LYbN0`
- Hero CDN URL: `https://cdn.everlastingsbyemaline.com/test/placeholder-seasonal-piece/hero-placeholder-seasonal-piece.webp`
- Thumbnail CDN URL: `https://cdn.everlastingsbyemaline.com/test/placeholder-seasonal-piece/thumbnail-placeholder-seasonal-piece.webp`
- Gallery CDN URLs:
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-seasonal-piece/gallery-01-placeholder-seasonal-piece.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-seasonal-piece/gallery-02-placeholder-seasonal-piece.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-seasonal-piece/gallery-03-placeholder-seasonal-piece.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-seasonal-piece/gallery-04-placeholder-seasonal-piece.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-seasonal-piece/gallery-05-placeholder-seasonal-piece.webp`

### placeholder-printable-set

- Title: Placeholder Printable Set
- Headline: A printable, awaiting its first ink
- Price: $45.00 (4500 cents)
- Series: Limited Edition
- Product type: printable
- Available: true | Featured: false
- Quantity: 50
- Supabase ID: `979d50a3-85ea-4fb8-aa15-75a7929816b2`
- SKU: `EVE-f293b434`
- Stripe Product ID: `prod_URosuo6PXiQ90q`
- Stripe Price ID: `price_1TSvEjCdjx9YjCROArnW45sI`
- Hero CDN URL: `https://cdn.everlastingsbyemaline.com/test/placeholder-printable-set/hero-placeholder-printable-set.webp`
- Thumbnail CDN URL: `https://cdn.everlastingsbyemaline.com/test/placeholder-printable-set/thumbnail-placeholder-printable-set.webp`
- Gallery CDN URLs:
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-printable-set/gallery-01-placeholder-printable-set.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-printable-set/gallery-02-placeholder-printable-set.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-printable-set/gallery-03-placeholder-printable-set.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-printable-set/gallery-04-placeholder-printable-set.webp`
  - `https://cdn.everlastingsbyemaline.com/test/placeholder-printable-set/gallery-05-placeholder-printable-set.webp`

---

## Where each placeholder is used in Track B HTML pages

This mapping is the contract for subagents B3/B4/B5 — do not introduce new placeholder slugs without updating this section first.

- **Homepage featured carousel**: `placeholder-haven-i`, `placeholder-haven-ii`, `placeholder-book-nook`
- **Homepage related havens row**: `placeholder-storyloft`, `placeholder-printable-set`
- **Shop grid (all 6 visible, with sold-state badge on the seasonal piece)**: `placeholder-haven-i`, `placeholder-haven-ii`, `placeholder-book-nook`, `placeholder-storyloft`, `placeholder-seasonal-piece`, `placeholder-printable-set`
- **Product page sample (rich-media variant — exercises hero + gallery + video + GIF rendering)**: `placeholder-haven-i`
- **Related havens on product page**: `placeholder-haven-ii`, `placeholder-book-nook`, `placeholder-storyloft`
- **Shop sold-state filter test**: `placeholder-seasonal-piece` (also exercises the cart-recovery overlay path if a customer reaches it via stale link)
- **Shop printable-vs-miniature variant test**: `placeholder-printable-set`

---

## Track C cleanup directive

Before Track C completes (C4 launch checklist), delete:

1. **Supabase**: `DELETE FROM products WHERE is_test = true;` (or use the `/admin` UI to delete each by slug — the six slugs all start with `placeholder-`).
2. **R2 objects** under `cdn.everlastingsbyemaline.com/test/` — purge the entire `test/` prefix via the Cloudflare R2 dashboard or Wrangler CLI. This sweeps both the `test_`-prefixed originals and the duplicate workaround copies in one operation.
3. **Stripe Products**: archive each via the Stripe dashboard (test mode). Search "Placeholder" — six current products plus one orphan (`prod_URor3D0ITLFa2E`, see Pipeline notes) need archiving. The associated Stripe Prices archive automatically when their parent product archives.
4. **Stripe Prices**: archived automatically when products archive. No separate action.

---

## Pipeline notes

Observations from this seeding pass that should be folded into `assets/docs/PRODUCT_PROTOCOL.md` and/or the v1.4.3 Track A backlog. None of these blocked the seed, but each cost a debugging cycle and would have blocked an unfamiliar agent.

### 1. Cloudinary `unsigned_temp` upload preset is not configured on the dev account

`/api/upload` calls `https://api.cloudinary.com/v1_1/{cloud}/image/upload` with `upload_preset=unsigned_temp` for non-`skip_transform` images. The `df0lyrhus` Cloudinary cloud has no upload presets configured (`GET /v1_1/df0lyrhus/upload_presets` returns `{"presets":[]}`), so the call returns `{"error":{"message":"Upload preset not found"}}` and `/api/upload` returns 502 `{"error":"Cloudinary upload failed"}`.

Workaround used here: pre-converted source PNGs to 4:5 WebP locally with ImageMagick, then uploaded with `skip_transform=true` and explicit `;type=image/webp` MIME.

Fix to ship: create the `unsigned_temp` preset in the Cloudinary dashboard with the transform parameters the API expects (4:5 fill, q_auto, g_auto), or switch to a signed upload flow in `api/upload.ts`. Once fixed, the protocol's recommended path (raw JPG → API → Cloudinary transform → R2 WebP) works for clients.

### 2. `/api/products` filename validator does not account for the `test_` prefix added by `/api/upload`

`api/products.ts` lines 137-152 validates hero/gallery presence by parsing the URL filename via `split('/').pop()` and checking `startsWith('hero-')` / `startsWith('gallery-')`. But `api/upload.ts` lines 197-202 prepends `test_` to filenames in test mode (e.g. `test_hero-{slug}.webp`). Result: any product created in test mode using URLs returned from `/api/upload` will be rejected with `{"error":"At least 1 hero image required"}`.

Workaround used here: after uploading, R2 objects were duplicated server-side via `CopyObjectCommand` from `test/{slug}/test_{role}-{slug}.webp` to `test/{slug}/{role}-{slug}.webp`, then product POSTs used the non-`test_`-prefixed URL.

Fix to ship: in `api/products.ts`, change the filter to `filenameOf(img).replace(/^test_/, '').startsWith('hero-')` (and the same for `gallery-`). Then the test workflow Just Works on URLs `/api/upload` actually returns.

### 3. Supabase `products` INSERT webhook to `/api/stripe-sync` did not auto-fire on the preview deployment

After `POST /api/products` succeeded for all six rows, `stripe_product_id` and `stripe_price_id` remained null after a 45 second wait. Manually firing the `/api/stripe-sync` endpoint with a synthesized webhook payload (`{type:"INSERT", table:"products", record:{...}}`) succeeded for every product. So `/api/stripe-sync` itself works; the database webhook simply wasn't reaching the dev preview URL.

Likely causes: (a) the Supabase Database Webhook is configured to point at the production URL `https://everlastingsbyemaline.com/api/stripe-sync`, not at the per-deployment preview URL, OR (b) it is unscoped and silently failing CORS / 404 against the preview alias. Either way the test-seeding flow needs an answer.

Workaround used here: manual `/api/stripe-sync` call per product after creation.

Fix options to ship: (a) add a Supabase webhook variant pointed at `https://*.vercel.app` (or specifically the dev branch alias) so test seeding self-syncs, OR (b) document in PRODUCT_PROTOCOL.md that test-mode seeding must follow each `POST /api/products` with an explicit `POST /api/stripe-sync` call carrying the synthesized webhook envelope, OR (c) add a `?sync=true` query param on `POST /api/products` that causes the endpoint to call `/api/stripe-sync` inline before responding.

### 4. Initial-validation orphan in Stripe test mode

While diagnosing point #3, the manual `/api/stripe-sync` call for `placeholder-haven-i` ran twice — once standalone to confirm the endpoint worked, then again as part of the batch script. Result: two Stripe Products exist for that slug. The Supabase row only references the second one (`prod_URosENLviu9cvl`); the first (`prod_URor3D0ITLFa2E`) is orphaned. It's harmless in test mode but should be archived by Track C cleanup along with the rest. The lesson for the protocol: `/api/stripe-sync` is idempotent on a SECOND call only when `record.stripe_product_id` is already set in the payload — calling it twice with the same `record.id` but no existing `stripe_product_id` will create a NEW Stripe Product the second time and overwrite the DB row's reference. Worth noting in protocol error-handling rules.

### 5. `vercel curl` exits with code 3 on every successful call

Every `npx vercel curl --deployment <url> -- ...` call ends with `curl: (3) URL rejected: No host part in the URL` after the JSON body is delivered. Exit code is 3 even though the response is correct. Scripts using `set -e` will die on the first call. Workaround in this seed: drop `set -e` (kept `set -uo pipefail`) and pipe through `|| true`. Worth a one-liner in PRODUCT_PROTOCOL.md's curl examples.

### 6. `materials` field is a Postgres `text[]` array, not a string

The protocol example in PRODUCT_PROTOCOL.md shows `materials` as a single string in the "For Emy" form-field table. The actual Supabase column is `text[]` and rejects strings with `malformed array literal` errors at the JSONB-to-array cast. POST `/api/products` must send `materials: ["item1", "item2", ...]`. Worth fixing the example in the AI-protocol section of PRODUCT_PROTOCOL.md to clarify that for the API call, materials is an array of strings (the human-facing form may show comma-separated, but the API takes an array).

### 7. `GET /api/products?slug=...` with `is_test=true` requires the `Authorization: Bearer` header

Without auth, GET filters `is_test=false` and returns 404 for any test product. With the bearer header, GET filters `is_test=isTest` (matches the deployment's environment scope). This is correct behavior, but worth noting in the Verification step of PRODUCT_PROTOCOL.md so an agent does not assume their POST silently failed when the GET 404s.
