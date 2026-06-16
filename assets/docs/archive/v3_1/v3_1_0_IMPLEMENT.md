# v3.1.0 Implementation Plan — management parity: refunds + coupons-in-admin · chat-attach upload · admin polish · homepage experience

**Initiative**: A fresh dev cycle (built/tested on `dev`, pushed live only when ready) that (1) closes the two store-management parity gaps surfaced by an audit — refunds (missing in both /admin and the GPT) and coupons (missing in /admin) — (2) promotes the two `v3_0_0` briefs (chat-attach image upload; homepage experience), (3) makes the /admin media UX (role assignment + MP4 config) clear and easy, and (4) polishes /admin toward a reusable, brand-neutral template aesthetic.
**Revision driven by**: initial draft. Promotes `v3_0_0_GPT_DIRECT_IMG_UPLOAD.md` + `v3_0_0_HOMEPAGE_EXPERIENCE.md`; folds the v2.1 testing finds (poster = no-fix doc clarification) + the /admin↔GPT parity audit.
**Required reading first**: `assets/docs/EVERLASTINGS_STORE.md` · `README.md` · THIS doc + its addenda (`…_ADDENDUM_DESIGN.md`, `…_ADDENDUM_TESTING.md` once split) · the two `v3_0_0` briefs (source) · `.agent/DEV_RULES.md`.
**If you find missing context**: `EVERLASTINGS_STORE.md` is living — confirm with Sean and update it; don't paper over the gap here.

> **Status / depth.** This is the first draft (the gap-review loop has NOT run). It is a **roadmap** with every decision locked; **Workstream 1 (Refund)** is detailed first. Byte-exact CURRENT/NEW anchors are added per slice as it approaches the gate (the targets below are confirmed file:line locations, not guesses). Workstreams 4–5 are now **spec'd** in `v3_1_0_ADDENDUM_DESIGN.md` (their Phase-0 research ran) and get byte-anchored to source files during execution, like 1–3.

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

## Workstream 2 — Coupons in /admin (detailing)

**Phase 2.1 — /admin Coupons UI (DIRECTION; byte-anchored next — needs the admin tab-structure read).** A new "Coupons" tab/section in `admin/index.html` + `admin.js` handlers over the existing `/api/coupons` create/list/deactivate: full field surface (type/value/code/product-scope by **`stripe_product_id`**/min/expiry as a **date input**/max), a list showing `expires_display` + scope + redemptions, and deactivate-by-code. No backend change beyond 2.2.

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

## Later (direction only) — Workstreams 2–5

- **2 · Coupons in /admin** — see the **Workstream 2 (detailing)** section above: 2.2 (human `expires_display`) + 2.3 (read-back beat) are byte-anchored; 2.1 (the /admin Coupons UI) is anchored next.
- **3 · Chat-attach + admin upload UX** — fold the `v3_0_0` brief's phases (upload.ts intake, schema `uploadImages`, vercel rewrite, instructions flip) + the admin upload previews / remaining-role hint / structured MP4 editor / auto-skip_transform **+ the alt-text requirement + the filename/role clarification** (server names from role; frontend reads role from the filename).
- **4 · Admin polish** — **now spec'd** in `…_ADDENDUM_DESIGN.md` §WS4 (token system + P1–P7 with a de-risking fold order) **+ in-admin nav/back + product-list state-filter tabs**; byte-anchor to `admin/index.html` + `assets/js/admin.js` next. Execution captures live /admin screenshots (Claude-in-Chrome) for multiple fresh-instance design passes; optional `improve` skill audit.
- **5 · Homepage experience** — **now spec'd** in `…_ADDENDUM_DESIGN.md` §5 (Lottie title §5.1; old-film hero §5.2, build-time resolved); byte-anchor next.

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
