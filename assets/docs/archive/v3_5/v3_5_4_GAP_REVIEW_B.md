# v3.5.4 — Gap Review B (fidelity, repo) · Round 4

**Scope (deliberate narrow):** byte-check the round-3 fixes against the working tree — §6.5b `previewToken` re-derivation, §9.2a `.badge-unique` CSS phase, the `!sold && !p.featured` badge gate, and the `main.js` shared-`DOMContentLoaded` coordination. The round-2 folds were byte-verified in round-3; not re-checked here. Nothing changed except this file.

---

## Part (a) — North Star / thesis pass on the scoped fixes

The round-3 fixes are all defensive-correctness (a crash fix, an unstyled-badge fix, an overlap gate, a shared-anchor note) — none change what the maker can drive. They protect the storefront render (a ReferenceError on every PDP, an unstyled badge) without touching parity. No thesis regression introduced by any of the four.

## Part (b) — fidelity findings (CURRENT byte-match + NEW references exist)

All four scoped items verified CLEAN against the tree:

- **§6.5b — `product.js:382` (`populateStickyCard`).**
  - **(a) CURRENT anchor byte-matches.** `product.js:382` = `  if (p.available === false) {` — exact match to the doc's CURRENT block (2-space indent). ✓
  - **(b) re-derivation matches the init handler.** Init derives at `product.js:8`+`:19`: `const params = new URLSearchParams(window.location.search)` → `params.get('preview')`. §6.5b re-derives `new URLSearchParams(location.search).get('preview')` — **same param name `preview`**, and `location.search` ≡ `window.location.search` (`location` is the `window.location` global). Equivalent value. ✓
  - **(c) genuinely in scope, no collision.** `populateStickyCard` (`product.js:365–391`) declares no existing `previewToken` or `sold`. §6.5b's `const previewToken` + `const sold` land at function-body level (old line-382 slot). §4.5.d's `const sold` is block-scoped inside `if (priceEl) {` (`product.js:369` region), a child scope that closes before line 382, and it does NOT declare `previewToken`. Two `sold` in disjoint scopes = legal JS, no redeclare; the fix's `previewToken` is unique in the function. ✓ (Ledger 34b holds.)

- **§9.2a — `.badge-unique` CSS phase.**
  - **CURRENT block byte-matches `styles.css:586–593`** — the full `.badge-featured { … }` block + blank line + `/* Overlay placement on top of card media */` + `.card__media .badge {` reproduce exactly. ✓
  - **Both tokens exist as storefront tokens:** `--bg-primary` defined `styles.css:37` (`var(--color-cream)`), `--accent-primary` defined `styles.css:46` (`var(--color-plum)`). The NEW `.badge-unique` (solid tokens, no `color-mix()`) references only these + inherits `.card__media .badge` placement (`:593`). ✓ (Ledger 35b holds.)

- **Badge render gate `!sold && !p.featured` (§6.5a / §6.3d).** `p.featured` is a real boolean field: `getProducts` selects `featured` (`main.js:60`, `:74`) and filters `if (options.featured) query = query.eq('featured', true)` (`main.js:76`); homepage calls `getProducts({ featured: true, available: true })` (`homepage.js:10`). Gate is neither always-true nor undefined. ✓
  - *Observation (not a gap):* because the homepage carousel is fetched `featured:true`, every carousel tile has `p.featured === true`, so `!p.featured` is always false there → the "One of a kind" badge shows **only on the shop grid**, never on the homepage carousel. This is the intended consequence of the anti-overlap gate (DESIGN §D.4's optional badge-stack is the documented opt-in to also show it on featured tiles). Consistent with ledger 32b/35b; flagged only so it isn't mistaken for a missing render.

- **`main.js` shared-anchor coordination (§4.3.b + §4.7.0).** `main.js:269` = `document.addEventListener('DOMContentLoaded', () => {`, `:270` = `  initConfig();`. Both §4.3.b (IMPLEMENT 1268–1272) and §4.7.0 (IMPLEMENT 1600–1604) quote this exact two-line CURRENT block and both append right after `initConfig()`. They target the same region, compose in any order, and neither touches the consent/config work already in the handler. ✓ (Ledger 36b holds.)

## Part (c) — verdict rationale

Every round-3 fix's CURRENT anchor byte-matches the tree and every NEW block references only symbols/tokens that exist. The `previewToken` scope crash is genuinely resolved (unique local, correct param), the `.badge-unique` CSS lands on solid existing tokens with a clean anchor, the badge gate reads a real field, and the two `main.js` appends share one verified anchor. Nothing load-bearing left open in the scoped area; the C-lane items were untouched by round-3.

---

**Verdict: READY TO BUILD** — all four scoped round-3 fixes byte-verified clean against the working tree; no fidelity drift.
