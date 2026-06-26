// Content Creator Portal — design-research funnel (Workflow script).
// Run in a FRESH session:  Workflow({ scriptPath: 'assets/docs/archive/v3_5/v3_5_0_portal_design_funnel.mjs' })
// Designs against the brief at assets/docs/archive/v3_5/v3_5_0_PORTAL_REQUIREMENTS.md.
// Flow: R1 research+pitch (5 lenses, web-grounded) + compile → R2 board debate (case→critique→rebuttal)
//       → R3 CEO decision → R4 render the decided components as real vanilla HTML/CSS. Returns the brief + components.

export const meta = {
  name: 'portal-design-funnel',
  description: 'Design-research funnel for the Content Creator Portal redesign: research+pitch → board debate → C-suite decision → renderable vanilla component set',
  phases: [
    { title: 'R1 Research + Pitch' },
    { title: 'R2 Board Debate' },
    { title: 'R3 Decision' },
    { title: 'R4 Render' },
  ],
}

const BRIEF = 'assets/docs/archive/v3_5/v3_5_0_PORTAL_REQUIREMENTS.md'
const readBrief = `FIRST read the design brief at ${BRIEF} in full — it is the design target: who it's for (a maker on a phone in the studio), the bar (clean/tasteful/confident, tactile, intent-over-data-model), the HARD constraint (vanilla HTML/CSS/JS only — no React/Tailwind/build; shadcn is the look, not the library), the full feature set, and the deliverable. Confirm you read it.`

const PITCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lens', 'direction', 'ia', 'components', 'sources'],
  properties: {
    lens: { type: 'string' },
    direction: { type: 'string', description: '200-350 words: proposed look/feel, palette intent, typography, density, and motion/tactility language — clean/tasteful/confident, vanilla-buildable' },
    ia: { type: 'string', description: 'information architecture: nav model + the pieces grid + the editor layout, mobile-first' },
    components: { type: 'string', description: 'ONE self-contained renderable HTML document (inline <style>) sketching 2-3 signature components in this direction (e.g. a tactile button, a toggle, a product tile) — vanilla only, opens in a browser' },
    sources: { type: 'array', items: { type: 'string' }, description: 'URLs of the live 2026 design sources consulted' },
  },
}

const LENSES = [
  { key: 'trends-2026', brief: 'LENS — 2026 design trends. Use WebSearch (load it via ToolSearch if needed) for current 2026 UI/dashboard/admin trends: what is FRESH and what is already going STALE. Propose a direction that is current without chasing fads. Name specific trends + cite sources.' },
  { key: 'palette-type', brief: 'LENS — palette + typography + the "clean, tasteful, confident" look (shadcn-grade, in vanilla CSS). Propose the color system (light, plus dark if apt), type pairing, spacing/density, radii/shadows — quiet excellence, not camp. WebSearch references.' },
  { key: 'motion-tactility', brief: 'LENS — motion + tactility + micro-interaction. Propose the interaction language so EVERY control visibly responds (press/hover/focus/state transitions) in pure CSS (+ minimal JS), with reduced-motion support. WebSearch "tactile UI" / "CSS micro-interactions 2026".' },
  { key: 'mobile-first', brief: 'LENS — mobile-first patterns + component systems. The primary user is on a PHONE in the studio. Propose the mobile layout/nav/editor patterns first, then how they adapt up. Translate the shadcn component language into vanilla. WebSearch mobile dashboard/admin patterns 2026.' },
  { key: 'innovation', brief: 'LENS — innovation + showcase-worthiness. This is a sellable template; propose what makes a buyer say "I want that." One or two genuinely fresh, tasteful ideas (not gimmicks). WebSearch standout dashboard designs 2026.' },
]

phase('R1 Research + Pitch')
const pitches = (await parallel(LENSES.map((l) => () =>
  agent(`${readBrief}\n\n${l.brief}\n\nThen produce your PITCH per the schema: a design direction, an IA, and ONE renderable vanilla HTML component sketch (inline <style>, 2-3 signature components). Strictly vanilla HTML/CSS/JS.`,
    { label: `R1:${l.key}`, phase: 'R1 Research + Pitch', schema: PITCH_SCHEMA }),
))).filter(Boolean)

const corpus = await agent(
  `${readBrief}\n\nYou are the R1 COMPILER. The ${pitches.length} lens pitches as JSON:\n${JSON.stringify(pitches)}\n\nCompile ONE reusable research+pitch corpus for the later rounds: the distinct directions on the table, the strongest trend findings (with sources), the points of agreement + tension, and the candidate components. Faithful + organized; do NOT pick a winner.`,
  { label: 'R1:compile', phase: 'R1 Research + Pitch' },
)

const EXECS = [
  { key: 'design', role: 'Head of Design (aesthetics, craft, taste — beautiful + confident, not camp?)' },
  { key: 'ux', role: 'Head of UX (usability, intent-over-data-model, the two-speed publish model, clarity for a non-technical maker)' },
  { key: 'product', role: 'Head of Product (serves the maker on a phone in the studio? covers every capability in the brief?)' },
  { key: 'brand', role: 'Head of Brand (the clean/tasteful/confident bar + reusable-template fit + showcase-worthiness)' },
  { key: 'eng', role: 'Head of Engineering (is every component genuinely buildable in vanilla HTML/CSS/JS — no React/Tailwind/build? hold a hard veto on anything that is not)' },
]

phase('R2 Board Debate')
const cases = (await parallel(EXECS.map((e) => () =>
  agent(`${readBrief}\n\nYou are the ${e.role}. The R1 corpus:\n${corpus}\n\nMake your CASE: which direction (or synthesis) the portal should take, judged through YOUR lens, with concrete reasons + the trade-offs you accept. 250-450 words.`,
    { label: `R2-case:${e.key}`, phase: 'R2 Board Debate' }).then((text) => ({ key: e.key, role: e.role, text })),
))).filter(Boolean)

const critiques = (await parallel(EXECS.map((e) => () =>
  agent(`${readBrief}\n\nYou are the ${e.role}. All board cases:\n${cases.map((c) => `### ${c.role}\n${c.text}`).join('\n\n')}\n\nCRITIQUE the others through your lens — where they are right, where they are wrong or risky, what they miss. Sharp + specific, not polite. 200-400 words.`,
    { label: `R2-critique:${e.key}`, phase: 'R2 Board Debate' }).then((text) => ({ key: e.key, role: e.role, text })),
))).filter(Boolean)

const rebuttals = (await parallel(EXECS.map((e) => () => {
  const mine = cases.find((c) => c.key === e.key)
  const againstMe = critiques.filter((c) => c.key !== e.key).map((c) => `### ${c.role}:\n${c.text}`).join('\n\n')
  return agent(`${readBrief}\n\nYou are the ${e.role}. Your case was:\n${mine ? mine.text : '(none)'}\n\nCritiques touching it:\n${againstMe}\n\nREBUT: concede what is fair, defend what holds, refine your recommendation. 150-300 words.`,
    { label: `R2-rebut:${e.key}`, phase: 'R2 Board Debate' }).then((text) => ({ key: e.key, role: e.role, text }))
}))).filter(Boolean)

const DECISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['direction', 'palette', 'typography', 'motion', 'ia', 'components_to_render', 'rationale', 'open_risks'],
  properties: {
    direction: { type: 'string', description: 'the decided design direction (look/feel/voice), 250-450 words' },
    palette: { type: 'string', description: 'the chosen color system as concrete values/tokens (light + dark if apt)' },
    typography: { type: 'string' },
    motion: { type: 'string', description: 'the tactility/motion language + how it is achieved in vanilla CSS' },
    ia: { type: 'string', description: 'the information architecture: nav + pieces grid + editor, mobile-first' },
    components_to_render: { type: 'array', items: { type: 'string' }, description: 'the component list R4 must produce' },
    rationale: { type: 'string' },
    open_risks: { type: 'string' },
  },
}

phase('R3 Decision')
const decision = await agent(
  `${readBrief}\n\nYou are the CEO moderating the final decision. Inputs —\n\nCORPUS:\n${corpus}\n\nCASES:\n${cases.map((c) => `### ${c.role}\n${c.text}`).join('\n\n')}\n\nCRITIQUES:\n${critiques.map((c) => `### ${c.role}\n${c.text}`).join('\n\n')}\n\nREBUTTALS:\n${rebuttals.map((c) => `### ${c.role}\n${c.text}`).join('\n\n')}\n\nDecide ONE coherent direction for the Content Creator Portal — graft the best ideas from the runners-up. Honor the Engineering veto (vanilla-only). Output per the schema, including the concrete component list R4 must render.`,
  { label: 'R3:CEO', phase: 'R3 Decision', schema: DECISION_SCHEMA },
)

const RENDER_CLUSTERS = [
  { key: 'controls', items: 'a tactile button (all variants + press/hover/focus/disabled states), a toggle/switch, a text input + a select, and a tab/segment control or left-rail nav item' },
  { key: 'pieces', items: 'a product tile with a state tag, the full state badge/pill set (Live, Draft, Sold, Edits-pending, Archived), and a card/section container' },
  { key: 'editor', items: "the editor's action/publish bar (always-visible, conditionally-enabled, explains what is missing), a media upload zone, and a labeled form-field group" },
]

phase('R4 Render')
const rendered = (await parallel(RENDER_CLUSTERS.map((c) => () =>
  agent(`${readBrief}\n\nBuild to this DECIDED direction:\n${JSON.stringify(decision)}\n\nProduce ONE self-contained HTML document (single inline <style>) implementing these components EXACTLY in the decided direction — vanilla HTML/CSS/JS only, mobile-first, with real tactile press/hover/focus states + reduced-motion support: ${c.items}. It must open in a browser and look finished. Return only the HTML document.`,
    { label: `R4:${c.key}`, phase: 'R4 Render' }).then((html) => ({ cluster: c.key, html })),
))).filter(Boolean)

return { decision, components: rendered, debate: { cases, critiques, rebuttals }, corpus, pitches }
