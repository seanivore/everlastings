# v3.2.1 — Gap Review B (fidelity) · round 2

**Angle:** B — fidelity. Opened every file the build edits; byte-checked each CURRENT block against the working tree; verified each NEW block references only things that exist; independently measured the char caps. Read-only — findings only.

**Verdict: READY TO BUILD.** Every CURRENT anchor matches the tree byte-for-byte; every NEW reference resolves; the four char-caps measure to the exact claimed counts; the round-1 B/C/D folds (entries 45-53) are all correctly applied. No blocking fidelity gap found. Three sub-threshold observations are recorded at the end (none requires a fold).

---

```
  Verdict: READY TO BUILD

  I opened every file the v3.2.1 build edits and byte-checked it against the working tree. Every 
  CURRENT anchor matches byte-for-byte — zero mismatches. Every NEW block references things that
  actually exist. The round-1 B/C/D folds (the openEditor upload-status repoint, the
  color:transparent Lottie hide, the byte-anchored renderProductList, the add-media-row-in-P0(iii)
  wiring, the :195-320 processOne range, the var(--token,#hex) admin styles) are all correctly
  present.

  Independently re-measured the char caps the static gate rides on — all match the docs to the byte:
  - GPT instructions (Phase 3.9) = 7732 / 8000
  - refundOrder summary 286, uploadImages 273, uploadImage 250, relist desc 228 — all < 300
  
  Other hard checks that passed: api/*.ts = 11 (under cap, no new function) · migration
  20260616000001 is monotonic and record_sale is genuinely new · requireAdmin returns a service-role
  client on both paths (so the archived-piece relist embed resolves) · a full dangling-reference
  sweep of the removed upload-control IDs comes back clean · node --check passes.
  
  Only three sub-threshold observations, none requiring a fold:
  1. Ledger entry 14's styles.css:376 hint is stale (reduced-motion is actually at styles.css:998 +
  index.html:379) — but the DESIGN doc already says "locate by content," so no build impact.
  2. openRefundPanel sets display:'block' twice — harmless redundancy.
  3. A 1.5d doc note about buildOrderCard scope reads slightly misleadingly — code is correct.
  
  The one thing to keep gated: fidelity can't prove the refund relist[] array shape statically —
  TESTING item 3's multi-piece GPT case is what catches a malformed embed, so keep it mandatory.

  This is a clean fidelity pass — Angle B finds nothing load-bearing to re-loop on. The decision to
  re-run B again or move to sign-off (pending C and D) is yours.
```

---

## What was verified (coverage — all PASS)

**CURRENT blocks matched byte-for-byte:**
- **orders.ts** — imports `:5-8` ✓; PATCH close `:237-238` ✓; GET status block `:70-74` (1.1c anchor; `url` defined `:58`) ✓.
- **vercel.json** — `:12` `/api/orders/:id` ✓; `:19` `/api/coupons/deactivate` ✓.
- **GPT schema** — `expires_at :231` ✓; uploadImage `summary :269` ✓; the `'400'`+`/api/orders` boundary `:284-285` ✓; markShipped tail `:334-336` (file's last lines) ✓.
- **GPT instructions** — `:6` `:19` `:23` `:25` `:27` all match (informational only — file ships wholesale from Phase 3.9 per ledger 29).
- **products.ts** — handleCoupon body type `:694-702` ✓; create return `:741` ✓; handleCouponList head `:751-752` ✓; `expires_at :786` ✓. The verified-I/O-contract line numbers (`handleCoupon` create, `handleCouponList` `:779-789` push shape) match the code.
- **upload.ts** — JSON intake `:129-138` ✓; `processOne` range `:195-320` accurate (try opens `:229`, success return `:316`, **catch closes `:320`** — ledger 45 confirmed, whole try…catch moves intact); `authorize` at top of POST `:118` (ledger 28) ✓.
- **webhook.ts** — blind-flip block `:156-163` ✓; title-lookup `:216-219` unaffected ✓.
- **admin.js** — `:152-161` (P0iii) ✓; `:164-170` (2.1e) ✓; `:196-201` (switchTab) ✓; `:203-211` (refreshActiveTab) ✓; `:218-220` (loadProducts) ✓; `:235-261` (renderProductList — ledger 50) ✓; `:298` (openEditor media) ✓; `:322` (upload-status reset — ledger 48) ✓; `:331-345` (addImageRow) ✓; `:371-372` (onUploadImage role/skip) ✓; `:433` (thumbnail) ✓; `:449-455` (media parse) ✓; `:770-771` ✓; `:799-804` ✓; `:830-832` ✓; `:834-838` ✓.
- **admin/index.html** — `.img-url-row` CSS `:61` ✓; `.upload-row` CSS `:63-64` ✓; tabs `:104-107` ✓; tab-products `:109-115` ✓; editor header `:116-117` ✓; p-media textarea `:159` ✓; p-images+button `:185-186` ✓; upload control `:188-229` (select at `:195`) ✓; orders subtabs `:243-248` (incl. **All Orders** `data-status="all"` `:247` — ledger 37) ✓; orders `</section>`+container close `:256-257` ✓.
- **index.html** (WS5) — homepage.js `<script … defer> :89` ✓; `<h1>Step into Elsewhere</h1> :170` ✓; poster URL `:161` ✓; src URL `:162` ✓; reduced-motion bg URL `:379` ✓.
- **styles.css** (WS5) — `.hero h1` is a **descendant** selector at `:975` (ledger 33/49) ✓; `--font-display :51` ✓; `--text-5xl :63` ✓.
- **package.json** — `:1-4` matches; **no `engines` field today** (3.2b is a real byte-anchored edit — ledger 46) ✓.
- **product.js** — gallery regex `:415` ✓; hero regex `:576` ✓ (ledger 4).

**NEW blocks reference only things that exist:**
- `import { stripe } from './_lib/stripe'` resolves — `_lib/stripe.ts` exports `stripe`; `stripe@^18.5.0` is in `package.json` deps.
- `requireAdmin` returns a **service-role** `{ supabase }` (created with `SUPABASE_SECRET_KEY`) on **both** auth paths (`adminAuth.ts:43` API-key, `:51` JWT) — so the refund `products(...)` embed bypasses `archived_at IS NULL` RLS for archived pieces; refund POST uses the same `'error' in auth` narrowing as GET/PATCH.
- Refund handler reads real `orders` columns — `amount`, `product_id`, `stripe_payment_intent`, `status`, `is_test` (initial schema `:103-108/:174`; webhook writes them `:185-201`); the `products(…)` embed reads real `products` columns `id/slug/title/available/quantity/archived_at` (initial `:39/:40/:54/:55` + v1_5 `:14`); to-one shape read like the GET, cast `as unknown as …` compiles (ledger 8).
- `formatExpiry`/`endOfDayET`/`STORE_TIMEZONE` placed above `handleCouponList`; function declarations hoist so `handleCoupon` (`:721/:729/:739`) uses them; `const STORE_TIMEZONE` read at call-time (no TDZ at runtime).
- `processOne` body (`:202-320`) references only its 4 params + module-scope `ALLOWED_MIME/MIME_TO_EXT/ROLE_PATTERN/getCloudinaryConfig/sha1Hex/isTest/env/s3` + Node-20 globals — no `request`/`formData` after the return-swaps, so the 4-param signature is sufficient. `handleAttachedRefs`/`positionalRole`/`processOne` are module-level above POST; `isPublicHttpUrl` (`:100`) module-scope.
- New admin fns (openRefundPanel/submitRefund/relistPiece, loadCoupons/renderCoupons/onCreateCoupon/onDeactivateCoupon/populateCouponProducts/updateCouponScopeNote, addMediaRow/collectMedia, updateCoverage, wireUploadZone/wireUploadZones/nextNumberedRole, productState/matchesProductFilter/wireProductSubtabs) reference only existing helpers (`authHeader :213`, `setStatus :24`, `escapeHtml :36`, `centsToDollars :52`, `deriveSlug :70`, `$ :22`, `loadOrders :648`, `closeEditor :325`, `addImageRow :331`) + in-scope params/state. relistPiece's PUT `/api/products?id=…` (mirrors `:474`) + POST `/api/products/unarchive` (mirrors `:634`) are the real endpoints.
- Every new CSS id/class used in JS has a markup home after the (same-build) markup edits — `#img-coverage`, `#p-media-list`, `#add-media-row`, `#editor-back`, `#product-subtabs`, `.upload-zone`/`.zone-file`/`.zone-msg`.

**tsc / CJS / function-count / caps:**
- `ls api/*.ts` = **11** (under the 12 cap); refund→orders.ts, attach→upload.ts — **no new function** (ledger 2).
- Removed code isn't still referenced: a full sweep of `p-media`/`upload-role`/`upload-file`/`upload-btn`/`upload-skip-transform`/`upload-status`/`onUploadImage` shows every hit lives inside the deleted `onUploadImage` fn, the removed `#upload-btn` wiring (`:153`), or the two repointed `openEditor` lines (`:298`→`#p-media-list`, `:322`→`.zone-msg`). **Zero dangling references after the edits** (ledger 36/48).
- Migration `20260616000001` is monotonic after the latest existing `20260605000001`; `record_sale` does not pre-exist (ledger 37).
- **Char caps measured (not estimated):** Phase 3.9 instruction block = **7732** bytes (gate < 8000 — matches the doc's 7732 claim exactly, 268 headroom); refundOrder summary = **286**, uploadImages summary = **273**, uploadImage NEW summary = **250**, relist_product_ids description = **228** — all < 300 (ledger 31/39). `node --check` passes on the current admin.js/product.js/homepage.js.

## Findings (ranked) — all sub-threshold, none blocking

1. **[Informational] The shared ledger entry 14 cites a stale line for the hero reduced-motion (`styles.css:376`).** The hero's `prefers-reduced-motion` rules actually live at `styles.css:998` (`.hero__glow::after { animation: none; }`) + the inline poster swap at `index.html:379`; `styles.css` has no reduced-motion block at `:376` (its `@media (prefers-reduced-motion)` blocks are `:668/:998/:1088`). **No build impact** — DESIGN §5.1/§5.2 already instruct "locate by content; the line hints have drifted," and the WS5 `styles.css` edits are locate-by-content executable design (ledger 17), not byte-anchored. Recorded only so the accurate location is on hand; safe to leave, or update the ledger hint at the next condense.
2. **[Nit] `openRefundPanel` sets `panel.style.display = 'block'` twice** (IMPLEMENT 1.5d NEW — once after the toggle check, once at the function tail). Harmless redundancy in proposed code; no correctness effect. Drop the trailing one if touching the block.
3. **[Nit / clarity] The 1.5d note "`customerEmail` (`:701`), `totalLabel` (`:711`), `productTitle` (`:698`) confirmed in `buildOrderCard`'s scope"** reads as if the new functions use those locals — they don't (the module-level refund fns re-derive from the `order` param: `order.customers?.email || order.customer_email`). The code is correct; only the note's phrasing could mislead a builder. No change needed.

## The single most important insight

There is **no blocking fidelity gap** — so the one thing to actually verify at build time is the item the plan already flags and that static fidelity *cannot* prove: the refund **`relist[]` array shape** from the `products(…)` embed (ledger 8). A wrong to-one/array assumption won't fail `tsc` and won't crash — it silently yields a malformed `relist[]`, and the "put it back up for sale?" prompt never fires (a parity hole). TESTING item 3's multi-piece GPT case is the right gate; keep it mandatory.

## One-line verdict

**READY TO BUILD** — Angle B (fidelity): all CURRENT anchors match byte-for-byte, all NEW references resolve, char-caps exact; round-1 folds landed; no fidelity blocker.
