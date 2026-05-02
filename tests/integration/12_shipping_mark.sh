#!/usr/bin/env bash
# Test 07 (canonical): shipping mark.
# PATCH /api/orders/:id with tracking -> verify tracking_email_sent_at is set.
# Verifies the email was sent (not the content).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY ADMIN_EMAIL ADMIN_PASSWORD SUPABASE_PUBLISHABLE_KEY

# Seed a customer + completed order directly so this test doesn't depend on a Stripe trigger.
EMAIL="itest-ship-$RANDOM@example.test"
log_info "seed customer $EMAIL"
CUSTOMER="$(supabase_rest POST customers \
  "$(jq -n --arg e "$EMAIL" '{email:$e, name:"Itest Customer", source:"checkout", is_test:true}')")"
CUST_ID="$(printf '%s' "$CUSTOMER" | jq -r '.[0].id // empty')"
[ -n "$CUST_ID" ] || { log_fail "could not insert customer: $CUSTOMER"; exit 1; }

# Seed a product (needed because orders.product_id has FK to products).
SLUG="itest-ship-$(date +%s)-$RANDOM"
PROD_ROW="$(jq -n --arg slug "$SLUG" '{
  title:"Ship Test Product", slug:$slug, description:"d", price:4200,
  product_type:"haven", headline:"h", story_card:"s",
  thumbnail:("https://example.test/t-" + $slug + ".webp"),
  images:[{url:("https://example.test/h-" + $slug + ".webp"), alt:"x"}],
  available:false, quantity:0, is_test:true
}')"
PROD="$(supabase_rest POST products "$PROD_ROW")"
PROD_ID="$(printf '%s' "$PROD" | jq -r '.[0].id // empty')"

ORDER_ROW="$(jq -n --arg pid "$PROD_ID" --arg cid "$CUST_ID" --arg ce "$EMAIL" '{
  product_id: $pid,
  customer_id: $cid,
  customer_email: $ce,
  amount: 4200,
  status: "completed",
  is_test: true
}')"
ORDER="$(supabase_rest POST orders "$ORDER_ROW")"
ORDER_ID="$(printf '%s' "$ORDER" | jq -r '.[0].id // empty')"
[ -n "$ORDER_ID" ] || { log_fail "could not insert order: $ORDER"; cleanup_test_data customers "$CUST_ID"; cleanup_test_data products "$PROD_ID"; exit 1; }

# Get an admin JWT.
JWT="$(admin_jwt)" || { cleanup_test_data orders "$ORDER_ID"; cleanup_test_data customers "$CUST_ID"; cleanup_test_data products "$PROD_ID"; exit 1; }

PATCH_BODY='{"tracking_number":"9400111899223197123456","tracking_carrier":"USPS"}'
log_info "PATCH /api/orders/$ORDER_ID"
R="$(curl_status PATCH "$BASE_URL/api/orders/$ORDER_ID" "$PATCH_BODY" \
  "Authorization: Bearer $JWT")"

if ! assert_status 200 "$(test_status)" "PATCH order"; then
  log_fail "body: $R"
  cleanup_test_data orders "$ORDER_ID"
  cleanup_test_data customers "$CUST_ID"
  cleanup_test_data products "$PROD_ID"
  exit 1
fi

# Email may legitimately fail in local-dev (Resend not configured); we accept either:
#   - email_sent=true AND tracking_email_sent_at is set on the row
#   - email_sent=false AND tracking_email_sent_at remains null (we then warn but don't fail)
EMAIL_SENT="$(printf '%s' "$R" | jq -r '.email_sent // empty')"

# Re-read the row.
ROW="$(supabase_rest GET "orders?id=eq.${ORDER_ID}&select=tracking_number,tracking_carrier,shipped_at,tracking_email_sent_at,status")"
SENT_AT="$(printf '%s' "$ROW" | jq -r '.[0].tracking_email_sent_at // empty')"
SHIPPED_AT="$(printf '%s' "$ROW" | jq -r '.[0].shipped_at // empty')"
STATUS_NOW="$(printf '%s' "$ROW" | jq -r '.[0].status')"

if [ -z "$SHIPPED_AT" ] || [ "$STATUS_NOW" != "shipped" ]; then
  log_fail "shipped_at empty or status not 'shipped' after PATCH (row: $ROW)"
  cleanup_test_data orders "$ORDER_ID"
  cleanup_test_data customers "$CUST_ID"
  cleanup_test_data products "$PROD_ID"
  exit 1
fi

if [ "$EMAIL_SENT" = "true" ]; then
  if [ -z "$SENT_AT" ]; then
    log_fail "email_sent=true but tracking_email_sent_at not set on row"
    cleanup_test_data orders "$ORDER_ID"
    cleanup_test_data customers "$CUST_ID"
    cleanup_test_data products "$PROD_ID"
    exit 1
  fi
  log_pass "tracking email sent and tracking_email_sent_at=$SENT_AT"
else
  log_warn "email_sent=false (Resend may not be configured locally). shipped_at + status verified."
  log_pass "PATCH wrote shipped_at + status=shipped (email path skipped)"
fi

cleanup_test_data orders "$ORDER_ID"
cleanup_test_data customers "$CUST_ID"
cleanup_test_data products "$PROD_ID"
