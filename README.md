# Everlastings by Emaline

**Handcrafted havens for the stories that stay** — A custom e-commerce site for artisan miniature dioramas.

---

## What Makes This Special

  + **Database-driven static site** — Products live in Supabase, not in code. Client edits content through a web UI, site reflects instantly.
  + **Near-zero operating costs** — Vercel free tier + Supabase free tier + Cloudflare R2 = ~$15-75/year total.
  + **On-site checkout** — Stripe Custom Checkout (Elements) keeps customers on-site with full brand experience.
  + **Template-friendly** — Architecture designed for reuse across multiple client projects.

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

## Key Features

  + **Product catalog** — Rich product pages with 7-15 photo galleries, poetic story cards, and embedded checkout
  + **Admin panel** — Non-technical client manages products through browser-based UI
  + **Dynamic homepage** — Rotating themes and featured product carousel driven by database
  + **Stripe integration** — Custom on-site checkout with cart, automatic inventory updates via webhooks
  + **Smart filters** — Shop grid with multi-select filtering by series, type, and availability

---

## Technology Stack

  + **Frontend**: Vanilla HTML/CSS/JS (no framework)
  + **Backend**: Vercel Serverless Functions (TypeScript)
  + **Database**: Supabase (PostgreSQL + Auth + Row Level Security)
  + **Payments**: Stripe Custom Checkout (ui_mode: 'custom')
  + **Images**: Cloudinary (transform) → Cloudflare R2 (CDN at `cdn.everlastingsbyemaline.com`)
  + **Analytics**: Google Analytics 4 (gtag.js) + Meta Pixel (retargeting + Instagram Shopping)
  + **Email**: Resend (transactional — tracking, cart recovery coupons, newsletter welcome)
  + **Shipping**: Shippo free tier (Emy prints labels in Shippo UI, admin records tracking, Resend sends branded email)
  + **Hosting**: Vercel (auto-deploy on push)

---

## Project Structure

  ```
  everlastings-website/
  ├── *.html                   # Frontend pages
  ├── api/                     # Vercel serverless functions (TypeScript)
  ├── assets/
  │   ├── css/                 # Styles + design tokens
  │   ├── js/                  # Frontend controllers
  │   └── docs/                # Project documentation
  ├── admin/                   # Admin panel
  └── .agent/                  # AI agent instructions
  ```

**Full documentation**: [EVERLASTINGS_STORE.md](/assets/docs/EVERLASTINGS_STORE.md)

### Branching

  - `main` → Production (live Stripe keys)
  - `dev` → Preview/staging (test Stripe keys)
  - `feat/*` → Feature branches (test Stripe keys)

Vercel auto-scopes environment variables per branch. See implementation guide for full environment strategy.

---

## Documentation

| Document                                                               | Description                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| [Architecture](/assets/docs/EVERLASTINGS_STORE.md)                     | Complete technical reference                     |
| [Brand Guide](/assets/docs/BRAND.md)                                   | Voice, colors, typography, copy, email templates |
| [Implementation Guide](/assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md) | Phase 0 setup + Tracks A/B/C build               |
| [Action Steps](/assets/docs/archive/v1_4/v1_4_2_IMPL_STEPS.md)         | Checklist version                                |
| [GA4 KPIs + Advertising](/assets/docs/GA4_KPIS_AND_ADVERTISING.md)     | KPI + ad strategy                                |
| [Product Protocol](/assets/docs/PRODUCT_PROTOCOL.md)                   | AI product creation protocol, client guide       |
| [Client Ask List](/assets/docs/CLIENT_ASK_LIST.md)                     | One-email setup checklist to send to Emy         |

---

## About

**Everlastings by Emaline** was built by [Sean August Horvath](mailto:sean@august.style) for artist Emy Hoff — creating miniature sanctuaries where loss transforms into something you can hold.

  + Client: [everlastingsbyemaline.com](https://everlastingsbyemaline.com)
  + Developer: [august.style](https://august.style)