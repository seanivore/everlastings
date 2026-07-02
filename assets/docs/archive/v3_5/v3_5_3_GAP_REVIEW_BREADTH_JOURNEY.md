# v3.5.3 — Breadth-regression pass · OWNER + SHOPPER JOURNEY (round 3, post-fold backstop)

Cross-lane walk of the maker's and shopper's end-to-end journeys across the whole triplet, hunting specifically for regressions the round-2 A/B/C/D folds could have introduced (a merged block that breaks a journey, a guard that fires at the wrong time, a signal that stops updating). Flag-don't-assert; the orchestrator validates before folding. Nothing changed except this file.

**Verdict: NEEDS ANOTHER PASS (NARROW)** — the two load-bearing round-2 folds (the WS6→WS4→WS9 merged card block + the site-wide `?code=` capture) both hold end-to-end; no headline feature vanished. Two bounded items remain, both flag-level (one testing-doc precision, one gate-semantics confirm) — neither is asserted breakage.

---

## What I walked and found CLEAN (no regression)

**Shopper — sale → struck everywhere → shop grid.** `window._activeSale` is awaited before first render on all three surfaces (§4.5.a shop, §4.5.c product, §4.5.e homepage) and `getActiveSale()` memoizes a single fetch. The merged shop-card block (§6.5a) computes `sold` once and correctly drives all four consumers: Sold badge on `sold`, image dim, `text-muted`, struck price gated `${sold ? formatPrice : priceHTML}`, and the unique badge gated `!sold`. A live piece renders struck + "One of a kind"; a sold sibling renders plain + "Sold" + no unique badge. `priceHTML` renders plain when there's no percent sale, so the `!sold` branch is safe with or without a sale. **The struck price did not vanish and the sold-gate is correct on the shop grid — the round-2 collision is genuinely closed here.**

**Shopper — `?code=` share link end-to-end (the round-2 site-wide-capture fold).** Verified the full path: `main.js` §4.7.0 stashes `?code=` to `sessionStorage['everlastings.shareCode']` on ANY page (it loads on every storefront page), so the code survives homepage `/?code=` → add-to-cart → same-tab nav to `/checkout`. §4.7.a chooses share-code vs store-wide via a single `if/else` — **mutually exclusive, which also removes the apply-order race** between the two async paths. The `location.search` fallback covers a direct `/checkout?code=`.

**The one-shot `removeItem` timing is CORRECT (the specific concern raised).** In `applyShareLinkCode`, `const code = readShareCode()` captures the value into a local var *before* `sessionStorage.removeItem(...)` runs, so clearing the stash does not prevent the current apply — the local `code` is what's prefilled and applied. On a failed apply the field is left prefilled for a manual retry (wirePromo handles it), and the stash is gone so a later unrelated checkout can't silently re-apply — exactly the intended one-shot. No "clears before it's applied" regression.

**Maker — sold policy across the three enforcers.** `computeState()` (portal, sold = qty0 from a sale), the storefront buy-gate §6.5b (`published && quantity>0`, with the `!previewToken` guard so a draft under `?preview=` never reads Sold), and the webhook decrement stay consistent. Available-OFF→Draft (not Sold), qty0→Sold, sold persists until archive. The `?preview=` guard is now folded into code, not prose.

**Maker — take-down → re-list.** Available-off→Draft (Phase 2.2) then toggle-on re-runs `?_action=publish` with `stripe_product_id` already set (no duplicate Stripe product). Refund→relist is a preserved UI port (empty `relist_product_ids` ⇒ no status flip). No fold touched these lanes.

**Badge coexistence.** "One of a kind" is gated `!sold` on both surfaces and never renders alongside "Sold" (on the shop grid the two are mutually exclusive by the same `sold` boolean). The Featured + One-of-a-kind stack-position is already an open *design* confirm in DESIGN §D.4, not a gap.

---

## Findings (flag-don't-assert)

### J1 — Homepage carousel §6.3d renders NO "Sold" badge, yet testing item 30 asserts a homepage "Sold sibling" showing "Sold" (needs-verification / NARROW)

The merged homepage `tile` block (§6.3d, IMPLEMENT ~L2287-2293) emits only `badge-featured` + a `!sold`-gated `badge-unique` — there is **no `badge badge-sold` "Sold" span** and no image dim, unlike the shop-card block (§6.5a) which emits `${sold ? '<span class="badge badge-sold">Sold</span>' : ''}` + dim. But TESTING item 30 says: *"Confirm the same on the homepage featured carousel (§6.3d) … its Sold sibling shows plain price + 'Sold' + no unique badge."* The homepage block cannot produce a "Sold" indicator, so that clause is not reproducible.

Compounding it: `homepage.js:10` fetches `getProducts({ featured: true, available: true })`, so a sold piece (webhook sets `available=false` with `quantity=0` together) is **filtered out before render** — the "Sold sibling" state essentially never occurs on the homepage. The `sold` computation in §6.3d is therefore near-always `false` for fetched items (only a null-`quantity` projection or an available/quantity lag could flip it).

- **Why it matters (journey):** a reviewer running item 30 will chase a homepage state that never renders and may mis-call the absence a bug; and IF a lag-window sold-but-featured piece ever renders, the homepage is the one surface where it silently looks purchasable (no "Sold" scent) before the PDP buy-gate stops it — a soft "shows wrong without a reason" edge against the WS9 info-scent thesis.
- **Concrete fix (co-design, pick one):** either (a) add `${sold ? '<span class="badge badge-sold">Sold</span>' : ''}` + the dim to the §6.3d block so the homepage matches the shop grid and item 30 is satisfiable; or (b) narrow item 30's homepage clause to drop "'Sold'" and state that the featured fetch (`available:true`) excludes sold pieces, so on the homepage only the struck-vanishes-on-`!sold` and unique-gating are verified. (a) is the more consistent fix.
- **Fold-induced?** Yes — the round-2 merge authored both the §6.3d block and the item-30 test; they disagree on whether the carousel shows "Sold". Low severity (fails soft; sold pieces are filtered out).

### J2 — Schedule-on-readiness gate (§2.4): confirm it keys off field-completeness ONLY, not the full Publish-button gate (which includes the Preview requirement) — else it hides a schedulable draft (needs-verification)

§2.4's rationale says to offer "Schedule publish…" only when the piece passes the required-field gate, and to "reuse the surface's own `readiness()`/`refreshGate()` (**the same gate the Publish button reads**)." But the Publish button also requires a **Preview** for a never-published product (INTEGRATION §3.8; TESTING item 4: "Publish is disabled until previewed"). The cron flip (§2.6) runs `validatePublishRules` — **field** validation only; it does **not** require a preview. So a *field-complete but un-previewed* draft would publish fine at cron, yet if the Schedule affordance reuses the full Publish-button readiness it would be **hidden** until the maker previews.

- **Why it matters (journey):** the maker's create→schedule path — she fills a complete draft and wants to schedule it live for next week without being present at cron time. If Schedule is hidden because she hasn't previewed, that is the exact "a control hides without explaining" failure the thesis forbids, on the very control this round-2 fold added. Conversely, if `readiness()` is pure field-completeness, the gate is correct and this is a no-op.
- **What's already flagged vs. what's new:** the doc's own NEEDS-VERIFY at §2.4 (L623) only asks whether `readiness()/refreshGate()` is *reachable* to gate the affordance — it does **not** ask whether that gate bundles the preview requirement. That distinction is the unflagged risk here.
- **Concrete fix:** state explicitly that the Schedule gate keys off the required-**field** readiness set (the same set the cron's `validatePublishRules` enforces), NOT the preview-done state — so a field-complete draft can be scheduled without a manual preview; the preview requirement stays a Publish-button-only UX gate.

---

## Bottom line

The two load-bearing round-2 folds survive the cross-lane walk: the merged card block renders struck + unique + Sold correctly on the shop grid (headline feature did not vanish), and the `?code=` capture delivers the code homepage→checkout with a correct one-shot `removeItem` (captured locally before clearing) and no auto-apply race. Remaining items are bounded: **J1** a testing-doc-vs-§6.3d "Sold" mismatch on the homepage carousel (low severity, fails soft), and **J2** a Schedule-gate-semantics confirm (does it over-gate on the un-previewed-but-field-complete draft). Both are flags for the orchestrator to resolve, not asserted breakage — hence NARROW.
