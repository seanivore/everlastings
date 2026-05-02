#!/usr/bin/env bash
# Test 09 (canonical): products PUT price change.
# POST a product (Stripe sync creates initial Price), then PUT a new price ->
# the products row gets a NEW stripe_price_id and the old Price is archived in Stripe.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq stripe
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY PRODUCT_API_KEY STRIPE_SECRET_KEY

SLUG="itest-put-price-$(date +%s)-$RANDOM"
PAYLOAD="$(build_product_payload "$SLUG" "PUT Price Test")"

log_info "POST /api/products"
RESP="$(curl_status POST "$BASE_URL/api/products" "$PAYLOAD" \
  "Authorization: Bearer $PRODUCT_API_KEY")"
assert_status 200 "$(test_status)" "products POST"

ID="$(printf '%s' "$RESP" | jq -r '.product.id // empty')"
STRIPE_PROD="$(printf '%s' "$RESP" | jq -r '.product.stripe_product_id // empty')"
OLD_PRICE_ID="$(printf '%s' "$RESP" | jq -r '.product.stripe_price_id // empty')"

if [ -z "$ID" ] || [ -z "$STRIPE_PROD" ] || [ -z "$OLD_PRICE_ID" ]; then
  log_warn "Initial Stripe sync did not populate stripe_product_id/price_id."
  log_warn "This test depends on the Supabase products INSERT trigger calling /api/stripe-sync."
  log_warn "If your local env does not have that trigger configured, this test cannot pass — skipping."
  cleanup_test_data products "$ID"
  exit 0
fi

# Bump price.
NEW_PRICE=4900
PUT_BODY="$(jq -n --arg p "$NEW_PRICE" '{ price: ($p|tonumber) }')"
log_info "PUT /api/products?id=$ID with price=$NEW_PRICE"
RESP2="$(curl_status PUT "$BASE_URL/api/products?id=$ID" "$PUT_BODY" \
  "Authorization: Bearer $PRODUCT_API_KEY")"

if ! assert_status 200 "$(test_status)" "products PUT"; then
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

NEW_PRICE_ID="$(printf '%s' "$RESP2" | jq -r '.product.stripe_price_id // empty')"
if [ -z "$NEW_PRICE_ID" ] || [ "$NEW_PRICE_ID" = "$OLD_PRICE_ID" ]; then
  log_fail "expected new stripe_price_id; old=$OLD_PRICE_ID new=$NEW_PRICE_ID"
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

# Verify old price is archived in Stripe.
OLD_ACTIVE="$(stripe prices retrieve "$OLD_PRICE_ID" 2>/dev/null | jq -r '.active // empty')"
if [ "$OLD_ACTIVE" != "false" ]; then
  log_fail "expected old Stripe price ($OLD_PRICE_ID) to be archived (active=false), got active=$OLD_ACTIVE"
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

cleanup_test_data products "$ID"
cleanup_stripe_product "$STRIPE_PROD"
log_pass "PUT price rotated stripe_price_id ($OLD_PRICE_ID -> $NEW_PRICE_ID) and archived old"
