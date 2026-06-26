# Everlastings — Client-Ready Checklist

  The plain list of what's left to take the store live and hand it to Em. Work it top to bottom. Claude verifies each step on the server side as you go.

## Where it stands

  + The store (v3.3) is built and on dev, moved to your SEANIVORE Vercel account
  + Em's GPT is loaded with the current v3.3.0 schema, instructions, and knowledge — pointed at dev for testing
  + The homepage hero is reverted to the clean version already live on prod (the fancy one is parked in v3_4_1_HERO_NEXT.md)
  + Everything below is a short, ordered path — test on dev, ship, one live test, hand off

## Left to go live

### Test on dev — set up, sell, refund (Stripe test mode)

  One natural flow instead of scattered checks: build two real pieces (one by chat, one in the dashboard), leave them on the dev site as Em's preview, then buy and refund them. Every test item gets covered along the way, and Claude verifies each step on the server side.

#### Flow 1 — "The Letter Room", built by chat (the Sunkeeper)

  + [ ] In the GPT, attach the photos, ask it to create the piece below, let it write the copy and hand back a preview, then publish
    - Proves the chat-photo upload (the one new thing never tested end to end) + create-by-chat
    - The schema is new, so let it walk you through; Claude confirms the photos hit the CDN and the row is in the database

  The piece:

    - Name: The Letter Room
    - Series: Story Lofts
    - Price: $245 · Quantity: 1 · Featured
    - Headline: For the letters we never stopped writing
    - Description: A miniature writing room at dusk, one lamp lit over a desk where a letter waits, half-finished — for everyone still keeping a correspondence with someone the world has carried out of reach.
    - Story: Some evenings the rain finds the window first, and the lamp comes on without being asked. The Letter Room is that hour — a small desk, a cup gone cool, a page begun and set down and begun again. It keeps a light on for the letters we go on writing to the people we can no longer send them to. Built in basswood and resin, lit by a warm LED you can turn low, and small enough to keep where you'll see it last thing at night.
    - Dimensions: 8" W x 5" D x 9" H · 2.1 lbs
    - Materials: basswood, resin, brass-finish lamp, miniature paper, warm LED
    - Power: USB-C (adapter included) · Ships: 3-5 business days, insured
    - Photos: a hero plus a few gallery shots — attach from your computer

#### Flow 2 — "The Tide-Glass Lantern", built in /admin (your first time)

  + [ ] Log in, add the piece below by hand, drop in the hero image and the looping clip, set the social + checkout images in their slots, publish
    - Proves /admin create + the media editor (the clip row + the loop / click-to-play toggle) + the image zones (seo_thumbnail + checkout_image) + the state badges
    - This is your first /admin build, so go slow and notice the flow

  The piece:

    - Name: The Tide-Glass Lantern
    - Series: Portals to Peace
    - Price: $210 · Quantity: 1
    - Headline: A small light that keeps the dark company
    - Description: A miniature harbor lantern with a slow-turning glow, the kind left burning on a sill for whoever is still out on the water — for the nights that need a little keeping.
    - Story: On the far edge of Elsewhere there is a lantern that never quite goes out — it turns, slow as breathing, throwing warm light across the glass and the water beyond. The Tide-Glass Lantern is a haven for the long nights, a steady thing to set on the shelf when you need proof that the dark can be kept company. Hand-built in resin and brass-finish, lit by a warm LED with a gentle turning glow.
    - Dimensions: 6" W x 6" D x 11" H · 2.4 lbs
    - Materials: resin, brass-finish, frosted glass, warm LED
    - Power: USB-C (adapter included) · Ships: 3-5 business days, insured
    - Media: a hero image + one looping clip (set it to loop, no buttons) + a square checkout image + a wide social image

#### Flow 3 — Make a sale, then buy with it

  + [ ] Make a coupon — try the /admin Coupons tab, or ask the GPT — say 15% off everything, or $25 off over $200
    - Confirm it reads back as real money ("$25.00", "$200.00 minimum"), not a raw number
  + [ ] Put both pieces in one cart, apply the code at checkout, finish the test purchase
    - Proves coupons + the code actually applying at checkout (never tested) + the buy flow + both pieces going sold

#### Flow 4 — Refund two ways

  + [ ] Refund "The Letter Room" with the Sunkeeper and relist it → it comes back live and buyable
  + [ ] Refund "The Tide-Glass Lantern" in /admin and don't relist → it stays sold
    - Proves refunds on both surfaces + relist-or-not + a full refund flipping the order to refunded
    - While you're in /admin, double-click Refund once → only one refund should land
    - Leaves the dev site with one live piece and one sold piece — a real preview for Em

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
