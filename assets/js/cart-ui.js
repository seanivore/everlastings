/* ============================================================================
   Cart UI — badge counter from localStorage.
   v1.4.3 Track B (B1)
   ----------------------------------------------------------------------------
   Reads cart from localStorage and updates any cart badge in the DOM.
   Listens to the 'storage' event so badge updates across tabs.
   This file makes NO API calls. Track C handles add/remove/checkout flow.

   Storage shape (Track B placeholder; Track C may extend):
     localStorage 'cart' = JSON.stringify([
       { product_id: '<uuid>', slug: '<slug>', quantity: 1 },
       ...
     ])
   ============================================================================ */

(function () {
  'use strict';

  // PLACEHOLDER: sample-cart-data — Track C will populate via real cart actions.
  // Uncomment to test the badge visually:
  // localStorage.setItem('cart', JSON.stringify([
  //   { product_id: 'placeholder', slug: 'placeholder-haven-i', quantity: 1 },
  // ]));
  // /PLACEHOLDER

  function getCart() {
    try {
      const raw = localStorage.getItem('cart');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function updateBadges() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    document.querySelectorAll('[data-cart-badge]').forEach((badge) => {
      badge.textContent = String(count);
      badge.setAttribute('data-count', String(count));
      badge.style.display = count > 0 ? '' : 'none';
    });
  }

  updateBadges();
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart') updateBadges();
  });
  // Track C may dispatch this after add/remove actions.
  window.addEventListener('cart-updated', updateBadges);
})();
