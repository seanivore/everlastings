# v1.5.5 — GAP REVIEW A (cold / out-of-repo, pass #5)

**Reviewer lens:** can Em do each thing *by chat, with the least friction* — and where she can't, does the
plan say so honestly with the lowest-friction path? Judged against the North Star, not doc-internal
consistency.

**Inputs:** `v1_5_5_IMPLEMENT.md` + `EVERLASTINGS_STORE.md`. No repository.

**Bottom line up front:** Architecturally this is sound and the landmines (1–18) hold — the price-rotation
failure ordering, the RLS self-checking `RAISE`, the `is_test` reasoning, the Studio-zombie note, the
`?_action=` routing, the 11/12 cap, and the complete Action set all check out, and the 24-item test plan is
real. It is **not** ready only because the plan contradicts *itself* on one field (`available`), ships one
buggy curl recipe, and leaves a few by-chat edges un-instructed. All cheap. **NEEDS ANOTHER PASS — narrow
(doc/instruction reconciliation, not architecture).**

---

**Verdict: NEEDS ANOTHER PASS — but narrow.** Nothing architectural is broken and the landmines hold. I tried to break it on the load-bearing claims and couldn't: the price-rotation failure ordering is correct on every throw path, the RLS self-checking `RAISE` is sharp, the `_action` routing and function hoisting are fine, the Action set is genuinely complete (`uploadImage` exists as a real `/api/upload` Action), and I confirmed against the store schema that `media` is a pre-existing column so the migration is right to omit it. The 24-item test plan is real, not theater.

It's not READY because of one self-contradiction and a few by-chat edges — all cheap:

1. **`available` contradicts itself.** The code, §1.3, §9.2, and test #23 all say marking-sold is *live immediately*. But §8.11's note and §9.5's curl bullet say it *stages until publish* — and §8.11 tells the builder to copy that wrong version into Em's how-to (`STORE_ADMINISTRATION.md`), while §10b says the opposite for the same file. The GPT will tell Em "done, it's sold" while her reference says it isn't. By the plan's own anti-fragility rule, a decision-shaped contradiction is a stop-and-fix.
2. **The `{available:false, quantity:0}` recipe in §9.5 is buggy** — `quantity:0` stages a stray draft, leaves the row stuck at "edits pending," and does nothing for purchasability. Should be `{available:false}` only.
3. **`quantity` gates checkout but stays staged** — the exact oversell trap the plan fixed for `available`, harmless for today's qty-1 miniatures but live the moment a `printable`/`storybook` (multi-qty) ships, and the GPT is told nothing.
4. **"Edit the Lavender Wreath" can dead-end** — a title with an apostrophe/ampersand produces a slug the GPT can't reconstruct → `getProduct` 404s with no instruction to fall back to `listProducts`.
5. **`sku` is "caller-supplied" in the plan but "auto-generated" in the store doc** — the GPT schema omits `sku` entirely and v1.4.9 works, so it must be DB-generated; allow-listing a caller `sku` is a latent unique-collision. Confirm and drop `'sku'` from `CREATE_FIELDS`.

**If you fix one thing:** make "which fields apply live vs. stage" one source of truth and propagate it to all five surfaces (code, admin note, curl protocol, GPT instructions, Em's how-to). That single inconsistency is Gaps 1–3 at once.

Separate from the build gaps — the **lens** flag worth your attention: photo-by-link is the dominant real friction (camera roll → Drive → share → copy → paste, ×7 per product). The plan handles the limit honestly but doesn't smooth it; two cheap moves (tell the GPT to accept several links at once; put the literal phone taps in `STORE_ADMINISTRATION.md`) move the metric the North Star actually optimizes. That's the part most likely to make a non-technical owner reach for DIY.

---

## What I could NOT fault (so the next pass doesn't re-litigate)

- **Self-containment of the code phases is genuinely high.** Every code edit quotes its CURRENT anchor and
  NEW block; the library behaviours the builder would otherwise have to recall are *asserted in-plan*
  (Stripe nests the full coupon on each promotion code; `promotionCodes.list` is async-iterable; `File` is a
  Node global; `Math.round` price round-trip is float-exact). Those are decisions made *for* the builder, so
  they are not gaps.
- **Price rotation is correct, including failure ordering** (create→write-DB→deactivate-old; every throw
  path leaves a buyable product). Landmine 3 / test #19 satisfied.
- **The capability set is complete and maps 1:1 to schema operations** — including `uploadImage` as a real
  `/api/upload` Action (landmine D1), `discardEdits` (9), origin-correct `preview_url` (11), auto-paginated
  `listCoupons` (12), and the `charge.refunded` branch (D2). Every column `DRAFTABLE` touches exists in the
  schema, and `media` is a pre-existing jsonb column (`EVERLASTINGS_STORE.md:989`), so the migration
  correctly omits it.

---

## Ranked gap list

Ranked by likelihood of derailing the build *or* leaving a capability un-driveable by chat.

### 1 — `available` "applies live" vs "stages": the plan contradicts itself, and the curl recipe is buggy
**Severity: HIGH (owner-facing correctness + a self-contradiction the plan's own rules forbid)**
**Location:** §1.3 line 160-162, PUT code 1313-1323, §9.2 line 3246, test #23 — all say `available` applies
**LIVE immediately** on a published row. But **§8.11's note (2914-2917)** and **§9.5's bullet (3366-3367)**
say the opposite: that un-checking Available + Save draft *stages* it ("not live until Publish"), and §9.5
hands the agentic/curl protocol the recipe `PUT {available:false, quantity:0}` described as "a draftable
field → stages, then publish."

**Why it matters (the lens):** §8.11 explicitly says *"the same note goes in `STORE_ADMINISTRATION.md`"* —
so the builder is told to copy the **wrong** behaviour into Em's primary how-to, while §10b (3419-3421)
correctly says mark-sold is *immediate*. Two of the plan's own instructions disagree about what to write in
the **same file**, and the GPT (§9.2) will tell Em "done, it's marked sold" (instant) while her reference
says it isn't live until she publishes. For a store whose thesis is "run it by chat," an ambiguous *"is this
piece actually unbuyable yet?"* is a real North-Star failure. The plan's anti-fragility rule ("a
decision-shaped contradiction is a plan bug → stop") makes this a stop-and-fix, not a nuance.

**Concrete fix:** (a) Delete the staging language in §8.11's note and §9.5's bullet; both must state
`available` goes live immediately (matching §1.3 / §9.2 / #23). (b) In §9.5, change the mark-sold recipe to
`PUT {available:false}` **only** — drop `quantity:0`: it stages a stray draft (quantity is in `DRAFTABLE`),
leaves the row stuck at "live · edits pending," and never affects purchasability anyway because
`available:false` already blocks checkout. (c) Confirm §10b's wording is the canonical one for
`STORE_ADMINISTRATION.md`.

### 2 — `quantity` stays staged while it gates purchasability — the same oversell trap the plan fixed for `available`
**Severity: MEDIUM (latent; masked by the current qty-1 catalog)**
**Location:** `DRAFTABLE` (1190) includes `quantity`; the published branch pulls out only `available` and
`price` to live (1317-1323). So `editProduct {quantity: N}` on a published row **stages** — it does not go
live until publish.
**Why it matters:** the plan's stated reason for making `available` live was that a purchase writes the live
row, so staging creates an oversell/undersell trap. `quantity` gates checkout identically
(`checkout.ts`: `(quantity ?? 0) < 1`) and is decremented by real purchases — so for any multi-quantity
`product_type` (the plan ships `printable`/`storybook` extensibility), staging `quantity` reintroduces
exactly that trap: Em restocks 0→3 by chat, the GPT says "done," but the piece stays unbuyable until she
publishes; or she lowers stock and the live count is stale. For today's one-of-a-kind miniatures (qty 1,
`available` does the work) it's harmless — but it's a live landmine the moment a multi-qty type ships, and
**the GPT is told nothing** to distinguish quantity from copy (§9.2 step 2 classifies only "copy/SEO" vs
"price").
**Concrete fix:** decide explicitly. Either (a) move `quantity` to the live-apply set beside `available`
(consistent with the stated rationale), or (b) keep it staged but add one line to §9.2 + §10b telling the
GPT/owner a quantity change isn't live until publish — and note the masking ("only matters once a
multi-quantity product_type ships") in Open Items so the next type-add doesn't ship the trap silently.

### 3 — "Edit the Lavender Wreath" can dead-end: slug-guess 404 with no `listProducts` fallback
**Severity: MEDIUM (a capability the docs imply but the GPT can stumble on — the exact thing the lens asks me to flag)**
**Location:** §9.2 step 1 (3240): *"when she names a specific piece, `getProduct` by its slug."* The slug is
`title.toLowerCase().replace(/ /g,'-')` — so a title with an apostrophe or ampersand ("Em's Lavender & Sage")
produces a slug the GPT cannot reliably reconstruct → `getProduct` 404s, and the instructions give **no
recovery step**. The GPT is likely to tell Em "I couldn't find it" rather than fall back to browse.
**Why it matters:** finding-a-piece-by-name is the front door to *every* edit/price/archive flow. A
non-technical owner names pieces in prose; a 404 with no fallback makes the by-chat path feel broken on
exactly the pieces with punctuation.
**Concrete fix:** add to §9.2 step 1: "If `getProduct` 404s, call `listProducts` and match her wording
against the titles, then use that row's id/slug — never report 'not found' without listing first." (One
sentence; mirrors how a capable agent would behave.)

### 4 — `sku` "caller-supplied" (IMPLEMENT) vs "auto-generated" (STORE): a latent uniqueness-collision and a wrong stated fact
**Severity: MEDIUM-LOW (not build-breaking; the GPT omits `sku`, so the DB default fires)**
**Location:** `v1_5_5_IMPLEMENT.md:1099` claims *"sku is not auto-generated (it's caller-supplied or
absent)"* and puts `'sku'` in `CREATE_FIELDS` (1056). `EVERLASTINGS_STORE.md:967` says `sku | Unique,
auto-generated`, and the GPT `createProduct` schema (2963-2994) has **no `sku` field at all** — yet
v1.4.9 GPT-create works, which is only possible if `sku` is DB-generated. So the IMPLEMENT claim is
factually inverted.
**Why it matters:** if `sku` is generated by a DB default/trigger, then allow-listing a *caller* `sku`
lets a stray caller (a future admin field, a curl call) override the auto value and risk a **unique
violation** — a real, if narrow, failure. And the plan's "every decision confirmed" ethos means a wrong
fact in a load-bearing anchor is a plan bug.
**Concrete fix:** confirm `sku`'s generation mechanism against `20260421000001_initial_schema.sql`. If
DB-generated (almost certainly), **remove `'sku'` from `CREATE_FIELDS`** and correct the line-1099 note. If
truly API-generated, then the GPT schema is missing a required field and *that's* the bug — but the working
v1.4.9 path says it isn't.

### 5 — `media` is consumed everywhere but never *confirmed* as pre-existing in the pre-flight
**Severity: LOW (verify — it does exist)**
**Location:** Phase 1 adds every other new column; the pre-flight anchor list (372) enumerates `products`
columns but doesn't name `media`; meanwhile `DRAFTABLE`, the admin `p-media` field (8.10), `populateMedia`
(7.1), the GPT schema, and test #9 all consume it. It **is** a pre-existing jsonb column
(`EVERLASTINGS_STORE.md:989`) — but a cold builder reading the IMPLEMENT doc sees a column used-but-not-
migrated and a v1.4.5 comment ("Track A hasn't shipped media-row fields yet", product.html:2468) and may
stall wondering whether to `ALTER`.
**Concrete fix:** one line in the Phase 1 / pre-flight section: "`media jsonb` already exists
(`20260421000001`); v1.5 only changes its *contents* shape and wires `populateMedia` — no `ALTER`." Removes
the only place the builder would have to leave the two docs to decide.

### 6 — Refund-by-chat is the one §1.10 capability that's guided-only — disclosed, but it's the notable North-Star gap
**Severity: LOW (honestly stated; confirm it's an accepted boundary)**
**Location:** §1.10 Refunds bullet (311-314): no GPT Action; Em refunds in the Stripe dashboard; full
refunds reflect via `charge.refunded`. The plan *names* the limit (which the lens permits).
**Why it's worth a line:** the North Star is "anything a capable agent could do" — and a capable agent with
the Stripe MCP *could* issue the refund. So this is the single capability that's clunkier-than-DIY by
design. Fine for v1 if deliberate; just confirm it's a conscious deferral (it reads as one) rather than an
oversight, and that §10b tells Em plainly "refunds are done in Stripe, and only *full* refunds show up in
order status."

### 7 — Preview-page Publish failure shows a generic message; the 409 "archived — resurface first" reason never reaches Em
**Severity: LOW (rare-edge UX)**
**Location:** `mountPreviewBanner`'s catch (2386-2390) sets a fixed string and never reads the response
body. The publish guard returns a specific 409 ("This product is archived — resurface it before
publishing", 1430-1436) for the stale-preview-of-archived case (test #18).
**Concrete fix:** read `res.json().error` on failure and show it when present, falling back to the generic
"…text Sean" line. Cheap, and it turns a confusing dead-end into a self-service one.

### 8 — `available` isn't change-detected on write (unlike `price`), so a no-op admin save reports `availability_updated:true`
**Severity: LOW (precision)**
**Location:** the price path gates on `updates.price !== current.price` (1290-1291); the availability path
applies whenever `available` is *present* and boolean (1317-1319). The admin's `buildProductPayload` emits
`available` on *every* save, so a pure copy edit re-sends the unchanged flag → `availability_updated:true`
in the response (harmless in the panel, which prefers the preview branch, but imprecise; the GPT path
escapes only because it sends changed fields).
**Concrete fix:** mirror the price guard — `if (updates.available !== undefined && typeof === 'boolean' &&
updates.available !== current.available)`.

### 9 — Test #22 (refund) presupposes `charge.refunded` on the *test-mode* webhook endpoint, not just prod
**Severity: LOW (operator note)**
**Location:** §4.7's note (2019-2021) and #22 call out enabling `charge.refunded` on "the Stripe webhook
endpoint." Stripe test and live mode have separate endpoints; #22 runs on the dev preview (test mode), so
the **test-mode** endpoint must have the event enabled or the test silently no-ops.
**Concrete fix:** add "(both test and live endpoints)" to the operator note so the gate can actually pass.

### 10 — `MIME_TO_EXT` contents and the `{role}-{slug}` R2 key format aren't quoted
**Severity: LOW (self-containment; mitigated)**
**Location:** the new URL-intake builds `new File([...], 'upload.${MIME_TO_EXT[fetchedType] ?? 'bin'}')`
(2153); the create validation's role detection relies on uploaded files being named `{role}-{slug}.ext`,
but the plan quotes that naming only for `checkout_image`/`seo_thumbnail` (2205), not `hero-`/`gallery-`.
Both are existing behaviours and the pipeline re-derives the final extension, so this won't break — but a
cold builder can't *prove* it from the doc.
**Concrete fix:** quote the `MIME_TO_EXT` definition and the R2 key line in the §5 anchor block (same way
`ALLOWED_MIME` is already quoted at 2213). Confirms `image/webp`→`webp` and `video/mp4`→`mp4` and that
hero/gallery files carry the role prefix the validator filters on.

---

## LENS NOTE (not a build gap — the friction that decides "GPT vs DIY")

**Photo intake by link is the dominant residual friction, and the plan states the limit without smoothing
it.** The structural constraint (an Action can't forward a pasted file) is real and honestly handled —
"paste a photo → ask for a link," Drive-share normalization, large-video fallback. But the realistic owner
flow is: a phone camera roll, 7+ photos per product, each needing upload-to-Drive → set "anyone with the
link" → copy → paste. That is the one place a non-technical owner may conclude DIY is easier. The plan
satisfies the lens's escape clause (it names the limit) — but two cheap smoothings would materially raise
"genuinely helpful":
- **Tell the GPT to accept several links in one message** and loop `uploadImage` over them (the instruction
  currently reads one-at-a-time: "For EACH photo… call uploadImage").
- **Give Em the exact phone steps in `STORE_ADMINISTRATION.md`** (iOS/Android: share a photo to Drive → tap
  "anyone with the link" → copy → paste). Right now §10b describes the *concept* of media-by-link, not the
  literal taps — and the literal taps are the whole friction.

Neither blocks the build; both move the needle on the metric the North Star actually optimizes.

---

## If you fix ONE thing

**Make "which fields apply live vs. stage" a single source of truth and propagate it to every surface —
code, the admin note, the curl protocol, the GPT instructions, and Em's how-to.** Today that boundary is
split: `available` is live in the code (§1.3 / PUT / §9.2 / #23) but *staged* in two of the plan's own
instructions (§8.11, §9.5) — including the note destined for Em's primary reference — and `quantity` gates
purchasability yet quietly stages. That one inconsistency is simultaneously the plan's only true
self-contradiction (a stop-and-fix by its own rules), the source of a buggy curl recipe (`quantity:0`), a
latent oversell trap for the next product type, and an owner-facing *"is this piece actually sold/in-stock
yet?"* ambiguity — the exact kind of doubt the by-chat thesis can't afford. Fixing it is a handful of edits
and it closes Gaps 1, 2, and (in spirit) the field-precision items at once.

---

## Verdict

**NEEDS ANOTHER PASS** — narrow. No build-stopping or architectural defects; the remaining work is
reconciling the `available`/`quantity` live-vs-staged story across the docs, fixing the `{available:false,
quantity:0}` recipe, adding the `getProduct`→`listProducts` fallback, and confirming the `sku` mechanism.
Fold these, re-run A to confirm nothing else surfaced, then proceed to B/C.
