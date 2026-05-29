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

  // Billing is collected inside Stripe's PaymentElement (Custom Checkout
  // default). We no longer mount a separate BillingAddressElement — having
  // both created a duplicate "billing is same as shipping" UI and blocked
  // canConfirm because Stripe couldn't reconcile two billing sources.

  const paymentMount = document.querySelector('[data-stripe-payment]');
  if (paymentMount) {
    paymentMount.innerHTML = '';
    const paymentElement = checkout.createPaymentElement();
    paymentElement.mount('[data-stripe-payment]');
  }

  // NOTE: previously tried checkout.updateShippingAddress(...) here to
  // pre-fill the customer's name into the Ship to form. It didn't show
  // in the form (Stripe AddressElement doesn't reflect session updates
  // visually) AND it appears to put the session into a "shipping touched
  // but invalid" state that broke the form-to-session sync entirely —
  // canConfirm stayed false because Stripe stopped accepting user-typed
  // input as "complete". Removed; pre-fill remains an open issue
  // documented in v1_4_5_C_SESSION_REPORT.md Round 4.

  // Expose for live debugging in DevTools: window.__checkout.session()
  if (typeof window !== 'undefined') window.__checkout = checkout;

  const confirmBtn = document.querySelector('[data-checkout-confirm]');
  checkout.on('change', (session) => {
    // Log canConfirm + key field completeness so we can see what's missing
    // when the Confirm button stays disabled. Trim to avoid PII spam.
    console.log('[checkout] session change:', {
      canConfirm: session.canConfirm,
      status: session.status,
      shippingAddressComplete: !!session.shippingAddress?.address?.line1,
      billingAddressComplete: !!session.billingAddress?.address?.line1,
      paymentMethodType: session.paymentMethodPreview?.type || null,
      totalAmount: session.total?.total?.amount,
      shippingOptionId: session.shippingOption?.id || null,
    });
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
      // Stripe Custom Checkout (Basil): confirm() lives directly on the
      // checkout object. The older loadActions() → actions.confirm() pattern
      // was removed; the React <CheckoutProvider> wrapper has always called
      // checkout.confirm() directly and the vanilla SDK now matches.
      const confirmResult = await checkout.confirm();
      console.log('[checkout] confirm result:', confirmResult);
      if (confirmResult && confirmResult.type === 'error') {
        console.error('[checkout] confirm error:', confirmResult.error);
        showError(confirmResult.error?.message || 'Payment could not be processed.');
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalLabel;
      }
      // On success, Stripe redirects via the session's return_url (/complete.html?session_id=…).
    } catch (err) {
      console.error('[checkout] confirm threw exception:', err);
      showError(`Payment could not be processed: ${err?.message || 'unknown error'}`);
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
