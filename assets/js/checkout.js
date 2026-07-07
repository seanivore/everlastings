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

  // Read-only listener: gate the Pay button, repaint the summary, surface US-only state.
  // NEVER write back to the session here — paintSummary only reads + paints our own DOM.
  checkout.on('change', (session) => {
    if (confirmBtn) confirmBtn.disabled = !session.canConfirm;
    paintSummary(checkout);
    // US-only messaging (server enforces allowed_countries; this is just UX).
    const country = session.shippingAddress?.address?.country;
    document.querySelector('[data-restricted-country]')?.classList.toggle('hidden', !(country && country !== 'US'));
  });

  wirePromo(checkout);
  // v3.5 — an explicit ?code= share link WINS over the automatic store-wide sale (Stripe = one
  // discount/order). Apply the share code if present (from the main.js stash or ?code=) and SKIP the
  // auto-sale; else auto-apply the sale. Mutually exclusive → no apply-order race between the two paths.
  if (readShareCode()) applyShareLinkCode(checkout);
  else autoApplyStoreWideSale(checkout); // v3.5 — store-wide sale on init (Phase 4.0 probe: init-apply works)

  confirmBtn?.addEventListener('click', async () => {
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    const label = confirmBtn.textContent;
    confirmBtn.textContent = 'Processing…';
    hideError();
    try {
      const result = await checkout.confirm();
      if (result && result.type === 'error') {
        showError(friendlyPaymentError(result.error));
        confirmBtn.disabled = false;
        confirmBtn.textContent = label;
      }
      // On success Stripe redirects to return_url (/complete?session_id=…).
    } catch (err) {
      showError(friendlyPaymentError(err));
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

// Look up a promo code's terms (worth + minimum) from our whitelisted public endpoint (never returns
// metadata). Returns the terms object ({percent_off, amount_off, amount_display, min_amount, min_display})
// or null (invalid / miss / error). Used to show the deal + the "under the minimum" message at checkout.
async function lookupCode(code) {
  try {
    const res = await fetch('/api/products?_action=coupon_lookup&code=' + encodeURIComponent(code));
    if (!res.ok) return null;
    const t = await res.json();
    return t && t.valid ? t : null;
  } catch (e) { return null; }
}

// Paint shipping / discount / total from the live Stripe session. CRITICAL: on this Basil bundle the
// amount fields (session.total.{subtotal,discount,total}.amount) are PRE-FORMATTED STRINGS ("$185.00"),
// and minorUnitsAmount is the integer cents. Read checkout.session() fresh (the change-event arg can lag
// the discount). Display-only: paints our own [data-checkout-*] elements, never Stripe's mounted elements.
// Promo row: applied → the code sits read-only in the field + a ✕, the deal "(20% off · min $100)" beside
// it, the −amount on the right; not applied → an editable field. The minimum comes from checkout.__promoTerms
// (set by the lookup on apply); the base worth + the −amount come from the session.
function paintSummary(checkout) {
  let s;
  try { s = checkout.session(); } catch (e) { return; }
  const t = s && s.total;
  if (!t) return;

  // Shipping (shippingRate.minorUnitsAmount === 0 → Free)
  const shipMinor = t.shippingRate?.minorUnitsAmount;
  if (Number.isInteger(shipMinor)) setText('[data-checkout-shipping]', shipMinor === 0 ? 'Free' : t.shippingRate.amount);

  const disc = t.discount;
  const d0 = (s.discountAmounts && s.discountAmounts[0]) || null;
  const applied = disc && Number.isInteger(disc.minorUnitsAmount) && disc.minorUnitsAmount > 0;
  const terms = checkout.__promoTerms || null;
  const input = document.querySelector('[data-promo-input]');
  const clearBtn = document.querySelector('[data-promo-clear]');
  const dealEl = document.querySelector('[data-checkout-discount-deal]');
  const amtEl = document.querySelector('[data-checkout-discount]');
  if (applied) {
    if (input) { input.value = (d0 && (d0.promotionCode || d0.displayName)) || input.value; input.readOnly = true; }
    if (clearBtn) clearBtn.style.display = 'inline-flex';
    // Deal (in parens): percent → "N% off"; else "$X off" (prefer the looked-up face); + " · min $Y" when known.
    let deal = d0 && d0.percentOff != null ? d0.percentOff + '% off'
      : (noCents((terms && terms.amount_display) || disc.amount) + ' off');
    if (terms && terms.min_display) deal += ' · min ' + noCents(terms.min_display);
    if (dealEl) dealEl.textContent = '(' + deal + ')';
    if (amtEl) amtEl.textContent = '−' + disc.amount; // amount is already "$10.00"
  } else {
    if (input) input.readOnly = false;
    if (clearBtn) clearBtn.style.display = 'none';
    if (dealEl) dealEl.textContent = '';
    if (amtEl) amtEl.textContent = '';
  }

  // Total — the discounted grand total, already a formatted string.
  if (t.total && t.total.amount != null) setText('[data-checkout-total]', t.total.amount);
}

// Promo code — no Apply button. Auto-applies on Enter or blur; the code then sits read-only in the field
// with a ✕ that removes it (so a shopper can drop a store-wide sale and type their own code). On apply we
// also look up the code's terms so the row can show "(20% off · min $100)" and, if a code is rejected for
// being under its minimum, tell the shopper exactly why (there's nowhere else for them to learn it).
function wirePromo(checkout) {
  const input = document.querySelector('[data-promo-input]');
  if (!input) return;
  const clearBtn = document.querySelector('[data-promo-clear]');
  const promoMsg = document.querySelector('[data-promo-msg]');
  const setMsg = (msg) => { if (promoMsg) { promoMsg.textContent = msg || ''; promoMsg.style.display = msg ? 'block' : 'none'; } };
  let busy = false;

  async function applyCode() {
    const code = input.value.trim();
    if (!code || busy) return;
    busy = true; setMsg('');
    const terms = await lookupCode(code);      // worth + minimum, or null
    checkout.__promoTerms = terms;
    let failed = null;
    try {
      const apply = checkout.applyPromotionCode; // Phase 0: applyDiscount does not exist on the bundle.
      if (typeof apply === 'function') {
        const r = await apply.call(checkout, code);
        if (r?.type === 'error') failed = r.error?.message || 'This promotion code is invalid.';
      }
    } catch (err) { failed = 'That code didn’t work. Please try again.'; }
    busy = false;
    if (failed) {
      // Smart minimum message: a valid code, but the items are under its minimum order.
      let s; try { s = checkout.session(); } catch (e) { s = null; }
      const subMinor = s && s.total && s.total.subtotal && s.total.subtotal.minorUnitsAmount;
      if (terms && terms.min_amount != null && Number.isInteger(subMinor) && subMinor < terms.min_amount) {
        const short = noCents('$' + ((terms.min_amount - subMinor) / 100).toFixed(2));
        setMsg('This code requires a minimum order of ' + noCents(terms.min_display)
          + ' — your items total ' + noCents(s.total.subtotal.amount) + '. Add ' + short + ' to use it.');
      } else {
        setMsg(failed);
      }
      return;
    }
    paintSummary(checkout); // code into the field (read-only) + ✕ + (deal) + −amount
  }
  async function clearCode() {
    if (busy) return;
    busy = true; setMsg('');
    try { if (typeof checkout.removePromotionCode === 'function') await checkout.removePromotionCode(); }
    catch (err) { /* paint below reflects the real state either way */ }
    input.value = '';
    checkout.__promoTerms = null;
    busy = false;
    paintSummary(checkout);
    input.focus();
  }
  // Auto-apply: Enter, or blur with a code typed (skip when already applied → the field is read-only).
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyCode(); } });
  input.addEventListener('blur', () => { if (!input.readOnly && input.value.trim()) applyCode(); });
  if (clearBtn) clearBtn.addEventListener('click', clearCode);
  // Auto-apply paths (share link / store-wide sale): look up the applied code's terms, then paint.
  checkout.__syncPromo = async () => {
    let s; try { s = checkout.session(); } catch (e) { s = null; }
    const code = s && s.discountAmounts && s.discountAmounts[0] && s.discountAmounts[0].promotionCode;
    checkout.__promoTerms = code ? await lookupCode(code) : null;
    paintSummary(checkout);
  };
}

// v3.5 — read the public active store-wide sale and apply it at INIT (no shopper action). The keyword
// field (wirePromo) stays VISIBLE + usable: a shopper types a personal code, which REPLACES the sale
// code via applyPromotionCode (Stripe swaps the promotion), so "delete the sale, use mine" still works.
// Phase 4.0 probe (this bundle): apply-at-init succeeds, the change listener sees the discounted total,
// removePromotionCode exists, and a SECOND code REPLACES the first — so the primary init path is used as-is.
async function autoApplyStoreWideSale(checkout) {
  let sale;
  try { sale = await getActiveSale(); } catch { return; }
  if (!sale || !sale.active || sale.type !== 'percent' || !sale.code) return;
  const apply = checkout.applyPromotionCode; // Phase 0/4.0: the verified call on this bundle
  if (typeof apply !== 'function') return;
  try {
    const r = await apply.call(checkout, sale.code);
    if (r && r.type === 'error') {
      // Fallback: prefill the visible field so the shopper can one-tap apply.
      const input = document.getElementById('promo-code');
      if (input) input.value = sale.code;
    } else {
      checkout.__syncPromo?.(); // show the discount line + applied state on load
    }
  } catch (err) {
    const input = document.getElementById('promo-code');
    if (input) input.value = sale.code;
  }
}

// v3.5 — resolve a "Copy share link" code from the main.js stash (§4.7.0 — set when the shopper landed
// on the homepage /?code=) OR a direct /checkout?code=. The stash is how the code survives homepage →
// add-to-cart → /checkout; location.search is the fallback for a direct checkout hit.
function readShareCode() {
  let code = null;
  try { code = sessionStorage.getItem('everlastings.shareCode'); } catch {}
  if (!code) code = new URLSearchParams(location.search).get('code');
  return code;
}

// v3.5 — honor a coupon "Copy share link" (<siteUrl>/?code=CODE). Resolve the code (stash or query),
// prefill the visible #promo-code field, and apply it through the SAME applyPromotionCode path the
// store-wide auto-apply uses. Called INSTEAD of autoApplyStoreWideSale when a code is present (mutually
// exclusive — Stripe = one discount/order). Fails soft: a bad/inactive code just leaves the field prefilled.
async function applyShareLinkCode(checkout) {
  const code = readShareCode();
  if (!code) return;
  try { sessionStorage.removeItem('everlastings.shareCode'); } catch {} // one-shot — consumed
  const input = document.getElementById('promo-code');
  if (input) input.value = code;
  const apply = checkout.applyPromotionCode; // Phase 4.0: the verified call on this bundle
  if (typeof apply !== 'function') return;   // fallback: field is prefilled; shopper taps Apply
  try { await apply.call(checkout, code); checkout.__syncPromo?.(); } catch (err) { /* prefilled for manual retry */ }
}

function setText(sel, val) {
  const el = document.querySelector(sel);
  if (el && val !== undefined && val !== null) el.textContent = val;
}
// Drop a trailing ".00" so whole-dollar amounts read "$100" not "$100.00" in descriptive text (the price
// column keeps its cents to stay aligned with the item + total rows).
function noCents(s) { return typeof s === 'string' ? s.replace(/\.00$/, '') : s; }
// Buyers should never see Stripe integration jargon. Card declines + validation errors carry
// user-safe messages from Stripe; anything else (integration/api/network) gets a friendly generic.
function friendlyPaymentError(err) {
  const type = err && err.type;
  if ((type === 'card_error' || type === 'validation_error') && err && err.message) return err.message;
  return 'We couldn’t process your payment. Please double-check your card details and try again — if it keeps happening, contact us and we’ll help.';
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
