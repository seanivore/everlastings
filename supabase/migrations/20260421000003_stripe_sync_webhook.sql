-- Database webhook: on products INSERT → POST to api/stripe-sync
-- Implements the Supabase "DB Webhook" pattern in raw SQL so it's versioned + reproducible.
--
-- Tradeoff: this trigger won't appear in Supabase Studio > Database > Webhooks UI
-- (that UI only shows webhooks created via its own form). It will appear in
-- Studio > Database > Triggers and Studio > Database > Functions instead.
--
-- The receiving endpoint is api/stripe-sync.ts (Track A will build it) — runs server-side
-- on Vercel Production, uses LIVE Stripe keys to create the matching Stripe Product + Price.

-- Ensure pg_net is enabled (Supabase ships with it; this is a safety idempotent enable)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function: fire HTTP POST to api/stripe-sync when a non-test product is inserted
-- Skips is_test = true rows so dev/preview test inserts never accidentally create
-- live Stripe products. (Per Dev/Test Data Hygiene Reference.)
CREATE OR REPLACE FUNCTION notify_stripe_sync()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Skip test inserts entirely — they never trigger Stripe sync
  IF NEW.is_test = true THEN
    RETURN NEW;
  END IF;

  -- Mirror the payload shape Supabase Studio's Database Webhook UI sends,
  -- so api/stripe-sync.ts can be implemented against the standard format.
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'products',
    'schema', 'public',
    'record', row_to_json(NEW),
    'old_record', null
  );

  -- pg_net is async — PERFORM returns immediately; HTTP call happens in background.
  PERFORM net.http_post(
    url := 'https://everlastingsbyemaline.com/api/stripe-sync',
    body := payload::text,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger fires after every successful INSERT on products
CREATE TRIGGER notify_stripe_sync_on_insert
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION notify_stripe_sync();
