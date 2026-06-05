# Development Protocols

**Version**: v4.0.0 — *draft (`DEV_RULES_2.md`); pending Sean's review before it replaces `DEV_RULES.md`*
**Last Updated**: 2026-06-04
**Changes**: Strategic restructure. Re-centers the doc on the two things that make this workflow work — planning to **exclusively executable** and proving it with **fresh-instance gap review** — and cuts boilerplate that buried the signal (Common Pitfalls, Agent Documentation Standards, the enterprise parallel-dev essay, the research/testing/commit templates). New: the *subagent-pass vs fresh-instance-gate* distinction, the reviewer **access→perspective** model, the gate framed as non-waivable + ego-safe, and an IMPLEMENT template that stops seeding tiny version-milestone BUILDs.
**Purpose**: How we plan and build with agentic tools. Read THE CORE first; the rest is the machinery and reference.
**Syncing**: One canonical copy, propagated to every project via `filemgmt` (see § *Syncing*).

---

## THE CORE — if you internalize nothing else, internalize this

Our whole method rests on one inversion of the old norm: **with today's tools, code is fast and cheap; the plan is where the work is.** ~90% of effort goes to planning, ~10% to building. Five things follow, and none are optional:

1. **Plan until the build doc is EXCLUSIVELY EXECUTABLE.** The agent who builds it needs *no prior context, no guessing, nothing looked up* — exact files, exact code, exact decisions, all written out. If the builder has to *decide* something, the plan failed; it could decide wrong.

2. **You cannot certify your own plan — fresh, separate instances do.** A plan's author is the worst judge of its gaps (you fill them from memory without noticing). The gate is a *genuinely separate instance* — a new session, ideally with different asset access (§ *The Gap-Review Gate*). **In-session subagents you spawn are NOT this gate.** "I'll spawn subagents" / "I'll review it myself" is the exact reflex this rule exists to stop.

3. **Your job as planner is to make the work maximally reviewable — not to judge whether it's ready.** Whether the gate runs is co-owned with the human and not yours to waive. Write everything out *so others can check it.*

4. **A residual gap always survives, and that's expected.** We *minimize* struggle; we don't chase a flawless doc. Gaps found in review are the process working, not a grade on your competence — which is exactly why the gate is safe to open wide.

5. **Don't build a big thing in one breath. Orchestrate.** Large work decouples into independently buildable chunks; an orchestrator delegates tightly-scoped tasks to fresh subagents. (Subagents for *parallel building* — distinct from the fresh-instance *review gate* in #2.)

Everything below is the machinery that makes these five real.

---

## Development Philosophy (the why)

### Agentic coding in 2026 is 90% planning, 10% building

| Activity | Effort |
| -------- | ------ |
| Planning | 90%    |
| Building | 10%    |

Agents write thousands of correct lines in minutes and can one-shot a working app. The old high-cost "writing code" step is cheap now, so the value moved upstream to the plan. The old **debugging phase** — an unbounded, unpredictable "figure it out later" space — is precisely what good planning *replaces*: you move the uncertainty to *before* the code exists, where it's cheap to resolve and safe to review.

### The new failure mode: agents go down the wrong path

The risk today isn't slow typing — it's an agent confidently heading the wrong way on one small *unstated* thing and compounding it. Two consequences:
- **Whole rewrites often beat bug-hunting.** A clean re-generation from a correct spec is frequently faster and cleaner than patching; patched bugs compound in hard-to-trace ways and leave a codebase later agents can't reason about.
- **Specificity is everything.** The smallest unstated detail is where it breaks. Hence: exclusively executable.

### Question whether your training data is dated

LLMs are built to produce an answer in the moment, which can blind you to a gap in your own knowledge. Tech moves fast; the API you "know" may have changed. The discipline: don't *find the solution while building* — find it while **planning**, where there's room to verify against current docs and be reviewed. Prove current knowledge in the doc (link the real API docs). Never present training-data recall as fact.

### The Agentic Orchestration Paradox

The larger a task, the more an agent instinctively *shrinks* it to stay in its comfort zone — managing context, avoiding losing the thread. Unchecked, it tries to do a massive plan in one stream of consciousness and drops context / writes bugs. The only way to execute big work well is to make the agent a high-level **orchestrator** that aggressively delegates deterministic, tightly-scoped tasks to fresh subagents. Decouple complex plans into independent tracks; the orchestrator runs the pipeline, subagents do the typing.

---

## The Gap-Review Gate (the heart of the method)

"Exclusively executable" is a *claim*. The only way to know it's true is to have cold eyes try to break it before any code is written. This is the operational core of the 90/10 philosophy — without it, the philosophy stays aspirational and agents revert to "this looks fine, let me code."

### Two things people conflate — keep them apart

| | In-session subagent pass | The fresh-instance gate |
| --- | --- | --- |
| **What** | the orchestrator spawns a subagent to review a chunk | a genuinely separate instance reviews the plan |
| **Where** | same session, same model state | a new Claude Code window, or a non-Claude tool (ChatGPT / Claude.ai), launched by the human |
| **Good for** | breadth, first-pass cleanup while drafting | *certifying* exclusively-executable before promotion |
| **Limit** | shares the session's blind spots & assumptions | — this is the real gate |

Subagent passes are useful early. **They are not the gate.** Promotion to a BUILD requires fresh-instance passes. An orchestrator that "reviews its own plan" or "spawns subagents instead" has **not** passed the gate, however thorough it was.

### Access determines what a reviewer can even find

A reviewer can only catch what its *access* lets it see. Run all three angles at least once — complementary, not redundant:

| Angle | Access | The only thing it can truly test |
| --- | --- | --- |
| **A — Cold / self-containment** | the plan doc ONLY, **no repo** | Is it *actually* exclusively executable? Anywhere it must open a file, guess, or recall is a defect. |
| **B — Fidelity** | plan + repo | Do the quoted before/after blocks match the real code? Will edits apply cleanly? |
| **C — Integration** | plan + repo + architecture doc | Does it fit the wider system (scoping, idempotency, resource caps, conventions, AR conflicts, stale pointers)? |

The **cold / no-repo** reviewer is the only one that can *prove* self-containment — it physically cannot fill a gap from the code, so wherever it gets stuck is exactly where your builder would have to guess. A subagent inside your session can never be angle A. Non-Claude tools are excellent at A (paste the doc, no repo). B and C are fresh Claude Code instances in the repo.

### The loop

1. **Orchestrator** drafts/extends the IMPLEMENT (living; sessions refine it). Optional: in-session subagent passes for first-draft breadth.
2. **Run the gate:** fresh instances, one per angle, **a new instance per pass** (no context contamination). Each writes findings to a file (`vX_Y_Z_GAP_REVIEW_<angle>.md`); a no-filesystem tool prints the full file contents to paste in.
3. **Orchestrator folds** real findings into IMPLEMENT; notes it in the SESSION log. A "gap" that's actually an architecture decision → pause, surface to the human (don't research it away). Watch for *plan drift* — fresh reviewers know only what the plan says, not what it's *for*, so they sometimes reshape the architecture; steer back or escalate.
4. **Repeat** until each angle's fresh pass returns nothing load-bearing.
5. **Stop conditions** (any): each angle finds only nitpicks (resolvable without research); OR an architecture decision surfaces (→ human); OR token/time budget hit (→ ask human).
6. **Gate clears → human approves → promote the chunk to a BUILD.** No code before this. The orchestrator who runs the BUILD writes a `BUILD_REPORT`; its findings flow back into IMPLEMENT.

**One drafting session is never the finished plan.** A pass that finds *anything* means you're not done — loop until a *fresh* pass of each angle finds nothing load-bearing. Subagents surfacing gaps is **not** permission to stop; it's proof there's more to find. The 90/10 ratio is **literal, not hyperbole**: an exclusively-executable plan takes multiple rounds, usually across multiple sessions. (Drafting/refining with one agent over several rounds is normal and good — *then* the fresh-instance gate certifies it.)

### Why this isn't the orchestrator's call — and why that's fine

Asking a plan's author to commission a hard critique of its own work is a conflict of interest — which is why the planner-confidence reflex ("it's ready," "I'll handle review myself") shows up *right here* and nowhere else in planning. So the decision to gate is **co-owned with the human and not waivable by the orchestrator.** And it's *safe*: a residual gap always survives (THE CORE #4). Found gaps are the method working. Make the plan maximally reviewable; don't defend it.

### A reviewer prompt you can adapt (so you stop hand-writing it)

Fill the brackets per project. Run angle A in a no-repo tool; B and C in fresh repo instances.

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT change code or existing docs — your only output is your findings (write them to `[vX_Y_Z_GAP_REVIEW_<A|B|C>.md]`, or print the full file contents if you have no filesystem).

CONTEXT
- `[path to the BUILD/IMPLEMENT]` is a packet a FRESH agent will execute against [this repo / from the doc alone], then test on [preview]. It is meant to be "exclusively executable": it embeds the exact current code and exact replacement for every edit, so the builder only LOCATES and APPLIES — never DISCOVERS or DECIDES.
- [Project landmines to respect — the hard-won truths, e.g. "the X integration's public docs are wrong for the loaded bundle; the real surface is Y." Give the reviewer these so it validates against reality, not training data.]

ANGLE — [pick one]
- A (cold / no-repo): you get ONLY the doc; its absence of a repo is the point. Find every place you'd have to open a file, guess, recall a library's behavior, or make a decision the doc didn't make for you.
- B (fidelity): open the files the doc edits; verify every before-block matches the repo and every after-block applies cleanly.
- C (integration): read `[architecture doc]` first; hunt system-fit gaps ([scoping], [idempotency], [resource caps], AR conflicts, stale pointers).

OUTPUT
- A gap list RANKED by how likely each is to derail the build: location, what's wrong/missing, the concrete fix.
- The single most important "if you fix one thing" insight.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
Be concrete: "Phase X mounts `[selector]` but Phase Y never defines it" beats "check the selectors."
```

### Why fresh instances (not re-used ones)

A reviewer who already saw draft v1 unconsciously fills gaps from memory instead of catching them. The cold-read reaction *is* the value. **A new instance per pass.** And different instances genuinely differ — different recall, different instincts, different paths — the same reason a team brings diverse people to a hard review.

---

## What "Exclusively Executable" Requires

The mechanical guarantees behind the claim. A BUILD that violates any of these isn't ready.

### Confirmed decisions only
The IMPLEMENT/BUILD the executing agent reads contains **only confirmed decisions** — no alternatives, no "we could X or Y," no "TBD," no "Decision Dn" markers. Everything was discussed, researched, and locked earlier. If a subagent surfaces a decision-shaped question mid-build, that's a real plan bug: **stop, surface to the human, fix the plan, continue. Never decide on the agent's own.** This is what makes "exclusively executable" mechanically true — the agent has nothing to decide, so it can't decide wrong.

### No mixed truth
Never put a known-wrong fact and the right one in the same context — an LLM can't be trusted to pick the right one consistently. Remove or fix **before** the agent sees the plan: stale paths, superseded decisions, "bug noted but not patched," "carry forward from vX" redirects, "Phase 0 fixes these bugs" folded into forward spec. Code-level fixes happen in a **prep session**; only the post-fix world enters the next IMPLEMENT. Closeouts / BUGS / FEEDBACK / prior IMPLEMENTs are *historical archive* — their content folds in as standing behavior; the executing agent never reads them. **Fix or remove, then execute. Don't ask an LLM to debug your context.**

### No pass-through between tracks
When a BUILD surfaces a gap/bug — even one affecting the next sequential track — **do not patch the next BUILD inline.** Finish the current scope (report it) → a planning session updates IMPLEMENT → the next BUILD is created *with the gap already resolved.* A packet carrying both correct and corrected info is mixed truth; pass-through erases the loop's value.

### The orchestrator's blueprint (parallel groundwork)
IMPLEMENT hands the executing orchestrator a starting point for parallel work so it doesn't design it cold — the operational answer to the Orchestration Paradox:
- **Subagent groupings** per phase: what runs in parallel, what dependencies sequence it, what context each subagent needs.
- **Boundaries of delegation:** what the orchestrator does NOT delegate (gate decisions, branch state, commit cadence, escalation, verification reads).
- **Placeholders as decouplers:** strict `<!-- PLACEHOLDER: ... -->` conventions sever cross-team dependencies (frontend builds against a placeholder while backend builds the real thing).
Treat groupings as a starting point, not a contract.

---

## The Artifact System

### Versioning — one internal counter, end to end

A three-part `vMAJOR.MINOR.PATCH` lives for the project's life, **starting at the first IMPLEMENT draft** and continuing through planning rounds into shipped releases. **Version numbers are internal artifacts that serve our work — not a customer-facing release counter.** One continuous track covers planning → rounds → ships.

| Position | Bumps when |
| --- | --- |
| **MAJOR** | Architectural rewrite, deployment-target change, breaking external change |
| **MINOR** | New feature, capability shift, breaking-but-internal change |
| **PATCH** | Bug fix, doc-only update, micro-tweak that doesn't change the feature surface |

Higher bump resets lower to zero (`v3.1.5` → `v3.2.0`). **No change, no bump; the number tracks changes regardless of source.** A planning round that meaningfully revises the doc bumps it: `v5_0_0_IMPLEMENT` → `v5_0_1` (after feedback) → `v5_0_2` (after a cold pass) → `v5_0_3` (exclusively executable). When the BUILD from `v5_0_3` ships clean, the git tag is `v5.0.3` — *the same number.* Plan version IS ship version when nothing changed between them.

*Why we don't reserve numbers for releases:* that's a UX gesture from when versions were dressed up for users; our lifecycle is 90% planning, so planning gets the same machinery. Users find a changelog fine without gap-free numbers. Each file's 2-line header says whether it's a planning revision or a ship artifact — **trust the header, not filename pattern-matching.**

**Delimiters:** dots everywhere (`v3.1.2`, git tags, commit messages) **except filenames**, which use underscores (`v3_1_2_IMPLEMENT.md`) — dots in filenames have caused tooling issues. **Git tags are pure numeric, no suffixes** (`v3.1.2`, never `v3.1.2-fix`); human labels go in the commit body / GitHub Release. Re-pointing a tag = delete + recreate, never `-v2`.

### The four file types (all in `docs/archive/vX_Y/`)

- **`vX_Y_Z_IMPLEMENT.md`** — the evolving plan for one initiative; the living roadmap (there is no separate MASTER). Iterates by revision; the highest-numbered one is active; nothing is deleted. Header: `Initiative` + `Revision driven by`.
- **`YYYY_MM_DD_SESH.md`** — the session log; date-named (event in time). Checkboxes marked **live**, not at the end. Header: `Driving` + `Type`. Close with footers: `## Session Notes`, `## Picked Up From / Stopped At`, `## Open Threads For Next Session`.
- **`vX_Y_Z_TRACK_<LETTER>_BUILD.md`** (or `vX_Y_Z_BUILD.md` for single-track/patch) — the frozen, exclusively-executable chunk handed to one orchestrator. Letter labels (A/B/C), not descriptive names that pigeonhole when scope grows. Created **only after the gap-gate clears.**
- **`vX_Y_Z_BUGS.md`** — bug log tied to a release. In patch mode, a confirmed cluster can promote straight to a small BUILD; the IMPLEMENT can simply be **renamed** to the next version, not "saved-as" a duplicate.

Plus dated **`YYYY_MM_DD_FEEDBACK.md`** (human review of an IMPLEMENT round) and **unversioned sketch files** (notes whose actionable content migrates into the next IMPLEMENT, then move to `processed/`).

### Two operating modes — route correctly

- **Initiative mode** (default for features): architecture involved, genuine planning. One IMPLEMENT iterated 0→1→2→… through the gap-gate, then split into one or more **TRACK BUILDs sized to natural execution boundaries** (a subsystem, a layer, a file cluster).
- **Patch mode** (bug fix / trivial polish, root cause known, no architecture): BUGS → small `vX_Y_Z_BUILD.md` → ship. The IMPLEMENT loop is skipped. The small-build pattern is *right* here and *wrong* for feature work.

> **The #1 trap (it stalled Thot): sizing initiative work as patch work** — cutting tiny BUILDs because the IMPLEMENT was structured by version-milestone. Initiative BUILDs are cut by execution boundary, **never** by feature/version unit.

### Roadmap ≠ build queue (how to chunk without fragmenting)

The IMPLEMENT is the roadmap *and* the detailed plan, at two depths — keep them separate:
- **The roadmap is coarse direction.** It names where things are headed; it is NOT a list of build units, and a milestone is NOT a version to ship.
- **Only the imminent slice is detailed to executable depth.** Detailing the *entire* future to build-depth in one file is the opposite failure — a bloated, unbuildable IMPLEMENT. (Anti-pattern seen on Thot: a ~350KB IMPLEMENT beside a near-empty BUILD stub — everything planned, nothing executable.)
- **Chunks promote to BUILD by readiness × execution boundary**, not by version. A chunk can be *large* (a whole subsystem) when that's the coherent boundary.

Two project shapes, same machinery:
- **Plan-it-all** (e.g. a store launch): research/plan the whole product to gap-free, then split into parallel TRACK BUILDs at one ship.
- **Incremental** (e.g. an app that grows): the IMPLEMENT carries the **full vision as direction** (so you build to accommodate what's coming), but you detail + gate + ship **one coherent slice at a time** by execution boundary. You do NOT invent a version number per feature to decide the slicing.

### Directory & master docs

```
docs/
├── archive/
│   ├── images/  resources/        ← diagrams; pulled-in API/tech references
│   ├── v1_0/  v1_1/  v2_0/ …       ← one subdir per MINOR; all that version's artifacts
├── research/  planning/            ← optional; only if active heavy research/planning
└── PROJECT_NAME.md                 ← living architecture / state / pitfalls doc
```

The highest-numbered `vX_Y_Z_IMPLEMENT.md` IS the roadmap — there is no `IMPLEMENT_MASTER`. Two master docs live outside the archive:

| Doc | Role | Updated when |
| --- | --- | --- |
| `docs/PROJECT_NAME.md` | architecture, current state, design system, pitfalls (living) | every non-trivial change ships |
| `.agent/DEV_RULES.md` | rules of engagement (this doc) | a convention is added/changed |

Reference content (schemas, glossary, diagrams) lives in `PROJECT_NAME.md` and `archive/resources/`, **not** in IMPLEMENT/BUILD — a forcing function that keeps PROJECT_NAME honest. Conflict resolution: a *past* IMPLEMENT vs PROJECT_NAME → **PROJECT_NAME wins** (it's living); the *current* IMPLEMENT vs PROJECT_NAME → **IMPLEMENT wins** (PROJECT_NAME was likely neglected — update it). **Nothing is deleted; dead ends stay as history so future agents see the live decisions in context.**

### IMPLEMENT template (the living roadmap)

```markdown
# v[X.Y.Z] Implementation Plan
**Initiative**: [what this initiative is]
**Revision driven by**: [initial draft / post-feedback / post-cold-review / lock-in review…]
**Required reading first**: docs/PROJECT_NAME.md · README.md · [archive/resources/* as applicable]
**If you find missing context**: PROJECT_NAME.md is living — confirm with the human and update it; don't paper over the gap here.

## Roadmap (coarse direction — NOT a build queue)
[Where this initiative is headed. Brief. Milestones are direction, not version-ships and not BUILD units.]

## Imminent slice — [name] (detailed to executable depth)
[The next coherent execution-boundary chunk: phases, file:line specifics, production-ready snippets, verification, rollback, subagent groupings. When this clears the gap-gate it promotes to a BUILD — sized by execution boundary, not by version.]

## Later (direction only)
[Bulleted direction for what follows. Detail arrives as a slice approaches the gate — not before.]

## Cross-references
[Architecture/glossary → PROJECT_NAME.md · API/schemas → archive/resources/ · branching/versioning → DEV_RULES.md]
```

### BUILD template (the frozen executable chunk)

```markdown
# v[X.Y.Z] Track [LETTER] Build Packet   (or: # v[X.Y.Z] Build Packet — [chunk]  for single-track/patch)
**Source**: extracted from vX_Y_Z_IMPLEMENT.md § [section]
**Branch**: [feat/fix branch]
**Required reading first**: docs/PROJECT_NAME.md · THIS doc only — do NOT read prior IMPLEMENTs, BUGS, or BUILD_REPORTs

## Pre-flight  [branch cut, deps, env, services]
## Phase 0: Setup
## Phase 1..N  [each step file:line specific; production-ready snippets, no placeholders]
## Verification  [per-phase + end-to-end; orchestrator records actual results in the BUILD_REPORT]
## Rollback  [per-phase]
## Subagent Groupings  [parallel execution plan]
## BUILD_REPORT_<source>.md to write when done:
  - what changed (file-by-file one-liners) · what deviated (ideally empty) · gaps/bugs surfaced (do NOT pass-through) · verification results
```

The orchestrator returns `BUILD_REPORT_<source>.md` in the same directory (`<source>` mirrors the BUILD name minus `_BUILD` — e.g. `BUILD_REPORT_v5_0_3_TRACK_A.md`). Its findings fold back into the next IMPLEMENT round.

---

## Git Branching & Merging

`main` = production-ready, tagged releases only (tested, bug-free, public-ready). `dev` = persistent integration/testing branch. `feat/*` and `fix/*` = temporary, deleted after merge.

**New project init:**
```bash
cd ~/Development && mkdir <project> && cd <project>
cp -R /Users/seanivore/Development/_git_init/. .
git init && git add . && git commit -m "chore: initial commit"
git branch -M main
gh repo create <project> --public --source=. --remote=origin
git push -u origin main
git checkout -b dev
```

**Feature → dev preview → ship:**
```bash
# 1. Start a feature off latest main
git checkout main && git pull origin main && git checkout -b feat/<name>

# 2. Ship through dev first (ff-merge keeps history linear), push → Vercel auto-deploys the dev preview
git checkout dev && git merge --ff-only feat/<name> && git push origin dev
```
**🛑 PAUSE.** Tell the human it's live on the dev preview URL (in README / PROJECT_NAME) with a one-line summary. Do NOT ship to main until they sign off. Bug? Fix on `feat/*`, ff-merge to `dev`, push, ping again — production is untouched until step 3.

```bash
# 3. Ship to main (after: tests pass · human signed off · PROJECT_NAME current · SESSION footers done ·
#    BUILD_REPORT folded back · package.json bumped if applicable · build succeeds)
git checkout main && git merge --ff-only dev && git push origin main
git tag vX.Y.Z && git push origin vX.Y.Z     # pure numeric tag, no suffix
```
After step 3, `dev` and `main` are at the same commit. The dev→main ff-merge model means dev is always at-or-ahead of main, never out of sync.

---

## Conventions

- **Commits:** `type(scope): brief [vX.Y.Z]` + body bullets (`feat fix docs style refactor test chore`); word them to mirror the BUILD chunk so history maps to plan.
- **Drift:** fix protocol drift you hit (whether or not you caused it); if unsure it's drift, confirm with the human first.
- **Research:** verify current docs while planning — never ship training-data recall as fact. Business-grade research only → `.agent/RESEARCH_PROTOCOL.md`.
- **Testing:** the BUILD carries the verification plan; the orchestrator records results in the BUILD_REPORT.
- **Syncing:** one canonical copy → every project via `filemgmt -f ~/Development -r <path>/.agent/DEV_RULES.md` (new shared files: `-a`). `.agent/PROJECT_LESSONS.md` is per-project, not synced.

---

## Agent Quickstart

**Read first (no exceptions):** `docs/PROJECT_NAME.md` → `README.md` → your assigned doc (a BUILD if executing; the highest-numbered `vX_Y_Z_IMPLEMENT.md` if planning) → `.agent/PROJECT_LESSONS.md` (skim).

**If you're planning, the gap-gate IS the job:** draft → fresh-instance review (3 angles) → fold → repeat → human approves → promote to BUILD. **No code before the gate.**

**As you work:** mark SESSION checkboxes live; if the plan is wrong, stop + surface + start a new SESSION (don't silently patch); confirm via `git diff` before commit.

**Before closing:** SESSION footers; `BUILD_REPORT_<source>.md` if you ran a BUILD; update `PROJECT_NAME.md` if architecture changed; commit mirroring the chunk.

**You do NOT:**
- read past IMPLEMENTs / BUGS / FEEDBACK / BUILD_REPORTs during a build (already folded into your BUILD);
- edit a current IMPLEMENT mid-build, or an earlier one to fold findings — copy to the next revision and edit the copy;
- write a separate "completion/walkthrough" file (footers go in SESSION; orchestrator findings in BUILD_REPORT);
- create archive dirs at major-version level (`v3_0/`, never `v3/`);
- put reference content in IMPLEMENT/BUILD (→ PROJECT_NAME / archive/resources);
- pass-through fixes between sequential tracks;
- **self-certify the plan, or substitute in-session subagents for the fresh-instance gap-review gate.**
