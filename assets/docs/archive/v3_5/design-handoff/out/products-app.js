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
  let products = D.products.map((p) => ({ ...p }));
  let tab = "live", query = "", openId = null;
  const unseenOrders = 2; // drives the Sold-tab + Orders-nav blink (no data source yet — see INTEGRATION.md)

  /* ---------- state model (Sean v1: Available OFF on a live piece → Draft) ---------- */
  function computeState(p) {
    if (p.archived_at) return "archived";        // tab only
    if (!p.is_published) return "draft";          // YELLOW
    if (p.draft) return "edits";                  // ORANGE (staged, needs publish)
    if (p.quantity === 0) return "sold";          // BLUE (out of stock from a sale) — tab
    return "live";                                // GREEN
  }
  const STATE_WORD = { live: "Live in the shop", edits: "Edits waiting to publish", draft: "Draft — hidden from the shop", sold: "Sold — out of stock", archived: "Archived" };

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
    return { ok: miss.length === 0, missing: miss };
  }

  /* ---------- icons ---------- */
  const IC = {
    img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
    archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>',
    unarchive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h18"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M12 18v-6m0 0-2.5 2.5M12 12l2.5 2.5"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M21 3 10 14"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
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
      `<button class="seg__chip" role="tab" data-tab="${t.id}" aria-selected="${t.id === tab}" ${t.id === "sold" && unseenOrders ? "data-alert" : ""}>
        <span class="dot dot--${t.dot}"></span>${t.label} <span class="count">${c[t.id]}</span></button>`).join("");
    seg.querySelectorAll(".seg__chip").forEach((chip) => chip.addEventListener("click", () => { tab = chip.dataset.tab; openId = null; render(); }));
    positionPuck();
  }
  function positionPuck() {
    const seg = document.getElementById("tabs"), a = seg.querySelector('[aria-selected="true"]'), puck = seg.querySelector(".seg__puck");
    if (a && puck) { puck.style.width = a.offsetWidth + "px"; puck.style.transform = `translateX(${a.offsetLeft - 4}px)`; }
  }

  /* ---------- list ---------- */
  function visible() {
    const q = query.trim().toLowerCase();
    return products.filter((p) => inTab(p, tab)).filter((p) => !q || (p.title || "").toLowerCase().includes(q) || (p.slug || "").toLowerCase().includes(q));
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
          <button class="iconbtn" data-preview="${p.id}" title="Preview" aria-label="Preview">${IC.eye}</button>
          <button class="iconbtn ${archived ? "" : "iconbtn--danger"}" data-archive="${p.id}" title="${archived ? "Resurface" : "Archive"}" aria-label="${archived ? "Resurface" : "Archive"}">${archived ? IC.unarchive : IC.archive}</button>
        </span>
      </span>

      <!-- mobile control strip: labeled toggles + actions -->
      <span class="prow__ctrls">
        ${labeledToggle("avail", p.id, p.available, archived, "Available")}
        ${labeledToggle("feature", p.id, p.featured, archived, "Featured")}
        <span class="spacer"></span>
        <button class="iconbtn" data-preview="${p.id}" title="Preview" aria-label="Preview">${IC.eye}</button>
        <button class="iconbtn ${archived ? "" : "iconbtn--danger"}" data-archive="${p.id}" title="${archived ? "Resurface" : "Archive"}" aria-label="${archived ? "Resurface" : "Archive"}">${archived ? IC.unarchive : IC.archive}</button>
      </span>
    </div>
    <div class="editor-host" data-host="${p.id}">${openId === p.id ? editorHTML(p) : ""}</div>`;
  }
  function render() {
    renderTabs();
    const list = document.getElementById("list"), rows = visible();
    if (!rows.length) { list.innerHTML = emptyHTML(); return; }
    list.innerHTML = rows.map(rowHTML).join("");
    bindRows();
    if (openId && document.querySelector(`[data-host="${openId}"] .editor`)) { wireEditor(document.querySelector(`[data-host="${openId}"]`), openId); P.enhance(document.querySelector(`[data-host="${openId}"]`)); }
  }
  function emptyHTML() {
    if (query.trim()) return `<div class="empty">${IC.img}<h3>Nothing matches “${esc(query)}”</h3><p>Try a different name or slug, or clear the search.</p></div>`;
    if (tab !== "all" && !products.filter((p) => inTab(p, tab)).length) {
      const n = { drafts: "drafts", sold: "sold products", archived: "archived products", live: "live products" };
      return `<div class="empty">${IC.box}<h3>Nothing in ${n[tab] || tab}</h3><p>Products show up here once they reach this state.</p></div>`;
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
  }
  function toggleOpen(id) {
    if (window.matchMedia("(max-width:859px)").matches) { openSheet(id); return; }
    if (openId === id) { closeEditor(); return; }
    openId = id; render();
    const row = document.querySelector(`.prow.is-open`);
    if (row) row.scrollIntoView({ block: "nearest" });
  }
  function closeEditor() { if (openId != null) { autosave(openId); openId = null; render(); } }

  /* optimistic-safe commerce edits */
  function commitPrice(id, val, inp) {
    const p = find(id), cents = Math.round(parseFloat(String(val).replace(/[^0-9.]/g, "")) * 100);
    if (isNaN(cents) || cents < 0 || cents === p.price) { inp.value = (p.price / 100).toFixed(2); return; }
    p.price = cents; inp.value = (cents / 100).toFixed(2);
    P.toast("Price saved · live now — " + money(cents), { kind: "live" });
  }
  function commitQty(id, val, inp) {
    const p = find(id), q = parseInt(String(val).replace(/[^0-9]/g, ""), 10);
    if (isNaN(q) || q === p.quantity) { inp.value = p.quantity; return; }
    p.quantity = Math.max(0, q); inp.value = p.quantity;
    P.toast("Quantity saved · live now — " + p.quantity + " in stock", { kind: "live" });
    render();
  }
  // Available OFF (live piece) → Draft; ON (draft) → republish (prompt stock if 0)
  function commitAvail(id, t) {
    const p = find(id);
    if (t.checked) {
      if (p.quantity === 0) { t.checked = false; promptStock(p, t); return; }
      const wasDraft = !p.is_published;
      p.available = true; p.is_published = true;
      P.toast(wasDraft ? "Published · live now" : "Back in the shop · live now", { kind: "live" });
      syncToggles(id, "avail", true); render();
    } else {
      // turning off a live piece makes it a DRAFT (hidden), not "sold"
      p.available = false; p.is_published = false;
      const undo = () => { p.available = true; p.is_published = true; render(); };
      P.toast("Moved to Drafts — hidden from the shop", { undo });
      render();
    }
  }
  function commitFeature(id, t) { const p = find(id); p.featured = t.checked; syncToggles(id, "feature", t.checked); P.toast(p.featured ? "Featured on the homepage" : "No longer featured"); }
  function syncToggles(id, kind, on) { document.querySelectorAll(`[data-${kind === "feature" ? "feature" : "avail"}="${id}"]`).forEach((o) => (o.checked = on)); }
  function commitArchive(id) {
    const p = find(id), was = !!p.archived_at;
    p.archived_at = was ? null : new Date().toISOString();
    if (openId === id) openId = null;
    render();
    P.toast(was ? "Resurfaced — back in your shop" : "Archived — anything can be revived", { undo: () => { p.archived_at = was ? new Date().toISOString() : null; render(); } });
  }
  function openPreview(id) { const p = find(id); P.toast("Opening preview — " + (p.title || "this product") + " (capability URL, no login)"); }

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
    pop.querySelector("#stockok").onclick = () => { p.quantity = Math.max(1, parseInt(qty.value, 10) || 1); p.available = true; p.is_published = true; closeStock(); render(); P.toast(`${p.quantity} in stock · now in the shop · live now`, { kind: "live" }); };
    pop.querySelector("#stockcancel").onclick = closeStock;
    setTimeout(() => document.addEventListener("click", outsideStock), 0);
  }
  function outsideStock(e) { const pop = document.getElementById("stockpop"); if (pop && !pop.contains(e.target)) closeStock(); }
  function closeStock() { const pop = document.getElementById("stockpop"); if (pop) pop.remove(); document.removeEventListener("click", outsideStock); }

  /* ============================ EDITOR ============================ */
  function tipI(t) { return `<span class="tip"><button type="button" class="tip__btn" aria-label="More info">i</button><span class="tip__pop">${esc(t)}</span></span>`; }
  function lockChip() { return `<span class="tip"><button type="button" class="tip__btn tip__btn--lock" aria-label="Locks after first publish">${IC.lock}</button><span class="tip__pop">Locks after first publish</span></span>`; }

  function f(o) {
    const ring = o.ring ? ` data-ring="${o.ring}"` : "";
    const rec = o.rec ? ` data-rec="${o.rec}"` : "";
    const span = o.span2 ? " ed-span2" : "";
    const lock = o.locked ? lockChip() : "";
    const fld = o.field ? ` data-field="${o.field}"` : "";
    let ctrl;
    if (o.type === "textarea") ctrl = `<textarea class="textarea" data-autogrow${fld} ${o.locked ? "disabled" : ""} placeholder="${esc(o.ph || "")}" style="min-height:${o.minH || 92}px">${esc(o.value || "")}</textarea>`;
    else if (o.type === "price") ctrl = `<span class="price"><span class="price__sym">$</span><input class="input"${fld} inputmode="decimal" ${o.locked ? "disabled" : ""} value="${esc(o.value || "")}"></span>`;
    else if (o.type === "select") ctrl = `<span class="select-wrap"><select class="select"${fld} ${o.locked ? "disabled" : ""}>${o.options.map((op) => `<option ${op === o.value ? "selected" : ""}>${esc(op)}</option>`).join("")}</select>${IC.chev}</span>`;
    else ctrl = `<input class="input"${fld} ${o.locked ? "disabled" : ""} value="${esc(o.value || "")}" placeholder="${esc(o.ph || "")}" inputmode="${o.inputmode || "text"}">`;
    const countTop = o.rec ? '<span class="field__spacer"></span><span class="count" data-count-out></span>' : "";
    const meta = o.ctx ? `<div class="field__meta"><span class="field__ctx ${o.ctxLive ? "field__ctx--live" : ""}">${esc(o.ctx)}</span></div>` : "";
    return `<label class="field${span}"${ring}${rec}>
      <div class="field__top"><span class="field__label">${esc(o.label)}${o.req ? '<span class="req">*</span>' : ""}${lock}${o.tip ? tipI(o.tip) : ""}</span>${countTop}</div>
      ${ctrl}${meta}</label>`;
  }
  function listField(o) {
    // textarea (one per line) + live bullet preview + helper tip
    const ring = o.ring ? ` data-ring="${o.ring}"` : "";
    const items = (o.value || []).filter((x) => String(x).trim());
    return `<label class="field${o.span2 ? " ed-span2" : ""}"${ring}>
      <div class="field__top"><span class="field__label">${esc(o.label)}${o.req ? '<span class="req">*</span>' : ""}${tipI("Write one per line — each line becomes a bullet on the page.")}</span></div>
      <textarea class="textarea bullets-ta" data-list="${o.field}" data-autogrow style="min-height:90px" placeholder="One per line…">${esc(items.join("\n"))}</textarea></label>`;
  }

  function mediaSlots(p) {
    const imgs = p.images || [];
    const heroUrl = imgs[0]?.url, galleryImgs = imgs.slice(1), gn = galleryImgs.length, galOk = gn >= 5;
    const vids = p.media || [];
    const openIcon = (url) => url ? `<a class="mtile__open" href="${url}" target="_blank" rel="noopener" title="Open full asset" onclick="event.stopPropagation()">${IC.ext}</a>` : "";
    // only filled secondary media render — as uniform squares (never empty upload buttons)
    const sq = [];
    if (p.seo_thumbnail) sq.push(`<div class="msq" data-open-url="${p.seo_thumbnail}" title="Open share image in new tab"><img src="${p.seo_thumbnail}" alt="" onerror="this.remove()">${openIcon(p.seo_thumbnail)}<span class="msq__lbl">Share</span></div>`);
    if (p.checkout_image) sq.push(`<div class="msq" data-open-url="${p.checkout_image}" title="Open checkout image in new tab"><img src="${p.checkout_image}" alt="" onerror="this.remove()">${openIcon(p.checkout_image)}<span class="msq__lbl">Checkout</span></div>`);
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
        <span class="media-note">Share &amp; checkout reuse the hero unless you give them their own image.</span>
      </div>
    </div>`;
  }

  function editorHTML(p) {
    const r = readiness(p), published = p.is_published, archived = !!p.archived_at;
    const eff = (k) => (p.draft && p.draft[k] != null ? p.draft[k] : p[k]);
    const edited = (k) => p.draft && p.draft[k] != null;
    const ring = (k, req) => { const v = eff(k); const empty = Array.isArray(v) ? !v.length : !String(v || "").trim(); if (req && empty) return "red"; if (edited(k)) return "yellow"; if (req) return "green"; return edited(k) ? "yellow" : null; };
    const dm = parseDims(eff("dimensions"));
    const seriesOpts = ["Portals to Peace", "Book Nooks", "Story Lofts", "Seasonal", "Limited Edition", "— No series —"];

    return `<div class="editor">
      <div class="ed-body">
        ${archived ? `<div class="banner banner--warn" style="margin-bottom:16px">${IC.archive}<span>This product is archived — out of the shop. Resurface it to edit and relist. Nothing is ever deleted.</span></div>` : ""}
        ${p.draft ? `<div class="banner banner--warn" style="margin-bottom:16px">${IC.eye}<span>You have staged edits waiting. They go live next time you publish — the fields you changed are ringed orange.</span></div>` : ""}

        <!-- INSTANT-COMMERCE: price + quantity only; context appears on focus -->
        <div class="commerce">
          ${f({ label: "Price", req: true, tip: "Changes the shop price the moment you save it — no publish needed.", value: (p.price / 100).toFixed(2), type: "price", ring: "green", field: "price", ctx: "Applies to the shop the moment you save.", ctxLive: true })}
          ${f({ label: "Quantity", req: true, tip: "0 = sold out. Applies to the shop instantly.", value: String(p.quantity), ring: p.quantity === 0 ? "yellow" : "green", field: "quantity", inputmode: "numeric", ctx: "Applies to the shop the moment you save.", ctxLive: true })}
        </div>

        <div class="section-h">The product <span class="line"></span></div>
        <div class="ed-cols">
          <div class="ed-main">
            <div class="ed-grid">
              ${f({ label: "Title", req: true, tip: "The name shown in your shop.", value: eff("title"), span2: true, ring: ring("title", true), field: "title", rec: 60, ph: "Name this product" })}
              ${f({ label: "Headline", req: true, tip: "The one line under the title.", value: eff("headline"), span2: true, ring: ring("headline", true), field: "headline", rec: 80 })}
              ${f({ label: "Collection", tip: "Also called the series — an optional grouping in the shop.", value: p.series || "— No series —", type: "select", options: seriesOpts, field: "series" })}
              ${f({ label: "Product", req: true, tip: "The kind of product. Only ‘miniature’ is in scope today — a new type needs development.", value: p.product_type, type: "select", options: ["miniature", "printable", "storybook"], locked: published, field: "product_type" })}
            </div>
            ${f({ label: "Story card", req: true, tip: "The short story that gives the piece its world.", value: eff("story_card"), type: "textarea", span2: true, ring: ring("story_card", true), field: "story_card", rec: 220, minH: 116, ph: "Tell the little story this piece holds…" })}
            ${f({ label: "Description", req: true, tip: "Materials and the making, in plain words.", value: eff("description"), type: "textarea", span2: true, ring: ring("description", true), field: "description", rec: 320, minH: 116 })}
            ${f({ label: "Artist note", tip: "Optional — an aside in your own voice.", value: eff("artist_note"), type: "textarea", span2: true, field: "artist_note", rec: 240 })}
          </div>

          <aside class="ed-side">
            <div class="ed-card">
              <div class="ed-card__cap">Listing &amp; SEO</div>
              <div class="ed-grid">
                ${f({ label: "Slug", req: true, tip: "The shop URL handle. Auto-made from the title; edit if you like.", value: p.slug || "", locked: published, field: "slug", rec: 50, ph: "auto-from-title" })}
                ${f({ label: "SKU", tip: "Generated for you the moment a product is created. Never editable.", value: p.sku, locked: true })}
                ${f({ label: "Checkout name", tip: "What buyers see at checkout. Auto-filled from the title.", value: p.checkout_name || eff("title"), locked: published, rec: 60 })}
                ${f({ label: "SEO title", tip: "Search results & shared links. Auto-filled if left blank.", value: p.seo_title || "", field: "seo_title", rec: 60 })}
                ${f({ label: "SEO description", tip: "Search snippet. Auto-filled from the description if blank.", value: p.seo_description || "", type: "textarea", field: "seo_description", rec: 155, minH: 70 })}
                ${f({ label: "Checkout description", tip: "Shown at checkout. Auto-filled.", value: p.checkout_description || "", locked: published, rec: 90 })}
              </div>
            </div>
          </aside>
        </div>

        <div class="section-h">Details <span class="line"></span></div>
        <div class="ed-grid ed-grid--2">
          <div class="field"><div class="field__top"><span class="field__label">Dimensions<span class="req">*</span>${tipI("Width, depth, height — entered separately so the format stays consistent on the page.")}</span></div>
            <div class="dims">
              <label class="dimcell"><input class="input mono" data-field="dim_w" inputmode="decimal" value="${esc(dm.w)}" placeholder="Width" aria-label="Width"><span class="dimunit">W</span></label>
              <label class="dimcell"><input class="input mono" data-field="dim_d" inputmode="decimal" value="${esc(dm.d)}" placeholder="Depth" aria-label="Depth"><span class="dimunit">D</span></label>
              <label class="dimcell"><input class="input mono" data-field="dim_h" inputmode="decimal" value="${esc(dm.h)}" placeholder="Height" aria-label="Height"><span class="dimunit">H</span></label>
            </div></div>
          <div class="field" data-ring="${ring("weight", true)}"><div class="field__top"><span class="field__label">Weight<span class="req">*</span>${tipI("Just the number — lbs is added for you.")}</span></div>
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
          ${p.quantity === 0 || !p.available ? `<button class="btn btn--ghost btn--sm" data-relist>Relist this piece</button>` : ""}
          <button class="btn btn--ghost btn--sm" data-schedule>${p.scheduled_publish_at ? "Reschedule…" : "Schedule publish…"}</button>
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
        ${!r.ok ? `<span class="btn-why ed-actions__why">To publish, add ${listMissing(r.missing)}.</span>` : ""}
      </div>
    </div>`;
  }

  function publishBtn(p, r) {
    if (!r.ok) return `<button class="btn" disabled aria-disabled="true">${IC.check} Publish</button>`;
    if (p.draft) return `<button class="btn btn--publish-edits" data-publish>${IC.check} Publish changes</button>`;
    if (!p.is_published) return `<button class="btn btn--publish-new" data-publish>${IC.check} Publish · go live</button>`;
    return `<button class="btn" disabled aria-disabled="true">${IC.check} Published</button>`;
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
    // list fields → bullets preview + model
    scope.querySelectorAll("[data-list]").forEach((ta) => ta.addEventListener("input", () => {
      const key = ta.dataset.list, items = ta.value.split("\n").map((x) => x.trim()).filter(Boolean);
      setEff(p, key, items);
      refreshGate(scope, id);
    }));
    // lifecycle
    const disc = scope.querySelector("[data-discard]"); if (disc) disc.addEventListener("click", () => { p.draft = null; rerenderEditor(id); P.toast("Edits discarded — back to what's live"); });
    const rel = scope.querySelector("[data-relist]"); if (rel) rel.addEventListener("click", () => { if (p.quantity === 0) p.quantity = 1; p.available = true; p.is_published = true; rerenderEditor(id); P.toast("Relisted — back in your shop · live now", { kind: "live" }); });
    const sched = scope.querySelector("[data-schedule]"); if (sched) sched.addEventListener("click", (e) => openSchedule(e.currentTarget, id));
    const unsched = scope.querySelector("[data-unschedule]"); if (unsched) unsched.addEventListener("click", () => { p.scheduled_publish_at = null; rerenderEditor(id); P.toast("Schedule cleared"); });
    // actions
    const arch = scope.querySelector("[data-archive2]"); if (arch) arch.addEventListener("click", () => commitArchive(id));
    const prev = scope.querySelector("[data-ed-preview]"); if (prev) prev.addEventListener("click", () => openPreview(id));
    const save = scope.querySelector("[data-save]"); if (save) save.addEventListener("click", () => { autosave(id); P.toast("Saved", { kind: "live" }); closeAndExit(id); });
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
    const clearBtn = pop.querySelector("#schedClear"); if (clearBtn) clearBtn.onclick = () => { p.scheduled_publish_at = null; close(); rerenderEditor(id); P.toast("Schedule cleared"); };
    pop.querySelector("#schedSave").onclick = () => {
      const dv = pop.querySelector("#schedDate").value, tv = pop.querySelector("#schedTime").value || "09:00";
      if (!dv) { P.toast("Pick a date first", { kind: "danger" }); return; }
      p.scheduled_publish_at = new Date(dv + "T" + tv).toISOString();
      close(); rerenderEditor(id); P.toast("Publish scheduled for " + fmtSched(p.scheduled_publish_at), { kind: "live" });
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
        const order = [...strip.querySelectorAll(".gthumb")].map((g) => +g.dataset.gi);
        const gal = p.images.slice(1);
        const reordered = order.map((i) => gal[i]).filter(Boolean);
        p.images = [p.images[0], ...reordered];
        rerenderEditor(id);
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
    else if (["title", "headline", "description", "story_card", "artist_note", "seo_title", "seo_description"].includes(key)) setEff(p, key, val);
    else if (key === "slug" || key === "series" || key === "product_type") p[key] = val;
    // update this field's ring
    const fieldEl = el.closest(".field");
    if (fieldEl && fieldEl.hasAttribute("data-ring")) {
      const req = fieldEl.querySelector(".req"); const empty = !String(val).trim();
      fieldEl.setAttribute("data-ring", empty && req ? "red" : "green");
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
    if (!r.ok) { const s = document.createElement("span"); s.className = "btn-why ed-actions__why"; s.textContent = "To publish, add " + listMissing(r.missing) + "."; bar.appendChild(s); }
  }
  function autosave(id) { /* prototype: model already mutated live; real app PUTs here. */ }
  function rerenderEditor(id) { render(); }
  function closeAndExit(id) { openId = null; render(); const m = document.getElementById("sheet"); if (m && m.classList.contains("is-on")) closeSheet(); }
  function doPublish(id) {
    const p = find(id); p.is_published = true; p.draft = null; if (!p.published_at) p.published_at = new Date().toISOString();
    if (!p.slug && p.title) p.slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (p.quantity > 0) p.available = true;
    render(); P.toast("Published · live now", { kind: "live" });
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
    (p.images || []).forEach((im, i) => mItems.push({ kind: "image", url: im.url, alt: im.alt || "", roles: new Set(i === 0 ? ["hero"] : ["gallery"]) }));
    if (p.seo_thumbnail) { const ex = mItems.find((m) => m.url === p.seo_thumbnail); if (ex) ex.roles.add("share"); }
    if (p.checkout_image) { const ex = mItems.find((m) => m.url === p.checkout_image); if (ex) ex.roles.add("checkout"); }
    (p.media || []).forEach((md) => mItems.push({ kind: md.type === "youtube" ? "youtube" : "video", url: md.url, alt: md.alt || "", loop: md.loop !== false, mute: true, controls: md.controls !== false, autoplay: !!md.autoplay }));
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
    const ROLE_LABEL = { hero: "Hero image", share: "Share image", checkout: "Checkout image", poster: "Video poster" };
    const SHORT = { hero: "Hero", gallery: "Gallery", share: "Share", checkout: "Checkout", poster: "Video poster" };
    const ORDER = ["hero", "gallery", "share", "checkout", "poster"];
    const gal = mItems.filter((m) => m.kind === "image" && m.roles.has("gallery"));
    const unrouted = mItems.filter((m) => m.kind === "image" && m.roles.size === 0);
    const vids = mItems.filter((m) => m.kind === "video");
    const yts = mItems.filter((m) => m.kind === "youtube");
    const galTok = (m) => (gal.length > 1 ? "Gallery " + (gal.indexOf(m) + 1) : "Gallery");
    mItems.forEach((m) => {
      if (m.kind === "image") {
        const roles = ORDER.filter((r) => m.roles.has(r));
        if (roles.length === 0) { m._label = unrouted.length > 1 ? "Image " + (unrouted.length - unrouted.indexOf(m)) : "Image"; return; }
        if (roles.length === 1) {
          m._label = roles[0] === "gallery" ? (gal.length > 1 ? "Gallery image " + (gal.indexOf(m) + 1) : "Gallery image") : ROLE_LABEL[roles[0]];
          return;
        }
        // multi-role: name it after every role it fills
        const parts = roles.map((r) => (r === "gallery" ? galTok(m) : SHORT[r]));
        m._label = parts.join(", ") + " image";
      } else if (m.kind === "video") {
        m._label = vids.length > 1 ? "Video " + (vids.length - vids.indexOf(m)) : "Video";
      } else {
        m._label = yts.length > 1 ? "YouTube " + (yts.length - yts.indexOf(m)) : "YouTube";
      }
    });
  }
  const ROLE_DEFS = [["hero", "Hero"], ["gallery", "Gallery"], ["share", "Share"], ["checkout", "Checkout"], ["poster", "Video poster"]];
  function mItemHTML(it, i) {
    let thumb;
    if (it.kind === "youtube") thumb = `<span class="yt">${IC.play}</span>`;
    else if (it.kind === "video") thumb = it.url && !it._uploading ? `<video src="${it.url}" muted></video>` : IC.play;
    else thumb = it.url ? `<img src="${it.url}" alt="" onerror="this.replaceWith(document.createTextNode('🖼'))">` : IC.img;
    const typeLabel = it._label || (it.kind === "youtube" ? "YouTube" : it.kind === "video" ? "Video" : "Image");
    let controls;
    if (it.kind === "image") {
      controls = `<div class="roleboxes">${ROLE_DEFS.map(([k, lbl]) =>
        `<label class="rolebox ${it.roles.has(k) ? "on" : ""}" data-role="${k}" data-i="${i}">${esc(lbl)}<input type="checkbox" ${it.roles.has(k) ? "checked" : ""}></label>`).join("")}</div>`;
    } else if (it.kind === "video") {
      controls = `<div class="roleboxes">${[["loop", "Loop"], ["mute", "Mute"], ["controls", "Show controls"], ["autoplay", "Autoplay"]].map(([k, lbl]) =>
        `<label class="rolebox ${it[k] ? "on" : ""}" data-vopt="${k}" data-i="${i}">${esc(lbl)}<input type="checkbox" ${it[k] ? "checked" : ""}></label>`).join("")}</div>`;
    } else {
      controls = `<div class="faint" style="font-size:var(--t-xs)">Embedded YouTube — preview loads below in the real build.</div>`;
    }
    const altMissing = !String(it.alt || "").trim();
    return `<div class="mitem ${it._new ? "is-new" : ""}" data-i="${i}">
      <div class="mitem__thumb">${it._uploading ? `<div class="mprog" style="width:100%"><i></i></div>` : thumb}</div>
      <div class="mitem__body">
        <div class="mitem__type"><span class="dot"></span>${typeLabel}</div>
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
  function addUrl() {
    const inp = document.getElementById("urlInput"), url = inp.value.trim(); if (!url) return;
    const kind = detectKind(url);
    if (kind === "youtube" && !/^(https?:\/\/)?(www\.)?(youtu\.be\/|youtube\.com\/watch)/i.test(url)) { P.toast("That doesn't look like a YouTube link", { kind: "danger" }); return; }
    const it = { kind, url, alt: "", _new: true, roles: new Set() };
    if (kind === "video") Object.assign(it, { loop: true, mute: true, controls: false, autoplay: true });
    mItems.unshift(it); inp.value = ""; renderMedia(); clearNewFlag();
  }
  function clearNewFlag() { setTimeout(() => { mItems.forEach((m) => { m._new = false; }); }, 2500); }
  function handleFiles(files) {
    [...files].forEach((file) => {
      const isVideo = /video\//.test(file.type);
      const it = { kind: isVideo ? "video" : "image", url: "", alt: "", _uploading: true, _new: true, roles: new Set() };
      if (isVideo) Object.assign(it, { loop: true, mute: true, controls: false, autoplay: true });
      mItems.unshift(it); renderMedia();
      const reader = new FileReader();
      reader.onload = () => { it.url = reader.result; it._uploading = false; renderMedia(); clearNewFlag(); };
      setTimeout(() => reader.readAsDataURL(file), 350); // simulate brief upload
    });
  }
  // role logic: one hero; hero≠gallery; share/checkout/poster combine freely
  function toggleRole(i, role) {
    const it = mItems[i]; if (!it.roles) return;
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
    const bits = [];
    if (!cov.share) bits.push("share");
    if (!cov.checkout) bits.push("checkout");
    note.innerHTML = bits.length ? `<span class="x">×</span> No ${bits.join(" / ")} image — the hero will be reused.` : "";
  }
  function applyMedia() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // avoid iOS focus-zoom lingering
    const p = find(mProductId);
    const missingAlt = mItems.some((m) => !String(m.alt || "").trim());
    if (missingAlt) { P.toast("Every piece of media needs alt text", { kind: "danger" }); return; }
    const hero = mItems.find((m) => m.kind === "image" && m.roles.has("hero"));
    const gallery = mItems.filter((m) => m.kind === "image" && m.roles.has("gallery"));
    const share = mItems.find((m) => m.kind === "image" && m.roles.has("share"));
    const checkout = mItems.find((m) => m.kind === "image" && m.roles.has("checkout"));
    const imgs = [];
    if (hero) imgs.push({ url: hero.url, alt: hero.alt });
    gallery.forEach((g) => imgs.push({ url: g.url, alt: g.alt }));
    p.images = imgs.length ? imgs : p.images;
    if (hero) { p.thumbnail = p.thumbnail || hero.url; }
    p.seo_thumbnail = share ? share.url : (hero ? "" : p.seo_thumbnail); // blank => auto-from-hero
    p.checkout_image = checkout ? checkout.url : p.checkout_image;
    p.media = mItems.filter((m) => m.kind === "video" || m.kind === "youtube").map((m) => ({ type: m.kind === "youtube" ? "youtube" : "video", url: m.url, alt: m.alt, loop: !!m.loop, autoplay: !!m.autoplay, controls: !!m.controls }));
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

  /* ---------- top controls ---------- */
  document.getElementById("search").addEventListener("input", (e) => { query = e.target.value; render(); });
  document.getElementById("newBtn").addEventListener("click", (e) => { e.preventDefault(); P.toast("Start a new product — opens a blank draft editor"); });
  document.getElementById("fileInput").addEventListener("change", (e) => { handleFiles(e.target.files); e.target.value = ""; });
  document.getElementById("mediaClose").onclick = closeMedia;
  document.getElementById("mediaScrim").onclick = closeMedia;
  document.getElementById("mediaApply").onclick = applyMedia;
  window.addEventListener("resize", positionPuck);

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

  render();
})();
