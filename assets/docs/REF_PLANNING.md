# Reference & Planning 

## Do Next Planning 

  + Get JSON together ASAP 
    - Need example of all details immediately 
    - Many of the items on the Product Page are ambiguous and will need to be seen to be understood what we're designing for 
  + Create a Google Sheet with JSON Keys and Values Defined 
    - For reference when they're filling them out 
    - Maintain lists of used tags, etc. 
  + When putting together and when reviewing and building 
    - Make sure we are thinking ahead to other values we might need 
    - Values that will be used on page, on product tile 
    - Values used when featured for homepage, for section page heading 
    - Are there different types of images to group by 
    - Space ahead of time for video 

 * **Handles/URLs** 

       - Instagram 
      - Facebook
      - Pinterest 
      - TikTok 


## Best Practices 

  - Product and price above fold 
  - Buy now, add to cart right on product tile 
  - Long landing page for secondary pages like about, brand story, etc. 

## Dynamic Elements 

Types of tags 
Overlapping values from catalog types 

Product 
- Product type 
  - Miniature 
  - Printables 
  - Storybooks 
  - Firelight Council additions 
- Media 
  - 7–15 photos per piece
    - Lighting mode demonstrations
- Copy 
  - Full story 
  - 'Portals of Peace' 
  - Story cards 2-8 paragraphs of poetry 
- Quantity 
  - 1 for one of a kind 
  - 0 for sold out 
  - N for potential future products with multiple quantity 

  * **Anything we want to be able to sort or filter by** 

  + TAGS 
    - Section tags (select only one)
    - Product type (generally only one)
  + BOOLEAN 
    - Featured (true/false)
  + OPEN-ENDED 
    - Media (7-10 photos per piece; separation for image type like lighting mode demo)
    - Copy (full story, story cards, etc.)
  + NUMERICAL 
    - Price 
    - Quantity (1 for one of kind, 0 for sold out, N for future products that have quantity)
  + IDENTITY 
    - Date of creation (used for newest)

  * **Logic and script arguments needed** 

  + Price we might want to consider grouping for one of the filtering dropdowns 
  + Quantity, when '0' we need things to update with sold out in all appropriate places 
  + Sorting for Newest, price, title 
  + Section tags must refresh page every time one is selected, pulling images randomly 

  + Active filters stay visible
  + Filter counts update live

* **UI Component Library: shadcn/ui**
  + Using shadcn/ui for polished, accessible components
  + Benefits: Production-grade quality, fully customizable, no runtime overhead
  + Why this matters: Expected standard in modern web dev, perfect for portfolio showcase
  + Components: Dropdowns, checkboxes, buttons, cards
  + Customization freedom: Can add personality without breaking accessibility
  + Matches minimalist aesthetic perfectly
  + Accessible by default (ARIA labels, keyboard navigation)
  + Note: His collection is extensive - we can find components with subtle quirk/character
  
  + For visual examples and names of types of dropdowns: `https://www.justinmind.com/ui-design/drop-down-list`

### Find Values Needed & Meaning 

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