# v4.0.9 — Claude Design handoff (admin/ UI batch)

**From:** Claude Code (repo `everlastings`, branch `dev`) · **To:** Claude Design · **Date:** 2026-07-08

This is a scoped batch of admin-panel UI work. Every item below lives in the `admin/` directory. Claude Code has already landed the backend + storefront half of this release (refund status model, Featured-live, the storefront preview bar) — see "What Claude Code already did" — and is now **paused on all `admin/` files** so you can pull them, build against a real data contract, and hand them back for a line-by-line integration review.

Sean's original testing notes are quoted verbatim under each item (the **"Sean's words"** blocks) so his intent + reasoning travel with the spec — you shouldn't have to ask him to re-explain anything.

---

## Workflow (unchanged from your last run — confirming so nothing drifts)

You already set this up earlier and it worked: pull the 11 real files from `everlastings/admin/` (branch `dev`) into your sandbox, mirroring the repo path 1:1 (`admin/products-app.js` ⇄ repo `admin/products-app.js`, no translation); add your `_sandbox-api.js` fake-backend shim + the one commented `<script>` line per HTML (both **SANDBOX ONLY — do not port**); `data.js` is the **SEAM** (port added helpers/fields, never overwrite the mock rows with real data or vice-versa). Your `admin/SANDBOX_NOTES.md` documents it.

- **Re-pull `admin/` from `dev` HEAD before starting.** Claude Code's v4.0.9 changes are all in `api/` + `assets/js/` — **no `admin/` file was touched** — so your 1:1 mirror is still current, but re-pull to be safe.
- **Build the items below**, expanding wherever the design wants to go further than the spec (that's encouraged — the fast prototype surfaces requirements we couldn't spec up front).
- **Hand back:** the changed `admin/` files (byte-identical drop-ins) + a **reverse-handoff** — `CHANGELOG_GAPS.md` (what you changed, per file, and why) + `OPEN_QUESTIONS.md` (anything that needs a backend answer). Claude Code then reviews every changed file line-by-line — not a mechanical safety check, but the hunt for backend work a UX change silently created — wires it, and tests on the live preview.

**Reference screenshots:** the images named throughout this doc (e.g. `v4-product-preview-media-1.jpg`) are **pasted by Sean in this chat** — they're gitignored, so you can't fetch them from the repo. Match each to its item by the filename.

**The data contract below is what you design against.** Design *to* it; don't implement the backend — that seam is what keeps the front end backend-aware but backend-untouching.

---

## What Claude Code already did (so you can rely on it)

- **Refund backend** (`api/orders.ts`): the refund endpoint now accepts a new `resolved_product_ids` array and flips the union of resolved + relisted pieces to a new order status **`'resolved'`** (off the shipping queue). Restock still keyed only to `relist_product_ids`. A full-PI refund still becomes `'refunded'` via the webhook.
- **Featured-live** (`api/products.ts`): toggling `featured` on a published product now applies **live** (no `draft`, no re-arm of the publish gate). This is the backend half of the "Featured forced a re-review" fix.
- **Storefront preview bar** (`assets/js/product.js`): the draft-preview top bar now shows exactly two meta images — **Thumbnail (16:9)** ← `seo_thumbnail` and **Checkout image (1:1)** ← `checkout_image` — at true ratios. The phantom "OG image (1.91:1)" and the redundant hero-as-"Thumbnail (4:5)" slots are gone. This is the *storefront* half of the naming unification; the *admin* half (renaming the chip) is item **M-1** below.

---

## The data contract (design to this)

### Contract A — Refund modal
- The modal POSTs to the refund endpoint with (all optional): `amount_cents` (int), `relist_product_ids` (string[]), **`resolved_product_ids` (string[], NEW)**.
- **Three independent per-piece choices** — none derivable from the others:
  - **Resolved** → send the piece's `product_id` in `resolved_product_ids`. Effect: the line leaves the shipping queue. No restock.
  - **Relist** → send it in `relist_product_ids` (existing). Effect: restock (back on sale). Relisting **also** implies resolved (you can't ship a piece you put back on sale), so the backend auto-includes relisted ids in the resolve set — the UI may reflect that (e.g. Relist visually implies Resolved) but doesn't have to.
  - **Amount** → `amount_cents`. Any value: partial, goodwill, full. Independent of both toggles.
- Response: `{ ok, status, relist: [...] }`. A resolved/relisted line's `status` comes back **`'resolved'`** (not `'refunded'`). Add a **"Resolved"** state to the per-piece status pill (`orders-app.js` `statusPill`, ~:68) so a `'resolved'` row reads truthfully. A `'resolved'` line shows only in the **All** tab (never Unfulfilled/Shipped) — the tab logic already handles that; no change needed there.

### Contract B — Media upload (`POST /api/upload`, multipart)
- One POST **per assigned role**, sent **on Apply** (not on drop). Each carries the file + a `role` field. Server crops per role and stores to R2 as `${role}-${slug}`:

| Role (chip)                 | `role` value      | Crop (aspect / width)                                              |
| --------------------------- | ----------------- | ------------------------------------------------------------------ |
| Hero                        | `hero`            | 4:5 / 1200                                                         |
| Gallery                     | `gallery-01`…`15` | 4:5 / 1200                                                         |
| **Thumbnail** (was "Share") | `seo_thumbnail`   | **16:9 / 1200**                                                    |
| Checkout                    | `checkout_image`  | 1:1 / 600                                                          |
| Video poster                | `poster`          | no upload (copies the chosen image URL onto each video's `poster`) |

- **The same image with multiple roles is uploaded once per role** (separate crops, separate filenames) — this already works and is correct; keep it. Example: a Hero+Thumbnail image → two POSTs (`hero-slug` 4:5 + `seo_thumbnail-slug` 16:9).
- The only change is **timing**: preview locally on drop (`URL.createObjectURL`), POST only on Apply.

### Contract C — Editor field states (the settled v4.0.0 taxonomy, restored)
The field rules were carefully specified during the v4.0.0 build (`v4_0_0_IMPLEMENT.md:99-105,:615` + `v4_0_0_ADDENDUM_DESIGN.md:43,:80-82`). The code drifted; this restores it.
- **Ring taxonomy:** `red` = required + empty/invalid (**blocks publish**) · `yellow` = edited text needing review before re-publish · `green` = required + valid.
- **3-tier field locks — "show locked, not missing" (chips visible the whole time):**
  - `sku` — **born-locked** (generated at create, never editable). Chip copy: **"Created automatically; cannot be edited"**.
  - `slug` — **locks on first persist** (`!!p.slug`); auto-generates from the title; immutable server-side. Chip copy: **"Locks after publish"**.
  - `checkout_name` / `checkout_description` / `checkout_image` — **lock at publish**, keyed on **`everPublished = !!p.published_at`** (NOT `is_published`, so a paused-but-once-published piece stays locked).
- **On-blur field generation** (see item F-1) writes into these fields' editable values before publish; the server fills any still-blank field at publish as a final fallback.

---

## The items

### R — Refund modal (`admin/orders.html`, `admin/orders-app.js`)

> **Sean's words:**
> "I opened this purchase and thought I was refunding to create a return of *both* items, but because there was only an opt in option to return the product to the shop, and because I didn't want to provide a full refund, the system assumed I didn't want to refund both items. … it creates a lingering order … in the shipping section, that does not need to be shipped any longer.
> We just need to add a specific checkmark or switch or whatever kind of opt in option, much like the option to re-list an item in a store, on the UI that denotes exactly which products of any purchase are being refunded when we use this refund flow but decide not to refund a full amount. … maybe it is 'RETURNED' … 'Returned or refunded' the toggle should probably say both in one switch just to cover all circumstances. … The order can simply be fully marked refunded and then moved to the 'All' tab."
> Follow-up decisions: "the money being any amount makes this ambiguous so … just like we have 'relist' we need a 'refunded or returned' … 'resolved' works." → **Label decided: "Resolved."**

**Build:**
- [ ] **R-1** In the per-item refund card (`orders-app.js` ~:227-240, beside the existing "Relist" toggle), add a **"Resolved"** toggle. Subtext/hint: *"No longer needs shipping."* Collect the checked pieces' `product_id`s and send them as **`resolved_product_ids`** in the refund POST (~:280) — see **Contract A**.
- [ ] **R-2** Add a **"Resolved"** pill to `statusPill` (~:68) so a `'resolved'` line reads truthfully (today it only knows refunded / shipped / needs-shipping).
- [ ] **R-3** (design polish) The refund modal is part of the editor/refund visual pass — clean up the layout so the three choices (amount · Relist · Resolved) read as clearly independent. Reference screenshots (pasted in chat): `v4-site-two-purchase-refund-gap-1.jpg` (the current lingering-order state), `v4-site-two-purchase-refund-gap-2.jpg` (the refund modal / Relist-toggle style to mirror).

---

### M — Media modal: timing, previews, naming (`admin/products-app.js`, `admin/products.html`)

> **Sean's words (naming):**
> "We **seriously** need to clear up the aspect ratios and naming for 'Thumbnail' images vs. 'Social' images vs. 'OG images'. … This additional 'OG' is … confusing … we have a thumbnail as well, and it just isn't an image role we call for in the media uploader. … We need to use strictly one type of language. … I lean towards thumbnail because that is what helps people to understand … that it is the only one that is actually NOT cropped to 4:5 … and it needs to be landscape." → **Term decided: "Thumbnail" (true 16:9).**

> **Sean's words (upload timing):**
> "these crazy little loading bars rather violently move from left to right across the Media modal preview images anywhere between 3 to 6 times before you can see any of the preview images. This *seems* like it is running the upload endpoint before the roles are even selected. … Here is how this should work:
> - The images should upload and be stated in the modal
> - The image cannot yet be uploaded to the endpoint
> - The user applies the roles they want to each image
> - Then, based on the image role, the images are sent to the endpoint so they can be edited, cropped down to the size their role comes from"
> Note: the multi-role-→-separate-crops behavior he worried about **already works correctly** (verified) — only the *timing* is wrong.

> **Sean's words (previews + filenames):**
> "these thumbnail previews of each piece of media are ALL SQUARE. We need them to respect the aspect ratio of the piece of media uploaded, for every upload … Currently, when you upload an image it just gives itself an 'Image #' name until you give it a role … Instead, we should preview a good chunk of the file name to help users identify which … I say 'good chunk' because we should be classy with it and show pretty much the same length of file name for all of the uploads."

> **Sean's words (create-flow media):**
> "When uploading the images the 'loading' bar on each image square is chaotic and not smooth at all … When you click apply it takes really long and it makes you not sure if it is working; can we have some kind of indicator that shows it is thinking."

**Build:**
- [ ] **M-1 — Rename "Share" → "Thumbnail"** (display only; the internal role/column stays `seo_thumbnail`). Locations: the chip in `ROLE_DEFS` (~:1038); the green role-label ("Share, Checkout image" → "Thumbnail, Checkout image"); the modal footer ("Share image required to publish — give any image the Share role" → "Thumbnail image required …"); the editor-media help text ("Share & checkout reuse the hero unless you give them their own image" → "Thumbnail & checkout …"). Reference images: `v4-product-preview-media-1.jpg`, `v4-product-preview-media-2.jpg`.
- [ ] **M-2 — Upload on Apply, not on drop.** On drop/select, show a **local** preview (`URL.createObjectURL(file)`) and hold the `File`; do **not** POST `/api/upload`. On **Apply**, POST once per assigned role (see **Contract B**). The per-role upload already exists in `applyMedia` (~:1170) — make it the *first* upload and drop the provisional on-drop `gallery-NN` POST (`handleFiles` ~:1142). For a pasted link (no local `File`), preview the URL directly and upload on Apply. This single change kills the "3-6× violent loading bars."
- [ ] **M-3 — Non-square previews.** `.mitem__thumb` is a forced 72×72 `object-fit:cover` (`products.html:280-281`). Respect each item's true aspect ratio (available from the local `File`'s natural dimensions once M-2 lands).
- [ ] **M-4 — Filename labels.** Capture `file.name` at drop (it's never stored today — `handleFiles` ~:1138) and show a consistent-length chunk of it, instead of "Gallery image N" / "Image #" (`computeLabels` ~:1011). Keep the role label too if it fits. Reference: `v4-media-modal-previews-1.jpg`.
- [ ] **M-5 — Apply feedback.** Add a "thinking"/progress indicator on Apply (and smoother per-image progress) so the maker knows it's working.

---

### V — Mobile media overflow (`admin/products.html`)

> **Sean's words:** "When creating a page, the media layout, after uploading images, extends far past the VW when on mobile." Reference: `v4-store-product-mobile-view-media-out-of-frame.jpg`.

**Build:**
- [ ] **V-1** `.media-cover` uses `132px 1fr` (`products.html:191`) — the classic CSS-grid min-content trap; change to `132px minmax(0,1fr)` and confirm `.ed-body` / `.media-center` don't also need `min-width:0`. Clean up the orphaned `.media-secondary` rules (~:227-229) while you're in there (the JS no longer emits that class).

---

### P — Preview-to-publish gating (`admin/products-app.js`)

> **Sean's words:**
> "the 'you must preview the image before you can publish it' is intended *ONLY* for the first time the product is being published. If there are any updates … then all that they need to do is open the accordion … and hit the PUBLISH button again. … The one product I simply switched from 'not featured' to 'featured' and nothing else … made me review the changes. It is a toggle that I don't even need to expand the accordion to change. … if I have the accordion open and am editing the headline, then that suffices as my review before publishing again. The user does not need to leave the product and come back."

**Build:**
- [ ] **P-1 — First-publish-only gate.** The preview requirement should fire **only** for a never-published piece. Today the gate is `(!p.is_published || p.draft) && !p._previewed` (`publishBtn` ~:678, `actionsNote` ~:686) — the `|| p.draft` clause re-arms it for an already-published piece the moment it has any staged edit. Change it to key on **`everPublished = !!p.published_at`** and drop the `|| p.draft` re-arm: never-published + not-previewed → require preview; already-published with staged edits → **"Publish changes"** enabled directly (editing in the open accordion *is* the review). The Featured case is already handled by Claude Code's Featured-live change (no draft is created), so this P-1 change covers the remaining "accordion edits shouldn't force a re-preview" ask.

---

### F — Product-creation fields (`admin/products-app.js`, `admin/portal.css`)

> **Sean's words (generation + preview):**
> "The auto-prepared product fields need … to actually be helpful for users. This means they have to be able to get the generated materials while they're creating the post so that they can edit them … The auto generated fields left blank … need to be seen in this view [the preview top bar]." (Reference: `v4-preview-page-top-bar-missing-text.jpg` — all four read "(not set — falls back to the page copy)".)
> His intended create-flow order:
> "5. User clicks out of the title field and the following should be immediately generated but still editable … Slug / Checkout name / Checkout description
> 7. User clicks out of the description field and these should be immediately generated but still editable … SEO Title / SEO Description"

> **Sean's words (locks + tooltips + glow):**
> "SKU field's 'LOCK' … says 'Locks after first publish' and should instead say 'Created automatically; cannot be edited' — Slug field is missing a 'LOCK' and should say 'Locks after publish' — The i information notes that auto-fill don't need to say 'if left blank' … an ideal user will see the populated text and then edit it — The i information notes have a million m-dashes … these should all be very simple and concise and direct — The 'Schedule publish' option is available even after the product is published which doesn't make sense.
> Price … We need this field to glow the same color as the other required fields before they are typed into, particularly because it is easily missed — Dimensions … glow the same color … The little i info viewer should remind the user that they need to add 'inches' or the symbol \" … or 'feet' or the symbol ' — Materials, features, care instructions, shipping details … All STAY RED after entering text … should lose the color after text is added and the user first clicks away — All of the locks that show up later, should be present the entire time."

**Build:**
- [ ] **F-1 — On-blur generation** (there is no client-side generation today; the fields only fill server-side at publish, which is why the preview reads "(not set…)"). On **Title** blur → generate **slug**, **checkout_name**, **checkout_description**; on **Description** blur → generate **seo_title**, **seo_description**. Populate the editable field values and persist so the storefront preview bar shows them. Formulas mirror the server generator: `slug = slugify(title)`; `checkout_name = title`; `checkout_description = description || headline`; `seo_title = title`; `seo_description = description`. Stay editable until publish (the server fills any still-blank field at publish as the final fallback). Field render anchors: Slug ~:621, Checkout name ~:623, Checkout description ~:626, SEO title ~:624, SEO description ~:625.
- [ ] **F-2 — Required-glow wiring.** **Price** (~:599) and **Quantity** (~:600) are hardcoded `ring:"green"` — wire to `ring(k, true)` so an empty required field glows **red**. **Dimensions** (the wrapping `.field` at ~:634) has **no `data-ring` attribute at all** — add `data-ring="${ring('dimensions', true)}"` (mirror the Weight field at ~:640, which is correct) so it can glow red when empty.
- [ ] **F-3 — Stuck-red fix (list fields).** Materials / Features / Care / Shipping (`listField` → `data-list` textareas) never clear their red — the ring-update handler is wired only to `data-field` inputs (`bindField` ~:830-834, bound at ~:698); the `data-list` input handler (~:700-704) calls `setEff`/`refreshGate` but never updates `data-ring`. Wire the `data-list` handler to update its field's `data-ring` too (empty+required → red, else green), so red clears on input like every other required field.
- [ ] **F-4 — Locks: always-visible + correct key + copy.** Switch the editor lock condition from `p.is_published` (~:585) to **`everPublished = !!p.published_at`** so a paused-but-once-published piece stays locked, and show lock chips the whole time ("show locked, not missing"). Fix the copy: **SKU** chip → "Created automatically; cannot be edited" (today the generic `lockChip` at ~:517 says "Locks after first publish", contradicting SKU's own tip); **Slug** → add a lock chip reading "Locks after publish" (missing today).
- [ ] **F-5 — Tooltip copy rewrite** (inline `tip:` / `tipI(...)` strings, ~:599-644). Drop every "if left blank" / "Auto-filled if left blank" (SEO title ~:624, SEO description ~:625) — the ideal user sees the prefilled text and edits it, so the tip should just say what the field is. Strip the em-dashes; make each tip short + direct. **Dimensions** tip → remind the user to include inches (`"`) or feet (`'`). Keep tips factual and plain (not chatty).
- [ ] **F-6 — Schedule publish visibility.** The "Schedule publish…" button (~:655) always renders. Gate it on publish-**readiness** (the required-field gate) and hide it for a clean published-no-draft piece — per `v4_0_0_IMPLEMENT.md:615` ("offer Schedule only when the piece passes the required-field gate; subsumes the clean-published-no-draft case → Schedule stays hidden").

---

## What we expect back (reverse-handoff)

1. The changed `admin/` files, byte-identical drop-ins (your `_sandbox-api.js` + commented `<script>` lines stay SANDBOX-ONLY — not ported; `data.js` = SEAM).
2. **`CHANGELOG_GAPS.md`** — per changed file, what changed and why, mapped to the item IDs above (R-1, M-2, F-3, …).
3. **`OPEN_QUESTIONS.md`** — anything that needs a backend answer or a decision. Likely candidates: whether on-blur generation should also persist for an already-published piece's staged edits (F-1 edge); whether the "Resolved" pill needs a distinct color from "Refunded"; any new field/state the media-modal redesign wants persisted.

Claude Code then reviews every changed file line-by-line (the hunt for backend work the UI created), wires the backend side, tests on the dev preview, and reconciles the docs. Then dev → main on Sean's sign-off.
