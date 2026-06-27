# Reference legend — keep / kill / target

Sean's annotated screenshots. Three render concepts were produced (#1 controls, #2 editor, #3 pieces); **#1 is the keeper, #2 and #3 are anti-patterns.** Red marks = "remove / wrong"; hand-drawn rings = "do this instead." Two Webflow shots show the target *layout* (rows + simple forms) — ours will be brighter, color-coded, and more considered.

## Keep / refine — from #1 `controls.html` (the aesthetic anchor)
- **`vCCP-1-1.jpg`** — the aesthetic that works: typography, spacing, blending, containers. **Match this.**
- **`vCCP-1-2.jpg`** — the title field truncates ("The Lantern-Keeper's W…") and the price field is oversized (red X). → wide-enough fields, no hidden text, no wasted width on short values.
- **`vCCP-1-2-example.jpg`** — New York Times mobile: the **target font scale** — small and dense. Mobile type should look like this, not the big current fonts.
- **`vCCP-1-3.jpg`** — kill the "Live now / Waiting" **text tags** (X'd); encode state as a **colored ring on the field border** instead (green = valid/required-met, yellow = edited-needs-review, red = blocking publish).
- **`vCCP-1-4.jpg`** — the helper text under fields should become a **tooltip on the field heading** (hover desktop / tap mobile), keeping the field area clean.
- **`vCCP-1-5.jpg`** — the **Available toggle** is great; keep it. It belongs on the product row *and* pinned at the top of the expanded editor.
- **`vCCP-1-6.jpg`** — good direction, needs cleanup (per Sean).
- **`vCCP-1-7.jpg`** — the **navigation is "picture perfect"** — reuse it as the portal's nav.
- **`vCCP-1-8.jpg`** — push the pills further: **no words at all.** Green = live, red = draft, yellow = needs-publish; sold/archived go to tabs, not color.

## Keep one thing — from #2 `editor.html`
- **`vCCP-2-1.jpg`** — the **Featured toggle** (the single salvageable idea). Put it on the product row alongside Available.

## Kill — anti-patterns (do NOT replicate)
- **`vCCP-2-2.jpg`** — fields crammed into nested components / dropdowns-inside-cards. You have a whole page — give fields clear space and obvious labels instead.
- **`vCCP-2-3.jpg`** — bad mobile: wasted space, poorly laid-out text, the over-far color labels. Mobile must be perfect.
- **`vCCP-3-1.jpg`** — the **product tiles**: the biggest thing to avoid. A product is a **row**, not an image tile.

## Target layout — Webflow CMS (structure only; ours is brighter + color-coded)
- **`vCCP-example-all-products-rows.jpg`** — All Products = **one row per product**, columns for the details. Ours adds the state LED, inline price edit, Available/Featured toggles, archive. (Ignore the excessive "Published" green and the zoomed "Export" — those are tutorial artifacts.)
- **`vCCP-example-fields-expanded-product-entry-row.jpg`** — expanding a product = **simple, well-spaced form fields**; media shown as **small thumbnails you click to open the asset** (CDN link, new tab). No oversized fields, no nested widgets. (We don't need their rich-text formatting — our content is precise.)
