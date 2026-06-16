# v3.1.0 Implementation Plan — management parity: refunds + coupons-in-admin · chat-attach upload · admin polish · homepage experience

**Initiative**: A fresh dev cycle (built/tested on `dev`, pushed live only when ready) that (1) closes the two store-management parity gaps surfaced by an audit — refunds (missing in both /admin and the GPT) and coupons (missing in /admin) — (2) promotes the two `v3_0_0` briefs (chat-attach image upload; homepage experience), (3) makes the /admin media UX (role assignment + MP4 config) clear and easy, and (4) polishes /admin toward a reusable, brand-neutral template aesthetic.
**Revision driven by**: initial draft. Promotes `v3_0_0_GPT_DIRECT_IMG_UPLOAD.md` + `v3_0_0_HOMEPAGE_EXPERIENCE.md`; folds the v2.1 testing finds (poster = no-fix doc clarification) + the /admin↔GPT parity audit.
**Required reading first**: `assets/docs/EVERLASTINGS_STORE.md` · `README.md` · THIS doc + its addenda (`…_ADDENDUM_DESIGN.md`, `…_ADDENDUM_TESTING.md` once split) · the two `v3_0_0` briefs (source) · `.agent/DEV_RULES.md`.
**If you find missing context**: `EVERLASTINGS_STORE.md` is living — confirm with Sean and update it; don't paper over the gap here.

> **Status / depth.** Functional workstreams **1–3 are byte-anchored** (exact CURRENT/NEW blocks — line numbers are hints, the quoted CURRENT text is the anchor; reconcile if it drifts). Workstreams **4–5 are spec'd** in `v3_1_0_ADDENDUM_DESIGN.md` as concrete executable design (the `:root` token system + P0–P7; Lottie title + old-film hero) — design ships as concrete-default + render-tune per DEV_RULES, with the small mechanical remainder noted in each. The verification plan is `v3_1_0_ADDENDUM_TESTING.md`. **Next: the gap-review gate** — the in-house breadth pass → cold A/B/C/D fresh instances — has **not** run yet.

---

## ⭐ Product North Star / thesis (the lens for every decision)

**Minimize Em's friction to manage her store** — the GPT should do anything a capable agent could on her behalf. **NEW standing principle (the parity rule):** *every management capability must be equally doable in **/admin** AND the **GPT**.* We can't rely on the GPT always being there, and /admin is easier for some moods. Judge every gap by this thesis and by *"can Em actually do it?"* — never by doc-internal consistency.

## Parity audit (what's already equal, what's not)

- **At parity already:** create / edit / publish / discard / archive / unarchive · available-sold · quantity · price-rotation · list-orders · mark-shipped · **media upload** — confirmed: the /admin upload control POSTs multipart to `/api/upload` and runs the *same* Cloudinary per-role crop → R2/CDN pipeline as the GPT/by-link path (`assets/js/admin.js:358-400` → `api/upload.ts:220-313`). Admin uploads are transformed + CDN-hosted identically.
- **Gap 1 — coupons:** present in the GPT, **missing in /admin** → Workstream 2 adds a /admin coupon UI over the existing endpoints.
- **Gap 2 — refund:** **missing in both** → Workstream 1 adds `refundOrder` to both surfaces.

## Invariants (hold in every phase)

- **CommonJS / tsc-clean.** `npx tsc --noEmit -p tsconfig.json` clean after each TS edit.
- **No new Vercel function.** Refund folds into the existing `api/orders.ts` (new `POST`) via a `vercel.json` rewrite; chat-attach folds into `api/upload.ts`. Function count unchanged.
- **`is_test` isolation holds.** Scope every order/refund lookup by `isTest` (`api/_lib/env.ts`) so a test-env action can never touch a live order; Stripe secret key is already env-scoped (test vs live).
- **Auth unchanged.** `requireAdmin` (orders) / `authorize` (products) already accept `PRODUCT_API_KEY` **or** an admin Supabase JWT — both surfaces, no new auth.
- **Refund is owner-confirmed, never auto-issued.** /admin: `window.confirm`; GPT: an explicit confirm beat before calling `refundOrder`.
- **Refund never auto-relists** (the safe default — a damaged-item refund must not silently re-list the piece). Relisting is a separate, **state-aware**, confirmed step.
- **Storefront brand untouched.** /admin gets neutral/template styling only (NOT the Everlastings plum/lavender/serif) — it's the reusable management-layer UI.
- **Reduced-motion preserved.** The hero's `prefers-reduced-motion` fallback (`styles.css:376`) stays; any new homepage animation respects it; the real `<h1>` stays for SEO/a11y.
- **The go-live version is untouched.** v3.1.0 ships on its own, separately, when Sean chooses.

---

## Roadmap (coarse direction — NOT a build queue)

1. **Refund** — `refundOrder` in /admin + GPT (confirm → full refund → state-aware relist prompt).
2. **Coupons in /admin** — a coupon UI over the existing `/api/coupons` endpoints (no backend change).
3. **Chat-attach upload + admin upload UX** — fold `v3_0_0_GPT_DIRECT_IMG_UPLOAD.md`; add admin upload previews, remaining-role hints, and a structured MP4 editor.
4. **Admin polish** — clean, professional, **brand-neutral** redesign (NOT august.style-tokened) + /admin↔GPT parity, nav, and product-list state-filter fixes.
5. **Homepage experience** — `text-to-lottie` title write-on + `hyperframes` old-film/lens-flare hero; from research subagents.

## Locked decisions (confirmed — the builder chooses nothing)

**Refund**
- **Full refund only.** Partial refunds stay in the Stripe dashboard (matches the webhook's full-only status flip). The GPT/admin say so.
- **Route:** a new `POST` handler in `api/orders.ts` (it has only `GET` + `PATCH` today, and `PATCH` hard-requires `tracking_number`, so refund cannot overload it). Rewrite `/api/orders/:id/refund` → `/api/orders?id=:id&_action=refund`, placed **before** the existing `/api/orders/:id` rewrite (`vercel.json:12`).
- **Stripe call:** `stripe.refunds.create({ payment_intent }, { idempotencyKey: \`refund-${id}\` })` — reuses `api/_lib/stripe.ts` (`import { stripe }`). Idempotency key off the order id so a retry can't double-refund.
- **Guards:** order not found → 404; `status === 'refunded'` → 409 (already refunded); missing `stripe_payment_intent` → 409; order fetched scoped by `isTest`.
- **Status:** the action optimistically sets `orders.status = 'refunded'` for instant UI; the `charge.refunded` webhook (`api/webhook.ts:60-89`) also flips it on Stripe's event (idempotent — both set the same value).
- **Relist is NOT automatic.** The action returns the product's relist state (`{ product_id, slug, available, archived_at }`) so the caller can prompt. Relist path is **state-aware:** `editProduct {available:true}` if published-but-sold, `unarchiveProduct` if archived.

**Coupons in /admin** — reuse the existing endpoints verbatim: create + list via `/api/coupons` (`?_action=coupon`, `products.ts:689-798`), end via `/api/coupons/deactivate` (`?_action=coupon_deactivate`, `products.ts:800-829`). Expose the **full** surface for true parity: `type` (percent/amount), `value`, `code`, `product_ids` (these are **`stripe_product_id`**, not the Supabase id — the UI maps published products → their `stripe_product_id`), `min_amount`, `expires_at`, `max_redemptions`; plus the list (with `times_redeemed` / scope / expiry) and deactivate-by-code. **Human-friendly dates (from `FEEDBACK_COUPON_v2_1_0.md` — the GPT misread a raw Unix `expires_at` as July when the coupon was correctly set to June; the coupon was never wrong):** the one backend add — `handleCouponList` (+ the `createCoupon` response) returns a human `expires_display` (e.g. "Ends after Sun, Jun 21, 2026", store TZ America/New_York) **alongside** the raw `expires_at`, so the GPT never decodes a timestamp; plus a GPT **read-back-before-create** beat and a date input (not a raw timestamp) in the /admin coupon UI. *(Optional stretch: `campaign_note`/`intended_dates` in the coupon `metadata`.)*

**Chat-attach upload** — exactly per `v3_0_0_GPT_DIRECT_IMG_UPLOAD.md` (fold its phases in): a new `uploadImages` op taking `openaiFileIdRefs` into `api/upload.ts`, positional role default (`hero`, then `gallery-0N`), the by-link `uploadImage` kept as the backstop. **Admin upload UX:** preview thumbnails on upload, a remaining-roles hint (need 1 hero + 5 gallery), a **structured MP4 editor** (pick an uploaded `video-0N` url → GIF-like vs click-to-play preset → poster image → alt) replacing the raw-JSON `p-media` textarea (`admin/index.html:159`), and **auto-infer `skip_transform`** from the file's MIME so the checkbox stops being a footgun. **Alt text (GPT skips it on ALL images today — the instructions never mention it, `v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt:6`):** require the GPT to generate descriptive `alt` per image + `thumbnail_alt`, carried through `uploadImages` / createProduct `images[]`. **Filename/role (clarification, not a rename):** `upload.ts` names files `{role}-{slug}.{ext}` server-side from the `role` param, and the frontend derives an image's role from that filename prefix (`product.js:415` gallery, `:576` hero) — there is no stored role field — so passing the *correct role* is load-bearing. GPT instructions state plainly it assigns *roles* (never invents or renames a filename); the chat-attach `roles[]`/positional mapping must be reliable.

**Admin polish** — clean, professional, **genuinely polished + smart, high-appeal** (it can have a vibe). Brand-**neutral**: NOT Everlastings-branded and **not** anchored to august.style tokens (Sean's branding shifts too often to matter) — the bar is "looks excellent + ports to any future client," not "matches a palette." Two fronts, in order: (1) full /admin↔GPT parity made obvious, then (2) make it pleasant. New gaps (`FEEDBACK_ADMIN_v2_1_0.md`): confusing in-admin back-nav (the browser Back button leaves /admin → add a clear "← Products" + obvious tab return) and a product-list **state-filter** (live/draft/sold/archived, like the orders subtabs). The addendum's neutral-slate + indigo-slate accent is the working default to *refine*.

**Homepage** (full spec in `…_ADDENDUM_DESIGN.md` §5) — Lottie title write-on via **lottie-web SVG** + outline-path trim-draw; the real `<h1>` stays (SEO/SR) with the Lottie as `aria-hidden` decoration and a reduced-motion fallback to the static title. Old-film hero = **RESOLVED: build-time re-rendered MP4** (HyperFrames `warm-grain`; runtime-via-HyperFrames doesn't exist, and a hand-rolled shader is the fragile path). Ship via a **versioned CDN key** (current objects are `immutable, max-age=1yr`) + 3 URL edits in `index.html`; re-grade the poster to match; all v2.1 parallax/overlay/spotlight/edge-glow + reduced-motion layers preserved.

---

## Imminent slice — Workstream 1: Refund (detailed)

> **Byte-anchored.** Each phase quotes a **CURRENT** block (the locator) + a **NEW** block. Line numbers are hints; the quoted CURRENT text is the anchor — if it doesn't match the working tree byte-for-byte, STOP and reconcile. Run `npx tsc --noEmit` clean after the TS edits.

**Phase 1.1 — `api/orders.ts`: import Stripe + add the `POST` refund handler.**

*1.1a — add the import.* **CURRENT (`api/orders.ts:5-8`):**
```ts
import { corsHeaders, preflight } from './_lib/cors';
import { requireAdmin } from './_lib/adminAuth';
import { isTest } from './_lib/env';
import { sendEmail, trackingEmailHtml, trackingUrl } from './_emails/index';
```
**NEW (add the stripe import):**
```ts
import { corsHeaders, preflight } from './_lib/cors';
import { requireAdmin } from './_lib/adminAuth';
import { isTest } from './_lib/env';
import { stripe } from './_lib/stripe';
import { sendEmail, trackingEmailHtml, trackingUrl } from './_emails/index';
```

*1.1b — append the handler after the `PATCH` export.* **CURRENT (the end of `PATCH`, `api/orders.ts:237-238`):**
```ts
  return jsonResponse(request, { ok: true, order: stamped, email_sent: true });
}
```
**NEW (same, then the new function):**
```ts
  return jsonResponse(request, { ok: true, order: stamped, email_sent: true });
}

// POST /api/orders/:id/refund  (vercel rewrite → ?id=:id&_action=refund) — owner-issued FULL refund.
// Stripe also fires charge.refunded (webhook.ts:60) which flips status; we set it optimistically here
// for instant admin/GPT feedback — idempotent, both write 'refunded'. Partial refunds stay in Stripe.
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  const url = new URL(request.url);
  if (url.searchParams.get('_action') !== 'refund') {
    return jsonResponse(request, { error: 'Unknown action' }, 400);
  }
  const id = url.searchParams.get('id') ?? '';
  if (!id || !UUID_RE.test(id)) {
    return jsonResponse(request, { error: 'Invalid order id' }, 400);
  }

  const { data: order, error: loadErr } = await supabase
    .from('orders')
    .select('id, status, stripe_payment_intent, products(id, slug, title, available, archived_at)')
    .eq('id', id)
    .eq('is_test', isTest)
    .single();
  if (loadErr || !order) return jsonResponse(request, { error: 'Order not found' }, 404);
  if (order.status === 'refunded') {
    return jsonResponse(request, { error: 'This order is already refunded.' }, 409);
  }
  if (!order.stripe_payment_intent) {
    return jsonResponse(request, { error: 'This order has no payment to refund.' }, 409);
  }

  try {
    await stripe.refunds.create(
      { payment_intent: order.stripe_payment_intent as string },
      { idempotencyKey: `refund-${id}` },
    );
  } catch (err) {
    console.error(`Refund failed for order ${id}:`, err);
    return jsonResponse(request, { error: 'Stripe refund failed — check the Stripe dashboard.' }, 502);
  }

  // Optimistic flip (the webhook will also set it). Non-fatal if it lags — the refund already succeeded.
  const { error: updErr } = await supabase.from('orders').update({ status: 'refunded' }).eq('id', id);
  if (updErr) console.error(`Refund status flip lagged for ${id}:`, updErr.message);

  const p = (order as unknown as {
    products?: { id: string; slug: string; title: string; available: boolean; archived_at: string | null };
  }).products ?? null;
  return jsonResponse(request, {
    ok: true,
    status: 'refunded',
    relist: p
      ? { product_id: p.id, slug: p.slug, title: p.title, available: p.available, archived: !!p.archived_at }
      : null,
  });
}
```
*(`UUID_RE` `:10`, `jsonResponse` `:38`, `isTest` already imported. The `products(...)` embed returns a to-one object, read the same way the GET does (`order.products?.title`). `tsc --noEmit` clean — verify at build.)*

**Phase 1.2 — `vercel.json`: the refund rewrite (more specific path first).** **CURRENT (`vercel.json:12`):**
```json
    { "source": "/api/orders/:id", "destination": "/api/orders?id=:id" },
```
**NEW (insert the refund line directly above it):**
```json
    { "source": "/api/orders/:id/refund", "destination": "/api/orders?id=:id&_action=refund" },
    { "source": "/api/orders/:id", "destination": "/api/orders?id=:id" },
```

**Phase 1.3 — GPT schema (`v2_0_0_GPT_SCHEMA.txt`): add the `refundOrder` op.** **CURRENT (the end of `markShipped` — the file's last lines, `:334-337`):**
```yaml
                properties:
                  ok: { type: boolean }
                  email_sent: { type: boolean }
```
**NEW (same, then append the new path):**
```yaml
                properties:
                  ok: { type: boolean }
                  email_sent: { type: boolean }
  /api/orders/{id}/refund:
    post:
      operationId: refundOrder
      summary: Issue a FULL refund on an order via Stripe (emails the buyer automatically) and mark it refunded. Returns the piece's relist state — a refund does NOT relist it. Partial refunds are done in the Stripe dashboard, not here.
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
          description: The order UUID (from listOrders).
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                reason: { type: string, description: "Optional note, e.g. 'Customer requested' or 'Damaged in transit'." }
      responses:
        '200':
          description: Refund issued; order marked refunded. `relist` carries the piece's current state so you can offer to re-list it.
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  status: { type: string }
                  relist: { type: object }
```
*(`summary` ≈ 230 chars, under the 300 cap. The path sits at 2-space indent like `/api/orders/{id}:` `:307`.)*

**Phase 1.4 — GPT instructions (`v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt`): flip REFUNDS + a poster aside.**

*1.4a — REFUNDS.* **CURRENT (`:23`):**
```
REFUNDS: you can SEE order status but have NO refund Action. Walk her through Stripe (Payments -> find the payment -> Refund); Stripe emails the buyer. Stripe changes its dashboard, so if unsure of the current steps USE WEB SEARCH first. A full refund flips the order's status to "refunded" on its own; a partial one won't show (tell her to check Stripe). A refund does NOT relist the piece: getProduct, then editProduct {available:true} if still published-but-sold, or unarchiveProduct if archived. Revenue/payouts live in Stripe; point her there.
```
**NEW:**
```
REFUNDS: refundOrder {id, reason?} issues a FULL refund via Stripe (it emails the buyer) and marks the order refunded. CONFIRM FIRST: read back the piece + amount + buyer ("Refund <buyer> $X for <product>? This can't be undone."). It returns `relist` (the piece's state); a refund does NOT relist it, so ASK "Want it back up for sale, or leave it down?" If yes: editProduct {available:true} when relist.available is false (published-but-sold), or unarchiveProduct when relist.archived. PARTIAL refunds aren't supported here -> walk her through Stripe (Payments -> find the payment -> Refund; USE WEB SEARCH if unsure of the current steps). Revenue/payouts live in Stripe.
```

*1.4b — poster aside (the v2.1 testing clarification).* **CURRENT (`:25`):** `…click-to-play with sound (the default; she can add a still "poster"). Set the media flags accordingly.` → **NEW:** `…click-to-play with sound (the default; she can add a still "poster" — the image shown before the video plays). Set the media flags accordingly.`

**Phase 1.5 — `/admin`: refund button + confirm + in-place state-aware relist** (`assets/js/admin.js`; order cards are built in `buildOrderCard`).

*1.5a — the button, in the order-info block.* **CURRENT (`admin.js:770-771`):**
```js
      ${formHtml}
      <div class="order-msg" style="margin-top:6px;font-size:13px"></div>
```
**NEW (a Refund button, or a Refunded pill when already refunded):**
```js
      ${formHtml}
      ${order.status === 'refunded'
        ? '<p style="margin-top:6px"><span class="pill unsent">Refunded</span></p>'
        : '<button type="button" class="refund-order" style="margin-top:6px">Refund order</button>'}
      <div class="order-msg" style="margin-top:6px;font-size:13px"></div>
```

*1.5b — wire it, after the resend handler.* **CURRENT (`admin.js:799-804`):**
```js
  const resendBtn = card.querySelector('.resend-tracking');
  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      submitShip(order.id, order.tracking_number, order.tracking_carrier, card, true);
    });
  }
```
**NEW (append a refund-button handler):**
```js
  const resendBtn = card.querySelector('.resend-tracking');
  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      submitShip(order.id, order.tracking_number, order.tracking_carrier, card, true);
    });
  }

  const refundBtn = card.querySelector('.refund-order');
  if (refundBtn) {
    refundBtn.addEventListener('click', () => {
      const confirmed = window.confirm(
        `Refund ${customerEmail || 'the buyer'} ${totalLabel} for "${productTitle}"? This issues a full Stripe refund and can't be undone.`,
      );
      if (!confirmed) return;
      submitRefund(order.id, card);
    });
  }
```

*1.5c — the two functions, beside `submitShip`.* **CURRENT (the close of `submitShip`, `admin.js:830-832`):**
```js
    buttons.forEach((b) => { b.disabled = false; });
  }
}
```
**NEW (same, then add `submitRefund` + `relistPiece`):**
```js
    buttons.forEach((b) => { b.disabled = false; });
  }
}

async function submitRefund(orderId, card) {
  const msg = card.querySelector('.order-msg');
  msg.textContent = 'Issuing refund...';
  const buttons = card.querySelectorAll('button');
  buttons.forEach((b) => { b.disabled = true; });
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/refund`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    msg.textContent = 'Refunded.';
    const r = body.relist;
    if (r && (r.available === false || r.archived)) {
      if (window.confirm(`Refunded. Put "${r.title}" back up for sale?`)) {
        await relistPiece(r, msg);
      }
    }
    setTimeout(loadOrders, 800);
  } catch (err) {
    msg.textContent = `Failed: ${err.message}`;
    buttons.forEach((b) => { b.disabled = false; });
  }
}

// archived → unarchive; published-but-sold → editProduct {available:true}. Mirrors the admin's own
// product-mutation calls: PUT /api/products?id=… (admin.js:474) and POST /api/products/unarchive (:634).
async function relistPiece(r, msg) {
  try {
    const res = r.archived
      ? await fetch('/api/products/unarchive', {
          method: 'POST',
          headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: r.product_id }),
        })
      : await fetch(`/api/products?id=${encodeURIComponent(r.product_id)}`, {
          method: 'PUT',
          headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ available: true }),
        });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    msg.textContent = 'Refunded + relisted.';
  } catch (err) {
    msg.textContent = `Refunded, but relist failed (${err.message}) — relist it from the product editor.`;
  }
}
```
*(`authHeader` / `loadOrders` / `centsToDollars` / `escapeHtml` already exist in `admin.js`; `customerEmail`, `totalLabel`, `productTitle` are already in `buildOrderCard`'s scope.)*

**Phase 1.6 — docs (as-built, after the build):** `STORE_ADMINISTRATION.md` refund section (now "issue it in /admin or via the Sunkeeper; it asks about relisting") + `GPT_SETUP.md` + `EVERLASTINGS_STORE.md` Stripe-sync note + test-script **R15** flips from "can't issue refunds" → "issues + asks about relisting." (Do these in the as-built phase to avoid mid-build mixed truth.)

## Workstream 2 — Coupons in /admin (detailed)

**Phase 2.1 — /admin Coupons UI.** A 3rd tab over the existing `/api/coupons` endpoints (GET list · POST create · POST `/api/coupons/deactivate`). Reuses `setStatus`/`authHeader`/`escapeHtml`/`centsToDollars`/`dollarsToCents` + the `.product-form`/`.row-3`/`.field`/`.form-actions` classes. The `.tab-btn` loop (`admin.js:143`) auto-wires the new button; `switchTab`/`refreshActiveTab` need the coupons branch.

*2.1a — the tab button.* **CURRENT (`admin/index.html:104-107`):**
```html
        <div class="tabs">
          <button class="tab-btn active" data-tab="products">Products</button>
          <button class="tab-btn" data-tab="orders">Orders</button>
        </div>
```
**NEW:**
```html
        <div class="tabs">
          <button class="tab-btn active" data-tab="products">Products</button>
          <button class="tab-btn" data-tab="orders">Orders</button>
          <button class="tab-btn" data-tab="coupons">Coupons</button>
        </div>
```

*2.1b — the section (after `#tab-orders`).* **CURRENT (`admin/index.html:256-257` — the orders `</section>` then the `.container` close):**
```html
        </section>
      </div>
```
**NEW:**
```html
        </section>

        <section id="tab-coupons" class="hidden">
          <div id="coupons-status"></div>
          <form id="coupon-form" class="product-form">
            <div class="row-3">
              <label class="field"><span>Discount</span>
                <select id="c-type"><option value="percent">% off</option><option value="amount">$ off</option></select>
              </label>
              <label class="field"><span>Amount *</span><input id="c-value" type="number" step="0.01" min="0" required placeholder="20" /></label>
              <label class="field"><span>Code (optional — auto if blank)</span><input id="c-code" placeholder="HOLIDAY20" /></label>
            </div>
            <div class="row-3">
              <label class="field"><span>Minimum order ($, optional)</span><input id="c-min" type="number" step="0.01" min="0" /></label>
              <label class="field"><span>Ends after (optional)</span><input id="c-expires" type="date" /></label>
              <label class="field"><span>Max redemptions (optional)</span><input id="c-max" type="number" min="1" step="1" /></label>
            </div>
            <label class="field"><span>Limit to one product (optional)</span>
              <select id="c-product"><option value="">Store-wide</option></select>
            </label>
            <div class="form-actions">
              <span class="spacer"></span>
              <button type="submit" class="primary" id="create-coupon">Create sale</button>
            </div>
          </form>
          <div class="toolbar">
            <strong style="font-size:14px">Running sales</strong>
            <button id="coupons-refresh-btn">Refresh</button>
          </div>
          <div id="coupons-list"></div>
        </section>
      </div>
```

*2.1c — `switchTab` shows/hides it.* **CURRENT (`admin.js:196-201`):**
```js
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('tab-products').classList.toggle('hidden', tab !== 'products');
  $('tab-orders').classList.toggle('hidden', tab !== 'orders');
  refreshActiveTab();
}
```
**NEW:**
```js
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('tab-products').classList.toggle('hidden', tab !== 'products');
  $('tab-orders').classList.toggle('hidden', tab !== 'orders');
  $('tab-coupons').classList.toggle('hidden', tab !== 'coupons');
  refreshActiveTab();
}
```

*2.1d — `refreshActiveTab` loads the active tab (now 3-way).* **CURRENT (`admin.js:203-211`):**
```js
function refreshActiveTab() {
  if (!state.session) return;
  const productsActive = !$('tab-products').classList.contains('hidden');
  if (productsActive) {
    loadProducts();
  } else {
    loadOrders();
  }
}
```
**NEW:**
```js
function refreshActiveTab() {
  if (!state.session) return;
  if (!$('tab-products').classList.contains('hidden')) loadProducts();
  else if (!$('tab-coupons').classList.contains('hidden')) loadCoupons();
  else loadOrders();
}
```

*2.1e — wire the form + refresh (end of `attachEventListeners`).* **CURRENT (`admin.js:164-170`):**
```js
  $('orders-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadOrders();
    }
  });
}
```
**NEW:**
```js
  $('orders-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadOrders();
    }
  });

  $('coupon-form').addEventListener('submit', onCreateCoupon);
  $('coupons-refresh-btn').addEventListener('click', loadCoupons);
}
```

*2.1f — the coupon functions (insert before the init-call).* **CURRENT (`admin.js:834-838`, the file's tail):**
```js
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```
**NEW (prepend the functions, keep the init-call):**
```js
async function loadCoupons() {
  setStatus('coupons-status', '', 'info');
  // The product-scope picker needs published products' stripe_product_id; fetch once if not loaded.
  if (!state.products || !state.products.length) {
    try {
      const pr = await fetch('/api/products', { headers: { ...authHeader() } });
      const pb = await pr.json().catch(() => ({}));
      if (pr.ok && Array.isArray(pb.products)) state.products = pb.products;
    } catch { /* non-fatal — the picker just shows Store-wide */ }
  }
  populateCouponProducts();
  const list = $('coupons-list');
  list.innerHTML = '<div class="empty">Loading...</div>';
  try {
    const res = await fetch('/api/coupons', { headers: { ...authHeader() } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    renderCoupons(Array.isArray(body.coupons) ? body.coupons : []);
  } catch (err) {
    list.innerHTML = '';
    setStatus('coupons-status', `Failed to load sales: ${err.message}`, 'error');
  }
}

function populateCouponProducts() {
  const sel = $('c-product');
  if (!sel) return;
  const current = sel.value;
  const published = (state.products || []).filter((p) => p.is_published && !p.archived_at && p.stripe_product_id);
  sel.innerHTML = '<option value="">Store-wide</option>' +
    published.map((p) => `<option value="${escapeHtml(p.stripe_product_id)}">${escapeHtml(p.title || '(untitled)')}</option>`).join('');
  sel.value = current; // keep selection across refreshes if still present
}

function renderCoupons(coupons) {
  const list = $('coupons-list');
  if (!coupons.length) {
    list.innerHTML = '<div class="empty">No sales running. Create one above.</div>';
    return;
  }
  list.innerHTML = '';
  for (const c of coupons) {
    const off = c.percent_off ? `${c.percent_off}% off`
      : c.amount_off ? `$${centsToDollars(c.amount_off)} off` : 'discount';
    const scope = c.store_wide ? 'store-wide' : `${(c.product_ids || []).length} product(s)`;
    const used = `${c.times_redeemed ?? 0}${c.max_redemptions ? ` / ${c.max_redemptions}` : ''} used`;
    const ends = c.expires_display ? ` · ends ${escapeHtml(c.expires_display)}` : '';
    const row = document.createElement('div');
    row.style.cssText = 'border:1px solid #ddd;border-radius:6px;padding:10px;margin-bottom:8px';
    row.innerHTML = `
      <p><span class="label">${escapeHtml(c.code)}</span> — ${escapeHtml(off)} · ${escapeHtml(scope)} · ${escapeHtml(used)}${ends}</p>
      <button type="button" class="end-sale">End sale</button>
      <div class="coupon-msg" style="margin-top:6px;font-size:13px"></div>
    `;
    row.querySelector('.end-sale').addEventListener('click', () => onDeactivateCoupon(c.code, row));
    list.appendChild(row);
  }
}

async function onCreateCoupon(e) {
  e.preventDefault();
  setStatus('coupons-status', '', 'info');
  const type = $('c-type').value;
  const rawValue = Number.parseFloat($('c-value').value);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    setStatus('coupons-status', 'Enter a discount amount.', 'error');
    return;
  }
  if (type === 'percent' && rawValue > 100) {
    setStatus('coupons-status', 'Percent off cannot exceed 100.', 'error');
    return;
  }
  const payload = { type, value: type === 'amount' ? Math.round(rawValue * 100) : rawValue };
  const code = $('c-code').value.trim();
  if (code) payload.code = code;
  const min = Number.parseFloat($('c-min').value);
  if (Number.isFinite(min) && min > 0) payload.min_amount = Math.round(min * 100);
  const max = Number.parseInt($('c-max').value, 10);
  if (Number.isInteger(max) && max > 0) payload.max_redemptions = max;
  const expires = $('c-expires').value; // YYYY-MM-DD or ''
  if (expires) payload.expires_at = Math.floor(new Date(`${expires}T23:59:59`).getTime() / 1000); // end of that day, local
  const product = $('c-product').value;
  if (product) payload.product_ids = [product];

  const offLabel = type === 'percent' ? `${rawValue}% off` : `$${rawValue.toFixed(2)} off`;
  const scopeLabel = product ? ($('c-product').selectedOptions[0]?.text || 'one product') : 'store-wide';
  const endsLabel = expires ? `, ends after ${expires}` : '';
  if (!window.confirm(`Create sale: ${offLabel}, ${scopeLabel}${endsLabel}${code ? `, code ${code}` : ' (auto code)'}?`)) return;

  $('create-coupon').disabled = true;
  try {
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    setStatus('coupons-status', `Created ${body.code}${body.expires_display ? ` — ends ${body.expires_display}` : ''}.`, 'success');
    $('coupon-form').reset();
    loadCoupons();
  } catch (err) {
    setStatus('coupons-status', `Failed: ${err.message}`, 'error');
  } finally {
    $('create-coupon').disabled = false;
  }
}

async function onDeactivateCoupon(code, row) {
  if (!window.confirm(`End the sale "${code}" now? Shoppers can no longer use it.`)) return;
  const msg = row.querySelector('.coupon-msg');
  msg.textContent = 'Ending...';
  try {
    const res = await fetch('/api/coupons/deactivate', {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    msg.textContent = 'Ended.';
    setTimeout(loadCoupons, 600);
  } catch (err) {
    msg.textContent = `Failed: ${err.message}`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```
*(`expires` uses end-of-day in the owner's local time; the backend's `formatExpiry` (2.2) displays it in store TZ, which is what prevents the misread. List rows use a plain bordered div — WS4 restyles with tokens. `.label`/`.toolbar`/`.empty`/`.product-form` classes already exist.)*

**Phase 2.2 — backend: human-readable expiry on read (the `FEEDBACK_COUPON_v2_1_0` fix).** So the GPT never decodes a raw Unix timestamp.

*2.2a — a formatter, above `handleCouponList`.* **CURRENT (`api/products.ts:751-752`):**
```ts
// ?_action=coupon (GET) — list active discounts so the owner can see/manage them.
async function handleCouponList(request: Request): Promise<Response> {
```
**NEW (add the helper just above it — declarations hoist, so `handleCoupon` at :733 can use it too):**
```ts
// Human-readable coupon expiry in the store's timezone, so the GPT/admin never decode a raw Unix
// timestamp (FEEDBACK_COUPON_v2_1_0: a raw expires_at was misread as July). Returned ALONGSIDE expires_at.
function formatExpiry(unixSeconds: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(unixSeconds * 1000));
}

// ?_action=coupon (GET) — list active discounts so the owner can see/manage them.
async function handleCouponList(request: Request): Promise<Response> {
```

*2.2b — include it in each listed coupon.* **CURRENT (`api/products.ts:786`):**
```ts
          expires_at: pc.expires_at ?? null,
```
**NEW:**
```ts
          expires_at: pc.expires_at ?? null,
          expires_display: pc.expires_at ? formatExpiry(pc.expires_at) : null,
```

*2.2c — echo it on create too.* **CURRENT (`api/products.ts:741`):**
```ts
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id });
```
**NEW:**
```ts
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id, expires_display: typeof body.expires_at === 'number' ? formatExpiry(body.expires_at) : null });
```

**Phase 2.3 — GPT instructions: read-back before create + use `expires_display`.** **CURRENT (`v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt:19`):**
```
COUPONS: translate her wish into createCoupon (percent, or amount-off in cents; dollars->cents; optional code/scope/min/expiry/cap). A product-scoped coupon needs a PUBLISHED product (a draft has no Stripe id); else make it store-wide. NEVER promise BOGO / "buy N". Read the code back. listCoupons shows running sales and each one's scope (store-wide vs specific); relay it. deactivateCoupon {code} ends one now. For a temporary sale, a coupon (not a price cut) keeps the list price intact.
```
**NEW (read the full terms back in plain dates before creating; never decode a timestamp):**
```
COUPONS: translate her wish into createCoupon (percent, or amount-off in cents; dollars->cents; optional code/scope/min/expiry/cap). A product-scoped coupon needs a PUBLISHED product (a draft has no Stripe id); else make it store-wide. NEVER promise BOGO / "buy N". CONFIRM FIRST: read the full terms back in plain language before creating ("20% off store-wide, runs through Sun Jun 21 — create it?"); never invent an expiry she didn't give. listCoupons returns expires_display (a plain date) beside each sale's scope (store-wide vs specific) — relay THAT; never decode a raw timestamp yourself. deactivateCoupon {code} ends one now. For a temporary sale, a coupon (not a price cut) keeps the list price intact.
```

## Workstream 3 — Chat-attach upload + admin media UX (detailed)

*Folds `assets/docs/archive/v3_0/v3_0_0_GPT_DIRECT_IMG_UPLOAD.md` (its CURRENT anchors re-verified against the working tree) + the round-2 alt-text + filename/role folds. The brief stays as provenance. **Mechanism:** OpenAI's `openaiFileIdRefs` — Em attaches photos in the chat, the GPT forwards them, the server fetches each `download_link` through the EXISTING `api/upload.ts` pipeline. **Dual-path by design:** the by-link `uploadImage` stays as the backstop (Drive / video / 10+ bulk). No DB change, no new Vercel function.*

**Phase 3.1 — `api/upload.ts`: extract the per-file tail into `processOne`.** The single-file validation + Cloudinary/R2 pipeline + success return (the block **from `if (!slug || !role)` at `:195` through the success `return jsonResponse(request, { url: publicUrl, filename })` at `:316`**) **moves verbatim** into a module-level helper that returns a result object instead of a `Response`: swap each `return jsonResponse(request, { error: … }, status)` for `return { ok: false as const, error: …, status }`, and the final success return for `return { ok: true as const, url: publicUrl, filename }`.
```ts
type UploadResult = { ok: true; url: string; filename: string } | { ok: false; error: string; status: number };

async function processOne(file: File, slug: string, role: string, skipTransformField: string | null): Promise<UploadResult> {
  if (!slug || !role) return { ok: false, error: 'Missing file, slug, or role', status: 400 };
  if (!ROLE_PATTERN.test(role)) return { ok: false, error: 'Invalid role', status: 400 };
  // … the existing :202–316 body, verbatim, with the two return-swaps above …
}
```
The single-file POST path then ends by calling it (replacing the inlined `:195–316` tail): `const r = await processOne(file, slug, role, skipTransformField); return r.ok ? jsonResponse(request, { url: r.url, filename: r.filename }) : jsonResponse(request, { error: r.error }, r.status);` *(`processOne` is module-level — place it beside `normalizeMediaUrl`/`isPublicHttpUrl`, above `export async function POST`, alongside the 3.2 helpers.)*

**Phase 3.2 — `api/upload.ts`: branch the JSON intake + add `handleAttachedRefs`.** **CURRENT (`:129-138`):**
```ts
  if ((request.headers.get('content-type') ?? '').includes('application/json')) {
    let body: { url?: unknown; slug?: unknown; role?: unknown; skip_transform?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return jsonResponse(request, { error: 'Invalid JSON body' }, 400);
    }
    if (typeof body.url !== 'string' || typeof body.slug !== 'string' || typeof body.role !== 'string') {
      return jsonResponse(request, { error: 'Missing url, slug, or role' }, 400);
    }
```
**NEW (widen the body type + branch to the batch path when `openaiFileIdRefs` is present):**
```ts
  if ((request.headers.get('content-type') ?? '').includes('application/json')) {
    let body: {
      url?: unknown; slug?: unknown; role?: unknown; skip_transform?: unknown;
      openaiFileIdRefs?: unknown; roles?: unknown;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return jsonResponse(request, { error: 'Invalid JSON body' }, 400);
    }
    // Custom GPT chat-attach path: OpenAI populates `openaiFileIdRefs` with { name, id, mime_type,
    // download_link } objects (download_link ~5-min, <=10 files). Fetch each through the SAME pipeline.
    if (Array.isArray(body.openaiFileIdRefs)) {
      return await handleAttachedRefs(request, body.openaiFileIdRefs, body.slug, body.roles);
    }
    if (typeof body.url !== 'string' || typeof body.slug !== 'string' || typeof body.role !== 'string') {
      return jsonResponse(request, { error: 'Missing url, slug, or role' }, 400);
    }
```
Plus the new module-level helpers (beside `normalizeMediaUrl`/`isPublicHttpUrl`, above `export async function POST`):
```ts
type FileRef = { name?: string; id?: string; mime_type?: string; download_link?: string };

function positionalRole(i: number): string {
  if (i === 0) return 'hero';
  return `gallery-${String(i).padStart(2, '0')}`; // 1 → gallery-01 …
}

async function handleAttachedRefs(request: Request, refs: unknown[], slugRaw: unknown, rolesRaw: unknown): Promise<Response> {
  if (typeof slugRaw !== 'string' || !slugRaw.trim()) return jsonResponse(request, { error: 'Missing slug' }, 400);
  if (refs.length === 0) return jsonResponse(request, { error: 'No files attached. Ask Em to attach the photos to the message.' }, 400);
  if (refs.length > 10) return jsonResponse(request, { error: 'Up to 10 files per message — send them in batches.' }, 400);
  const slug = slugRaw.trim();
  const roles = Array.isArray(rolesRaw) ? rolesRaw : [];
  const uploads: Array<{ url: string; filename: string; role: string }> = [];
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i] as FileRef;
    const link = typeof ref?.download_link === 'string' ? ref.download_link : '';
    const role = (typeof roles[i] === 'string' && ROLE_PATTERN.test((roles[i] as string).trim()))
      ? (roles[i] as string).trim()
      : positionalRole(i);
    if (!isPublicHttpUrl(link)) {
      return jsonResponse(request, { error: `File ${i + 1} had no usable download link (links last ~5 min — re-attach and try again).` }, 400);
    }
    let mediaRes: Response;
    try { mediaRes = await fetch(link, { redirect: 'follow' }); }
    catch { return jsonResponse(request, { error: `Could not fetch attached file ${i + 1}.` }, 400); }
    const fetchedType = (mediaRes.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!mediaRes.ok || !ALLOWED_MIME.has(fetchedType)) {
      return jsonResponse(request, { error: `Attached file ${i + 1} wasn't an allowed image/video (got "${fetchedType || 'unknown'}").` }, 400);
    }
    const bytes = Buffer.from(await mediaRes.arrayBuffer());
    const file = new File([bytes], `upload.${MIME_TO_EXT[fetchedType] ?? 'bin'}`, { type: fetchedType });
    const isVid = fetchedType.startsWith('video/');
    const r = await processOne(file, slug, role, isVid ? 'true' : null);
    if (!r.ok) return jsonResponse(request, { error: `File ${i + 1}: ${r.error}` }, r.status);
    uploads.push({ url: r.url, filename: r.filename, role });
  }
  return jsonResponse(request, { uploads });
}
```
*(`files.oaiusercontent.com` is public https → passes the existing `isPublicHttpUrl`. The server names each file `{role}-{slug}` from the resolved role, so nobody renames anything.)*

**Phase 3.3 — `vercel.json`: the attach rewrite (same function serves both).** **CURRENT (`vercel.json:19`):**
```json
    { "source": "/api/coupons/deactivate", "destination": "/api/products?_action=coupon_deactivate" },
```
**NEW (add after it):**
```json
    { "source": "/api/coupons/deactivate", "destination": "/api/products?_action=coupon_deactivate" },
    { "source": "/api/upload/attach", "destination": "/api/upload" },
```

**Phase 3.4 — GPT schema: add `uploadImages` + point `uploadImage` at it.**

*3.4a — insert the new op before `/api/orders`.* **CURRENT (`v2_0_0_GPT_SCHEMA.txt:284-285`):**
```yaml
        '400': { description: "The link wasn't directly downloadable (often a Drive share PAGE rather than the file, or not shared as 'anyone with the link'), or the type/size wasn't allowed — relay the message and ask Em for a direct/shared link." }
  /api/orders:
```
**NEW (insert the op between them):**
```yaml
        '400': { description: "The link wasn't directly downloadable (often a Drive share PAGE rather than the file, or not shared as 'anyone with the link'), or the type/size wasn't allowed — relay the message and ask Em for a direct/shared link." }
  /api/upload/attach:
    post:
      operationId: uploadImages
      summary: "Upload one or more photos the owner ATTACHED to this chat (not a link). Call this with their attached images, then put each returned url into images[]/thumbnail on createProduct/editProduct. For media she gives as a Drive/direct LINK, or for video, use uploadImage instead."
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [openaiFileIdRefs, slug]
              properties:
                openaiFileIdRefs:
                  type: array
                  items: { type: string }
                  description: "The photos the owner attached to the chat. Leave the values to the platform — just include this property so the attached files are forwarded. Up to 10 per call."
                slug: { type: string, description: "The product's slug (lowercase-hyphenated title). Names the files on the CDN. Same value you'll use on createProduct." }
                roles:
                  type: array
                  items: { type: string }
                  description: "Optional, same order as the attached photos: what each is — hero, gallery-01..15, detail-01..05. If omitted, the first becomes hero and the rest gallery-01, gallery-02, … You can reuse the hero url for thumbnail on createProduct."
      responses:
        '200': { description: "Returns { uploads: [{ url, role, filename }, …] } — one per attached file. Use each url verbatim in the product fields." }
        '400': { description: "No files attached, a link expired (re-attach — links last ~5 min), more than 10 files, or a file wasn't an allowed image. Relay plainly and ask Em to re-attach." }
  /api/orders:
```
*3.4b — point `uploadImage` at the new op.* **CURRENT (`:269`):** `…put the url into images[]/thumbnail/checkout_image/seo_thumbnail/media[]. Media comes as a LINK (a Drive share or direct URL); you can't forward a pasted file."` → **NEW:** `…put the url into images[]/thumbnail/checkout_image/seo_thumbnail/media[]. Use this for media given as a LINK (a Drive share or direct URL) or for video. If she ATTACHED photos to the chat, use uploadImages instead."` *(keep < 300 chars)*

**Phase 3.5 — GPT instructions (`v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt`): attach-first + alt + roles.**

*3.5a — step 3 (`:6`).* **CURRENT:**
```
3. Photos/videos arrive as LINKS only (a Google Drive "anyone with the link" share, or a direct file URL); you cannot use a file pasted into chat. uploadImage each (roles are in the uploadImage Action); it returns a CDN url, use that verbatim, never invent one. REQUIRED or the create fails: at least 1 hero + at least 5 gallery + a thumbnail (you may reuse the hero url) = 7 minimum; other roles are extras. If she cannot give 5 gallery angles, say so plainly; do not retry.
```
**NEW:**
```
3. Photos: if she ATTACHES them to the chat, call uploadImages (pass openaiFileIdRefs; optionally roles[] in the shown order — hero, gallery-01.., detail-01..). If she gives a Drive "anyone with the link" share or a direct URL (or it's a video), call uploadImage instead. Either returns CDN urls — use them verbatim, never invent one. You assign the ROLE; the server names each file (never rename or invent a filename). Write a short descriptive ALT for every image (and thumbnail_alt) — never leave alt blank. REQUIRED or the create fails: at least 1 hero + at least 5 gallery + a thumbnail (you may reuse the hero url) = 7 minimum; other roles are extras. If she cannot give 5 gallery angles, say so plainly; do not retry.
```
*3.5b — LINK TROUBLE (`:27`).* **CURRENT:**
```
LINK TROUBLE: if uploadImage 400s (a Drive share PAGE not the file, not public, or a video over ~25 MB showing a scan page), ask her for an "anyone with the link" Drive share or a direct URL (Dropbox "?dl=1" / CDN), then retry. A photo pasted in chat -> say you can't use a pasted file; ask for a link.
```
**NEW:**
```
LINK TROUBLE: an attached photo -> uploadImages (forward openaiFileIdRefs). If uploadImages 400s (no files came through, or a link expired — they last ~5 min), ask her to re-attach and retry. If uploadImage (by-link) 400s (a Drive share PAGE not the file, not public, or a video over ~25 MB showing a scan page), ask for an "anyone with the link" Drive share or a direct URL (Dropbox "?dl=1" / CDN), then retry. Video + 10+ photo batches stay on the link path.
```

**Phase 3.6 — `product-reference.md`: both intake methods + alt.** **CURRENT (`:61`):**
```
- The system crops to 4:5, converts to WebP, and puts each on the CDN — Em just sends the photos.
```
**NEW:**
```
- Two ways photos come in: Em **attaches** them to the chat (→ uploadImages) or gives a **link** (Drive share / direct URL, or any video → uploadImage). Either way she never renames anything — you assign the role, the server names + crops to 4:5, converts to WebP, and puts each on the CDN. Write a short descriptive **alt** for every image (and `thumbnail_alt`).
```

**Phase 3.7 — admin media UX** (the design addendum §WS4 P3, byte-anchored). Removes the only raw-JSON field a non-technical owner faces + brings the admin to media parity with the GPT.

*3.7a — image previews + role tag + a live coverage hint.* Rewrite `addImageRow` (`admin.js:331-345`). **CURRENT:**
```js
function addImageRow(url, alt) {
  const list = $('p-images');
  const row = document.createElement('div');
  row.className = 'img-url-row';
  row.innerHTML = `
    <span style="font-size:11px;color:#666">URL</span>
    <input type="url" class="img-url" placeholder="https://cdn.../products/slug/hero-slug.webp" />
    <input type="text" class="img-alt" placeholder="alt text" />
    <button type="button" class="remove-row">Remove</button>
  `;
  row.querySelector('.img-url').value = url || '';
  row.querySelector('.img-alt').value = alt || '';
  row.querySelector('.remove-row').addEventListener('click', () => row.remove());
  list.appendChild(row);
}
```
**NEW (adds a thumbnail + role tag that track the URL, + recompute coverage):**
```js
function addImageRow(url, alt) {
  const list = $('p-images');
  const row = document.createElement('div');
  row.className = 'img-url-row';
  row.innerHTML = `
    <img class="img-thumb" alt="" />
    <span class="img-role" style="font-size:11px;color:#666"></span>
    <input type="url" class="img-url" placeholder="https://cdn.../products/slug/hero-slug.webp" />
    <input type="text" class="img-alt" placeholder="alt text" />
    <button type="button" class="remove-row">Remove</button>
  `;
  const urlInput = row.querySelector('.img-url');
  const thumb = row.querySelector('.img-thumb');
  const roleTag = row.querySelector('.img-role');
  const sync = () => {
    const v = urlInput.value.trim();
    thumb.src = v;
    thumb.style.visibility = v ? 'visible' : 'hidden';
    const m = v.match(/\/(?:test_)?(hero|thumbnail|gallery-\d+|detail-\d+|video-\d+)[-.]/);
    roleTag.textContent = m ? m[1] : '';
    updateCoverage();
  };
  urlInput.value = url || '';
  row.querySelector('.img-alt').value = alt || '';
  urlInput.addEventListener('input', sync);
  row.querySelector('.remove-row').addEventListener('click', () => { row.remove(); updateCoverage(); });
  list.appendChild(row);
  sync();
}

function updateCoverage() {
  const el = $('img-coverage');
  if (!el) return;
  const urls = [...$('p-images').querySelectorAll('.img-url')].map((i) => i.value.trim()).filter(Boolean);
  const hero = urls.some((u) => /\/(?:test_)?hero-/.test(u));
  const gallery = urls.filter((u) => /\/(?:test_)?gallery-/.test(u)).length;
  const thumb = !!$('p-thumbnail').value.trim() || hero; // hero may be reused as the thumbnail
  const part = (ok, label) => `<span style="color:${ok ? '#2f7d52' : '#8a5a00'}">${ok ? '✓' : '•'} ${label}</span>`;
  el.innerHTML = [part(hero, 'hero'), part(gallery >= 5, `gallery ${gallery}/5`), part(thumb, 'thumbnail')].join(' &nbsp; ');
}
```
Plus the markup + CSS:
- **`admin/index.html` CURRENT (`:185-186`):**
```html
                  <div id="p-images" class="img-url-list"></div>
                  <button type="button" id="add-image-row" style="margin-top:6px">Add image URL</button>
```
**NEW (a coverage line between them):**
```html
                  <div id="p-images" class="img-url-list"></div>
                  <div id="img-coverage" style="font-size:12px;margin:6px 0"></div>
                  <button type="button" id="add-image-row" style="margin-top:6px">Add image URL</button>
```
- **`admin/index.html` CSS CURRENT (`:61`):** `      .img-url-row { display: grid; grid-template-columns: 140px 1fr 1fr auto; gap: 6px; align-items: center; }` → **NEW:** `      .img-url-row { display: grid; grid-template-columns: 40px 64px 1fr 1fr auto; gap: 6px; align-items: center; }` + add `      .img-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; background: #eee; }` right after it.

*3.7b — structured MP4/YouTube editor (replaces the raw-JSON `#p-media` textarea).* **`admin/index.html` CURRENT (`:159`):**
```html
              <label class="field"><span>Media (JSON array — optional MP4 / YouTube, in order)</span><textarea id="p-media" rows="3" placeholder='[{"type":"video","url":"https://cdn.../video-01-slug.mp4","loop":true,"autoplay":true},{"type":"youtube","url":"https://youtu.be/ID"}]'></textarea></label>
```
**NEW:**
```html
              <div>
                <strong style="font-size:13px">Media (optional — MP4 clips + YouTube, in order)</strong>
                <p style="font-size:12px;color:#666;margin:4px 0 8px">MP4s render before YouTube. Per clip, choose how it plays.</p>
                <div id="p-media-list" class="img-url-list"></div>
                <button type="button" id="add-media-row" style="margin-top:6px">Add video</button>
              </div>
```
`admin.js` — add `addMediaRow` + `collectMedia` (beside `addImageRow`/`collectImages`):
```js
function addMediaRow(m) {
  const list = $('p-media-list');
  const row = document.createElement('div');
  row.className = 'media-row';
  row.style.cssText = 'border:1px solid #eee;border-radius:4px;padding:8px;display:grid;gap:6px';
  row.innerHTML = `
    <div style="display:grid;grid-template-columns:110px 1fr auto;gap:6px;align-items:center">
      <select class="m-type"><option value="video">MP4 clip</option><option value="youtube">YouTube</option></select>
      <input type="url" class="m-url" placeholder="https://cdn.../video-01-slug.mp4  ·  or  https://youtu.be/ID" style="padding:6px 8px;border:1px solid #ccc;border-radius:4px;font:inherit;font-size:13px" />
      <button type="button" class="remove-row">Remove</button>
    </div>
    <div class="m-video-opts" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;font-size:13px">
      <label class="checkbox-row"><input type="checkbox" class="m-autoplay" /><span>Autoplay + loop, silent (GIF-like)</span></label>
      <input type="url" class="m-poster" placeholder="poster image url (still shown before play)" style="flex:1;min-width:160px;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font:inherit;font-size:13px" />
    </div>
    <input type="text" class="m-alt" placeholder="alt text — describe the clip" style="padding:6px 8px;border:1px solid #ccc;border-radius:4px;font:inherit;font-size:13px" />
  `;
  row.querySelector('.m-type').value = m?.type === 'youtube' ? 'youtube' : 'video';
  row.querySelector('.m-url').value = m?.url || '';
  row.querySelector('.m-autoplay').checked = m?.autoplay === true;
  row.querySelector('.m-poster').value = m?.poster || '';
  row.querySelector('.m-alt').value = m?.alt || '';
  const opts = row.querySelector('.m-video-opts');
  const syncOpts = () => { opts.style.display = row.querySelector('.m-type').value === 'video' ? 'flex' : 'none'; };
  syncOpts();
  row.querySelector('.m-type').addEventListener('change', syncOpts);
  row.querySelector('.remove-row').addEventListener('click', () => row.remove());
  list.appendChild(row);
}

function collectMedia() {
  const out = [];
  $('p-media-list').querySelectorAll('.media-row').forEach((row) => {
    const url = row.querySelector('.m-url').value.trim();
    if (!url) return;
    const alt = row.querySelector('.m-alt').value.trim();
    if (row.querySelector('.m-type').value === 'youtube') {
      out.push(alt ? { type: 'youtube', url, alt } : { type: 'youtube', url });
      return;
    }
    const item = { type: 'video', url };
    if (row.querySelector('.m-autoplay').checked) { item.autoplay = true; item.loop = true; } // GIF-like preset
    const poster = row.querySelector('.m-poster').value.trim();
    if (poster) item.poster = poster;
    if (alt) item.alt = alt;
    out.push(item);
  });
  return out;
}
```
`openEditor` — build rows instead of stringifying. **CURRENT (`admin.js:298`):** `  $('p-media').value = eff?.media ? JSON.stringify(eff.media) : '';` → **NEW:**
```js
  const mediaList = $('p-media-list');
  mediaList.innerHTML = '';
  if (Array.isArray(eff?.media)) eff.media.forEach((m) => addMediaRow(m));
```
`buildProductPayload` — collect instead of parse. **CURRENT (`admin.js:449-455`):**
```js
  const mediaRaw = $('p-media').value.trim();
  if (mediaRaw) {
    try { payload.media = JSON.parse(mediaRaw); }
    catch { throw new Error('Media must be a valid JSON array or empty'); }
  } else {
    payload.media = null;
  }
```
**NEW (the JSON.parse throw path is now structurally impossible; same array shape out):**
```js
  const media = collectMedia();
  payload.media = media.length ? media : null;
```
`attachEventListeners` — wire the add button. **CURRENT (`admin.js:152`):** `  $('add-image-row').addEventListener('click', () => addImageRow('', ''));` → **NEW (add the line after it):**
```js
  $('add-image-row').addEventListener('click', () => addImageRow('', ''));
  $('add-media-row').addEventListener('click', () => addMediaRow(null));
```

*3.7c — auto-infer `skip_transform` from the file type (the footgun fix).* **`admin.js` CURRENT (`:371-372`):**
```js
  const role = $('upload-role').value;
  const skip = $('upload-skip-transform').checked ? 'true' : '';
```
**NEW (a video always skips the Cloudinary crop, checkbox or not):**
```js
  const role = $('upload-role').value;
  const isVideo = (file.type || '').startsWith('video/');
  const skip = ($('upload-skip-transform').checked || isVideo) ? 'true' : '';
```

*(Same `media` array shape the frontend `populateMedia` already reads — `{type, url, autoplay?, loop?, poster?, alt?}` — so `api/products` + `product.js` are untouched. WS4 restyles these rows with tokens.)*

**Phase 3.8 — premise-update sweep (as-built, post-build).** Flip the v2.0.0 docs' "media arrives by link / can't forward a pasted file" premise (`v2_0_0_IMPLEMENT.md:8/:55`, `EVERLASTINGS_STORE.md`, `GPT_SETUP.md`, `product-reference.md`) to "attach in chat via `uploadImages`, with by-link as the backstop." Do at as-built to avoid mid-build mixed truth.

## Workstreams 4–5 — executable design (spec'd in `v3_1_0_ADDENDUM_DESIGN.md`)

- **4 · Admin polish** — the executable design lives in `…_ADDENDUM_DESIGN.md` §WS4 (the `:root` token system + P0–P7). Its CURRENT-state anchors are **verified** against the working tree (`admin/index.html:8-74` literals/grids, `system-ui`, no breakpoints). **P3 (media) is implemented in WS3.7 above.** Remaining at build (mechanical from the spec): the token literal-sweep (`#ddd`→`--c-border`…), P0's product-list state-filter JS + back-nav, and (per the executable-design rule) a render-tune with Sean on the live preview. Optional enhancements: the `improve`-skill code audit + (Sean-logged-in) live-screenshot fresh-instance passes.
- **5 · Homepage experience** — the executable spec lives in `…_ADDENDUM_DESIGN.md` §5: §5.1's `.hero__title` wrapper + a11y CSS + `homepage.js` init, and §5.2's versioned-key MP4 swap + 3 `index.html` URL edits, are concrete. The Lottie JSON authoring + the HyperFrames old-film render are content-creation steps done at execution (with the `text-to-lottie`/`hyperframes` skills + Sean's render-tune).

## Phase 0 — pre-build research (COMPLETE — folded into `v3_1_0_ADDENDUM_DESIGN.md`)

- ✓ **A — /admin design-review** → ADDENDUM §WS4: neutral/template CSS-variable system + ranked P1–P7 (form sectioning, status badges, structured MP4 editor, skeletons, mobile breakpoint, address block, chrome) + fold order.
- ✓ **B — text-to-lottie** → ADDENDUM §5.1: author in the Skottie harness, embed with **lottie-web SVG**, title as outline-path trim-draw, dual-element `<h1>`+`aria-hidden` Lottie a11y/reduced-motion pattern.
- ✓ **C — hyperframes old-film** → ADDENDUM §5.2: **build-time re-render resolved**, `warm-grain` workflow, subtle effect defaults, versioned-key R2 swap that preserves every existing hero layer.

---

## Verification (end-to-end, dev preview — full plan in `…_ADDENDUM_TESTING.md`)

- **Refund:** issue from /admin and from the GPT on a test order → Stripe refund created (retry → no double-refund via the idempotency key), order flips to `refunded`, relist prompt appears; decline → stays sold/archived; accept → relisted live (right path per state). Partial → routed to Stripe.
- **Parity:** every matrix capability exercised from **both** surfaces; coupons work in /admin (full field surface).
- **Upload:** chat-attach a batch (desktop + mobile); by-link still works; admin shows previews; MP4 editor sets flags + poster without raw JSON; all land on the CDN; `is_test` keys under `test/…`.
- **Admin polish:** neutral/template look, states legible, responsive at phone width.
- **Homepage:** Lottie title write-on + old-film hero render; reduced-motion fallback intact; `npx hyperframes lint` clean where used.
- `npx tsc --noEmit` clean; CORS unaffected.

## Cross-references

- Architecture / schemas → `assets/docs/EVERLASTINGS_STORE.md`.
- Source briefs → `assets/docs/archive/v3_0/v3_0_0_GPT_DIRECT_IMG_UPLOAD.md`, `…/v3_0_0_HOMEPAGE_EXPERIENCE.md`.
- Versioning / gap-review gate / self-gap-pass → `.agent/DEV_RULES.md` (v4.0.10).
