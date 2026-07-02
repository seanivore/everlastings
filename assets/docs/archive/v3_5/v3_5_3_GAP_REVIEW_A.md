# v3.5.3 — Gap Review, Angle A (cold / out-of-repo) — round 3

**Mode:** cold self-containment + completeness. Only the three living docs (`v3_5_3_IMPLEMENT.md`, `v3_5_3_ADDENDUM_DESIGN.md`, `v3_5_3_ADDENDUM_TESTING.md`) + the shared ledger (entries 1–33b). No repo — the absence is the point. I judge only whether the DOCS themselves are exclusively-executable: could a fresh builder LOCATE and APPLY every edit with zero DISCOVER/DECIDE? A byte-anchored CURRENT block I can't see the file for is fine (that's B's lane). Findings are flag-don't-assert where they touch code I can't see.

Round-3 attention items verified self-complete unless flagged below: the WS6→WS4→WS9 merged card blocks (§6.5a/§6.3d) + pointers (§4.5.b/§4.5.f/§9.2); the `?code=` capture (§4.7.0 → `readShareCode`/`applyShareLinkCode`); DESIGN §D.4; the §2.4 readiness gate; the §6.5b `?preview=` guard; the named 4th enforcer (ledger 33b). Most are clean. The exceptions are below.

---

## Part 1 — Gap list, ranked by likelihood-to-derail

### 1. [MEDIUM] DESIGN §D.4's `.badge-unique` CSS rule has NO executable insertion into `styles.css` — the badge renders unstyled.

- **Where:** DESIGN §D.4 (spec) ↔ IMPLEMENT WS9 §9.2 / §6.5a / §6.3d (render markup).
- **What's missing:** The render markup `<span class="badge badge-unique">One of a kind</span>` is folded into the merged card blocks (§6.5a shop, §6.3d homepage) — that ships. The CSS *rule* (`.badge-unique { background: color-mix(...); color: var(--accent-primary); border: ... }`) is written only as **prose in DESIGN §D.4**. Unlike the other two §D storefront additions — §D.1 (`.price-sale`) and §D.2 (`.sale-bar`/`.sale-pop`), both wired into `styles.css` by the concrete edit **§4.3.d** — **no IMPLEMENT phase adds `.badge-unique` to `styles.css`.** §9.2 says only "Render markup is already folded in… Visual spec (class + copy + CSS…) is DESIGN §D.4" and "Doc impact: none"; §4.3.d's CSS block is explicitly scoped to the sale chrome (price-sale/sale-bar/sale-pop) and does not include it. `.badge-unique` is the **only** new storefront class in this build whose CSS rule is never inserted by an executable phase (`.featured-row` is added in §6.3a; `.badge-sold`/`.badge-featured` pre-exist).
- **Consequence:** The span inherits only the `.badge` base (position/shape/size) with **no hue** — a headline WS9 feature renders wrong/invisible, silently, with no error. TESTING item 30 asserts the badge's *presence* on `!sold` tiles but not its hue, so the run wouldn't catch it either. This is precisely the "renders wrong though the spec applies cleanly" class the lens targets, and the DESIGN §D preamble's own promise ("authored here… **wired in the IMPLEMENT**") is unfulfilled for D.4's CSS.
- **Not a re-raise of ledger 32b:** 32b settles that the badge *spec* is concrete and lives in §D.4 — true. It does NOT assert that a phase writes the rule into `styles.css`. The gap is the missing execution step, not the spec.
- **Concrete fix:** Add one executable insertion — a WS9 §9.2 (or §6.5a-adjacent) "append to `styles.css`" block carrying §D.4's `.badge-unique {…}` rule verbatim, mirroring §4.3.d's pattern.

### 2. [LOW–MEDIUM] `main.js` §4.3.b and §4.7.0 edit the SAME insertion point (`DOMContentLoaded` → after `initConfig();`) but aren't listed as a shared-edit region.

- **Where:** §4.3.b (mount sale chrome) and §4.7.0 (`?code=` site-wide capture), both anchoring the identical CURRENT (`main.js:269-270`):
  ```js
  document.addEventListener('DOMContentLoaded', () => {
    initConfig();
  ```
  Both insert their new line **immediately after `initConfig();`**.
- **What's wrong:** The "Shared-file edit coordination" section enumerates every overlap and, for `main.js`, calls the WS4/WS7 edits "distinct functions… including the new `?code=` capture in `main.js` §4.7 vs. the reader in `checkout.js`." That framing is accurate across files but MISSES that **within WS4**, §4.3.b and §4.7.0 are not distinct functions — they are the same top-level `DOMContentLoaded` handler, same anchor, same insertion point. Applied phase-by-phase against the pristine anchor, the first lands cleanly and the second's CURRENT (`initConfig();` with the pristine next line) no longer matches; the builder must re-anchor and choose placement.
- **Consequence:** Workable — both inserts are order-independent and a careful builder re-anchors — but it violates the "never decide" bar, and the coordination section (whose whole job is to catch this) is silent/inaccurate here.
- **Concrete fix:** Add a line to the coordination section: "`main.js` — §4.3.b + §4.7.0 both insert directly after `initConfig()` in the one `DOMContentLoaded` handler; order-independent, re-anchor the second."

### 3. [LOW–MEDIUM] §2.4's Schedule-control readiness gate assumes `readiness()`/`refreshGate()` is reusable outside the Publish button, with no fallback specified.

- **Where:** §2.4 ("Gate the Schedule control on publish-READINESS… reuse the surface's own `readiness()`/`refreshGate()`") + its `<!-- NEEDS-VERIFY -->`.
- **What's ambiguous:** The decision (gate Schedule on readiness) is made — good. But the NEEDS-VERIFY only asks whether `readiness()`/`refreshGate()` is *reachable* to gate the affordance; it names **no fallback** if the surface exposes those only as internal Publish-button wiring. A cold builder who finds them non-reusable must invent the gate. (Largely B-lane — I can't see the surface — but the doc leaves the branch open.)
- **Concrete fix:** State the fallback (e.g. "if `readiness()` isn't callable standalone, gate Schedule on the same required-field predicate the Publish button reads, inlined").

### 4. [LOW] §9.1 "full-tile tap target" carries no concrete edit.

- **Where:** WS9 §9.1 ("make the whole product tile a clear, generous tap target… widen the hit area + affordance… Byte-anchors coordinated with WS6").
- **What's ambiguous:** The merged §6.5a/§6.3d blocks add no hit-area change — the existing full-card `<a … style="display:block">` already wraps `card__media` + `card__body`, so the whole tile is already the tap target. §9.1 promises a "widen" with no CURRENT/NEW and no deliverable. A cold builder asks "what do I change for 9.1?" — answer appears to be "nothing beyond confirming the full-card link."
- **Concrete fix:** Reword §9.1 as a confirm-only step ("the delivered card is already a full-tile link — confirm, no edit"), or specify the actual affordance change if one is intended.

### 5. [LOW / question] §4.6 store-wide-`%` create sends `code:'<known code>'` but no phase says where that code comes from.

- **Where:** §4.6 "Start store-wide sale (`%`)" → `POST …coupon {type:'percent', value, auto_apply:true, code:'<known code>'}` + "The known promo code is required (auto-apply + share link need it)."
- **The question:** Is `<known code>` maker-entered, a fixed constant, or Stripe-auto-generated? Since `handleCoupon`'s `code` is optional (Stripe auto-generates when omitted) and `active_sale` returns `promo.code`, the storefront and share link never actually need a *pre-known* code — the created code is surfaced downstream. So "required" may be overstated, and the sales-surface source of the code string is unspecified. A cold builder wiring `#startStoreWide` must decide whether to add a code input or auto-generate.
- **Concrete fix:** One line — "the store-wide `%` sale may omit `code` (Stripe auto-generates; `active_sale` surfaces it); if the surface offers a code field, pass it, else auto-generate."

### 6. [LOW / acknowledged-deferred] §5.4c's re-role add/re-upload/remove **diff algorithm** is described but not spelled out.

- **Where:** §5.4c + its NEEDS-VERIFY ("confirm the modal computes an add/re-upload/remove diff… rather than a naive `images[]` rewrite").
- **Note:** The doc states *what* must happen (a role change re-uploads via the by-link path under the new filename) and *why* (a naive rewrite duplicates an image the storefront reads by prefix), but not the diff logic itself ("spell it out in the modal's Apply diff logic" defers it). WS5 is repeatedly flagged as "the single most intricate integration item" that "gets its own review pass," so this under-spec is acknowledged, not hidden. Listing only so it isn't lost before that pass.

### Verified clean (spot-checks that could have been gaps but hold up cold)

- **`priceHTML` / `getActiveSale` reachable from `shop.js`/`homepage.js`/`product.js`/`cart.js`:** both are module-level `main.js` functions; the doc establishes main.js loads first on every page and treats its functions as globals (it calls `getActiveSale` from `shop.js` in §4.5.a and explicitly names `getCart`/`getCartTotal` as "main.js globals"). Internally consistent — not a gap.
- **`?code=` end-to-end (§4.7.0 → `readShareCode` → `applyShareLinkCode`):** capture stashes to `sessionStorage`, reader consumes stash-then-`location.search`, one-shot clear, mutually exclusive with auto-apply. Self-complete.
- **products.ts GET-dispatch triple stack (active_sale before / coupon / activity after):** coordinated by ledger 25; each anchors the coupon line independently. `handleCoupon` return (§4.1.c sweep + §8.1g log) and `handlePublish` (§2.5 + §8.1c e/f) overlaps are coordinated by ledger 25. `feedAdmin` single-client (§2.6 declares, §7.3 reuses) by ledger 26. All hold.
- **§6.5b `?preview=` guard** folded into code via `!previewToken &&`; the doc asserts `previewToken` is in scope in `populateStickyCard` (B verifies). §4.5.d's sibling `const sold` (no preview guard) is a different block and renders plain safely — no collision, no gap.
- **Migration monotonicity** (000001 scheduled / 000002 drop_cart_holds / 20260702000001 activity_log) confirmed consistent between §2.3/§7.2i/§8.1a and TESTING item 17.

---

## Part 2 — The single most important "if you fix one thing"

**Wire DESIGN §D.4's `.badge-unique` CSS into `styles.css` with a concrete phase (Finding 1).** It's the one gap that ships a visibly-wrong render of a headline WS9 feature with **no error and no test to catch it** — the markup renders the span, but with no hue rule the "One of a kind" badge is unstyled, and TESTING item 30 only checks the badge's presence, not its color. Every other finding is either workable-with-re-anchor (2), B-lane-with-a-named-decision (3, 5), a wording clarification (4), or explicitly deferred to WS5's own pass (6). Fixing #1 closes the only silent-wrong-render in the set.

---

## Part 3 — Verdict

The v3.5.3 triplet is overwhelmingly exclusively-executable: the round-2 folds (merged WS6→WS4→WS9 card blocks, the site-wide `?code=` capture, the concrete §D.4 badge spec, the readiness gate, the named 4th enforcer) are self-complete and did not introduce a structural regression. The residue is a bounded set — one clean medium (the `.badge-unique` CSS is spec'd but never wired into `styles.css`), one coordination-completeness note (main.js §4.3.b/§4.7.0 same anchor), and three low/wording items — none requiring rework, all fixable in a tight scoped pass.

**NEEDS ANOTHER PASS (NARROW)**
