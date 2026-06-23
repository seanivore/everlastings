# Everlastings — Finish the Hero, Then Go Live (v3.4)

  Your map for the home stretch. The blow-by-blow execution checklist for an agent lives in the runbook (see "Where the files live"); this is the human version — what's done, what's left, and how to pick it back up.

## Where this stands

  + The store is built (v3.3) and moved onto your SEANIVORE Vercel account.
  + The homepage hero is mid-perfection — the one creative thread still open.
  + Everything else to launch is a short, procedural tail: the GPT, one test, the ship.

## What's already done

  + Vercel migration — project moved off the admin@ account onto SEANIVORE (imported as new); production serves the live keys, preview serves the test keys, the domain cut over cleanly, the old project is deleted.
  + The v3.3 build — refunds, coupons in /admin, chat-photo upload, /admin polish, inventory, and the new GPT actions — all shipped to dev and proven.
  + Homepage round 1 — graded + zoomed hero with the cheesy edge-glow removed; it's on the dev preview now.
  + Homepage rounds 2-3 — the redesign you're reviewing: cranked old-film FX plus your new mockup's text.

## The hero we're finishing

### The look

  + Footage is your diorama clip, warm-graded and zoomed so it reads as atmosphere, not a product photo.
  + FX (the vibe is the subject): grain that boils, gate-weave, flicker, vignette, two moving light leaks, and big flickering film speckles — pushed heavy.
  + The loop is a seamless boomerang (golden → dusk → golden) — no cut-to-black.

### The text (your mockup)

  + "Step into" / "Elsewhere" — big Zapfino script, flanking the diorama.
  + Tagline — Academy Engraved LET, small, upper-right.
  + "ENTER" with a flourish — the CTA (the script stays the hero, not the button).
  + Built from your actual Mac fonts, with a subtle old-film nudge.

### The dials, for your eye

  + Leak intensity — Strong is the floor; max is the current default.
  + Speckles and flicker — pushed past the agent's instinct on purpose (your eye sees less change than the AI's, so we overshoot and you pull back).
  + Zoom — going further than 1.6x.

## What's left to go live

  + [ ] Finish the hero — pick the FX level, lay the text over it per your mockup, push to preview, tune to your eye.
  + [ ] GPT update, in Em's ChatGPT — paste the updated Action schema + instructions, point it at the preview, spot-check a refund / coupon / photo-attach.
    - Schema: assets/docs/archive/v3_3/v3_3_0_GPT_SCHEMA.txt
    - Instructions: assets/docs/archive/v3_3/v3_3_0_GPT_INSTRUCTIONS_TRIMMED.txt
    - The v2_0_0 names are current — they were never renamed.
  + [ ] Test-mode run-through on the preview — buy then refund a test piece (inventory decrements, a full refund flips the order), per the testing addendum.
  + [ ] Ship dev → main and tag, per assets/docs/archive/v2_0/v2_0_0_GO_LIVE.md.
  + [ ] After it's live — one real buy + refund on production (the one thing test mode can't prove), then repoint the GPT to production and hand it to Em.
  + [ ] As-built docs — fold v3.4 into EVERLASTINGS_STORE.md, including the two known gaps (the coupons table, the /admin design system).

## Key things to remember

### The FX calibration — the big lesson

  + Your fresh-eyes vision sees far less change than the AI's pattern-vision does.
  + So FX always need pushing 3-5x past what feels right to an agent — and leading with the effect you can't miss (the speckles).
  + The portfolio went nothing → "not enough" → "push really hard" → amazing. The recipe lives in .agent/CLAUDE_DESIGN_ANIM_SITE.md.

### The hero thesis

  + The FX and the vibe are the subject — not the artwork. Em is an artist; the hero conveys the feeling of her work, abstracted, rather than a clean product shot.

### A future artifact worth making

  + A HyperFrames FX visual lookbook — each effect at low / medium / heavy, with its recipe and dial range.
  + This build already made the seed: the research notes, the 11 tunable FX variables, and the intensity scan sheets.
  + Showable and reusable — squarely in your showcase lane.

## Picking this up later

### If you compact this session — keep going, shed the old context

```
/compact You're continuing the Everlastings by Emaline v3.4 homepage-finish + go-live (showcase store; client Em runs it via a Custom GPT + /admin). READ FIRST: assets/docs/archive/v3_4/v3_4_0_GO_LIVE_AND_HANDOFF.md (the map) + /Users/seanivore/.claude/plans/hello-we-are-in-spicy-horizon.md (detailed runbook) + .agent/CLAUDE_DESIGN_ANIM_SITE.md (FX calibration — push hard).

STATE: Vercel migration DONE (admin@ → SEANIVORE Hobby team; prod=live/preview=test keys; domain cut over; old project deleted; dev preview = everlastings-git-dev-seanivore.vercel.app). v3.3 build is live on dev. HOMEPAGE being finished: round-1 (graded+zoomed hero, glow removed) is live; round-3 = cranked old-film FX + Sean's new mockup text. Render assets are in /Users/seanivore/Development/everlastings-renders/ (NOT yet integrated to the site).

DONE just now: hero FX iter-3 pushed HARD (big flickering film speckles + grain boil at display scale + cranked flicker + Strong leaks + boomerang loop) → hero-fx-strong.mp4 + hero-fx-max.mp4 (default to MAX per the calibration — overshoot, Sean dials down via 11 exposed vars). Text rebuild from Sean's mockup (thoughts/0-whole-mock-up.jpg) — Zapfino "Step into/Elsewhere" + Academy Engraved LET tagline + "ENTER" from his Mac fonts, subtle old-film nudge — in everlastings-renders/lottie-text/ (read the agent's Zapfino-vs-his-PNG fidelity verdict; fall back to his thoughts/{1,2}-heading.png etc. if the swashes didn't extract clean).

NEXT (one-track): assemble — re-render the chosen hero level full-quality + web-encode + upload R2 as -v4; lay the text out per the mockup over it (script flanking, tagline upper-right, "ENTER" bottom-right CTA — script IS the hero text, not the button); zoom more; push dev → Sean's real-eye pass → tune. THEN the go-live tail: GPT update (paste v2_0_0 schema+instructions @ preview) → test-mode E2E → ship dev→main + tag → live buy+refund + repoint GPT to prod → hand to Em → as-built docs.

STYLE: render via ~/.agents/skills (hyperframes + text-to-lottie) + background subagents (their context, not yours — keeps you lean); review via contact sheets/MP4s (Sean judges from files); PUSH FX past instinct; R2 drop via aws CLI + .env.local creds. Sean = visual designer, sky-high bar, hero thesis "FX/vibe is the subject not the artwork"; prefers inline decisions over modals.
```

### If you start a brand-new session

```
Picking up the Everlastings by Emaline v3.4 homepage-finish + go-live. Please read, in order: assets/docs/archive/v3_4/v3_4_0_GO_LIVE_AND_HANDOFF.md (the map), /Users/seanivore/.claude/plans/hello-we-are-in-spicy-horizon.md (the detailed runbook with the integrate-the-winner checklist), and .agent/CLAUDE_DESIGN_ANIM_SITE.md (the FX-calibration lessons — push hard for human eyes). The store is built + migrated to my SEANIVORE Vercel account; the homepage hero is mid-perfection (cranked old-film FX + my new mockup's text, rendered in /Users/seanivore/Development/everlastings-renders/, not yet on the site). The immediate job is to assemble the hero (FX level + the text over it) and push it to the dev preview for my eye, then the go-live tail. Confirm you've read the docs and tell me where we are before doing anything irreversible.
```

## Where the files live

  + Detailed execution runbook (agent-facing): /Users/seanivore/.claude/plans/hello-we-are-in-spicy-horizon.md
  + Hero renders + the intensity scan: /Users/seanivore/Development/everlastings-renders/hero/hero-oldfilm/
  + Lottie text + the earlier variants: /Users/seanivore/Development/everlastings-renders/lottie-text/ and lottie-subtitle/
  + Your mockup + the part PNGs: /Users/seanivore/Development/everlastings-renders/thoughts/
  + The ship steps (dev → main): assets/docs/archive/v2_0/v2_0_0_GO_LIVE.md
  + The FX-calibration lessons: .agent/CLAUDE_DESIGN_ANIM_SITE.md
  + The render-pipeline internals (how the FX + Lottie builds work): assets/docs/archive/v3_4/v3_4_0_HERO_FX_AND_LOTTIE_PIPELINE.md

## Next phase — refine the elements one at a time

  The full hero is assembled and live on the dev preview (max FX, the four text Lotties, zoom 2.0) — "best starting point yet." The next move is to break the hero into its elements and perfect each in isolation, one at a time (review each standalone — it doesn't have to be composited on the hero), then recompose.

  + First: "Step into Elsewhere" as a standalone write-on Lottie.
    - The deployed heading is static-with-nudge; the goal is the write-on (draw-on) animation, like the earlier ones — reviewed as one "Step into Elsewhere" piece by itself.
    - A start already exists: everlastings-renders/lottie-text/hero-step-into-writeon.json (the draw-on variant). Refine + QA it standalone.
    - On the live hero the heading "just loads" with no visible motion — the heading has no write-on yet, and the subtle nudge is below the human-perception floor (the calibration again). Reviewing each element standalone makes its animation clear; the write-on must be clearly visible, not subtle. All four pieces (heading, tagline, ENTER) are Lotties and get the same standalone treatment.
  + Zoom out — reduce the hero scroll-zoom from scale(2.0) toward ~1.5 (keep the text sizes); less magnification means less "snowy" / blocky distortion. The final --quality high render also de-blocks.
  + ENTER flourish — part of it is missing / clipping at bottom-right; fix the trace or the positioning.
  + FX stays at max (back off to taste later — easier to dial down than build up).

### Refreshed compact arg — use THIS one (supersedes the one above)

```
/compact Continuing Everlastings by Emaline v3.4 — homepage hero refinement + go-live. READ FIRST: assets/docs/archive/v3_4/v3_4_0_GO_LIVE_AND_HANDOFF.md (this map — esp. "Next phase"), assets/docs/archive/v3_4/v3_4_0_HERO_FX_AND_LOTTIE_PIPELINE.md (how the FX + Lottie builds work + the exact commands), /Users/seanivore/.claude/plans/hello-we-are-in-spicy-horizon.md (runbook), .agent/CLAUDE_DESIGN_ANIM_SITE.md (FX calibration — push 3-5x).

STATE: store built (v3.3) + migrated to SEANIVORE Vercel (prod=live/preview=test keys; dev preview = everlastings-git-dev-seanivore.vercel.app). The homepage HERO is assembled + LIVE on dev — max-FX video (-v4 on R2: flickering film speckles + grain boil + flicker + 2 light leaks + boomerang loop, scroll-zoom 2.0) + 4 text Lotties (Zapfino "Step into"/"Elsewhere" + Academy Engraved LET tagline + "ENTER", subtle old-film nudge, in assets/lottie/, wired via .hero__unit + homepage.js). Sean: "best starting point yet."

NEXT PHASE = refine the hero ELEMENTS ONE AT A TIME, in isolation (perfect each standalone, then recompose). Queue: (1) "Step into Elsewhere" as a standalone WRITE-ON Lottie (deployed heading is static-nudge; he wants the draw-on; start = lottie-text/hero-step-into-writeon.json); (2) zoom OUT (the @keyframes hero-counter-scroll scale 2.0 -> ~1.5, keep text sizes — less "snowy"); (3) fix the ENTER flourish (part clipping); then a final --quality high hero render (clears the draft blockiness) + Sean's DaVinci final encode. FX max stays.

THEN the go-live tail: GPT update (paste v2_0_0 schema+instructions @ preview) -> test-mode E2E (refund+inventory) -> ship dev->main + tag -> live buy+refund + repoint GPT to prod -> hand to Em -> as-built docs.

STYLE: render via ~/.agents/skills (hyperframes + text-to-lottie) + background subagents (their context keeps the main loop lean); review via files/MP4s/contact-sheets (Sean judges from files, not the site); PUSH FX past instinct; LONG content -> files, NOT chat (his terminal truncates) + keep chat short; R2 via aws CLI + .env.local creds. Sean = visual designer, sky-high bar, thesis "FX/vibe is the subject not the artwork"; prefers inline decisions over modals.
```
