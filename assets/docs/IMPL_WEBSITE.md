# Everlastings Website — Technical Implementation Plan

**Internal Reference Document**  
*For: Sean (development) and Emy/G (optional technical visibility)*  
*Created: December 7, 2025*

---

## Document Purpose

This is the technical companion to the Comprehensive Reference Document. It contains:

  * Hour estimates for each phase
  * Detailed task breakdowns
  * Technical dependencies
  * Development workflow
  * Quality assurance checklist
  * Cost calculations (internal)

**For Emy/G**: This document exists so you can understand the scope and effort involved if you're curious, but it's primarily for development planning. The joy and excitement should come from the Proposal and Design Scope documents - this is the "how the sausage gets made" version.

---

## Timeline Overview

### Option A: Rush Pre-Holiday Launch (Dec 16, 2025)

  * **Total estimated hours**: ~25-30 hours
  * **Timeline**: 7 development days (Dec 9-16)
  * **Intensity**: High (compressed timeline premium)
  * **Risk**: Medium (holiday coordination, less iteration time)

### Option B: Comprehensive Build (January 2026)

  * **Total estimated hours**: ~40-45 hours
  * **Timeline**: 3-4 weeks comfortable pace
  * **Intensity**: Moderate (sustainable, quality-focused)
  * **Risk**: Low (time for refinement and testing)

---

## Phase 1: Core MVP Build

### 1. Architecture Setup (3-4 hours)

  * **Tasks:**
    + Repository structure setup
    + GitHub Pages configuration
    + Cloudflare R2 CDN setup and integration
    + GitHub Actions workflow configuration
    + Environment variables and secrets management
    + Initial deployment pipeline testing

  * **Dependencies:**
    + Cloudflare account and API keys
    + GitHub repository access
    + Domain DNS configuration

  * **Deliverables:**
    + Working deployment pipeline
    + CDN image hosting functional
    + Manifest auto-generation on push

---

### 2. JSON Schema & Data Architecture (2-3 hours)

  * **Tasks:**
    + Finalize product JSON schema
    + Create validation rules
    + Document all fields with examples
    + Create template JSON file
    + Test manifest generation with sample data
    + Verify URL routing with test products

  * **Dependencies:**
    + Stripe Product Object structure review
    + Final decision on tag types
    + Homepage theme control requirements

  * **Deliverables:**
    + Complete JSON schema documentation
    + Template file for product creation
    + 2-3 example product JSONs for testing

---

### 3. Design System Implementation (3-4 hours)

  * **Tasks:**
    + CSS custom properties setup (design tokens)
    + Typography integration (system fonts + accent font)
    + Color palette implementation
    + Component base styles (buttons, cards, forms)
    + Responsive breakpoints
    + shadcn/ui component integration
    + Micro-interaction animations
    + Dark mode variables (for lighting effects)

  * **Dependencies:**
    + Final accent font selection from Emy
    + Brand color refinement if needed
    + Component library decisions confirmed

  * **Deliverables:**
    + Complete styles.css with design system
    + Reusable component styles
    + Mobile-first responsive foundation

---

### 4. Homepage Development (4-6 hours)

  **Option A (MVP)**: 3-4 hours
  * Basic hero section
  * Static featured product
  * Simple scroll layout
  * Newsletter signup
  * Contact form

  **Option B (Full)**: 6-8 hours
  * Theatrical opening animation
  * CSS-based lighting effects (depth through motion)
  * Dynamic featured product rotation
  * Seasonal theme system
  * Parallax scroll elements
  * Enhanced micro-interactions

  * **Tasks (Full version):**
    + Hero section with opening animation
    + CSS mask/spotlight lighting system
    + Scroll-linked transforms
    + Featured product tile system
    + Dynamic theme loader (from product JSON)
    + Intro block with brand essence
    + Brand pillars section
    + Newsletter CTA (prominent)
    + Footer newsletter signup
    + Performance optimization

  * **Dependencies:**
    + Featured product selections from Emy
    + Brand copy finalized
    + Logo files provided
    + Hero images optimized

  * **Deliverables:**
    + Fully responsive homepage
    + Working animations
    + Newsletter integration
    + < 3 second load time

---

### 5. Collection Grid System (3-4 hours)

  * **Tasks:**
    + Section page template
    + Product tile component
    + Tag filter system (multi-select)
    + Sort controls implementation
    + "All Products" page variant
    + Filter UI (shadcn/ui components)
    + Smart filter logic (hide single-tag filters)
    + Loading states and animations
    + Mobile-optimized grid
    + Infinite scroll or pagination

  * **Dependencies:**
    + Product JSON structure finalized
    + Tag type definitions complete
    + Filter UI design approved

  * **Deliverables:**
    + Working collection pages
    + Functional filters
    + Responsive grid layout
    + Section-specific hero images

---

### 6. Product Page Template (4-5 hours)

  * **Tasks:**
    + Two-column layout (story left, purchase right)
    + Photo gallery system (7-15 images)
    + Lighting variation display
    + Story card formatting
    + Feature list with icons
    + Product details (dimensions, materials, etc)
    + Buy Now / Add to Cart buttons
    + Breadcrumb navigation
    + Related products algorithm
    + Mobile single-column layout
    + Image zoom/lightbox
    + Video player (if applicable)

  * **Dependencies:**
    + Stripe integration complete
    + Product JSON with real content
    + Icon library selected
    + Image optimization workflow

  * **Deliverables:**
    + Beautiful product pages
    + Working checkout flow
    + Responsive design
    + SEO-optimized structure

---

### 7. Stripe Integration (3-4 hours)

  * **Tasks:**
    + Python script: Read JSON → Create Stripe Products/Prices
    + Store Stripe Price IDs in JSON
    + Checkout Session generation
    + Webhook endpoint setup
    + Webhook signature verification
    + Sold status update automation
    + Test purchase flow (sandbox)
    + Error handling and logging
    + Edge case testing

  * **Dependencies:**
    + Stripe account fully configured
    + Webhook endpoint accessible
    + Product JSONs ready
    + Shipping strategy decided

  * **Deliverables:**
    + Automated Stripe catalog sync
    + Working checkout flow
    + Webhook automation
    + Transaction logging

---

### 8. Header & Footer Components (2-3 hours)

  * **Tasks:**
    + Header with logo and navigation
    + Sticky header behavior
    + Mobile hamburger menu
    + Cart icon with badge
    + Search overlay (basic)
    + Footer four-column layout
    + Social media links
    + Newsletter signup (footer)
    + Copyright and legal links
    + Smooth scroll navigation

  * **Dependencies:**
    + Social media URLs from Emy
    + Logo files finalized
    + Navigation structure confirmed

  * **Deliverables:**
    + Responsive header/footer
    + Working navigation
    + Mobile menu functional

---

### 9. Testing & QA (3-4 hours)

  * **Tasks:**
    + Cross-browser testing (Chrome, Firefox, Safari, Edge)
    + Mobile device testing (iPhone, Android, iPad)
    + Lighthouse performance audit
    + Accessibility audit (WCAG AA)
    + Form validation testing
    + Stripe checkout testing (real purchases)
    + Webhook testing
    + Image loading optimization
    + Error state testing
    + Edge case scenarios
    + Load time optimization

  * **Deliverables:**
    + Bug-free launch
    + 90+ Lighthouse scores
    + All forms working
    + Mobile-optimized

---

### 10. Content Integration & Polish (2-3 hours)

  * **Tasks:**
    + Replace Lorem ipsum with real copy
    + Upload and optimize product photos
    + Create initial 5-10 product JSONs
    + SEO metadata for all pages
    + Favicon generation and integration
    + Social sharing meta tags
    + Google Analytics integration
    + Final design polish
    + Copy review and refinements

  * **Dependencies:**
    + All content from Emy (photos, copy, social links)
    + Brand copy finalized
    + Product details compiled

  * **Deliverables:**
    + Polished, production-ready website
    + Real content throughout
    + SEO optimized

---

### 11. Documentation & Training (2 hours)

  * **Tasks:**
    + How to add new products (step-by-step)
    + JSON schema reference guide
    + Image optimization workflow
    + Common troubleshooting
    + Google Analytics walkthrough
    + Stripe dashboard overview
    + Contact form management
    + Newsletter list management

  * **Deliverables:**
    + Comprehensive documentation
    + Video walkthrough (optional)
    + Quick reference guides

---

## Phase 2: Enhanced Features (Post-Launch)

### Phase 2A: Interactive Enhancements (6-8 hours)

  * Theatrical homepage lighting effects
  * Seasonal theme rotation system
  * Enhanced product galleries
  * Lighting demo videos integration
  * Advanced micro-interactions

### Phase 2B: Blog/Newsletter Platform (4-6 hours)

  * Beehiiv integration
  * Newsletter archive pages
  * Blog post template
  * RSS feed generation
  * Social sharing optimization

### Phase 2C: Advanced Automation (4-6 hours)

  * Google Form → JSON pipeline
  * Social media catalog sync
  * AI-powered content generation
  * Automated SEO updates
  * Enhanced webhook workflows

### Phase 2D: Marketplace Integrations (6-10 hours)

  * Instagram Shopping setup
  * Pinterest Product Pins
  * Google Shopping feed
  * Meta Business Catalog
  * Optional: Etsy sync, TikTok Shop

---

## Hour Breakdown Summary

### Option A: Rush MVP (Dec 16 Launch)

| Task | Hours |
|------|-------|
| Architecture Setup | 3 |
| JSON Schema | 2 |
| Design System | 3 |
| Homepage (Simple) | 4 |
| Collection Grid | 3 |
| Product Pages | 4 |
| Stripe Integration | 3 |
| Header/Footer | 2 |
| Testing & QA | 3 |
| Content Integration | 2 |
| Documentation | 1.5 |
| **Total** | **30.5 hours** |

### Option B: Comprehensive Build (January Launch)

| Task | Hours |
|------|-------|
| Architecture Setup | 4 |
| JSON Schema | 3 |
| Design System | 4 |
| Homepage (Full) | 8 |
| Collection Grid | 4 |
| Product Pages | 5 |
| Stripe Integration | 4 |
| Header/Footer | 3 |
| Testing & QA | 4 |
| Content Integration | 3 |
| Documentation | 2 |
| Photography Session | (Add-on) |
| **Total** | **44 hours** |

---

## Cost Calculation Framework

**Professional market rate**: $100-150/hour  
**Full value of work**:
  * Option A: 30.5 hrs × $125 = $3,812
  * Option B: 44 hrs × $125 = $5,500

**Portfolio/relationship discount**: 85-90% off

**Actual pricing** (to be determined):
  * Based on timeline choice
  * Rush premium vs comfortable pace
  * Relationship investment consideration
  * Portfolio value for Sean

---

## Development Workflow

### Week 1 (Dec 9-13 if Rush, or Jan 6-10 if Comfortable)

  * Days 1-2: Architecture, JSON schema, design system
  * Days 3-4: Homepage and collection grid
  * Day 5: Product pages start

### Week 2

  * Days 1-2: Product pages complete, Stripe integration
  * Day 3: Header/footer, navigation
  * Days 4-5: Testing, QA, refinement

### Week 3 (Comprehensive only)

  * Days 1-2: Content integration, polish
  * Days 3-4: Enhanced features, animations
  * Day 5: Final testing, documentation

### Week 4 (Comprehensive only)

  * Buffer for unexpected issues
  * Photography session coordination
  * Final launch preparations

---

## Technical Dependencies Checklist

### Required Before Development Starts

- [ ] Timeline decision (Option A or B)
- [ ] Accent font selection from Emy
- [ ] Social media URLs (Instagram, Facebook, Pinterest, TikTok)
- [ ] Logo files (SVG preferred, PNG fallback)
- [ ] Initial 5-10 product photos
- [ ] Initial 5-10 product descriptions/stories
- [ ] Cloudflare account setup (Sean handles)
- [ ] GitHub repository access confirmed
- [ ] Stripe account fully configured

### Required During Development

- [ ] Additional product content as ready
- [ ] Brand copy refinements
- [ ] Hero images for sections
- [ ] Favicon source image
- [ ] Shipping cost consultation (weight of pieces)
- [ ] Any specific feature requests

### Required Before Launch

- [ ] All product content finalized (5-10 minimum)
- [ ] Google Analytics setup
- [ ] Stripe test purchases completed
- [ ] Domain DNS pointing to hosting
- [ ] SSL certificate verified
- [ ] All social links tested
- [ ] Newsletter platform integrated
- [ ] Contact form deliverability tested

---

## Quality Assurance Standards

### Performance

  * Lighthouse Performance: 90+
  * First Contentful Paint: < 1.5s
  * Largest Contentful Paint: < 2.5s
  * Total Blocking Time: < 300ms
  * Cumulative Layout Shift: < 0.1

### Accessibility

  * WCAG 2.1 Level AA compliance
  * Keyboard navigation fully functional
  * Screen reader compatible
  * Color contrast 4.5:1 minimum
  * Alt text on all images
  * ARIA labels where needed

### Browser Support

  * Chrome (latest 2 versions)
  * Firefox (latest 2 versions)
  * Safari (latest 2 versions)
  * Edge (latest 2 versions)
  * Mobile Safari (iOS 14+)
  * Chrome Mobile (Android 10+)

### Responsive Breakpoints Tested

  * Mobile: 375px, 414px, 768px
  * Tablet: 768px, 1024px
  * Desktop: 1280px, 1440px, 1920px
  * 4K: 2560px+

---

## Risk Management

### High Risk Items

  * **Rush timeline (Option A)**: Mitigated by reducing feature scope
  * **Content delays**: Have Lorem ipsum ready, polish after launch
  * **Photo quality**: Consultation included, professional session optional
  * **Shipping costs unknown**: Flag for Emy input, flexible JSON structure

### Medium Risk Items

  * **Stripe webhook reliability**: Test thoroughly, have manual fallback
  * **CDN setup complexity**: Sean has experience, documented process
  * **Holiday coordination**: Communication plan, clear deadlines

### Low Risk Items

  * **GitHub Pages hosting**: Proven, reliable, free
  * **JSON architecture**: Battle-tested from portfolio
  * **Stripe integration**: Standard, well-documented

---

## Post-Launch Support

### Included (30 days)

  * Bug fixes
  * Content updates (reasonable)
  * Technical troubleshooting
  * Performance optimization
  * Quick questions/guidance

### Not Included (Available as Add-ons)

  * Major feature additions
  * Design overhauls
  * New page types
  * Third-party integrations beyond initial scope
  * Ongoing content management
  * Marketing campaign support

### Optional Ongoing Retainer

  * $100/month
  * Priority support
  * Monthly content updates
  * Performance monitoring
  * Proactive optimization
  * Technical consulting

---

## Success Metrics

### Launch Day

  * Website live and accessible
  * All 5-10 initial products visible
  * Checkout flow working
  * Newsletter signup functional
  * Mobile responsive
  * < 3 second load time

### First Week

  * No critical bugs reported
  * Forms delivering correctly
  * Analytics tracking events
  * Social shares working

### First Month

  * First sale through website
  * Newsletter list growing
  * Product additions smooth
  * Customer feedback positive

### First Quarter

  * 10-20 products live
  * Regular sales through site
  * SEO ranking improvements
  * Social media integration discussions
  * Phase 2 features planned

---

## Notes for Sean

  * **Communication rhythm**: Daily updates during build week, async preferred
  * **Code quality**: This is portfolio work, make it pristine
  * **Documentation**: Over-document, this becomes a product to sell
  * **Flexibility**: JSON architecture allows post-launch pivots
  * **Relationship**: Emy's trust matters, under-promise/over-deliver

## Notes for Emy/G

  * **This document is optional reading** - here if you want technical visibility
  * **Focus on the joy**: Proposal and Design Scope are your main documents
  * **Trust the process**: Architecture is proven, timeline is realistic
  * **Content is queen**: Your photos/stories make this special, not the code
  * **We've got this**: You focus on art, we handle technical execution

---

**End of Technical Implementation Plan**

*This document will be updated as development progresses and requirements evolve.*
