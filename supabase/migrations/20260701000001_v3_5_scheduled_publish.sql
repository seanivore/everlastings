-- v3.5 — scheduled publish (no new cron): a timestamptz + a partial index for the daily fold.
ALTER TABLE products ADD COLUMN scheduled_publish_at timestamptz;   -- null = not scheduled

-- The daily product-feed cron (vercel.json: "0 9 * * *") scans this to auto-publish due rows. The
-- partial index keeps the scan cheap (only ever a handful of scheduled rows) and matches the fold's
-- predicate. archived_at IS NULL because a scheduled-then-archived row must not silently go live.
CREATE INDEX idx_products_scheduled_publish ON products (scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL AND archived_at IS NULL;
