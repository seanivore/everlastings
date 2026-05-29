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
  // Public reads exclude rows that aren't checkout-ready (no stripe_price_id).
  // This naturally hides integration-test cruft (itest-*) without blocking
  // placeholder products that intentionally have is_test=true during launch prep.
  const { data, error } = await supabase.from('products').select('*').eq('slug', slug).not('stripe_price_id', 'is', null).maybeSingle();
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
  let query = supabase.from('products').select('*').not('stripe_price_id', 'is', null);
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

document.addEventListener('DOMContentLoaded', () => {
  initConfig();
  // cart-ui.js paints [data-cart-badge] on its own load; no badge call needed here.
  // Re-apply persisted consent on every page load so settings carry across navigation.
  const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (stored) {
    try { applyConsent(JSON.parse(stored)); } catch {}
  }
});
