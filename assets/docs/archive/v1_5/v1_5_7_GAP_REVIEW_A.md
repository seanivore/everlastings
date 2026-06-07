# v1.5.7 — Gap Review A (7th pass, cold / out-of-repo)

**Reviewer lens:** North Star — can Em run her *entire* store by chat, least friction; a capability that reads as covered but can't actually be GPT-driven is a real gap. **Scope:** self-containment (can a fresh builder LOCATE+APPLY without DISCOVERing/DECIDing?) + completeness/architecture (does the plan let Em fully run the store by chat?). **Inputs:** `v1_5_7_IMPLEMENT.md` + `EVERLASTINGS_STORE.md`, no repo.

**Landmine status (7–25):** All hold in the runtime code and the GPT-facing docs **except #16**, which has an admin-path hole — see RANK 1. #17/#23 (price/available/quantity live-immediate) hold for the GPT path but the admin path diverges (RANK 1). #1–#6, #8–#15, #18–#25 verified consistent across the surfaces they touch. No architecture gap: every capability (create / find / edit / preview / publish / re-price-in-place / discard / coupon create-list-deactivate / archive-resurface / photos-by-link / orders / refund-reflection) is genuinely chat-drivable; the price-rotation failure ordering (create→DB→deactivate), the archive/publish-409 guard, and `is_test` isolation across all new actions + `main.js` are sound.

This pass is **NEEDS-ANOTHER-PASS but NARROW** — two code-correctness fixes, two anchoring confirmations, one verbatim-schema fill, two doc-primer reconciliations. No re-architecture.

---

Verdict: NEEDS ANOTHER PASS — narrow. No architecture gap. The store is fully chat-drivable end-to-end, and landmines #1–#15 and #17–#25 hold across the surfaces they touch. The remaining work is mechanical: 2 code-correctness fixes, 2 anchoring confirmations, 1 verbatim-schema fill, 2 primer reconciliations.
The two that actually bite:

RANK 1 — admin stages a phantom draft. The published-PUT change-detects the live scalars (price/available/quantity) but not the draftable copy fields. Admin's buildProductPayload re-sends the full payload every save, so marking a piece sold from the panel stages a no-op copy draft → "Preview… Publish/Discard" instead of "live now — nothing to publish." Breaks #16, fails Test #23 + #6 on the admin path. Plain !== won't fix it (jsonb/array = reference compare, always true) — needs JSON.stringify(updates[k]) !== JSON.stringify(current[k]) on the draftable pick.
RANK 2 — edit-publish doesn't re-validate (the one to fix). First-publish runs validateProductRules; the edit-publish branch applies {...draft} straight to the live columns with no validation. A staged draft that blanked story_card/images ships a malformed, purchasable product. And Test #25 only covers first-publish, so unlike RANK 1 it won't be caught at the gate — it ships silently. One validateProductRules(merged) call closes it.

The lower ranks are anchoring/doc hygiene: RANK 3 (preview-disable rides two unanchored selectors + unverified <button> assumption — if wrong, an edit-preview of a published product stays buyable at live price under the "not yet live" banner; checkout.ts won't catch it because the row is published), RANK 4 (upload.ts auth not anchored relative to the new server-side URL fetch — SSRF surface), RANK 5 (createProduct NEW schema is described, not quoted — the one block you flagged to keep locate-and-replace), RANK 6/7 (EVERLASTINGS_STORE.md AR #7/#23 + the system diagram still teach the old API-side naive-slug / INSERT→Stripe model; primer contradicts this version's headline fix). RANK 8 is latent — the product_type enum advertises printable/storybook but only miniature rules exist, so either resolves to a confusing 5-gallery error.
Confirmed sound, no findings: price-rotation failure ordering (create→DB→deactivate), archive + publish-409 guard, is_test across all new actions and main.js, coupon owner-sale byte-anchors, function cap 11/12, photo-by-link drivability, refund reflection.
Full ranked file with locations, root-cause, and fixes is above. Fold → bump → re-run A.

---

## Ranked findings

### RANK 1 — `available`/`quantity`-only edit via the **admin** stages a phantom copy draft → breaks Landmine #16 + Test #23 (and Test #6) on the admin path
**Location:** §3.4 PUT published branch (the `draftable = pick(DRAFTABLE.filter(k => k !== 'available' && k !== 'quantity'))` block, ~L1123–1133) interacting with §8.5 `buildProductPayload` and §8.9 `renderPublishPanel`; Landmine #16; Tests #6, #23.

**What's wrong (concrete):** The published branch change-detects the LIVE fields (`price`/`available`/`quantity` via `!==`) but **does not change-detect the draftable copy fields** — `draftable` includes *every* DRAFTABLE key merely *present* in `updates`. The admin's `buildProductPayload` re-sends the **full** payload on every save (title, description, headline, story_card, images, media, seo_*, etc.). So when Em marks a published piece sold from the admin (un-check Available → "Save draft"), the request carries the whole copy set → `hasDraftable === true` → a no-op copy draft is staged, `preview_token` rotates, and the PUT returns `preview_url`. `renderPublishPanel` then takes the `if (body.preview_url)` branch and shows **"Preview how it looks … publish when it looks right" + Publish + Discard** — *not* "Availability change is live now — nothing to publish" with no Publish button.

This **directly contradicts Landmine #16** ("Admin live-only edit shows '<X> change is live now — nothing to publish' and no Publish button") and **fails Test #23** as written ("(GPT *or admin*) … no draft staged … admin shows 'Availability change is live now — nothing to publish' with **no** Publish button"). The "nothing to publish / no Publish button" outcome is reachable **only** for a minimal-payload caller (the GPT sends `{available:false}` alone) — never for the admin. Same root falsifies Test #6's "no draft staged for a price-only change" on the admin path, and undermines §1.6's "one safety path everywhere" thesis (the admin diverges from the GPT for exactly the live-immediate fields the design went out of its way to make live).

**Why the obvious fix doesn't work, and the one that does:** You can't just add `!==` to the `pick(DRAFTABLE…)`, because DRAFTABLE is mostly **jsonb/array** (`images`, `media`, `features`, `materials`, `care_instructions`, `shipping_details`, `homepage_theme`). `updates.images !== current.images` is a reference compare → always `true` → would still always-stage. **Fix:** value-level change-detection on the draftable pick — stage a key only when `JSON.stringify(updates[k]) !== JSON.stringify(current[k])` (and not already-equal to the existing `draft` value). That makes the admin availability/price/quantity-only save stage *nothing* (all copy unchanged → `hasDraftable=false` → "live now — nothing to publish", no Publish button), satisfying #16/#23/#6, while a genuine copy edit still stages. Note the existing live-field guards already use plain `!==` safely because those three are scalars; only the draftable comparison needs the stringify form.

---

### RANK 2 — Edit-publish (apply staged draft) does **not** re-validate → a staged draft that blanks a required field ships a **malformed LIVE product**, falsifying Landmine #22
**Location:** §3.5 `handlePublish`, the `if (row.is_published)` edit-publish branch (~L1239–1257); contrast the first-publish branch's `validateProductRules(row)` (~L1264–1267); Landmine #22; Test #25.

**What's wrong (concrete):** Landmine #22 / the plan's own words (~L1262) claim the shared validator "**guarantees a published product is well-formed even if an earlier edit blanked story_card / images.**" That guarantee is enforced **only at first-publish**. The edit-publish branch applies `{ ...draft, draft:null, preview_token:null }` to the live columns **with no validation**. `story_card` and `images` are both in DRAFTABLE and the published PUT stages whatever value arrives (no value check), so a draft can legitimately carry `story_card:""` (admin clears the textarea → `… || null`) or `images:[]`. Publishing that edit writes the blank straight to the live row — empty story, or (worse) an empty `images[]` that breaks `populateHero`/`populateGallery` on a live, purchasable product. No guard.

**The hole is also untested** — and that's what makes it dangerous. Test #25 exercises *first*-publish (create draft → edit to invalid → `publishProduct` → 400). It never exercises: published product → edit to invalid (stages into `draft`) → publish (edit-publish applies). So #5/RANK 1 will be caught at the gate; **this will not**, and it ships silently.

**Fix:** in the edit-publish branch, validate the merged result before applying:
```ts
const merged = { ...(row as Record<string, unknown>), ...draft };
const shapeProblems = validateProductRules(merged);
if (shapeProblems.length) {
  return jsonResponse(request, { error: `Cannot publish — ${shapeProblems.join('; ')}` }, 400);
}
```
Add an edit-publish variant to Test #25 (publish a *published* row whose staged draft blanked `story_card`/`images` → 400, live row unchanged).

---

### RANK 3 — RANK-5 preview-disable depends on **two unanchored selectors + an unverified element type**; if wrong, a draft-preview of a PUBLISHED product silently stays purchasable at the live price under the "not yet live" banner
**Location:** Phase 7, `disableCartControlsForPreview()` (~L2221–2228) and the claim at ~L2213 ("The buttons honor `btn.disabled`, so this is sufficient"); Landmine #25; Test #25-adjacent (no dedicated test exercises that the disable actually fired).

**What's wrong (concrete):** This is a genuine Angle-A self-containment gap on a *load-bearing safety control*. `disableCartControlsForPreview` targets `[data-product-add-to-cart], [data-product-buy-now]` and sets `btn.disabled = true`. Neither the **selectors** nor the **element type** is anchored anywhere in the plan — the DOMContentLoaded handler is quoted verbatim but it only *calls* `wireCartButtons(product)`; `wireCartButtons`' body and the actual buy/add markup in `product.html` are never shown. Two silent-failure modes:
1. If the real attributes differ (e.g. `data-add-to-cart` / `data-buy-now`, or an id-based hook), `querySelectorAll` matches nothing and the disable is a **no-op**.
2. `disabled` only suppresses clicks on `<button>`. If either control is an `<a>` styled as a button, `disabled` does nothing and the link still navigates to checkout.

Either way the RANK-5 protection evaporates **precisely in the scenario it exists for**: an *edit* preview of an already-**published** product is `is_published` + `available` with a live `stripe_price_id`, so `checkout.ts` does **not** reject it server-side (the L2211 "checkout already rejects unpublished rows" backstop does not apply here — this row is published). The only thing standing between Em's shared preview link and a real purchase at the live price under a "Draft preview — not yet live" banner is this client-side disable. A cold builder cannot confirm it works without opening `product.js`/`product.html` — exactly what the doc's "LOCATE and APPLY, never DISCOVER" rule forbids.

**Fix:** quote the actual add-to-cart / buy-now elements (or the selectors `wireCartButtons` uses) as an anchor, confirm they are `<button>`, and have `disableCartControlsForPreview` reuse that same selector. If either is an anchor, additionally `preventDefault`/remove the href on preview load.

---

### RANK 4 — `upload.ts` auth gate is not anchored relative to the new JSON intake; the URL-fetch branch is a server-side fetch (SSRF / R2-abuse surface) that must sit **after** auth
**Location:** Phase 5, the dual-intake replacement of "the multipart parse at the top of `POST`, 85–105" (~L1933–2030); Pre-flight upload.ts anchors (~L171).

**What's wrong (concrete):** The new JSON path does `await fetch(normalizeMediaUrl(body.url), …)` — the server fetches an owner-supplied URL. The role-before-fetch check (good) limits *what* can be stored but not the fetch itself (`role:'hero'` passes trivially), so without auth this endpoint is a blind-SSRF + R2-storage-abuse proxy. The plan calls L85–105 "the top of `POST`" and replaces it, but **never anchors or even mentions an `authorize()`/`PRODUCT_API_KEY` check** anywhere in upload.ts (the pre-flight lists ROLE_PATTERN, MIME constants, transform, video passthrough — no auth line). A cold builder therefore cannot confirm the new fetch is gated; if auth happens to live *inside* or *after* the parse block being replaced, the JSON branch could end up unauthenticated.

**Fix:** anchor where upload.ts authorizes (it must, since admin + curl have always written to R2) and confirm the dual-intake block sits strictly *after* it. If upload.ts currently has no auth, that's a pre-existing hole the JSON fetch now makes material — flag for Sean. (Cheap to verify; likely already fine — but it's an unverified, security-relevant placement on a path that newly reaches out to the network.)

---

### RANK 5 — The `createProduct` request schema NEW state is **described, not quoted** — the one block the plan promised to keep locate-and-replace
**Location:** §9.1 (~L2823–2824 "the `createProduct` request schema — is quoted verbatim below so it stays locate-and-replace"; the CURRENT block is quoted at L2844–2893; but the NEW state is the prose note at L3099 "Also add checkout_name, checkout_description, checkout_image, seo_thumbnail, and the `media` array (same shape as in editProduct above)").

**What's wrong (concrete):** The plan singles out `createProduct` as *the* structured, error-prone block to keep byte-exact (G10) and quotes the CURRENT verbatim — but the NEW is left as "merge these five fields, the `media` one being the same 7-sub-property nested array you'll find in `editProduct` above." That is hand-assembly of a nested YAML object across two locations — exactly the locate-and-judge the doc's anti-fragility rule was written to avoid, and the most drift-prone YAML edit in the plan. (`editProduct`'s media block *is* quoted verbatim at L2944–2956, so the source exists — but the builder must transplant it.)

**Fix:** quote the **full NEW `createProduct` schema** verbatim with `checkout_name`/`checkout_description`/`checkout_image`/`seo_thumbnail` and the `media` array merged in (and `sync` removed), so it's a single locate-and-replace.

---

### RANK 6 — `EVERLASTINGS_STORE.md` AR #7 + AR #23 (the **slug model**) are not in the Phase 10 rewrite list → the architecture primer retains the OLD slug model, contradicting this version's headline fix
**Location:** Phase 10 rewrite list (~L3262–3271, which does **not** mention AR #7 or AR #23); `EVERLASTINGS_STORE.md` AR #7 (L233–235) and AR #23 (L285–288).

**What's wrong (concrete):** v1.5.7's RANK-1 change is the **GPT-supplied, accent-folding** slug (Landmine #21). But `EVERLASTINGS_STORE.md` — the "read this first" primer — still asserts the *old* model in two Architecture-Reference entries the plan's Phase 10 doesn't touch:
- **AR #7:** "Slug rules: immutable after creation. `title.toLowerCase().replaceAll(' ', '-')`."
- **AR #23:** "**Slug generated API-side before image upload.** Compute `title.toLowerCase().replaceAll(' ', '-')` … DB trigger is fallback only. Order: generate slug → upload images → create product record."

Both describe the slug as **API-generated** with the **naive** algorithm (no accent-fold, no strip-non-`[a-z0-9-]`, no collapse-repeats) — the exact opposite of v1.5.7 (GPT derives + server `slugify` ASCII-folds). A future agent reading the primer would re-implement the old model. This is the same topic as 6th-A RANK 1; the plan fixed the GPT-facing docs but missed the primer.

**Fix:** add AR #7 + AR #23 to Phase 10: slug is **GPT-derived** (lowercase, ASCII-fold accents, spaces→`-`, strip non-`[a-z0-9-]`, collapse repeats), **required** on create, **server-normalized identically**, photos upload under it before the row exists; the `set_slug` DB trigger remains the empty-input fallback only.

---

### RANK 7 — Phase 10's "ASCII diagrams (105–107, 138–144)" line hints don't point at stripe-sync content; the system-diagram + two pitfalls still assert INSERT→Stripe and aren't clearly enumerated
**Location:** Phase 10 (~L3266 "Stripe-sync ASCII diagrams (105–107, 138–144)"); `EVERLASTINGS_STORE.md` system diagram (L102–130, esp. the `stripe-sync` line ~L110–111, the `GET/POST/PUT /api/products` line ~L114, "DB Webhooks: on INSERT" ~L148) and pitfalls at ~L779 + ~L787 ("DB webhook syncs to Stripe on INSERT").

**What's wrong (concrete):** In the doc, L105–107 is the "VERCEL SERVERLESS FUNCTIONS" header and L138–144 is the R2 path list — **neither is a stripe-sync diagram**, so those two line hints send a Phase-10 builder to the wrong place. The actual old-model assertions live in the **system diagram** (`/api/stripe-sync → create … (DB webhook + inline ?sync=true caller)` at ~L110–111) and in pitfalls ~L779/~L787 ("DB webhook syncs to Stripe on INSERT") — none of which is clearly listed as a rewrite target. Left as-is, the primer's top-of-file diagram still teaches the pre-v1.5 "INSERT auto-creates Stripe" model. (Doc-quality, not runtime — but it's the line that "first misled the cold review," per the plan itself, so worth getting right.)

**Fix:** correct the line hints; explicitly enumerate the system-diagram stripe-sync block (~L110–111) + the `/api/products` CRUD line + "DB Webhooks: on INSERT" + pitfalls ~L779/~L787 in the "INSERT → draft (no Stripe); Stripe at publish" rewrite.

---

### RANK 8 — `product_type` enum offers `printable`/`storybook` but `PRODUCT_TYPE_RULES` only defines `miniature` → creating either today fails the 5-gallery check with a confusing error
**Location:** §3.3 `PRODUCT_TYPE_RULES` (only `miniature`, ~L686–691) + `createProduct`/`editProduct` schema `enum: [miniature, printable, storybook]` (L2876, L2936); Landmine #10/#24.

**What's wrong (concrete):** Latent, but real: the schema invites the GPT to set `product_type: printable` (which would plausibly need 0 gallery images), yet `validateProductRules` falls an unknown type back to `miniature` rules (≥1 hero + ≥5 gallery + thumbnail). So a `printable`/`storybook` create today is rejected for "Minimum 5 gallery images required" — a confusing failure for a type the enum advertised as supported. The fallback-to-miniature is the right safety posture; the mismatch is that the *enum* is ahead of the *ruleset*.

**Fix (pick one):** either narrow the schema enum to `[miniature]` until the other rulesets exist, or add the intended `printable`/`storybook` entries to `PRODUCT_TYPE_RULES` now. No code-structure change either way — this is the scaffold working as designed; just align the advertised enum to it.

---

## Smaller notes (not blocking)
- **`listCoupons` is active-only** (`promotionCodes.list({ active: true })`): Em can't review expired/exhausted sales by chat. Acceptable for v1 (she's managing *running* sales); note it if you want "show me past sales" later.
- **No `editCoupon`:** changing a sale's percent means deactivate + recreate. Fine (Stripe coupons are largely immutable); the GPT instructions don't over-promise editing.
- **"Resolved" wording (Open Items, ~L3552):** "available only flows through the draft on a still-unpublished product" is slightly imprecise — on an unpublished row `available` flows to the **live column** (not a draft), via the unpublished-PUT `pick`. The invariant (no stale `available` in a published row's draft) still holds; only the phrasing is loose.

---

## If you fix one thing
**RANK 2 — make edit-publish re-validate the merged row.** It's the only gap that can put a **broken product in front of a paying customer** (empty `images[]`/`story_card` on a live, purchasable row), it **falsifies a stated invariant** (Landmine #22's "can never ship a malformed product even if an edit blanked story_card/images"), and — unlike RANK 1 — **the existing test plan does not exercise it** (Test #25 covers first-publish only), so it will sail through the gate and ship silently. One `validateProductRules(merged)` call closes it.

(RANK 1 is *more likely* to surface — it fails Test #23 on the admin path immediately — which is why it's ranked first by derail-likelihood; but it'll be caught and fixed at the gate. RANK 2 won't be, which is what makes it the one to fix deliberately.)

## Verdict
**NEEDS ANOTHER PASS — narrow.** No architecture gap; the store is fully chat-drivable and Landmines #1–#15, #17–#25 hold across their surfaces. The required work is two code-correctness fixes (RANK 1 draftable change-detection; RANK 2 edit-publish validation), two anchoring confirmations (RANK 3 preview-disable selectors/element type; RANK 4 upload auth placement), one verbatim-schema fill (RANK 5 `createProduct`), and two primer reconciliations (RANK 6 slug ARs; RANK 7 system diagram). Fold, bump, re-run A.
