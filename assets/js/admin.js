// Everlastings admin UI — vanilla JS module.
//
// Auth model: this UI uses Supabase email/password auth. The user's JWT is
// sent to the API as `Authorization: Bearer <jwt>`. Both `/api/products` and
// `/api/upload` accept either PRODUCT_API_KEY (for AI/curl callers) or a
// Supabase JWT (for this UI). `/api/orders` and `/api/orders/<id>` only
// accept a Supabase JWT via requireAdmin.

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
  $('delete-product').addEventListener('click', onDeleteProduct);
  $('add-image-row').addEventListener('click', () => addImageRow('', ''));
  $('upload-btn').addEventListener('click', onUploadImage);

  document.querySelectorAll('.subtab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.ordersStatus = btn.dataset.status;
      document.querySelectorAll('.subtab-btn').forEach((b) => b.classList.toggle('active', b === btn));
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
  refreshActiveTab();
}

function refreshActiveTab() {
  if (!state.session) return;
  const productsActive = !$('tab-products').classList.contains('hidden');
  if (productsActive) {
    loadProducts();
  } else {
    loadOrders();
  }
}

function authHeader() {
  const token = state.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function loadProducts() {
  setStatus('products-status', '', 'info');
  closeEditor();
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

function renderProductList() {
  const list = $('products-list');
  if (!state.products.length) {
    list.innerHTML = '<div class="empty">No products yet. Click "New Product" to add one.</div>';
    return;
  }
  list.innerHTML = '';
  for (const p of state.products) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const thumb = p.thumbnail || (Array.isArray(p.images) && p.images[0]?.url) || '';
    const priceLabel = typeof p.price === 'number' ? `$${centsToDollars(p.price)}` : '—';
    const availPill = p.available ? '<span class="pill">available</span>' : '<span class="pill unsent">sold</span>';
    card.innerHTML = `
      <img src="${escapeHtml(thumb)}" alt="${escapeHtml(p.thumbnail_alt || p.title || '')}" />
      <p class="pc-title">${escapeHtml(p.title || '(untitled)')}</p>
      <p class="pc-meta">${priceLabel} · qty ${p.quantity ?? '—'} ${availPill}</p>
    `;
    card.addEventListener('click', () => openEditor(p.id));
    list.appendChild(card);
  }
}

function openEditor(productId) {
  const product = productId ? state.products.find((p) => p.id === productId) : null;
  state.editing = product || null;
  setStatus('editor-status', '', 'info');
  $('product-editor').classList.remove('hidden');
  $('products-list').classList.add('hidden');
  $('editor-heading').textContent = product ? `Edit: ${product.title}` : 'New Product';

  $('p-id').value = product?.id ?? '';
  $('p-title').value = product?.title ?? '';
  $('p-slug').value = product?.slug ?? '';
  $('p-slug').disabled = !!product;
  $('p-headline').value = product?.headline ?? '';
  $('p-story').value = product?.story_card ?? '';
  $('p-description').value = product?.description ?? '';
  $('p-features').value = arrayToLines(product?.features);
  $('p-price').value = typeof product?.price === 'number' ? centsToDollars(product.price) : '';
  $('p-quantity').value = product?.quantity ?? 1;
  $('p-type').value = product?.product_type ?? 'miniature';
  $('p-dimensions').value = product?.dimensions ?? '';
  $('p-weight').value = product?.weight ?? '';
  $('p-power').value = product?.power_supply ?? '';
  $('p-materials').value = arrayToLines(product?.materials);
  $('p-care').value = arrayToLines(product?.care_instructions);
  $('p-shipping').value = arrayToLines(product?.shipping_details);
  $('p-series').value = product?.series ?? '';
  $('p-theme').value = product?.homepage_theme ? JSON.stringify(product.homepage_theme) : '';
  $('p-available').checked = product?.available !== false;
  $('p-featured').checked = !!product?.featured;
  $('p-artist-note').value = product?.artist_note ?? '';
  $('p-seo-title').value = product?.seo_title ?? '';
  $('p-seo-description').value = product?.seo_description ?? '';
  $('p-thumbnail').value = product?.thumbnail ?? '';
  $('p-thumbnail-alt').value = product?.thumbnail_alt ?? '';

  const imgList = $('p-images');
  imgList.innerHTML = '';
  if (Array.isArray(product?.images) && product.images.length) {
    for (const img of product.images) addImageRow(img.url || '', img.alt || '');
  } else {
    addImageRow('', '');
  }

  $('delete-product').classList.toggle('hidden', !product);
  $('upload-status').textContent = '';
}

function closeEditor() {
  $('product-editor').classList.add('hidden');
  $('products-list').classList.remove('hidden');
  state.editing = null;
}

function addImageRow(url, alt) {
  const list = $('p-images');
  const row = document.createElement('div');
  row.className = 'img-url-row';
  row.innerHTML = `
    <span style="font-size:11px;color:#666">URL</span>
    <input type="url" class="img-url" placeholder="https://cdn.../products/slug/hero-slug.webp" />
    <input type="text" class="img-alt" placeholder="alt text" />
    <button type="button" class="remove-row">Remove</button>
  `;
  row.querySelector('.img-url').value = url || '';
  row.querySelector('.img-alt').value = alt || '';
  row.querySelector('.remove-row').addEventListener('click', () => row.remove());
  list.appendChild(row);
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

async function onUploadImage() {
  setStatus('upload-status', '', 'info');
  const file = $('upload-file').files[0];
  if (!file) {
    $('upload-status').textContent = 'Choose a file first.';
    return;
  }
  let slug = $('p-slug').value.trim();
  if (!slug) slug = deriveSlug($('p-title').value);
  if (!slug) {
    $('upload-status').textContent = 'Enter a title or slug before uploading.';
    return;
  }
  const role = $('upload-role').value;
  const skip = $('upload-skip-transform').checked ? 'true' : '';

  const fd = new FormData();
  fd.append('file', file);
  fd.append('slug', slug);
  fd.append('role', role);
  if (skip) fd.append('skip_transform', skip);

  $('upload-btn').disabled = true;
  $('upload-status').textContent = 'Uploading...';
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { ...authHeader() },
      body: fd,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    $('upload-status').textContent = `Uploaded: ${body.url}`;
    if (role === 'thumbnail' && !$('p-thumbnail').value.trim()) {
      $('p-thumbnail').value = body.url;
    }
    addImageRow(body.url, '');
  } catch (err) {
    $('upload-status').textContent = `Upload failed: ${err.message}`;
  } finally {
    $('upload-btn').disabled = false;
  }
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
    thumbnail: $('p-thumbnail').value.trim(),
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
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 409) {
        throw new Error('A product with that slug already exists. Pick a different title.');
      }
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    setStatus('editor-status', editing ? 'Saved.' : 'Created.', 'success');
    await loadProducts();
  } catch (err) {
    setStatus('editor-status', err.message, 'error');
  } finally {
    $('save-product').disabled = false;
  }
}

async function onDeleteProduct() {
  const editing = state.editing;
  if (!editing) return;
  const confirmed = window.confirm(`Delete "${editing.title}"? This cannot be undone.`);
  if (!confirmed) return;
  setStatus('editor-status', '', 'info');
  try {
    // Delete via Supabase JS — RLS allows authenticated users to delete.
    // /api/products has no DELETE handler; using the client respects the same
    // auth boundary because the user JWT is what authenticates.
    const { error } = await state.client.from('products').delete().eq('id', editing.id);
    if (error) throw new Error(error.message);
    setStatus('editor-status', 'Deleted.', 'success');
    await loadProducts();
  } catch (err) {
    setStatus('editor-status', `Delete failed: ${err.message}`, 'error');
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
      <p><span class="label">Order</span> ${escapeHtml(orderIdShort)} · ${escapeHtml(productTitle)} · ${totalLabel}</p>
      <p><span class="label">Customer</span> ${escapeHtml(customerName)} &lt;${escapeHtml(customerEmail)}&gt; ${escapeHtml(phone)}</p>
      ${addrText ? `<p><span class="label">Ship to</span></p><pre class="address-block">${escapeHtml(addrText)}</pre><button type="button" class="copy-address">Copy address</button>` : '<p><em>No shipping address on file.</em></p>'}
      ${formHtml}
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
      submitShip(order.id, trackingNumber, carrier, card);
    });
  }

  const resendBtn = card.querySelector('.resend-tracking');
  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      submitShip(order.id, order.tracking_number, order.tracking_carrier, card, true);
    });
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
