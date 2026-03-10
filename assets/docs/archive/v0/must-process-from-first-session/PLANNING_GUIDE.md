# EVERLASTINGS BY EMALINE — MASTER PLANNING DOCUMENT

**Project Status:** Planning Phase  
**Document Date:** December 7, 2024  
**Prepared By:** Sean August Horvath  
**Client:** Emy Hoff (Everlastings by Emaline)  
**Project Manager:** G (ChatGPT Projects AI)

---

## EXECUTIVE SUMMARY

Everlastings by Emaline requires a sophisticated yet artisan-focused e-commerce storefront that tells the powerful story behind each handcrafted miniature piece. The website will serve as both a sales platform and a storytelling archive, creating an emotional sanctuary where visitors can discover and purchase one-of-a-kind miniature worlds.

**Critical Timeline:** Launch before Christmas 2024 to capture holiday season sales. Current Squarespace subscription expires December 16, 2024.

**Strategic Approach:** Phased implementation with immediate rush launch of core functionality, followed by enhanced features post-holiday.

**Budget Range:** $400-500 (discounted from full value for portfolio development and relationship building)

---

## I. PROJECT OVERVIEW

### Client Profile

**Business:** Everlastings by Emaline  
**Owner/Artist:** Emy Hoff  
**Brand Identity:** "Architect of Elsewhere, Crafter of Moments"  
**Current Status:** Products displayed in local Massachusetts brick-and-mortar shop

### Brand Story

The artist creates miniature scenes as a healing ritual shared with her husband, who experienced a brain injury resulting in permanent personality changes. These tiny worlds represent sanctuary, control, and the creation of beauty during profound personal upheaval. Each piece carries deep emotional resonance and tells a story of hope, healing, and transformation.

**Tone:** Warm, poetic, emotionally resonant, magical, with threads of healing and otherworldliness

### Technical Requirements

**Repository:** `everlastings` (GitHub)  
**Local Directory:** `~/Development/everlastings-website`  
**Architecture Model:** Based on Sean's 360-design portfolio (JSON-based dynamic SPA)  
**Domain:** Currently with Squarespace (registered Sep 19, 2025 - Sep 19, 2026, $12/yr after)  
**Email/Workspace:** Google Workspace (admin access granted)  
**Payment Processing:** Stripe (account created, Emy invited as super admin)

---

## II. REQUIREMENTS GATHERED

### A. Functional Requirements

**Essential (Phase 1):**
- Product catalog with rich story cards (2-8 paragraphs per piece)
- High-quality image galleries (7-15 photos per product, including lighting variations)
- Filterable collection grid (by category, type, availability)
- Stripe checkout integration (industry-standard prebuilt checkout)
- Inventory management (one-of-one pieces auto-mark as "sold")
- Newsletter signup capability
- Mobile-responsive design
- Dynamic homepage with randomized featured pieces

**Enhanced (Phase 2):**
- Interactive scrolling "About" page with parallax effects
- Themed homepage variations that rotate
- Embedded Stripe components for branded checkout experience
- Automated archive system for sold pieces
- Blog/newsletter integration (Beehiiv recommended)

**Future Considerations (Add-ons):**
- Social media video feed integration
- Automated SEO/SERP content updates
- AI-powered dynamic copywriting
- Product photography session and staging
- Etsy/marketplace integrations

### B. Content Structure

**Homepage:**
- Hero section with featured piece (video or high-res image)
- Welcome text: "Where tiny worlds offer quiet beauty, soft wonder, and the feeling of being home"
- Dynamic featured pieces carousel (randomizes on each visit)
- Brand pillars: Story • Craftsmanship • Sanctuary
- Newsletter signup
- Direct product visibility above fold

**Product Pages:**
- Left column: Poetic story card (2-8 paragraphs)
- Right column: Product details, features with icons, dimensions, lighting modes, power supply, price, "Add to Cart"
- Large photo gallery with lighting variation examples
- Care instructions
- Shipping details
- Optional: "Hold This Piece" request via email

**Collection Grid:**
- Filterable by: All, Portals to Peace, Winter, Book Nooks, Magical/Fantasy, Architectural, Sold
- Each tile: Photo, title, category, price
- Click through to full product page

**Combined Landing Page (Replaces Multiple Static Pages):**
One long, flowing scrolling page that controls the narrative:
- Hero/Welcome
- Brand Story & Philosophy
- Featured Collection Preview
- About Emaline (origin story, creative process)
- Commissions Information
- Contact & Newsletter Signup

**Footer:**
- FAQ
- Shipping & Returns
- Policies
- Social media links

### C. Brand Requirements

**Visual Identity:**
- Warm, magical, sanctuary-like aesthetic
- Emphasis on high-quality product photography
- Clean, elegant typography
- Ample whitespace
- Subtle interactions that feel enchanted
- Color palette: To be defined with client (likely warm, nostalgic tones)

**User Experience Goals:**
- Immediate emotional connection
- Sense of discovering a secret, sacred space
- Easy navigation without overwhelming choices
- Clear path to purchase on every page
- Mobile-first design (many shoppers browse on phones)

---

## III. TECHNICAL ARCHITECTURE

### Core Technology Stack

**Frontend:**
- HTML5/CSS3/JavaScript (ES6+)
- Dynamic Single Page Application (SPA) architecture
- Responsive design (mobile-first approach)
- GitHub Pages hosting (primary option)

**Data Management:**
- JSON-based product catalog
- Automated manifest generation via GitHub Actions
- Python script for manifest building on push

**Payment Processing:**
- Stripe Prebuilt Checkout (Checkout Sessions API)
- Products and Prices created programmatically via Stripe API
- Client-only integration (no server required for Phase 1)

**Automation:**
- GitHub Actions for automated manifest rebuilds
- Webhook system for inventory updates (manual trigger initially acceptable)

### Architecture Inspiration: 360-Design Portfolio

**Proven Components to Adapt:**
- 404 fake-out page pattern for SEO
- Dynamic template system for product/collection pages
- JSON-based content management
- Filter controller and tile renderer
- Manifest generation automation

**Key Files for Reference:**
```
/Users/seanivore/Development/360-design/
├── 404.html (entry point with URL parsing)
├── index.html (homepage)
├── section.html (collection grid template)
├── entry.html (product page template)
├── assets/
│   ├── js/
│   │   ├── data-loader.js
│   │   ├── entry-controller.js
│   │   ├── filter-controller.js
│   │   ├── homepage-controller.js
│   │   ├── section-controller.js
│   │   └── tile-renderer.js
│   └── entries/ (product JSONs)
├── generate_manifest.py
└── .github/workflows/manifest.yml
```

### Product JSON Schema

Each product will be represented as a JSON file with the following structure:

```json
{
  "uid": "evl-001-frostvale",
  "title": "Frostvale Winter Lodge",
  "tagline": "A sanctuary of warmth in the heart of winter",
  "price": 245.00,
  "stripe_price_id": "price_xxxxxxxxxxxxx",
  "category": ["portals-to-peace", "winter"],
  "tags": ["magical", "cozy", "lighting"],
  "availability": "available",
  "featured": true,
  "story": {
    "full": "Multi-paragraph poetic story...",
    "excerpt": "Short version for tiles..."
  },
  "features": [
    {
      "icon": "lightbulb",
      "text": "Three lighting modes: warm, cool, and candlelight"
    },
    {
      "icon": "ruler",
      "text": "8\" × 6\" × 10\" (W × D × H)"
    },
    {
      "icon": "power",
      "text": "USB-powered with included adapter"
    }
  ],
  "images": {
    "hero": "assets/products/frostvale/hero.jpg",
    "gallery": [
      "assets/products/frostvale/detail-01.jpg",
      "assets/products/frostvale/detail-02.jpg",
      "assets/products/frostvale/lighting-warm.jpg",
      "assets/products/frostvale/lighting-cool.jpg",
      "assets/products/frostvale/lighting-candle.jpg"
    ],
    "thumbnail": "assets/products/frostvale/thumbnail.jpg"
  },
  "details": {
    "dimensions": "8\" × 6\" × 10\" (W × D × H)",
    "weight": "2.5 lbs",
    "materials": ["wood", "resin", "LED lights", "natural moss"],
    "power": "USB-C (adapter included)",
    "care": "Dust gently with soft brush. Keep away from direct sunlight.",
    "shipping": "Ships within 3-5 business days. Carefully packaged for protection."
  },
  "created": "2024-11-15",
  "updated": "2024-12-01"
}
```

### Stripe Integration Workflow

**Phase 1: Prebuilt Checkout**

1. **Product Creation Script** (Python):
   ```python
   # Read product JSON
   # Create Stripe Product via API
   product = stripe.Product.create(
       name=json_data['title'],
       description=json_data['story']['excerpt'],
       images=[json_data['images']['hero']]
   )
   
   # Create Stripe Price
   price = stripe.Price.create(
       product=product.id,
       unit_amount=int(json_data['price'] * 100),
       currency='usd'
   )
   
   # Store price_id back in JSON
   json_data['stripe_price_id'] = price.id
   ```

2. **Checkout Integration**:
   ```javascript
   // Buy button click
   const session = await stripe.checkout.sessions.create({
       line_items: [{
           price: product.stripe_price_id,
           quantity: 1
       }],
       mode: 'payment',
       success_url: 'https://everlastingsbyemaline.com/success',
       cancel_url: 'https://everlastingsbyemaline.com/collection'
   });
   
   // Redirect to Stripe checkout
   window.location.href = session.url;
   ```

**Advantages:**
- Unlimited product scalability (10 or 1000 products, same process)
- Industry standard (used by Anthropic, OpenAI, etc.)
- No manual Stripe Dashboard data entry
- Automatic synchronization between website and payment system
- Easy inventory management via JSON updates

---

## IV. HOSTING OPTIONS ANALYSIS

### Option A: GitHub Pages (Recommended for Phase 1)

**Pros:**
- Free hosting
- Automatic HTTPS
- Direct integration with development workflow
- GitHub Actions for automation
- Proven architecture from 360-design
- Fast global CDN
- Zero ongoing costs

**Cons:**
- Repository size limits (1GB soft limit, 100GB bandwidth/month)
- Image-heavy site may hit limits with many products
- Static site only (but that's our architecture anyway)
- Public repository (though code is just frontend)

**Cost:** $0/month

**Migration Path:** Easy export to any static host if growth requires

### Option B: Netlify

**Pros:**
- Free tier: 100GB bandwidth/month
- Larger storage than GitHub (500MB base)
- Built-in forms (for contact/newsletter)
- Deploy previews
- Easy custom domain
- Serverless functions available if needed

**Cons:**
- Still may hit limits with image-heavy products
- Paid tier required for more bandwidth ($19/month)

**Cost:** $0-19/month

### Option C: Vercel

**Pros:**
- Excellent performance
- Generous free tier
- Great for Next.js if we ever migrate to dynamic
- Automatic deployments from Git

**Cons:**
- Similar limitations to Netlify on images
- Paid plans for commercial use

**Cost:** $0-20/month

### Option D: Cloudflare Pages + R2 Storage

**Pros:**
- Unlimited bandwidth on free tier
- R2 object storage for images (pay-as-you-go, very cheap)
- Can handle massive growth
- Professional infrastructure
- Image optimization services

**Cons:**
- More complex setup
- R2 costs scale with usage (but minimal)

**Cost:** ~$1-5/month (estimated for ~50 products with 10 images each)

### Option E: Traditional Shared Hosting (Hostinger, etc.)

**Pros:**
- More control
- Can run server-side code if ever needed
- No repo size concerns
- Often includes email hosting

**Cons:**
- Monthly cost
- Less integrated with development workflow
- Slower than CDN-based solutions

**Cost:** $3-10/month (Hostinger shared hosting: ~$3/month)

### Recommendation: Hybrid Approach

**Phase 1:**
- GitHub Pages for site hosting (free)
- Evaluate storage needs with actual product count

**Phase 2 (if needed):**
- Migrate images to Cloudflare R2 or similar CDN
- Keep site on GitHub Pages
- Best of both worlds: free hosting + scalable storage

**Comparison to Squarespace:** $276/year savings (Squarespace tier 2: $36/month, $276/year)

---

## V. PHASED IMPLEMENTATION STRATEGY

### Phase 1: Rush Launch (Pre-Holiday)

**Goal:** Functional storefront live before Christmas to capture holiday sales

**Timeline:** Build next week (Dec 9-13), launch by Dec 16, one week buffer before Christmas

**Scope:**

1. **JSON Schema & Documentation** (2 hours)
   - Define comprehensive product JSON structure
   - Create template and documentation for G/Emy
   - Include all fields needed for future homepage themes
   - Set up product directory structure

2. **Product Page Template** (2 hours)
   - Adapt 360-design entry.html template
   - Story card on left, product details on right
   - Image gallery with lightbox
   - Add to Cart integration
   - Mobile-responsive layout
   - Filler text for G/Emy to see word count needs

3. **Collection Grid Template** (1 hour)
   - Adapt 360-design section.html template
   - Filterable product grid
   - Uses existing filter-controller.js as reference
   - Auto-generates from JSON (add new product, page updates automatically)

4. **Dynamic Homepage** (3 hours)
   - Hero section with featured piece
   - Random tile selection from featured products (reloads change display)
   - Brand pillars section
   - Newsletter signup form
   - Call-to-action buttons
   - Mobile-first responsive design

5. **Combined Landing Page** (4 hours)
   - ONE long scrolling page for all static content
   - Sections: Hero, Story, Collection Preview, About, Commissions, Contact
   - Smooth scroll navigation
   - Filler text showing word count needs
   - Option to add parallax effects in Phase 2

6. **Stripe Integration** (3 hours total)
   - **Products API Script** (2 hours): Python script reads product JSONs, creates Stripe Products/Prices, stores IDs back
   - **Checkout Integration** (1 hour): Buy buttons redirect to Stripe Prebuilt Checkout
   - Test transactions
   - Success/cancel pages

7. **GitHub Actions & Automation** (0.5 hours)
   - Copy and adapt manifest.yml from 360-design
   - Automatic manifest rebuild on push
   - Validate JSON on commit

8. **Webhook Setup** (1 hour)
   - Basic webhook endpoint for inventory updates
   - Initially can be manual trigger
   - When product sells, update JSON availability status
   - Future: Automatic archive after 30 days or manual removal

9. **Testing & QA** (2 hours)
   - Cross-browser testing (Chrome, Safari, Firefox, Edge)
   - Mobile responsive testing (iOS, Android)
   - Checkout flow testing
   - Link validation
   - Performance optimization
   - Image lazy loading

10. **Documentation & Handoff** (1.5 hours)
    - How to add new products (JSON creation guide)
    - How to update existing products
    - How to manage sold items
    - Stripe dashboard basics
    - FAQ for G/Emy

**Phase 1 Total Effort:** ~20 hours

**Phase 1 Deliverables:**
- Fully functional e-commerce website
- Product catalog system
- Stripe checkout integration
- Mobile-responsive design
- Basic inventory management
- Documentation for client

**Phase 1 Known Limitations:**
- Simple homepage (no rotating themes yet)
- Basic about page (no parallax effects)
- Stripe redirects to hosted checkout (not embedded)
- Manual inventory updates initially

### Phase 2: Post-Holiday Enhancements

**Goal:** Enhanced user experience and advanced features after holiday rush

**Timeline:** January 2025 or when client is ready

**Scope:**

1. **Interactive About Page** (6 hours)
   - Parallax scrolling effects inspired by cora.computer
   - Layered elements with perspective motion
   - Enhanced storytelling through scroll interactions
   - Background animations
   - Video integration if available

2. **Themed Homepage System** (8 hours)
   - Multiple homepage themes that rotate
   - Different featured products, stories, aesthetics
   - JSON-driven theme configuration
   - Seasonal variations
   - Special collection highlights

3. **Embedded Stripe Components** (3 hours)
   - Replace redirect with embedded checkout
   - Branded payment form on site
   - Never leave the Everlastings experience
   - Custom styling to match brand

4. **Enhanced Archive System** (1 hour)
   - Automatic move to archive folder after 30 days sold
   - Optional "Sold Archive" gallery for portfolio
   - Better organization of historical pieces

5. **Additional Features** (as budgeted):
   - Blog integration with Beehiiv
   - Newsletter automation
   - Social media feed integration
   - Advanced analytics

**Phase 2 Total Effort:** ~18 hours

**Phase 2 Deliverables:**
- Interactive storytelling experience
- Branded checkout experience
- Rotating homepage themes
- Automated archive system
- Enhanced content management

### Phase 3: Future Considerations (Add-ons)

**Database Migration:**
- If product catalog grows beyond JSON management
- Headless CMS (Contentful, Sanity, etc.)
- Keep frontend, upgrade backend
- Directory structure designed for easy migration

**Advanced Automations:**
- AI-powered SEO content generation
- Automated social media posts from products
- Dynamic copywriting based on user behavior
- Email automation for abandoned carts

**Marketplace Integration:**
- Etsy integration (with caution about fees)
- Instagram Shopping
- Facebook Marketplace
- Whatnot for smaller items

**Photography & Staging:**
- Professional product photography session
- AI-assisted photo staging in lifestyle settings
- Video creation for higher conversion rates
- Behind-the-scenes content creation

---

## VI. COST ANALYSIS

### Project Costs

**Phase 1: Rush Launch**
- Estimated Effort: ~20 hours
- Complexity Factors: Tight deadline, holiday coordination, immediate launch pressure
- Portfolio Development Value: Live client work, reusable architecture, case study
- **Client Investment: $500**

**Phase 2: Post-Holiday Enhancements**
- Estimated Effort: ~18 hours  
- Complexity Factors: Creative features, interactive development, enhanced UX
- **Additional Investment: $350**

**Combined Package Alternative:**
- Both phases with comfortable timeline (no rush pressure)
- Better planning, more efficient delivery
- **Combined Investment: $400** (savings from reduced stress/coordination)

**Included in Base Investment:**
- Complete website design and development
- Stripe integration and setup
- Product catalog system with unlimited scalability
- Mobile-responsive design
- Documentation and training
- 30 days post-launch support for bug fixes
- Consultation on content strategy and photo optimization

**Not Included (Optional Add-ons):**
- Professional product photography session: $300-500
- Blog/Newsletter setup (Beehiiv): $200
- Social media integration: $150-300
- Advanced automations: $200-400
- Ongoing maintenance (optional monthly retainer): $100/month

### Ongoing Operating Costs

**Year 1:**
- Domain (Squarespace): $12/year
- Google Workspace: $72/year (if $6/month plan)
- Hosting (GitHub Pages): $0
- Stripe Processing Fees: 2.9% + $0.30 per transaction
- **Total: $84/year + transaction fees**

**Comparison to Squarespace E-commerce:**
- Squarespace Business Plan: $276/year ($36/month billed annually)
- + Transaction fees still apply
- + Limited customization
- + No CMS capabilities despite being a website builder
- + Lock-in to their ecosystem

**Our Solution Savings:** $192/year in hosting costs alone

**Growth Options (if needed):**
- Cloudflare R2 for images: ~$1-5/month
- Netlify bandwidth upgrade: $19/month
- Newsletter service: $0-30/month depending on subscribers
- Analytics tools: $0 (Google Analytics) or $10-50/month (advanced)

### Development Cost Transparency

**Internal Effort Estimate:** 38 hours total (both phases)

**Value Calculation:**
- Professional rate for senior developer/designer: $100-150/hour
- Full value: $3,800-5,700
- Client investment: $400-500 (single phase) or $850 (both phases)
- **Discount: 85-90% for portfolio development, relationship building, and supporting meaningful artisan business**

**Why This Discount:**
- Portfolio piece: Live client work showcasing our capabilities
- Product development: Creating reusable e-commerce architecture
- Relationship building: First of potentially many projects
- Mission alignment: Supporting artist with powerful story and healing message
- Learning opportunity: Refining our process for future clients

---

## VII. RISK ASSESSMENT & MITIGATION

### Technical Risks

**Risk: Repository Size Limits with Image-Heavy Site**
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:** Monitor repo size, plan Cloudflare R2 migration if needed, optimize images
- **Fallback:** Netlify or Vercel offer more storage in free tier

**Risk: Stripe Client-Only Checkout Security Concerns**
- **Likelihood:** Low
- **Impact:** Low
- **Mitigation:** Only publishable key exposed (safe by design), secret key never client-side, Stripe handles all sensitive data
- **Note:** This is industry standard approach used by major companies

**Risk: GitHub Actions Build Failures**
- **Likelihood:** Low
- **Impact:** Low
- **Mitigation:** Have working reference from 360-design, manual backup process documented
- **Recovery:** 5-minute manual fix

**Risk: JSON Data Management Becomes Unwieldy**
- **Likelihood:** Low (unlikely with artisan-scale business)
- **Impact:** Medium
- **Mitigation:** Directory structure designed for future database migration
- **Timeline:** Only relevant if catalog grows to 100+ products

### Timeline Risks

**Risk: Holiday Deadline Too Aggressive**
- **Likelihood:** Low
- **Impact:** High
- **Mitigation:** Proven architecture reduces development risk, G/Emy handle content, focus on MVP first
- **Backup:** Launch simple version Dec 16, enhance during week before Christmas

**Risk: Client Content Not Ready**
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:** Filler text shows word count needs, start with subset of products, can add more post-launch
- **Strategy:** Launch with 5-10 hero products, add more as ready

**Risk: Photo Quality Issues Reduce Conversions**
- **Likelihood:** Medium (noted issues with current photos)
- **Impact:** Medium
- **Mitigation:** Consultation included in base project, photo session optional add-on
- **Strategy:** Launch with best available, schedule professional shoot in January

### Business Risks

**Risk: Insufficient Holiday Sales to Justify Investment**
- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:** Heavy discount makes investment minimal, website remains valuable asset, can adjust marketing
- **Long-term Value:** Even modest sales cover year 1 costs, website enables future growth

**Risk: Platform Growth Requires Migration**
- **Likelihood:** Low (good problem to have)
- **Impact:** Medium
- **Mitigation:** Architecture designed for easy migration, directory structure supports future database
- **Cost:** Migration would be separate project if needed

### Operational Risks

**Risk: Client Unable to Manage Product Updates**
- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:** Comprehensive documentation, training included, G (AI PM) can handle JSON management
- **Support:** 30 days post-launch support, optional ongoing maintenance retainer

**Risk: Stripe Account Issues or Holds**
- **Likelihood:** Low
- **Impact:** High
- **Mitigation:** Proper business verification, start with small transactions, build history gradually
- **Prevention:** Follow Stripe best practices, provide clear product descriptions, maintain low dispute rate

---

## VIII. SUCCESS METRICS

### Launch Criteria (Phase 1)

**Functional Requirements:**
- [ ] All product pages render correctly with story cards and images
- [ ] Collection grid filters work properly
- [ ] Homepage displays and randomizes on reload
- [ ] Stripe checkout completes successfully
- [ ] Mobile responsive on iOS and Android
- [ ] All links functional
- [ ] Newsletter signup captures emails
- [ ] Page load time under 3 seconds

**Content Requirements:**
- [ ] Minimum 5 products with complete information
- [ ] Homepage hero content and copy
- [ ] About section with brand story
- [ ] Commissions information
- [ ] Contact information
- [ ] Shipping and returns policies

**Technical Requirements:**
- [ ] Domain properly configured
- [ ] SSL certificate active (HTTPS)
- [ ] Stripe test mode validated
- [ ] Stripe live mode enabled
- [ ] GitHub Actions building successfully
- [ ] Backup/rollback process documented

### Performance Targets

**User Experience:**
- Time to interactive: < 2 seconds
- Lighthouse performance score: > 90
- Mobile usability: 100%
- Accessibility score: > 90

**Business Metrics (Post-Launch):**
- Conversion rate: Track and optimize (target 2-5% for artisan goods)
- Average order value: Monitor and compare to in-person sales
- Cart abandonment: < 70%
- Email capture rate: > 10% of visitors

### Phase 2 Success Criteria

**Enhanced Experience:**
- [ ] Interactive about page deployed
- [ ] Themed homepage rotating properly
- [ ] Embedded checkout integrated
- [ ] User testing feedback positive
- [ ] Performance maintained (< 3 second load)

---

## IX. ROLES & RESPONSIBILITIES

### Sean August Horvath (Developer/Designer)

**Responsibilities:**
- Website architecture and development
- Stripe integration and payment setup
- Technical infrastructure (GitHub, hosting, automation)
- Design and user experience
- Performance optimization
- Documentation and training
- Post-launch technical support (30 days)

**Tools:**
- AntiGravity (primary build tool)
- Claude Code / Claude Opus (if needed for complex features)
- Local development environment
- Git/GitHub for version control

**Deliverables:**
- Complete website source code
- Product JSON schema and templates
- Stripe integration scripts
- Automated build system
- Documentation for client
- Training materials

### Emy Hoff (Artist/Owner)

**Responsibilities:**
- Product photography
- Story card copywriting (2-8 paragraphs per piece)
- Product details and specifications
- Brand direction and aesthetic choices
- Final approval on design and copy
- Stripe account completion (business verification)
- Initial product catalog (5-10 pieces minimum for launch)

**Support Available:**
- Photo quality consultation
- Copywriting guidance and templates
- Word count examples with filler text
- Content strategy recommendations

### G (Project Manager AI)

**Responsibilities:**
- Product JSON creation from Emy's content
- Copy editing and consistency
- Content organization
- Project coordination with Sean
- Post-launch: Product updates and management
- Future: Newsletter content, blog posts

**Training Needed:**
- JSON structure and format
- File naming conventions
- Git basics (optional, can email files)
- Product update workflow

---

## X. NEXT STEPS & APPROVAL

### Immediate Actions (This Week)

**Sean:**
- [ ] Present this plan to Emy and G
- [ ] Get approval on phased approach and budget
- [ ] Finalize contract and invoice
- [ ] Confirm Stripe account setup complete
- [ ] Research and select final hosting approach
- [ ] Set up development repository

**Emy/G:**
- [ ] Review and approve plan
- [ ] Select Phase 1 only or both phases
- [ ] Provide payment per contract
- [ ] Complete Stripe business verification
- [ ] Select 5-10 hero products for launch
- [ ] Begin preparing product photography and copy
- [ ] Confirm domain hosting access

### Week of Dec 9-13 (Build Week)

**Sean:**
- Day 1-2: Core templates and architecture
- Day 3: Stripe integration and testing
- Day 4: Content integration and polish
- Day 5: Testing and documentation

**Emy/G:**
- Provide product content as ready
- Review designs and provide feedback
- Test checkout flow
- Prepare any additional content

### Week of Dec 16-20 (Launch Week)

**Sean:**
- Deploy to production
- Final testing
- Monitor for issues
- Immediate bug fixes

**Emy/G:**
- Marketing preparation
- Social media announcements
- Newsletter to existing followers
- Update in-person store with website info

### Post-Launch (Dec 21+)

**Sean:**
- 30 days technical support included
- Monitor performance and analytics
- Bug fixes as needed
- Plan Phase 2 if applicable

**Emy/G:**
- Add additional products as ready
- Monitor sales and user feedback
- Build email list
- Gather testimonials

---

## APPENDICES

### A. Reference Files & Documentation

**Portfolio Architecture:**
- 360-design repository: `/Users/seanivore/Development/360-design`
- Key JavaScript files for adaptation
- Working manifest generation system
- Proven filtering and tile rendering

**Webflow Print Series Reference:**
- Good bones for product page layout
- `/Users/seanivore/Development/design-site/projects/webflow-product-page.html`
- `/Users/seanivore/Development/design-site/projects/webflow-print-series.html`
- URL: `https://design.august.style/projects/webflow-product-page`

**Inspirational Sites:**
- Interactive scrolling: `https://cora.computer/`
- SaaS landing page anatomy (provided reference image)

**Stripe Resources:**
- LLM documentation: `/Users/seanivore/Development/_resources/ai_docs/workspace-tools/STRIPE_LLM_DOCS.txt`
- Python SDK: `/Users/seanivore/Development/_resources/stripe-python`

**Photo Reference:**
- Current product photos: `/Users/seanivore/Development/everlastings-website/assets/docs/reference-pics`
- Note: Some quality issues identified (blur, saturation, numbering)

### B. Technical Specifications

**Browser Support:**
- Chrome (last 2 versions)
- Safari (last 2 versions)
- Firefox (last 2 versions)
- Edge (last 2 versions)
- Mobile Safari (iOS 14+)
- Mobile Chrome (Android 10+)

**Image Specifications:**
- Hero images: 1920×1080px minimum, optimized JPEG or WebP
- Product gallery: 1200×1200px, JPEG 85% quality
- Thumbnails: 400×400px, optimized for fast loading
- Maximum file size: 500KB per image (compressed)

**Performance Targets:**
- Time to First Byte: < 600ms
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Time to Interactive: < 3.8s

**Accessibility Standards:**
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast (4.5:1 minimum)
- Alt text for all images

### C. Glossary

**SPA (Single Page Application):** Web application that loads a single HTML page and dynamically updates content without full page reloads

**JSON (JavaScript Object Notation):** Lightweight data format for storing and exchanging data

**GitHub Pages:** Free static site hosting service from GitHub

**GitHub Actions:** Automation service that runs scripts when code changes

**Stripe Checkout Sessions API:** Service for creating hosted payment pages

**Manifest:** Index file listing all products for efficient searching and filtering

**Webhook:** Automated message sent when an event occurs (like a completed payment)

**CDN (Content Delivery Network):** Distributed servers that deliver content quickly to users worldwide

**Parallax Scrolling:** Web design effect where background images move slower than foreground

---

## DOCUMENT VERSION CONTROL

**Version 1.0** - December 7, 2024
- Initial comprehensive planning document
- Technical architecture defined
- Phased approach outlined
- Budget and timeline established

---

**Questions or Concerns?**

Contact Sean August Horvath
- Project discussion via current channel
- GitHub: `/Users/seanivore/Development/everlastings-website`

**Ready to Proceed?**

This document serves as the foundation for creating:
1. Client-facing design scope (extracted from sections I, II, III, V, VIII)
2. Detailed implementation plan (extracted from sections V, VII, IX)
3. Contract (based on section VI and terms)
4. Invoice (based on section VI pricing)

Upon approval, formal contract and invoice documents will be prepared for signature and payment.

---

*This document represents comprehensive planning for Everlastings by Emaline website project. All technical specifications, timelines, and costs are based on current information and best estimates. Adjustments may be needed based on final client requirements and content availability.*