# v1.4.0 — Gap Closure Before Implementation

## Context

Sean is doing one final review of the v1.3.1 implementation docs before activating implementation sessions. The v1.3.1 plan is strong, but 12 feedback items surfaced that must be resolved first — some are clarifications, a few are structural (checkout flow, coupon mechanics, shipping/email pipeline), and one is a new deliverable (GA4 KPI "sales" doc). The user's stated goal: **treat this as the last round before implementation begins**, so close every gap tightly rather than deferring.

This session produces v1.4.0 versions of the two build docs (leaving v1.3.1 in place as archive), updates the architecture + README + BRAND + PRODUCT_PROTOCOL where cross-references require, and creates one net-new doc (the KPI/advertising pitch deck).

---

## Files Being Created / Modified

| File                                                   | Action       | Purpose         |
| ------------------------------------------------------ | ------------ | --------------- |
| `assets/docs/archive/v1_4/v1_4_2_IMPL_GUIDE.md`        | **Create**   | New plan        |
| `assets/docs/archive/v1_4/v1_4_2_IMPL_STEPS.md`        | **Create**   | New checklist   |
| `assets/docs/archive/v1_4/GA4_KPIS_AND_ADVERTISING.md` | **Create**   | Post-launch     |
| `assets/docs/EVERLASTINGS_STORE.md`                    | **Update**   | Refresh         |
| `README.md`                                            | **Update**   | Refresh         |
| `assets/docs/BRAND.md`                                 | **Update**   | Email templates |
| `assets/docs/PRODUCT_PROTOCOL.md`                      | **Update**   | Shipping flow   |
| `assets/docs/archive/v1_3/v1_3_1_IMPL_GUIDE.md`        | **Archived** | Historical      |
| `assets/docs/archive/v1_3/v1_3_1_IMPL_STEPS.md`        | **Archived** | Historical      |

**Also deferred to separate follow-up session** (per Sean's note): launch a fresh-context Explore agent to sweep all docs for consistency after this session wraps. Tracked as a TODO at the end of the new IMPL_GUIDE.

---

## Research Findings (inform decisions below)

### Stripe Coupons & Promotion Codes (CRITICAL)

Sean's concern is valid: `duration: once` is a **subscription** concept and is mostly irrelevant for our one-time payments. The controls that actually matter for us:
- **`max_redemptions`** on a coupon — total redemptions across all customers combined
- **Promotion codes** (separate objects) layered on a coupon — each code has its own `max_redemptions` and `expires_at`
- **`restrictions.first_time_transaction`** / per-customer limits on promotion codes

**Correct pattern for Everlastings** (one-time payments, every code must be single-use per user):
1. Coupon object = the discount rule (10% off, 5% off). **No `max_redemptions` on the coupon itself** — that would cap total usage globally.
2. At the moment of the trigger (409 conflict, newsletter signup), we **generate a unique promotion code via the API** with `max_redemptions: 1` and `expires_at: now + 30 days`.
3. That code is emailed to the user. Once used, it's dead.

This is the pattern v1.3.1 already uses for cart-recovery. We extend the same pattern to the newsletter/contemplation popup (current v1.3.1 note mentions it but doesn't spell it out). The "duration: once" phrasing in Stripe-setup checklists is misleading and gets removed.

### Supabase Free Tier (2026)

- DB password **is required** at project creation — Sean saw this correctly. Current docs skip over it.
- Free tier: up to 2 active projects, 500MB DB, no credit card, commercial use allowed.
- Project URL has the form `https://[project-ref].supabase.co` — **you cannot change the ref**; the slug is generated. Custom-domain mapping to a Supabase project is a paid-plan feature ($25/mo Pro). For v1 we stay on the generated URL (the URL is only hit server-side by our Vercel functions — it isn't user-facing).

### Cloudflare R2 Custom Domain (2026)

- Must use a domain managed by Cloudflare DNS (fine — `everlastingsbyemaline.com` is already there).
- Flow: R2 bucket → Settings → Public access → Custom Domains → **Connect Domain** → enter `cdn.everlastingsbyemaline.com` → Cloudflare auto-creates the CNAME.
- **Our current checklist is half-right** ("Add CNAME manually") but skips the R2-side "Connect Domain" click. Correct sequence: R2 Connect Domain → Cloudflare auto-creates DNS → wait for Active.

### Shipping + Tracking Email Pipeline

For a low-volume artisan brand (expected: a few labels/month), **Shippo Starter (free, 30 labels/month, branded tracking pages + email notifications built in)** is the right pick. Pirate Ship is cheaper per label but doesn't do branded customer emails — we'd have to build that ourselves. Shippo's free tier covers Emy's expected volume and gives her automated tracking emails for free.

**v1 scope** (build) vs **post-launch scope** (integrate):
- **v1 build**: Admin UI shows Emy a "Ship this order" panel per unshipped order with customer address + "Mark as shipped" form (paste tracking number + carrier). On submit → write tracking to orders table → send a tracking email to the customer via Resend (free tier: 3k emails/month, no credit card) using a branded template.
- **v1 build (lighter alt)**: Skip custom tracking email — Emy generates label in Shippo UI → Shippo sends the tracking email → Admin UI is just "paste tracking number so we have the record." Cheapest and simplest.
- **Post-launch**: deeper Shippo or EasyPost API integration (auto-rate shopping, label creation from admin, webhook back for delivered status).

**Recommendation** (to confirm with Sean below): lighter alt — Admin UI records the tracking number, Shippo handles the customer-facing email. Keeps v1 scope clean. Resend can be added later if Emy wants branded tracking emails from her own domain.

---

## Detailed Changes by Feedback Item

### 1. Clarity — Who does what (Sean vs agent)

**Problem**: PRE-FLIGHT vs A1 Services Setup blurs together. Sean can't tell which checkboxes are for him (dashboard clicks, service account setup, paying for things) vs the agent (file creation, SQL runs, config wiring).

**Solution in v1_4_2_IMPL_GUIDE.md + IMPL_STEPS.md**:

Restructure into three explicit phases at the top:

1. **Phase 0 — Sean's Prerequisites** (human-only; no agent involved)
   - Service account creation (Supabase project, Stripe account, Cloudflare R2, Cloudinary, GA4, Meta Business Manager, Shippo)
   - Dashboard-only clicks Emy/Sean must do (domain verification, Commerce Manager setup, live keys)
   - Choosing DB password, API key values
2. **Phase 1 — Agent-Executable Setup** (can be done by an implementation-session agent via bash/CLI)
   - `openssl rand -hex 32` for API keys
   - Creating `.env.example`, `vercel.json`, `tsconfig.json`, `package.json`
   - `git checkout -b dev`, `npm install`, `vercel dev`
   - Running Supabase SQL migrations (via `supabase` CLI or MCP server)
3. **Phase 2 — Build** (existing Track A/B/C parallel structure)

**Each checkbox tagged** with `[SEAN]` or `[AGENT]` prefix. Where a step is handoff (Sean does X in dashboard, then agent runs Y), split into two adjacent checkboxes.

**"Reference only" sections** (Git Branching Strategy, Environment Strategy, Source of Truth, Webhook Contract, Slug Rules) get pulled into a new top-level section called **"Reference Sections — Read Once, Link Back"** with a note that they aren't tasks. Cross-linked from EVERLASTINGS_STORE.md for canonical versions so the guide can stay focused on do-this-now steps.

### 2. Service Setup Depth + Research

**Supabase** — expand the A1 Supabase checklist:
- [SEAN] Create Supabase project, choose region close to Vercel deployment (us-east-1 if unsure)
- [SEAN] Set DB password — use a password manager, 16+ chars, save to 1Password/Bitwarden
- [SEAN] Note the project ref URL: `https://[ref].supabase.co` — this IS the URL (can't be customized on free tier)
- [SEAN] Copy anon key + service role key from Settings > API
- [AGENT] Add the three env vars (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY) to Vercel via `vercel env add`
- [AGENT] Run table creation SQL (either via Supabase Studio paste, or — preferred — via Supabase MCP server `apply_migration`)
- [AGENT] Run RLS policies
- [SEAN] Invite admin users via Auth > Users (dashboard only — no CLI)

**Cloudflare R2** — rewrite custom domain step:
- [SEAN] Create R2 bucket `everlastings`
- [SEAN] R2 bucket → Settings → Public access → Custom Domains → Connect Domain → `cdn.everlastingsbyemaline.com`
- [SEAN] Wait for status → Active (few minutes)
- [AGENT] Verify DNS: `dig cdn.everlastingsbyemaline.com` returns R2 CNAME target
- [SEAN] Create R2 API token (Read & Write, scoped to bucket)
- [AGENT] Add R2_* env vars via `vercel env add`

**Stripe** — clarify coupon setup (see item 11 below)

**Supabase MCP delegation** — add a note in the new IMPL_GUIDE: if the implementation agent has the Supabase MCP server connected (we see it in this session: `mcp__claude_ai_Supabase__*`), it can run migrations, create branches, deploy edge functions, etc. programmatically. Same for Stripe MCP (`mcp__claude_ai_Stripe__*`). The IMPL_GUIDE should prefer MCP-driven setup where available and fall back to dashboard clicks only where MCP doesn't cover it.

### 3. Post-session Consistency Agent

Add a final checklist item at the end of v1_4_2_IMPL_GUIDE.md:
> **After v1.4.0 lands**: spawn a fresh-context Explore agent with the prompt "Read all of `assets/docs/**/*.md`, identify any references to deprecated file paths, stale version numbers, outdated table counts, or contradictions between docs. Report — don't fix." Sean reviews the report and drives targeted fixes.

This is a session-closing task, not part of this v1.4 plan itself.

### 4. Shop — No Filter Results

**Current wording (line 2789)**: "Shop — No Filter Results" / "No havens match your search."

**Fix**: rename to **"Shop — Filter Returned Zero Matches"** to make clear this only fires when the user has actively filtered *and* the filtered set is empty. Also add explicit separate state:

|     | State                               | Trigger                                                     |
| --- | ----------------------------------- | ----------------------------------------------------------- |
| 1   | Shop — Loading                      | Initial fetch                                               |
| 2   | Shop — No Products at All           | DB returned 0 products                                      |
| 3   | Shop — All Products Sold            | All products where `available = false` AND no filter active |
| 4   | Shop — Filter Returned Zero Matches | User-applied filter returns 0                               |
| 5   | Shop — Fetch Failed                 | Supabase error                                              |

User Sees: 
1. Skeleton shimmer
2. "New havens are being crafted. Check back soon."
3. "Every haven has found its home. Join the Firelight Council for first look at new arrivals." + newsletter input
4. "No havens match your search." + "Clear filters" button
5. "Havens are resting. Please refresh."

### 5. Stripe Receipts + Shipping/Tracking Email Pipeline

**Stripe receipts — confirm setup**:
- In A1 Stripe checklist, add: `[SEAN] Dashboard > Settings > Emails > toggle ON "Successful payments" and "Refunds"`. Note that receipts use Stripe default template — order items + amount. Good enough for v1 (confirmed with Stripe docs: the `checkout.session.completed` flow produces a receipt when this toggle is on, no custom work).

**Shipping flow — NEW section in IMPL_GUIDE**:

Add a new major section: **"Shipping + Order Fulfillment Pipeline"** (between Webhook Contract and 409 Conflict sections).

**Data model additions** (amend orders table):
```sql
ALTER TABLE orders ADD COLUMN tracking_number text;
ALTER TABLE orders ADD COLUMN tracking_carrier text;       -- 'USPS' | 'UPS' | 'FedEx'
ALTER TABLE orders ADD COLUMN shipped_at timestamptz;
ALTER TABLE orders ADD COLUMN delivered_at timestamptz;    -- post-launch, via Shippo webhook
```

**Emy's fulfillment flow** (v1):
1. Purchase completes → webhook fires → order record created
2. Admin UI `/admin/orders` shows **"Needs shipping"** tab with unshipped orders
3. Each order card shows: customer name, email, shipping address (copy-to-clipboard button), item photo + title, order total
4. "Mark as shipped" form: tracking number, carrier dropdown, ship date (default: today)
5. On submit → PATCH /api/orders/:id → updates orders table → triggers **customer tracking email** via Resend API
6. Customer receives: "Your haven is on its way" with tracking number + carrier website link
7. Admin UI order moves from "Needs shipping" → "Shipped" tab

**Shippo usage** (Emy's side — outside the code):
- Emy pastes the shipping address from admin UI into Shippo (free tier, up to 30 labels/month)
- Shippo prints the USPS/UPS label + gives her a tracking number
- Emy copies tracking number → pastes into admin "Mark as shipped" form

**New API endpoints**:
- `GET /api/orders` (PRODUCT_API_KEY or admin-authenticated) — returns orders with shipping status
- `PATCH /api/orders/:id` — updates tracking; fires tracking email
- New env var: `RESEND_API_KEY` (free tier, 3k emails/month, no credit card)

**New email templates** (Resend):
- Tracking email (when Emy marks shipped)
- Newsletter welcome email with 5% coupon (fires on newsletter signup)
- Cart recovery coupon email (fires on 409 recovery, delivers promo code)

**BRAND.md addition**: email voice guidelines + template copy for the three emails.

**Post-launch upgrade path**:
- Shippo API integration: Emy creates label from admin UI (skip Shippo UI entirely)
- Shippo webhook → auto-update `delivered_at`

### 6. Address Validation Errors

**Current gap**: no address-validation error states documented.

**Fix — add to Error States Reference**:

|     | State                                  | Trigger                                                     |
| --- | -------------------------------------- | ----------------------------------------------------------- |
| 1   | Checkout — Shipping address incomplete | Stripe Elements reports missing required field              |
| 2   | Checkout — Address not deliverable     | Stripe/carrier reports invalid zip or unrecognized address  |
| 3   | Checkout — Restricted country          | Customer selects country not in `allowed_countries: ['US']` |
| 4   | Checkout — Billing address mismatch    | (If using separate billing — Stripe handles internally)     |

Note: Stripe Checkout Custom UI handles most address validation via the AddressElement. Our role is to catch the edge cases Stripe surfaces (via `checkout.on('change')` event) and display them in our own error area, not to reimplement address validation.

User sees: 
1. "Please complete your shipping address." + highlight missing field
2. "We couldn't verify this address. Please double-check."  
3. "We currently only ship within the United States. Contact us for international inquiries." + link to /contact.html
4. Stripe default messaging

### 7. GA4 Email Capture — All Signup Sources

**Sean's concern**: `email_cta_capture` covers the CTA-driven captures (product interest, exit intent, contemplation). What about emails captured at purchase (the subscriber source = 'customer' linkage)?

Fix to clarify **GA4 Event Inventory**: 
  - `newsletter_signup` - Footer/homepage newsletter form, commissioned form subscribe checkbox, welcome flow - `{ source }`
  - `email_cta_capture` - The three modal CTAs (product-interest, cart-exit, contemplation-offer) - `{ source, slug? }`
  - `purchase` - Successful checkout - (existing items array) — customer email is implicitly captured into `customers` table via webhook, but we **don't fire a separate event** because `purchase` already captures the conversion

**New event to add**: `customer_email_linked` (fires when webhook detects a subscriber email matches a purchase email, i.e., the 'customer' source transition). Params: `{ previous_source }`. This lets GA4 show "what % of newsletter subscribers eventually buy."

This closes the gap: every email capture point is tracked via exactly one event, and subscriber-to-customer conversion gets its own event.

### 8. GA4 KPIs + Advertising Pitch Doc (NEW)

**New doc**: `assets/docs/archive/v1_4/GA4_KPIS_AND_ADVERTISING.md`

**Purpose**: Sean's ongoing-contract sales asset. When the build launches, hand this to Emy as "here's how we know it's working + why you should invest in paid media."

**Outline**:
1. **Executive summary** — "A beautiful storefront without traffic sells nothing. Here's what we measure and why."
2. **The KPIs we already track**
   - Every funnel stage, from `page_view` → `view_item` → `add_to_cart` → `begin_checkout` → `purchase`
   - Email capture: `newsletter_signup`, `email_cta_capture`, `customer_email_linked`
   - Engagement: `gallery_open`, `video_play`, `search_filter`, `scroll_depth` (automatic)
   - Attribution: UTM tags on every ad URL, Meta Pixel browser + CAPI server-side
3. **What you can answer with this data**
   - "Which products actually sell vs. just get views?" (view_item → purchase conversion per product)
   - "Where do my best customers come from?" (traffic source attribution)
   - "Is my email list growing quality subscribers?" (subscriber → customer conversion rate)
   - "Does this Instagram campaign pay for itself?" (ROAS by campaign)
4. **Why advertise — the real numbers** (web-researched):
   - Average organic reach on Instagram for small accounts: ~1-5%
   - Average paid conversion rate for DTC artisan/home goods: ~1-3%
   - Ad spend ROAS benchmarks (Meta, Pinterest) for handmade/art categories
   - The compounding effect: retargeting converts at 3-5x higher than cold traffic (requires Meta Pixel — already built in)
   - What $100, $500, $2000/mo ad budgets typically produce at this product price point
5. **Concrete first 90 days plan**
   - Month 1: Retargeting only (people who viewed products but didn't buy) — lowest-cost, highest-ROAS
   - Month 2: Add lookalike audiences from customer list
   - Month 3: Scale winning ads, kill losers
6. **Why this is not optional**
   - Artisan brands that rely purely on organic: plateau at ~1-2 sales/month
   - Same brand with $500/mo ad spend: typically 5-10 sales/month at the $200-400 price point
   - Data-backed, not hype-driven

**Target length**: 6-10 pages. Professional, no fluff, charts/numbers where possible. Written like a consulting brief, not a sales pitch.

**Research still needed during implementation**: actual current benchmarks for DTC artisan goods. I'll include source URLs.

### 9. Related Products in 409 Recovery Modal

**Current Step 1 modal** (line 2627) offers discount + email + continue-with-remaining. Add:

**Step 1a — After sold items are removed**: Below the email form, show 2-3 "You might also love" product cards pulled from same `series` (or `product_type` if no series match). Cards are small, horizontal scroll on mobile, click → navigate to product page (with email form kept persistent across navigation via sessionStorage).

HTML sketch:
```html
<div class="recovery-related">
  <p class="related-heading">While you're here — these havens still await:</p>
  <div class="related-cards-mini">
    <!-- 3 cards, same series or type, all available -->
  </div>
</div>
```

Backend: extend `/api/cart-recovery` response to include `related: Product[]` based on the `unavailable` items' series/type, filtered by `available = true`.

### 10. Checkout Flow Redesign (MAJOR — addresses UX shock) — CONFIRMED with Sean

**Sean's key insight**: running the availability check at the "Pay" moment means a user fills out card + address, then gets 409'd. Terrible UX.

**Sean's confirmed mental model** (from AskUserQuestion notes):
> "We don't want the user to have to put in any address details or payment details before we check for item availability. /cart URL lets them see items + cost estimate, hit CHECKOUT button to confirm availability first, then start the Stripe session and progressive disclosure continues from there."

**Implemented flow** (aligns exactly with Sean's model):

```
/cart.html                               /checkout.html                             (same URL, stages unlock)
─────────── [CHECKOUT button]            ───────────── [PAY BUTTON]                 ─────────────
Page 1: CART                             Page 2: CHECKOUT (info + pay)              No separate route
- Line items                             Stage A (shown first):                     Stage B unlocks when
- Quantity, cost estimate                - Email + Name (prefilled from cart)       Stage A valid:
- Email + Name                           - Billing address                          - Payment Element
                                         - Shipping address (+ "same as" chk)       - "Confirm & Pay" button
- "CHECKOUT" button                      Stage A submit creates Stripe session
  ↓ fires POST /api/checkout/reserve
    (availability check + hold,
    NO PII collected yet)
  - If any sold → 409 recovery
    overlay STAYS ON /cart.html
    (user hasn't entered any PII)
  - If all available → navigate
    to /checkout.html with hold token
```

Why this wins: availability is confirmed before the user types a single address character. The 409 recovery flow happens on the cart page (where they only have item data and optionally email/name) — zero UX shock. Stripe session isn't even created until Stage A completes, so we don't waste sessions on users who bail at the "sold out" step.

**Availability check timing** — this is the clever bit:

1. **Page 1 → Page 2 transition** (`Continue to Checkout` click):
   - Fire `POST /api/checkout/reserve` with cart items
   - Server: check availability. If any item sold → 409 → show recovery modal *on the cart page* (before user entered any PII)
   - If all available → create a **soft hold** in the new `cart_holds` table (see schema below) with 15-minute TTL → proceed to page 2
   - Also fires `begin_checkout` GA4 event + `InitiateCheckout` Meta
2. **Page 2/3** — Stripe session created when user starts filling out; hold is refreshed on any user interaction
3. **"Confirm and Pay" click** — Stripe `actions.confirm()` runs. The availability was already verified at Page 1 entry and has been held since. No shock.
4. **Hold expiry** — if the user sits on the info page for 15+ minutes and the hold expires AND someone else triggers a hold or buys → user sees "Your timer ran out — please refresh" (rare, acceptable UX since they were idle).

**The soft-hold table** (new, #8):
```sql
CREATE TABLE cart_holds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,                -- browser session (localStorage)
  product_id uuid REFERENCES products(id) NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON cart_holds (product_id, expires_at);
```

**Availability-check logic** (modified):
```sql
-- A product is available if:
-- 1. available = true AND quantity > 0
-- 2. AND there is no active cart_hold for this product by a DIFFERENT session
SELECT * FROM products p
WHERE p.id IN (...)
  AND p.available = true
  AND NOT EXISTS (
    SELECT 1 FROM cart_holds h
    WHERE h.product_id = p.id
      AND h.session_id != $currentSession
      AND h.expires_at > now()
  );
```

**Email/Name carry-over**:
- Page 1 Cart captures `email` + `name` into sessionStorage on button click
- `POST /api/checkout/reserve` also upserts a subscriber record with `source: 'checkout-started'` (captures email even if they never complete!)
- Page 2 Stripe Elements prefilled via `customer_details` param in the session create call

**New files / endpoints**:
- `api/checkout/reserve.ts` — availability + hold creation (+ email capture)
- Modify `api/checkout.ts` (the session-creation endpoint) to accept pre-captured email/name
- `api/cleanup-holds.ts` — cron endpoint to delete expired holds (or handle inline)

**What the user sees on 409 on Page 1** (the new spot): the same warm recovery overlay (now also with related products per item 9), but they haven't entered any card data yet — much less painful.

### 11. Coupon Mechanics (MAJOR)

**Correct the A1 Stripe checklist**:

Replace both coupon checkboxes:

```
- [ ] [SEAN] Dashboard > Products > Coupons > Create coupon:
    Name: "Haven Finder Apology"
    Discount: 10% off
    Duration: Forever (this is a one-time-payment coupon, not subscription)
    Max redemptions: LEAVE BLANK (we control redemption via dynamic promotion codes)
    Apply to: All products
    Coupon ID: cart-recovery-10
- [ ] [SEAN] Dashboard > Products > Coupons > Create coupon:
    Name: "Welcome to the Firelight Council"
    Discount: 5% off
    Duration: Forever
    Max redemptions: LEAVE BLANK
    Coupon ID: newsletter-welcome-5
```

**Clarify the flow in a new "Coupon + Promotion Code Strategy" section**:

> The coupon object in Stripe is the **discount rule**. It's never exposed to users directly. Every time we want to give a user a discount, we call `stripe.promotionCodes.create({ coupon: 'cart-recovery-10', max_redemptions: 1, expires_at: now + 30d })` which generates a **unique redeemable code** (e.g., `HAVEN-A9X2P7`). That code is emailed to the user. Once redeemed, it's dead. If we only had the coupon with `max_redemptions: 1`, the *entire* coupon would be spent after one use — not what we want.

**Email delivery** — add two new endpoints + Resend templates:
- `api/cart-recovery.ts` — existing — ALSO sends an email via Resend with the generated promo code (not just displays it in the popup)
- `api/subscribe.ts` — when source is `contemplation-offer`, also generates a promo code, stores it on the subscriber record, and emails it as part of the welcome email. Other sources (footer, homepage) get the welcome email WITHOUT a code (they're opting in, not in an exit situation).

**Subscriber table amendment**:
```sql
ALTER TABLE subscribers ADD COLUMN promo_code text;
ALTER TABLE subscribers ADD COLUMN promo_code_expires_at timestamptz;
```

This way if a user loses their email, admin can look up the code. Also prevents issuing duplicate codes if they submit the form twice.

### 12. Placeholder Content Management

**Problem**: Track B builds with placeholders; Track C replaces with real data. How do we make sure nothing slips through?

**Solution**: introduce a **`<!-- PLACEHOLDER: ... -->`** convention for all hardcoded content.

In v1_4_2_IMPL_GUIDE.md add a **"Placeholder Hygiene"** section:

1. Every piece of hardcoded demo content in Track B is wrapped in an HTML comment tag:
   ```html
   <!-- PLACEHOLDER: product-title -->
   <h1>The Sunkeeper</h1>
   <!-- /PLACEHOLDER -->
   ```
2. For CSS content (background images, etc.): `/* PLACEHOLDER: hero-bg */`
3. For JS: `// PLACEHOLDER: sample-cart-data`
4. Track C first task: `grep -rn "PLACEHOLDER" .` → single source of truth for everything that must be replaced. No guesswork.
5. At end of Track C: same grep must return zero results before C4 ships. Add as explicit C4 checkbox.

This is lightweight, zero tooling needed, works across HTML/CSS/JS, and gives Sean a one-command audit.

---

## Critical Decisions — CONFIRMED with Sean

1. **Shipping email path** (CONFIRMED): Emy uses Shippo UI for labels → admin UI records tracking number → we send branded tracking email via Resend free tier. Proceed.
2. **Address validation scope**: rely on Stripe Custom Checkout's AddressElement to handle most validation, with our error catch-all for edge cases in Error States Reference. No paid validation libraries for v1.
3. **Checkout flow** (CONFIRMED): /cart.html captures optional email/name and runs availability check on [CHECKOUT] button press. On success, /checkout.html uses single-URL progressive disclosure (info stage → payment stage). See item 10.
4. **KPI doc scope** (CONFIRMED): 6-10 page consulting brief with real benchmarks and sourced URLs.

---

## Execution Order

The IMPL_GUIDE and IMPL_STEPS will be written together as the core deliverable. Other docs are incremental updates.

1. **Write** `v1_4_2_IMPL_GUIDE.md` — derived from v1_3_1_IMPL_GUIDE.md, with all 12 feedback items integrated. Renumber ARs as needed (adding new ones for shipping pipeline, soft-hold, email templates → probably ARs #28-32). Update version header, creation date, "Previous: v1.3.1".
2. **Write** `v1_4_2_IMPL_STEPS.md` — derived from v1_3_1_IMPL_STEPS.md, restructure into Phase 0 / Phase 1 / Phase 2, tag every checkbox `[SEAN]` or `[AGENT]`.
3. **Write** `GA4_KPIS_AND_ADVERTISING.md` — new doc, requires web research on DTC artisan benchmark data.
4. **Update** `EVERLASTINGS_STORE.md`:
   - Bump version to v1.4.0, update date
   - Add `cart_holds` + amended `orders` columns to schema section
   - Add shipping pipeline to architecture diagram
   - Add `RESEND_API_KEY` to env vars table
   - Fix dated references Sean noticed
5. **Update** `README.md`:
   - Change doc paths to v1_4
   - No code changes; just pointer refresh
6. **Update** `BRAND.md`:
   - Add "Email Voice" subsection with template copy for: tracking email, newsletter welcome + coupon, cart recovery coupon
7. **Update** `PRODUCT_PROTOCOL.md`:
   - Note that shipping_details (text array) is displayed on product page; no new required fields
   - Spot-check for any stale references

---

## Critical Files to Reference When Writing

- `assets/docs/archive/v1_3/v1_3_1_IMPL_GUIDE.md:1-2897` — base for v1_4 (entire file)
- `assets/docs/archive/v1_3/v1_3_1_IMPL_STEPS.md:1-380` — base for v1_4 steps
- `assets/docs/EVERLASTINGS_STORE.md` (729 lines) — partial updates
- `assets/docs/BRAND.md` (357 lines) — email voice addition
- `assets/docs/PRODUCT_PROTOCOL.md` (394 lines) — consistency check
- `assets/docs/archive/v1_4/FEEDBACK_FROM_v1_3_1.md` — the source of truth for this session

---

## Verification

After updates, these must all be true:
1. `v1_4_2_IMPL_GUIDE.md` exists, `v1_4_2_IMPL_STEPS.md` exists, both reference v1.4.0 version
2. Every checkbox in IMPL_STEPS is tagged `[SEAN]` or `[AGENT]`
3. Phase 0 / Phase 1 / Phase 2 structure is explicit
4. Checkout flow is documented as three progressive screens (cart → info → pay) with soft-hold mechanism
5. `cart_holds` table is in schema section (8th table)
6. `tracking_number`, `tracking_carrier`, `shipped_at`, `delivered_at` columns added to orders
7. Stripe coupon setup uses `Duration: Forever` and `Max redemptions: blank`; promotion code pattern documented
8. Address validation error states present in Error States Reference
9. Related products section present in 409 recovery UX
10. `GA4_KPIS_AND_ADVERTISING.md` exists with 6 sections, sourced with URLs
11. `PLACEHOLDER` tagging convention documented in a named section
12. New events: `customer_email_linked` defined
13. Resend integration documented: env var, 3 email templates, API endpoints
14. `EVERLASTINGS_STORE.md` header version is v1.4.0 with today's date (2026-04-16)
15. `README.md` doc paths point to v1_4
16. `BRAND.md` has email voice section with the three template copies
17. Post-session consistency-sweep agent task recorded at end of IMPL_GUIDE
18. No remaining mention of `v1_3_1_IMPL_GUIDE.md` as the primary source in any updated doc
