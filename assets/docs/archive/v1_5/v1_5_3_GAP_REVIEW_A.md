# v1.5.3 — Gap Review A (3rd pass · cold / out-of-repo)

**Reviewer stance:** fresh non-repo instance; inputs = `v1_5_3_IMPLEMENT.md` + `EVERLASTINGS_STORE.md` only.
**Two jobs:** (1) self-containment — where must the builder open a file, guess, or recall a library?
(2) completeness/architecture — can Em fully run the store by chat?
**Verdict:** **NEEDS ANOTHER PASS.** The plan is close, but it rests three *load-bearing* assumptions on
which Supabase client each reader uses (never anchored), is missing one genuine owner capability
(discard a staged draft), and leaves the most-recently-fixed landmine (G1 admin path) depending on an
unverified price round-trip. None require an architecture rewrite; all are anchorable/foldable.

---

**Verdict: NEEDS ANOTHER PASS** — close, but three load-bearing items aren't anchored and one genuine capability is missing. No architecture rewrites; all foldable.

The three that actually derail the build:

1. **Read-path is unanchored, and the read model just inverted.** This migration is the first time RLS *hides* rows the app still has to read (drafts + archived, for `anon` **and** `authenticated`). The plan asserts — without quoting a single `createClient` — that `products.ts`/preview/checkout are service-role (so they still see drafts), that admin reads via the API (not its authenticated supabase-js client), and that `product-feed` is anon (so RLS hides drafts from Meta). If admin `loadProducts` uses `state.client` — and the old `onDeleteProduct` proves admin *holds* such a client — the admin draft/publish/archive UI goes blind the moment the migration lands. If `product-feed` is secretly service-role, drafts leak to Instagram Shopping. This is the "fix one thing."

2. **No discard-draft path.** Once edits are staged on a published product, the only exits are publish-them or leave-them-pending-forever. For a "run it by chat like a tornado" product, not being able to back out of a draft is a real hole. ~15 lines + one action + one button.

3. **G1's blind spot (landmine 7).** The fix rejects only a *changed* frozen value, but `price` is sent on every published save and its admin round-trip to an identical integer is never anchored — if the dollar→cents reconstruction drifts, every published-product admin edit 400s, re-introducing G1 by another door.

Plus #4 as a decision for you, not the builder: the new-product re-price path collides on `slug` and silently changes the product URL. The PUT price-rotation you removed kept the same slug/URL/page — worth deciding whether "frozen Price, rotate to a new Price on the same product" serves the chat thesis better than "whole new product."

Landmines 1–6 hold; 7 holds in logic but leans on the unverified price round-trip; 8 holds (the transactional RAISE-on-surviving-`USING(true)` is sound).

---

## Ranked gap list

### 1 — [BLOCKER · self-containment] The whole v1.5 read model inverts, but no reader's client identity is anchored
**Where:** Phase 1 RLS (443–449); the "every other public read" note (364–371); Phase 3.2 preview branch;
Phase 7 `fetchPreviewProduct`; pre-flight `api/products.ts` (328–329) and `admin.js` (335–341); the
product-feed claim (361–363).

**What's wrong:** This migration makes RLS hide `is_published=false` **and** `archived_at IS NOT NULL`
from **`anon` *and* `authenticated`**. Every feature in v1.5 now depends on *which client each product
reader uses* — and the plan **asserts** each one in prose without quoting a single `createClient(...)`:

- `products.ts` `supabase` (preview GET, `handlePublish` lookup, PUT `current` lookup, `handleArchive`
  lookup) **must be service-role**, or RLS hides the very drafts/archived rows these handlers exist to
  read → preview 404s, publish can't find its row, archive can't find its row. *The plan says "Admin +
  GPT read via the service-role API, which bypasses RLS" (444) but never proves the client is
  service-role.*
- **Admin `loadProducts` is the sharp edge.** The plan claims admin reads "via the service-role API"
  (305, 444), yet the *old* `onDeleteProduct` used `state.client.from('products').delete()` — i.e. admin
  holds an authenticated supabase-js client and used it for at least one data op. If `loadProducts` reads
  through `state.client` (very plausible), the new policy (which also binds `authenticated`) makes
  **drafts and archived rows vanish from the admin list** — so the owner cannot see, preview, publish, or
  resurface them. The admin UI goes blind on exactly the rows v1.5 adds. The plan never quotes
  `loadProducts`.
- `api/product-feed.ts` is asserted to be on the **anon** client (361) so RLS hides drafts/archived from
  the Meta catalog. If it's actually service-role (many API fns are), **unpublished drafts and archived
  pieces leak to Instagram Shopping** (only `is_test=false` is hardcoded). Note the asymmetry: `checkout.ts`
  got *explicit* `is_published`/`archived_at` guards (Phase 4) precisely because it's service-role — but
  `product-feed` was left trusting RLS. The builder must *know* each file's client to know which rule applies.

**Concrete fix:** Add to pre-flight a hard check that quotes the `createClient(...)` line in
`api/products.ts`, `api/checkout.ts`, and `api/product-feed.ts`, and confirms: products/checkout =
`SUPABASE_SECRET_KEY` (service-role); product-feed = publishable/anon. Quote `admin.js` `loadProducts`
and confirm it reads through `GET /api/products` (authHeader), **not** `state.client.from('products')`;
if it uses the client, change it to the API. And — regardless of client — add an explicit
`.eq('is_published', true).is('archived_at', null)` to the `product-feed` query (belt-and-suspenders,
same treatment checkout got); don't let a public catalog depend solely on a client-type assumption.

---

### 2 — [BLOCKER · missing capability] No way to *discard* a staged draft
**Where:** §1.4 state machine; Phase 3.4 PUT (published branch only ever *merges* into `draft`);
Phase 3.5 `handlePublish` (only *applies* a draft); §1.10 action set.

**What's wrong:** Once an edit is staged on a published product, the only exits are **publish it** (push
edits live) or **leave it staged forever** ("live · edits pending"). There is no `discard` action and no
admin "discard pending edits" button. `archiveProduct` doesn't clear `draft`; `Cancel` only closes the
editor. So the natural owner move — "actually, scrap those changes" — has no clean answer: she must
either publish edits she doesn't want, or manually re-type every field back to the live value (and she'd
need to know the live values). For a system whose entire thesis is "move like a tornado through updates,"
the inability to back out of a draft is a real hole, and it compounds with the lost-preview UX (G9): a
half-finished draft she abandoned keeps the product flagged "edits pending" indefinitely.

**Concrete fix:** Add `?_action=discard` (POST; auth or token) that sets `draft = null` + clears/rotates
`preview_token`; expose it as GPT `discardEdits(id)` and an admin "Discard pending edits" button on the
publish panel. ~15 lines in `products.ts`, one schema block, one button — no new function.

---

### 3 — [HIGH · landmine 7 blind spot] G1's `!==` compare is only safe if the admin price field round-trips to the *identical* integer
**Where:** Phase 3.4 frozen guard (982–986); Phase 8.5 `buildProductPayload`; pre-flight "price at 394
(always emitted)" (339); Phase 11 #5b/#6.

**What's wrong:** The G1 fix rejects a frozen field only when `updates[f] !== current[f]`. For `checkout_*`
this is safe because `buildProductPayload` normalizes empty→`null` (so `null !== null` is false). But
**`price` has no such normalization quoted**, and the plan never shows how the admin price input
serializes. `price` is sent on *every* published save (even copy-only edits). If the field holds dollars
and reconstructs cents without a clean `Math.round` (e.g. `parseFloat("245.99")*100` → `24598.999…`),
then `updates.price !== current.price` even though "unchanged" → **400 on every published-product admin
edit** — i.e. G1 re-introduced through a different door. The cold builder cannot verify this without
opening `admin.js`; it's the exact "must open a file" defect this pass exists to catch, on the highest-
stakes path.

**Concrete fix:** Quote the admin price input + its parse in `buildProductPayload`; confirm the cents
value round-trips as an identical integer (add `Math.round` if absent). Defense-in-depth option to flag
to Sean: have `buildProductPayload` simply *omit* `price`/`checkout_*` when `state.editing?.is_published`
is true, so the guard never depends on a round-trip at all. (Test #6 will catch a regression on the dev
preview, but a self-contained plan shouldn't ship an unanchored equality dependency on its newest fix.)

---

### 4 — [MED-HIGH · capability friction + unhandled error] The price-change path collides on slug and silently changes the product URL
**Where:** §1.10 (259) "A published price change is a new product, then archive the old one"; §1.12;
GPT instructions "== REMOVING / RE-PRICING ==" (2379); `createProduct` schema requires `slug` (2131);
AR #7/#23 (slug immutable, from title).

**What's wrong:** Archiving the old product **does not free its `slug`** (the row persists; `slug` is
UNIQUE). So `createProduct` for the same piece with the same title → slug collision → **409**, and the
GPT instructions give no handling for it. The owner's only route is a different title → a different slug
→ **a different product URL** (SEO/link loss), with two near-identical pieces transiently live. This is
the clunkiest owner journey in the whole set, and it's the one the value prop ("run it by chat") most
needs to feel smooth. Worth surfacing to Sean as a decision: the *removed* PUT price-rotation
(archive old Stripe price → create new price on the **same** product → update `stripe_price_id`) kept the
same slug/URL/page and was arguably better owner UX; "price change = new product" is a self-imposed
simplification that trades owner experience for invariant tidiness. (Stripe supports multiple prices per
product, so the invariant could be "the *Price* is frozen; re-pricing rotates to a new Price on the same
product" without breaking the lock's intent.)

**Concrete fix (minimum):** Teach the GPT the slug reality — on re-price, the new piece needs a distinct
title/slug and **the URL will change**; tell Em so explicitly; archive old *after* the new one publishes.
**Decision to surface:** reconsider whether same-product price rotation better serves the chat thesis than
new-product (this re-opens landmine 3's mechanics, so it's Sean's call, not the builder's).

---

### 5 — [MED · injection hardening] `createProduct` spreads `...product` into the insert
**Where:** Phase 3.3 NEW — `const insertRow = { ...product, is_test: isTest, is_published: false,
preview_token }`; pre-flight "POST create+sync (96–211)".

**What's wrong:** `is_test` and `is_published` are overridden after the spread (good), but the new system
columns aren't: a caller can inject `draft`, `archived_at`, `published_at`, `stripe_product_id`,
`stripe_price_id` at create. RLS + the trigger's draft-skip defang the worst cases (an injected
`stripe_*` on an `is_published=false` row stays hidden and the trigger won't fire), but it's loose, and
the plan doesn't show whether `product` is an allow-listed object or the raw body. The PUT path correctly
uses `pick(...)` allow-lists; create should match.

**Concrete fix:** Confirm `product` is an allow-listed projection of the body (not the raw body). If it
isn't, allow-list it the way PUT does, so the v1.5 system columns can never be set at create.

---

### 6 — [MED · scaling] `listCoupons` caps at 100 and can't page; system codes will crowd out owner sales
**Where:** Phase 3.5 `handleCouponList` — `stripe.promotionCodes.list({ active: true, limit: 100 })`
then client-side filter `metadata.source === 'owner_sale'`.

**What's wrong:** The store auto-creates a promotion code per cart-recovery / newsletter event (AR #31);
these stay `active:true` until their 30-day `expires_at` (Stripe's `active` flag is separate from expiry).
Over months these accumulate. Because the `owner_sale` filter is client-side over the first 100 active
codes, once >100 active codes exist the owner's real sales can fall off the page and silently disappear
from `listCoupons` — and Stripe can't server-filter promo codes by the coupon's metadata.

**Concrete fix:** Auto-paginate (`stripe.promotionCodes.list(...).autoPagingEach`/`for await`) and collect
`owner_sale` matches until exhausted (cap at a sane bound), instead of a single `limit:100`. Note the
behavior in the GPT knowledge so it never claims "that's all your sales" off a truncated list.

---

### 7 — [MED-LOW · self-containment] `renderPublishPanel(body, …)` assumes `body` is the parsed API response
**Where:** Phase 8.7 (`renderPublishPanel(body, editing ? editing.id : body.product?.id)`); Phase 8.9.

**What's wrong:** The panel reads `body.preview_url` and (for a create) `body.product?.id`. That only works
if `onSaveProduct`'s `body` is the parsed response JSON (`{ success, product, preview_url, preview_token }`),
not the request payload from `buildProductPayload`. The plan quotes the status line (461–462) but not the
fetch+parse that assigns `body`, so this is an unverified internal contract; if `body` is the request
payload, a freshly-created draft has no id to publish.

**Concrete fix:** Quote the `onSaveProduct` fetch/`await res.json()` so `body`'s shape is anchored; confirm
the create response's `product.id` is what feeds `publishProduct`.

---

### 8 — [LOW-MED · behavior change + reconciliation] Manual "mark sold" via admin is now draft-gated; webhook-vs-draft can un-sell a purchased item
**Where:** GPT instructions (2379, noted for the GPT); Phase 3.4 (`available` is DRAFTABLE); webhook
writes `available=false` to live columns on purchase (STORE Data Flow 12).

**What's wrong (two parts):** (a) Toggling `available=false` on a **published** product in *admin* now
stages a draft instead of taking effect — only `archiveProduct` is instant. The GPT is warned (2379); the
admin UI and `STORE_ADMINISTRATION.md` are not. (b) If a pending `draft` happens to carry
`available:true` (she toggled it while editing copy) and a purchase fires the webhook (`available=false`
on live), a later **publish** applies the draft → `available:true` → the sold-out item goes buyable again.
Narrow, but it's a real data-integrity edge between the webhook's live write and the draft overlay.

**Concrete fix:** Add a one-line admin/STORE_ADMIN note that manual mark-sold stages a draft (use Archive
for instant takedown). For (b): at publish, don't let a draft re-raise `available` past a sold live state —
or simply never stage `available` from the copy editor. Low effort; document at minimum.

---

### 9 — [LOW · capability visibility] GPT `listProducts` status vocabulary omits "archived"
**Where:** Phase 9.1 `listProducts` summary (2172) lists only live/draft/edits-pending; admin pills (8.8)
include `archived`.

**What's wrong:** The authorized list returns archived rows (so the GPT *can* resurface), but the GPT is
never told to report "archived" as a status, so it may present an archived piece as live/draft.

**Concrete fix:** Add "archived" to the status vocabulary in the `listProducts` summary and the GPT
knowledge (read `archived_at`); mirror the admin pill set.

---

### 10 — [LOW · self-containment] The "re-show lost preview" instruction hardcodes the production origin
**Where:** GPT instructions (2383) — `https://everlastingsbyemaline.com/product/{slug}?preview={token}`.

**What's wrong:** `createProduct`/`editProduct` responses use the dynamic `previewUrl(request,…)` (correct
per origin), but the *reconstruction* path hardcodes prod. Pointed at the dev preview (Sean's test path,
§1.8), the rebuilt link points at prod and won't resolve the test draft. Only affects the re-show path on
preview; the create/edit happy path is fine.

**Concrete fix:** Have the GPT prefer the `preview_url` the API returns; for reconstruction, note the host
must match the deployment the Action targets (or return a relative path the client resolves).

---

## Landmines 1–8 — validation (per the brief: confirm 7–8 hold; respect 1–6)

- **1 (SQL trigger, not Studio webhook; drafts skip; Stripe only at publish):** Holds. Migration
  `CREATE OR REPLACE`s only the function, leaves `CREATE TRIGGER` (stays `AFTER INSERT`), adds only
  `OR NEW.is_published = false`; publish's `UPDATE` can't re-fire an INSERT trigger. The hardcoded prod
  `stripe-sync` URL never fires from preview because test inserts skip. ✓
- **2 (public reads = anon+RLS; `is_test` in main.js not RLS; preview via service-role API):** *Logic*
  holds, but it is **only as true as G1 above** — it presumes service-role on the API path and anon on
  product-feed, neither anchored. See finding #1.
- **3 (Stripe-lock; price change = new product; draft price editable):** Holds in code (frozen branch vs
  unpublished branch). The *owner experience* of the new-product re-price path is weak — finding #4.
- **4 (archive not delete; hidden public; FK-protected):** Holds. Archive mirrors Stripe `active:false`,
  RLS hides it, the `orders→products` FK has no CASCADE, the commented purge `NOT EXISTS`-guards orders. ✓
- **5 (no new functions; `?_action=` rewrites; pg_cron; 11/12):** Holds. No new `api/*.ts`; rewrites are
  distinct literals + one by-slug param with nothing shadowing them; purge is in-DB. ✓
- **6 (`is_test` never user-editable; scoped everywhere):** Holds across create/PUT/publish/archive/
  preview/main.js (`is_test`/`is_published` overridden after the create spread; PUT uses allow-lists;
  coupons isolate via the Stripe key environment). Residual create-injection of *other* system columns is
  finding #5. ✓
- **7 (frozen guard checks CHANGE not presence; admin path tested):** Guard logic holds (`!==`, scalars,
  `|| null` normalization on `checkout_*`); test #5b/#6 added. **Caveat:** correctness depends on the
  admin `price` round-tripping to the identical integer — unanchored — finding #3.
- **8 (RLS swap name-keyed + self-checking RAISE on surviving `USING(true)`):** Holds. Exact-name `DROP`,
  new policy's qual isn't `true`, the `DO $$` guard RAISEs (whole migration rolls back, transactional) if
  any permissive products SELECT policy still has `qual='true'`. Micro-caveat: the guard relies on
  Postgres deparsing `USING (true)` to exactly `'true'` (it does); a non-`true` always-open form would
  slip it, but the quoted legacy is `USING (true)`, so it's consistent. ✓

---

## If you fix one thing

**Anchor the read-path (finding #1).** Everything else is a feature gap or a localized verification; this
one silently *inverts*. The migration is the first time RLS hides rows the app still has to read, and the
plan asserts — without quoting one client — that `products.ts`/preview/`checkout` see them (service-role),
admin sees them (API not its authenticated client), and `product-feed` *doesn't* (anon). If admin
`loadProducts` reads through its authenticated supabase-js client, the admin draft/publish/archive UI goes
blind the instant the migration lands; if `product-feed` is service-role, drafts leak to the public Meta
catalog. Quote the three `createClient` lines + admin `loadProducts`, and give `product-feed` an explicit
`is_published`/`archived_at` filter so a public surface never rides on an unverified client type.

## One-line verdict

**NEEDS ANOTHER PASS** — fold #1–#3 (load-bearing) and #4 (decision for Sean), re-run A.
