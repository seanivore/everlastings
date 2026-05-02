#!/usr/bin/env bash
# Test 04 (canonical): full purchase flow.
# reserve -> checkout (gets clientSecret) -> stripe trigger checkout.session.completed
# matched against same metadata -> verify completed order row.
#
# Requires `stripe listen --forward-to <BASE_URL>/api/webhook` running.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq stripe
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY PRODUCT_API_KEY STRIPE_SECRET_KEY

SLUG="itest-full-flow-$(date +%s)-$RANDOM"
PAYLOAD="$(build_product_payload "$SLUG" "Full Flow Test")"

log_info "seed product"
RESP="$(curl_status POST "$BASE_URL/api/products" "$PAYLOAD" \
  "Authorization: Bearer $PRODUCT_API_KEY")"
assert_status 200 "$TEST_STATUS" "products POST"
ID="$(printf '%s' "$RESP" | jq -r '.product.id // empty')"
STRIPE_PROD="$(printf '%s' "$RESP" | jq -r '.product.stripe_product_id // empty')"

# Wait for stripe sync.
for _ in $(seq 1 12); do
  PRICE_ID="$(supabase_rest GET "products?id=eq.${ID}&select=stripe_price_id" | jq -r '.[0].stripe_price_id // empty')"
  [ -n "$PRICE_ID" ] && break
  sleep 1
done

if [ -z "${PRICE_ID:-}" ]; then
  log_fail "no stripe_price_id; cannot complete full flow"
  cleanup_test_data products "$ID"
  exit 1
fi

supabase_rest PATCH "products?id=eq.${ID}" '{"available":true,"quantity":1}' >/dev/null

SESSION_ID="$(make_session_id)"
ITEMS="$(jq -n --arg id "$ID" --arg slug "$SLUG" '[{product_id:$id, slug:$slug}]')"
ITEMS_META="$(jq -n --arg id "$ID" --arg slug "$SLUG" '[{id:$id, slug:$slug}]')"
TEST_EMAIL="itest-full-$RANDOM@example.test"

log_info "reserve"
R1="$(curl_status POST "$BASE_URL/api/checkout/reserve" \
  "$(jq -n --argjson items "$ITEMS" --arg sid "$SESSION_ID" '{items:$items, session_id:$sid}')")"
assert_status 200 "$TEST_STATUS" "reserve"

log_info "checkout (clientSecret)"
R2="$(curl_status POST "$BASE_URL/api/checkout" \
  "$(jq -n --argjson items "$ITEMS" --arg sid "$SESSION_ID" --arg e "$TEST_EMAIL" '{items:$items, session_id:$sid, email:$e}')")"
assert_status 200 "$TEST_STATUS" "checkout"

CS="$(printf '%s' "$R2" | jq -r '.clientSecret // empty')"
[ -n "$CS" ] || { log_fail "no clientSecret"; cleanup_test_data products "$ID"; cleanup_stripe_product "$STRIPE_PROD"; exit 1; }

# Trigger a checkout.session.completed event with metadata that points at our row.
log_info "stripe trigger checkout.session.completed (metadata.items pointed at $ID)"
stripe trigger checkout.session.completed \
  --add "checkout_session:metadata[items]=$ITEMS_META" \
  --add "checkout_session:metadata[session_id]=$SESSION_ID" \
  --add "checkout_session:customer_email=$TEST_EMAIL" >/dev/null 2>&1 || true

log_info "wait for completed order"
ORDER_ID=""
for _ in $(seq 1 15); do
  ORDERS="$(supabase_rest GET "orders?customer_email=eq.${TEST_EMAIL}&product_id=eq.${ID}&status=eq.completed&select=id")"
  ORDER_ID="$(printf '%s' "$ORDERS" | jq -r '.[0].id // empty')"
  [ -n "$ORDER_ID" ] && break
  sleep 1
done

if [ -z "$ORDER_ID" ]; then
  log_fail "no completed order row after webhook trigger"
  log_fail "Is 'stripe listen --forward-to ${STRIPE_LISTEN_FORWARD_URL:-$BASE_URL/api/webhook}' running?"
  supabase_rest DELETE "cart_holds?session_id=eq.${SESSION_ID}" >/dev/null || true
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

# Verify the product was marked unavailable by the webhook.
AVAIL="$(supabase_rest GET "products?id=eq.${ID}&select=available" | jq -r '.[0].available')"
if [ "$AVAIL" != "false" ]; then
  log_warn "expected products.available=false after order, got '$AVAIL'"
fi

# Cleanup.
DB_CUST_ID="$(supabase_rest GET "customers?email=eq.${TEST_EMAIL}&select=id" | jq -r '.[0].id // empty')"
cleanup_test_data orders "$ORDER_ID"
cleanup_test_data customers "$DB_CUST_ID"
supabase_rest DELETE "cart_holds?session_id=eq.${SESSION_ID}" >/dev/null || true
cleanup_test_data products "$ID"
cleanup_stripe_product "$STRIPE_PROD"
log_pass "full purchase flow: reserve -> checkout -> webhook -> completed order"
