# v2.0.0 BUILD REPORT — AI Store Management + Design

**Initiative:** the by-chat store-management layer (create→preview→publish, edit/stage, coupons, archive, media-by-link, refund-status, strict test isolation) + the v1.5 design pass.
**Branch:** `dev` · **Status:** _in progress_ — built, deployed to the dev preview, **functional suite verified live**; design-visual pass underway; GPT-behaviour + refund tests await Sean's touchpoints.
**Source of truth:** `v2_0_0_IMPLEMENT.md` + `ADDENDUM_DESIGN.md` + `ADDENDUM_TESTING.md`. This report records what was built and what verified; its findings fold into `EVERLASTINGS_STORE.md` (Phase 10) so STORE becomes the standalone as-built truth.

---

## Pre-flight — anchors verified before editing

All quoted CURRENT blocks matched the working tree byte-for-byte (line numbers were hints; the text was the anchor). Spot-checked highest-risk anchors:
- `api/_lib/stripeSync.ts` — `SyncableProduct`@11, `stripe.products.create`@61 ✓
- `product.html:162` + `shop.html:164` inline grid styles (D1) ✓
- `assets/js/admin.js` — `Math.round(num*100)`@49, `centsToDollars`@52 (price round-trip) ✓
- **Migration anti-fragility:** the *live* `notify_stripe_sync()` in the DB equalled the plan's quoted CURRENT (the `…0502` `body := payload` jsonb fix, `is_test` guard) — confirmed `…0502` is the latest migration touching it. ✓
- **Studio check (pre-Phase-1):** `notify_stripe_sync_on_insert` is the only INSERT Stripe trigger on `products`; `set_slug` (BEFORE INSERT, slug fallback) + `set_updated_at_products` (BEFORE UPDATE) are the only other triggers; **no** Studio Database-Webhook on `products`. ✓

---

## Phase log (what changed, file by file)

**Phase 1 — migration** (`supabase/migrations/20260605000001_v1_5_draft_publish.sql`, applied via Supabase CLI to project `rvnxftbfeaxymhzxxhjm`):
- 9 columns added (`checkout_name/description/image`, `seo_thumbnail`, `is_published`, `published_at`, `draft`, `preview_token` unique, `archived_at`); `media` already existed (not re-added).
- Backfill verified live: **7 published / 2 draft** (published = had `stripe_price_id`; fail-closed otherwise); published rows got `published_at`.
- RLS swapped to a single SELECT policy `"Published products are publicly readable"` `USING (is_published = true AND archived_at IS NULL)`; the loud `USING(true)` safety guard did **not** fire (clean swap).
- `notify_stripe_sync()` gained `OR NEW.is_published = false` (drafts skip Stripe) while preserving `body := payload`.
- `pg_cron` TTL purge shipped commented/disabled.

**Group A — backend/API** (parallel subagent): `stripeSync.ts` (frozen checkout fields → Stripe), `products.ts` (3.1–3.5: GET preview/guards/`publicView`, POST create-as-draft + `?_action` routing, PUT stage-draft/live-rotation, publish/coupon/archive/discard handlers), `checkout.ts` (purchasability + alternatives guards), `config.ts` (`isTest`), `product-feed.ts` (explicit filter), `webhook.ts` (`charge.refunded`→`refunded`), `upload.ts` (JSON/URL intake + SSRF + 2 roles/crops), `vercel.json` (7 `?_action=` rewrites). `tsc --noEmit` clean, function count 11.

**Group B — frontend/design** (parallel subagent): `product.js` (preview mode + Publish bar + `populateMedia` + 7.2 container), `admin.js` + `admin/index.html` (new fields, Save-draft + publish panel, status pills, archive-replaces-delete), DESIGN D1–D8 across `product.html`/`shop.html`/`index.html`/`styles.css`/`cart.html`/`checkout.html`. **8.11 hard gate:** `state.client.from('products')` grep = **zero**.

**Group C — GPT docs** (parallel subagent): `GPT_SETUP.md` (Action schema **v1.2.0** + Instructions + §2D Web-Browsing-ON + Part 4 curl), `gpt/product-reference.md` (3 tiers + slug + knowledge sections). `gpt/voice-guide.md` confirmed evergreen — no change.

**Integration (orchestrator thread):** `main.js` 4.5b (`window._isTest` + explicit-column/`is_test` public reads) + D6 glow injection; the two `GPT_SETUP.md` miniatures-only fixes (see Deviations).

---

## Deviations (with reasoning)

1. **`main.js` kept on the orchestrator thread.** It was the only file both Group A (4.5b) and Group B (D6) would touch; to avoid a concurrent-write race I split the work by file — A did `config.ts` (4.5a), B did the D6 CSS in `styles.css`, and the orchestrator applied both `main.js` edits. No spec change; the same edits landed.
2. **`GPT_SETUP.md` §1A + Instructions-step-2 `product_type` enum → miniatures-only.** Group C surfaced (didn't patch) three stale `miniature/printable/storybook` spots the enumerated Phase 9 edits didn't name. Two are inside the doc the GPT consumes (and step-2 is the *paste-able* Instructions) — leaving them would advertise a capability the API enum rejects. Phase 9's own header says "no contradictions left," and miniatures-only is locked everywhere, so these were fixed as mixed-truth cleanup, not a new decision. The third (a dev-only curl example listing `gif-01..05`) the plan explicitly scoped out as harmless — left as-is.
3. **Dev + Preview `PRODUCT_API_KEY` unified to one fresh test key** (Sean-directed). The original `.env.local` note ("different key per scope") predated the decision to test the GPT against the preview; the security boundary that matters (Preview ≠ **Production**) is intact — only the Preview(dev) + Development scopes were rotated to a new `openssl rand -hex 32` value; Production untouched.

---

## Verification — static gate

- `npx tsc --noEmit -p tsconfig.json` → **clean** (exit 0)
- `ls api/*.ts` → **11** (no new function files)
- `node --check` → clean on `main.js`, `product.js`, `admin.js`
- `grep "state\.client\.from('products')" admin.js` → **zero**
- `vercel.json` → valid JSON, all 7 new rewrites present (publish/archive/unarchive/discard/by-slug + coupons/deactivate)

## Verification — functional (T1, live on the dev preview, Stripe test mode)

**38 assertions green, 0 real failures.** Grouped:
- **Spine:** create→draft (anon-hidden, Stripe-less) → preview-by-token → publish (Stripe product+price, token cleared) → live.
- **Regressions:** published-edit full-payload **no-400** fix; price **rotates in place** (same slug, new Stripe price, no draft); `available`/`quantity` apply **live** (neg-qty→400); **discard** clears the draft.
- **Guards:** create-injection ignored; publish-archived→409; malformed blocked at **both** first-publish and edit-publish (live row untouched); archive/unarchive.
- **Security:** upload **SSRF** blocks localhost/private/`169.254` + validates role/auth before fetch; public reads **leak no** `draft`/`preview_token`/checkout/status fields (authorized still sees them).
- **Coupons:** create/list/deactivate, owner-tagged + store-wide flag.
- **Staged-state (#28):** `getProduct.effective` overlay + cumulative array edits.

**Code-verified** (read + confirmed, not curl-exercised): purchasability guard #7/#17 (identical predicate on session + reserve), Stripe-failure-stays-buyable ordering #19, coupon auto-pagination #16, per-type-validation extensibility #24.

**Surfaced (not bugs):** the preview token **rotates on every edit** (correct — "only the latest preview link works"); the unauthorized `/api/products` returns `is_test=false` only (correct isolation — returns 0 on a test-only preview; the public *site* reads test rows via `main.js`).

## Verification — design (T2, browser render-check on the dev preview)

Verified live (Claude-in-Chrome), desktop + mobile:
- **D7 animated hero** — real `<video>`, autoplaying, muted/loop, `homepage-hero-animation.mp4` (1920×1080). ✓
- **D1 columns fix** — `/shop` renders two columns (filter sidebar + grid); the permanent-single-column bug is gone. ✓
- **D4 filter dropdowns** — Series/Type/Availability are native `<details>` (Series open, others collapsed, +/− caret); sort intact. ✓
- **D2 product two-column + sticky aside** — `grid-template-areas:"gallery aside" "story aside" "media ."`, child order gallery→aside→story→media (buy card precedes media), aside `position:sticky` with the inner card neutralized to `static`; Details under the card; Related rail renders. ✓
- **D3 story-card** — body font, `font-style:normal` (no longer display-serif italic). ✓
- **Media matrix** — GIF-like autoplay (silent, no controls, plays in view), click-to-play (controls), YouTube after MP4, **MP4-first sort confirmed** (mixed fixture authored YouTube-first still renders MP4 first), images-only + empty-media both hide the section. ✓
- **Preview mode** — "Draft preview — not yet live" banner + "PREVIEW ONLY" disabled buy buttons. ✓
- **Mobile (<768px)** — product layout single-columns gallery→aside→story→media; hamburger nav. ✓
- **Console** — no errors across homepage / shop / product. ✓

**Design feedback applied (D6 glow → fireplace):** two feedback rounds. The edge-frame still read too wide; rebuilt (from web research — subagent) into a **thin fireplace-flicker rim**: `inset` box-shadow band hugging all four viewport edges, irregular opacity/blur flicker + `@property` oklch fire-colour cycling (red→orange→amber→gold), per-page random fire temperature, a barely-there vignette backing, reduced-motion = steady. Layered **on top** (`z-index:9998`, `pointer-events:none`, rim-only) so it frames the viewport consistently on every page without obscuring content (verified: buy card still clickable; `getAnimations()` confirms flicker + colour cycle run; no console errors). Commits `b19bb34`→`f18dcdb`. **Intensity / flicker-speed / band-thickness remain Sean's final aesthetic tune.** (Deferred enhancement found in research: SVG `feTurbulence` for organic flame-edge writhe — heavier, optional.)

**Shop nav (pre-existing — now FIXED):** the Shop dropdown trigger showed a stray mark because `.site-nav` (flex) had no `align-items`, so the `.nav-dropdown` span stretched full-height and "Shop" sat high. Added `align-items:center` (+ inline-flex centering on `.nav-dropdown`); verified the nav baseline is now even (Shop top == Home top). Dropdown hover unchanged.

---

## Remaining before ship

- **Glow aesthetic** — Sean's eye on the retuned edge-frame glow (intensity + per-page hues) on the live preview; tune if needed.
- **#10 GPT behaviour** — Sean configures the Custom GPT (his account), Action → preview + the preview key, Web Browsing ON.
- **#22 refund** — Sean enables `charge.refunded` on the Stripe webhook (test mode), then a full test refund flips order status to `refunded`.
- **Phase 10 as-built docs** (`EVERLASTINGS_STORE.md`, `STORE_ADMINISTRATION.md`, `BRAND.md`, `README.md`) — written last, after testing + bug-fix.

## Sean's launch / cutover to-dos (post sign-off)

Live Stripe keys (Production scope) + live-mode coupon bootstrap · point the GPT at **production** + the production key · add the remaining admin logins (Supabase Auth) · content-placeholder gate (`grep -rn 'PLACEHOLDER:' .` = 0) · `charge.refunded` on the **live** endpoint · Stripe receipt branding · DNS · then `dev → main` ff-merge + tag `v2.0.0`.
