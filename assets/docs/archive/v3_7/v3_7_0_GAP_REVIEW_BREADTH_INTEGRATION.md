# v3.7.0 — Breadth Integration Review (systems-level fold-regression check)

**Scope**: fresh integration/systems breadth pass on the converged v3.7.0 triplet (`v3_7_0_IMPLEMENT.md` + both addenda), read end-to-end, cross-checked against the live repo tree and the settled ledger (`v3_7_0_REVIEW_PROMPTS.md` entries 1–72). Lens: hunt where the A-round-1 folds (ledger 57–72 — the v3.6.6/v3.6.7 folds) created a NEW cross-system seam or contradiction. Effort: maximum, no skimming.

---

## Findings

### 1. [LOAD-BEARING] `api/products.ts` — WS4's `handleActiveSale` and WS8's `handleActivityLog` both anchor their function-definition insert at the SAME location; the Shared-file edit coordination section never names this collision

**Where**: IMPLEMENT §"Shared-file edit coordination" (`api/products.ts — order: WS2 → WS4 → WS8`) · WS4 Phase 4.2.b · WS8 Phase 8.1d(b) · repo `api/products.ts:786` (`handleCouponList` starts) → `:839` (`handleCouponDeactivate` starts, confirmed against the live tree).

The coordination section enumerates five collision points in `api/products.ts` (GET dispatch, PUT handler, `handleCoupon`, `handlePublish`, validation, `publicView`+success returns) and gets every one of them right — I verified each anchor is textually intact after the prior workstream's edit lands. But it misses a sixth: **both WS4 Phase 4.2.b and WS8 Phase 8.1d(b) append their new handler function at the identical point — immediately after `handleCouponList`'s closing `}` and immediately before the `// ?_action=coupon_deactivate` comment.**

- WS4 4.2.b's CURRENT anchor (`api/products.ts:831–836`) is `handleCouponList`'s closing lines, and its NEW block appends `handleActiveSale` right after them.
- WS8 8.1d(b)'s CURRENT anchor (`api/products.ts:836-838`) is written against the **pristine** tree — `}\n}\n\n// ?_action=coupon_deactivate (POST)...` — and its NEW block appends `handleActivityLog` at that same spot.

Apply order is explicitly WS2 → WS4 → WS8, so WS4 lands first. After WS4's edit, the literal 4-line sequence WS8 is anchored on (`}` / `}` / blank / `// ?_action=coupon_deactivate...`) no longer exists contiguously — `handleActiveSale` (~30 lines) now sits between `handleCouponList`'s close and that comment. A builder following the byte-anchor discipline hits a genuine "doesn't match the working tree — STOP and reconcile" moment exactly where the doc claims to have already fully coordinated this file.

**Consequence bound**: low-risk once caught — `handleActiveSale` and `handleActivityLog` are independent, non-interacting functions (no shared state, no call-order dependency), so inserting one before or after the other compiles and runs identically either way. This is a coordination-completeness gap, not a functional/data risk.

**Fix**: add a sixth bullet to the coordination section naming this: *"the new handler-function bodies: WS4 lands `handleActiveSale` immediately after `handleCouponList`; WS8's 8.1d(b) CURRENT anchor must be re-quoted against the POST-WS4 tree — i.e., end with `handleActiveSale`'s closing `}` (not `handleCouponList`'s), so `handleActivityLog` lands after `handleActiveSale`, still before `handleCouponDeactivate`."* Re-anchor WS8 8.1d(b)'s CURRENT block accordingly.

---

### 2. [LOAD-BEARING] The v3.6.7 fold (§10.1c) is schema-only "so createProduct gathers [the 7 fields] up front" — but the instruction `.txt` still tells the GPT the opposite, and TESTING item 6b never actually tests the proactive-collection claim

**Where**: IMPLEMENT §2.7 (RESOLVED owner-decision block) · WS10 §10.1c · the base instruction file `assets/docs/archive/v3_3/v3_3_0_GPT_INSTRUCTIONS_TRIMMED.txt:4` (unedited by any WS10 phase) · TESTING item 6b(GPT half) · ledger 66/71/72.

I read the live base instruction file (byte-verified, 7787 bytes, matches the doc's stated base). Line 4 reads:

> `Conversationally ask for fields. Reqd: title, headline (5-7 word tagline), story_card (2-8 poetic para.), description, features, price (dollars), product_type=miniature. Optl. fields in PRODUCT-REFERENCE.`

I then confirmed against the live `v3_3_0_GPT_SCHEMA.txt` that `dimensions`, `weight`, `materials`, `care_instructions`, `shipping_details`, `quantity` currently carry **no** `description` at all (bare `{ type: string }` / `{ type: integer }`) — exactly the "before" state §10.1c describes. §10.1c's fix adds `"Required to publish."` to each, **schema-only, zero instruction-`.txt` cost** — explicitly chosen to protect the 7988/8000 budget.

The problem: **no WS10 phase (10.1, 10.1b, 10.1c, 10.2, 10.2b, 10.3, 10.4) ever touches instruction line 4.** It still says these fields are "Optl. fields in PRODUCT-REFERENCE" after the build. So the GPT is shipped two contradicting signals simultaneously: a highly-directive, always-loaded instruction line explicitly labeling `dimensions`/`weight`/`materials`/`care_instructions`/`shipping_details`/`quantity` optional, and a per-field JSON-schema description (read only if/when the model inspects that property) saying "Required to publish." Whether a Custom GPT resolves this in favor of the schema description or the instruction prose is not something I can verify without running it (flag, not assert).

What makes this LOAD-BEARING rather than a documentation nit: **TESTING item 6b's GPT sub-case never exercises the mechanism §10.1c actually added.** Re-reading it closely: it creates a product **deliberately missing** a detail field, then publishes it, and asserts the 400 is legible. That reactive path — `validatePublishRules` 400s with a plain-words reason, and the GPT's PUBLISHING beat (instruction line 34, pre-existing, untouched by §10.1c) relays it plainly — **already existed before §10.1c landed** (WS2 §2.7 + the original PUBLISHING beat). Item 6b would pass identically whether or not §10.1c's schema annotations exist. The actual promise of the v3.6.7 decision — *"both surfaces must gather the full publish set so a maker never hits a confusing publish-400"* (ledger 66) — is about the GPT **proactively asking** for these fields during a normal create conversation, and nothing in TESTING exercises or could catch a regression in that specific behavior. §10.1c could be silently reverted or ship as a no-op and the gate would still go green.

**Fix (either)**: (a) spend a small number of `.txt` bytes to soften line 4 — e.g. append "; the detail fields (materials/care/shipping/dimensions/weight/quantity) are asked for too — see the field schema" — which requires re-running the byte math past the current 12-byte headroom (may need a corresponding trim elsewhere, same pattern as 10.2b/10.3's self-funded edits); or (b) if staying schema-only is the deliberate final call, add a **behavioral** GPT-parity spot-check ("ask for a new piece with no fields specified up front; confirm the GPT's own questions include the seven detail fields, not just the eight already-required ones") to the TESTING addendum's GPT-parity section, so the gate can actually detect a regression in the mechanism it's relying on.

---

### 3. [POLISH] The pre-v3.3 stale-quantity "legacy caveat" names only 2 of the 4 sold-policy enforcers as affected — `computeState()` (the portal's own enforcer) has the identical exposure

**Where**: WS6 §6.5 "Legacy caveat" paragraph · TESTING preflight bullet ("Legacy sold-row backfill") · `out/products-app.js:16-22` `computeState()` · migration `20260616000001_v3_1_inventory_decrement.sql`.

I traced a pre-v3.3 stale-quantity sold row (`available:false`, `quantity` still ≥1, `is_published:true`, not archived, no draft) through all four enforcers:

- `computeState()`: checks `p.quantity === 0` for "sold" — **false** here (stale nonzero) — falls through to `"live"`. The portal would show this piece **green, in the Live tab**, in the maker's own dashboard.
- Storefront buy-gate (`p.quantity != null ? p.quantity <= 0 : !p.available`): quantity is non-null and >0 → **not sold** → renders buyable + (if a sale is active) struck. This is the case the doc's Legacy caveat explicitly names.
- Server checkout gate (`available===true && quantity>=1`): `available` is `false` → **rejects** (410/409) — fails safe, no purchase leak.
- `record_sale`: not invoked here (this row predates it) — irrelevant to the trace.

The doc's own "Legacy caveat" text only discusses the storefront-display symptom ("would then render it buyable + struck instead of 'Sold/plain'") and the fact it still 410s at checkout. It never mentions that the **exact same stale row also misclassifies in the portal's own `computeState()`** — a maker opening her dashboard would see a piece she can no longer sell listed as "Live," not "Sold," which is arguably a worse UX miss than the storefront symptom since it's the maker's own management surface being wrong.

The underlying fix is already complete and sufficient — running the `20260616000001` backfill (zeroing `quantity` on `available:false` rows) resolves `computeState()` too, since it makes `quantity === 0` true again. This is a **documentation-completeness** gap, not a functional one: the go-live checklist item should name the portal admin view alongside the storefront, so whoever runs the preflight understands the full blast radius of skipping it.

**Fix**: extend the "Legacy caveat" sentence and the TESTING preflight bullet to read "...renders buyable + struck on the storefront **and misclassifies as Live (not Sold) in the portal's own `computeState()`**..." — same fix, just naming both surfaces.

---

### 4. [POLISH] The "Related Havens" mini-cards on the product page never get struck pricing during an active store-wide sale — inconsistent with the DESIGN §D.1 "every storefront surface" claim

**Where**: `assets/js/product.js:555-568` (the related-products render, confirmed live in the repo — `<p class="card__price">${formatPrice(rp.price)}</p>`) · WS4 Phase 4.5 (struck-price wiring, a-through-i) · WS6 §6.5d (touches only the Sold-badge line in this same block) · DESIGN §D.1 ("via a shared `priceHTML(cents, sale)` helper on every storefront surface (shop grid, product sticky card, homepage carousel, cart line + estimate)").

I confirmed against the live file that the related-products card at `product.js:566` renders `formatPrice(rp.price)` (plain), and that neither WS4's Phase 4.5 (a–i, which explicitly enumerates `shop.js`, `product.js`'s sticky card, `homepage.js`, and `cart.js`) nor WS6's §6.5d (which edits only the Sold-badge conditional on this same related-card block) ever touch that price line. Net result: during a live store-wide sale, a shopper reading a PDP sees the sticky card's price struck (correctly, via §4.5.d) while the "Related Havens" cards at the foot of the **same page**, rendered at the **same moment**, show the original un-struck price — a visible on-page inconsistency for the one surface DESIGN §D.1's own enumerated list quietly omits.

This predates round-1 A (ledger 57–72 doesn't touch WS6 §6.5d or the related-card block), so it is not a fold-regression — flagging it here because it's a genuine cross-surface pricing-consistency gap directly inside my lens's "struck pricing everywhere a price renders" invariant, and because `window._activeSale` is already populated before this block renders (WS4 4.5.c awaits `getActiveSale()` earlier in the same `DOMContentLoaded` handler), so the fix is a one-line addition with no new async dependency.

**Fix**: in WS6 §6.5d (or a new WS4 sub-phase), change the related-card price line to `${(rp.quantity != null ? rp.quantity <= 0 : !rp.available) ? formatPrice(rp.price) : priceHTML(rp.price, window._activeSale)}`, matching the same sold-gate pattern used everywhere else.

---

### 5. [POLISH] `CRON_SECRET` unset-in-production is a pure documentation/checklist dependency with zero code-level backstop

**Where**: WS7 §7.3's `isCronRequest()` · TESTING preflight · ledger 59 (already closed — **not re-raised as unhandled**, per instruction).

Confirmed the mechanism: `isCronRequest()` reads `process.env.CRON_SECRET`; if unset, it returns `''.trim()` → falsy → the function returns `false` **unconditionally, silently, for every request** — no cold-start log, no warning, nothing observable short of "scheduled publish and reconciliation both quietly never fire in prod." Ledger 59 already folded this as a required go-live handoff (doc-only: `EVERLASTINGS_STORE.md` checklist + the ROADMAP-A runbook), and explicitly says not to re-raise it as unhandled — I'm not doing that.

What I'll add, scoped as pure hardening rather than a gap: a one-time `console.warn('CRON_SECRET not set — scheduled-publish and reconciliation are permanently inert')` on the first `GET` when the secret is empty (guarded the same way the existing `__postgrestOrWarned` cold-start-once pattern already works in this same file) would give Vercel's function logs a signal to alert on, on top of the doc reminder — cheap, and consistent with the codebase's own "hides without explaining" thesis. Optional; the doc-only handoff is an accepted, already-settled decision.

---

## Verified clean (traced per my lens, no new finding — logged so the trace is on record)

- **Sold-policy 4-enforcer agreement, qty-0 case**: `computeState()` → sold, storefront buy-gate → sold/unbuyable, server checkout gate → rejects, `record_sale` → the row that produced this state. All four agree; no contradiction.
- **Sold-policy 4-enforcer agreement, null-quantity legacy row** (`quantity:null, available:true`): `computeState()` → "live"; storefront buy-gate → not-sold (falls back to `available`) → renders as a normal buyable tile; server checkout gate → **rejects** (`quantity ?? 0 < 1` is `true` even though `available===true`, since `null ?? 0 = 0`). This is a genuine display-vs-buy gap (shopper can add to cart, only gets bounced at session-creation) — but it is **ledger 33b**, verified still accurate and explicitly closed ("§6.5's null-fallback preserves — never introduces — the legacy display-vs-checkout edges; all fail safe. Do not raise it as a leak."). Traced per the task's instruction; not re-raised as new.
- **Vercel budget invariant**: confirmed 11 files in `api/*.ts` today (matches "11/12"), `vercel.json` carries exactly 1 cron entry today. Read the full IMPLEMENT end-to-end — no phase across all 10 workstreams adds a new `api/*.ts` route file or a new cron entry; `api/_lib/activityLog.ts` (WS8) is confirmed a library import, not a route.
- **`api/product-feed.ts` merged service-role client**: `feedAdmin` is declared exactly once (WS2 §2.6); WS7 §7.3a's import CURRENT-block matches the POST-§2.6 tree exactly and its prose explicitly says "reused as-is — no new client." No collision. `isCronRequest`/`reconcileOrders` insert after the `FeedRow` type, `publishDueScheduled` inserts before it — different locations, no overlap with each other.
- **`shop.js`/`homepage.js` WS6→WS4→WS9 merged card blocks**: read both merged blocks (§6.5a shop.js, §6.3d homepage.js) in full — each computes `sold` exactly once and every downstream token (Sold badge, Featured badge, `badge-unique`, dim, struck price) reads that single value. WS4 §4.5.b/§4.5.f and WS9 §9.2 are correctly marked as pointers, not standalone edits, so there's no risk of a builder double-applying a stale standalone version. `product.js`'s two edits (§4.5.d struck price, §6.5b buy-gate) are confirmed at different lines inside the same `populateStickyCard` (not a line collision), and §6.5b's local re-derivation of `previewToken` is confirmed necessary — `populateStickyCard` is a top-level function, `previewToken` is scoped to the init handler (`product.js:19`).
- **GPT `.txt` byte-budget internal consistency**: base file verified byte-exact at 7787. Confirmed no WS10 phase beyond §10.2/§10.2b/§10.3/§10.4 touches the instruction `.txt` (§10.1/§10.1b/§10.1c are schema-only per their own text; §10.5 is a recount; §10.6 is STORE/PRODUCT-REFERENCE docs, not the `.txt`). No other fold puts the stated 7988/8000 at risk.
- **X-Actor / `resolveActor` self-call path**: confirmed `X-Actor: cron` is set only by the internal `product-feed.ts` self-call, header-name casing is fine (Fetch `Headers.get` is case-insensitive), and the GPT's Custom Action schema exposes no way for an external caller to set this header — the "a real GPT publish never sets it" claim holds structurally, not just by convention. The "single-admin, so a key-holder mislabeling its own action is negligible" caveat is explicit in the code comment itself.
- **Migration monotonicity**: confirmed current latest migration is `20260616000001`; the three new migrations (`20260701000001`, `20260701000002`, `20260702000001`) all sort after it and are mutually unique.

---

## If you fix one thing

Finding #2 (the GPT instruction/schema contradiction + the TESTING blind spot around it). It's the one place where the v3.6.7 owner-decision fold's *entire stated purpose* — "a maker never hits a confusing publish-400" — has no verification path that could catch its own failure. The products.ts append-collision (#1) will announce itself loudly the moment a builder hits it; this one could ship silently broken and the gate would still read green.

## Verdict

**NEEDS ANOTHER PASS (NARROW)** — two bounded, concrete items: (1) extend the Shared-file edit coordination section for `api/products.ts`'s handler-append point (WS4/WS8 collision), and (2) either fund a small instruction-line-4 edit or add a real behavioral GPT-parity check for §10.1c's proactive-collection claim. Everything else in the systems lens (Vercel budget, CRON_SECRET mechanism, X-Actor attribution, the merged card blocks, the service-role client merge, migration ordering) traced clean.
