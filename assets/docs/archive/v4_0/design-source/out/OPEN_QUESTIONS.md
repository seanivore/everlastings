# Open Questions & Sync Notes — reverse handoff

**From:** the Claude Design staging of the Creator Portal (`out/`).
**To:** the Claude Code integration team + Sean.
**Companion docs:** `CHANGELOG_GAPS.md` (what we changed + PORTABLE/SEAM tags),
`INTEGRATION.md` (the integrator's gap list), `PRODUCT_LIFECYCLE.md`, `data-flow.md`.

This is the **reverse channel** to `INTEGRATION.md`: not "things the integrator must build,"
but the questions, confirmations, and **files** that — coming back to us — let us finish or
sharpen the design here and keep the two copies in sync. See §6 for the end goal (parity).

> **Context — two separate environments.** This design work lives in a **sandboxed Claude
> Design project**: a self-contained staging workspace that is **not** the live git repo and
> has no automatic connection to it. So throughout this doc, **"here" / `out/`** = the sandbox
> staging copy, and **"there" / the project directory** = your live directory. Nothing moves
> between them on its own — sync happens only by **explicitly copying files across** (that's the
> whole point of the PORTABLE/SEAM tags and the parity goal in §6). Paths like `out/…` describe
> *our* layout inside the sandbox; map them onto wherever the equivalent file lives in the repo.

---

## 1. Files we'd like sent back (highest leverage)

We only have the **admin** surfaces here. Two live-site files would let us represent the real
experience instead of pointing at it:

1. **The live storefront product page** template.
2. **The preview / review bar** — `assets/js/product.js` → `mountPreviewBanner` (the canonical
   publish-from-preview UI our Publish gate leads into; see `CHANGELOG_GAPS.md` #2/#3).

*Why:* with these we can mirror/port the real **publish-from-preview** experience into `out/`,
so what a creator sees when they preview a new product is staged here too (it's a nice page —
worth having represented). **Note:** `INTEGRATION.md` §3.2 framed the product page as a *bug
to fix* (fields in the editor not shown on the live page, on the theory some products lack
fields). Sean's word: no products are missing fields, so that concern is moot — the request
here is for **parity/representation**, not a bug fix.

---

## 2. Decisions we've locked (please reflect / confirm)

- **Noun: backend standardizes on "product"** (not "pieces"). The **front-end / marketing**
  word is the **client's** call — keep it flexible in display copy. (Resolves the recurring
  "Pieces vs. Product vs. a generic noun" question from `feedback/FEEDBACK_v1.md` #4.3 / #5.5.)
- **New product *types* are out of scope for this contract** — a new type needs new schema plus
  its own value/detail types. Tie-in: when new types *are* eventually added, that same schema
  work must also revisit **how "SOLD" items are tagged and organized in the DB** — because the
  current dedicated **Sold** tab only stays coherent while every product is one-of-a-kind (one
  row, one lifecycle bucket). Full reasoning + the target model ("Sold" becomes an
  `archive_reason`/flag, inventory stays a number, per-type sell-out policy) is in
  `CHANGELOG_GAPS.md` → *Architecture note*. **Action for the build guide:** file this SOLD-
  tagging change as a dependency of any future product-type work.

---

## 3. Reminders to verify (we believe these are handled — please double-check)

- **Media-upload backend.** The backend was already updated to accommodate the redesigned admin
  media uploader. Everything the uploader offers was already possible / GPT-submittable **except
  gallery-image number/position ordering**, which is the one genuinely new capability. (The
  *old* admin uploader was the "functional-but-lazy" one flagged in `INTEGRATION.md` §3.10; the
  new one simply surfaces variables that already existed.) **Please confirm every necessary
  change landed — especially persistence of gallery image position/order** (`p.images` order =
  hero first, then gallery 1..N; the editor reorders by pointer-drag).

---

## 4. Still open / needs info

- **Discount links — broaden beyond coupon codes.** Store-wide coupon cards already have a
  "Copy share link." We also need a way to generate **shareable, pre-applying links** for
  **unique / single-person / one-time-use discounts** and for **any emailed offer**. A shopper
  should not have to remember and hand-type a code at checkout — that isn't the norm on other
  stores. *Need from backend/storefront:* what the storefront reads to pre-apply a discount
  (a `?code=` / `?coupon=` querystring, a Stripe Checkout Link, or the promotion_code_id), and
  whether one-time codes can be minted as links. (Extends `INTEGRATION.md` §3.12.)
- **Seen/unseen order tracking (§3.9).** The nav blink still has no data source. A last-viewed
  timestamp (or equivalent) would let us design the "mark seen" affordance that clears it.
- **Env / deploy hostnames (§3.1).** Confirm the preview vs. prod hostnames so the Test/Live
  chip (`PORTAL.env()`) reads correctly.
- **Refund semantics (§3.11).** Confirm the arbitrary-amount + Stripe-merged + separate-relist
  behavior we designed matches the real flow.

---

## 5. Ask back to the integration team

**Are there other gaps you've addressed** (in your own gap review / build guide) that we should
**mimic or improve upon** here? If so, send the updated code/files and we'll reconcile —
adopting yours where it's cleaner, improving where ours is. The aim is one shared, best version
of each file, not two drifting ones.

---

## 6. The end goal — parity between this staging and the live directory

The point of this project is to be a **staging mirror** of the live directory: a place to fix
bugs and make improvements in a fast design loop, then hand Claude Code **exactly** the files
needed to update production — ideally as **drop-in** replacements.

For that to work we want, from the integration side:

1. **File parity where possible.** Get the same set of files in both places close enough to be
   **byte-identical**, so a fix made in one can literally be copy-pasted into the other. The
   more we understand the **touch-points (the seams)**, the more files we can make truly modular.
2. **A clear PORTABLE vs. SEAM map.** We tag every changed file (see `CHANGELOG_GAPS.md`):
   - **PORTABLE** — pure front-end (`portal.css`, `portal.js`, the `*.html` shells, the
     `*-app.js` logic). Safe drop-in; should converge to identical on both sides.
   - **SEAM** — the design/backend boundary (`data.js` here = mock arrays; real API responses
     there). Its *logic/shape* ports, but the data layer never gets overwritten wholesale.
   Please tell us if any other file should be treated as a seam, or if a "portable" file has a
   hidden backend touch-point we've missed.
3. **Record-keeping of which version is where.** Some lightweight version/record system so we
   always know which copy of which file is current in each place (a manifest, checksums, a
   version header — whatever you already use). Without it, "drop-in" quietly rots into "drifted."
4. **Any other documents we'd need** to hit this. If there's a file map, a schema doc, an
   env/deploy doc, or a contract we're missing, send it — the fewer unknown touch-points, the
   more of the codebase we can keep genuinely in sync.

**In one line:** we want to get these two copies to the point where they're the same, so fixing
a bug or shipping an improvement is just *copy from one, paste to the other* — with a shared,
written understanding of the few files where that isn't safe and why.

### Concrete first pass we'd suggest

Before anything else, **diff our files against yours, line for line.** Take the `out/` set here
as the current reference and:

1. Confirm you **have everything we currently have** — same files, and for the PORTABLE ones,
   the same contents (our gap fixes in `CHANGELOG_GAPS.md` are all in here).
2. For anything **present here but not there** (or newer here), decide how to **fold it in** —
   drop-in for PORTABLE files; adapt-to-your-data-layer for anything touching the SEAM.
3. For anything **present there but not here**, send it back so we can mirror it (see §5) and we
   stay a true staging copy, not a partial one.

The output of that pass is the shared baseline everything after can sync against.
