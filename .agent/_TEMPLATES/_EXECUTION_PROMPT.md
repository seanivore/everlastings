<!--
  TEMPLATE — _EXECUTION_PROMPT.md
  ================================
  The kickoff message that starts an exclusively-executable build session. Copy this file to the
  version dir and rename it `vX_Y_Z_EXECUTION_PROMPT.md`, then fill every {{PLACEHOLDER}} and resolve
  every <!-- AUTHOR: … --> note. The filled copy is one of the four things an orchestrator is handed
  (IMPLEMENT + the two addenda + this) — see DEV_RULES → "The execution kickoff bundle."

  Two guarantees this template exists to force (they were neglected when relied on from memory):
    1. PRE-FLIGHT TRIAGE — every human-facing precondition the plan named gets triaged A/B/C, so the
       only items left for the human are the ones genuinely only they can do. Run it explicitly;
       silence is not "nothing for the human."
    2. ORCHESTRATION STARTING POINT — the prompt points the agent at the IMPLEMENT's own
       "Orchestration" blueprint so it never designs the fan-out cold.

  Keep this a KICKOFF message, not a spec: point at the docs, don't restate them (no mixed truth).
  Delete this whole comment block from the filled copy.
-->

Hello.

Our {{VERSION}} build of {{PROJECT_NAME}} is ready for development. As {{MODEL / EFFORT / CONTEXT — e.g. "Opus 4.8 set to xhigh with a 1M context"}}, you are the agent orchestrating the project. Please read the following carefully in order to start the session.

NOTE: The essential documents are large. This is okay. Your context has been carefully planned to ensure that this development session is exclusively executable. Every decision has been settled. You need only to build what is written without re-litigating scope or approach. Please trust that the details were very carefully worked out and the plan has passed a rigorous, multi-session, multi-angle gap review to reach this state.

IMPORTANT: You must start by reading each of these essential documents **in full**. This is required to have an appropriate understanding so that you may spawn peer-agents and delegate the build in a way that is pragmatic, thorough, efficient, and accurate as work is handed back to you. Your peer-agents do NOT share your context — hand each the specific doc sections + CURRENT/NEW anchors it needs (no pass-through).

DOCUMENT: You are building on the `{{BRANCH — usually dev}}` branch. As you build, commit frequently, denoting each file change so any agent reading GIT later can follow each step of your work. Use the Project Directory `memory` tool to keep a running note of progress — especially important if you hit any unexpected reason to deviate from the plan. When development is complete, write `{{VERSION_DIR}}/vX_Y_Z_BUILD_REPORT.md` comparing the build documents against what you actually built, calling out any deviation with the reasoning for it (deviations-from-plan only — lean = trustworthy).

PRE-FLIGHT: Do these before you can trust the testing pass. <!-- AUTHOR: pull every precondition the plan named (the TESTING addendum's "Before you start", plus any env/service/account step) and TRIAGE each: (A) already done, (B) actually the orchestrator's to do, (C) written at the human but the orchestrator can handle it. List the (B)/(C) items here as the agent's ordered step 0. List ONLY the genuinely-human items under "For {{HUMAN_NAME}}" — the ones only they can do (an account they alone control, a dashboard toggle you can't reach). If a human item is only needed late (e.g. at the testing stage), say so, so the agent builds first and requests it at the right moment. If the triage turns up NOTHING human, say that explicitly. -->

- **You handle (do these first):** {{AGENT_PRECONDITIONS — e.g. seed test data, set env secrets via CLI, subscribe the extra webhook event, verify the cron gate, run the data backfill}}
- **For {{HUMAN_NAME}} (request at the right moment, don't block the whole build on it):** {{HUMAN_PRECONDITIONS — the genuinely-only-they items, with WHEN each is actually needed — or "none: the triage left nothing that isn't yours to do."}}

BUILD GUIDE: These are the must-read-in-full documents.

  - `{{VERSION_DIR}}/vX_Y_Z_IMPLEMENT.md` — part 1 of 3 of the exclusively executable build guide
  - `{{VERSION_DIR}}/vX_Y_Z_ADDENDUM_DESIGN.md` — design + front-end, part 2 of 3
  - `{{VERSION_DIR}}/vX_Y_Z_ADDENDUM_TESTING.md` — testing + verification, part 3 of 3
  - `{{DESIGN_SOURCE_PATH}}` — the runtime design set to port <!-- AUTHOR: point at the actual runtime source the IMPLEMENT front-matter names (the set to ship), NOT an older context/handoff dir. Verify the path exists. -->

RESOURCES: Other important documents.

  - `{{ARCH_DOC — e.g. assets/docs/EVERLASTINGS_STORE.md}}` — the living architecture/technical doc for the project up to this build
  - `{{VERSION_DIR}}/_RATIONALE.md` — the relocated "why" (archaeology, changelog, design reasoning) cleaned out of the build guide; you should NOT need it — open it only if a step is genuinely unclear
  - `.agent/DEV_RULES.md` (skim) — branching, commits, the no-mixed-truth + no-pass-through rules
  - Do NOT read prior IMPLEMENTs / GAP_REVIEWs / BUILD_REPORTs — their content is already folded in, and your context has been carefully planned.

PROCESS: How to build.

- Every code edit quotes a CURRENT block (the locator) and a NEW block. Line numbers are hints; the CURRENT text is the anchor. If a CURRENT block doesn't match the working tree byte-for-byte, STOP and reconcile — never guess.
- Use the IMPLEMENT's own **"Orchestration"** section as your starting point to plan how you delegate and review across peer-agents (in sequence or parallel) within this one session — it names the foundation-first work, the parallel tracks, and the shared-file edit order. It's a starting point, not a contract.
- If you hit a decision-shaped question, that's a plan bug: STOP, surface it to {{HUMAN_NAME}}, fix the plan, continue. Never decide on your own.
- The TESTING addendum's static gate (tsc/CommonJS/function count/etc.) runs after **every** edit, not just at the end — the IMPLEMENT's Invariants are non-negotiable guardrails the gate enforces.
- Preview SSO is off for your use; use the CLI, do all testing on the {{BRANCH}} preview, NEVER localhost.
- Validate all work with screenshots, agentically, via the Claude-in-Chrome tool. Log in to `{{ADMIN_PATH — e.g. /admin}}` with {{DEV_LOGIN — the purpose-built dev credentials}}.
- {{OTHER_CLIS — e.g. the Supabase CLI and Stripe CLI are already set up for logs and test events.}}

WHEN DONE: run the testing addendum on the {{BRANCH}} preview; fix bugs.

THEN: the as-built documentation pass is a **fresh-agent** task, NOT the tail of this build session — a full-context executor summarizes docs from memory and corrupts them (DEV_RULES → as-built doc-sync). Hand off a fresh agent to update, LINE-BY-LINE, these to the new truth of this build: {{DOC_PASS_FILES — e.g. EVERLASTINGS_STORE.md, STORE_ADMINISTRATION.md, BRAND.md, GPT_SETUP.md, README.md}}.

PAUSE: when complete, pause for {{HUMAN_NAME}}'s sign-off before any {{BRANCH}} → main ship.
