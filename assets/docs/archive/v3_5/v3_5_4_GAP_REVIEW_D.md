# v3.5.4 — Angle D (design-correctness) — ROUND 4 (scoped)

**Scope (deliberate narrow):** D returned NARROW in round-3 only on the §D.4 badge rework. Round-4 re-confirms **just §D.4** — the solid-token `.badge-unique` CSS, the `!sold && !p.featured` no-overlap gate, the "show on featured too" stack-rule upgrade, and the §D.4 ↔ IMPLEMENT §9.2a agreement. Everything else in the addendum stayed CLOSED (no round-3 fold landed in its lane). Change nothing but this file. Flag-don't-assert.

---

## Part 1 — Gap list (ranked)

Only one item rises above "confirmed correct," and it is a low-risk needs-verify, not a blocker.

**D4-R4-1 (needs-verify, low risk) — the homepage no-overlap guarantee rests on an UNSTATED data invariant.**
- Where: DESIGN §D.4 "Consequence" sentence + IMPLEMENT §6.3d (`homepage.js` `populateFeatured`, the `tile` closure).
- What: the homepage tile renders the **Featured** badge **hardcoded/unconditionally** (`<span class="badge badge-featured">Featured</span>`, IMPLEMENT:2288 — same as the CURRENT shipped code at :2257), but gates the new **unique** badge on the **data flag** `!p.featured` (:2289). The two badges therefore key off *different sources of truth*. The "One of a kind never shows on the homepage, so no corner overlap" claim in §D.4 is only true if **every** item passed to `populateFeatured` has `p.featured === true`. If any carousel item lacks a truthy `featured` field (a projection that omits it, a differently-named flag, or a non-featured product ever placed in the carousel), then `!p.featured` is truthy → the hardcoded Featured badge **and** the unique badge both render in the shared corner (`styles.css:593` pins both to `top/left: space-sm`, no sibling offset) → overlap.
- Why it's low-risk: `p.featured` is an established field on the product object (the shop grid §6.5a already gates its Featured badge on `${p.featured ? …}`), and the featured carousel *is by definition* the featured set, so `p.featured` is almost certainly truthy for every item. This is the first place on the homepage that *reads* `p.featured` (the base code only hardcodes the badge), so the dependency is newly introduced by this rework and can't be confirmed from the docs alone — I can't see the endpoint that populates the carousel.
- Concrete fix (either is sufficient): (a) add one line to §D.4 stating the invariant the guarantee depends on — "assumes every `populateFeatured` item has `featured===true` (the carousel is the featured set); if the homepage endpoint can return a non-featured item, gate the Featured badge on `p.featured` too so the two stay mutually exclusive"; or (b) make the homepage Featured badge derive from `p.featured` like the shop grid does, which makes Featured/Unique provably mutually exclusive on the homepage by the same construction as the shop grid. Flag as needs-verify for the orchestrator to confirm against the featured-feed shape; not a required fold.

*(Note — a pre-existing, out-of-scope base edge, recorded so it isn't mistaken for a new gap: on the shop grid a **sold + featured** piece renders Sold **and** Featured together — both gated true — which overlaps in the same corner. This is unchanged from the shipped CURRENT block (`${p.available?'':'Sold'}` + `${p.featured?'Featured':''}`), NOT introduced by the unique badge, and the unique badge's `!sold && !p.featured` gate correctly excludes itself from it. Settled-base; do not fold.)*

---

## Part 2 — Confirmations (the four round-4 questions, each PASS)

**(1) Solid tokens exist, are storefront warm-plum (not portal-indigo), and read distinct from Sold + Featured — PASS.**
- `.badge-unique { background: var(--bg-primary); border: 1px solid var(--accent-primary); color: var(--accent-primary); }`. Both tokens exist in the storefront `:root`: `--bg-primary → --color-cream #FFF8E7` (`styles.css:37`) and `--accent-primary → --color-plum #4A1942` (`styles.css:46`). Warm-plum storefront brand, not the portal's `oklch(42% 0.055 262)` indigo — brand separation (ledger 8) honored. No `color-mix()` → no OKLCH browser-floor question, as claimed.
- Distinct from `.badge-featured` (cream bg, **gold** `#D4AF7A` border, plum text, `styles.css:586-590`): the unique badge differs by border hue (plum vs gold) **and** copy ("One of a kind" vs "Featured"). These two CAN appear on the same shop-grid page (a featured tile beside a non-featured tile), so the distinction is load-bearing there — dark-plum vs light-tan borders on cream are clearly separable, and the copy differs outright. Distinct from `.badge-sold` (fog bg `#D4D4D4`, muted text, `:581-584`): fully distinct fill vs cream/plum outline.
- Base inheritance correct: `.badge` (`:568-579`) supplies inline-flex/padding/xs-size/600/uppercase/radius + `.card__media .badge` (`:593`) supplies the absolute placement; `.badge-unique` only sets hue, exactly as §D.4 states.

**(2) The `!sold && !p.featured` default gate → at-most-one NEW badge, zero extra CSS — reasoning SOUND (with the D4-R4-1 caveat).**
- Shop grid §6.5a: Sold=`${sold?…}`, Featured=`${p.featured?…}`, Unique=`${!sold && !p.featured?…}` — the unique branch is the boolean complement of (sold OR featured), so the unique badge can **never** co-render with either. Given `.card__media .badge` pins all badges to one corner with no sibling-offset rule, gating this way is the correct way to avoid overlap with no new CSS. Sound.
- Homepage §6.3d: sound **conditional on** the D4-R4-1 invariant (`p.featured===true` for all carousel items). Under that invariant the unique badge never renders on the homepage and the only badge is the hardcoded Featured — no overlap. The invariant is the single thing left unstated.

**(3) The "show on featured too" upgrade (`.card__media .badge ~ .badge` stack rule + `!sold`-only gate) — correct + sufficient recipe — PASS.**
- `.card__media .badge ~ .badge { top: calc(var(--space-sm) + 1.9rem); }`: the general-sibling combinator offsets the **second** absolutely-positioned badge downward, so Featured (first in markup) + Unique (second) stack instead of overlapping. Switching the render gate to `!sold` only lets Unique co-render with Featured — the desired "everywhere but sold" behavior — on both surfaces (shop grid: `p.featured` Featured + `!sold` Unique; homepage: hardcoded Featured + `!sold` Unique). Consistent and correct.
- Sufficiency: the exact `1.9rem` offset is explicitly flagged render-tune in §D.4, so "concrete-default + render-tune" is satisfied; the badge is ~12px text + `space-xs` padding, so a ~30px drop clears the first badge with a small gap — a reasonable default. Side effect (not a regression): on a sold+featured tile the rule also nudges the second of Sold/Featured down, incidentally relieving the pre-existing base overlap. Recipe is a correct, sufficient, opt-in upgrade; correctly surfaced as a Sean decision rather than silently adopted.

**(4) §D.4 ↔ IMPLEMENT §9.2a agree on the rule — PASS.**
- §9.2a CURRENT block (IMPLEMENT:3410-3418) byte-matches the real file (`styles.css:586-598`: `.badge-featured {…gold…}` → blank → `/* Overlay placement… */` → `.card__media .badge {`), so the insert anchor is clean and the orphaned-CSS gap (round-3 A-D4-CSS) is genuinely closed — the badge is now wired, not just speced.
- The `.badge-unique` declaration trio is identical in both places: `background: var(--bg-primary); border: 1px solid var(--accent-primary); color: var(--accent-primary);`. §D.4 presents it inline (one line) and §9.2a as the expanded 5-line insertion; the property/value trio is byte-identical — formatting differs, the rule agrees. Insertion point (after `.badge-featured`, before `.card__media .badge`) is consistent with §D.4's "distinct from Featured" intent.

---

## Part 3 — The single most important insight

§D.4's badge rework is render-correct and buildable as written; the one thing to nail down is the **homepage** case, where the Featured badge is drawn *unconditionally* while the new unique badge is gated on the *data flag* `!p.featured`. The no-overlap promise on the homepage silently depends on every carousel item carrying `featured===true`. Either state that invariant in §D.4 or gate the homepage Featured badge on `p.featured` (matching the shop grid) so the two badges are mutually exclusive by construction on both surfaces — a one-line change that removes the only assumption in the section.

---

## Verdict

**NEEDS ANOTHER PASS (NARROW)** — §D.4 is render-correct, CSS is wired and byte-agrees with §9.2a, tokens are correct/distinct, and both the default gate and the featured-stack upgrade are sound; the sole open item is the low-risk homepage `p.featured===true` invariant (D4-R4-1), which is a one-line clarify/align (or a needs-verify against the featured-feed shape), not a structural gap.
