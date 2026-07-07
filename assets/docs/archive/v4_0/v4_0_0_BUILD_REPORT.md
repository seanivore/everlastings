# v4.0.0 Build Report

**Deviations-from-plan + build-time findings only** (lean = trustworthy). Everything not listed here was built exactly as the IMPLEMENT / addenda specified. Built + pushed to `dev` (14 build commits `e190d78…97a03e0`); verified on the `everlastings-git-dev-seanivore.vercel.app` preview.

## Build execution

Delegated by **file ownership** (not workstream) because five files are edited by multiple workstreams — one agent per file/group applying the fixed stacked-edit order (`api/products.ts` WS2→WS4→WS8, etc.), so no two agents ever touched the same file. Every anchor was re-verified against the tree; **backend `api/*.ts` anchors were byte-clean, the polished `admin/` surface apps had drifted** (line numbers moved; the quoted CURRENT text was the anchor) exactly as the IMPLEMENT warned. Static gate (tsc-clean · 11 functions · 1 cron · migrations monotonic · commented DROP · GPT `.txt` 7978/8000) held after every edit and at the final fold.

## Deviations from the literal plan (all reasoned; none change scope)

1. **WS5 media modal — `applyMedia` rebuilds `p.images` from the final mItems** instead of the spec's literal "splice each POST response into `p.images` sequentially." Reason: the pure in-place splice can't cleanly include fresh uploads or express the array-vs-column filename split, and it risked the duplicate-hero-on-PDP bug. The independent WS5 review validated the rebuild preserves every §5.4c.i invariant (sequential gallery NN, no duplicate hero, no orphans, partial-failure persistence, idempotent retry).
2. **WS5 — `seo_thumbnail` preserved unless the `share` role is explicitly added/removed** (the prototype blanked it whenever a hero existed and no share role was set). Reason: `seo_thumbnail` is normally a separate cropped file not present in `images[]`, so the old behavior would silently clobber a GPT/admin-set share image on every Apply. Review-validated as necessary, not just safe.
3. **WS3 — the refund Relist switch now emits `l.product_id`, not the design's `l.id`.** The backend matches `relist_product_ids` against `product_id` (`orders.ts .in('product_id', relistIds)`); the design mock's switch carried the order-line id, which would have relisted nothing. This is the data-shape reconciliation §3.1 calls for ("verified against the /admin contract").
4. **WS4 checkout.js — the #219 probe resolved to the clean base path.** Probe on the loaded Basil bundle: apply-at-init succeeds, the change listener sees the discounted `session.total` ($195→$156 on a 20% sale), `removePromotionCode` exists, and a second code **REPLACES** the first ($156→$175.50 applying 10% over 20%). So the base §4.4/§4.7 (auto-apply on init; the keyword field naturally swaps the sale for a personal code) shipped — no STACK-AND-ERROR fallback needed.
5. **WS8 §8.2b (Sold-tab `data-alert` removal) was MOOT** — Claude Design had already removed the `unseenOrders` stub + the Sold-chip alert in the polished set. Skipped, as instructed.

## Known limitations / items surfaced (not blockers)

- **WS5 #6 — share/checkout role checkboxes don't round-trip in the modal.** Because share/checkout are stored as separate cropped column files (`seo_thumbnail-{slug}` / `checkout_image-{slug}`) whose URLs never equal a hero/gallery URL, the modal's role-by-URL match always shows them unchecked on reopen, and an already-set share/checkout image can't be *cleared* from the modal. Setting one works and is visible; changing it = re-check the role on any image. A clean fix needs a data-model change to `ROLE_PATTERN`/cropping (out of scope). Left documented per the review.
- **WS4 — the `/checkout` page's custom total line shows the pre-discount amount.** The store-wide sale auto-applies correctly — the Stripe session carries `discount=$39 / total=$156` on a $195 item (confirmed live), so the shopper is charged the discounted amount, and struck pricing renders correctly on shop/PDP/cart. But the custom `[data-checkout-total]` element stays at the cart total because the `change`-event session shape doesn't expose `total.total.amount` the way `checkout.session()` does (the optional-chaining skip — this appears **pre-existing** to the original checkout.js, not a v4.0.0 regression). **NEEDS-VERIFICATION:** a real test purchase to confirm the final charge, then decide whether to point the change listener at `checkout.session()`. (The financial-data-redacting browser tool prevented a fully definitive in-page read.)
- **Series `?series=` deep-links** in the header/footer nav + `index.html` "browse by series" were not realigned to live-catalog slugs (the code fix — data-derived filter + slugify — is in; the nav-link realignment needs the live catalog's distinct series values, a soft-fail otherwise). Verification-wave / go-live item.
- **Account page "Site home" link** points at the hardcoded prod domain on the preview (the env-aware `P.siteUrl()` swap covered the Products rail's View-Site, not this link). Minor render-tune.

## Build-time bugs caught in verification (fixed)

1. **The three v3.5 migrations were not applied to the remote database.** `supabase migration list` showed `20260701000001` (scheduled_publish), `20260701000002` (drop_cart_holds), `20260702000001` (activity_log) local-only; the dev DB was still at the v3.1 schema. This made `GET ?_action=activity` return **500** (no `activity_log` table), and the Account activity card silently fell back to mock `data.js` data. **Fixed:** `supabase db push` applied all three (additive: new nullable column, new table, the commented `drop_cart_holds` is a recorded no-op). Re-tested green — a fresh `createProduct` now logs `product.create` with `actor = dev@test.com`. *Process note: applying the migrations is a required deploy step; it was implicit in the preflight and should be explicit in the go-live runbook.*
2. **The refund "Relist" switch flipped order status but never restocked the piece** (`47b199f`). The WS3 port kept the refund POST + `relist_product_ids` and showed "N relisted", but dropped the restock step — so a relisted piece stayed `quantity:0 / available:false` (not back on sale). The backend refund deliberately only flips order status + RETURNS the pieces; the caller owns the restore, which the original `admin.js relistPiece` (:1080-1122) and the GPT instructions both do (`unarchive-if-archived` + `PUT {available:true, quantity+1}`). **Fixed:** after the refund, each returned piece is restocked automatically (the switch was the per-piece intent) — `quantity+1` so `available` follows the `quantity>0` rule; a restock failure surfaces in the toast. Verified live: a real 2-piece purchase → refund one piece with relist → the restock PUT restores it to `quantity:1 / available:true`. Caught by Sean's "restock should add +1 to the quantity."
3. **The WS8 seen/unseen "clear the Orders blink on view" was unwired** (caught during the as-built doc-sync). The `POST /api/orders?_action=seen` endpoint existed and stamped `site_config.orders_last_viewed_{env}`, but no front-end called it — so the Orders-nav blink tracked the live needs-shipping count and never cleared on viewing Orders (Sean noticed the persistent flashing "2"). **Fixed:** `orders-app.js markSeen()` fires the seen POST once on Orders view (after the initial load) + refreshes the nav signal, so the blink clears on view and re-lights only for a genuinely newer order.

## Verification status (on the dev preview)

**Verified green on the live preview:**
- **WS1** — `/admin` → `/admin/products`, signed-out gate → `/admin/account`, real Supabase sign-in (dev@test.com), env chip "Test", real `pk_test` key + account card.
- **WS2** — Products surface (9 live rows, tabs Live/Drafts/Sold/Archived/All, 5-color LEDs), create-draft + archive.
- **WS4** — full store-wide-sale lifecycle: `createCoupon {auto_apply}` → `active_sale` → struck pricing on shop/PDP/cart with correct math ($195→$156 etc.) → top bar + once-only popup → **auto-apply attaches the discount to the Stripe session (`discount=$39/total=$156` confirmed) + a second code REPLACES** → end-sale reverts everywhere.
- **WS6** — PDP structured spec fields render (dimensions/weight/materials/care/shipping/artist-note), data-derived series filter, `/complete` shows **no** raw `cs_` id.
- **WS7 #228 even-split** — a **real 2-piece unequal-price purchase** ($310 + $88) wrote `orders` rows carrying the **real per-item amounts $310 and $88**, NOT an even $199/$199 split.
- **WS3 refund** — a real refund of one piece: $88 refunded via Stripe, that piece → refunded + **restocked to quantity:1/available:true** (after the `47b199f` fix), the sibling untouched, `order.refund` logged.
- **WS8** — activity log write+read+actor (`resolveActor` JWT→email + `X-Actor:cron`→cron both verified), Orders nav badge (needs-shipping count).
- **WS9** — "One of a kind" + Featured badges.
- **Cron gate + WS2 scheduled-publish** — `CRON_SECRET` set on Preview; an **authed** `/api/product-feed` hit ran `publishDueScheduled` (a past-due draft attempt logged `product.schedule_skipped` by actor `cron`), while **unauthed + wrong-secret** hits ran nothing (gate holds). WS7 reconciliation runs in that same awaited gate.
- **#219 probe** + `checkout.js` auto-apply/share-code/struck-total.

**Not driven end-to-end (recommended follow-up):**
- **WS5 media modal** upload/reorder/re-role via the UI — code-verified + independently review-fixed, not UI-driven (Stripe-free, low risk).
- **A fresh refund-with-relist** to confirm the `47b199f` restock loop end-to-end — the restock *mechanism* (`PUT {available:true, quantity+1}`) is verified; one more real refund would confirm the loop fires automatically.
- **WS7 reconciliation gap-email** — the job runs in the verified cron gate; the email-on-orphan-session output wasn't separately simulated.
- **WS3 mark-shipped-409** on a refunded order (backend guard verified by code; not UI-driven).
- **The `/checkout` total display** item above (money correct; display-only).
- **The GPT-parity spot-check** — the one human touchpoint, in Em's ChatGPT.

## Go-live handoff (REQUIRED before dev → main / prod)

- **Set `CRON_SECRET` in the Production Vercel scope** — this build's `isCronRequest` gates BOTH the scheduled-publish flip and the daily reconciliation; unset, both are silently inert in prod (a scheduled piece never publishes, no error). Optionally set `RECONCILE_ALERT_EMAIL` (else falls back to `ORDER_NOTIFY_EMAIL`).
- **Apply the migrations on go-live** (they are now on the shared project, but confirm) and **run the commented `20260701000002_v3_5_drop_cart_holds.sql` DROP by hand** once the WS7 code is live and no `cart_holds` reference remains.
- **Run the legacy sold-row backfill** (`20260616000001` cutover `UPDATE`) on the LIVE catalog before enabling any % sale (zeroes `quantity` on `available:false` rows so the quantity-based sold gate is honest).
- **Flip the Custom GPT's Action server URL + auth to production** (it is currently pointed at the tester) and paste the shipped `v4_0_0_GPT_INSTRUCTIONS_TRIMMED.txt` + `v4_0_0_GPT_SCHEMA.txt` (in `assets/docs/archive/v4_0/`) into Em's GPT.

## As-built doc-sync

Deferred to a **fresh agent** (per DEV_RULES → as-built doc-sync): walk the build-adjusted IMPLEMENT line-by-line (this report for deltas, code as tiebreaker) to bring `EVERLASTINGS_STORE.md`, `STORE_ADMINISTRATION.md`, `BRAND.md`, `GPT_SETUP.md`, `README.md` current. NOT done in this build session.
