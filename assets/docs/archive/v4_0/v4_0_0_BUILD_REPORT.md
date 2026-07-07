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

## Build-time bug caught in verification (fixed)

- **The three v3.5 migrations were not applied to the remote database.** `supabase migration list` showed `20260701000001` (scheduled_publish), `20260701000002` (drop_cart_holds), `20260702000001` (activity_log) local-only; the dev DB was still at the v3.1 schema. This made `GET ?_action=activity` return **500** (no `activity_log` table), and the Account activity card silently fell back to mock `data.js` data. **Fixed:** `supabase db push` applied all three (additive: new nullable column, new table, the commented `drop_cart_holds` is a recorded no-op). Re-tested green — a fresh `createProduct` now logs `product.create` with `actor = dev@test.com`. *Process note: applying the migrations is a required deploy step; it was implicit in the preflight and should be explicit in the go-live runbook.*

## Verification status (on the dev preview)

**Verified green:** WS1 (routing → `/admin/products`, signed-out gate → `/admin/account`, real Supabase sign-in, env chip "Test", real `pk_test` key, account card) · WS2 surface (9 live rows, tabs Live/Drafts/Sold/Archived/All, 5-color LEDs, create-draft + logging) · WS4 (createCoupon `auto_apply`, `active_sale`, supersede, struck pricing everywhere with correct math, top bar, once-only popup, auto-apply discount attaches to the session, end-sale reverts) · WS6 (PDP structured spec fields, data-derived series filter) · WS8 (activity write+read+actor after the migration fix, Orders nav badge) · WS9 ("One of a kind" + Featured badges) · #219 probe.

**Not yet driven end-to-end (recommended follow-up):** WS5 media modal upload/reorder/re-role via the UI (code-verified + review-fixed, not UI-driven) · WS3 refund + mark-shipped-409 and WS7 even-split (#228) + cart-hold-removed (need a real test purchase) · WS2 scheduled-publish flip + WS7 reconciliation (**cron-gated — need `CRON_SECRET` on the preview + its value**) · the checkout-total display item above · the GPT-parity spot-check (human touchpoint in Em's ChatGPT).

## Go-live handoff (REQUIRED before dev → main / prod)

- **Set `CRON_SECRET` in the Production Vercel scope** — this build's `isCronRequest` gates BOTH the scheduled-publish flip and the daily reconciliation; unset, both are silently inert in prod (a scheduled piece never publishes, no error). Optionally set `RECONCILE_ALERT_EMAIL` (else falls back to `ORDER_NOTIFY_EMAIL`).
- **Apply the migrations on go-live** (they are now on the shared project, but confirm) and **run the commented `20260701000002_v3_5_drop_cart_holds.sql` DROP by hand** once the WS7 code is live and no `cart_holds` reference remains.
- **Run the legacy sold-row backfill** (`20260616000001` cutover `UPDATE`) on the LIVE catalog before enabling any % sale (zeroes `quantity` on `available:false` rows so the quantity-based sold gate is honest).
- **Flip the Custom GPT's Action server URL + auth to production** (it is currently pointed at the tester) and paste the shipped `v3_5_0_GPT_INSTRUCTIONS_TRIMMED.txt` + `v3_5_0_GPT_SCHEMA.txt` into Em's GPT.

## As-built doc-sync

Deferred to a **fresh agent** (per DEV_RULES → as-built doc-sync): walk the build-adjusted IMPLEMENT line-by-line (this report for deltas, code as tiebreaker) to bring `EVERLASTINGS_STORE.md`, `STORE_ADMINISTRATION.md`, `BRAND.md`, `GPT_SETUP.md`, `README.md` current. NOT done in this build session.
