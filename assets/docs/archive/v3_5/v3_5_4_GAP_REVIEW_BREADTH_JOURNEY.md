# v3.5.4 — Round-4 breadth-regression pass (OWNER-JOURNEY)

Scope: did the round-3 fixes (previewToken re-derive · §9.2a badge CSS · `!sold && !p.featured` badge gate · main.js shared-anchor · §2.4 field-completeness Schedule gate · legacy backfill preflight) BREAK or COMPLETE the end-to-end journeys, or introduce a NEW regression. Flag-don't-assert. I changed nothing but this file.

## Verdict

**PASS — the three journeys are restored/completed and I found NO new regression from the round-3 fixes.** One PRE-EXISTING badge-overlap edge (Sold + Featured, not round-3-caused) is the only substantive flag; it is exactly the "no two badges overlap" criterion I was asked to walk, and TESTING item 30 overclaims relative to what the render code guarantees.

---

## 1. PDP journey — RESTORED ✓ (B-1 fix correct)

- Repo confirms the B-1 premise: `product.js:19` `const previewToken = params.get('preview')` is scoped INSIDE the `init` async fn, and `populateStickyCard` is a **top-level** fn (`product.js:365`). Referencing `previewToken` directly there WOULD throw. §6.5b's NEW block **re-derives it locally** (`new URLSearchParams(location.search).get('preview')`) — the fix is present and necessary.
- **Normal load (no `?preview=`):** `previewToken` = null → `sold = !null && (qty!=null ? qty<=0 : available===false)` computes cleanly, no ReferenceError; hero/gallery/price/buy render. §4.5.c inserts `await getActiveSale()` before `populateStickyCard` (`:21-23` anchor byte-matches repo), so §4.5.d's struck price resolves against a populated `window._activeSale`. **Walks clean.**
- **Owner `?preview=` load:** `previewToken` truthy → `!previewToken` = false → `sold` = false → the "Sold" render/buy-disable in §6.5b is **suppressed** (and the separate `if (previewToken)` block at `product.js:46` disables the buy controls with the preview label). **Suppression works.**
- Redeclare check: §4.5.d's `const sold` is nested inside `if (priceEl){…}`; §6.5b's `const sold`/`const previewToken` are at function-body scope — **different scopes, no SyntaxError** (doc line 1508 states this; confirmed by reading the two blocks). §4.5.d intentionally does NOT preview-guard its struck gate (ledger 34b) — a previewed draft correctly still shows struck. Consistent.

## 2. Schedule journey (J2) — RESTORED ✓

- §2.4 gates Schedule on **field-completeness**, explicitly NOT on a preview step ("gating on preview would wrongly hide Schedule from a field-complete-but-un-previewed draft (J2)").
- Verified the helper is cleanly reusable: `design-handoff/out/products-app.js:47 readiness(p)` keys **purely off required fields** (title/slug/headline/description/price/quantity/story/features/materials/care/shipping/dimensions/weight/hero+gallery) — **no preview step bundled** — so a complete-but-un-previewed draft returns `ok:true` and Schedule is offered. J2 intent honored, and the doc's `readiness()`/`refreshGate()` fallback isn't even needed.
- Minor (not a regression, appropriately flagged): the concrete surface edit that actually *gates the Schedule button render* on `readiness()` is written as PROSE + a `NEEDS-VERIFY`, not a CURRENT/NEW code block (the out/ surface renders the button ungated at `products-app.js:409`). Even the ungated worst-case still satisfies J2 (offered on complete drafts) and leans on the §2.6 cron backstop; so this is a pre-existing doc-completeness item, correctly flagged, not a J2 break.

## 3. Sale / badge journey — CORRECT for the cases walked ✓

- §6.5a shop block: **non-featured in-stock** → struck `priceHTML(p.price, _activeSale)` + `badge-unique` "One of a kind"; **featured in-stock** → `badge-featured` + struck, `!sold && !p.featured` suppresses unique; **sold** → `formatPrice` (plain) + `badge-sold` "Sold", no unique. Matches spec.
- §6.3d homepage (featured-only): `badge-featured` + struck; unique suppressed (`!p.featured`); **no Sold badge rendered at all** and carousel fetch is `available:true`, so "no unique, no sold" holds. Struck did not vanish (round-2 collision stays closed).
- §9.2a `.badge-unique` CSS: CURRENT anchor `styles.css:586-593` **byte-matches** the working tree; NEW rule inserts solid plum tokens (`--bg-primary` bg, `--accent-primary` border/text), distinct from Featured's gold, no `color-mix()`. Round-3 A-D4-CSS fold is complete (badge is no longer unstyled).
- `priceHTML` is defined by §4.3.a into `main.js` (repo has none today — verified), renders plain when no `%` sale, so the `!sold` branch is safe with or without a live sale.
- main.js shared anchor: §4.3.b and §4.7.0 both quote the identical `main.js:269-270` CURRENT (`DOMContentLoaded` → `initConfig()`, byte-matches repo) and both are independent appends — order-independent, compose cleanly. Coordination entry (ledger 36b / line 47) is accurate.

## FLAG — Sold + Featured badge overlap (PRE-EXISTING; NOT a round-3 regression) ⚠ needs-verify

The `!sold && !p.featured` gate prevents the *unique* badge from overlapping, but **nothing gates Sold vs Featured** — in §6.5a they are two independent ternaries (`${sold ? Sold}` and `${p.featured ? Featured}`). A piece that is **both sold and featured** renders BOTH badges, and `styles.css:593 .card__media .badge` pins **every** badge to the same top-left corner with no sibling offset → they **overlap**.

Reachability (verified against the repo, so flagging with evidence, not asserting a live occurrence):
- `record_sale` never clears `featured` — the sale only touches `quantity`/`available` (grep: `featured` appears in migrations only as the column default and in `api/products.ts:327`'s mutable-field list; no decrement path clears it).
- `shop.js:9` calls `getProducts()` **unfiltered** (sold pieces show with a Sold badge) and `:93` sorts featured-first — so a featured-then-sold piece DOES land on the grid.

Consequence: TESTING item 30's assertion — *"At most ONE of {Sold, Featured, One of a kind} per tile — confirm no two badges overlap"* — is **stronger than the render code guarantees**. It holds only if a piece is never simultaneously sold and featured.

Why it's in this report but out of strict regression scope: this predates v3.5 (the current shipped `shop.js` already renders Sold + Featured independently for a sold+featured piece), and round-3 touched neither gate — so it is **not** a fix-introduced regression. But it is the exact "no two badges overlap" journey criterion I was told to walk, so I surface it. **Needs-verify:** whether Emy ever leaves `featured=true` on a piece that reaches qty0 (if she always un-features on sale, the overlap never renders). Cheap durable fix if wanted: gate the Featured badge on `!sold` (mirrors the sold-plain intent), or add a sibling-offset stack rule.

## 4. New regressions introduced by the round-3 fixes

**None found.** The previewToken re-derive, §9.2a CSS, badge gate, main.js shared-anchor, and §2.4 gate each fold cleanly with correct scoping and byte-matching anchors; the legacy-backfill preflight is a go-live checklist item (TESTING line 16), not a code path.
