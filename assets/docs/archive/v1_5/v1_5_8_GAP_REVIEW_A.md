# v1.5.8 — Gap Review A (8th cold / out-of-repo pass)

**Reviewer lens:** can Em run her ENTIRE store by chat, least-friction; does the plan execute without a fresh
builder having to discover or decide. Judged against the North Star + `EVERLASTINGS_STORE.md`, not doc-internal
consistency. No repo in hand — that's the point.

**Bottom line up front:** one real, load-bearing regression (a *data-loss* bug, not a phantom-draft annoyance),
introduced by the very 7th-A RANK 1 fix it follows; one GPT-path sibling of the same root cause; one minor
self-containment nit. **No architecture/North-Star gap — every §1.10 capability is still genuinely chat-drivable
by design.** Narrow, but the RANK 1 is destructive enough to gate the build.

---

Verdict: NEEDS ANOTHER PASS (narrow). No architecture or North-Star gap — every §1.10 capability is genuinely chat-drivable, and all 28 landmines hold. But the 7th-A #26 fix introduced a real, untested data-loss regression.
RANK 1 — the one that matters. The value-level change-detect you added (PUT, 1142–1157) compares each draftable field against its effective (staged-or-live) value. But openEditor populates the admin form from the live columns and never overlays draft (confirmed by grep — only renderPublishPanel reads product.draft). So when a published piece already has a staged draft and the admin re-saves the full payload, every staged field (whose value ≠ live) gets re-staged with the live value at 1161 — silently wiping the staged copy/SEO edits. Reachable in normal use: the GPT can stage a draft on its own, then any admin save on that row eats it; #14 already treats "admin or GPT" staged state as expected; and Open Items (b)'s own "no-op Save draft to resurface the link" is the clobber. No test re-opens a staged piece in admin and re-saves, so a builder ships it green.
Fix: make openEditor populate the DRAFTABLE fields from the merged value ({...product, ...(product.draft||{})}, keeping price/available/quantity/checkout_* live), and have getProduct/listProducts expose an effective view so the GPT edits the staged state too — which also closes RANK 2 (the GPT losing a prior staged images/media edit because §9.2 tells it the top-level is live). Add the missing test. RANK 3 is a one-line nit: webhook.ts's Stripe type import is asserted, not anchored (4.7, line 1922) — as Stripe.Charge will fail tsc if the file only imports the instance.
One thing worth flagging on your side: the createProduct slug contradiction from the brief is resolved in this draft (schema slug required + GPT-derives + the "system handles slug" prose stripped). The only slug staleness left is EVERLASTINGS_STORE.md AR #7/#23, correctly queued for the Phase 10 rewrite.

---

## RANKED GAPS

### RANK 1 — Re-opening a published product that has a staged `draft` and saving in the admin SILENTLY REVERTS the staged copy/SEO edits (data loss). *(Regression created by the 7th-A #26 fix.)*

**Where:** `api/products.ts` PUT, published branch — the value-level change-detect at **§3.4 lines 1142–1157**
(`effectiveValue` + `draftable` filter) — interacting with `assets/js/admin.js` `openEditor`, which the plan edits
at **§8.6 (2537–2550)** and **§8.10 (2769–2776)** but **never overlays `draft`** when populating the form. Grep
confirms: every `openEditor` field assignment reads `product.*` (the LIVE columns); the only `product.draft` read
in admin is `renderPublishPanel`'s pill logic (2618), which never feeds the form.

**What's wrong (the mechanism, exact):**
1. `openEditor` populates the form from the **live columns** (`product.title`, `product.headline`, …) — it does
   *not* overlay `product.draft`. So when a published row already has a staged draft, the editor shows the **live**
   copy, not the staged copy. (This is also why the admin literally cannot see/edit her own pending edits.)
2. `buildProductPayload` re-sends the **full** payload (every `DRAFTABLE` field) on every save — the plan states
   this repeatedly (1046, 1109, 1131; §11 #5b).
3. The new change-detect (1146–1156) compares each draftable field's **incoming value** against its **effective**
   value — *effective = the staged draft value if present, else the live column* (1146–1149).
4. For any field that has a staged value ≠ live, the form sent the **live** value (step 1), and effective is the
   **staged** value → they differ → that field is re-staged **with the live value** → `rowUpdate.draft =
   {...existingDraft, ...draftable}` (1161) **overwrites the staged value with the live one.**

**Concrete repro:** publish a piece. GPT (or admin) stages `headline: "B"` (draft); live headline is still `"A"`.
Re-open that piece in the admin editor — the field shows `"A"`. Click **Save draft** (changing nothing, or changing
only availability). The PUT sees `updates.headline="A"`, `effective("headline")="B"`, re-stages `"A"`, and the
staged `"B"` is gone. The preview now shows the live page; the "edits pending" pill is still up but there's nothing
left in it. **Worse on the admin path because the full payload makes this happen for *every* staged field at once,
on any save, including a no-op save.**

**This is reachable and normal, not pathological:**
- §1.6 unifies admin + GPT on the **same row**; the GPT can stage a draft entirely on its own, then Sean/Em opens
  that piece in admin for any reason and saves → all GPT-staged edits vanish.
- §11 #14 explicitly stages "(admin **or** GPT)" then expects discard to work — so cross-surface staged state is a
  *supported, expected* condition.
- **The plan's own recommended workaround triggers it:** Open Items (b) (**line 3694**) says to do "a no-op 'Save
  draft' to resurface the link" on a reopened draft. On a published-with-staged-draft row, that no-op save *is* the
  clobber.

**Why the test suite misses it:** #5b stages a draft on a clean (no prior draft) product; #14 stages then discards;
#26 stages then publishes. **None re-opens a published-with-staged-draft product in the admin and re-saves to assert
the staged copy survives.** So a fresh builder ships it green.

**Concrete fix (the robust one):** make `openEditor` populate the **DRAFTABLE** form fields from the *effective*
(merged) value — `const eff = { ...product, ...(product.draft || {}) }`, then read `eff.headline`, `eff.story_card`,
etc. — while keeping `price` / `available` / `quantity` / `checkout_*` from the live columns (those never stage). Then
a full-payload re-save sends the staged values, the change-detect sees them equal to effective, nothing is
re-staged, and the existing draft is preserved; any genuine change still supersedes correctly. **Add a test:**
publish → stage a copy edit → re-open in admin → Save (no further change) → assert `draft` is byte-identical and the
preview still shows the staged copy.

*Cheaper partial mitigation (kills the silent clobber but still hides staged edits from the admin):* compare the
draftable keys against the **live** column (`current[k]`) instead of `effectiveValue(k)`. Then a re-sent live value
equals live → not staged → existing draft preserved; a genuinely different value still stages. This also still fixes
the #26 phantom-draft. But it leaves the deeper "admin can't see its own staged edits" UX, so prefer the
`openEditor` overlay (and it pairs with RANK 2's getProduct fix). **Either way, do not ship the current
effective-compare against a live-populated form.**

---

### RANK 2 — The GPT can't build on its own staged edits (same root cause, chat-path face): a second edit to a full-array field (`images`/`media`) before publishing the first **loses the earlier staged change**.

**Where:** `api/products.ts` GET authorized-slug return (**§3.2 lines 571–577**) returns the row with `draft` as a
*separate* field (live columns on top), and the GPT Instructions (**§9.2 line 3269**) tell it "the top-level fields
are what shoppers see right now … never report `draft` values as the live copy" and (line 3273) to send "the
COMPLETE desired `images` array." So the GPT builds the array from the **live** images, not the staged ones.

**What's wrong:** sparse field edits are fine (the `pick` only touches keys present in `updates`, so other staged
fields are preserved — verified). The break is the full-array case: stage an `images` edit (draft now holds the new
array), then *before publishing* ask to change images again. The GPT does `getProduct`, sees the **live** (old)
array on top, rebuilds "the complete desired array" from that — missing the staged change — and `editProduct`
re-stages it, dropping the first edit. Same for `media`. The GPT can't even *see* its own staged array to extend it.
This is a North-Star miss: "edit a piece's photos by chat across two turns before publishing" silently loses work.

**Concrete fix:** have the authorized `getProduct` (and `listProducts`) optionally return an **effective view** —
either a merged object or an explicit `effective` block alongside `draft` — and tell the GPT in §9.2 to edit
**from the effective values** (not the live top-level) when a `draft` is present. Pairs cleanly with RANK 1's
`openEditor` overlay (same idea: callers must edit the staged state, not the live state). Narrower than RANK 1
(only full-array fields, only re-editing the same field pre-publish), but it's the chat path, so it counts.

---

### RANK 3 — `webhook.ts` `Stripe` *type* import is asserted, not anchored (a "verify/discover" the exclusively-executable standard says to remove).

**Where:** Phase 4.7. The `charge.refunded` branch uses `event.data.object as Stripe.Charge` (line 1883) and the
note (**line 1922**) says *"`Stripe.Charge` is already covered by the imported `Stripe` types — no new import."*
Unlike `products.ts` (where §3.1 explicitly **adds** `import type Stripe from 'stripe'` and proves it's
non-colliding), `webhook.ts`'s import is **not quoted**. If `webhook.ts` imports only the instance (e.g.
`import { stripe } from './_lib/stripe'`) and never references the `Stripe` namespace today, then `Stripe.Charge`
is a **new** namespace reference and `tsc --noEmit` fails — a stop-and-reconcile a fresh builder shouldn't hit on an
"exclusively executable" plan.

**Concrete fix:** add a one-line preflight byte-anchor of `webhook.ts`'s current `… from 'stripe'` import (the file
already anchors the `webhook_events` claim and the no-op guard — add the import line beside them), **or** make
Phase 4.7 add `import type Stripe from 'stripe'` to `webhook.ts` guarded as "add if not already present." Trivial,
but it closes the last asserted-not-anchored dependency in the code phases.

---

## CAPABILITIES — chat-drivability check (the lens): all present, none undrivable by design

Walked §1.10 end-to-end against the handlers + the GPT schema/Instructions:

- create → draft + preview ✓ · find (`listProducts`/`getProduct`, incl. 404→list-by-title fallback) ✓ · edit
  (stage vs live) ✓ · preview (token capability + `product.js` preview mode) ✓ · publish (button + `publishProduct`)
  ✓ · re-price in place (rotation + failure ordering, test #19) ✓ · discard ✓ · coupons (create/list/deactivate,
  owner-isolated) ✓ · archive/resurface ✓ · **photos/media by link** (`uploadImage` JSON/URL intake + Drive
  normalizer + the literal phone taps in 10b) ✓ · orders (pre-existing) ✓ · status incl. **full-refund reflection**
  (`charge.refunded`) ✓.
- **No capability reads as covered-in-docs-but-undrivable.** The one structural limit (Action can't forward a pasted
  file → media by link) is honestly surfaced to Em in three places. The RANK 1/2 defects are *correctness* failures
  inside a present capability (staged-state handling), **not** missing capabilities.

## Landmines 7–28 — confirmed holding (not re-raised)

Spot-checked each against the quoted code; all hold as written: phantom-draft live-only PUT (#26, the value-level
change-detect — *correct in intent; its interaction with the live-populated admin form is RANK 1 above*),
edit-publish re-validation (#27, merged-row `validateProductRules`, test #26), first-publish re-validation (#22),
price-rotation order create→write→deactivate (#3, test #19), frozen-field change-only guard with price excluded (#7),
name-keyed RLS swap with the `qual='true'` RAISE guard (#8), discard auth-only no-token (#9), create allow-list +
DB-generated `sku` (#10), origin-correct `preview_url` (#11), `listCoupons` auto-paginate + product-scoped-needs-
published (#12), `uploadImage` URL intake after the auth gate (#13), `charge.refunded` full-only after the
idempotency claim (#14, #22), Studio INSERT-vs-UPDATE note (#15), live-only "nothing to publish" (#16), price+
available+quantity all live + change-detected (#17, #23), 404→list fallback (#18), refund-by-dashboard + web-search
+ browsing-ON config (#19), `ROLE_PATTERN` + checkout_image/seo_thumbnail (#20), **slug GPT-derived + required +
server-normalized** with the "system handles slug" prose removed from the createProduct schema and product-reference
(#21 — the createProduct slug contradiction the brief flagged is **resolved** here; the stale `EVERLASTINGS_STORE.md`
AR #7/#23 are scheduled for the Phase 10 rewrite, which is correctly labeled interpret-with-care), owner-sale
isolation byte-anchored to the three system call sites (#23), panel honesty over a preserved draft (#24), preview
Buy disabled anchored to the real `<button>` markup (#25), `pg_net` body stays `payload` (jsonb) anchored to
`…0502` (#28).

Architecture/state-machine stress (create vs edit; publish vs discard; partial-publish recovery; rotation failure;
`is_test` across new columns + `main.js`; 11/12 cap; archive; preview-token model) — **all sound.** The
concurrent-first-publish Stripe-dup race is correctly acknowledged + deferred to v1.1.

---

## THE ONE THING — if you fix only one

**Make the admin editor (and `getProduct`) edit the *staged* state, not the live state.** Concretely: `openEditor`
overlays `product.draft` onto the DRAFTABLE form fields (keep price/available/quantity/checkout_* live), and
`getProduct`/`listProducts` expose an effective/merged view for the GPT. That single change kills RANK 1 (the silent
revert of staged edits on any admin re-save — the worst defect here, because it *destroys* content rather than just
adding a spurious draft) **and** RANK 2 (the GPT losing a prior staged array edit). Without it, the v1.5 thesis —
"one safe draft→publish path shared by admin and the GPT" — quietly eats Em's work the moment the two surfaces touch
the same piece. Add the missing test (publish → stage copy → re-open in admin → save → staged copy must survive).

## VERDICT

**NEEDS ANOTHER PASS (narrow).** No architecture or North-Star gap; the store is fully chat-drivable by design and
landmines 7–28 hold. But RANK 1 is a real, reachable, untested *data-loss* regression on the unified edit path, and
RANK 2 is its chat-path sibling — both load-bearing for the "admin + GPT, one safe path" promise. Fix the
staged-state-vs-live-state handling (one localized `openEditor`/`getProduct` change), close the RANK 3 anchor, add
the re-open-and-save test, then this is ready.
