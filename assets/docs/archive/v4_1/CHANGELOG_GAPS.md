# CHANGELOG — v4.0.9 admin/ UI batch (Claude Design → Claude Code)

**NOTE**: UI updates and completion of other bug reports drove v4.0.9 -> v4.1.0

Reverse-handoff for `v4_0_9_CD_HANDOFF.md`. Every change is in `admin/`. Files are
**byte-identical drop-ins** for `repo/admin/<same name>` except the two sandbox-only items
noted at the bottom. Companion: `OPEN_QUESTIONS.md`.

> **Two environments.** This is the sandboxed Claude Design mirror; "here" = sandbox, "there"
> = your `everlastings` repo. Files move only by explicit copy. See `admin/SANDBOX_NOTES.md`.

Portability tags: **PORTABLE** = pure front-end, safe drop-in · **SEAM** = `data.js` (port
shape/helpers, never the mock rows) · **SANDBOX-ONLY** = never leaves the sandbox.

---

## admin/orders-app.js — PORTABLE — items R-1, R-2, R-3

- **R-2** `statusPill` (~:68): added a **Resolved** pill for `status === "resolved"` so a line
  taken off the shipping queue reads truthfully instead of lingering as "Needs shipping". A
  `resolved` line already drops out of Unfulfilled/Shipped (both key off `completed`/`shipped_at`)
  and shows only in **All** — no tab-logic change needed.
- **R-1** Refund modal (`openRefund`): each piece now carries **three independent choices** —
  **+ Add** (money), **Resolved** (`data-rresolve`), **Relist** (`data-rrelist`). Both toggles
  carry the piece's `product_id`.
- **R-1** `wireRefund`: **Relist implies Resolved** — ticking Relist auto-ticks + locks that
  piece's Resolved toggle (you can't ship a piece you put back on sale); unticking frees it.
- **R-1** `doRefund`: sends **`resolved_product_ids`** (union of Resolved + Relist, per Contract
  A) alongside `relist_product_ids`. **Amount is now optional** — you can resolve/relist a
  lingering piece with a partial or zero refund (the exact gap Sean hit). Guard requires at least
  one action (amount, resolve, or relist). `amount_cents` omitted when zero.
- **R-3** `updateRefundNote` + button: the note reads e.g. "1 resolved · 1 relisted"; the primary
  button relabels **Refund → Resolve** when no money is in play. Success toast breaks out
  refunded / resolved / relisted counts.

## admin/orders.html — PORTABLE — items R-2, R-3 (CSS only)

- **R-2** `.tpill--resolved` — a calm slate pill (accent family), distinct from shipped-green /
  refunded-blue / needs-orange.
- **R-3** `.rpiece__toggles`, `.switch.is-implied` (Relist→Resolved "· via Relist" hint), and a
  `.refund-guide` explainer so the three choices read as clearly independent.

## admin/products-app.js — PORTABLE — items M-1..M-5, P-1, F-1..F-6

- **M-1** Renamed the media role **"Share" → "Thumbnail"** (display only; internal role/column
  stays `seo_thumbnail`): `ROLE_DEFS`, `computeLabels` (`ROLE_LABEL`/`SHORT`), the media-modal
  fallback note, the editor media-note, and the readiness message ("a thumbnail image").
- **M-2** **Upload on Apply, not on drop.** `handleFiles` now creates a local `createObjectURL`
  preview and holds the `File` — no `/api/upload`, no draft persist on drop (kills the "3–6×
  violent loading bars"). `addUrl` previews a pasted link and defers upload too. `applyMedia`
  persists the draft (`ensureSlug`) and uploads once per assigned role: local items POST
  **multipart** (the File); existing/pasted items re-role **by-link** (unchanged diff). Local
  **videos** upload on Apply before `p.media` is serialized; a still-local (failed) video is
  excluded so a `blob:` URL never persists.
- **M-3** Non-square previews: `mItemHTML` sizes `.mitem__thumb` by the media's true aspect
  (`measureAspect` reads natural dimensions from the File/URL; `thumbW` clamps 44–128px at a fixed
  72px height). Debounced re-render, never while an input is focused.
- **M-4** Filename labels: `handleFiles` captures `file.name`; `computeLabels` leads the label
  with a middle-truncated `prettyName` (~24 chars, keeps start + extension) and appends the role
  faintly. Seeded/pasted items with no filename keep the role label.
- **M-5** Apply feedback: `setApplyBusy` shows a spinner overlay + live message ("Saving the
  draft…", "Uploading media…", "Uploading video…") and disables Apply until done.
- **P-1** First-publish-only gate: `publishBtn`/`actionsNote` now key on **`everPublished =
  !!p.published_at`** and dropped the `|| p.draft` re-arm. Never-published + not-previewed → still
  requires preview; an already-published piece with staged edits → **Publish changes** enabled
  directly (editing in the open accordion is the review; Featured-only stays live via CC's change).
- **F-1** On-blur generation (never-published pieces only — see OPEN_QUESTIONS): Title blur fills
  **slug + checkout name + checkout line**; Description blur fills **SEO title + SEO description**.
  Fill-when-blank; values populate in place (no full re-render, so a Save/Preview click isn't
  eaten). `slug` + `seo_*` ride existing persistence → show in the storefront preview bar. Added a
  `slugify` helper mirroring the server.
- **F-2** Required-glow: **Price** glows red until `> 0`; **Quantity** red when null (0 stays the
  sold-out yellow); **Dimensions** field gained a `data-ring` (was missing) and glows red until all
  of W/D/H are filled. `bindField` ring update is now value-aware for price/dimensions.
- **F-3** Stuck-red fix: the `data-list` input handler (Materials/Features/Care/Shipping) now
  updates its field's `data-ring`, so red clears on input like every other required field.
- **F-4** Locks: switched from `p.is_published` to **`everPublished`** so a paused-but-once-
  published piece stays locked; lock **chips show the whole time** (`lockNote`), even while a field
  is still editable. SKU chip → "Created automatically; cannot be edited"; Slug gained a chip →
  "Locks after publish"; checkout name/line carry the same.
- **F-5** Tooltip rewrite: dropped every "if left blank"/"Auto-filled…", stripped em-dashes, made
  each tip short and factual; the **Dimensions** tip now reminds to use inches (`"`) or feet (`'`).
- **F-6** Schedule-publish visibility: the button is gated on publish-readiness and hidden for a
  clean published-no-draft piece (still shows "Reschedule…" when a schedule exists).

## admin/products.html — PORTABLE — items M-1, M-3, M-4, M-5, V-1 (markup/CSS)

- **V-1** `.media-cover` grid → `132px minmax(0,1fr)` (and `minmax(0,1fr)` on mobile); added
  `min-width:0` to `.media-center` + `.mgallery` so the gallery strip scrolls instead of forcing
  the layout past the viewport. Removed the orphaned `.media-secondary` rules (JS no longer emits
  that class).
- **M-3/M-4/M-5** CSS: `.mitem__thumb{align-self:flex-start}`, `.mitem__role` (faint role suffix),
  and the `.modal__busy` overlay + `.spin` spinner.
- **M-1** Updated the editor media-note copy to "Thumbnail".

## admin/data.js — SEAM — item R (test fixture only)

- Added **`product_id`** to the mock order rows (schema field `orders.product_id`, which the real
  DB already has) so Resolved/Relist can key off it in the sandbox. **Port the field on the real
  orders query if it isn't already selected; do NOT copy the mock rows.**

## admin/_sandbox-api.js — SANDBOX-ONLY — do NOT port

- Taught the fake `/api/orders/:id/refund` route to accept `resolved_product_ids` +
  `relist_product_ids`, flip those lines to `status: "resolved"`, and return `{ ok, status,
  relist }`. This only exists so the flow is testable here; the real endpoint is yours.

---

## Files to drop into the repo (`repo/admin/`)
`orders-app.js` · `orders.html` · `products-app.js` · `products.html` — clean drop-ins.
`data.js` — SEAM (take the `product_id` field, keep your data layer).
**Do not** copy `_sandbox-api.js` or the `<script src="_sandbox-api.js">` line in the 4 HTML files.
