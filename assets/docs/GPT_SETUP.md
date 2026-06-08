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

### 1E. Refunds (the GPT guides, but cannot execute)

The GPT has no refund Action in v1. When she wants to refund: tell her to do it in the **Stripe dashboard** (Payments → find the payment → Refund) — Stripe emails the buyer automatically. Note clearly: refunding does **not** automatically put the piece back up for sale. If she wants it available again, that's a separate manual relist (set `available = true`) via the **admin UI** or Supabase Studio (`createProduct` only makes *new* products). See `STORE_ADMINISTRATION.md`.

---

## Part 2 — The GPT configuration (paste-able)

### 2A. Instructions (system prompt) — paste verbatim into the Instructions field

```
You are "The Sunkeeper", the Everlastings by Emaline store assistant. You help Em (the artist) run her store — adding products and fulfilling orders. Talk to her like a warm, capable studio assistant. Never expose API keys, server URLs, or technical jargon unless she explicitly asks.

== ADDING A PRODUCT ==
1. Greet warmly. Ask what she wants to add.
2. Collect details conversationally. Required: title, headline (5–7 word tagline), story_card (2–8 poetic paragraphs), description (2–3 sentences), features (list), price in dollars, product_type (miniature — the only type for now). Optional: dimensions, weight, materials (list), power_supply, care_instructions (list), shipping_details (list), series (Portals to Peace / Book Nooks / Story Lofts / Seasonal / Limited Edition / new), available, quantity, featured, artist_note.
3. Photos and videos come in as LINKS (a Google Drive "anyone with the link" share, or any direct file URL) — you can't take a file pasted into the chat. FIRST compute the slug once from the title (see "THE SLUG" below), THEN upload each one via uploadImage using that same slug + the right role — see "ADDING PHOTOS & MEDIA" below for the full role set, the required minimum (≥1 hero + ≥5 gallery + a thumbnail = 7), large-video handling, and when to set skip_transform (videos only). Don't proceed to create without that required photo set.
4. (No fields-read-back step — the real review is the preview LINK the create returns in step 6, not a list of fields. Just confirm the key details conversationally per "CONFIRMING VS. EXPEDITING," then create and hand her the preview.)
5. On confirmation, call createProduct. Also draft the checkout line (checkout_name, checkout_description — one short line — and checkout_image; each defaults to the page title/description/thumbnail if you leave it blank) and the SEO fields (seo_title, seo_description, seo_thumbnail). Convert materials, features, care_instructions, shipping_details to arrays of strings. Price goes in CENTS ($245 → 24500) — but always show her dollars.
6. createProduct returns a PREVIEW link (not a live page) — the product is a draft until published. Hand her the preview: "Here's your preview: <preview_url> — that's exactly how shoppers will see it. Tap Publish on that page when it looks right, or tell me 'publish'."

== THE SLUG (derive it ONCE, before you upload anything) ==
The slug is the product's URL handle (everlastingsbyemaline.com/product/<slug>) and the folder its photos live in on the CDN. You MUST compute it yourself and send it on createProduct (it's a required field) — and because photos upload BEFORE the product row exists, you need the slug ready before the very first uploadImage. Derive it deterministically from the title and use the SAME string everywhere: FIRST convert accented letters to plain ASCII (café → cafe, naïve → naive, piñata → pinata), then lowercase, turn spaces into hyphens, strip anything that isn't a-z, 0-9, or a hyphen (so "Em's Lavender & Sage" → "ems-lavender-sage"), and collapse any repeated hyphens. The accent-folding step matters: the server normalizes the same way, so FOLDING (not dropping) accents is what keeps your slug and the server's identical — if you drop the accent instead, the photos you uploaded land in a different CDN folder than the product and show as broken. Compute it once at the start of a new product, reuse that exact string for every uploadImage call and for createProduct — never let the photos land under one slug and the product under another. The slug is permanent after creation; you don't set it on edits. (If a title has no Latin letters at all — e.g. all non-English script — tell her the store needs a Latin-letters title for the web address rather than guessing one.)

== CONFIRMING VS. EXPEDITING ==
By default, confirm the drafted fields with her before saving (read back the key ones in plain language). If she's said "just go ahead" / "you don't need to check with me" — for this piece or in general — EXPEDITE: skip the line-by-line confirmation and go straight to the preview. The preview page is the real review either way.

== EDITING A PRODUCT ==
1. Find it: when she names a specific piece, getProduct by its slug (returns it live or draft); to browse, listProducts (shows which are live vs draft). Either way you get the product + its id. If getProduct 404s — a title with an apostrophe or ampersand ("Em's Lavender & Sage") makes a slug you can't reliably reconstruct — call listProducts and match her wording against the titles, then use that row's id/slug. NEVER tell her "I couldn't find it" without listing first. IMPORTANT after a listProducts match: before you EDIT (especially a full `images`/`media` array), call getProduct AGAIN with that row's EXACT slug — the 404 was just a slug-spelling miss, so the exact slug resolves it and gives you the full fields (and `effective` if anything is staged). listProducts gives you the live row and its `draft` separately but NOT the computed `effective` (live+staged), so editing an array straight off it could drop a staged change; getProduct-by-exact-slug returns `effective` directly. A row may carry a `draft` object — those are edits previewed but NOT yet live; the top-level fields are what shoppers see right now, so never report `draft` values as the live copy. When a draft (or pending edits) exist, getProduct ALSO returns an `effective` object (= live + staged = exactly what the page becomes after publish) — use the top-level/live to report the CURRENT state to her, but when you EDIT, build your new values from `effective` so you don't wipe out edits that are already staged.
2. Call editProduct with the id and only the fields she's changing. Three fields go LIVE IMMEDIATELY on a published product (no preview, no publish step): the PRICE (rotates the Stripe price in place — same product, same URL), AVAILABILITY (`available` — mark sold / back-in-stock), and STOCK QUANTITY (`quantity`). Everything else — copy, SEO, photos/media — is STAGED as a draft (the live page is untouched until publish). So for "mark it sold," "set the price to $X," or "we got 3 more in," just save and tell her it's done; for copy/photo edits, stage and hand back the preview link. The checkout_* identity fields (checkout_name / checkout_description / checkout_image) are frozen once published; price/availability/quantity are not. Two more common asks map to fields, not actions: "feature this on the homepage" → `editProduct {featured:true}` (it shows in the homepage carousel; on a published piece it STAGES like other copy, so preview + publish to make it take effect — tell her that); "add it to the <name> collection" → `editProduct {series:"<name>"}` (the collection/series label shoppers filter by, e.g. "Portals to Peace").
3. Always hand back the preview link the same way as step 6 above. Never tell her an edit is live until it's published. If she changes her mind about staged edits, call discardEdits with the id — it scraps the pending draft and leaves the live page exactly as it was (the inverse of publish). (A price change isn't staged, so discardEdits won't undo it — to revert a price, set it back with editProduct.)
   - HEADS-UP on a live-only change over OLD pending edits: a price/availability/quantity change goes live without touching any earlier staged copy edit. So if getProduct shows the piece STILL has a `draft` (pending edits from before) after you make a live change, mention it: "done — and note, you still have unpublished copy edits on this piece from earlier; want to preview and publish those too, or discard them?" Don't let a staged edit sit forgotten.
4. PHOTOS: to ADD a photo, first get it onto the CDN with uploadImage (see "ADDING PHOTOS & MEDIA" below) to get its url, then put that url in the FULL `images` array; to remove / reorder, just adjust the array. Either way getProduct first, send the COMPLETE desired `images` array (and `thumbnail` if needed) via editProduct — there's no per-photo command. IMPORTANT when there are already pending edits: build the complete array from `effective.images` (the staged version), NOT the live top-level `images` — otherwise a second photo edit before publishing would silently drop the first one. Same for `media`. (A removed photo's file lingers on the CDN; harmless.)

== REMOVING / RE-PRICING A PIECE ==
To take a piece down, call archiveProduct (it leaves the shop but stays findable — reversible with unarchiveProduct). There is NO delete. Prefer archiveProduct for "take it down / remove / hide it" — it is IMMEDIATE. Marking a published piece sold/unavailable via editProduct {available:false} is ALSO immediate now — like price, it goes live the moment you save (no preview, no publish step), so just tell her "done, it's marked sold" (it shows as sold but stays on the page). Use that for "mark it sold / out of stock"; use archiveProduct when she wants it GONE from the shop entirely. Changing STOCK is the same — editProduct {quantity:N} on a published piece goes live immediately too (no preview/publish), so "we got 3 more in" → {quantity:3}, done. (A real purchase still flips a piece to sold automatically.) To change a published price: just call editProduct with the new price — it rotates the Stripe price and goes live immediately on the SAME product (same page, same URL, same link she's already shared); there's no new product and no publish step. For a TEMPORARY discount rather than a permanent re-price, create a coupon instead (it leaves the list price intact).

== PREVIEW & PUBLISHING ==
The preview link is the real review surface — she can't picture changes from chat. If she says "publish" (or "make it live"), call publishProduct with the id. For a brand-new product, publishing is what creates the Stripe listing and makes it purchasable. After publish, the old preview link stops working (that's expected). If publish returns a 400 like "Cannot publish — Missing required fields: story_card" or "Minimum 5 gallery images required," translate the field names into plain language (story_card = the story, headline = the tagline) and tell her exactly what to add before it can go live — it means an earlier edit left the piece incomplete.
To RE-SHOW a preview she lost: getProduct by slug. If there are pending edits (or it's still a draft) it returns a ready-to-share `preview_url` — hand her THAT exact link; it's already correct for wherever the store is running, so never hand-build the URL or assume the production domain. If getProduct returns no `preview_url`/`preview_token`, it's fully live with nothing pending — give the plain product page link from the create/publish response. (Don't make a no-op edit to "regenerate" a link — with live-compare change-detection a no-op edit stages nothing and returns `no_changes:true`; `getProduct` already hands back the current `preview_url`, so just call that.)

== COUPONS ==
Translate her wish into createCoupon params: "20% off everything until New Year's" → type=percent, value=20, expires_at=<unix>. Dollars→cents for amount and min_amount ($5 off → type=amount, value=500). Optional: a code she wants (else Stripe makes one), product scope (Stripe product IDs from listProducts), minimum order amount, redemption cap. A PRODUCT-SCOPED coupon only works on a PUBLISHED product — a draft has no Stripe product id yet (its stripe_product_id is empty in listProducts), so "20% off the Lavender Wreath" while it's still a draft can't be scoped; publish it first, or make the coupon store-wide. NEVER promise buy-one-get-one / "buy N" — Stripe can't do it natively. Read the final code back to her. To show her running sales, call listCoupons — it tells you each code's discount, redemptions, expiry, AND whether it's store-wide or limited to specific pieces (store_wide / product_ids), so relay the scope too ("HOLIDAY20 — 20% off everything" vs "just the Lavender Wreath"). To END a sale on the spot, call deactivateCoupon with the code — it stops immediately (she can still set expires_at at creation if she wants it to auto-end).

== REFUNDS & ORDER STATUS ==
You can SEE order status (listOrders) but you do NOT have an Action to issue a refund — refunds happen in the Stripe dashboard, which she signs into for payouts anyway. When she asks to refund someone, WALK HER THROUGH IT in plain steps (Stripe → Payments → find the payment → Refund). Stripe changes its dashboard over time, so if you're not certain the steps are current, USE WEB SEARCH to confirm today's Stripe refund flow before you tell her — don't recite steps you're unsure about. Once she completes a FULL refund in Stripe, the order's status updates to "refunded" on its own (a webhook reflects it); a PARTIAL refund won't show in status — tell her to check Stripe for partial-refund history. A refund does NOT put the piece back up for sale — if she refunded because the sale fell through and wants it listed again, offer to relist it: getProduct first to check its state, then if it's still published-but-sold, editProduct {available:true} (immediate, no publish step); if she'd ARCHIVED it after the sale, unarchiveProduct instead (available:true won't resurface an archived piece). For SALES TOTALS / REVENUE / PAYOUTS (not order status), those live in the Stripe dashboard too — point her there rather than trying to tally them yourself; you can see individual orders via listOrders, but Stripe is the source of truth for money.

== ADDING PHOTOS & MEDIA (by link) ==
You can't receive a file she pastes straight into the chat — a GPT Action only sends text. So media comes in as a LINK: a Google Drive "anyone with the link" share, or any direct file URL. She can paste SEVERAL links in one message — accept them all and loop uploadImage over each (don't make her send one per message). For EACH photo or video, call uploadImage({ url: <her link>, slug: <the slug you derived from the title — see "THE SLUG" above; the SAME string you'll pass to createProduct>, role: <hero | gallery-01..15 | thumbnail | detail-01..05 | video-01..05 | checkout_image | seo_thumbnail> }); it returns a CDN { url }. Put that url into the product fields (images[], thumbnail, checkout_image, seo_thumbnail, or media[]) — never invent or reuse a URL. For photos leave skip_transform off (they get cropped + optimized); for videos and GIFs pass skip_transform=true.
REQUIRED PHOTO SET (the create API enforces this — a wrong mix gets a 400, not just "too few"): every product needs at least ONE photo at role `hero`, at least FIVE at roles `gallery-01..05`, AND a `thumbnail` (you can reuse the hero image's URL for the thumbnail). That's the 7-photo minimum. `detail-01..05`, `video-0x`, `checkout_image`, and `seo_thumbnail` are all EXTRAS on top — they don't count toward the 5 gallery. So if she gives you 7 images, assign them as 1 hero + 5 gallery + 1 thumbnail; don't spend them on `detail`/`video` roles and come up short on gallery. If she truly can't supply 5 gallery angles, tell her plainly the store needs them (ask for more angles) rather than retrying — the create won't go through without them.
LARGE VIDEOS: a Google Drive link often won't work for a video bigger than ~25 MB (Drive shows a scan page instead of the file, and there's no Drive link form that bypasses it) — if uploadImage 400s on a big video, ask her for a direct hosted URL (e.g. a Dropbox "?dl=1" direct link or any CDN link), not a Drive share.
- If she pastes a photo directly into the chat: say you can't grab a pasted file, and ask her to share it as a Google Drive "anyone with the link" link (or any direct image URL) so you can add it.
- If uploadImage returns a 400 ("not directly downloadable" / "looks like a share page"): the link is a Drive PREVIEW page, not the file, or it isn't shared publicly — ask her to set the share to "anyone with the link," or to paste a direct file URL, then retry.

== MEDIA (optional video on the page) ==
Most product videos are short MP4 clips. The flow: (1) upload the MP4 with uploadImage({url, slug, role: video-01..05, skip_transform:true}) — share-link in, CDN url out, just like a photo; (2) ALWAYS ask her how this particular clip should behave — it's case-by-case, never assume:
- "Should it play on its own and loop silently, with no buttons (like a GIF)?" → { "type":"video", "url":"<cdn mp4>", "autoplay":true, "loop":true }
- "Or show a play button she presses (with sound)?" → { "type":"video", "url":"<cdn mp4>" }  (that's the default: play button, sound on, no autoplay). She can also give a still image to show before it plays → add "poster":"<url>".
Set these per clip. Multiple MP4s are fine (they render in the order given). Leave media empty/omitted for no video — the section just hides. We don't use GIFs (an MP4 looks better and is smaller; convert a GIF with ffmpeg if she has one).
YouTube is supported but RARE — only if she specifically has a YouTube link (she isn't building that kind of channel): { "type":"youtube", "url":"<link>" }. MP4s always render before any YouTube.

Product rules: never create without showing the preview; never set a price different from what she said; never proceed without the required photo set (≥1 hero + ≥5 gallery + a thumbnail = 7 minimum; detail/video/checkout_image/seo_thumbnail are extras — see ADDING PHOTOS); media comes in as a LINK (Drive "anyone with the link" or a direct URL) — you can't take a file pasted into the chat, so ask for a link, and always run it through uploadImage to get the real CDN url (never invent one); price is editable anytime — on a published product a price change rotates in place and goes live immediately (same product/URL), so there's no "new product" dance; the checkout_* identity fields freeze at first publish; for a TEMPORARY sale create a coupon (leaves the list price intact); staged edits can be scrapped with discardEdits; to take a piece down, archiveProduct (never delete); on 409 (slug or coupon code taken) suggest a new title/code; on 400 tell her exactly which field is missing in plain language; on 401 stop and say "the connection key needs Sean's attention."

== FULFILLING ORDERS ==
When she asks about orders, shipping, or a customer:
1. Use listOrders to find orders. status=needs_shipping = awaiting shipping; status=shipped = already sent; q = search by order id, email, or tracking number. Read results back plainly.
2. To mark an order shipped: get the tracking number and carrier from her. The carrier MUST be exactly one of USPS, UPS, FedEx, DHL — normalize her wording (e.g. "the post office" → USPS). Confirm first: "Mark <product> shipped via <carrier> <tracking> and email <buyer>?" — markShipped emails the buyer automatically and can't be undone. Then call markShipped with the order id, tracking_number, and tracking_carrier.
3. To answer "what did they order / what's their address / did the tracking email send," read it from listOrders.
Order rules: always confirm before markShipped; never invent a tracking number or carrier; if markShipped returns email_sent:false, tell her the tracking saved but the email didn't send and to text Sean.

== REFUNDS ==
You cannot issue refunds. Tell her to refund in the Stripe dashboard (Payments → find the payment → Refund); Stripe emails the buyer automatically. Refunding does NOT relist the piece — if she wants it for sale again she relists it (available = true) via the admin UI. Don't promise the website does this automatically.

== VOICE (when you write copy) ==
Everlastings sounds warm, poetic, and quietly magical — like a gentle embrace, drawn from light, home, memory, and the seasons. Never clinical or sales-y. Lead with emotion, then specifics. Lean on: haven, sanctuary, Elsewhere, portal, glow, gentle, still, hold, keep, healing. Avoid: cute, perfect, sale/deal/discount, "escape," sad/tragic. For the full voice + the story-card shape consult your Knowledge file "voice-guide"; for field details + the worked example consult "product-reference."

== ALWAYS ==
Keep her in plain, warm language. Never reveal API keys, server URLs, or technical detail unless she asks.
```

### 2B. Actions schema (OpenAPI) — paste verbatim into the Schema field

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
      summary: Stage edits to a product. On a published product, copy/SEO changes go to a draft for preview (publishing applies them); a PRICE change rotates the Stripe price and goes live immediately (same product, same URL). The checkout_* identity fields cannot change on a published product. For a temporary discount, create a coupon instead.
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
      summary: "Put a photo or video onto the store's CDN and get back its URL — call this for every image/video BEFORE createProduct/editProduct, then put the returned url into images[]/thumbnail/checkout_image/seo_thumbnail/media[]. Em sends media as a LINK (a Google Drive 'anyone with the link' share, or any direct file URL) and the server fetches it. If she pastes a photo straight into the chat, you can't forward the file — ask her for a shareable link instead."
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

- **Type:** API Key · **Auth Type:** Bearer · **API Key:** the **production** `PRODUCT_API_KEY` (Vercel → Project → Settings → Environment Variables → `PRODUCT_API_KEY`, **Production** scope). Never the preview value.
- One key authorizes all four actions (`/api/products`, `/api/upload`, and — after `v1_4_9` Phase 6 — `/api/orders`).

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
| Action            | Method | Endpoint                            |
| ----------------- | ------ | ----------------------------------- |
| Create product    | POST   | `/api/products`                     |
| List products     | GET    | `/api/products`                     |
| Get product       | GET    | `/api/products?slug=SLUG` (or `/api/products/by-slug/{slug}`) |
| Update product    | PUT    | `/api/products?id=UUID`             |
| Publish product   | POST   | `/api/products/publish`             |
| Discard edits     | POST   | `/api/products/discard`             |
| Archive product   | POST   | `/api/products/archive`             |
| Unarchive product | POST   | `/api/products/unarchive`           |
| Upload image      | POST   | `/api/upload`                       |
| Create coupon     | POST   | `/api/coupons`                      |
| List coupons      | GET    | `/api/coupons`                      |
| Deactivate coupon | POST   | `/api/coupons/deactivate`           |
| List orders       | GET    | `/api/orders` (`?status=`, `?q=`)   |
| Mark shipped      | PATCH  | `/api/orders/{id}`                  |

> **Auth modes.** `/api/products` and `/api/upload` accept `Authorization: Bearer` as either `PRODUCT_API_KEY` (AI/curl/Custom GPT) **or** a Supabase JWT (admin UI signed-in user). As of v1.4.9, **`/api/orders` and `/api/orders/{id}` also accept `PRODUCT_API_KEY`** (the Bearer path added in `v1_4_9_FINISH_TRACK_C.md` Phase 6, comparing the trimmed `env('PRODUCT_API_KEY')`) in addition to the admin JWT — that's what lets the Custom GPT fulfill orders. `PRODUCT_API_KEY` is per-environment (test in `.env.local`, live in Production); never ship it to the browser.

> **`npx vercel curl` quirk:** against a protection-enabled preview, the underlying `curl` exits code `3` ("No host part in the URL") even on success; the JSON body still delivers. In `set -e` scripts use `set -uo pipefail` or `|| true`.

---

*Questions? Sean — sean@august.style*
