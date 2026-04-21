-- Initial schema for Everlastings by Emaline
-- 8 tables + triggers + is_test dev/prod isolation
-- Source: assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md > Product Schema Hard Reference

-- ============================================================================
-- Helper functions
-- ============================================================================

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

-- Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Tables
-- ============================================================================

-- PRODUCTS: source of truth for catalog
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

CREATE TRIGGER set_slug
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug();

CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- CUSTOMERS: unique by email, upserted by webhook on checkout
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

-- ORDERS: transactional record; shipping columns per AR #30
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
  tracking_email_sent_at timestamptz, -- when Resend accepted the tracking email (NULL = send failed)
  delivered_at timestamptz,          -- post-launch, via Shippo webhook
  created_at timestamptz DEFAULT now()
);

-- Fast lookup of unshipped orders for admin queue
CREATE INDEX idx_orders_needs_shipping ON orders (created_at DESC)
  WHERE shipped_at IS NULL AND status = 'completed';

-- SUBSCRIBERS: promo code tracking per AR #31
CREATE TABLE subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  source text DEFAULT 'footer',
  promo_code text,
  promo_code_expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- SITE_CONFIG: homepage theme rotations, etc.
CREATE TABLE site_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- WEBHOOK_EVENTS: idempotency for Stripe retries (AR #21)
CREATE TABLE webhook_events (
  event_id text PRIMARY KEY,
  processed_at timestamptz DEFAULT now()
);

-- PRODUCT_INTERESTS: email capture + cart activity notifications (AR #26)
CREATE TABLE product_interests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  product_slug text NOT NULL,
  notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(email, product_slug)
);

-- CART_HOLDS: soft reservations during checkout (AR #28, #29)
CREATE TABLE cart_holds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_cart_holds_product_active ON cart_holds (product_id, expires_at);

-- ============================================================================
-- is_test flag for dev/preview data isolation
-- Non-transactional tables (site_config, webhook_events) skip this column.
-- ============================================================================

ALTER TABLE products          ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE customers         ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE orders            ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE subscribers       ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE product_interests ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE cart_holds        ADD COLUMN is_test boolean NOT NULL DEFAULT false;

-- Partial indexes so production reads (is_test = false) stay fast on a mixed-data table.
CREATE INDEX idx_products_live    ON products (created_at DESC) WHERE is_test = false;
CREATE INDEX idx_subscribers_live ON subscribers (email)        WHERE is_test = false;
