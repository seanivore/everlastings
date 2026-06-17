# v3.3.0 Implementation Plan — management parity: refunds + coupons-in-admin · chat-attach upload · admin polish · homepage experience

**Initiative**: A fresh dev cycle (built/tested on `dev`, pushed live only when ready) that (1) closes the two store-management parity gaps surfaced by an audit — refunds (missing in both /admin and the GPT) and coupons (missing in /admin) — (2) promotes the two `v3_0_0` briefs (chat-attach image upload; homepage experience), (3) makes the /admin media UX (role assignment + MP4 config) clear and easy, and (4) polishes /admin toward a reusable, brand-neutral template aesthetic.
**Required reading first**: `assets/docs/EVERLASTINGS_STORE.md` · `README.md` · THIS doc + its addenda (`…_ADDENDUM_DESIGN.md`, `…_ADDENDUM_TESTING.md`) · the two `v3_0_0` briefs (source) · `.agent/DEV_RULES.md`.
**If you find missing context**: `EVERLASTINGS_STORE.md` is living — confirm with Sean and update it; don't paper over the gap here.

> **Status / depth.** Functional workstreams **1–3 + 6 (inventory) are byte-anchored** (exact CURRENT/NEW blocks — line numbers are hints, the quoted CURRENT text is the anchor; reconcile if it drifts). Workstreams **4–5 are spec'd** in `v3_3_0_ADDENDUM_DESIGN.md` as concrete executable design (the `:root` token system + P0–P7; Lottie title + old-film hero) — design ships as concrete-default + render-tune per DEV_RULES, with the small mechanical remainder noted in each. The verification plan is `v3_3_0_ADDENDUM_TESTING.md`.

> **This is the clean execution copy.** Every decision here is settled and gate-cleared — build to the anchors; you choose nothing. The reasoning is kept *out of your way*: if (and only if) an edit's shape makes you want to question it, the "why" lives in `v3_3_0_RATIONALE.md`, keyed by phase/workstream. You don't need it to build — **don't load it by default.** In your BUILD_REPORT, note candidly whether you consulted it at all (that tells us if the lean copy is carrying its weight).

---

## Orchestration — suggested, evaluate for yourself

This is a complete plan-it-all run at one execution version: six functional workstreams (WS1–6) plus the design addendum (WS4 admin polish, WS5 homepage). Run it from one orchestrator or parallelize — **your call.** These are starting-point suggestions; take them in, then conduct the build as you see best.

- **Largely independent slices** (good parallel candidates): WS1 refund (`api/orders.ts` + `admin.js` + GPT schema/instructions), WS2 coupons (`admin.js` + `api/products.ts` + GPT), WS3 chat-attach upload (`api/upload.ts` + GPT). WS6 inventory is a small, self-contained backend slice (`api/webhook.ts` + one migration).
- **The one real sequencing constraint:** WS3 (media UX) and WS4 (admin polish, P0(iii)) both touch `admin.js`'s `attachEventListeners` region — by design it is edited **exactly once, at WS4-P0(iii)** (which folds in WS3.7b's `add-media-row` wiring). So **build WS3 before WS4**, or coordinate that single region. Likewise WS4 deletes the `#upload-status`/`onUploadImage`/`#upload-row` artifacts WS3's old control used.
- **What NOT to delegate** (orchestrator-owned): gate/promotion calls, branch state + commit cadence, escalation when a decision-shaped question surfaces (stop → surface to Sean, never decide), the end-to-end verification reads, and — critically — **the Phase 3.9 GPT-instruction file ships VERBATIM** from this doc (don't let a subagent paraphrase it; re-run `wc -c` < 8000 on the shipped `.txt`).
- **Placeholders as decouplers:** the design layer (WS4/WS5) builds against the same `#p-*` IDs / payload shapes the functional workstreams use, so a design subagent and a backend subagent can run in parallel against a stable contract.

---

## Goal (the thesis this build serves — settled)

**Minimize Em's friction to manage her store** — the GPT should do anything a capable agent could on her behalf. **The parity rule (standing principle):** every management capability is equally doable in **/admin** AND the **GPT** — we can't rely on the GPT always being there, and /admin is easier for some moods.

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
- **Parity (full, both directions, no single point of failure).** Every capability is doable via the GPT **and** /admin — neither second-class; /admin must be complete as if the GPT didn't exist, and vice versa (a Custom GPT outage must not strand her). Design for the reusable-template **"User,"** not for Emy specifically.
- **Single-admin operation (scope boundary).** The store assumes **one operator at a time** — refund/relist (and everything else) reads-then-writes without cross-tab/cross-operator locking. Simultaneous multi-admin / multi-seat is **out of scope** (a future formal effort, never patched piecemeal here). Em's as-built docs state it plainly; the GPT can clarify if asked.
- **Inventory lives in Supabase, never Stripe.** `products.quantity` is the only stock record; a sale decrements it and sets `available = (quantity > 0)`. Stripe holds no inventory (the Checkout line-item `quantity` is transactional only).
- **Storefront brand untouched.** /admin gets neutral/template styling only (NOT the Everlastings plum/lavender/serif) — it's the reusable management-layer UI.
- **Reduced-motion preserved.** The hero's `prefers-reduced-motion` fallback (the poster swap — inline in `index.html` + the hero rules in `styles.css`; locate by content, the line hints have drifted) stays; any new homepage animation respects it; the real `<h1>` stays for SEO/a11y.
- **The go-live version is untouched.** v3.3.0 ships on its own, separately, when Sean chooses.

> **GPT instructions char budget — hard cap 8000.** The instruction file ships **verbatim from Phase 3.9** (phases 1.4/2.3/3.5 document the rule *deltas*; Phase 3.9 is the shipped text). Verified **`wc -c` = 7788 / 8000** (212 headroom; the build re-counts the shipped `.txt`). The cap is HARD — re-run `wc -c` on any instruction add; over-cap, the GPT silently truncates its own instructions and the static gate fails.

---

## Roadmap (coarse direction — NOT a build queue)

1. **Refund** — `refundOrder` in /admin + GPT (confirm → amount-based refund against the purchase → mark which pieces came back → state-aware relist prompt).
2. **Coupons in /admin** — a coupon UI over the existing `/api/coupons` endpoints (no backend change).
3. **Chat-attach upload + admin upload UX** — fold `v3_0_0_GPT_DIRECT_IMG_UPLOAD.md`; add admin upload previews, remaining-role hints, and a structured MP4 editor.
4. **Admin polish** — clean, professional, **brand-neutral** redesign (NOT august.style-tokened) + /admin↔GPT parity, nav, and product-list state-filter fixes.
5. **Homepage experience** — `text-to-lottie` title write-on + `hyperframes` old-film/lens-flare hero; from research subagents.
6. **Inventory** — decrement `products.quantity` on a sale; `available = (quantity > 0)`; refund relist restores the unit. Stock is ours (Supabase); Stripe holds none.

## Locked decisions (confirmed — the builder chooses nothing)

**Refund**
- **Amount-based, Stripe-faithful.** A Stripe refund is an *amount* against the PaymentIntent (not line-item-aware), and **one cart = one PI spanning N sibling `orders` rows** (`webhook.ts:185` writes one row per product). So the in-app refund refunds `amount_cents` (default = the clicked order's line amount) and flips + relists **only the pieces the owner marks returned** — never the whole cart by surprise. Per-line refund (the single-item case) is the trivial special case (one piece, amount pre-filled). A goodwill/partial amount (nothing marked returned) refunds money without relisting.
- **Route:** a new `POST` handler in `api/orders.ts` (it has only `GET` + `PATCH` today, and `PATCH` hard-requires `tracking_number`, so refund cannot overload it). Rewrite `/api/orders/:id/refund` → `/api/orders?id=:id&_action=refund`, placed **before** the existing `/api/orders/:id` rewrite (`vercel.json:12`).
- **Body (optional):** `{ amount_cents?, relist_product_ids? }`. No body = refund this order's `amount` + relist this piece (back-compat for the GPT's simple `refundOrder {id}` call); explicit `relist_product_ids: []` = goodwill, nothing relisted.
- **Stripe call:** `stripe.refunds.create({ payment_intent, amount: refundAmount }, { idempotencyKey: \`refund-${pi}-${refundAmount}-${ids.sort().join('.')}\` })` — reuses `api/_lib/stripe.ts` (`import { stripe }`). The key includes the amount + relisted ids so a double-click is idempotent, but refunding two same-priced pieces in turn isn't blocked. Stripe enforces amount ≤ the refundable balance (surface its error as 502).
- **Guards:** order not found → 404; `status === 'refunded'` → 409; missing `stripe_payment_intent` → 409; no determinable amount → 400; order fetched scoped by `isTest`.
- **Status:** the action flips the **returned pieces'** sibling orders to `refunded` (optimistic, instant UI); the `charge.refunded` webhook (`api/webhook.ts:60-89`) also flips on a **full-PI** refund (idempotent where they overlap). A partial/goodwill amount with nothing returned does **not** flip status.
- **Relist is NOT automatic.** The action returns `relist: [{ product_id, slug, title, available, quantity, archived }, …]` (an array — one per returned piece) so the caller prompts. Relist path is **state-aware + restores stock both axes:** `unarchiveProduct` if archived AND `editProduct {available:true, quantity: relist.quantity + 1}`.

**Coupons in /admin** — reuse the existing endpoints verbatim: create + list via `/api/coupons` (`?_action=coupon`, `products.ts:689-798`), end via `/api/coupons/deactivate` (`?_action=coupon_deactivate`, `products.ts:800-829`). Expose the **full** surface for true parity: `type` (percent/amount), `value`, `code`, `product_ids` (these are **`stripe_product_id`**, not the Supabase id — the UI maps published products → their `stripe_product_id`), `min_amount`, `expires_at`, `max_redemptions`; plus the list (with `times_redeemed` / scope / expiry) and deactivate-by-code. **Human-friendly dates:** the one backend add — `handleCouponList` (+ the `createCoupon` response) returns a human `expires_display` (e.g. "Ends after Sun, Jun 21, 2026", store TZ America/New_York) **alongside** the raw `expires_at`, so the GPT never decodes a timestamp; plus a GPT **read-back-before-create** beat and a date input (not a raw timestamp) in the /admin coupon UI.

**Chat-attach upload** — exactly per `v3_0_0_GPT_DIRECT_IMG_UPLOAD.md` (fold its phases in): a new `uploadImages` op taking `openaiFileIdRefs` into `api/upload.ts`, positional role default (`hero`, then `gallery-0N`), the by-link `uploadImage` kept as the backstop. **Admin upload UX:** preview thumbnails on upload, a remaining-roles hint (need 1 hero + 5 gallery), a **structured MP4 editor** (pick an uploaded `video-0N` url → GIF-like vs click-to-play preset → poster image → alt) replacing the raw-JSON `p-media` textarea (`admin/index.html:159`), and **auto-infer `skip_transform`** from the file's MIME. **Alt text:** the GPT generates descriptive `alt` per image + `thumbnail_alt`, carried through `uploadImages` / createProduct `images[]`. **Filename/role:** `upload.ts` names files `{role}-{slug}.{ext}` server-side from the `role` param, and the frontend derives an image's role from that filename prefix (`product.js:415` gallery, `:576` hero) — there is no stored role field — so passing the *correct role* is load-bearing. The GPT assigns *roles* (never invents or renames a filename); the chat-attach `roles[]`/positional mapping must be reliable.

**Admin polish** — clean, professional, **genuinely polished + smart, high-appeal** (it can have a vibe). Brand-**neutral**: NOT Everlastings-branded and **not** anchored to august.style tokens — the bar is "looks excellent + ports to any future client," not "matches a palette." Two fronts, in order: (1) full /admin↔GPT parity made obvious, then (2) make it pleasant. Two gaps to close: confusing in-admin back-nav (the browser Back button leaves /admin → add a clear "← Products" + obvious tab return) and a product-list **state-filter** (live/draft/sold/archived, like the orders subtabs). The addendum's neutral-slate + indigo-slate accent is the working default to *refine*.

**Homepage** (full spec in `…_ADDENDUM_DESIGN.md` §5) — Lottie title write-on via **lottie-web SVG** + outline-path trim-draw; the real `<h1>` stays (SEO/SR) with the Lottie as `aria-hidden` decoration and a reduced-motion fallback to the static title. Old-film hero = **build-time re-rendered MP4** (HyperFrames `warm-grain`). Ship via a **versioned CDN key** (current objects are `immutable, max-age=1yr`) + 3 URL edits in `index.html`; re-grade the poster to match; all v2.1 parallax/overlay/spotlight/edge-glow + reduced-motion layers preserved.

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

// POST /api/orders/:id/refund  (vercel rewrite → ?id=:id&_action=refund) — owner-issued refund.
// A Stripe refund is an AMOUNT against the PaymentIntent (refunds aren't line-item-aware), and one
// cart = one PI spanning N sibling `orders` rows (webhook.ts:185 writes one row per product). So we
// refund `amount_cents` (default = THIS order's line amount → the common single-item case) and
// flip+relist ONLY the pieces the caller marks returned via `relist_product_ids` (default = this
// order's piece). charge.refunded (webhook.ts:60) also flips status, but only on a FULL-PI refund —
// for a partial we own the per-order flip here (idempotent: both write 'refunded' where they overlap).
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

  // Optional JSON body: amount_cents (a custom/partial amount) + relist_product_ids (which pieces
  // came back → flip + relist them). No body = refund this order's full line amount + relist this
  // one piece. An explicit empty relist_product_ids = a goodwill/partial amount, nothing returned.
  let body: { amount_cents?: unknown; relist_product_ids?: unknown } = {};
  try { body = (await request.json()) as typeof body; } catch { /* no body → per-line defaults */ }

  const { data: order, error: loadErr } = await supabase
    .from('orders')
    .select('id, status, amount, product_id, stripe_payment_intent')
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

  const refundAmount = typeof body.amount_cents === 'number' && Number.isInteger(body.amount_cents) && body.amount_cents > 0
    ? body.amount_cents
    : (order.amount as number | null);
  if (typeof refundAmount !== 'number' || refundAmount <= 0) {
    return jsonResponse(request, { error: 'Could not determine the refund amount — pass amount_cents.' }, 400);
  }
  // Returned pieces (→ flip + relist). Explicit [] = goodwill/partial, nothing returned.
  // Undefined (the GPT's simple {id} call) = just this order's piece.
  const relistIds = Array.isArray(body.relist_product_ids)
    ? (body.relist_product_ids as unknown[]).filter((x): x is string => typeof x === 'string')
    : [order.product_id as string];

  const pi = order.stripe_payment_intent as string;
  try {
    await stripe.refunds.create(
      { payment_intent: pi, amount: refundAmount },
      { idempotencyKey: `refund-${pi}-${refundAmount}-${[...relistIds].sort().join('.')}` },
    );
  } catch (err) {
    console.error(`Refund failed for order ${id} (PI ${pi}):`, err);
    return jsonResponse(request, { error: 'Stripe refund failed — check the amount, then the Stripe dashboard.' }, 502);
  }

  // Flip + relist only the returned pieces: their sibling orders on this PI (product_ids are unique
  // per cart, so one row each). The embed resolves for archived pieces too (service-role client).
  const relist: Array<{ product_id: string; slug: string; title: string; available: boolean; quantity: number; archived: boolean }> = [];
  if (relistIds.length) {
    const { data: siblings } = await supabase
      .from('orders')
      .select('id, products(id, slug, title, available, quantity, archived_at)')
      .eq('stripe_payment_intent', pi)
      .eq('is_test', isTest)
      .in('product_id', relistIds);
    const rows = (siblings ?? []) as unknown as Array<{
      id: string;
      products?: { id: string; slug: string; title: string; available: boolean; quantity: number | null; archived_at: string | null };
    }>;
    const refundedIds = rows.map((r) => r.id);
    if (refundedIds.length) {
      // Optimistic flip (the webhook also flips on a full-PI refund). Non-fatal if it lags.
      const { error: updErr } = await supabase.from('orders').update({ status: 'refunded' }).in('id', refundedIds);
      if (updErr) console.error(`Refund status flip lagged for PI ${pi}:`, updErr.message);
    }
    for (const r of rows) {
      if (!r.products) continue;
      relist.push({
        product_id: r.products.id, slug: r.products.slug, title: r.products.title,
        available: r.products.available, quantity: r.products.quantity ?? 0, archived: !!r.products.archived_at,
      });
    }
  }
  // (relistIds empty = goodwill/partial, nothing returned → NO status flip, empty relist; the response
  // `status` mirrors that — 'refunded' only when pieces actually flipped, else the order's unchanged
  // status, so the field never lies to the GPT. A full-PI refund still flips every sibling via charge.refunded.)
  return jsonResponse(request, { ok: true, status: relistIds.length ? 'refunded' : order.status, relist });
}
```
*(`UUID_RE` `:10`, `jsonResponse` `:38`, `isTest` already imported; `orders.amount`/`product_id`/`stripe_payment_intent` are real columns (`webhook.ts:185-201` writes them). The `products(...)` embed returns a to-one object, read the same way the GET does (`orders.ts:65` → `order.products?.title`) — **verify the relist shape against a real multi-item refund response, not just `tsc`**: a wrong assumption doesn't crash, it just returns a malformed `relist[]` and the "put it back up for sale?" prompt silently never fires. **`requireAdmin` returns the service-role client (`adminAuth.ts:27-31` — `SUPABASE_SECRET_KEY` on both auth paths), so the embed resolves for an archived product too** (bypasses the `archived_at IS NULL` RLS — needed for the WS6 relist). `tsc --noEmit` clean.)*

**Phase 1.1c — `api/orders.ts` GET: a `payment_intent` filter.** The /admin refund panel must load a cart's **full** sibling set regardless of the active orders subtab — a multi-piece cart's siblings can straddle `needs_shipping`/`shipped` (one piece shipped, the rest not), so grouping from the active-subtab slice silently UNDER-lists a partial cart (the GPT path has no such limit — it passes ids directly — so this was an /admin↔GPT parity hole on the headline money journey). Add an explicit by-PaymentIntent filter (the GET already runs `requireAdmin`, so no new auth surface). **CURRENT (`api/orders.ts:70-74`):**
```ts
  if (status === 'needs_shipping') {
    query = query.is('shipped_at', null).eq('status', 'completed');
  } else if (status === 'shipped') {
    query = query.not('shipped_at', 'is', null);
  }
```
**NEW (add the PI filter right after the status block; `url` is already defined `:58`):**
```ts
  if (status === 'needs_shipping') {
    query = query.is('shipped_at', null).eq('status', 'completed');
  } else if (status === 'shipped') {
    query = query.not('shipped_at', 'is', null);
  }

  // Refund panel: load a cart's FULL sibling set by PaymentIntent, independent of the shipping subtab
  // (siblings can straddle needs_shipping/shipped) — round-4 breadth-pass fix.
  const paymentIntent = url.searchParams.get('payment_intent');
  if (paymentIntent) query = query.eq('stripe_payment_intent', paymentIntent);
```
*(Combines with `is_test` scoping already on the base `query`; the panel calls with `payment_intent` only — no `status` — so it returns every sibling for that PI. `tsc --noEmit` clean.)*

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
      summary: "Refund an order via Stripe; emails the buyer. A Stripe refund is an AMOUNT against the whole purchase; one cart can be several orders on one payment. Default = refund THIS order's amount + relist THIS piece. For several pieces or a custom amount, pass amount_cents + relist_product_ids."
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
                amount_cents: { type: integer, description: "Refund amount in CENTS. Omit to refund this order's full line amount. For several pieces, sum their amounts. Stripe rejects more than the purchase total." }
                relist_product_ids:
                  type: array
                  items: { type: string }
                  description: "The Supabase product ids (NOT stripe ids) of the pieces that came back — they get marked refunded and offered for relist. Omit to default to this order's piece; pass [] for a goodwill/partial refund where nothing is returned."
      responses:
        '200':
          description: Refund issued. `relist` carries each returned piece's current state so you can offer to restore it (empty if nothing was returned).
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  status: { type: string }
                  relist:
                    type: array
                    description: One entry per returned piece — its current state, so you can offer to restore each returned unit. Empty for a goodwill/partial refund.
                    items:
                      type: object
                      properties:
                        product_id: { type: string }
                        slug: { type: string }
                        title: { type: string }
                        available: { type: boolean }
                        quantity: { type: integer }
                        archived: { type: boolean }
```
*(`summary` = **286 chars** (verified `wc`/byte-count), under the 300 cap — the earlier "≈295" estimate undercounted by ~20 and would have tripped the testing static gate (`every summary < 300`); count it, don't estimate. The path sits at 2-space indent like `/api/orders/{id}:` `:307`. `relist` is an **array** now (multi-piece refunds — headline fold) with each item's shape enumerated; the GPT reads `relist[].archived`/`.quantity`/`.available`/`.title` in instruction 1.4a. `reason` is gone (the handler never read it + Stripe's `reason` is an enum, not free text; the human reason lives in the chat read-back). No char cap on the schema file, only the per-`summary` 300.)*

**Phase 1.4 — GPT instructions (`v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt`): flip REFUNDS + a poster aside.** *(→ This phase documents the REFUNDS rule changes. The instruction file is replaced WHOLESALE in **Phase 3.9** (full restructure → 7788/8000) — do NOT hand-apply the CURRENT→NEW block below to the file; ship Phase 3.9's text, which already embodies it.)*

*1.4a — REFUNDS.* **CURRENT (`:23`):**
```
REFUNDS: you can SEE order status but have NO refund Action. Walk her through Stripe (Payments -> find the payment -> Refund); Stripe emails the buyer. Stripe changes its dashboard, so if unsure of the current steps USE WEB SEARCH first. A full refund flips the order's status to "refunded" on its own; a partial one won't show (tell her to check Stripe). A refund does NOT relist the piece: getProduct, then editProduct {available:true} if still published-but-sold, or unarchiveProduct if archived. Revenue/payouts live in Stripe; point her there.
```
**NEW:**
```
REFUNDS: find the order first (listOrders q=<buyer email or id> — reaches shipped/past orders, not just needs-shipping). A Stripe refund is an AMOUNT against the whole purchase, and one cart can be several orders sharing a payment. refundOrder {id} refunds THIS order's amount and relists THIS piece. CONFIRM FIRST: read back piece(s) + amount + buyer ("Refund <buyer> $X for <product>? Can't be undone."). For several pieces from one purchase: confirm which came back, pass relist_product_ids:[their ids] + amount_cents=summed cents. For a goodwill/partial amount with nothing returned: pass amount_cents + relist_product_ids:[]. It returns `relist` (an array, one per returned piece); a refund never relists itself, so for EACH entry ALWAYS offer to restore the unit — down (available false or archived) "Put it back up for sale?", else "Add 1 to its available quantity?". Yes -> unarchiveProduct if archived AND editProduct {available:true, quantity: quantity + 1} (both if both). Revenue/payouts live in Stripe.
```
*(Amount-based now (Sean's call — headline fold): a refund is an amount against the PaymentIntent, and a multi-item cart is N sibling orders on one payment, so refunding "the order" must NOT silently refund the whole cart. `refundOrder {id}` keeps the simple per-line path; `amount_cents` + `relist_product_ids` cover multi-piece + partial. The relist offer is **always** made, wording by state — down piece re-listed, in-stock piece +1 — and loops the `relist[]` array; `reason` removed (Stripe's is an enum; the human reason lives in the read-back). `listOrders q=` is the EXISTING search param (`orders.ts:60`/`:76-87`), already documented; no new capability.)*

*1.4b — poster aside (the v2.1 testing clarification).* **CURRENT (`:25`):** `…click-to-play with sound (the default; she can add a still "poster"). Set the media flags accordingly.` → **NEW:** `…click-to-play with sound (the default; she can add a still "poster" — the image shown before the video plays). Set the media flags accordingly.`

**Phase 1.5 — `/admin`: refund composer panel + always-offer relist** (`assets/js/admin.js`; order cards are built in `buildOrderCard`). The single `window.confirm` is replaced by an inline **refund panel**: it lists every piece in the purchase (the sibling orders sharing one `stripe_payment_intent`), checkboxes mark which came back (→ relist), and an auto-summing but **freely editable** amount drives the Stripe refund (Sean's call — Stripe-faithful, amount-based; per-line is the one-piece special case). Concrete-default + render-tune; WS4 restyles with tokens.

*1.5a — (no change to `renderOrders`).* **`renderOrders` is left exactly as shipped** — no stash. The clicked `order` already carries `stripe_payment_intent` (the GET returns `*`); `openRefundPanel` fetches the cart's siblings by PaymentIntent (Phase 1.1c + 1.5d), robust regardless of the active subtab.

*1.5 header — correct the stale auth-model comment.* The file header says `/api/orders` is JWT-only, but `requireAdmin` accepts `PRODUCT_API_KEY` too — which is exactly how the GPT's `refundOrder` (WS1, new this build) drives `/api/orders`. Behavior is already correct; only the comment lies. **CURRENT (`admin.js:6-7`):**
```js
// Supabase JWT (for this UI). `/api/orders` and `/api/orders/<id>` only
// accept a Supabase JWT via requireAdmin.
```
**NEW:**
```js
// Supabase JWT (for this UI). `/api/orders` and `/api/orders/<id>` accept
// either too via requireAdmin (the GPT drives refundOrder/listOrders/markShipped with PRODUCT_API_KEY).
```

*1.5b — the Refund button + the (initially hidden) panel container, in the order-info block.* **CURRENT (`admin.js:770-771`):**
```js
      ${formHtml}
      <div class="order-msg" style="margin-top:6px;font-size:13px"></div>
```
**NEW (a Refund button — or a Refunded pill when already refunded, or a quiet tag when there's no payment to refund — plus an empty panel the handler fills):**
```js
      ${formHtml}
      ${order.status === 'refunded'
        ? '<p style="margin-top:6px"><span class="pill refunded">Refunded</span></p>'
        : !order.stripe_payment_intent
          ? '<p style="margin-top:6px;font-size:13px;color:var(--c-text-muted,#666)">No payment on file to refund.</p>'
          : '<button type="button" class="refund-order" style="margin-top:6px">Refund this purchase…</button>'}
      <div class="refund-panel" style="display:none;margin-top:8px;padding:10px;border:1px solid var(--c-border,#ddd);border-radius:6px"></div>
      <div class="order-msg" style="margin-top:6px;font-size:13px"></div>
```
*(The no-PI tag suppresses the button on a legacy order missing `stripe_payment_intent` — opening the panel would just 409 at submit. The `Refunded` pill uses **`.pill.refunded`**, styled in WS4 P2 (DESIGN §4.2); until WS4 lands it renders with the generic `.pill` rule. The button label is **"Refund this purchase…"** (a multi-piece cart shows N order cards on one PaymentIntent, and the panel lists every sibling).)*

*1.5c — wire it, after the resend handler.* **CURRENT (`admin.js:799-804`):**
```js
  const resendBtn = card.querySelector('.resend-tracking');
  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      submitShip(order.id, order.tracking_number, order.tracking_carrier, card, true);
    });
  }
```
**NEW (append a refund-button handler — opens the composer panel, doesn't refund directly):**
```js
  const resendBtn = card.querySelector('.resend-tracking');
  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      submitShip(order.id, order.tracking_number, order.tracking_carrier, card, true);
    });
  }

  const refundBtn = card.querySelector('.refund-order');
  if (refundBtn) {
    refundBtn.addEventListener('click', () => openRefundPanel(order, card));
  }
```

*1.5d — the composer + submit + relist, beside `submitShip`.* **CURRENT (the close of `submitShip`, `admin.js:830-832`):**
```js
    buttons.forEach((b) => { b.disabled = false; });
  }
}
```
**NEW (same, then add `openRefundPanel` + `submitRefund` + `relistPiece`):**
```js
    buttons.forEach((b) => { b.disabled = false; });
  }
}

// A Stripe refund is an AMOUNT against the whole purchase (one cart = N orders sharing a payment),
// so the panel shows every piece in THIS purchase: CHECK the ones that came back (they get relisted),
// and the amount auto-sums but stays freely EDITABLE (goodwill / restocking). Checkmarks drive relist;
// the amount drives the refund. A single-item order = one piece, pre-checked, amount pre-filled.
async function openRefundPanel(order, card) {
  const panel = card.querySelector('.refund-panel');
  if (!panel) return;
  if (panel.style.display !== 'none') { panel.style.display = 'none'; return; } // toggle closed
  const pi = order.stripe_payment_intent;
  // Load the cart's FULL sibling set by PaymentIntent: a multi-piece cart's
  // siblings can straddle the needs_shipping/shipped subtabs, so the active-subtab slice can silently
  // UNDER-list a partial cart. Fetch by PI so the panel always shows every piece in the purchase.
  panel.style.display = 'block';
  panel.innerHTML = '<p style="font-size:13px;margin:0">Loading the pieces in this purchase…</p>';
  let pieces = [order];
  if (pi) {
    try {
      const res = await fetch(`/api/orders?payment_intent=${encodeURIComponent(pi)}`, { headers: { ...authHeader() } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(body.orders)) pieces = body.orders.filter((o) => o.status !== 'refunded');
    } catch { /* network/Action error → fall back to the single clicked order */ }
  }
  const list = pieces.length ? pieces : [order];
  panel.innerHTML = `
    <p style="font-size:13px;margin:0 0 6px">Check the pieces that came back (they'll be re-listed). The amount fills in — edit it for a partial/goodwill refund.</p>
    <div class="refund-pieces" style="display:grid;gap:4px;margin-bottom:8px">
      ${list.map((o) => {
        const cents = typeof o.amount === 'number' ? o.amount : 0;
        const checked = o.id === order.id ? ' checked' : '';
        const pieceTitle = o.products?.title ?? '(piece)';
        return `<label class="checkbox-row" style="display:flex;gap:8px;align-items:center">
          <input type="checkbox" class="refund-piece" value="${escapeHtml(o.product_id)}" data-cents="${cents}" data-title="${escapeHtml(pieceTitle)}"${checked} />
          <span>${escapeHtml(pieceTitle)} — $${centsToDollars(cents)}</span>
        </label>`;
      }).join('')}
    </div>
    <label class="field" style="margin:0 0 8px"><span>Refund amount ($)</span>
      <input type="number" class="refund-amount" step="0.01" min="0" /></label>
    <button type="button" class="refund-confirm primary">Refund</button>
    <button type="button" class="refund-cancel">Cancel</button>
  `;
  const amountInput = panel.querySelector('.refund-amount');
  const checks = [...panel.querySelectorAll('.refund-piece')];
  const sumChecked = () => checks.filter((c) => c.checked).reduce((s, c) => s + Number(c.dataset.cents || 0), 0);
  const syncAmount = () => { amountInput.value = centsToDollars(sumChecked()); };
  checks.forEach((c) => c.addEventListener('change', syncAmount));
  syncAmount(); // pre-fill from the pre-checked clicked piece
  panel.querySelector('.refund-cancel').addEventListener('click', () => { panel.style.display = 'none'; });
  panel.querySelector('.refund-confirm').addEventListener('click', () => {
    const amountCents = Math.round(Number.parseFloat(amountInput.value || '0') * 100);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      card.querySelector('.order-msg').textContent = 'Enter a refund amount.'; return;
    }
    const checked = checks.filter((c) => c.checked);
    const relistIds = checked.map((c) => c.value);
    const who = order.customers?.email || order.customer_email || 'the buyer';
    // Read the title from the checkbox's own dataset — NOT by splitting the label text on ' — ', which
    // truncates a piece whose title itself contains ' — ' (the brand's titles are poetic; round-5 A #14).
    const what = checked.length ? checked.map((c) => c.dataset.title).join(', ') : 'this purchase';
    if (!window.confirm(`Refund ${who} $${centsToDollars(amountCents)} for ${what}? This issues a Stripe refund and can't be undone.`)) return;
    panel.style.display = 'none';
    submitRefund(order.id, amountCents, relistIds, card);
  });
}

async function submitRefund(orderId, amountCents, relistIds, card) {
  const msg = card.querySelector('.order-msg');
  msg.textContent = 'Issuing refund...';
  const buttons = card.querySelectorAll('button');
  buttons.forEach((b) => { b.disabled = true; });
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/refund`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_cents: amountCents, relist_product_ids: relistIds }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    msg.textContent = 'Refunded.';
    // ALWAYS offer to restore EACH returned piece (Sean's call — never leave stock un-restored).
    // Wording by state: a down piece (sold-out/archived) gets re-listed; an in-stock piece just +1.
    // relistPiece restores both axes either way.
    for (const r of (Array.isArray(body.relist) ? body.relist : [])) {
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

// Relist = RESTORE the returned unit (WS6.3): unarchive when archived AND put it back in stock
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
    msg.textContent = down ? `Refunded + relisted "${r.title}".` : `Refunded + "${r.title}" stock +1.`;
  } catch (err) {
    msg.textContent = `Refunded, but relist failed (${err.message}) — relist it from the product editor.`;
  }
}
```
*(`authHeader` / `loadOrders` / `centsToDollars` / `escapeHtml` already exist in `admin.js`; the `buildOrderCard` locals `customerEmail` (`:701`), `totalLabel` (`:711`), `productTitle` (`:698`) are **not** referenced by the new refund fns — those re-derive from the `order` param (e.g. `order.customers?.email`); the line refs only confirm those source values exist in the file. `centsToDollars` returns a plain dollar string (e.g. "50.00"), fine for the number input value. `openRefundPanel` is **async** — it fetches the cart's full sibling set by PaymentIntent (Phase 1.1c), so it shows every piece regardless of the active orders subtab, then falls back to the single clicked order if the fetch fails. A single-item order shows one pre-checked piece, so it's one extra reveal + the amount-edit affordance Sean asked for.)*

**Phase 1.6 — docs (as-built, after the build):** `STORE_ADMINISTRATION.md` refund section (now "issue it in /admin or via the Sunkeeper; pick the amount + which pieces came back; it asks about relisting each") + `GPT_SETUP.md` + `EVERLASTINGS_STORE.md` Stripe-sync note (**document that one cart = N `orders` rows sharing one `stripe_payment_intent`, so a refund is an AMOUNT against the PaymentIntent and flips/relists only the marked pieces**) + test-script **R15** flips from "can't issue refunds" → "issues an amount-based refund + asks about relisting." **Add a one-line "designed for one admin at a time" note** to `STORE_ADMINISTRATION.md` (the single-admin scope boundary in Invariants — so Em knows not to drive refunds/edits from two tabs/people at once; the GPT can say so if asked). (Do these in the as-built phase to avoid mid-build mixed truth.)

## Workstream 2 — Coupons in /admin (detailed)

> **Verified I/O contract (the anchor — confirmed against `api/products.ts`, so the admin field names aren't a guess).**
> - **List** (`handleCouponList`, `products.ts:779-789`) returns, per coupon: `{ code, promotion_code_id, percent_off, amount_off, times_redeemed, max_redemptions, expires_at, store_wide, product_ids }` (+ `expires_display`, `min_amount`, and the decode-free dollar strings `min_display`/`amount_display` added in 2.2). `renderCoupons` reads exactly these.
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
              <div id="c-product-list" class="coupon-product-list" style="max-height:180px;overflow-y:auto;border:1px solid var(--c-border,#ddd);border-radius:4px;padding:4px;margin-top:4px"></div>
              <p id="c-product-selected" style="font-size:12px;color:var(--c-text-muted,#666);margin:4px 0 0">Store-wide (no products selected)</p>
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
  $('c-product-search').addEventListener('input', populateCouponProducts); // re-filter live (render-tune AR#F9: debounce ~150ms if a template "User" catalog ever exceeds ~100 pieces; unconditional is fine at Emy's scale)
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
  // The scope picker needs published products' stripe_product_id. Refetch on each open so a piece
  // published earlier this session shows up; keep any prior list as a fallback on error.
  // (Render-tune, AR#F19: if a template "User" catalog ever grows past ~100 pieces, gate this
  //  refetch behind a short freshness check — fine to refetch unconditionally at Emy's scale.)
  try {
    const pr = await fetch('/api/products', { headers: { ...authHeader() } });
    const pb = await pr.json().catch(() => ({}));
    if (pr.ok && Array.isArray(pb.products)) state.products = pb.products;
  } catch { /* non-fatal — the picker keeps the last list, or shows Store-wide */ }
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
// with the GPT's product_ids array (createCoupon already accepts an array, contract line above).
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
    const min = c.min_amount ? ` · min $${centsToDollars(c.min_amount)}` : '';
    const ends = c.expires_display ? ` · ends ${escapeHtml(c.expires_display)}` : '';
    const row = document.createElement('div');
    row.style.cssText = 'border:1px solid var(--c-border,#ddd);border-radius:6px;padding:10px;margin-bottom:8px';
    row.innerHTML = `
      <p><span class="label">${escapeHtml(c.code)}</span> — ${escapeHtml(off)} · ${escapeHtml(scope)} · ${escapeHtml(used)}${min}${ends}</p>
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
  if (expires) payload.expires_date = expires; // raw date; the backend builds end-of-day in the STORE timezone (no browser-TZ drift)
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
*(`expires_date` is the raw YYYY-MM-DD; the backend (2.2) builds end-of-day in the store TZ so the stored instant, the confirm label, and `expires_display` all agree regardless of the owner's locale. List rows use a plain bordered div — WS4 restyles with tokens. `.toolbar`/`.empty`/`.product-form` classes already exist; `.label` exists too **but is scoped `.order-info .label`**, so it does NOT match the coupon code's `<span class="label">` in `#coupons-list` — DESIGN adds a standalone `.label` rule so the coupon code gets the muted/uppercase affordance.)*

**Phase 2.2 — backend: human-readable expiry on read (the `FEEDBACK_COUPON_v2_1_0` fix).** So the GPT never decodes a raw Unix timestamp.

> **No `listCoupons`/`createCoupon` response-schema edit needed.** Both ops declare an **opaque 200** — `'200': { description: … }` with **no `schema.properties`** (`v2_0_0_GPT_SCHEMA.txt:233-239`). With no declared response schema the platform passes the **raw JSON body** to the model, so `expires_display` on the wire (2.2b) + the relay instruction (2.3) are sufficient; declaring it would be inert. (Contrast `refundOrder`, which *does* enumerate its `relist` response — there the shape is declared, so additions there must be too.) Do **not** add a coupon response schema.

*2.2a — a formatter, above `handleCouponList`.* **CURRENT (`api/products.ts:751-752`):**
```ts
// ?_action=coupon (GET) — list active discounts so the owner can see/manage them.
async function handleCouponList(request: Request): Promise<Response> {
```
**NEW (add the helper just above it — declarations hoist, so `handleCoupon` at :733 can use it too):**
```ts
// One place to retarget if a future template "User" store isn't in ET — both expiry helpers read it
// instead of a literal, so cloning the project for another client is a one-line edit (AR#F14).
const STORE_TIMEZONE = 'America/New_York';

// Human-readable coupon expiry in the store's timezone, so the GPT/admin never decode a raw Unix
// timestamp (FEEDBACK_COUPON_v2_1_0: a raw expires_at was misread as July). Returned ALONGSIDE expires_at.
function formatExpiry(unixSeconds: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIMEZONE,
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(unixSeconds * 1000));
}

// End-of-day (23:59:59) on a YYYY-MM-DD calendar date, interpreted in the STORE timezone, as a Unix
// timestamp — so a coupon's stored expiry matches the date the owner picked regardless of their
// browser locale. Offset for THIS date is read EXPLICITLY via Intl formatToParts:
// never round-trip a localized string through `new Date()` — only ISO 8601 is guaranteed to parse,
// and toLocaleString's output is locale/ICU-version-dependent, so a Node/ICU bump could break it
// silently with no tsc warning. `shortOffset` yields "GMT-5" (EST) / "GMT-4" (EDT) for ET.
function endOfDayET(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: STORE_TIMEZONE, timeZoneName: 'shortOffset' })
    .formatToParts(new Date(Date.UTC(y, m - 1, d, 23, 59, 59)))
    .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-5';
  const offsetHours = Number(off.replace(/^GMT/, '').replace('−', '-')) || -5; // EST -5, EDT -4
  return Math.floor(Date.UTC(y, m - 1, d, 23 - offsetHours, 59, 59) / 1000);
}

// ?_action=coupon (GET) — list active discounts so the owner can see/manage them.
async function handleCouponList(request: Request): Promise<Response> {
```

*2.2b — include `expires_display`, the **minimum**, and decode-free dollar strings in each listed coupon. Emit `min_amount` plus `min_display`/`amount_display` (dollar strings) beside the raw cents, the same pattern as `expires_display`, so the GPT reports the minimum/amount in dollars rather than inferring cents. The GPT reads these off the opaque-200 raw body → **no schema edit** (same reasoning as `expires_display`). `/admin`'s `renderCoupons` keeps rendering raw cents via `centsToDollars`, unchanged. Phase 3.9's COUPONS instruction relays the display fields; TESTING item 13 asserts the GPT states dollars.* **CURRENT (`api/products.ts:786`):**
```ts
          expires_at: pc.expires_at ?? null,
```
**NEW:**
```ts
          expires_at: pc.expires_at ?? null,
          expires_display: pc.expires_at ? formatExpiry(pc.expires_at) : null,
          min_amount: pc.restrictions?.minimum_amount ?? null,
          min_display: pc.restrictions?.minimum_amount != null ? '$' + (pc.restrictions.minimum_amount / 100).toFixed(2) : null,
          amount_display: pc.coupon?.amount_off != null ? '$' + (pc.coupon.amount_off / 100).toFixed(2) : null,
```

*2.2c — echo it on create too.* **CURRENT (`api/products.ts:741`):**
```ts
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id });
```
**NEW:**
```ts
    return jsonResponse(request, { success: true, code: promo.code, coupon_id: coupon.id, promotion_code_id: promo.id, expires_display: typeof body.expires_at === 'number' ? formatExpiry(body.expires_at) : null });
```

**Phase 2.2d — `handleCoupon` builds the expiry in the store TZ (kills browser-TZ drift).** First add `expires_date?: string` to the inline request-body type. **CURRENT (`products.ts:694-702`):**
```ts
  let body: {
    type?: 'percent' | 'amount';
    value?: number;
    code?: string;
    product_ids?: string[];
    min_amount?: number;
    expires_at?: number;
    max_redemptions?: number;
  };
```
**NEW (add `expires_date?`):**
```ts
  let body: {
    type?: 'percent' | 'amount';
    value?: number;
    code?: string;
    product_ids?: string[];
    min_amount?: number;
    expires_date?: string;   // YYYY-MM-DD — preferred; normalized to a store-TZ end-of-day below
    expires_at?: number;     // Unix (legacy/back-compat)
    max_redemptions?: number;
  };
```
Then, at the top of `handleCoupon` (before `couponParams`), normalize `expires_date` to a store-TZ end-of-day timestamp so the rest of the handler + the 2.2c `formatExpiry` echo work unchanged:
```ts
  if (typeof body.expires_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.expires_date)) {
    body.expires_at = endOfDayET(body.expires_date); // store-TZ end-of-day → redeem_by + promo.expires_at + the echo
  }
```
Both surfaces send `expires_date`: /admin already does, and **the GPT does too now** (Phase 2.2e adds it to the `createCoupon` schema + instruction). That closes the v2.1 timestamp-misread regression on **both** surfaces, not just /admin — leaving the GPT to compute a Unix end-of-day itself was the exact failure class. `expires_at` stays accepted for back-compat. `endOfDayET` is the helper from 2.2a.

**Phase 2.2e — GPT schema (`v2_0_0_GPT_SCHEMA.txt`): prefer `expires_date` on `createCoupon` (parity + regression-class closure).** **CURRENT (`:231`):**
```yaml
                expires_at: { type: integer, description: Unix timestamp when the code expires. Optional. }
```
**NEW (add `expires_date` as the preferred field; demote `expires_at` to legacy):**
```yaml
                expires_date: { type: string, description: "End date as YYYY-MM-DD (e.g. 2026-06-21). PREFER THIS — the server sets end-of-day in the store's timezone, so you never compute a timestamp. Optional." }
                expires_at: { type: integer, description: "Unix timestamp (legacy — use expires_date instead). Optional." }
```
*(`handleCoupon`'s 2.2d normalization already accepts `expires_date`, so the backend is ready — only the schema + instruction needed exposing. Each `description` < 300 chars.)*

**Phase 2.3 — GPT instructions: read-back before create + use `expires_display`.** *(→ Documents the COUPONS rule change; the file is shipped from **Phase 3.9** in full — don't hand-apply the block below.)* **CURRENT (`v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt:19`):**
```
COUPONS: translate her wish into createCoupon (percent, or amount-off in cents; dollars->cents; optional code/scope/min/expiry/cap). A product-scoped coupon needs a PUBLISHED product (a draft has no Stripe id); else make it store-wide. NEVER promise BOGO / "buy N". Read the code back. listCoupons shows running sales and each one's scope (store-wide vs specific); relay it. deactivateCoupon {code} ends one now. For a temporary sale, a coupon (not a price cut) keeps the list price intact.
```
**NEW (read the full terms back in plain dates before creating; never decode a timestamp):**
```
COUPONS: translate her wish into createCoupon (percent, or amount-off in cents; dollars->cents; optional code/scope/min/expiry/cap). A product-scoped coupon needs a PUBLISHED product (a draft has no Stripe id); else make it store-wide. NEVER promise BOGO / "buy N". CONFIRM FIRST: read the full terms back in plain language before creating ("20% off store-wide, runs through Sun Jun 21 — create it?"); never invent an expiry she didn't give; pass her end date as expires_date (YYYY-MM-DD), never a Unix timestamp. listCoupons returns expires_display (a plain date) + min_display/amount_display (plain dollars) beside each sale's scope (store-wide vs specific) — relay THOSE; never decode a raw cents value or timestamp yourself. deactivateCoupon {code} ends one now. For a temporary sale, a coupon (not a price cut) keeps the list price intact.
```

## Workstream 3 — Chat-attach upload + admin media UX (detailed)

*Folds `assets/docs/archive/v3_0/v3_0_0_GPT_DIRECT_IMG_UPLOAD.md` + the alt-text + filename/role additions. **Mechanism:** OpenAI's `openaiFileIdRefs` — Em attaches photos in the chat, the GPT forwards them, the server fetches each `download_link` through the EXISTING `api/upload.ts` pipeline. **Dual-path by design:** the by-link `uploadImage` stays as the backstop (Drive / video / 10+ bulk). No DB change, no new Vercel function.*

**Phase 3.1 — `api/upload.ts`: extract the per-file tail into `processOne`.** The single-file validation + Cloudinary/R2 pipeline + success return (the block **from `if (!slug || !role)` at `:195` through the closing `catch` at `:320`** — the `try` opens at `:229` and its `catch` closes at `:320`, *after* the success `return jsonResponse(request, { url: publicUrl, filename })` at `:316`, so the **whole `try…catch` moves intact**, not just through the success return) **moves verbatim** into a module-level helper that returns a result object instead of a `Response`: swap **each** `return jsonResponse(request, { error: … }, status)` — **including the trailing `catch`'s** `return jsonResponse(request, { error: 'Upload failed' }, 500)` → `return { ok: false as const, error: 'Upload failed', status: 500 }` — for a result object, and the final success return for `return { ok: true as const, url: publicUrl, filename }`.
```ts
type UploadResult = { ok: true; url: string; filename: string } | { ok: false; error: string; status: number };

async function processOne(file: File, slug: string, role: string, skipTransformField: string | null): Promise<UploadResult> {
  if (!slug || !role) return { ok: false, error: 'Missing file, slug, or role', status: 400 };
  if (!ROLE_PATTERN.test(role)) return { ok: false, error: 'Invalid role', status: 400 };
  // … the existing :202–320 body (through the closing catch), verbatim, with the return-swaps above (incl. the catch) …
}
```
The single-file POST path then ends by calling it (replacing the inlined `:195–320` tail): `const r = await processOne(file, slug, role, skipTransformField); return r.ok ? jsonResponse(request, { url: r.url, filename: r.filename }) : jsonResponse(request, { error: r.error }, r.status);` *(`processOne` is module-level — place it beside `normalizeMediaUrl`/`isPublicHttpUrl`, above `export async function POST`, alongside the 3.2 helpers.)*

> **Verified externals.** The `:195–320` body references ONLY: the four params `{file, slug, role, skipTransformField}` + module-level declarations already in `upload.ts` — `ALLOWED_MIME` (`:34`), `MIME_TO_EXT` (`:43`), `ROLE_PATTERN` (`:52`), `getCloudinaryConfig` (`:62`), `sha1Hex` (`:69`), `isTest`/`env` (imports `:4`), `s3` (`:6`). After the two return-swaps (`jsonResponse(request, …)` → plain result objects) it references **no** `request`, `corsHeaders`, or `formData`, so the 4-param signature is sufficient — no `tsc "X is not defined"` cascade. `handleAttachedRefs` (3.2) likewise reads only module-level `ROLE_PATTERN`/`ALLOWED_MIME`/`MIME_TO_EXT`/`isPublicHttpUrl` — all confirmed module-scope. If the working tree has drifted, re-confirm before extracting.

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
  const failures: Array<{ index: number; error: string }> = [];
  const usedRoles = new Set<string>();
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i] as FileRef;
    const link = typeof ref?.download_link === 'string' ? ref.download_link : '';
    const role = (typeof roles[i] === 'string' && ROLE_PATTERN.test((roles[i] as string).trim()))
      ? (roles[i] as string).trim()
      : positionalRole(i);
    // Each file must land at a UNIQUE role: the server names the R2 object `{role}-{slug}`, so two files
    // sharing a role would silently OVERWRITE each other (no error). A bad/duplicate explicit role, or a
    // positional fallback landing on an already-taken role, surfaces loudly instead of losing the file.
    if (usedRoles.has(role)) {
      failures.push({ index: i + 1, error: `role "${role}" is already used by an earlier file — give each photo a distinct role` });
      continue;
    }
    // Collect per-file failures instead of bailing on the first — else an already-uploaded batch is
    // orphaned when file N is bad, and Em re-attaches all 7 (double R2 cost). The GPT reuses the
    // successes + asks her to re-attach only the failures.
    if (!isPublicHttpUrl(link)) {
      failures.push({ index: i + 1, error: 'no usable download link (links last ~5 min — re-attach)' });
      continue;
    }
    let mediaRes: Response;
    try { mediaRes = await fetch(link, { redirect: 'follow' }); }
    catch { failures.push({ index: i + 1, error: 'could not fetch the attached file' }); continue; }
    const fetchedType = (mediaRes.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!mediaRes.ok || !ALLOWED_MIME.has(fetchedType)) {
      failures.push({ index: i + 1, error: `not an allowed image (got "${fetchedType || 'unknown'}")` });
      continue;
    }
    // Attach is IMAGES-ONLY. A video routed here would be named with an image role (positional default
    // `hero`) and the GPT would drop its url into images[] → the page renders a broken <img src=.mp4> and
    // the clip never shows (populateMedia reads media[], not images[]). Reject it loudly so the misroute
    // can NEVER be silent, even if the GPT slips past the instruction. Video = by-link only.
    if (fetchedType.startsWith('video/')) {
      failures.push({ index: i + 1, error: 'video must be sent as a LINK, not attached — ask Em for a Drive share or direct URL and use uploadImage' });
      continue;
    }
    const bytes = Buffer.from(await mediaRes.arrayBuffer());
    const file = new File([bytes], `upload.${MIME_TO_EXT[fetchedType] ?? 'bin'}`, { type: fetchedType });
    const r = await processOne(file, slug, role, null); // attach is images-only → never skip_transform
    if (!r.ok) { failures.push({ index: i + 1, error: r.error }); continue; }
    uploads.push({ url: r.url, filename: r.filename, role });
    usedRoles.add(role); // claim only on success → a file that failed to upload doesn't block a later retry of its role
  }
  // 200 with both arrays — partial success IS success: the GPT uses uploads[] and surfaces failures[].
  return jsonResponse(request, { uploads, failures });
}
```
*(`files.oaiusercontent.com` is public https → passes the existing `isPublicHttpUrl`. The server names each file `{role}-{slug}` from the resolved role, so nobody renames anything. **Unique role per file:** because the filename IS the role, two files resolving to the same role would overwrite each other in R2 — so a collision (a duplicate explicit role, or a positional fallback that lands on an already-claimed role) is rejected with a per-file failure rather than silently destroying the earlier upload; the role is claimed only on a successful upload, so a failed file never blocks a later retry of its role. `new File([bytes], …)` + `Buffer` are **Node 20+ globals** — present at runtime even though `tsc` wouldn't flag their absence (`lib.dom` declares `File`). Don't lean on Vercel's *silent* default: the build **pins `engines.node` to `">=20"` in `package.json`** (a documented contract — byte-anchored in **Phase 3.2b** below) and confirms no `vercel.json` runtime override forces Node 18 on `api/upload.ts` — both checked in the TESTING static gate. **Attach is images-only:** a `video/*` MIME is rejected with a clear per-file failure ("send it as a link, use uploadImage"), so an attached video can never be silently named with an image role + dropped into `images[]` (which would render a broken `<img src=.mp4>` and never show as media). The GPT instruction (MEDIA) tells it not to attach video; this guard is the belt-and-suspenders so a slip surfaces loudly, not as a broken page. **Auth is already enforced:** `authorize(request)` runs at the **top of `POST`** (`upload.ts:118`), before the JSON content-type fork (`:129`) that reaches `handleAttachedRefs` — so the attach branch is gated; no per-branch auth check needed.)*

**Phase 3.2b — `package.json`: pin the Node runtime (byte-anchored).** `handleAttachedRefs`'s `new File([bytes], …)` + `Buffer` are Node 20+ globals (above) and `tsc` can't catch a missing runtime global, so pin the floor explicitly instead of leaning on Vercel's silent default. **CURRENT (`package.json` — no `engines` field today):**
```json
{
  "name": "everlastings-website",
  "private": true,
  "dependencies": {
```
**NEW (insert `engines` as a top-level sibling of `dependencies`):**
```json
{
  "name": "everlastings-website",
  "private": true,
  "engines": { "node": ">=20" },
  "dependencies": {
```
*(Then confirm no `runtime` override in `vercel.json` forces Node 18 on the upload function — there is none today; both are re-checked in the TESTING static gate.)*

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
                  description: "Optional, same order as the attached photos: what each is — hero, gallery-01..15, detail-01..05, thumbnail, seo_thumbnail, checkout_image. If omitted, the first becomes hero and the rest gallery-01, gallery-02, … You can reuse the hero url for thumbnail on createProduct."
      responses:
        '200': { description: "Returns { uploads: [{ url, role, filename }, …], failures: [{ index, error }, …] }. Use each uploaded url verbatim in the product fields; if failures is non-empty, keep the successes and ask Em to re-attach just those." }
        '400': { description: "No files attached, more than 10 files, or a missing slug (whole-request errors). Per-file problems come back in failures[], not here. Relay plainly." }
  /api/orders:
```
*(**Keep `openaiFileIdRefs` as `items: { type: string }`.** That is OpenAI's **documented** Custom-GPT contract: the platform recognizes the property name and substitutes the string array with `{name,id,mime_type,download_link}` objects at runtime, which the 3.2 handler then reads. Declaring the object shape in the schema would fight the documented substitution — and a stricter Action validator could reject a placeholder that no longer looks like a string array. We favor the documented mechanism over guessing at platform internals; the real-preview smoke test (TESTING item 14) is what proves the round-trip, and would catch a future contract change.)*

*3.4b — point `uploadImage` at the new op.* The FULL summary string (quoted whole so the builder verifies the count by reading):
**CURRENT (`:269`, 291 chars):** `"Upload a photo or video to the store's CDN and return its url; call it for every image/video before createProduct/editProduct, then put the url into images[]/thumbnail/checkout_image/seo_thumbnail/media[]. Media comes as a LINK (a Drive share or direct URL); you can't forward a pasted file."`
**NEW (250 chars — verified `wc -c` < 300):** `"Upload a photo or video to the CDN and return its url; call before createProduct/editProduct, then put the url into images[]/thumbnail/checkout_image/seo_thumbnail/media[]. By LINK (Drive share/URL) or video. If she ATTACHED photos, use uploadImages."` *(re-count if edited; the `uploadImages` summary at 3.4a already redirects video → uploadImage, 273 chars, so the two ops agree.)*

**Phase 3.5 — GPT instructions (`v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt`): attach-first + alt + roles.** *(→ Documents the attach/alt/roles rule changes; the file is shipped from **Phase 3.9** in full — don't hand-apply the blocks below.)*

*3.5a — step 3 (`:6`).* **CURRENT:**
```
3. Photos/videos arrive as LINKS only (a Google Drive "anyone with the link" share, or a direct file URL); you cannot use a file pasted into chat. uploadImage each (roles are in the uploadImage Action); it returns a CDN url, use that verbatim, never invent one. REQUIRED or the create fails: at least 1 hero + at least 5 gallery + a thumbnail (you may reuse the hero url) = 7 minimum; other roles are extras. If she cannot give 5 gallery angles, say so plainly; do not retry.
```
**NEW:**
```
3. Photos: if she ATTACHES them to the chat, call uploadImages (pass openaiFileIdRefs; optionally roles[] in the shown order — hero, gallery-01.., detail-01..). If she gives a Drive "anyone with the link" share or a direct URL (or it's a video), call uploadImage instead. Either returns CDN urls — use them verbatim, never invent one. uploadImages returns uploads[] + failures[]; if any failed, keep the ones that worked and ask her to re-attach ONLY those (never re-send the successes). You assign the ROLE; the server names each file (never rename or invent a filename). Write a short descriptive ALT for every image (and thumbnail_alt) — never leave alt blank. REQUIRED or the create fails: at least 1 hero + at least 5 gallery + a thumbnail (you may reuse the hero url) = 7 minimum; other roles are extras. If she cannot give 5 gallery angles, say so plainly; do not retry.
```
*3.5b — LINK TROUBLE (`:27`).* **CURRENT:**
```
LINK TROUBLE: if uploadImage 400s (a Drive share PAGE not the file, not public, or a video over ~25 MB showing a scan page), ask her for an "anyone with the link" Drive share or a direct URL (Dropbox "?dl=1" / CDN), then retry. A photo pasted in chat -> say you can't use a pasted file; ask for a link.
```
**NEW:**
```
LINK TROUBLE: an attached photo -> uploadImages (forward openaiFileIdRefs). If it returns failures[] (a link expired — they last ~5 min), keep the successes and ask her to re-attach just those. A 400 means none came through (or >10 / no slug) -> ask her to re-attach and retry. If uploadImage (by-link) 400s (a Drive share PAGE not the file, not public, or a video over ~25 MB showing a scan page), ask for an "anyone with the link" Drive share or a direct URL (Dropbox "?dl=1" / CDN), then retry. Video + 10+ photo batches stay on the link path.
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

> **Upload control = role-sectioned per DESIGN P3d (U2).** The single `#upload-role` select is replaced by per-role upload zones (role = the zone you drop into — closes the video-role gap and kills the wrong-role footgun); 3.7c's video auto-skip moves into the **Video** zone's handler. The image previews (3.7a) + structured media editor (3.7b) stand as byte-anchored. The sectioned control itself is executable-design (concrete default + render-tune), not byte-anchored here.

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
    <span class="img-role" style="font-size:11px;color:var(--c-text-muted,#666)"></span>
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
    const m = v.match(/\/(?:test_)?(hero|thumbnail|seo_thumbnail|checkout_image|gallery-\d+|detail-\d+|video-\d+)[-.]/); // all 7 roles (AR#37) — was missing seo_thumbnail/checkout_image
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
  const thumb = !!$('p-thumbnail').value.trim() || hero; // hero IS reused as the thumbnail at submit (buildProductPayload, below) — so this ✓ is honest
  const part = (ok, label) => `<span style="color:${ok ? 'var(--c-success,#2f7d52)' : 'var(--c-warn,#8a5a00)'}">${ok ? '✓' : '•'} ${label}</span>`; // tokens-with-fallback (AR#D4) — was the literal --c-success/--c-warn values, a duplication trap
  el.innerHTML = [part(hero, 'hero'), part(gallery >= 5, `gallery ${gallery}/5`), part(thumb, 'thumbnail')].join(' &nbsp; ');
}
```

*3.7a-thumb — make the `✓ thumbnail` truthful.* The coverage hint counts a thumbnail as satisfied when only a hero exists (`|| hero` above), but `buildProductPayload` sends `#p-thumbnail` verbatim — so publish (requires a thumbnail) would reject *after* a green ✓ that just told her she's good. Mirror the GPT's "you may reuse the hero url" server-side from the admin. **CURRENT (`admin.js:433`):**
```js
    thumbnail: $('p-thumbnail').value.trim(),
```
**NEW (fall back to the hero image url when the field is blank, so the ✓ matches what's saved):**
```js
    thumbnail: $('p-thumbnail').value.trim()
      || [...$('p-images').querySelectorAll('.img-url')].map((i) => i.value.trim()).find((u) => /\/(?:test_)?hero-/.test(u))
      || '',
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
- **`admin/index.html` CSS CURRENT (`:61`):** `      .img-url-row { display: grid; grid-template-columns: 140px 1fr 1fr auto; gap: 6px; align-items: center; }` → **NEW:** `      .img-url-row { display: grid; grid-template-columns: 40px 64px 1fr 1fr auto; gap: 6px; align-items: center; }` + add `      .img-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; background: var(--c-surface-2, #eee); }` right after it.

*3.7b — structured MP4/YouTube editor (replaces the raw-JSON `#p-media` textarea).* **`admin/index.html` CURRENT (`:159`):**
```html
              <label class="field"><span>Media (JSON array — optional MP4 / YouTube, in order)</span><textarea id="p-media" rows="3" placeholder='[{"type":"video","url":"https://cdn.../video-01-slug.mp4","loop":true,"autoplay":true},{"type":"youtube","url":"https://youtu.be/ID"}]'></textarea></label>
```
**NEW:**
```html
              <div>
                <strong style="font-size:13px">Media (optional — MP4 clips + YouTube, in order)</strong>
                <p style="font-size:12px;color:var(--c-text-muted,#666);margin:4px 0 8px">MP4s render before YouTube. Per clip, choose how it plays.</p>
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
  row.style.cssText = 'border:1px solid var(--c-border,#eee);border-radius:4px;padding:8px;display:grid;gap:6px';
  row.innerHTML = `
    <div class="media-row__head">
      <select class="m-type"><option value="video">MP4 clip</option><option value="youtube">YouTube</option></select>
      <input type="url" class="m-url" aria-label="Video or YouTube URL" placeholder="https://cdn.../video-01-slug.mp4  ·  or  https://youtu.be/ID" style="min-width:0;padding:6px 8px;border:1px solid var(--c-border-strong,#ccc);border-radius:4px;font:inherit;font-size:13px" />
      <button type="button" class="remove-row">Remove</button>
    </div>
    <div class="m-video-opts" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;font-size:13px">
      <label class="checkbox-row"><input type="checkbox" class="m-autoplay" /><span>Autoplay + loop, silent (GIF-like)</span></label>
      <label class="checkbox-row"><input type="checkbox" class="m-controls" checked /><span>Show play/pause buttons (uncheck = button-less click-to-play)</span></label>
      <input type="url" class="m-poster" aria-label="Poster image URL" placeholder="poster image url (still shown before play)" style="flex:1;min-width:160px;padding:6px 8px;border:1px solid var(--c-border-strong,#ccc);border-radius:4px;font:inherit;font-size:13px" />
    </div>
    <input type="text" class="m-alt" aria-label="Clip alt text" placeholder="alt text — describe the clip" style="padding:6px 8px;border:1px solid var(--c-border-strong,#ccc);border-radius:4px;font:inherit;font-size:13px" />
  `;
  row.querySelector('.m-type').value = m?.type === 'youtube' ? 'youtube' : 'video';
  row.querySelector('.m-url').value = m?.url || '';
  row.querySelector('.m-autoplay').checked = m?.autoplay === true;
  row.querySelector('.m-controls').checked = m?.controls !== false; // controls default true; only an explicit controls:false unchecks (button-less click-to-play) — AR#F16, owner-settable now
  row.querySelector('.m-poster').value = m?.poster || '';
  row.querySelector('.m-alt').value = m?.alt || '';
  const opts = row.querySelector('.m-video-opts');
  const autoplayCb = row.querySelector('.m-autoplay');
  const controlsCb = row.querySelector('.m-controls');
  const syncOpts = () => {
    opts.style.display = row.querySelector('.m-type').value === 'video' ? 'flex' : 'none';
    controlsCb.disabled = autoplayCb.checked; // GIF-like = no buttons; the toggle only applies to click-to-play
  };
  syncOpts();
  row.querySelector('.m-type').addEventListener('change', syncOpts);
  autoplayCb.addEventListener('change', syncOpts);
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
    if (row.querySelector('.m-autoplay').checked) { item.autoplay = true; item.loop = true; } // GIF-like preset; controls omitted on purpose — populateMedia derives no-controls from autoplay (product.js:252-254), so it renders button-less
    else if (!row.querySelector('.m-controls').checked) { item.controls = false; } // click-to-play, button-less — owner unchecked "Show play/pause buttons" (product.js:258 reads m.controls!==false). AR#F16: owner-settable now, was a hidden dataset before
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
`add-media-row` wiring — **folded into DESIGN P0(iii)'s consolidated `attachEventListeners` diff**. 3.7b above defines `addMediaRow` + the `#add-media-row` button *unwired*; P0(iii)'s NEW block adds `$('add-media-row').addEventListener('click', () => addMediaRow(null));` right after its `add-image-row` line. **No separate `:152` edit here** — the `admin.js:152-161` region is touched exactly once, at WS4, so the WS3-before-WS4 build order never hits a stale byte-anchor.

*3.7c — video auto-skip is owned by P3d, NOT a standalone edit to the old control.* The single `#upload-role` control is **removed** by DESIGN P3d (role-sectioned zones), so byte-anchoring an `isVideo` skip onto its handler (`admin.js:371`) would be applied-then-stripped — the exact hazard the byte-anchored discipline exists to prevent. Instead **the rule lives in P3d's Video zone**: every upload from the Video zone POSTs `skip_transform=true` unconditionally (a video always skips the Cloudinary crop — replaces the old global checkbox/auto-infer). The chat-attach path takes **no** video at all — 3.2's `handleAttachedRefs` **rejects** `video/*` with a "send it as a link" failure, so attach is images-only and video skip-transform only ever happens on the by-link `uploadImage` path + the admin Video zone. **Do not apply a standalone `#upload-role` edit** — there's no such control after P3d.

*(Same `media` array shape the frontend `populateMedia` already reads — `{type, url, autoplay?, loop?, poster?, alt?}` — so `api/products` + `product.js` are untouched. WS4 restyles these rows with tokens.)*

**Phase 3.8 — premise-update sweep (as-built, post-build).** Flip the v2.0.0 docs' "media arrives by link / can't forward a pasted file" premise (`v2_0_0_IMPLEMENT.md:8/:55`, `EVERLASTINGS_STORE.md`, `GPT_SETUP.md`, `product-reference.md`) to "attach in chat via `uploadImages`, with by-link as the backstop." Do at as-built to avoid mid-build mixed truth.

**Phase 3.9 — FINAL GPT instructions file (ships verbatim).** The file is a full rewrite of `v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt` — dense run-ons broken into clean labeled lines, cross-section redundancy removed, **every distinct rule kept** (section-by-section patching can't fit the 8000 cap; see RATIONALE). **Verified `wc -c` = 7788 / 8000** (212 headroom — fenced-block extraction; the build re-counts the shipped `.txt`).

**This is the artifact to ship: replace `v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt` IN FULL with the content below** (it is the canonical final text — the per-workstream instruction phases above, 1.4a/1.4b REFUNDS+poster · 2.3 COUPONS · 3.5a/3.5b attach, document the *rule deltas* this file embodies, i.e. the WHY; this block is the WHAT). After pasting, `wc -c` to confirm < 8000.

```
You're 'The Sunkeeper', warm, capable Everlastings by Emaline store studio assistant. Help artist Em add/edit product, run sales, fulfill orders, in plain language. Never expose API keys, URLs, jargon unless asked. Field definitions, how to write each, is your PRODUCT-REFERENCE knowledge file. Use brand VOICE-GUIDE. Action description show mechanics to rely on.

Create PRODUCT FLOW order: slug - upload photos - createProduct - share preview - publish
Conversationally ask for fields. Reqd: title, headline (5-7 word tagline), story_card (2-8 poetic para.), description, features, price (dollars), product_type=miniature. Optl. fields in PRODUCT-REFERENCE.
1. Compute slug ONCE (v. THE SLUG) before upload.
2. Photos ATTACHED in chat: call uploadImages (forward openaiFileIdRefs; optl. roles[] in the shown order: hero, gallery-01.., detail-01.., thumbnail, seo_thumbnail, checkout_image). Photos from anyone with SHARE LINK or direct URL, call uploadImage (not plural).
CDN url returned to use verbatim.
uploadImages can return failures[] (v. LINK TROUBLE)
You assign the ROLE; the server names the file from it — never rename or invent a filename.
Write descriptive alt for every image + thumbnail_alt — reqd., never blank.
Reqd. 7 image min. = 1 hero, 5+ gallery, thumbnail (or hero img again w. new role); other roles are extra. Don't try without min., just ask for another.
3. createProduct: draft checkout checkout_name/description/image; SEO seo_title/description/thumbnail; array materials/features/care/shipping; price in CENTS ($245 = 24500) but you speak dollars.
PREVIEW draft returned, say "Preview just like customers see it <preview_url>. Tap PUBLISH or tell me to." no need to read fields back.

PREVIEW is the REVIEW. Drafted fields get CONFIRMED before saving unless directed to EXPEDITE straight to preview.

THE SLUG
Create once never can edit after; do first before upload
Reuse EXACT string every uploadImage/uploadImages, createProduct
Use URL handle in CDN photo folder before rows exist
HOW: take title, fold accent letters to plain ASCII eg. café=cafe, piñata=pinata, never drop letter; all lowercase, spaces=hyphens, strip anything not a-z/0-9/hyphen eg. Em's Lavender & Sage = ems-lavender-sage; Collapse repeats; ask for Latin-letters title if needed
IMPT: server folds same way; must do same so slug is identical ensuring CDN media place in right folder

EDITING
FIND: getProduct by slug (returns live/draft + the id) or listProducts to browse. A getProduct 404 (an apostrophe/ampersand title = a slug you can't rebuild): listProducts, match her words to a title, getProduct that exact slug. Never say "can't find it" before listing.
BUILD EDITS FROM `effective` (live + staged) ALWAYS — incl. the COMPLETE images/media array (no per-photo edit; send the whole array + thumbnail or the next edit drops the rest). Never wipe staged edits; never report a `draft` value as live (top-level = what shoppers see now).
editProduct = id + only the changed fields. LIVE instantly: price, availability, quantity. STAGES a draft (preview, then publish): copy, SEO, photos, media. So "mark sold" / "set price to X" / "got 3 more in" = save + say it's done; copy/photo edits = stage + share the preview link.
"Feature on homepage" = {featured:true}. "Add to <name> collection" = {series:"<name>"}.
discardEdits {id} drops a pending draft (a price change isn't staged — undo it with another editProduct).
HEADS-UP: a live price/availability/quantity change leaves earlier staged copy edits alone; if getProduct still shows a `draft`, tell her to preview+publish or discard them.

REMOVING: archiveProduct takes a piece down (stays findable; undo w. unarchiveProduct). NO delete.

PUBLISHING: "publish" / "make it live" = publishProduct {id} — for a new piece this creates the Stripe listing + makes it buyable, and the old preview link then stops (expected). A publish 400 ("Missing required fields: story_card" / "Minimum 5 gallery images") = say plainly what to add (story_card = the story, headline = the tagline). Lost preview? getProduct + hand back its preview_url EXACTLY (never build a URL); none returned = it's fully live, give the plain product page link. Never make a no-op edit to "regenerate" a link.

COUPONS: createCoupon = percent OR amount-off in cents (dollars→cents); optional code/scope/min/expiry/cap. A product-scoped coupon needs a PUBLISHED piece (a draft has no Stripe id) — else store-wide. NEVER promise BOGO / "buy N". CONFIRM FIRST: read the terms back plainly ("20% off store-wide, through Sun Jun 21 — create it?"); never invent an expiry; pass her end date as expires_date (YYYY-MM-DD), never a Unix timestamp. listCoupons gives expires_display (a plain date) + min_display/amount_display (plain dollars) + each sale's scope — relay those, never decode a raw cents/timestamp. deactivateCoupon {code} ends one now. A temp sale = a coupon, not a price cut (keeps the list price).

ORDERS: listOrders finds them (status=needs_shipping/shipped; q = order id, email, or tracking) — read back plainly. markShipped needs tracking + carrier (exactly USPS, UPS, FedEx, DHL; "post office" = USPS). CONFIRM FIRST: "Mark <product> shipped via <carrier> <tracking> + email <buyer>?" — it emails the buyer, can't be undone. email_sent:false = tracking saved but the email didn't; text Sean.

REFUNDS: find the order first (listOrders q=<buyer email or id> — reaches past/shipped orders). A Stripe refund is an AMOUNT against the whole purchase, and one cart can be several orders on one payment. refundOrder {id} refunds THIS order's amount + relists THIS piece. CONFIRM FIRST: read back piece(s) + amount + buyer ("Refund <buyer> $X for <product>? Can't be undone."). Several pieces, one purchase: confirm which came back, pass relist_product_ids:[their ids] + amount_cents=summed cents. Goodwill/partial, nothing back: amount_cents + relist_product_ids:[] (refunding the FULL CART total as goodwill still flips status — a smaller goodwill amount doesn't — tell her). It returns `relist`, one entry r per returned piece; a refund never relists itself, so for EACH r ALWAYS offer to restore it — down (r.available false or r.archived) "Put it back up for sale?", else "Add 1 to its quantity?". Yes = editProduct {id:r.product_id, available:true, quantity:r.quantity+1}; if r.archived, ALSO unarchiveProduct {id:r.product_id}. Revenue/payouts live in Stripe.

MEDIA (optional page video): video is ALWAYS by-link — even if she ATTACHES it, don't uploadImages; ask for a Drive share/direct link, then uploadImage the MP4 (skip_transform:true). Then ALWAYS ask per clip (never assume): autoplay + loop, silent, no buttons (GIF-like) OR click-to-play with sound (the default; she can add a still "poster" = the image shown before it plays). Set the media flags. MP4s render before YouTube (YouTube is rare); empty media hides the section. No GIFs.

LINK TROUBLE: attached photos = uploadImages (forward openaiFileIdRefs); failures[] (a link expired — they last ~5 min) = keep the successes, ask her to re-attach ONLY those (never re-send successes). A 400 = none came through (or >10 / no slug) — ask her to re-attach, retry. uploadImage (by-link) 400 (a Drive share PAGE not the file, not public, or a video >~25 MB showing a scan page) = ask for an "anyone with the link" Drive share or direct URL (Dropbox "?dl=1" / CDN), retry. Video + 10+ photo batches stay on the link path.

ALWAYS: write in Em's voice (warm, poetic, quietly magical, never sales-y; full guidance in VOICE-GUIDE). 409 (slug/code taken) = suggest a new title/code; 400 = name the missing field plainly; 401 = stop: "the connection key needs Sean's attention." Never invent a tracking number, carrier, or URL; never set a price she didn't say.
```

*(**Rule-diff confirmed** against the v2.0.0 file + the WS1–3 rule deltas — every rule survived the restructure: the amount-based refund with `{id:r.product_id}` on both relist calls + the full-goodwill-flip note; `thumbnail_alt`; the never-invent-a-filename guardrail; `expires_date`/`expires_display`; the attach/`failures[]` recovery; the 7-image minimum. "Never invent a URL" lives in ALWAYS. **The cap is HARD** — any future instruction edit must re-run `wc -c`; there is no slack to spend carelessly. Phases 1.4a/1.4b/2.3/3.5a/3.5b describe the deltas, this is the shipped text.)*

## Workstream 6 — Inventory: decrement stock on a sale (pre-existing gap)

> **Stock lives only in `products.quantity` (Supabase); Stripe holds no inventory** — verified against Stripe's docs: Products/Prices have **no** stock field; you pass a *transactional* line-item `quantity` per Checkout and Stripe forgets it after charging. Stripe's own limited-inventory guidance = keep stock in your DB, decrement on `checkout.session.completed`. Today the webhook flips `available=false` on **any** sale and never touches `quantity`, so a multi-stock piece is stranded after one sale and `quantity` goes stale. Byte-anchored.

**The rule — one place, applied everywhere `quantity` changes:** on a sale `quantity = max(quantity − 1, 0)` and `available = (quantity > 0)`. That derivation *is* the entire "when to make it unavailable" logic. A sale **never archives** — `archived_at` stays an independent, manual owner action. The checkout gate is already correct (`available && quantity >= 1`, `checkout.ts:79`/`:205`) and the line-item quantity stays `1` (one of each piece per order). One-of-a-kind pieces (qty 1) behave exactly as today (1 → 0 → `available:false`).

**Phase 6.1 — migration: cutover data-fix + an atomic stock-decrement RPC.** New `supabase/migrations/20260616000001_v3_1_inventory_decrement.sql` (apply via the Supabase CLI — the MCP rejects writes). **Renumber the timestamp prefix to be monotonic at apply time** if a later migration already exists (Supabase orders by filename):
```sql
-- CUTOVER DATA-FIX (run once, before the function): pre-WS6, a sale flipped available=false but never
-- decremented quantity, so an already-sold piece sits at available:false, quantity:1. Post-WS6 a refund
-- relist does quantity+1 = 2 → a phantom unit. Align quantity with the sold state first so relist lands
-- at 1, not 2. SCOPED to actually-SOLD rows via `exists (orders)` so a manually-paused or
-- never-sold piece the owner left in stock is NOT silently zeroed (design for the
-- template "User" with a real catalog, not Emy's all-qty-1 store; an owner's intentional pause is intent
-- we must not overwrite). The `exists` is HARD-SCOPED to the env dimension too — `and o.is_test =
-- p.is_test` (both columns are `NOT NULL DEFAULT false`; initial_schema :172 products / :174 orders) —
-- because the shared Supabase project always carries test orders, so the dimension match must be in the
-- SQL, not a comment the operator might skip. EYEBALL FIRST — and the UPDATE below ships COMMENTED on
-- purpose (AR#C-R2-1): `supabase db push` then applies ONLY the safe record_sale function and never
-- auto-zeroes stock. A doc-only "remember to eyeball" gate doesn't bind the template "User" the project
-- designs for — a multi-stock catalog can hold an intentionally-paused-but-previously-sold piece that a
-- blind apply would wrongly zero. So: run the SELECT, confirm the rows it lists are genuinely sold (not
-- a paused-with-stock piece), THEN uncomment + run the UPDATE once, by hand.
--   select id, slug, title, quantity from products p
--     where p.available = false and p.quantity > 0
--       and exists (select 1 from orders o where o.product_id = p.id and o.is_test = p.is_test);
-- update products p set quantity = 0
--   where p.available = false and p.quantity > 0
--     and exists (select 1 from orders o where o.product_id = p.id and o.is_test = p.is_test);

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
*(**Invariant — `p_ids` has no duplicates today**, so the simpler `- 1` would also be correct: the cart dedupes by `product_id` (`main.js:121` returns early on a re-add), there is no quantity selector, and each checkout line-item is hardcoded `quantity: 1` (`checkout.ts:96`) with one `metadata.items` entry per distinct piece — a piece is sold to **separate sequential orders**, never N-in-one-cart. The `unnest`/`count(*)` form is zero-cost hardening that documents this invariant and future-proofs a quantity selector. `tsc` n/a — SQL.)*

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

> **Mid-build orientation:** `EVERLASTINGS_STORE.md` still documents the pre-WS6 *available-only, no-decrement* model (`:614`, `:709`) — that's the **shipped truth** and is correct until v3.3.x ships; **this Phase is what changes it.** Don't second-guess your WS6 edit against STORE — the as-built sync at Phase 6.4 updates those STORE lines. (Per the no-mixed-truth / as-built doc-sync rule, STORE is never edited mid-build.)

**Phase 6.3 — refund relist = stock RESTORE (the spec WS1 implements; NOT a separate diff).** The canonical relist restores the returned unit: **`quantity + 1`** (which makes `available` true again via the same rule) **plus** unarchive when archived — both axes, never XOR. **This is already folded into WS1's NEW blocks above — do NOT re-apply it as a second edit.** A builder going 1 → 6 has already built it by the time they reach here; this section is rationale, not a TODO. For reference, it lives in:
- **WS1.1b** — the refund handler's `products(...)` select includes `quantity`, and the returned `relist` object is `{ product_id, slug, title, available, quantity, archived }`.
- **WS1.5c `relistPiece`** — always PUTs `{ available: true, quantity: (r.quantity || 0) + 1 }` and POSTs `/api/products/unarchive` when `r.archived`; the prompt wording branches on current state (re-list vs +1).
- **GPT instruction 1.4a** — always offers, then `editProduct {available:true, quantity: relist.quantity + 1}` and/or `unarchiveProduct` (both if both).

**Phase 6.4 — docs (as-built). `Doc impact:`** at the v3.3.x as-built (a fresh agent, per the DEV_RULES *As-built doc-sync* rule — do NOT edit STORE mid-build; it correctly describes the **shipped** available-only model until v3.3.x ships), update `EVERLASTINGS_STORE.md`'s inventory model to the WS6 decrement behavior: the **Purchase-Flow** step ("Sets each purchased product available=false … does NOT change quantity"), **Data States #2** ("Product sold"), and the **Flag reference** `products.quantity` line (currently "a sale doesn't decrement it today … deferred until the first multi-quantity product_type") all flip to *"a sale decrements `quantity`; `available = (quantity > 0)`; `archived_at` untouched."* Also flip any test-script expectation that assumed a sale leaves quantity unchanged. **And add the one-of-each-per-order invariant** to STORE's Purchase-Flow (the cart dedupes by `product_id` at `main.js:121`; each line-item is `quantity:1`; a piece sells to separate sequential orders, never N-in-one-cart) — true of the shipped system today.

## Workstreams 4–5 — executable design (spec'd in `v3_3_0_ADDENDUM_DESIGN.md`)

- **4 · Admin polish** — the executable design lives in `…_ADDENDUM_DESIGN.md` §WS4 (the `:root` token system + P0–P7). Its CURRENT-state anchors are **verified** against the working tree (`admin/index.html:8-74` literals/grids, `system-ui`, no breakpoints). **P3 (media) is implemented in WS3.7 above.** Remaining at build (mechanical from the spec): the token literal-sweep (`#ddd`→`--c-border`…), P0's product-list state-filter JS + back-nav, and (per the executable-design rule) a render-tune with Sean on the live preview. Optional enhancements: the `improve`-skill code audit + (Sean-logged-in) live-screenshot fresh-instance passes.
- **5 · Homepage experience** — the executable spec lives in `…_ADDENDUM_DESIGN.md` §5: §5.1's `.hero__title` wrapper + a11y CSS + `homepage.js` init, and §5.2's versioned-key MP4 swap + 3 `index.html` URL edits, are concrete. The Lottie JSON authoring + the HyperFrames old-film render are content-creation steps done at execution (with the `text-to-lottie`/`hyperframes` skills + Sean's render-tune).

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
