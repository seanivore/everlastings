# v3.1.2 Implementation Plan — management parity: refunds + coupons-in-admin · chat-attach upload · admin polish · homepage experience

**Initiative**: A fresh dev cycle (built/tested on `dev`, pushed live only when ready) that (1) closes the two store-management parity gaps surfaced by an audit — refunds (missing in both /admin and the GPT) and coupons (missing in /admin) — (2) promotes the two `v3_0_0` briefs (chat-attach image upload; homepage experience), (3) makes the /admin media UX (role assignment + MP4 config) clear and easy, and (4) polishes /admin toward a reusable, brand-neutral template aesthetic.
**Revision driven by**: round-2 cold Angle-A fold (v3.1.1 → v3.1.2 — GPT coupon-date parity, collapse 3.7c into P3d, WS6.3 cross-ref, always-offer relist with state-wording, coupon multi-select, P3d functional rules, canonical `productState`, GPT-instructions budget, robust `record_sale`). Promotes `v3_0_0_GPT_DIRECT_IMG_UPLOAD.md` + `v3_0_0_HOMEPAGE_EXPERIENCE.md`; folds the v2.1 testing finds (poster = no-fix doc clarification) + the /admin↔GPT parity audit.
**Required reading first**: `assets/docs/EVERLASTINGS_STORE.md` · `README.md` · THIS doc + its addenda (`…_ADDENDUM_DESIGN.md`, `…_ADDENDUM_TESTING.md` once split) · the two `v3_0_0` briefs (source) · `.agent/DEV_RULES.md`.
**If you find missing context**: `EVERLASTINGS_STORE.md` is living — confirm with Sean and update it; don't paper over the gap here.

> **Status / depth.** Functional workstreams **1–3 + 6 (inventory) are byte-anchored** (exact CURRENT/NEW blocks — line numbers are hints, the quoted CURRENT text is the anchor; reconcile if it drifts). Workstreams **4–5 are spec'd** in `v3_1_2_ADDENDUM_DESIGN.md` as concrete executable design (the `:root` token system + P0–P7; Lottie title + old-film hero) — design ships as concrete-default + render-tune per DEV_RULES, with the small mechanical remainder noted in each. The verification plan is `v3_1_2_ADDENDUM_TESTING.md`. **Gate status:** round-1 + round-2 cold Angle-A have folded (→ v3.1.2); **next = an in-house breadth pass → a fresh cold Angle-A on v3.1.2, looped until it passes, then B/C/D in parallel.**

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
- **Refund never auto-relists** (the safe default — a damaged-item refund must not silently re-list the piece). Relisting is a separate, **state-aware**, confirmed step that **restores stock** (`quantity + 1`).
- **Parity (the standing rule — full, both directions, no single point of failure).** Every store-management capability must be **equally doable via the Custom GPT chat AND the /admin panel** — neither surface is second-class, and **/admin must be complete as if the GPT didn't exist (and vice versa)**. We never leave the owner dependent on a single external service: a Custom GPT outage must not strand her, so /admin carries the *full* capability set (and the GPT carries it too). Design for the reusable-template **"User,"** not for Emy specifically — every time we optimized for "how Emy will use it" we doubled back (e.g. by-link image share vs. a real attach/upload). Judge every feature both ways; a capability present in one surface but not the other is a real gap, not a nicety.
- **Inventory lives in Supabase, never Stripe.** `products.quantity` is the only stock record; a sale decrements it and sets `available = (quantity > 0)`. Stripe holds no inventory (the Checkout line-item `quantity` is transactional only).
- **Storefront brand untouched.** /admin gets neutral/template styling only (NOT the Everlastings plum/lavender/serif) — it's the reusable management-layer UI.
- **Reduced-motion preserved.** The hero's `prefers-reduced-motion` fallback (`styles.css:376`) stays; any new homepage animation respects it; the real `<h1>` stays for SEO/a11y.
- **The go-live version is untouched.** v3.1.2 ships on its own, separately, when Sean chooses.

> **GPT instructions char budget — hard cap 8000 (F#14).** `v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt` is **7781 / 8000** today (~219 free). The WS1–3 instruction edits (1.4a/1.4b REFUNDS+poster, 2.3 COUPONS+`expires_date`, 3.5a/3.5b attach+alt+roles) net-add **≈ +760 chars → ~8540, OVER the cap.** So the build MUST trim to fit — the TESTING static gate (assembled file < 8000) fails the deploy otherwise; over-cap = the GPT silently truncates its own instructions. **`wc -c` the file after applying the edits**, then tighten these three (most verbose + most redundant, safe to compress *without dropping any rule*): **THE SLUG** (the "FOLD not DROP accents" rationale is stated twice — say it once), **EDITING** (the "build from `effective` so you don't wipe staged edits" rule is restated ~3× across the paragraph + the PHOTOS sub-note — consolidate to one), **PUBLISHING** (the lost-preview + 400-example prose). ~500–600 chars of slack lives in those three. Cut repetition only; keep every distinct rule.

---

## Roadmap (coarse direction — NOT a build queue)

1. **Refund** — `refundOrder` in /admin + GPT (confirm → full refund → state-aware relist prompt).
2. **Coupons in /admin** — a coupon UI over the existing `/api/coupons` endpoints (no backend change).
3. **Chat-attach upload + admin upload UX** — fold `v3_0_0_GPT_DIRECT_IMG_UPLOAD.md`; add admin upload previews, remaining-role hints, and a structured MP4 editor.
4. **Admin polish** — clean, professional, **brand-neutral** redesign (NOT august.style-tokened) + /admin↔GPT parity, nav, and product-list state-filter fixes.
5. **Homepage experience** — `text-to-lottie` title write-on + `hyperframes` old-film/lens-flare hero; from research subagents.
6. **Inventory** — decrement `products.quantity` on a sale; `available = (quantity > 0)`; refund relist restores the unit. Stock is ours (Supabase); Stripe holds none.

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
    .select('id, status, stripe_payment_intent, products(id, slug, title, available, quantity, archived_at)')
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
    products?: { id: string; slug: string; title: string; available: boolean; quantity: number | null; archived_at: string | null };
  }).products ?? null;
  return jsonResponse(request, {
    ok: true,
    status: 'refunded',
    relist: p
      ? { product_id: p.id, slug: p.slug, title: p.title, available: p.available, quantity: p.quantity ?? 0, archived: !!p.archived_at }
      : null,
  });
}
```
*(`UUID_RE` `:10`, `jsonResponse` `:38`, `isTest` already imported. The `products(...)` embed returns a to-one object, read the same way the GET does (`orders.ts:65`/`:172` → `order.products?.title`) — **verify the shape against a real refund response, not just `tsc`**: a wrong assumption here doesn't crash, it just returns a malformed `relist` and the "put it back up for sale?" prompt silently never fires. **`requireAdmin` returns the service-role client (`adminAuth.ts:27-31` — `SUPABASE_SECRET_KEY` on both auth paths), so the embed resolves for an archived product too** (it bypasses the `archived_at IS NULL` RLS — needed for the WS6 relist). `tsc --noEmit` clean.)*

**Phase 1.2 — `vercel.json`: the refund rewrite (more specific path first).** **CURRENT (`vercel.json:12`):**
```json
    { "source": "/api/orders/:id", "destination": "/api/orders?id=:id" },
```
**NEW (insert the refund line directly above it):**
```json
    { "source": "/api/orders/:id/refund", "destination": "/api/orders?id=:id&_action=refund" },
    { "source": "/api/orders/:id", "destination": "/api/orders?id=:id" },
```

**Phase 1.3 — GPT schema (`v2_0_0_GPT_SCHEMA.txt`): add the `refundOrder` op.** **CURRENT (the end of `markShipped` — the file's last lines, `:334-336`):**
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
                  relist:
                    type: object
                    description: The piece's current state so you can offer to restore the returned unit. Null if the order had no product.
                    properties:
                      product_id: { type: string }
                      slug: { type: string }
                      title: { type: string }
                      available: { type: boolean }
                      quantity: { type: integer }
                      archived: { type: boolean }
```
*(`summary` ≈ 230 chars, under the 300 cap. The path sits at 2-space indent like `/api/orders/{id}:` `:307`. The `relist` shape is enumerated — the GPT reads `relist.archived`/`.quantity`/`.available`/`.title` in instruction 1.4a, so spell it out rather than an opaque `{type:object}` — F16. No char cap on the schema file, only the per-`summary` 300.)*

**Phase 1.4 — GPT instructions (`v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt`): flip REFUNDS + a poster aside.**

*1.4a — REFUNDS.* **CURRENT (`:23`):**
```
REFUNDS: you can SEE order status but have NO refund Action. Walk her through Stripe (Payments -> find the payment -> Refund); Stripe emails the buyer. Stripe changes its dashboard, so if unsure of the current steps USE WEB SEARCH first. A full refund flips the order's status to "refunded" on its own; a partial one won't show (tell her to check Stripe). A refund does NOT relist the piece: getProduct, then editProduct {available:true} if still published-but-sold, or unarchiveProduct if archived. Revenue/payouts live in Stripe; point her there.
```
**NEW:**
```
REFUNDS: find the order first (listOrders q=<buyer email or id> — reaches shipped/past orders, not just the needs-shipping queue). refundOrder {id, reason?} issues a FULL refund via Stripe (it emails the buyer) and marks the order refunded. CONFIRM FIRST: read back piece + amount + buyer ("Refund <buyer> $X for <product>? This can't be undone."). It returns `relist` (state + quantity); a refund never relists itself, so ALWAYS offer to restore the returned unit — if it's down (relist.available false or archived) "Put it back up for sale?", else "Add 1 to its available quantity?". Yes -> unarchiveProduct if relist.archived AND editProduct {available:true, quantity: relist.quantity + 1} (both if both). PARTIAL refunds aren't supported here -> walk her through Stripe (Payments -> find the payment -> Refund; USE WEB SEARCH if unsure of the current steps). Revenue/payouts live in Stripe.
```
*(The relist offer is **always** made now (Sean's call — minimize friction, never leave stock un-restored), with wording by state: a down piece gets re-listed, an in-stock multi-qty piece gets +1 — F5. `listOrders q=` is the EXISTING orders search param (`orders.ts:60`/`:76-87` — matches id/email/tracking), already documented in the ORDERS instruction; no new capability — F12.)*

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
    if (r) {
      // ALWAYS offer to restore the returned unit (Sean's call — never leave stock un-restored).
      // Wording by current state: a down piece (sold-out or archived) gets re-listed; an in-stock
      // multi-qty piece just gets +1 back. Either way relistPiece restores both axes (F5).
      const down = r.archived || r.available === false;
      const ask = down
        ? `Re-list "${r.title}" and make it available for purchase again?`
        : `Increase "${r.title}"'s available quantity by 1?`;
      if (window.confirm(ask)) await relistPiece(r, down, msg);
    }
    setTimeout(loadOrders, 800);
  } catch (err) {
    msg.textContent = `Failed: ${err.message}`;
    buttons.forEach((b) => { b.disabled = false; });
  }
}

// Relist = RESTORE the refunded unit (WS6.3): unarchive when archived AND put it back in stock
// (quantity + 1 → available follows the quantity>0 rule). BOTH axes, not XOR. Mirrors the admin's
// own calls: POST /api/products/unarchive (admin.js:634) + PUT /api/products?id=… (:474).
// `down` only tweaks the success copy (re-listed vs +1) — the restore is identical either way.
async function relistPiece(r, down, msg) {
  try {
    if (r.archived) {
      const ua = await fetch('/api/products/unarchive', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.product_id }),
      });
      if (!ua.ok) throw new Error(`HTTP ${ua.status}`);
    }
    // Return the refunded unit to stock; available follows from quantity > 0.
    const res = await fetch(`/api/products?id=${encodeURIComponent(r.product_id)}`, {
      method: 'PUT',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: true, quantity: (r.quantity || 0) + 1 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    msg.textContent = down ? 'Refunded + relisted.' : 'Refunded + stock +1.';
  } catch (err) {
    msg.textContent = `Refunded, but relist failed (${err.message}) — relist it from the product editor.`;
  }
}
```
*(`authHeader` / `loadOrders` / `centsToDollars` / `escapeHtml` already exist in `admin.js`; `customerEmail`, `totalLabel`, `productTitle` are already in `buildOrderCard`'s scope.)*

**Phase 1.6 — docs (as-built, after the build):** `STORE_ADMINISTRATION.md` refund section (now "issue it in /admin or via the Sunkeeper; it asks about relisting") + `GPT_SETUP.md` + `EVERLASTINGS_STORE.md` Stripe-sync note + test-script **R15** flips from "can't issue refunds" → "issues + asks about relisting." (Do these in the as-built phase to avoid mid-build mixed truth.)

## Workstream 2 — Coupons in /admin (detailed)

> **Verified I/O contract (the anchor — confirmed against `api/products.ts`, so the admin field names aren't a guess).**
> - **List** (`handleCouponList`, `products.ts:779-789`) returns, per coupon: `{ code, promotion_code_id, percent_off, amount_off, times_redeemed, max_redemptions, expires_at, store_wide, product_ids }` (+ `expires_display` added in 2.2). `renderCoupons` reads exactly these.
> - **Create** (`handleCoupon`, `products.ts:694-739`) accepts: `type` (`'percent'`|`'amount'`), `value` (percent = the number; **amount = CENTS**, `Math.round(value)` `:724`), `code?`, `product_ids?` (**Stripe** product ids → `applies_to.products`), `min_amount?` (cents → `restrictions.minimum_amount`), `expires_at?` (unix → `redeem_by` + promo `expires_at`), `max_redemptions?`. Returns `{ success, code, coupon_id, promotion_code_id }` (+ `expires_display` in 2.2c). `onCreateCoupon` posts exactly these.

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
            <div class="field">
              <span>Limit to products (optional — leave all unchecked for store-wide)</span>
              <input type="search" id="c-product-search" placeholder="Filter products by title…" autocomplete="off" />
              <div id="c-product-list" class="coupon-product-list" style="max-height:180px;overflow-y:auto;border:1px solid #ddd;border-radius:4px;padding:4px;margin-top:4px"></div>
              <p id="c-product-selected" style="font-size:12px;color:#666;margin:4px 0 0">Store-wide (no products selected)</p>
            </div>
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
  $('c-product-search').addEventListener('input', populateCouponProducts); // re-filter the scope picker live
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

// A searchable, checkbox product picker so a coupon can be scoped to MANY products — true parity
// with the GPT's product_ids array (F13; createCoupon already accepts an array, contract line above).
// Selection lives in a module Set so it PERSISTS as the owner filters by different terms: search
// "loft", check a few, search "vessel", check more — the earlier checks stay. (Sean: think the
// template "User" with a large catalog, not Emy's tiny one — full /admin capability, GPT-down-proof.)
const couponSelectedProducts = new Set(); // stripe_product_ids

function populateCouponProducts() {
  const list = $('c-product-list');
  if (!list) return;
  const term = ($('c-product-search')?.value || '').trim().toLowerCase();
  const published = (state.products || []).filter((p) => p.is_published && !p.archived_at && p.stripe_product_id);
  // Drop any selection that's no longer a valid scope target (unpublished/archived since checking).
  const validIds = new Set(published.map((p) => p.stripe_product_id));
  [...couponSelectedProducts].forEach((id) => { if (!validIds.has(id)) couponSelectedProducts.delete(id); });
  const shown = term ? published.filter((p) => (p.title || '').toLowerCase().includes(term)) : published;
  list.innerHTML = shown.length
    ? shown.map((p) => {
        const id = escapeHtml(p.stripe_product_id);
        const checked = couponSelectedProducts.has(p.stripe_product_id) ? ' checked' : '';
        return `<label class="checkbox-row"><input type="checkbox" class="c-product-cb" value="${id}"${checked} /><span>${escapeHtml(p.title || '(untitled)')}</span></label>`;
      }).join('')
    : '<p class="empty" style="padding:8px">No matching published products.</p>';
  list.querySelectorAll('.c-product-cb').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) couponSelectedProducts.add(cb.value); else couponSelectedProducts.delete(cb.value);
      updateCouponScopeNote();
    });
  });
  updateCouponScopeNote();
}

function updateCouponScopeNote() {
  const note = $('c-product-selected');
  if (!note) return;
  const n = couponSelectedProducts.size;
  note.textContent = n === 0 ? 'Store-wide (no products selected)' : `${n} product${n === 1 ? '' : 's'} selected`;
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
  if (expires) payload.expires_date = expires; // raw date; the backend builds end-of-day in the STORE timezone (no browser-TZ drift — F9)
  const selectedProducts = [...couponSelectedProducts];
  if (selectedProducts.length) payload.product_ids = selectedProducts; // omit → store-wide

  const offLabel = type === 'percent' ? `${rawValue}% off` : `$${rawValue.toFixed(2)} off`;
  const scopeLabel = selectedProducts.length ? `${selectedProducts.length} product${selectedProducts.length === 1 ? '' : 's'}` : 'store-wide';
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
    couponSelectedProducts.clear();
    if ($('c-product-search')) $('c-product-search').value = '';
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
*(`expires_date` is the raw YYYY-MM-DD; the backend (2.2) builds end-of-day in the store TZ so the stored instant, the confirm label, and `expires_display` all agree regardless of the owner's locale (F9). List rows use a plain bordered div — WS4 restyles with tokens. `.label`/`.toolbar`/`.empty`/`.product-form` classes already exist.)*

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

// End-of-day (23:59:59) on a YYYY-MM-DD calendar date, interpreted in the STORE timezone, as a Unix
// timestamp — so a coupon's stored expiry matches the date the owner picked regardless of their
// browser locale (F9). Offset derived by round-tripping the naive instant through the TZ; Vercel
// functions run in UTC, so `new Date(localized)` reads the ET wall-clock back as UTC for the diff.
function endOfDayET(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const naiveUTC = Date.UTC(y, m - 1, d, 23, 59, 59);
  const localized = new Date(naiveUTC).toLocaleString('en-US', { timeZone: 'America/New_York' });
  const offsetMs = naiveUTC - new Date(localized).getTime();
  return Math.floor((naiveUTC + offsetMs) / 1000);
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

**Phase 2.2d — `handleCoupon` builds the expiry in the store TZ (F9 — kills browser-TZ drift).** Add `expires_date?: string` to the request-body type, and at the top of `handleCoupon` (before `couponParams`) normalize it to a store-TZ end-of-day timestamp so the rest of the handler + the 2.2c `formatExpiry` echo work unchanged:
```ts
  if (typeof body.expires_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.expires_date)) {
    body.expires_at = endOfDayET(body.expires_date); // store-TZ end-of-day → redeem_by + promo.expires_at + the echo
  }
```
Both surfaces send `expires_date`: /admin already does, and **the GPT does too now** (Phase 2.2e adds it to the `createCoupon` schema + instruction). That closes the v2.1 timestamp-misread regression on **both** surfaces, not just /admin — leaving the GPT to compute a Unix end-of-day itself was the exact failure class (F#2). `expires_at` stays accepted for back-compat. `endOfDayET` is the helper from 2.2a.

**Phase 2.2e — GPT schema (`v2_0_0_GPT_SCHEMA.txt`): prefer `expires_date` on `createCoupon` (parity + regression-class closure — F#2).** **CURRENT (`:231`):**
```yaml
                expires_at: { type: integer, description: Unix timestamp when the code expires. Optional. }
```
**NEW (add `expires_date` as the preferred field; demote `expires_at` to legacy):**
```yaml
                expires_date: { type: string, description: "End date as YYYY-MM-DD (e.g. 2026-06-21). PREFER THIS — the server sets end-of-day in the store's timezone, so you never compute a timestamp. Optional." }
                expires_at: { type: integer, description: "Unix timestamp (legacy — use expires_date instead). Optional." }
```
*(`handleCoupon`'s 2.2d normalization already accepts `expires_date`, so the backend is ready — only the schema + instruction needed exposing. Each `description` < 300 chars.)*

**Phase 2.3 — GPT instructions: read-back before create + use `expires_display`.** **CURRENT (`v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt:19`):**
```
COUPONS: translate her wish into createCoupon (percent, or amount-off in cents; dollars->cents; optional code/scope/min/expiry/cap). A product-scoped coupon needs a PUBLISHED product (a draft has no Stripe id); else make it store-wide. NEVER promise BOGO / "buy N". Read the code back. listCoupons shows running sales and each one's scope (store-wide vs specific); relay it. deactivateCoupon {code} ends one now. For a temporary sale, a coupon (not a price cut) keeps the list price intact.
```
**NEW (read the full terms back in plain dates before creating; never decode a timestamp):**
```
COUPONS: translate her wish into createCoupon (percent, or amount-off in cents; dollars->cents; optional code/scope/min/expiry/cap). A product-scoped coupon needs a PUBLISHED product (a draft has no Stripe id); else make it store-wide. NEVER promise BOGO / "buy N". CONFIRM FIRST: read the full terms back in plain language before creating ("20% off store-wide, runs through Sun Jun 21 — create it?"); never invent an expiry she didn't give; pass her end date as expires_date (YYYY-MM-DD), never a Unix timestamp. listCoupons returns expires_display (a plain date) beside each sale's scope (store-wide vs specific) — relay THAT; never decode a raw timestamp yourself. deactivateCoupon {code} ends one now. For a temporary sale, a coupon (not a price cut) keeps the list price intact.
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
*(`files.oaiusercontent.com` is public https → passes the existing `isPublicHttpUrl`. The server names each file `{role}-{slug}` from the resolved role, so nobody renames anything. `new File([bytes], …)` is a **Node 20+ global** — Vercel's default runtime is Node ≥20, so it's present at runtime even though `tsc` wouldn't flag its absence; F12.)*

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
*(**Keep `openaiFileIdRefs` as `items: { type: string }` — F9.** That is OpenAI's **documented** Custom-GPT contract: the platform recognizes the property name and substitutes the string array with `{name,id,mime_type,download_link}` objects at runtime, which the 3.2 handler then reads. Declaring the object shape in the schema would fight the documented substitution — and a stricter Action validator could reject a placeholder that no longer looks like a string array. We favor the documented mechanism over guessing at platform internals; the real-preview smoke test (TESTING item 14) is what proves the round-trip, and would catch a future contract change.)*

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

> **Upload control = role-sectioned per DESIGN P3d (U2).** The single `#upload-role` select is replaced by per-role upload zones (role = the zone you drop into — closes F6's video-role gap and kills the wrong-role footgun); 3.7c's video auto-skip moves into the **Video** zone's handler. The image previews (3.7a) + structured media editor (3.7b) stand as byte-anchored. The sectioned control itself is executable-design (concrete default + render-tune), not byte-anchored here.

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
    const m = v.match(/\/(?:test_)?(hero|thumbnail|seo_thumbnail|checkout_image|gallery-\d+|detail-\d+|video-\d+)[-.]/); // all 7 roles (AR#37) — was missing seo_thumbnail/checkout_image (F6)
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
    if (row.querySelector('.m-autoplay').checked) { item.autoplay = true; item.loop = true; } // GIF-like preset; controls omitted on purpose — populateMedia derives no-controls from autoplay (product.js:254), so it renders button-less (F10)
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

*3.7c — video auto-skip is owned by P3d, NOT a standalone edit to the old control (F#3).* The single `#upload-role` control is **removed** by DESIGN P3d (role-sectioned zones), so byte-anchoring an `isVideo` skip onto its handler (`admin.js:371`) would be applied-then-stripped — the exact hazard the byte-anchored discipline exists to prevent. Instead **the rule lives in P3d's Video zone**: every upload from the Video zone POSTs `skip_transform=true` unconditionally (a video always skips the Cloudinary crop — replaces the old global checkbox/auto-infer). The chat-attach path already enforces it server-side (3.2's `handleAttachedRefs` passes `isVid ? 'true' : null`), so **both** surfaces skip transform on video with no checkbox and no wrong-role footgun. **Do not apply a standalone `#upload-role` edit** — there's no such control after P3d.

*(Same `media` array shape the frontend `populateMedia` already reads — `{type, url, autoplay?, loop?, poster?, alt?}` — so `api/products` + `product.js` are untouched. WS4 restyles these rows with tokens.)*

**Phase 3.8 — premise-update sweep (as-built, post-build).** Flip the v2.0.0 docs' "media arrives by link / can't forward a pasted file" premise (`v2_0_0_IMPLEMENT.md:8/:55`, `EVERLASTINGS_STORE.md`, `GPT_SETUP.md`, `product-reference.md`) to "attach in chat via `uploadImages`, with by-link as the backstop." Do at as-built to avoid mid-build mixed truth.

## Workstream 6 — Inventory: decrement stock on a sale (pre-existing gap; F2 root cause)

> Surfaced by Gap-A F2 (mis-described there as "the webhook zeroes quantity") + Sean's Stripe trace. **Stock lives only in `products.quantity` (Supabase); Stripe holds no inventory** — verified against Stripe's docs: Products/Prices have **no** stock field; you pass a *transactional* line-item `quantity` per Checkout and Stripe forgets it after charging. Stripe's own limited-inventory guidance = keep stock in your DB, decrement on `checkout.session.completed`. Today the webhook flips `available=false` on **any** sale and never touches `quantity`, so a multi-stock piece is stranded after one sale and `quantity` goes stale. Byte-anchored.

**The rule — one place, applied everywhere `quantity` changes:** on a sale `quantity = max(quantity − 1, 0)` and `available = (quantity > 0)`. That derivation *is* the entire "when to make it unavailable" logic. A sale **never archives** — `archived_at` stays an independent, manual owner action. The checkout gate is already correct (`available && quantity >= 1`, `checkout.ts:79`/`:205`) and the line-item quantity stays `1` (one of each piece per order). One-of-a-kind pieces (qty 1) behave exactly as today (1 → 0 → `available:false`).

**Phase 6.1 — migration: an atomic stock-decrement RPC.** New `supabase/migrations/20260616000001_v3_1_inventory_decrement.sql` (apply via the Supabase CLI — the MCP rejects writes):
```sql
-- A sale decrements OUR stock and derives availability, atomically per row (the money path: two
-- near-simultaneous completions must not race a read-modify-write of the same count). archived_at
-- is untouched — a sale is never an archive. available follows the POST-decrement quantity.
create or replace function record_sale(p_ids uuid[])
returns void language sql as $$
  -- Count each id's multiplicity so an N-of-one-piece line would decrement by N, not 1. Today p_ids
  -- never has duplicates (see the invariant note below) — grouping is identical for unique ids — but
  -- this is strictly correct if a multi-buy cart is ever added, at zero cost.
  with counts as (select id, count(*)::int as n from unnest(p_ids) as id group by id)
  update products p
  -- both SET expressions read the OLD row (Postgres UPDATE semantics) → available = (new_qty > 0). F17.
  set quantity  = greatest(coalesce(p.quantity, 0) - c.n, 0),
      available = greatest(coalesce(p.quantity, 0) - c.n, 0) > 0
  from counts c
  where p.id = c.id;
$$;
```
*(**Invariant — `p_ids` has no duplicates today**, so the simpler `- 1` would also be correct: the cart dedupes by `product_id` (`main.js:121` returns early on a re-add), there is no quantity selector, and each checkout line-item is hardcoded `quantity: 1` (`checkout.ts:96`) with one `metadata.items` entry per distinct piece — a piece is sold to **separate sequential orders**, never N-in-one-cart. The `unnest`/`count(*)` form is adopted as zero-cost hardening + to document that invariant: a cold reviewer (round-2 F1) read the old `- 1` as a live decrement bug — it can't fire under the current cart, but the grouped form is unambiguously right and future-proofs a quantity selector. `tsc` n/a — SQL.)*

**Phase 6.2 — `api/webhook.ts`: decrement instead of the blind `available` flip.** **CURRENT (`webhook.ts:156-163`):**
```ts
    const productIds = items.map((i) => i.id);
    const { error: productUpdateErr } = await supabase
      .from('products')
      .update({ available: false })
      .in('id', productIds);
    if (productUpdateErr) {
      console.error(`Product mark-sold failed for ${event.id}:`, productUpdateErr);
    }
```
**NEW (atomic decrement; `available` derived from the new count):**
```ts
    const productIds = items.map((i) => i.id);
    const { error: productUpdateErr } = await supabase.rpc('record_sale', { p_ids: productIds });
    if (productUpdateErr) {
      console.error(`Stock decrement failed for ${event.id}:`, productUpdateErr);
    }
```
*(Same non-fatal logging discipline — never 5xx after the idempotency claim. The title-lookup block below (`:216-219`) is unaffected.)*

**Phase 6.3 — refund relist = stock RESTORE (the spec WS1 implements; NOT a separate diff — F#4).** The canonical relist restores the returned unit: **`quantity + 1`** (which makes `available` true again via the same rule) **plus** unarchive when archived — both axes, never XOR. **This is already folded into WS1's NEW blocks above — do NOT re-apply it as a second edit.** A builder going 1 → 6 has already built it by the time they reach here; this section is rationale, not a TODO. For reference, it lives in:
- **WS1.1b** — the refund handler's `products(...)` select includes `quantity`, and the returned `relist` object is `{ product_id, slug, title, available, quantity, archived }`.
- **WS1.5c `relistPiece`** — always PUTs `{ available: true, quantity: (r.quantity || 0) + 1 }` and POSTs `/api/products/unarchive` when `r.archived`; the prompt wording branches on current state (re-list vs +1) per F5.
- **GPT instruction 1.4a** — always offers, then `editProduct {available:true, quantity: relist.quantity + 1}` and/or `unarchiveProduct` (both if both).

**Phase 6.4 — docs (as-built). `Doc impact:`** at the v3.1.x as-built (a fresh agent, per the DEV_RULES *As-built doc-sync* rule — do NOT edit STORE mid-build; it correctly describes the **shipped** available-only model until v3.1.x ships), update `EVERLASTINGS_STORE.md`'s inventory model to the WS6 decrement behavior: the **Purchase-Flow** step ("Sets each purchased product available=false … does NOT change quantity"), **Data States #2** ("Product sold"), and the **Flag reference** `products.quantity` line (currently "a sale doesn't decrement it today … deferred until the first multi-quantity product_type") all flip to *"a sale decrements `quantity`; `available = (quantity > 0)`; `archived_at` untouched."* Also flip any test-script expectation that assumed a sale leaves quantity unchanged. **And add the one-of-each-per-order invariant** to STORE's Purchase-Flow (the cart dedupes by `product_id` at `main.js:121`; each line-item is `quantity:1`; a piece sells to separate sequential orders, never N-in-one-cart) — true of the shipped system today, and its absence is exactly what let a cold reviewer misread `record_sale` as a decrement bug (F1).

## Workstreams 4–5 — executable design (spec'd in `v3_1_2_ADDENDUM_DESIGN.md`)

- **4 · Admin polish** — the executable design lives in `…_ADDENDUM_DESIGN.md` §WS4 (the `:root` token system + P0–P7). Its CURRENT-state anchors are **verified** against the working tree (`admin/index.html:8-74` literals/grids, `system-ui`, no breakpoints). **P3 (media) is implemented in WS3.7 above.** Remaining at build (mechanical from the spec): the token literal-sweep (`#ddd`→`--c-border`…), P0's product-list state-filter JS + back-nav, and (per the executable-design rule) a render-tune with Sean on the live preview. Optional enhancements: the `improve`-skill code audit + (Sean-logged-in) live-screenshot fresh-instance passes.
- **5 · Homepage experience** — the executable spec lives in `…_ADDENDUM_DESIGN.md` §5: §5.1's `.hero__title` wrapper + a11y CSS + `homepage.js` init, and §5.2's versioned-key MP4 swap + 3 `index.html` URL edits, are concrete. The Lottie JSON authoring + the HyperFrames old-film render are content-creation steps done at execution (with the `text-to-lottie`/`hyperframes` skills + Sean's render-tune).

## Phase 0 — pre-build research (COMPLETE — folded into `v3_1_2_ADDENDUM_DESIGN.md`)

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
