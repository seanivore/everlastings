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

> Targets below are confirmed locations. CURRENT/NEW byte-anchors are added when this slice enters the gate (Phase 1.5 needs the `admin.js` order-card region read first).

**Phase 1.1 — `api/orders.ts`: new `POST` refund handler.**
- `import { stripe } from './_lib/stripe';` (orders.ts doesn't import it yet).
- `export async function POST(request)`: `requireAdmin` → 401 on error; read `_action` + `id` from the URL; require `_action === 'refund'` and a valid UUID (reuse `UUID_RE`, `orders.ts:10`).
- Fetch the order scoped by `is_test`: `.select('id, status, stripe_payment_intent, product_id, products(id, slug, available, archived_at)').eq('id', id).eq('is_test', isTest).single()`.
- Guards (return `jsonResponse` like the rest of the file): not found → 404; `status === 'refunded'` → 409; no `stripe_payment_intent` → 409.
- `await stripe.refunds.create({ payment_intent: order.stripe_payment_intent }, { idempotencyKey: \`refund-${id}\` })`; catch Stripe errors → 502 with a plain message.
- On success: `.update({ status: 'refunded' }).eq('id', id)` (optimistic); return `{ ok: true, order, relist: { product_id, slug, available, archived_at } }`.

**Phase 1.2 — `vercel.json`: refund rewrite.** Add `{ "source": "/api/orders/:id/refund", "destination": "/api/orders?id=:id&_action=refund" }` immediately **before** the existing `/api/orders/:id` line (`vercel.json:12`) so the more specific path wins.

**Phase 1.3 — GPT schema (`v2_0_0_GPT_SCHEMA.txt`): add `refundOrder`.** New op `POST /api/orders/{id}/refund`, `operationId: refundOrder`, `summary` (≤300 chars): issues a **full** refund via Stripe (emails the buyer), marks the order refunded; returns the piece's relist state; partials go in Stripe. `requestBody`: optional `reason` string.

**Phase 1.4 — GPT instructions (`v2_0_0_GPT_INSTRUCTIONS_TRIMMED.txt`): flip the REFUNDS line.** Replace "no refund Action — walk her through Stripe" with: confirm the order + amount first → `refundOrder {id, reason}` (full refund; Stripe emails the buyer) → then **ask** relist-or-leave → relist via `editProduct {available:true}` (published-but-sold) or `unarchiveProduct` (archived); partial refunds still in Stripe. (Also drop the one-line "poster = the still shown before the video plays" into the MEDIA guidance here.)

**Phase 1.5 — `/admin`: refund button + confirm + state-aware relist.** On each order card (orders tab), add a **Refund** button (shown when `status !== 'refunded'`); `window.confirm` the order + amount; `POST /api/orders/{id}/refund`; on success show "Refunded" and a **"Relist this piece?"** prompt that calls the right relist (available:true vs unarchive) per the returned `relist` state. *(Byte-anchor after reading `admin.js` order-card region ~700-840 + `admin/index.html:243-263`.)*

**Phase 1.6 — docs (as-built, after the build):** `STORE_ADMINISTRATION.md` refund section (now "issue it in /admin or via the Sunkeeper; it asks about relisting") + `GPT_SETUP.md` + `EVERLASTINGS_STORE.md` Stripe-sync note + test-script **R15** flips from "can't issue refunds" → "issues + asks about relisting." (Do these in the as-built phase to avoid mid-build mixed truth.)

## Later (direction only) — Workstreams 2–5

- **2 · Coupons in /admin** — a Coupons tab/section (`admin/index.html`) + `admin.js` handlers calling the existing `/api/coupons` create/list/deactivate; full field surface; product-scope picker maps to `stripe_product_id`; **+ the human `expires_display` backend add + a read-back-before-create beat + a date input**. Detailed after WS1.
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
