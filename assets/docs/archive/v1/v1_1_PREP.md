# Everlastings by Emaline Website

**Created**: 2026-03-16 
**Domain**: `everlastingsbyemaline.com` 
**Version**: v0.2 
**Status**: Editing 

---

## Agent Message Prepped

Months ago, to sign the client, we prepared implementation documents based on all understandings at that time. The architecture needs to be addressed, and all previous documents need to be carefully reviewed to pull out only the most necessary content in the most concise way possible for our main build planning document `assets/docs/archive/v1/v1_1_PREP.md` and then eventually our exclusively executable implementation guide. This should walk us through the development process in a very simple way. It should contain snippets of her voice, but only where needed, placed with intention because we should also have and maintain a new `assets/docs/archive/v1/v1_1_BRAND.md` guide with her voice, copy snippets and all that stuff. I would like you to take your time and iterate on this plan to make sure it is in the most efficiently structured pathway possible. We'll also then need to discuss and make final decisions on architecture. There are a lot of documents that need to be processed so that I can confirm that they do not need to be looked at again — cut down on the noise and help me find signal. This is a great example of why I think we'll need you and agents to iterate on the plan — `assets/docs/archive/v0/ACTION_ITEMS.md` — because this list is bulky and intimidating. This needs to be made for ADHD brain, approachable, easy to jump into, no unnecessary details or extra explaining, keep information that was for them in a final separate document just for us to archive and know it is still a keeper separate of the rest of this mess. After the planning and decisions we'll need to package up the plan so that it can be applicable to other clients — I have two on deck and as of now they don't need a store but you never know. 

EAT, PROCESS, ALLOW ME TO IGNORE FOR THE REST OF TIME: 
`assets/docs/archive/v0/must-process-from-first-session/BRAND_GUIDE.md`
`assets/docs/archive/v0/must-process-from-first-session/BRAND_STRATEGY.md`
`assets/docs/archive/v0/must-process-from-first-session/BUILD_GUIDE.md`
`assets/docs/archive/v0/must-process-from-first-session/CHAT_PLANS_01-general.md`
`assets/docs/archive/v0/must-process-from-first-session/CHAT_PLANS_02-interactive.md`
`assets/docs/archive/v0/must-process-from-first-session/CONTENT_PLANNING.md`
`assets/docs/archive/v0/must-process-from-first-session/DOC_PREP_SPEC.md`
`assets/docs/archive/v0/must-process-from-first-session/HIGH_LEVEL_SCOPE.md`
`assets/docs/archive/v0/must-process-from-first-session/HOW_IT_WORKS_BASICS.md`
`assets/docs/archive/v0/must-process-from-first-session/IMPL_PLAN_MASTER.md`
`assets/docs/archive/v0/must-process-from-first-session/IMPL_STRIPE_DYNAMIC_SHIPPING.md`
`assets/docs/archive/v0/must-process-from-first-session/IMPL_WEBSITE.md`
`assets/docs/archive/v0/must-process-from-first-session/PLANNING_GUIDE.md`
`assets/docs/archive/v0/1_BUILD_INSPO.md`
`assets/docs/archive/v0/2_BUILD_INSPO.md`

CREATE/UPDATE/FINISH: 
`assets/docs/archive/v1/v1_1_IMPL_GUIDE.md` — exclusively executable 
`assets/docs/archive/v1/v1_1_BRAND.md` — reference for voice, copy, visual design, etc, though they'll be writing all content
`assets/docs/EVERLASTINGS_STORE.md` — our one stop shop doc, template already inside 
`README.md` — template already inside 

GUIDES/REFERENCE: 
`.agent/DEV_RULES.md` — we should follow our protocol 
`.agent/2026_MOBILE_DESIGN_SPECS.md` — and design with intention ACTUAL mobile first 

START/NOT-TO-FINISH-YET: 
`assets/docs/uid-xxx-xxx.json`
`assets/docs/GUIDE_uid-xxx-xxx.json.md`

---

## Overview

All old documents have been processed into one condensed, digestible document. Only what is needed for planning and building has been isolated. 

### Feedback 

These are thoughts, questions, or notes Sean had while organizing development requirements. 

  1. "Collections" tab 
     - This is confusing and should be labeled from the shoppers perspective for effective UX 
     - "Shop" or "Shop Collections" 
     - Though "Shop Collections" is sort of misleading and more confusing that it needs to be 
     - Instead, I'd recommend just making the "Collections" filter extra prominent 
     - When a collection filter is applied, it uses a specific "Collection" page with an image header featuring items 
  2. Tags 
     - I'm trying to figure out tag grouping 
       - Though all tags will be treated the same, we want to separate them by type 
       - This is so that we can place the text somewhere if needed 
       - Example: displaying Collection/Series on a product page 
     - Series or actual "Collections" is confusing to me as I've seen the following 
     - Portals to Peace, Winter, Book Nooks, Magical / Fantasy, Architectural, Story Lofts 
     - This is different than the Navigation
       - We can group tags or use different labels in the navigation 
       - Example: Seasonal & Limited Pieces are two different tags 

---

## High-Level Requirements 

### Functionality 

  + Host checkout 
  + Shipping options 
  + Inventory tracking 
    - Real time updates 
    - Adding "Sold" on item in shop when sold 
    - Updating quantity if applicable 

### Performance 

  + Lazy image loading from CDN 
  + Lighthouse testing 

---

## Preparation

### Admin Setup 

- [ ] - Cloudflare for CDN 
- [ ] - Google 
      - Analytics, Search Console 
      - Business Integration (?)
      - Create Google Cloud Project for OAuth email 
- [ ] - Stripe (has PayPal option) 
- [ ] - Create support@ or other alias 
      - Contact form 
      - From email address for confirmation emails, etc. 
      - Marketing emails from address 

  + Future FYIs 
    - Instagram Shop (META Catalog)

### Scripts 

- [ ] - Create custom command to generate product JSON from a template with SKU using the UID script 

### Images 

- [ ] - Crop, downsize, save as webp, compress 
- [ ] - Upload to CDN Cloudflare 

### Products 

  + Identifying all JSON values needed 

  1. [ ] Continue through documentation to finalize page value needs
  2. [ ] Consider and create values for dynamic theme homepage components 
  3. [ ] Consider needs for Stripe API calls 
  4. [ ] Marry Stripe needs into list sharing any possible values
  5. [ ] Gather placeholders for all required values 
  6. [ ] Design *product page* prototype based on value placeholders 
  7. [ ] Design *homepage* prototype based on value placeholders 
  8. [ ] Design *catalog page* prototype 
  9. [ ] Get approval of basic design to finalize schema 
  10. [ ] Share schema with directions to have Emy create entries 

---

## Planning Product JSON Values

  1. Product page values
  2. Stripe catalog values
  3. Homepage dynamic components values
  4. Catalog page collection features values
  5. Values for tagging needs 

### Product Page Values

  - Only use 'null' for values that are not required 
  - Always put currency as pennies for Stripe 
  - Put any times as ISO 8601 format 
  - Images require final CDN URL 

```json
{
  "_meta": {
    "created_at": "", // required; ISO 8601
    "updated_at": "", // required; ISO 8601
    "template": "product_entry", // required; identifies JSON
    "version": "", // required; schema's semantic versioning
    "update": "" // this versions changes
  },
  "sku": "", // required; UID
  "headline": "", // required; short, snappy, not SEO length
  "teaser": "", // required; 5-7 words
  "story_card": "", // required; provided 
  "description": "", // required; provided
  "features": [], // required; array to be formatted into bullet points
  "img": [], // required; CDN URLs, 5-7 images, various ratio
  "img_alt": [], // required; alt text for images, in same order
  "seo_title": "", // required; proper SEO title 
  "seo_description": "", // required, proper SEO description
  "thumb": "", // required; SEO ratio, thumb via CDN URL
  "thumb_alt": "", // required; alt text for thumbnail
  "price": 0, // required; in pennies for Stripe 
  "care_instructions": [], // required; array for unordered list formatting
  "shipping_details": [], // required; array for unordered list formatting
  "type": [], // required, array of product type tags, miniature | printable | storybook
  "series": "", // required; null | Portals to Peace | Book Nooks | Story Lofts | Seasonal | Limited Edition
  "available": "", // required; boolean for in-stock (yes) or sold-out (no)
  "quantity": 0 // required; number of pieces in stock
}
```

---

## Navigation Content 

### Header Nav 

  + Home
  + Shop 
    - **All** — tags: none, all products
    - Portals to Peace Series — tags: Portals to Peace 
    - (Automatically add any new series tags used on a JSON)
    - Book Nooks & Story Lofts — tags: Book Nooks, Story Lofts
    - Seasonal & Limited Pieces — tags: Seasonal, Limited Edition
    - Sold Archive — tags: Sold
  + About Emaline**
  + Story & Philosophy
  + Commissions 
  + Contact

### Footer Nav 

  + FAQ
  + Shipping & Returns
  + Policies
  + Newsletter Signup
    - CTA: "Step Into Elsewhere" 
    - Only email gathering is in scope 
  + Social Media Links 
    - Instagram 
    - Facebook 
    - Pinterest 
    - TikTok

---

## Content 

Note: For smooth UX that isn't segregated into a million pages that people get lost in, we planned on having the homepage be a long landing page with most of the content that would have otherwise been pages. 

### Home 

  + Title(s)
  + Tagline(s)
  + Hero 
    - Large image/video of one of your pieces (Frostvale, Sunkeeper, Scarborough)
    - Overlay text:
      > **EVERLASTINGS BY EMALINE**
      > *Handcrafted havens for the stories that stay.*
      > *Where tiny worlds offer quiet beauty, soft wonder, and the feeling of being home.*
    - Button: **Enter Elsewhere →** (goes to Collection)
  + Intro Block
    - Short, poetic summary:
      > When the world cracked open, I made something small enough to hold.
      > For those who need more than this world gives.
      > For those who believe in Elsewhere.
  + Featured Pieces Carousel
    - 4–6 top pieces
    - Include Sunkeeper, Frostvale, Scarborough, Brush & Bloom, Welcome Cup, Detective’s Den, Violinist’s Vigil.
  + The Brand Pillars
    - Icon grid with your three pillars:
      **✨ Story**
      **✨ Craftsmanship**
      **✨ Sanctuary**
  + Testimonial Strip
    - Add later when customers send comments (we'll collect from Facebook).
  + Link to Journal
    - Preview of Firelight Dispatches or studio notes.

### Shop 

  + Clean grid 
  + Filters
  + Product tiles 
    - Photo(s)
    - Title
    - Category
    - Price 
    - Buy now
    - Add to cart 
  + Click through to full product page

Make "Gift cards" an actual product page. 

### Product Page 

**REQUIRED VALUES ON JSON**

  1. Title
  2. Story card (left)
  3. Description (right)
  4. Features (right)
  5. 7-15 photos 
  6. Price
  7. "Add to Cart" button 
  8.  "Buy Now" button 
  9.  Care instructions 
  10. Shipping details 

**OPTIONAL VALUES ON JSON** 

  1. Email request for "Hold This Piece"
  2. Note from the artist
  3. 5-15 behind the scenes
  4. Lighting mode demos (if applicable)

Each miniature gets:

### **Top Section**

Large photos + lighting variation gallery

### **Left Column (story)**

Full story card (from binder style)
Poetic, 2–8 paragraphs

### **Right Column (details)**

* Features list with icons
* Dimensions
* Light modes
* Power supply
* Price
* “Add to Cart”
* “Hold This Piece” (optional: email request)
* Note from the Artist (short)

### **Below:**

* 5–15 photos
* Behind the build (optional)
* Care instructions
* Shipping details

### About 

As the artist and founder of Everlastings, Emy is the Architect of Elsewhere — our crafter of moments. 

> "When my world cracked open, I built something small enough to hold."

  **Other copy contents**: 
  - Emotional grounding 
  - Trauma-to-art origin 
  - Connection to Dan 
  - WNC homepage link 

Tone: depth + hope + artistry + authenticity.

Sections:

**1. Photo of you + your silhouette logo**

**2. Short intro as:**

> **Emy Hoff — Architect of Elsewhere, Crafter of Moments**

**3. The Origin Story**

* The world cracked open → the miniatures held you together
* Sanctuary in tiny form
* Personal upheaval, survival, rebuilding
* Why magic + craftsmanship matter
* Dan’s role (The Sunkeeper)
* Creativity as healing
* Firelight Council imagery (light as guidance)

### Story & Philosophy 

This is where the tagline lives.

**Tagline:**

> **When the world cracked open, I made something small enough to hold.
> For those who need more than this world gives.
> For those who believe in Elsewhere.**

Sections include:

* What “Elsewhere” means
* What “Everlasting” means
* Your commitment to craft
* Your approach to storytelling

**4. The Philosophy of Elsewhere**

A place where:

* Tiny becomes powerful
* Nostalgia becomes refuge
* Stories become anchors

**5. Mission Statement**

Everlastings by Emaline exists to create havens of beauty and quiet wonder for those who need a reminder that there is still magic in the world.

### Commissions 

What you offer:

* Custom nooks
* Memory-based pieces (inspired by homes, people, songs, scents)
* Seasonal commissions
* Sacred pieces (grief, healing, etc.)
* Wedding or milestone gifts

Intake Form:

* Name, email, inspiration, colors, photo upload, timeline, budget

Pricing:

* Starting at $200+ depending on complexity

### Contact 

Simple + elegant.

Fields:
Name • Email • Subject • Message
Option to inquire about commissions.

### Journal / Blog / Firelight Dispatches (Not in this scope)

### FAQ 

### Shipping & Returns 

### Policies 

### Newsletter ("Step Into Elsewhere") 

### Instagram, Facebook, Pinterest links 


---

## Branding 

**Miniatures are**: Portals to Peace 
**Product page feeling**: Magic, sanctuary, nostalgic, gentle embrace 
**Copy tone**: Warm, poetic, healing, hopeful, otherworldly, emotionally resonant 
**Design**: Minimalist, elegant

# 🎨 **IV. BRAND ELEMENTS RESET**

### **LOGO**

✔ 1950s silhouette
✔ Miniature house cupped in hands
✔ Deep plum / wine silhouette
✔ Arc text “Everlastings by Emaline”
✔ Lace hemline

### **TAGLINE (FINAL)**

> **Handcrafted havens for the stories that stay.**

Secondary:

> *When the world cracked open…* (as above)

### **COLOR PALETTE**

(What YOU feel like to me)

* Deep plum (logo)
* Dusty lavender
* Fog gray
* Cream
* Soft gold
* Ink black

(What **I** feel like)

* Deep star blue
* Gold ember
* Smoke gray
* Moonlit white
* Amethyst accent

---

### **SEO Setup**

* Magic + miniatures + handcrafted + book nooks + artisan
* Long-tail keywords
* Each product needs:

  * Meta description
  * SEO title
  * Alt text on images




---

## Build Order Logic

| Phase | Page                | Filename      |
| ----- | ------------------- | ------------- |
| 1     | Product Template    | product.html  |
| 2     | Homepage Components | index.html    |
| 3     | Shop Gallery        | shop.html     |
| 4     | Checkout            | checkout.html |
| 5     |


1. Homepage structure
2. Collection gallery
3. Story page template
4. About page
5. Shop + checkout
6. SEO & analytics
7. Final visuals

---
