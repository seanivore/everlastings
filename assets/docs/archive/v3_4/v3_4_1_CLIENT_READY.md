# Everlastings — Client-Ready Checklist

  The plain list of what's left to take the store live and hand it to Em. Work it top to bottom. Claude verifies each step on the server side as you go.

## Where it stands

  + The store (v3.3) is built and on dev, moved to your SEANIVORE Vercel account
  + Em's GPT is loaded with the current v3.3.0 schema, instructions, and knowledge — pointed at dev for testing
  + The homepage hero is reverted to the clean version already live on prod (the fancy one is parked in v3_4_1_HERO_NEXT.md)
  + Everything below is a short, ordered path — test on dev, ship, one live test, hand off

## Left to go live

### Test on dev — Stripe test mode

  + [ ] Chat-photo upload — the one new thing never tested end to end
    - In the GPT: attach a photo, "create a product called … with this as the hero"
    - It should upload to the CDN and build the piece
    - Claude confirms the image landed and the product row exists

  + [ ] Refund — both surfaces
    - GPT: "refund <buyer>'s order for <piece>" → it reads back, confirms, refunds, offers to relist
    - /admin: buy a 3-piece cart, refund one → only that piece refunds and relists, the other two stay sold and buyable
    - A full-amount refund flips the order to refunded; a double-click still makes only one refund

  + [ ] Store tools in /admin
    - Coupons: make one with a minimum, confirm it reads back "$50.00" not a raw number, then end it
    - Media editor: add an MP4 or YouTube row, set the no-buttons vs click-to-play toggle, save, reopen
    - Image zones: the seo_thumbnail and checkout_image zones actually set those fields
    - States and filters: live / draft / sold / archived badges, the filter, the back-to-products nav

### Ship

  + [ ] Fast-forward dev → main and tag v3.3.0 (Claude runs it on your go)

  + [ ] Switch the GPT to production
    - Schema line 7 url → https://everlastingsbyemaline.com
    - Auth → the Production PRODUCT_API_KEY
    - Web Browsing stays on

### Prove it live

  + [ ] One real $1 buy + refund on production
    - The only thing test mode can't prove — confirms the live keys, the live webhook, and the receipt
    - Buy with a real card → the order shows in /admin, you get the "new order" email, the buyer gets a Stripe receipt
    - Refund it in Stripe → the order flips to refunded

### Hand off

  + [ ] Give Em the welcome walkthrough and her logins
    - The walkthrough is v3_4_1_WELCOME_EM.md
    - Her /admin login and the service-login sheet are in the reference below

## Known blocker — Em's side

  + Em's /admin login and the "new order" emails depend on the Google Workspace email (admin@everlastingsbyemaline.com) being fixed — that's hers to sort
  + The store and the GPT both work regardless, so this does not block going live

## Reference

### Who owns what

  + Vercel — hosting, deploys, env, crons (yours)
  + Supabase — database, auth, Studio (admin access for Em)
  + Domain registrar — everlastingsbyemaline.com points at Vercel
  + Stripe — payments, coupons, refunds, receipts
  + Resend — all customer email
  + Cloudflare R2 — product-media CDN
  + Cloudinary — image transform, not a host
  + Shippo — shipping labels
  + ChatGPT — the Sunkeeper GPT (Em's account)
  + Google Workspace + GA4 — the admin@ email and analytics

  Full detail is in v2_0_0_GO_LIVE.md §5.

### Email map

  + Receipt → buyer — from Stripe (the only email Stripe sends)
  + "New order" → Em — from Resend (the fulfillment heads-up)
  + "Your haven is on its way" → buyer — from Resend (when you add tracking)
  + Newsletter welcome → subscriber — from Resend (footer form is plain; the offer form adds a 5% code)
  + "A small apology, X% off" → would-be buyer — from Resend (when a held piece sold before they checked out)

  Full detail is in v2_0_0_GO_LIVE.md §4.
