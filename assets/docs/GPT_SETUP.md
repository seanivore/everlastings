# The Sunkeeper — Custom GPT brain + AI pipeline protocol

**What this is.** The complete, canonical reference for the store's AI pipeline. Two readers:
1. **The Custom GPT "The Sunkeeper"** — its knowledge, system prompt, and Actions. Parts 1–3 are everything it must know and the exact config to paste when setting it up.
2. **Claude Code / Sean** — the shell/curl protocol for programmatic product work. Part 4.

This supersedes the archived setup record `archive/v1_4/v1_4_5_C_GPT_SETUP.md` and the retired `PRODUCT_PROTOCOL.md` (its content lives here + in `STORE_ADMINISTRATION.md`). Emy's *simple how-to* lives in `STORE_ADMINISTRATION.md`; this doc is the GPT's brain + the technical protocol.

**Status note (as-built v4.0.0):** the GPT is set up **from scratch** with this doc (any earlier "Sunkeeper" attempt is discarded), in **two waves** (Part 3) — but as of v4.0.0 **every backend the GPT calls is live and Bearer-authed** (`/api/products`, `/api/upload` + `/api/upload/attach`, `/api/coupons`, `/api/orders`, `/api/orders/{id}` + `/api/orders/{id}/refund`), so nothing is blocked; each wave is still verified against whichever environment the GPT's Action points at. As shipped in the v4.0.0 build the GPT's Action is **currently pointed at the dev tester** — go-live flips its `servers:` URL + auth to production (Part 3 hand-off).

**Which environment the GPT talks to (read this first).** The GPT only ever sees the environment its Action `servers:` URL + key point at — `isTest = VERCEL_ENV !== 'production'` (`api/_lib/env.ts`) scopes *every* product/order read and write, so test data lives only on a preview and live data only on production.
- **To test the GPT on throwaway data:** point the Action at the **dev preview** + the **preview** `PRODUCT_API_KEY`, with Vercel SSO **off** (a third-party Actions runner can't pass SSO). Everything it creates/lists is `is_test=true` — create products, list orders, mark shipped, with no real money.
- **To hand off:** switch the Action to **production** + the production key. From then on it sees only live data.
- The **owner's day-to-day never touches this** — her safety net is the draft preview (v1.5). The test↔live switch is Sean's testing/demo tool.

**Store management (as-built v4.0.0):** the GPT is Em's full console — it can **create / edit** products, run **draft → preview → publish** (and **schedule** a publish for a future date via `scheduled_publish_at`), manage **coupons** including the **automatic store-wide sale** (`auto_apply` — struck prices + auto-apply at checkout, no code to type), **archive / resurface** pieces, **fulfill orders** (list + mark shipped), and **issue refunds** (including one named piece on a shared multi-item payment). The Actions + Knowledge in this doc cover all of it. As always, the GPT only ever sees the environment its Action points at.

---

## Part 1 — What the GPT must know (its knowledge)

> **Canonical knowledge = two uploaded files.** The GPT's product and voice knowledge live in **`assets/docs/gpt/product-reference.md`** (fields, enums, photos, worked example) and **`assets/docs/gpt/voice-guide.md`** (brand voice for writing copy). Those two files are the **source of truth** and are what you upload as Knowledge (§2D). 1A–1C below are a quick summary of `product-reference.md`; keep the uploaded files current and treat them as authoritative. 1D–1E (orders/refunds) are behavioral and live only here + in the Instructions.

### 1A. Product protocol — the fields she provides

Every product is a row in Supabase. Creating or editing a product makes a DRAFT with a private preview link; the Stripe listing is created when it's PUBLISHED. These are the fields and how to write them.

**She writes:**
- **title** — the name of the piece, exactly as shown.
- **headline** — 5–7 word tagline. Short, poetic; appears under the title.
- **story_card** — the full story (2–8 paragraphs). The emotional heart; her natural poetic voice (see `voice-guide.md`).
- **description** — 2–3 sentence summary. Used in previews, search, social shares.
- **features** — list of notable features, written beautifully ("Softly illuminated by warm LED glow," not "LED lights").
- **price** — in **dollars**; we store cents ($245.00 → 24500). Never show her the integer.
- **dimensions** — W × D × H in inches (e.g. `8" W x 6" D x 10" H`).
- **weight** — for shipping, in pounds (e.g. `2.5 lbs`).
- **materials** — list; each material a separate string.
- **power_supply** — e.g. `USB-C (adapter included)`, `Battery (included)`, or empty.
- **care_instructions** — list; each step a string.
- **shipping_details** — list; timeframe, packaging notes, insurance.
- **artist_note** — optional brief personal note.

**She chooses:**
- **product_type** — `miniature` (the only type the store supports today; printable/storybook are future work, not something the GPT can add on its own).
- **series** — one or none of `Portals to Peace`, `Book Nooks`, `Story Lofts`, `Seasonal`, `Limited Edition` (new names auto-appear on the site).
- **available** — `true`/`false` (auto-set `false` on purchase).
- **quantity** — number; `1` for one-of-a-kind, `0` sold out, higher for editions.
- **featured** — `true`/`false` (homepage carousel).

**You also write (SEO + checkout):** `seo_title`, `seo_description`, `seo_thumbnail` (OG image); and the checkout line `checkout_name` / `checkout_description` (one short line) / `checkout_image` — each falls back to the page title / description / thumbnail if left blank, and all freeze once the product is published.
**You derive `slug` from the title (compute once, reuse) — see "THE SLUG" in the Instructions:** required on createProduct and on every uploadImage; the server normalizes it; permanent after creation.
**The system handles (never set):** `sku`, `stripe_product_id`/`stripe_price_id`, the photo CDN URLs, `homepage_theme`, and the draft/publish machinery.

### 1B. Worked example — The Sunkeeper

| Field                           | Value                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| title                           | The Sunkeeper                                                                              |
| headline                        | A garden where time stands still                                                           |
| story_card                      | *The Sunkeeper stands watch …* (2–8 paragraphs)                                            |
| description                     | Handcrafted miniature garden scene with warm LED lighting and hand-placed botanicals.      |
| features                        | Warm LED glow with 3 modes; Hand-placed dried botanicals; USB-C powered (adapter included) |
| price                           | $245.00 (stored as 24500)                                                                  |
| dimensions                      | 8" W x 6" D x 10" H                                                                        |
| weight                          | 2.5 lbs                                                                                    |
| materials                       | Wood, resin, LED lights, natural moss, dried flowers                                       |
| power_supply                    | USB-C (adapter included)                                                                   |
| care_instructions               | Dust gently with soft brush; Keep away from direct sunlight                                |
| shipping_details                | Ships within 3–5 business days; Insured shipping included                                  |
| product_type                    | miniature                                                                                  |
| series                          | Portals to Peace                                                                           |
| available / quantity / featured | true / 1 / true                                                                            |

### 1C. Photos

- **Minimum 6 distinct shots** per product: 1 hero + ≥5 gallery. (The DB also needs a thumbnail; the portal auto-derives it from the hero and the GPT re-uploads the hero under the `thumbnail` role — so **7 files** land but only **6 distinct** shots are needed.) Ideal 10–15.
- Roles for `uploadImage`: `hero`, `thumbnail`, `gallery-01`…`gallery-15`, `detail-01`…`detail-05`, `video-01`…`video-05`. Use `skip_transform=true` for videos. (GIFs are retired — use a short MP4 instead.)
- Shots: hero (clean front, = thumbnail), angles (3–4), details (2–3), lighting modes (2–3), one scale reference, 1–2 lifestyle.
- The system crops to 4:5, converts to WebP, compresses, and uploads to the CDN. She just sends the photos.

### 1D. Order & fulfillment protocol (what the GPT does for orders)

The GPT is Emy's whole console — it handles fulfillment too, not just products.

- **View orders** (`listOrders`): no filter = all orders newest-first; `status=needs_shipping` = paid orders awaiting shipping; `status=shipped` = already sent; `q=` searches by order id, customer email, or tracking number. Read results back to her plainly (who, what, address, total, shipped/not).
- **Mark shipped + send tracking** (`markShipped`): record a tracking number + carrier on an order. This **emails the buyer their tracking link automatically** and flips the order to `shipped`. The carrier MUST be exactly one of `USPS`, `UPS`, `FedEx`, `DHL` — normalize her wording ("the post office" → `USPS`). **Always confirm before calling** (it emails the buyer and can't be undone).
- **Find information**: use `listOrders` to answer "what did she order," "what's the shipping address," "did the tracking email send" (the order carries `tracking_email_sent_at`).

### 1E. Refunds (the GPT can issue them — v3.3)

The GPT has a **`refundOrder`** Action (v3.3, on `api/orders.ts`). Flow: find the order (`listOrders q=<email|id>`), read back the piece(s) + amount + buyer, get her **yes**, then refund — Stripe emails the buyer automatically. A Stripe refund is an **amount against the payment**, and one purchase can be several pieces sharing one payment, so it refunds (and offers to re-list) **only** the pieces she marks returned (`relist_product_ids`), never the whole cart by surprise. When Em names **one** piece on a shared multi-item payment, that line is the default (its amount; relist only it) — the GPT never silently swaps a sibling's piece or amount. It then **always offers to re-list each returned piece** (re-list a sold-out piece, or +1 a multi-stock one) — a refund never re-lists on its own. **/admin** has the same "Refund this purchase…" panel. A **full** refund flips the order to `refunded`; a **partial** usually won't (refunding the full cart total does). Payouts + payment history still live in **Stripe** (the GPT can web-look-up its current screens). See `STORE_ADMINISTRATION.md`.

---

## Part 2 — The GPT configuration (paste-able)

### 2A. Instructions (system prompt)

> **Paste the instructions from the canonical `.txt`, verbatim.** The shipped, paste-able instructions are **`assets/docs/archive/v4_0/v4_0_7_GPT_INSTRUCTIONS_TRIMMED.txt`** — **7978 / 8000 bytes** (the 8000-char cap is a hard ceiling; over it the GPT silently truncates its own prompt). Copy the whole file into the GPT's *Instructions* field byte-for-byte; do not retype from a summary. The beats it carries, so you can sanity-check the paste:

- **Intro + posture** — warm plain-language studio assistant; never expose keys/URLs/jargon; **do reversible things without asking, confirm only the irreversible ones** (the initiative nudge).
- **Create flow** — slug → upload photos → `createProduct` → share preview → publish; required fields; ATTACHED photos → `uploadImages`, LINK/URL photos + video → `uploadImage`; assign the role, write alt; 6-distinct-shot minimum (the hero doubles as the thumbnail).
- **THE SLUG** — derive once, fold accents to plain ASCII, reuse the exact string everywhere.
- **EDITING** — build edits from `effective`; price/availability/quantity go live instantly, copy/SEO/photos stage a draft; `featured`/`series`; `discardEdits`.
- **PUBLISHING** — **`createProduct` is lenient (title+price min saves a partial) — the field gate is at PUBLISH**; a publish-400 names the missing field in plain labels (`Story` = the story, headline = the tagline); recover a lost preview via `getProduct`.
- **COUPONS** — a sale = a Stripe **Coupon** + **Promotion Code** = the **Discount**; percent or amount-off; a product-scoped coupon needs a published piece; **AUTOMATIC STORE-WIDE SALE = a store-wide percent `createCoupon` + `auto_apply:true`** (struck prices + auto-apply at checkout, no code typed; end via `deactivateCoupon`); Stripe allows one discount/order (a shopper swaps the sale code for a personal one — don't apologize).
- **ORDERS** — `listOrders`; `markShipped` needs tracking + carrier (USPS/UPS/FedEx/DHL); confirm first (it emails the buyer).
- **REFUNDS** — `refundOrder {id}` refunds THIS order's amount + relists THIS piece; **name one piece on a shared multi-item payment → that line is the default (its amount, relist only it); never silently swap a sibling's piece/amount**; confirm first; offer to restore each returned piece.
- **MEDIA / LINK TROUBLE / ALWAYS** — video is always by-link; attached-photo failures keep the successes; write in Em's voice; `401` = "the connection key needs Sean's attention."

**What changed at v4.0.0:** restored the Coupon/Promotion-Code/Discount vocabulary + the **automatic store-wide-sale** beat; added the "create is lenient — the field gate is at PUBLISH" beat; the **shared-payment named-piece** refund default; the **initiative nudge**; and swapped the plain publish-400 label to `Story` (was `story_card`). Net +191 B over the v3.3 base, landing at 7978/8000.

### 2B. Actions schema (OpenAPI)

> **Paste the schema from the canonical `.txt`, verbatim.** YAML whitespace is significant — copy from **`assets/docs/archive/v4_0/v4_0_7_GPT_SCHEMA.txt`**, never from rendered markdown. It is OpenAPI 3.1.0 with `info.version: 4.0.7`. **16 operations**, all on the `servers:` URL `https://everlastingsbyemaline.com` (change that URL per environment — see 2C + Part 3). The operations:

- **Products (8):** `createProduct` (POST `/api/products` — draft, no Stripe yet), `listProducts` (GET), `editProduct` (PUT `?id=`), `publishProduct`, `archiveProduct`, `unarchiveProduct`, `discardEdits`, `getProduct` (GET `/api/products/by-slug/{slug}`).
- **Media (2):** `uploadImage` (POST `/api/upload` — by LINK/URL, or a video), `uploadImages` (POST `/api/upload/attach` — photos ATTACHED in chat, `openaiFileIdRefs`, up to 10).
- **Coupons (3):** `createCoupon` (POST `/api/coupons`), `listCoupons` (GET), `deactivateCoupon`.
- **Orders (3):** `listOrders` (GET `/api/orders`, `?status=`/`?q=`), `markShipped` (PATCH `/api/orders/{id}`), `refundOrder` (POST `/api/orders/{id}/refund`).

**What changed at v4.0.0:**

- **`x-openai-isConsequential: false` on ALL 16 actions.** This removes ChatGPT's per-action "Allow / Always allow / Decline" confirmation prompt, so the GPT can chain calls without Em clicking through each one. **Why it's safe:** the confirm-first safety now lives in the *instructions* themselves — every irreversible action (mark-shipped, refund, coupon-create, publish) carries a CONFIRM-FIRST beat that makes the GPT read the terms back and get Em's yes before it calls. The standing posture is "do reversible things freely, confirm the irreversible ones," so the platform prompt was redundant friction stacked on top of a confirmation the GPT already runs — not the safety layer itself.
- **`createCoupon` gained `auto_apply` (boolean)** — `true` = the automatic store-wide sale (percent + store-wide only): the storefront shows struck prices and auto-applies the code at checkout, no code to type. End it via `deactivateCoupon` like any coupon.
- **`editProduct` gained `scheduled_publish_at`** (ISO 8601; auto-publish a ready draft at a future date via the daily cron; date-granular; `null` clears) and a **take-down annotation on `available`** — `false` unpublishes the piece to a hidden DRAFT (not "sold"); to put it back up call `publishProduct {id}`, NOT `available:true`.
- **The seven publish-required detail fields carry `"Required to publish."`** on both `createProduct` and `editProduct` (`features`, `dimensions`, `weight`, `materials`, `care_instructions`, `shipping_details`, `quantity`) — so the GPT collects the same full set the dashboard's form does and doesn't dead-end at a publish-400. (Create still saves a partial draft; the gate is at publish.)

### 2C. Authentication

- **Type:** API Key · **Auth Type:** Bearer · **API Key:** use the `PRODUCT_API_KEY` **whose Vercel scope matches the environment the Action's `servers:` URL points at** (Vercel → Project → Settings → Environment Variables → `PRODUCT_API_KEY`):
  - **Testing against the dev preview** (where setup happens): the **Preview**-scoped value — the same key in `.env.local` that ran the curl tests (the preview deploy runs `is_test=true` on a Stripe **test** key).
  - **Production hand-off:** the **Production**-scoped value (a Stripe **live** key).
  - **Dev and prod use DIFFERENT keys** (test vs live). Never mix scopes.
- One key authorizes every action (`/api/products`, `/api/upload` + `/api/upload/attach`, `/api/coupons`, `/api/orders`, and `/api/orders/{id}/refund`).
- **Re-pasting the schema can RESET the Action's auth** (ChatGPT drops the Bearer when you replace the schema) **and it adopts the file's `servers:` URL.** So whenever you update the GPT — and every time you switch environments — **re-verify BOTH the auth key and the `servers:` URL** for the target environment (dev preview for testing, production for go-live). They are independent; a right URL with a wrong-scope key still fails.
- **Wrong-key tell:** `listProducts` returns an **empty `200`** (a scoped read simply finds no rows in that environment) while an **`uploadImage` `401`s**. That mismatch — read-empty + write-401 — means the Bearer is from the wrong environment, or was reset on a schema re-paste. A clean `401` on everything = a missing/blank key → surface it as "the connection key needs Sean's attention."

### 2D. Settings

- **Name:** `The Sunkeeper` · **Description:** `Everlastings by Emaline store assistant — adds products and fulfills orders by chat.`
- **Capabilities:** Web Browsing / Search **must stay ON** (never disable it) — the GPT relies on it to walk Em through Stripe's *evolving* dashboard (payouts, payment history, and any refund detail the API doesn't cover) and to confirm Stripe's current UI steps, which change without notice. DALL·E off. Code Interpreter on (lets it inspect uploaded images if needed).
- **Privacy policy URL:** `https://everlastingsbyemaline.com/privacy`
- **Share:** **Only me** (it carries a live API key — never public).
- **Knowledge files (required):** upload the two curated files **`assets/docs/gpt/product-reference.md`** and **`assets/docs/gpt/voice-guide.md`**. Do **not** upload `BRAND.md`, `EVERLASTINGS_STORE.md`, or `STORE_ADMINISTRATION.md` — they carry developer/CSS/architecture detail that confuses the GPT and risks leaking technical jargon to Em. (Role context is already in the Instructions; the GPT doesn't need the human operator how-to.)

---

## Part 3 — Setup, in two waves (Sean drives; Em at the keyboard)

The GPT lives in **Em's** ChatGPT (she has Plus; she's the owner). It's built in **two waves** for two reasons learned the hard way: the order Actions depend on the `/api/orders` Bearer path that **shipped in v1.4.9 (Phase 6)**, and a third-party Actions runner **cannot authenticate through a Vercel SSO-protected preview** — so each wave is verified against an environment the GPT can actually call (point the Action at the dev preview to test, production to hand off — see the Status note's environment rule). Don't configure an Action you can't immediately verify.

### Wave 1 — Products + coupons (the full Action set is live as of v4.0.0)

The full management Action set — `editProduct`, `publishProduct`, `discardEdits`, `scheduled_publish_at`, the coupon routes (incl. `auto_apply`), archive/unarchive, and both JSON upload routes (`uploadImage` by-link + `uploadImages` for attached photos) — is **live as of v4.0.0** on both the dev preview and production, so you can paste and verify the whole schema in one pass.

1. ChatGPT → **Explore GPTs → Create → Configure**.
2. Paste **Name** + **Description** (2D).
3. Paste **Instructions** (2A) verbatim.
4. **Capabilities** per 2D — turn **Web Browsing ON** (required for the refund walkthrough). **Knowledge:** upload `assets/docs/gpt/product-reference.md` + `assets/docs/gpt/voice-guide.md` (2D) — never the raw dev docs.
5. **Create new action → Authentication:** API Key, Bearer, paste the `PRODUCT_API_KEY` **for the environment the schema's `servers:` URL points at** (see the smoke test + 2C's wrong-key tell). Re-check it any time you re-paste the schema — that can reset the Bearer.
6. **Schema:** paste the schema from the canonical **`v4_0_7_GPT_SCHEMA.txt`** (2B) verbatim — YAML whitespace is significant, so copy from the `.txt`, not from rendered markdown. Paste the full schema; all 16 Actions (incl. `/api/orders`) are live.
7. **Privacy URL** (2D). **Save → Only me**.
8. **Wave 1 smoke test** — because the GPT can't reach the SSO-protected preview, verify the product pipeline one of two ways. Either way the path is: **create-draft → open the returned `preview_url` → publish (publish creates Stripe + goes live) → archive the throwaway.**
   - **Recommended (no live clutter):** Sean curls the **dev preview** first to prove the pipeline (test key from `.env.local`). A bogus-key call → `401` (proves the endpoint is deployed + gated); a real-key `createProduct` returns a draft + `preview_url` and tags the row `is_test=true`; then `publishProduct {id}` creates the Stripe listing. The GPT wraps these exact calls — green curl = green GPT path.
   - **GPT end-to-end (at launch):** point the schema `servers:` + key at **production**, then have the GPT add "Setup Smoke Test, $1," give it 7 throwaway photo links → it uploads 7×, hands back the `preview_url`, then **publish** → `prod_…` id. Open `https://everlastingsbyemaline.com/product/setup-smoke-test`, then archive it (`archiveProduct`, or Stripe → archive product / Supabase Studio).

### Wave 2 — Orders (the `/api/orders` Bearer path shipped in v1.4.9; verify it on the environment the GPT targets)

The order Actions (`listOrders`, `markShipped`, `refundOrder`) run on the `PRODUCT_API_KEY` Bearer path on `/api/orders`, which **shipped in v1.4.9** (refunds added in v3.3) and is **live on both environments** as of v4.0.0. The historical trap — an Action pointed at an undeployed or SSO-protected preview returns `401` — no longer gates this wave, but still verify against the environment the GPT targets:

1. **Confirm the orders path answers** on the target environment (Sean curls `/api/orders` GET + PATCH + the `/api/orders/{id}/refund` POST with that environment's key → `200`).
2. GPT → **Edit → Actions → Schema:** confirm the `/api/orders` + `/api/orders/{id}` paths are present (2B).
3. **Wave 2 smoke test** (with Em watching): "What orders need shipping?" → it calls `listOrders` and reads them back plainly. Then mark a **test** order shipped → it confirms first, calls `markShipped`, the order flips to shipped and the buyer tracking email fires. **A "test order" exists only on the dev preview** — point the GPT there to rehearse with `is_test` data and no real money. In **production** there are no test orders; for a launch sanity check, make one $1 throwaway purchase, ship it via the GPT, then refund + archive. Never mark a real customer's order as a rehearsal.

**Hand-off:** the GPT is in Em's sidebar. Remind her: always the required photo set (≥1 hero + ≥5 gallery + a thumbnail); create and edits make a **draft with a preview link** — she reviews it, then **publishes** to go live; it manages products end-to-end (edit, draft → preview → publish, **schedule a publish**, coupons incl. the **automatic store-wide sale**, archive/resurface), fulfills orders, and **issues refunds** — it confirms before marking shipped or refunding (both notify the buyer); if she ever sees "the connection key needs Sean's attention," text Sean.

**Go-live (v4.0.0).** The GPT's Action currently points at the **dev tester**. To hand it to Em on production: flip the schema `servers:` URL to `https://everlastingsbyemaline.com`, re-paste the shipped **`v4_0_7_GPT_SCHEMA.txt`** + **`v4_0_7_GPT_INSTRUCTIONS_TRIMMED.txt`**, and re-paste the **Production**-scoped `PRODUCT_API_KEY` (a schema re-paste can reset the Bearer). Then re-run the smoke test against prod. Re-verify BOTH the URL and the key — they are independent.

**Maintenance:** if `PRODUCT_API_KEY` rotates, reopen the GPT → Actions → Authentication → paste the new value → Save. If the API base URL changes (or you switch environments), update the `servers:` URL in the schema and **re-verify the auth key for that environment** — re-pasting the schema can reset the Bearer, and a wrong-environment key shows the `listProducts`-empty-`200` / `uploadImage`-`401` tell (2C).

---

## Part 4 — Agentic / curl protocol (Claude Code, Cursor, scripts, Sean)

> **Audience:** an AI/agent that executes HTTP directly (Claude Code, ChatGPT code interpreter, scripts), or Sean seeding test data. For Emy's chat workflow, that's Parts 1–3 (the Custom GPT wraps these same calls).

### Base URL

| Use case                          | `BASE_URL`                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Real product creation (default)   | `https://everlastingsbyemaline.com`                                                                  |
| Test/dev seeding (preview deploy) | `https://everlastings-website-git-dev-everlastingsbyemaline.vercel.app` (any `*.vercel.app` preview) |
| Local (`vercel dev`)              | `http://localhost:3000`                                                                              |

```bash
export BASE_URL="https://everlastingsbyemaline.com"        # production
# export BASE_URL="https://everlastings-website-git-dev-everlastingsbyemaline.vercel.app"  # dev preview
```

When `BASE_URL` is a preview, the API tags rows `is_test = true` and uploads under R2's `test/` namespace (URLs become `…/test/{slug}/test_{role}-{slug}.webp`); no cleanup needed before launch. `PRODUCT_API_KEY` differs per environment — use the test value from `.env.local` for previews, the production value only for production.

### Step 0 — Generate slug (FIRST, before any image upload)
```
slug = title.toLowerCase().replaceAll(' ', '-')   # "The Sunkeeper" → "the-sunkeeper"
```
Immutable after creation; used in image paths and the URL; 409 if it already exists.

### Step 1 — Required fields
`title`, `headline`, `story_card`, `description`, `features` (array), `price` (cents), `product_type`. Optional: `dimensions`, `weight`, `materials`/`care_instructions`/`shipping_details` (arrays), `power_supply`, `series`, `available` (default true), `quantity` (default 1), `featured` (default false), `artist_note`.

### Step 2 — Upload images
The endpoint composes the filename as `{role}-{slug}.{ext}` and handles the Cloudinary transform internally.
```bash
curl -X POST "$BASE_URL/api/upload" \
  -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -F "file=@/path/to/raw-image.jpg" \
  -F "slug=the-sunkeeper" \
  -F "role=hero"
# → { "url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/hero-the-sunkeeper.webp" }

# Videos / GIFs — skip the transform:
curl -X POST "$BASE_URL/api/upload" \
  -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -F "file=@clip.mp4" -F "slug=the-sunkeeper" -F "role=video-01" -F "skip_transform=true"
```
Roles: `hero`, `thumbnail`, `gallery-01..gallery-15`, `detail-01..05`, `video-01..05`, `gif-01..05`.

### Step 3 — Create product (makes a DRAFT; no Stripe yet)
```bash
curl -X POST "$BASE_URL/api/products" \
  -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Sunkeeper",
    "slug": "the-sunkeeper",
    "headline": "A garden where time stands still",
    "story_card": "The Sunkeeper stands watch...",
    "description": "Handcrafted miniature garden scene with warm LED lighting.",
    "features": ["Warm LED glow with 3 modes", "Hand-placed dried botanicals"],
    "materials": ["Wood", "resin", "natural moss"],
    "care_instructions": ["Dust gently with a soft brush", "Keep away from direct sunlight"],
    "shipping_details": ["Ships within 3-5 business days", "Insured shipping included"],
    "price": 24500,
    "product_type": "miniature",
    "series": "Portals to Peace",
    "images": [
      {"url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/hero-the-sunkeeper.webp", "alt": "Front view"},
      {"url": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/gallery-01-the-sunkeeper.webp", "alt": "Side angle"}
    ],
    "thumbnail": "https://cdn.everlastingsbyemaline.com/products/the-sunkeeper/thumbnail-the-sunkeeper.webp",
    "seo_title": "The Sunkeeper | Everlastings by Emaline",
    "seo_description": "Handcrafted miniature garden scene with warm LED lighting."
  }'
# → { "success": true, "product": {...}, "preview_url": "https://…/product/the-sunkeeper?preview=…" }
```
Create returns a **draft** plus a `preview_url` — no Stripe product/price is created yet, and there's no `stripe_sync` block.

### Step 3b — Publish (creates Stripe + goes live)
```bash
curl -X POST "$BASE_URL/api/products/publish" \
  -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id": "PRODUCT_UUID"}'
```
Publishing a new product is what creates the Stripe product/price and makes it purchasable; the preview link rotates on publish.

### Editing / marking sold (PUT)
On a **published** product, `price`, `available`, and `quantity` apply **LIVE immediately** (no preview, no publish). Everything else — copy, SEO, photos/media — **stages a draft** and returns a `preview_url`; call `/api/products/publish {id}` to apply it. Only the `checkout_*` identity fields freeze after first publish.
```bash
# Copy / SEO / photo edits — STAGE a draft (returns preview_url; publish to apply):
curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" -d '{"headline": "Updated tagline", "featured": false}'
# Price change — rotates the Stripe price in place (same product/URL), LIVE immediately:
curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" -d '{"price": 29500}'
# Mark sold — {available:false} ONLY (also happens automatically on purchase); LIVE immediately:
curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" -d '{"available": false}'
# Restock — LIVE immediately:
curl -X PUT "$BASE_URL/api/products?id=PRODUCT_UUID" -H "Authorization: Bearer $PRODUCT_API_KEY" \
  -H "Content-Type: application/json" -d '{"quantity": 3}'
```

### Error handling
- **Image upload fails:** retry once; if it fails again, STOP — do not create the product with missing images.
- **Create fails:** do NOT blind-retry. `409` = slug conflict; `400` = missing/invalid field; `401` = wrong/missing key.
- **Rollback:** if the product was created but images are incomplete, set `available = false` immediately.

### API quick reference
| Action            | Method | Endpoint                                                      |
| ----------------- | ------ | ------------------------------------------------------------- |
| Create product    | POST   | `/api/products`                                               |
| List products     | GET    | `/api/products`                                               |
| Get product       | GET    | `/api/products?slug=SLUG` (or `/api/products/by-slug/{slug}`) |
| Update product    | PUT    | `/api/products?id=UUID`                                       |
| Publish product   | POST   | `/api/products/publish`                                       |
| Discard edits     | POST   | `/api/products/discard`                                       |
| Archive product   | POST   | `/api/products/archive`                                       |
| Unarchive product | POST   | `/api/products/unarchive`                                     |
| Upload image      | POST   | `/api/upload`                                                 |
| Create coupon     | POST   | `/api/coupons`                                                |
| List coupons      | GET    | `/api/coupons`                                                |
| Deactivate coupon | POST   | `/api/coupons/deactivate`                                     |
| List orders       | GET    | `/api/orders` (`?status=`, `?q=`)                             |
| Mark shipped      | PATCH  | `/api/orders/{id}`                                            |
| Refund order      | POST   | `/api/orders/{id}/refund`                                     |

> **Auth modes.** `/api/products` and `/api/upload` accept `Authorization: Bearer` as either `PRODUCT_API_KEY` (AI/curl/Custom GPT) **or** a Supabase JWT (admin UI signed-in user). As of v1.4.9, **`/api/orders` and `/api/orders/{id}` also accept `PRODUCT_API_KEY`** (the Bearer path added in `v1_4_9_FINISH_TRACK_C.md` Phase 6, comparing the trimmed `env('PRODUCT_API_KEY')`) in addition to the admin JWT — that's what lets the Custom GPT fulfill orders. `PRODUCT_API_KEY` is per-environment (test in `.env.local`, live in Production); never ship it to the browser.

> **`npx vercel curl` quirk:** against a protection-enabled preview, the underlying `curl` exits code `3` ("No host part in the URL") even on success; the JSON body still delivers. In `set -e` scripts use `set -uo pipefail` or `|| true`.

---

*Questions? Sean — sean@august.style*
