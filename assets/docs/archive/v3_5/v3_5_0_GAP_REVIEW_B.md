# v3.5.0 — Gap Review · Angle B (fidelity, repo + docs)

**Scope.** Open every file the three docs edit; verify each **CURRENT** block byte-matches the working tree (line numbers are hints — the quoted text is the anchor), and each **NEW** block applies cleanly + references only things that exist. Special focus: the shared-file edit coordination (ledger 25-27) and the DESIGN addendum's DECIDED blocks vs `design-handoff/out/`. Classify the ~24 NEEDS-VERIFY flags (repo-resolvable → resolved here, vs genuine build/runtime/deploy). Nothing changed.

**Headline.** The build is **byte-faithful**. Every byte-anchored CURRENT block I opened — across the six backend files (`products.ts`, `orders.ts`, `product-feed.ts`, `checkout.ts`, `webhook.ts`, `upload.ts`), the storefront JS/HTML/CSS, the schema/RLS migrations, and all the `out/` design surfaces — matches the tree exactly. The DESIGN addendum's six state-token values are byte-identical in `portal.css` (the authority). No silent byte drift anywhere. The only real findings are in the **shared-file merge/re-anchor seams** the coordination section already warns about, plus one stale doc-internal contradiction. Every flag below is co-design (a place the doc under-resolves), not a "the code disproves this" break.

---

## Ranked findings (by likelihood to derail the build)

### 1. `api/product-feed.ts` — the merged service-role client ships under TWO names; a literal apply makes two clients. (ledger 26) — **HIGHEST**
Both edits anchor on the **same** CURRENT `:1-7` block and both re-include the shared import + publishable-client region:
- **WS2 Phase 2.6** NEW declares `const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, …)` and its helper `publishDueScheduled` calls `admin.from('products')…`.
- **WS7 Phase 7.3a** NEW declares `const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, …)` and its helper `reconcileOrders` calls `supabaseAdmin.from('orders')…`.

Applied literally, both NEW blocks land → **two identical service-role clients + duplicated imports/publishable client** — exactly what ledger 26 forbids ("Define the service-role client **once**… do NOT create two clients"). The coordination *section* (IMPLEMENT §Shared-file, ~line 43) states the intent correctly, but **neither the phase text nor the coordination note names the surviving identifier**, so the builder must decide the name and rewire one helper. Both also edit GET's top (2.6 prepends `await publishDueScheduled(req)`; 7.3c prepends the `if (isCronRequest(req)) await reconcileOrders()` gate) — those two insertions must be merged after the single `export async function GET(req: Request) {`.
- **CURRENT `:1-7` verified byte-exact** (publishable `supabase` client). GET-top CURRENT `:18-24` (2.6) and `:18-19` (7.3c) both match.
- **Fix:** in the merged file define ONE service-role const (pick a name, e.g. `supabaseAdmin`), rename `publishDueScheduled`'s `admin.*` references to it, take WS7's superset of imports (`stripe`, `isTest`, `sendEmail`), and combine both GET-top insertions.

### 2. `api/products.ts` — two WS8 CURRENT anchors are pre-WS4 snapshots that go stale once WS4 lands first. (ledger 25) — **MEDIUM**
The fixed order is WS2 → WS4 → WS8, and the coordination section says "re-anchor each stacked edit," but two WS8 CURRENT blocks are quoted against the *original* tree:
- **8.1c(g) handleCoupon return (`:745-746`)** — CURRENT is `const promo = …create(promoParams);` immediately followed by `return jsonResponse(…)`. **WS4 4.1c inserts the supersede-sweep `if (autoApply) {…}` between those two lines first**, so the 2-line adjacency WS8 anchors on no longer exists. The `sale.create` log must be re-anchored to just-before the (now-relocated) return.
- **8.1d(b) handleActivityLog append point (`:836-838`)** — CURRENT is `}` + blank + `// ?_action=coupon_deactivate`. **WS4 4.2b inserts the whole `handleActiveSale` function between `handleCouponList`'s `}` and that comment first**, so this anchor now resolves to `handleActiveSale`'s tail, not `handleCouponList`'s (functionally fine — append after either — but the line hint misleads).
- **Not affected:** the GET-dispatch anchor `:70-71` (WS4 `active_sale` + WS8 `activity`) is **stable** — neither edits the coupon-list line, both insert around it, so both resolve cleanly. Verified all of: `:694-703`, `:735`, `:745-746`, `:831-836`, `:861-862`, `:915-916`, `:967-968`, `:258-262`, `:537-541`, `:566-570`, `:644-645`, `:685-686` byte-exact.
- **Fix:** annotate 8.1c(g)/8.1d(b) as "apply after WS4; re-anchor to the post-sweep return / post-`handleActiveSale` boundary."

### 3. WS1 boot-gate must wrap ALL terminal init statements, not just the named call. — **MEDIUM**
The Phase 1.5 pattern shows one call inside `.then()`, but two surfaces have multi-statement entries (verified in `out/`):
- **`sales-app.js`** — `:222` `mountShell` **+ `:223` `renderStoreWide()` + `:224` `renderCoupons()`** then `:225 })();`. Wrapping only `mountShell` leaves the two render calls painting for a **signed-out** visitor.
- **`orders-app.js`** — `:234` `mountShell` **+ `:235` `render()`** then `:236 })();`. `render()` must also be inside `.then()`.
- `products-app.js` `:807 render();` is the single terminal call — fine as written.
- IMPLEMENT `:410` NEEDS-VERIFY half-covers this ("reconcile the three entry anchors byte-for-byte"); the gap is the *pattern* only shows one statement. **Fix:** the `.then()` must enclose the full entry block (222-224 sales; 234-235 orders).

### 4. Alt-text gate — WS5 still poses it as an OPEN Sean decision, but WS2 already settled it as a hard server gate. — **MEDIUM (co-design contradiction)**
- **WS5 Phase 5.4a (`:1804`) + testing item 20 (`:65`)** say `validateProductRules` "checks … but **not** alt" and flag "make alt a HARD server gate, or keep client-only?" as unresolved.
- But **WS2 Phase 2.7** renames the validator to `validatePublishRules` and **adds** `'Every image needs alt text'` + `'Every video needs alt text'`, and **ledger 23** declares "Alt text is a HARD server publish gate" as SETTLED.
- So the WS5 flag is **stale/self-contradictory** — the decision is already made (alt IS server-gated at publish). Not a byte issue. **Fix:** strike the WS5 5.4a / item-20 open question and point to WS2 Phase 2.7 as the resolution (client gate = the friendly pre-check; server gate = the enforcer).

### 5. Series deep-link slugs likely won't match the grouped nav labels (data-dependent, soft failure). — **LOW-MEDIUM**
Nav/footer (in `_template.html` + every page) emit only **three** series links: `series=portals-to-peace`, `series=book-nooks` (label "Book Nooks & Story Lofts"), `series=seasonal` (label "Seasonal & Limited"). WS6 6.2 derives checkbox slugs from live `series` via `seriesSlug()`. If a product's real `series` is the grouped label (e.g. "Book Nooks & Story Lofts" → `book-nooks-story-lofts`), it will **not** equal the nav's `book-nooks` → the deep-link no-ops (shows all; no crash). IMPLEMENT `:2077` flags this correctly. The old hardcoded checkboxes had 5 slugs; the nav has 3 — they **already** diverged pre-build. **Fix (content/decision):** confirm live series are named so their slug matches the nav (or realign the 3 nav links); it's a soft failure either way.

---

## NEEDS-VERIFY triage (repo-resolvable → resolved; else classified)

**Repo-resolvable — RESOLVED here:**
- **1.1b `:153` (no build manifest bundles `admin.js`)** → RESOLVED. `package.json` has **no** build/bundle script (no-build vanilla project); the only `admin.js` reference outside `admin/` is the stale *comment* at `api/products.ts:392`. Deleting `admin/index.html` leaves `assets/js/admin.js` unreferenced. Safe.
- **WS3 auth Bearer `:919` + TESTING:26** → RESOLVED-by-doc. WS1 Phase 1.3b adds `PORTAL.authHeader()`; `requireAdmin`/`authorize` accept it. (Execution requirement: the wired calls must actually attach it — the helper is provided.)
- **`shipping_address` canonical `:1017` + TESTING:45** → RESOLVED. Top-level `orders.shipping_address` column exists (`initial_schema:109`), written by `webhook.ts:195`, returned by `orders.ts:65-66`; it carries **no** name (name = `customers.name`). This is ledger 14 — the "only nested" premise is wrong; the fallback edit is safe.
- **cart.html hooks `:1588`** → RESOLVED. Both `[data-cart-subtotal]` (`cart.html:170`) and `[data-cart-estimate]` (`cart.html:178`, the "Estimated total"/you'll-pay line) exist. 4.5i maps correctly; no single-hook fallback needed.
- **`?code=` share-link `:1605`** → RESOLVED. No storefront JS reads a `?code=` param (grep empty) → the prefill/apply is a genuine small **ADD** not yet built; correctly flagged for scope.
- **`auto_apply` param-name match `:3235` + TESTING:93** → RESOLVED. WS4 4.1a reads `body.auto_apply`, 4.1b writes `metadata.auto_apply='true'`, WS10 schema param = `auto_apply`. Self-consistent.
- **percent-only vs data-flow:146 `:3236`** → RESOLVED. `auto_apply`/struck is percent-only (ledger 17); data-flow:146 is the general coupon surface. Consistent.
- **hostname split DESIGN:116 / D.3** → RESOLVED (code). `portal.js P.env()` = `/everlastingsbyemaline\.com$/`; prod custom domain matches, previews/localhost read Test. Final flip is a deploy-topology confirm only.
- **`requireAdmin` returns a service-role client** (not a doc flag, but load-bearing for WS8): confirmed (`adminAuth.ts:27-31`, `SUPABASE_SECRET_KEY`). So WS8 8.2a's `site_config` **upsert bypasses RLS** (INSERT-on-first-write works despite no explicit INSERT policy), and `'user' in auth` cleanly discriminates JWT vs API-key actor per the `RequireAdminResult` union.

**Genuine build-time surface-logic (well-specified; the builder implements):**
- Schedule-offer gating `:614` (hide "Schedule publish…" on a clean published-no-draft row).
- Media re-role add/re-upload/remove **diff** `:1826` + TESTING:66 (the load-bearing modal seam — prevents a promoted image matching both `/hero-/` and `/gallery-/`).
- Poster→video association `:1835/:1882` + TESTING:66 (doc recommends single-poster-per-product for v3.5).
- Per-field char-count targets DESIGN:87 (counter exists; the target numbers are a render-tune delta).
- Badge/blink split `:3211` + TESTING:85 (recommended: blink off `unseen_count`, badge = needs-shipping count; `out/portal.js mountShell` currently couples them).
- Entry-gate wrapping `:410` → see finding 3.

**Genuine runtime/probe (cannot resolve from repo; fallbacks documented):**
- **#219 Stripe Basil probe** `:1070` + TESTING:50 — `applyPromotionCode` at init + second-code REPLACE-vs-stack. Gating; the three fallbacks (init/first-change/prefill) and the swap-is-removal path are all specified.
- **PostgREST `.or('is_published.eq.false,draft.not.is.null')` negation** `:754` — installed `@supabase/supabase-js` + `postgrest-js` = **2.104.0**. `not.is.null` inside `.or()` is the documented PostgREST form, but the doc's own hedge (scope the fold to `.eq('is_published', false)`, covering the primary case) is the safe fallback. Runtime-verify.

**Genuine deploy/ops (env config):**
- `PRODUCT_API_KEY` in prod for the scheduled-publish self-call `:755` — no-ops safely if absent (publish 401s, logged).
- `SUPABASE_SECRET_KEY` reachable by the `product-feed` function `:2668` + TESTING:13 — repo-inference: `webhook.ts` + `adminAuth.ts` (separate functions) use it → project-wide; final confirm at deploy.
- `CRON_SECRET` set in Vercel prod `:2669` — the one ops step to arm reconciliation; safe no-op until set.

**Genuine decision (Sean/external):**
- CREATE-lenient is a GPT-contract change `:872` — needs a WS10 instruction beat ("create is lenient; publish is the gate") so the GPT isn't surprised by a 200 on a partial create.
- Em's Dropbox links direct-download? `:1660` — external; safe fallback = drop Dropbox from the placeholder copy.
- Reconciliation alert address `:2670` — `RECONCILE_ALERT_EMAIL` vs `ORDER_NOTIFY_EMAIL`.
- Alt hard-gate `:1804/:1878/:65` — already resolved by WS2 (see finding 4); the "decision" is moot.

---

## Byte-fidelity ledger (what matched exactly)

- **`api/products.ts`** — `:7`, `:49-56`, `:70-71`, `:183`, `:258-262`, `:287-322`, `:324-330`, `:337-340`, `:456-466`, `:467-475`, `:537-548`, `:553-559`, `:566-570`, `:631`, `:635-640`, `:644-645`, `:654`, `:676-681`, `:685-686`, `:694-703`, `:735`, `:745-746`, `:831-836`, `:861-862`, `:915-916`, `:967-968` — all byte-exact. (Confirmed: `handleArchive`'s update at `:906-911` returns the full row so `data.title` is present, per the 8.1c(i) note.)
- **`api/orders.ts`** — `:11`, `:95-101`, `:104-107`, `:111-115`, `:174-176`, `:256-261`, `:338-341`, and the `select('…customers(name, email, phone, shipping_address)')` at `:66` — all byte-exact. Ledger-27 coordination **holds cleanly**: WS3 touches only the PATCH guard in `orders.ts`; WS8 solely owns the `actor` const in both PATCH (`:107`) and POST (`:256`) — no double-declaration.
- **`api/product-feed.ts`** — `:1-7`, `:18-24` byte-exact (see finding 1 for the merge).
- **`api/checkout.ts`** — `:13-16`, `:43-68`, availability re-check `:77-92` (returns 410 as documented), `:182-198`, `:202-211`, `:261-279`, `:306-313` — all byte-exact.
- **`api/webhook.ts`** — `:165`, `:182-198`, holdSessionId block (doc hint `:244-256`; actual `:243-256`, text exact) — byte-exact.
- **`api/upload.ts`** — `ROLE_PATTERN :52-53`, skip-transform gate `:136-139`, multipart `:375-385`, by-link `:329-341` — byte-exact; zero-change claim (ledger 15) holds.
- **Storefront (subagent-verified byte-exact):** `main.js` 4.3a/4.3b, `checkout.js` 4.4a/4.4b/4.4c, `shop.js` 4.5a/4.5b/6.2a/6.2b/6.2c, `product.js` 4.5c/4.5d/6.1b/6.1c, `homepage.js` 4.5e/4.5f/6.3d, `cart.js` 4.5g/4.5h/4.5i, `complete.js` 6.4a, `product.html`/`shop.html`/`index.html`/`complete.html` WS6 blocks. All 22 `styles.css` tokens the sale CSS references are defined; all referenced selectors (`.feature-list`, `.feature-list svg`, `.hidden`, `.checkbox-label`, `.filter-group > summary`) exist. Line hints off by 1-2 in a few spots (explicitly hints).
- **Design `out/` (subagent-verified byte-exact):** `portal.js P.env/siteUrl :13-28`; `account-app.js` 1.4a-e; four-shell head `:6-8` + script-order tails; `computeState :16-22`, `eff :340`, `product_type :364`, all commit* anchors, `orders-app.js`/`orders.html` WS3 anchors, all WS5 media-modal anchors (incl. the `mute`→`muted` rename source), WS8 `unseenOrders :13/:98`. **DESIGN addendum §B six token values byte-identical in `portal.css :root :28-33`**; `@supports` fallback `:70-88`; reduced-motion `:528-532`; `.input` 16px→14px@860px; `.price-sale` correctly ABSENT from `portal.css` (storefront-only). `tokens.css` carries the *original* controls.html palette (differs) — expected + documented (§B: `portal.css` = tokens.css "with the Sean-v1 palette folded in"); `portal.css` is the shipped authority and matches §B.
- **Schema/RLS:** top-level `orders.shipping_address :109`, `customers.shipping_address :87`, `delivered_at :114` (doc hint `:116`), status-comment `:108`, `cart_holds` index `:165`, `site_config :133` with **no** `is_test` (`:169` non-transactional), `record_sale available = (qty>0) :35` — all confirmed. `orders` is authenticated-read / service-role-write (`rls_policies :38-42`).
- **Minor line-hint drift (anchor text exact):** `product.js pickHero` @574 (hint 575-576); `.filter-group > summary` @1030 (hint 1029-1040); `index.html` 6.3c opens @248 (hint 249-253); `webhook.ts` holdSessionId @243 (hint 244); `sales-app.js D.storeWideSale` @10 (hint 11); `orders-app.js render()` @235, `sales-app.js renderStoreWide/renderCoupons` @223-224 (feeds finding 3).

---

## If you fix one thing

**Reconcile `api/product-feed.ts` to a single, named service-role client.** It is the only spot where applying both byte-anchored NEW blocks literally yields broken/duplicated code (two clients + duplicate imports), it sits on the WS2+WS7 merge seam that touches scheduled-publish *and* money reconciliation, and the doc resolves it only in prose — pick the surviving identifier and rewire `publishDueScheduled`'s `admin.*` references before execution.

## Verdict

**NEEDS ANOTHER PASS (NARROW).** Byte-fidelity is clean — every CURRENT anchor matches the tree and every NEW block references only extant code/tokens/selectors. The remaining work is bounded to four editorial-precision seams: (1) `product-feed.ts` single-client name unification, (2) the two WS8 post-WS4 stale anchors made explicit, (3) the boot-gate `.then()` wrapping all terminal init statements in `sales-app.js`/`orders-app.js`, and (4) striking the stale WS5 alt-gate open question (WS2 already settled it). All are documented-coordination or doc-tidy items, not code disproofs — a tight, scoped pass closes them.
