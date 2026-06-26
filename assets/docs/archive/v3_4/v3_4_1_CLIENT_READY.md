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

  + [x] In the GPT, attach the photos, ask it to create the piece below, let it write the copy and hand back a preview, then publish
    - Proves the chat-photo upload (the one new thing never tested end to end) + create-by-chat
    - The schema is new, so let it walk you through; Claude confirms the photos hit the CDN and the row is in the database

#### Flow 2 — "The Tide-Glass Lantern", built in /admin (your first time)

  + [x] Log in, add the piece below by hand, drop in the hero image and the looping clip, set the social + checkout images in their slots, publish
    - Proves /admin create + the media editor (the clip row + the loop / click-to-play toggle) + the image zones (seo_thumbnail + checkout_image) + the state badges
    - This is your first /admin build, so go slow and notice the flow

  **Feedback for update after shipping to client**: 
    - The layout is a mess and the flow is confusing; it asks for video before it even shows that you can upload video and I thought we didn't add the feature at first 
    - The SEO thumbnail upload was not copying over into the form field which also seems redundant anyway 
    - There was an overhang of the button descriptions for each upload, it was messy, honestly sort of looked like no one gave the design much thought
    - Why is it so easy for LLM to create a great UI for front end on first try, but Admin page is always ugly? Why are we treating them different at all? Historically this was to save resources because it took humans eternity to code even the simplest looking page, but LLM can make a beautiful page in minutes, so why would we not want the admin page to look beautiful? This feels like a huge oversight AND a huge edge ahead of competition because everyone else is still working that the same old mentality that we are apparently still stuck in when it comes to the admin page. The customer is as important to me as their shoppers. They need to be happy with frontend and back end. No reason other than human effort in the past was admin page ever left ugly. 

#### Flow 3 — Make a sale, then buy with it

  + [ ] Make a coupon — try the /admin Coupons tab, or ask the GPT — say 15% off everything, or $25 off over $200
    - Confirm it reads back as real money ("$25.00", "$200.00 minimum"), not a raw number

  **Feedback that must be working before final handoff to client**: 
    - There is no reason for GPT not to have full access to all the normal coupon or discount abilities. This should be the mentality for literally everything that can be done in Stripe. They have full access. Here is the conversations, but they didn't know how/or if they could set a discount for the entire store for any shoppers without giving me a code -- which makes no sense that's just not how an online sale works when it is store wide or like a holiday. If it was a holiday and you were giving a coupon code to you newsletter subscribers, the is one thing and seems like it knows how to do that. But it is just as common if not even  more common to run a sale for the holiday that doesn't require a checkout code. We need to be able to set that up easily. Also, it suggested that "Stripe just wouldn't let someone apply multiple coupons during checkout, for example the site-wide discount and the $25-off for spending more than $200. Maybe that is the case but I find it highly unlikely that a company like Stripe would make that the default without a simple way to set it up when creating a coupon. Given the trouble GPT had, I didn't even try the /admin because I can't imagine it would be any better. Here is the conversation from GPT. Frankly, it seems like we should probably try to get everything possible into the schema, but otherwise, considering they are capable, then should be just be attaching the API Docs to the EXTENDED KNOWLEDGE and telling them to use it only if they must, making it clear that they can do things that Stripe allows. If the aren't sure they they would probably even want to search the web?? Like this all just seems like common sense, no? It is acting forced limited by the schema. 

```
Hey -- can you please set a coupon for 15% off of everything, or $25 off purchases over $200
Thought for a couple of seconds

I can do either one — just need your blessing on which shape:

Option A: 15% off everything, store-wide.
Option B: $25 off orders of $200 or more, store-wide.

Do you want a specific code, an expiration date, or a redemption limit? Coupons can be percent-off or fixed-amount with optional minimums and expiry.

Can you please do the 15% for store wide, but the Option B as a checkout code that can only be used once. And it shouldn't let people who have checkout code coupons also get the 15% off store wide
Thought for a few seconds

Yes — I can set that up as two separate store-wide coupons:

1. 15% off everything
Store-wide, no minimum. This would be a normal coupon/code, not tied to a specific piece.

2. $25 off purchases over $200
Store-wide checkout code, one use total, with a $200 minimum order.

One important note: I don’t have a separate “do not combine with other codes” switch in the coupon tool. Usually checkout only accepts one promotion code at a time, so shoppers shouldn’t be able to stack the $25 code with the 15% code. I just want to be plain about the limitation before I create it.

What code would you like for the $25 off one-time checkout code? And do you want the 15% code to have a specific code too, or should I let the system generate one?

Weird. Is there a character limit on the schema do you know? I'll have to check. because you have full access for all Stripe capabilities so you  not being able to do something any online store can do would be a result of not knowing the API details. For the 15% discount, it should apply to everyone and anyone shopping buying anything -- meaning we wouldn't be giving them a code... I would like a code for the $25 off the $200+ purchase though please make it HAPPY_BIRTHDAY_MARK if possible. I'll see if it let's me or blocks me from using two discounts automatically though I'm not accustomed to Stripe working that way without being set up that way. Perhaps we might just need to put the entire Stripe API docs as one of your KNOWLEDGE uploads. It seems kind of extra but given you have all the end points and have full access, it might be the most logical. Will look into it!

That makes sense — the mismatch is between what Stripe itself can do and what this studio action currently exposes to me. I’ll set the birthday code now, then I’ll be plain about the no-code 15% piece.

Talked to everlastings-git-dev-seanivore.vercel.app
Thought for 6s

Done — HAPPY_BIRTHDAY_MARK is live as a checkout code:

$25 off orders of $200+
Code: HAPPY_BIRTHDAY_MARK
Limit: one total use
Expiry: none set

And you’re right to question the distinction. Stripe’s API supports both customer-entered promotion codes and discounts applied directly to a Checkout Session. The current studio action I have for coupons creates a coupon plus a shareable promotion code; it does not expose a “silently apply this 15% to every checkout” setting. Stripe’s Checkout API docs also say only one discount may be specified on a Checkout Session, which supports your hunch that stacking is usually controlled at the checkout/session layer, not just the coupon layer.

So the clean implementation would be:

Automatic 15% store-wide: Sean likely needs to apply a 15% coupon directly when creating Checkout Sessions, not as a customer code.

Birthday code: already created as HAPPY_BIRTHDAY_MARK; because Checkout only accepts one specified discount on a Session, the store logic should choose either the automatic 15% or the entered promo code, not both. Stripe promo codes can also carry minimum purchase and max-redemption restrictions, which is exactly what we used here.

There isn’t a character-limit issue in the action schema from what I can see here; it’s more that this particular action is intentionally narrow, while Stripe’s full API has more checkout-level controls.
```


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
