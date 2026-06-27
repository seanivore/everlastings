# Content Creator Portal — Design Requirements Brief

The design target for the redesign of the Everlastings store's management dashboard (currently `/admin`). This brief is **self-contained**: a designer with zero prior context can produce the right thing from it. It deliberately does **not** show the current UI — design for the requirements + principles below, not for what exists.

---

## 1. What this is + who it's for

The **Content Creator Portal** is the dashboard a maker uses to run a small, high-craft online store of **one-of-a-kind pieces** (handmade miniature dioramas — "havens"). It is the by-hand companion to an AI assistant: the same store can be run by chatting with a Custom GPT *or* in this portal, and **the portal must stand fully on its own** (every capability, in case the assistant is ever down).

**Primary user:** a solo artist-seller. Not a developer, not a trained operations employee — a creative person who wants to list a piece, price it, send an order on its way, run a sale, and watch their shop, without touching code or learning jargon.

**Primary context: mobile, in the studio.** Their real workflow is on a phone with a piece in hand — photograph it, write it up, list it before it sells, drop a price on the go. **Design mobile-first**; the desktop layout is the adaptation, not the other way around. (Most store dashboards treat mobile as an afterthought — owning it is the edge.)

**Second audience:** this portal is a **product**. It will be sold/shown as a reusable template, so it is part of the sales surface a buyer judges. It should make someone evaluating it think *"I want that for my store."*

---

## 2. The bar — aesthetic + principles

- **Clean, tasteful, confident — not "neutral," not loud.** The work speaks for itself: no flashy gradients-for-the-sake-of-it, no camp, no neon. Think a great résumé — restrained, considered, quietly excellent. The reference point is the **shadcn** aesthetic (that quality of clean, modern, properly-considered UI) — *the look, achieved in our stack.*
- **Tactile feedback is the priority.** Every button, toggle, and control must **visibly respond** to interaction (press states, hovers, focus, state transitions, micro-motion). The failure mode to design out: a user clicks, nothing visibly happens, so they click again 10 times. The surface should *feel* responsive and physical.
- **Just enough motion + interactivity** to make it feel alive and intentional — not decorative excess. **Avoid heavy glassmorphism.**
- **Intent over data-model (the deepest principle).** Organize around what the user is *trying to do* ("Put this up," "Take it down," "Run a sale," "Send a refund," "Mark it shipped"), and hide the machinery. The user should never have to understand "drafts vs staged vs live columns" or "payment-intent-level refunds" — those are implementation details the UI absorbs.
- **Nothing hides without explaining.** If an action isn't available yet, the control still **shows** but is clearly disabled, and tells the user **why / what's missing** — never a button that silently isn't there.
- **Grounded in current (2026) design trends** — research what's fresh and what's already stale; choose deliberately, don't default to training-data habits.

---

## 3. Hard constraint — the stack

- **Vanilla HTML / CSS / JS only.** No React, no framework, no build step, no Tailwind. shadcn/ui itself is React and **cannot be used** — borrow its *design language* and implement in hand-written CSS. The research question is literally *"how do we hit that level of polish + tactility in pure CSS?"* ("rad vanilla-CSS tricks").
- **Build on the existing foundation.** The codebase has a mature CSS custom-property token system (color/space/type/radius/shadow/transition scales, breakpoints, components like buttons/cards/badges/form-fields/modals/skeletons, and `prefers-reduced-motion` support). The portal already has its **own** token set (a cool indigo-slate palette, deliberately distinct from the storefront's warm plum brand — that separation is correct and should continue: the portal is a reusable template, not the Everlastings brand). The redesign **levels up the UX, layout, components, and mobile** — it may evolve the tokens, but it should feel like a coherent design *system*, not a one-off.
- Every component concept produced must be **buildable in this stack** and openable in a browser as plain HTML+CSS.

---

## 4. Information architecture

Three working surfaces + account. Reorganize around intent:

- **Pieces** (products) — the heart. Browse the shop, create/edit a piece, manage its lifecycle.
- **Orders** — fulfillment: see what needs shipping, mark things shipped, issue refunds.
- **Sales** (coupons/discounts) — run and end sales.
- **Account** — sign in/out, and a clear **"View Site"** link back to the live storefront.

Open questions the design should answer (not prescribe): top-level nav placement (a left rail / "notebook" spine is worth exploring for desktop, collapsing to something thumb-friendly on mobile); how the three surfaces relate; how search/filter live within each.

---

## 5. Functional requirements — what the portal must do

The redesign must preserve **every** capability below (the current dashboard does all of it) while making each feel intent-first.

### 5.1 Pieces — the grid
- See every piece, each showing a thumbnail, title, price, quantity, and a **state tag**.
- **Filter by state, ordered by how often it's used:** default to **Live**, then **Drafts**, then **Archived**, with **"All" last** (rarely needed). (No standalone non-interactive "legend" — states must be self-evident.)
- Create a new piece; open any piece to edit; refresh.
- Empty states ("no pieces yet," "nothing matches this filter").

### 5.2 Pieces — the editor (the centerpiece)
A single piece has a lot of content. Group it sensibly. The full field set:

- **Identity:** title; URL slug (settable once, then locked); headline; product type; series/collection.
- **Commerce — applies instantly when changed:** price; quantity (stock); available (on/off). These go live the moment they're saved — no preview step.
- **Story & details:** description; a longer "story card"; features, materials, care instructions, shipping details (each a simple list); dimensions; weight; power supply; an artist's note.
- **Media (lead with uploading):** a hero image, a gallery, detail shots, a thumbnail, a social/share image, a square checkout image, and video clips (silent looping "GIF-like" MP4s and/or YouTube, with poster + alt + a per-clip "loops silently / click-to-play" choice). The design must make **uploading the obvious first action** (drag/drop or pick a file into clearly-labeled role slots); pasting an existing URL is a secondary path. Show coverage at a glance (e.g. "hero ✓, gallery 5/5"). When a social/share image is uploaded, it must actually populate its field.
- **Presentation & SEO:** featured-on-homepage toggle; homepage accent color; SEO title/description/share-image; checkout display name/description/image (these checkout fields **lock once the piece first goes live**).

**Lifecycle the editor must support, made intuitive:**
- **Draft → preview → publish.** A new or edited piece can be previewed exactly as shoppers will see it, then published live. Wording/photo/SEO edits **wait** for publish; price/stock/availability are **already live** (see 5.2 Commerce). The UI must make this two-speed reality obvious without using the words "draft/staged."
- **Publish must always be visible** and conditionally enabled; if something required is missing, say what.
- **Label controls by the action** they perform in context (e.g. don't call a live price change "save draft").
- After saving, **keep the user on the piece** (let them confirm), don't eject them to the list.
- **Discard** pending edits (revert to what's live).
- **Archive / resurface** (take a piece out of the shop without deleting; bring it back).
- **Relist** a previously-sold piece anytime, as a **first-class action** (not a side effect of a refund).
- **Stretch goal:** **schedule a publish** for a future date/time (this also makes the portal repurposable as a blog/content engine — a selling point).

### 5.3 Orders
- See orders in three views: **Needs Shipping**, **Shipped**, **All**; search by email / order / tracking.
- Per order: buyer (name, email, phone), the piece(s), amount, shipping address (with a copy-address affordance), and tracking status.
- **Mark shipped:** enter carrier (USPS/UPS/FedEx/DHL) + tracking number → this **emails the buyer** their tracking automatically. Show whether that email sent; allow resending.
- **Refund:** a purchase can contain **several pieces under one payment**. The refund flow must let the user pick which piece(s) to refund, refund a partial/goodwill amount, and choose **per piece whether to relist it**. (One payment, multiple pieces, partial amounts — the design must make this legible, since it's where confusion lives.)

### 5.4 Sales (coupons / discounts)
- **Create a sale:** percent-off or dollar-off; optional shareable code (or auto-generated); whole-store or limited to chosen pieces; optional minimum order; optional end date; optional usage cap.
- **Plus** (new in v3.5): an **automatic store-wide sale** that applies to everyone with **no code** (the holiday-sale case), shown on the storefront.
- **See running sales** in plain language (real money — "$25.00", "$200.00 minimum" — not raw numbers; scope; uses; expiry).
- **End a sale.**

### 5.5 Account / nav
- Sign in (email + password) and sign out.
- A clear **"View Site"** link to the live storefront.
- The product's name in the UI is **"Content Creator Portal."**

---

## 6. The concepts the design must make feel obvious

These are real behaviors the user must understand — expressed as *their* mental model, which the UI should teach implicitly:

- **"Live now" vs "Waiting to go live."** Price, stock, and on/off change instantly. Wording and photos get previewed, then published. Make the two speeds visible and unsurprising.
- **A piece has a state:** for sale, hidden draft, sold, has-unpublished-edits, archived. The current state should be obvious at a glance, everywhere the piece appears.
- **Sold is not gone.** A sold one-of-a-kind can be brought back for sale anytime.
- **A purchase can hold more than one piece** (one payment). Refunds can be for one piece or part of the amount; bringing a piece back is a separate choice.
- **Some checkout details lock** once a piece first goes live.

---

## 7. The deliverable (what the design funnel must produce)

1. **A design direction** — the look, feel, density, type, palette, and motion/interaction language — grounded in researched current (2026) trends, hitting the clean/tasteful/confident bar.
2. **An information architecture** — mobile-first — for the three surfaces, the nav, and especially the **Pieces grid + editor** (the hardest surface; design it fully, as a *system* that extends to Orders and Sales).
3. **Renderable vanilla HTML/CSS component concepts** — actual code that opens in a browser, not descriptions. At minimum: a **tactile button**, a **toggle/switch**, a **nav/tab control** (and/or left-rail item), a **text input / field**, a **product tile with a state tag**, a **state badge/pill set**, the **editor's action/publish bar** (always-visible, conditionally-enabled, explains-what's-missing), a **media upload zone**, and a **card/section** container. Each demonstrates the tactility + polish the direction promises. (These double as the "rad vanilla-CSS tricks" research.)

---

## 8. Success criteria

- **Complete:** supports every capability in §5 — nothing the current dashboard does is lost.
- **Intent-legible:** a non-technical maker can list, price, ship, refund, and run a sale without learning jargon; the two-speed publish model and the piece states are obvious.
- **Tactile + polished:** controls visibly respond; the surface feels alive, clean, and confident; no dead clicks.
- **Mobile-first:** excellent on a phone in the studio; the desktop layout is the graceful adaptation.
- **In-stack:** every component concept is buildable in vanilla HTML/CSS/JS and opens in a browser.
- **Showcase-worthy:** a prospective template buyer sees it and wants it.
