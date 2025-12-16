# Everlastings Website — Technical Implementation Plan

**Internal Development Reference**  
*For: Sean (development team)*  
*Updated: December 12, 2025*

---

## Document Purpose

This is the technical implementation guide for building the Everlastings by Emaline website. It contains:

- Development sessions organized by logical build order
- Hour estimates for each task
- Technical dependencies and requirements
- Quality assurance standards
- Development workflow and milestones

**Note:** Sessions are named (not numbered) for flexibility as requirements evolve.

---

## Project Overview

**Timeline:** January 6-17, 2026  
**Total Estimated Hours:** ~44 hours  
**Launch Target:** Mid-January 2026  
**Build Approach:** Comprehensive, quality-focused

---

## Development Sessions

### Foundation Setup

**Estimated Time:** 4 hours

**Tasks:**
- Repository structure setup ✓
- GitHub Pages configuration .... **directory files included but needs setup when going live**
- Cloudflare R2 CDN setup and integration .... **urgent; required step for creating JSON files** 
- GitHub Actions workflow configuration .... **we have example from portfolio project but it needs to be updated**
- Environment variables and secrets management .... **Stripe, Cloudflare...** 
- Initial deployment pipeline testing
- Verify automated manifest generation

**Dependencies:**
- Cloudflare account and API keys
- GitHub repository access
- Domain DNS configuration (if needed)

**Deliverables:**
- Working deployment pipeline
- CDN image hosting functional
- Manifest auto-generation on push
- Base project structure in place

---

### JSON Schema Design

**Estimated Time:** 3 hours

**Tasks:**
- Finalize product JSON schema with all required fields
- Define tag types and their behaviors
- Create validation rules
- Document all fields with examples and data types
- Include Stripe Product API requirements
- Add placeholder structure for Meta/Pinterest APIs
- Design for easy IDE find/replace updates (fields at bottom of objects)
- Create comprehensive template JSON file
- Test manifest generation with sample data
- Verify URL routing with test products

**Special Requirements:**
- Every image must have alt text (accessibility)
- YouTube embeds with alt text (both as arrays for 0-N items)
- Clearly mark REQUIRED vs optional fields
- Document data type formats (e.g., Stripe timestamp format)
- Structure schema so updates happen at bottom of objects

**Dependencies:**
- Stripe Product Object structure review
- Final decision on tag types
- Homepage theme control requirements

**Deliverables:**
- Complete JSON schema documentation
- Template file for product creation
- 2-3 example product JSONs for testing
- Clear field requirements guide

---

### Design System

**Estimated Time:** 4 hours

**Tasks:**
- CSS custom properties setup (design tokens)
- Color palette implementation (plum, lavender, fog, cream, gold)
- Typography integration (system fonts + accent font)
- Component base styles (buttons, cards, forms)
- Responsive breakpoints (mobile-first)
- shadcn/ui component integration
- Micro-interaction animations
- Dark mode variables (for lighting effects)
- Button and CTA styles
- Form input styles
- Card component styles
- Loading state animations

**Dependencies:**
- Final accent font selection from Emy
- Brand color refinement if needed
- Component library decisions confirmed

**Deliverables:**
- Complete styles.css with design system
- Reusable component styles
- Mobile-first responsive foundation
- Design tokens documented

---

### Homepage Development

**Estimated Time:** 8 hours

**Tasks:**
- Hero section with theatrical opening animation
- CSS-based lighting effects (depth through motion)
- CSS mask/spotlight lighting system
- Scroll-linked transforms
- Dynamic featured product rotation system
- Featured product tile component
- Dynamic theme loader (pulls from product JSON)
- Brand introduction block
- Brand pillars section
- Newsletter CTA (prominent placement)
- Footer newsletter signup
- Parallax scroll elements
- Enhanced micro-interactions
- Performance optimization
- Mobile responsiveness

**Dependencies:**
- Featured product selections from Emy
- Brand copy finalized
- Logo files provided
- Hero images optimized

**Deliverables:**
- Fully responsive homepage
- Working animations
- Newsletter integration
- < 3 second load time
- Theatrical lighting effects functional

---

### Collection Grid

**Estimated Time:** 4 hours

**Tasks:**
- Section page template
- Product tile component with hover states
- Tag filter system (multi-select dropdowns)
- Smart filter logic (hide single-tag filters)
- Sort controls implementation
- "All Products" page variant
- Filter UI using shadcn/ui components
- Loading states and animations
- Mobile-optimized grid layout
- Infinite scroll or pagination
- Section-specific hero images
- Filter state management
- URL parameter handling for filters

**Dependencies:**
- Product JSON structure finalized
- Tag type definitions complete
- Filter UI design approved

**Deliverables:**
- Working collection pages
- Functional multi-select filters
- Responsive grid layout
- Smart UI logic (dynamic filter hiding)
- Section routing functional

---

### Product Pages

**Estimated Time:** 5 hours

**Tasks:**
- Two-column layout (story left, purchase right)
- Photo gallery system (handles 7-15 images)
- Gallery navigation and thumbnails
- Lighting variation display
- Story card formatting (rich text, poetic styling)
- Feature list with icons
- Product details panel (dimensions, materials, lighting)
- Buy Now / Add to Cart buttons
- Breadcrumb navigation
- Related products algorithm
- Mobile single-column responsive layout
- Image zoom/lightbox functionality
- Video player integration (YouTube embeds)
- SEO-optimized structure
- Schema markup for products

**Dependencies:**
- Stripe integration complete
- Product JSON with real content
- Icon library selected
- Image optimization workflow

**Deliverables:**
- Beautiful product pages
- Working checkout flow
- Responsive design
- Accessible gallery
- SEO optimization

---

### Stripe Integration

**Estimated Time:** 4 hours

**Tasks:**
- Python script: Read JSON → Create Stripe Products/Prices
- Store Stripe Price IDs back in JSON files
- Checkout Session generation endpoint
- Webhook endpoint setup and routing
- Webhook signature verification
- Sold status update automation (webhook → JSON update)
- Test purchase flow in sandbox
- Error handling and logging
- Transaction monitoring
- Edge case testing (multiple purchases, failed payments, etc.)
- GitHub Actions integration for webhook deployments

**Dependencies:**
- Stripe account fully configured
- Webhook endpoint accessible and verified
- Product JSONs ready
- Shipping strategy decided

**Deliverables:**
- Automated Stripe catalog sync
- Working checkout flow
- Webhook automation functional
- Transaction logging in place
- Test purchases successful

---

### Header & Footer

**Estimated Time:** 3 hours

**Tasks:**
- Header with logo and navigation
- Sticky header behavior (scroll state)
- Mobile hamburger menu
- Cart icon with badge
- Search overlay (basic)
- Footer four-column layout
- Social media links
- Newsletter signup in footer
- Copyright and legal links
- Smooth scroll navigation
- Mobile menu animations
- Accessibility (keyboard navigation, ARIA labels)

**Dependencies:**
- Social media URLs from Emy
- Logo files finalized
- Navigation structure confirmed

**Deliverables:**
- Responsive header/footer
- Working navigation
- Mobile menu functional
- Social links integrated

---

### Testing & QA

**Estimated Time:** 4 hours

**Tasks:**
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile device testing (iPhone, Android, iPad)
- Tablet testing (landscape and portrait)
- Lighthouse performance audit (target 90+)
- Accessibility audit (WCAG AA compliance)
- Form validation testing
- Stripe checkout testing (real test purchases)
- Webhook testing (trigger sold status updates)
- Image loading and optimization verification
- Error state testing (404s, failed loads, etc.)
- Edge case scenarios
- Load time optimization
- Core Web Vitals verification
- Screen reader testing
- Keyboard navigation testing

**Quality Standards:**
- Lighthouse Performance: 90+
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Total Blocking Time: < 300ms
- Cumulative Layout Shift: < 0.1
- WCAG 2.1 Level AA compliance
- All alt text present
- Keyboard navigation functional
- Screen reader compatible

**Deliverables:**
- Bug-free launch
- 90+ Lighthouse scores across categories
- All forms working correctly
- Mobile-optimized and tested
- Accessibility verified

---

### Content Integration

**Estimated Time:** 3 hours

**Tasks:**
- Replace Lorem ipsum with real copy
- Upload and optimize product photos to CDN
- Create initial 5-10 product JSON files
- Verify JSON structure and rendering
- SEO metadata for all pages (title, description, OG tags)
- Favicon generation and integration (multiple sizes)
- Social sharing meta tags (Open Graph, Twitter Card)
- Google Analytics integration
- Final design polish pass
- Copy review and refinements
- Image alt text verification
- Test all internal links

**Dependencies:**
- All content from Emy (photos, copy, social links)
- Brand copy finalized
- Product details compiled
- Shipping weights and costs determined

**Deliverables:**
- All placeholder content replaced
- 5-10 products live and rendering correctly
- SEO optimization complete
- Analytics tracking verified
- Social sharing working

---

### Documentation

**Estimated Time:** 2 hours

**Tasks:**
- README with project overview
- Setup and deployment instructions
- JSON schema documentation (field-by-field)
- How to add new products guide
- Troubleshooting common issues
- CDN image upload process
- Webhook monitoring guide
- GitHub Actions workflow explanation
- Content guidelines reference
- Video walkthrough (optional)
- Quick reference guides

**Deliverables:**
- Comprehensive README
- JSON template with examples
- Step-by-step guides
- Technical documentation
- Client-facing guides

---

## Hour Breakdown Summary

| Session               | Hours |
|-----------------------|-------|
| Foundation Setup      | 4     |
| JSON Schema Design    | 3     |
| Design System         | 4     |
| Homepage Development  | 8     |
| Collection Grid       | 4     |
| Product Pages         | 5     |
| Stripe Integration    | 4     |
| Header & Footer       | 3     |
| Testing & QA          | 4     |
| Content Integration   | 3     |
| Documentation         | 2     |
| **Total**             | **44**|

---

## Technical Architecture

### Core Technologies

**Frontend:**
- HTML5, CSS3, JavaScript (vanilla)
- CSS custom properties for theming
- Dynamic SPA with client-side routing
- Mobile-first responsive design

**Backend/Build:**
- Python for Stripe sync and manifest generation
- GitHub Actions for CI/CD
- JSON-based data store

**Hosting:**
- GitHub Pages (static site hosting)
- Cloudflare R2 (CDN for images)
- Custom domain with SSL

**Integrations:**
- Stripe Checkout Sessions API
- Stripe Webhooks for inventory updates
- Google Analytics
- Newsletter platform (TBD)

### JSON Product Schema Structure

```json
{
  "title": "Product Name",
  "slug": "product-name",
  "story": "Poetic story card (2-8 paragraphs)",
  "price": 1500,
  "currency": "USD",
  "stripe_price_id": "price_xxx",
  "stripe_product_id": "prod_xxx",
  "images": [
    {
      "url": "https://cdn.example.com/image1.jpg",
      "alt": "Descriptive alt text"
    }
  ],
  "youtube_embeds": [
    {
      "video_id": "xxxxx",
      "title": "Lighting demo video"
    }
  ],
  "features": ["Feature 1", "Feature 2"],
  "dimensions": {
    "height": "8 inches",
    "width": "6 inches",
    "depth": "4 inches"
  },
  "materials": ["Material 1", "Material 2"],
  "lighting": {
    "type": "LED",
    "modes": ["Warm glow", "Flickering candle"],
    "power_source": "USB (adapter included)"
  },
  "tags": {
    "section": ["Portals to Peace"],
    "category": ["Winter", "Magical"],
    "product_type": ["Lighted"],
    "availability": ["available"]
  },
  "featured": true,
  "created_at": 1702857600,
  "updated_at": 1702857600
}
```

**Note:** Full schema will be finalized in JSON Schema Design session.

---

## Technical Dependencies Checklist

### Required Before Development Starts

- [ ] Timeline confirmed (January launch)
- [ ] Accent font selection from Emy
- [ ] Social media URLs
- [ ] Logo files (SVG preferred, PNG fallback)
- [ ] Initial product photos (5-10 products)
- [ ] Initial product descriptions/stories
- [ ] Cloudflare account setup
- [ ] GitHub repository access
- [ ] Stripe account configured

### Required During Development

- [ ] Additional product content as ready
- [ ] Brand copy refinements
- [ ] Hero images for sections
- [ ] Favicon source image
- [ ] Shipping cost consultation
- [ ] Feature requests or adjustments

### Required Before Launch

- [ ] All product content finalized (5-10 minimum)
- [ ] Google Analytics setup
- [ ] Stripe test purchases completed
- [ ] Domain DNS verified
- [ ] SSL certificate active
- [ ] Social links tested
- [ ] Newsletter platform integrated
- [ ] Contact form deliverability tested

---

## Development Workflow

### Week 1: January 6-10, 2026

**Days 1-2:**
- Foundation setup (GitHub, CDN, deployment)
- JSON schema finalized
- Design system implemented

**Days 3-4:**
- Homepage development
- Collection grid started

**Day 5:**
- Collection grid completed
- Product pages started

### Week 2: January 13-17, 2026

**Days 1-2:**
- Product pages completed
- Stripe integration

**Day 3:**
- Header/footer components
- Navigation

**Days 4-5:**
- Testing and QA
- Content integration
- Final polish

**Launch:** Mid-January 2026

---

## Automation Architecture

### GitHub Actions Workflows

**On Push to Main:**
1. Scan `/assets/products/` for JSON files
2. Generate `manifest.json` with all products
3. Deploy to GitHub Pages
4. Purge CDN cache

**On Product Sale (Webhook):**
1. Receive Stripe webhook
2. Verify signature
3. Update product JSON availability to "sold"
4. Commit and push changes
5. Triggers automatic redeploy

### Stripe Sync Script

**Function:** `sync_products_to_stripe.py`

**Process:**
1. Read all product JSON files
2. For each product without `stripe_price_id`:
   - Create Product in Stripe
   - Create Price in Stripe
   - Store IDs back in JSON
3. Log all operations
4. Handle errors gracefully

---

## File Structure

```
everlastings-website/
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── main.js
│   │   ├── router.js
│   │   ├── filters.js
│   │   └── manifest.json (auto-generated)
│   ├── products/
│   │   ├── product-1.json
│   │   ├── product-2.json
│   │   └── ...
│   ├── media/
│   │   └── (CDN-hosted via Cloudflare R2)
│   └── favicon/
│       ├── favicon.ico
│       ├── favicon-16x16.png
│       ├── favicon-32x32.png
│       └── apple-touch-icon.png
├── scripts/
│   ├── generate_manifest.py
│   ├── sync_products_to_stripe.py
│   └── optimize_images.py
├── .github/
│   └── workflows/
│       ├── deploy.yml
│       └── webhook.yml
├── index.html
├── README.md
├── CNAME
└── _config.yml
```

---

## Risk Management

### Potential Challenges

**Content Delays:**
- **Mitigation:** Use Lorem ipsum and placeholder images, polish after launch
- **Backup:** Launch with 5 products minimum, add more post-launch

**Photo Quality:**
- **Mitigation:** Consultation included in build
- **Backup:** Professional photography session available as add-on

**Shipping Costs Unknown:**
- **Mitigation:** Flag for Emy input early, JSON structure is flexible
- **Backup:** Use estimated shipping, refine post-launch

**Stripe Webhook Reliability:**
- **Mitigation:** Test thoroughly in sandbox
- **Backup:** Manual inventory management process documented

---

## Post-Launch Support

### Included (30 Days)

- Bug fixes
- Content updates (reasonable scope)
- Technical troubleshooting
- Performance optimization
- Quick questions and guidance

### Not Included (Available as Add-Ons)

- Major feature additions
- Design overhauls
- New page types
- Third-party integrations beyond initial scope
- Ongoing content management
- Marketing campaign support

### Optional Ongoing Retainer

**$100/month includes:**
- Priority support
- Monthly content updates
- Performance monitoring
- Proactive optimization
- Technical consulting

---

## Success Metrics

### Launch Day

✓ Website live and accessible  
✓ All 5-10 products visible and rendering  
✓ Checkout flow working  
✓ Newsletter signup functional  
✓ Mobile responsive across devices  
✓ < 3 second load time  
✓ Lighthouse score 90+

### First Week

✓ No critical bugs reported  
✓ Forms delivering correctly  
✓ Analytics tracking events  
✓ Social shares working  
✓ Product pages loading properly

### First Month

✓ First sale through website  
✓ Newsletter list growing  
✓ Product additions smooth  
✓ Customer feedback positive  
✓ No major technical issues

---

## Notes for Development Team

**Code Quality:**
- This is portfolio work — make it pristine
- Over-document everything
- This architecture becomes a reusable product

**Communication:**
- Daily updates during build week
- Async preferred, real-time for blockers
- Clear commit messages
- Document decisions in code comments

**Flexibility:**
- JSON architecture allows post-launch pivots
- Build for scalability (10 products or 1000)
- Future-proof for database migration

**Relationship:**
- Under-promise, over-deliver
- Emy's trust matters
- This builds long-term partnership

---

**End of Technical Implementation Plan**

*This document will be updated as development progresses and requirements evolve.*

*Last updated: December 12, 2025*
