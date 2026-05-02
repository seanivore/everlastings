#!/usr/bin/env bash
# Test 16 (canonical): admin login -> fetch orders -> needs_shipping returns rows
# with shipped_at IS NULL.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY SUPABASE_PUBLISHABLE_KEY ADMIN_EMAIL ADMIN_PASSWORD

# Seed a completed, unshipped order so needs_shipping has at least one row.
EMAIL="itest-needship-$RANDOM@example.test"
CUSTOMER="$(supabase_rest POST customers \
  "$(jq -n --arg e "$EMAIL" '{email:$e, name:"Needs Ship", source:"checkout", is_test:true}')")"
CUST_ID="$(printf '%s' "$CUSTOMER" | jq -r '.[0].id // empty')"
[ -n "$CUST_ID" ] || { log_fail "customer insert failed: $CUSTOMER"; exit 1; }

SLUG="itest-needship-$(date +%s)-$RANDOM"
PROD_ROW="$(jq -n --arg slug "$SLUG" '{
  title:"Needs Ship", slug:$slug, description:"d", price:4200,
  product_type:"haven", headline:"h", story_card:"s",
  thumbnail:("https://example.test/t-" + $slug + ".webp"),
  images:[{url:("https://example.test/h-" + $slug + ".webp"), alt:"x"}],
  available:false, quantity:0, is_test:true
}')"
PROD="$(supabase_rest POST products "$PROD_ROW")"
PROD_ID="$(printf '%s' "$PROD" | jq -r '.[0].id // empty')"

ORDER_ROW="$(jq -n --arg pid "$PROD_ID" --arg cid "$CUST_ID" --arg ce "$EMAIL" '{
  product_id:$pid, customer_id:$cid, customer_email:$ce,
  amount:4200, status:"completed", is_test:true
}')"
ORDER="$(supabase_rest POST orders "$ORDER_ROW")"
ORDER_ID="$(printf '%s' "$ORDER" | jq -r '.[0].id // empty')"
[ -n "$ORDER_ID" ] || { log_fail "order insert failed: $ORDER"; cleanup_test_data customers "$CUST_ID"; cleanup_test_data products "$PROD_ID"; exit 1; }

JWT="$(admin_jwt)" || { cleanup_test_data orders "$ORDER_ID"; cleanup_test_data customers "$CUST_ID"; cleanup_test_data products "$PROD_ID"; exit 1; }

log_info "GET /api/orders?status=needs_shipping"
R="$(curl_status GET "$BASE_URL/api/orders?status=needs_shipping" "" \
  "Authorization: Bearer $JWT")"
if ! assert_status 200 "$TEST_STATUS" "orders GET"; then
  log_fail "body: $R"
  cleanup_test_data orders "$ORDER_ID"
  cleanup_test_data customers "$CUST_ID"
  cleanup_test_data products "$PROD_ID"
  exit 1
fi

# All returned rows must have shipped_at = null (per /api/orders.ts filter).
TOTAL="$(printf '%s' "$R" | jq '.orders | length')"
NULL_SHIPPED="$(printf '%s' "$R" | jq '[.orders[] | select(.shipped_at == null)] | length')"
SAW_OUR_ORDER="$(printf '%s' "$R" | jq --arg id "$ORDER_ID" '[.orders[] | select(.id == $id)] | length')"

if [ "$TOTAL" -lt 1 ]; then
  log_fail "needs_shipping returned 0 rows; expected at least our seeded order $ORDER_ID"
  cleanup_test_data orders "$ORDER_ID"
  cleanup_test_data customers "$CUST_ID"
  cleanup_test_data products "$PROD_ID"
  exit 1
fi
if [ "$TOTAL" != "$NULL_SHIPPED" ]; then
  log_fail "needs_shipping returned rows where shipped_at is NOT null ($NULL_SHIPPED of $TOTAL)"
  cleanup_test_data orders "$ORDER_ID"
  cleanup_test_data customers "$CUST_ID"
  cleanup_test_data products "$PROD_ID"
  exit 1
fi
if [ "$SAW_OUR_ORDER" != "1" ]; then
  log_warn "did not see our seeded order in needs_shipping (it is_test=true; double-check VERCEL_ENV scoping)"
fi

cleanup_test_data orders "$ORDER_ID"
cleanup_test_data customers "$CUST_ID"
cleanup_test_data products "$PROD_ID"
log_pass "needs_shipping returned $TOTAL rows, all with shipped_at IS NULL"
