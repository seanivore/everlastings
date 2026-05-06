# v1.4.4 Mid-Implementation Alignment — Session Plan

## Context

Track A (backend) and Track B (frontend placeholders) are delivery-complete on `dev`. Both
orchestrators surfaced bugs and contract gaps that don't match the v1.4.3 Track C plan as
written. Today's session is **planning, not execution**: produce the two documents that
will steer the Track C execution session, plus a stakeholder-review protocol that lets
you iterate on the frontend design without blocking the integration work.

The strategic insight from your input: Phase 0's Cloudinary fix is the **gate that
unlocks parallelism** — once `/api/upload` works, Emaline can start loading real products
via the Custom GPT pipeline at the same time you iterate on design with the placeholder
data, shrinking the placeholder-review window dramatically.

## Decisions Locked This Session

| ID  | Decision                                                                                                                                                      | Rationale                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Cloudinary**: switch `/api/upload` to signed flow matching the 360-design `ENTRY_SOP.md` pattern (API_KEY:API_SECRET basic auth, transforms via URL params) | Matches your existing mental model; eliminates the unsigned-preset class of bug; no dashboard config required                                                                                                             |
| D2  | **Webhook**: `?sync=true` query param on `/api/products POST` invokes `/api/stripe-sync` inline                                                               | Preview-friendly, no Supabase dashboard work, idempotency from Gap D fix protects against dupes; sidesteps the question of whether the webhook even exists                                                                |
| D3  | **Phase 0 timing**: bug fixes queued as the first checklist of the Track C *execution* session, not done in this planning session                             | Keeps planning and execution separate; gives a second review pass on the new plan before code lands                                                                                                                       |
| D5  | **Emaline's feedback channel**: shared Google Doc with one section per page                                                                                   | You'll run several rounds of your own review *first*, in parallel with Emaline loading real products via the Custom GPT pipeline; by the time Emaline reviews, much of the placeholder data is already replaced with real |

## Today's Session Deliverables

| Action       | Path                                                     | Purpose                                                         |
| ------------ | -------------------------------------------------------- | --------------------------------------------------------------- |
| **Create**   | `assets/docs/archive/v1_4/v1_4_4_C_IMPLEMENT.md`         | New Track C implementation guide; supersedes v1.4.3             |
| **Create**   | `assets/docs/archive/v1_4/v1_4_4_PREP_DESIGN_REVIEWS.md` | Three-audience review protocol (Sean / Emaline / Future-Claude) |
| **Annotate** | `assets/docs/archive/v1_4/v1_4_3_C_IMPLEMENT.md`         | Top-of-file supersession note pointing to v1.4.4                |

No code changes today. No Phase 0 fixes. Pure planning.

---

## Document 1: `v1_4_4_C_IMPLEMENT.md` Structure

**Header block**: title, version (v1.4.4 supersedes v1.4.3), date, one-paragraph diff
summary (Phase 0 added, localhost verification removed, endpoint count corrected to 11,
design-review checkpoints inserted, consent + email-CTA contracts pinned to Track B's
actual events), Decisions D1/D2/D3/D5 from this session.

**Required Pre-Reads (Updated)**: same v1.4.3 set plus the four closeouts —
`v1_4_3_A_SESSION_REPORT.md`, `v1_4_3_A_UPDATE_REPORT.md`, `v1_4_3_B_SESSION_REPORT.md`,
`v1_4_3_B_PRE_FLIGHT_BUG.md`. Reason: contracts shifted from the original IMPLEMENT specs.

**Endpoint Reality Map (NEW)**: replaces the "14 endpoints" mental model. Table maps
physical file → public URL(s) preserved by `vercel.json` rewrites → which placeholder
pages call it. Note 11/12 Hobby cap. Rule: future endpoints consolidate via `?_action=`
into existing files, not new files.

**Verification Convention (NEW)**: hard rule — verify on Vercel preview URLs only, not
localhost (per `feedback_no_localhost_testing.md`). Stripe webhook strategy under
preview-only: use Stripe Dashboard "Send test webhook" against the dev-branch alias OR
the `?sync=true` workaround. How to share preview URLs with Emaline.

### Phase 0: Pre-Wiring Bug Fixes

Opens the doc. Resolves the seven gaps from `v1_4_3_B_PRE_FLIGHT_BUG.md` before any
wiring begins. Classification legend: **BEFORE** (must merge before C1), **DURING**
(lands inline within a C-section that touches the same code), **AFTER** (doc-only or
non-blocking polish; deferred to launch-prep).

| Gap                                | Classification                                       | Owner | Files                                    | Fix                                                                                                                                                                                                                 |
| ---------------------------------- | ---------------------------------------------------- | ----- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** Cloudinary unsigned preset   | BEFORE (CRITICAL — unlocks parallel product loading) | Agent | `api/upload.ts`, `.env` (CLOUDINARY_URL) | Switch to signed flow per 360-design `ENTRY_SOP.md` pattern: HTTP basic auth with API_KEY:API_SECRET, transformations via URL params (`c_fill,w_X,h_Y,q_auto,f_webp`), then store result to R2 at the expected path |
| **B** `test_` prefix validator     | BEFORE (CRITICAL)                                    | Agent | `api/products.ts`                        | `replace(/^test_/, '')` before `startsWith('hero-')` role check                                                                                                                                                     |
| **C** Webhook → preview deployment | BEFORE                                               | Agent | `api/products.ts`, `api/stripe-sync.ts`  | Implement `?sync=true` query param on POST that invokes stripe-sync inline; document fallback for production webhook                                                                                                |
| **D** stripe-sync idempotency      | BEFORE                                               | Agent | `api/stripe-sync.ts`                     | Query for existing `stripe_product_id` before creating new Stripe Product; return existing ID if found                                                                                                              |
| **E** vercel curl exit code 3      | AFTER                                                | Agent | `assets/docs/PRODUCT_PROTOCOL.md`        | Doc note: scripts using `set -e` must allow exit 3                                                                                                                                                                  |
| **F** `materials` type             | AFTER                                                | Agent | `assets/docs/PRODUCT_PROTOCOL.md`        | Fix example to show `text[]` array, not string                                                                                                                                                                      |
| **G** GET `?slug` for `is_test`    | DURING C1 (with shop wiring)                         | Agent | `api/products.ts`, `api/product-feed.ts` | Confirm preview behavior matches what `shop.js` and `product.js` expect                                                                                                                                             |

**Phase 0 exit gate**: all BEFORE items merged on `dev`, preview deployment green,
Custom-GPT smoke test (one product create end-to-end) passes. Sean signs off → C1 unlocks
AND Emaline can start the parallel real-product loading loop.

### C1: Page Wiring Foundations

`main.js` + the two global event listeners Track B's pages already dispatch.

- **C1.1** — `main.js` foundation: Supabase client, R2 base, `formatPrice`, GA4/Meta
  helpers, cart helpers
- **C1.2** — Global `email-cta-submit` listener: single `document.addEventListener` that
  POSTs `{source, email, productSlug?}` from event detail to `/api/subscribe`. Source
  enum (single source of truth in Appendix B): `product-interest`, `cart-exit`,
  `contemplation-offer`, `newsletter-footer`, `newsletter-shop-empty`,
  `newsletter-homepage`, `newsletter-customer`. Fires GA4 `email_cta_capture` + Meta `Lead`
- **C1.3** — Global `consent-change` listener: maps localStorage `{analytics, advertising}`
  → `gtag('consent','update',{...})` + `fbq('consent', granted/revoked)`. California
  Accept also `fbq('dataProcessingOptions',['LDU'],0,0)`. Plus `<head>`-level default-deny
  `gtag('consent','default',...)` snippet (CIPA defense — fires BEFORE gtag.js loads)
- **C1.4** — Cookie banner persistence + page-load re-fire of consent state from localStorage

**Verification**: open preview URL, dispatch `email-cta-submit` from devtools, confirm
`/api/subscribe` 200 in Network tab; toggle banner Accept/Reject, confirm gtag/fbq calls
in console.

**Design Review Checkpoint A**: after C1 ships, you review preview URL for cookie banner
copy/placement, consent flow UX, newsletter forms. Cosmetic feedback flows to the
parallel iteration loop and does NOT block C2.

### C2: Per-Page Wiring

Per-page modules consuming the C1 foundation.

- **C2.1** — `product.js`: replaces `<!-- PLACEHOLDER: product-* -->` blocks. Add to Cart,
  gallery lightbox, related products, `video_play` event. CTA forms flow through C1.2
- **C2.2** — `shop.js`: filter sidebar, URL state, skeleton loaders, `search_filter`
  event. Honors `is_test=false` filter (Gap G fix exercised here)
- **C2.3** — `homepage.js`: featured carousel, theme/site_config fetch, dynamic CSS variables
- **C2.4** — `newsletter.js`: thin wrapper if anything isn't already covered by C1.2

**Verification**: per page, devtools `grep` for `PLACEHOLDER:` shows zero remaining; GA4
DebugView shows expected events; full browse flow on preview (homepage → shop → filter →
product page → add to cart, no checkout yet).

**Design Review Checkpoint B**: biggest feedback window. You + (eventually) Emaline review
preview URLs page-by-page using the protocol from `v1_4_4_PREP_DESIGN_REVIEWS.md`.

### C3: Cart + Checkout E2E

- **C3.1** — `cart.js`: localStorage render via `.cart-line` repeats / `data-cart-empty`,
  email/name capture, `[CHECKOUT]` → `/api/checkout/reserve`, 409 → `data-sold-recovery`
  overlay
- **C3.2** — `recovery.js`: shared overlay rendering, related-products mini cards
- **C3.3** — `checkout.js`: AddressElement at `data-stripe-address-shipping`/`-billing`,
  PaymentElement at `data-stripe-payment`, confirm via `data-checkout-confirm`. 410 →
  redirect to `/cart.html`
- **C3.4** — `complete.html`: session-status fetch, `purchase` event (GA4 + Meta), cart clear
- **C3.5** — Stripe webhook end-to-end on preview: Stripe Dashboard "Send test webhook"
  against dev-branch alias (NOT `stripe listen` localhost)

**Verification**: Stripe test card 4242…, full flow on preview deployment URL; 409
simulation by manually flipping a product's `available=false` mid-session; 410 by
waiting out hold TTL.

**Design Review Checkpoint C**: real-card-then-refund smoke test. Recovery overlay copy
("These havens have found their homes") gets explicit Emaline sign-off — copy is brand-sensitive.

### C4: SEO + Launch Sprint (merged from v1.4.3's C3 + C4)

Rationale for merge: SEO finalization is mechanical and tightly coupled to launch
verification (sitemap submission, robots, OG validation in real social previews).
Splitting them adds ceremony without value.

- **C4.1** — Per-page meta titles/descriptions (product pages from Supabase). OG +
  Twitter Card tags
- **C4.2** — Product `schema.org` JSON-LD
- **C4.3** — `sitemap.xml` + `robots.txt`. Preview vs. production discriminator: `noindex`
  on preview
- **C4.4** — Lighthouse pass on all 13 pages (≥90 mobile per IMPLEMENT.md gate). Resolves
  Track B Open Thread
- **C4.5** — Track A integration tests re-run against preview post-consolidation
  (tests 04, 05, 06, 07, 08, 09–12, 16). Resolves both Track A and Track B Open Threads
  in one pass
- **C4.6** — Cross-browser + mobile QA matrix
- **C4.7** — Final `grep -rn "PLACEHOLDER:" .` → zero

**Verification**: Lighthouse run against preview URL; OG validators (Facebook Debugger,
Twitter Card Validator) point at preview URL; integration test suite green against preview.

**Design Review Checkpoint D**: final design review, last chance for v1.4.4 cosmetic
fixes. Anything below the bar gets logged in the v2 facelift queue.

### C5: Launch Cutover

- **C5.1** — Placeholder data purge: DELETE Supabase rows where `is_test=true` (the 6
  seed products), purge R2 `test/` namespace, archive 7 Stripe Products in test mode
  (6 seeds + orphan `prod_URor3D0ITLFa2E`). Verify `is_test=true` count = 0
- **C5.2** — Resolve remaining Track A/B Open Threads: Stripe test webhook registration,
  `env()` helper sweep across remaining endpoints (Resend, Meta CAPI), admin UI manual
  click-path
- **C5.3** — Real product load (5–10 minimum) by Emaline via Custom GPT against preview,
  confirm Phase-0 fixes hold (this is the *final* validation of the loading pipeline,
  not the first — earlier rounds happened in parallel with C1–C4)
- **C5.4** — Stripe live keys in Vercel project env (production only). Re-run
  `/api/_bootstrap/coupons` against live mode
- **C5.5** — DNS flip, SSL verification, `main` branch tag + merge
- **C5.6** — Post-launch monitoring (24h watch on Vercel logs, Stripe dashboard, Resend deliveries)

### Appendices

- **A**: `data-*` Attribute → Module Wiring Map. Comprehensive table from Track B's
  placeholder inventory
- **B**: `email-cta-submit` Source Enum. Single source of truth for which page dispatches
  which `source` value
- **C**: Error States Reference. Carry forward from v1.4.3, with localhost references → preview URLs
- **D**: Migration Notes from v1.4.3. Diff log of structural changes

---

## Document 2: `v1_4_4_PREP_DESIGN_REVIEWS.md` Structure

**Header block**: three-audience banner — *For Sean • For Emaline • For Future-Claude*.
One-line per audience on what to read first.

### Section 1 — Why This Document Exists

One paragraph: Track A and B are done; Track C wires them. Design feedback is inevitable
mid-wire. This doc keeps feedback productive and unblocks launch. Critical timing point:
Sean iterates on design *while* Emaline loads real products via the Custom GPT pipeline,
so by the time Emaline reviews, the placeholder data is mostly replaced with real.

### Section 2 — The Three Buckets

The core decision framework. Plain decision tree for each bucket so feedback can be
classified on the fly.

- **Bucket 1 — v1.4.4 BEFORE wiring**: copy fixes, image swaps, color tweaks within
  existing tokens. Don't touch DOM structure or `data-*` hooks. Land in parallel with
  Phase 0 / C1
- **Bucket 2 — v1.4.4 DURING/AFTER wiring**: anything that touches `data-*` attributes,
  event names, or page templates Track C is actively wiring. Queued, not hot-patched
- **Bucket 3 — v2 facelift**: homepage redesign, anything tagged in
  `project_v2_homepage_facelift.md`. Logged but NOT addressed in v1.4.4

### Section 3 — For Sean (primary review loop)

- **3.1** — Per-page review pass: visit preview URL after each Track C checkpoint
  (A/B/C/D). Time-box 15 min/page
- **3.2** — Decision matrix: classify each feedback item into Bucket 1/2/3. Default to
  Bucket 3 if uncertain (protect launch)
- **3.3** — Multiple-rounds expectation: you run several review rounds *before* bringing
  Emaline in, in parallel with her real-product loading via the Custom GPT pipeline.
  This shrinks the placeholder-only review surface significantly
- **3.4** — How to translate feedback into agent-actionable language. Bridge between
  "feels off" and "needs a CSS variable change in `assets/css/...`"
- **3.5** — Settled-vs-iterating ledger: running list at the bottom of this doc with two
  columns. You update as decisions land

### Section 4 — For Emaline (later, after Sean's iterations)

Zero-Git, zero-React review path.

- **4.1** — How to open the preview link Sean shares
- **4.2** — Per-page checklist: 6 items max per page in plain language ("Does the
  homepage feel like Emaline's voice? Are the product photos crisp?")
- **4.3** — Feedback channel: **shared Google Doc**, one section per page. Magic-phrase
  format: *"Page: {name}. What I see: {...}. What I'd like: {...}"* 
- **4.4** — What to ignore: "test" labels, "weird URLs", anything below the fold flagged
  as Sean's territory

### Section 5 — For Future-Claude (Track C agent)

Decision boundaries: don't redesign what's settled; act on what's iterating.

- **5.1** — **Settled (do not reopen)**: cookie consent strategy (deferred state,
  default-deny, localStorage shape), `email-cta-submit` event contract, source enum,
  `data-*` attribute names, source-of-truth hierarchy (Supabase > Stripe > R2 >
  frontend), 1+1+5 image roles, 11-endpoint consolidation pattern
- **5.2** — **Iterating (act on feedback when received)**: cookie banner copy, testimonial
  copy, "Meet Emy" content, product photography, micro-copy on CTAs, color/typography
  polish within existing tokens
- **5.3** — **Escalate (don't decide alone)**: anything proposing a new endpoint,
  changing an event name a page already dispatches, or changing the placeholder convention
- **5.4** — Operating rule: when feedback arrives mid-Track-C, log it, keep wiring,
  batch-apply at the next checkpoint. Never hot-patch the architecture

### Section 6 — Per-Page Review Map

Table: page → preview URL slug → primary stakeholder → things to look at → things to
ignore right now. Notes which content is placeholder pending real load via Emaline's
Custom GPT pipeline.

| Page                                                   | Stakeholder     | Look at                     | Ignore until later                                |
| ------------------------------------------------------ | --------------- | --------------------------- | ------------------------------------------------- |
| /index.html                                            | Both            | hero, voice, featured strip | testimonial copy (Open Thread)                    |
| /shop.html                                             | Both            | grid, filters               | test products (replaced as Emaline loads real)    |
| /product.html?slug=…                                   | Both            | gallery, story, CTAs        | placeholder data (replaced as Emaline loads real) |
| /cart, /checkout, /complete                            | Sean primary    | flow + edge states          | recovery copy until Checkpoint C                  |
| /about.html                                            | Emaline primary | "Meet Emy" copy + photo     | placeholder photo                                 |
| /contact, /faq, /policies, /privacy, /shipping, /terms | Sean primary    | links, legal accuracy       | n/a                                               |
| /admin/index.html                                      | Sean only       | manual click-path           | not for Emaline                                   |

### Section 7 — Iteration Loop Cadence

Aligned to Track C checkpoints A/B/C/D. After each, a feedback window; Sean classifies;
agent applies Bucket-1 items in parallel with the next Track C section. Real-product
loading happens on its own track, kicked off after Phase 0 ships.

### Section 8 — Settled-vs-Iterating Ledger (template)

Two-column running table Sean fills as decisions land. Carries forward into v2 planning.

### Section 9 — Open Threads Snapshot

Carried from Track A/B closeouts: cookie banner copy approval, testimonials, "Meet Emy",
Lighthouse audit. Each line says which checkpoint it resolves at.

---

## Critical Files

**Read** during drafting:
- `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_C_IMPLEMENT.md` (existing plan, the structural starting point)
- `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_B_PRE_FLIGHT_BUG.md` (Gaps A–G source)
- `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_B_SESSION_REPORT.md` (placeholder inventory, `data-*` map, event names — feeds Appendix A & B)
- `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_A_SESSION_REPORT.md` and `v1_4_3_A_UPDATE_REPORT.md` (endpoint reality, consolidation pattern)
- `/Users/seanivore/Development/360-design/assets/docs/ENTRY_SOP.md` (Cloudinary signed-flow pattern reference — for Phase 0.A wording)

**Write** in this session:
- `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_4_C_IMPLEMENT.md` (NEW)
- `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_4_PREP_DESIGN_REVIEWS.md` (NEW)
- `/Users/seanivore/Development/everlastings-website/assets/docs/archive/v1_4/v1_4_3_C_IMPLEMENT.md` (annotate top with supersession note)

**Reference, don't read in full** (already digested):
- `v1_4_3_A_IMPLEMENT.md` (107k tokens — already in `dev`; consult only on specific question)
- `v1_4_3_IMPLEMENT_PRESPLIT.md` (40k — archival per prep doc, not re-read)
- `v1_4_3_B_RESEARCH_COOKIE_CONSENT.md` (40k — already digested in Track B summary)

## Verification

End-of-session verification (no code, planning artifacts):

- `ls assets/docs/archive/v1_4/v1_4_4_*` → returns both new docs
- `head -1 assets/docs/archive/v1_4/v1_4_3_C_IMPLEMENT.md` shows the supersession note
- New `v1_4_4_C_IMPLEMENT.md` Phase 0 table contains all seven gaps with classifications
- New `v1_4_4_PREP_DESIGN_REVIEWS.md` Section 5 lists all five settled items from the
  decisions made above (D1, D2, plus the three from Track A/B closeouts: 11-endpoint
  consolidation, image roles, source-of-truth hierarchy)
- Cross-reference: every "BEFORE" item in Phase 0 is referenced in the C1 prerequisites
  section (no orphan blockers)

The Track C *execution* session that follows will pick up this plan, run Phase 0 first,
then advance through C1–C5 with the design-review checkpoints driving Sean's iteration loop.
