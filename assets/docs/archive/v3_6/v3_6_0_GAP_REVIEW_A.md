No Write tool is available in this session (Supabase/Pencil/etc. are the loaded deferred tools; no filesystem writer). Per instruction, printing the full file contents inline.

---

# `v3_6_0_GAP_REVIEW_A.md`

**Angle A — cold / self-containment.** Fresh instance, no repo access, docs only. Reviewer's job: find every place the docs force a builder to DISCOVER (open a file not shown) or DECIDE (pick between options) rather than LOCATE-and-APPLY. Byte-anchored CURRENT/NEW blocks that require opening the target file to confirm the anchor are B's job — not counted here unless the anchor is itself ambiguous.

**Overall observation before the list.** The three docs are unusually complete. Round-4 verification with 5-6 context-isolated subagents left a very short ANGLE A list, and most of what remains is `<!-- NEEDS-VERIFY -->` items with documented fallbacks — i.e. the fallback IS the concrete default; the NEEDS-VERIFY is an option to upgrade, not a decision the builder is forced to make mid-stream. The gaps below are ranked by real derailment risk, not by count.

---

## Gap list — ranked by likelihood to derail

### 1. `WS5 Phase 5.4c` — the re-role diff algorithm is described narratively but never spelled out
**Location**: IMPLEMENT §WS5 Phase 5.4c + the Phase 5.5 seam row "re-role an existing image" + the `<!-- NEEDS-VERIFY: confirm the modal computes an add/re-upload/remove diff between opened roles and applied roles, rather than a naive images[] rewrite -->`.
**What's missing**: The doc describes the MECHANIC (a re-role → `POST /api/upload` JSON `{url:<existing CDN url>, slug, role:<new>}`, server re-crops + writes the new filename) and precisely identifies the FAILURE MODE ("a naive rewrite leaves a promoted image matching BOTH `/hero-/` (via `imgs[0]` fallback) and `/gallery-/`, duplicating it on the page"). It does not describe the ALGORITHM that computes the diff at Apply time — for each `mItems[i]`, compare `mItem.roles` (checkbox state now) to `mItem.openedRoles` (state at `openMedia`), fan out per role added/removed. Nor does it specify which roles trigger a re-upload (`hero`, `gallery-NN`, `seo_thumbnail`, `checkout_image` all rename R2 keys and are role-tied by filename; a naive UPDATE of `images[]` alone silently orphans/duplicates). Nor how gallery's `NN` is picked on promotion (the doc says "reuse `nextNumberedRole`" but `admin.js` is retired at 1.1b, so the helper must be ported into the modal). Nor whether an item with ZERO remaining roles is dropped or kept.
**Why it derails**: A fresh builder will most-obviously map `mItems` to `images[]` in one pass (the shape naively matches). That naive rewrite ships the exact bug the NEEDS-VERIFY predicts — a promoted-to-hero image renders twice on the PDP because it matches both filename prefixes. It's not a crash; it's a headline-UX bug on the Apply flow, invisible until a shopper sees it.
**Concrete fix**: Add a Phase 5.4c.i sub-block that spells out the diff:
- **Capture on open**: `openMedia` sets `mItem.openedRoles = new Set(mItem.roles)` before any UI mutation.
- **On Apply, per item**: `added = [...roles].filter(r => !openedRoles.has(r))`; `removed = [...openedRoles].filter(r => !roles.has(r))`.
- **For each `added` role that renames the R2 key** (`hero`, `gallery`, `seo_thumbnail`, `checkout_image`): `POST /api/upload` JSON `{url: mItem.url, slug, role: <resolvedRole>}`; `gallery` → resolve to `gallery-NN` via a ported `nextNumberedRole` that scans current `p.images` filenames; write the returned URL into `p.images` (or the top-level column for `seo_thumbnail`/`checkout_image`, guarded by 5.4e for `checkout_image` after publish).
- **For each `removed` role**: drop the matching entry from `p.images` (identify by filename prefix + the original `NN`) or null the top-level column.
- **Poster** (per 5.4d, one-per-product): after the loop, find the single `poster`-checked mItem and set `poster` on every `media[]` video that lacks one.
- **`alt` propagates** from `mItem.alt` on every write.

State explicitly what happens when an item has ZERO roles remaining (drop from `mItems` and never write it back; `images[]` doesn't need an entry for a role-less orphan).

---

### 2. `WS4 Phase 4.0` probe — the recorded three answers don't test the "second `applyPromotionCode` REPLACES vs STACKS" question that the auto-apply + shopper-swap contract depends on
**Location**: IMPLEMENT §WS4 Phase 4.0 (the three-question probe) + Phase 4.4c auto-apply wiring + the trailing `<!-- NEEDS-VERIFY: confirm applyPromotionCode with a second code REPLACES rather than stacks on this bundle -->` under 4.0's "No `removePromotionCode` on the bundle" fallback + testing item 15 assertion.
**What's missing**: Phase 4.0's probe explicitly records (1) init-time apply succeeds, (2) `change` sees the discounted total, (3) `removePromotionCode` exists. The doc's "delete the sale, use mine" contract (4.4c comment + 4.6 keyword-field row + testing item 15) assumes that a shopper's second `applyPromotionCode(personalCode)` REPLACES the sale code (Stripe swaps the promotion). The NEEDS-VERIFY flags this but the probe protocol doesn't include it as a fourth recorded answer. Discovery is punted to verification (testing item 15).
**Why it derails**: If the loaded bundle stacks-and-errors on a second apply, a shopper who types their newsletter code sees "code applied" (from the first apply's success) but their intended code isn't the one that fires — or worse, the apply throws and the auto-applied sale is stripped with nothing replacing it. Real revenue implication.
**Concrete fix**: Add answer (4) to the Phase 4.0 probe: "after `applyPromotionCode(SALE_CODE)` succeeds, call `applyPromotionCode(OTHER_TEST_CODE)`; inspect `session.total.discount.promotionCode` — REPLACE (new code wins), STACK-AND-ERROR (call rejects), or STACK-AND-BOTH (both apply — a Stripe contract violation, would surprise us)." If STACK-AND-ERROR, `wirePromo`'s Apply handler needs to `checkout.removePromotionCode()` first (assuming (3) said one exists) then `applyPromotionCode(newCode)`. Encode this branch into 4.4c so a fresh builder doesn't have to derive it under time pressure at verification.

---

### 3. `WS6 Phase 6.2d` — series-taxonomy reconcile has two paths with NO default declared
**Location**: IMPLEMENT §WS6 Phase 6.2d parenthetical labelled "Taxonomy reconcile-at-build (SETTLED)".
**What's missing**: The comment says the reconcile is SETTLED but presents both options open: "at build, name the live series so their `seriesSlug()` matches the nav (or realign the nav slugs to the live names)." Then the compound-name landmine: "Watch the compound-name case: 'Book Nooks & Story Lofts' → `book-nooks-story-lofts` would NOT match the nav's `book-nooks`." No default is picked. The label "SETTLED" is misleading — the DECISION-TO-RECONCILE is settled; the ACTUAL RECONCILIATION isn't.
**Why it derails**: Not a crash. The soft failure is "filter shows all, no crash; header/footer `?series=` deep-links don't pre-check their box." But the choice touches either live catalog names (owner-visible) OR site nav slugs (nav-visible + affects every page header/footer), and a fresh builder cannot pick between them without knowing Sean's preference.
**Concrete fix**: Pick a default (recommend: **realign the nav slugs to the live-catalog `seriesSlug()` values** — nav slugs are internal-facing and safer to edit than live product names). State the default. If the compound-name case surfaces at build (i.e. a live series' slug won't match the nav after realignment either), stop and surface as an owner decision — don't decide silently. Add a sentence naming the specific files to touch: which template(s) carry the nav / footer series deep-links.

---

### 4. `WS2 Phase 2.6` — PostgREST `.or('is_published.eq.false,draft.not.is.null')` NEEDS-VERIFY hides a silent-failure branch
**Location**: IMPLEMENT §WS2 Phase 2.6 `publishDueScheduled` + the inline `<!-- NEEDS-VERIFY: PostgREST negation form draft.not.is.null inside .or(...) -->`.
**What's missing**: The `.or(...)` filter uses `not.is.null` inside a comma-composed OR clause, which is a version-sensitive PostgREST syntax. The fallback ("scope the fold to unpublished only via `.eq('is_published', false)`") covers scheduling a new piece to publish but silently DROPS the staged-edit auto-publish path (schedule an edit on an already-live piece to auto-publish at a later time — a legitimate GPT parity capability once `editProduct` gets `scheduled_publish_at` per 10.1b.a).
**Why it derails**: If the syntax is wrong, the query returns no rows; the chip shows "Scheduled · <when>" (a stored `scheduled_publish_at`), the daily cron runs, `console.error` logs nothing (query didn't error, just returned empty), and staged-edit auto-publish silently no-ops FOREVER. This is the exact "hides without explaining" failure the thesis forbids.
**Concrete fix**: Pre-test the exact string in Supabase Studio's REST tester against the preview DB: `products?select=id&or=(is_published.eq.false,draft.not.is.null)`. If it works, keep. If not, fall back explicitly AND log a startup-time `console.warn` on the fold that "staged-edit auto-publish is disabled — PostgREST `.or()` `not.is.null` unsupported on this stack." A silent narrowing is the failure to avoid.

---

### 5. `WS4 Phase 4.5.i` — cart hook selectors (`[data-cart-subtotal]` vs `[data-cart-estimate]`) NEEDS-VERIFY has a UX-forking fallback
**Location**: IMPLEMENT §WS4 Phase 4.5.i inline `<!-- NEEDS-VERIFY: confirm [data-cart-subtotal] and [data-cart-estimate] both exist in cart.html -->`.
**What's missing**: The NEW block writes struck HTML to `[data-cart-estimate]` and keeps subtotal plain, BUT the comment offers "if there's only one total hook, apply the struck render there." The two UX outcomes differ meaningfully — single hook = struck replaces the whole line; two hooks = subtotal stays plain (as "line total") and estimate previews the sale.
**Why it derails**: Trivial to resolve at build (open cart.html), but a fresh builder who doesn't grep will apply the two-hook default and either leave the second hook plain (invisible; UX intact by accident) or write to a nonexistent selector (invisible; no error).
**Concrete fix**: Have the orchestrator confirm which hook(s) `cart.html` carries and rewrite the Phase 4.5.i CURRENT/NEW to the actual shape before build. Small edit; high certainty; removes a real "look at the file" step.

---

### 6. `WS2 Phase 2.6 A2-4 backstop` — `logActivity` importability into `product-feed.ts` is treated as uncertain
**Location**: IMPLEMENT §WS2 Phase 2.6 A2-4 backstop section + inline `<!-- NEEDS-VERIFY: whether logActivity ... is importable into product-feed.ts under the feedAdmin client -->`.
**What's missing**: The phase proposes surfacing scheduled-publish skip via a WS8 activity-log entry, then hedges on importability. Nothing structural blocks it — `api/_lib/activityLog.ts` (per WS8 8.1b) is a normal CommonJS module with its own service-role client, unrelated to `feedAdmin`. The fallback ("defer this notice to the lazy-flip enhancement rather than duplicate the insert here") drops the feature.
**Why it derails**: Doesn't — the primary Schedule-only-on-ready gate at Phase 2.4 (with `readiness()` reused from `out/products-app.js:47`) handles the common case. This backstop covers the edge (a required field cleared AFTER scheduling) which is legitimately rare. But dropping it costs the "hides without explaining" contract.
**Concrete fix**: Delete the NEEDS-VERIFY; state that `logActivity` imports cleanly (it does — service-role helpers are per-invocation, no shared client dependency), and specify the exact insert inside the fold's `if (!res.ok)` branch: `await logActivity({ actor: 'cron', action: 'product.schedule_skipped', summary: 'Scheduled publish skipped — <title> not publish-ready', entityId: row.id });`. This closes the loop without deferring.

---

### 7. `DESIGN §C.3` — per-field recommended character targets are described but not enumerated
**Location**: DESIGN ADDENDUM §C.3 + inline `<!-- NEEDS-VERIFY: confirm the per-field recommended/SEO char targets are actually set for ALL fields -->`.
**What's missing**: The mechanism (`.count`/`.count.is-over` + wired counter) is in `out/`. The RENDER-TUNE variable is the target NUMBER per field. The doc explicitly opts into concrete-default + render-tune posture ("Concrete default: the counter exists and turns `--waiting` when over. Render-tune: the target numbers per field.") — but a counter with no target can never turn "over." Concrete default = bare count, not a partial FEEDBACK §8.7 delivery.
**Why it derails**: Doesn't hard-block. But if the reviewer expected FEEDBACK §8.7 fulfilled at build time (per-field targets shown next to the count), the default deliverable falls short.
**Concrete fix**: Either (a) declare explicitly "FEEDBACK §8.7 targets are DEFERRED to render-tune; build ships bare counts" and update the addendum to say so plainly, OR (b) add a per-field target table (title ~60 desktop / ~40 mobile · headline ~50 · description ~155 · story_card 200–800 · seo_title ≤ 60 · seo_description ≤ 155 — actual numbers to be Sean-picked pre-build). Don't leave a NEEDS-VERIFY that hides which of the two is the plan.

---

### 8. `WS1 Phase 1.5` — the wrap pattern is stated but the products-app.js NEW block is not shown verbatim
**Location**: IMPLEMENT §WS1 Phase 1.5.
**What's missing**: The pattern is given generically. The other two surfaces have their entry-statement counts + line anchors called out (`sales-app.js` 3 statements at `:222-224`, `orders-app.js` 2 at `:234-235`). The Products case is described (env-chip IIFE `:788-793`, rail-collapse IIFE `:796-805`, `render()` at `:807`) but no CURRENT/NEW block shows the wrap. A fresh builder writes their own three-in-a-`.then()`. The IIFEs' return values are irrelevant; ordering is preserved by JS iteration; probably fine. But the products-app entry is where a small fumble (env-chip runs BEFORE the redirect completes for a signed-out visitor → paints Test/Live chrome briefly before bouncing) becomes a visible glitch.
**Why it derails**: Minor. High chance of correct execution from the generic pattern. Small chance of the "chrome-flash-before-redirect" nit.
**Concrete fix**: Add a concrete NEW block at 1.5 showing all three statements verbatim inside the products-app `.then(function (ok) { if (!ok) return; ... })`. Two extra dozen bytes, one less way to fumble.

---

### 9. Runtime env presence NEEDS-VERIFYs (`CRON_SECRET`, prod `PRODUCT_API_KEY`, `SUPABASE_SECRET_KEY` on `product-feed`)
**Location**: IMPLEMENT §WS2 Phase 2.6 + §WS7 Phase 7.3 + Testing Preflight.
**What's missing**: Not build decisions — ops steps. The Preflight already names `CRON_SECRET` as a required env; the other two are treated as "expected to be present, soft-fail if not."
**Why it derails**: A missing env silently makes a cron-gated job a no-op forever. The soft-fail posture is correct for the code but weak for detection — a missing `CRON_SECRET` means `isCronRequest` returns false and BOTH cron-gated jobs never fire (publish + reconcile). The failure is invisible until you notice reconcile emails never arrive or scheduled pieces don't go live.
**Concrete fix**: Add a Preflight sub-step: `curl -H "Authorization: Bearer $CRON_SECRET" https://<preview>/api/product-feed` and assert the Vercel function logs contain "Reconciliation OK: N paid session(s)…" within 60 s. Also curl without the header and confirm the log line does NOT appear. This turns three silent env-presence NEEDS-VERIFYs into one 30-second observable check.

---

### 10. `DESIGN §D.4` "One of a kind on featured too?" — surfaced correctly, no gap
**Location**: DESIGN ADDENDUM §D.4 "one design confirm".
**What's missing**: Nothing. The default is `!p.featured` gate (no stack). The upgrade path (drop the gate + add a `.card__media .badge ~ .badge { top: … }` stack rule) is described and explicitly deferred to Sean on the live preview. This is a proper concrete-default + render-tune surface; included here for completeness so the reviewer can confirm it's not being read as a gap.
**Concrete fix**: None.

---

## Single most important insight (if you fix one thing)

**Spell out the WS5 re-role diff algorithm (gap #1).** Every other gap in this list is either a NEEDS-VERIFY the orchestrator can pre-resolve in five minutes with the repo open (grep a selector, run a Studio REST-tester query, check an env, extend a probe) or a concrete-default + render-tune surface that's legitimately Sean-decides on the live preview. Gap #1 is the only place where the doc itself asks a fresh builder to invent behavior — "spell it out in the modal's Apply diff logic" without spelling it out — and the failure mode is the exact bug the NEEDS-VERIFY predicts (naive rewrite → duplicated tile). Everything else can be closed by a one-hour ops sweep against the preview + repo; #1 needs an authorial pass.

The meta-observation: this doc is CLOSE to READY. What remains are almost entirely NEEDS-VERIFYs that hide "which fallback wins" decisions. Pre-resolving them wholesale before the build starts turns "mid-stream discovery + decide" (a builder freezing on an inline `<!-- NEEDS-VERIFY -->`) into pure locate-and-apply. The doc is one authorial pass on Phase 5.4c + one orchestrator ops sweep away from being fully exclusively-executable.

---

## Verdict

**NEEDS ANOTHER PASS (NARROW).** Narrow to: (a) author the WS5 Phase 5.4c re-role diff algorithm; (b) extend the WS4 Phase 4.0 probe with the "second code REPLACES vs STACKS" fourth answer; (c) pick a default for the WS6 6.2d taxonomy reconcile (recommend: realign nav slugs to live series); (d) pre-resolve the remaining NEEDS-VERIFYs against the preview (PostgREST `.or()` syntax, cart-hook count, `logActivity` import, `CRON_SECRET` presence). Everything else is byte-anchored, `out/`-anchored, or a legitimate render-tune surface. The build is otherwise ready.