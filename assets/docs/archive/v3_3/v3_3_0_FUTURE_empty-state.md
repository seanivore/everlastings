# FUTURE spec — replace the placeholder-product fallback with a real empty-state

> **Not part of the v3.3.0 build.** Standalone "what's needed" spec to fold into a later exclusively-executable IMPLEMENT — deliberately kept OUT of the v3.3.0 execution guide. The v3.3.0 executor should ignore it.

## Current behavior (the "why is the live site showing fake products" finding)

The public pages ship with **hardcoded "Track B" sample cards baked into the static HTML**, used as a never-empty fallback:
- `index.html` Featured Havens (~`:200-250`) — "Placeholder Haven I / II", "Placeholder Book Nook" with gradient images + prices.
- `shop.html` grid (~`:230-275`) — the same sample cards (one carries a "SOLD" badge).
- `product.html` (~`:30`, `:155-383`) — a full hardcoded placeholder product page.

On load, the JS fetches **published products for the current environment** and *replaces* these tiles. The env split is the `is_test` flag: `/api/config` derives it from `VERCEL_ENV` (`api/_lib/env.ts:2` → **production = false, preview = true**), `main.js:16` sets `window._isTest`, and `getProducts()` / the slug fetch query `…eq('is_test', window._isTest).not('stripe_price_id','is',null)` (`main.js:60`, `:74`). When the fetch returns **zero** products, the JS **leaves the hardcoded tiles visible** on purpose:
- `homepage.js:45` — *"Leave Track B's fallback tiles visible if no live featured products yet."*
- `product.js:416` / `:437` — *"leave Track B fallback visible" / "Track B's hardcoded list is a great fallback."*

**Net effect:** production currently has **zero live (`is_test = false`) products**, so the fetch returns nothing and the baked-in placeholders stay — the public site shows fake priced cards. Dev/preview shows the real `is_test = true` test products because its fetch succeeds and paints over the tiles. Clicking a placeholder briefly flashes `product.html`'s hardcoded content, then the live-slug lookup returns null and the page bails (the "flash then empty" effect). **This behavior is intentional and code-commented, but undocumented in `EVERLASTINGS_STORE.md`** — it self-resolves the instant a real live product is published.

## The change wanted

Showing fake "Placeholder Haven I — $245" cards (and a SOLD badge) to a real visitor isn't right for a live storefront. Replace the hardcoded fallback with a proper, on-brand **empty-state**.

1. **Remove the hardcoded placeholder product cards/tiles** from the three pages — the Featured Havens cards in `index.html`, the grid sample cards in `shop.html`, and the placeholder product body + its related-cards in `product.html`. (Keep all non-product content: hero, about strip, story, footer.)
2. **Render a real empty-state when the products fetch returns 0** for the current env (the same zero-results branch that today "leaves the tiles"):
   - **Homepage Featured Havens** (`homepage.js:41-46` empty branch): a quiet, on-voice line in place of the carousel — e.g. *"New havens are on their way."* (hide the carousel UI gracefully, keep or soften the section heading).
   - **/shop grid** (`shop.js` render, empty branch): *"No havens are available right now — new pieces are being made by hand."* + a notify path.
   - **Notify path:** Sean's note was "maybe email admin@ if they want." Recommended: lean on the **existing newsletter signup** (the Firelight Council form already sits on every page and already captures email — `api/subscribe.ts`), since that's the built "tell me when there's something" channel; add a plain `mailto:admin@everlastingsbyemaline.com` as an explicit secondary option. (Reusing the newsletter avoids building a second capture.)
   - **`product.html` direct hit** (stale/shared link, or a placeholder slug): when the live-slug lookup returns null, route to a proper not-found — redirect to `/shop`, or a quiet *"this haven has found its home"* / *"nothing here just yet"* message — to kill the flash.
3. **Design it on-voice** — quiet, grief-comfort tone; it's brand surface, not a stock 404.

## Considerations

- **Self-resolving + dev-safe:** the empty-state only renders on the zero-results branch, so the moment Em publishes a live product it's replaced by real cards (unchanged mechanism). On dev/preview, the test products still load and nothing changes — only the "truly zero products for this env" case is affected.
- **Low urgency (Sean's framing):** little/no public traffic expected pre-launch; Em previews the work via the **dev preview URL** (Vercel preview SSO is intentionally left OFF until the project is complete), so the live empty page is a rare-visitor concern, not Em's showcase path. Half the site is product pages anyway — the empty-catalog window is short once products go live.
- **Avoid a flash of nothing:** decide whether to ship the empty-state markup hidden (revealed when the fetch returns 0) or render it from JS — pick whichever keeps the page from flickering an empty product region on first paint.
- **Document it at the as-built:** capture both the old fallback behavior *and* the new empty-state in `EVERLASTINGS_STORE.md` — this whole finding is an example of a deliberate runtime behavior that lived only in code comments (like the keep-alive cron). Notable empty-state / fallback behaviors belong in the store doc, not just the code.
