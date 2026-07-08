/* ============================================================================
   Products surface — application logic (design prototype).
   No backend: actions mutate the in-memory model and show the honest confirm a
   real PUT/POST would. Swap model ops for the data-flow.md calls in integration.
   ============================================================================ */
(function () {
  "use strict";
  const D = window.PORTAL_DATA, P = window.PORTAL;
  const { money } = D;
  const esc = P.esc;
  let products = [];   // integration: loaded from GET /api/products in PORTAL.boot().then (was the D.products mock)
  let tab = "live", query = "", openId = null;
  // GAP #7: explicit default order (newest-first by created_at) + sort + pagination state
  let sortKey = "created", sortDir = "desc"; // "created" desc = the natural/default order
  let page = 1, pageSize = 25;

  /* ============================================================================
     INTEGRATION — real /api/products calls (replaces the prototype no-ops/mocks).
     Every call carries PORTAL.authHeader(); writes add Content-Type: application/json.
     Endpoints: GET/POST /api/products · PUT /api/products?id= · POST ?_action=publish |
     archive | unarchive | discard. MEDIA (images/media/thumbnail/checkout_image/
     seo_thumbnail) is owned by the media modal (WS5) — autosave/persist here NEVER send
     media fields, and checkout identity + slug are excluded too (slug is immutable on PUT;
     the checkout identity auto-generates at publish then freezes).
     ============================================================================ */
  const effOf = (p, k) => (p.draft && p.draft[k] != null ? p.draft[k] : p[k]);
  const nn = (v) => { const s = typeof v === "string" ? v.trim() : v; return s === "" || s == null ? null : s; };
  const isNewRow = (p) => String(p.id).startsWith("new-"); // never-persisted client draft (no server row yet)

  async function apiJSON(url, opts) {
    const res = await fetch(url, opts);
    let body = {}; try { body = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error(body.error || ("Something went wrong (" + res.status + ")"));
    return body;
  }
  function apiGet() {
    return apiJSON("/api/products", { headers: { ...P.authHeader() } })
      .then((b) => (Array.isArray(b.products) ? b.products : []));
  }
  function apiCreate(payload) {
    return apiJSON("/api/products", { method: "POST", headers: { ...P.authHeader(), "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  }
  function apiUpdate(id, patch) {
    return apiJSON("/api/products?id=" + encodeURIComponent(id), { method: "PUT", headers: { ...P.authHeader(), "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  }
  function apiAction(action, body) {
    return apiJSON("/api/products?_action=" + action, { method: "POST", headers: { ...P.authHeader(), "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  }

  // buildProductPayload contract (assets/js/admin.js:561-617): serialize the editor's EFFECTIVE model
  // state to the API body. price is ALREADY integer cents in the model (bindField converts on input);
  // list fields are ALREADY string[] (the data-list handler splits one-per-line); dimensions/weight are
  // ALREADY assembled by bindField — so this maps field-for-field, empty scalars → null. NO slug (added
  // only on create — a PUT with slug 400s as immutable), NO media. checkout_name/description ARE sent while
  // never-published (persist → show in the preview bar); once published they freeze server-side, omitted then.
  function editorPayload(p) {
    const arr = (k) => (Array.isArray(effOf(p, k)) ? effOf(p, k).filter((x) => String(x).trim()) : []);
    const out = {
      title: String(effOf(p, "title") || "").trim(),
      headline: nn(effOf(p, "headline")),
      story_card: effOf(p, "story_card") || "",
      description: nn(effOf(p, "description")),
      artist_note: nn(effOf(p, "artist_note")),
      series: nn(p.series),
      product_type: p.product_type || "miniature",
      features: arr("features"),
      materials: arr("materials"),
      care_instructions: arr("care_instructions"),
      shipping_details: arr("shipping_details"),
      dimensions: nn(effOf(p, "dimensions")),
      weight: nn(effOf(p, "weight")),
      power_supply: nn(effOf(p, "power_supply")),
      seo_title: nn(effOf(p, "seo_title")),
      seo_description: nn(effOf(p, "seo_description")),
      price: Number.isFinite(p.price) ? p.price : 0,   // already cents
      quantity: p.quantity == null ? 0 : p.quantity,
      available: !!p.available,
      featured: !!p.featured,
    };
    // Checkout name/line are editable + auto-generated (F-1) only while never-published — persist them then
    // so the storefront preview bar shows real values (server accepts pre-publish, freezes at publish). On a
    // published piece they're frozen (FROZEN_AFTER_PUBLISH), so we never send them.
    if (!p.published_at) {
      out.checkout_name = nn(effOf(p, "checkout_name"));
      out.checkout_description = nn(effOf(p, "checkout_description"));
    }
    return out;
  }

  // Fold a server response back into the in-memory model (real id/slug/sku/preview_token/draft),
  // preserving the client-only preview gate + retargeting openId when a new- draft becomes a real row.
  function reconcile(p, res, oldId) {
    if (!res) return;
    const row = res.product || res;
    const wasPreviewed = p._previewed;
    if (row && typeof row === "object") Object.assign(p, row);
    if (res.preview_url) p.preview_url = res.preview_url;
    if (wasPreviewed) p._previewed = true;
    if (openId === oldId && p.id !== oldId) openId = p.id;
  }

  // Persist the editor: brand-new → POST (only when a title is present); existing → PUT ?id=.
  // Returns true when a write happened (a truly-blank New closed writes nothing).
  async function persist(p, id) {
    if (isNewRow(p)) {
      // A draft needs only a TITLE to persist (title → slug → a real row so media can upload to R2).
      // Price is a PUBLISH-gate field (readiness + validatePublishRules), NOT a create-gate one — so
      // media/preview/schedule all work before pricing. editorPayload sends price:0 for an unpriced draft.
      const hasTitle = !!String(effOf(p, "title") || "").trim();
      if (!hasTitle) return false;
      const payload = editorPayload(p);
      if (p.slug) payload.slug = p.slug;   // slug is create-only
      reconcile(p, await apiCreate(payload), id);
      return true;
    }
    reconcile(p, await apiUpdate(p.id, editorPayload(p)), id);
    return true;
  }

  // Republish chain (Available ON / relist / restock): [PUT quantity] → PUT available:true →
  // POST ?_action=publish {id}. A publish-gate 400 SURFACES as a field-list toast (never a silent no-op).
  async function republish(p, id, qty) {
    try {
      if (qty != null && qty !== p.quantity) reconcile(p, await apiUpdate(p.id, { quantity: qty }), id);
      reconcile(p, await apiUpdate(p.id, { available: true }), id);
      reconcile(p, await apiAction("publish", { id: p.id }), id);
      render();
      P.toast("Back in the shop · live now", { kind: "live" });
    } catch (err) {
      render();
      P.toast(err.message, { kind: "danger" });   // e.g. "Cannot publish — Missing required fields: …"
    }
  }

  // Open the storefront preview in a new tab. Clean live row → /product/<slug>; draft/staged → ensure
  // the latest edits are persisted (so a fresh preview_token exists) then open preview_url. A blank tab is
  // opened SYNCHRONOUSLY so the awaited POST/PUT doesn't trip the popup blocker.
  async function openPreviewTab(p, id) {
    if (p.is_published && !p.draft && p.slug) { window.open(P.siteUrl() + "/product/" + p.slug, "_blank", "noopener"); return; }
    const w = window.open("about:blank", "_blank");
    try {
      const wrote = await persist(p, id);
      const url = p.preview_url || (p.slug && p.preview_token ? P.siteUrl() + "/product/" + p.slug + "?preview=" + p.preview_token : null);
      if (!url) { if (w) w.close(); P.toast(wrote ? "Preview unavailable — try saving again" : "Add a title first, then preview", { kind: "danger" }); return; }
      if (w) w.location.href = url; else window.open(url, "_blank", "noopener");
    } catch (err) { if (w) w.close(); P.toast(err.message, { kind: "danger" }); }
  }

  /* ---------- state model (Sean v1: Available OFF on a live piece → Draft) ---------- */
  function computeState(p) {
    if (p.archived_at) return "archived";        // tab only
    if (!p.is_published) return "draft";          // YELLOW
    if (p.draft) return "edits";                  // ORANGE (staged, needs publish)
    if (p.quantity === 0) return "sold";          // BLUE (out of stock from a sale) — tab
    return "live";                                // GREEN
  }
  const STATE_WORD = { live: "Live in the shop", edits: "Edits waiting to publish", draft: "Draft — hidden from the shop", sold: "Sold", archived: "Archived" };

  const TABS = [
    { id: "live", label: "Live", dot: "live" },
    { id: "drafts", label: "Drafts", dot: "draft" },
    { id: "sold", label: "Sold", dot: "sold" },
    { id: "archived", label: "Archived", dot: "archived" },
    { id: "all", label: "All", dot: "all" },
  ];
  function inTab(p, t) {
    const s = computeState(p);
    if (t === "all") return true;
    if (t === "live") return s === "live" || s === "edits";
    return s === t.replace("drafts", "draft");
  }
  function counts() { const c = {}; TABS.forEach((t) => (c[t.id] = products.filter((p) => inTab(p, t.id)).length)); return c; }

  /* ---------- publish-readiness (full required set per Sean) ---------- */
  function parseDims(s) {
    s = String(s || ""); const m = { w: "", d: "", h: "" };
    const grab = (re) => { const x = s.match(re); return x ? x[1] : ""; };
    m.w = grab(/([\d.]+)\s*"?\s*W/i); m.d = grab(/([\d.]+)\s*"?\s*D/i); m.h = grab(/([\d.]+)\s*"?\s*H/i);
    return m;
  }
  // F-1 helper — mirror the server slug generator (lowercase, dash-join, trim, cap length).
  function slugify(s) { return String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60); }
  function readiness(p) {
    const miss = [];
    const eff = (k) => (p.draft && p.draft[k] != null ? p.draft[k] : p[k]);
    const str = (k) => String(eff(k) || "").trim();
    const list = (k) => (Array.isArray(eff(k)) ? eff(k) : []).filter((x) => String(x).trim());
    if (!str("title")) miss.push("a title");
    if (!p.slug) miss.push("a slug");
    if (!str("headline")) miss.push("a headline");
    if (!str("description")) miss.push("a description");
    if (!(p.price > 0)) miss.push("a price");
    if (p.quantity == null) miss.push("a quantity");
    if (!str("story_card")) miss.push("the story card");
    if (!list("features").length) miss.push("features");
    if (!list("materials").length) miss.push("materials");
    if (!list("care_instructions").length) miss.push("care instructions");
    if (!list("shipping_details").length) miss.push("shipping details");
    const dm = parseDims(eff("dimensions"));
    if (!dm.w || !dm.d || !dm.h) miss.push("dimensions (W × D × H)");
    if (!str("weight")) miss.push("a weight");
    const imgs = p.images || [];
    if (imgs.length < 1) miss.push("a hero image");
    else if (imgs.length < 6) miss.push("at least 5 gallery photos");
    // v4.0 — a Share image is required (no more silent hero fallback). Set via the media modal's Share
    // toggle → writes seo_thumbnail; the backend enforces the same at publish.
    if (!str("seo_thumbnail")) miss.push("a thumbnail image");
    return { ok: miss.length === 0, missing: miss };
  }

  /* ---------- icons ---------- */
  const IC = {
    img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
    archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>',
    unarchive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h18"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M12 18v-6m0 0-2.5 2.5M12 12l2.5 2.5"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M21 3 10 14"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    drag: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  };
  function ledFor(p) { const s = computeState(p); return `<span class="led led--${s}" title="${STATE_WORD[s]}"></span>`; }
  function find(id) { return products.find((p) => p.id === id); }

  /* ---------- tabs ---------- */
  function renderTabs() {
    const c = counts(), seg = document.getElementById("tabs");
    seg.innerHTML = '<span class="seg__puck" aria-hidden="true"></span>' + TABS.map((t) =>
      `<button class="seg__chip" role="tab" data-tab="${t.id}" aria-selected="${t.id === tab}">
        <span class="dot dot--${t.dot}"></span>${t.label} <span class="count">${c[t.id]}</span></button>`).join("");
    seg.querySelectorAll(".seg__chip").forEach((chip) => chip.addEventListener("click", () => { tab = chip.dataset.tab; openId = null; page = 1; render(); }));
    positionPuck();
  }
  function positionPuck() {
    const seg = document.getElementById("tabs"), a = seg.querySelector('[aria-selected="true"]'), puck = seg.querySelector(".seg__puck");
    if (a && puck) { puck.style.width = a.offsetWidth + "px"; puck.style.transform = `translateX(${a.offsetLeft - 4}px)`; }
  }

  /* ---------- list: filter → sort → paginate (GAP #7) ---------- */
  function filtered() {
    const q = query.trim().toLowerCase();
    return products.filter((p) => inTab(p, tab)).filter((p) => !q || (p.title || "").toLowerCase().includes(q) || (p.slug || "").toLowerCase().includes(q));
  }
  function sortVal(p, key) {
    switch (key) {
      case "title": return (p.title || "").toLowerCase();
      case "price": return p.price || 0;
      case "quantity": return p.quantity == null ? -1 : p.quantity;
      case "available": return p.available ? 1 : 0;
      case "featured": return p.featured ? 1 : 0;
      default: return new Date(p.created_at || 0).getTime(); // "created"
    }
  }
  function sorted(rows) {
    const dir = sortDir === "asc" ? 1 : -1;
    return rows.slice().sort((a, b) => {
      const av = sortVal(a, sortKey), bv = sortVal(b, sortKey);
      let c = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      if (c !== 0) return c * dir;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0); // stable newest-first tiebreak
    });
  }
  function thumbHTML(p) {
    if (p.thumbnail) return `<img src="${p.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="ph" style="display:none">${IC.img}</span>`;
    return `<span class="ph">${IC.img}</span>`;
  }
  function smallToggle(kind, id, on, disabled) {
    const cls = kind === "feature" ? "switch switch--feature" : "switch";
    return `<label class="${cls}" title="${kind === "feature" ? "Featured on the homepage" : "Available — flip off to make it a draft"}">
      <input type="checkbox" data-${kind === "feature" ? "feature" : "avail"}="${id}" ${on ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <span class="switch__track"><span class="switch__thumb"></span></span></label>`;
  }
  function labeledToggle(kind, id, on, disabled, label) {
    const cls = kind === "feature" ? "switch switch--feature" : "switch";
    return `<label class="${cls}" title="${kind === "feature" ? "Featured on the homepage" : "Available — flip off to make it a draft"}">
      <input type="checkbox" data-${kind === "feature" ? "feature" : "avail"}="${id}" ${on ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <span class="switch__track"><span class="switch__thumb"></span></span><span class="switch__label">${label}</span></label>`;
  }
  function rowHTML(p) {
    const s = computeState(p), archived = s === "archived", dim = archived ? "opacity:.62;" : "";
    const open = openId === p.id ? " is-open" : "";
    const slug = p.slug ? `<span class="slug">/${p.slug}</span>` : `<span class="slug faint">— no slug yet —</span>`;
    return `
    <div class="prow${open}" data-id="${p.id}" style="${dim}">
      <span class="prow__led">${ledFor(p)}</span>
      <span class="prow__thumb">${thumbHTML(p)}</span>
      <button class="prow__id" data-open="${p.id}" aria-expanded="${openId === p.id}">
        <span class="prow__title">${esc(p.title) || "Untitled product"}</span>
        <span class="prow__meta">${slug}</span>
      </button>
      <span class="prow__price">${money(p.price)}<span class="qtysub${p.quantity === 0 ? " zero" : ""}">Qty ${p.quantity}</span></span>

      <span class="prow__cols">
        <span class="cell-price"><span class="sym">$</span>
          <input class="pin mono" data-price="${p.id}" inputmode="decimal" value="${(p.price / 100).toFixed(2)}" aria-label="Price for ${esc(p.title)}" ${archived ? "disabled" : ""}></span>
        <span class="cell-qty"><input class="qin${p.quantity === 0 ? " zero" : ""}" data-qty="${p.id}" inputmode="numeric" value="${p.quantity}" aria-label="Quantity for ${esc(p.title)}" ${archived ? "disabled" : ""}></span>
        <span class="cell-toggle">${smallToggle("avail", p.id, p.available, archived)}</span>
        <span class="cell-toggle">${smallToggle("feature", p.id, p.featured, archived)}</span>
        <span class="cell-actions">
          ${p.slug ? `<button class="iconbtn" data-copy-link="${p.id}" title="Copy product link" aria-label="Copy product link">${IC.link}</button>` : ""}
          <button class="iconbtn" data-preview="${p.id}" title="Preview" aria-label="Preview">${IC.eye}</button>
          <button class="iconbtn ${archived ? "" : "iconbtn--danger"}" data-archive="${p.id}" title="${archived ? "Resurface" : "Archive"}" aria-label="${archived ? "Resurface" : "Archive"}">${archived ? IC.unarchive : IC.archive}</button>
        </span>
      </span>

      <!-- mobile control strip: labeled toggles + actions -->
      <span class="prow__ctrls">
        ${labeledToggle("avail", p.id, p.available, archived, "Available")}
        ${labeledToggle("feature", p.id, p.featured, archived, "Featured")}
        <span class="spacer"></span>
        ${p.slug ? `<button class="iconbtn" data-copy-link="${p.id}" title="Copy product link" aria-label="Copy product link">${IC.link}</button>` : ""}
        <button class="iconbtn" data-preview="${p.id}" title="Preview" aria-label="Preview">${IC.eye}</button>
        <button class="iconbtn ${archived ? "" : "iconbtn--danger"}" data-archive="${p.id}" title="${archived ? "Resurface" : "Archive"}" aria-label="${archived ? "Resurface" : "Archive"}">${archived ? IC.unarchive : IC.archive}</button>
      </span>
    </div>
    <div class="editor-host" data-host="${p.id}">${openId === p.id ? editorHTML(p) : ""}</div>`;
  }
  function render() {
    renderTabs();
    const list = document.getElementById("list");
    const all = sorted(filtered());
    if (!all.length) { list.innerHTML = emptyHTML(); updateSortControls(); renderPager(0); return; }
    const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * pageSize;
    const rows = all.slice(start, start + pageSize);
    list.innerHTML = rows.map(rowHTML).join("");
    bindRows();
    updateSortControls();
    renderPager(all.length);
    if (openId && document.querySelector(`[data-host="${openId}"] .editor`)) { wireEditor(document.querySelector(`[data-host="${openId}"]`), openId); P.enhance(document.querySelector(`[data-host="${openId}"]`)); }
  }
  // reflect the active sort in the desktop headers + the mobile select
  function updateSortControls() {
    document.querySelectorAll(".listhead .colsort").forEach((b) => {
      const active = b.dataset.sort === sortKey;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-sort", active ? (sortDir === "asc" ? "ascending" : "descending") : "none");
      const ind = b.querySelector(".colsort__ind");
      if (ind) ind.textContent = active ? (sortDir === "asc" ? "▲" : "▼") : "";
    });
    const sel = document.getElementById("sortSelect");
    if (sel) sel.value = sortKey + ":" + sortDir;
  }
  // pagination — dormant until the catalog exceeds one default page (>25)
  function renderPager(total) {
    const pager = document.getElementById("pager"); if (!pager) return;
    if (total <= 25) { pager.style.display = "none"; pager.innerHTML = ""; return; }
    pager.style.display = "flex";
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * pageSize + 1, end = Math.min(page * pageSize, total);
    pager.innerHTML = `
      <span class="pager__count">${start}–${end} of ${total}</span>
      <span class="pager__spacer"></span>
      <div class="pager__nav">
        <button class="btn btn--ghost btn--sm" data-pg="prev" ${page === 1 ? "disabled" : ""}>Prev</button>
        <span class="pager__pages">Page ${page} / ${totalPages}</span>
        <button class="btn btn--ghost btn--sm" data-pg="next" ${page === totalPages ? "disabled" : ""}>Next</button>
      </div>
      <label class="pager__per">Per page
        <span class="select-wrap"><select class="select" id="perPage">${[25, 50, 100].map((n) => `<option value="${n}" ${n === pageSize ? "selected" : ""}>${n}</option>`).join("")}</select>${IC.chev}</span>
      </label>`;
    const prev = pager.querySelector('[data-pg="prev"]'); if (prev) prev.addEventListener("click", () => { if (page > 1) { page--; render(); } });
    const next = pager.querySelector('[data-pg="next"]'); if (next) next.addEventListener("click", () => { if (page < totalPages) { page++; render(); } });
    const per = pager.querySelector("#perPage"); if (per) per.addEventListener("change", (e) => { pageSize = +e.target.value; page = 1; render(); });
  }
  function emptyHTML() {
    if (query.trim()) return `<div class="empty">${IC.img}<h3>Nothing matches “${esc(query)}”</h3><p>Try a different name or slug, or clear the search.</p></div>`;
    if (tab !== "all" && !products.filter((p) => inTab(p, tab)).length) {
      const n = { drafts: "drafts", sold: "sold products", archived: "archived products", live: "live products" };
      return `<div class="empty">${IC.box}<h3>Nothing in ${n[tab] || tab}</h3></div>`;
    }
    return `<div class="empty">${IC.box}<h3>No products yet</h3><p>Your first piece will live here. Start one with “New”.</p></div>`;
  }

  /* ---------- row interactions ---------- */
  function bindRows() {
    const list = document.getElementById("list");
    list.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => toggleOpen(b.dataset.open)));
    list.querySelectorAll("[data-price]").forEach((inp) => {
      inp.addEventListener("focus", () => inp.select());
      inp.addEventListener("change", () => commitPrice(inp.dataset.price, inp.value, inp));
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") inp.blur(); });
    });
    list.querySelectorAll("[data-qty]").forEach((inp) => {
      inp.addEventListener("focus", () => inp.select());
      inp.addEventListener("change", () => commitQty(inp.dataset.qty, inp.value, inp));
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") inp.blur(); });
    });
    list.querySelectorAll("[data-avail]").forEach((t) => t.addEventListener("change", () => commitAvail(t.dataset.avail, t)));
    list.querySelectorAll("[data-feature]").forEach((t) => t.addEventListener("change", () => commitFeature(t.dataset.feature, t)));
    list.querySelectorAll("[data-archive]").forEach((b) => b.addEventListener("click", () => commitArchive(b.dataset.archive)));
    list.querySelectorAll("[data-preview]").forEach((b) => b.addEventListener("click", () => openPreview(b.dataset.preview)));
    list.querySelectorAll("[data-copy-link]").forEach((b) => b.addEventListener("click", () => copyLink(b.dataset.copyLink)));
  }
  // Copy a product's public permalink to the clipboard (any slugged row — live, sold, draft-with-slug).
  function copyLink(id) {
    const p = find(id); if (!p || !p.slug) return;
    const url = P.siteUrl() + "/product/" + p.slug;
    navigator.clipboard?.writeText(url);
    P.toast("Link copied", { kind: "live" });
  }
  function toggleOpen(id) {
    if (window.matchMedia("(max-width:859px)").matches) { openSheet(id); return; }
    if (openId === id) { closeEditor(); return; }
    openId = id; render();
    const row = document.querySelector(`.prow.is-open`);
    if (row) row.scrollIntoView({ block: "nearest" });
  }
  function closeEditor() { if (openId != null) { autosave(openId); openId = null; render(); } }

  /* optimistic-safe commerce edits — live-apply PUT ?id= {price}/{quantity}; revert on server error */
  async function commitPrice(id, val, inp) {
    const p = find(id), cents = Math.round(parseFloat(String(val).replace(/[^0-9.]/g, "")) * 100);
    if (isNaN(cents) || cents < 0 || cents === p.price) { inp.value = (p.price / 100).toFixed(2); return; }
    const prev = p.price;
    p.price = cents; inp.value = (cents / 100).toFixed(2);
    if (isNewRow(p)) { P.toast("Price set — save the draft to keep it"); return; }
    P.toast("Price saved · live now — " + money(cents), { kind: "live" });
    try { reconcile(p, await apiUpdate(id, { price: cents }), id); }
    catch (err) { p.price = prev; inp.value = (prev / 100).toFixed(2); P.toast(err.message, { kind: "danger" }); render(); }
  }
  async function commitQty(id, val, inp) {
    const p = find(id), q = parseInt(String(val).replace(/[^0-9]/g, ""), 10);
    if (isNaN(q) || q === p.quantity) { inp.value = p.quantity; return; }
    const prev = p.quantity;
    p.quantity = Math.max(0, q); inp.value = p.quantity;
    if (isNewRow(p)) { P.toast("Quantity set — save the draft to keep it"); render(); return; }
    P.toast("Quantity saved · live now — " + p.quantity + " in stock", { kind: "live" });
    render();
    try { reconcile(p, await apiUpdate(id, { quantity: p.quantity }), id); }
    catch (err) { p.quantity = prev; P.toast(err.message, { kind: "danger" }); render(); }
  }
  // Available OFF (live piece) → PUT {available:false} → server UNPUBLISHES to draft (Phase 2.2);
  // ON (draft) → republish chain (prompt stock if 0). A never-persisted draft can't go live yet.
  function commitAvail(id, t) {
    const p = find(id);
    if (t.checked) {
      if (isNewRow(p)) { t.checked = false; P.toast("Finish and save this draft first, then publish it"); return; }
      if (p.quantity === 0) { t.checked = false; promptStock(p, t); return; }
      syncToggles(id, "avail", true);
      republish(p, id, null);
    } else {
      // turning off a live piece makes it a DRAFT (hidden), not "sold"
      p.available = false; p.is_published = false;
      syncToggles(id, "avail", false); render();
      if (isNewRow(p)) return; // never persisted — nothing to unpublish server-side
      P.toast("Moved to Drafts — hidden from the shop", { undo: () => republish(p, id, null) });
      apiUpdate(id, { available: false })
        .then((res) => reconcile(p, res, id))
        .catch((err) => { p.available = true; p.is_published = true; render(); P.toast(err.message, { kind: "danger" }); });
    }
  }
  // featured — server routes it: staged on a published piece, live on a draft.
  function commitFeature(id, t) {
    const p = find(id);
    syncToggles(id, "feature", t.checked);
    if (isNewRow(p)) { p.featured = t.checked; P.toast(t.checked ? "Will be featured once saved" : "Not featured"); return; }
    apiUpdate(id, { featured: t.checked })
      .then((res) => { reconcile(p, res, id); render(); P.toast(res.staged ? "Featured change staged — publish to apply" : (t.checked ? "Featured on the homepage" : "No longer featured")); })
      .catch((err) => { syncToggles(id, "feature", p.featured); P.toast(err.message, { kind: "danger" }); });
  }
  function syncToggles(id, kind, on) { document.querySelectorAll(`[data-${kind === "feature" ? "feature" : "avail"}="${id}"]`).forEach((o) => (o.checked = on)); }
  function commitArchive(id) {
    const p = find(id), was = !!p.archived_at;
    if (isNewRow(p)) { // never persisted — archiving just discards the unsaved draft
      products = products.filter((x) => x !== p);
      if (openId === id) openId = null;
      render();
      P.toast("Draft discarded — nothing was saved");
      return;
    }
    p.archived_at = was ? null : new Date().toISOString();
    if (openId === id) openId = null;
    render();
    P.toast(was ? "Resurfaced — back in your shop" : "Archived — anything can be revived", { undo: () => commitArchive(id) });
    apiAction(was ? "unarchive" : "archive", { id: p.id })
      .then((res) => reconcile(p, res, id))
      .catch((err) => { p.archived_at = was ? new Date().toISOString() : null; render(); P.toast(err.message, { kind: "danger" }); });
  }
  function openPreview(id) {
    const p = find(id);
    // GATE #2: opening the storefront preview counts as "previewed at least once",
    // which is what unlocks Publish (see publishBtn / actionsNote).
    p._previewed = true;
    // The storefront preview shows the REVIEW BAR — the intended primary publish path this gate leads
    // into (assets/js/product.js mountPreviewBanner; POSTs /api/products?_action=publish {token}).
    openPreviewTab(p, id).then(() => {
      const curId = openId; // reconcile may have retargeted openId when a new- draft became a real row
      if (curId == null) return;
      const sheet = document.getElementById("sheet");
      const scope = (sheet && sheet.classList.contains("is-on")) ? sheet : document.querySelector(`[data-host="${curId}"]`);
      if (scope) refreshGate(scope, curId); else render();
    });
  }

  /* stock prompt */
  function promptStock(p, anchor) {
    closeStock();
    const pop = document.createElement("div"); pop.className = "stockpop"; pop.id = "stockpop";
    pop.innerHTML = `<h4>Add stock first?</h4><p>“${esc(p.title)}” has 0 in stock. Set a quantity to put it back in the shop.</p>
      <div class="r"><input class="input mono" id="stockqty" inputmode="numeric" value="1" style="width:72px" aria-label="Quantity">
      <button class="btn btn--sm" id="stockok">Add &amp; go live</button><button class="btn btn--ghost btn--sm" id="stockcancel">Not now</button></div>`;
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.top = window.scrollY + r.bottom + 6 + "px";
    pop.style.left = Math.max(8, Math.min(window.scrollX + r.left - 60, window.innerWidth - pop.offsetWidth - 8)) + "px";
    const qty = pop.querySelector("#stockqty"); qty.focus(); qty.select();
    pop.querySelector("#stockok").onclick = () => { const q = Math.max(1, parseInt(qty.value, 10) || 1); closeStock(); republish(p, p.id, q); };
    pop.querySelector("#stockcancel").onclick = closeStock;
    setTimeout(() => document.addEventListener("click", outsideStock), 0);
  }
  function outsideStock(e) { const pop = document.getElementById("stockpop"); if (pop && !pop.contains(e.target)) closeStock(); }
  function closeStock() { const pop = document.getElementById("stockpop"); if (pop) pop.remove(); document.removeEventListener("click", outsideStock); }

  /* ============================ EDITOR ============================ */
  function tipI(t) { return `<span class="tip"><button type="button" class="tip__btn" aria-label="More info">i</button><span class="tip__pop">${esc(t)}</span></span>`; }
  function lockChip(copy) { const c = copy || "Locks after publish"; return `<span class="tip"><button type="button" class="tip__btn tip__btn--lock" aria-label="${esc(c)}">${IC.lock}</button><span class="tip__pop">${esc(c)}</span></span>`; }

  function f(o) {
    const ring = o.ring ? ` data-ring="${o.ring}"` : "";
    const rec = o.rec ? ` data-rec="${o.rec}"` : "";
    const span = o.span2 ? " ed-span2" : "";
    // "Start here" flash — a brand-new product rings Price + Title orange-red until each is filled (bug #2).
    const startreq = o.startreq ? " data-startreq" : "";
    // F-4 — a lock CHIP shows the whole time when lockNote is set (so the maker sees a field WILL lock),
    // even while the input is still editable; the input only DISABLES when o.locked is true.
    const lock = o.lockNote ? lockChip(o.lockNote) : (o.locked ? lockChip() : "");
    const fld = o.field ? ` data-field="${o.field}"` : "";
    let ctrl;
    if (o.type === "textarea") ctrl = `<textarea class="textarea" data-autogrow${fld} ${o.locked ? "disabled" : ""} placeholder="${esc(o.ph || "")}" style="min-height:${o.minH || 92}px">${esc(o.value || "")}</textarea>`;
    else if (o.type === "price") ctrl = `<span class="price"><span class="price__sym">$</span><input class="input"${fld} inputmode="decimal" ${o.locked ? "disabled" : ""} value="${esc(o.value || "")}"></span>`;
    else if (o.type === "select") ctrl = `<span class="select-wrap"><select class="select"${fld} ${o.locked ? "disabled" : ""}>${o.options.map((op) => `<option ${op === o.value ? "selected" : ""}>${esc(op)}</option>`).join("")}</select>${IC.chev}</span>`;
    else ctrl = `<input class="input"${fld} ${o.locked ? "disabled" : ""} value="${esc(o.value || "")}" placeholder="${esc(o.ph || "")}" inputmode="${o.inputmode || "text"}">`;
    const countTop = o.rec ? '<span class="field__spacer"></span><span class="count" data-count-out></span>' : "";
    const meta = o.ctx ? `<div class="field__meta"><span class="field__ctx ${o.ctxLive ? "field__ctx--live" : ""}">${esc(o.ctx)}</span></div>` : "";
    return `<label class="field${span}"${ring}${rec}${startreq}>
      <div class="field__top"><span class="field__label">${esc(o.label)}${o.req ? '<span class="req">*</span>' : ""}${lock}${o.tip ? tipI(o.tip) : ""}</span>${countTop}</div>
      ${ctrl}${meta}</label>`;
  }
  function listField(o) {
    // textarea (one per line) + live bullet preview + helper tip
    const ring = o.ring ? ` data-ring="${o.ring}"` : "";
    const items = (o.value || []).filter((x) => String(x).trim());
    return `<label class="field${o.span2 ? " ed-span2" : ""}"${ring}>
      <div class="field__top"><span class="field__label">${esc(o.label)}${o.req ? '<span class="req">*</span>' : ""}${tipI("Write one per line. Each line becomes a bullet on the page.")}</span></div>
      <textarea class="textarea bullets-ta" data-list="${o.field}" data-autogrow style="min-height:90px" placeholder="One per line…">${esc(items.join("\n"))}</textarea></label>`;
  }

  function mediaSlots(p) {
    // FIX #4 — read the EFFECTIVE model (draft over live) so a published piece's staged media shows here,
    // matching what openMedia seeds + what wireGalleryDrag reorders (all effOf-based).
    const imgs = effOf(p, "images") || [];
    const heroUrl = imgs[0]?.url, galleryImgs = imgs.slice(1), gn = galleryImgs.length, galOk = gn >= 5;
    const vids = effOf(p, "media") || [];
    const shareUrl = effOf(p, "seo_thumbnail"), checkoutUrl = effOf(p, "checkout_image");
    const openIcon = (url) => url ? `<a class="mtile__open" href="${url}" target="_blank" rel="noopener" title="Open full asset" onclick="event.stopPropagation()">${IC.ext}</a>` : "";
    // only filled secondary media render — as uniform squares (never empty upload buttons)
    const sq = [];
    if (shareUrl) sq.push(`<div class="msq" data-open-url="${shareUrl}" title="Open thumbnail image in new tab"><img src="${shareUrl}" alt="" onerror="this.remove()">${openIcon(shareUrl)}<span class="msq__lbl">Thumbnail</span></div>`);
    if (checkoutUrl) sq.push(`<div class="msq" data-open-url="${checkoutUrl}" title="Open checkout image in new tab"><img src="${checkoutUrl}" alt="" onerror="this.remove()">${openIcon(checkoutUrl)}<span class="msq__lbl">Checkout</span></div>`);
    vids.forEach((v, i) => {
      const lbl = vids.length > 1 ? `Video ${i + 1}` : "Video";
      const inner = v.type === "youtube"
        ? `<span class="msq__yt">${IC.play}</span>`
        : `<video src="${v.url}" muted playsinline preload="metadata"></video><span class="msq__play">${IC.play}</span>`;
      sq.push(`<div class="msq msq--video" data-open-url="${v.url}" title="Open ${lbl.toLowerCase()} in new tab">${inner}<span class="msq__lbl">${lbl}</span></div>`);
    });
    return `<div class="media-center">
      <div class="media-cover">
        <div class="mtile mtile--hero ${heroUrl ? "filled" : "missing"}" ${heroUrl ? `data-open-url="${heroUrl}"` : "data-open-media"} title="${heroUrl ? "Open hero in new tab" : "Hero"}">
          ${heroUrl ? `<img src="${heroUrl}" alt="" onerror="this.remove()">` : IC.plus}
          ${heroUrl ? '<span class="mtile__badge">✓</span>' : '<span class="mtile__badge warn">!</span>'}${openIcon(heroUrl)}
          <span class="mtile__label">Hero</span></div>
        <div class="mgallery ${gn ? "filled" : ""}">
          <div class="mgallery__head"><span>Gallery <span class="mgallery__hint">· drag to reorder</span></span><span class="mgallery__count ${galOk ? "ok" : "warn"}">${gn}/5${galOk ? " ✓" : ""}</span></div>
          ${gn ? `<div class="mgallery__strip" id="galStrip">${galleryImgs.map((g, i) => `<div class="gthumb" data-gi="${i}" data-url="${g.url}" title="Click to open · hold and drag to reorder"><img src="${g.url}" alt="" onerror="this.parentElement.remove()"><span class="gthumb__n">${i + 1}</span></div>`).join("")}</div>`
               : `<div class="mgallery__empty" data-open-media>${IC.plus} Add gallery photos — at least 5</div>`}
        </div>
      </div>
      ${sq.length ? `<div class="media-sq">${sq.join("")}</div>` : ""}
      <div class="media-actions">
        <button class="media-add" data-open-media>${IC.upload} Add / edit media</button>
        <span class="media-note">Every product needs a Thumbnail image — give any image the Thumbnail role. Checkout reuses the hero unless you set its own.</span>
      </div>
    </div>`;
  }

  function editorHTML(p) {
    const r = readiness(p), published = p.is_published, everPublished = !!p.published_at, archived = !!p.archived_at;
    const eff = (k) => (p.draft && p.draft[k] != null ? p.draft[k] : p[k]);
    const edited = (k) => p.draft && p.draft[k] != null;
    const ring = (k, req) => { const v = eff(k); const empty = Array.isArray(v) ? !v.length : !String(v || "").trim(); if (req && empty) return "red"; if (edited(k)) return "yellow"; if (req) return "green"; return edited(k) ? "yellow" : null; };
    const dm = parseDims(eff("dimensions"));
    const seriesOpts = ["Portals to Peace", "Book Nooks", "Story Lofts", "Seasonal", "Limited Edition", "— No series —"];

    return `<div class="editor">
      <div class="ed-body">
        ${isNewRow(p) ? `<div class="start-hint" data-starthint${(p.price > 0 && String(eff("title") || "").trim()) ? " hidden" : ""}><span class="start-hint__dot"></span><span>Title and price first to activate other fields.</span></div>` : ""}
        ${archived ? `<div class="banner banner--warn" style="margin-bottom:16px">${IC.archive}<span>This product is archived — out of the shop. Resurface it to edit and relist. Nothing is ever deleted.</span></div>` : ""}
        ${p.draft ? `<div class="banner banner--warn" style="margin-bottom:16px">${IC.eye}<span>You have staged edits waiting. They go live next time you publish — the fields you changed are ringed orange.</span></div>` : ""}

        <!-- INSTANT-COMMERCE: price + quantity only; context appears on focus -->
        <div class="commerce">
          ${f({ label: "Price", req: true, tip: "Sets the shop price the moment you save. No publish needed.", value: (p.price / 100).toFixed(2), type: "price", ring: p.price > 0 ? "green" : "red", field: "price", startreq: isNewRow(p) && !(p.price > 0), ctx: "Applies to the shop the moment you save.", ctxLive: true })}
          ${f({ label: "Quantity", req: true, tip: "0 means sold out. Applies to the shop instantly.", value: String(p.quantity), ring: p.quantity == null ? "red" : (p.quantity === 0 ? "yellow" : "green"), field: "quantity", inputmode: "numeric", ctx: "Applies to the shop the moment you save.", ctxLive: true })}
        </div>

        <div class="section-h">The product <span class="line"></span></div>
        <div class="ed-cols">
          <div class="ed-main">
            <div class="ed-grid">
              ${f({ label: "Title", req: true, tip: "The name shown in your shop.", value: eff("title"), span2: true, ring: ring("title", true), field: "title", startreq: isNewRow(p) && !String(eff("title") || "").trim(), rec: 60, ph: "Name this product" })}
              ${f({ label: "Headline", req: true, tip: "The one line under the title.", value: eff("headline"), span2: true, ring: ring("headline", true), field: "headline", rec: 80 })}
              ${f({ label: "Collection", tip: "An optional grouping in the shop, also called the series.", value: p.series || "— No series —", type: "select", options: seriesOpts, field: "series" })}
              ${f({ label: "Product", req: true, tip: "The kind of product. Only miniature is in scope today; a new type needs development.", value: p.product_type, type: "select", options: ["miniature"], locked: everPublished, field: "product_type" })}
            </div>
            ${f({ label: "Story card", req: true, tip: "The short story that gives the piece its world.", value: eff("story_card"), type: "textarea", span2: true, ring: ring("story_card", true), field: "story_card", rec: 220, minH: 116, ph: "Tell the little story this piece holds…" })}
            ${f({ label: "Description", req: true, tip: "Materials and the making, in plain words.", value: eff("description"), type: "textarea", span2: true, ring: ring("description", true), field: "description", rec: 320, minH: 116 })}
            ${f({ label: "Artist note", tip: "Optional aside in your own voice.", value: eff("artist_note"), type: "textarea", span2: true, field: "artist_note", rec: 240 })}
          </div>

          <aside class="ed-side">
            <div class="ed-card">
              <div class="ed-card__cap">Listing &amp; SEO</div>
              <div class="ed-grid">
                ${f({ label: "Slug", req: true, tip: "The shop URL handle, made automatically from the title.", value: p.slug || "", locked: !isNewRow(p), lockNote: "Auto from the title · locks once saved", field: "slug", rec: 50, ph: "auto-from-title" })}
                ${f({ label: "SKU", tip: "Created automatically when the product is made. Never editable.", value: p.sku, locked: true, lockNote: "Created automatically; cannot be edited" })}
                ${f({ label: "Checkout name", tip: "What buyers see at checkout.", value: p.checkout_name || eff("title"), locked: everPublished, lockNote: "Locks after publish", field: "checkout_name", rec: 60 })}
                ${f({ label: "SEO title", tip: "The title for search results and shared links.", value: eff("seo_title") || "", field: "seo_title", rec: 60 })}
                ${f({ label: "SEO description", tip: "The snippet shown in search results.", value: eff("seo_description") || "", type: "textarea", field: "seo_description", rec: 155, minH: 70 })}
                ${f({ label: "Checkout description", tip: "The line buyers see at checkout.", value: p.checkout_description || "", locked: everPublished, lockNote: "Locks after publish", field: "checkout_description", rec: 90 })}
              </div>
            </div>
          </aside>
        </div>

        <div class="section-h">Details <span class="line"></span></div>
        <div class="ed-grid ed-grid--2">
          <div class="field" data-ring="${ring('dimensions', true)}"><div class="field__top"><span class="field__label">Dimensions<span class="req">*</span>${tipI("Width, depth and height. Enter inches with the \" symbol, or feet with '.")}</span></div>
            <div class="dims">
              <label class="dimcell"><input class="input mono" data-field="dim_w" inputmode="decimal" value="${esc(dm.w)}" placeholder="Width" aria-label="Width"><span class="dimunit">W</span></label>
              <label class="dimcell"><input class="input mono" data-field="dim_d" inputmode="decimal" value="${esc(dm.d)}" placeholder="Depth" aria-label="Depth"><span class="dimunit">D</span></label>
              <label class="dimcell"><input class="input mono" data-field="dim_h" inputmode="decimal" value="${esc(dm.h)}" placeholder="Height" aria-label="Height"><span class="dimunit">H</span></label>
            </div></div>
          <div class="field" data-ring="${ring("weight", true)}"><div class="field__top"><span class="field__label">Weight<span class="req">*</span>${tipI("Just the number; lbs is added for you.")}</span></div>
            <label class="dimcell"><input class="input mono" data-field="weight" inputmode="decimal" value="${esc(String(eff("weight") || "").replace(/[^0-9.]/g, ""))}" placeholder="0.0" aria-label="Weight in pounds"><span class="dimunit">lbs</span></label></div>
          ${listField({ label: "Materials", req: true, value: eff("materials"), field: "materials", ring: ring("materials", true) })}
          ${listField({ label: "Features", req: true, value: eff("features"), field: "features", ring: ring("features", true) })}
          ${listField({ label: "Care instructions", req: true, value: eff("care_instructions"), field: "care_instructions", ring: ring("care_instructions", true) })}
          ${listField({ label: "Shipping details", req: true, value: eff("shipping_details"), field: "shipping_details", ring: ring("shipping_details", true) })}
        </div>

        <div class="section-h">Media <span class="line"></span></div>
        ${mediaSlots(p)}

        <div class="section-h">Lifecycle <span class="line"></span></div>
        <div class="row-actions" style="flex-wrap:wrap;gap:8px">
          ${p.draft ? `<button class="btn btn--ghost btn--sm" data-discard>Discard staged edits</button>` : ""}
          ${p.is_published && (p.quantity === 0 || !p.available) ? `<button class="btn btn--ghost btn--sm" data-relist>Relist this piece</button>` : ""}
          ${(p.scheduled_publish_at || (r.ok && !(p.is_published && !p.draft))) ? `<button class="btn btn--ghost btn--sm" data-schedule>${p.scheduled_publish_at ? "Reschedule…" : "Schedule publish…"}</button>` : ""}
          ${p.scheduled_publish_at ? `<span class="sched-chip">Scheduled · ${fmtSched(p.scheduled_publish_at)}<button data-unschedule aria-label="Cancel schedule">×</button></span>` : ""}
        </div>
        <div style="margin-top:10px">
          <button class="btn btn--ghost btn--sm btn--archive" data-archive2>${IC.archive} ${archived ? "Resurface this product" : "Archive this product"}</button>
        </div>
      </div>

      <!-- actions: Save · Preview · Publish (sticky bottom on desktop, top-right on mobile; Archive lives in Lifecycle) -->
      <div class="ed-actions">
        <span class="grow"></span>
        <button class="btn btn--ghost" data-save>${IC.save} Save</button>
        <button class="iconbtn" data-ed-preview title="Preview" aria-label="Preview" style="border:1px solid var(--hairline)">${IC.eye}</button>
        ${publishBtn(p, r)}
        ${actionsNote(p, r) ? `<span class="btn-why ed-actions__why">${actionsNote(p, r)}</span>` : ""}
      </div>
    </div>`;
  }

  function publishBtn(p, r) {
    if (!r.ok) return `<button class="btn" disabled aria-disabled="true">${IC.check} Publish</button>`;
    // P-1 — the preview requirement fires ONLY the first time a piece goes live (never published yet).
    // Once published, editing in the open accordion IS the review: staged edits publish directly, and a
    // Featured-only toggle stays live (Claude Code's Featured-live change makes no draft). No re-preview,
    // and no re-arm on p.draft (the old `|| p.draft` clause forced a re-preview after any staged edit).
    const everPublished = !!p.published_at;
    if (!everPublished && !p._previewed) return `<button class="btn" disabled aria-disabled="true">${IC.check} Publish</button>`;
    if (p.draft) return `<button class="btn btn--publish-edits" data-publish>${IC.check} Publish changes</button>`;
    if (!p.is_published) return `<button class="btn btn--publish-new" data-publish>${IC.check} Publish · go live</button>`;
    return `<button class="btn" disabled aria-disabled="true">${IC.check} Published</button>`;
  }
  // the note under the actions row: readiness first, then the FIRST-publish preview gate
  function actionsNote(p, r) {
    if (!r.ok) return "To publish, add " + listMissing(r.missing) + ".";
    if (!p.published_at && !p._previewed) return "Preview this product before publishing — you can publish right from the preview.";
    return "";
  }
  function listMissing(m) { if (m.length === 1) return m[0]; if (m.length === 2) return m[0] + " and " + m[1]; return m.slice(0, -1).join(", ") + ", and " + m[m.length - 1]; }

  /* ---------- editor wiring ---------- */
  function wireEditor(scope, id) {
    const p = find(id);
    // toggles (edbar, mobile)
    scope.querySelectorAll("[data-avail]").forEach((t) => t.addEventListener("change", () => commitAvail(id, t)));
    scope.querySelectorAll("[data-feature]").forEach((t) => t.addEventListener("change", () => commitFeature(id, t)));
    // live-bound fields → update model, re-check publish gate + ring
    scope.querySelectorAll("[data-field]").forEach((el) => el.addEventListener("input", () => bindField(p, el, scope)));
    // F-1 — on-blur field generation, NEVER-published pieces only (the published-edit edge is flagged in
    // OPEN_QUESTIONS). Title blur fills slug + checkout name; headline/description blur fills the checkout
    // line (from the first source entered) and the SEO fields. Fill-when-blank only (never clobber a manual
    // edit); values populate IN PLACE (no full re-render, so a Save/Preview click is never eaten). slug +
    // seo_* + checkout_* ride existing persistence → show in the preview bar.
    if (!p.published_at) {
      const putVal = (sel, v) => { const el = scope.querySelector(sel); if (el && el !== document.activeElement) el.value = v; };
      // Checkout line = the short line buyers see at checkout. Fill from the FIRST source the maker enters —
      // headline (a tagline, fits the ~90-char line) preferred, else description. Fill-when-blank; manual-safe.
      const fillCheckoutLine = (src) => {
        const v = String(src || "").trim();
        if (!v || String(effOf(p, "checkout_description") || "").trim()) return false;
        setEff(p, "checkout_description", v); putVal('[data-field="checkout_description"]', v); return true;
      };
      const titleEl = scope.querySelector('[data-field="title"]');
      if (titleEl) titleEl.addEventListener("blur", () => {
        const title = String(effOf(p, "title") || "").trim(); if (!title) return;
        let ch = false;
        if (isNewRow(p) && !p.slug) { p.slug = slugify(title); putVal('[data-field="slug"]', p.slug); ch = true; }
        if (!String(effOf(p, "checkout_name") || "").trim()) { setEff(p, "checkout_name", title); putVal('[data-field="checkout_name"]', title); ch = true; }
        if (fillCheckoutLine(effOf(p, "headline") || effOf(p, "description"))) ch = true;
        if (ch) refreshGate(scope, id);
      });
      const headlineEl = scope.querySelector('[data-field="headline"]');
      if (headlineEl) headlineEl.addEventListener("blur", () => { fillCheckoutLine(effOf(p, "headline")); });
      const descEl = scope.querySelector('[data-field="description"]');
      if (descEl) descEl.addEventListener("blur", () => {
        const title = String(effOf(p, "title") || "").trim(), desc = String(effOf(p, "description") || "").trim();
        if (title && !String(effOf(p, "seo_title") || "").trim()) { setEff(p, "seo_title", title); putVal('[data-field="seo_title"]', title); }
        if (desc && !String(effOf(p, "seo_description") || "").trim()) { setEff(p, "seo_description", desc); putVal('[data-field="seo_description"]', desc); }
        fillCheckoutLine(effOf(p, "description"));
      });
    }
    // list fields → bullets preview + model
    scope.querySelectorAll("[data-list]").forEach((ta) => ta.addEventListener("input", () => {
      const key = ta.dataset.list, items = ta.value.split("\n").map((x) => x.trim()).filter(Boolean);
      setEff(p, key, items);
      // F-3 — a required list field stayed RED after text was entered because only data-field inputs updated
      // their ring. Update this field's ring here too: empty+required → red, else green (clears on input).
      const fieldEl = ta.closest(".field");
      if (fieldEl && fieldEl.hasAttribute("data-ring")) {
        const req = fieldEl.querySelector(".req");
        fieldEl.setAttribute("data-ring", (!items.length && req) ? "red" : "green");
      }
      refreshGate(scope, id);
    }));
    // lifecycle
    const disc = scope.querySelector("[data-discard]"); if (disc) disc.addEventListener("click", () => {
      apiAction("discard", { id: p.id })
        .then((res) => { reconcile(p, res, id); rerenderEditor(id); P.toast("Edits discarded — back to what's live"); })
        .catch((err) => P.toast(err.message, { kind: "danger" }));
    });
    const rel = scope.querySelector("[data-relist]"); if (rel) rel.addEventListener("click", async () => {
      try {
        if (p.archived_at) reconcile(p, await apiAction("unarchive", { id: p.id }), id);
        await republish(p, id, p.quantity > 0 ? p.quantity : 1); // sets stock, available, republishes
      } catch (err) { P.toast(err.message, { kind: "danger" }); }
    });
    const sched = scope.querySelector("[data-schedule]"); if (sched) sched.addEventListener("click", (e) => openSchedule(e.currentTarget, id));
    const unsched = scope.querySelector("[data-unschedule]"); if (unsched) unsched.addEventListener("click", () => {
      const prev = p.scheduled_publish_at; p.scheduled_publish_at = null; rerenderEditor(id); P.toast("Schedule cleared");
      if (isNewRow(p)) return;
      apiUpdate(id, { scheduled_publish_at: null }).then((res) => reconcile(p, res, id)).catch((err) => { p.scheduled_publish_at = prev; rerenderEditor(id); P.toast(err.message, { kind: "danger" }); });
    });
    // actions
    const arch = scope.querySelector("[data-archive2]"); if (arch) arch.addEventListener("click", () => commitArchive(id));
    const prev = scope.querySelector("[data-ed-preview]"); if (prev) prev.addEventListener("click", () => openPreview(id));
    const save = scope.querySelector("[data-save]"); if (save) save.addEventListener("click", async () => { const wrote = await autosave(id); if (wrote) P.toast("Saved", { kind: "live" }); closeAndExit(id); });
    const pub = scope.querySelector("[data-publish]"); if (pub) pub.addEventListener("click", () => doPublish(id));
    // media
    scope.querySelectorAll("[data-open-media]").forEach((b) => b.addEventListener("click", () => openMedia(id)));
    scope.querySelectorAll("[data-open-url]").forEach((el) => el.addEventListener("click", (e) => {
      if (e.target.closest(".mtile__open")) return;
      const u = el.getAttribute("data-open-url"); if (u) window.open(u, "_blank", "noopener");
    }));
    wireGalleryDrag(scope, id);
  }
  function fmtSched(iso) { try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch (e) { return ""; } }
  function openSchedule(anchor, id) {
    document.querySelector(".schedpop")?.remove();
    const p = find(id);
    const pop = document.createElement("div"); pop.className = "schedpop";
    const base = p.scheduled_publish_at ? new Date(p.scheduled_publish_at) : new Date(Date.now() + 86400000);
    const dStr = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
    const tStr = base.toTimeString().slice(0, 5);
    pop.innerHTML = `<h4>Schedule publish</h4>
      <p class="faint" style="font-size:var(--t-xs);margin:0">Goes live on its own at the date &amp; time you choose.</p>
      <div class="row"><input class="input" type="date" id="schedDate" value="${dStr}"><input class="input" type="time" id="schedTime" value="${tStr}"></div>
      <div class="row" style="justify-content:flex-end">
        ${p.scheduled_publish_at ? '<button class="btn btn--ghost btn--sm" id="schedClear">Clear</button>' : ""}
        <button class="btn btn--ghost btn--sm" id="schedCancel">Cancel</button>
        <button class="btn btn--sm" id="schedSave">Schedule</button></div>`;
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.left = Math.max(12, Math.min(r.left, window.innerWidth - pop.offsetWidth - 12)) + "px";
    pop.style.top = Math.max(12, Math.min(r.bottom + 6, window.innerHeight - pop.offsetHeight - 12)) + "px";
    const close = () => pop.remove();
    pop.querySelector("#schedCancel").onclick = close;
    const clearBtn = pop.querySelector("#schedClear"); if (clearBtn) clearBtn.onclick = () => {
      const prev = p.scheduled_publish_at; p.scheduled_publish_at = null; close(); rerenderEditor(id); P.toast("Schedule cleared");
      if (isNewRow(p)) return;
      apiUpdate(id, { scheduled_publish_at: null }).then((res) => reconcile(p, res, id)).catch((err) => { p.scheduled_publish_at = prev; rerenderEditor(id); P.toast(err.message, { kind: "danger" }); });
    };
    pop.querySelector("#schedSave").onclick = async () => {
      const dv = pop.querySelector("#schedDate").value, tv = pop.querySelector("#schedTime").value || "09:00";
      if (!dv) { P.toast("Pick a date first", { kind: "danger" }); return; }
      const prev = p.scheduled_publish_at;
      const iso = new Date(dv + "T" + tv).toISOString();
      p.scheduled_publish_at = iso;
      close(); rerenderEditor(id); P.toast("Publish scheduled for " + fmtSched(iso), { kind: "live" });
      try {
        // scheduled_publish_at isn't in editorPayload, so a never-saved draft is POSTed first (real id),
        // then the schedule is applied — otherwise the create would drop it.
        if (isNewRow(p)) { const wrote = await persist(p, id); if (!wrote) throw new Error("Add a title before scheduling"); }
        reconcile(p, await apiUpdate(p.id, { scheduled_publish_at: iso }), id);
        rerenderEditor(openId != null ? openId : id);
      } catch (err) { p.scheduled_publish_at = prev; rerenderEditor(openId != null ? openId : id); P.toast(err.message, { kind: "danger" }); }
    };
    setTimeout(() => document.addEventListener("pointerdown", function h(ev) { if (!pop.contains(ev.target) && ev.target !== anchor) { close(); document.removeEventListener("pointerdown", h); } }), 0);
  }
  function wireGalleryDrag(scope, id) {
    const strip = scope.querySelector("#galStrip"); if (!strip) return;
    const p = find(id);
    strip.querySelectorAll(".gthumb").forEach((el) => el.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      e.preventDefault();
      const drag = el; const sx = e.clientX, sy = e.clientY; let moved = false;
      try { drag.setPointerCapture(e.pointerId); } catch (_) {}
      const move = (ev) => {
        if (!moved && Math.abs(ev.clientX - sx) < 5 && Math.abs(ev.clientY - sy) < 5) return;
        if (!moved) { moved = true; drag.classList.add("dragging"); }
        const sibs = [...strip.querySelectorAll(".gthumb:not(.dragging)")];
        let after = null;
        for (const s of sibs) { const b = s.getBoundingClientRect(); if (ev.clientX < b.left + b.width / 2) { after = s; break; } }
        if (after) strip.insertBefore(drag, after); else strip.appendChild(drag);
      };
      const up = (ev) => {
        try { drag.releasePointerCapture(ev.pointerId); } catch (_) {}
        strip.removeEventListener("pointermove", move); strip.removeEventListener("pointerup", up);
        if (!moved) { const u = drag.getAttribute("data-url"); if (u) window.open(u, "_blank", "noopener"); return; }
        drag.classList.remove("dragging");
        // FIX #3 + #4 — reorder the EFFECTIVE images (the strip's data-gi indexes effOf, per mediaSlots) and
        // write via setEff (stages into draft on a published piece), THEN PERSIST — §5.3 "order saves with
        // the piece". autosave/editorPayload deliberately OMIT images, so without this PUT the reorder was
        // purely in-memory and lost on reload.
        const eff = effOf(p, "images") || [];
        const order = [...strip.querySelectorAll(".gthumb")].map((g) => +g.dataset.gi);
        const gal = eff.slice(1);
        const reordered = order.map((i) => gal[i]).filter(Boolean);
        const next = [eff[0], ...reordered];
        setEff(p, "images", next);
        rerenderEditor(id);
        if (!isNewRow(p)) {
          apiUpdate(p.id, { images: next })
            .then((res) => { reconcile(p, res, id); rerenderEditor(openId != null ? openId : id); })
            .catch((err) => P.toast(err.message, { kind: "danger" }));
        }
      };
      strip.addEventListener("pointermove", move); strip.addEventListener("pointerup", up);
    }));
  }
  function setEff(p, key, val) { if (p.is_published) { p.draft = p.draft || {}; p.draft[key] = val; } else { p[key] = val; } }
  function bindField(p, el, scope) {
    const key = el.dataset.field, val = el.value;
    if (key === "price") { const c = Math.round(parseFloat(val.replace(/[^0-9.]/g, "")) * 100); if (!isNaN(c)) p.price = c; }
    else if (key === "quantity") { const q = parseInt(val, 10); if (!isNaN(q)) p.quantity = Math.max(0, q); }
    else if (key.startsWith("dim_")) { p.dimensions = `${dimVal(scope, "dim_w")}" W x ${dimVal(scope, "dim_d")}" D x ${dimVal(scope, "dim_h")}" H`; }
    else if (key === "weight") { const n = val.replace(/[^0-9.]/g, ""); setEff(p, "weight", n ? n + " lbs" : ""); }
    else if (["title", "headline", "description", "story_card", "artist_note", "seo_title", "seo_description", "checkout_name", "checkout_description"].includes(key)) setEff(p, key, val);
    else if (key === "slug" || key === "series" || key === "product_type") p[key] = val;
    // update this field's ring (F-2 — price/dimensions need value-aware emptiness, not just a blank string)
    const fieldEl = el.closest(".field");
    if (fieldEl && fieldEl.hasAttribute("data-ring")) {
      const req = fieldEl.querySelector(".req");
      let empty;
      if (key.startsWith("dim_")) empty = !(dimVal(scope, "dim_w") && dimVal(scope, "dim_d") && dimVal(scope, "dim_h"));
      else if (key === "price") empty = !(parseFloat(String(val).replace(/[^0-9.]/g, "")) > 0);
      else empty = !String(val).trim();
      fieldEl.setAttribute("data-ring", empty && req ? "red" : "green");
      // Bug #2 — a brand-new product's Price + Title flash orange-red until filled; clear each live, and hide
      // the "start here" hint once BOTH are done (no re-render, so a Save/Preview click is never eaten).
      if (isNewRow(p) && (key === "price" || key === "title")) {
        if (empty) fieldEl.setAttribute("data-startreq", ""); else fieldEl.removeAttribute("data-startreq");
        const hint = scope.querySelector("[data-starthint]");
        if (hint) hint.hidden = !scope.querySelector(".field[data-startreq]");
      }
    }
    refreshGate(scope, find(openId).id);
  }
  function dimVal(scope, f) { const el = scope.querySelector(`[data-field="${f}"]`); return el ? el.value.replace(/[^0-9.]/g, "") : ""; }
  function refreshGate(scope, id) {
    const p = find(id), r = readiness(p);
    const bar = scope.querySelector(".ed-actions"); if (!bar) return;
    const old = bar.querySelector("[data-publish],[disabled][aria-disabled]"); // crude: re-render action area
    const wrap = document.createElement("div"); wrap.innerHTML = publishBtn(p, r);
    const newBtn = wrap.firstElementChild;
    const cur = bar.querySelectorAll(".btn"); const pubCur = cur[cur.length - 1];
    if (pubCur) { pubCur.replaceWith(newBtn); const nb = newBtn.matches("[data-publish]") ? newBtn : null; if (nb) nb.addEventListener("click", () => doPublish(id)); }
    let why = bar.querySelector(".ed-actions__why"); if (why) why.remove();
    const note = actionsNote(p, r);
    if (note) { const s = document.createElement("span"); s.className = "btn-why ed-actions__why"; s.textContent = note; bar.appendChild(s); }
  }
  // §2.1b — existing row → PUT ?id=; brand-new + title → POST. Returns true when it wrote.
  async function autosave(id) {
    const p = find(id); if (!p) return false;
    try { const wrote = await persist(p, id); if (wrote && openId == null) render(); return wrote; }
    catch (err) { P.toast(err.message, { kind: "danger" }); return false; }
  }
  function rerenderEditor(id) { render(); }
  function closeAndExit(id) { openId = null; render(); const m = document.getElementById("sheet"); if (m && m.classList.contains("is-on")) closeSheet(); }
  // §2.1e — staged edits on a published piece publish directly (POST {id}); a never-published piece
  // persists then opens the storefront preview, where the real Publish fires (POST {token}).
  async function doPublish(id) {
    const p = find(id);
    try {
      if (p.published_at && p.draft) {
        reconcile(p, await apiAction("publish", { id: p.id }), id);
        render(); P.toast("Published · live now", { kind: "live" });
      } else if (!p.published_at) {
        await openPreviewTab(p, id);
        P.toast("Preview open — hit Publish on the preview page to go live");
      } else {
        P.toast("This piece is already live");
      }
    } catch (err) { P.toast(err.message, { kind: "danger" }); }
  }

  /* ---------- mobile sheet ---------- */
  function openSheet(id) {
    const p = find(id); let sheet = document.getElementById("sheet");
    if (!sheet) { sheet = document.createElement("div"); sheet.className = "sheet"; sheet.id = "sheet"; document.body.appendChild(sheet); }
    openId = id;
    sheet.innerHTML = `<div class="edbar">
        <button class="iconbtn" id="sheetClose" aria-label="Close (saves automatically)">${IC.x}</button>
        <span class="edbar__spacer"></span>
        <span class="edbar__toggles">
          ${labeledToggle("avail", id, p.available, false, "Available")}
          ${labeledToggle("feature", id, p.featured, false, "Featured")}
        </span>
      </div><div class="sheet__body" id="sheetBody">${editorHTML(p)}</div>`;
    requestAnimationFrame(() => sheet.classList.add("is-on"));
    document.body.style.overflow = "hidden";
    sheet.querySelector("#sheetClose").onclick = () => { autosave(id); closeSheet(); };
    wireEditor(sheet, id); P.enhance(sheet);
  }
  function closeSheet() { const s = document.getElementById("sheet"); if (s) s.classList.remove("is-on"); document.body.style.overflow = ""; openId = null; render(); }

  /* ============================ MEDIA MODAL ============================ */
  let mItems = [], mProductId = null;
  function openMedia(id) {
    mProductId = id; const p = find(id);
    mItems = [];
    // FIX #4 — seed from the EFFECTIVE model (draft over live). On a published piece the media PUT stages
    // into draft; reconcile then reverts the in-memory live columns, so reading RAW p.images/p.media here
    // would diff a re-edit against STALE live state, dropping the prior staged photo + orphaning its upload.
    const srcImages = effOf(p, "images") || [];
    const srcMedia = effOf(p, "media") || [];
    const srcShare = effOf(p, "seo_thumbnail"), srcCheckout = effOf(p, "checkout_image");
    // §5.3c — seed each image's roles from the {role}-{slug} FILENAME (mirrors pickHero + the storefront
    // gallery filter), NOT the array index. share/checkout are top-level columns (rarely in images[]);
    // re-add them by url-match just below.
    srcImages.forEach((im) => {
      const u = im.url || "";
      const roles = new Set();
      if (/\/(?:test_)?hero-/.test(u)) roles.add("hero");
      if (/\/(?:test_)?gallery-/.test(u)) roles.add("gallery");
      mItems.push({ kind: "image", url: im.url, alt: im.alt || "", roles });
    });
    if (srcShare) { const ex = mItems.find((m) => m.url === srcShare); if (ex) ex.roles.add("share"); }
    if (srcCheckout) { const ex = mItems.find((m) => m.url === srcCheckout); if (ex) ex.roles.add("checkout"); }
    // §5.2c symmetry: read `muted` back like loop/controls (emit writes it) so reopen→Apply doesn't silently
    // re-flip Mute. FIX #5: read `poster` back too, else applyMedia's `...(m.poster?…)` is always false and
    // any change→Apply strips every video's poster (violates §5.4d "leave posters as-is").
    srcMedia.forEach((md) => mItems.push({ kind: md.type === "youtube" ? "youtube" : "video", url: md.url, alt: md.alt || "", loop: md.loop !== false, mute: md.muted !== false, controls: md.controls !== false, autoplay: !!md.autoplay, poster: md.poster }));
    // §5.4c.i — stash the opened role set per image (AFTER the share/checkout re-add, so an unchanged
    // open→Apply diffs to nothing). Apply computes added/removed roles against this baseline.
    mItems.forEach((m) => { if (m.roles) m.openedRoles = new Set(m.roles); });
    renderMedia();
    document.getElementById("mediaModal").classList.add("is-on");
    document.getElementById("mediaScrim").classList.add("is-on");
  }
  function closeMedia() { document.getElementById("mediaModal").classList.remove("is-on"); document.getElementById("mediaScrim").classList.remove("is-on"); }
  function detectKind(url) {
    if (/youtu\.be|youtube\.com/i.test(url)) return "youtube";
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return "video";
    if (/\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(url) || /drive\.google|dropbox/i.test(url)) return "image";
    return "image";
  }
  /* ---- WS5: real uploads + role numbering + persist-first (§5.1 / §5.4c.i) ---- */
  function padNN(n) { return String(n).padStart(2, "0"); }
  // ported from admin.js nextNumberedRole (:490-498): scan a url list for the highest {base}-NN and
  // return the next; NEVER renumbers an existing file (the CDN filename IS the role/uniqueness token).
  function highestNN(base, urls) {
    const re = new RegExp("\\/(?:test_)?" + base + "-(\\d+)[-.]");
    const reRole = new RegExp("^" + base + "-(\\d+)$");
    let max = 0;
    (urls || []).forEach((u) => { const m = String(u || "").match(re); if (m) max = Math.max(max, +m[1]); });
    // FIX #2 — also count in-flight/pending mItems: their reserved role (_role, stamped at creation) holds
    // the NN before the upload resolves a URL, so a second batch/paste BEFORE Apply can't reuse the same
    // {base}-NN and silently overwrite the first batch's R2 key.
    mItems.forEach((m) => {
      const mu = String(m.url || "").match(re); if (mu) max = Math.max(max, +mu[1]);
      const mr = String(m._role || "").match(reRole); if (mr) max = Math.max(max, +mr[1]);
    });
    return max;
  }
  function nextNumberedRole(base, urls) { return base + "-" + padNN(highestNN(base, urls) + 1); }
  const roleOfUrl = (u) => (/\/(?:test_)?hero-/.test(u) ? "hero" : /\/(?:test_)?gallery-/.test(u) ? "gallery" : null);
  // persist-first (WS5 §5.5): a brand-new `new-xxx` draft has no server row/slug. An upload needs the real
  // slug and a media PUT needs the real id, so POST the draft first (title required; price optional). reconcile folds
  // the real id/slug back in. Returns the slug, or null (caller aborts + we've toasted why).
  async function ensureSlug(p, id) {
    if (isNewRow(p)) {
      const oldId = p.id;
      const wrote = await persist(p, id);
      if (!wrote) { P.toast("Add a title first, then add media", { kind: "danger" }); return null; }
      // FIX #1 (hard crash) — reconcile retargets openId but NOT mProductId. Once persist swaps the
      // new-xxx id for the real UUID, every later find(mProductId) would return undefined → the 2nd upload
      // / Apply throws + orphans the R2 files. Mirror reconcile's openId retarget here.
      if (p.id !== oldId) mProductId = p.id;
    }
    return p.slug || null;
  }
  // one upload → { url }. Multipart when {file}; JSON by-link when {url}. Video skips the crop (skip_transform).
  async function uploadMedia(opts) {
    let res;
    if (opts.file) {
      const fd = new FormData();
      fd.append("file", opts.file); fd.append("slug", opts.slug); fd.append("role", opts.role);
      if (opts.isVideo) fd.append("skip_transform", "true");
      res = await fetch("/api/upload", { method: "POST", headers: { ...P.authHeader() }, body: fd });
    } else {
      const body = { url: opts.url, slug: opts.slug, role: opts.role };
      if (opts.isVideo) body.skip_transform = "true";
      res = await fetch("/api/upload", { method: "POST", headers: { ...P.authHeader(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    const b = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(b.error || ("Upload failed (" + res.status + ")"));
    return b;
  }
  function coverage() {
    const hero = mItems.some((m) => m.roles && m.roles.has("hero"));
    const gallery = mItems.filter((m) => m.roles && m.roles.has("gallery")).length;
    const share = mItems.some((m) => m.roles && m.roles.has("share"));
    const checkout = mItems.some((m) => m.roles && m.roles.has("checkout"));
    return { hero, gallery, share, checkout };
  }
  function renderMedia() {
    computeLabels();
    const body = document.getElementById("mediaBody");
    body.innerHTML = `
      <div class="dropzone" id="dropzone">${IC.upload}
        <p><b>Drop images and video</b></p>
        <button class="btn btn--sm" id="pickBtn">Upload</button>
      </div>
      <div class="urlrow">
        <input class="input" id="urlInput" placeholder="Paste an image / .mp4 / YouTube / Drive / Dropbox link" autocomplete="off">
        <button class="btn btn--ghost" id="urlAdd">Add</button>
      </div>
      <div class="mitems" id="mitems">${mItems.map(mItemHTML).join("")}</div>`;
    wireMedia(); updateFallback();
  }
  // role-aware labels & numbering across the modal list
  function computeLabels() {
    const ROLE_LABEL = { hero: "Hero image", share: "Thumbnail image", checkout: "Checkout image", poster: "Video poster" };
    const SHORT = { hero: "Hero", gallery: "Gallery", share: "Thumbnail", checkout: "Checkout", poster: "Video poster" };
    const ORDER = ["hero", "gallery", "share", "checkout", "poster"];
    const gal = mItems.filter((m) => m.kind === "image" && m.roles.has("gallery"));
    const unrouted = mItems.filter((m) => m.kind === "image" && m.roles.size === 0);
    const vids = mItems.filter((m) => m.kind === "video");
    const yts = mItems.filter((m) => m.kind === "youtube");
    const galTok = (m) => (gal.length > 1 ? "Gallery " + (gal.indexOf(m) + 1) : "Gallery");
    mItems.forEach((m) => {
      let roleLabel;
      if (m.kind === "image") {
        const roles = ORDER.filter((r) => m.roles.has(r));
        if (roles.length === 0) roleLabel = unrouted.length > 1 ? "Image " + (unrouted.length - unrouted.indexOf(m)) : "Image";
        else if (roles.length === 1) roleLabel = roles[0] === "gallery" ? (gal.length > 1 ? "Gallery image " + (gal.indexOf(m) + 1) : "Gallery image") : ROLE_LABEL[roles[0]];
        else roleLabel = roles.map((r) => (r === "gallery" ? galTok(m) : SHORT[r])).join(", ") + " image";
      } else if (m.kind === "video") {
        roleLabel = vids.length > 1 ? "Video " + (vids.length - vids.indexOf(m)) : "Video";
      } else {
        roleLabel = yts.length > 1 ? "YouTube " + (yts.length - yts.indexOf(m)) : "YouTube";
      }
      m._roleLabel = roleLabel;
      // M-4 — a real filename (captured at drop) leads the label; the role rides along as a faint suffix.
      m._label = m.name ? prettyName(m.name) : roleLabel;
    });
  }
  // M-4 — trim a filename to a consistent ~24 chars, keeping the start + extension (middle ellipsis) so a
  // long name stays identifiable and every upload's label reads about the same length.
  function prettyName(name) {
    const s = String(name || "").trim(); if (!s) return "";
    const max = 24; if (s.length <= max) return s;
    const dot = s.lastIndexOf("."); const ext = (dot > 0 && s.length - dot <= 6) ? s.slice(dot) : "";
    const stem = ext ? s.slice(0, s.length - ext.length) : s;
    const keep = max - ext.length - 1, head = Math.ceil(keep * 0.6), tail = Math.floor(keep * 0.4);
    return stem.slice(0, head) + "…" + stem.slice(stem.length - tail) + ext;
  }
  // M-3 — preview width from the media's true aspect (fixed 72px height), clamped so the row stays tidy.
  function thumbW(aspect) { const a = aspect && isFinite(aspect) ? aspect : 1; return Math.round(Math.max(44, Math.min(128, 72 * a))); }
  const ROLE_DEFS = [["hero", "Hero"], ["gallery", "Gallery"], ["share", "Thumbnail"], ["checkout", "Checkout"], ["poster", "Video poster"]];
  function mItemHTML(it, i) {
    let thumb;
    if (it.kind === "youtube") thumb = `<span class="yt">${IC.play}</span>`;
    else if (it.kind === "video") thumb = it.url && !it._uploading ? `<video src="${it.url}" muted></video>` : IC.play;
    else thumb = it.url ? `<img src="${it.url}" alt="" onerror="this.replaceWith(document.createTextNode('🖼'))">` : IC.img;
    const typeLabel = it._label || (it.kind === "youtube" ? "YouTube" : it.kind === "video" ? "Video" : "Image");
    const roleSuffix = (it.name && it._roleLabel) ? ` <span class="mitem__role">· ${esc(it._roleLabel)}</span>` : "";
    let controls;
    if (it.kind === "image") {
      const mp = find(mProductId), everPub = !!(mp && mp.published_at != null);
      controls = `<div class="roleboxes">${ROLE_DEFS.map(([k, lbl]) => {
        // §5.4e — checkout_image freezes at first publish: show the checkout role LOCKED (lock chip, no
        // data-role so it can't toggle), never removed. share/gallery/hero/poster stay editable.
        if (k === "checkout" && everPub)
          return `<label class="rolebox is-locked ${it.roles.has(k) ? "on" : ""}" title="Locks after first publish" aria-disabled="true">${esc(lbl)} ${IC.lock}</label>`;
        return `<label class="rolebox ${it.roles.has(k) ? "on" : ""}" data-role="${k}" data-i="${i}">${esc(lbl)}<input type="checkbox" ${it.roles.has(k) ? "checked" : ""}></label>`;
      }).join("")}</div>`;
    } else if (it.kind === "video") {
      controls = `<div class="roleboxes">${[["loop", "Loop"], ["mute", "Mute"], ["controls", "Show controls"], ["autoplay", "Autoplay"]].map(([k, lbl]) =>
        `<label class="rolebox ${it[k] ? "on" : ""}" data-vopt="${k}" data-i="${i}">${esc(lbl)}<input type="checkbox" ${it[k] ? "checked" : ""}></label>`).join("")}</div>`;
    } else {
      controls = `<div class="faint" style="font-size:var(--t-xs)">Embedded YouTube — preview loads below in the real build.</div>`;
    }
    const altMissing = !String(it.alt || "").trim();
    return `<div class="mitem ${it._new ? "is-new" : ""}${it.errored ? " mitem--errored" : ""}" data-i="${i}">
      <div class="mitem__thumb" style="width:${thumbW(it._aspect)}px">${it._uploading ? `<div class="mprog" style="width:100%"><i></i></div>` : thumb}</div>
      <div class="mitem__body">
        <div class="mitem__type"><span class="dot"></span>${esc(typeLabel)}${roleSuffix}</div>
        <div class="field" ${altMissing ? 'data-ring="red"' : 'data-ring="green"'} style="gap:3px">
          <input class="input" data-alt="${i}" value="${esc(it.alt || "")}" placeholder="Alt text (required)">
        </div>
        ${controls}
      </div>
      <button class="iconbtn iconbtn--danger mitem__del" data-del="${i}" aria-label="Remove">${IC.trash}</button>
    </div>`;
  }
  function wireMedia() {
    const body = document.getElementById("mediaBody");
    const dz = body.querySelector("#dropzone");
    body.querySelector("#pickBtn").onclick = () => document.getElementById("fileInput").click();
    dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
    dz.addEventListener("drop", (e) => { e.preventDefault(); dz.classList.remove("drag"); handleFiles(e.dataTransfer.files); });
    body.querySelector("#urlAdd").onclick = addUrl;
    body.querySelector("#urlInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } });
    body.querySelectorAll("[data-alt]").forEach((inp) => inp.addEventListener("input", () => {
      mItems[+inp.dataset.alt].alt = inp.value;
      const fld = inp.closest(".field"); if (fld) fld.setAttribute("data-ring", inp.value.trim() ? "green" : "red");
      updateFallback();
    }));
    body.querySelectorAll("[data-role]").forEach((el) => el.addEventListener("click", (e) => { e.preventDefault(); toggleRole(+el.dataset.i, el.dataset.role); }));
    body.querySelectorAll("[data-vopt]").forEach((el) => el.addEventListener("click", (e) => { e.preventDefault(); const it = mItems[+el.dataset.i]; it[el.dataset.vopt] = !it[el.dataset.vopt]; renderMedia(); }));
    body.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { mItems.splice(+b.dataset.del, 1); renderMedia(); }));
  }
  async function addUrl() {
    const inp = document.getElementById("urlInput"), url = inp.value.trim(); if (!url) return;
    const kind = detectKind(url);
    if (kind === "youtube") {
      // §5.2 — YouTube never hits /api/upload; it lives in mItems and becomes {type:'youtube',url,alt} on Apply.
      if (!/^(https?:\/\/)?(www\.)?(youtu\.be\/|youtube\.com\/watch)/i.test(url)) { P.toast("That doesn't look like a YouTube link", { kind: "danger" }); return; }
      const it = { kind: "youtube", url, alt: "", _new: true, roles: new Set() };
      mItems.unshift(it); inp.value = ""; renderMedia(); clearNewFlag();
      return;
    }
    // M-2 — image/.mp4/Drive/Dropbox link: preview by URL now, UPLOAD ON APPLY (no POST on add). Its role
    // starts empty of applied uploads (openedRoles empty) so applyMedia's diff uploads whatever role it ends on.
    const isVideo = kind === "video";
    const it = { kind: isVideo ? "video" : "image", url, alt: "", _new: true, roles: new Set(isVideo ? [] : ["gallery"]) };
    if (isVideo) Object.assign(it, { loop: true, mute: true, controls: false, autoplay: true });
    it.openedRoles = new Set();
    measureAspect(it);
    mItems.unshift(it); inp.value = ""; renderMedia(); clearNewFlag();
  }
  function clearNewFlag() { setTimeout(() => { mItems.forEach((m) => { m._new = false; }); }, 2500); }
  // M-3 — learn each item's true aspect ratio (from the local File or the url) so its preview isn't forced
  // square. Debounced re-render so a burst of drops repaints once, and never while an input is focused.
  let _measureTimer = null;
  function scheduleMediaRerender() {
    clearTimeout(_measureTimer);
    _measureTimer = setTimeout(() => {
      const m = document.getElementById("mediaModal");
      if (!m || !m.classList.contains("is-on")) return;
      if (m.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName || "")) return;
      renderMedia();
    }, 150);
  }
  function measureAspect(it) {
    try {
      if (it.kind === "image") {
        const img = new Image();
        img.onload = () => { if (img.naturalWidth && img.naturalHeight) { it._aspect = img.naturalWidth / img.naturalHeight; scheduleMediaRerender(); } };
        img.src = it.url;
      } else if (it.kind === "video") {
        const v = document.createElement("video");
        v.onloadedmetadata = () => { if (v.videoWidth && v.videoHeight) { it._aspect = v.videoWidth / v.videoHeight; scheduleMediaRerender(); } };
        v.src = it.url;
      }
    } catch (_) { /* preview stays square if the browser can't measure it */ }
  }
  function handleFiles(files) {
    // M-2 — local preview ONLY: hold the File, show it via createObjectURL, do NOT POST /api/upload here.
    // Uploads fire once per assigned role on Apply (see applyMedia). This is what kills the on-drop "3–6×
    // violent loading bars" (uploads racing before roles are chosen) AND defers the draft persist to Apply.
    // M-4 — capture file.name for the label. M-3 — measure the natural aspect for a true-ratio preview.
    const list = [...files];
    if (!list.length) return;
    list.forEach((file) => {
      const isVideo = /video\//.test(file.type);
      const it = {
        kind: isVideo ? "video" : "image",
        url: URL.createObjectURL(file), file: file, _local: true, name: file.name,
        alt: "", _new: true, roles: new Set(isVideo ? [] : ["gallery"]),
      };
      if (isVideo) Object.assign(it, { loop: true, mute: true, controls: false, autoplay: true });
      it.openedRoles = new Set(); // fresh — Apply uploads every assigned role
      measureAspect(it);
      mItems.unshift(it);
    });
    renderMedia(); clearNewFlag();
  }
  // role logic: one hero; hero≠gallery; share/checkout/poster combine freely
  function toggleRole(i, role) {
    const it = mItems[i]; if (!it.roles) return;
    // §5.4e — checkout_image is frozen after first publish; the UI locks it, this is the belt-and-braces guard.
    if (role === "checkout") { const mp = find(mProductId); if (mp && mp.published_at != null) return; }
    const has = it.roles.has(role);
    if (role === "hero") {
      if (!has) { mItems.forEach((m) => m.roles && m.roles.delete("hero")); it.roles.add("hero"); it.roles.delete("gallery"); }
      else it.roles.delete("hero");
    } else if (role === "gallery") {
      if (!has) { if (it.roles.has("hero")) { P.toast("This is the hero — it can't also be a gallery image. Make it gallery?", {}); it.roles.delete("hero"); it.roles.add("gallery"); } else it.roles.add("gallery"); }
      else it.roles.delete("gallery");
    } else { has ? it.roles.delete(role) : it.roles.add(role); }
    renderMedia();
  }
  function updateFallback() {
    const cov = coverage(), note = document.getElementById("mediaFallback");
    // v4.0 — Share is REQUIRED to publish (no hero fallback); Checkout still softly reuses the hero.
    const parts = [];
    if (!cov.share) parts.push(`<span class="x">×</span> Thumbnail image required to publish — give any image the Thumbnail role`);
    if (!cov.checkout) parts.push(`<span class="faint">No checkout image — the hero will be reused</span>`);
    note.innerHTML = parts.join("<br>");
  }
  // M-5 — Apply feedback. Toggle a "thinking" state: disabled + spinner button, plus a modal overlay with
  // a live message, so the maker isn't left staring at a frozen modal while uploads + the persist run.
  function setApplyBusy(on, msg) {
    const btn = document.getElementById("mediaApply");
    if (btn) { btn.disabled = on; btn.textContent = on ? "Applying…" : "Apply"; btn.classList.toggle("is-busy", on); }
    const card = document.querySelector("#mediaModal .modal__card"); if (!card) return;
    let ov = card.querySelector(".modal__busy");
    if (on) {
      if (!ov) { ov = document.createElement("div"); ov.className = "modal__busy"; ov.innerHTML = `<span class="spin" aria-hidden="true"></span><span class="modal__busy-msg"></span>`; card.appendChild(ov); }
      ov.querySelector(".modal__busy-msg").textContent = msg || "Working…";
    } else if (ov) { ov.remove(); }
  }
  async function applyMedia() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // avoid iOS focus-zoom lingering
    const p = find(mProductId);
    const missingAlt = mItems.some((m) => !String(m.alt || "").trim());
    if (missingAlt) { P.toast("Every piece of media needs alt text", { kind: "danger" }); return; }
    if (mItems.some((m) => m._uploading)) { P.toast("Hold on — media is still uploading", { kind: "danger" }); return; }
    // M-5 — show the busy state up front; ensureSlug may POST a brand-new draft, then uploads run below.
    setApplyBusy(true, "Saving the draft…");
    // persist-first: a brand-new draft needs a real id + slug before the media PUT / any re-role upload.
    const slug = await ensureSlug(p, mProductId);
    if (!slug) { setApplyBusy(false); return; }
    const everPublished = p.published_at != null;
    // M-2 — a held LOCAL file uploads multipart (the File); an existing/pasted item re-roles by-link (url).
    // M-2 — a held LOCAL file uploads multipart (the File → each role crops from the ORIGINAL bytes, never a
    // re-crop of another role's derivative); an existing/pasted item re-roles by-link (url).
    const uploadRole = (it, role) => uploadMedia(it.file ? { file: it.file, slug, role, isVideo: false } : { url: it.url, slug, role, isVideo: false });

    // §5.4c.i — Apply-time re-role DIFF, now PARALLEL so a 12-image batch uploads concurrently instead of
    // one-at-a-time. Three phases: (A) PLAN every item's roles up front — gallery/video NNs pre-assigned in
    // mItems order (numbering can't wait on prior uploads finishing); (B) UPLOAD through a bounded pool across
    // items, keeping each item's OWN roles in sequence (preserves by-link it.url reassignment + the crop-from-
    // original invariant: hero=4:5, thumbnail=16:9, checkout=1:1 each come from it.file, never from each other);
    // (C) ASSEMBLE in mItems order so hero pins to images[0] and "last share wins" hold exactly as before.
    const baselineUrls = (p.images || []).map((im) => im.url);        // for gallery-NN scans
    const knownImgUrls = baselineUrls.concat(mItems.filter((m) => m.kind === "image").map((m) => m.url).filter(Boolean));
    const nextImages = [];        // gallery entries, in mItems order
    let heroEntry = null;         // hero pinned to images[0]
    let seoUrl = p.seo_thumbnail; // share column — preserve unless the maker adds/removes share
    let checkoutUrl = p.checkout_image;
    let failedRole = null;        // name of a role whose upload failed (for the toast)

    // --- (A) PLAN — added/removed diff per item; reserve gallery-NN (and video-NN) deterministically now ---
    const imageItems = mItems.filter((m) => m.kind === "image" && m.roles && m.roles.size > 0); // zero-role images dropped
    const galReserved = []; // reserved gallery-NN role-urls so each planned item sees the NNs taken so far
    const plans = imageItems.map((it) => {
      const opened = it.openedRoles || new Set();
      const added = [...it.roles].filter((r) => !opened.has(r));
      const removed = [...opened].filter((r) => !it.roles.has(r));
      const plan = { it, arrUrl: it.url, isHero: false, isGallery: false, arrayRole: null,
        share: false, dropShare: false, checkout: false, dropCheckout: false, seoUrl: null, checkoutUrl: null, failed: false };
      // array role (hero | gallery): re-upload iff the target role's filename differs from the current one
      const targetArray = it.roles.has("hero") ? "hero" : it.roles.has("gallery") ? "gallery" : null;
      if (targetArray === "hero") {
        plan.isHero = true;
        if (roleOfUrl(it.url) !== "hero") plan.arrayRole = "hero";
      } else if (targetArray === "gallery") {
        plan.isGallery = true;
        if (roleOfUrl(it.url) !== "gallery") {
          plan.arrayRole = nextNumberedRole("gallery", knownImgUrls.concat(galReserved)); // sees NNs reserved so far
          galReserved.push("/" + plan.arrayRole + "-x.webp");
        }
      }
      // share (seo_thumbnail): re-upload only when newly added; removed → blank so the storefront reuses the hero
      if (it.roles.has("share")) { if (added.includes("share")) plan.share = true; }
      else if (removed.includes("share")) plan.dropShare = true;
      // checkout (checkout_image): FROZEN after first publish (§5.4e) — never re-upload / clear on an ever-published piece
      if (it.roles.has("checkout")) { if (added.includes("checkout") && !everPublished) plan.checkout = true; }
      else if (removed.includes("checkout") && !everPublished) plan.dropCheckout = true;
      return plan;
    });
    const localVideos = mItems.filter((m) => m.kind === "video" && m.file);
    const vidScan = (p.media || []).map((m) => m.url).filter(Boolean)
      .concat(mItems.filter((m) => m.kind === "video" && m.url && !m.file).map((m) => m.url));
    const vidReserved = [];
    localVideos.forEach((v) => { v._uprole = nextNumberedRole("video", vidScan.concat(vidReserved)); vidReserved.push("/" + v._uprole + "-x.webp"); });

    // --- (B) UPLOAD — bounded-concurrency pool across items; each item's roles stay in sequence ---
    const total = plans.reduce((n, pl) => n + (pl.arrayRole ? 1 : 0) + (pl.share ? 1 : 0) + (pl.checkout ? 1 : 0), 0) + localVideos.length;
    let done = 0;
    const tick = () => { done++; setApplyBusy(true, `Uploading ${Math.min(done, total)} of ${total}…`); };
    const runPool = async (items, worker, limit) => {
      let i = 0;
      await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (i < items.length) { const idx = i++; await worker(items[idx]); }
      }));
    };
    const imageJob = async (plan) => {
      const it = plan.it;
      if (plan.arrayRole) {
        try { plan.arrUrl = (await uploadRole(it, plan.arrayRole)).url; it.url = plan.arrUrl; tick(); }
        catch (err) { plan.failed = true; failedRole = failedRole || (plan.isHero ? "hero" : "gallery"); return; }
      }
      if (plan.share) {
        try { plan.seoUrl = (await uploadRole(it, "seo_thumbnail")).url; tick(); }
        catch (err) { plan.failed = true; failedRole = failedRole || "thumbnail"; return; }
      }
      if (plan.checkout) {
        try { plan.checkoutUrl = (await uploadRole(it, "checkout_image")).url; tick(); }
        catch (err) { plan.failed = true; failedRole = failedRole || "checkout"; return; }
      }
    };
    const videoJob = async (v) => {
      try { v.url = (await uploadMedia({ file: v.file, slug, role: v._uprole, isVideo: true })).url; delete v.file; v._local = false; tick(); }
      catch (err) { v._viderror = true; failedRole = failedRole || "video"; }
    };
    setApplyBusy(true, total ? `Uploading 0 of ${total}…` : "Saving media…");
    await Promise.all([
      runPool(plans.filter((pl) => pl.arrayRole || pl.share || pl.checkout), imageJob, 5),
      runPool(localVideos, videoJob, 5),
    ]);

    // --- (C) ASSEMBLE — in mItems order (hero pins first, last-share-wins) + per-item baseline bookkeeping ---
    for (const plan of plans) {
      const it = plan.it;
      if (plan.isHero) heroEntry = { url: plan.arrUrl, alt: it.alt };        // on failure arrUrl stays the old url
      else if (plan.isGallery) nextImages.push({ url: plan.arrUrl, alt: it.alt });
      if (plan.share && !plan.failed) seoUrl = plan.seoUrl;
      else if (plan.dropShare) seoUrl = ""; // dropped → blank so the storefront auto-reuses the hero
      if (!everPublished) {
        if (plan.checkout && !plan.failed) checkoutUrl = plan.checkoutUrl;
        else if (plan.dropCheckout) checkoutUrl = null;
      }
      // §5.4c.i idempotency: a FULLY-applied item advances its baseline so a retry re-runs ONLY what's left; a
      // failed item keeps its File + openedRoles + is flagged errored so the next Apply picks up where it stopped.
      if (plan.failed) { it.errored = true; }
      else { it.openedRoles = new Set(it.roles); it.errored = false; delete it.file; it._local = false; } // M-2 — local File consumed once its role(s) uploaded
    }
    const anyFailed = plans.some((pl) => pl.failed) || localVideos.some((v) => v._viderror);

    // rebuild images (hero pinned first); honors deletes + reorder (mItems order) + re-roles
    p.images = heroEntry ? [heroEntry, ...nextImages] : nextImages.slice();
    // FIX #7 — track the hero unconditionally; `|| ` left thumbnail stuck on the OLD hero while thumbnail_alt updated.
    if (heroEntry) { p.thumbnail = heroEntry.url; p.thumbnail_alt = heroEntry.alt; }
    p.seo_thumbnail = seoUrl;
    if (!everPublished) p.checkout_image = checkoutUrl;
    // §5.2c — emit the exact keys the storefront reads: rename mute→muted, add poster; YouTube stays {type,url,alt}.
    // A still-local (failed/skipped) video is EXCLUDED so a blob: URL never persists — it stays in mItems for retry.
    p.media = mItems.filter((m) => (m.kind === "video" && !m.file) || m.kind === "youtube").map((m) =>
      m.kind === "youtube"
        ? { type: "youtube", url: m.url, alt: m.alt }
        : { type: "video", url: m.url, alt: m.alt, loop: !!m.loop, autoplay: !!m.autoplay, controls: !!m.controls, muted: !!m.mute, ...(m.poster ? { poster: m.poster } : {}) });
    // §5.4d — one poster per product: an explicitly poster-checked image OVERRIDES every video's poster.
    // (With FIX #5 each video now round-trips its own md.poster, so a "fill only when missing" rule would
    // make the poster unchangeable; none-checked → the carried posters are preserved as-is above.)
    const posterItem = mItems.find((m) => m.kind === "image" && m.roles && m.roles.has("poster"));
    if (posterItem) p.media.forEach((v) => { if (v.type === "video") v.poster = posterItem.url; });

    // terminal persist — DISJOINT from autosave's editorPayload (media/images/thumbnail/*_image are omitted
    // there). On an ever-published piece, EXCLUDE checkout_image (§5.4e freeze); images/media/seo_thumbnail
    // stage into draft server-side. Fire this EVEN on a partial upload failure so succeeded R2 files persist.
    const patch = { images: p.images, media: p.media, thumbnail: p.thumbnail, thumbnail_alt: p.thumbnail_alt, seo_thumbnail: p.seo_thumbnail };
    if (!everPublished) patch.checkout_image = p.checkout_image;
    try {
      reconcile(p, await apiUpdate(p.id, patch), mProductId);
    } catch (err) {
      setApplyBusy(false);
      P.toast(err.message, { kind: "danger" });
      renderMedia(); // keep the modal open so nothing is lost; the maker can retry Apply
      return;
    }
    if (anyFailed) {
      // §5.4c.i partial-failure recovery: partial state IS persisted above (no orphaned R2 uploads). Keep the
      // modal open, show the errored item, and toast the role that failed so retry re-runs only what's left.
      setApplyBusy(false);
      renderMedia();
      P.toast("Couldn't set " + (failedRole || "media") + " — try Apply again.", { kind: "danger" });
      return;
    }
    setApplyBusy(false);
    closeMedia(); rerenderEditor(mProductId); P.toast("Media updated", { kind: "live" });
  }

  /* ---------- close-on-outside-click (desktop accordion autosave) ---------- */
  document.addEventListener("click", (e) => {
    if (openId == null || window.matchMedia("(max-width:859px)").matches) return;
    if (document.getElementById("mediaModal").classList.contains("is-on")) return;
    if (e.target.closest(".modal") || e.target.closest(".schedpop")) return; // clicks inside any modal/popover never close the editor
    if (document.getElementById("stockpop")) return;
    if (e.target.closest(".rail")) return; // using the rail (collapse toggle / nav) must not close the open editor
    const row = document.querySelector(".prow.is-open"), host = document.querySelector(`[data-host="${openId}"]`);
    if (row && (row.contains(e.target) || (host && host.contains(e.target)))) return;
    if (e.target.closest(".prow")) return; // clicking another row handled by its own toggle
    closeEditor();
  });

  /* ---------- create a blank draft (GAP #1) ---------- */
  function newId() { return "new-" + Date.now().toString(16) + "-" + Math.random().toString(16).slice(2, 8); }
  function createDraft() {
    const id = newId();
    // blank one-of-a-kind draft — shape matches data.js; SKU is generated on create
    // (never editable, per the SKU field), quantity defaults to 1 for a single piece.
    const p = {
      id, sku: "EVE-" + id.slice(4, 12), slug: null,
      title: "", headline: "", story_card: "", description: "",
      features: [], materials: [], care_instructions: [], shipping_details: [],
      price: 0, quantity: 1, available: false, featured: false,
      product_type: "miniature", series: null,
      dimensions: "", weight: "", power_supply: "", artist_note: "",
      images: [], thumbnail: "", thumbnail_alt: "",
      media: [], seo_title: "", seo_description: "", seo_thumbnail: "",
      checkout_name: "", checkout_description: "", checkout_image: "",
      is_published: false, published_at: null, draft: null, preview_token: null,
      archived_at: null, created_at: new Date().toISOString(), _previewed: false,
    };
    products.unshift(p);           // newest-first: lands at the top of the list
    tab = "drafts"; query = ""; page = 1;
    const search = document.getElementById("search"); if (search) search.value = "";
    openId = id;
    render();                      // opens the accordion editor on desktop (openId === id)
    if (window.matchMedia("(max-width:859px)").matches) openSheet(id); // full-screen sheet on mobile
    else { const row = document.querySelector(".prow.is-open"); if (row) row.scrollIntoView({ block: "nearest" }); }
    P.toast("New draft started — fill in the details, then preview and publish");
  }

  /* ---------- top controls ---------- */
  document.getElementById("search").addEventListener("input", (e) => { query = e.target.value; page = 1; render(); });
  document.getElementById("newBtn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation(); // don't bubble to the click-outside-to-close listener (would slam the new editor shut)
    createDraft();
  });
  document.getElementById("fileInput").addEventListener("change", (e) => { handleFiles(e.target.files); e.target.value = ""; });

  // v4.0 cross-tab publish: the storefront preview tab (product.js), when it publishes from the
  // dashboard child window, postMessages back here. REFETCH so our model is fresh — this is what stops a
  // later autosave from PUTting a stale available:false and silently un-publishing the just-published
  // piece — then collapse the editor and jump to Live so the maker sees the new piece go green.
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin) return;                     // same-origin only
    if (!e.data || e.data.type !== "everlastings:published") return;
    openId = null; tab = "live"; query = ""; page = 1;
    const search = document.getElementById("search"); if (search) search.value = "";
    apiGet()
      .then((rows) => { products = rows; render(); P.toast("Published · live now", { kind: "live" }); })
      .catch((err) => { render(); P.toast(err.message, { kind: "danger" }); });
  });

  // GAP #7: sortable column headers (desktop) + mobile sort select — share one sort state
  document.querySelectorAll(".listhead .colsort").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.sort;
    if (sortKey !== k) { sortKey = k; sortDir = "asc"; }
    else if (sortDir === "asc") { sortDir = "desc"; }
    else { sortKey = "created"; sortDir = "desc"; } // third click returns to natural order
    page = 1; render();
  }));
  const sortSel = document.getElementById("sortSelect");
  if (sortSel) sortSel.addEventListener("change", (e) => { const parts = e.target.value.split(":"); sortKey = parts[0]; sortDir = parts[1]; page = 1; render(); });

  document.getElementById("mediaClose").onclick = closeMedia;
  document.getElementById("mediaScrim").onclick = closeMedia;
  document.getElementById("mediaApply").onclick = applyMedia;
  window.addEventListener("resize", positionPuck);

  PORTAL.boot({ requireSession: true }).then(function (ok) {
    if (!ok) return;                 // signed out → boot() already redirected to /admin/account
    // Orders nav badge: paint the shared live unfulfilled count onto this page's
    // static rail + tab bar (GAPS.md #6). No hardcoded number lives in the markup.
    if (P.setOrdersBadge) P.setOrdersBadge();

    // env indicator: show only in test; hide entirely on Live / prod
    (function () {
      const env = P.env();
      const chip = document.getElementById("envChip"), strip = document.getElementById("envStrip");
      if (env.isTest) { P.applyEnvChip(chip); P.applyEnvChip(strip); }
      else { if (chip) chip.style.display = "none"; if (strip) strip.style.display = "none"; }
    })();

    // collapsible desktop rail (persisted)
    (function () {
      const app = document.querySelector(".app"), toggle = document.getElementById("railToggle");
      if (localStorage.getItem("portalRailCollapsed") === "1") app.classList.add("rail-collapsed");
      if (toggle) toggle.addEventListener("click", () => {
        const c = app.classList.toggle("rail-collapsed");
        localStorage.setItem("portalRailCollapsed", c ? "1" : "0");
        toggle.setAttribute("aria-label", c ? "Expand menu" : "Collapse menu");
        toggle.title = c ? "Expand menu" : "Collapse menu";
      });
    })();

    // DESIGN §A — the static rail's View Site link points at the CURRENT environment's storefront
    // (a Test preview → the preview storefront, not hardcoded prod).
    const viewSite = document.querySelector(".rail__foot");
    if (viewSite) viewSite.href = P.siteUrl();

    // Real catalog: GET /api/products replaces the D.products mock, then paint.
    apiGet()
      .then(function (rows) { products = rows; render(); })
      .catch(function (err) { P.toast(err.message, { kind: "danger" }); render(); });

    // WS8 §8.3b — light the Orders nav blink + badge from the real signal (post-boot: authHeader() is set).
    if (P.refreshOrdersSignal) P.refreshOrdersSignal();
  }).catch(function (err) { PORTAL.toast(err.message, { kind: "danger" }); });
})();
