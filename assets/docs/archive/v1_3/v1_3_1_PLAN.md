# v1.3.0 Addendum — Analytics, Meta Pixel, and Email CTAs

## Context

After completing the v1.3.0 documentation update, Sean reviewed and identified three areas to enhance before implementation begins:

1. **GA4 Enhanced E-commerce** — Current events use flat parameters instead of GA4's standard `items` array format. Need proper enhanced e-commerce for built-in reports (product performance, purchase funnel, revenue by category).
2. **Meta Pixel / Instagram Shopping** — Add Meta Pixel from the start for retargeting, Instagram Shopping attribution, and future ad campaigns. This is also a client retention play for Sean (ongoing ad management).
3. **Email Capture CTAs** — Three smart email capture strategies to maximize subscriber collection: product page interest, cart exit intent, and contemplation popup.

Additionally: `video_play` event, `commission_inquiry` event, and renaming `view_product` to GA4's standard `view_item`.

---

## Research Findings

### GA4 Enhanced E-commerce

**Event names must match GA4 standard**: `view_item` (not `view_product`), `add_to_cart`, `remove_from_cart`, `begin_checkout`, `purchase`

**All events use `items` array**:
```js
gtag('event', 'view_item', {
  currency: 'USD',
  value: 245.00,
  items: [{
    item_id: 'the-sunkeeper',       // slug
    item_name: 'The Sunkeeper',
    item_brand: 'Everlastings by Emaline',
    item_category: 'miniature',     // product_type
    item_category2: 'Portals to Peace', // series
    price: 245.00,
    quantity: 1
  }]
});
```

**`purchase` requires**: `transaction_id` (unique), `currency`, `value`, `items` array. Optional: `tax`, `shipping`, `coupon`.

**Automatic metrics** (zero extra code): sessions, engagement time, engagement rate, pages per session, traffic source, device, geography, scroll depth, outbound clicks.

**Built-in reports** (when items array is sent): E-commerce purchases, Purchase journey funnel, Revenue by category/brand. Available under Reports > Monetization.

### Meta Pixel

**Base code** in `<head>` on every page. `PageView` fires automatically.

**Standard events**: `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`, `Lead`, `Contact`

**Parameters**: `content_ids` (array of SKUs/slugs), `content_type: 'product'`, `content_name`, `value`, `currency`

**Instagram Shopping**: FB Shop and IG Shop are unified under Meta Commerce Manager. One catalog powers both. Catalog can be synced via hosted CSV feed or Catalog Batch API.

**CAPI (server-side)**: Recommended alongside pixel for Purchase events. Send from webhook handler to `https://graph.facebook.com/v21.0/{PIXEL_ID}/events`. Deduplicate with same `event_id` in both browser pixel and CAPI.

**Env var needed**: `META_PIXEL_ID` — public (like GA4 measurement ID), can be hardcoded in HTML or served via api/config.ts.

---

## Changes Required

### Files to Modify

| File | Changes |
|------|---------|
| `assets/docs/archive/v1_3/v1_3_0_IMPLEMENTATION.md` | GA4 events rewrite, Meta Pixel section, email CTAs, new events, CAPI |
| `assets/docs/archive/v1_3/v1_3_0_ACTION_STEPS.md` | Add Meta Pixel setup, email CTA checkboxes, updated GA4 events |
| `assets/docs/EVERLASTINGS_STORE.md` | Add Meta Pixel to tech stack + architecture decisions |
| `.env.example` | Add META_PIXEL_ID |

### No new standalone files needed. No deletions.
### New schema: `product_interests` table (7th table)
### New endpoint: `api/cart-activity.ts` (documented in implementation guide)

---

## Detailed Changes

### 1. GA4 Events — Rewrite to Enhanced E-commerce Format

**In v1_3_0_IMPLEMENTATION.md, update the "GA4 Event Definitions" section (line ~2263)**:

Rename `view_product` → `view_item` (GA4 standard name).

Replace flat parameter format with proper `items` array. New event table:

| Event | GA4 Standard Name | Items Array | Extra Params |
|-------|-------------------|-------------|--------------|
| Product page | `view_item` | Yes (1 item) | — |
| Add to cart | `add_to_cart` | Yes (1 item) | — |
| Remove from cart | `remove_from_cart` | Yes (1 item) | — |
| Checkout load | `begin_checkout` | Yes (all cart items) | `coupon` if applicable |
| Purchase | `purchase` | Yes (all items) | `transaction_id`, `tax`, `shipping` |
| Newsletter | `newsletter_signup` | No | `{ source }` (custom, not GA4 standard) |
| Contact | `contact_form_submit` | No | `{ subject }` (custom) |
| Commission inquiry | `commission_inquiry` | No | `{ subject }` (custom, NEW) |
| Filter | `search_filter` | No | `{ filter_type, filter_value }` (custom) |
| Lightbox | `gallery_open` | No | `{ slug, image_index }` (custom) |
| Video play | `video_play` | No | `{ slug, video_index }` (custom, NEW) |
| Promo code | `promo_code_generated` | No | `{ code }` (custom) |
| Email CTA capture | `email_cta_capture` | No | `{ source, slug }` (custom, NEW) |

**Helper function** to add to `main.js`:
```javascript
function buildGa4Item(product) {
  return {
    item_id: product.slug,
    item_name: product.title,
    item_brand: 'Everlastings by Emaline',
    item_category: product.product_type,
    item_category2: product.series || '',
    price: product.price / 100,
    quantity: 1
  };
}
```

**Update all inline gtag calls** in main.js, checkout.js, and complete.html to use `items` array format.

### 2. Meta Pixel Integration — New Section

**Add new section to v1_3_0_IMPLEMENTATION.md** after GA4 Event Definitions: "Meta Pixel Integration"

**Architecture Reference**: Add AR #25:
> **Meta Pixel for retargeting + Instagram Shopping attribution.** Base pixel code in `<head>` alongside GA4. Events fire in parallel with GA4 events. Server-side CAPI for Purchase deduplication via webhook. Meta Pixel ID served via `api/config.ts` or hardcoded (it's public).

**Base pixel code** — add to B1 Design System alongside GA4 gtag snippet:
```html
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
```

**Event mapping** — fire Meta events alongside GA4 events:

| Action | GA4 Event | Meta Pixel Event |
|--------|-----------|-----------------|
| Product page | `view_item` | `ViewContent` |
| Add to cart | `add_to_cart` | `AddToCart` |
| Checkout | `begin_checkout` | `InitiateCheckout` |
| Purchase | `purchase` | `Purchase` |
| Newsletter | `newsletter_signup` | `Lead` |
| Contact | `contact_form_submit` | `Contact` |

**Meta Pixel helper** in main.js:
```javascript
function trackMeta(eventName, params) {
  if (typeof fbq === 'function') {
    fbq('track', eventName, params);
  }
}
```

**Server-side CAPI for Purchase** — add to `api/webhook.ts`:
After successful order processing, POST to Meta Conversions API with `Purchase` event, deduplicating via `event_id` (use `event.id` from Stripe). This ensures Purchase tracking even when browser pixel is blocked.

**A1 setup additions**:
- Get Meta Pixel ID from Meta Events Manager
- Add `META_PIXEL_ID` to .env.example and Vercel env vars
- Add base pixel code to HTML head template

**Meta Commerce / Instagram Shopping note** (deferred section):
- Emy needs: Business Instagram → linked to Meta Business Page → Commerce Manager
- Product catalog: create hosted CSV feed on R2 (future A3 enhancement) or manual upload
- Note as post-launch enhancement alongside ad campaign setup

### 3. Email Capture CTAs — Three New Components

**Add new section to v1_3_0_IMPLEMENTATION.md** in Track B3 (Product Page) and Track C:

#### CTA 1: Product Page Sticky Card Email Capture

In the `.product-sticky-card`, add below the Buy Now / Add to Cart buttons:

```html
<div class="interest-cta" id="product-interest-cta">
  <p class="interest-text">This is a one-of-a-kind piece. Love it? Get notified if someone else adds it to their cart.</p>
  <form id="interest-form" class="interest-form">
    <label class="checkbox-label">
      <input type="checkbox" required>
      Please email me. I agree to <a href="/terms.html">Terms</a> & <a href="/privacy.html">Privacy Policy</a>.
    </label>
    <input type="email" placeholder="Your email" required>
    <button type="submit" class="btn-secondary">Notify Me</button>
  </form>
</div>
```

- Wired in product.js (Track C1)
- POSTs to `/api/subscribe` with `source: 'product-interest'`
- Fires `email_cta_capture` GA4 event + `Lead` Meta Pixel event
- Success: replace form with "You'll be the first to know." message

#### CTA 2: Cart Exit Intent Modal

When a user has items in cart and either:
- Navigates away (clicks a non-checkout link)
- Triggers `beforeunload` / tab close attempt

Show a centered modal:

```html
<div class="exit-modal" id="exit-intent-modal">
  <div class="exit-modal-content">
    <button class="exit-modal-close">&times;</button>
    <h3>Don't miss out</h3>
    <p>This is one of a kind. Can we email you if someone else adds it to their cart or if we have a discount?</p>
    <form id="exit-email-form">
      <label class="checkbox-label">
        <input type="checkbox" required>
        Please email me. I agree to <a href="/terms.html">Terms</a> & <a href="/privacy.html">Privacy Policy</a>.
      </label>
      <input type="email" placeholder="Your email" required>
      <button type="submit" class="btn-primary">Keep Me Updated</button>
    </form>
  </div>
</div>
```

- Wired in main.js or checkout.js (Track C)
- Only shows once per session (sessionStorage flag)
- Only shows if cart is not empty
- POSTs to `/api/subscribe` with `source: 'cart-exit'`
- Success: close modal, show brief toast "You're on the list."

#### CTA 3: Contemplation Popup (3-Minute Timer)

When user has been on a product page for 3+ minutes:

Show a bottom-right "page peel" popup (not a full modal — subtle, ~1/6 screen):

```html
<div class="contemplation-popup" id="contemplation-popup">
  <div class="contemplation-content">
    <button class="contemplation-close">&times;</button>
    <p>Love it? Join our newsletter for 5% off!</p>
    <form id="contemplation-form">
      <label class="checkbox-label">
        <input type="checkbox" required>
        I agree to <a href="/terms.html">Terms</a> & <a href="/privacy.html">Privacy Policy</a>.
      </label>
      <input type="email" placeholder="Your email" required>
      <button type="submit" class="btn-primary">Get 5% Off</button>
    </form>
  </div>
</div>
```

CSS animation: peel up from bottom-right corner, like a page turning.

```css
.contemplation-popup {
  position: fixed;
  bottom: 0;
  right: 0;
  max-width: 360px;
  transform: translateY(100%);
  transition: transform var(--transition-slow);
  z-index: var(--z-modal);
}
.contemplation-popup.visible {
  transform: translateY(0);
}
```

- Timer in product.js: `setTimeout(() => showContemplationPopup(), 3 * 60 * 1000)`
- Only shows once per session (sessionStorage)
- Only shows if user hasn't already subscribed from CTA 1
- POSTs to `/api/subscribe` with `source: 'contemplation-offer'`
- **5% discount**: Needs a new Stripe coupon `newsletter-welcome-5` (5% off, duration once)
- On success: generate promo code via new endpoint or reuse cart-recovery pattern, display code inline
- Fires `email_cta_capture` GA4 event + `Lead` Meta Pixel event

**Subscriber source values** (updated):
- `footer` — footer newsletter signup
- `homepage` — homepage newsletter
- `cart-recovery` — sold-while-in-cart flow
- `product-interest` — product page sticky card CTA
- `cart-exit` — cart exit intent modal
- `contemplation-offer` — 3-minute timer popup
- `customer` — linked on purchase

### 4. Product Interest Tracking — New Table + Endpoint

**New table: `product_interests`**
```sql
CREATE TABLE product_interests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  product_slug text NOT NULL,
  notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(email, product_slug)
);
```
Total tables: 7 (was 6). RLS: public insert (for CTA), authenticated read (for admin).

**New endpoint: `api/cart-activity.ts`**
- `POST /api/cart-activity` with `{ slug }` — no auth required (fire-and-forget from client)
- Checks `product_interests` for that slug where `notified = false`
- v1: Increments a counter or logs activity (admin visibility)
- Post-launch: Triggers email notification, sets `notified = true`
- Always returns 200 (never blocks the cart UX)

**CTA 1 form submit** — POSTs to `/api/subscribe` with `source: 'product-interest'` AND inserts into `product_interests` with `email + product_slug`. Could be a single endpoint that handles both, or CTA 1 calls both.

**addToCart() update** in main.js:
```javascript
function addToCart(item) {
  // ... existing cart logic ...
  // Fire-and-forget: notify interest trackers
  fetch('/api/cart-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: item.slug })
  }).catch(() => {}); // Never block cart UX
}
```

### 5. New Stripe Coupon for Contemplation Offer

Add to A1 Stripe setup:
- Create coupon: name "Welcome to the Firelight Council", 5% off, duration once, ID `newsletter-welcome-5`

### 5. api/config.ts — Add Meta Pixel ID

Update config endpoint to also return Meta Pixel ID:
```typescript
return Response.json({
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  metaPixelId: process.env.META_PIXEL_ID || null,
});
```

### 6. api/webhook.ts — Add Meta CAPI for Purchase

After order processing is complete, send server-side Purchase event to Meta:
```typescript
// Meta Conversions API (server-side Purchase deduplication)
if (process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN) {
  await fetch(`https://graph.facebook.com/v21.0/${process.env.META_PIXEL_ID}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.id, // Same as browser pixel for dedup
        user_data: { em: [hashSHA256(customerEmail)] },
        custom_data: {
          currency: 'USD',
          value: (session.amount_total || 0) / 100,
          content_ids: items.map(i => i.slug),
          content_type: 'product'
        }
      }],
      access_token: process.env.META_ACCESS_TOKEN
    })
  });
}
```

New env vars: `META_PIXEL_ID`, `META_ACCESS_TOKEN` (for CAPI)

### 7. .env.example Updates

Add:
```bash
# Meta Pixel (for retargeting + Instagram Shopping attribution)
META_PIXEL_ID=your-pixel-id
META_ACCESS_TOKEN=your-access-token
```

### 8. EVERLASTINGS_STORE.md Updates

- Add Meta Pixel to tech stack / architectural decisions
- Add `META_PIXEL_ID` and `META_ACCESS_TOKEN` to env vars table
- Note Instagram Shopping catalog as post-launch enhancement

---

## Execution Order

1. Update `v1_3_0_IMPLEMENTATION.md`:
   - Rewrite GA4 Event Definitions section with `items` array format
   - Rename `view_product` → `view_item` throughout
   - Add `buildGa4Item()` helper to main.js code
   - Update all inline gtag calls in main.js, checkout.js, complete.html
   - Add Meta Pixel Integration section (base code, events, CAPI)
   - Add AR #25 (Meta Pixel) and AR #26 (Email CTAs for conversion)
   - Add 3 email CTA components to B3 product page and B1 design system
   - Add `contemplation-popup` CSS to B1
   - Add exit intent modal to B2/shared components
   - Add `newsletter-welcome-5` coupon to A1 Stripe setup
   - Add `video_play`, `commission_inquiry`, and `email_cta_capture` events
   - Add `product_interests` table to schema section (7th table)
   - Add `api/cart-activity.ts` endpoint to A2
   - Update `addToCart()` in main.js with fire-and-forget cart-activity call
   - Update api/config.ts with Meta Pixel ID
   - Update api/webhook.ts with CAPI
   - Add META_PIXEL_ID and META_ACCESS_TOKEN to env var table

2. Update `v1_3_0_ACTION_STEPS.md`:
   - Add Meta Pixel setup steps to A1
   - Add email CTA checkboxes to B3 and C1
   - Add newsletter coupon to A1 Stripe
   - Update GA4 event names in C1

3. Update `.env.example`:
   - Add META_PIXEL_ID and META_ACCESS_TOKEN

4. Update `EVERLASTINGS_STORE.md`:
   - Add Meta Pixel to architectural decisions
   - Add env vars

---

## Design Decisions Made

1. **CTA 1 copy + interest tracking**: Keep the urgency framing ("Get notified if someone else adds it to their cart") — and actually deliver on it. When User A gives their email on a product page, we store `email + product_slug` in a `product_interests` table. When User B adds that same product to cart, `addToCart()` fires a lightweight `POST /api/cart-activity` that checks for interested emails. **v1**: Admin UI shows Emy "N people watching this product" (demand signal). **Post-launch with email service**: Automated real-time notifications.
2. **5% off code**: Dynamic unique codes via Stripe promotion code API (same pattern as cart-recovery). Unique per email, 1 redemption max, 30-day expiry. More trackable, prevents sharing.
3. **Meta CAPI**: Include in v1. ~15 lines in webhook.ts, ensures Purchase tracking even when browser pixel is blocked by iOS/ad blockers. High value for ad optimization from day one.

---

## Verification

After updates:
1. GA4 event names match standard: `view_item`, `add_to_cart`, etc. (not `view_product`)
2. All e-commerce events include `items` array with `item_id`, `item_name`, `item_brand`, `item_category`, `price`, `quantity`
2a. `product_interests` table exists with `email`, `product_slug`, `notified` columns
2b. `api/cart-activity.ts` documented; `addToCart()` includes fire-and-forget call
3. Meta Pixel base code is in HTML head template alongside GA4
4. Meta events fire in parallel with GA4 events (same trigger points)
5. CAPI Purchase in webhook.ts deduplicates with browser pixel via `event_id`
6. Three email CTAs documented with HTML, CSS, and JS wiring
7. `newsletter-welcome-5` coupon documented in A1
8. New env vars in .env.example and env var table
9. Subscriber source values updated to include new CTA sources
