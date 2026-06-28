/* ============================================================================
   Account surface — sign in / out, View Site, environment marker, activity log.
   Prototype.
   ============================================================================ */
(function () {
  "use strict";
  const D = window.PORTAL_DATA, P = window.PORTAL;
  const esc = P.esc;
  const cfg = D.config || {};
  const env = P.env();
  let signedIn = true;
  const account = { email: "admin@everlastingsbyemaline.com" };

  const IC = {
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M21 3 10 14"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    in: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
    log: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.2"/><circle cx="3.5" cy="12" r="1.2"/><circle cx="3.5" cy="18" r="1.2"/></svg>',
  };

  /* deterministic 5×5 mirrored identicon from the email — unique per account, no name needed */
  function identicon(seed) {
    seed = String(seed || "?");
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    const rng = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
    const hue = Math.floor(rng() * 360);
    const fg = `oklch(58% 0.13 ${hue})`, fg2 = `oklch(66% 0.12 ${(hue + 36) % 360})`;
    const cells = [];
    for (let col = 0; col < 3; col++) for (let row = 0; row < 5; row++) {
      if (rng() > 0.5) { cells.push([col, row]); if (col < 2) cells.push([4 - col, row]); }
    }
    const rects = cells.map(([x, y], i) => `<rect x="${x}" y="${y}" width="1" height="1" rx="0.12" fill="${i % 3 === 0 ? fg2 : fg}"/>`).join("");
    return `<svg viewBox="-0.4 -0.4 5.8 5.8" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${rects}</svg>`;
  }

  function fmtWhen(iso) {
    const d = new Date(iso), now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (sameDay) return "Today · " + t;
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday · " + t;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " + t;
  }

  function render() {
    const view = document.getElementById("view");
    document.body.classList.toggle("signed-out", !signedIn);
    if (signedIn) {
      const log = D.activityLog || [];
      view.innerHTML = `<div class="acct">
        <div class="acard">
          <div class="acard__h">
            <span class="avatar-lg" title="Your unique account mark">${identicon(account.email)}</span>
            <span class="who"><span class="lbl">Signed in</span><span class="em">${esc(account.email)}</span></span>
          </div>
          <div class="acard__actions">
            <button class="btn btn--ghost" id="signout">${IC.out} Sign out</button>
          </div>
        </div>

        <a class="acard linkrow" href="${P.siteUrl()}" target="_blank" rel="noopener">
          <span class="linkrow__icon">${IC.ext}</span>
          <span class="linkrow__txt"><b>View Site</b><span>Open the live storefront in a new tab</span></span>
          <span class="linkrow__chev">${IC.chev}</span>
        </a>

        <div class="acard">
          <div class="envcard">
            <span class="env-dot ${env.isTest ? "test" : "live"}"></span>
            <span><b style="font-weight:600">${env.isTest ? "Test environment" : "Live — production"}</b>
              <div class="kv">${env.isTest ? "A safe preview — changes here don't touch your live shop." : "Your real storefront — changes go live."}</div></span>
          </div>
          <div class="kv" style="margin-top:10px">Stripe key · ${esc(maskKey(cfg.publishableKey))}</div>
        </div>

        <div class="acard logcard">
          <div class="logcard__cap">${IC.log}<span>Activity log</span><span class="logcard__hint">Newest first</span></div>
          ${log.length ? `<ul class="loglist">${log.map((e) => `<li class="logitem">
              <span class="logitem__dot logitem__dot--${(e.action || "").split(".")[0]}"></span>
              <span class="logitem__body"><span class="logitem__summary">${esc(e.summary)}</span>
                <span class="logitem__meta">${esc(fmtWhen(e.at))}</span></span></li>`).join("")}</ul>`
            : `<div class="logempty">No activity yet — changes you make will be recorded here.</div>`}
        </div>
      </div>`;
      view.querySelector("#signout").onclick = () => { signedIn = false; render(); P.toast("Signed out"); };
    } else {
      view.innerHTML = `<div class="signin-fx"><canvas id="fx"></canvas>
        <form class="signin" id="signinForm" autocomplete="on">
          <div><h2>Welcome back</h2><p>Sign in to manage your shop.</p></div>
          <label class="field"><div class="field__top"><span class="field__label">Email</span></div>
            <input class="input" type="email" id="si-email" value="${esc(account.email)}" autocomplete="username" required></label>
          <label class="field"><div class="field__top"><span class="field__label">Password</span></div>
            <input class="input" type="password" id="si-pass" placeholder="••••••••" autocomplete="current-password" required></label>
          <button class="btn btn--block" type="submit">${IC.in} Sign in</button>
        </form>
        <a class="fx-home" href="${cfg.siteUrl || "https://everlastingsbyemaline.com"}" aria-label="Site home">${IC.home}<span class="fx-home__lbl">Site home</span></a>
      </div>`;
      initLoginFx();
      view.querySelector("#signinForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const pass = view.querySelector("#si-pass").value;
        if (!pass) { view.querySelector("#si-pass").focus(); return; }
        account.email = view.querySelector("#si-email").value || account.email;
        if (window.__fxStop) window.__fxStop(); signedIn = true; render(); P.toast("Signed in", { kind: "live" });
      });
    }
  }
  function maskKey(k) { if (!k) return "—"; return k.length > 12 ? k.slice(0, 8) + "…" + k.slice(-4) : k; }

  /* full-viewport ribbons that snake down behind the sign-in card and shy away from the pointer */
  function initLoginFx() {
    if (window.__fxStop) window.__fxStop();
    const c = document.getElementById("fx"); if (!c) return;
    const ctx = c.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 1, H = 1, mx = 0.5, my = 0.4, tmx = 0.5, tmy = 0.4, active = false, raf = 0;
    function size() { const r = c.getBoundingClientRect(); W = c.width = Math.max(1, r.width * dpr); H = c.height = Math.max(1, r.height * dpr); }
    size();
    const isMobile = window.matchMedia("(max-width:560px)").matches;
    const N = isMobile ? 12 : 22;
    const PALETTE = ["oklch(62% 0.15 150)", "#2f86be", "#D95301", "oklch(52% 0.13 262)", "#9a86a3", "oklch(74% 0.13 86)"];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const ribbons = [];
    for (let i = 0; i < N; i++) {
      ribbons.push({
        col: PALETTE[i % PALETTE.length],
        x: (i + 0.5) / N,
        baseAmp: rnd(0.011, 0.02),
        // three slow, incommensurate “dial” oscillators per strand → organic, never-repeating amplitude drift
        o1: rnd(0.06, 0.22), o2: rnd(0.13, 0.4), o3: rnd(0.015, 0.09),
        d1: rnd(0, 6.28), d2: rnd(0, 6.28), d3: rnd(0, 6.28),
        sp0: rnd(0, 6.28),       // spatial phase offset
        phase: rnd(0, 6.28),     // downward-travel accumulator
        ampF: 1.5,
        w: rnd(3, 8) * dpr,
        excite: 0,
      });
    }
    let t = 0;
    function frame() {
      t += 0.01; ctx.clearRect(0, 0, W, H);
      tmx += (mx - tmx) * 0.06; tmy += (my - tmy) * 0.06;
      for (const rb of ribbons) {
        // pointer proximity to this ribbon's column → excitement (smoothed)
        const dx = rb.x - tmx;
        const near = active ? Math.max(0, 1 - Math.abs(dx) / 0.16) : 0;
        rb.excite += (near - rb.excite) * 0.08;
        const dir = dx >= 0 ? 1 : -1;                          // push away from pointer
        // each strand's amplitude is being turned up/down on its own slow dial
        const combo = Math.sin(t * rb.o1 + rb.d1) * 0.6 + Math.sin(t * rb.o2 + rb.d2) * 0.3 + Math.sin(t * rb.o3 + rb.d3) * 0.1;
        const ampF = rb.ampF = 1.75 + 1.35 * combo;           // ~0.4 → 3.1, continuously wandering
        const amp = rb.baseAmp * ampF;
        const freq = 3.5 + ampF * 2.1;                         // higher amp → more peaks/dips visible
        // higher amp → peaks travel down faster; excited strands accelerate too
        rb.phase += (0.32 + ampF * 0.7 + rb.excite * ampF * 0.8) * 0.02;
        ctx.beginPath();
        const steps = 56;
        for (let s = 0; s <= steps; s++) {
          const p = s / steps, y = p * H;
          const sway = Math.sin(p * freq - rb.phase + rb.sp0) * amp;
          // localized bend away from the pointer's y-band, scaled by excitement & amplitude
          const ybell = Math.exp(-Math.pow((p - tmy) * 2.4, 2));
          const repel = dir * rb.excite * (0.5 + ampF * 0.32) * 0.045 * ybell;
          const x = (rb.x + sway + repel) * W;
          s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = rb.col; ctx.globalAlpha = 0.6; ctx.lineWidth = rb.w; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.shadowColor = rb.col; ctx.shadowBlur = 10 * dpr; ctx.stroke(); ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    frame();
    function move(e) { const r = c.getBoundingClientRect(), pt = e.touches ? e.touches[0] : e; mx = (pt.clientX - r.left) / r.width; my = (pt.clientY - r.top) / r.height; active = true; }
    function leave() { active = false; mx = 0.5; my = 0.4; }
    const host = c.parentElement;
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    host.addEventListener("touchmove", move, { passive: true });
    host.addEventListener("touchend", leave);
    window.addEventListener("resize", size);
    window.__fxStop = () => { cancelAnimationFrame(raf); window.removeEventListener("resize", size); window.__fxStop = null; };
  }

  P.mountShell("account", { ordersBadge: 2 });
  render();
})();
