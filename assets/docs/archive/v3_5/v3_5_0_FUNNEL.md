# Content Creator Portal — Design Funnel (run guide + launch package)

The multi-round design-research funnel that decides the redesign direction and hands back **renderable vanilla component concepts**. Designed against `v3_5_0_PORTAL_REQUIREMENTS.md`. Runnable script: **`v3_5_0_portal_design_funnel.mjs`** (same folder).

> **Run it in a FRESH session** (clean context). Crafted here; launched there via the compact arg + first message below.

---

## What it does (the rounds)

- **R1 — Research + Pitch (6 agents).** Five distinct lenses, each web-searching live 2026 sources, each returning a *direction + IA + one renderable vanilla HTML component sketch*: ① 2026 trends (fresh vs stale) · ② palette + type + the clean/tasteful/confident look · ③ motion/tactility · ④ mobile-first patterns · ⑤ innovation/showcase. A 6th agent **compiles** them into one reusable corpus.
- **R2 — Board Debate (5 exec lenses × case → critique → rebuttal).** Design, UX, Product, Brand, and Engineering (with a hard **vanilla-only veto**) argue in writing: make the case → critique the others → rebut.
- **R3 — Decision (CEO).** Synthesizes the debate into **one** coherent direction (grafting the best runner-up ideas), honoring the Eng veto. Returns a structured decision: direction, palette, typography, motion language, IA, and the **component list to render**.
- **R4 — Render (3 agents).** Builds the decided components as **real, self-contained vanilla HTML/CSS** documents (controls · pieces · editor) — open in a browser, tactile, mobile-first.

**Returns:** `{ decision, components (rendered HTML), debate, corpus, pitches }`.

## After the run (synthesis — done by the main loop in the fresh session)
1. Save each `components[].html` to a file and open it to eyeball the real components.
2. Compare the `decision` against the raw `corpus`/`pitches` — sanity-check the call.
3. Write the **design brief** (`v3_5_0_PORTAL_DESIGN_BRIEF.md`): the chosen direction + the kept component concepts + IA. That brief feeds the **build plan → gap reviews (Agent SDK) → execute** sequence.

## How to run
```
Workflow({ scriptPath: 'assets/docs/archive/v3_5/v3_5_0_portal_design_funnel.mjs' })
```
~26 agents, web research included. Watch progress with `/workflows`. It's bounded; let it run.

---

## Launch package (start the fresh session)

### 1) Compact arg — paste after `/compact`
> Continuing Everlastings. **v3.3 is SHIPPED** (`main` @ tag `v3.3.0`, commit `3cfe4d3`, deploying to prod); Em previews on **dev** (test mode); the prod cutover is **deferred** (gated on her readiness — see `assets/docs/archive/v3_5/v3_5_0_ROADMAP.md` §A). Today's job: **run the Content Creator Portal design funnel** — the first phase of redesigning `/admin` into a polished, **mobile-first**, intent-based, productizable dashboard ("Content Creator Portal"). The funnel is fully crafted: design target = `assets/docs/archive/v3_5/v3_5_0_PORTAL_REQUIREMENTS.md` (read it), run guide = `assets/docs/archive/v3_5/v3_5_0_FUNNEL.md`, runnable Workflow = `assets/docs/archive/v3_5/v3_5_0_portal_design_funnel.mjs`. **Next action:** run `Workflow({ scriptPath: 'assets/docs/archive/v3_5/v3_5_0_portal_design_funnel.mjs' })`, then synthesize the result into `v3_5_0_PORTAL_DESIGN_BRIEF.md` (save each rendered component HTML to a file + open it; sanity-check the decision vs the raw research). The aesthetic bar = **clean/tasteful/confident — NOT "neutral"** (Sean's resume analogy; shadcn IS the look); stack = **vanilla HTML/CSS/JS only** (no React/Tailwind/build — shadcn/ui is React, borrow the language not the lib); the deliverable must include **renderable vanilla component concepts** (visuals > words). After the brief: build plan → **gap reviews via Sean's new Agent-SDK automation** → execute. Versioning is loose (packaged module). Full v3.5 backlog + the redesign rationale: `v3_5_0_ROADMAP.md` + memory `project_v3_5_0_storewide_sales.md`. Likely-question topics: the aesthetic framing, scheduled-publishing stretch goal, mobile-first nav (left-rail?), how the funnel's renderable components feed the build.

### 2) First message — send after compacting
> Run the Content Creator Portal design funnel: `Workflow({ scriptPath: 'assets/docs/archive/v3_5/v3_5_0_portal_design_funnel.mjs' })`. When it finishes, save each rendered component HTML to its own file so I can open them, sanity-check the CEO's decision against the raw research, and write me the `v3_5_0_PORTAL_DESIGN_BRIEF.md` (chosen direction + kept component concepts + IA). Then stop and let me review before any build.

---

## Notes
- The funnel produces **direction + component concepts**, not the finished portal. Build comes after the brief (with gap reviews).
- Current-state `/admin` screenshots (the annotated walkthrough) are deliberately **not** fed to the design agents — they design to the requirements, not the current mess. Keep those as an internal reference only.
- If web search is unavailable to a workflow agent, it falls back to knowledge — note that in the run if it happens (we want *live* 2026 trends).
