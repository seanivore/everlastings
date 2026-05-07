# v1.4.5 — Frontend Design Review Protocol

**Date filed**: 2026-05-06
**Version**: Update of Track C pushed v1.4.4 -> 1.4.5
**Audience**: *For Sean* (primary review loop) • *For Emaline* (later, after Sean's iterations) • *For Future-Claude* (the agent executing Track C)
**Companion to**: `v1_4_5_C_IMPLEMENT.md` (this protocol fires at Checkpoints A/B/C/D defined there)

| If you are…       | Read first                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Sean**          | §3 (your protocol), §6 (per-page review map), §8 (settled-vs-iterating ledger)                                            |
| **Emaline**       | §4 (zero-Git zero-React review path) — Sean will share this section directly when he's ready for your input               |
| **Future-Claude** | §5 (decision boundaries — what's settled, what's iterating, what to escalate) — read before any Track C execution session |

---

## §1 — Why this document exists

Track A (backend) and Track B (frontend placeholders) are complete. Track C wires them. Design feedback is inevitable mid-wire — both for Sean reviewing the design layer and for Emaline reviewing the brand voice and product presentation. This protocol keeps that feedback productive and unblocks launch.

**Critical timing point** (drives this whole document): Phase 0's Cloudinary fix unlocks Emaline's real-product loading via the Custom GPT pipeline. From that moment, two loops run in parallel:

  1. **Sean's design-review loop** — multiple rounds across Checkpoints A/B/C/D, iterating on the placeholder-and-becoming-real frontend.
  2. **Emaline's product-loading loop** — real products replace placeholders one-by-one as she creates them via the Custom GPT.

The intended outcome: by the time Emaline's design review starts (later in the process, after Sean has already iterated), the catalog is mostly real. The placeholder-only review surface is shrunk dramatically. This makes Emaline's review focused on her domain (brand voice, product presentation) rather than on disposable placeholder art.

---

## §2 — The Three Buckets

The core decision framework. Every piece of design feedback gets classified into one of three buckets. Default to Bucket 3 if uncertain — protect launch.

### Bucket 1 — v1.4.5 BEFORE wiring (parallel with Phase 0 / C1)

Copy fixes, image swaps, color tweaks within existing tokens. **Does NOT touch DOM structure or `data-*` hooks.** Lands in parallel with Phase 0 and C1. Cheap to apply.

Examples:
  - Cookie banner copy (longer/warmer vs. shorter — currently the shorter draft is shipped)
  - Button label phrasing
  - Tagline iteration in the homepage hero
  - Pre-launch placeholder testimonial copy
  - "Meet Emy" placeholder bio text

### Bucket 2 — v1.4.5 DURING/AFTER wiring (queued, batch-applied at next checkpoint)

Anything that touches `data-*` attributes, event names, or page templates Track C is actively wiring. Queued, never hot-patched. Applied at the next Design Review Checkpoint boundary (A → B → C → D), so the wiring agent isn't fighting moving DOM.

Examples:
  - Adding a new CTA on the product page (changes DOM structure)
  - Reordering checkout stages (changes the wiring contract)
  - Swapping the recovery overlay copy after the contract is wired (Bucket 1 if before C3, Bucket 2 if during/after)

### Bucket 3 — v2 facelift (logged, NOT addressed in v1.4.5)

Homepage redesign, anything tagged in `project_v2_homepage_facelift.md` memory. Logged in the v2 backlog but does not block launch.

Examples:
  - Homepage hero replaced with Claude Design animated work
  - Animation polish using the `heygen-com/hyperframes` Claude Code skill
  - A "real" carousel library replacing CSS scroll-snap
  - Image-optimization sweep (after real product photography lands)

### Decision tree (one-line for fast classification)

  > *Does this feedback require touching `data-*`, event names, or page templates?*
  > - No → Bucket 1
  > - Yes, but it's ready-now small → Bucket 2
  > - Yes AND it's a structural rethink → Bucket 3

---

## §3 — For Sean — Review Protocol

### §3.1 Per-page review pass (after each Track C checkpoint)

After C1 ships → Checkpoint A. After C2 → Checkpoint B. After C3 → Checkpoint C. After C4 → Checkpoint D. Each checkpoint is a triggered review window, not a calendar window.

For each page:
  - Open the preview URL Vercel auto-deploys from `dev`
  - Visit the page; spend ~15 minutes max — first-impression honesty matters more than thoroughness here
  - Capture observations as they arrive; classify on the fly per §2

Per-page focus areas live in §6 — that table tells you what's worth scrutinizing at this checkpoint vs. what to ignore as not-yet-wired or not-yet-real.

### §3.2 Decision matrix — classifying feedback

Use the §2 decision tree. Default to Bucket 3 if uncertain (protects launch). The Settled-vs-Iterating ledger in §8 keeps the trail.

The bias to protect: **don't open a Bucket 2 item unless the alternative is shipping something you'll regret in the first month**. Bucket 1 items batch nicely; Bucket 3 items get done properly later. Bucket 2 items are the most expensive — they interrupt wiring.

### §3.3 The two-loop expectation

You will run *several* of your own review rounds before Emaline's review even begins. This is intentional. Your loop runs in parallel with Emaline's real-product loading via the Custom GPT (which kicks off the moment Phase 0 ships). The timeline:

| Phase             | Sean's loop                        | Emaline's loop                                          |
| ----------------- | ---------------------------------- | ------------------------------------------------------- |
| Phase 0           | (waiting for Cloudinary fix)       | (waiting for Cloudinary fix)                            |
| C1 → Checkpoint A | First review pass on foundations   | Begins loading real products                            |
| C2 → Checkpoint B | Major review pass on per-page      | Continues loading; some pages now show real products    |
| C3 → Checkpoint C | Cart/checkout pass; real-card test | Catalog mostly real                                     |
| C4 → Checkpoint D | Final pass                         | Final products loaded; ready to bring her in for review |
| C5 launch         | (cutover)                          | (post-launch)                                           |

Emaline's review of `about.html` (Meet Emy copy + photo) and the cart/checkout overlay copy ("These havens have found their homes") happens at Checkpoint C earliest, more likely D — after she has the real-product pipeline working and her own voice has been
expressed through the products themselves.

### §3.4 Translating Emaline's feedback into agent-actionable language

When Emaline says something feels "off," your job is to bridge into something Future-Claude can act on. The bridge is usually one of:

| Emaline says…            | Agent-actionable form                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| "Feels too cold"         | "Shift color tokens warmer — try `--ink-hover: #X` instead of `#Y` in `assets/css/styles.css`" |
| "Photos feel cramped"    | "Tile aspect ratio change OR padding token adjustment" — name specific token if you know it    |
| "Voice is off here"      | Quote exact paragraph; reference `assets/docs/BRAND.md` voice rules; suggest/ask for rewrite   |
| "Put on left, not right" | Bucket 2 — describe layout change in `data-*` terms or page-section terms                      |

Don't ship Emaline's verbatim phrasing to the agent unless it's already concrete. The translation is your value-add.

### §3.5 Settled-vs-Iterating ledger

§8 below is the live two-column ledger. Update it as decisions land. It carries forward into v2 planning — anything that became settled in v1.4.5 should NOT be reopened in v2 without an explicit rationale.

---

## §4 — For Emaline — How to Review

  > Sean will share this section with you when the design is ready for your eyes —
  > typically at Track C Checkpoint C or D, after he has run several rounds of his own
  > review and after you have loaded real products via the Custom GPT.

### §4.1 How to open the preview link

Sean will share a link that looks like `https://everlastings-website-git-dev-everlastingsbyemaline.vercel.app/<page>`. Click it. That's the working version of the site, not the live one — it's safe to click around and even walk through the cart and checkout (don't actually pay; Sean will tell you which test card to use if you want to try the full flow).

The site has placeholder content in some places. You'll know it's a placeholder if it says `placeholder-` somewhere in a URL or a product slug, or if a testimonial reads like generic poetry rather than a real quote. Ignore those — they're scaffolding.

### §4.2 Per-page checklist (plain-language)

For each page Sean asks you to look at, scan for these six things — in order:

  1. **Does it sound like me?** Voice, tone, word choice. If anything reads "off-brand," flag it.
  2. **Are the photos representing the work well?** Cropping, color, mood.
  3. **Is what I'd want a customer to see, prominent?** Hero space, calls-to-action.
  4. **Does anything feel slow or hard to find?** Confusing nav, buried links, broken expectations.
  5. **Does the brand feel like Everlastings throughout?** Or does any page feel like it's from a different site?
  6. **Anything that makes you wince?** First-impression honesty matters most.

That's it. Don't worry about anything that's not on this list — Sean is watching the technical pieces.

### §4.3 How to give feedback — shared Google Doc

Sean will create a shared Google Doc with one section per page. Add your notes under the relevant page using this format:

  > **Page**: {name}
  > **What I see**: {describe what's there now}
  > **What I'd like**: {describe the change}

That's the magic format. It separates "here's the thing" from "here's the change I want," which makes it easy for Sean to translate into something the build agent can act on.

You don't need to suggest the implementation. "I'd like the photos warmer" is enough — Sean will figure out whether that's a color-token change, a Cloudinary preset change, or a re-shoot.

### §4.4 What to ignore

If you see any of these, ignore them — they're not your domain at this stage:

  - URLs with "test" or "preview" in them
  - Anything labeled `placeholder-` (placeholder products)
  - Anything in the `/admin/` URL — that's Sean's only
  - "Weird URLs" in general (Vercel preview URLs are long and ugly; that's normal)
  - Below-the-fold content on pages Sean has marked as "still wiring"

When in doubt, ask Sean before noting something — he'll tell you if it's in your
review surface or his.

---

## §5 — For Future-Claude — Decision Boundaries

  > Read this section before any Track C execution session. The point is to keep the
  > agent from redesigning what's settled and from acting on feedback in ways that would
  > break the architecture.

### §5.1 Settled — do NOT reopen

These are architectural decisions. Treat them as fixed:

  1. **Cookie consent strategy** — deferred-state default-deny, localStorage shape `{ analytics, advertising, timestamp, version }`, symmetric Accept/Decline (CIPA defense), `consent-change` CustomEvent contract. See `v1_4_3_B_RESEARCH_COOKIE_CONSENT.md`.
  2. **`email-cta-submit` event contract** — single `CustomEvent` dispatched by every form, single global listener in `main.js`, source enum frozen (see Appendix B of `v1_4_4_C_IMPLEMENT.md`).
  3. **`data-*` attribute names** — every attribute Track B shipped is part of the wiring contract. Renaming any of them is Bucket 2 work and requires Sean's explicit approval.
  4. **Source-of-truth hierarchy** — Supabase > Stripe > R2 > frontend. Frontend is a read-only consumer. See `EVERLASTINGS_STORE.md`.
  5. **Image roles 1+1+5** — `/api/upload` validates 1 hero + 1 cover + 5 detail. Any change to this needs `/api/products` and `/api/upload` to move together.
  6. **11-endpoint consolidation pattern** — Vercel Hobby cap is 12; we sit at 11. New endpoints consolidate into existing files via `?_action=` + `vercel.json` rewrites.
  7. **Stripe coupon strategy** — `Duration: Forever` + blank `max_redemptions` on the parent coupon, single-use limit on per-event generated promotion codes. Reversing this destroys the cart-recovery and contemplation-offer flows.
  8. **Cloudinary signed flow** (per Decision D1) — matches `/Users/seanivore/Development/360-design/assets/docs/ENTRY_SOP.md` pattern. Do not introduce upload presets.

### §5.2 Iterating — act on feedback when received

These are intentionally fluid. When feedback arrives, classify per §2 and apply at the next checkpoint:

  - Cookie banner copy
  - Testimonial copy and arrangement
  - "Meet Emy" content (about.html)
  - Product photography (replaced as Emaline loads real products)
  - Micro-copy on CTAs and form labels
  - Color and typography polish within existing tokens
  - Per-page meta titles + descriptions
  - Newsletter form prompts and post-submit confirmations

### §5.3 Escalate — do NOT decide alone

If feedback would require any of these, stop and surface to Sean before acting:

  - Adding a new endpoint (force a re-evaluation against the Hobby cap and consolidation rule)
  - Changing an event name a page already dispatches (would break the wiring contract)
  - Changing the placeholder convention or `data-*` naming
  - Changing the consent default state, the localStorage shape, or the gtag/fbq call shape
  - Adding a runtime dependency
  - Changing the Cloudinary or R2 path conventions
  - Anything that would require backwards-incompatible Track A changes

### §5.4 Operating rule

When feedback arrives mid-Track-C: log it in §8's ledger, **keep wiring**, batch-apply at the next Design Review Checkpoint. Never hot-patch architecture in response to in-flight feedback. The protocol exists to keep iteration cheap; hot-patching makes it expensive.

---

## §6 — Per-Page Review Map

Per-page focus areas at each checkpoint. "Stakeholder" indicates whose feedback drives that page primarily — but either party can flag anything they notice.

| #   | Page                   | Stakeholder     | Look at                                                                          |
| --- | ---------------------- | --------------- | -------------------------------------------------------------------------------- |
| 1   | `/index.html`          | Both            | Hero impact, voice, featured strip                                               |
| 2   | `/shop.html`           | Both            | Grid, filters, sort, sold-state visual                                           |
| 3   | `/product.html?slug=…` | Both            | Gallery, story copy, CTAs, sticky right card                                     |
| 4   | `/cart.html`           | Sean primary    | Line items, recovery overlay, CHECKOUT flow                                      |
| 5   | `/checkout.html`       | Sean primary    | Two-stage progressive disclosure, address element, payment element, error states |
| 6   | `/complete.html`       | Sean primary    | Success state, line-item summary, newsletter prompt                              |
| 7   | `/about.html`          | Emaline primary | "Meet Emy" copy + photo, origin story, mission                                   |
| 8   | `/contact.html`        | Sean primary    | Form, commission section                                                         |
| 9   | `/faq.html`            | Sean primary    | Accuracy, cross-links to source-of-truth pages                                   |
| 10  | `/policies.html`       | Sean primary    | Availability text (verbatim per IMPLEMENT.md), cart-hold mechanics               |
| 11  | `/privacy.html`        | Sean primary    | Three-cookie-categories alignment with banner, California section                |
| 12  | `/shipping.html`       | Sean primary    | US-only restriction copy, timeline                                               |
| 13  | `/terms.html`          | Sean primary    | Effective-date, plain-language ToS                                               |
| 14  | `/admin/index.html`    | Sean only       | Login → create product → see on shop list                                        |

**Ignore until**:
  1. Testimonial copy (Open Thread; replaced when real testimonials land)
  2. Placeholder products (replaced as Emaline loads real)
  3. Placeholder data; the product page is where the catalog "becomes real" first
  4. Recovery copy until Checkpoint C
  5. Payment until Checkpoint C
  6. Order ID display until real-card test
  7. Placeholder photo until Emaline supplies real
  8. Email delivery until C5
  9. N/A 
  10. N/A 
  11. N/A 
  12. N/A 
  13. N/A 
  14. NOT for Emaline

---

## §7 — Iteration Loop Cadence

Aligned to Track C checkpoints A/B/C/D from `v1_4_4_C_IMPLEMENT.md`:

```
Phase 0 ─→ C1 ─→ Checkpoint A ─→ C2 ─→ Checkpoint B ─→ C3 ─→ Checkpoint C ─→ C4 ─→ Checkpoint D ─→ C5
                     │                  │                  │                  │
                     Sean reviews       Sean + maybe       Sean reviews +     Sean + Emaline
                     foundations        Emaline            real-card test     final review
                                        review pages
                     │                  │                  │                  │
                     ↓                  ↓                  ↓                  ↓
                  Bucket 1 →         Bucket 1 →         Bucket 1 →         Bucket 1 →
                  applied with C2    applied with C3    applied with C4    applied within C5
                                                                            Bucket 3 →
                                                                            v2 backlog
```

After each checkpoint:
  - Bucket 1 items: agent applies in parallel with the next Track C section
  - Bucket 2 items: agent applies at the boundary between sections (small batch commit)
  - Bucket 3 items: logged in §8, deferred to v2

Real-product loading via the Custom GPT runs on its own track, kicked off after Phase 0 ships. Real products land in `/shop.html` and `/product.html` continuously through C1–C4 without involving the wiring agent.

---

## §8 — Settled-vs-Iterating Ledger (live)

Update this table as decisions land. Carries forward into v2 planning.

**Notes**: 
  1. Do not reopen unless legal floor changes (Google Ads roadmap could trigger)
  2. Single source of truth in Appendix B of `v1_4_4_C_IMPLEMENT.md`
  3. Renaming any is Bucket 2; requires Sean approval
  4. Hobby cap discipline
  5. `/api/upload` validates
  6. Matches 360-design ENTRY_SOP pattern
  7. Removes webhook-routing dependency for preview
  8. Shared Google Doc, one section per page
  9. Currently shipped shorter; Sean may swap
  10. Open Thread from Track B
  11. Emaline owns
  12. Currently brand-voiced; swap if CCPA threshold crossed

| #   | Decision                                                                  | Status    | Locked in                                |
| --- | ------------------------------------------------------------------------- | --------- | ---------------------------------------- |
| 1   | Cookie consent strategy (default-deny, deferred state, symmetric buttons) | Settled   | Track B (research §6.1, §7.2)            |
| 2   | `email-cta-submit` source enum                                            | Settled   | Track B SESSION_REPORT line 226          |
| 3   | `data-*` attribute names                                                  | Settled   | Track B (per page placeholder inventory) |
| 4   | 11-endpoint consolidation                                                 | Settled   | Track A UPDATE_REPORT (commit `2085c42`) |
| 5   | Image roles 1+1+5                                                         | Settled   | Track A                                  |
| 6   | Cloudinary signed flow                                                    | Settled   | v1.4.5 alignment session (D1)            |
| 7   | `?sync=true` on POST products                                             | Settled   | v1.4.5 alignment session (D2)            |
| 8   | Emaline feedback channel                                                  | Settled   | v1.4.5 alignment session (D5)            |
| 9   | Cookie banner copy (longer vs. shorter)                                   | Iterating | TBD at Checkpoint A                      |
| 10  | Real testimonials                                                         | Iterating | TBD at Checkpoint A or B                 |
| 11  | "Meet Emy" copy + photo                                                   | Iterating | TBD at Checkpoint C or D                 |
| 12  | Footer "Privacy preferences" link text                                    | Iterating | TBD post-launch                          |

---

## §9 — Open Threads Snapshot

Carried from Track A and Track B closeouts. Each line says which Track C checkpoint resolves it.

| Thread                                                              | Owner                               | Resolves at                        |
| ------------------------------------------------------------------- | ----------------------------------- | ---------------------------------- |
| Cookie banner copy final approval (longer vs. shorter draft)        | Sean                                | Checkpoint A                       |
| Real testimonials (homepage strip — placeholder copy)               | Sean / Emaline                      | Checkpoint A or B                  |
| Real "Meet Emy" copy + photo (about.html)                           | Emaline                             | Checkpoint C or D                  |
| Lighthouse mobile audit ≥ 90 across all 13 pages                    | Agent                               | C4                                 |
| Track A integration tests re-run against preview post-consolidation | Agent                               | C4                                 |
| Stripe test webhook registration                                    | Agent (preview) / Sean (production) | C3.5 (preview) / C5.2 (production) |
| `env()` helper sweep across remaining endpoints                     | Agent                               | C5.2                               |
| Admin UI manual click-path                                          | Sean                                | C5.2                               |
| Trailing-newline Vercel env cleanup                                 | Sean (optional)                     | C5.2 (optional)                    |
| Cloudinary signed-flow switch (Phase 0 Gap A)                       | Agent                               | Phase 0                            |
| `test_` prefix validator (Phase 0 Gap B)                            | Agent                               | Phase 0                            |
| `?sync=true` on POST products (Phase 0 Gap C)                       | Agent                               | Phase 0                            |
| stripe-sync idempotency (Phase 0 Gap D)                             | Agent                               | Phase 0                            |
| `vercel curl` exit-code-3 doc note (Phase 0 Gap E)                  | Agent                               | C5.2                               |
| `materials` array type doc fix (Phase 0 Gap F)                      | Agent                               | C5.2                               |
| `is_test=true` placeholder cleanup                                  | Agent                               | C5.1                               |
| Real product load via Custom GPT (≥ 5 products)                     | Emaline                             | Parallel with C1–C4; final at C5.3 |

---
*This protocol is meant to make iteration cheap and launch reliable. If something here isn't working, fix the protocol — it's a tool, not a contract.*