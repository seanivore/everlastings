#!/usr/bin/env bash
# Test 05 (canonical): race condition.
# Set available=false on a product, then POST /api/checkout/reserve for it ->
# expect 409 with the unavailable + related shape.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY PRODUCT_API_KEY

SLUG="itest-race-$(date +%s)-$RANDOM"
PAYLOAD="$(build_product_payload "$SLUG" "Race Test")"

RESP="$(curl_status POST "$BASE_URL/api/products" "$PAYLOAD" \
  "Authorization: Bearer $PRODUCT_API_KEY")"
assert_status 200 "$(test_status)" "products POST"
ID="$(printf '%s' "$RESP" | jq -r '.product.id // empty')"
STRIPE_PROD="$(printf '%s' "$RESP" | jq -r '.product.stripe_product_id // empty')"

# Force unavailable.
log_info "marking product unavailable"
supabase_rest PATCH "products?id=eq.${ID}" '{"available":false}' >/dev/null

SESSION_ID="$(make_session_id)"
ITEMS="$(jq -n --arg id "$ID" --arg slug "$SLUG" '[{product_id:$id, slug:$slug}]')"
RESERVE_BODY="$(jq -n --argjson items "$ITEMS" --arg sid "$SESSION_ID" '{ items:$items, session_id:$sid }')"

log_info "POST /api/checkout/reserve (expect 409)"
R="$(curl_status POST "$BASE_URL/api/checkout/reserve" "$RESERVE_BODY")"

if ! assert_status 409 "$(test_status)" "reserve unavailable"; then
  log_fail "body: $R"
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

ERR="$(printf '%s' "$R" | jq -r '.error // empty')"
UNAVAIL_LEN="$(printf '%s' "$R" | jq '.unavailable | length // 0')"
HAS_RELATED="$(printf '%s' "$R" | jq 'has("related")')"

if [ "$ERR" != "unavailable" ] || [ "$UNAVAIL_LEN" -lt 1 ] || [ "$HAS_RELATED" != "true" ]; then
  log_fail "expected error=unavailable, non-empty unavailable[], and related[] present"
  log_fail "got: $R"
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

cleanup_test_data products "$ID"
cleanup_stripe_product "$STRIPE_PROD"
log_pass "reserve returned 409 unavailable with related[] when product is unavailable"
