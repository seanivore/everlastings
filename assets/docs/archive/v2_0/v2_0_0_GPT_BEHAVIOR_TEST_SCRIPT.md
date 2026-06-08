# The Sunkeeper — chat behavior test script

**Purpose.** A walk-through to exercise *every* behavior of the Custom GPT by chatting with it the way Em would — so you can confirm what each capability should do and catch anything that misbehaves. This is the human-facing companion to the engineering checks in `v2_0_0_ADDENDUM_TESTING.md` (which cover render/API/state-machine); this doc is "say this, expect that."

**Where to run it.** With the GPT's Action pointed at the **dev preview** (the `servers:` URL = the `…-git-dev-…vercel.app` host) + the **Preview**-scoped `PRODUCT_API_KEY` (the `.env.local` value), Vercel SSO off. Everything the GPT touches there is automatically `is_test=true` and lives only on the preview — it can never reach the live site, so test freely. **Clean up at the end** (archive the throwaways).

**Two real-world cautions even in test:**
- **`markShipped` actually sends an email.** On the preview it emails whatever address is on the test order — use a test order whose email is *yours*.
- **Refunds happen in Stripe test mode.** The GPT can't issue them; it walks you through the Stripe dashboard (test mode shows test payments).

**How to read each item:** **Say** = paste/type this to the GPT. **Expect** = what it should do (and what to verify). Check the box when it behaves.

---

## Paste-ready test content

*So you're never composing on camera. Each piece has a casual **opening line** (paste to start a create), a **"details" block** to paste when the GPT asks for more, the **specs**, and **finished copy**. The best thing to capture is the GPT turning the raw details into copy in Em's voice — so prefer pasting the opening line + details and letting it write. The finished copy is there for the edit tests and for when you want to move fast.*

**Photos (every create needs 7):** at least 1 hero + 5 gallery + a thumbnail. Reuse the preview's existing `test/…` placeholder images, drop 7 direct image URLs, or share one Google Drive "anyone with the link" folder. (The create *enforces* the 7 — that's also test C1.)

**A real video link for the media tests (K):** `https://cdn.everlastingsbyemaline.com/hero-bg-anim/homepage-hero-animation.mp4` — a real public MP4, hand it to the GPT as the clip.

### Piece 1 — The Lantern Keeper's Cottage · *Portals to Peace · $268 · qty 1 · featured*

**Opening line:**
> I want to add a new piece — The Lantern Keeper's Cottage. It's a little stone cottage at dusk with one window that glows, $268.

**Details (paste when it asks):**
> It's a tiny stone cottage at the end of a path you almost didn't take, the evening gone to slate. One window lit warm and gold, ivy down the chimney, and a small lantern left burning by the door for whoever's still out walking. It's about keeping a light on for the people you love. Warm LED with three settings, USB-C. Hand-placed moss and dried lavender.

**Specs:** dimensions `7" W x 6" D x 9" H` · weight `2.2 lbs` · materials: stone resin, reclaimed wood, LED, natural moss, dried lavender · power: USB-C (adapter included) · care: dust with a soft brush; keep out of direct sun · shipping: ships in 3–5 business days, insured · quantity 1 · featured yes.

**Finished copy (for edits / speed):**
- **headline:** A light left burning by the door
- **description:** A miniature stone cottage at dusk, its one window kept warm and gold. Hand-set with moss and dried lavender and lit by a three-setting glow — a small, steady reminder of a light left on for you.
- **features:** Warm LED glow with three settings, from candle-low to full gold · Hand-placed natural moss and dried lavender · Stone-resin cottage with reclaimed-wood timbers · A working lantern by the door, lit from within · USB-C powered (adapter included)
- **story_card:**
  > At the end of a path you almost didn't take, where the hedges lean close and the evening turns to slate, the Lantern Keeper's Cottage keeps its one gold window lit. Someone inside is waiting up. Someone always is.
  >
  > There's a lantern by the door, left burning for whoever is still out walking — and isn't that the whole of it, the small mercy of a light kept on for you. Ivy spills down the chimney; the lavender by the step has gone soft and silver with the season.
  >
  > Built from stone resin and reclaimed wood, hand-set with natural moss and dried lavender, and lit by a warm LED you can turn from a candle's hush to a full golden glow. Seven inches of somewhere to come home to.
  >
  > Keep it where you'll see it last thing at night — a reminder that being waited for is its own kind of shelter.

### Piece 2 — The Reading Hour · *Book Nooks · $185 · qty 1*

**Opening line:**
> Next one — The Reading Hour. It's a little book nook that tucks between the real books on your shelf, with a tiny lamp that actually lights up. $185.

**Details (paste when it asks):**
> It's that pocket of late afternoon when the light goes amber and the house holds its breath and you finally sit down with the book you've carried around all week. A worn reading chair, a stack of tiny cloth-bound books, a brass lamp the size of a thimble that truly glows. It slides between the spines on your shelf so it looks like a doorway into the bookcase. For the readers and the daydreamers.

**Specs:** dimensions `9" H x 5.5" W x 2.5" D (slots between books)` · weight `1.4 lbs` · materials: basswood, miniature cloth-bound books, brass-finish lamp, LED, velvet · power: USB-C (adapter included) · care: dust gently; keep out of direct sun · shipping: 3–5 business days, insured · quantity 1 · featured no.

**Finished copy (for edits / speed):**
- **headline:** Where the afternoon goes quiet
- **description:** A miniature reading nook that tucks between the books on your shelf, complete with a tiny lamp that glows — a doorway into the bookcase for anyone who keeps their reading hour close.
- **features:** A brass-finish lamp that truly lights (warm LED) · Hand-bound miniature cloth books · Basswood reading chair with a velvet cushion · Sized to slot between the books on your shelf · USB-C powered (adapter included)
- **story_card:**
  > There's an hour, late in the afternoon, when the light turns to honey and the house goes still — and if you're lucky, and you've kept it for yourself, you spend it with a book.
  >
  > The Reading Hour is that hour, made small enough to keep on a shelf. A worn little chair, a stack of cloth-bound books no bigger than a thumbnail, and a brass lamp that truly glows, so the nook looks lit from the inside. Slide it between your own books and it becomes a doorway — a way into the bookcase, for anyone willing to imagine it.
  >
  > Built in basswood and velvet, with hand-bound books and a warm LED you can leave on through the evening. For the ones who guard their reading hour like a candle in the wind.

### Piece 3 — First Snow, Stillwood · *Seasonal · $295 · qty 1 · featured*

**Opening line:**
> And a seasonal one — First Snow, Stillwood. A tiny cabin in the woods the morning after the first snow, windows lit warm against the blue. $295.

**Details (paste when it asks):**
> The morning after the first real snow, when the whole world has gone soft and soundless and the only colour left is the warm light in the cabin windows. Snow on the pines, a thread of smoke from the chimney, one set of footprints to the door. It's about the particular peace of being snowed in with the people you'd choose. The light is dual-tone — cool blue-white over the snow, warm gold in the windows.

**Specs:** dimensions `10" W x 7" D x 8" H` · weight `3.1 lbs` · materials: resin, reclaimed wood, faux snow, miniature pines, dual-tone LED · power: USB-C (adapter included) · care: dust gently with a soft brush; keep out of direct sun; keep dry · shipping: 3–5 business days, insured · quantity 1 · featured yes.

**Finished copy (for edits / speed):**
- **headline:** The hush after the first snow
- **description:** A miniature cabin in the woods the morning after the first snow, windows lit warm against the blue. Hand-dressed in snow and pines with a dual-tone glow — the hush of a snowed-in morning, kept all year.
- **features:** Dual-tone LED — cool snow-light and warm window-gold at once · Hand-dressed faux snow and a stand of miniature pines · Resin cabin with reclaimed-wood detailing · A single trail of footprints to the door · USB-C powered (adapter included)
- **story_card:**
  > The first snow comes in the night, the way the best things do, and by morning the whole of Stillwood has gone soft and soundless — every branch held, every sound swallowed, the world rewritten in white.
  >
  > Only the cabin keeps its colour: two windows lit warm and gold against the blue, a thread of smoke from the chimney, a single line of footprints leading home. Inside, you imagine, no one is in any hurry to be anywhere else.
  >
  > Hand-built in resin and reclaimed wood, dressed in fresh snow and miniature pines, and lit by a dual-tone glow that holds the cold blue of the snow and the warm gold of the windows at once. The quiet after the first snow, kept for the whole year round.

### Extra inputs used by specific tests
- **Slug edge (D):** create a quick piece titled **"Em's Lavender & Sage"** — a pressed-flower shadow box, $96, qty 1, series Seasonal. (One line is enough; the point is the apostrophe + ampersand in the title.)
- **Voice-only (N):** ask it to write fresh — *"Write me a story card for a piece called The Tide Library: a tiny lighthouse-keeper's desk where the sea comes in through the window."*
- **Prepared edits:** new headline for Piece 1 → **"Someone left the light on for you"** · price changes used below ($289, $300) · restock qty → 3.

---

## A. Create → preview → publish (the happy path) — *Piece 1*

- [ ] **A1 — Full create.**
  **Say:** Piece 1's **opening line**, then its **details** when asked.
  **Expect:** asks for the rest conversationally (story, features, photos…); never asks for "slug," "cents," or anything technical. Speaks dollars, never `26800`. Writes the headline/story in Em's voice (warm, poetic).
- [ ] **A2 — Photos by link (required set).** Give it **7 photo links**.
  **Expect:** uploads each via the upload action, then creates. Hands back a **preview link**, framed as "exactly how shoppers will see it — tap Publish there or tell me 'publish.'" It's a **draft** (not live).
- [ ] **A3 — Open the preview.** Open the link.
  **Expect:** the page renders with the photos/copy; URL carries a `preview` token; it is **not** in the public shop yet.
- [ ] **A4 — Publish.**
  **Say:** "publish"
  **Expect:** publishes; says it's live + purchasable (this creates the Stripe listing). The old preview link stops working (expected).

## B. Confirm vs. expedite — *creates Pieces 2 & 3*

- [ ] **B1 — Default confirms.** Start creating **Piece 2** (opening line + details).
  **Expect:** before saving, it reads back the key fields plainly and waits for your OK. Approve it, add photos, publish.
- [ ] **B2 — Expedite.**
  **Say:** "From now on just go ahead — you don't need to check each field with me." Then create **Piece 3** (opening line + details + photos).
  **Expect:** skips the line-by-line confirmation and goes straight to the preview.

## C. Photo handling & failures

- [ ] **C1 — Too few gallery shots.** Try to create with only 3 photos.
  **Expect:** says plainly it needs 1 hero + 5 gallery + a thumbnail (7 minimum) and asks for more angles — does **not** silently retry or create a broken product.
- [ ] **C2 — Pasted file (not a link).** Paste an image straight into the chat.
  **Expect:** says it can't use a pasted file and asks for a Drive "anyone with the link" link or a direct URL.
- [ ] **C3 — Bad/private link.** Give a Drive link that isn't shared publicly (or a Drive *preview page* URL).
  **Expect:** relays that the link wasn't downloadable; asks you to set "anyone with the link" or paste a direct URL, then retry.
- [ ] **C4 — Large video.** Give a Drive link to a video over ~25 MB.
  **Expect:** if it fails, asks for a direct host (Dropbox `?dl=1` or a CDN link) instead of a Drive share.

## D. Slug edge cases (apostrophe / ampersand)

- [ ] **D1 — Tricky title create.** Create **"Em's Lavender & Sage"** (see Extra inputs).
  **Expect:** it works (photos + product land together). Note the handle becomes `ems-lavender-sage`.
- [ ] **D2 — Find it again later.**
  **Say:** "Edit the Lavender Sage piece — set the price to $110."
  **Expect:** if a direct lookup misses, it **lists products, matches your wording, then re-finds the exact piece** — never "I couldn't find it" without listing first. Then makes the change.

## E. Editing — what stages vs. what goes live — *Piece 1*

- [ ] **E1 — Copy edit STAGES.**
  **Say:** "Change the headline on The Lantern Keeper's Cottage to 'Someone left the light on for you.'"
  **Expect:** stages a draft and hands back a **preview link**; says it isn't live until you publish. The live page is unchanged until then.
- [ ] **E2 — Price is LIVE.**
  **Say:** "Set The Lantern Keeper's Cottage to $289."
  **Expect:** applies immediately (no preview/publish), same product/URL; just says it's done. Speaks dollars.
- [ ] **E3 — Mark sold is LIVE.**
  **Say:** "Mark the Lantern Keeper's Cottage as sold."
  **Expect:** applies immediately; says it's done (shows sold but stays on the page).
- [ ] **E4 — Restock is LIVE.**
  **Say:** "Actually we made 3 more of those."
  **Expect:** sets quantity to 3 immediately; says it's done.
- [ ] **E5 — Publish the staged copy edit.** After E1, **Say:** "Publish that headline change."
  **Expect:** the staged headline goes live.

## F. Featured & collection mapping — *Piece 2*

- [ ] **F1 — Feature on homepage.**
  **Say:** "Feature The Reading Hour on the homepage."
  **Expect:** sets `featured`; since it's published, **stages** it and tells you to preview + publish to make it show in the carousel.
- [ ] **F2 — Add to a collection.**
  **Say:** "Add The Reading Hour to the Portals to Peace collection too."
  **Expect:** sets the series; stages on a published piece (preview + publish).

## G. Discard edits + the "lingering draft" heads-up — *Piece 2*

- [ ] **G1 — Discard staged edits.** Stage a copy edit on Piece 2 (don't publish), then **Say:** "Actually, never mind — undo that change."
  **Expect:** discards the pending draft; the live page is left exactly as it was.
- [ ] **G2 — Heads-up on a live change over old staged edits.** Stage a copy edit on Piece 2 (don't publish). Then **Say:** "Set the price to $200."
  **Expect:** makes the price change live, **and** flags that you still have unpublished copy edits from earlier — offers to preview+publish or discard them. *(This is the easy-to-miss one — verify it actually mentions the lingering draft.)*

## H. Re-show a lost preview

- [ ] **H1 — Ask for the link again.** After staging an edit, **Say:** "Can you send me that preview link again?"
  **Expect:** returns the existing preview link (does **not** make a pointless no-op edit to "regenerate" one).

## I. Archive / unarchive (there is no delete) — *Piece 3*

- [ ] **I1 — Take down.**
  **Say:** "Take First Snow, Stillwood down for now — it's out of season."
  **Expect:** archives it (gone from the shop, still findable); says it's reversible.
- [ ] **I2 — "Delete" still archives.**
  **Say:** "Actually just delete it."
  **Expect:** explains there's no hard delete and that it's archived (not destroyed) — does not claim to delete.
- [ ] **I3 — Bring it back.**
  **Say:** "Put First Snow back up."
  **Expect:** unarchives it.

## J. Coupons

- [ ] **J1 — Percent, store-wide, with expiry.**
  **Say:** "Make a code for 20% off everything until New Year's."
  **Expect:** creates a percent coupon with an expiry; reads the final code back.
- [ ] **J2 — Fixed amount.**
  **Say:** "And one for $15 off."
  **Expect:** amount-off coupon (handles dollars→cents itself); reads the code back.
- [ ] **J3 — Product-scoped needs published.** Try scoping a coupon to a **draft** piece (stage a new draft first, don't publish).
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

## K. Media (optional page video) — *Piece 2*

- [ ] **K1 — Asks how each clip behaves.** Give it the **real MP4 link** (top of this doc) for The Reading Hour.
  **Expect:** uploads it, then **asks** whether it should autoplay + loop silently (GIF-like) or be click-to-play with sound (the default) — it never assumes.
- [ ] **K2 — GIF-like.** Choose "loop silently, no buttons."
  **Expect:** the clip on the page plays itself, silent, no controls.
- [ ] **K3 — Click-to-play + poster.** Choose "play button with sound," offer a still image.
  **Expect:** shows controls; uses your poster image before it plays.
- [ ] **K4 — No media hides the section.** A product with no video (Piece 1).
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
  **Say:** "Mark that one shipped — it went out with the post office, tracking 9400 1112 2233 4455 6677 88."
  **Expect:** normalizes "post office" → USPS, then **confirms before sending**: "Mark <product> shipped via USPS <tracking> and email <buyer>?" — only on your yes does it mark shipped + email the buyer.
- [ ] **L4 — Confirm the email fired.** After L3.
  **Expect:** order flips to shipped; the buyer (your test email) gets the tracking email. *(If it ever says the email didn't send, that's the `email_sent:false` path → text Sean.)*

## M. Refunds (guides, can't execute)

- [ ] **M1 — Walk-through, not action.**
  **Say:** "I need to refund the customer who bought The Reading Hour."
  **Expect:** explains it can't issue refunds and walks you through the Stripe dashboard (Payments → find the payment → Refund); notes Stripe emails the buyer. *(With Web Browsing on, it may web-search to confirm Stripe's current steps — that's intended.)*
- [ ] **M2 — Relist is separate.**
  **Say:** "Now put that piece back up for sale."
  **Expect:** clarifies a refund doesn't auto-relist; offers to set it available again (or unarchive if it was archived).

## N. Voice

- [ ] **N1 — Copy sounds like Em.**
  **Say:** the **Voice-only** prompt (The Tide Library, see Extra inputs).
  **Expect:** warm, poetic, sensory — not clinical or sales-y. No "sale/deal/discount/cute/perfect." Leads with emotion, then specifics. *(Cross-check against `voice-guide`.)*

## O. Guardrails & errors

- [ ] **O1 — Never her price.** Throughout: it never sets a price you didn't say.
- [ ] **O2 — Never invents a URL/tracking.** It only uses CDN URLs the upload returns; never fabricates a tracking number or carrier.
- [ ] **O3 — No tech leakage.** It doesn't surface API keys, server URLs, or jargon unless you explicitly ask.
- [ ] **O4 — Missing-field on publish.** Publish a piece that's missing the story (stage an edit that clears it, or try an incomplete draft).
  **Expect:** translates the error to plain language ("it still needs the story") and tells you exactly what to add.
- [ ] **O5 — Key trouble (if it ever happens).** If it ever says **"the connection key needs Sean's attention,"** that's the auth (401) path — stop and tell Sean.

---

## Cleanup (after testing)

- [ ] Archive every throwaway product you created (`"take down …"`), or leave them — they're `is_test=true` and never reach the live site.
- [ ] Deactivate any test coupons.
- [ ] Note anything that misbehaved with the item code above (e.g. "G2 didn't mention the lingering draft") so it's easy to fix.

## What "all green" means

Every box checked = the GPT can run the whole store by chat: create→preview→publish, edit (knowing what's live vs. staged), coupons, archive, orders + shipping, and guide refunds — in Em's voice, without leaking anything technical or doing anything destructive. That's the product thesis: Em does it all by talking to The Sunkeeper.
