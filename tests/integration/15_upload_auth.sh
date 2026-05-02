#!/usr/bin/env bash
# Test 13 (canonical): upload auth.
# Multipart POST without Authorization header -> 401.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq
require_env BASE_URL

TMP_PNG="$(mktemp -t itest-upload-auth).png"
write_png_to "$TMP_PNG"

log_info "POST /api/upload with no Authorization (expect 401)"
TMP_OUT="$(mktemp)"
CODE="$(curl -sS -o "$TMP_OUT" -w '%{http_code}' \
  -H "Origin: http://localhost:3000" \
  -F "file=@${TMP_PNG};type=image/png" \
  -F "slug=itest-noauth" \
  -F "role=hero" \
  "$BASE_URL/api/upload")"
BODY="$(cat "$TMP_OUT")"
rm -f "$TMP_OUT" "$TMP_PNG"

if ! assert_status 401 "$CODE" "upload no auth"; then
  log_fail "body: $BODY"
  exit 1
fi

log_pass "missing Authorization rejected with 401"
