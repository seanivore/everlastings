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

## CONFIRMED BUG — the email-capture forms never call the API (root cause, 2026-06-18)

> **STATUS — core fix APPLIED 2026-06-18 (on `dev`).** The event-target fix (`main.js:173` now listens on `window`) and the duplicate-status fix (`subscribe.ts` returns **409**) are committed. Capture + the welcome / 5% email now fire on the dev preview, and the "you're already on the list" message (`main.js:254`) now reaches duplicates. **Still open (intentionally deferred to keep the fix minimal + low-risk):** the unconditional success-toast rework (`ui.js:93`) and the delivery-assert test below. Reaches **production** only on the next `dev → main` ship.

Live, a signup showed "You're on the list" but **no email sends — and Resend has no send attempt in its logs *or* metrics.** The domain is verified and order/shipping emails arrive fine, so it is **not** a Resend/domain/spam problem (my earlier guess was wrong). Root cause is a **frontend event-target mismatch**:
- `ui.js:89` dispatches the submit event on **`window`**: `window.dispatchEvent(new CustomEvent('email-cta-submit', …))`.
- `main.js:173` — the listener that actually POSTs to `/api/subscribe` — listens on **`document`**: `document.addEventListener('email-cta-submit', …)`.
- An event dispatched on `window` does not reach a `document` listener, so **the POST never fires.** `/api/subscribe` (and therefore Resend) is never called.

This affects **every email-cta form**, not just the newsletter — product-interest "notify me," the cart-exit modal, the footer / homepage / shop-empty newsletter forms, and the contemplation-offer 5% popup all dispatch through the same path. (The lone `subscribers` row is from `checkout.ts`'s `source:'checkout-started'` upsert, not a form.) The "You're on the list" toast is **unconditional** (`ui.js:93`, fires regardless of the API), which masked the breakage.

**The fix (one line):** make the dispatch and the API listener share a target. Cleanest: change `main.js:173` to `window.addEventListener('email-cta-submit', …)` — everything else in the flow already uses `window` (the success / already-subscribed events at `main.js:184/234`, and ui.js's own `window` listener at `:178`). Equivalent: change `ui.js:89` to `document.dispatchEvent`.

**Fix these adjacent issues at the same time:**
- **Status mismatch:** `subscribe.ts` returns **200** `{message:'Already subscribed'}` for a duplicate (`23505`), but `main.js:189` branches on **409** — so once the POST works, duplicates fall into the *success* branch. Align them (return 409, or branch on the message).
- **Unconditional success toast** (`ui.js:93`): show the real outcome — success vs. error vs. already-subscribed — not always "You're on the list."
- **"Already on the list" UX (Sean's call):** when the email already exists, say so distinctly ("You're already on the list") rather than implying a fresh signup — so someone can't keep re-submitting hoping for another 5% (the single-use code only mints on a *new* contemplation-offer insert anyway, but the messaging should be honest).

**Testing gap:** the **signup → welcome-email-DELIVERED** path is not a numbered item in the testing docs and must be — assert **delivery** (a 200 isn't proof; `subscribe.ts`'s silent `catch (mailErr)` would hide a real send failure too, even after the dispatch bug is fixed). Cover: footer form → plain welcome; contemplation-offer → welcome **with a working single-use code** (needs `newsletter-welcome-5` in that mode); duplicate → "already on the list," no send.

## Considerations

- **One param name, honored consistently** across email + cart + checkout (e.g. `?promo=`).
- **Validation:** the apply call already validates server-side via Stripe; the URL path just needs to fail quietly on a bad code.
- **Preview test:** seed `newsletter-welcome-5` in **test mode** so the contemplation-offer path can be exercised end-to-end on the preview (this is also the fix for "was it ever tested").
- **Analytics:** there's already a `promo_code_generated` GA event in the recovery flow (`recovery.js:119`) — consider a parallel "promo auto-applied from link" event.
