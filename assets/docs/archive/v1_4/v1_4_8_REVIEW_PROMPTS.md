# v1.4.8 — Gap-review prompts for fresh instances (three angles)

**For Sean.** Use these to have *fresh* instances review `v1_4_8_FINISH_TRACK_C.md` for gaps before any code is written. Different instances catch different things — like extra pairs of eyes. Every prior reviewer found real bugs; expect more, and expect *some* gap to still slip through. That's fine: we're minimizing build-time struggle, not chasing a perfect document.

**Round 2 note (where we are).** Angle **A** was already run on **v1.4.7** (output: `v1_4_7_GAP_REVIEW_A.md`), and all sixteen of its self-containment findings are folded into **v1.4.8** — every delete/replace is now anchored on a quoted CURRENT block, the cross-file contracts are shown, the `vercel.json` example is valid JSON, and ambient helpers are in an appendix. So **v1.4.8 has already absorbed one cold self-containment pass.** Now run **B (fidelity)** and **C (integration)** against v1.4.8 — they open the code and test properties A couldn't. Re-run A only if you want a fresh cold pass on the hardened doc.

**The three angles test three different properties.** Run each at least once — they're complementary, not redundant:

| Angle                  | Property it tests  | Reviewer setup                    |
| ---------------------- | ------------------ | --------------------------------- |
| **A — Cold / no-repo** | *Self-containment* | Claude.ai/GPT; NO codebase access |
| **B — Fidelity**       | *Accuracy*         | Fresh instance; in repo.          |
| **C — Integration**    | *System fit*       | Fresh instance; PROJECT_NAME.md   |

+ *Self-containment* — can the doc be executed without looking anything up? **The truest test of "exclusively executable."** (Already run once on v1.4.7; folded.)
+ *Accuracy* — do the quoted before/after blocks match the real repo?
+ *System fit* — does it respect the wider architecture?

### Why the no-repo reviewer (Angle A) matters most for "exclusively executable"

The build doc is a surgical patch: it embeds the "before" and "after" for each edit so the executing agent only has to *locate and apply*, never *discover*. A no-repo reviewer can't peek at the code — so anywhere it gets stuck ("I'd have to open `webhook.ts` to know X") is exactly a place the build agent would also have to guess, and might guess wrong. Angles B and C, which **do** open the code, can unconsciously fill a doc gap from the repo and miss it. So A finds different — and for self-containment, more telling — gaps than B/C. (A's v1.4.7 pass is the reason v1.4.8 now quotes every CURRENT block; B and C should confirm those quotes are *accurate* and *system-safe*.)

### How to run it

  1. **Angles B and C now** (A is done + folded) in fresh Claude Code instances in the repo, effort **max**. Each one **writes its findings to a file** — `v1_4_8_GAP_REVIEW_B.md` / `v1_4_8_GAP_REVIEW_C.md` in `assets/docs/archive/v1_4/`. So you don't have to copy anything: just tell me they're done and I'll read the files and fold the valid items.
  2. **Optional re-run of Angle A** on the hardened doc: paste **Prompt A** into a no-codebase window (Claude.ai / ChatGPT) with ONLY `v1_4_8_FINISH_TRACK_C.md` pasted in. It has no filesystem, so it outputs its review as a complete `v1_4_8_GAP_REVIEW_A.md` document in the chat — drop that into `assets/docs/archive/v1_4/` yourself (or paste it to me and I'll file it).
  3. **Repeat until each angle returns nothing load-bearing.** When a fresh pass of each finds nothing that would derail the build, the doc is as ready as it needs to be (a residual gap is expected and accepted).

### Folding feedback back

Once the `v1_4_8_GAP_REVIEW_{A,B,C}.md` files are in the repo (A you save from the chat; B and C write themselves), just point me at them. Triage: load-bearing gaps fold into `v1_4_8_FINISH_TRACK_C.md` (which then drives `v1_4_9_…` if the changes are substantial — keep the prior version for history); anything a reviewer flags that the **Phase 0 probe already settled** (it's done — the VERIFIED CONTRACT is filled) is noted as resolved; anything out of scope is recorded in the doc's "Out of scope" so it's a decision, not an omission.

---

## PROMPT A — cold / no-repo (tests self-containment) — run with the doc ONLY, no codebase

```
You are a senior engineer doing a pre-build self-containment review. Effort: maximum. You will be given ONE document and NOTHING else — no codebase, no other files. Do not ask for the repo; its absence is the point. Your only output is a review.

WHAT THIS IS
- The document is a build packet. A FRESH agent will execute it step by step against a code repo it has never seen, then test on a Vercel preview. The packet is supposed to be "exclusively executable" — it embeds the exact current code and the exact replacement for every edit, so the agent only LOCATES and APPLIES, never DISCOVERS or DECIDES.
- This packet (v1.4.8) has ALREADY absorbed one cold self-containment pass, so it now quotes a CURRENT block for every edit and demotes line numbers to hints. Your job is to find what that pass MISSED — every place that STILL fails the bar: every point where, to carry out a step, you would have to open a repo file, recall how a library/framework behaves, infer a name, or make a judgment call the packet didn't make for you.

HUNT FOR
- Any variable, function, selector, data-attribute, DOM id, env var, import, or API field a step USES but the packet never SHOWS in a quoted block (i.e. you'd have to open the file to confirm it exists or is named that).
- Any "insert after / replace / find this exact" instruction where the quoted CURRENT block is incomplete or wouldn't uniquely locate the edit point.
- Any step that says or implies "as appropriate", "follow the existing pattern", "should already", "if needed" — anything left to judgment.
- Any value presented as settled fact that actually depends on live behavior the packet hasn't verified (note whether that's clearly marked as a probe item / Phase-8 check, or silently assumed).
- Any cross-phase handoff you couldn't verify from the doc alone (a page consumes a field a server step must return; a payload must match its reader; a selector mounted in one phase must be defined in another).

OUTPUT — produce your full review as a complete markdown document the human will save as `assets/docs/archive/v1_4/v1_4_8_GAP_REVIEW_A.md`. You have no filesystem, so print the whole file's contents in the chat. Structure it as:
- A list of self-containment defects, RANKED by how likely each is to make the build agent guess wrong. For each: where in the doc, what you'd have to look up or decide, and the concrete fix (what to inline).
- The single most important "if you fix one thing" item.
- One-line verdict: SELF-CONTAINED ENOUGH TO BUILD, or NEEDS MORE INLINING.
Be concrete: "Phase 5.2 inserts a block that reads `orderRows` but never shows where `orderRows` is declared, so I can't confirm the name or that it's in scope" beats "some variables are unclear."
```

---

## PROMPT B — fidelity (tests the doc against the real repo) — run a fresh Claude Code instance IN the repo

```
You are a senior engineer doing a pre-build fidelity review. Effort: maximum. Do NOT change any code or existing docs — the ONLY file you create is your findings file (see OUTPUT).

CONTEXT
- `assets/docs/archive/v1_4/v1_4_8_FINISH_TRACK_C.md` is a build packet a FRESH agent will execute against THIS repo, then test on a Vercel preview. It embeds "current code" before-blocks and exact "after" replacements. (v1.4.8 already folded a cold self-containment review, so it quotes a CURRENT block for nearly every edit — your job is to confirm those quotes are ACCURATE against the repo and that each replace applies cleanly.)
- History to respect: this repo's Stripe Custom Checkout ("Basil") was rebuilt FIVE times and kept failing. (1) Public Stripe docs AND LLM training are WRONG for the loaded bundle — they push `initCheckoutElementsSdk` + mandatory `updateShippingAddress`/`updateBillingAddress`; the working surface is `stripe.initCheckout({ fetchClientSecret })` + `checkout.confirm()` with NO update* calls. (2) A second writer (manual `update*`) on Stripe's self-syncing elements throws `IntegrationError` and blocks payment. The packet is built to avoid both.

WHAT TO DO
1. Read the build packet in full.
2. Open the code files it edits (checkout.html, assets/js/checkout.js, cart.html, assets/js/cart.js, assets/js/complete.js, api/checkout.ts, api/webhook.ts, api/_emails/index.ts, api/orders.ts, api/_lib/adminAuth.ts, assets/js/admin.js, admin/index.html, vercel.json) and VERIFY:
   - Every quoted "current code" / FIND block matches the repo verbatim (the packet says to anchor on the quoted string, not the line number — so the string MUST be present and unique).
   - Every "after" replacement would apply cleanly — the quoted "current" string is unique and present, and the new code references only things that exist.
   - The "context already in scope" / ANCHOR / appendix claims are true (e.g. the variables Phase 5.2 lists really are declared at that point in webhook.ts; the pre-existing `available=false` write really exists; the Ambient-helpers appendix signatures match `main.js`/`recovery.js`/`api/_emails/index.ts`; the `complete.js` reader fields match what Phase 1b returns).

HUNT FOR
- Mis-quoted "current" code (moved, renamed, or differing from the repo) that would make an "after" edit fail or land in the wrong place — even a one-character drift in a FIND block is load-bearing now that the doc anchors on the string.
- A selector/field/env var the doc references that doesn't actually exist in the file.
- Any line that drifts back toward the Stripe doc-trap (`initCheckoutElementsSdk`, a mandatory `update*` over a mounted element, `clientSecret:` instead of `fetchClientSecret`).

OUTPUT — write your full review to a NEW file `assets/docs/archive/v1_4/v1_4_8_GAP_REVIEW_B.md` (create it; don't touch anything else). Structure it as:
- A gap list RANKED by likelihood of derailing the build: location in the doc, what's wrong vs. the repo, concrete fix.
- The single most important insight.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
Be specific and concrete. After writing the file, print just the one-line verdict in the chat so the human knows you're done.
```

---

## PROMPT C — integration (tests system fit) — run a fresh Claude Code instance + the architecture doc

```
You are a senior engineer doing a pre-build integration review. Effort: maximum. Do NOT change any code or existing docs — the ONLY file you create is your findings file (see OUTPUT).

CONTEXT
- Read `assets/docs/EVERLASTINGS_STORE.md` first for whole-system context (stack, data flow, schema, conventions, Architecture References AR #N), then review the build packet `assets/docs/archive/v1_4/v1_4_8_FINISH_TRACK_C.md`. A FRESH agent will execute the packet against this repo and test on a Vercel preview.
- History to respect: the Stripe Custom Checkout ("Basil") flow failed FIVE times — (1) public docs + LLM training push `initCheckoutElementsSdk` + mandatory `update*`, but the real surface is `stripe.initCheckout({ fetchClientSecret })` + `checkout.confirm()` with NO update* calls; (2) a second writer over Stripe's self-syncing elements throws `IntegrationError`. The packet avoids both.

WHAT TO DO
1. Read the architecture doc, then the packet, then open the files the packet edits to sanity-check the before/after against reality.

HUNT FOR
- System-integration gaps the architecture doc reveals: does the change respect the `is_test` scoping, the webhook idempotency claim, the **11-function Hobby cap** (does anything add a function? — note the keep-alive cron deliberately reuses `/api/product-feed` to avoid this), the `cleanUrls` rewrite behavior, the env-var test/live scoping?
- Does the new `requireAdmin` Bearer path open access it shouldn't? Does the merchant-email block respect "never 5xx after the idempotency claim"?
- Does anything contradict a Key Architectural Decision or AR #N? Flag the conflict.
- Does the doc reorganization (PRODUCT_PROTOCOL retired into GPT_SETUP + STORE_ADMINISTRATION; curated GPT knowledge now in `assets/docs/gpt/`) leave any stale pointer or behavioral gap?

OUTPUT — write your full review to a NEW file `assets/docs/archive/v1_4/v1_4_8_GAP_REVIEW_C.md` (create it; don't touch anything else). Structure it as:
- A gap list RANKED by likelihood of derailing the build: location, what's wrong, concrete fix.
- The single most important insight.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
Be concrete and specific. After writing the file, print just the one-line verdict in the chat so the human knows you're done.
```
