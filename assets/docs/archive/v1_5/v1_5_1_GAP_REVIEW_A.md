# v1_5_1_GAP_REVIEW_A — cold / out-of-repo (holistic gate)

**Reviewer angle:** A (no repo; only `v1_5_1_IMPLEMENT.md` + `EVERLASTINGS_STORE.md`).
**Mandate:** (1) self-containment — every place the builder must open a file, recall a library, or
decide something the plan didn't; (2) completeness/architecture — can Em fully run the store by chat,
and does the system design hold (preview-token capability, draft→publish state machine, Stripe-lock,
`is_test` integrity, 11/12 cap, GPT-as-brand-surface).

**Note on landmines:** the review prompt's `[paste the five Landmines above]` was left unfilled, so I
validated against the five landmines the plan states itself (IMPLEMENT §"v1.5 landmines", lines
2091–2099). Findings are mapped to them where relevant.

**Method caveat that itself is a finding:** several of the plan's most load-bearing edits *replace or
depend on live artifacts whose CURRENT text the plan never quotes* (the Postgres trigger body, the
`product.js` page handler, the `main.js` anon read). The plan's own anti-fragility rule ("every code
edit quotes a CURRENT block… the quoted CURRENT text is the anchor") is broken in exactly the spots
where a silent miss would defeat a core invariant. Three of the four blockers below are instances of
this.

---

**Verdict: NEEDS ANOTHER PASS.** 22 ranked findings — 4 blockers, 10 major, 8 minor.

The throughline: the plan's most dangerous edits are anchored to live artifacts it never quotes, breaking its own anti-fragility rule exactly where a silent miss kills an invariant. Three of the four blockers are this:

1. **Stripe-on-INSERT mechanism** — the plan guards the `notify_stripe_sync()` *function*, but the architecture doc also describes a Supabase Studio *Database Webhook* on `products` INSERT. If that's a separate path (or the same path created via the UI), every draft mints a Stripe product on save and the whole draft→publish premise is silently void.
2. **The trigger body** is replaced `CREATE OR REPLACE` from a two-fragment quote — any other logic in it is dropped, and INSERT-vs-`INSERT OR UPDATE` scope is unconfirmed (the latter double-creates Stripe at publish).
3. **`is_test` × new RLS** — the policy gates `is_published` only. That's required for the dev preview to show published *test* products, but it means production's anon client will read those same test rows unless `main.js` filters `is_test` env-aware — which the plan never shows. Test products leaking to the live shop, or the live shop blanking, both live here.
4. **`product.js`** — Phase 7 replaces the page handler with one calling ~17 functions whose names/existence are never shown. One mismatch = blank product page.

Capability gaps that would leave Em unable to "fully run it by chat": the MP4 upload path the GPT is told to use (`skip_transform=true`) isn't shown to exist (#6); orders Actions are claimed in §1.10 but never wired into the GPT (#7); `listCoupons` mixes her sales with v1.4 system codes (#8); and there's no chat path to fix a draft's price before first publish (#9).

The "if you fix one thing" pick is #1 — it's the silent-failure case with the worst blast radius, and fixing its *class* (quote/verify the unquoted live artifacts) de-risks the build most.

One process note: your review prompt's `[paste the five Landmines above]` came through unfilled — I validated against the five the plan states itself (§"v1.5 landmines"). If you meant a different set, send them and I'll re-check.

---

## Ranked gap list

Ranked by probability of derailing the build or shipping a missing/broken capability.

### BLOCKERS — will derail the build or silently break a core invariant

**1. The plan patches one Stripe-on-INSERT mechanism but never proves it's the only one.**
*Location:* Phase 1 (trigger rewrite); landmine #1; STORE Glossary ("Supabase DB webhook — a Supabase
Studio setting") vs. AR #8 vs. migration `20260421000003`.
*Gap:* The plan makes drafts safe by adding `OR NEW.is_published = false` to `notify_stripe_sync()`.
But the architecture doc describes the auto-create as a **Supabase Studio "Database Webhook"** (a
Studio UI setting that POSTs to `/api/stripe-sync` on INSERT) *and* as a pg trigger function in the
migration. If those are two mechanisms — or if Sean created the webhook via Studio rather than via
that migration — a Studio-level webhook fires on the draft INSERT regardless of the function guard and
creates a Stripe product for **every draft the moment it's saved**. That orphans Stripe objects on
abandoned drafts (the exact thing v1.5 exists to prevent) and you won't notice until Stripe fills with
junk. Modifying the function does nothing to a Studio webhook.
*Fix:* Before Phase 1, establish and document that the trigger named on `products` INSERT is exactly
`notify_stripe_sync()` from `20260421000003` and that **no separate Studio Database Webhook** points at
`products` INSERT. If one exists, disable it (or fold its logic into the guarded function). State in
Phase 1 that this is verified, not assumed.

**2. `notify_stripe_sync()` is replaced wholesale from a two-fragment quote; trigger event scope
unconfirmed.**
*Location:* Phase 1; Pre-flight anchor (line 254 quotes only `IF NEW.is_test = true THEN RETURN NEW;`
and `body := payload::text`).
*Gap:* The plan issues `CREATE OR REPLACE FUNCTION notify_stripe_sync()` with a full body it
*reconstructed*, having quoted only two fragments of the live function. Any other logic in the real
function (auth headers, UPDATE handling, a different payload shape, error handling) is silently
dropped. Separately, the guard assumes the trigger is **INSERT-only**: if it's actually
`INSERT OR UPDATE`, the publish step's `is_published=true` UPDATE will fire it and double-create Stripe
(inline sync in `handlePublish` *and* the trigger).
*Fix:* Quote the **entire** current `notify_stripe_sync()` body (and its `CREATE TRIGGER` statement)
from `20260421000003` as the CURRENT anchor; show NEW as that body + the one added guard line. Confirm
in the doc that the trigger fires on INSERT only.

**3. New RLS gates `is_published` only — `is_test` isolation for the public anon path is unaddressed.**
*Location:* Phase 1 (RLS policy); Pre-flight "Sweep already cleared" ("the new RLS policy hides drafts
from them automatically"); landmines #2 and #5; STORE `idx_products_live WHERE is_test = false`,
main.js anon reads.
*Gap:* The public site reads products through the **anon Supabase client in `main.js`** (`getProducts`,
`getProductBySlug`), not the API. The new policy is `USING (is_published = true)` — no `is_test`
clause. Two consequences the plan doesn't resolve, and they conflict:
- Test #3 requires the **dev preview** to show a freshly-published *test* product (`is_test=true`) via
  the anon client → the policy must allow published rows regardless of `is_test` (it does).
- But then the **production** anon client, same shared project, same publishable key, will read those
  same `is_test=true, is_published=true` rows and **display test products on the live shop** — unless
  `main.js` independently filters `is_test`. The anon client can't know its environment from a static
  key, so that filter (if it exists) must be config-driven, and the plan neither shows it nor accounts
  for it. The plan's claim that RLS "hides drafts automatically" quietly assumes `is_test` is handled
  elsewhere without saying where.
*Fix:* Document the exact `is_test` isolation mechanism for the anon read path (does `main.js` filter
`is_test` from `/api/config`? does it rely on no test data existing in prod?). Confirm the new policy
neither (a) leaks published test products to prod nor (b) blocks the dev preview from rendering a
published test product's live page. If the anon path relied on the old `USING (true)` policy plus
nothing, this is a pre-existing leak that v1.5 makes concrete by letting test products be "published."

**4. Phase 7 replaces the `product.js` page handler wholesale; it calls ~17 functions whose existence
and exact names are never shown.**
*Location:* Phase 7 (CURRENT 7–39 is *described* ("the whole DOMContentLoaded handler"), not quoted).
*Gap:* The NEW handler calls `revealNotFound, waitForSupabase, getProductBySlug, populateMeta,
populateOpenGraph, injectProductJsonLd, populateStickyCard, populateHero, populateGallery,
populateStory, populateMedia, populateFeatures, wireCartButtons, wireProductInterestForm,
wireContemplationOfferSuccess, fireViewItem, renderRelatedProducts`. Only `populateMedia` is added by
the plan; the other 16 are assumed to already exist in `product.js` with these exact names. If the
current handler uses even one different name (`renderRelated` vs `renderRelatedProducts`, `loadProduct`
vs `getProductBySlug`, no `populateOpenGraph`/`injectProductJsonLd`), the replacement ships
ReferenceErrors and the product page goes blank. This is the textbook self-containment defect — the
builder *must* open the file to know whether the replacement is even valid, and the anti-fragility rule
has no CURRENT anchor to catch a mismatch.
*Fix:* Quote the current handler (7–39) in full as the CURRENT block, so every called name is verified
present. If any name differs, reconcile in the NEW block.

### MAJOR — a capability is missing, broken, or clunky enough that DIY wins

**5. Media rendering silently no-ops without the Phase 3.3 (design) HTML; functionality and design are
split but coupled.**
*Location:* Phase 7 `populateMedia` (`querySelector('[data-product-media]'); if (!container) return;`)
depends on Phase 3.3, which is in **Part 3 (design)** — explicitly a separable/later slice.
*Gap:* The `[data-product-media]` container is introduced only by the Phase 3.3 edit that replaces the
static media block. A "functionality first" build (Phases 1–11, deferring Part 3) ships the `media`
action that the GPT/admin can set with no error — but **nothing renders**, and Phase 11 test #9 ("the
page renders the video") cannot pass. The plan treats §3.3 as deferrable and Phase 7 as shippable;
they aren't independent.
*Fix:* Move the container creation into Phase 7 (functionality), or mark §3.3's HTML swap a hard
dependency of Phase 7 and the media test, and sequence them together.

**6. The MP4 upload path the GPT is told to use isn't shown to exist.**
*Location:* Phase 9.2 MEDIA section instructs the GPT to "upload the MP4 with uploadImage (role
video-01..05, **skip_transform=true**)"; Phase 5 only edits `ROLE_PATTERN` + the image transform.
*Gap:* `api/upload.ts` runs a Cloudinary *image* transform (`c_fill,ar_…,f_webp`). An MP4 through that
pipeline breaks. The instructions assume a `skip_transform` parameter (and video passthrough to R2)
that the plan never establishes exists in `upload.ts`. If it doesn't, the entire media capability has
no working upload step — the GPT will confidently tell Em to do something that fails.
*Fix:* Show that `upload.ts` supports `skip_transform`/video passthrough (quote the branch), or add it
in Phase 5. Don't reference a parameter the plan hasn't built.

**7. Orders are claimed as GPT capabilities (§1.10) but never wired into the GPT in Phase 9.**
*Location:* §1.10 ("Orders: `listOrders`; `markShipped` (emails the buyer; confirm first)"); Phase 9.1
schema edits add products/coupons only — **no `listOrders`/`markShipped` operations**; Phase 9.2 has
no ORDERS instruction block.
*Gap:* `orders.ts` GET/PATCH exist as endpoints (v1.4.9 fulfillment), but being an endpoint ≠ being a
GPT Action. The plan never adds them to the GPT schema or instructions, so the doc does not deliver the
"check and ship orders by chat" capability §1.10 advertises. "Fully run the store by chat" is
incomplete for the order side, and the "confirm before emailing the buyer" rule is unwritten.
*Fix:* Either confirm `listOrders`/`markShipped` are already in the GPT schema pre-v1.5 (and cite
where), or add them in Phase 9 with the confirm-first instruction. State which.

**8. Coupon list/deactivate doesn't separate Em's sales from the v1.4 system-generated single-use
codes.**
*Location:* Phase 3.5 `handleCouponList` (`promotionCodes.list({ active: true })`),
`handleCouponDeactivate`; collides with STORE #21/#31 (cart-recovery + newsletter codes are also active
promotion codes, `max_redemptions:1`).
*Gap:* `listCoupons` returns every active promotion code — so Em's intentional sale codes are buried
among auto-generated cart-recovery/newsletter-welcome codes, and `deactivateCoupon` can kill a system
code by mistake. The plan designed the coupon feature without reconciling it against the existing
promo-code machinery.
*Fix:* Tag Em's GPT-created coupons (e.g., `metadata.source: 'owner_sale'`) and filter
`listCoupons`/`deactivateCoupon` to those, or exclude single-use (`max_redemptions === 1`) codes from
the owner-facing list.

**9. No chat path to fix a draft's price (or checkout fields) before first publish.**
*Location:* Phase 9.1 `editProduct` schema (lists page+SEO fields only — **no `price`/`checkout_*`**);
Phase 3.4 PUT *unpublished* branch *does* accept them.
*Gap:* The API allows price/checkout edits on an unpublished draft, but the GPT's `editProduct` schema
omits those fields, so the GPT literally can't send them. After `createProduct`, if Em says "actually
make it $250," the GPT has no move except create-a-new-product (re-uploading 7 photos) — for a draft
that was never even live. That's precisely the "clunky enough that DIY wins" failure for a trivial fix.
*Fix:* Add `price`, `checkout_name`, `checkout_description`, `checkout_image` to the `editProduct`
schema. The handler already rejects them on *published* rows (`FROZEN_AFTER_PUBLISH` → 400), so
exposing them is safe and the GPT instruction can say "editable until published."

**10. Price-change-by-new-product strands the old product; no retire/delete/discard by chat.**
*Location:* §1.3, §1.10, Phase 9.2 ("to change price, make a NEW product"). No GPT delete/discard
action exists (admin has Delete; GPT does not).
*Gap:* When Em changes a price by creating a new product, the **old product stays live and purchasable
at the old price** — two versions of one piece. The GPT isn't instructed to take the old one down, and
has no `deleteProduct`/discard action to remove a mistaken or superseded draft. "Fully run by chat"
leaves a foot-gun and no cleanup tool.
*Fix:* Add GPT guidance: after creating the replacement, offer to set the old product `available:false`
(stage→publish). Decide explicitly whether a GPT discard-draft / delete action is in scope; if
deliberately omitted, say so in §1.10.

**11. Phase 10 is "additive" and leaves the architecture doc internally contradictory on Stripe sync.**
*Location:* Phase 10 (additive edits only) vs. STORE Data-Flow "Product Creation" diagram (lines
605–624), AR #8, AR #35, Pitfalls #6/#7, "Stripe Sync Rules" (356–367), Key Decision #8.
*Gap:* v1.5 inverts the sync model: INSERT no longer creates Stripe (drafts skip it; Stripe is created
only at publish), and the PUT price-rotation is **removed** (plan's own note, line 1021). But Phase 10
only *adds* columns and a subsection — it doesn't retract the now-false sections. The next instance's
primer will say both "INSERT → webhook → Stripe → LIVE" and "INSERT → draft → no Stripe." Phase 9
explicitly repairs the GPT docs' "mixed truth"; Phase 10 must do the same housekeeping for the STORE
doc.
*Fix:* In Phase 10, rewrite (not append to) the Data-Flow creation diagram, AR #8/#35, Pitfalls #6/#7,
the Stripe Sync Rules, and Key Decision #8 to the publish-time-sync model; note the PUT price-rotation
is gone.

**12. `STORE_ADMINISTRATION.md` (Em's how-to) isn't updated at all.**
*Location:* Plan updates GPT docs (Phase 9) and the architecture doc (Phase 10); STORE
`STORE_ADMINISTRATION.md` is "the client's plain how-to" and is untouched.
*Gap:* The single document written to teach a non-technical owner how to run the store still describes
the pre-v1.5 world (no draft/preview/publish, no chat editing, no coupons-by-chat). For a version whose
whole thesis is "she runs it by chat," her reference doc must match.
*Fix:* Add a Phase to refresh `STORE_ADMINISTRATION.md` for create→preview→publish, editing by chat,
coupons (create/list/end), and status meanings.

**13. `listProducts` / `getProduct` response envelopes aren't verified against the declared GPT schema.**
*Location:* Phase 9.1 declares `listProducts` → `{ products: array }` and `getProduct` → "the product
(full row)"; the existing GET list/slug return shapes (38–94) are not quoted.
*Gap:* If the existing authorized GET returns a **bare array** (or `{ data }`) for the list, or a bare
row vs `{ product }` for slug, the GPT's declared schema is wrong and the model mis-reads the result.
The plan asserts "GET already returns full rows (`select('*')`)" but never the envelope.
*Fix:* Quote the GET list-return and slug-return lines (86–94 and the 50–80 region); make the declared
schemas match exactly.

**14. Publish correctness silently depends on `syncProductToStripe` persisting Stripe IDs to the row.**
*Location:* Phase 3.5 `handlePublish` first-publish (its own UPDATE sets only
`is_published/published_at/draft/preview_token` — **not** `stripe_product_id/stripe_price_id`); Phase 2
shows only the `products.create` mapping, not Price creation or write-back.
*Gap:* If `syncProductToStripe` only *returns* IDs (rather than writing them to the row), a published
product ends up with no `stripe_price_id` → `checkout.ts` can't build a line item → it's live but
unbuyable. Recovery from a partial publish (Stripe created, DB flip fails) also relies on the helper
being idempotent on a fresh read. Both are stated in the STORE doc but not re-established for the new
publish path, and Phase 2 doesn't show the Price step.
*Fix:* In Phase 2/3.5, quote enough of `syncProductToStripe` to confirm it (a) creates the Price from
`price`, (b) writes both IDs back to the row, (c) short-circuits when `stripe_product_id` is already
set. State the partial-publish recovery is a safe retry because of (c).

### MINOR — correctness, hygiene, polish

**15. GPT isn't taught to read the `draft` overlay.**
*Location:* Phase 9; `getProduct`/`listProducts` return live columns + a separate `draft` jsonb.
*Gap:* When a row has a staged `draft`, the GPT sees live values + a `draft` delta. Nothing tells it
that `draft` = pending-not-live, so it may report stale live copy as "current" or get confused about
what's pending. Borderline-major for GPT quality.
*Fix:* Add one knowledge line: "a row may carry a `draft` object = edits previewed but not yet live;
the top-level columns are what shoppers see now."

**16. §1.1 taxonomy contradiction on `homepage_theme`.**
*Location:* §1.1 lists `homepage_theme` under "System-filled (never set by GPT or owner)"; Phase 3.4
puts it in `DRAFTABLE`; Phase 8.10 makes it admin-editable.
*Fix:* Reclassify it as owner/admin-editable-but-not-GPT (or remove from DRAFTABLE). Pick one.

**17. `product-feed.ts` client type asserted, not shown.**
*Location:* Pre-flight "Sweep already cleared" claims product-feed reads via the anon/publishable
client (so RLS hides drafts).
*Gap:* If it actually uses the service-role client, RLS is bypassed and **drafts leak into the Meta
Commerce CSV** → Instagram Shopping.
*Fix:* Confirm (quote the client init in `product-feed.ts`); if service-role, add an explicit
`is_published = true` filter.

**18. Backfill hides any live-but-priceless product.**
*Location:* Phase 1 backfill (`WHERE stripe_price_id IS NOT NULL`).
*Gap:* A currently-visible product lacking `stripe_price_id` becomes `is_published=false` and vanishes
from the shop. Low risk (site is pre-launch), but worth a one-line acknowledgement.
*Fix:* Note expected affected rows = 0 in prod; verify on the dev preview.

**19. `DROP POLICY` is not idempotent.**
*Location:* Phase 1 (`DROP POLICY "Products are publicly readable" ON products;`).
*Fix:* Use `DROP POLICY IF EXISTS` so a partial re-run doesn't hard-fail; the exact name is already an
anti-fragility anchor.

**20. Preview API response returns the full internal row to a token holder.**
*Location:* Phase 3.2 preview branch returns `merged` (`select('*')` incl. `sku`, `stripe_*`,
`is_test`, `preview_token`).
*Gap:* The token holder ≈ Em, so low risk, but internal fields (incl. the token itself) ship to the
browser.
*Fix:* Optional — project a whitelist of page fields for the preview response.

**21. Preview banner references design tokens not in the system.**
*Location:* Phase 7 `mountPreviewBanner` uses `--accent-primary`, `--accent-gold`, `--text-inverse`,
`--text-primary`; the design system defines `--color-plum/-gold/...`.
*Gap:* Cosmetic only — hardcoded fallbacks render correct brand colors regardless.
*Fix:* Use the real tokens (`--color-plum`, `--color-gold`, `--color-cream`, `--color-ink`) or accept
the fallbacks intentionally.

**22. No essentials re-check at publish if an edit stripped them.**
*Location:* `handlePublish` validates checkout essentials on *first* publish only; the 7-photo /
image-role rule is enforced only at create.
*Gap:* An edit can set `images` to a thin set (draftable) and publish with <7 photos / no hero.
*Fix:* Low priority; optionally re-run the image-role guard on the merged values at publish.

---

## If you fix one thing

**Prove that the patched `notify_stripe_sync()` trigger is the *only* thing that creates Stripe objects
on a `products` INSERT** (finding #1, with #2). The entire version is built on one premise: a draft is
inert until Em publishes. If a Supabase Studio Database Webhook — which the architecture doc explicitly
describes — is still independently pointed at `products` INSERT, then every draft mints a Stripe product
the instant it's saved, the `is_published=false` guard in the function is bypassed, and the
draft→preview→publish safety model is silently null on day one. It's silent because nothing errors;
you'd only discover it when Stripe is full of orphaned products from abandoned drafts. Patching the
function is necessary but not sufficient — the plan must verify the *count* of INSERT-side Stripe paths
is exactly one, and that it's the one being patched. This is also the sharpest case of the review's
recurring defect: load-bearing edits anchored to artifacts the plan never quotes (the trigger body, the
`product.js` handler, the `main.js` anon read). Close that class and the build gets dramatically safer.

---

## Verdict

**NEEDS ANOTHER PASS** — four blockers (three of them silent-invariant breakers anchored to unquoted
live artifacts) plus capability gaps in media upload, orders-by-chat, coupon management, and
pre-publish price edits. Fold fixes → bump to `v1_5_2` → re-run A before B/C.
