#!/usr/bin/env bash
# Test 12 (canonical): upload validation.
# Multipart POST with bad MIME -> 400.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq
require_env BASE_URL PRODUCT_API_KEY

TMP_TXT="$(mktemp -t itest-bad).txt"
printf 'not an image' > "$TMP_TXT"

log_info "POST /api/upload with text/plain (expect 400)"
TMP_OUT="$(mktemp)"
CODE="$(curl -sS -o "$TMP_OUT" -w '%{http_code}' \
  -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Origin: http://localhost:3000" \
  -F "file=@${TMP_TXT};type=text/plain" \
  -F "slug=itest-bad" \
  -F "role=hero" \
  "$BASE_URL/api/upload")"
BODY="$(cat "$TMP_OUT")"
rm -f "$TMP_OUT" "$TMP_TXT"

if ! assert_status 400 "$CODE" "upload bad MIME"; then
  log_fail "body: $BODY"
  exit 1
fi

ERR="$(printf '%s' "$BODY" | jq -r '.error // empty')"
if ! printf '%s' "$ERR" | grep -qiE 'file type|allowed'; then
  log_fail "expected error mentioning file type/allowed; got '$ERR'"
  exit 1
fi

log_pass "bad MIME rejected with 400 ($ERR)"
