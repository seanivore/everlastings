# v1.4.3 Track A — Foundation + Backend Implementation Guide

## Track Goal

Deliver the complete backend foundation for Everlastings v1.4.3: verify the Phase 0 services bootstrap (Vercel, Supabase, Cloudflare R2, Cloudinary, Stripe, Resend, Shippo, Meta, Analytics), apply the Supabase schema and RLS policies for all 8 tables, ship every one of the 14 server-side API endpoints (config, stripe-sync, checkout/reserve, checkout, session-status, webhook, cart-recovery, products, upload, subscribe, contact, cart-activity, product-feed, orders + orders/[id]), build the admin UI with Products and Orders tabs, finalize the Product Protocol + Custom GPT workflow, and run the full integration test sweep. Track B (frontend design) runs in parallel against placeholder content; Track C (integration) starts after Track A is done and Track B has produced placeholder pages.

## Pre-loaded Context (Do Not Re-Read)

The orchestrator session already has these files in context. Do not re-read them:
- `assets/docs/EVERLASTINGS_STORE.md` — architectural primer
- `.agent/DEV_RULES.md` — workflow protocol
- `.agent/AGENTS.md` — agent instructions
- `.claude/CLAUDE.md` — project instructions

## Do Not Explore

This track is backend-only. Do NOT read or modify:
- `assets/css/**` (Track B owns design)
- `assets/js/main.js`, `assets/js/cart.js`, `assets/js/product.js`, `assets/js/shop.js`, `assets/js/homepage.js`, `assets/js/newsletter.js` (Track C owns wiring)
- `*.html` files except `admin/index.html` (Track B/C own user-facing pages)
- `assets/docs/BRAND.md` (frontend concern only)

If exploration is needed beyond the API + admin layer, stop and ask.

## Other Tracks at a Glance

**Track B (parallel):** Frontend design — produces design system CSS, header/footer/nav, product/shop/homepage pages with hardcoded placeholder content marked `<!-- PLACEHOLDER: ... -->`. Does not touch your code.

**Track C (after A+B):** Integration — wires Track B's placeholders to your API endpoints, implements full checkout flow. Will consume your API contracts exactly as specified in this guide; do not change them without flagging.

## Subagent Delegation Strategy

Effort is set to extra-high; conserve context by delegating aggressively:
- **A1 services setup**: mostly already done in Phase 0. Use bash to verify, do not re-execute.
- **A2 API endpoints (14 total)**: each endpoint's section is independently scoped. Delegate each major endpoint (`webhook.ts`, `products.ts`, `checkout.ts`, etc.) to a coding subagent with the relevant section as the spec.
- **A3 Admin UI + Product Protocol**: one subagent.
- **A4 Integration testing**: one subagent.

When delegating, give the subagent only its section + the shared API helpers section (A2 first subsection). Do not pass the whole guide.

## Verification Gate (Done Means)

- [ ] All 14 API endpoints respond correctly to smoke tests (see A4)
- [ ] Webhook contract test passes (Stripe CLI replay)
- [ ] Admin UI loads at `/admin` and CRUD on products works
- [ ] Product Protocol curl test from `assets/docs/PRODUCT_PROTOCOL.md` returns 200
- [ ] Integration tests in A4 all green
- [ ] Branch `dev` has clean commit history per `DEV_RULES.md` conventions

## Branch + Commit Policy

- Work on branch `dev`
- Small commits per logical unit (one endpoint per commit, one config per commit)
- Follow commit message standards in `DEV_RULES.md`
- Do NOT merge to `main` — that's release-time only
- Push to `dev` after each milestone (A1, A2 grouped, A3, A4) to keep preview deployment alive

---

## TRACK A: Foundation + Backend

Track A builds the backend: services wired up, database tables live, API endpoints shipped, admin UI functional.

### A1: Services Setup

A1 assumes Phase 0 is complete (all accounts created, env vars loaded) by verifying each service is correctly wired and completes any agent-side configuration that depends on those services.

**YOU WILL HAVE**: All services connected, tables created, env vars set, analytics base installed

#### Vercel

  - [ ] (SEAN) **Add** custom domain `everlastingsbyemaline.com` to the Vercel project (Settings > Domains)
  - [ ] (AGENT) **Push** to trigger a Vercel deploy and verify it loads without error

### Reference: Environment Strategy

#### Where Secrets Live

> These live in 3 distinct locations, each with a specific purpose.

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

#### Environment Variable Table

Vercel Dashboard → Settings → Environment Variables. Each var scoped by environment.

| Variable                   | Production                            | Preview + Development   |
| -------------------------- | ------------------------------------- | ----------------------- |
| `STRIPE_SECRET_KEY`        | `sk_live_...`                         | `sk_test_...`           |
| `STRIPE_PUBLISHABLE_KEY`   | `pk_live_...`                         | `pk_test_...`           |
| `STRIPE_WEBHOOK_SECRET`    | live signing secret                   | test signing secret     |
| `SUPABASE_URL`             | same                                  | same                    |
| `SUPABASE_PUBLISHABLE_KEY` | same                                  | same                    |
| `SUPABASE_SECRET_KEY`      | same                                  | same                    |
| `PRODUCT_API_KEY`          | random 64-char string                 | different random string |
| `R2_ACCOUNT_ID`            | same                                  | same                    |
| `R2_ACCESS_KEY_ID`         | same                                  | same                    |
| `R2_SECRET_ACCESS_KEY`     | same                                  | same                    |
| `R2_BUCKET_NAME`           | same                                  | same                    |
| `R2_PUBLIC_URL`            | same                                  | same                    |
| `CLOUDINARY_URL`           | same                                  | same                    |
| `META_PIXEL_ID`            | same                                  | same                    |
| `META_ACCESS_TOKEN`        | same                                  | same                    |
| `RESEND_API_KEY`           | same                                  | same                    |
| `RESEND_FROM_EMAIL`        | `sunkeeper@everlastingsbyemaline.com` | same                    |

**Frontend Stripe key**: NOT hardcoded. Served via `api/config.ts` — returns correct key per environment.
**Resend**: single API key for both environments (free tier 3k/mo). Uses same verified domain.
**Shippo**: no API key in v1 — Emy uses Shippo's web UI. Post-launch when we build label automation, add `SHIPPO_API_KEY`.

#### Live Launch Switchover Process

  1. All development on `dev` with test keys (auto-configured)
  2. Test full purchase flow on preview URL with card `4242 4242 4242 4242`
  3. Set live keys for Production scope in Vercel Dashboard
  4. Create live webhook endpoint in Stripe Dashboard → production URL
  5. Set live `STRIPE_WEBHOOK_SECRET` for Production scope
  6. Enable receipt emails: Stripe Dashboard → Settings → Emails → Successful payments
  7. Merge `dev` → `main` → production deploys with live keys
  8. Test one real transaction (refund after)

---

#### Git Branches

  - [ ] (AGENT) **Verify** Vercel auto-deploys `main` → Production and all other branches → `Preview`

#### Supabase

Table creation (all 8 tables) is done in Phase 0 > Agent bootstrap via Supabase CLI `supabase db push` (preferred), Studio SQL editor, or MCP `apply_migration` as fallback. The RLS block below is the canonical policy SQL — apply it as part of the same migration.

> **v1 auth scope — intentional**: policies gate by `authenticated` role (any logged-in Supabase user), not by individual user or per-user role. All three invited admins (`admin@`, `sean@`, `emyh@`) have identical read/write/delete permissions across products, orders, customers, subscribers. This is acceptable for v1 because the admin set is small, trusted, and fixed. **v1.1 upgrade path** when Emy hires a helper or adds a second brand: add a `user_roles` table (user_id → role enum) and rewrite the policies to check `auth.jwt() ->> 'role'` instead of just `authenticated`. Do not add this complexity before v1 needs it.

> **Dev/test data isolation**: production and dev/preview share the same Supabase project. To keep the boundary clean, every transactional table gets an `is_test` boolean column (see Reference: Product Schema below, and Reference: Dev/Test Data Hygiene §3 below). Server-side INSERTs set `is_test` from `process.env.VERCEL_ENV`; production-facing reads filter `WHERE is_test = false`.

### Reference: Dev/Test Data Hygiene §3 — Supabase `is_test` flag

Add `is_test BOOLEAN NOT NULL DEFAULT FALSE` to all transactional tables: `products`, `customers`, `orders`, `subscribers`, `product_interests`, `cart_holds`. Skip `site_config` (singleton) and `webhook_events` (Stripe-id keyed). Server-side helper sets it from `process.env.VERCEL_ENV`:

```typescript
// api/_lib/env.ts
export const isTest = process.env.VERCEL_ENV !== 'production';
```

Every INSERT in an `api/*.ts` endpoint passes `is_test: isTest`. Production-facing reads (shop grid, product page, admin orders list) filter `WHERE is_test = false`. Cleanup before launch is one statement per table: `DELETE FROM products WHERE is_test = true;`.

### Reference: Product Schema Hard Reference

Migrations are applied in Phase 0 > Agent bootstrap and again verified here in A1 Supabase.

#### TypeScript Interface

These are for API functions.

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
  is_test: boolean;              // dev/preview rows = true; production reads filter is_test = false
  created_at: string;            // timestamptz, auto
  updated_at: string;            // timestamptz, auto
}
```

#### Supabase SQL

These are the 8 tables to be created.

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
-- orders table includes shipping columns (AR #30)
CREATE TABLE orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id text NOT NULL,
  stripe_payment_intent text,
  product_id uuid REFERENCES products(id),
  customer_id uuid REFERENCES customers(id),
  customer_email text,
  amount integer,
  status text DEFAULT 'completed',  -- 'completed' | 'shipped' | 'delivered' | 'refunded'
  shipping_address jsonb,
  tracking_number text,
  tracking_carrier text,            -- 'USPS' | 'UPS' | 'FedEx' | 'DHL'
  shipped_at timestamptz,            -- when Emy clicked "Mark as shipped"
  tracking_email_sent_at timestamptz, -- when Resend accepted the tracking email (audit trail). NULL = send failed; admin UI exposes a "Resend tracking email" button in that case
  delivered_at timestamptz,          -- post-launch, via Shippo webhook
  created_at timestamptz DEFAULT now()
);

-- Fast lookup of unshipped orders for admin queue
CREATE INDEX idx_orders_needs_shipping ON orders (created_at DESC)
  WHERE shipped_at IS NULL AND status = 'completed';
```

```sql
-- subscribers table includes promo code tracking (AR #31)
CREATE TABLE subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  source text DEFAULT 'footer',
  promo_code text,                     -- dynamic Stripe promotion code for newsletter welcome / contemplation CTA
  promo_code_expires_at timestamptz,
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

```sql
-- Cart holds: soft reservations during checkout flow (AR #28, #29)
-- Prevents UX shock of "sold while entering payment" without hard-reserving items
CREATE TABLE cart_holds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for efficient availability lookups (AR #28)
CREATE INDEX idx_cart_holds_product_active ON cart_holds (product_id, expires_at);
```

```sql
-- is_test flag for dev/preview data isolation. See Dev/Test Data Hygiene Reference.
-- All transactional tables get the column. Non-transactional tables (site_config, webhook_events) skip it.
ALTER TABLE products          ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE customers         ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE orders            ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE subscribers       ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE product_interests ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE cart_holds        ADD COLUMN is_test boolean NOT NULL DEFAULT false;

-- Partial indexes so production reads (is_test = false) stay fast on a mixed-data table.
CREATE INDEX idx_products_live    ON products (created_at DESC) WHERE is_test = false;
CREATE INDEX idx_subscribers_live ON subscribers (email)        WHERE is_test = false;
```

> Production-facing reads (shop grid, product page, admin orders list) MUST filter `WHERE is_test = false`. The Product TypeScript interface above gains `is_test: boolean;` — server-side INSERTs set it from the `isTest` helper in `api/_lib/env.ts`.

---

  - [ ] (SEAN) **Verify** admin users invited in Supabase Auth > Users (covered in Phase 0 — this is a sanity check)
  - [ ] (AGENT) **Enable** RLS on all 8 tables (apply as part of the Phase 0 migration, or as a follow-up migration):

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

-- CART_HOLDS: service role only (all access through api/checkout/reserve.ts)
ALTER TABLE cart_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage cart holds"
  ON cart_holds FOR ALL TO service_role USING (true) WITH CHECK (true);
```

  - [ ] (AGENT) **Verify** Database Webhook configured and fires on `products` INSERT (covered in Phase 0 — tail logs or insert a test product)

#### Cloudflare R2

Complete from Phase 0: bucket created, public access enabled, custom domain connected via R2 > Settings > Public access > Custom Domains > Connect Domain (Cloudflare auto-creates the CNAME since the domain is on Cloudflare DNS). Status must read Active before continuing.

  - [ ] (AGENT) **Verify** DNS resolution: `dig cdn.everlastingsbyemaline.com` returns the R2 CNAME target
  - [ ] (AGENT) **Set** `R2_PUBLIC_URL=https://cdn.everlastingsbyemaline.com` in Vercel env vars (all environments)
  - [ ] (AGENT) **Set** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME=everlastings` in Vercel env vars
  - **No custom dev subdomain needed for the CDN** — Vercel's auto-generated `*.vercel.app` preview URLs serve as the dev environment. The R2 bucket and `cdn.everlastingsbyemaline.com` CDN are shared across environments; preview/dev uploads namespace under a `test/` path prefix to keep them visibly separate.

#### Cloudinary

> Covered in Phase 0 — `CLOUDINARY_URL` is already in Vercel env vars. If you skipped that step, do it now; otherwise proceed.

#### Stripe

> **Coupon strategy** (see the Coupon + Promotion Code Strategy reference inlined in `api/stripe-sync.ts` section below for the full rationale): we create 2 base coupons once via an idempotent bootstrap script, then generate unique single-use **promotion codes** per user event (409, newsletter signup). No Sean-does-it-in-dashboard step — removing a manual click that's easy to forget or misconfigure.

  - [ ] (AGENT) **Create** `api/_bootstrap/coupons.ts` — idempotent Stripe coupon bootstrap:

    ```typescript
    // api/_bootstrap/coupons.ts
    // Creates the two base coupons. Safe to run multiple times (409 on duplicate is caught).
    import Stripe from 'stripe';
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const COUPONS = [
      { id: 'cart-recovery-10',     name: 'Haven Finder Apology',             percent_off: 10 },
      { id: 'newsletter-welcome-5', name: 'Welcome to the Firelight Council', percent_off: 5  },
    ];

    export async function bootstrapCoupons() {
      for (const c of COUPONS) {
        try {
          await stripe.coupons.create({
            id: c.id,
            name: c.name,
            percent_off: c.percent_off,
            duration: 'forever',  // Correct for one-time payments. `once` is a subscription concept.
            // max_redemptions intentionally omitted — promotion codes carry the single-use limit.
          });
          console.log(`Created coupon: ${c.id}`);
        } catch (err: any) {
          if (err.code === 'resource_already_exists') {
            console.log(`Coupon already exists, skipping: ${c.id}`);
          } else {
            throw err;
          }
        }
      }
    }

    // Run as: npx tsx api/_bootstrap/coupons.ts
    if (require.main === module) bootstrapCoupons().catch(console.error);
    ```

  - [ ] (AGENT) **Run** `npx tsx api/_bootstrap/coupons.ts` once for **test mode** — verify both coupons exist in Stripe Dashboard > Products > Coupons
  - [ ] (AGENT) **Create** test webhook endpoint via Stripe CLI or MCP → pinned to the `dev` branch's preview URL (e.g. `https://everlastings-git-dev-{team}.vercel.app/api/webhook`) with event `checkout.session.completed`. Do not register a separate Stripe endpoint per `feat/*` branch — use `stripe listen --forward-to {feat-preview-url}/api/webhook` for ad-hoc feature testing. Full convention is inlined under `api/webhook.ts` below.
  - [ ] (AGENT) At launch switchover: re-run the bootstrap with `STRIPE_SECRET_KEY=sk_live_...` to populate coupons in live mode
  - [ ] (SEAN) Receipt emails were toggled ON in Phase 0 — no further action here

#### Resend (Transactional Email)

From AR #30, #31 — Resend handles three email types: shipping tracking, newsletter welcome (optional coupon), cart recovery (coupon delivery).

  - [ ] (SEAN) Account created in Phase 0. API key retrieved from Dashboard > API Keys
  - [ ] (SEAN) Domain `everlastingsbyemaline.com` verified for sending (Resend provides DNS records — add to Cloudflare DNS)
  - [ ] (AGENT) **Set** `RESEND_API_KEY` and `RESEND_FROM_EMAIL=sunkeeper@everlastingsbyemaline.com` in Vercel env vars

#### Shippo (Shipping Labels)

> v1 uses Shippo's web UI only — no API integration. Emy pastes Shippo-generated tracking numbers into the admin UI. Post-launch upgrade: direct Shippo API for label creation from admin.

  - [ ] (SEAN) Shippo Starter account already created in Phase 0 (free, 30 labels/month covers expected volume)
  - [ ] (SEAN) USPS account linked inside Shippo (automatic, no fee)

#### Meta Pixel + Instagram Shopping

From AR #25, #27.

> Meta Pixel ID, Access Token, and env vars are all set in Phase 0. A1 adds only Emy's IG Shopping workflow below.

  - [ ] (SEAN+EMY) **Coordinate with Emy** on Instagram Shopping prerequisites. These steps happen in Emy's own Meta accounts; Sean is a delegate (already added to her Meta Business account) and unblocks her on DNS + infra. Emy drives the rest:
    1. (EMY) Instagram account converted to Business profile
    2. (EMY) IG profile connected to a Facebook Page
    3. (EMY) Meta Business Manager with FB Page claimed
    4. (EMY) Commerce Manager: create catalog (type: E-commerce)
    5. (SEAN+EMY) Domain verification: Sean adds the DNS TXT record in Cloudflare; Emy confirms verification inside Meta
    6. (EMY) Submit shop for Commerce review (1-2 weeks — can happen in parallel with build)
    7. (EMY) After approval: product tagging available in Instagram app

#### Analytics

> GA4 property creation + Search Console verification + Measurement ID noting are all in Phase 0.

  - [ ] (AGENT) **Confirm** the Measurement ID is recorded (used in Track B1 GA4 script-tag snippet)

#### Config Files

> All config-file creation, env-var loading, `npm install`, and `vercel dev` verification are done in Phase 0 > Agent bootstrap. No A1 work remaining here.

### Reference: Configuration Files

These files must be created as actual files in the repository root. Copy the contents below into each file.

#### `vercel.json`

```json
{
  "rewrites": [
    { "source": "/product/:slug", "destination": "/product.html" },
    { "source": "/admin/:path*", "destination": "/admin/index.html" }
  ]
}
```

**Note**: CORS is intentionally NOT set as a static header here — `vercel.json` cannot do origin allowlisting (it would require either a single hardcoded origin, which breaks `*.vercel.app` previews, or `*`, which is unsafe). All `api/*.ts` endpoints handle CORS dynamically via the shared helper at `api/_lib/cors.ts` — see Shared API helpers below.

#### `tsconfig.json`

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

#### `package.json`

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

#### `.env.example`

```bash
# Supabase (new Nov-2025 key format — replaces legacy anon/service_role)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...  # frontend-safe, RLS-enforced
SUPABASE_SECRET_KEY=sb_secret_...            # backend only, bypasses RLS

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

# Resend (transactional email — tracking, cart recovery coupons, newsletter welcome) — AR #30, #31
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=sunkeeper@everlastingsbyemaline.com
```

---

### A2: API Endpoints

> **ACTION — (AGENT) only.**
> All endpoints are code. Zero Sean dashboard work in A2 — every secret it depends on was loaded in Phase 0.

**YOU WILL HAVE**: All server-side endpoints working, testable with curl

#### Shared API helpers — `api/_lib/`

> Every endpoint imports these. Implements the conventions defined in the Dev/Test Data Hygiene reference inlined below.

### Reference: Dev/Test Data Hygiene §1 — CORS allowlist (the reason previews load at all)

`vercel.json` static CORS headers cannot do origin allowlisting (no wildcard support without exposing `*` to the world). All `api/*.ts` endpoints share a CORS helper that reads the request `Origin` header, matches it against an allowlist, and reflects it back in `Access-Control-Allow-Origin`. The helper lives at `api/_lib/cors.ts` and is imported by every endpoint (see Config — `api/config.ts` for the pattern).

Allowlist:
- `https://everlastingsbyemaline.com` (production)
- `https://*.vercel.app` (any preview from this Vercel project — pattern-matched, not literal)
- `http://localhost:3000` (local `vercel dev`)

If this is wrong, every fetch from a `*.vercel.app` preview is blocked by the browser and the page appears broken even though the API works in curl.

### Reference: Source of Truth Hierarchy

Cited from `api/stripe-sync.ts`, `api/webhook.ts`, and `api/products.ts`.

  1. **Supabase** — authoritative product data, customer records, orders, site config
  2. **Stripe** — payment mirror only. Created from Supabase data via webhook, never manually edited
  3. **Cloudflare R2** — asset storage only. URLs referenced from Supabase product records
  4. **Frontend** — read-only consumer. Fetches from Supabase, never writes directly

When in doubt about product data, trust Supabase. Stripe reflects Supabase, not the other way around.

---

  ```typescript
  // api/_lib/env.ts
  // Single source of truth for "are we in production?" — drives is_test flag and R2 path namespacing.
  export const isTest = process.env.VERCEL_ENV !== 'production';
  ```

  ```typescript
  // api/_lib/cors.ts
  // Reflects request Origin if it matches the allowlist; otherwise omits the header (browser blocks).
  // Wildcard *.vercel.app is matched as a pattern, not echoed literally.
  const ALLOWED = [
    /^https:\/\/everlastingsbyemaline\.com$/,
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
    /^http:\/\/localhost:3000$/,
  ];

  export function corsHeaders(req: Request): HeadersInit {
    const origin = req.headers.get('origin') ?? '';
    const allowed = ALLOWED.some((re) => re.test(origin));
    return {
      ...(allowed ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, stripe-signature',
      'Access-Control-Max-Age': '86400',
    };
  }

  export function preflight(req: Request): Response | null {
    if (req.method !== 'OPTIONS') return null;
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  ```

  - [ ] (AGENT) **Create** `api/_lib/env.ts` and `api/_lib/cors.ts` with the code above
  - [ ] (AGENT) Every `api/*.ts` endpoint must: (1) call `preflight(req)` first and return early if non-null, (2) include `corsHeaders(req)` on every response

#### Config — `api/config.ts`

Returns environment-appropriate public configuration. Enables automatic test/live Stripe key switching.

> **Security note**: This endpoint serves ONLY public keys — Stripe publishable key (`pk_*`), Supabase URL, and Supabase publishable key (`sb_publishable_*`). These are designed to be public (Stripe publishable keys are meant for client-side use; Supabase publishable keys are protected by RLS). No secrets are exposed. This endpoint requires no authentication. (AR #15)

  ```typescript
  // api/config.ts
  import { corsHeaders, preflight } from './_lib/cors';

  export async function GET(req: Request) {
    return Response.json(
      {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        supabaseUrl: process.env.SUPABASE_URL,
        supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
        metaPixelId: process.env.META_PIXEL_ID || null,
      },
      { headers: corsHeaders(req) },
    );
  }

  export async function OPTIONS(req: Request) {
    return preflight(req)!;
  }
  ```

  - [ ] (AGENT) **Create** `api/config.ts` with the code above

#### Stripe Sync — `api/stripe-sync.ts`

Called by Supabase Database Webhook when a product is inserted. See Stripe Sync Rules section below.

### Reference: Stripe Sync Rules

Defines exactly how Supabase state flows into Stripe. Implementation lives in `api/stripe-sync.ts` (this section) and `api/products.ts > PUT` (below).

  - On product **INSERT** → create Stripe Product + Price (via `api/stripe-sync.ts`)
  - On **price change** → archive old Stripe Price (`active: false`), create new Price, update `stripe_price_id` in Supabase
  - On **title/image/description change** → DO NOTHING in Stripe (Stripe is a payment mirror, not source of truth)
  - Never UPDATE a Stripe Price (they are immutable). Always archive + create new
  - Never manually create Stripe Products/Prices in Dashboard. The database webhook handles all creation

### Reference: Coupon + Promotion Code Strategy

The v1.3.1 doc mixed up Stripe's subscription-centric coupon `duration` setting with one-time-payment code mechanics. Here's the corrected, full strategy.

**The core rule**: A Stripe **coupon** is the discount RULE. A Stripe **promotion code** is a single-use redemption of that rule. We never expose the coupon ID to customers — we generate unique promotion codes per event.

**The two coupons** (created once at setup by `api/_bootstrap/coupons.ts` — see A1 Stripe):

| Purpose | Coupon ID              | Name                             | Discount | Duration    | Max redemptions |
| ------- | ---------------------- | -------------------------------- | -------- | ----------- | --------------- |
| 1       | `cart-recovery-10`     | Haven Finder Apology             | 10% off  | **Forever** | **BLANK**       |
| 2       | `newsletter-welcome-5` | Welcome to the Firelight Council | 5% off   | **Forever** | **BLANK**       |

  1. for *Dynamic promotion codes per 409 recovery*
  2. for *Dynamic promotion codes per contemplation-offer signup*

Both use `Duration: Forever` because that's the correct setting for one-time payments (`once` is a subscription concept — it means "one billing cycle", which is meaningless for us). Both have **blank max_redemptions** because capping the coupon globally would ruin us — we want every user event to generate its OWN unique code.

**Per-event code generation**:

  ```typescript
  // Example: cart-recovery (api/cart-recovery.ts)
  const promoCode = await stripe.promotionCodes.create({
    coupon: 'cart-recovery-10',
    max_redemptions: 1,                             // single-use
    expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),  // 30 days
    metadata: { source: 'cart-recovery', email, lost_items: JSON.stringify(lost_items) },
  });
  // promoCode.code → e.g. 'HAVEN-A9X2P7'
  ```

Store the generated code in the relevant table:
  - Cart-recovery: stored in Stripe metadata + linked via email in `subscribers`
  - Newsletter welcome: stored in `subscribers.promo_code` + `subscribers.promo_code_expires_at`

**Email delivery** (Resend):
  - Cart recovery coupon: `api/cart-recovery.ts` sends email with the code after generating
  - Newsletter welcome with coupon (only from `contemplation-offer` source): `api/subscribe.ts` generates a code, saves it, and emails a welcome email that contains the code
  - Other newsletter sources (footer, homepage, checkout-started) get a welcome email WITHOUT a code — they're opting in, not being offered an apology/incentive

**What NOT to do**:
  - Setting `max_redemptions` on the coupon itself (caps total redemptions globally)
  - Handing out the coupon ID directly (`cart-recovery-10`) as the code
  - Using `Duration: Once` (subscription concept; has no effect on payment intents)

---

  ```typescript
  // api/stripe-sync.ts
  import Stripe from 'stripe';
  import { createClient } from '@supabase/supabase-js';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
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

  - [ ] (AGENT) **Create** `api/stripe-sync.ts`

#### Reserve — `api/checkout/reserve.ts` (NEW — AR #28, #29)

Called when user clicks `[CHECKOUT]` on `/cart.html`. Runs the availability check BEFORE the user enters any payment/shipping PII. On success, creates 15-minute soft holds and captures the optional email/name as a subscriber.

  ```typescript
  // api/checkout/reserve.ts
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const HOLD_TTL_MINUTES = 15;

  interface CartItem { product_id: string; slug: string; }

  export async function POST(request: Request) {
    try {
      const { items, session_id, email, name } = await request.json() as {
        items: CartItem[];
        session_id: string;    // browser-generated UUID stored in localStorage
        email?: string;
        name?: string;
      };

      if (!items?.length || !session_id) {
        return Response.json({ error: 'Missing items or session_id' }, { status: 400 });
      }

      // Opportunistically upsert subscriber so we capture email even if user bails
      if (email && email.includes('@')) {
        await supabase
          .from('subscribers')
          .upsert({ email, source: 'checkout-started' }, { onConflict: 'email' });
      }

      // Availability check: product must be available AND not held by another session
      const productIds = items.map(i => i.product_id);
      const nowIso = new Date().toISOString();

      const { data: products } = await supabase
        .from('products')
        .select('id, slug, available, quantity')
        .in('id', productIds);

      const { data: activeHolds } = await supabase
        .from('cart_holds')
        .select('product_id, session_id')
        .in('product_id', productIds)
        .gt('expires_at', nowIso);

      const unavailable = items.filter(item => {
        const product = products?.find(p => p.id === item.product_id);
        if (!product || !product.available || product.quantity < 1) return true;
        const conflictingHold = activeHolds?.find(
          h => h.product_id === item.product_id && h.session_id !== session_id
        );
        return !!conflictingHold;
      });

      if (unavailable.length > 0) {
        // Fetch related products for the recovery UX (item 9)
        const { data: related } = await supabase
          .from('products')
          .select('slug, title, price, thumbnail, thumbnail_alt, series, product_type')
          .eq('available', true)
          .limit(3);

        return Response.json({
          error: 'Some items are no longer available',
          unavailable: unavailable.map(i => i.slug),
          related: related || [],
        }, { status: 409 });
      }

      // Create or refresh holds (upsert by session_id + product_id)
      const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000).toISOString();
      const holdRows = items.map(i => ({
        session_id,
        product_id: i.product_id,
        expires_at: expiresAt,
      }));

      // Delete existing holds for this session+products, then insert fresh
      await supabase
        .from('cart_holds')
        .delete()
        .eq('session_id', session_id)
        .in('product_id', productIds);

      await supabase.from('cart_holds').insert(holdRows);

      return Response.json({
        ok: true,
        expires_at: expiresAt,
        customer_prefill: { email: email || null, name: name || null },
      });
    } catch (err) {
      console.error('Reserve error:', err);
      return Response.json({ error: 'Failed to reserve cart' }, { status: 500 });
    }
  }
  ```

  - [ ] (AGENT) **Create** `api/checkout/reserve.ts`

#### Checkout — `api/checkout.ts`

Called AFTER `/api/checkout/reserve` succeeded. Creates the Stripe Checkout Session with `ui_mode: 'custom'`. Rechecks the hold is still valid (cheap defensive check; the reserve endpoint already confirmed availability).

  ```typescript
  // api/checkout.ts
  import Stripe from 'stripe';
  import { createClient } from '@supabase/supabase-js';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  interface CartItem {
    product_id: string;
    slug: string;
    stripe_price_id: string;
  }

  export async function POST(request: Request) {
    try {
      const { items, session_id, email, name } = await request.json() as {
        items: CartItem[];
        session_id: string;
        email?: string;
        name?: string;
      };

      if (!items?.length || !session_id) {
        return Response.json({ error: 'Cart is empty or session missing' }, { status: 400 });
      }

      // Defensive: verify the hold is still active for all items in this session
      const productIds = items.map(i => i.product_id);
      const nowIso = new Date().toISOString();
      const { data: holds } = await supabase
        .from('cart_holds')
        .select('product_id')
        .eq('session_id', session_id)
        .in('product_id', productIds)
        .gt('expires_at', nowIso);

      const heldIds = new Set((holds || []).map(h => h.product_id));
      const missingHolds = productIds.filter(id => !heldIds.has(id));

      if (missingHolds.length > 0) {
        return Response.json({
          error: 'Your reservation expired. Please return to cart to re-check availability.',
          expired: true,
        }, { status: 410 });  // 410 Gone — distinct from 409 so client shows the right message
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
        customer_email: email,                    // prefills Stripe Elements
        metadata: { items: JSON.stringify(itemsMeta), hold_session_id: session_id },
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

  - [ ] (AGENT) **Create** `api/checkout.ts`

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

  - [ ] (AGENT) **Create** `api/session-status.ts`

#### Webhook — `api/webhook.ts`

Handles `checkout.session.completed`. See Webhook Contract section below for the full flow.

### Reference: Dev/Test Data Hygiene §5 — Stripe webhook endpoint pinning

Two webhook endpoints exist in Stripe Dashboard simultaneously:

| Mode | URL                                                          | Secret env var                             |
| ---- | ------------------------------------------------------------ | ------------------------------------------ |
| Live | `https://everlastingsbyemaline.com/api/webhook`              | `STRIPE_WEBHOOK_SECRET` (Production scope) |
| Test | `https://everlastings-git-dev-{team}.vercel.app/api/webhook` | `STRIPE_WEBHOOK_SECRET` (Preview scope)    |

The test webhook is **pinned to the `dev` branch's preview URL specifically** — Vercel's per-branch preview URL is stable as long as the branch and project name don't change. For `feat/*` branches, do not register a separate Stripe endpoint; instead use Stripe CLI for ad-hoc testing:

```bash
stripe listen --forward-to https://everlastings-git-feat-my-thing-{team}.vercel.app/api/webhook
```

This avoids accumulating dead webhook endpoints in Stripe Dashboard for every short-lived feature branch.

### Reference: Webhook Contract

> Implemented in `api/webhook.ts` (this section).

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

  ```typescript
  // api/webhook.ts
  import Stripe from 'stripe';
  import { createClient } from '@supabase/supabase-js';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
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

  - [ ] (AGENT) **Create** `api/webhook.ts`

#### Cart Recovery — `api/cart-recovery.ts`

See Cart Recovery Flow section for the full UX specification.

  ```typescript
  // api/cart-recovery.ts
  import Stripe from 'stripe';
  import { createClient } from '@supabase/supabase-js';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
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

  - [ ] (AGENT) **Create** `api/cart-recovery.ts`

#### Products API — `api/products.ts`

Enables AI-assisted product creation. Authenticated with `PRODUCT_API_KEY` (AR #20).

> **Security**: This endpoint validates against `PRODUCT_API_KEY` (a random string you generate). Internally, it uses `SUPABASE_SECRET_KEY` to write to the database. `SUPABASE_SECRET_KEY` is NEVER exposed in external requests.

### Reference: Slug Rules

> Implemented in `api/products.ts` (this section) and DB trigger (Schema).

  - **Generation**: `title.toLowerCase().replaceAll(' ', '-')` (AR #23)
  - **Example**: "The Sunkeeper" → `the-sunkeeper`
  - **Immutable**: once created, slug never changes (URL stability, SEO, R2 path depends on it)
  - **URL pattern**: `/product/the-sunkeeper`
  - **R2 path**: `/products/the-sunkeeper/hero-the-sunkeeper.webp`
  - **When generated**: API-side (by `api/products.ts` or AI agent) BEFORE image upload
  - **DB trigger**: Fallback only — fires if slug is NULL/empty on INSERT (manual Supabase Studio inserts)
  - **Uniqueness**: Enforced by database unique constraint. API returns 409 on conflict.

### Reference: Agentic Pipeline Error Handling

> Rules for AI agents creating products via `api/products.ts` and `api/upload.ts`.

  1. **Image upload failure**: Retry once. If second attempt fails, **STOP** the entire process. Do not proceed to product creation with missing images.
  2. **Product creation failure**: Do **NOT** retry blindly. Log the error, report to user. Common causes:
     - 409: slug conflict (product with that title already exists)
     - 400: missing required fields or invalid data
     - 401: wrong or missing `PRODUCT_API_KEY`
  3. **Stripe sync failure**: Handled automatically by the DB webhook. If `stripe_product_id` remains null after 30 seconds, the webhook may have failed. Check Supabase logs. Do NOT re-insert the product.
  4. **Sequential dependency**: Each step depends on the previous. Do not skip steps. Do not proceed if the current step fails.
  5. **Rollback on partial failure**: If product creation succeeds but images are incomplete, update the product to `available = false` and notify the user. Do not leave a product visible with missing images.

---

  ```typescript
  // api/products.ts
  import Stripe from 'stripe';
  import { createClient } from '@supabase/supabase-js';
  import { corsHeaders, preflight } from './_lib/cors';
  import { isTest } from './_lib/env';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  function authorize(request: Request): boolean {
    const auth = request.headers.get('authorization');
    return auth === `Bearer ${process.env.PRODUCT_API_KEY}`;
  }

  export async function GET(request: Request) {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return Response.json({ error: 'Missing slug parameter' }, { status: 400, headers: corsHeaders(request) });
    }

    // Filter by is_test so production never serves test products and previews never serve live ones
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_test', isTest)
      .single();

    if (error || !data) {
      return Response.json({ error: 'Product not found' }, { status: 404, headers: corsHeaders(request) });
    }

    return Response.json(data, { headers: corsHeaders(request) });
  }

  export async function OPTIONS(request: Request) {
    return preflight(request)!;
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
      // Tag with is_test so production reads filter test rows out (Dev/Test Data Hygiene)
      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, is_test: isTest })
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

  - [ ] (AGENT) **Create** `api/products.ts`

#### Image Upload — `api/upload.ts`

Accepts image, transforms via Cloudinary (4:5 crop, WebP, compress), uploads to R2, returns CDN URL. Authenticated with `PRODUCT_API_KEY` (AR #20).

### Reference: Dev/Test Data Hygiene §4 — R2 path + filename namespacing

Production uploads:
- Path: `products/{slug}/{role}-{slug}.webp`
- CDN URL: `https://cdn.everlastingsbyemaline.com/products/{slug}/{role}-{slug}.webp`

Preview/dev uploads (when `isTest === true`):
- Path: `test/{slug}/test_{role}-{slug}.webp`
- CDN URL: `https://cdn.everlastingsbyemaline.com/test/{slug}/test_{role}-{slug}.webp`

Both the path prefix (`test/`) AND the filename prefix (`test_`) are present so a stray reference is obvious anywhere it appears. `api/upload.ts` reads `isTest` and constructs the key accordingly. Cleanup before launch: `aws s3 rm s3://everlastings/test --recursive`.

> **Future upgrade path**: a separate R2 bucket plus `cdn-test.everlastingsbyemaline.com` subdomain is <5 min to set up via Cloudflare (Cloudflare auto-creates the CNAME). If the namespacing convention becomes unwieldy, that's the cleaner long-term split.

### Reference: Cloudinary → R2 CDN Image Pipeline

> Implemented in `api/upload.ts` (this section).

#### Naming Convention

  ```
  /products/{slug}/hero-{slug}.webp           → main product image
  /products/{slug}/gallery-{slug}-01.webp     → gallery images (up to 15)
  /products/{slug}/thumbnail-{slug}.webp      → grid thumbnail (smaller)
  /products/{slug}/video-{slug}-01.mp4        → videos (skip Cloudinary)
  /products/{slug}/detail-{slug}-01.gif       → GIFs (skip Cloudinary)
  ```

#### Cloudinary Transform Parameters

**Product photos**: `c_fill,ar_4:5,w_1200,f_webp,q_auto,g_auto`
**Thumbnails**: `c_fill,ar_4:5,w_600,f_webp,q_auto,g_auto`

#### Pipeline Steps

  1. Upload raw image to Cloudinary via Upload API
  2. Construct transform URL with params above
  3. Download transformed image (WebP, 4:5, compressed)
  4. Upload to R2 with SEO-friendly filename (`hero-{slug}.webp`)
  5. Delete from Cloudinary (stay on free tier)
  6. Store CDN URL in product record

Videos and GIFs skip Cloudinary — upload directly to R2.

---

  ```typescript
  // api/upload.ts
  import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
  import { corsHeaders, preflight } from './_lib/cors';
  import { isTest } from './_lib/env';

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

      // Upload to R2 — namespace by environment to keep test uploads visibly separate
      // (See Dev/Test Data Hygiene > R2 path + filename namespacing)
      const filename = isTest ? `test_${role}-${slug}.${extension}` : `${role}-${slug}.${extension}`;
      const key = isTest ? `test/${slug}/${filename}` : `products/${slug}/${filename}`;

      await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: finalBuffer,
        ContentType: contentType,
      }));

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
      return Response.json({ url: publicUrl, filename }, { headers: corsHeaders(request) });
    } catch (err) {
      console.error('Upload error:', err);
      return Response.json({ error: 'Upload failed' }, { status: 500, headers: corsHeaders(request) });
    }
  }

  export async function OPTIONS(request: Request) {
    return preflight(request)!;
  }
  ```

  - [ ] (AGENT) **Create** `api/upload.ts`

#### Newsletter — `api/subscribe.ts`

  ```typescript
  // api/subscribe.ts
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
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

  - [ ] (AGENT) **Create** `api/subscribe.ts`
  - [ ] (AGENT) **Create** `api/contact.ts` — similar pattern, stores in Supabase or sends email

#### Cart Activity — `api/cart-activity.ts`

Fire-and-forget endpoint called when any user adds a product to cart. Checks for interested email subscribers.

  ```typescript
  // api/cart-activity.ts
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
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

  - [ ] (AGENT) **Create** `api/cart-activity.ts`

#### Product Feed — `api/product-feed.ts`

CSV endpoint for Meta Commerce Catalog sync. Meta polls this URL daily to sync Instagram Shopping.

  ```typescript
  // api/product-feed.ts
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!
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

  - [ ] (AGENT) **Create** `api/product-feed.ts`
  - [ ] (SEAN) **Configure** Meta Commerce Manager: Catalog > Data Sources > Add Feed > URL: `https://everlastingsbyemaline.com/api/product-feed`

#### Orders (Admin) — `api/orders.ts` + `api/orders/[id].ts` (NEW — AR #30)

Admin-only endpoints for the shipping fulfillment pipeline.

> **Auth model — Supabase JWT only**: unlike `/api/products` and `/api/upload` (which use `PRODUCT_API_KEY` for AI-agent access), these endpoints are admin-UI-only and auth via the Supabase session token. The admin UI puts the JWT in `Authorization: Bearer <jwt>`; the endpoint calls Supabase's `auth.getUser(jwt)` to verify. No `PRODUCT_API_KEY` path — orders have no AI-agent use case. See `api/_lib/adminAuth.ts` below.

### Reference: Shipping + Order Fulfillment Pipeline (Backend Half)

**Tools**: Shippo (label printing, free Starter = 30 labels/mo) + Resend (branded tracking emails, free tier = 3k/mo).

**Data model** (see `orders` table in Product Schema Hard Reference):
  - `tracking_number`, `tracking_carrier` — filled when Emy marks shipped
  - `shipped_at` — set by `PATCH /api/orders/:id`
  - `delivered_at` — post-launch, set by Shippo webhook
  - `idx_orders_needs_shipping` partial index for fast admin queue lookups

**Why this split** (not fully automated Shippo API integration in v1):
  - Emy has final control and approval of every label
  - Shippo free tier doesn't require API setup
  - Zero vendor lock-in — if we switch carriers, nothing in our code changes
  - Post-launch can bolt on Shippo API for automation without refactoring the order model

**Tracking URL mapping** (in `api/orders/[id].ts > buildTrackingUrl`):
  - USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels={number}`
  - UPS: `https://www.ups.com/track?tracknum={number}`
  - FedEx: `https://www.fedex.com/fedextrack/?trknbr={number}`
  - DHL: `https://www.dhl.com/en/express/tracking.html?AWB={number}`

**Stripe receipts** (separate system): When `Dashboard > Settings > Emails > Successful payments` is toggled ON (Phase 0), Stripe sends a standard receipt on `checkout.session.completed`. This is additive to our tracking email, not a replacement. v1 uses Stripe's default template.

---

  ```typescript
  // api/_lib/adminAuth.ts — shared helper for admin-UI endpoints
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  // Returns the authenticated user, or null if the token is missing/invalid.
  // Any authenticated Supabase user qualifies as admin in v1 (see RLS v1 auth scope note).
  export async function requireAdmin(request: Request) {
    const header = request.headers.get('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return null;
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  }
  ```

  ```typescript
  // api/orders.ts — GET only; lists orders with optional status filter
  import { createClient } from '@supabase/supabase-js';
  import { corsHeaders, preflight } from './_lib/cors';
  import { requireAdmin } from './_lib/adminAuth';
  import { isTest } from './_lib/env';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  export async function GET(request: Request) {
    const user = await requireAdmin(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status'); // 'needs_shipping' | 'shipped' | 'all' (default: 'all')
    const q = url.searchParams.get('q'); // optional search: customer email/name, order id, tracking number

    let query = supabase.from('orders')
      .select('*, products(title, thumbnail), customers(name, email)')
      .eq('is_test', isTest)
      .order('created_at', { ascending: false });

    if (status === 'needs_shipping') {
      query = query.is('shipped_at', null).eq('status', 'completed');
    } else if (status === 'shipped') {
      query = query.not('shipped_at', 'is', null);
    }
    // 'all' or null: no status filter — returns the full historical list so Emy can look up any past order

    if (q) {
      // Simple OR search across common lookup fields
      query = query.or(`id.eq.${q},tracking_number.ilike.%${q}%,customer_email.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders(request) });
    return Response.json({ orders: data }, { headers: corsHeaders(request) });
  }

  export async function OPTIONS(request: Request) {
    return preflight(request)!;
  }
  ```

  ```typescript
  // api/orders/[id].ts — PATCH only; records tracking and sends branded email via Resend
  import { createClient } from '@supabase/supabase-js';
  import { corsHeaders, preflight } from '../_lib/cors';
  import { requireAdmin } from '../_lib/adminAuth';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const user = await requireAdmin(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(request) });
    }

    const { tracking_number, tracking_carrier, shipped_at } = await request.json();

    if (!tracking_number || !tracking_carrier) {
      return Response.json({ error: 'tracking_number and tracking_carrier required' }, { status: 400, headers: corsHeaders(request) });
    }

    const shippedAtIso = shipped_at || new Date().toISOString();

    const { data: order, error } = await supabase
      .from('orders')
      .update({
        tracking_number,
        tracking_carrier,
        shipped_at: shippedAtIso,
        status: 'shipped',
      })
      .eq('id', params.id)
      .select('*, products(title, thumbnail), customers(name, email)')
      .single();

    if (error || !order) {
      return Response.json({ error: error?.message || 'Order not found' }, { status: 404, headers: corsHeaders(request) });
    }

    // Send branded tracking email via Resend; record the send timestamp only if it succeeds
    const emailSentAt = await sendTrackingEmail(order);
    if (emailSentAt) {
      await supabase.from('orders')
        .update({ tracking_email_sent_at: emailSentAt })
        .eq('id', params.id);
      order.tracking_email_sent_at = emailSentAt;
    }

    return Response.json({ ok: true, order }, { headers: corsHeaders(request) });
  }

  export async function OPTIONS(request: Request) {
    return preflight(request)!;
  }

  // Returns the ISO timestamp when Resend accepted the email, or null on failure.
  // Caller writes this to orders.tracking_email_sent_at for audit visibility.
  async function sendTrackingEmail(order: any): Promise<string | null> {
    const email = order.customers?.email || order.customer_email;
    const name = order.customers?.name || 'Dear collector';
    if (!email) return null;

    const trackingUrl = buildTrackingUrl(order.tracking_carrier, order.tracking_number);
    const html = `
      <h1 style="font-family: Georgia, serif;">Your haven is on its way</h1>
      <p>${name},</p>
      <p><strong>${order.products?.title}</strong> has been carefully packed and handed to ${order.tracking_carrier}.</p>
      <p>Tracking number: <strong>${order.tracking_number}</strong></p>
      <p><a href="${trackingUrl}">Track your package</a></p>
      <p>With care,<br>Everlastings by Emaline</p>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [email],
        subject: 'Your haven is on its way',
        html,
      }),
    });

    if (!res.ok) {
      console.error('Resend tracking email failed:', await res.text());
      return null;
    }
    return new Date().toISOString();
  }

  function buildTrackingUrl(carrier: string, number: string): string {
    const urls: Record<string, string> = {
      'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${number}`,
      'UPS': `https://www.ups.com/track?tracknum=${number}`,
      'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${number}`,
      'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${number}`,
    };
    return urls[carrier] || `https://www.google.com/search?q=${carrier}+${number}`;
  }
  ```

  - [ ] (AGENT) **Create** `api/orders.ts` (GET — list)
  - [ ] (AGENT) **Create** `api/orders/[id].ts` (PATCH — record tracking + send email)

#### Email Templates — `api/_emails/`

All transactional emails live in a shared module. Three templates for v1:

  ```typescript
  // api/_emails/index.ts
  export async function sendEmail(opts: { to: string; subject: string; html: string }) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      console.error('Resend email failed:', await res.text());
    }
  }

  export function trackingEmailHtml(args: { name: string; productTitle: string; trackingNumber: string; carrier: string; trackingUrl: string }): string;
  export function welcomeCouponEmailHtml(args: { code: string; percentOff: number; expiresInDays: number }): string;
  export function cartRecoveryCouponEmailHtml(args: { code: string; percentOff: number; expiresInDays: number; lostItems: string[] }): string;
  ```

  - [ ] (AGENT) **Create** `api/_emails/index.ts` with three templated functions
  - [ ] (AGENT) Copy template HTML from BRAND.md > Email Voice section (brand-consistent)

---

### A3: Admin UI + Product Protocol

> **ACTION — (AGENT) builds; (SEAN) reviews PRODUCT_PROTOCOL copy.**

**YOU WILL HAVE**: Browser-based product management + documented AI workflow

#### Admin UI — `admin/index.html` + `assets/js/admin.js`

  - [ ] (AGENT) **Create** `admin/index.html` — login form + two tabs after auth: "Products" and "Orders"
  - [ ] (AGENT) **Create** `assets/js/admin.js`
  - [ ] (AGENT) **Implement** Supabase Auth login/logout
  - [ ] (AGENT) **Build** Products tab: product list (table/grid with edit/delete)
  - [ ] (AGENT) **Build** new product form (all schema fields)
    - Price input in dollars, convert to cents on save
    - Dynamic lists: features, materials, care_instructions, shipping_details
  - [ ] (AGENT) **Implement** image upload: file picker → `/api/upload` → CDN URL
  - [ ] (AGENT) **Implement** save (INSERT or UPDATE to products)
  - [ ] (AGENT) **Implement** delete with confirmation

#### Admin Orders Tab — Shipping Fulfillment (NEW — AR #30)

### Reference: Shipping + Order Fulfillment Pipeline (Admin Workflow Half)

**Flow**:

  1. Purchase completes → webhook creates `orders` row with `status: 'completed'`, `shipped_at: NULL`
  2. Admin `/admin/orders?status=needs_shipping` shows the queue
  3. Emy clicks order card → sees customer address → clicks "Copy address" button
  4. Emy pastes address into her Shippo tab → Shippo prints USPS/UPS label
  5. Emy copies the Shippo tracking number → pastes into the admin form → clicks "Mark as shipped"
  6. `PATCH /api/orders/:id` updates row + sends Resend tracking email from the brand domain
  7. Customer receives: "Your haven is on its way" with tracking number + carrier tracking link
  8. Admin card moves from "Needs Shipping" → "Shipped" tab

---

  - [ ] (AGENT) **Build** Orders tab with three sub-tabs: "Needs Shipping" (default), "Shipped", "All Orders" — every order ever placed is visible in the "All Orders" tab indefinitely, with a search box (customer email, order id, tracking number). No time window, no archive. Emy can look up a customer's order a year after the fact.
  - [ ] (AGENT) **Fetch** via `GET /api/orders?status={needs_shipping|shipped|all}&q={search}` — authenticated via the admin's Supabase JWT. The admin UI grabs the JWT from `supabase.auth.getSession()` and sends it as `Authorization: Bearer <jwt>`. The server verifies via `supabase.auth.getUser(jwt)` (see `api/_lib/adminAuth.ts`). **Not** `PRODUCT_API_KEY` — that's for AI agent access to products/upload only.
  - [ ] (AGENT) **Render** each order card with:
    - Customer name, email
    - Shipping address (with "Copy to clipboard" button for pasting into Shippo)
    - Item: photo + title + order total
    - Form: tracking number input, carrier dropdown (USPS, UPS, FedEx, DHL), "Mark as shipped" button
    - Status indicators: `shipped_at` (when Emy marked it shipped) and `tracking_email_sent_at` (when the Resend API accepted the tracking email — null means the email failed to send and Emy should retry or notify the customer manually)
  - [ ] (AGENT) **On submit** → `PATCH /api/orders/:id` with `{ tracking_number, tracking_carrier }` → server records, sends Resend tracking email, writes back `tracking_email_sent_at` on success
  - [ ] (AGENT) **Move** order card from "Needs Shipping" → "Shipped" tab on success
  - [ ] (AGENT) **Shipped tab + All Orders tab**: show tracking number, carrier, ship date, email-sent status; link to carrier's tracking page. If `tracking_email_sent_at` is null, show a "Resend tracking email" button that re-fires the Resend send

> **Emy's day-to-day**: Purchase completes → admin "Needs Shipping" tab shows the order → copy address → paste into Shippo (her browser bookmark) → Shippo prints label + gives tracking number → paste tracking number into admin → click "Mark as shipped" → branded email goes to customer automatically → `tracking_email_sent_at` confirms delivery to the Resend send queue (not inbox delivery, but definitive proof the API accepted the send).

> **Customer-side order lookup** (out of v1): customers cannot log in to view their own order status — v1 intentionally has no customer accounts. If a buyer loses their email receipt, they contact Emy; she finds the order in "All Orders" by email and re-sends tracking. v1.1+ may add a `/my-orders?token={signed-email-link}` page for self-service lookup.

#### Product Protocol

### Reference: Dev/Test Data Hygiene §6 — PRODUCT_PROTOCOL.md base-URL convention

The product creation API protocol (used by Emy via ChatGPT/Claude AND by Sean for test-product seeding) reads a `BASE_URL` variable so the same flow works against production or any preview URL. See PRODUCT_PROTOCOL.md > Step 2: Upload Images for the curl examples and base-URL switching pattern.

---

  - `assets/docs/PRODUCT_PROTOCOL.md`
    - Section 1: Client guide (for Emy) — field explanations, photo requirements, admin UI walkthrough, Custom GPT ("AI Product Assistant") usage
    - Section 2: Programmatic / agentic AI protocol — shell-based curl pipeline for Claude Code / test seeding
  - [ ] (AGENT) **Review** `assets/docs/PRODUCT_PROTOCOL.md` — confirm accurate

#### Custom GPT: "Everlastings Product Assistant" — Emy's AI path (NEW)

> **Why**: Emy uses ChatGPT web (Plus). ChatGPT web cannot execute curl, so the raw programmatic protocol above doesn't work for her. A **Custom GPT with Actions** wraps the same API endpoints in a conversational interface she already knows how to use. Plus-tier ChatGPT users can create Custom GPTs with authenticated Actions that make HTTP calls on the user's behalf.

**One-time setup (SEAN, after A2 API endpoints are live in production)**:

  - [ ] (SEAN) Go to <https://chat.openai.com/gpts/editor> (requires ChatGPT Plus — already confirmed for Emy)
  - [ ] (SEAN) **Name**: "Everlastings Product Assistant"
  - [ ] (SEAN) **Description**: "Helps Emy add new products to everlastingsbyemaline.com through natural conversation."
  - [ ] (SEAN) **Instructions** (GPT system prompt) — paste the block below
  - [ ] (SEAN) **Capabilities**: enable "Image input" (so Emy can drag photos into the chat). Disable "Code Interpreter" and "Web Browsing" (not needed, reduces confusion)
  - [ ] (SEAN) **Actions > Add action**: paste the OpenAPI 3 schema block below
  - [ ] (SEAN) **Authentication**: choose "API Key," auth type "Bearer," paste the **production** `PRODUCT_API_KEY` (live env, not test). Once saved, the key is hidden from Emy — she'll never see or type it
  - [ ] (SEAN) **Privacy policy URL**: required by ChatGPT for GPTs with Actions. Point to `https://everlastingsbyemaline.com/privacy.html` (Track B6 builds this page)
  - [ ] (SEAN) **Visibility**: "Only people with the link." Send the link to Emy and have her bookmark it
  - [ ] (SEAN) **Smoke test**: open the GPT, say "Create a test product called Test Sunkeeper $1 and here's a placeholder image," confirm it walks through the preview step and (when you approve) successfully creates the product. **Then delete the test product from the admin UI** so Emy's shop starts clean

**GPT Instructions** (paste into the Instructions field):

```
You are Emy's product-creation assistant for everlastingsbyemaline.com — a small handcrafted-miniatures brand. You help her add products by gathering details conversationally, then calling the site's API.

Voice: warm, poetic but concise. Match the brand voice described in BRAND.md (Emy's actual writing style — reverent, grounded, unhurried).

Workflow for every new product:
1. Ask Emy for the product details one topic at a time (title, price, story, dimensions, materials, etc.). Do NOT ask for SEO fields, slug, SKU, or Stripe IDs — those are auto-generated.
2. Require at minimum: title, price (in dollars — you convert to cents), description, product_type (one of miniature/printable/storybook), story_card (2-8 paragraphs), and 7 photos (1 hero, 1 thumbnail, at least 5 gallery).
3. For each photo Emy provides: call `uploadImage` with slug, role (hero | thumbnail | gallery-01 ... gallery-15), and the image file. Collect the returned CDN URLs.
4. BEFORE calling createProduct: show Emy a full preview of every field she provided plus the generated slug. Wait for her explicit approval ("yes", "go ahead", "looks good").
5. Call `createProduct` with all fields. Share the returned permalink with her.
6. If `createProduct` returns 409 (slug conflict): explain, suggest a variant title (e.g., adding "II" or a year), ask her to confirm the new title, then retry.
7. If any step fails: stop, explain the error in plain language, do NOT retry blindly. Never create a product if any image upload failed.

Never:
- Create a product without explicit preview + approval.
- Change fields Emy didn't specify (e.g., don't invent story content).
- Skip image uploads or create products with fewer than 7 images.
- Tell Emy about "test mode," the API key, curl, slugs, or CDN URLs — keep the conversation product-focused.

If Emy asks to edit an existing product or mark one sold: tell her those actions are only available in the admin UI at everlastingsbyemaline.com/admin, not through you.
```

**GPT Actions — OpenAPI 3 schema** (paste into the Actions editor):

```yaml
openapi: 3.1.0
info:
  title: Everlastings Product API
  version: 1.0.0
  description: Product creation endpoints used by the Everlastings Product Assistant GPT.
servers:
  - url: https://everlastingsbyemaline.com
paths:
  /api/upload:
    post:
      operationId: uploadImage
      summary: Upload a product image. Cloudinary transform + R2 delivery happens server-side.
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [file, slug, role]
              properties:
                file:
                  type: string
                  format: binary
                  description: The image file (JPEG/PNG/WebP, max 10MB). For videos/GIFs, set skip_transform=true.
                slug:
                  type: string
                  description: Product slug (generated by GPT as title.toLowerCase().replaceAll(' ', '-') before first upload).
                role:
                  type: string
                  description: One of hero, thumbnail, gallery-01 through gallery-15, video-01, detail-01.
                skip_transform:
                  type: string
                  description: Set to "true" for videos and GIFs to skip Cloudinary processing.
      responses:
        '200':
          description: Upload succeeded; returns CDN URL.
          content:
            application/json:
              schema:
                type: object
                properties:
                  url: { type: string }
                  filename: { type: string }
  /api/products:
    post:
      operationId: createProduct
      summary: Create a new product. Stripe Product + Price auto-created server-side via DB webhook.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [title, description, price, product_type, images, thumbnail]
              properties:
                title: { type: string }
                slug: { type: string, description: "Generated by GPT from title; lowercase, hyphen-separated." }
                headline: { type: string, description: "5-7 word tagline." }
                story_card: { type: string, description: "2-8 paragraphs of brand-voice copy." }
                description: { type: string }
                features: { type: array, items: { type: string } }
                price: { type: integer, description: "Price in cents (e.g. 24500 for $245)." }
                dimensions: { type: string }
                weight: { type: string }
                materials: { type: array, items: { type: string } }
                power_supply: { type: string, nullable: true }
                care_instructions: { type: array, items: { type: string } }
                shipping_details: { type: array, items: { type: string } }
                product_type: { type: string, enum: [miniature, printable, storybook] }
                series: { type: string, nullable: true }
                available: { type: boolean }
                quantity: { type: integer }
                featured: { type: boolean }
                images:
                  type: array
                  items:
                    type: object
                    properties:
                      url: { type: string }
                      alt: { type: string }
                thumbnail: { type: string, description: "CDN URL of the thumbnail image." }
                seo_title: { type: string, nullable: true }
                seo_description: { type: string, nullable: true }
                artist_note: { type: string, nullable: true }
      responses:
        '200':
          description: Product created.
        '409':
          description: Slug conflict — product with that slug already exists.
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
security:
  - bearerAuth: []
```

**Key rotation / incident response**: if the key is ever leaked (Emy shares a screenshot of the GPT config, her ChatGPT account is compromised, etc.), Sean: (1) regenerates `PRODUCT_API_KEY` via `openssl rand -hex 32` on the production Vercel env, (2) updates the GPT's Authentication field with the new key, (3) redeploys. Emy doesn't need to do anything — the GPT keeps working with the new key.

---

### A4: API Integration Testing

> **ACTION — (AGENT) runs tests; (SEAN) does the real-card smoke check at launch.**

  - [ ] (AGENT) **Test** stripe-sync: insert product in Supabase → verify Stripe product appears
  - [ ] (AGENT) **Test** checkout: POST with cart items → receive clientSecret
  - [ ] (AGENT) **Test** webhook: use Stripe CLI `stripe listen --forward-to localhost:3000/api/webhook`
  - [ ] (AGENT) **Test** full flow: add to cart → checkout → pay with `4242...` → completion
  - [ ] (AGENT) **Verify** customer record created in customers table
  - [ ] (AGENT) **Verify** order records created with customer_id FK
  - [ ] (AGENT) **Test** multi-item: add 2 products, checkout, verify both marked sold
  - [ ] (AGENT) **Test** race condition (reserve flow): add item, set `available=false`, click CHECKOUT on /cart.html → 409 recovery overlay appears
  - [ ] (AGENT) **Test** recovery: trigger 409 → enter email → get promo code (also emailed via Resend)
  - [ ] (AGENT) **Test** hold expiry: create hold, wait 15+ minutes, attempt /api/checkout → 410 redirect back to cart
  - [ ] (AGENT) **Test** shipping flow: mark order shipped via admin → verify Resend tracking email delivered
  - [ ] (AGENT) **Test** products API: POST/PUT/GET via curl with `PRODUCT_API_KEY` auth
  - [ ] (AGENT) **Test** upload API: upload image with `PRODUCT_API_KEY`, verify Cloudinary transform + R2 delivery
  - [ ] (AGENT) **Test** upload validation: wrong file type → 400, file too large → 400, no auth → 401
  - [ ] (AGENT) **Test** webhook idempotency: replay same event → should be ignored
  - [ ] (AGENT) **Test** slug conflict: create product, try same title → 409
  - [ ] (AGENT) **Test** admin: login → add product → see it on shop page

---

## Cross-Track Sequencing

```
Phase 0 ✓ → Track A (backend) ─┐
                               ├──→ Track C (integration) → Launch
            Track B (frontend) ┘
```

A and B run in parallel. C cannot start until A2 (API endpoints) is complete and B has produced placeholder pages.
