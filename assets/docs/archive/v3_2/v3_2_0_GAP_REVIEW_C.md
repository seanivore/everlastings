# v3.2.0 — Gap Review C (integration / system-fit)

**Reviewer lens:** North Star (minimize Em's friction; every capability in BOTH /admin and the GPT) + the broader mandate (the whole delta for executable / unvalidated-assumption / design-correctness gaps), hunted for *integration* breaks — a locally-correct edit that, in the wider system, makes a by-chat/by-admin capability fail or leak, or breaks a render. Flag-don't-assert; every runtime claim below was checked against the code, not asserted from the docs. All four docs (EVERLASTINGS_STORE.md + IMPLEMENT + both addenda) read end-to-end.

---

```
  Angle-C (integration) verdict: NEEDS ANOTHER PASS

  The whole delta read end-to-end and every integration claim checked against the actual code (not
  the docs). The big surfaces are sound and code-verified — refund money-path (one-cart-N-orders,
  dual idempotent flips), is_test isolation, full parity in both surfaces, the chat-attach pipeline
  (auth-gated, same processOne, filenames product.js reads), the token sweep, and the homepage
  layering (defer ordering, .hero h1 descendant, all hero layers preserved).

  One real finding, three narrow ones:

  - C-1 [Medium] — the one that matters. The admin redesign (P3d) deletes the upload control
  including #upload-status, but openEditor:322 ($('upload-status').textContent = '') is a separate
  reference the cleanup list misses — it's not inside the deleted onUploadImage. After P3d it's
  null.textContent = '' → uncaught TypeError on every product-editor open. The editor still renders
  (it's the last line), but it throws every time, and tsc/node --check both pass it (runtime-only).
  Fix: delete/repoint line 322 in the P3d cleanup, and add a grep upload-status zero-check to the
  static gate.
  - C-2 [Low-Med] — WS3 inserts add-media-row between admin.js:152/153, so WS4 P0(iii)'s "verbatim
  one block" CURRENT drifts by a line (reconcilable, but the framing hides it).
  - C-3 [Low] — processOne's extraction range (:195→:316) ends one statement before the try's catch
  at :317-320; should read :195→:320. (tsc self-corrects an unclosed try.)
  - C-4 [Low] — the engines.node:">=20" pin is prose + gate only, not a byte-anchored edit (low risk
  — the shipped by-link path already uses those globals).

  Net: architecture is solid; the pass is to fold C-1 (plus the three precision nits) and re-confirm
  the openEditor/attachEventListeners composition. This matches the expected B/C/D loop pattern —
  first round narrow, all foldable.
```

---

## Verified sound (checked against code — do NOT re-litigate)

- **Refund money-path.** One cart = N sibling `orders` rows on one PI (`webhook.ts:185` writes one row per item; all share `stripe_payment_intent`). The action's optimistic flip (`.in('id', refundedIds)` → `status:'refunded'`) and the `charge.refunded` webhook (`webhook.ts:60-89`, flips **all** siblings only on a full-PI refund) both write `'refunded'` where they overlap → idempotent; a partial refund leaves the webhook silent so the action owns the per-piece flip. No double-write hazard.
- **`is_test` scope holds.** GET base query carries `.eq('is_test', isTest)` (`orders.ts:67`); the new `payment_intent` filter (Phase 1.1c) chains *after* it, so `GET /api/orders?payment_intent=<live PI>` from preview returns `{orders:[]}` (AR#F17). The refund handler's single-order load is also `.eq('is_test', isTest)` (Phase 1.1b). No cross-env leak.
- **`relistPiece` reuses the real endpoints.** `POST /api/products/unarchive` (matches `admin.js:634`) then `PUT /api/products?id=…{available:true, quantity:N+1}` (matches `admin.js:474`); `available`/`quantity` are the apply-live trio, so the PUT lands on live columns, no draft staged. Order (unarchive→PUT) is correct.
- **The `products(...)` embed is to-one (LANDMINE 8).** `orders.ts:65` + the `OrderRow` type (`:33`) read `order.products?.title` as a single object; the refund handler's `products(id,slug,title,available,quantity,archived_at)` resolves the same way, and `requireAdmin` returns the service-role client on **both** auth paths (`adminAuth.ts:27-31,41,47`), so the embed resolves for an archived piece (bypasses RLS).
- **Parity, both surfaces.** Refund (panel + `refundOrder`), coupons (3rd tab + `createCoupon`/`listCoupons`/`deactivateCoupon`, incl. multi-product scope by `stripe_product_id` and `expires_date` human dates on both), upload (GPT attach + by-link / admin role-zones + by-link), MP4 config (admin structured editor + GPT conversational, incl. the new `controls` toggle, AR#F16). No capability is one-surface-only.
- **Chat-attach pipeline (LANDMINE 4, 27).** Auth runs at `upload.ts:118` (top of POST), *before* the JSON fork at `:129` — the attach branch is gated. `handleAttachedRefs` feeds the same `processOne` pipeline; positional/`roles[]` → `{role}-{slug}` filenames that `product.js` reads (`gallery-` `:415`, `hero-` `:576`); by-link `uploadImage` stays as the backstop (the `url` branch is untouched); `/api/upload/attach` rewrite + the `openaiFileIdRefs` dispatch are correct. The `new File`/`Buffer` Node-20 globals are already used by the **shipped** by-link path (`upload.ts:170-171`), so the runtime supports them.
- **Coupon opaque-200 (LANDMINE 30/37).** `createCoupon` `'200':{description}` (`GPT_SCHEMA:234`) and `listCoupons` `'200':{description}` (`:239`) declare **no** `schema.properties` → the platform passes raw JSON, so `expires_display` on the wire (2.2b) + the relay instruction (2.3) suffice; no schema edit needed (correctly NOT added).
- **`controls` round-trip (TESTING 21).** `collectMedia` emits `controls:false` only for button-less click-to-play; `populateMedia` reads `m.controls !== false` (`product.js:258`) and GIF-like derives no-controls from `autoplay` (`:254`) — round-trips through `addMediaRow`'s `m?.controls !== false`. Sound.
- **Token literal-sweep (LANDMINE re: #222).** The only two `#222` uses are `button.primary` and `.subtab-btn.active` *backgrounds* (`admin/index.html:25,34`) — both accent fills, so `#222→--c-accent` is correct; body text is already `--c-text`. The sweep touches CSS values, not selectors.
- **P0 state-filter reads real fields.** `productState(p)` reads `archived_at`/`is_published`/`draft`/`available` — all already consumed by the shipped `renderProductList` (`admin.js:248-252`), so the admin list GET returns them (full row, not `publicView`).
- **Homepage layers preserved.** `homepage.js` is `defer` (`index.html:89`) so the `defer` Lottie tag inserted before it runs first; `.hero h1` is a **descendant** selector (`styles.css:975`) so wrapping `<h1>` in `.hero__title` keeps it matching; the three swap URLs (`:161/:162/:379`) and every layer (`hero__overlay :165`, `hero__spotlight :166`, `hero__glow :167`, parallax + reduced-motion `:376-383`) are present and untouched by the wrapper + versioned-key swap; the real `<h1>Step into Elsewhere</h1>` (`:170`) stays for SEO/SR.
- **WS6 invariant.** Cart dedupes by `product_id` (`main.js:121`) + line-item `quantity:1` (`checkout.ts:96`) → `record_sale`'s `p_ids` has no duplicates; checkout gate `available && quantity>=1` (`checkout.ts:79`). The `media`/`quantity`/`available` columns are already in the public projection (`main.js:60/74`), so WS6 needs no public-column change.
- **Char cap (LANDMINE 29/31):** not re-litigated — gate-enforced (`wc -c` on the shipped `.txt`); current baseline file is 7781 (matches the IMPLEMENT's stated start).

## Findings (ranked)

### C-1 [Medium] `openEditor` keeps a dead `#upload-status` reference after P3d removes the upload control → uncaught error on every editor open
- **Location:** `assets/js/admin.js:322` (`$('upload-status').textContent = '';`, the last line of `openEditor`) vs DESIGN P3d (removes `#upload-status`, `admin/index.html:228`) + its cleanup list (IMPLEMENT P0(iii) / DESIGN P3d-"Remove the dangling wiring").
- **The integration gap:** P3d replaces the whole "Upload new image" control (incl. `<div id="upload-status">` at `admin/index.html:228`) with role zones using `.zone-msg` (class, no id). The cleanup list enumerates exactly three removals — delete `onUploadImage`, delete `.upload-row` CSS, remove the `#upload-btn` wiring — and `onUploadImage`'s own `#upload-status` reads (`:359-396`) go with it. But `openEditor:322` is a **separate** reference (not inside `onUploadImage`) and is touched by **no** phase. After P3d, `$('upload-status')` resolves to `null`, and `null.textContent = ''` throws a `TypeError` on **every** `openEditor` call (new-product and edit-product, `admin.js:147` / `:258`). The editor view is already shown and all fields populated by line 322, so it still *renders*, but every open throws an uncaught error — a regression introduced by the polish workstream itself, and invisible to the static gate (valid syntax → `node --check` + `tsc` both pass; runtime-only).
- **Concrete fix:** add `openEditor:322` to P3d's removal list — delete the line (or, if a per-editor status reset is still wanted, repoint it to clear the zones' `.zone-msg`, e.g. `document.querySelectorAll('.upload-zone .zone-msg').forEach(m => m.textContent = '')`). A `grep -n "upload-status" assets/js/admin.js` returning zero after P3d should be added to the static gate alongside the existing cleanup checks.

### C-2 [Low–Medium] WS3's `add-media-row` wiring drifts WS4 P0(iii)'s "verbatim" consolidated block by one line
- **Location:** `assets/js/admin.js:152-153` — IMPLEMENT Phase 3.7b ("wire the add button") vs DESIGN P0(iii) (the consolidated `attachEventListeners` diff).
- **The integration gap:** Phase 3.7b inserts `$('add-media-row').addEventListener('click', () => addMediaRow(null));` *immediately after* `$('add-image-row')…` (`:152`), pushing `$('upload-btn')…onUploadImage` (`:153`) down a line. WS4 runs after WS3 (the build is 1→6; DESIGN even says "a builder going 1→6 has already built it"). So by the time P0(iii) is applied, its **CURRENT** block — which shows `add-image-row` *immediately* followed by `upload-btn` — no longer matches the tree verbatim (the WS3 `add-media-row` line now sits between them). P0(iii) is explicitly framed as a clean, single verbatim block ("one block, so 1→6 can't miss any") precisely because a missed wirer cascades (every later handler silently never binds). The drift doesn't *cause* a miss — the `$('upload-btn')…onUploadImage` anchor line is still findable, and the discipline is "match the text, reconcile drift" — but the "verbatim one block" premise is quietly broken, and a builder must remember to **preserve** the WS3 `add-media-row` line when applying P0(iii).
- **Concrete fix:** have P0(iii)'s CURRENT reflect the post-WS3 state (show the `add-media-row` line between `add-image-row` and `upload-btn`), or add a one-line note: "by WS4 this block also contains the WS3 `add-media-row` wiring — keep it." Pure documentation; no code change.

### C-3 [Low] `processOne` extraction range (`:195`→`:316`) stops one statement before the `try`'s `catch` closes
- **Location:** `api/upload.ts` — IMPLEMENT Phase 3.1 ("the block from `if (!slug || !role)` at `:195` through the success `return … at :316`").
- **The integration gap:** the `try {` opens at `upload.ts:229`; its matching `} catch (err) { … return jsonResponse(request, {error:'Upload failed'}, 500); }` is at `:317-320` — *after* the success return at `:316` that the stated range ends on. A literal move of `:195–:316` orphans the `catch` in `POST`, leaving an unclosed `try`. The intent is recoverable (Phase 3.1 says "swap **each** `return jsonResponse(error)` for a result object", which includes the catch's `Upload failed` return, and the result type `UploadResult` covers it), and `tsc` flags an unclosed `try` instantly — so it's self-correcting at the static gate. But the byte-anchored range is imprecise.
- **Concrete fix:** state the range as `:195–:320` (or "through the closing `catch` at `:320`") so the `try/catch` moves intact, and make the catch's `return jsonResponse(request, {error:'Upload failed'}, 500)` → `return { ok:false as const, error:'Upload failed', status:500 }` explicit.

### C-4 [Low] `engines.node` pin is specified in prose + the static gate, but not as a byte-anchored edit
- **Location:** `package.json` (no `engines` field today) — IMPLEMENT Phase 3.2 ("the build pins `engines.node` to `">=20"`") + TESTING static gate.
- **The integration gap:** unlike every other WS1–3/6 change, the `engines.node` add has no CURRENT→NEW block; it's only described in prose and enforced by the gate. Low risk because (a) the shipped by-link path already uses the same Node-20 globals (`new File`/`Buffer`, `upload.ts:170-171`) on the live runtime, so they're not actually at risk, and (b) the static gate fails if the pin is absent. But the build is otherwise exclusively-executable, so this one load-bearing runtime contract should match that standard.
- **Concrete fix:** add the explicit edit: `package.json` → insert `"engines": { "node": ">=20" }` (a top-level sibling of `"dependencies"`), and confirm no `runtime` override in `vercel.json` (there is none today — verified).

## Single most important fix

**C-1** — add `openEditor:322`'s `$('upload-status')` to P3d's removal list (delete or repoint the line). It's the only finding that produces a guaranteed runtime error in a shipped flow (opening any product to edit), it's introduced by the redesign composing with existing code, and it slips past `tsc` + `node --check` — so without it the build looks clean and still ships a console error on the most-used admin action.

## Verdict

**NEEDS ANOTHER PASS** — the architecture, refund money-path, `is_test` isolation, parity, chat-attach pipeline, token sweep, and homepage layering are all sound and code-verified; the pass is to fold C-1 (a real, static-gate-invisible runtime defect) plus the three narrow precision/completeness folds (C-2/C-3/C-4), then confirm the `openEditor`/`attachEventListeners` composition once more.
