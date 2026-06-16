# AI Store Management Behavior Testing

## Overview 

Testing **Everlastings AI Production Assistant "The Sunkeeper"** for all product and order management workflows, brand voice, and behavior adherence. 

  1. Create and manage website products from chat
  2. Purchase products created on website 
  3. Look up order details from chat
  4. Add tracking and send shipping confirmation from chat

  "Gather the art, then run R1 → R15. Ping me with any misbehavior (the R-number + what it did) and I'll fix it. This is going to be a stellar entry."
  `claude --resume "Final Pre-v2.0.0 Build Prep"` - plan orchestrator

### Visual Media

Across these six test posts are a variety of images and videos. These have been assigned to each post so that the functionality of the dynamic page media display settings is working properly. 

  1. The Lantern Keepers Cottage: 
     - **1 YouTube** 
     - Proves a pure-embed page
  2. The Reading Hour: 
     - **1 Looping MP4** 
     - Set to auto-play, loop, on silent, with no buttons, like a GIF, but smaller filesize.
  3. First Snow, Stillwood: 
     - **1 click-to-play MP4 & 1 Poster** 
     - The poster still image along with a video showing controls and playing sound.
  4. The Tide Library: 
     - **2 MP4 Types** 
     - With one GIF-like and one click-to-play, it will prove that multiple clips render in order.
  5. The Clockmaker's Window: 
     - **1 MP4 & 1 YouTube** 
     - Proves mixed page where the MP4 renders before YouTube.
  6. The Night Train: 
     - **Gallery Images Only** 
     - With no video or other images, it proves the media section hides cleanly.

---

## Workflow

### Clip 1 — "A whole store, run by chat" (GPT screen)

  + [x] **R1: Show all products**
  + [x] **R2: Clear old placeholders** 
  + [x] **R3: Add the first piece** 
  + [x] **R4: Add the rest of the new test pieces** 
  + [x] **R5: Look-up using word and not full name** 
    - *EDIT*: Should try testing & in slug still.
  + [x] **R6: Price, sale, qty. changes live now, copy change not** 
  + [x] **R7: The lingering-draft heads-up** 
  + [x] **R8: Create a coupon, then new window, see what sales are running** 
    - *EDIT*: With caveat `assets/docs/archive/v3_0/FEEDBACK_FROM_v2_1_0.md`
  + [x] **R9: What's live now?** 

### Clip 2 — "The storefront" (website)

  + [x] **R10 · The shop.** 
  + [x] **R11 · Media variants rendering.** 
  + [x] **R12 · Checkout.** 

### Clip 3 — "Fulfillment, by chat" (GPT screen)

  + [x] **R13 · Orders.** 
  + [x] **R14 · Ship it + close the loop.** 
  + [x] **R15 · Refund walk-through (optional).** 
    - *EDIT*: Holding off on this because we have updates for refunds being planned for the v3.1.0 update. 
---

## 1. The Lantern Keeper's Cottage

### Details 

  - Series: Portals to Peace
  - Price: $268
  - Featured: Yes
  - Media: 1 YouTube

### Media 

  - Gallery:
    - `https://drive.google.com/file/d/1-rt78eJ6bvlAof2QALeWOCUMcyyp5e6r/view?usp=sharing`
    - `https://drive.google.com/file/d/16FMXSkRRMiCpvBhsXAQw2_HPvacyiP2M/view?usp=sharing`
    - `https://drive.google.com/file/d/1M17EzOyACNa0gFExH3J5OzLxPt6U0seT/view?usp=sharing`
    - `https://drive.google.com/file/d/1bzf5VuujYYQjWmNhCPrC5CUiJt4YqwYT/view?usp=sharing`
    - `https://drive.google.com/file/d/1md6IaVq0U-nI6jEJcSAUWTVxB2P_P1me/view?usp=sharing`
    - `https://drive.google.com/file/d/1nxWcfq93qTcKXdas7cELp9kqfaQWPLhQ/view?usp=sharing`
    - `https://drive.google.com/file/d/1nxWcfq93qTcKXdas7cELp9kqfaQWPLhQ/view?usp=sharing`
  - Hero: 
    - `https://drive.google.com/file/d/1Nga3rOkTkkG8po8uMHuFFObXjvv-FPE0/view?usp=sharing`
  - Thumbnail: 
    - `https://drive.google.com/file/d/17wsF6g64HGk_8hV2AFIv8XCYB8JiWZW1/view?usp=sharing`
  - YouTube: 
    - `https://youtu.be/6OT_uGu2vP4`

### Script

I want to add a new piece called "The Lantern Keeper's Cottage". It is "A little stone cottage at dusk with one window that glows" for $268.

#### More Info.

It's a tiny stone cottage at the end of a path you almost didn't take, the evening gone to slate. One window lit warm and gold, ivy down the chimney, and a small lantern left burning by the door for whoever's still out walking. It's about keeping a light on for the people you love. Warm LED with three settings, USB-C. Hand-placed moss and dried lavender.

#### Details

  - **Dimensions**: 7" W x 6" D x 9" H 
  - **Weight**: 2.2 lbs 
  - **Materials**: stone resin, reclaimed wood, LED, natural moss, dried lavender 
  - **Power**: USB-C (adapter included) 
  - **Care**: Dust with a soft brush, keep out of direct sun 
  - **Ships**: 3–5 business days, insured 
  - **Quantity**: 1 

### Finished Copy

  - **HEADLINE**: A light left burning by the door
  - **DESCRIPTION**: A miniature stone cottage at dusk, its one window kept warm and gold. Hand-set with moss and dried lavender and lit by a three-setting glow — a small, steady reminder of a light left on for you.
  - **FEATURES**: Warm LED glow with three settings, from candle-low to full gold · Hand-placed natural moss and dried lavender · Stone-resin cottage with reclaimed-wood timbers · A working lantern by the door, lit from within · USB-C powered (adapter included)
  - **STORY CARD**:
  > At the end of a path you almost didn't take, where the hedges lean close and the evening turns to slate, the Lantern Keeper's Cottage keeps its one gold window lit. Someone inside is waiting up. Someone always is.
  >
  > There's a lantern by the door, left burning for whoever is still out walking — and isn't that the whole of it, the small mercy of a light kept on for you. Ivy spills down the chimney; the lavender by the step has gone soft and silver with the season.
  >
  > Built from stone resin and reclaimed wood, hand-set with natural moss and dried lavender, and lit by a warm LED you can turn from a candle's hush to a full golden glow. Seven inches of somewhere to come home to.
  >
  > Keep it where you'll see it last thing at night — a reminder that being waited for is its own kind of shelter.

---

## 2. The Reading Hour

### Details

  - Series: Book Nooks
  - Price: $185
  - Featured: Yes
  - Media: 1 MP4, looped, no sound, no controls

### Media

  - Gallery: 
    - `https://drive.google.com/file/d/1DI7bigiefnPG0X-otnPCLnWqHNqxO44x/view?usp=sharing`
    - `https://drive.google.com/file/d/1EqCx2hckb1FZjThpwYywIfkhMshin7rR/view?usp=sharing`
    - `https://drive.google.com/file/d/1HwqMZVy0VH5hmGIMTAFdumE8mG3Sybz9/view?usp=sharing`
    - `https://drive.google.com/file/d/1XyO_HTMx-CsNqcKPVjUP6zXd3hyFmO-M/view?usp=sharing`
    - `https://drive.google.com/file/d/1exy5t0gKsV_0qnS7t_Vsq7XTXW6pErFQ/view?usp=sharing`
    - `https://drive.google.com/file/d/1rvh44hlkQc3VrGc4NPANFoPI_29rdiMS/view?usp=sharing`
  - Hero:
    - `https://drive.google.com/file/d/12m0jabvS5RH7dejZca1Tuvc7Z6M13s72/view?usp=sharing`
  - Thumbnail:
    - `https://drive.google.com/file/d/1jUaZo08toSdn_P9Ujf1C5uO8LcFH_f5w/view?usp=sharing`
  - Video:
    - `https://drive.google.com/file/d/1H2vDNAcaJypIARN11kptExmAUNOQjuI9/view?usp=sharing`

### Script

I want to add a new piece called "The Reading Hour". It's a "A little book nook that tucks between the real books on your shelf, with a tiny lamp that actually lights up" for $185.

#### More Info.

That pocket of late afternoon when the light goes amber and the house holds its breath and you finally sit with the book you've carried all week. A worn reading chair, a stack of tiny cloth-bound books, a brass lamp the size of a thimble that truly glows. It slides between the spines so it looks like a doorway into the bookcase. For the readers and the daydreamers.

#### Details

  - **Dimensions**: 9" H x 5.5" W x 2.5" D (slots between books)
  - **Weight**: 1.4 lbs
  - **Materials**: basswood, miniature cloth books, brass-finish lamp, LED, velvet
  - **Power**: USB-C (adapter included)
  - **Care**: Dust gently, keep out of direct sun
  - **Ships**: 3–5 business days, insured
  - **Quantity**: 1

### Finished Copy

  - **HEADLINE**: Where the afternoon goes quiet
  - **DESCRIPTION**: A miniature reading nook that tucks between the books on your shelf, complete with a tiny lamp that glows — a doorway into the bookcase for anyone who keeps their reading hour close.
  - **FEATURES**: A brass-finish lamp that truly lights (warm LED) · Hand-bound miniature cloth books · Basswood reading chair with a velvet cushion · Sized to slot between the books on your shelf · USB-C powered (adapter included)
  - **STORY CARD**:
  > There's an hour, late in the afternoon, when the light turns to honey and the house goes still — and if you're lucky, and you've kept it for yourself, you spend it with a book.
  >
  > The Reading Hour is that hour, made small enough to keep on a shelf. A worn little chair, a stack of cloth-bound books no bigger than a thumbnail, and a brass lamp that truly glows, so the nook looks lit from the inside. Slide it between your own books and it becomes a doorway — a way into the bookcase, for anyone willing to imagine it.
  >
  > Built in basswood and velvet, with hand-bound books and a warm LED you can leave on through the evening. For the ones who guard their reading hour like a candle in the wind.

---

## 3. First Snow, Stillwood

### Details 

  - Series: Seasonal
  - Price: $295
  - Featured: Yes
  - Media: 1 click-to-play MP4 with sound and buttons, 1 poster still image

### Media

  - Gallery: 
    - `https://drive.google.com/file/d/13nUVIq1B33OwEe-NvtLh7Qx0u9xLmokv/view?usp=sharing`
    - `https://drive.google.com/file/d/19pFjhsKuFjlFmCgsGBIggy5-tq2MkNXB/view?usp=sharing`
    - `https://drive.google.com/file/d/1B0-yvY7n25L4iQGbV5-VVfYytgYzjIoR/view?usp=sharing`
    - `https://drive.google.com/file/d/1FFWbu9Ht3DOPh6TUxVNymLX9RG4uBLKH/view?usp=sharing`
    - `https://drive.google.com/file/d/1Qa8NXiCYwvkHmhsqWbITc-WDLecRM8-g/view?usp=sharing`
    - `https://drive.google.com/file/d/1SpR2vUVhGRhplmqsKRjRRq7hzJvNG18t/view?usp=sharing`
    - `https://drive.google.com/file/d/1c0t37VprKxsywZh2NjWv1wsobwnlJPrA/view?usp=sharing`
    - `https://drive.google.com/file/d/1qDsd4ou1L1YOW5qW5SzIhA-7_tHVZ-kp/view?usp=sharing`
  - Hero:
    - `https://drive.google.com/file/d/1gUpJ5tR0sv1ZaxzsXPlBMyBuaYdag3qJ/view?usp=sharing`
  - Poster:
    - `https://drive.google.com/file/d/1eepHsyuqUKFjOd0aCdsmxmQ43vCX8alH/view?usp=sharing`
  - Thumbnail:
    - `https://drive.google.com/file/d/1UaC-IMU6YaRKTbHs_iosB6ySbqfHFbFD/view?usp=sharing`
  - Video:
    - `https://drive.google.com/file/d/1_SS04zQH7FWCIwAjjZhdTDtc7q3OTsGv/view?usp=sharing`

### About

And a seasonal one — First Snow, Stillwood. A tiny cabin in the woods the morning after the first snow, windows lit warm against the blue. $295.

#### More Info.

The morning after the first real snow, the whole world soft and soundless, the only colour the warm light in the cabin windows. Snow on the pines, a thread of smoke, one set of footprints to the door. It's the particular peace of being snowed in with the people you'd choose. Dual-tone light — cool blue-white over the snow, warm gold in the windows.

#### Details

  - **Dimensions**: 10" W x 7" D x 8" H
  - **Weight**: 3.1 lbs
  - **Materials**: resin, reclaimed wood, faux snow, miniature pines, dual-tone LED
  - **Power**: USB-C (adapter included)
  - **Care**: dust gently, keep out of direct sun, keep dry
  - **Ships**: 3–5 business days, insured
  - **Quantity**: 1

### Finished Copy

  - **HEADLINE**: The hush after the first snow
  - **DESCRIPTION**: A miniature cabin in the woods the morning after the first snow, windows lit warm against the blue. Hand-dressed in snow and pines with a dual-tone glow — the hush of a snowed-in morning, kept all year.
  - **FEATURES**: Dual-tone LED — cool snow-light and warm window-gold at once · Hand-dressed faux snow and a stand of miniature pines · Resin cabin with reclaimed-wood detailing · A single trail of footprints to the door · USB-C powered (adapter included)
  - **STORY CARD**:
  > The first snow comes in the night, the way the best things do, and by morning the whole of Stillwood has gone soft and soundless — every branch held, every sound swallowed, the world rewritten in white.
  >
  > Only the cabin keeps its colour: two windows lit warm and gold against the blue, a thread of smoke from the chimney, a single line of footprints leading home. Inside, you imagine, no one is in any hurry to be anywhere else.
  >
  > Hand-built in resin and reclaimed wood, dressed in fresh snow and miniature pines, and lit by a dual-tone glow that holds the cold blue of the snow and the warm gold of the windows at once. The quiet after the first snow, kept for the whole year round.

---

## 4. The Tide Library

### Details

  - Series: Story Lofts
  - Price: $240
  - Featured: No
  - Media: 2 MP4s, one looping with no controls or sound, one with controls and sound that is click to play

### Media

  - Gallery: 
    - `https://drive.google.com/file/d/1-R3UWMlqfuiCkrYaK1mjJPoatm85XGf5/view?usp=sharing`
    - `https://drive.google.com/file/d/1AjUjT-1lTFC26LsQi_a_zUCo6syNxR3R/view?usp=sharing`
    - `https://drive.google.com/file/d/1EyBQHqAAP1ioIDTrtebT0dfq83Zu9kzy/view?usp=sharing`
    - `https://drive.google.com/file/d/1JgeCsG9I5Y_iexvzSVI5-4euShjUQ-gq/view?usp=sharing`
    - `https://drive.google.com/file/d/1X8BqJVo5BmlzNGmnuSTUHj8AI20sy4UE/view?usp=sharing`
    - `https://drive.google.com/file/d/1hCXZ0_Oe_QkHjIq9aBeMgFjdstc2kq41/view?usp=sharing`
  - Hero:
    - `https://drive.google.com/file/d/1dGJTEA3AaXw_Atj7lNEJs-PPAWPnJFzP/view?usp=sharing`
  - Thumbnail:
    - `https://drive.google.com/file/d/1yy2MxVCqFx6MHumonV34OUnXn7EFHtTp/view?usp=sharing`
  - Video:
    - LOOP `https://drive.google.com/file/d/1P4EkwMvI9ep_Tm9te1z4RgT4iG2pRTbY/view?usp=sharing`
    - CLICK-TO-PLAY `https://drive.google.com/file/d/1mnX0LK-iXrYPotGNcwBLZ7uJWcSJsqog/view?usp=sharing`

### About

Add The Tide Library — a tiny lighthouse-keeper's desk where the sea comes in through the window. $240.

#### More Info.

The desk of a lighthouse keeper who reads more than he sleeps. Books stacked to a porthole window, and through the glass the sea is always coming in — green, then grey, then green again. A brass lamp, a half-written letter, a cup gone cold. For the people the ocean settles instead of stirs. Warm light at the desk, cool light at the window.

#### Details

  - **Dimensions**: 8" W x 6" D x 9" H
  - **Weight**: 2.6 lbs
  - **Materials**: resin, basswood, miniature books, brass-finish lamp, dual-tone LED
  - **Power**: USB-C (adapter included)
  - **Care**: Dust gently, keep out of direct sun
  - **Ships**: 3–5 business days, insured
  - **Quantity**: 1

### Finished Copy

  - **HEADLINE**: The sea, always coming in
  - **DESCRIPTION**: A miniature lighthouse-keeper's desk, books stacked to a porthole window where the sea is forever arriving. A warm desk lamp and cool sea-light, for anyone the ocean settles.
  - **FEATURES**: Dual-tone LED — warm desk lamp, cool sea-light at the window · Books stacked to a brass-rimmed porthole · Hand-built resin and basswood desk · A half-written letter and a cup gone cold · USB-C powered (adapter included)
  - **STORY CARD**:
  > The Tide Library belongs to a keeper who reads more than he sleeps. The books have climbed the walls and reached the porthole window, and through the glass the sea is always coming in — green, then grey, then green again, and never once still.
  >
  > There's a brass lamp burning low over a half-written letter, a cup of tea gone cold beside it — the particular comfort of work you can set down and return to. Outside, the water does what it has always done. Inside, there's no hurry.
  >
  > Hand-built in resin and basswood, shelved with miniature books and lit by a dual glow — warm gold at the desk, cool blue at the window. For the ones the ocean settles instead of stirs.

---

## 5. The Clockmaker's Window

### Details

  - Series: Story Lofts
  - Price: $310
  - Featured: Yes
  - Media: 1 MP4, 1 YouTube

### Media

  - Gallery: 
    - `https://drive.google.com/file/d/12Tt4MSCfI4SduwG05U2cmkwP-tXRenga/view?usp=sharing`
    - `https://drive.google.com/file/d/13Tg1jPHuNUjlqAXPkdbrqBkaOXK_oIEC/view?usp=sharing`
    - `https://drive.google.com/file/d/16PKBPLLH91a0RNjEO9mFKMT6EZaZXQRO/view?usp=sharing`
    - `https://drive.google.com/file/d/19YOaJTVfcyd4hhnLSWwc9GslDCLQhLuc/view?usp=sharing`
    - `https://drive.google.com/file/d/1G4BquriWI8YNFZGyscpNut5zyt8CtA__/view?usp=sharing`
    - `https://drive.google.com/file/d/1kCIYlWmZedy8HBZxpipqg04uwqNW9peC/view?usp=sharing`
  - Hero:
    - `https://drive.google.com/file/d/1IRGJ-FnYG2uT6vXiVwuQBiFrNk5jbl2P/view?usp=sharing`
  - Thumbnail:
    - `https://drive.google.com/file/d/1W-R4xR5KQ3R5W2n9U8QOFhRAs6UeiAiF/view?usp=sharing`
  - Video:
    - `https://drive.google.com/file/d/1RUTXjvt61iqGvpgK1SplIevhRnSVPaoI/view?usp=sharing`
  - YouTube:
    - `https://youtu.be/PCZR34lX-9w`

### About

Next — The Clockmaker's Window. A tiny watchmaker's bench where it's always golden hour. $310.

#### More Info.

A watchmaker's bench at the end of the day, when the low sun comes through the shop window and turns all the brass to honey. Gears laid out, a loupe, a hundred clock faces on the wall each telling a slightly different time. It's about slowing time down by paying attention to it. Warm, very golden, low light.

#### Details

  - **Dimensions**: 9" W x 6" D x 10" H
  - **Weight**: 3.0 lbs
  - **Materials**: resin, brass-finish gears, miniature clock faces, reclaimed wood, LED
  - **Power**: USB-C (adapter included)
  - **Care**: dust gently with a soft brush, keep out of direct sun
  - **Ships**: 3–5 business days, insured
  - **Quantity**: 1

### Finished Copy

  - **HEADLINE**: Where it's always golden hour
  - **DESCRIPTION**: A miniature watchmaker's bench bathed in late-afternoon gold, a hundred small clocks on the wall each keeping its own time. For anyone trying to slow the hours down.
  - **FEATURES**: Warm LED tuned to a low golden-hour glow · A wall of miniature clock faces, each set a little differently · Hand-laid brass-finish gears and a watchmaker's loupe · Resin and reclaimed-wood bench · USB-C powered (adapter included)
  - **STORY CARD**:
  > At the end of the day the low sun finds the clockmaker's window and turns the whole bench to honey — every gear, every spring, every small brass tool gone warm and gold.
  >
  > On the wall, a hundred clock faces keep a hundred slightly different times, because the clockmaker long ago stopped believing in just one. Here, time is something you tend, not something that chases you. The loupe waits; the kettle's on.
  >
  > Hand-built in resin and reclaimed wood, laid with brass-finish gears and lit to a low golden glow. For anyone trying, gently, to slow the hours down.

---

## 6. The Night Train

### Details

  - Series: Limited Edition
  - Price: $220
  - Featured: No
  - Media: 1 YouTube

### Media

  - Gallery: 
    - `https://drive.google.com/file/d/13gBXg8fEhX0469qBA3zjQKATT6hOW8C_/view?usp=sharing`
    - `https://drive.google.com/file/d/1KMTd6DL6-p1ytO4UrEmPR7N_MMfI2nwL/view?usp=sharing`
    - `https://drive.google.com/file/d/1gK4X3PHtQ8crWdWKFMxetjGa0KTKTZyC/view?usp=sharing`
    - `https://drive.google.com/file/d/1jPh-crmpN0rywGcqwgjnghPX7eLACVDu/view?usp=sharing`
    - `https://drive.google.com/file/d/1rPfqIho2el0yGG88bmBTId_AQJWzCiQt/view?usp=sharing`
    - `https://drive.google.com/file/d/1xHUF97mc1y6_9w2-vkdYg7M7spYLYQuS/view?usp=sharing`
  - Hero:
    - `https://drive.google.com/file/d/1mt35zDhNamvI-ryIOBnVL3sG7U6V2P0U/view?usp=sharing`
  - Thumbnail:
    - `https://drive.google.com/file/d/1KLxN2IS6GW9EOu4_k0J6vFLQtSsxzaZy/view?usp=sharing`

### About

And The Night Train — a tiny lit platform with the last train pulling in at night. $220.

#### More Info.

A small country railway platform, late, the last train of the night just arriving with its windows lit. One lamp on the platform, a bench, someone waiting. It's about arrivals — the people who wait up for you. Warm platform lamp and train windows, everything else dark and blue.

#### Details

  - **Dimensions**: 11" W x 5" D x 7" H
  - **Weight**: 2.8 lbs
  - **Materials**: resin, reclaimed wood, miniature train, LED
  - **Power**: USB-C (adapter included)
  - **Care**: dust gently, keep out of direct sun
  - **Ships**: 3–5 business days, insured
  - **Quantity**: 1

### Finished Copy

  - **HEADLINE**: The last train, and someone is waiting
  - **DESCRIPTION**: A miniature platform at night, the last train arriving with its windows lit and one person waiting on the bench. For the people who wait up for you.
  - **FEATURES**: Warm LED platform lamp and lit train windows · Hand-built miniature train and country platform · A single bench, and someone waiting · Resin and reclaimed-wood build · USB-C powered (adapter included)
  - **STORY CARD**:
  > It's late at the little country platform, the kind with one lamp and a single bench, and the last train of the night is just pulling in — its windows lit warm and gold against all that blue dark.
  >
  > Someone is waiting on the bench. They always are; that's the whole point of a last train. There's nothing here but the lamp, the cooling rails, and the small certainty of an arrival.
  >
  > Hand-built in resin and reclaimed wood, lit so the platform lamp and the train windows glow against the night. For the people who wait up — and the ones glad to be waited for.

### Extra Inputs

  - Slug edge: a quick piece titled **"Em's Lavender & Sage"** (a pressed-flower shadow box, $96, qty 1, Seasonal) — the point is the apostrophe + ampersand.
  - Prepared edits: Piece 1 new headline → **"Someone left the light on for you"**; price changes $289 / $300; restock qty → 3.

---

## Post-Testing 

### Clean-Up

  - Leave or archive the pieces — they're `is_test=true` and never reach the live site.
  - Deactivate any test coupons.
  - Jot anything that misbehaved against the R-number above so it's easy to fix.

### "All Green" Status

  The run shows the whole thesis end-to-end: Em clears and restocks the shop, writes every product in her voice, prices/sells/features by chat, the storefront renders each media variant correctly, a real checkout completes, and she ships and closes the order — all without touching code, a dashboard, or anything technical. That's the portfolio story: **a store you run by talking to it.**

### Set GPT To Live Store 

  - Update the "Server" in the Custom GPT Settings to use actual website  
  - Swap out the PRODUCT_API_KEY for production key 
  - Vercel SSO can be turned back on

---
*Edited formatting and added the Google Drive share links in preparation for easier testing flow. 2026-06-08 - Sean*