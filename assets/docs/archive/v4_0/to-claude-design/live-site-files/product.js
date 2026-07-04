// assets/js/product.js
// Populates the product page (sticky card, hero, gallery, story, features, related) from Supabase.
// Track B's ui.js owns: contemplation popup timer, exit modal, email-cta form dispatch, mobile nav.
// Track B's lightbox.js owns: gallery thumb click → fullscreen via [data-lightbox-trigger].
// This module only data-binds. It does not re-implement anything ui.js / lightbox.js already wires.

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = (() => {
    const path = window.location.pathname.match(/^\/product\/([^/]+)\/?$/);
    if (path) return path[1];
    return params.get('slug');
  })();
  if (!slug) {
    revealNotFound();
    return;
  }

  const previewToken = params.get('preview');

  await waitForSupabase();

  const product = previewToken
    ? await fetchPreviewProduct(slug, previewToken)
    : await getProductBySlug(slug);
  if (!product) {
    revealNotFound();
    return;
  }

  populateMeta(product);
  populateOpenGraph(product);
  injectProductJsonLd(product);
  populateStickyCard(product);
  populateHero(product);
  populateGallery(product);
  populateStory(product);
  populateMedia(product);
  populateFeatures(product);
  wireCartButtons(product);
  wireProductInterestForm(product);
  wireContemplationOfferSuccess(product);
  if (!previewToken) fireViewItem(product); // no view_item/ViewContent on an owner preview load
  renderRelatedProducts(product);

  if (previewToken) {
    // an EDIT preview of an already-PUBLISHED product is is_published/available with a live
    // stripe_price_id, so its Buy/Add controls would create a REAL Checkout Session at the live price
    // beneath the "Draft preview — not yet live" banner. Disable + relabel them so the banner isn't
    // contradicted by a working purchase. (New-draft previews are also covered — checkout already rejects
    // unpublished rows server-side, but the controls shouldn't look active either.) The buttons honor
    // `btn.disabled`, so this is sufficient to block a transaction; full visual treatment is Part 3.
    disableCartControlsForPreview();
    mountPreviewBanner(product, previewToken);
  }
});

// neutralize the live purchase controls on a preview load (kept visible so Em sees the layout,
// but non-functional + clearly labeled). Full styling lands with the Part 3 preview visual slice.
// ANCHOR (why `btn.disabled` is sufficient, verifiable without opening files): both purchase controls
// are real `<button>` elements (so `disabled` actually suppresses the click — it would be a no-op on an
// `<a>`), and these exact selectors are the ones the page already uses to wire them. `product.html:289-290`:
//     <button type="button" class="btn btn-primary btn-block" data-product-add-to-cart>Add to Cart</button>
//     <button type="button" class="btn btn-secondary btn-block" data-product-buy-now …>Buy Now</button>
// and `product.js` reuses `[data-product-add-to-cart]` / `[data-product-buy-now]` to bind handlers (the
// sold-out path at :137 and the click wiring at :207/:218) — so this disable targets the same elements.
function disableCartControlsForPreview() {
  document.querySelectorAll('[data-product-add-to-cart], [data-product-buy-now]').forEach((btn) => {
    btn.disabled = true;
    btn.setAttribute('aria-disabled', 'true');
    btn.title = 'Preview only — publish to make this buyable';
    btn.textContent = 'Preview only';
  });
}

// v1.5 — preview fetches the draft via the service-role API (the anon client can't
// read unpublished rows under RLS). The token in the URL is the read capability.
async function fetchPreviewProduct(slug, token) {
  try {
    const res = await fetch(
      `/api/products?slug=${encodeURIComponent(slug)}&preview=${encodeURIComponent(token)}`,
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// The Publish bar is the one thing not in the shopper view — it doubles as the
// "not live yet" signal. Tapping it publishes via the token capability (no login).
function mountPreviewBanner(product, token) {
  const bar = document.createElement('div');
  bar.setAttribute('role', 'status');
  bar.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:9999;font-family:var(--font-body,sans-serif);box-shadow:0 2px 10px rgba(0,0,0,0.25);';

  // Row 1 — the status bar + Publish + a toggle for the review panel.
  const row = document.createElement('div');
  row.style.cssText =
    'display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;padding:10px 16px;background:var(--accent-primary,#4A1942);color:var(--text-inverse,#FFF8E7);font-size:14px;';
  const label = document.createElement('span');
  label.textContent = 'Draft preview — not yet live. This is how shoppers will see it.';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Publish';
  btn.style.cssText =
    'padding:6px 18px;border:0;border-radius:6px;background:var(--accent-gold,#D4AF7A);color:var(--color-ink,#1A1A1A);font:inherit;font-weight:600;cursor:pointer;';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Publishing…';
    try {
      const res = await fetch('/api/products/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        // surface the server's specific reason when there is one — e.g. the 409 publish guard
        // "This product is archived — resurface it before publishing" (Phase 3, test #18). A stale
        // preview of an archived piece would otherwise dead-end on a generic "try again".
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Publish failed');
      }
      window.location.href = `/product/${product.slug}`;
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Publish';
      label.textContent = err && err.message && err.message !== 'Publish failed'
        ? err.message
        : 'Could not publish — try again, or open your admin panel and tap “Publish now” there. If it still fails, text Sean.';
    }
  });
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = 'Hide draft details';
  toggle.style.cssText =
    'padding:6px 12px;border:1px solid rgba(255,255,255,0.4);border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer;';
  row.append(label, btn, toggle);

  // Row 2 — review panel: the fields the GPT wrote that the page itself never shows (SEO, the frozen
  // checkout line, the image crops). Copyable so the owner can paste one back to the GPT with edits.
  // Values come straight from the merged draft row (no innerHTML — GPT-generated text via textContent).
  const panel = document.createElement('div');
  panel.style.cssText =
    'display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;padding:12px 18px;background:#FFF8E7;color:var(--color-ink,#1A1A1A);border-top:1px solid rgba(0,0,0,0.12);font-size:13px;';
  const syncPad = () => { document.body.style.paddingTop = bar.offsetHeight + 'px'; };

  function textCell(labelTxt, value) {
    const cell = document.createElement('div');
    cell.style.cssText = 'flex:1 1 240px;min-width:200px;max-width:380px;';
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:3px;';
    const lab = document.createElement('span');
    lab.textContent = labelTxt;
    lab.style.cssText = 'font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#8a7a55;';
    head.appendChild(lab);
    if (value) {
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = 'Copy';
      copy.style.cssText = 'font-size:10px;border:1px solid #cbb990;border-radius:4px;background:#fff;color:#4A1942;padding:1px 7px;cursor:pointer;';
      copy.addEventListener('click', () => {
        navigator.clipboard?.writeText(value);
        copy.textContent = 'Copied'; setTimeout(() => (copy.textContent = 'Copy'), 1200);
      });
      head.appendChild(copy);
    }
    const val = document.createElement('div');
    val.textContent = value || '(not set — falls back to the page copy)';
    val.style.cssText = 'line-height:1.4;user-select:text;' + (value ? '' : 'color:#a08;opacity:.6;font-style:italic;');
    cell.append(head, val);
    return cell;
  }
  function imgCell(labelTxt, src, ratio) {
    const cell = document.createElement('div');
    cell.style.cssText = 'flex:0 0 auto;';
    const lab = document.createElement('div');
    lab.textContent = labelTxt;
    lab.style.cssText = 'font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#8a7a55;margin-bottom:3px;';
    cell.appendChild(lab);
    if (src) {
      const img = document.createElement('img');
      img.src = src; img.alt = labelTxt; img.loading = 'lazy';
      // Crop to the TARGET ratio (cover) so the cell shows how the image will actually be cropped at
      // that aspect — a 1:1 cell reads square, a 1.91:1 cell reads wide, a 4:5 cell reads portrait.
      img.style.cssText = 'height:74px;aspect-ratio:' + ratio + ';object-fit:cover;border:1px solid rgba(0,0,0,0.18);border-radius:4px;background:#fff;display:block;';
      cell.appendChild(img);
    } else {
      const none = document.createElement('div');
      none.textContent = '(not set)';
      none.style.cssText = 'color:#a08;opacity:.6;font-style:italic;font-size:11px;';
      cell.appendChild(none);
    }
    return cell;
  }

  panel.append(
    textCell('SEO title', product.seo_title),
    textCell('SEO description', product.seo_description),
    textCell('Checkout name', product.checkout_name),
    textCell('Checkout line', product.checkout_description),
    imgCell('Thumbnail (4:5)', product.thumbnail, '4 / 5'),
    imgCell('OG image (1.91:1)', product.seo_thumbnail, '1.91 / 1'),
    imgCell('Checkout image (1:1)', product.checkout_image, '1 / 1'),
  );

  let open = true;
  toggle.addEventListener('click', () => {
    open = !open;
    panel.style.display = open ? 'flex' : 'none';
    toggle.textContent = open ? 'Hide draft details' : 'Show draft details';
    syncPad();
  });

  bar.append(row, panel);
  document.body.appendChild(bar);
  syncPad();
  window.addEventListener('resize', syncPad);
}

// v1.5 — optional media (MP4 + YouTube), data-driven, hides when absent. Mirrors the portfolio's
// renderMedia pattern (structured + createElement + hide-when-empty, 360-design
// media-controller.js); we build the YouTube iframe from a parsed video id rather than storing raw
// embed HTML — safer for GPT-generated values (no innerHTML injection).
function populateMedia(p) {
  const container = document.querySelector('[data-product-media]');
  if (!container) return;
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const items = Array.isArray(p.media) ? p.media : [];
  if (!items.length) return; // stays hidden — media is optional
  const ordered = [...items].sort((a, b) => (a?.type === 'youtube' ? 1 : 0) - (b?.type === 'youtube' ? 1 : 0)); // MP4s first
  const frag = document.createDocumentFragment();
  for (const m of ordered) {
    if (!m || !m.url) continue;
    if (m.type === 'video') {
      const wrap = document.createElement('div');
      wrap.className = 'product-media__item';
      const v = document.createElement('video');
      v.src = m.url;
      if (m.poster) v.poster = m.poster;
      v.playsInline = true;
      v.preload = 'metadata';
      // Per-clip behaviour — the GPT/admin sets these case-by-case. Two presets:
      //   GIF-like      : autoplay:true, loop:true → plays itself, silent, no buttons.
      //   click-to-play : default → she presses play; buttons shown; sound on.
      // A GIF-like clip is auto-playing motion, so honor prefers-reduced-motion —
      // for those visitors it falls back to a paused, click-to-play video (poster + buttons).
      const wantsAutoplay = m.autoplay === true;
      v.autoplay = wantsAutoplay && !reduceMotion;
      v.loop = m.loop === true;
      if (v.autoplay) {
        v.muted = true;                    // browsers only allow muted autoplay
        v.controls = m.controls === true;  // GIF-like → no buttons unless asked
      } else {
        v.muted = m.muted === true;        // has sound unless she asks to mute
        // click-to-play buttons; a reduced-motion'd GIF-like clip always gets them so it stays playable.
        v.controls = wantsAutoplay ? true : (m.controls !== false);
      }
      if (m.alt) v.setAttribute('aria-label', m.alt);
      wrap.appendChild(v);
      frag.appendChild(wrap);
    } else if (m.type === 'youtube') {
      const id = youtubeId(m.url);
      if (!id) continue;
      const wrap = document.createElement('div');
      wrap.className = 'product-media__item product-media__item--embed';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}`;
      iframe.title = m.alt || 'Video';
      iframe.loading = 'lazy';
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
      frag.appendChild(wrap);
    }
  }
  if (!frag.childNodes.length) return;
  container.innerHTML = '';
  container.appendChild(frag);
  container.classList.remove('hidden');
}

function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

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

function setMeta(selector, attribute, value) {
  const el = document.querySelector(selector);
  if (el && value) el.setAttribute(attribute, value);
}

function populateOpenGraph(p) {
  const canonicalUrl = `https://everlastingsbyemaline.com/product/${p.slug}`;
  const ogTitle = p.seo_title || p.title;
  const ogDesc = p.seo_description || p.headline || '';
  const heroImg = pickHero(p);
  const heroUrl = heroImg ? heroImg.url : 'https://everlastingsbyemaline.com/assets/brand/favicon/logo_circle_purple_red_2400.png';

  setMeta('meta[property="og:title"]', 'content', ogTitle);
  setMeta('meta[property="og:description"]', 'content', ogDesc);
  setMeta('meta[property="og:url"]', 'content', canonicalUrl);
  setMeta('meta[property="og:image"]', 'content', heroUrl);
  setMeta('meta[property="og:image:alt"]', 'content', (heroImg && heroImg.alt) || p.title || '');
  setMeta('meta[property="og:type"]', 'content', 'product');
  setMeta('meta[name="twitter:title"]', 'content', ogTitle);
  setMeta('meta[name="twitter:description"]', 'content', ogDesc);
  setMeta('meta[name="twitter:image"]', 'content', heroUrl);
  setMeta('link[rel="canonical"]', 'href', canonicalUrl);
}

function injectProductJsonLd(p) {
  const heroImg = pickHero(p);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: p.seo_description || p.headline || '',
    image: heroImg ? heroImg.url : undefined,
    sku: p.sku || p.slug,
    brand: { '@type': 'Brand', name: 'Everlastings by Emaline' },
    offers: {
      '@type': 'Offer',
      url: `https://everlastingsbyemaline.com/product/${p.slug}`,
      priceCurrency: 'USD',
      price: ((p.price || 0) / 100).toFixed(2),
      availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
  // Strip undefined keys so the JSON is clean.
  Object.keys(ld).forEach((k) => { if (ld[k] === undefined) delete ld[k]; });
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);
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
      window.location.href = '/cart';
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
