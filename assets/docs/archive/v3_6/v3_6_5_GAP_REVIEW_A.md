# v3.6.5 Gap Review — cold, out-of-repo read

I read all three docs end-to-end. The triplet is mature — the ledger (1–56) has folded the vast majority of the real interaction risk, and the byte-anchored backend work is genuinely exclusively-executable. What remains is one unsurfaced cross-cutting **decision** (a regression the stricter publish gate creates against the *existing* catalog), a couple of verify-first assumptions the docs present as settled, and a handful of polish items. None of these are re-raises of the ledger — I checked each against entries 1–56 and the false-alarm classes.

## Ranked findings

### 1. [LOAD-BEARING · decide + test] The stricter `validatePublishRules` runs on edit-publish/republish of **existing** pieces — legacy catalog pieces can become un-republishable
**Where:** WS2 Phase 2.7 (retargets both publish branches `:631`/`:654` from `validateProductRules` → `validatePublishRules`), interacting with Phase 2.2 (Available-OFF→Draft) + the WS2 seam row `commitAvail ON` (`[PUT {quantity}] → PUT {available:true} → POST ?_action=publish`).

**Failure scenario:** A piece that's live *today* was published under the old `validateProductRules`, which never required `features / materials / care_instructions / shipping_details / dimensions(W·D·H) / weight`, nor **alt on every image + media entry** (ledger 23 confirms alt is a *new* hard gate). Em edits that piece's headline (stages a draft) and taps Publish → **edit-publish now runs the full new gate on the merged row** → `400 "Every image needs alt text"` / `"Missing required fields: care_instructions"`. Same on the new Available off→on round-trip (republish → the full gate). A working, live piece can no longer be re-published or put-back-up-for-sale until fields it never had are backfilled — and the WS2 seam doesn't specify how the `commitAvail ON` chain surfaces that 400, so it risks reading as "I toggled it back on and it just didn't come back up." That's the thesis's "put it back up for sale" journey silently blocked for real inventory.

**Why it's not covered:** TESTING items 4/6 only exercise **freshly seeded, fully-formed** pieces — the legacy under-filled path is never tested, and no phase decides grandfather-vs-backfill-vs-accept. This is *flag-don't-assert*: I can't see the live catalog's field-completeness or `handlePublish`'s exact branch dispatch, so I can't assert "broken" — but the interaction is structural and real.

**Fix (pick one, then test it):** (a) grandfather — only apply the strict set to never-before-published rows; (b) a pre-go-live catalog audit/backfill (esp. missing `alt`) sequenced like the §6.5 legacy-quantity backfill already is; or (c) accept it, add a maker-facing "these fields are needed to republish" surface + a TESTING case that publishes a deliberately alt-less legacy-shaped seed. At minimum, acknowledge the decision.

### 2. [LOAD-BEARING · verify-first] Portal boot assumes the exact `/api/config` JSON field names, which are never anchored
**Where:** WS1 Phase 1.3b — `P.loadConfig`/`P.boot` read `cfg.supabaseUrl`, `cfg.supabasePublishableKey`; Phase 1.4b reads `(P.config||cfg).publishableKey`.

**Failure scenario:** These names are asserted from "preserved admin.js:90-221," but no CURRENT block anchors `api/config.ts`'s response shape. If the live endpoint returns e.g. `supabase_url` / `supabaseAnonKey` / a nested object, `loadConfig` throws `"Supabase config missing from /api/config response"` and **every** portal page fails to boot — WS1 verification (TESTING 1–3) hard-stops on day one. Easy to catch, easy to fix, but it's an unanchored dependency the whole portal rides on.

**Fix:** Confirm the four field names (`supabaseUrl`, `supabasePublishableKey`, `publishableKey`, `isTest`) against `api/config.ts` before shipping the boot code as written (or port the exact reads from admin.js rather than retyping).

### 3. [LOAD-BEARING · handoff gap] `CRON_SECRET` is a new **production** dependency gating two headline features, but setting it in prod isn't sequenced
**Where:** WS7 Phase 7.3b/7.3c (`isCronRequest` → `CRON_SECRET`), gating **both** scheduled-publish (WS2 §2.6) and reconciliation (§7.3).

**Failure scenario:** `isCronRequest` returns `false` when `CRON_SECRET` is unset. The build explicitly walls off go-live ("ROADMAP section A, separate runbook") yet introduces this dependency. TESTING sets it on the *preview*; the prod go-live checklist in EVERLASTINGS_STORE.md doesn't list it. If nobody sets `CRON_SECRET` in production, a maker schedules a piece for Friday and it **silently never publishes** — no error, no log, no activity entry (the A2-4 backstop only fires on a *publish-ready-but-skipped* row, not on "the cron never ran"). Exactly the "hides without explaining" failure, in prod. Partially mitigated by the WS7 doc-impact note (env reference), but a passive doc line is weaker than an active go-live step.

**Fix:** Add an explicit go-live handoff: "set `CRON_SECRET` in the Production scope or scheduled-publish + reconciliation are inert." Consider it a required output of this build even though the runbook is separate — the build created the dependency.

### 4. [POLISH · verify] New storefront sale CSS references tokens/assumptions not evidenced in the storefront system
**Where:** WS4 §4.3.d (`.sale-pop`, `.sale-bar`).

**Failure scenario:** `.sale-pop { top: calc(var(--header-height) + var(--space-md)) }` — `--header-height` appears in **no** CURRENT block anywhere (every *other* WS4 token — `--space-*`, `--text-*`, `--accent-primary`, `--bg-primary`, `--color-gold/ink` — does appear in existing markup, so it's real). If `--header-height` is undefined the whole `top` declaration is invalid → the popup falls to `top:auto` and mis-positions. Same unverified basis for `--z-modal`/`--z-cookie`/`--shadow-lg`/`--radius-lg`/`--text-inverse`/`--transition-base`, and for the `.sale-bar` `insertBefore` comment's assertion that `.site-header` is `position:sticky` (if it's `fixed`, the in-flow bar renders wrong). The doc presents these as "verified," which overstates. DESIGN §D.2's render-tune framing means Sean catches it on the preview — but it's presented as concrete.

**Fix:** Confirm `--header-height` + the z/shadow/radius tokens + the header's position value exist as claimed; otherwise the popup/bar chrome renders off.

### 5. [POLISH · parity] Ending the store-wide sale by GPT relies on `listCoupons` to identify the auto_apply coupon
**Where:** WS10 §10.2 ("end via deactivateCoupon {code}") + WS4 §4.6.

**Failure scenario:** The portal ends the sale cleanly (GET `active_sale` returns the exact code → deactivate it). The GPT has **no** `active_sale` Action and Phase 4.1's note says `handleCouponList` is unchanged — so it's not confirmed to surface an `auto_apply` marker. To "end the sale," the GPT must infer *which* owner coupon is the store-wide auto-apply % from the list. With supersede (one active) + scope in the list it's usually findable, but if a product-scoped % owner coupon co-exists it's ambiguous. A soft parity roughness against the "either surface, equally" rule.

**Fix:** Surface `auto_apply` (and/or store-wide scope) in `listCoupons` output, or add an `active_sale`-read op, or spell out the identification heuristic in the COUPONS beat.

### 6. [POLISH] `.mitem--errored` error visual is referenced but no CSS is authored
**Where:** WS5 §5.4c.i partial-failure recovery — renders a failed re-role item as `.mitem--errored` ("a small red ring"). Unlike §9.2a (which explicitly writes `.badge-unique` CSS), no rule is written for `.mitem--errored`, so the item gets no visual feedback (the toast still fires). Add the rule or drop the class reference.

### 7. [POLISH] A **scheduled** publish logs `actor='gpt'`, not `'cron'`
**Where:** WS2 §2.6 self-call uses `Authorization: Bearer PRODUCT_API_KEY`; WS8 `resolveActor` maps `PRODUCT_API_KEY → 'gpt'`. So the `product.publish` activity row (8.1c e/f) for a cron-driven scheduled publish is attributed to the GPT. The A2-4 *skip* path correctly uses `'cron'`; the *success* path doesn't. Minor audit-trail misattribution (single-admin). Consider stamping `'cron'`/`'scheduled'` when the caller is the feed self-call.

### 8. [POLISH] Null-quantity/null-available legacy edge: sold-derivation operator differs across sites
**Where:** §6.5a shop / §6.3d homepage use `... : !p.available`; §4.5.d PDP sticky / §6.5b buy-gate use `... : (p.available === false)`. For a row where **both** `quantity` and `available` are null, shop/homepage read Sold while the PDP reads buyable-display. Within ledger-33b's fail-safe envelope (server checkout gate still 410s), but harmonizing the fallback operator across the four sites removes the display inconsistency.

### 9. [POLISH · test-setup] Reconciliation email (TESTING item 27) needs `ORDER_NOTIFY_EMAIL` or `RECONCILE_ALERT_EMAIL` set on the preview
**Where:** WS7 §7.3 `alertTo = RECONCILE_ALERT_EMAIL || ORDER_NOTIFY_EMAIL || ''`. If neither is in the preview scope, `reconcileOrders` logs "no alert address configured" and item 27's email assertion silently can't pass. The preflight lists `CRON_SECRET`/`SUPABASE_SECRET_KEY` but not this. Add it to the item-27 preconditions.

### 10. [POLISH] Store-wide sale "known code" source is unspecified
**Where:** WS4 §4.6 seam sends `code:'<known code>'` and calls it "required," but `active_sale` / struck / popup all read the code **back** from Stripe — so a Stripe-generated code works everywhere and no human-known code is actually required. State that the code may be auto-generated (and confirm whether sales-app collects one), so the builder doesn't invent a code-input requirement the surface doesn't have.

**Also, tiny:** the WS3 header-level `NEEDS-VERIFY` about "expose an authHeader() equivalent" is already answered by WS1 §1.3b (`P.authHeader`) — a stale flag that could send a builder re-investigating. Update the cross-reference.

## If you fix one thing
**Resolve the legacy-catalog × stricter-publish-gate interaction (#1).** It's the only finding a fresh builder won't catch on their own — it needs someone reasoning about the *existing* live catalog against the new `validatePublishRules`, and it can turn an ordinary "edit a live piece" or "put it back up for sale" into a hard 400 with no maker-facing explanation of why a working piece won't republish. Decide grandfather / backfill / accept-with-guidance and add the missing legacy-shaped TESTING case. Everything else is verify-first or polish.

## Verdict
**NEEDS ANOTHER PASS (NARROW)** — one unmade decision (WS2 Phase 2.7's gate against the existing catalog) plus two verify-first checks (`/api/config` shape, `CRON_SECRET` prod handoff); the rest is polish and the build is otherwise substantially executable.