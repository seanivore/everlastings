# v3.7.1 — Gap Review D (design-correctness) — B/C/D gate

**Reviewer**: Angle D — design-correctness (repo + design addendum + design research), fresh isolated peer. Effort: maximum — read end-to-end, no skimming.

**Scope read (complete)**: `v3_7_1_REVIEW_PROMPTS.md` (full Angle-D block + the shared 77-entry settled ledger) · `v3_7_1_IMPLEMENT.md` (all 3737 lines, WS1–WS10) · `v3_7_1_ADDENDUM_DESIGN.md` · `v3_7_1_ADDENDUM_TESTING.md` · `v3_7_0_GAP_REVIEW_BREADTH_INTEGRATION.md` + `..._JOURNEY.md` (for context/non-duplication) · `design-handoff/brief.md` · `design-handoff/feedback/FEEDBACK_v1.md` · `design-handoff/tokens.css` · `design-handoff/reference/LEGEND.md` · `design-handoff/controls.html` (nav/token sections) · every file in `design-handoff/out/`: `portal.css`, `portal.js`, `products.html`, `products-app.js` (full 808 lines), `orders.html`, `orders-app.js`, `sales.html`, `sales-app.js`, `account.html`, `account-app.js`, `data.js`, `INTEGRATION.md`, `PRODUCT_LIFECYCLE.md`, `README.md`. Cross-checked several claims directly against the live repo (`assets/css/styles.css` badge/token anchors, `assets/js/product.js` `previewToken` scoping).

None of the findings below duplicate ledger entries 1–77 — every one is new, found by reading the actual byte-source (not the addendum's prose) end-to-end.

---

## 1. Ranked gap list

### #1 — [LOAD-BEARING, needs a decision] The "must-preview-before-publish" gate is spec'd as a genuine disable+explain, but the wiring plan silently repurposes a same-labeled button instead

**Location**: `design-handoff/feedback/FEEDBACK_v1.md` §9 (Sean's explicit spec) + `design-handoff/out/INTEGRATION.md` §3.8 ("Publish requires a Preview for new products") vs. `v3_7_1_IMPLEMENT.md` WS2 Phase 2.1e vs. `design-handoff/out/products-app.js:428-433` (`publishBtn()`) + `:560-565` (`doPublish()`).

Sean's FEEDBACK_v1 §9 is explicit: *"[Publish] stays grayed out and unclickable because they MUST PREVIEW the page if it is new and they have not yet... if this is why it is gray and unclickable we should tell them new entries must be previewed first."* INTEGRATION.md §3.8 repeats this as a named gap: *"Publish stays disabled for a new, never-published product until it's been previewed at least once... The prototype gates on missing fields; add the 'must preview first' gate in integration."*

I verified the prototype (`products-app.js`) implements **no such gate at all** — `publishBtn()` only checks `readiness(p)` (field-completeness) and `p.draft`/`p.is_published`; there is no `previewed`/`preview_token`-derived flag anywhere, and `openPreview(id)` (line 251) only fires a toast, never sets state. For a ready, never-published piece, `publishBtn()` returns an **enabled** `<button class="btn btn--publish-new" data-publish>Publish · go live</button>`, and its click handler calls `doPublish(id)` directly — one click, immediately live, no preview required. This confirms INTEGRATION §3.8's own admission that the gate is missing.

IMPLEMENT.md's fix (Phase 2.1e) does **not** restore the disable+explain mechanism Sean spec'd. Instead: *"`doPublish` (:560) for a row with no `published_at` must first ensure the draft is persisted (so a `preview_token` exists), then open `preview_url`; the real Publish fires on the preview page as `POST ?_action=publish {token}`."* This repurposes the **click** of the same `btn--publish-new`/"Publish · go live" button into a silent redirect-to-preview for a never-published piece — the row editor's Publish control never actually publishes for a virgin product once wired. But:
- The button's **label is never updated** for this state ("Publish · go live" still implies one click = live).
- No copy/toast is specified to explain "opened preview — publish from there" after the redirect.
- The button is **not disabled** the way Sean explicitly asked (no gray-out, no "must preview first" tooltip) — it stays interactive and misleading.

This is the one place in the whole build where the review lens's own explicit charge — *"honest computed enable-disable (the Publish gate genuinely disables + explains)"* — is not honored for a real, spec'd control. A maker clicking a button that reads "Publish · go live" would reasonably expect the piece to go live; instead nothing publishes and a new tab opens with no on-screen explanation of why. This also reads as a "multi-click state change" the KILL list forbids (click 1 = silent redirect; click 2, on a *different* page/control the maker has to discover, is the real publish) without ever surfacing that two-step reality.

**Flag, not assertion**: I can't rule out that the eventual builder adds clarifying copy on their own initiative when implementing Phase 2.1e — but nothing in the doc requires it, and no phase touches `publishBtn()`'s label logic for this state.

**Concrete fix (either, Sean's call)**: (a) restore the spec'd mechanism — track a real "has this draft been opened in Preview" signal (e.g., stamp a `previewed_at` server-side the first time `preview_token` is fetched via the public preview route, or simplest: gate client-side on "has the maker's own `openPreview()` fired this session for this row") and genuinely disable the button + reuse the existing `btn-why` reason pattern ("Preview it once before publishing"); or (b) if Phase 2.1e's redirect-on-click is the intended final design, add a distinct button state/label for "never-published, ready, not yet previewed" (e.g., "Preview to publish") plus a toast on redirect ("Preview opened — tap Publish there to go live"), so the control never silently does something other than what it says.

---

### #2 — [LOAD-BEARING for the named invariant, narrow scope] The sign-in screen's animated background ignores `prefers-reduced-motion` entirely

**Location**: `design-handoff/out/account-app.js:114-186` (`initLoginFx`, the canvas "ribbons" background) vs. `v3_7_1_ADDENDUM_DESIGN.md` §E ("`prefers-reduced-motion` is honored... Confirm the LED/tab blink and the new-order alert respect it") and the cross-cutting invariant "Reduced-motion preserved" (ledger #11, restated in IMPLEMENT's own Invariants section and TESTING's cross-cutting list).

`initLoginFx()` drives a continuous `requestAnimationFrame` loop (line 174) painting 12–22 glowing, swaying ribbons across the full viewport behind the sign-in card, indefinitely, with pointer-repel physics. I grepped every file in `out/` for `matchMedia` and `requestAnimationFrame`: the **only** `matchMedia` calls anywhere in the package are mobile-breakpoint checks (`max-width:560px`/`859px`) — there is no `prefers-reduced-motion` check anywhere in `account-app.js` or any other surface. `portal.css`'s reduced-motion block (`:528-532`) is CSS-only (`transition-duration`/`animation-duration` overrides) and has **zero effect** on a JS canvas loop driven by `requestAnimationFrame` + manual `ctx.clearRect`/`ctx.stroke` calls — there's no CSS animation/transition here for the media query to catch.

This directly contradicts the addendum's own Angle-D checklist line, which asks the reviewer to confirm reduced-motion is honored and only names the LED/tab blink + new-order alert as the things to check — the sign-in canvas is a real motion source it never mentions, and nothing in WS1 (which does rewire the account surface's auth logic in Phase 1.4) touches this. A vestibular-sensitive maker with `prefers-reduced-motion: reduce` set at the OS level gets the full moving/glowing background regardless.

**Concrete fix**: wrap the `initLoginFx()` call (or its `requestAnimationFrame` loop) in `window.matchMedia('(prefers-reduced-motion: reduce)').matches` — skip the canvas entirely (or paint one static frame) when true. Cheap, bounded to one function; worth adding as a named edit in WS1 Phase 1.4 since no existing phase covers it.

---

### #3 — [POLISH, documentation-accuracy] DESIGN §C.3's "SETTLED" char-counter description doesn't match the actual shipped mechanism it claims to be byte-checked against

**Location**: `v3_7_1_ADDENDUM_DESIGN.md` §C.3 (the D-v361-2 SETTLED block) vs. `design-handoff/out/portal.js:85-101` (`wireCharCount`) + `design-handoff/out/products-app.js:276-292` (the `f()` field-builder, `rec:` usage at lines 361-380).

The addendum states: *"Ship BARE counts by default for on-page copy fields (title/headline/description/story_card): the `.count` counter increments with keystrokes and turns `.is-over` only where a REAL cap applies... SEO fields keep their platform-imposed caps as `data-target` attributes... Only two fields have `data-target`; every other field is a bare count."*

I verified the actual shipped code says something different: the attribute is `data-rec` (never `data-target` — that string appears nowhere in any `out/` file, confirmed by grep), and `portal.js`'s own comment states the real behavior: *"live character counter: shows characters REMAINING vs the recommended length; turns red when ≤10 left."* This is a **decrementing "remaining" countdown**, not an incrementing bare count, and it is wired via `rec:` on **ten** fields, not two: title (60), headline (80), story_card (220), description (320), artist_note (240), slug (50), checkout_name (60), seo_title (60), seo_description (155), checkout_description (90). Every one of these will visibly flip to the `.is-over` warn color once the maker types within 10 characters of its `rec` value — including Title, Headline, Story card, and Description, which the addendum insists are "bare, no is-over" fields with no real cap. Since `out/` ships verbatim (DESIGN §A) and no WS2 phase touches the char-counter mechanism, this is what will actually ship — a maker could see an unexplained "you're near the limit" warning on a field that has no real limit.

Not a rendering break (the CSS/JS mechanism is internally consistent and functions), but the addendum's own "Angle-B byte-check... verified byte-identical against `out/`" claim doesn't hold for this specific decided block, and a future reader (this being explicitly a reusable template) could build the described §C.3 upgrade path (a `FIELD_CONFIG`-driven per-field-target system) against the wrong mental model of what's currently shipping.

**Fix**: correct §C.3's prose to describe the real `data-rec`/"remaining, `.is-over` at ≤10 left, on ten fields" mechanism — or, if the two-field-only "bare count" behavior is genuinely still wanted, file it as an actual WS2 builder task to change `products-app.js`'s field configs (drop `rec:` from the eight non-SEO fields, or split the counter into two visual modes).

---

### #4 — [POLISH, latent trap] `data.js` ships its own stale, superseded `computeState()`, contradicting the correct one in `products-app.js` — currently dead code but a real internal inconsistency in the canonical byte-source

**Location**: `design-handoff/out/data.js:395-402` vs. `design-handoff/out/products-app.js:15-22`.

`data.js` exports (and comments as *"computed state (contract)"*): `if (p.is_published && !p.available) return "sold";` — this is exactly the `data-flow.md:55` rule that IMPLEMENT.md, the DESIGN addendum, and `products-app.js`'s own `computeState()` all explicitly call **SUPERSEDED** (ledger 20: sold = `quantity===0` from a real sale, never `!available`). `products-app.js` correctly implements the quantity-based version locally (lines 16-22) and does not import/use `data.js`'s copy. I confirmed via grep across `orders-app.js`, `sales-app.js`, and `account-app.js` that none of them destructure or call `D.computeState`/`PORTAL_DATA.computeState` either — it is genuinely unused, harmless today.

But it's still a real defect in the delivered design package: two contradictory implementations of the same "contract," one of them wrong, both labeled as canonical, shipped in the same eleven-file set that ships verbatim into `/admin`. For a reusable template whose whole pitch is future re-use, this is exactly the kind of latent trap a later maintainer (or an AI agent extending the template) could reach for and get the wrong sold-semantics from.

**Fix**: delete `data.js`'s stale `computeState` (or point it at the same logic `products-app.js` uses) as a one-line cleanup in WS1 Phase 1.1a's file-landing step.

---

### #5 — [POLISH, already partially surfaced] Server 400 messages for the publish gate use raw snake_case field keys, not the plain maker's-language the brief explicitly demands

**Location**: `design-handoff/brief.md` §5.2 ("the control says what's missing (in plain maker's language, not 'field required')") vs. `v3_7_1_IMPLEMENT.md` WS2 Phase 2.7's `validatePublishRules` (`problems.push(\`Missing required fields: ${missing.join(', ')}\`)`) vs. `design-handoff/out/products-app.js:47-70` (`readiness()`, which already IS plain language: "a title," "dimensions (W × D × H)," "care instructions") vs. `v3_7_1_ADDENDUM_TESTING.md` item 6b (which quotes `"Missing required fields: care_instructions"` as an acceptable example of "the plain-words field reason").

The client's own `readiness()` sets the bar correctly (spaced, human phrasing, no underscores). The server's `validatePublishRules` — which is the actual backstop a maker could hit on a client/server readiness mismatch (e.g., a legacy or GPT-created piece) — returns raw field keys (`care_instructions`, `shipping_details`) with no mapping back to the human labels that already exist client-side (`f({label:"Checkout description",...})` etc.). TESTING item 6b itself treats the raw key as sufficiently "plain," which undercuts the brief's stricter bar.

This was already surfaced by the v3.7.0 breadth-journey pass (its Finding 5, POLISH) but was not named in the v3.7.1 ledger's fold/defer lists (73-77) — it remains open and is squarely inside this angle's explicit "the plain-words 400 reasons are legible" charge, so I'm re-surfacing it rather than silently dropping it.

**Fix**: low-cost — map the server's returned field-key list through the editor's existing label table before toasting (the labels already exist client-side), or add a small server-side key→label dictionary alongside `validatePublishRules`.

---

### #6 — [POLISH] The Sales "New sale" piece-picker doesn't distinguish published from draft pieces, though only published pieces can legally scope a coupon

**Location**: `design-handoff/out/sales-app.js:11` (`pickProducts = (D.products || []).filter((p) => !p.archived_at)`) + `renderPickList` (lines 150-175) vs. `v3_7_1_IMPLEMENT.md` §"Locked decisions" ("A product-scoped coupon needs a PUBLISHED piece (a draft has no Stripe id)") and Phase 4.6 ("`product_ids` are `stripe_product_id`, not Supabase ids — map published products first").

The picker filters out archived pieces but not unpublished drafts — a maker can select a never-published draft when scoping a product-specific sale. Phase 4.6's "map published products first" reads as an ID-mapping instruction, not a picker-filtering one, and doesn't specify what happens (or what the maker sees) if a draft is selected. This is inside the newly-designed Sales UI (not pre-existing shipped behavior), so it's fair game for this review even though the underlying coupon-scoping foundation itself is settled/pre-existing.

**Fix**: filter `pickProducts` to `is_published` pieces (or show drafts grayed-out with a short explanation — "publish first to include in a sale"), matching the "honest, nothing hides without explaining" thesis.

---

## 2. Verified clean (explicitly checked against my charge's bullet list — logged so the pass reads as thorough, not absent)

- **Row LED — all five states.** `portal.css:397-409` defines `.led--live/sold/archived/draft/edits` with the exact hex/oklch values from Sean's FEEDBACK §3 (orange `#D95301`, blue `#297fb4`, purple-gray `#83718a`); `products-app.js:91` `ledFor()` correctly derives the state via the LOCAL `computeState()` (quantity-based sold, precedence `archived > draft > edits > sold > live`), matching ledger 20 exactly.
- **Field-border rings.** `portal.css:314-320` implements exactly three ring colors (green/yellow/red); `products-app.js:342`'s `ring()` helper correctly computes red=required+empty, yellow=staged-edit, green=required+filled — matches the spec.
- **Helper-text-as-tooltip + lock-chip tooltip.** `tipI()`/`lockChip()` (products-app.js:273-274) + `portal.js`'s `wireTips()` correctly implement hover(desktop)/tap(mobile) reveal; all three lock-eligible fields (slug, checkout_name, checkout_description) correctly pass `locked: published` and render the shared lock-chip mechanism.
- **Sold/archived get BOTH an LED color and a tab.** Confirmed both `TABS` (line 25-31) and `.led--sold`/`.led--archived` exist and are independently exercised — not either/or.
- **The three storefront card badges' mutual exclusion.** Spot-checked live against the repo: `assets/css/styles.css:593` `.card__media .badge{position:absolute; top:...; left:...}` pins every badge class to the identical corner with no sibling-offset rule — confirming IMPLEMENT's claim that the `sold`/`!sold&&featured`/`!sold&&!featured` mutually-exclusive gate is the load-bearing (and only) thing preventing visual overlap. The gate logic as specified in §6.5a/§6.3d is sound.
- **Brand separation.** The new storefront components (struck pricing, top bar/popup, `.badge-unique`) all reference confirmed-existing storefront tokens (`--bg-primary`, `--accent-primary`, `--text-muted`, `--color-gold`, `--shadow-lg`, `--radius-lg`, etc., spot-checked present in `styles.css`) — zero portal (`--live`/`--waiting`/indigo-slate) tokens leak into them, and vice versa.
- **16px mobile inputs.** `portal.css:298` (`.input,.select,.textarea{font-size:16px}`) and `products.html:290` (`.mitem .input,#urlInput{font-size:16px}` on mobile) both confirmed — the iOS zoom-jump concern is closed everywhere, including the media modal.
- **One component, both layouts.** `rowHTML(p)` (products-app.js:129) is the single function producing both the desktop row and the mobile list item (CSS-responsive, not two code paths) — genuinely "one component." `mountShell()` (portal.js:134) builds the rail AND the tabbar from one shared `NAV` array in a single pass.
- **`.mitem--errored` / `--staged` token bug.** Both independently re-confirmed against the live `out/` byte-source: `.mitem--errored` does not exist yet in `products.html` (consistent with IMPLEMENT §5.4c.i's plan to author it, tokens `--danger`/`--danger-bd` confirmed present); `--staged` is confirmed referenced at `products.html:288` and confirmed absent from both `tokens.css` and `portal.css` — the Phase 2.1f fix is correctly targeted.
- **`previewToken` scoping (ledger 34b).** Spot-checked live: `assets/js/product.js:19` declares `previewToken` inside the async init closure; `populateStickyCard` is a separate top-level function at `:365` — confirms the local re-derivation IMPLEMENT specifies is genuinely necessary, not defensive over-engineering.

---

## 3. If you fix one thing

**Finding #1** — the publish-requires-preview gate. It's the one place a maker-facing control's label and its actual (wired) behavior would diverge, on the single most consequential action in the whole portal (going live for the first time), and it directly contradicts both Sean's own explicit, detailed spec (FEEDBACK_v1 §9) and this review angle's own stated bar ("the Publish gate genuinely disables + explains"). It's a bounded, one-decision fix (pick a mechanism, then either wire a real disable-gate or relabel+explain the redirect) — not a redesign — but it's the one spot where "honest computed enable/disable" is currently not honored for a real control.

## 4. Verdict

**NEEDS ANOTHER PASS (NARROW)** — scoped to two concrete items: (1) Finding #1, a decision + fix on the publish-requires-preview mechanism (disable+explain vs. relabel+explain-the-redirect); (2) Finding #2, wrap the sign-in canvas animation in a `prefers-reduced-motion` check. Findings #3–6 are non-blocking polish/documentation-accuracy items, safe to fold opportunistically alongside the two scoped items or in a later pass — none of them render anything visibly broken today.
