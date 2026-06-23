# v3.1.3 — Gap Review A (cold / out-of-repo, max-effort)

**Reviewer angle:** cold, no repo. Read all four docs end-to-end. Lens = (a) North Star: every management capability equally drivable in /admin AND the GPT; (b) the broader build — self-containment, design correctness, anything the v3.1.3 delta should address but omitted. Flag-don't-assert when the call depends on runtime behavior I can't see.

**Re-validation against the round-3 rejections — these are NOT in my list (I checked and they were correctly rejected):**
- coupon ops are opaque-200, so `expires_display` on the wire is visible without a schema edit ✓
- `authorize()` is at the top of `upload.ts:118` POST, before the JSON fork — chat-attach IS gated ✓
- hero CSS tokens (`--font-display` `:51`, `--text-5xl` `:63`) exist; the round-2 "missing" call was wrong ✓
- per-order Refund is now amount-based with `relist_product_ids` — not over-refunding ✓
- `record_sale`'s `unnest`/`count(*)` is correct given the cart dedupe invariant ✓

**One more myth checked + confirmed not-a-finding:** CORS preflight for the new POST on `/api/orders/:id/refund`. /admin and /api are **same-origin** on the Vercel preview deployment (one host serves both), so the browser never preflights. The GPT calls server-to-server (no CORS). Not a finding.

---

11 findings, ranked by derailment likelihood:

HIGH — 8000-char cap likely fails the static gate, contingency is invent-not-apply. Math on the concrete CURRENT/NEW blocks: ~+930 net after Phase 3.9 trims → ~8711, over by ~711. The plan's only recourse is "trim ORDERS/MEDIA until green" — a builder being asked to discover and decide, exactly what exclusively-executable forbids.
MODERATE — 1.4a REFUNDS instruction omits id: on editProduct inside the relist loop. Schema requires id; instruction expects inference. /admin's relistPiece is explicit; GPT path isn't.
MODERATE — WS6 cutover zeroes quantity for manually-paused (not sold) pieces. update products set quantity = 0 where available = false and quantity > 0; silently overwrites owner intent on case-2 rows.
MODERATE — .pill.refunded is named but never given a CSS rule. Used by 1.5b + Testing item 1; status pills are behavior, not pure aesthetic.
MINOR-MODERATE — Full-amount goodwill refund flips status via webhook anyway. Contradicts the GPT instruction's implicit promise; testing item 7 doesn't cover this branch.
MINOR — endOfDayET is brittle on toLocaleString format. Works on V8/Node 20 today; format isn't ECMAScript-mandated.
MINOR — Lottie init doesn't handle async parse-success/render-empty. F15 catches sync throw; not case 3 (blank hero).
MINOR — /admin upload zones don't prompt for alt text; GPT now does. Soft parity gap on accessibility content.
MINOR — Testing item 21's controls === false round-trip has no seed step. Likely no-ops on the dev preview.
VERIFICATION — relist[] shape unverified (acknowledged by the plan). Suggest adding a multi-piece GPT path to item 3.
MINOR — STORE doc's "sale doesn't decrement" lines (:614, :709) contradict WS6 mid-build. One-line callout to STORE now avoids parallel-reader confusion.

Single most important fix: Pre-compute the actual wc -c of the assembled GPT-instructions file after all edits — if over 8000, write concrete ORDERS/MEDIA byte-anchored trims now, not at build time. Every other finding is a small-edit cleanup; this is the only one where failure forces invention.

Verdict: NEEDS ANOTHER PASS 

Primarily for #1 (with #2, #3, #4 folding into the same pass). The amount-based refund composer, WS6 atomicity, chat-attach auth, and coupon multi-select are all correct. The remaining work is focused cleanup, not architectural surgery.Presented filePresented fileOne quick note on what I deliberately did NOT flag (in case you wonder): I almost wrote up CORS preflight on the new POST /api/orders/:id/refund as a high finding — then realized /admin and /api are same-origin on the Vercel preview, so the browser never preflights, and the GPT goes server-to-server with no CORS at all. Documented this in the doc's preamble so future-me doesn't re-flag it.

---

## Findings, ranked by likelihood of derailing the build or leaving a capability missing

### 1. **HIGH** — The 8000-char GPT-instructions cap is likely to FAIL the static gate after WS1–3 edits + Phase 3.9 trims; the contingency is invent-not-apply.

**Where:** `IMPLEMENT.md` budget callout (after the Invariants) + Phase 3.9; `ADDENDUM_TESTING.md` static gate.

**What's wrong:** The plan says the file is 7781/8000 today, the WS1–3 instruction adds are "≈ +1086" for v3.1.2 + "more" for round-3 (amount-based REFUNDS + multi-piece + partial-success clause in 3.5a/b), and Phase 3.9 reclaims "≈ 500+ chars." Rough arithmetic on the concrete CURRENT/NEW blocks shown:
- 1.4a REFUNDS swap: CURRENT ~520 chars → NEW ~1050 chars → **+~530**
- 1.4b poster aside: **+~30**
- 2.3 COUPONS: CURRENT ~560 → NEW ~840 → **+~280**
- 3.5a step 3: CURRENT ~520 → NEW ~970 → **+~450**
- 3.5b LINK TROUBLE: CURRENT ~330 → NEW ~470 → **+~140**
- 2.2e schema (different file, no impact on instructions cap)
- 3.9a/b/c trims: **-~500 combined**

That's **net +~930**. From 7781 → **~8711**. The static gate fails by ~711 chars. The plan's only recourse is "ORDERS/MEDIA carry further compressible repetition, trim there too until green." That sentence is the entire spec — a builder is asked to discover which sentences are repetition and rewrite them under deadline pressure (an open invitation to delete a distinct rule).

**Why this is the build's biggest exclusively-executable hole:** every other Phase shows CURRENT→NEW byte-anchored blocks; this one ends in "trim until green" and leaves the actual surgery to whoever runs `wc -c`. The same rule that protected WS1–3 (no discovery, no decision) doesn't hold here.

**Concrete fix (pick one):**
- **(a, preferred)** Add a Phase 3.9d/e/f: two more CURRENT→NEW edits to ORDERS and MEDIA in the trimmed instructions file, pre-computed to net another 700+ chars. The same compression pattern (fold repetition, keep every distinct rule) used in 3.9a/b/c.
- **(b)** Reconcile against an actual current copy of `v3_3_0_GPT_INSTRUCTIONS_TRIMMED.txt` and publish the post-edit `wc -c` count in the plan — if it's < 8000, the math above is wrong and the gate is fine; if it's > 8000, do (a).
- **(c)** If neither, downgrade the cap to a soft gate with explicit owner approval — but that's a policy change, not a fix.

---

### 2. **MODERATE** — The 1.4a REFUND instruction omits the `id` parameter on `editProduct` inside the per-piece relist loop.

**Where:** `IMPLEMENT.md` Phase 1.4a NEW (the REFUNDS block in `v3_3_0_GPT_INSTRUCTIONS_TRIMMED.txt`).

**What's wrong:** The relevant clause reads:
> "Yes -> unarchiveProduct if archived AND editProduct {available:true, quantity: quantity + 1} (both if both)."

`editProduct` requires `id` (the Supabase product id). The GPT is iterating `relist[]` where each entry has `product_id`. The instruction expects the GPT to infer "use the current loop entry's `product_id` as the id" — that's a reasonable inference, but it's an inference. Exclusively-executable instructions name the variable. The schema declares `relist[].product_id`, and `unarchiveProduct` per-loop similarly needs an id — same omission. (Contrast 1.5c `relistPiece` in /admin which is explicit: `body: JSON.stringify({ id: r.product_id })`.)

**Concrete fix:** Tweak 1.4a's relist clause to read:
> "...for EACH entry r ALWAYS offer to restore the unit — down (r.available false or r.archived) "Put it back up for sale?", else "Add 1 to its available quantity?". Yes -> unarchiveProduct {id: r.product_id} if r.archived AND editProduct {id: r.product_id, available:true, quantity: r.quantity + 1} (both if both)."

Char cost: ~50. Folds into the same Phase 3.9 budget reconciliation (finding #1).

---

### 3. **MODERATE** — The WS6 cutover data-fix zeroes quantity for *every* `available=false` row carrying stock, including manually-paused (not sold) pieces — silent intent-loss.

**Where:** `IMPLEMENT.md` Phase 6.1 migration: `update products set quantity = 0 where available = false and quantity > 0;`

**What's wrong:** `available=false` has three causes today:
1. A sale set it false (the case the fix targets).
2. The owner manually pulled a piece off sale (left in stock for later) — e.g. she paused a piece during a photo redo.
3. A piece is unpublished/archived (the comment says these are "unaffected by relist anyway" — true, but they're still in the UPDATE's scope and get qty=0).

For case 2, the owner's intent ("I want to keep stock at 3, just don't show it") is silently overwritten. There's no notification — the owner sees qty=0 next time she edits. The plan's comment ("the owner can re-set its qty") accepts this, but doesn't surface it pre-apply.

**Concrete fix (pick one):**
- **(a)** Add a `select id, slug, title, quantity from products where available = false and quantity > 0;` as a step-0 to print before the UPDATE; require the builder to confirm with Sean/Em that none are intentional pauses, then run.
- **(b)** Scope the UPDATE to rows that *also* have an order referencing them: `update products set quantity = 0 where available = false and quantity > 0 and exists (select 1 from orders o where o.product_id = products.id);` — this excludes never-sold paused pieces.
- **(c, minimum)** Bolden the existing comment so the builder reads "this WILL zero stock on owner-paused pieces; ask first if there are any."

---

### 4. **MODERATE** — `.pill.refunded` is referenced by 1.5b (admin order card) and by Testing item 1 (`.pill.refunded — T3·3`) but never given a concrete CSS rule.

**Where:** `IMPLEMENT.md` Phase 1.5b (uses the class); `ADDENDUM_DESIGN.md` §4.2 P2 (names it but doesn't style it).

**What's wrong:** P2 says: *"the order-card 'Refunded' pill (IMPLEMENT 1.5b) uses it instead of reusing `.unsent`, which is semantically an email-not-sent state; T3·3"*. That tells the builder which class to *use*, but no CSS rule is shown — and the existing `.pill` rules are tied to the storefront statuses (live/draft/sold/etc.), not "refunded." So the builder applies the class name but the pill renders unstyled (or worse, inherits a misleading color).

WS4 is "executable-design = concrete default + render-tune," and the visual character is render-tune. But a status pill is *behavior, not pure aesthetic*: it's load-bearing for "is this order refunded at a glance." Concrete default is missing.

**Concrete fix:** In §4.2 P2, append the rule:
```css
.pill.refunded { background: var(--c-neutral-bg); color: var(--c-text-muted); }
```
The base `.pill { border-radius: var(--r-pill); padding: 3px 9px; font-size: var(--fs-xs); font-weight: var(--fw-semibold); }` rule is already specified in P2; only the modifier needs adding.

---

### 5. **MINOR-MODERATE** — Full-amount goodwill refund (`amount = full PI, relist_product_ids: []`) flips status to `refunded` via the webhook, contradicting the GPT instruction's implicit promise.

**Where:** `IMPLEMENT.md` Phase 1.1b handler comment + 1.4a GPT instruction; `ADDENDUM_TESTING.md` item 7.

**What's wrong:** The handler comment correctly notes "(relistIds empty = goodwill/partial, nothing returned → NO status flip, empty relist. A full-PI refund still flips every sibling order via charge.refunded.)" — so a full-amount goodwill refund DOES flip the order to `refunded` via the webhook, even with `relist_product_ids: []`. But:

- The 1.4a GPT instruction reads as if "goodwill/partial amount with nothing returned" is a clean status-preserving operation ("For a goodwill/partial amount with nothing returned: pass amount_cents + relist_product_ids:[]"). No warning about the full-amount-triggers-webhook edge case.
- Testing item 7 only tests a *smaller* amount: "type a smaller amount → ... the order status is unchanged." It never exercises the "type the full amount as goodwill, expect status to flip anyway" branch.

Real-world scenario: an upset buyer who *keeps the piece* but Em refunds the full purchase as goodwill. The order shows `refunded`, the piece stays `available=false` (already sold), and the relist prompt never fires. The owner might assume she still owes the buyer something because the order looks "complete."

**Concrete fix (pick one):**
- **(a)** Add one clause to 1.4a: "Note: if her goodwill amount equals the full purchase, Stripe will reflect a full refund — the order(s) will flip to refunded even with relist_product_ids:[]; tell her so before confirming."
- **(b)** Add a testing case to item 7: refund the full PI amount with `[]` → status SHOULD flip via webhook (don't assert "unchanged"); the relist prompt does NOT fire (no pieces marked).

---

### 6. **MINOR** — `endOfDayET` relies on `toLocaleString('en-US')` output being parseable by `new Date()` — works on V8/Node 20 but is brittle and undocumented.

**Where:** `IMPLEMENT.md` Phase 2.2a, the `endOfDayET` helper.

**What's wrong:** The function does:
1. `Date.UTC(...)` for the naive 23:59:59 instant
2. `.toLocaleString('en-US', { timeZone: 'America/New_York' })` to get the wall-clock string
3. `new Date(localized).getTime()` to round-trip → derive the TZ offset

Step 3 depends on `new Date()` accepting "M/D/YYYY, h:MM:SS AM/PM" as input. V8 has historically accepted this, but **ECMAScript only mandates ISO 8601**. The format produced by `toLocaleString` is locale + ICU-version dependent (leading zeros, comma vs no-comma, AM/PM vs 24h). On Vercel-current-Node-20 it works today; a Node upgrade could break it silently with no `tsc` warning.

This isn't a build-derailer — Vercel Node is pinned and tested — but it's a hidden time bomb that contradicts the plan's "no decisions left to runtime" ethos.

**Concrete fix:** Switch to `Intl.DateTimeFormat#formatToParts` for explicit numeric assembly:
```ts
function endOfDayET(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Get the offset (in minutes) for the date in question, in America/New_York.
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' });
  const parts = fmt.formatToParts(new Date(Date.UTC(y, m - 1, d, 23, 59, 59)));
  const offsetStr = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT-5'; // fallback
  const offsetHours = Number(offsetStr.replace(/^GMT/, '').replace('−', '-')) || -5;
  return Math.floor(Date.UTC(y, m - 1, d, 23 - offsetHours, 59, 59) / 1000);
}
```
Or, simpler: pin a small TZ library (`@date-fns/tz` ~3kB) and write `zonedTimeToUtc(\`${dateStr}T23:59:59\`, 'America/New_York').getTime()/1000` — but a new dep is a bigger change. The `formatToParts` form is decision-free.

---

### 7. **MINOR** — Lottie init handles synchronous throw (good) but not async fetch/parse failure that still fires `DOMLoaded`.

**Where:** `ADDENDUM_DESIGN.md` §5.1 Embed.

**What's wrong:** The init pattern:
```js
try {
  const anim = lottie.loadAnimation({ ..., path: '/assets/lottie/hero-title-writeon.json' });
  anim.addEventListener('DOMLoaded', () => el.closest('.hero__title').classList.add('has-lottie'));
} catch { /* sync throw → leave the real <h1> visible; F15 */ }
```

Three failure modes; only one is fully handled:
1. **Sync throw** (lottie library missing, etc.) — caught, h1 stays visible. ✓
2. **Async fetch 404** — `path` 404s → lottie fires `data_failed` (no `DOMLoaded`) → `.has-lottie` never added → h1 stays visible. ✓ (self-healing, but not explicit).
3. **Async parse success, render empty** — JSON parses, lottie fires `DOMLoaded` even though nothing visible mounts (e.g., a JSON with no layers, or a JSON authored against the Skia/Skottie subset that lottie-web can't render). → `.has-lottie` is added → real h1 is hidden → **blank hero**.

Case 3 is exactly what the §5.1 "Gotchas" warns about ("verify the final JSON once in lottie-web's SVG renderer before shipping"). That's a manual gate. A defensive listener would catch it without the gate.

**Concrete fix:** Add a `data_failed` listener for explicitness, AND inside the `DOMLoaded` handler, sanity-check that the SVG actually mounted shape content:
```js
anim.addEventListener('data_failed', () => { /* leave .has-lottie unset → static h1 stays */ });
anim.addEventListener('DOMLoaded', () => {
  const svg = el.querySelector('svg');
  if (svg && svg.querySelector('path, g')) el.closest('.hero__title').classList.add('has-lottie');
  // else leave the static h1 visible
});
```

---

### 8. **MINOR** — /admin upload zones never prompt for alt text after a successful upload; the GPT path does. Soft parity gap.

**Where:** `ADDENDUM_DESIGN.md` §4.2 P3d `wireUploadZone` (the success path: `addImageRow(body.url, '')`); contrast `IMPLEMENT.md` Phase 3.5a GPT instruction ("Write a short descriptive ALT for every image...").

**What's wrong:** Parity rule per the IMPLEMENT.md invariant: "every store-management capability must be equally doable via the Custom GPT chat AND the /admin panel." After upload:
- **GPT path**: instruction now requires it to write a descriptive alt for every image + thumbnail_alt before calling createProduct (3.5a NEW).
- **/admin path**: P3d's `wireUploadZone` calls `addImageRow(body.url, '')` — alt is empty. The row HAS an alt input the owner CAN fill in, but there's no nudge. So /admin happily ships products with blank alts unless the owner notices.

Not a publish-time blocker (`validateProductRules` doesn't require alt today, per AR#24). But it's a real parity gap — the GPT is held to a higher standard than /admin, on accessibility content of all things.

**Concrete fix:** Add to `wireUploadZone` after the successful `addImageRow`:
```js
const lastRow = $('p-images').lastElementChild;
const altInput = lastRow?.querySelector('.img-alt');
if (altInput) { altInput.focus(); altInput.placeholder = 'alt text — describe what\'s in the photo'; }
```
Or surface a coverage hint ("3 images need alt text") in the same vein as `#img-coverage`.

---

### 9. **MINOR** — Testing item 21's `controls === false` round-trip test needs a seeded product to be runnable; no seed step exists.

**Where:** `ADDENDUM_TESTING.md` item 21: "if any live product has a `media[i]` with `controls === false` on a click-to-play clip (no autoplay), open + Save it **without other edits**, reopen → assert `controls` is **still `false`**".

**What's wrong:** The test reads "if any live product has...". On the dev preview, with `is_test=true` data isolation, there likely is no such product. The test silently no-ops. The T2·1 round-trip fix (carry `controls` via `row.dataset.controls`) is real and the JS is sound, but the test never exercises it.

**Concrete fix:** Add a seed step to item 21:
> "Pre-step: if no live product has `controls: false` on an MP4 clip, create one in /admin first — upload an MP4 via the Video zone, in the structured editor leave Autoplay UNchecked, then directly in Supabase Studio set its `media[i].controls = false` (or use the GPT to set it via `editProduct`). Then run the round-trip test."

Or shorter: explicitly seed via the editor's `data-controls` attribute (the only path the JS specifically protects).

---

### 10. **VERIFICATION (not a bug yet)** — The `relist[]` shape from the 1.1b embed is unverified; a Supabase-client misalignment returns a malformed array, the prompt silently never fires, and `tsc` doesn't catch it.

**Where:** `IMPLEMENT.md` Phase 1.1b — the `products(id, slug, title, available, quantity, archived_at)` embed.

**What's wrong:** The plan correctly flags this in its own footnote ("verify the relist shape against a real multi-item refund response, not just `tsc`"). The PostgREST embed default is plural for FK-to-many, singular for FK-to-one. `orders.product_id → products.id` is FK-to-one, so the response *should* be `{ products: {…} }` (singular) — which is what the handler's row-typecast assumes. But the response shape under the service-role client can vary by how the FK is declared in the DB.

The existing `GET /api/orders` already reads `order.products?.title` (orders.ts:65 per the plan's anchor), so the singular shape IS confirmed by existing working code. **Probably fine.** The risk is small but worth surfacing in testing.

**Concrete fix:** Strengthen Testing item 3 to assert the GPT actually iterates `relist[]` (multiple entries) AND offers per-entry — i.e., a multi-piece refund in the GPT path. The current item 3 covers single-piece. Add a second pass: GPT refund of 2 sibling pieces → assert two relist offers (one per piece) → accept both. That implicitly verifies `relist[]` is well-formed.

---

### 11. **MINOR** — Phase 6.4 (STORE doc sync) is post-build, but during the build a builder reading STORE sees stale "A sale does NOT decrement quantity" — minor risk of confusion when applying WS6.

**Where:** `EVERLASTINGS_STORE.md` line 614 + line 709; `IMPLEMENT.md` Phase 6.4.

**What's wrong:** STORE currently asserts:
- ":614 — Sets each purchased product `available=false` (**`available` only; it does NOT change `quantity` and never touches Stripe**)"
- ":709 — `products.quantity` ... **A sale does NOT decrement it today** — every product is qty-1 (`miniature`)..."

WS6 inverts both. The DEV_RULES "As-built doc-sync" policy is correct (don't edit STORE mid-build to avoid mixed truth), but Phase 6.4 is the only sync point — between applying WS6 and updating STORE, a parallel reader sees the wrong invariant. The risk is the builder questioning their own WS6 edits ("wait, STORE says no decrement — am I doing this right?"). Minor friction, not a blocker.

**Concrete fix:** Add a one-line callout to STORE *now* (it's a pre-existing doc, edit allowed) at the top of "Flag reference" + the Purchase-Flow step (12): "**v3.1.x changes this**: see `archive/v3_1/v3_1_3_IMPLEMENT.md` Phase 6 (the WS6 inventory wave); the as-built sync happens at v3.1 release per DEV_RULES." Zero behavior change, but it pre-orients a parallel reader.

---

## The single most important "if you fix one thing" insight

**Pre-compute the actual `wc -c` of the assembled GPT-instructions file after ALL WS1–3 edits + Phase 3.9 trims. If it's over 8000, write the additional ORDERS/MEDIA byte-anchored trims now — not at build time.**

Every other gap in this list is a fix in the small (a comment, a CSS rule, a defensive listener, an `id:` token). The instructions cap is the only one where the failure mode is "the static gate fails AND the plan tells the builder to invent the fix" — which is exactly the discipline this whole gap-review process exists to prevent. Round-3 added real char-growth (amount-based REFUNDS, the partial-success clause); the trims that were sized to balance v3.1.2 are unlikely to balance v3.1.3. Verify the count, or close the loop with concrete trims.

---

## Verdict

**NEEDS ANOTHER PASS** — primarily for finding #1 (cap verification + concrete contingency trims). Findings #2, #3, #4 are quick byte-anchored fixes that should fold into the same pass. #5–#11 are minor polish that can ride along or defer.

The build is fundamentally sound — the amount-based refund composer (round-3's headline) is correctly implemented, WS6's atomicity is correct, the chat-attach path is correctly gated, the coupon multi-select is at parity. The remaining work is a focused cleanup pass, not architectural surgery.
