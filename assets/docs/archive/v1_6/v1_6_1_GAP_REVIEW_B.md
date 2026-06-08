# Angle B (fidelity) gap review — v1.6.1 build

**Scope.** The whole build guide — `v1_6_1_IMPLEMENT.md` (Part 2) + `v1_6_1_ADDENDUM_DESIGN.md` + `v1_6_1_ADDENDUM_TESTING.md` — swept for any place a fresh agent would have to **discover or decide** instead of just apply. The North Star (Em runs the whole store by chat) is the *why* fidelity matters; a CURRENT block that no longer matches, or a NEW block the prose doesn't tell you where to put, is a discover/decide moment that breaks "exclusively executable." Every CURRENT block in the code phases (1–8) was byte-checked against the working tree, plus the four DECIDED design blocks; the doc-phase (9/10/10b) edits were read as locators. No code or docs were changed — findings only.

---

## Verdict

**NEEDS ANOTHER PASS — but narrow.** The entire code build (Phases 1–8) and the design addendum are **byte-clean**: every quoted CURRENT block matches the working tree, all nine reviewer landmines hold, and all six v1.6.0 folds (#31–36) are present and well-formed. Two real executability gaps and two cosmetic ones, **all inside the single Phase 9.1 GPT-schema edit**. Fold the two fixes, re-confirm 9.1, and ship — no need to re-review the code or design phases.

---

## The single most important fix

**Phase 9.1's NEW Actions schema redefines `/api/upload` (multipart → JSON) but never tells the builder to remove the existing multipart `/api/upload` block — so the GPT's upload schema ends up duplicated or wrong, and "upload media by chat" (the whole reason Phase 5 exists) can silently break.**

- The working tree's `GPT_SETUP.md` defines `/api/upload` as **multipart/form-data** with `file: { type: string, format: binary }` (lines 137–166). A GPT Action **cannot send a binary file** — so that schema never actually let the GPT upload anything; it's the by-link JSON intake (Phase 5) that makes chat-upload possible.
- The Phase 9.1 NEW YAML supplies a **JSON** `/api/upload` (IMPLEMENT.md:3338–3357, `{url, slug, role, skip_transform}`). But the prose around it only says *"Replace the createProduct post block… then after it add a get, a put, and the two new paths"* (3073, 3139). It never says **replace the existing `/api/upload`**, and "two new paths" badly under-counts the ~10 paths in the NEW block.
- Result if applied literally: the file has `/api/upload` **twice** (old multipart at 137, new JSON at the end of the appended block) → a duplicate `paths` key. That's invalid OpenAPI; ChatGPT's importer will either error or silently last-wins. If the **old** multipart block wins, the GPT can't upload by link at all → Em's media flow is dead, which is exactly the North-Star capability.
- **Fix:** §9.1 must explicitly instruct **replacing** the existing `/api/upload` multipart block (`GPT_SETUP.md:137–166`) with the NEW JSON `/api/upload` (or state that 2B is regenerated whole). End state: exactly **one** `/api/upload`, the JSON one. (Relying on importer last-wins is the kind of undocumented behavior to avoid — name it and make the replace explicit.)

---

## Ranked findings

**1 — `/api/upload` duplicate/stale path (executability, load-bearing).** See "most important fix" above. Phase 9.1 / `GPT_SETUP.md:137–166` vs IMPLEMENT.md:3338–3357.

**2 — The createProduct CURRENT block isn't actually verbatim (the one block the plan promises is).**
- Location: IMPLEMENT.md:3043, inside the block the plan calls *"verbatim … a clean locate-and-replace"* (3002, 3023).
- Mismatch: the CURRENT quote's slug line reads
  `slug: { type: string, description: "URL-safe handle you derive from the title …permanent after creation." }`
  — but the working tree (`GPT_SETUP.md:185`) is the **bare** `slug: { type: string }`. The enriched description is the **NEW** value (it reappears verbatim in the NEW block at 3089); it was copy-pasted into the CURRENT by mistake.
- Corrected anchor: real CURRENT line is `                slug: { type: string }`.
- Why it matters: the build's whole rigor rests on CURRENT blocks you can trust. A literal find of this "verbatim" block fails at the slug line; the only safe application is wholesale-replace-by-identity (`operationId: createProduct`), which the wording should say. Output is unaffected (the NEW is correct) — but the promise is false here, and that's a discover moment.
- Fix: restore the CURRENT slug line to `slug: { type: string }`, **or** relabel the block "replace the createProduct `post:` block by identity (not a literal match)."

**3 — The createProduct CURRENT quote is truncated before its `responses:` (minor, same edit).**
- The CURRENT block (3024–3072) stops at `seo_description` (working tree line 213) and omits the existing `responses:` block (`GPT_SETUP.md:214–230`). The instruction is "replace the **entire** post block," and the NEW supplies its own `responses:` (3135–3136), so the builder must replace **through line 230**.
- Fix: note the CURRENT post block extends through `responses:` (214–230); replace through there. (Structural replace lands it; the quote just doesn't delimit the block's end.)

**4 — Design addendum D1 `shop.html:164` CURRENT is indented 2 spaces shallower than the file (cosmetic).**
- Addendum quotes the `.shop-layout` div at 8 leading spaces; the working tree (`shop.html:164`) has 10. The line **content** is identical, and the adjacent D4 fieldset quote (183–206) is correctly indented — so this is isolated to the one D1 line.
- Impact: negligible — the fix (delete `grid-template-columns: 1fr;` from the inline style) locates by unique content. Flagged only because the charter asked to byte-check `shop.html:164`. Confirm by content, not byte.

---

## Not a defect (worth a sentence so it isn't re-flagged)

- **#35 — Part 4 curl blocks (Phase 9.5)** are written as **locators** with `…` abbreviation, not byte-verbatim as the charter's wording implies. That's *consistent with the plan's own doc-phase policy* (9/10/10b are line-hinted, stated at 2998–3003), the line hints (376–404, 406–417, 425–432) are accurate against `GPT_SETUP.md`, and it's Sean's/Claude Code's curl path — not Em's GPT. Acceptable as written.

## Residual (not blocking, not independently verified this pass)

- **Phase 10 / 10b line-refs** into `EVERLASTINGS_STORE.md` and `STORE_ADMINISTRATION.md` (e.g. STORE 63/110–111/114/148/233–234/360–367/742) are **rewrite-by-meaning** targets, not byte anchors. I did not open those two files to confirm each number. Lower-stakes (the instruction is "rewrite these sections to the new model," not a keyed edit), but if you want zero drift, a quick locator pass over those two files would close it.

---

## Coverage — what was verified clean (so the "narrow" verdict is trustworthy)

**Every code-phase CURRENT block byte-matches the working tree:**
- Phase 1 migration — the live trigger is `…0502`'s `notify_stripe_sync()`; NEW keeps `body := payload` (not `::text`) and the **only** delta is `OR NEW.is_published = false`; `CREATE TRIGGER` is AFTER INSERT only and is **not** re-created. The `DO`-block guard (G2) is valid PL/pgSQL and queries `pg_policies` correctly (`cmd='SELECT' AND permissive='PERMISSIVE' AND qual='true'`). All new/edited columns exist in the initial schema (+ the three `checkout_*` and `seo_thumbnail` this migration adds); `homepage_theme`/`artist_note`/etc. are all real columns, so the unpublished-draft branch's live-column writes can't 400.
- Phase 2 stripeSync — `SyncableProduct` (11–22), `stripe.products.create` (61–65), the Price-create + ID-writeback + idempotent short-circuit (36–96) all match; publish is idempotent + safe.
- Phase 3 products.ts — imports (1–5) match; `import type Stripe` provably non-colliding (only lowercase `stripe` exists); `jsonResponse` (27–32), GET (38–57/82–86), POST (96–99), PUT (213–291) all match. **G1** holds: the frozen guard is `hasOwnProperty(updates,f) && updates[f] !== current[f]` and `price` is **not** in `FROZEN_AFTER_PUBLISH`. **Landmine #3** holds: rotation is create-new-Price → write-DB → deactivate-old in a post-commit best-effort try/catch, capturing `oldPriceIdToDeactivate`; a `prices.create` throw 502s with the DB untouched (old price still active+referenced). `CREATE_FIELDS = [...DRAFTABLE, …]` references DRAFTABLE at request time (no TDZ); `sku` correctly omitted; slug lands on `product` before the pick. `for await (… stripe.promotionCodes.list …)` is valid SDK pagination; the `Stripe` type is used by both coupon handlers; `randomUUID` resolves. Owner-sale isolation confirmed against the real source: cart.ts tags the *promo code* `'cart-recovery'`, subscribe.ts tags nothing, `_bootstrap/coupons.ts` sets no metadata — **no system coupon carries `source:'owner_sale'`**.
- Phase 4 checkout.ts (68–71, 79, 186–189, 205, 226–232, 240–245), Phase 4.5 config.ts + main.js (15–17, 57, 69), Phase 4.6 product-feed.ts (19–22, `.eq('is_test',false)` at 22), Phase 4.7 webhook.ts (idempotency 48–58, no-op guard 60–63) — all match. **#22**: the `charge.refunded` branch uses `Stripe.Charge`, handles `payment_intent` string|object|null narrowing, sits before the no-op guard, and `import type Stripe` is already at webhook.ts:1 (no new import).
- Phase 5 upload.ts — ROLE_PATTERN (52–53), `sha1Hex` (69–74), multipart parse (85–105), transform (170–172) match. **#31 SSRF**: `isPublicHttpUrl` is https-only, blocks localhost/127/10/172.16–31/192.168/169.254/0 + `::1`/fc/fd/fe80 (IPv6 gated on `:` so `fcdn.example.com` isn't false-blocked), runs **before** the fetch, references only the new helpers, and leaves Drive/CDN https links alone. `new File([bytes], …)` from the fetched Buffer feeds the same pipeline; size cap applies to fetched bytes.
- Phase 6 vercel.json — rewrites array (7–15) matches; no `/api/products/:x` precedes the new literals (no shadowing); destinations carry no `.html` (cleanUrls-safe); discard rewrite + the `?_action=discard` dispatch line both present.
- Phase 7 product.js — DOMContentLoaded (7–39) matches; **`populateMedia` emits exactly `.product-media__item` and `.product-media__item--embed`** — the class names D3 styles, so the design/functionality seam is real. Phase 7.2 swaps product.html:235–258 (byte-match) for the hidden `[data-product-media]` container; the Rickroll id is at product.html:252 as claimed.
- Phase 8 admin — admin/index.html anchors (68–70, 155, 156–159, 204–206, 218–223) and admin.js anchors (246–252, 258–299, 407–408, 454–462, 470–487, click-wire 151, toggle 301) all match. **HARD GATE** satisfiable: 8.11 replaces the whole `onDeleteProduct` (the sole `state.client.from('products')`, line 480) with a fetch-based `onArchiveToggle` → grep returns zero. **Landmine #4** (archive = `archived_at` + Stripe `active:false`, reversible, no hard delete) realized end-to-end.
- Phase 9 schema — **#32** (after a listProducts title-match, getProduct again by exact slug for `effective`; build full arrays from `effective.images`/`.media`) present in §9.2 steps 1+4. **#33** (`featured`="homepage carousel", `series`="collection shoppers filter by") described in **both** createProduct and editProduct schemas and mapped in EDITING. **#36** (no-op edit → `no_changes:true`, getProduct returns the current preview_url — not "stages an empty draft") corrected in PREVIEW & PUBLISHING. **#34** (site-vs-store boundary — GPT owns products/photos/prices/sales/orders; the site's *look* is a "set up with Sean" job) present in the Phase 10b spec. The `discardEdits` and JSON `uploadImage` OpenAPI paths are well-formed; editProduct/createProduct `product_type` enums correctly narrowed to `[miniature]`.

**Design DECIDED blocks byte-match:** D1 `product.html:162` ✓ and `product.html:442–450` style block ✓; D2 sticky rule `styles.css:885–890` ✓; D3 `.story-card` `styles.css:929–935` ✓; D4 fieldsets `shop.html:183–206` ✓ and shop desktop rule `shop.html:368–372` ✓; D5 tokens `styles.css:76–77` (`--space-2xl:3rem`/`--space-3xl:4rem`) ✓ with a concrete default reduction; D6 glow injects at the real `main.js:264` DOMContentLoaded ✓; D7 hero `.hero__media` block + `styles.css:953–954` video selector ✓, assets live on CDN. (Only the D1 *shop* line's leading whitespace is off — finding 4.)

**Other claims hold:** `tsc --noEmit` clean + 11 `api/*.ts` files (no new file added — publish/coupon/archive/discard are `?_action=` rewrites; upload + webhook are edits); removed PUT imports aren't re-referenced; every added symbol resolves; `stripe.prices.*` is used by the PUT rotation; the `import type Stripe` (capital) doesn't collide with the lowercase `stripe` instance.
