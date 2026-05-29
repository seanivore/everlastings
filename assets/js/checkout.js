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
  prefillName();
  prefillPhone();

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

function prefillEmail() {
  const emailInput = document.querySelector('[data-checkout-info-form] input[name="email"]');
  if (emailInput && !emailInput.value) {
    emailInput.value = sessionStorage.getItem('checkout_email') || '';
  }
}

function prefillName() {
  const nameInput = document.querySelector('[data-checkout-info-form] input[name="name"]');
  if (nameInput && !nameInput.value) {
    nameInput.value = sessionStorage.getItem('checkout_name') || '';
  }
}

function prefillPhone() {
  const phoneInput = document.querySelector('[data-checkout-info-form] input[name="phone"]');
  if (phoneInput && !phoneInput.value) {
    phoneInput.value = sessionStorage.getItem('checkout_phone') || '';
  }
}

function wireStageA(stripe, cart, sessionId) {
  const continueBtn = document.querySelector('[data-checkout-continue]');
  if (!continueBtn || continueBtn.dataset.wired === '1') return;
  continueBtn.dataset.wired = '1';

  continueBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const emailInput = document.querySelector('[data-checkout-info-form] input[name="email"]');
    const nameInput = document.querySelector('[data-checkout-info-form] input[name="name"]');
    const phoneInput = document.querySelector('[data-checkout-info-form] input[name="phone"]');
    const email = (emailInput?.value || '').trim();
    const name = (nameInput?.value || '').trim();
    const phone = (phoneInput?.value || '').trim();
    if (!email || !email.includes('@')) {
      showError('Please enter a valid email.');
      emailInput?.focus();
      return;
    }
    if (!name) {
      showError('Please enter your full name.');
      nameInput?.focus();
      return;
    }
    sessionStorage.setItem('checkout_email', email);
    sessionStorage.setItem('checkout_name', name);
    if (phone) sessionStorage.setItem('checkout_phone', phone);
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
          name,
          phone: phone || undefined,
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
    // Lock only filled inputs so the user can still add an empty optional field later
    // (e.g., type a phone number in Stage A after seeing the order summary).
    document.querySelectorAll('[data-checkout-stage="a"] input').forEach((el) => {
      if (el.value && el.type !== 'checkbox') el.disabled = true;
    });
    const continueBtnEl = document.querySelector('[data-checkout-stage="a"] [data-checkout-continue]');
    if (continueBtnEl) continueBtnEl.disabled = true;
    document.querySelector('[data-checkout-stage="a"]')?.classList.add('collapsed');
  });
}

async function mountStageB(stripe, data) {
  const checkout = await stripe.initCheckout({
    fetchClientSecret: async () => data.clientSecret,
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
    const shippingElement = checkout.createShippingAddressElement();
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

  // Billing element: lazy-mount on demand so unchecking "Same as shipping"
  // after mount still produces a working element.
  const billingToggle = document.getElementById('billing-same-as-shipping');
  const billingMount = document.querySelector('[data-stripe-address-billing]');
  let billingElement = null;
  const ensureBillingMounted = () => {
    if (billingElement || !billingMount) return;
    billingMount.innerHTML = '';
    billingElement = checkout.createBillingAddressElement();
    billingElement.mount('[data-stripe-address-billing]');
  };
  if (billingToggle && billingMount) {
    if (!billingToggle.checked) {
      billingMount.classList.remove('hidden');
      ensureBillingMounted();
    }
    billingToggle.addEventListener('change', () => {
      const sameAsShipping = billingToggle.checked;
      billingMount.classList.toggle('hidden', sameAsShipping);
      if (!sameAsShipping) ensureBillingMounted();
    });
  }

  const paymentMount = document.querySelector('[data-stripe-payment]');
  if (paymentMount) {
    paymentMount.innerHTML = '';
    const paymentElement = checkout.createPaymentElement();
    paymentElement.mount('[data-stripe-payment]');
  }

  // Pre-fill shipping + billing names from the Stage A "Your name" capture.
  // Stripe requires a full address skeleton (empty strings + country are fine);
  // calling with just { name } is rejected. Users can still edit either field
  // (shipping to gift recipient, billing to cardholder, etc.).
  const customerName = sessionStorage.getItem('checkout_name');
  if (customerName) {
    const addrSkeleton = { line1: '', city: '', state: '', postal_code: '', country: 'US' };
    try {
      await checkout.updateShippingAddress({ name: customerName, address: addrSkeleton });
    } catch (err) {
      console.warn('updateShippingAddress(name) failed:', err);
    }
    try {
      await checkout.updateBillingAddress({ name: customerName, address: addrSkeleton });
    } catch (err) {
      console.warn('updateBillingAddress(name) failed:', err);
    }
  }

  const confirmBtn = document.querySelector('[data-checkout-confirm]');
  checkout.on('change', (session) => {
    if (confirmBtn) confirmBtn.disabled = !session.canConfirm;
    const totalAmount = session.total?.total?.amount;
    if (Number.isFinite(totalAmount)) {
      const totalEl = document.querySelector('[data-checkout-total]');
      if (totalEl) totalEl.textContent = formatPrice(totalAmount);
    }
    const shipAmount = session.shippingOption?.total?.amount;
    if (Number.isFinite(shipAmount)) {
      const shipEl = document.querySelector('[data-checkout-shipping]');
      if (shipEl) shipEl.textContent = shipAmount === 0 ? 'Free' : formatPrice(shipAmount);
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
      const loadActionsResult = await checkout.loadActions();
      if (loadActionsResult.type !== 'success') {
        showError(loadActionsResult.error?.message || 'Payment could not be loaded.');
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalLabel;
        return;
      }
      const { error } = await loadActionsResult.actions.confirm();
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
