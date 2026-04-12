# Everlastings v1.3.1 Action Steps

**Version**: v1.3.1
**Created**: 2026-04-12 | 16:16
**Master Plan**: `assets/docs/archive/v1_3/v1_3_1_IMPLEMENTATION.md`
**Format**: One checkbox = one action. ADHD-friendly.

---

## Pre-Flight

  - [ ] **Read**: Architecture Reference (24 decisions) in implementation guide
  - [ ] **Read**: Git Branching Strategy + Environment Strategy
  - [ ] **Read**: Source of Truth Hierarchy + Stripe Sync Rules
  - [ ] **Verify** services exist: Supabase project, Stripe account, Cloudflare R2 bucket, Cloudinary account, GA4 property
  - [ ] **Generate** `PRODUCT_API_KEY`: run `openssl rand -hex 32`, save the output
  - [ ] **Create** config files in repo root (copy from implementation guide):
    - [ ] `.env.example`
    - [ ] `vercel.json`
    - [ ] `tsconfig.json`
    - [ ] `package.json`
  - [ ] **Create** `dev` branch: `git checkout main && git checkout -b dev && git push -u origin dev`
  - [ ] **Create** `.env.local`: `cp .env.example .env.local` then fill in real test values
  - [ ] **Run** `npm install`
  - [ ] **Verify** `vercel dev` starts without errors

---

## TRACK A: Foundation + Backend

### A1: Services Setup

**Goal**: All services connected, tables created, env vars set, analytics installed

#### Vercel
  - [ ] **Create** Vercel project — connect GitHub repo
  - [ ] **Add** custom domain `everlastingsbyemaline.com`
  - [ ] **Push** and verify deploy loads

#### Git + Environment
  - [ ] **Set** Vercel auto-deploy: `main` → Production, all other branches → Preview
  - [ ] **Configure** env vars in Vercel Dashboard per environment (see Environment Strategy)
  - [ ] **Set** `PRODUCT_API_KEY` in Vercel (different value for Production vs Preview)

#### Supabase
  - [ ] **Run** SQL: create `products` table (with slug trigger)
  - [ ] **Run** SQL: create `customers` table (with updated_at trigger)
  - [ ] **Run** SQL: create `orders` table
  - [ ] **Run** SQL: create `subscribers` table
  - [ ] **Run** SQL: create `site_config` table
  - [ ] **Run** SQL: create `webhook_events` table (idempotency)
  - [ ] **Run** SQL: create `product_interests` table (email capture)
  - [ ] **Enable** RLS on all 7 tables (copy policies from implementation guide)
  - [ ] **Create** admin user: `admin@everlastingsbyemaline.com` (Supabase Auth > Invite)
  - [ ] **Create** admin user: `emyh@everlastingsbyemaline.com` (Supabase Auth > Invite)
  - [ ] **Configure** Database Webhook: on `products` INSERT → POST to `{VERCEL_URL}/api/stripe-sync`

#### Cloudflare R2
  - [ ] **Create** R2 bucket `everlastings`
  - [ ] **Enable** public access
  - [ ] **Configure** custom domain: Cloudflare DNS → CNAME `cdn` → R2 bucket hostname
  - [ ] **Verify** `https://cdn.everlastingsbyemaline.com` resolves
  - [ ] **Create** API token (Read & Write, scoped to `everlastings` bucket)

#### Cloudinary
  - [ ] **Note** cloud name, API key, API secret
  - [ ] **Set** `CLOUDINARY_URL` env var in Vercel

#### Stripe
  - [ ] **Get** test API keys (publishable + secret)
  - [ ] **Create** test webhook endpoint → `{dev-preview-url}/api/webhook`
    - Event: `checkout.session.completed`
  - [ ] **Create** coupon: name "Haven Finder Apology", 10% off, duration once, ID `cart-recovery-10`
  - [ ] **Create** coupon: name "Welcome to the Firelight Council", 5% off, duration once, ID `newsletter-welcome-5`
  - [ ] **Enable** receipt emails: Dashboard → Settings → Emails → Successful payments

#### Meta Pixel + Instagram Shopping
  - [ ] **Get** Meta Pixel ID from Meta Events Manager
  - [ ] **Get** Meta Access Token from Meta Business Manager
  - [ ] **Set** `META_PIXEL_ID` and `META_ACCESS_TOKEN` in Vercel env vars
  - [ ] **Verify** Emy has: Business IG → FB Page → Commerce Manager → domain verified
  - [ ] **Configure** Commerce Manager: catalog feed URL → `https://everlastingsbyemaline.com/api/product-feed`

#### Analytics
  - [ ] **Create** GA4 property for everlastingsbyemaline.com
  - [ ] **Note** Measurement ID (`G-XXXXXXXXXX`)
  - [ ] **Verify** Google Search Console (TXT record or HTML file)

---

### A2: API Endpoints

**Goal**: All server-side endpoints working, testable with curl

  - [ ] **Create** `api/config.ts` — returns public keys (Stripe publishable, Supabase URL + anon key)
  - [ ] **Create** `api/stripe-sync.ts` — Supabase webhook handler, creates Stripe Product + Price
  - [ ] **Create** `api/checkout.ts` — availability check + Stripe session (`ui_mode: 'custom'`)
  - [ ] **Create** `api/session-status.ts` — retrieves session for completion page
  - [ ] **Create** `api/webhook.ts` — idempotency check, customer upsert, mark sold, create orders, record event
  - [ ] **Create** `api/cart-recovery.ts` — promo code generation + email capture
  - [ ] **Create** `api/products.ts` — GET (public), POST/PUT (PRODUCT_API_KEY auth, validation, slug gen, conflict check)
  - [ ] **Create** `api/upload.ts` — PRODUCT_API_KEY auth, file type/size validation, Cloudinary → R2 pipeline
  - [ ] **Create** `api/subscribe.ts` — newsletter subscription
  - [ ] **Create** `api/contact.ts` — contact form handler
  - [ ] **Create** `api/cart-activity.ts` — fire-and-forget product interest notification
  - [ ] **Create** `api/product-feed.ts` — CSV feed for Meta Commerce Catalog sync

**Auth note**: `api/products.ts` and `api/upload.ts` use `PRODUCT_API_KEY` for auth (NOT `SUPABASE_SERVICE_KEY`). See AR #20.

---

### A3: Admin UI + Product Protocol

**Goal**: Browser-based product management + documented AI workflow

  - [ ] **Create** `admin/index.html` — login form
  - [ ] **Create** `assets/js/admin.js`
  - [ ] **Implement** Supabase Auth login/logout
  - [ ] **Build** product list (table/grid with edit/delete)
  - [ ] **Build** new product form (all schema fields, price in dollars → cents)
  - [ ] **Implement** image upload via `/api/upload`
  - [ ] **Implement** save (INSERT or UPDATE)
  - [ ] **Implement** delete with confirmation
  - [ ] **Create** `assets/docs/PRODUCT_PROTOCOL.md` (consolidated client + AI guide)
  - [ ] **Test** full admin flow: login → add product → verify on shop page

---

### A4: API Integration Testing

  - [ ] **Test** stripe-sync: insert product → Stripe product appears
  - [ ] **Test** checkout: POST cart items → receive clientSecret
  - [ ] **Test** webhook: `stripe listen --forward-to localhost:3000/api/webhook`
  - [ ] **Test** full purchase: cart → checkout → pay `4242...` → completion
  - [ ] **Verify** customer record created
  - [ ] **Verify** order records created with customer_id FK
  - [ ] **Test** multi-item cart: 2 products → both marked sold
  - [ ] **Test** race condition: set `available=false` → checkout → 409
  - [ ] **Test** recovery: 409 → email → promo code
  - [ ] **Test** products API: POST/PUT/GET with `PRODUCT_API_KEY`
  - [ ] **Test** upload: image + Cloudinary transform + R2 delivery
  - [ ] **Test** upload validation: wrong file type → 400, too large → 400, no auth → 401
  - [ ] **Test** webhook idempotency: replay event → ignored
  - [ ] **Test** slug conflict: same title → 409
  - [ ] **Test** admin: login → add product → see on shop

---

## TRACK B: Frontend Design (Placeholder Content)

All pages: hardcoded HTML/CSS. No JavaScript data-fetching. Placeholder images and text. Client reviews visual design.

### B1: Design System

**Goal**: CSS variables, typography, base components, responsive scaffolding

  - [ ] **Create** `assets/css/styles.css`
  - [ ] **Define** color variables (from BRAND.md)
  - [ ] **Define** typography (Cormorant Garamond display, system body)
  - [ ] **Define** spacing, shadow, radius, transition, z-index tokens
  - [ ] **Style** buttons: primary, secondary, ghost, disabled
  - [ ] **Style** cards: product tiles with hover effect
  - [ ] **Style** forms: border, focus state, padding
  - [ ] **Style** images: `object-fit: cover`, `aspect-ratio: 4/5`, lazy loading
  - [ ] **Style** badges: "Sold", "Featured"
  - [ ] **Style** error messages
  - [ ] **Style** skeleton loaders (shimmer animation)
  - [ ] **Style** lightbox (fullscreen overlay, nav arrows, keyboard support)
  - [ ] **Create** inline SVG icons: dimensions, weight, materials, lighting, care, shipping
  - [ ] **Set** responsive breakpoints: 393px, 768px, 1024px, 1440px
  - [ ] **Add** GA4 `gtag.js` snippet to page `<head>` template
  - [ ] **Add** Meta Pixel base code to page `<head>` template (alongside GA4)
  - [ ] **Style** contemplation popup (bottom-right peel-up animation)
  - [ ] **Style** exit intent modal (centered overlay)
  - [ ] **Style** product interest CTA (below sticky card buttons)

### B2: Header, Footer, Nav

**Goal**: Consistent navigation on all pages

  - [ ] **Build** header: logo, nav, shop dropdown, cart icon + badge, mobile hamburger, sticky
  - [ ] **Build** footer: 4 columns, newsletter input, social links, copyright

### B3: Product Page

**Goal**: Complete product page with hardcoded sample (The Sunkeeper)

  - [ ] **Create** `product.html` — two-column layout (story left, sticky card right)
  - [ ] **Build** image gallery + thumbnail strip
  - [ ] **Build** lightbox: click → fullscreen, keyboard nav
  - [ ] **Build** sticky product card: thumbnail, title, price, buttons, availability note
  - [ ] **Build** features list with SVG icons
  - [ ] **Build** details: dimensions, materials, care, shipping
  - [ ] **Build** story card section
  - [ ] **Add** breadcrumb: Home > Shop > Product
  - [ ] **Add** "Related Havens" placeholder (3-4 cards)
  - [ ] **Add** video/GIF placeholders in gallery
  - [ ] **Add** email CTA 1: product interest form below sticky card buttons
  - [ ] **Add** email CTA 3: contemplation popup (bottom-right peel, placeholder)
  - [ ] **Add** email CTA 2: exit intent modal (hidden by default, on all product pages)

### B4: Shop Grid

**Goal**: Filterable grid with hardcoded tiles

  - [ ] **Create** `shop.html`
  - [ ] **Build** 6-8 hardcoded product tiles
  - [ ] **Build** filter sidebar: series, type, availability
  - [ ] **Build** sort dropdown
  - [ ] **Style** "Sold" badge, "No results" state, skeleton loading

### B5: Homepage

**Goal**: Full landing page, all sections

  - [ ] **Create** `index.html`
  - [ ] **Build** hero: full viewport, overlay text, CTA
  - [ ] **Build** intro block
  - [ ] **Build** featured carousel (3-4 hardcoded cards)
  - [ ] **Build** brand pillars
  - [ ] **Build** testimonial placeholder
  - [ ] **Add** theatrical lighting CSS effect

### B6: Remaining Pages

**Goal**: All content pages with placeholder text

  - [ ] **Create** `about.html` — photo, origin story, philosophy, mission
  - [ ] **Create** `contact.html` — form + commission section
  - [ ] **Create** `faq.html`
  - [ ] **Create** `shipping.html`
  - [ ] **Create** `terms.html`
  - [ ] **Create** `privacy.html`
  - [ ] **Create** `policies.html` — includes availability section
  - [ ] **Create** `checkout.html` — cart summary + payment mount point
  - [ ] **Create** `complete.html` — success/error states

---

## TRACK C: Integration

Wire Track B pages to Track A backend. Replace placeholders with dynamic data.

### C1: Wire Pages to Backend

**Goal**: All pages loading real data from Supabase

  - [ ] **Create** `assets/js/main.js` — Supabase client via `/api/config`, cart functions, utilities
  - [ ] **Set** `R2_PUBLIC_URL` to `https://cdn.everlastingsbyemaline.com`
  - [ ] **Seed** test products in Supabase Studio
  - [ ] **Seed** test images in R2 bucket
  - [ ] **Create** `assets/js/product.js` — fetch + render product, gallery, lightbox, related products
  - [ ] **Create** `assets/js/shop.js` — fetch products, render tiles, filters, sort, URL state
  - [ ] **Create** `assets/js/homepage.js` — featured carousel, theme from site_config
  - [ ] **Create** `assets/js/newsletter.js` — POST to `/api/subscribe`
  - [ ] **Wire** `buildGa4Item()` and `trackMeta()` helpers in main.js
  - [ ] **Wire** CTA 1 (product interest): POST to subscribe + insert product_interests
  - [ ] **Wire** CTA 2 (exit intent): mouse-leave / visibilitychange detection
  - [ ] **Wire** CTA 3 (contemplation): 3-min timer + promo code generation
  - [ ] **Wire** GA4 enhanced e-commerce + Meta Pixel events (see implementation guide):

| Event                  | Trigger                  |
| ---------------------- | ------------------------ |
| `view_item`            | Product page load        |
| `add_to_cart`          | Add to Cart click        |
| `remove_from_cart`     | Remove from Cart         |
| `begin_checkout`       | Checkout page load       |
| `purchase`             | Completion (success)     |
| `newsletter_signup`    | Successful subscribe     |
| `contact_form_submit`  | Contact form success     |
| `search_filter`        | Shop filter applied      |
| `gallery_open`         | Lightbox opened          |
| `video_play`           | Product video starts     |
| `commission_inquiry`   | Commission form submit   |
| `promo_code_generated` | Cart recovery completed  |
| `email_cta_capture`    | Email CTA form submitted |

  Meta Pixel events fire in parallel: `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`, `Lead`, `Contact`.

### C2: Checkout Flow E2E

**Goal**: Complete purchase flow

  - [ ] **Create** `assets/js/checkout.js` — Stripe Elements, recovery flow
  - [ ] **Wire** checkout.html (fetch key from `/api/config`, no hardcoded key)
  - [ ] **Wire** complete.html (session status check, cart clear)
  - [ ] **Wire** Add to Cart + Buy Now buttons on product page
  - [ ] **Start** Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook`
  - [ ] **Test** full flow: add → checkout → pay `4242...` → completion
  - [ ] **Test** multi-item cart
  - [ ] **Test** race condition (409 → recovery popup → promo code)
  - [ ] **Verify** email capture from recovery flow

### C3: SEO Finalization

  - [ ] **Add** dynamic meta titles + descriptions
  - [ ] **Add** Open Graph + Twitter Card tags
  - [ ] **Add** Product schema.org structured data (JSON-LD)
  - [ ] **Create** `sitemap.xml` + `robots.txt`
  - [ ] **Submit** sitemap to Google Search Console

### C4: Testing + Launch

#### Stripe Live Mode
  - [ ] **Set** live keys for Production scope in Vercel Dashboard
  - [ ] **Create** live webhook endpoint in Stripe Dashboard → production URL
  - [ ] **Set** live `STRIPE_WEBHOOK_SECRET` for Production scope
  - [ ] **Merge** `dev` → `main`
  - [ ] **Test** one real transaction (refund after)

#### Cross-Browser Testing
  - [ ] Chrome, Safari, Firefox, Edge
  - [ ] iPhone, iPad, Android
  - [ ] Full checkout flow on production
  - [ ] Admin flow: login → add product → verify
  - [ ] Newsletter + contact form
  - [ ] All internal links

#### Performance
  - [ ] Lighthouse 90+ all categories
  - [ ] WCAG AA accessibility
  - [ ] Keyboard navigation (including lightbox)
  - [ ] All images WebP, lazy loaded, alt text

#### Launch
  - [ ] DNS → Vercel, SSL active
  - [ ] 5-10 real products loaded
  - [ ] Final review with Sean + Emy
  - [ ] Launch

---

## Dependencies

  ```
  A1 ──→ A2 ──→ A3 ──→ A4
  B1 ──→ B2 ──→ B3 ──→ B4 ──→ B5 ──→ B6
                 │
  A2 + B3 ──────→ C1 ──→ C2 ──→ C3 ──→ C4
  ```

Track A and Track B can proceed **simultaneously**. Track C requires A2 + B3 minimum.

---
*One checkbox = one action. Track A and B in parallel. Track C integrates them.*