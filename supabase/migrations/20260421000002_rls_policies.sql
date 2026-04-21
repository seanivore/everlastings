-- Row Level Security policies
-- v1 auth scope: role-blind (any logged-in admin has identical permissions)
-- v1.1 upgrade path: add user_roles table, check auth.jwt() ->> 'role'

-- ============================================================================
-- PRODUCTS: public read, authenticated write
-- ============================================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are publicly readable"
  ON products FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Only authenticated users can insert products"
  ON products FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Only authenticated users can update products"
  ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Only authenticated users can delete products"
  ON products FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- CUSTOMERS: service role only (written by webhook)
-- ============================================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated users can read customers"
  ON customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage customers"
  ON customers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- ORDERS: authenticated read, service role write
-- ============================================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated users can read orders"
  ON orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert orders"
  ON orders FOR INSERT TO service_role WITH CHECK (true);

-- ============================================================================
-- SUBSCRIBERS: public insert, authenticated read
-- ============================================================================
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Only authenticated users can read subscribers"
  ON subscribers FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- SITE_CONFIG: public read, authenticated update
-- ============================================================================
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site config is publicly readable"
  ON site_config FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Only authenticated users can update config"
  ON site_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- WEBHOOK_EVENTS: service role only (no RLS policies needed for authenticated)
-- ============================================================================
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhook events"
  ON webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PRODUCT_INTERESTS: public insert (CTA forms), authenticated read (admin)
-- ============================================================================
ALTER TABLE product_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register product interest"
  ON product_interests FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Only authenticated users can read product interests"
  ON product_interests FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- CART_HOLDS: service role only (all access through api/checkout/reserve.ts)
-- ============================================================================
ALTER TABLE cart_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage cart holds"
  ON cart_holds FOR ALL TO service_role USING (true) WITH CHECK (true);
