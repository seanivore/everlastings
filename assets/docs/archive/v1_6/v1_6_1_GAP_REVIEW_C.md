# Angle C — Integration / system-fit gap review (v1.6.1)

**Reviewer lens (North Star):** minimize the owner's friction to run her entire store by chat via her Custom GPT — the GPT should do what a capable agent (Claude Code + skills/MCPs) could. Hunt for gaps where an edit is locally correct but, in the wider system, makes a by-chat capability fail or leak. Structural limit respected: a GPT Action is JSON-only and can't forward a pasted file → media arrives by URL.

**Method.** Read the whole build (EVERLASTINGS_STORE.md → v1_6_1_IMPLEMENT.md → v1_6_1_ADDENDUM_DESIGN.md → v1_6_1_ADDENDUM_TESTING.md) and validated every integration-bearing claim against the **actual working tree** — `api/*.ts`, the five migrations, `main.js` / `product.js` / `shop.js` / `homepage.js` / `admin.js`, the HTML anchors (`product.html` / `shop.html` / `index.html`), `styles.css`, and `GPT_SETUP.md`. Byte-anchors matched reality on every block spot-checked.

---

## Verdict

**NEEDS ANOTHER PASS — narrow.** The architecture is sound and the store is genuinely fully chat-drivable; the server-side integration (draft/publish, price-rotation order, checkout guards, refund branch, coupon isolation, upload dual-intake, the admin service-role read-path, the operationId→rewrite map) is correct against the real code. But there is **one real integration/security gap** (a publish-capability token leaked to the public on every read of a mid-edit product) plus **one design-integration gap** (the D7 hero spotlight is silently overridden by an existing in-page rule). Fold both, then this is READY TO BUILD.

## The single most important fix

**Stop leaking `preview_token` (the publish capability) and `draft` to unauthenticated callers.** The v1.5 migration adds `preview_token` + `draft` to `products`, but the two public read paths still use `select('*')`, so any published product that currently has staged edits hands its `preview_token` to the public — and `handlePublish` accepts `{token}` with **no auth** ("possessing the link = authority"), so a harvested token lets a stranger force-publish the owner's un-approved staged edits. (Finding C1.)

---

## Ranked findings

### C1 — [HIGH] Public reads leak `preview_token` (publish capability) + `draft` on a mid-edit product

**Where**
- `api/products.ts` GET, **unauthorized slug branch** (Phase 3.2 NEW): after the `is_published`/`archived_at` filter it falls through to `return jsonResponse(request, data)` where `data` came from `select('*')`. The `effective`/`preview_url` shaping is gated on `isAuthorized`, but the **bare `data` returned to the public still contains every column** — including `draft` and `preview_token`.
- `api/products.ts` GET, **unauthorized list branch** (Phase 3.2): returns `{ products: data }` from `select('*')` — same leak, for every published-with-pending-edits row at once (easiest to harvest).
- `assets/js/main.js` `getProductBySlug` (:57) and `getProducts` (:69): the **browser anon client** also does `select('*')`. Under the new RLS the anon role still has column-level SELECT on all columns, so the browser receives `preview_token` + `draft` in the product row for any published product it can see (readable in the Network tab).

**The integration risk (this is exactly the Angle-C shape: a locally-correct change that breaks the wider model).** v1.5 correctly hides *rows* (drafts/archived) from the public, but never hid the new *sensitive columns* on the rows that stay public. The exploit window is a **published product that currently has staged edits** — the PUT published branch sets BOTH `draft` and a fresh `preview_token` (§3.4), and that row passes the public `is_published=true` filter. So:
1. Attacker hits `GET /api/products` (or `?slug=X`, or just views the live product page) and reads `preview_token`.
2. Attacker `POST /api/products/publish {token}` — no auth required — and the owner's previewed-but-not-approved draft goes live.

Blast radius is integrity, not arbitrary injection: the attacker can only force-apply the *owner's own* staged edits (they can't write the draft without auth), and a brand-new unpublished draft is safe (it's `is_published=false`, so the public filter hides the whole row). But it still defeats the "unguessable, secret token = capability" model on a client's live storefront, and exposes unpublished copy/photos/SEO. The team protected `discardEdits` from token-holder abuse (auth-only, no token path) but left the token itself publicly readable — so the protection is half-applied. Note `api/product-feed.ts` is already immune because it selects explicit columns — that is the fix pattern.

**Concrete fix**
- `api/products.ts`: never return `draft`/`preview_token` (and ideally `is_test`) to an unauthorized caller. Simplest — a small `publicView(row)` that strips them, applied on the unauthorized slug + list branches:
  ```ts
  function publicView<T extends Record<string, unknown>>(row: T) {
    const { draft, preview_token, is_test, ...pub } = row; return pub;
  }
  ```
  Unauthorized slug branch → `return jsonResponse(request, publicView(data));`
  Unauthorized list branch → `return jsonResponse(request, { products: (data ?? []).map(publicView) });`
  (Authorized branches are unchanged — they intentionally surface `draft`/`preview_token`/`effective`/`preview_url`.)
- `assets/js/main.js`: change `getProductBySlug` + `getProducts` from `.select('*')` to an explicit public column list (everything the page renders — `id, slug, title, headline, story_card, description, features, price, dimensions, weight, materials, power_supply, care_instructions, shipping_details, product_type, series, available, quantity, featured, images, thumbnail, thumbnail_alt, media, seo_title, seo_description, seo_thumbnail, artist_note, stripe_price_id, homepage_theme, created_at`) — i.e. omit `draft`, `preview_token`. (The browser is the anon key; RLS can't column-filter, so the projection has to live here.)
- Defense-in-depth (optional, cheap): in the Phase 1 migration, `REVOKE SELECT (draft, preview_token) ON products FROM anon, authenticated;` so even a future `select('*')` can't pull them. (Requires main.js to already use explicit columns, since `select('*')` would then error for anon — which the bullet above does.)
- Add a Phase-11 / testing-addendum assertion: stage an edit on a published product, then unauthenticated `GET /api/products?slug=<it>` and `GET /api/products` → the response carries **no** `preview_token` and **no** `draft`.

### C2 — [MEDIUM] D7 hero spotlight is silently overridden by index.html's existing in-page `<style>`

**Where** `v1_6_1_ADDENDUM_DESIGN.md` D7 vs `index.html:346-382` (the page's own `<style>` block).

**The integration risk.** D7 says the hero is "already CSS-ready" and tells the builder to *add* a `.hero__spotlight` rule (warm `glow-breathe` radial, `mix-blend-mode: screen`) to `styles.css`. But `index.html` already defines `.hero__spotlight` inline at `:353-366` — a **dark** `rgba(26,26,26,…)` scrim with `mix-blend-mode: multiply`. The page's in-page `<style>` is parsed **after** the external `styles.css`, and both selectors are equal specificity (`.hero__spotlight`), so **later-source-wins → the existing dark scrim overrides D7's warm glow + animation.** A builder who follows D7 literally adds the rule to styles.css and sees *no* theatrical layer — a locally-correct edit defeated by the cascade. (The `<img>`→`<video>` swap and the `.hero__video { display:none }` reduced-motion leg still work; only the spotlight layer no-ops. There is also an existing scroll-driven `.hero__media` counter-motion at `:368-378` D7 doesn't mention.)

**Concrete fix.** D7 should **edit the existing `.hero__spotlight` rule in index.html's in-page `<style>`** (replace the dark multiply scrim's `background`/`mix-blend-mode` with the warm screen glow + `animation: glow-breathe …`), not add a competing rule to styles.css — or relocate the whole hero `<style>` block into styles.css and delete the in-page duplicate. Reduced-motion: index.html already has `.hero__media { animation:none !important … }` at `:380-382`; fold D7's `.hero__video { display:none }` + the poster `background-image` into that same block so the reduced-motion treatment lives in one place. Call out the existing `:368-378` counter-scroll so the video parallax is intentional, not a surprise.

### C3 — [LOW] Shop filters still offer Storybooks / Printables on a miniatures-only store

**Where** `shop.html:196-198` — `data-shop-filter="product_type"` values `storybook`, `printable`; D4 preserves them verbatim.

**The integration risk.** The store is miniatures-only now (the GPT create/edit enums are `[miniature]`, and §3.3 makes new types deferred future work). These two filters can never match a product, so they always fall to the empty state — harmless, but a filter that never returns anything reads as broken/unfinished on a showcase storefront. Same class as D4's explicitly-deferred "smart-hide single-value filter groups."

**Concrete fix (optional).** Either drop the `storybook`/`printable` `<label>` options from `shop.html` now to match the shipped scope, or keep them and accept the deferral — but if kept, note it as a known cosmetic so it isn't mistaken for a filter bug during the design test pass. Low priority; not a blocker.

---

## What I verified clean (so the coverage is on record)

**Server-side state machine + Stripe (all correct against the real code):**
- **Price rotation order is fixed.** The current `products.ts` PUT does the dangerous *deactivate-old → create-new* (`:264-270`); the plan's §3.4 NEW correctly reorders to **create-new → write-DB → deactivate-old (best-effort)**, with a 502 leaving the DB untouched and the old price still active+referenced. A mid-rotation Stripe failure leaves the product buyable. ✓ (Test #19.)
- **Stripe created only at publish.** Migration adds `OR NEW.is_published = false` to `notify_stripe_sync` (keeping the `body := payload` jsonb fix from `…0502`), trigger stays AFTER INSERT only, and `handlePublish` calls `syncProductToStripe` inline. Drafts never orphan Stripe objects. ✓
- **`validateProductRules` runs on BOTH publish branches** (first-publish and edit-publish), so a draft that blanked `story_card`/`images` can't ship live. ✓ (Tests #25/#26.)
- **The published-edit 400 bug (G1/#7) is genuinely fixed.** `FROZEN_AFTER_PUBLISH` rejects only *changed* frozen fields (`updates[f] !== current[f]`); I traced the admin round-trip (openEditor `eff` populate → `buildProductPayload` full payload → unchanged `checkout_*` re-send) and it does not 400; a real price change rotates and stages nothing. ✓
- **Change-detection invariant holds.** `draft` = only fields differing from LIVE (JSON.stringify compare vs `current[k]`); `available`/`quantity`/`price` pulled out and applied live; a no-op re-save returns `no_changes`/stages nothing. The `homepage_theme` key-order edge is acknowledged + cosmetic. ✓ (Tests #6/#23/#27.)
- **Price round-trip is exact:** confirmed `admin.js:49 dollarsToCents = Math.round(num*100)` and `centsToDollars` `(cents/100).toFixed(2)` — `24599 → "245.99" → 24599`, so an unchanged price never spuriously rotates. ✓

**The load-bearing admin read-path (the plan's own hard gate) — confirmed:**
- `admin.js:222 loadProducts` reads via `fetch('/api/products', {authHeader})` (the **service-role API**, RLS-bypassing), NOT the RLS-bound `state.client`. The **only** `state.client.from('products')` is the line-480 hard delete that Phase 8.11 replaces with `onArchiveToggle` (API call). So after the RLS swap the admin does **not** go blind to drafts/archived, and the `grep -n "state\.client\.from('products')"` hard-gate will return zero post-Phase-8. ✓

**Public/checkout/feed isolation (rows) — confirmed handled (not re-flagging G4/G5):**
- `checkout.ts` is service-role; §4.1/4.2 add `is_published`/`archived_at` to both the session and reserve purchasability checks, and §4.3 adds them to **both** the series-related and fallback "alternatives" rails — so a sold-item suggestion never surfaces a draft/archived/dead link. ✓ (Test #17.) A draft (no `stripe_price_id`, `is_published=false`) is doubly blocked from reserve/checkout. ✓ (Test #7.)
- `product-feed.ts` selects explicit columns + §4.6 adds `is_published`/`archived_at` (anon client, RLS + explicit filter). No `preview_token` leak in the feed. ✓
- `main.js` is the only anon product reader; `shop.js:9`, `homepage.js:10`, `product.js:20/292` all route through `getProducts`/`getProductBySlug`; §4.5b adds the `is_test` filter in one place. `getProducts(options)` already supports `{featured, available, series, product_type}` so `homepage.js` keeps working. ✓ (But see C1 for the *column* leak on this same path.)

**Refund branch (D2/#10) — confirmed:**
- `charge.refunded` is inserted **after** the idempotency claim and **before** the `!== 'checkout.session.completed'` no-op early-return (current `:60`), so it's de-duped by the existing 23505 claim and actually runs. Full-vs-partial via `amount_refunded >= amount`; matches by `stripe_payment_intent`; returns 200 on error (no retry storm); `Stripe.Charge` resolves against the existing `import type Stripe`. `orders.ts:67 listOrders` filters `is_test`, so the GPT reports the flipped status truthfully. ✓ (Test #22; operator note to enable the event on BOTH test+live endpoints is present.)

**Upload media-by-link end-to-end (D1/#31) — confirmed:**
- The new JSON branch sits strictly after the `:81 authorize` gate; validates `role` (ROLE_PATTERN) **before** fetching; SSRF guard (`isPublicHttpUrl`: https-only, blocks loopback/private/link-local v4+v6, with the `:`-gated v6 check so `fcdn.example.com` isn't blocked); Drive share→direct normalization; content-type re-check; then the **same** pipeline (size cap on fetched `.size`, Cloudinary transform for images, MP4 passthrough at 50 MB via `skip_transform`). Multipart (admin/curl) unchanged. New roles `checkout_image` (1:1) + `seo_thumbnail` (1.91:1) added with crops; both store in scalar columns so they bypass the hero/gallery min-count check. ✓ (Tests #20/#21.) Traced the whole by-chat media path on prod (no `test_` prefix) and on preview (`test_` stripped by the validator) — both validate. ✓

**Coupon isolation (1.5) — confirmed against the real call sites:**
- `cart.ts:87` stamps the **promotion code** `source:'cart-recovery'` (coupon `cart-recovery-10` untagged); `subscribe.ts:40` sets no metadata; `_bootstrap/coupons.ts` sets no metadata. So `pc.coupon?.metadata?.source === 'owner_sale'` matches **only** owner coupons. `listCoupons` auto-paginates (`for await`, SCAN_CAP) so accumulating system codes can't truncate real sales; `deactivateCoupon` 403s a system code; the nested `coupon` object is present on each promo code by default (correct Stripe behaviour). ✓ (Tests #8/#16.) Product-scoped coupon on a draft is guided ("publish first") because a draft has no `stripe_product_id`. ✓

**The by-chat surface (North Star) — operationId → rewrite map is consistent:**
- Every new Action maps cleanly through `vercel.json`: `editProduct`→PUT `/api/products?id=`; `getProduct`→`/api/products/by-slug/{slug}`→`?slug=`; `publish/archive/unarchive/discard`→`?_action=`; `createCoupon`/`listCoupons`→POST/GET `/api/coupons`→`?_action=coupon` (method splits the handler); `deactivateCoupon`→`?_action=coupon_deactivate`; no `/api/products/:x` param rewrite precedes the literals, so nothing is shadowed. `uploadImage` JSON branch. All inherit the existing Bearer scheme under one `servers:` (prod). ✓
- The effective-fallback (#32) is wired: authorized `getProduct` returns `effective` (live+staged) when `preview_token||draft`; `listProducts` returns the bare row (live + `draft` separately); §9.2 EDITING tells the GPT to `getProduct` by the **exact** slug after a `listProducts` 404-match before any array edit, and to build full `images`/`media` from `effective`. ✓ (Tests #28.) The convergent server slugify (NFKD ASCII-fold + strip + empty-guard) matches the GPT's documented slug derivation, so uploads land in the same CDN folder as the product. ✓
- featured/series (#33) are triggerable: both carry `description`s in the schemas and §9.2 maps "feature this" → `{featured:true}` and "add to <collection>" → `{series:"…"}`, both staging on a published piece. ✓
- The site-vs-store boundary (#34) is stated to Em in Phase 10b; refunds-by-guidance + web-browsing-ON requirement are in §9.2 + the config note; the curl Part 4 / no-op-rationale (#35/#36) repairs are present. ✓
- Design ordering (the explicit Angle-C ask): D2's HTML moves operate on the **post-7.2** `[data-product-media]` container; after the moves the direct children of `.product-layout` (gallery, story-card, media, sticky-card, details) match the `grid-template-areas`; and **`product.js` binds entirely by `document.querySelector([data-*]/.class)`, which is position-independent — relocating the blocks does not break `populateHero/Gallery/Story/Media/Features` or the cart-button wiring** (the buttons at `product.html:289-290` are real `<button>`s, so `disabled` works for the preview lock). `.hidden { display:none !important }` (styles.css:623) keeps the empty media container hidden over D3's `display:grid`. ✓

**Idempotency / zombie / state-machine edges — handled:** re-publish (no draft → `no_changes`), publish of an archived row → 409 (Phase 3.5 guard, even via a stale token), discard auth-only, Studio INSERT-with-`is_published=true` and UPDATE-flip zombies are documented operator warnings (Phase 10b), concurrent first-publish duplicate is a noted v1.1 deferral. `is_test` is never user-editable (CREATE_FIELDS/DRAFTABLE/FROZEN allow-lists exclude it; server sets it). ✓

---

## Notes
- C1 is the one to treat as a true gate-blocker — it's a live-storefront capability leak introduced *by* v1.5's new columns, and the fix is small and surgical (strip on two public branches + explicit columns in main.js). C2 is a real "the edit silently does nothing" design-integration trap worth fixing before the build wastes a render cycle on it. C3 is optional polish.
- Everything else traced is correct against the working tree; the plan's byte-anchors matched reality on every block spot-checked (migrations, products.ts, checkout.ts, upload.ts, webhook.ts, main.js, admin.js, product.html/shop.html/index.html, GPT_SETUP.md).
