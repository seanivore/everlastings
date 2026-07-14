/* ============================================================================
   Content Creator Portal — portal.js
   Shared, framework-free helpers used by every surface. Attach once per page
   after data.js. Everything is namespaced on window.PORTAL.
   ============================================================================ */
(function () {
  "use strict";
  const P = (window.PORTAL = window.PORTAL || {});

  /* ---- the build ----------------------------------------------------------
     One source of truth for what this portal IS, and — just as importantly — what it
     ISN'T. Surfaced on the Account page so the owner can say "we need X, and this build
     only does Y" without anyone having to read the code. Bump `version` on release. */
  P.BUILD = {
    version: "v4.1.5",
    released: "2026-07-14",
    // Every hard number a person could run into. Sourced from the real limits, not from hope:
    // the 4.3 MB drop ceiling is Vercel's 4.5 MB request-body cap at the edge (minus multipart
    // overhead) — it is NOT ours and cannot be raised. The link limits are ours.
    media: {
      photoDropMB: 4.3,
      photoLinkMB: 10,
      videoDropMB: 4.3,
      videoLinkMB: 200,
      photoTypes: "JPEG, PNG, WebP, GIF",
      videoTypes: "MP4, WebM",
    },
    // Known shortcomings. Keep these HONEST — the point of listing them is that nobody
    // discovers them the hard way, mid-upload, on a deadline.
    limits: [
      "iPhone HEIC photos aren't supported yet. Turn HEIC off (Settings → Camera → Formats → Most Compatible), or export as JPEG.",
      "Video isn't converted for you. iPhone records .MOV, which many browsers won't play — export as .mp4, or use YouTube.",
      "Video isn't compressed for you. A rendered 3-minute clip is usually under 20 MB; a raw phone clip can be 10× that.",
      "A video's poster still comes from an image you give the Thumbnail role — it isn't pulled from the clip automatically.",
    ],
  };

  /* ---- environment chip: derived from the hostname, never hardcoded --------
     *.vercel.app / localhost / file:// → TEST ; everlastingsbyemaline.com → Live
     (Integration: this is exactly window.location.hostname — see INTEGRATION.md) */
  P.env = function () {
    const h = (location.hostname || "").toLowerCase();
    const isProd = /everlastingsbyemaline\.com$/.test(h);
    const isTest = !isProd; // vercel.app previews, localhost, file:// all read as test
    return { isTest, label: isTest ? "Test" : "Live" };
  };
  P.applyEnvChip = function (el) {
    if (!el) return;
    const e = P.env();
    el.textContent = e.label;
    el.classList.toggle("test-chip--live", !e.isTest);
    el.title = e.isTest ? "You're viewing test data (preview environment)" : "You're on the live shop";
  };
  /* the storefront URL for the CURRENT environment (test → this deployment's root; live → prod) */
  P.siteUrl = function () { return P.env().isTest ? location.origin : "https://everlastingsbyemaline.com"; };

  /* ---- config + Supabase auth bootstrap (preserved from the retired admin.js:90-221) ----
     Each surface calls PORTAL.boot() before its render. It loads /api/config (Stripe
     publishable key + Supabase URL/publishable key + isTest), creates the shared Supabase
     client, and resolves the current session. Pages that require a session redirect to
     /admin/account (which hosts sign-in) when signed out. No new serverless function:
     /api/config + the CDN @supabase/supabase-js are the existing surfaces. */
  P.config = null; P.supabase = null; P.session = null;
  P.loadConfig = async function () {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error("Failed to load /api/config");
    const cfg = await res.json();
    if (!cfg.supabaseUrl || !cfg.supabasePublishableKey) throw new Error("Supabase config missing from /api/config response");
    return cfg;
  };
  P.boot = async function (opts) {
    opts = opts || {};
    P.config = await P.loadConfig();
    P.supabase = window.supabase.createClient(P.config.supabaseUrl, P.config.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    const { data } = await P.supabase.auth.getSession();
    P.session = (data && data.session) || null;
    if (typeof opts.onAuth === "function") {
      P.supabase.auth.onAuthStateChange(function (_e, session) { P.session = session || null; opts.onAuth(P.session); });
    }
    if (opts.requireSession && !P.session) { location.replace("/admin/account"); return false; }
    return true;
  };
  P.authHeader = function () {
    const t = P.session && P.session.access_token;
    return t ? { Authorization: "Bearer " + t } : {};
  };

  /* ---- icons reused across helpers ---- */
  const SVG = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  };

  /* ---- toast: top-right (desktop) / top-center (mobile); tap or swipe to dismiss fast ---- */
  P.toast = function (msg, opts) {
    opts = opts || {};
    let wrap = document.getElementById("toasts");
    if (!wrap) { wrap = document.createElement("div"); wrap.id = "toasts"; wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
    const el = document.createElement("div");
    el.className = "toast" + (opts.kind ? " toast--" + opts.kind : "");
    el.setAttribute("role", "status");
    el.innerHTML = (opts.kind === "live" ? SVG.check : "") + "<span>" + msg + "</span>";
    if (opts.undo) {
      const b = document.createElement("button");
      b.className = "toast__undo"; b.type = "button"; b.textContent = "Undo";
      b.addEventListener("click", (e) => { e.stopPropagation(); opts.undo(); dismiss(); });
      el.appendChild(b);
    }

    // v4.1.2 — an ERROR is the one toast that has something to teach you: which file, how big, what
    // the limit is, what to do instead. 2.6s was not enough time to READ it, let alone act on it.
    // Errors now stay up long enough to be read (and screenshotted), carry a visible ✕, and stop
    // counting down while the pointer is over them.
    const isError = opts.kind === "danger";
    const life = opts.duration != null ? opts.duration : (isError ? 14000 : opts.undo ? 5000 : 2600);
    if (isError) {
      const x = document.createElement("button");
      x.className = "toast__x"; x.type = "button"; x.setAttribute("aria-label", "Dismiss"); x.textContent = "✕";
      x.addEventListener("click", (e) => { e.stopPropagation(); dismiss(); });
      el.appendChild(x);
    }

    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-on"));
    let hideT = setTimeout(dismiss, life);
    function dismiss() { clearTimeout(hideT); el.classList.remove("is-on"); setTimeout(() => el.remove(), 240); }
    // hovering an error means you're still reading it — don't yank it away mid-sentence
    if (isError) {
      el.addEventListener("mouseenter", () => clearTimeout(hideT));
      el.addEventListener("mouseleave", () => { hideT = setTimeout(dismiss, 4000); });
    }
    // tap to dismiss
    el.addEventListener("click", dismiss);
    // swipe to dismiss (up, or horizontal)
    let sx = 0, sy = 0, dragging = false;
    el.addEventListener("touchstart", (e) => { dragging = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY; el.style.transition = "none"; }, { passive: true });
    el.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
      el.style.transform = `translate(${dx}px, ${Math.min(dy, 0)}px)`;
      el.style.opacity = String(Math.max(0, 1 - (Math.abs(dx) + Math.abs(Math.min(dy, 0))) / 120));
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      dragging = false; el.style.transition = "";
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 60 || dy < -40) dismiss(); else { el.style.transform = ""; el.style.opacity = ""; }
    });
    return dismiss;
  };

  /* ---- auto-growing textarea: starts ~2 lines taller, grows to fit, never scrolls ---- */
  P.autoGrow = function (el) {
    if (!el) return;
    const grow = () => { el.style.height = "auto"; el.style.height = Math.max(el.scrollHeight, parseInt(getComputedStyle(el).minHeight) || 0) + "px"; };
    el.addEventListener("input", grow);
    // run after layout so scrollHeight is correct
    requestAnimationFrame(grow);
    el.__grow = grow;
  };
  P.wireAutoGrow = function (scope) {
    (scope || document).querySelectorAll("textarea[data-autogrow]").forEach(P.autoGrow);
  };

  /* ---- live character counter: shows characters REMAINING vs the recommended length;
         turns red when ≤10 left and stays red once negative (over). ---- */
  P.wireCharCount = function (scope) {
    (scope || document).querySelectorAll("[data-rec]").forEach((field) => {
      const input = field.querySelector("input, textarea");
      const out = field.querySelector("[data-count-out]");
      if (!input || !out) return;
      const rec = parseInt(field.getAttribute("data-rec"), 10);
      const upd = () => {
        const remaining = rec - (input.value || "").length;
        out.textContent = remaining;
        out.classList.toggle("is-over", remaining <= 10);
      };
      input.addEventListener("input", upd);
      upd();
    });
  };

  /* ---- tap/click tooltips (the small "i" and lock chips) — hover works via CSS; this adds tap ---- */
  P.wireTips = function (scope) {
    (scope || document).querySelectorAll(".tip__btn").forEach((b) => {
      if (b.__wired) return; b.__wired = true;
      b.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        const tip = b.closest(".tip");
        const open = tip.classList.contains("is-open");
        document.querySelectorAll(".tip.is-open").forEach((t) => t.classList.remove("is-open"));
        if (!open) tip.classList.add("is-open");
      });
    });
    if (!P.__tipDoc) {
      P.__tipDoc = true;
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".tip")) document.querySelectorAll(".tip.is-open").forEach((t) => t.classList.remove("is-open"));
      });
    }
  };

  /* ---- escape HTML ---- */
  P.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  };

  /* ---- run all auto-wirers within a scope (call after injecting editor HTML) ---- */
  P.enhance = function (scope) {
    P.wireAutoGrow(scope); P.wireCharCount(scope); P.wireTips(scope);
  };

  /* ---- shared shell: rail + mobile tabbar + env + collapse — call once per surface page ---- */
  /* ---- Orders badge: paint the live unfulfilled-orders count onto the Orders
     nav item (rail + mobile tab bar). Pass a number, or omit to read the shared
     PORTAL_DATA.unfulfilledCount(). At 0 the badge AND the attention blink are
     removed entirely. Any surface can call this after a ship/refund to refresh. */
  P.setOrdersBadge = function (n) {
    if (n == null) n = (window.PORTAL_DATA && PORTAL_DATA.unfulfilledCount) ? PORTAL_DATA.unfulfilledCount() : 0;
    document.querySelectorAll('.rail__item[href="orders.html"], .tabbar__item[href="orders.html"]').forEach((item) => {
      if (n > 0) item.setAttribute("data-alert", ""); else item.removeAttribute("data-alert");
      let badge = item.querySelector(".badge");
      if (n > 0) {
        if (!badge) { badge = document.createElement("span"); badge.className = "badge"; item.appendChild(badge); }
        badge.textContent = n;
      } else if (badge) { badge.remove(); }
    });
    return n;
  };

  P.mountShell = function (active, opts) {
    opts = opts || {};
    // default to the shared live count; an explicit opts.ordersBadge still wins
    const badge = opts.ordersBadge != null ? opts.ordersBadge
      : ((window.PORTAL_DATA && PORTAL_DATA.unfulfilledCount) ? PORTAL_DATA.unfulfilledCount() : 0);
    const I = {
      products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
      orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="m12 11v10"/></svg>',
      sales: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.4Z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>',
      account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>',
      view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M21 3 10 14"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></svg>',
      collapse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/></svg>',
    };
    const NAV = [["products", "Products"], ["orders", "Orders"], ["sales", "Sales"], ["account", "Account"]];
    const app = document.querySelector(".app");
    const railItem = (k, l) => `<a class="rail__item" href="${k}.html" ${k === active ? 'aria-current="page"' : ""} data-label="${l}" ${k === "orders" && badge ? "data-alert" : ""}>${I[k]}<span class="lbl">${l}</span>${k === "orders" && badge ? `<span class="badge">${badge}</span>` : ""}</a>`;
    const rail = document.createElement("nav"); rail.className = "rail"; rail.setAttribute("aria-label", "Portal sections");
    rail.innerHTML = `<button class="rail__toggle" id="railToggle" aria-label="Collapse menu" title="Collapse menu">${I.collapse}</button>`
      + NAV.map(([k, l]) => railItem(k, l)).join("")
      + `<span class="rail__sep" aria-hidden="true"></span><a class="rail__item rail__foot" href="${P.siteUrl()}" target="_blank" rel="noopener" data-label="View Site">${I.view}<span class="lbl">View Site</span></a>`;
    app.insertBefore(rail, app.firstChild);
    const tb = document.createElement("nav"); tb.className = "tabbar"; tb.setAttribute("aria-label", "Portal sections");
    tb.innerHTML = NAV.map(([k, l]) => `<a class="tabbar__item" href="${k}.html" ${k === active ? 'aria-current="page"' : ""} ${k === "orders" && badge ? "data-alert" : ""}>${I[k]}${l}${k === "orders" && badge ? `<span class="badge">${badge}</span>` : ""}</a>`).join("");
    document.body.appendChild(tb);
    const strip = document.createElement("div"); strip.className = "envstrip"; strip.id = "envStrip";
    document.body.insertBefore(strip, document.body.firstChild);
    const env = P.env(), chip = document.getElementById("envChip");
    if (env.isTest) { P.applyEnvChip(chip); P.applyEnvChip(strip); } else { if (chip) chip.style.display = "none"; strip.style.display = "none"; }
    if (localStorage.getItem("portalRailCollapsed") === "1") app.classList.add("rail-collapsed");
    const rt = document.getElementById("railToggle");
    rt.addEventListener("click", () => { const c = app.classList.toggle("rail-collapsed"); localStorage.setItem("portalRailCollapsed", c ? "1" : "0"); rt.setAttribute("aria-label", c ? "Expand menu" : "Collapse menu"); rt.title = c ? "Expand menu" : "Collapse menu"; });
    P.refreshOrdersSignal();
  };

  /* ---- central new-order signal: light the Orders blink from the REAL unseen count and show the REAL
     needs-shipping badge (not the caller's mock ordersBadge). Called by mountShell AND the Products
     static-rail init. Runs after PORTAL.boot() so authHeader() is set. Best-effort; blink (data-alert)
     ← unseen_count (decoupled), badge ← needs-shipping count. ---- */
  P.refreshOrdersSignal = async function () {
    try {
      // v3.5 — ?status=needs_shipping keeps the payload small (this runs on EVERY page just to read two
      // numbers). unseen_count is returned REGARDLESS of the list filter (orders.ts §8.2a — a separate
      // count query, filter-independent), so the blink is unaffected. The needs count stays a defensive
      // client filter over the (already-narrowed) list, so it's correct even if the server predicate drifts.
      const res = await fetch("/api/orders?status=needs_shipping", { headers: { ...P.authHeader() } });
      if (!res.ok) return;
      const body = await res.json().catch(() => ({}));
      const unseen = Number(body.unseen_count) || 0;
      const needs = Array.isArray(body.orders) ? body.orders.filter((o) => !o.shipped_at && o.status === "completed").length : 0;
      document.querySelectorAll('.rail__item[href="orders.html"], .tabbar__item[href="orders.html"]').forEach((el) => {
        el.toggleAttribute("data-alert", unseen > 0);
        let b = el.querySelector(".badge");
        if (needs > 0) { if (!b) { b = document.createElement("span"); b.className = "badge"; el.appendChild(b); } b.textContent = String(needs); }
        else if (b) { b.remove(); }
      });
    } catch { /* best-effort — nav stays as rendered */ }
  };
})();
