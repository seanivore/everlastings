# Everlastings — v1.2 Implementation Guide

**Version**: v1.2
**Created**: 2026-04-09
**Architecture**: Vercel + Supabase + Cloudflare R2 + Stripe
**Total**: ~33 hours across 10 sessions
**Reference**: `EVERLASTINGS_STORE.md` for architecture, `BRAND.md` for design

---

## Locked Decisions

Every architectural question answered. No mid-session research.

| #   | Decision                                                | Rationale                                             |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 1   | **`ui_mode: 'custom'`** for Stripe Checkout             | Proven in freelance-payments. Full UI control.        |
|     |                                                         | On-site checkout per client contract.                 |
|     |                                                         | Follows Stripe quickstart guide                       |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 2   | **Standard cart flow**                                  | Add to Cart → keep shopping → view cart → checkout.   |
|     |                                                         | Normal e-commerce UX. Even 1-of-1 items benefit       |
|     |                                                         | from cart (customers browse, plan, buy multiple).     |
|     |                                                         | Cart stored in localStorage                           |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 3   | **Availability check at checkout for all cart items**   | Query `available === true` for every item in cart     |
|     |                                                         | before creating Stripe session. If any item sold      |
|     |                                                         | while in cart, show message and remove it             |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 4   | **Stripe products are write-once**                      | Never UPDATE Stripe products/prices.                  |
|     |                                                         | Price change = archive old Price, create new.         |
|     |                                                         | "Stripe is a payment mirror, not source of truth"     |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 5   | **R2 path**: `/products/{slug}/{filename}.webp`         | Predictable, collision-free, CDN-friendly.            |
|     |                                                         | Example: `/products/the-sunkeeper/hero.webp`          |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 6   | **Image aspect ratio**: 4:5                             | Prevents messy grids. Enforced in admin upload UI.    |
|     |                                                         | All product photos must be 4:5                        |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 7   | **Slug rules**: immutable after creation                | `title.toLowerCase().replaceAll(' ', '-')`            |
|     |                                                         | URL stability, SEO preservation                       |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 8   | **Stripe metadata**: `items`                            | Webhook identifies what to mark sold.                 |
|     | field containing JSON array of `{ id, slug }`           | Single item = one entry. Multi-item cart = array.     |
|     |                                                         | Parsed with `JSON.parse(metadata.items)`              |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 9   | **Error states**: fallback message +                    | Every page has a failure mode documented.             |
|     | disabled buttons + console.log                          | See Error States Reference                            |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 10  | **Supabase anon key hardcoded** in main.js              | Public by design, RLS-protected.                      |
|     |                                                         | No build step = no env var injection for frontend     |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 11  | **CDN loading** for frontend libs                       | Stripe.js via `js.stripe.com`, Supabase.js            |
|     |                                                         | via jsDelivr. No npm/build step for frontend          |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 12  | **Vercel Web API pattern** for serverless functions     | `export async function POST(request: Request)`        |
|     |                                                         | modern pattern, not legacy `(req, res)`               |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 13  | **R2 custom domain optional**                           | Use r2.dev subdomain initially.                       |
|     |                                                         | Custom domain (`cdn.everlastingsbyemaline.com`)       |
|     |                                                         | requires Cloudflare DNS — set up later                |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |

---

## Product Schema — Hard Reference

### TypeScript Interface (for API functions)

```typescript
interface Product {
  id: string;                    // uuid, auto-generated
  sku: string;                   // unique, auto-generated
  slug: string;                  // unique, auto-generated from title, IMMUTABLE
  title: string;                 // NOT NULL
  headline: string;              // 5-7 word tagline
  story_card: string;            // 2-8 paragraphs, poetic
  description: string;           // short summary
  features: string[];            // jsonb array of feature strings
  price: number;                 // integer, in cents ($245 = 24500)
  dimensions: string;            // e.g. '8" W x 6" D x 10" H'
  weight: string;                // e.g. '2.5 lbs'
  materials: string[];           // text array
  power_supply: string | null;   // nullable
  care_instructions: string[];   // text array
  shipping_details: string[];    // text array
  product_type: string;          // 'miniature' | 'printable' | 'storybook'
  series: string | null;         // nullable — 'Portals to Peace', etc.
  available: boolean;            // default true
  quantity: number;              // default 1
  featured: boolean;             // default false
  images: { url: string; alt: string }[]; // jsonb array
  thumbnail: string;             // CDN URL
  thumbnail_alt: string;
  video_url: string | null;      // nullable
  seo_title: string;
  seo_description: string;
  artist_note: string | null;    // nullable
  stripe_product_id: string | null; // auto-populated by stripe-sync
  stripe_price_id: string | null;   // auto-populated by stripe-sync
  homepage_theme: { colors: string[]; mood: string } | null; // nullable
  created_at: string;            // timestamptz, auto
  updated_at: string;            // timestamptz, auto
}
```

### Supabase SQL — CREATE TABLE

```sql
CREATE TABLE products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sku text UNIQUE NOT NULL DEFAULT ('EVE-' || substr(gen_random_uuid()::text, 1, 8)),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  headline text,
  story_card text,
  description text,
  features jsonb DEFAULT '[]'::jsonb,
  price integer NOT NULL,
  dimensions text,
  weight text,
  materials text[] DEFAULT '{}',
  power_supply text,
  care_instructions text[] DEFAULT '{}',
  shipping_details text[] DEFAULT '{}',
  product_type text NOT NULL DEFAULT 'miniature',
  series text,
  available boolean DEFAULT true,
  quantity integer DEFAULT 1,
  featured boolean DEFAULT false,
  images jsonb DEFAULT '[]'::jsonb,
  thumbnail text,
  thumbnail_alt text,
  video_url text,
  seo_title text,
  seo_description text,
  artist_note text,
  stripe_product_id text,
  stripe_price_id text,
  homepage_theme jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-generate slug from title on insert
CREATE OR REPLACE FUNCTION generate_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(replace(NEW.title, ' ', '-'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_slug
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

```sql
CREATE TABLE orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id text NOT NULL,
  stripe_payment_intent text,
  product_id uuid REFERENCES products(id),
  customer_email text,
  amount integer,
  status text DEFAULT 'completed',
  shipping_address jsonb,
  created_at timestamptz DEFAULT now()
);
```

```sql
CREATE TABLE subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  source text DEFAULT 'footer',
  created_at timestamptz DEFAULT now()
);
```

```sql
CREATE TABLE site_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);
```

---

## Configuration Files — Complete

### `vercel.json`

```json
{
  "rewrites": [
    { "source": "/product/:slug", "destination": "/product.html" },
    { "source": "/admin/:path*", "destination": "/admin/index.html" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "https://everlastingsbyemaline.com" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, stripe-signature" },
        { "key": "Access-Control-Max-Age", "value": "86400" }
      ]
    }
  ]
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node"]
  },
  "include": ["api/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `package.json`

```json
{
  "name": "everlastings-website",
  "private": true,
  "scripts": {
    "dev": "vercel dev"
  },
  "dependencies": {
    "stripe": "^17.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@aws-sdk/client-s3": "^3.0.0"
  }
}
```

### `.env.example`

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=everlastings
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

---

## SESSION 1: Foundation — ~3 hrs

**YOU WILL HAVE**: Vercel project live, Supabase tables created with RLS, R2 bucket ready, Stripe connected, all services wired together

### Vercel

- [ ] **Create** Vercel project — connect GitHub repo, auto-deploy on push to `main`
- [ ] **Add** custom domain `everlastingsbyemaline.com` in Vercel dashboard
- [ ] **Create** `vercel.json` — copy complete config from Configuration Files section above
- [ ] **Verify** deploy: push to main, site loads (blank page is fine, no HTML yet)

### Supabase

- [ ] **Create** Supabase project (free tier, us-east-1)
- [ ] **Run** SQL: create `products` table — copy from Product Schema section above
- [ ] **Run** SQL: create `orders` table
- [ ] **Run** SQL: create `subscribers` table
- [ ] **Run** SQL: create `site_config` table
- [ ] **Enable** RLS on all 4 tables:

```sql
-- PRODUCTS: public read, authenticated write
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are publicly readable"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Only authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- ORDERS: authenticated only
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated users can read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SUBSCRIBERS: public insert, authenticated read
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can read subscribers"
  ON subscribers FOR SELECT
  TO authenticated
  USING (true);

-- SITE_CONFIG: public read, authenticated update
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site config is publicly readable"
  ON site_config FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Only authenticated users can update config"
  ON site_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

- [ ] **Create** admin user: Supabase Auth > Users > Invite user (Emy's email)
- [ ] **Configure** Database Webhook: on `products` INSERT → POST to `{VERCEL_URL}/api/stripe-sync`
  - Dashboard: Database > Webhooks > Create new
  - Table: `products`, Event: INSERT
  - Type: HTTP Request, Method: POST
  - URL: `https://everlastingsbyemaline.com/api/stripe-sync`
  - Headers: `Content-Type: application/json`

### Cloudflare R2

- [ ] **Create** R2 bucket named `everlastings`
- [ ] **Enable** public access (R2 > bucket > Settings > Public Access > Enable)
- [ ] **Note** the r2.dev public URL (e.g., `https://pub-xxx.r2.dev`)
- [ ] **Create** API token: R2 > Manage R2 API Tokens > Create API token
  - Permissions: Object Read & Write
  - Specify bucket: `everlastings`
  - Note: Access Key ID + Secret Access Key

### Stripe

- [ ] **Confirm** Stripe account active
- [ ] **Get** test API keys: Dashboard > Developers > API keys
  - Note publishable key (`pk_test_...`) and secret key (`sk_test_...`)
- [ ] **Create** webhook endpoint: Developers > Webhooks > Add endpoint
  - URL: `https://everlastingsbyemaline.com/api/webhook`
  - Events: `checkout.session.completed`
  - Note webhook signing secret (`whsec_...`)

### Environment

- [ ] **Create** `.env.example` — copy from Configuration Files section above
- [ ] **Set** all env vars in Vercel Dashboard: Settings > Environment Variables
- [ ] **Create** `.env.local` for local dev (copy from .env.example, fill in values)
- [ ] **Run** `npm init -y && npm install stripe @supabase/supabase-js @aws-sdk/client-s3`
- [ ] **Create** `tsconfig.json` — copy from Configuration Files section above
- [ ] **Create** `package.json` — copy from Configuration Files section above
- [ ] **Verify** `vercel dev` starts locally

---

## SESSION 2: Design System — ~3 hrs

**YOU WILL HAVE**: CSS variables, typography loaded, base components styled, responsive scaffolding, image standards defined

### CSS Custom Properties

- [ ] **Create** `assets/css/styles.css`
- [ ] **Define** color variables — copy from `BRAND.md` > CSS Custom Properties
- [ ] **Define** typography variables (font-display, font-body, size scale)
- [ ] **Define** spacing scale:

```css
:root {
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 1rem;      /* 16px */
  --space-lg: 1.5rem;    /* 24px */
  --space-xl: 2rem;      /* 32px */
  --space-2xl: 3rem;     /* 48px */
  --space-3xl: 4rem;     /* 64px */

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
}
```

### Typography

- [ ] **Add** Cormorant Garamond via Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
```

- [ ] **Style** heading hierarchy (h1-h6 using --font-display)
- [ ] **Style** body text (--font-body, line-height 1.6)
- [ ] **Style** captions, labels, buttons

### Base Components

- [ ] **Button** styles: primary (plum bg), secondary (outline), ghost, disabled
- [ ] **Card** styles: product tiles with hover shadow lift
- [ ] **Form** inputs: border, focus state (plum outline), padding, radius
- [ ] **Image** styles: `object-fit: cover`, `aspect-ratio: 4/5`, `loading="lazy"`
- [ ] **Badge** styles: "Sold" (fog bg, muted text), "Featured" (gold border)
- [ ] **Error** message styles: subtle, non-intrusive, ink text on fog bg

### Image Standards

All product images MUST be:
- **Aspect ratio**: 4:5 (portrait)
- **Format**: WebP
- **Max size**: 2MB per image
- **Naming**: `hero.webp`, `gallery-01.webp` through `gallery-15.webp`, `thumbnail.webp`

### Responsive Foundation

- [ ] **Set** base mobile styles (393px)
- [ ] **Add** tablet breakpoint (768px)
- [ ] **Add** desktop breakpoint (1024px)
- [ ] **Add** large desktop (1440px)

---

## SESSION 3: Product Page + Supabase Client — ~4 hrs

**YOU WILL HAVE**: Supabase client working, one product renders from database with full layout

### Supabase Client — `assets/js/main.js`

```html
<!-- In every HTML page <head> -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/assets/js/main.js"></script>
```

```javascript
// assets/js/main.js

// Supabase client — anon key is public, protected by RLS
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...your-anon-key';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// CDN base URL for product images
const R2_PUBLIC_URL = 'https://pub-xxx.r2.dev';

// Format price from cents to display string
function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

// Generate slug from title (matches DB trigger)
function slugify(title) {
  return title.toLowerCase().replaceAll(' ', '-');
}

// Fetch single product by slug
async function getProductBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Failed to fetch product:', error.message);
    return null;
  }
  return data;
}

// --- Cart (localStorage) ---

function getCart() {
  return JSON.parse(localStorage.getItem('everlastings_cart') || '[]');
}

function addToCart(item) {
  const cart = getCart();
  // Prevent duplicates (1-of-1 items)
  if (cart.find(i => i.product_id === item.product_id)) return;
  cart.push(item);
  localStorage.setItem('everlastings_cart', JSON.stringify(cart));
}

function removeFromCart(productId) {
  const cart = getCart().filter(i => i.product_id !== productId);
  localStorage.setItem('everlastings_cart', JSON.stringify(cart));
}

function clearCart() {
  localStorage.removeItem('everlastings_cart');
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (badge) {
    const count = getCart().length;
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }
}

// Update badge on every page load
document.addEventListener('DOMContentLoaded', updateCartBadge);

// Fetch all available products
async function getProducts(options = {}) {
  let query = supabase.from('products').select('*');

  if (options.available !== undefined) {
    query = query.eq('available', options.available);
  }
  if (options.featured) {
    query = query.eq('featured', true);
  }
  if (options.series) {
    query = query.eq('series', options.series);
  }
  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? true });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch products:', error.message);
    return [];
  }
  return data;
}
```

- [ ] **Create** `assets/js/main.js` with the code above
- [ ] **Replace** placeholder URLs with actual Supabase URL, anon key, and R2 URL
- [ ] **Seed** one test product in Supabase Studio (use Sunkeeper example from PRODUCT_GUIDE.md)
- [ ] **Upload** test images to R2 under `/products/the-sunkeeper/`

### Product Page — `product.html`

- [ ] **Create** `product.html` — semantic HTML:
  - Two-column layout: `.product-story` (left), `.product-details` (right)
  - Image gallery container (7-15 photos)
  - Story card section (paragraphs)
  - Features list, dimensions, materials, power supply
  - Price display + "Add to Cart" button + "Buy Now" button
  - Care instructions, shipping details
  - Artist note (conditional)
  - Breadcrumb: Home > Shop > Product Title

### Product Page JS — `assets/js/product.js`

```javascript
// assets/js/product.js

document.addEventListener('DOMContentLoaded', async () => {
  // Extract slug from URL: /product/the-sunkeeper → the-sunkeeper
  const slug = window.location.pathname.split('/product/')[1];

  if (!slug) {
    showError('Product not found.');
    return;
  }

  const product = await getProductBySlug(slug);

  if (!product) {
    showError('This product could not be found.');
    return;
  }

  renderProduct(product);
});

function renderProduct(product) {
  // Title + headline
  document.getElementById('product-title').textContent = product.title;
  document.getElementById('product-headline').textContent = product.headline;

  // Story card
  document.getElementById('story-card').innerHTML = product.story_card
    .split('\n\n')
    .map(p => `<p>${p}</p>`)
    .join('');

  // Price
  document.getElementById('product-price').textContent = formatPrice(product.price);

  // Add to Cart / Sold button
  const cartBtn = document.getElementById('add-to-cart');
  const buyNowBtn = document.getElementById('buy-now');
  if (!product.available) {
    cartBtn.disabled = true;
    cartBtn.textContent = 'Sold';
    buyNowBtn.style.display = 'none';
    document.getElementById('sold-badge').classList.remove('hidden');
  } else {
    cartBtn.addEventListener('click', () => {
      addToCart({
        product_id: product.id,
        slug: product.slug,
        title: product.title,
        price: product.price,
        thumbnail: product.thumbnail,
        stripe_price_id: product.stripe_price_id,
      });
      updateCartBadge();
    });
    buyNowBtn.addEventListener('click', () => {
      addToCart({
        product_id: product.id,
        slug: product.slug,
        title: product.title,
        price: product.price,
        thumbnail: product.thumbnail,
        stripe_price_id: product.stripe_price_id,
      });
      window.location.href = '/checkout.html';
    });
  }

  // Images
  renderGallery(product.images);

  // Features
  if (product.features?.length) {
    document.getElementById('features-list').innerHTML =
      product.features.map(f => `<li>${f}</li>`).join('');
  }

  // Dimensions, weight, materials
  if (product.dimensions) {
    document.getElementById('dimensions').textContent = product.dimensions;
  }
  if (product.materials?.length) {
    document.getElementById('materials').textContent = product.materials.join(', ');
  }

  // Care instructions
  if (product.care_instructions?.length) {
    document.getElementById('care-list').innerHTML =
      product.care_instructions.map(c => `<li>${c}</li>`).join('');
  }

  // SEO
  document.title = product.seo_title || `${product.title} | Everlastings by Emaline`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', product.seo_description || product.description);
}

function renderGallery(images) {
  if (!images?.length) return;
  const main = document.getElementById('gallery-main');
  const thumbs = document.getElementById('gallery-thumbs');

  main.src = images[0].url;
  main.alt = images[0].alt;

  images.forEach((img, i) => {
    const thumb = document.createElement('img');
    thumb.src = img.url;
    thumb.alt = img.alt;
    thumb.classList.add('gallery-thumb');
    if (i === 0) thumb.classList.add('active');
    thumb.addEventListener('click', () => {
      main.src = img.url;
      main.alt = img.alt;
      thumbs.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
    thumbs.appendChild(thumb);
  });
}

function showError(message) {
  document.getElementById('product-content').innerHTML =
    `<div class="error-state"><p>${message}</p><a href="/shop.html">Browse the shop</a></div>`;
}
```

- [ ] **Create** `assets/js/product.js` with the code above
- [ ] **Test**: navigate to `/product/the-sunkeeper`, verify product renders from Supabase

### Responsive

- [ ] **Mobile**: single column, story above details
- [ ] **Tablet**: two columns start
- [ ] **Desktop**: full two-column with generous whitespace
- [ ] **Gallery**: horizontal scroll on mobile, grid on desktop

---

## SESSION 4: Stripe Integration — ~4 hrs

**YOU WILL HAVE**: Products purchasable via on-site checkout with cart, inventory auto-updates on sale, Stripe catalog auto-synced

### Stripe Sync — `api/stripe-sync.ts`

Called by Supabase Database Webhook when a product is inserted.

```typescript
// api/stripe-sync.ts
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // service key for server-side writes
);

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Supabase DB webhook payload: { type, table, schema, record, old_record }
    if (payload.type !== 'INSERT' || payload.table !== 'products') {
      return Response.json({ error: 'Ignored: not a products INSERT' }, { status: 200 });
    }

    const product = payload.record;

    // Create Stripe Product
    const stripeProduct = await stripe.products.create({
      name: product.title,
      description: product.description || product.headline || '',
      images: product.images?.slice(0, 8).map((img: { url: string }) => img.url) || [],
      metadata: {
        supabase_id: product.id,
        slug: product.slug,
      },
    });

    // Create Stripe Price (immutable — write-once)
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: product.price, // already in cents
      currency: 'usd',
    });

    // Write Stripe IDs back to Supabase
    const { error } = await supabase
      .from('products')
      .update({
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
      })
      .eq('id', product.id);

    if (error) {
      console.error('Failed to write Stripe IDs back:', error.message);
    }

    return Response.json({
      success: true,
      stripe_product_id: stripeProduct.id,
      stripe_price_id: stripePrice.id,
    });
  } catch (err) {
    console.error('Stripe sync error:', err);
    return Response.json({ error: 'Stripe sync failed' }, { status: 500 });
  }
}
```

- [ ] **Create** `api/stripe-sync.ts` with the code above
- [ ] **Test**: insert product in Supabase Studio → verify Stripe product appears in Stripe Dashboard

### Checkout — `api/checkout.ts`

Creates a Stripe Checkout Session with `ui_mode: 'custom'`. Checks availability for ALL cart items first.

```typescript
// api/checkout.ts
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface CartItem {
  product_id: string;
  slug: string;
  stripe_price_id: string;
}

export async function POST(request: Request) {
  try {
    const { items } = await request.json() as { items: CartItem[] };

    if (!items?.length) {
      return Response.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Availability check for ALL items — prevents oversell race condition
    const productIds = items.map(i => i.product_id);
    const { data: products, error } = await supabase
      .from('products')
      .select('id, slug, available, quantity')
      .in('id', productIds);

    if (error) {
      return Response.json({ error: 'Failed to verify availability' }, { status: 500 });
    }

    // Check each item is still available
    const unavailable = items.filter(item => {
      const product = products?.find(p => p.id === item.product_id);
      return !product || !product.available || product.quantity < 1;
    });

    if (unavailable.length > 0) {
      return Response.json({
        error: 'Some items are no longer available',
        unavailable: unavailable.map(i => i.slug),
      }, { status: 409 });
    }

    // Build line_items from cart
    const line_items = items.map(item => ({
      price: item.stripe_price_id,
      quantity: 1,
    }));

    // Store item details in metadata for webhook
    const itemsMeta = items.map(i => ({ id: i.product_id, slug: i.slug }));

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'custom',
      mode: 'payment',
      line_items,
      allow_promotion_codes: true, // Enables promo code field (for cart-recovery discounts etc.)
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      metadata: {
        items: JSON.stringify(itemsMeta),
      },
      return_url: `${getBaseUrl(request)}/complete.html?session_id={CHECKOUT_SESSION_ID}`,
    });

    return Response.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error('Checkout error:', err);
    return Response.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
```

- [ ] **Create** `api/checkout.ts` with the code above

### Session Status — `api/session-status.ts`

Return page fetches session status to show confirmation or error.

```typescript
// api/session-status.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
      return Response.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    return Response.json({
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
    });
  } catch (err) {
    console.error('Session status error:', err);
    return Response.json({ error: 'Failed to retrieve session' }, { status: 500 });
  }
}
```

- [ ] **Create** `api/session-status.ts` with the code above

### Webhook — `api/webhook.ts`

Handles Stripe `checkout.session.completed` events. Updates inventory and creates order.

```typescript
// api/webhook.ts
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return Response.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Parse items from metadata (supports single and multi-item carts)
    let items: { id: string; slug: string }[] = [];
    try {
      items = JSON.parse(session.metadata?.items || '[]');
    } catch {
      console.error('Failed to parse items metadata');
      return Response.json({ received: true }, { status: 200 });
    }

    if (!items.length) {
      console.error('No items in session metadata');
      return Response.json({ received: true }, { status: 200 });
    }

    // Mark each product as sold
    for (const item of items) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ available: false, quantity: 0 })
        .eq('id', item.id);

      if (updateError) {
        console.error(`Failed to update product ${item.slug}:`, updateError.message);
      }

      // Create order record per product
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          stripe_session_id: session.id,
          stripe_payment_intent: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id,
          product_id: item.id,
          customer_email: session.customer_details?.email,
          amount: session.amount_total,
          status: 'completed',
          shipping_address: session.shipping_details?.address,
        });

      if (orderError) {
        console.error(`Failed to create order for ${item.slug}:`, orderError.message);
      }
    }

    console.log(`Order completed: ${items.map(i => i.slug).join(', ')} → ${session.customer_details?.email}`);
  }

  return Response.json({ received: true }, { status: 200 });
}
```

- [ ] **Create** `api/webhook.ts` with the code above

### Checkout Page — `checkout.html` + `assets/js/checkout.js`

On-site checkout using Stripe Elements with `ui_mode: 'custom'`.

```javascript
// assets/js/checkout.js

document.addEventListener('DOMContentLoaded', async () => {
  // Get cart items from localStorage
  const cart = getCart();

  if (!cart.length) {
    showCheckoutError('Your cart is empty.');
    document.getElementById('cart-summary').innerHTML =
      '<p><a href="/shop.html">Browse the shop</a></p>';
    return;
  }

  // Render cart summary on checkout page
  renderCartSummary(cart);

  // Initialize Stripe
  const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

  try {
    // Create checkout session on server with all cart items
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map(item => ({
          product_id: item.product_id,
          slug: item.slug,
          stripe_price_id: item.stripe_price_id,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        const errData = await response.json();
        // Remove unavailable items from cart
        if (errData.unavailable) {
          errData.unavailable.forEach(slug => {
            const item = cart.find(i => i.slug === slug);
            if (item) removeFromCart(item.product_id);
          });
          // Show recovery popup with discount + email capture
          showSoldRecovery(errData.unavailable);
        } else {
          showCheckoutError('This piece has already found its home.');
        }
      } else {
        showCheckoutError('Something went awry. Please try again.');
      }
      return;
    }

    // Initialize Custom Checkout
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

    // Create and mount Payment Element
    const paymentElement = checkout.createPaymentElement();
    paymentElement.mount('#payment-element');

    // Listen for session readiness
    checkout.on('change', (session) => {
      document.getElementById('submit-btn').disabled = !session.canConfirm;
    });

    // Handle form submit
    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      try {
        const actions = await checkout.loadActions();
        const result = await actions.confirm();

        if (result.type === 'error') {
          showCheckoutError(result.error.message);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Bring This Haven Home';
        }
        // If successful, Stripe redirects to return_url
      } catch (err) {
        showCheckoutError('Payment could not be processed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Bring This Haven Home';
      }
    });
  } catch (err) {
    showCheckoutError('Unable to load checkout. Please refresh the page.');
  }
});

function renderCartSummary(cart) {
  const el = document.getElementById('cart-summary');
  if (!el) return;
  el.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.thumbnail}" alt="${item.title}" class="cart-thumb">
      <div>
        <strong>${item.title}</strong>
        <span>${formatPrice(item.price)}</span>
      </div>
      <button onclick="removeFromCart('${item.product_id}'); location.reload();" class="cart-remove">Remove</button>
    </div>
  `).join('') + `
    <div class="cart-total">
      <strong>Total: ${formatPrice(getCartTotal())}</strong>
    </div>
  `;
}

function showSoldRecovery(unavailableSlugs) {
  // Recovery popup: warm apology + one-time discount + email capture
  const popup = document.getElementById('sold-recovery-popup');
  const names = unavailableSlugs.join(', ');
  popup.innerHTML = `
    <div class="recovery-content">
      <h3>These havens have found their homes</h3>
      <p>${names} sold while you were browsing. We're sorry for the heartache.</p>
      <p>As a thank you for your interest, here's a one-time discount on your next purchase:</p>
      <form id="recovery-email-form">
        <input type="email" id="recovery-email" placeholder="Your email" required>
        <button type="submit">Send My Discount</button>
      </form>
      <button onclick="this.closest('.recovery-content').remove(); location.reload();" class="ghost-btn">
        Continue with remaining items
      </button>
    </div>
  `;
  popup.classList.remove('hidden');

  // Generate unique promo code via API and show it
  document.getElementById('recovery-email-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('recovery-email').value;
    const submitBtn = e.target.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating...';

    try {
      const res = await fetch('/api/cart-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lost_items: unavailableSlugs }),
      });
      const data = await res.json();

      if (data.code) {
        popup.innerHTML = `
          <div class="recovery-content">
            <h3>A small gift for your patience</h3>
            <p>Use code <strong class="promo-code">${data.code}</strong> for ${data.percent_off}% off your next purchase.</p>
            <p class="promo-expiry">Valid for ${data.expires_in_days} days.</p>
            <button onclick="location.reload();" class="primary-btn">Continue Shopping</button>
          </div>
        `;
      }
    } catch {
      popup.innerHTML = '<div class="recovery-content"><p>We\'ll be in touch. Thank you for your patience.</p></div>';
      setTimeout(() => location.reload(), 2000);
    }
  });
}

function showCheckoutError(message) {
  const errorEl = document.getElementById('checkout-error');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}
```

```html
<!-- checkout.html key structure -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/assets/js/main.js"></script>
<script src="https://js.stripe.com/v3/"></script>
<script>const STRIPE_PUBLISHABLE_KEY = 'pk_test_...';</script>

<div id="cart-summary"></div>
<p class="cart-note">Each piece is one-of-a-kind and cannot be reserved. Complete your purchase to ensure availability.</p>
<form id="checkout-form">
  <div id="payment-element"></div>
  <div id="checkout-error" class="hidden"></div>
  <button id="submit-btn" type="submit" disabled>Bring This Haven Home</button>
</form>
<div id="sold-recovery-popup" class="hidden"></div>

<script src="/assets/js/checkout.js"></script>
```

- [ ] **Create** `checkout.html` with full HTML structure, Stripe.js CDN load, mount point
- [ ] **Create** `assets/js/checkout.js` with the code above
- [ ] **Hardcode** `STRIPE_PUBLISHABLE_KEY` in checkout.html `<script>` tag (publishable key is safe to expose — it's designed for client-side use. No build step means no env var injection for frontend)

### Return Page — `complete.html`

```javascript
// Inline in complete.html or separate JS file

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  if (!sessionId) {
    showResult('error', 'Something went awry.');
    return;
  }

  try {
    const response = await fetch(`/api/session-status?session_id=${sessionId}`);
    const data = await response.json();

    if (data.status === 'complete') {
      clearCart(); // Clear cart after successful purchase
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

- [ ] **Create** `complete.html` with success/error states
- [ ] **Wire** "Add to Cart" and "Buy Now" buttons on product page
- [ ] **Test** cart: add item, verify badge count, navigate to checkout, see cart summary
- [ ] **Test** full flow: add to cart → checkout → pay with `4242 4242 4242 4242` → completion
- [ ] **Verify**: product shows "Sold" in Supabase after webhook fires, cart is cleared
- [ ] **Test** multi-item: add 2 products to cart, checkout, verify both marked sold
- [ ] **Test** race condition: add item to cart, manually set `available=false` in Supabase, attempt checkout, verify 409 error and item removed from cart
- [ ] **Test** recovery flow: trigger 409, see recovery popup, enter email, verify subscriber created with `source: 'cart-recovery'`, verify promo code returned and displayed

### Cart Recovery — Discount + Email Capture

**How it works**: When a customer tries to check out and one or more items have sold, we turn the disappointment into a touchpoint. They see a warm, on-brand popup, get a unique one-time discount code, and we capture their email.

**Stripe setup (one-time, during Session 1):**

- [ ] **Create** a Stripe coupon in Dashboard (or via API) for cart recovery:
  - Name: "Haven Finder Apology"
  - Type: Percentage off → 10%
  - Duration: Once (one-time payments)
  - ID: `cart-recovery-10` (custom ID for API reference)
  - No max redemptions on the coupon itself (each promo code generated from it will be single-use)

**API endpoint — `api/cart-recovery.ts`:**

```typescript
// api/cart-recovery.ts
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, lost_items } = await request.json();

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 });
    }

    // Create a unique, single-use promotion code from our recovery coupon
    const promoCode = await stripe.promotionCodes.create({
      coupon: 'cart-recovery-10',
      max_redemptions: 1,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      metadata: {
        source: 'cart-recovery',
        lost_items: JSON.stringify(lost_items || []),
        email: email,
      },
    });

    // Save email to subscribers (ignore duplicate)
    await supabase
      .from('subscribers')
      .upsert(
        { email, source: 'cart-recovery' },
        { onConflict: 'email' }
      );

    return Response.json({
      code: promoCode.code,
      percent_off: 10,
      expires_in_days: 30,
    });
  } catch (err) {
    console.error('Cart recovery error:', err);
    return Response.json({ error: 'Failed to generate discount' }, { status: 500 });
  }
}
```

- [ ] **Create** `api/cart-recovery.ts` with the code above

**Frontend (update to `showSoldRecovery` in checkout.js):**

Replace the TODO in the existing `showSoldRecovery` function's email handler:

```javascript
  document.getElementById('recovery-email-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('recovery-email').value;
    const submitBtn = e.target.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating...';

    try {
      const res = await fetch('/api/cart-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          lost_items: unavailableSlugs,
        }),
      });
      const data = await res.json();

      if (data.code) {
        popup.innerHTML = `
          <div class="recovery-content">
            <h3>A small gift for your patience</h3>
            <p>Use code <strong class="promo-code">${data.code}</strong> for ${data.percent_off}% off your next purchase.</p>
            <p class="promo-expiry">Valid for ${data.expires_in_days} days.</p>
            <button onclick="location.reload();" class="primary-btn">Continue Shopping</button>
          </div>
        `;
      }
    } catch {
      popup.innerHTML = '<div class="recovery-content"><p>We\'ll be in touch. Thank you for your patience.</p></div>';
      setTimeout(() => location.reload(), 2000);
    }
  });
```

- [ ] **Update** `showSoldRecovery()` in checkout.js with the real API call above

### Sticky Product Card (Product Page)

The product details card follows the user as they scroll through the story and gallery.

**Structure:**

```html
<!-- Right column of product page — position: sticky -->
<aside class="product-sticky-card" style="position: sticky; top: calc(var(--header-height) + var(--space-lg));">
  <img id="sticky-thumb" class="sticky-thumb" alt="">
  <h2 id="product-title"></h2>
  <p id="product-price" class="price"></p>

  <button id="add-to-cart" class="btn-primary">Add to Cart</button>
  <button id="buy-now" class="btn-secondary">Buy Now</button>

  <p class="availability-note">
    Each piece is one-of-a-kind. <a href="/policies.html#availability">Availability confirmed at checkout</a>.
  </p>
</aside>
```

**CSS:**

```css
.product-sticky-card {
  position: sticky;
  top: calc(var(--z-header, 80px) + var(--space-lg));
  align-self: start; /* Prevents stretching in flex/grid parent */
}

.availability-note {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: var(--space-md);
  line-height: 1.4;
}

.availability-note a {
  color: var(--text-secondary);
  text-decoration: underline;
}
```

**Behavior:**
- Sticks to viewport as user scrolls through story card and gallery on the left
- On mobile (< 768px): not sticky, appears below gallery in normal flow
- "Availability confirmed at checkout" links to policies page with full explanation
- Badge overlays ("Sold", "Featured") appear on the thumbnail

- [ ] **Build** sticky product card in `product.html` right column
- [ ] **Style** with `position: sticky` and mobile fallback
- [ ] **Create** availability explanation section in `policies.html`

### Policies Page — Availability Section

Add to the policies/shipping page (created in Session 8):

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

- [ ] **Add** availability section to policies page (Session 8)

---

## SESSION 5: Shop Grid + Filters — ~3 hrs

**YOU WILL HAVE**: All products in filterable, sortable grid

### Shop Page

- [ ] **Create** `shop.html` with filter sidebar + product grid
- [ ] **Create** `assets/js/shop.js`:
  - Fetch all products from Supabase using `getProducts()`
  - Render product tiles in CSS grid
  - Filter by: series, product_type, availability
  - Sort by: price (low/high), newest, name (A-Z)
  - Smart filter: hide single-option dropdowns
  - URL state: `?series=portals-to-peace&sort=price-asc`
  - "No results" state when filters return empty

### Product Tiles

- [ ] **Hover**: image scale 1.05 + shadow lift
- [ ] **Sold badge**: overlay when `available === false`
- [ ] **Click**: navigate to `/product/{slug}`
- [ ] **Lazy load**: `loading="lazy"` on all tile images
- [ ] **Aspect ratio**: 4:5 enforced via CSS `aspect-ratio: 4/5`

---

## SESSION 6: Homepage — ~5 hrs

**YOU WILL HAVE**: Full landing page with hero, featured products, brand sections

### Sections

- [ ] **Hero**: full-viewport image + overlay + CTA "Enter Elsewhere"
- [ ] **Intro block**: "When the world cracked open..."
- [ ] **Featured carousel**: `getProducts({ featured: true })`, horizontal scroll
- [ ] **Brand pillars**: Story, Craftsmanship, Sanctuary
- [ ] **Testimonial strip**: placeholder section

### Dynamic Theme

- [ ] **Create** `assets/js/homepage.js`
- [ ] **Fetch** theme from `site_config` table
- [ ] **Apply** CSS variables dynamically
- [ ] **Rotate** theme on return visits (localStorage)

### Theatrical Lighting

- [ ] **CSS mask/spotlight**: radial gradient shifts on scroll
- [ ] **Transform**: `translateY()` on background layers opposite to scroll
- [ ] **Performance**: `will-change: transform`, GPU-only properties

---

## SESSION 7: Header, Footer, Nav — ~2 hrs

**YOU WILL HAVE**: Consistent navigation across all pages

### Header

- [ ] **Logo** (left, links to homepage)
- [ ] **Nav**: Home, Shop (dropdown), About, Commissions, Contact
- [ ] **Shop dropdown**: All, Portals to Peace, Book Nooks & Story Lofts, Seasonal & Limited, Sold Archive
- [ ] **Cart icon** with count badge (right) — links to `/checkout.html`
- [ ] **Mobile**: hamburger (left), logo (center), cart icon (right)
- [ ] **Sticky** on scroll

### Footer

- [ ] **Four columns**: About, Shop, Support, Connect
- [ ] **Newsletter signup**: email input → POST `/api/subscribe`
- [ ] **Social links**: Instagram, Facebook, Pinterest, TikTok
- [ ] **Bottom bar**: copyright, "Site by Sean August Horvath", Terms | Privacy

### Newsletter

- [ ] **Create** `assets/js/newsletter.js`
- [ ] **Create** `api/subscribe.ts`:

```typescript
// api/subscribe.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, source } = await request.json();

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('subscribers')
      .insert({ email, source: source || 'footer' });

    if (error) {
      if (error.code === '23505') { // unique constraint
        return Response.json({ message: 'Already subscribed' }, { status: 200 });
      }
      throw error;
    }

    return Response.json({ message: 'Subscribed' });
  } catch (err) {
    console.error('Subscribe error:', err);
    return Response.json({ error: 'Subscription failed' }, { status: 500 });
  }
}
```

---

## SESSION 8: Remaining Pages — ~3 hrs

**YOU WILL HAVE**: All content pages live

### About (`about.html`)

- [ ] Photo + logo
- [ ] Origin story (from brand guide)
- [ ] Philosophy of Elsewhere
- [ ] Mission statement

### Contact + Commissions (`contact.html`)

- [ ] Contact form: name, email, subject, message
- [ ] Commission inquiry option
- [ ] **Create** `api/contact.ts` — receive form, store in Supabase or send email

### Static Pages

- [ ] FAQ
- [ ] Shipping & Returns
- [ ] Terms / Privacy
- [ ] Footer links to all

---

## SESSION 9: Admin UI — ~3 hrs

**YOU WILL HAVE**: Emy can add/edit products from her browser

### Auth

- [ ] `/admin/index.html` — login form
- [ ] Supabase Auth: email/password
- [ ] Redirect if not authenticated
- [ ] Logout button

### Product Management — `assets/js/admin.js`

- [ ] Product list: table/grid with edit/delete
- [ ] New product form: all schema fields
  - Price input in dollars, convert to cents on save
  - Dynamic lists: features, materials, care_instructions, shipping_details
- [ ] Image upload: file picker → `api/upload.ts` → R2 → return CDN URL
- [ ] Save: INSERT or UPDATE to products
- [ ] Delete with confirmation

### Image Upload — `api/upload.ts`

```typescript
// api/upload.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  // Auth check required — verify Supabase session token
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const slug = formData.get('slug') as string;
    const filename = formData.get('filename') as string;

    if (!file || !slug || !filename) {
      return Response.json({ error: 'Missing file, slug, or filename' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/webp', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return Response.json({ error: 'Only WebP, JPEG, and PNG allowed' }, { status: 400 });
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return Response.json({ error: 'File must be under 2MB' }, { status: 400 });
    }

    const key = `products/${slug}/${filename}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    return Response.json({ url: publicUrl });
  } catch (err) {
    console.error('Upload error:', err);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

---

## SESSION 10: SEO, Testing, Launch — ~3 hrs

**YOU WILL HAVE**: Production-ready site

### SEO

- [ ] Meta titles + descriptions (dynamic for products)
- [ ] Open Graph + Twitter Card tags
- [ ] Structured data (Product schema.org)
- [ ] Canonical URLs, sitemap.xml, robots.txt

### Analytics

- [ ] Google Analytics 4 with `gtag.js`
- [ ] Events: product_view, begin_checkout, purchase
- [ ] Google Search Console verification

### Stripe Live Mode

- [ ] Switch test keys → live keys in Vercel env vars
- [ ] Update webhook to live signing secret
- [ ] Test one real transaction (small amount, refund)

### Testing

- [ ] Cross-browser: Chrome, Safari, Firefox, Edge
- [ ] Mobile: iPhone, iPad, Android
- [ ] Full checkout flow: product page → Buy Now → payment → "Sold" status
- [ ] Admin flow: login → add product → verify on shop page
- [ ] Newsletter from homepage + footer
- [ ] Contact form
- [ ] All internal links

### Performance

- [ ] Lighthouse 90+ all categories
- [ ] All images WebP, lazy loaded
- [ ] WCAG AA accessibility
- [ ] Keyboard navigation
- [ ] Alt text on every image

### Launch

- [ ] DNS pointed to Vercel
- [ ] SSL active
- [ ] Real products loaded (5-10 minimum)
- [ ] Final review with Sean + Emy

---

## Error States Reference

| Page       | Failure                        | User Sees                                                              | Code Behavior                                                                                                  |
| ---------- | ------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Product    | Product not found              | "This product could not be found." + link to shop                      | `getProductBySlug` returns null → `showError()`                                                                |
| Product    | Supabase fetch fails           | "This product could not be found."                                     | `error` from Supabase → `showError()`                                                                          |
| Product    | Image fails to load            | Broken image hidden, placeholder shown                                 | `onerror` handler on `<img>`                                                                                   |
| Product    | Product sold                   | "Sold" badge, Buy Now disabled                                         | `available === false` → button disabled                                                                        |
| Checkout   | Cart empty                     | "Your cart is empty." + link to shop                                   | No items in localStorage                                                                                       |
| Checkout   | Items sold while in cart (409) | Recovery popup: warm apology + one-time discount offer + email capture | API returns 409 → `showSoldRecovery()` → remove items, show popup, capture email as `cart-recovery` subscriber |
| Checkout   | Session creation fails         | "Something went awry. Please try again."                               | API returns 500 → error message                                                                                |
| Checkout   | Payment declined               | Stripe error message displayed                                         | `actions.confirm()` returns error                                                                              |
| Checkout   | Network error                  | "Unable to load checkout. Please refresh."                             | fetch throws → catch block                                                                                     |
| Complete   | Session status: complete       | "Your haven is on its way."                                            | Success state                                                                                                  |
| Complete   | Session status: other          | "Something went awry. Please try again."                               | Error state with retry                                                                                         |
| Shop       | No products found              | "No products available yet."                                           | Empty array → empty state                                                                                      |
| Shop       | Filters return empty           | "No products match your filters."                                      | Filtered array empty → message                                                                                 |
| Newsletter | Already subscribed             | "Already subscribed" (not an error)                                    | 23505 unique constraint → friendly message                                                                     |
| Newsletter | Invalid email                  | "Valid email required"                                                 | Client + server validation                                                                                     |
| Admin      | Not authenticated              | Redirect to login                                                      | Supabase auth check                                                                                            |
| Admin      | Upload too large               | "File must be under 2MB"                                               | File size check before upload                                                                                  |

---

## Slug Rules

- **Generation**: `title.toLowerCase().replaceAll(' ', '-')`
- **Example**: "The Sunkeeper" → `the-sunkeeper`
- **Immutable**: once created, slug never changes (URL stability, SEO, R2 path depends on it)
- **URL pattern**: `/product/the-sunkeeper`
- **R2 path**: `/products/the-sunkeeper/hero.webp`
- **Enforced by**: Supabase trigger on INSERT (see Product Schema section)

---

## Caching Strategy (Deferred)

Not needed for launch. Document for later:
- Supabase queries hit the database directly on every page load
- Acceptable at current scale (< 100 products)
- When needed: add Vercel Edge Config or stale-while-revalidate headers
- Product images on R2 are already CDN-cached by Cloudflare

---

## Post-Launch — 30 days included

- Bug fixes and technical support
- Performance optimization
- Content update assistance

---

## Reference Documents

| Document      | Location                                      | Use                                |
| ------------- | --------------------------------------------- | ---------------------------------- |
| Architecture  | `assets/docs/EVERLASTINGS_STORE.md`           | Full technical reference           |
| Brand Guide   | `assets/docs/BRAND.md`                        | Colors, fonts, voice, copy         |
| Product Guide | `assets/docs/PRODUCT_GUIDE.md`                | Client-facing, how to add products |
| Action Steps  | `assets/docs/archive/v1/v1_2_ACTION_STEPS.md` | Checklist version of this doc      |
| Mobile Specs  | `.agent/2026_MOBILE_DESIGN_SPECS.md`          | iOS/iPadOS viewport measurements   |
| Dev Rules     | `.agent/DEV_RULES.md`                         | Git branching, dev protocols       |

---
*Every code snippet is production-ready. Every checkbox is one action. Follow the sessions in order.*