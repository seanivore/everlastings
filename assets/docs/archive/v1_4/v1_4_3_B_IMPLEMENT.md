# v1.4.3 Track B — Frontend Design Implementation Guide

## Track Goal
Deliver the frontend design layer: design system (CSS custom properties, typography, base components, lightbox, loading states, GA4/Pixel script tags), header/footer/nav, product page, shop grid, homepage, and remaining pages — all with hardcoded placeholder content marked `<!-- PLACEHOLDER: ... -->`. No live data integration in this track. Track A (backend) runs in parallel; Track C (integration) takes your placeholders and wires them to the live API.

## Required Pre-Reads (Read In Full at Session Start)

Claude Code's `@` imports do NOT recursively auto-load in the current CLI version (verified empirically 2026-05-02 — `/context` shows imports as literal text, not expanded content). Your first action — before reading the rest of this guide — is to Read all four files below in full. BRAND.md especially: Track B is brand-heavy, every visual and copy decision should flow from it.

- `.agent/AGENTS.md` — agent instructions
- `.agent/DEV_RULES.md` — workflow protocol
- `assets/docs/EVERLASTINGS_STORE.md` — architectural primer
- `assets/docs/BRAND.md` — visual + voice + email brand reference (CRITICAL for Track B)

You can skip `.claude/CLAUDE.md` — its only content is `@.agent/AGENTS.md` (already in your list above).

## Do Not Explore
This track is frontend-only and works with hardcoded content. Do NOT read or modify:
- `api/**` (Track A owns backend)
- `supabase/**` (Track A owns schema)
- `admin/**` (Track A owns admin UI)
- `assets/js/cart.js`, anything that fetches from API (Track C owns wiring)

You will create JS files (e.g., `assets/js/lightbox.js`, simple interactions) but they should not call any API endpoint. Mark every spot needing live data with `<!-- PLACEHOLDER: description -->` so Track C can grep for them.

## Other Tracks at a Glance

**Track A (parallel):** Backend — produces 14 API endpoints, Supabase schema, admin UI, Stripe sync. Provides the data shapes you'll consume later (in Track C). For Track B you don't call APIs.

**Track C (after A+B):** Integration — replaces your `<!-- PLACEHOLDER: ... -->` markers with live Supabase fetches, wires checkout flow, completes SEO. Your design system + page structure must support real data populating into the same DOM hooks.

## Subagent Delegation Strategy

Effort is set to extra-high; conserve context:
- **B1 Design System**: do directly (orchestrator). It's foundational; everything else depends on these tokens.
- **B2 Header/Footer/Nav**: one subagent after B1.
- **B3 Product Page**: one subagent (this includes email capture CTAs).
- **B4 Shop Grid**: one subagent.
- **B5 Homepage**: one subagent.
- **B6 Remaining Pages**: one subagent.

Each page subagent gets B1 output (design system tokens) + their page-specific section. Do not pass the whole guide.

## Verification Gate (Done Means)

- [ ] All pages render with placeholder content (no JS errors)
- [ ] Design system CSS tokens render correctly across pages
- [ ] Lighthouse mobile score ≥ 90 on each page
- [ ] `grep -r 'PLACEHOLDER:' .` returns the expected set of markers (every spot needing live data)
- [ ] BRAND.md voice + visual standards visibly applied (color palette, typography, photography spec)
- [ ] All error state UX implemented per the inlined Error States Reference

## Branch + Commit Policy

- Work on branch `dev`
- Small commits per logical unit (one component per commit, one page per commit)
- Follow `DEV_RULES.md`
- Do NOT merge to `main`
- Push after each page milestone for preview deployment

---

## TRACK B: Frontend Design

> **ACTION — (AGENT) builds; (SEAN) reviews visual design.** 
> Track B is entirely frontend. All hardcoded content must use the `PLACEHOLDER:` convention (see Placeholder Hygiene below) so Track C's grep pass catches everything.

Initial pages are built using placeholder content that needs to be sourced during the build process and saved to the appropriate locations. Every page is built with hardcoded HTML — no JavaScript data-fetching. Lorem ipsum text and placeholder images. Client reviews and iterates on visual design.

> **Verified**: All page descriptions from v1.1 planning docs (homepage, shop, product, about, contact, FAQ, shipping, terms, privacy, policies, checkout, complete) are present in Track B below. No pages were lost during restructuring.

### B1: Design System

> **ACTION — (AGENT) only.**

**YOU WILL HAVE**: CSS variables, typography, base components, responsive scaffolding

#### Placeholder Hygiene

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

#### CSS Custom Properties

  - [ ] (AGENT) **Create** `assets/css/styles.css`
  - [ ] (AGENT) **Define** color variables — copy from `BRAND.md` > CSS Custom Properties
  - [ ] (AGENT) **Define** typography variables (font-display, font-body, size scale)
  - [ ] (AGENT) **Define** spacing, shadow, radius, transition, z-index tokens:

  ```css
  :root {
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;
    --space-3xl: 4rem;

    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
    --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);

    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;

    --transition-fast: 150ms ease;
    --transition-base: 250ms ease;
    --transition-slow: 400ms ease;

    --z-header: 100;
    --z-modal: 200;
    --z-lightbox: 300;

    --header-height: 64px;
  }
  ```

#### Typography

  - [ ] (AGENT) **Add** Cormorant Garamond via Google Fonts
  - [ ] (AGENT) **Style** heading hierarchy (h1-h6 using --font-display)
  - [ ] (AGENT) **Style** body text (--font-body, line-height 1.6)

#### Base Components

  - [ ] (AGENT) **Buttons**: primary (plum bg), secondary (outline), ghost, disabled
  - [ ] (AGENT) **Cards**: product tiles with hover shadow lift + scale 1.05
  - [ ] (AGENT) **Forms**: border, focus state (plum outline), padding, radius
  - [ ] (AGENT) **Images**: `object-fit: cover`, `aspect-ratio: 4/5`, `loading="lazy"`
  - [ ] (AGENT) **Badges**: "Sold" (fog bg, muted text), "Featured" (gold border)
  - [ ] (AGENT) **Errors**: subtle, non-intrusive, ink text on fog bg

#### Loading States 

Theses are 'Skeleton Screens'. 

  - [ ] (AGENT) **Style** skeleton loading placeholders for product page and shop grid
  - [ ] (AGENT) **Animate** with shimmer effect (CSS `@keyframes` gradient sweep)

  ```css
  .skeleton {
    background: linear-gradient(90deg, var(--color-fog) 25%, #e0e0e0 50%, var(--color-fog) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-sm);
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  ```

#### Lightbox Component

  - [ ] (AGENT) **Style** fullscreen overlay: dark bg, centered image, close button
  - [ ] (AGENT) **Add** left/right navigation arrows
  - [ ] (AGENT) **Support** keyboard: Escape to close, Arrow keys to navigate

  ```css
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: var(--z-lightbox);
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lightbox img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
  }

  .lightbox-close {
    position: absolute;
    top: var(--space-md);
    right: var(--space-md);
    color: var(--color-cream);
    font-size: 2rem;
    cursor: pointer;
  }

  .lightbox-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-cream);
    font-size: 2rem;
    cursor: pointer;
    padding: var(--space-md);
  }

  .lightbox-prev { left: var(--space-md); }
  .lightbox-next { right: var(--space-md); }
  ```

#### Inline SVG Icons

No icon library. 5-6 simple SVG icons used in product details:

  - [ ] (AGENT) **Create** icons: dimensions (ruler), weight (scale), materials (palette), lighting (sun), care (shield), shipping (truck)
  - [ ] (AGENT) **Style** at 20x20px, `currentColor` fill

#### Responsive Foundation

  - [ ] (AGENT) **Set** base mobile (393px)
  - [ ] (AGENT) **Add** tablet breakpoint (768px)
  - [ ] (AGENT) **Add** desktop breakpoint (1024px)
  - [ ] (AGENT) **Add** large desktop (1440px)

#### GA4 Script Tag

  - [ ] (AGENT) **Add** `gtag.js` snippet to `<head>` of all pages (include in header template):

  ```html
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
  ```

#### Meta Pixel Script Tag 

These are from AR #25 — see [Architecture Reference](/assets/docs/EVERLASTINGS_STORE.md#architecture-reference). 

  - [ ] (AGENT) **Add** Meta Pixel base code to `<head>` of all pages (alongside GA4):

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
  fbq('init', 'META_PIXEL_ID_HERE');
  fbq('track', 'PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=META_PIXEL_ID_HERE&ev=PageView&noscript=1"/></noscript>
  ```

  `PageView` fires automatically on every page load. No extra code needed.

#### Email Capture CTA Styles 

These are from AR #26 — see [Architecture Reference](/assets/docs/EVERLASTINGS_STORE.md#architecture-reference).

  - [ ] (AGENT) **Style** contemplation popup (bottom-right peel-up):

  ```css
  .contemplation-popup {
    position: fixed;
    bottom: 0;
    right: 0;
    max-width: 360px;
    transform: translateY(100%);
    transition: transform var(--transition-slow);
    z-index: var(--z-modal);
    background: var(--bg-primary);
    border-top-left-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: var(--space-lg);
  }
  .contemplation-popup.visible {
    transform: translateY(0);
  }
  ```

  - [ ] (AGENT) **Style** exit intent modal (centered overlay)
  - [ ] (AGENT) **Style** product interest CTA (below sticky card buttons)

---

### B2: Header, Footer, Nav

> **ACTION — (AGENT) only.**

**YOU WILL HAVE**: Consistent navigation on all pages (hardcoded, no JS needed)

#### Header

  - [ ] (AGENT) **Logo** (left, links to homepage)
  - [ ] (AGENT) **Nav**: Home, Shop (dropdown), About, Commissions, Contact
  - [ ] (AGENT) **Shop dropdown**: All | Portals to Peace | Book Nooks & Story Lofts | Seasonal & Limited | Sold Archive
  - [ ] (AGENT) **Cart icon** with count badge (right) — links to `/checkout.html`
  - [ ] (AGENT) **Mobile**: hamburger (left), logo (center), cart icon (right)
  - [ ] (AGENT) **Sticky** on scroll

#### Footer

  - [ ] (AGENT) **Four columns**: About, Shop, Support, Connect
  - [ ] (AGENT) **Newsletter signup**: email input (wired in Track C)
  - [ ] (AGENT) **Social links**: Instagram, Facebook, Pinterest, TikTok
  - [ ] (AGENT) **Bottom bar**: copyright, "Site by Sean August Horvath", Terms | Privacy

---

### B3: Product Page 

> **ACTION — (AGENT) only.**

These use placeholder data.

**YOU WILL HAVE**: Complete product page layout with hardcoded sample product

  - [ ] (AGENT) **Create** `product.html` — two-column layout:
    - Left: `.product-story` — scrollable gallery + story card
    - Right: `.product-sticky-card` — sticky details card
  - [ ] (AGENT) **Hardcode** sample product (The Sunkeeper) with placeholder text and images
  - [ ] (AGENT) **Build** image gallery: main image + thumbnail strip
  - [ ] (AGENT) **Build** lightbox: click gallery image → fullscreen overlay with nav
  - [ ] (AGENT) **Build** sticky product card:

  ```html
  <aside class="product-sticky-card">
    <img class="sticky-thumb" src="/placeholder/hero.webp" alt="The Sunkeeper">
    <h2>The Sunkeeper</h2>
    <p class="price">$245.00</p>

    <button class="btn-primary">Add to Cart</button>
    <button class="btn-secondary">Buy Now</button>

    <p class="availability-note">
      Each piece is one-of-a-kind.
      <a href="/policies.html#availability">Availability confirmed at checkout</a>.
    </p>

    <!-- Email CTA 1: Product Interest (AR #26) -->
    <div class="interest-cta" id="product-interest-cta">
      <p class="interest-text">This is a one-of-a-kind piece. Love it? Get notified if someone else adds it to their cart.</p>
      <form id="interest-form" class="interest-form">
        <label class="checkbox-label">
          <input type="checkbox" required>
          Please email me. I agree to <a href="/terms.html">Terms</a> &amp; <a href="/privacy.html">Privacy Policy</a>.
        </label>
        <input type="email" placeholder="Your email" required>
        <button type="submit" class="btn-secondary btn-sm">Notify Me</button>
      </form>
    </div>
  </aside>
  ```

  - [ ] (AGENT) **Style** sticky behavior: `position: sticky; top: calc(var(--header-height) + var(--space-lg));`
  - [ ] (AGENT) **Mobile** (< 768px): not sticky, card below gallery in normal flow
  - [ ] (AGENT) **Build** features list with inline SVG icons
  - [ ] (AGENT) **Build** details sections: dimensions, materials, care, shipping
  - [ ] (AGENT) **Build** story card section with poetic lorem ipsum
  - [ ] (AGENT) **Add** breadcrumb: Home > Shop > The Sunkeeper
  - [ ] (AGENT) **Add** "Related Havens" section placeholder (3-4 product cards, hardcoded)

#### Media Rendering 

This if for videos/GIFs in gallery. 

  ```html
  <!-- Video -->
  <video controls poster="/placeholder/hero.webp" class="gallery-media">
    <source src="/placeholder/video.mp4" type="video/mp4">
  </video>

  <!-- GIF -->
  <img src="/placeholder/detail.gif" alt="Detail animation" class="gallery-media" loading="lazy">

  <!-- YouTube (privacy-enhanced) -->
  <iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
    class="gallery-media" loading="lazy" allowfullscreen></iframe>
  ```

#### Email CTA 2: Cart Exit Intent Modal

When a user has items in cart and navigates away or triggers exit intent:

  ```html
  <!-- Include on all pages (hidden by default) -->
  <div class="exit-modal hidden" id="exit-intent-modal">
    <div class="exit-modal-overlay"></div>
    <div class="exit-modal-content">
      <button class="exit-modal-close">&times;</button>
      <h3>Don't miss out</h3>
      <p>This is one of a kind. Can we email you if someone else adds it to their cart or if we have a discount?</p>
      <form id="exit-email-form">
        <label class="checkbox-label">
          <input type="checkbox" required>
          Please email me. I agree to <a href="/terms.html">Terms</a> &amp; <a href="/privacy.html">Privacy Policy</a>.
        </label>
        <input type="email" placeholder="Your email" required>
        <button type="submit" class="btn-primary">Keep Me Updated</button>
      </form>
    </div>
  </div>
  ```

  - Only shows once per session (sessionStorage flag)
  - Only shows if cart is not empty
  - Triggered by: mouse leaving viewport top (desktop) or `visibilitychange` (mobile)
  - POSTs to `/api/subscribe` with `source: 'cart-exit'`
  - Success: close modal, brief toast "You're on the list."

#### Email CTA 3: 3-Minute Timed Contemplation Popup

When a user has been on a product page for 3+ minutes, a subtle popup peels up from the bottom-right:

  ```html
  <div class="contemplation-popup" id="contemplation-popup">
    <div class="contemplation-content">
      <button class="contemplation-close">&times;</button>
      <p>Love it? Join our newsletter for 5% off!</p>
      <form id="contemplation-form">
        <label class="checkbox-label">
          <input type="checkbox" required>
          I agree to <a href="/terms.html">Terms</a> &amp; <a href="/privacy.html">Privacy Policy</a>.
        </label>
        <input type="email" placeholder="Your email" required>
        <button type="submit" class="btn-primary">Get 5% Off</button>
      </form>
    </div>
  </div>
  ```

  - Triggered by `setTimeout(3 * 60 * 1000)` on product page
  - Only shows once per session (sessionStorage)
  - Only shows if user hasn't already subscribed from CTA 1
  - Animation: bottom-right peel-up (see B1 CSS)
  - POSTs to `/api/subscribe` with `source: 'contemplation-offer'`
  - On success: generates unique 5% promo code via Stripe promotion code API (coupon `newsletter-welcome-5`), displays code inline
  - Fires `email_cta_capture` GA4 event + `Lead` Meta Pixel event

---

### B4: Shop Grid 

> **ACTION — (AGENT) only.**

These use placeholder data.

**YOU WILL HAVE**: Filterable grid layout with hardcoded product tiles

  - [ ] (AGENT) **Create** `shop.html` — filter sidebar + product grid
  - [ ] (AGENT) **Hardcode** 6-8 product tiles with placeholder data
  - [ ] (AGENT) **Build** filter sidebar: series, product_type, availability checkboxes
  - [ ] (AGENT) **Build** sort dropdown: price (low/high), newest, name (A-Z)
  - [ ] (AGENT) **Style** tiles: 4:5 aspect ratio, hover scale + shadow, lazy images
  - [ ] (AGENT) **Style** "Sold" badge overlay
  - [ ] (AGENT) **Style** "No results" state
  - [ ] (AGENT) **Style** skeleton loading state (shown before data loads in Track C)

---

### B5: Homepage 

> **ACTION — (AGENT) only.**

These use placeholder data.

**YOU WILL HAVE**: Full landing page with all sections, hardcoded content

  - [ ] (AGENT) **Create** `index.html`
  - [ ] (AGENT) **Build** hero: full-viewport image + overlay + CTA "Enter Elsewhere"
  - [ ] (AGENT) **Build** intro block: "When the world cracked open..."
  - [ ] (AGENT) **Build** featured carousel: horizontal scroll with 3-4 hardcoded product cards
  - [ ] (AGENT) **Build** brand pillars: Story, Craftsmanship, Sanctuary
  - [ ] (AGENT) **Build** testimonial strip placeholder
  - [ ] (AGENT) **Add** theatrical lighting CSS effect:
    - CSS mask/spotlight: radial gradient shifts on scroll
    - `translateY()` on background layers opposite to scroll
    - `will-change: transform` for GPU acceleration

---

### B6: Remaining Pages 

> **ACTION — (AGENT) only.**

These use placeholder data.

**YOU WILL HAVE**: All content pages with placeholder text

  - [ ] (AGENT) **Create** `about.html` — photo + logo + origin story + philosophy + mission
  - [ ] (AGENT) **Create** `contact.html` — form (name, email, subject, message) + commission section
  - [ ] (AGENT) **Create** `faq.html`
  - [ ] (AGENT) **Create** `shipping.html` — shipping & returns info
  - [ ] (AGENT) **Create** `terms.html` — terms of service
  - [ ] (AGENT) **Create** `privacy.html` — privacy policy
  - [ ] (AGENT) **Create** `policies.html` — includes availability section:

  ```html
  <section id="availability">
    <h2>Availability & Cart</h2>
    <p>Every Everlastings piece is one-of-a-kind. When you add an item to your cart,
      it is not reserved — another collector may complete their purchase first.</p>
    <p>We verify availability for all items when you begin checkout. If a piece has
      found its home while you were browsing, we'll let you know and offer a small
      thank-you for your patience.</p>
    <p>We believe in honest, pressure-free shopping. No countdown timers, no artificial
      urgency — just beautiful things for those who find them.</p>
  </section>
  ```

  - [ ] (AGENT) **Create** `cart.html` (NEW in v1.4 — AR #28): line items + qty + cost estimate + optional email/name capture + `CHECKOUT` button. Recovery overlay (hidden by default). Related products cards section (hidden by default).
  - [ ] (AGENT) **Create** `checkout.html` — two-stage progressive disclosure. Stage A: info (email/name prefilled from cart, billing, shipping, "same as" checkbox). Stage B unlocks when Stage A valid: Stripe Payment Element + "Confirm & Pay" button. Same URL — stages are stacked sections in the DOM, one hidden until the other is valid.
  - [ ] (AGENT) **Create** `complete.html` — success/error states (wired in Track C)

---

### B6.5: Error States Reference

> **REFERENCE — no action required.** Every error state the site can surface, with user-facing copy and implementation notes. Used by A4 and C4 test cases.

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

A and B run in parallel. C cannot start until B has produced all pages with placeholder markers and A2 (API endpoints) is complete.
