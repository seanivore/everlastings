# Review Walkthrough — v1.4.5

A step-by-step pass through the site for the design review. The thing you open and follow while clicking through pages.

**Companion doc** (you don't open this during a review): `archive/v1_4/v1_4_4_C_DESIGN_REVIEWS.md` — the architecture-level protocol that governs how feedback gets handled by the wiring agent. Named here only so you know where to look if a question crosses into territory the walkthrough explicitly defers to it.

---

## Before you start

1. **Get the current preview URL**. In your terminal:
   ```bash
   vercel ls | head -5
   ```
   Top row, copy the URL ending in `.vercel.app`. That's your `{preview URL}` for this pass.

2. **Open a fresh Google Doc** titled `Everlastings Design Review — Checkpoint {A/B/C/D}`. Add 14 page headings (one per step below). Drop the preview URL at the top of the doc so the wiring agent's next session has it.

3. **Mindset**: honest first impressions beat thoroughness. If a page is dragging on, write "feels heavy, will revisit" and move to the next step. The pass is meant to be one sitting, not one weekend.

4. **Skip anything labeled `placeholder-`**. Those are scaffolding waiting on real products from Em — not the design.

---

## How to write each note

Under the relevant page heading in the Google Doc:

> **What I see**: {one sentence about what's there now}
> **What I'd like**: {one sentence about the change}

If you can, tag the note with a `1`, `2`, or `3`:

- `1` — copy / colors / images only. Cheap to apply.
- `2` — touches the layout, buttons, or page structure. Queued for the next checkpoint boundary.
- `3` — whole-section rethink. Goes to the v2 backlog, doesn't block launch.

If you're not sure, leave it blank. The wiring agent figures it out from the description.

---

## Step 1 — Homepage

Open: `{preview URL}/index.html`

Look at:
- Hero — does it land? Is the voice right?
- Featured products strip (placeholder products are fine here at early checkpoints)
- Tagline phrasing under the hero

Capture under: **Homepage** in the Google Doc.
Done? → Step 2.

## Step 2 — Shop

Open: `{preview URL}/shop.html`

Look at:
- Product grid: spacing, photo cropping, hover states
- Filters and sort controls
- Sold-state visual (only if any product is currently marked sold)

Capture under: **Shop**.
Done? → Step 3.

## Step 3 — Product page

Open: `{preview URL}/product.html?slug={pick any product slug from the shop grid}`

Look at:
- Photo gallery — order, cropping, scroll/swipe feel
- Story copy area — does the voice come through?
- Buy CTAs — wording and placement
- Sticky right-side card (price + add-to-cart)

Capture under: **Product page**.
Done? → Step 4.

## Step 4 — Cart

Open: `{preview URL}/cart.html` (add a product to cart from Step 3 first if it's empty)

Look at:
- Line item rendering — photo, title, price, remove button
- Empty state if you remove all items
- Recovery overlay copy (only at Checkpoint C and later — skip earlier)
- "Checkout" button placement

Capture under: **Cart**.
Done? → Step 5.

## Step 5 — Checkout

Open: `{preview URL}/checkout.html` (continue from Step 4's cart with at least one item)

Look at:
- Two-stage flow — does the progression feel natural?
- Address fields — clarity, error states (try submitting blank)
- Payment fields — clean rendering of Stripe's element
- Error states — try a known-bad test card if you're at Checkpoint C+

Capture under: **Checkout**.
Done? → Step 6.

## Step 6 — Order complete

Open: `{preview URL}/complete.html` (only meaningful at Checkpoint C+ when you've actually completed a test order)

Look at:
- Success state — does it feel celebratory and clear?
- Line-item summary
- Newsletter sign-up prompt placement

Capture under: **Order complete**.
Done? → Step 7.

## Step 7 — About / Meet Emy

Open: `{preview URL}/about.html`

Look at:
- "Meet Emy" placeholder copy and photo (real version comes from Em at Checkpoint C or D)
- Origin story flow
- Mission statement placement

Capture under: **About**.
Done? → Step 8.

## Step 8 — Contact

Open: `{preview URL}/contact.html`

Look at:
- Contact form — labels, error states, submit feedback
- Commission inquiry section

Capture under: **Contact**.
Done? → Step 9.

## Step 9 — FAQ

Open: `{preview URL}/faq.html`

Look at:
- Question accuracy — does each answer match what's on the policies, shipping, and privacy pages?
- Cross-links to source-of-truth pages working

Capture under: **FAQ**.
Done? → Step 10.

## Step 10 — Policies

Open: `{preview URL}/policies.html`

Look at:
- Availability text reads cleanly (the wording is verbatim per the implementation doc — flag tone, not content)
- Cart-hold mechanics explanation

Capture under: **Policies**.
Done? → Step 11.

## Step 11 — Privacy

Open: `{preview URL}/privacy.html`

Look at:
- The three cookie categories on the page match what the cookie banner shows
- California section reads correctly

Capture under: **Privacy**.
Done? → Step 12.

## Step 12 — Shipping

Open: `{preview URL}/shipping.html`

Look at:
- US-only restriction copy
- Shipping timeline phrasing

Capture under: **Shipping**.
Done? → Step 13.

## Step 13 — Terms

Open: `{preview URL}/terms.html`

Look at:
- Effective date
- Plain-language clarity throughout

Capture under: **Terms**.
Done? → Step 14.

## Step 14 — Admin (Sean only)

Open: `{preview URL}/admin/index.html`

Walk the path:
- Log in with admin credentials
- Click "New Product" → fill the minimum fields → save
- Confirm the new product appears in the shop grid (Step 2 page) after refresh

Capture under: **Admin**.

This step is for Sean only — don't include it in any version of this walkthrough you share with Em.

---

## When something feels bigger than a note

Some kinds of feedback shouldn't get acted on inside a review pass — they need a separate conversation. If you find yourself wanting any of these, write the note in the Google Doc but flag it as **escalate**:

- A new API endpoint feels needed
- Renaming a `data-*` attribute on a page
- Changing how cookie consent behaves (default state, storage shape, or which analytics tags fire)
- Changing where photos live (Cloudinary or R2 paths)
- Changing the email-capture event flow

For the full list of "do not decide alone" items and why each one is sensitive, the design review companion doc has a section titled **"For Future-Claude — Decision Boundaries"**. You don't need to read it now — just know where to look when an escalate-tagged note comes up.

---

## When you're done with the pass

- Skim the Google Doc top to bottom — every page heading should have at least one note, even if it's just "looks good."
- Drop the Google Doc link in your handoff notes so the wiring agent's next session can pick it up.
- If many pages were heavy with placeholders, jot a one-line "real-product status: N of 14 pages had real content" at the top of the doc — useful context for whether the next checkpoint is ready or should wait on Em's loading loop.

That's it. The review pass is done.
