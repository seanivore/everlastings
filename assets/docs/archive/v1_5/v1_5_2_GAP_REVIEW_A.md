# v1_5_2_GAP_REVIEW_A — Angle A (cold / out-of-repo)

**Reviewed:** `v1_5_2_IMPLEMENT.md` against `EVERLASTINGS_STORE.md`. No repo.
**Method:** self-containment (every place the builder must open a file, recall a library, or decide
something the plan didn't) + completeness/architecture (can Em fully run the store by chat; do the
state machine, Stripe-lock, archive, `is_test`, function-cap, and GPT-UX hold up).
**Verdict:** **NEEDS ANOTHER PASS.** One unconditional blocker, one silent-security risk, and three
public-data / unverified-symbol gaps. The draft→publish core logic is sound; the breakage is at the
**admin surface, the Meta feed, and a handful of unquoted anchors** — exactly the seams a cold reviewer
is meant to catch.

---

**Verdict: NEEDS ANOTHER PASS.** The draft→publish core logic is sound — but the build breaks at the admin surface, the Meta feed, and a few unquoted anchors.

**The one blocker to fix first (G1):** admin edits of any *published* product will 400 on every save. `buildProductPayload` (Phase 8.5) always emits `price` + `checkout_*`, and the frozen-field guard (Phase 3.4) rejects on field **presence**, not on change. The GPT path survives only because it's told to send "only the fields she's changing"; the admin path sends everything → always rejected. And **no Phase 11 step exercises an admin-initiated edit of a live product**, so it ships silently broken — directly defeating §1.6's "one safety path everywhere." Fix: reject a frozen field only when `updates[f] !== current[f]`.

The other items that make it a re-run, ranked:

- **G2 (silent security):** the RLS swap drops the old policy by *name* and creates the new one under a *different* name. If the legacy name is even slightly off, `DROP IF EXISTS` no-ops and the old `USING(true)` policy survives alongside the new one — Postgres ORs them, so **everything becomes publicly readable** (drafts, archived, test) and the migration still reports success. Make it self-checking instead of trusting the name.
- **G3:** `authHeader()` is called by the admin publish/archive code but never quoted — if the real helper has a different name, both throw at runtime.
- **G4:** `is_test` is filtered only in `main.js`, but `product-feed.ts` reads server-side via RLS (which doesn't filter `is_test`), so the production **Meta/Instagram catalog leaks published test rows**.
- **G5:** the same filter was only added to two `main.js` functions — if `shop.js`/`homepage.js`/related-rail read `products` directly, test products leak into the production shop too.

Plus medium self-containment gaps (G6 a possible `Stripe` import collision, G7 the one media-block edit that's described not quoted) and lower polish items, all in the file with exact location + concrete fix.

The capability set itself is complete — Em can run the store by chat, and the GPT is helpful rather than clunky. The failures are about *where* the filter is applied and *how strictly* the lock is checked, not the model.

---

## Fix-one-thing

**G1 — admin edits of any *published* product will 400 on every save.** The plan tests the GPT edit
path (which sends only-changed fields) but never tests an admin-initiated edit of a live product, and
`buildProductPayload` unconditionally emits `price` + `checkout_*`. The frozen-field guard rejects on
field *presence*, not on change → the unified admin path (§1.6's whole point — "one safety path
everywhere, matters once Em is on her own") is dead on arrival, and Phase 11 won't catch it. Fixing the
guard to reject only on *changed* frozen values repairs the admin path and makes the Stripe-lock
behave the way §1.3/§1.10 describe.

---

## Ranked gaps

### BLOCKERS / HIGH — will derail the build or break a v1.5 promise

**G1 · Admin published-edit always returns 400 (frozen-field over-block).**
*Location:* Phase 3.4 PUT (published branch, `FROZEN_AFTER_PUBLISH.filter(... hasOwnProperty ...)`,
lines ~927–936) **×** Phase 8.5 (`buildProductPayload` always adds `checkout_name/description/image`)
**+** the pre-existing `price` in that payload.
*What's wrong:* The guard trips on field **presence**. `buildProductPayload` sends `price` and all
three `checkout_*` keys on every save (blank → `null`, and `JSON.stringify` keeps `null` keys), so
`updates.hasOwnProperty('checkout_name')` is always true → `frozenAttempt` is always non-empty → 400
"Frozen after publish" for *every* edit of a live product from the admin panel. The GPT path escapes
only because §9.2 tells it to send "only the fields she's changing." §1.6 ("admin create/edit go
through the same draft → preview → publish path") is therefore unmet, and **no Phase 11 step exercises
an admin-initiated edit of a published product**, so it ships silently broken.
*Fix:* Reject a frozen field only when it actually **changes**:
`FROZEN_AFTER_PUBLISH.filter(f => Object.prototype.hasOwnProperty.call(updates,f) && updates[f] !== current[f])`.
(Equivalent alternatives: have the admin strip frozen keys when `editing.is_published`, or have the PUT
`pick(DRAFTABLE)` and *silently ignore* frozen keys on a published row.) Add a Phase 11 step: "admin
edits the copy of a **published** product → stages a draft (no 400), preview shows it, publish applies."

**G2 · RLS swap can silently leave the public site wide open.**
*Location:* Phase 1 migration — `DROP POLICY IF EXISTS "Products are publicly readable"` then
`CREATE POLICY "Published products are publicly readable" …` (lines 429–432); pre-flight anchor (312).
*What's wrong:* The drop is keyed to the **exact legacy policy name** and the new policy uses a
**different** name. Postgres combines permissive SELECT policies with **OR**. If the live name differs
by even a word/case, `DROP IF EXISTS` no-ops *without error*, the old `USING (true)` policy survives
**alongside** the new one, and `true OR (published AND active)` → **every row publicly readable** —
drafts, archived, and `is_test=true` included. That nullifies the entire v1.5 safety model (and the
preview-token premise) and the migration reports success. The plan's only guard is a "verify the name"
note — a human step, easy to skip, protecting a silent failure.
*Fix:* Make the migration self-checking instead of trusting the name. Either (a) drop **all** existing
SELECT policies on `products` (enumerate from `pg_policies` in a `DO` block), then create the one
restrictive policy; or (b) after creating it, run a guard query that **raises** if any remaining
`products` SELECT policy has `qual = 'true'`. Re-using the *same* policy name as the legacy one (so the
DROP is guaranteed to hit) is the cheapest robust option.

**G3 · `authHeader()` in admin.js is assumed, never quoted.**
*Location:* Phase 8.9 `publishProduct` and Phase 8.11 `onArchiveToggle` both call
`{ ...authHeader(), 'Content-Type': 'application/json' }`; notes at 1865 and 1987 assert it exists.
*What's wrong:* The function it replaces (`onDeleteProduct`) authenticated via the **Supabase client**
(`state.client.from('products').delete()`), *not* a `fetch`+`authHeader`. The pre-flight admin.js
anchors (331–333) list `renderProductList`, `openEditor`, `buildProductPayload`, `onSaveProduct`,
`onDeleteProduct` — **not** `authHeader`. If the existing API-auth helper has a different name/shape
(e.g. inline `Authorization: Bearer ${session.access_token}` inside `onSaveProduct`), publish + archive
from the admin panel throw `authHeader is not defined` at runtime. (It almost certainly *exists* in some
form, since `onSaveProduct` must send an auth header to hit `/api/products` — but the doc bills itself
"exclusively executable," and this is an unquoted symbol the builder must go find.)
*Fix:* Quote `onSaveProduct`'s actual auth-header construction in the pre-flight and reuse the exact
symbol in 8.9/8.11.

**G4 · Production Meta product-feed leaks test products.**
*Location:* §1.11 / Phase 4.5 patch **only** `main.js`; pre-flight note (351–352) says
`api/product-feed.ts` is on the anon/publishable client so "RLS hides drafts + archived" — and stops
there.
*What's wrong:* RLS hides drafts/archived but **does not filter `is_test`** (by design — `is_test` is a
`main.js` filter, not RLS). The dev-preview publish test (Phase 11 #3) creates a *published*
`is_test=true` row in the **shared** Supabase project. `product-feed.ts` runs server-side on the
publishable key in the **production** env, reads via RLS, and will therefore emit that published test
row into the **Meta Commerce / Instagram Shopping** catalog. §1.11's guarantee ("production never shows
test data") has a hole on the one public read path `main.js` can't cover.
*Fix:* Add an `is_test` filter to `product-feed.ts` (it knows `VERCEL_ENV` → `isTest`):
`.eq('is_test', false)` in prod (or `.eq('is_test', isTest)` to mirror the deployment). Add a Phase 11
check: "production `/api/product-feed` excludes the test row."

**G5 · `is_test` filter added only to `main.js`; other public reads unverified.**
*Location:* Phase 4.5b patches `getProductBySlug` (57) and `getProducts` (69) only; §1.11 asserts those
are "the public anon reads."
*What's wrong:* The architecture doc describes `shop.js` ("fetches all products"), `homepage.js`
("fetches featured products"), and `product.js > renderRelatedProducts` as their own controllers. If
**any** of them issues its own `supabase.from('products').select()` rather than routing through
`getProducts`/`getProductBySlug`, it bypasses the new `is_test` filter and **production's shop /
homepage / related-rail can surface published test products** (drafts/archived are still safe via RLS;
only the `is_test` dimension leaks — which is precisely the §1.11 hazard). The plan never shows that
these three callers funnel through the two patched functions.
*Fix:* Quote the data-fetch lines of `shop.js`, `homepage.js`, and `renderRelatedProducts` to prove
they call `getProducts`/`getProductBySlug`. If any reads `products` directly, add the same
`.eq('is_test', window._isTest === true)` filter there.

### MEDIUM — self-containment / unverified-against-repo

**G6 · `import type Stripe from 'stripe'` may collide with an existing value import.**
*Location:* Phase 3.1 adds `import type Stripe from 'stripe'`; the CURRENT block quotes only line 1
(`import { createClient } …`).
*What's wrong:* The old PUT used `stripe.prices.update/create`, so a `stripe` **instance** already
exists in `products.ts`. If that instance comes from `import Stripe from 'stripe'; const stripe = new
Stripe(...)`, then adding `import type Stripe from 'stripe'` is a **duplicate `Stripe` identifier**
(tsc fails). If instead `products.ts` imports a shared instance (`import { stripe } from './_lib/…'`)
and never imported the `Stripe` type, the new line is correct. The doc doesn't quote the import header,
so the builder can't tell — and the `tsc --noEmit` gate would catch it only *after* the edit.
*Fix:* Quote `products.ts`'s full import block (lines 1–~10) including where the `stripe` instance and
any `Stripe` type come from, so the new import is provably non-duplicate.

**G7 · The one functionality-critical HTML edit (Phase 7.2) is described, not string-anchored.**
*Location:* Phase 7.2 — "Replace the static `.product-gallery__media` block (the placeholder video +
GIF + Rickroll iframe, `product.html` ~235–258)."
*What's wrong:* Every code edit in Phases 1–8 quotes a CURRENT block per the doc's own anti-fragility
rule — **except this one**, which gives a prose description + a line range and asks the builder to
identify the block's boundaries (where does "the static block" start/end? which exact `<img>`/`<iframe>`
to drop?). This is the single edit that makes Phase 11 #9 (media) pass, so it's not optional. A cold
builder must open the file and *decide*.
*Fix:* Quote the verbatim CURRENT `.product-gallery__media` block (the placeholder `<video>`, GIF
`<img>`, and Rickroll `<iframe>`) so the swap is locate-and-replace, not locate-and-judge.

**G8 · Supabase-Studio entry method changed semantics without operator guidance.**
*Location:* Phase 1 (create defaults `is_published=false`) vs. STORE doc data-flow (Studio insert →
trigger → Stripe → live, lines 605–624, 738); Phase 10 rewrites the doc but not the operating note.
*What's wrong:* A row inserted via **Supabase Studio** now defaults to `is_published=false` → trigger
skips → **no Stripe, ever**, and no obvious publish path except loading it in admin and clicking
Publish. Conversely, a Studio editor who hand-sets `is_published=true` fires the trigger →
`stripe-sync.ts` creates Stripe **bypassing `handlePublish`** (no checkout-field validation, no
`published_at`). Studio is a first-class entry method in the architecture doc; neither new behaviour is
called out for the operator.
*Fix:* In Phase 10/10b add: "Studio-created products are drafts — publish them from the admin panel;
do **not** hand-set `is_published` in Studio." Optionally have `handlePublish` be the only writer of
`published_at` so a trigger-published row is detectable.

**G9 · No clean way to re-surface a lost preview link.**
*Location:* §1.4 / §1.10 / Phase 9.2 — preview URL is returned only by create/edit.
*What's wrong:* If Em closes the chat (or the link is stale), "show me the preview of X again" has no
dedicated action. `getProduct` returns the row *including* `preview_token`, and `editProduct` with no
changed fields rotates the token and returns a fresh `preview_url` — but the GPT is told neither the
URL pattern (`/product/{slug}?preview={token}`) nor that a no-op edit re-issues it. A non-technical
owner hits a dead end on a routine ask.
*Fix:* Either add one line to §9.2 ("to re-show a preview, call `editProduct` with no changes — it
returns a fresh `preview_url`"), or document the preview-URL shape in the GPT knowledge so it can build
it from `getProduct`'s `preview_token`.

**G10 · Phases 9 / 10 / 10b are descriptive, not quoted — counter to "exclusively executable."**
*Location:* Phase 9 (GPT_SETUP.md / product-reference.md edits), Phase 10 (STORE doc rewrites), Phase
10b (STORE_ADMINISTRATION.md).
*What's wrong:* These lean on line hints + prose ("drop the `sync=true` language (167, 171–175)", "add
to the `createProduct` request schema", "rewrite AR #8 / #35"). For doc files that's tolerable, but the
builder must open each file and interpret boundaries — the same class of risk G7 is, spread across the
brand-critical GPT surface (§1.7 says this surface decides whether the GPT beats DIY). The
`createProduct` schema block (167–213) in particular is edited but never quoted.
*Fix:* Quote at least the `createProduct` schema block and the `GPT_SETUP.md` Instructions section
being rewritten; treat the rest of 9/10/10b as explicitly "doc-edit, in-repo, interpret-with-care" so
B/fidelity knows these aren't byte-anchored.

**G11 · `vercel.json` rewrite shadowing unverified.**
*Location:* Phase 6 appends `/api/products/publish`, `/api/products/archive`, `/api/products/unarchive`,
`/api/products/by-slug/:slug` after the `/api/orders/:id` line; the full `rewrites` array isn't quoted.
*What's wrong:* If a pre-existing rewrite like `/api/products/:id` sits **above** the new literals,
Vercel (first-match) routes `/api/products/publish` into the param rule instead of the `_action`
dispatch. The plan shows only the orders anchor line.
*Fix:* Quote the whole `rewrites` array (or confirm no `/api/products/:x` param rewrite precedes the
new entries). Order the literals before any param routes.

### LOW — polish / clunk / verify-the-library

**G12 · Confirm-vs-expedite rule isn't in the authored instructions.** §1.2 states it; the Phase 9.2
Instructions block doesn't define *when* to expedite vs. confirm, yet Phase 11 #10 tests it. Add the
trigger sentence to the Instructions.

**G13 · Preview page shows a working-looking Add-to-Cart on a non-purchasable draft.** Phase 7 wires
`wireCartButtons` + `fireViewItem` on the preview; checkout's new guard (Phase 4) catches it, but Em can
add a draft to cart and get a confusing failure, and analytics fire on preview loads. Optional: in
preview mode, disable cart buttons and skip `fireViewItem`.

**G14 · Photo remove/reorder is array-reconstruction; R2 orphans on removal.** §1.10 has `uploadImage`
but no "remove/reorder photo" affordance — the GPT must `getProduct`, mutate `images`, and resend the
full array. Workable, mildly clunky; R2 objects for removed photos persist (harmless). Note it as a known
limitation, not a v1 blocker.

**G15 · `listCoupons` relies on Stripe expanding `coupon` on `promotionCodes.list`.** The
owner-sale filter reads `pc.coupon?.metadata?.source`. Stripe does return the coupon nested on each
promotion code, so this is correct — but it's the kind of library-behaviour assumption the landmine list
says to verify, and the plan doesn't state it. One-line confirmation (or the suggested subagent check)
closes it.

**G16 · Manual "mark sold" via GPT now needs a publish step.** PUT `{available:false}` on a published
product stages a draft (per §9.5) — it won't take effect until publish, unlike v1.4.9's immediate
behaviour. The auto-sold webhook still writes live columns directly, so purchases are unaffected; but a
manual takedown-by-availability is now two steps. Make sure §10b tells Em that, or steer "take it down"
to `archiveProduct` (which *is* immediate).

---

## Self-containment summary

The **state-machine code** (Phases 1–4: trigger guard, create-as-draft, PUT draft staging, publish,
archive, coupon, checkout guards, preview GET) is genuinely quoted and executable, and the
partial-publish recovery argument (Phase 2.3) holds — a re-published row short-circuits Stripe and still
flips live. The self-containment failures cluster at the **edges the builder must go look up**: the
`products.ts` import header (G6), the admin `authHeader()` (G3), the `product.html` media block (G7), the
full `vercel.json` array (G11), and the descriptive doc phases (G10). None of these is in a quoted
CURRENT block, so each is a place the cold builder discovers or decides.

## Completeness / architecture summary

Against §1.10, Em can create, find (`listProducts`/`getProduct`), edit, preview, publish, re-price
(new-product-then-archive), discount (create/list/deactivate, owner-tagged so system codes are safe —
this is correct and well-isolated), archive/resurface, set media, see status, and manage orders. The
capability set is **complete and not clunky** — the preview-link handoff is the right UX and the GPT is
helpful enough to beat DIY — **with two real holes and two clunk points**: published-edit is broken at
the admin surface (G1) and via the Meta feed the public/test boundary leaks (G4, and possibly G5);
re-showing a preview (G9) and confirm-vs-expedite (G12) are under-specified. The **Stripe-lock,
archive model, function-cap (11/12), preview-token capability, and `is_test` write-scoping** are all
architecturally sound as written — the failures are in *where the filter is applied* (feed/other reads)
and *how strictly the lock is checked* (presence vs. change), not in the model itself.

---

**One-line verdict: NEEDS ANOTHER PASS** — fix G1 (admin frozen-field over-block) and G2 (silent RLS
swap), close G3/G4/G5 (authHeader, feed leak, other public reads), quote G6/G7, then re-run A.
