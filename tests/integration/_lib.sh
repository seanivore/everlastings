#!/usr/bin/env bash
# Shared helpers for the integration test sweep.
# Sourced by every test script; never executed directly.

set -euo pipefail

if [ -f "${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}/tests/integration/.env" ]; then
  set -a
  # shellcheck disable=SC1090,SC1091
  . "${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}/tests/integration/.env"
  set +a
fi

BASE_URL="${BASE_URL:-http://localhost:3000}"
SUPABASE_REST="${SUPABASE_URL:-}/rest/v1"

if command -v tput >/dev/null 2>&1 && [ -t 1 ]; then
  C_RED="$(tput setaf 1)"
  C_GREEN="$(tput setaf 2)"
  C_YELLOW="$(tput setaf 3)"
  C_DIM="$(tput dim)"
  C_RESET="$(tput sgr0)"
else
  C_RED=""; C_GREEN=""; C_YELLOW=""; C_DIM=""; C_RESET=""
fi

log_info()  { printf '%s[info]%s %s\n'  "$C_DIM"    "$C_RESET" "$*" >&2; }
log_pass()  { printf '%s[pass]%s %s\n'  "$C_GREEN"  "$C_RESET" "$*" >&2; }
log_fail()  { printf '%s[fail]%s %s\n'  "$C_RED"    "$C_RESET" "$*" >&2; }
log_warn()  { printf '%s[warn]%s %s\n'  "$C_YELLOW" "$C_RESET" "$*" >&2; }

require_env() {
  local missing=()
  for var in "$@"; do
    if [ -z "${!var:-}" ]; then
      missing+=("$var")
    fi
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    log_fail "Missing required env vars: ${missing[*]}"
    exit 2
  fi
}

require_cmd() {
  local missing=()
  for cmd in "$@"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      missing+=("$cmd")
    fi
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    log_fail "Missing required commands on PATH: ${missing[*]}"
    exit 2
  fi
}

# make_session_id — return a fresh UUIDv4 (uses uuidgen if available, else /dev/urandom).
make_session_id() {
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr '[:upper:]' '[:lower:]'
  else
    python3 -c 'import uuid; print(uuid.uuid4())' 2>/dev/null \
      || awk 'BEGIN{srand();
        printf "%08x-%04x-4%03x-%01x%03x-%012x\n",
          int(rand()*4294967295), int(rand()*65535), int(rand()*4095),
          int(rand()*3)+8, int(rand()*4095),
          int(rand()*281474976710655)}'
  fi
}

# assert_status <expected> <actual> <context>
assert_status() {
  local expected="$1"
  local actual="$2"
  local ctx="${3:-}"
  if [ "$expected" != "$actual" ]; then
    log_fail "expected HTTP $expected, got HTTP $actual${ctx:+ ($ctx)}"
    return 1
  fi
}

# assert_jq <jq-filter> <expected> <json>
assert_jq() {
  local filter="$1"
  local expected="$2"
  local json="$3"
  local got
  got="$(printf '%s' "$json" | jq -r "$filter" 2>/dev/null || true)"
  if [ "$got" != "$expected" ]; then
    log_fail "jq '$filter' expected '$expected', got '$got'"
    log_fail "raw response: $json"
    return 1
  fi
}

# curl_status <method> <url> <body|''> <extra-headers...> -> writes body to stdout, status to TEST_STATUS
curl_status() {
  local method="$1"; shift
  local url="$1"; shift
  local body="$1"; shift
  local tmp; tmp="$(mktemp)"
  local extra=()
  while [ "$#" -gt 0 ]; do extra+=("-H" "$1"); shift; done
  local code
  if [ -n "$body" ]; then
    code="$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" \
      -H 'Content-Type: application/json' \
      -H 'Origin: http://localhost:3000' \
      "${extra[@]}" \
      --data "$body" "$url")"
  else
    code="$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" \
      -H 'Origin: http://localhost:3000' \
      "${extra[@]}" \
      "$url")"
  fi
  TEST_STATUS="$code"
  cat "$tmp"
  rm -f "$tmp"
}

# Supabase REST helpers ------------------------------------------------------

supabase_rest() {
  local method="$1"; shift
  local path="$1"; shift
  local body="${1:-}"
  if [ -n "$body" ]; then
    curl -sS -X "$method" \
      -H "apikey: ${SUPABASE_SECRET_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}" \
      -H 'Content-Type: application/json' \
      -H 'Prefer: return=representation' \
      --data "$body" \
      "${SUPABASE_URL%/}/rest/v1/${path}"
  else
    curl -sS -X "$method" \
      -H "apikey: ${SUPABASE_SECRET_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}" \
      -H 'Prefer: return=representation' \
      "${SUPABASE_URL%/}/rest/v1/${path}"
  fi
}

# cleanup_test_data — delete by id from a given table. Usage: cleanup_test_data <table> <id>
cleanup_test_data() {
  local table="$1"
  local id="$2"
  if [ -z "$id" ] || [ "$id" = "null" ]; then return 0; fi
  supabase_rest DELETE "${table}?id=eq.${id}" >/dev/null || true
}

# cleanup_stripe_product — archive a Stripe product (and its prices) so cleanup leaves no garbage.
cleanup_stripe_product() {
  local stripe_product_id="$1"
  if [ -z "$stripe_product_id" ] || [ "$stripe_product_id" = "null" ]; then return 0; fi
  if command -v stripe >/dev/null 2>&1; then
    stripe products update "$stripe_product_id" --active=false >/dev/null 2>&1 || true
  fi
}

# Build a complete, valid product payload (passes /api/products POST validation).
# Args: <slug> <title>
build_product_payload() {
  local slug="$1"
  local title="$2"
  jq -n --arg slug "$slug" --arg title "$title" '{
    title: $title,
    slug: $slug,
    description: "Integration test product. Safe to delete.",
    price: 4200,
    product_type: "haven",
    headline: "Integration test headline",
    story_card: "Integration test story card.",
    thumbnail: "https://example.test/thumbnail-\($slug).webp",
    images: [
      { url: "https://example.test/hero-\($slug)-01.webp", alt: "hero" },
      { url: "https://example.test/gallery-\($slug)-01.webp", alt: "g1" },
      { url: "https://example.test/gallery-\($slug)-02.webp", alt: "g2" },
      { url: "https://example.test/gallery-\($slug)-03.webp", alt: "g3" },
      { url: "https://example.test/gallery-\($slug)-04.webp", alt: "g4" },
      { url: "https://example.test/gallery-\($slug)-05.webp", alt: "g5" }
    ]
  }'
}

# Generate a 1x1 PNG as base64 (used by upload tests; avoids binary file dependencies).
write_png_to() {
  local dest="$1"
  printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=' \
    | base64 -d > "$dest"
}

# admin_jwt — log in via Supabase auth REST and return an access_token. Cached after first call.
__ADMIN_JWT_CACHE=""
admin_jwt() {
  if [ -n "$__ADMIN_JWT_CACHE" ]; then
    printf '%s' "$__ADMIN_JWT_CACHE"
    return 0
  fi
  require_env SUPABASE_URL SUPABASE_PUBLISHABLE_KEY ADMIN_EMAIL ADMIN_PASSWORD
  local resp
  resp="$(curl -sS -X POST \
    -H "apikey: ${SUPABASE_PUBLISHABLE_KEY}" \
    -H 'Content-Type: application/json' \
    --data "$(jq -n --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" '{email:$e,password:$p}')" \
    "${SUPABASE_URL%/}/auth/v1/token?grant_type=password")"
  local token
  token="$(printf '%s' "$resp" | jq -r '.access_token // empty')"
  if [ -z "$token" ]; then
    log_fail "admin login failed: $resp"
    return 1
  fi
  __ADMIN_JWT_CACHE="$token"
  printf '%s' "$token"
}
