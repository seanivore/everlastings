# v1.4.6 — Gap-review prompts for a fresh Claude Code instance

**For Sean.** Use these to have a *fresh* Claude Code instance review `v1_4_6_FINISH_TRACK_C.md` for gaps before any code is written. The point isn't ceremony — different instances genuinely catch different things (different training recall, different instincts), the way a second pair of human eyes does. Both prior reviewers found real bugs; expect this round to surface more, and expect *some* gap to still slip through. That's fine. We're minimizing struggle at build time, not chasing a perfect document.

### How to run it
1. Open a **new** Claude Code instance in the `everlastings-website` repo (so it can open the code files the doc edits). Turn effort to **max**.
2. Paste **Prompt 1** (doc-alone). Let it work; bring its gap list back to this conversation. I'll fold the valid items into the doc.
3. If you want a second angle, run **Prompt 2** (doc + architecture) — same loop. Running both can only help.
4. **Repeat until a run returns no valid new gaps.** When two consecutive fresh reviews find nothing load-bearing, the doc is as ready as it needs to be.

> Why two prompts: Prompt 1 hands the reviewer *only* the build doc (+ the repo it edits) — the strongest test of whether the doc truly stands alone, since the executing agent gets nothing else. Prompt 2 also gives it the architecture doc, which trades a little of that purity for the chance to catch system-integration gaps. Earlier rounds, the reviewer that knew the whole project (Em's GPT, which planned the brand/site) reliably found one essential insight per pass — Prompt 2 recreates that.

---

## PROMPT 1 — doc-alone (tests self-containment)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT write or change any code — your only output is a review.

CONTEXT
- The file `assets/docs/archive/v1_4/v1_4_6_FINISH_TRACK_C.md` is a build packet. A FRESH agent — no memory of this project, no other planning docs — will execute it start to finish against this repo, then test on a Vercel preview. Anything it has to guess, infer, or "already know" is a landmine.
- History you must respect: this repo's Stripe Custom Checkout ("Basil") was rebuilt FIVE times and kept failing. Two causes. (1) The public Stripe docs AND LLM training are WRONG for the bundle this site loads — they push `initCheckoutElementsSdk` and mandatory `updateShippingAddress`/`updateBillingAddress` calls; the working code uses `stripe.initCheckout({ fetchClientSecret })` + `checkout.confirm()` with NO update* calls. (2) Putting a second writer (a manual `update*`) on top of Stripe's self-syncing elements throws `IntegrationError` and blocks payment. The doc is built to avoid both. Your job is to make sure it actually does, everywhere, without re-introducing the trap.

WHAT TO DO
1. Read the build doc in full.
2. You MAY open the specific code files the doc says it edits (checkout.html, assets/js/checkout.js, cart.html, assets/js/cart.js, assets/js/complete.js, api/checkout.ts, api/webhook.ts, api/_emails/index.ts, api/orders.ts, api/_lib/adminAuth.ts, assets/js/admin.js, admin/index.html) to verify its "current code" / before-blocks match reality and its "after" edits would actually apply cleanly. Do NOT pull in other planning docs — if the doc isn't self-sufficient without them, that itself is a finding.

HUNT SPECIFICALLY FOR
- Any selector, data-attribute, DOM id, env var, function name, or API field the doc references but never defines or that doesn't match the actual file.
- Any "after" code block that wouldn't apply because the quoted "current" code is wrong, moved, or differs from the repo.
- Any decision quietly left to build time ("figure out", "as needed", "if appropriate") that a fresh agent could resolve the wrong way.
- Any line that drifts back toward the Stripe doc-trap (an `initCheckoutElementsSdk`, a mandatory `update*` over a mounted element, a `clientSecret:` instead of `fetchClientSecret`).
- Integration gaps between phases: does the success page get every field the server now returns? Does the cart's reserve payload match what the server reads? Does removing the pre-created customer leave anything (webhook, receipts) without data it needs?
- Missing or mishandled error/edge states (empty cart, 410 hold-expired, 409 sold, declined card, network failure, non-US address).
- Assumptions that depend on dated knowledge of Stripe Basil, Vercel, Supabase, or cleanUrls behavior.

OUTPUT
- A gap list RANKED by how likely it is to derail the build (most dangerous first). For each: the location in the doc, what's wrong/missing, and the concrete fix.
- The single most important insight you'd want the author to hear (the "if you fix one thing" item).
- A one-line verdict: READY TO BUILD, or NEEDS ANOTHER PASS.
Be specific and concrete. "Phase 3 mounts `[data-stripe-contact]` but Phase 2's HTML never adds that slot" beats "check the selectors."
```

---

## PROMPT 2 — doc + architecture (catches system-integration gaps)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT write or change any code — your only output is a review.

CONTEXT
- Read `assets/docs/EVERLASTINGS_STORE.md` first for whole-system context (stack, data flow, schema, conventions), then review the build packet `assets/docs/archive/v1_4/v1_4_6_FINISH_TRACK_C.md`. A FRESH agent will execute the build packet start to finish against this repo and test on a Vercel preview.
- History you must respect: the Stripe Custom Checkout ("Basil") flow failed FIVE times. (1) Public Stripe docs and LLM training are WRONG for the loaded bundle — they push `initCheckoutElementsSdk` and mandatory `updateShippingAddress`/`updateBillingAddress`; the real surface is `stripe.initCheckout({ fetchClientSecret })` + `checkout.confirm()` with NO update* calls. (2) A second writer (manual `update*`) on Stripe's self-syncing elements throws `IntegrationError` and blocks payment. The packet is designed to avoid both.

WHAT TO DO
1. Read the architecture doc, then the build packet, then open the code files the packet edits (checkout.html, assets/js/checkout.js, cart.html, assets/js/cart.js, assets/js/complete.js, api/checkout.ts, api/webhook.ts, api/_emails/index.ts, api/orders.ts, api/_lib/adminAuth.ts, assets/js/admin.js, admin/index.html) to verify the before/after blocks against reality.

HUNT SPECIFICALLY FOR
- Everything in Prompt 1 (undefined selectors/contracts, mis-quoted "current" code, deferred decisions, doc-trap drift, missing error states, dated-knowledge assumptions), PLUS:
- System-integration gaps the architecture doc reveals: does the change respect the source-of-truth hierarchy, the `is_test` scoping, the webhook idempotency claim, the 11-function Hobby cap (does any new file blow it?), the cleanUrls rewrite behavior, the env-var scoping (test vs live)?
- Does the new `requireAdmin` Bearer path open any access it shouldn't? Does the merchant-email block respect the "never 5xx after the idempotency claim" rule?
- Does anything in the packet contradict a Key Architectural Decision or Architecture Reference (AR #N) in the architecture doc? Flag the conflict.
- Does the doc's reorganization (PRODUCT_PROTOCOL retired into GPT_SETUP + STORE_ADMINISTRATION) leave any stale pointer or behavioral gap?

OUTPUT
- A gap list RANKED by likelihood of derailing the build (most dangerous first): location, what's wrong, concrete fix.
- The single most important insight.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
Be concrete and specific.
```

---

## Folding feedback back

Bring each review's list here. I'll triage: valid load-bearing gaps get folded into `v1_4_6_FINISH_TRACK_C.md` immediately; anything that's actually a Phase-0-probe question gets marked as such (the probe, not the doc, resolves live-bundle specifics); anything out of scope gets noted in the doc's "Out of scope" so it's a decision, not an omission. Then run another fresh review. Stop when a pass returns nothing load-bearing — that's the signal we've minimized the struggle, not that the doc is flawless.
