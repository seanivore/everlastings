// assets/js/homepage.js
// Populates the featured carousel from products.featured = true and
// applies an optional homepage_theme (CSS custom-properties) from the first matching product.

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabase();
  await getActiveSale(); // v3.5 — sets window._activeSale before populateFeatured

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
  const tile = (p) => {
    const thumb = pickThumb(p);
    const alt = escapeAttr(p.thumbnail_alt || p.title || '');
    const sold = p.quantity != null ? p.quantity <= 0 : !p.available; // v3.5 — match shop.js: known qty<=0 is Sold; null qty falls back to the available flag
    return `
      <article class="card product-tile" data-product-slug="${escapeAttr(p.slug)}">
        <a href="/product/${escapeAttr(p.slug)}" style="display: block; color: inherit; text-decoration: none;">
          <div class="card__media">
            ${sold ? '<span class="badge badge-sold">Sold</span>' : ''}
            ${!sold && p.featured ? '<span class="badge badge-featured">Featured</span>' : ''}
            ${!sold && !p.featured ? '<span class="badge badge-unique">One of a kind</span>' : ''}
            <img loading="lazy" alt="${alt}" src="${escapeAttr(thumb)}">
          </div>
          <div class="card__body">
            <h3 class="card__title">${escapeAttr(p.title || '')}</h3>
            ${p.headline ? `<p style="font-style: italic; color: var(--text-muted); font-size: var(--text-sm); margin: 0 0 var(--space-xs);">${escapeAttr(p.headline)}</p>` : ''}
            <p class="card__price">${sold ? formatPrice(p.price) : priceHTML(p.price, window._activeSale)}</p>
          </div>
        </a>
      </article>
    `;
  };
  // One row of tiles: on mobile it's a single horizontal-scroll strip; on desktop the same row
  // wraps to 3-per-row (as many rows as needed). Both behaviours are pure CSS on .featured-row.
  carousel.innerHTML = `<div class="featured-row">${items.map(tile).join('')}</div>`;
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
