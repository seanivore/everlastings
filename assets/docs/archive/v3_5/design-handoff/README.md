# Content Creator Portal — design handoff

This folder is a **self-contained design brief** for redesigning the Everlastings store admin into the **Content Creator Portal**. It deliberately contains **no application code** — design to the contract here; don't integrate.

## The boundary (important)
- **Design** all five surfaces as polished, mobile-first, **vanilla HTML/CSS/JS** pages — **one variation**.
- You may design **one surface at a time** — finish each before the next.
- **Do not** modify or wire any backend, and **do not** integrate the design into the app. A separate **gap-review + integration pass** (in Claude Code) handles that. This is non-negotiable — the project is far enough along that we integrate deliberately, with reviews.
- Put your output in **`out/`**.

## Read order
1. **`brief.md`** — the design definition: the thesis (entropy-lowering details in familiar layouts), the KILL list, the layout model for each surface, the color system, the mobile rules.
2. **`data-flow.md`** — the literal data + endpoint **contract** per surface (entities, field types, actions, and the loading/empty/error/permission states to design). *Design to it; don't implement it.*
3. **`controls.html`** — the **aesthetic anchor**. This is the look — match its type, spacing, containers, and nav exactly. Opens standalone in a browser.
4. **`tokens.css`** — the anchor's exact token values (OKLCH color, type, radii, shadows, motion). Lift them; don't approximate.
5. **`reference/`** — Sean's annotated screenshots + **`LEGEND.md`** (what to keep, what to kill, the row + simple-form layout targets).

## The five surfaces
**Products** (spreadsheet rows → expand to a simple form) · **Orders** (a CRM — buyers as people) · **Sales** (plain-money coupon cards + a no-code store-wide sale) · **Account** (sign in/out + View Site). Nav comes from `controls.html`.

## The one-line spirit
Innovate in the *small* entropy-lowering details (a row LED, field-border rings, hard toggles, preview-anytime) and wrap them in *familiar* layouts (rows + plain forms). The previous pass over-innovated on layout (tiles, nested components) and raised cognitive load — that's the failure mode to avoid. Mobile is the **primary** context; make it perfect.

## Output
`out/` — page designs for Products, Orders, Sales, Account (and the product editor), mobile + desktop, as openable vanilla HTML/CSS/JS matching `controls.html`. If you'd vary on an axis, vary the per-surface IA/flow; keep the visual treatment locked to the anchor.
