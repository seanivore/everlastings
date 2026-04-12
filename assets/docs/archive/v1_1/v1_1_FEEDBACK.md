# v1.2.0 Implementation Preparations

**Created**: 2026-04-09 
**Version**: v1.1.0 -> v1.2.0 
**Status**: In progress 

---

## Overview

A final, thorough pass to make sure that the implementation guide is actually executable and not just a bunch of presumptions and vague instructions. 

We do not want to be figuring out anything during development. All planning must be confirmed that it is still the most up-to-date, correct information available due to training cutoff dates and because of how very quickly the industry is moving these days. We don't want to touch code until we know exactly what we're doing. 

We will inevitably always end up doing something in the moment, but we must minimize this because it by design that LLMs will not necessarily know for certain how to do something until they are actually doing it — this must be avoided. Research. Confirm understanding. 

  + When developing the payments platform `/Users/seanivore/Development/freelance-payments/assets/docs/PAYMENTS_PLATFORM.md`, we wasted days using current, but different use-case information due to their huge amount of documentation. 
  + When developing a syntax highlighting editor using code-mirror-6, even after doing research, we still spent days trying to get things to work, only to later, upon further research, see we were stitching together an issue that had already been solved. 

Accepting this is common and might even always happen to some degree, the more we can iron out early, the less wasted time we spend trying to figure things out later. 

## Documents 

This chart includes only documents that exist now or I already know we'll need. It is not meant to be comprehensive; we should look to make a comprehensive version in our planning documents. There are also likely other organizational documents needed. 

| Action  | Document                                        | Details                                                      |
| ------- | ----------------------------------------------- | ------------------------------------------------------------ |
| Review  | `assets/docs/archive/v1/v1_1_FEEDBACK.md`       | Feedback on v1.1 for this v1.2 session                       |
| Review  | `assets/docs/archive/v1/v1_1_PREP.md`           | Absorb session v1.1 prep. if needed                          |
| Replace | `assets/docs/archive/v1/v1_1_IMPL_GUIDE.md`     | Expand -> `v1_2_IMPLEMENTATION.md` -> `v1_2_ACTION_STEPS.md` |
| Create  | `assets/docs/archive/v1/v1_2_IMPLEMENTATION.md` | New detailed implementation guide                            |
| Create  | `assets/docs/archive/v1/v1_2_ACTION_STEPS.md`   | New bulleted checklist overview walk through                 |
| Replace | `assets/docs/archive/v1/v1_1_BRAND.md`          | Finalize -> `BRAND.md`                                       |
| Create  | `assets/docs/BRAND.md`                          | Completed resource document                                  |
| Update  | `assets/docs/EVERLASTINGS_STORE.md`             | Update after each session with most accurate details         |
| Update  | `assets/docs/PRODUCT_GUIDE.md`                  | Update after each planning session until finalized           |
| Update  | `README.md`                                     | Review and update at end if needed                           |
| Delete  | `assets/docs/uid-xxx-xxx.json`                  | Confirm not needed for new architecture                      |
| Delete  | `assets/products/...`                           | Confirm not needed for new architecture                      |
| Delete  | `_config.yml`                                   | Confirm not needed for new architecture                      |
| Delete  | `CNAME`                                         | Confirm not needed for new architecture                      |

## Process 

The following is being offered as a starting point for planning. Please expand on this, improve, and make it your own. 

- **STEP 1**: First pass to identify and list all gaps that need more information
- **STEP 2**: General research; web search for our use cases; find areas of caution, best practices, solutions
- **STEP 3**: Specific research on identified gaps; confirm current information and accurate understanding 
- **STEP 4**: Build implementation guide with new information filling in gaps with code snippets and specifics; create overview 
- **STEP 5**: Second pass, possibly by different agent/instance with fresh eyes, identify gaps or confirm completeness
- **STEP 6**: Any final research needed from second pass 
- **STEP 7**: Update all relevant documents with new information

## Current Gaps Identified 

  + Supabase client init (assets/js/main.js skeleton)
  + api/stripe-sync.ts handler structure
  + api/checkout.ts session creation (the ui_mode: 'embedded' pattern from freelance-payments)
  + api/webhook.ts signature verification + inventory update
  + vercel.json complete config

## Initial v1.1 Planning Feedback 

  + Details about Stripe Catalog API calls needs to be better understood before they create the "VERCEL SERVERLESS FUNCTIONS", for example. 
  + Major gap worth closing: Session 1 and Session 4 reference
    - API patterns and Supabase/Stripe setup that would benefit from actual code snippets.
    - Right now those sessions say what to build but not how the code looks.
    - Mid-session, you'd need to look up Stripe docs, Supabase client initialization, webhook signature verification, etc.
  + This is needed ASAP because
    - It dictates the proper directions on `assets/docs/PRODUCT_GUIDE.md` for the client
    - It clears up what API endpoints actually need to be set up
  + We need to know exactly how client can use AI to automate updating the store products
  + I can see from the list of API endpoints in the docs that Stripe is not understood
  + If there is this one obvious gap, it means there are other gaps that I'll probably not catch but you should
  + Thoughts
    - What about updating entries because the API to do that in Stripe is not simple
    - Very specific and fine details for creating checkout session — this was troublesome in payments build and wasn't done right for a handful of attempts until I found an online human walk through and did it with the agent — it required a bunch of different pages of script, etc.
    - We need this level of detail. Looking at the architecture document for the payment site should be a clear indication of exactly how much detail we need. 

---

## Client Agent Review of Current v1.1 Planning Documents 
*We should plan on having the client's agent review the next, final, set of documents from this session.*

### DEEMED MOST IMPORTANT

#### 1. Stripe metadata strategy (missing, will break everything)

Right now:

* `checkout.session.completed` → “extract product info from metadata”

**Problem:**
You never defined what metadata is actually passed.

**You need explicitly:**

```ts
metadata: {
  product_id: string
  product_slug: string
}
```

Otherwise:

* Webhook won’t know what to mark as sold
* Multi-item cart = ambiguous
* You’ll end up querying Stripe line_items (painful + slow)

👉 Fix: define this in `api/checkout.ts` + document it in Session 4

---

#### 2. Multi-item cart vs “one-of-one” products conflict

You currently have:

* Cart system (multi-item)
* Inventory decrement logic
* “available = false” (implies 1 quantity)

**Conflict:**

* If everything is 1-of-1 → cart is mostly unnecessary
* If cart exists → race conditions (2 people buying same item)

👉 You need to choose ONE:

**Option A (recommended for launch):**

* No cart
* “Buy Now” only
* One product per checkout
* Simplifies everything

**Option B (later):**

* Cart allowed ONLY for prints / multi-qty items
* Unique items bypass cart

---

#### 3. Race condition / oversell protection (not handled)

Current flow:

1. User clicks buy
2. Checkout session created
3. Payment completes
4. Webhook marks sold

**Problem:**
Two users can buy same item before webhook fires.

👉 You need ONE of these:

**Simple fix (good enough):**

* On checkout creation → check `available === true`
* If false → block session

**Better fix:**

* Add `reserved` column
* Set reserved = true when checkout starts (with TTL)

---

#### 4. Stripe sync direction is half-defined

You have:

* Supabase → Stripe (on insert)

But NOT:

* What happens on UPDATE?

👉 Missing:

* Price change handling
* Image update handling
* Product rename handling

**Reality:**
Stripe products are messy to update.

👉 Recommendation:

* **DO NOT update Stripe products**
* Treat them as write-once
* If price changes → create new price only

Add rule:

> “Stripe is a payment mirror, not source of truth”

---

#### 5. R2 upload flow is underspecified

You wrote:

> `api/upload.ts`: receive file, upload to R2

Missing:

* Auth check (otherwise public upload endpoint 😬)
* File naming convention
* Image processing (you mentioned CLI before — not here)

👉 You need:

```ts
/products/{slug}/{timestamp}.webp
```

And:

* Validate file type
* Limit size
* Optional: auto convert to webp (later)

---

#### 6. Product schema not enforced in this doc

You reference:

> “schema in EVERLASTINGS_STORE.md”

But this doc is supposed to be ADHD-friendly + executable.

👉 Problem:
Agent will guess fields → inconsistency

👉 Fix:
Add a **hard schema block** in Session 3:

```ts
products:
- id
- title
- slug
- price_cents
- available
- featured
- images[]
- story_card
- features[]
- materials[]
- dimensions
- care_instructions[]
- shipping_details[]
- stripe_price_id
```

---

#### 7. No error states defined (UX gap)

Missing everywhere:

* Failed checkout
* Supabase fetch fails
* Empty product
* Image load fail

👉 Add minimal rules:

* Show fallback message
* Disable buttons
* Log errors to console

---

### DEEMED NON-BREAKING 

#### 8. No caching strategy

* Every page hits Supabase directly

Fine for now, but:

* Add note: “consider edge caching later”

---

#### 9. No image aspect ratio standard

This WILL cause messy grids.

👉 Define:

* 4:5 or 1:1 only

---

#### 10. No slug rules

👉 Define:

```js
slug = title.toLowerCase().replaceAll(' ', '-')
```

And:

* Immutable after creation

---

### DEEMED GOOD

* Session structure → clean
* System map → clear
* Admin scope → exactly right (not overbuilt)
* Supabase as source of truth → correct decision
* Killing GitHub Actions → correct
* Embedded Stripe → correct

#### Bottom line

You’re at:
**~85% production-ready architecture**

What’s left is not “more building” — it’s:

* Removing ambiguity
* Locking decisions
* Preventing edge-case bugs

---
