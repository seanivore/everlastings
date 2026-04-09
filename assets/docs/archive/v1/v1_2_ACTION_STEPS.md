# Everlastings — v1.2 Action Steps (Revised)

**Version**: v1.2r1
**Created**: 2026-04-09 10:27 | **Revised**: 2026-04-09 19:17
**Details**: `v1_2_IMPLEMENTATION.md` has code snippets and specifics for every step below

---

## How to Use

  - Every checkbox = ONE action
  - Track A (backend) and Track B (frontend) can proceed in parallel
  - Track C requires Track A2 + Track B3 minimum
  - Code snippets are in `v1_2_IMPLEMENTATION.md` — copy from there
  - Check off as you go

---

## Pre-Flight (Before Any Track)

  - [ ] **Verify** Stripe account active with dashboard access
  - [ ] **Verify** Supabase project can be created (free tier)
  - [ ] **Verify** Cloudflare account for R2
  - [ ] **Verify** Cloudinary account (free tier) — existing `dzrtucxh7` or new
  - [ ] **Verify** Vercel CLI installed (`npm install -g vercel`)
  - [ ] **Create** `dev` branch from `main`
  - [ ] **Read** `v1_2_IMPLEMENTATION.md` > Locked Decisions section (19 decisions)
  - [ ] **Read** `v1_2_IMPLEMENTATION.md` > Git Branching Strategy
  - [ ] **Read** `v1_2_IMPLEMENTATION.md` > Environment Strategy

---

## TRACK A: Foundation + Backend

### A1: Services Setup

**YOU WILL HAVE**: All services connected, 5 tables created, env vars set, analytics base

#### Vercel
  - [ ] **Create** Vercel project from GitHub repo
  - [ ] **Add** custom domain `everlastingsbyemaline.com`
  - [ ] **Create** `vercel.json` (copy from impl guide)
  - [ ] **Set** auto-deploy: `main` → Production, other branches → Preview
  - [ ] **Push** and verify deploy loads

#### Supabase
  - [ ] **Create** Supabase project (free tier, us-east-1)
  - [ ] **Run** SQL: create `products` table (copy from impl guide)
  - [ ] **Run** SQL: create `customers` table
  - [ ] **Run** SQL: create `orders` table
  - [ ] **Run** SQL: create `subscribers` table
  - [ ] **Run** SQL: create `site_config` table
  - [ ] **Run** SQL: enable RLS + create all policies (copy from impl guide)
  - [ ] **Create** admin user (Emy's email)
  - [ ] **Configure** DB webhook: products INSERT → POST to `/api/stripe-sync`

#### Cloudflare R2
  - [ ] **Create** R2 bucket `everlastings`
  - [ ] **Enable** public access
  - [ ] **Note** r2.dev public URL
  - [ ] **Create** API token (Read & Write)

#### Cloudinary
  - [ ] **Note** cloud name, API key, API secret
  - [ ] **Set** `CLOUDINARY_URL` env var in Vercel

#### Stripe
  - [ ] **Get** test API keys (publishable + secret)
  - [ ] **Create** test webhook endpoint → dev preview URL `/api/webhook`
  - [ ] **Subscribe** to `checkout.session.completed`
  - [ ] **Note** webhook signing secret
  - [ ] **Create** cart-recovery coupon (10% off, duration: once, ID: `cart-recovery-10`)
  - [ ] **Enable** receipt emails: Dashboard → Settings → Emails

#### Analytics
  - [ ] **Create** GA4 property
  - [ ] **Note** Measurement ID
  - [ ] **Verify** Google Search Console (TXT record or HTML file)

#### Environment
  - [ ] **Create** `.env.example`
  - [ ] **Set** env vars in Vercel — test keys for Preview+Dev, live keys for Production (see Environment Strategy)
  - [ ] **Create** `.env.local` for local dev
  - [ ] **Run** `npm init -y && npm install stripe @supabase/supabase-js @aws-sdk/client-s3`
  - [ ] **Create** `tsconfig.json` + `package.json` (copy from impl guide)
  - [ ] **Verify** `vercel dev` starts

---

### A2: API Endpoints

**YOU WILL HAVE**: All server-side endpoints working, testable with curl

  - [ ] **Create** `api/config.ts` — returns publishable key + Supabase config per environment
  - [ ] **Create** `api/stripe-sync.ts` — Supabase webhook → Stripe product + price creation
  - [ ] **Create** `api/checkout.ts` — cart availability check → Stripe session with `ui_mode: 'custom'`
  - [ ] **Create** `api/session-status.ts` — retrieve session for return page
  - [ ] **Create** `api/webhook.ts` — mark products sold, upsert customer, create orders
  - [ ] **Create** `api/cart-recovery.ts` — generate unique promo code + capture email
  - [ ] **Create** `api/products.ts` — CRUD for AI-assisted product creation (service key auth)
  - [ ] **Create** `api/upload.ts` — Cloudinary transform → R2 upload → CDN URL
  - [ ] **Create** `api/subscribe.ts` — newsletter signup
  - [ ] **Create** `api/contact.ts` — contact form handler

---

### A3: Admin UI + Product Creation Protocol

**YOU WILL HAVE**: Emy can manage products from browser, AI workflow documented

  - [ ] **Create** `admin/index.html` with login form
  - [ ] **Create** `assets/js/admin.js`
  - [ ] **Implement** Supabase Auth login/logout
  - [ ] **Build** product list (table/grid)
  - [ ] **Build** new product form (all fields from schema)
  - [ ] **Implement** image upload (file picker → `/api/upload` → CDN URL)
  - [ ] **Implement** save (INSERT/UPDATE to products)
  - [ ] **Implement** delete with confirmation
  - [ ] **Create** `assets/docs/PRODUCT_CREATION_PROTOCOL.md` — AI-facing workflow doc
  - [ ] **Test** full admin flow: login → add product → see it on shop page

---

### A4: API Integration Testing

**YOU WILL HAVE**: All API flows verified end-to-end

  - [ ] **Test** stripe-sync: insert product → verify Stripe product appears
  - [ ] **Test** checkout: POST with cart → receive clientSecret
  - [ ] **Start** Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook`
  - [ ] **Test** full purchase: cart → checkout → pay `4242...` → completion
  - [ ] **Verify** customer record created in customers table
  - [ ] **Verify** order records created with customer_id FK
  - [ ] **Test** multi-item: 2 products → checkout → both marked sold
  - [ ] **Test** race condition: add item → set `available=false` → checkout → 409
  - [ ] **Test** recovery: trigger 409 → email → promo code returned
  - [ ] **Test** products API: POST/PUT/GET via curl
  - [ ] **Test** upload API: image upload → Cloudinary transform → R2 → CDN URL

---

## TRACK B: Frontend Design (Placeholder Content)

All pages built with hardcoded HTML/CSS. No JavaScript data-fetching. Lorem ipsum + placeholder images. Client reviews visual design.

### B1: Design System

**YOU WILL HAVE**: CSS variables, typography, base components, responsive scaffolding

  - [ ] **Create** `assets/css/styles.css`
  - [ ] **Add** color variables from `BRAND.md`
  - [ ] **Add** typography variables (display + body font stacks, size scale)
  - [ ] **Add** spacing, shadow, radius, transition, z-index tokens
  - [ ] **Add** Google Fonts `<link>` for Cormorant Garamond
  - [ ] **Style** heading hierarchy (h1-h6)
  - [ ] **Style** body text
  - [ ] **Style** buttons: primary, secondary, ghost, disabled
  - [ ] **Style** cards: product tiles with hover
  - [ ] **Style** form inputs with focus states
  - [ ] **Style** image containers: `aspect-ratio: 4/5`, `object-fit: cover`
  - [ ] **Style** badges: "Sold" and "Featured"
  - [ ] **Style** error messages
  - [ ] **Style** skeleton loading placeholders (shimmer animation)
  - [ ] **Style** lightbox component (fullscreen overlay, nav arrows, keyboard support)
  - [ ] **Create** inline SVG icons (dimensions, weight, materials, lighting, care, shipping)
  - [ ] **Set** mobile base (393px)
  - [ ] **Add** tablet breakpoint (768px)
  - [ ] **Add** desktop breakpoint (1024px)
  - [ ] **Add** large desktop (1440px)
  - [ ] **Add** GA4 `gtag.js` snippet to page `<head>` template

---

### B2: Header, Footer, Nav

**YOU WILL HAVE**: Shared layout components on all pages

  - [ ] **Build** header: logo, nav links, Shop dropdown, cart icon with badge, mobile hamburger, sticky
  - [ ] **Build** footer: 4 columns, newsletter input (placeholder), social links, copyright
  - [ ] **Add** header + footer to ALL pages

---

### B3: Product Page (Placeholder)

**YOU WILL HAVE**: Complete product page with hardcoded sample product

  - [ ] **Create** `product.html` — two-column: scrollable story/gallery left, sticky card right
  - [ ] **Hardcode** The Sunkeeper with placeholder text and images
  - [ ] **Build** image gallery with thumbnail strip
  - [ ] **Build** lightbox (click image → fullscreen with keyboard nav)
  - [ ] **Build** sticky product card (thumbnail, title, price, buttons, availability note)
  - [ ] **Style** sticky behavior + mobile fallback (not sticky < 768px)
  - [ ] **Build** features list with SVG icons
  - [ ] **Build** details sections: dimensions, materials, care, shipping
  - [ ] **Build** story card with poetic placeholder text
  - [ ] **Add** breadcrumb: Home > Shop > Product Title
  - [ ] **Add** "Related Havens" section with 3-4 hardcoded product cards
  - [ ] **Add** video/GIF placeholder in gallery (HTML5 video tag, img for GIF)

---

### B4: Shop Grid (Placeholder)

**YOU WILL HAVE**: Filterable grid with hardcoded tiles

  - [ ] **Create** `shop.html` (filter sidebar + product grid)
  - [ ] **Hardcode** 6-8 product tiles
  - [ ] **Build** filter sidebar UI (series, type, availability)
  - [ ] **Build** sort dropdown UI
  - [ ] **Style** tiles: hover zoom, sold badge, lazy images, 4:5 aspect ratio
  - [ ] **Style** skeleton loading state
  - [ ] **Style** empty/no-results state

---

### B5: Homepage (Placeholder)

**YOU WILL HAVE**: Full landing page with hardcoded content

  - [ ] **Create** `index.html`
  - [ ] **Build** hero section (full viewport, overlay text, CTA)
  - [ ] **Build** intro block
  - [ ] **Build** featured carousel (hardcoded 3-4 product cards)
  - [ ] **Build** brand pillars section
  - [ ] **Build** testimonial placeholder
  - [ ] **Implement** theatrical lighting CSS effect
  - [ ] **Style** responsive

---

### B6: Remaining Pages (Placeholder)

**YOU WILL HAVE**: All content pages with placeholder text

  - [ ] **Create** `about.html` (photo, origin story, philosophy, mission)
  - [ ] **Create** `contact.html` (form + commissions section)
  - [ ] **Create** `faq.html`
  - [ ] **Create** `shipping.html` (shipping & returns)
  - [ ] **Create** `terms.html` + `privacy.html`
  - [ ] **Create** `policies.html` with availability section (linked from product card)
  - [ ] **Create** `checkout.html` (cart summary + payment mount point)
  - [ ] **Create** `complete.html` (success/error states)
  - [ ] **Link** all pages in footer nav

---

## TRACK C: Integration

Wire Track B pages to Track A backend. Replace hardcoded content with dynamic data.

### C1: Wire Pages to Backend

**YOU WILL HAVE**: All pages loading real data from Supabase

  - [ ] **Create** `assets/js/main.js` — Supabase client via `/api/config`, cart functions, utilities
  - [ ] **Replace** placeholder URLs with real Supabase URL + R2 URL
  - [ ] **Seed** test products in Supabase Studio
  - [ ] **Upload** test images to R2
  - [ ] **Create** `assets/js/product.js` — fetch product, render, gallery, lightbox, related products
  - [ ] **Create** `assets/js/shop.js` — fetch products, render tiles, filters, sort, URL state
  - [ ] **Create** `assets/js/homepage.js` — fetch featured products, theme from site_config
  - [ ] **Create** `assets/js/newsletter.js` — POST to `/api/subscribe`
  - [ ] **Add** GA4 events: product_view, add_to_cart, begin_checkout, purchase, newsletter_signup

---

### C2: Checkout Flow End-to-End

**YOU WILL HAVE**: Complete purchase flow working

  - [ ] **Create** `assets/js/checkout.js` — fetch Stripe key from `/api/config`, cart summary, Stripe Elements, recovery flow
  - [ ] **Wire** checkout.html — no hardcoded Stripe key, fetches from server
  - [ ] **Wire** complete.html — session status check, cart clear
  - [ ] **Wire** Add to Cart + Buy Now buttons on product page
  - [ ] **Start** Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook`
  - [ ] **Test** full flow: add → checkout → pay `4242...` → completion
  - [ ] **Verify** product "Sold", customer created, order created, cart cleared
  - [ ] **Test** multi-item: 2 products → checkout → both sold
  - [ ] **Test** race condition: 409 → recovery popup → promo code
  - [ ] **Test** recovery email capture: verify subscriber created

---

### C3: SEO Finalization

**YOU WILL HAVE**: Search-optimized pages

  - [ ] **Add** meta titles + descriptions to all pages (dynamic for products)
  - [ ] **Add** Open Graph + Twitter Card tags
  - [ ] **Add** Product schema.org structured data (JSON-LD)
  - [ ] **Create** `sitemap.xml` + `robots.txt`
  - [ ] **Submit** sitemap to Google Search Console

---

### C4: Testing + Launch Prep

**YOU WILL HAVE**: Production-ready site

#### Stripe Live Mode
  - [ ] **Set** live keys for Production scope in Vercel Dashboard
  - [ ] **Create** live webhook endpoint in Stripe Dashboard → production URL
  - [ ] **Set** live `STRIPE_WEBHOOK_SECRET` for Production scope
  - [ ] **Merge** `dev` → `main`
  - [ ] **Test** one real transaction (refund after)

#### Testing
  - [ ] **Run** cross-browser testing (Chrome, Safari, Firefox, Edge)
  - [ ] **Run** mobile testing (iPhone, iPad, Android)
  - [ ] **Test** full checkout flow end-to-end on production
  - [ ] **Test** admin flow: login → add product → verify on shop
  - [ ] **Test** newsletter signup
  - [ ] **Test** contact form
  - [ ] **Check** all internal links

#### Performance
  - [ ] **Run** Lighthouse audit (target 90+)
  - [ ] **Check** WCAG AA accessibility
  - [ ] **Verify** keyboard navigation (including lightbox)
  - [ ] **Verify** all images WebP, lazy loaded, with alt text

#### Launch
  - [ ] **Load** real products (5-10 minimum)
  - [ ] **Final** review with Sean + Emy
  - [ ] **Launch**

---
*Check off as you go. Track A + B in parallel. Track C wires them together. Details in `v1_2_IMPLEMENTATION.md`.*