# v3.0.0 — Homepage Experience (initiative brief / pre-IMPLEMENT)

**Status:** concept brief — the seed of the v3.0.0 build. Not yet exclusively-executable. It can be pushed toward executable + run through the **same gap-review gate** (A/B/C + addendums) **alongside or immediately after** the v1.6.0 reviews, so the two builds execute in faster sequence. **It does not block v1.6.0.**

## Why this exists (the strategic point)

The store this project ships is already comparable to a strong Shopify build, and the **Custom GPT management layer is the headline differentiator** — it goes further than Shopify could. The *other* place we can out-class Shopify (and avoid the generic "AI-website" feel) is the **homepage experience**: a distinctive, custom, on-brand interaction that a template store can't replicate. v1.6.0 ships the already-beautiful site + the GPT. v3.0.0 levels up the homepage into an *experience*.

**Sequencing intent (Sean):** hand the client the GPT after v1.6.0 so she can start adding real products and learning to manage the store by chat; meanwhile we plan + build the leveled-up homepage, teasing "the site's interactive design will be improved by the time you're done." The v1.6.0 execution + its bug/design feedback are the **v2.x.x** drives; this homepage initiative is **v3.x.x**.

## The vision — modernize the original theatrical concept

The original client/GPT planning pitched a theatrical, "stepping into Elsewhere" homepage that was **tabled** to ship the core request first. Those ideas aren't dead — they're being **re-integrated in modern, figured-out ways**. Two are already proven/started in v1.6.0 and act as the bridge:

- **The "Firelight" ambient glow** (v1.6.0 D6) — the warm bloom is a modern, lightweight realization of the original "candlelight / theatrical lighting" mood.
- **The animated hero** (v1.6.0 D7) — the client's artwork, AI-extended into a video where the **sun rises and sets** (shadows rise and fall), with a drifting spotlight layer. This is itself the original "lighting movement creates depth" idea, realized with a real asset.

v3.0.0 extends that spirit down the whole homepage. Candidate elements (to be designed to spec, then tested like any build):

- **Scrolly-telling** — the headline want: a guided, narrative scroll down the homepage (sections reveal/transform on scroll) that tells the brand story ("when the world cracked open, I made something small enough to hold"). The differentiator vs. a flat template grid.
- **Theatrical lighting on scroll** — CSS-based spotlight/lighting that shifts as you scroll (the original "spotlights scrolling across the stage"), tying into the firelight palette.
- **Layered hero depth** — richer compositing on the hero video (frosted panels, Hyperframe layers keyed to the sunrise/sunset beats) beyond v1.6.0's baseline.
- **(Stretch) dynamic theme / mood** — the original "every visit is a different doorway" idea (seasonal palettes, per-featured-product mood). Likely a later slice; flagged, not committed.

## Source material to mine when this becomes an IMPLEMENT

- `assets/docs/archive/resources/processed/CHAT_PLANS_02-interactive.md` — the interactive homepage design discussion (theatrical opening, lighting, theme rotation, "gut-check" lines per section).
- `assets/docs/archive/resources/processed/BUILD_GUIDE.md` — the "opening animation / spotlight on scroll / perspective shifts" notes.
- `.agent/CLAUDE_DESIGN_ANIM_SITE.md` + `.agent/CLAUDE_DESIGN_HYPERFRAMES_SKILL_SUB.md` + `.agent/HYPERFRAMES_LLM.txt` — the layered-animation / Hyperframes technique (the same one used on `~/Development/360-design`).
- `assets/docs/archive/images/everlastings-website-red-glow.jpg` — the glow reference; `home-anim-gen.txt` — the hero-video generation notes.
- BRAND palette + voice — `assets/docs/archive/resources/processed/BRAND_GUIDE.md`.

## How it rides the gap-review flow

When promoted to a build, this becomes `v3_0_0_IMPLEMENT.md` **+ its addendums** (e.g. `v3_0_0_ADDENDUM_DESIGN.md`, `v3_0_0_ADDENDUM_TESTING.md`), versioned in lockstep, and runs the same A/B/C gate — potentially packaged alongside v1.6.0's B/C so reviewers and the executor amortize context across both. Until then it is a brief: capture concrete ideas here as they surface (we tend to converge on concrete specs quickly), and decide later which fold into a v3 IMPLEMENT vs. stay backlog.

## Out of scope (explicitly)

- Anything in v1.6.0 (the store + GPT + the already-beautiful site + the baseline hero/glow). This initiative is **additive** to a shipped, working site.
- Real client content (she adds it by chat after the v1.6.0 handoff).
