# v1.4.8 — Gap Review C (pre-build integration / system-fit)

Senior pre-build **integration** review of `v1_4_8_FINISH_TRACK_C.md` against the whole-system
context in `EVERLASTINGS_STORE.md` and the live repo on `dev`. Where Gap Review B confirmed the
packet's quoted blocks match the repo byte-for-byte (fidelity), this pass asks a different
question: do the *changes fit the architecture*?

Method: read the arch doc + packet in full, then opened `api/webhook.ts`, `api/checkout.ts`,
`api/orders.ts`, `api/_lib/adminAuth.ts`, `api/_lib/env.ts`, `api/products.ts`, `api/upload.ts`,
`api/product-feed.ts`, `api/config.ts`, `vercel.json`, `supabase/migrations/*`, `GPT_SETUP.md`,
and `STORE_ADMINISTRATION.md`, and cross-checked every integration claim the prompt names.

**Headline:** the packet is architecturally sound. It adds **no serverless function** (still 11),
honors the INSERT-as-claim webhook idempotency, keeps the new Bearer path's blast radius to a
single file, scopes `is_test` correctly, and the doc reorg has **no dangling pointers**. There is
**one real, silent, environment-dependent bug**: the rewritten `adminAuth.ts` compares the Bearer
token against the *untrimmed* `process.env.PRODUCT_API_KEY`, abandoning the project's own
trailing-newline trim convention that the two sibling key-consumers both follow. Everything else
is low-severity polish.

---

## Gap list — ranked by likelihood of derailing the build

### 1. [HIGH] New `requireAdmin` compares the Bearer token against raw `process.env.PRODUCT_API_KEY`, not the project's trimmed `env('PRODUCT_API_KEY')` — silent, env-dependent 401 that breaks the whole GPT order pipeline
- **Location:** PHASE 6.1, the `api/_lib/adminAuth.ts` full-file replacement:
  ```ts
  const apiKey = process.env.PRODUCT_API_KEY;
  if (apiKey && token === apiKey) { … return { supabase, viaApiKey: true }; }
  ```
- **What's wrong (system-fit):** the **two existing consumers of this exact key compare against a
  *trimmed* value** — `api/products.ts:22` and `api/upload.ts:29` both do
  `if (token === env('PRODUCT_API_KEY')) return true;`, where `env()` is the project helper
  `api/_lib/env.ts:6` whose comment is explicit: *"Vercel env values were imported with trailing
  newlines on this project; trim defensively."* The packet's new code reads the variable **raw**,
  so the comparison is `"<typed key>" === "<key>\n"`. If `PRODUCT_API_KEY` carries a trailing
  newline in any scope (this project documents that it has), the equality is **false**, the code
  falls through to the Supabase-JWT path, `auth.getUser("<key>")` fails, and the call returns
  **401** — while `/api/products` and `/api/upload` keep working because they trim. The Custom
  GPT's order Actions (`listOrders`, `markShipped`) authenticate exactly this way, so they break.
- **Why it's nasty:** it's invisible at build time. `tsc` passes, the deploy succeeds, the product
  pipeline works, the admin-UI JWT path works — only the Bearer path on `/api/orders` fails, and
  only in the scope whose key has a newline. Phase 8.7's curl is run against the *preview* key, so
  if only the **Production** key carries the newline, Phase 8.7 passes and the GPT still fails at
  launch (Wave 2). This is precisely the "GPT order actions 401" trap `GPT_SETUP.md` Wave 2 warns
  about, reintroduced one layer down.
- **Concrete fix (zero-cost, restores consistency):** in `adminAuth.ts` add
  `import { env } from './env';` (sibling path — the file already imports `./cors`) and compare
  against the trimmed value:
  ```ts
  const apiKey = env('PRODUCT_API_KEY');
  if (apiKey && token === apiKey) { … }
  ```
  (Leave the raw `process.env.SUPABASE_URL!` / `SUPABASE_SECRET_KEY!` reads as-is — those feed
  `createClient`, match the pre-existing pattern in `webhook.ts`/the old `adminAuth.ts`, and aren't
  strict-equality compared. Only the token check is brittle to a newline.) Also worth adding to the
  packet's Phase 8.7 wording: verify the **Production** key with a runtime curl, not just the
  preview — a preview-only pass can mask a production-key newline.

### 2. [LOW–MED] The Meta `Purchase` dedup-key mismatch is "latent until v1.5" only if the `META_*` env vars are actually unset — it goes live the moment `META_PIXEL_ID` is set
- **Location:** PHASE 1b note (doc ~line 347): "`stripe_event_id` here is the **session** id
  (`cs_…`) … the webhook's server-side Purchase currently sends `event_id: event.id` (the `evt_…`
  id) … Latent until [Meta] then."
- **What's wrong (system-fit):** the latency assumption isn't guaranteed by the architecture.
  `api/config.ts:10` returns `metaPixelId: env('META_PIXEL_ID') || null` to the **client**, so the
  browser pixel lights up as soon as `META_PIXEL_ID` is set in an env — independent of any "v1.5"
  flag. If that happens, `complete.js` fires a browser `Purchase` keyed on `session.id` (`cs_…`)
  while `api/webhook.ts:201` fires the server `Purchase` keyed on `event.id` (`evt_…`, gated on
  `META_PIXEL_ID && META_ACCESS_TOKEN`). The two keys never match → **Purchases double-count now**,
  not in v1.5. The packet flags the value mismatch but ties the risk window to "v1.5," which is an
  env-var fact the packet doesn't actually pin down.
- **Concrete fix:** add one line to the Phase 1b note / SEAN MUST DO — *"confirm `META_PIXEL_ID`
  and `META_ACCESS_TOKEN` are unset in Preview and Production until v1.5; if either is set, the
  cs_/evt_ dedup mismatch is live now."* The clean permanent fix (defer to v1.5, already implied):
  change `webhook.ts` to send `event_id: session.id` so browser + server share the `cs_…` key.

### 3. [LOW] `product.js:223` still hard-navigates to `/cart.html` — the one functional `.html` nav the packet's clean-URL hygiene leaves behind
- **Location:** packet PHASE 4.2(d) cleans `cart.js`'s `/checkout.html` → `/checkout`, and PHASE 3
  fully rewrites `checkout.js` (removing its `/cart.html` + `/complete.html` strings). But
  `assets/js/product.js:223` — outside the packet's edit set — still does
  `window.location.href = '/cart.html';` (the Add-to-Cart → cart redirect).
- **What's wrong (system-fit):** with `vercel.json` `cleanUrls:true`, `/cart.html` 301-redirects
  to `/cart`, so this still **works** — but it's the lone surviving functional `.html` navigation
  after the packet's deliberate clean-URL pass everywhere else, so it's an inconsistency, not a
  break. (Also cosmetic-only: a stale `cart.js:3` comment still says "redirect /checkout.html".)
- **Concrete fix (optional):** either add a one-line note to Phase 4 that `product.js:223` is
  intentionally left (works via 301) so it's a recorded decision, or fold a trivial
  `product.js` `'/cart.html'` → `'/cart'` swap into the packet for parity. Not a blocker.

### 4. [LOW] Merchant-email title lookup over-scopes with `.eq('is_test', isTest)` where the adjacent mark-sold write identifies the same rows by primary key alone
- **Location:** PHASE 5.2 inserted block:
  `supabase.from('products').select('id, title').eq('is_test', isTest).in('id', productIds)`.
- **What's wrong (system-fit):** the load-bearing mark-sold write two statements earlier
  (`api/webhook.ts:125–128`) is `.update({ available:false }).in('id', productIds)` — **no**
  `is_test` filter, because `id` is the PK and uniquely identifies the row regardless of mode. The
  new title lookup adds an `is_test` predicate that's redundant for identification and introduces a
  failure mode the mark-sold doesn't have: on any `is_test`/env skew the title silently drops to
  the slug in the merchant email. It's harmless (best-effort display, `|| it.slug` fallback,
  non-blocking) but inconsistent with the very write it sits beside.
- **Concrete fix (optional):** drop `.eq('is_test', isTest)` so the lookup mirrors mark-sold
  (`.select('id, title').in('id', productIds)`) and the email title is found whenever mark-sold
  succeeded. (`is_test` columns are confirmed real — see "Verified sound" — so the predicate isn't
  *wrong*, just over-tight.)

### 5. [DOC] The architecture doc's "Supabase Schema" omits the `is_test` column it relies on everywhere — including the new Phase 5 lookup this very review is anchored against
- **Location:** `EVERLASTINGS_STORE.md` → "Supabase Schema" (products/customers/orders/
  subscribers/product_interests/cart_holds tables). None lists `is_test`.
- **What's wrong (system-fit):** `supabase/migrations/20260421000001_initial_schema.sql:172–177`
  adds `is_test boolean NOT NULL DEFAULT false` to **six** tables, and it's load-bearing for the
  entire dev/prod isolation strategy (the doc's own Environment Strategy + AR #37) and for Phase
  5.2's new title lookup, Phase 1/handleReserve scoping, `orders.ts:67`, `product-feed.ts:22`,
  etc. A reviewer or build agent trusting the schema section would not know the column exists. This
  doesn't derail the build (the column is real and the code already uses it), but it's a real
  accuracy gap in the exact reference doc the integration angle is meant to validate against.
- **Concrete fix:** add `| is_test | boolean | NOT NULL DEFAULT false — dev/preview isolation |`
  to the six table schemas (and the doc already references the `idx_products_live` /
  `idx_subscribers_live` partial indexes from the same migration, which are likewise undocumented).

---

## Verified sound — no action (the integration surface that passed)

Each item below was checked against the cited file:line and is consistent with the architecture.

**11-function Hobby cap (AR #34) — preserved.**
- Deployable `api/*.ts` = **exactly 11** (cart, checkout, config, contact, orders, product-feed,
  products, stripe-sync, subscribe, upload, webhook). The packet's only new code lands in
  non-deployed helpers (`_lib/adminAuth.ts`, `_emails/index.ts`) or edits existing functions —
  **no 12th function.**
- Phase 7's cron reuses `/api/product-feed`, which does a **real** DB read
  (`product-feed.ts:18–22`, `.from('products').select(…).eq('is_test', false)`) — a valid
  heartbeat. `config.ts` is env-only (no DB) and is correctly rejected as a candidate.
- Cron count = 1, once-daily (`"0 9 * * *"`) — inside Hobby's 2-cron / once-per-day limit. (Minor:
  Hobby fires crons within the hour, not exactly at 09:00 — immaterial to the 7-day window.)

**Webhook idempotency (AR #21 / #14) + "never 5xx after the claim" — respected, and the merchant
email is safe inside it.**
- `webhook.ts` uses **INSERT-as-claim before any side effect** (`:49`): a duplicate delivery hits
  `23505` and returns `200 no_op` (`:51–53`), so a retry never re-sends the merchant email or
  re-inserts orders. The whole handler body is one outer `try` that, on any throw after the claim,
  **logs and returns 200** (`:226–230`, comment: "do NOT 5xx"). Phase 5.2 inserts its block
  *inside* that try, with its **own** try/catch, and `sendEmail` is documented never to throw —
  triple-guarded. The block correctly reads only in-scope names (`productIds`, `items`,
  `orderRows`, `totalAmount`, `customerEmail`, `shippingAddress`, `session`, `event.id`; `isTest`
  is the `:4` import). The at-most-once tradeoff (a crash between claim and send = no email, no
  retry) is inherent to claim-first idempotency and acceptable for a non-blocking merchant notice.

**New `requireAdmin` Bearer path — blast radius contained; no unintended escalation** (the trim
bug in Gap #1 notwithstanding).
- `requireAdmin` is consumed by **only** `api/orders.ts` (GET `:54`, PATCH `:99`). `products.ts`
  and `upload.ts` have their *own* separate `authorize()` and are untouched by the union widening —
  so accepting `PRODUCT_API_KEY` here changes **only** the orders surface, exactly as the packet
  claims. The admin-UI JWT path is byte-for-byte unchanged (Path 2 still returns `{user, supabase}`).
- `is_test` env-isolation holds for the key path: `orders.ts:67` filters `.eq('is_test', isTest)`,
  so a preview curl (isTest=true) sees only test orders and the production GPT (isTest=false) sees
  only live orders. Granting the client's master key access to orders is intended ("GPT is the
  client's whole console," AR #20) — not a privilege leak.

**`cleanUrls` behavior — handled where it matters.**
- `vercel.json` is `cleanUrls:true`; Phase 1.3 moves `return_url` to `/complete?session_id=…` and
  Phase 4.2(d) moves the cart redirect to `/checkout`; Phase 3's rewrite removes `checkout.js`'s
  `.html` strings. Phase 8.0 explicitly gates on `/complete?session_id=test` → 200 with a
  `/complete.html` fallback instruction. (Only `product.js:223` lags — Gap #3.)

**Env test/live scoping — sound.** Per-scope **distinct** `PRODUCT_API_KEY` values still work under
an equality check because each deployment compares against *its own* scope's value; `ORDER_NOTIFY_EMAIL`
is added to `.env.example` (Phase 5.4) and set in Preview+Production by Sean. (The newline caveat is
Gap #1, not a scoping-model flaw.)

**No AR / Key-Decision contradictions found.**
- AR #19 (Stripe receipt for buyer + one merchant notification fired from `webhook.ts` after the
  orders insert via `newOrderNotificationEmailHtml`, non-blocking) — Phase 5 implements it exactly.
- AR #28/#29 (availability + soft hold *before* PII) — preserved: `handleReserve` is unchanged and
  still runs on the cart page; PII now lives in Stripe's elements on `/checkout`, which is reached
  only *after* the cart-page reserve. `handleSession` re-checks the hold and 410s if missing
  (`checkout.ts:62–69`), so a direct `/checkout` hit bounces to `/cart`.
- Common Pitfall #3 / Phase 1 (no Stripe Customer pre-created; `customer_creation` omitted) —
  verified safe against `webhook.ts`: `customerId` derives from the **email-keyed** customers
  upsert (`:89–113`), `orders.customer_id` from that (`:162`), and `stripe_customer_id` is
  null-guarded (`:81–83,99`). Omitting `customer_creation` can only null `stripe_customer_id`,
  never break fulfillment. `customer_details.email` still populates from the contact element at
  confirm (the load-bearing path; functionally gated at Phase 8.1).
- AR #4 (Stripe write-once), AR #2 (standard cart), the D2 session-id invariant — untouched.

**Doc reorg — clean, no stale pointers, no behavioral gap.**
- `PRODUCT_PROTOCOL.md` no longer exists; every remaining mention (`EVERLASTINGS_STORE.md:5`,
  `GPT_SETUP.md:7`) is **descriptive history** ("retired into GPT_SETUP + STORE_ADMINISTRATION"),
  not a dangling link.
- The packet's forward-references resolve: `GPT_SETUP.md` has the **Wave 1/Wave 2** structure
  (Part 3), the `listOrders`/`markShipped` Actions + OpenAPI (2B) — and its schema (status enum
  `[needs_shipping, shipped]`, carrier enum `[USPS,UPS,FedEx,DHL]`) matches `orders.ts` (`:70–73`,
  `:127–134`) — the Bearer auth model (2C), and the explicit Wave-2-after-Phase-6/8.7 gate.
  `STORE_ADMINISTRATION.md:133` documents the Sean-only reactive Supabase recovery (Restore /
  Management API) and points at the keep-alive cron — exactly as Phase 7 claims.
- `is_test` columns are confirmed present (migration `…000001:172–177`), so Phase 5.2's
  `.eq('is_test', isTest)` is valid (Gap #4 is about over-scoping, not a missing column).

---

## Single most important insight

**The packet's one architectural seam is that it re-implements `PRODUCT_API_KEY` auth from scratch
in `adminAuth.ts` instead of reusing the project's established, defensively-trimmed `env()`
comparison** (`products.ts:22`, `upload.ts:29`). On a project whose own `env.ts:4` documents that
Vercel env values arrived with trailing newlines — the exact reason those two files trim — comparing
the GPT's Bearer token against raw `process.env.PRODUCT_API_KEY` is an unforced, silent, scope-local
401 that defeats the headline feature (GPT-driven order fulfillment) and can pass Phase 8.7 on the
preview while failing in production. **If you fix one thing, make `adminAuth.ts` compare against
`env('PRODUCT_API_KEY')`.** It costs one import and one token, and brings the new code into line with
the two consumers that already prove the pattern.

## Verdict

**READY TO BUILD** — after applying Gap #1 (the `env('PRODUCT_API_KEY')` trim in `adminAuth.ts`).
Gaps #2–#5 are low-severity polish / doc accuracy and can fold in or be recorded as decisions; none
blocks execution.
