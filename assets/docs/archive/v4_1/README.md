# v4.0.9 admin/ handoff bundle

**NOTE**: UI updates and completion of other bug reports drove v4.0.9 -> v4.1.0

Drop-in package from Claude Design. The 4 files in `admin/` here are **byte-identical to the
sandbox versions with the sandbox-only <script> line already removed** — safe to copy straight
into `repo/admin/`.

## Copy these into repo/admin/ (overwrite)
- admin/orders-app.js
- admin/orders.html
- admin/products-app.js
- admin/products.html

## Do NOT overwrite with a file from here
- **data.js** — SEAM. The only change was adding `product_id` to order rows (schema field your
  real DB already has). Take that field on your orders query if it isn't selected; keep your real
  data layer. (Not included in this bundle on purpose.)
- **_sandbox-api.js** — sandbox-only fake backend. Never goes to the repo. (Not included.)

## Read these (not repo files)
- CHANGELOG_GAPS.md — every change per file, mapped to item IDs (R-1, M-2, F-3, …).
- OPEN_QUESTIONS.md — 9 backend/decision flags to answer before/while wiring.

## Sanity check after dropping in
Diff each of the 4 files against your working copy; the only differences should be the v4.0.9
changes described in CHANGELOG_GAPS.md (plus, on the 2 HTML files, the ABSENCE of the sandbox
`_sandbox-api.js` script line — correct for prod).
