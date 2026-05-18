// assets/js/product.js
// Populates the product page (sticky card, hero, gallery, story, features, related) from Supabase.
// Track B's ui.js owns: contemplation popup timer, exit modal, email-cta form dispatch, mobile nav.
// Track B's lightbox.js owns: gallery thumb click → fullscreen via [data-lightbox-trigger].
// This module only data-binds. It does not re-implement anything ui.js / lightbox.js already wires.

document.addEventListener('DOMContentLoaded', async () => {
  const slug = (() => {
    const path = window.location.pathname.match(/^\/product\/([^/]+)\/?$/);
    if (path) return path[1];
    return new URLSearchParams(window.location.search).get('slug');
  })();
  if (!slug) {
    revealNotFound();
    return;
  }

  await waitForSupabase();

  const product = await getProductBySlug(slug);
  if (!product) {
    revealNotFound();
    return;
  }

  populateMeta(product);
  populateStickyCard(product);
  populateHero(product);
  populateGallery(product);
  populateStory(product);
  populateFeatures(product);
  wireCartButtons(product);
  wireProductInterestForm(product);
  wireContemplationOfferSuccess(product);
  fireViewItem(product);
  renderRelatedProducts(product);
});

async function waitForSupabase() {
  for (let i = 0; i < 50 && !getSupabase(); i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

function revealNotFound() {
  document.querySelector('[data-product-not-found]')?.classList.remove('hidden');
  document.querySelector('[data-product]')?.classList.add('hidden');
}

function populateMeta(p) {
  if (p.seo_title) document.title = p.seo_title;
  else if (p.title) document.title = `${p.title} — Everlastings by Emaline`;
  const desc = p.seo_description || p.headline;
  if (desc) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', desc);
  }
}

function setText(sel, val) {
  const el = document.querySelector(sel);
  if (el && val !== undefined && val !== null && val !== '') el.textContent = val;
}

function populateStickyCard(p) {
  setText('[data-product-title]', p.title);
  setText('[data-product-headline]', p.headline);
  setText('[data-product-breadcrumb-title]', p.title);
  const priceEl = document.querySelector('[data-product-price]');
  if (priceEl) priceEl.textContent = formatPrice(p.price);

  // Set the article-level data-product-slug to the real slug (Track B left a placeholder).
  document.querySelectorAll('[data-product][data-product-slug]').forEach((el) => {
    el.setAttribute('data-product-slug', p.slug);
  });

  // Update the product-interest form's data-product-slug so ui.js dispatches with the right slug.
  document.querySelectorAll('form[data-email-cta="product-interest"]').forEach((form) => {
    form.setAttribute('data-product-slug', p.slug);
  });

  if (p.available === false) {
    document.querySelector('[data-product-sold]')?.classList.remove('hidden');
    document.querySelectorAll('[data-product-add-to-cart], [data-product-buy-now]').forEach((btn) => {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    });
    // Hide the interest CTA when sold (it's pre-sale only).
    document.querySelector('.interest-cta')?.classList.add('hidden');
  }
}

function populateHero(p) {
  const heroContainer = document.querySelector('[data-product-hero]');
  if (!heroContainer) return;
  const heroImg = pickHero(p);
  if (!heroImg) return;
  const img = heroContainer.querySelector('img');
  if (img) {
    img.src = heroImg.url;
    img.alt = heroImg.alt || p.title || '';
    img.onerror = () => img.classList.add('image-fallback');
  }
  // Also update the wrapping anchor's lightbox-src if present.
  const anchor = heroContainer.closest('a[data-lightbox-trigger]') || heroContainer.querySelector('a[data-lightbox-trigger]');
  if (anchor) {
    anchor.setAttribute('data-lightbox-src', heroImg.url);
    anchor.setAttribute('data-lightbox-caption', `${p.title || ''} — hero`);
  }
}

function populateGallery(p) {
  const thumbs = document.querySelector('[data-product-gallery-thumbs]');
  if (!thumbs) return;
  const galleryImages = (Array.isArray(p.images) ? p.images : []).filter((i) => /\/(?:test_)?gallery-/.test(i.url || ''));
  if (galleryImages.length === 0) return; // leave Track B fallback visible
  thumbs.innerHTML = galleryImages.map((img, i) => `
    <a href="#" data-lightbox-trigger data-lightbox-group="product-gallery"
       data-lightbox-caption="${escapeAttr(img.alt || `Gallery ${i + 1}`)}"
       data-lightbox-src="${escapeAttr(img.url)}"
       style="aspect-ratio: 4/5; background: var(--color-fog); border-radius: var(--radius-sm); overflow: hidden; display: block;">
      <img src="${escapeAttr(img.url)}" alt="${escapeAttr(img.alt || `Gallery ${i + 1}`)}" loading="lazy"
           style="width: 100%; height: 100%; object-fit: cover;">
    </a>
  `).join('');
}

function populateStory(p) {
  const story = document.querySelector('[data-product-story]');
  if (!story || !p.story_card) return;
  story.innerHTML = String(p.story_card).split(/\n\s*\n/).map((para) => `<p>${escapeHTML(para.trim())}</p>`).join('');
}

function populateFeatures(p) {
  const list = document.querySelector('[data-product-features]');
  if (!list) return;
  // Track B's hardcoded list is a great fallback. Only overwrite if Supabase provides structured features.
  if (Array.isArray(p.features) && p.features.length > 0) {
    list.innerHTML = p.features.map((item) => `<li>${escapeHTML(String(item))}</li>`).join('');
  }
}

function wireCartButtons(p) {
  const itemForCart = {
    product_id: p.id,
    slug: p.slug,
    title: p.title,
    price: p.price,
    thumbnail: p.thumbnail || pickHero(p)?.url || '',
    product_type: p.product_type,
    series: p.series,
    stripe_price_id: p.stripe_price_id,
  };
  document.querySelectorAll('[data-product-add-to-cart]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      addToCart(itemForCart);
      // Lightweight confirmation: temporarily flip the label.
      const original = btn.textContent;
      btn.textContent = 'Added ✓';
      setTimeout(() => { btn.textContent = original; }, 1400);
    });
  });
  document.querySelectorAll('[data-product-buy-now]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      addToCart(itemForCart);
      window.location.href = '/cart.html';
    });
  });
}

function wireProductInterestForm(p) {
  // ui.js auto-dispatches `email-cta-submit` for form[data-email-cta="product-interest"].
  // main.js's global listener POSTs to /api/subscribe with source 'product-interest' and productSlug.
  // All we do here is flip the form to success state on email-cta-success.
  window.addEventListener('email-cta-success', (e) => {
    if (e.detail?.source !== 'product-interest') return;
    const form = document.querySelector('form[data-email-cta="product-interest"]');
    const cta = form?.closest('.interest-cta');
    if (!cta) return;
    cta.innerHTML = '<p class="interest-cta__text">Thank you — we\'ll send word if anything changes.</p>';
  });
}

function wireContemplationOfferSuccess(p) {
  // ui.js owns the popup timer + close. We listen for the success event to swap in the promo code.
  window.addEventListener('email-cta-success', (e) => {
    if (e.detail?.source !== 'contemplation-offer') return;
    const popup = document.querySelector('[data-contemplation]');
    if (!popup) return;
    const code = e.detail?.promo_code || e.detail?.code;
    const form = popup.querySelector('form');
    if (form) form.classList.add('hidden');
    const message = document.createElement('div');
    message.style.cssText = 'padding: var(--space-md); text-align: center;';
    message.innerHTML = code
      ? `<p style="margin-bottom: var(--space-sm);"><strong>A small gift for your patience</strong></p>
         <p style="margin-bottom: var(--space-sm);">Use code <strong>${escapeHTML(code)}</strong> for 5% off your first piece.</p>
         <p style="font-size: var(--text-sm); color: var(--text-secondary);">Valid for 30 days. We've also emailed it to you.</p>`
      : `<p style="margin-bottom: var(--space-sm);">Welcome to the Firelight Council. Your code is on its way to your inbox.</p>`;
    popup.appendChild(message);
  });
}

function fireViewItem(p) {
  if (typeof gtag === 'function') {
    gtag('event', 'view_item', {
      currency: 'USD',
      value: p.price / 100,
      items: [buildGa4Item(p)],
    });
  }
  trackMeta('ViewContent', {
    content_ids: [p.slug],
    content_type: 'product',
    content_name: p.title,
    value: p.price / 100,
    currency: 'USD',
  });

  // GA4 video_play once per product video.
  document.querySelectorAll('video').forEach((video, idx) => {
    video.addEventListener('play', () => {
      if (typeof gtag === 'function') {
        gtag('event', 'video_play', { item_id: p.slug, video_index: idx });
      }
    }, { once: true });
  });
}

async function renderRelatedProducts(p) {
  const grid = document.querySelector('[data-related-havens]');
  if (!grid) return;
  let all;
  try {
    all = await getProducts({ available: true });
  } catch {
    return;
  }
  const sameSeries = all.filter((x) => x.id !== p.id && x.series === p.series).slice(0, 3);
  let related = sameSeries;
  if (related.length < 3) {
    const fillers = all
      .filter((x) => x.id !== p.id && x.product_type === p.product_type && !related.includes(x))
      .slice(0, 3 - related.length);
    related = [...related, ...fillers];
  }
  if (related.length === 0) {
    grid.closest('.related-havens')?.classList.add('hidden');
    return;
  }
  grid.innerHTML = related.map((rp) => {
    const thumb = rp.thumbnail || pickHero(rp)?.url || '';
    return `
      <article class="card product-tile" data-product-slug="${escapeAttr(rp.slug)}">
        <a href="/product/${escapeAttr(rp.slug)}" style="display: block; color: inherit; text-decoration: none;">
          <div class="card__media">
            ${rp.available ? '' : '<span class="badge badge-sold">Sold</span>'}
            <img loading="lazy" alt="${escapeAttr(rp.thumbnail_alt || rp.title || '')}" src="${escapeAttr(thumb)}">
          </div>
          <div class="card__body">
            <h3 class="card__title">${escapeAttr(rp.title || '')}</h3>
            <p class="card__price">${formatPrice(rp.price)}</p>
          </div>
        </a>
      </article>
    `;
  }).join('');
}

function pickHero(p) {
  const imgs = Array.isArray(p.images) ? p.images : [];
  return imgs.find((i) => /\/(?:test_)?hero-/.test(i.url || '')) || imgs[0] || null;
}

function escapeAttr(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
