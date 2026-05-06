# Track B Orchestration Plan — Everlastings v1.4.3 Frontend Design

## Context

Track B delivers the entire frontend design layer in vanilla HTML/CSS/JS — no build step, no React, no API calls during page render. Track A (backend, complete on `dev`) and Track C (integration) are out of scope for execution but inform handoff. Every hardcoded data block is wrapped in `PLACEHOLDER:` comments so Track C can grep and wire live data.

The repo is mostly empty for Track B's surface: no HTML pages at root, no `assets/css/`, only Track A's `admin/`, `api/`, and `assets/js/admin.js`. We start clean from a brand-rich asset folder (logo SVGs in many sizes, real product photos under `assets/brand/sample-images/`, brand-story image, product video).

The core orchestration constraints:

1. **Track C is not a "natural home" for UX/voice/feel decisions.** Anything that touches design or copy must be solved in Track B. Track C is data wiring, period.
2. **Placeholders are production-grade by default.** Image dimensions, format, and CDN paths must be exactly what Emy and her future workflow will use. Mismatched placeholders create double work.
3. **Distractions in placeholders harm design review.** Real product photos (Emy's actual miniatures) bias the visual review toward "what's in the photo" rather than "what does the layout do." Use abstract art so the page UX is what's evaluated.
4. **Cookie consent is UX-led, not legalistic.** A tiny artisan brand needs the *minimum* user-facing friction that satisfies platform/ad-network requirements. Decision must come from research, not legal-defaults guesswork. We optimize for the "carefree user trading data for experience," with a clean privacy opt-out path for those who want it — not the inverse.
5. **The track ends with a detailed dev session report** (`v1_4_3_B_SESS_DEV_REPORT.md`), modeled on Track A's report, that another agent can read to fully understand expected vs. planned vs. actual before Track C starts.

**Authoritative guide**: `assets/docs/archive/v1_4/v1_4_3_B_IMPLEMENT.md`. **Brand**: `assets/docs/BRAND.md`. **AI image / product pipeline**: `assets/docs/PRODUCT_PROTOCOL.md`. **Architecture**: `assets/docs/EVERLASTINGS_STORE.md` (referenced by AR # throughout).

---

## Approach

### B0 — Pre-Foundation: Research + Placeholder Asset Pipeline

Two parallel research/prep waves run before the design system is written. Both produce artifacts the rest of the track depends on.

#### B0.1 — Cookie Consent Research Wave

Subagent (general-purpose with web research) produces `assets/docs/archive/v1_4/v1_4_3_B_RESEARCH_COOKIE_CONSENT.md` with these sections:

- **Legal floor for our context**: US-only shipping, California (CCPA) exposure, Virginia / Colorado / etc. state privacy laws relevant to a small US e-commerce site, GDPR exposure (we don't sell to EU, but EU visitors may still hit the site).
- **Meta Pixel advertiser requirements**: does Meta require a consent UX from advertisers, or is opt-in/out handled by Meta's account-level + iOS-level controls? Cite the actual advertiser policy.
- **Google Consent Mode v2**: when does it actually apply (EEA Google Ads campaigns? Google Signals? GA4 only?), and what's the practical impact for a US-only artisan shop with low traffic?
- **UX patterns from comparable brands**: pull screenshot examples and patterns from 6–10 small artisan / handcraft / lifestyle DTC sites (Magnolia, Anthropologie's small-batch lines, Etsy "vetted" shops, similar). Categorize: bottom banner, modal, inline footer, "soft" notice, none.
- **Bounce-rate / conversion data**: any published data on banner format vs. bounce rate for low-traffic e-commerce.
- **Recommendation**: minimum-friction pattern that satisfies Meta's advertiser requirement (so we can run ads), respects California users' right to opt out, and stays out of the way of carefree visitors. Include a default-deny vs. default-allow recommendation with reasoning.
- **What Track B builds vs. what Track C wires**: explicit split — banner DOM + CSS + state persistence (localStorage) live in B; the actual `gtag('consent', ...)` and `fbq('consent', ...)` calls live in C, with hooks dispatched from B's banner.

Orchestrator reads the report and decides scope for **B1.5** (the cookie banner build phase). If research finds we don't need a banner at all for Meta-advertiser compliance and our jurisdiction is silent, banner DOM still ships (hidden, opt-in via "Privacy" footer link) so future scope-up is one line of CSS.

#### B0.2 — Placeholder Product Pipeline (production AI pipeline)

This wave validates and exercises the AI product-creation pipeline that Emy will use long-term. We seed 6–8 placeholder products end-to-end through it. The output is real R2-hosted CDN images at production dimensions and format, plus real Supabase rows tagged `is_test = true` (so they don't bleed into production).

**Steps** (orchestrator drives; the heavy lifting of seeding is delegated to a subagent):

1. **Read `PRODUCT_PROTOCOL.md`** in full to confirm the curl protocol's current shape. Confirm `/api/upload` and `/api/products` are deployed against the `dev` preview (Track A complete).
2. **Set `BASE_URL`** to the `dev` branch's Vercel preview URL so seeding goes into test namespace (`is_test=true`, R2 `test/` prefix, CDN URLs like `https://cdn.everlastingsbyemaline.com/test/{slug}/test_{role}-{slug}.webp`). Use `PRODUCT_API_KEY` from `.env.local` (test scope).
3. **Generate abstract placeholder art** (per Sean: "any random art or product should do" — neutral, abstract, non-distracting). Use available image-generation skills (`imagen` / `create_image`). 7 images per product minimum (1 hero, 1 thumbnail, 5 gallery), 2 of the products also get a video and a GIF placeholder so we can exercise media rendering on the product page. Subjects: abstract gradients / geometric / textural — nothing that reads as a "real" miniature.
4. **Pipe through `/api/upload`**: for each image, POST to `/api/upload` with `slug`, `role`, and `file`. The endpoint Cloudinary-transforms to 4:5 WebP at q_auto compression and uploads to R2. Returns the production-format CDN URL.
5. **Create products via `/api/products`**: POST 6–8 products with poetic-but-clearly-placeholder copy (titles like "Placeholder Haven I", "Placeholder Haven II"; story cards adapted from BRAND.md voice but obviously demo content). Products span the variants we need to design for: featured / not featured, sold / available, different `series` values, different `product_type` values.
6. **Verify**: confirm Supabase rows have `is_test=true`; confirm Stripe sync wrote `stripe_product_id` + `stripe_price_id` back; confirm CDN URLs resolve; confirm image weight is <150KB per image.
7. **Document the seeded set**: write `assets/docs/archive/v1_4/v1_4_3_B_PLACEHOLDER_SEED.md` with the list of seeded slugs + image URLs + which products go where (homepage featured carousel, shop grid, product page sample, related havens). Subagents reference this in B3/B4/B5.
8. **Cleanup directive for Track C**: documented in the seed doc — Track C deletes these `is_test=true` rows before launch.

**Why this is the right approach** (per Sean's direction):
- Lighthouse mobile ≥ 90 stays honest because images are at production-target weights.
- The AI pipeline gets exercised end-to-end before Emy needs it for real products — any pipeline gaps surface now, not when she's trying to launch a piece.
- Image filenames, paths, and dimensions match Emy's eventual workflow exactly. Zero rework when real photos replace placeholders.
- Track B HTML pages reference these CDN URLs directly (no API call at page-render time — pure static HTML). Hygiene preserved via PLACEHOLDER comments wrapping the data blocks.

**If the pipeline is broken or rough** — orchestrator pauses, surfaces the gap to the user, and Sean either points to the older standalone version or the 360-design portfolio's "entry SOP." The pipeline polish becomes part of the track work.

---

### B1 — Design System (orchestrator does directly)

Outputs (under `assets/`):

1. **`assets/css/styles.css`** — single stylesheet:
   - All CSS custom properties from BRAND.md > "CSS Custom Properties" verbatim (plum, lavender, fog, cream, gold, ink, star-blue, amethyst + bg/text/accent aliases).
   - Spacing/shadow/radius/transition/z-index/header-height tokens per guide §B1.
   - Typography: Cormorant Garamond via Google Fonts (`preconnect` + `display=swap`); `--font-display`, `--font-body`, full size scale `--text-xs..5xl`; heading hierarchy h1–h6; body line-height 1.6–1.8.
   - Base components: buttons (primary plum / secondary outline / ghost / disabled / `.btn-sm`), cards (4:5 aspect, hover scale 1.05 + shadow lift), forms (plum focus outline), images (`object-fit: cover; aspect-ratio: 4/5`), badges (`.badge-sold` fog bg, `.badge-featured` gold border), error states (ink on fog).
   - Skeleton shimmer keyframes.
   - Lightbox overlay/nav/close styles.
   - Email-CTA styles: contemplation popup (bottom-right peel-up), exit-intent modal (centered overlay), product-interest CTA (in-card).
   - Mobile-first breakpoints @ 393 / 768 / 1024 / 1440.
   - Header sticky, footer columns, nav dropdown, hamburger toggle.

2. **`assets/js/lightbox.js`** — gallery click → fullscreen overlay; ESC + arrow keys; no API calls; data-attribute hookable.

3. **`assets/js/ui.js`** — exit-intent listener (`mouseleave` top desktop + `visibilitychange` mobile); 3-min `setTimeout` for contemplation popup; `sessionStorage` gating; mobile hamburger toggle. Forms dispatch `CustomEvent('email-cta-submit', { detail: { source, email, productSlug? } })` on submit (Track C wires `/api/subscribe`). Header comment documents the event contract.

4. **`assets/js/cart-ui.js`** — cart badge update from `localStorage.getItem('cart')` (placeholder cart sample wrapped in PLACEHOLDER); no API calls.

5. **Inline SVG icon set** in `_components.html`: dimensions, weight, materials, lighting, care, shipping. 20×20, `currentColor` fill. Pasted directly into product.html by B3.

6. **Canonical `<head>` snippet** documented for B2 to include verbatim:
   - charset → viewport → title → meta description → preconnects → Google Fonts → `assets/css/styles.css` → GA4 (`G-XXXXXXXXXX` placeholder; consent default deny call BEFORE gtag.js — see B1.5) → Meta Pixel (`META_PIXEL_ID_HERE` placeholder) → favicon link to `assets/brand/favicon/logo_circle_purple_red_200.png`.

7. **Global modal/popup snippets** — exit-intent modal + contemplation popup HTML (hidden), pasted into every page by B2's documented snippet block.

8. **`_components.html`** (kept permanent) — renders every token, base component, badge variant, skeleton state, modal/popup. Reference for Track C and future agents.

9. **`onerror` placeholder fallback** — generate a small (~5KB) low-fidelity neutral plum-gradient WebP at 4:5; place at `assets/brand/sample-images/placeholder-fallback.webp`. Documented `<img onerror="this.onerror=null;this.src='/assets/brand/sample-images/placeholder-fallback.webp'">` convention.

10. **Logo file selection** locked: `assets/brand/logo/720_logo.webp` for header; `assets/brand/logo/450_logo.webp` for footer; `assets/brand/logo/1080_logo.svg` for hero/large display.

11. **PLACEHOLDER hygiene rule** documented in `_components.html`: wrap one logical block per comment, not per atom. Atom-level only when fields will be replaced independently.

12. **Smoke verification** before delegating B2: open `_components.html` in a browser, confirm tokens render, every component looks right, lightbox/popup/modal can be triggered. Run a single Lighthouse mobile audit on `_components.html` to baseline ≥ 90.

---

### B1.5 — Cookie Consent Banner (orchestrator does directly, informed by B0.1)

Built after B1 styles are in place, before B2 delegates header/footer (so the banner snippet can be included in B2's global snippet bundle).

Implementation depends on the recommendation in `v1_4_3_B_RESEARCH_COOKIE_CONSENT.md`. Default expectation:

- Banner DOM markup (hidden by default; shown if no choice persisted in localStorage).
- CSS for the banner (subtle, brand-voiced, ink on cream with plum accent — see BRAND.md voice rules; copy must be warm not legalistic).
- Persistent footer "Privacy preferences" link (always visible) that re-opens the banner.
- localStorage key + value shape documented for Track C (e.g., `everlastings.consent` = `'granted' | 'denied' | undefined`).
- gtag default-deny call placed in the canonical `<head>` snippet BEFORE gtag.js loads (so consent state is correct on first paint).
- `CustomEvent('consent-change', { detail: { state } })` dispatched on accept/reject — Track C listens and runs `gtag('consent', 'update', ...)` + `fbq('consent', 'grant'|'revoke')`.

Privacy policy page (`privacy.html`, built in B6b) contains the cookie-category enumeration that the banner links to.

---

### B2 — Header / Footer / Nav (subagent: `vercel:frontend-design`)

Builds canonical header HTML (logo, nav: Home / Shop dropdown / About / Commissions / Contact; cart icon w/ count badge; mobile hamburger; sticky-on-scroll) and footer HTML (4 columns: About / Shop / Support / Connect; newsletter input; social links Instagram / Facebook / Pinterest / TikTok; bottom bar with copyright + "Site by Sean August Horvath" + Terms | Privacy + the persistent Privacy-preferences link from B1.5).

Output is a **copy-paste-complete** documented snippet block (NOT a partial — vanilla HTML has no template engine) containing: full `<head>` (B1's canonical block + B1.5's gtag default-deny), `<header>...</header>`, the global exit-modal + contemplation popup + cookie-banner markup (hidden), an opening `<main>` and closing `</main>`, `<footer>...</footer>`, and `<script>` tags for the four JS files. Marker comments `<!-- HEADER START / END / FOOTER START / END / GLOBAL MODALS START / END -->` so B3–B6 paste cleanly.

---

### B3 — Product Page (subagent: `vercel:frontend-design`)

`product.html`. Two-column desktop, stacked mobile. Includes: scrollable gallery (uses seeded product images from B0.2) + lightbox triggers; sticky right card with title / price / Add to Cart / Buy Now / availability note + interest-CTA #1 form; breadcrumb (separator: `›`); feature list with the 6 SVG icons; details sections (dimensions, materials, care, shipping); story card with 4-paragraph poetic placeholder (BRAND.md voice); related havens (3-4 cards — agent **pastes the canonical product-tile snippet** B4 will produce); media rendering examples (one video, one GIF, one YouTube embed) using seeded media. Sample product is one of the seeded "Placeholder Haven" entries. Mobile sticky-card breaks to in-flow below 768px.

---

### B4 — Shop Grid (subagent: `vercel:frontend-design`)

`shop.html`. Filter sidebar (series / product_type / availability checkboxes), sort dropdown (price low/high, newest, A-Z), 6-8 hardcoded tiles using seeded products (4:5, hover scale, lazy), Sold-badge variant on at least one tile, "No havens match your search" empty state, skeleton-loading state. **Outputs the canonical `.product-tile` snippet** for B3 to reuse.

Additionally implements all shop-relevant error states from B6.5: loading skeleton, no-products-at-all, all-products-sold (with inline newsletter form), filter-zero-matches, fetch-failed. Each as hidden DOM blocks Track C reveals.

---

### B5 — Homepage (subagent: `vercel:frontend-design`)

`index.html`. Full-viewport hero (use one of the seeded products' hero images, or a dedicated abstract hero seeded for this purpose) + plum overlay + "Enter Elsewhere" CTA; intro block ("When the world cracked open..."); featured carousel (3-4 hardcoded cards via canonical product-tile snippet, horizontal scroll); brand pillars (Story / Craftsmanship / Sanctuary); testimonial strip placeholder; theatrical lighting effect (radial-gradient mask shifts on scroll, counter-scroll `translateY` on background layer, `will-change: transform`).

Voice and copy must be drawn from BRAND.md > Tagline + Secondary Lines + CTA Language verbatim where the guide pulls from it.

---

### B6 — Remaining Pages (split into 3 subagents — deviation from guide noted)

A single B6 subagent has too much surface area; one drift between subagents will propagate. Split:

- **B6a (`vercel:frontend-design`)**: `about.html` (photo + logo + origin story + philosophy + mission), `contact.html` (form + commission section), `faq.html`. Brand-voice critical.
- **B6b (general-purpose subagent)**: `shipping.html`, `terms.html`, `privacy.html` (includes cookie-category enumeration tied to B1.5 banner), `policies.html` (with the explicit Availability section text from guide §B6 verbatim). Voice still poetic but content mostly utilitarian.
- **B6c (`vercel:frontend-design`)**: `cart.html` (line items + qty + cost estimate + optional email/name capture + CHECKOUT button + **recovery overlay markup hidden by default** + **related-products section hidden by default** — both wired in C); `checkout.html` (two-stage progressive disclosure in single DOM: Stage A info / Stage B Stripe Payment Element placeholder, second hidden until first valid); `complete.html` (BOTH success AND error state markup present with BRAND.md error-state copy).

---

### Error states

All 25 error states from B6.5 of the guide are realized as either: (a) static copy already in the appropriate page (e.g., shop empty state, complete success/error, cart empty), or (b) hidden DOM blocks with the canonical copy from BRAND.md "Error & Empty State Voice" + the guide §B6.5 (e.g., `#checkout-error`, recovery overlay, sold-while-in-cart popup). Track C reveals them via JS.

---

### What Track B does NOT do

- No API calls during page render (`api/`, `supabase/`, `admin/`, `assets/js/cart.js`, `assets/js/admin.js` — out of scope).
- The **only** API calls during Track B are during B0.2 placeholder seeding via existing Track A endpoints; these populate test data, not production.
- No real promo-code generation (Track C wires Stripe API).
- No real consent-mode wiring to gtag/fbq (Track C — but DOM, CSS, localStorage, and CustomEvent contract all live in Track B).
- No SEO meta beyond title/description placeholders.

---

## Critical Files

**Created (Track B owns)**:
- `assets/css/styles.css`
- `assets/js/lightbox.js`, `assets/js/ui.js`, `assets/js/cart-ui.js`
- `assets/brand/sample-images/placeholder-fallback.webp` (small fallback for `onerror`)
- `_components.html`
- `index.html`, `shop.html`, `product.html`, `about.html`, `contact.html`, `faq.html`, `shipping.html`, `terms.html`, `privacy.html`, `policies.html`, `cart.html`, `checkout.html`, `complete.html`
- `assets/docs/archive/v1_4/v1_4_3_B_RESEARCH_COOKIE_CONSENT.md`
- `assets/docs/archive/v1_4/v1_4_3_B_PLACEHOLDER_SEED.md`
- `assets/docs/archive/v1_4/v1_4_3_B_SESS_DEV_REPORT.md` (final deliverable)

**Read-only** (already in repo):
- `assets/brand/logo/{720,450,1080}_logo.{webp,svg}`, `assets/brand/favicon/logo_circle_purple_red_200.png`
- BRAND.md, EVERLASTINGS_STORE.md, PRODUCT_PROTOCOL.md, v1_4_3_B_IMPLEMENT.md, DEV_RULES.md, AGENTS.md

**Hands-off** (Track A / C territory):
- `api/**`, `supabase/**`, `admin/**`, `assets/js/admin.js`

**Test-mode artifacts** (created in B0.2, cleaned up by Track C):
- 6–8 Supabase rows in `products` with `is_test = true`
- ~50 R2 objects under `test/{slug}/test_*.webp` (and a few `.mp4`/`.gif`)

---

## Commit Cadence

`dev` branch only. Per `DEV_RULES.md`:

- **One commit per file creation or edit, per logical unit** (not aggregating multiple files into a single commit unless they're a single logical unit, e.g., one HTML page + its associated section in the styles file).
- Commit messages explain the change context (`feat`, `chore`, `docs`, etc.) and reference the IMPLEMENT.md grouping (e.g., `feat(b1): add CSS custom properties + typography tokens`).
- Push after each major milestone (end of B0.1, end of B0.2, end of B1, end of B1.5, end of B2, end of each B-letter, end of B6 subagents) for preview deployment review.

---

## Final Deliverable: `v1_4_3_B_SESS_DEV_REPORT.md`

After all track work + commits, orchestrator writes `assets/docs/archive/v1_4/v1_4_3_B_SESS_DEV_REPORT.md`. Modeled on Track A's report (`v1_4_3_A_SESS_DEV_REPORT.md`).

Required structure:

1. **Summary**: high-level outcome, branch state, total files created.
2. **Three-column comparison per phase**: expected (from `v1_4_3_B_IMPLEMENT.md`) vs. planned (from this plan, which becomes `v1_4_3_B_SESSION_DEV.md` after approval) vs. actual (what got done).
3. **Per-phase sections**: B0.1, B0.2, B1, B1.5, B2, B3, B4, B5, B6a, B6b, B6c, verification.
4. **Unexpected adjustments / fixes / postponements**: each item with reasoning.
5. **MCP usage explanations**: any MCP tool used (vs. Bash CLI) explained — why and why not the CLI.
6. **Pending items / next steps for Track C**: explicit handoff, including the test-mode placeholder seed cleanup directive, the consent-mode wiring contract, the email-CTA CustomEvent contract, the recovery overlay reveal logic, and any other deferred work.
7. **Open threads**: questions, unresolved decisions, things the next agent needs to act on.
8. **Memory updates**: list of memories I added during the session (auto-memory system) and why.

Designed so a fresh agent reads this document and is fully briefed for Track C without needing to re-read every other artifact.

---

## Verification (orchestrator runs at end, before writing SESS_DEV_REPORT)

1. **Placeholder grep** — `grep -rn "PLACEHOLDER:" .` returns the expected set across all 13 pages + components page. Document the count.
2. **Per-page browser smoke** — open each page via `vercel dev` (this exposes the deployed API for the consent-mode CustomEvent path even though pages don't call APIs themselves). No console errors. Lightbox opens. Hamburger toggles. Exit-intent modal trigger fires (force via console). Contemplation popup trigger fires. Cart badge reads from localStorage. Cookie banner opens, persists choice, re-opens via footer link.
3. **Lighthouse mobile ≥ 90** — run on each page. With B0.2 production-format images, 90+ is achievable.
4. **BRAND.md spot check** — visually confirm: deep plum used for primary CTAs, Cormorant Garamond on headings, error copy matches BRAND.md voice, CTA labels match BRAND.md ("Enter Elsewhere", "Bring This Haven Home", "Join the Firelight Council").
5. **Error states audit** — open each error state DOM block (force `display: block` via devtools) and confirm copy matches Error States Reference + BRAND.md voice.
6. **Cross-page consistency** — header/footer/global-modal markup identical across every page (diff sample pages); fonts loaded; all 13 pages link cleanly.
7. **Mobile-first sanity** — at 393px viewport: no horizontal scroll, sticky card breaks to in-flow on product page, hamburger replaces nav, cart icon visible.
8. **Cookie banner functional check** — banner appears on first visit, state persists in localStorage, footer revoke link re-opens, accept/reject both fire `consent-change` CustomEvent (verify in console).

---

## Risks & Mitigation

- **Subagent drift on header/footer paste** — B2 produces a copy-paste-complete snippet with marker comments; orchestrator spot-diffs after each page subagent finishes.
- **AI image pipeline gaps** — surfaced in B0.2 immediately, not deferred to launch.
- **Cookie banner over- or under-scope** — B0.1 research wave is the gate; orchestrator pauses at B1.5 if recommendation isn't clear.
- **Theatrical lighting effect under- or over-delivered** — B5 subagent gets BRAND.md "Theatrical Depth" excerpt + EVERLASTINGS_STORE.md Design Principles to anchor.
- **PLACEHOLDER granularity inconsistency** — Documented in `_components.html` with examples; orchestrator spot-checks first subagent output and corrects pattern before continuing.
- **Test-data leak to production** — B0.2 seeded rows are `is_test=true` and live under R2 `test/` namespace; Track A's existing filter (`is_test = false`) keeps them out of production reads. SESS_DEV_REPORT explicitly hands the cleanup directive to Track C.

---

## Memory Updates Planned (executed during track work, not now)

During execution I'll save (per the auto-memory system):

- **Feedback memory**: Track C is not a "natural home" for UX/voice work. UX, voice, copy, feel decisions belong to whichever track the design lives in.
- **Feedback memory**: placeholders should be production-grade — same dimensions, format, CDN paths as production. Use existing AI pipeline (`PRODUCT_PROTOCOL.md`) to generate them, not improvise.
- **Feedback memory**: at the end of significant build sessions, write a detailed `_SESS_DEV_REPORT.md` (modeled on Track A's) comparing expected vs. planned vs. actual; designed for a fresh agent to fully brief on without re-reading everything.
- **Feedback memory**: omit timing/duration language from plans and reports — irrelevant to quality of work.
