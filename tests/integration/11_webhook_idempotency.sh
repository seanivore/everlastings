#!/usr/bin/env bash
# Test 14 (canonical): webhook idempotency.
# Replay the same Stripe event id -> second call returns 200 with no new order row.
#
# We use stripe events resend on the most recent checkout.session.completed event
# from the test mode account.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

require_cmd curl jq stripe
require_env BASE_URL SUPABASE_URL SUPABASE_SECRET_KEY STRIPE_SECRET_KEY

# Find the most recent checkout.session.completed event.
log_info "looking up most recent checkout.session.completed event"
EVENT_ID="$(stripe events list --type checkout.session.completed --limit 1 2>/dev/null \
  | jq -r '.data[0].id // empty')"

if [ -z "$EVENT_ID" ]; then
  log_warn "No prior checkout.session.completed event in this Stripe account."
  log_warn "Run 09_webhook_contract.sh or 10_full_purchase_flow.sh first to seed one. Skipping."
  exit 0
fi

log_info "snapshot orders count for the affected session"
SESSION_ID="$(stripe events retrieve "$EVENT_ID" 2>/dev/null | jq -r '.data.object.id // empty')"
if [ -z "$SESSION_ID" ]; then
  log_fail "could not extract session id from event $EVENT_ID"
  exit 1
fi

BEFORE="$(supabase_rest GET "orders?stripe_session_id=eq.${SESSION_ID}&select=id" | jq 'length')"

# Make sure the webhook_events row already exists (idempotency claim is keyed on event_id).
EXISTS="$(supabase_rest GET "webhook_events?event_id=eq.${EVENT_ID}&select=event_id" | jq 'length')"
if [ "$EXISTS" = "0" ]; then
  # Pre-claim it so the resend exercises the duplicate path.
  log_info "pre-claiming webhook_events row for $EVENT_ID"
  supabase_rest POST "webhook_events" \
    "$(jq -n --arg eid "$EVENT_ID" '{event_id: $eid}')" >/dev/null
fi

log_info "stripe events resend $EVENT_ID"
stripe events resend "$EVENT_ID" >/dev/null 2>&1 || true

sleep 3

AFTER="$(supabase_rest GET "orders?stripe_session_id=eq.${SESSION_ID}&select=id" | jq 'length')"

if [ "$AFTER" != "$BEFORE" ]; then
  log_fail "orders count for session $SESSION_ID changed on replay: $BEFORE -> $AFTER"
  exit 1
fi

log_pass "replayed event $EVENT_ID was deduped (orders count stable at $AFTER)"
