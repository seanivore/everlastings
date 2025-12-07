# Everlastings by Emaline — Comprehensive Website Reference

**Living Document** — Updated December 7, 2025

---

## Timeline Decision Options

  * **Option A: Rush Pre-Holiday Launch**
  
    + Launch target: December 16, 2025 (before Squarespace expires)
    + One week buffer before Christmas
    + MVP feature set with expansion after holidays
    + **Pre-holiday version** annotations throughout this document show simplified scope
    
  * **Option B: Comprehensive Build (Recommended)**
  
    + Comfortable timeline: Launch January 2025
    + Full feature set from day one
    + Professional photography session included
    + More refined UX and polish
    + Lower stress, higher quality

**This document details the FULL end-product vision.** Each section includes notes on what the simplified pre-holiday version would include. After your timeline decision, we'll update this document accordingly and create separate Design Scope and Implementation Plan documents.

---

## Table of Contents

  1. [Project Vision](#project-vision)
  2. [Technical Architecture Magic](#technical-architecture-magic)
  3. [Site Structure & Content](#site-structure--content)
  4. [Brand Identity & Voice](#brand-identity--voice)
  5. [Product Catalog System](#product-catalog-system)
  6. [E-Commerce Integration](#e-commerce-integration)
  7. [Hosting & Infrastructure](#hosting--infrastructure)
  8. [Content Deliverables](#content-deliverables)
  9. [Success Metrics](#success-metrics)
  10. [Next Steps](#next-steps)

---

## Project Vision

### What This Website Must Be

  * **A storefront**
  
    + Sell miniatures (one-of-a-kind + limited series)
    + Host checkout + shipping options
    + Track inventory (one-of-one pieces mark "sold" automatically)
    + Future: printables, storybooks, Firelight Council additions

  * **A storytelling archive**
  
    + "Portals to Peace" Binder brought to digital life
    + Every miniature gets its full story
    + 7–15 photos per piece
    + Lighting mode demonstrations
    + Story cards (2–8 paragraphs, poetic)

  * **A brand home — A sacred Elsewhere**
  
    + Visitors immediately feel: Magic, Sanctuary, Nostalgia
    + Tone: warm, poetic, emotionally resonant
    + Threads of healing, hope, otherworldliness
    + "A sense of being gently held"

  * **Your professional identity**
  
    + **Architect of Elsewhere**
    + **Crafter of Moments**
    + Artist + founder behind Everlastings

### Why This Matters Strategically

You're not just selling miniatures — you're offering **havens of beauty and quiet wonder for those who need a reminder that there is still magic in the world.** Your buyers are sentimental souls, storytellers, nostalgic hearts, people grieving or healing, memory keepers. They gather on Instagram, TikTok cozy communities, Pinterest. They want meaning attached to objects they can hold.

This website becomes the **center of your world**. Everything else (social media, Whatnot, local sales) points back here. It's your gallery, your story, your sanctuary.

---

## Technical Architecture Magic

### The Dynamic JSON-Based System

This isn't a traditional website. It's a **generative world engine** that adapts to whatever you create without rebuilding pages or touching code.

  * **How it works**
  
    + Each miniature = one JSON file
    + All content (story, photos, features, price, lighting modes) lives in structured data
    + 2 HTML templates render EVERYTHING
    + URL structure is beautiful: `everlastingsbyemaline.com/portals-to-peace/sunkeeper`
    + Add a new product → website automatically includes it
    + No CMS fees, no monthly software costs

  * **The "magic trick" explained**
  
    + Proven architecture from Sean's portfolio (august.style)
    + Uses 404-redirect routing to create single-page application behavior
    + Hosted on static servers (GitHub Pages) but feels fully dynamic
    + GitHub Actions automatically rebuild manifest when you add products
    + Stripe webhooks mark items "sold" automatically

  * **Why this matters for you**
  
    + **Wildly scalable**: 10 products or 100 products, same system
    + **Future-proof**: AI agents will love this structured data
    + **Cost-efficient**: Saves $350+/year vs Squarespace
    + **Easy updates**: Google Form → JSON → website (no code needed)
    + **Dynamic sections**: Create new collection name → website adapts automatically
    + **Theme control**: Homepage can change seasonally from product JSON

### Comparison to Shopify (What You're Actually Getting)

Think of any beautiful Shopify store you've seen — clean product grids, filterable collections, gorgeous product pages with galleries. You're getting that experience WITHOUT:

  * Monthly fees ($39-299/month)
  * Transaction fees (2% on top of Stripe's 2.9%)
  * App marketplace lock-in
  * Clunky admin panels
  * Generic templates

Instead you get a **custom-built system** that feels as polished as Shopify but is architecturally superior for artisan brands. The dynamic sections work exactly like Shopify collections, the tag filters work like Shopify filters, product pages look better than Shopify product pages.

**Pre-holiday version:** Core architecture identical, fewer products initially, simplified homepage (no seasonal theme rotation yet)

---

## Site Structure & Content

### The Strategic Decision: One Long Landing Page

**Why we combined multiple pages into one scrolling experience:**

Traditional websites make you click around — Home, then About, then Collection, then Philosophy. Each click is a moment where visitors might leave. We're creating a **narrative journey** instead: one continuous scroll that controls the story we want to tell.

Think of it like opening a book or a miniature scene — you discover elements in the order that creates the most emotional impact. This is what premium brands and SaaS companies do because it works.

  * **The flow**
  
    + Hero: "Enter Elsewhere" — breath-catching first impression
    + Story: "When the world cracked open, I made something small enough to hold"
    + Collection preview: Featured pieces with "Explore More" to full catalog
    + Philosophy: What makes Everlastings different
    + Commissions: How to work with you
    + Contact: Simple, elegant

  * **Then separate pages for**
  
    + **Product Pages**: Individual miniature showcases (the heart of the site)
    + **Collection Grid**: Filterable catalog (All Products + themed sections)
    + **Blog/Newsletter** (Phase 2 — different architecture, added later)

**Pre-holiday version:** Single landing page complete, simplified copy with Lorem ipsum showing word count needs so you can see what length feels right

---

### Homepage Experience: Opening a Miniature

When someone lands on everlastingsbyemaline.com, they should feel like they're **leaning into a tiny world** — like peering into one of your actual miniatures IRL.

  * **The theatrical reveal**
  
    + Opening animation: box opening, book opening, dollhouse hinge
    + Reveals the scene behind it (a miniature world)
    + Not actual 3D — it's **perceptual depth through lighting**

  * **Depth through lighting** (your signature interaction)
  
    + As you scroll, CSS-based spotlight shifts
    + Illuminates different parts of the hero image
    + Creates sensation of moving closer/farther from the miniature
    + Like theater spotlights scrolling across stage
    + Subtle, elegant, magical
    + All done with CSS transforms, masks, gradients (no heavy JavaScript)

  * **Dynamic homepage themes**
  
    + Homepage can feature different seasonal palettes
    + Winter theme, Spring theme, Autumn theme
    + Controlled from product JSON files
    + Changes the "world" visitors enter
    + Makes returning visitors feel fresh magic

**Pre-holiday version:** Hero with static featured image, simplified opening animation, lighting effects deferred to Phase 2

---

### Collection Grid Pages

These are your themed sections AND your "All Products" browse page.

  * **Themed sections** (work like Shopify collections)
  
    + Portals to Peace
    + Winter Favorites
    + Book Nooks & Story Lofts
    + Magical / Fantasy
    + Architectural
    + Sold Archive
    + **Any new section you create in JSON automatically appears**

  * **Each section page includes**
  
    + Large hero image from featured product in that section
    + Storytelling introduction
    + Filterable product grid below
    + Sort controls (newest, price, title)

  * **"All Products" page**
  
    + No hero image (less storytelling, more browsing)
    + Pure grid of all miniatures
    + Same filter system
    + For people who want to see everything fast

  * **Tag filter system** (multi-select like Shopify)
  
    + Tags have TYPES: section, category, product-type, general, availability
    + Can toggle multiple filters at once (Winter + Book Nooks)
    + Active filters stay visible
    + Filter counts update live
    + Mobile-friendly condensed design

**Pre-holiday version:** Core grid functional, basic filters, hero images may be placeholders

---

### Individual Product Pages (The Heart of Everything)

This is where the magic happens. These pages need to be **breathtaking**.

  * **Left column: The Story**
  
    + Full story card (from your binder style)
    + 2–8 paragraphs, poetic
    + Emotional arc, setting, meaning
    + Why this piece matters
    + Connection to your journey

  * **Right column: The Purchase**
  
    + Hero gallery (7–15 photos)
    + Lighting variation demos
    + Title + tagline
    + **Price visible above the fold** (sales best practice)
    + **Prominent "Buy Now" button** (converts better than "Add to Cart")
    + Features list with icons
    + Dimensions, materials, power supply
    + Care instructions
    + Shipping details
    + Brief "Note from the Artist"

  * **Below the fold**
  
    + Full photo gallery grid
    + Optional: Behind the build process
    + Optional: Video of lighting modes
    + Related pieces (algorithm)

  * **Stripe features to highlight**
  
    + Link (auto-login if they've purchased before)
    + All payment methods (credit, debit, Apple Pay, Google Pay, etc)
    + Secure checkout
    + Automatic inventory sync (one-of-ones mark sold instantly)

**Pre-holiday version:** Core layout complete, may use placeholder Lorem ipsum for story length examples, fewer photos initially (you add more over time)

---

### Newsletter Strategy

**Start collecting emails IMMEDIATELY** — even before you have blog infrastructure.

  * **Homepage CTA** (prominent, above fold)
  
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

**Pre-holiday version:** Newsletter signup active, Beehiiv integration deferred to Phase 2

---

## Brand Identity & Voice

### From Emy's Own Words

  * **Tagline**
  
    > "Handcrafted havens for the stories that stay."

  * **Brand essence**
  
    > "When the world cracked open, I made something small enough to hold.  
    > Every Everlasting begins as a healing, then becomes a haven—  
    > a story-shaped refuge for those who need more than this world gives."

  * **For those who believe in Elsewhere**
  
    + Your pieces are for the sentimental
    + For storytellers
    + For nostalgic souls
    + For people who treasure meaning
    + For collectors of quiet wonder
    + For the grieving and healing
    + For memory keepers
    + For those who feel the world is loud but their soul is quiet

### Visual Brand Elements

  * **Logo**
  
    + 1950s silhouette style
    + Miniature house cupped in hands
    + Deep plum / wine silhouette
    + Arc text "Everlastings by Emaline"
    + Lace hemline

  * **Color palette** (established)
  
    + Deep plum (logo anchor)
    + Dusty lavender
    + Fog gray
    + Cream / moonlit white
    + Soft gold / gold ember
    + Ink black
    + Deep star blue (accent)
    + Amethyst accent

  * **Aesthetic keywords**
  
    + Minimalist
    + Warm
    + Theatrical lighting
    + Nostalgic
    + Intimate
    + Magical realism

### Tone & Voice Guidelines

Your writing is **warm, poetic, emotionally resonant**. Never corporate, never cold. Always with threads of:

  * Healing
  * Hope
  * Otherworldliness
  * Sanctuary
  * The sense of being gently held

Examples from your existing voice:

  * "The world cracked open → the miniatures held you together"
  * "Sanctuary in tiny form"
  * "Where tiny worlds offer quiet beauty, soft wonder, and the feeling of being home"
  * "For those who need more than this world gives"

---

## Product Catalog System

### JSON Schema (Your Content Template)

**IMPORTANT: Do NOT create product JSON files yet.** We're finalizing this schema to be perfect before you start. Use this to prepare your content, but wait for the green light.

Each product JSON includes:

  * **Core identification**
  
    + `uid`: Unique identifier (auto-generated)
    + `title`: Full display name (your formatting, we transform to URLs)
    + `tagline`: Short poetic line
    + `url_slug`: Auto-generated from title

  * **Story content** (all in DISPLAY format — you control, we transform)
  
    + `story_full`: Complete story card (2-8 paragraphs)
    + `story_excerpt`: Short version for cards/previews
    + `artist_note`: Brief personal note

  * **Product details**
  
    + `price`: Dollar amount
    + `stripe_price_id`: Auto-populated by our script
    + `dimensions`: [length, width, height] or string
    + `weight`: For shipping
    + `materials`: Array of materials used
    + `power_supply`: If applicable
    + `care_instructions`: How to maintain

  * **Categorization** (tags with TYPES)
  
    + `section`: Primary collection (Portals to Peace, Winter, etc)
    + `category`: Product type (Book Nook, Portal, Architectural)
    + `product_type`: Lighted, Unlit, Seasonal, etc
    + `tags_general`: Freeform tags (nostalgic, cozy, magical)
    + `availability`: Available, Sold, Commission Only

  * **Media**
  
    + `images_hero`: Primary photo for card display
    + `images_gallery`: Array of 7-15 image URLs
    + `images_lighting`: Lighting variation photos
    + `images_thumbnail`: Small version for grid
    + `video_url`: Optional lighting demo video

  * **Features**
  
    + Array of feature objects with icons
    + Example: `{icon: "lightbulb", text: "Warm LED lighting"}`

  * **Homepage theme control** (Phase 2)
  
    + `homepage_theme`: Optional palette override
    + `featured_priority`: Weight for randomized selection
    + `seasonal_display`: Active date ranges

  * **SEO metadata**
  
    + `meta_title`: Page title for search engines
    + `meta_description`: Brief description for SERP
    + `meta_keywords`: Search keywords
    + `alt_texts`: Array matching gallery images

  * **Timestamps** (auto-managed)
  
    + `created_at`: ISO format
    + `updated_at`: ISO format
    + `sold_at`: If applicable

### Directory Structure

```
/assets/
  /products/          ← renamed from "entries"
    uid-001.json
    uid-002.json
  /media/
    /products/        ← CDN hosted on Cloudflare R2
      /uid-001/
        hero.jpg
        gallery-01.jpg
        gallery-02.jpg
  /js/
    manifest.json     ← auto-generated
    data-loader.js
    product-renderer.js
    filter-controller.js
  /favicon/          ← subdirectory for all favicon files
```

### How Updates Work

  1. **You create content**
  
     + Take 7-15 photos per piece
     + Write story card (we'll provide Lorem ipsum length examples)
     + Fill out product details
     + Upload photos to Google Drive or designated location

  2. **We process**
  
     + Photos uploaded to Cloudflare R2 CDN
     + JSON file created with all data
     + Committed to GitHub repository

  3. **Automated deployment**
  
     + GitHub Action detects new file
     + Manifest rebuilds automatically
     + Site redeploys (30-60 seconds)
     + Product appears live on website

  4. **When someone purchases**
  
     + Stripe processes payment
     + Webhook triggers JSON update
     + Availability changes to "sold"
     + Product page updates automatically
     + "Sold" collection now includes it

**Future enhancement:** Google Form → Zapier → JSON pipeline (you fill form, we commit file)

**Pre-holiday version:** Manual JSON creation for initial 5-10 products, automated pipeline deferred to Phase 2

---

## E-Commerce Integration

### Stripe Checkout Strategy

We're using **Stripe Prebuilt Checkout** (Checkout Sessions API) — the same system used by Anthropic, OpenAI, and thousands of professional e-commerce sites.

  * **Why this approach**
  
    + Industry standard, battle-tested
    + Supports ALL payment methods (credit, debit, Apple Pay, Google Pay, Buy Now Pay Later)
    + PCI compliance handled by Stripe
    + Link feature (customers auto-login with email)
    + Fully branded checkout experience
    + Mobile optimized
    + Works perfectly with our JSON architecture

  * **How it works technically**
  
    + Python script reads product JSON files
    + Creates Stripe Product objects programmatically
    + Creates Stripe Price objects linked to products
    + Stores Price IDs back in JSON
    + Product pages use Price IDs to generate checkout sessions
    + After purchase, webhook updates JSON availability

  * **Setup process**
  
    + Stripe account created (Emy invited as super admin) ✓
    + Business verification completed
    + Tax settings configured
    + Shipping rates defined
    + Webhook endpoint configured
    + Test purchases before launch

  * **Transaction costs**
  
    + Stripe fee: 2.9% + $0.30 per transaction (industry standard)
    + No additional platform fees
    + No monthly subscription
    + Example: $200 miniature = $6.10 fee, you keep $193.90

**Phase 2 enhancement:** Migrate to Stripe Embedded Components for fully branded checkout (no redirect to Stripe's page)

**Pre-holiday version:** Stripe Checkout functional, initial 5-10 products enabled, webhook tested

---

## Hosting & Infrastructure

### Recommended Solution: GitHub Pages + Cloudflare R2

  * **GitHub Pages** (Primary hosting)
  
    + **Cost:** $0/month
    + **Proven:** Sean's portfolio runs on this
    + **Benefits:** Automatic deployments, version control, free SSL
    + **Limitation:** 1GB repo size limit (concern with many high-res photos)

  * **Cloudflare R2** (Image CDN)
  
    + **Cost:** ~$1-5/month (significantly scales)
    + **Purpose:** Offload all product photos from GitHub
    + **Benefits:** Unlimited storage, fast global delivery, professional solution
    + **Setup:** Simple integration, assets load from cdn.everlastingsbyemaline.com

  * **Why this combination**
  
    + GitHub Actions still work (automated manifest building)
    + Repo stays small (only code and JSON)
    + Images served fast globally
    + Professional, scalable, future-proof
    + Total cost: ~$1-5/month vs $350/year Squarespace savings

### Alternative Hosting Options (If Needed)

  * **Netlify**
  
    + **Cost:** $0-19/month
    + **Benefits:** More generous size limits, great build system
    + **Drawback:** More features than needed

  * **Vercel**
  
    + **Cost:** $0-20/month
    + **Benefits:** Excellent performance, generous free tier
    + **Drawback:** Overkill for static site

  * **Hostinger**
  
    + **Cost:** ~$3/month
    + **Benefits:** Traditional hosting, more familiar
    + **Drawback:** Less automated than GitHub/Netlify

**Recommendation:** Start with GitHub Pages + Cloudflare R2. If repo size becomes issue, migrate to Netlify (takes ~1 hour, we handle it).

### Domain & DNS

  * **Domain stays at Squarespace**
  
    + Already registered through Sep 2026
    + Cost: $12/year (after $1 first year promo)
    + DNS points to hosting platform
    + No need to transfer

  * **Google Workspace**
  
    + Active: emyh@everlastingsbyemaline.com
    + Cost: $72/year
    + Sean has admin access ✓

### Operating Costs Summary

  * Domain: $12/year
  * Google Workspace: $72/year
  * Image CDN: ~$12-60/year
  * Stripe fees: 2.9% + $0.30 per transaction
  * **Total fixed: ~$96-144/year** vs $350/year Squarespace Tier 2

**Savings: $206-254/year** (plus you own your infrastructure)

---

## Content Deliverables

### What You Need to Provide

These are the items you'll be creating and delivering to us for the website:

  * **Product photography** (per miniature)
  
    + 7-15 high-resolution photos
    + Multiple angles and detail shots
    + Lighting variation demonstrations
    + Hero image for cards/grids
    + Current photos have quality issues (blur, saturation, frame numbers visible)
    + Consultation included to improve photo quality
    + Professional photo session available as add-on ($300-500, recommended January)

  * **Story content** (per miniature)
  
    + Full story card: 2-8 paragraphs, poetic
    + Short excerpt for previews: 2-3 sentences
    + Title and tagline
    + Artist note (brief, personal)
    + Lorem ipsum examples will show word count needs

  * **Product details** (per miniature)
  
    + Dimensions and weight
    + Materials list
    + Features (we'll help format)
    + Care instructions
    + Lighting specifications if applicable

  * **Brand assets**
  
    + Logo files (vector preferred)
    + Brand color codes (if different from what we have)
    + Any existing marketing materials

  * **Social & footer content**
  
    + Instagram URL: ________________
    + Facebook URL: ________________
    + Pinterest URL (if applicable): ________________
    + TikTok URL (if applicable): ________________
    + Any other social profiles

  * **About/bio content**
  
    + Your origin story (we have draft from G, you'll refine)
    + Bio photo
    + Philosophy statement
    + Connection to Dan / The Sunkeeper
    + WNC homage if desired

  * **Initial product catalog**
  
    + Minimum 5-10 products for launch
    + Suggested priority: Sunkeeper, Frostvale, Scarborough, Brush & Bloom, Welcome Cup
    + More can be added before/after launch

### What We Provide

  * Complete website design and development
  * JSON schema and templates
  * All technical implementation
  * Stripe integration and setup
  * Hosting configuration
  * GitHub Actions automation
  * Lorem ipsum text placeholders (showing word count needs)
  * Photo quality consultation
  * Content template guidance
  * 30 days post-launch support
  * Documentation and training

---

## Success Metrics

### Launch Criteria

Site is ready to launch when:

  * 5-10 products fully populated with stories and photos
  * Stripe checkout tested successfully (test purchase completed)
  * Mobile responsive on iPhone, Android, tablet
  * All social links functional
  * Newsletter signup tested
  * Contact form working
  * Product filters functional
  * Homepage loading under 3 seconds
  * SSL certificate active
  * Favicon visible
  * Google Analytics installed
  * At least one real customer from shop has previewed and approved

### Post-Launch Goals (First 90 Days)

  * Add 10-15 more products
  * Newsletter list grows to 100+ subscribers
  * First 5 sales through website
  * Social media integration planned
  * Customer testimonials collected
  * Product photography session scheduled
  * Blog/newsletter platform integrated

### Long-Term Vision

  * Catalog grows to 50+ products
  * Seasonal homepage themes rotating
  * Active blog with Firelight Dispatches
  * Instagram Shopping enabled
  * Commission request system refined
  * Wholesale inquiries (Faire) if desired
  * Etsy integration (optional)
  * Community building around "Elsewhere"

---

## Next Steps

### Immediate (This Week)

  1. **Review this document**
  
     + Emy: Read thoroughly, note questions
     + G: Technical review of approach
     + Sean: Awaiting feedback before finalizing

  2. **Make timeline decision**
  
     + Option A: Rush pre-holiday launch (Dec 16)
     + Option B: Comprehensive build (January)

  3. **Finalize JSON schema**
  
     + Lock down exact fields
     + Create one example product JSON
     + Test with rendering

### After Timeline Decision

  * **Update this document** with chosen path
  * **Create separate documents**
  
    + Design Scope (client-facing essentials)
    + Implementation Plan (technical with hours/tasks)
    + Proposal with pricing options
    + Invoice after decisions made

### Content Preparation (You Can Start Now)

  * Gather your best existing product photos
  * Write story cards for top 5-10 pieces
  * Compile product dimensions and details
  * Collect social media links
  * Refine brand color preferences
  * Think about which pieces to feature first

**Do NOT create JSON files yet** — wait for our finalized schema and green light. But preparing the raw content now will accelerate development.

---

## Add-Ons & Future Enhancements

These are SEPARATE projects, not included in initial build, available when you're ready:

  * **Professional photography session**
  
    + Cost: $300-500
    + Recommended: January 2025
    + Dramatically improves product presentation
    + Investment pays for itself

  * **Blog / Newsletter integration**
  
    + Platform: Beehiiv recommended
    + Cost: $200 setup
    + Different architecture than product catalog
    + Essential for Firelight Dispatches vision

  * **Social media integrations**
  
    + Instagram Shopping: $150-300
    + Video feed displays: $150-300
    + TikTok integration: $150-300

  * **Advanced automations**
  
    + Google Form → JSON pipeline: $200-400
    + Automated SERP updates: $200-400
    + AI copywriting triggers: $200-400

  * **Marketplace integrations**
  
    + Etsy sync: $200-300
    + Faire wholesale: $300-500
    + Whatnot automation: $150-300

  * **Ongoing maintenance** (optional)
  
    + $100/month retainer
    + Priority support
    + Content updates
    + Technical troubleshooting
    + Performance monitoring

---

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

### Future-Proofing Notes

This architecture is prepared for:

  * AI agents discovering and purchasing
  * Voice shopping interfaces
  * Automated inventory sync with other platforms
  * Scaling to hundreds of products
  * Migration to more robust database (if ever needed)
  * API access for mobile apps
  * Headless CMS integration (if ever wanted)

You won't outgrow this system. It grows with you.

---

**End of Comprehensive Reference Document**

*Next: Await timeline decision, then create Design Scope and Implementation Plan documents*
