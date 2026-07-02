# v3.5.3 — Breadth-regression pass · INTEGRATION MECHANICS (round 3, post-fold backstop)

Scope: whether the round-2 edits **compose** — not per-edit correctness. Flag-don't-assert. Changed nothing but this file.

---

## Verdict

**NEEDS ANOTHER PASS (NARROW)** — the folds compose and every system invariant held; ONE low-severity coordination-doc omission (a second occupant landed on a shared `main.js` anchor without a coordination-section entry). It composes in practice; the gap is documentation rigor, not a break.

---

## Checks (5) — result + evidence

### 1. shop.js / homepage.js — WS6 → WS4 → WS9 apply order composes ✅ CLEAN
- §6.5a (shop, IMPLEMENT:2380-2402) and §6.3d (homepage, :2271-2307) each carry **ONE fully pre-merged NEW block**: `sold` computed once → drives the Sold badge, image dim, `text-muted`, the struck-price gate (`${sold ? formatPrice(p.price) : priceHTML(p.price, window._activeSale)}`), and the `badge badge-unique` gate (`${!sold ? …}`). There is no separate "fold struck+badge in afterward" step — the merge is already baked into the base block, so the apply order is trivially satisfiable and there is no double-apply.
- §4.5.b (:1475), §4.5.f (:1522), §9.2 (:3403) are **explicitly marked POINTERS** ("do NOT apply as a standalone edit"). No orphaned edit, no duplicate edit.
- CURRENT anchors **byte-match the working tree**: `shop.js:126-144` and `homepage.js:41-67` verified identical to the quoted CURRENT blocks. WS6-first rewrite therefore lands cleanly; no CURRENT anchor is destroyed.
- Struck price depends on `priceHTML` + `window._activeSale`, both **defined in `main.js`** (:1245/:1256) which loads on every storefront page — available as globals in shop.js/homepage.js scope. Anchors satisfiable.
- `product.js` sticky (§4.5.d :369) and buy-gate (§6.5b :382) land on different lines (not a collision); §4.5.d's struck gate is reconciled to a block-local `!sold`, so a qty-0 PDP never renders struck.

### 2. Four sold-policy enforcers still AGREE after the merge ✅ CLEAN
- `computeState()` (WS2): `sold = quantity===0`, never stored.
- Storefront **display** gate (WS6 §6.5a/§6.3d/§6.5b/§6.5d): `p.quantity != null ? p.quantity <= 0 : !p.available` — known qty decides, null falls back to the flag.
- Server **checkout** gate (4th enforcer): verified in code — `api/checkout.ts:79` (session) and `:205` (reserve) both `available !== true || (product.quantity ?? 0) < 1` → strict AND (`available===true && quantity>=1`). Fails SAFE on any display-vs-flag mismatch.
- `record_sale` decrement: verified `supabase/migrations/20260616000001…:35` sets `available = (post-decrement quantity) > 0`.
- Struck price is gated on `!sold` on **every** surface (shop card, homepage tile, PDP sticky, related-card). No surface leaks a sold piece as buyable or as struck-priced. Consistent.

### 3. main.js §4.7.0 `?code=` capture ⚠ FINDING (low severity — composes, but undocumented shared anchor)
- The stash line sits inside the existing `DOMContentLoaded`, immediately after `initConfig()`; the consent-restore work (`CONSENT_STORAGE_KEY` → `applyConsent`, verified `main.js:269-277`) stays below it and is never clobbered. That part is clean.
- **But**: §4.7.0 (:1598-1602) and §4.3.b (:1266-1270) quote the **byte-identical CURRENT anchor** `main.js:269-270` (`DOMContentLoaded … {` + `  initConfig();`) and **both** insert a line right after `initConfig()`. This is the exact shared-anchor collision class the coordination section governs (ledger 25-27, 31b) — yet the main.js `DOMContentLoaded` triple-occupancy (§4.3.b sale chrome, §4.7.0 share-code stash, §4.3.c function placed "just above") is **not listed there**. §4.7.0 was *added* in the round-2 fold onto a spot §4.3.b already occupied, without a coordination note.
- It **does** compose in practice and in any order: both NEW blocks re-emit the 2-line anchor and append below it, so a disciplined exact-anchor Edit leaves the other's inserted line intact. The risk is only a builder doing a naïve wider block-replace. **Fix:** add a one-line coordination entry — "`main.js:269-270` DOMContentLoaded: §4.3.b then §4.7.0, each appends after `initConfig()`; apply as append-after, not block-swap."

### 4. §8.3 `?status=needs_shipping` returns BOTH signals ✅ CLEAN
- `refreshOrdersSignal` (IMPLEMENT:3370-3388) reads `body.unseen_count` → blink (`data-alert`), and a client filter over `body.orders` → numeric badge.
- Verified the read stays two-signal: `api/orders.ts` GET (§8.2a :3269-3278) computes `unseen_count` via a **separate `unseenQuery`** (`is_test` + `shipped_at IS NULL` + `status=completed` + `created_at > lastViewed`), **independent of the list `?status` filter**. So `?status=needs_shipping` narrows only the `orders` array (→ badge); the blink (`unseen_count`) is unaffected. Both signals survive.

### 5. Budget invariant — 11/12 functions + 1 cron unchanged ✅ HELD
- `api/*.ts` = **11** files (cart, checkout, config, contact, orders, product-feed, products, stripe-sync, subscribe, upload, webhook). No new `api/*.ts`.
- `vercel.json` crons = **1** entry (`/api/product-feed`, `0 9 * * *`). No new cron. Scheduled-publish + reconciliation both fold into product-feed's `GET` behind one `isCronRequest` gate (ledger 2, 26).

---

## Fold-mechanic regressions found
**One, low-severity:** the round-2 `?code=` fold (§4.7.0) added a second occupant to the `main.js:269-270` DOMContentLoaded anchor that §4.3.b already uses, without a Shared-file-edit-coordination entry. Composes in practice; recommend a one-line coordination note so a builder applies both as append-after-`initConfig()`, not as a block-swap. Everything else (card-render triple-merge, four sold enforcers, §8.3 dual signal, function/cron budget) composes clean with no regression.
