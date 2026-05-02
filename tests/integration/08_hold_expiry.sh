#!/usr/bin/env bash
# Test 06 (canonical): hold expiry.
# INSERT a cart_holds row with expires_at = now() - 1h, then POST /api/checkout for that
# session -> expect 410 hold_expired.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY PRODUCT_API_KEY

SLUG="itest-hold-expiry-$(date +%s)-$RANDOM"
PAYLOAD="$(build_product_payload "$SLUG" "Hold Expiry Test")"

RESP="$(curl_status POST "$BASE_URL/api/products" "$PAYLOAD" \
  "Authorization: Bearer $PRODUCT_API_KEY")"
assert_status 200 "$(test_status)" "products POST"
ID="$(printf '%s' "$RESP" | jq -r '.product.id // empty')"
STRIPE_PROD="$(printf '%s' "$RESP" | jq -r '.product.stripe_product_id // empty')"

# Force the row available so the only failure cause is the expired hold.
supabase_rest PATCH "products?id=eq.${ID}" '{"available":true,"quantity":1}' >/dev/null

SESSION_ID="$(make_session_id)"
EXPIRED_ISO="$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)"

# Insert an expired hold for our (session_id, product_id).
HOLD_ROW="$(jq -n --arg sid "$SESSION_ID" --arg pid "$ID" --arg exp "$EXPIRED_ISO" '{
  session_id: $sid, product_id: $pid, expires_at: $exp, is_test: true
}')"
log_info "insert expired cart_hold"
INS="$(supabase_rest POST cart_holds "$HOLD_ROW")"
HOLD_ID="$(printf '%s' "$INS" | jq -r '.[0].id // empty')"

ITEMS="$(jq -n --arg id "$ID" --arg slug "$SLUG" '[{product_id:$id, slug:$slug}]')"
CHECKOUT_BODY="$(jq -n --argjson items "$ITEMS" --arg sid "$SESSION_ID" '{ items:$items, session_id:$sid }')"

log_info "POST /api/checkout (expect 410 hold_expired)"
R="$(curl_status POST "$BASE_URL/api/checkout" "$CHECKOUT_BODY")"

if ! assert_status 410 "$(test_status)" "checkout with expired hold"; then
  log_fail "body: $R"
  supabase_rest DELETE "cart_holds?session_id=eq.${SESSION_ID}" >/dev/null || true
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

ERR="$(printf '%s' "$R" | jq -r '.error // empty')"
if [ "$ERR" != "hold_expired" ]; then
  log_fail "expected error=hold_expired, got '$ERR' (full: $R)"
  supabase_rest DELETE "cart_holds?session_id=eq.${SESSION_ID}" >/dev/null || true
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

supabase_rest DELETE "cart_holds?session_id=eq.${SESSION_ID}" >/dev/null || true
cleanup_test_data products "$ID"
cleanup_stripe_product "$STRIPE_PROD"
log_pass "expired hold yielded 410 hold_expired"
