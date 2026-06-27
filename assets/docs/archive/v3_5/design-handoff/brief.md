# Content Creator Portal — Design Brief (for Claude Design)

You are designing the **Content Creator Portal** — the dashboard a solo artist-maker uses to run a small, high-craft online store of one-of-a-kind handmade pieces ("havens" — miniature dioramas). The same store is also run by chatting with a Custom GPT; this portal is the by-hand companion and **must stand fully on its own** (every capability, in case the assistant is down). It will also be **sold as a reusable template**, so it is part of the sales surface a buyer judges.

**Your job:** design **all five surfaces** as polished, mobile-first, **vanilla HTML/CSS/JS** pages, in **one variation**, matching the aesthetic anchor. You may do one surface at a time — finish each before moving on. **Do not** modify or integrate any application code; this folder intentionally has none. Output goes to `out/` for a separate gap-review + integration pass.

---

## 1. The thesis (read this twice)

**The innovation is the simple, entropy-lowering details — not novel components.** The valuable, original ideas here are *small*: a per-row LED that tells you a piece's state at a glance, a field-border that rings green/red/yellow, a hard toggle for "available," a preview you can hit at any moment. Once those entropy-lowering details are in place, **wrap them in tried-and-true, familiar layouts** — a spreadsheet of rows, plain form fields. We are **not** reinventing the wheel on layout. Webflow's CMS is the structural reference (rows that expand into simple forms) — but ours is brighter, color-coded, and more considered.

A previous design pass over-innovated on *layout* (product tiles, fields crammed into nested components, dropdowns inside cards) and it raised cognitive load instead of lowering it. **That is the failure mode to avoid.** When in doubt, choose the calmer, more familiar layout and let the small color/toggle/preview details do the innovating.

---

## 2. The aesthetic anchor — `controls.html`

Open `controls.html` in this folder. **This is the look.** Its typography, spacing, container treatment, blending, and especially its **navigation** are the gold standard — match them exactly. `tokens.css` holds its exact token values (OKLCH color system, type scale, radii, shadows, motion) — lift them, don't approximate.

- The **feel** is *weight, not bounce*: every control answers a tap with the same crisp, quiet gesture (a 1px sink, a collapsing shadow, an instant focus ring) — never a spring or overshoot. Keep this.
- The **nav** in controls.html is "picture perfect" — reuse it as the portal's nav system.
- Honest depth (layered cool shadows), hairline borders, generous whitespace, near-monochrome indigo-slate with color reserved strictly for state. No heavy glassmorphism, no `backdrop-filter`, no gradients-for-show.

> This portal palette is deliberately a cool indigo-slate, **distinct from the storefront's warm-plum brand** — the portal is a reusable template, not the Everlastings brand. Keep that separation.

---

## 3. KILL list (do not produce these)

These come from direct review of the over-innovated pass. The annotated `reference/` shots show each.

- **Product tiles.** No image-led card grid for products. A product is a **row** (see §5.1). (`reference/vCCP-3-1.jpg`)
- **Components-inside-components / dropdowns-inside-cards.** You have a whole page — give each field clear space and an obvious label. No cramming fields into nested widgets. (`reference/vCCP-2-2.jpg`)
- **Redundant color *text tags*.** Do NOT print "LIVE NOW" / "WAITING" labels next to fields. That's "underlining and bolding the same word." Encode state with **color alone** — a field-border ring, a row LED. (`reference/vCCP-1-3.jpg`, `vCCP-1-2.jpg`)
- **Words inside state pills.** A pill/LED is just color. Green = live, red = draft, yellow = needs-publish. No label. The user learns it in 2–3 clicks (or asks the GPT). Explain it nowhere. (`reference/vCCP-1-8.jpg`)
- **Oversized mobile fonts + wasted space.** Mobile type is currently far too big. Go **small and dense — New York Times scale** (`reference/vCCP-1-2-example.jpg`). Every pixel earns its place.
- **The portal-name header** ("Content Creator Portal" top-left). Wasted space — we don't brand the portal in its own chrome. Drop it.
- **Multi-click state changes** and **helper text stacked under fields** (see §4 for the replacements).

---

## 4. Refinements carried from the keeper (controls.html)

controls.html is excellent but needs these adjustments:

- **Form fields:** make them **full-width with room to breathe** so a long title never truncates mid-word (it currently hides "The Lantern-Keeper's W…"). Don't reserve oversized width for short values like price. (`reference/vCCP-1-1.jpg`, `vCCP-1-2.jpg`)
- **Field state → a colored ring on the field border itself**, not a tag beside it:
  - **green ring** = required field with valid input / good to go
  - **red ring** = this field is blocking publish (required + missing/invalid)
  - **yellow ring** = edited text that needs review before re-publishing
- **Helper text → tooltip on the field heading.** All the little "this changes the shop price the moment you save it" hints currently sitting under fields should instead appear as a **context tooltip when you hover the field label (desktop) or tap it (mobile)**. Keep the field area itself clean. (`reference/vCCP-1-4.jpg`)
- **Toggles** ("Available", and add **"Featured"**) are great — keep them exactly. Green = on / in the shop. (`reference/vCCP-1-5.jpg`, `vCCP-2-1.jpg`)
- **Mobile font:** much smaller, NYT-dense.

---

## 5. The five surfaces

The portal's nav (from controls.html) covers: **Products · Orders · Sales · Account**. Search/filter live *inside* each surface, never global.

### 5.1 Products — the spreadsheet (the heart)

One **row per product**, like a bright, color-coded Webflow CMS list (`reference/vCCP-example-all-products-rows.jpg`). Not tiles.

- **Row columns (desktop):** a **state LED** (the single colored dot at the front — green live / red draft / yellow edits-need-publish) · a **very small checkout image** thumbnail · **title** · (the **slug** is useful to show) · **price** (editable inline, right on the row) · **stock/quantity** · an **Available** toggle · a **Featured** toggle · an **archive** action. The user can flip Available, flip Featured, edit price, or archive **without opening the product**.
  - Flipping **Available back on** from the row should **prompt about adding stock** (quantity) if it's zero.
- **Tabs/filters at the top:** **Live · Drafts · Sold · Archived · All.** Sold and Archived are reached *here* — they are **not** encoded as row colors (only live/draft/edits get an LED color; sold/archived rows are simply filtered to their tab). Default tab = Live.
- **Row click → the row expands into the editor** (§5.2). The exact mechanic is yours to choose (inline accordion expand vs. a master-detail panel/page), but the row's **Available/Featured toggles and state stay visible/pinned** as it expands.
- Empty states: "no pieces yet" and "nothing matches this filter."
- **Mobile:** the row collapses gracefully to a dense, tap-friendly list item — still a row, never a tile. This is the **primary context** (see §6).

### 5.2 Product editor — simple fields, generous space

When a row expands, you get the full edit surface: **plain, well-spaced form fields and dropdowns**, grouped into sections (`reference/vCCP-example-fields-expanded-product-entry-row.jpg`). No nested component widgets. The complete field set + which are live vs staged is in **`data-flow.md` §Products** — design must accommodate all of it. Key behaviors:

- **Two speeds, taught by color, not words.** Some fields apply to the shop **instantly when saved** (price, quantity, available); the rest (wording, photos, SEO) are **staged and go live on publish**. Make this legible through the field rings + grouping (e.g. the instant-commerce fields visually grouped/pinned), **never** the words "draft/staged/live."
- **Preview at ANY time.** The user must be able to hit **Preview** mid-new-draft, mid-edit, or while looking at an archived piece. **Preview is the visual** — this is exactly why the product list doesn't need image-heavy tiles. Make Preview always reachable.
- **Publish** is always visible and conditionally enabled; if something required is missing, the blocking fields ring **red** and the control says what's missing (in plain maker's language, not "field required").
- **Label controls by the action** they actually perform (a live price change is not "Save draft").
- **After saving, keep the user on the piece** — don't eject them to the list.
- **Media leads with upload, but shows small.** Provide labeled role slots (hero, gallery, detail, thumbnail, share/SEO, checkout image, video) — uploading is the obvious first action; pasting a URL is secondary. Display uploaded media as **small clickable thumbnails** that open the full asset on its CDN URL in a new tab (you don't need a big gallery in the editor). Show coverage at a glance (e.g. "hero ✓, gallery 5/5"). A small checkout-image thumbnail can also appear on the product row.
- **Lifecycle the editor supports:** discard pending edits (revert to live); archive / resurface; **relist a sold piece as a first-class action** (not a side effect of a refund); **stretch goal:** schedule a publish for a future date/time (this also makes the portal repurposable as a content engine — a selling point).
- Some fields **lock once the piece first goes live** (slug; checkout name/description/image) — show them locked, not missing.

### 5.3 Orders — a CRM (think *people*, not products)

Reframe orders around the **buyer as a person**. A purchase can hold **several pieces under one payment**.

- Views: **Needs Shipping · Shipped · All**; search by email / order / tracking.
- Per order/person: buyer (name, email, phone), the piece(s), amount, shipping address (with a copy-address affordance), tracking status.
- **Mark shipped:** carrier (USPS/UPS/FedEx/DHL) + tracking number → this **emails the buyer** automatically. Show whether the email sent (a small sent/unsent pill), allow resending.
- **Refund** (where confusion lives — make it legible): one payment, multiple pieces. Let the user pick which piece(s) to refund, refund a partial/goodwill amount, and choose **per piece whether to relist it**.
- **New-order signal:** a **faint, noticeable flashing-orange** behind the Orders tab when a new order arrives.
- *Forward-looking (design may hint, build won't block — no data source yet):* indicators for "buyer emailed back" or "payment problem." Treat as future affordances, not required now.

### 5.4 Sales (coupons / discounts) — plain money

- **Create a sale:** percent-off or dollar-off; optional shareable code (or auto-generated); whole-store or limited to chosen pieces; optional minimum order; optional end date; optional usage cap.
- **Plus (new):** an **automatic store-wide sale** that applies to everyone with **no code** (the holiday-sale case).
- **See running sales** in plain language — real money ("$25.00", "$200.00 minimum"), scope, uses, expiry — never raw numbers.
- **End a sale.**
- Render these as simple cards, reusing the same field/toggle/button vocabulary — not new component types.

### 5.5 Account / nav

- Sign in (email + password) and sign out.
- A clear **"View Site"** link back to the live storefront (makers keep wanting an exit back to the shop front).
- No portal-name branding in the chrome.

---

## 6. Mobile is the primary context — get it perfect

The maker manages the store mostly **on their phone** (the GPT is also on their phone; they open this portal only when they specifically need to *fix* something). So the mobile experience must be **excellent — no wasted space, no truncated text, NYT-small dense type, thumb-friendly**. Design **mobile-first**; desktop is the graceful adaptation. Keep **16px-minimum** on text inputs so iOS never zoom-jumps a field. Prove mobile-first by construction (one component that renders correctly in both the phone list and the desktop row), not by wrapping things in a phone mockup.

---

## 7. Deliverable

- **One variation**, all five surfaces, **mobile + desktop**, as **self-contained vanilla HTML/CSS/JS** files that open in a browser and look finished — matching `controls.html` and using `tokens.css`.
- Real tactile press/hover/focus states + `prefers-reduced-motion` support; honest, computed enable/disable (don't fake validity with CSS-only tricks where it would lie).
- Cover **every** capability in `data-flow.md`; design the **loading / empty / error / permission** states it lists, not just the happy path.
- Put output in `out/`. **Do not** wire it to a backend or modify any app code — a separate gap-review + integration pass handles that.

When you start, it helps to confirm the read order: **this brief → `data-flow.md` → `controls.html` + `tokens.css` → `reference/`.** If you'd vary on an axis, the one that matters is overall IA/flow per surface; visual treatment should stay locked to controls.html.
