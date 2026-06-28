# Creator Portal — v3.5 redesign (front-end design package)

This folder is the **finished front-end design** for the Everlastings creator/admin
portal redesign. It is design-only: real markup, styles, and interaction, running on a
**mock dataset** — intentionally **not** wired to any backend.

👉 **Integrators start with [`INTEGRATION.md`](./INTEGRATION.md)** — it maps every file,
states the design/backend boundary, and lists the numbered gaps & decisions to implement.
This README is just the "how the pieces fit together" overview.

---

## How to open it

Everything is **vanilla HTML/CSS/JS** — no build step, no install, no server. Open any
of the four pages directly in a browser:

- `products.html` — Products (the spreadsheet list + row→editor; the richest surface)
- `orders.html` — Orders (CRM-style: fulfillment, refunds)
- `sales.html` — Sales (store-wide automatic sale + coupon codes + piece picker)
- `account.html` — Account (sign in/out, View Site, environment marker, activity log)

They link to each other through the left rail (desktop) / bottom tab bar (mobile), so you
can open any one and navigate the whole portal.

## How the files fit together

```
products.html ─┐
orders.html   ─┤  each page = a thin HTML shell that loads, in order:
sales.html    ─┤    1. data.js     → window.PORTAL_DATA  (the mock dataset)
account.html  ─┘    2. portal.js    → window.PORTAL      (shared helpers + the nav shell)
                    3. <surface>-app.js → that page's logic (renders into the shell)

portal.css  ← shared design system, linked by all four pages
```

- **`portal.css`** — the whole design system: design tokens in `:root` (re-hue from there;
  component CSS uses no literal hex) + every shared component (shell, rail, tab bar,
  buttons, toggles, fields, state rings, LEDs, pills, toasts).
- **`portal.js`** — framework-free shared helpers: `PORTAL.env()` (hostname → Test/Live
  chip), `PORTAL.mountShell()` (injects the rail + mobile tab bar + env strip),
  `PORTAL.toast()`, `PORTAL.money` formatting, auto-growing textareas, character counters,
  tap-tooltips. Each page calls these after `data.js` loads.
- **`data.js`** — the **mock** dataset, shaped field-for-field to the API contract in
  `../data-flow.md`. Provenance (real DB rows vs. a few illustrative ones flagged
  `_illustrative:true`) is documented at the top of the file. **Swapping these arrays for
  real API responses is the integration seam** — the markup keys off the same field names.
- **`<surface>-app.js`** (`products-app.js`, `orders-app.js`, `sales-app.js`,
  `account-app.js`) — each page's own logic. All actions mutate the in-memory model and
  show the honest optimistic/confirm state a real call would; replace those mutations with
  the documented endpoints **without** changing markup or class names.

## Conventions worth knowing

- Money is **integer cents** everywhere; render with `PORTAL_DATA.money()`.
- Product **state is computed, never stored** — see `computeState()` and INTEGRATION.md §3.6.
- **No hard delete** anywhere — "delete" is **archive**, and everything is revivable.
- **State color is reserved for state**: green = live, orange `#D95301` = staged edits,
  yellow = draft, blue `#297fb4` = sold, purple-gray `#83718a` = archived.
- **Mobile is primary** — the bottom tab bar mirrors the desktop rail; inputs are ≥16px.

## Where this sits in the handoff

`INTEGRATION.md` references sibling docs by relative path — keep this folder next to them:

```
design-handoff/
├─ brief.md
├─ data-flow.md          ← the API contract the mock data is shaped to
├─ controls.html         ← the aesthetic anchor the design system was lifted from
├─ feedback/             ← FEEDBACK_v1.md + annotated review screenshots
└─ out/                  ← THIS folder (the finished design + INTEGRATION.md)
```

If those relative links don't resolve in your copy, the design still stands on its own —
the file map and conventions above are everything needed to read it.
