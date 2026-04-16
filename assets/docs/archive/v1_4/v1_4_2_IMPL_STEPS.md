# Everlastings v1.4.0 Action Steps

**Version**: v1.4.0
**Created**: 2026-04-16
**Revised**: 2026-04-16 (restructured — Phase 1 removed as duplicate of A1; every checkbox tagged)
**Previous**: v1.3.1 (archived at `assets/docs/archive/v1_3/v1_3_1_IMPL_STEPS.md`)
**Master Plan**: `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md`
**Format**: One checkbox = one action. ADHD-friendly. Every action tagged `(SEAN)` (you do it in a dashboard/on your laptop), `(AGENT)` (agent does it via code/CLI/MCP), or `(SEAN+AGENT)` (handoff pair).

> **Reading order**: Phase 0 (human setup, done before first session) → Track A (backend) in parallel with Track B (frontend design) → Track C (integration + launch). Reference sections live in the IMPL_GUIDE; they are read-only.

---

- [Everlastings v1.4.0 Action Steps](#everlastings-v140-action-steps)
  - [Phase 0: Sean's Prerequisites + Agent Bootstrap](#phase-0-seans-prerequisites--agent-bootstrap)
    - [Setup the repo and env scaffolding](#setup-the-repo-and-env-scaffolding)
    - [Reconcile branches from current state](#reconcile-branches-from-current-state)
    - [Services — for each, copy secrets into `.env.local` AND `vercel env add` in one pass](#services--for-each-copy-secrets-into-envlocal-and-vercel-env-add-in-one-pass)
    - [Emy's Instagram Shopping (tracking — can proceed in parallel with build)](#emys-instagram-shopping-tracking--can-proceed-in-parallel-with-build)
    - [Agent bootstrap (after all services/env vars exist)](#agent-bootstrap-after-all-servicesenv-vars-exist)
  - [TRACK A: Foundation + Backend](#track-a-foundation--backend)
    - [A1: Services Setup (verification + dependent config)](#a1-services-setup-verification--dependent-config)
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

## Phase 0: Sean's Prerequisites + Agent Bootstrap

> **ACTION — (SEAN+AGENT).** 
> Human-only service work, interleaved with agent bootstrap tasks. 
> Done BEFORE the first Track-A implementation session. 
> Every secret goes into `.env.local` AND `vercel env add` in the same sitting — one touch per key.

### Setup the repo and env scaffolding

  - [ ] (AGENT) **Create** `.env.example` (template, no real values) from [Configuration Files](./v1_4_2_IMPL_GUIDE.md#configuration-files-reference) in the guide
  - [ ] (AGENT) **Create** `.env.local` from template: `cp .env.example .env.local`
  - [ ] (SEAN) **Verify** `.env.local` is in `.gitignore`
  - [ ] (AGENT) **Create** `vercel.json`, `tsconfig.json`, `package.json` from the guide
  - [ ] (AGENT) **Run** `npm install`
  - [ ] (AGENT) **Verify** `vercel dev` starts without errors

### Reconcile branches from current state

  - [ ] (SEAN+AGENT) **Merge** current `everlastings` branch → `main` (PR or direct merge)
  - [ ] (SEAN+AGENT) **Create** `dev` from `main`: `git checkout main && git checkout -b dev && git push -u origin dev`
  - [ ] (SEAN) **Delete** local and remote `everlastings` branch once merged
  - [ ] (AGENT) **Confirm** Vercel auto-deploys `main` → Production, `dev` → Preview

### Services — for each, copy secrets into `.env.local` AND `vercel env add` in one pass

  - [ ] (SEAN) **Supabase**: create project (free tier, us-east-1), save DB password, copy anon + service keys → `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
  - [ ] (SEAN) **Supabase Auth > Users**: invite `admin@everlastingsbyemaline.com`, `sean@everlastingsbyemaline.com`, `emyh@everlastingsbyemaline.com`
  - [ ] (SEAN) **Stripe**: create account, copy test keys → `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` (live keys captured at C4 launch)
  - [ ] (SEAN) **Stripe receipts**: Dashboard > Settings > Emails > toggle ON "Successful payments" + "Refunds"
  - [ ] (SEAN) **Cloudflare R2**: create bucket `everlastings`, enable public access
  - [ ] (SEAN) **R2 custom domain**: bucket > Settings > Public access > Custom Domains > Connect Domain > `cdn.everlastingsbyemaline.com` (wait for Active status)
  - [ ] (SEAN) **R2 API token**: create Read & Write scoped to bucket → `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME=everlastings`, `R2_PUBLIC_URL=https://cdn.everlastingsbyemaline.com`
  - [ ] (SEAN) **Cloudinary**: create account, compose and copy `CLOUDINARY_URL` (format `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`)
  - [ ] (SEAN) **Resend**: create account, verify `everlastingsbyemaline.com` domain in Cloudflare DNS → `RESEND_API_KEY`, `RESEND_FROM_EMAIL=hello@everlastingsbyemaline.com`
  - [ ] (SEAN) **Shippo**: create Starter account (free, 30 labels/mo), link USPS account. NO API key in v1 — web UI only
  - [ ] (SEAN) **Meta**: Business Manager + Commerce Manager catalog + Meta Pixel + domain verification → `META_PIXEL_ID`, `META_ACCESS_TOKEN` (system user, `catalog_management` scope)
  - [ ] (SEAN) **GA4**: create property, note Measurement ID `G-XXXXXXXXXX`
  - [ ] (SEAN) **Google Search Console**: verify ownership (TXT record or HTML file)
  - [ ] (SEAN) **Confirm** `everlastingsbyemaline.com` is on Cloudflare DNS
  - [ ] (SEAN) **Generate** `PRODUCT_API_KEY`: `openssl rand -hex 32` (different value per Vercel environment). Sean owns the secret and is the only human who should see it in raw form — Emy never types or handles this key

### Emy's Instagram Shopping (tracking — can proceed in parallel with build)

  - [ ] (SEAN+EMY) **Coordinate** with Emy on her IG Shopping setup. Sub-items are Emy's own account work in her Meta accounts; Sean's role is unblocking her (he's already been added to her Meta Business account):
    - [ ] (EMY) Instagram account → Business profile
    - [ ] (EMY) IG connected to Facebook Page
    - [ ] (EMY) Meta Business Manager claims FB Page
    - [ ] (EMY) Commerce Manager catalog (type: E-commerce)
    - [ ] (SEAN+EMY) Domain verification (DNS TXT or meta tag) — Sean adds the DNS record in Cloudflare; Emy confirms verification in Meta
    - [ ] (EMY) Submit shop for Commerce review (1-2 weeks)

### Agent bootstrap (after all services/env vars exist)

  - [ ] (AGENT) **Apply** Supabase migrations via MCP `apply_migration`: all 8 tables + RLS policies + triggers (`set_slug`, `set_updated_at_*`) + `is_test` column on the 6 transactional tables + partial indexes. Canonical SQL in IMPL_GUIDE > Product Schema Hard Reference + A1 Supabase
  - [ ] (AGENT) **Configure** Supabase Database Webhook: on `products` INSERT → POST to `{VERCEL_URL}/api/stripe-sync`
  - [ ] (AGENT) **Create** `api/_bootstrap/coupons.ts` — idempotent coupon bootstrap (see A1 Stripe in IMPL_GUIDE)
  - [ ] (AGENT) **Run** `npx tsx api/_bootstrap/coupons.ts` once in test mode — verify both `cart-recovery-10` and `newsletter-welcome-5` exist in Stripe Dashboard > Products > Coupons
  - [ ] (AGENT) **Create** Stripe test webhook endpoint via CLI/MCP → pinned to `dev` branch's preview URL (e.g. `https://everlastings-git-dev-{team}.vercel.app/api/webhook`), event `checkout.session.completed`. For `feat/*` branches, use `stripe listen` instead — see IMPL_GUIDE > Dev/Test Data Hygiene > Stripe webhook endpoint pinning
  - [ ] (AGENT) **Smoke-test preview URL functionality**: push throwaway commit on `feat/_preview-smoketest` branch → open the auto-generated `*.vercel.app` preview URL → DevTools console must show no CORS errors → `fetch('/api/config').then(r => r.json())` returns the **test** publishable key. Delete branch after. Catches the failure mode where every prior Vercel project's previews "loaded nothing" due to hardcoded CORS

---

## TRACK A: Foundation + Backend

### A1: Services Setup (verification + dependent config)

> **ACTION — (AGENT) mostly; verification only — Phase 0 did the bulk.**

  - [ ] (SEAN) **Add** custom domain `everlastingsbyemaline.com` to Vercel project (Settings > Domains)
  - [ ] (AGENT) **Push** to trigger a Vercel deploy; verify it loads
  - [ ] (AGENT) **Verify** DNS: `dig cdn.everlastingsbyemaline.com` resolves to R2 CNAME target
  - [ ] (AGENT) **Verify** Supabase Database Webhook fires on `products` INSERT (tail logs or insert a test product)
  - [ ] (AGENT) **Verify** Stripe coupons exist (`cart-recovery-10`, `newsletter-welcome-5`)

### A2: API Endpoints

> **ACTION — (AGENT) only.** 
> Goal: all server-side endpoints working, testable with curl.

  - [ ] (AGENT) **Create** `api/_lib/env.ts` — exports `isTest = process.env.VERCEL_ENV !== 'production'`. Drives `is_test` row flag and R2 path namespacing
  - [ ] (AGENT) **Create** `api/_lib/cors.ts` — exports `corsHeaders(req)` and `preflight(req)` with allowlist regex for `everlastingsbyemaline.com`, `*.vercel.app`, `localhost:3000`. Every endpoint imports both
  - [ ] (AGENT) **Create** `api/config.ts` — public keys (Stripe publishable, Supabase URL + anon key, Meta Pixel ID). Wraps response in `corsHeaders(req)`; exports `OPTIONS = preflight`
  - [ ] (AGENT) **Create** `api/stripe-sync.ts` — Supabase webhook handler, creates Stripe Product + Price
  - [ ] (AGENT) **Create** `api/checkout/reserve.ts` (NEW — AR #28) — availability check, creates 15-min cart_hold (with `is_test: isTest`), optionally upserts subscriber (with `is_test: isTest`)
  - [ ] (AGENT) **Create** `api/checkout.ts` — verifies hold is valid (410 if expired) + creates Stripe session with `ui_mode: 'custom'`, `customer_email` prefill
  - [ ] (AGENT) **Create** `api/session-status.ts` — retrieves session for completion page
  - [ ] (AGENT) **Create** `api/webhook.ts` — idempotency check, customer upsert (with `is_test: isTest`), mark sold, create orders (with `is_test: isTest`), record event, Meta CAPI. Fire `customer_email_linked` event when subscriber→customer source transition happens
  - [ ] (AGENT) **Create** `api/cart-recovery.ts` — generates unique Stripe promotion code + sends Resend email
  - [ ] (AGENT) **Create** `api/products.ts` — GET (public, filters `is_test = false` in production reads), POST/PUT (PRODUCT_API_KEY auth, validation, slug gen, conflict check, sets `is_test: isTest` on INSERT)
  - [ ] (AGENT) **Create** `api/upload.ts` — PRODUCT_API_KEY auth, file type/size validation, Cloudinary → R2 pipeline. R2 key uses `test/{slug}/test_{role}-{slug}.ext` when `isTest`, `products/{slug}/{role}-{slug}.ext` otherwise
  - [ ] (AGENT) **Create** `api/subscribe.ts` — newsletter subscription (writes with `is_test: isTest`). If `source: 'contemplation-offer'`, generate promo code + send welcome email with coupon. Other sources get welcome email without coupon
  - [ ] (AGENT) **Create** `api/contact.ts` — contact form handler
  - [ ] (AGENT) **Create** `api/cart-activity.ts` — fire-and-forget product interest notification (writes with `is_test: isTest`)
  - [ ] (AGENT) **Create** `api/product-feed.ts` — CSV feed for Meta Commerce Catalog sync. Filters `WHERE is_test = false` so test products never appear in the live catalog
  - [ ] (AGENT) **Create** `api/orders.ts` (NEW — AR #30) — GET list of orders (admin auth), filter by shipping status. In production, filter `WHERE is_test = false`
  - [ ] (AGENT) **Create** `api/orders/[id].ts` (NEW — AR #30) — PATCH to record tracking number/carrier + fire Resend tracking email
  - [ ] (AGENT) **Create** `api/_emails/index.ts` (NEW — AR #30, #31) — shared Resend sender + three HTML templates (tracking, welcome-coupon, cart-recovery-coupon)
  - [ ] (AGENT) **Apply** the `corsHeaders(req)` + `preflight(req)` pattern from `api/_lib/cors.ts` to every endpoint above (no exceptions). Without this, browser fetches from `*.vercel.app` previews are silently blocked
  - [ ] (SEAN) **Configure** Meta Commerce Manager: Catalog > Data Sources > Add Feed > URL: `https://everlastingsbyemaline.com/api/product-feed` (production URL only — preview URLs would expose test products if Meta ever consumed them)

**Auth note**: `api/products.ts`, `api/upload.ts`, `api/orders.ts`, `api/orders/[id].ts` use `PRODUCT_API_KEY` for auth (NOT `SUPABASE_SERVICE_KEY`). See AR #20.

### A3: Admin UI + Product Protocol

> **ACTION — (AGENT) builds; (SEAN) reviews Product Protocol doc.**

  - [ ] (AGENT) **Create** `admin/index.html` — login form, two tabs after auth ("Products", "Orders")
  - [ ] (AGENT) **Create** `assets/js/admin.js`
  - [ ] (AGENT) **Implement** Supabase Auth login/logout
  - [ ] (AGENT) **Build** Products tab: product list with edit/delete
  - [ ] (AGENT) **Build** new product form (all schema fields; price in dollars → cents)
  - [ ] (AGENT) **Implement** image upload via `/api/upload`
  - [ ] (AGENT) **Implement** product save (INSERT or UPDATE)
  - [ ] (AGENT) **Implement** product delete with confirmation
  - [ ] (AGENT) **Build** Orders tab with three sub-tabs: "Needs Shipping" (default), "Shipped", "All Orders" (full historical list with a search box: email / order id / tracking number). Every order ever placed remains visible in "All Orders" indefinitely — no archive or time window (NEW — AR #30)
  - [ ] (AGENT) **Auth**: admin UI sends the Supabase Auth JWT as `Authorization: Bearer <jwt>` to `/api/orders` and `/api/orders/:id`. Server verifies via `supabase.auth.getUser(jwt)` (helper at `api/_lib/adminAuth.ts`). No `PRODUCT_API_KEY` for orders
  - [ ] (AGENT) **Render** order cards: customer info, address (with Copy button), item + total, tracking form, `shipped_at` timestamp, `tracking_email_sent_at` status (NULL → show "Resend tracking email" button)
  - [ ] (AGENT) **Wire** "Mark as shipped" → `PATCH /api/orders/:id` → records tracking, fires Resend tracking email, writes `tracking_email_sent_at` on Resend success
  - [ ] (AGENT) **Update** `assets/docs/PRODUCT_PROTOCOL.md` if any new fields surface
  - [ ] (SEAN) **Review** `assets/docs/PRODUCT_PROTOCOL.md`
  - [ ] (SEAN) **Create Custom GPT** "Everlastings Product Assistant" per IMPL_GUIDE > [Custom GPT](./v1_4_2_IMPL_GUIDE.md#custom-gpt-everlastings-product-assistant--emys-ai-path-new) — paste Instructions + OpenAPI schema, set Bearer auth to production `PRODUCT_API_KEY`, set privacy URL to `everlastingsbyemaline.com/privacy.html`, smoke test with a $1 throwaway product (delete after), send private link to Emy to bookmark
  - [ ] (AGENT) **Test** full admin flow: login → add product → verify on shop page; then simulate order → mark shipped → verify tracking email delivered
  - [ ] (AGENT) **Test** Custom GPT flow (pre-handoff): open the GPT, create a test product from scratch with placeholder images, confirm the preview step requires explicit approval, confirm created product appears in shop. Delete the test product after.

### A4: API Integration Testing

> **ACTION — (AGENT) runs automated tests; (SEAN) does real-card smoke test at launch (C4).**

  - [ ] (AGENT) **Test** stripe-sync: insert product → Stripe product appears
  - [ ] (AGENT) **Test** `api/checkout/reserve`: cart items available → receive `ok, expires_at`, row appears in `cart_holds`
  - [ ] (AGENT) **Test** `api/checkout/reserve` race: two sessions reserve same item → first wins, second gets 409 with `related`
  - [ ] (AGENT) **Test** `api/checkout`: after reserve → receive clientSecret; without hold → 410
  - [ ] (AGENT) **Test** webhook: `stripe listen --forward-to localhost:3000/api/webhook`
  - [ ] (AGENT) **Test** full purchase: cart → reserve → checkout → pay `4242...` → completion
  - [ ] (AGENT) **Verify** customer record + order record created; product marked sold
  - [ ] (AGENT) **Test** multi-item cart: 2 products → both marked sold
  - [ ] (AGENT) **Test** recovery: force 409 → email submitted → promo code generated + emailed via Resend
  - [ ] (AGENT) **Test** newsletter welcome: POST `/api/subscribe` with `source: 'contemplation-offer'` → promo code generated + welcome email with coupon delivered
  - [ ] (AGENT) **Test** newsletter welcome without coupon: POST `/api/subscribe` with `source: 'footer'` → welcome email delivered WITHOUT coupon
  - [ ] (AGENT) **Test** order shipping flow: create test order → PATCH `/api/orders/:id` with tracking → email delivered with correct carrier URL
  - [ ] (AGENT) **Test** products API: POST/PUT/GET with `PRODUCT_API_KEY`
  - [ ] (AGENT) **Test** upload: image + Cloudinary transform + R2 delivery
  - [ ] (AGENT) **Test** upload validation: wrong type → 400, too large → 400, no auth → 401
  - [ ] (AGENT) **Test** webhook idempotency: replay event → ignored
  - [ ] (AGENT) **Test** slug conflict: same title → 409
  - [ ] (AGENT) **Test** admin: login → add product → see on shop; order → mark shipped → verify row + email

---

## TRACK B: Frontend Design

> **ACTION — (AGENT) builds; (SEAN) reviews visual design.** 
> All pages: hardcoded HTML/CSS. 
> Every piece of placeholder content wrapped in `<!-- PLACEHOLDER: name -->` tags (see Placeholder Hygiene reference in IMPL_GUIDE). 
> No JavaScript data-fetching. 
> Client reviews visual design.

### B1: Design System

  - [ ] (AGENT) **Create** `assets/css/styles.css`
  - [ ] (AGENT) **Define** color variables (from BRAND.md)
  - [ ] (AGENT) **Define** typography (Cormorant Garamond display, system body)
  - [ ] (AGENT) **Define** spacing, shadow, radius, transition, z-index tokens
  - [ ] (AGENT) **Style** buttons: primary, secondary, ghost, disabled
  - [ ] (AGENT) **Style** cards: product tiles with hover effect
  - [ ] (AGENT) **Style** forms: border, focus state, padding
  - [ ] (AGENT) **Style** images: `object-fit: cover`, `aspect-ratio: 4/5`, lazy loading
  - [ ] (AGENT) **Style** badges: "Sold", "Featured"
  - [ ] (AGENT) **Style** error messages
  - [ ] (AGENT) **Style** skeleton loaders (shimmer animation)
  - [ ] (AGENT) **Style** lightbox (fullscreen overlay, nav arrows, keyboard support)
  - [ ] (AGENT) **Create** inline SVG icons: dimensions, weight, materials, lighting, care, shipping
  - [ ] (AGENT) **Set** responsive breakpoints: 393px, 768px, 1024px, 1440px
  - [ ] (AGENT) **Add** GA4 `gtag.js` snippet to page `<head>` template
  - [ ] (AGENT) **Add** Meta Pixel base code to page `<head>` template (alongside GA4)
  - [ ] (AGENT) **Style** contemplation popup (bottom-right peel-up animation)
  - [ ] (AGENT) **Style** exit intent modal (centered overlay)
  - [ ] (AGENT) **Style** product interest CTA (below sticky card buttons)
  - [ ] (AGENT) **Style** cart recovery overlay (two-step: email capture + related products cards)
  - [ ] (AGENT) **Style** checkout two-stage layout (Stage A info → Stage B payment, stacked sections)

### B2: Header, Footer, Nav

  - [ ] (AGENT) **Build** header: logo, nav, shop dropdown, cart icon + badge (links to `/cart.html`), mobile hamburger, sticky
  - [ ] (AGENT) **Build** footer: 4 columns, newsletter input, social links, copyright

### B3: Product Page

  - [ ] (AGENT) **Create** `product.html` — two-column layout (story left, sticky card right)
  - [ ] (AGENT) **Build** image gallery + thumbnail strip
  - [ ] (AGENT) **Build** lightbox: click → fullscreen, keyboard nav
  - [ ] (AGENT) **Build** sticky product card: thumbnail, title, price, buttons, availability note
  - [ ] (AGENT) **Build** features list with SVG icons
  - [ ] (AGENT) **Build** details: dimensions, materials, care, shipping
  - [ ] (AGENT) **Build** story card section
  - [ ] (AGENT) **Add** breadcrumb: Home > Shop > Product
  - [ ] (AGENT) **Add** "Related Havens" placeholder (3-4 cards)
  - [ ] (AGENT) **Add** video/GIF placeholders in gallery
  - [ ] (AGENT) **Add** email CTA 1: product interest form below sticky card buttons
  - [ ] (AGENT) **Add** email CTA 3: contemplation popup (bottom-right peel, placeholder)
  - [ ] (AGENT) **Add** email CTA 2: exit intent modal (hidden by default, on all product pages)

### B4: Shop Grid

  - [ ] (AGENT) **Create** `shop.html`
  - [ ] (AGENT) **Build** 6-8 hardcoded product tiles (wrapped in PLACEHOLDER tags)
  - [ ] (AGENT) **Build** filter sidebar: series, type, availability
  - [ ] (AGENT) **Build** sort dropdown
  - [ ] (AGENT) **Style** "Sold" badge and all 5 Shop states (see Error States Reference — Loading / No Products / All Sold / Filter Zero / Fetch Failed)

### B5: Homepage

  - [ ] (AGENT) **Create** `index.html`
  - [ ] (AGENT) **Build** hero: full viewport, overlay text, CTA
  - [ ] (AGENT) **Build** intro block
  - [ ] (AGENT) **Build** featured carousel (3-4 hardcoded cards)
  - [ ] (AGENT) **Build** brand pillars
  - [ ] (AGENT) **Build** testimonial placeholder
  - [ ] (AGENT) **Add** theatrical lighting CSS effect

### B6: Remaining Pages

  - [ ] (AGENT) **Create** `about.html` — photo, origin story, philosophy, mission
  - [ ] (AGENT) **Create** `contact.html` — form + commission section
  - [ ] (AGENT) **Create** `faq.html`
  - [ ] (AGENT) **Create** `shipping.html`
  - [ ] (AGENT) **Create** `terms.html`
  - [ ] (AGENT) **Create** `privacy.html`
  - [ ] (AGENT) **Create** `policies.html` — includes availability section
  - [ ] (AGENT) **Create** `cart.html` (NEW in v1.4) — line items + cost estimate + optional email/name + `CHECKOUT` button. Hidden recovery overlay with email form + related products slot
  - [ ] (AGENT) **Create** `checkout.html` — two stacked sections: Stage A info form, Stage B payment (hidden until Stage A valid)
  - [ ] (AGENT) **Create** `complete.html` — success/error states

---

## TRACK C: Integration

> **ACTION — (AGENT) builds integrations; (SEAN) does final QA + real-card test + DNS flip at launch.** 
> Wire Track B pages to Track A backend. 
> First task: `grep -rn "PLACEHOLDER" .` → that's the to-do list. 
> Last task before C4: same grep returns zero lines.

### C1: Wire Pages to Backend

> **Convention**: every `fetch()` call uses a relative path (`/api/foo`), never an absolute URL. Absolute URLs route preview-deployment requests back to production and break the dev environment. The Track C grep pass should flag any `fetch('https://everlastingsbyemaline.com` in `assets/js/`. See IMPL_GUIDE > Dev/Test Data Hygiene > Frontend uses relative API paths.

  - [ ] (AGENT) **Create** `assets/js/main.js` — Supabase client via `/api/config`, cart functions, utilities, browser session_id (crypto.randomUUID → localStorage)
  - [ ] (AGENT) **Seed** test products in Supabase Studio (via the Product Protocol against the dev preview URL — `BASE_URL` set to `*.vercel.app`. Rows land with `is_test = true` automatically)
  - [ ] (AGENT) **Seed** test images in R2 bucket
  - [ ] (AGENT) **Create** `assets/js/product.js` — fetch + render product, gallery, lightbox, related products
  - [ ] (AGENT) **Create** `assets/js/shop.js` — fetch products, render tiles, filters, sort, URL state, all shop states
  - [ ] (AGENT) **Create** `assets/js/homepage.js` — featured carousel, theme from site_config
  - [ ] (AGENT) **Create** `assets/js/newsletter.js` — POST to `/api/subscribe`
  - [ ] (AGENT) **Create** `assets/js/cart.js` (NEW) — cart page line items + email/name capture + `CHECKOUT` button + reserve call + 409 recovery
  - [ ] (AGENT) **Create** `assets/js/recovery.js` — shared overlay rendering (step 1 email + related, step 3 code display), used by cart.js
  - [ ] (AGENT) **Wire** `buildGa4Item()` and `trackMeta()` helpers in main.js
  - [ ] (AGENT) **Wire** CTA 1 (product interest): POST to subscribe + insert product_interests
  - [ ] (AGENT) **Wire** CTA 2 (exit intent): mouse-leave / visibilitychange detection on all product pages
  - [ ] (AGENT) **Wire** CTA 3 (contemplation): 3-min timer + promo code generation via api/subscribe
  - [ ] (AGENT) **Wire** GA4 + Meta Pixel events per the event table in IMPL_GUIDE > Enhanced E-commerce GA4 Event Definitions

### C2: Checkout Flow E2E

  - [ ] (AGENT) **Create** `assets/js/checkout.js` — two-stage progressive disclosure (Stage A info, Stage B payment). Never triggers 409 recovery (that's /cart.html's job)
  - [ ] (AGENT) **Wire** checkout.html to pull Stripe key from `/api/config` (no hardcoded key)
  - [ ] (AGENT) **Wire** complete.html (session status check, cart clear, session_id localStorage clear)
  - [ ] (AGENT) **Wire** Add to Cart + Buy Now buttons on product page (both navigate to /cart.html on click)
  - [ ] (AGENT) **Start** Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook`
  - [ ] (AGENT) **Test** full flow: product → add to cart → /cart.html → `CHECKOUT` → /checkout.html Stage A → Stage B → pay `4242...` → /complete.html
  - [ ] (AGENT) **Test** multi-item cart
  - [ ] (AGENT) **Test** 409 on /cart.html: force unavailable → recovery overlay shown BEFORE any PII entered
  - [ ] (AGENT) **Test** related products in recovery overlay render
  - [ ] (AGENT) **Test** 410 on /checkout.html: expire hold manually → user sees "reservation timed out" + redirect to /cart.html

### C3: SEO Finalization

  - [ ] (AGENT) **Add** dynamic meta titles + descriptions
  - [ ] (AGENT) **Add** Open Graph + Twitter Card tags
  - [ ] (AGENT) **Add** Product schema.org structured data (JSON-LD)
  - [ ] (AGENT) **Create** `sitemap.xml` + `robots.txt`
  - [ ] (SEAN) **Submit** sitemap to Google Search Console

### C4: Testing + Launch

**Placeholder Audit**

  - [ ] (AGENT) **Run** `grep -rn "PLACEHOLDER" .` — MUST return zero matches before launch
  - [ ] (AGENT) **Run** `grep -rn "https://everlastingsbyemaline.com/api" assets/js/` — MUST return zero matches (every frontend fetch must be relative; absolute URLs break preview deployments)

**Test Data Audit (optional but recommended)**

  - [ ] (AGENT) **Run** `SELECT count(*) FROM products WHERE is_test = true;` — note the count. Same for `customers`, `orders`, `subscribers`, `cart_holds`, `product_interests`. Test rows are filtered out of production reads, but Sean may want to purge them: `DELETE FROM products WHERE is_test = true;` (and same per table)
  - [ ] (AGENT) **Optionally clean R2 test namespace**: `aws s3 rm s3://everlastings/test --recursive` (only if test images aren't referenced by surviving test rows)

**Stripe Live Mode**

  - [ ] (AGENT) **Set** live keys for Production scope in Vercel Dashboard
  - [ ] (SEAN) **Create** live webhook endpoint in Stripe Dashboard → production URL
  - [ ] (AGENT) **Set** live `STRIPE_WEBHOOK_SECRET` for Production scope
  - [ ] (AGENT) **Run** `STRIPE_SECRET_KEY=sk_live_... npx tsx api/_bootstrap/coupons.ts` to populate coupons in live mode
  - [ ] (AGENT) **Merge** `dev` → `main`
  - [ ] (SEAN+AGENT) **Test** one real transaction (refund after)

**Cross-Browser Testing**

  - [ ] (SEAN) Chrome, Safari, Firefox, Edge
  - [ ] (SEAN) iPhone, iPad, Android
  - [ ] (SEAN) Full checkout flow on production
  - [ ] (SEAN) Admin flow: login → add product + mark shipped → verify emails
  - [ ] (SEAN) Newsletter + contact form
  - [ ] (SEAN) All internal links

**Performance**

  - [ ] (AGENT) Lighthouse 90+ all categories
  - [ ] (AGENT) WCAG AA accessibility
  - [ ] (AGENT) Keyboard navigation (including lightbox)
  - [ ] (AGENT) All images WebP, lazy loaded, alt text

**Launch**

  - [ ] (SEAN) DNS → Vercel, SSL active
  - [ ] (SEAN+AGENT) 5-10 real products loaded (via admin UI or AI protocol)
  - [ ] (SEAN) Final review with Emy
  - [ ] (SEAN) Launch

**Post-Session Consistency Sweep**

  - [ ] (AGENT) Spawn fresh-context Explore subagent to audit all `.md` files for stale references. Report only — Sean drives fixes

---

## Dependencies

  ```
  Phase 0 (SEAN+AGENT setup) ──→ TRACK A (A1 → A2 → A3 → A4)
                              ├──→ TRACK B (B1 → B2 → B3 → B4 → B5 → B6)  (parallel with A)
                              └──→ TRACK C (C1 → C2 → C3 → C4)  (requires A2 + B-complete)
  ```

Phase 0 merges the former Phase 0 (Sean dashboard work) and Phase 1 (agent bootstrap) into one interleaved block — each secret is handled once. Tracks A and B proceed in parallel once Phase 0 is done. Track C integrates them.

---
*One checkbox = one action. Every action tagged (SEAN), (AGENT), or (SEAN+AGENT). Reference material lives in the IMPL_GUIDE; this doc is pure action.*