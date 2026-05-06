# v1.4.3 Track C — Integration Implementation Guide

> **DEPRECATED 2026-05-06.** Both this draft and `v1_4_4_C_IMPLEMENT.md` are superseded by `v1_4_5_C_IMPLEMENT.md`. Historical context lives in `v1_4_4_IMPLEMENT_UPDATES.md`. This file is retained as a code-block source for the v1.4.5 build (cart/checkout/complete sections); once those are inlined in v1.4.5, this file has no remaining build value.

> **2026-05-06 supersession note** (original): Track A and Track B closeouts
> surfaced contract gaps and pre-flight bugs that this plan does not account for. The
> v1.4.4 revision adds Phase 0 (Gaps A–G), corrects the endpoint count from 14 to 11,
> removes localhost-based verification, pins the consent + email-CTA contracts to
> Track B's actual events, and inserts Design Review Checkpoints A/B/C/D. **Do not act
> on this file** — read `v1_4_4_C_IMPLEMENT.md` instead. This file is retained for
> historical record only. Companion: `v1_4_4_PREP_DESIGN_REVIEWS.md`.

## Track Goal
Wire Track B's placeholder pages to Track A's API endpoints, implement the complete cart + checkout flow (including 409 cart-recovery edge case), finalize SEO (sitemap, robots, meta, OG, structured data), and complete launch prep (Stripe live mode, full E2E testing, performance pass, launch sequence). Track C cannot start until Track A's A2 (API endpoints) and Track B's pages with placeholder markers are both complete.

## Required Pre-Reads — Project Context (Read In Full at Session Start)

Claude Code's `@` imports do NOT recursively auto-load in the current CLI version (verified empirically 2026-05-02 — `/context` shows imports as literal text, not expanded content). Your first action is to Read all four files below in full.

- `.agent/AGENTS.md` — agent instructions
- `.agent/DEV_RULES.md` — workflow protocol
- `assets/docs/EVERLASTINGS_STORE.md` — architectural primer (you'll consume API contracts that reference its "AR #N" items)
- `assets/docs/BRAND.md` — voice/tone for any remaining copy work in C1/C3

You can skip `.claude/CLAUDE.md` — its only content is `@.agent/AGENTS.md` (already in your list above).

## Required Pre-Reads — Track A & B Outputs (Skim Before Starting C1)

Track C depends on outputs from A and B. After the project-context pre-reads above, briefly skim:
- `assets/docs/archive/v1_4/v1_4_3_A_IMPLEMENT.md` — for the API contracts you will call (paths, request/response shapes). You do not need to re-implement; only know the shape.
- `assets/docs/archive/v1_4/v1_4_3_B_IMPLEMENT.md` — for the placeholder convention and which DOM hooks exist.

You can skim. Do not deep-read either; trust their preambles + section headings.

## Do Not Explore
- Do not modify `api/**` — that's Track A's domain. Consume contracts as-is.
- Do not modify `assets/css/**` — that's Track B's. Add CSS only if a Track B file is genuinely missing a hook.
- Do not modify `admin/**` unless wiring up the admin orders tab to live data was deferred from A3 (check first).

## Other Tracks at a Glance

**Track A (already complete by C-start):** 14 API endpoints, Supabase schema, admin UI, webhook handling. You will call: `/api/config`, `/api/checkout/reserve`, `/api/checkout`, `/api/session-status`, `/api/cart-recovery`, `/api/products`, `/api/upload`, `/api/subscribe`, `/api/cart-activity`. Webhook is server-to-server (Stripe → backend); you don't call it from frontend.

**Track B (already complete by C-start):** Design system, header/footer/nav, product page, shop grid, homepage, remaining pages — all with `<!-- PLACEHOLDER: ... -->` markers showing where live data goes.

## Subagent Delegation Strategy

C is integration work — sequencing matters:
- **C1 Wire pages to backend**: do directly (orchestrator). Holistic understanding of all placeholder→API mappings is essential; can't be safely fragmented.
- **C2 Checkout flow E2E**: complex. Delegate `cart.js` implementation to one subagent with the C2 spec; orchestrator handles `complete.html` (return page) and integration verification.
- **C3 SEO finalization**: one subagent.
- **C4 Testing + Launch prep**: one subagent.

## Verification Gate (Done Means)

- [ ] Full purchase flow works end-to-end on preview deployment: browse → product → add to cart → checkout → Stripe payment → return → email tracking → order in Supabase
- [ ] `grep -r 'PLACEHOLDER:' .` returns ZERO matches
- [ ] All inlined error states render correctly when their condition is triggered (use Stripe test cards / forced API errors)
- [ ] GA4 Enhanced Ecommerce events fire correctly (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`, etc.) per inlined definitions
- [ ] Meta Pixel events fire correctly per inlined definitions
- [ ] 409 cart-recovery flow tested with simulated concurrent purchase
- [ ] Lighthouse mobile score ≥ 90 across all pages
- [ ] Sitemap.xml + robots.txt + structured data validated
- [ ] Stripe is in live mode for production environment per the inlined coupon/launch checklist

## Branch + Commit Policy

- Work on branch `dev`
- Small commits per logical unit (one page wired per commit, checkout flow phases per commit)
- Follow `DEV_RULES.md`
- Do NOT merge to `main` — launch is the merge gate
- Push frequently for preview testing

---

## TRACK C: Integration

> **ACTION — (AGENT) builds; (SEAN) does final testing, real-card checkout, DNS flip at launch.** 
> Track C wires Track B frontend pages to Track A backend services and replaces placeholders with live data.

**First task of Track C**: `grep -rn "PLACEHOLDER" .` — every hit from Track B is a to-do entry. At end of C4, same grep must return zero results. See [Placeholder Hygiene](#placeholder-hygiene).

### C1: Wire Pages to Backend

> **ACTION — (AGENT) only.**

**YOU WILL HAVE**: All pages loading real data from Supabase

#### Placeholder Hygiene (Foundational)

Track B builds frontend pages with hardcoded placeholder content (images, text, product data) so design can be iterated visually before backend is wired. Track C replaces placeholders with live Supabase data. The risk: placeholders slip through to production.

**The convention** — wrap every piece of hardcoded content in a tagged comment:

  ```html
  <!-- PLACEHOLDER: product-title -->
  <h1>The Sunkeeper</h1>
  <!-- /PLACEHOLDER -->

  <!-- PLACEHOLDER: hero-image -->
  <img src="/placeholder/hero.webp" alt="Placeholder">
  <!-- /PLACEHOLDER -->
  ```

  ```css
  /* PLACEHOLDER: hero-bg */
  .hero { background: url('/placeholder/hero.webp'); }
  /* /PLACEHOLDER */
  ```

  ```javascript
  // PLACEHOLDER: sample-cart-data
  const sampleCart = [{ title: 'The Sunkeeper', price: 24500 }];
  // /PLACEHOLDER
  ```

**Workflow**:
  1. Track B: every hardcoded block gets wrapped. Name after the data it represents (`product-title`, `featured-carousel`, `related-cards`)
  2. Track C start: run `grep -rn "PLACEHOLDER" .` → that's your to-do list, sorted
  3. Track C end (before C4 Launch): same grep must return zero lines. Explicit checkbox in C4: `[ ] grep -rn "PLACEHOLDER" . returns no results`

**Why this over a build-tool flag**: zero tooling, works across HTML/CSS/JS uniformly, reviewable in PRs as a single diff.

#### Tracking Reference (GA4 + Meta Pixel)

> Event inventory consulted by every per-page wiring step below. All e-commerce events use GA4's standard `items` array format, which unlocks built-in reports under Reports > Monetization (product performance, purchase funnel, revenue by category/brand).

**Automatic metrics** (zero custom code): sessions, engagement time, engagement rate (replaces bounce rate), pages per session, traffic source/medium, device, browser, geography, scroll depth, outbound clicks.

##### E-commerce Events (with `items` array)

| Event              | Trigger                   | Format                                                                     |
| ------------------ | ------------------------- | -------------------------------------------------------------------------- |
| `view_item`        | Product page load         | `{ currency: 'USD', value, items: [buildGa4Item(product)] }`               |
| `add_to_cart`      | Add to Cart click         | `{ currency: 'USD', value, items: [buildGa4Item(item)] }`                  |
| `remove_from_cart` | Remove from Cart          | `{ currency: 'USD', value, items: [buildGa4Item(item)] }`                  |
| `begin_checkout`   | Checkout page load        | `{ currency: 'USD', value: cartTotal/100, items: cart.map(buildGa4Item) }` |
| `purchase`         | Completion page (success) | `{ transaction_id, currency: 'USD', value, items: [...] }`                 |

**`items` array format** (via `buildGa4Item()` helper in main.js):
  ```javascript
  {
    item_id: product.slug,           // 'the-sunkeeper'
    item_name: product.title,        // 'The Sunkeeper'
    item_brand: 'Everlastings by Emaline',
    item_category: product.product_type,  // 'miniature'
    item_category2: product.series,       // 'Portals to Peace'
    price: product.price / 100,      // 245.00
    quantity: 1
  }
  ```

##### Custom Events (no `items` array)

| Event                   | Trigger                                     | Parameters                                      |
| ----------------------- | ------------------------------------------- | ----------------------------------------------- |
| `newsletter_signup`     | Successful subscribe                        | `{ source }` ('homepage', 'footer', 'checkout') |
| `contact_form_submit`   | Contact form success                        | `{ subject }`                                   |
| `commission_inquiry`    | Commission form submit                      | `{ subject }`                                   |
| `search_filter`         | Shop filter applied                         | `{ filter_type, filter_value }`                 |
| `gallery_open`          | Lightbox opened                             | `{ slug, image_index }`                         |
| `video_play`            | Product video starts playing                | `{ slug, video_index }`                         |
| `promo_code_generated`  | Cart recovery flow completed                | `{ code }`                                      |
| `email_cta_capture`     | Email CTA form submitted                    | `{ source, slug }`                              |
| `customer_email_linked` | Purchase email matches existing subscriber* | `{ previous_source }`                           |

*fired by webhook, sent to GA4 Measurement Protocol

##### Meta Pixel Events (fire alongside GA4)

Each GA4 e-commerce event has a Meta Pixel equivalent fired in the same code path:

| GA4 Event             | Meta Pixel Event   | Meta Parameters                                                     |
| --------------------- | ------------------ | ------------------------------------------------------------------- |
| `view_item`           | `ViewContent`      | `{ content_ids: [slug], content_type: 'product', value, currency }` |
| `add_to_cart`         | `AddToCart`        | `{ content_ids: [slug], content_type: 'product', value, currency }` |
| `begin_checkout`      | `InitiateCheckout` | `{ content_ids: [...], num_items, value, currency }`                |
| `purchase`            | `Purchase`         | `{ content_ids: [...], num_items, value, currency }` + CAPI         |
| `newsletter_signup`   | `Lead`             | `{ content_name: 'Newsletter Signup' }`                             |
| `contact_form_submit` | `Contact`          | (no params)                                                         |
| `email_cta_capture`   | `Lead`             | `{ content_name: source }`                                          |

**CAPI (server-side)**: `Purchase` events also sent from `api/webhook.ts` via Meta Conversions API for iOS/ad-blocker resilience. Deduplicated with browser pixel via `event_id = stripe_event.id`.

#### Source of Truth Hierarchy (Reminder)

Before writing any Supabase fetches, remember the data hierarchy. Cited from `api/stripe-sync.ts`, `api/webhook.ts`, and `api/products.ts`.

  1. **Supabase** — authoritative product data, customer records, orders, site config
  2. **Stripe** — payment mirror only. Created from Supabase data via webhook, never manually edited
  3. **Cloudflare R2** — asset storage only. URLs referenced from Supabase product records
  4. **Frontend** — read-only consumer. Fetches from Supabase, never writes directly

When in doubt about product data, trust Supabase. Stripe reflects Supabase, not the other way around.

#### Supabase Client — `assets/js/main.js`

  ```html
  <!-- In every HTML page <head> -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="/assets/js/main.js"></script>
  ```

  ```javascript
  // assets/js/main.js

  // Fetch config from server (auto test/live switching)
  let SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY;

  async function initConfig() {
    try {
      const res = await fetch('/api/config');
      const config = await res.json();
      SUPABASE_URL = config.supabaseUrl;
      SUPABASE_PUBLISHABLE_KEY = config.supabasePublishableKey;
      window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    } catch {
      console.error('Failed to load config');
    }
  }

  function getSupabase() {
    return window._supabase;
  }

  // CDN base URL for product images
  const R2_PUBLIC_URL = 'https://cdn.everlastingsbyemaline.com';

  function formatPrice(cents) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD'
    }).format(cents / 100);
  }

  function slugify(title) {
    return title.toLowerCase().replaceAll(' ', '-');
  }

  // --- GA4 Enhanced E-commerce Helper ---

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

  // --- Meta Pixel Helper (AR #25) ---

  function trackMeta(eventName, params) {
    if (typeof fbq === 'function') {
      fbq('track', eventName, params);
    }
  }

  async function getProductBySlug(slug) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products').select('*').eq('slug', slug).single();
    if (error) { console.error('Failed to fetch product:', error.message); return null; }
    return data;
  }

  async function getProducts(options = {}) {
    const supabase = getSupabase();
    let query = supabase.from('products').select('*');
    if (options.available !== undefined) query = query.eq('available', options.available);
    if (options.featured) query = query.eq('featured', true);
    if (options.series) query = query.eq('series', options.series);
    if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    const { data, error } = await query;
    if (error) { console.error('Failed to fetch products:', error.message); return []; }
    return data;
  }

  // --- Cart (localStorage) ---

  function getCart() {
    return JSON.parse(localStorage.getItem('everlastings_cart') || '[]');
  }

  function addToCart(item) {
    const cart = getCart();
    if (cart.find(i => i.product_id === item.product_id)) return;
    cart.push(item);
    localStorage.setItem('everlastings_cart', JSON.stringify(cart));
    updateCartBadge();

    // GA4 enhanced e-commerce
    gtag('event', 'add_to_cart', {
      currency: 'USD',
      value: item.price / 100,
      items: [buildGa4Item(item)]
    });

    // Meta Pixel
    trackMeta('AddToCart', {
      content_ids: [item.slug],
      content_type: 'product',
      content_name: item.title,
      value: item.price / 100,
      currency: 'USD'
    });

    // Fire-and-forget: notify product interest trackers (AR #26)
    fetch('/api/cart-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: item.slug })
    }).catch(() => {}); // Never block cart UX
  }

  function removeFromCart(productId) {
    const item = getCart().find(i => i.product_id === productId);
    const cart = getCart().filter(i => i.product_id !== productId);
    localStorage.setItem('everlastings_cart', JSON.stringify(cart));
    updateCartBadge();
    if (item) {
      gtag('event', 'remove_from_cart', {
        currency: 'USD',
        value: item.price / 100,
        items: [buildGa4Item(item)]
      });
    }
  }

  function clearCart() { localStorage.removeItem('everlastings_cart'); }

  function getCartTotal() { return getCart().reduce((sum, item) => sum + item.price, 0); }

  function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const count = getCart().length;
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initConfig();
    updateCartBadge();
  });
  ```

  - [ ] (AGENT) **Create** `assets/js/main.js`

#### Product Page JS — `assets/js/product.js`

  - [ ] (AGENT) **Create** `assets/js/product.js` — replaces hardcoded product data with Supabase fetch
  - [ ] (AGENT) **Wire** Add to Cart / Buy Now buttons
  - [ ] (AGENT) **Wire** gallery with lightbox (click → fullscreen)
  - [ ] (AGENT) **Add** GA4 enhanced e-commerce: `gtag('event', 'view_item', { currency: 'USD', value: price/100, items: [buildGa4Item(product)] })`
  - [ ] (AGENT) **Add** Meta Pixel: `trackMeta('ViewContent', { content_ids: [slug], content_type: 'product', content_name: title, value: price/100, currency: 'USD' })`
  - [ ] (AGENT) **Add** related products: fetch 3-4 products from same series, render below story
  - [ ] (AGENT) **Wire** CTA 1 (product interest form): POST to `/api/subscribe` with `source: 'product-interest'` + insert into `product_interests` table
  - [ ] (AGENT) **Wire** CTA 3 (contemplation popup): 3-min timer, POST to `/api/subscribe` with `source: 'contemplation-offer'`, generate promo code
  - [ ] (AGENT) **Add** `video_play` event: `gtag('event', 'video_play', { slug, video_index })` when product video plays

#### Shop Grid JS — `assets/js/shop.js`

  - [ ] (AGENT) **Create** `assets/js/shop.js` — fetches products, renders tiles, handles filters
  - [ ] (AGENT) **Wire** filter sidebar to real data
  - [ ] (AGENT) **Wire** URL state: `?series=portals-to-peace&sort=price-asc`
  - [ ] (AGENT) **Replace** skeleton loaders with real content on load
  - [ ] (AGENT) **Add** GA4 event: `gtag('event', 'search_filter', { filter_type, filter_value })`

#### Homepage JS — `assets/js/homepage.js`

  - [ ] (AGENT) **Create** `assets/js/homepage.js`
  - [ ] (AGENT) **Fetch** featured products for carousel
  - [ ] (AGENT) **Fetch** theme from `site_config`
  - [ ] (AGENT) **Apply** dynamic CSS variables

#### Newsletter JS — `assets/js/newsletter.js`

  - [ ] (AGENT) **Create** `assets/js/newsletter.js` — POST to `/api/subscribe`
  - [ ] (AGENT) **Add** GA4 event: `gtag('event', 'newsletter_signup', { source: 'homepage' })`
  - [ ] (AGENT) **Add** Meta Pixel: `trackMeta('Lead', { content_name: 'Newsletter Signup' })`
  - [ ] (AGENT) **Wire** exit intent modal (CTA 2): detect mouse leave / visibilitychange, show if cart not empty, POST to `/api/subscribe` with `source: 'cart-exit'`

---

### C2: Checkout Flow End-to-End

> **ACTION — (AGENT) builds; (SEAN) smoke-tests with real card at launch (A4 + C4).**

**YOU WILL HAVE**: Complete purchase flow working — `/cart.html` availability check + `/checkout.html` progressive disclosure

#### 409 Conflict Cart Recovery Flow (v1.4 — shifted to /cart.html)

> UX and backend spec for the sold-while-you-browse recovery. 
> Implemented across `api/checkout/reserve.ts` (A2), `api/cart-recovery.ts` (A2), `cart.html` (B6), and `assets/js/cart.js` + `recovery.js` (C2).

##### What Triggers It

User clicks **{CHECKOUT}** on `/cart.html`. The browser fires `POST /api/checkout/reserve`. The server checks availability across all cart items (including any active holds held by other sessions). If any item is unavailable, the API returns **409** with `{ error, unavailable: ['slug-1', ...], related: [Product, Product, Product] }`.

**Crucially**: this happens on the cart page, BEFORE the user has entered a single address character or card digit. The old v1.3.1 behavior — 409 at the "Pay" button moment — is removed entirely. Reference: AR #28.

##### What the User Sees

**Step 1 — Immediate**: Sold items removed from cart. A warm overlay appears over the cart page content:

  > **Heading**: "These havens have found their homes"
  > **Body**: "{Product Name} sold while you were browsing. We're sorry for the heartache."
  > **Offer**: "As a thank you for your interest, here's a one-time discount on your next purchase:"
  > **Email input**: placeholder "Your email" (pre-filled from sessionStorage if user entered it on cart page)
  > **Button**: "Send My Discount"
  > **Secondary link**: "Continue with remaining items" (triggers a fresh `/api/checkout/reserve` with the reduced cart)

**Step 1a — Related products** (NEW, feedback item 9):

Below the email form, show 2-3 "While you're here — these havens still await" product cards pulled from the `related` array returned by the API (same series or product_type, `available = true`).

  ```html
  <div class="recovery-related">
    <p class="related-heading">While you're here — these havens still await:</p>
    <div class="related-cards-mini">
      <!-- Rendered from API response: related: Product[] -->
    </div>
  </div>
  ```

Clicking a related card navigates to the product page WITHOUT losing the recovery overlay state (email persisted via sessionStorage).

**Step 2 — After email submission**: Button shows "Generating..." while API call processes. Backend calls `POST /api/cart-recovery` which generates the unique promotion code AND sends an email to the user via Resend.

**Step 3 — Promo code display (in overlay)**:

  > **Heading**: "A small gift for your patience"
  > **Body**: "Use code **{AUTO-GENERATED-CODE}** for 10% off your next purchase."
  > **Expiry note**: "Valid for 30 days. We've also emailed it to you."
  > **Button**: "Continue Shopping" (navigates to /shop.html)

**Step 4**: If remaining items exist, user can dismiss overlay and `[CHECKOUT]` again — reserve endpoint runs against the remaining cart.

**Step 5**: If cart is now empty, "Continue Shopping" is the only action.

##### Backend Behavior

  - `POST /api/cart-recovery` (see A2) generates a unique Stripe promotion code via API from coupon `cart-recovery-10` (see Coupon + Promotion Code Strategy below)
  - Promotion code: `max_redemptions: 1`, `expires_at: now + 30 days`
  - Email captured as subscriber with `source: 'cart-recovery'`
  - Resend sends the coupon email from `RESEND_FROM_EMAIL`
  - Upsert on subscribers (email already exists → update `promo_code`, `promo_code_expires_at`)

##### Coupon Setup (this flow)

Created automatically by `api/_bootstrap/coupons.ts` (Track A1 Stripe). For this flow specifically:

  - Name: "Haven Finder Apology"
  - 10% off, **Duration: Forever** (`once` is a subscription concept and does nothing for one-time payments)
  - Max redemptions: **BLANK** (single-use limit lives on each generated promotion code)
  - Coupon ID: `cart-recovery-10`

##### Coupon + Promotion Code Strategy (full)

The v1.3.1 doc mixed up Stripe's subscription-centric coupon `duration` setting with one-time-payment code mechanics. Here's the corrected, full strategy.

**The core rule**: A Stripe **coupon** is the discount RULE. A Stripe **promotion code** is a single-use redemption of that rule. We never expose the coupon ID to customers — we generate unique promotion codes per event.

**The two coupons** (created once at setup by `api/_bootstrap/coupons.ts`):

| Purpose | Coupon ID              | Name                             | Discount | Duration    | Max redemptions |
| ------- | ---------------------- | -------------------------------- | -------- | ----------- | --------------- |
| 1       | `cart-recovery-10`     | Haven Finder Apology             | 10% off  | **Forever** | **BLANK**       |
| 2       | `newsletter-welcome-5` | Welcome to the Firelight Council | 5% off   | **Forever** | **BLANK**       |

  1. for *Dynamic promotion codes per 409 recovery*
  2. for *Dynamic promotion codes per contemplation-offer signup*

Both use `Duration: Forever` because that's the correct setting for one-time payments (`once` is a subscription concept — it means "one billing cycle", which is meaningless for us). Both have **blank max_redemptions** because capping the coupon globally would ruin us — we want every user event to generate its OWN unique code.

**Per-event code generation**:

  ```typescript
  // Example: cart-recovery (api/cart-recovery.ts)
  const promoCode = await stripe.promotionCodes.create({
    coupon: 'cart-recovery-10',
    max_redemptions: 1,                             // single-use
    expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),  // 30 days
    metadata: { source: 'cart-recovery', email, lost_items: JSON.stringify(lost_items) },
  });
  // promoCode.code → e.g. 'HAVEN-A9X2P7'
  ```

Store the generated code in the relevant table:
  - Cart-recovery: stored in Stripe metadata + linked via email in `subscribers`
  - Newsletter welcome: stored in `subscribers.promo_code` + `subscribers.promo_code_expires_at`

**Email delivery** (Resend):
  - Cart recovery coupon: `api/cart-recovery.ts` sends email with the code after generating
  - Newsletter welcome with coupon (only from `contemplation-offer` source): `api/subscribe.ts` generates a code, saves it, and emails a welcome email that contains the code
  - Other newsletter sources (footer, homepage, checkout-started) get a welcome email WITHOUT a code — they're opting in, not being offered an apology/incentive

**What NOT to do**:
  - Setting `max_redemptions` on the coupon itself (caps total redemptions globally)
  - Handing out the coupon ID directly (`cart-recovery-10`) as the code
  - Using `Duration: Once` (subscription concept; has no effect on payment intents)

#### Cart JS — `assets/js/cart.js` (NEW — AR #28)

  ```javascript
  // assets/js/cart.js
  // Handles /cart.html — line items, email/name capture, [CHECKOUT] button

  function getOrCreateBrowserSessionId() {
    let id = localStorage.getItem('everlastings_session_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('everlastings_session_id', id);
    }
    return id;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const cart = getCart();
    const container = document.getElementById('cart-container');
    const emptyState = document.getElementById('cart-empty');

    if (!cart.length) {
      container.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    renderCartLines(cart);
    document.getElementById('cart-total').textContent = formatPrice(getCartTotal());

    // Prefill email/name if user entered previously in this session
    const savedEmail = sessionStorage.getItem('checkout_email') || '';
    const savedName = sessionStorage.getItem('checkout_name') || '';
    document.getElementById('cart-email').value = savedEmail;
    document.getElementById('cart-name').value = savedName;

    document.getElementById('cart-checkout-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      const btn = e.target;
      btn.disabled = true;
      btn.textContent = 'Checking availability…';

      const email = document.getElementById('cart-email').value.trim();
      const name = document.getElementById('cart-name').value.trim();
      if (email) sessionStorage.setItem('checkout_email', email);
      if (name) sessionStorage.setItem('checkout_name', name);

      const session_id = getOrCreateBrowserSessionId();

      try {
        const res = await fetch('/api/checkout/reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.map(i => ({ product_id: i.product_id, slug: i.slug })),
            session_id,
            email: email || undefined,
            name: name || undefined,
          }),
        });

        if (res.status === 409) {
          const data = await res.json();
          data.unavailable.forEach(slug => {
            const item = cart.find(i => i.slug === slug);
            if (item) removeFromCart(item.product_id);
          });
          showSoldRecoveryOnCart(data.unavailable, data.related || []);
          btn.disabled = false;
          btn.textContent = 'CHECKOUT';
          return;
        }

        if (!res.ok) {
          alert('Something went awry. Please try again.');
          btn.disabled = false;
          btn.textContent = 'CHECKOUT';
          return;
        }

        gtag('event', 'begin_checkout', {
          currency: 'USD',
          value: getCartTotal() / 100,
          items: cart.map(buildGa4Item),
        });
        trackMeta('InitiateCheckout', {
          content_ids: cart.map(i => i.slug),
          content_type: 'product',
          num_items: cart.length,
          value: getCartTotal() / 100,
          currency: 'USD',
        });

        window.location.href = '/checkout.html';
      } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.textContent = 'CHECKOUT';
      }
    });
  });

  function showSoldRecoveryOnCart(unavailableSlugs, related) {
    const popup = document.getElementById('sold-recovery-popup');
    const names = unavailableSlugs.join(', ');
    popup.innerHTML = renderRecoveryStep1(names, related);
    popup.classList.remove('hidden');
    wireRecoveryForm(popup, unavailableSlugs);
  }
  ```

  - [ ] (AGENT) **Create** `assets/js/cart.js`

Implements the two-stage progressive disclosure on `/checkout.html`. Assumes `/cart.html` already ran `/api/checkout/reserve` and a soft hold exists. This page never triggers the 409 recovery flow — that's `/cart.html`'s job now.

  ```javascript
  // assets/js/checkout.js

  document.addEventListener('DOMContentLoaded', async () => {
    const cart = getCart();
    const sessionId = localStorage.getItem('everlastings_session_id');

    if (!cart.length || !sessionId) {
      window.location.href = '/cart.html';
      return;
    }

    renderOrderSummary(cart);

    const configRes = await fetch('/api/config');
    const config = await configRes.json();
    const stripe = Stripe(config.publishableKey);

    const emailPrefill = sessionStorage.getItem('checkout_email') || '';
    const namePrefill = sessionStorage.getItem('checkout_name') || '';

    // Stage A: info form (address + email)
    const stageA = document.getElementById('stage-a-info');
    const stageB = document.getElementById('stage-b-payment');
    document.getElementById('checkout-email').value = emailPrefill;
    document.getElementById('checkout-name').value = namePrefill;

    document.getElementById('info-continue-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('checkout-email').value.trim();
      const name = document.getElementById('checkout-name').value.trim();
      if (!email || !name) {
        showCheckoutError('Please complete your name and email.');
        return;
      }

      // Create Stripe session now (hold was already created at /cart.html)
      let data;
      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.map(item => ({
              product_id: item.product_id,
              slug: item.slug,
              stripe_price_id: item.stripe_price_id,
            })),
            session_id: sessionId,
            email,
            name,
          }),
        });

        if (response.status === 410) {
          // Hold expired — punt back to /cart.html for re-check
          showCheckoutError('Your reservation timed out. Returning to cart…');
          setTimeout(() => { window.location.href = '/cart.html'; }, 2000);
          return;
        }

        if (!response.ok) {
          showCheckoutError('Something went awry. Please try again.');
          return;
        }

        data = await response.json();
      } catch (err) {
        showCheckoutError('Unable to load checkout. Please refresh.');
        return;
      }

      // Mount Stripe Elements for Stage B
      const checkout = stripe.initCheckout({
        clientSecret: data.clientSecret,
        elementsOptions: {
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#4A1942',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
          },
        },
      });

      const paymentElement = checkout.createPaymentElement();
      paymentElement.mount('#payment-element');

      const addressElement = checkout.createAddressElement('shipping');
      addressElement.mount('#address-element');

      addressElement.on('change', (ev) => {
        if (!ev.complete) {
          showCheckoutError('Please complete your shipping address.');
        } else {
          hideCheckoutError();
        }
      });

      checkout.on('change', (session) => {
        document.getElementById('submit-btn').disabled = !session.canConfirm;
      });

      // Stage B unlocks
      stageA.classList.add('collapsed');
      stageB.classList.remove('hidden');
      stageB.scrollIntoView({ behavior: 'smooth' });

      document.getElementById('checkout-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing…';
        try {
          const actions = await checkout.loadActions();
          const result = await actions.confirm();
          if (result.type === 'error') {
            showCheckoutError(result.error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Bring This Haven Home';
          }
        } catch (err) {
          showCheckoutError('Payment could not be processed. Please try again.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Bring This Haven Home';
        }
      });
    });
  });

  function renderOrderSummary(cart) {
    const el = document.getElementById('order-summary');
    if (!el) return;
    el.innerHTML = cart.map(item => `
      <div class="order-item">
        <img src="${item.thumbnail}" alt="${item.title}" class="order-thumb">
        <div><strong>${item.title}</strong><span>${formatPrice(item.price)}</span></div>
      </div>
    `).join('') + `<div class="order-total"><strong>Total: ${formatPrice(getCartTotal())}</strong></div>`;
  }

  function showCheckoutError(message) {
    const el = document.getElementById('checkout-error');
    el.textContent = message;
    el.classList.remove('hidden');
  }

  function hideCheckoutError() {
    document.getElementById('checkout-error').classList.add('hidden');
  }
  ```

  - [ ] (AGENT) **Create** `assets/js/checkout.js` (the two-stage version above)
  - [ ] (AGENT) **Create** `assets/js/recovery.js` (shared recovery overlay rendering used by cart.js)

#### Return Page — `complete.html`

  ```javascript
  document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) { showResult('error', 'Something went awry.'); return; }

    try {
      const response = await fetch(`/api/session-status?session_id=${sessionId}`);
      const data = await response.json();

      if (data.status === 'complete') {
        // GA4 enhanced e-commerce purchase
        gtag('event', 'purchase', {
          transaction_id: sessionId,
          currency: 'USD',
          value: (data.amount_total || 0) / 100,
          items: (data.items || []).map(item => buildGa4Item(item))
        });

        // Meta Pixel purchase (browser-side, deduped with CAPI via event_id)
        trackMeta('Purchase', {
          content_ids: (data.items || []).map(i => i.slug),
          content_type: 'product',
          value: (data.amount_total || 0) / 100,
          currency: 'USD',
          num_items: (data.items || []).length
        });

        clearCart();
        showResult('success', 'Your haven is on its way.');
      } else {
        showResult('error', 'Something went awry. Please try again.');
      }
    } catch {
      showResult('error', 'Unable to verify your order. Please check your email for confirmation.');
    }
  });

  function showResult(type, message) {
    document.getElementById('result-icon').className = type;
    document.getElementById('result-message').textContent = message;
  }
  ```

  - [ ] (AGENT) **Wire** checkout.html to use `api/config` for Stripe key (no hardcoded key)
  - [ ] (AGENT) **Start** Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook`
  - [ ] (AGENT) **Test** full flow: product → cart → checkout → pay → completion
  - [ ] (AGENT) **Verify** customer + order records created, product marked sold, cart cleared

---

### C3: SEO Finalization

> **ACTION — (AGENT) builds; (SEAN) submits sitemap in Search Console.**

  - [ ] (AGENT) **Add** dynamic meta titles + descriptions (product pages from Supabase data)
  - [ ] (AGENT) **Add** Open Graph + Twitter Card tags
  - [ ] (AGENT) **Add** Product schema.org structured data (JSON-LD)
  - [ ] (AGENT) **Create** `sitemap.xml` + `robots.txt`
  - [ ] (SEAN) **Submit** sitemap to Google Search Console

---

### C4: Testing + Launch Prep

> **ACTION — (SEAN+AGENT).** 
> Agent runs automated checks; Sean does final QA, real-card test, DNS flip.

**YOU WILL HAVE**: Production-ready site

  - [ ] (AGENT) **Run** `grep -rn "PLACEHOLDER" .` — MUST return zero results before proceeding

#### Stripe Live Mode

Follow switchover process (see Live Launch Switchover Process in the v1.4.3 IMPLEMENT master doc).

#### Testing

  - [ ] (SEAN) Cross-browser: Chrome, Safari, Firefox, Edge
  - [ ] (SEAN) Mobile: iPhone, iPad, Android
  - [ ] (SEAN) Full checkout flow: product → cart → pay → "Sold" status (one real card, refund after)
  - [ ] (SEAN) Admin flow: login → add product → see it on shop page
  - [ ] (SEAN) Newsletter from homepage + footer
  - [ ] (SEAN) Contact form
  - [ ] (SEAN) All internal links

#### Performance

  - [ ] (AGENT) Lighthouse 90+ all categories
  - [ ] (AGENT) All images WebP, lazy loaded
  - [ ] (AGENT) WCAG AA accessibility
  - [ ] (AGENT) Keyboard navigation (including lightbox)
  - [ ] (AGENT) Alt text on every image

#### Launch

  - [ ] (SEAN) DNS pointed to Vercel
  - [ ] (SEAN) SSL active
  - [ ] (SEAN) Real products loaded (5-10 minimum) via admin UI or the AI protocol
  - [ ] (SEAN) Final review with Sean + Emy

---

## Appendix: Error States Reference

> Every error state the site can surface, with user-facing copy and implementation notes. Used by A4 and C4 test cases. Referenced across C1 (page wiring) and C2 (checkout flow).

#### Product — Not Found
  - **User sees**: "This haven could not be found." + link to shop
  - **Code**: `getProductBySlug()` returns null → `showError()`

#### Product — Supabase Fetch Fails
  - **User sees**: "This haven could not be found."
  - **Code**: Supabase error → `showError()`

#### Product — Image Fails to Load
  - **User sees**: Broken image hidden, placeholder shown
  - **Code**: `onerror` handler on `<img>`

#### Product — Sold
  - **User sees**: "Sold" badge, Buy Now disabled
  - **Code**: `available === false` → button disabled

#### Checkout — Cart Empty
  - **User sees**: "Your cart is empty." + link to shop
  - **Code**: No items in localStorage

#### Cart — Items Sold Before Reserve (409)
  - **User sees**: Recovery popup ON /cart.html — see Cart Recovery Flow section. Email + related products offered before any PII entered
  - **Code**: `POST /api/checkout/reserve` returns 409 → `showSoldRecovery({ unavailable, related })`

#### Checkout — Hold Expired (410)
  - **User sees**: "Your reservation timed out. Please return to cart to re-check availability." + button "Back to Cart"
  - **Code**: `POST /api/checkout` returns 410 (hold gone) → redirect user to /cart.html. Rare — only hits if user idles 15+ minutes on checkout page

#### Checkout — Session Creation Fails
  - **User sees**: "Something went awry. Please try again."
  - **Code**: API returns 500 → error message

#### Checkout — Payment Declined
  - **User sees**: Stripe error message displayed
  - **Code**: `actions.confirm()` returns error

#### Checkout — Network Error
  - **User sees**: "Unable to load checkout. Please refresh."
  - **Code**: fetch throws → catch block

#### Checkout — Shipping Address Incomplete
  - **User sees**: "Please complete your shipping address." + highlight on missing field
  - **Code**: Stripe AddressElement `change` event reports `complete: false`

#### Checkout — Address Not Deliverable
  - **User sees**: "We couldn't verify this address. Please double-check."
  - **Code**: Stripe AddressElement validation error → display in `#checkout-error`

#### Checkout — Restricted Country
  - **User sees**: "We currently only ship within the United States. Contact us for international inquiries." + link to /contact.html
  - **Code**: Customer picks country not in `allowed_countries: ['US']` → AddressElement rejects → display message

#### Checkout — Billing/Shipping Mismatch
  - Stripe's Custom Checkout handles separately when user unchecks "Same as shipping". Default Stripe error display applies; no custom handling needed

#### Complete — Success
  - **User sees**: "Your haven is on its way."
  - **Code**: Session status `complete` → success state, cart cleared

#### Complete — Error
  - **User sees**: "Something went awry. Please try again."
  - **Code**: Session status not `complete` → error state

#### Shop — Loading
  - **User sees**: Skeleton shimmer placeholders
  - **Code**: Initial data fetch pending

#### Shop — No Products at All
  - **User sees**: "New havens are being crafted. Check back soon."
  - **Code**: DB returned 0 products, no filter active → empty state

#### Shop — All Products Sold (none available, no filter)
  - **User sees**: "Every haven has found its home. Join the Firelight Council for first look at new arrivals." + inline newsletter input
  - **Code**: All products `available = false` AND no filter active → inline newsletter form

#### Shop — Filter Returned Zero Matches
  - **User sees**: "No havens match your search." + "Clear filters" button
  - **Code**: User-applied filter returns empty set → message + reset button

#### Shop — Fetch Failed
  - **User sees**: "Havens are resting. Please refresh."
  - **Code**: Supabase returned an error → fallback state

#### Newsletter — Already Subscribed
  - **User sees**: "You're already part of the Firelight Council."
  - **Code**: 23505 unique constraint → friendly message

#### Newsletter — Invalid Email
  - **User sees**: "Valid email required"
  - **Code**: Client + server validation

#### Admin — Not Authenticated
  - **User sees**: Redirect to login
  - **Code**: Supabase auth check

#### Admin — Upload Too Large
  - **User sees**: "File must be under 10MB" (50MB for videos)
  - **Code**: File size check before upload

---

## Cross-Track Sequencing

```
Phase 0 ✓ → Track A (backend) ─┐
                               ├──→ Track C (integration) → Launch
            Track B (frontend) ┘
```

A and B run in parallel. C cannot start until A2 + B (full pages) are complete.
