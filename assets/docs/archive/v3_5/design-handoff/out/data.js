/* ============================================================================
   Content Creator Portal — data.js   (DESIGN MOCK, not a data source)

   Shapes match data-flow.md / the live Postgres schema line-for-line so the
   gap-review + integration pass can swap these arrays for real API responses
   without touching markup. Money is INTEGER CENTS everywhere (render with
   money()). State is COMPUTED (computeState) exactly per the contract.

   PROVENANCE
   - products[0..7]  : REAL rows pulled from the dev database (titles, slugs,
                       skus, prices, qty, series, dimensions, materials, image
                       counts, thumbnails are the live values).
   - products[8..11] : ILLUSTRATIVE rows (flagged `_illustrative:true`) added
                       only because the live DB carries draft / edits / sold /
                       archived states on test-junk rows we didn't want to show.
                       Same shape; safe to delete once real ones exist.
   - orders[]        : REAL rows (incl. the genuine 2-piece payment intent
                       pi_3Tmfni… where one piece is refunded and one is not).
   - coupons[], storeWideSale : ILLUSTRATIVE — coupons live in Stripe, not
                       Postgres, so there's nothing to pull; shapes match the
                       GET /api/products?_action=coupon contract.
   ============================================================================ */
(function () {
  "use strict";

  const CDN = "https://cdn.everlastingsbyemaline.com/test";
  // role-prefixed image set helper (hero + gallery-NN), matching the images jsonb shape
  function imgset(slug, n) {
    const a = [{ url: `${CDN}/${slug}/test_hero-${slug}.webp`, alt: "" }];
    for (let i = 1; i < n; i++) a.push({ url: `${CDN}/${slug}/test_gallery-${String(i).padStart(2, "0")}-${slug}.webp`, alt: "" });
    return a;
  }

  /* ---------------------------------------------------------------- PRODUCTS */
  const products = [
    {
      id: "a2bf5bf3-0000-4000-8000-000000000001",
      sku: "EVE-a2bf5bf3", slug: "the-lantern-keepers-cottage",
      title: "The Lantern Keeper's Cottage", headline: "Someone left the light on for you",
      story_card: "A keeper's cottage at the edge of the headland, one window still warm against the dark. Built for the hour when you want the world to feel small and safe.",
      description: "A hand-built miniature haven: stone-resin walls, a reclaimed-wood frame, and a warm LED that glows from a single lit window. Finished with natural moss and a breath of dried lavender.",
      features: ["Hand-lit single window", "Real dried lavender", "Switch-free always-warm LED"],
      price: 18800, quantity: 1, available: true, featured: true,
      product_type: "miniature", series: "Portals to Peace",
      materials: ["stone resin", "reclaimed wood", "LED", "natural moss", "dried lavender"],
      care_instructions: ["Dust gently with a dry brush", "Keep out of direct sun", "Indoor display only"],
      shipping_details: ["Ships in 3–5 days", "Double-boxed, fully insured"],
      dimensions: '7" W x 6" D x 9" H', weight: "2.2 lbs", power_supply: "USB-C, 5V",
      artist_note: "The first of the keepers. I kept the lavender from my own garden row for this one.",
      images: imgset("the-lantern-keepers-cottage", 7),
      thumbnail: `${CDN}/the-lantern-keepers-cottage/test_thumbnail-the-lantern-keepers-cottage.webp`,
      thumbnail_alt: "Lit cottage window at dusk",
      media: [], seo_title: "The Lantern Keeper's Cottage — Everlastings",
      seo_description: "A hand-built miniature haven with a single warm-lit window.",
      seo_thumbnail: `${CDN}/the-lantern-keepers-cottage/test_thumbnail-the-lantern-keepers-cottage.webp`,
      checkout_name: "The Lantern Keeper's Cottage", checkout_description: "Hand-built miniature haven",
      checkout_image: `${CDN}/the-lantern-keepers-cottage/test_thumbnail-the-lantern-keepers-cottage.webp`,
      is_published: true, published_at: "2026-06-15T18:38:33Z", draft: null, preview_token: null,
      archived_at: null,
    },
    {
      id: "a40677f8-0000-4000-8000-000000000002",
      sku: "EVE-a40677f8", slug: "the-reading-hour",
      title: "The Reading Hour", headline: "The doorway hidden between the pages",
      story_card: "A reading nook caught at golden hour, a tiny lamp leaning over an open book. For the people who keep a chair just for reading.",
      description: "Basswood shelves stacked with miniature cloth books, a brass-finish lamp, and a warm LED behind velvet. A doorway you could almost step through.",
      features: ["Brass-finish working lamp", "Hand-bound cloth books", "Velvet-lined alcove"],
      price: 18500, quantity: 4, available: true, featured: true,
      product_type: "miniature", series: "Book Nooks",
      materials: ["Basswood", "Miniature cloth books", "Brass-finish lamp", "LED", "Velvet"],
      care_instructions: ["Dust gently with a dry brush", "Indoor display only"],
      shipping_details: ["Ships in 3–5 days", "Double-boxed, fully insured"],
      dimensions: '9" H x 5.5" W x 2.5" D', weight: "1.4 lbs", power_supply: "USB-C, 5V",
      artist_note: "", images: imgset("the-reading-hour", 7),
      thumbnail: `${CDN}/the-reading-hour/test_thumbnail-the-reading-hour.webp`,
      thumbnail_alt: "Miniature reading nook at golden hour",
      media: [{ type: "video", url: `${CDN}/the-reading-hour/test_video-01-the-reading-hour.mp4`, loop: true, autoplay: true, controls: false, alt: "The Reading Hour illuminated" }], seo_title: "", seo_description: "", seo_thumbnail: "",
      checkout_name: "The Reading Hour", checkout_description: "Hand-built miniature reading nook",
      checkout_image: `${CDN}/the-reading-hour/test_thumbnail-the-reading-hour.webp`,
      is_published: true, published_at: "2026-06-15T22:46:53Z", draft: null, preview_token: null,
      archived_at: null,
    },
    {
      id: "427c35db-0000-4000-8000-000000000003",
      sku: "EVE-427c35db", slug: "first-snow-stillwood",
      title: "First Snow, Stillwood", headline: "A light kept against the snow",
      story_card: "The first snow of the year settling over a still wood, one lamp holding its ground. Quiet, and a little brave.",
      description: "Resin and reclaimed wood under a drift of faux snow, miniature pines, and a dual-tone LED that shifts from cool dusk to warm window-light.",
      features: ["Dual-tone dusk/warm LED", "Hand-dusted faux snow", "Miniature pine grove"],
      price: 29500, quantity: 1, available: true, featured: true,
      product_type: "miniature", series: "Seasonal",
      materials: ["Resin", "Reclaimed wood", "Faux snow", "Miniature pines", "Dual-tone LED"],
      care_instructions: ["Dust gently with a dry brush", "Keep snow dry", "Indoor display only"],
      shipping_details: ["Ships in 3–5 days", "Double-boxed, fully insured"],
      dimensions: '10" W x 7" D x 8" H', weight: "3.1 lbs", power_supply: "USB-C, 5V",
      artist_note: "", images: imgset("first-snow-stillwood", 9),
      thumbnail: `${CDN}/first-snow-stillwood/test_thumbnail-first-snow-stillwood.webp`,
      thumbnail_alt: "Snowy miniature wood with a single lamp",
      media: [], seo_title: "", seo_description: "", seo_thumbnail: "",
      checkout_name: "First Snow, Stillwood", checkout_description: "Hand-built winter miniature haven",
      checkout_image: `${CDN}/first-snow-stillwood/test_thumbnail-first-snow-stillwood.webp`,
      is_published: true, published_at: "2026-06-15T22:57:57Z", draft: null, preview_token: null,
      archived_at: null,
    },
    {
      id: "aa867f06-0000-4000-8000-000000000004",
      sku: "EVE-aa867f06", slug: "the-tide-library",
      title: "The Tide Library", headline: "Where the sea keeps its stories",
      story_card: "A library that the tide visits, books shelved just above the waterline. For anyone who has ever wanted to read by the sound of the sea.",
      description: "Resin and basswood with shelves of miniature books, a brass-finish lamp, and a dual-tone LED like light through water.",
      features: ["Dual-tone LED", "Miniature shelved books", "Brass-finish lamp"],
      price: 24000, quantity: 1, available: true, featured: false,
      product_type: "miniature", series: "Story Lofts",
      materials: ["Resin", "Basswood", "Miniature books", "Brass-finish lamp", "Dual-tone LED"],
      care_instructions: ["Dust gently with a dry brush", "Indoor display only"],
      shipping_details: ["Ships in 3–5 days", "Double-boxed, fully insured"],
      dimensions: '8" W x 6" D x 9" H', weight: "2.6 lbs", power_supply: "USB-C, 5V",
      artist_note: "", images: imgset("the-tide-library", 7),
      thumbnail: `${CDN}/the-tide-library/test_thumbnail-the-tide-library.webp`,
      thumbnail_alt: "Miniature seaside library",
      media: [], seo_title: "", seo_description: "", seo_thumbnail: "",
      checkout_name: "The Tide Library", checkout_description: "Hand-built miniature haven",
      checkout_image: `${CDN}/the-tide-library/test_thumbnail-the-tide-library.webp`,
      is_published: true, published_at: "2026-06-15T23:00:16Z", draft: null, preview_token: null,
      archived_at: null,
    },
    {
      id: "32769d4e-0000-4000-8000-000000000005",
      sku: "EVE-32769d4e", slug: "the-clockmakers-window",
      title: "The Clockmaker's Window", headline: "Where golden hour lingers longest",
      story_card: "A clockmaker's bench by a west window, gears caught mid-tick, the light never quite leaving. Time, held still on purpose.",
      description: "Resin and reclaimed wood with brass-finish gears and miniature clock faces, lit by a warm LED that keeps the golden hour from ending.",
      features: ["Brass-finish gears", "Miniature clock faces", "Warm always-on LED"],
      price: 31000, quantity: 1, available: true, featured: true,
      product_type: "miniature", series: "Story Lofts",
      materials: ["Resin", "Brass-finish gears", "Miniature clock faces", "Reclaimed wood", "LED"],
      care_instructions: ["Dust gently with a dry brush", "Indoor display only"],
      shipping_details: ["Ships in 3–5 days", "Double-boxed, fully insured"],
      dimensions: '9" W x 6" D x 10" H', weight: "3.0 lbs", power_supply: "USB-C, 5V",
      artist_note: "", images: imgset("the-clockmakers-window", 7),
      thumbnail: `${CDN}/the-clockmakers-window/test_thumbnail-the-clockmakers-window.webp`,
      thumbnail_alt: "Miniature clockmaker's bench at golden hour",
      media: [{ type: "video", url: `${CDN}/the-clockmakers-window/test_video-01-the-clockmakers-window.mp4`, loop: true, autoplay: true }, { type: "youtube", url: "https://youtu.be/PCZR34lX-9w", alt: "Additional video" }], seo_title: "", seo_description: "", seo_thumbnail: "",
      checkout_name: "The Clockmaker's Window", checkout_description: "Hand-built miniature haven",
      checkout_image: `${CDN}/the-clockmakers-window/test_thumbnail-the-clockmakers-window.webp`,
      is_published: true, published_at: "2026-06-16T00:36:12Z", draft: null, preview_token: null,
      archived_at: null,
    },
    {
      id: "efc9c3a9-0000-4000-8000-000000000006",
      sku: "EVE-efc9c3a9", slug: "the-night-train",
      title: "The Night Train", headline: "The last train, and someone is waiting",
      // ILLUSTRATIVE draft overlay → this published piece has staged edits (yellow LED / "edits").
      story_card: "A platform at the far end of the night, the last train slowing, a single figure under the lamp. Somebody always waited up.",
      description: "Resin and reclaimed wood with a miniature train and a warm platform LED.",
      features: ["Warm platform LED", "Miniature train car"],
      price: 22000, quantity: 1, available: true, featured: false,
      product_type: "miniature", series: "Limited Edition",
      materials: ["Resin", "Reclaimed wood", "Miniature train", "LED"],
      care_instructions: ["Dust gently with a dry brush", "Indoor display only"],
      shipping_details: ["Ships in 3–5 days", "Double-boxed, fully insured"],
      dimensions: '11" W x 5" D x 7" H', weight: "2.8 lbs", power_supply: "USB-C, 5V",
      artist_note: "", images: imgset("the-night-train", 7),
      thumbnail: `${CDN}/the-night-train/test_thumbnail-the-night-train.webp`,
      thumbnail_alt: "Miniature night platform with a single figure",
      media: [], seo_title: "", seo_description: "", seo_thumbnail: "",
      checkout_name: "The Night Train", checkout_description: "Hand-built miniature haven",
      checkout_image: `${CDN}/the-night-train/test_thumbnail-the-night-train.webp`,
      is_published: true, published_at: "2026-06-16T00:37:52Z", preview_token: "prev-night-train-1",
      archived_at: null,
      _illustrative: true,
      draft: {
        headline: "The last train home, and someone is waiting up",
        description: "Resin and reclaimed wood with a miniature train, a lit station clock, and a warm platform LED that pools on the boards.",
        features: ["Warm platform LED", "Lit station clock", "Miniature train car"],
      },
    },
    {
      id: "a846cc13-0000-4000-8000-000000000007",
      sku: "EVE-a846cc13", slug: "the-letter-room",
      title: "The letter room", headline: "For the letters we never stopped writing",
      story_card: "A small writing room, a lamp, a desk crowded with paper. For the letters you mean to send and the ones you only ever write.",
      description: "Basswood and resin with a brass-finish lamp, miniature paper, and a warm LED over the desk.",
      features: ["Warm desk LED", "Miniature paper & envelopes", "Brass-finish lamp"],
      price: 24500, quantity: 1, available: true, featured: false,
      product_type: "miniature", series: null,
      materials: ["Basswood", "Resin", "Brass-finish lamp", "Miniature paper", "Warm LED"],
      care_instructions: ["Dust gently with a dry brush", "Indoor display only"],
      shipping_details: ["Ships in 3–5 days", "Double-boxed, fully insured"],
      dimensions: '8" W x 5" D x 9" H', weight: "2.1 lbs", power_supply: "USB-C, 5V",
      artist_note: "", images: imgset("the-letter-room", 7),
      thumbnail: `${CDN}/the-letter-room/test_thumbnail-the-letter-room.webp`,
      thumbnail_alt: "Miniature writing room with a warm lamp",
      media: [], seo_title: "", seo_description: "", seo_thumbnail: "",
      checkout_name: "The letter room", checkout_description: "Hand-built miniature haven",
      checkout_image: `${CDN}/the-letter-room/test_thumbnail-the-letter-room.webp`,
      is_published: true, published_at: "2026-06-26T17:21:36Z", draft: null, preview_token: null,
      archived_at: null,
    },
    {
      id: "6ed8a47d-0000-4000-8000-000000000008",
      sku: "EVE-6ed8a47d", slug: "tide-glass-lantern",
      title: "The Tide-Glass Lantern", headline: "A small light that keeps the dark company",
      story_card: "A lantern made from tide-glass, the kind of light you leave burning so the dark has someone to sit with.",
      description: "Resin and brass-finish with frosted glass and a warm LED that throws soft sea-glass color on the wall.",
      features: ["Sea-glass diffusion", "Warm always-on LED", "Brass-finish frame"],
      price: 21000, quantity: 1, available: true, featured: false,
      product_type: "miniature", series: "Portals to Peace",
      materials: ["Resin", "Brass-finish", "Frosted glass", "Warm LED"],
      care_instructions: ["Dust gently with a dry brush", "Indoor display only"],
      shipping_details: ["Ships in 3–5 days", "Double-boxed, fully insured"],
      dimensions: '6" W x 6" D x 11" H', weight: "2.4 lbs", power_supply: "USB-C, 5V",
      artist_note: "", images: imgset("tide-glass-lantern", 10),
      thumbnail: `${CDN}/tide-glass-lantern/test_thumbnail-tide-glass-lantern.webp`,
      thumbnail_alt: "Sea-glass lantern glowing warm",
      media: [], seo_title: "", seo_description: "", seo_thumbnail: "",
      checkout_name: "The Tide-Glass Lantern", checkout_description: "Hand-built miniature lantern",
      checkout_image: `${CDN}/tide-glass-lantern/test_thumbnail-tide-glass-lantern.webp`,
      is_published: true, published_at: "2026-06-26T19:15:11Z", draft: null, preview_token: null,
      archived_at: null,
    },

    /* ---- ILLUSTRATIVE rows below: states the live DB only has on test junk ---- */
    {
      // DRAFT (red LED) — never published, and blocked: missing share image + story card.
      id: "d1000000-0000-4000-8000-0000000000d1", _illustrative: true,
      sku: "EVE-greenhse1", slug: null, /* slug not locked yet — set on first publish */
      title: "The Greenhouse at Dusk", headline: "Glass, and everything still growing",
      story_card: "", /* required for a miniature — MISSING → blocks publish */
      description: "A lean-to greenhouse going blue at dusk, every pane holding the last of the light.",
      features: ["Warm grow-light LED", "Miniature potted ferns"],
      price: 0, quantity: 1, available: false, featured: false,
      product_type: "miniature", series: "Portals to Peace",
      materials: ["Resin", "Glasswork", "Miniature plants", "LED"],
      care_instructions: [], shipping_details: [],
      dimensions: "", weight: "", power_supply: "",
      artist_note: "Still deciding whether the ferns read as ferns at this scale.",
      images: [{ url: `${CDN}/greenhouse-dusk/hero-greenhouse-dusk.webp`, alt: "" }], /* hero only, gallery < 5 */
      thumbnail: `${CDN}/greenhouse-dusk/thumbnail-greenhouse-dusk.webp`, thumbnail_alt: "",
      media: [], seo_title: "", seo_description: "", seo_thumbnail: "", /* share image MISSING */
      checkout_name: "", checkout_description: "", checkout_image: "",
      is_published: false, published_at: null, draft: null, preview_token: "prev-greenhouse-1",
      archived_at: null,
    },
    {
      // SOLD (no LED color; reached via Sold tab) — published, available off, qty 0.
      id: "50100000-0000-4000-8000-000000000501", _illustrative: true,
      sku: "EVE-cartogr1", slug: "the-cartographers-desk",
      title: "The Cartographer's Desk", headline: "Maps of places that keep moving",
      story_card: "A desk buried in maps of coastlines that won't hold still, a lamp leaning in to help.",
      description: "Resin and basswood, miniature rolled maps, a brass-finish lamp and warm LED.",
      features: ["Warm desk LED", "Miniature rolled maps"],
      price: 26000, quantity: 0, available: false, featured: false,
      product_type: "miniature", series: "Story Lofts",
      materials: ["Resin", "Basswood", "Miniature maps", "Brass-finish lamp", "LED"],
      care_instructions: ["Dust gently with a dry brush", "Indoor display only"],
      shipping_details: ["Ships in 3–5 days", "Double-boxed, fully insured"],
      dimensions: '9" W x 6" D x 8" H', weight: "2.5 lbs", power_supply: "USB-C, 5V",
      artist_note: "", images: imgset("the-cartographers-desk", 7),
      thumbnail: `${CDN}/the-cartographers-desk/test_thumbnail-the-cartographers-desk.webp`,
      thumbnail_alt: "Miniature cartographer's desk",
      media: [], seo_title: "", seo_description: "", seo_thumbnail: "",
      checkout_name: "The Cartographer's Desk", checkout_description: "Hand-built miniature haven",
      checkout_image: `${CDN}/the-cartographers-desk/test_thumbnail-the-cartographers-desk.webp`,
      is_published: true, published_at: "2026-05-20T12:00:00Z", draft: null, preview_token: null,
      archived_at: null,
    },
    {
      // ARCHIVED (no LED color; reached via Archived tab) — a retired seasonal piece.
      id: "a5c10000-0000-4000-8000-0000000000a5", _illustrative: true,
      sku: "EVE-harbor25", slug: "harbor-lights-2025",
      title: "Harbor Lights (2025)", headline: "Last winter's harbor, put away for now",
      story_card: "A harbor strung with winter lights — a one-season piece, resting until it's wanted again.",
      description: "Resin and reclaimed wood, strings of warm micro-LEDs over a miniature harbor.",
      features: ["Warm micro-LED string", "Miniature moored boats"],
      price: 27500, quantity: 1, available: false, featured: false,
      product_type: "miniature", series: "Seasonal",
      materials: ["Resin", "Reclaimed wood", "Micro-LED string", "Miniature boats"],
      care_instructions: ["Dust gently with a dry brush", "Indoor display only"],
      shipping_details: ["Ships in 3–5 days", "Double-boxed, fully insured"],
      dimensions: '12" W x 6" D x 7" H', weight: "3.0 lbs", power_supply: "USB-C, 5V",
      artist_note: "", images: imgset("harbor-lights-2025", 7),
      thumbnail: `${CDN}/harbor-lights-2025/test_thumbnail-harbor-lights-2025.webp`,
      thumbnail_alt: "Miniature winter harbor with string lights",
      media: [], seo_title: "", seo_description: "", seo_thumbnail: "",
      checkout_name: "Harbor Lights (2025)", checkout_description: "Hand-built seasonal miniature",
      checkout_image: `${CDN}/harbor-lights-2025/test_thumbnail-harbor-lights-2025.webp`,
      is_published: true, published_at: "2025-12-01T12:00:00Z", draft: null, preview_token: null,
      archived_at: "2026-03-02T09:00:00Z",
    },
  ];

  /* ------------------------------------------------------------------ ORDERS */
  /* One row per product per checkout. siblings share stripe_payment_intent.   */
  const orders = [
    {
      id: "99542415-9cc7-42ad-a9b0-b7352635fa70", stripe_payment_intent: "pi_3TetNUCdjx9YjCRO0JB7QuIb",
      amount: 24500, status: "shipped",
      customer_email: "admin@everlastingsbyemaline.com",
      customers: { name: "Sean Test", email: "admin@everlastingsbyemaline.com", phone: null },
      shipping_address: { line1: "102 West Townsend Road", line2: null, city: "Lunenburg", state: "MA", postal_code: "01462", country: "US" },
      products: { title: "Placeholder Haven I", slug: "placeholder-haven-i", thumbnail: `${CDN}/placeholder-haven-i/thumbnail-placeholder-haven-i.webp` },
      tracking_number: "7232097278923", tracking_carrier: "USPS",
      shipped_at: "2026-06-05T09:01:52Z", tracking_email_sent_at: "2026-06-05T09:01:53Z",
      created_at: "2026-06-05T08:45:24Z",
    },
    {
      id: "67c315cc-f420-4d73-b0d5-e27f94477027", stripe_payment_intent: "pi_3Tet2ECdjx9YjCRO1SE3AufF",
      amount: 18500, status: "completed",
      customer_email: "horvathaugust@gmail.com",
      customers: { name: "Sean Horvath", email: "horvathaugust@gmail.com", phone: null },
      shipping_address: { line1: "102 West Townsend Road", line2: null, city: "Lunenburg", state: "MA", postal_code: "01462", country: "US" },
      products: { title: "The Reading Hour", slug: "the-reading-hour", thumbnail: `${CDN}/the-reading-hour/test_thumbnail-the-reading-hour.webp` },
      tracking_number: null, tracking_carrier: null, shipped_at: null, tracking_email_sent_at: null,
      created_at: "2026-06-27T09:23:54Z",
    },
    {
      id: "5fd62d69-913a-49b4-b003-acaba2669a8a", stripe_payment_intent: "pi_3Tiq4bCdjx9YjCRO063sDC46",
      amount: 31000, status: "shipped",
      customer_email: "horvathaugust@gmail.com",
      customers: { name: "Sean Horvath", email: "horvathaugust@gmail.com", phone: null },
      shipping_address: { line1: "102 Lunenburg Road", line2: null, city: "Townsend", state: "MA", postal_code: "01474", country: "US" },
      products: { title: "The Clockmaker's Window", slug: "the-clockmakers-window", thumbnail: `${CDN}/the-clockmakers-window/test_thumbnail-the-clockmakers-window.webp` },
      tracking_number: "9400 1112 2233 4455 6677 88", tracking_carrier: "USPS",
      shipped_at: "2026-06-16T06:05:45Z", tracking_email_sent_at: "2026-06-16T06:05:46Z",
      created_at: "2026-06-16T06:02:12Z",
    },
    /* ---- the genuine 2-piece payment intent ----
       Real-world note from Sean: BOTH pieces were refunded in Stripe (money out
       on both). The status difference below is the RELIST decision, not the
       refund: "First Snow" was not relisted (line reads refunded), "The letter
       room" was relisted and is back in the shop (line stays completed). Refund
       and relist are independent per-piece decisions — the refund panel must
       show them separately. Status values are kept exactly as the dev DB has them. */
    {
      id: "3f443ca8-8dbe-493e-b8e9-bd5232a1449c", stripe_payment_intent: "pi_3TmfniCdjx9YjCRO10b4BCA1",
      amount: 24500, status: "completed",
      customer_email: "horvathaugust@gmail.com",
      customers: { name: "Sean Horvath", email: "horvathaugust@gmail.com", phone: null },
      shipping_address: { line1: "102 Lunenburg Ave", line2: null, city: "West Townsend", state: "MA", postal_code: "01474", country: "US" },
      products: { title: "The letter room", slug: "the-letter-room", thumbnail: `${CDN}/the-letter-room/test_thumbnail-the-letter-room.webp` },
      tracking_number: null, tracking_carrier: null, shipped_at: null, tracking_email_sent_at: null,
      created_at: "2026-06-27T20:21:08Z",
    },
    {
      id: "dd750cf9-675e-4491-86c8-e951c271bf20", stripe_payment_intent: "pi_3TmfniCdjx9YjCRO10b4BCA1",
      amount: 29500, status: "refunded",
      customer_email: "horvathaugust@gmail.com",
      customers: { name: "Sean Horvath", email: "horvathaugust@gmail.com", phone: null },
      shipping_address: { line1: "102 Lunenburg Ave", line2: null, city: "West Townsend", state: "MA", postal_code: "01474", country: "US" },
      products: { title: "First Snow, Stillwood", slug: "first-snow-stillwood", thumbnail: `${CDN}/first-snow-stillwood/test_thumbnail-first-snow-stillwood.webp` },
      tracking_number: null, tracking_carrier: null, shipped_at: null, tracking_email_sent_at: null,
      created_at: "2026-06-27T20:21:08Z",
    },
  ];

  /* ----------------------------------------------------------------- COUPONS */
  /* ILLUSTRATIVE — Stripe-owned; shapes match GET /api/products?_action=coupon */
  const coupons = [
    {
      code: "WELCOME10", promotion_code_id: "promo_1AbcWELCOME", percent_off: 10, amount_off: null,
      amount_display: null, min_amount: null, min_display: null,
      times_redeemed: 7, max_redemptions: null, expires_at: null, expires_display: null,
      store_wide: true, product_ids: null,
    },
    {
      code: "LANTERN25", promotion_code_id: "promo_2DefLANTERN", percent_off: null, amount_off: 2500,
      amount_display: "$25.00", min_amount: 20000, min_display: "$200.00",
      times_redeemed: 2, max_redemptions: 25, expires_at: 1782604800, expires_display: "Jun 30",
      store_wide: false, product_ids: ["prod_lantern", "prod_tideglass"],
    },
  ];

  /* the new no-code automatic store-wide sale (v3.5). null = none running. */
  const storeWideSale = {
    active: true, type: "percent", value: 15, // 15% off everything, no code
    amount_display: "15% off", started_at: "2026-06-20T00:00:00Z", expires_display: null,
  };

  /* ------------------------------------------------------------------ CONFIG */
  const config = { publishableKey: "pk_test_…", isTest: true, siteUrl: "https://everlastingsbyemaline.com" };

  /* --------------------------------------------------- ACTIVITY LOG (v3.5 stub)
     ILLUSTRATIVE. Wire to a Postgres `activity_log` audit table (see INTEGRATION.md).
     Each row: { at: ISO8601, actor: email, action: machine key, summary: human text }.
     Empty array → the card shows its empty state. */
  const activityLog = [
    { at: "2026-06-28T15:42:00Z", actor: "admin@everlastingsbyemaline.com", action: "product.publish", summary: "Published “The Reading Hour”" },
    { at: "2026-06-28T15:31:00Z", actor: "admin@everlastingsbyemaline.com", action: "sale.create", summary: "Created sale “SAVEILDA” — 40% off" },
    { at: "2026-06-28T14:08:00Z", actor: "admin@everlastingsbyemaline.com", action: "order.refund", summary: "Refunded $185.00 on order #67c315cc" },
    { at: "2026-06-27T19:50:00Z", actor: "admin@everlastingsbyemaline.com", action: "product.update", summary: "Staged edits on “The Night Train”" },
    { at: "2026-06-27T11:20:00Z", actor: "admin@everlastingsbyemaline.com", action: "order.ship", summary: "Marked order #5f0c-letter shipped" },
  ];

  /* -------------------------------------------------- computed state (contract) */
  function computeState(p) {
    if (p.archived_at) return "archived";              // tab only, no LED color
    if (!p.is_published) return "draft";               // red
    if (p.is_published && p.draft) return "edits";     // yellow
    if (p.is_published && !p.available) return "sold";  // tab only, no LED color
    return "live";                                      // green
  }
  function money(cents) {
    if (cents == null) return "—";
    return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  window.PORTAL_DATA = { products, orders, coupons, storeWideSale, config, activityLog, computeState, money };
})();
