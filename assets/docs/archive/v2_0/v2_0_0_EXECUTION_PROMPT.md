# v2.0.0 Execution Prompt — AI Store Management + Design

**What this is.** A copy-paste kickoff for the fresh orchestrating agent that executes the v2.0.0 build, plus **Sean's touchpoint timeline** (when the human-in-the-loop steps come up). The gap-review gate is **closed**; the plan is exclusively executable. Paste the block below to the orchestrating agent; keep the timeline for yourself.

---

## Paste this to the orchestrating agent

```text
You are the orchestrating agent for the Everlastings by Emaline v2.0.0 build — the AI store-management
layer (the whole store run by chat) plus the v1.5 design pass. The gap-review gate is CLOSED; this plan
is exclusively executable. Build it on the `dev` branch, verify on the Vercel dev preview, then report.

REQUIRED READING (before any edit):
1. assets/docs/EVERLASTINGS_STORE.md — the architecture. It still describes the pre-v2.0 store; where it
   and the plan differ, the PLAN wins (you bring STORE to as-built truth in the final phase).
2. assets/docs/archive/v2_0/v2_0_0_IMPLEMENT.md — the plan. Read the North Star, the anti-fragility rule,
   and the "Orchestration" section FIRST.
3. assets/docs/archive/v2_0/v2_0_0_ADDENDUM_DESIGN.md + v2_0_0_ADDENDUM_TESTING.md — part of the same
   build; read both.
4. .agent/DEV_RULES.md (skim) — branching, commits, the no-mixed-truth + no-pass-through rules.
Do NOT read prior IMPLEMENTs / GAP_REVIEWs / BUILD_REPORTs — their content is already folded in.

HOW TO BUILD:
- Every code edit quotes a CURRENT block (the locator) and a NEW block. Line numbers are hints; the
  CURRENT text is the anchor. If a CURRENT block doesn't match the working tree byte-for-byte, STOP and
  reconcile — never guess.
- Everything here is a confirmed decision. If you hit a decision-shaped question, that's a plan bug:
  STOP, surface it to Sean, fix the plan, continue. Never decide on your own.
- Use the plan's "Orchestration" section as your starting point (one orchestrator, one session, parallel
  subagent groupings A=backend / B=frontend+design / C=GPT docs). Adapt it if the work in front of you
  warrants — but start from it.
- Work on `dev` with descriptive per-phase commits. Apply the Phase 1 migration via the Supabase CLI
  (the MCP can't write this project). Test on the dev preview, NEVER localhost.
- The human (Sean) owns specific steps — pause and hand off at each (see "Sean's touchpoints"). Never
  toggle Vercel SSO, configure the Custom GPT, or enter any credential yourself.

WHEN DONE: run the testing addendum (T1 functionality + T2 design/media) on the dev preview; fix bugs;
THEN do the Phase 10 as-built documentation pass (EVERLASTINGS_STORE, STORE_ADMINISTRATION, BRAND,
README) and write assets/docs/archive/v2_0/v2_0_0_BUILD_REPORT.md. Then PAUSE for Sean's sign-off before
any dev → main ship.
```

---

## Sean's touchpoints (when your steps come up)

The orchestrator pauses and hands off at each of these — in order through the build:

1. **Before Phase 1 (migration).** Make sure the **Supabase CLI** is authenticated and linked to project `rvnxftbfeaxymhzxxhjm` (the MCP can't write it). Then the agent runs the pre-Phase-1 **Studio check**: confirm `notify_stripe_sync_on_insert` is the *only* INSERT trigger on `products`, and no Studio Database-Webhook points at `products` INSERT.
2. **Apply the migration.** `supabase db push` from the repo root (the agent does this if it has CLI access; otherwise you run it). Verify the backfill count on the dev preview.
3. **Before testing on the dev preview** (three quick ops, all yours):
   - Toggle Vercel **Deployment Protection (SSO) → off** for the preview — third-party callers (the Stripe webhook + the Custom GPT) can't pass SSO, so the order/webhook + GPT tests can't run while it's on.
   - Enable the **`charge.refunded`** event on the Stripe webhook endpoint in **both test mode and live mode** (Stripe keeps the two separate; the refund test runs in test mode).
   - Point the **GPT's Action** at the dev preview + the **preview** `PRODUCT_API_KEY`.
4. **Configure the Custom GPT** (you drive; Em's ChatGPT account). Follow `GPT_SETUP.md`: paste the Instructions + the v1.2.0 schema, upload the two knowledge files (`gpt/product-reference.md` + `gpt/voice-guide.md`), set **Capabilities → Web Browsing ON** (the refund walkthrough needs it), and set Auth (preview key to test → production key at handoff). Required before the GPT-behavior + refund-walkthrough tests.
5. **After testing — re-enable Vercel SSO** on the preview. (Mobile QA is already done — the site looks great on mobile.)
6. **Sign-off.** The agent stops at the dev preview with a one-line summary. Review it; nothing ships to `main` until you say so.
7. **Launch / C5 cutover** (yours): live Stripe keys (Production scope) + the live-mode coupon bootstrap; point the GPT at **production** + the production key; add the ~2 remaining admin logins (Supabase Auth → Users); the content-placeholder gate (`grep -rn 'PLACEHOLDER:' .` must return zero); confirm `charge.refunded` on the **live** endpoint; Stripe receipt branding; DNS; then `dev → main` merge + tag `v2.0.0`.

> **The agent never does these for you:** SSO toggles, GPT configuration, credential/key entry, account creation, or the `dev → main` ship. Those are deliberately yours.
