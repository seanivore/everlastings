# Plan: Finish Phase 0 Services + Reconcile Docs with Current Tool Reality

## Context

Sean is stalled in Phase 0 because the Supabase dashboard no longer looks like the IMPL_GUIDE describes. Supabase did a major API-key overhaul in late 2025 (`anon`/`service_role` → `publishable`/`secret`), and the dashboard's "CONNECT" modal is framework-oriented (Next.js/Remix/Vue/SvelteKit/…) — none of which fit the project's vanilla-HTML + Vercel-serverless-TypeScript shape. The IMPL_GUIDE also uses dev-shorthand terms ("migrations via MCP", "Stripe coupon bootstrap", "DB webhook") without defining them, which is compounding the friction.

Scope for this session (confirmed with Sean): walk through **all Phase 0 services end-to-end**, reconcile the docs with what's actually in each dashboard today, and produce a single "client ask list" for Emy so we stop piecemeal-pinging her. Emy-blocked items (Meta, domain verification) get explicit "keep-moving-without-it" notes so we don't stall.

---

## Tech Stack at a Glance (NEW — to be pinned at top of both docs)

| Layer          | What we use                                            | Why                                                             |
| -------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| Frontend       | Vanilla HTML + CSS + JS, loaded directly in the browser| No build step, no framework, no React. Proven pattern.          |
| Frontend libs  | `@supabase/supabase-js` + `stripe.js` via CDN          | Script tags only. No npm install for the browser.               |
| Backend        | TypeScript in Vercel Serverless Functions (Node.js)    | Type safety for Stripe + Supabase server-side calls.            |
| Backend libs   | `npm install` only inside `/api/*.ts` world            | `package.json` drives a normal Node/TS toolchain for the API.   |
| Runtime        | Vercel (free tier)                                     | Auto-deploy, per-branch env vars, serverless functions.         |
| Database       | Supabase Postgres (free tier)                          | REST API + RLS + Auth + Studio UI.                              |
| Assets         | Cloudflare R2 + `cdn.everlastingsbyemaline.com`        | Public CDN for images/video. Cloudinary is a stateless transformer only — not a host. |
| Payments       | Stripe Custom Checkout (`ui_mode: 'custom'`)           | On-site checkout with full brand control.                       |
| Email          | Resend                                                 | Transactional email; free tier 3k/mo.                           |
| Shipping       | Shippo Starter (web UI only in v1)                     | 30 free USPS labels/mo.                                         |
| Analytics      | GA4 (gtag.js) + Meta Pixel                             | CDN script tags. No GTM.                                        |

**What we are NOT using** (and why docs might look weird when they suggest these):
- **No Next.js, no React, no SSR.** Supabase's "CONNECT" dropdown and `@supabase/ssr` package assume Next.js — ignore them.
- **No MCP-first toolchain.** MCP is a young protocol; where a standard CLI (Supabase CLI, Stripe CLI, Vercel CLI) does the job, use it.
- **No Supabase Branching and no Supabase/Vercel Marketplace integration.** Both are optimized for branching-based dev workflows; our `is_test` flag + shared-project design already solves the separation.

---

## Plain-English glossary for confusing IMPL_GUIDE terms

| Term in docs                       | What it actually means                                                                           | Simpler equivalent you may know                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| "Apply migrations"                 | Run the SQL that creates all 8 tables + the RLS rules + the auto-update triggers                 | "Run the create-tables SQL once"                               |
| "Migrations via MCP"               | Using the Supabase MCP server tool to run that SQL. Optional — CLI does the same.                | We'll use **Supabase CLI `supabase db push`** instead.         |
| "Supabase DB webhook"              | A setting inside Supabase Studio that says "when a row is inserted into `products`, POST to ___" | An HTTP trigger — like an IFTTT rule — fired by the database.  |
| "Stripe webhook" (different thing) | Stripe's outbound notification when a payment completes                                          | Standard Stripe webhook. Unrelated to the Supabase DB webhook. |
| "Stripe coupon bootstrap"          | A one-time script that creates the two base coupons in Stripe via API so dev and prod match      | "Run this once; it creates the two coupons for us." Alternative: click-create them in the Stripe dashboard. |
| "Preview CORS smoke test"          | Push a throwaway branch; open the Vercel preview URL; confirm API calls work                     | A 2-minute sanity check we added because past projects had invisible CORS bugs on preview. |

---

## Supabase findings (current reality, cross-verified against supabase.com/docs)

1. **API keys**: New projects get `sb_publishable_…` (replaces `anon`) and `sb_secret_…` (replaces `service_role`). Functionally identical; rename env vars to match. Legacy JWT format keys are not even issued to new projects anymore after Nov 2025.
2. **JWT Keys tab**: a separate Auth-subsystem concern we don't touch. Ignore it.
3. **Dashboard "CONNECT" modal**: 4 tabs — Framework / Direct / ORM / MCP. None apply cleanly to us:
   - **Framework** → pushes Next.js / Remix / Vue code we don't want
   - **Direct** → connection string, only needed for Supabase CLI or psql
   - **ORM** → third-party (Prisma/Drizzle), unused
   - **MCP** → agent tool, we're opting out in favor of CLI
   - **Our path**: not in the modal at all. We use `@supabase/supabase-js` via CDN on the frontend and via npm in `/api/*.ts`.
4. **DB password**: Only needed if we use Supabase CLI (it prompts once during `supabase link` and stores the credential locally in `~/.supabase/`), or if we ever use psql/ORM. **Not an env var in this project.** No need to put it in `.env.local`. Keep it in a password manager.
5. **Free tier auto-pause**: 7 days of inactivity. No keep-alive on free tier. Resume from dashboard when we sit down; Pro ($25/mo) at launch if pauses become painful.
6. **Vercel marketplace integration**: Next.js-shaped (writes `NEXT_PUBLIC_` env vars). We skip it — we already use `vercel env add` manually, which is the documented fallback for non-framework projects.
7. **Supabase branching**: Real product, but a separate-database-per-branch paradigm that contradicts our shared-project + `is_test` design. Skip for v1.
8. **Sean's branching-vs-skip concern (what the docs bias toward)**: The *dashboard* nudges users toward integrations, but the *actual docs* (Environment Variables, CLI Reference, Managing Environments) fully support manual `vercel env add` — it's the published path for non-framework apps. Skipping integration doesn't mean going off-road; it means staying on the plain-JS road that Supabase explicitly documents.
9. **🚨 DB password is in git history** (commit `43f187b`, branch `everlastings`, file `v1_4_2_IMPL_GUIDE.md` lines ~192). Must be rotated. Rewriting git history is optional — the rotated password makes the old one inert.

---

## Decisions confirmed with Sean

- [x] **Scope**: all Phase 0 services this session, with pacing on service-by-service basis.
- [x] **Env var naming**: rename to `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` everywhere.
- [x] **Branching & Vercel/Supabase integration**: skip (confirmed after research; docs fully support the skip path).
- [x] **MCP vs CLI**: prefer Supabase CLI + Stripe CLI + Vercel CLI. MCP as optional fallback only.
- [x] **Tech Stack clarification**: add the "Tech Stack at a Glance" section to EVERLASTINGS_STORE.md and v1_4_2_IMPL_GUIDE.md so future sessions open with an unambiguous picture.

---

## Execution plan (when exiting plan mode)

### Step 1 — Rotate the leaked DB password
1. Sean: Supabase Dashboard → Settings → Database → **Reset database password**. Save new value in 1Password/Bitwarden only.
2. Done — the old committed password is now inert.

### Step 2 — Document reconciliation (single pass, all files)
1. **`assets/docs/EVERLASTINGS_STORE.md`** — insert the **Tech Stack at a Glance** section near the top (after Executive Summary). Update env-var tables (~lines 198-216 and ~600-619) to use `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`.
2. **`assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md`**:
   - Insert the **Tech Stack at a Glance** section at the very top (before AR list).
   - Insert the **Plain-English glossary** section right after, as a standing reference.
   - Replace the current Supabase subsection (lines ~163-328) with a concise, correct one that:
     - Uses the new key terminology
     - States explicitly "do NOT click into Framework/ORM/MCP tabs, do NOT enable branching or the Vercel marketplace integration, here's why"
     - Shows the vanilla-JS CDN script tag and the `/api/*.ts` npm import — the only two patterns we use
     - Notes that DB password is password-manager only, not env
     - Warns about 7-day auto-pause
   - Replace all MCP-preferred migration/webhook language with CLI-preferred (Supabase CLI `supabase db push` for schema; Stripe CLI for Stripe; CLI-fallback-to-dashboard otherwise).
   - Fix `.env.example` block (~lines 882-916) with the renamed vars.
   - Remove the raw project ref and publishable key from the Sean-pasted block (keep only placeholders).
3. **`assets/docs/archive/v1_4/v1_4_2_IMPL_STEPS.md`**:
   - Update line 67 checkbox to use `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`.
   - Add a short "Prerequisites for Track A" and "Prerequisites for Track B" block so it's obvious what must finish before parallel work can start.
4. **`assets/docs/PRODUCT_PROTOCOL.md`** — no Supabase env changes needed; verify one pass that nothing references old key names.
5. **`.env.example`** — create from the IMPL_GUIDE reference with renamed vars (currently the file may not exist; that's a Phase 0 agent task already on the list).

### Step 3 — Supabase: finish the setup
- [ ] Sean: Resume paused project (Supabase dashboard → Resume).
- [ ] Sean: Settings → API Keys → Publishable key: copy (already have), **Secret key: copy** (new — go find it in the Secret Keys tab).
- [ ] Sean: Authentication → Users → Invite: `admin@…`, `sean@…`, `emyh@everlastingsbyemaline.com`.
- [ ] Sean+Agent: Paste `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` into `.env.local` AND run `vercel env add` for each across **Production + Preview + Development** scopes.
- [ ] Agent: install Supabase CLI (`brew install supabase/tap/supabase` or `npm i -g supabase`), `supabase login`, `supabase link --project-ref rvnxftbfeaxymhzxxhjm` (Sean provides password at prompt, one-time).
- *Defer to Track A-prep (not this session)*: running `supabase db push` to apply the 8-table schema; configuring the DB webhook.

### Step 4 — Walk the remaining services, one at a time
Pacing: wait for Sean to complete each before moving to the next. For every service the agent will:
(a) hand Sean a 2-line "what to click" instruction, (b) say exactly which values to copy, (c) paste them into `.env.local`, (d) give the `vercel env add` commands for preview + production, (e) confirm back.

1. **Stripe** — create account if new, copy test keys (sk_test_/pk_test_), enable receipt emails, note that we'll add live keys at C4 launch. CLI: `brew install stripe/stripe-cli/stripe`, `stripe login`.
2. **Cloudflare R2** — create `everlastings` bucket, enable public access, connect `cdn.everlastingsbyemaline.com` as custom domain, create R2 API token with Read & Write scope. Wait for custom-domain "Active" status.
3. **Cloudinary** — create account, Settings → API Keys → copy cloud name + API key + API secret, compose `CLOUDINARY_URL=cloudinary://KEY:SECRET@CLOUD`.
4. **Resend** — create account (free tier, no credit card), add `everlastingsbyemaline.com`, copy the DNS records it gives you, **add them in Cloudflare DNS** (needs domain control — Sean has this), wait for verification, copy API key.
5. **GA4** — create property for `everlastingsbyemaline.com`, note `G-XXXXXXXXXX` Measurement ID.
6. **Google Search Console** — verify ownership via DNS TXT record in Cloudflare.
7. **Shippo** — create Starter account, link USPS. No env var (v1 is web UI only).
8. **Meta** *(Emy-blocked for several pieces — see below)* — create Business Manager if not already. Full setup deferred to the Client Ask List.
9. **`PRODUCT_API_KEY`** — `openssl rand -hex 32` twice (one for Production scope, one for Preview scope — so a leaked preview key never unlocks prod).

### Step 5 — Branch reconciliation
1. Merge `everlastings` → `main` (creates/updates main).
2. Create `dev` from `main`: `git checkout main && git checkout -b dev && git push -u origin dev`.
3. Delete `everlastings` locally and on origin.
4. Confirm Vercel auto-deploys: `main` → Production, `dev` → Preview.
5. Double-check via `vercel env ls` that every variable is scoped correctly (live Stripe only in Production; test Stripe in Preview+Development; shared keys in all three).

### Step 6 — Produce the "Client Ask List" for Emy
Create `assets/docs/CLIENT_ASK_LIST.md` as a single email-ready document with every item Emy needs to do, grouped by service, with screenshots/steps, and estimated time. This replaces the piecemeal pinging pattern.

Expected buckets:
- Meta: Business Manager access confirmation, Instagram → Business profile, IG connected to Facebook Page, Commerce Manager catalog, Meta Pixel creation (if Emy is the owner of these assets), domain verification acknowledgment
- Shippo: confirm account created + USPS linked
- Any profile/address/phone info we need for Stripe account (if Emy owns the Stripe account rather than Sean)
- Content items (product photos, story-card drafts) — optional; track separately if desired
Format: one bulleted checklist, Emy-friendly language, no jargon, with "why we need this" and "how long it'll take" per item.

### Step 7 — Verification checkpoint before declaring Phase 0 done
- [ ] `vercel env ls` lists every required variable with correct scoping.
- [ ] `cat .env.local` has every required variable populated (no TBDs except Meta if Emy-blocked).
- [ ] Supabase project status: Active, 3 admins invited and visible.
- [ ] `supabase --version` works, `supabase status` shows project linked.
- [ ] `grep -rn "q6Zjwx5xMHbXUlpy\|rvnxftbfeaxymhzxxhjm\|sb_publishable_SvdSORHm8Ot0hcvfB6b9YQ_eRvlyx_c" assets/docs` returns nothing (leaked values cleaned from live docs).
- [ ] Vercel: production deploy of `main` loads; preview deploy of `dev` loads.

### Step 8 — What unblocks Track A vs Track B
- **Track A (Backend)** needs: Supabase schema applied (deferred to next session — Sean: `supabase db push`), Supabase DB webhook configured, Stripe test keys loaded, R2 credentials loaded, Cloudinary loaded, Resend loaded, `PRODUCT_API_KEY` loaded. Meta/GA4 can be wired later.
- **Track B (Frontend Design)** needs: nothing from Phase 0 services — Track B is all hardcoded placeholder HTML/CSS. It can start *immediately* after Step 2 (docs reconciliation) as long as the repo's `package.json`, `vercel.json`, `tsconfig.json` are in place.

If Emy's Meta setup takes a week, Track A and Track B still proceed uninterrupted.

---

## Critical files to be modified

- `assets/docs/EVERLASTINGS_STORE.md` — Tech Stack section (new), env var tables (rename), top-of-file note about what we don't use
- `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md` — Tech Stack section (new), glossary section (new), Supabase subsection rewrite (~lines 163-328), env var table (~lines 459-478), `.env.example` block (~lines 882-916), all MCP→CLI swaps
- `assets/docs/archive/v1_4/v1_4_2_IMPL_STEPS.md` — env var rename (line 67), Track A/Track B prerequisites block (new)
- `assets/docs/CLIENT_ASK_LIST.md` — NEW: single email-ready document
- `.env.example` — create from IMPL_GUIDE reference with new var names
- `.env.local` — Sean fills in real values as we go

## Reuse / existing patterns honored

- Memory `feedback_env_strategy.md` — Vercel env scoping (test for preview, live for production) unchanged
- Memory `feedback_preview_cors.md` — per-route TS CORS helper unchanged, stays as Track A task
- Memory `project_rls_v1_decision.md` — role-blind RLS unchanged
- Memory `feedback_architecture.md` — no GitHub Actions / no React / no git for client unchanged
- IMPL_GUIDE > Dev/Test Data Hygiene — `is_test` flag is the reason we don't need branching; keep as-is

## Verification (end-to-end, post-approval)

1. Open the updated IMPL_GUIDE and confirm: Tech Stack section visible at top; glossary reference visible; Supabase section reads cleanly and matches current dashboard.
2. Run `vercel env pull .env.test` → every variable present; scopes correct.
3. `curl -H "apikey: $SUPABASE_PUBLISHABLE_KEY" $SUPABASE_URL/rest/v1/` → 200 with OpenAPI spec.
4. Sign in to Supabase Studio as `sean@…` invited admin → dashboard loads.
5. `supabase status` → project linked to correct ref.
6. `git log -S "q6Zjwx5xMHbXUlpy" --all` — old commits retain the (now-inert) password; current working tree has zero matches in `assets/docs/`.
7. Track B can begin immediately; Track A waits only on `supabase db push` + DB webhook config (planned for next session).
