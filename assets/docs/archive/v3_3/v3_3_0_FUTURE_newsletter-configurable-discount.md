# FUTURE spec — Em-configurable newsletter welcome discount

> **Not part of the v3.3.0 build.** This is a "what's needed" spec to fold into a later exclusively-executable IMPLEMENT. The v3.3.0 executor should ignore it. Best paired with `v3_3_0_FUTURE_newsletter-code-url.md`.

## The gap

The newsletter welcome discount is **hardcoded to 5%** in two places:

- `api/subscribe.ts:42` — the coupon ID is the literal `'newsletter-welcome-5'`.
- The email copy hardcodes "5%" (`subscribe.ts:77-80`, and `welcomeCouponEmailHtml` in `api/_emails/index.ts:108` — subject + body both say 5%).

The original intent was for **Em to choose** the welcome offer after the fact (which discount the lead magnet hands out), without a code change. Right now changing it means editing source.

## What's needed (executable later)

1. **A configuration source Em can edit** — the welcome flow should read *which coupon* (and therefore what percent) to hand out from config, not a literal. Options, in order of preference:
   - A small **settings row** (e.g. a `store_settings` table, key `newsletter_welcome_coupon`) that `/admin` and the GPT can both set — consistent with the two-way parity principle (both surfaces fully capable).
   - Or reuse the existing coupon system: Em creates/picks any coupon and marks one as the "welcome" coupon via an `/admin` toggle + a GPT action.
2. **`subscribe.ts` reads the configured coupon ID** instead of the constant, then mints the single-use promo code from it exactly as today (`max_redemptions: 1`, 30-day expiry unchanged).
3. **Derive the percent for the email from the coupon, decode-free.** Don't hardcode "5%" — read the coupon's `percent_off` (or carry a display string, like the v3.2 coupon-readback pattern that added `min_display` / `amount_display` so the GPT/email never has to infer money). The subject + body should reflect the actual configured discount.

## Considerations / edge cases

- **The configured coupon must exist** in the current mode (test on preview, live in prod). Validate when Em sets it (reject/warn if the coupon ID isn't found) so the welcome flow never silently fails the way a missing test coupon does today.
- **Amount vs percent:** decide whether Em can pick a fixed-amount coupon too, or percent-only. If amount, the email "X% off" copy must branch to "$X off."
- **Default + migration:** ship with `newsletter-welcome-5` as the default so existing behavior is unchanged until Em changes it. The `cart-recovery-10` coupon is a separate system coupon — decide whether it becomes configurable too (probably yes, same mechanism) or stays fixed.
- **Parity:** whatever Em can set in `/admin` she must be able to set + read back via the GPT, and vice-versa (a coupon attribute that's write-only on one surface is the exact gap fix-C3 closed in v3.2).
