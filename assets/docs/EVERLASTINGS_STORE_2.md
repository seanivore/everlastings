# Everlastings by Emaline Architecture Overview
`everlastingsbyemaline.com`

> ## ⭐ Product North Star (the lens for design + every gap review)
> **Minimize the owner's friction to manage her entire digital product — the site, the store, and her
> sales — by offloading the work to her Custom GPT.** Em runs everything by chatting with the GPT
> (OpenAI web / iOS / Android); the GPT should be able to do anything a capable agent (e.g. Claude Code
> with skills + MCPs) could do on her behalf. Judge features and gaps against this — "can Em do this by
> chat, with the least friction?" — not against whether the docs are internally consistent. Structural
> limit to respect: a Custom GPT **Action** sends JSON and cannot forward a file pasted into the chat
> (Code Interpreter has no network), so **media arrives by link** (the GPT fetches a Drive/direct URL),
> and the GPT asks for a link when a file is pasted.

**Created**: 2026-03-16
**Updated**: 2026-06-05 — **v1.4.9 BUILT + VERIFIED LIVE** on the dev preview (`v1_4_9_BUILD_REPORT.md`): the full buy→order→merchant-email→admin-ship→buyer-tracking-email loop works end-to-end (checkout repaired — the real bug was `phone_number_collection` forcing an unsatisfiable phone field). Launch to-dos: re-enable preview SSO (Sean), Custom GPT setup, content placeholders, C5 cutover. **Next: v1.5.0** — AI store-management (GPT edit + draft/preview/publish + coupons + admin unify), then design; single living plan at `archive/v1_5/v1_5_5_IMPLEMENT.md`. _(Per-version build history lives in the `archive/v1_4/` + `archive/v1_5/` packets and their `*_BUILD_REPORT.md` / `*_GAP_REVIEW_*` files — not duplicated here.)_
**Version**: v1.4.9
**Status**: Tracks A/B/C **built and verified end-to-end on the dev preview** (`v1_4_9_BUILD_REPORT.md`) — checkout repaired (single-phase), order→merchant-email→admin-ship→buyer-tracking-email loop confirmed. Pre-launch tasks remain (re-enable preview SSO; Custom GPT setup; content placeholders; C5 cutover). **v1.5.0 in planning** (AI store-management then design — single living plan `archive/v1_5/v1_5_5_IMPLEMENT.md`, in the gap-review gate). Preview-only; not yet launched.
**Build Guide** (current, exclusively-executable):
  - `assets/docs/archive/v1_4/v1_4_9_FINISH_TRACK_C.md` — checkout repair (single-phase), merchant email, admin/GPT fulfillment, Supabase keep-alive cron, end-to-end verification (prior `v1_4_7` / `v1_4_8_FINISH_TRACK_C.md` retained in the same folder for history)
  - `assets/docs/archive/v1_4/v1_4_9_BUILD_REPORT.md` — what actually shipped in v1.4.9 + deviations (phone-collection removal, `friendlyPaymentError`, the two launch findings)
  - `assets/docs/archive/v1_5/v1_5_5_IMPLEMENT.md` — **next**: AI store-management (GPT edit + draft/preview/publish + coupons + admin unify) then design; the single living, exclusively-executable plan (build + spec merged; v1_5_0…v1_5_4 superseded). Reviews: `v1_5_5_REVIEW_PROMPTS.md`
**Operating docs** (living; how the store is run day-to-day):
  - `assets/docs/STORE_ADMINISTRATION.md` — the client's plain how-to (products + orders across the Custom GPT, Admin panel, and Supabase Studio)
  - `assets/docs/GPT_SETUP.md` — the "Sunkeeper" Custom GPT brain + setup, plus the agentic/curl product protocol
  - `assets/docs/gpt/` — curated Custom-GPT Knowledge uploads (`voice-guide.md`, `product-reference.md`)
**History** (archived; not required reading):
  - `assets/docs/archive/v1_4/v1_4_5_C_IMPLEMENT.md` — Track C wiring (C1–C5); `v1_4_5_C_SESSION_REPORT.md` — the 5-round checkout saga + Sean's launch punch list
  - `assets/docs/archive/v1_4/v1_4_4_IMPLEMENT_UPDATES.md` — consolidated changes v1.4.3 → v1.4.5

---

## Executive Summary

  + **Purpose**: This document provides everything a new AI instance needs to understand and work on this project effectively; it also serves as comprehensive technical documentation
  + **Use**: Read this first before making any changes

---

## Tech Stack at a Glance

| Layer         | What we use                                             | Why                                                     |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| Frontend      | Vanilla HTML + CSS + JS, loaded directly in the browser | No build step, no framework, no React. Proven pattern.  |
| Frontend libs | `@supabase/supabase-js` + `stripe.js` via jsDelivr CDN  | Script tags only. No npm install for the browser.       |
| Backend       | TypeScript in Vercel Serverless Functions (Node.js)     | Type safety for Stripe + Supabase server-side calls.    |
| Backend libs  | `npm install` only inside `/api/*.ts` world             | `package.json` drives normal Node/TS toolchain for API  |
| Runtime       | Vercel (free tier)                                      | Auto-deploy, per-branch env vars, serverless functions. |
| Database      | Supabase Postgres (free tier)                           | REST API + RLS + Auth + Studio UI.                      |
| Product CDN   | Cloudflare R2 at `cdn.everlastingsbyemaline.com`        | Public product media CDN. Cloudinary is not a host      |
| Payments      | Stripe Custom Checkout (`ui_mode: 'custom'`)            | On-site checkout with full brand control.               |
| Email         | Resend                                                  | Transactional email; free tier 3k/mo.                   |
| Shipping      | Shippo Starter (web UI only in v1)                      | 30 free USPS labels/mo.                                 |
| Analytics     | GA4 (gtag.js) + Meta Pixel                              | CDN script tags. No GTM.                                |

**What we are NOT using** (and why some vendor docs might suggest these):

  + **No Next.js, no React, no SSR.** Supabase's dashboard "Connect" modal and the `@supabase/ssr` package assume Next.js — ignore them.
  + **No MCP-first toolchain.** Where a standard CLI (Supabase CLI, Stripe CLI, Vercel CLI) does the job, use it. MCP is an optional fallback only.
  + **No Supabase Branching and no Supabase/Vercel Marketplace integration.** Both are optimized for branching-based dev workflows; the `is_test` flag + shared-project design already handles dev/prod separation.

---

## Plain-English Glossary

Terms used throughout the implementation guides that are easy to misread if you're coming from a different stack:

- **Apply migrations** — Run the SQL that creates all 8 tables + the RLS rules + the auto-update triggers. Equivalent: run the create-tables SQL once.
- **Migrations via MCP** — Using the Supabase MCP server tool to run that SQL. Optional — Supabase CLI does the same. Default: **Supabase CLI `supabase db push`**.
- **Supabase DB webhook** — A Supabase Studio setting: "when a row is inserted into `products`, POST to this URL." An HTTP trigger fired by the database, like an IFTTT rule on row insert. Used to push new product rows into Stripe via `POST /api/stripe-sync`. Agent-driven callers can bypass the wait by adding `?sync=true` to their `POST /api/products` call (see AR #35); the same helper runs inline and the eventual webhook fire becomes a no-op.
- **Stripe webhook** — Stripe's outbound notification when a payment completes. Standard Stripe webhook. Unrelated to the Supabase DB webhook above.
- **Stripe coupon bootstrap** — A one-time script that creates the two base coupons in Stripe via API so dev and prod match. Run once. Alternative: click-create them in the Stripe dashboard.
- **Preview CORS smoke test** — Push a throwaway branch; open the Vercel preview URL; confirm API calls work. A 2-minute sanity check — past projects had invisible CORS bugs on preview deployments.
- **Publishable key / secret key** — Supabase's new (Nov 2025+) API key format. Replaces legacy `anon` / `service_role` one-for-one. Frontend-safe key / server-only key. Same roles, new names.

---

## Table of Contents

  1. [Project Overview](#project-overview)
  2. [Architecture Overview](#architecture-overview)
  3. [How to Run & Test Locally](#how-to-run--test-locally)
  4. [File Structure & Key Files](#file-structure--key-files)
  5. [Data Flow](#data-flow)
  6. [Design System & Styling](#design-system--styling)
  7. [Common Pitfalls & Important Notes](#common-pitfalls--important-notes)
  8. [Deployment](#deployment)

---

## Architecture Overview

### System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│              FRONTEND — Vanilla HTML/CSS/JS on Vercel            │
│                                                                  │
│  index.html     shop.html     product.html     checkout.html     │
│  about.html     contact.html     /admin (protected)              │
│                                                                  │
│  - JS fetches product data from Supabase REST API                │
│  - Stripe.js renders custom checkout (ui_mode: 'custom')         │
│  - CSS custom properties for theming                             │
│  - Mobile-first responsive design                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│            VERCEL SERVERLESS FUNCTIONS — TypeScript                 │
│            (11 deployed functions; public URLs below)               │
│                                                                     │
│  POST   /api/checkout/reserve  → availability + 15-min soft hold    │
│  POST   /api/checkout          → create Stripe session (post-hold)  │
│  GET    /api/session-status    → return page payment verification   │
│  POST   /api/webhook           → handle Stripe payment events       │
│  POST   /api/stripe-sync       → create Stripe Product+Price (DB    │
│                                  webhook + inline ?sync=true caller)│
│  POST   /api/upload            → signed Cloudinary transform → R2   │
│  POST   /api/cart-recovery     → sold-in-cart promo code + email    │
│  GET/POST/PUT /api/products    → CRUD for AI-assisted creation      │
│  GET    /api/orders            → admin: list orders by ship status  │
│  PATCH  /api/orders/:id        → admin: record tracking + fire email│
│  POST   /api/cart-activity     → product interest notification      │
│  GET    /api/product-feed      → CSV feed for Meta Commerce Catalog │
│  GET    /api/config            → public config (Stripe key per env) │
│  POST   /api/subscribe         → newsletter email capture           │
│  POST   /api/contact           → contact form handler               │
│                                                                     │
│  Helpers (not deployed):                                            │
│    api/_lib/         cors, env, adminAuth, stripeSync               │
│    api/_emails/      Resend templates (tracking, welcome, recovery) │
│    api/_bootstrap/   one-time scripts (Stripe coupons)              │
│                                                                     │
│  Several public URLs route into a single .ts file via vercel.json   │
│  rewrites + ?_action= dispatch — see Architecture Reference #34.    │
└──────────┬───────────────────────────────────┬──────────────────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────────────┐   ┌────────────────────────────────────┐
│       SUPABASE           │   │       CLOUDFLARE R2                │
│                          │   │                                    │
│  Tables (8):             │   │  /products/{slug}/                 │
│    products              │   │    hero-{slug}.webp                │
│    customers             │   │    gallery-{slug}-01.webp          │
│    orders                │   │    thumbnail-{slug}.webp           │
│    subscribers           │   │    video-{slug}-01.mp4             │
│    site_config           │   │    detail-{slug}-01.gif            │
│    webhook_events        │   │                                    │
│    product_interests     │   │  /brand/                           │
│    cart_holds            │   │    logo.svg, favicon, etc.         │
│                          │   │                                    │
│  Auth: admin login       │   │  Public CDN access via             │
│  RLS: row-level security │   │  cdn.everlastingsbyemaline.com     │
│  DB Webhooks: on INSERT  │   │                                    │
└──────────────────────────┘   └────────────────────────────────────┘
           │
           ▼
┌─────────────────────────┐      ┌────────────────────┐    ┌──────────────┐
│       STRIPE            │      │      RESEND        │    │    SHIPPO    │
│                         │      │                    │    │              │
│  Products + Prices      │      │ Transactional      │    │ Free Starter │
│  Checkout Sessions      │      │  email (tracking,  │    │ Emy's web UI │
│  Payment Intents        │      │  welcome coupons,  │    │ only in v1 — │
│  Webhooks               │      │  cart recovery)    │    │ no API       │
│  Dynamic promo codes    │      │ Free tier: 3k/mo   │    │ integration  │
└─────────────────────────┘      └────────────────────┘    └──────────────┘
```

### Key Architectural Decisions

  1. **Vanilla HTML/CSS/JS over React** — No framework overhead. Emy's catalog will never exceed hundreds of products. Static HTML is faster, simpler to debug, and easier for future developers. Proven pattern from 360-design portfolio.

  2. **Supabase over JSON files in git** — The original v0 plan used JSON files on GitHub Pages with GitHub Actions for automation. This failed in practice: Actions are buggy (phantom files, wrong commits), and the client (Emy) cannot use git. Supabase provides a Postgres database with REST API, auth, row-level security, and a web UI for direct editing — all on the free tier.

  3. **Vercel over GitHub Pages** — Vercel auto-deploys on push (developer only), provides serverless functions for Stripe integration, and requires zero custom CI/CD. GitHub Pages cannot run server-side code.

  4. **Cloudflare R2 over images in git** — Product images (7-15 per product) would bloat the repository. R2 provides CDN-hosted storage at ~$1-5/month with public access URLs.

  5. **Stripe Custom Checkout over Payment Links** — `ui_mode: 'custom'` with Stripe Elements keeps the customer on-site with full UI control. Checkout Sessions API manages tax, shipping, and payment. Pattern proven in freelance-payments project via Stripe quickstart guide.

  6. **No GitHub Actions** — Hard constraint from experience. Too buggy for production automation.

  7. **No git for client** — Emy manages products through admin UI or Supabase Studio. Changes reflect instantly via database, no deploy needed.

  8. **Supabase Database Webhook + inline `?sync=true` for Stripe sync** — On INSERT into products table, Supabase fires a webhook to `/api/stripe-sync`, which creates the Stripe Product + Price and writes IDs back. Works for ALL entry methods (admin UI, Supabase Studio, AI assistant via API). Agent-driven callers (`POST /api/products?sync=true`) additionally run the sync inline before responding so the Stripe IDs are available in the create response — useful when the database webhook isn't routed to the calling preview deployment, or when the caller needs a deterministic round-trip. Both paths share one idempotent helper at `api/_lib/stripeSync.ts`.

  9. **Cloudinary as stateless image transform layer** — Proven in 360-design project. Raw images uploaded to Cloudinary → transformed (4:5 crop, WebP, compress) → downloaded → uploaded to R2 → deleted from Cloudinary. Stays on free tier.

  10. **AI-assisted product creation** — `POST /api/products` + `POST /api/upload` enable any AI assistant (ChatGPT, Claude) to create products programmatically. See `GPT_SETUP.md`.

  11. **Environment-based Stripe keys** — Vercel env vars scoped by environment. Preview deployments use test keys, production uses live keys. Frontend Stripe key served via `api/config.ts` (not hardcoded).

  12. **GA4 analytics** — `gtag.js` CDN script, no Google Tag Manager. Custom events: view_product, add_to_cart, begin_checkout, purchase, newsletter_signup, and 5 more (see implementation guide).

  13. **Custom `PRODUCT_API_KEY` for external API auth** — Random 64-char string for AI agents and external API access. Replaces `SUPABASE_SECRET_KEY` in all external calls. `SUPABASE_SECRET_KEY` is server-only, never exposed.

  14. **Webhook idempotency** — `webhook_events` table stores processed Stripe `event.id` values. Prevents duplicate processing on retries.

  15. **Source of truth hierarchy** — Supabase (authoritative) > Stripe (payment mirror) > R2 (asset storage) > Frontend (read-only consumer). When in doubt, trust Supabase.

  16. **Meta Pixel + Instagram Shopping** — Base pixel code alongside GA4 in `<head>`. Events fire in parallel with GA4. Server-side CAPI for Purchase deduplication. `api/product-feed.ts` serves CSV for Meta Commerce Catalog sync (Instagram Shopping auto-syncs daily).

  17. **Email capture CTAs** — Product interest CTA (sticky card), cart exit intent modal, 3-minute contemplation popup with 5% off. `product_interests` table tracks email + product slug for real notification capability.

  18. **Availability check BEFORE any PII** (v1.4) — `/cart.html` fires `POST /api/checkout/reserve` on {CHECKOUT} click, creating a 15-min soft hold in the `cart_holds` table. 409 recovery happens on the cart page, before the user has entered address or payment details. Stripe session is created only after the hold is confirmed. See IMPL_GUIDE AR #28, #29.

  19. **Soft cart holds, not hard reservations** (v1.4) — 15-minute TTL. Availability is `products.available = true AND NOT EXISTS (hold by different session)`. No infinite lock; items free after 15 minutes of user inactivity.

  20. **Shipping pipeline: Shippo (labels) + Resend (branded tracking email)** (v1.4) — Emy uses Shippo free-tier UI to print labels (30/mo free) and pastes tracking number into admin UI. `PATCH /api/orders/:id` records tracking and fires a branded tracking email via Resend (free tier, 3k/mo, no credit card).

  21. **Coupon = rule, promotion code = single-use delivery** (v1.4) — Stripe coupons are `Duration: Forever`, `Max redemptions: BLANK`. Every user event generates a unique promotion code via `stripe.promotionCodes.create` with `max_redemptions: 1` and 30-day expiry. Code is emailed via Resend.

  22. **Placeholder hygiene** (v1.4) — Track B hardcoded content wrapped in `<!-- PLACEHOLDER: name -->` tags (and equivalents for CSS/JS). Track C begins and ends with a grep against the codebase to guarantee nothing slips through.

---

## Architecture Reference

Implementation-level architectural decisions, cited as "AR #N" throughout the v1.4.3 track-specific implementation guides. Where any conflict exists between this list and `Key Architectural Decisions` above, this list (sourced from the canonical `v1_4_3_IMPLEMENT.md`) takes precedence.

  1. **`ui_mode: 'custom'`** for Stripe Checkout
     - Proven in freelance-payments. Full UI control.
     - On-site checkout per client contract. Follows Stripe quickstart guide
  2. **Standard cart flow**
     - Add to Cart → keep shopping → view cart → checkout.
     - Normal e-commerce UX. Cart stored in localStorage
  3. **Availability check at checkout for all cart items**
     - Query `available === true` for every item before creating Stripe session
     - If any sold, 409 + recovery flow
  4. **Stripe products are write-once**
     - Never UPDATE Stripe products/prices. Price change = archive old price, create new.
     - "Stripe is a payment mirror, not source of truth"
  5. **R2 path**: `/products/{slug}/{role}-{slug}.webp`
     - SEO-friendly, predictable, collision-free.
     - Example: `/products/the-sunkeeper/hero-the-sunkeeper.webp`
  6. **Image aspect ratio**: 4:5
     - Prevents messy grids.
     - Enforced via Cloudinary transform on upload
  7. **Slug rules**: immutable after creation
     - `title.toLowerCase().replaceAll(' ', '-')`
     - URL stability, SEO preservation
  8. **Stripe metadata**: `items` field
     - JSON array of `{ id, slug }`
     - Parsed with `JSON.parse(metadata.items)`
  9. **Error states**: fallback message + disabled buttons + console.log
     - Every page has a failure mode documented.
     - See Error States Reference (in track-specific guides)
  10. **Supabase publishable key hardcoded** in `main.js`
      - Public by design, RLS-protected. (New Nov-2025 key format replaces the legacy `anon` key one-for-one.)
      - No build step = no env var injection for frontend
  11. **CDN loading** for frontend libs
      - Stripe.js via `js.stripe.com`, Supabase.js via jsDelivr.
      - No npm/build step for frontend
  12. **Vercel Web API pattern** for serverless functions
      - `export async function POST(request: Request)`
      - Modern pattern, not legacy `(req, res)`
  13. **R2 custom domain**: `cdn.everlastingsbyemaline.com`
      - Cloudflare DNS CNAME → R2 bucket
      - Branded CDN URL for all product assets
  14. **Customers table with upsert-on-checkout**
      - Email as unique key. No pre-checkout accounts.
      - Newsletter subscribers linked on purchase
  15. **Frontend Stripe key via `api/config.ts`**
      - Enables automatic test/live switching per Vercel environment
      - Nothing hardcoded
  16. **GA4 via `gtag.js` CDN, no GTM**
      - Simple, no-build-step analytics
      - Custom events via `gtag('event', ...)`
  17. **Cloudinary as stateless transform layer**
      - Proven in 360-design. Upload → transform → download → R2 → delete from Cloudinary.
      - Stay on free tier
  18. **AI product creation via API endpoints**
      - `POST /api/products` + `POST /api/upload`
      - Enable any AI assistant to create products programmatically
  19. **Order confirmation via Stripe Dashboard emails + one merchant notification**
      - Buyer's receipt = Stripe's native branded email (enable in Dashboard → Settings → Business → Customer emails → Payments → "Successful payments"; brand under Settings → Business → Branding). We never set the `receipt_email` API param, so this toggle governs the receipt. No custom buyer-confirmation email in v1.
      - The one custom transactional email is the **merchant new-order notification** to `ORDER_NOTIFY_EMAIL` (`orders@…`), fired from `api/webhook.ts` after the order rows insert via `newOrderNotificationEmailHtml` in `api/_emails/index.ts`. Non-blocking. (Shipped + verified live in v1.4.9 — see `v1_4_9_BUILD_REPORT.md` Phase 5 / 8.5.)
  20. **Custom `PRODUCT_API_KEY` for external API auth**
      - Random 64-char string, stored as env var
      - API endpoints validate this key, then use `SUPABASE_SECRET_KEY` internally
      - If `PRODUCT_API_KEY` leaks, rotate just that key without affecting Supabase
      - `SUPABASE_SECRET_KEY` is NEVER exposed in client, agent, or cURL usage
  21. **Webhook idempotency via `webhook_events` table**
      - Store `event.id` on successful processing
      - Skip already-processed events (Stripe retries)
  22. **Source of truth hierarchy**: Supabase > Stripe > R2 > Frontend
      - Supabase = authoritative data
      - Stripe = payment mirror only
      - R2 = asset storage only
      - Frontend = read-only consumer
  23. **Slug generated API-side before image upload**
      - Compute `title.toLowerCase().replaceAll(' ', '-')` BEFORE uploading images
      - DB trigger is fallback only (for manual Supabase Studio inserts)
      - Order: generate slug → upload images → create product record
  24. **Image role enforcement**
      - Exactly 1 hero image required
      - Exactly 1 thumbnail required
      - Minimum 5 gallery images required
      - Validated by `api/products.ts` before INSERT
  25. **Meta Pixel for retargeting + Instagram Shopping attribution**
      - Base pixel code in `<head>` alongside GA4. Events fire in parallel
      - Server-side CAPI for Purchase deduplication via webhook
      - Meta Pixel ID served via `api/config.ts` (public, like GA4 measurement ID)
  26. **Email capture CTAs for conversion optimization**
      - Product page interest CTA (sticky card), cart exit intent modal, 3-minute contemplation popup
      - All feed into `subscribers` table with distinct `source` values
      - Product interest tracked in `product_interests` table for real notification capability
  27. **Meta Commerce Catalog via data feed**
      - `api/product-feed.ts` serves CSV of all products
      - Meta Commerce Manager polls daily — products auto-sync to Instagram Shopping
      - Same pattern extends to Pinterest Shopping (post-launch)
  28. **Availability check BEFORE any PII is entered**
      - `/cart.html` shows items + cost estimate + optional email/name capture
      - `[CHECKOUT]` button fires `POST /api/checkout/reserve` — runs availability check + creates 15-min soft hold in `cart_holds` table
      - 409 recovery happens on the cart page, before the user types any address or payment data
      - Stripe session created only AFTER availability is confirmed (no wasted sessions)
  29. **Soft cart holds, not hard reservations**
      - `cart_holds` table: 15-min TTL, per browser session
      - Availability check = `products.available AND NOT EXISTS (active hold by different session)`
      - No infinite lock — if the user walks away, the item frees after 15 minutes
      - Holds are refreshed on any checkout-page interaction
  30. **Shipping pipeline: Shippo (labels) + Resend (branded tracking email)**
      - Emy generates USPS/UPS labels in Shippo's free tier UI (~30 labels/mo free)
      - Admin UI `/admin/orders` shows "Needs shipping" queue with copy-to-clipboard addresses
      - Emy pastes Shippo tracking number into admin form → `PATCH /api/orders/:id` records tracking + fires branded tracking email via Resend
      - Resend free tier: 3,000 emails/month, no credit card
  31. **Coupon = rule, promotion code = single-use delivery**
      - Stripe coupons (`cart-recovery-10`, `newsletter-welcome-5`) are the discount rules. `Duration: Forever`, `Max redemptions: BLANK`.
      - We NEVER hand out the coupon ID directly — we generate unique single-use promotion codes via API (`max_redemptions: 1`, `expires_at: now + 30d`) per user event
      - Every code is emailed to the user and stored in the relevant table (`subscribers.promo_code` or cart-recovery metadata)
  32. **Placeholder hygiene via `PLACEHOLDER:` tags**
      - Every piece of hardcoded demo content in Track B is wrapped in a `<!-- PLACEHOLDER: name -->` or `/* PLACEHOLDER: name */` or `// PLACEHOLDER: name` comment
      - Track C starts with `grep -rn "PLACEHOLDER"` as the to-do list; C4 ends with that grep returning zero results
      - Zero tooling, works across HTML/CSS/JS, one-command audit
  33. **Cookie consent via Google Consent Mode v2 + Meta Pixel consent API**
      - Cookie banner on first visit with Accept / Reject / Customize; choice persisted in localStorage
      - Default consent state on page load: `ad_storage: 'denied'`, `analytics_storage: 'denied'`, `ad_user_data: 'denied'`, `ad_personalization: 'denied'`. Fires via gtag `consent default` call BEFORE `gtag.js` loads.
      - On Accept: `gtag('consent', 'update', {...: 'granted'})` + `fbq('consent', 'grant')`
      - On Reject / no choice: analytics + advertising cookies stay blocked; essential site cookies (Stripe checkout session, cart localStorage) still work since they're necessary for the service
      - Persistent revoke link in footer → opens the banner again
      - Privacy policy page enumerates cookie categories (essential / analytics / advertising) + how to revoke
      - **GA4 setup note**: turn ON Google Signals (default recommendation) so the June 2026 Google change causes no drift; Consent Mode still governs whether `ad_storage` is granted.

  34. **Vercel Hobby tier function-cap drives endpoint consolidation**
      - Hobby plan caps deployments at 12 serverless functions. Project stays on Hobby (~$0/mo for compute) by routing related actions through a single file via `?_action=...` query param + `vercel.json` rewrites.
      - Pattern: `api/checkout.ts` handles `session | reserve | session-status`; `api/orders.ts` handles `list | :id` (PATCH); `api/cart.ts` handles `activity | recovery`.
      - Public URLs are unchanged via rewrites in `vercel.json`. Frontend, integration tests, AI product pipeline (curl protocol in `GPT_SETUP.md`), and the Custom GPT all hit unchanged URLs.
      - Adding new endpoints: consolidate into existing namespaces (e.g. a new admin endpoint joins `api/orders.ts` or a new `api/admin.ts`) rather than creating standalone files. Buffer is 1 below cap (11/12).
      - `vercel dev` does NOT enforce the cap — must verify against a real preview deploy before merging.

  35. **Inline Stripe sync via `?sync=true` on `POST /api/products`**
      - Default behavior of `POST /api/products` is to insert a row and respond. The Supabase database webhook then asynchronously fires `/api/stripe-sync` and writes Stripe IDs back. This works for the admin UI and Supabase Studio entry paths.
      - Agent-driven callers (Custom GPT, curl protocol, programmatic seeding) opt in with `?sync=true`, which runs the same sync helper inline and returns the new Stripe product/price IDs in the response body. Lets a single agent round-trip a fully-synced product without polling for webhook delivery.
      - Both paths call the shared idempotent helper at `api/_lib/stripeSync.ts`. If both fire for the same row, the second one is a no-op.

  36. **Signed Cloudinary uploads (no preset dependency)**
      - `api/upload.ts` authenticates uploads with `api_key` + `timestamp` + `signature` against the Cloudinary account secret. Same signature pattern is used for the post-transform `destroy` call.
      - No dependency on dashboard-side `upload_preset` configuration; the account-level Cloudinary credentials in `CLOUDINARY_URL` are sufficient for the entire transform flow.

  37. **`is_test=true` filename namespacing for R2 + product image URLs**
      - In test mode (`VERCEL_ENV !== 'production'`), `/api/upload` writes objects under `test/{slug}/test_{role}-{slug}.{ext}` and returns the corresponding URL. Live mode writes under `products/{slug}/{role}-{slug}.{ext}` with no prefix.
      - Image-role validation in `api/products.ts` strips the leading `test_` before matching `hero-` / `gallery-` so URLs returned by `/api/upload` validate identically in both modes.

---

## Stripe Sync Rules

Defines exactly how Supabase state flows into Stripe. Implementation lives in `api/_lib/stripeSync.ts` (the shared idempotent helper) plus `api/stripe-sync.ts` (DB webhook entrypoint), `api/products.ts > POST` (inline `?sync=true`), and `api/products.ts > PUT` (price changes).

  - On product **INSERT** → create Stripe Product + Price. Two paths into the helper, identical outcome:
    + The Supabase database webhook fires `POST /api/stripe-sync` (admin UI, Supabase Studio).
    + Agent-driven callers add `?sync=true` to their `POST /api/products` call to run the sync inline and receive the Stripe IDs in the response.
  - The helper at `api/_lib/stripeSync.ts` is idempotent: it short-circuits if either the payload or a fresh DB read shows `stripe_product_id` already set, so a webhook firing after an inline sync is a no-op.
  - On **price change** → archive old Stripe Price (`active: false`), create new Price, update `stripe_price_id` in Supabase (handled in `api/products.ts > PUT`).
  - On **title/image/description change** → DO NOTHING in Stripe (Stripe is a payment mirror, not source of truth).
  - Never UPDATE a Stripe Price (they are immutable). Always archive + create new.
  - Never manually create Stripe Products/Prices in Dashboard. The shared helper handles all creation.

---

## Project Overview

### What This Is

  * **Custom e-commerce website for a handcrafted miniature diorama artist**

    + Artisan storefront with rich storytelling (poetic story cards per product)
    + Stripe Custom Checkout (ui_mode: 'custom') for purchasing one-of-a-kind pieces with standard cart flow
    + Admin UI for non-technical client to manage products
    + Dynamic homepage with rotating themes pulled from product data
    + Template-friendly architecture for two upcoming non-store client sites

### The Core Innovation

  * **Database-driven static site with custom on-site checkout**

    + Products live in Supabase, not in code — client edits content, site reflects instantly
    + Stripe catalog auto-syncs when products are added (via database webhook)
    + No CMS subscription, no framework overhead, no git knowledge required
    + Vercel free tier + Supabase free tier + R2 ≈ $15-75/year total

### Client & Purpose

  * **Client**: Emy Hoff, Everlastings by Emaline
  * **Domain**: everlastingsbyemaline.com
  * **Business**: Handcrafted miniature scenes (dioramas, book nooks, story lofts)
  * **Problem**: Needs professional online store. Non-technical. Previous Squarespace was expensive and limiting.
  * **Solution**: Custom site with admin panel. Near-zero operating costs. Full brand control.

---

## How to Run & Test Locally

### Prerequisites

  + Node.js 18+ (for Vercel CLI)
  + `npm install -g vercel` (Vercel CLI)
  + Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhook`)
  + Supabase project with tables created
  + Cloudflare R2 bucket with public access

### Environment Variables

Create `.env.local` (see also `.env.example` in impl guide):

```bash
# Supabase (new key system, Nov 2025+)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...  # frontend-safe, replaces legacy anon key
SUPABASE_SECRET_KEY=sb_secret_...            # backend only, replaces legacy service_role key

# Stripe (test keys for dev, live keys for production)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=everlastings
R2_PUBLIC_URL=https://cdn.everlastingsbyemaline.com

# Cloudinary (stateless image transforms)
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

# External API bearer (AI agents / curl) — generate with: openssl rand -hex 32
# This must be the **Development**-scope value, never the Production value.
PRODUCT_API_KEY=...
```

`.env.local` is gitignored and should be populated from Vercel via `vercel env pull` (defaults to the Development scope), not hand-typed. If you ever hand-edit it, only paste the Development-scope value of `PRODUCT_API_KEY` here.

**Environment Strategy**: Vercel env vars are scoped per environment. `main` branch → Production (live Stripe keys, served at `everlastingsbyemaline.com`). `dev`/`feat/*` branches → Preview (test Stripe keys, served at auto-generated `*.vercel.app` URLs — these are the dev environment). The shared Supabase project and R2 bucket are kept clean via an `is_test` row flag and a `test/` R2 path prefix. Full conventions: see `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md` > [Environment Strategy](archive/v1_4/v1_4_3_IMPLEMENT.md#environment-strategy-reference) and [Dev/Test Data Hygiene](archive/v1_4/v1_4_3_IMPLEMENT.md#devtest-data-hygiene-reference).

**`PRODUCT_API_KEY` scope separation**: This key is set independently in all three Vercel scopes (Production, Preview-dev, Development) with **distinct values** — a leaked Preview or Development key must not unlock Production. Production and Preview values are marked **Sensitive** in Vercel (dashboard hides them, `vercel env pull` returns `""` for them — verify Production by exercising the live endpoint, not by reading a pulled file). Development scope cannot be marked Sensitive (Vercel rejects `--sensitive` there). Em's Custom GPT uses the Production value only; it lives in the GPT's Action auth panel and nowhere else on disk.

### Local Development

```bash
# Install dependencies
npm install

# Start Vercel dev server (serves static files + API functions)
vercel dev

# In a separate terminal, forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/webhook
```

### Testing Checkout Flow

  1. Start local server
  2. Navigate to a product page
  3. Add item to cart, navigate to checkout — Stripe payment form should appear
  4. Use Stripe test card: `4242 4242 4242 4242`
  5. Verify webhook fires and product updates in Supabase

---

## File Structure & Key Files

  ```text
  ~/Development/everlastings-website/
  ├── index.html                       # Homepage (long landing page)
  ├── shop.html                        # Product grid with filters
  ├── product.html                     # Individual product page template
  ├── checkout.html                    # Embedded Stripe checkout
  ├── about.html                       # About Emaline
  ├── contact.html                     # Contact + commissions
  ├── admin/                           # Admin panel (Supabase Auth protected)
  │   └── index.html                   # Product management UI
  │
  ├── assets/
  │   ├── css/
  │   │   └── styles.css                # All styles, CSS custom properties
  │   ├── js/
  │   │   ├── main.js                   # Shared utilities, Supabase client init
  │   │   ├── product.js                # Product page: fetch + render from Supabase
  │   │   ├── shop.js                   # Shop grid: filters, sort, tile rendering
  │   │   ├── homepage.js               # Homepage: featured carousel, theme rotation
  │   │   ├── checkout.js               # Stripe custom checkout mount
  │   │   ├── admin.js                  # Admin panel: CRUD, image upload
  │   │   └── newsletter.js             # Newsletter signup handler
  │   ├── docs/                         # Project documentation
  │   │   ├── EVERLASTINGS_STORE.md     # This file
  │   │   ├── GPT_SETUP.md              # Custom GPT brain + AI/curl product protocol
  │   │   ├── STORE_ADMINISTRATION.md   # Client how-to (products + orders, all mediums)
  │   │   └── archive/                  # v0 and v1 planning docs
  │   ├── favicon/                      # Favicon files
  │   └── fonts/                        # Cormorant Garamond font files
  │
  ├── api/                              # Vercel serverless functions (11 deployable)
  │   ├── cart.ts                       # Cart activity ping + sold-in-cart recovery
  │   ├── checkout.ts                   # Stripe session create + reserve hold + status
  │   ├── config.ts                     # Public config (Stripe key per environment)
  │   ├── contact.ts                    # Contact form handler
  │   ├── orders.ts                     # Admin: list orders + record tracking
  │   ├── product-feed.ts               # CSV feed for Meta Commerce Catalog
  │   ├── products.ts                   # CRUD for AI product creation; ?sync=true runs inline Stripe sync
  │   ├── stripe-sync.ts                # Create Stripe Product+Price (DB webhook entrypoint)
  │   ├── subscribe.ts                  # Newsletter email capture
  │   ├── upload.ts                     # Signed Cloudinary transform → R2 upload
  │   ├── webhook.ts                    # Handle Stripe payment webhooks
  │   ├── _bootstrap/                   # One-time helpers (coupons.ts) — not deployed
  │   ├── _emails/                      # Resend templates (index.ts) — not deployed
  │   └── _lib/                         # Shared utilities (cors, env, adminAuth, stripeSync) — not deployed
  │
  ├── vercel.json                       # Vercel config: rewrites, headers
  ├── package.json                      # Dependencies (stripe, @supabase/supabase-js)
  ├── tsconfig.json                     # TypeScript config for API functions
  ├── .env.example                      # Environment variable template
  ├── .env.local                        # Local env vars (gitignored)
  │
  ├── .agent/                           # AI agent instructions
  │   ├── AGENTS.md                     # Core agent rules and human profile
  │   ├── DEV_RULES.md                  # Git branching, dev protocols
  │   └── 2026_MOBILE_DESIGN_SPECS.md   # iOS/iPadOS viewport specs
  │
  ├── complete.html                     # Order completion page
  ├── faq.html                          # FAQ
  ├── shipping.html                     # Shipping & returns
  ├── terms.html                        # Terms of service
  ├── privacy.html                      # Privacy policy
  ├── policies.html                     # Policies (availability, cart, returns)
  ├── README.md                         # Public-facing README
  └── .gitignore                        # Ignores .env.local, node_modules, etc.
  ```

### Key Frontend Files

  * **`assets/js/main.js`** — Supabase client initialization, shared utilities
    + Loads Supabase via CDN script tag, creates client with hardcoded anon key (public, RLS-protected)
    + Shared functions: formatPrice(), slugify(), getProductBySlug(), getProducts()
    + Cart state management (localStorage): addToCart(), removeFromCart(), getCart(), clearCart(), updateCartBadge()

  * **`assets/js/product.js`** — Product page controller
    + Fetches product by slug from Supabase
    + Renders two-column layout (story + details)
    + Image gallery with lightbox
    + Stripe checkout button handler

  * **`assets/js/shop.js`** — Shop grid controller
    + Fetches all products from Supabase
    + Multi-select filter by series, product_type, availability
    + Sort by price, date, name
    + Smart filter: hides single-option dropdowns

  * **`assets/js/homepage.js`** — Homepage controller
    + Fetches featured products for carousel
    + Loads theme config from site_config table
    + Theatrical lighting effects (CSS masks + scroll transforms)
    + Theme rotation on return visits

### Key API Functions

  * **`api/checkout.ts`** — Cart hold + Stripe session + return-page status
    + `POST /api/checkout/reserve` (rewritten to `?_action=reserve`): availability check + 15-min soft hold
    + `POST /api/checkout` (no `_action`): creates Stripe checkout session with `ui_mode: 'custom'`, collects email + shipping (US only) — **phone collection removed in v1.4.9** (no mounted element rendered a phone field, which kept `confirm()` permanently un-satisfiable) — passes `{ items: [{id, slug}] }` metadata, returns `client_secret` for the frontend
    + `GET /api/session-status` (rewritten to `?_action=session-status`): retrieves session and returns payment status for the completion page
    + Single deployed file behind path-based dispatch — see AR #34

  * **`api/cart.ts`** — Cart activity + sold-in-cart recovery
    + `POST /api/cart-activity` (rewritten to `?_action=activity`): product interest ping
    + `POST /api/cart-recovery` (rewritten to `?_action=recovery`): generates a one-time Stripe promo code + queues a Resend email when an item sells while in someone else's cart

  * **`api/orders.ts`** — Admin order pipeline
    + `GET /api/orders`: lists orders by shipping status for the admin UI queue
    + `PATCH /api/orders/:id` (rewritten to `?id=:id`): records tracking number/carrier and fires the branded tracking email via Resend

  * **`api/webhook.ts`** — Stripe event handler
    + Reads raw body via `request.text()` for signature verification
    + Validates webhook signature with `stripe.webhooks.constructEvent()`
    + Idempotency: checks `webhook_events` table for duplicate `event.id`, skips if already processed
    + On `checkout.session.completed`: extracts metadata, upserts customer record, marks products sold, creates order records, records event.id

  * **`api/products.ts`** — Product CRUD for AI assistants
    + GET: fetch product by slug (public for live products; bearer-gated for test mode)
    + POST: create product (`PRODUCT_API_KEY` or Supabase JWT auth, validates fields, generates slug, checks conflicts). Strips `test_` prefix from image URLs before role validation. Add `?sync=true` to also run Stripe sync inline and include `stripe_sync` in the response.
    + PUT: update product (same auth; handles Stripe price archiving if price changes)

  * **`api/config.ts`** — Public configuration
    + Returns Stripe publishable key and Supabase config per environment
    + Enables automatic test/live switching without hardcoding keys

  * **`api/stripe-sync.ts`** — Product catalog sync (DB webhook entrypoint)
    + Called by the Supabase database webhook on `products` INSERT
    + Delegates to the shared idempotent helper at `api/_lib/stripeSync.ts`
    + Same helper is also called inline by `POST /api/products?sync=true`

---

## Data Flow

### Product Creation (Any Entry Method)

  ```
  Emy adds product via Admin UI / Supabase Studio / the Sunkeeper Custom GPT
    ↓
  (01) Row inserted into Supabase `products` table
    ↓
  (02) Supabase Database Webhook fires on INSERT
    ↓
  (03) POST to /api/stripe-sync.ts (Vercel function)
    ↓
  (04) Function creates Stripe Product via API
    ↓
  (05) Function creates Stripe Price linked to Product
    ↓
  (06) Function writes stripe_product_id + stripe_price_id back to Supabase row
    ↓
  PRODUCT IS NOW LIVE AND PURCHASABLE
  (No deploy needed — frontend fetches from Supabase at runtime)
  ```

### Purchase Flow

  ```
  Shopper adds item(s) to cart, then clicks checkout
    ↓
  (01) Frontend loads checkout.html, reads cart from localStorage
    ↓
  (02) checkout.js sends POST to /api/checkout.ts
    ↓
  (03) API checks availability for ALL cart items in Supabase (blocks if any sold)
    ↓
  (04) API creates Stripe Checkout Session (ui_mode: 'custom', metadata: {items: [...]})
    ↓
  (05) Returns client_secret to frontend
    ↓
  (06) Frontend calls stripe.initCheckout({ fetchClientSecret }) on page load (single-phase),
       mounts Stripe's Contact + ShippingAddress + Payment + BillingAddress elements
    ↓
  (07) Customer fills the Stripe elements (email prefilled from cart, still editable);
       the elements auto-sync to the session — no manual update* calls
    ↓
  (08) Frontend calls checkout.confirm() → Stripe processes payment
    ↓
  (09) Stripe redirects to complete.html?session_id=...
    ↓
  (10) Stripe fires checkout.session.completed webhook to /api/webhook.ts
    ↓
  (11) Webhook validates signature, extracts items from metadata
    ↓
  (12) Updates each product: available=false, quantity=0
    ↓
  (13) Creates order record per product in Supabase orders table
    ↓
  PRODUCT SHOWS "SOLD" ON NEXT PAGE LOAD
  ```

### Data States

  1. **Product available**: `available=true, quantity>0` — Add to Cart button active
  2. **Product sold**: `available=false, quantity=0` — "Sold" badge, buttons disabled, appears in Sold Archive
  3. **Product featured**: `featured=true` — Appears in homepage carousel
  4. **In cart**: Product stored in localStorage cart — availability re-checked at checkout creation

---

## Design System & Styling

### Color Scheme

```css
:root {
    --color-plum: #4A1942;
    --color-lavender: #B8A5C8;
    --color-fog: #D4D4D4;
    --color-cream: #FFF8E7;
    --color-gold: #D4AF7A;
    --color-ink: #1A1A1A;
    --color-star-blue: #1B3A52;
    --color-amethyst: #9B6B9E;
}
```

### Design Principles

  1. **Minimalist Elegance**
    - Clean layouts with generous white space
    - Let the miniatures be the focal point
    - Typography creates hierarchy without clutter

  2. **Theatrical Depth**
    - CSS-based lighting effects (masks + scroll transforms)
    - Spotlight motion creates perceived depth
    - "Not actual parallax — CSS motion against scroll direction with elements masked by a frame"

  3. **Mobile-First**
    - All layouts designed for 393px first, scaled up
    - Touch targets minimum 44x44px
    - See `.agent/2026_MOBILE_DESIGN_SPECS.md` for iOS/iPadOS viewport specs

### Typography

```css
:root {
    --font-display: "Cormorant Garamond", Georgia, serif;
    --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
  ```

  - Cormorant Garamond: hero text, section headings, product titles, taglines
  - System fonts: body copy, navigation, UI elements, buttons

### Responsive Breakpoints

```css
/* Mobile-first */
/* Base: 393px (iPhone) */
@media (min-width: 768px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1440px) { /* Large desktop */ }
```

### Full brand reference: `assets/docs/BRAND.md`

---

## Common Pitfalls & Important Notes

### Things That Look Like Bugs But Aren't

  1. **No React, no build step for frontend**
    - This is intentional. Vanilla HTML/CSS/JS served as static files. Only the `/api` functions are TypeScript compiled by Vercel.

  2. **Products appear without deploy**
    - Frontend fetches from Supabase at runtime. Adding a product to the database makes it live immediately. No git push needed.

  3. **No Stripe Customer created before checkout**
    - Shoppers are anonymous — no Stripe Customer is created before checkout. The Phase 0 probe (2026-06-04) resolved the open question: the session **omits `customer_creation`** (it wasn't verified to populate `session.customer` under `ui_mode:'custom'`, and forcing it risked a 500). The webhook null-guards `stripe_customer_id` and keys customers by email. See `v1_4_9_FINISH_TRACK_C.md` (Phase 0 + Phase 1).

  4. **`api/` file count is not 1:1 with public URLs**
    - Several public URLs (`/api/checkout/reserve`, `/api/session-status`, `/api/orders/:id`, `/api/cart-activity`, `/api/cart-recovery`) are rewritten in `vercel.json` to `?_action=...` query params on consolidated handler files. Frontend code should always hit the public URL, never `?_action=...` directly. See AR #34.
    - **Supabase keep-alive (v1.4.8):** a daily Vercel cron in `vercel.json` (`/api/product-feed`) runs a real DB read so the free-tier project never pauses (~7-day inactivity limit). It deliberately **reuses an existing function** — a dedicated `/api/keepalive` would push past the 11-function Hobby cap. Crons run on production only (activates at launch). Reactive recovery (dashboard Restore / Management API) is a Sean-only step. See `v1_4_9_FINISH_TRACK_C.md` Phase 7.

  5. **Endpoint consolidation is intentional, not lazy**
    - The 11-deployable-function shape is a design constraint (Vercel Hobby cap of 12). Splitting `checkout.ts`, `orders.ts`, or `cart.ts` back into one-file-per-action would break the deploy. Add new endpoints into the existing namespaces, or check the cap before introducing a new top-level file. See AR #34.

  6. **`POST /api/products?sync=true` returns Stripe IDs but the inserted row's snapshot does not**
    - The product row is inserted first, then the inline Stripe sync runs and writes IDs back. The returned `product` object is the pre-sync snapshot from the insert; the Stripe IDs land in the `stripe_sync` block alongside it (and in the database row, observable on the next GET). This is intentional — the synthetic alternative would either re-fetch the row or return a fabricated merge. See AR #35.

  7. **Inline `?sync=true` is intentional, not a webhook bypass**
    - The Supabase database webhook still fires on every INSERT. The inline path exists so agent-driven callers (Custom GPT, curl protocol) get a deterministic round-trip without polling. The shared idempotent helper makes the second firing a safe no-op. Do not "simplify" this back to a webhook-only flow.

  8. **`test_` prefix on test-mode images is real product behavior**
    - `/api/upload` namespaces test-mode objects under `test/{slug}/test_{role}-{slug}.{ext}` (live mode is `products/{slug}/{role}-{slug}.{ext}`). The `products.ts` validator strips the leading `test_` before checking the role-prefix, so URLs from `/api/upload` validate identically in both modes. Don't try to remove the prefix at upload time. See AR #37.

  9. **Cloudinary uses signed uploads, not a preset**
    - Every `/api/upload` call to Cloudinary signs `timestamp` against the account secret. There is no dashboard-side `upload_preset` involved; introducing one would only add configuration drift. See AR #36.

### Common Mistakes to Avoid

  * **Don't use GitHub Actions for any automation**
    + Hard constraint. Too buggy. Vercel handles deploy, Supabase handles data, webhooks handle sync.

  * **Don't store images in git**
    + All product images go to Cloudflare R2. Repository stays small.

  * **Don't expect Emy to use git**
    + All client-facing operations happen through admin UI or Supabase Studio web interface.

  * **Don't create Stripe Products/Prices manually**
    + The database webhook handles this automatically. Manual creation causes ID mismatches.

### Important Conventions

  + **Price is always in cents** — $245.00 = 24500 in the database and Stripe
  + **Slug is auto-generated** from title — "The Sunkeeper" → "the-sunkeeper"
  + **Images follow CDN path pattern** — `{R2_PUBLIC_URL}/products/{slug}/hero-{slug}.webp`
  + **All API functions are TypeScript** — frontend is vanilla JS
  + **Database webhooks vs Stripe webhooks** — both are used but for different purposes. DB webhook syncs to Stripe on INSERT. Stripe webhook updates DB on payment.

### Performance Considerations

  + Lazy load all product images below the fold
  + Cormorant Garamond loaded via Google Fonts with display=swap
  + Product grid fetches from Supabase with pagination
  + Homepage featured products cached in site_config for faster initial load

---

## Development Philosophy

### "Exclusively Executable Plan" Approach

**Core Principle**: Understand everything upfront, resolve unknowns before coding, create complete plan before execution.

**Process**:

  1. Understand the full system
  2. Plan every detail upfront
  3. Identify unknowns and resolve them
  4. Write complete, correct code
  5. Test once, it works

### What Changed from v0

| v0 Plan (Dec 2025)             | v1 Architecture (Mar 2026)        | Why                            |
| ------------------------------ | --------------------------------- | ------------------------------ |
| GitHub Pages hosting           | Vercel hosting                    | Consolidation; private repo    |
| JSON files in git as database  | Supabase PostgreSQL               | GIT is not non-tech UI         |
| GitHub Actions for automation  | Eliminated entirely               | Buggy, phantom files, commits  |
| Python scripts for Stripe sync | Supabase DB webhook → TS function | Single simple automation point |
| Client CMS is git/ChatGPT      | Admin UI + Supabase Studio        | Non-tech UI friendly workflow  |
| Stripe Hosted                  | Stripe Custom Checkout (Elements) | On-site UX, full brand control |
| React (briefly considered)     | Vanilla HTML/CSS/JS               | No framework at this scale     |

### What's Reused from freelance-payments

  - Vercel serverless function pattern (`/api/*.ts`) — Web API `Request/Response` format
  - Stripe `ui_mode: 'custom'` Checkout Sessions pattern (from Stripe quickstart walkthrough)
  - Webhook handling pattern (raw body → constructEvent → extract metadata → update data)
  - TypeScript for all server-side code
  - Environment variable management via Vercel dashboard
  - Session-status endpoint pattern for return page verification

---

## Deployment

### Build Process

No build step for frontend — static HTML/CSS/JS files served directly by Vercel. API functions are compiled by Vercel's TypeScript support automatically.

```bash
# Deploy (from developer machine only)
git push origin main
# Vercel auto-deploys on push
```

### Hosting Configuration

  + **Platform**: Vercel (free tier)
  + **Auto-deploy**: On push to main branch
  + **Custom domain**: `everlastingsbyemaline.com`
  + **SSL**: Automatic via Vercel
  + **Serverless functions**: `/api/*.ts` auto-detected

### Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

| Variable                   | Purpose                                                     | Required |
| -------------------------- | ----------------------------------------------------------- | -------- |
| `SUPABASE_URL`             | Supabase project URL                                        | Yes      |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (frontend-safe)                    | Yes      |
| `SUPABASE_SECRET_KEY`      | Supabase secret key (backend only)                          | Yes      |
| `STRIPE_SECRET_KEY`        | Stripe API secret                                           | Yes      |
| `STRIPE_PUBLISHABLE_KEY`   | Stripe frontend key                                         | Yes      |
| `STRIPE_WEBHOOK_SECRET`    | Webhook signature validation                                | Yes      |
| `R2_ACCOUNT_ID`            | Cloudflare account                                          | Yes      |
| `R2_ACCESS_KEY_ID`         | R2 access credentials                                       | Yes      |
| `R2_SECRET_ACCESS_KEY`     | R2 secret credentials                                       | Yes      |
| `R2_BUCKET_NAME`           | R2 bucket name                                              | Yes      |
| `R2_PUBLIC_URL`            | CDN public base URL                                         | Yes      |
| `CLOUDINARY_URL`           | Cloudinary API credentials                                  | Yes      |
| `PRODUCT_API_KEY`          | AI/external API auth key                                    | Yes      |
| `META_PIXEL_ID`            | Meta Pixel ID for tracking                                  | Yes      |
| `META_ACCESS_TOKEN`        | Meta Conversions API token                                  | Yes      |
| `RESEND_API_KEY`           | Resend transactional email API key                          | Yes      |
| `RESEND_FROM_EMAIL`        | Verified sender, e.g. `sunkeeper@everlastingsbyemaline.com` | Yes      |

**Note**: Stripe keys are scoped per Vercel environment. Test keys for Preview+Development, live keys for Production. See `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md` > Environment Strategy. Shippo uses the web UI in v1 — no API key required until post-launch.

### Post-Deploy Verification

  1. Visit homepage — loads featured products from Supabase
  2. Navigate to shop — products render in grid
  3. Click product — full page renders with images from R2
  4. Test checkout with Stripe test card
  5. Verify webhook updates product status in Supabase
  6. Check admin UI login and product creation

### Post-Launch Operations

Free-tier services have caps and auto-pause behavior. This is the operational checklist for the first year of production — the things that don't show up in architecture docs but will absolutely interrupt the site if ignored.

| #   | Service         | Limit                                                                            |
| --- | --------------- | -------------------------------------------------------------------------------- |
| 1   | Supabase        | Project pause after 7 days idle                                                  |
| 2   | Resend          | Free tier = 3,000 emails/mo                                                      |
| 3   | Shippo          | Starter = 30 USPS labels/mo                                                      |
| 4   | Stripe          | Dashboard > Settings > Business > Customer emails > Payments: "Successful payments" + "Refunds" both ON |
| 5   | Cloudflare R2   | 10 GB storage + 1M Class A ops/mo + 10M Class B ops/mo                           |
| 6   | Vercel          | 100 GB bandwidth/mo, 1k serverless function invocations/day                      |
| 7   | SquareSpace     | Domain auto-renewal paid through Google Workspace                                |
| 8   | Meta Commerce   | New products appear in Instagram Shopping within 24 hours of publishing          |
| 9   | Stripe API Key  | Rotate if a device is lost or key is shared                                      |
| 10  | DB Password     | Supabase password rotate if exposed                                              |
| 11  | PRODUCT_API_KEY | Rotate if exposed                                                                |
| 12  | DMARC policy    | Launch with p=none; upgrade if clean send history or monthly volume > 1,000      |

  1. Traffic keeps it alive; Pro tier ($25/mo) doesn't pause — consider built in ping every few days or daily 
  2. Paid tier ($20/mo for 50k) when monthly volume crosses ~2,500
  3. Pay-as-you-go ($0.05/label) when monthly volume crosses 25
  4. Re-verify after any Stripe account change
  5. Unlikely to hit cap on normal site; enough traffic to require upgrade is a lot
  6. Pro tier ($20/mo) when bandwidth or function volume approaches caps
  7. Maintain auto renew 
  8. Check catalog health in Meta Commerce Manager monthly
  9. Update Vercel Production scope after rotation
  10. Not an env var; lives only in a password manager. Rotate via Studio > Settings > Database > Reset database password if ever exposed
  11. `PRODUCT_API_KEY` rotation: generate **three distinct** values with `openssl rand -hex 32` (one per scope — leaked Preview/Dev key must not unlock Production). For each scope: `vercel env rm PRODUCT_API_KEY <scope> --yes` then `printf 'NEWVAL' | vercel env add PRODUCT_API_KEY <scope> --sensitive` — but **omit `--sensitive` on the Development scope** (Vercel rejects it with `sensitive_not_allowed_on_development`). For Preview-dev, pass the branch: `vercel env add PRODUCT_API_KEY preview dev --sensitive`. After rotation: update `.env.local` to the new Development value, redeploy Production (empty commit on `main` or "Redeploy" in dashboard), verify Production with a runtime curl (`HTTP/2 400` from `POST /api/products` with empty body = auth passed), then update Em's Custom GPT Action with the new Production value.
  12. Upgrade TXT record to `p=quarantine` or `p=reject` to tighten email delivery 

**First-month warm-up checklist** (2026-05-ish):

  - [ ] Confirm all post-launch emails deliver (Stripe receipt, Resend tracking, Resend welcome, Resend cart-recovery).
  - [ ] Sign in to Meta Commerce Manager and confirm all live products appear in the catalog feed.
  - [ ] Run one Lighthouse audit from a fresh browser profile; log Core Web Vitals.
  - [ ] Confirm GA4 and Meta Pixel both show live traffic.
  - [ ] Verify Supabase has not auto-paused (it shouldn't with live traffic, but confirm).

### Email Infrastructure

All outbound transactional email routes through Resend (sending) and all reply/inbound email routes through Google Workspace (receiving). Resend cannot receive email directly — replies to our `From:` address land in Emy's Google Workspace inbox via configured aliases.

**Google Workspace aliases** (all route to inbox within User space created for 'Sean Horvath'):
  + `admin@everlastingsbyemaline.com` — master admin address used for login of services 
  + `sunkeeper@everlastingsbyemaline.com` — used as `RESEND_FROM_EMAIL` for emails from Resend
  + `hello@everlastingsbyemaline.com` — set as the *reply-to* email `RESEND_REPLY_TO_EMAIL` in Resend emails 
  + `orders@everlastingsbyemaline.com` — potential future segmentation for order-specific notifications
  + `shipping@everlastingsbyemaline.com` — potential future segmentation for tracking/shipping notifications
  
*Note: Resend currently uses the same domain that Google Workspaces uses for email, this means that a "reply to" address is REQUIRED. Any replies sent from users directly to the email address from outgoing Resend email will not be received. Without upgrading to have a second custom domain used just for direct replies, we would need to set up a subdomain, e.g. `m.everlastingsbyemaline.com` for outgoing and incoming Resend emails. As of no there does not seem reason to need incoming emails; this only currently seems necessary if there was a high volume of replies from customers directly to our emails and back-and-forth email conversations.*

**Resend domain setup**: `everlastingsbyemaline.com` (apex) verified 

**Post-v1 roadmap (`assets/docs/archive/v2_0/`)** — exploratory planning for post-launch "eliminate manual ops work" wave, theme-grouped:

  + **Email/marketing AI pipeline**: `EMAIL_MARKETING.md`, `RESEND_LLMS_FULL.md`, `GIVE_AGENT_INBOX.md`, plus integration refs (`RESEND_CLI.md`, `VERCEL_RESEND.md`, `SUPABASE_RESEND.md`, `RESEND_VERCEL_CHAT_SDK.md`, `CHAT_SDK_CARD_EMAILS.md`, `CLOUDFLARE_WORKERS_RESEND.md`, `PYTHON_RESEND_SDK.md`)
  + **Shipping automation (Shippo API integration)**: `SHIPPO_API.md` (includes pricing snapshot), `SHIPPO_LLMS_FULL.md`. v1 ships with the manual "copy address from admin panel → paste into Shippo web UI" flow. v2 integrates the **free** Shippo API Starter tier (also 30 labels/month, plus no carrier-connection fee) so orders push directly, labels print from the admin panel, and tracking numbers auto-populate the tracking email. The v2 case is pure UX + AI automation (e.g., AI-authored personal notes printed alongside labels), not cost savings.

The theme ("replace manual rituals with AI-managed workflows") carries through from the AI-assisted authoring pipeline (now in `GPT_SETUP.md`) into v2's shipping + email automation. Each piece is reusable template material for the SMB-AI-ops portfolio angle.

---

## Supabase Schema

### `products` table

| Column            | Type        | Notes                                          |
| ----------------- | ----------- | ---------------------------------------------- |
| id                | uuid        | PK, auto-generated                             |
| sku               | text        | Unique, auto-generated                         |
| slug              | text        | Unique, auto-generated from title              |
| title             | text        | NOT NULL                                       |
| headline          | text        | 5-7 word tagline                               |
| story_card        | text        | 2-8 paragraphs, poetic                         |
| description       | text        | Short summary                                  |
| features          | jsonb       | Array of feature strings                       |
| price             | integer     | In cents ($245 = 24500)                        |
| dimensions        | text        | e.g. "8\" W x 6\" D x 10\" H"                  |
| weight            | text        | e.g. "2.5 lbs"                                 |
| materials         | text[]      | Array of materials                             |
| power_supply      | text        | Nullable                                       |
| care_instructions | text[]      | Array of care steps                            |
| shipping_details  | text[]      | Array of shipping info                         |
| product_type      | text        | miniature, printable, storybook                |
| series            | text        | Nullable — Portals to Peace, etc.              |
| available         | boolean     | Default true                                   |
| quantity          | integer     | Default 1                                      |
| featured          | boolean     | Default false                                  |
| images            | jsonb       | Array of {url, alt} objects                    |
| thumbnail         | text        | CDN URL                                        |
| thumbnail_alt     | text        |                                                |
| media             | jsonb       | Array of {type, url, caption} for videos/GIFs  |
| seo_title         | text        |                                                |
| seo_description   | text        |                                                |
| artist_note       | text        | Nullable                                       |
| stripe_product_id | text        | Nullable, auto-populated                       |
| stripe_price_id   | text        | Nullable, auto-populated                       |
| homepage_theme    | jsonb       | Nullable — {colors, mood} for dynamic homepage |
| created_at        | timestamptz | Auto                                           |
| updated_at        | timestamptz | Auto                                           |
| is_test           | boolean     | NOT NULL DEFAULT false — dev/preview isolation |

### `customers` table

| Column             | Type        | Notes                               |
| ------------------ | ----------- | ----------------------------------- |
| id                 | uuid        | PK                                  |
| email              | text        | Unique — primary identifier         |
| name               | text        | From Stripe checkout                |
| phone              | text        | From Stripe checkout                |
| shipping_address   | jsonb       | Latest shipping address             |
| stripe_customer_id | text        | Stripe's customer ID                |
| source             | text        | checkout, newsletter, cart-recovery |
| created_at         | timestamptz | Auto                                |
| updated_at         | timestamptz | Auto                                |
| is_test            | boolean     | NOT NULL DEFAULT false — dev/preview |

### `orders` table

| Column                | Type        | Notes                                           |
| --------------------- | ----------- | ----------------------------------------------- |
| id                    | uuid        | PK                                              |
| stripe_session_id     | text        | Checkout session ID                             |
| stripe_payment_intent | text        | Payment intent ID                               |
| product_id            | uuid        | FK to products                                  |
| customer_id           | uuid        | FK to customers                                 |
| customer_email        | text        | From Stripe (denormalized)                      |
| amount                | integer     | In cents                                        |
| status                | text        | completed, shipped, delivered, refunded         |
| shipping_address      | jsonb       | From Stripe                                     |
| tracking_number       | text        | Set when Emy marks shipped via admin UI         |
| tracking_carrier      | text        | USPS, UPS, FedEx, DHL                           |
| shipped_at            | timestamptz | When Emy marked shipped — triggers Resend email |
| delivered_at          | timestamptz | Post-launch via Shippo webhook                  |
| created_at            | timestamptz | Auto                                            |
| is_test               | boolean     | NOT NULL DEFAULT false — dev/preview isolation  |

Partial index `idx_orders_needs_shipping` on `(created_at DESC)` WHERE `shipped_at IS NULL AND status = 'completed'` for fast admin queue lookups.

### `subscribers` table

| Column                | Type        | Notes                                                                                                         |
| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| id                    | uuid        | PK                                                                                                            |
| email                 | text        | Unique                                                                                                        |
| source                | text        | homepage, footer, checkout-started, cart-recovery, product-interest, cart-exit, contemplation-offer, customer |
| promo_code            | text        | Dynamic Stripe promotion code (newsletter welcome or contemplation CTA)                                       |
| promo_code_expires_at | timestamptz | When the promo code expires (30 days after generation)                                                        |
| created_at            | timestamptz | Auto                                                                                                          |
| is_test               | boolean     | NOT NULL DEFAULT false — dev/preview isolation                                                                |

### `site_config` table

| Column     | Type        | Notes                                               |
| ---------- | ----------- | --------------------------------------------------- |
| id         | uuid        | PK                                                  |
| key        | text        | Unique — e.g. "homepage_theme", "featured_products" |
| value      | jsonb       | Configuration data                                  |
| updated_at | timestamptz | Auto                                                |

### `webhook_events` table

| Column       | Type        | Notes                           |
| ------------ | ----------- | ------------------------------- |
| event_id     | text        | PK — Stripe event ID            |
| processed_at | timestamptz | Auto — when event was processed |

Used for webhook idempotency. Prevents duplicate processing when Stripe retries events.

### `product_interests` table

| Column       | Type        | Notes                                   |
| ------------ | ----------- | --------------------------------------- |
| id           | uuid        | PK                                      |
| email        | text        | Subscriber email                        |
| product_slug | text        | Product they're interested in           |
| notified     | boolean     | Default false — set true after notified |
| created_at   | timestamptz | Auto                                    |
| is_test      | boolean     | NOT NULL DEFAULT false — dev/preview    |

Unique constraint on (email, product_slug). Tracks who wants to be notified about specific products.

### `cart_holds` table (NEW in v1.4)

| Column     | Type        | Notes                                |
| ---------- | ----------- | ------------------------------------ |
| id         | uuid        | PK                                   |
| session_id | text        | Browser session (localStorage UUID)  |
| product_id | uuid        | FK to products (ON DELETE CASCADE)   |
| expires_at | timestamptz | 15 minutes after creation; soft hold |
| created_at | timestamptz | Auto                                 |
| is_test    | boolean     | NOT NULL DEFAULT false — dev/preview |

Index on `(product_id, expires_at)` for efficient availability lookups. A product is "available for purchase by session X" if `products.available = true AND NOT EXISTS (cart_hold WHERE product_id = X AND session_id != X AND expires_at > now())`. This prevents the "sold while entering payment" UX shock — availability is checked and held when the user clicks {CHECKOUT} on `/cart.html`, before any PII is entered.

**`is_test` isolation (all six core tables).** `products`, `customers`, `orders`, `subscribers`, `product_interests`, and `cart_holds` each carry `is_test boolean NOT NULL DEFAULT false` (migration `20260421000001`) — the backbone of dev/preview vs. production data separation (see **Environment Strategy** + AR #37). Partial indexes `idx_products_live` / `idx_subscribers_live` (`WHERE is_test = false`) keep production reads fast on the mixed-data tables. `site_config` and `webhook_events` are the two tables **without** `is_test` (global config + idempotency ledger; environment-agnostic). The flag is set by the deployment, not the caller (`isTest = VERCEL_ENV !== 'production'`, `api/_lib/env.ts`), and every product/order read+write — including the Stripe webhook, the admin panel, and the Custom GPT — is scoped to it: a caller sees test data only when it targets a preview deployment and live data only when it targets production (the URL it points at chooses the world). This is also the toggle for testing the GPT vs. handing it off — see `GPT_SETUP.md`.

---

## Key Schema Changes in v1.4.0

Compared to v1.3.1:

1. **8 tables** (was 7) — added `cart_holds`
2. **`orders`** — added `tracking_number`, `tracking_carrier`, `shipped_at`, `delivered_at`, and `idx_orders_needs_shipping` partial index for the shipping fulfillment pipeline
3. **`subscribers`** — added `promo_code`, `promo_code_expires_at` so newsletter welcome / contemplation-offer coupons can be looked up by admin
4. **Source values** expanded to include `checkout-started` (captured on /cart.html {CHECKOUT} click even if user doesn't complete purchase)

---

## Related Documentation

  - **Brand Guide**: `assets/docs/BRAND.md`
  - **Store Administration (client how-to)**: `assets/docs/STORE_ADMINISTRATION.md`
  - **AI pipeline + Custom GPT**: `assets/docs/GPT_SETUP.md`
  - **Current build guide**: `assets/docs/archive/v1_4/v1_4_9_FINISH_TRACK_C.md` (prior `v1_4_7` / `v1_4_8_FINISH_TRACK_C.md` kept for history)
  - **KPI + Advertising Pitch**: `assets/docs/archive/v1_4/GA4_KPIS_AND_ADVERTISING.md`
  - **Previous Version (archived)**: `assets/docs/archive/v1_3/v1_3_1_IMPL_GUIDE.md`
  - **Project Brief**: `assets/docs/archive/v1_1/v1_1_PREP.md`
  - **Dev Rules**: `.agent/AGENTS.md`
  - **Mobile Design Specs**: `.agent/2026_MOBILE_DESIGN_SPECS.md`
  - **v0 Archive Manifest**: `assets/docs/archive/v0/PROCESSED.md`

---
*This document is the single source of truth for the Everlastings project architecture. Keep it updated as development progresses. If there is a more recent version IMPLEMENT.md file, it is likely that this document was neglected and not updated along side of the project implementation, and should be updated. Otherwise, and particularly in the long term, this is the source of truth.*