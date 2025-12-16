# Comprehensive Website Reference for Everlastings by Emaline 
*Living document, updated 16 December 2025* 

## Website Overview 

  * Creating an online space that is a storefront, but also the heart of the marketing funnel that functions as a gallery, telling the story, creating a sense of sanctuary

### Branding & Target Visitors, Buyers 

  - Sells miniatures that are "Havens of beauty and quiet wonder for those who need a reminder that there is still magic in the world" 
  - Visitors feels magic, sanctuary, "A sense of being gently held" through a tone that is warm, poetic, emotionally resonant, healing, hopefully, with a bit of otherworldliness 
  - Buyers seek nostalgia, are sentimental souls, emotional lovers of story, memory keepers who treasure the tangible 
  - Art created by "Architect of Elsewhere, crafter of moments" who pulls together healers or those who want to be part of a community that can find the light in grieving 

### Marketing, Advertising & Social Spaces 

  + Buyers of target market: 
    - Show off on Instagram, and find inspiration on Pinterest
    - Share secrets in cozy corners of TikTok 
  + Create community space: 
    - Sharing stories in newsletter 
    - Brick and mortar, the feet, where people can meet 

### Architecture 

  * **Simple but dynamic build for artisan brand, made for any future shifts** 

  + Dynamic site is served from a static host 
    - Product entry created via JSON file "form" 
    - Script builds manifest every time website is updated 
    - Built in automations manage updates and sales backend 
    - HTML pages are templates for 'product page', shopping grids pages, homepage 
    - 404 redirection trick creates perfect SEO URLs from JSON values 
    - Images, product placement, all dynamically pulled from JSON files by parameters 
  + No relying on big web design ecosystems during this era in fast moving tech 
    - Costs are all but eliminated where possible (no CMS, pick your marketing tools, etc.)
    - Minimal costs where seeking more legitimacy or reliability 
    - No paying for automation tools since we build it in from the ground up 
    - Everything is kept scalable and future-proof 
  + We host on static servers that are either virtually or completely free 
    - "Tricking" the browser by using a 404-redirect page
    - Instead our JavaScript loads dynamically 
    - This creates single-page application behavior
  + Simple and free automations keep things fresh
    - GitHub Actions automatically rebuild manifest when you add products
    - Stripe webhooks mark items "sold" automatically
    - You could even have an LLM write custom page content daily

  * **Future-proof, scalable, dynamic** 

    + You can swap in any new tool you want instead of the website host deciding
    + Immediately saves $350+/year that would have gone to host a Squarespace site
    + Never paying $700/year to Zapier to connect tools, inventory, marketing, social
    + Create new collection name → website adapts automatically
    + Add product tag "Notebooks" and instantly can filter shop for Notebooks
    + Homepage can change every time a user visits, thanks to product JSONs
    + Site images are always changing just by adding products

  * **Awareness of competition quality & controlling our narrative** 

  + Exceptional device dynamic display; as perfect as Shopify or Etsy sites 
  + Control UX narrative journey by avoiding fragmented pages 
    - With one continuous scroll that controls the story we want to tell
    - Still let user use standard "About" or "Philosophy" links from anywhere to jump to that part of the page (anchor)

### Page Templates & Content Layout 

  * **Pages are separate, but all build instantly, dynamically, from templates**

  + Homepage 
    - Dynamic hero: "Enter Elsewhere" — breath-catching first impression
    - Story: "When the world cracked open, I made something small enough to hold"
    - Collection preview: Featured pieces with "Explore More" to full catalog
    - Philosophy: What makes Everlastings different
    - Commissions: How to work with you
    - Contact: Simple, elegant
  + Product Pages 
    - Individual miniature showcases 
    - Each a heart of the site 
  + Product Collection Grid(s)
    - Filterable catalog with one major for 'All Products' 
    - Each themed section will feature images from selected randomize products 

  * **Blog/Newsletters, mentioned in the chat thread, are a different architecture that is outside of this projects scope** 

---

## Design & Development Specifics 

### Homepage 

  * **Experience is like opening a miniature when page loads** 

  + Opening animation 
    - Box opening, book opening, dollhouse hinge
  + Lighting movement creates depth 
    - Signature, classic and timeless, powerful but simple, interaction
    - As you scroll, CSS-based spotlight shifts, illuminating different parts of storybook section "HERO" or "MASTHEAD" on homepage 
    - Creates sensation of moving closer/farther from the miniature; theater spotlights scrolling across stage
  + Perspective shifts 
    - User-triggered interaction 
    - Scrolling up or down triggers visuals to move opposite direction within frame 

  * **Newsletter signup box built into heading masthead with CTA**

  * **Use dynamic capabilities to feature series of settings/themes that load different every time** 

  + Every product will have values on JSON that allow it to be used as homepage story 
    - Changes the "world" visitors enter 
    - Different gradient colors, other objects with interactive lighting
    - Makes returning visitors feel fresh magic

### Product Collection Grid Pages 

  * **One HTML page theme creates "ALL PRODUCTS" page and "SECTION" pages** 

  + Themed "Section" tagged pages 
    - Familiar user experience 
    - Large visual hero image, story telling introduction 
    - Features any products tagged to feature, that have section tag 
    - Portals to Peace, Winter Favorites, Book Nooks & Story Lofts, Magical / Fantasy, Architectural

  + Grid page that shows "All Product" 
    - Another familiar shopping UX 
    - Same user friendly dropdowns and filters and sorting options 
    - Keyword search 

  * **Universally familiar PRODUCT TILE and FILTER UI design**

  + Product Tile Design 
    - Collection of tile images to click through 
    - Price, Title, Category 
    - Buy now, add to cart 
    - Clicking anywhere else clicks through to product page 

### Individual Product Pages 

  * **Two columns, with story on the left** 

  + "Full story card" 2-8 poetic paragraphs, an emotional arc, setting, and meaning that convey why the piece matters and provide a connection to Emy's journey 

  * **Right column purchase information** 

  + 7-15 photos for Hero Gallery with lighting variations 
  + Title and tagline, price, add to cart/buy now 
  + Features list with icons, dimensions, material, power supply, care instructions, shipping 
  + Brief "Note from the Artist"

  * **Below the fold**
  
    + Full photo gallery grid
    + Optional: Behind the build process
    + Optional: Video of lighting modes
    + Related pieces (algorithm)

### Headers, Footers, Navigation 

  * **Header (minimalist, unobtrusive)**
  
    + Logo (left aligned, links to homepage)
    + Main navigation (right aligned, horizontal)
      - Home
      - Collections (dropdown or mega-menu showing sections)
      - About
      - Commissions
      - Contact
    + Icons (far right)
      - Search (opens search overlay)
      - Cart (with item count badge)
    + Mobile: Hamburger menu left, logo center, cart icon right
    + Sticky on scroll (collapses slightly for more screen space)
    + Background: Subtle fog gray with transparency effect

  * **Footer (comprehensive, organized)**
  
    + Column 1: About Everlastings
      - Logo 
      - Brief tagline: "Handcrafted havens for the stories that stay" 
      - Newsletter sign-up (inline form)
    + Column 2: Shop 
      - All products 
      - Portals to peace 
      - Book Nooks 
      - Winter Collection 
      - Sold Archive 
      - Commissions 
    + Column 3: Support 
      - Contact 
      - Shipping & Returns 
      - Care Instructions 
      - FAQ 
    + Column 4: Connect 
      - Instagram 
      - Facebook
      - Pinterest 
      - TikTok 
      - Email 
    + Bottom bar 
      - Copyright © 2026 Everlastings by Emaline. All rights reserved. 
      - Site by [Sean August Horvath](https://august.style)
      - Terms of Service | Privacy Policy

  * **Navigation patterns**

    + Smooth scroll to page anchors (for single-page sections)
    + Hover states: subtle color shift to plum/lavender
    + Active page indicator: underline or color accent
    + Breadcrumbs on product pages: Home > Collection > Product
    + "Back to Collections" link on product pages

### Typography Strategy

  * **System UI fonts for body text** (performance + readability)
  
    + Primary stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
    + Benefits: Zero load time, OS-optimized rendering, accessibility
    + Use for: Body copy, navigation, product descriptions, UI elements

  * **One exceptional accent font** (brand personality)
  
    + For: Headlines, taglines, story card titles, special moments
    + Character: Elegant, slightly vintage, warm with subtle quirk
    + **CLIENT DELIVERABLE**: Send screenshots of fonts you love
      - We'll review your preferences
      - Cross-reference with Sean's curated local collection (fresher options)
      - Find that balance: classic/timeless but with personality
      - Not too loud, but not generic either
      - Slightly eccentric without being occult
    + Suggestions to test if nothing jumps out:
      - **Crimson Text** (Google Fonts, free, elegant serif)
      - **Lora** (Google Fonts, free, warm serif with personality)
      - **Cormorant** (Google Fonts, free, fashion-editorial feel)
      - **EB Garamond** (Google Fonts, free, classic book typography)
    + Load only one weight + italic to keep performance pristine

### CSS Custom Properties (Design Tokens)

```css
:root {
  /* Colors */
  --color-plum-primary: #6B3A5B;
  --color-lavender: #B4A5C4;
  --color-fog: #D7D3D3;
  --color-cream: #FDF8F5;
  --color-gold: #C9A962;
  --color-ink: #1A1A1A;
  --color-star-blue: #2C3E5A;
  --color-amethyst: #9966CC;
  
  /* Backgrounds */
  --bg-primary: var(--color-cream);
  --bg-secondary: var(--color-fog);
  --bg-dark: var(--color-ink);
  
  /* Text */
  --text-primary: var(--color-ink);
  --text-secondary: #5A5A5A;
  --text-muted: #8A8A8A;
  --text-inverse: var(--color-cream);
  
  /* Accents */
  --accent-primary: var(--color-plum-primary);
  --accent-hover: var(--color-lavender);
  --accent-gold: var(--color-gold);
  
  /* Typography */
  --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-accent: "Crimson Text", Georgia, serif;
  
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg: 1.125rem;    /* 18px */
  --font-size-xl: 1.25rem;     /* 20px */
  --font-size-2xl: 1.5rem;     /* 24px */
  --font-size-3xl: 2rem;       /* 32px */
  --font-size-4xl: 2.5rem;     /* 40px */
  --font-size-5xl: 3rem;       /* 48px */
  
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* Spacing */
  --space-xs: 0.25rem;    /* 4px */
  --space-sm: 0.5rem;     /* 8px */
  --space-md: 1rem;       /* 16px */
  --space-lg: 1.5rem;     /* 24px */
  --space-xl: 2rem;       /* 32px */
  --space-2xl: 3rem;      /* 48px */
  --space-3xl: 4rem;      /* 64px */
  
  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;
  
  /* Z-index layers */
  --z-base: 0;
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
}
```

### Component Styling Guidelines

  * **Buttons**
  
    + Primary (Buy Now, Add to Cart):
      - Background: `var(--accent-primary)`
      - Text: `var(--text-inverse)`
      - Hover: Darken 10%, slight scale (1.02)
      - Border radius: `var(--radius-md)`
      - Padding: `var(--space-md) var(--space-xl)`
    
    + Secondary (View Details, Learn More):
      - Background: transparent
      - Border: 2px solid `var(--accent-primary)`
      - Text: `var(--accent-primary)`
      - Hover: Fill background
    
    + Ghost (subtle actions):
      - Background: transparent
      - Text: `var(--text-secondary)`
      - Hover: `var(--bg-secondary)`

  * **Cards (Product tiles)**
  
    + Background: `var(--bg-primary)`
    + Border: 1px solid `var(--color-fog)`
    + Shadow: `var(--shadow-md)` on hover
    + Padding: `var(--space-lg)`
    + Border radius: `var(--radius-lg)`
    + Transition: all `var(--transition-base)`

  * **Forms**
  
    + Input fields:
      - Border: 1px solid `var(--color-fog)`
      - Focus: 2px solid `var(--accent-primary)`, glow effect
      - Padding: `var(--space-md)`
      - Border radius: `var(--radius-sm)`
    
    + Labels:
      - Font: `var(--font-body)`
      - Size: `var(--font-size-sm)`
      - Weight: 600
      - Margin bottom: `var(--space-xs)`

  * **Hover micro-interactions**
  
    + Images: Slight zoom (scale: 1.05) with overflow hidden
    + Links: Underline appears with slide-in animation
    + Icons: Rotate or bounce subtly
    + Buttons: Lift with shadow increase
    + Cards: Elevate with shadow `var(--shadow-lg)`

### Responsive Breakpoints

```css
/* Mobile first approach */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small desktops */
--breakpoint-xl: 1280px;  /* Large desktops */
--breakpoint-2xl: 1536px; /* Extra large */
```

### Accessibility Considerations

  * **Color contrast**: All text meets WCAG AA standards (4.5:1 minimum)
  * **Focus indicators**: Visible 2px outline with offset
  * **Touch targets**: Minimum 44x44px on mobile
  * **Alt text**: Every image has descriptive alt
  * **Semantic HTML**: Proper heading hierarchy (h1 → h2 → h3)
  * **Aria labels**: For icon-only buttons and complex interactions

### Directory Structure

```
/assets/
  /products/
    uid-001.json
    uid-002.json
  /media/
    /products/        ← CDN hosted on Cloudflare R2
      /uid-001/       ← Note image naming pattern 
        uid-001-hero.webp
        uid-001-gallery-01.webp
        uid-001-gallery-02.webp
  /js/
    manifest.json     ← auto-generated
    data-loader.js
    product-renderer.js
    filter-controller.js
  /favicon/          ← subdirectory for all favicon files
index.html
product.html
collection.html
_config.yml
404.html
CNAME
generate_manifest.py 
README.md
styles.css 
.github/workflows/manifest.yml
```

### Core Automation Architecture

  * **GitHub Actions (Primary automation engine)**
  
  + Trigger: Push to `/assets/products/` directory
  + Actions:
    1. Rebuild manifest.json with new product mappings
    2. Validate JSON schema compliance
    3. Optimize images (if not CDN-hosted yet)
    4. Deploy to hosting
    5. Purge CDN cache
  + Runtime: 30-60 seconds

  * **Claude Code Hooks (Product catalog sync)** 

  + Trigger: Completion of above GitHub Action from product update 
  + Action: 
    1. Identify which JSON were added/updated/removed 
    2. API call to Stripe Catalog 
    3. Add Product with values from JSON 
  + **NOTE** this should arguably always be the first part of the above action, then the above action, inclusive of this, should be able to be triggered by the PUSH *OR* by the below Stripe sale webhook update, because that will also require an update of the JSON product file in question — basically, these three are all essential, all tied together, and probably could be combined into one automation that always runs and just has YES/NO aspects of the functions 

  * **Stripe Webhooks (Inventory updates)**

  + Trigger: `checkout.session.completed` event
  + Action:
    1. Identify purchased product by SKU
    2. Update corresponding JSON file
    3. Change `availability` to "sold"
    4. Commit change to repository
    5. Trigger GitHub Action rebuild

### Planning for Further Automation Updates 

  * **These could be added using similar API method like above, however they also should all have PIXEL that can be added to ALL PRODUCTS shop page — both methods will need to be investigated before moving forward** 

  - Add product to Meta Business Catalog 
  - Add to Pinterest Product Pins 
  - Google Shopping Feed 
  - TikTok Shop 

### Shipping Strategy & Calculations

**Important decision point:** How to handle shipping costs. Three approaches:

  1. **Calculated real-time shipping** (Most transparent)
     + Stripe can integrate with shipping carriers
     + Customer sees exact cost at checkout
     + Requires: Carrier account (USPS, UPS, FedEx) or Shippo/EasyPost
     + Pro: Fair, accurate, professional
     + Con: Slightly complex setup, costs visible
     + Best for: Higher-priced items where shipping is proportionally small

  2. **Flat-rate shipping** (Simplest)
     + Single price for all US orders (e.g., $15) **I haven't seen them IRL but I have a feeling this is not enough to cover shipping**
     + International calculated separately or disabled initially
     + Pro: Dead simple, can advertise rate
     + Con: May lose money on far destinations, overcharge nearby
     + Best for: Consistent item sizes, want simplicity
     + Marketing angle: "Free shipping over $300" promos possible

  3. **Shipping included in product price** (Premium positioning)
     + No separate shipping line item
     + Price absorbs average shipping cost
     + Pro: Cleanest checkout, "free shipping" appeal
     + Con: Harder to adjust, inflates product price perception
     + Best for: Luxury positioning, gift purchases

  * **Recommendation for Everlastings:** Start with approach #2 (Flat-rate)
    + Simple to implement
    + Easy to understand for customers
    + Can test and adjust based on actual shipping costs
    + Can run "Free shipping" promos later without repricing products
    + Can switch to calculated shipping in Phase 2 if needed
    + **NOTE**: Need Emy's input on typical weights - these pieces are substantial!

  * **International shipping:** Start US-only, add Canada later, then international on request

  * **Packaging considerations**
    + Miniatures are fragile, need careful packing
    + Cost includes: Box, bubble wrap, tissue, branded touches
    + Factor $3-8 packaging cost into shipping strategy
    + **CLIENT CONSULTATION NEEDED**: Actual shipping costs for pieces like the example (substantial corner diorama with lighting)

### Dynamic Pricing & Promotions Strategy

This JSON architecture makes advanced pricing strategies possible:

  * **Product-level shipping control**
    + JSON field: `shipping_strategy: "flat" | "calculated" | "free"`
    + Different products can have different approaches
    + Example: Large pieces = calculated, small pieces = flat

  * **Seasonal promotions**
    + JSON field: `promo_active: true` with date ranges
    + Discount pricing without creating duplicate Stripe products
    + Banner displays on product pages
    + Examples: "Holiday Special", "Launch Week Discount"

  * **Bundle discounts** (Phase 2)
    + "Buy 2, get free shipping"
    + Discount codes via Stripe Coupons API
    + Can test different strategies without rebuilding

  * **Newsletter subscriber perks**
    + Email signup = coupon code
    + Tracked via Stripe customer metadata
    + "5% off first purchase for newsletter subscribers"

**Reference documentation:** `/Users/seanivore/Development/everlastings-website/assets/docs/reference-files/stripe_dynamic_shipping_integration.md`

### Hosting & Infrastructure

  * **GitHub Pages** (Primary hosting)
  
  + Cost: Free 
  + Automatic deployments, version control, free SSL
  + Keep images elsewhere to maintain acceptable repository size 

  * **Cloudflare R2** (Image CDN)
  
    + **Cost:** ~$1-5/month (significantly scales)
    + **Purpose:** Offload all product photos from GitHub
    + **Benefits:** Unlimited storage, fast global delivery, professional solution
    + **Setup:** Simple integration, assets load from cdn.everlastingsbyemaline.com

## Out-Of-Scope 

### Newsletter Strategy

**Start collecting emails IMMEDIATELY** — even before you have blog infrastructure

  * **Homepage CTA** (prominent, above fold, IN MASTHEAD)
  
    + "Step Into Elsewhere — Join the Newsletter"
    + Brief description of what they'll receive
    + Simple email signup (Stripe can handle this initially)

  * **Footer signup** (on every page)
  
    + Subtle, always accessible
    + "Never miss a new miniature"

  * **Why this matters NOW**
  
    + Your existing customers from the shop are already engaged
    + Holiday season = high traffic
    + Email list = direct line to collectors
    + Future blog/newsletter integration is easier with existing list

**Blog/Newsletter platform recommendation:** Beehiiv (after holidays). This is a SEPARATE architecture because blog content management needs different tooling than product management. We'll integrate it later, but starting collection now is essential.

## Testing & Quality Assurance

### Browser & Device Testing

  * **Desktop browsers**
  
    + Chrome (latest)
    + Firefox (latest)
    + Safari (latest)
    + Edge (latest)

  * **Mobile devices**
  
    + iPhone (iOS 15+)
    + Android phones (Chrome)
    + iPad / tablets
    + Landscape and portrait modes

  * **Screen sizes**
  
    + Mobile: 375px - 768px
    + Tablet: 768px - 1024px
    + Desktop: 1024px - 1920px+
    + 4K displays: 2560px+

### Performance Testing

  * Page load speed under 3 seconds
  * Images optimized and compressed
  * Lighthouse score 90+ (Performance)
  * Mobile-friendly test passed
  * Core Web Vitals green

### Functional Testing

  * All links working
  * Forms submitting correctly
  * Filters showing correct results
  * Buy Now buttons generating Stripe checkout
  * Webhook marking products sold
  * Newsletter signup capturing emails
  * Contact form delivering messages
  * Product galleries loading correctly
  * Lighting demo videos playing

### Accessibility

  * Keyboard navigation functional
  * Screen reader compatible
  * Alt text on all images
  * Sufficient color contrast
  * Focus indicators visible
  * ARIA labels where needed

---

## Technical Notes & Constraints

### Things to Remember

  * **Display format text in JSON**
  
    + You write: "Portals to Peace"
    + We transform: "portals-to-peace" for URLs
    + Gives you full control, prevents script oddities

  * **Tags are smart**
  
    + Section tags create collection pages automatically
    + Category tags enable filters
    + Product-type tags for refinement
    + General tags for discovery
    + Availability tags for sold/available

  * **Manifest lives in `/assets/js/`**
  
    + Auto-generated by GitHub Action
    + Never edit manually
    + Maps URLs to JSON files
    + Featured products flagged for easy finding

  * **Images on CDN**
  
    + Cloudflare R2 hosts all photos
    + Fast global delivery
    + Reduces repo size
    + Professional solution

  * **Icons & micro-interactions**
  
    + Minimalist aesthetic
    + Subtle hover states
    + Feature icons in product details
    + Social icons in footer
    + Filter toggle animations
    + Smooth scrolling
    + Loading states

  * **Smart filter UI logic**
  
    + If a tag type contains only ONE tag, hide that filter dropdown
    + Example: If all products are "Lighted", don't show "Product Type" filter
    + Reduces UI clutter automatically
    + Dynamically adapts as catalog grows
    + Keeps interface clean and purposeful

---

*This document will continue to evolve as we refine specifications and make architectural decisions. All major changes will be tracked and communicated.*

*Updates* 
*December 7, 2025*
*December 16, 2025*