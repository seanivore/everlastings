#!/usr/bin/env bash
# Run every test script in dependency order, print a pass/fail summary.
# Exits 0 only if all tests pass; non-zero if any fail.

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
. "$SCRIPT_DIR/_lib.sh"

# Dependency order:
#   1. products POST       — proves the auth + DB write path; everything else builds on it.
#   2. slug conflict       — extends products POST.
#   3. products GET        — anonymous read path; independent.
#   4. PUT price change    — needs Stripe sync trigger; soft-skips if not wired.
#   5. stripe-sync         — confirms the trigger -> Stripe Product/Price.
#   6. checkout            — needs a synced product.
#   7. race condition      — independent.
#   8. hold expiry         — independent.
#   9. webhook contract    — needs `stripe listen` running.
#  10. full purchase flow  — same.
#  11. webhook idempotency — needs at least one prior checkout.session.completed event.
#  12. shipping mark       — needs admin JWT.
#  13. upload image        — needs R2 env.
#  14. upload validation   — independent.
#  15. upload auth         — independent.
#  16. admin needs_shipping— needs admin JWT.

TESTS=(
  "01_products_post.sh"
  "02_slug_conflict.sh"
  "03_products_get.sh"
  "04_products_put_price.sh"
  "05_stripe_sync.sh"
  "06_checkout.sh"
  "07_race_condition.sh"
  "08_hold_expiry.sh"
  "09_webhook_contract.sh"
  "10_full_purchase_flow.sh"
  "11_webhook_idempotency.sh"
  "12_shipping_mark.sh"
  "13_upload_image.sh"
  "14_upload_validation.sh"
  "15_upload_auth.sh"
  "16_admin_orders_needs_shipping.sh"
)

PASS=()
FAIL=()
SKIP=()

START_TS="$(date +%s)"
for t in "${TESTS[@]}"; do
  printf '\n%s===== %s =====%s\n' "$C_DIM" "$t" "$C_RESET"
  if bash "$SCRIPT_DIR/$t"; then
    PASS+=("$t")
  else
    code=$?
    if [ "$code" = "2" ]; then
      SKIP+=("$t (missing env or tools)")
    else
      FAIL+=("$t (exit $code)")
    fi
  fi
done
END_TS="$(date +%s)"
DUR=$((END_TS - START_TS))

printf '\n%s===== summary (%ss) =====%s\n' "$C_DIM" "$DUR" "$C_RESET"
printf '%spassed:%s %d\n' "$C_GREEN" "$C_RESET" "${#PASS[@]}"
for n in "${PASS[@]}"; do printf '  + %s\n' "$n"; done
if [ "${#SKIP[@]}" -gt 0 ]; then
  printf '%sskipped:%s %d\n' "$C_YELLOW" "$C_RESET" "${#SKIP[@]}"
  for n in "${SKIP[@]}"; do printf '  ~ %s\n' "$n"; done
fi
printf '%sfailed:%s %d\n' "$C_RED" "$C_RESET" "${#FAIL[@]}"
for n in "${FAIL[@]}"; do printf '  - %s\n' "$n"; done

if [ "${#FAIL[@]}" -gt 0 ]; then exit 1; fi
exit 0
