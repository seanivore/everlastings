# Environment Strategy Audit — URL Separation, Data Hygiene, & Preview-URL Functionality

## Context

While cleaning up `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md` at the "Secrets & Services" section, Sean paused at this line (v1_4_2_IMPL_GUIDE.md:805):

> "No development subdomain needed — dev and production share the same R2 bucket and CDN. Only Stripe keys differ between environments."

Initial concern: if dev and prod share the same domain, how is testing done without hitting the live site? After audit + scoping discussion, the URL concern itself is a doc-clarity issue (Vercel preview URLs already cover dev), but the audit surfaced three real adjacent gaps that **explain why Sean's other projects' preview URLs don't load** and that need fixing before the build proceeds.

## Why this matters now

Sean noted that across multiple of his Vercel projects, preview URLs "load nothing" — only one simpler project's preview works. That pattern is almost certainly caused by Gap 1 below (CORS), repeated project-to-project. We should fix it here before writing any frontend code, not after.

## Finding 1 — URL/preview separation IS documented correctly

The Environment Strategy section (v1_4_2_IMPL_GUIDE.md:195-222) already covers this. Vercel auto-generates a unique `*.vercel.app` URL per branch. Preview deployments are the dev environment.

**The R2 sentence in context**: it means Sean doesn't need to register `dev.everlastingsbyemaline.com` as a custom Cloudflare CNAME — Vercel's auto-preview URLs serve as the dev URL. Wording is just ambiguous when read out of context.

**Fix**: rewrite that line and cross-reference back to the Branch Strategy table.

## Finding 2 — vercel.json CORS will block preview URLs (root cause of "preview loads nothing")

`vercel.json:10` hardcodes:
```json
"Access-Control-Allow-Origin": "https://everlastingsbyemaline.com"
```

When a browser on a `*.vercel.app` preview tries to call `/api/*`, the response's `Access-Control-Allow-Origin` header doesn't match the request origin → browser blocks the response → page appears empty/broken. This is exactly the symptom Sean has seen across other projects.

**Fix**: dynamic origin reflection in `vercel.json` headers, or move CORS into each `api/*.ts` function so it can echo back the request origin when it matches an allowlist:
- `https://everlastingsbyemaline.com` (production)
- `https://*.vercel.app` (any preview from this project)
- `http://localhost:3000` (local dev)

Recommended approach: per-route CORS middleware in TypeScript (more flexible than `vercel.json` static headers), since `vercel.json` doesn't support wildcard origins safely.

## Finding 3 — Frontend must use relative API paths

Once frontend code is written, `fetch('/api/upload')` (relative) works on every environment. `fetch('https://everlastingsbyemaline.com/api/upload')` (absolute) breaks preview deployments. No frontend code exists yet, so this is a convention to establish before Track B.

**Note**: Curl examples in `PRODUCT_PROTOCOL.md` (lines 257, 268, 290, 307, 340, 348) hardcode the production URL. These are for AI/Emy product creation which is a production-only workflow — keep absolute URLs there but add a note that for preview-environment testing, swap to the preview URL.

## Finding 4 — Shared Supabase pollution

Dev/preview checkouts write real rows to `products`, `orders`, `customers`, `subscribers`, `cart_holds`, `order_events`, `subscriber_consents`, plus the new 8th table.

**Fix (Sean's choice)**: add `is_test BOOLEAN DEFAULT FALSE` to relevant tables. Set to `true` from any non-production env (gated on `process.env.VERCEL_ENV !== 'production'`). Production read queries filter `is_test = false`. Cleanup is one SQL statement per table.

**Rejected alternative**: separate Supabase project. Doubles infra, requires env-scoped `SUPABASE_URL`+`SUPABASE_ANON_KEY` in Vercel, and the existing config endpoint design assumes one Supabase URL.

## Finding 5 — Shared R2 bucket pollution

Test images uploaded from preview URLs land in the same `everlastings` R2 bucket and are served from `cdn.everlastingsbyemaline.com`.

**Fix (Sean's choice + addition)**: namespace by environment AND filename:
- Production: `products/{slug}/{role}-{slug}.webp` → `cdn.everlastingsbyemaline.com/products/...`
- Preview/dev: `test/{slug}/test_{role}-{slug}.webp` → `cdn.everlastingsbyemaline.com/test/...`

Double-safety: both the path prefix (`test/`) AND the filename prefix (`test_`) make accidental production references obvious. Cleanup is `aws s3 rm s3://everlastings/test --recursive`.

**Note for future**: Sean confirmed a separate R2 bucket + `cdn-test.everlastingsbyemaline.com` subdomain is <5 min to set up via Cloudflare. If the namespacing convention becomes unwieldy (e.g. lots of test product variations), that's the upgrade path. For now, single-bucket namespacing is simpler.

## Finding 6 — Stripe webhook endpoints

IMPL_GUIDE.md:214-215 says "both test and live webhook endpoints configured in Stripe Dashboard simultaneously" but doesn't address that preview URLs change per branch.

**Fix**: pin the test webhook to the `dev` branch's preview URL specifically (Vercel preview URLs are stable per branch — the URL for `dev` doesn't change unless the branch is renamed or the project is renamed). For `feat/*` branches, use Stripe CLI's `stripe listen --forward-to {preview-url}/api/webhook` for ad-hoc testing rather than registering a separate webhook per branch. Document this in the new Environment Strategy section.

## Implementation plan (in order)

1. **Rewrite the R2 line** at v1_4_2_IMPL_GUIDE.md:805 to be unambiguous and link back to the Branch Strategy table at line 195.
2. **Add a new "Dev/Test Data Hygiene" section** to v1_4_2_IMPL_GUIDE.md (placed near Branch Strategy, ~line 250). Covers:
   - CORS strategy + relative-path fetch convention (Findings 2 + 3)
   - Supabase `is_test` column convention (Finding 4)
   - R2 `test/` prefix + `test_` filename prefix convention (Finding 5)
   - Stripe webhook pinning convention (Finding 6)
3. **Update `vercel.json`** to remove the hardcoded `Access-Control-Allow-Origin` for `/api/*`. Either (a) replace with `*` and let per-route TypeScript handlers do allowlist matching, or (b) leave the static rule for production and document that all `api/*.ts` handlers must override the header dynamically. Option (a) is simpler.
4. **Add a CORS helper** to the planned API endpoint architecture in v1_4_2_IMPL_GUIDE.md (the section that introduces `api/config.ts` around line 907). The helper reads `request.headers.get('origin')`, matches against the allowlist, and sets the response header dynamically. Every endpoint imports + calls it.
5. **Update v1_4_2_IMPL_GUIDE.md > Secrets & Services > Stripe** at line 854 to reference the webhook pinning convention from the new section.
6. **Add a verification checkbox** in the Environment Strategy section: "Push a test branch, open the preview URL, confirm the page loads and `/api/config` returns 200."

## Critical files to modify

- `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md` — primary doc, multiple sections
- `vercel.json` — CORS header fix (the one actual code change)

## Critical files to reference (read-only)

- `assets/docs/EVERLASTINGS_STORE.md:218` — already cross-references the env strategy; may need a one-line update to mention preview URLs
- `assets/docs/PRODUCT_PROTOCOL.md:257-348` — curl examples; add note about preview-URL swapping for testing
- `.env.example` — already env-agnostic, no change needed

## Open: broader audit (Sean's idea)

Sean suggested spawning broader directed audit subagents AFTER this fix — scoped wider than just the env/URL question. **My recommendation**: yes, but with a clear axis. The natural framing is "system-wide assumptions that depend on environment or are hardcoded to a single context." Candidates:
- All hardcoded URLs across docs (25 files reference `everlastingsbyemaline.com`)
- All hardcoded keys/IDs/secrets in docs
- Any architectural decision that assumes "production is the only environment"
- Any assumption about who calls what (Emy vs. AI vs. Sean vs. customer)
- Any assumption about a single physical instance (e.g. one R2 bucket, one Supabase, one webhook endpoint)

Suggest running it after this fix lands so the audit can verify the new conventions stuck, rather than auditing a known-broken state.

## Verification (after implementation)

1. Push a small change on a `feat/*` branch.
2. Open the auto-generated `*.vercel.app` preview URL in a browser.
3. Confirm:
   - Page loads (CSS + JS execute, no CORS errors in console)
   - `fetch('/api/config')` returns the test publishable key, not live
   - Any uploaded image lands under `test/` in R2
   - Any DB write has `is_test = true`
4. Confirm production (`everlastingsbyemaline.com`) is unaffected: live keys, no `test/` writes, queries filter test rows out.
