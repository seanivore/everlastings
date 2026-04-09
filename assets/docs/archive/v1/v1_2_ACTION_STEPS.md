# Everlastings — v1.2 Action Steps

**Version**: v1.2
**Created**: 2026-04-09
**Details**: `v1_2_IMPLEMENTATION.md` has code snippets and specifics for every step below

---

## How to Use

- Every checkbox = ONE action
- Work top to bottom, session by session
- Code snippets are in `v1_2_IMPLEMENTATION.md` — copy from there
- Check off as you go

---

## Pre-Flight (Before Session 1)

- [ ] **Verify** Stripe account is active and you have dashboard access
- [ ] **Verify** you can create a Supabase project (free tier)
- [ ] **Verify** you have a Cloudflare account for R2
- [ ] **Verify** you have Vercel CLI installed (`npm install -g vercel`)
- [ ] **Set up** git branch structure: `main` (production) ← `dev` (integration) ← `feat/*` (features)
- [ ] **Read** `v1_2_IMPLEMENTATION.md` > Locked Decisions section

---

## Session 1: Foundation — ~3 hrs

**YOU WILL HAVE**: All services connected, tables created, env vars set

### Vercel
- [ ] **Create** Vercel project from GitHub repo
- [ ] **Add** custom domain `everlastingsbyemaline.com`
- [ ] **Create** `vercel.json` (copy from impl guide)
- [ ] **Push** and verify deploy loads

### Supabase
- [ ] **Create** Supabase project (free tier, us-east-1)
- [ ] **Run** SQL: create `products` table (copy from impl guide)
- [ ] **Run** SQL: create `orders` table
- [ ] **Run** SQL: create `subscribers` table
- [ ] **Run** SQL: create `site_config` table
- [ ] **Run** SQL: enable RLS + create all policies (copy from impl guide)
- [ ] **Create** admin user (Emy's email)
- [ ] **Configure** DB webhook: products INSERT → POST to `/api/stripe-sync`

### Cloudflare R2
- [ ] **Create** R2 bucket `everlastings`
- [ ] **Enable** public access
- [ ] **Note** r2.dev public URL
- [ ] **Create** API token (Read & Write)

### Stripe
- [ ] **Get** test API keys (publishable + secret)
- [ ] **Create** webhook endpoint → `/api/webhook`
- [ ] **Subscribe** to `checkout.session.completed`
- [ ] **Note** webhook signing secret
- [ ] **Create** cart-recovery coupon in Stripe Dashboard (10% off, duration: once, ID: `cart-recovery-10`)

### Config Files
- [ ] **Create** `.env.example`
- [ ] **Set** env vars in Vercel Dashboard
- [ ] **Create** `.env.local` for local dev
- [ ] **Run** `npm init -y && npm install stripe @supabase/supabase-js @aws-sdk/client-s3`
- [ ] **Create** `tsconfig.json` (copy from impl guide)
- [ ] **Verify** `vercel dev` starts

---

## Session 2: Design System — ~3 hrs

**YOU WILL HAVE**: CSS variables, typography, base components, responsive grid

- [ ] **Create** `assets/css/styles.css`
- [ ] **Add** color variables from `BRAND.md`
- [ ] **Add** typography variables (display + body font stacks, size scale)
- [ ] **Add** spacing, shadow, radius, transition, z-index tokens
- [ ] **Add** Google Fonts `<link>` for Cormorant Garamond (400, 400i, 700)
- [ ] **Style** heading hierarchy (h1-h6)
- [ ] **Style** body text
- [ ] **Style** buttons: primary, secondary, ghost, disabled
- [ ] **Style** cards: product tiles with hover
- [ ] **Style** form inputs with focus states
- [ ] **Style** image containers: `aspect-ratio: 4/5`, `object-fit: cover`
- [ ] **Style** badges: "Sold" and "Featured"
- [ ] **Style** error messages
- [ ] **Set** mobile base (393px)
- [ ] **Add** tablet breakpoint (768px)
- [ ] **Add** desktop breakpoint (1024px)
- [ ] **Add** large desktop (1440px)

---

## Session 3: Product Page — ~4 hrs

**YOU WILL HAVE**: One product rendering from Supabase

- [ ] **Create** `assets/js/main.js` (Supabase init, utilities — copy from impl guide)
- [ ] **Replace** placeholder URLs with real Supabase URL + anon key + R2 URL
- [ ] **Seed** one test product in Supabase Studio
- [ ] **Upload** test images to R2 `/products/the-sunkeeper/`
- [ ] **Create** `product.html` (two-column: scrollable story/gallery left, sticky product card right)
- [ ] **Create** `assets/js/product.js` (copy from impl guide)
- [ ] **Test** `/product/the-sunkeeper` renders correctly
- [ ] **Test** sold state: set `available=false`, verify button disabled
- [ ] **Test** error state: navigate to `/product/nonexistent`, verify error message
- [ ] **Build** sticky product card (position: sticky, thumb + title + price + buttons + availability note)
- [ ] **Add** availability note: "Each piece is one-of-a-kind. Availability confirmed at checkout." with link to policies
- [ ] **Style** responsive: single column mobile (not sticky), two column desktop (sticky card)

---

## Session 4: Stripe Integration — ~4 hrs

**YOU WILL HAVE**: Products purchasable with cart, inventory auto-updates

- [ ] **Create** `api/stripe-sync.ts` (copy from impl guide)
- [ ] **Test** stripe-sync: insert product in Supabase → verify Stripe product appears
- [ ] **Create** `api/checkout.ts` (copy from impl guide — handles multi-item cart)
- [ ] **Create** `api/session-status.ts` (copy from impl guide)
- [ ] **Create** `api/webhook.ts` (copy from impl guide — marks all cart items sold)
- [ ] **Create** `checkout.html` with Supabase + Stripe CDN, cart summary, payment form
- [ ] **Create** `assets/js/checkout.js` (copy from impl guide)
- [ ] **Create** `complete.html` with success/error states + cart clear
- [ ] **Wire** Add to Cart + Buy Now buttons on product page
- [ ] **Start** Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook`
- [ ] **Test** cart: add item → verify badge → view checkout → see summary
- [ ] **Test** full flow: add to cart → checkout → pay with `4242 4242 4242 4242` → completion
- [ ] **Verify** product shows "Sold" in Supabase after webhook
- [ ] **Verify** order record created in orders table, cart cleared
- [ ] **Test** multi-item: add 2 products, checkout, verify both marked sold
- [ ] **Test** race condition: add item, set `available=false` in Supabase, checkout → 409
- [ ] **Create** `api/cart-recovery.ts` (generates unique Stripe promo code + captures email)
- [ ] **Update** `showSoldRecovery()` in checkout.js to call cart-recovery API and display code
- [ ] **Test** recovery: trigger 409 → popup → email → get promo code → verify in Stripe Dashboard

---

## Session 5: Shop Grid — ~3 hrs

**YOU WILL HAVE**: All products in filterable grid

- [ ] **Create** `shop.html` (filter sidebar + product grid)
- [ ] **Create** `assets/js/shop.js`
- [ ] **Implement** tile rendering in CSS grid
- [ ] **Add** filter by series, product_type, availability
- [ ] **Add** sort by price, newest, name
- [ ] **Add** URL state for bookmarkable filters
- [ ] **Add** empty/no-results state
- [ ] **Style** tiles: hover zoom, sold badge, lazy images, 4:5 aspect ratio

---

## Session 6: Homepage — ~5 hrs

**YOU WILL HAVE**: Full landing page

- [ ] **Create** `index.html`
- [ ] **Create** `assets/js/homepage.js`
- [ ] **Build** hero section (full viewport, overlay text, CTA)
- [ ] **Build** intro block
- [ ] **Build** featured carousel (fetch `featured=true` products)
- [ ] **Build** brand pillars section
- [ ] **Build** testimonial placeholder
- [ ] **Implement** dynamic theme from site_config
- [ ] **Implement** theatrical lighting CSS effect
- [ ] **Style** responsive

---

## Session 7: Header, Footer, Nav — ~2 hrs

**YOU WILL HAVE**: Consistent navigation everywhere

- [ ] **Build** header: logo, nav links, Shop dropdown, cart icon with badge, mobile hamburger, sticky
- [ ] **Build** footer: 4 columns, newsletter, social links, copyright
- [ ] **Create** `assets/js/newsletter.js`
- [ ] **Create** `api/subscribe.ts` (copy from impl guide)
- [ ] **Add** header + footer to ALL pages
- [ ] **Test** newsletter signup (success + duplicate handling)

---

## Session 8: Remaining Pages — ~3 hrs

**YOU WILL HAVE**: All content pages

- [ ] **Create** `about.html` (photo, origin story, philosophy, mission)
- [ ] **Create** `contact.html` (form + commissions section)
- [ ] **Create** `api/contact.ts`
- [ ] **Create** static pages: FAQ, Shipping & Returns, Terms, Privacy, Policies
- [ ] **Add** availability/cart section to policies page (linked from product card note)
- [ ] **Link** all pages in footer nav

---

## Session 9: Admin UI — ~3 hrs

**YOU WILL HAVE**: Emy can manage products from browser

- [ ] **Create** `admin/index.html` with login form
- [ ] **Create** `assets/js/admin.js`
- [ ] **Implement** Supabase Auth login/logout
- [ ] **Build** product list (table/grid)
- [ ] **Build** new product form (all fields from schema)
- [ ] **Create** `api/upload.ts` (copy from impl guide)
- [ ] **Implement** image upload (file picker → R2 → CDN URL)
- [ ] **Implement** save (INSERT/UPDATE to products)
- [ ] **Implement** delete with confirmation
- [ ] **Test** full admin flow: login → add product → see it on shop page

---

## Session 10: SEO, Testing, Launch — ~3 hrs

**YOU WILL HAVE**: Production-ready site

### SEO
- [ ] **Add** meta titles + descriptions to all pages
- [ ] **Add** Open Graph + Twitter Card tags
- [ ] **Add** Product schema.org structured data
- [ ] **Create** sitemap.xml + robots.txt

### Analytics
- [ ] **Add** Google Analytics 4
- [ ] **Add** custom events: product_view, begin_checkout, purchase
- [ ] **Verify** Google Search Console

### Go Live
- [ ] **Switch** Stripe test keys → live keys in Vercel
- [ ] **Update** webhook signing secret to live
- [ ] **Test** one real transaction (refund after)
- [ ] **Run** cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] **Run** mobile testing (iPhone, iPad, Android)
- [ ] **Run** Lighthouse audit (target 90+)
- [ ] **Check** WCAG AA accessibility
- [ ] **Load** real products (5-10 minimum)
- [ ] **Final** review with Sean + Emy
- [ ] **Launch**

---
*Check off as you go. Details in `v1_2_IMPLEMENTATION.md`.*
