#!/usr/bin/env bash
# Test 10 (canonical): anonymous GET /api/products?slug=... returns the row when is_test=false.
# We seed a public-visible row directly via Supabase REST (is_test=false), GET it without auth,
# and verify the body matches.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY

SLUG="itest-get-$(date +%s)-$RANDOM"

# Insert directly so we can pin is_test=false (the products POST endpoint inherits VERCEL_ENV).
SEED_ROW="$(jq -n --arg slug "$SLUG" '{
  title: "Integration GET Test",
  slug: $slug,
  description: "Integration test GET row. Safe to delete.",
  price: 4200,
  product_type: "haven",
  headline: "h",
  story_card: "s",
  thumbnail: ("https://example.test/thumbnail-" + $slug + ".webp"),
  images: [
    { url: ("https://example.test/hero-" + $slug + "-01.webp"), alt: "hero" }
  ],
  available: true,
  quantity: 1,
  is_test: false
}')"

INSERTED="$(supabase_rest POST products "$SEED_ROW")"
ID="$(printf '%s' "$INSERTED" | jq -r '.[0].id // empty')"
if [ -z "$ID" ]; then
  log_fail "Supabase insert did not return id: $INSERTED"
  exit 1
fi

# Anonymous GET (no Authorization header) — should see is_test=false rows only.
log_info "anonymous GET /api/products?slug=$SLUG"
RESP="$(curl_status GET "$BASE_URL/api/products?slug=$SLUG" "")"

if ! assert_status 200 "$TEST_STATUS" "anon products GET"; then
  cleanup_test_data products "$ID"
  exit 1
fi

GOT_SLUG="$(printf '%s' "$RESP" | jq -r '.slug // empty')"
if [ "$GOT_SLUG" != "$SLUG" ]; then
  log_fail "expected slug=$SLUG, got '$GOT_SLUG' (full: $RESP)"
  cleanup_test_data products "$ID"
  exit 1
fi

cleanup_test_data products "$ID"
log_pass "anonymous products GET returns is_test=false row by slug"
