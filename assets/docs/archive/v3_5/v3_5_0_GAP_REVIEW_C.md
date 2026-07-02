# v3.5.0 — Gap Review C (integration: does the delta FIT the system?)

**Angle C — integration.** Effort: maximum. Repo + the three v3.5.0 docs, read against `EVERLASTINGS_STORE.md` (read first, end-to-end). Lens: function/cron budget, `is_test` scoping, auth, webhook/refund idempotency, **sold-policy consistency across the three surfaces** (`computeState` ↔ storefront buy-gate ↔ webhook decrement), Stripe one-discount reality, AR conflicts, stale `file:line` pointers, shared-file coordination (ledger 25-27). Findings only — nothing else changed. Ledger 1-30 respected (no re-litigation of settled base).

**Bottom line:** the delta broadly fits the system — function count stays **11/12** (verified `ls api/*.ts` = 11; every new op folds into `products.ts`/`orders.ts`/`product-feed.ts`), cron stays **1** (`vercel.json`), auth is unchanged and correctly applied (public `active_sale`, `authorize`/`requireAdmin` elsewhere), the Stripe one-discount approach is right (client `applyPromotionCode` + `allow_promotion_codes:true` kept at `checkout.ts:105`, no server `discounts` param), webhook idempotency (`webhook.ts:50` insert-as-claim) + refund guards (`orders.ts:281`) are preserved, and the byte-anchors drift only 1-3 lines (hints hold). **But two load-bearing integration issues and one dead feature need resolution before build** — all bounded and pinpoint.

---

## Ranked findings

### C1 — HIGH · the storefront's sold-state / buy-gate is never migrated to `published && quantity>0`; it stays `available`-based (the cross-lane sold-policy check)

The invariant the whole build rests on (ledger 20; IMPLEMENT *Locked decisions → Product state*; WS9 Phase 9.3; testing item 100) is that the **storefront buy-gate = `published && quantity>0`** and **grid Sold = `published && quantity===0`**, honored identically to the portal's `computeState()` and the webhook decrement. Two of the three enforcers are correct:

- **Portal (WS2):** `computeState()` (`out/products-app.js:16-22`) = `archived > draft > edits > sold(quantity===0) > live`, **no `!available→sold` branch**. ✓
- **Webhook (WS7):** `record_sale` (`webhook.ts:157`, migration `20260616000001`) sets `available = (quantity>0)`. ✓
- **Storefront (the third enforcer):** **still keys off `p.available`, not `quantity`, and no WS6/WS9 phase changes it.** `shop.js:133` (`${p.available ? '' : '<span class="badge badge-sold">Sold</span>'}`), `shop.js:116-117` (all-sold empty state), `product.js:382` (`if (p.available === false)` → sold overlay + disabled buttons), `product.js:353` (JSON-LD `InStock`/`OutOfStock`), `product.js:539` (`getProducts({available:true})`) all read `available`. WS6's four phases (spec fields, series filter, carousel, /complete) touch none of this; WS9 Phase 9.3 is presentational and *cites* the `published && quantity>0` gate as if it already exists.

In the happy path this converges (a sale keeps `available === (quantity>0)`, and WS2 Phase 2.2 makes an owner "Available OFF" **unpublish** rather than set `available=false`). **It diverges on any write that desyncs `available` from `quantity`** — e.g. a GPT `editProduct {available:true}` (or `{available:true, quantity:0}`) on a qty-0 piece: the server PUT has no guard forcing `available=false` when `quantity===0` (Phase 2.2 only handles OFF→unpublish; the admin surface prompts for stock but the GPT need not). Result: **shop grid + PDP render the piece buyable (no Sold badge, add-to-cart enabled), but `checkout.ts:79/:205` reject it (`quantity>=1`) with 410** — and #224 (WS7) just removed the cart-hold that was the last cushion for that shock.

Flag-don't-assert: the happy path works today, so this is "the plan asserts a storefront invariant it never builds + a reachable desync." **Fix (Sean's call, two options):** (a) add a WS6 phase migrating the storefront sold-derivation/badge/JSON-LD + PDP gate to `published && quantity===0` (matching `computeState` and `checkout.ts`); **or** (b) keep `available` as the storefront signal but add a server guard so `available` can never be `true` while `quantity===0`, and correct the ledger-20/WS9-9.3 wording to say the storefront keys off the server-maintained `available` flag. Either closes the three-surface gap; today only two of three agree.

### C2 — HIGH · `publishDueScheduled` runs on EVERY feed hit and hardcodes `is_test=false` (an `is_test` isolation break + a dead test)

WS2 Phase 2.6 calls `await publishDueScheduled(req);` **unconditionally** at the top of `product-feed.ts` GET, and the helper scans `.eq('is_test', false)`. Contrast WS7 Phase 7.3c, which correctly gates `reconcileOrders()` behind `if (isCronRequest(req))` **and** scopes `.eq('is_test', isTest)`. This asymmetry causes two problems:

- **`is_test` isolation (ledger 4 — hard invariant).** `/api/product-feed` is a **public** endpoint (Google/Meta poll it; so can any bot/tester). On a **preview** deployment, a public hit runs `publishDueScheduled`, which uses the **shared-project** service-role key to scan `is_test=false` (LIVE) rows and, for any due one, self-calls `${previewOrigin}/api/products?_action=publish` with the preview's **TEST** `PRODUCT_API_KEY`. The publish then creates a **test-mode** Stripe product/price (preview Stripe key) and writes that `stripe_product_id`/`stripe_price_id` onto the **live** row → a live product silently gets an unbuyable test-mode Stripe price. A test action touching/publishing a live row is exactly what ledger 4 forbids.
- **Testing item 7 can't pass.** The tester's scheduled draft on the preview is `is_test=true`, but the scan is `is_test=false`, so the "past-due scheduled draft flips Live on the preview cron" assertion never fires. (It also means scheduled publish effectively fires on *every* feed poll, not "daily at 09:00" as the doc frames it.)

**Fix:** gate `publishDueScheduled` behind `isCronRequest(req)` (mirror `reconcileOrders`) and scope it `.eq('is_test', isTest)` — not hardcoded `false`. Then a public poll never triggers a publish, the preview cron publishes only its own test rows, and prod (`isTest=false`) behaves as intended.

### C3 — MEDIUM · the `?code=` share link ships dead (settled ledger-30 decision has no implementing phase)

`sales-app.js` builds the copy-share affordance `((D.config.siteUrl)||'…') + '/?code=' + code` (WS4 Phase 4.6), but **no storefront code reads a `?code=` param** — grep for `searchParams.get('code')` / `[?&]code=` across `assets/js/*.js` returns nothing, and none of `getActiveSale`/`priceHTML`/`_activeSale` exist yet (all are new). Ledger 30 states as *settled* that "WS4 adds a small `checkout.js` prefill+apply (reusing the auto-apply path) so the link is honored," but WS4's actual phases (4.5.i / 4.6) only leave it as a `NEEDS-VERIFY` "flag for scope." So the coupon share-link feature is built on the admin side and consumed nowhere. **Fix:** add the `?code=` reader (prefill `#promo-code` + reuse the auto-apply path in `main.js`/`checkout.js`), or drop the copy-share-link affordance from v3.5 and update ledger 30.

### C4 — MEDIUM · shared-file coordination hazards in the two files edited by 2+ workstreams

- **Migration prefix collision.** Phase 2.3 authors `20260701000001_v3_5_scheduled_publish.sql` and Phase 7.2i authors `20260701000001_v3_5_drop_cart_holds.sql` — **identical prefix**; `supabase db push` orders by filename, so two equal prefixes apply non-deterministically. (The testing addendum's static gate already flags "renumber one," so it's caught downstream — but the IMPLEMENT ships the collision; renumber `drop_cart_holds` to `…0002`.) The third, `20260702000001_v3_5_activity_log.sql`, is fine.
- **`product-feed.ts` two service-role clients, two names.** WS2 Phase 2.6 names the service-role client `admin`; WS7 Phase 7.3a names it `supabaseAdmin`. Ledger 26 says define it **once**. Applied literally, the builder creates two identical clients (or a name clash). Standardize on one const and point both `publishDueScheduled` + `reconcileOrders` at it. (Current tree confirmed single publishable client — the merge is the delta.)

### C5 — LOW-MEDIUM · `active_sale` + the supersede sweep scan ALL active promotion codes (scale + determinism)

`handleActiveSale` (Phase 4.2.b) and the supersede loop (Phase 4.1.c) both iterate `stripe.promotionCodes.list({active:true, limit:100})` filtering on `coupon.metadata`. The store mints a unique `max_redemptions:1` promo code per newsletter/cart-recovery event (AR #21/#31), and those are **not** deactivated on 30-day expiry — so the `active:true` pool grows unbounded over the store's life. It's bounded by `SCAN_CAP 2000` + a 60s edge cache (fine for a low-volume one-of-a-kind store), but at scale the scan could slow or miss the owner_sale, and "newest wins" is not deterministic — `active_sale` returns the first list match, not guaranteed newest, if a best-effort supersede sweep partially fails. More robust and O(1): stash the active store-wide sale's promo id/code in `site_config` (same pattern as `orders_last_viewed_{env}`) and read that directly. Note-only for v3.5.

### C6 — LOW · dispatch-order note vs. phase disagree (harmless)

Ledger 25 says the GET dispatch gains `?_action=active_sale` "after the coupon branch," but Phase 4.2.a inserts it **before** the coupon branch. The `_action` values are mutually-exclusive string matches so order is irrelevant — but the coordination note and the phase contradict each other; align the wording.

---

## Things that correctly FIT (verified, so a later reviewer doesn't re-raise)

- **Budget:** 11/12 functions, 1 cron — every new capability (`active_sale`, `activity`, `seen`, refund/ship/log, `publishDueScheduled`, `reconcileOrders`) folds into an existing `api/*.ts`; no new file, no new `vercel.json` cron. ✓
- **Auth:** `active_sale` is public (shopper-facing, correct); `activity` uses `authorize()`, `seen`/refund/mark-ship use `requireAdmin`; no new auth surface. ✓
- **Stripe one-discount:** WS4 keeps `allow_promotion_codes:true` (`checkout.ts:105`) and auto-applies client-side via `applyPromotionCode`, never the server `discounts` param (they're mutually exclusive); a personal code *replaces* the sale code. Consistent with ledger 10. ✓
- **Idempotency:** webhook insert-as-claim (`webhook.ts:50`) + refund 409 guard (`orders.ts:281`) unchanged; WS3 only *adds* a mark-shipped 409 guard, WS7 only adds `expand:['data.price.product']` (`webhook.ts:165`) — a correct one-liner for #228. ✓
- **`shipping_address` (WS3 Phase 3.3):** the top-level `orders.shipping_address` column DOES exist (`initial_schema.sql:109`, written `webhook.ts:195`, returned `orders.ts:66`) — the IMPLEMENT already self-flags that the old locked-decision text ("only nested under customers, with a name") is contradicted by the code. Already surfaced; the either-source fallback is safe. ✓
- **`active_sale` `is_test`:** relies on the env-scoped Stripe key (test vs live), not a DB filter — correct, since the store-wide sale lives only in Stripe. ✓
- **Byte-anchors:** spot-checked across `products.ts`, `webhook.ts`, `orders.ts`, `checkout.ts`, `main.js`, `shop.js`, `product.js`, `product-feed.ts` — all within 1-3 lines of the doc hints; quoted CURRENT text matches. No wildly stale `file:line` pointers found.

---

## If you fix one thing

**Close the three-surface sold-policy loop (C1).** The build's headline invariant is "sold-policy honored identically in `computeState()`, the storefront buy-gate, and the webhook decrement," and it's the one thing every reviewer is told to check — yet the storefront third of it is never wired to `quantity`; it still keys off `available`, and no phase changes that. Decide (with Sean) whether the storefront migrates to `published && quantity>0` or keeps `available` with a server guard, then make the docs and the code say the same thing. C2 (the `is_test`/gating fix on `publishDueScheduled`) is the close second — it's a hard-invariant break with a trivial fix.

## Verdict

**NEEDS ANOTHER PASS (NARROW)** — the delta fits the system's budget, auth, idempotency, and Stripe one-discount model, but two localized, load-bearing integration issues (C1 storefront sold-gate never wired to `quantity`; C2 `publishDueScheduled` un-gated + `is_test`-hardcoded) plus a dead `?code=` share link (C3) must be resolved before build. All fixes are pinpoint and bounded — no systemic redesign.
