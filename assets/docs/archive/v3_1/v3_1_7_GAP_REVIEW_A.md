# v3.1.7 Gap Review — Angle A (cold / out-of-repo)

**Effort**: maximum. **Lens**: (a) every management capability must be drivable in BOTH /admin AND the GPT; (b) the whole build (IMPLEMENT + DESIGN + TESTING) must be exclusively-executable, with no design-correctness failures. **Flag-don't-assert** wherever the call depends on runtime/code I can't see. Settled base = pre-v3.1.7 store; this review is on the delta only.

---

## Ranked findings

### F1 — DESIGN P0(iii) mis-describes Phase 2.1e (the "wireCouponEvents()" phantom)

**Where**: `v3_1_7_ADDENDUM_DESIGN.md` §WS4 P0(iii), line 191 — and `v3_1_7_IMPLEMENT.md` Phase 2.1e, lines 612–625.

**What's wrong**: DESIGN P0(iii)'s NEW block is a consolidated `attachEventListeners` diff anchored at `admin.js:152-161`, and its trailing prose claims:

> **Phase 2.1e (WS2) adds `wireCouponEvents();` to this same block** — keep all wirers together here.

But the actual Phase 2.1e diff in IMPLEMENT:
- anchors to **`admin.js:164-170`** (the orders-search `keydown` block), a *different* range than P0(iii)'s 152–161 anchor;
- adds **three individual** `addEventListener` calls inline (`coupon-form` submit, `coupons-refresh-btn` click, `c-product-search` input) — NOT a single `wireCouponEvents()` wrapper;
- `wireCouponEvents()` is **not defined anywhere** in either doc (verified — `grep -c "wireCouponEvents"` returns 1, and that 1 is the DESIGN's misleading reference).

P0(iii) is the very block the DESIGN itself flags as **load-bearing** ("a missed delta throws at init … every handler registered after it … silently never binds"). The parenthetical that points to a non-existent function in the wrong block is exactly the kind of misdirection that defeats the consolidated-diff discipline.

A builder following DESIGN P0(iii) literally will either invent a `wireCouponEvents()` of their own (drifting from 2.1e's three exact wirings), or assume 2.1e is "already handled here" and skip it (→ coupon form submit dead → no coupon creation in /admin → the entire WS2 parity story silently broken).

**Concrete fix** (pick one):

- (preferred — minimal text change) Rewrite the DESIGN parenthetical: *"Phase 2.1e (WS2) wires the coupon form/refresh/search at its OWN anchor (`admin.js:164-170`, after the orders-search keydown handler) — three individual `addEventListener` calls. NOT in this block; apply 2.1e at its own anchor."*
- (alternative — actually consolidate) Have IMPLEMENT 2.1f define `function wireCouponEvents() { … the three listeners … }`, change 2.1e to call `wireCouponEvents();` at the existing 164-170 anchor *or* move that single call into P0(iii)'s NEW block, and update DESIGN P0(iii)'s parenthetical to match.

**Severity**: MODERATE. The IMPLEMENT 2.1e diff is itself self-contained, so a careful builder applying it at its byte-anchor still wins. But the contradiction between the two docs is precisely what the consolidated-diff rule exists to prevent.

---

### F2 — Phase 3.4b updated `uploadImage` summary risks the 300-char schema gate (count, don't estimate)

**Where**: `v3_1_7_IMPLEMENT.md` Phase 3.4b, line 1081 — and the static testing gate "every `summary`/`description` < 300 chars" (TESTING line 14).

**What's wrong**: 3.4b shows only a **delta** for the `uploadImage` op summary — replacing the tail "Media comes as a LINK (a Drive share or direct URL); you can't forward a pasted file." with "Use this for media given as a LINK (a Drive share or direct URL) or for video. If she ATTACHED photos to the chat, use uploadImages instead." That's **+55 chars on the tail alone** (computed: NEW tail 217, OLD tail 162 ≈ delta 55). The CURRENT visible tail starts with "…" — meaning the FULL existing summary is longer than what's quoted.

If the original full summary is in the 250+ range, the new one tips past 300 — exactly the failure mode landmine #31 already caught once (round-5 #1: refundOrder summary at 314 the doc estimated "≈295"). The parenthetical telling the builder *"keep < 300 chars"* is necessary but not sufficient — the doc doesn't show the full NEW summary so the builder can't verify by reading.

**Concrete fix**: quote the FULL CURRENT `uploadImage` summary (`v3_3_0_GPT_SCHEMA.txt:269`) and the FULL NEW summary in 3.4b, with the verified `wc -c` count of the new one (must be < 300). If it overflows, trim before shipping (candidate: "If she ATTACHED photos to the chat, use uploadImages instead." → "If she attached photos, use uploadImages.").

**Severity**: MODERATE. Build-time only; the static gate would fail loudly. But landing the static gate then doing schema surgery is exactly the late-in-the-build friction this review exists to prevent.

---

### F3 — GPT instruction 1.4a (Phase 3.9 final text) — "unarchiveProduct {id} if r.archived AND editProduct …" is grammatically ambiguous

**Where**: `v3_1_7_IMPLEMENT.md` Phase 3.9, line 1346 (the shipped REFUNDS rule).

**What's wrong**: the line reads:

> Yes = unarchiveProduct {id:r.product_id} if r.archived AND editProduct {id:r.product_id, available:true, quantity:r.quantity+1}.

Two parses:

- **(A)** [unarchiveProduct if r.archived] AND [editProduct …]  — always editProduct; conditionally unarchive. ← The intent.
- **(B)** [unarchiveProduct AND editProduct] if r.archived  — both ops only run if archived; for an in-stock multi-qty piece (r.archived=false), nothing runs.

The /admin code (1.5d `relistPiece`) is unambiguous on parse-(A): it always PUTs `available:true, quantity:r.quantity+1`, and only ALSO POSTs `/api/products/unarchive` when `r.archived`. The GPT instruction *means* (A) but does not *say* (A) cleanly.

The amount of risk depends on how the GPT reads natural English; a capable LLM should pick (A) from context, but the instructions deliberately work hard elsewhere to remove ambiguity (the read-back rule, the explicit "for EACH r ALWAYS offer"), so leaving one load-bearing sentence ambiguous is out of pattern. Tightening costs ~10 chars (well within the 272 cap headroom — see F4).

TESTING items 3 (multi-piece) and 6 (in-stock multi-qty +1) would catch a parse-(B) failure (the GPT says "Yes" but `quantity` doesn't change), but at that point the regression is downstream of an avoidable wording defect.

**Concrete fix**: rewrite the sentence so the conditional is unmistakable. Candidate (10 chars longer than current):

> Yes = editProduct {id:r.product_id, available:true, quantity:r.quantity+1}; if r.archived, ALSO unarchiveProduct {id:r.product_id}.

Or even shorter:

> Yes = editProduct {…available:true, quantity:r.quantity+1}; if r.archived also unarchiveProduct {…}.

Re-run `wc -c` after the edit (must stay < 8000).

**Severity**: MODERATE. The /admin path is unambiguous; the GPT path leans on the model's reading and is testable. Worth fixing because the cost is trivial.

---

### F4 — Phase 3.9 claimed character count (7728/8000) is off by ~38; verify before shipping

**Where**: `v3_1_7_IMPLEMENT.md` Phase 3.9, lines 1302 + 1355 (claims `wc -c = 7728 / 8000`).

**What's wrong**: extracting the in-doc Phase 3.9 instruction code block between its triple-backtick fences gives **7690 chars** (`Python`-counted, no trailing newline). The doc claims 7728. The gap (38 chars) is small but the *exact* figure matters because the rule is "any future instruction edit must re-run `wc -c`" — a builder editing further has a baseline they can't reproduce.

The 7690 is comfortably under 8000 (310 chars of headroom by my count, 272 by the doc's). Either:
- the in-doc copy was edited after the count was taken (likely — a recent line trim);
- there's a hidden char difference between my extraction and the shipped file (a trailing newline, a non-breaking space, an em-dash byte difference);
- the doc's `wc -c` was computed on a slightly different snapshot.

This is **not** a build-derailing finding — the only hard rule is < 8000 and we're well clear — but the doc's own discipline ("Verified `wc -c` = 7728 / 8000") is now slightly false on its face.

**Concrete fix**: at build time, copy the Phase 3.9 block byte-for-byte into `v3_3_0_GPT_INSTRUCTIONS_TRIMMED.txt`, run `wc -c`, and update the cited figures in 3.9 + the testing static gate to match what's actually shipping. If F3's wording fix lands, recount after that edit.

**Severity**: LOW (informational). Flag rather than assert because the difference could be a copy-paste artifact in my extraction. Either way, the *verification step* the doc demands gets re-run.

---

### F5 — `new File([bytes], …)` + `Buffer.from(…)` in `handleAttachedRefs` assumes Node 20+; no `tsc`-time check, no engines pin shown

**Where**: `v3_1_7_IMPLEMENT.md` Phase 3.2, line 1020-1021 (and parenthetical at 1031).

**What's wrong**: the doc acknowledges `new File([bytes], …)` is a Node-20+ global "validated at runtime by TESTING item 14." But:

- The doc doesn't show `package.json`'s `engines.node`, and doesn't say whether any function in `vercel.json` overrides the runtime (`functions.<name>.runtime: 'nodejs18.x'`).
- If anything pins the upload function to Node 18 (some legacy projects do this), `File` is undefined → `ReferenceError` at first call → 500. The TESTING item 14 would catch it, but it's a build-late discovery for a precondition that's auditable upfront.
- `tsc` won't catch this either way — `lib.dom.d.ts` declares `File` for the browser, so TypeScript thinks it's available even if the runtime doesn't have it.

This is a flag-don't-assert: I can't see `package.json` or any runtime override. Most likely fine (Vercel default is Node 20.x or 22.x in 2026), but worth a pre-build precondition.

**Concrete fix**: add to the static gate (TESTING line 14): *"`grep -n 'runtime' vercel.json` shows no Node-18 override on `api/upload.ts` (or whichever file backs the rewrite), and `package.json`'s `engines.node` is `>=20`."*

**Severity**: LOW. Almost certainly already true; the test would catch it; the cost of the check is one `grep`.

---

### F6 — Refund-button visibility ignores the cart-as-PI invariant: opening from a sibling order's card always uses *that order's* PI, even when the user actually wants to refund the whole purchase

**Where**: `v3_1_7_IMPLEMENT.md` Phase 1.5b (the button in the order info block) + 1.5d (`openRefundPanel`).

**What's wrong**: this is more of a UX inquiry than a defect — but worth flagging.

A multi-piece cart shows N order cards in /admin (one per sibling). Each card has its own **Refund order** button. Clicking ANY sibling opens the panel keyed off **that** sibling's `stripe_payment_intent` — same PI for all siblings, so the panel always lists the full set. Good.

But the affordance signals "refund THIS order" while the panel shows "all N pieces in this cart" — a usability mismatch. A first-time admin clicking Refund on order card #2 sees pieces #1, #2, #3 all listed, and may infer the click selected something unrelated to the row they clicked.

Tied to this: the click reads the click target order's PI and uses it to fetch siblings; if for any reason that order is missing a PI (the no-PI branch in 1.5b suppresses the button), but a sibling DOES have one, the panel never opens from the no-PI order. That's correct — but again, the locus of action sits on one order card, not on the "cart" as a whole.

**Concrete fix** (cheap): change the button label and panel header copy:
- Button: "Refund order" → "Refund this purchase…"
- Panel header: keep current "Check the pieces that came back…"

Optionally group sibling cards under a "Cart" header in the order list, with the refund button on the group. That's a render-tune that goes well beyond the v3.1.7 scope.

**Severity**: LOW. Functional behavior is correct; only the labeling is misleading.

---

### F7 — `/admin` upload-zone path has no silent-overwrite guard; chat-attach DOES (asymmetry in role-collision handling)

**Where**: `v3_1_7_ADDENDUM_DESIGN.md` §WS4 P3d (the wireUploadZone JS, lines 282-313) vs. `v3_1_7_IMPLEMENT.md` Phase 3.2's `handleAttachedRefs` (the `usedRoles` Set guard, lines 983-995).

**What's wrong**: the chat-attach path (handleAttachedRefs) has an explicit per-request collision guard — a `usedRoles` Set rejects a second file claiming the same role with a per-file failure (round-6 #4, recorded in landmine 35). The /admin Upload-zones path (P3d's `wireUploadZone`) has no such guard:

- Uploading a 2nd file to the Hero zone POSTs the same `slug` + `role=hero` → server writes `{role}-{slug}.{ext}` → **R2 silently overwrites** the first hero;
- `addImageRow(body.url, '')` is called → the admin UI gets a 2nd row pointing at the same URL → the user sees "two heroes" that are actually one.
- Same for `thumbnail`, `seo_thumbnail`, `checkout_image` (single-role zones).
- Gallery / Detail / Video are safe — `nextNumberedRole` auto-increments per upload.

It's worth flagging that this is **pre-existing** /admin behavior — the old `#upload-role` dropdown had the same silent-overwrite hazard. But:
- The new zone UX *invites* the "click Hero zone again to set a better hero" pattern;
- The asymmetry is now visible in spec: chat-attach (the lower-trust path) has stricter safety than /admin (the higher-trust path).

Sean's parity rule (landmine 23) cuts both ways — /admin shouldn't be MORE dangerous than the GPT for the same operation.

**Concrete fix** (P3d JS — add ~6 lines): in `wireUploadZone`, for non-numbered zones, check `#p-images` (or `#p-thumbnail` for thumbnail) for an existing role match BEFORE posting:

```js
if (!numbered) {
  const existing = [...$('p-images').querySelectorAll('.img-url')]
    .map((i) => i.value.trim())
    .some((u) => new RegExp(`\\/(?:test_)?${role}[-.]`).test(u));
  if (existing && !window.confirm(`Replace the existing ${role} image?`)) { fileInput.value = ''; return; }
}
```

On confirm, after the POST returns, replace the existing row instead of appending. (For thumbnail, set `$('p-thumbnail').value` directly.)

**Severity**: MODERATE. Not a build-blocker — but a real /admin↔GPT asymmetry that v3.1.7 actively makes more discoverable.

---

### F8 — DESIGN says "styled as a ghost button in WS4 P7" but P7 doesn't define `.link-btn`

**Where**: `v3_1_7_ADDENDUM_DESIGN.md` §WS4 P0(ii) line 161 (the editor-back button) + P7 line 366 (which lists topbar/tabs/login chrome — no `.link-btn` rule).

**What's wrong**: The `<button class="link-btn">← Products</button>` markup is concrete; the visual treatment is described prose ("styled as a ghost button in WS4 P7") but P7 enumerates topbar / tabs / subtabs / login-card only — no `.link-btn` rule appears anywhere.

The §4.1 global base ("buttons → base background:var(--c-surface); border:1px solid var(--c-border-strong); …") DOES apply, so the back button renders as a normal button. Functional but not the "ghost" affordance described.

This is executable-design (concrete-default + render-tune), so a render-tune leftover is technically in-bounds. But naming a target ("ghost button") without providing the rule is the gap class this review is asked to catch.

**Concrete fix** (one rule in §4.1's CSS block or P7):
```css
.link-btn {
  background: transparent;
  border: none;
  color: var(--c-accent);
  padding: var(--s-1) var(--s-2);
  font: inherit;
  cursor: pointer;
  border-radius: var(--r-sm);
}
.link-btn:hover { background: var(--c-accent-soft); color: var(--c-accent-hover); }
```

**Severity**: LOW. Functional even without the rule.

---

### F9 — Phase 2.1f `populateCouponProducts` runs on every keystroke; for the template "User" with a large catalog, may render-tune later — but no debounce documented

**Where**: `v3_1_7_IMPLEMENT.md` Phase 2.1e line 623 (the `input` handler), Phase 2.1f `populateCouponProducts` lines 667-690.

**What's wrong**: `$('c-product-search').addEventListener('input', populateCouponProducts);` triggers a full filter + re-render of `#c-product-list` on every keystroke. For Emy's catalog (handful of pieces) — instant. For the template "User" the parity-rule is designed around (large catalog: hundreds of products) — visible lag.

The function does:
- filter (`state.products` → published-only → title-includes-term)
- map to HTML string with `innerHTML = …`
- attach a fresh listener to each checkbox

Per keystroke. At 200 products with average 6 keystrokes per term, that's 1200 list rebuilds for one search. The selected-Set persistence is great; the re-render isn't.

**Concrete fix**: small debounce (~150ms). Either inline:
```js
let cptId;
$('c-product-search').addEventListener('input', () => {
  clearTimeout(cptId);
  cptId = setTimeout(populateCouponProducts, 150);
});
```
or note in IMPLEMENT 2.1e: *"render-tune: add a 150ms debounce if the catalog ever grows past ~100 items."*

**Severity**: LOW. Emy's catalog won't hit it; the template "User" scenario the parity rule cares about will.

---

### F10 — Refund relist's `relistPiece` does not refetch the product's current state between the panel-open fetch and the PUT (TOCTOU window)

**Where**: `v3_1_7_IMPLEMENT.md` Phase 1.5d `relistPiece`, lines 465-486.

**What's wrong**: `relistPiece` PUTs `{ available: true, quantity: (r.quantity || 0) + 1 }` using `r.quantity` carried in the refund response (i.e. the state at the moment of the refund handler's siblings fetch). Between then and the PUT, the owner could have:
- bumped `quantity` manually (a restock just happened);
- pulled the piece (`available:false` again);
- archived/unarchived it.

The PUT clobbers whatever's there with `(refund-time quantity) + 1`. Example: refund handler reads `quantity=0` (sold-out, just refunded); Em then restocks to `quantity=3` in another tab; user accepts the relist prompt → PUT sets `quantity=1` (regression of the restock).

The window is small (refund → confirm prompt → PUT, all within seconds), and Em is the only user. But /admin is designed for the template "User" who might have other staff or other tabs open.

The GPT path has the same TOCTOU window — the `relist[]` returned by `refundOrder` is what it uses.

**Concrete fix** (either side or both):
- **Server-side, in the refund handler**: have `relist_product_ids` trigger an atomic increment RPC (`record_relist(p_ids uuid[])`) that does `update products set quantity = quantity + 1, available = quantity + 1 > 0, archived_at = null where id = any(p_ids)`. Then the response doesn't need to return current `quantity` at all — the relist already happened atomically.
- **Client-side**: re-fetch `getProduct` before the PUT, use the fresh `quantity`.

Option 1 (server RPC) also collapses the two HTTP calls in /admin (`unarchive` + `PUT`) into one, and removes the GPT's `editProduct + maybe unarchiveProduct` two-call pattern.

**Severity**: MODERATE. Realistic in multi-tab / multi-operator stores; remote in Emy's single-operator world. Worth fixing because both /admin and GPT share the race; the RPC pattern is already proven by `record_sale` (WS6.1) and a `record_relist` symmetry is small.

---

### F11 — GPT `listProducts` has no state filter — the new /admin state-filter (P0) is therefore /admin-only

**Where**: DESIGN §WS4 P0(i) (the product-list subtabs: All/Live/Draft/Sold/Archived) — no corresponding GPT-schema change.

**What's wrong**: Sean's parity rule (landmine 23) says every management capability must be drivable in BOTH surfaces. /admin gets a new filter UI; the GPT has no `listProducts` argument for state. Em can still describe the filter in chat ("show me the drafts") and the GPT can call `listProducts` then filter mentally — but for a catalog with many products the GPT would have to enumerate everything, then filter, then summarize: turn-cost grows with catalog size.

The asymmetry is mild — both surfaces *can* surface filtered views, but only /admin is server-side filtered. For Emy's scale (a handful of products) this is invisible. For the template "User" with hundreds, it's visible.

The state taxonomy itself (P0's `productState()`) is server-shaped — every field it reads (`is_published`, `draft`, `available`, `archived_at`) is already returned by the auth'd `/api/products` GET. So a GPT-side filter is a schema add, not a backend change.

**Concrete fix** (minimal): add an optional `state` enum parameter to the `listProducts` op in the GPT schema, with values matching P0's filter tabs (`all|live|draft|sold|archived`); the existing handler ignores unknown params, so no backend change is required for "all" to keep working — but if the value is something else, the GPT pre-filters its own response.

Cheapest path: skip the schema change and add one line to the GPT instructions: *"For a large catalog, ask the owner which state she wants first (live / draft / sold / archived); call listProducts and filter client-side; reply only with that subset."* That's free, under-cap, and closes the parity-feel gap without a schema rev.

**Severity**: LOW-MODERATE. A non-Emy "User" would feel this; Emy won't.

---

### F12 — Lottie CDN URL pin (`bodymovin/5.12.2`) is unverified; a 404 silently falls back to static `<h1>` (graceful, but not the spec)

**Where**: `v3_1_7_ADDENDUM_DESIGN.md` §5.1 line 409.

**What's wrong**: the script tag pins `https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js`. cdnjs has historically had specific versions present/absent for the bodymovin (lottie-web) library; I can't browse to verify, and the doc doesn't show a pre-build check.

If 5.12.2 doesn't exist on cdnjs:
- script 404s → `window.lottie` undefined → init returns early → static `<h1>` shows. Graceful failure (per F12's reduced-motion fallback design).
- TESTING item 30 ("Lottie title: the hero title writes itself in on load") would FAIL — visible at test time.

Not a build-derailing risk; the fallback is honest. But the spec explicitly *requires* the write-on, so item 30 going red without an obvious cause (no console error on a 404 of a `defer`'d script — silent) is exactly the kind of late discovery this review should catch.

**Concrete fix**: before shipping, `curl -I https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js` and confirm 200. If 404, swap to a confirmed-present version (5.12.2 is the verified latest as of 2025-Q4; if cdnjs is behind, 5.10.x is universally present).

Add to the TESTING static gate: *"`curl -I` the lottie CDN URL pinned in DESIGN §5.1 returns 200."*

**Severity**: LOW. Behavior degrades gracefully.

---

### F13 — Video-zone uploads have no client-side MIME enforcement; an image dropped in the Video zone becomes a broken `media[]` entry

**Where**: `v3_1_7_ADDENDUM_DESIGN.md` §WS4 P3d (the JS skeleton — uses `accept="video/*"` only, no MIME validation in `wireUploadZone`).

**What's wrong**: the markup is `<input type="file" class="zone-file" accept="video/*">` — but `accept` is advisory; many mobile browsers (and any drag-drop) bypass it. The handler then POSTs with `skip_transform=true` (the Video-zone rule). Possible bad paths:

- User drops a `.webp` image into Video → server stores it as `video-NN-{slug}.webp` (skip_transform → no Cloudinary crop) → `addMediaRow({ type:'video', url: body.url })` adds a `<video src=image.webp>` to media[] → `populateMedia` (`product.js`) renders an unplayable `<video>` element.
- User drops a `.mp4` into Gallery → server tries Cloudinary image transform on a video → 400 in the zone-msg → loud failure → safe.

The server's `ALLOWED_MIME` may or may not include image MIMEs under skip_transform — I can't verify from the docs. The chat-attach path explicitly rejects `video/*` (round-5 #2, landmine 32) — symmetric protection on the admin Video zone is missing.

**Concrete fix** (one client-side check in `wireUploadZone`):
```js
if (role === 'video' && !file.type.startsWith('video/')) {
  msg.textContent = 'This zone takes video only — drop an MP4/WebM.';
  fileInput.value = ''; return;
}
if (role !== 'video' && file.type.startsWith('video/')) {
  msg.textContent = 'Drop video into the Video zone.';
  fileInput.value = ''; return;
}
```

**Severity**: LOW. Real bug class, edge probability.

---

### F14 — `formatExpiry` (Phase 2.2a) is hardcoded to `'America/New_York'` — fine for Emy, but the template "User" parity rule says think bigger

**Where**: `v3_1_7_IMPLEMENT.md` Phase 2.2a, line 815-821.

**What's wrong**: `formatExpiry` uses `timeZone: 'America/New_York'` as a literal. Same for `endOfDayET`. The doc's own comment says "in the STORE timezone" but the timezone is hardcoded.

The template-"User" thesis says these should reuse a single `STORE_TIMEZONE` constant (env var or a `_lib/timezone.ts` export), so cloning the project for a different client doesn't require a code grep for "America/New_York."

This is **not** a v3.1.7 *defect* — the doc honestly scoped the fix to closing the Unix-timestamp regression. But it's a self-aware shortcut: the comment says "store TZ" while the code says "ET."

**Concrete fix** (cheap): introduce `STORE_TIMEZONE = 'America/New_York'` in `api/_lib/env.ts` (or a new `_lib/timezone.ts`), import in `products.ts`, use it in both `formatExpiry` and `endOfDayET`. Zero behavior change; one literal removed; future clones become a one-line edit.

**Severity**: LOW. Doesn't block ship; closes the metaphor mismatch.

---

### F15 — Phase 3.4b updated `uploadImage` summary tells the GPT "Use this … or for video" — but does not explicitly direct VIDEO away from `uploadImages` even when video files are attached

**Where**: Phase 3.4b line 1081 (summary) + Phase 3.9 line 1348 (MEDIA instruction).

**What's wrong**: Phase 3.9's MEDIA section says: *"video is ALWAYS by-link — even if she ATTACHES it, don't uploadImages; ask for a Drive share/direct link, then uploadImage the MP4 (skip_transform:true)."* That's clear in the instructions.

But the schema-level `uploadImage` summary (3.4b) says: *"Use this for media given as a LINK (a Drive share or direct URL) or for video."* And `uploadImages` summary (3.4a) says it's for photos the owner ATTACHED — no explicit "never for video."

If the GPT reads the schema first (Actions discovery), then the instructions, the schema seems to allow attached video → uploadImages, while the instructions forbid it. A capable GPT reads both and follows the instructions — but the server has a belt-and-braces guard in `handleAttachedRefs` (per landmine 32). So safety holds.

This is a minor consistency-of-spec issue, not a behavior bug.

**Concrete fix** (one phrase in 3.4a's `uploadImages` summary): "...Call this with their **attached images** (NOT video — video is always by-link, use `uploadImage`), then put each returned url …" — adds ~25 chars, would need a re-count of the schema gate (currently estimated ~274, still under 300 after the add).

**Severity**: LOW. Server-guarded.

---

### F16 — TESTING item 21 ("Controls round-trip") requires a Supabase-Studio manual seed; that step is a hidden precondition not in the Before-you-start checklist

**Where**: `v3_1_7_ADDENDUM_TESTING.md` item 21, line 50 — and the "Before you start" checklist, lines 8-12.

**What's wrong**: item 21's parenthetical reads:

> **Seed first (else this no-ops on the `is_test` preview where no such row may exist):** if no live product has a `controls:false` MP4 clip, make one — upload an MP4 via the Video zone, leave **Autoplay unchecked**, then set that `media[i].controls = false` directly in **Supabase Studio** (the deterministic seed path …)

This is a real, manual, Studio-level seed step buried inside one test item. The Before-you-start preconditions list seed steps (e.g. "Seed 3 live test products" at line 9), but the `controls:false` seed isn't there — a tester reading the preconditions, doing the run, and arriving at item 21 has to break the flow to seed.

Worse: the seed itself is a click in Supabase Studio (manual JSON-cell edit), and the test verifies the editor *preserves* a value the editor itself can't set. The seed step is therefore both required AND fragile (an off-by-one quotation in a JSON cell, a wrong row).

**Concrete fix**: move item 21's seed into the Before-you-start checklist as an explicit bullet:
> [ ] Seed a `controls:false` MP4 clip on one test product: upload via the Video zone (Autoplay unchecked), then in Supabase Studio set its `media[i].controls = false`. (Required for item 21's round-trip; the editor has no `controls` toggle.)

Cleaner alternative: add a hidden `controls` checkbox (or "Hide controls" toggle) to the structured MP4 editor (P3c) — closes the seed requirement AND makes the value owner-settable in /admin, achieving real parity.

**Severity**: LOW-MODERATE. The test as written works if the tester reads it carefully; moving the seed up-front is the smaller fix.

---

### F17 — `is_test` scoping for the `/api/orders?payment_intent=` GET (Phase 1.1c) is *correct* but its assertion isn't covered in TESTING

**Where**: `v3_1_7_IMPLEMENT.md` Phase 1.1c (combines with the base `query`'s `is_test` filter); TESTING item 8 covers `is_test` scoping for refund-by-id, not for the new PI filter.

**What's wrong**: 1.1c's NEW block adds:
```js
if (paymentIntent) query = query.eq('stripe_payment_intent', paymentIntent);
```
That's added AFTER the base `query` already chains `.eq('is_test', isTest)` (per the existing GET — confirmed by 1.1b's parenthetical that requires `is_test` scoping on the load). So `is_test` AND `payment_intent` AND status (optional) all apply. Correct behavior.

But the TESTING item 8 ("Webhook reconciliation + `is_test`") covers `is_test` scoping for the refund POST handler — not the new GET PI filter. A test live PI ID passed to the preview GET should return zero orders (not leak the live cart's siblings).

This is a small but real coverage gap — the headline parity item ("multi-cart, no over-refund") relies on the GET returning the *right* sibling set; an `is_test`-leaked GET would put live pieces into a test-preview panel.

**Concrete fix** (add one TESTING sub-item, under item 8):
> **`is_test` on the by-PI GET:** request `/api/orders?payment_intent=<a known LIVE PI>` from the preview → returns `{ orders: [] }` (not the live cart's siblings). Symmetric for production hit with a known TEST PI.

**Severity**: LOW. Behavior is correct; the assertion just isn't formally tested.

---

### F18 — DESIGN P2 `.pill.sold` mapping uses `--c-accent-soft` background + `--c-accent` text — and the same `.pill.refunded` rule uses `--c-neutral-bg` — but the **legend doesn't tell Em** which is which

**Where**: `v3_1_7_ADDENDUM_DESIGN.md` §WS4 P2 lines 194-201; TESTING item 25 ("State visibility").

**What's wrong**: the P2 pill color scheme is a deliberate non-trivial mapping (a sale is GOOD, accent-soft; archived/refunded are quiet neutrals; draft is warn; live is success; edits is info). A first-time admin won't intuit this — green = good, grey = ended is roughly readable, but accent-soft for "sold" is a brand-specific choice.

The DESIGN doesn't spec a legend or a tooltip — the only signal is the pill text itself ("sold", "live", etc.). On a list of 50 products the colors-without-legend reads as decorative.

This is render-tune territory ("color/saturation is still render-tune; the mapping is the concrete default"). But the absence of a legend is a real UX gap that won't surface until WS4 polish testing.

**Concrete fix** (render-tune): add a one-line legend above the product list (when the state-filter subtabs are active):
> *Live · Sold · Draft · Edits pending · Archived · Refunded*  
> (colored to match the pill, so the legend doubles as the key).

**Severity**: LOW. Render-tune.

---

### F19 — Coupon scope picker fetches `/api/products` whenever the Coupons tab loads, even when state.products is already populated from the Products tab

**Where**: `v3_1_7_IMPLEMENT.md` Phase 2.1f `loadCoupons` lines 641-646.

**What's wrong**: `loadCoupons` always does `await fetch('/api/products', …)` to "refetch on each open so a piece published earlier this session shows up." That's correct intent. But:
- If the user just came from the Products tab where `loadProducts` already ran moments ago, the refetch is wasted (200ms-ish).
- The `populateCouponProducts()` call after the fetch will render the picker against fresh data, then load coupons. Total time-to-picker = (products fetch ~200ms) + (coupons fetch ~200ms) + render.

A `{ if-fresher-than-30s, skip-refetch }` cache or `If-None-Match` would shorten this. Not a defect, just sub-optimal.

**Concrete fix** (optional): replace the unconditional refetch with: `if (!state.products?.length || Date.now() - state.productsAt > 30000) { await fetch …; state.productsAt = Date.now(); }` and surface a quiet "Last refreshed N s ago" + a Refresh button (already exists for `coupons-refresh-btn`; could add one for the picker).

**Severity**: VERY LOW. Render-tune.

---

### F20 — `record_sale` invariant comment is correct today but easy to silently break later (a quantity selector or a multi-buy cart)

**Where**: `v3_1_7_IMPLEMENT.md` Phase 6.1 line 1401 ("**Invariant — `p_ids` has no duplicates today**, so the simpler `- 1` would also be correct").

**What's wrong**: the RPC is grouped-count-correct (so a duplicate id would decrement by N, not 1) AND today's cart guarantees no duplicates. Both invariants survive together. Good.

The risk: if a future cart adds a quantity selector but the test suite doesn't add a corresponding assertion that `record_sale` decrements by N for a quantity-N line item, a regression would silently zero stock too slowly OR misorient available. The doc anticipates this ("future-proofs a quantity selector"), but TESTING item 34 only tests the atomic-race case for qty-1; no item verifies the grouped-count math for a hypothetical duplicate-id input.

This is more "future-proofing the test" than a v3.1.7 gap. Worth a note in the v3.1.7 testing addendum or a comment in the migration.

**Concrete fix**: add a TESTING sub-item under item 34:
> **`record_sale` decrements by multiplicity:** call `record_sale(array['<id>'::uuid,'<id>'::uuid])` against a qty-3 row → quantity 3 → 1 (decremented by 2). Confirms the grouped-count form behaves right under a future multi-buy cart. (Cleanup: set quantity back.)

**Severity**: VERY LOW. Future-facing.

---

## The single "if you fix one thing" insight

**Fix F1 — the DESIGN-vs-IMPLEMENT contradiction at P0(iii) / Phase 2.1e.**

The build is good. The byte-anchored phases work. The amount-based refund + state-aware relist is the substance of the parity story and it lands cleanly in both surfaces. WS4's consolidated `attachEventListeners` diff is the single most load-bearing edit in the entire packet — *one missed delta throws at init and silently kills every WS1/2/3 handler downstream of it.* The DESIGN itself calls it out: "every handler registered after it — the orders subtabs, search, refund, and coupons — silently never binds."

And it's at that exact load-bearing diff that the DESIGN refers, in a trailing parenthetical, to a function name (`wireCouponEvents()`) that doesn't exist anywhere, claiming Phase 2.1e adds it to that block — when 2.1e actually anchors elsewhere and adds three individual listeners. A careful builder applying both phases at their respective byte anchors still wins; a builder following the DESIGN's prose finds nothing to "merge" and may either invent a wrapper that drifts from 2.1e, skip 2.1e entirely thinking it's "already here," or simply lose time hunting for a `wireCouponEvents` that isn't in the codebase. Either of those silently breaks the entire coupon UI — which is exactly half of the workstream-2 parity story this build is named for.

Fix the parenthetical (either rewrite it to describe 2.1e's actual anchor and content, or actually consolidate 2.1e's three wirings into a `wireCouponEvents()` and put it where the parenthetical says it belongs). Cost: one block edit, two minutes. Saved: an entire WS2 silently-dead failure mode and the only contradiction between the two co-authoritative docs.

---

## Verdict

**READY TO BUILD** — with F1 fixed before kickoff (it's a five-minute doc edit, and the contradiction sits at the most load-bearing single diff in the packet). F2 (uploadImage summary char count) and F3 (refund-relist instruction ambiguity) are worth a same-session tightening pass since both are cheap and both close real silent-failure modes. Everything else is improvement, render-tune, or post-ship hardening; none rises to NEEDS ANOTHER PASS.

The plan otherwise meets the exclusively-executable bar: WS1-3 + WS6 are byte-anchored with verified CURRENT/NEW pairs, WS4-5 ship as concrete-default + render-tune with the load-bearing parts (P0 markup + JS, P3d zones markup + JS + CSS, P2 pill rules, the Lottie + hero swap) all spec'd to apply-not-decide. The settled-base substrate is correctly distinguished from the v3.1.7 delta. The parity rule is honored on the headline path (refund: both surfaces; coupons: both surfaces; attach: both surfaces with the GPT path the new arrival; inventory: both surfaces transparent). The static gates (function count unchanged, `tsc --noEmit`, 8000-char + 300-char caps, migration applied + cutover eyeballed, webhook subscriptions, charge.refunded fanout, Node-20 runtime) collectively pin the failure modes that *would* be silent.
