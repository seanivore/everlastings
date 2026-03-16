# Everlastings — Implementation Guide

**Version**: v1.1
**Updated**: 2026-03-16
**Architecture**: Vercel + Supabase + Cloudflare R2 + Stripe
**Total**: ~33 hours across 10 sessions
**Reference**: `EVERLASTINGS_STORE.md` for architecture, `v1_1_BRAND.md` for design

---

## System Map

```
                    BROWSER
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     index.html   shop.html   product.html   /admin
          │            │            │            │
          └────────────┼────────────┘            │
                       ▼                         ▼
              Supabase (data)           Supabase Auth
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    /api/checkout  /api/webhook  /api/stripe-sync
          │            │            │
          └────────────┼────────────┘
                       ▼
                    Stripe
```

---

## SESSION 1: Foundation .......................... [~3 hrs]

**YOU WILL HAVE**: Vercel project live, Supabase + R2 configured, all services connected

### Vercel

- [ ] Create Vercel project from this repo (connect GitHub, auto-deploy on push)
- [ ] Add custom domain `everlastingsbyemaline.com` in Vercel dashboard
- [ ] Create `vercel.json` with rewrites for clean product URLs:
  ```json
  {
    "rewrites": [
      { "source": "/product/:slug", "destination": "/product.html" },
      { "source": "/admin/:path*", "destination": "/admin/index.html" }
    ]
  }
  ```
- [ ] Verify deploy works: push → site loads

### Supabase

- [ ] Create Supabase project (free tier, region: us-east-1)
- [ ] Create `products` table (schema in EVERLASTINGS_STORE.md → Supabase Schema)
- [ ] Create `orders` table
- [ ] Create `subscribers` table
- [ ] Create `site_config` table
- [ ] Enable Row Level Security on all tables:
  - `products`: public SELECT, authenticated INSERT/UPDATE/DELETE
  - `orders`: authenticated only
  - `subscribers`: public INSERT, authenticated SELECT
  - `site_config`: public SELECT, authenticated UPDATE
- [ ] Create admin user in Supabase Auth (Emy's email)
- [ ] Set up Database Webhook: on `products` INSERT → POST to `{VERCEL_URL}/api/stripe-sync`

### Cloudflare R2

- [ ] Create R2 bucket `everlastings`
- [ ] Enable public access (or create public access rule)
- [ ] Note the public URL pattern for `.env`

### Stripe

- [ ] Confirm Stripe account active (Emy's account, Sean as admin)
- [ ] Get test API keys (publishable + secret)
- [ ] Set up webhook endpoint in Stripe dashboard → `{VERCEL_URL}/api/webhook`
- [ ] Subscribe to events: `checkout.session.completed`, `payment_intent.succeeded`

### Environment

- [ ] Create `.env.example` documenting all required variables
- [ ] Add all env vars to Vercel dashboard (Settings → Environment Variables)
- [ ] Add env vars to `.env.local` for local dev
- [ ] Install dependencies: `npm init -y && npm install stripe @supabase/supabase-js`
- [ ] Create `tsconfig.json` for API functions
- [ ] Verify `vercel dev` runs locally

---

## SESSION 2: Design System ....................... [~3 hrs]

**YOU WILL HAVE**: CSS variables, typography loaded, base components styled, responsive scaffolding

### CSS Custom Properties

- [ ] Create `assets/css/styles.css`
- [ ] Define color variables from `v1_1_BRAND.md` → Color Palette section
- [ ] Define typography variables (font-display, font-body, size scale)
- [ ] Define spacing scale (xs through 3xl)
- [ ] Define shadow, radius, transition, z-index tokens
- [ ] Reference: `v1_1_BRAND.md` → CSS Custom Properties section

### Typography

- [ ] Add Cormorant Garamond via Google Fonts `<link>` (400, 400i, 700)
- [ ] Set `font-display: swap` for performance
- [ ] Style heading hierarchy (h1-h6 using --font-display)
- [ ] Style body text (--font-body, line-height 1.6)
- [ ] Style captions, labels, buttons

### Base Components

- [ ] Button styles: primary (plum bg), secondary (outline), ghost
- [ ] Card styles (product tiles): border, shadow on hover, padding, radius
- [ ] Form input styles: border, focus state (plum glow), padding, radius
- [ ] Image styles: object-fit, lazy loading attribute
- [ ] Badge styles: "Sold" badge, "Featured" badge

### Responsive Foundation

- [ ] Set base styles for mobile (393px)
- [ ] Add tablet breakpoint (768px)
- [ ] Add desktop breakpoint (1024px)
- [ ] Add large desktop breakpoint (1440px)
- [ ] Test: resize browser through all breakpoints, verify nothing breaks

---

## SESSION 3: Product Page ........................ [~4 hrs]

**YOU WILL HAVE**: One product renders from Supabase with full layout

### Supabase Client

- [ ] Create `assets/js/main.js` — initialize Supabase client with anon key
- [ ] Add shared utilities: `formatPrice(cents)`, `slugify(title)`, `getProductBySlug(slug)`
- [ ] Seed one test product in Supabase (use Sunkeeper example from PRODUCT_GUIDE.md)
- [ ] Upload test images to R2 under `/products/the-sunkeeper/`

### Product Page HTML

- [ ] Create `product.html` — semantic HTML structure
- [ ] Two-column layout: `.product-story` (left), `.product-details` (right)
- [ ] Image gallery container (handles 7-15 photos)
- [ ] Story card section (renders markdown-like paragraphs)
- [ ] Features list, dimensions, materials, power supply
- [ ] Price display + "Add to Cart" + "Buy Now" buttons
- [ ] Care instructions section
- [ ] Shipping details section
- [ ] Artist note section (conditional)
- [ ] Breadcrumb: Home > Shop > Product Title

### Product Page JS

- [ ] Create `assets/js/product.js`
- [ ] Extract slug from URL path (`/product/the-sunkeeper` → `the-sunkeeper`)
- [ ] Fetch product from Supabase by slug
- [ ] Populate all HTML sections from data
- [ ] Image gallery: click thumbnails to change main image
- [ ] Lightbox: click main image for full-screen view
- [ ] "Sold" state: disable buttons, show badge if `available === false`

### Responsive

- [ ] Mobile: single column, story above details
- [ ] Tablet: two columns start
- [ ] Desktop: full two-column with generous whitespace
- [ ] Gallery: horizontal scroll on mobile, grid on desktop

---

## SESSION 4: Stripe Integration .................. [~4 hrs]

**YOU WILL HAVE**: Products purchasable, inventory auto-updates on sale

### Stripe Sync (Database Webhook)

- [ ] Create `api/stripe-sync.ts`:
  - Receive POST from Supabase DB webhook (product INSERT payload)
  - Create Stripe Product: `stripe.products.create({name, description, images})`
  - Create Stripe Price: `stripe.prices.create({product, unit_amount, currency: 'usd'})`
  - Write `stripe_product_id` + `stripe_price_id` back to Supabase row
  - Error handling: log failures, don't crash
- [ ] Test: insert product in Supabase Studio → verify Stripe product appears in dashboard

### Checkout

- [ ] Create `api/checkout.ts`:
  - Receive POST with `{price_id, product_slug, return_url}`
  - Create Checkout Session: `ui_mode: 'embedded'`, NO customer, shipping collection enabled
  - Return `{clientSecret: session.client_secret}`
- [ ] Create `checkout.html` with Stripe.js mount point
- [ ] Create `assets/js/checkout.js`:
  - Call `/api/checkout` with price_id
  - `stripe.initEmbeddedCheckout({clientSecret})`
  - Mount to `#checkout` container
- [ ] Wire "Buy Now" button on product page → checkout page
- [ ] Return URL handling: show success message after payment

### Webhook

- [ ] Create `api/webhook.ts`:
  - Verify Stripe signature (`stripe.webhooks.constructEvent`)
  - On `checkout.session.completed`:
    - Extract product info from session metadata
    - Update Supabase: `available = false`, `quantity = quantity - 1`
    - Create order record in `orders` table
  - Return 200
- [ ] Test: complete test purchase → verify product shows "Sold" in Supabase

### Cart (localStorage)

- [ ] Add to cart function: store `{product_id, slug, title, price, quantity}` in localStorage
- [ ] Cart icon with count badge (header)
- [ ] View cart dropdown/page
- [ ] Remove from cart
- [ ] Checkout with multiple items: create session with line_items array

---

## SESSION 5: Shop Grid + Filters ................. [~3 hrs]

**YOU WILL HAVE**: All products in filterable, sortable grid

### Shop Page HTML

- [ ] Create `shop.html` with filter sidebar + product grid
- [ ] Filter controls: series dropdown, product_type dropdown, availability toggle
- [ ] Sort control: price (low/high), newest, name (A-Z)
- [ ] Product tile template: image, title, price, "Sold" badge

### Shop Page JS

- [ ] Create `assets/js/shop.js`
- [ ] Fetch all products from Supabase (with pagination if >50)
- [ ] Render product tiles in grid
- [ ] Filter logic: multi-select, AND within group
- [ ] Smart filter: if a filter group has only 1 option, hide that dropdown
- [ ] Live filter counts: show number of products per filter option
- [ ] Sort logic: reorder tiles without re-fetching
- [ ] URL state: `?series=portals-to-peace&sort=price-asc` (bookmarkable filters)
- [ ] "No results" state when filters return empty

### Product Tiles

- [ ] Hover effect: image zoom (scale 1.05), shadow lift
- [ ] "Sold" badge overlay when `available === false`
- [ ] Click anywhere on tile → navigate to product page
- [ ] Lazy load images with `loading="lazy"`

---

## SESSION 6: Homepage ............................ [~5 hrs]

**YOU WILL HAVE**: Full landing page with all content sections

### Sections

- [ ] **Hero**: Full-viewport image + overlay text + CTA button "Enter Elsewhere"
  - Background: featured product image or brand hero
  - Text: "EVERLASTINGS BY EMALINE" + tagline + CTA
- [ ] **Intro block**: Poetic summary ("When the world cracked open...")
- [ ] **Featured carousel**: Fetch `featured=true` products, render scrollable row
  - 4-6 products, auto-scroll optional
  - Click through to product page
- [ ] **Brand pillars**: Icon grid — Story, Craftsmanship, Sanctuary
- [ ] **Testimonial strip**: Placeholder section (empty until customer reviews)

### Dynamic Theme

- [ ] Create `assets/js/homepage.js`
- [ ] Fetch theme config from `site_config` table
- [ ] Apply CSS variables for theme colors dynamically
- [ ] Rotate theme on return visits (store last-seen in localStorage)

### Theatrical Lighting Effect

- [ ] CSS mask/spotlight: radial gradient that shifts on scroll
- [ ] `transform: translateY()` on background layers opposite to scroll direction
- [ ] Creates "spotlight sweeping across stage" effect
- [ ] Performance: use `will-change: transform`, GPU-accelerated properties only

### Responsive

- [ ] Mobile: stacked sections, full-width hero, horizontal scroll carousel
- [ ] Desktop: multi-column where appropriate
- [ ] Hero image: `object-fit: cover` with responsive aspect ratio

---

## SESSION 7: Header, Footer, Nav ................. [~2 hrs]

**YOU WILL HAVE**: Consistent navigation across all pages

### Header

- [ ] Logo (left, links to homepage)
- [ ] Nav links: Home, Shop (dropdown), About, Commissions, Contact
- [ ] Shop dropdown: All, Portals to Peace, Book Nooks & Story Lofts, Seasonal & Limited, Sold Archive
- [ ] Cart icon with badge (right)
- [ ] Mobile: hamburger menu (left), logo (center), cart (right)
- [ ] Sticky on scroll, slight collapse
- [ ] Background: fog gray with transparency

### Footer

- [ ] Four columns: About, Shop, Support, Connect
- [ ] Newsletter signup form (inline email input + submit)
  - POST to `/api/subscribe` → insert into `subscribers` table
- [ ] Social links: Instagram, Facebook, Pinterest, TikTok
- [ ] Bottom bar: copyright, "Site by Sean August Horvath", Terms | Privacy
- [ ] CTA: "Step Into Elsewhere"

### Newsletter

- [ ] Create `assets/js/newsletter.js`
- [ ] Create `api/subscribe.ts`: validate email, insert into `subscribers` table, return success
- [ ] Success state: "Welcome to the Firelight Council"
- [ ] Duplicate handling: unique constraint on email, friendly error

---

## SESSION 8: Remaining Pages ..................... [~3 hrs]

**YOU WILL HAVE**: All content pages live

### About Emaline (`about.html`)

- [ ] Photo of Emy + logo
- [ ] Intro: "Emy Hoff — Architect of Elsewhere, Crafter of Moments"
- [ ] Origin story sections (copy from brand guide)
- [ ] The Philosophy of Elsewhere
- [ ] Mission statement

### Story & Philosophy

- [ ] Can be a section within about.html or separate page
- [ ] What "Elsewhere" means, what "Everlasting" means
- [ ] Commitment to craft, approach to storytelling

### Commissions (`contact.html` with commissions section)

- [ ] What's offered: custom nooks, memory pieces, seasonal, sacred, milestone
- [ ] Intake form: name, email, inspiration, colors, photo upload, timeline, budget
- [ ] Create `api/contact.ts`: receive form data, send notification email (or store in Supabase)
- [ ] Starting at $200+

### Contact

- [ ] Simple form: name, email, subject, message
- [ ] Option to select "Commission Inquiry" as subject
- [ ] Uses same `api/contact.ts`

### FAQ, Shipping & Returns, Policies

- [ ] Static content pages (HTML only, no JS needed)
- [ ] Shipping: US-only initially, careful packaging, timeframes
- [ ] Returns: policy for handmade goods
- [ ] Include in footer navigation

---

## SESSION 9: Admin UI ............................ [~3 hrs]

**YOU WILL HAVE**: Emy can add/edit products from her browser

### Auth

- [ ] `/admin/index.html` — login screen
- [ ] Supabase Auth: email/password login
- [ ] Redirect to login if not authenticated
- [ ] Logout button

### Product Management

- [ ] Create `assets/js/admin.js`
- [ ] **Product list**: table/grid of all products with edit/delete buttons
- [ ] **New product form**: all fields from schema
  - Text inputs: title, headline, description, artist_note
  - Textarea: story_card
  - Number: price (in dollars, convert to cents on save)
  - Dropdowns: product_type, series
  - Toggles: available, featured
  - Dynamic list: features, materials, care_instructions, shipping_details
- [ ] **Image upload**: drag-and-drop or file picker
  - Upload to R2 via `api/upload.ts`
  - Create `api/upload.ts`: receive file, upload to R2, return CDN URL
  - Thumbnail selection from uploaded images
- [ ] **Save**: INSERT or UPDATE to Supabase products table
- [ ] **Delete**: with confirmation modal
- [ ] **Preview link**: open product page in new tab before publishing

### UI Design

- [ ] Simple, clean — Emy fills form, clicks save, product is live
- [ ] Validation: required fields highlighted, price format check
- [ ] Success/error feedback messages
- [ ] Mobile-friendly (Emy may use iPad)

---

## SESSION 10: SEO, Testing, Launch ............... [~3 hrs]

**YOU WILL HAVE**: Production-ready site, Lighthouse 90+

### SEO

- [ ] Meta titles + descriptions on all pages (dynamic for products)
- [ ] Open Graph tags for social sharing
- [ ] Twitter Card tags
- [ ] Structured data (Product schema.org markup on product pages)
- [ ] Canonical URLs
- [ ] Sitemap.xml (static or generated)
- [ ] robots.txt

### Analytics

- [ ] Google Analytics 4 setup with `gtag.js`
- [ ] Custom events: product_view, add_to_cart, begin_checkout, purchase
- [ ] Google Search Console verification

### Stripe Live Mode

- [ ] Switch from test keys to live keys in Vercel env vars
- [ ] Update webhook endpoint to use live webhook secret
- [ ] Test one real transaction (small amount, refund after)

### Testing

- [ ] Cross-browser: Chrome, Safari, Firefox, Edge
- [ ] Mobile: iPhone, iPad, Android (real devices or BrowserStack)
- [ ] Checkout flow: add to cart → checkout → payment → sold status
- [ ] Admin flow: login → add product → verify on shop page
- [ ] Newsletter signup from homepage and footer
- [ ] Contact form submission
- [ ] All internal links working

### Performance

- [ ] Lighthouse audit: target 90+ all categories
- [ ] First Contentful Paint: < 1.5s
- [ ] Total page load: < 3s
- [ ] Image optimization: all WebP, lazy loaded
- [ ] WCAG AA accessibility check
- [ ] Keyboard navigation functional
- [ ] Screen reader compatible
- [ ] Alt text on every image

### Launch

- [ ] DNS pointed to Vercel
- [ ] SSL certificate active
- [ ] All test data replaced with real products (5-10 minimum)
- [ ] Final review with Sean + Emy
- [ ] Go live

---

## Post-Launch (30 days included)

- Bug fixes and technical support
- Performance optimization
- Content update assistance
- Quick questions and guidance

---

## Reference Documents

| Document        | Location                                                           | Use                                |
| --------------- | ------------------------------------------------------------------ | ---------------------------------- |
| Architecture    | `assets/docs/EVERLASTINGS_STORE.md`                                | Full technical reference           |
| Brand Guide     | `assets/docs/archive/v1/v1_1_BRAND.md`                             | Colors, fonts, voice, copy         |
| Product Guide   | `assets/docs/PRODUCT_GUIDE.md`                                     | Client-facing, how to add products |
| Mobile Specs    | `.agent/2026_MOBILE_DESIGN_SPECS.md`                               | iOS/iPadOS viewport measurements   |
| Dev Rules       | `.agent/DEV_RULES.md`                                              | Git branching, dev protocols       |
| Stripe Shipping | `assets/docs/archive/v0/processed/IMPL_STRIPE_DYNAMIC_SHIPPING.md` | Embedded checkout shipping API     |

---

*Every checkbox is an action. Every session starts with what you'll have when done. Reference the docs above — don't re-read v0.*
