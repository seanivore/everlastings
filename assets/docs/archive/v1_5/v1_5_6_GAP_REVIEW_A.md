# v1.5.6 — Gap Review A (cold / out-of-repo, pass #6)

**Reviewer lens:** the North Star — can Em do each thing *by chat*, with the least friction; and (Angle A
job #1) is the plan self-contained enough that a fresh agent only LOCATES + APPLIES, never DISCOVERS or
DECIDES. Judged against the live-repo landmines, not training data or doc-internal consistency.

**Headline:** the architecture is build-ready and **no capability is missing** — create, find, edit,
preview, publish, in-place re-price, discard, coupons (create/list/deactivate), archive/resurface,
media-by-link, orders, and refund-status reflection are all present and genuinely drivable by chat. The
photo-by-link path that motivated v1.5.5 is real (Drive-share normalize → fetch → validate → pipeline;
pasted-file → ask-for-link). What remains are **tighten-ups in the doc/instruction layer and two
correctness anchors** — the same narrow class the 5th pass flagged, not new architecture.

---

**The plan is in good shape.** It has genuinely absorbed all 20 landmines, the code phases are byte-anchored (locate-and-apply, not discover-and-decide), the function cap holds at 11/12, and **every North Star capability is present and chat-drivable** — including the photo-by-link path that motivated v1.5.5. No architectural gap, no missing capability, no build-derailer.

**What's left is narrow** — the same doc/instruction-reconciliation class as the 5th pass, plus two correctness anchors:

1. **`slug` contradiction (medium-high)** — the `createProduct` schema marks `slug` *required* while the prose says "system handles it, never set." Both can't be true; the server trusts the caller's slug verbatim and only strips spaces, and `uploadImage` forces the GPT to own the slug before the row exists. Reconcile the prose + sanitize server-side. This is exactly the kind of mixed-truth a 6th pass should catch, and it sits in the most-touched path.

2. **Coupon owner-sale isolation (medium)** — the *only* load-bearing invariant left un-anchored. It rests on an unquoted claim about how `cart.ts` / `subscribe.ts` / `_bootstrap` tag their coupons. The doc byte-quotes everything it edits but not the three files this guarantee depends on. **This is my "fix one thing"** — a cold builder literally cannot verify it.

3. **edit→publish bypasses create validation (medium-low)** — create enforces ≥5 gallery etc.; editing an unpublished draft + first-publish don't re-check, so a malformed product can ship.

4–6 are smaller: a panel mis-reporting "nothing to publish" when a prior draft co-exists; the live Buy button on an edit-preview (acknowledged-deferred); and two more unquoted-current-code nits.

**Verdict: NEEDS ANOTHER PASS — narrow.** Fold those four-or-five and a fresh A-pass should clear fast. The fixes are surgical, not redesigns.

One note on what I deliberately *didn't* flag: I chased an "ampersand breaks the preview URL" angle and discarded it — the slug sits in the path (before `?`), so `&` is legal there; the real residue is the schema/instruction contradiction and slug-consistency across upload/create, which is what Rank 1 captures.

---

## Landmines 1–20 — confirmed HOLD

All twenty hold as written. Spot-confirmations on the ones the prompt asked to *validate* (7–20):

- **#7** frozen guard rejects only a CHANGED value, price excluded, admin-path tested — `FROZEN_AFTER_PUBLISH.filter(f => has(updates,f) && updates[f] !== current[f])` (§3.4 1288), price handled in its own rotation block; test #5b/#6 exercise the admin full-payload re-save. ✓
- **#8** RLS swap is name-keyed + the `DO $$ … RAISE EXCEPTION` guard fires if any permissive SELECT policy on products still has `qual='true'` (Phase 1 560-570). ✓
- **#9** discard exists (auth-only `?_action=discard`, deliberately NO token path; admin button gated on `body.staged`). ✓
- **#10** create is allow-listed (`CREATE_FIELDS`), slug lands on `product` so the pick captures it, `sku` is DB-generated and absent from both `CREATE_FIELDS` and the GPT schema. ✓ *(but see Rank 1 — slug is GPT-supplied, and the schema↔instruction story for slug is contradictory.)*
- **#11** `getProduct` returns an origin-correct `preview_url` from `new URL(request.url).origin`; GPT relays it. ✓
- **#12** `listCoupons` auto-paginates (`for await` + SCAN_CAP); product-scoped coupon requires a published product and the GPT is told. ✓ *(but see Rank 2 — the owner-sale isolation rests on unquoted code.)*
- **#14** `charge.refunded` → `status='refunded'` on a full refund, partial logs only, both-mode endpoint requirement called out. ✓
- **#15** Studio INSERT-vs-UPDATE zombie split documented; "never publish from Studio." ✓
- **#16** admin live-only edit shows "… is live now — nothing else to publish," no Publish button. ✓ *(but see Rank 4 — wrong when a prior draft co-exists.)*
- **#17** (the 5th pass's headline) price/available/quantity are all change-detected and excluded from staging, and the wording now reads consistently across §1.3 / §3.4 PUT / §9.2 / §9.5 / §10b / §8.9 admin. ✓
- **#18** `getProduct` 404 → `listProducts` + match-by-title. ✓ *(root cause — the lenient slug — is Rank 1.)*
- **#19** refunds stay in Stripe, GPT walks the steps + web-search-to-confirm, web-browsing-ENABLED is a stated `GPT_SETUP.md` config requirement. ✓
- **#20** `ROLE_PATTERN` extended with `checkout_image` + `seo_thumbnail`; GPT loops `uploadImage` over multiple links. ✓

---

## Ranked findings

### RANK 1 — MEDIUM-HIGH · `slug` schema↔instruction contradiction in the brand-critical create+upload+preview chain
**Where:** §9.1 `createProduct` schema (IMPLEMENT 3049 — `required: [… slug …]`, kept unchanged) vs the
§9.1/§9.3 prose repairs (3372 / 3377 / 3411 — "the system handles `slug` … never set them").

**What's wrong:** the schema marks `slug` **required**, so under OpenAI Actions the GPT *must* send it —
while the prose tells the GPT the system fills it and to never set it. Both can't be true. The server
(`products.ts:158-163`, quoted at 1109) uses the **caller's slug verbatim** and only generates one when
it's *absent*; the generator does `title.toLowerCase().replace(/ /g, '-')` — spaces only, never stripping
`'` / `&` / other characters (this is exactly why landmine #18 calls apostrophe/ampersand slugs
"unreconstructable"). And because the GPT is instructed to upload **every photo before** `createProduct`,
and `uploadImage` needs the product `slug` to name the R2 object, the GPT *necessarily owns the slug at
upload time* — so "system handles slug" is the false half, not the schema.

**Why it matters (the lens):** this is the single most-touched path in the product (upload → create →
preview link → publish). The contradiction makes the GPT's slug behavior nondeterministic: it may use one
slug string for the `uploadImage` calls and a different one for `createProduct` (images land under folder
A, the product under slug B — still *functional* because absolute URLs are stored in `images[]`, but R2
organization diverges and any future slug-derived logic breaks), and a non-URL-safe slug propagates into
the preview/live path. A 6th pass whose remit is precisely doc/instruction reconciliation should not ship
a surviving create-path contradiction.

**Fix:** (a) reconcile the prose — drop "system handles slug (never set)" and instead instruct the GPT to
compute the slug **once** (`lowercase`, hyphenate, strip anything not `[a-z0-9-]`, collapse repeats) and
reuse that *same* string for every `uploadImage` and the `createProduct` call; keep `slug` in the schema
(it has to be there for upload-before-create). (b) Belt-and-suspenders, server-side: normalize the
supplied slug the same way in `products.ts` so an ampersand/apostrophe title can never yield a non-URL-safe
slug regardless of GPT behavior — which *also* makes the slug reconstructable and softens #18's
list-fallback at the source. Either half closes the contradiction; do both.

---

### RANK 2 — MEDIUM · the owner-sale coupon isolation rides on UNQUOTED current code (the doc's own byte-anchor rule isn't applied to the code the invariant depends on)
**Where:** §3.5 `handleCouponList` / `handleCouponDeactivate` (IMPLEMENT 1616-1622, 1668) + landmine 1.5;
tested by Phase 11 #8 / #16.

**What's wrong:** both handlers isolate to `pc.coupon?.metadata?.source === 'owner_sale'`. The whole
guarantee — "the GPT never lists or ends a system-generated code" — depends entirely on the claim
(1619-1621) that `cart.ts` (~87) tags the **promotion code** (not the coupon), and `subscribe.ts` (~40) +
`_bootstrap/coupons.ts` tag **nothing** on the coupon. **None of those three call sites is quoted**, even
though the plan quotes byte-exact CURRENT blocks for every file it touches (including ones it doesn't
change, e.g. `upload.ts`'s `ALLOWED_MIME` / MP4 leg). A cold reviewer — and the fresh builder — cannot
confirm this invariant from the documents. If the base `cart-recovery-10` / `newsletter-welcome-5` coupons
(AR #31) were ever bootstrapped with that metadata, or if `cart.ts` stamps the coupon rather than the
promo code, then `listCoupons` surfaces a system code and `deactivateCoupon` can kill cart-recovery.

**Why it matters:** this is the *only* load-bearing invariant in the plan left un-anchored, and it's a
stated landmine with two dedicated tests. Blast radius is bounded (Em sees/ends a system code — recoverable,
not data loss), but Angle A's first job is exactly "find every place the correctness rests on recalled
behavior the plan didn't pin down."

**Fix:** in the pre-flight anchor list (or §3.5), **quote** the three current coupon-creation call sites —
`cart.ts ~87`, `subscribe.ts ~40`, `_bootstrap/coupons.ts` — showing the `coupons.create` / promo params
carry no `metadata.source='owner_sale'` on any coupon object; and add an explicit "the bootstrap must never
use the `owner_sale` tag" line. This brings the isolation guarantee up to the same self-containment bar as
the rest of the doc.

---

### RANK 3 — MEDIUM-LOW · edit → publish bypasses create validation; a product can ship in a state `createProduct` would reject
**Where:** §3.4 unpublished-draft branch (IMPLEMENT 1415-1440 — `pick([...DRAFTABLE, checkout_*])`, no
required-field re-check) + §3.5 first-publish (1505-1514 — validates only `checkout_name||title`,
`checkout_description||description||headline`, `checkout_image||thumbnail`, `price`).

**What's wrong:** `createProduct` enforces `PRODUCT_TYPE_RULES` (≥1 hero, ≥5 gallery, a thumbnail, the
required scalars). Editing an **unpublished draft** writes fields straight to the live columns with **no
re-validation** — `editProduct(id, {story_card:"", images:[]})` blanks them — and first-publish checks
only the checkout essentials, **not** `story_card` / `headline` / the image minimums. So
create → edit → publish can land a published product with an empty story card or zero gallery images. The
validation that exists specifically to keep products well-formed is bypassable through the edit path.

**Why it matters:** low real-world odds under a careful GPT (it authors full fields), but it's a genuine
hole in the draft→publish state machine, and "honest/robust" is part of the North Star.

**Fix:** in `handlePublish`'s **first-publish** branch, re-run the `PRODUCT_TYPE_RULES` validation against
the row (merged with any `draft`) and reject with the same messages before the Stripe create. One added
call; closes the hole without touching the happy path.

---

### RANK 4 — LOW-MEDIUM · live-only edit on a product that ALSO has a pending draft mis-reports "nothing to publish"
**Where:** §8.9 `renderPublishPanel` (IMPLEMENT 2755-2810) vs §8.8 list pill.

**What's wrong:** the panel decides publishability from *this save's* response only (`preview_url` /
`*_updated`). If Em marks a product sold (or restocks/re-prices) while an **earlier copy draft is still
staged**, the PUT correctly returns `availability_updated:true`, `staged:false`, no `preview_url` (this
edit staged nothing and *preserved* the existing draft + token). The panel then prints "Availability change
is live now — nothing else to publish," even though the row still carries pending copy edits — and the list
pill correctly says "live · edits pending." The two surfaces contradict, and Em could think her staged copy
edit vanished.

**Fix:** `renderPublishPanel` already receives `body.product`. When `body.product.draft` is non-null, still
surface "edits pending" plus the Publish / Discard affordance (the row keeps its `preview_token`; the panel
can build the open-preview link from it). Small panel-logic tweak; no API change.

---

### RANK 5 — LOW (acknowledged-deferred) · the preview page's Buy button is live; an EDIT preview transacts against the live product
**Where:** Phase 7 (`product.js` NEW handler wires `wireCartButtons(product)` on preview) + Open Items
("preview page's cart-button visual treatment … deferred; only the analytics-skip is wired now").

**What's wrong:** new-draft previews are safe — checkout/reserve reject unpublished rows via the Phase 4
`is_published` guards (test #7). But an **edit preview of a PUBLISHED product** is `is_published=true /
available=true` with a live `stripe_price_id`, so clicking Buy creates a **real** Checkout Session at the
live price while the page shows not-yet-live draft copy and a "Draft preview — not yet live" banner. Not a
money/data-integrity break (real product, real price), but the banner sits directly above a working purchase.

**Fix (already scoped to Part 3):** on a preview load (`previewToken` present), disable/relabel the cart +
buy controls ("Preview only"). Worth pulling just the *disable* into Phase 7 so the banner isn't
contradicted by a working purchase, even before the full Part 3 visual slice.

---

### RANK 6 — LOW · two more unquoted current-code assumptions (self-containment nits)
- **§4.7 `charge.refunded`** — "runs after the existing idempotency claim / Claim already inserted" asserts
  that the `webhook_events` claim precedes the `checkout.session.completed` type-check (current line 60),
  but only line 60 is quoted. Test #22's *dedup* sub-assertion depends on this ordering. The `UPDATE
  status='refunded'` is naturally idempotent, so a re-delivery is harmless even if the claim doesn't cover
  refunds — but the *stated* behavior is unverified. **Fix:** quote the few lines around the idempotency
  insert, or relax #22's dedup claim.
- **Admin read-client (pre-flight, "load-bearing anchor")** — the plan correctly flags that `loadProducts`
  must read via the service-role API (`fetch('/api/products', {authHeader})`), not the RLS-bound
  `state.client`, and that the old hard delete was the *only* `state.client` product op. This is the one
  silent-inversion risk: a single missed `state.client.from('products')` read goes **blind** to
  drafts/archived after the RLS change. It's already gated as "verify before Phase 1" — keep it a **hard**
  gate: `grep "state.client.from('products')"` in `admin.js` must return zero after 8.11.

---

## The single most important fix

**Anchor the coupon owner-sale isolation (Rank 2).** It is the only load-bearing correctness invariant in
the plan that a cold reviewer/builder *cannot verify from the documents* — every other risky dependency is
either byte-quoted or explicitly gated as "verify before Phase 1," but this one rests on a prose
description of three files the doc never quotes, and it backs a stated landmine plus two tests. Quote the
current `cart.ts` / `subscribe.ts` / `_bootstrap/coupons.ts` coupon-create params (proving no coupon
carries `metadata.source='owner_sale'`) and the invariant goes from "trust me" to "proven," matching the
doc's own anti-fragility standard.

*(Rank 1 is the most likely to bite in everyday chat use; Rank 2 is the most important for Angle A's
self-containment mandate. Fix both before building — they're surgical.)*

---

## Verdict

**NEEDS ANOTHER PASS — narrow.** No architectural gap, no missing capability, no build-derailer: the code
phases are byte-anchored and complete, the function cap holds at 11/12, and all 20 landmines hold. What's
left is the same tighten-up class as the 5th pass — reconcile the `slug` schema↔instruction contradiction
(Rank 1), anchor the coupon-isolation tagging (Rank 2), and decide whether first-publish should re-validate
(Rank 3) — plus two small UI/messaging fixes (Ranks 4–5). Fold those four or five and a fresh A-pass should
clear quickly.
