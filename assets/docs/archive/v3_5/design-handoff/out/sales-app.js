/* ============================================================================
   Sales surface — coupons + the no-code store-wide automatic sale. Prototype.
   ============================================================================ */
(function () {
  "use strict";
  const D = window.PORTAL_DATA, P = window.PORTAL;
  const { money } = D;
  const esc = P.esc;
  let coupons = D.coupons.map((c) => ({ ...c }));
  let storeWide = { ...D.storeWideSale };
  const pickProducts = (D.products || []).filter((p) => !p.archived_at);
  let pickSel = new Set();

  const IC = {
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.4Z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16 5.5a3.2 3.2 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/></svg>',
    floor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16M7 19V9m5 10V5m5 14v-7"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/></svg>',
  };
  function offText(c) { return c.percent_off != null ? c.percent_off + "% off" : (c.amount_display || money(c.amount_off)) + " off"; }

  /* ---------- store-wide automatic sale ---------- */
  function renderStoreWide() {
    const el = document.getElementById("storewide");
    if (storeWide.active) {
      el.className = "storewide on";
      el.innerHTML = `<div class="storewide__top">
        <span class="storewide__icon">${IC.globe}</span>
        <span class="storewide__txt"><h3>Running — <span class="storewide__big">${esc(storeWide.amount_display || (storeWide.value + (storeWide.type === "percent" ? "% off" : " off")))}</span> everything</h3>
          <p>Automatic at checkout · <b>no code needed</b>${storeWide.started_at ? " · since " + fmtDate(storeWide.started_at) : ""}</p></span>
        <button class="btn btn--refund btn--sm" id="endStoreWide">End sale</button></div>`;
      el.querySelector("#endStoreWide").onclick = () => confirmDialog("End the store-wide sale?", "The automatic discount will stop applying at checkout right away.", "End sale", () => { storeWide.active = false; renderStoreWide(); P.toast("Store-wide sale ended"); });
    } else {
      el.className = "storewide";
      el.innerHTML = `<div class="storewide__top">
        <span class="storewide__icon">${IC.globe}</span>
        <span class="storewide__txt"><h3>No store-wide sale running</h3><p>Apply a discount to <b>everything</b>, automatically, with no code — the holiday-sale case.</p></span></div>
      <div class="storewide__form">
        <div class="field"><div class="field__top"><span class="field__label">Type</span></div>
          <div class="select-wrap"><select class="select" id="sw-type"><option value="percent">% off</option><option value="amount">$ off</option></select>${IC.chev}</div></div>
        <div class="field"><div class="field__top"><span class="field__label">Amount</span></div>
          <input class="input mono" id="sw-val" inputmode="decimal" placeholder="15" value="15"></div>
        <button class="btn" id="startStoreWide">Start sale</button></div>`;
      el.querySelector("#startStoreWide").onclick = () => {
        const type = el.querySelector("#sw-type").value, raw = parseFloat(el.querySelector("#sw-val").value);
        if (isNaN(raw) || raw <= 0) { P.toast("Enter an amount", { kind: "danger" }); return; }
        storeWide = { active: true, type, value: raw, amount_display: type === "percent" ? raw + "% off" : money(Math.round(raw * 100)) + " off", started_at: new Date().toISOString() };
        renderStoreWide(); P.toast("Store-wide sale is live — applies at checkout, no code", { kind: "live" });
      };
    }
  }

  /* ---------- coupon cards ---------- */
  function couponHTML(c) {
    const uses = c.max_redemptions ? `${c.times_redeemed}/${c.max_redemptions} used` : `${c.times_redeemed} used`;
    const pct = c.max_redemptions ? Math.min(100, (c.times_redeemed / c.max_redemptions) * 100) : 0;
    return `<div class="coupon" data-code="${esc(c.code)}">
      <div class="coupon__top"><span class="coupon__code">${esc(c.code)}</span><span class="coupon__off">${offText(c)}</span></div>
      <div class="coupon__rows">
        <div class="r">${IC.tag}<span class="scope-pill">${c.store_wide ? "Whole store" : (c.product_ids || []).length + " piece" + ((c.product_ids || []).length === 1 ? "" : "s")}</span></div>
        ${c.min_display || c.min_amount ? `<div class="r">${IC.floor}<span><b>${esc(c.min_display || money(c.min_amount))}</b> minimum order</span></div>` : ""}
        <div class="r">${IC.users}<span>${uses}</span>${c.max_redemptions ? `<span class="usebar"><i style="width:${pct}%"></i></span>` : ""}</div>
        <div class="r">${IC.clock}<span>${c.expires_display ? "Ends " + esc(c.expires_display) : "No end date"}</span></div>
      </div>
      <div class="coupon__foot"><button class="btn btn--ghost btn--sm" data-share="${esc(c.code)}">Copy share link</button><span style="flex:1"></span><button class="btn btn--refund btn--sm" data-end="${esc(c.code)}">End sale</button></div>
    </div>`;
  }
  function renderCoupons() {
    const el = document.getElementById("coupons");
    if (!coupons.length) { el.innerHTML = `<div class="empty" style="grid-column:1/-1">${IC.tag}<h3>No coupon sales running</h3><p>Create a code-based discount with “New sale”.</p></div>`; return; }
    el.innerHTML = coupons.map(couponHTML).join("");
    el.querySelectorAll("[data-end]").forEach((b) => b.addEventListener("click", () => {
      confirmDialog("End this sale?", "Code “" + b.dataset.end + "” will stop working immediately. You can always create a new one.", "End sale", () => {
        coupons = coupons.filter((c) => c.code !== b.dataset.end); renderCoupons(); P.toast("Sale ended — code “" + b.dataset.end + "” deactivated");
      });
    }));
    el.querySelectorAll("[data-share]").forEach((b) => b.addEventListener("click", () => {
      const base = (D.config && D.config.siteUrl) || "https://everlastingsbyemaline.com";
      navigator.clipboard?.writeText(base + "/?code=" + encodeURIComponent(b.dataset.share));
      P.toast("Share link copied — paste into a newsletter or send to a customer", { kind: "live" });
    }));
  }
  function fmtDate(s) { try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch (e) { return ""; } }

  /* ---------- create modal ---------- */
  function openModal() {
    pickSel = new Set();
    const now = new Date(), yr = now.getFullYear();
    const monNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monOpts = monNames.map((m, i) => `<option value="${i}">${m}</option>`).join("");
    const dayOpts = Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
    const yrOpts = Array.from({ length: 4 }, (_, i) => `<option value="${yr + i}">${yr + i}</option>`).join("");
    const body = document.getElementById("saleBody");
    body.innerHTML = `
      <div class="tcols">
        <div class="field"><div class="field__top"><span class="field__label">Discount type</span></div>
          <div class="select-wrap"><select class="select" id="c-type"><option value="percent">% off</option><option value="amount">$ off</option></select>${IC.chev}</div></div>
        <div class="field"><div class="field__top"><span class="field__label">Amount</span></div><input class="input mono" id="c-val" inputmode="decimal" placeholder="10"></div>
      </div>
      <div class="field"><div class="field__top"><span class="field__label">Code</span><span class="field__spacer"></span><label style="font-size:var(--t-xs);color:var(--ink-muted);display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="c-auto" style="accent-color:var(--accent)"> auto-generate</label></div>
        <input class="input mono" id="c-code" placeholder="WELCOME10" style="text-transform:uppercase"></div>
      <div class="opt-row"><label class="switch"><input type="checkbox" id="c-store" checked><span class="switch__track"><span class="switch__thumb"></span></span><span class="switch__label">Whole store</span></label>
        <span class="faint" style="font-size:var(--t-xs)">off → apply to chosen pieces</span></div>
      <div class="picker is-muted" id="c-picker">
        <div class="picker__hint" id="c-pickhint">Tap a piece to switch off Whole store and scope the sale.</div>
        <div class="picker__search">${IC.search || ""}<input class="input" id="c-search" placeholder="Search name, slug, collection, or type"></div>
        <div class="picklist" id="c-picklist"></div>
        <div class="picker__foot"><span id="c-pickcount" class="faint">0 pieces selected</span><button type="button" class="linkbtn" id="c-pickclear">Clear</button></div>
      </div>
      <div class="tcols">
        <div class="field"><div class="field__top"><span class="field__label">Minimum order</span></div><div class="price"><span class="price__sym">$</span><input class="input" id="c-min" inputmode="decimal" placeholder="optional"></div></div>
        <div class="field"><div class="field__top"><span class="field__label">Usage cap</span></div><input class="input mono" id="c-max" inputmode="numeric" placeholder="optional"></div>
      </div>
      <div class="field"><div class="field__top"><span class="field__label">End date</span><span class="field__spacer"></span><span class="faint" style="font-size:var(--t-xs)">optional</span></div>
        <div class="seg2" id="c-endmode"><button type="button" class="seg2__b is-on" data-end="none">No end date</button><button type="button" class="seg2__b" data-end="date">Pick a date</button></div>
        <div class="date3 is-muted" id="c-date3">
          <div class="select-wrap"><select class="select" id="c-mon">${monOpts}</select>${IC.chev}</div>
          <div class="select-wrap"><select class="select" id="c-day">${dayOpts}</select>${IC.chev}</div>
          <div class="select-wrap"><select class="select" id="c-year">${yrOpts}</select>${IC.chev}</div>
        </div></div>`;
    body.querySelector("#c-auto").addEventListener("change", (e) => { body.querySelector("#c-code").disabled = e.target.checked; if (e.target.checked) body.querySelector("#c-code").value = ""; });
    // whole-store toggle controls the piece picker (always visible; dimmed while ON)
    const picker = body.querySelector("#c-picker");
    const hint = body.querySelector("#c-pickhint");
    body.querySelector("#c-store").addEventListener("change", (e) => {
      picker.classList.toggle("is-muted", e.target.checked);
      if (hint) hint.hidden = !e.target.checked;
      if (e.target.checked) { pickSel.clear(); const s = body.querySelector("#c-search"); if (s) s.value = ""; renderPickList(""); }
    });
    renderPickList("");
    body.querySelector("#c-search").addEventListener("input", (e) => renderPickList(e.target.value));
    body.querySelector("#c-pickclear").addEventListener("click", () => { pickSel.clear(); renderPickList(body.querySelector("#c-search").value); });
    // end-date mode
    const date3 = body.querySelector("#c-date3");
    const setEndMode = (mode) => {
      body.querySelectorAll("#c-endmode .seg2__b").forEach((x) => x.classList.toggle("is-on", x.dataset.end === mode));
      date3.classList.toggle("is-muted", mode !== "date");
    };
    body.querySelectorAll("#c-endmode .seg2__b").forEach((b) => b.addEventListener("click", () => setEndMode(b.dataset.end)));
    // touching any date select auto-switches to “Pick a date”
    ["#c-mon", "#c-day", "#c-year"].forEach((sel) => body.querySelector(sel).addEventListener("change", () => setEndMode("date")));
    document.getElementById("saleModal").classList.add("is-on");
    document.getElementById("saleScrim").classList.add("is-on");
  }
  function renderPickList(q) {
    const list = document.getElementById("c-picklist"); if (!list) return;
    q = (q || "").trim().toLowerCase();
    const rows = pickProducts.filter((p) => {
      if (!q) return true;
      return [p.title, p.slug, p.series, p.product_type].some((v) => String(v || "").toLowerCase().includes(q));
    });
    list.innerHTML = rows.length ? rows.map((p) => {
      const on = pickSel.has(p.id);
      const meta = [p.series, p.product_type].filter(Boolean).join(" · ");
      return `<button type="button" class="pickrow ${on ? "is-on" : ""}" data-id="${p.id}">
        <span class="pickrow__box">${on ? IC.check : ""}</span>
        <img class="pickrow__thumb" src="${p.thumbnail || (p.images && p.images[0] && p.images[0].url) || ""}" alt="" onerror="this.style.visibility='hidden'">
        <span class="pickrow__txt"><span class="pickrow__title">${esc(p.title || "Untitled")}</span><span class="pickrow__meta">${esc(meta || p.slug || "")}</span></span>
        <span class="pickrow__price mono">${money(p.price || 0)}</span></button>`;
    }).join("") : `<div class="picklist__empty">No pieces match “${esc(q)}”</div>`;
    list.querySelectorAll(".pickrow").forEach((r) => r.addEventListener("click", () => {
      // first pick auto-switches off Whole store
      const store = document.getElementById("c-store");
      if (store && store.checked) { store.checked = false; store.dispatchEvent(new Event("change")); }
      const id = r.dataset.id; if (pickSel.has(id)) pickSel.delete(id); else pickSel.add(id);
      renderPickList(document.getElementById("c-search").value);
    }));
    const c = document.getElementById("c-pickcount");
    if (c) c.textContent = `${pickSel.size} piece${pickSel.size === 1 ? "" : "s"} selected`;
  }
  function closeModal() { document.getElementById("saleModal").classList.remove("is-on"); document.getElementById("saleScrim").classList.remove("is-on"); }
  function createSale() {
    const b = document.getElementById("saleBody");
    const type = b.querySelector("#c-type").value, val = parseFloat(b.querySelector("#c-val").value);
    if (isNaN(val) || val <= 0) { P.toast("Enter a discount amount", { kind: "danger" }); return; }
    const auto = b.querySelector("#c-auto").checked;
    let code = (b.querySelector("#c-code").value || "").trim().toUpperCase();
    if (!auto && !code) { P.toast("Add a code or choose auto-generate", { kind: "danger" }); return; }
    if (auto) code = "SAVE" + Math.random().toString(36).slice(2, 6).toUpperCase();
    if (coupons.some((c) => c.code === code)) { P.toast("That code already exists", { kind: "danger" }); return; }
    const minRaw = parseFloat(b.querySelector("#c-min").value), maxRaw = parseInt(b.querySelector("#c-max").value, 10);
    const endMode = b.querySelector("#c-endmode .seg2__b.is-on").dataset.end;
    let expSec = null, expDisp = null;
    if (endMode === "date") {
      const mo = +b.querySelector("#c-mon").value, da = +b.querySelector("#c-day").value, ye = +b.querySelector("#c-year").value;
      const d = new Date(ye, mo, da);
      expSec = Math.floor(d.getTime() / 1000); expDisp = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    const wholeStore = b.querySelector("#c-store").checked;
    if (!wholeStore && pickSel.size === 0) { P.toast("Pick at least one piece, or switch to Whole store", { kind: "danger" }); return; }
    coupons.unshift({
      code, promotion_code_id: "promo_" + code,
      percent_off: type === "percent" ? val : null, amount_off: type === "amount" ? Math.round(val * 100) : null,
      amount_display: type === "amount" ? money(Math.round(val * 100)) : null,
      min_amount: isNaN(minRaw) ? null : Math.round(minRaw * 100), min_display: isNaN(minRaw) ? null : money(Math.round(minRaw * 100)),
      times_redeemed: 0, max_redemptions: isNaN(maxRaw) ? null : maxRaw,
      expires_at: expSec, expires_display: expDisp,
      store_wide: wholeStore, product_ids: wholeStore ? null : [...pickSel],
    });
    closeModal(); renderCoupons(); P.toast("Sale live — code “" + code + "”", { kind: "live" });
  }

  function confirmDialog(title, msg, label, onYes) {
    const wrap = document.createElement("div"); wrap.className = "modal is-on";
    wrap.innerHTML = `<div class="scrim is-on"></div><div class="modal__card" style="max-width:400px"><div class="modal__body" style="display:block"><h3 style="margin:0 0 6px;font-size:var(--t-lg);font-weight:600">${title}</h3><p style="margin:0;color:var(--ink-muted);font-size:var(--t-sm)">${msg}</p></div><div class="modal__foot"><span class="grow"></span><button class="btn btn--ghost" data-no>Cancel</button><button class="btn btn--refund" data-yes>${label}</button></div></div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.querySelector(".scrim").onclick = close; wrap.querySelector("[data-no]").onclick = close;
    wrap.querySelector("[data-yes]").onclick = () => { close(); onYes(); };
  }
  document.getElementById("newSale").onclick = openModal;
  document.getElementById("saleClose").onclick = closeModal;
  document.getElementById("saleCancel").onclick = closeModal;
  document.getElementById("saleScrim").onclick = closeModal;
  document.getElementById("saleCreate").onclick = createSale;

  P.mountShell("sales", { ordersBadge: 2 });
  renderStoreWide();
  renderCoupons();
})();
