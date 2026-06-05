// assets/js/checkout.js
// Single-phase Stripe Custom Checkout (Basil). The session is created quietly on
// page load; Stripe's own elements own ALL field collection and auto-sync to the
// session. There are NO update* bridges (the double-writer bug that burned 5 rounds).
// One Pay button → checkout.confirm(). 410 (hold expired) → bounce to /cart.
// 409 is owned by cart.js and never reached here.

document.addEventListener('DOMContentLoaded', async () => {
  const cart = getCart();
  if (cart.length === 0) {
    window.location.href = '/cart';
    return;
  }
  const sessionId = getOrCreateBrowserSessionId();
  renderOrderSummary(cart);

  // Wait for /api/config → Stripe publishable key (main.js initConfig) + Stripe.js.
  for (let i = 0; i < 80 && !window._stripePublishableKey; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!window._stripePublishableKey) { showError('Could not load checkout. Please refresh.'); return; }
  if (typeof Stripe !== 'function') { showError('Could not load Stripe. Please refresh.'); return; }

  // Create the Checkout Session (single-phase). 410 → hold expired → /cart.
  let clientSecret;
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map((i) => ({ product_id: i.product_id, slug: i.slug })),
        session_id: sessionId,
      }),
    });
    if (res.status === 410) {
      document.querySelector('[data-hold-expired]')?.classList.remove('hidden');
      setTimeout(() => { window.location.href = '/cart'; }, 2200);
      return;
    }
    if (!res.ok) { showError('Something went awry. Please try again.'); return; }
    const data = await res.json();
    clientSecret = data.clientSecret;
  } catch (err) {
    showError('Could not reach the server. Please refresh.');
    return;
  }
  if (!clientSecret) { showError('Checkout not ready. Please refresh.'); return; }

  const stripe = Stripe(window._stripePublishableKey);

  // ---- VERIFIED CONTRACT tokens (Phase 0). Lead with repo-proven calls. ----
  const checkout = await stripe.initCheckout({
    fetchClientSecret: async () => clientSecret,
    elementsOptions: {
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#4A1942',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      },
      // Renders the default-checked "Billing is same as shipping" checkbox on the billing element. (Phase 0 ✅)
      syncAddressCheckbox: 'billing',
    },
    // NO defaultValues: Phase 0 confirmed initCheckout REJECTS it (IntegrationError:
    // options.defaultValues is not an accepted parameter). Email prefill is dropped (optional);
    // never inject the email via an update* call (that's the double-writer bug).
  });

  if (typeof window !== 'undefined') window.__checkout = checkout; // keep for probing/debug

  // Mount Stripe's elements. They auto-sync to the session — NO update* calls anywhere.
  checkout.createContactDetailsElement().mount('[data-stripe-contact]');
  checkout
    // Phase 0: `fields` is rejected on this element; phone is collected server-side (phone_number_collection).
    .createShippingAddressElement({ display: { name: 'split' } })
    .mount('[data-stripe-address-shipping]');
  checkout.createBillingAddressElement().mount('[data-stripe-address-billing]');
  checkout
    .createPaymentElement({ fields: { billingDetails: 'never' } })
    .mount('[data-stripe-payment]');

  const confirmBtn = document.querySelector('[data-checkout-confirm]');

  // Read-only listener: gate the Pay button, paint totals, and surface US-only / incomplete states.
  // NEVER write back to the session here.
  checkout.on('change', (session) => {
    if (confirmBtn) confirmBtn.disabled = !session.canConfirm;

    // session.total.total.amount / session.shippingOption.total.amount are the standard Basil
    // Custom-Checkout session shape. NOTE: this shape was NOT separately captured in the Phase 0
    // probe — it is verified FUNCTIONALLY at Phase 8.1 (apply a promo, confirm this Total drops).
    // The optional chaining is deliberate: if the shape ever differs, the pre-painted cart total
    // stands in rather than printing $NaN — and Phase 8.1 catches a wrong accessor.
    const total = session.total?.total?.amount;
    if (Number.isFinite(total)) setText('[data-checkout-total]', formatPrice(total));

    const ship = session.shippingOption?.total?.amount;
    if (Number.isFinite(ship)) setText('[data-checkout-shipping]', ship === 0 ? 'Free' : formatPrice(ship));

    // US-only messaging (server enforces allowed_countries; this is just UX).
    const country = session.shippingAddress?.address?.country;
    document.querySelector('[data-restricted-country]')?.classList.toggle('hidden', !(country && country !== 'US'));
  });

  wirePromo(checkout);

  confirmBtn?.addEventListener('click', async () => {
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    const label = confirmBtn.textContent;
    confirmBtn.textContent = 'Processing…';
    hideError();
    try {
      const result = await checkout.confirm();
      if (result && result.type === 'error') {
        showError(result.error?.message || 'Payment could not be processed.');
        confirmBtn.disabled = false;
        confirmBtn.textContent = label;
      }
      // On success Stripe redirects to return_url (/complete?session_id=…).
    } catch (err) {
      showError(`Payment could not be processed: ${err?.message || 'unknown error'}`);
      confirmBtn.disabled = false;
      confirmBtn.textContent = label;
    }
  });
});

function renderOrderSummary(cart) {
  const lineEl = document.querySelector('[data-checkout-line-items]');
  if (lineEl) {
    lineEl.innerHTML = cart.map((item) => `
      <div style="display: flex; justify-content: space-between; padding: var(--space-sm) 0;">
        <span>${escapeHTML(item.title || 'Item')}</span>
        <span>${formatPrice(item.price || 0)}</span>
      </div>
    `).join('');
  }
  const totalEl = document.querySelector('[data-checkout-total]');
  if (totalEl) totalEl.textContent = formatPrice(getCartTotal());
}

function wirePromo(checkout) {
  const promoBtn = document.querySelector('[data-promo-apply]');
  const promoInput = document.getElementById('promo-code');
  if (!promoBtn || !promoInput) return;
  promoBtn.addEventListener('click', async () => {
    const code = promoInput.value.trim();
    if (!code) return;
    promoBtn.disabled = true;
    const original = promoBtn.textContent;
    promoBtn.textContent = 'Applying…';
    try {
      const apply = checkout.applyPromotionCode; // Phase 0: applyDiscount does not exist on the bundle.
      if (typeof apply === 'function') {
        const r = await apply.call(checkout, code);
        if (r?.type === 'error') showError(r.error?.message || 'Could not apply this code.');
      }
    } catch (err) {
      showError('Could not apply this code. Please try again.');
    } finally {
      promoBtn.disabled = false;
      promoBtn.textContent = original;
    }
  });
}

function setText(sel, val) {
  const el = document.querySelector(sel);
  if (el && val !== undefined && val !== null) el.textContent = val;
}
function showError(msg) {
  const err = document.querySelector('[data-checkout-error]');
  const msgEl = document.querySelector('[data-checkout-error-message]') || err;
  if (!err || !msgEl) return;
  msgEl.textContent = msg;
  err.classList.remove('hidden');
}
function hideError() {
  document.querySelector('[data-checkout-error]')?.classList.add('hidden');
}
function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
