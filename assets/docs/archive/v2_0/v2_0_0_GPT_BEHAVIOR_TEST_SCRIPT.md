# The Sunkeeper — behavior test + portfolio recording runbook

**Two jobs in one doc.** It exercises *every* GPT behavior (so you catch anything that misbehaves), and it's ordered as a **recording runbook** for a cohesive portfolio piece: a chat-managed store → the real storefront → checkout → chat-managed fulfillment. Paste-ready content means you never compose on camera. (Engineering-level checks live in `v2_0_0_ADDENDUM_TESTING.md`; this is "say this, expect that.")

**Where to run it.** GPT's Action pointed at the **dev preview** (the `servers:` URL = the `…-git-dev-…vercel.app` host) + the **Preview**-scoped `PRODUCT_API_KEY` (the `.env.local` value), Vercel SSO off. Everything the GPT touches is automatically `is_test=true` and lives only on the preview — never the live site. So you can clear products, run checkout with a test card, and send shipping emails freely.

**Two real-world cautions even in test:**
- **`markShipped` actually sends an email** to the address on the order — use a test order whose email is *yours*.
- **Checkout uses the Stripe test card** `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP (preview = Stripe test mode — no real money).

---

## Before you hit record — assets to gather

Pull these from your archive into one folder so the recording flows. Reuse freely for the coverage pieces; give the 2–3 you'll feature on camera their own distinct sets so they look real.

**Per piece: 7 images** (the create *enforces* this) — 1 hero + 5 gallery + 1 thumbnail. The hero image can double as the thumbnail, so ~6 distinct images each is enough. Any abstract/cozy art works.

**Video:** you already have one real public MP4 — `https://cdn.everlastingsbyemaline.com/hero-bg-anim/homepage-hero-animation.mp4`. **Reuse it for every MP4 slot below**, or drop your own. **Posters** = any image. **YouTube:** pick one calm, embeddable clip you like (ambient/nature) for the two pieces that use it — that's the "rare" path, test-only; you needn't feature those in the final cut.

**Media coverage across the six** (this is the point — it proves the page shows *only* the media present, and every playback mode):
- **1 · The Lantern Keeper's Cottage** — *images only, no video* → proves the media section hides cleanly.
- **2 · The Reading Hour** — *one GIF-like MP4* (autoplay, loops, silent, no buttons).
- **3 · First Snow, Stillwood** — *one click-to-play MP4 + a poster still* (controls, sound).
- **4 · The Tide Library** — *two MP4s* (one GIF-like + one click-to-play) → proves multiple clips render in order.
- **5 · The Clockmaker's Window** — *one MP4 + one YouTube* (mixed) → proves MP4s render before YouTube.
- **6 · The Night Train** — *YouTube only* → proves a pure-embed page (coverage; optional to feature).

---

## Paste-ready content — the six pieces

*Best on camera: paste the **opening line + details** and let the GPT write the headline/story in Em's voice — that raw→poetic moment is the hero shot. The **finished copy** is your fallback and your source for the edit tests. When it asks about video, tell it the behavior in plain words (e.g. "loop it silently with no buttons") — it sets the flags.*

### 1 · The Lantern Keeper's Cottage — *Portals to Peace · $268 · qty 1 · featured · images only*
**Opening:** I want to add a new piece — The Lantern Keeper's Cottage. A little stone cottage at dusk with one window that glows, $268.
**Details:** It's a tiny stone cottage at the end of a path you almost didn't take, the evening gone to slate. One window lit warm and gold, ivy down the chimney, and a small lantern left burning by the door for whoever's still out walking. It's about keeping a light on for the people you love. Warm LED with three settings, USB-C. Hand-placed moss and dried lavender.
**Specs:** `7" W x 6" D x 9" H` · `2.2 lbs` · stone resin, reclaimed wood, LED, natural moss, dried lavender · USB-C (adapter included) · care: dust with a soft brush, keep out of direct sun · ships 3–5 business days, insured · qty 1 · featured.
**Finished copy:**
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

### 2 · The Reading Hour — *Book Nooks · $185 · qty 1 · one GIF-like MP4*
**Opening:** Next — The Reading Hour. A little book nook that tucks between the real books on your shelf, with a tiny lamp that actually lights up. $185.
**Details:** That pocket of late afternoon when the light goes amber and the house holds its breath and you finally sit with the book you've carried all week. A worn reading chair, a stack of tiny cloth-bound books, a brass lamp the size of a thimble that truly glows. It slides between the spines so it looks like a doorway into the bookcase. For the readers and the daydreamers.
**Specs:** `9" H x 5.5" W x 2.5" D (slots between books)` · `1.4 lbs` · basswood, miniature cloth books, brass-finish lamp, LED, velvet · USB-C (adapter included) · care: dust gently, keep out of direct sun · ships 3–5 business days, insured · qty 1.
**Video:** the MP4 → "make it loop silently with no buttons, like a little GIF of the lamp glowing."
**Finished copy:**
- **headline:** Where the afternoon goes quiet
- **description:** A miniature reading nook that tucks between the books on your shelf, complete with a tiny lamp that glows — a doorway into the bookcase for anyone who keeps their reading hour close.
- **features:** A brass-finish lamp that truly lights (warm LED) · Hand-bound miniature cloth books · Basswood reading chair with a velvet cushion · Sized to slot between the books on your shelf · USB-C powered (adapter included)
- **story_card:**
  > There's an hour, late in the afternoon, when the light turns to honey and the house goes still — and if you're lucky, and you've kept it for yourself, you spend it with a book.
  >
  > The Reading Hour is that hour, made small enough to keep on a shelf. A worn little chair, a stack of cloth-bound books no bigger than a thumbnail, and a brass lamp that truly glows, so the nook looks lit from the inside. Slide it between your own books and it becomes a doorway — a way into the bookcase, for anyone willing to imagine it.
  >
  > Built in basswood and velvet, with hand-bound books and a warm LED you can leave on through the evening. For the ones who guard their reading hour like a candle in the wind.

### 3 · First Snow, Stillwood — *Seasonal · $295 · qty 1 · featured · one click-to-play MP4 + poster*
**Opening:** And a seasonal one — First Snow, Stillwood. A tiny cabin in the woods the morning after the first snow, windows lit warm against the blue. $295.
**Details:** The morning after the first real snow, the whole world soft and soundless, the only colour the warm light in the cabin windows. Snow on the pines, a thread of smoke, one set of footprints to the door. It's the particular peace of being snowed in with the people you'd choose. Dual-tone light — cool blue-white over the snow, warm gold in the windows.
**Specs:** `10" W x 7" D x 8" H` · `3.1 lbs` · resin, reclaimed wood, faux snow, miniature pines, dual-tone LED · USB-C (adapter included) · care: dust gently, keep out of direct sun, keep dry · ships 3–5 business days, insured · qty 1 · featured.
**Video:** the MP4 → "give it a play button with sound, and use this still image before it plays" (hand it a poster image).
**Finished copy:**
- **headline:** The hush after the first snow
- **description:** A miniature cabin in the woods the morning after the first snow, windows lit warm against the blue. Hand-dressed in snow and pines with a dual-tone glow — the hush of a snowed-in morning, kept all year.
- **features:** Dual-tone LED — cool snow-light and warm window-gold at once · Hand-dressed faux snow and a stand of miniature pines · Resin cabin with reclaimed-wood detailing · A single trail of footprints to the door · USB-C powered (adapter included)
- **story_card:**
  > The first snow comes in the night, the way the best things do, and by morning the whole of Stillwood has gone soft and soundless — every branch held, every sound swallowed, the world rewritten in white.
  >
  > Only the cabin keeps its colour: two windows lit warm and gold against the blue, a thread of smoke from the chimney, a single line of footprints leading home. Inside, you imagine, no one is in any hurry to be anywhere else.
  >
  > Hand-built in resin and reclaimed wood, dressed in fresh snow and miniature pines, and lit by a dual-tone glow that holds the cold blue of the snow and the warm gold of the windows at once. The quiet after the first snow, kept for the whole year round.

### 4 · The Tide Library — *Story Lofts · $240 · qty 1 · two MP4s*
**Opening:** Add The Tide Library — a tiny lighthouse-keeper's desk where the sea comes in through the window. $240.
**Details:** The desk of a lighthouse keeper who reads more than he sleeps. Books stacked to a porthole window, and through the glass the sea is always coming in — green, then grey, then green again. A brass lamp, a half-written letter, a cup gone cold. For the people the ocean settles instead of stirs. Warm light at the desk, cool light at the window.
**Specs:** `8" W x 6" D x 9" H` · `2.6 lbs` · resin, basswood, miniature books, brass-finish lamp, dual-tone LED · USB-C (adapter included) · care: dust gently, keep out of direct sun · ships 3–5 business days, insured · qty 1.
**Video:** two MP4s → first: "loop it silently, no buttons — the sea through the window." second: "a play button with sound for the desk." (Confirm they render first-then-second on the page.)
**Finished copy:**
- **headline:** The sea, always coming in
- **description:** A miniature lighthouse-keeper's desk, books stacked to a porthole window where the sea is forever arriving. A warm desk lamp and cool sea-light, for anyone the ocean settles.
- **features:** Dual-tone LED — warm desk lamp, cool sea-light at the window · Books stacked to a brass-rimmed porthole · Hand-built resin and basswood desk · A half-written letter and a cup gone cold · USB-C powered (adapter included)
- **story_card:**
  > The Tide Library belongs to a keeper who reads more than he sleeps. The books have climbed the walls and reached the porthole window, and through the glass the sea is always coming in — green, then grey, then green again, and never once still.
  >
  > There's a brass lamp burning low over a half-written letter, a cup of tea gone cold beside it — the particular comfort of work you can set down and return to. Outside, the water does what it has always done. Inside, there's no hurry.
  >
  > Hand-built in resin and basswood, shelved with miniature books and lit by a dual glow — warm gold at the desk, cool blue at the window. For the ones the ocean settles instead of stirs.

### 5 · The Clockmaker's Window — *Story Lofts · $310 · qty 1 · featured · MP4 + YouTube (mixed)*
**Opening:** Next — The Clockmaker's Window. A tiny watchmaker's bench where it's always golden hour. $310.
**Details:** A watchmaker's bench at the end of the day, when the low sun comes through the shop window and turns all the brass to honey. Gears laid out, a loupe, a hundred clock faces on the wall each telling a slightly different time. It's about slowing time down by paying attention to it. Warm, very golden, low light.
**Specs:** `9" W x 6" D x 10" H` · `3.0 lbs` · resin, brass-finish gears, miniature clock faces, reclaimed wood, LED · USB-C (adapter included) · care: dust gently with a soft brush, keep out of direct sun · ships 3–5 business days, insured · qty 1 · featured.
**Video:** one MP4 → "a play button for the gears," **and** one YouTube link → "and here's a YouTube clip too." (Confirm the MP4 renders *before* the YouTube embed.)
**Finished copy:**
- **headline:** Where it's always golden hour
- **description:** A miniature watchmaker's bench bathed in late-afternoon gold, a hundred small clocks on the wall each keeping its own time. For anyone trying to slow the hours down.
- **features:** Warm LED tuned to a low golden-hour glow · A wall of miniature clock faces, each set a little differently · Hand-laid brass-finish gears and a watchmaker's loupe · Resin and reclaimed-wood bench · USB-C powered (adapter included)
- **story_card:**
  > At the end of the day the low sun finds the clockmaker's window and turns the whole bench to honey — every gear, every spring, every small brass tool gone warm and gold.
  >
  > On the wall, a hundred clock faces keep a hundred slightly different times, because the clockmaker long ago stopped believing in just one. Here, time is something you tend, not something that chases you. The loupe waits; the kettle's on.
  >
  > Hand-built in resin and reclaimed wood, laid with brass-finish gears and lit to a low golden glow. For anyone trying, gently, to slow the hours down.

### 6 · The Night Train — *Limited Edition · $220 · qty 1 · YouTube only*
**Opening:** And The Night Train — a tiny lit platform with the last train pulling in at night. $220.
**Details:** A small country railway platform, late, the last train of the night just arriving with its windows lit. One lamp on the platform, a bench, someone waiting. It's about arrivals — the people who wait up for you. Warm platform lamp and train windows, everything else dark and blue.
**Specs:** `11" W x 5" D x 7" H` · `2.8 lbs` · resin, reclaimed wood, miniature train, LED · USB-C (adapter included) · care: dust gently, keep out of direct sun · ships 3–5 business days, insured · qty 1.
**Video:** YouTube only → "just add this YouTube clip, no other video." (Confirm the page shows the embed and nothing else.)
**Finished copy:**
- **headline:** The last train, and someone waiting
- **description:** A miniature platform at night, the last train arriving with its windows lit and one person waiting on the bench. For the people who wait up for you.
- **features:** Warm LED platform lamp and lit train windows · Hand-built miniature train and country platform · A single bench, and someone waiting · Resin and reclaimed-wood build · USB-C powered (adapter included)
- **story_card:**
  > It's late at the little country platform, the kind with one lamp and a single bench, and the last train of the night is just pulling in — its windows lit warm and gold against all that blue dark.
  >
  > Someone is waiting on the bench. They always are; that's the whole point of a last train. There's nothing here but the lamp, the cooling rails, and the small certainty of an arrival.
  >
  > Hand-built in resin and reclaimed wood, lit so the platform lamp and the train windows glow against the night. For the people who wait up — and the ones glad to be waited for.

**Extra inputs:**
- **Slug edge:** a quick piece titled **"Em's Lavender & Sage"** (a pressed-flower shadow box, $96, qty 1, Seasonal) — the point is the apostrophe + ampersand.
- **Prepared edits:** Piece 1 new headline → **"Someone left the light on for you"**; price changes $289 / $300; restock qty → 3.

---

# The recording run (in order)

## Clip 1 — "A whole store, run by chat" (GPT screen)

- [ ] **R1 · Recon.** "Show me everything that's live in the shop right now." → it calls **listProducts** and reads back the current placeholder pieces. *(Good opening beat: the GPT can see the store.)*
- [ ] **R2 · Clear the placeholders.** "These are all old test pieces with placeholder images — take them all down." → it **archives each** (loops `archiveProduct`). Verify they leave the shop. Nice line to say on camera: it's *archive, not delete* — reversible, nothing is ever destroyed. *(If it's slow at bulk, name a few or say "archive every product that's currently live.")*
- [ ] **R3 · Add the first piece, live.** Paste Piece 1's **opening line**, then its **details** when asked; give 7 photos; open the preview it returns; say **"publish."** **Expect:** it writes the copy in Em's voice, never exposes slug/cents/jargon, speaks dollars, hands a **preview link** (a draft), and publishing makes it live + purchasable (creates the Stripe listing). **This is your hero sequence — raw words in, a finished product page out.**
- [ ] **R4 · Add the rest (2–6).** Work through Pieces 2–6 — mix "let it write" with pasting finished copy to keep pace. For each, give photos and, when asked, the **video behavior** in plain words (see each piece). This is where the **media variants** get proven:
  - 2 GIF-like MP4 · 3 click-to-play MP4 + poster · 4 two MP4s in order · 5 MP4-then-YouTube · 6 YouTube only · 1 images-only.
- [ ] **R5 · The slug edge (optional, great detail).** Create **"Em's Lavender & Sage"**, then later say "edit the Lavender Sage piece, set it to $110." **Expect:** if the direct lookup misses, it **lists and matches your wording** rather than saying "couldn't find it."
- [ ] **R6 · A few edits, live vs. staged.** "Set The Lantern Keeper's Cottage to $289" → **live immediately**. "Mark The Tide Library sold" → **live**. "We made 3 more of the Reading Hour" → **live** (qty 3). "Change the Cottage headline to 'Someone left the light on for you'" → **stages** a draft + preview link → "publish that." **Expect:** price/availability/quantity apply instantly; copy stages until you publish.
- [ ] **R7 · The lingering-draft heads-up (the subtle one).** Stage a copy edit on a piece (don't publish), then "set its price to $300." **Expect:** the price goes live **and** it flags you still have unpublished copy edits — offers to publish or discard. *(Verify it actually mentions the leftover draft.)*
- [ ] **R8 · A coupon.** "Make a code for 20% off everything this weekend." → it creates it and reads the code back. Then "what sales are running?" → lists code + scope. *(Try "buy-one-get-one?" → it should decline; Stripe can't do buy-N.)*
- [ ] **R9 · Show the result.** "What's live now?" → **listProducts** shows the real, finished store. Clean transition point to the website.

## Clip 2 — "The storefront" (website)

- [ ] **R10 · The shop.** Open the dev-preview site. Show the shop full of the new pieces — real images, the featured carousel, the collections.
- [ ] **R11 · Media variants rendering.** Open a few product pages to show the dynamic media: the **Reading Hour** auto-looping silently, **First Snow** click-to-play with its poster, **The Tide Library** with two clips, **The Clockmaker's Window** (MP4 then YouTube), **The Night Train** (embed only), and **the Cottage** with no media section at all. *(This is the "it shows only what's there" proof.)*
- [ ] **R12 · Checkout.** Buy 1–2 pieces with the Stripe test card `4242 4242 4242 4242` (any future expiry/CVC/ZIP). Complete the purchase through to the `/complete` page. *(Use an email that's yours — you'll ship to it next.)*

## Clip 3 — "Fulfillment, by chat" (GPT screen)

- [ ] **R13 · Orders.** "What orders need shipping?" → **listOrders** reads back your fresh purchase(s) plainly (who, what, address, total).
- [ ] **R14 · Ship it + close the loop.** "Mark that one shipped — it went out with the post office, tracking 9400 1112 2233 4455 6677 88." **Expect:** it normalizes "post office" → USPS, **confirms before sending** ("Mark <piece> shipped via USPS <tracking> and email <buyer>?"), then on your yes marks it shipped and the **buyer (you) gets the tracking email.** The full loop, by chat.
- [ ] **R15 · Refund walk-through (optional).** "I need to refund the customer who bought The Reading Hour." **Expect:** it can't issue refunds — it walks you through the Stripe dashboard (and may web-search to confirm current steps), and notes a refund doesn't auto-relist.

---

## Guardrails to keep an eye on (any time, any clip)
- Never sets a price you didn't say; never invents a URL, tracking number, or carrier.
- Never surfaces API keys, server URLs, or jargon unless you ask.
- On a publish that's missing a field, it translates the error to plain language ("it still needs the story").
- If it ever says **"the connection key needs Sean's attention,"** that's the 401 path — stop and tell Sean.

## Cleanup (after recording)
- Leave or archive the pieces — they're `is_test=true` and never reach the live site.
- Deactivate any test coupons.
- Jot anything that misbehaved against the R-number above so it's easy to fix.

## What "all green" means
The run shows the whole thesis end-to-end: Em clears and restocks the shop, writes every product in her voice, prices/sells/features by chat, the storefront renders each media variant correctly, a real checkout completes, and she ships and closes the order — all without touching code, a dashboard, or anything technical. That's the portfolio story: **a store you run by talking to it.**
