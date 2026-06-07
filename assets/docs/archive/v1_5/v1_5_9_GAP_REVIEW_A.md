# v1.5.9 — Gap Review A (9th pass, cold / out-of-repo)

**Reviewer lens:** can Em run her *entire* store by chat through the GPT, with the least friction — and can a fresh agent execute this plan against the repo without guessing or deciding? Judged against the North Star + `EVERLASTINGS_STORE.md`, not doc-internal consistency.

**Scope of this pass:** the 8th-A found a real data-loss regression (live-vs-effective change-detect); v1.5.9 folds the fix (live-compare draft detection + `effective` view + `openEditor` overlay) and adds Tests #26/#27/#28. This pass confirms that fix and landmines 7–30 hold, then hunts for what the prior eight passes did **not** surface. I found **no architectural gap, no data-loss regression, no self-containment showstopper in the code phases.** The findings below are reliability/honesty/hardening refinements — ranked, concrete, none build-derailing.

---

**Verdict: READY TO BUILD.** Ninth A-pass found no architectural gap, no missing chat capability, no data-loss regression. The code phases are byte-anchored, TDZ-aware, and the price-rotation failure ordering is correct on every path (create-new → write-DB → deactivate-old; every throw leaves a buyable product). The v1.5.9 fix to the 8th-A regression holds: live-compare draft detection + the `effective` view + `openEditor`'s `eff` overlay close the cross-surface data-loss path, and Tests #26/#27/#28 cover it. Landmines 7–30 all hold — I spot-checked each against the quoted code, not from memory.

What's left is six non-blocking refinements, ranked. The pattern across the top three is the same: every store *operation* is genuinely chat-drivable, but a handful of GPT-doc gaps let a real owner request meet a field/path that technically works but isn't *guided* —

1. **SSRF on `uploadImage`'s URL-fetch** — the only genuine defect, but low platform severity (auth-gated, Vercel has no IMDS, response body never echoed). A 6-line private-range/scheme guard, fold in during build.
2. **The "build arrays from `effective`" safety lapses on the `getProduct`-404 → `listProducts` fallback** — `effective` only comes from `getProduct`, so the fallback path has no way to follow the instruction. Narrow now (deterministic slugify makes 404 rare) but it's the last open edge in exactly the data-loss class the trail has been closing. One instruction line.
3. **`featured`/`series` are reachable but undescribed** — "feature this on the homepage" is a frequent ask hitting a field with no schema hint and no instruction. Pure GPT-doc.

The "if you fix one thing": **close the field-discoverability + effective-fallback gaps (2 + 3)** — they're the only places where "the docs imply it's covered" outruns "the GPT can actually do it," and both are one-line additions, no code.

The full ranked list with locations and concrete fixes — plus 4 (tell Em plainly that homepage/site composition is a "set up with Sean" job, not chat-drivable), 5 (the curl protocol is the one structured artifact left as prose, not byte-quoted — Sean's path, not Em's), and 6 (a stale no-op-edit rationale) — is in the file.

---

## Landmines 7–30 — confirmed holding (spot-checked against the quoted code)

- **#7 frozen guard** — `frozenAttempt` is a value-compare (`updates[f] !== current[f]`), price excluded, scalars only → re-sent unchanged `checkout_*` passes; the admin-published-edit path (Test #5b) survives. ✓
- **#8 RLS swap** — name-keyed DROP + the `DO $$ … RAISE` guard on any surviving `qual='true'` permissive SELECT policy. ✓ (`pg_get_expr` renders `USING(true)` as `true`, so the equality match is sound.)
- **#9 discard** — `?_action=discard`, auth-only, no token path, idempotent on a clean published row, friendly 400 on an unpublished draft. ✓
- **#10 create allow-list** — `CREATE_FIELDS` picks from `product`; `sku` deliberately omitted (DB default); slug lands on `product` so the pick captures it. ✓
- **#11 origin-correct preview_url** — `new URL(request.url).origin`; Test #3 asserts host == inbound host. ✓
- **#12 listCoupons pagination** — `for await` over `promotionCodes.list`, `SCAN_CAP=2000`, `truncated` flag; product-scoped coupon needs a published product (GPT told). ✓
- **#13 uploadImage URL-intake** — JSON `{url,slug,role,skip_transform}`, Drive-normalize, MIME/size gate, same pipeline; role checked *before* the fetch. ✓ (but see Gap 1.)
- **#14 charge.refunded** — full-refund → `status='refunded'` by `stripe_payment_intent`; partial logs only; behind the idempotency claim. ✓
- **#15 Studio split** — INSERT-fires-trigger vs UPDATE-doesn't-fire zombie, both documented "never publish from Studio." ✓
- **#16 / #17 live-apply trio** — `price` + `available` + `quantity` apply live, change-detected, excluded from staging; consistent across §1.3 / PUT / §9.2 / §9.5 / §10b / panel. ✓ (No surface still says available/quantity "stages until publish.")
- **#18 slug 404 fallback** — listProducts-and-match instruction present. ✓ (but see Gap 2 for its interaction with the effective-array rule.)
- **#19 refunds guided + web search** — Web-Browsing toggle ON flagged as a `GPT_SETUP.md` config requirement. ✓
- **#20 ROLE_PATTERN** — `checkout_image|seo_thumbnail` added; multi-link looping in instructions. ✓
- **#21 slug GPT-supplied** — required in the schema, derived once, server re-slugifies (NFKD ASCII-fold), empty-guard against the `set_slug` trigger; no surviving "system handles slug, never set" in GPT-facing blocks. ✓ (strong work — the accent-fold convergence note is exactly right.)
- **#22 / #27 shared validator on BOTH publish branches** — `validateProductRules` runs at first-publish *and* edit-publish (`{...row,...draft}`); one hoisted module-scope copy; 11/12 holds. ✓
- **#23 owner-sale isolation byte-anchored** — three system call-sites quoted (cart.ts tags the promo code `cart-recovery`; subscribe.ts nothing; _bootstrap nothing); bootstrap-never-tags invariant stated. ✓
- **#24 panel honesty** — `pendingDraft` detection so a live-only save over a staged copy edit shows "live now — edits still pending" + preview + Publish/Discard, never contradicting the list pill. ✓
- **#25 preview Buy disabled** — `disableCartControlsForPreview` anchors the two real `<button>` selectors (product.html:289-290). ✓
- **#26 live-compare draft detect** — `JSON.stringify(updates[k]) !== JSON.stringify(current[k])` against LIVE; re-sent live never re-stages; untouched staged values survive the `{...existingDraft,...draftable}` spread; self-prunes. The documented `homepage_theme` key-order edge is correctly flagged cosmetic. ✓
- **#28 pg_net body jsonb** — preflight anchors `…0502`; NEW body keeps `payload` (not `::text`); only delta is the `OR NEW.is_published = false` guard; trigger left INSERT-only. ✓
- **#29 both surfaces edit STAGED state** — `openEditor` builds `eff={...product,...draft}` (draftable from `eff`; live trio + slug/id/type from `product`); authorized GET returns `effective` (top-level stays live). ✓ (but see Gap 2.)
- **#30 webhook Stripe import** — `Stripe.Charge` resolves against the existing `import type Stripe` (line 1); no new import; Phase 4.7 anchors it. ✓

Price-rotation **failure ordering** (the load-bearing invariant) is correct on every path: create-new → write-DB → deactivate-old; a `prices.create` throw 502s with the DB untouched (old price active+referenced → buyable); a DB-update error returns 400 before the deactivate (old price still referenced → buyable, one orphaned active price, harmless). Test #19 covers it. ✓

---

## Gap list (ranked by consequence)

### 1. `uploadImage` URL-intake has no host/scheme guard (server-side fetch of an arbitrary owner-supplied URL) — SECURITY, hardening
**Where:** Phase 5, the JSON intake block (`mediaRes = await fetch(normalizeMediaUrl(body.url.trim()), …)`, ~L2037-2049).
**What's wrong:** the server fetches whatever URL an authenticated caller sends, with no restriction on scheme or host. That is an SSRF surface — `http://localhost:…`, `http://169.254.169.254/…`, internal hostnames all get fetched. **Severity is genuinely low here** (the route is behind the `authorize` gate → caller already holds `PRODUCT_API_KEY`/admin JWT and can already create/publish/coupon; Vercel serverless has no IMDS-style metadata endpoint; the response body is never echoed to the caller — only the R2 URL of a *successfully stored image* is returned; non-image responses fail the `ALLOWED_MIME` gate). So it does **not** meaningfully expand an authenticated attacker's power on this platform — but it's an unhandled class on a brand-new public-edge endpoint, and Sean's bar is production-clean.
**Fix:** in `normalizeMediaUrl` (or right before the fetch), reject anything that isn't `https:` (or `http:` for non-Drive direct links if you must), and reject hosts that resolve to private/loopback/link-local ranges (`127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `::1`, `fc00::/7`). 6–8 lines, no behavior change for Drive/CDN links. Note it as a one-liner in the Phase 5 security comment that already explains the auth-ordering.

### 2. The "build arrays from `effective`" data-loss guard doesn't survive the `getProduct`-404 → `listProducts` fallback — ROBUSTNESS, in the exact target class of this review trail
**Where:** §9.2 EDITING step 1 + step 4 (L3364, L3368) vs. the `listProducts` schema (L3122-3133, which returns `draft` but **not** `effective`, and not the full content fields).
**What's wrong:** the whole v1.5.9 effective-view machinery exists so a *second* pre-publish array edit extends the staged array instead of dropping it. The instruction tells the GPT to build complete `images`/`media` arrays from `effective.images`/`effective.media`. But `effective` is returned **only by `getProduct`**, never by `listProducts`. On the §18 fallback path — `getProduct` 404s (slug divergence) → GPT calls `listProducts` and matches by title → edits straight off that row — the GPT has the raw `draft` object but **no `effective`**, so following step 4 literally is impossible, and an array edit built from the live top-level silently drops the staged array. This is narrow now (the deterministic NFKD slugify in "THE SLUG" makes a 404 rare, and it only bites a piece that *also* has a staged array edit), but it's the one remaining open path in the precise failure class the last three passes have been closing.
**Fix:** one instruction line in §9.2: on the `listProducts` fallback (or any time you lack `effective`), before any `images`/`media` edit, reconstruct it yourself by overlaying the row's `draft` onto the row (`{...row, ...row.draft}`) — `listProducts` returns the full `draft` object, so this is sufficient — or re-derive the slug and retry `getProduct`. Optionally add `images`/`media` to the `listProducts` item schema so the fallback path has them.

### 3. Live, visible fields (`featured`, `series`) are reachable but undescribed — the GPT may not trigger common owner requests — CAPABILITY-POLISH (lens finding)
**Where:** `editProduct`/`createProduct` schemas — `featured: { type: boolean }` (L3165) and `series: { type: string }` (L3160) carry **no `description`**, and §9.2 Instructions never mention either. `homepage.js` reads `featured` for the live homepage carousel (architecture L564/L670) and `shop.js` reads `series` for filters/related.
**What's wrong:** "feature the Lavender Wreath on the homepage" and "add this to the Portals to Peace series" are natural, frequent owner asks. The fields exist and work, so the plan *reads* as covering them — but whether the GPT maps the intent onto the right field is left to inference (no schema hint, no instruction). This is exactly the lens's "asserted but not reliably chat-drivable." (`featured` also stages into `draft` on a published row, so a "feature this" doesn't take effect until publish — worth one word so the GPT tells her to publish.)
**Fix:** add `description` to both schema fields ("`featured`: show on the homepage carousel"; "`series`: the collection name, e.g. Portals to Peace — used for shop filters") and one line in §9.2 EDITING ("To feature on the homepage → `editProduct {featured:true}` (stages like other copy — publish to apply); to set the collection → `series`"). Pure GPT-doc, no code.

### 4. "The site" is in the North Star but homepage/site composition isn't chat-drivable, and Em is never told — COMPLETENESS-HONESTY
**Where:** §1.2 (GPT's `editProduct` correctly omits `homepage_theme` — admin-only by decision) and Phase 10b (`STORE_ADMINISTRATION.md`), which lists every chat capability but doesn't draw the boundary.
**What's wrong:** the North Star says "the site, the store, and her sales." v1.5 delivers store + sales + orders by chat; per-product `featured` is the only homepage lever the GPT can pull. The homepage theme/rotation, the featured-set/`site_config`, the hero, and the static pages are **not** chat-drivable (by scope/decision — that's fine). The lens requires the honest limit be *stated*. It's stated to the builder (§1.2) but not to **Em** — so "change the homepage mood / what's on the homepage" gets a vague answer instead of "that's a setup we do together." (The plan already does this well for product *types* — the "miniatures only; new types are a setup project" note in §10b is the right model to copy.)
**Fix:** one plain line in `STORE_ADMINISTRATION.md`: what the GPT manages (products, photos, prices, sales, orders, take-downs) vs. what's a "set up with Sean" job (homepage look/hero/themes, adding a new *kind* of product). Sets expectations; no code.

### 5. Phase 9.5 (curl protocol) is prose-only, not byte-quoted — SELF-CONTAINMENT, low (Sean's path, not Em's)
**Where:** Phase 9.5 — "Step 3 (376–404)", "Editing/marking sold (406–417)", "quick-reference (425–432)" are described in prose; unlike the `createProduct` schema (quoted verbatim), the CURRENT `GPT_SETUP.md` Part 4 curl blocks are not shown.
**What's wrong:** the builder must open `GPT_SETUP.md` and reconstruct curl examples (drop `?sync=true`, add the publish call, the PUT-stages-draft semantics) from prose + cross-reference. Recoverable from the Phase 6 route table + the Phase 3 handler signatures, and this path is the agent/curl protocol (Sean/Claude Code), not Em's GPT — so a slip here doesn't touch chat-driving. But it's the one structured artifact the plan leaves as interpret-with-care.
**Fix:** quote the CURRENT Part 4 curl create/PUT/quick-ref blocks (as you did for the `createProduct` schema) so it's locate-and-replace. Or accept it as a known low-confidence doc edit.

### 6. Stale rationale in the §9.2 PREVIEW note — DOC NIT, low
**Where:** §9.2 PREVIEW (L3375): "Don't make a no-op edit to 'regenerate' a link — that would stage an empty draft."
**What's wrong:** with §3.4's live-compare, a no-op edit now stages **nothing** and returns `no_changes:true` — it does *not* stage an empty draft. The advice (don't make pointless edits) is still fine, but the stated reason is now inaccurate.
**Fix:** "…a no-op edit changes nothing and won't surface a fresh link — `getProduct` returns the current `preview_url` instead." Trivial.

---

## The single most important "if you fix one thing"

**The GPT can drive every store operation — the only places where "the docs imply it's covered" outrun "the GPT can actually do it" are a few one-line GPT-doc gaps, and the highest-leverage one is field discoverability + the effective-array fallback (Gaps 2 + 3).** Everything in §1.10 is genuinely chat-drivable; the residual risk isn't a missing capability or a code defect, it's that a real owner request can meet a field that *technically* works but isn't *guided*: "feature this on the homepage" (an undescribed `featured`), and the staged-array safety that silently lapses on the `getProduct`-404 fallback (no `effective` there). Both are pure instruction/schema additions, no code, and they close the last "field exists but the GPT might not use it right" edges — the same data-loss/clunkiness class the whole review trail has been narrowing. (Gap 1, SSRF, is the only genuine *defect*, but its platform severity is low; fold its 6-line guard in during the build rather than gating on it.)

---

## Verdict

**READY TO BUILD.** No architectural gap, no missing chat capability, no data-loss regression, and the code phases are byte-anchored, TDZ-aware, and failure-ordering-correct. The six findings are GPT-doc clarity (2/3/4/6), one curl-doc confidence note (5), and one low-severity security hardening line (1) — all cheap, none load-bearing. Fold them into the build (they don't require a re-architecture or another A-pass); calling another pass over polish-grade items would be manufacturing a blocker.
