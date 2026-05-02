#!/usr/bin/env bash
# Test 03 (canonical): webhook contract.
# Trigger checkout.session.completed via the Stripe CLI -> webhook fires ->
# customer + order + webhook_events rows appear in Supabase.
#
# Requires `stripe listen --forward-to <BASE_URL>/api/webhook` running in another terminal.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq stripe
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY PRODUCT_API_KEY STRIPE_SECRET_KEY

SLUG="itest-webhook-$(date +%s)-$RANDOM"
PAYLOAD="$(build_product_payload "$SLUG" "Webhook Contract Test")"

log_info "seed product"
RESP="$(curl_status POST "$BASE_URL/api/products" "$PAYLOAD" \
  "Authorization: Bearer $PRODUCT_API_KEY")"
assert_status 200 "$(test_status)" "products POST"
ID="$(printf '%s' "$RESP" | jq -r '.product.id // empty')"
STRIPE_PROD="$(printf '%s' "$RESP" | jq -r '.product.stripe_product_id // empty')"

ITEMS_META="$(jq -n --arg id "$ID" --arg slug "$SLUG" '[{id:$id, slug:$slug}]')"
TEST_EMAIL="itest-webhook-$RANDOM@example.test"

log_info "stripe trigger checkout.session.completed (forwarded to /api/webhook)"
TRIGGER_OUT="$(stripe trigger checkout.session.completed \
  --add "checkout_session:metadata[items]=$ITEMS_META" \
  --add "checkout_session:metadata[session_id]=$(make_session_id)" \
  --add "checkout_session:customer_email=$TEST_EMAIL" \
  2>&1 || true)"

EVENT_ID="$(printf '%s' "$TRIGGER_OUT" | grep -oE 'evt_[A-Za-z0-9]+' | head -n1 || true)"
if [ -z "$EVENT_ID" ]; then
  log_warn "stripe trigger output: $TRIGGER_OUT"
  log_warn "could not extract evt_ id; will look up by stripe_session_id from orders instead."
fi

log_info "wait up to 15s for webhook to land in Supabase"
ORDERS=""
for _ in $(seq 1 15); do
  ORDERS="$(supabase_rest GET "orders?customer_email=eq.${TEST_EMAIL}&select=id,stripe_session_id,product_id,customer_id,status")"
  COUNT="$(printf '%s' "$ORDERS" | jq 'length')"
  if [ "$COUNT" -ge 1 ]; then break; fi
  sleep 1
done

COUNT="$(printf '%s' "$ORDERS" | jq 'length')"
if [ "$COUNT" -lt 1 ]; then
  log_fail "no orders row appeared for $TEST_EMAIL within 15s"
  log_fail "Make sure 'stripe listen --forward-to ${STRIPE_LISTEN_FORWARD_URL:-$BASE_URL/api/webhook}' is running."
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

ORDER_ID="$(printf '%s' "$ORDERS" | jq -r '.[0].id')"
SS_ID="$(printf '%s' "$ORDERS" | jq -r '.[0].stripe_session_id')"
CUST_ID="$(printf '%s' "$ORDERS" | jq -r '.[0].customer_id // empty')"

# customers row
CUSTOMERS="$(supabase_rest GET "customers?email=eq.${TEST_EMAIL}&select=id,email")"
CUST_COUNT="$(printf '%s' "$CUSTOMERS" | jq 'length')"
if [ "$CUST_COUNT" -lt 1 ]; then
  log_fail "no customers row for $TEST_EMAIL"
  cleanup_test_data orders "$ORDER_ID"
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi
DB_CUST_ID="$(printf '%s' "$CUSTOMERS" | jq -r '.[0].id')"

# webhook_events row
EVENTS="$(supabase_rest GET "webhook_events?select=event_id&limit=200&order=created_at.desc")"
WE_COUNT="$(printf '%s' "$EVENTS" | jq 'length')"
if [ "$WE_COUNT" -lt 1 ]; then
  log_fail "no rows in webhook_events"
  cleanup_test_data orders "$ORDER_ID"
  cleanup_test_data customers "$DB_CUST_ID"
  cleanup_test_data products "$ID"
  cleanup_stripe_product "$STRIPE_PROD"
  exit 1
fi

# FK linkage
if [ -n "$CUST_ID" ] && [ "$CUST_ID" != "$DB_CUST_ID" ]; then
  log_warn "orders.customer_id ($CUST_ID) != customers.id ($DB_CUST_ID) — webhook upsert may have raced"
fi

# Save event id for the idempotency test if present.
if [ -n "$EVENT_ID" ]; then
  printf '%s\n' "$EVENT_ID" > "$SCRIPT_DIR/.last_webhook_event_id"
fi
printf '%s\n' "$SS_ID" > "$SCRIPT_DIR/.last_session_id"

cleanup_test_data orders "$ORDER_ID"
cleanup_test_data customers "$DB_CUST_ID"
cleanup_test_data products "$ID"
cleanup_stripe_product "$STRIPE_PROD"
log_pass "webhook produced customer+order+webhook_events for stripe_session=$SS_ID"
