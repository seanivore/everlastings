# v3.1.4 — Cold Gap Review (Angle A — out-of-repo)

**Reviewer position.** Senior engineer, no repo access, given the four docs (IMPLEMENT + design + testing + STORE). Pretending to be the fresh agent about to execute, asking: "where would I have to guess, recall, decide, or — worse — locate something the plan never gave me?" Crossed with: "if I run this exactly as written, what does Em still not have parity on, and what does the design render wrong?"

**Method.** Read all four docs end-to-end (no grep-jumping — that bit round-3 on the multi-cart over-refund). Verified the byte-countable claims (schema `summary` lengths, `wc -c` of the Phase 3.9 GPT instructions, the SLUG/MEDIA/LINK TROUBLE sections of the shipped instruction file). Held to the 30 landmines from the prompt — did not re-flag round-3's "multi-cart over-refund" (closed), the WS6 STORE lag (deliberate, doc-sync at 6.4), or the round-4 closures (`endOfDayET` ICU brittleness, paused-stock zeroing, `.pill.refunded`, Lottie `data_failed`, breadth-pass sibling fetch).

**Settled-base honored.** Pre-WS6 STORE lines :614/:709, the per-order cart dedup at `main.js:121`, the amount-based refund composer, `requireAdmin` returning the service-role client, and `authorize()` running at the top of `upload.ts:POST` are taken as given — none of these are gaps in this build.

---

Verdict: NEEDS ANOTHER PASS. Two real blockers, both small text edits:

refundOrder schema summary is 314 chars — the doc's "≈295" arithmetic is wrong; the testing addendum's every summary < 300 static gate fails on minute one. 286-char replacement in Finding #1.
GPT instructions never handle an ATTACHED video — step 2 says "Photos ATTACHED → uploadImages," the LLM reads "she attached media → uploadImages," the server processes it (video MIMEs allowed), defaults the role to hero, URL lands in images[] not media[], page silently breaks. 178-char fix proposed; 3.9 has 474 bytes headroom.

The 16 follow-ons are self-containment polish (#3-#18): SLUG rule names uploadImage singular only, WS6 cutover SQL drops the is_test join the comment recommends, #222 → --c-accent token sweep is contextually wrong if it's body text, Lottie defer-ordering assumes homepage.js is also defer (unverified), P0 back-nav + subtabs lack insertion byte-anchors despite being load-bearing parity, etc.
If you fix one thing: Finding #2 — only finding where failure is silent AND directly punctures the North Star (Em loses video-attach parity without a single error message). #1 just fails the gate immediately, so the builder catches it before any runtime cost.
Parity matrix in the file confirms attached-video is the only true parity hole; the MP4 controls:false SET is a symmetric niche gap in both surfaces, not a parity issue.

---

## Headline finding

**The Phase 1.3 `refundOrder` schema summary is 314 characters — over the 300-char cap.** I counted it: the doc's "≈ 295, just under" arithmetic is wrong by ~20 chars. The testing addendum's static gate explicitly tests `every summary < 300 chars`, so this would block the deploy at the first check. Trimmable to ≤290 with one pass (e.g., drop the parenthetical "(emails the buyer)" and tighten "the whole purchase" → "the purchase"); see Finding #1 for a concrete 286-char replacement. This is the kind of arithmetic miss that the prior round's `8538 → 7526` restructure was designed to head off; the same gate logic just wasn't applied to the schema file's `summary` ceiling.

---

## Findings — ranked by likelihood to derail

### 1 — **`refundOrder` schema `summary` is 314 chars, hard-fails the 300 static gate** *(IMPLEMENT Phase 1.3 :248; testing static-gate "every summary < 300")*

The block-quoted summary measures **314 chars**, not the doc's claimed ≈295. The testing addendum's static gate (`every summary < 300 chars`) is the first preflight; this would fail the build before any runtime test runs. **Concrete fix** (286 chars, all load-bearing facts preserved):

```yaml
summary: "Refund an order via Stripe; emails the buyer. A Stripe refund is an AMOUNT against the whole purchase; one cart can be several orders on one payment. Default = refund THIS order's amount + relist THIS piece. For several pieces or a custom amount, pass amount_cents + relist_product_ids."
```

(Confirmed in `verify_more.py`: 286 chars, 14 under the cap.) The other Phase-1.3 fields all fit (none of the enumerated `description:` strings exceed 229 chars). The `uploadImages` summary in Phase 3.4a measures 273 — clean.

### 2 — **GPT instructions never handle an ATTACHED video; the natural reading silently mis-routes it into `images[]` and the page breaks** *(IMPLEMENT Phase 3.9 — the shipped instruction file, step 2 + MEDIA + LINK TROUBLE)*

Grepped the Phase 3.9 text: no line covers "Em attaches a video file to the chat." The three relevant lines are:
- **Step 2:** "Photos ATTACHED in chat: call uploadImages…" — says **photos**, but the GPT is an LLM, not a parser; "she attached a media file" reads as "attached, use uploadImages."
- **MEDIA:** "uploadImage the MP4 (skip_transform:true)…" — assumes the link path, doesn't say "and if she attached it, ask for a link instead."
- **LINK TROUBLE:** "Video + 10+ photo batches stay on the link path." — a passive hint, never operationalized.

What happens if the GPT follows step 2 on an attached video:
1. `handleAttachedRefs` (3.2) accepts video — `ALLOWED_MIME` includes `video/*`, `isVid` flag is detected, `processOne(... 'true')` is called → server-side it works, file is named per `roles[i]` or the positional default.
2. Positional default for `i=0` is **`hero`** — so the video is stored as `test/<slug>/test_hero-<slug>.mp4`. Wrong role.
3. The returned URL ends up in `images[]` (the GPT puts uploadImages results into `images[]` per its create flow — there's no instruction to route MP4 returns into `media[]`).
4. The frontend's `populateMedia` reads `media[]`, not `images[]` → the video never appears on the product page; meanwhile the hero `<img>` tries to render an `.mp4` URL and breaks.

The fix is small (≤474 bytes of headroom in the 8000-cap file). Add one line — proposed placement at the end of MEDIA, before LINK TROUBLE:

```
If she ATTACHES a video, don't uploadImages — ask for a Drive share or direct link, then uploadImage with skip_transform:true (video uses the by-link path).
```

That's 178 chars; would land 3.9 at ~7704/8000.

### 3 — **`addImageRow` upload nudge focuses only the LATEST row; THE SLUG instruction names only `uploadImage` (singular)** *(Phase 3.9 "THE SLUG" + Design Addendum P3d `wireUploadZone`)*

Two small wording gaps in the shipped 3.9 instructions:

- **a)** "THE SLUG → Reuse EXACT string every **uploadImage**, createProduct" — `uploadImages` (plural) is not named. The schema **requires** `slug` on `uploadImages`, so the worst case is a server 400, but the rule should literally name both. One-char fix:

  ```
  Reuse EXACT string every uploadImage/uploadImages, createProduct
  ```

  (1 byte longer; fits.)

- **b)** No real "single point of failure" risk here — the schema's `required: [openaiFileIdRefs, slug]` catches an omission. But it's a literal-rule miss and the kind of thing that's free to fix.

### 4 — **WS6 cutover SQL doesn't enforce `o.is_test = products.is_test` in the `exists(orders)` join — the doc COMMENT recommends it, the SQL doesn't include it** *(IMPLEMENT Phase 6.1, the `update products` statement)*

The comment block above the UPDATE says:
> "If test rows exist in `orders`, also match the dimension: `and o.is_test = products.is_test`."

…but the SQL itself doesn't include it. Test rows in `orders` always exist on the shared Supabase project (every dev preview generates them), so the conditional is effectively always-true and should be hard. Today this is a low-risk scenario (env-strict reads/writes mean a live product shouldn't carry a test order), but the cutover is exactly the moment you assume the data is dirtier than the steady-state, so the join belongs in the SQL. **Concrete fix** (add to the EXISTS predicate):

```sql
update products p set quantity = 0
  where p.available = false and p.quantity > 0
    and exists (
      select 1 from orders o
       where o.product_id = p.id
         and o.is_test = p.is_test          -- HARDEN: match the env dimension
    );
```

And similarly add the EYEBALL-FIRST query's matching clause so the preview matches the apply.

### 5 — **Token literal-sweep maps `#222 → --c-accent`, but `#222` is the kind of near-black typically used for body text or topbar bg; a blind sweep can miscolor text** *(Design Addendum §4.1 :64)*

The sweep instruction enumerates: `#ddd→--c-border`, `#222→--c-accent`, `#666→--c-text-muted`, `#f7f7f7→--c-surface-2`. The current state at `admin/index.html:8-74` is "no CSS custom properties," `#222` is one of the hardcoded literals — but **what `#222` is USED for is contextual.** If it's the topbar bg or a primary button bg, `--c-accent` (slate blue `#3a4a63`) is right. If it's body text, the correct target is `--c-text` (`#1c2530`). A `sed`-style pass would miscolor everything `#222` is applied to without distinction.

**Fix:** Rewrite the sweep instruction to be applied PER DECLARATION, not per literal — i.e., "for each rule, pick the token that matches the property's role (text uses `--c-text`, surface fills use `--c-surface*`, accents use `--c-accent`)." Better: enumerate the small set of CURRENT rules the builder will touch and show NEW token assignments for each, instead of leaving the cardinal mapping to a sweep.

### 6 — **Lottie `defer`-ordering assumption depends on `homepage.js` ALSO being loaded as `defer`; the doc treats this as confirmed but never quotes the actual `<script>` tag's attributes** *(Design Addendum §5.1 :241)*

`defer` scripts execute in document order before `DOMContentLoaded` **only relative to other `defer` scripts**. If `homepage.js` is loaded synchronously (`<script src="…">` with no `defer`/`async`), it runs at parse time, BEFORE the lottie tag is evaluated — and `window.lottie` is `undefined` when `homepage.js`'s `DOMContentLoaded` handler fires. The init code's `if (… !window.lottie) return;` then silently leaves the static `<h1>`, which the test addendum item 30's "blocked/404 JSON → static `<h1>` still shows" case would actually pass — so the test would NOT surface the misconfiguration. The Lottie animation just never runs.

**Fix:** make the builder confirm the current `homepage.js` `<script>` attributes at `index.html:89` before applying. If it's synchronous, the new lottie tag must be inserted with `defer` **and** the `homepage.js` tag must be changed to `defer` too (or both moved to the bottom of `<body>`). The doc should embed the current 1-line `<script>` tag verbatim as a byte-anchor (the CURRENT pattern WS1-3 uses) so the builder doesn't proceed past a mismatch.

### 7 — **Hero swap CSS assumes `.hero h1` is a descendant selector; if it's `.hero > h1` (direct child), wrapping the `<h1>` in `<div class="hero__title">` breaks the rule and the static fallback loses its font-display/size** *(Design Addendum §5.1 :274)*

The reasoning "`.hero__title-text` inherits `--font-display`/`--text-5xl` because `.hero h1` rule still matches" assumes a descendant selector. The doc notes the fallback in case the rule's tokens get renamed but doesn't note the case where the selector is `>`-direct-child. A `>` selector would stop matching after the wrap, and the static `<h1>` would lose its hero styling — visually identical to the Lottie case (it'd just look bad in reduced-motion / no-JS / load-fail).

**Fix:** either explicitly include the bare `<h1>` style guarantee as a hardcoded CSS rule on `.hero__title-text` (the doc already suggests this as a fallback if the tokens are renamed — promote it to "ship it regardless, so the wrap can't break it"), or instruct the builder to quote the current `.hero h1` selector before applying.

### 8 — **P0 "back-nav" and `#product-subtabs` lack byte-anchored insertion points; two builders will not put them in the same place** *(Design Addendum §4.2 P0 :89-116)*

The P0 spec provides:
- The `<div class="subtabs" id="product-subtabs">…` markup ✓
- `productState`, `matchesProductFilter`, `wireProductSubtabs` JS verbatim ✓
- "call once from init/attachEventListeners" ✓
- "In `renderProductList`, filter the already-fetched list…" ✓

…but does NOT provide:
- **Where in `admin/index.html`** to insert `#product-subtabs` (only "mirroring the orders subtabs at `:243-256`" is given, which is a pattern, not a slot).
- **Where in `admin/index.html`** the back button mounts (the editor header is referenced as the place but not located).
- **Which line in `renderProductList`** to swap `products` → `shown`, and whether the existing `.empty` rendering already handles `shown.length === 0` (the doc treats it as assumed).

The "executable design" rule allows non-byte-anchored markup, but P0 is explicitly flagged as "parity/usability — do first," i.e., load-bearing for the North Star, not pure visual. The rest of WS4 can be render-tune; P0 should be byte-anchored like WS1-3. **Concrete fix:** add the two CURRENT/NEW blocks (the products tab section + the `openEditor` header) so the builder applies, not decides.

### 9 — **P4 "skeleton states" ships CSS only; the JS rendering point is left to the builder** *(Design Addendum §4.2 P4 :202)*

The spec gives:
- `.skeleton` CSS + `@keyframes shimmer` + `prefers-reduced-motion` carveout ✓
- `.empty` and `.status-msg.error` token classes ✓
- "Orders loading is bare text (`admin.js:651`); products has no loading state (`218-232`)" — locations, but no replacement.

So the CSS lands, but whether the builder actually emits `<div class="skeleton">…</div>` placeholders during fetch (and how many, and where) is unstated. The likeliest outcome: the builder leaves "Loading…" as-is and styles it with `.skeleton` only nominally — defeating the purpose. **Fix:** at least one CURRENT/NEW for `renderProductList`'s pre-fetch path showing skeleton-card emission, since it's a behavioral change, not a render-tune.

### 10 — **Test addendum doesn't enumerate runtime prerequisites for the headline test (3 live test products + the GPT re-pointed at the dev preview + Stripe `charge.refunded` subscribed)** *(Testing Addendum preamble + items 1, 3, 32-35)*

The "Where" block mentions Stripe test mode, SSO off, Preview key, and `charge.refunded` subscription (good — F11 is concretely addressed at T2·5). But:

- The **headline multi-cart test (item 1 + #3)** assumes **3 different live test products** to put in one cart. If the dev preview's catalog is empty or has only one live product, the test can't run. Add a "before-you-start: seed three test products" line, or point at the existing seed script if one exists in the repo.
- The **GPT runs against the dev preview** assumes the GPT's Action server URL + Production-equivalent auth has been temporarily swapped to the Preview URL + Preview `PRODUCT_API_KEY`. This is a 2-minute manual step in the Custom GPT builder UI, but it's nowhere in the addendum. A future cold tester won't know to do it and will run the GPT tests against production by mistake.
- The **`is_test`-prefixed CDN assertion** (cross-cutting invariants) silently assumes the preview is `VERCEL_ENV !== 'production'` — true, but stating it would help.

**Fix:** add a "Before you start" block to the testing addendum with the three runtime preconditions enumerated as checkboxes.

### 11 — **Refund panel will open for an order with no `stripe_payment_intent`; the submit then 409s** *(IMPLEMENT Phase 1.5b/1.5c — the Refund button condition)*

The button visibility check is `order.status === 'refunded' ? <pill> : <button>`. There's no second clause for `!order.stripe_payment_intent`. A legacy order missing the PI (unlikely on a healthy db, but the handler explicitly guards against it with a 409) would show the button, open the panel, fail at submit. UX is fine (an error msg appears) but it's a free polish to suppress the button when no PI exists. **Fix:** `order.status === 'refunded' || !order.stripe_payment_intent` → render a quiet "no payment to refund" tag instead of the button.

### 12 — **Phase 2.2d normalization mutates `body.expires_at` without a CURRENT/NEW for the body type declaration; the builder has to find it themselves** *(IMPLEMENT Phase 2.2d :855-861)*

The instruction is "add `expires_date?: string` to the request-body type" — but the existing inline type for `body` in `handleCoupon` (around `products.ts:694-739` per the verified I/O contract) is not quoted. The change is small (one field on an inline type), but every other byte-anchored phase quotes both sides. This is inconsistent with the standard the plan sets for itself. **Fix:** add the CURRENT block — the line declaring `body`'s type — and a NEW with `expires_date?` added.

### 13 — **The `--c-neutral-bg`/`--c-neutral-tx` tokens used by `.pill.refunded`, `.pill.archived`, `.pill.available` are introduced in §4.1 but the design addendum's P2 mapping table doesn't explicitly say they're new** *(Design Addendum §4.1 :42 vs §4.2 P2 :119-128)*

The §4.1 token table declares them; P2 uses them. A builder applying only WS1 (which uses `.pill.refunded`) before WS4 would see the class style not resolve. The doc notes this implicitly ("WS4 restyles with tokens") but a fresh agent reading the WS1 phases independently might wonder why a `.pill.refunded` class exists with no rule. **Fix:** A one-line note at the WS1 phase: "the `.pill.refunded` class is styled in WS4 P2; until then the pill displays with the generic `.pill` rule (functional but visually plain)."

### 14 — **The refund composer confirmation extracts the piece title via `.split(' — ')[0]`, which truncates titles containing the same em-dash-with-spaces delimiter** *(IMPLEMENT Phase 1.5d, `submitRefund` confirm builder)*

The label HTML is `${title} — $${amount}` (em-dash + spaces). `split(' — ')[0]` is the FIRST half. A product titled `"The Loft — Special Edition"` would split into `['The Loft', 'Special Edition', '$50.00']` and the confirm reads "Refund <buyer> $X for The Loft" (truncated). The Stripe refund itself is unaffected — only the human-facing confirm — but it could mislead Em on a product she might otherwise notice was wrong. **Fix:** stash the title on the checkbox as `data-title="…"` at render time and read it from the dataset on submit. ~3 lines.

### 15 — **Phase 6.1's `EYEBALL FIRST` preview query is in a comment, not separated as a runnable step; a builder who applies the migration via the Supabase CLI's normal `db push` skips the preview entirely** *(IMPLEMENT Phase 6.1 :1318-1328)*

The preview SELECT is embedded as a `--` SQL comment block. It's not enforced as a step. For Em's qty-1-only catalog this is fine (the cutover is a no-op on multi-stock). For the template "User" scenario (the Sean directive), a sold multi-stock piece would be incorrectly zeroed without preview. **Fix:** lift the preview into the test addendum's static-gate sequence as an explicit step — "run the SELECT, eyeball the rows, then run the migration" — so it's harder to skip than a comment.

### 16 — **Per-zone upload errors in P3d render to `.zone-msg` (per-zone) instead of via `setStatus` (global), so two simultaneous zone uploads' errors don't conflict — but the spec also says "reuse `setStatus`/a zone `.zone-msg`"; the `or` is ambiguous** *(Design Addendum §4.2 P3d functional rules :139)*

The given JS `wireUploadZone` writes to `msg = zoneEl.querySelector('.zone-msg')` (per-zone). The functional rules say "(reuse `setStatus`/a zone `.zone-msg`)" — listing both options. The JS picks the second. Two builders reading the rules differently could land global vs per-zone error rendering. The JS skeleton is the authoritative answer; the rules text should match. **Fix:** strike `setStatus/` from the rules paragraph, since the skeleton uses `.zone-msg`.

### 17 — **Test addendum #21's "controls round-trip" SEEDS via Supabase Studio or the GPT, but the GPT's instruction never tells it to set `controls:false`** *(Testing Addendum item 21 + 3.9 MEDIA instruction)*

The MEDIA instruction offers TWO options (autoplay/click-to-play); `controls:false` is the implicit third state that neither surface drives toward. The seed via GPT would require Em to tell the GPT explicitly "set this clip's controls to false" — which she has no reason to ask for unless she's running this test. The seed via Supabase Studio is a manual SQL edit — fine for the tester. Mark it explicitly as the Studio path, not "or the GPT" (the GPT can't be readily directed there). **Fix:** strike "or via the GPT `editProduct`" from item 21's seed step, since the GPT instructions don't expose `controls`; only Studio.

### 18 — **The 3.9 instructions cap is HARD at 8000; this build leaves 474 bytes of headroom, and Findings #2 (~178 chars) + #3 (~+1 char) would consume ~179 of them, dropping headroom to ~295** *(IMPLEMENT Phase 3.9, the hard cap reminder)*

Not a finding per se — a notice for the build. The fix for #2 is necessary; #3 is cheap. After both, ~295 bytes of headroom remain. The cap-discipline note in the doc ("any future instruction add must re-verify wc -c") is correct and should be reiterated whenever a fix lands.

---

## Parity matrix — the North Star spot-check

| Capability                                                     | /admin          | GPT                                | Notes                                              |
| -------------------------------------------------------------- | --------------- | ---------------------------------- | -------------------------------------------------- |
| Create product (full field set)                                | ✓               | ✓                                  | settled                                            |
| Edit product (live fields: price, available, quantity)         | ✓               | ✓                                  | settled                                            |
| Edit product (staged fields: copy, SEO, photos, media)         | ✓               | ✓                                  | settled                                            |
| Publish / discard / archive / unarchive                        | ✓               | ✓                                  | settled                                            |
| List orders + mark shipped                                     | ✓               | ✓                                  | settled                                            |
| Coupons (create / list / end + product scope + min/cap/expiry) | ✓ (WS2)         | ✓                                  | parity closed                                      |
| Refund (amount-based, multi-piece, goodwill)                   | ✓ (WS1)         | ✓                                  | parity closed                                      |
| Refund relist (both-axes restore)                              | ✓ (WS1)         | ✓                                  | parity closed                                      |
| Inventory decrement on sale (multi-stock viable)               | n/a (sale path) | n/a                                | WS6 hidden plumbing                                |
| Photo upload — attach in chat                                  | n/a             | ✓ (WS3)                            | by design (admin = drag/drop)                      |
| Photo upload — drag/drop or file picker                        | ✓ (P3d zones)   | n/a (GPT can't pick files locally) | by design                                          |
| Photo upload — by-link                                         | ✓ (existing)    | ✓ (existing)                       | settled                                            |
| **Video upload — attach in chat**                              | n/a             | ✗ **GAP**                          | **Finding #2 — GPT will mis-route attached video** |
| Video upload — by-link                                         | ✓               | ✓                                  | works                                              |
| MP4 / YouTube media flags (autoplay/poster/alt)                | ✓ (P3c)         | ✓                                  | parity closed                                      |
| MP4 `controls:false` SET (not round-trip)                      | ✗ (no toggle)   | ✗ (not in MEDIA instruction)       | symmetric niche; not a parity gap                  |

**Net:** Findings #2 is the only true parity hole. The other Findings are self-containment / execution-correctness issues.

---

## Design-correctness — does it RENDER cleanly?

- **WS4 — admin polish.** The §4.1 token system is concrete and complete. P0 (Findings #8), P3d (Finding #16), P4 (Finding #9) are the three places the executable-design bar leaves too much to interpretation. P2's per-state pill CSS is concretely emitted (round-4 fix landed). The token-sweep mapping (Finding #5) is the one place a blind apply will visibly damage the admin.
- **WS5 — homepage.** §5.1 Lottie has two latent fragilities (Findings #6, #7) the test won't surface; both fail-safe (the static `<h1>` still shows) but defeat the feature. §5.2 HyperFrames is content-creation + render-tune, correctly framed. The versioned-key R2 swap is concrete; the three URL edits are byte-anchored.
- **WS3.7 admin media UX** is byte-anchored. The structured editor's `data-controls` round-trip is preserved cleanly (the round-4 fix is exactly right). The 7-role regex covers all the roles enumerated in AR #37.

---

## "If you fix one thing"

**Add the attached-video routing line to the 3.9 GPT instructions (Finding #2).** It's the only finding where the load-bearing failure mode is silent (the GPT happily uploads, the server happily processes, the URL silently lands in `images[]`, the page silently breaks) AND directly punctures the North Star (Em can't manage media equally well in chat). Everything else is either caught by a gate (Finding #1 — the static gate fires), fail-safes to graceful (Findings #6, #7, #11), or is render-tune polish.

Finding #1 is #2 in importance — it'll just fail the static gate immediately, so the builder catches it on minute one and trims. Worst case the build pauses for 60 seconds.

---

## Verdict

**NEEDS ANOTHER PASS.** Two real blockers (#1 fails the explicit static gate; #2 silently breaks the page rendering for an attached-video case). Both are small text edits in already-handled files. After those land, the remaining items (#3-#18) are self-containment polish + design execution-correctness — defensible to fold into a build with active reviewer attention, but a clean "READY TO BUILD" would prefer them addressed.
