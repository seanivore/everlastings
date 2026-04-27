# v1.3.0 Implementation Planning Finalizations

**Created**: 2026-04-12 
**Version**: v1.2.1 -> v1.3.0 
**Status**: In progress 

---

## Overview 

This document contains feedback and questions, Re: `assets/docs/archive/v1_2/v1_2_1_IMPLEMENTATION.md`, from Sean and Emy's GPT agent reviewing. Create a new plan that will handle these updates and additional careful planning that they require. After updates and changes, please have new agent instances review everything thoroughly as needed, for as much validation and confidence as possible. 

## Documents 

  1. Update `v1_2_1_IMPLEMENTATION.md` as new `assets/docs/archive/v1_3/v1_3_0_IMPLEMENTATION.md` document creation 
  2. Also update `v1_2_1_ACTION_STEPS.md` as new `assets/docs/archive/v1_3/v1_3_0_ACTION_STEPS.md` document creation 
  3. Consolidate and delete `PRODUCT_GUIDE.md` and `PRODUCT_CREATION_PROTOCOL.md` creating `assets/docs/PRODUCT_PROTOCOL.md`
  4. Directly create the `.env.example` file referenced in the planning documents 
  5. Create other files marked complete in implementation document under "Configuration Files — Complete" 

### File Replacement 

| Action  | Purpose                           | Path                                                |
| ------- | --------------------------------- | --------------------------------------------------- |
| Replace | v1.2.1 Master Implementation Plan | `assets/docs/archive/v1_2/v1_2_1_IMPLEMENTATION.md` |
| Replace | v1.2.1 Simple Guide               | `assets/docs/archive/v1_2/v1_2_1_ACTION_STEPS.md`   |
| Create  | v1.3.0 Master Implementation Plan | `assets/docs/archive/v1_3/v1_3_0_IMPLEMENTATION.md` |
| Create  | v1.3.0 Simple Guide               | `assets/docs/archive/v1_3/v1_3_0_ACTION_STEPS.md`   |

### File Consolidation 

| Action | Purpose                           | Path                                       |
| ------ | --------------------------------- | ------------------------------------------ |
| Delete | Agentic Store Management Protocol | `assets/docs/PRODUCT_CREATION_PROTOCOL.md` |
| Delete | Product Guide                     | `assets/docs/PRODUCT_GUIDE.md`             |
| Create | Comprehensive Product Protocol    | `assets/docs/PRODUCT_PROTOCOL.md`          |

### File Maintenance 

| Action | Purpose             | Path                                |
| ------ | ------------------- | ----------------------------------- |
| Update | Master Architecture | `assets/docs/EVERLASTINGS_STORE.md` |
| Update | Repository Read Me  | `README.md`                         |

### New Files 

| Action | Purpose             | Path            |
| ------ | ------------------- | --------------- |
| Create | Example Environment | `.env.example`  |
| Create | Vercel Config File  | `vercel.json`   |
| Create | TS Config File      | `tsconfig.json` |
| Create | Package File        | `package.json`  |

### For Your Reference 

| Purpose            | Path                                      |
| ------------------ | ----------------------------------------- |
| Feedback Update #1 | `assets/docs/archive/v1_2/v1_2_0_PLAN.md` |
| Feedback Update #2 | `assets/docs/archive/v1_2/v1_2_1_PLAN.md` |
| Brand Guide        | `assets/docs/BRAND.md`                    |

---

## GPT Agent Review Feedback 

### 1. Remove `SUPABASE_SERVICE_KEY` From External Usage

**Problem**:
Currently used in client/agent-facing API calls → full DB exposure risk.

**Change**:
  * Do NOT use `SUPABASE_SERVICE_KEY` in any external request
  * Create a **server-side API key** (custom) OR require authenticated admin session

**Add Rule**:

  ```
  SUPABASE_SERVICE_KEY is server-only and never exposed in client, agent, or cURL usage.
  All API endpoints must validate requests server-side before accessing Supabase.
  ```

### 2. Define Webhook Idempotency (Stripe Retries)

**Problem**:
Stripe will retry events → risk of duplicate processing

**Change**:

  * Store `event.id` in DB
  * Ignore already-processed events

**Add**:

  ```ts
  On webhook:
  - Check if event.id exists in webhook_events table
  - If yes → ignore
  - If no → process + store event.id
  ```

### 3. Remove Ambiguity Creating Explicit Webhook Contract

**Problem**:
Webhook flow implied, not explicitly defined

**Add Section**:

  ```
  Webhook Contract:

  Event: checkout.session.completed

  Flow:
  1. Parse metadata.items
  2. For each item:
    - Locate product in Supabase
    - Set available = false
    - Set quantity = 0
  3. Save Stripe event.id (idempotency)
  ```

### 4. Clearly Define Stripe Update Sync Rules 

**Problem**:
Update behavior is implied, not explicitly locked

**Add Rules**:

  ```
  Stripe Sync Rules:

  - On INSERT → create Stripe Product + Price
  - On price change → create new Stripe Price, archive old
  - On title/image/description change → DO NOTHING in Stripe
  - Stripe is write-once except for price updates
  ```

### 5. Slug Generation Timing Conflict 

**Problem**:
Images require slug before DB creates it → circular dependency

**Change**:

  * Generate slug from title as Step 1
  * Probably no need for it to be automated at all unless it is part of image file naming scripts 

**Add**:

  ```
  Slug Generation Rule:

  slug = title.toLowerCase().replaceAll(' ', '-')

  Slug must be created BEFORE:
  - image upload
  - file naming
  - product creation

  Database still enforces uniqueness.
  ```

### 6. Create Error Handling In Agentic Pipeline 

**Problem**:
Pipeline assumes success → agents will continue on failure; must presume they will fail and plan accordingly. 

**Add**:

  ```
  Error Handling Rules:

  - If image upload fails:
    → retry once
    → if still fails → STOP process

  - If product creation fails:
    → DO NOT retry blindly
    → log error and return failure

  - Do not proceed to next step if current step fails
  ```

### 7. Field Entry Validation Before Product Submission 

**Problem**:
Should happen before `/api/products`. No enforcement → invalid data risk. Validate each field. 

**Add**:

  ```
  Validation Rules (before POST):

  - All required fields must exist
  - price must be integer (cents)
  - images.length ≥ 7
  - title, description must not be empty
  ```

### 8. Must Secure Endpoint

**Problem**:
The `/api/upload` endpoint is currently vulnerable if auth leaks. 

**Add**:

  ```
  Upload Endpoint Rules:

  - Require authenticated request (server-validated)
  - Reject unauthenticated requests
  - Validate file type (image/video only)
  - Enforce file size limits
  ```

### 9. Source Of Truth Hierarchy 

**Problem**: 
Add it clearly. Not explicitly defined → future confusion risk

**Add**: 

  ```
  Source of Truth Hierarchy:

  1. Supabase → authoritative data
  2. Stripe → payment mirror only
  3. R2 → asset storage only
  4. Frontend → read-only
  ```

### 10. Google Analytic Event Definitions 

**Problem**:
Only purchase event defined. Plan them all clearly along with any additional code or detailed steps required for implementation setup. Add GA setup to earlier phases. Make sure that events are sufficient and not missing any opportunities for data insights. 

**Add**:

  ```
  Analytics Events:

  - view_product
  - add_to_cart
  - begin_checkout
  - purchase
  ```

### 11. Fully Define Promo Code Recovery Flow 

**Problem**:
Mentioned but not implemented. What happens when a user gets an error from Stripe when they try to purchase an item that they put in their cart at the same time as another shopper, who then purchased before them? We need to plan what that error says right from that moment along with the promo code offer. 

**Define**:

  ```
  - Generate promo code on failed checkout
  - Store in DB
  - Set expiration
  ```

### 12. Enforce Image Role Requiresments 

**Problem**:
Roles defined but not enforced. 

**Add**:

  ```
  Image Requirements:

  - Exactly 1 hero image
  - Exactly 1 thumbnail
  - Minimum 5 gallery images
  ```

### 13. Handle Product Duplication Slug Conflict 

**Problem**: 
No explicit duplicate protection

**Add**:

  ```
  - Slug must be unique
  - On conflict → return 409 error
  - Do not overwrite existing product
  ```

---

## Other Questions / Thoughts 

  1. Perhaps "Locked Decisions" is no longer needed 
  2. Please include the bash commands for "Git Branching Strategy" 
     - Setting up each branch 
     - Creating .env files **FIRST** ??
     - What is exact flow please 
  3. Cloudflare now has DNS settings for `everlastingsbyemaline.com`
     - Include directions for setting up any subdomains 
     - `cdn.everlastingsbyemaline.com`
     - Development specific domain? 
     - Edit R2 setup specifics accordingly as well 
  4. Expand on Environment Strategy please 
     - Just make it clear what document or location should have which secrets 
     - This sort of fits with the branching setup above 
  5. Line 219 "Auto-generate slug from title on insert" doesn't work with flow and image naming 
  6. What does complete mean in "Configuration Files — Complete" line 304; create files? 
  7. Line 499 "**Create** admin user: Supabase Auth > Users > Invite user (Emy's email)"
     - We have `admin@everlastingsbyemaline.com`
     - Emy is `emyh@everlastingsbyemaline.com`
  8. Setup and creation of accounts and services can be consolidated 
     - I will do the rest before we start the first session 
  9. **Apologies**: I'm noticing that GPT seemed to gloss over some things. I mentioned that "api/config.ts" should keep "Must Secure Endpoint" secure. Maybe just confirm that. 
  10. Just want to confirm that the description of the pages from the early documents is in the implementation plan? 
      - It seems like it might be, just has been made in to small bullet points 
      - I just wanted to confirm 

---