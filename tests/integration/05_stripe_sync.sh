#!/usr/bin/env bash
# Test 01 (canonical): stripe-sync.
# POST /api/products -> assert the Supabase products row has a stripe_product_id, and
# the corresponding Stripe Product exists.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq stripe
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY PRODUCT_API_KEY STRIPE_SECRET_KEY

SLUG="itest-stripe-sync-$(date +%s)-$RANDOM"
PAYLOAD="$(build_product_payload "$SLUG" "Stripe Sync Test")"

log_info "POST /api/products"
RESP="$(curl_status POST "$BASE_URL/api/products" "$PAYLOAD" \
  "Authorization: Bearer $PRODUCT_API_KEY")"
assert_status 200 "$(test_status)" "products POST"

ID="$(printf '%s' "$RESP" | jq -r '.product.id // empty')"

# Stripe sync runs via Supabase webhook -> /api/stripe-sync. Poll for up to ~10s.
log_info "polling Supabase row for stripe_product_id (up to 10s)"
STRIPE_PROD=""
STRIPE_PRICE=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  ROW="$(supabase_rest GET "products?id=eq.${ID}&select=stripe_product_id,stripe_price_id")"
  STRIPE_PROD="$(printf '%s' "$ROW" | jq -r '.[0].stripe_product_id // empty')"
  STRIPE_PRICE="$(printf '%s' "$ROW" | jq -r '.[0].stripe_price_id // empty')"
  if [ -n "$STRIPE_PROD" ] && [ -n "$STRIPE_PRICE" ]; then break; fi
  sleep 1
done

if [ -z "$STRIPE_PROD" ] || [ -z "$STRIPE_PRICE" ]; then
  log_fail "products row never received stripe_product_id/stripe_price_id"
  log_fail "This means the Supabase -> /api/stripe-sync webhook trigger isn't firing."
  log_fail "Check Database -> Webhooks in the Supabase dashboard."
  cleanup_test_data products "$ID"
  exit 1
fi

# Confirm the product exists in Stripe and metadata.supabase_id matches.
STRIPE_OBJ="$(stripe products retrieve "$STRIPE_PROD" 2>/dev/null || true)"
META_ID="$(printf '%s' "$STRIPE_OBJ" | jq -r '.metadata.supabase_id // empty')"
if [ "$META_ID" != "$ID" ]; then
  log_fail "Stripe product $STRIPE_PROD metadata.supabase_id ($META_ID) != products.id ($ID)"
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

cleanup_test_data products "$ID"
cleanup_stripe_product "$STRIPE_PROD"
log_pass "stripe-sync mirrored products row $ID -> Stripe product $STRIPE_PROD"
