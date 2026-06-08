# Angle B (fidelity) gap review — v1.6.2 build · RE-PASS (round 2)

**Scope.** A narrow, non-monotonic re-pass over the v1.6.2 build guide — `v1_6_2_IMPLEMENT.md` (Part 2) + `v1_6_2_ADDENDUM_DESIGN.md` + `v1_6_2_ADDENDUM_TESTING.md`. Round-1 Angle B (`v1_6_1_GAP_REVIEW_B.md`) returned NEEDS-ANOTHER-PASS with four findings (one load-bearing: the `/api/upload` replace; two `createProduct` CURRENT-block fidelity; one cosmetic shop.html quote). This pass (1) confirms each fold landed byte-clean, (2) re-scans only the touched regions for a fold-introduced regression, (3) verdicts. Per charter, Phases 1–8 code and landmines #31–36 (round-1-cleared, untouched by the v1.6.2 folds) were not re-litigated. Every CURRENT block in a fold region was byte-checked against the working tree with `diff`. No code or docs were changed.

---

## Verdict

**READY TO BUILD.** Every round-1 B fold is present and **byte-for-byte clean**, the false-positive (B4) is confirmed (no action was needed and none was taken), and the non-monotonic re-scan of every touched region found **no new issue**. A courtesy cross-check of C1 (the one code-side v1.6.2 fold, formally Angle C's) is also fully clean. There are zero fidelity defects; the "exclusively executable" promise holds — a fresh agent applies, never discovers or decides.

---

## The single most important confirmation

**B1 — the load-bearing fix from round-1 — is now airtight.** The Phase 9.1 GPT-schema edit now (a) explicitly instructs deleting the existing multipart `/api/upload` (`GPT_SETUP.md:137–166`), (b) enumerates every added path by name (the under-counting "two new paths" wording is gone), and (c) ends with exactly one `/api/upload` (the JSON `uploadImage`). Confirmed at two reinforcing sites — the inline prose (IMPLEMENT.md:3193) and a dedicated "End state for `/api/upload`" callout (IMPLEMENT.md:3413–3418). The working tree carries exactly one of each anchor in the schema: one `paths:` (`GPT_SETUP.md:136`), one `/api/upload` path key (137), one `operationId: uploadImage` (139), one `operationId: createProduct` (169); the other `/api/upload` strings (lines 9/288/304/362/370/430/434) are prose, curl examples, and the quick-ref table — not path keys — so they create no duplicate. After the planned edit the file has exactly one upload path and one `uploadImage` operationId; the duplicate-`paths`-key / last-wins-importer hazard round-1 flagged is closed.

---

## CONFIRM — round-1 folds landed correctly + byte-clean

**B1 — single `/api/upload` (the JSON `uploadImage`).** Confirmed above. The NEW JSON block is IMPLEMENT.md:3392–3410 (`operationId: uploadImage` at 3394; `{url, slug, role, skip_transform}`). Exactly one `/api/upload` and one `operationId: uploadImage` appear in the NEW YAML. Prose enumerates the added paths: `/api/products/publish`, `/api/products/archive`, `/api/products/unarchive`, `/api/products/discard`, `/api/coupons`, `/api/coupons/deactivate`, `/api/products/by-slug/{slug}`, and the rewritten `/api/upload`. No "two new paths" phrasing remains anywhere.

**B2/B3 — the `createProduct` CURRENT block is now truly verbatim, end to end.** `diff` of the CURRENT quote (IMPLEMENT.md:3062–3125) against the working tree (`GPT_SETUP.md:167–230`) is **IDENTICAL**. The slug line is the bare `slug: { type: string }` (IMPLEMENT 3080 == `GPT_SETUP.md:185`), not the enriched NEW value; the block runs through its `responses:` to the last line (`stripe_price_id: { type: string }`, IMPLEMENT 3125 == `GPT_SETUP.md:230`). Both round-1 fidelity findings are correctly folded.

**B4 — false positive, confirmed; no action taken.** `shop.html:164` has **8 leading spaces**, and the D1 addendum CURRENT quote (`v1_6_2_ADDENDUM_DESIGN.md:31`) also has 8; a whitespace-exact string comparison matches. Round-1's "file has 10 spaces" was a mis-count — the file always matched. Correctly left as-is.

**Design CURRENT blocks the v1.6.2 folds touched — all byte-identical (`diff` clean):**

- D7 in-page `.hero__spotlight` CURRENT — `index.html:353–366` == addendum 352–365.
- D7 reduced-motion CURRENT — `index.html:380–382` == addendum 333–335.
- D2 product `<style>` CURRENT — `product.html:442–450` == addendum 81–89.
- D1 shop `<style>` CURRENT — `shop.html:366–374` == addendum 40–48.
- D1 inline-`gap` CURRENT — `product.html:162` (6 leading spaces) == addendum:22; `shop.html:164` (8 leading spaces) == addendum:31.
- D5 `<main>` CURRENT — `cart.html:149` and `checkout.html:149` both equal `  <main>` (2 leading spaces).

**Design "DECIDED" CURRENT blocks (per the charter's same-fidelity-bar list) — also byte-identical:**

- D3 `.story-card` — `styles.css:929–935` == addendum 144–150.
- D4 filter fieldsets — `shop.html:183–206` == addendum 180–203.

---

## Non-monotonic re-scan — did any fold introduce a new issue?

**B1 region — the schema/server role seam holds.** The NEW `/api/upload` schema advertises `role: checkout_image` and `seo_thumbnail` (IMPLEMENT.md:3406). Phase 5 makes the server accept them: the CURRENT `ROLE_PATTERN` (IMPLEMENT.md:1993–1994) is byte-identical to `upload.ts:52–53`, and the NEW (1999) appends `|checkout_image|seo_thumbnail` to the alternation — a well-formed regex matching exactly those two literals — with their crops wired at IMPLEMENT.md:2173–2174 (`seo_thumbnail` → 1.91:1 @1200; `checkout_image` → 1:1 @600). Schema and server agree; the GPT can upload to both new roles. No mismatch.

**D7 region — cascade and source order correct.** The fold replaces the in-page `.hero__spotlight` rule in place (not in `styles.css`, which would lose the cascade to the later-loading in-page block) and extends the in-page reduced-motion rule. Source order is preserved: the reduced-motion block (380+) follows the spotlight rule (353–366), so its `.hero__spotlight { animation: none; }` correctly freezes the NEW spotlight's `glow-breathe`. `glow-breathe` is a global keyframe from D6's `styles.css` (loads first), so it resolves in the in-page block. No new issue.

**D2 region — NEW grid CSS well-formed; every HTML-move anchor resolves.** The NEW `<style>` adds `grid-template-areas` (mobile `"gallery" "aside" "story" "media"`; desktop `"gallery aside" "story aside" "media ."`), child `grid-area` assignments, a base `gap`, and the aside sticky (`align-self:start; position:sticky` with the inner card neutralized to `position:static`) — syntactically sound, columns unchanged. The content-located HTML moves all have live anchors: `.product-story` open (`product.html:167`), `.story-card` (`:265`), `.product-sticky-card` aside (`:282`), `.product-details` `<section>` (`:321`) — and `.story-card`/`.product-details` each still carry the inline `margin-top: var(--space-3xl)` that move #4 trims. No new issue.

**D5 region — scoped selectors and tokens exist.** `.density-compact .section` / `.section-loose` resolve: `.section` (`styles.css:187`) and `.section-loose` (`:193`) are real, and `--space-xl` / `--space-2xl` / `--space-3xl` are defined (`styles.css:75–77`). The scope class replaces the earlier global-token redefinition cleanly. No new issue.

**D1 region — base-gap relocation is internally consistent.** Removing the inline `gap` from both layout divs is paired with the base gap moving into the `<style>`: product's base gap lives in the D2 `<style>` rewrite (`.product-layout { gap: var(--space-2xl) }`), shop's in the D1 shop `<style>` NEW (`.shop-layout { gap: var(--space-xl) }`). The addendum states the D1→D2 dependency on the shared `product.html:162` line; the whole addendum applies as one build. No new issue.

**D3 region — media tokens exist; reduced-motion video located.** `--radius-md` (`styles.css:86`) and `--space-md` exist, so the D3 media rules resolve. The "reduced-motion product video" behavior lives in Phase 7 `populateMedia` (IMPLEMENT.md:2426, the `reduceMotion` matchMedia guard) — part of the Phases 1–8 code round-1 byte-cleared — and matches the testing addendum's stated behavior (line 90: a GIF-like clip falls back to a paused poster + controls). Well-formed and coherent. No new issue.

**Testing addendum — nothing for Angle B.** It carries no byte-anchored CURRENT/NEW code blocks (pure verification plan + media-matrix table); the only "byte-identical" string is inside a test assertion (#27).

---

## Courtesy cross-check — C1 (Angle C's code-side fold)

C1 (`publicView` server-strip + explicit `main.js` columns) is the one code-side v1.6.2 fold. Angle B's mandate is "every CURRENT block" plus the non-monotonic principle, so it was checked even though C owns the logic. Fully clean:

- **CURRENT anchors byte-identical** — `main.js` `initConfig` (15–17 == IMPLEMENT 1822–1824), `getProductBySlug` (57 == 1836), `getProducts` (69 == 1845).
- **`publicView` is well-formed + tsc-clean** — IMPLEMENT.md:498–501; rest-omit destructuring (`const { draft, preview_token, is_test, ...pub } = row`). `tsconfig.json` has `strict: true` but not `noUnusedLocals`, and the rest-omit idiom is exempt regardless, so the unused omitted bindings do not error; `module: CommonJS` is correct for the Vercel runtime.
- **No 400-risk** — every one of the 31 columns in the explicit list exists in the products schema (initial schema lines 37–67 + `seo_thumbnail` added by Phase 1).
- **Complete** — every public-render field is in the list: all `p.<field>` reads in `product.js` (including `p.sku`, the field the in-house breadth pass folded back in) and the union read by `homepage.js` / `shop.js` / `main.js` (available, featured, headline, homepage_theme, images, price, product_type, quantity, series, slug, thumbnail, thumbnail_alt, title). `shipping_cents` exists but is correctly omitted — it is referenced in no frontend file (checkout/server field). No public (non-admin) renderer reads any deliberately-omitted internal column (draft, preview_token, is_published, archived_at, published_at, stripe_product_id, checkout_*, updated_at).

---

## Coverage — what was deliberately NOT re-checked (so "narrow" is trustworthy)

Per charter, these were cleared by round-1 B against v1.6.1 and were not touched by any v1.6.2 fold, so they were not re-litigated: all Phase 1–8 code CURRENT blocks (migration incl. the DO-block guard; stripeSync; products.ts GET/POST/PUT incl. the price-rotation order and frozen-guard G1; checkout.ts; product-feed.ts; webhook.ts `charge.refunded` + no-op guard; upload.ts multipart parse / `sha1Hex` / transform / SSRF guard #31; vercel.json rewrites; product.js `populateMedia` emit classes; admin archive HARD GATE) and the six v1.6.0 folds #31–36. The Phase 9.5 Part-4 curl blocks (#35, the Sean/Claude-Code path, not the GPT path) were likewise untouched; the retained multipart leg on `/api/upload` keeps those curl examples valid even though the schema now describes only the JSON intake the GPT uses.

---

## Ranked findings

**None.** Every confirmation passed byte-clean; the non-monotonic re-scan surfaced no fold-introduced regression.

---

## Verdict

**READY TO BUILD.**
