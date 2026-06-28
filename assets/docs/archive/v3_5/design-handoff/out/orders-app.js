/* ============================================================================
   Orders surface — CRM by person. Design prototype (no backend).
   Orders are grouped by stripe_payment_intent into one card per purchase.
   ============================================================================ */
(function () {
  "use strict";
  const D = window.PORTAL_DATA, P = window.PORTAL;
  const { money } = D;
  const esc = P.esc;
  let orders = D.orders.map((o) => ({ ...o }));
  let tab = "needs", query = "";
  const seen = new Set(); // unseen = "new" highlight until viewed (no data source yet — see INTEGRATION.md)

  const CARRIERS = ["USPS", "UPS", "FedEx", "DHL"];
  const TRACK_URL = { USPS: "https://tools.usps.com/go/TrackConfirmAction?tLabels=", UPS: "https://www.ups.com/track?tracknum=", FedEx: "https://www.fedex.com/fedextrack/?trknbr=", DHL: "https://www.dhl.com/track?tracking-id=" };

  const IC = {
    img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    refund: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  };

  /* group lines by payment intent */
  function groups() {
    const m = new Map();
    orders.forEach((o) => { if (!m.has(o.stripe_payment_intent)) m.set(o.stripe_payment_intent, []); m.get(o.stripe_payment_intent).push(o); });
    return [...m.values()].map((lines) => ({
      pi: lines[0].stripe_payment_intent,
      ref: lines[0].id.slice(0, 8),
      customer: lines[0].customers || { name: lines[0].customer_email, email: lines[0].customer_email },
      address: lines[0].shipping_address,
      created_at: lines[0].created_at,
      lines,
      total: lines.reduce((s, l) => s + (l.status === "refunded" ? 0 : l.amount), 0),
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  function needsShipping(l) { return l.status === "completed" && !l.shipped_at; }
  function inTab(g, t) {
    if (t === "all") return true;
    if (t === "needs") return g.lines.some(needsShipping);
    if (t === "shipped") return g.lines.some((l) => l.shipped_at);
    return true;
  }
  function counts() {
    const gs = groups();
    return { needs: gs.filter((g) => inTab(g, "needs")).length, shipped: gs.filter((g) => inTab(g, "shipped")).length, all: gs.length };
  }
  const TABS = [{ id: "needs", label: "Unfulfilled", dot: "ship" }, { id: "shipped", label: "Shipped", dot: "shipped" }, { id: "all", label: "All", dot: "all" }];

  function renderTabs() {
    const c = counts(), seg = document.getElementById("tabs");
    seg.innerHTML = '<span class="seg__puck" aria-hidden="true"></span>' + TABS.map((t) =>
      `<button class="seg__chip" role="tab" data-tab="${t.id}" aria-selected="${t.id === tab}" ${t.id === "needs" && c.needs ? "data-alert" : ""}>
        <span class="dot dot--${t.dot}"></span>${t.label} <span class="count">${c[t.id]}</span></button>`).join("");
    seg.querySelectorAll(".seg__chip").forEach((chip) => chip.addEventListener("click", () => { tab = chip.dataset.tab; render(); }));
    const a = seg.querySelector('[aria-selected="true"]'), puck = seg.querySelector(".seg__puck");
    if (a && puck) { puck.style.width = a.offsetWidth + "px"; puck.style.transform = `translateX(${a.offsetLeft - 4}px)`; }
  }

  function initials(name) { return (name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }
  function thumb(pi) { return pi.products?.thumbnail ? `<img src="${pi.products.thumbnail}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="ph" style="display:none">${IC.img}</span>` : `<span class="ph">${IC.img}</span>`; }
  function statusPill(l) {
    if (l.status === "refunded") return `<span class="tpill tpill--refunded"><span class="pdot"></span>Refunded</span>`;
    if (l.status === "delivered") return `<span class="tpill tpill--delivered"><span class="pdot"></span>Delivered</span>`;
    if (l.shipped_at) return `<span class="tpill tpill--shipped"><span class="pdot"></span>Shipped</span>`;
    return `<span class="tpill tpill--ship"><span class="pdot"></span>Needs shipping</span>`;
  }

  function visible() {
    const q = query.trim().toLowerCase();
    return groups().filter((g) => inTab(g, tab)).filter((g) => {
      if (!q) return true;
      return (g.customer.name || "").toLowerCase().includes(q) || (g.customer.email || "").toLowerCase().includes(q) ||
        g.ref.toLowerCase().includes(q) || g.lines.some((l) => (l.tracking_number || "").toLowerCase().includes(q));
    });
  }

  function pieceHTML(l) {
    const shipped = !!l.shipped_at;
    const track = shipped ? `<div class="track-line">${esc(l.tracking_carrier)} · <a href="${TRACK_URL[l.tracking_carrier] || "#"}${encodeURIComponent(l.tracking_number || "")}" target="_blank" rel="noopener">${esc(l.tracking_number)}</a>
        <span class="empill ${l.tracking_email_sent_at ? "sent" : ""}">${IC.mail}${l.tracking_email_sent_at ? "emailed" : "not emailed"}</span>
        <button class="btn btn--ghost btn--sm" data-resend="${l.id}">Resend</button></div>` : "";
    let action = "";
    if (l.status === "completed" && !shipped) action = `<button class="btn btn--sm" data-ship="${l.id}">${IC.truck} Mark shipped</button>`;
    return `<div class="opiece ${l.status === "refunded" ? "dimmed" : ""}" data-line="${l.id}">
      <span class="opiece__thumb">${thumb(l)}</span>
      <span class="opiece__info"><span class="opiece__title">${esc(l.products?.title || "Piece")}</span><span class="opiece__amt">${money(l.amount)}</span>${track}</span>
      <span class="opiece__act">${statusPill(l)}${action}</span>
    </div>`;
  }

  function cardHTML(g) {
    const isNew = g.lines.some(needsShipping) && !seen.has(g.pi);
    const a = g.address || {};
    const addr = `${esc(a.line1 || "")}${a.line2 ? ", " + esc(a.line2) : ""}, ${esc(a.city || "")}, ${esc(a.state || "")} ${esc(a.postal_code || "")}`;
    const canRefund = g.lines.some((l) => l.status !== "refunded");
    return `<div class="ocard ${isNew ? "is-new" : ""}" data-pi="${g.pi}">
      <div class="ocard__head">
        <span class="avatar">${initials(g.customer.name)}</span>
        <span class="ocard__who">
          <span class="ocard__name">${isNew ? '<span class="new-dot" title="New — not yet viewed"></span>' : ""}${esc(g.customer.name || "Customer")}</span>
          <span class="ocard__contact"><a href="mailto:${esc(g.customer.email)}">${esc(g.customer.email)}</a>${g.customer.phone ? "· " + esc(g.customer.phone) : ""}</span>
        </span>
        <span class="ocard__meta"><span class="ocard__ref">#${esc(g.ref)}</span><span class="faint" style="font-size:var(--t-xs)">${fmtDate(g.created_at)}</span><span class="ocard__total">${money(g.total)}</span></span>
      </div>
      ${g.lines.map(pieceHTML).join("")}
      <div class="ocard__foot">
        <span class="addr"><b>Ship to</b>${addr}</span>
        <button class="btn btn--ghost btn--sm copybtn" data-copy="${esc(addr)}">${IC.copy} Copy address</button>
        ${canRefund ? `<button class="btn btn--sm btn--refund" data-refund="${g.pi}">${IC.refund} Refund</button>` : ""}
      </div>
    </div>`;
  }
  function fmtDate(s) { try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch (e) { return ""; } }

  function render() {
    renderTabs();
    const list = document.getElementById("list"), rows = visible();
    if (!rows.length) {
      list.innerHTML = query.trim()
        ? `<div class="empty">${IC.box}<h3>No orders match “${esc(query)}”</h3><p>Try a name, email, order # or tracking number.</p></div>`
        : `<div class="empty">${IC.box}<h3>${tab === "needs" ? "Nothing to ship" : tab === "shipped" ? "Nothing shipped yet" : "No orders yet"}</h3><p>${tab === "needs" ? "You're all caught up — every order is on its way." : "Orders show up here as buyers check out."}</p></div>`;
      return;
    }
    list.innerHTML = rows.map(cardHTML).join("");
    bind();
    // mark visible needs-shipping orders as seen shortly after view (clears the "new" highlight)
    setTimeout(() => { rows.forEach((g) => seen.add(g.pi)); }, 2500);
  }

  function find(id) { return orders.find((o) => o.id === id); }

  function bind() {
    const list = document.getElementById("list");
    list.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => {
      navigator.clipboard?.writeText(b.dataset.copy); P.toast("Address copied", { kind: "live" });
    }));
    list.querySelectorAll("[data-ship]").forEach((b) => b.addEventListener("click", () => openShip(b.dataset.ship)));
    list.querySelectorAll("[data-resend]").forEach((b) => b.addEventListener("click", () => { const l = find(b.dataset.resend); l.tracking_email_sent_at = new Date().toISOString(); render(); P.toast("Tracking email re-sent to buyer", { kind: "live" }); }));
    list.querySelectorAll("[data-refund]").forEach((b) => b.addEventListener("click", () => openRefund(b.dataset.refund)));
  }

  /* inline mark-shipped form (emails the buyer) */
  function openShip(lineId) {
    const piece = document.querySelector(`[data-line="${lineId}"]`);
    if (piece.nextElementSibling && piece.nextElementSibling.classList?.contains("shipform")) { piece.nextElementSibling.remove(); return; }
    const form = document.createElement("div");
    form.className = "shipform";
    form.innerHTML = `<div class="select-wrap"><select class="select" id="ship-carrier">${CARRIERS.map((c) => `<option>${c}</option>`).join("")}</select>${IC.chev}</div>
      <input class="input grow" id="ship-track" placeholder="Tracking number" inputmode="latin">
      <button class="btn btn--sm" id="ship-go">${IC.mail} Confirm &amp; email buyer</button>
      <button class="btn btn--ghost btn--sm" id="ship-cancel">Cancel</button>`;
    piece.after(form);
    const track = form.querySelector("#ship-track"); track.focus();
    form.querySelector("#ship-cancel").onclick = () => form.remove();
    form.querySelector("#ship-go").onclick = () => {
      const l = find(lineId), num = track.value.trim();
      if (!num) { track.focus(); P.toast("Add a tracking number first", { kind: "danger" }); return; }
      l.tracking_carrier = form.querySelector("#ship-carrier").value;
      l.tracking_number = num; l.shipped_at = new Date().toISOString(); l.tracking_email_sent_at = new Date().toISOString(); l.status = "shipped";
      render(); P.toast("Marked shipped · tracking emailed to buyer", { kind: "live" });
    };
  }

  /* ---------------- refund modal ---------------- */
  let refundPi = null;
  function openRefund(pi) {
    refundPi = pi;
    const g = groups().find((x) => x.pi === pi);
    document.getElementById("refundSub").textContent = `${g.customer.name} · #${g.ref}`;
    const body = document.getElementById("refundBody");
    body.innerHTML = g.lines.map((l) => {
      const already = l.status === "refunded";
      return `<div class="rpiece ${already ? "dimmed" : ""}" data-rline="${l.id}">
        <span class="rpiece__thumb">${l.products?.thumbnail ? `<img src="${l.products.thumbnail}" alt="" onerror="this.remove()">` : ""}</span>
        <span class="rpiece__info"><span class="rpiece__title">${esc(l.products?.title || "Piece")}</span>
          <span class="rpiece__sub">${already ? "Already refunded" : "Paid " + money(l.amount)}</span></span>
        <span class="rpiece__ctrls">
          ${already ? '<span class="tpill tpill--refunded"><span class="pdot"></span>Refunded</span>' : `<button class="btn btn--ghost btn--sm" data-radd="${l.id}" data-amt="${l.amount}">+ Add ${money(l.amount)}</button>
          <label class="switch switch--feature" title="Relist this piece (separate from the refund)"><input type="checkbox" data-rrelist="${l.id}"><span class="switch__track"><span class="switch__thumb"></span></span><span class="switch__label">Relist</span></label>`}
        </span>
      </div>`;
    }).join("") + `<div class="refund-amt">
      <label class="field"><div class="field__top"><span class="field__label">Refund amount</span><span class="field__spacer"></span><span class="faint" style="font-size:var(--t-xs)">edit any time</span></div>
        <div class="price" style="max-width:170px"><span class="price__sym">$</span><input class="input mono" id="refundAmount" inputmode="decimal" value="0.00"></div></label></div>
      <p class="faint" style="font-size:var(--t-xs);margin:10px 0 0">Tap <b>+ Add</b> to sum a piece's price into the amount, then edit it freely for a partial or goodwill refund. <b>Relist</b> is a separate choice.</p>`;
    wireRefund();
    document.getElementById("refundModal").classList.add("is-on");
    document.getElementById("refundScrim").classList.add("is-on");
  }
  function wireRefund() {
    const body = document.getElementById("refundBody");
    body.querySelectorAll("[data-radd]").forEach((b) => b.addEventListener("click", () => {
      b.classList.toggle("is-added");
      const added = b.classList.contains("is-added");
      b.textContent = (added ? "✓ Added " : "+ Add ") + money(+b.dataset.amt);
      let cents = 0; body.querySelectorAll("[data-radd].is-added").forEach((x) => (cents += +x.dataset.amt));
      document.getElementById("refundAmount").value = (cents / 100).toFixed(2);
      updateRefundNote();
    }));
    body.querySelectorAll("[data-rrelist]").forEach((t) => t.addEventListener("change", updateRefundNote));
    document.getElementById("refundAmount").addEventListener("input", updateRefundNote);
    updateRefundNote();
  }
  function refundCents() { return Math.round(parseFloat((document.getElementById("refundAmount").value || "0").replace(/[^0-9.]/g, "")) * 100) || 0; }
  function updateRefundNote() {
    const body = document.getElementById("refundBody");
    const relisting = [...body.querySelectorAll("[data-rrelist]:checked")].length;
    document.getElementById("refundNote").innerHTML = relisting ? `${relisting} piece${relisting > 1 ? "s" : ""} will be relisted` : "";
  }
  function closeRefund() { document.getElementById("refundModal").classList.remove("is-on"); document.getElementById("refundScrim").classList.remove("is-on"); }
  function doRefund() {
    const body = document.getElementById("refundBody"), cents = refundCents();
    if (cents <= 0) { P.toast("Enter a refund amount (tap + Add or type one)", { kind: "danger" }); return; }
    const relisted = [...body.querySelectorAll("[data-rrelist]:checked")].map((t) => t.dataset.rrelist);
    const added = [...body.querySelectorAll("[data-radd].is-added")].map((b) => b.dataset.radd);
    added.forEach((id) => { if (!relisted.includes(id)) { const l = find(id); l.status = "refunded"; } });
    relisted.forEach((id) => { const l = find(id); if (l.quantity != null) l.quantity = (l.quantity || 0) + 1; });
    closeRefund(); render();
    P.toast(money(cents) + " refunded via Stripe" + (relisted.length ? " · " + relisted.length + " relisted" : ""), { kind: "live" });
  }

  document.getElementById("search").addEventListener("input", (e) => { query = e.target.value; render(); });
  document.getElementById("refundClose").onclick = closeRefund;
  document.getElementById("refundCancel").onclick = closeRefund;
  document.getElementById("refundScrim").onclick = closeRefund;
  document.getElementById("refundDo").onclick = doRefund;

  P.mountShell("orders", { ordersBadge: groups().filter((g) => inTab(g, "needs")).length });
  render();
})();
