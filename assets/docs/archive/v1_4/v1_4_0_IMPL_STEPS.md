# Everlastings v1.4.0 Action Steps

**Version**: v1.4.0
**Created**: 2026-04-16
**Previous**: v1.3.1 (archived at `assets/docs/archive/v1_3/v1_3_1_IMPL_STEPS.md`)
**Master Plan**: `assets/docs/archive/v1_4/v1_4_0_IMPL_GUIDE.md`
**Format**: One checkbox = one action. ADHD-friendly. Every action is tagged `[SEAN]` (you do it in a dashboard/on your laptop) or `[AGENT]` (the implementation-session agent does it via code/CLI/MCP).

---

- [Everlastings v1.4.0 Action Steps](#everlastings-v140-action-steps)
  - [Phase 0: Sean's Prerequisites](#phase-0-seans-prerequisites)
  - [Phase 1: Agent-Executable Setup](#phase-1-agent-executable-setup)
  - [Phase 2: Build](#phase-2-build)
    - [TRACK A: Foundation + Backend](#track-a-foundation--backend)
      - [A1: Services Setup](#a1-services-setup)
      - [A2: API Endpoints](#a2-api-endpoints)
      - [A3: Admin UI + Product Protocol](#a3-admin-ui--product-protocol)
      - [A4: API Integration Testing](#a4-api-integration-testing)
    - [TRACK B: Frontend Design](#track-b-frontend-design)
      - [B1: Design System](#b1-design-system)
      - [B2: Header, Footer, Nav](#b2-header-footer-nav)
      - [B3: Product Page](#b3-product-page)
      - [B4: Shop Grid](#b4-shop-grid)
      - [B5: Homepage](#b5-homepage)
      - [B6: Remaining Pages](#b6-remaining-pages)
    - [TRACK C: Integration](#track-c-integration)
      - [C1: Wire Pages to Backend](#c1-wire-pages-to-backend)
      - [C2: Checkout Flow E2E](#c2-checkout-flow-e2e)
      - [C3: SEO Finalization](#c3-seo-finalization)
      - [C4: Testing + Launch](#c4-testing--launch)
  - [Dependencies](#dependencies)

---

## Phase 0: Sean's Prerequisites

Human-only — account creation, password decisions, dashboard clicks, domain setup. Done BEFORE an implementation session is kicked off.

  - [ ] [SEAN] **Create** Supabase project (free tier, us-east-1). Save DB password to password manager (16+ chars)
  - [ ] [SEAN] **Copy** Supabase anon key + service role key from Settings > API
  - [ ] [SEAN] **Note** Supabase project URL (format `https://[ref].supabase.co` — cannot be customized on free tier)
  - [ ] [SEAN] **Invite** admin users in Auth > Users: `admin@everlastingsbyemaline.com`, `sean@everlastingsbyemaline.com`, `emyh@everlastingsbyemaline.com`
  - [ ] [SEAN] **Create** Stripe account (if new). Copy test publishable + secret keys
  - [ ] [SEAN] **Enable** Stripe receipts: Dashboard > Settings > Emails > toggle ON "Successful payments" + "Refunds"
  - [ ] [SEAN] **Create** Cloudflare R2 bucket `everlastings`, enable public access
  - [ ] [SEAN] **Connect** R2 custom domain: bucket > Settings > Public access > Custom Domains > Connect Domain > `cdn.everlastingsbyemaline.com`. Wait for Active status
  - [ ] [SEAN] **Create** R2 API token: My Profile > API Tokens > R2 — Read & Write, scoped to `everlastings` bucket
  - [ ] [SEAN] **Create** Cloudinary account (free). Copy cloud name, API key, API secret
  - [ ] [SEAN] **Create** Resend account (free tier, no credit card). Copy API key
  - [ ] [SEAN] **Verify** domain `everlastingsbyemaline.com` in Resend (add DNS records in Cloudflare)
  - [ ] [SEAN] **Create** Shippo Starter account (free, 30 labels/mo). Link USPS account
  - [ ] [SEAN] **Create** GA4 property. Note Measurement ID `G-XXXXXXXXXX`
  - [ ] [SEAN] **Verify** Google Search Console ownership (TXT record or HTML file)
  - [ ] [SEAN] **Get** Meta Pixel ID from Meta Events Manager
  - [ ] [SEAN] **Get** Meta Access Token (system user, `catalog_management` permission)
  - [ ] [SEAN] **Emy's Instagram Shopping prerequisites** (tracking — not blocking for launch):
    - [ ] Instagram account → Business profile
    - [ ] IG profile connected to a Facebook Page
    - [ ] Meta Business Manager with FB Page claimed
    - [ ] Commerce Manager: create catalog (type: E-commerce)
    - [ ] Domain verification (DNS TXT or meta tag for `everlastingsbyemaline.com`)
    - [ ] Submit shop for Commerce review (1-2 weeks)

---

## Phase 1: Agent-Executable Setup

Can be done entirely by an implementation-session agent — no dashboard clicks needed. Prefer MCP servers (Supabase, Stripe) where available.

  - [ ] [AGENT] **Generate** `PRODUCT_API_KEY`: `openssl rand -hex 32` (different value for prod vs preview)
  - [ ] [AGENT] **Create** config files in repo root (copy from implementation guide):
    - [ ] `.env.example`
    - [ ] `vercel.json`
    - [ ] `tsconfig.json`
    - [ ] `package.json`
  - [ ] [AGENT] **Create** `dev` branch: `git checkout main && git checkout -b dev && git push -u origin dev`
  - [ ] [AGENT] **Create** `.env.local`: `cp .env.example .env.local`, fill in test values from Phase 0
  - [ ] [AGENT] **Run** `npm install`
  - [ ] [AGENT] **Verify** `vercel dev` starts without errors
  - [ ] [AGENT] **Add** Vercel env vars per environment (Production + Preview+Development scopes):
    - [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
    - [ ] `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (test values now; live for production during C4)
    - [ ] `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
    - [ ] `CLOUDINARY_URL`
    - [ ] `PRODUCT_API_KEY`
    - [ ] `META_PIXEL_ID`, `META_ACCESS_TOKEN`
    - [ ] `RESEND_API_KEY`, `RESEND_FROM_EMAIL=hello@everlastingsbyemaline.com`
  - [ ] [AGENT] **Verify** DNS: `dig cdn.everlastingsbyemaline.com` resolves to R2 CNAME target

---

## Phase 2: Build

### TRACK A: Foundation + Backend

#### A1: Services Setup

**Goal**: All services connected, schema created, webhooks configured.

##### Vercel
  - [ ] [SEAN] **Create** Vercel project — connect GitHub repo
  - [ ] [SEAN] **Add** custom domain `everlastingsbyemaline.com`
  - [ ] [AGENT] **Set** Vercel auto-deploy: `main` → Production, all other branches → Preview

##### Supabase (via MCP `apply_migration` preferred, or Studio SQL editor)
  - [ ] [AGENT] **Run** SQL: create `products` table (with slug trigger, updated_at trigger)
  - [ ] [AGENT] **Run** SQL: create `customers` table (with updated_at trigger)
  - [ ] [AGENT] **Run** SQL: create `orders` table (includes `tracking_number`, `tracking_carrier`, `shipped_at`, `delivered_at`, `idx_orders_needs_shipping` partial index)
  - [ ] [AGENT] **Run** SQL: create `subscribers` table (includes `promo_code`, `promo_code_expires_at`)
  - [ ] [AGENT] **Run** SQL: create `site_config` table
  - [ ] [AGENT] **Run** SQL: create `webhook_events` table (idempotency — AR #21)
  - [ ] [AGENT] **Run** SQL: create `product_interests` table (email capture — AR #26)
  - [ ] [AGENT] **Run** SQL: create `cart_holds` table (soft reservations — AR #28, #29)
  - [ ] [AGENT] **Enable** RLS on all 8 tables (copy policies from implementation guide)
  - [ ] [AGENT] **Configure** Database Webhook: on `products` INSERT → POST to `{VERCEL_URL}/api/stripe-sync`

##### Stripe (via Stripe MCP or Dashboard)
  - [ ] [AGENT] **Create** test webhook endpoint → `{dev-preview-url}/api/webhook`, event: `checkout.session.completed`
  - [ ] [AGENT or SEAN] **Create** coupon "Haven Finder Apology": 10% off, **Duration: Forever**, **Max redemptions: BLANK**, ID `cart-recovery-10`
  - [ ] [AGENT or SEAN] **Create** coupon "Welcome to the Firelight Council": 5% off, **Duration: Forever**, **Max redemptions: BLANK**, ID `newsletter-welcome-5`

##### Meta Pixel + Instagram Shopping
  - [ ] [SEAN] **Configure** Commerce Manager: catalog feed URL → `https://everlastingsbyemaline.com/api/product-feed` (after A2 endpoint deployed)

##### Resend
  - [ ] [SEAN] **Verify** Resend domain (DNS records in Cloudflare DNS)
  - [ ] [AGENT] **Verify** env vars `RESEND_API_KEY`, `RESEND_FROM_EMAIL` set in Vercel

---

#### A2: API Endpoints

**Goal**: All server-side endpoints working, testable with curl.

  - [ ] [AGENT] **Create** `api/config.ts` — public keys (Stripe publishable, Supabase URL + anon key, Meta Pixel ID)
  - [ ] [AGENT] **Create** `api/stripe-sync.ts` — Supabase webhook handler, creates Stripe Product + Price
  - [ ] [AGENT] **Create** `api/checkout/reserve.ts` (NEW — AR #28) — availability check, creates 15-min cart_hold, optionally upserts subscriber
  - [ ] [AGENT] **Create** `api/checkout.ts` — verifies hold is valid (410 if expired) + creates Stripe session with `ui_mode: 'custom'`, `customer_email` prefill
  - [ ] [AGENT] **Create** `api/session-status.ts` — retrieves session for completion page
  - [ ] [AGENT] **Create** `api/webhook.ts` — idempotency check, customer upsert, mark sold, create orders, record event, Meta CAPI. Fire `customer_email_linked` event when subscriber→customer source transition happens
  - [ ] [AGENT] **Create** `api/cart-recovery.ts` — generates unique Stripe promotion code + sends Resend email
  - [ ] [AGENT] **Create** `api/products.ts` — GET (public), POST/PUT (PRODUCT_API_KEY auth, validation, slug gen, conflict check)
  - [ ] [AGENT] **Create** `api/upload.ts` — PRODUCT_API_KEY auth, file type/size validation, Cloudinary → R2 pipeline
  - [ ] [AGENT] **Create** `api/subscribe.ts` — newsletter subscription. If `source: 'contemplation-offer'`, generate promo code + send welcome email with coupon. Other sources get welcome email without coupon
  - [ ] [AGENT] **Create** `api/contact.ts` — contact form handler
  - [ ] [AGENT] **Create** `api/cart-activity.ts` — fire-and-forget product interest notification
  - [ ] [AGENT] **Create** `api/product-feed.ts` — CSV feed for Meta Commerce Catalog sync
  - [ ] [AGENT] **Create** `api/orders.ts` (NEW — AR #30) — GET list of orders (admin auth), filter by shipping status
  - [ ] [AGENT] **Create** `api/orders/[id].ts` (NEW — AR #30) — PATCH to record tracking number/carrier + fire Resend tracking email
  - [ ] [AGENT] **Create** `api/_emails/index.ts` (NEW — AR #30, #31) — shared Resend sender + three HTML templates (tracking, welcome-coupon, cart-recovery-coupon)

**Auth note**: `api/products.ts`, `api/upload.ts`, `api/orders.ts`, `api/orders/[id].ts` use `PRODUCT_API_KEY` for auth (NOT `SUPABASE_SERVICE_KEY`). See AR #20.

---

#### A3: Admin UI + Product Protocol

**Goal**: Browser-based product management + order shipping fulfillment + documented AI workflow.

  - [ ] [AGENT] **Create** `admin/index.html` — login form, two tabs after auth ("Products", "Orders")
  - [ ] [AGENT] **Create** `assets/js/admin.js`
  - [ ] [AGENT] **Implement** Supabase Auth login/logout
  - [ ] [AGENT] **Build** Products tab: product list with edit/delete
  - [ ] [AGENT] **Build** new product form (all schema fields; price in dollars → cents)
  - [ ] [AGENT] **Implement** image upload via `/api/upload`
  - [ ] [AGENT] **Implement** product save (INSERT or UPDATE)
  - [ ] [AGENT] **Implement** product delete with confirmation
  - [ ] [AGENT] **Build** Orders tab with sub-tabs "Needs Shipping" / "Shipped" (NEW — AR #30)
  - [ ] [AGENT] **Render** order cards: customer info, address (with Copy button), item + total, tracking form
  - [ ] [AGENT] **Wire** "Mark as shipped" → `PATCH /api/orders/:id` → triggers Resend tracking email
  - [ ] [AGENT] **Update** `assets/docs/PRODUCT_PROTOCOL.md` if any new fields surface
  - [ ] [AGENT] **Test** full admin flow: login → add product → verify on shop page; then simulate order → mark shipped → verify tracking email delivered

---

#### A4: API Integration Testing

  - [ ] [AGENT] **Test** stripe-sync: insert product → Stripe product appears
  - [ ] [AGENT] **Test** `api/checkout/reserve`: cart items available → receive `ok, expires_at`, row appears in `cart_holds`
  - [ ] [AGENT] **Test** `api/checkout/reserve` race: two sessions reserve same item → first wins, second gets 409 with `related`
  - [ ] [AGENT] **Test** `api/checkout`: after reserve → receive clientSecret; without hold → 410
  - [ ] [AGENT] **Test** webhook: `stripe listen --forward-to localhost:3000/api/webhook`
  - [ ] [AGENT] **Test** full purchase: cart → reserve → checkout → pay `4242...` → completion
  - [ ] [AGENT] **Verify** customer record + order record created; product marked sold
  - [ ] [AGENT] **Test** multi-item cart: 2 products → both marked sold
  - [ ] [AGENT] **Test** recovery: force 409 → email submitted → promo code generated + emailed via Resend
  - [ ] [AGENT] **Test** newsletter welcome: POST `/api/subscribe` with `source: 'contemplation-offer'` → promo code generated + welcome email with coupon delivered
  - [ ] [AGENT] **Test** newsletter welcome without coupon: POST `/api/subscribe` with `source: 'footer'` → welcome email delivered WITHOUT coupon
  - [ ] [AGENT] **Test** order shipping flow: create test order → PATCH `/api/orders/:id` with tracking → email delivered with correct carrier URL
  - [ ] [AGENT] **Test** products API: POST/PUT/GET with `PRODUCT_API_KEY`
  - [ ] [AGENT] **Test** upload: image + Cloudinary transform + R2 delivery
  - [ ] [AGENT] **Test** upload validation: wrong type → 400, too large → 400, no auth → 401
  - [ ] [AGENT] **Test** webhook idempotency: replay event → ignored
  - [ ] [AGENT] **Test** slug conflict: same title → 409
  - [ ] [AGENT] **Test** admin: login → add product → see on shop; order → mark shipped → verify row + email

---

### TRACK B: Frontend Design

All pages: hardcoded HTML/CSS. Every piece of placeholder content wrapped in `<!-- PLACEHOLDER: name -->` tags (see Placeholder Hygiene reference in IMPL_GUIDE). No JavaScript data-fetching. Client reviews visual design.

#### B1: Design System

  - [ ] [AGENT] **Create** `assets/css/styles.css`
  - [ ] [AGENT] **Define** color variables (from BRAND.md)
  - [ ] [AGENT] **Define** typography (Cormorant Garamond display, system body)
  - [ ] [AGENT] **Define** spacing, shadow, radius, transition, z-index tokens
  - [ ] [AGENT] **Style** buttons: primary, secondary, ghost, disabled
  - [ ] [AGENT] **Style** cards: product tiles with hover effect
  - [ ] [AGENT] **Style** forms: border, focus state, padding
  - [ ] [AGENT] **Style** images: `object-fit: cover`, `aspect-ratio: 4/5`, lazy loading
  - [ ] [AGENT] **Style** badges: "Sold", "Featured"
  - [ ] [AGENT] **Style** error messages
  - [ ] [AGENT] **Style** skeleton loaders (shimmer animation)
  - [ ] [AGENT] **Style** lightbox (fullscreen overlay, nav arrows, keyboard support)
  - [ ] [AGENT] **Create** inline SVG icons: dimensions, weight, materials, lighting, care, shipping
  - [ ] [AGENT] **Set** responsive breakpoints: 393px, 768px, 1024px, 1440px
  - [ ] [AGENT] **Add** GA4 `gtag.js` snippet to page `<head>` template
  - [ ] [AGENT] **Add** Meta Pixel base code to page `<head>` template (alongside GA4)
  - [ ] [AGENT] **Style** contemplation popup (bottom-right peel-up animation)
  - [ ] [AGENT] **Style** exit intent modal (centered overlay)
  - [ ] [AGENT] **Style** product interest CTA (below sticky card buttons)
  - [ ] [AGENT] **Style** cart recovery overlay (two-step: email capture + related products cards)
  - [ ] [AGENT] **Style** checkout two-stage layout (Stage A info → Stage B payment, stacked sections)

#### B2: Header, Footer, Nav
  - [ ] [AGENT] **Build** header: logo, nav, shop dropdown, cart icon + badge (links to `/cart.html`), mobile hamburger, sticky
  - [ ] [AGENT] **Build** footer: 4 columns, newsletter input, social links, copyright

#### B3: Product Page
  - [ ] [AGENT] **Create** `product.html` — two-column layout (story left, sticky card right)
  - [ ] [AGENT] **Build** image gallery + thumbnail strip
  - [ ] [AGENT] **Build** lightbox: click → fullscreen, keyboard nav
  - [ ] [AGENT] **Build** sticky product card: thumbnail, title, price, buttons, availability note
  - [ ] [AGENT] **Build** features list with SVG icons
  - [ ] [AGENT] **Build** details: dimensions, materials, care, shipping
  - [ ] [AGENT] **Build** story card section
  - [ ] [AGENT] **Add** breadcrumb: Home > Shop > Product
  - [ ] [AGENT] **Add** "Related Havens" placeholder (3-4 cards)
  - [ ] [AGENT] **Add** video/GIF placeholders in gallery
  - [ ] [AGENT] **Add** email CTA 1: product interest form below sticky card buttons
  - [ ] [AGENT] **Add** email CTA 3: contemplation popup (bottom-right peel, placeholder)
  - [ ] [AGENT] **Add** email CTA 2: exit intent modal (hidden by default, on all product pages)

#### B4: Shop Grid
  - [ ] [AGENT] **Create** `shop.html`
  - [ ] [AGENT] **Build** 6-8 hardcoded product tiles (wrapped in PLACEHOLDER tags)
  - [ ] [AGENT] **Build** filter sidebar: series, type, availability
  - [ ] [AGENT] **Build** sort dropdown
  - [ ] [AGENT] **Style** "Sold" badge and all 5 Shop states (see Error States Reference — Loading / No Products / All Sold / Filter Zero / Fetch Failed)

#### B5: Homepage
  - [ ] [AGENT] **Create** `index.html`
  - [ ] [AGENT] **Build** hero: full viewport, overlay text, CTA
  - [ ] [AGENT] **Build** intro block
  - [ ] [AGENT] **Build** featured carousel (3-4 hardcoded cards)
  - [ ] [AGENT] **Build** brand pillars
  - [ ] [AGENT] **Build** testimonial placeholder
  - [ ] [AGENT] **Add** theatrical lighting CSS effect

#### B6: Remaining Pages
  - [ ] [AGENT] **Create** `about.html` — photo, origin story, philosophy, mission
  - [ ] [AGENT] **Create** `contact.html` — form + commission section
  - [ ] [AGENT] **Create** `faq.html`
  - [ ] [AGENT] **Create** `shipping.html`
  - [ ] [AGENT] **Create** `terms.html`
  - [ ] [AGENT] **Create** `privacy.html`
  - [ ] [AGENT] **Create** `policies.html` — includes availability section
  - [ ] [AGENT] **Create** `cart.html` (NEW in v1.4) — line items + cost estimate + optional email/name + [CHECKOUT] button. Hidden recovery overlay with email form + related products slot
  - [ ] [AGENT] **Create** `checkout.html` — two stacked sections: Stage A info form, Stage B payment (hidden until Stage A valid)
  - [ ] [AGENT] **Create** `complete.html` — success/error states

---

### TRACK C: Integration

Wire Track B pages to Track A backend. First task: `grep -rn "PLACEHOLDER" .` → that's the to-do list. Last task before C4: same grep returns zero lines.

#### C1: Wire Pages to Backend
  - [ ] [AGENT] **Create** `assets/js/main.js` — Supabase client via `/api/config`, cart functions, utilities, browser session_id (crypto.randomUUID → localStorage)
  - [ ] [AGENT] **Set** `R2_PUBLIC_URL` to `https://cdn.everlastingsbyemaline.com`
  - [ ] [AGENT] **Seed** test products in Supabase Studio
  - [ ] [AGENT] **Seed** test images in R2 bucket
  - [ ] [AGENT] **Create** `assets/js/product.js` — fetch + render product, gallery, lightbox, related products
  - [ ] [AGENT] **Create** `assets/js/shop.js` — fetch products, render tiles, filters, sort, URL state, all shop states
  - [ ] [AGENT] **Create** `assets/js/homepage.js` — featured carousel, theme from site_config
  - [ ] [AGENT] **Create** `assets/js/newsletter.js` — POST to `/api/subscribe`
  - [ ] [AGENT] **Create** `assets/js/cart.js` (NEW) — cart page line items + email/name capture + [CHECKOUT] button + reserve call + 409 recovery
  - [ ] [AGENT] **Create** `assets/js/recovery.js` — shared overlay rendering (step 1 email + related, step 3 code display), used by cart.js
  - [ ] [AGENT] **Wire** `buildGa4Item()` and `trackMeta()` helpers in main.js
  - [ ] [AGENT] **Wire** CTA 1 (product interest): POST to subscribe + insert product_interests
  - [ ] [AGENT] **Wire** CTA 2 (exit intent): mouse-leave / visibilitychange detection on all product pages
  - [ ] [AGENT] **Wire** CTA 3 (contemplation): 3-min timer + promo code generation via api/subscribe
  - [ ] [AGENT] **Wire** GA4 + Meta Pixel events:

| Event                   | Trigger                              |
| ----------------------- | ------------------------------------ |
| `view_item`             | Product page load                    |
| `add_to_cart`           | Add to Cart click                    |
| `remove_from_cart`      | Remove from cart                     |
| `begin_checkout`        | [CHECKOUT] click on /cart.html       |
| `purchase`              | Completion page success              |
| `newsletter_signup`     | Successful subscribe                 |
| `email_cta_capture`     | Any of the 3 CTAs                    |
| `customer_email_linked` | Webhook detects subscriber→customer  |
| `contact_form_submit`   | Contact form success                 |
| `commission_inquiry`    | Commission form submit               |
| `search_filter`         | Shop filter applied                  |
| `gallery_open`          | Lightbox opened                      |
| `video_play`            | Product video starts                 |
| `promo_code_generated`  | Cart recovery completed              |

Meta Pixel events fire in parallel: `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`, `Lead`, `Contact`.

#### C2: Checkout Flow E2E
  - [ ] [AGENT] **Create** `assets/js/checkout.js` — two-stage progressive disclosure (Stage A info, Stage B payment). Never triggers 409 recovery (that's /cart.html's job)
  - [ ] [AGENT] **Wire** checkout.html to pull Stripe key from `/api/config` (no hardcoded key)
  - [ ] [AGENT] **Wire** complete.html (session status check, cart clear, session_id localStorage clear)
  - [ ] [AGENT] **Wire** Add to Cart + Buy Now buttons on product page (both navigate to /cart.html on click)
  - [ ] [AGENT] **Start** Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook`
  - [ ] [AGENT] **Test** full flow: product → add to cart → /cart.html → [CHECKOUT] → /checkout.html Stage A → Stage B → pay `4242...` → /complete.html
  - [ ] [AGENT] **Test** multi-item cart
  - [ ] [AGENT] **Test** 409 on /cart.html: force unavailable → recovery overlay shown BEFORE any PII entered
  - [ ] [AGENT] **Test** related products in recovery overlay render
  - [ ] [AGENT] **Test** 410 on /checkout.html: expire hold manually → user sees "reservation timed out" + redirect to /cart.html

#### C3: SEO Finalization
  - [ ] [AGENT] **Add** dynamic meta titles + descriptions
  - [ ] [AGENT] **Add** Open Graph + Twitter Card tags
  - [ ] [AGENT] **Add** Product schema.org structured data (JSON-LD)
  - [ ] [AGENT] **Create** `sitemap.xml` + `robots.txt`
  - [ ] [SEAN] **Submit** sitemap to Google Search Console

#### C4: Testing + Launch

##### Placeholder Audit
  - [ ] [AGENT] **Run** `grep -rn "PLACEHOLDER" .` — MUST return zero matches before launch (see Placeholder Hygiene reference in IMPL_GUIDE)

##### Stripe Live Mode
  - [ ] [AGENT] **Set** live keys for Production scope in Vercel Dashboard
  - [ ] [SEAN] **Create** live webhook endpoint in Stripe Dashboard → production URL
  - [ ] [AGENT] **Set** live `STRIPE_WEBHOOK_SECRET` for Production scope
  - [ ] [AGENT] **Merge** `dev` → `main`
  - [ ] [SEAN + AGENT] **Test** one real transaction (refund after)

##### Cross-Browser Testing
  - [ ] [AGENT] Chrome, Safari, Firefox, Edge
  - [ ] [AGENT] iPhone, iPad, Android
  - [ ] [AGENT] Full checkout flow on production
  - [ ] [AGENT] Admin flow: login → add product + mark shipped → verify emails
  - [ ] [AGENT] Newsletter + contact form
  - [ ] [AGENT] All internal links

##### Performance
  - [ ] [AGENT] Lighthouse 90+ all categories
  - [ ] [AGENT] WCAG AA accessibility
  - [ ] [AGENT] Keyboard navigation (including lightbox)
  - [ ] [AGENT] All images WebP, lazy loaded, alt text

##### Launch
  - [ ] [SEAN] DNS → Vercel, SSL active
  - [ ] [SEAN + AGENT] 5-10 real products loaded
  - [ ] [SEAN] Final review with Emy
  - [ ] [SEAN] Launch

##### Post-Session Consistency Sweep (see reference section in IMPL_GUIDE)
  - [ ] [AGENT] Spawn fresh-context Explore subagent to audit all `.md` files for stale references. Report only — Sean drives fixes

---

## Dependencies

  ```
  Phase 0 (Sean) ──→ Phase 1 (Agent) ──→ Phase 2
                                            │
                                            ├── A1 ──→ A2 ──→ A3 ──→ A4
                                            ├── B1 ──→ B2 ──→ B3 ──→ B4 ──→ B5 ──→ B6
                                            │             │
                                            └── A2 + B3 ──→ C1 ──→ C2 ──→ C3 ──→ C4
  ```

Phase 0 is Sean-only. Phase 1 is agent-only. Phase 2 tracks A and B proceed in parallel. Track C integrates them.

---
*One checkbox = one action. Every action tagged [SEAN] or [AGENT]. Phase 0 happens once (human setup), Phase 1 happens at session start (agent setup), Phase 2 is the build.*
