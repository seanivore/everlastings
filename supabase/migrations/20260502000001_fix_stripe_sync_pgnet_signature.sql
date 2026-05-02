-- Fix: pg_net's net.http_post expects body as jsonb, not text.
-- The original migration (20260421000003) cast payload::text and triggered
-- "function net.http_post(url => unknown, body => text, headers => jsonb)
-- does not exist" on every non-test product INSERT, blocking direct Supabase
-- inserts on real-data rows.

CREATE OR REPLACE FUNCTION notify_stripe_sync()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
BEGIN
  IF NEW.is_test = true THEN
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
    body := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
