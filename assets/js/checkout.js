// assets/js/checkout.js
// Two-stage progressive disclosure checkout:
//  Stage A — capture email + Stripe AddressElement (shipping; optional billing if "same as shipping" unchecked)
//  Stage B — Stripe PaymentElement + Confirm. Stripe redirects to /complete.html on success.
// 410 (hold expired) → bounce to /cart.html. No 409 here; cart.html owns that.

document.addEventListener('DOMContentLoaded', async () => {
  const cart = getCart();
  if (cart.length === 0) {
    window.location.href = '/cart.html';
    return;
  }
  const sessionId = getOrCreateBrowserSessionId();

  renderOrderSummary(cart);
  prefillEmail();

  // Wait for /api/config → Stripe publishable key in main.js's initConfig.
  for (let i = 0; i < 80 && !window._stripePublishableKey; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!window._stripePublishableKey) {
    showError('Could not load checkout. Please refresh.');
    return;
  }
  if (typeof Stripe !== 'function') {
    showError('Could not load Stripe. Please refresh.');
    return;
  }
  const stripe = Stripe(window._stripePublishableKey);

  wireStageA(stripe, cart, sessionId);
  wireBillingToggle();
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
  if (totalEl) totalEl.textContent = `${formatPrice(getCartTotal())} + shipping`;
}

function prefillEmail() {
  const emailInput = document.querySelector('[data-checkout-info-form] input[name="email"]');
  if (emailInput && !emailInput.value) {
    emailInput.value = sessionStorage.getItem('checkout_email') || '';
  }
}

function wireBillingToggle() {
  const toggle = document.getElementById('billing-same-as-shipping');
  const billingMount = document.querySelector('[data-stripe-address-billing]');
  if (!toggle || !billingMount) return;
  toggle.addEventListener('change', () => {
    billingMount.classList.toggle('hidden', toggle.checked);
  });
}

function wireStageA(stripe, cart, sessionId) {
  const continueBtn = document.querySelector('[data-checkout-continue]');
  if (!continueBtn || continueBtn.dataset.wired === '1') return;
  continueBtn.dataset.wired = '1';

  continueBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const emailInput = document.querySelector('[data-checkout-info-form] input[name="email"]');
    const email = (emailInput?.value || '').trim();
    if (!email || !email.includes('@')) {
      showError('Please enter a valid email.');
      emailInput?.focus();
      return;
    }
    sessionStorage.setItem('checkout_email', email);
    hideError();
    continueBtn.disabled = true;
    continueBtn.textContent = 'Loading payment…';

    let data;
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((i) => ({
            product_id: i.product_id,
            slug: i.slug,
            stripe_price_id: i.stripe_price_id,
          })),
          session_id: sessionId,
          email,
          name: sessionStorage.getItem('checkout_name') || undefined,
        }),
      });
      if (res.status === 410) {
        document.querySelector('[data-hold-expired]')?.classList.remove('hidden');
        setTimeout(() => { window.location.href = '/cart.html'; }, 2200);
        return;
      }
      if (!res.ok) {
        showError('Something went awry. Please try again.');
        continueBtn.disabled = false;
        continueBtn.textContent = 'Continue to payment';
        return;
      }
      data = await res.json();
    } catch (err) {
      showError('Unable to load checkout. Please refresh.');
      continueBtn.disabled = false;
      continueBtn.textContent = 'Continue to payment';
      return;
    }

    if (!data?.clientSecret) {
      showError('Checkout not ready. Please refresh.');
      return;
    }

    await mountStageB(stripe, data);
    revealStageB();
    // Collapse Stage A and disable inputs so user can't edit while paying.
    document.querySelectorAll('[data-checkout-stage="a"] input, [data-checkout-stage="a"] button').forEach((el) => {
      el.disabled = true;
    });
    document.querySelector('[data-checkout-stage="a"]')?.classList.add('collapsed');
  });
}

async function mountStageB(stripe, data) {
  const checkout = await stripe.initCheckoutElementsSdk({
    clientSecret: data.clientSecret,
    elementsOptions: {
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#4A1942',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      },
    },
  });

  // Stage A's AddressElement also mounts here so users can still edit shipping
  // (Stripe Custom Checkout owns address collection; Track B's pre-mount placeholder is the slot).
  const shippingMount = document.querySelector('[data-stripe-address-shipping]');
  if (shippingMount) {
    shippingMount.classList.remove('hidden');
    shippingMount.innerHTML = '';
    const shippingElement = checkout.createAddressElement('shipping', { allowedCountries: ['US'] });
    shippingElement.mount('[data-stripe-address-shipping]');
    shippingElement.on('change', (ev) => {
      const country = ev.value?.address?.country;
      const restricted = document.querySelector('[data-restricted-country]');
      const incomplete = document.querySelector('[data-address-incomplete]');
      restricted?.classList.add('hidden');
      incomplete?.classList.add('hidden');
      if (country && country !== 'US') {
        restricted?.classList.remove('hidden');
      } else if (ev.complete === false) {
        incomplete?.classList.remove('hidden');
      }
    });
  }

  const billingToggle = document.getElementById('billing-same-as-shipping');
  const billingMount = document.querySelector('[data-stripe-address-billing]');
  if (billingMount && billingToggle && !billingToggle.checked) {
    billingMount.innerHTML = '';
    const billingElement = checkout.createAddressElement('billing');
    billingElement.mount('[data-stripe-address-billing]');
  }

  const paymentMount = document.querySelector('[data-stripe-payment]');
  if (paymentMount) {
    paymentMount.innerHTML = '';
    const paymentElement = checkout.createPaymentElement();
    paymentElement.mount('[data-stripe-payment]');
  }

  const confirmBtn = document.querySelector('[data-checkout-confirm]');
  checkout.on('change', (session) => {
    if (confirmBtn) confirmBtn.disabled = !session.canConfirm;
    if (session.total?.total?.amount != null) {
      const totalEl = document.querySelector('[data-checkout-total]');
      if (totalEl) totalEl.textContent = formatPrice(session.total.total.amount);
    }
    if (session.shippingOption?.total?.amount != null) {
      const shipEl = document.querySelector('[data-checkout-shipping]');
      if (shipEl) shipEl.textContent = formatPrice(session.shippingOption.total.amount);
    }
  });

  confirmBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    const originalLabel = confirmBtn.textContent;
    confirmBtn.textContent = 'Processing…';
    hideError();
    try {
      const { actions } = await checkout.loadActions();
      const error = await actions.confirm();
      if (error) {
        showError(error.message || 'Payment could not be processed.');
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalLabel;
      }
      // On success, Stripe redirects via the session's return_url (/complete.html?session_id=…).
    } catch (err) {
      showError('Payment could not be processed. Please try again.');
      confirmBtn.disabled = false;
      confirmBtn.textContent = originalLabel;
    }
  }, { once: false });

  // Wire the optional promo-code apply button to Stripe's checkout.applyPromotionCode.
  const promoBtn = document.querySelector('[data-promo-apply]');
  const promoInput = document.getElementById('promo-code');
  if (promoBtn && promoInput) {
    promoBtn.addEventListener('click', async () => {
      const code = promoInput.value.trim();
      if (!code) return;
      promoBtn.disabled = true;
      const original = promoBtn.textContent;
      promoBtn.textContent = 'Applying…';
      try {
        const apply = checkout.applyPromotionCode || checkout.applyDiscount;
        if (typeof apply === 'function') {
          const r = await apply.call(checkout, code);
          if (r?.type === 'error') {
            showError(r.error?.message || 'Could not apply this code.');
          }
        }
      } catch (err) {
        showError('Could not apply this code. Please try again.');
      } finally {
        promoBtn.disabled = false;
        promoBtn.textContent = original;
      }
    });
  }
}

function revealStageB() {
  document.querySelector('[data-checkout-stage="b"]')?.classList.remove('hidden');
  document.querySelector('[data-checkout-stage="b"]')?.scrollIntoView({ behavior: 'smooth' });
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
