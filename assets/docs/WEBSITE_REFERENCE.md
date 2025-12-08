# Comprehensive Website Reference for Everlastings by Emaline 
*Living document, updated 7 December 2025* 

## Objective 

  - This document represents a gathering of data used so that we have a comprehensive resource to pull from when creating other essential documents like the design scope, implementation plans, and even styles files. We should fill in gaps, identify missing elements, refine and perfect this document. 

### High Level Attention Areas 

  * **Claude identified unrealistic timeline constraints described below and proposed in `PROJECT_PROPOSALS.md`**
    + Look for *Pre-holiday version* annotations throughout this document showing simplified scope 
    + I offer my professional opinion and strategy below 

  * **A few notable best practice e-commerce design essentials** 

    + Most of the document is a fleshing out of provided layout, via the group chat 
      - Which is why I'm pulling up some of the notable changes for acknowledgement 
      - Sometimes the best place to gather understanding and inspiration is looking at Amazon's layout or Target's layout 

      1. Product with price always visible above the fold 
        - Strategically integrated into the homepage hero 
        - Featured in the section product grid pages 
      2. Buy now and an add to cart icon always on product tiles 
      3. "Accessory" type pages are often better condensed to a single, long, dynamic page 
        - It can double as a landing page alternative to the homepage where narrative might be stronger than conversion focus 
        - Any footer or menu links can use page anchors to jump to the part of page anyway 
        - It keeps us in control of the user journey rather than users getting lost in segmented pages 
        - It provides the opportunity to integrate more narrative, engaging, perspective motion background elements 
      4. There are many types of tags 
        - The logic and behavior of them are defined in the JSON product info section 
        - As noted there, please DO NOT USE OR CREATE THE SCHEMA YET 
        - We all need to really pause and think on if there are other values that we might need in the future 
        - A good example was that I just found the API values that Stripe requires for adding to their catalog and their timestamps are weird 
        - Some values indeed might serve multiple purposes 
        - But then there are also places like Google Shop and Meta Business Catalog that require specifics 
      5. Need to see product page content to finalize layout 
        - I cannot picture it right now, there are so many elements
        - Not that I'm in any way saying it won't work
        - I just need something tangible 

  * **Other document purposes and action items for YOU** 

    + This document very intentionally pulls from your own wording 
      - We want to get the branding down perfectly 
      - By editing things, adding, or removing brand copy here, we are creating a go-to resource 
      - So please be very aware of brand copy, check it
      - We should also create a Google Drive folder for brand copywriting 
      - We've yet to touch on much that really cuts to the heart of the emotion and gut check selling factor of Emy's personal story 

    + Similarly, but for my own future benefit, I'm trying to define this architecture to be packaged and sold to clients 
      - There are sections where we are singing the benefits 
      - From you, it would help helpful if you point out anything that doesn't effectively define itself in the writing 
      - That way I can address and better explain things both for you, and for my own future use cases 

### Timeline Options 

  1. **Option A: Rush Pre-Holiday Phase Production** 
    + Launch target is 16 December 2025
      - First development sprint before holiday would give 7 days before Christmas 
      - Create the MVP (Minimum Viable Product) feature set and then expand after launch 
    + Complexity of pages, interactivity and animation are skipped 
      - Phase 1 gets the cut and dry essentials published 
      - Phase 2 works on the engaging, interactive, fuller polished website 

  2. **Option B: Comprehensive Production**
    + Comfortable timeline by launching January 2026
    + More refined UX (User Experience) that tells the story from day 1 
      - Will feel polished before going live 
      - All interactivity, visuals, and engaging content fully complete  

#### Professional Consultant Thoughts 

  * **Go with Option B: Comprehensive Production and hype up a proper launch** 
   
    + It is hard to rationalize rushing art 
      - Though I can if you want 
      - Use the opportunity in a different way on social campaign; quick brainstorm below 
    
    + Consider what it means for next year 
      - You will be ready to go all in 
      - Make the *holidays* about *Miniatures* instead of banking on an after thought 
    
    + Your art is just not a last minute holiday gift
      - Even if we had 2 or 3 weeks that isn't time to build a campaign 
      - Who do you want to buy your work and in what mindset 
     
  * **Create a social media "7-days of Christmas" campaign promoting purchase without website** 

    + Post across all social media 
      - Create Facebook Albums and Instagram Photo Dumps of images of the miniatures 
      - Take slow, panning video of the miniatures from varying perspectives 

    + Lean into using emotion during the holidays to sell 
      - They used to call me 'the cry maker' at PETA for using sad content to get conversions 
      - Record selfie video explaining the emotional story about husband
      - Plan out the selfie videos and structure them as a series, leaving each with a cliffhanger 
      - Get them to come back for the video, the same way they would come back if they were debating an expensive art purchase normally 
      - Anyone you reach who feels "touched" and has some cash, is going to want to "buy" that "memory" to make it "real" (it is hoarder psychology)

  * **I'll throw in an offer to heal ease the bummer on missing the holidays** 

    + Professional photography session 
      - We could try to do some of it before "7-Days" 
      - Then I can also use AI to put them in different scenes for the website 

#### But It Is Ultimately Your Decision 

  + I could come up with logic to argue both but my style is polished, timeless, classic more than anything else 

  + "If it doesn't feel ready, don't post it" 
    - This was my mentor and then my saying when managing social media producers 
    - We still won awards and went viral yearly 

*This document details the FULL end-product vision. Each section includes notes on what the simplified pre-holiday version would include. After your timeline decision, we'll update this document accordingly and create separate Design Scope and Implementation Plan documents.*

---

## Table of Contents

  1. [Project Vision](#project-vision)
  2. [Technical Architecture Magic](#technical-architecture-magic)
  3. [Site Structure & Content](#site-structure--content)
  4. [Brand Identity & Voice](#brand-identity--voice)
  5. [Design System & Typography](#design-system--typography)
  6. [Automations & Integrations](#automations--integrations)
  7. [E-Commerce Integration](#e-commerce-integration)
  8. [Hosting & Infrastructure](#hosting--infrastructure)
  9. [Content Deliverables](#content-deliverables)
  10. [Success Metrics](#success-metrics)
  11. [Next Steps](#next-steps)

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

  * **A brand new home — A sacred Elsewhere**
  
    + Visitors immediately feel: Magic, Sanctuary, Nostalgia
    + Tone: warm, poetic, emotionally resonant
    + Threads of healing, hope, otherworldliness
    + "A sense of being gently held"

  * **Your professional identity**
  
    + **Architect of Elsewhere**
    + **Crafter of Moments**
    + **Artist + founder behind Everlastings**

### Why This Matters Strategically

  + You're not just selling miniatures 
    - You're offering **havens of beauty and quiet wonder for those who need a reminder that there is still magic in the world.** 
    - Your buyers are sentimental souls, emotional, lovers of story, memory keepers
    - They create nostalgia and treasure the tangible 
    - They are healers or they want to be part of a community that can find the light in grieving, probably both 
    - They show off on Instagram, share secrets on TikTok in cozy corners, find inspiration on Pinterest 
    - They love a good social media built in 'buy' option or using Apple Pay to chase whimsical dreams 

### The Implied Strategic Goal Structure 

  * **Your space online is your gallery, your story, your sanctuary**

    1. The website becomes the **center of your miniature world**, the heart 
    2. Social media, ads, community sharing stories in the newsletters, **all point back here**, the arms 
    3. Brick and mortar is just that, feet, where community you can meet, get their email, **so they find your heart** 

  * **When ready to transmute your story into something more, find more goals to consider in the `BRAND_STRATEGY.md` document**

---

## Technical Architecture Magic 

### The Dynamic JSON-Based System

  + This isn't a traditional website 
    - It's a **generative world engine** that adapts to whatever you create 
    - Without rebuilding pages or touching code 

  * **How it works**
  
    + Each miniature = one JSON file (any product is one file)
      - All content (story, photos, features, price, lighting modes) lives in that file 
      - We prefect just two HTML pages as templates that render EVERYTHING, dynamically, always fresh 
      - Your URL's are SEO or branding perfection: `everlastingsbyemaline.com/portals-to-peace/sunkeeper`
    + Changing the website is as simple as what you put on those JSON files 
      - Add a new product and the website automatically includes it in minutes 
      - Create an entire new website section just by adding a new "section" tag type 
      - Change the visuals that are featured on section pages using a "Yes" or "No" answer 
      - Show different visuals from any of the products "Yes" features, every time you reload the page 
      - Create entirely new themes for the homepage, that change every reload, the same way 
    + No CMS fees, no monthly software costs, and FUTURE PROOF 
      - We're in a new era of technology and we are distinctly ahead of the curve 
      - All-in-on platforms will not be able to keep up with technology the way this website type can 
      - We can automate everything, without paying extra for it 
      - No one tells us what newsletter platforms or other tools we have to use 

  * **The "magic trick" explained**
  
    + Proven architecture from Sean's portfolio 
      - See `august.style` 
      - Click through to website section and then refresh a few times 
      - We're going to do the same, but really lean into those capabilities 
    + We host on static servers that are either virtually or completely free 
      - "Tricking" the browser by using a 404-redirect page 
      - Instead our JavaScript loads dynamically 
      - This creates single-page application behavior
    + Simple and free automations keep things fresh 
      - GitHub Actions automatically rebuild manifest when you add products
      - Stripe webhooks mark items "sold" automatically 
      - You could even have an LLM write custom page content daily 

  * **Why this matters**
  
    + **Wildly scalable** 
      - 10 products or 500 products with no changes 
      - Suddenly have hundreds of visitors? Migrate to dedicated web hosts for dollars a month  
    + **Future-proof** 
      - AI agents will love this structured data 
      - You can swap in any new tool you want instead of the website host deciding 
    + **Cost-efficient** 
      - Immediately saves $350+/year that would have gone to host a Squarespace site 
      - Never paying $700/year to Zapier to connect tools, inventory, marketing, social 
    + **Easy updates** 
      - Google Form → JSON → website (no code needed) 
      - To start, G will be able to create JSONs and place them where they need to go 
    + **Dynamic sections** 
      - Create new collection name → website adapts automatically 
      - Add the product type tag "Notebooks" and you instantly can filter the shop for Notebooks 
    + **Theme control** 
      - Homepage can change every time a user visits, thanks to product JSONs 
      - Site images are always changing just by adding products 

### Comparison to Shopify (What You're Actually Getting)

  * **It is no secret that Shopify has been the industry go-to for anyone not headed to Etsy** 
  
    + Think of any beautiful Shopify store you've seen — clean product grids, filterable collections, gorgeous product pages with galleries 
    + You're getting that experience, WITHOUT:
    
      - Monthly fees ($39-299/month)
      - Transaction fees (2% on top of Stripe's 2.9%)
      - App marketplace lock-in
      - Clunky admin panels
      - Generic templates 

  * **Instead you get a *custom-built system* that feels as polished as Shopify**
  
    + But it is architecturally superior for artisan brands 
      - The dynamic sections work easier than Shopify collections 
      - The tag filters work the same as Shopify filters 
      - Your product pages look better than Shopify product pages, because they're custom 

*Pre-holiday version: Core architecture identical, fewer products initially, simplified homepage (no seasonal theme rotation yet)*

---

## Site Structure & Content 

  * **The entire site must be exceptional across all device sizes** 

    + No development page, stage, feature can move on until tested across various sizes 
      - Test while building instead of waiting until the desktop design is complete 
      - Waiting and fixing a list of things is inherently not designing mobile-first 
    + Remember that Shopify is perfect on mobile so we have zero room for clunk or friction 

### Proposed Strategic Decision: One Long Landing Page

  * **Why we combined multiple pages into one scrolling experience**
    
    + Traditional websites make you click around from Home, then About, then Collection, then Philosophy 
    + Each click is a moment where visitors might leave 
    + We're creating a **narrative journey** instead and maintaining control over the experience 
      - With one continuous scroll that controls the story we want to tell 
      - Still let user use standard "About" or "Philosophy" links from anywhere to jump to that part of the page (anchor)

  * **Think of it like opening a book or a miniature scene** 
  
    + You discover elements in the order that creates the most emotional impact 
    + This is what premium brands and SaaS companies do because they have the data that shows it works 

  * **The flow, with each part flagged using the powerful tagline as a heading**
  
    + Hero: "Enter Elsewhere" — breath-catching first impression
    + Story: "When the world cracked open, I made something small enough to hold"
    + Collection preview: Featured pieces with "Explore More" to full catalog
    + Philosophy: What makes Everlastings different
    + Commissions: How to work with you
    + Contact: Simple, elegant

  * **Other pages are separate, but all build instantly, dynamically, from one of two templates**
  
    + Product Pages 
      - Individual miniature showcases 
      - Each a heart of the site 
    + Product Collection Grid(s)
      - Filterable catalog with one major for 'All Products' 
      - Each themed section will feature images from selected randomize products 

  * **Blog/Newsletters, mentioned in the chat thread, are a different architecture that is outside of this projects scope** 


*Pre-holiday version: Single landing page complete, simplified copy with Lorem ipsum showing word count needs so you can see what length feels right*

---

### Homepage Experience Is Like Opening a Miniature

  * **Here's how we'd like to make sure that when someone lands on `everlastingsbyemaline.com`, they feel like they're peering into one of the miniatures IRL**

    + Create a theatrical reveal with perspective shift magic 
      - Opening animation: box opening, book opening, dollhouse hinge
      - Reveals the scene behind it (a miniature world)
      - Not actual 3D — it's **perceptual depth through lighting**

    + Creating depth through lighting as a signature, classic and timeless, powerful but simple, interaction 
      - As you scroll, CSS-based spotlight shifts
      - Illuminates different parts of the hero image
      - Creates sensation of moving closer/farther from the miniature
      - Like theater spotlights scrolling across stage
      - Subtle, elegant, magical
      - All done with CSS transforms, masks, gradients (no heavy JavaScript for design, only content placement)

  * **Dynamic homepage themes mean every time a visitor comes to the page, one of a select collection of themes will be displayed**
  
    + Homepage can feature different seasonal palettes or whatever product you'd like 
      - Controlled from values that every product's JSON file has 
      - Changes the "world" visitors enter; different gradient colors, other objects with interactive lighting 
      - Makes returning visitors feel fresh magic 

*Pre-holiday version: Hero with static featured image, simplified opening animation, lighting effects deferred to Phase 2* 

---

### Product Collection Grid Pages 

  * **Two user experiences from one page theme** 

    1. Your themed "Section" tagged pages 
      
      + Much like Shopify collections that are more visual 
        - Large hero image from featured product in that section
        - Storytelling introduction
 
      + Automatically created by simply adding a totally new "section" tag to a product JSON
        - Portals to Peace
        - Winter Favorites
        - Book Nooks & Story Lofts
        - Magical / Fantasy
        - Architectural

      + Note regarding "Sold" section tag that was in the group chat 
        - There are many different types of tags 
        - Most tags can overlap 
        - The section tags cannot overlap                **<-- please correct me if I'm wrong**
        - "Sold" will technically a boolean 
        - The boolean can still be an available tag to apply as a filter for sure 
        - But this way we will maintain sold out products in their sections 
        - This seems best based on "creating a feeling of scarcity" 
        - But at some point human or AI will probably want to go an delete product JSONs, OR 
        - Or we could have another boolean for "archived" 
        - In any case, I don't think we actually want the "Sold" filtered products to have a featured/themed product grid 
        - As in no hero image and storytelling intro like the above 
        **You'll learn more about tags, tag and filter types, and behavior logic in the JSON section coming up below**

    2. The essential "All Products" page 

      + For users who just want to jump into everything 
        - Fairly standard on shopping sites, this page wouldn't have the featured image header 
        - Wildly user friendly dropdowns and sorting options let the user explore 

  * **Universally familiar interface to navigate through product tiles** 

    + UI filtering dropdowns have checkmark beside tags (multi-select like Shopify)
      - Most grouped by type of tag 
      - A few odds and ends that are boolean (available versus sold) 
      - Dropdown filter types defined with visuals 
      `https://www.justinmind.com/ui-design/drop-down-list` 
    
    + UI filtering of single selection dropdown tags 
      - These would be the section tags 
      - Selecting one must refresh the page to apply it
      - On reload any products with that section tag that also have "featured" selected would
      - Provide a collection of imagery that is randomly selected from that pool 

    + UI sorting selectors 
      - Sort controls (newest, price, title)
      - Note that some of these might not be blatantly on the JSON just for UI filtering (newest)
      - Not sure we'll necessarily actually want to use "Title" FYI 

  * **UI Component Library: shadcn/ui**
  
    + Using shadcn/ui for polished, accessible components
    + Benefits: Production-grade quality, fully customizable, no runtime overhead
    + Why this matters: Expected standard in modern web dev, perfect for portfolio showcase
    + Components: Dropdowns, checkboxes, buttons, cards
    + Customization freedom: Can add personality without breaking accessibility
    + Matches minimalist aesthetic perfectly
    + Accessible by default (ARIA labels, keyboard navigation)
    + Note: His collection is extensive - we can find components with subtle quirk/character

  * **Universally familiar product tile design**

    + Product Tile Design 
      - Collection of tile images (or one but I figure why not multiple)
      - Price 
      - Title
      - Category 

    + Active filters stay visible
    + Filter counts update live

    + It is very important that we have 
      - A "buy now" button 
      - Which would pair well with an add to cart icon on tile front 

*Pre-holiday version: Core grid functional, basic filters, hero images may be placeholders*

---

### Individual Product Pages 

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

*Pre-holiday version: Core layout complete, may use placeholder Lorem ipsum for story length examples, fewer photos initially (you add more over time)*

---

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
      - Newsletter (optional quick signup)
    + Mobile: Hamburger menu, logo center, cart icon right
    + Sticky on scroll (collapses slightly for more screen space)
    + Background: Subtle fog gray with transparency effect

  * **Footer (comprehensive, organized)**
  
    + **Column 1: About Everlastings**
      - Logo
      - Brief tagline: "Handcrafted havens for the stories that stay"
      - Newsletter signup (inline form)
    
    + **Column 2: Shop**
      - All Products
      - Portals to Peace
      - Book Nooks
      - Winter Collection
      - Sold Archive
      - Commissions
    
    + **Column 3: Support**
      - Contact
      - Shipping & Returns
      - Care Instructions
      - FAQ
      - Privacy Policy
    
    + **Column 4: Connect**
      - Instagram: ________________ (CLIENT DELIVERABLE)
      - Facebook: ________________ (CLIENT DELIVERABLE)
      - Pinterest: ________________ (CLIENT DELIVERABLE)
      - TikTok: ________________ (CLIENT DELIVERABLE)
      - Email: emyh@everlastingsbyemaline.com
    
    + **Bottom bar**
      - Copyright © 2025 Everlastings by Emaline. All rights reserved.
      - Site by Sean August Horvath of https://august.style
      - Terms of Service | Privacy Policy

  * **Navigation patterns**
  
    + Smooth scroll to page anchors (for single-page sections)
    + Hover states: subtle color shift to plum/lavender
    + Active page indicator: underline or color accent
    + Breadcrumbs on product pages: Home > Collection > Product
    + "Back to Collections" link on product pages

*Pre-holiday version: Simplified footer (fewer links), basic header navigation*

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

## Design System & Typography

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

--- 

### API Catalog Syncing 

#### Stripe Product Object 

```json
{
  "id": "prod_NWjs8kKbJWmuuc",
  "object": "product",
  "active": true,
  "created": 1678833149,
  "default_price": null,
  "description": null,
  "images": [],
  "marketing_features": [],
  "livemode": false,
  "metadata": {},
  "name": "Gold Plan",
  "package_dimensions": null,
  "shippable": null,
  "statement_descriptor": null,
  "tax_code": null,
  "unit_label": null,
  "updated": 1678833149,
  "url": null
}
```

### JSON Schema (Your Content Template)

**IMPORTANT: Do NOT create product JSON files yet.** We're finalizing this schema to be perfect before you start. Use this to prepare your content, but wait for the green light.

Each product JSON includes:

  * **Core identification**
  
    + `sku`: Unique identifier  
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
    + `dimensions`: length, width, height or string
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

*Pre-holiday version: Manual JSON creation for initial 5-10 products, automated pipeline deferred to Phase 2*

---

## Automations & Integrations

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
    + Cost: $0 (GitHub Actions free tier)

  * **Stripe Webhooks (Inventory sync)**
  
    + Trigger: `checkout.session.completed` event
    + Action:
      1. Identify purchased product by SKU
      2. Update corresponding JSON file
      3. Change `availability` to "sold"
      4. Commit change to repository
      5. Trigger GitHub Action rebuild
    + Alternative: Manual webhook endpoint if GitHub isn't viable
    + Cost: $0 (part of Stripe)

### Future Automation Opportunities

  * **Product catalog sync across platforms**
  
    + **Phase 2 consideration**: GitHub webhook → API calls
    + When product JSON added/updated:
      - Create Stripe Product + Price automatically
      - Add to Google Shopping feed
      - Add to Meta Business Catalog (Facebook/Instagram Shop)
      - Add to Pinterest Product Pins
      - Add to TikTok Shop (if applicable)
    + **Why NOT Zapier**: 
      - Cost: $700/year for necessary tier
      - Limited flexibility vs custom code
      - We build better automation solutions in-house
      - Same reason we avoid Squarespace/Webflow/Framer

  * **AI-powered content automation**
  
    + Trigger: New product JSON committed
    + AI generates:
      - Social media post copy (platform-specific)
      - SEO-optimized meta descriptions
      - Alt text for images if missing
      - Related product suggestions
    + Posts to social APIs automatically (optional)
    + Cost: API calls only (~$1-5/month)

  * **Email automation** (with newsletter platform)
  
    + New product launch announcements
    + Sold product notifications (scarcity marketing)
    + Back in stock alerts (if applicable)
    + Seasonal collection reveals
    + Integration: Beehiiv API or Stripe customer exports

### Platform Integrations (Setup Required)

  * **Google ecosystem** (CLIENT DELIVERABLE: API keys/access)
  
    + **Google Analytics 4**
      - Track pageviews, conversions, user flow
      - E-commerce events (view_item, add_to_cart, purchase)
      - Already accessible in Google Workspace account
    
    + **Google Search Console**
      - Submit sitemap
      - Monitor search performance
      - Fix indexing issues
      - Already accessible in Google Workspace account
    
    + **Google Business Profile** (if applicable)
      - Physical shop location
      - Operating hours
      - Reviews integration
    
    + **Google Shopping Feed** (Phase 2)
      - Product catalog XML/JSON feed
      - Automated updates from product JSONs
      - Requires Merchant Center account

  * **Meta Business Suite** (CLIENT DELIVERABLE: Access)
  
    + **Facebook Pixel**
      - Track conversions
      - Retargeting audiences
      - Custom audiences from purchasers
    
    + **Instagram Shopping**
      - Product tagging in posts
      - Shop tab on profile
      - Checkout integration
    
    + **Meta Business Catalog**
      - Centralized product feed
      - Powers Facebook/Instagram shops
      - Auto-sync from website possible

  * **Pinterest Business** (CLIENT DELIVERABLE: Access)
  
    + **Pinterest Tag**
      - Track conversions
      - Create shopping audiences
    
    + **Product Pins**
      - Rich pins with pricing
      - Direct website links
      - Automated from product feed

  * **TikTok** (CLIENT DELIVERABLE: Access if pursuing)
  
    + **TikTok Pixel**
      - Track website visitors from TikTok
      - Retargeting
    
    + **TikTok Shop** (if expanding)
      - In-app purchasing
      - Live shopping features
      - Product catalog sync

### Avoided Costs Through Custom Automation

  * **Zapier alternative**: Save $700/year
  * **Shopify/CMS**: Save $350+/year
  * **Marketing automation tools**: Save $300-1200/year
  * **Inventory management tools**: Save $200-500/year
  * **Total savings through custom solution**: ~$1,550-2,750/year

### API Keys & Access Needed (CLIENT DELIVERABLE)

  1. **Stripe** (already setup ✓)
     - Publishable key (frontend)
     - Secret key (backend/webhooks)
     - Webhook signing secret
  
  2. **Cloudflare R2** (Sean to setup)
     - Account ID
     - Access Key ID
     - Secret Access Key
     - Bucket name
  
  3. **Google Analytics**
     - Measurement ID (G-XXXXXXXXXX)
     - Already in Workspace account
  
  4. **Google Search Console**
     - Domain verification
     - Already in Workspace account
  
  5. **Social Media Platforms** (Phase 2)
     - Facebook/Instagram: App ID, App Secret, Access Token
     - Pinterest: App ID, App Secret, Access Token
     - TikTok: App Key, App Secret (if applicable)
  
  6. **Email/Newsletter** (Phase 2)
     - Beehiiv API key
     - Or Stripe Customer export automation

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

*Phase 2 enhancement: Migrate to Stripe Embedded Components for fully branded checkout (no redirect to Stripe's page)*

*Pre-holiday version: Stripe Checkout functional, initial 5-10 products enabled, webhook tested*

### Supported Payment Methods

Stripe Checkout automatically presents the optimal payment methods based on customer location and device. All methods enabled by default:

  * **Card payments**
    + Credit cards (Visa, Mastercard, Amex, Discover)
    + Debit cards
    + International cards

  * **Digital wallets**
    + Apple Pay (iOS/Mac devices)
    + Google Pay (Android/Chrome)
    + Link (Stripe's save-and-autofill service)

  * **Buy Now, Pay Later**
    + Affirm
    + Afterpay/Clearpay
    + Klarna

  * **Bank payments**
    + ACH Direct Debit (US bank accounts)
    + Cash App Pay

  * **International**
    + WeChat Pay
    + Alipay
    + Many regional options

  * **Future considerations**
    + PayPal (separate integration, 3.49% + $0.49 fee)
    + Amazon Pay (separate integration)
    + Cryptocurrency/Stablecoins (via Stripe or separate)

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
    + Never heard of and hard to out-vote Hostinger 

  * **Vercel**
  
    + **Cost:** $0-20/month
    + **Benefits:** Excellent performance, generous free tier
    + **Drawback:** Overkill for static site
    + Trendy for good reason, but typically sought after for staging and not deploying production product 

  * **Hostinger**
  
    + **Cost:** ~$3/month
    + **Benefits:** Traditional hosting, more familiar
    + **Drawback:** Less automated than GitHub/Netlify 
    + This seems like a good one to have on record as an option for down the line if we have heavy traffic increases 
    + "Less automated" just means that we'd to spend more time developing solutions for automation, not that it wouldn't be automated. 

**Recommendation:** Start with GitHub Pages + Cloudflare R2. If repo size becomes issue, migrate to ~~Netlify~~ (takes ~1 hour, we handle it) Hostinger if the time comes to become bigger and badder and faster. 

### Domain & DNS

  * **Domain stays at Squarespace**
  
    + Already registered through Sep 2026
    + Cost: $12/year (after $1 first year promo)
    + DNS points to hosting platform
    + No need to transfer

  * **Google Workspace**
  
    + Active: emyh@everlastingsbyemaline.com (+ 3 additional seats)
    + Cost: $400/year (4 seats)
    + Sean has admin access ✓

### Operating Costs Summary

  * **Fixed annual costs:**
    + Domain (Squarespace): $12/year
    + Google Workspace (4 seats): $400/year
    + Image CDN (Cloudflare R2): ~$12-60/year
    + **Total: ~$424-472/year**

  * **Transaction costs:**
    + Stripe fees: 2.9% + $0.30 per transaction
    + Example: $200 sale = $6.10 fee, you keep $193.90

  * **Comparison to Squarespace + Workspace:**
    + Squarespace Commerce Basic: $350/year
    + Google Workspace: $400/year
    + **Squarespace total: $750/year**
    + **Our solution: ~$424-472/year**
    + **Direct savings: $278-326/year**

  * **Additional avoided costs through custom architecture:**
    + Zapier (automation tier): $700/year saved
    + Shopify/premium CMS: $350-500/year saved
    + Marketing automation tools: $300-1200/year saved
    + Inventory management SaaS: $200-500/year saved
    + **Total potential savings: $1,550-2,750/year**

  * **Why these savings matter:**
    + Custom > SaaS: We build exactly what you need
    + Future-proof: Own your infrastructure
    + Scalable: Growth doesn't increase costs proportionally
    + Flexible: Can add features without subscription tiers
    + Professional: Better than cookie-cutter solutions
  * Image CDN: ~$12-60/year
  * Stripe fees: 2.9% + $0.30 per transaction
  * **Total fixed: ~$96-144/year** vs $350/year Squarespace Tier 2

**Savings: $206-254/year** (plus you own your infrastructure)

---

## Out-Of-Scope 

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

  * **Smart filter UI logic**
  
    + If a tag type contains only ONE tag, hide that filter dropdown
    + Example: If all products are "Lighted", don't show "Product Type" filter
    + Reduces UI clutter automatically
    + Dynamically adapts as catalog grows
    + Keeps interface clean and purposeful

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

**End of Comprehensive Website Reference Document**

*This document will continue to evolve as we refine specifications and make architectural decisions. All major changes will be tracked and communicated.*

*Last updated: December 7, 2025*