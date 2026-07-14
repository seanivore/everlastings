// assets/js/complete.js
// Reads ?session_id=, calls /api/session-status, populates the success state, fires purchase events, clears cart.
// ui.js auto-dispatches the newsletter-customer form submit. We only handle the success-state UI flip.

document.addEventListener('DOMContentLoaded', async () => {
  const sessionId = new URLSearchParams(window.location.search).get('session_id');
  if (!sessionId) {
    revealError();
    return;
  }

  let data;
  try {
    const res = await fetch(`/api/session-status?session_id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) {
      revealError();
      return;
    }
    data = await res.json();
  } catch {
    revealError();
    return;
  }

  if (data.status !== 'complete') {
    revealError();
    return;
  }

  hide('[data-complete-loading]');
  reveal('[data-complete-success]');

  setText('[data-complete-customer-name]', data.customer_name || 'collector');
  setText('[data-complete-customer-email]', data.customer_email || 'your email');
  setText('[data-complete-total]', formatPrice(data.amount_total || 0));

  // Shipping line: Stripe Checkout returns 0 for free shipping; if shipping_cost present use it.
  const shippingCost = (data.shipping_cost && Number.isFinite(data.shipping_cost.amount_total))
    ? data.shipping_cost.amount_total
    : 0;
  setText('[data-complete-shipping]', formatPrice(shippingCost));

  // Subtotal / Discount / Tax (v4.1.2). The line items above are amount_subtotal (pre-discount),
  // so these four lines and the total reconcile exactly:
  //   subtotal − discount + shipping + tax = total
  const subtotal = Number.isFinite(data.amount_subtotal) ? data.amount_subtotal : 0;
  const discount = Number.isFinite(data.amount_discount) ? data.amount_discount : 0;
  const tax = Number.isFinite(data.amount_tax) ? data.amount_tax : 0;

  setText('[data-complete-subtotal]', formatPrice(subtotal));

  // Always present, even at zero — a shopper who used a code needs to see it landed, and a
  // shopper who didn't should see the same receipt shape.
  setText('[data-complete-discount]', discount > 0 ? `−${formatPrice(discount)}` : formatPrice(0));
  setText('[data-complete-promo]', data.promo_code ? `(${data.promo_code})` : '');

  const taxRow = document.querySelector('[data-complete-tax-row]');
  if (taxRow) {
    taxRow.hidden = tax <= 0;
    if (tax > 0) taxRow.style.display = 'flex';
  }
  setText('[data-complete-tax]', formatPrice(tax));

  // Line items: replace the placeholder rows.
  const lineEl = document.querySelector('[data-complete-line-items]');
  if (lineEl && Array.isArray(data.items)) {
    lineEl.innerHTML = data.items.map((it) => `
      <div style="display: flex; justify-content: space-between; padding: var(--space-sm) 0;">
        <span>${escapeHTML(it.title || 'Item')}</span>
        <span>${formatPrice(it.price || 0)}</span>
      </div>
    `).join('');
  }

  // Tracking.
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
  wirePostPurchaseNewsletter(data);
});

function wirePostPurchaseNewsletter(data) {
  const container = document.querySelector('[data-complete-newsletter]');
  if (!container) return;
  // Reveal the newsletter prompt if backend signals customer is not already subscribed.
  // Backend may set data.already_subscribed; if absent, default to showing the prompt.
  if (data.already_subscribed === true) return;
  container.classList.remove('hidden');

  const form = container.querySelector('form[data-email-cta="newsletter-customer"]');
  if (!form) return;
  const emailInput = form.querySelector('input[type="email"]');
  if (emailInput && data.customer_email) emailInput.value = data.customer_email;

  window.addEventListener('email-cta-success', (e) => {
    if (e.detail?.source !== 'newsletter-customer') return;
    const success = document.createElement('p');
    success.textContent = 'Welcome to the Firelight Council.';
    success.style.cssText = 'margin: 0; color: var(--text-secondary); font-style: italic; text-align: center;';
    form.replaceWith(success);
  });
}

function revealError() {
  hide('[data-complete-loading]');
  hide('[data-complete-success]');
  reveal('[data-complete-error]');
}

function reveal(sel) { document.querySelector(sel)?.classList.remove('hidden'); }
function hide(sel) { document.querySelector(sel)?.classList.add('hidden'); }
function setText(sel, val) { const el = document.querySelector(sel); if (el && val !== undefined && val !== null) el.textContent = val; }
function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
