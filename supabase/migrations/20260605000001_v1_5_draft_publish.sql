-- v1.5 — draft → preview → publish, 3-tier fields, Stripe-lock, archive.

-- New columns -----------------------------------------------------------------
-- NB: `media jsonb` is NOT added here — it ALREADY EXISTS (20260421000001, initial schema). v1.5 only
-- changes the *contents* shape it carries and wires `populateMedia` (Phase 7); no ALTER for it.
ALTER TABLE products ADD COLUMN checkout_name        text;
ALTER TABLE products ADD COLUMN checkout_description text;
ALTER TABLE products ADD COLUMN checkout_image       text;
ALTER TABLE products ADD COLUMN seo_thumbnail        text;
ALTER TABLE products ADD COLUMN is_published         boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN published_at         timestamptz;
ALTER TABLE products ADD COLUMN draft                jsonb;
ALTER TABLE products ADD COLUMN preview_token        text UNIQUE;
ALTER TABLE products ADD COLUMN archived_at          timestamptz;   -- 1.12: null = active, set = archived

-- Backfill: existing live (already Stripe-synced) products are published. Fail-closed:
-- anything without a Stripe price stays an unpublished draft.
-- Expected in prod: 0 rows that were actually VISIBLE become hidden — the public site already
-- hides anything without a stripe_price_id (main.js). Verify the count on the dev preview.
UPDATE products
   SET is_published = true, published_at = created_at
 WHERE stripe_price_id IS NOT NULL;

-- Indexes: token lookups + fast "active" lists (exclude drafts + archived).
CREATE INDEX idx_products_preview_token ON products (preview_token) WHERE preview_token IS NOT NULL;
CREATE INDEX idx_products_active ON products (created_at DESC)
  WHERE is_published = true AND archived_at IS NULL;

-- RLS: the public (anon/authenticated) client may read ONLY published, non-archived rows.
-- (Admin + GPT read via the service-role API, which bypasses RLS.) IF EXISTS so a partial
-- re-run can't hard-fail; the exact policy name is the anchor.
DROP POLICY IF EXISTS "Products are publicly readable" ON products;
CREATE POLICY "Published products are publicly readable"
  ON products FOR SELECT TO anon, authenticated
  USING (is_published = true AND archived_at IS NULL);

-- Safety guard: the DROP above is keyed to the EXACT legacy policy name. Postgres ORs
-- permissive SELECT policies, so if that name ever drifted, `DROP POLICY IF EXISTS` would no-op
-- SILENTLY and the old `USING (true)` policy would survive ALONGSIDE the new one → `true OR (...)` →
-- every draft, archived, and test row publicly readable, with the migration still reporting success.
-- Fail LOUD instead: abort the migration if any permissive SELECT policy on products still has an
-- unconditional qual. (The name matches today — this is defense-in-depth on a silent, catastrophic
-- failure mode; near-zero cost.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'products'
       AND cmd = 'SELECT' AND permissive = 'PERMISSIVE'
       AND qual = 'true'
  ) THEN
    RAISE EXCEPTION 'Unsafe RLS on products: a permissive SELECT policy still has USING(true) — drafts/archived/test rows would be publicly readable. Drop the stale policy and re-run.';
  END IF;
END $$;

-- Stripe auto-create trigger must skip drafts. Stripe objects are created only at publish
-- (api/products.ts ?_action=publish calls syncProductToStripe inline). REPLACES the live
-- function (quoted above) — the ONLY delta is the added `OR NEW.is_published = false` guard.
CREATE OR REPLACE FUNCTION notify_stripe_sync()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Skip test inserts AND unpublished drafts — neither should create a Stripe product.
  IF NEW.is_test = true OR NEW.is_published = false THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'products',
    'schema', 'public',
    'record', row_to_json(NEW),
    'old_record', null
  );

  PERFORM net.http_post(
    url := 'https://everlastingsbyemaline.com/api/stripe-sync',
    body := payload,  -- jsonb, NOT payload::text — preserves the 20260502000001 pg_net fix
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TTL hard-purge (1.12) — SPEC'D BUT DISABLED. Uncomment + tune the intervals post-launch only if
-- active-list size ever warrants it (product rows are tiny; images live in R2, not Supabase). The
-- orders FK (no ON DELETE CASCADE) already blocks purging any ordered row; the NOT EXISTS makes that
-- explicit so the job never errors. archive (archived_at) is the everyday "remove"; this is janitorial.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('purge_dead_products', '0 4 * * 0', $purge$
--   DELETE FROM products p
--    WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.product_id = p.id)
--      AND (
--        (p.is_published = false  AND p.created_at  < now() - interval '90 days') OR
--        (p.archived_at IS NOT NULL AND p.archived_at < now() - interval '180 days')
--      );
-- $purge$);
