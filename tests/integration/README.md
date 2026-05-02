# Integration Test Sweep

End-to-end tests for the v1.4.3 backend (Track A). One bash script per test case.
Each script is independently runnable and self-cleaning. `run-all.sh` runs the
full sweep in dependency order and prints a pass/fail summary.

## Required tools

- `bash` 4+ (the scripts use arrays and `$BASH_SOURCE`)
- `curl`, `jq`
- `stripe` CLI (logged in to the project's TEST mode account)
- `uuidgen` or `python3` (for fresh session ids; falls back to `awk` if neither is present)
- `psql` is **not** required — Supabase access goes through PostgREST

## Required env

Copy `.env.example` to `.env` (gitignored locally; this directory does not contain
a `.env`). All vars are read on script entry via the shared `_lib.sh`.

| Var | Why |
| --- | --- |
| `BASE_URL` | Where the API is running. Defaults to `http://localhost:3000`. |
| `SUPABASE_URL` | Project URL (test or preview project). |
| `SUPABASE_SECRET_KEY` | Service-role key. Used for direct `INSERT`/`DELETE` over PostgREST. |
| `SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key. Used by tests 12 + 16 for password login. |
| `STRIPE_SECRET_KEY` | TEST mode `sk_test_...`. |
| `STRIPE_WEBHOOK_SECRET` | TEST mode `whsec_...`. Read by the webhook handler. |
| `PRODUCT_API_KEY` | Bearer token for `/api/products` and `/api/upload`. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | A Supabase auth user that exists in the test project. Used for tests 12 + 16. |
| `STRIPE_LISTEN_FORWARD_URL` | Cosmetic: included in error messages to remind you to start `stripe listen`. |

## How to run

Open three terminals in this repo:

1. **Terminal A — API**:
   ```
   vercel dev
   ```
2. **Terminal B — Stripe webhook forwarder** (required for tests 09, 10, 11):
   ```
   stripe listen --forward-to localhost:3000/api/webhook
   ```
   The first time you run this, Stripe prints a `whsec_...`. Put that in your
   `tests/integration/.env` and Vercel preview env as `STRIPE_WEBHOOK_SECRET`.
3. **Terminal C — tests**:
   ```
   bash tests/integration/run-all.sh
   ```
   To run a single test: `bash tests/integration/06_checkout.sh`.

## How to read the output

- Each test prints `[info]`, `[pass]`, `[fail]`, `[warn]` lines to stderr.
- Exit code `0` = pass, non-zero = fail. `run-all.sh` aggregates these into a
  summary block at the end and exits non-zero if any test failed.
- Tests that detect a missing prerequisite (env var or required CLI) exit `2`
  and `run-all.sh` reports them as **skipped** rather than failed.

## Test list & dependencies

| # | Script | Canonical name (per A4 spec) | Depends on |
| --- | --- | --- | --- |
| 01 | `01_products_post.sh` | products POST | — |
| 02 | `02_slug_conflict.sh` | slug conflict | products POST passes |
| 03 | `03_products_get.sh` | products GET (anonymous) | — |
| 04 | `04_products_put_price.sh` | products PUT price change | Supabase → /api/stripe-sync trigger wired |
| 05 | `05_stripe_sync.sh` | stripe-sync | Supabase → /api/stripe-sync trigger wired |
| 06 | `06_checkout.sh` | reserve + checkout → clientSecret | stripe-sync working |
| 07 | `07_race_condition.sh` | reserve returns 409 + related[] | — |
| 08 | `08_hold_expiry.sh` | checkout returns 410 hold_expired | — |
| 09 | `09_webhook_contract.sh` | webhook → customer + order + webhook_events | `stripe listen` running |
| 10 | `10_full_purchase_flow.sh` | reserve → checkout → webhook → completed order | `stripe listen` running |
| 11 | `11_webhook_idempotency.sh` | replayed event is no-op | a prior `checkout.session.completed` event |
| 12 | `12_shipping_mark.sh` | PATCH order writes tracking + sends email | admin user, optional Resend |
| 13 | `13_upload_image.sh` | upload image returns 200 + url | R2 env vars |
| 14 | `14_upload_validation.sh` | bad MIME → 400 | — |
| 15 | `15_upload_auth.sh` | missing Authorization → 401 | — |
| 16 | `16_admin_orders_needs_shipping.sh` | admin login → needs_shipping | admin user |

## Manual setup required

- An **admin user** must exist in the test Supabase project's `auth.users` table.
  The scripts log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` via the GoTrue REST
  endpoint; create the user once via the Supabase dashboard or
  `supabase auth users create`.
- Tests 04 and 05 depend on a Supabase **Database Webhook** wired to
  `<BASE_URL>/api/stripe-sync` for `INSERT` on `products`. This is part of the
  v1.4.3 setup; if it's not wired, those two tests soft-skip with a clear
  warning rather than failing the suite.
- Test 13 needs Cloudflare R2 env (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`). It uses
  `skip_transform=true` so Cloudinary is not required for the upload itself.
- Test 12 verifies `tracking_email_sent_at` is written **only** when Resend
  actually accepts the send. If Resend is not configured locally, the test
  warns rather than failing — it still verifies `shipped_at` and `status` were
  written by the PATCH.

## Common failures

- **`stripe-sync` test fails / no `stripe_price_id`**: the Supabase Database
  Webhook isn't pointed at `/api/stripe-sync`. Fix in Supabase dashboard
  → Database → Webhooks.
- **Webhook tests fail / no order row appears**: `stripe listen` isn't
  forwarding, or the wrong `STRIPE_WEBHOOK_SECRET` is in `.env`. The CLI prints
  a fresh `whsec_...` each session.
- **Admin tests fail with `admin login failed`**: `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` don't match a real user in the test project's
  `auth.users`, or `SUPABASE_PUBLISHABLE_KEY` is wrong.
- **`Origin` is not echoed back in CORS**: the API only echoes localhost,
  `everlastingsbyemaline.com`, and `*.vercel.app`. Tests always send
  `Origin: http://localhost:3000` so this should not surface.
