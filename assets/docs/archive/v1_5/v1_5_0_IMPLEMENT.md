# v1.5.0 — AI Store Management + Design (IMPLEMENT)

**Created**: 2026-06-05
**Status**: Architecture spec / planning. Not yet built. Supersedes the design-only sketch that was briefly considered for v1.5.
**Purpose**: Define what v1.5.0 builds and why, in enough detail to drive a later exclusively-executable build doc (the usual string-anchored + gap-review pass). **Functionality comes first; design second.**

> Truth discipline: everything under "Decided" is confirmed with Sean. Anything still open is under an explicit "Open" marker. Nothing here is built yet — this is the plan, not a record of work.

---

## Why this version

The thing that makes this store unique — and the reason a custom build out-paces Webflow / WordPress — is that **the whole website is managed through chat**. A non-technical owner shouldn't need years of practice to move like a tornado through updates; the store is built so anyone can do it quickly. v1.4.9 proved the buy→fulfill loop. v1.5.0 delivers the management layer that was always part of the value: the AI can **create, edit, preview, publish, and discount** — safely, with a real visual preview before anything goes live.

A boundary slipped into v1.4.x that Sean did not sign off on — the Custom GPT was **create-only**, edits were routed to the admin panel, and there was **no draft/preview**. v1.5.0 corrects that. The owner manages everything by chatting with the GPT, sees a true preview of how it will look to shoppers, and clicks publish herself.

---

# Part 1 — AI Store Management (functionality)

## 1.1 Field taxonomy — three tiers (Decided)

Every product field belongs to one of three tiers. The GPT generates **all** of them (see 1.2), so the owner never has to think about "which title goes where."

| Field | Tier | New / reuse | Editable after publish? | Surfaces |
| --- | --- | --- | --- | --- |
| `checkout_name` | **Stripe-locked** | new | No — frozen like price | Stripe → checkout summary, `/complete`, receipt |
| `checkout_description` (one short line) | **Stripe-locked** | new | No — frozen | checkout / receipt |
| `checkout_image` (single) | **Stripe-locked** | new | No — frozen | checkout / receipt visual |
| `price` | **Stripe-locked** | exists | No — new product to change | everywhere |
| `title` (Page Title) | Page / marketing | reuse | Yes (draft→publish) | shop, product page |
| `description` (Page Summary, longer) | Page / marketing | reuse | Yes | product page |
| `headline`, `story_card` | Page / marketing | reuse | Yes | product page |
| `images` (hero + gallery) | Page / marketing | reuse | Yes | product page |
| `thumbnail` + `thumbnail_alt` (Tile) | Page / marketing | reuse | Yes | shop tile, cart |
| `seo_title` | SEO | exists | Yes | `<title>`, OG/Twitter |
| `seo_description` | SEO | exists | Yes | meta description, OG |
| `seo_thumbnail` (OG image, ~1.91:1 crop) | SEO | **new** | Yes | OG / Twitter card image |
| `is_published`, `published_at`, `draft` (jsonb), `preview_token` | system | new | — | draft/publish machinery |

**Why the split works.** The site (shop, product page, cart) reads the **database**; the Stripe Elements checkout summary, `/complete`, and the receipt read the **Stripe catalog** (`checkout.ts:94` builds line items from `stripe_price_id`; `:346` shows `li.description`). By making the three checkout fields **frozen and Stripe-bound** — set once, pushed to Stripe at publish, never edited — editing marketing/SEO copy **never has to touch Stripe**, so the catalog can never go stale. Price already follows this rule (a price change creates a new Stripe Price; `products.ts` PUT does this today). The short, ~one-line `checkout_description` earns its own field precisely because only a sentence shows at checkout/receipt — and the GPT can phrase that line however the owner needs, or give its best estimate in a pinch.

**New columns:** `checkout_name`, `checkout_description`, `checkout_image`, `seo_thumbnail`, `is_published`, `published_at`, `draft` (jsonb), `preview_token`.

## 1.2 The GPT sets every value (Decided)

No field is left for the owner to fill in by hand. For a create or an edit, the GPT **drafts every field in all three tiers** from the owner's intent + photos, then either:
- presents them for review ("here's the checkout line, the page copy, and the SEO — look right?"), or
- **expedites** (skips the line-by-line confirmation) when the owner has said to just go ahead.

Either way the visual preview (1.4) is the real review surface. The owner approves the *result*, not the field list. This is also why nothing is "skipped": the GPT knows what a checkout name vs. a page title vs. an SEO title should each be, and fills them accordingly.

## 1.3 Stripe binding — the lock (Decided)

- **At publish of a new product:** create the Stripe product from `checkout_name` / `checkout_description` / `checkout_image`, create the Price from `price`, store the IDs. (Today this happens at create via `?sync=true`; it **moves to publish** so abandoned drafts never create Stripe objects.)
- **After publish:** the checkout fields + price are **frozen**. The GPT will not edit them; to change price, create a new product. To run a sale, create a coupon (1.5) — never edit price.
- **Marketing/SEO edits never call Stripe.** `stripeSync.ts` gains a publish-time path (create at publish; it currently only creates on `?sync`, never updates — which is fine because we never update Stripe fields).

## 1.4 Draft → preview → publish (Decided)

The safety UX. People can't picture things from text in a chat — they need to **see the page**. This is standard CMS behavior (WordPress preview), and it's also the footage that sells the product.

- **Model:** add `is_published` (default false), `published_at`, a `draft` jsonb overlay, and an unguessable `preview_token` to the products row. Single table — **folds into `products.ts`, no new function.**
- **Create:** insert an **unpublished** row with all fields; **no Stripe object yet**. Return the preview URL.
- **Edit:** write the changes into `draft` on the live row. The live columns keep serving the site unchanged until publish.
- **Preview:** `GET /product/{slug}?preview=<token>` — `product.js` renders the **real** product page using the draft values (live row merged with `draft`, or the unpublished row for a new product). The public product fetch stays filtered to `is_published = true`, so drafts never leak into the live site or shop grid.
- **The preview looks exactly like the shopper view, with one addition: a clear "Publish" control** — which doubles as the signal that this isn't live yet. The owner taps the link the GPT sent her (no login), looks, and taps Publish.
- **Publish** (her button posts the `preview_token`, or she tells the GPT "publish"): validate the token → for a **new** product, create the Stripe product + price then set `is_published = true`, `published_at = now`; for an **edit**, apply `draft` → live columns. Then **clear/rotate** `preview_token` and clear `draft` so a stale link can't republish.
- **Access model:** the token is a capability — possessing the link is the authority to publish, so it's effectively hers (and it still works if she's also logged into the admin). Acceptable for this store; the token is unguessable and rotates on publish.

**Open:** exact preview indicator beyond the Publish button (a small "Draft preview — not yet live" label is likely worth adding so it's unmistakable, even though the button is the primary signal).

## 1.5 Coupons / discounts via the GPT (Decided — include in v1.5.0)

The owner forgot to put up a holiday sale? She messages the GPT and it's done. This is AI-in-the-loop at its best.

- **Vocabulary (so the GPT picks the right object):**
  - **Coupon** = the discount *rule*: `percent_off` **or** `amount_off` (+ currency), optional `applies_to.products`, `max_redemptions`, `redeem_by`.
  - **Promotion Code** = the shareable, customer-facing code (e.g. `HOLIDAY20`) attached to a coupon; optional `restrictions.minimum_amount`, `expires_at`, own `max_redemptions`.
  - **Discount** = the *applied result* when a code/coupon hits a checkout.
- **GPT action:** create a Coupon + a Promotion Code in one call. Params: type (`percent` / `amount`), value, optional code (GPT can generate), product scope (all or specific), optional minimum **order amount**, optional expiry.
- **Supported vs. not:** percent/amount off, product scope, minimum **order amount**, expiry, redemption caps — all native. **Not native:** "buy N / BOGO" by quantity — flag as out of scope so the GPT never promises it.
- **Redemption already works** — `checkout.js` calls `applyPromotionCode`. We're only adding the **create** side, **folded into an existing function** (no new file).

## 1.6 Admin panel — unify *and* give it vibe (Decided)

- **Unify:** rework `admin.js`'s save flow so admin create/edit go through the **same draft → preview → publish** endpoints as the GPT. One safety path everywhere — important for when the owner is on her own after the support window. No more "live immediately" surprise.
- **Vibe (light brand pass):** the admin shouldn't be intentionally vacant — it's branding, and it should feel comfortable. Apply the site's design tokens (`styles.css` variables), simple intuitive **tabs** (Products / Orders), comfortable spacing, on-brand type/color. Not a full redesign — just enough that it feels like part of the product, not a debug screen.

## 1.7 GPT understanding — author early, evolve (Decided — brand-critical)

The GPT's knowledge + instructions are the **most prominent brand surface** of this product. If they're thin, the GPT gets things wrong or — worse — is clunky enough that the owner would rather do it herself. We start writing this now, so by production it's simple, clear, and helps the GPT be genuinely dynamic and helpful.

**What the GPT must understand (the early outline — grows into `assets/docs/gpt/` knowledge + `GPT_SETUP.md` instructions):**
- **Every field**, by tier: what each is, how long it should be, the voice (per `BRAND.md` / `voice-guide.md`), and where it shows. The checkout line is one sentence; the page summary is longer; SEO is search-shaped.
- **The create/edit flow:** draft everything → preview link → owner reviews or expedites → publish.
- **Preview-link handoff language:** how the GPT phrases "here's your preview: <url> — that's how shoppers will see it; tap Publish when it looks right."
- **Coupon semantics:** coupon vs. promotion code, what's supported, how to translate "20% off everything until New Year's" into the right params; never offer BOGO.
- **When to confirm vs. expedite**, and how to read the owner's preferences over time.
- **Errors in plain language:** slug taken → suggest a new title; missing field → name it plainly; auth issue → "the connection key needs Sean's attention."
- **What the GPT does NOT do:** change price (new product), edit the frozen checkout fields, touch `is_test`.

## 1.8 Environments & the owner's independence (Decided)

- **The owner never touches environments.** Her GPT points at production; the **draft preview is her safety net** — she previews safely on production via drafts, never needing a "test mode."
- **The test ↔ live switch is Sean's tool** (and the demo/portfolio path): point the GPT's Action at the dev preview + preview key (SSO off) to exercise everything on `is_test=true` data with no real money, then switch the Action to production for handoff. (`isTest = VERCEL_ENV !== 'production'`, `env.ts:2`; orders/products are scoped to it.)
- Document this split clearly so it holds after the 3-month support window — she should never be confused about "test vs live" because in her world there's only live + drafts.

## 1.9 Function-cap discipline (Decided)

Treat the Vercel Hobby cap as **full** (11 deployed today). **Everything in Part 1 folds into existing functions** — draft/edit/preview/publish + coupon-create all live in `products.ts` (or a like consolidation); `stripeSync` is a helper; `product.js` / `admin.js` are frontend. **No new function files.** Confirm the exact current Hobby ceiling before anything would ever add one.

## 1.10 Phased build outline (for the later executable doc)

1. **Migration** — add the new columns (1.1) + indexes; keep `is_test` isolation intact.
2. **`products.ts`** — create-as-draft, edit-to-draft, preview-read (token), publish (token → Stripe-at-publish for new / apply draft for edit), public list/GET filtered to `is_published=true`; coupon-create folded in.
3. **`stripeSync.ts`** — publish-time create path.
4. **`product.js`** — preview mode + the Publish control posting the token.
5. **`admin.js` + `admin/index.html`** — unify to draft/publish; light brand pass (tabs, tokens).
6. **GPT** — knowledge files (1.7) + `GPT_SETUP.md` actions (edit, publish, coupon) and instructions; the schema gains the new actions.
7. **Robust testing (1.11).**

## 1.11 Testing plan (Decided — robust, especially coupons + GPT behavior)

Run on the **dev preview** (point the GPT's Action there; `is_test` data; no real money), then a production sanity pass at launch.

- **Field taxonomy round-trip:** create a product → confirm each tier lands where it should (checkout line at checkout/receipt; page copy on the page; SEO in meta/OG).
- **Draft/preview/publish:** create → preview URL renders the unpublished page → publish → it goes live + Stripe product/price exist; edit → live page unchanged until publish → preview shows the change → publish applies it; stale token can't republish.
- **Stripe lock:** confirm marketing/SEO edits never alter the Stripe catalog; confirm price-change guidance routes to "new product."
- **Coupons (extra rigor):** percent and amount; product-scoped vs. all; minimum order amount; expiry; redemption at checkout via the code; confirm BOGO is refused cleanly.
- **GPT behavior (extra rigor):** does it draft every field correctly, phrase the preview handoff well, pick the right coupon params, confirm-vs-expedite appropriately, and fail gracefully? This is the brand test as much as the code test.

---

# Part 2 — Design (second)

## 2.1 Glow — "Firelight" ambient glow (Decided: palette + context first)

- **Effect:** a warm bloom seeping inward from all four viewport edges (ref `assets/docs/archive/images/everlastings-website-red-glow.jpg` — confirmed visible, strongest on the right; we intensify and even it out). Fog-like: subtle scale "breathing" + opacity drift + a slow **clockwise** travel.
- **Technique:** a fixed full-viewport overlay — a **conic-gradient ring** (drives the clockwise motion) layered with edge radial-gradients, animated via CSS `@keyframes` on `transform`/`opacity`. A single CSS custom property `--glow-color` is the only control; a second variable tunes intensity. Honor `prefers-reduced-motion`.
- **Color behavior (v1.5.0):** a curated palette seeded from `BRAND.md`; **page-themed**, **randomized across the gallery**, and **reflecting the featured / cart / checkout piece** — all by setting `--glow-color`.
- **Deferred follow-up (NOT v1.5.0):** the owner's per-product accent picker (one nullable `accent_color` column + an admin/GPT field). The variable-driven build makes it a clean drop-in once the look is dialed and the palette is chosen against the live effect.

## 2.2 Quick wins (Decided)

- **Nav "SHOP" raised:** `.site-nav` is a flex row; "Shop" sits in `<span class="nav-dropdown">` (index.html:106–119) while siblings are bare `<a>`, so it aligns higher. Fix: `.site-nav { align-items: center }` and make `.nav-dropdown` an inline-flex centered item. Replicated across every page header.
- **Shop filters → compact dropdowns:** today a sprawling `<aside class="shop-filters">` of checkbox groups (shop.html:169–208). Convert to compact dropdown / `<details>` controls; keep the `data-shop-filter` hooks so `shop.js` is untouched.
- **Desktop density pass:** scale sizing down so cart/checkout/cards don't push content below the fold on desktop at smaller widths.

## 2.3 Hero (Open — Sean's spec pending)

Animated, layered homepage hero with Sean's video. Build path (CSS layering vs. Hyperframe) **TBD — Sean will write a design spec** after studying the glow ref and deciding on layering. `.hero__media` already supports `<video>` (styles.css:954); a CDN slot is referenced (`assets/.cdn-media/hero-bg-anim`).

## 2.4 Content-gated (revisit once real images/copy land)

- Entry/landing sizing sanity pass (full-VW images, multiple-VH sections).
- **Product-page video is a placeholder** — `product.html:252` points at a Rickroll id (`dQw4w9WgXcQ`); replace with the real product video and right-size the 16/9 embed.
- A design feedback round once real product imagery is in.

---

# Part 3 — Carry-overs & sequencing

- **v1.5 alongside the above:** Meta Pixel + webhook `event_id: session.id` dedup (already planned).
- **v1.1 cosmetic:** 409-overlay related-products show `$0.00` (reserve API `related` omits price).
- **Backlog:** optional GPT `listProducts` read action; harden `products.ts` PUT to ignore client-sent `is_test` (latent, low priority).
- **Post-launch initiative — productize as a reusable template.** This whole management layer is the differentiator: a website managed entirely through chat, usable on day one. Plan a robust path to package it for other client projects right after launch. (See the existing `assets/docs/archive/v2_0/` roadmap dir; this is where the template productization plan should live.)
- **Mobile QA** pending (Sean — he left preview SSO off partly to check mobile; re-enable SSO after).

---

## Gap-review & validation plan

The Track-C build proved the gap-review investment pays for itself — the executor called the packet "absurdly thorough," and the one real bug (`phone_number_collection`) would have been far costlier to find without the review loop. v1.5 is a larger architectural change, so it earns the same rigor **plus a broader pass.**

Once this spec becomes an **exclusively-executable build doc** (string-anchored edits, line numbers as hints), run fresh-instance reviews — the established pattern (Sean spins up cold instances against review prompts written for the purpose; write `v1_5_0_REVIEW_PROMPTS.md` when the build doc exists). Converge: stop when each angle finds nothing load-bearing.

- **A — cold / no-repo (self-containment):** paste only the build doc, no codebase — the truest test that it's exclusively executable.
- **B — fidelity (repo-aware):** every quoted CURRENT block matches the working tree byte-for-byte.
- **C — integration:** the edits fit the system (`EVERLASTINGS_STORE.md` + the live code).
- **D — holistic architecture & security (NEW — the broader pass Sean flagged):** review v1.5 as a *system*, not edit-by-edit:
  - **Preview-token capability model** — unguessable, rotates on publish, a stale link can't republish, drafts never leak into public reads.
  - **Draft→publish state machine** — create vs. edit paths; partial-publish / failure recovery; Stripe objects created only at publish.
  - **Stripe-lock invariant** — frozen checkout fields never drift; a price change routes to "new product," never an edit.
  - **Data integrity** — `is_test` scoping holds across the new columns + actions; coupons respect environment.
  - **Function-cap** — still folded, nothing added.
  - **GPT brand-UX** — does the knowledge make the GPT genuinely helpful, or clunky enough that DIY would beat it?

**Research support:** spin up a subagent for any genuinely open research the build needs (e.g., Stripe coupon / promotion-code edge cases, draft-overlay patterns, the hero tooling decision) — only where it isn't straightforward. The architecture spec itself didn't require one.

---

## Open items for Sean

- 1.4: add a small "Draft preview — not yet live" label in addition to the Publish button? (recommended.)
- 2.3: the hero spec (CSS vs. Hyperframe) is yours to write.
- Everything else in Part 1 is decided; the later executable build doc will turn this into string-anchored steps with the usual gap-review pass.
