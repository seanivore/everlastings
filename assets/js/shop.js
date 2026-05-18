// assets/js/shop.js
// Renders product tiles into [data-shop-grid] from Supabase, with filter + sort + URL state.

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabase();

  let products;
  try {
    products = await getProducts();
  } catch {
    showState('data-shop-fetch-error');
    hideState('data-shop-loading');
    return;
  }

  if (!Array.isArray(products) || products.length === 0) {
    showState('data-shop-no-products');
    hideState('data-shop-loading');
    return;
  }

  initFromURL();
  renderTiles(products);
  wireFilters(products);
  wireSort(products);
  hideState('data-shop-loading');
});

async function waitForSupabase() {
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
  // Track B uses checkbox values matching the param values directly.
  ['series', 'product_type', 'available'].forEach((key) => {
    const val = params.get(key);
    if (!val) return;
    document.querySelectorAll(`[data-shop-filter="${key}"][value="${val}"]`).forEach((cb) => { cb.checked = true; });
    if (key === 'available' && val === 'false') {
      // 'Sold Archive' shortcut from header/footer links — uncheck the default 'Available' checkbox.
      document.querySelectorAll('[data-shop-filter="available"][value="true"]').forEach((cb) => { cb.checked = false; });
    }
  });
  const sort = params.get('sort');
  if (sort) {
    const sel = document.querySelector('[data-shop-sort]');
    if (sel) sel.value = sort;
  }
}

function getActiveFilters() {
  const filters = { series: [], product_type: [], available: [] };
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
    // 'available' is a checkbox-pair: 'true' shows available, 'false' shows sold. If both or neither, show all.
    if (filters.available.length === 1) {
      const want = filters.available[0] === 'true';
      if (p.available !== want) return false;
    }
    return true;
  });
}

function applySort(products, sort) {
  const sorted = [...products];
  switch (sort) {
    case 'price-low': sorted.sort((a, b) => a.price - b.price); break;
    case 'price-high': sorted.sort((a, b) => b.price - a.price); break;
    case 'name': sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
    case 'newest':
    default: sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  // Featured products always float to the top regardless of sort.
  sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
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
  hideState('data-shop-fetch-error');

  if (visible.length === 0) {
    const filterActive = filters.series.length || filters.product_type.length || filters.available.length === 1;
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

  // Match Track B's `.card.product-tile` structure so styles + filter data-* selectors continue to work.
  grid.innerHTML = visible.map((p) => {
    const heroImg = pickHeroThumb(p);
    const altText = escapeAttr(p.thumbnail_alt || p.title || '');
    return `
      <article class="card product-tile" data-product-slug="${escapeAttr(p.slug)}" data-series="${escapeAttr(p.series || '')}" data-product-type="${escapeAttr(p.product_type || '')}" data-available="${p.available ? 'true' : 'false'}">
        <a href="/product/${escapeAttr(p.slug)}" style="display: block; color: inherit; text-decoration: none;">
          <div class="card__media">
            ${p.available ? '' : '<span class="badge badge-sold">Sold</span>'}
            ${p.featured ? '<span class="badge badge-featured">Featured</span>' : ''}
            <img loading="lazy" alt="${altText}" src="${escapeAttr(heroImg)}"${p.available ? '' : ' style="opacity: 0.55;"'}>
          </div>
          <div class="card__body">
            <h3 class="card__title">${escapeAttr(p.title || '')}</h3>
            <p class="card__price${p.available ? '' : ' text-muted'}">${formatPrice(p.price)}</p>
          </div>
        </a>
      </article>
    `;
  }).join('');
}

function pickHeroThumb(p) {
  if (p.thumbnail) return p.thumbnail;
  const imgs = Array.isArray(p.images) ? p.images : [];
  const hero = imgs.find((i) => /\/(?:test_)?hero-/.test(i.url || ''));
  return (hero && hero.url) || (imgs[0] && imgs[0].url) || '';
}

function escapeAttr(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
  document.querySelectorAll('[data-shop-clear-filters]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-shop-filter]:checked').forEach((cb) => { cb.checked = false; });
      // Re-default to 'Available' checked (matches Track B's initial state).
      document.querySelectorAll('[data-shop-filter="available"][value="true"]').forEach((cb) => { cb.checked = true; });
      syncURL();
      renderTiles(products);
    });
  });
}

function wireSort(products) {
  document.querySelector('[data-shop-sort]')?.addEventListener('change', () => {
    syncURL();
    renderTiles(products);
  });
  // ui.js already dispatches `email-cta-submit` for the inline newsletter forms in the empty/all-sold states.
}

function syncURL() {
  const params = new URLSearchParams();
  const filters = getActiveFilters();
  ['series', 'product_type'].forEach((k) => {
    if (filters[k].length === 1) params.set(k, filters[k][0]);
  });
  if (filters.available.length === 1) params.set('available', filters.available[0]);
  const sort = document.querySelector('[data-shop-sort]')?.value;
  if (sort && sort !== 'newest') params.set('sort', sort);
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}
