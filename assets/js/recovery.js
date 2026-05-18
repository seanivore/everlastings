// assets/js/recovery.js
// Populates Track B's existing [data-sold-recovery] overlay with unavailable items + related products,
// then wires the email form to POST /api/cart-recovery and reveal the promo code on success.
// Track B already shipped the overlay markup; this module only data-binds.

function showSoldRecovery({ unavailable = [], related = [] }) {
  const overlay = document.querySelector('[data-sold-recovery]');
  if (!overlay) return;

  // Reset any prior state so a second 409 re-renders cleanly.
  overlay.querySelector('[data-sold-recovery-code]')?.classList.add('hidden');
  const codeEl = overlay.querySelector('[data-sold-recovery-code-value]');
  if (codeEl) codeEl.textContent = '';
  const form = overlay.querySelector('[data-sold-recovery-form]');
  if (form) {
    form.classList.remove('hidden');
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send 10% Code';
    }
    const stale = form.querySelector('.recovery-error');
    if (stale) stale.remove();
  }

  populateUnavailableList(overlay, unavailable);
  populateRelatedGrid(overlay, related);
  wireRecoveryForm(overlay, unavailable);

  overlay.classList.remove('hidden');
  overlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function populateUnavailableList(overlay, unavailable) {
  const list = overlay.querySelector('[data-sold-recovery-list]');
  if (!list || !Array.isArray(unavailable) || unavailable.length === 0) return;
  list.innerHTML = unavailable.map((item) => {
    const title = typeof item === 'string' ? item : (item.title || item.slug || 'A haven');
    const thumb = (typeof item === 'object' && item.thumbnail) ? item.thumbnail : '';
    return `
      <li style="display: flex; gap: var(--space-md); align-items: center; padding: var(--space-sm) 0;">
        ${thumb
          ? `<img src="${escapeRec(thumb)}" alt="${escapeRec(title)}" style="width: 60px; height: 75px; object-fit: cover; border-radius: var(--radius-sm);">`
          : `<div style="width: 60px; height: 75px; background: var(--color-fog); border-radius: var(--radius-sm);"></div>`}
        <span><strong>${escapeRec(title)}</strong> — has found its home.</span>
      </li>
    `;
  }).join('');
}

function populateRelatedGrid(overlay, related) {
  const wrapper = overlay.querySelector('[data-sold-recovery-related]');
  const grid = overlay.querySelector('[data-sold-recovery-related-grid]');
  if (!grid) return;
  if (!Array.isArray(related) || related.length === 0) {
    wrapper?.classList.add('hidden');
    grid.innerHTML = '';
    return;
  }
  grid.innerHTML = related.slice(0, 3).map((p) => {
    const thumb = p.thumbnail || (Array.isArray(p.images) && p.images[0] && p.images[0].url) || '';
    return `
      <a href="/product/${escapeRec(p.slug)}" class="card" style="display: block; color: inherit; text-decoration: none;">
        <div class="card__media">
          <img loading="lazy" src="${escapeRec(thumb)}" alt="${escapeRec(p.thumbnail_alt || p.title || '')}">
        </div>
        <div class="card__body">
          <h4 class="card__title" style="font-size: var(--text-lg);">${escapeRec(p.title || '')}</h4>
          <p class="card__price">${formatPrice(p.price || 0)}</p>
        </div>
      </a>
    `;
  }).join('');
  wrapper?.classList.remove('hidden');
}

function wireRecoveryForm(overlay, unavailable) {
  const form = overlay.querySelector('[data-sold-recovery-form]');
  if (!form || form.dataset.wired === '1') return;
  form.dataset.wired = '1';

  // Pre-fill email from sessionStorage if present.
  const emailInput = form.querySelector('input[type="email"]');
  if (emailInput) emailInput.value = sessionStorage.getItem('checkout_email') || '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Generating…';
    }
    const email = emailInput?.value.trim() || '';
    if (!email) {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send 10% Code'; }
      return;
    }
    sessionStorage.setItem('checkout_email', email);

    const lost_items = (unavailable || []).map((u) => {
      if (typeof u === 'string') return { slug: u };
      return { slug: u.slug, title: u.title };
    });

    try {
      const res = await fetch('/api/cart-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lost_items }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      form.classList.add('hidden');
      const codeBlock = overlay.querySelector('[data-sold-recovery-code]');
      const codeValue = overlay.querySelector('[data-sold-recovery-code-value]');
      if (codeValue && (data.code || data.promo_code)) codeValue.textContent = data.code || data.promo_code;
      codeBlock?.classList.remove('hidden');
      if (typeof gtag === 'function') {
        gtag('event', 'promo_code_generated', { code: data.code || data.promo_code || '' });
      }
    } catch (err) {
      const errMsg = document.createElement('p');
      errMsg.className = 'recovery-error';
      errMsg.style.cssText = 'margin-top: var(--space-sm); color: var(--color-error); font-size: var(--text-sm);';
      errMsg.textContent = 'Could not generate code. Please try again.';
      form.appendChild(errMsg);
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send 10% Code'; }
    }
  });
}

function escapeRec(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
