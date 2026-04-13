# Everlastings v1.3.1 Implementation Guide

**Version**: v1.3.1
**Created**: 2026-04-12 14:52 | 16:16
**Previous**: v1.2.1 (2026-04-09)
**Architecture**: Vercel + Supabase + Cloudflare R2 + Stripe + Cloudinary
**Structure**: 3 parallel tracks (A: Backend, B: Frontend Design, C: Integration)
**Architecture**: `assets/docs/EVERLASTINGS_STORE.md`
**Design**: `assets/docs/BRAND.md`

---

- [Everlastings v1.3.1 Implementation Guide](#everlastings-v131-implementation-guide)
  - [Architecture Reference](#architecture-reference)
  - [Dependencies](#dependencies)
  - [TRACK A: Foundation + Backend](#track-a-foundation--backend)
    - [A1: Services Setup](#a1-services-setup)
      - [Vercel](#vercel)
      - [Git + Environment](#git--environment)
      - [Supabase](#supabase)
      - [Cloudflare R2](#cloudflare-r2)
      - [Cloudinary](#cloudinary)
      - [Stripe](#stripe)
      - [Meta Pixel + Instagram Shopping](#meta-pixel--instagram-shopping)
      - [Analytics](#analytics)
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
      - [Stripe Live Mode](#stripe-live-mode)
      - [Cross-Browser Testing](#cross-browser-testing)
      - [Performance](#performance)
      - [Launch](#launch)

---

## Architecture Reference

Every architectural question answered. No mid-session research. Referenced as "AR #N" throughout this document.

  1. **`ui_mode: 'custom'`** for Stripe Checkout
     - Proven in freelance-payments. Full UI control.
     - On-site checkout per client contract. Follows Stripe quickstart guide
  2. **Standard cart flow**
     - Add to Cart → keep shopping → view cart → checkout.
     - Normal e-commerce UX. Cart stored in localStorage
  3. **Availability check at checkout for all cart items**
     - Query `available === true` for every item before creating Stripe session
     - If any sold, 409 + recovery flow
  4. **Stripe products are write-once**
     - Never UPDATE Stripe products/prices. Price change = archive old price, create new.
     - "Stripe is a payment mirror, not source of truth"
  5. **R2 path**: `/products/{slug}/{role}-{slug}.webp`
     - SEO-friendly, predictable, collision-free.
     - Example: `/products/the-sunkeeper/hero-the-sunkeeper.webp`
  6. **Image aspect ratio**: 4:5
     - Prevents messy grids.
     - Enforced via Cloudinary transform on upload
  7. **Slug rules**: immutable after creation
     - `title.toLowerCase().replaceAll(' ', '-')`
     - URL stability, SEO preservation
  8. **Stripe metadata**: `items` field
     - JSON array of `{ id, slug }`
     - Parsed with `JSON.parse(metadata.items)`
  9. **Error states**: fallback message + disabled buttons + console.log
     - Every page has a failure mode documented.
     - See Error States Reference
  10. **Supabase anon key hardcoded** in `main.js`
      - Public by design, RLS-protected.
      - No build step = no env var injection for frontend
  11. **CDN loading** for frontend libs
      - Stripe.js via `js.stripe.com`, Supabase.js via jsDelivr.
      - No npm/build step for frontend
  12. **Vercel Web API pattern** for serverless functions
      - `export async function POST(request: Request)`
      - Modern pattern, not legacy `(req, res)`
  13. **R2 custom domain**: `cdn.everlastingsbyemaline.com`
      - Cloudflare DNS CNAME → R2 bucket
      - Branded CDN URL for all product assets
  14. **Customers table with upsert-on-checkout**
      - Email as unique key. No pre-checkout accounts.
      - Newsletter subscribers linked on purchase
  15. **Frontend Stripe key via `api/config.ts`**
      - Enables automatic test/live switching per Vercel environment
      - Nothing hardcoded
  16. **GA4 via `gtag.js` CDN, no GTM**
      - Simple, no-build-step analytics
      - Custom events via `gtag('event', ...)`
  17. **Cloudinary as stateless transform layer**
      - Proven in 360-design. Upload → transform → download → R2 → delete from Cloudinary.
      - Stay on free tier
  18. **AI product creation via API endpoints**
      - `POST /api/products` + `POST /api/upload`
      - Enable any AI assistant to create products programmatically
  19. **Order confirmation via Stripe Dashboard emails**
      - No custom email system for v1.
      - Stripe sends receipts natively (enable in Dashboard → Settings → Emails)
  20. **Custom `PRODUCT_API_KEY` for external API auth**
      - Random 64-char string, stored as env var
      - API endpoints validate this key, then use `SUPABASE_SERVICE_KEY` internally
      - If `PRODUCT_API_KEY` leaks, rotate just that key without affecting Supabase
      - `SUPABASE_SERVICE_KEY` is NEVER exposed in client, agent, or cURL usage
  21. **Webhook idempotency via `webhook_events` table**
      - Store `event.id` on successful processing
      - Skip already-processed events (Stripe retries)
  22. **Source of truth hierarchy**: Supabase > Stripe > R2 > Frontend
      - Supabase = authoritative data
      - Stripe = payment mirror only
      - R2 = asset storage only
      - Frontend = read-only consumer
  23. **Slug generated API-side before image upload**
      - Compute `title.toLowerCase().replaceAll(' ', '-')` BEFORE uploading images
      - DB trigger is fallback only (for manual Supabase Studio inserts)
      - Order: generate slug → upload images → create product record
  24. **Image role enforcement**
      - Exactly 1 hero image required
      - Exactly 1 thumbnail required
      - Minimum 5 gallery images required
      - Validated by `api/products.ts` before INSERT
  25. **Meta Pixel for retargeting + Instagram Shopping attribution**
      - Base pixel code in `<head>` alongside GA4. Events fire in parallel
      - Server-side CAPI for Purchase deduplication via webhook
      - Meta Pixel ID served via `api/config.ts` (public, like GA4 measurement ID)
  26. **Email capture CTAs for conversion optimization**
      - Product page interest CTA (sticky card), cart exit intent modal, 3-minute contemplation popup
      - All feed into `subscribers` table with distinct `source` values
      - Product interest tracked in `product_interests` table for real notification capability
  27. **Meta Commerce Catalog via data feed**
      - `api/product-feed.ts` serves CSV of all products
      - Meta Commerce Manager polls daily — products auto-sync to Instagram Shopping
      - Same pattern extends to Pinterest Shopping (post-launch)

---

## Git Branching Strategy

  ```
  main (production — live Stripe keys)
    ↑ merge via PR only
  dev (integration — test Stripe keys)
    ↑ merge feature branches
  feat/product-page
  feat/checkout-flow
  fix/webhook-signature
  ```

| Branch   | Vercel Environment | Stripe Keys            | URL                       |
| -------- | ------------------ | ---------------------- | ------------------------- |
| `main`   | Production         | `sk_live_`, `pk_live_` | everlastingsbyemaline.com |
| `dev`    | Preview            | `sk_test_`, `pk_test_` | *.vercel.app preview URL  |
| `feat/*` | Preview            | `sk_test_`, `pk_test_` | *.vercel.app preview URL  |

**Rules**:
  1. Never push directly to `main` — always merge from `dev` via PR
  2. `dev` is the integration branch — all feature branches merge here first
  3. Test full purchase flow on `dev` preview URL before merging to `main`
  4. Both test and live webhook endpoints configured in Stripe Dashboard simultaneously
  5. Stripe test webhook → `dev` preview URL. Stripe live webhook → production URL.

**Development workflow**:
  1. Create `feat/my-change` from `dev`
  2. Push → Vercel creates preview deployment with test Stripe keys
  3. Test on preview URL
  4. Merge to `dev` → verify on dev preview
  5. Merge `dev` → `main` → production with live keys

### Setup Commands

  ```bash
  # Initial branch setup (run once)
  git checkout main
  git checkout -b dev
  git push -u origin dev

  # Feature work
  git checkout dev
  git checkout -b feat/product-page
  # ... work ...
  git push -u origin feat/product-page
  # Create PR: feat/product-page → dev (via GitHub)
  # After merge: delete feat branch

  # Production release
  # Create PR: dev → main (via GitHub)
  # Merge → Vercel auto-deploys to production

  # Local environment setup (after branches exist)
  cp .env.example .env.local
  # Fill in real values from Supabase/Stripe/R2/Cloudinary dashboards
  npm install
  vercel dev
  ```

---

## Environment Strategy

### Where Secrets Live

Three distinct locations, each with a specific purpose:

**1. Vercel Dashboard** (all production secrets)
  - Settings → Environment Variables
  - Each var scoped by environment: Production, Preview, Development
  - This is where ALL real secrets live
  - Production scope = live keys, Preview+Development scope = test keys

**2. `.env.local`** (local development)
  - Copy of `.env.example` with real TEST values filled in
  - Created manually by developer: `cp .env.example .env.local`
  - Gitignored — never committed
  - Used by `vercel dev` for local server

**3. `.env.example`** (template in git)
  - Placeholder values only (e.g., `sk_test_...`)
  - No real keys ever
  - Committed to git
  - Documents which env vars are required

### Environment Variable Table

Vercel Dashboard → Settings → Environment Variables. Each var scoped by environment.

| Variable                 | Production            | Preview + Development   |
| ------------------------ | --------------------- | ----------------------- |
| `STRIPE_SECRET_KEY`      | `sk_live_...`         | `sk_test_...`           |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...`         | `pk_test_...`           |
| `STRIPE_WEBHOOK_SECRET`  | live signing secret   | test signing secret     |
| `SUPABASE_URL`           | same                  | same                    |
| `SUPABASE_ANON_KEY`      | same                  | same                    |
| `SUPABASE_SERVICE_KEY`   | same                  | same                    |
| `PRODUCT_API_KEY`        | random 64-char string | different random string |
| `R2_ACCOUNT_ID`          | same                  | same                    |
| `R2_ACCESS_KEY_ID`       | same                  | same                    |
| `R2_SECRET_ACCESS_KEY`   | same                  | same                    |
| `R2_BUCKET_NAME`         | same                  | same                    |
| `R2_PUBLIC_URL`          | same                  | same                    |
| `CLOUDINARY_URL`         | same                  | same                    |
| `META_PIXEL_ID`          | same                  | same                    |
| `META_ACCESS_TOKEN`      | same                  | same                    |

**Frontend Stripe key**: NOT hardcoded. Served via `api/config.ts` — returns correct key per environment.

### Switchover Process (Live Launch)

  1. All development on `dev` with test keys (auto-configured)
  2. Test full purchase flow on preview URL with card `4242 4242 4242 4242`
  3. Set live keys for Production scope in Vercel Dashboard
  4. Create live webhook endpoint in Stripe Dashboard → production URL
  5. Set live `STRIPE_WEBHOOK_SECRET` for Production scope
  6. Enable receipt emails: Stripe Dashboard → Settings → Emails → Successful payments
  7. Merge `dev` → `main` → production deploys with live keys
  8. Test one real transaction (refund after)

---

## Source of Truth Hierarchy

  1. **Supabase** — authoritative product data, customer records, orders, site config
  2. **Stripe** — payment mirror only. Created from Supabase data via webhook, never manually edited
  3. **Cloudflare R2** — asset storage only. URLs referenced from Supabase product records
  4. **Frontend** — read-only consumer. Fetches from Supabase, never writes directly

When in doubt about product data, trust Supabase. Stripe reflects Supabase, not the other way around.

---

## Stripe Sync Rules

  - On product **INSERT** → create Stripe Product + Price (via `api/stripe-sync.ts`)
  - On **price change** → archive old Stripe Price (`active: false`), create new Price, update `stripe_price_id` in Supabase
  - On **title/image/description change** → DO NOTHING in Stripe (Stripe is a payment mirror, not source of truth)
  - Never UPDATE a Stripe Price (they are immutable). Always archive + create new
  - Never manually create Stripe Products/Prices in Dashboard. The database webhook handles all creation

---

## Product Schema — Hard Reference

### TypeScript Interface (for API functions)

  ```typescript
  interface Product {
    id: string;                    // uuid, auto-generated
    sku: string;                   // unique, auto-generated
    slug: string;                  // unique, IMMUTABLE — generated API-side or by DB trigger
    title: string;                 // NOT NULL
    headline: string;              // 5-7 word tagline
    story_card: string;            // 2-8 paragraphs, poetic
    description: string;           // short summary
    features: string[];            // jsonb array of feature strings
    price: number;                 // integer, in cents ($245 = 24500)
    dimensions: string;            // e.g. '8" W x 6" D x 10" H'
    weight: string;                // e.g. '2.5 lbs'
    materials: string[];           // text array
    power_supply: string | null;   // nullable
    care_instructions: string[];   // text array
    shipping_details: string[];    // text array
    product_type: string;          // 'miniature' | 'printable' | 'storybook'
    series: string | null;         // nullable — 'Portals to Peace', etc.
    available: boolean;            // default true
    quantity: number;              // default 1
    featured: boolean;             // default false
    images: { url: string; alt: string }[]; // jsonb array
    thumbnail: string;             // CDN URL
    thumbnail_alt: string;
    media: { type: 'video' | 'gif' | 'youtube'; url: string; caption?: string }[] | null;
    seo_title: string;
    seo_description: string;
    artist_note: string | null;    // nullable
    stripe_product_id: string | null; // auto-populated by stripe-sync
    stripe_price_id: string | null;   // auto-populated by stripe-sync
    homepage_theme: { colors: string[]; mood: string } | null; // nullable
    created_at: string;            // timestamptz, auto
    updated_at: string;            // timestamptz, auto
  }
  ```

### Supabase SQL — CREATE TABLE (7 tables)

  ```sql
  CREATE TABLE products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sku text UNIQUE NOT NULL DEFAULT ('EVE-' || substr(gen_random_uuid()::text, 1, 8)),
    slug text UNIQUE NOT NULL,
    title text NOT NULL,
    headline text,
    story_card text,
    description text,
    features jsonb DEFAULT '[]'::jsonb,
    price integer NOT NULL,
    dimensions text,
    weight text,
    materials text[] DEFAULT '{}',
    power_supply text,
    care_instructions text[] DEFAULT '{}',
    shipping_details text[] DEFAULT '{}',
    product_type text NOT NULL DEFAULT 'miniature',
    series text,
    available boolean DEFAULT true,
    quantity integer DEFAULT 1,
    featured boolean DEFAULT false,
    images jsonb DEFAULT '[]'::jsonb,
    thumbnail text,
    thumbnail_alt text,
    media jsonb DEFAULT '[]'::jsonb,
    seo_title text,
    seo_description text,
    artist_note text,
    stripe_product_id text,
    stripe_price_id text,
    homepage_theme jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

  -- Slug generation: FALLBACK ONLY for manual Supabase Studio inserts.
  -- Normal flow: slug is generated API-side BEFORE image upload and passed in the INSERT.
  -- This trigger only fires if slug is NULL or empty (manual insert without slug).
  CREATE OR REPLACE FUNCTION generate_slug()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := lower(replace(NEW.title, ' ', '-'));
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER set_slug
    BEFORE INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION generate_slug();

  -- Auto-update updated_at
  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
  ```

  ```sql
  CREATE TABLE customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    name text,
    phone text,
    shipping_address jsonb,
    stripe_customer_id text,
    source text DEFAULT 'checkout',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

  CREATE TRIGGER set_updated_at_customers
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
  ```

  ```sql
  CREATE TABLE orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_session_id text NOT NULL,
    stripe_payment_intent text,
    product_id uuid REFERENCES products(id),
    customer_id uuid REFERENCES customers(id),
    customer_email text,
    amount integer,
    status text DEFAULT 'completed',
    shipping_address jsonb,
    created_at timestamptz DEFAULT now()
  );
  ```

  ```sql
  CREATE TABLE subscribers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    source text DEFAULT 'footer',
    created_at timestamptz DEFAULT now()
  );
  ```

  ```sql
  CREATE TABLE site_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
  );
  ```

  ```sql
  -- Webhook idempotency: prevents duplicate processing when Stripe retries (AR #21)
  CREATE TABLE webhook_events (
    event_id text PRIMARY KEY,
    processed_at timestamptz DEFAULT now()
  );
  ```

  ```sql
  -- Product interest tracking: email capture + cart activity notifications (AR #26)
  CREATE TABLE product_interests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    product_slug text NOT NULL,
    notified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(email, product_slug)
  );
  ```

---

## Configuration Files

> These files must be created as actual files in the repository root. Copy the contents below into each file. See Action Steps Pre-Flight for the checklist.

### `vercel.json`

  ```json
  {
    "rewrites": [
      { "source": "/product/:slug", "destination": "/product.html" },
      { "source": "/admin/:path*", "destination": "/admin/index.html" }
    ],
    "headers": [
      {
        "source": "/api/(.*)",
        "headers": [
          { "key": "Access-Control-Allow-Origin", "value": "https://everlastingsbyemaline.com" },
          { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, OPTIONS" },
          { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization, stripe-signature" },
          { "key": "Access-Control-Max-Age", "value": "86400" }
        ]
      }
    ]
  }
  ```

> **Note**: CORS `Access-Control-Allow-Origin` is set to production domain. During development on preview URLs (`*.vercel.app`), CORS may need to be handled in API functions with dynamic origin checking. Address during A2 implementation.

### `tsconfig.json`

  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "ES2020",
      "moduleResolution": "node",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "outDir": "dist",
      "rootDir": ".",
      "types": ["node"]
    },
    "include": ["api/**/*.ts"],
    "exclude": ["node_modules"]
  }
  ```

### `package.json`

  ```json
  {
    "name": "everlastings-website",
    "private": true,
    "scripts": {
      "dev": "vercel dev"
    },
    "dependencies": {
      "stripe": "^17.0.0",
      "@supabase/supabase-js": "^2.0.0",
      "@aws-sdk/client-s3": "^3.0.0"
    }
  }
  ```

### `.env.example`

  ```bash
  # Supabase
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_ANON_KEY=eyJ...
  SUPABASE_SERVICE_KEY=eyJ...

  # Stripe (set test keys for Preview+Development, live keys for Production)
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...

  # Cloudflare R2
  R2_ACCOUNT_ID=your-account-id
  R2_ACCESS_KEY_ID=your-access-key
  R2_SECRET_ACCESS_KEY=your-secret-key
  R2_BUCKET_NAME=everlastings
  R2_PUBLIC_URL=https://cdn.everlastingsbyemaline.com

  # Cloudinary (stateless image transforms — same format as 360-design)
  CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

  # Product API (for AI agents and external API access — AR #20)
  # Generate with: openssl rand -hex 32
  PRODUCT_API_KEY=your-random-64-char-string

  # Meta Pixel (for retargeting + Instagram Shopping attribution — AR #25)
  META_PIXEL_ID=your-pixel-id
  META_ACCESS_TOKEN=your-meta-access-token
  ```

---

## How the Tracks Work

  ```
  TRACK A (Backend)                    TRACK B (Frontend Design)
  ─────────────────                    ────────────────────────
  A1: Services Setup                   B1: Design System
  A2: API Endpoints  ──────────┐       B2: Header, Footer, Nav
  A3: Admin UI + Protocol      ├────── B3: Product Page (placeholder)
  A4: API Testing              │       B4: Shop Grid (placeholder)
                               │       B5: Homepage (placeholder)
                               │       B6: Remaining Pages
                               │
                   TRACK C (Integration)
                   ────────────────────
                   C1: Wire pages to backend
                   C2: Checkout flow E2E
                   C3: SEO finalization
                   C4: Testing + Launch
  ```

**Track A** and **Track B** can proceed simultaneously. Track C requires A2 + B3 minimum.

**Track B approach**: Every frontend page is built with hardcoded placeholder content (lorem ipsum text, placeholder images). No JavaScript data-fetching. Client reviews and iterates on visual design. In Track C, we add the JS that fetches from Supabase.

---

## TRACK A: Foundation + Backend

### A1: Services Setup

**YOU WILL HAVE**: All services connected, tables created, env vars set, analytics base installed

> **Pre-requisite**: Sean will create all service accounts (Supabase, Stripe, Cloudflare R2, Cloudinary, GA4) before the first implementation session. A1 assumes accounts exist and focuses on configuration.

#### Vercel

  - [ ] **Create** Vercel project — connect GitHub repo
  - [ ] **Add** custom domain `everlastingsbyemaline.com`
  - [ ] **Create** `vercel.json` — copy from Configuration Files section
  - [ ] **Push** and verify deploy loads

#### Git Branches

  - [ ] **Create** `dev` branch from `main`: `git checkout -b dev && git push -u origin dev`
  - [ ] **Set** Vercel auto-deploy: `main` → Production, all other branches → Preview
  - [ ] **Configure** env vars per environment (see Environment Strategy section)

#### Supabase

  - [ ] **Run** SQL: create `products` table — copy from Product Schema section
  - [ ] **Run** SQL: create `customers` table
  - [ ] **Run** SQL: create `orders` table
  - [ ] **Run** SQL: create `subscribers` table
  - [ ] **Run** SQL: create `site_config` table
  - [ ] **Run** SQL: create `webhook_events` table (idempotency — AR #21)
  - [ ] **Run** SQL: create `product_interests` table (email capture — AR #26)
  - [ ] **Enable** RLS on all 7 tables:

  ```sql
  -- PRODUCTS: public read, authenticated write
  ALTER TABLE products ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Products are publicly readable"
    ON products FOR SELECT TO anon, authenticated USING (true);

  CREATE POLICY "Only authenticated users can insert products"
    ON products FOR INSERT TO authenticated WITH CHECK (true);

  CREATE POLICY "Only authenticated users can update products"
    ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

  CREATE POLICY "Only authenticated users can delete products"
    ON products FOR DELETE TO authenticated USING (true);

  -- CUSTOMERS: service role only (written by webhook)
  ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Only authenticated users can read customers"
    ON customers FOR SELECT TO authenticated USING (true);

  CREATE POLICY "Service role can manage customers"
    ON customers FOR ALL TO service_role USING (true) WITH CHECK (true);

  -- ORDERS: authenticated read, service role write
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Only authenticated users can read orders"
    ON orders FOR SELECT TO authenticated USING (true);

  CREATE POLICY "Service role can insert orders"
    ON orders FOR INSERT TO service_role WITH CHECK (true);

  -- SUBSCRIBERS: public insert, authenticated read
  ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Anyone can subscribe"
    ON subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);

  CREATE POLICY "Only authenticated users can read subscribers"
    ON subscribers FOR SELECT TO authenticated USING (true);

  -- SITE_CONFIG: public read, authenticated update
  ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Site config is publicly readable"
    ON site_config FOR SELECT TO anon, authenticated USING (true);

  CREATE POLICY "Only authenticated users can update config"
    ON site_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

  -- WEBHOOK_EVENTS: service role only (no RLS policies needed — only accessed via service key)
  ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Service role can manage webhook events"
    ON webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);

  -- PRODUCT_INTERESTS: public insert (CTA forms), authenticated read (admin)
  ALTER TABLE product_interests ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Anyone can register product interest"
    ON product_interests FOR INSERT TO anon, authenticated WITH CHECK (true);

  CREATE POLICY "Only authenticated users can read product interests"
    ON product_interests FOR SELECT TO authenticated USING (true);
  ```

  - [ ] **Create** admin users in Supabase Auth > Users > Invite user:
    - `admin@everlastingsbyemaline.com` (Sean/developer admin)
    - `emyh@everlastingsbyemaline.com` (Emy/client admin)
  - [ ] **Configure** Database Webhook: on `products` INSERT → POST to `{VERCEL_URL}/api/stripe-sync`

#### Cloudflare R2

  - [ ] **Create** R2 bucket `everlastings`
  - [ ] **Enable** public access
  - [ ] **Configure** custom domain: `cdn.everlastingsbyemaline.com`
    - Cloudflare DNS → Add CNAME record: `cdn` → R2 bucket public hostname
    - This replaces `pub-xxx.r2.dev` with a branded CDN URL
  - [ ] **Update** `R2_PUBLIC_URL` env var to `https://cdn.everlastingsbyemaline.com`
  - [ ] **Create** API token (Read & Write, scoped to `everlastings` bucket)
  - **No development subdomain needed** — dev and production share the same R2 bucket and CDN. Only Stripe keys differ between environments.

#### Cloudinary

  - [ ] **Note** cloud name, API key, API secret
  - [ ] **Set** `CLOUDINARY_URL` env var in Vercel

#### Stripe

  - [ ] **Get** test API keys (publishable + secret)
  - [ ] **Create** test webhook endpoint → `{dev-preview-url}/api/webhook`
    - Events: `checkout.session.completed`
  - [ ] **Create** cart-recovery coupon: name "Haven Finder Apology", 10% off, duration once, ID `cart-recovery-10`
  - [ ] **Create** newsletter coupon: name "Welcome to the Firelight Council", 5% off, duration once, ID `newsletter-welcome-5`
  - [ ] **Enable** receipt emails: Dashboard > Settings > Emails > Successful payments

#### Meta Pixel + Instagram Shopping (AR #25, #27)

  - [ ] **Get** Meta Pixel ID from Meta Events Manager
  - [ ] **Get** Meta Access Token (system user token with `catalog_management` permission) from Meta Business Manager
  - [ ] **Set** `META_PIXEL_ID` and `META_ACCESS_TOKEN` env vars in Vercel
  - [ ] **Verify** Instagram Shopping prerequisites (Emy's responsibility):
    1. Instagram account converted to Business profile
    2. IG profile connected to a Facebook Page
    3. Meta Business Manager with FB Page claimed
    4. Commerce Manager: create catalog (type: E-commerce)
    5. Domain verification: DNS TXT record or meta tag for `everlastingsbyemaline.com`
    6. Submit shop for Commerce review (1-2 weeks)
    7. After approval: product tagging available in Instagram app

#### Analytics

  - [ ] **Create** GA4 property for everlastingsbyemaline.com
  - [ ] **Note** Measurement ID (`G-XXXXXXXXXX`)
  - [ ] **Verify** Google Search Console (TXT record or HTML file upload)

#### Config Files

  - [ ] **Create** `.env.example` — copy from Configuration Files section
  - [ ] **Generate** `PRODUCT_API_KEY`: `openssl rand -hex 32`
  - [ ] **Set** env vars in Vercel Dashboard (per environment — see Environment Strategy)
  - [ ] **Create** `.env.local` for local dev: `cp .env.example .env.local` then fill in real values
  - [ ] **Run** `npm install`
  - [ ] **Create** `tsconfig.json` and `package.json` — copy from Configuration Files section
  - [ ] **Verify** `vercel dev` starts

---

### A2: API Endpoints

**YOU WILL HAVE**: All server-side endpoints working, testable with curl

#### Config — `api/config.ts`

Returns environment-appropriate public configuration. Enables automatic test/live Stripe key switching.

> **Security note**: This endpoint serves ONLY public keys — Stripe publishable key (`pk_*`), Supabase URL, and Supabase anon key. These are designed to be public (Stripe publishable keys are meant for client-side use; Supabase anon keys are protected by RLS). No secrets are exposed. This endpoint requires no authentication. (AR #15)

  ```typescript
  // api/config.ts
  export async function GET() {
    return Response.json({
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      metaPixelId: process.env.META_PIXEL_ID || null,
    });
  }
  ```

  - [ ] **Create** `api/config.ts` with the code above

#### Stripe Sync — `api/stripe-sync.ts`

Called by Supabase Database Webhook when a product is inserted. See Stripe Sync Rules section.

  ```typescript
  // api/stripe-sync.ts
  import Stripe from 'stripe';
  import { createClient } from '@supabase/supabase-js';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  export async function POST(request: Request) {
    try {
      const payload = await request.json();

      if (payload.type !== 'INSERT' || payload.table !== 'products') {
        return Response.json({ error: 'Ignored: not a products INSERT' }, { status: 200 });
      }

      const product = payload.record;

      const stripeProduct = await stripe.products.create({
        name: product.title,
        description: product.description || product.headline || '',
        images: product.images?.slice(0, 8).map((img: { url: string }) => img.url) || [],
        metadata: { supabase_id: product.id, slug: product.slug },
      });

      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: product.price,
        currency: 'usd',
      });

      const { error } = await supabase
        .from('products')
        .update({
          stripe_product_id: stripeProduct.id,
          stripe_price_id: stripePrice.id,
        })
        .eq('id', product.id);

      if (error) {
        console.error('Failed to write Stripe IDs back:', error.message);
      }

      return Response.json({
        success: true,
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
      });
    } catch (err) {
      console.error('Stripe sync error:', err);
      return Response.json({ error: 'Stripe sync failed' }, { status: 500 });
    }
  }
  ```

  - [ ] **Create** `api/stripe-sync.ts`

#### Checkout — `api/checkout.ts`

Creates Stripe Checkout Session with `ui_mode: 'custom'`. Checks availability for ALL cart items.

  ```typescript
  // api/checkout.ts
  import Stripe from 'stripe';
  import { createClient } from '@supabase/supabase-js';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  interface CartItem {
    product_id: string;
    slug: string;
    stripe_price_id: string;
  }

  export async function POST(request: Request) {
    try {
      const { items } = await request.json() as { items: CartItem[] };

      if (!items?.length) {
        return Response.json({ error: 'Cart is empty' }, { status: 400 });
      }

      // Availability check for ALL items
      const productIds = items.map(i => i.product_id);
      const { data: products, error } = await supabase
        .from('products')
        .select('id, slug, available, quantity')
        .in('id', productIds);

      if (error) {
        return Response.json({ error: 'Failed to verify availability' }, { status: 500 });
      }

      const unavailable = items.filter(item => {
        const product = products?.find(p => p.id === item.product_id);
        return !product || !product.available || product.quantity < 1;
      });

      if (unavailable.length > 0) {
        return Response.json({
          error: 'Some items are no longer available',
          unavailable: unavailable.map(i => i.slug),
        }, { status: 409 });
      }

      const line_items = items.map(item => ({
        price: item.stripe_price_id,
        quantity: 1,
      }));

      const itemsMeta = items.map(i => ({ id: i.product_id, slug: i.slug }));

      const session = await stripe.checkout.sessions.create({
        ui_mode: 'custom',
        mode: 'payment',
        line_items,
        allow_promotion_codes: true,
        shipping_address_collection: { allowed_countries: ['US'] },
        phone_number_collection: { enabled: true },
        metadata: { items: JSON.stringify(itemsMeta) },
        return_url: `${getBaseUrl(request)}/complete.html?session_id={CHECKOUT_SESSION_ID}`,
      });

      return Response.json({ clientSecret: session.client_secret });
    } catch (err) {
      console.error('Checkout error:', err);
      return Response.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }
  }

  function getBaseUrl(request: Request): string {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }
  ```

  - [ ] **Create** `api/checkout.ts`

#### Session Status — `api/session-status.ts`

  ```typescript
  // api/session-status.ts
  import Stripe from 'stripe';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  export async function GET(request: Request) {
    try {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get('session_id');

      if (!sessionId) {
        return Response.json({ error: 'Missing session_id' }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });

      return Response.json({
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email,
      });
    } catch (err) {
      console.error('Session status error:', err);
      return Response.json({ error: 'Failed to retrieve session' }, { status: 500 });
    }
  }
  ```

  - [ ] **Create** `api/session-status.ts`

#### Webhook — `api/webhook.ts`

Handles `checkout.session.completed`. See Webhook Contract section for the full flow.

  ```typescript
  // api/webhook.ts
  import Stripe from 'stripe';
  import { createClient } from '@supabase/supabase-js';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  export async function POST(request: Request) {
    const rawBody = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return Response.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Idempotency check (AR #21): skip already-processed events
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('event_id')
      .eq('event_id', event.id)
      .single();

    if (existingEvent) {
      console.log(`Duplicate webhook event ignored: ${event.id}`);
      return Response.json({ received: true }, { status: 200 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Parse items from metadata
      let items: { id: string; slug: string }[] = [];
      try {
        items = JSON.parse(session.metadata?.items || '[]');
      } catch {
        console.error('Failed to parse items metadata');
        return Response.json({ received: true }, { status: 200 });
      }

      if (!items.length) {
        console.error('No items in session metadata');
        return Response.json({ received: true }, { status: 200 });
      }

      // Upsert customer record
      const customerEmail = session.customer_details?.email;
      let customerId: string | null = null;

      if (customerEmail) {
        const { data: customer } = await supabase
          .from('customers')
          .upsert({
            email: customerEmail,
            name: session.customer_details?.name || null,
            phone: session.customer_details?.phone || null,
            shipping_address: session.shipping_details?.address || null,
            source: 'checkout',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'email' })
          .select('id')
          .single();

        customerId = customer?.id || null;

        // Link subscriber if exists
        await supabase
          .from('subscribers')
          .update({ source: 'customer' })
          .eq('email', customerEmail);
      }

      // Mark each product as sold and create order records
      for (const item of items) {
        await supabase
          .from('products')
          .update({ available: false, quantity: 0 })
          .eq('id', item.id);

        await supabase
          .from('orders')
          .insert({
            stripe_session_id: session.id,
            stripe_payment_intent: typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
            product_id: item.id,
            customer_id: customerId,
            customer_email: customerEmail,
            amount: session.amount_total,
            status: 'completed',
            shipping_address: session.shipping_details?.address,
          });
      }

      // Record processed event for idempotency (AR #21)
      await supabase.from('webhook_events').insert({ event_id: event.id });

      // Meta Conversions API — server-side Purchase (AR #25)
      // Deduplicates with browser pixel via event_id
      if (process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN) {
        try {
          await fetch(`https://graph.facebook.com/v21.0/${process.env.META_PIXEL_ID}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: [{
                event_name: 'Purchase',
                event_time: Math.floor(Date.now() / 1000),
                event_id: event.id,
                user_data: {
                  em: customerEmail ? [await hashSHA256(customerEmail)] : [],
                },
                custom_data: {
                  currency: 'USD',
                  value: (session.amount_total || 0) / 100,
                  content_ids: items.map(i => i.slug),
                  content_type: 'product',
                  num_items: items.length,
                }
              }],
              access_token: process.env.META_ACCESS_TOKEN
            })
          });
        } catch (err) {
          console.error('Meta CAPI error (non-blocking):', err);
        }
      }

      console.log(`Order completed: ${items.map(i => i.slug).join(', ')} → ${customerEmail}`);
    }

    return Response.json({ received: true }, { status: 200 });
  }
  ```

  - [ ] **Create** `api/webhook.ts`

#### Cart Recovery — `api/cart-recovery.ts`

See Cart Recovery Flow section for the full UX specification.

  ```typescript
  // api/cart-recovery.ts
  import Stripe from 'stripe';
  import { createClient } from '@supabase/supabase-js';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  export async function POST(request: Request) {
    try {
      const { email, lost_items } = await request.json();

      if (!email || !email.includes('@')) {
        return Response.json({ error: 'Valid email required' }, { status: 400 });
      }

      const promoCode = await stripe.promotionCodes.create({
        coupon: 'cart-recovery-10',
        max_redemptions: 1,
        expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
        metadata: {
          source: 'cart-recovery',
          lost_items: JSON.stringify(lost_items || []),
          email,
        },
      });

      await supabase
        .from('subscribers')
        .upsert({ email, source: 'cart-recovery' }, { onConflict: 'email' });

      return Response.json({
        code: promoCode.code,
        percent_off: 10,
        expires_in_days: 30,
      });
    } catch (err) {
      console.error('Cart recovery error:', err);
      return Response.json({ error: 'Failed to generate discount' }, { status: 500 });
    }
  }
  ```

  - [ ] **Create** `api/cart-recovery.ts`

#### Products API — `api/products.ts`

Enables AI-assisted product creation. Authenticated with `PRODUCT_API_KEY` (AR #20).

> **Security**: This endpoint validates against `PRODUCT_API_KEY` (a random string you generate). Internally, it uses `SUPABASE_SERVICE_KEY` to write to the database. `SUPABASE_SERVICE_KEY` is NEVER exposed in external requests.

  ```typescript
  // api/products.ts
  import Stripe from 'stripe';
  import { createClient } from '@supabase/supabase-js';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  function authorize(request: Request): boolean {
    const auth = request.headers.get('authorization');
    return auth === `Bearer ${process.env.PRODUCT_API_KEY}`;
  }

  export async function GET(request: Request) {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return Response.json({ error: 'Missing slug parameter' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    return Response.json(data);
  }

  export async function POST(request: Request) {
    if (!authorize(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const product = await request.json();

      // --- Validation (AR #24) ---

      // Required fields
      const required = ['title', 'description', 'price', 'product_type'];
      const missing = required.filter(f => !product[f]);
      if (missing.length) {
        return Response.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
      }

      // Price must be positive integer in cents
      if (!Number.isInteger(product.price) || product.price <= 0) {
        return Response.json({ error: 'Price must be a positive integer in cents' }, { status: 400 });
      }

      // Title and description not empty
      if (!product.title.trim() || !product.description.trim()) {
        return Response.json({ error: 'Title and description must not be empty' }, { status: 400 });
      }

      // Minimum 7 images
      if (!product.images || product.images.length < 7) {
        return Response.json({ error: 'Minimum 7 images required' }, { status: 400 });
      }

      // Image role enforcement: exactly 1 hero, 1 thumbnail, min 5 gallery
      const heroImages = product.images.filter((img: { url: string }) =>
        img.url.split('/').pop()?.startsWith('hero-')
      );
      const galleryImages = product.images.filter((img: { url: string }) =>
        img.url.split('/').pop()?.startsWith('gallery-')
      );
      if (heroImages.length !== 1) {
        return Response.json({ error: 'Exactly 1 hero image required' }, { status: 400 });
      }
      if (!product.thumbnail) {
        return Response.json({ error: 'Thumbnail URL required' }, { status: 400 });
      }
      if (galleryImages.length < 5) {
        return Response.json({ error: 'Minimum 5 gallery images required' }, { status: 400 });
      }

      // --- Slug generation (AR #23) ---
      // Generate slug before insert (needed for image paths, must be done before image upload)
      if (!product.slug) {
        product.slug = product.title.toLowerCase().replaceAll(' ', '-');
      }

      // Check for slug conflict
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('slug', product.slug)
        .single();

      if (existing) {
        return Response.json({ error: `Product with slug "${product.slug}" already exists` }, { status: 409 });
      }

      // --- Insert ---
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

      if (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }

      // DB webhook will auto-trigger stripe-sync
      return Response.json({ success: true, product: data });
    } catch (err) {
      console.error('Product creation error:', err);
      return Response.json({ error: 'Failed to create product' }, { status: 500 });
    }
  }

  export async function PUT(request: Request) {
    if (!authorize(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ error: 'Missing id parameter' }, { status: 400 });
      }

      const updates = await request.json();

      // If price changed, archive old Stripe Price and create new one (AR #4)
      if (updates.price !== undefined) {
        const { data: existing } = await supabase
          .from('products')
          .select('price, stripe_product_id, stripe_price_id')
          .eq('id', id)
          .single();

        if (existing && existing.price !== updates.price && existing.stripe_price_id) {
          // Archive old price
          await stripe.prices.update(existing.stripe_price_id, { active: false });

          // Create new price
          const newPrice = await stripe.prices.create({
            product: existing.stripe_product_id!,
            unit_amount: updates.price,
            currency: 'usd',
          });

          updates.stripe_price_id = newPrice.id;
        }
      }

      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }

      return Response.json({ success: true, product: data });
    } catch (err) {
      console.error('Product update error:', err);
      return Response.json({ error: 'Failed to update product' }, { status: 500 });
    }
  }
  ```

  - [ ] **Create** `api/products.ts`

#### Image Upload — `api/upload.ts`

Accepts image, transforms via Cloudinary (4:5 crop, WebP, compress), uploads to R2, returns CDN URL. Authenticated with `PRODUCT_API_KEY` (AR #20).

  ```typescript
  // api/upload.ts
  import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  // Parse CLOUDINARY_URL: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  function getCloudinaryConfig() {
    const url = process.env.CLOUDINARY_URL || '';
    const match = url.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
    if (!match) throw new Error('Invalid CLOUDINARY_URL');
    return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
  }

  export async function POST(request: Request) {
    // Auth check (AR #20)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.PRODUCT_API_KEY}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const slug = formData.get('slug') as string;
      const role = formData.get('role') as string; // hero, gallery-01, thumbnail, video-01, detail-01
      const skipTransform = formData.get('skip_transform') === 'true'; // for videos/GIFs

      if (!file || !slug || !role) {
        return Response.json({ error: 'Missing file, slug, or role' }, { status: 400 });
      }

      // File type validation
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        return Response.json({
          error: 'File type not allowed. Accepted: JPEG, PNG, WebP, GIF, MP4, MOV'
        }, { status: 400 });
      }

      // File size validation (10MB images, 50MB videos)
      const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return Response.json({
          error: `File too large. Max: ${file.type.startsWith('video/') ? '50MB' : '10MB'}`
        }, { status: 400 });
      }

      let finalBuffer: Buffer;
      let contentType: string;
      let extension: string;

      if (skipTransform) {
        // Direct upload for videos and GIFs
        finalBuffer = Buffer.from(await file.arrayBuffer());
        contentType = file.type;
        extension = file.type.includes('mp4') ? 'mp4' : file.type.includes('gif') ? 'gif' : 'webp';
      } else {
        // Image: upload to Cloudinary → transform → download → delete
        const cloud = getCloudinaryConfig();
        const imageBuffer = Buffer.from(await file.arrayBuffer());

        // Upload to Cloudinary
        const uploadForm = new FormData();
        uploadForm.append('file', new Blob([imageBuffer]));
        uploadForm.append('upload_preset', 'unsigned_temp'); // or use signed upload
        uploadForm.append('api_key', cloud.apiKey);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud.cloudName}/image/upload`,
          { method: 'POST', body: uploadForm }
        );
        const uploadData = await uploadRes.json();
        const publicId = uploadData.public_id;

        // Determine transform params
        const isThumb = role.startsWith('thumbnail');
        const width = isThumb ? 600 : 1200;
        const transformUrl = `https://res.cloudinary.com/${cloud.cloudName}/image/upload/c_fill,ar_4:5,w_${width},f_webp,q_auto,g_auto/${publicId}`;

        // Download transformed image
        const transformedRes = await fetch(transformUrl);
        finalBuffer = Buffer.from(await transformedRes.arrayBuffer());
        contentType = 'image/webp';
        extension = 'webp';

        // Delete from Cloudinary (stay on free tier)
        const timestamp = Math.floor(Date.now() / 1000);
        const sigString = `public_id=${publicId}&timestamp=${timestamp}${cloud.apiSecret}`;
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-1', encoder.encode(sigString));
        const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

        await fetch(`https://api.cloudinary.com/v1_1/${cloud.cloudName}/image/destroy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_id: publicId, api_key: cloud.apiKey, timestamp, signature }),
        });
      }

      // Upload to R2
      const filename = `${role}-${slug}.${extension}`;
      const key = `products/${slug}/${filename}`;

      await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: finalBuffer,
        ContentType: contentType,
      }));

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
      return Response.json({ url: publicUrl, filename });
    } catch (err) {
      console.error('Upload error:', err);
      return Response.json({ error: 'Upload failed' }, { status: 500 });
    }
  }
  ```

  - [ ] **Create** `api/upload.ts`

#### Newsletter — `api/subscribe.ts`

  ```typescript
  // api/subscribe.ts
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  export async function POST(request: Request) {
    try {
      const { email, source } = await request.json();

      if (!email || !email.includes('@')) {
        return Response.json({ error: 'Valid email required' }, { status: 400 });
      }

      const { error } = await supabase
        .from('subscribers')
        .insert({ email, source: source || 'footer' });

      if (error) {
        if (error.code === '23505') {
          return Response.json({ message: 'Already subscribed' }, { status: 200 });
        }
        throw error;
      }

      return Response.json({ message: 'Subscribed' });
    } catch (err) {
      console.error('Subscribe error:', err);
      return Response.json({ error: 'Subscription failed' }, { status: 500 });
    }
  }
  ```

  - [ ] **Create** `api/subscribe.ts`
  - [ ] **Create** `api/contact.ts` — similar pattern, stores in Supabase or sends email

#### Cart Activity — `api/cart-activity.ts`

Fire-and-forget endpoint called when any user adds a product to cart. Checks for interested email subscribers.

  ```typescript
  // api/cart-activity.ts
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  export async function POST(request: Request) {
    try {
      const { slug } = await request.json();
      if (!slug) return Response.json({ ok: true });

      // Check for interested subscribers (v1: log for admin visibility)
      const { data: interests } = await supabase
        .from('product_interests')
        .select('email')
        .eq('product_slug', slug)
        .eq('notified', false);

      if (interests && interests.length > 0) {
        console.log(`Cart activity: ${slug} — ${interests.length} interested subscriber(s)`);
        // Post-launch with email service: send notification emails here
        // Then: UPDATE product_interests SET notified = true WHERE product_slug = slug
      }

      return Response.json({ ok: true });
    } catch {
      return Response.json({ ok: true }); // Never block cart UX
    }
  }
  ```

  - [ ] **Create** `api/cart-activity.ts`

#### Product Feed — `api/product-feed.ts`

CSV endpoint for Meta Commerce Catalog sync. Meta polls this URL daily to sync Instagram Shopping.

  ```typescript
  // api/product-feed.ts
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  export async function GET() {
    const { data: products } = await supabase
      .from('products')
      .select('slug, title, description, price, available, thumbnail');

    const header = 'id,title,description,availability,condition,price,link,image_link,brand';
    const rows = (products || []).map(p => {
      const avail = p.available ? 'in stock' : 'out of stock';
      const price = `${(p.price / 100).toFixed(2)} USD`;
      const link = `https://everlastingsbyemaline.com/product/${p.slug}`;
      const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      return [p.slug, esc(p.title), esc(p.description), avail, 'new', price, link, p.thumbnail, 'Everlastings by Emaline'].join(',');
    });

    return new Response([header, ...rows].join('\n'), {
      headers: { 'Content-Type': 'text/csv', 'Cache-Control': 'public, max-age=3600' }
    });
  }
  ```

  - [ ] **Create** `api/product-feed.ts`
  - [ ] **Configure** Meta Commerce Manager: Catalog > Data Sources > Add Feed > URL: `https://everlastingsbyemaline.com/api/product-feed`

---

### A3: Admin UI + Product Protocol

**YOU WILL HAVE**: Browser-based product management + documented AI workflow

#### Admin UI — `admin/index.html` + `assets/js/admin.js`

  - [ ] **Create** `admin/index.html` — login form
  - [ ] **Create** `assets/js/admin.js`
  - [ ] **Implement** Supabase Auth login/logout
  - [ ] **Build** product list (table/grid with edit/delete)
  - [ ] **Build** new product form (all schema fields)
    - Price input in dollars, convert to cents on save
    - Dynamic lists: features, materials, care_instructions, shipping_details
  - [ ] **Implement** image upload: file picker → `/api/upload` → CDN URL
  - [ ] **Implement** save (INSERT or UPDATE to products)
  - [ ] **Implement** delete with confirmation

#### Product Protocol

  - [ ] **Create** `assets/docs/PRODUCT_PROTOCOL.md` — consolidated guide
    - Section 1: Client guide (for Emy) — field explanations, photo requirements, admin UI walkthrough
    - Section 2: AI protocol — slug generation, image pipeline, API calls, validation, error handling
    - Replaces both `PRODUCT_GUIDE.md` and `PRODUCT_CREATION_PROTOCOL.md`

---

### A4: API Integration Testing

  - [ ] **Test** stripe-sync: insert product in Supabase → verify Stripe product appears
  - [ ] **Test** checkout: POST with cart items → receive clientSecret
  - [ ] **Test** webhook: use Stripe CLI `stripe listen --forward-to localhost:3000/api/webhook`
  - [ ] **Test** full flow: add to cart → checkout → pay with `4242...` → completion
  - [ ] **Verify** customer record created in customers table
  - [ ] **Verify** order records created with customer_id FK
  - [ ] **Test** multi-item: add 2 products, checkout, verify both marked sold
  - [ ] **Test** race condition: add item, set `available=false`, checkout → 409
  - [ ] **Test** recovery: trigger 409 → enter email → get promo code
  - [ ] **Test** products API: POST/PUT/GET via curl with `PRODUCT_API_KEY` auth
  - [ ] **Test** upload API: upload image with `PRODUCT_API_KEY`, verify Cloudinary transform + R2 delivery
  - [ ] **Test** upload validation: wrong file type → 400, file too large → 400, no auth → 401
  - [ ] **Test** webhook idempotency: replay same event → should be ignored
  - [ ] **Test** slug conflict: create product, try same title → 409
  - [ ] **Test** admin: login → add product → see it on shop page

---

## TRACK B: Frontend Design (Placeholder Content)

All pages built with hardcoded HTML — no JavaScript data-fetching. Lorem ipsum text and placeholder images. Client reviews and iterates on visual design.

> **Verified**: All page descriptions from v1.1 planning docs (homepage, shop, product, about, contact, FAQ, shipping, terms, privacy, policies, checkout, complete) are present in Track B below. No pages were lost during restructuring.

### B1: Design System

**YOU WILL HAVE**: CSS variables, typography, base components, responsive scaffolding

#### CSS Custom Properties

  - [ ] **Create** `assets/css/styles.css`
  - [ ] **Define** color variables — copy from `BRAND.md` > CSS Custom Properties
  - [ ] **Define** typography variables (font-display, font-body, size scale)
  - [ ] **Define** spacing, shadow, radius, transition, z-index tokens:

  ```css
  :root {
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;
    --space-3xl: 4rem;

    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
    --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);

    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;

    --transition-fast: 150ms ease;
    --transition-base: 250ms ease;
    --transition-slow: 400ms ease;

    --z-header: 100;
    --z-modal: 200;
    --z-lightbox: 300;

    --header-height: 64px;
  }
  ```

#### Typography

  - [ ] **Add** Cormorant Garamond via Google Fonts
  - [ ] **Style** heading hierarchy (h1-h6 using --font-display)
  - [ ] **Style** body text (--font-body, line-height 1.6)

#### Base Components

  - [ ] **Buttons**: primary (plum bg), secondary (outline), ghost, disabled
  - [ ] **Cards**: product tiles with hover shadow lift + scale 1.05
  - [ ] **Forms**: border, focus state (plum outline), padding, radius
  - [ ] **Images**: `object-fit: cover`, `aspect-ratio: 4/5`, `loading="lazy"`
  - [ ] **Badges**: "Sold" (fog bg, muted text), "Featured" (gold border)
  - [ ] **Errors**: subtle, non-intrusive, ink text on fog bg

#### Loading States (Skeleton Screens)

  - [ ] **Style** skeleton loading placeholders for product page and shop grid
  - [ ] **Animate** with shimmer effect (CSS `@keyframes` gradient sweep)

  ```css
  .skeleton {
    background: linear-gradient(90deg, var(--color-fog) 25%, #e0e0e0 50%, var(--color-fog) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-sm);
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  ```

#### Lightbox Component

  - [ ] **Style** fullscreen overlay: dark bg, centered image, close button
  - [ ] **Add** left/right navigation arrows
  - [ ] **Support** keyboard: Escape to close, Arrow keys to navigate

  ```css
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: var(--z-lightbox);
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lightbox img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
  }

  .lightbox-close {
    position: absolute;
    top: var(--space-md);
    right: var(--space-md);
    color: var(--color-cream);
    font-size: 2rem;
    cursor: pointer;
  }

  .lightbox-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-cream);
    font-size: 2rem;
    cursor: pointer;
    padding: var(--space-md);
  }

  .lightbox-prev { left: var(--space-md); }
  .lightbox-next { right: var(--space-md); }
  ```

#### Inline SVG Icons

No icon library. 5-6 simple SVG icons used in product details:

  - [ ] **Create** icons: dimensions (ruler), weight (scale), materials (palette), lighting (sun), care (shield), shipping (truck)
  - [ ] **Style** at 20x20px, `currentColor` fill

#### Responsive Foundation

  - [ ] **Set** base mobile (393px)
  - [ ] **Add** tablet breakpoint (768px)
  - [ ] **Add** desktop breakpoint (1024px)
  - [ ] **Add** large desktop (1440px)

#### GA4 Script Tag

  - [ ] **Add** `gtag.js` snippet to `<head>` of all pages (include in header template):

  ```html
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
  ```

#### Meta Pixel Script Tag (AR #25)

  - [ ] **Add** Meta Pixel base code to `<head>` of all pages (alongside GA4):

  ```html
  <script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'META_PIXEL_ID_HERE');
  fbq('track', 'PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=META_PIXEL_ID_HERE&ev=PageView&noscript=1"/></noscript>
  ```

  `PageView` fires automatically on every page load. No extra code needed.

#### Email Capture CTA Styles (AR #26)

  - [ ] **Style** contemplation popup (bottom-right peel-up):

  ```css
  .contemplation-popup {
    position: fixed;
    bottom: 0;
    right: 0;
    max-width: 360px;
    transform: translateY(100%);
    transition: transform var(--transition-slow);
    z-index: var(--z-modal);
    background: var(--bg-primary);
    border-top-left-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: var(--space-lg);
  }
  .contemplation-popup.visible {
    transform: translateY(0);
  }
  ```

  - [ ] **Style** exit intent modal (centered overlay)
  - [ ] **Style** product interest CTA (below sticky card buttons)

---

### B2: Header, Footer, Nav

**YOU WILL HAVE**: Consistent navigation on all pages (hardcoded, no JS needed)

#### Header

  - [ ] **Logo** (left, links to homepage)
  - [ ] **Nav**: Home, Shop (dropdown), About, Commissions, Contact
  - [ ] **Shop dropdown**: All | Portals to Peace | Book Nooks & Story Lofts | Seasonal & Limited | Sold Archive
  - [ ] **Cart icon** with count badge (right) — links to `/checkout.html`
  - [ ] **Mobile**: hamburger (left), logo (center), cart icon (right)
  - [ ] **Sticky** on scroll

#### Footer

  - [ ] **Four columns**: About, Shop, Support, Connect
  - [ ] **Newsletter signup**: email input (wired in Track C)
  - [ ] **Social links**: Instagram, Facebook, Pinterest, TikTok
  - [ ] **Bottom bar**: copyright, "Site by Sean August Horvath", Terms | Privacy

---

### B3: Product Page (Placeholder)

**YOU WILL HAVE**: Complete product page layout with hardcoded sample product

  - [ ] **Create** `product.html` — two-column layout:
    - Left: `.product-story` — scrollable gallery + story card
    - Right: `.product-sticky-card` — sticky details card
  - [ ] **Hardcode** sample product (The Sunkeeper) with placeholder text and images
  - [ ] **Build** image gallery: main image + thumbnail strip
  - [ ] **Build** lightbox: click gallery image → fullscreen overlay with nav
  - [ ] **Build** sticky product card:

  ```html
  <aside class="product-sticky-card">
    <img class="sticky-thumb" src="/placeholder/hero.webp" alt="The Sunkeeper">
    <h2>The Sunkeeper</h2>
    <p class="price">$245.00</p>

    <button class="btn-primary">Add to Cart</button>
    <button class="btn-secondary">Buy Now</button>

    <p class="availability-note">
      Each piece is one-of-a-kind.
      <a href="/policies.html#availability">Availability confirmed at checkout</a>.
    </p>

    <!-- Email CTA 1: Product Interest (AR #26) -->
    <div class="interest-cta" id="product-interest-cta">
      <p class="interest-text">This is a one-of-a-kind piece. Love it? Get notified if someone else adds it to their cart.</p>
      <form id="interest-form" class="interest-form">
        <label class="checkbox-label">
          <input type="checkbox" required>
          Please email me. I agree to <a href="/terms.html">Terms</a> &amp; <a href="/privacy.html">Privacy Policy</a>.
        </label>
        <input type="email" placeholder="Your email" required>
        <button type="submit" class="btn-secondary btn-sm">Notify Me</button>
      </form>
    </div>
  </aside>
  ```

  - [ ] **Style** sticky behavior: `position: sticky; top: calc(var(--header-height) + var(--space-lg));`
  - [ ] **Mobile** (< 768px): not sticky, card below gallery in normal flow
  - [ ] **Build** features list with inline SVG icons
  - [ ] **Build** details sections: dimensions, materials, care, shipping
  - [ ] **Build** story card section with poetic lorem ipsum
  - [ ] **Add** breadcrumb: Home > Shop > The Sunkeeper
  - [ ] **Add** "Related Havens" section placeholder (3-4 product cards, hardcoded)

#### Media rendering (for videos/GIFs in gallery):

  ```html
  <!-- Video -->
  <video controls poster="/placeholder/hero.webp" class="gallery-media">
    <source src="/placeholder/video.mp4" type="video/mp4">
  </video>

  <!-- GIF -->
  <img src="/placeholder/detail.gif" alt="Detail animation" class="gallery-media" loading="lazy">

  <!-- YouTube (privacy-enhanced) -->
  <iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
    class="gallery-media" loading="lazy" allowfullscreen></iframe>
  ```

#### Email CTA 2: Cart Exit Intent Modal

When a user has items in cart and navigates away or triggers exit intent:

  ```html
  <!-- Include on all pages (hidden by default) -->
  <div class="exit-modal hidden" id="exit-intent-modal">
    <div class="exit-modal-overlay"></div>
    <div class="exit-modal-content">
      <button class="exit-modal-close">&times;</button>
      <h3>Don't miss out</h3>
      <p>This is one of a kind. Can we email you if someone else adds it to their cart or if we have a discount?</p>
      <form id="exit-email-form">
        <label class="checkbox-label">
          <input type="checkbox" required>
          Please email me. I agree to <a href="/terms.html">Terms</a> &amp; <a href="/privacy.html">Privacy Policy</a>.
        </label>
        <input type="email" placeholder="Your email" required>
        <button type="submit" class="btn-primary">Keep Me Updated</button>
      </form>
    </div>
  </div>
  ```

  - Only shows once per session (sessionStorage flag)
  - Only shows if cart is not empty
  - Triggered by: mouse leaving viewport top (desktop) or `visibilitychange` (mobile)
  - POSTs to `/api/subscribe` with `source: 'cart-exit'`
  - Success: close modal, brief toast "You're on the list."

#### Email CTA 3: Contemplation Popup (3-Minute Timer)

When a user has been on a product page for 3+ minutes, a subtle popup peels up from the bottom-right:

  ```html
  <div class="contemplation-popup" id="contemplation-popup">
    <div class="contemplation-content">
      <button class="contemplation-close">&times;</button>
      <p>Love it? Join our newsletter for 5% off!</p>
      <form id="contemplation-form">
        <label class="checkbox-label">
          <input type="checkbox" required>
          I agree to <a href="/terms.html">Terms</a> &amp; <a href="/privacy.html">Privacy Policy</a>.
        </label>
        <input type="email" placeholder="Your email" required>
        <button type="submit" class="btn-primary">Get 5% Off</button>
      </form>
    </div>
  </div>
  ```

  - Triggered by `setTimeout(3 * 60 * 1000)` on product page
  - Only shows once per session (sessionStorage)
  - Only shows if user hasn't already subscribed from CTA 1
  - Animation: bottom-right peel-up (see B1 CSS)
  - POSTs to `/api/subscribe` with `source: 'contemplation-offer'`
  - On success: generates unique 5% promo code via Stripe promotion code API (coupon `newsletter-welcome-5`), displays code inline
  - Fires `email_cta_capture` GA4 event + `Lead` Meta Pixel event

---

### B4: Shop Grid (Placeholder)

**YOU WILL HAVE**: Filterable grid layout with hardcoded product tiles

  - [ ] **Create** `shop.html` — filter sidebar + product grid
  - [ ] **Hardcode** 6-8 product tiles with placeholder data
  - [ ] **Build** filter sidebar: series, product_type, availability checkboxes
  - [ ] **Build** sort dropdown: price (low/high), newest, name (A-Z)
  - [ ] **Style** tiles: 4:5 aspect ratio, hover scale + shadow, lazy images
  - [ ] **Style** "Sold" badge overlay
  - [ ] **Style** "No results" state
  - [ ] **Style** skeleton loading state (shown before data loads in Track C)

---

### B5: Homepage (Placeholder)

**YOU WILL HAVE**: Full landing page with all sections, hardcoded content

  - [ ] **Create** `index.html`
  - [ ] **Build** hero: full-viewport image + overlay + CTA "Enter Elsewhere"
  - [ ] **Build** intro block: "When the world cracked open..."
  - [ ] **Build** featured carousel: horizontal scroll with 3-4 hardcoded product cards
  - [ ] **Build** brand pillars: Story, Craftsmanship, Sanctuary
  - [ ] **Build** testimonial strip placeholder
  - [ ] **Add** theatrical lighting CSS effect:
    - CSS mask/spotlight: radial gradient shifts on scroll
    - `translateY()` on background layers opposite to scroll
    - `will-change: transform` for GPU acceleration

---

### B6: Remaining Pages (Placeholder)

**YOU WILL HAVE**: All content pages with placeholder text

  - [ ] **Create** `about.html` — photo + logo + origin story + philosophy + mission
  - [ ] **Create** `contact.html` — form (name, email, subject, message) + commission section
  - [ ] **Create** `faq.html`
  - [ ] **Create** `shipping.html` — shipping & returns info
  - [ ] **Create** `terms.html` — terms of service
  - [ ] **Create** `privacy.html` — privacy policy
  - [ ] **Create** `policies.html` — includes availability section:

  ```html
  <section id="availability">
    <h2>Availability & Cart</h2>
    <p>Every Everlastings piece is one-of-a-kind. When you add an item to your cart,
      it is not reserved — another collector may complete their purchase first.</p>
    <p>We verify availability for all items when you begin checkout. If a piece has
      found its home while you were browsing, we'll let you know and offer a small
      thank-you for your patience.</p>
    <p>We believe in honest, pressure-free shopping. No countdown timers, no artificial
      urgency — just beautiful things for those who find them.</p>
  </section>
  ```

  - [ ] **Create** `checkout.html` — cart summary + payment form mount point (wired in Track C)
  - [ ] **Create** `complete.html` — success/error states (wired in Track C)

---

## TRACK C: Integration

Wire Track B frontend pages to Track A backend services. Replace hardcoded placeholders with dynamic data.

### C1: Wire Pages to Backend

**YOU WILL HAVE**: All pages loading real data from Supabase

#### Supabase Client — `assets/js/main.js`

  ```html
  <!-- In every HTML page <head> -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="/assets/js/main.js"></script>
  ```

  ```javascript
  // assets/js/main.js

  // Fetch config from server (auto test/live switching)
  let SUPABASE_URL, SUPABASE_ANON_KEY;

  async function initConfig() {
    try {
      const res = await fetch('/api/config');
      const config = await res.json();
      SUPABASE_URL = config.supabaseUrl;
      SUPABASE_ANON_KEY = config.supabaseAnonKey;
      window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch {
      console.error('Failed to load config');
    }
  }

  function getSupabase() {
    return window._supabase;
  }

  // CDN base URL for product images
  const R2_PUBLIC_URL = 'https://cdn.everlastingsbyemaline.com';

  function formatPrice(cents) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD'
    }).format(cents / 100);
  }

  function slugify(title) {
    return title.toLowerCase().replaceAll(' ', '-');
  }

  // --- GA4 Enhanced E-commerce Helper ---

  function buildGa4Item(product) {
    return {
      item_id: product.slug,
      item_name: product.title,
      item_brand: 'Everlastings by Emaline',
      item_category: product.product_type,
      item_category2: product.series || '',
      price: product.price / 100,
      quantity: 1
    };
  }

  // --- Meta Pixel Helper (AR #25) ---

  function trackMeta(eventName, params) {
    if (typeof fbq === 'function') {
      fbq('track', eventName, params);
    }
  }

  async function getProductBySlug(slug) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products').select('*').eq('slug', slug).single();
    if (error) { console.error('Failed to fetch product:', error.message); return null; }
    return data;
  }

  async function getProducts(options = {}) {
    const supabase = getSupabase();
    let query = supabase.from('products').select('*');
    if (options.available !== undefined) query = query.eq('available', options.available);
    if (options.featured) query = query.eq('featured', true);
    if (options.series) query = query.eq('series', options.series);
    if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    const { data, error } = await query;
    if (error) { console.error('Failed to fetch products:', error.message); return []; }
    return data;
  }

  // --- Cart (localStorage) ---

  function getCart() {
    return JSON.parse(localStorage.getItem('everlastings_cart') || '[]');
  }

  function addToCart(item) {
    const cart = getCart();
    if (cart.find(i => i.product_id === item.product_id)) return;
    cart.push(item);
    localStorage.setItem('everlastings_cart', JSON.stringify(cart));
    updateCartBadge();

    // GA4 enhanced e-commerce
    gtag('event', 'add_to_cart', {
      currency: 'USD',
      value: item.price / 100,
      items: [buildGa4Item(item)]
    });

    // Meta Pixel
    trackMeta('AddToCart', {
      content_ids: [item.slug],
      content_type: 'product',
      content_name: item.title,
      value: item.price / 100,
      currency: 'USD'
    });

    // Fire-and-forget: notify product interest trackers (AR #26)
    fetch('/api/cart-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: item.slug })
    }).catch(() => {}); // Never block cart UX
  }

  function removeFromCart(productId) {
    const item = getCart().find(i => i.product_id === productId);
    const cart = getCart().filter(i => i.product_id !== productId);
    localStorage.setItem('everlastings_cart', JSON.stringify(cart));
    updateCartBadge();
    if (item) {
      gtag('event', 'remove_from_cart', {
        currency: 'USD',
        value: item.price / 100,
        items: [buildGa4Item(item)]
      });
    }
  }

  function clearCart() { localStorage.removeItem('everlastings_cart'); }

  function getCartTotal() { return getCart().reduce((sum, item) => sum + item.price, 0); }

  function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const count = getCart().length;
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initConfig();
    updateCartBadge();
  });
  ```

  - [ ] **Create** `assets/js/main.js`

#### Product Page JS — `assets/js/product.js`

  - [ ] **Create** `assets/js/product.js` — replaces hardcoded product data with Supabase fetch
  - [ ] **Wire** Add to Cart / Buy Now buttons
  - [ ] **Wire** gallery with lightbox (click → fullscreen)
  - [ ] **Add** GA4 enhanced e-commerce: `gtag('event', 'view_item', { currency: 'USD', value: price/100, items: [buildGa4Item(product)] })`
  - [ ] **Add** Meta Pixel: `trackMeta('ViewContent', { content_ids: [slug], content_type: 'product', content_name: title, value: price/100, currency: 'USD' })`
  - [ ] **Add** related products: fetch 3-4 products from same series, render below story
  - [ ] **Wire** CTA 1 (product interest form): POST to `/api/subscribe` with `source: 'product-interest'` + insert into `product_interests` table
  - [ ] **Wire** CTA 3 (contemplation popup): 3-min timer, POST to `/api/subscribe` with `source: 'contemplation-offer'`, generate promo code
  - [ ] **Add** `video_play` event: `gtag('event', 'video_play', { slug, video_index })` when product video plays

#### Shop Grid JS — `assets/js/shop.js`

  - [ ] **Create** `assets/js/shop.js` — fetches products, renders tiles, handles filters
  - [ ] **Wire** filter sidebar to real data
  - [ ] **Wire** URL state: `?series=portals-to-peace&sort=price-asc`
  - [ ] **Replace** skeleton loaders with real content on load
  - [ ] **Add** GA4 event: `gtag('event', 'search_filter', { filter_type, filter_value })`

#### Homepage JS — `assets/js/homepage.js`

  - [ ] **Create** `assets/js/homepage.js`
  - [ ] **Fetch** featured products for carousel
  - [ ] **Fetch** theme from `site_config`
  - [ ] **Apply** dynamic CSS variables

#### Newsletter JS — `assets/js/newsletter.js`

  - [ ] **Create** `assets/js/newsletter.js` — POST to `/api/subscribe`
  - [ ] **Add** GA4 event: `gtag('event', 'newsletter_signup', { source: 'homepage' })`
  - [ ] **Add** Meta Pixel: `trackMeta('Lead', { content_name: 'Newsletter Signup' })`
  - [ ] **Wire** exit intent modal (CTA 2): detect mouse leave / visibilitychange, show if cart not empty, POST to `/api/subscribe` with `source: 'cart-exit'`

---

### C2: Checkout Flow End-to-End

**YOU WILL HAVE**: Complete purchase flow working

#### Checkout JS — `assets/js/checkout.js`

  ```javascript
  // assets/js/checkout.js

  document.addEventListener('DOMContentLoaded', async () => {
    const cart = getCart();

    if (!cart.length) {
      showCheckoutError('Your cart is empty.');
      document.getElementById('cart-summary').innerHTML =
        '<p><a href="/shop.html">Browse the shop</a></p>';
      return;
    }

    renderCartSummary(cart);

    // GA4 enhanced e-commerce
    gtag('event', 'begin_checkout', {
      currency: 'USD',
      value: getCartTotal() / 100,
      items: cart.map(item => buildGa4Item(item))
    });

    // Meta Pixel
    trackMeta('InitiateCheckout', {
      content_ids: cart.map(i => i.slug),
      content_type: 'product',
      num_items: cart.length,
      value: getCartTotal() / 100,
      currency: 'USD'
    });

    // Fetch Stripe publishable key from server
    const configRes = await fetch('/api/config');
    const config = await configRes.json();
    const stripe = Stripe(config.publishableKey);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            product_id: item.product_id,
            slug: item.slug,
            stripe_price_id: item.stripe_price_id,
          })),
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          const errData = await response.json();
          if (errData.unavailable) {
            errData.unavailable.forEach(slug => {
              const item = cart.find(i => i.slug === slug);
              if (item) removeFromCart(item.product_id);
            });
            showSoldRecovery(errData.unavailable);
          } else {
            showCheckoutError('This piece has already found its home.');
          }
        } else {
          showCheckoutError('Something went awry. Please try again.');
        }
        return;
      }

      const data = await response.json();

      const checkout = stripe.initCheckout({
        clientSecret: data.clientSecret,
        elementsOptions: {
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#4A1942',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
          },
        },
      });

      const paymentElement = checkout.createPaymentElement();
      paymentElement.mount('#payment-element');

      checkout.on('change', (session) => {
        document.getElementById('submit-btn').disabled = !session.canConfirm;
      });

      document.getElementById('checkout-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
          const actions = await checkout.loadActions();
          const result = await actions.confirm();

          if (result.type === 'error') {
            showCheckoutError(result.error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Bring This Haven Home';
          }
        } catch (err) {
          showCheckoutError('Payment could not be processed. Please try again.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Bring This Haven Home';
        }
      });
    } catch (err) {
      showCheckoutError('Unable to load checkout. Please refresh the page.');
    }
  });

  function renderCartSummary(cart) {
    const el = document.getElementById('cart-summary');
    if (!el) return;
    el.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.thumbnail}" alt="${item.title}" class="cart-thumb">
        <div>
          <strong>${item.title}</strong>
          <span>${formatPrice(item.price)}</span>
        </div>
        <button onclick="removeFromCart('${item.product_id}'); location.reload();" class="cart-remove">Remove</button>
      </div>
    `).join('') + `
      <div class="cart-total">
        <strong>Total: ${formatPrice(getCartTotal())}</strong>
      </div>
    `;
  }

  function showSoldRecovery(unavailableSlugs) {
    const popup = document.getElementById('sold-recovery-popup');
    const names = unavailableSlugs.join(', ');
    popup.innerHTML = `
      <div class="recovery-content">
        <h3>These havens have found their homes</h3>
        <p>${names} sold while you were browsing. We're sorry for the heartache.</p>
        <p>As a thank you for your interest, here's a one-time discount on your next purchase:</p>
        <form id="recovery-email-form">
          <input type="email" id="recovery-email" placeholder="Your email" required>
          <button type="submit">Send My Discount</button>
        </form>
        <button onclick="this.closest('.recovery-content').remove(); location.reload();" class="ghost-btn">
          Continue with remaining items
        </button>
      </div>
    `;
    popup.classList.remove('hidden');

    document.getElementById('recovery-email-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('recovery-email').value;
      const submitBtn = e.target.querySelector('button');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Generating...';

      try {
        const res = await fetch('/api/cart-recovery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, lost_items: unavailableSlugs }),
        });
        const data = await res.json();

        if (data.code) {
          gtag('event', 'promo_code_generated', { code: data.code });
          popup.innerHTML = `
            <div class="recovery-content">
              <h3>A small gift for your patience</h3>
              <p>Use code <strong class="promo-code">${data.code}</strong> for ${data.percent_off}% off your next purchase.</p>
              <p class="promo-expiry">Valid for ${data.expires_in_days} days.</p>
              <button onclick="location.reload();" class="primary-btn">Continue Shopping</button>
            </div>
          `;
        }
      } catch {
        popup.innerHTML = '<div class="recovery-content"><p>We\'ll be in touch. Thank you for your patience.</p></div>';
        setTimeout(() => location.reload(), 2000);
      }
    });
  }

  function showCheckoutError(message) {
    const errorEl = document.getElementById('checkout-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
  ```

#### Return Page — `complete.html`

  ```javascript
  document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) { showResult('error', 'Something went awry.'); return; }

    try {
      const response = await fetch(`/api/session-status?session_id=${sessionId}`);
      const data = await response.json();

      if (data.status === 'complete') {
        // GA4 enhanced e-commerce purchase
        gtag('event', 'purchase', {
          transaction_id: sessionId,
          currency: 'USD',
          value: (data.amount_total || 0) / 100,
          items: (data.items || []).map(item => buildGa4Item(item))
        });

        // Meta Pixel purchase (browser-side, deduped with CAPI via event_id)
        trackMeta('Purchase', {
          content_ids: (data.items || []).map(i => i.slug),
          content_type: 'product',
          value: (data.amount_total || 0) / 100,
          currency: 'USD',
          num_items: (data.items || []).length
        });

        clearCart();
        showResult('success', 'Your haven is on its way.');
      } else {
        showResult('error', 'Something went awry. Please try again.');
      }
    } catch {
      showResult('error', 'Unable to verify your order. Please check your email for confirmation.');
    }
  });

  function showResult(type, message) {
    document.getElementById('result-icon').className = type;
    document.getElementById('result-message').textContent = message;
  }
  ```

  - [ ] **Wire** checkout.html to use `api/config` for Stripe key (no hardcoded key)
  - [ ] **Start** Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook`
  - [ ] **Test** full flow: product → cart → checkout → pay → completion
  - [ ] **Verify** customer + order records created, product marked sold, cart cleared

---

### C3: SEO Finalization

  - [ ] **Add** dynamic meta titles + descriptions (product pages from Supabase data)
  - [ ] **Add** Open Graph + Twitter Card tags
  - [ ] **Add** Product schema.org structured data (JSON-LD)
  - [ ] **Create** `sitemap.xml` + `robots.txt`
  - [ ] **Submit** sitemap to Google Search Console

---

### C4: Testing + Launch Prep

**YOU WILL HAVE**: Production-ready site

#### Stripe Live Mode

Follow switchover process (see Environment Strategy section).

#### Testing

  - [ ] Cross-browser: Chrome, Safari, Firefox, Edge
  - [ ] Mobile: iPhone, iPad, Android
  - [ ] Full checkout flow: product → cart → pay → "Sold" status
  - [ ] Admin flow: login → add product → see it on shop page
  - [ ] Newsletter from homepage + footer
  - [ ] Contact form
  - [ ] All internal links

#### Performance

  - [ ] Lighthouse 90+ all categories
  - [ ] All images WebP, lazy loaded
  - [ ] WCAG AA accessibility
  - [ ] Keyboard navigation (including lightbox)
  - [ ] Alt text on every image

#### Launch

  - [ ] DNS pointed to Vercel
  - [ ] SSL active
  - [ ] Real products loaded (5-10 minimum)
  - [ ] Final review with Sean + Emy

---

## Webhook Contract

**Event**: `checkout.session.completed`

**Step-by-step flow**:

  1. **Verify signature** — `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`
     - Invalid → return 400
  2. **Check idempotency** — query `webhook_events` for `event.id`
     - Found → return `{ received: true }` (already processed, skip)
     - Not found → continue
  3. **Parse metadata** — `JSON.parse(session.metadata.items)`
     - Parse failure → log warning, return 200 (don't block Stripe retries)
     - Empty items → log warning, return 200
  4. **Upsert customer** — from `session.customer_details` (email, name, phone, shipping)
     - Email as unique key, `source: 'checkout'`
     - If email matches subscriber → update subscriber `source` to `'customer'`
  5. **For each item** in metadata:
     - Update product: `available = false, quantity = 0`
     - Insert order record with `customer_id` FK, `stripe_session_id`, `amount`
  6. **Record event** — insert `event.id` into `webhook_events` table
  7. **Return** `{ received: true }` (status 200)

**Failure modes**:
  - Invalid signature → 400 (Stripe will retry with correct signature)
  - Missing/unparseable metadata → log + return 200 (prevent infinite retry)
  - Supabase write fails → return 500 (Stripe will retry, idempotency check prevents duplicate)

---

## Cart Recovery Flow (409 Conflict)

### What Triggers It

User clicks "Pay" at checkout. The API checks availability for all cart items. One or more items have `available = false` (sold by another customer while browsing). API returns 409 with `{ error, unavailable: ['slug-1', 'slug-2'] }`.

### What the User Sees (Step by Step)

**Step 1 — Immediate**: Sold items removed from cart. A warm overlay appears:

  > **Heading**: "These havens have found their homes"
  > **Body**: "[Product Name] sold while you were browsing. We're sorry for the heartache."
  > **Offer**: "As a thank you for your interest, here's a one-time discount on your next purchase:"
  > **Email input**: placeholder "Your email"
  > **Button**: "Send My Discount"
  > **Secondary link**: "Continue with remaining items" (reloads checkout with remaining cart)

**Step 2 — After email submission**: Button shows "Generating..." while API call processes.

**Step 3 — Promo code display**:

  > **Heading**: "A small gift for your patience"
  > **Body**: "Use code **[AUTO-GENERATED-CODE]** for 10% off your next purchase."
  > **Expiry note**: "Valid for 30 days."
  > **Button**: "Continue Shopping" (navigates to /shop.html)

**Step 4**: If remaining items exist, user can dismiss overlay and proceed to checkout with remaining items.

**Step 5**: If cart is now empty, "Continue Shopping" is the only action.

### Backend Behavior

  - `POST /api/cart-recovery` creates a unique Stripe promotion code from coupon `cart-recovery-10`
  - Promotion code: max 1 redemption, expires in 30 days
  - Email captured as subscriber with `source: 'cart-recovery'`
  - If email already exists in subscribers, upsert (don't error)

### Coupon Setup (in A1)

  - Name: "Haven Finder Apology"
  - 10% off, duration once
  - Coupon ID: `cart-recovery-10`

---

## Agentic Pipeline Error Handling

Rules for AI agents creating products via `api/products.ts` and `api/upload.ts`:

  1. **Image upload failure**: Retry once. If second attempt fails, **STOP** the entire process. Do not proceed to product creation with missing images.
  2. **Product creation failure**: Do **NOT** retry blindly. Log the error, report to user. Common causes:
     - 409: slug conflict (product with that title already exists)
     - 400: missing required fields or invalid data
     - 401: wrong or missing `PRODUCT_API_KEY`
  3. **Stripe sync failure**: Handled automatically by the DB webhook. If `stripe_product_id` remains null after 30 seconds, the webhook may have failed. Check Supabase logs. Do NOT re-insert the product.
  4. **Sequential dependency**: Each step depends on the previous. Do not skip steps. Do not proceed if the current step fails.
  5. **Rollback on partial failure**: If product creation succeeds but images are incomplete, update the product to `available = false` and notify the user. Do not leave a product visible with missing images.

---

## GA4 Event Definitions (Enhanced E-commerce)

All e-commerce events use GA4's standard `items` array format, which unlocks built-in reports under Reports > Monetization (product performance, purchase funnel, revenue by category/brand).

**Automatic metrics** (zero custom code): sessions, engagement time, engagement rate (replaces bounce rate), pages per session, traffic source/medium, device, browser, geography, scroll depth, outbound clicks.

### E-commerce Events (with `items` array)

| Event              | Trigger                   | Format                                                                     |
| ------------------ | ------------------------- | -------------------------------------------------------------------------- |
| `view_item`        | Product page load         | `{ currency: 'USD', value, items: [buildGa4Item(product)] }`               |
| `add_to_cart`      | Add to Cart click         | `{ currency: 'USD', value, items: [buildGa4Item(item)] }`                  |
| `remove_from_cart` | Remove from Cart          | `{ currency: 'USD', value, items: [buildGa4Item(item)] }`                  |
| `begin_checkout`   | Checkout page load        | `{ currency: 'USD', value: cartTotal/100, items: cart.map(buildGa4Item) }` |
| `purchase`         | Completion page (success) | `{ transaction_id, currency: 'USD', value, items: [...] }`                 |

**`items` array format** (via `buildGa4Item()` helper in main.js):
```javascript
{
  item_id: product.slug,           // 'the-sunkeeper'
  item_name: product.title,        // 'The Sunkeeper'
  item_brand: 'Everlastings by Emaline',
  item_category: product.product_type,  // 'miniature'
  item_category2: product.series,       // 'Portals to Peace'
  price: product.price / 100,      // 245.00
  quantity: 1
}
```

### Custom Events (no `items` array)

| Event                  | Trigger                      | Parameters                                      |
| ---------------------- | ---------------------------- | ----------------------------------------------- |
| `newsletter_signup`    | Successful subscribe         | `{ source }` ('homepage', 'footer', 'checkout') |
| `contact_form_submit`  | Contact form success         | `{ subject }`                                   |
| `commission_inquiry`   | Commission form submit       | `{ subject }`                                   |
| `search_filter`        | Shop filter applied          | `{ filter_type, filter_value }`                 |
| `gallery_open`         | Lightbox opened              | `{ slug, image_index }`                         |
| `video_play`           | Product video starts playing | `{ slug, video_index }`                         |
| `promo_code_generated` | Cart recovery flow completed | `{ code }`                                      |
| `email_cta_capture`    | Email CTA form submitted     | `{ source, slug }`                              |

### Meta Pixel Events (fire alongside GA4)

Each GA4 e-commerce event has a Meta Pixel equivalent fired in the same code path:

| GA4 Event             | Meta Pixel Event   | Meta Parameters                                                     |
| --------------------- | ------------------ | ------------------------------------------------------------------- |
| `view_item`           | `ViewContent`      | `{ content_ids: [slug], content_type: 'product', value, currency }` |
| `add_to_cart`         | `AddToCart`        | `{ content_ids: [slug], content_type: 'product', value, currency }` |
| `begin_checkout`      | `InitiateCheckout` | `{ content_ids: [...], num_items, value, currency }`                |
| `purchase`            | `Purchase`         | `{ content_ids: [...], num_items, value, currency }` + CAPI         |
| `newsletter_signup`   | `Lead`             | `{ content_name: 'Newsletter Signup' }`                             |
| `contact_form_submit` | `Contact`          | (no params)                                                         |
| `email_cta_capture`   | `Lead`             | `{ content_name: source }`                                          |

**CAPI (server-side)**: `Purchase` events also sent from `api/webhook.ts` via Meta Conversions API for iOS/ad-blocker resilience. Deduplicated with browser pixel via `event_id = stripe_event.id`.

---

## Error States Reference

#### Product — Not Found
  - **User sees**: "This haven could not be found." + link to shop
  - **Code**: `getProductBySlug()` returns null → `showError()`

#### Product — Supabase Fetch Fails
  - **User sees**: "This haven could not be found."
  - **Code**: Supabase error → `showError()`

#### Product — Image Fails to Load
  - **User sees**: Broken image hidden, placeholder shown
  - **Code**: `onerror` handler on `<img>`

#### Product — Sold
  - **User sees**: "Sold" badge, Buy Now disabled
  - **Code**: `available === false` → button disabled

#### Checkout — Cart Empty
  - **User sees**: "Your cart is empty." + link to shop
  - **Code**: No items in localStorage

#### Checkout — Items Sold While in Cart (409)
  - **User sees**: Recovery popup — see Cart Recovery Flow section
  - **Code**: API returns 409 → `showSoldRecovery()` → remove items, capture email

#### Checkout — Session Creation Fails
  - **User sees**: "Something went awry. Please try again."
  - **Code**: API returns 500 → error message

#### Checkout — Payment Declined
  - **User sees**: Stripe error message displayed
  - **Code**: `actions.confirm()` returns error

#### Checkout — Network Error
  - **User sees**: "Unable to load checkout. Please refresh."
  - **Code**: fetch throws → catch block

#### Complete — Success
  - **User sees**: "Your haven is on its way."
  - **Code**: Session status `complete` → success state, cart cleared

#### Complete — Error
  - **User sees**: "Something went awry. Please try again."
  - **Code**: Session status not `complete` → error state

#### Shop — No Products
  - **User sees**: "New havens are being crafted. Check back soon."
  - **Code**: Empty array → empty state

#### Shop — No Filter Results
  - **User sees**: "No havens match your search."
  - **Code**: Filtered array empty → message

#### Newsletter — Already Subscribed
  - **User sees**: "You're already part of the Firelight Council."
  - **Code**: 23505 unique constraint → friendly message

#### Newsletter — Invalid Email
  - **User sees**: "Valid email required"
  - **Code**: Client + server validation

#### Admin — Not Authenticated
  - **User sees**: Redirect to login
  - **Code**: Supabase auth check

#### Admin — Upload Too Large
  - **User sees**: "File must be under 10MB" (50MB for videos)
  - **Code**: File size check before upload

---

## Slug Rules

  - **Generation**: `title.toLowerCase().replaceAll(' ', '-')` (AR #23)
  - **Example**: "The Sunkeeper" → `the-sunkeeper`
  - **Immutable**: once created, slug never changes (URL stability, SEO, R2 path depends on it)
  - **URL pattern**: `/product/the-sunkeeper`
  - **R2 path**: `/products/the-sunkeeper/hero-the-sunkeeper.webp`
  - **When generated**: API-side (by `api/products.ts` or AI agent) BEFORE image upload
  - **DB trigger**: Fallback only — fires if slug is NULL/empty on INSERT (manual Supabase Studio inserts)
  - **Uniqueness**: Enforced by database unique constraint. API returns 409 on conflict.

---

## Image Pipeline (Cloudinary → R2)

### Naming Convention

  ```
  /products/{slug}/hero-{slug}.webp           → main product image
  /products/{slug}/gallery-{slug}-01.webp     → gallery images (up to 15)
  /products/{slug}/thumbnail-{slug}.webp      → grid thumbnail (smaller)
  /products/{slug}/video-{slug}-01.mp4        → videos (skip Cloudinary)
  /products/{slug}/detail-{slug}-01.gif       → GIFs (skip Cloudinary)
  ```

### Cloudinary Transform Parameters

**Product photos**: `c_fill,ar_4:5,w_1200,f_webp,q_auto,g_auto`
**Thumbnails**: `c_fill,ar_4:5,w_600,f_webp,q_auto,g_auto`

### Pipeline Steps

  1. Upload raw image to Cloudinary via Upload API
  2. Construct transform URL with params above
  3. Download transformed image (WebP, 4:5, compressed)
  4. Upload to R2 with SEO-friendly filename (`hero-{slug}.webp`)
  5. Delete from Cloudinary (stay on free tier)
  6. Store CDN URL in product record

Videos and GIFs skip Cloudinary — upload directly to R2.

---

## Deferred Items (Post-Launch)

  - **Dark mode** — v0 docs mentioned dark mode variables. Not needed for v1.
  - **Infinite scroll/pagination** — small catalog (<50 products), standard grid is fine.
  - **Section-specific hero images** — shop page hero. Defer to post-launch.
  - **Dynamic shipping rates** — v0 has Stripe dynamic shipping for `ui_mode: embedded`. Doesn't apply to `custom`. For v1: flat-rate or shipping-included pricing.
  - **Google Drive API integration** — for AI product creation. v1 uses manual download from shared folder.
  - **Abandoned cart emails** — requires email service (Resend, SendGrid). Note as post-launch.
  - **Customer accounts** — no login for shoppers. Purchase is anonymous with email/address captured.

---

## Caching Strategy (Deferred)

Not needed for launch. When needed:
  - Supabase queries hit DB directly (acceptable at < 100 products)
  - Product images already CDN-cached by Cloudflare R2
  - Add `stale-while-revalidate` headers or Vercel Edge Config when scale requires

---

## Post-Launch — 30 days included

  - Bug fixes and technical support
  - Performance optimization
  - Content update assistance

---

## Reference Documents

| Document         | Location                                          | Use                                 |
| ---------------- | ------------------------------------------------- | ----------------------------------- |
| Architecture     | `assets/docs/EVERLASTINGS_STORE.md`               | Full technical reference            |
| Brand Guide      | `assets/docs/BRAND.md`                            | Colors, fonts, voice, copy          |
| Product Protocol | `assets/docs/PRODUCT_PROTOCOL.md`                 | Client guide + AI creation protocol |
| Action Steps     | `assets/docs/archive/v1_3/v1_3_1_ACTION_STEPS.md` | Checklist version of this doc       |
| Dev Rules        | `.agent/DEV_RULES.md`                             | Git branching, dev protocols        |

---
*Every code snippet should be production-ready. Double check all code, leave no placeholders, only production-ready code. Every checkbox is one action. Track A and B can proceed in parallel to iterate on visual design while development continues on backend functionality. Track C integrates them.*