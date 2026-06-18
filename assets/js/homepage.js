// assets/js/homepage.js
// Populates the featured carousel from products.featured = true and
// applies an optional homepage_theme (CSS custom-properties) from the first matching product.

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabase();

  let featured;
  try {
    featured = await getProducts({ featured: true, available: true });
  } catch {
    // No carousel UI on fetch failure — leave Track B's fallback tiles visible.
    return;
  }

  populateFeatured(featured);
  applyDynamicTheme(featured);
  fireViewList(featured);

  // Optional success-state UI flip for the closing newsletter form.
  window.addEventListener('email-cta-success', (e) => {
    if (e.detail?.source !== 'newsletter-homepage') return;
    const form = document.querySelector('form[data-email-cta="newsletter-homepage"]');
    if (!form) return;
    form.classList.add('is-subscribed');
    // Replace the form with a small success line so it's visually obvious.
    const success = document.createElement('p');
    success.textContent = 'Welcome to the Firelight Council.';
    success.className = 'newsletter-success';
    success.style.cssText = 'margin: var(--space-md) auto 0; color: var(--text-secondary); font-style: italic;';
    form.replaceWith(success);
  });
});

async function waitForSupabase() {
  for (let i = 0; i < 50 && !getSupabase(); i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

function populateFeatured(items) {
  const carousel = document.querySelector('[data-featured-carousel]');
  if (!carousel) return;
  if (!Array.isArray(items) || items.length === 0) {
    // Leave Track B's fallback tiles visible if no live featured products yet.
    return;
  }
  carousel.innerHTML = items.map((p) => {
    const thumb = pickThumb(p);
    const alt = escapeAttr(p.thumbnail_alt || p.title || '');
    return `
      <article class="card product-tile" data-product-slug="${escapeAttr(p.slug)}">
        <a href="/product/${escapeAttr(p.slug)}" style="display: block; color: inherit; text-decoration: none;">
          <div class="card__media">
            <span class="badge badge-featured">Featured</span>
            <img loading="lazy" alt="${alt}" src="${escapeAttr(thumb)}">
          </div>
          <div class="card__body">
            <h3 class="card__title">${escapeAttr(p.title || '')}</h3>
            ${p.headline ? `<p style="font-style: italic; color: var(--text-muted); font-size: var(--text-sm); margin: 0 0 var(--space-xs);">${escapeAttr(p.headline)}</p>` : ''}
            <p class="card__price">${formatPrice(p.price)}</p>
          </div>
        </a>
      </article>
    `;
  }).join('');
}

function pickThumb(p) {
  if (p.thumbnail) return p.thumbnail;
  const imgs = Array.isArray(p.images) ? p.images : [];
  const hero = imgs.find((i) => /\/(?:test_)?hero-/.test(i.url || ''));
  return (hero && hero.url) || (imgs[0] && imgs[0].url) || '';
}

function applyDynamicTheme(items) {
  if (!Array.isArray(items)) return;
  const themed = items.find((p) => p && p.homepage_theme && typeof p.homepage_theme === 'object');
  if (!themed) return;
  const root = document.documentElement;
  Object.entries(themed.homepage_theme).forEach(([key, value]) => {
    if (typeof value === 'string') root.style.setProperty(`--${key}`, value);
  });
}

function fireViewList(items) {
  if (typeof gtag !== 'function' || !Array.isArray(items) || items.length === 0) return;
  gtag('event', 'view_item_list', {
    item_list_name: 'Featured',
    items: items.map(buildGa4Item),
  });
}

function escapeAttr(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Hero title write-on (WS5 §5.1). lottie-web is loaded `defer` BEFORE this script, so window.lottie is
// defined when this DOMContentLoaded fires. The static <h1> stays visible unless the SVG actually mounts
// drawn content — so a 404/blocked script/reduced-motion all fall back cleanly to the styled <h1>.
document.addEventListener('DOMContentLoaded', () => {
  const el = document.querySelector('[data-hero-title-lottie]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!el || reduce || !window.lottie) return;            // reduced-motion / no-JS → static <h1>
  try {
    const anim = lottie.loadAnimation({
      container: el, renderer: 'svg', loop: false, autoplay: true,
      path: '/assets/lottie/hero-title-writeon.json',
      rendererSettings: { progressiveLoad: false, preserveAspectRatio: 'xMidYMid meet' },
    });
    // Async fetch/parse failure (404, blocked, bad JSON) fires data_failed, never DOMLoaded → leave the
    // real <h1> visible.
    anim.addEventListener('data_failed', () => { /* never add .has-lottie → static <h1> stays */ });
    // Only hide the real <h1> once the SVG has ACTUALLY mounted DRAWN content. A JSON that parses but
    // renders empty (no layers, or a Skottie-subset lottie-web can't draw) still fires DOMLoaded — guard
    // against that "blank hero" case instead of relying on the manual lottie-web preview gate.
    anim.addEventListener('DOMLoaded', () => {
      const svg = el.querySelector('svg');
      // Check for `path` (the drawn strokes), NOT `g` — lottie-web can mount empty <g> containers that
      // match truthily and would hide the <h1> over a blank hero; a real trim-path write-on draws paths.
      if (svg && svg.querySelector('path')) el.closest('.hero__title').classList.add('has-lottie');
      // else: nothing visible mounted → leave the static <h1> showing
    });
  } catch { /* lottie threw synchronously → leave the real <h1> visible (never add .has-lottie); F15 */ }
});
