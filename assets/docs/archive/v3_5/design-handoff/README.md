# Content Creator Portal — Design Handoff

This folder is a **self-contained design brief** for redesigning the Everlastings store admin into the **Content Creator Portal**. It deliberately contains **no application code** — design to the contract here; don't integrate.

## The boundary (Important)
  - **Design** all five surfaces as polished, mobile-first, **vanilla HTML/CSS/JS** pages — **one variation**.
  - You may design **one surface at a time** — finish each before the next.
  - **Do not** modify or wire any backend, and **do not** integrate the design into the app. A separate **gap-review + integration pass** (in Claude Code) handles that. This is non-negotiable — the project is far enough along that we integrate deliberately, with reviews.
  - Put your output in **`out/`**.

## Read order
  1. **`brief.md`** — the design definition: the thesis (entropy-lowering details in familiar layouts), the KILL list, the layout model for each surface, the color system, the mobile rules.
  2. **`data-flow.md`** — the literal data + endpoint **contract** per surface (entities, field types, actions, and the loading/empty/error/permission states to design). *Design to it; don't implement it.*
  3. **`controls.html`** — the **aesthetic anchor**. This is the look — match its type, spacing, containers, and nav exactly. Opens standalone in a browser.
  4. **`tokens.css`** — the anchor's exact token values (OKLCH color, type, radii, shadows, motion). Lift them; don't approximate.
  5. **`reference/`** — Sean's annotated screenshots + **`LEGEND.md`** (what to keep, what to kill, the row + simple-form layout targets).

## The five surfaces
**Products** (spreadsheet rows → expand to a simple form) · **Orders** (a CRM — buyers as people) · **Sales** (plain-money coupon cards + a no-code store-wide sale) · **Account** (sign in/out + View Site). Nav comes from `controls.html`.

## The one-line spirit
Innovate in the *small* entropy-lowering details (a row LED, field-border rings, hard toggles, preview-anytime) and wrap them in *familiar* layouts (rows + plain forms). The previous pass over-innovated on layout (tiles, nested components) and raised cognitive load — that's the failure mode to avoid. Mobile is the **primary** context; make it perfect.

## Output
`out/` — page designs for Products, Orders, Sales, Account (and the product editor), mobile + desktop, as openable vanilla HTML/CSS/JS matching `controls.html`. If you'd vary on an axis, vary the per-surface IA/flow; keep the visual treatment locked to the anchor.

## Consolidated Documents

**NOT TO BE READ UNLESS ABSOLUTELY NECESSARY, LIKELY IF SEAN RECOMMENDED LOOKING FOR SOMETHING SPECIFIC IN NEED FOR CLARIFICATION OR ANOTHER WAY OF EXPLAINING OR FRAMING SOMETHING.**

These documents have already been reviewed and consolidated into the documentation provided in the Claude Code `assets/docs/archive/v3_5/design-handoff` directory. They should not be read unless additional clarification is needed or if directed due to suspecting something in the consolidated materials is missing from the originals, all of which are in the directory `assets/docs/archive/v3_5/portal-design-funnel` in order to find the specific files noted below. 

  - **`v3_5_0_PORTAL_FEEDBACK.md`** — Sean's feedback and original source of the annotated screenshots included in the `design-handoff/` directory. If more details are needed regarding any of these points, you may search using the the filename of the screenshot to find that information in this feedback document. It isn't a required read because the important parts should all be in the handoff documents, but also because there is a lot of feedback that is specifically pointing out things *NOT* to do from the other HTML files created by the sub-agent research and design funnel. 
  - **`v3_5_0_portal_render_controls.html`** — the primary HTML file from the design funnel that the design handoff materials are based on; this was the much loved results and only required some additional details regarding mobile-first responsive design fixes. 
  - **`v3_5_0_portal_render_editor.html`** — the first of two out of the three results from the design funnel that have almost nothing positive to take away other than one or two notes, again, all of which have been consolidated into the design handoff documents. 
  - **`v3_5_0_portal_render_pieces.html`** — the final of the three design funnel results and second of the two very poor results. There was virtually nothing positive to be said about this design and all feedback was about what not to do. The biggest takeaway from the two negative feedback results was just that there was no need to be putting information in unnecessary components instead of using standard spreadsheet-vibe and page-form layouts, for which Webflow screenshots were provided to clarify, but not provided as best practice examples to replicate aesthetics from. 

Any other documents in the `portal-design-funnel/` directory are not recommended to read. These other documents were provided to the subagents in the workflow and therefore are likely to hold specifics and directives that were either inaccurate, dated after minds were changed, or not adequately communicated concepts that resulted in poor HTML designs in the latter of the two HTML outputs mentioned above. 