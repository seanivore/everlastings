# v1_5_4_GAP_REVIEW_A — Angle A (cold / out-of-repo), pass 4

**Reviewer stance:** senior engineer, pre-build gap review, maximum effort. No repo — only
`v1_5_4_IMPLEMENT.md` + `EVERLASTINGS_STORE.md`. Two jobs: (1) **self-containment** — anywhere the
builder must open a file, recall a library's behaviour, or make a decision the plan didn't make;
(2) **completeness/architecture** — can Em *fully* run the store by chat, and does the system design hold.

**Bottom line up front:** no build-breaking compile/logic error found. The plan is dense and the prior
three passes did their job. What survived: **one thesis-critical completeness gap** (photo upload by
chat is asserted, never shown), **one real code-correctness bug** (price-rotation ordering can silently
make a live product unbuyable), **one incorrect operator-doc claim** (Studio trigger behaviour), and a
few self-containment/UX items. Landmines 7–12 all hold (confirmed at the end).

---

No build-breaking compile/logic error; the plan is dense and the prior three passes earned their keep. **Landmines 7–12 all hold** (confirmed individually in the file, not re-raised). What survived, ranked by how likely each is to derail the build or leave a capability missing:

1. **Photo/media upload *by chat* is asserted but never shown** *(completeness + self-containment).* The thesis is "run the store by chat," and every create + photo edit depends on the GPT getting Em's image **bytes** to `/api/upload` — but no doc shows the mechanism (URL? base64? file param?). Custom GPT Actions send JSON, not multipart, and her photo lives in the chat, not at a URL. The STORE doc's "curl protocol" framing hints the path was built for **agentic/curl** callers, which is a different capability. Two new roles (`checkout_image`, `seo_thumbnail`) + MP4 media all ride on it. **Fix:** state the actual byte-delivery path in §1.7/§1.10 + a quoted Phase 9 block; if it really needs curl, say so and reconcile the thesis.

2. **Price-rotation order can silently make a live product unbuyable** *(code correctness).* PUT does `deactivate(old)` → `create(new)` → write DB. If `create` throws after the deactivate, it returns 502 **without touching the DB**, so `stripe_price_id` points at a now-**inactive** Price — and Stripe rejects inactive prices in new sessions. Routine action, high blast radius, two-line fix: **create-new → write DB → deactivate-old (best-effort)** so the id always points at an active price.

3. **Phase 10b operator note misstates the trigger** *(doc correctness).* It claims flipping `is_published` in Studio "fires the trigger and creates Stripe." The trigger is `AFTER INSERT` — an **UPDATE** doesn't fire it, yielding a *published-but-no-Stripe zombie* (passes RLS, hidden by `main.js`, unbuyable). Split the INSERT-with-flag case from the UPDATE-flip case; fix the claim.

4–5. **Two unshown anchors against the doc's own "never open a file" doctrine:** create lines 96–178 (does the generated `slug`/`sku` land on `product` so the new `CREATE_FIELDS` allow-list captures it? safe by inference, but unverifiable cold), and the MP4-upload leg in `upload.ts` (95/118–131/199–203, asserted not quoted). Quote both.

6–10 are lower: concurrent first-publish TOCTOU (dup Stripe product; button-disable mitigates), admin price-only edit showing a misleading Publish button, product-scoped coupons needing a published product's Stripe id, the refund→order blind spot (no `charge.refunded` handler — fixable in the existing `webhook.ts`, no new function), and the `request.url`-origin assumption behind the relay-the-link decision.

**If you fix one thing:** #1 — it's the only item that decides whether the product is what the plan says it is; everything else is fix-in-place.

**Verdict: NEEDS ANOTHER PASS** — targeted, not architectural. #1 is a decision/spec, #2 and #3 are small mechanical fixes, #4–5 are paste-the-anchor. One revision should converge to READY.

---

## Ranked gap list (most likely to derail / leave a capability missing → least)

### 1. Photo (and media) upload *by chat* is asserted but never specified — the leg the whole thesis rests on. [completeness + self-containment]
- **Location:** §1.2, §1.7, §1.10 ("Media: `uploadImage`…"), Phase 9 (only the `role` *description* is
  edited; the `uploadImage` request schema is never shown), Phase 5 (server side only).
- **What's wrong:** the plan's thesis is "the store is run entirely by chat," and every create and every
  photo edit depends on the GPT getting Em's image **bytes** to `POST /api/upload`. Nowhere in either doc
  is the mechanism shown: does the `uploadImage` Action take a **URL**, a **base64 data URI**, or a
  multipart file? Custom GPT Actions send JSON bodies — they cannot post multipart binary, and a
  chat-uploaded photo lives in the ChatGPT conversation, not at a public URL. The STORE doc's own framing
  ("AI pipeline finalized… signed Cloudinary uploads," "the **curl** protocol in `GPT_SETUP.md`") reads
  like the upload path was built for **agentic/curl** callers (Sean, or a file-capable agent), which is a
  *different* capability from "Em drops a photo into ChatGPT and it lands on the CDN." A cold reviewer
  with only these two docs cannot confirm the by-chat upload works at all — and v1.5 piles **two new
  roles** (`checkout_image` 1:1, `seo_thumbnail` 1.91:1) and **MP4 media** onto that same unshown path.
- **Why it ranks #1:** if the real answer is "uploads need curl," then create-by-chat and photo-edits —
  the core of the value prop — silently require out-of-chat tooling, and "she moves like a tornado
  through updates" is false. This is exactly the "is the GPT genuinely helpful vs. clunky-enough-that-DIY-
  wins" stress the A-pass is for.
- **Concrete fix:** in §1.7/§1.10 (and a quoted block in Phase 9) state the **actual** byte-delivery path
  for `uploadImage` — the request schema + how a ChatGPT-uploaded image reaches the endpoint (URL?
  base64? native file param?). Explicitly confirm `checkout_image`, `seo_thumbnail`, and `media` MP4s use
  the identical path. If the honest answer is "Sean/curl uploads media; Em does copy/price/publish by
  chat," **say that** and reconcile the thesis (it's still a strong product — just not literally
  100%-by-chat for media). One paragraph closes the largest unverifiable assumption in the plan.

### 2. Price-rotation order (deactivate-old → create-new) can leave a *live* product pointing at an INACTIVE Stripe Price → silently unbuyable. [code correctness]
- **Location:** Phase 3.4, PUT published branch, the rotation block (≈ lines 1114–1128); same pattern the
  STORE "Stripe Sync Rules" codify ("archive old Price → create new → update id").
- **What's wrong:** the sequence is `stripe.prices.update(old,{active:false})` → `stripe.prices.create(...)`
  → write `stripe_price_id`. If `prices.create` (or the network) **throws after the deactivate
  succeeds**, the handler returns 502 and **does not touch the DB** — so `stripe_price_id` still points at
  the old Price, which is now `active:false`. Stripe **rejects an inactive Price in a new Checkout
  Session**, so the product is **unbuyable** until a later rotation happens to succeed — and nothing
  flags it (the DB row looks normal: old price, old id). Re-pricing is a routine owner action; the blast
  radius (a live, possibly popular piece silently un-purchasable on a transient Stripe error) is high and
  the fix is two lines. "It's the proven pre-v1.5 logic" is not a defence — Sean's rules say never presume
  the prior approach was best.
- **Concrete fix:** reorder so `stripe_price_id` *always* points at an **active** Price. Create the new
  Price first, write the DB, then deactivate the old one best-effort:
  ```ts
  const newPrice = await stripe.prices.create({
    product: current.stripe_product_id as string,
    unit_amount: updates.price as number, currency: 'usd',
  });
  liveUpdate.stripe_price_id = newPrice.id;
  liveUpdate.price = updates.price;
  // ...after the DB update succeeds:
  try { await stripe.prices.update(current.stripe_price_id as string, { active: false }); }
  catch (err) { console.error('Old price deactivate failed (harmless — DB points at the new price):', err); }
  ```
  Now every failure path leaves a buyable product (old active+referenced, or new active+referenced).
  Add a Phase 11 test for the failure window (simulate a create error; assert the product stays buyable).

### 3. Phase 10b operator note misstates the INSERT trigger — a Studio flag-flip yields a "published but no Stripe" zombie, not a Stripe create. [doc correctness]
- **Location:** Phase 10b "Operator note (2nd Gap A G8)" (≈ lines 2942–2948).
- **What's wrong:** the note says *"Hand-setting `is_published=true` in Studio **does** fire the trigger
  and create Stripe."* The trigger is `AFTER INSERT` only. **Updating** an existing draft's
  `is_published` false→true is an UPDATE — it does **not** fire `notify_stripe_sync_on_insert`. So the
  most natural reading of the note (flip the existing draft's flag) is **wrong**, and the real outcome is
  worse than described: a published row with **no `stripe_price_id`** → passes the new RLS
  (`is_published=true AND archived_at IS NULL`) but `main.js` hides it (no Stripe price) → an invisible
  "published" zombie that's also unbuyable. The note tells Sean Stripe gets created; it doesn't.
- **Concrete fix:** split the two Studio actions explicitly:
  (a) a Studio **INSERT** with `is_published=true` *does* fire the AFTER-INSERT trigger and create Stripe,
  but skips `handlePublish` (no checkout-field validation, `published_at` stays null) — don't;
  (b) a Studio **UPDATE** that flips an existing draft's `is_published` does **not** fire the trigger →
  published-but-no-Stripe zombie (publicly "published," unbuyable, hidden by `main.js`) — don't.
  Bottom line unchanged: never publish from Studio; publish via the admin panel or the GPT.

### 4. `products.ts` create lines 96–178 (slug/sku generation + validation) are unquoted, but the new `CREATE_FIELDS` allow-list picks from `product`. [self-containment]
- **Location:** Phase 3.3 (NEW create) — the CURRENT block quoted is only 179–210; the slug/sku/role
  validation upstream (96–178) is referenced but not shown.
- **What's wrong:** the new insert is built by `pick`-ing `CREATE_FIELDS` (incl. `slug`, `sku`) **from
  `product`**. Whether the API-generated slug/sku land **on the `product` object** (→ captured) or in a
  **separate variable** (→ silently dropped by the allow-list → INSERT 400s on the NOT NULL / unique
  `slug`) lives in the unquoted region. It is *safe by inference* — the OLD insert was `{ ...product,
  is_test }` with no separate slug merge, so a working v1.4.9 implies slug is already on `product` — but
  the doc's own doctrine is "never infer, never open a file." This is the one place a builder must.
- **Concrete fix:** quote (or assert with a verified line ref) that 96–178 sets `product.slug` (and
  `product.sku` if API-generated) on the `product` object, so `CREATE_FIELDS` captures them. One sentence
  removes the only required file-open in the create path.

### 5. Phase 5 asserts the MP4/video upload leg "already works" citing unquoted lines. [self-containment]
- **Location:** Phase 5 note ("Video upload already works… `upload.ts` already accepts `video/mp4`…
  parses `skip_transform`… `shouldTransform = isImageMime && !skipTransform`" — lines 95, 118–131,
  199–203, none quoted). Only `ROLE_PATTERN` (52–53) and the transform (170–172) are quoted.
- **What's wrong:** `media`/`populateMedia` is a **new** v1.5 surface and the GPT explicitly instructs Em
  to upload MP4s, so the video-upload leg is load-bearing — yet it's asserted, not shown. A cold reviewer
  can't confirm `ALLOWED_MIME`, the 50 MB cap, or the `skip_transform` short-circuit without opening the
  file, which is the thing the anchor doctrine forbids.
- **Concrete fix:** quote `ALLOWED_MIME` + the `skip_transform`/`shouldTransform` lines in a short Phase 5
  appendix (same treatment the other anchors got). If they hold as claimed, this is a 10-line paste.

### 6. Concurrent first-publish can create duplicate Stripe products (TOCTOU). [robustness — lower]
- **Location:** Phase 3.5 `handlePublish` first-publish branch; `syncProductToStripe` idempotency.
- **What's wrong:** idempotency is **read-then-write** (short-circuit if `stripe_product_id` exists). Two
  near-simultaneous first-publishes — e.g. Em taps the preview-page **Publish** *and* tells the GPT
  "publish" at once, or a client retry — can both read `stripe_product_id = null` and both create a Stripe
  product. Result: a duplicate, unreferenced Stripe product; the row keeps whichever id wrote last; cleanup
  is manual. The button's `disabled=true` mitigates the everyday double-tap, but not button+GPT.
- **Concrete fix (v1-pragmatic):** document it as a known edge (button-disable covers the common case). A
  hardened version claims the publish atomically *before* the Stripe create — but that reintroduces a
  "published with no Stripe" window on sync failure, so it needs a real guard (conditional update with a
  row-count check, or a Postgres advisory lock keyed on the id) rather than a naive reorder. Acceptable to
  defer with a one-line note; not a blocker.

### 7. Admin price-only edit shows a misleading "Publish when ready" + Publish button though the change is already live. [UX — muddies the live/draft signal Sean asked for]
- **Location:** Phase 8.9 `renderPublishPanel`; driven by the PUT response when `price_updated:true` and
  `staged:false` (no `preview_url`).
- **What's wrong:** a price-only change on a published product goes live immediately and stages nothing.
  But `renderPublishPanel` with no `previewUrl` prints *"Saved. Publish when ready."* and still renders a
  **Publish now** button. Clicking it is a harmless no-op (`handlePublish` returns `no_changes:true`), but
  it directly undercuts the "Page Status" clarity Sean explicitly wants — is it live or not? (The GPT path
  is correct here: it tells her the price is already live and hands no preview link.) Admin-only wart.
- **Concrete fix:** in `renderPublishPanel`, when `body.price_updated && !body.staged && !previewUrl`,
  show only the "price is live now" note and **no** Publish button (or a "Done — nothing else to publish"
  state).

### 8. Product-scoped coupons require a *published* product's `stripe_product_id`; a draft has none. [GPT-UX — low]
- **Location:** §1.5, Phase 3.5 `handleCoupon` (`applies_to.products`), Phase 9 coupon instructions.
- **What's wrong:** `product_ids` are Stripe product ids read from `listProducts`. A draft's
  `stripe_product_id` is null until publish, so "20% off the Lavender Wreath" when it's still a draft would
  pass `[null]` → Stripe error. Narrow, but the GPT isn't told.
- **Concrete fix:** one line in the coupon instructions — a product-scoped coupon only works on a
  **published** product (a draft has no Stripe id yet); publish it first, or make the coupon store-wide.

### 9. Refund blind spot: a dashboard refund won't reflect in the Supabase order. [completeness — likely out of v1.5 scope]
- **Location:** §1.10 ("Refunds: guided only — Em does them in the Stripe dashboard"); `orders.status`
  enumerates `refunded`; STORE webhook handles only `checkout.session.completed`.
- **What's wrong:** the plan touts status visibility, but a guided dashboard refund leaves the order
  showing `completed`/`shipped` in Supabase — there's no `charge.refunded` handler. The `refunded` status
  is therefore unreachable in practice.
- **Concrete fix (optional, function-cap-free):** `webhook.ts` already exists and is deployed, so handling
  `charge.refunded` (set `status='refunded'`) is an *event branch*, not a new function. Otherwise,
  document the blind spot in `STORE_ADMINISTRATION.md` so "status" isn't read as covering refunds. Fair to
  defer — orders are "already wired; v1.5 adds nothing" — but call it out.

### 10. `previewUrl`/`liveUrl` rely on `new URL(request.url).origin` being the public origin on Vercel. [noted — load-bearing assumption]
- **Location:** Phase 3.1 helpers; the 3rd-pass decision to return an origin-correct `preview_url`
  rather than hardcode the host (Landmine 11).
- **What's wrong:** the "relay the link, never hardcode the domain" model is correct *only if* Vercel
  passes the public Host through to `request.url` here (not an internal `*.vercel.app`/proxy hostname).
  Tested indirectly (Phase 11 #3/#13), but a cold reviewer can't confirm the origin is public from the
  docs.
- **Concrete fix:** one line in Phase 3.1 stating `request.url` carries the public origin on this
  deployment (or that Phase 11 #3 explicitly asserts the returned `preview_url` host == the store's public
  host), so the decision's premise is recorded, not assumed.

---

## Landmines 7–12 — confirmed holding (not re-raised)

- **#7 frozen-field guard checks CHANGE, not presence; price excluded; admin path tested** — PUT published
  branch filters `updates[f] !== current[f]` over `FROZEN_AFTER_PUBLISH` (price not in the set; it
  rotates). Phase 11 #5b/#6 exercise the **admin** published-edit path (full payload re-send must not
  400). **Holds.**
- **#8 RLS swap is name-keyed + self-checking** — `DROP POLICY IF EXISTS "Products are publicly readable"`
  + a `DO $$ … RAISE` block that aborts if any permissive `products` SELECT policy still has `qual='true'`.
  Targets the exact legacy `USING(true)`; the new policy's qual is not `'true'`, so no false-positive.
  **Holds.**
- **#9 discard exists** — `?_action=discard` clears `draft` + `preview_token` on a *published* row; GPT
  `discardEdits` + admin "Discard pending edits" (shown only when `body.staged`). **Auth-only by design**
  (no token path — a shared preview link must not let a holder wipe staged edits); sound. **Holds.**
- **#10 create is allow-listed** — `CREATE_FIELDS` (= `DRAFTABLE` + `price`/`checkout_*`/`title`/`slug`/
  `sku`) picked from the body; system columns layered on server-side; Phase 11 #15 asserts injected
  `is_published`/`draft`/`stripe_*` are ignored. **Holds** (modulo the slug/sku provenance note, #4).
- **#11 `getProduct` returns an origin-correct `preview_url`** — GET-by-slug authorized branch returns
  `preview_url` when `preview_token` exists; schema + instructions tell the GPT to **relay** it.
  **Holds** (modulo the origin assumption, #10 above).
- **#12 `listCoupons` auto-paginates** — `for await (const pc of stripe.promotionCodes.list({active:true,
  limit:100}))` with a `SCAN_CAP`; filters `pc.coupon.metadata.source === 'owner_sale'`. The nested
  `coupon` object on each promotion code is present by default (correct Stripe behaviour), and `.list()`
  is async-iterable (correct SDK behaviour). **Holds.**

Originals **1–6** are respected (SQL-trigger-not-Studio-webhook + drafts skip + Stripe-at-publish;
public via anon+RLS, `is_test` in `main.js` not RLS, preview via service-role; price rotates in place
[the *ordering* in #2 is a new robustness issue, not a re-raise]; archive-not-delete + FK-protected;
no new functions / 11-of-12; `is_test` never user-editable). Not re-litigated.

---

## If you fix ONE thing

**Specify how Em's chat-uploaded photos and MP4s actually reach `/api/upload` (#1).** Everything else
here is a fix-in-place; this is the one item that decides whether the product *is what the plan says it
is*. Every create and every photo/media edit depends on it, the two new image roles + media ride on it,
and it is the single load-bearing assumption a cold reviewer cannot confirm from these two documents. If
upload realistically needs curl/agentic tooling, the "run the whole store by chat" thesis quietly
becomes "run the *text* of the store by chat, with Sean handling media" — a meaningful scope change that
should be a decision on the page, not an inference at build time.

---

## Verdict

**NEEDS ANOTHER PASS** — targeted, not architectural. Resolve #1 (decision/spec), apply #2 and #3
(two small, mechanical correctness fixes), and quote the two unshown anchors (#4, #5). The rest are
one-line notes or deferrable. None is a rebuild; a single revision should converge this to READY.
