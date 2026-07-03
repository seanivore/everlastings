# v3.6.4 — Gap Review A (FALSE START — superseded; do NOT treat as a gate result)

**This file is not a completed cold-A. Ignore its (lost) verdict.**

A cold-A reviewer ran here against the **broken v3.6.4 REVIEW_PROMPTS**: the Angle-A fenced block still carried literal `[REVIEW LENS]` / `[SETTLED BASE]` / `[LANDMINES]` placeholders, and B/C/D had no fenced block at all. Under the Agent-SDK **courier model** (the gate ships each `## Angle X` fenced block verbatim to a fresh, no-context reviewer), the reviewer was handed placeholder text instead of the review lens, the settled base, and the "do not re-raise" ledger — i.e. it was starved. Its file-write then tangled (a Monitor-tool dispute), so the actual findings never landed; only a garbled meta-note survived. It wrongly concluded **"gate closed."** None of that is trustworthy.

**Superseded by the v3.6.5 QA pre-flight** (`v3_6_5_REVIEW_PROMPTS.md`, ledger entry 56):
- The REVIEW_PROMPTS driver was repaired to the **courier-safe four-block form** — all four A/B/C/D blocks now inline the complete lens + settled base + ledger (1–56) + false-alarm classes, and the output contract is "return findings as your reply," never a file-write (the exact failure mode that lost this file's findings).
- Both breadth lenses re-verified the consolidated triplet intact at v3.6.5 (`v3_6_5_GAP_REVIEW_BREADTH_{JOURNEY,INTEGRATION}.md`).
- The **real** gate-exit cold-A runs against `v3_6_5_REVIEW_PROMPTS.md`; its findings land in `v3_6_5_GAP_REVIEW_A.md`, **not here**.

The one substantive lead this false start gestured at (a testing-plan check nit) was independently re-found and **folded** by the v3.6.5 integration breadth lens (integration-F1: the TESTING static-gate "every summary/description < 300" wording, now scoped + soft-capped). Nothing else here is load-bearing.

*(Kept as a rigor-trail marker that a v3.6.4 cold-A was attempted-and-invalid — not deleted, so the record is honest — but carrying no gate authority.)*
