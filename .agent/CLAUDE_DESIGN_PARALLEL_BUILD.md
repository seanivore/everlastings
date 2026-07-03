# Claude Design × Claude Code — Parallel Build Workflow

**Updated**: 2026-07-03 · **Tools**: `claude.ai/design` (front end, sandboxed) + Claude Code (back end + integration, the live repo) · **Status**: working method; first live run = the Everlastings admin overhaul

---

## When to use

Building a surface where the front end deserves real design — a client-facing app, a management dashboard, a digital product from scratch. The trigger principle: now that writing code is cheap, build the **admin/creator** experience with the same care as the **end-user** experience — treat the client like we treat the client's customers.

**Two tools, one seam.** **Claude Design** builds the front end in a *sandboxed* workspace: fast, real design, but it is NOT the git repo and it is blind to the back end — it syncs to the repo only by explicitly copying files across. **Claude Code** (here) owns the back end + integration: the data contract, the database/API, the wiring, the gap reviews.

## The flow

1. **High-level requirements** — the shared starting point.
2. **Components + the data contract** — list the components/UI you need, and *right alongside it* what the back end can actually store and do (the fields, the save/publish rules, what locks after publish, what Stripe/etc. allows). Pin the contract HERE so the front end designs against something real, not a guess. Retrofits skip this step — that is why they get bumpy.
3. **Aesthetic** — start with one or a few concepts, then run the multi-agent design funnel (16+ agents) to pick a direction. This is the proven front door; it is what kicked off the Everlastings redesign.
4. **Hand to Claude Design** — give them the component list + the data contract, and ask them to expand wherever the design ends up going further than the plan. Designing against the real contract is what prevents most "oh, the back end needs to handle this" surprises.
5. **Pass back + integrate** — Claude Design returns the built front end plus a **reverse-handoff**: a changelog of what changed + open questions needing back-end answers. Claude Code confirms the drop-ins, reviews the changed files line-by-line for hidden back-end needs (see the trap below), wires the back end, runs the gap reviews, and answers the questions.

## PORTABLE vs SEAM — and the "safe to copy" trap

Claude Design tags each changed file. **PORTABLE** = pure front end (`*.html`, `*-app.js`, `portal.js`/`portal.css`) — mechanically safe to drop into the repo; the copy won't break the server or the build. **SEAM** = a file where mock data stands in for the real back end (e.g. `data.js`) — port the added helpers/fields, never overwrite the real data layer with the mock arrays.

**The trap (load-bearing):** "PORTABLE / safe to copy" only means the copy won't *mechanically* break anything. It does NOT mean the change is **back-end-neutral**. The whole reason a file changed is that the UX improved — and a UX change can quietly need something new from the back end (a field to store, a validation rule, an option like "no end date," a gallery order that must persist). You cannot tell which front-end changes carry a back-end need by reading the tag — only by reading the diff. **That unknown is the entire point of the line-by-line review at step 5:** it is not a mechanical safety check, it is the hunt for back-end work the front end silently created. Everything it finds goes both directions — back-end work for us, and notes back to Claude Design for anything the front end got wrong.

## The loop — don't engineer it away

Using the fast prototype surfaces requirements you could not spec up front — "oh, it needs to work *this* way." That is not a planning failure; it is the superpower of prototyping this fast. The reverse-handoff (changelog + open questions) IS that loop — keep it cheap and explicit, and expect at least one lap. End goal: get the PORTABLE files close to byte-identical on both sides, plus a lightweight record of which version is where, so "drop-in" doesn't quietly rot into "drifted."

## Retrofit caveat

This loop feels bumpy when you are *replacing* an existing thing (like the Everlastings 90s admin) rather than building from scratch — the front end gets prototyped before the contract is pinned, so the back end plays catch-up and bugs surface late. From scratch, with the contract set at step 2, the loop is small and smooth. Expect the retrofit version to be messier; that is the situation, not the method breaking.

## See also

`.agent/DEV_RULES.md` (the build method + the gap-review loop) · `.agent/CLAUDE_DESIGN_ANIM_SITE.md` (Claude Design for animated marketing sites — the visual-FX recipe) · worked example: the Everlastings reverse-handoff at `assets/docs/archive/v4_0/from-claude-design/` (`CHANGELOG_GAPS.md` + `OPEN_QUESTIONS.md`).
