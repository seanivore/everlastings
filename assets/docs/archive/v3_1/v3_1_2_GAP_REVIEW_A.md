# v3.1.2 — Cold Angle-A Gap Review (Pass A)

**Reviewer**: fresh agent, out-of-repo. **Scope**: IMPLEMENT + DESIGN addendum + TESTING addendum, against the EVERLASTINGS_STORE substrate.
**Lens**: (a) North Star — Em can fully manage in BOTH /admin and the GPT; (b) the broader bar — exclusively-executable, validated assumptions, design correctness.
**Verdict (one-liner)**: **NEEDS ANOTHER PASS.** Several Tier-1 issues; none are foundation-level, all are localized fixes, but two would ship silent money/UX bugs and three would stall a fresh builder at the static gate or at compile.

---

Verdict: NEEDS ANOTHER PASS.
Headline finding ("if you fix one thing"): the refund flow misses that one Stripe payment_intent can span N sibling orders (webhook.ts:159 creates one row per product). stripe.refunds.create({ payment_intent }) with no amount is a full refund of the whole intent — owner clicks "refund $50 for one product," Stripe refunds the entire $150 cart, the charge.refunded webhook flips all 3 orders to refunded, but WS1 only relists the one product the owner clicked. None of TESTING WS1's items exercise a multi-product cart, so this slips every gate.
Seven Tier-1 items beyond the headline, ranked by build-derailment likelihood:

GPT-instructions char-budget trim — static-gate failure, no concrete NEW text for SLUG/EDITING/PUBLISHING.
expires_display added on the wire but not in the GPT response schema — defeats the FEEDBACK_COUPON regression-class fix.
reason parameter declared in schema/instruction, ignored by handler — visible plan-to-code mismatch; also Stripe's reason is an enum, not free text.
P3d role-sectioned upload zones lack any concrete markup or JS skeleton — biggest executable-design defect; contrast with P0's exhaustive HTML+JS.
processOne "verbatim move" of lines 195-316 trusts the externals list — fresh builder may hit tsc "X is not defined" cascade.
updateCoverage shows ✓ thumbnail when only hero exists — but save sends thumbnail: null → publish-validation rejects; owner gets a green-check-then-error UX.
(headline) multi-cart refund — listed above.

Ten Tier-2 items (controls:false silent drop, batch-upload first-failure orphans, /admin partial-refund parity, auth check placement on the new JSON branch, Stripe webhook-config how-to, race-window in TESTING idempotency assertion, Lottie script position, --font-display assumption, WS6 cutover migration risk, login-card class assertion) — fold in the same pass or triage.
Ten Tier-3 clarifications round it out (rewrite ordering, monotonic migration timestamp, sold-with-edits filter placement, etc.).
The file is at /mnt/user-data/outputs/v3_1_2_GAP_REVIEW_A.md — open it and the findings will read straight through, organized by tier with concrete fixes inline. The spine of the build is sound; what's flagged is finishing-the-job density in a handful of places, three plan-to-code misalignments, and one substrate-level surprise the delta didn't notice.

---

## 🎯 If you fix one thing: the multi-cart refund silent over-refund

**Problem.** The whole refund flow assumes 1 order = 1 charge, but the existing webhook (`webhook.ts:159`, per the STORE doc data-flow §12 + AR §22) **creates one `orders` row per product**, all sharing a single `stripe_payment_intent`. So a 3-product, $150 cart produces 3 sibling orders. `refundOrder` calls `stripe.refunds.create({ payment_intent })` with **no `amount`** — Stripe's default is a **full** refund of the entire payment intent. The owner clicks "Refund $50 for <one product>" and Stripe refunds the full $150; the `charge.refunded` webhook (`webhook.ts:60`, terminal, "matching `stripe_payment_intent`") then flips **all three** orders to `refunded`. WS1 only relists the one product the owner clicked on — the other two stay `available:false` silently. Buyer overpaid back by $100; two listings are stranded sold.

**Why it slips every gate the build has.**
- TESTING items 1-7 only exercise single-product orders.
- The GPT instruction's pre-call read-back uses one order's amount/title (the wording even says "Refund <buyer> $X for <product>"), so the GPT *itself* will mis-read the financial impact and confidently mis-confirm to Em.
- The 1.1b handler returns `relist` for the single order's `products(...)` embed — never sees siblings.
- The `is_test` scoping won't catch it (sibling orders are in the same env).

**Fix (pick one, in order of preference):**
1. **Surface siblings in the handler:** after the order load, `select id, products(id, slug, title, available, quantity, archived_at) from orders where stripe_payment_intent = $pi and is_test = $isTest` → if `count > 1`, either (a) iterate and relist each product, returning `relist: [...]`, or (b) refuse with a 409 "this order is part of a $N purchase with N other items — refund from the Stripe dashboard so you can choose which items to refund."
2. **At minimum** (if option 1 is deferred to a later round): the GPT instruction 1.4a and `submitRefund`'s `window.confirm` must say *"Refunding this order issues a full refund of the entire Stripe payment ($total) — including any sibling items in the same purchase. Continue?"* and the response's `relist` must be `relist: [{…}]` even for the single-product case so the owner is always opted into a multi-item loop.

The `submitRefund` UI prompt today reads `Refund ${customerEmail || 'the buyer'} ${totalLabel} for "${productTitle}"?` — `totalLabel` is the single-order amount, so option 1 also needs the handler to return the cart total (`select sum(amount) from orders where stripe_payment_intent = $pi`) for the prompt to be honest.

This is the single change that closes the only undiscovered live-incident path in the delta.

---

## Tier 1 — likely to derail the build or ship a real-user bug

### T1·1 — GPT-instructions trim is "discover-and-decide" wrapped in a static gate (IMPLEMENT §"GPT instructions char budget" + TESTING static gate)

The IMPLEMENT correctly diagnoses (~870 chars over the 8000 cap) and names the three sections to compress (SLUG / EDITING / PUBLISHING), then tells the builder to *"consolidate"* and *"tighten"* them. The static gate runs `wc -c` and hard-fails over the cap. **The exclusively-executable rule prohibits exactly this**: the builder must judge which restated rule is the "canonical" one, then rewrite prose — and the budget is razor-thin (7997 chars after the planned trim, 3 chars under cap; any minor miscount fails).

**Fix.** Provide the exact **NEW text** for SLUG, EDITING, and PUBLISHING in IMPLEMENT just like every other CURRENT/NEW byte-anchored block in WS1-3. The plan already counted the chars; finish the job and the gate goes from "discover-and-decide loop" to "apply, then wc -c green."

### T1·2 — `expires_display` added on the wire but never declared in the `listCoupons` response schema (IMPLEMENT §2.2b + §2.3)

The TESTING gate item 13 reads *"`listCoupons` returns `expires_display`; the GPT relays the plain date and never decodes a timestamp."* The wire fix is in 2.2b (`expires_display: pc.expires_at ? formatExpiry(pc.expires_at) : null`) and the GPT instruction (2.3) tells the model to relay it — but **the schema edit is missing**. Custom GPT Actions are strict about declared response properties; an undeclared field is invisible to the model. The plan declares `expires_display` in only one place: the `listCoupons` response shape it never edits. So the model either:
- can't see the field and falls back to `expires_at` (raw Unix) → the exact FEEDBACK_COUPON regression, OR
- sees it inconsistently across model versions and Sean ships uncertainty.

This wholly defeats the regression-class fix the workstream was built around.

**Fix.** Add a Phase 2.2f (or fold into 2.2e) byte-anchored to the existing `listCoupons` response shape in `v3_3_0_GPT_SCHEMA.txt`, adding `expires_display: { type: string, nullable: true, description: "Human-readable expiry in the store's timezone — relay this, never decode expires_at." }` to each coupon item's properties. (Same for the `createCoupon` 200 response if it explicitly declares property keys — 2.2c added it to the body, but only the wire side.)

### T1·3 — WS1 declares a `reason` parameter the handler silently drops (IMPLEMENT §1.1b vs §1.3 vs §1.4a)

The GPT schema (1.3) declares `reason: { type: string, description: "Optional note, e.g. 'Customer requested' or 'Damaged in transit'." }`. The instruction (1.4a) declares `refundOrder {id, reason?}`. The handler (1.1b) **never reads `body.reason`** — there's no `request.json()` or `await request.json()` call at all in the new POST function. Worse: Stripe's own `reason` field is an **enum** (`duplicate | fraudulent | requested_by_customer`), not free text — so "Customer requested" is invalid even if forwarded.

Two consequences:
- A plan-to-code visible defect a cold reviewer will flag immediately.
- If a future builder "fixes it" by forwarding to Stripe verbatim, every call 400s.

**Fix.** Either remove `reason` from the schema + instruction (cleanest), **or** have the handler `await request.json().catch(() => ({}))`, normalize body.reason to `'requested_by_customer'` if any string is present (and persist the raw owner note to `stripe.refunds.create({ payment_intent, reason: 'requested_by_customer', metadata: { note: body.reason } })`). Pick one and make the three surfaces (schema, instruction, handler) agree.

### T1·4 — P3d role-sectioned upload zones have functional rules but **no concrete-default markup or JS skeleton** (DESIGN §4.2 P3d, IMPLEMENT §3.7)

This is the largest executable-design defect in the delta. P3d:
- Tells the builder to **remove** `admin/index.html:195` (the file input + `#upload-role` select) and `admin.js:onUploadImage`.
- Replaces them with "labeled upload zones per role group: Hero · Gallery · Detail · Thumbnail · SEO thumbnail · Checkout image · Video".
- Specifies functional rules (gallery auto-numbering, video `skip_transform=true`, landing order, per-zone errors).
- Provides **zero HTML, zero IDs, zero handler shape, zero CSS hooks.**

Contrast with P0, which gives the exact `<div class="subtabs">…` markup, the exact module-level `activeProductFilter` declaration, and the exact `wireProductSubtabs()` function. P3d is described entirely in prose. Two cold builders will produce two materially different upload UIs; one of them will inevitably break the load-bearing invariant ("the frontend reads role from the filename — passing the correct role is load-bearing"). And the IMPLEMENT 3.7c explicitly forbids the byte-anchored alternative ("Do not apply a standalone `#upload-role` edit — there's no such control after P3d"), so the only path is the un-anchored one.

The "executable-design rule" carve-out (LANDMINE #17) says "concrete enough the builder never guesses" — markup *is* the concrete. Aesthetic render-tune is in the styling, not in the structure.

**Fix.** Add a concrete-default skeleton to DESIGN §4.2 P3d: the seven zone wrapper HTML (one example shown verbatim, six analogous), the per-zone IDs (`#upload-zone-hero`, `#upload-zone-gallery`, …, `#upload-zone-video`), a shared `wireUploadZone(zoneEl, role)` function that internally calls the existing `/api/upload` multipart pipeline + appends to `#p-images` (or `#p-media-list` for video) + writes to a `.zone-msg`. Sean still render-tunes the visual; the routing logic stops being a coin-flip.

### T1·5 — Phase 3.1 `processOne` extraction is "verbatim but trust me" (IMPLEMENT §3.1)

> *"The single-file validation + Cloudinary/R2 pipeline + success return (the block **from `if (!slug || !role)` at `:195` through the success `return jsonResponse(request, { url: publicUrl, filename })` at `:316`**) **moves verbatim** into a module-level helper that returns a result object instead of a `Response`."*

The signature is fixed: `processOne(file, slug, role, skipTransformField)`. **An out-of-repo builder cannot verify that those four parameters are the ONLY external references in lines 195–316.** Any reference to `request`, `corsHeaders(request)`, `formData`, `body.skip_transform`, locally-derived constants in the surrounding function, the `ROLE_PATTERN` constant, the Cloudinary env-vars helper, `isTest`, `bucket` — anything that isn't one of those four parameters or a module-level import — produces a `tsc` "X is not defined" cascade, and the builder has to invent how to plumb each one through. This is exactly what byte-anchoring is supposed to prevent.

A second risk lives in the same extraction: the new `handleAttachedRefs` references `ROLE_PATTERN`, `ALLOWED_MIME`, `MIME_TO_EXT`, `isPublicHttpUrl`. If any of those is a *local const* inside the existing POST function rather than module-level, `handleAttachedRefs` (which is module-level) can't see them.

**Fix.** Either show the actual current contents of `:195-316` so the builder can confirm the externals list, or provide the complete `processOne` body verbatim with all necessary parameters plumbed. Same treatment for the four constants `handleAttachedRefs` reads — a one-line "these are module-level in upload.ts today" assurance is enough if it's true; a CURRENT-block confirming each declaration is even better.

### T1·6 — `updateCoverage` lies: shows ✓ thumbnail when only hero exists, but the save sends `thumbnail: null` → publish-validation rejects (IMPLEMENT §3.7a)

The plan:
```js
const thumb = !!$('p-thumbnail').value.trim() || hero; // hero may be reused as the thumbnail
```

But **nothing copies hero into the `thumbnail` field at save time** — `buildProductPayload` reads `#p-thumbnail` directly. And AR #24 of EVERLASTINGS_STORE explicitly requires "A thumbnail URL required". So the Em-side flow is: she uploads a hero, sees `✓ hero · gallery 5/5 · ✓ thumbnail`, clicks Save, and the publish validator throws a confusing "thumbnail missing" error she has no idea how to act on (the green check just told her she's good).

The GPT side doesn't have this problem because instruction 3.5a explicitly tells it to *set* `thumbnail` to the hero URL.

**Fix (pick one):**
- **Strict UI:** drop the `|| hero` lenience; show `✓ thumbnail` only when `#p-thumbnail` has a value; add a one-click "Use hero as thumbnail" button next to the field.
- **Auto-fallback in `buildProductPayload`:** if thumbnail is blank and a hero image row exists, copy the hero URL into thumbnail at submit time. (Mirrors the GPT's behavior server-side from the admin.)

Either is correct; both are concrete; the plan needs to pick.

---

## Tier 2 — real friction or parity gap, won't block the build

### T2·1 — `collectMedia` silently drops `controls: false` on round-trip (IMPLEMENT §3.7b)

The `addMediaRow(m)` reader handles `m?.type`, `m?.url`, `m?.autoplay`, `m?.poster`, `m?.alt` — **not `m?.controls`**. The `collectMedia()` writer only ever emits `controls: ...` implicitly (no controls flag is written; the storefront's `populateMedia` derives it from `autoplay`). So a pre-existing click-to-play video with an explicit `controls: false` (e.g. a v2.0 product) gets edited in /admin → controls reappear on save. The owner didn't change anything but suddenly her button-less clip has play/pause/seek scrubber.

**Fix.** Either read+write `controls` faithfully in addMediaRow/collectMedia, or audit existing live `media` jsonb for any `controls:false` entries and document the deprecation (the spec already says "controls hidden ⇔ autoplay" — if that's the new invariant, run a one-shot migration to drop standalone `controls:false` first).

### T2·2 — `handleAttachedRefs` early-returns on first file failure, orphaning prior uploads (IMPLEMENT §3.2)

```ts
if (!r.ok) return jsonResponse(request, { error: `File ${i + 1}: ${r.error}` }, r.status);
```

Em attaches 7 photos. #4 is corrupt. Photos 1–3 already landed on R2; the GPT sees only `{ error: "File 4: ..." }` and has no idea three CDN URLs exist. She re-attaches all 7, doubling R2 cost and producing orphan objects she never references. Worse for the chat-attach trust model: the whole point of attach-first was lower friction than by-link.

**Fix.** Collect per-file results and return `{ uploads: [...successes], failures: [{ index, error }, ...] }`; update the GPT instruction (3.5a) to tell the model "if failures arrive, surface them per-file and reuse the successes." Adds ~80 chars to the instructions (well within budget once T1·1 frees room).

### T2·3 — No /admin parity for the partial-refund Stripe walkthrough (IMPLEMENT §1.4a vs §1.5)

The GPT instruction says: *"PARTIAL refunds aren't supported here -> walk her through Stripe."* The /admin Refund button just refunds; no equivalent affordance pointing her to Stripe for partial. Per the parity invariant (each surface must be complete as if the other didn't exist), this is a small but real gap.

**Fix.** Beside the /admin Refund button, add a tiny "Partial? Open in Stripe" link (`https://dashboard.stripe.com/${isTest ? 'test/' : ''}payments/${stripe_payment_intent}`); requires exposing `stripe_payment_intent` in the order card render (it's already in the row).

### T2·4 — Auth check placement on the new JSON branch is needs-verification (IMPLEMENT §3.2)

`handleAttachedRefs` is reached from the JSON-body branch at `:138`, which is inside the JSON-content-type fork starting at `:129`. **Whether the surrounding `requireAdmin` / `authorize` runs before `:129` is the entire question** — the IMPLEMENT shows the branch but not the auth shape. If auth happens at the top of POST, fine; if it lives inside the existing single-file pipeline below `:195`, the new branch is unauthenticated and any caller can spend OpenAI bandwidth + R2 space until `processOne`'s per-call auth fires.

**Fix.** Add a one-line CURRENT/NEW byte-anchor showing exactly where auth runs relative to `:129`, OR add an explicit auth check at the top of `handleAttachedRefs`.

### T2·5 — TESTING "subscribe charge.refunded" lacks a how-to (TESTING preamble F11)

> *"the preview webhook endpoint must subscribe `charge.refunded` (else the reconciliation check, item 6, never fires) in addition to `checkout.session.completed`"*

For a fresh agent without Stripe muscle memory, this is a discover-and-decide. Stripe Dashboard → Developers → Webhooks → (preview endpoint) → "+ Add events" → search `charge.refunded` → check → save. The line takes seconds to apply *if* the builder knows where to click.

**Fix.** Inline the four-click path in the TESTING preamble; same for the live cutover ("repeat on the production endpoint when promoting").

### T2·6 — TESTING item 4's idempotency assertion has a race window (TESTING §WS1.4)

> *"trigger a refund twice fast (double-click / retry) → exactly **one** Stripe refund (idempotency key `refund-<id>`); second returns the already-refunded 409, no double-refund."*

The 409 fires only when the second click reads `orders.status='refunded'` from Postgres. If the second click slips between the Stripe call and the DB write of the first, BOTH calls hit Stripe with the same idempotency key (Stripe correctly returns the same refund both times) and BOTH return 200/OK with `relist`. The test would assert 409 and incorrectly fail a build that actually behaves correctly.

**Fix.** Rephrase as *"the Stripe Dashboard shows exactly one refund for the payment intent; the second response is either 409 (already-refunded) or 200 (Stripe-idempotent duplicate) — never a second distinct refund."*

### T2·7 — WS5 Lottie script position vs. `defer` order (DESIGN §5.1)

The `lottie.min.js` script is added with `defer` but the plan doesn't say where in `index.html` to insert it (head, top of body, before `homepage.js`?). `defer` scripts execute in document order; if `lottie.min.js` is placed *after* `homepage.js`, `window.lottie` is undefined when the DOMContentLoaded listener checks for it → silent fallback to static `<h1>` even when motion is desired.

**Fix.** Specify: insert the `<script src=".../lottie.min.js" defer>` tag **before** the existing `homepage.js` tag (whose location is given at `index.html:89`).

### T2·8 — WS5 `--font-display` / `--text-5xl` are asserted, not byte-anchored (DESIGN §5.1)

> *"`.hero__title-text` inherits `--font-display`/`--text-5xl` so the fallback matches"*

A locate-by-content edit that pre-asserts a CSS variable name. If those exact tokens don't exist (or were renamed in a recent polish), the fallback `<h1>` paints in the wrong font and the swap-in is jarring instead of seamless.

**Fix.** Add a one-line "if `--font-display` is absent, hardcode `font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(2rem, 5vw, 3.5rem);` on `.hero__title-text`" — a render-tune note costs nothing and removes the silent failure mode.

### T2·9 — WS6 cutover migration risk (IMPLEMENT §6.4)

After WS6 ships, an OLD already-sold record (today: `available:false, quantity:1`, because the pre-WS6 webhook never decremented) is refunded → relistPiece does `(1 || 0) + 1 = 2` → owner gets a "Refunded + stock +1" toast and a phantom extra unit. Inventory inflates by 1 for every pre-WS6 sale ever refunded post-deploy. Architecturally minor today (all miniatures are qty-1, and old orders are rare to refund), but a real latent bug.

**Fix.** Add a Phase 6.0 data migration: `UPDATE products SET quantity = 0 WHERE available = false AND quantity > 0;` run **before** the webhook flip lands. Or accept the risk in writing and tell Em what to look for. Don't leave it to chance.

### T2·10 — Login chrome target abstract (DESIGN §4.2 P7)

> *"Login card → background:var(--c-surface);box-shadow:var(--sh-lg);border-radius:var(--r-lg);border:none;margin-top:12vh"*

P7 names `.login-card` but no byte-anchor in `admin/index.html` confirms that class exists. If the login form uses a different class (e.g. `.auth-panel`) or just inline-styled, the rule is dead CSS.

**Fix.** Add a CURRENT/NEW byte-anchor for the login markup (one-time setup at the top of `admin/index.html`), or change the rule to target the actual element by content.

---

## Tier 3 — clarification, low-impact, or "note for future"

- **T3·1** — `formatExpiry` and `endOfDayET` hardcode `America/New_York`. Per the "template User, not Emy" invariant, store TZ should be a config; flag for the eventual multi-tenant template extraction. (Today's behavior is correct.)
- **T3·2** — `loadCoupons`'s `state.products` fetch is one-shot per session (`if (!state.products || !state.products.length)`). A product published mid-session won't appear in the coupon scope picker until manual reload. Acceptable, low frequency.
- **T3·3** — The `Refunded` pill reuses the `unsent` class (IMPLEMENT §1.5a). Semantically off; should be its own `.pill.refunded`. P2's color map doesn't include `refunded`. Tiny.
- **T3·4** — Phase 6.1 migration filename has a fixed timestamp `20260616000001`. If applied after another later migration, Supabase orders by name — usually fine, but the convention is "monotonic at apply time." Flag for the builder to renumber if needed.
- **T3·5** — TESTING item 22 says "for all 7 roles" but doesn't enumerate per-role assertions. A builder ticking the box may verify only 2–3 roles. Strengthen to "paste a URL for each of the 7 roles in turn; verify each role tag renders matching `m[1]`."
- **T3·6** — TESTING item 21 round-trip would catch T2·1 (controls:false drop) **only** if the test data includes a pre-existing `controls:false` media item. Currently doesn't say. Add: "if any live product has `media[i].controls === false`, open and save it without other edits; reopen and assert `controls` is still `false`."
- **T3·7** — `vercel.json` rewrite ORDER matters: `/api/orders/:id/refund` must precede `/api/orders/:id` (IMPLEMENT §1.2 calls this out). TESTING checks "2 new rewrites" but not order; a misplaced refund rewrite would fall through to the PATCH-only `:id` route and return 405. WS1 behavior tests would catch, but a static gate (`grep -n '/api/orders/:id' vercel.json` line-order check) would catch it earlier.
- **T3·8** — IMPLEMENT 3.4a's `roles` schema lacks `enum` constraints (so the GPT can pass anything and the server falls back to positional). The fallback works, but stricter schema = fewer guesses by the model. Optional.
- **T3·9** — The `customerEmail` / `totalLabel` / `productTitle` scope assertion in IMPLEMENT §1.5b ("already in `buildOrderCard`'s scope") is needs-verification; if any of these is named differently in the real `buildOrderCard`, the click handler throws "X is not defined" at click time, silently breaking the Refund button. Worth a one-line byte-anchor.
- **T3·10** — DESIGN §4.2 P0 puts staged-edits products under the "Live" filter (`live` ∪ `edits`). A sold-but-with-staged-edits piece lands under Live, not Sold (since `productState(p)` returns `'edits'` before checking `!p.available`). Tier-3 UX call — flag for Sean.

---

## What this round did NOT find

To frame the above: nothing I found challenges the architecture, the parity model, the `record_sale` correctness, the relist-restores-both-axes rule, the immutable-CDN versioned-key swap, the Lottie a11y/SEO/reduced-motion pattern, or the canonical `productState` predicate. The build's spine is sound; what I'm flagging is finishing-the-job density in a handful of places (T1·1, T1·4, T1·5), a couple of plan-to-code misalignments (T1·2, T1·3, T1·6), and one substrate-level surprise the delta didn't notice (the headline multi-cart refund).

## Verdict

**NEEDS ANOTHER PASS.** Fold the seven Tier-1 items + the multi-cart headline; re-run cold Angle-A on v3.1.3. The Tier-2 items can fold in the same pass or be triaged.
