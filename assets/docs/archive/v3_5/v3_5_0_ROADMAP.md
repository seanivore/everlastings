# Everlastings v3.5 — Roadmap

Consolidated from the 2026-06-26 testing pass. v3.3 is shipped (`main` @ `v3.3.0`, deploying to prod). Em previews on **dev** (test mode); the prod cutover is **deferred**, gated on her readiness. This is the working backlog — full rationale + code citations live in memory `project_v3_5_0_storewide_sales.md`; the admin redesign has its own brief (`v3_5_0_PORTAL_REQUIREMENTS.md`).

Task IDs reference the session task list.

---

## A. Go-live tail — the cutover bundle (run when Em's ready)

Not a today step. When Em wants live products:

- **#226 — Audit ALL Production env vars (SEANIVORE).** The migration drifted env **twice** (GPT `PRODUCT_API_KEY`, then `STRIPE_WEBHOOK_SECRET`). Highest risk: the **live webhook signing secret** — a stale one makes real purchases silently invisible (no order, no fulfillment, piece still shows available). Confirm the live webhook endpoint exists / is enabled / subscribed to `checkout.session.completed` + `payment_intent.succeeded` + `charge.refunded`, and its signing secret matches Vercel Production. Sweep the rest (live Stripe keys, live `PRODUCT_API_KEY`, Resend, Supabase, R2/Cloudflare, Shippo, GA4).
- **#227 — Webhook-failure alerting (immediate half).** Turn on Stripe's **native** webhook-failure email now (Stripe → Settings → Notifications; Stripe also auto-disables an endpoint after ~3 days failing). The robust reconciliation cron is in section B.
- **#212 — Switch the GPT to prod.** Schema server URL → `https://everlastingsbyemaline.com`; Auth → Production `PRODUCT_API_KEY`; Web Browsing on.
- **#214 — Live $1 buy + refund smoke test.** The only thing test mode can't prove (live keys, live webhook, receipt).
- **#215 — Hand off.** `v3_4_1_WELCOME_EM.md` + her logins.

Done: **#211** FF + tag `v3.3.0`, **#213** back on dev, **#207/#208/#209/#210** testing.

---

## B. v3.5 functional fixes (build on dev)

### Sales — automatic store-wide sale + on-site display (#219–#222)
- **#219 (PROBE FIRST):** confirm Stripe.js `applyPromotionCode()` fires reliably at Custom Checkout (`ui_mode:'custom'`) session init for the loaded bundle. The Custom Checkout docs are unreliable here — probe, document a fallback. Gates everything below.
- **#220:** represent the store sale as ONE owner coupon (`metadata.auto_apply='true'` + existing `source='owner_sale'`) + a known promo code (no new table). Storefront Custom Checkout **auto-applies that promo code** on load → shopper types nothing (feels code-free), field stays visible + **removable/replaceable**. Do NOT use the server `discounts` param (mutually exclusive with `allow_promotion_codes`; keep `allow_promotion_codes:true`). On-site: struck **%** sale prices on cards + product page (percentage sales only; `$`-off stays a checkout code). `setStoreSale`/`endStoreSale` on `api/products.ts`; public read of the active sale; `main.js` renders struck prices + cart/total reflect.
- **#221:** thin reusable **top bar** (free-shipping reminder today, sale line when active) + a **once-only** upper-right corner popup (brand-fitting, non-blocking, dismissible, `localStorage`-gated).
- **#222:** GPT/admin **parity** (set/end sale both surfaces); GPT instructions — state the one-discount-per-order reality plainly (stop the apologizing), add an **initiative nudge** (do reversible things, confirm only irreversible; do NOT add Stripe API docs to KNOWLEDGE — can't grant an endpoint); fold the shared-payment refund hardening here (see #228). Restore the Coupon/PromoCode/Discount vocabulary in `EVERLASTINGS_STORE.md`. DEV_RULES: the **admin-quality** rule + "a UI that hides/disables an action owes you the reason."

### Checkout integrity — remove the cart hold (#224, pre-cutover)
Remove the 15-min `cart_holds` reservation entirely (returns to the original no-reservation design). The hold self-locks an abandoning/retrying shopper for 15 min and mis-fired the apology coupon on a mere hold. Drop: `handleReserve` cart_holds query + conflict check + insert/delete (keep the availability check + subscriber upsert + prefill); `handleSession` hold check (keep the availability re-check); `webhook.ts` hold-cleanup; + a migration to drop the table. Without holds the sold-recovery apology fires only on real sold-outs (correct). The webhook never auto-refunded a true double-pay collision anyway → low-volume = negligible.

### Webhook / money integrity (#228, pre-cutover-leaning; #227 robust half)
- **#228 even-split:** `webhook.ts` `listLineItems(session.id,{limit:100})` doesn't expand the product → `li.price.product` is a string → the `supabase_id` lookup is skipped → `order.amount` falls back to `total/n`. Multi-item orders get wrong per-item amounts ($540 → $270/$270 vs real $295/$245). Fix: `listLineItems(session.id,{expand:['data.price.product'],limit:100})`.
- **#228 GPT shared-payment refund:** the refund code (`orders.ts:246+`) is sound; the GPT chose wrong params on a multi-item shared payment (refunded $30 of the wrong piece). Add GPT guidance (folds into #222): identify the NAMED piece's order line, default amount = that line, relist only the named piece, confirm clearly, never silently swap piece/amount.
- **#227 reconciliation cron:** compare Stripe completed checkout sessions vs the `orders` table daily → email Sean on any paid-session-without-order gap (ideally auto-replay). Catches every silent-gap cause. Do NOT email on raw signature-400s (bot noise).

### Storefront
- **Series filter:** `shop.js:72` compares hardcoded slugs (`portals-to-peace`…) against the free-text `series` field ("Portals to Peace") with an exact match → never matches. Slugify both sides AND reconcile the taxonomy (derive options from live series, or constrain the Series field).
- **Featured carousel (mobile):** `index.html:387` `.featured-carousel` is one `repeat(3,…)` grid + `overflow-x` → the 4th item wraps to a hidden coupled second row. Fix per Sean: **independent horizontal-scroll rows (Netflix-style)** — ≤5 = one row; >5 = ~3-per-row, each its own `overflow-x` scroller (decoupled). `populateFeatured` chunks into separate `.featured-row` elements.
- **Order-ID on `/complete`:** `complete.js:36` shows the raw `cs_…` Stripe session ID as "Order ID" (not test-gated → shows `cs_live_…` in prod). Drop the line (the Stripe receipt has the reference) or show a short friendly reference.

### Research
- **#225 Buy-on-tile:** research whether a tile-level "Buy" lifts conversion for considered/emotional, one-of-a-kind, low-frequency purchases (generic e-comm data may not transfer; counter-pull = one-of-a-kind scarcity favors impulse). Build only if significant. Internal decision — NOT an Em question.

---

## C. Content Creator Portal redesign (#229)

The big one — its own brief: **`v3_5_0_PORTAL_REQUIREMENTS.md`**. Redesign `/admin` into a polished, **mobile-first**, intent-based, productizable "Content Creator Portal." Run via a multi-round design-research **funnel** in a fresh session → design direction + renderable vanilla component concepts → build plan → gap reviews (Sean's Agent-SDK automation) → execute. Versioning loose (packaged module that folds into the build).

---

## Also folding into v3.5
- The deferred **homepage hero** (#223) — the Zapfino/FX hero, gated on Em's read (`v3_4_1_HERO_NEXT.md`).
- **Em's first-real-use feedback** as it arrives.

## Process
Touches checkout + live money → Sean's normal rigor (self gap pass → 2-subagent breadth → cold A/B/C(/D) gap-review loop → fold → bump → execution copy). The redesign additionally tests the new Agent-SDK gap-review automation.
