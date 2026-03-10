# Everlastings by Emaline Website

**Created**: 2026-03-10 
**Domain**: `everlastingsbyemaline.com` 
**Version**: v0.2 
**Status**: Editing 

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
* Compressed images
* WebP conversion
* Lazy loading
* Google Business integration
Google Analytics
Stripe (has PayPal option)

[emyh@everlastingsbyemaline.com](mailto:emyh@everlastingsbyemaline.com)
future support@ if needed


### Future 
*Items that are not in this build scope but we should be aware of to accommodate in advance*

Instagram shopping (META Catalog)

---

## Entry JSON Planning 

```json
{
  "content": {
    "title": "",
    "story_card": "",
    "description": "",
    "features": "",
    "photos": [
      "array of 7-15 photo relative paths"
    ],
    "price": 0, // required; provided in pennies (just remove decimal for Stripe)
    "care_instructions": "",
    "shipping_details": ""
  },
  "tags": { // all tags are created equal, separation is for dynamic copy display needs
    "product_type": "", // required; miniature | printable | storybook
    "series": "", // required; null | Portals to Peace | Book Nooks | Story Lofts | Seasonal | Limited Edition
    "available": "", // required; boolean for in-stock (yes) or sold-out (no)
    "quantity": 0 // required; number of pieces in stock
  }
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
