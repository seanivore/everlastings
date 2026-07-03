# v3.7.3 — Gap Review, Angle B (fidelity / repo byte-check)

**Reviewer:** fresh isolated Sonnet 5 peer, MAX effort, full repo access.
**Scope:** this is the v3.7.3 scoped re-run. `v3_7_3_IMPLEMENT.md` (3773 lines) + `v3_7_3_ADDENDUM_DESIGN.md` (162 lines) + `v3_7_3_ADDENDUM_TESTING.md` (121 lines), read end-to-end, byte-checked against the working tree (pre-build state) and against `assets/docs/archive/v3_5/design-handoff/out/`. Priority per the charge: byte-verify that ledger 85 (§8.1c(g) re-anchor), 86 (cart-hold copy reword), 87 (§2.7a client-side / everPublished), 88 (sale-popup + mobile-nav `--header-offset`), and 92 (FIELD_LABELS) landed coherently, then hunt any further NEW fidelity gap.

**Method.** All five named ledger items were opened at their exact anchors and diffed by eye against the tree. Beyond that, ~30 additional CURRENT blocks were spot-checked across the highest-risk regions: the three shared-file coordination points (`api/products.ts` GET dispatch + `handleCoupon`/`handleCouponList` tail, `api/product-feed.ts` full file, `assets/js/shop.js`+`homepage.js` merged card blocks), the WS7 money-path (`api/checkout.ts` 7.2a–f, `api/webhook.ts`), `assets/js/checkout.js`/`cart.js`/`main.js`, `assets/css/styles.css` tokens + `.site-header`, the `supabase/migrations/` directory (naming-collision check), and several `design-handoff/out/` anchors (`account-app.js`, `products.html`, `products-app.js`, `orders-app.js`, `orders.html`). This is not a full re-run of every anchor in the ~3800-line doc (the prior v3.7.1 B round already validated ~70 anchors clean and this round's stated deltas are scoped) — it is a deep, evidenced pass on the flagged ledger items plus the highest-collision-risk regions.

**Headline result: fidelity remains exceptionally high — every anchor checked outside the two findings below was byte-identical.** Ledger 85, most of 87, 88, and 92 are confirmed accurate and complete. Ledger 86 has a real, load-bearing mechanism error (not a byte-drift — the *instruction itself* is wrong against the tree's actual structure). One companion finding on 87 (a documentation-location gap, not a functional one) and two polish items round out the list.

---

## 1. Ranked gap list

### #1 — Ledger 86 / WS7 §7.2j: "rename the id to `availability`" collides with a PRE-EXISTING `<section id="availability">` — the fix as written does not remove the false 15-minute-hold claim (LOAD-BEARING)

**Location:** `v3_7_3_IMPLEMENT.md` WS7 §7.2j (~line 2846), crediting ledger 86. Target file `policies.html`.

**What's wrong.** §7.2j's instruction reads: *"`policies.html:167-172` — the `<section id="cart-hold">`: **rename the id to `availability`** (the FAQ already deep-links `/policies#availability`) and replace the [stale] paragraphs with [new copy]."* This assumes `policies.html` has exactly ONE relevant section (`id="cart-hold"`) to rename+reword.

The actual tree has **two adjacent sections**, both added in the same original commit (`b73a86b`, 2026-05-03 — part of the settled base, predating this build entirely):

```html
<section id="availability">
  <h2>Availability &amp; Cart</h2>
  <p>Every Everlastings piece is one-of-a-kind. When you add an item to your cart, it is not reserved — another collector may complete their purchase first.</p>
  <p>We verify availability for all items when you begin checkout. If a piece has found its home while you were browsing, we'll let you know and offer a small thank-you for your patience.</p>
  <p>We believe in honest, pressure-free shopping. No countdown timers, no artificial urgency — just beautiful things for those who find them.</p>
</section>

<section id="cart-hold" style="margin-top: var(--space-2xl);">
  <h2>The Cart Hold</h2>
  <p>When you click <em>Checkout</em> from your cart, we place a soft 15-minute hold on the pieces you've chosen. That hold means no one else can claim them while you're entering your shipping and payment details.</p>
  <p>If you step away for longer than 15 minutes, the hold quietly releases — the piece becomes available to other collectors again. You'll be invited to re-check availability when you come back.</p>
  <p>This is the gentlest version of "first come, first home" we could find.</p>
</section>
```

`id="availability"` is **already taken** by the section directly above `id="cart-hold"` — and it already carries copy that says almost exactly what §7.2j's own "Proposed copy" asks for ("we don't reserve items," "verify availability... at checkout," "whoever finishes first"). If a builder executes the literal instruction ("rename the id to `availability`"), the result is a **duplicate `id="availability"`** in the DOM (invalid HTML — the FAQ's `/policies#availability` anchor-link then has an ambiguous target) — and, critically, **the false "soft 15-minute hold... no one else can claim them... quietly releases" paragraphs are never actually removed**, because a rename doesn't delete content. They'd just sit under a colliding id, still visible on the page, directly contradicting the truthful section right above them. This defeats the entire purpose of ledger 86/§7.2j: the site would still be promising a hold it no longer has.

The other two pieces of §7.2j check out exactly as specified:
- `policies.html:30` meta description — confirmed present, contains "cart holds" as expected (`<meta name="description" content="How availability, cart holds, returns, and care work at Everlastings...">`), the drop-"cart holds" instruction applies cleanly.
- `faq.html:194` — confirmed byte-identical to the CURRENT quote, the reword instruction applies cleanly.

**Concrete fix.** Change the `policies.html` instruction from "rename `id="cart-hold"` → `availability`" to **"DELETE the entire `<section id="cart-hold">` block (lines 167-172)"** — the pre-existing `<section id="availability">` (lines 160-165) already carries the truthful no-reservation message the fold wants, so nothing needs to be added there; the stale section just needs to go. (If Sean wants any specific phrase from the old copy preserved — e.g. "first come, first home" — fold it into the existing `id="availability"` section's prose instead of keeping a second section.)

**Load-bearing vs polish.** Load-bearing. This isn't a line-number-hint drift (which the doc explicitly tolerates) — it's an instruction whose *mechanism* (rename) is incompatible with the tree's actual structure (id already taken), and following it literally ships a customer-facing self-contradiction (one section says "we don't hold your cart," the very next one — now confusingly re-labeled — still says "we hold it for 15 minutes") instead of resolving one.

---

### #2 — Ledger 87 / WS5 §5.4e: the "ever-published" rewrite lives in §5.5's table + the Findings bullet, not in §5.4e's own body text that ledger 87 credits (MODERATE)

**Location:** `v3_7_3_IMPLEMENT.md` WS5 §5.4e (~line 2062) vs. §5.5's integration-seam table (~line 2092) and the "Findings the reviewer should weigh" bullet (~line 2106).

**What's wrong.** Ledger 86's own text (REVIEW_PROMPTS.md line 154) states: *"the media modal's checkout_image (**§5.4e** → `published_at == null`, not is_published)... DESIGN §A carries the surgical edit."* The DESIGN addendum's §A surgical-edit list independently makes the same attribution: *"The media modal likewise locks the checkout role + excludes `checkout_image` from the terminal `PUT` on any `published_at != null` piece (**IMPLEMENT §5.4e**)."*

But §5.4e's own prose in IMPLEMENT.md was **not** rewritten — it still reads (verbatim, confirmed against the doc):

> *"A published-product `PUT` that changes `checkout_image` returns `400`... So on a **published** product the modal must (i) show the "checkout" checkbox as locked... and (ii) **not** include `checkout_image` in the Apply `PUT` unless it's unchanged."*

Nowhere in §5.4e's own body does the phrase "ever-published," "`published_at`," or "paused" appear — "on a published product" most naturally reads as `is_published === true`, which is exactly the semantics ledger 87/§2.7a moved *away* from (a paused-but-ever-published piece has `is_published === false`). The correct, updated rule **does** exist in the doc — just two sections away, in two other spots:
- §5.5's integration-seam table, one dense cell: *"add `checkout_image` **only if NEVER-published** (`p.published_at == null`, §2.7a — not merely `is_published:false`; Phase 5.4e)"*
- The WS5 "Findings" bullet: *"the modal locks the checkout role on any `p.published_at != null` piece (including a PAUSED one, not merely `is_published`)"*

A builder implementing strictly from §5.4e — the section literally titled "`checkout_image` is FROZEN after first publish" and the one two other places in the doc point to by name — would reasonably conclude the lock condition is `is_published`, and could ship a paused-piece media modal that shows "checkout" as unlocked, letting the maker edit it, then hit the (correctly ever-published-gated) server 400 with no client-side warning — the exact "hides without explaining" failure class the thesis forbids. The server-side fix (§2.7a, `api/products.ts:390`) is confirmed correct and unaffected by this; this is purely a client-side/doc-completeness gap.

**Concrete fix.** Add one clause to §5.4e's own body: *"...on any **EVER-published** piece (`p.published_at != null` — including a paused one, not merely a currently-`is_published` one, matching §2.7a) the modal must..."* — bringing §5.4e in line with what §5.5 and the Findings bullet already say, and with what ledger 87 already credits it as saying.

**Load-bearing vs polish.** Moderate — not severed from reality (the correct rule IS specified in the same workstream, twice), but the one place a builder is most likely to look (and the one place two OTHER docs point to) carries stale language. A careful, whole-workstream read avoids the bug; a section-by-section build does not.

---

### #3 — `api/products.ts:651` comment goes stale after the WS2 §2.7 rename (POLISH)

**Location:** `api/products.ts`, the comment block immediately above the first-publish call site WS2 §2.7 retargets.

**What's wrong.** §2.7's retarget is a single-line find/replace at three call sites (`:183`, `:631`, `:654`: `validateProductRules` → `validateCreateShape`/`validatePublishRules`). Confirmed via `grep` that `validateProductRules` has exactly those 3 call sites plus its own definition — no external imports, so the rename itself is safe and complete functionally. But the tree's actual comment directly above the `:654` call site reads (verified verbatim): *"Together with the edit-publish guard above, **validateProductRules** now runs on BOTH publish branches, so the invariant holds..."* — this comment references the function by its **old** name. The retarget instruction touches only the executable line, not this adjacent narrating comment, so post-fold the comment will name a function (`validateProductRules`) that no longer exists anywhere in the file.

**Concrete fix.** Add "and sync the adjacent comment's function name" to §2.7's retarget instruction, or just note it as a one-line touch-up while applying the phase.

**Load-bearing vs polish.** Pure polish — doesn't affect `tsc --noEmit`, doesn't affect runtime, purely a code-comment accuracy nit.

---

### #4 — Ledger 88's `--header-offset` is computed once at load + on resize, never on scroll — the `.mobile-nav` drawer can inherit a stale (too-large) offset if opened after scrolling (POLISH / needs-verification)

**Location:** `v3_7_3_IMPLEMENT.md` §4.3.c (`setHeaderOffset`, ~line 1430) + §4.3.e (`.mobile-nav` re-point, ~line 1512).

**What I can verify vs. what needs a runtime check.** Confirmed byte-accurate against the tree: `styles.css:311`'s `inset: var(--header-height) 0 0 0;` anchor, all CSS custom properties referenced (`--z-modal`, `--shadow-lg`, `--radius-lg`, `--accent-primary`, `--bg-primary`, `--color-ink`, `--color-gold`, every `--space-*`/`--text-*` token, `--font-display`), and `.site-header { position: sticky; top: 0; ... height: var(--header-height); }` at `styles.css:215`. The header markup (`<header class="site-header" data-site-header>`) is static and is genuinely the first element after `<body>` on every page checked (confirmed on `index.html`) — so `document.body.insertBefore(bar, document.body.firstChild)` in `mountSaleChrome` correctly lands the utility bar above it with no race condition (the header isn't fetched/injected asynchronously). The mechanism is sound for the **load-time** case.

**FLAG (needs-verification, not asserted broken):** `setHeaderOffset` is called at `mountSaleChrome` init and again on `window.addEventListener('resize', ...)` — but never on `scroll`. Since `.sale-bar` is normal-flow (it scrolls away with the page) while `.site-header` is `position: sticky; top: 0` (it pins to the viewport top once scrolled past), the header's real `getBoundingClientRect().bottom` **shrinks** once the page is scrolled past the bar's height — but `--header-offset` keeps whichever value was captured at the last load/resize event, which (for a page loaded at scroll position 0) is the larger, unscrolled value. The `.sale-pop` popup is a one-time-per-session element that mounts at `DOMContentLoaded` (scroll position is normally 0 then), so it's likely unaffected in the common case. But `.mobile-nav` is a user-triggered drawer that can open at **any** scroll position — if a shopper scrolls down first, then taps the hamburger, the drawer would inherit the stale (larger) offset and open with a visible gap under the (now-smaller, scrolled) header rather than flush against it. Not a functional break (nothing overlaps or is inaccessible) — a cosmetic imprecision. I can't observe actual runtime/visual behavior from static analysis; this needs a quick manual check on a mobile viewport (scroll down, then open the nav drawer) once WS4/WS1 are built.

**Concrete fix (if confirmed):** add a scroll listener (throttled/rAF-gated) alongside the existing resize listener in `setHeaderOffset`, or simplify by having `.mobile-nav`'s `top`/`inset` read `.site-header`'s live `getBoundingClientRect()` directly on drawer-open rather than relying on the cached CSS variable.

**Load-bearing vs polish.** Polish — cosmetic-only, no overlap/functional break, and may not even be visually noticeable depending on the drawer's own padding. Flagged per the charge's "flag-don't-assert" instruction since it's a genuine runtime question I can't resolve from source alone.

---

## 2. Confirmed accurate (the five charged ledger items + high-risk shared-file anchors)

For the rigor trail, the following were explicitly byte-verified this round and hold clean:

- **Ledger 85** — `api/products.ts:745-746` (`const promo = await stripe.promotionCodes.create(promoParams);` / the `return jsonResponse(...)` success line) is byte-identical to the tree; the `return jsonResponse(...)` line is confirmed **unique** in the file (single grep match), so §8.1c(g)'s "anchor on this line alone" re-anchor is valid and self-consistent with its own coordination note.
- **Ledger 87 (server half, §2.7a)** — `api/products.ts:385-390` (the `const previewToken = randomUUID();` block through `if (current.is_published) {`) is byte-identical to the tree; the ever-published freeze guard inserts cleanly above it. `FROZEN_AFTER_PUBLISH` (`:337-340`) confirmed byte-identical.
- **Ledger 87 (client half, design source)** — `design-handoff/out/products-app.js:339` (`const r = readiness(p), published = p.is_published, archived = !!p.archived_at;`) is byte-identical to the DESIGN addendum's cited anchor; the `everPublished` re-key applies cleanly.
- **Ledger 88** — `assets/css/styles.css:311` and `assets/js/main.js:269-270`/`:28-30` all byte-identical; every CSS token the new `.sale-pop`/`.sale-bar`/`.badge-unique` rules reference already exists; `.site-header` confirmed `position: sticky` and confirmed static (non-injected) markup.
- **Ledger 92** — `validateProductRules` (`api/products.ts:287-322`) byte-identical to the CURRENT quote; all three call sites (`:183`, `:631`, `:654`) confirmed and exclusively internal (no external imports to break). The `FIELD_LABELS` map is complete: every key that can land in the `missing[]` array (the `REQUIRED_STR` set, the `REQUIRED_LIST` set, and the manually-pushed `quantity`) has a label; `dimensions`/`price`/image-count messages bypass `label()` entirely (they're already human-readable strings), so no gap there.
- **High-collision shared-file anchors** — `api/products.ts:70-71` (GET dispatch coupon branch), `:836-838` (`handleCouponList` tail / `coupon_deactivate` comment), `:735` (`couponParams.metadata` line), the full `api/product-feed.ts` (7 lines + `GET` signature), `assets/js/shop.js:126-144` and `assets/js/homepage.js:41-67` (the WS6→WS4→WS9 merged card blocks — the doc's own highest-flagged collision risk), `api/checkout.ts` §7.2a–f (all five anchors, the money-sensitive cart-hold removal), `assets/js/checkout.js` §4.4.a/b/c, `assets/js/cart.js` §4.5.g/h/i, `design-handoff/out/account-app.js:122` (reduced-motion), `design-handoff/out/products.html:288` (`.sched-chip`), `design-handoff/out/products-app.js:592` and `:748-749` (role-derivation, alt-gate), `design-handoff/out/orders-app.js:10/36/69` and `orders.html:51-52` (delivered-pill removal) — **all confirmed byte-identical**, zero drift.
- **Migration filenames** — confirmed the latest existing migration is `20260616000001_v3_1_inventory_decrement.sql`; the three new migrations (`20260701000001`, `20260701000002`, `20260702000001`) sort after it and don't collide with each other or any existing file.

---

## 3. If you fix one thing

**Fix ledger 86's mechanism in `policies.html`** — change "rename `id="cart-hold"` to `availability`" to "delete the `<section id="cart-hold">` block." As written, the instruction produces a duplicate id AND leaves the false 15-minute-hold promise live on the page, which is the exact opposite of what the fold set out to do — and unlike most findings in this build (which tend to be line-number-hint drift the doc's own disclaimer covers), this is a wrong *mechanism*, not a wrong *line number*. Everything else checked this round — the four other charged ledger items, all the money-path WS7 anchors, both flagged shared-file collision points, and a wide spot-check across every workstream's design-source anchors — held byte-perfect, consistent with the prior round's finding of ~70/70 clean anchors.

---

## 4. Verdict

**NEEDS ANOTHER PASS (NARROW).**

Scope for the next pass: (1) re-verify the corrected `policies.html` instruction (delete, not rename) doesn't orphan anything else that anchors on `#cart-hold` specifically (confirmed this round: nothing else in the tree links to `#cart-hold`, only `#availability`, so a clean delete is safe); (2) confirm §5.4e's own body picked up the ever-published language so it no longer contradicts what ledger 87/§5.5/the Findings bullet already say elsewhere in the same workstream. The two polish items (the stale `:651` comment, the scroll-staleness question on `--header-offset`) are optional pickups, not gate blockers. Nothing else in this pass — across roughly 35 distinct byte-anchors spanning every workstream touched by this round's folds — needs another look.
