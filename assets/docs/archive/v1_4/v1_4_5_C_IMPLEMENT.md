# v1.4.5 Track C — Integration Implementation Guide

**Version**: v1.4.5
**Branch**: `dev`
**Audience**: Track C orchestrator agent at XHIGH effort posture.
**Goal**: Wire Track B's 13 placeholder pages to Track A's 11 deployed endpoints; ship cart + checkout end-to-end including 409 cart-recovery and 410 hold-expiry flows; finalize SEO; cut over to launch.

This is the only execution playbook. The orchestrator does not redesign — it orchestrates: claims a phase, spreads its file-by-file work across subagents per the groupings in § Orchestration, gates each phase against the verification block, surfaces blockers to Sean instead of working around them. All architecture decisions and code snippets in this document are confirmed and final; nothing here is a "fix" or a "decision" to be re-evaluated mid-build.

> **Required reading**: this file, plus `.agent/AGENTS.md`, `.agent/DEV_RULES.md`, and `assets/docs/EVERLASTINGS_STORE.md`. Nothing else. Historical context is in `v1_4_4_IMPLEMENT_UPDATES.md` for Sean's reference; the executing agent does not need it.

---

## Pre-flight Checklist (verification only, bash-only)

Before C1 begins. Each item is a state confirmation, not a change. If anything fails, **stop and surface to Sean** — the failure is real, not something to work around.

```bash
# 1. Branch state
git branch --show-current   # expect: dev
git status                  # expect: working tree clean
git log --oneline -10       # expect: ae1ce38 (inline Stripe sync) and 0736fc9 (signed Cloudinary upload) present in recent history

# 2. Function count under Hobby cap
find api -type f -name '*.ts' \! -path 'api/_*/*' | wc -l   # expect: 11

# 3. Latest preview deploy is green
vercel ls | head -5         # expect: top row Status = ● Ready

# 4. Public-URL plumbing on the latest preview alias
LATEST=$(vercel ls 2>/dev/null | grep -oE 'https://[^ ]+\.vercel\.app' | head -1)
npx vercel curl --deployment "$LATEST" -- /api/config        | tail -3  # expect: 200 + JSON with publishableKey, supabaseUrl
npx vercel curl --deployment "$LATEST" -- /api/products       | tail -3  # expect: 200 + {"products":[]} (unauth filter is_test=false)

# 5. AI pipeline live (auth-gated round-trip)
set -a; source .env.local; set +a
npx vercel curl --deployment "$LATEST" -- /api/products -H "Authorization: Bearer $PRODUCT_API_KEY" | tail -3
# expect: 200 + products array with placeholder rows (is_test=true visible because authorized)

# 6. Frontend asset directory exists with placeholder pages
ls assets/css/styles.css index.html shop.html product.html cart.html checkout.html complete.html admin/index.html 2>&1 | wc -l
# expect: 8 (all present)

# 7. Static rewrite rules in place
grep -c '"/api/checkout/reserve"\|"/api/session-status"\|"/api/orders/:id"\|"/api/cart-activity"\|"/api/cart-recovery"' vercel.json
# expect: 5 lines containing those rewrites
```

Stop conditions:
- `git status` is dirty → ask Sean what to commit/stash.
- Function count > 11 → consolidate before continuing (per AR #34).
- Latest preview is not Ready → check `vercel logs <deployment>`; surface to Sean.
- `/api/config` or `/api/products` does not return 200 on the preview → surface to Sean.
- Any of the eight HTML files missing → Track B did not ship that page; surface to Sean.

`vercel curl` exits with code 3 on success against protection-enabled preview deployments (the JSON body still delivers correctly; the exit code is a Vercel CLI quirk). Use `set -uo pipefail`, never `set -e`, in any seeding script that targets the preview.

---

## Orchestration

### Role

XHIGH orchestrator. Delegate file-by-file work aggressively to keep the orchestrator context lean. **Do not delegate**: branch state, commit cadence, push timing, phase gates, verification reads, escalation decisions.

### Subagent groupings

Each phase below names which deliverables can run in parallel. The pattern: orchestrator hands a subagent its file path + the canonical code block from this guide + the contract test. Subagent returns the file. Orchestrator runs the contract test on the next preview deploy.

| Phase | Parallel groups | Notes |
|-------|-----------------|-------|
| C1 | Group 1: `main.js`. Group 2: cookie-banner verification (read-only, no file write). | C1.1 must land before C1.2 (same file). |
| C2 | Group 1: `product.js` + `shop.js` (independent). Group 2: `homepage.js` + `newsletter.js` (independent). | All four read from `main.js` foundations; can run together if C1 ships first. |
| C3 | Group 1: `recovery.js` (helper, no deps). Group 2: `cart.js` (depends on `recovery.js`). Group 3: `checkout.js`. Group 4: `complete.js`. | `recovery.js` must land before `cart.js` since `cart.js` calls it. `checkout.js` and `complete.js` are independent of each other. |
| C4 | Group 1: per-page meta tags + Open Graph + JSON-LD (one subagent per file class). Group 2: `sitemap.xml` + `robots.txt`. Group 3: integration test re-run (read-only). | Lighthouse audit and OG validators run after Group 1 and 2 land. |
| C5 | Sequential. Orchestrator runs the placeholder purge and gate verifications; Sean drives the human-only steps (live keys, DNS flip, real-card test). | |

### Branch + commit policy

- All work on `dev`. Push frequently for preview testing.
- One commit per file or per logical pair (e.g. `cart.js` + `recovery.js`). Commit messages describe behavior, not the section number.
- Do not merge to `main` until C5.5.

### Escalation triggers

Stop and surface to Sean (do not decide alone) if:
- A subagent reports the guide is ambiguous or contradicts itself. Ambiguity is a real bug.
- A contract test against the preview returns an unexpected status code (e.g. 500 from an endpoint Track A claimed delivered).
- Adding a new endpoint feels needed. Consolidation rule (AR #34) governs; check with Sean first.
- Any decision that would change a `data-*` attribute name (Appendix A is the contract), an `email-cta-submit` source value (Appendix B is the contract), or the consent localStorage shape `{ analytics, advertising, california, timestamp, version }`. All three are settled architecture; do not reopen.
- Any test failure reveals that Track A or Track B did not ship something this guide assumes.

---

## C1 — Foundations

Stand up `assets/js/main.js` and the two global event listeners every Track B page already dispatches (`email-cta-submit` and `consent-change`). Per-page modules in C2 consume these foundations.

### C1.1 `assets/js/main.js`

**Path**: `assets/js/main.js`

**Contract**: every page loads this script in `<head>` after the Supabase CDN script tag. After `DOMContentLoaded`, `window._supabase` is a working Supabase client. `formatPrice`, `slugify`, `getProductBySlug`, `getProducts`, the cart helpers, and the global `email-cta-submit` + `consent-change` listeners are all wired.

**Code**:

```javascript
// assets/js/main.js

let SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, STRIPE_PUBLISHABLE_KEY, META_PIXEL_ID;

const R2_PUBLIC_URL = 'https://cdn.everlastingsbyemaline.com';
const CONSENT_STORAGE_KEY = 'everlastings.consent';

async function initConfig() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    SUPABASE_URL = config.supabaseUrl;
    SUPABASE_PUBLISHABLE_KEY = config.supabasePublishableKey;
    STRIPE_PUBLISHABLE_KEY = config.publishableKey;
    META_PIXEL_ID = config.metaPixelId;
    window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    window._stripePublishableKey = STRIPE_PUBLISHABLE_KEY;
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

function getSupabase() {
  return window._supabase;
}

function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function slugify(title) {
  return title.toLowerCase().replaceAll(' ', '-');
}

function buildGa4Item(product) {
  return {
    item_id: product.slug,
    item_name: product.title,
    item_brand: 'Everlastings by Emaline',
    item_category: product.product_type,
    item_category2: product.series || '',
    price: product.price / 100,
    quantity: 1,
  };
}

function trackMeta(eventName, params) {
  if (typeof fbq === 'function') fbq('track', eventName, params);
}

async function getProductBySlug(slug) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from('products').select('*').eq('slug', slug).maybeSingle();
  if (error) {
    console.error('Failed to fetch product:', error.message);
    return null;
  }
  return data;
}

async function getProducts(options = {}) {
  const supabase = getSupabase();
  if (!supabase) return [];
  let query = supabase.from('products').select('*');
  if (options.available !== undefined) query = query.eq('available', options.available);
  if (options.featured) query = query.eq('featured', true);
  if (options.series) query = query.eq('series', options.series);
  if (options.product_type) query = query.eq('product_type', options.product_type);
  if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? true });
  else query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch products:', error.message);
    return [];
  }
  return data ?? [];
}

// --- Cart (localStorage) ---

function getOrCreateBrowserSessionId() {
  let id = localStorage.getItem('everlastings_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('everlastings_session_id', id);
  }
  return id;
}

function getCart() {
  return JSON.parse(localStorage.getItem('everlastings_cart') || '[]');
}

function addToCart(item) {
  const cart = getCart();
  if (cart.find((i) => i.product_id === item.product_id)) return;
  cart.push(item);
  localStorage.setItem('everlastings_cart', JSON.stringify(cart));
  updateCartBadge();

  if (typeof gtag === 'function') {
    gtag('event', 'add_to_cart', {
      currency: 'USD',
      value: item.price / 100,
      items: [buildGa4Item(item)],
    });
  }
  trackMeta('AddToCart', {
    content_ids: [item.slug],
    content_type: 'product',
    content_name: item.title,
    value: item.price / 100,
    currency: 'USD',
  });

  // Fire-and-forget interest ping (AR #26). Never blocks UX.
  fetch('/api/cart-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: item.slug }),
  }).catch(() => {});
}

function removeFromCart(productId) {
  const item = getCart().find((i) => i.product_id === productId);
  const cart = getCart().filter((i) => i.product_id !== productId);
  localStorage.setItem('everlastings_cart', JSON.stringify(cart));
  updateCartBadge();
  if (item && typeof gtag === 'function') {
    gtag('event', 'remove_from_cart', {
      currency: 'USD',
      value: item.price / 100,
      items: [buildGa4Item(item)],
    });
  }
}

function clearCart() {
  localStorage.removeItem('everlastings_cart');
  updateCartBadge();
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = getCart().length;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

// --- Global email-cta-submit listener ---

document.addEventListener('email-cta-submit', async (e) => {
  const { source, email, productSlug } = e.detail || {};
  if (!email || !source) return;
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, email, productSlug }),
    });
    if (res.status === 200) {
      const data = await res.json();
      window.dispatchEvent(new CustomEvent('email-cta-success', { detail: { source, ...data } }));
      if (typeof gtag === 'function') gtag('event', 'email_cta_capture', { source });
      trackMeta('Lead', { content_name: source });
      return;
    }
    if (res.status === 409) {
      window.dispatchEvent(new CustomEvent('email-cta-already-subscribed', { detail: { source } }));
      return;
    }
    const data = await res.json().catch(() => ({}));
    window.dispatchEvent(new CustomEvent('email-cta-error', { detail: { source, message: data.error || 'Subscribe failed' } }));
  } catch (err) {
    window.dispatchEvent(new CustomEvent('email-cta-error', { detail: { source, message: err.message } }));
  }
});

// --- Global consent-change listener ---

function applyConsent(state) {
  if (typeof gtag === 'function') {
    gtag('consent', 'update', {
      analytics_storage: state.analytics ? 'granted' : 'denied',
      ad_storage: state.advertising ? 'granted' : 'denied',
      ad_user_data: state.advertising ? 'granted' : 'denied',
      ad_personalization: state.advertising ? 'granted' : 'denied',
    });
  }
  if (typeof fbq === 'function') {
    fbq('consent', state.advertising ? 'grant' : 'revoke');
    if (state.advertising && state.california) {
      fbq('dataProcessingOptions', ['LDU'], 0, 0);
    }
  }
}

window.addEventListener('consent-change', (e) => {
  const detail = e.detail || {};
  const persisted = {
    analytics: !!detail.analytics,
    advertising: !!detail.advertising,
    california: !!detail.california,
    timestamp: Date.now(),
    version: 1,
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(persisted));
  applyConsent(persisted);
});

document.addEventListener('DOMContentLoaded', () => {
  initConfig();
  updateCartBadge();
  // Re-apply persisted consent on every page load so settings carry across navigation.
  const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (stored) {
    try { applyConsent(JSON.parse(stored)); } catch {}
  }
});
```

**Contract test** (run in devtools console on any preview page after `DOMContentLoaded`):

```javascript
// 1. Supabase wired
console.assert(typeof window._supabase?.from === 'function', 'Supabase client missing');
// 2. Helpers wired
console.assert(formatPrice(12345) === '$123.45', 'formatPrice broken');
console.assert(slugify('The Sunkeeper') === 'the-sunkeeper', 'slugify broken');
// 3. Cart wired
console.assert(Array.isArray(getCart()), 'getCart broken');
// 4. email-cta-submit listener responds
window.dispatchEvent(new CustomEvent('email-cta-submit', { detail: { source: 'newsletter-footer', email: 'cta-test@example.com' } }));
// → Network tab shows POST /api/subscribe with that payload, 200 response.
```

### C1.2 `<head>` default-deny gtag snippet (verify only — Track B owns)

Track B shipped the consent default block in the `<head>` of every page. The orchestrator's job is verification, not authoring.

**What must be true on every page**: BEFORE `gtag.js` loads, this block runs:

```html
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied'
  });
</script>
```

**Contract test** (bash, against preview):

```bash
LATEST=$(vercel ls 2>/dev/null | grep -oE 'https://[^ ]+\.vercel\.app' | head -1)
for page in / /shop /product/placeholder-haven-i /cart /checkout /about /contact; do
  curl -s "$LATEST$page" | grep -c "consent.*default.*denied" || echo "MISSING on $page"
done
# Expect: each call prints a number ≥ 1, none print "MISSING".
```

If any page is missing the block, that's a Track B regression — **stop, surface to Sean, do not patch into `main.js`**. The default-deny must run before `main.js` even parses.

### C1.3 Cookie banner persistence (verify only — Track B owns)

Track B shipped the banner JS as part of `assets/js/ui.js`. The orchestrator confirms the dispatched events match what `main.js` listens for, and that footer revoke works.

**What must be true** (browser walkthrough on the preview):

1. Clear localStorage. Reload any page. Banner appears.
2. Click **Accept**. Banner closes. `localStorage.getItem('everlastings.consent')` returns the JSON shape `{ analytics, advertising, california, timestamp, version }`. `gtag('consent','update',{...granted})` and `fbq('consent','grant')` are visible in Network tab.
3. Reload page. Banner does NOT reappear. `applyConsent` re-fires from the stored value (visible in Network).
4. Click footer "Privacy preferences" link (`data-cookie-revoke`). Banner reopens.
5. Click **Decline**. All four consent values denied. localStorage updates.

If any step fails, **stop, surface to Sean** — Track B owns the banner; don't patch around it.

### C1 verification gate

- [ ] `assets/js/main.js` exists and the contract tests above pass on the latest preview.
- [ ] Every page loads `main.js` in `<head>` after the Supabase CDN script.
- [ ] Default-deny gtag block present on every page (bash test).
- [ ] Cookie banner walkthrough green on the preview.
- [ ] Devtools console clean (no errors) on every page after `DOMContentLoaded`.
- [ ] Sean signs off on Design Review Checkpoint A: cookie banner copy / placement, newsletter forms on every page that has one. Cosmetic feedback flows into the parallel iteration loop and does NOT block C2.

---

## C2 — Per-page wiring

Per-page modules consuming the C1 foundation. Each replaces a `<!-- PLACEHOLDER: name -->` block in the corresponding HTML page. Track B's `data-*` attribute map (Appendix A) is the contract — every attribute is wired, none are renamed.

### C2.1 `assets/js/product.js`

**Path**: `assets/js/product.js`

**Contract**: page reads slug from URL (`/product/<slug>`), fetches product via Supabase, populates the `data-product-*` hooks Track B shipped, wires Add to Cart / Buy Now, fires `view_item` and Meta `ViewContent`, sets up the contemplation popup, and renders related products. The product-interest sticky card and contemplation popup forms dispatch `email-cta-submit` events; `main.js`'s global listener handles the API call.

**Code**:

```javascript
// assets/js/product.js

document.addEventListener('DOMContentLoaded', async () => {
  const slug = (() => {
    const path = window.location.pathname.match(/^\/product\/([^/]+)\/?$/);
    if (path) return path[1];
    return new URLSearchParams(window.location.search).get('slug');
  })();
  if (!slug) {
    revealNotFound();
    return;
  }

  // Wait for Supabase to initialize (initConfig is async).
  await waitForSupabase();

  const product = await getProductBySlug(slug);
  if (!product) {
    revealNotFound();
    return;
  }

  populateProduct(product);
  wireGallery(product);
  wireCartButtons(product);
  fireViewItem(product);
  scheduleContemplationPopup(product);
  renderRelatedProducts(product);
});

async function waitForSupabase() {
  for (let i = 0; i < 50 && !getSupabase(); i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

function revealNotFound() {
  document.querySelector('[data-product-not-found]')?.classList.remove('hidden');
  document.querySelector('[data-product-content]')?.classList.add('hidden');
}

function populateProduct(p) {
  const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
  const setHTML = (sel, val) => { const el = document.querySelector(sel); if (el) el.innerHTML = val; };
  set('[data-product-title]', p.title);
  set('[data-product-headline]', p.headline || '');
  set('[data-product-price]', formatPrice(p.price));
  set('[data-product-series]', p.series || '');
  set('[data-product-product-type]', p.product_type);
  set('[data-product-dimensions]', p.dimensions || '');
  set('[data-product-weight]', p.weight || '');
  set('[data-product-power-supply]', p.power_supply || '');

  setHTML('[data-product-story]', (p.story_card || '').split('\n\n').map((para) => `<p>${escapeHTML(para)}</p>`).join(''));

  populateList('[data-product-features]', p.features);
  populateList('[data-product-materials]', p.materials);
  populateList('[data-product-care-instructions]', p.care_instructions);
  populateList('[data-product-shipping-details]', p.shipping_details);

  const hero = document.querySelector('[data-product-hero]');
  if (hero) {
    const heroImg = (p.images || []).find((i) => /\/(?:test_)?hero-/.test(i.url)) || (p.images || [])[0];
    if (heroImg) {
      hero.src = heroImg.url;
      hero.alt = heroImg.alt || p.title;
      hero.onerror = () => hero.classList.add('image-fallback');
    }
  }

  if (p.available === false) {
    document.querySelector('[data-product-sold]')?.classList.remove('hidden');
    document.querySelectorAll('[data-product-buy-button]').forEach((btn) => { btn.disabled = true; });
  }

  // SEO: dynamic title + meta description
  if (p.seo_title) document.title = p.seo_title;
  if (p.seo_description) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', p.seo_description);
  }
}

function populateList(selector, items) {
  const el = document.querySelector(selector);
  if (!el || !Array.isArray(items)) return;
  el.innerHTML = items.map((item) => `<li>${escapeHTML(item)}</li>`).join('');
}

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function wireGallery(p) {
  const thumbs = document.querySelector('[data-product-gallery-thumbs]');
  if (!thumbs) return;
  const galleryImages = (p.images || []).filter((i) => /\/(?:test_)?gallery-/.test(i.url));
  thumbs.innerHTML = galleryImages.map((img, i) => `
    <button class="gallery-thumb" data-gallery-index="${i}" aria-label="View image ${i + 1}">
      <img src="${img.url}" alt="${escapeHTML(img.alt || p.title)}" loading="lazy">
    </button>
  `).join('');
  thumbs.addEventListener('click', (e) => {
    const btn = e.target.closest('.gallery-thumb');
    if (!btn) return;
    const idx = Number(btn.dataset.galleryIndex);
    const lightbox = document.querySelector('[data-product-lightbox]');
    const lightboxImg = lightbox?.querySelector('img');
    if (lightbox && lightboxImg) {
      lightboxImg.src = galleryImages[idx].url;
      lightboxImg.alt = galleryImages[idx].alt || '';
      lightbox.classList.remove('hidden');
    }
  });
  document.querySelector('[data-product-lightbox-close]')?.addEventListener('click', () => {
    document.querySelector('[data-product-lightbox]')?.classList.add('hidden');
  });
}

function wireCartButtons(p) {
  document.querySelectorAll('[data-product-buy-button]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      addToCart({
        product_id: p.id,
        slug: p.slug,
        title: p.title,
        price: p.price,
        thumbnail: p.thumbnail,
        product_type: p.product_type,
        series: p.series,
        stripe_price_id: p.stripe_price_id,
      });
      const action = btn.dataset.productBuyButton;
      if (action === 'buy-now') window.location.href = '/cart.html';
    });
  });
}

function fireViewItem(p) {
  if (typeof gtag === 'function') {
    gtag('event', 'view_item', {
      currency: 'USD',
      value: p.price / 100,
      items: [buildGa4Item(p)],
    });
  }
  trackMeta('ViewContent', {
    content_ids: [p.slug],
    content_type: 'product',
    content_name: p.title,
    value: p.price / 100,
    currency: 'USD',
  });

  document.querySelectorAll('video[data-product-video]').forEach((video) => {
    video.addEventListener('play', () => {
      if (typeof gtag === 'function') gtag('event', 'video_play', { item_id: p.slug });
    }, { once: true });
  });
}

function scheduleContemplationPopup(p) {
  const popup = document.querySelector('[data-product-contemplation-popup]');
  if (!popup) return;
  const shownKey = 'everlastings.contemplation_shown';
  if (sessionStorage.getItem(shownKey)) return;

  setTimeout(() => {
    if (sessionStorage.getItem(shownKey)) return;
    sessionStorage.setItem(shownKey, '1');
    popup.classList.remove('hidden');
  }, 3 * 60 * 1000);

  const form = popup.querySelector('form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('[type="email"]').value.trim();
    if (!email) return;
    window.dispatchEvent(new CustomEvent('email-cta-submit', {
      detail: { source: 'contemplation-offer', email, productSlug: p.slug },
    }));
  });

  window.addEventListener('email-cta-success', (e) => {
    if (e.detail?.source !== 'contemplation-offer') return;
    popup.querySelector('[data-popup-success]')?.classList.remove('hidden');
    popup.querySelector('[data-popup-form]')?.classList.add('hidden');
    if (e.detail?.promo_code) {
      const codeEl = popup.querySelector('[data-popup-code]');
      if (codeEl) codeEl.textContent = e.detail.promo_code;
    }
  });

  popup.querySelector('[data-popup-close]')?.addEventListener('click', () => {
    popup.classList.add('hidden');
  });
}

// Wire the sticky product-interest CTA card too — same pattern.
document.addEventListener('DOMContentLoaded', () => {
  const interestForm = document.querySelector('[data-product-interest-form]');
  interestForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const slug = interestForm.dataset.productSlug;
    const email = interestForm.querySelector('[type="email"]').value.trim();
    if (!email || !slug) return;
    window.dispatchEvent(new CustomEvent('email-cta-submit', {
      detail: { source: 'product-interest', email, productSlug: slug },
    }));
  });
  window.addEventListener('email-cta-success', (e) => {
    if (e.detail?.source !== 'product-interest') return;
    document.querySelector('[data-product-interest-success]')?.classList.remove('hidden');
    document.querySelector('[data-product-interest-form]')?.classList.add('hidden');
  });
});

async function renderRelatedProducts(p) {
  const grid = document.querySelector('[data-product-related-grid]');
  if (!grid) return;
  const all = await getProducts({ available: true });
  const related = all
    .filter((x) => x.id !== p.id && (x.series === p.series || x.product_type === p.product_type))
    .slice(0, 3);
  if (related.length === 0) {
    grid.classList.add('hidden');
    return;
  }
  grid.innerHTML = related.map((rp) => `
    <a class="product-tile" href="/product/${rp.slug}">
      <img src="${rp.thumbnail}" alt="${escapeHTML(rp.thumbnail_alt || rp.title)}" loading="lazy">
      <h3>${escapeHTML(rp.title)}</h3>
      <p class="price">${formatPrice(rp.price)}</p>
    </a>
  `).join('');
}
```

**Contract test** (preview URL):

1. Visit `<preview>/product/placeholder-haven-i` — page renders title, price, hero image, story paragraphs, gallery thumbs, related grid.
2. Click hero → lightbox opens; click close → lightbox hides.
3. Click **Add to Cart** → cart badge increments; localStorage `everlastings_cart` has the entry; GA4 DebugView shows `add_to_cart`.
4. Visit `/product/does-not-exist` → `data-product-not-found` reveals; `data-product-content` hides.
5. Visit `/product/placeholder-seasonal-piece` (where `available=false`) → `data-product-sold` reveals; Add to Cart buttons disabled.

### C2.2 `assets/js/shop.js`

**Path**: `assets/js/shop.js`

**Contract**: fetches all products, renders tiles, wires filter checkboxes (`data-shop-filter`), wires sort select (`data-shop-sort`), supports URL state, handles all four empty states.

**Code**:

```javascript
// assets/js/shop.js

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabaseShop();

  const products = await getProducts();

  if (products.length === 0) {
    showState('data-shop-no-products');
    return;
  }

  initFromURL();
  renderTiles(products);
  wireFilters(products);
  wireSort(products);
  hideState('data-shop-loading');
});

async function waitForSupabaseShop() {
  for (let i = 0; i < 50 && !getSupabase(); i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

function showState(attr) {
  document.querySelectorAll(`[${attr}]`).forEach((el) => el.classList.remove('hidden'));
}
function hideState(attr) {
  document.querySelectorAll(`[${attr}]`).forEach((el) => el.classList.add('hidden'));
}

function initFromURL() {
  const params = new URLSearchParams(window.location.search);
  ['series', 'product_type', 'availability'].forEach((key) => {
    const val = params.get(key);
    if (!val) return;
    document.querySelectorAll(`[data-shop-filter="${key}"][value="${val}"]`).forEach((cb) => { cb.checked = true; });
  });
  const sort = params.get('sort');
  if (sort) {
    const sel = document.querySelector('[data-shop-sort]');
    if (sel) sel.value = sort;
  }
}

function getActiveFilters() {
  const filters = { series: [], product_type: [], availability: [] };
  document.querySelectorAll('[data-shop-filter]:checked').forEach((cb) => {
    const key = cb.dataset.shopFilter;
    if (filters[key]) filters[key].push(cb.value);
  });
  return filters;
}

function applyFilters(products, filters) {
  return products.filter((p) => {
    if (filters.series.length && !filters.series.includes(p.series)) return false;
    if (filters.product_type.length && !filters.product_type.includes(p.product_type)) return false;
    if (filters.availability.length === 1) {
      const want = filters.availability[0] === 'available';
      if (p.available !== want) return false;
    }
    return true;
  });
}

function applySort(products, sort) {
  const sorted = [...products];
  switch (sort) {
    case 'price-asc': sorted.sort((a, b) => a.price - b.price); break;
    case 'price-desc': sorted.sort((a, b) => b.price - a.price); break;
    case 'oldest': sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
    case 'newest':
    default: sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  // featured products always float
  sorted.sort((a, b) => Number(b.featured) - Number(a.featured));
  return sorted;
}

function renderTiles(allProducts) {
  const grid = document.querySelector('[data-shop-grid]');
  if (!grid) return;

  const filters = getActiveFilters();
  const sort = document.querySelector('[data-shop-sort]')?.value || 'newest';

  let visible = applyFilters(allProducts, filters);
  visible = applySort(visible, sort);

  hideState('data-shop-no-products');
  hideState('data-shop-all-sold');
  hideState('data-shop-filter-empty');

  if (visible.length === 0) {
    const filterActive = filters.series.length || filters.product_type.length || filters.availability.length;
    if (filterActive) {
      showState('data-shop-filter-empty');
    } else if (allProducts.every((p) => !p.available)) {
      showState('data-shop-all-sold');
    } else {
      showState('data-shop-no-products');
    }
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = visible.map((p) => `
    <a class="product-tile" href="/product/${p.slug}" data-series="${escapeAttr(p.series || '')}" data-product-type="${escapeAttr(p.product_type)}" data-available="${p.available}">
      <div class="tile-media">
        <img src="${p.thumbnail}" alt="${escapeAttr(p.thumbnail_alt || p.title)}" loading="lazy">
        ${p.available ? '' : '<span class="sold-badge">Sold</span>'}
      </div>
      <h3>${escapeAttr(p.title)}</h3>
      <p class="price">${formatPrice(p.price)}</p>
    </a>
  `).join('');
}

function escapeAttr(s) {
  return String(s ?? '').replace(/"/g, '&quot;');
}

function wireFilters(products) {
  document.querySelectorAll('[data-shop-filter]').forEach((cb) => {
    cb.addEventListener('change', () => {
      syncURL();
      renderTiles(products);
      const change = cb.dataset.shopFilter;
      if (typeof gtag === 'function') {
        gtag('event', 'search_filter', { filter_type: change, filter_value: cb.value, checked: cb.checked });
      }
    });
  });
  document.querySelector('[data-shop-clear-filters]')?.addEventListener('click', () => {
    document.querySelectorAll('[data-shop-filter]:checked').forEach((cb) => { cb.checked = false; });
    syncURL();
    renderTiles(products);
  });
}

function wireSort(products) {
  document.querySelector('[data-shop-sort]')?.addEventListener('change', () => {
    syncURL();
    renderTiles(products);
  });

  // Newsletter form on the all-sold empty state.
  document.querySelector('[data-shop-all-sold] form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('[type="email"]').value.trim();
    if (email) {
      window.dispatchEvent(new CustomEvent('email-cta-submit', { detail: { source: 'newsletter-shop-empty', email } }));
    }
  });
}

function syncURL() {
  const params = new URLSearchParams();
  const filters = getActiveFilters();
  ['series', 'product_type', 'availability'].forEach((k) => {
    if (filters[k].length === 1) params.set(k, filters[k][0]);
  });
  const sort = document.querySelector('[data-shop-sort]')?.value;
  if (sort && sort !== 'newest') params.set('sort', sort);
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}
```

**Contract test** (preview URL):

1. Visit `<preview>/shop` — grid renders with all 6 placeholder products (or however many real products exist).
2. Check `series=Portals to Peace` filter → grid narrows to 2 placeholders; URL becomes `?series=Portals to Peace`.
3. Sort by `price-asc` → tiles re-order; URL appends `&sort=price-asc`.
4. Reload page with the URL → filter and sort are preserved.
5. Apply filters that yield zero matches → `data-shop-filter-empty` reveals with Clear filters CTA.

### C2.3 `assets/js/homepage.js`

**Path**: `assets/js/homepage.js`

**Contract**: fetches featured products, populates the carousel, applies a `homepage_theme` if any product carries one, fires `view_item_list` on the featured slot, wires the closing newsletter form to dispatch `email-cta-submit` with `source: 'newsletter-homepage'`.

**Code**:

```javascript
// assets/js/homepage.js

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabaseHome();

  const featured = await getProducts({ featured: true, available: true });
  populateFeatured(featured);
  applyDynamicTheme(featured);
  wireRelatedHavensRow();
  wireHomepageNewsletter();
  fireViewList(featured);
});

async function waitForSupabaseHome() {
  for (let i = 0; i < 50 && !getSupabase(); i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

function populateFeatured(items) {
  const carousel = document.querySelector('[data-homepage-featured]');
  if (!carousel) return;
  if (items.length === 0) {
    carousel.classList.add('hidden');
    return;
  }
  carousel.innerHTML = items.map((p) => `
    <a class="featured-card" href="/product/${p.slug}">
      <img src="${p.thumbnail}" alt="${escapeHomeAttr(p.thumbnail_alt || p.title)}" loading="lazy">
      <h3>${escapeHomeAttr(p.title)}</h3>
      <p>${escapeHomeAttr(p.headline || '')}</p>
    </a>
  `).join('');
}

async function wireRelatedHavensRow() {
  const row = document.querySelector('[data-homepage-related-row]');
  if (!row) return;
  const all = await getProducts({ available: true });
  const sample = all.slice(0, 3);
  row.innerHTML = sample.map((p) => `
    <a class="haven-tile" href="/product/${p.slug}">
      <img src="${p.thumbnail}" alt="${escapeHomeAttr(p.thumbnail_alt || p.title)}" loading="lazy">
      <h4>${escapeHomeAttr(p.title)}</h4>
    </a>
  `).join('');
}

function applyDynamicTheme(items) {
  const theme = items.find((p) => p.homepage_theme)?.homepage_theme;
  if (!theme || typeof theme !== 'object') return;
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    if (typeof value === 'string') root.style.setProperty(`--${key}`, value);
  });
}

function wireHomepageNewsletter() {
  const form = document.querySelector('[data-homepage-newsletter-form]');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('[type="email"]').value.trim();
    if (email) window.dispatchEvent(new CustomEvent('email-cta-submit', { detail: { source: 'newsletter-homepage', email } }));
  });
  window.addEventListener('email-cta-success', (e) => {
    if (e.detail?.source !== 'newsletter-homepage') return;
    document.querySelector('[data-homepage-newsletter-success]')?.classList.remove('hidden');
    document.querySelector('[data-homepage-newsletter-form]')?.classList.add('hidden');
  });
}

function fireViewList(items) {
  if (typeof gtag === 'function' && items.length) {
    gtag('event', 'view_item_list', {
      item_list_name: 'Featured',
      items: items.map(buildGa4Item),
    });
  }
}

function escapeHomeAttr(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

**Contract test**: visit `<preview>/` — featured carousel renders the placeholder havens marked `featured: true`; submit the closing newsletter form → `email-cta-submit` fires with `source: 'newsletter-homepage'` (Network tab); GA4 DebugView shows `view_item_list`.

### C2.4 `assets/js/newsletter.js`

**Path**: `assets/js/newsletter.js`

**Contract**: thin wrapper for the cart-exit-intent modal. Detects `mouseleave` on the document or `visibilitychange` to hidden; shows the modal once per session if cart is non-empty. Modal form dispatches `email-cta-submit` with `source: 'cart-exit'`. Footer newsletter form across pages dispatches `source: 'newsletter-footer'` (verify Track B already wired this; if not, wire it here).

**Code**:

```javascript
// assets/js/newsletter.js

document.addEventListener('DOMContentLoaded', () => {
  wireExitIntentModal();
  wireFooterNewsletter();
});

function wireExitIntentModal() {
  const modal = document.querySelector('[data-cart-exit-modal]');
  if (!modal) return;
  const shownKey = 'everlastings.cart_exit_shown';
  if (sessionStorage.getItem(shownKey)) return;

  const trigger = () => {
    if (sessionStorage.getItem(shownKey)) return;
    if (getCart().length === 0) return;
    sessionStorage.setItem(shownKey, '1');
    modal.classList.remove('hidden');
    document.removeEventListener('mouseleave', onLeave);
    document.removeEventListener('visibilitychange', onHidden);
  };
  const onLeave = (e) => { if (e.clientY <= 0) trigger(); };
  const onHidden = () => { if (document.visibilityState === 'hidden') trigger(); };
  document.addEventListener('mouseleave', onLeave);
  document.addEventListener('visibilitychange', onHidden);

  const form = modal.querySelector('form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('[type="email"]').value.trim();
    if (email) window.dispatchEvent(new CustomEvent('email-cta-submit', { detail: { source: 'cart-exit', email } }));
  });
  modal.querySelector('[data-modal-close]')?.addEventListener('click', () => modal.classList.add('hidden'));

  window.addEventListener('email-cta-success', (e) => {
    if (e.detail?.source !== 'cart-exit') return;
    modal.querySelector('[data-modal-success]')?.classList.remove('hidden');
    modal.querySelector('form')?.classList.add('hidden');
  });
}

function wireFooterNewsletter() {
  document.querySelectorAll('[data-newsletter-footer-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.querySelector('[type="email"]').value.trim();
      if (!email) return;
      window.dispatchEvent(new CustomEvent('email-cta-submit', { detail: { source: 'newsletter-footer', email } }));
    });
  });
  window.addEventListener('email-cta-success', (e) => {
    if (e.detail?.source !== 'newsletter-footer') return;
    document.querySelectorAll('[data-newsletter-footer-success]').forEach((el) => el.classList.remove('hidden'));
    document.querySelectorAll('[data-newsletter-footer-form]').forEach((el) => el.classList.add('hidden'));
  });
}
```

**Contract test**: on the preview, add an item to cart, then move the cursor toward the top of the window quickly → exit-intent modal appears; submit it → `email-cta-submit` with `source: 'cart-exit'` fires.

### C2 verification gate

- [ ] All four C2 files exist and pass their contract tests on the latest preview.
- [ ] `grep -rn 'PLACEHOLDER:' assets/js/ index.html shop.html product.html cart.html checkout.html complete.html | grep -v 'archive\|node_modules'` returns zero results in the dynamic-content blocks the C2 modules own. (Track B-owned static placeholders, e.g. testimonial copy, may remain — those are Iterating per the design-review ledger.)
- [ ] GA4 DebugView shows `view_item`, `add_to_cart`, `view_item_list`, `search_filter` firing at the expected moments.
- [ ] Devtools console clean on every page after `DOMContentLoaded`.
- [ ] **Design Review Checkpoint B** — orchestrator pauses, posts the latest preview URLs to Sean (one per page in the shared Google Doc), and waits for sign-off. Sean conducts the review himself; cosmetic feedback feeds the parallel iteration loop and is applied at the next phase boundary. Structural feedback escalates per § Escalation triggers. Emaline begins her parallel review here if enough real products have loaded via the Custom GPT pipeline that the placeholder catalog is partially replaced.

---

## C3 — Cart + checkout end-to-end

The 409-availability check happens at `/cart.html` BEFORE any PII is entered (per AR #28). The checkout page never triggers the 409 recovery flow — its only edge case is 410 hold-expired. Three modules + one inline script.

### C3.1 `assets/js/recovery.js`

Shared overlay rendering + form wiring used by `cart.js`. Lands first because `cart.js` imports its functions.

**Path**: `assets/js/recovery.js`

**Code**:

```javascript
// assets/js/recovery.js — shared 409-cart-recovery overlay

function renderRecoveryStep1(unavailableNames, related) {
  const safeNames = unavailableNames.map(escapeRec).join(', ');
  const relatedHTML = (related || []).slice(0, 3).map((p) => `
    <a class="recovery-related-card" href="/product/${escapeRec(p.slug)}">
      <img src="${escapeRec(p.thumbnail)}" alt="${escapeRec(p.thumbnail_alt || p.title)}" loading="lazy">
      <span>${escapeRec(p.title)}</span>
    </a>
  `).join('');
  return `
    <div class="recovery-overlay-inner" role="dialog" aria-labelledby="recovery-heading">
      <h2 id="recovery-heading">These havens have found their homes</h2>
      <p data-sold-recovery-list>${safeNames} sold while you were browsing. We're sorry for the heartache.</p>
      <p>As a thank you for your interest, here's a one-time discount on your next purchase:</p>
      <form data-sold-recovery-form>
        <label for="recovery-email" class="visually-hidden">Email</label>
        <input id="recovery-email" type="email" name="email" placeholder="Your email" required>
        <button type="submit">Send My Discount</button>
      </form>
      <button type="button" class="link-button" data-sold-recovery-continue>Continue with remaining items</button>
      ${relatedHTML ? `
        <div class="recovery-related" data-sold-recovery-related-grid>
          <p class="related-heading">While you're here — these havens still await:</p>
          <div class="related-cards-mini">${relatedHTML}</div>
        </div>
      ` : ''}
      <div data-sold-recovery-code class="hidden">
        <h3>A small gift for your patience</h3>
        <p>Use code <strong data-sold-recovery-code-value></strong> for 10% off your next purchase.</p>
        <p>Valid for 30 days. We've also emailed it to you.</p>
        <a class="button" href="/shop.html">Continue Shopping</a>
      </div>
    </div>
  `;
}

function wireRecoveryForm(overlayEl, unavailableSlugs, options = {}) {
  const form = overlayEl.querySelector('[data-sold-recovery-form]');
  const codeBlock = overlayEl.querySelector('[data-sold-recovery-code]');
  const codeValue = overlayEl.querySelector('[data-sold-recovery-code-value]');
  const continueBtn = overlayEl.querySelector('[data-sold-recovery-continue]');

  // Pre-fill email from sessionStorage if available.
  const savedEmail = sessionStorage.getItem('checkout_email') || '';
  if (savedEmail) form.querySelector('input[type="email"]').value = savedEmail;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating…';
    const email = form.querySelector('input[type="email"]').value.trim();
    sessionStorage.setItem('checkout_email', email);

    try {
      const res = await fetch('/api/cart-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lost_items: unavailableSlugs.map((s) => ({ slug: s })) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      form.classList.add('hidden');
      codeBlock.classList.remove('hidden');
      if (codeValue && data.code) codeValue.textContent = data.code;
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send My Discount';
      const errEl = document.createElement('p');
      errEl.className = 'error';
      errEl.textContent = 'Could not generate code. Please try again.';
      form.appendChild(errEl);
    }
  });

  continueBtn?.addEventListener('click', () => {
    overlayEl.classList.add('hidden');
    if (typeof options.onContinue === 'function') options.onContinue();
  });
}

function escapeRec(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

**Contract test**: not directly testable (consumed by `cart.js`); covered by C3.2's contract test.

### C3.2 `assets/js/cart.js`

**Path**: `assets/js/cart.js`

**Contract**: renders cart line items from localStorage, captures email/name (persisted to sessionStorage), `[CHECKOUT]` posts `/api/checkout/reserve`. On 200 → `begin_checkout` analytics + redirect to `/checkout.html`. On 409 → strip sold items from localStorage, render the recovery overlay via `recovery.js`. On 410 (hold expired immediately, rare) → reveal `data-cart-error`.

**Code**:

```javascript
// assets/js/cart.js

document.addEventListener('DOMContentLoaded', () => {
  const cart = getCart();
  const linesContainer = document.querySelector('[data-cart-lines]');
  const emptyState = document.querySelector('[data-cart-empty]');
  const totalEl = document.querySelector('[data-cart-total]');

  if (cart.length === 0) {
    linesContainer?.classList.add('hidden');
    emptyState?.classList.remove('hidden');
    return;
  }

  renderLines(cart, linesContainer);
  if (totalEl) totalEl.textContent = formatPrice(getCartTotal());

  // Pre-fill email/name from sessionStorage if user entered them earlier.
  const emailInput = document.querySelector('[data-cart-email]');
  const nameInput = document.querySelector('[data-cart-name]');
  if (emailInput) emailInput.value = sessionStorage.getItem('checkout_email') || '';
  if (nameInput) nameInput.value = sessionStorage.getItem('checkout_name') || '';

  document.querySelector('[data-cart-checkout]')?.addEventListener('click', onCheckoutClick);
});

function renderLines(cart, container) {
  if (!container) return;
  container.innerHTML = cart.map((item) => `
    <div class="cart-line" data-product-id="${item.product_id}">
      <img src="${escapeCart(item.thumbnail)}" alt="${escapeCart(item.title)}" class="cart-thumb" loading="lazy">
      <div class="cart-meta">
        <h3>${escapeCart(item.title)}</h3>
        <p class="price">${formatPrice(item.price)}</p>
      </div>
      <button class="cart-remove" data-cart-remove="${item.product_id}" aria-label="Remove ${escapeCart(item.title)}">Remove</button>
    </div>
  `).join('');
  container.querySelectorAll('[data-cart-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.cartRemove);
      window.location.reload();
    });
  });
}

async function onCheckoutClick(e) {
  e.preventDefault();
  const btn = e.currentTarget;
  const cart = getCart();
  if (cart.length === 0) return;

  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = 'Checking availability…';

  const email = document.querySelector('[data-cart-email]')?.value.trim() || '';
  const name = document.querySelector('[data-cart-name]')?.value.trim() || '';
  if (email) sessionStorage.setItem('checkout_email', email);
  if (name) sessionStorage.setItem('checkout_name', name);

  const session_id = getOrCreateBrowserSessionId();

  try {
    const res = await fetch('/api/checkout/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map((i) => ({ product_id: i.product_id, slug: i.slug })),
        session_id,
        email: email || undefined,
        name: name || undefined,
      }),
    });

    if (res.status === 409) {
      const data = await res.json();
      const unavailable = data.unavailable || [];
      const related = data.related || [];
      const unavailableNames = unavailable.map((slug) => {
        const item = cart.find((i) => i.slug === slug);
        return item ? item.title : slug;
      });
      unavailable.forEach((slug) => {
        const item = cart.find((i) => i.slug === slug);
        if (item) removeFromCart(item.product_id);
      });
      showRecoveryOverlay(unavailableNames, unavailable, related);
      btn.disabled = false;
      btn.textContent = originalLabel;
      return;
    }

    if (!res.ok) {
      revealError('Something went awry. Please try again.');
      btn.disabled = false;
      btn.textContent = originalLabel;
      return;
    }

    if (typeof gtag === 'function') {
      gtag('event', 'begin_checkout', {
        currency: 'USD',
        value: getCartTotal() / 100,
        items: cart.map(buildGa4Item),
      });
    }
    trackMeta('InitiateCheckout', {
      content_ids: cart.map((i) => i.slug),
      content_type: 'product',
      num_items: cart.length,
      value: getCartTotal() / 100,
      currency: 'USD',
    });

    window.location.href = '/checkout.html';
  } catch (err) {
    revealError('Could not reach the server. Please try again.');
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

function showRecoveryOverlay(names, slugs, related) {
  const overlay = document.querySelector('[data-sold-recovery]');
  if (!overlay) return;
  overlay.innerHTML = renderRecoveryStep1(names, related);
  overlay.classList.remove('hidden');
  wireRecoveryForm(overlay, slugs, {
    onContinue: () => {
      // Allow user to retry checkout with the reduced cart by clicking [CHECKOUT] again.
      overlay.classList.add('hidden');
      const remaining = getCart();
      const linesContainer = document.querySelector('[data-cart-lines]');
      if (linesContainer) renderLines(remaining, linesContainer);
      const totalEl = document.querySelector('[data-cart-total]');
      if (totalEl) totalEl.textContent = formatPrice(getCartTotal());
      if (remaining.length === 0) {
        linesContainer?.classList.add('hidden');
        document.querySelector('[data-cart-empty]')?.classList.remove('hidden');
      }
    },
  });
}

function revealError(msg) {
  const err = document.querySelector('[data-cart-error]');
  if (!err) return;
  err.textContent = msg;
  err.classList.remove('hidden');
}

function escapeCart(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

**Contract test** (preview, requires real placeholder products):

1. Visit `/product/placeholder-haven-i`, click Add to Cart, then visit `/cart.html` → cart-line for Haven I renders with thumbnail, title, price.
2. Click `[CHECKOUT]` → Network tab shows POST `/api/checkout/reserve` with the items array → 200 → page navigates to `/checkout.html`.
3. **409 simulation**: in Supabase Studio, set `available=false` for `placeholder-haven-i`, then come back and click `[CHECKOUT]` again → recovery overlay appears with "These havens have found their homes" copy, related cards, the email form. Submit form → `data-sold-recovery-code` reveals with a generated code from `/api/cart-recovery`. Restore `available=true` after the test.

### C3.3 `assets/js/checkout.js`

**Path**: `assets/js/checkout.js`

**Contract**: renders order summary; loads Stripe via `/api/config`; Stage A captures name + email + handles "Same as shipping" toggle, then POSTs `/api/checkout` to upgrade the soft hold to a real Stripe Session and unlocks Stage B; Stage B mounts AddressElement + PaymentElement + Confirm button; validates address inline; only US shipping; on confirm, Stripe redirects to `/complete.html?session_id=…`. 410 → bounce to `/cart.html`. No 409 path on this page.

**Code**:

```javascript
// assets/js/checkout.js

document.addEventListener('DOMContentLoaded', async () => {
  const cart = getCart();
  const sessionId = getOrCreateBrowserSessionId();

  if (cart.length === 0) {
    window.location.href = '/cart.html';
    return;
  }

  renderOrderSummary(cart);

  // Wait for Stripe key from /api/config.
  for (let i = 0; i < 50 && !window._stripePublishableKey; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!window._stripePublishableKey || typeof Stripe !== 'function') {
    showCheckoutError('Could not load checkout. Please refresh.');
    return;
  }
  const stripe = Stripe(window._stripePublishableKey);

  prefillStageA();
  wireStageA(stripe, cart, sessionId);
});

function renderOrderSummary(cart) {
  const el = document.querySelector('[data-checkout-order-summary]');
  if (!el) return;
  el.innerHTML = cart.map((item) => `
    <div class="order-item">
      <img src="${escapeCheckout(item.thumbnail)}" alt="${escapeCheckout(item.title)}" class="order-thumb" loading="lazy">
      <div><strong>${escapeCheckout(item.title)}</strong><span>${formatPrice(item.price)}</span></div>
    </div>
  `).join('') + `<div class="order-total"><strong>Total: ${formatPrice(getCartTotal())}</strong></div>`;
}

function prefillStageA() {
  const emailInput = document.querySelector('[data-checkout-email]');
  const nameInput = document.querySelector('[data-checkout-name]');
  if (emailInput) emailInput.value = sessionStorage.getItem('checkout_email') || '';
  if (nameInput) nameInput.value = sessionStorage.getItem('checkout_name') || '';
}

function wireStageA(stripe, cart, sessionId) {
  const stageA = document.querySelector('[data-stage-a-info]');
  const stageB = document.querySelector('[data-stage-b-payment]');
  const continueBtn = document.querySelector('[data-checkout-continue]');

  continueBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.querySelector('[data-checkout-email]')?.value.trim() || '';
    const name = document.querySelector('[data-checkout-name]')?.value.trim() || '';
    if (!email || !name) {
      showCheckoutError('Please complete your name and email.');
      return;
    }
    sessionStorage.setItem('checkout_email', email);
    sessionStorage.setItem('checkout_name', name);
    continueBtn.disabled = true;
    continueBtn.textContent = 'Loading payment…';

    let data;
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((i) => ({ product_id: i.product_id, slug: i.slug, stripe_price_id: i.stripe_price_id })),
          session_id: sessionId,
          email,
          name,
        }),
      });
      if (res.status === 410) {
        document.querySelector('[data-hold-expired]')?.classList.remove('hidden');
        showCheckoutError('Your reservation timed out. Returning to cart…');
        setTimeout(() => { window.location.href = '/cart.html'; }, 2000);
        return;
      }
      if (!res.ok) {
        showCheckoutError('Something went awry. Please try again.');
        continueBtn.disabled = false;
        continueBtn.textContent = 'Continue';
        return;
      }
      data = await res.json();
    } catch (err) {
      showCheckoutError('Unable to load checkout. Please refresh.');
      return;
    }

    await mountStageB(stripe, data, stageA, stageB);
  });

  document.querySelector('[data-checkout-billing-toggle]')?.addEventListener('change', (e) => {
    document.querySelector('[data-stripe-address-billing]')?.classList.toggle('hidden', e.target.checked);
  });
}

async function mountStageB(stripe, data, stageA, stageB) {
  if (!data?.clientSecret) {
    showCheckoutError('Checkout not ready. Please refresh.');
    return;
  }
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

  const paymentElement = checkout.createPaymentElement();
  paymentElement.mount('[data-stripe-payment]');

  const shippingElement = checkout.createAddressElement('shipping', { allowedCountries: ['US'] });
  shippingElement.mount('[data-stripe-address-shipping]');
  shippingElement.on('change', (ev) => {
    if (ev.complete === false && ev.value?.country && ev.value.country !== 'US') {
      showCheckoutError('We currently only ship within the United States. Contact us for international inquiries.');
    } else if (ev.complete === false) {
      showCheckoutError('Please complete your shipping address.');
    } else {
      hideCheckoutError();
    }
  });

  if (document.querySelector('[data-stripe-address-billing]')) {
    const billingElement = checkout.createAddressElement('billing');
    billingElement.mount('[data-stripe-address-billing]');
  }

  checkout.on('change', (session) => {
    const confirmBtn = document.querySelector('[data-checkout-confirm]');
    if (confirmBtn) confirmBtn.disabled = !session.canConfirm;
  });

  stageA?.classList.add('collapsed');
  stageB?.classList.remove('hidden');
  stageB?.scrollIntoView({ behavior: 'smooth' });

  document.querySelector('[data-checkout-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const confirmBtn = document.querySelector('[data-checkout-confirm]');
    if (!confirmBtn) return;
    confirmBtn.disabled = true;
    const originalLabel = confirmBtn.textContent;
    confirmBtn.textContent = 'Processing…';
    try {
      const actions = await checkout.loadActions();
      const result = await actions.confirm();
      if (result?.type === 'error') {
        showCheckoutError(result.error?.message || 'Payment could not be processed.');
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalLabel;
      }
      // Success path: Stripe redirects to /complete.html?session_id=…
    } catch (err) {
      showCheckoutError('Payment could not be processed. Please try again.');
      confirmBtn.disabled = false;
      confirmBtn.textContent = originalLabel;
    }
  });
}

function showCheckoutError(message) {
  const el = document.querySelector('[data-checkout-error]');
  const msgEl = document.querySelector('[data-checkout-error-message]') || el;
  if (!el || !msgEl) return;
  msgEl.textContent = message;
  el.classList.remove('hidden');
}

function hideCheckoutError() {
  document.querySelector('[data-checkout-error]')?.classList.add('hidden');
}

function escapeCheckout(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

**Contract test** (preview, requires Stripe Dashboard webhook registered to the dev alias — see C3.5):

1. Add a placeholder product to cart, visit `/cart.html`, click `[CHECKOUT]` (200 from `/api/checkout/reserve`), land on `/checkout.html`.
2. Stage A: enter name + email, click Continue → POST `/api/checkout` returns `{ clientSecret }`.
3. Stage B: AddressElement and PaymentElement mount. Enter Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC, any US address.
4. Click Confirm → Stripe redirects to `/complete.html?session_id=cs_test_…`.
5. **410 simulation**: open `/checkout.html`, idle 16+ minutes (or manually expire the hold via Supabase Studio), click Continue → `data-hold-expired` reveals, redirect to `/cart.html` after 2s.

### C3.4 `assets/js/complete.js`

**Path**: `assets/js/complete.js`. Loaded by `complete.html` via a `<script src>` tag.

**Contract**: reads `?session_id=…` from the URL, GETs `/api/session-status?session_id=…`, populates the success state on `complete`, fires GA4 `purchase` and Meta `Purchase` (deduped server-side via the webhook's `event_id`), clears the cart, optionally surfaces the post-purchase newsletter form.

**Code**:

```javascript
// assets/js/complete.js

document.addEventListener('DOMContentLoaded', async () => {
  const sessionId = new URLSearchParams(window.location.search).get('session_id');
  if (!sessionId) {
    revealCompleteError('Something went awry.');
    return;
  }

  try {
    const res = await fetch(`/api/session-status?session_id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) {
      revealCompleteError('Unable to verify your order. Please check your email for confirmation.');
      return;
    }
    const data = await res.json();

    if (data.status === 'complete') {
      hide('[data-complete-loading]');
      reveal('[data-complete-success]');

      setText('[data-complete-customer-name]', data.customer_name || '');
      setText('[data-complete-email]', data.customer_email || '');
      setText('[data-complete-total]', formatPrice(data.amount_total || 0));
      setText('[data-complete-order-id]', sessionId);

      const lineEl = document.querySelector('[data-complete-line-items]');
      if (lineEl && Array.isArray(data.items)) {
        lineEl.innerHTML = data.items.map((it) => `
          <li><strong>${escapeComplete(it.title)}</strong> — ${formatPrice(it.price)}</li>
        `).join('');
      }

      const shipEl = document.querySelector('[data-complete-shipping]');
      if (shipEl && data.shipping_address) {
        const a = data.shipping_address;
        shipEl.innerHTML = [a.line1, a.line2, `${a.city}, ${a.state} ${a.postal_code}`, a.country].filter(Boolean).map(escapeComplete).join('<br>');
      }

      if (typeof gtag === 'function') {
        gtag('event', 'purchase', {
          transaction_id: sessionId,
          currency: 'USD',
          value: (data.amount_total || 0) / 100,
          items: (data.items || []).map(buildGa4Item),
        });
      }
      trackMeta('Purchase', {
        content_ids: (data.items || []).map((i) => i.slug),
        content_type: 'product',
        value: (data.amount_total || 0) / 100,
        currency: 'USD',
        num_items: (data.items || []).length,
        eventID: data.stripe_event_id,
      });

      clearCart();
      wirePostPurchaseNewsletter(data.customer_email);
    } else {
      revealCompleteError('Something went awry. Please try again.');
    }
  } catch (err) {
    revealCompleteError('Unable to verify your order. Please check your email for confirmation.');
  }
});

function wirePostPurchaseNewsletter(email) {
  const form = document.querySelector('[data-complete-newsletter] form');
  if (!form) return;
  const emailInput = form.querySelector('[type="email"]');
  if (emailInput && email) emailInput.value = email;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = emailInput?.value.trim();
    if (!v) return;
    window.dispatchEvent(new CustomEvent('email-cta-submit', { detail: { source: 'newsletter-customer', email: v } }));
  });
  window.addEventListener('email-cta-success', (e) => {
    if (e.detail?.source !== 'newsletter-customer') return;
    document.querySelector('[data-complete-newsletter-success]')?.classList.remove('hidden');
    document.querySelector('[data-complete-newsletter] form')?.classList.add('hidden');
  });
}

function revealCompleteError(msg) {
  hide('[data-complete-loading]');
  hide('[data-complete-success]');
  const errEl = document.querySelector('[data-complete-error]');
  if (errEl) {
    const msgEl = errEl.querySelector('[data-complete-error-message]') || errEl;
    msgEl.textContent = msg;
    errEl.classList.remove('hidden');
  }
}

function reveal(sel) { document.querySelector(sel)?.classList.remove('hidden'); }
function hide(sel) { document.querySelector(sel)?.classList.add('hidden'); }
function setText(sel, val) { const el = document.querySelector(sel); if (el) el.textContent = val; }
function escapeComplete(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

**Contract test**: continued from C3.3 step 4. After Stripe redirects, `/complete.html?session_id=cs_test_…` renders the success state with order ID, line items, shipping summary, total. GA4 DebugView fires `purchase`. Cart is cleared. Submitting the post-purchase newsletter form fires `email-cta-submit` with `source: 'newsletter-customer'`.

### C3.5 Stripe webhook end-to-end on preview (orchestrator action, not a code deliverable)

- [ ] Stripe Dashboard → Developers → Webhooks: register an endpoint at `https://everlastings-website-git-dev-everlastingsbyemaline.vercel.app/api/webhook` for events `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`. Use the **test-mode** webhook secret; ensure `STRIPE_WEBHOOK_SECRET` in Vercel preview env scope matches.
- [ ] Dashboard "Send test webhook" against each registered event → check Vercel logs (`vercel logs <preview-deployment>`) for 200 from `/api/webhook` per event.

### C3 verification gate

- [ ] Stripe test card `4242 4242 4242 4242` round-trips cart → checkout → complete on the preview, with the success page rendering the order details from `/api/session-status`.
- [ ] 409 simulation surfaces the recovery overlay with promo code on email submit.
- [ ] 410 simulation redirects to `/cart.html` with the hold-expired message.
- [ ] Vercel logs show `/api/webhook` 200 responses for each Stripe event during the happy path.
- [ ] **Design Review Checkpoint C** — Sean does a real-card-then-refund smoke test on the preview (one purchase, refund within 24h). Recovery overlay copy gets explicit Emaline sign-off — copy is brand-sensitive and Emaline owns voice.

---

## C4 — SEO + launch sprint

Mechanical work tightly coupled to launch verification. One subagent per file class for the meta-tag + JSON-LD work; orchestrator runs the audit / validator passes.

### C4.1 Per-page meta + Open Graph + JSON-LD

For each page in {`index.html`, `shop.html`, `product.html`, `cart.html`, `checkout.html`, `complete.html`, `about.html`, `contact.html`, `faq.html`, `policies.html`, `privacy.html`, `shipping.html`, `terms.html`}:

- `<title>` + `<meta name="description">` (product page reads from Supabase `seo_title` / `seo_description` if set, otherwise generates from `title` + `headline`).
- Open Graph tags (`og:title`, `og:description`, `og:image`, `og:type`, `og:url`).
- Twitter Card tags (`twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`).

For product pages, add JSON-LD `Product` schema injected by `product.js` after `populateProduct`:

```javascript
function injectProductJsonLd(p) {
  const heroImg = (p.images || []).find((i) => /\/(?:test_)?hero-/.test(i.url)) || (p.images || [])[0];
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: p.description || p.headline,
    image: heroImg?.url,
    sku: p.sku,
    brand: { '@type': 'Brand', name: 'Everlastings by Emaline' },
    offers: {
      '@type': 'Offer',
      url: `https://everlastingsbyemaline.com/product/${p.slug}`,
      priceCurrency: 'USD',
      price: (p.price / 100).toFixed(2),
      availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    },
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);
}
```

Add the `injectProductJsonLd(product)` call inside the `DOMContentLoaded` handler in `product.js`, right after `populateProduct(product)`.

### C4.2 `sitemap.xml` + `robots.txt`

Two static files at the project root.

**`sitemap.xml`** — generated at build time from a small Node script the orchestrator writes (or hard-coded to the static page list plus the placeholder products' slugs, regenerated when real products land). Skeleton:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://everlastingsbyemaline.com/</loc><priority>1.0</priority></url>
  <url><loc>https://everlastingsbyemaline.com/shop</loc><priority>0.9</priority></url>
  <url><loc>https://everlastingsbyemaline.com/about</loc><priority>0.6</priority></url>
  <url><loc>https://everlastingsbyemaline.com/contact</loc><priority>0.6</priority></url>
  <url><loc>https://everlastingsbyemaline.com/faq</loc><priority>0.5</priority></url>
  <url><loc>https://everlastingsbyemaline.com/policies</loc><priority>0.4</priority></url>
  <url><loc>https://everlastingsbyemaline.com/shipping</loc><priority>0.4</priority></url>
  <url><loc>https://everlastingsbyemaline.com/privacy</loc><priority>0.4</priority></url>
  <url><loc>https://everlastingsbyemaline.com/terms</loc><priority>0.4</priority></url>
  <!-- Per-product entries injected at C5 from real products only (is_test=false). -->
</urlset>
```

**`robots.txt`** — production-only allow:

```
User-agent: *
Allow: /
Sitemap: https://everlastingsbyemaline.com/sitemap.xml
```

For preview deployments, Vercel auto-injects `X-Robots-Tag: noindex` on `*.vercel.app`. Do nothing extra.

### C4.3 Lighthouse + cross-browser + integration tests

- [ ] `npx lighthouse <preview-url>/<page> --view --form-factor=mobile` for each of the 13 pages. Document scores; address any < 90.
- [ ] Cross-browser pass on the preview: Chrome, Safari, Firefox, Edge desktop; iPhone Safari, iPad Safari, Android Chrome.
- [ ] Re-run Track A integration test scripts against the preview alias (BASE_URL=`https://everlastings-website-git-dev-everlastingsbyemaline.vercel.app`):
  - `tests/integration/04_*.sh`, `05_*.sh`, `06_checkout.sh`
  - `tests/integration/07_race_condition.sh`, `08_hold_expiry.sh`
  - `tests/integration/09_*.sh`, `10_full_purchase_flow.sh`, `11_*.sh`
  - `tests/integration/12_shipping_mark.sh`, `16_admin_orders_needs_shipping.sh`
- [ ] OG validators on the preview product pages:
  - Facebook Sharing Debugger
  - Twitter Card Validator
  - LinkedIn Post Inspector

### C4 verification gate

- [ ] All 13 pages have correct `<title>`, `<meta description>`, OG tags, Twitter Card tags.
- [ ] Product pages emit JSON-LD verifiable with Google Rich Results Test.
- [ ] `sitemap.xml` valid and reachable at `<preview>/sitemap.xml`.
- [ ] Lighthouse mobile ≥ 90 on every page.
- [ ] All integration tests pass.
- [ ] OG validators show clean previews.
- [ ] **Design Review Checkpoint D** — orchestrator pauses. Sean + Emaline conduct the final review on the preview. Last cosmetic adjustments before launch land via the parallel iteration loop; anything beyond the v1.4.5 bar is logged for the post-launch backlog and does not gate this release.

---

## C5 — Launch cutover

Sequential. Sean drives most steps. Orchestrator executes the placeholder purge and verifies each gate.

### C5.1 Placeholder data purge

The eight test-mode rows + R2 namespace + Stripe products that need to be deleted before launch:

| Slug | Supabase ID | Stripe Product ID |
| ---- | ----------- | ----------------- |
| `placeholder-haven-i` | `29ac18a0-b655-40d0-bf26-2c45b172a24c` | `prod_URosENLviu9cvl` |
| `placeholder-haven-ii` | `ea7d7f19-0244-4280-9b31-48df448e76c2` | `prod_URosFK96ajZXhv` |
| `placeholder-book-nook` | `3f5556ba-f994-4af6-b5dc-03fb50c1377c` | `prod_URossmI3zF8nRV` |
| `placeholder-storyloft` | `e64612cf-8121-4114-8e02-14814ce0bc78` | `prod_URosdv1l5IQIgk` |
| `placeholder-seasonal-piece` | `f6d6b62a-d14f-4914-bfbf-c9e120ba3730` | `prod_URosODYnsDGLnv` |
| `placeholder-printable-set` | `979d50a3-85ea-4fb8-aa15-75a7929816b2` | `prod_URosuo6PXiQ90q` |
| `v145-prep-verify-1778085657` | `b32bb955-1960-4708-810e-27b8713029d9` | `prod_UT4eVWVpnwZKal` |
| (orphan, no Supabase row) | — | `prod_URor3D0ITLFa2E` |

```bash
# 1. Supabase rows
# Run in Supabase Studio SQL editor:
DELETE FROM products WHERE is_test = true;
SELECT COUNT(*) FROM products WHERE is_test = true;  -- expect 0

# 2. R2 objects — purge the entire test/ namespace via Wrangler or Cloudflare R2 dashboard
wrangler r2 object delete everlastings/test --recursive   # or use the dashboard "delete prefix" action

# 3. Stripe products — archive each in test mode dashboard (search "Placeholder" + the prep-verify product)
# IDs to archive: prod_URosENLviu9cvl, prod_URosFK96ajZXhv, prod_URossmI3zF8nRV, prod_URosdv1l5IQIgk, prod_URosODYnsDGLnv, prod_URosuo6PXiQ90q, prod_URor3D0ITLFa2E, prod_UT4eVWVpnwZKal
```

Verify:
- [ ] `SELECT COUNT(*) FROM products WHERE is_test = true` returns 0.
- [ ] R2 `test/` namespace empty in the Cloudflare dashboard.
- [ ] Stripe test-mode dashboard shows the eight products archived.

### C5.2 Resolve operational items

- [ ] **Stripe production webhook**: in Stripe live mode → Developers → Webhooks, register `https://everlastingsbyemaline.com/api/webhook` for the same events (`checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`) using the **live** webhook secret. Add `STRIPE_WEBHOOK_SECRET` (live value) to Vercel **production** env scope.
- [ ] **`env()` helper sweep**: run `grep -rn 'process\.env\.[A-Z]' api/`. Confirm the only matches are the top-of-file Stripe + Supabase client constructors in `api/products.ts` and `api/stripe-sync.ts` — those are intentional (Track A's pre-existing Stripe + Supabase singleton init; trailing-newline trimming has already been cleaned in Vercel and the constructors don't see runtime drift). No `api/` files added during Track C should bypass the `env()` helper at `api/_lib/env.ts`. If new top-level `process.env.X!` references appear, surface to Sean.
- [ ] **Admin UI manual click-path** — Sean (human-only smoke test): opens `https://everlastingsbyemaline.com/admin` (after the DNS flip in C5.5; or the production admin URL if testing pre-DNS-flip), logs in, creates a test product via the form, uploads images, saves, sees the product on the shop list. Archive the test product immediately afterward. The orchestrator does not perform this step; it pauses and waits for Sean's sign-off.

### C5.3 Real-product load (≥ 5 minimum)

Emaline loads real products via the Custom GPT against the preview deployment. Each product carries all 7 image roles populated, real Stripe Product+Price IDs, real materials/dimensions/copy.

- [ ] ≥ 5 real products live on preview.
- [ ] Each renders correctly on the shop and product pages.
- [ ] Custom GPT round-trips smoothly (no 500s, no missing images).

### C5.4 Stripe live keys + coupon bootstrap

- [ ] In Vercel → Settings → Environment Variables: add `STRIPE_SECRET_KEY` (live), `STRIPE_PUBLISHABLE_KEY` (live), `STRIPE_WEBHOOK_SECRET` (live) to the **Production** environment scope only. Confirm Preview + Development still hold the test-mode values.
- [ ] Run the coupon bootstrap once against live mode. From a local shell with the live `STRIPE_SECRET_KEY` exported:
  ```bash
  STRIPE_SECRET_KEY=sk_live_... npx tsx api/_bootstrap/coupons.ts
  ```
  This creates `cart-recovery-10` (10% off, Forever, blank max_redemptions) and `newsletter-welcome-5` (5% off, Forever, blank max_redemptions) in live Stripe.
- [ ] Verify both coupons exist in the Stripe live dashboard with the correct settings.

### C5.5 DNS flip + branch merge

- [ ] Vercel project → Settings → Domains → add `everlastingsbyemaline.com` and `www.everlastingsbyemaline.com`. Follow Vercel's DNS instructions for the registrar.
- [ ] After DNS propagates: confirm `https://everlastingsbyemaline.com` returns 200 with a valid SSL cert.
- [ ] Tag the current `dev` HEAD as `v1.4.5` and merge `dev` → `main`:
  ```bash
  git checkout main
  git pull origin main
  git merge --ff-only dev
  git push origin main
  git tag v1.4.5
  git push origin v1.4.5
  ```
- [ ] Confirm Vercel auto-deploys from `main` to production.

### C5.6 Post-launch monitoring (first 24h)

- [ ] Vercel logs: watch for 5xx spikes.
- [ ] Stripe live dashboard: watch for webhook 4xx/5xx.
- [ ] Resend deliveries: watch for bounces or spam-folder reports.
- [ ] **Sean** runs one real-card test purchase + refund within the first 24h to confirm live mode is healthy.

---

## Verification Gate (done means)

- [ ] All five phases' verification gates above are green.
- [ ] `find api -type f -name '*.ts' \! -path 'api/_*/*' | wc -l` returns 11.
- [ ] Stripe + Resend + GA4 + Meta Pixel all observed firing live in production.
- [ ] All test-mode placeholders purged (Supabase, R2, Stripe).
- [ ] DNS flipped, SSL active, production deploy from `main` healthy.
- [ ] Sean + Emaline final review approval.

---

## Rollback

| Phase | Reverts cleanly | Notes |
|-------|-----------------|-------|
| C1–C4 | Yes — revert the offending commit on `dev`, push. | All changes are additive on the frontend; no schema or env mutations. |
| C5.1 (placeholder purge) | No. | Once R2 objects + Stripe products are archived, the placeholder catalog is gone. Re-seeding is a fresh pass. |
| C5.4 (live keys) | Removing the live keys returns the project to test-mode behavior. | Stripe live products created post-flip stay in Stripe; archive them manually if rolling back. |
| C5.5 (DNS flip) | Point DNS back to a holding page or remove the domain in Vercel. | SSL re-issuance can take ~30 min if removed and re-added later. |

If a contract test fails at any phase gate, do not proceed. Surface to Sean per § Escalation triggers.

---

## Appendix A — `data-*` attribute → module wiring map

The contract Track B shipped. Every attribute in this table is wired by the indicated module. Renaming any of them is out of scope for v1.4.5.

### Cart page (`cart.html`)

| Attribute                         | Purpose                     | Wired by                  |
| --------------------------------- | --------------------------- | ------------------------- |
| `[data-cart-lines]`               | Line items container        | `cart.js`                 |
| `[data-cart-empty]`               | Empty-state container       | `cart.js`                 |
| `[data-cart-total]`               | Total slot                  | `cart.js`                 |
| `[data-cart-email]`               | Email input                 | `cart.js`                 |
| `[data-cart-name]`                | Name input                  | `cart.js`                 |
| `[data-cart-checkout]`            | CHECKOUT button             | `cart.js`                 |
| `[data-cart-error]`               | Error state                 | `cart.js`                 |
| `[data-sold-recovery]`            | 409 overlay container       | `cart.js` + `recovery.js` |
| `[data-sold-recovery-list]`       | Unavailable items text      | `recovery.js`             |
| `[data-sold-recovery-related-grid]` | Related products mini cards | `recovery.js`             |
| `[data-sold-recovery-form]`       | Email form for promo code   | `recovery.js`             |
| `[data-sold-recovery-code]`       | Generated promo code reveal | `recovery.js`             |
| `[data-sold-recovery-code-value]` | Code text node              | `recovery.js`             |
| `[data-sold-recovery-continue]`   | Continue with remaining items | `recovery.js`           |

### Checkout page (`checkout.html`)

| Attribute                      | Purpose                                               | Wired by      |
| ------------------------------ | ----------------------------------------------------- | ------------- |
| `[data-stage-a-info]`          | Stage A container (name + email)                      | `checkout.js` |
| `[data-stage-b-payment]`       | Stage B container (Stripe Elements)                   | `checkout.js` |
| `[data-checkout-email]`        | Email input                                           | `checkout.js` |
| `[data-checkout-name]`         | Name input                                            | `checkout.js` |
| `[data-checkout-continue]`     | Continue to payment button                            | `checkout.js` |
| `[data-checkout-billing-toggle]` | "Same as shipping" checkbox                         | `checkout.js` |
| `[data-stripe-address-shipping]` | AddressElement (shipping) mount                     | `checkout.js` |
| `[data-stripe-address-billing]` | AddressElement (billing) mount, conditional         | `checkout.js` |
| `[data-stripe-payment]`        | PaymentElement mount                                  | `checkout.js` |
| `[data-checkout-confirm]`      | Confirm & Pay button                                  | `checkout.js` |
| `[data-checkout-form]`         | Form wrapper around Stage B                           | `checkout.js` |
| `[data-checkout-error]`        | Error surface                                         | `checkout.js` |
| `[data-checkout-error-message]` | Error text node                                      | `checkout.js` |
| `[data-hold-expired]`          | 410 redirect surface                                  | `checkout.js` |
| `[data-checkout-order-summary]` | Order summary mount point                            | `checkout.js` |

### Complete page (`complete.html`)

| Attribute                       | Purpose                              | Wired by      |
| ------------------------------- | ------------------------------------ | ------------- |
| `[data-complete-loading]`       | Skeleton state                       | `complete.js` |
| `[data-complete-success]`       | Success container                    | `complete.js` |
| `[data-complete-customer-name]` | Customer name slot                   | `complete.js` |
| `[data-complete-email]`         | Customer email slot                  | `complete.js` |
| `[data-complete-line-items]`    | Order items list                     | `complete.js` |
| `[data-complete-shipping]`      | Shipping address summary             | `complete.js` |
| `[data-complete-total]`         | Total price slot                     | `complete.js` |
| `[data-complete-order-id]`      | Order ID slot                        | `complete.js` |
| `[data-complete-newsletter]`    | Subscribe prompt for non-subscribers | `complete.js` |
| `[data-complete-newsletter-success]` | Post-submit success state       | `complete.js` |
| `[data-complete-error]`         | Error state                          | `complete.js` |
| `[data-complete-error-message]` | Error text node                      | `complete.js` |

### Shop page (`shop.html`)

| Attribute                       | Purpose                                            | Wired by  |
| ------------------------------- | -------------------------------------------------- | --------- |
| `[data-shop-grid]`              | Tile container                                     | `shop.js` |
| `[data-shop-filter]`            | Filter checkboxes (with `value=` per option)       | `shop.js` |
| `[data-shop-sort]`              | Sort select                                        | `shop.js` |
| `[data-shop-clear-filters]`     | Clear filters CTA                                  | `shop.js` |
| `[data-shop-loading]`           | Skeleton tiles                                     | `shop.js` |
| `[data-shop-no-products]`       | "Crafting new havens" empty state                  | `shop.js` |
| `[data-shop-all-sold]`          | All-sold + inline newsletter form                  | `shop.js` |
| `[data-shop-filter-empty]`      | Filter yielded zero matches                        | `shop.js` |
| `[data-shop-fetch-error]`       | Supabase failure                                   | `shop.js` |

### Product page (`product.html`)

`data-product-*` hooks per Track B's placeholder inventory. The full set: `[data-product-title]`, `[data-product-headline]`, `[data-product-price]`, `[data-product-series]`, `[data-product-product-type]`, `[data-product-dimensions]`, `[data-product-weight]`, `[data-product-power-supply]`, `[data-product-story]`, `[data-product-features]`, `[data-product-materials]`, `[data-product-care-instructions]`, `[data-product-shipping-details]`, `[data-product-hero]`, `[data-product-gallery-thumbs]`, `[data-product-lightbox]`, `[data-product-lightbox-close]`, `[data-product-buy-button]`, `[data-product-related-grid]`, `[data-product-not-found]`, `[data-product-content]`, `[data-product-sold]`, `[data-product-contemplation-popup]`, `[data-product-interest-form]`, `[data-product-interest-success]`, `[data-product-video]`. Wired by `product.js`.

### Homepage (`index.html`)

| Attribute                                | Purpose                                | Wired by      |
| ---------------------------------------- | -------------------------------------- | ------------- |
| `[data-homepage-featured]`               | Featured carousel mount                | `homepage.js` |
| `[data-homepage-related-row]`            | "Related havens" row                   | `homepage.js` |
| `[data-homepage-newsletter-form]`        | Closing newsletter form                | `homepage.js` |
| `[data-homepage-newsletter-success]`     | Success state                          | `homepage.js` |

### Newsletter (cross-page)

| Attribute                              | Purpose                              | Wired by         |
| -------------------------------------- | ------------------------------------ | ---------------- |
| `[data-cart-exit-modal]`               | Exit-intent modal container          | `newsletter.js`  |
| `[data-newsletter-footer-form]`        | Footer newsletter form (every page)  | `newsletter.js`  |
| `[data-newsletter-footer-success]`     | Footer success state                 | `newsletter.js`  |

### Global

| Attribute             | Purpose                           | Wired by                       |
| --------------------- | --------------------------------- | ------------------------------ |
| `[data-cookie-revoke]` | Footer "Privacy preferences" link | Track B (`ui.js`); C1 verifies |
| `#cart-badge`         | Header cart count                 | `main.js`                      |

---

## Appendix B — `email-cta-submit` source enum

Single source of truth for which page dispatches which `source` value. `main.js`'s global listener is the only consumer.

| Source                  | Dispatched from                       | Backend behavior                                                   |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `product-interest`      | `product.html` sticky right card form | Insert into `product_interests` table; subscribe with this source. |
| `cart-exit`             | Exit-intent modal (`newsletter.js`)   | Standard subscribe.                                                |
| `contemplation-offer`   | Product page 3-min popup              | Subscribe + generate promo code from `newsletter-welcome-5` coupon. |
| `newsletter-footer`     | Footer form on every page             | Standard subscribe.                                                |
| `newsletter-shop-empty` | Shop page "all sold" inline form      | Standard subscribe.                                                |
| `newsletter-homepage`   | Homepage closing newsletter           | Standard subscribe.                                                |
| `newsletter-customer`   | Complete page subscribe prompt        | Standard subscribe (post-purchase opt-in).                         |

---

## Appendix C — Error states reference

Every error state the site can surface, with user-facing copy and the implementation hook.

| Page | Condition | User sees | Implementation hook |
|------|-----------|-----------|---------------------|
| Product | Slug not in URL | "This haven could not be found." + link to shop | `[data-product-not-found]` reveals; `[data-product-content]` hides |
| Product | Supabase fetch fails | "This haven could not be found." | Same hook as not-found |
| Product | Image fails to load | Broken image hidden, fallback shown | `<img onerror>` adds `image-fallback` class |
| Product | `available === false` | "Sold" badge, Buy Now disabled | `[data-product-sold]` reveals; `[data-product-buy-button]` disabled |
| Cart | Cart empty | "Your cart is empty." + link to shop | `[data-cart-empty]` reveals; `[data-cart-lines]` hides |
| Cart | Items sold before reserve (409) | Recovery overlay with "These havens have found their homes" + email form + related products | `[data-sold-recovery]` reveals via `cart.js` + `recovery.js` |
| Checkout | Cart empty / no session | Redirect to `/cart.html` | `window.location.href` |
| Checkout | Hold expired (410) | "Your reservation timed out. Returning to cart…" → redirect after 2s | `[data-hold-expired]` reveals; setTimeout redirect |
| Checkout | Session creation fails | "Something went awry. Please try again." | `[data-checkout-error]` |
| Checkout | Payment declined | Stripe error message | `[data-checkout-error]` shows Stripe's message |
| Checkout | Network error | "Unable to load checkout. Please refresh." | `[data-checkout-error]` |
| Checkout | Shipping incomplete | "Please complete your shipping address." | `[data-checkout-error]` from AddressElement `change` |
| Checkout | Restricted country | "We currently only ship within the United States. Contact us for international inquiries." | AddressElement `allowedCountries: ['US']` rejects; `[data-checkout-error]` |
| Complete | No `session_id` | "Something went awry." | `[data-complete-error]` |
| Complete | `status !== 'complete'` | "Something went awry. Please try again." | `[data-complete-error]` |
| Shop | Initial load | Skeleton shimmer | `[data-shop-loading]` |
| Shop | DB returns 0 products, no filter | "New havens are being crafted. Check back soon." | `[data-shop-no-products]` |
| Shop | All `available=false`, no filter | "Every haven has found its home. Join the Firelight Council for first look at new arrivals." + inline newsletter | `[data-shop-all-sold]` |
| Shop | Filter yields 0 matches | "No havens match your search." + Clear filters CTA | `[data-shop-filter-empty]` |
| Shop | Supabase fetch fails | "Havens are resting. Please refresh." | `[data-shop-fetch-error]` |
| Newsletter | 23505 duplicate email | "You're already part of the Firelight Council." | `email-cta-already-subscribed` event; per-form UI flip |
| Newsletter | Invalid email | "Valid email required" | Browser `type="email"` + server validation |
| Admin | Not authenticated | Redirect to login | Track A's surface, not C |
| Admin | Upload too large | "File must be under 10MB" (50MB for videos) | Track A's surface, not C |
