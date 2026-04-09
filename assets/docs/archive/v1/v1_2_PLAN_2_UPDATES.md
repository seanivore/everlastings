# v1.2 Revision — Post-Review Documentation Updates

## Context

Sean reviewed all v1.2 planning documents and identified 10 areas needing attention. The v1.2 docs (IMPLEMENTATION, ACTION_STEPS, BRAND, STORE, PRODUCT_GUIDE) were committed in the previous session. This plan covers the documentation revisions needed before implementation begins.

Key themes: parallel build tracks for design iteration, customer data gaps, environment strategy for Stripe test/live, AI-assisted product creation workflow, and several missing features from v0 planning docs.

---

## 10 Change Areas

1. **Parallel Build Tracks** — restructure 10 sequential sessions into parallel frontend/backend tracks
2. **Customer Data Flow** — add `customers` table, capture name/phone from checkout
3. **Stripe Environment Strategy** — test/live key management via Vercel environments + branching
4. **AI-Assisted Product Creation** — protocol doc + API endpoints + Cloudinary transform pipeline
5. **Video/GIF Media Support** — extend schema, CDN conventions, frontend rendering
6. **Image Naming & Cloudinary Pipeline** — SEO-friendly filenames, Cloudinary as transform layer
7. **Analytics Setup** — move GA4 earlier, detail custom events, Search Console
8. **Git Branching Strategy** — detailed branching tied to environments
9. **Table Formatting** — reformat overflowing tables in PRODUCT_GUIDE.md and Error States Reference
10. **Gaps Review** — items from v0 docs not yet covered (lightbox, related products, loading states, email notifications)

---

## Detailed Changes

### 1. Parallel Build Tracks

**Problem**: Current 10-session plan is sequential — can't iterate on visual design until backend is connected. Client needs to see and approve designs before data flows work.

**Solution**: Restructure into 3 parallel tracks:

**Track A: Foundation + Backend** (API-focused, testable with curl)
- A1: Services setup (Supabase, Stripe, R2, Vercel, env vars, analytics base)
- A2: API endpoints (stripe-sync, checkout, webhook, session-status, cart-recovery, upload, products, subscribe, contact)
- A3: Admin UI + AI product creation protocol
- A4: Integration testing of all API flows

**Track B: Frontend Design** (pure HTML/CSS, lorem ipsum + placeholder images)
- B1: Design system (CSS tokens, component styles, all breakpoints)
- B2: Header, Footer, Nav (shared layout components — applies to all pages)
- B3: Product page (hardcoded placeholder product — story, gallery, sticky card)
- B4: Shop grid (hardcoded 6-8 placeholder tiles with filters UI)
- B5: Homepage (hero, intro, featured carousel, brand pillars — all hardcoded)
- B6: Remaining pages (about, contact, FAQ, shipping, terms, privacy, policies)

**Track C: Integration** (wire B pages to A backend)
- C1: `main.js` Supabase client + cart functions + all pages fetch real data
- C2: Checkout flow end-to-end (cart → checkout → payment → webhook → confirmation)
- C3: SEO finalization (meta tags, schema.org, sitemap, robots.txt)
- C4: Cross-browser testing, Lighthouse, WCAG AA, launch prep

**Key benefits**:
- Client (Emy) reviews Track B visual designs immediately — no backend needed
- Sean/AI can iterate on design while backend is built separately
- Placeholder pages show Emy what content she still needs to provide
- Track B is pure HTML/CSS — fast iteration, no API debugging
- Track A is testable independently with curl/Postman

**Dependencies**: A1 must finish before A2. B1 must finish before B2-B6. Track C requires A2 + B3 minimum.

**Track B placeholder data approach**: Create a `_placeholder/` directory (gitignored) with a sample product JSON and 7 placeholder images. Each frontend page loads from hardcoded HTML first, then we swap to dynamic JS in Track C.

### 2. Customer Data Flow

**Problem**: Current webhook captures only `customer_email` and `shipping_address` (raw jsonb). No customers table. No name or phone. Can't correlate orders to returning customers or send personalized emails.

**Solution**: Add `customers` table to Supabase schema.

**New table SQL**:
```sql
CREATE TABLE customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  phone text,
  shipping_address jsonb,
  stripe_customer_id text,
  source text DEFAULT 'checkout',  -- 'checkout', 'newsletter', 'cart-recovery'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Updated orders table**: Add `customer_id uuid REFERENCES customers(id)` FK.

**Updated webhook flow**:
1. Extract `session.customer_details` (email, name, phone) + `session.shipping_details`
2. Upsert customer: `INSERT INTO customers ... ON CONFLICT (email) DO UPDATE SET name, phone, shipping_address, updated_at`
3. Create order records with `customer_id` FK
4. If customer email matches a subscriber, update subscriber record with source

**Updated checkout session**: Add `phone_number_collection: { enabled: true }` to collect phone at checkout.

**Locked Decision #14**: Customers table is upsert-on-checkout. No pre-checkout account creation. Email is the unique key. Newsletter subscribers get linked to customer records if they later purchase.

**Files to update**: 
- `v1_2_IMPLEMENTATION.md` — SQL schema, webhook.ts code, checkout.ts session params
- `EVERLASTINGS_STORE.md` — add customers table to schema section, update data flow diagram
- `v1_2_ACTION_STEPS.md` — add customer table creation to Track A1

### 3. Stripe Environment Strategy

**Problem**: No strategy for switching between test and live Stripe keys. Need to test during development and switch cleanly for launch.

**Solution**: Vercel's native environment variable scoping.

**How it works**:
- Vercel Dashboard → Settings → Environment Variables
- Each env var can be scoped to: **Production**, **Preview**, or **Development**
- `STRIPE_SECRET_KEY`: set `sk_test_...` for Preview+Development, `sk_live_...` for Production
- `STRIPE_PUBLISHABLE_KEY`: set `pk_test_...` for Preview+Development, `pk_live_...` for Production  
- `STRIPE_WEBHOOK_SECRET`: separate signing secrets for test vs live webhooks

**Branch → Environment mapping**:
- `main` branch → Production deployment → live Stripe keys
- `dev` branch → Preview deployment → test Stripe keys → `*.vercel.app` preview URL
- `feat/*` branches → Preview deployment → test Stripe keys → `*.vercel.app` preview URL

**Frontend key handling**: `STRIPE_PUBLISHABLE_KEY` is hardcoded in `checkout.html`. Two approaches:
- **Option A (simple)**: Use a `<script>` block that reads from a meta tag, and have `vercel.json` inject it via headers — but Vercel doesn't support this for static HTML
- **Option B (recommended)**: Create `api/config.ts` that returns `{ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY }`. Frontend fetches this on checkout page load. This way the correct key (test or live) is served automatically based on environment.

**Switchover process** (documented step-by-step):
1. All development on `dev` branch with test keys (auto-configured)
2. Test full purchase flow on preview URL with Stripe test card `4242...`
3. When ready: set live keys for Production scope in Vercel Dashboard
4. Create live webhook endpoint in Stripe Dashboard → production URL
5. Set live `STRIPE_WEBHOOK_SECRET` for Production scope
6. Merge `dev` → `main` → production deploys with live keys
7. Test one real transaction (refund after)

**Future changes**: Same process — work on `dev`, test on preview URL (test keys), merge to `main` (live keys).

**Locked Decision #15**: Frontend Stripe publishable key served via `api/config.ts` endpoint (not hardcoded). This enables automatic test/live switching per environment.

**New env var**: Add `CLOUDINARY_URL` for image processing pipeline (see section 6).

**Files to update**:
- `v1_2_IMPLEMENTATION.md` — .env.example, new `api/config.ts`, update `checkout.js` to fetch key, add switchover guide
- `EVERLASTINGS_STORE.md` — add environment strategy section
- `v1_2_ACTION_STEPS.md` — add env setup steps per environment
- `README.md` — note environment strategy

### 4. AI-Assisted Product Creation

**Problem**: Admin UI is fine for manual edits but Emy will primarily work through her AI assistant (ChatGPT). Need a frictionless AI-coordinated workflow: client describes product → AI handles images, database entry, Stripe sync → client gets permalink to review.

**Reference**: 360-design project has a proven pattern at `/Users/seanivore/Development/360-design/assets/docs/ENTRY_SOP.md` — Python scripts + Cloudinary transforms + R2 upload + JSON validation. Adapt for Everlastings (Supabase instead of JSON files).

**Solution**: Two new API endpoints + protocol document.

**New endpoint: `api/products.ts`** (authenticated, service-key only)
- `POST /api/products` — create product in Supabase (triggers DB webhook → Stripe sync)
- `PUT /api/products?id=xxx` — update product in Supabase (if price changed: archive old Stripe Price, create new)
- `GET /api/products?slug=xxx` — get product by slug (public, uses anon key)
- Auth: requires `Authorization: Bearer {SUPABASE_SERVICE_KEY}` header for POST/PUT

**Updated endpoint: `api/upload.ts`** (already planned in Session 9)
- Accepts image file + product slug + image role (hero, gallery-01, thumbnail, etc.)
- Sends to Cloudinary for transform (crop to 4:5, convert WebP, compress)
- Downloads transformed image from Cloudinary
- Uploads to R2 at `/products/{slug}/{role}.webp`
- Deletes from Cloudinary (stay on free tier)
- Returns CDN URL

**New document: `assets/docs/PRODUCT_CREATION_PROTOCOL.md`**
Client-facing protocol for AI assistants. Structure:
1. What information to gather from client (all product fields from PRODUCT_GUIDE.md)
2. Image processing steps (source → Cloudinary → R2 → CDN URLs)
3. API call to create product (with all fields + image URLs)
4. Verification steps (check permalink, check Stripe Dashboard)
5. How to edit a product (update Supabase; if price changed, explain archive + recreate flow)
6. How to mark as sold manually

**AI workflow** (what ChatGPT/Claude would execute):
```
1. Gather product details from Emy
2. Source images from Google Drive shared folder (or client upload)
3. For each image:
   a. curl POST to Cloudinary upload API
   b. curl GET transformed image URL (c_fill,ar_4:5,f_webp,q_auto)
   c. curl POST to /api/upload with transformed image + slug + role
   d. curl POST to Cloudinary destroy API
4. curl POST to /api/products with all fields + CDN URLs
5. Return permalink: everlastingsbyemaline.com/product/{slug}
6. Client reviews live page immediately
```

**Google Drive integration**: For v1, manual download from shared Drive folder. Post-launch enhancement: Google Drive API for direct pull (requires OAuth). Note this as future work.

**Cloudinary credentials**: Add `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME` to .env (same format as 360-design).

**Files to update**:
- `v1_2_IMPLEMENTATION.md` — add `api/products.ts` code, update `api/upload.ts` with Cloudinary pipeline, add protocol overview
- `v1_2_ACTION_STEPS.md` — add protocol doc creation to Track A3
- `EVERLASTINGS_STORE.md` — add `api/products.ts` to API diagram, add Cloudinary to tech stack
- Create `assets/docs/PRODUCT_CREATION_PROTOCOL.md` — new file

### 5. Video/GIF Media Support

**Problem**: Product schema has single `video_url` field. Need support for multiple videos, GIFs, and auto-formatted embeds.

**Solution**: Replace `video_url` with `media` jsonb array.

**Updated schema field**:
```typescript
media: { type: 'video' | 'gif' | 'youtube'; url: string; caption?: string }[] | null;
```

**SQL**: `media jsonb DEFAULT '[]'::jsonb` (replaces `video_url text`)

**CDN naming convention**:
```
/products/{slug}/video-01.mp4
/products/{slug}/video-02.mp4
/products/{slug}/detail-01.gif
```

**Frontend rendering** (in `product.js`):
- `type: 'video'` → `<video>` tag with controls, poster frame from first gallery image
- `type: 'gif'` → `<img>` tag with `loading="lazy"`
- `type: 'youtube'` → `<iframe>` with privacy-enhanced embed URL (youtube-nocookie.com), lazy loaded

**Where they appear**: Product page gallery section, interleaved with photos. Videos/GIFs uploaded to R2 via same `/api/upload` endpoint (skip Cloudinary transform for video/GIF — just upload direct to R2).

**Files to update**:
- `v1_2_IMPLEMENTATION.md` — schema change, product.js rendering code
- `EVERLASTINGS_STORE.md` — schema update
- `PRODUCT_GUIDE.md` — add video/GIF section for client
- `PRODUCT_CREATION_PROTOCOL.md` — include video/GIF upload steps

### 6. Image Naming & Cloudinary Pipeline

**Problem**: Generic filenames (`hero.webp`, `gallery-01.webp`) miss SEO value. No documented transform pipeline.

**Solution**: Include slug in filenames for SEO.

**Updated naming convention**:
```
/products/{slug}/hero-{slug}.webp           (main product image)
/products/{slug}/gallery-{slug}-01.webp     (gallery images)
/products/{slug}/thumbnail-{slug}.webp      (grid thumbnail)
/products/{slug}/video-{slug}-01.mp4        (videos)
/products/{slug}/detail-{slug}-01.gif       (GIFs)
```

**Cloudinary transform parameters** (for product photos):
```
c_fill,ar_4:5,w_1200,f_webp,q_auto,g_auto
```
- `c_fill` — crop to fill
- `ar_4:5` — 4:5 aspect ratio
- `w_1200` — 1200px wide (serves 2x for 600px display)
- `f_webp` — WebP format
- `q_auto` — auto quality
- `g_auto` — auto gravity (smart crop focus)

**Thumbnail variant**: `c_fill,ar_4:5,w_600,f_webp,q_auto,g_auto` (smaller for grid)

**Pipeline** (documented in IMPLEMENTATION + PROTOCOL):
1. Upload raw image to Cloudinary via Upload API
2. Construct transform URL with params above
3. Download transformed image
4. Upload to R2 with SEO-friendly filename
5. Delete from Cloudinary
6. Store CDN URL in product record

**Files to update**:
- `v1_2_IMPLEMENTATION.md` — image standards section, upload.ts code
- `BRAND.md` — photography standards naming convention
- `PRODUCT_CREATION_PROTOCOL.md` — transform steps

### 7. Analytics Setup

**Problem**: GA4 is Session 10 only (launch prep). Should be set up earlier so we can track during testing. Also need more detail on custom events.

**Solution**: Move GA4 script tag installation to Track A1 (Foundation). Add custom events in relevant Track C sessions.

**Track A1 — Foundation**:
- Create GA4 property
- Add `gtag.js` snippet to all HTML pages (via header component)
- Verify page_view events fire

**Track C — Integration** (add events as features are wired):
- `product_view` — fires on product page load with `{ slug, title, price }`
- `add_to_cart` — fires when item added to cart with `{ slug, title, price }`
- `begin_checkout` — fires when checkout page loads with `{ cart_value, item_count }`
- `purchase` — fires on completion page with `{ transaction_id, value, items }`
- `newsletter_signup` — fires on successful subscribe

**Google Search Console**:
- Verify domain ownership (TXT record or HTML file) in Track A1
- Submit sitemap after Track C3

**Locked Decision #16**: GA4 via `gtag.js` CDN script. No Google Tag Manager (overkill for this site). Custom events use `gtag('event', ...)` calls directly in page JS.

**Files to update**:
- `v1_2_IMPLEMENTATION.md` — add GA4 setup to Track A1, event code to Track C, remove from Session 10
- `v1_2_ACTION_STEPS.md` — move analytics checkboxes to appropriate tracks
- `EVERLASTINGS_STORE.md` — add analytics to tech stack section

### 8. Git Branching Strategy

**Problem**: DEV_RULES.md has basic branching rules but they're not tied to Stripe environments or documented for this project specifically.

**Solution**: Project-specific branching guide tied to Vercel environments.

**Branch structure**:
```
main (production)
  ↑ merge via PR only
dev (integration/staging)
  ↑ merge feature branches
feat/product-page (feature work)
feat/checkout-flow
fix/webhook-signature
```

**Branch → Environment → Stripe mapping**:
| Branch | Vercel Environment | Stripe Keys | URL |
|--------|-------------------|-------------|-----|
| `main` | Production | Live (`sk_live_`, `pk_live_`) | everlastingsbyemaline.com |
| `dev` | Preview | Test (`sk_test_`, `pk_test_`) | everlastings-dev-*.vercel.app |
| `feat/*` | Preview | Test | everlastings-feat-*.vercel.app |

**Rules**:
1. Never push directly to `main` — always merge from `dev` via PR
2. `dev` is the integration branch — all feature branches merge here first
3. Test full purchase flow on `dev` preview URL before merging to `main`
4. Stripe test webhook endpoint → `dev` preview URL
5. Stripe live webhook endpoint → production URL
6. Both webhook endpoints configured in Stripe Dashboard simultaneously

**Future development workflow**:
1. Create `feat/my-change` from `dev`
2. Push → Vercel creates preview deployment with test Stripe keys
3. Test on preview URL
4. Merge to `dev` → integration preview with test keys
5. Verify on `dev` preview
6. Merge `dev` → `main` → production with live keys

**Files to update**:
- `v1_2_IMPLEMENTATION.md` — add branching section before Track A1
- `v1_2_ACTION_STEPS.md` — add branch setup steps to pre-flight
- `EVERLASTINGS_STORE.md` — add branching strategy section
- `README.md` — add brief branching note

### 9. Table Formatting

**Problem**: Wide markdown tables in PRODUCT_GUIDE.md and Error States Reference overflow and are unreadable in many viewers (as shown in `assets/docs/archive/IMAGES/markdown-chart-not-wrapped.jpg`).

**Solution**: Convert problematic wide tables to heading + bullet list format.

**Before** (overflows):
```markdown
| Page | Failure | User Sees | Code Behavior |
| Product | Product not found | "This haven could not be found." | getProductBySlug returns null → showError() |
```

**After** (readable at any width):
```markdown
#### Product — Not Found
- **User sees**: "This haven could not be found." + link to shop
- **Code**: `getProductBySlug()` returns null → `showError()`
```

**Tables to reformat**:
- Error States Reference in `v1_2_IMPLEMENTATION.md` (the widest, most problematic)
- Field explanation tables in `PRODUCT_GUIDE.md` (the "What You Write" and "What You Choose" tables)

**Tables to keep as-is** (narrow enough):
- Locked Decisions table
- Color palette tables in BRAND.md
- Simple 2-column tables

### 10. Gaps Review — Items from v0 Not Yet in v1.2

Compared v0 `IMPL_WEBSITE.md` against v1.2 docs. Items either missing or underspecified:

**Add to v1.2**:
- **Image lightbox/zoom** — v0 mentions lightbox, v1.2 has `--z-lightbox` CSS token but no implementation. Add: lightbox opens on gallery image click, shows full-res, keyboard nav (left/right/escape). Implement in Track B3 (product page).
- **Related products** — v0 product page includes "related products algorithm." Add: below product story, show 3-4 products from same series. Implement in Track C1 (when data is connected).
- **Loading states** — v0 mentions loading animations. Add: skeleton screens for product page and shop grid while Supabase fetches. Implement in Track B design system.
- **Order confirmation email** — not in any version. Stripe automatically sends receipt emails (enabled in Dashboard → Settings → Emails). Document this — no custom email system needed for v1.
- **Icon library** — v0 references icons for features list. Decision: use simple SVG icons inline (no library). Document 5-6 needed icons (dimensions, lighting, materials, care, shipping, power).

**Explicitly deferred (note in docs)**:
- **Dark mode** — v0 mentioned dark mode variables. Not needed for v1 launch.
- **Infinite scroll/pagination** — small catalog (<50 products), standard grid is fine.
- **Section-specific hero images** — shop page hero. Defer to post-launch.
- **Dynamic shipping rates** — v0 has `IMPL_STRIPE_DYNAMIC_SHIPPING.md` for `ui_mode: embedded`. Doesn't apply to our `ui_mode: 'custom'`. For v1: flat-rate or shipping-included pricing. Dynamic rates are a post-launch enhancement.
- **Google Drive API integration** — for AI product creation. v1 uses manual download from shared folder.
- **Abandoned cart emails** — requires email service (Resend, SendGrid). Note as post-launch.

---

## Files to Modify

| File | Changes |
|------|---------|
| `assets/docs/archive/v1/v1_2_IMPLEMENTATION.md` | Parallel tracks, customers table, env strategy, api/products.ts, api/config.ts, Cloudinary pipeline, analytics, branching, table reformatting, lightbox, related products, loading states, icons |
| `assets/docs/archive/v1/v1_2_ACTION_STEPS.md` | Restructure into Track A/B/C, add all new items |
| `assets/docs/EVERLASTINGS_STORE.md` | Customers table, env strategy, api/products.ts, api/config.ts, Cloudinary in tech stack, branching, analytics, media schema |
| `assets/docs/PRODUCT_GUIDE.md` | Reformat tables, add video/GIF section, update image naming |
| `assets/docs/BRAND.md` | Update image naming convention |
| `README.md` | Branching note, environment strategy note |
| **NEW**: `assets/docs/PRODUCT_CREATION_PROTOCOL.md` | AI-assisted product creation protocol |

---

## Execution Order

1. **Schema changes first** — customers table SQL, media field, api/products.ts, api/config.ts (these cascade into many files)
2. **v1_2_IMPLEMENTATION.md** — largest file, most changes. Restructure into Track A/B/C. Add all new code snippets and sections.
3. **v1_2_ACTION_STEPS.md** — rebuild from scratch to match new track structure
4. **EVERLASTINGS_STORE.md** — update architecture to reflect all new decisions
5. **PRODUCT_CREATION_PROTOCOL.md** — new file, adapted from 360-design ENTRY_SOP
6. **PRODUCT_GUIDE.md** — reformat tables, add media section
7. **BRAND.md** — update naming convention
8. **README.md** — minor updates
9. **Self-review** — cross-reference all docs for consistency
10. **Fresh agent review** — independent verification

---

## New Locked Decisions (adding to existing 13)

| # | Decision | Rationale |
|---|----------|-----------|
| 14 | **Customers table with upsert-on-checkout** | Email as unique key. No pre-checkout accounts. Newsletter subscribers linked on purchase. |
| 15 | **Frontend Stripe key via `api/config.ts`** | Enables automatic test/live switching per Vercel environment. Not hardcoded. |
| 16 | **GA4 via `gtag.js` CDN, no GTM** | Simple, no-build-step analytics. Custom events via `gtag('event', ...)`. |
| 17 | **Cloudinary as stateless transform layer** | Proven in 360-design. Upload → transform → download → R2 → delete. Stay on free tier. |
| 18 | **AI product creation via API endpoints** | `POST /api/products` + `POST /api/upload` enable any AI assistant to create products programmatically. |
| 19 | **Order confirmation via Stripe Dashboard emails** | No custom email system for v1. Stripe sends receipts natively. |

---

## Verification

After all documents are updated:
1. Track A/B/C structure is clear — a developer can work on Track B without any backend
2. Customer data flows end-to-end: checkout → webhook → customers table → orders table
3. Stripe test/live switching is documented step-by-step with no ambiguity
4. AI product creation protocol is complete enough for ChatGPT to follow without additional context
5. Video/GIF support is in schema, naming convention, upload pipeline, and frontend rendering
6. GA4 events are documented for every user-facing action
7. No wide tables remain that overflow in standard markdown viewers
8. All items from v0 IMPL_WEBSITE.md are either included or explicitly deferred with rationale
9. All 19 locked decisions are consistent across IMPLEMENTATION, STORE, and ACTION_STEPS
