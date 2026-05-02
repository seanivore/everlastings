#!/usr/bin/env bash
# Test 08 (canonical) / 01 (run order): products POST.
# POSTs a complete product with PRODUCT_API_KEY -> 200 + row in DB.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY PRODUCT_API_KEY

SLUG="itest-products-post-$(date +%s)-$RANDOM"
TITLE="Integration Products POST"
PAYLOAD="$(build_product_payload "$SLUG" "$TITLE")"

log_info "POST /api/products with slug=$SLUG"
RESP="$(curl_status POST "$BASE_URL/api/products" "$PAYLOAD" \
  "Authorization: Bearer $PRODUCT_API_KEY")"

assert_status 200 "$TEST_STATUS" "products POST"

ID="$(printf '%s' "$RESP" | jq -r '.product.id // empty')"
RET_SLUG="$(printf '%s' "$RESP" | jq -r '.product.slug // empty')"
STRIPE_PROD="$(printf '%s' "$RESP" | jq -r '.product.stripe_product_id // empty')"

if [ -z "$ID" ] || [ "$RET_SLUG" != "$SLUG" ]; then
  log_fail "response missing id or slug mismatch: $RESP"
  exit 1
fi

# Verify the row exists in Supabase.
DB_ROW="$(supabase_rest GET "products?id=eq.${ID}&select=id,slug,is_test")"
COUNT="$(printf '%s' "$DB_ROW" | jq 'length')"
if [ "$COUNT" != "1" ]; then
  log_fail "expected 1 row in products with id=$ID, got $COUNT: $DB_ROW"
  cleanup_test_data products "$ID"
  exit 1
fi

cleanup_test_data products "$ID"
cleanup_stripe_product "$STRIPE_PROD"
log_pass "products POST inserted row id=$ID and verified in DB"
