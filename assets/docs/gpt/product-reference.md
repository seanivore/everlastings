# Product Reference — what goes into each product

*Knowledge file for The Sunkeeper. When Em adds a product, use this to know each field and how to write it well. Always speak dollars to her; never expose anything technical. For how the writing should **sound**, see `voice-guide.md`.*

---

## The fields Em provides

- **title** — the name of the piece, exactly as she says it.
- **headline** — a 5–7 word tagline; short and poetic. Appears under the title.
- **story_card** — the full story, 2–8 paragraphs. The emotional heart of the page, in Em's voice (see the voice guide).
- **description** — 2–3 sentences. Used in previews, search, and social shares.
- **features** — a list of notable features, each written beautifully ("Softly illuminated by a warm LED glow," not "LED lights").
- **price** — Em speaks in **dollars**; the system stores **cents** ($245.00 = 24500). Always show her dollars.
- **dimensions** — W × D × H in inches (e.g. `8" W x 6" D x 10" H`).
- **weight** — for shipping, in pounds (e.g. `2.5 lbs`).
- **materials** — a list; each material its own item.
- **power_supply** — e.g. `USB-C (adapter included)`, `Battery (included)`, or leave empty.
- **care_instructions** — a list; each step its own item.
- **shipping_details** — a list; timeframe, packaging notes, insurance.
- **artist_note** — optional; a brief personal note from Em.

## The fields Em chooses from set values

- **product_type** — `miniature` (the only type the store supports today; printable/storybook are future work, not something the GPT can add on its own).
- **series** — one or none of: `Portals to Peace`, `Book Nooks`, `Story Lofts`, `Seasonal`, `Limited Edition`. A brand-new series name is fine — it appears on the site automatically.
- **available** — `true` or `false` (turns `false` automatically when the piece sells).
- **quantity** — a number: `1` for one-of-a-kind, `0` for sold out, higher for editions.
- **featured** — `true` or `false` (controls the homepage carousel).

## The three field tiers (you write all of them)

- **Page / marketing** — `title`, `headline`, `story_card`, `description`, `features`, and the detail
  fields above. The product page reads these; edits preview, then publish.
- **SEO** — `seo_title`, `seo_description`, `seo_thumbnail` (the share/OG image, ~1.91:1). Search- and
  social-shaped; you write them.
- **Checkout (Stripe — identity set once, frozen after publish)** — `checkout_name`,
  `checkout_description` (one short line shown at checkout / on the receipt), `checkout_image` (square).
  Each **defaults to** the page `title` / `description` / `thumbnail` if you leave it blank, so only
  fill them when the checkout copy should differ. After a product is published these can't change —
  **but `price` can**: editing the price rotates the Stripe price in place (same product/URL),
  effective immediately.

## The slug — you derive it, once

`slug` is the product's URL handle and its CDN photo folder. You compute it from the title yourself
(lowercase, spaces→hyphens, strip anything not `a-z0-9-`, collapse repeats) and reuse the **same**
string for every `uploadImage` call and `createProduct` — it's a required create field, and the photos
upload before the row exists. The server normalizes it identically, and it's permanent after creation
(you never set it on edits). See "THE SLUG" in the Instructions.

## The system fills these in — never set them

`sku`, the Stripe IDs, the photo CDN URLs, the homepage theme, and the draft/publish machinery.

## Photos — at least 7

- Minimum **7** per product: 1 hero, 1 thumbnail, and at least 5 gallery shots. Ideal is 10–15.
- Good coverage: a clean **hero** (front, well-lit — this is also the thumbnail), 3–4 **angles**, 2–3 **detail** close-ups, 2–3 **lighting** modes, one **scale** reference (next to a familiar object), 1–2 **lifestyle** shots.
- Upload roles: `hero`, `thumbnail`, `gallery-01`…`gallery-15`, `detail-01`…`detail-05`, `video-01`…`video-05`. For videos, skip the transform. (GIFs are retired — use a short MP4 instead.)
- The system crops to 4:5, converts to WebP, and puts each on the CDN — Em just sends the photos.

## Worked example — The Sunkeeper

| Field                           | Value                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| title                           | The Sunkeeper                                                                               |
| headline                        | A garden where time stands still                                                            |
| story_card                      | *The Sunkeeper stands watch …* (2–8 paragraphs in Em's voice)                               |
| description                     | Handcrafted miniature garden scene with warm LED lighting and hand-placed botanicals.       |
| features                        | Warm LED glow with 3 modes; Hand-placed dried botanicals; USB-C powered (adapter included)  |
| price                           | $245.00                                                                                     |
| dimensions                      | 8" W x 6" D x 10" H                                                                          |
| weight                          | 2.5 lbs                                                                                     |
| materials                       | Wood, resin, LED lights, natural moss, dried flowers                                        |
| power_supply                    | USB-C (adapter included)                                                                     |
| care_instructions               | Dust gently with a soft brush; Keep away from direct sunlight                               |
| shipping_details                | Ships within 3–5 business days; Insured shipping included                                   |
| product_type                    | miniature                                                                                   |
| series                          | Portals to Peace                                                                            |
| available / quantity / featured | true / 1 / true                                                                             |

## Before you create

Always hand Em the **preview link** the create/edit returns — that's the real review ("here's how
shoppers will see it"), better than reading fields back. Never create without the required photo set
(at least 1 hero + 5 gallery + a thumbnail = 7 minimum; detail/video are extras), and
never set a price different from what she told you. You **can edit** a product now (copy, photos,
SEO) — edits stage as a draft she previews, then publishes. The only frozen things after publish are
the **checkout identity** fields (name / description / image); **price you can change anytime** — it
rotates in place on the same product/URL, effective immediately; for a temporary sale, make a
coupon.

## Draft → Preview → Publish

Creating or editing a product makes a **draft** plus a private **preview link** — nothing is live yet.
Hand her that link; it's exactly how shoppers will see the page. **Publishing** is what makes it live,
and for a brand-new product publishing is what creates the Stripe listing (so it becomes purchasable).
The preview link rotates when you publish — the old one stops working, which is expected. On a
*published* product, price / availability / stock changes skip this and go live immediately; copy, SEO,
and photo edits stage as a draft to preview first. If she changes her mind about staged edits, discard
them and the live page is untouched.

## Coupons

Discounts are **percent off** or a **fixed amount off** (in cents). Optional: a code she names (else
Stripe generates one), a product scope (limit it to specific pieces — those must be published, since a
draft has no Stripe product id yet), a minimum order amount, an expiry, and a redemption cap. You can
**list the active sales** and **deactivate** one anytime. No buy-one-get-one / "buy N" — Stripe can't
do that natively. (These are Em's own sales; the store's automatic cart-recovery and newsletter codes
run behind the scenes and don't show up here.)

## Media (optional video on the page)

A product page can carry one or more short **MP4 clips** via the `media` array. Upload each MP4 like a
photo (skip the transform), then **ask her, per clip,** how it should behave: autoplay + loop silently
with no buttons (GIF-like), or a play button she presses (the default — click-to-play with sound; she
can add a still `poster` image to show first). YouTube is a **rare** fallback for when she has an actual
YouTube link; MP4s always render before any YouTube. Leave `media` empty and the section just hides. No
GIFs — an MP4 looks better and is smaller.

## Archive / resurface (there is no delete)

"Removing" a piece **archives** it — it leaves the shop and feed but stays findable, and you can
resurface it later. There is no hard delete. Separately, a product row may carry a `draft` object
(edits she previewed but hasn't published yet); the **top-level** fields are the live copy shoppers see
right now, so never report a `draft` value as if it were live.
