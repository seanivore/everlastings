# Everlastings by Emaline Architecture Overview
`everlastingsbyemaline.com`

**Created**: 2026-03-16
**Updated**: 2026-04-16 — v1.4.0: two-stage checkout with pre-PII availability check, `cart_holds` soft reservations (8th table), shipping pipeline (Shippo web UI + Resend tracking emails), corrected coupon strategy (idempotent `api/_bootstrap/coupons.ts`), single Phase 0 setup block (Phase 1 removed as duplicate of A1), placeholder hygiene, `customer_email_linked` event
**Version**: v1.4.0
**Status**: Pre-development, architecture finalized
**Build Guide**: `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md`

---

## Executive Summary

  + **Purpose**: This document provides everything a new AI instance needs to understand and work on this project effectively; it also serves as comprehensive technical documentation
  + **Use**: Read this first before making any changes

---

## Tech Stack at a Glance

| Layer             | What we use                                                     | Why                                                                                                 |
| ----------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Frontend          | Vanilla HTML + CSS + JS, loaded directly in the browser         | No build step, no framework, no React. Proven pattern.                                              |
| Frontend libs     | `@supabase/supabase-js` + `stripe.js` via jsDelivr CDN          | Script tags only. No npm install for the browser.                                                   |
| Backend           | TypeScript in Vercel Serverless Functions (Node.js)             | Type safety for Stripe + Supabase server-side calls.                                                |
| Backend libs      | `npm install` only inside `/api/*.ts` world                     | `package.json` drives a normal Node/TS toolchain for the API.                                       |
| Runtime           | Vercel (free tier)                                              | Auto-deploy, per-branch env vars, serverless functions.                                             |
| Database          | Supabase Postgres (free tier)                                   | REST API + RLS + Auth + Studio UI.                                                                  |
| Product CDN       | Cloudflare R2 at `cdn.everlastingsbyemaline.com`                | Public CDN for product images/video. Cloudinary is a stateless transformer only — not a host.       |
| Payments          | Stripe Custom Checkout (`ui_mode: 'custom'`)                    | On-site checkout with full brand control.                                                           |
| Email             | Resend                                                          | Transactional email; free tier 3k/mo.                                                               |
| Shipping          | Shippo Starter (web UI only in v1)                              | 30 free USPS labels/mo.                                                                             |
| Analytics         | GA4 (gtag.js) + Meta Pixel                                      | CDN script tags. No GTM.                                                                            |

**What we are NOT using** (and why some vendor docs might suggest these):

  + **No Next.js, no React, no SSR.** Supabase's dashboard "Connect" modal and the `@supabase/ssr` package assume Next.js — ignore them.
  + **No MCP-first toolchain.** Where a standard CLI (Supabase CLI, Stripe CLI, Vercel CLI) does the job, use it. MCP is an optional fallback only.
  + **No Supabase Branching and no Supabase/Vercel Marketplace integration.** Both are optimized for branching-based dev workflows; the `is_test` flag + shared-project design already handles dev/prod separation.

---

## Table of Contents

  1. [Project Overview](#project-overview)
  2. [Architecture Overview](#architecture-overview)
  3. [How to Run & Test Locally](#how-to-run--test-locally)
  4. [File Structure & Key Files](#file-structure--key-files)
  5. [Data Flow](#data-flow)
  6. [Design System & Styling](#design-system--styling)
  7. [Common Pitfalls & Important Notes](#common-pitfalls--important-notes)
  8. [Deployment](#deployment)

---

## Architecture Overview

### System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│              FRONTEND — Vanilla HTML/CSS/JS on Vercel            │
│                                                                  │
│  index.html     shop.html     product.html     checkout.html     │
│  about.html     contact.html     /admin (protected)              │
│                                                                  │
│  - JS fetches product data from Supabase REST API                │
│  - Stripe.js renders custom checkout (ui_mode: 'custom')         │
│  - CSS custom properties for theming                             │
│  - Mobile-first responsive design                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│            VERCEL SERVERLESS FUNCTIONS — TypeScript                 │
│                                                                     │
│  /api/checkout/reserve.ts → Availability check + soft cart hold      │
│  /api/checkout.ts       →  Create Stripe session (requires hold)    │
│  /api/session-status.ts →  Return page: verify payment status       │
│  /api/webhook.ts        →  Handle Stripe payment events             │
│  /api/stripe-sync.ts    →  Create Stripe Product + Price on INSERT  │
│  /api/upload.ts         →  Cloudinary transform → R2 upload         │
│  /api/cart-recovery.ts  →  Sold-in-cart: promo code + Resend email  │
│  /api/products.ts       →  CRUD for AI-assisted product creation    │
│  /api/orders.ts         →  Admin: list orders by shipping status    │
│  /api/orders/[id].ts    →  Admin: record tracking + fire email      │
│  /api/cart-activity.ts  →  Product interest notification            │
│  /api/product-feed.ts   →  CSV feed for Meta Commerce Catalog       │
│  /api/config.ts         →  Public config (Stripe key per env)       │
│  /api/subscribe.ts      →  Newsletter email capture + optional code │
│  /api/contact.ts        →  Contact form handler                     │
│  /api/_emails/          →  Resend templates (tracking, welcome,     │
│                            cart-recovery)                            │
└──────────┬───────────────────────────────────┬──────────────────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────────────┐   ┌────────────────────────────────────┐
│       SUPABASE           │   │       CLOUDFLARE R2                │
│                          │   │                                    │
│  Tables (8):             │   │  /products/{slug}/                 │
│    products              │   │    hero-{slug}.webp                │
│    customers             │   │    gallery-{slug}-01.webp          │
│    orders                │   │    thumbnail-{slug}.webp           │
│    subscribers           │   │    video-{slug}-01.mp4             │
│    site_config           │   │    detail-{slug}-01.gif            │
│    webhook_events        │   │                                    │
│    product_interests     │   │  /brand/                           │
│    cart_holds            │   │    logo.svg, favicon, etc.         │
│                          │   │                                    │
│  Auth: admin login       │   │  Public CDN access via              │
│  RLS: row-level security │   │  cdn.everlastingsbyemaline.com      │
│  DB Webhooks: on INSERT  │   │                                    │
└──────────────────────────┘   └────────────────────────────────────┘
           │
           ▼
┌─────────────────────────┐      ┌────────────────────┐    ┌─────────────┐
│       STRIPE            │      │      RESEND        │    │   SHIPPO    │
│                         │      │                    │    │             │
│  Products + Prices      │      │ Transactional      │    │ Free Starter│
│  Checkout Sessions      │      │  email (tracking,  │    │ Emy's web   │
│  Payment Intents        │      │  welcome coupons,  │    │ UI only in  │
│  Webhooks               │      │  cart recovery)    │    │ v1 — no API │
│  Dynamic promo codes    │      │ Free tier: 3k/mo   │    │ integration │
└─────────────────────────┘      └────────────────────┘    └─────────────┘
```

### Key Architectural Decisions

  1. **Vanilla HTML/CSS/JS over React** — No framework overhead. Emy's catalog will never exceed hundreds of products. Static HTML is faster, simpler to debug, and easier for future developers. Proven pattern from 360-design portfolio.

  2. **Supabase over JSON files in git** — The original v0 plan used JSON files on GitHub Pages with GitHub Actions for automation. This failed in practice: Actions are buggy (phantom files, wrong commits), and the client (Emy) cannot use git. Supabase provides a Postgres database with REST API, auth, row-level security, and a web UI for direct editing — all on the free tier.

  3. **Vercel over GitHub Pages** — Vercel auto-deploys on push (developer only), provides serverless functions for Stripe integration, and requires zero custom CI/CD. GitHub Pages cannot run server-side code.

  4. **Cloudflare R2 over images in git** — Product images (7-15 per product) would bloat the repository. R2 provides CDN-hosted storage at ~$1-5/month with public access URLs.

  5. **Stripe Custom Checkout over Payment Links** — `ui_mode: 'custom'` with Stripe Elements keeps the customer on-site with full UI control. Checkout Sessions API manages tax, shipping, and payment. Pattern proven in freelance-payments project via Stripe quickstart guide.

  6. **No GitHub Actions** — Hard constraint from experience. Too buggy for production automation.

  7. **No git for client** — Emy manages products through admin UI or Supabase Studio. Changes reflect instantly via database, no deploy needed.

  8. **Supabase Database Webhook for Stripe sync** — On INSERT into products table, Supabase fires a webhook to `/api/stripe-sync.ts`, which creates the Stripe Product + Price and writes IDs back. Works for ALL entry methods (admin UI, Supabase Studio, AI assistant via API).

  9. **Cloudinary as stateless image transform layer** — Proven in 360-design project. Raw images uploaded to Cloudinary → transformed (4:5 crop, WebP, compress) → downloaded → uploaded to R2 → deleted from Cloudinary. Stays on free tier.

  10. **AI-assisted product creation** — `POST /api/products` + `POST /api/upload` enable any AI assistant (ChatGPT, Claude) to create products programmatically. See `PRODUCT_PROTOCOL.md`.

  11. **Environment-based Stripe keys** — Vercel env vars scoped by environment. Preview deployments use test keys, production uses live keys. Frontend Stripe key served via `api/config.ts` (not hardcoded).

  12. **GA4 analytics** — `gtag.js` CDN script, no Google Tag Manager. Custom events: view_product, add_to_cart, begin_checkout, purchase, newsletter_signup, and 5 more (see implementation guide).

  13. **Custom `PRODUCT_API_KEY` for external API auth** — Random 64-char string for AI agents and external API access. Replaces `SUPABASE_SECRET_KEY` in all external calls. `SUPABASE_SECRET_KEY` is server-only, never exposed.

  14. **Webhook idempotency** — `webhook_events` table stores processed Stripe `event.id` values. Prevents duplicate processing on retries.

  15. **Source of truth hierarchy** — Supabase (authoritative) > Stripe (payment mirror) > R2 (asset storage) > Frontend (read-only consumer). When in doubt, trust Supabase.

  16. **Meta Pixel + Instagram Shopping** — Base pixel code alongside GA4 in `<head>`. Events fire in parallel with GA4. Server-side CAPI for Purchase deduplication. `api/product-feed.ts` serves CSV for Meta Commerce Catalog sync (Instagram Shopping auto-syncs daily).

  17. **Email capture CTAs** — Product interest CTA (sticky card), cart exit intent modal, 3-minute contemplation popup with 5% off. `product_interests` table tracks email + product slug for real notification capability.

  18. **Availability check BEFORE any PII** (v1.4) — `/cart.html` fires `POST /api/checkout/reserve` on {CHECKOUT} click, creating a 15-min soft hold in the `cart_holds` table. 409 recovery happens on the cart page, before the user has entered address or payment details. Stripe session is created only after the hold is confirmed. See IMPL_GUIDE AR #28, #29.

  19. **Soft cart holds, not hard reservations** (v1.4) — 15-minute TTL. Availability is `products.available = true AND NOT EXISTS (hold by different session)`. No infinite lock; items free after 15 minutes of user inactivity.

  20. **Shipping pipeline: Shippo (labels) + Resend (branded tracking email)** (v1.4) — Emy uses Shippo free-tier UI to print labels (30/mo free) and pastes tracking number into admin UI. `PATCH /api/orders/:id` records tracking and fires a branded tracking email via Resend (free tier, 3k/mo, no credit card).

  21. **Coupon = rule, promotion code = single-use delivery** (v1.4) — Stripe coupons are `Duration: Forever`, `Max redemptions: BLANK`. Every user event generates a unique promotion code via `stripe.promotionCodes.create` with `max_redemptions: 1` and 30-day expiry. Code is emailed via Resend.

  22. **Placeholder hygiene** (v1.4) — Track B hardcoded content wrapped in `<!-- PLACEHOLDER: name -->` tags (and equivalents for CSS/JS). Track C begins and ends with a grep against the codebase to guarantee nothing slips through.

---

## Project Overview

### What This Is

  * **Custom e-commerce website for a handcrafted miniature diorama artist**

  + Artisan storefront with rich storytelling (poetic story cards per product)
  + Stripe Custom Checkout (ui_mode: 'custom') for purchasing one-of-a-kind pieces with standard cart flow
  + Admin UI for non-technical client to manage products
  + Dynamic homepage with rotating themes pulled from product data
  + Template-friendly architecture for two upcoming non-store client sites

### The Core Innovation

  * **Database-driven static site with custom on-site checkout**

  + Products live in Supabase, not in code — client edits content, site reflects instantly
  + Stripe catalog auto-syncs when products are added (via database webhook)
  + No CMS subscription, no framework overhead, no git knowledge required
  + Vercel free tier + Supabase free tier + R2 ≈ $15-75/year total

### Client & Purpose

  * **Client**: Emy Hoff, Everlastings by Emaline
  * **Domain**: everlastingsbyemaline.com
  * **Business**: Handcrafted miniature scenes (dioramas, book nooks, story lofts)
  * **Problem**: Needs professional online store. Non-technical. Previous Squarespace was expensive and limiting.
  * **Solution**: Custom site with admin panel. Near-zero operating costs. Full brand control.

---

## How to Run & Test Locally

### Prerequisites

  + Node.js 18+ (for Vercel CLI)
  + `npm install -g vercel` (Vercel CLI)
  + Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhook`)
  + Supabase project with tables created
  + Cloudflare R2 bucket with public access

### Environment Variables

Create `.env.local` (see also `.env.example` in impl guide):

  ```bash
  # Supabase (new key system, Nov 2025+)
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_PUBLISHABLE_KEY=sb_publishable_...  # frontend-safe, replaces legacy anon key
  SUPABASE_SECRET_KEY=sb_secret_...            # backend only, replaces legacy service_role key

  # Stripe (test keys for dev, live keys for production)
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...

  # Cloudflare R2
  R2_ACCOUNT_ID=your-account-id
  R2_ACCESS_KEY_ID=your-access-key
  R2_SECRET_ACCESS_KEY=your-secret-key
  R2_BUCKET_NAME=everlastings
  R2_PUBLIC_URL=https://cdn.everlastingsbyemaline.com

  # Cloudinary (stateless image transforms)
  CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  ```

**Environment Strategy**: Vercel env vars are scoped per environment. `main` branch → Production (live Stripe keys, served at `everlastingsbyemaline.com`). `dev`/`feat/*` branches → Preview (test Stripe keys, served at auto-generated `*.vercel.app` URLs — these are the dev environment). The shared Supabase project and R2 bucket are kept clean via an `is_test` row flag and a `test/` R2 path prefix. Full conventions: see `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md` > [Environment Strategy](archive/v1_4/v1_4_2_IMPL_GUIDE.md#environment-strategy-reference) and [Dev/Test Data Hygiene](archive/v1_4/v1_4_2_IMPL_GUIDE.md#devtest-data-hygiene-reference).

### Local Development

  ```bash
  # Install dependencies
  npm install

  # Start Vercel dev server (serves static files + API functions)
  vercel dev

  # In a separate terminal, forward Stripe webhooks
  stripe listen --forward-to localhost:3000/api/webhook
  ```

### Testing Checkout Flow

  1. Start local server
  2. Navigate to a product page
  3. Add item to cart, navigate to checkout — Stripe payment form should appear
  4. Use Stripe test card: `4242 4242 4242 4242`
  5. Verify webhook fires and product updates in Supabase

---

## File Structure & Key Files

  ```text
  ~/Development/everlastings-website/
  ├── index.html              # Homepage (long landing page)
  ├── shop.html               # Product grid with filters
  ├── product.html            # Individual product page template
  ├── checkout.html           # Embedded Stripe checkout
  ├── about.html              # About Emaline
  ├── contact.html            # Contact + commissions
  ├── admin/                  # Admin panel (Supabase Auth protected)
  │   └── index.html          # Product management UI
  │
  ├── assets/
  │   ├── css/
  │   │   └── styles.css      # All styles, CSS custom properties
  │   ├── js/
  │   │   ├── main.js         # Shared utilities, Supabase client init
  │   │   ├── product.js      # Product page: fetch + render from Supabase
  │   │   ├── shop.js         # Shop grid: filters, sort, tile rendering
  │   │   ├── homepage.js     # Homepage: featured carousel, theme rotation
  │   │   ├── checkout.js     # Stripe custom checkout mount
  │   │   ├── admin.js        # Admin panel: CRUD, image upload
  │   │   └── newsletter.js   # Newsletter signup handler
  │   ├── docs/               # Project documentation
  │   │   ├── EVERLASTINGS_STORE.md   # This file
  │   │   ├── PRODUCT_PROTOCOL.md     # Client guide + AI creation protocol
  │   │   └── archive/                # v0 and v1 planning docs
  │   ├── favicon/            # Favicon files
  │   └── fonts/              # Cormorant Garamond font files
  │
  ├── api/                    # Vercel serverless functions
  │   ├── checkout.ts         # Create Stripe checkout session (cart items)
  │   ├── session-status.ts   # Return page payment verification
  │   ├── webhook.ts          # Handle Stripe webhooks
  │   ├── stripe-sync.ts      # Create Stripe Product+Price on new product
  │   ├── upload.ts           # Cloudinary transform → R2 upload
  │   ├── cart-recovery.ts    # Sold-in-cart promo code + email
  │   ├── products.ts         # CRUD for AI product creation (service key auth)
  │   ├── config.ts           # Public config (Stripe key per environment)
  │   ├── subscribe.ts        # Newsletter email capture
  │   └── contact.ts          # Contact form handler
  │
  ├── vercel.json             # Vercel config: rewrites, headers
  ├── package.json            # Dependencies (stripe, @supabase/supabase-js)
  ├── tsconfig.json           # TypeScript config for API functions
  ├── .env.example            # Environment variable template
  ├── .env.local              # Local env vars (gitignored)
  │
  ├── .agent/                 # AI agent instructions
  │   ├── AGENTS.md           # Core agent rules and human profile
  │   ├── DEV_RULES.md        # Git branching, dev protocols
  │   └── 2026_MOBILE_DESIGN_SPECS.md  # iOS/iPadOS viewport specs
  │
  ├── complete.html            # Order completion page
  ├── faq.html                # FAQ
  ├── shipping.html           # Shipping & returns
  ├── terms.html              # Terms of service
  ├── privacy.html            # Privacy policy
  ├── policies.html           # Policies (availability, cart, returns)
  ├── README.md               # Public-facing README
  └── .gitignore              # Ignores .env.local, node_modules, etc.
  ```

### Key Frontend Files

**`assets/js/main.js`** — Supabase client initialization, shared utilities
  + Loads Supabase via CDN script tag, creates client with hardcoded anon key (public, RLS-protected)
  + Shared functions: formatPrice(), slugify(), getProductBySlug(), getProducts()
  + Cart state management (localStorage): addToCart(), removeFromCart(), getCart(), clearCart(), updateCartBadge()

**`assets/js/product.js`** — Product page controller
  + Fetches product by slug from Supabase
  + Renders two-column layout (story + details)
  + Image gallery with lightbox
  + Stripe checkout button handler

**`assets/js/shop.js`** — Shop grid controller
  + Fetches all products from Supabase
  + Multi-select filter by series, product_type, availability
  + Sort by price, date, name
  + Smart filter: hides single-option dropdowns

**`assets/js/homepage.js`** — Homepage controller
  + Fetches featured products for carousel
  + Loads theme config from site_config table
  + Theatrical lighting effects (CSS masks + scroll transforms)
  + Theme rotation on return visits

### Key API Functions

**`api/checkout.ts`** — Stripe session creation
  + Checks product availability in Supabase before creating session
  + Creates checkout session with `ui_mode: 'custom'`
  + Collects email, phone, and shipping address
  + Passes metadata: `{ items: [{id, slug}] }` for webhook identification
  + Enables shipping address collection (US only) and phone number collection
  + Returns client_secret for frontend Stripe Elements mount

**`api/webhook.ts`** — Stripe event handler
  + Reads raw body via `request.text()` for signature verification
  + Validates webhook signature with `stripe.webhooks.constructEvent()`
  + Idempotency: checks `webhook_events` table for duplicate `event.id`, skips if already processed
  + On `checkout.session.completed`: extracts metadata, upserts customer record, marks products sold, creates order records, records event.id

**`api/products.ts`** — Product CRUD for AI assistants
  + GET: fetch product by slug (public, no auth)
  + POST: create product (requires `PRODUCT_API_KEY` auth, validates fields, generates slug, checks conflicts)
  + PUT: update product (requires `PRODUCT_API_KEY` auth, handles Stripe price archiving if price changes)

**`api/config.ts`** — Public configuration
  + Returns Stripe publishable key and Supabase config per environment
  + Enables automatic test/live switching without hardcoding keys

**`api/session-status.ts`** — Checkout return page verification
  + Retrieves Checkout Session by ID
  + Returns session status for the completion page UI

**`api/stripe-sync.ts`** — Product catalog sync
  + Called by Supabase database webhook on products INSERT
  + Creates Stripe Product + Price via API
  + Writes stripe_product_id + stripe_price_id back to row

---

## Data Flow

### Product Creation (Any Entry Method)

  ```
  Emy adds product via Admin UI / Supabase Studio / GPT Skill
    ↓
  (01) Row inserted into Supabase `products` table
    ↓
  (02) Supabase Database Webhook fires on INSERT
    ↓
  (03) POST to /api/stripe-sync.ts (Vercel function)
    ↓
  (04) Function creates Stripe Product via API
    ↓
  (05) Function creates Stripe Price linked to Product
    ↓
  (06) Function writes stripe_product_id + stripe_price_id back to Supabase row
    ↓
  PRODUCT IS NOW LIVE AND PURCHASABLE
  (No deploy needed — frontend fetches from Supabase at runtime)
  ```

### Purchase Flow

  ```
  Shopper adds item(s) to cart, then clicks checkout
    ↓
  (01) Frontend loads checkout.html, reads cart from localStorage
    ↓
  (02) checkout.js sends POST to /api/checkout.ts
    ↓
  (03) API checks availability for ALL cart items in Supabase (blocks if any sold)
    ↓
  (04) API creates Stripe Checkout Session (ui_mode: 'custom', metadata: {items: [...]})
    ↓
  (05) Returns client_secret to frontend
    ↓
  (06) Frontend calls stripe.initCheckout({clientSecret}), mounts PaymentElement
    ↓
  (07) Customer enters email + shipping + payment, clicks pay
    ↓
  (08) Frontend calls actions.confirm() → Stripe processes payment
    ↓
  (09) Stripe redirects to complete.html?session_id=...
    ↓
  (10) Stripe fires checkout.session.completed webhook to /api/webhook.ts
    ↓
  (11) Webhook validates signature, extracts items from metadata
    ↓
  (12) Updates each product: available=false, quantity=0
    ↓
  (13) Creates order record per product in Supabase orders table
    ↓
  PRODUCT SHOWS "SOLD" ON NEXT PAGE LOAD
  ```

### Data States

  1. **Product available**: `available=true, quantity>0` — Add to Cart button active
  2. **Product sold**: `available=false, quantity=0` — "Sold" badge, buttons disabled, appears in Sold Archive
  3. **Product featured**: `featured=true` — Appears in homepage carousel
  4. **In cart**: Product stored in localStorage cart — availability re-checked at checkout creation

---

## Design System & Styling

### Color Scheme

  ```css
  :root {
      --color-plum: #4A1942;
      --color-lavender: #B8A5C8;
      --color-fog: #D4D4D4;
      --color-cream: #FFF8E7;
      --color-gold: #D4AF7A;
      --color-ink: #1A1A1A;
      --color-star-blue: #1B3A52;
      --color-amethyst: #9B6B9E;
  }
  ```

### Design Principles

  1. **Minimalist Elegance**
    - Clean layouts with generous white space
    - Let the miniatures be the focal point
    - Typography creates hierarchy without clutter

  2. **Theatrical Depth**
    - CSS-based lighting effects (masks + scroll transforms)
    - Spotlight motion creates perceived depth
    - "Not actual parallax — CSS motion against scroll direction with elements masked by a frame"

  3. **Mobile-First**
    - All layouts designed for 393px first, scaled up
    - Touch targets minimum 44x44px
    - See `.agent/2026_MOBILE_DESIGN_SPECS.md` for iOS/iPadOS viewport specs

### Typography

  ```css
  :root {
      --font-display: "Cormorant Garamond", Georgia, serif;
      --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  ```

  - Cormorant Garamond: hero text, section headings, product titles, taglines
  - System fonts: body copy, navigation, UI elements, buttons

### Responsive Breakpoints

  ```css
  /* Mobile-first */
  /* Base: 393px (iPhone) */
  @media (min-width: 768px) { /* Tablet */ }
  @media (min-width: 1024px) { /* Desktop */ }
  @media (min-width: 1440px) { /* Large desktop */ }
  ```

### Full brand reference: `assets/docs/BRAND.md`

---

## Common Pitfalls & Important Notes

### Things That Look Like Bugs But Aren't

  1. **No React, no build step for frontend**
    - This is intentional. Vanilla HTML/CSS/JS served as static files. Only the `/api` functions are TypeScript compiled by Vercel.

  2. **Products appear without deploy**
    - Frontend fetches from Supabase at runtime. Adding a product to the database makes it live immediately. No git push needed.

  3. **No Stripe Customer created before checkout**
    - Unlike freelance-payments, shoppers are anonymous. Stripe creates the Customer record automatically during checkout.

### Common Mistakes to Avoid

  * **Don't use GitHub Actions for any automation**
    + Hard constraint. Too buggy. Vercel handles deploy, Supabase handles data, webhooks handle sync.

  * **Don't store images in git**
    + All product images go to Cloudflare R2. Repository stays small.

  * **Don't expect Emy to use git**
    + All client-facing operations happen through admin UI or Supabase Studio web interface.

  * **Don't create Stripe Products/Prices manually**
    + The database webhook handles this automatically. Manual creation causes ID mismatches.

### Important Conventions

  + **Price is always in cents** — $245.00 = 24500 in the database and Stripe
  + **Slug is auto-generated** from title — "The Sunkeeper" → "the-sunkeeper"
  + **Images follow CDN path pattern** — `{R2_PUBLIC_URL}/products/{slug}/hero-{slug}.webp`
  + **All API functions are TypeScript** — frontend is vanilla JS
  + **Database webhooks vs Stripe webhooks** — both are used but for different purposes. DB webhook syncs to Stripe on INSERT. Stripe webhook updates DB on payment.

### Performance Considerations

  + Lazy load all product images below the fold
  + Cormorant Garamond loaded via Google Fonts with display=swap
  + Product grid fetches from Supabase with pagination
  + Homepage featured products cached in site_config for faster initial load

---

## Development Philosophy

### "Exclusively Executable Plan" Approach

**Core Principle**: Understand everything upfront, resolve unknowns before coding, create complete plan before execution.

**Process**:

  1. Understand the full system
  2. Plan every detail upfront
  3. Identify unknowns and resolve them
  4. Write complete, correct code
  5. Test once, it works

### What Changed from v0

| v0 Plan (Dec 2025)             | v1 Architecture (Mar 2026)        | Why                            |
| ------------------------------ | --------------------------------- | ------------------------------ |
| GitHub Pages hosting           | Vercel hosting                    | Consolidation; private repo    |
| JSON files in git as database  | Supabase PostgreSQL               | GIT is not non-tech UI         |
| GitHub Actions for automation  | Eliminated entirely               | Buggy, phantom files, commits  |
| Python scripts for Stripe sync | Supabase DB webhook → TS function | Single simple automation point |
| Client CMS is git/ChatGPT      | Admin UI + Supabase Studio        | Non-tech UI friendly workflow  |
| Stripe Hosted                  | Stripe Custom Checkout (Elements) | On-site UX, full brand control |
| React (briefly considered)     | Vanilla HTML/CSS/JS               | No framework at this scale     |

### What's Reused from freelance-payments

  - Vercel serverless function pattern (`/api/*.ts`) — Web API `Request/Response` format
  - Stripe `ui_mode: 'custom'` Checkout Sessions pattern (from Stripe quickstart walkthrough)
  - Webhook handling pattern (raw body → constructEvent → extract metadata → update data)
  - TypeScript for all server-side code
  - Environment variable management via Vercel dashboard
  - Session-status endpoint pattern for return page verification

---

## Deployment

### Build Process

No build step for frontend — static HTML/CSS/JS files served directly by Vercel. API functions are compiled by Vercel's TypeScript support automatically.

  ```bash
  # Deploy (from developer machine only)
  git push origin main
  # Vercel auto-deploys on push
  ```

### Hosting Configuration

  + **Platform**: Vercel (free tier)
  + **Auto-deploy**: On push to main branch
  + **Custom domain**: `everlastingsbyemaline.com`
  + **SSL**: Automatic via Vercel
  + **Serverless functions**: `/api/*.ts` auto-detected

### Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

| Variable                 | Purpose                                                 | Required |
| ------------------------ | ------------------------------------------------------- | -------- |
| `SUPABASE_URL`              | Supabase project URL                                 | Yes      |
| `SUPABASE_PUBLISHABLE_KEY`  | Supabase publishable key (frontend-safe)             | Yes      |
| `SUPABASE_SECRET_KEY`       | Supabase secret key (backend only)                   | Yes      |
| `STRIPE_SECRET_KEY`      | Stripe API secret                                       | Yes      |
| `STRIPE_PUBLISHABLE_KEY` | Stripe frontend key                                     | Yes      |
| `STRIPE_WEBHOOK_SECRET`  | Webhook signature validation                            | Yes      |
| `R2_ACCOUNT_ID`          | Cloudflare account                                      | Yes      |
| `R2_ACCESS_KEY_ID`       | R2 access credentials                                   | Yes      |
| `R2_SECRET_ACCESS_KEY`   | R2 secret credentials                                   | Yes      |
| `R2_BUCKET_NAME`         | R2 bucket name                                          | Yes      |
| `R2_PUBLIC_URL`          | CDN public base URL                                     | Yes      |
| `CLOUDINARY_URL`         | Cloudinary API credentials                              | Yes      |
| `PRODUCT_API_KEY`        | AI/external API auth key                                | Yes      |
| `META_PIXEL_ID`          | Meta Pixel ID for tracking                              | Yes      |
| `META_ACCESS_TOKEN`      | Meta Conversions API token                              | Yes      |
| `RESEND_API_KEY`         | Resend transactional email API key                      | Yes      |
| `RESEND_FROM_EMAIL`      | Verified sender, e.g. `hello@everlastingsbyemaline.com` | Yes      |

**Note**: Stripe keys are scoped per Vercel environment. Test keys for Preview+Development, live keys for Production. See `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md` > Environment Strategy. Shippo uses the web UI in v1 — no API key required until post-launch.

### Post-Deploy Verification

  1. Visit homepage — loads featured products from Supabase
  2. Navigate to shop — products render in grid
  3. Click product — full page renders with images from R2
  4. Test checkout with Stripe test card
  5. Verify webhook updates product status in Supabase
  6. Check admin UI login and product creation

### Post-Launch Operations

Free-tier services have caps and auto-pause behavior. This is the operational checklist for the first year of production — the things that don't show up in architecture docs but will absolutely interrupt the site if ignored.

| What                           | Cadence               | What to watch                                                                                                                                                 | Upgrade trigger                                                                                 |
| ------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Supabase free-tier auto-pause  | Every 7 days idle     | Project pauses after 7 days of no activity. Data is preserved. If production traffic keeps it alive, no action. During dev lulls, resume from dashboard.      | Pro tier ($25/mo) when pauses affect the live site or when Emy needs daily admin access.        |
| Resend email cap               | Monthly               | Free tier = 3,000 emails/mo. Monitor from the Resend dashboard around month-end.                                                                              | Paid tier ($20/mo for 50k) when monthly volume crosses ~2,500.                                  |
| Shippo label cap               | Monthly               | Free Starter = 30 USPS labels/mo. Emy tracks manually from Shippo's dashboard.                                                                                | Pay-as-you-go ($0.05/label) when monthly volume crosses 25.                                     |
| Stripe receipt emails          | Verify post-launch    | Dashboard > Settings > Emails: "Successful payments" + "Refunds" both toggled ON. Re-verify after any Stripe account change.                                  | N/A — always on.                                                                                |
| Cloudflare R2 storage          | Quarterly             | Free tier = 10 GB storage + 1M Class A ops/mo + 10M Class B ops/mo. A typical site stays well under.                                                          | Paid tier ($0.015/GB + ops) when hitting caps — unlikely for v1.                                |
| Vercel hobby plan              | Quarterly             | Hobby tier caps: 100 GB bandwidth/mo, 1k serverless function invocations/day average. Usage dashboard shows current.                                          | Pro tier ($20/mo) when bandwidth or function volume approaches caps.                            |
| Domain renewal                 | Annually              | `everlastingsbyemaline.com` is on Cloudflare Registrar at renewal cost. Auto-renew on.                                                                        | N/A — auto-renew.                                                                               |
| SSL certificates               | Automatic             | Vercel auto-renews via Let's Encrypt. Monitor via Vercel dashboard only if an alert fires.                                                                    | N/A — auto-renew.                                                                               |
| Meta Commerce Manager feed     | After each product    | New products appear in Instagram Shopping within 24 hours of publishing. Check catalog health in Meta Commerce Manager monthly.                               | N/A — free.                                                                                     |
| Stripe API key rotation        | Annually or on leak   | Rotate live secret key if a device is lost or a key is ever pasted into a shared tool. Update Vercel Production scope after rotation.                         | N/A — operational hygiene.                                                                      |
| Supabase DB password           | Annually or on leak   | Not an env var; lives only in a password manager. Rotate via Studio > Settings > Database > Reset database password if ever exposed.                          | N/A — operational hygiene.                                                                      |
| `PRODUCT_API_KEY` rotation     | Annually or on leak   | `openssl rand -hex 32`; update both Production and Preview scopes in Vercel. Update the Custom GPT's Bearer token to match.                                   | N/A — operational hygiene.                                                                      |

**First-month warm-up checklist** (2026-05-ish):

  - [ ] Confirm all post-launch emails deliver (Stripe receipt, Resend tracking, Resend welcome, Resend cart-recovery).
  - [ ] Sign in to Meta Commerce Manager and confirm all live products appear in the catalog feed.
  - [ ] Run one Lighthouse audit from a fresh browser profile; log Core Web Vitals.
  - [ ] Confirm GA4 and Meta Pixel both show live traffic.
  - [ ] Verify Supabase has not auto-paused (it shouldn't with live traffic, but confirm).

### Email Infrastructure

All outbound transactional email routes through Resend (sending) and all reply/inbound email routes through Google Workspace (receiving). Resend cannot receive email directly — replies to our `From:` address land in Emy's Google Workspace inbox via configured aliases.

**Google Workspace aliases** (all route to Emy's primary inbox):
  + `admin@everlastingsbyemaline.com` — master admin address
  + `hello@everlastingsbyemaline.com` — customer-facing general inbox; used as `RESEND_FROM_EMAIL` and `RESEND_REPLY_TO_EMAIL`
  + `orders@everlastingsbyemaline.com` — potential future segmentation for order-specific notifications
  + `shipping@everlastingsbyemaline.com` — potential future segmentation for tracking/shipping notifications
  + `sunkeeper@everlastingsbyemaline.com` — reserved for per-product or campaign-specific sending

**Resend domain setup**: `everlastingsbyemaline.com` (apex) verified; Return-Path on `send.everlastingsbyemaline.com` (auto-handled by Resend) for SPF/DMARC reputation isolation; click tracking ON; open tracking OFF (inaccurate in modern mail clients).

**Post-v1 email roadmap** — `assets/docs/archive/v2_0/` contains exploratory planning docs for AI-assisted email marketing, inbox agents, and multi-platform chat integrations. Planned as a quick post-launch follow-up to this deliverable, before the advertising phase. Key documents:
  + `EMAIL_MARKETING.md` — marketing planner for the full v3 email strategy
  + `RESEND_LLMS_FULL.md` — full Resend reference for LLMs
  + `GIVE_AGENT_INBOX.md` — agent-readable inbox pattern
  + Additional integration refs: `RESEND_CLI.md`, `VERCEL_RESEND.md`, `SUPABASE_RESEND.md`, `RESEND_VERCEL_CHAT_SDK.md`, `CHAT_SDK_CARD_EMAILS.md`, `CLOUDFLARE_WORKERS_RESEND.md`, `PYTHON_RESEND_SDK.md`

---

## Supabase Schema

### `products` table

| Column            | Type        | Notes                                          |
| ----------------- | ----------- | ---------------------------------------------- |
| id                | uuid        | PK, auto-generated                             |
| sku               | text        | Unique, auto-generated                         |
| slug              | text        | Unique, auto-generated from title              |
| title             | text        | NOT NULL                                       |
| headline          | text        | 5-7 word tagline                               |
| story_card        | text        | 2-8 paragraphs, poetic                         |
| description       | text        | Short summary                                  |
| features          | jsonb       | Array of feature strings                       |
| price             | integer     | In cents ($245 = 24500)                        |
| dimensions        | text        | e.g. "8\" W x 6\" D x 10\" H"                  |
| weight            | text        | e.g. "2.5 lbs"                                 |
| materials         | text[]      | Array of materials                             |
| power_supply      | text        | Nullable                                       |
| care_instructions | text[]      | Array of care steps                            |
| shipping_details  | text[]      | Array of shipping info                         |
| product_type      | text        | miniature, printable, storybook                |
| series            | text        | Nullable — Portals to Peace, etc.              |
| available         | boolean     | Default true                                   |
| quantity          | integer     | Default 1                                      |
| featured          | boolean     | Default false                                  |
| images            | jsonb       | Array of {url, alt} objects                    |
| thumbnail         | text        | CDN URL                                        |
| thumbnail_alt     | text        |                                                |
| media             | jsonb       | Array of {type, url, caption} for videos/GIFs  |
| seo_title         | text        |                                                |
| seo_description   | text        |                                                |
| artist_note       | text        | Nullable                                       |
| stripe_product_id | text        | Nullable, auto-populated                       |
| stripe_price_id   | text        | Nullable, auto-populated                       |
| homepage_theme    | jsonb       | Nullable — {colors, mood} for dynamic homepage |
| created_at        | timestamptz | Auto                                           |
| updated_at        | timestamptz | Auto                                           |

### `customers` table

| Column             | Type        | Notes                               |
| ------------------ | ----------- | ----------------------------------- |
| id                 | uuid        | PK                                  |
| email              | text        | Unique — primary identifier         |
| name               | text        | From Stripe checkout                |
| phone              | text        | From Stripe checkout                |
| shipping_address   | jsonb       | Latest shipping address             |
| stripe_customer_id | text        | Stripe's customer ID                |
| source             | text        | checkout, newsletter, cart-recovery |
| created_at         | timestamptz | Auto                                |
| updated_at         | timestamptz | Auto                                |

### `orders` table

| Column                | Type        | Notes                                           |
| --------------------- | ----------- | ----------------------------------------------- |
| id                    | uuid        | PK                                              |
| stripe_session_id     | text        | Checkout session ID                             |
| stripe_payment_intent | text        | Payment intent ID                               |
| product_id            | uuid        | FK to products                                  |
| customer_id           | uuid        | FK to customers                                 |
| customer_email        | text        | From Stripe (denormalized)                      |
| amount                | integer     | In cents                                        |
| status                | text        | completed, shipped, delivered, refunded         |
| shipping_address      | jsonb       | From Stripe                                     |
| tracking_number       | text        | Set when Emy marks shipped via admin UI         |
| tracking_carrier      | text        | USPS, UPS, FedEx, DHL                           |
| shipped_at            | timestamptz | When Emy marked shipped — triggers Resend email |
| delivered_at          | timestamptz | Post-launch via Shippo webhook                  |
| created_at            | timestamptz | Auto                                            |

Partial index `idx_orders_needs_shipping` on `(created_at DESC)` WHERE `shipped_at IS NULL AND status = 'completed'` for fast admin queue lookups.

### `subscribers` table

| Column                | Type        | Notes                                                                                                         |
| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| id                    | uuid        | PK                                                                                                            |
| email                 | text        | Unique                                                                                                        |
| source                | text        | homepage, footer, checkout-started, cart-recovery, product-interest, cart-exit, contemplation-offer, customer |
| promo_code            | text        | Dynamic Stripe promotion code (newsletter welcome or contemplation CTA)                                       |
| promo_code_expires_at | timestamptz | When the promo code expires (30 days after generation)                                                        |
| created_at            | timestamptz | Auto                                                                                                          |

### `site_config` table

| Column     | Type        | Notes                                               |
| ---------- | ----------- | --------------------------------------------------- |
| id         | uuid        | PK                                                  |
| key        | text        | Unique — e.g. "homepage_theme", "featured_products" |
| value      | jsonb       | Configuration data                                  |
| updated_at | timestamptz | Auto                                                |

### `webhook_events` table

| Column       | Type        | Notes                           |
| ------------ | ----------- | ------------------------------- |
| event_id     | text        | PK — Stripe event ID            |
| processed_at | timestamptz | Auto — when event was processed |

Used for webhook idempotency. Prevents duplicate processing when Stripe retries events.

### `product_interests` table

| Column       | Type        | Notes                                   |
| ------------ | ----------- | --------------------------------------- |
| id           | uuid        | PK                                      |
| email        | text        | Subscriber email                        |
| product_slug | text        | Product they're interested in           |
| notified     | boolean     | Default false — set true after notified |
| created_at   | timestamptz | Auto                                    |

Unique constraint on (email, product_slug). Tracks who wants to be notified about specific products.

### `cart_holds` table (NEW in v1.4)

| Column     | Type        | Notes                                |
| ---------- | ----------- | ------------------------------------ |
| id         | uuid        | PK                                   |
| session_id | text        | Browser session (localStorage UUID)  |
| product_id | uuid        | FK to products (ON DELETE CASCADE)   |
| expires_at | timestamptz | 15 minutes after creation; soft hold |
| created_at | timestamptz | Auto                                 |

Index on `(product_id, expires_at)` for efficient availability lookups. A product is "available for purchase by session X" if `products.available = true AND NOT EXISTS (cart_hold WHERE product_id = X AND session_id != X AND expires_at > now())`. This prevents the "sold while entering payment" UX shock — availability is checked and held when the user clicks {CHECKOUT} on `/cart.html`, before any PII is entered.

---

## Key Schema Changes in v1.4.0

Compared to v1.3.1:

1. **8 tables** (was 7) — added `cart_holds`
2. **`orders`** — added `tracking_number`, `tracking_carrier`, `shipped_at`, `delivered_at`, and `idx_orders_needs_shipping` partial index for the shipping fulfillment pipeline
3. **`subscribers`** — added `promo_code`, `promo_code_expires_at` so newsletter welcome / contemplation-offer coupons can be looked up by admin
4. **Source values** expanded to include `checkout-started` (captured on /cart.html {CHECKOUT} click even if user doesn't complete purchase)

---

## Related Documentation

  - **Brand Guide**: `assets/docs/BRAND.md`
  - **Implementation Guide (current)**: `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md`
  - **Action Steps (current)**: `assets/docs/archive/v1_4/v1_4_2_IMPL_STEPS.md`
  - **KPI + Advertising Pitch**: `assets/docs/archive/v1_4/GA4_KPIS_AND_ADVERTISING.md`
  - **Product Protocol**: `assets/docs/PRODUCT_PROTOCOL.md`
  - **Previous Version (archived)**: `assets/docs/archive/v1_3/v1_3_1_IMPL_GUIDE.md`
  - **Project Brief**: `assets/docs/archive/v1_1/v1_1_PREP.md`
  - **Dev Rules**: `.agent/AGENTS.md`
  - **Mobile Design Specs**: `.agent/2026_MOBILE_DESIGN_SPECS.md`
  - **v0 Archive Manifest**: `assets/docs/archive/v0/PROCESSED.md`

---
*This document is the single source of truth for the Everlastings project architecture. Keep it updated as development progresses.*