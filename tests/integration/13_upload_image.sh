#!/usr/bin/env bash
# Test 11 (canonical): upload image.
# Multipart POST a small PNG -> 200 + url returned.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq
require_env BASE_URL PRODUCT_API_KEY

TMP_PNG="$(mktemp -t itest-upload).png"
write_png_to "$TMP_PNG"

SLUG="itest-upload-$(date +%s)-$RANDOM"

# Use skip_transform=true so we don't depend on Cloudinary in this test.
log_info "POST /api/upload (skip_transform)"
TMP_OUT="$(mktemp)"
CODE="$(curl -sS -o "$TMP_OUT" -w '%{http_code}' \
  -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Origin: http://localhost:3000" \
  -F "file=@${TMP_PNG};type=image/png" \
  -F "slug=$SLUG" \
  -F "role=hero" \
  -F "skip_transform=true" \
  "$BASE_URL/api/upload")"

BODY="$(cat "$TMP_OUT")"
rm -f "$TMP_OUT" "$TMP_PNG"

if ! assert_status 200 "$CODE" "upload"; then
  log_fail "body: $BODY"
  log_fail "Note: requires R2 env (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL)."
  exit 1
fi

URL="$(printf '%s' "$BODY" | jq -r '.url // empty')"
if [ -z "$URL" ]; then
  log_fail "no url in response: $BODY"
  exit 1
fi

log_pass "upload returned 200 + url=$URL"
