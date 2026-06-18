// Everlastings admin UI — vanilla JS module.
//
// Auth model: this UI uses Supabase email/password auth. The user's JWT is
// sent to the API as `Authorization: Bearer <jwt>`. Both `/api/products` and
// `/api/upload` accept either PRODUCT_API_KEY (for AI/curl callers) or a
// Supabase JWT (for this UI). `/api/orders` and `/api/orders/<id>` accept
// either too via requireAdmin (the GPT drives refundOrder/listOrders/markShipped with PRODUCT_API_KEY).

const supabaseGlobal = window.supabase;
if (!supabaseGlobal || typeof supabaseGlobal.createClient !== 'function') {
  console.error('Supabase JS CDN failed to load.');
}

const state = {
  client: null,
  session: null,
  products: [],
  editing: null,
  ordersStatus: 'needs_shipping',
};

const $ = (id) => document.getElementById(id);

function setStatus(elId, message, kind) {
  const el = $(elId);
  if (!el) return;
  if (!message) {
    el.innerHTML = '';
    return;
  }
  const cls = kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'info';
  el.innerHTML = `<div class="status-msg ${cls}"></div>`;
  el.firstElementChild.textContent = message;
}

function escapeHtml(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dollarsToCents(value) {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}

function centsToDollars(cents) {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '';
  return (cents / 100).toFixed(2);
}

function linesToArray(text) {
  if (typeof text !== 'string') return [];
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function arrayToLines(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.join('\n');
}

function deriveSlug(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function trackingUrl(carrier, num) {
  if (!carrier || !num) return null;
  const c = String(carrier).toUpperCase();
  const n = encodeURIComponent(num);
  if (c === 'USPS') return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (c === 'UPS') return `https://www.ups.com/track?loc=en_US&tracknum=${n}`;
  if (c === 'FEDEX') return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  if (c === 'DHL') return `https://www.dhl.com/en/express/tracking.html?AWB=${n}`;
  return null;
}

async function loadConfig() {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to load /api/config');
  const cfg = await res.json();
  if (!cfg.supabaseUrl || !cfg.supabasePublishableKey) {
    throw new Error('Supabase config missing from /api/config response');
  }
  return cfg;
}

async function init() {
  let cfg;
  try {
    cfg = await loadConfig();
  } catch (err) {
    setStatus('login-status', err.message, 'error');
    return;
  }

  state.client = supabaseGlobal.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });

  const { data: sessionData } = await state.client.auth.getSession();
  state.session = sessionData?.session ?? null;
  renderAuthState();

  state.client.auth.onAuthStateChange((_event, session) => {
    state.session = session ?? null;
    renderAuthState();
  });

  attachEventListeners();
}

function renderAuthState() {
  const loginView = $('login-view');
  const adminView = $('admin-view');
  if (state.session) {
    loginView.classList.add('hidden');
    adminView.classList.remove('hidden');
    $('session-email').textContent = state.session.user?.email ?? '';
    refreshActiveTab();
  } else {
    loginView.classList.remove('hidden');
    adminView.classList.add('hidden');
  }
}

function attachEventListeners() {
  $('login-form').addEventListener('submit', onLoginSubmit);
  $('logout-btn').addEventListener('click', onLogout);

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  $('new-product-btn').addEventListener('click', () => openEditor(null));
  $('refresh-products-btn').addEventListener('click', loadProducts);
  $('cancel-edit').addEventListener('click', closeEditor);
  $('product-form').addEventListener('submit', onSaveProduct);
  $('delete-product').addEventListener('click', onArchiveToggle);
  $('add-image-row').addEventListener('click', () => addImageRow('', ''));
  $('add-media-row').addEventListener('click', () => addMediaRow(null)); // WS3.7b — structured media editor's add button (folded here so :152-161 is touched once; AR#B1/C2/D8)
  wireUploadZones();                                       // P3d — wire the seven role zones (replaces the deleted #upload-btn handler + onUploadImage fn)
  wireProductSubtabs();                                    // P0(i) — product-list state filter
  $('editor-back').addEventListener('click', closeEditor); // P0(ii) — ← Products back control

  document.querySelectorAll('#tab-orders .subtab-btn').forEach((btn) => {   // SCOPED to #tab-orders (the P0 product subtabs reuse `.subtab-btn`)
    btn.addEventListener('click', () => {
      state.ordersStatus = btn.dataset.status;
      document.querySelectorAll('#tab-orders .subtab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      loadOrders();
    });
  });
  $('orders-search-btn').addEventListener('click', loadOrders);
  $('orders-refresh-btn').addEventListener('click', loadOrders);
  $('orders-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadOrders();
    }
  });

  $('coupon-form').addEventListener('submit', onCreateCoupon);
  $('coupons-refresh-btn').addEventListener('click', loadCoupons);
  $('c-product-search').addEventListener('input', populateCouponProducts); // re-filter live (render-tune AR#F9: debounce ~150ms if a template "User" catalog ever exceeds ~100 pieces; unconditional is fine at Emy's scale)
}

async function onLoginSubmit(e) {
  e.preventDefault();
  setStatus('login-status', '', 'info');
  const email = $('login-email').value.trim();
  const password = $('login-password').value;
  $('login-submit').disabled = true;
  try {
    const { error } = await state.client.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('login-status', error.message, 'error');
      return;
    }
    $('login-password').value = '';
  } catch (err) {
    setStatus('login-status', err.message || 'Sign-in failed', 'error');
  } finally {
    $('login-submit').disabled = false;
  }
}

async function onLogout() {
  await state.client.auth.signOut();
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('tab-products').classList.toggle('hidden', tab !== 'products');
  $('tab-orders').classList.toggle('hidden', tab !== 'orders');
  $('tab-coupons').classList.toggle('hidden', tab !== 'coupons');
  refreshActiveTab();
}

function refreshActiveTab() {
  if (!state.session) return;
  if (!$('tab-products').classList.contains('hidden')) loadProducts();
  else if (!$('tab-coupons').classList.contains('hidden')) loadCoupons();
  else loadOrders();
}

function authHeader() {
  const token = state.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function loadProducts() {
  setStatus('products-status', '', 'info');
  closeEditor();
  $('products-list').innerHTML = Array.from({ length: 6 }, () =>
    '<div class="product-card"><div class="skeleton" style="height:140px"></div>'
    + '<div class="skeleton" style="height:14px;margin:8px 0 6px"></div>'
    + '<div class="skeleton" style="height:12px;width:60%"></div></div>').join('');
  try {
    const res = await fetch('/api/products', { headers: { ...authHeader() } });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    state.products = Array.isArray(data.products) ? data.products : [];
    renderProductList();
  } catch (err) {
    setStatus('products-status', `Failed to load products: ${err.message}`, 'error');
  }
}

// ONE canonical product-state predicate (P0) — drives BOTH the filter subtabs and the P2 card badge.
// Precedence (first match wins): archived overrides everything; then draft; then edits (published with a
// staged draft pending); then sold; else live.
function productState(p) {
  if (p.archived_at) return 'archived';   // overrides everything
  if (!p.is_published) return 'draft';
  if (p.draft != null) return 'edits';    // published with a staged draft pending
  if (!p.available) return 'sold';
  return 'live';
}

let activeProductFilter = 'all';                  // module-level, beside `state`
function matchesProductFilter(p) {
  if (activeProductFilter === 'all') return true;
  const s = productState(p);                      // the ONE canonical predicate above
  if (activeProductFilter === 'live') return s === 'live' || s === 'edits'; // Edits list under Live
  return s === activeProductFilter;
}
function wireProductSubtabs() {                    // call once from init/attachEventListeners
  document.querySelectorAll('#product-subtabs .subtab-btn').forEach((b) => {
    b.addEventListener('click', () => {
      activeProductFilter = b.dataset.pstate;
      document.querySelectorAll('#product-subtabs .subtab-btn').forEach((x) => x.classList.toggle('active', x === b));
      renderProductList();                         // re-render from the already-fetched state.products — NO refetch
    });
  });
}

function renderProductList() {
  const list = $('products-list');
  const shown = (state.products || []).filter(matchesProductFilter);   // P0 state-filter (module-level activeProductFilter)
  if (!shown.length) {
    const msg = !(state.products && state.products.length)
      ? 'No products yet. Click "New Product" to add one.'
      : 'No products match this filter.';                              // AR#D5 — honest two-state empty copy (empty catalog vs filtered-empty)
    list.innerHTML = `<div class="empty">${msg}</div>`;
    return;
  }
  list.innerHTML = '';
  for (const p of shown) {
    const card = document.createElement('div');
    card.className = p.archived_at ? 'product-card is-archived' : 'product-card';   // AR#D2 — dim archived (opacity:.6)
    const thumb = p.thumbnail || (Array.isArray(p.images) && p.images[0]?.url) || '';
    const priceLabel = typeof p.price === 'number' ? `$${centsToDollars(p.price)}` : '—';
    const s = productState(p);                                         // ONE canonical predicate (P0) — the single status axis
    card.innerHTML = `
      <span class="pc-badge pill ${s}">${s}</span>
      <img src="${escapeHtml(thumb)}" alt="${escapeHtml(p.thumbnail_alt || p.title || '')}" />
      <p class="pc-title">${escapeHtml(p.title || '(untitled)')}</p>
      <p class="pc-meta">${priceLabel} · qty ${p.quantity ?? '—'}</p>
    `;
    card.addEventListener('click', () => openEditor(p.id));
    list.appendChild(card);
  }
}

function openEditor(productId) {
  const product = productId ? state.products.find((p) => p.id === productId) : null;
  state.editing = product || null;
  // Overlay any staged draft so the editor SHOWS and BUILDS ON pending edits (a published row may carry
  // copy/SEO/photo edits staged by the GPT or a prior admin save). `draft` only ever
  // holds DRAFTABLE keys (api/products.ts §3.4), so `eff` == `product` for the live-apply trio and for
  // anything with nothing staged: read price/available/quantity + slug/id/type from the live `product`,
  // and every draftable copy/SEO/array field from `eff`. Paired with §3.4's live-compare change-detect,
  // re-saving these staged values back is a no-op — they still differ from live, so the existingDraft
  // spread preserves them; they are NOT re-clobbered with the live value.
  const eff = product ? { ...product, ...(product.draft || {}) } : null;
  setStatus('editor-status', '', 'info');
  $('product-editor').classList.remove('hidden');
  $('products-list').classList.add('hidden');
  $('product-subtabs')?.classList.add('hidden'); // P0(iv) — hide the state-filter chrome while editing
  document.querySelector('.state-legend')?.classList.add('hidden');
  $('editor-heading').textContent = product ? `Edit: ${product.title}` : 'New Product';

  $('p-id').value = product?.id ?? '';
  $('p-title').value = eff?.title ?? '';
  $('p-slug').value = product?.slug ?? '';
  $('p-slug').disabled = !!product;
  $('p-headline').value = eff?.headline ?? '';
  $('p-story').value = eff?.story_card ?? '';
  $('p-description').value = eff?.description ?? '';
  $('p-features').value = arrayToLines(eff?.features);
  $('p-price').value = typeof product?.price === 'number' ? centsToDollars(product.price) : '';   // live-apply — show live
  $('p-quantity').value = product?.quantity ?? 1;                                                  // live-apply — show live
  $('p-type').value = product?.product_type ?? 'miniature';
  $('p-dimensions').value = eff?.dimensions ?? '';
  $('p-weight').value = eff?.weight ?? '';
  $('p-power').value = eff?.power_supply ?? '';
  $('p-materials').value = arrayToLines(eff?.materials);
  $('p-care').value = arrayToLines(eff?.care_instructions);
  $('p-shipping').value = arrayToLines(eff?.shipping_details);
  $('p-series').value = eff?.series ?? '';
  $('p-theme').value = eff?.homepage_theme ? JSON.stringify(eff.homepage_theme) : '';
  const mediaList = $('p-media-list');
  mediaList.innerHTML = '';
  if (Array.isArray(eff?.media)) eff.media.forEach((m) => addMediaRow(m));
  $('p-available').checked = product?.available !== false;                                         // live-apply — show live
  $('p-featured').checked = !!eff?.featured;
  $('p-artist-note').value = eff?.artist_note ?? '';
  $('p-seo-title').value = eff?.seo_title ?? '';
  $('p-seo-description').value = eff?.seo_description ?? '';
  $('p-seo-thumbnail').value = eff?.seo_thumbnail ?? '';
  $('p-checkout-name').value = eff?.checkout_name ?? '';
  $('p-checkout-description').value = eff?.checkout_description ?? '';
  $('p-checkout-image').value = eff?.checkout_image ?? '';
  $('p-thumbnail').value = eff?.thumbnail ?? '';
  $('p-thumbnail-alt').value = eff?.thumbnail_alt ?? '';

  const imgList = $('p-images');
  imgList.innerHTML = '';
  if (Array.isArray(eff?.images) && eff.images.length) {
    for (const img of eff.images) addImageRow(img.url || '', img.alt || '');
  } else {
    addImageRow('', '');
  }

  const archiveBtn = $('delete-product');
  archiveBtn.classList.toggle('hidden', !product);
  archiveBtn.textContent = product?.archived_at ? 'Resurface' : 'Archive';
  // P3d — clear the per-zone upload messages (the old single status line was removed; reaching for it
  // would now resolve to null → null.textContent throws a TypeError on EVERY editor open, invisible to tsc/node --check).
  document.querySelectorAll('.upload-zone .zone-msg').forEach((m) => { m.textContent = ''; });
}

function closeEditor() {
  $('product-editor').classList.add('hidden');
  $('products-list').classList.remove('hidden');
  $('product-subtabs')?.classList.remove('hidden'); // P0(iv) mirror — restore the list chrome
  document.querySelector('.state-legend')?.classList.remove('hidden');
  state.editing = null;
}

function addImageRow(url, alt) {
  const list = $('p-images');
  const row = document.createElement('div');
  row.className = 'img-url-row';
  row.innerHTML = `
    <img class="img-thumb" alt="" />
    <span class="img-role" style="font-size:11px;color:var(--c-text-muted,#666)"></span>
    <input type="url" class="img-url" placeholder="https://cdn.../products/slug/hero-slug.webp" />
    <input type="text" class="img-alt" placeholder="alt text" />
    <button type="button" class="remove-row">Remove</button>
  `;
  const urlInput = row.querySelector('.img-url');
  const thumb = row.querySelector('.img-thumb');
  const roleTag = row.querySelector('.img-role');
  const sync = () => {
    const v = urlInput.value.trim();
    thumb.src = v;
    thumb.style.visibility = v ? 'visible' : 'hidden';
    const m = v.match(/\/(?:test_)?(hero|thumbnail|seo_thumbnail|checkout_image|gallery-\d+|detail-\d+|video-\d+)[-.]/); // all 7 roles (AR#37) — was missing seo_thumbnail/checkout_image
    roleTag.textContent = m ? m[1] : '';
    updateCoverage();
  };
  urlInput.value = url || '';
  row.querySelector('.img-alt').value = alt || '';
  urlInput.addEventListener('input', sync);
  row.querySelector('.remove-row').addEventListener('click', () => { row.remove(); updateCoverage(); });
  list.appendChild(row);
  sync();
}

function updateCoverage() {
  const el = $('img-coverage');
  if (!el) return;
  const urls = [...$('p-images').querySelectorAll('.img-url')].map((i) => i.value.trim()).filter(Boolean);
  const hero = urls.some((u) => /\/(?:test_)?hero-/.test(u));
  const gallery = urls.filter((u) => /\/(?:test_)?gallery-/.test(u)).length;
  const thumb = !!$('p-thumbnail').value.trim() || hero; // hero IS reused as the thumbnail at submit (buildProductPayload, below) — so this ✓ is honest
  const part = (ok, label) => `<span style="color:${ok ? 'var(--c-success,#2f7d52)' : 'var(--c-warn,#8a5a00)'}">${ok ? '✓' : '•'} ${label}</span>`; // tokens-with-fallback (AR#D4) — was the literal --c-success/--c-warn values, a duplication trap
  el.innerHTML = [part(hero, 'hero'), part(gallery >= 5, `gallery ${gallery}/5`), part(thumb, 'thumbnail')].join(' &nbsp; ');
}

function collectImages() {
  const rows = $('p-images').querySelectorAll('.img-url-row');
  const out = [];
  rows.forEach((row) => {
    const url = row.querySelector('.img-url').value.trim();
    const alt = row.querySelector('.img-alt').value.trim();
    if (url) out.push({ url, alt });
  });
  return out;
}

function addMediaRow(m) {
  const list = $('p-media-list');
  const row = document.createElement('div');
  row.className = 'media-row';
  row.style.cssText = 'border:1px solid var(--c-border,#eee);border-radius:4px;padding:8px;display:grid;gap:6px';
  row.innerHTML = `
    <div class="media-row__head">
      <select class="m-type"><option value="video">MP4 clip</option><option value="youtube">YouTube</option></select>
      <input type="url" class="m-url" aria-label="Video or YouTube URL" placeholder="https://cdn.../video-01-slug.mp4  ·  or  https://youtu.be/ID" style="min-width:0;padding:6px 8px;border:1px solid var(--c-border-strong,#ccc);border-radius:4px;font:inherit;font-size:13px" />
      <button type="button" class="remove-row">Remove</button>
    </div>
    <div class="m-video-opts" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;font-size:13px">
      <label class="checkbox-row"><input type="checkbox" class="m-autoplay" /><span>Autoplay + loop, silent (GIF-like)</span></label>
      <label class="checkbox-row"><input type="checkbox" class="m-controls" checked /><span>Show play/pause buttons (uncheck = button-less click-to-play)</span></label>
      <input type="url" class="m-poster" aria-label="Poster image URL" placeholder="poster image url (still shown before play)" style="flex:1;min-width:160px;padding:6px 8px;border:1px solid var(--c-border-strong,#ccc);border-radius:4px;font:inherit;font-size:13px" />
    </div>
    <input type="text" class="m-alt" aria-label="Clip alt text" placeholder="alt text — describe the clip" style="padding:6px 8px;border:1px solid var(--c-border-strong,#ccc);border-radius:4px;font:inherit;font-size:13px" />
  `;
  row.querySelector('.m-type').value = m?.type === 'youtube' ? 'youtube' : 'video';
  row.querySelector('.m-url').value = m?.url || '';
  row.querySelector('.m-autoplay').checked = m?.autoplay === true;
  row.querySelector('.m-controls').checked = m?.controls !== false; // controls default true; only an explicit controls:false unchecks (button-less click-to-play) — AR#F16, owner-settable now
  row.querySelector('.m-poster').value = m?.poster || '';
  row.querySelector('.m-alt').value = m?.alt || '';
  const opts = row.querySelector('.m-video-opts');
  const autoplayCb = row.querySelector('.m-autoplay');
  const controlsCb = row.querySelector('.m-controls');
  const syncOpts = () => {
    opts.style.display = row.querySelector('.m-type').value === 'video' ? 'flex' : 'none';
    controlsCb.disabled = autoplayCb.checked; // GIF-like = no buttons; the toggle only applies to click-to-play
  };
  syncOpts();
  row.querySelector('.m-type').addEventListener('change', syncOpts);
  autoplayCb.addEventListener('change', syncOpts);
  row.querySelector('.remove-row').addEventListener('click', () => row.remove());
  list.appendChild(row);
}

function collectMedia() {
  const out = [];
  $('p-media-list').querySelectorAll('.media-row').forEach((row) => {
    const url = row.querySelector('.m-url').value.trim();
    if (!url) return;
    const alt = row.querySelector('.m-alt').value.trim();
    if (row.querySelector('.m-type').value === 'youtube') {
      out.push(alt ? { type: 'youtube', url, alt } : { type: 'youtube', url });
      return;
    }
    const item = { type: 'video', url };
    if (row.querySelector('.m-autoplay').checked) { item.autoplay = true; item.loop = true; } // GIF-like preset; controls omitted on purpose — populateMedia derives no-controls from autoplay (product.js:252-254), so it renders button-less
    else if (!row.querySelector('.m-controls').checked) { item.controls = false; } // click-to-play, button-less — owner unchecked "Show play/pause buttons" (product.js:258 reads m.controls!==false). AR#F16: owner-settable now, was a hidden dataset before
    const poster = row.querySelector('.m-poster').value.trim();
    if (poster) item.poster = poster;
    if (alt) item.alt = alt;
    out.push(item);
  });
  return out;
}

// P3d — role-sectioned upload zones replace the single #upload-role select + #upload-btn. The role is
// the ZONE you drop into (load-bearing: the frontend reads role from the {role}-{slug} filename), so the
// wrong-role footgun is gone and video gets a first-class home.
function nextNumberedRole(base) {
  // base = 'gallery' | 'detail' | 'video'. Scan the relevant list for the highest base-NN, IGNORE
  // holes, return base-0(N+1). NEVER renumber an existing file (the CDN filename is the role).
  const sel = base === 'video' ? '#p-media-list .m-url' : '#p-images .img-url';
  const re = new RegExp(`\\/(?:test_)?${base}-(\\d+)[-.]`);
  let max = 0;
  document.querySelectorAll(sel).forEach((i) => { const m = i.value.match(re); if (m) max = Math.max(max, +m[1]); });
  return `${base}-${String(max + 1).padStart(2, '0')}`;
}

async function wireUploadZone(zoneEl, role) {
  const fileInput = zoneEl.querySelector('.zone-file');
  const msg = zoneEl.querySelector('.zone-msg');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    // AR#F13 — `accept` is only a HINT (drag-drop + some mobile browsers bypass it); enforce the
    // image/video split here, because the server's ALLOWED_MIME accepts BOTH, so under the Video
    // zone's skip_transform an image would slip through and become a broken <video> in media[].
    if (role === 'video' && !file.type.startsWith('video/')) { msg.textContent = 'The Video zone takes video only — drop an MP4/WebM.'; fileInput.value = ''; return; }
    if (role !== 'video' && file.type.startsWith('video/')) { msg.textContent = 'Video belongs in the Video zone.'; fileInput.value = ''; return; }
    const slug = $('p-slug').value.trim() || deriveSlug($('p-title').value);
    if (!slug) { msg.textContent = 'Enter a title or slug first.'; return; }
    const numbered = role === 'gallery' || role === 'detail' || role === 'video';
    const resolvedRole = numbered ? nextNumberedRole(role) : role;
    // AR#F7 — single-role zones (hero/thumbnail/seo_thumbnail/checkout_image) reuse the SAME filename
    // ({role}-{slug}), so a 2nd upload silently overwrites the R2 object AND would append a 2nd row at
    // the one file ("two heroes"). Chat-attach already guards this (handleAttachedRefs usedRoles); /admin
    // must not be MORE dangerous than the GPT for the same op. Confirm, then REPLACE the row in place.
    const roleRe = new RegExp(`\\/(?:test_)?${resolvedRole}[-.]`);
    const existingRow = !numbered
      ? [...$('p-images').querySelectorAll('.img-url-row')].find((r) => roleRe.test(((r.querySelector('.img-url') || {}).value || '').trim()))
      : null;
    if (existingRow && !window.confirm(`Replace the existing ${resolvedRole} image?`)) { fileInput.value = ''; return; }
    const fd = new FormData();
    fd.append('file', file); fd.append('slug', slug); fd.append('role', resolvedRole);
    if (role === 'video') fd.append('skip_transform', 'true'); // a video always skips the Cloudinary crop (old 3.7c rule)
    msg.textContent = 'Uploading…';
    try {
      const res = await fetch('/api/upload', { method: 'POST', headers: { ...authHeader() }, body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      msg.textContent = `Added ${resolvedRole}.`;
      if (role === 'video') addMediaRow({ type: 'video', url: body.url });
      else if (existingRow) {
        // Same filename → same URL; refresh the row in place (re-fires the row's `sync`) instead of a dupe.
        const ui = existingRow.querySelector('.img-url');
        ui.value = body.url; ui.dispatchEvent(new Event('input'));
        if (role === 'thumbnail') $('p-thumbnail').value = body.url;
        else if (role === 'seo_thumbnail') $('p-seo-thumbnail').value = body.url;   // AR#D-R3-1
        else if (role === 'checkout_image') $('p-checkout-image').value = body.url; // AR#D-R3-1
      } else {
        if (role === 'thumbnail' && !$('p-thumbnail').value.trim()) $('p-thumbnail').value = body.url;
        else if (role === 'seo_thumbnail') $('p-seo-thumbnail').value = body.url;   // AR#D-R3-1
        else if (role === 'checkout_image') $('p-checkout-image').value = body.url; // AR#D-R3-1
        addImageRow(body.url, '');
        // Alt-text parity nudge: the GPT writes a descriptive alt for every image
        // (IMPLEMENT 3.5a); /admin should hold the same bar, so focus + prompt the new row's alt input.
        // Soft, not a publish gate (validateProductRules doesn't require alt) — just stops blank alts slipping by.
        const altInput = $('p-images').lastElementChild?.querySelector('.img-alt');
        if (altInput) { altInput.placeholder = 'alt — what the photo shows'; altInput.focus(); }
      }
      fileInput.value = ''; // ready for the next drop in this zone
    } catch (err) { msg.textContent = `Failed: ${err.message}`; }
  });
}

function wireUploadZones() { // call once from init/attachEventListeners
  document.querySelectorAll('.upload-zone').forEach((z) => wireUploadZone(z, z.dataset.role));
}

function buildProductPayload() {
  const titleVal = $('p-title').value.trim();
  if (!titleVal) throw new Error('Title is required');
  const cents = dollarsToCents($('p-price').value);
  if (cents === null) throw new Error('Price must be a positive number');

  const payload = {
    title: titleVal,
    headline: $('p-headline').value.trim(),
    story_card: $('p-story').value,
    description: $('p-description').value.trim(),
    features: linesToArray($('p-features').value),
    price: cents,
    quantity: Number.parseInt($('p-quantity').value, 10) || 0,
    product_type: $('p-type').value,
    dimensions: $('p-dimensions').value.trim() || null,
    weight: $('p-weight').value.trim() || null,
    power_supply: $('p-power').value.trim() || null,
    materials: linesToArray($('p-materials').value),
    care_instructions: linesToArray($('p-care').value),
    shipping_details: linesToArray($('p-shipping').value),
    series: $('p-series').value.trim() || null,
    available: $('p-available').checked,
    featured: $('p-featured').checked,
    artist_note: $('p-artist-note').value.trim() || null,
    seo_title: $('p-seo-title').value.trim() || null,
    seo_description: $('p-seo-description').value.trim() || null,
    seo_thumbnail: $('p-seo-thumbnail').value.trim() || null,
    checkout_name: $('p-checkout-name').value.trim() || null,
    checkout_description: $('p-checkout-description').value.trim() || null,
    checkout_image: $('p-checkout-image').value.trim() || null,
    thumbnail: $('p-thumbnail').value.trim()
      || [...$('p-images').querySelectorAll('.img-url')].map((i) => i.value.trim()).find((u) => /\/(?:test_)?hero-/.test(u))
      || '',
    thumbnail_alt: $('p-thumbnail-alt').value.trim() || null,
    images: collectImages(),
  };

  const themeRaw = $('p-theme').value.trim();
  if (themeRaw) {
    try {
      payload.homepage_theme = JSON.parse(themeRaw);
    } catch {
      throw new Error('Homepage theme must be valid JSON or empty');
    }
  } else {
    payload.homepage_theme = null;
  }

  const media = collectMedia();
  payload.media = media.length ? media : null;

  const slugVal = $('p-slug').value.trim();
  if (!state.editing && slugVal) payload.slug = slugVal;

  return payload;
}

async function onSaveProduct(e) {
  e.preventDefault();
  setStatus('editor-status', '', 'info');
  $('save-product').disabled = true;
  try {
    const payload = buildProductPayload();
    const editing = state.editing;
    let res;
    if (editing) {
      const updates = { ...payload };
      delete updates.slug;
      res = await fetch(`/api/products?id=${encodeURIComponent(editing.id)}`, {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } else {
      res = await fetch('/api/products', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    const body = await res.json().catch(() => ({}));   // body = { success, product, preview_url, preview_token }
    if (!res.ok) {
      if (res.status === 409) {
        throw new Error('A product with that slug already exists. Pick a different title.');
      }
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    setStatus('editor-status', editing ? 'Draft saved.' : 'Draft created.', 'success');
    renderPublishPanel(body, editing ? editing.id : body.product?.id);
    await loadProducts();
  } catch (err) {
    setStatus('editor-status', err.message, 'error');
  } finally {
    $('save-product').disabled = false;
  }
}

function renderPublishPanel(body, id) {
  const panel = $('publish-panel');
  if (!panel) return;
  // A fresh draft / staged edit from THIS save returns a preview_url. A price/availability/quantity-only
  // change stages nothing and returns none — BUT if an earlier copy edit is still staged, this PUT
  // preserved the row's draft + preview_token. Detect that pending draft and build its preview
  // link client-side from body.product, so the panel never contradicts the list pill ("live · edits
  // pending") or let Em think her staged copy edit vanished.
  const pendingDraft = !!(body.product && body.product.draft != null && body.product.preview_token);
  let previewUrl = body.preview_url;
  if (!previewUrl && pendingDraft) {
    previewUrl = '/product/' + body.product.slug + '?preview=' + encodeURIComponent(body.product.preview_token);
  }
  // Something is publishable when there's a draft to publish — a new draft/staged edit this save, OR a
  // pending draft preserved through a live-only change.
  const publishable = !!previewUrl;
  panel.classList.remove('hidden');
  panel.innerHTML = '';
  const p = document.createElement('p');
  p.style.margin = '0 0 8px';
  const pendingLink = (lead) =>
    lead + ' — you still have edits pending: <a href="' + previewUrl + '" target="_blank" rel="noopener">open preview</a>, then publish or discard.';
  if (body.preview_url) {
    p.innerHTML =
      'Preview how it looks: <a href="' + body.preview_url + '" target="_blank" rel="noopener">open preview</a> — then publish when it looks right.';
  } else if (body.price_updated || body.availability_updated || body.quantity_updated) {
    // Price / availability / quantity-only change: live now. All three go live immediately like price.
    const bits = [];
    if (body.price_updated) bits.push('Price change');
    if (body.availability_updated) bits.push('Availability change');
    if (body.quantity_updated) bits.push('Stock change');
    const lead = bits.join(' and ') + ' is live now';
    // If a copy edit is still staged, say so (and give the preview link) instead of "nothing to publish".
    if (pendingDraft) p.innerHTML = pendingLink(lead);
    else p.textContent = lead + ' — nothing else to publish.';
  } else if (pendingDraft) {
    p.innerHTML = pendingLink('Saved');
  } else {
    p.textContent = 'Saved.';
  }
  panel.appendChild(p);
  // When a price change rides ALONGSIDE a freshly-staged copy edit (one save), add the "price already
  // live" detail. (For a price-only change, or a price change over a PRE-existing pending draft, the
  // line above already covers it — gate on body.preview_url so we don't duplicate.)
  if (body.price_updated && body.preview_url) {
    const note = document.createElement('p');
    note.style.margin = '0 0 8px';
    note.textContent = 'Price change is live now (price updates immediately; it isn’t part of the draft preview).';
    panel.appendChild(note);
  }
  // Publish button whenever there's a draft to publish — a fresh draft OR a preserved pending draft;
  // never for a pure live-only change with nothing staged.
  if (publishable) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'primary';
    btn.textContent = 'Publish now';
    btn.addEventListener('click', () => publishProduct(id, btn));
    panel.appendChild(btn);
  }
  // Discard when edits are staged this save OR a prior draft is still pending (the inverse of publish).
  if (body.staged || pendingDraft) {
    const discardBtn = document.createElement('button');
    discardBtn.type = 'button';
    discardBtn.className = 'danger';
    discardBtn.style.marginLeft = '8px';
    discardBtn.textContent = 'Discard pending edits';
    discardBtn.addEventListener('click', () => discardEdits(id, discardBtn));
    panel.appendChild(discardBtn);
  }
}

async function publishProduct(id, btn) {
  if (!id) return;
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Publishing…';
  try {
    const res = await fetch('/api/products/publish', {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    setStatus('editor-status', 'Published — it is now live.', 'success');
    $('publish-panel').classList.add('hidden');
    await loadProducts();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = original;
    setStatus('editor-status', err.message, 'error');
  }
}

// Scrap a published product's staged draft without publishing. Live page is untouched.
async function discardEdits(id, btn) {
  if (!id) return;
  if (!window.confirm('Discard the pending edits? The live page stays exactly as it is now.')) return;
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Discarding…';
  try {
    const res = await fetch('/api/products/discard', {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    setStatus('editor-status', 'Pending edits discarded — the live page is unchanged.', 'success');
    $('publish-panel').classList.add('hidden');
    await loadProducts();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = original;
    setStatus('editor-status', err.message, 'error');
  }
}

async function onArchiveToggle() {
  const editing = state.editing;
  if (!editing) return;
  const archiving = !editing.archived_at;
  const verb = archiving ? 'Archive' : 'Resurface';
  const note = archiving
    ? 'It leaves the shop but stays here — you can resurface it anytime.'
    : 'It goes back into the shop.';
  if (!window.confirm(`${verb} "${editing.title}"? ${note}`)) return;
  setStatus('editor-status', '', 'info');
  try {
    const res = await fetch(`/api/products/${archiving ? 'archive' : 'unarchive'}`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing.id }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    setStatus('editor-status', archiving ? 'Archived.' : 'Resurfaced.', 'success');
    await loadProducts();
  } catch (err) {
    setStatus('editor-status', `${verb} failed: ${err.message}`, 'error');
  }
}

async function loadOrders() {
  setStatus('orders-status', '', 'info');
  const list = $('orders-list');
  list.innerHTML = '<div class="empty">Loading...</div>';
  try {
    const params = new URLSearchParams();
    params.set('status', state.ordersStatus);
    const q = $('orders-search').value.trim();
    if (q) params.set('q', q);
    const res = await fetch(`/api/orders?${params.toString()}`, {
      headers: { ...authHeader() },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    renderOrders(Array.isArray(body.orders) ? body.orders : []);
  } catch (err) {
    list.innerHTML = '';
    setStatus('orders-status', `Failed to load orders: ${err.message}`, 'error');
  }
}

function formatAddress(addr) {
  if (!addr || typeof addr !== 'object') return '';
  const lines = [
    addr.name,
    addr.line1,
    addr.line2,
    [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean);
  return lines.join('\n');
}

function renderOrders(orders) {
  const list = $('orders-list');
  if (!orders.length) {
    list.innerHTML = '<div class="empty">No orders match this view.</div>';
    return;
  }
  list.innerHTML = '';
  for (const order of orders) {
    list.appendChild(buildOrderCard(order));
  }
}

function buildOrderCard(order) {
  const card = document.createElement('div');
  card.className = 'order-card';
  card.dataset.id = order.id;

  const productTitle = order.products?.title ?? '(unknown product)';
  const productThumb = order.products?.thumbnail ?? '';
  const customerName = order.customers?.name ?? '';
  const customerEmail = order.customers?.email ?? order.customer_email ?? '';
  const phone = order.customers?.phone ?? '';
  const shippingAddr = order.customers?.shipping_address ?? null;
  const addrText = formatAddress(shippingAddr);

  const totalCents = typeof order.amount === 'number'
    ? order.amount
    : typeof order.amount_total === 'number'
      ? order.amount_total
      : null;
  const totalLabel = totalCents !== null ? `$${centsToDollars(totalCents)}` : '—';

  const shipped = !!order.shipped_at;
  const trackUrl = trackingUrl(order.tracking_carrier, order.tracking_number);

  const shippedAtLabel = order.shipped_at
    ? new Date(order.shipped_at).toLocaleString()
    : '';
  const emailSent = !!order.tracking_email_sent_at;
  const emailPill = shipped
    ? emailSent
      ? `<span class="pill shipped">email sent ${escapeHtml(new Date(order.tracking_email_sent_at).toLocaleString())}</span>`
      : '<span class="pill unsent">email not sent</span>'
    : '';

  const orderIdShort = String(order.id).slice(0, 8);

  let formHtml = '';
  if (!shipped) {
    formHtml = `
      <form class="ship-form">
        <label class="field" style="margin:0">
          <span>Tracking number</span>
          <input type="text" class="ship-tracking" required />
        </label>
        <label class="field" style="margin:0">
          <span>Carrier</span>
          <select class="ship-carrier" required>
            <option value="USPS">USPS</option>
            <option value="UPS">UPS</option>
            <option value="FedEx">FedEx</option>
            <option value="DHL">DHL</option>
          </select>
        </label>
        <button type="submit" class="primary">Mark as shipped</button>
      </form>
    `;
  } else {
    const trackLink = trackUrl
      ? `<a href="${escapeHtml(trackUrl)}" target="_blank" rel="noreferrer">${escapeHtml(order.tracking_carrier)} ${escapeHtml(order.tracking_number)}</a>`
      : `${escapeHtml(order.tracking_carrier || '')} ${escapeHtml(order.tracking_number || '')}`;
    const resendBtn = !emailSent
      ? '<button type="button" class="resend-tracking">Resend tracking email</button>'
      : '';
    formHtml = `
      <p><span class="label">Tracking:</span> ${trackLink}</p>
      <p><span class="label">Shipped:</span> ${escapeHtml(shippedAtLabel)} ${emailPill}</p>
      ${resendBtn}
    `;
  }

  card.innerHTML = `
    <div>
      <img src="${escapeHtml(productThumb)}" alt="${escapeHtml(productTitle)}" />
    </div>
    <div class="order-info">
      <p><span class="label">Order</span> ${escapeHtml(orderIdShort)} · ${escapeHtml(productTitle)} · ${totalLabel}${order.created_at ? ` · ${escapeHtml(new Date(order.created_at).toLocaleDateString())}` : ''}</p>
      <p><span class="label">Customer</span> ${escapeHtml(customerName)} &lt;${escapeHtml(customerEmail)}&gt; ${escapeHtml(phone)}</p>
      ${addrText ? `<div class="address-head"><span class="label">Ship to</span><button type="button" class="copy-address link-btn">Copy address</button></div><pre class="address-block">${escapeHtml(addrText)}</pre>` : '<p><em>No shipping address on file.</em></p>'}
      ${formHtml}
      ${order.status === 'refunded'
        ? '<p style="margin-top:6px"><span class="pill refunded">Refunded</span></p>'
        : !order.stripe_payment_intent
          ? '<p style="margin-top:6px;font-size:13px;color:var(--c-text-muted,#666)">No payment on file to refund.</p>'
          : '<button type="button" class="refund-order" style="margin-top:6px">Refund this purchase…</button>'}
      <div class="refund-panel" style="display:none;margin-top:8px;padding:10px;border:1px solid var(--c-border,#ddd);border-radius:6px"></div>
      <div class="order-msg" style="margin-top:6px;font-size:13px"></div>
    </div>
  `;

  const copyBtn = card.querySelector('.copy-address');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(addrText).then(
        () => { copyBtn.textContent = 'Copied!'; setTimeout(() => { copyBtn.textContent = 'Copy address'; }, 1500); },
        () => { copyBtn.textContent = 'Copy failed'; },
      );
    });
  }

  const shipForm = card.querySelector('.ship-form');
  if (shipForm) {
    shipForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const trackingNumber = card.querySelector('.ship-tracking').value.trim();
      const carrier = card.querySelector('.ship-carrier').value;
      const confirmed = window.confirm(
        `Mark "${productTitle}" as shipped and email ${customerEmail || 'the buyer'} their ${carrier} tracking number? This can't be undone.`,
      );
      if (!confirmed) return;
      submitShip(order.id, trackingNumber, carrier, card);
    });
  }

  const resendBtn = card.querySelector('.resend-tracking');
  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      submitShip(order.id, order.tracking_number, order.tracking_carrier, card, true);
    });
  }

  const refundBtn = card.querySelector('.refund-order');
  if (refundBtn) {
    refundBtn.addEventListener('click', () => openRefundPanel(order, card));
  }

  return card;
}

async function submitShip(orderId, trackingNumber, carrier, card, isResend) {
  const msg = card.querySelector('.order-msg');
  msg.textContent = isResend ? 'Resending email...' : 'Saving...';
  const buttons = card.querySelectorAll('button');
  buttons.forEach((b) => { b.disabled = true; });
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_number: trackingNumber, tracking_carrier: carrier }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    if (body.email_sent === false) {
      msg.textContent = `Saved, but email not sent (${body.email_error || body.email_skipped || 'unknown reason'}).`;
    } else {
      msg.textContent = 'Done.';
    }
    setTimeout(loadOrders, 600);
  } catch (err) {
    msg.textContent = `Failed: ${err.message}`;
    buttons.forEach((b) => { b.disabled = false; });
  }
}

// A Stripe refund is an AMOUNT against the whole purchase (one cart = N orders sharing a payment),
// so the panel shows every piece in THIS purchase: CHECK the ones that came back (they get relisted),
// and the amount auto-sums but stays freely EDITABLE (goodwill / restocking). Checkmarks drive relist;
// the amount drives the refund. A single-item order = one piece, pre-checked, amount pre-filled.
async function openRefundPanel(order, card) {
  const panel = card.querySelector('.refund-panel');
  if (!panel) return;
  if (panel.style.display !== 'none') { panel.style.display = 'none'; return; } // toggle closed
  const pi = order.stripe_payment_intent;
  // Load the cart's FULL sibling set by PaymentIntent: a multi-piece cart's
  // siblings can straddle the needs_shipping/shipped subtabs, so the active-subtab slice can silently
  // UNDER-list a partial cart. Fetch by PI so the panel always shows every piece in the purchase.
  panel.style.display = 'block';
  panel.innerHTML = '<p style="font-size:13px;margin:0">Loading the pieces in this purchase…</p>';
  let pieces = [order];
  if (pi) {
    try {
      const res = await fetch(`/api/orders?payment_intent=${encodeURIComponent(pi)}`, { headers: { ...authHeader() } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(body.orders)) pieces = body.orders.filter((o) => o.status !== 'refunded');
    } catch { /* network/Action error → fall back to the single clicked order */ }
  }
  const list = pieces.length ? pieces : [order];
  panel.innerHTML = `
    <p style="font-size:13px;margin:0 0 6px">Check the pieces that came back (they'll be re-listed). The amount fills in — edit it for a partial/goodwill refund.</p>
    <div class="refund-pieces" style="display:grid;gap:4px;margin-bottom:8px">
      ${list.map((o) => {
        const cents = typeof o.amount === 'number' ? o.amount : 0;
        const checked = o.id === order.id ? ' checked' : '';
        const pieceTitle = o.products?.title ?? '(piece)';
        return `<label class="checkbox-row" style="display:flex;gap:8px;align-items:center">
          <input type="checkbox" class="refund-piece" value="${escapeHtml(o.product_id)}" data-cents="${cents}" data-title="${escapeHtml(pieceTitle)}"${checked} />
          <span>${escapeHtml(pieceTitle)} — $${centsToDollars(cents)}</span>
        </label>`;
      }).join('')}
    </div>
    <label class="field" style="margin:0 0 8px"><span>Refund amount ($)</span>
      <input type="number" class="refund-amount" step="0.01" min="0" /></label>
    <button type="button" class="refund-confirm primary">Refund</button>
    <button type="button" class="refund-cancel">Cancel</button>
  `;
  const amountInput = panel.querySelector('.refund-amount');
  const checks = [...panel.querySelectorAll('.refund-piece')];
  const sumChecked = () => checks.filter((c) => c.checked).reduce((s, c) => s + Number(c.dataset.cents || 0), 0);
  const syncAmount = () => { amountInput.value = centsToDollars(sumChecked()); };
  checks.forEach((c) => c.addEventListener('change', syncAmount));
  syncAmount(); // pre-fill from the pre-checked clicked piece
  panel.querySelector('.refund-cancel').addEventListener('click', () => { panel.style.display = 'none'; });
  panel.querySelector('.refund-confirm').addEventListener('click', () => {
    const amountCents = Math.round(Number.parseFloat(amountInput.value || '0') * 100);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      card.querySelector('.order-msg').textContent = 'Enter a refund amount.'; return;
    }
    const checked = checks.filter((c) => c.checked);
    const relistIds = checked.map((c) => c.value);
    const who = order.customers?.email || order.customer_email || 'the buyer';
    // Read the title from the checkbox's own dataset — NOT by splitting the label text on ' — ', which
    // truncates a piece whose title itself contains ' — ' (the brand's titles are poetic; round-5 A #14).
    const what = checked.length ? checked.map((c) => c.dataset.title).join(', ') : 'this purchase';
    if (!window.confirm(`Refund ${who} $${centsToDollars(amountCents)} for ${what}? This issues a Stripe refund and can't be undone.`)) return;
    panel.style.display = 'none';
    submitRefund(order.id, amountCents, relistIds, card);
  });
}

async function submitRefund(orderId, amountCents, relistIds, card) {
  const msg = card.querySelector('.order-msg');
  msg.textContent = 'Issuing refund...';
  const buttons = card.querySelectorAll('button');
  buttons.forEach((b) => { b.disabled = true; });
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/refund`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_cents: amountCents, relist_product_ids: relistIds }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    msg.textContent = 'Refunded.';
    // ALWAYS offer to restore EACH returned piece (Sean's call — never leave stock un-restored).
    // Wording by state: a down piece (sold-out/archived) gets re-listed; an in-stock piece just +1.
    // relistPiece restores both axes either way.
    for (const r of (Array.isArray(body.relist) ? body.relist : [])) {
      const down = r.archived || r.available === false;
      const ask = down
        ? `Re-list "${r.title}" and make it available for purchase again?`
        : `Increase "${r.title}"'s available quantity by 1?`;
      if (window.confirm(ask)) await relistPiece(r, down, msg);
    }
    setTimeout(loadOrders, 800);
  } catch (err) {
    msg.textContent = `Failed: ${err.message}`;
    buttons.forEach((b) => { b.disabled = false; });
  }
}

// Relist = RESTORE the returned unit (WS6.3): unarchive when archived AND put it back in stock
// (quantity + 1 → available follows the quantity>0 rule). BOTH axes, not XOR. Mirrors the admin's
// own calls: POST /api/products/unarchive (admin.js:634) + PUT /api/products?id=… (:474).
// `down` only tweaks the success copy (re-listed vs +1) — the restore is identical either way.
async function relistPiece(r, down, msg) {
  try {
    if (r.archived) {
      const ua = await fetch('/api/products/unarchive', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.product_id }),
      });
      if (!ua.ok) throw new Error(`HTTP ${ua.status}`);
    }
    // Return the refunded unit to stock; available follows from quantity > 0.
    const res = await fetch(`/api/products?id=${encodeURIComponent(r.product_id)}`, {
      method: 'PUT',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: true, quantity: (r.quantity || 0) + 1 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    msg.textContent = down ? `Refunded + relisted "${r.title}".` : `Refunded + "${r.title}" stock +1.`;
  } catch (err) {
    msg.textContent = `Refunded, but relist failed (${err.message}) — relist it from the product editor.`;
  }
}

async function loadCoupons() {
  setStatus('coupons-status', '', 'info');
  // The scope picker needs published products' stripe_product_id. Refetch on each open so a piece
  // published earlier this session shows up; keep any prior list as a fallback on error.
  // (Render-tune, AR#F19: if a template "User" catalog ever grows past ~100 pieces, gate this
  //  refetch behind a short freshness check — fine to refetch unconditionally at Emy's scale.)
  try {
    const pr = await fetch('/api/products', { headers: { ...authHeader() } });
    const pb = await pr.json().catch(() => ({}));
    if (pr.ok && Array.isArray(pb.products)) state.products = pb.products;
  } catch { /* non-fatal — the picker keeps the last list, or shows Store-wide */ }
  populateCouponProducts();
  const list = $('coupons-list');
  list.innerHTML = '<div class="empty">Loading...</div>';
  try {
    const res = await fetch('/api/coupons', { headers: { ...authHeader() } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    renderCoupons(Array.isArray(body.coupons) ? body.coupons : []);
  } catch (err) {
    list.innerHTML = '';
    setStatus('coupons-status', `Failed to load sales: ${err.message}`, 'error');
  }
}

// A searchable, checkbox product picker so a coupon can be scoped to MANY products — true parity
// with the GPT's product_ids array (createCoupon already accepts an array, contract line above).
// Selection lives in a module Set so it PERSISTS as the owner filters by different terms: search
// "loft", check a few, search "vessel", check more — the earlier checks stay. (Sean: think the
// template "User" with a large catalog, not Emy's tiny one — full /admin capability, GPT-down-proof.)
const couponSelectedProducts = new Set(); // stripe_product_ids

function populateCouponProducts() {
  const list = $('c-product-list');
  if (!list) return;
  const term = ($('c-product-search')?.value || '').trim().toLowerCase();
  const published = (state.products || []).filter((p) => p.is_published && !p.archived_at && p.stripe_product_id);
  // Drop any selection that's no longer a valid scope target (unpublished/archived since checking).
  const validIds = new Set(published.map((p) => p.stripe_product_id));
  [...couponSelectedProducts].forEach((id) => { if (!validIds.has(id)) couponSelectedProducts.delete(id); });
  const shown = term ? published.filter((p) => (p.title || '').toLowerCase().includes(term)) : published;
  list.innerHTML = shown.length
    ? shown.map((p) => {
        const id = escapeHtml(p.stripe_product_id);
        const checked = couponSelectedProducts.has(p.stripe_product_id) ? ' checked' : '';
        return `<label class="checkbox-row"><input type="checkbox" class="c-product-cb" value="${id}"${checked} /><span>${escapeHtml(p.title || '(untitled)')}</span></label>`;
      }).join('')
    : '<p class="empty" style="padding:8px">No matching published products.</p>';
  list.querySelectorAll('.c-product-cb').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) couponSelectedProducts.add(cb.value); else couponSelectedProducts.delete(cb.value);
      updateCouponScopeNote();
    });
  });
  updateCouponScopeNote();
}

function updateCouponScopeNote() {
  const note = $('c-product-selected');
  if (!note) return;
  const n = couponSelectedProducts.size;
  note.textContent = n === 0 ? 'Store-wide (no products selected)' : `${n} product${n === 1 ? '' : 's'} selected`;
}

function renderCoupons(coupons) {
  const list = $('coupons-list');
  if (!coupons.length) {
    list.innerHTML = '<div class="empty">No sales running. Create one above.</div>';
    return;
  }
  list.innerHTML = '';
  for (const c of coupons) {
    const off = c.percent_off ? `${c.percent_off}% off`
      : c.amount_off ? `$${centsToDollars(c.amount_off)} off` : 'discount';
    const scope = c.store_wide ? 'store-wide' : `${(c.product_ids || []).length} product(s)`;
    const used = `${c.times_redeemed ?? 0}${c.max_redemptions ? ` / ${c.max_redemptions}` : ''} used`;
    const min = c.min_amount ? ` · min $${centsToDollars(c.min_amount)}` : '';
    const ends = c.expires_display ? ` · ends ${escapeHtml(c.expires_display)}` : '';
    const row = document.createElement('div');
    row.style.cssText = 'border:1px solid var(--c-border,#ddd);border-radius:6px;padding:10px;margin-bottom:8px';
    row.innerHTML = `
      <p><span class="label">${escapeHtml(c.code)}</span> — ${escapeHtml(off)} · ${escapeHtml(scope)} · ${escapeHtml(used)}${min}${ends}</p>
      <button type="button" class="end-sale">End sale</button>
      <div class="coupon-msg" style="margin-top:6px;font-size:13px"></div>
    `;
    row.querySelector('.end-sale').addEventListener('click', () => onDeactivateCoupon(c.code, row));
    list.appendChild(row);
  }
}

async function onCreateCoupon(e) {
  e.preventDefault();
  setStatus('coupons-status', '', 'info');
  const type = $('c-type').value;
  const rawValue = Number.parseFloat($('c-value').value);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    setStatus('coupons-status', 'Enter a discount amount.', 'error');
    return;
  }
  if (type === 'percent' && rawValue > 100) {
    setStatus('coupons-status', 'Percent off cannot exceed 100.', 'error');
    return;
  }
  const payload = { type, value: type === 'amount' ? Math.round(rawValue * 100) : rawValue };
  const code = $('c-code').value.trim();
  if (code) payload.code = code;
  const min = Number.parseFloat($('c-min').value);
  if (Number.isFinite(min) && min > 0) payload.min_amount = Math.round(min * 100);
  const max = Number.parseInt($('c-max').value, 10);
  if (Number.isInteger(max) && max > 0) payload.max_redemptions = max;
  const expires = $('c-expires').value; // YYYY-MM-DD or ''
  if (expires) payload.expires_date = expires; // raw date; the backend builds end-of-day in the STORE timezone (no browser-TZ drift)
  const selectedProducts = [...couponSelectedProducts];
  if (selectedProducts.length) payload.product_ids = selectedProducts; // omit → store-wide

  const offLabel = type === 'percent' ? `${rawValue}% off` : `$${rawValue.toFixed(2)} off`;
  const scopeLabel = selectedProducts.length ? `${selectedProducts.length} product${selectedProducts.length === 1 ? '' : 's'}` : 'store-wide';
  const endsLabel = expires ? `, ends after ${expires}` : '';
  if (!window.confirm(`Create sale: ${offLabel}, ${scopeLabel}${endsLabel}${code ? `, code ${code}` : ' (auto code)'}?`)) return;

  $('create-coupon').disabled = true;
  try {
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    setStatus('coupons-status', `Created ${body.code}${body.expires_display ? ` — ends ${body.expires_display}` : ''}.`, 'success');
    couponSelectedProducts.clear();
    if ($('c-product-search')) $('c-product-search').value = '';
    $('coupon-form').reset();
    loadCoupons();
  } catch (err) {
    setStatus('coupons-status', `Failed: ${err.message}`, 'error');
  } finally {
    $('create-coupon').disabled = false;
  }
}

async function onDeactivateCoupon(code, row) {
  if (!window.confirm(`End the sale "${code}" now? Shoppers can no longer use it.`)) return;
  const msg = row.querySelector('.coupon-msg');
  msg.textContent = 'Ending...';
  try {
    const res = await fetch('/api/coupons/deactivate', {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    msg.textContent = 'Ended.';
    setTimeout(loadCoupons, 600);
  } catch (err) {
    msg.textContent = `Failed: ${err.message}`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
