# v3.4 — Hero FX (HyperFrames) + Hero Text (Lottie) Build Pipeline

Agent-facing technical reference so a fresh agent can tune, re-render, and re-deploy the homepage hero. Dense default formatting (NOT human-formatted — this is for an agent). For the human map + the go-live tail, see `v3_4_0_GO_LIVE_AND_HANDOFF.md`. For the FX-intensity calibration ("push 3-5× past instinct; Sean's eye sees less change than the AI's"), see `.agent/CLAUDE_DESIGN_ANIM_SITE.md`. Skills used: `~/.agents/skills/{hyperframes,hyperframes-cli,hyperframes-media,text-to-lottie,lottie}/`.

## Where everything lives

- **Hero FX composition (HyperFrames project):** `~/Development/everlastings-renders/hero/hero-oldfilm/`
  - `index.html` — the composition (the single source of the look).
  - `source.mp4` — the original 1920×1080 / 24fps / 4.04s diorama clip (pulled from the CDN).
  - `source_loop.mp4` — the boomerang loop clip the composition actually uses (see Loop fix).
  - Renders: `hero-fx-strong.mp4`, `hero-fx-max.mp4` (draft 2-level scan), `homepage-hero-v4-web.mp4` (the crf20 web encode that's deployed), `hero-poster-v4-web.jpg`.
  - `.iter-backups/` — prior composition versions.
- **Hero text Lottie pipeline:** `~/Development/everlastings-renders/lottie-text/`
  - `build.js` — the generator (opentype.js → lottie-web shapes). `verify.js` — the lottie-web SVG gate. `convert_fonts.py` — the fontTools step. `fonts/` — the converted TTFs. Outputs: `hero-step-into.json`, `hero-elsewhere.json`, `hero-tagline.json`, `hero-enter.json` (+ `hero-step-into-writeon.json`, an optional draw-on variant). `text-vs-mockup.png` — fidelity montage.
  - Prior iterations, SUPERSEDED but kept: `~/Development/everlastings-renders/lottie-title/` (the early Cormorant title write-on) and `lottie-subtitle/` (Pinyon-script subtitle variants).
- **Deployed assets:** R2 bucket `everlastings` (public `cdn.everlastingsbyemaline.com`): `hero-bg-anim/homepage-hero-animation-v4.mp4` + `hero-bg-image-not-anim-v4.jpg`. Repo: `assets/lottie/hero-{step-into,elsewhere,tagline,enter}.json`.
- **Source mockup + the owner's exported part PNGs:** `~/Development/everlastings-renders/thoughts/0-whole-mock-up.jpg` + `{1-heading,2-heading,3-tagline,4-button}.png`.

## Toolchain

Node 22, ffmpeg/ffprobe, `npx hyperframes` (downloads a bundled Chrome on first run; `npx hyperframes doctor` to check). `opentype.js`, Python `fontTools` (in a local `.venv`), `potrace` + `svg-path-parser` (in a shared `node_modules` symlinked across the `lottie-*` dirs).

## Hero FX composition (HyperFrames)

Plain HTML + CSS/canvas layers on a single **paused, seeded GSAP timeline**, captured frame-by-frame by the CLI. Structure of `index.html`:
- `#plate` — the `<video>` (source_loop.mp4), with the warm grade as a CSS `filter` and the gate-weave/flicker animated on the plate via the timeline.
- Overlays (back→front): `#halation` (warm-gold radial, `mix-blend-mode:screen`), the **grain/speckle canvas** (a single full-frame `<canvas>` repainted per-frame via a GSAP proxy `onUpdate` reading the frame index), `#vignette`.
- The **two light leaks** + **film speckles** + **grain boil** all live in/over that canvas + timeline.

**The 11 tunable `data-composition-variables`** (declared on the `<html>` root; override per-render with `--variables '{...}'`, no HTML edits). Strong defaults → Max overrides:
- `warmth` 0.18 (sepia amount in the grade)
- `halationOpacity` 0.08
- `grainOpacity` 0.30 → 0.45
- `grainCell` 5 → 6 (grain cell px — enlarge so it reads at display scale)
- `weaveAmplitude` 1.5/2.2 → 3.0 (gate-weave px)
- `flickerDepth` 0.18 → 0.30
- `vignetteStrength` 0.35/0.42 → 0.5
- `lightLeak1Intensity` 0.30 → 0.40
- `lightLeak2Intensity` 0.28 → 0.38
- `speckleIntensity` 0.8 → 1.0
- `speckleDensity` 1.0 → 1.8
Currently deployed = **Max**. Headroom remains above Max on `speckleDensity`/`flickerDepth`. Dial DOWN to taste (the owner confirmed Max is the right place to back off from).

**Loop fix:** the source dims golden-hour→dusk (not a hard fade, but the last frame ≠ first → a looping `<video>` jumps). `source_loop.mp4` = a **boomerang** (97 forward + 96 reverse = 193 frames @ 24fps = 8.04s) so it loops bright→dim→bright, landing the seam on the bright golden frame. Verified seam ≈ 4 YAVG diff (vs ~47 hard-cut). The speckle/grain/leak/flicker layers gate to neutral at frame 0 and the last frame so they don't disturb the seam.

**Determinism (mandatory — HyperFrames captures frame-by-frame):** seeded `mulberry32` only (no `Math.random`/`Date.now`/`performance.now`/`rAF`); finite repeats (`Math.ceil(dur/cycle)-1`, never `repeat:-1`); everything on the paused `tl` (never bare `gsap.to`); CSS-gradient + `<canvas>` layers ONLY — never an SVG-filter `data:` URL (taints the capture canvas); `muted playsinline`, framework owns playback (never `video.play()`).

**Re-render** (run from INSIDE the project dir — the CLI takes the dir, not the `index.html` path, or it errors "Not a directory"):
```
cd ~/Development/everlastings-renders/hero/hero-oldfilm
npx hyperframes render . -o out.mp4 --fps 24 --quality high --variables '{"speckleIntensity":1.0,"lightLeak1Intensity":0.40}'
```
`--quality draft` to iterate fast; `--quality high` for the deliverable. (The currently-deployed file is a DRAFT render → it looks blocky when CSS-zoomed 2×; a `--quality high` render fixes that.)

**Web encode + poster:**
```
ffmpeg -y -i out.mp4 -an -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart homepage-hero-v4-web.mp4
ffmpeg -y -i out.mp4 -vf "select=eq(n\,0)" -frames:v 1 -q:v 4 hero-poster-v4-web.jpg
```
**Tradeoff:** the heavy per-frame specks are high-entropy → they fight compression. At crf20 the 8s clip is ~18MB. Lower crf / shorter loop / fewer specks reduce it; the owner will do a final encode in DaVinci. Balance speck-intensity ⟷ load at final.

**R2 upload** (creds in `.env.local`; the `r2` aws *profile* is read-denied, so pass the keys inline — see `[[reference_cdn_r2_drop]]`):
```
ACC=$(grep '^R2_ACCOUNT_ID=' .env.local|cut -d= -f2-); KEY=$(grep '^R2_ACCESS_KEY_ID=' .env.local|cut -d= -f2-); SEC=$(grep '^R2_SECRET_ACCESS_KEY=' .env.local|cut -d= -f2-)
AWS_ACCESS_KEY_ID=$KEY AWS_SECRET_ACCESS_KEY=$SEC AWS_DEFAULT_REGION=auto AWS_REQUEST_CHECKSUM_CALCULATION=when_required \
  aws s3 cp homepage-hero-v4-web.mp4 s3://everlastings/hero-bg-anim/homepage-hero-animation-v4.mp4 \
  --endpoint-url https://$ACC.r2.cloudflarestorage.com --content-type video/mp4 --cache-control "public, max-age=31536000, immutable"
```
Cache is immutable, so a NEW render must use a NEW key (`-v5`, …) + update the 3 URL refs in `index.html` (or it serves the cached old bytes). Verify with `curl -I` the public URL.

## Hero text Lotties

`build.js` extracts real font outlines via opentype.js (`getPath`/`getPaths` per glyph) and emits **lottie-web-SVG-compatible** shape groups (each a `gr` ending in `tr`), with a stroke + fill, an optional Trim-Path draw-on, a fill-settle, an asymmetric-arc layout (per-glyph placement along an uneven curve + tangent rotation), and a subtle seeded old-film **nudge** (mulberry32; sub-pixel drift + ~±0.15° rotation + ~±0.1% scale-breath; ~5s loop; each element a different seed; t=0 keyframe == t=op so the loop seam is sub-pixel). Read `build.js` for the exact constants.

**Fonts:** Zapfino (heading) + Academy Engraved LET (tagline + ENTER), both macOS system fonts at `/System/Library/Fonts/Supplemental/`. **opentype.js 2.0 cannot read them raw** (Zapfino cmap format 6, Academy a table error, `.ttc` collections unsupported) → `fontTools`-convert to plain TTFs into `lottie-text/fonts/` first (`convert_fonts.py`). The owner used Zapfino's *default* glyph forms (not the swash-alternate ligatures opentype can't emit), so the extraction matched his export to ~0.3% → the Lotties ship (not his PNGs).

**Outputs** (transparent, cream `#F3ECDD`, lottie-web-SVG verified): `hero-step-into.json` 1631×783 · `hero-elsewhere.json` 1756×649 · `hero-tagline.json` 1311×189 (canonical copy, two lines split at the comma) · `hero-enter.json` 710×334.

**Verify:** `node verify.js` — mounts each JSON in lottie-web 5.13 + jsdom; gate = a real `<path>` mounts (the site's exact reveal check), the nudge moves + loops sub-pixel, and (for write-on) the stroked geometry grows 0→100%. lottie-web gotchas: Trim Path *rebuilds* path geometry (not `stroke-dasharray`); a fill group's subpaths merge into ONE `<path>` (`pathCount=1` is correct); every non-final opacity keyframe needs `i`/`o` easing handles or lottie-web blanks the layer.

**Regenerate / tune:** edit `build.js` constants (text, font, `EM` size, arc bow/tilt, nudge seed, color) → `node build.js` → `node verify.js` → copy the JSON into `assets/lottie/`. (`build.js` rebuilds all elements; only the changed one differs — confirm others are byte-identical if that matters.)

## Integration into the site

- **Markup** (`index.html` `.hero__content`): four `.hero__unit` (`--into`, `--elsewhere`, `--tagline`, `--enter`). Each = a real-text fallback span (SEO / SR / no-JS / reduced-motion) + a `.hero__unit-lottie` span carrying `data-hero-lottie="/assets/lottie/<name>.json"`. The heading lines live in a single `<h1>` (`Step into Elsewhere` for SEO); ENTER is an `<a href="/shop">`.
- **Loader** (`assets/js/homepage.js`): on `DOMContentLoaded`, if not reduced-motion and `window.lottie` exists, `querySelectorAll('[data-hero-lottie]')` → `lottie.loadAnimation({renderer:'svg', loop:true, path})`; on `DOMLoaded`, if the SVG mounted a real `<path>`, add `.has-lottie` to the unit (which sets `.hero__unit-text{color:transparent}`). 404/blocked/reduced-motion → the text fallback stays. lottie-web (bodymovin 5.12.2) is loaded `defer` BEFORE homepage.js in `index.html`.
- **CSS** (`index.html` inline `<style>`): `.hero__unit--*` set absolute position + `aspect-ratio` (= the Lottie's comp ratio, so box height follows width with no distortion) + `font-size` clamps; `@media (max-width:768px)` stacks them. Positions are first-pass ESTIMATES from the mockup — tune here.
- **Hero video** (`index.html`): `.hero__media video` poster/src = `-v4`; the scroll-zoom is `@keyframes hero-counter-scroll` (`scale(2.0)`); reduced-motion swaps to the `-v4` poster as a background-image.

## How to tune the common things

- **FX intensity:** `--variables` re-render → re-encode → upload to a NEW `-vN` key → update the 3 URL refs in `index.html`.
- **Text position/size:** the `.hero__unit--*` CSS in `index.html`.
- **Text copy/font/arc/color:** `build.js` consts → regen → copy JSON to `assets/lottie/`.
- **Zoom:** the `scale()` in `@keyframes hero-counter-scroll`.
- **Loop length/size:** boomerang (current) vs a shorter crossfade loop (smaller file).

## Open / to-do (as of this writing)

- Final `--quality high` hero render (the deployed one is draft → blocky under the 2× zoom).
- Position/size tuning per the owner's eye; lock the FX level (currently Max).
- Final file-size pass (DaVinci) — the speck-heaviness ⟷ load tradeoff.
- Future artifact: a HyperFrames FX visual lookbook (each effect at low/med/heavy + recipe + dial range) — the seed is the 11 variables + the intensity scan sheets.
