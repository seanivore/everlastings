# v3.5.0 — Gap Review, Angle A (cold / no-repo)

**Reviewer stance.** Senior engineer with ONLY the three docs (`v3_5_0_IMPLEMENT.md` + `ADDENDUM_DESIGN` + `ADDENDUM_TESTING`), no repo — I physically stand in for the builder who has only the docs. I flag every place the DOC ITSELF is incomplete, ambiguous, self-contradictory, or hides a real decision behind an unresolved NEEDS-VERIFY. Byte-anchored CURRENT blocks whose files I can't see are Angle B's job — not flagged here. Ledger entries 1-30 + the false-alarm classes are respected (where I touch a settled item it's doc-hygiene: "the ledger already resolved this, strike the stale flag," never a re-litigation). Effort: maximum, read in full.

**One-line verdict: NEEDS ANOTHER PASS.** The build is fundamentally sound and mostly exclusively-executable, but WS8's two cross-surface data paths ship the marquee features silently dark, a settled feature (`?code=` share link) is never authored, and a cluster of genuine unmade decisions / cross-file-scope assumptions span WS4/WS5/WS9/WS10 — more than a bounded cleanup.

---

## Ranked gap list (most likely to derail first)

### 1. HIGH — WS8: the unseen-order blink has no data source on the surfaces that display it
**Where:** WS8 "Integration seam" (Orders-nav blink) + WS1 Phase 1.4e / 1.5 + Testing item 29.
**What's wrong:** `unseen_count` is fetched only by the **Orders** surface (`GET /api/orders`). But the Orders-nav blink is a *cross-surface* nav element. The **Products** surface (the default landing) "self-manages its static rail + env chip" (Phase 1.5) — its rail is static markup with no unseen wiring. **Sales** (`sales-app.js:222`) and **Account** (Phase 1.4e) call `mountShell(..., { ordersBadge: 2 })` with the hardcoded mock `2`. So on the page the maker lands on, and on two of the four surfaces, the new-order blink/number is either static-mock or unwired. The whole point of seen/unseen is that a new order nudges the maker — and it wouldn't, on the landing page.
**Fix:** specify that every surface's boot fetches `unseen_count` (a cheap count read) and feeds the rail/tabbar blink+badge — including the Products surface's self-managed rail. Name the call and where each surface applies it.

### 2. HIGH (flag) — WS8 §8.1d: the activity-log READ goes through products.ts's ambient client against a service-role-only table
**Where:** Phase 8.1a (RLS: "service-role writes/reads bypass RLS; anon/authenticated get nothing") vs Phase 8.1d `handleActivityLog` (`await supabase.from('activity_log')...`).
**What's wrong:** the write-helper (8.1b) deliberately spins up its **own** service-role client "because service-role bypasses RLS on the admin-only activity_log table." The READ in 8.1d reuses products.ts's module-level `supabase` of **unstated** privilege. The doc's own rationale for a separate write client implies the ambient client is NOT service-role — in which case the read returns **zero rows under RLS** and the Account activity card renders empty forever, even though rows exist. (Flag, not assert — I can't see products.ts's client key; but the doc's internal logic points at a silent-empty bug.)
**Fix:** state explicitly that `handleActivityLog` must read through a service-role client (reuse the helper's client or an equivalent), or confirm products.ts's ambient client is service-role. This is the difference between a working card and a permanently empty one.

### 3. HIGH — WS4: the `?code=` share link is generated but never honored (contradicts ledger 30)
**Where:** WS4 Phase 4.6 (sales "Copy share link" builds `.../?code=<code>`; the trailing NEEDS-VERIFY: "no storefront code currently reads a `?code=` query param … flag for scope") vs **ledger 30** ("`?code=` share link: WS4 adds a small `checkout.js` prefill+apply … so the link is honored").
**What's wrong:** the ledger declares the share-link honoring **settled and part of WS4**, but no IMPLEMENT phase authors the storefront `?code=` read/prefill/apply. §4.6 leaves it an open scope question. A builder following the IMPLEMENT builds the link generator and nothing that consumes it → every shared sale link is inert (loads the site, applies no code).
**Fix:** author the phase ledger 30 promises — a small `main.js`/`checkout.js` read of `?code=` that prefills `#promo-code` and reuses the auto-apply path (Phase 4.4c) — and strike the "flag for scope" NEEDS-VERIFY.

### 4. HIGH — WS4 §4.4a: `getCartTotal()` (and the storefront globals) are used in `checkout.js` without establishing scope/load order
**Where:** Phase 4.4a NEW block: `total < getCartTotal()` and the struck-`was` render, inside `checkout.js`.
**What's wrong:** the doc establishes `formatPrice`/`getActiveSale`/`priceHTML` live in `main.js` and that `main.js` is on all 14 storefront pages — so those are global. It never establishes where **`getCartTotal()`** lives (it reads like a `cart.js` function) or that it is in `checkout.js`'s scope. If it isn't, the change-listener throws a ReferenceError and the checkout total render breaks; at best it silently never strikes.
**Fix:** confirm `getCartTotal` is a `main.js` global (or define the pre-sale subtotal from a source `checkout.js` provably has), and state the load-order assumption that `main.js`'s globals precede `checkout.js`/`shop.js`/`product.js`/`homepage.js`/`cart.js`.

### 5. MEDIUM — WS4 §4.0 / §4.4c: only the primary probe path is authored; the two fallbacks are prose-only
**Where:** Phase 4.0 (gating probe) + Phase 4.4c (`autoApplyStoreWideSale` = apply-at-init only).
**What's wrong:** the probe is a legitimate runtime unknown, and the doc names three outcomes — but 4.4c authors only "apply at init." The "flaky → apply on the first `change` tick" path (which needs a run-once guard so it doesn't re-apply every tick) and the "rejected → prefill + one-tap Apply" path are described, not written. If the probe lands off-primary, the builder authors non-trivial code from prose during execution.
**Fix:** author the two fallback branches (at least the once-guarded change-tick apply) so the probe result selects a branch instead of triggering new authoring.

### 6. MEDIUM — WS2 §2.6: the scheduled-publish fold rests on unverifiable PostgREST syntax, and its fallback silently drops an in-scope feature
**Where:** Phase 2.6 NEEDS-VERIFY on `.or('is_published.eq.false,draft.not.is.null')`; Phase 2.4 says Schedule is offered on "an unpublished draft, **or** a published row with staged edits."
**What's wrong:** the doc can't confirm the PostgREST negation form and offers a fallback (`.eq('is_published', false)`) — but that fallback **only** auto-publishes new drafts, dropping the staged-edit auto-publish that §2.4 says is in scope. So the feature scope is coupled to an unverified library detail, and the two phases quietly disagree about whether staged-edit scheduling ships.
**Fix:** decide whether staged-edit auto-publish is in v3.5; if yes, resolve the `.or` syntax against the installed PostgREST before build; if no, remove it from §2.4's "offer Schedule" set so the surface never arms a value the cron won't fire.

### 7. MEDIUM — WS5 §5.4d: poster→video association is an unmade decision (and the alternative breaks the markup boundary)
**Where:** Phase 5.4d NEEDS-VERIFY.
**What's wrong:** the prototype's `poster` checkbox is "currently cosmetic" and never written. The doc *recommends* one-poster-per-product but leaves the decision to Sean. The alternative (per-video poster picker) is "larger scope" = a markup change, which violates the "don't re-author `out/` markup" boundary (Design §A). Left open, `applyMedia` has no defined poster behavior.
**Fix:** decide the single-poster-per-product rule (apply one poster to every MP4 lacking its own) and specify exactly how `applyMedia` writes it, or accept the markup-boundary cost of a per-video picker.

### 8. MEDIUM — WS5 §5.4c: the re-role add/re-upload/remove DIFF (a load-bearing reconciliation) is prose + NEEDS-VERIFY, not authored
**Where:** Phase 5.4c + the WS5 findings list ("Three prototype data-op reconciliations are load-bearing").
**What's wrong:** the doc itself calls this one of the three load-bearing (non-UI) fixes, but the diff algorithm is described in prose and its exact semantics are left open — "the old-role entry is dropped/kept per the new checkbox set" (dropped **or** kept is undecided). Get it wrong and a promoted image matches both `/hero-/` (via the `imgs[0]` fallback) and `/gallery-/`, duplicating on the page — the exact failure the phase warns about.
**Fix:** specify the diff precisely (opened roles vs applied roles → which uploads fire, which entries are dropped) rather than leaving "dropped/kept" ambiguous.

### 9. MEDIUM — WS2 §2.7 flags a GPT-contract change that WS10 never folds in
**Where:** Phase 2.7 NEEDS-VERIFY ("relaxing CREATE to title+price is a GPT-contract change … the GPT schema/instructions should say 'create is lenient; publish is the gate'") vs WS10 (no such beat).
**What's wrong:** create-validation is relaxed so a partial draft persists, changing what feedback `createProduct` gives the GPT. §2.7 says the GPT instructions should reflect it; WS10's instruction deltas (10.2–10.4) never add it. The delta is identified and dropped.
**Fix:** either fold a "create is lenient; publish is the gate" line into the WS10 instruction edit set (and re-check the `wc -c` budget), or record the decision that the GPT contract stays as-is.

### 10. MEDIUM — WS8: decoupling blink from badge requires an unspecified `out/portal.js` change beyond WS1's enumerated diffs
**Where:** WS8 seam ("mountShell currently couples the blink and the badge number to one value; recommend splitting … Exact wiring is a client decision") + Testing 29.
**What's wrong:** ledger 30 decides the WHAT (blink = `unseen_count`, badge = unfulfilled count), but `mountShell` takes a single `ordersBadge` value. Splitting them means editing `portal.js`'s blink/badge coupling — a change not in WS1's "only these enumerated diffs" list (Design §A), and the exact signature change is unspecified.
**Fix:** specify the `mountShell` change (e.g. accept `{ ordersBadge, ordersAlert }`) and add it to WS1's enumerated portal.js diffs so it doesn't violate the verbatim-markup boundary silently.

### 11. MEDIUM — WS9: entirely prose, no anchors; the "one of a kind" trigger is undefined and the grid Sold state is unauthored
**Where:** WS9 Phases 9.1–9.3.
**What's wrong:** no CURRENT/NEW blocks. The "One of a kind" badge's data source is undefined (`quantity===1`? all miniatures, since only miniatures are in scope?), and the grid "Sold" state (9.3) has no authored markup even though it shares WS6's `shop.js`/`homepage.js` card-render region. The builder authors all of it from prose and must invent the badge trigger.
**Fix:** define the badge trigger explicitly and give the shop/homepage card-render additions the same byte-anchor treatment WS6 gets (they touch the same lines — coordinate the single-edit region).

### 12. MEDIUM-LOW — WS1 §1.1a / Design §A: both docs say "twelve" runtime files but enumerate eleven
**Where:** IMPLEMENT Phase 1.1a ("Copy those **twelve** into `admin/`") + Design §A ("The **twelve** files that ship").
**What's wrong:** both lists enumerate `portal.css`, `portal.js`, `data.js`, four shells, four surface apps = **11**. A builder told to copy twelve will hunt for a missing twelfth (an icon sprite? a font? a shared partial?) with no way to tell whether a file is unlisted or the count is a typo.
**Fix:** reconcile the count — either name the twelfth asset or correct "twelve" to "eleven" in both docs.

### 13. LOW — naming: `PORTAL_DATA.money()` vs `PORTAL.money`
**Where:** IMPLEMENT Invariants ("render with the portal's `PORTAL_DATA.money()`") + Testing cross-cutting ("`PORTAL_DATA.money()`") vs Design §A ("`portal.js` — … `PORTAL.money`").
**What's wrong:** two namespaces for the money renderer. A builder wiring price display picks one and may pick wrong.
**Fix:** state the single correct name.

### 14. LOW — WS4 §4.6 / seam: env-correct share link + chip depend on whether `/api/config` returns `siteUrl` (doc marks it uncertain)
**Where:** WS4 seam ("`GET /api/config` → `{isTest, siteUrl?, …}`"; share link uses `(D.config && D.config.siteUrl) || 'https://everlastingsbyemaline.com'`).
**What's wrong:** the `siteUrl?` question mark means the doc isn't sure `/api/config` returns it. If it doesn't, test share links point at prod. `PORTAL.siteUrl()` (hostname-derived, WS1) already solves this.
**Fix:** wire the share link + View-Site through `PORTAL.siteUrl()` rather than an uncertain config field.

### 15. LOW — WS4 §4.5i: which cart hook shows the struck "you'll pay" is self-flagged and undecided
**Where:** Phase 4.5i NEEDS-VERIFY.
**What's wrong:** the doc doesn't know whether `[data-cart-subtotal]` and `[data-cart-estimate]` both exist or which is the pay-figure. Bounded, soft.
**Fix:** confirm the hooks in `cart.html` and apply the struck render to the actual pay line.

### 16. LOW — WS6 §6.2d: `?series=` deep-link slugs vs live series names is an open content/naming decision
**Where:** Phase 6.2d NEEDS-VERIFY.
**What's wrong:** header/footer nav hardcodes `portals-to-peace|book-nooks|story-lofts|seasonal|limited-edition`; whether live series slugify to those is unconfirmed. Soft failure (shows all), but the nav lives in every page template, so realigning is broader than a WS6 phase.
**Fix:** confirm live series names slugify to the nav's values, or realign one side.

### 17. LOW (doc-hygiene / do NOT re-litigate the settled truths — strike the stale flags)
- **WS5 §5.4a + Testing 20** ask whether alt should be a hard server publish gate and claim `validateProductRules` doesn't check alt — but **ledger 23** + WS2 §2.7's `validatePublishRules` NEW block already enforce alt on every image and media entry. Strike the contradicting NEEDS-VERIFY so WS5 doesn't imply alt is client-only.
- **WS3 §3.3 + Testing 12** carry the `shipping_address` "only nested / has a name" contradiction as an open flag; **ledger 14** resolved it (top-level column exists, no name) and the fallback is safe either way. Strike the stale flag.
- **WS10** `auto_apply` param-name NEEDS-VERIFY is self-answered (WS4 §4.1.a and WS10 both use `auto_apply`).
- **Migrations:** Phase 2.3 and Phase 7.2i both authored prefix `20260701000001` (scheduled_publish + drop_cart_holds). Testing's static gate catches it — ensure the renumber actually happens so `supabase db push` orders deterministically.

### 18. NOTE (Angle B territory, flagged for coordination, not a doc-internal defect) — stacked CURRENT anchors are stale-by-construction
`api/products.ts:70-71` (WS4 active_sale + WS8 activity both insert after the coupon branch), `:745-746` (WS4 supersede sweep + WS8 sale.create log both land between create and return), and the PUT/publish returns (WS2 edits, WS8 wraps) are each quoted in their *pre-other-edit* state, so the byte-blocks cannot all match simultaneously. Ledger 25-27 tells the builder to re-anchor per prose — flagging so the builder trusts the ledger ordering over the literal anchors (Angle B verifies the drift).

---

## The single most important "if you fix one thing"

**Resolve WS8's two cross-surface data paths before build (findings #1 and #2).** The new-order blink has no source on the Products landing (self-managed static rail) or on Sales/Account (hardcoded `ordersBadge: 2`), and the activity card reads a service-role-only table through products.ts's ambient client. Both pass a happy-path demo *on the Orders/Account-with-rows surface* yet ship the two marquee WS8 features — the audit trail and the new-order nudge — silently dark everywhere else. They are the gaps most likely to reach "done" while being broken.

---

**Verdict: NEEDS ANOTHER PASS.**
