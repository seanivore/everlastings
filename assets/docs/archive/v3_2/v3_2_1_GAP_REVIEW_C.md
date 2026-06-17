# v3.2.1 — Gap Review C (integration)

**Lens:** (a) North Star — minimize Em's friction; every capability doable in BOTH /admin AND the GPT. (b) The whole v3.2.1 delta (`v3_2_1_IMPLEMENT.md` + both addenda) for exclusively-executable / unvalidated-assumption / design-correctness gaps, hunted through the *integration* angle: a locally-correct edit that, in the wider system, makes a by-chat/by-admin capability fail or leak, or breaks a render. Settled base (`EVERLASTINGS_STORE.md` + the shipped repo) not re-litigated.

## What I read (in full, end-to-end) and traced against the working tree

Docs: `EVERLASTINGS_STORE.md` (settled base), `v3_2_1_IMPLEMENT.md`, `v3_2_1_ADDENDUM_DESIGN.md`, `v3_2_1_ADDENDUM_TESTING.md`. Code I opened to verify the integration claims (not grep-skimmed): `api/orders.ts`, `api/webhook.ts`, `api/upload.ts`, `api/products.ts` (GET/PUT/coupons/archive/publicView), `api/_lib/adminAuth.ts`, `assets/js/admin.js`, `assets/js/product.js`, `assets/js/homepage.js`, `index.html` (hero), `admin/index.html` (tabs/orders/upload/inline CSS), `vercel.json`, `styles.css` hero anchors.

**Headline:** every byte-anchor in the build matches the working tree exactly, and every cross-surface contract I could trace from code lines up. This is a converged delta — the round-1 C defects (the `openEditor:322` dead `#upload-status` → TypeError, and the `add-media-row` interleave) are correctly folded (P3d AR#C1 repoint; P0(iii) single-source wiring). I found **no blocking integration gap**. Three low/trivial observations follow; none should hold the build.

---

```
  Bottom line: READY TO BUILD

  I read all four docs end-to-end and opened the actual code to verify every integration claim
  (orders/webhook/upload/products .ts, adminAuth, admin.js, product.js, homepage.js, index.html,
  admin/index.html, vercel.json, styles.css). Every byte-anchor matches the working tree exactly,
  and every cross-surface contract lines up. The round-1 C defects are correctly folded. No blocking
  integration gap.

  Three observations, all LOW/trivial, none blocking:

  - C-R2-1 (most important, LOW) — The WS6 cutover UPDATE quantity=0 ships uncommented in the
  migration, so supabase db push runs the destructive write immediately. The docs make
  "eyeball-first" REQUIRED, but the mechanism doesn't enforce it. Safe for Emy (all qty-1), but for
  the reusable-template "User" a paused-with-stock-but-previously-sold piece gets silently zeroed.
  Fix: comment the UPDATE out (or split it into a separate manual file); keep record_sale in the
  migration.
  - C-R2-2 (trivial) — admin.js:4-7 comment says /api/orders is "JWT only," but requireAdmin accepts
  PRODUCT_API_KEY too (that's why the GPT's refund works). Just a stale comment — fix at the
  as-built phase.
  - C-R2-3 (LOW, optional) — Coupon min_amount is settable on both surfaces but never shown back on
  either — symmetric limitation, not a parity hole.

  Cleared (traced to code, so the loop doesn't re-raise them): the refund optimistic-flip vs
  charge.refunded (both idempotent, no double-write, is_test holds via the chained PI filter); the
  products(...) relist embed + relistPiece reuse; requireAdmin accepting the GPT; full
  both-direction parity (refund/coupons/attach/MP4-controls); chat-attach filenames matching
  product.js's hero/gallery regexes; the admin re-skin composing with WS1-3 (the #222→--c-accent
  sweep is safe — both are accent fills, again contradicting the round-5 false alarm); P0 reading
  the right product fields; and the homepage hero preserving every layer + reduced-motion + the real
  <h1>.

  The single highest-leverage fix is C-R2-1 — it's the only destructive operation in the build, and
  making its gate mechanical protects the template "User" the project explicitly designs for.
```

---

## Ranked findings

### C-R2-1 (LOW — most important) · The WS6 cutover data-fix auto-executes; its "eyeball-first" gate is documentation-only, not enforced by the mechanism
- **Location:** `v3_2_1_IMPLEMENT.md` Phase 6.1 → migration `20260616000001_v3_1_inventory_decrement.sql`. The destructive `update products p set quantity = 0 where p.available = false and p.quantity > 0 and exists (select 1 from orders o where o.product_id = p.id and o.is_test = p.is_test);` ships **uncommented**, above the `record_sale` function, in a file applied with `supabase db push`.
- **The integration gap:** This is the one step that reconciles WS6 (a sale now decrements `quantity`) with *pre-WS6* sold rows (`available:false, quantity:1`) so the refund→relist `quantity + 1` lands at 1, not a phantom 2. The docs make eyeball-first a **REQUIRED** step and the TESTING static gate asserts it "ran eyeball-first" — but nothing stops `db push` from running the `UPDATE` immediately with no SELECT-confirm pause. It is genuinely safe for Emy's catalog (every piece is qty-1, every sold piece correctly goes to 0, and the `exists(orders)` + `o.is_test = p.is_test` guards already spare a never-sold or wrong-env row). The exposure is the **stated design target — the reusable-template "User"** with a multi-stock catalog: a piece sold once, later restocked and *intentionally* paused (`available:false, quantity>0`, with a prior order) is silently zeroed — exactly the case the eyeball exists to catch, defeated the moment an operator just applies the migration. Favor an enforced mechanism over "remember to eyeball."
- **Concrete fix:** make the gate mechanical. Either (a) ship the `UPDATE` **commented** in the migration with a "run the SELECT, confirm, then run this once" note, so `db push` creates only the (idempotent, safe) `record_sale` function and never auto-zeroes; or (b) split the cutover `UPDATE` into a separate, manually-run `…_cutover_quantity_fix.sql` that is not part of the auto-applied migration. `record_sale` stays in the migration.

### C-R2-2 (TRIVIAL — doc hygiene, no code change) · Stale auth comment would mislead about refund auth
- **Location:** `assets/js/admin.js:4-7` header comment: "`/api/orders` and `/api/orders/<id>` only accept a Supabase JWT via requireAdmin."
- **The integration gap:** `requireAdmin` (`api/_lib/adminAuth.ts:40-44`) accepts **`PRODUCT_API_KEY` OR** a Supabase JWT — which is exactly why the GPT's `listOrders` / `markShipped` and the new `refundOrder` authenticate over `/api/orders`. WS1 adds a GPT-driven money operation on top of `requireAdmin`; a future instance reading this comment literally would wrongly conclude the GPT can't drive refunds. Behavior is correct; only the comment lies.
- **Concrete fix:** at the as-built doc phase (Phase 1.6), change the comment to "accept a Supabase JWT **or `PRODUCT_API_KEY`** via requireAdmin." Zero behavior change.

### C-R2-3 (LOW — shared limitation, optional) · Coupon `min_amount` is write-only on both surfaces
- **Location:** `api/products.ts` `handleCouponList` (the per-coupon push, `:779-789`) returns code/percent_off/amount_off/times_redeemed/max_redemptions/expires_at/store_wide/product_ids (+ the new `expires_display`) — but **not** `min_amount`.
- **The integration gap:** WS2's new /admin UI adds a "Minimum order ($)" field (`#c-min`) and the GPT can set `min_amount` too, yet neither surface's list ever shows it back. The owner can set a $50 minimum and afterward cannot verify it from /admin **or** chat. This is **symmetric** (both surfaces equally blind), so it's not a /admin↔GPT parity hole — but WS2 is where it surfaces (the new field invites setting a value you then can't confirm), and it nicks the "can Em verify what she set?" edge of the North Star.
- **Concrete fix (optional, out of the delta's core scope — the list shape is otherwise settled):** if a later coupon-touching pass is worth it, add `min_amount: pc.restrictions?.minimum_amount ?? null` to the `handleCouponList` push, render it in `renderCoupons` ("min $50"), and relay it in the GPT `listCoupons`. Not a blocker.

---

## Verified clean (the Angle-C checklist — traced to code, recorded so it isn't re-litigated)

- **Refund double-write / idempotency:** the handler's optimistic flip targets only the returned pieces' siblings (`.in('id', refundedIds)`, IMPLEMENT 1.1b); `charge.refunded` (`webhook.ts:72-75`) flips every PI sibling **only on a full refund**. Both write `status='refunded'` — idempotent where they overlap. No double-write. `is_test` holds: the handler loads the order and the sibling set both `.eq('is_test', isTest)`; the new by-PI GET filter (Phase 1.1c) chains **after** the base `.eq('is_test', isTest)` (`orders.ts:67`), so a live PI from a test preview returns `[]`.
- **Refund amount semantics:** `order.amount` is the per-line charge the webhook writes (`webhook.ts:185-201`, one row per item sharing one PI); the handler defaults to it, the /admin panel sums checked `o.amount`, the dollars↔cents round-trip is consistent (`centsToDollars` ↔ `Math.round(parseFloat*100)`), and Stripe's `amount` is cents. Idempotency key `refund-<pi>-<amount>-<sorted ids>` blocks a double-click but not a distinct second per-line refund — matches TESTING item 4.
- **relist reuse + the `products(...)` embed (LANDMINE 8):** the handler's relist select is `products(id, slug, title, available, quantity, archived_at)` (a to-one object, read like the GET's `order.products?.title`); `relistPiece` PUTs `{available:true, quantity:(r.quantity||0)+1}` (PUT live-applies both with change-detect, `products.ts:456-475`) and POSTs `/api/products/unarchive` when archived — the real endpoints already used at `admin.js:474`/`:634`. **Call-order independence confirmed:** `handleArchive` only writes `archived_at` (`products.ts:868-873`), so the GPT path (editProduct→unarchive) and /admin path (unarchive→PUT) reach the same end state with no clobber.
- **`requireAdmin` accepts the GPT (auth parity):** `adminAuth.ts:40-44` matches `PRODUCT_API_KEY`, `:46-51` matches a JWT, returning the service-role client on **both** — so the GPT's `refundOrder` works and the embed resolves for an archived product (bypasses the `archived_at IS NULL` RLS, needed for the WS6 relist).
- **Parity, both directions:** refund (WS1 both), coupons (GPT existing + /admin WS2, scope mapped to `stripe_product_id`, human dates via `expires_display`/`expires_date` on both), media upload (admin multipart zones / GPT `uploadImages` attach + `uploadImage` by-link), MP4 config (admin structured editor + GPT conversational — AR#F16 `controls` flag now owner-settable in /admin, and `product.js:249-259` reads `m.controls` exactly as `collectMedia` writes it). No capability sits in one surface only.
- **Chat-attach → render (LANDMINE 4):** `handleAttachedRefs` fetches each `download_link` (public https → passes `isPublicHttpUrl`) through the **same** `processOne` pipeline; `positionalRole` yields `hero` then `gallery-0N`; `processOne` names files `{role}-{slug}`; `product.js:415` (`/\/(?:test_)?gallery-/`) and `:576` (`/\/(?:test_)?hero-/`) match those filenames in **both** test (`test_`-prefixed) and live modes. `video/*` is rejected with a per-file failure **after** the `ALLOWED_MIME` pass (ALLOWED_MIME includes video, so the explicit reject is load-bearing) → attach is images-only, by-link `uploadImage` stays the video/Drive backstop. Auth is enforced at `upload.ts:118` (POST top), before the JSON fork at `:129`. The `/api/upload/attach` rewrite points at the same function; the branch is chosen by `Array.isArray(body.openaiFileIdRefs)`.
- **Admin redesign composes with WS1-3 same-file edits:** every quoted CURRENT block is exact; the WS1 (refund), WS2 (coupons), WS3.7 (media), WS4 (P0/P2/P3d/P4) edits land on disjoint regions; the only real interleave (`add-media-row` wiring vs the `admin.js:152-161` block) is folded into the single P0(iii) diff, touched once. The `#222`→`--c-accent` token sweep is safe — the only two `#222` are `button.primary` (`:25`) and `.subtab-btn.active` (`:34`), both accent **fills** (body text is `--c-text` via the global base). `.pill.refunded` is a genuinely new class (`:68-73` has shipped/unsent/draft/edits/archived only), and the orphan `.upload-row` rule (`:63-64`) loses its only consumer with P3d.
- **P0 state-filter reads the right fields:** the authed admin GET `/api/products` list scopes by `is_test` only (`products.ts:148`, no `is_published`/`archived_at` filter), so `state.products` carries drafts + archived + sold with `draft`/`is_published`/`archived_at`/`available`/`stripe_product_id` — `productState`, `matchesProductFilter`, and the coupon scope picker all resolve. A refunded order stays visible under the existing **All Orders** subtab (`admin/index.html:247` `data-status=all` → GET applies no status filter).
- **Homepage hero preservation:** the `<h1>` is a direct child of `.hero__content`; wrapping it in `.hero__title` keeps `.hero h1` (a **descendant** selector at `styles.css:975`) matching; `color:transparent` under `prefers-reduced-motion:no-preference` keeps the real `<h1>` in flow + the a11y tree (AR#D1). The three URL swaps (`index.html:161/162/379`) are isolated strings — `.hero__overlay`/`.hero__spotlight`/`.hero__glow` (`:165-167`) and the reduced-motion poster fallback are untouched, no z-index/layer change. `homepage.js` is `defer` (`:89`), so the `defer` lottie-web tag inserted before it runs first; the new Lottie init is a second independent `DOMContentLoaded` listener (no conflict with the existing carousel one), guarded by `!window.lottie` and a `path` (not `g`) mount check.
- **WS6 record_sale:** called post-idempotency-claim via the service-role client (single call per event, no double-decrement on Stripe retry); `available = (quantity > 0)` stays consistent with the checkout gate (`available && quantity >= 1`); `archived_at` untouched; `greatest(...,0)` floors at 0.

---

## The single most important fix

**C-R2-1** — make the WS6 cutover `UPDATE` gate mechanical (comment it out in the migration, or split it into a separate manually-run file), so the only destructive operation in the build can't run unconfirmed via `db push`. Safe for Emy's store as written; the fix protects the reusable-template "User" the build explicitly designs for.

## Verdict

**READY TO BUILD.** (Integration composes end-to-end; the three findings are LOW/trivial and non-blocking — fold C-R2-1 and the C-R2-2 comment at your discretion.)
