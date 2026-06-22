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

// Hero text units (v3.4). lottie-web is loaded `defer` BEFORE this script, so window.lottie is defined
// when this DOMContentLoaded fires. Each [data-hero-lottie] unit keeps a real-text fallback; we hide it
// only once its SVG actually mounts drawn <path>s — so a 404/blocked script/reduced-motion all fall back
// cleanly to the styled text. Each Lottie loops (the subtle old-film nudge is baked in).
document.addEventListener('DOMContentLoaded', () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.lottie) return;                   // reduced-motion / no-JS → styled text fallback
  document.querySelectorAll('[data-hero-lottie]').forEach((el) => {
    const path = el.getAttribute('data-hero-lottie');
    if (!path) return;
    try {
      const anim = lottie.loadAnimation({
        container: el, renderer: 'svg', loop: true, autoplay: true,
        path,
        rendererSettings: { progressiveLoad: false, preserveAspectRatio: 'xMidYMid meet' },
      });
      // Async failure (404, blocked, bad JSON) fires data_failed, never DOMLoaded → leave the text.
      anim.addEventListener('data_failed', () => { /* never add .has-lottie → styled text stays */ });
      // Hide the fallback text only once the SVG has ACTUALLY mounted drawn content. Check for `path`
      // (the real strokes), NOT `g` — lottie-web can mount empty <g> containers that match truthily.
      anim.addEventListener('DOMLoaded', () => {
        const svg = el.querySelector('svg');
        if (svg && svg.querySelector('path')) {
          const unit = el.closest('.hero__unit');
          if (unit) unit.classList.add('has-lottie');
        }
      });
    } catch { /* lottie threw synchronously → leave the styled text visible */ }
  });
});
