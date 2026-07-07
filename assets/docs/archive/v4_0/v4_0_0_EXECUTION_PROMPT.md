Hello.

Our v4.0.0 build of Everlastings by Emaline Online Store is ready for development. As Opus 4.8 set to xhigh with a 1M context, you are the agent orchestrating the project. Please read the following carefully in order to start the session.

NOTE: The essential documents are large. This is okay. Your context has been carefully planned to ensure that this development session is exclusively executable. Every decision has been settled. You need only to build what is written without re-litigating scope or approach. Please trust that the details were very carefully worked out and the plan has passed a rigorous, multi-session, multi-angle gap review to reach this state.

IMPORTANT: You must start by reading each of these essential documents **in full**. This is required to have an appropriate understanding so that you may spawn peer-agents and delegate the build in a way that is pragmatic, thorough, efficient, and accurate as work is handed back to you. Your peer-agents do NOT share your context — hand each the specific doc sections + CURRENT/NEW anchors it needs (no pass-through).

DOCUMENT: You are building on the `dev` branch. As you build, please commit frequently, denoting each file change to ensure any agent looking back at GIT in the future will be able to easily see each step of your work. You should also use the Project Directory `memory` tool, keeping updates on the progress; this becomes especially important if you encounter any unexpected reasons for deviation from the plan. When you have completed the requested development, you will provide an `assets/docs/archive/v4_0/v4_0_0_BUILD_REPORT.md` document that specifically compares the build documents against what you ended up building, identifying any area where there might have been deviation from the plan, providing reasoning or logic for doing so (deviations-from-plan only — lean = trustworthy).

PRE-FLIGHT: Runtime preconditions, already triaged. The orchestrator owns all but one; there is nothing here that blocks you from starting the build.

- **You handle (do these before the testing pass — details in the TESTING addendum's "Before you start"):** seed test products in the dev preview (incl. a multi-piece cart of ≥2 pieces with UNEQUAL prices for the WS7 even-split test, and ≥1 qty-1 + ≥1 qty≥2 piece); set `CRON_SECRET` on the preview (arms both cron-gated jobs); subscribe `charge.refunded` on the preview webhook endpoint (attempt via the Stripe CLI — if the CLI can't edit the existing endpoint's events, STOP and ask Sean to add it in the Stripe Dashboard, a 30-second toggle); run the legacy sold-row backfill **before enabling any % sale**; verify the cron gate with the two curl checks; confirm the preview is `VERCEL_ENV !== 'production'`. Confirm a Stripe test event and a GPT call both reach the preview before trusting any webhook/GPT item (Deployment Protection / preview SSO is off for your use).
- **For Sean/Em — nothing for the build or testing.** The Custom GPT is **already pointed at the tester** (Sean set it there so Em can explore it; it was never switched to production), so the GPT-parity spot-check runs against it as-is — just confirm a GPT call reaches the preview (above). **The one open item is a go-live reminder, NOT part of this build:** flip the GPT's Action to production after everything ships — record it in the BUILD_REPORT handoff so it lands in the go-live checklist alongside the `CRON_SECRET` prod-scope note.

BUILD GUIDE: These are the must-read-in-full documents.

  - `assets/docs/archive/v4_0/v4_0_0_IMPLEMENT.md` — part 1 of 3 of the exclusively executable build guide
  - `assets/docs/archive/v4_0/v4_0_0_ADDENDUM_DESIGN.md` — design and front end elements, part 2 of 3 of the exclusively executable build guide
  - `assets/docs/archive/v4_0/v4_0_0_ADDENDUM_TESTING.md` — testing and verification plans, part 3 of 3 of the exclusively executable build guide
  - `assets/docs/archive/v4_0/design-source/out/…` — the polished Content Creator Portal from Claude Design, tested and verified to match our back-end build; this is the **runtime design set you port into `admin/`**. (The unchanged design *context* — brief, data-flow, tokens, controls, feedback — is `assets/docs/archive/v3_5/design-handoff/`; the IMPLEMENT front-matter gives the full read order across both.)

RESOURCES: Other important documents.

  - `assets/docs/EVERLASTINGS_STORE.md` — the architecture and technical documentation for the project, up to this current build
  - `assets/docs/archive/v4_0/_RATIONALE.md` — where all archaeology, excessive changelog, and logic has been cleaned from the exclusively executable build guide documents; you should NOT need to reference this at all
  - `.agent/DEV_RULES.md` (skim) — branching, commits, the no-mixed-truth + no-pass-through rules.
  - Do NOT read prior IMPLEMENTs / GAP_REVIEWs / BUILD_REPORTs — their content is already folded in, and your context has been carefully planned.

PROCESS: How to build.

- Every code edit quotes a CURRENT block (the locator) and a NEW block. Line numbers are hints; the CURRENT text is the anchor. If a CURRENT block doesn't match the working tree byte-for-byte, STOP and reconcile — never guess. (The runtime design files are Claude Design's polished set — richer than when some anchors were written; the IMPLEMENT's "Design-file anchors" note tells you to re-verify against `design-source/out/` and skip any edit CD already made moot.)
- Use the IMPLEMENT's own **"Orchestration — the execution blueprint"** section as your starting point for delegation: it names the foundation-first work (WS1 + WS8's schema/write-helper), the five parallel tracks (B–F), the sequenced WS10 + doc-sync tail, and the shared-file edit order for the five files multiple workstreams touch. It's a starting point to evaluate, not a contract.
- If you hit a decision-shaped question, that's a plan bug: STOP, surface it to Sean, fix the plan, continue. Never decide on your own.
- The TESTING addendum's static gate (tsc-clean · all `api/*.ts` compile to CommonJS · serverless function count UNCHANGED at 11/12 · no new cron · GPT `.txt` `wc -c` < 8000 · migrations monotonic · destructive DROP ships commented) runs after **every** edit, not just at the end — the IMPLEMENT's Invariants are non-negotiable guardrails the gate enforces.
- Vercel's preview SSO is turned off for your use; use the CLI, do all testing on the dev preview, NEVER localhost.
- All work should be validated with screenshots, agentically, using the Claude-in-Chrome tool. You'll need to log in to the `/admin` panel to review it. You can use the login email `dev@test.com` and password `password` that has been set up specifically for this purpose.
- If needed for checking logs or otherwise, the Supabase CLI and Stripe CLI are also already set up for your use.

WHEN DONE: run the testing addendum on the dev preview, fix bugs.

THEN: the as-built documentation pass is a **fresh-agent** task, NOT the tail of this build session — a full-context executor summarizes docs from memory and silently corrupts them (this has bitten the project before; see DEV_RULES → as-built doc-sync). Hand off a fresh agent to walk the build-adjusted IMPLEMENT (with your BUILD_REPORT for deltas, code as tiebreaker) and update, LINE-BY-LINE, to the new truth of this build: `assets/docs/EVERLASTINGS_STORE.md`, `assets/docs/STORE_ADMINISTRATION.md`, `assets/docs/BRAND.md`, `assets/docs/GPT_SETUP.md`, and `README.md`.

PAUSE: when complete, pause for Sean's sign-off before any dev → main ship.
