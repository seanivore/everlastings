# v3.7.3 — B/C/D reviewer launch kit (human-facilitated Claude Code)

The **scoped re-run RAN and folded to v3.7.3** — C integration NARROW, D design NARROW, + 2 breadth (journey + integration) all NARROW; validated + folded (trails at `v3_7_2_GAP_REVIEW_{C,D,BREADTH_JOURNEY,BREADTH_INTEGRATION}.md`; ledger 85–92). This card now drives the **v3.7.3 scoped re-run**: **B** + **C** + **D** — all lanes re-open, because the v3.7.3 folds added new byte-anchored content in every lane (B: the §8.1c(g) re-quote + policies/faq/styles.css CURRENT quotes; C: cart_holds/enforcers; D: header/lock/400) — + the 2-peer **breadth backstop** (charters below). Each reviewer confirms the v3.7.3 folds (ledger 85–92) landed + runs a fresh full-build pass. Run each as its **own fresh Sonnet-5·MAX peer** (a spawned peer or a fresh Claude Code window) so there's no context contamination. *(Each round's `GAP_REVIEW_*` trail stays standing at its version; the charters below are reused for the backstop.)*

## Per-window launch (do this in each reviewer window)

1. `cd /Users/seanivore/Development/everlastings-website`
2. `/model` → **Sonnet 5** · `/effort max`  (the effort dial is the whole point — a context-less reviewer only reads everything if pushed to)
3. Paste the reviewer's charge (below) as the first message.
4. When it finishes it writes `assets/docs/archive/v3_7/v3_7_3_GAP_REVIEW_<angle>.md` **and** prints its findings — paste that reply back here so the orchestrator validates + folds.

The build under review (all three, read end-to-end): `assets/docs/archive/v3_7/v3_7_3_IMPLEMENT.md` + `v3_7_3_ADDENDUM_DESIGN.md` + `v3_7_3_ADDENDUM_TESTING.md`. Source material resolves in the sibling `assets/docs/archive/v3_5/` per the docs' directory banner.

## B · C · D — use the self-contained blocks in `v3_7_3_REVIEW_PROMPTS.md`

Each is already paste-ready (complete lens + the full ledger 1–92 + false-alarm classes inlined). Open `v3_7_3_REVIEW_PROMPTS.md` and copy the whole fenced block under:
- **Angle B — fidelity (repo)** — byte-check every CURRENT block against the working tree; every NEW block applies cleanly + references only things that exist; DESIGN DECIDED blocks vs `design-handoff/out/`.
- **Angle C — integration (repo + architecture)** — read `assets/docs/EVERLASTINGS_STORE.md` first; the cross-system seams, the 11/12-function + 1-cron Vercel budget, the CRON_SECRET prod dependency, the sold-policy enforcers agreeing.
- **Angle D — design-correctness (repo + design addendum + design research)** — read `design-handoff/brief.md`, `out/`, `feedback/FEEDBACK_v1.md`, `controls.html` + `tokens.css`, `reference/`.

All three carry the same charge shape: verify the v3.6.6/.7 A-round-1 folds landed coherently in your lane (§1.3b config anchor, §5.4c.i `.mitem--errored`, §10.1c GPT publish-set, §2.6 X-Actor, §2.7 strict-gate RESOLVED, CRON_SECRET, reconciliation), then hunt any NEW gap across the whole build. Do NOT re-raise ledger 1–92.

## Breadth — owner-journey (paste this whole block)

```
You are doing a fresh owner-journey breadth review of a converged build package (v3.7.3), in this repo. Effort: MAXIMUM — read the three build docs END-TO-END, do not skim.

THESIS (judge everything against it): the product minimizes the maker's (Emaline's) friction. She manages the store mostly through her Custom GPT on her phone; she opens the `/admin` Content Creator Portal only to *fix* something. Both surfaces (GPT + portal) must be fully capable as if the other didn't exist. A "gap" is anything that makes a real maker journey confusing, dead-end, or silently wrong.

DOCS (read all three, in `assets/docs/archive/v3_7/`): v3_7_3_IMPLEMENT.md (10 workstreams) + v3_7_3_ADDENDUM_DESIGN.md + v3_7_3_ADDENDUM_TESTING.md. Source material (design-handoff, GPT files, ROADMAP) is in the sibling assets/docs/archive/v3_5/. The settled "do not re-raise" ledger (entries 1–92) is inside v3_7_3_REVIEW_PROMPTS.md — read it and do NOT re-raise those.

YOUR LENS — walk the maker's real journeys end-to-end and find where a FOLD could have broken a flow (convergence is non-monotonic; a fix can seed the next bug). Trace at least these, across BOTH surfaces (portal AND GPT):
- Create a piece → fill fields → publish. (Does the strict publish gate §2.7 dead-end anywhere? Does the GPT collect the full publish set §10.1c so it doesn't hit a 400? Are the plain-words 400 reasons legible?)
- Put a piece back up for sale (Available OFF→ON round-trip, §2.2 + the commitAvail ON seam) — does the 400 SURFACE, never a silent no-op?
- Run a store-wide sale (set → struck pricing + top bar + popup on-site → end it) on BOTH surfaces. (Can the GPT identify + end the auto_apply sale?)
- A sale completes → order appears → mark shipped → refund (per-piece/partial). (Seen/unseen tracking, the activity log, the even-split refund.)
- Schedule a publish for later (does it actually fire? the CRON_SECRET prod dependency.)
- Media upload modal — a partial-failure mid-fan-out (does it recover legibly, §5.4c.i .mitem--errored?).
Flag anything that reads as "it just didn't work and didn't say why." Flag-don't-assert: if a finding depends on runtime you can't see, FLAG it needs-verification, never assert "broken."

OUTPUT — write your findings to assets/docs/archive/v3_7/v3_7_3_GAP_REVIEW_BREADTH_JOURNEY.md AND return them as your final reply. For each: [severity: LOAD-BEARING / POLISH] · the journey it breaks · where (doc §/file:line) · the failure scenario · the fix or the decision it needs. End with a one-line verdict: READY / NEEDS ANOTHER PASS / NEEDS ANOTHER PASS (NARROW). A clean pass still surfaces polish — "nothing found" is a failure of the review, not a pass.
```

## Breadth — integration (paste this whole block)

```
You are doing a fresh integration/systems breadth review of a converged build package (v3.7.3), in this repo. Effort: MAXIMUM — read the three build docs END-TO-END, do not skim.

THESIS (context): the product minimizes the maker's friction across two fully-capable surfaces (Custom GPT + the /admin portal). Your job is the systems-level fold-regression check — the cross-lane backstop behind the B/C/D angle reviews.

DOCS (read all three, in assets/docs/archive/v3_7/): v3_7_3_IMPLEMENT.md + v3_7_3_ADDENDUM_DESIGN.md + v3_7_3_ADDENDUM_TESTING.md. Source material is in the sibling assets/docs/archive/v3_5/. The settled "do not re-raise" ledger (1–92) is inside v3_7_3_REVIEW_PROMPTS.md — read it; do NOT re-raise those.

YOUR LENS — hunt where the A-round-1 folds (ledger 57–72) created a NEW cross-system seam or contradiction:
- Shared-file edit coordination (ledger 25–27 + the §"Shared-file edit coordination" list): after WS2's products.ts edits, do WS4's + WS8's CURRENT anchors still match? Does shop.js/homepage.js's WS6→WS4→WS9 merged card block leave exactly ONE render per line with no reverted edit?
- The sold-policy enforcers must AGREE: computeState() [WS2] ↔ storefront buy-gate published&&quantity>0 [WS6] ↔ the server checkout/reserve gate available===true&&quantity>=1 [4th enforcer] ↔ record_sale [WS7]. Trace a qty-0 piece and a null-qty legacy row through all four — any display-vs-buy contradiction?
- The Vercel budget invariant: 11/12 serverless functions + 1 daily cron (/api/product-feed 0 9 * * *). Does any fold add a function or cron? (It must fold into existing ones.)
- CRON_SECRET: a NEW production dependency gating BOTH scheduled-publish (§2.6) and reconciliation (§7.3). Is the go-live handoff coherent?
- The GPT instruction .txt hard cap (8000): §10.1c claims schema-only, .txt stays 7988/8000 — does any other WS10 fold touch the .txt and blow the 12-byte headroom?
- X-Actor / resolveActor attribution (§2.6): does a cron-driven scheduled publish attribute correctly?
Flag-don't-assert: FLAG needs-verification when you can't see the runtime; never assert "broken" from training data.

OUTPUT — write your findings to assets/docs/archive/v3_7/v3_7_3_GAP_REVIEW_BREADTH_INTEGRATION.md AND return them as your final reply. For each: [severity] · the systems seam · where (doc §/file:line) · the failure scenario · the fix. End with a one-line verdict: READY / NEEDS ANOTHER PASS / NEEDS ANOTHER PASS (NARROW). A clean pass still surfaces polish.
```
