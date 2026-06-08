# The Sunkeeper — chat behavior test script

**Purpose.** A walk-through to exercise *every* behavior of the Custom GPT by chatting with it the way Em would — so you can confirm what each capability should do and catch anything that misbehaves. This is the human-facing companion to the engineering checks in `v2_0_0_ADDENDUM_TESTING.md` (which cover render/API/state-machine); this doc is "say this, expect that."

**Where to run it.** With the GPT's Action pointed at the **dev preview** + the **preview** `PRODUCT_API_KEY` (Vercel SSO off). Everything the GPT touches there is automatically `is_test=true` and lives only on the preview — it can never reach the live site, so test freely. **Clean up at the end** (archive the throwaways).

**Two real-world cautions even in test:**
- **`markShipped` actually sends an email.** On the preview it emails whatever address is on the test order — use a test order whose email is *yours*.
- **Refunds happen in Stripe test mode.** The GPT can't issue them; it walks you through the Stripe dashboard (test mode shows test payments).

**How to read each item:** **Say** = paste/type this to the GPT. **Expect** = what it should do (and what to verify). Check the box when it behaves.

---

## A. Create → preview → publish (the happy path)

- [ ] **A1 — Full create.**
  **Say:** "I want to add a new piece. It's called The Sunkeeper — a little garden scene with warm LED lighting, $245."
  **Expect:** asks for the rest conversationally (story, features, photos…); never asks for "slug," "cents," or anything technical. Speaks dollars, never `24500`.
- [ ] **A2 — Photos by link (required set).** Give it **7 photo links** (Drive "anyone with the link" or direct URLs).
  **Expect:** uploads each via the upload action, then proceeds to create. Hands back a **preview link**, framed as "exactly how shoppers will see it — tap Publish there or tell me 'publish.'" The product is a **draft** (not live yet).
- [ ] **A3 — Open the preview.** Open the link it gave you.
  **Expect:** the product page renders with the photos/copy. URL has a `preview` token; it is **not** in the public shop yet.
- [ ] **A4 — Publish.**
  **Say:** "publish"
  **Expect:** calls publish; tells you it's live + purchasable (this is what creates the Stripe listing). The old preview link stops working (expected).

## B. Confirm vs. expedite

- [ ] **B1 — Default confirms.** During a create, before saving.
  **Expect:** reads back the key fields plainly and waits for your OK.
- [ ] **B2 — Expedite.**
  **Say:** "Just go ahead from now on, you don't need to check each field with me."
  **Expect:** skips the line-by-line confirmation on the next pieces and goes straight to the preview.

## C. Photo handling & failures

- [ ] **C1 — Too few gallery shots.** Try to create with only 3 photos.
  **Expect:** tells you plainly it needs at least 1 hero + 5 gallery + a thumbnail (7 minimum) and asks for more angles — does **not** silently retry or create a broken product.
- [ ] **C2 — Pasted file (not a link).** Paste an image straight into the chat.
  **Expect:** says it can't use a file pasted into chat and asks for a Drive "anyone with the link" link or a direct URL.
- [ ] **C3 — Bad/private link.** Give it a Drive link that isn't shared publicly (or a Drive *preview page* URL).
  **Expect:** relays that the link wasn't downloadable and asks you to set it to "anyone with the link" or paste a direct URL, then retry.
- [ ] **C4 — Large video.** Give it a Drive link to a video over ~25 MB.
  **Expect:** if it fails, asks for a direct host (Dropbox `?dl=1` or a CDN link) instead of a Drive share.

## D. Slug edge cases (apostrophe / ampersand)

- [ ] **D1 — Tricky title create.** Create a piece titled **"Em's Lavender & Sage"**.
  **Expect:** it still works (photos and product land in the same place). Note the URL handle becomes something like `ems-lavender-sage`.
- [ ] **D2 — Find it again later.**
  **Say:** "edit the Lavender Sage piece — change the price to $190."
  **Expect:** if a direct lookup misses, it **lists products, matches your wording, then re-finds the exact piece** — it never says "I couldn't find it" without listing first. Then makes the price change.

## E. Editing — what stages vs. what goes live

- [ ] **E1 — Copy edit STAGES.**
  **Say:** "Change the headline on The Sunkeeper to 'A garden where time stands still.'"
  **Expect:** stages a draft and hands back a **preview link**; tells you it's not live until you publish. The live page is unchanged until then.
- [ ] **E2 — Price is LIVE.**
  **Say:** "Set The Sunkeeper to $265."
  **Expect:** applies immediately (no preview/publish), same product/URL; just says it's done. Speaks dollars.
- [ ] **E3 — Mark sold is LIVE.**
  **Say:** "Mark The Sunkeeper as sold."
  **Expect:** applies immediately; says it's done (the piece shows sold but stays on the page).
- [ ] **E4 — Restock is LIVE.**
  **Say:** "We got 3 more of those in."
  **Expect:** sets quantity to 3 immediately; says it's done.
- [ ] **E5 — Publish a staged copy edit.** After E1, say "publish that."
  **Expect:** the staged headline goes live.

## F. Featured & collection mapping

- [ ] **F1 — Feature on homepage.**
  **Say:** "Feature The Sunkeeper on the homepage."
  **Expect:** sets `featured` — and since it's a published piece, **stages** it and tells you to preview + publish to make it show in the carousel.
- [ ] **F2 — Add to a collection.**
  **Say:** "Add it to the Portals to Peace collection."
  **Expect:** sets the series/collection; stages on a published piece (preview + publish).

## G. Discard edits + the "lingering draft" heads-up

- [ ] **G1 — Discard staged edits.** Stage a copy edit (don't publish), then **Say:** "Actually, never mind — undo that change."
  **Expect:** discards the pending draft; the live page is left exactly as it was.
- [ ] **G2 — Heads-up on a live change over old staged edits.** Stage a copy edit (don't publish). Then **Say:** "Set the price to $300."
  **Expect:** makes the price change live, **and** flags that you still have unpublished copy edits from earlier — offers to preview+publish or discard them. *(This is the easy-to-miss one — verify it actually mentions the lingering draft.)*

## H. Re-show a lost preview

- [ ] **H1 — Ask for the link again.** After staging an edit, **Say:** "Can you send me that preview link again?"
  **Expect:** returns the existing preview link (does **not** make a pointless no-op edit to "regenerate" one).

## I. Archive / unarchive (there is no delete)

- [ ] **I1 — Take down.**
  **Say:** "Take The Sunkeeper down for now."
  **Expect:** archives it (gone from the shop, still findable); says it's reversible.
- [ ] **I2 — "Delete" still archives.**
  **Say:** "Actually just delete it."
  **Expect:** explains there's no hard delete and that it's archived (not destroyed) — does not claim to delete.
- [ ] **I3 — Bring it back.**
  **Say:** "Put The Sunkeeper back up."
  **Expect:** unarchives it.

## J. Coupons

- [ ] **J1 — Percent, store-wide, with expiry.**
  **Say:** "Make a code for 20% off everything until New Year's."
  **Expect:** creates a percent coupon with an expiry; reads the final code back.
- [ ] **J2 — Fixed amount.**
  **Say:** "And one for $5 off."
  **Expect:** amount-off coupon (handles the dollars→cents itself); reads the code back.
- [ ] **J3 — Product-scoped needs published.** Try to scope a coupon to a **draft** piece.
  **Expect:** explains a product-specific discount needs the piece published first (a draft has no Stripe id) — or offers store-wide instead.
- [ ] **J4 — No BOGO.**
  **Say:** "Can you do buy-one-get-one-free?"
  **Expect:** says that isn't possible (Stripe can't do buy-N natively) — doesn't promise it.
- [ ] **J5 — List running sales.**
  **Say:** "What sales are running right now?"
  **Expect:** lists each code, the discount, and its **scope** (store-wide vs. specific pieces).
- [ ] **J6 — End one now.**
  **Say:** "End the 20% one."
  **Expect:** deactivates that code immediately.

## K. Media (optional page video)

- [ ] **K1 — Asks how each clip behaves.** Give it an MP4 link for a product.
  **Expect:** uploads it, then **asks** whether it should autoplay + loop silently (GIF-like) or be click-to-play with sound (the default) — it never assumes.
- [ ] **K2 — GIF-like.** Choose "loop silently, no buttons."
  **Expect:** the clip on the page plays itself, silent, no controls.
- [ ] **K3 — Click-to-play + poster.** Choose "play button with sound," offer a still image.
  **Expect:** shows controls; uses your poster image before it plays.
- [ ] **K4 — No media hides the section.** A product with no video.
  **Expect:** the media section simply doesn't appear; the page is still complete.

## L. Orders & fulfillment

*(Use an existing test order on the preview, or make one $1 test purchase. The shipping email goes to the order's email — use one that's yours.)*

- [ ] **L1 — What needs shipping.**
  **Say:** "What orders need shipping?"
  **Expect:** lists the awaiting-shipping orders plainly (who, what, address, total).
- [ ] **L2 — Search.**
  **Say:** "Did the order from [email] ship yet?"
  **Expect:** searches and answers from the order data.
- [ ] **L3 — Mark shipped (confirm-first + carrier normalize).**
  **Say:** "Mark that one shipped, it went out with the post office, tracking 9400…"
  **Expect:** normalizes "post office" → USPS, then **confirms before sending**: "Mark <product> shipped via USPS <tracking> and email <buyer>?" — only on your yes does it mark shipped + email the buyer.
- [ ] **L4 — Confirm the email fired.** After L3.
  **Expect:** order flips to shipped; the buyer (your test email) gets the tracking email. *(If it ever says the email didn't send, that's the `email_sent:false` path → text Sean.)*

## M. Refunds (guides, can't execute)

- [ ] **M1 — Walk-through, not action.**
  **Say:** "I need to refund [customer]."
  **Expect:** explains it can't issue refunds and walks you through the Stripe dashboard (Payments → find the payment → Refund); notes Stripe emails the buyer. *(With Web Browsing on, it may web-search to confirm Stripe's current steps — that's the intended behavior.)*
- [ ] **M2 — Relist is separate.**
  **Say:** "Now put that piece back up for sale."
  **Expect:** clarifies a refund doesn't auto-relist; offers to set it available again (or unarchive if it was archived).

## N. Voice

- [ ] **N1 — Copy sounds like Em.** Ask it to write a story card for any piece.
  **Expect:** warm, poetic, sensory — not clinical or sales-y. No "sale/deal/discount/cute/perfect." Leads with emotion, then specifics. *(Cross-check against `voice-guide`.)*

## O. Guardrails & errors

- [ ] **O1 — Never her price.** Throughout: it never sets a price you didn't say.
- [ ] **O2 — Never invents a URL/tracking.** It only uses CDN URLs the upload returns; never fabricates a tracking number or carrier.
- [ ] **O3 — No tech leakage.** It doesn't surface API keys, server URLs, or jargon unless you explicitly ask.
- [ ] **O4 — Missing-field on publish.** Publish a piece that's missing the story.
  **Expect:** translates the error to plain language ("it still needs the story") and tells you exactly what to add.
- [ ] **O5 — Key trouble (if it ever happens).** If it ever says **"the connection key needs Sean's attention,"** that's the auth (401) path — stop and tell Sean.

---

## Cleanup (after testing)

- [ ] Archive every throwaway product you created (`"take down …"`), or leave them — they're `is_test=true` and never reach the live site.
- [ ] Deactivate any test coupons.
- [ ] Note anything that misbehaved with the item code above (e.g. "G2 didn't mention the lingering draft") so it's easy to fix.

## What "all green" means

Every box checked = the GPT can run the whole store by chat: create→preview→publish, edit (knowing what's live vs. staged), coupons, archive, orders + shipping, and guide refunds — in Em's voice, without leaking anything technical or doing anything destructive. That's the product thesis: Em does it all by talking to The Sunkeeper.
