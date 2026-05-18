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
