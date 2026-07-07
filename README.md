# Everlastings by Emaline

**Handcrafted havens for the stories that stay** — a custom e-commerce store for artisan miniature dioramas, built so a non-technical owner can run the *entire* thing — catalog, pricing, sales, inventory, refunds, fulfillment — mostly from her phone: by chatting with a Custom GPT, **or** from a purpose-built browser portal that does everything the chat does.

**Status:** v4.0.0 — built and verified on the `dev` preview; production cutover pending. This release lands the **Content Creator Portal** (a mobile-first store-management surface at `/admin`) at **full parity** with the by-chat Custom GPT, and adds **automatic store-wide sales**, a rebuilt **media modal**, **scheduled publish**, an **activity log**, sibling-aware **refunds with restock**, and end-to-end **money-integrity** fixes — all over the draft → preview → publish safety net that already lets the owner create, edit, price, discount, and inventory the whole catalog by chat. See the [Architecture reference](/assets/docs/EVERLASTINGS_STORE.md) and the [v4.0 build packet](/assets/docs/archive/v4_0/).

---

## The idea: a store you run by talking to it

Most "no-code" storefronts still make a non-technical owner *do the work* — log into a dashboard, fill in forms, wrangle image crops, remember which field does what. This architecture moves that work to a **Custom GPT**: the owner describes what she wants in plain language, and the assistant does what a developer would have done for her.

> **North Star —** minimize the owner's friction to manage her *entire* digital product (site, store, sales) by offloading the work to her Custom GPT, which should be able to do anything a capable engineering agent could do on her behalf.

In practice, the owner can — by chat — :

| She says…                                                                | The assistant does                                                                                        |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| "Add the Lavender Wreath, here are the photos" *(attaches them in chat)* | Creates the product, uploads + crops every image, drafts the copy/SEO, returns a **private preview link** |
| "Looks great — publish it"                                               | Creates the Stripe product + price, takes it live at the same URL                                         |
| "Change the price to $145"                                               | Rotates the Stripe price **in place** — same page, same link — live immediately                           |
| "Mark the Sage one sold" / "we got 3 more in"                            | Flips availability / stock **live**, no publish step                                                      |
| "Run 20% off everything until New Year's"                                | Stands up a store-wide sale that **auto-applies at checkout** — struck prices across the site, no code for shoppers to type |
| "Take the Fern down for now"                                             | Archives it (reversible — nothing is ever hard-deleted)                                                   |
| "Refund Jane's order for the Cottage"                                    | Issues the Stripe refund, then asks whether to re-list each piece that came back                          |

The safety net is **draft → preview → publish**: she always *sees* the real page before anything goes live, because no one can picture a change from a chat message alone.

### Why this is the differentiator

Having managed a print store with 500+ SKUs — even with Make automations and Notion databases — store upkeep still meant **hours** of manual building per batch. With this architecture, the ongoing barrier collapses to:

  + **One ~$20/month ChatGPT subscription** — the owner's only real recurring cost/skill requirement.
  + **~$15–75/year hosting** — Vercel + Supabase free tiers + Cloudflare R2.

So a person with **no technical knowledge** can stand up and maintain a robust, professional storefront — product pages, galleries, SEO, on-site checkout, sales, inventory — for roughly the price of a streaming service. That is the whole pitch.

---

## What makes it work

  + **Database-driven static site** — products live in Supabase, not in code; the public site is fast static HTML/JS reading through Row-Level-Security.
  + **On-site checkout** — Stripe Custom Checkout (`ui_mode: 'custom'`) keeps customers on-brand, never bounced to a hosted page.
  + **Draft/preview/publish CMS model** — staged edits, an unguessable preview link, a one-tap Publish — the standard safety UX non-technical owners need.
  + **Two fully-capable surfaces, at parity** — every management task (incl. store-wide sales, refunds, and coupons) is doable by chat through a Custom GPT **and** through the **Content Creator Portal**, a mobile-first browser surface at `/admin`; neither is a second-class fallback, so a GPT outage never strands the owner. The portal is deliberately **brand-neutral** — a reusable template that re-skins for the next client.
  + **Built to be productized** — environment-scoped (test/live), template-friendly, and deliberately generic where it can be. The same architecture re-skins for the next client; the management layer is the reusable asset.

---

## Quick Start

  ```bash
  # Clone the repository
  git clone https://github.com/seanivore/everlastings-website.git
  cd everlastings-website

  # Install dependencies
  npm install

  # Set up environment variables
  cp .env.example .env.local
  # Fill in Supabase, Stripe, R2, Cloudinary, PRODUCT_API_KEY credentials

  # Start development server
  vercel dev
  ```

**Preview at** `http://localhost:3000`

---

## Storefront (customer-facing)

  + **Product catalog** — rich product pages with 7–15 photo galleries, poetic story cards, and embedded checkout
  + **On-site checkout** — Stripe Custom Checkout with cart and automatic inventory decrement via webhooks
  + **Store-wide sales** — struck prices site-wide, a top utility bar, and a once-only popup; the discount auto-applies at checkout (mechanics below)
  + **Fulfillment** — Shippo labels (owner prints in the Shippo UI), the portal records tracking, Resend sends the branded email
  + **Dynamic homepage** — rotating themes and a featured-product carousel driven by the database
  + **Smart filters** — shop grid with multi-select filtering by series, type, and availability

## By-chat store management (the Custom GPT)

  + Custom GPT that can **create, edit, draft-preview, and publish** every product field (copy, SEO, photos — attached in chat or by link — price)
  + **Live price rotation**, **mark-sold / restock**, **store-wide sales**, and **coupons** (create / list / end) by chat
  + **Refunds by chat** — sibling-aware, with an offer to re-list each returned piece
  + **Archive / resurface** (no hard delete) and truthful **order status**
  + Runs the same draft → preview → publish path as the portal, at full parity

## New in v4.0 — the Content Creator Portal + store-wide sales

  + **A purpose-built store-management portal at `/admin`** — mobile-first (the maker runs her store from her phone), organized around *intent* ("put this up," "take it down," "run a sale," "send a refund," "mark it shipped") rather than the data model. Products are a **spreadsheet of rows** with a **per-row state LED** (five colors: live · staged-edits · draft · sold · archived), edits **preview anytime** before they go live, and any control that's disabled says *why*. It's a deliberately **brand-neutral template** — cool indigo-slate, distinct from the storefront's warm-plum brand — so it re-skins for the next client. Four static pages (Products · Orders · Sales · Account); no SPA, no framework.
  + **Full portal ↔ GPT parity** — every management task is equally doable in the portal *and* the Custom GPT, so a GPT outage never strands the owner and neither surface is a second-class fallback.
  + **Automatic store-wide sales** — set a percentage and dates once; the discount **auto-applies at checkout** (no code for shoppers to type), with **struck prices** across shop / product / cart, a top utility bar, and a once-only popup. A shopper's own promo code cleanly **replaces** the sale.
  + **Rebuilt media modal** — upload, reorder, and re-role images in one modal, with the gallery order persisted.
  + **Scheduled publish** — stage a draft to go live at a future time, flipped by the existing daily cron.
  + **Activity log** — an audit trail of every mutation (who did what: the signed-in admin, the GPT, or the cron), surfaced on the Account page.
  + **Sibling-aware refunds with restock** — one cart can be several pieces on a single Stripe payment; a refund targets only the pieces that came back and, on the re-list switch, **restocks each one automatically** (+1 quantity, back on sale).
  + **Money integrity** — orders record the **real per-item amounts** (a $310 + $88 cart writes $310 and $88, not an even $199/$199 split), and a daily reconciliation job catches any orphaned Stripe session.

> Built and gap-reviewed across many cold review passes, then verified on the `dev` preview. The owner runs the whole catalog — money included — by chatting with her Custom GPT, or from a polished portal that does everything the chat does.

---

## Technology Stack

  + **Frontend**: Vanilla HTML/CSS/JS — storefront *and* portal (no framework, no build step)
  + **Backend**: Vercel Serverless Functions (TypeScript compiled to CommonJS; 11 functions on Hobby)
  + **Database**: Supabase (PostgreSQL + Auth + Row Level Security)
  + **Payments**: Stripe Custom Checkout (`ui_mode: 'custom'`)
  + **AI management**: OpenAI Custom GPT with Actions (JSON API), authenticated via a product API key
  + **Images**: Cloudinary (transform) → Cloudflare R2 (CDN at `cdn.everlastingsbyemaline.com`)
  + **Analytics**: Google Analytics 4 (gtag.js) + Meta Pixel (retargeting + Instagram Shopping)
  + **Email**: Resend (transactional — tracking, cart recovery coupons, newsletter welcome)
  + **Shipping**: Shippo free tier (owner prints labels in Shippo UI, the portal records tracking, Resend sends branded email)
  + **Hosting**: Vercel (auto-deploy on push)

---

## Project Structure

  ```
  everlastings-website/
  ├── *.html                   # Storefront pages
  ├── api/                     # Vercel serverless functions (TypeScript → CommonJS)
  ├── admin/                   # Content Creator Portal (/admin) — 4 static pages:
  │                            #   products · orders · sales · account (+ portal.js/.css)
  ├── assets/
  │   ├── css/                 # Styles + design tokens
  │   ├── js/                  # Storefront controllers
  │   └── docs/                # Project documentation + per-version build archive
  └── .agent/                  # AI agent build rules
  ```

**Full documentation**: [EVERLASTINGS_STORE.md](/assets/docs/EVERLASTINGS_STORE.md)

### Branching

  - `main` → Production (live Stripe keys)
  - `dev` → Preview/staging (test Stripe keys)
  - `feat/*` → Feature branches (test Stripe keys)

Vercel auto-scopes environment variables per branch, so the same codebase runs against test or live Stripe depending on where it's deployed. See the implementation guide for the full environment strategy.

---

## Documentation

| Document                                                                                    | Description                                                                                                                       |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [Architecture](/assets/docs/EVERLASTINGS_STORE.md)                                          | Complete technical reference                                                                                                      |
| [Brand Guide](/assets/docs/BRAND.md)                                                        | Voice, colors, typography, copy, email templates                                                                                  |
| [Implementation Guide](/assets/docs/archive/v1_4/v1_4_3_IMPLEMENT.md)                       | Phase 0 setup + Tracks A/B/C build                                                                                                |
| [v1.4.9 Build Report](/assets/docs/archive/v1_4/v1_4_9_BUILD_REPORT.md)                     | What shipped in the checkout/fulfillment build + deviations                                                                       |
| [v1.5 Plan + Gap-Review History](/assets/docs/archive/v1_5/)                                | AI store-management — the living plan + its cold-review hardening                                                                 |
| [GA4 KPIs + Advertising](/assets/docs/archive/FUTURE_RESOURCES/GA4_KPIS_AND_ADVERTISING.md) | KPI + ad strategy                                                                                                                 |
| [Store Administration](/assets/docs/STORE_ADMINISTRATION.md)                                | Owner how-to: products + orders across GPT, Admin, Studio                                                                         |
| [GPT Setup + AI Pipeline](/assets/docs/GPT_SETUP.md)                                        | Custom GPT brain + setup; agentic curl protocol                                                                                   |
| [v2.0 Store-Management Build](/assets/docs/archive/v2_0/)                                   | The by-chat management layer — IMPLEMENT, design/testing addenda, build report                                                    |
| [v3.3 Build Packet](/assets/docs/archive/v3_3/)                                             | Management parity (refunds + coupons), chat-attach upload, inventory, admin polish, homepage — IMPLEMENT + addenda + build report |
| [v4.0 Build Packet](/assets/docs/archive/v4_0/)                                             | Content Creator Portal + store-wide sales + media modal + scheduled publish + activity log + refund-restock + money integrity — IMPLEMENT + addenda + build report |

---

## About

**Everlastings by Emaline** was built by [Sean August Horvath](mailto:sean@august.style) for artist Emy Hoff — creating miniature sanctuaries where loss transforms into something you can hold. The store's architecture is designed to be reusable: a by-chat management layer over a low-cost, on-brand storefront that the same developer can re-skin and extend for other makers and merchants.

  + Client: [everlastingsbyemaline.com](https://everlastingsbyemaline.com)
  + Developer: [august.style](https://august.style)
