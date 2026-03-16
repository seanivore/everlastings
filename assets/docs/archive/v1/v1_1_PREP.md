# Everlastings by Emaline Website

**Created**: 2025-12-07 (v0), 2026-03-16 (v1)
**Domain**: `everlastingsbyemaline.com`
**Version**: v1.1
**Status**: Pre-development, architecture finalized

---

## Overview

All v0 planning documents (Dec 2025) have been processed and distilled into v1 documents. Only what is needed for planning and building has been retained. Architecture has been updated to reflect lessons learned from freelance-payments and 360-design projects.

**Key documents:**
- `v1_1_BRAND.md` — Voice, copy, visual design reference
- `v1_1_IMPL_GUIDE.md` — Exclusively executable implementation guide
- `EVERLASTINGS_STORE.md` — All-purpose architecture document
- `PRODUCT_GUIDE.md` — Client-facing product entry guide

---

## Architecture: Vercel + Supabase + Cloudflare R2

Shifted from the original v0 plan (GitHub Pages + Actions + JSON files) based on hard constraints:

1. **No GitHub Actions** — too buggy, phantom files, wrong commits
2. **No git in client workflow** — Emy is non-technical, needs web UI
3. **Stripe Embedded Checkout from day one** — no Payment Links

```
Frontend (Vanilla HTML/CSS/JS on Vercel)
  index.html - shop.html - product.html - admin - about - contact - checkout
  JS fetches product data from Supabase
  Stripe.js renders embedded checkout
        |
        v
Vercel Serverless Functions (TypeScript)
  /api/checkout.ts    - Stripe session creation
  /api/webhook.ts     - Stripe payment events
  /api/stripe-sync.ts - Product+Price creation
  /api/products.ts    - Product CRUD (admin auth)
  /api/upload.ts      - Image upload to R2
  /api/subscribe.ts   - Newsletter email capture
  /api/contact.ts     - Contact form handler
        |               |
        v               v
  Supabase          Cloudflare R2
  (products,        (Product images,
   orders,           brand assets)
   subscribers,
   site_config,
   Auth + RLS)
```

---

## Feedback

Sean's notes while organizing development requirements:

1. "Collections" tab
   - Confusing — should be labeled "Shop" from shopper's perspective
   - Make the "Collections" filter extra prominent instead
   - When a collection filter is applied, use a specific collection page with image header

2. Tags
   - Separate tags by type (series, product_type, availability) even though treated the same
   - Series/Collections: Portals to Peace, Book Nooks, Story Lofts, Seasonal, Limited Edition
   - Different from Navigation grouping — nav can group tags differently

---

## High-Level Requirements

### Functionality

- Host checkout (Stripe Embedded)
- Shipping options
- Inventory tracking (real-time updates, "Sold" badge, quantity management)

### Performance

- Lazy image loading from CDN
- Lighthouse 90+ all categories
- < 3s load, < 1.5s FCP

---

## Navigation Content

### Header Nav

- Home
- Shop
  - **All** — no filter
  - Portals to Peace Series
  - (Auto-add new series from Supabase)
  - Book Nooks & Story Lofts
  - Seasonal & Limited Pieces
  - Sold Archive
- About Emaline
- Story & Philosophy
- Commissions
- Contact

### Footer Nav

- FAQ
- Shipping & Returns
- Policies
- Newsletter Signup (CTA: "Step Into Elsewhere", email only)
- Social Media Links (Instagram, Facebook, Pinterest, TikTok)

---

## Content

### Home

Long landing page with most content — smooth UX, not segregated.

- Hero: large image + overlay text + CTA "Enter Elsewhere"
- Intro block (poetic summary)
- Featured pieces carousel (4-6 top pieces from Supabase)
- Brand pillars: Story, Craftsmanship, Sanctuary
- Testimonial strip (placeholder for future)
- Dynamic theme rotation (CSS variables from site_config)
- Theatrical lighting effect (CSS masks + scroll transforms)

### Shop

- Clean grid, filters by series/product_type/availability
- Product tiles: photo, title, price, "Sold" badge
- Sort by price, date, name
- Click through to product page

### Product Page

**Two-column layout:**
- Left: Story card (2-8 poetic paragraphs)
- Right: Details + purchase

**Required:** Title, story card, description, features, 7-15 photos, price, Add to Cart, Buy Now, care instructions, shipping details

**Optional:** "Hold This Piece" email request, artist note, behind-the-scenes photos, lighting mode demos

### About Emaline

> "When my world cracked open, I built something small enough to hold."

Origin story, connection to Dan, WNC homage. Tone: depth + hope + artistry + authenticity.

### Story & Philosophy

- What "Elsewhere" means
- What "Everlasting" means
- Commitment to craft
- Approach to storytelling

### Commissions

Custom nooks, memory-based pieces, seasonal, sacred pieces, milestone gifts.
Intake form: name, email, inspiration, colors, photo upload, timeline, budget.
Starting at $200+.

### Contact

Simple: Name, Email, Subject, Message. Option to inquire about commissions.

### Footer pages

FAQ, Shipping & Returns, Policies, Newsletter ("Step Into Elsewhere")

---

## Branding

**Miniatures are**: Portals to Peace
**Product page feeling**: Magic, sanctuary, nostalgic, gentle embrace
**Copy tone**: Warm, poetic, healing, hopeful, otherworldly, emotionally resonant
**Design**: Minimalist, elegant
**Font**: Cormorant Garamond (display) + system fonts (body)

### Logo

- 1950s silhouette, miniature house cupped in hands
- Deep plum/wine silhouette, arc text, lace hemline

### Tagline

> **Handcrafted havens for the stories that stay.**

### Color Palette

- Deep Plum (#4A1942), Dusty Lavender (#B8A5C8), Fog Gray (#D4D4D4)
- Cream (#FFF8E7), Soft Gold (#D4AF7A), Ink Black (#1A1A1A)
- Special: Deep Star Blue (#1B3A52), Amethyst (#9B6B9E)

### SEO

Keywords: magic, miniatures, handcrafted, book nooks, artisan.
Every product needs: meta description, SEO title, alt text on images.

---

## Build Order

See `v1_1_IMPL_GUIDE.md` for the complete 10-session build plan.

| Session   | Focus                                     | Est. Hours |
| --------- | ----------------------------------------- | ---------- |
| 1         | Foundation (Vercel, Supabase, R2, Stripe) | ~3         |
| 2         | Design System                             | ~3         |
| 3         | Product Page                              | ~4         |
| 4         | Stripe Integration                        | ~4         |
| 5         | Shop Grid + Filters                       | ~3         |
| 6         | Homepage                                  | ~5         |
| 7         | Header, Footer, Nav                       | ~2         |
| 8         | Remaining Pages                           | ~3         |
| 9         | Admin UI                                  | ~3         |
| 10        | SEO, Testing, Launch                      | ~3         |
| **Total** |                                           | **~33**    |

---
