# v3.7.0 — Breadth Gap Review: Owner-Journey (fresh pass)

> Effort: MAXIMUM. All three build docs (`v3_7_0_IMPLEMENT.md`, `v3_7_0_ADDENDUM_DESIGN.md`, `v3_7_0_ADDENDUM_TESTING.md`) read end-to-end. The settled "do not re-raise" ledger (entries 1–72, `v3_7_0_REVIEW_PROMPTS.md`) read and honored — none of the findings below duplicate a ledger entry. Repo cross-checked against the actual `api/products.ts` and the delivered `assets/docs/archive/v3_5/design-handoff/out/products-app.js` prototype where the docs made a claim I could verify.

THESIS (the lens): minimize Emaline's friction to run her store, mostly through her Custom GPT on her phone; she opens `/admin` only to fix something. Both surfaces must be fully capable as if the other didn't exist. A gap is anything that makes a real maker journey confusing, dead-end, or silently wrong.

---

## Finding 1 — [LOAD-BEARING] The Available OFF→ON round-trip silently un-freezes and re-stamps a piece the "frozen after publish" invariant was supposed to protect forever

**Journey it breaks:** "Put a piece back up for sale" (the Available OFF→ON round-trip, §2.2 + the commitAvail-ON seam) — the exact journey this review was asked to trace.

**Where:**
- `api/products.ts:337-340` (`FROZEN_AFTER_PUBLISH` = `checkout_name, checkout_description, checkout_image, sku, stripe_product_id, stripe_price_id`) and `:390` (`if (current.is_published) { … frozenAttempt … }`, the guard at `:398-409`) — the freeze is gated on **`current.is_published`** (a piece's CURRENT publish state), not on whether it has ever been published.
- `api/products.ts:618` (`if (row.is_published) { … } // Edit-publish` in `handlePublish`) vs. the **first-publish** branch below it (`:654` `validatePublishRules(row…)`, `:676-684` the `.update({ is_published: true, published_at: new Date().toISOString(), …, ...autoGen })`) — the branch choice is *also* keyed on `row.is_published`, nothing else.
- `v3_7_0_IMPLEMENT.md` §2.2 (Phase 2.2, the NEW code that makes Available-OFF set `is_published = false` on a live piece) — this is the fold that creates the new reachable state "`is_published=false` but `published_at` is already set (was live before)."
- `v3_7_0_IMPLEMENT.md` §2.7's own OWNER-DECISION block (line ~918) already says out loud: *"The expanded `validatePublishRules` re-runs on edit-publish (:631) and first-publish (:654), so it also gates republish and the Available OFF→ON round-trip (Phase 2.2 unpublishes to draft on OFF; the `commitAvail` ON seam then re-publishes, hitting the full gate)."* — i.e. the authors correctly identified that OFF→ON routes through the **first-publish branch**, and reasoned about ONE consequence of that (the strict validation gate). They did not follow the same routing fact to its OTHER consequence below.
- `v3_7_0_IMPLEMENT.md` §5.4e (Phase 5.4e, "checkout_image is FROZEN after first publish") — the media-modal lock is scoped "on a **published** product," the same ambiguous word.
- Corroborating evidence in the delivered prototype, `assets/docs/archive/v3_5/design-handoff/out/products-app.js`: `:339` `const … published = p.is_published …` is what drives `locked: published` on `product_type` (`:364`), `slug` (`:375`), `checkout_name` (`:377`), `checkout_description` (`:380`) in the editor — confirming the client lock is genuinely `is_published`-keyed, matching the server gate. And `:561`, the mock's own `doPublish`, is careful to write `if (!p.published_at) p.published_at = new Date().toISOString();` — the **design intent was clearly "stamp it once, never again"** — but the real backend's first-publish branch (`api/products.ts:678`, Phase 2.5's NEW block) stamps `published_at` **unconditionally** every time that branch runs, with no such guard.

**Concrete failure scenario:** Emaline publishes a piece. Weeks later she pauses it (Available OFF — a completely ordinary, encouraged action; nothing in the design discourages this). While it's paused, `is_published` is `false`, so:
- **In the portal editor**, `checkout_name` / `checkout_description` render **unlocked** (no lock icon, no "Locks after first publish" tooltip) — indistinguishable in the UI from a brand-new draft that has never been live.
- **In the media modal**, per §5.4e's "on a published product" test, the `checkout_image` role is very likely also treated as unlocked (same `is_published` signal the rest of the surface uses for this exact concept — I can't see the modal's exact lock-check line in the docs, so I'm flagging this half needs-verification, not asserting it).
- If she (or the GPT, via `editProduct`) edits `checkout_description` or re-roles a different photo as the checkout image while the piece sits in this paused state, the server's `FROZEN_AFTER_PUBLISH` guard (`api/products.ts:398`) **does not fire**, because it too is gated on `current.is_published` — which is `false` right now. The edit writes straight through (the unpublished-draft PUT branch's allow-list explicitly includes `checkout_name, checkout_description, checkout_image` — WS2 Phase 2.4's `clean` object).
- She toggles Available back ON. The `commitAvail` ON seam does `PUT {available:true}` → `POST ?_action=publish {id}`. Because `is_published` is still `false` at that instant, `handlePublish` takes the **first-publish branch** (`api/products.ts:618` `if (row.is_published)` is false) — not the edit-publish branch. That branch re-runs the Stripe sync and, per Phase 2.5's NEW code, unconditionally re-stamps `published_at: new Date().toISOString()` and persists whatever `checkout_image`/`checkout_description` currently sit on the row — **with no 400, no toast, no warning**. The "frozen forever" identity fields (ledger 24, a *locked decision*) silently changed, and the piece's original publish date is gone.

This is invisible on both surfaces: the portal never disables the fields (so there's nothing that "reads as wrong" to notice), and the GPT has no reason to avoid `editProduct{checkout_description:...}` on a currently-`available:false` piece — nothing in its schema/instructions says "this field only unlocks-looking because it's temporarily paused, not because it's safe to change."

**Why this is new, not a re-raise:** before this build, Available-OFF never touched `is_published` (Phase 2.2's diff shows the CURRENT code only ever sets the `available` flag). So `FROZEN_AFTER_PUBLISH`'s `is_published`-gate was always accurate — a live-but-out-of-stock piece stayed `is_published=true`, stayed frozen. Phase 2.2 is what manufactures the new "`is_published=false` but previously-live" state that the pre-existing freeze/branch logic was never taught to recognize. This is exactly the "a fix (Phase 2.2's sold-policy fold) seeds the next bug" shape the gate is designed to catch.

**The fix or the decision it needs:** gate `FROZEN_AFTER_PUBLISH` (`api/products.ts:390`) and the client "locked" checks (the editor's `published` var, the media modal's checkout-role lock) on **"has this piece ever been published"** (`published_at != null`) instead of "is it currently published" (`is_published`) — and give `handlePublish` a real three-way branch: never-published (first publish: create Stripe objects, stamp `published_at`, run the missing-checkout-essentials check) vs. currently-published-with-a-draft (edit-publish) vs. **previously-published-now-paused-being-relisted** (republish: re-validate + re-sync Stripe if needed, but do NOT re-stamp `published_at` and DO NOT allow `FROZEN_AFTER_PUBLISH` fields through). This is Sean's call because it touches the exact wording of a locked decision ("checkout_image is FROZEN after first publish") — worth confirming the intent is truly "frozen forever" (my read of ledger 24 + the design language) before prescribing the fix.

---

## Finding 2 — [LOAD-BEARING, spec-ambiguity — needs a decision, not asserted broken] Media-modal partial-failure recovery never says whether the terminal PUT still fires on early-stop

**Journey it breaks:** "Media upload modal — a partial failure mid-fan-out."

**Where:** `v3_7_0_IMPLEMENT.md` §5.4c.i, the "Partial-failure recovery" bullet list (the block that authors `.mitem--errored`, ledger 48/61/70a — already closed as CSS-exists/mechanism-exists; this finding is about a DIFFERENT gap in the same block: the data-persistence sequencing, not the visual ring).

**The gap:** the spec says the diff/fan-out "(i) stop the fan-out — do NOT roll back the successful writes… (iv) DO NOT clear `mItem.openedRoles` on the failed item so the next Apply retries only the remaining diff… the local model is always ≤ server." That last clause only holds if the items that *did* succeed before the failure are actually **persisted to `products.images`/`.media` via the terminal `PUT /api/products?id=`** — but the bullet list describes only the per-item re-upload POSTs and never says whether `applyMedia` still fires that one terminal PUT when it stops early on an error, or whether the whole function aborts (skipping the PUT) once it hits the failure.

**Concrete failure scenario:** a maker re-roles 3 images in one Apply. Item 2's re-upload POST throws (an R2 hiccup — explicitly named as an expected cause). If the terminal PUT is skipped on early-return, item 1's newly-uploaded CDN object exists on R2 but is **never written to the product row** — the piece's visible gallery doesn't change at all, contradicting the "local model ≤ server" invariant and reading exactly like the "it just didn't work and didn't say why" failure mode the review lens exists to catch (a toast does fire naming item 2, but item 1's change is silently lost, not just paused — if the maker doesn't immediately retry and instead closes the modal, that CDN upload is orphaned indefinitely with zero DB trace).

**The fix or the decision it needs:** make explicit in §5.4c.i that Apply always fires the terminal `PUT` with whatever partial `p.images`/`p.media` state exists at the moment of failure (not just on full success) — this is almost certainly the intended reading (the mock's `applyMedia` in `out/products-app.js:761` is a single synchronous write, so the "server ≥ local" framing only makes sense if the real async version still persists after a partial fan-out), but it should be said outright rather than left for the builder to infer.

---

## Finding 3 — [POLISH] GPT-side scheduled publish has no push signal when it silently gets skipped — only a portal-only pull

**Journey it breaks:** "Schedule a publish for later."

**Where:** `v3_7_0_IMPLEMENT.md` §10.1b.a (the `scheduled_publish_at` GPT-schema description, the only guard against scheduling an under-filled piece) + the A2-4 backstop (§2.6, `product.schedule_skipped` activity-log entry) + ledger 70d ("the activity feed is portal-only BY DESIGN — no `listActivity` Action").

**The gap:** on the portal, the Schedule control is only OFFERED on a publish-ready piece (§2.4's `readiness()` gate) — a structural, client-enforced guard. On the GPT, the equivalent guard is purely an instruction ("NEVER schedule a piece that isn't publish-ready… verify… if missing, name the fields and offer to fix first") — advisory, not enforced by the schema or the server (the `PUT` that sets `scheduled_publish_at`, Phase 2.4, only validates that the value is a parseable ISO timestamp, not that the piece is publish-ready). If the model schedules an incomplete piece anyway, the cron silently skips it at the next run (by design — the A2-4 backstop), and the **only** trace is a portal-only Account activity-log row. Per the thesis, Emaline manages the store mostly through the GPT and opens the portal only to fix something she already knows is broken — but nothing on the GPT side would ever prompt her to suspect a scheduled publish quietly failed, since the GPT has no way to check the activity log or be told about it on her next visit.

**Fix or decision:** not a launch blocker (the primary defense — the instruction to verify readiness first — is real, and this mirrors the already-accepted asymmetry that the activity log is portal-only by design). Worth a note for a future round: have the GPT proactively check `getProduct` readiness for any piece with `scheduled_publish_at` set whenever Em opens a new chat, or surface recent `schedule_skipped` activity rows on her next GPT session.

---

## Finding 4 — [POLISH] Phase 4.1.d's promised WS10 `listCoupons` schema fold is never actually authored (functionally moot, but a real doc-completeness gap)

**Journey it breaks:** "Run a store-wide sale — can the GPT identify + end it without an `active_sale` read op."

**Where:** `v3_7_0_IMPLEMENT.md` §4.1.d says: *"to expose it to the GPT too… include `auto_apply` in the `listCoupons` Action response schema (schema-only, no `.txt` cost, WS10)."* I read all of WS10 (§10.1, 10.1b, 10.1c, 10.2, 10.2b, 10.3, 10.4, 10.5, 10.6) end-to-end — none of them touch `listCoupons`.

**Why it's still fine in practice (verified against the actual base schema file):** `assets/docs/archive/v3_3/v3_3_0_GPT_SCHEMA.txt:239-240` shows `listCoupons`'s `responses: '200': { description: Active coupons. }` has **no declared response properties at all** — Custom GPT Actions read the live JSON payload regardless of whether a response schema names each field, so the GPT will see the real `auto_apply` value (added server-side by WS4 §4.1.d) in the actual API response with or without this schema edit. Functionally this is a non-issue; the GPT already ends the sale correctly via the `store_wide`+`percent` heuristic (ledger 60/68).

**Fix:** none required functionally — flag so a later reviewer doesn't spend time hunting for a "missing" fold; either soften §4.1.d's WS10 promise or (cheap, if wanted) actually add the `auto_apply` property under `listCoupons`'s (currently property-less) response for documentation self-consistency.

---

## Finding 5 — [POLISH] Plain-words 400 translation isn't extended to the seven newly-required-to-publish fields, on either surface

**Journey it breaks:** "Create a piece → fill fields → publish — are the plain-words 400 reasons legible on both surfaces?"

**Where:** `v3_7_0_IMPLEMENT.md` §10.2b (the PUBLISHING instruction beat) only models translating two field names for the GPT — *"story_card = the story, headline = the tagline"* — predating this build's newly-flagged publish-required fields (`dimensions, weight, materials, care_instructions, shipping_details, quantity, features`, §10.1c). Those are reasonably self-explanatory as snake_case (low risk), but the instruction text wasn't refreshed to model translating them the same way it does for the two non-obvious internal names. On the portal side, `validatePublishRules`'s error string (`` `Missing required fields: ${missing.join(', ')}` ``, `api/products.ts`) is a comma-joined list of raw field keys — nothing in the doc specifies how the portal maps that string back to the editor's own human labels (which visibly exist — `f({label:"Checkout description", …})` etc. throughout `products-app.js`) versus just toasting the raw snake_case string.

**Fix:** low priority — a competent builder mapping the error string against the editor's existing field-label table is the obvious move and the labels already exist client-side; worth naming so it isn't accidentally skipped in favor of toasting the raw server string verbatim.

---

## Finding 6 — [POLISH, trivial] The Orders-nav blink ships hardcoded "on" in the static markup, briefly flashing before `refreshOrdersSignal()` corrects it

**Journey it breaks:** "A sale completes → order appears (seen/unseen tracking + the faint flashing Orders tab)."

**Where:** `assets/docs/archive/v3_5/design-handoff/out/products.html:321` and `:372` ship `data-alert` hardcoded on the Orders rail/tabbar item (the mock's permanent demo state) — WS8 Phase 8.3's `refreshOrdersSignal()` does `el.toggleAttribute("data-alert", unseen > 0)`, which corrects it, but only after `PORTAL.boot()` resolves and the `GET /api/orders?status=needs_shipping` round-trip completes. On every single page load — even when there are genuinely zero unseen orders — the Orders nav item will render with the blink ON for one paint, then clear.

**Fix:** cosmetic only; matches the already-accepted pattern for the env chip (ledger notes the same class of "mock renders a placeholder state, JS corrects it post-boot" elsewhere in this build). Not worth a build change; noting for completeness since a clean pass should still surface polish.

---

## The one thing to fix first

Finding 1. It's the only item here that silently defeats a **locked design decision** (checkout identity fields frozen forever) through a completely ordinary maker action (pause a listing, then relist it) — on both surfaces equally, since the GPT's `editProduct{available:true}` → `publishProduct{id}` path and the portal's `commitAvail` ON seam both terminate in the exact same `handlePublish` first-publish branch. It was directly enabled by this build's own Phase 2.2 fold and wasn't caught by the round-1 gate even though that gate's own owner-decision block (§2.7) reasoned about a different consequence of the identical code path.

## Verdict

**NEEDS ANOTHER PASS (NARROW)** — scoped to: (1) Finding 1 — Sean's call on the exact semantics of "frozen after publish" (currently-published vs. ever-published) + the `handlePublish` branch fix; (2) Finding 2 — a one-line clarification that the media-modal terminal PUT fires on partial as well as full success. Findings 3–6 are non-blocking polish, safe to carry forward or fold opportunistically.
