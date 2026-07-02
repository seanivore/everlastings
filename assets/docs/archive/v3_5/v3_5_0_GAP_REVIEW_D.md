# v3.5.0 — Gap Review · Angle D (design-correctness)

**Reviewer lens:** does the UI actually RENDER right and match the finished `design-handoff/out/` package + Sean's v1 feedback? A can't see the repo; B/C lean fidelity/integration; D owns render-correctness, the state-color system, the KILL list, mobile-primary, a11y/reduced-motion, and the three NEW components not in `out/`.

**Scope note / method.** Read end-to-end: IMPLEMENT + both addenda + `brief.md` + `FEEDBACK_v1.md` + `data-flow.md` + `INTEGRATION.md` + `PRODUCT_LIFECYCLE.md` + `controls.html`/`tokens.css`, and the shipped `out/` (`portal.css`, `portal.js`, `products.html`, `products-app.js`, the other shells). Systematically diffed every `var(--token)` used across `out/` against the defined set, and verified every storefront token the §D additions reference exists in `assets/css/styles.css`. **Flag-don't-assert applied:** where the finding is "the doc says X but the canonical shipped code + Sean's feedback say Y," the shipped `out/` is treated as canonical (it ships verbatim and was Sean-approved), and the *doc* is the thing to reconcile — not the code.

**Bottom line up front:** the design layer is sound and the `out/` package renders right in the vast majority of cases — brand separation holds, mobile-first is by-construction, the KILL list holds (no tiles, no nested widgets, no words in state pills, no portal-name header, 16px mobile inputs), publish-gate honesty is real (computed `disabled` + plain-language "what's missing"), and the three NEW storefront components are concretely specified against real storefront tokens. But there is **one systematic doc-vs-code-vs-Sean contradiction** (the LED state-color rule) that can cause a real regression if a builder trusts the doc over the shipped code, plus **one concrete render bug in shipped markup** (`--staged`). Both are bounded.

---

## Ranked findings

### 1 · HIGH — The "row LEDs are 3-color / sold+archived via tabs NOT color" rule is contradicted by the shipping code AND by Sean's own FEEDBACK §3
Four doc sites assert the same stale rule:
- ledger entry 20 ("Row LEDs color only live/draft/edits; sold/archived reached via TABS, not color"),
- DESIGN addendum **§C.1** ("Sold and archived are NOT LED colors … `.led--sold`/`.led--archived` classes exist for the segmented-filter dots, not for row LEDs"),
- DESIGN addendum **§E** ("Only live/draft/edits get a row LED color … the row LED uses only 3"),
- IMPLEMENT Locked-decisions (§sold policy) + **TESTING item 5** ("Row LEDs color only live/draft/edits; sold + archived are reached via tabs, not LED color").

But the canonical shipped code does the opposite: `products-app.js:91` `ledFor(p)` returns `<span class="led led--${computeState(p)}">`, and `rowHTML` (`products-app.js:135`) renders `ledFor(p)` on **every** row, including sold and archived rows. `portal.css:402-403` gives `.led--sold` a real color (blue `#297fb4`) and `.led--archived` a real color (purple-gray `#83718a`). So **sold rows show a blue LED and archived rows show a purple-gray LED** — which is exactly what Sean explicitly requested in **FEEDBACK §3** ("there are more colors out there for indicators so let's get more creative. Blue for sold (#297fb4) And maybe like a purple-gray for archived (#83718a)"). The "3-color only" line is the pre-feedback `brief.md §5.1` position that the v1 feedback overrode; the `out/` package correctly implements the 5-color reality.

Two concrete harms:
- **Regression risk:** a builder/tester following TESTING item 5 (or ledger 20) will treat the shipped blue/purple-gray row LEDs as a defect and strip them — deleting the colors Sean asked for.
- **Factual error inside DESIGN §C.1:** it claims `.led--sold`/`.led--archived` "exist for the segmented-filter dots, not for row LEDs." The segmented-filter dots are a *different* class set — `.dot--sold`/`.dot--archived` (`portal.css:373-376`, emitted at `products-app.js:99`). `.led--sold`/`.led--archived` are the ROW LED classes used by `ledFor()`. The doc has the two class families backwards.

**Fix:** reconcile all four doc sites to the shipped 5-color reality — row LED = green live / yellow draft (blink) / orange `--waiting` edits (faster blink) / blue `--sold` / purple-gray `--archived`; the tabs *also* carry the dot colors (`.dot--*`). Retire the "sold/archived via tabs NOT color" phrasing; correct the `.led--*` vs `.dot--*` attribution in §C.1; rewrite TESTING item 5's assertion to "sold/archived rows show their own LED color AND are filtered to their tab." **Do not touch `out/`.**

### 2 · MEDIUM — Undefined CSS token `--staged` in shipped markup breaks the scheduled-publish chip render
`products.html:288` `.sched-chip{ … background:color-mix(in oklch,var(--staged),white 80%); color:color-mix(in oklch,var(--staged),black 16%); border:1px solid color-mix(in oklch,var(--staged),white 52%); … }` — but `--staged` is defined **nowhere** (verified against `portal.css` `:root`, the `@supports` fallback, the v1-feedback additions, and `tokens.css`; it is the *only* genuinely-undefined token used anywhere in `out/`). The chip **is** emitted whenever `p.scheduled_publish_at` is set (`products-app.js:410`, the "Scheduled · <when>" chip), and scheduled-publish is a NEW WS2 feature the IMPLEMENT says "ships working, never a dead button." An undefined custom property makes each `color-mix()` invalid-at-computed-value-time → the chip renders with no background, no border color, and default (inherited) text — i.e. a broken-looking chip on exactly the feature we're introducing. Neither addendum caught it.

**Fix:** map `--staged` → `--waiting` (the orange staged-edits token; matches the editor's own "the fields you changed are ringed orange" language) in `products.html`. Enumerate this as an explicit copy-in diff (WS1 Phase 1.1a or WS2), since §A otherwise claims the shells ship verbatim.

### 3 · MEDIUM — Env chip on Live: doc-vs-code mismatch + dead green variants + a stale IMPLEMENT note
Both `mountShell` (`portal.js:158-159`) and the products page (`products-app.js:787-793`) **hide** the env marker entirely on Live (`else { chip.display='none'; strip.display='none'; }`). Yet DESIGN **§D.3** and INTEGRATION **§3.1** both describe "`everlastingsbyemaline.com` → **Live (green)**," and `portal.css:471-472,481-482` ship `.test-chip--live` / `.envstrip.is-live` green variants that `applyEnvChip` (`portal.js:23`) toggles — all of which are **dead code, never rendered** (both call sites only call `applyEnvChip` when `isTest`). So the spec promises a green "Live" chip that never appears.

Separately, the IMPLEMENT WS1 integration-seam note (**line 419**) is **factually wrong**: it says products-app.js "calls applyEnvChip only when env.isTest and has no Live branch … the products page would show a stale 'Test' chip [on Live]." The shipped `products-app.js:791-792` *does* have an else-branch that hides both chip and strip on Live — identical to `mountShell`. There is no divergence and no stale-Test-chip bug; chasing it wastes build time.

**Fix:** make a decision and align docs+code once — either (a) show a green "Live" chip on prod (call `applyEnvChip` on Live too, drop the hide-branch), honoring §D.3/§3.1 and the CSS that already exists; or (b) keep "hidden on Live" and rewrite §D.3/§3.1 to say the marker is intentionally Test-only (and note the green variants are reserved/unused). Delete/correct the false WS1 line-419 note.

### 4 · LOW — DESIGN §A over-claims "verbatim except WS1's enumerated diffs"
§A says "the only diffs WS1 applies to the shipped files are the enumerated ones (robots meta; routing/config wiring) — everything else is verbatim." True *for WS1*, but other workstreams also edit shipped `*-app.js` content:
- WS2 Phase 2.1.c edits `products-app.js:364` `product_type` options `["miniature","printable","storybook"]` → `["miniature"]`.
- WS8 (TESTING item 29) removes the `unseenOrders` stub + the Sold-tab `data-alert` (`products-app.js:13,98`).
- WS3 (TESTING item 12) removes the Delivered pill + `.tpill--delivered` (`orders-app.js:69` + CSS).
- WS1 seam note itself swaps `products.html:334` static View-Site href → `P.siteUrl()`.

These are content/enum edits, **not** class renames or structural reshapes, so the load-bearing spirit ("don't reshape markup or rename classes") holds — but the addendum should enumerate this small set so a fidelity reviewer (B) and the builder don't read "verbatim" too literally. (Fold Finding 2's `--staged` fix into the same enumerated list.)

### 5 · LOW — `data-flow.md` computed-state block is doubly stale but only half-flagged
The addendum flags `data-flow.md:55` (`is_published && !available → sold`) as superseded. But the same block (`data-flow.md:52-57`) also says LED **red** draft / **yellow** edits and "the row LED is 3 colors only" — both wrong against the shipped palette (draft = yellow, edits = orange `--waiting`) and against the 5-color reality (Finding 1). `data-flow.md` sits in the IMPLEMENT read order, so a cold reader can mis-derive from it. Add the same superseded-callout to its color/"3 colors only" lines. (Render-safe because `portal.css` ships verbatim — doc-hygiene only.)

### 6 · VERY LOW — Once-only sale popup a11y
`main.js mountSaleChrome` (IMPLEMENT Phase 4.3.c) sets `role="dialog"` on a non-blocking promotional popup without focus management/trap. A `role="dialog"` that never moves focus is a mild a11y mismatch; a status/complementary region (or genuine focus handling) fits better. Marginal; render-tune. Everything else in §D.1/§D.2 checks out: all storefront tokens referenced (`--accent-primary`, `--text-muted`, `--space-sm`, `--color-ink`, `--text-inverse`, `--color-gold`, `--header-height`, `--z-modal`, `--z-cookie`, `--text-2xl`, `--font-display`, etc.) are defined in `assets/css/styles.css`; brand separation holds (storefront tokens only, no portal indigo); the popup animation is correctly gated behind `prefers-reduced-motion: no-preference`; `priceHTML` is injection-safe (numbers only).

---

## What is CORRECT (checked, holds — do not re-raise)

- **State palette in shipped `portal.css`** matches DESIGN §B + FEEDBACK §3 exactly: `--live` green, `--waiting` `#D95301` orange, `--draft` yellow, `--sold` `#297fb4` blue, `--archived` `#83718a` purple-gray, plus a flat-hex `@supports` fallback. (`tokens.css` still carries the OLD pre-feedback palette — expected and documented in §B; a reviewer must NOT "restore" `tokens.css` values into `portal.css`.)
- **3-state blink semantics** correct: `.led--draft` blinks at 1.7s, `.led--edits` (orange) blinks faster at 1.2s ("staged is the more urgent nudge") — matches FEEDBACK §3.
- **computeState precedence** (`products-app.js:16-22`) = `archived > draft(!is_published) > edits(draft) > sold(qty0) > live`, with **no** `!available→sold` branch — matches the locked sold-policy; Available-OFF→Draft is implemented in `commitAvail` (`:234-240`).
- **KILL list holds** across all four surfaces: no product tiles (products are `.prow` rows, no card-grid class anywhere), no components-inside-components (editor uses plain spaced `.field`s), no words inside the product-state LED/pill (STATE_WORD is a native `title` tooltip only, not a visible tag), no "Content Creator Portal" brand header (topbars are just Products/Orders/Sales/Account + env chip), no oversized mobile fonts. (Orders `.tpill` "Shipped/Refunded/Needs shipping" are legit CRM workflow labels — not the product-state pills the KILL list targets; data-flow.md §B explicitly wants them.)
- **Mobile-primary by construction:** one `.prow` component renders as an 8-col desktop grid AND a dense 4-col mobile list item + a full-width toggle strip (`products.html:33-90`); nav is one component rotating between the desktop rail and the mobile bottom tab bar (`portal.js mountShell`); `.input` is 16px on mobile, tightening to 14px only at ≥860px (`portal.css:297-308`), and modal/`#urlInput` inputs are explicitly re-pinned to 16px on mobile (`products.html:290`) — iOS zoom-jump avoided.
- **Publish-gate honesty (a11y):** `publishBtn` (`products-app.js:428-433`) returns a genuinely `disabled aria-disabled="true"` button when `!readiness().ok`, paired with the plain-language "To publish, add …" text (`:423`) — computed, not CSS-faked. Focus rings reach every control per `portal.css`. Reduced-motion is universal (`portal.css:528-532`), so it also neutralizes the page-scoped Sold-tab `tab-alert` blink.
- **Publish-requires-preview** is correctly deferred to WS2 Phase 2.1.e / INTEGRATION §3.8 (the prototype's `publishBtn` enables on fields-met; the integration adds the "must preview first" gate) — not a gap.
- **Media modal (§C.2)** ships in `out/` markup (`products.html` `.modal`/`.dropzone`/`.mitems`/role pills + `products-app.js` `openMedia`/`applyMedia`/`renderMedia`); the integration reconciles data-shape only. The three NEW storefront components (struck-`%` `.price-sale`, #221 top bar + once-only popup, env chip) are specified concretely (full markup + CSS) and use storefront tokens, not portal tokens.

---

## If you fix ONE thing
Reconcile the **LED state-color rule** (Finding 1) across ledger 20, DESIGN §C.1 + §E, the IMPLEMENT locked-decision, and TESTING item 5 to match the shipped 5-color reality + Sean's FEEDBACK §3 — including the backwards `.led--*` vs `.dot--*` attribution in §C.1. It is the one place the docs actively contradict both the canonical `out/` code and Sean's explicit request, and TESTING item 5 as written would fail the correct render and could push a builder to delete the blue-sold / purple-gray-archived LEDs Sean asked for.

## Verdict
**NEEDS ANOTHER PASS (NARROW)** — the design layer is fundamentally correct and the `out/` package renders right; the remaining work is a bounded doc-reconciliation (Findings 1, 3-note, 5) plus two concrete shipped-file fixes (the `--staged` render bug, and the env-Live decision). No structural redesign; a scoped fold closes it.
