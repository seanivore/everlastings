#!/usr/bin/env bash
# Test 02 (canonical): checkout.
# POST /api/checkout/reserve, then POST /api/checkout -> receive a clientSecret.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY PRODUCT_API_KEY

SLUG="itest-checkout-$(date +%s)-$RANDOM"
PAYLOAD="$(build_product_payload "$SLUG" "Checkout Test")"

log_info "seed product via POST /api/products"
RESP="$(curl_status POST "$BASE_URL/api/products" "$PAYLOAD" \
  "Authorization: Bearer $PRODUCT_API_KEY")"
assert_status 200 "$TEST_STATUS" "products POST"
ID="$(printf '%s' "$RESP" | jq -r '.product.id // empty')"
STRIPE_PROD="$(printf '%s' "$RESP" | jq -r '.product.stripe_product_id // empty')"

# Wait for stripe sync to populate stripe_price_id (checkout requires it).
log_info "wait for stripe_price_id"
STRIPE_PRICE=""
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  ROW="$(supabase_rest GET "products?id=eq.${ID}&select=stripe_product_id,stripe_price_id,available,quantity")"
  STRIPE_PRICE="$(printf '%s' "$ROW" | jq -r '.[0].stripe_price_id // empty')"
  STRIPE_PROD_ROW="$(printf '%s' "$ROW" | jq -r '.[0].stripe_product_id // empty')"
  if [ -n "$STRIPE_PRICE" ]; then break; fi
  sleep 1
done

if [ -z "$STRIPE_PRICE" ]; then
  log_fail "product $ID never got stripe_price_id; cannot checkout"
  cleanup_test_data products "$ID"
  exit 1
fi
[ -n "${STRIPE_PROD:-}" ] || STRIPE_PROD="${STRIPE_PROD_ROW:-}"

# Make sure the row is purchasable (available=true, quantity>=1).
supabase_rest PATCH "products?id=eq.${ID}" '{"available":true,"quantity":1}' >/dev/null

SESSION_ID="$(make_session_id)"
ITEMS="$(jq -n --arg id "$ID" --arg slug "$SLUG" '[{product_id:$id, slug:$slug}]')"
RESERVE_BODY="$(jq -n --argjson items "$ITEMS" --arg sid "$SESSION_ID" '{ items:$items, session_id:$sid }')"

log_info "POST /api/checkout/reserve"
R1="$(curl_status POST "$BASE_URL/api/checkout/reserve" "$RESERVE_BODY")"
if ! assert_status 200 "$TEST_STATUS" "reserve"; then
  log_fail "reserve body: $R1"
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

CHECKOUT_BODY="$(jq -n --argjson items "$ITEMS" --arg sid "$SESSION_ID" '{ items:$items, session_id:$sid, email:"itest-checkout@example.test" }')"
log_info "POST /api/checkout"
R2="$(curl_status POST "$BASE_URL/api/checkout" "$CHECKOUT_BODY")"
if ! assert_status 200 "$TEST_STATUS" "checkout"; then
  log_fail "checkout body: $R2"
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

CS="$(printf '%s' "$R2" | jq -r '.clientSecret // empty')"
if [ -z "$CS" ] || [ "${CS#cs_}" = "$CS" ]; then
  log_fail "expected clientSecret prefixed with cs_, got: $CS"
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

# Cleanup.
supabase_rest DELETE "cart_holds?session_id=eq.${SESSION_ID}" >/dev/null || true
cleanup_test_data products "$ID"
cleanup_stripe_product "$STRIPE_PROD"
log_pass "reserve + checkout returned clientSecret"
