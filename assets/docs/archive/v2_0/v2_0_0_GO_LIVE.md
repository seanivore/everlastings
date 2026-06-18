# Go-Live — ship the store to production (`main`, tag `v2.0.0`)

This is your runbook for the first push of the store to production. Every item below is either a command you can paste or a dashboard click with a clear "done looks like." It's **independent of the v3.3.0 build** (that keeps going on `dev` and ships the same way later). Versioning is **git-tag-only** — there's no `package.json` version to bump.

> **Heads-up on the merge:** `main` is *not* a clean fast-forward from `dev`. `main` carries one older README commit (`ff4829a`) and `dev` is ~313 commits ahead. **dev's README is the current public-facing v2.0 version** (already rewritten for launch), so we **overwrite** `main` with `dev` — dev wins, main's older draft is discarded. That's a force-push, handled in §2.

> **One GPT, one server URL.** The Custom GPT (Em's account) has a single Action server URL. For this go-live it points at **production**. You'll repoint it to **preview** to test v3.3.0 later, then back to **production**. Keep that in mind whenever you touch the GPT.

---

## 1. Pre-flight — do these before pushing

Set production env + services **first**, so the production deploy doesn't go out with anything missing. Most of these are quick.

### 1a. Content placeholders — clear (DONE this build)

  + [x] Scoped check returns nothing:
    - `grep -n 'PLACEHOLDER:' *.html | grep -v _components.html`
    - **Done looks like:** no output (exit status 1). The old repo-wide `grep -rn 'PLACEHOLDER:'` returns ~80 — that's docs/archive + the `_components.html` styleguide (which *documents* the placeholder convention) + one stale JS comment, all noise. The scoped command above is the real check.
    - Effective dates on `privacy.html` / `terms.html` are set to **2026-06-18**; About + commission copy is finalized. (Agent-authored to best ability — Em can refine her bio/commission numbers in a later build; nothing empty ships.)

### 1b. Live Stripe keys — verify present (DONE — by name)

  + [x] `vercel env ls` shows all four in the **Production** scope: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRODUCT_API_KEY`.
    - **Done looks like:** all four names listed under Production. The values are encrypted, so the CLI can't tell you they're *live-mode* (`sk_live…`) — that gets proven by the live smoke test in §3.
    - **Going forward:** env vars are set **non-Sensitive** so you can read/copy them straight from the Vercel dashboard to verify — no more minting new keys every time a value is in doubt. (You're the only one with Vercel access, so this is your call and it's the right one for a solo-owner project.)

### 1c. Live-mode coupons — bootstrap (you run this)

The store hardcodes two system coupons by ID. They must exist **in live mode** or two features silently fail: the sold-in-cart apology (`cart-recovery-10`) and the newsletter welcome code (`newsletter-welcome-5`). There's an idempotent script — safe to run repeatedly.

  + [x] With the **live** secret key in your shell, run the bootstrap:
    - `STRIPE_SECRET_KEY=sk_live_… npx tsx api/_bootstrap/coupons.ts`
    - **Done looks like:** `Created coupon: cart-recovery-10` / `Created coupon: newsletter-welcome-5` (or `Coupon already exists, skipping:` if you've run it before). Either is success.
    - These are the discount *rules*; the per-customer single-use *codes* are minted on the fly from them at runtime.
    - NOTE: did this and both came back already created 

### 1d. Stripe receipts + branding — set in live mode (you, dashboard)

Flip the dashboard to **live mode** (top-left toggle) first — these settings are per-mode. Use the direct URLs; the menu paths move around.

  + [x] **Business name + statement descriptor** → `dashboard.stripe.com/settings/public`
    - Set the public business name to "Everlastings by Emaline" and a clear statement descriptor (what shows on the buyer's card statement).
  + [x] **Logo + brand color** → `dashboard.stripe.com/settings/branding`
    - These appear on anything Stripe emails (receipts, refund notices).
  + [x] **Customer receipt email** → `dashboard.stripe.com/settings/emails`
    - Turn **"Successful payments"** ON so buyers get a receipt. (See the email map in §4 — the *receipt* is the one email Stripe sends; everything else is ours via Resend.)
    - **Note:** Stripe has quirks about when receipts send in *test* mode, which is why it felt inconsistent before. You'll confirm it for real in the live smoke test (§3).

### 1e. Admin logins (you) 

**NOTE**: also noted below, but this cannot be done until functionality to the Google Workspace account is fixed because of email confirmation notifications during setup and password changes. 

  + [ ] Add the remaining admins in Supabase Auth so Em (and any helper) can reach `/admin`.
  + [ ] Walk the **service-login inventory in §5** — confirm which accounts still hold your personal password vs. the hand-off-able one for Em. (That list doubles as Em's handoff sheet.)

### 1f. Point the GPT at production (you — do this last)

**NOTE**: Saving to do before using GPT, period. Rule will be that I check how it is set up before each use. To go live right now I don't need to change GPT to production since I won't be using it right after. 

  + [ ] In Em's GPT builder: Action server URL → the **production** URL · auth → the **Production** `PRODUCT_API_KEY` (not the preview key) · confirm **Web Browsing is ON**.

### 1g. Quick confirms (mostly nothing to do)

  + [x] **DNS** — one glance: the custom domain is attached to the project's Production target in Vercel. Pushing `main` auto-deploys Production; the prod domain is unprotected by design. Nothing else to do.
  + [x] **Docs** — `EVERLASTINGS_STORE.md` + `README.md` reflect the shipped state (spot-checked; the full doc re-verify happens at the v4.0.0 as-built after v3.3.0, which rewrites those areas anyway).

> **Recurring step for every future go-live too:** bump the **effective dates** on `privacy.html` + `terms.html` to the ship date.

---

## 2. Ship — `dev` → `main`

First make sure `dev` is clean: **commit or stash any in-progress work** (otherwise uncommitted changes follow you onto `main` during the checkout). Then, from the repo root:

```
git fetch origin && git checkout main
git reset --hard dev                       # main := dev (discards main's older README ff4829a)
git push --force-with-lease origin main     # safe overwrite — refuses if origin moved under you
git tag v2.0.0 && git push origin v2.0.0    # git-tag-only versioning — the repo's first tag
git checkout dev                            # back to dev to keep building v3.3.0
```

  - `--force-with-lease` overwrites remote `main` but **refuses** if someone pushed since your last `fetch` (safer than `--force`).
  - After this, `main == dev`; Vercel deploys `main` → production.
  - The launch tag is **`v2.0.0`** — the repo's first tag.

---

## 3. After the push — verify

  + [x] **Production URL loads** — a product page + `/shop` render; no console errors.
  + [ ] **One real live buy-then-refund** (the one thing the preview/test env can't prove — it confirms the live keys, the live webhook signing secret, and the receipt all at once):
    - Buy the lowest-priced live product with a real card.
    - Confirm: the order appears in `/admin`; the **merchant** "New order" email arrives (to `ORDER_NOTIFY_EMAIL`); the **Stripe receipt** reaches the buyer (this is where §1d pays off).
    - Refund it in Stripe (live mode). Confirm the order flips to `refunded` in `/admin` — that proves the live `charge.refunded` webhook + signing secret.
  + [ ] **GPT against live** — inadvertently proven the first time Em creates a real product through it (it lists/creates against the live store).
  + [ ] **Keep-alive cron** — Vercel → the project → Crons shows the daily `/api/product-feed` run. It's production-only and activates now, at launch (a daily real DB read so the free-tier Supabase project never pauses). Nothing to set up — just confirm it's there.

---

## 4. Email system map (for you + Em's handoff)

Every **customer** email is ours, sent via **Resend** (`api/_emails/index.ts` + `api/subscribe.ts`). The only email Stripe sends is the **receipt**. Env vars: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL`, `ORDER_NOTIFY_EMAIL`.

  - **Purchase receipt → buyer** · from **Stripe** (automatic) · fires on a successful payment *if* "Successful payments" is ON (§1d) · the one to verify in the smoke test. We do **not** send our own receipt.
  - **"New order" → Em (merchant)** · from **Resend** · fires on the order webhook (`webhook.ts`) to `ORDER_NOTIFY_EMAIL` · the fulfillment to-do list, not a customer email.
  - **"Your haven is on its way" → buyer** · from **Resend** · fires when Em adds a tracking number in `/admin` or via the GPT · the shipment email (the one you said looks great).
  - **Newsletter welcome → subscriber** · from **Resend** · fires on signup. *Footer* form = plain welcome, no code. The *contemplation-offer* form = welcome **+ a single-use 5% code** (`newsletter-welcome-5`). Re-submitting an already-subscribed email returns "Already subscribed" and sends nothing.
  - **"A small apology, and X% off" → would-be buyer** · from **Resend** · fires when a held item sells before that person checked out (cart-recovery), using `cart-recovery-10`.

---

## 5. Service-login inventory (handoff sheet)

**NOTE**: I (Sean) went to update/confirm all logins were to the admin@ email and used the proper password but was blocked because I cannot access the Google Workspace emails until Emy updates the account. 

Every account behind the store, what it's for, and whose login it's under. Use this to confirm which still hold your personal password vs. the hand-off-able one for Em (the goal is a clean sheet she can own).

**Build + hosting**
  - **Vercel** — hosting, deploys, env vars, crons. (Yours.)
  - **Supabase** — database, auth, Studio (project `rvnxftbfeaxymhzxxhjm`). (Admin access for Em via Auth.)
  - **Domain registrar** — `everlastingsbyemaline.com`, DNS pointed at Vercel.

**Payments + email**
  - **Stripe** — payments, coupons, refunds, receipts (live + test).
  - **Resend** — all transactional/customer email (`RESEND_*`).

**Media + shipping**
  - **Cloudflare R2** — product-media CDN (`cdn.everlastingsbyemaline.com`, bucket `everlastings`).
  - **Cloudinary** — stateless image transform (crop/WebP), not a host.
  - **Shippo** — shipping labels (web UI).

**Management + presence**
  - **OpenAI / ChatGPT** — the "Sunkeeper" Custom GPT. **(Em's account.)**
  - **Google** — and for the Google Workspace email `admin@everlastingsbyemaline.com` which is under `sean@everlastingsbyemaline.com`. *(Currently down — affects Em's email access.)*
  - **Google Analytics (GA4)** — `GA4_MEASUREMENT_ID`. Run by same Google login.
  - **Meta / Facebook** — Pixel + Conversions API. *(Not configured yet — `META_*` env vars unset; see `assets/docs/archive/v3_3/v3_3_0_FUTURE_meta-capi.md`.)*

---

## 6. After this — the v3.3.0 build

The v3.3.0 build happens on `dev` and ships the same way (§2) when ready — the next tag bumps from `v2.0.0`. Your full, chronological build + test runbook is **`assets/docs/archive/v3_3/v3_3_0_HUMAN_STEPS.md`** (the migration you run by hand, the GPT re-paste, the homepage renders to bless, the preview test-env setup, the re-ship).

  - **One GPT, one server URL — you repoint it three times.** Now (this go-live) → **production**. To test v3.3.0's new Actions → **preview**. After v3.3.0 ships → **production** again. While it points at preview, manage the live store via `/admin` (not the GPT), so keep that test window tight.
