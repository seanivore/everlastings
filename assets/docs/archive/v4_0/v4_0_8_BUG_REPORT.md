# Driving v4.0.8 Bug Report

We were at v4.0.7 but here is some convoluted coupon/discount oddities from testing. I have another bug after this but this one seems large enough to handle first.

## COUPONS

The store-wide sale is being very strange. I think it might be SUPER delayed. 

See below it says "No store-wide sale running" so I created one right there. Once created, it moved down to the lower left container, the $10 with code WYE4DY10. 

From our dev build: `assets/docs/archive/images/v4-store-discount-error-1.jpg`

Instead, it should have stayed up at top to replace "No store-wide-sale running" so that I couldn't create another if I tried. 

**NOTE: when I came back ~10 minutes later — I had written up this entire coupon bug report and was starting the report on the refunds — suddenly I went to the home page and saw the sale banner for the site and the popup! When I went back to the sale page, it showed that there was one at the top! But when trying to end that sale, it was just as laggy; I clicked four or five times until it was finally gone and had to refresh to confirm it was gone. Then I tried to create a new one which I'll detail below.**

And though there are coupon codes populated and placed in the checkout for store wide sales, they are not shown here in the "coupon" section and we don't need to see what that code even is. 

How it should behave is shown these two images from the prototype demo page. 

None: `assets/docs/archive/images/v4-store-discount-error-2.jpg`
Created 88% off example: `assets/docs/archive/images/v4-store-discount-error-3.jpg`

The one I created didn't actually take (as evident by the top going back to saying no site wide discount running). This means I couldn't confirm if it was in the checkout populated the way it should be, nothing replaced the free shipping banner, and I never saw a popup. I mean I saw them when they were created, they exist, but I never saw them here. 

Note that the "store discount" is different UI than these coupons. This UI seems to have worked perfectly. I created one with all products and one with select products. In both screen shots I crossed off the one that was created but isn't a "coupon code" and is actually a "store wide discount" (that also uses a coupon code but that's irrelevant for distinguishing these two). 

  - EXAMPLE 1: `assets/docs/archive/images/v4-store-coupon-code-creation-1.jpg`
  - EXAMPLE 2: `assets/docs/archive/images/v4-store-coupon-code-creation-2.jpg`

Honestly, I guess it doesn't matter if the store-wide sale does create a lower tile, but it seems less confusing if it doesn't. 

**NOTE: from my note above until down here was all written in full. Then I went to get new images of the REFUND bug, and found that I had a weird login issue. Once resolved, I saw the coupon. I just created a new one again, this time for $150 off so it wouldn't be confused for anything else.**

Here is the homepage and popup once that first one randomly started working. I can't confirm if that was the amount I tried to make it for or not, so I did the next test. 

  - SEE IMAGE: `assets/docs/archive/images/v4-store-wide-discount-1-homepage.jpg`

Note how "all items" and the storewide discount are *similar* but distinctly different types of Stripe coupon/discount objects. I ensured that we did a bunch of research before designing these because I know there are two types in Stripe and wanted to make sure we got them right. 

I think we should probably have subagents get to the bottom of these coupon issues, and if needed, look up the Stipe Coupon / Discount Object specifics. Note that, strangely, on the old admin panel, we did have this working though so it might just be wiring. 

**I see objects being created on Stripe. It uses a COUPON CODE for the store-wide discount. I'm not sure what the delay is on it showing in the admin panel and on the homepage. And then it creates PROMOTION CODES as the coupon codes we are making on the lower part of the screen. Given that we did do research, it is possible that this is how we should be using them, but we need to research to confirm — or look up research from this build in earlier notes — and then I think you're going to have to use the API / Stripe CLI to create these objects so that we can see what happens and when to get the timing issues down.**

The $150 one I created right after the first one I saw worked, after it took forever to delete. (Do the Stripe logs say that deleted coupon code is marked active:false?). 

  - SEE IMAGE: `assets/docs/archive/images/v4-store-wide-discount-2-delay.jpg`

On Stripe logs, the first image shows the first coupon code I made (promotion code) and the second shows the store wide discount (coupon object). 

  - SEE IMAGE: `assets/docs/archive/images/v4-store-coupon-discount-1-stripe-log.jpg`
  - SEE IMAGE: `assets/docs/archive/images/v4-store-coupon-discount-2-stripe-log.jpg`

I logged out and in. It has been another 10 minutes since creating that $150 one and nothing on the website screen yet. If it went to Stripe, was created, then lost in translation coming back? Given the confusing two types of discounts, maybe wires are crossed like it seems they are when the storewide discount (coupon) jumps down to the lower section for the coupon codes (promotion codes). I don't know how to trigger it to show. 

The last mystery is how well these work. I clicked through and added something to the cart and it did have the code pre-entered. I think we'll just need to warn client that they should ALSO share the code written in the correspondence. 

https://everlastings-git-dev-seanivore.vercel.app/?code=HAPPY_BIRTHDAY_MARK

We need to somehow add this coupon (or any coupon) to the checkout flow so it shows applied. I got confused earlier mentioning that Claude Design could do it because they can't, this is Stripe development and the only thing CD did for this project was the admin dashboard backend. 

The apply button works, but needs something so that they don't push it multiple times ... I mean I did and it didn't cause error but you just should be able to tell applied, not applied. 

BUT if we put it in the flow, then click apply, and show it deducted or otherwise subtracted and applied, that would be enough. 

Currently: 
```
Order summary:

The Night Train    $230.00
Shipping           Free
Total              $230.00

Promotion code (optional)
BIRTHDAY_MARK
```

After: 

```
Order summary:

The Night Train                  $230.00
Shipping                         Free
Promotional codes (optional)     
 BIRTHDAY_MIKE_CODE              -$25.00
Total                            $205.00
```

I can confirm that the birthday mike code did work on Stripe. And YAY it disappeared from the `admin/sales` page afterwards because it was one time use. 

  SEE IMAGE: `assets/docs/archive/images/v4-coupon-discount-mike-bday.jpg`

So that all works but again, it is dealing with the Stripe objects, so I think you'd want to look in the code to see exactly what it is that we're currently using (where it says the product and the total, etc.) and then see online if we can find how to just add it in to the flow so that it subtracts and shows that discount. 

**NOTE**: I still don't see the $150 site-wide discount (COUPON OBJECT) applied... wires seem crossed. Stripe CLI logs show it created.

---

## RESOLVED — v4.0.8 (commit `e98141b`, on `dev`)

Root-caused by three parallel explore agents. Every symptom was admin **wiring + a CDN cache** — *not* the Stripe object model.

**The two Stripe types, plainly.** Every sale creates the SAME pair: a Stripe **Coupon** (the discount) + a **Promotion Code** (the code). "Store-wide" vs "code coupon" differ by exactly one flag — `metadata.auto_apply='true'` — and it must be a **percent** (Stripe needs `%` for on-site struck pricing).
- **Store-wide sale** = a `%` `auto_apply` coupon → top card + homepage banner, applies automatically, no code.
- **Code coupon** = anything else (`$`-off, or product-scoped) → a shareable code, lower tiles.

**Why the tests looked broken:**
- **KJPCVB8J ($150) and OPENING_DAY ($10) could never show as store-wide** — `$`-off is *always* a code coupon, never auto-apply. The old top card offered a "$ off" option that silently made one of these → the "$150 vanished" mystery.
- **~10-min delay + 4-5-click delete** — the admin read store-wide state from an edge-cached endpoint (`active_sale`, ~3-min TTL, no purge on change) that also feeds the homepage. The action hit Stripe immediately, but the cached read kept showing the old state.
- **Store-wide leaking into the tiles** — the coupon list returns the store-wide sale too (tagged `auto_apply`); the admin never filtered it out (and the tile shows irrelevant expiry/usage/scope fields).

**Fixes** (`admin/sales-app.js` + one field in `api/products.ts`):
- Admin now derives BOTH the top card and the tiles from ONE uncached coupon-list fetch → create/end reflect on the **first click**, and the store-wide sale is filtered out of the tiles (`!auto_apply`).
- Top card is **percent-only** — the `$`-off trap is gone. ($-off whole-store discounts still live under "New sale".)
- Restored the "since &lt;date&gt;" line (`created`) + the durable `promotion_code_id` deactivate handle.
- Trimmed the `active_sale` cache (→ homepage banner reflects a sale start/end in ~30s; admin no longer depends on it).

**Verified** by a deterministic curl trace on the dev preview: create `%` sale → appears in `active_sale` + tagged for the card, filtered from tiles; `$`-coupons stay as tiles, never in `active_sale`; deactivate clears on ONE call. KJPCVB8J + OPENING_DAY were left in place — end them in the UI to see the one-click delete.

**Still open (next cycle):** the checkout discount line + Apply "applied" state (the "Order summary" section above). No way to see a coupon applied before charging — needs a live Stripe-session probe; planned separately.

---

## RESOLVED — checkout discount + transparency (commits `3152f5f` → `f3cd37c`, on `dev`)

**Root cause of the "total never moved" bug:** on this Basil Custom-Checkout bundle the session amount fields (`session.total.{subtotal,discount,total}.amount`) are **pre-formatted strings** (`"$185.00"`), with `minorUnitsAmount` as the integer cents. The old change-listener did `Number.isFinite(session.total.total.amount)` — always false on a string — so it **silently skipped every repaint**. The money was always correct (Stripe charged the discounted amount); only the display lagged. Confirmed by a live probe of `window.__checkout.session()` (the browser tool redacts amounts, so read via a painted debug line + booleans).

**The rebuild (`checkout.html` + `assets/js/checkout.js`):**
- `paintSummary()` reads `checkout.session()` fresh (the change-event arg lags the discount) and paints from the formatted strings. Display-only — never touches Stripe's mounted elements (no `update*` bridge).
- The promo now lives **in the order-summary flow, above Shipping** (the discount is on the goods; shipping/tax don't count toward a minimum), as a **2-row / 3-column** row: a **"Promo code"** label, then `[ code field + circled ✕ ]` · **(deal in parens)** · **−computed amount** (right-aligned with the price column).
- **No Apply button** — auto-applies on Enter/blur; the ✕ removes it (`removePromotionCode`) so a shopper can drop a store-wide sale and type their own code right there.
- **Transparency:** shows the code + what the deal *is* — `(20% off · min $100.00)` — **and** the actual dollars it takes off (20% of $195 → `−$39.00`). Worth comes from the session; the **minimum** comes from a new public `?_action=coupon_lookup&code=` (one call returns a code's whitelisted worth + `restrictions.minimum_amount` — and **never** echoes metadata, since cart-recovery codes carry the customer's email + lost-items).
- **Smart rejection:** a code under its minimum now explains itself — *"This code requires $100.00 minimum. You're at $88.00. Add $12.00"* — since there's nowhere else to learn the minimum.

**Verified live** (curl + browser on the dev preview): a `%` code shows the deal + computed `−amount` above Shipping and drops the Total; the lookup returns terms with **zero PII leak**; an under-minimum code shows the smart note (no discount, entry kept); ✕ clears. The Coupon + Promotion Code model is now documented in `EVERLASTINGS_STORE.md` + `STORE_ADMINISTRATION.md`.

**Carry-forward TODOs (not blocking):**
1. Add store copy that **shipping & tax don't count toward a discount or minimum**, and confirm whether Stripe's `minimum_amount` is measured against subtotal vs total.
2. Optional: capture newsletter **signups** into a subscriber/customer catalog (today only *purchases* populate the Supabase `customers` table). 