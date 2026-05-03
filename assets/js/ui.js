/* ============================================================================
   UI interactions — mobile nav, exit-intent modal, contemplation popup,
   email-CTA form dispatch, cookie consent banner.
   v1.4.3 Track B (B1 + B1.5)
   ----------------------------------------------------------------------------
   Track C wires the API calls. This file only handles DOM, state, and
   dispatches CustomEvents that Track C listens to.

   CustomEvent contracts (Track C will listen for these on `window`):

     1. 'email-cta-submit'
        detail: {
          source: 'product-interest' | 'cart-exit' | 'contemplation-offer'
                  | 'newsletter-footer' | 'newsletter-shop-empty',
          email: string,
          productSlug?: string,   // present for 'product-interest' only
        }
        Track C: POST /api/subscribe with this payload + show toast on success.

     2. 'consent-change'
        detail: {
          analytics:   'granted' | 'denied',
          advertising: 'granted' | 'denied',
          timestamp:   string (ISO),
          version:     1,
        }
        Track C: gtag('consent', 'update', ...) + fbq('consent', 'grant'|'revoke')
                 + (CA-detected) fbq('dataProcessingOptions', ['LDU'], 0, 0).

   Storage keys:
     localStorage 'everlastings.consent' — see v1_4_3_B_RESEARCH_COOKIE_CONSENT.md
     sessionStorage 'everlastings.exitModalShown' — once-per-session gate.
     sessionStorage 'everlastings.contemplationShown' — once-per-session gate.
   ============================================================================ */

(function () {
  'use strict';

  /* -------------------------------------------------------------------------
     Sticky header shadow on scroll
     ------------------------------------------------------------------------- */
  const header = document.querySelector('[data-site-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* -------------------------------------------------------------------------
     Mobile nav drawer
     ------------------------------------------------------------------------- */
  const navToggle = document.querySelector('[data-nav-toggle]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileNav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        mobileNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* -------------------------------------------------------------------------
     Email-CTA forms — dispatch CustomEvent for Track C
     Any <form data-email-cta="<source>"> is wired automatically.
     Form must contain: <input type="email"> and (optional) data-product-slug.
     ------------------------------------------------------------------------- */
  document.querySelectorAll('form[data-email-cta]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const source = form.dataset.emailCta;
      const emailEl = form.querySelector('input[type="email"]');
      const email = emailEl?.value?.trim() || '';
      if (!email || !email.includes('@')) {
        emailEl?.setCustomValidity('Valid email required');
        emailEl?.reportValidity();
        return;
      }
      const detail = { source, email };
      const productSlug = form.dataset.productSlug;
      if (productSlug) detail.productSlug = productSlug;

      window.dispatchEvent(new CustomEvent('email-cta-submit', { detail }));

      // Optimistic: show toast immediately. Track C may show a different one
      // on actual API success/failure.
      showToast("You're on the list.");

      // Reset and dismiss any associated container.
      form.reset();
      const exitModal = form.closest('[data-exit-modal]');
      if (exitModal) exitModal.classList.remove('is-open');
      const contemplation = form.closest('[data-contemplation]');
      if (contemplation) contemplation.classList.remove('is-visible');
    });
  });

  /* -------------------------------------------------------------------------
     Toast helper
     ------------------------------------------------------------------------- */
  let toastEl = document.querySelector('[data-toast]');
  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('data-toast', '');
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastEl._dismiss);
    toastEl._dismiss = setTimeout(() => toastEl.classList.remove('is-visible'), 3500);
  }

  /* -------------------------------------------------------------------------
     Cart exit-intent modal — only triggers if cart has items.
     Desktop: mouseleave from top of viewport.
     Mobile:  visibilitychange (tab hidden).
     Once per session via sessionStorage flag.
     ------------------------------------------------------------------------- */
  const exitModal = document.querySelector('[data-exit-modal]');
  function cartHasItems() {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      return Array.isArray(cart) && cart.length > 0;
    } catch { return false; }
  }
  function maybeShowExitModal() {
    if (!exitModal) return;
    if (sessionStorage.getItem('everlastings.exitModalShown') === '1') return;
    if (!cartHasItems()) return;
    sessionStorage.setItem('everlastings.exitModalShown', '1');
    exitModal.classList.add('is-open');
  }
  if (exitModal) {
    document.addEventListener('mouseleave', (e) => {
      if (e.clientY <= 0) maybeShowExitModal();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) maybeShowExitModal();
    });
    exitModal.querySelector('[data-exit-modal-close]')?.addEventListener('click', () => {
      exitModal.classList.remove('is-open');
    });
    exitModal.querySelector('[data-exit-modal-overlay]')?.addEventListener('click', () => {
      exitModal.classList.remove('is-open');
    });
  }

  /* -------------------------------------------------------------------------
     3-minute contemplation popup (product page only).
     Triggered by setTimeout. Once per session.
     Skipped if user already subscribed via product-interest CTA this session.
     ------------------------------------------------------------------------- */
  const contemplationPopup = document.querySelector('[data-contemplation]');
  if (contemplationPopup) {
    setTimeout(() => {
      if (sessionStorage.getItem('everlastings.contemplationShown') === '1') return;
      if (sessionStorage.getItem('everlastings.subscribedThisSession') === '1') return;
      sessionStorage.setItem('everlastings.contemplationShown', '1');
      contemplationPopup.classList.add('is-visible');
    }, 3 * 60 * 1000);

    contemplationPopup.querySelector('[data-contemplation-close]')?.addEventListener('click', () => {
      contemplationPopup.classList.remove('is-visible');
    });
  }

  // Mark "subscribed this session" so contemplation popup doesn't show after.
  window.addEventListener('email-cta-submit', () => {
    sessionStorage.setItem('everlastings.subscribedThisSession', '1');
  });

  /* -------------------------------------------------------------------------
     Cookie consent banner (B1.5)
     Per v1_4_3_B_RESEARCH_COOKIE_CONSENT.md §6: bottom-strip soft-prompt,
     symmetric Accept/Decline, default-deny gtag (declared in <head> before
     gtag.js loads — see canonical head snippet), localStorage persistence.
     Track C listens for 'consent-change' to wire actual gtag/fbq calls.
     ------------------------------------------------------------------------- */
  const banner = document.querySelector('[data-cookie-banner]');
  const STORAGE_KEY = 'everlastings.consent';

  function readConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;
      return parsed;
    } catch { return null; }
  }

  function writeConsent(state) {
    const value = {
      analytics: state.analytics,
      advertising: state.advertising,
      timestamp: new Date().toISOString(),
      version: 1,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return value;
  }

  function dispatchConsent(value) {
    window.dispatchEvent(new CustomEvent('consent-change', { detail: value }));
  }

  function showBanner() {
    if (!banner) return;
    // Slight delay to let LCP complete cleanly.
    setTimeout(() => banner.classList.add('is-visible'), 500);
  }
  function hideBanner() {
    banner?.classList.remove('is-visible');
  }

  function acceptAll() {
    const value = writeConsent({ analytics: 'granted', advertising: 'granted' });
    dispatchConsent(value);
    hideBanner();
  }

  function declineAll() {
    const value = writeConsent({ analytics: 'denied', advertising: 'denied' });
    dispatchConsent(value);
    hideBanner();
  }

  if (banner) {
    banner.querySelector('[data-cookie-accept]')?.addEventListener('click', acceptAll);
    banner.querySelector('[data-cookie-decline]')?.addEventListener('click', declineAll);

    const stored = readConsent();
    if (stored) {
      // Already decided — re-fire so Track C wires gtag/fbq state on every
      // page-load, regardless of previous choice.
      dispatchConsent(stored);
    } else {
      // First visit (or post-revoke) — show banner.
      showBanner();
    }
  }

  // Footer "Privacy preferences" link re-opens the banner.
  document.querySelectorAll('[data-cookie-revoke]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (banner) banner.classList.add('is-visible');
    });
  });
})();
