# v3.6.1 — Breadth pass (OWNER-JOURNEY lens)

**Not the formal gate.** Cross-lane backstop after the A-Type round-1 fold, walking every management capability the way Em (or the template "User") would perform it, in BOTH surfaces — portal AND Custom GPT — from her phone.

**Scope reminder.** Ledger entries 1–46 are settled; the two open owner decisions (D-v361-1 series taxonomy, D-v361-2 char targets) are NOT re-raised here. The eight round-1 folds (ledger 39–46) are stress-tested for whether they introduced new friction — convergence is non-monotonic.

**Overall read.** The triplet is close. The eight folds land cleanly: none INTRODUCED a broken journey. What surfaces below is a set of parity / observability nits the North Star ("full parity, nothing hides without explaining") makes visible when you walk the surfaces as Em would. Ranked by real derailment risk.

---

## Ranked digest

### 1. GPT parity gap for scheduled-publish — the param is in the schema, but no instruction beat teaches the GPT to drive it
**Where.** WS10 §10.1b.a adds `scheduled_publish_at` to the `editProduct` schema properties with a description; there is NO paired instruction-`.txt` beat (10.2 / 10.2b / 10.3 / 10.4 don't add one — 10.5's projected `wc -c` = 7988/8000 assumes it).
**The journey it breaks.** Em to the GPT: *"schedule this to go live tomorrow at 9."* The GPT sees the schema param + description "ISO 8601 timestamp" but has no instruction guidance for (a) natural-language date parsing, (b) confirming-back the parsed timestamp plainly, (c) the date-granular cron semantics ("late-day scheduled times fire at the next 09:00 UTC cron, not on the minute"). The portal has a real datepicker popover (`out/products-app.js` `openSchedule`); the GPT gets a param and hopes. That's the exact parity failure the North Star names: "either surface could be down; neither is second-class."
**Fix (self-funded, no `.txt` byte).** Since 10.5 has 12 bytes headroom and this beat needs ~150 B, either (a) fold it into 10.3's PUBLISHING beat by tightening `:34` further, or (b) add it to the schema `description` of `scheduled_publish_at` itself (schema has no total cap — same trick 10.1b.a already uses). Concrete copy for schema-side: *"…Ask her the target date; confirm the parsed date back plainly (`Schedule to publish Wed Jul 3? — cron fires at 09:00 UTC.`); date-granular via the daily cron."*
**Rank.** Highest derailment because it's a journey Em is likely to try immediately once she hears "you can schedule from chat now."

### 2. Media modal re-role Apply — no error-recovery story if a POST fails partway through the N sequential uploads
**Where.** IMPLEMENT §5.4c.i (fold #1) spells the diff algorithm cleanly but is silent on what happens when one of the per-role POSTs fails (network hiccup on a phone; a rate-limit; a 5xx from R2). If added=['hero','checkout'] and the hero POST succeeds but the checkout POST throws, `p.images` now carries a new hero URL, `p.checkout_image` is unchanged, and the local `mItem` state doesn't reflect either. The `applyMedia` write to the server (the trailing PUT) then persists a partial state.
**The journey it breaks.** Em edits media on a spotty connection, taps Apply, sees the spinner, then a generic error toast; on retry the modal reopens showing the SUCCESSFUL half of the diff already applied plus the FAILED half still pending — but her checkbox state was closed at Apply. The retry is now against a mutated baseline and computes the wrong diff.
**Fix.** Add one paragraph after §5.4c.i's bullets: *"Per-role POST failures — accumulate into a `failures[]` list; if `failures.length`, do NOT fire the trailing `PUT`. Surface a toast naming which items failed ('re-role of gallery-03 → hero didn't upload; try Apply again'), keep the modal open with the failed items visibly flagged (add `.mitem--errored` on the row), and preserve `openedRoles` on those items so a retry recomputes the diff against the original baseline. Successful re-roles that already wrote to R2 are kept — the retry only replays failures."*
**Rank.** Realistic on a phone; the current spec ships a subtle inconsistent-state bug.

### 3. Gallery-NN collision when multiple gallery roles are added in the same Apply
**Where.** IMPLEMENT §5.4c.i bullet 3: *"`gallery` resolves via a ported `nextNumberedRole` that scans the CURRENT `p.images` filenames."* If two items in a single Apply both add `gallery`, the resolver runs twice — but if both runs read the SAME `p.images` (no interim write), both get the same NN. Same file name → the second POST overwrites the first in R2, silently deleting the first re-role.
**The journey it breaks.** Em opens the modal, unchecks share on two images and checks gallery on both, taps Apply. One of the two silently disappears. She thinks she has 6 gallery images; the page shows 5.
**Fix.** One line under bullet 3: *"When multiple `gallery` roles are added in the same Apply, resolve `nextNumberedRole` **sequentially** — after each successful POST, splice the returned URL into `p.images` locally so the NEXT `nextNumberedRole` call sees it and picks NN+1. (Do NOT batch-resolve all gallery-adds before the first POST.)"*
**Rank.** Realistic; nobody unchecks gallery on multiple images every day, but when it happens the failure is silent + destructive.

### 4. A2-4 scheduled-publish skip log — the activity entry doesn't name the piece
**Where.** IMPLEMENT §2.6 A2-4 backstop (fold #6) authors the concrete insert:
`await logActivity({ actor: 'cron', action: 'product.schedule_skipped', summary: 'Scheduled publish skipped — piece not publish-ready', entityId: row.id });`
**The journey it breaks.** Em checks the Account activity card and sees *"Scheduled publish skipped — piece not publish-ready"* with a colored dot and a timestamp. Which piece? She'd have to cross-reference `entity_id` against her product list — but the card renders `summary` + relative time, not entity_id (per WS8 §8.1c/§8.3). "Nothing hides without explaining" is violated by omission: she knows something skipped, doesn't know what.
**Fix (needs-verification for whether the row's title is in scope of the cron `select`).** Add `.select('id, title')` to the §2.6 `feedAdmin.from('products').select(...)` (currently `.select('id')`), and interpolate in the summary: `` `Scheduled publish skipped — "${row.title}" isn't publish-ready yet` ``. Also flag the same treatment for the successful branch's console.error path so the Vercel log names the piece too.
**Rank.** Medium — the failure mode this backstop covers is edge (a required field cleared *after* scheduling), so frequency is low, but when it fires this is the ONLY surface she sees.

### 5. WS4 STACK-AND-ERROR race — no cover for a successful `removePromotionCode` followed by a failed `applyPromotionCode(newCode)`
**Where.** IMPLEMENT §4.0 fourth-answer branch (fold #2): *"on STACK-AND-ERROR it must `removePromotionCode()` first (assuming answer (3) says one exists), then `applyPromotionCode(newCode)`."* The doc doesn't handle the intermediate failure state: if remove succeeds and apply throws (bad code, network), the shopper is left with NEITHER the auto-sale NOR their personal code. Silent partial mutation of the checkout session.
**The journey it breaks.** Shopper on Em's link, sale auto-applied, they type their newsletter code, hit Apply, apply fails. Now they see full price (sale stripped) with no explanation. They'll close the tab or blame the newsletter code.
**Fix.** One line in the STACK-AND-ERROR branch pseudocode: *"On `applyPromotionCode(newCode)` failure, re-apply the sale code (`applyPromotionCode(SALE_CODE)`); if THAT throws too, surface a plain toast 'Couldn't apply that code — sale is still applied' and leave the session in whichever discount stuck last."* Belt-and-suspenders, no probe extension.
**Rank.** Medium — narrow trigger (shopper types a bad code + we're on the STACK-AND-ERROR branch) but the failure mode is revenue-visible.

### 6. Storefront read-visible surface for the PostgREST fallback narrow (needs-verification)
**Where.** IMPLEMENT §2.6 (fold #4): if the OR-syntax pre-test fails at build, the runtime narrows the query to `is_published.eq.false` only + emits a `console.warn`. The warn goes to Vercel logs; Em never reads them.
**The journey it MIGHT break.** If the pre-test is skipped in a hurry OR a future PostgREST version regresses the syntax after the build, staged-edit auto-publish silently no-ops FOREVER. The A2-4 backstop only logs per-row skips; there's no startup-level activity entry marking the WHOLE staged-edit branch disabled.
**Fix (low-cost).** When the fallback fires at startup, emit one `logActivity({ actor:'cron', action:'product.schedule_disabled_staged_edits', summary:'Scheduled auto-publish for staged edits is temporarily unavailable — new drafts still schedule normally.', entityId: null })` — so Em sees it in the Account card if she looks. Two-line change.
**Rank.** Low derailment because (a) the pre-test is orchestrator-owned pre-build and (b) PostgREST OR-syntax is stable in current supabase-js. Flagged for observability parity — not a runtime finding.

### 7. WS10 shared-code vs auto-apply — the mutually-exclusive winner is intentional but not surfaced to the shopper
**Where.** TESTING item 15b: shared `?code=` from a coupon share link "runs instead of the store-wide auto-apply (mutually exclusive — Stripe one-discount) and is one-shot."
**The journey it might break.** Em shares a newsletter 5% code while a 20% storewide sale is running. Recipient lands on homepage → their 5% code stashes → at checkout it wins over 20%. They pay MORE than a random walk-in.
**Not a review flag; a settled behavior worth naming.** This is Sean's call — arguably the shared code SHOULD win (it's a personal gesture) or arguably the LARGER discount should. The doc's default is "shared code wins." Just naming it so a fresh reviewer doesn't read the mutual exclusion as accidental.
**Fix.** None required — surfaced for owner confirmation. If Sean wants "larger of the two wins" that's a WS4 fold; if the current default holds, no change.
**Rank.** Not a derailer; parity note.

### 8. Products page first-paint on slow mobile — blank shell during `PORTAL.boot()` (needs-verification)
**Where.** WS1 §1.5 fold (#8): the whole entry tail (env-chip IIFE + rail IIFE + `render()`) is wrapped inside `.then()` of `PORTAL.boot({requireSession:true})`. For a signed-in Em on a spotty 4G, `/api/config` + Supabase session refresh gate the first paint.
**The journey it might break.** She hits `/admin/products` from her phone. Blank body until boot resolves (a few hundred ms on good network, longer on weak). No skeleton, no spinner, no chrome. She wonders if the app broke.
**Fix (small).** Have the HTML shell render a minimal skeleton (the design system already ships `.skel` in `portal.css`) that's REPLACED by `render()`. Or add a single centered `Loading…` in the shell, hidden by `render()`. Either matches the "honest optimistic state" bar the design addendum names.
**Rank.** Low frequency but real; the wrap fix (necessary to close the round-1 gap) tightened the invariant at the cost of first-paint. Flagged as needs-verification because I can't see the shell markup to confirm whether an existing skeleton already covers this.

---

## If you fix one thing

**Add the GPT instruction beat for `scheduled_publish_at` (finding #1).** Every other finding is either a small doc addition or a fold-ledger observability nit. This one is the ONLY genuine parity gap between the portal and the GPT that fold ledger 39-46 didn't close — and it's a capability Em is likely to try the first day, because "schedule this from chat" is a direct benefit of adding the param. Adding one sentence to the schema description (self-funded — schema has no total cap) closes it end-to-end. Without it, the GPT has the param but doesn't know when/how to offer it, and Em learns "the panel can schedule; the chat kind of can, if I say the right thing." That's the exact second-class-surface failure the North Star forbids.

The meta-observation: convergence held. The eight round-1 folds are self-consistent — none of them broke a journey that WAS working. What remains are edge-case observability + shopper-error-path nits that surface only under the owner-journey lens (Em on a phone, spotty network, edge inputs). None are load-bearing enough to block a build.

---

## Verdict

**NEEDS ANOTHER PASS (NARROW).** Narrow to: (a) one GPT instruction / schema-description beat for `scheduled_publish_at` (finding #1); (b) two error-path notes in WS5 §5.4c.i (finding #2's failure-recovery, finding #3's sequential-NN); (c) one activity-log summary tweak in §2.6 A2-4 (finding #4 — include product title); (d) one line in the WS4 STACK-AND-ERROR branch (finding #5). Everything else is either needs-verification against the running app (#6, #8) or a parity note for Sean's confirmation (#7). None of the eight round-1 folds introduced a NEW broken journey — the four ranked flags above are pre-existing surfaces the folds happened to spotlight.
