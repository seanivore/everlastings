# FUTURE spec — newsletter welcome code as a ready-to-click URL

> **Not part of the v3.3.0 build.** This is a "what's needed" spec to fold into a later exclusively-executable IMPLEMENT. The v3.3.0 executor should ignore it.

## Current behavior (document this — it's already built)

Newsletter signups POST to `api/subscribe.ts` and land in the Supabase **`subscribers`** table (same project — not a separate DB). Columns: `email`, `source`, `is_test`, `promo_code`, `promo_code_expires_at`. Two form sources exist site-wide:

- **Footer form** (`data-email-cta="newsletter-footer"`, every page footer) → inserts a subscriber row, sends a **plain** "Welcome to Everlastings by Emaline" email. No code.
- **Contemplation-offer form** (`data-email-cta="contemplation-offer"`) → inserts a subscriber row **and** mints a single-use **5%** promo code from the `newsletter-welcome-5` coupon (`max_redemptions: 1`, 30-day expiry), then emails it. (`subscribe.ts:36-51`.)
- **Dedup is handled:** a duplicate email hits the unique constraint (`23505`) → returns "Already subscribed" and sends nothing (no second code).

**What you should get when you submit your email:** footer = the plain welcome; contemplation-offer = the welcome with a 5% code. **Testable on the preview** — but only if `newsletter-welcome-5` exists **in test mode** in Stripe (the code-mint is wrapped in try/catch, so a missing test coupon fails silently and you'd get a welcome email with no code — likely why it felt untested). The welcome email itself sends via Resend regardless of mode.

## Two gaps to close

### Gap 1 — the code is shown as plain text, not a clickable URL

`subscribe.ts:79-81` builds the welcome email **inline** (and shows the code as text). There's already a branded shell that's better — `welcomeCouponEmailHtml` in `api/_emails/index.ts:103` — but `subscribe.ts:73` has a TODO and never uses it. And the front-end has **no** URL auto-apply: `assets/js/checkout.js:144 wirePromo()` only wires the manual `#promo-code` box + `[data-promo-apply]` button → `checkout.applyPromotionCode`. No reading of a `?promo=` / `?code=` query param anywhere.

### Gap 2 — Sean wants "a URL with the discount code built in"

So the welcome email should contain a ready-to-click link that lands the subscriber on the store with the code already applied.

## What's needed (executable later)

1. **Front-end — auto-apply a code from the URL.** On cart/checkout load, read `?promo=CODE` (pick one param name and keep it), prefill `#promo-code`, and auto-apply via the existing `checkout.applyPromotionCode` path (reuse `wirePromo`'s apply logic in `checkout.js` — don't duplicate it). Decide whether the cart page also honors it or only checkout. Show the same success/failure feedback the manual box shows. Guard against an invalid/expired code in the URL (fail gracefully, don't break the page).
2. **Email — use the branded shell + embed the link.** Switch `subscribe.ts` to `welcomeCouponEmailHtml` (kills the inline HTML + the TODO). Extend `WelcomeCouponEmailArgs` with an `applyUrl` and render a button: e.g. `https://everlastingsbyemaline.com/shop?promo=${code}` (or `/cart?promo=…`, matching whatever the front-end honors). Keep the code visible as text too (some clients strip buttons).
3. **Mirror for cart-recovery (optional but tidy):** `cartRecoveryCouponEmailHtml` (`_emails/index.ts:129`) has the same code-as-text shape — give it the same `applyUrl` treatment so both promo emails behave alike.

## Live observation + testing gap (flagged 2026-06-18)

On the **live** site, submitting an email subscribed the row (the `subscribers` table shows the insert) but **no welcome email arrived** within a few minutes. The DB insert and the Resend send are independent, and `subscribe.ts` **swallows a send failure silently** — `catch (mailErr) { console.error(...) }` and the API still returns "Subscribed" — so a delivery problem is invisible to the visitor and leaves no surface signal. Most likely cause: the production **Resend sending domain / `RESEND_FROM_EMAIL` isn't verified** (or the message is in spam, or the prod `RESEND_API_KEY` is restricted). First checks: Resend → Domains for `everlastingsbyemaline.com` verification, and Resend → Logs for the send attempt.

**Testing gap:** the newsletter **signup → welcome-email-delivered** path is not a numbered item in the testing docs and should be. Cover both variants and both modes, and assert **delivery** (not just the 200 — the silent-catch is exactly why a 200 isn't proof):
- footer form (`newsletter-footer`) → plain welcome email arrives;
- contemplation-offer form → welcome email **with a working single-use code** arrives (requires `newsletter-welcome-5` to exist in that mode);
- a duplicate email returns "Already subscribed" and sends nothing.

## Considerations

- **One param name, honored consistently** across email + cart + checkout (e.g. `?promo=`).
- **Validation:** the apply call already validates server-side via Stripe; the URL path just needs to fail quietly on a bad code.
- **Preview test:** seed `newsletter-welcome-5` in **test mode** so the contemplation-offer path can be exercised end-to-end on the preview (this is also the fix for "was it ever tested").
- **Analytics:** there's already a `promo_code_generated` GA event in the recovery flow (`recovery.js:119`) — consider a parallel "promo auto-applied from link" event.
