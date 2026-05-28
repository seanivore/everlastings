-- Add per-product shipping rate field.
-- v1: defaults to 0; api/checkout.ts uses a static $0 "Free shipping" option.
-- v1.1: per-product Shippo-calculated rate will sum line_items[].shipping_cents.

ALTER TABLE products
  ADD COLUMN shipping_cents integer NOT NULL DEFAULT 0;
