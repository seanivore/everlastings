// assets/js/cart.js
// Renders cart line items, prefills email/name from sessionStorage, and handles the [CHECKOUT] click.
// On 200 → fire begin_checkout + redirect /checkout.html. On 409 → strip sold items + show recovery.
// Track B's [data-sold-recovery] overlay is populated by recovery.js (loaded before this on cart.html).

document.addEventListener('DOMContentLoaded', () => {
  const cart = getCart();
  const withItems = document.querySelector('[data-cart-with-items]');
  const emptyEl = document.querySelector('[data-cart-empty]');

  if (cart.length === 0) {
    withItems?.classList.add('hidden');
    emptyEl?.classList.remove('hidden');
    return;
  }

  renderLineItems(cart, withItems);
  updateTotals();
  prefillEmailName();
  wireRemoveButtons();
  wireCheckoutButton();

  // Re-render when another tab updates the cart.
  window.addEventListener('storage', (e) => {
    if (e.key !== 'cart') return;
    const fresh = getCart();
    if (fresh.length === 0) {
      withItems?.classList.add('hidden');
      emptyEl?.classList.remove('hidden');
    } else {
      renderLineItems(fresh, withItems);
      updateTotals();
      wireRemoveButtons();
    }
  });
});

function renderLineItems(cart, container) {
  if (!container) return;
  // Track B placed the line-items inline with the rest of the section (subtotal block, prefill form, checkout button).
  // We replace just the line rows by clearing previous .cart-line nodes and prepending fresh ones at the top of the container.
  container.querySelectorAll('.cart-line').forEach((el) => el.remove());

  const frag = document.createDocumentFragment();
  cart.forEach((item) => {
    const line = document.createElement('div');
    line.className = 'cart-line';
    line.dataset.productId = item.product_id;
    line.style.cssText = 'display: grid; grid-template-columns: 100px 1fr auto; gap: var(--space-md); align-items: center; padding: var(--space-md) 0; border-bottom: 1px solid var(--color-fog);';
    line.innerHTML = `
      <a href="/product/${escapeAttr(item.slug)}" style="display: block;">
        <img src="${escapeAttr(item.thumbnail || '')}" alt="${escapeAttr(item.title || '')}"
             onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 5%22%3E%3Crect width=%224%22 height=%225%22 fill=%22%234A1942%22/%3E%3C/svg%3E'"
             style="width: 100%; aspect-ratio: 4/5; object-fit: cover; border-radius: var(--radius-sm);">
      </a>
      <div>
        <h3 style="font-family: var(--font-display); font-size: var(--text-xl); margin: 0 0 var(--space-xs);">
          <a href="/product/${escapeAttr(item.slug)}" style="color: var(--text-primary); text-decoration: none;">${escapeAttr(item.title || '')}</a>
        </h3>
        ${item.series ? `<p style="margin: 0; color: var(--text-muted); font-size: var(--text-sm);">${escapeAttr(humanizeSeries(item.series))}</p>` : ''}
        <p style="margin: var(--space-xs) 0 0; font-style: italic; font-size: var(--text-sm); color: var(--text-secondary);">One-of-a-kind. Availability confirmed at checkout.</p>
      </div>
      <div style="text-align: right;">
        <p style="margin: 0 0 var(--space-sm); font-family: var(--font-display); font-size: var(--text-xl); color: var(--accent-primary);">${formatPrice(item.price || 0)}</p>
        <button type="button" class="btn btn-ghost btn-sm" data-cart-remove data-product-id="${escapeAttr(item.product_id)}">Remove</button>
      </div>
    `;
    frag.appendChild(line);
  });
  // Insert at the top so subtotal/prefill/checkout sections stay below.
  container.insertBefore(frag, container.firstChild);
}

function updateTotals() {
  const total = getCartTotal();
  const subtotalEl = document.querySelector('[data-cart-subtotal]');
  const estimateEl = document.querySelector('[data-cart-estimate]');
  if (subtotalEl) subtotalEl.textContent = formatPrice(total);
  if (estimateEl) estimateEl.textContent = formatPrice(total);
}

function prefillEmailName() {
  const emailInput = document.querySelector('[data-cart-prefill] input[name="email"]');
  const nameInput = document.querySelector('[data-cart-prefill] input[name="name"]');
  const phoneInput = document.querySelector('[data-cart-prefill] input[name="phone"]');
  if (emailInput) emailInput.value = sessionStorage.getItem('checkout_email') || '';
  if (nameInput) nameInput.value = sessionStorage.getItem('checkout_name') || '';
  if (phoneInput) phoneInput.value = sessionStorage.getItem('checkout_phone') || '';
}

function wireRemoveButtons() {
  document.querySelectorAll('[data-cart-remove]').forEach((btn) => {
    if (btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const productId = btn.dataset.productId;
      if (!productId) return;
      removeFromCart(productId);
      const fresh = getCart();
      if (fresh.length === 0) {
        document.querySelector('[data-cart-with-items]')?.classList.add('hidden');
        document.querySelector('[data-cart-empty]')?.classList.remove('hidden');
      } else {
        renderLineItems(fresh, document.querySelector('[data-cart-with-items]'));
        updateTotals();
        wireRemoveButtons();
      }
    });
  });
}

function wireCheckoutButton() {
  const btn = document.querySelector('[data-cart-checkout]');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', onCheckoutClick);
}

async function onCheckoutClick(e) {
  e.preventDefault();
  const btn = e.currentTarget;
  const cart = getCart();
  if (cart.length === 0) return;

  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = 'Checking availability…';
  hideError();

  const email = (document.querySelector('[data-cart-prefill] input[name="email"]')?.value || '').trim();
  const name = (document.querySelector('[data-cart-prefill] input[name="name"]')?.value || '').trim();
  const phone = (document.querySelector('[data-cart-prefill] input[name="phone"]')?.value || '').trim();
  if (email) sessionStorage.setItem('checkout_email', email);
  if (name) sessionStorage.setItem('checkout_name', name);
  if (phone) sessionStorage.setItem('checkout_phone', phone);

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
      const data = await res.json().catch(() => ({}));
      const unavailableSlugs = Array.isArray(data.unavailable) ? data.unavailable : [];
      const unavailableItems = unavailableSlugs.map((slug) => {
        const item = cart.find((i) => i.slug === slug);
        return item
          ? { slug, title: item.title, thumbnail: item.thumbnail }
          : { slug, title: slug };
      });
      // Strip sold items from localStorage cart.
      unavailableSlugs.forEach((slug) => {
        const item = cart.find((i) => i.slug === slug);
        if (item) removeFromCart(item.product_id);
      });
      // Re-render remaining items (if any).
      const remaining = getCart();
      if (remaining.length === 0) {
        document.querySelector('[data-cart-with-items]')?.classList.add('hidden');
        document.querySelector('[data-cart-empty]')?.classList.remove('hidden');
      } else {
        renderLineItems(remaining, document.querySelector('[data-cart-with-items]'));
        updateTotals();
        wireRemoveButtons();
      }
      showSoldRecovery({ unavailable: unavailableItems, related: data.related || [] });
      btn.disabled = false;
      btn.textContent = originalLabel;
      return;
    }

    if (!res.ok) {
      showError('Something went awry. Please try again.');
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
    showError('Could not reach the server. Please try again.');
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

function showError(msg) {
  const err = document.querySelector('[data-cart-error]');
  if (!err) return;
  err.querySelector('p')?.replaceChildren(document.createTextNode(msg));
  err.classList.remove('hidden');
}
function hideError() {
  document.querySelector('[data-cart-error]')?.classList.add('hidden');
}

function humanizeSeries(slug) {
  return String(slug || '').split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}

function escapeAttr(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
