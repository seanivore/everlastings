#!/usr/bin/env bash
# Test 15 (canonical): slug conflict.
# POST a product, then POST a second with the same slug -> 409 slug_conflict.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY PRODUCT_API_KEY

SLUG="itest-slug-conflict-$(date +%s)-$RANDOM"
PAYLOAD="$(build_product_payload "$SLUG" "Slug Conflict")"

log_info "first POST (should 200): slug=$SLUG"
RESP1="$(curl_status POST "$BASE_URL/api/products" "$PAYLOAD" \
  "Authorization: Bearer $PRODUCT_API_KEY")"
assert_status 200 "$(test_status)" "first products POST"

ID1="$(printf '%s' "$RESP1" | jq -r '.product.id // empty')"
STRIPE_PROD1="$(printf '%s' "$RESP1" | jq -r '.product.stripe_product_id // empty')"

log_info "second POST with same slug (should 409)"
RESP2="$(curl_status POST "$BASE_URL/api/products" "$PAYLOAD" \
  "Authorization: Bearer $PRODUCT_API_KEY")"

if ! assert_status 409 "$(test_status)" "second products POST"; then
  cleanup_test_data products "$ID1"
  cleanup_stripe_product "$STRIPE_PROD1"
  exit 1
fi

ERR="$(printf '%s' "$RESP2" | jq -r '.error // empty')"
if [ "$ERR" != "slug_conflict" ]; then
  log_fail "expected error=slug_conflict, got '$ERR' (full: $RESP2)"
  cleanup_test_data products "$ID1"
  cleanup_stripe_product "$STRIPE_PROD1"
  exit 1
fi

cleanup_test_data products "$ID1"
cleanup_stripe_product "$STRIPE_PROD1"
log_pass "slug_conflict returns 409 as expected"
