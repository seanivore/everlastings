# v3.2.0 — Gap Review B (fidelity)

**Reviewer:** Angle B (fidelity), max effort, fresh instance. **Scope:** the v3.2.0 delta (IMPLEMENT + DESIGN + TESTING addenda) against the working tree. **Method:** byte-for-byte verification of every CURRENT anchor; resolution check on every NEW external; tsc/CJS/cap/function-count gates. No changes made.

**Bottom line:** every CURRENT block matches the tree byte-for-byte; every NEW block's externals resolve; the schema 300-char cap, the 8000-char instruction cap (Phase 3.9 = exactly 7732 bytes), tsc-clean baseline (exit 0), CommonJS, and 11/12 functions all hold. Three narrow fidelity nicks below, all caught by the mandatory static gate / byte-anchor and none architectural.

---

```
  The three findings, all LOW severity:

  - B1 (most important) — admin.js:152 ordering trap. WS3.7c's add-media-row wiring and DESIGN
  P0(iii)'s :152-161 replace touch the same region, and the IMPLEMENT (WS3-before-WS4) implies the
  opposite application order from DESIGN's fold order (P0 first). Apply 3.7c first and P0(iii)'s
  anchor no longer matches → a forced reconcile. Fix: fold the one add-media-row line into P0(iii)'s
  consolidated block.
  - B2 — upload.ts processOne boundary. The cited extraction :195–316 stops at the success return
  but the try{ at :229 is closed by the catch at :317–320 — extract literally and you get an
  unclosed try + orphaned catch. tsc catches it instantly. Fix: restate the range to :320.
  - B3 — package.json engines.node. The >=20 pin lives only in prose; current package.json has no
  engines. The static gate backstops it. Fix: anchor it as a real edit.

  Verdict: NEEDS ANOTHER PASS (narrow) — three surgical fidelity folds, none architectural; the
  build is otherwise byte-perfect. Re-run B only after the B1 fold, since it's the one that can stop
  a by-the-numbers builder mid-apply.
  
  This is the B output from the parallel B/C/D round; C and D are separate sessions. Want me to do
  anything with these findings, or are you collecting all three before folding to v3.2.1?
```

---

## Findings (ranked)

**B1 — `assets/js/admin.js:152` · unflagged ordering dependency between WS3.7c (add-media-row wiring) and DESIGN P0(iii) (consolidated `:152-161` replace). [most important]**
- The mismatch: two edits target the same region. DESIGN P0(iii)'s CURRENT is the contiguous 10 lines `:152-161` (`$('add-image-row')…` → `$('upload-btn')…` → blank → the `.subtab-btn` forEach). WS3.7c (IMPLEMENT "wire the add button") anchors on `:152` (`$('add-image-row')…`) and inserts `$('add-media-row').addEventListener('click', () => addMediaRow(null));` **after it**. If 3.7c is applied first, line 153 becomes `$('add-media-row')…` (not `$('upload-btn')…`), so P0(iii)'s contiguous CURRENT no longer matches the tree → STOP-and-reconcile. The IMPLEMENT presents WS3.7 (= DESIGN P3) inside WS3, *before* WS4 (= DESIGN P0); but DESIGN 4.2's fold order is "P0 … P3 last" — so the two documents imply **opposite application orders** for these overlapping `:152` edits, and only the DESIGN order (P0 first) avoids the mismatch. The dependency is cross-referenced at neither edit site.
- Why it matters (Angle-B lens): the byte-anchor catches it (it won't silently break), but a builder following the IMPLEMENT's WS1→6 numbering hits an anchor that doesn't match and must *decide* how to merge — exactly the "locate-and-apply, never discover/decide" property Angle B exists to protect.
- Fix (cleanest): fold the single `$('add-media-row').addEventListener('click', () => addMediaRow(null));` line **into P0(iii)'s consolidated NEW block** (right after the `$('add-image-row')…` line it already preserves), and drop WS3.7c's separate `:152` edit. P0(iii) already bills itself as "the consolidated `attachEventListeners` wiring … so 1→6 can't miss any"; add-media-row is a real existing function (unlike the AR#F1 `wireCouponEvents` phantom that was correctly excluded), so it belongs there. Alternative (lighter): keep 3.7c but add "apply after DESIGN P0(iii)" at both sites and anchor 3.7c on only the single add-image-row line.

**B2 — `api/upload.ts` · Phase 3.1 `processOne` extraction range omits the `try`'s `catch`.**
- The mismatch: the doc says move "the block from `if (!slug || !role)` at `:195` through the success `return … { url: publicUrl, filename }` at `:316`" / "the existing `:202–316` body, verbatim." But the `try {` opens at **:229** and is closed by the `catch (err) { … return jsonResponse(request, { error: 'Upload failed' }, 500); }` at **:317–320** — *outside* the cited `:316` boundary. Extracting exactly `:195–316` leaves an **unclosed `try`** inside `processOne` and an **orphaned `catch`** in `POST` → syntax error on both sides.
- Note: the swap *rule* is complete — "swap each `return jsonResponse(request, {error…}, status)`" covers the catch's error return too; only the cited *range* excludes the catch. So this is a boundary imprecision, not a missing instruction.
- Why it matters: tsc + `node --check` (both in the static gate) flag it instantly and the fix is obvious — but it forces the builder to notice the catch must come along and swap its return (`→ return { ok: false, error: 'Upload failed', status: 500 }`). LOW.
- Fix: restate the extraction as `:195–320` (through the catch close) / "the full `try…catch`," and add the catch's error-return swap to the enumerated examples so all three return-sites are explicit.

**B3 — `package.json` · the `engines.node ">=20"` pin is a build action that lives only in prose, with no byte-anchored CURRENT/NEW.**
- The mismatch: the current `package.json` has **no `engines` field** (confirmed — only name/private/dependencies). The Node-20 dependency for `new File([bytes])` / `Buffer` in `handleAttachedRefs` rests on adding `"engines": { "node": ">=20" }`, but that add appears only inside IMPLEMENT 3.2's "Verified externals" parenthetical ("the build pins `engines.node` to `">=20"`…") and landmine 40 — never as a numbered phase or a CURRENT→NEW block.
- Why it matters: the TESTING static gate *does* check it (`package.json pins engines.node to ">=20"`), so it won't ship unpinned — but it's the one load-bearing edit with no anchor, and a builder applying phases 1.1→6.4 in order could reach the gate before realizing they never made the edit. LOW (gate backstops it).
- Fix: add a tiny byte-anchored step (CURRENT `package.json` → NEW with the `engines` block) or promote it to an explicit numbered phase under WS3.

## The single most important fix
**B1** — fold the `add-media-row` wiring into DESIGN P0(iii)'s consolidated `attachEventListeners` block (and drop WS3.7c's separate `:152` edit). It's the only finding that can halt a by-the-numbers builder mid-apply with a byte-anchor that won't match; the other two are caught by tsc/the gate.

## Flag-don't-assert (runtime — verify on the dev preview, not asserted broken)
- **Refund `relist[]` shape (LANDMINE 8).** The `products(id, slug, title, available, quantity, archived_at)` embed is read to-one (`r.products?.id …`) and double-cast `as unknown as Array<{… products?: {…} }>`, so it's tsc-clean; the FK is many-to-one so the to-one read is correct. The runtime shape (a malformed `relist[]` would make the relist prompt silently never fire) is covered by TESTING items 1/3 — verify against a real multi-item refund response. Not asserting broken.
- **`openaiFileIdRefs` round-trip.** The schema keeps the documented `items:{type:string}` placeholder; the substitution + `new File`/`Buffer` runtime globals are verifiable only on the live preview (TESTING item 14). Not asserting broken.

## Verified byte-clean (do NOT re-touch on the fold)
- **orders.ts:** imports `:5-8` ✓; PATCH close `:237-238` ✓; GET status block `:70-74` ✓; `UUID_RE:10`/`jsonResponse:38`/`url:58` ✓; `stripe` import resolves (`_lib/stripe.ts` exports it) ✓; `adminAuth` returns the service-role client (SECRET key, both paths) ✓; refund columns (`amount`/`product_id`/`stripe_payment_intent`/`status`/`is_test`) all written by `webhook.ts:185-201` ✓.
- **vercel.json:** `:12` orders rewrite ✓; `:19` coupons/deactivate ✓; `cleanUrls:true` (new rewrites are API→API, no `.html`) ✓.
- **products.ts:** `:741` create return ✓; `:751-752` handleCouponList sig ✓; `:786` expires_at ✓; `:694-702` body type ✓; list/create I/O contract matches `renderCoupons`/`onCreateCoupon`; `formatExpiry`/`endOfDayET`/`STORE_TIMEZONE` hoist + resolve at call-time (no TDZ) ✓; TS 5.9.3 → `timeZoneName:'shortOffset'` type-checks (LANDMINE 30) ✓.
- **upload.ts:** JSON intake `:129-138` ✓; the `:195-316` tail + module helpers (`ALLOWED_MIME:34`,`MIME_TO_EXT:43`,`ROLE_PATTERN:52`,`getCloudinaryConfig:62`,`sha1Hex:69`,`s3:6`,`isPublicHttpUrl:100`,`normalizeMediaUrl:81`) ✓; auth at POST top `:118` (attach branch gated, LANDMINE 28) ✓; `positionalRole`/`handleAttachedRefs`/`processOne` are module-level and reference only resolvable externals ✓; refs cap 10 keeps positional roles ≤ gallery-09 (valid under ROLE_PATTERN) ✓. (Boundary nit = B2.)
- **webhook.ts:** mark-sold `:156-163` ✓; `charge.refunded` `:60-89` (full-PI flip only) ✓; title-lookup `:216-219` unaffected ✓; `record_sale` RPC swap references `productIds:156` ✓.
- **migration/schema:** new `20260616000001` > latest `20260605000001` (monotonic) ✓; `is_test` NOT NULL DEFAULT false at initial_schema `:172`/`:174` ✓; checkout gate `available && quantity>=1` `:79`/`:205` ✓; line-item `quantity:1` `:96` ✓; cart dedupe `main.js:121` ✓ (so `record_sale` p_ids has no dupes).
- **product.js:** role regexes `:415` (gallery) / `:576` (hero) ✓; `populateMedia` controls logic `:252-258` (collectMedia's three media states round-trip correctly) ✓.
- **admin.js:** `:152-161` consolidated CURRENT ✓; `:164-170` ✓; `:196-201` switchTab ✓; `:203-211` refreshActiveTab ✓; `:298` ✓; `:331-345` addImageRow ✓; `:347-356` collectImages ✓; `:358-400` onUploadImage ✓; `:433` thumbnail ✓; `:449-455` media parse ✓; `:218-220` loadProducts ✓; `:651` loadOrders ✓; `:669-678` formatAddress ✓; `:770-771`/`:799-804`/`:830-832`/`:834-838` ✓; `:775-783` copy-address ✓; `:263` openEditor / `:325` closeEditor / `:474` PUT / `:634` unarchive ✓; helpers (`authHeader`,`setStatus`,`escapeHtml`,`centsToDollars`,`deriveSlug`,`$`) all present; every new coupon/media/zone id+class used in JS has matching markup (2.1b / 3.7a-b / P0 / P3d). `renderOrders:681-691` correctly has **no `state.orders` stash** (per IMPLEMENT 1.5a — the charter's "state.orders stash" line is vestigial; nothing to verify there).
- **admin/index.html:** `:104-107` tabs ✓; `:256-257` section close ✓; `:185-186` p-images ✓; `:61` img-url-row CSS ✓; `:159` p-media ✓; `:109-115` tab-products ✓; `:116-117` editor ✓; `:188-229` upload control ✓; orders subtabs `:243-248` incl. `data-status="all"` `:247` ✓; `#222` only at `:25`/`:34` (accent bg) ✓; `.upload-row` `:63-64`, login-card `:16`/`:78`, address-block `:52`, fieldsets `:166`/`:173`, coverage prose `:181-184` all present.
- **GPT schema:** markShipped tail `:334-336` (file end) ✓; expires_at `:231` ✓; opaque coupon 200s `:234`/`:239` (LANDMINE 27) ✓; uploadImage summary `:269` ✓; `:284-285` ✓; `/api/orders/{id}:` 2-space indent `:307` ✓. Every new/edited summary+description < 300 chars (refundOrder 286, uploadImages 273, uploadImage 250, longest desc 271). LANDMINES 31/39 ✓.
- **GPT instructions:** CURRENT anchors `:6`/`:19`/`:23`/`:25`/`:27` all exact; current file 7781 bytes (matches doc start). **Phase 3.9 shipped text = exactly 7732 bytes / 7694 chars < 8000** (LANDMINES 20/29) ✓.
- **homepage:** index.html `:170` `<h1>Step into Elsewhere</h1>` ✓; `:89` homepage.js `defer` ✓; hero URLs `:161`/`:162`/`:379` ✓; styles.css `.hero h1` descendant `:975` ✓; `--font-display:51`/`--text-5xl:63` ✓. (LANDMINE 14's "styles.css:376" is a stale line-hint; IMPLEMENT says "locate by content" and the real edits target index.html:379 — consistent, not a defect.)
- **gates:** baseline `tsc --noEmit` exit 0 ✓; 11 api/*.ts (11/12, no new function) ✓; CommonJS module config ✓.

## Verdict
**NEEDS ANOTHER PASS** — narrow: three LOW-severity fidelity folds (B1 the `:152` interleave [primary], B2 the `processOne` catch boundary → `:320`, B3 anchor the `engines.node` pin). The build is otherwise byte-perfect and every cap/gate verifies; re-run B only after the B1 fold (it's the one that can force a mid-apply reconcile).
