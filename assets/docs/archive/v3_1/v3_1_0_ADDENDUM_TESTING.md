# v3.1.0 — Testing Addendum

**Addendum to**: `v3_1_0_IMPLEMENT.md` (same version; bumps in lockstep; always in gap-review scope).
**Where**: the **dev preview** URL (NOT localhost) — Preview env, Preview `PRODUCT_API_KEY`, Deployment Protection (SSO) **off** for the run so Stripe webhooks + the GPT can reach it. Stripe **test mode**. The GPT pointed at the dev preview with the Preview key.
**Bar**: every assertion green before promotion. Design is tested + feedback'd like functionality (concrete default + render-tune with Sean). Real content is never a gate — production-grade placeholders stand in.

> **Static gate (first):** `npx tsc --noEmit -p tsconfig.json` clean · `ls api/*.ts` count unchanged (refund folds into `orders.ts`, attach into `upload.ts` — no new function) · `node --check` clean on `admin.js` / `product.js` / `homepage.js` · `vercel.json` valid JSON with the 2 new rewrites (`/api/orders/:id/refund`, `/api/upload/attach`) · GPT schema valid + every `summary` < 300 chars.

---

## WS1 — Refund (both surfaces)

1. **/admin, published-but-sold piece:** a test order exists for it → Orders tab → **Refund order** → confirm → "Refunded"; the order flips to the **Refunded** pill (re-list prompt appears) → accept → "Refunded + relisted"; the product shows **available** again on `/shop`. Verify in Stripe test dashboard the refund exists.
2. **/admin, archived piece:** refund → relist prompt → accept → the piece **unarchives** (back in `/shop`); decline on another → stays archived.
3. **GPT:** "refund <buyer>'s order for <product>" → it **reads back** piece + amount + buyer and waits → confirm → `refundOrder` → it reports refunded + **asks** relist-or-leave → "relist" → `editProduct {available:true}` (or `unarchiveProduct`) runs.
4. **Idempotency:** trigger a refund twice fast (double-click / retry) → exactly **one** Stripe refund (idempotency key `refund-<id>`); second returns the already-refunded 409, no double-refund.
5. **Guards:** refund a non-existent id → 404; an already-refunded order → 409; an order with no `payment_intent` → 409; refund a piece that is **still `available`** (e.g. multi-qty) → refund succeeds, **no relist prompt** (nothing to relist), no error.
6. **Webhook reconciliation:** after the API refund, the `charge.refunded` event also arrives → order stays `refunded` (no error, idempotent double-write).
7. **Partial:** confirm the GPT/admin route partials to the Stripe dashboard (not offered in-app).
8. **`is_test` isolation:** on the test preview, the refund lookup is `is_test`-scoped — a prod order id is **not** found (404).

## WS2 — Coupons in /admin + human dates

9. **Create (store-wide):** Coupons tab → 20% off, code blank, "Ends after" = a date → read-back confirm → created; the **Running sales** list shows it with a **plain-date** `ends …` (not a raw timestamp).
10. **Create (product-scoped):** pick a published product in the scope picker → created scoped to its `stripe_product_id`; an unpublished product is **not** offered.
11. **Amount + min + cap:** `$ off` 5, min $50, max 100 → values land as **cents** (500 / 5000) and the cap shows in the list.
12. **Deactivate:** **End sale** → confirm → it leaves the list; Stripe shows the promo `active:false`.
13. **GPT parity + dates:** `listCoupons` returns `expires_display`; the GPT relays the **plain date** and never decodes a timestamp (the `FEEDBACK_COUPON` regression). createCoupon → the GPT **reads the full terms back** before creating.

## WS3 — Chat-attach upload + admin media UX

14. **Attach 1 photo (desktop ChatGPT):** GPT calls `uploadImages`; one CDN url back; it lands under `test/<slug>/hero-<slug>.webp`.
15. **Attach a 7-photo batch:** 7 uploads; first = `hero`, rest = `gallery-0N`; `createProduct` succeeds reusing the hero url for thumbnail.
16. **`roles[]` honored:** attach 3 + tell the GPT which is the hero / a detail → returned roles match.
17. **> 10 / expiry / fallback:** > 10 in one call → friendly "batch it"; a stalled (expired) link → friendly "re-attach"; blank `openaiFileIdRefs` → GPT falls back to asking for a Drive/direct link (`uploadImage` still works).
18. **Mobile attach (iOS/Android ChatGPT app):** the headline cross-device case — attach from the phone, product builds.
19. **Alt text:** the GPT sets a descriptive `alt` on every image + `thumbnail_alt` (no blank alts on the rendered page).
20. **Filename/role:** the frontend categorizes hero vs gallery correctly (role read from the `{role}-{slug}` filename) — no mis-placed images; nobody renamed a file.
21. **Admin media editor:** open a product → the **structured MP4/YouTube rows** show (not raw JSON); add a clip, set GIF-like vs click-to-play + poster + alt, Save → reopen → round-trips identically; the page renders it (MP4 before YouTube). A YouTube row hides the video-only options.
22. **Admin image previews + coverage:** pasting/uploading image urls shows thumbnails + role tags; the **hero / gallery N/5 / thumbnail** hint updates live.
23. **Auto-skip_transform:** upload an MP4 via the admin control **without** ticking skip_transform → it's stored as-is (no Cloudinary crop); an image still transforms.

## WS4 — Admin polish (neutral/template)

24. **Brand-neutral + tokens:** the `:root` token system applied; no raw hex literals remain; storefront brand untouched.
25. **State visibility:** product cards show a clear status badge (live / draft / edits / sold / archived); archived dimmed.
26. **Nav (P0):** clicking into a product shows a clear **← Products** return; the browser Back button is no longer the only way out; the active tab is obvious.
27. **State-filter (P0):** the product list filters by **All / Live / Draft / Sold / Archived**.
28. **States + mobile:** skeleton/loading + empty + error states render; the panel is usable at a phone width (≤640px) — forms stack, no horizontal overflow.
29. **Render-tune:** Sean's eye on the live look (accent, spacing, type) — adjust to taste.

## WS5 — Homepage experience

30. **Lottie title:** the hero title writes itself in on load (lottie-web SVG); a real `<h1>` is in the DOM (view-source / a11y tree) for SEO; `prefers-reduced-motion: reduce` → static styled `<h1>`, no Lottie; a blocked/404 JSON → static `<h1>` still shows (no blank hero).
31. **Old-film hero:** the re-rendered MP4 (versioned CDN key) plays with the grade/grain/flare; the poster re-graded to match; parallax / overlay / spotlight / edge-glow + the reduced-motion poster fallback all still work; `npx hyperframes lint` clean on the composition.

## Cross-cutting invariants

- `npx tsc --noEmit` clean after every TS edit · CORS unaffected (`*.vercel.app` allowlist) · `is_test` keys stay under `test/…` on preview · the go-live (`main`) version is untouched throughout.
