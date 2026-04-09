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
# Fill in Supabase, Stripe, R2 credentials

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
  + **Images**: Cloudflare R2 (CDN)
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

---

## Documentation

| Document                                                               | Description                              |
| ---------------------------------------------------------------------- | ---------------------------------------- |
| [Architecture](/assets/docs/EVERLASTINGS_STORE.md)                     | Complete technical reference             |
| [Brand Guide](/assets/docs/BRAND.md)                                   | Voice, colors, typography, copy          |
| [Implementation Guide](/assets/docs/archive/v1/v1_2_IMPLEMENTATION.md) | 10-session build plan with code snippets |
| [Action Steps](/assets/docs/archive/v1/v1_2_ACTION_STEPS.md)           | Checklist version of impl guide          |
| [Product Guide](/assets/docs/PRODUCT_GUIDE.md)                         | Client-facing product entry guide        |

---

## About

**Everlastings by Emaline** was built by [Sean August Horvath](https://august.style) for artist Emy Hoff — creating miniature sanctuaries where loss transforms into something you can hold.

  + Client: [everlastingsbyemaline.com](https://everlastingsbyemaline.com)
  + Developer: [august.style](https://august.style)
