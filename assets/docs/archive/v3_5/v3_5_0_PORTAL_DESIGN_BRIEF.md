# Content Creator Portal — Design Brief

The chosen design direction for the `/admin` → **Content Creator Portal** redesign, synthesized from the design-research funnel (`v3_5_0_portal_design_funnel.mjs`, run 2026-06-26: 5 web-grounded research lenses → 5-exec board debate → CEO decision → rendered vanilla components). This brief is the build-feeding doc: it carries the direction, the concrete token system, the information architecture, and the kept component concepts. It feeds the next step — **build plan → gap reviews → execute**.

Designed against `v3_5_0_PORTAL_REQUIREMENTS.md`. Stack is unchanged: **vanilla HTML/CSS/JS only** (shadcn is the *look*, not the library).

---

## The three rendered component files (open these in a browser)

Real, self-contained vanilla HTML/CSS/JS — the visual proof of the direction. Open each directly; resize the window to see the mobile-first layout adapt.

- **`v3_5_0_portal_render_controls.html`** — tactile button (frequency-scaled press), the "Available" toggle, text input / select / `$`-price field, the segmented state filter, the nav (bottom tab bar ↔ desktop rail), and the full state badge/pill set.
- **`v3_5_0_portal_render_pieces.html`** — the product tiles with the **Live Line** edge + corner state pill, the self-evident pill set (no legend), the container-query tile (one component, phone grid + desktop rail), and the two-speed "live now vs waiting" card.
- **`v3_5_0_portal_render_editor.html`** — the centerpiece: the **Studio Dock** (always-visible action bar that names the blocker + counts pending edits), the upload-first media zone, the two-speed editor cards, plus the system-reuse proofs — the **refund sheet** (one payment / multiple pieces / partial / per-piece relist) and the **Sales card** with the no-code store-wide auto-sale toggle.

---

## 1. The direction — "Studio Slate — the Live Line"

One coherent system, not a skin. Honest, quiet indigo-slate depth at the shadcn bar: near-monochrome cool surfaces, hairline borders, generous whitespace, and **layered shadows that carry elevation as information** — a tile sits flush, the Dock floats, a pressed control sinks into a recessed well. The maker's photos supply all the warmth and color; the chrome stays disciplined.

Two structural devices are the memorable hooks (the thing a template buyer points at):

- **The Live Line** — a 4px colored left edge on every piece, everywhere it appears, and the *same color* splitting the editor: commerce fields (price / stock / Available) wear a green **LIVE NOW** tag; wording / photo / SEO wear an amber **WAITING** tag. The two-speed publish reality becomes a color you can physically point at — never the words "draft/staged."
- **The Studio Dock** — a thumb-anchored, always-visible action bar that counts pending edits ("2 waiting to go live"), **names the exact blocker in brand voice** ("Add a share image"), and flips green when satisfied. One bar satisfies "Publish always visible + conditionally enabled" and "nothing hides without explaining" at once.

The voice is **weight, not bounce — the jelly era is over for serious tools.** Tactility is crisp, fast, quiet: a collapsing shadow, an instant focus ring, a 1px sink — never a spring, squish, or overshoot. Confidence reads as restraint. (This is the deliberate register that separates a daily-use serious tool from a toy — and it's a taste fork Sean can flip; see §6.)

---

## 2. Palette

Cool indigo-slate, near-monochrome, **one** structural accent; semantic color reserved strictly for state. **Authoring rule (re-hueability):** every semantic state derives from one hue token via `color-mix()` / OKLCH, so a buyer (or a future client store) re-hues the whole template by editing a couple of tokens. Hex in comments below is the visual reference.

**Structural (light — the shipped theme):**
- `--bg: oklch(97.3% 0.004 255)` (#f6f7fa, flat — no gradient wash)
- `--surface: #ffffff` (cards)
- `--surface-sunk: oklch(95% 0.006 255)` (#eef0f4 — the recessed wells a press sinks into)
- `--ink: oklch(24% 0.03 262)` (#1c2230) · `--ink-muted: oklch(46% 0.025 262)` (#5b6477) · `--ink-faint: oklch(62% 0.02 262)` (#8a91a1)
- `--hairline: oklch(91% 0.006 262)` (#e2e5ec)
- `--accent: oklch(42% 0.055 262)` (#3d4f6d — the single hue everything structural mixes from)
- `--accent-strong: color-mix(in oklch, var(--accent), black 14%)` · `--focus: color-mix(in oklch, var(--accent), white 8%)` @ 45% alpha

**Semantic state** (each = one hue base + `color-mix` tint/border; Live Line + pills + tags all read from these):
- `--live: oklch(60% 0.12 150)` green = LIVE NOW / in the shop / instant-commerce
- `--waiting: oklch(72% 0.13 72)` amber = WAITING / unpublished edits / drafts (amber *always* means "something waits for publish")
- `--sold: oklch(55% 0.04 300)` muted slate-plum = sold ("not gone")
- `--archived: oklch(62% 0.012 262)` desaturated grey = out of shop
- Fills/borders generated, e.g. `--live-bg: color-mix(in oklch, var(--live), white 86%)`, `--live-bd: color-mix(in oklch, var(--live), white 60%)`

**Elevation** (cool-tinted, depth-as-information — carries the Dock's "different material" with **no backdrop-blur**):
- `--sh-1` resting card · `--sh-2` lifted tile/hover · `--sh-pop` the floating Dock · `--sh-inset` the press / recessed well

**Dark mode is deferred, not abandoned** — because tokens are OKLCH, a future `prefers-color-scheme: dark` block only re-maps the lightness channel + inverts shadow alpha. A documented one-block extension, deliberately not shipped at launch (doubling the test matrix buys zero comprehension now).

---

## 3. Typography

**System stack, no webfont** (an Inter dashboard is itself a 2020-SaaS tell, and a network/FOUT dependency is exactly what a no-build site prizes away). The shadcn signature comes from weight discipline + spacing + the data lane, at zero bytes.

- `--font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, sans-serif`
- `--font-data: ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace` — **the mono lane**, mandatory on every price, quantity, SKU, order number, tracking number, always with `font-variant-numeric: tabular-nums` so columns align and a maker scanning Orders/refunds never mis-reads a figure.
- Weights restrained: 400 body · 500 labels/nav · 600 headings + numbers-that-matter + the Dock's primary action. Never 700+ (heavy reads loud, not confident).
- Scale (mobile-first): `--t-xs 0.75rem` pills/hints · `--t-sm 0.875rem` labels · `--t-base 1rem` body/inputs (16px min on mobile so iOS never zoom-jumps a field) · `--t-lg 1.125rem` card titles · `--t-xl 1.375rem` surface headers. Line-height 1.5 body / 1.25 headings.
- Money always in plain language — "$25.00", "$200.00 minimum" — never raw numbers.

---

## 4. Motion + tactility

**Feel = weight, not bounce.** Eased with no overshoot anywhere (the springy toggle micro-settle is deliberately killed — one springy control copied across forty switches reads as inconsistency). Tactility is the dead-click cure, delivered as **consistent feedback**, not uniform amplitude.

Reusable semantic motion tokens (this is what makes it a *system* a buyer inherits):
- `--dur-press: 70ms` · `--dur-base: 140ms` · `--dur-settle: 220ms`
- `--ease-weight: cubic-bezier(.2,.7,.3,1)` (decelerate, zero overshoot)
- `--lift: translateY(-1px)` · `--press: translateY(1px)` (controls rest a hair above their well)

**Uniform press vocabulary:** every control, on `:active`, swaps its shadow for `--sh-inset` + applies `--press` at `--dur-press`, and shows an instant `:focus-visible` ring — same gesture, same latency, everywhere. Only **amplitude** scales with tap-frequency: pronounced at the hero (Publish/Dock, product tiles — where the dead click hurts most), calm-but-present in the dense field of inputs.

Two-speed made *felt*: a live (commerce) change flashes a green "Saved · live now" tick that fades; a waiting change increments the Dock's amber pending count; a state transition gives the badge one scale-pulse (no bounce).

**How, in vanilla:** CSS owns press/lift/reveal via `transition` on `transform`/`box-shadow`/`opacity` + `:active`/`:focus-visible`/`:checked`; JS owns *validity* (the Dock computes the real blocker — not a `:has()` false-green). **Reduced-motion contract (the floor):** under `prefers-reduced-motion: reduce`, drop all travel/pulse/tick-fade — but every feedback survives via color, opacity step, and the focus ring. No motion-sensitive maker ever gets a silent control. **No `backdrop-filter` anywhere** (Engineering veto — it stutters on a mid-tier Android exactly where the always-visible bar lives).

---

## 5. Information architecture (mobile-first)

Desktop is the adaptation, proven by **one container-query tile** that renders unchanged in the phone grid and the desktop rail.

- **Nav.** Mobile = bottom tab bar in the thumb zone — **Pieces / Orders / Sales / Account** — 44px+ targets, `aria-current` accent, inline SVG icons, `env(safe-area-inset-bottom)` padding; container query swaps icon-only → icon+label as width grows. Desktop = the same four rotate to a left **"notebook spine"** rail; **View Site** + Sign out anchor the rail bottom (and live in Account on mobile). Search/filter live *inside* each surface, never global.
- **Pieces grid.** A segmented state filter ordered by frequency — **Live (default) → Drafts → Archived → All (last)** — with live counts, self-evident pills, **no standalone legend**, per-filter empty states. The filter is a zero-JS `:has()` sliding puck (the one sanctioned pure-CSS state, since it genuinely lives in the DOM). Tiles: thumbnail + title + tabular price + quantity + the Live Line edge + a corner state pill; whole tile is the press target. "+ New piece" tile on desktop; floating "+" on mobile.
- **Editor (the centerpiece).** Mobile = a single scrolling column of grouped, collapsible cards; desktop = two columns. The two-speed model is **spatial + colored**: a pinned green "Live now" commerce card (price/stock/Available — applies instantly, no preview) sits visually apart from the amber "Waiting to go live" cards (story/details, media, presentation/SEO). The **media card leads with upload** — labeled role dropzones (Hero / Gallery / Detail / Thumbnail / Share / Checkout / Video) with at-a-glance coverage chips ("hero ✓, gallery 5/5"); paste-URL is secondary; a share-image upload actually populates its field. The Identity card flags slug + checkout fields that **lock once the piece first goes live**. The **Studio Dock** is pinned to the bottom: always visible, JS-computed enable, names the blocker, pending count, Discard / Preview, overflow for Archive / **Relist (first-class)** / Schedule (stretch). After save, the user **stays on the piece**.
- **System reuse.** Orders and Sales inherit the identical chassis — same segmented filter (Orders: Needs Shipping / Shipped / All), same cards, same Dock. The **refund** is a focused slide-up sheet making one-payment / multi-piece / partial-amount / per-piece-relist legible (where the confusion lives). **Sales** render in plain money with the new no-code store-wide auto-sale toggle. Mark-shipped (carrier + tracking → auto-email, with sent-status + resend) reuses the same input + Dock pattern.

---

## 6. The kept component concepts → which file

All twelve concepts from the decision are rendered across the three files:

- **Tactile button** — frequency-scaled press, primary / ghost / destructive, **disabled-with-reason shown not hidden** → *controls*
- **Toggle / switch ("Available")** — `:checked`-driven, green `--live` track = "in the shop right now", fades a "Saved · live now" tick → *controls*
- **Segmented state filter** — zero-JS `:has()` sliding puck, Live → Drafts → Archived → All, live counts → *controls*
- **Nav** — bottom tab bar ↔ desktop notebook-spine rail, container-query icon→icon+label → *controls*
- **Text input / field** — inset `--surface-sunk`, focus-ring token, `$`-prefixed mono price, per-field LIVE/WAITING tag → *controls*
- **Product tile + Live Line** — 4px colored left edge, corner pill, one container-query tile for phone grid + desktop rail → *pieces*
- **State badge / pill set** — self-evident, no legend: Live / Draft / Edits-waiting / Sold / Archived → *pieces* (+ *controls*)
- **Two-speed card** — pinned green "Live now" commerce card visually split from amber "Waiting" cards → *pieces* + *editor*
- **The Studio Dock** (the hero) — always-visible, JS-computed enable, names the blocker, pending count, flips green; overflow Archive / Relist / Schedule → *editor*
- **Media upload zone** — upload-first role dropzones, coverage chips, satisfy-a-zone clears the matching Dock blocker → *editor*
- **Refund sheet** (system-reuse proof) — one payment / multiple pieces / per-piece refund + partial amount + per-piece relist → *editor*
- **Sales card + store-wide auto-sale toggle** — running sale in plain money + the new no-code store-wide toggle → *editor*

---

## 7. Sanity-check — the decision vs. the raw research

I compared the CEO decision against the R1 corpus + the five raw lens pitches. **The call is faithful and well-synthesized**, not a single lens dressed up:

- **All convergence honored.** Every point the five lenses agreed on (palette family, the nav model, the Live→Drafts→Archived→All filter order, the upload-first editor, the spatial two-speed, the hero action bar, Orders/Sales reuse, disabled-with-reason, reduced-motion, tabular figures) is in the decision.
- **Every fork closed with a stated reason** — the decision grafts across lenses rather than picking one winner: L5's **Live Line + Studio Dock** (the innovation hooks) + L4's **container-query tile** (the mobile-first chassis) + L3's **motion-token floor** + L2's **OKLCH authoring** + L1's **color-only-carries-meaning** discipline. That cross-graft is exactly the brief's instruction.
- **The Engineering veto is load-bearing, not cosmetic** — no `backdrop-filter` (protects the always-visible bar from stutter), JS-owns-validity (makes the Dock's "name the blocker" honest instead of a `:has()` false-green that demos green and strands the next engineer). `:has()` is kept only for the filter, where state genuinely lives in the DOM.

**What the decision deliberately dropped — and the levers Sean still controls:**

- **Spring / bounce motion** (offered by L1, L2, L4) → dropped for **weight-no-bounce** (L3). This is the single biggest taste fork. The portal will feel *crisp and quiet*, not *playful and springy*. If Sean wants more life/whimsy, this is the lever to flip — and it's a token change (`--ease-weight` + re-enabling the toggle settle), not a rebuild.
- **Dark mode** (only L2 carried it) → **deferred**, not killed. OKLCH authoring keeps it a later one-block add. Flip-in cost is low if Sean wants it sooner.
- **Inter webfont** (L2) → dropped for the system stack. Reversible, but the system stack is the more brief-aligned default.
- **The literal phone-frame presentation** (L4) → dropped ("a costume a buyer discounts on sight"). The rendered tiles therefore aren't wrapped in a phone mockup — they prove mobile-first by *being* responsive. Resize the window to see it.

Bottom line: the decision is a sound, buildable synthesis. The only genuinely subjective call worth a second look is **weight-vs-bounce** — everything else follows cleanly from the research.

---

## 8. Fidelity gaps + open risks to carry into the build / gap-review

The rendered files are concept proofs, not production code. A quick code check surfaced two small fidelity gaps and the funnel flagged a set of build-time risks — all are gap-review fodder, not blockers:

**Fidelity gaps in the rendered HTML (fix at build):**
1. `v3_5_0_portal_render_pieces.html` uses `backdrop-filter` twice — a drift from the no-backdrop-blur rule; replace with the `--sh-pop` / tinted-surface approach the direction specifies.
2. All three files contain literal hex values (30–56 each). Some are legitimate (an `@supports` hex fallback + the reference comments on the token defs), but the "zero literal hex in *component* CSS" re-hueability rule needs an explicit audit when the real CSS is authored — one hardcoded literal silently breaks a buyer's one-token re-hue.

**Open risks from the funnel (assign during the build plan):**
3. **Dock blocker copy is brand voice, not validation strings** — "Add a share image," not "field required." The full blocker-copy set needs writing in voice (currently unowned).
4. **The Dock needs a small honest JS layer** (state object → compute blocker → render count/enable). The static components can't fully demonstrate the hero device without it; don't fake it with `:has()`.
5. **OKLCH `@supports` fallback** — verify on the maker's likely mid-tier device; degrade to flat-but-correct hex on older browsers rather than unstyled.
6. **The container-query tile must be literally one component** (not two variants) or the "design it as a system" claim quietly fails.
7. **Density on short viewports** — the editor's collapsible column + pinned Dock + bottom tab bar must not collide in the safe area; verify the Dock and tab bar don't double-stack or steal each other's thumb zone.
8. Keep the OKLCH lightness channel clean so the deferred dark-mode block stays a trivial extension.

---

## 9. Next steps (after Sean's review)

1. **Build plan** — turn this brief + the rendered concepts into an executable plan against the full `v3_5_0_PORTAL_REQUIREMENTS.md` functional spec, wiring the real `admin.js` capabilities into the new IA and component system. Resolve the weight-vs-bounce taste fork (§7) first — it's cheap now, expensive later.
2. **Gap reviews** — run via Sean's new Agent-SDK gap-review automation (the redesign is also the automation's first real test), carrying the §8 risks in as named landmines.
3. **Execute** — build the portal in vanilla, on the existing token foundation, against the gate-cleared plan.

Versioning is loose (a packaged module that folds into the v3.5 build).
