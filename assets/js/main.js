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
    window._isTest = config.isTest === true;   // 1.11 — prod=false, preview=true
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

// v3.5 — store-wide sale (public read, cached once per page load onto window._activeSale). Percent-only.
let _activeSalePromise = null;
async function getActiveSale() {
  if (_activeSalePromise) return _activeSalePromise;
  _activeSalePromise = fetch('/api/products?_action=active_sale')
    .then((r) => (r.ok ? r.json() : { active: false }))
    .catch(() => ({ active: false }))
    .then((s) => { window._activeSale = s; return s; });
  return _activeSalePromise;
}

// Struck-price markup for a cents amount when a % store-wide sale is live; plain price otherwise.
// Numbers only (no user text) → the innerHTML sites that consume this are injection-safe.
function priceHTML(cents, sale) {
  sale = sale || window._activeSale;
  if (sale && sale.active && sale.type === 'percent' && Number.isFinite(cents)) {
    const discounted = Math.round(cents * (1 - sale.value / 100));
    return `<span class="price-sale"><span class="price-sale__was">${formatPrice(cents)}</span> <span class="price-sale__now">${formatPrice(discounted)}</span></span>`;
  }
  return formatPrice(cents);
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
  // Public reads exclude rows that aren't checkout-ready (no stripe_price_id).
  // This naturally hides integration-test cruft (itest-*) without blocking
  // placeholder products that intentionally have is_test=true during launch prep.
  // Public column projection — keep in sync with what product.js/shop.js/homepage.js render.
  // Add a new public column here or it silently won't load; never list draft/preview_token/is_test.
  const { data, error } = await supabase.from('products').select('id, sku, slug, title, headline, story_card, description, features, price, dimensions, weight, materials, power_supply, care_instructions, shipping_details, product_type, series, available, quantity, featured, images, thumbnail, thumbnail_alt, media, seo_title, seo_description, seo_thumbnail, artist_note, stripe_price_id, homepage_theme, created_at').eq('slug', slug).eq('is_test', window._isTest === true).not('stripe_price_id', 'is', null).maybeSingle();
  if (error) {
    console.error('Failed to fetch product:', error.message);
    return null;
  }
  return data;
}

async function getProducts(options = {}) {
  const supabase = getSupabase();
  if (!supabase) return [];
  // Public reads exclude rows that aren't checkout-ready (no stripe_price_id).
  // Public column projection — keep in sync with what product.js/shop.js/homepage.js render.
  // Add a new public column here or it silently won't load; never list draft/preview_token/is_test.
  let query = supabase.from('products').select('id, sku, slug, title, headline, story_card, description, features, price, dimensions, weight, materials, power_supply, care_instructions, shipping_details, product_type, series, available, quantity, featured, images, thumbnail, thumbnail_alt, media, seo_title, seo_description, seo_thumbnail, artist_note, stripe_price_id, homepage_theme, created_at').eq('is_test', window._isTest === true).not('stripe_price_id', 'is', null);
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

// Track B's cart-ui.js owns the badge ([data-cart-badge] selector, 'cart' key).
// Storage key + post-mutation 'cart-updated' dispatch must match cart-ui.js exactly.
const CART_STORAGE_KEY = 'cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function persistCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  // cart-ui.js listens for this to repaint [data-cart-badge].
  window.dispatchEvent(new Event('cart-updated'));
}

function addToCart(item) {
  const cart = getCart();
  if (cart.find((i) => i.product_id === item.product_id)) return;
  // Normalize: ensure quantity exists (Track B shape) plus full item metadata C2/C3 need.
  cart.push({ quantity: 1, ...item });
  persistCart(cart);

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
  persistCart(cart);
  if (item && typeof gtag === 'function') {
    gtag('event', 'remove_from_cart', {
      currency: 'USD',
      value: item.price / 100,
      items: [buildGa4Item(item)],
    });
  }
}

function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
  window.dispatchEvent(new Event('cart-updated'));
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
}

// --- Global email-cta-submit listener ---

window.addEventListener('email-cta-submit', async (e) => {
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

// Cross-page newsletter success-state UI (footer on every page; shop-empty inline form on /shop.html).
// Per-page modules handle their own page-specific newsletter flips (homepage.js, complete.js, product.js).
window.addEventListener('email-cta-success', (e) => {
  const source = e.detail?.source;
  if (source === 'newsletter-footer') {
    document.querySelectorAll('form[data-email-cta="newsletter-footer"]').forEach((form) => {
      const msg = document.createElement('p');
      msg.textContent = 'Welcome to the Firelight Council.';
      msg.style.cssText = 'margin: 0; color: rgba(255,255,255,0.7); font-style: italic; font-size: var(--text-sm);';
      form.replaceWith(msg);
    });
  } else if (source === 'newsletter-shop-empty') {
    document.querySelectorAll('form[data-email-cta="newsletter-shop-empty"]').forEach((form) => {
      const msg = document.createElement('p');
      msg.textContent = 'Welcome to the Firelight Council.';
      msg.style.cssText = 'margin: var(--space-md) auto 0; color: var(--text-secondary); font-style: italic; max-width: 400px; text-align: center;';
      form.replaceWith(msg);
    });
  }
});

// Already-subscribed friendly toast (rare case — surfaces from /api/subscribe 409).
window.addEventListener('email-cta-already-subscribed', (e) => {
  const source = e.detail?.source;
  // For now, treat already-subscribed the same as success on the cross-page forms.
  if (source === 'newsletter-footer' || source === 'newsletter-shop-empty') {
    document.querySelectorAll(`form[data-email-cta="${source}"]`).forEach((form) => {
      const msg = document.createElement('p');
      msg.textContent = "You're already part of the Firelight Council.";
      msg.style.cssText = source === 'newsletter-footer'
        ? 'margin: 0; color: rgba(255,255,255,0.7); font-style: italic; font-size: var(--text-sm);'
        : 'margin: var(--space-md) auto 0; color: var(--text-secondary); font-style: italic; max-width: 400px; text-align: center;';
      form.replaceWith(msg);
    });
  }
});

// v3.5 — thin reusable top utility bar (free-shipping reminder by default, sale line when active) +
// a once-only dismissible upper-right sale popup. Storefront tokens only (this is the shopper brand,
// NOT the neutral portal). The bar sits in normal flow above the sticky header, so it scrolls away and
// the header then pins to top:0 (no layout hack needed — verified against .site-header position:sticky).
function mountSaleChrome(sale) {
  sale = sale || window._activeSale || { active: false };

  // --- top utility bar ---
  const bar = document.createElement('div');
  bar.className = 'sale-bar' + (sale.active ? ' sale-bar--on' : '');
  bar.setAttribute('role', 'status');
  bar.textContent = (sale.active && sale.type === 'percent')
    ? `${sale.value}% off everything — applied automatically at checkout, no code needed.`
    : 'Free shipping on every order.';
  document.body.insertBefore(bar, document.body.firstChild);

  // v3.7.3 (D#1) — expose the header's REAL bottom so fixed/anchored chrome (the sale popup below,
  // and the pre-existing .mobile-nav drawer) clears it. The bar is normal-flow and ALWAYS present
  // (free-shipping default), so the sticky header sits BELOW it — a static --header-height offset
  // would overlap the header (cart icon) on every page, worse when the popup is up.
  const setHeaderOffset = () => {
    const hdr = document.querySelector('.site-header');
    if (hdr) document.documentElement.style.setProperty('--header-offset', hdr.getBoundingClientRect().bottom + 'px');
  };
  setHeaderOffset();
  window.addEventListener('resize', setHeaderOffset);
  // v3.7.4 (D#3 / B#4 / journey): keep it current as the page SCROLLS too. The sale-bar is normal-flow, so
  // once it scrolls out of view the sticky header's real bottom shrinks — a .mobile-nav opened AFTER scrolling
  // would otherwise inherit the stale (too-tall) mount value and open with a gap under the header. rAF-throttled
  // so it costs ~nothing, and it stays self-contained (setHeaderOffset is scoped to this IIFE — no cross-file
  // nav-handler hook needed). The once-only sale popup fires at unscrolled load and is already correct.
  let _hoTick = 0;
  window.addEventListener('scroll', () => { if (_hoTick) return; _hoTick = requestAnimationFrame(() => { _hoTick = 0; setHeaderOffset(); }); }, { passive: true });

  // --- once-only upper-right popup (only when a sale is live) ---
  if (!(sale.active && sale.type === 'percent')) return;
  // localStorage key carries the CODE so a NEW sale re-announces once; the same sale never nags twice.
  const SEEN_KEY = 'everlastings.saleSeen';
  if (localStorage.getItem(SEEN_KEY) === sale.code) return;

  const pop = document.createElement('div');
  pop.className = 'sale-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Store-wide sale');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'sale-pop__close';
  close.setAttribute('aria-label', 'Dismiss');
  close.textContent = '✕';
  const body = document.createElement('div');
  body.className = 'sale-pop__body';
  const h = document.createElement('strong');
  h.textContent = `${sale.value}% off, storewide`;
  const p = document.createElement('p');
  p.textContent = 'The discount is applied automatically at checkout — no code to remember.';
  body.append(h, p);
  pop.append(close, body);
  const dismiss = () => { localStorage.setItem(SEEN_KEY, sale.code); pop.remove(); };
  close.addEventListener('click', dismiss);
  document.body.appendChild(pop);
}

document.addEventListener('DOMContentLoaded', () => {
  initConfig();
  getActiveSale().then(mountSaleChrome); // v3.5 — top utility bar + once-only sale popup (#221)
  // v3.5 — a coupon "Copy share link" lands on the homepage root (<siteUrl>/?code=CODE, §4.6). main.js
  // runs on every page, so capture ?code= here and stash it; the /checkout reader (§4.7) applies it once
  // the shopper has items in the cart. sessionStorage survives the same-tab navigation to /checkout.
  try { const _sc = new URLSearchParams(location.search).get('code'); if (_sc) sessionStorage.setItem('everlastings.shareCode', _sc); } catch {}
  // cart-ui.js paints [data-cart-badge] on its own load; no badge call needed here.
  // Re-apply persisted consent on every page load so settings carry across navigation.
  const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (stored) {
    try { applyConsent(JSON.parse(stored)); } catch {}
  }
  // Firelight glow: turned OFF globally (v2.1 feedback). To be revisited + repurposed onto the homepage
  // hero's window edges in the hero rework; the .firelight-glow CSS stays in styles.css for that reuse.
});
