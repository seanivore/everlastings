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

- **product_type** — exactly one of: `miniature`, `printable`, `storybook`.
- **series** — one or none of: `Portals to Peace`, `Book Nooks`, `Story Lofts`, `Seasonal`, `Limited Edition`. A brand-new series name is fine — it appears on the site automatically.
- **available** — `true` or `false` (turns `false` automatically when the piece sells).
- **quantity** — a number: `1` for one-of-a-kind, `0` for sold out, higher for editions.
- **featured** — `true` or `false` (controls the homepage carousel).

## The system fills these in — never set them

`slug` (made from the title, permanent), `sku`, the SEO fields, the Stripe IDs, the photo CDN URLs, and the homepage theme.

## Photos — at least 7

- Minimum **7** per product: 1 hero, 1 thumbnail, and at least 5 gallery shots. Ideal is 10–15.
- Good coverage: a clean **hero** (front, well-lit — this is also the thumbnail), 3–4 **angles**, 2–3 **detail** close-ups, 2–3 **lighting** modes, one **scale** reference (next to a familiar object), 1–2 **lifestyle** shots.
- Upload roles: `hero`, `thumbnail`, `gallery-01`…`gallery-15`, `detail-01`…`detail-05`, `video-01`…`video-05`, `gif-01`…`gif-05`. For videos and GIFs, skip the transform.
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

Always show Em a clean **preview** first — title, price in dollars, headline, and the photos grouped by role — and ask "Look right?" Never create with fewer than 7 photos, and never set a price different from what she told you. You can't edit an existing product (that's the admin panel) — so get it right at creation.
