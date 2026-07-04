# _RATIONALE — Content Creator Portal redesign (v4.0.0)

> **What this is.** The design *why* behind decisions in `v4_0_0_IMPLEMENT.md` — the reasoning that would otherwise clutter an exclusively-executable build guide. **You do not need this to build.** The IMPLEMENT already carries every decision; open a section here only when a step is genuinely unclear and you want the "why." Nothing here is a build instruction.

---

## §1.2 — Redirect `/admin` → `/admin/products`, not rename `products.html` → `index.html`

Renaming `products.html` to `index.html` (so bare `/admin` serves it directly) would make `/admin/products` 404 and break `mountShell`'s `products` active-key symmetry with `${k}.html`. A **rewrite** serving `admin/products.html` at the URL `/admin` also fails — the shell's relative `data.js`/`portal.css` would resolve against base `/` and 404. A **redirect** lands the browser on `/admin/products`, where base dir `/admin/` makes every relative asset resolve, and keeps all four routes symmetric with the markup verbatim. `permanent:false` (307) keeps the landing relocatable later.

## §1.3 — Why the env chip is hostname-derived, not server `isTest`

`PORTAL.env()` reads `location.hostname` so the Test/Live chip is decided purely client-side, matching the real deploy topology (prod custom domain `everlastingsbyemaline.com`; everything else — `*.vercel.app`, localhost, `file://` — is Test). The server's own `isTest` (from `/api/config`, driven by env-scoped Stripe keys) is the source of truth for the Account card's key display; in the normal Vercel env-scoping topology the two always agree. If a preview were ever mis-scoped to live keys, the chip follows hostname by design — a preview URL is never "Live" to the eye.

## §2.7 — Why the strict publish gate stands for every piece (no grandfather, no backfill)

The expanded `validatePublishRules` re-runs on republish and the Available OFF→ON round-trip, so in principle a piece published under the old looser rules could 400 for fields it never had to carry. The decision is that the strict gate stands for **every** piece — no grandfather clause, no backfill — because there are **no live pieces yet** (the catalog is empty), so nothing predates the strict rules, and products were always intended to carry the full set. The concern therefore shifts from *rescuing legacy pieces* (moot — none exist) to **forward collection**: every create path gathers the full publish set so a maker never hits a confusing publish-400. That's why the GPT schema flags the publish-required fields (WS10 §10.1c), the admin docs carry the set (§10.6), and the `commitAvail` ON seam surfaces the 400 as a field-list toast rather than a silent no-op.

## §2.7a — Why checkout identity is frozen, and the deferred "Reissue" feature

`syncProductToStripe` short-circuits on an existing `stripe_product_id`, so a post-publish edit to `checkout_name/description/image` would stick in the DB but never reach Stripe — the site would show a new checkout name/image while Stripe still charged under the old one (a silent site↔Stripe desync). So those three fields freeze for the life of the piece; only the Stripe checkout snapshot locks — storefront `title`/`story_card`/`images`/`price` stay fully editable. The one legitimate reason to change a locked checkout name/image (Em repaints a slow seller a new color and it needs a new title) is a deliberate **future "Reissue checkout identity" feature**: its own control + a "this changes the Stripe catalog" confirm, growing `stripeSync`'s short-circuit into an update path that writes Stripe and the DB in lockstep. Out of scope for v3.x to keep Stripe-catalog writes rare and intentional.

## §6.2 — Why the series filter realigns nav slugs to the catalog, not the reverse

The shop's series taxonomy is reconciled by deriving the filter options from the live catalog and realigning the nav/footer `?series=` deep-link slugs to match — not by hardcoding the catalog's series names into the code. Hardcoding names would force a per-project rename every time this template ships for another client; making the nav a **derived view of the catalog** is what reuse requires, so a future client's series names auto-propagate without editing the build guide.

## §9 — Why no raw "Buy Now" / "Add to Cart" on tiles

The grid-buy-button conversion evidence is commodity-e-commerce data (fast, low-consideration, restockable SKUs) and does **not** transfer to one-of-a-kind, emotional, $200–500 art. For unique pieces the **product page is the conversion engine** — the story, the gallery, the single-piece scarcity all live on the PDP, and "fewer clicks to buy" is a debunked premise for high-consideration emotional purchases (the decision isn't friction-limited, it's conviction-limited). A tile-level buy button would let a shopper purchase *before* the story does its work, and it clutters the grid's calm. So the small effort goes to **information scent** instead — a generous full-tile tap target (already delivered by the single card-wrapping `<a>`) and a "One of a kind" scarcity badge (WS9 §9.2) that pulls the buyer *into* the piece rather than short-circuiting the journey. Scarcity for unique inventory is a proven lever; a grid buy button is not.

<!-- APPEND-NEXT-RATIONALE-HERE -->
