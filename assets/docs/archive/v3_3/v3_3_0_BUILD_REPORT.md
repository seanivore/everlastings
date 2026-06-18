# v3.3.0 — Build Report

**Scope**: deviations-from-IMPLEMENT only, plus verification status and the handoff. Built on `dev`; not pushed/shipped.

**Did I consult `v3_3_0_RATIONALE.md`?** No — never opened it. The lean execution copy (IMPLEMENT + 2 addenda) carried the whole build; no edit's shape raised a question the byte-anchors + inline rationale couldn't answer.

## Build status — all committed on `dev`, static gate GREEN
- WS1 refund · WS2 coupons · WS3 chat-attach upload + admin media · WS4 admin polish · WS5 homepage code · WS6 inventory · Phase 3.9 GPT instructions (verbatim, **wc -c = 7788/8000**).
- 7 commits (`192b5d7` → `6523d5a`). Static gate: `tsc --noEmit` clean · `api/*.ts` = 11 (unchanged) · `node --check` admin/product/homepage clean · `vercel.json` valid, refund rewrite precedes `/api/orders/:id`, `/api/upload/attach` present · instructions verbatim & < 8000 · every schema operation summary/description < 300 · `engines.node ">=20"` + no runtime override · `grep upload-status admin.js` = 0 · cutover UPDATE comment-prefixed · bodymovin 5.12.2 CDN = 200.

## Operational steps done (agent-owned per HUMAN_STEPS)
- **WS6 migration applied** via `supabase db push` (only `20260616000001` was pending; `record_sale` RPC verified callable → PostgREST 204; cutover UPDATE stays commented — not applied).
- **R2 `-v2` hero assets live** (see deviation #1) — both URLs 200 with correct content-types + immutable cache-control.
- **Preview deployed** (Vercel CLI): `https://everlastings-website-h4a0hhyya-everlastingsbyemaline.vercel.app` (READY, publicly reachable — no SSO wall).
- **Env scoping verified**: `PRODUCT_API_KEY` / `STRIPE_SECRET_KEY` / `SUPABASE_URL` each have distinct Development / Preview / Production scopes (test/live isolation holds). `.env.local` is a TEST key.
- **`charge.refunded` already subscribed** on the preview webhook (`we_1Tc0YF…` → the **git-dev alias** `/api/webhook`; events: checkout.session.completed, payment_intent.succeeded, charge.refunded). No change needed.

## Headless verification proven on the deployed runtime
The bug class static checks can't catch (CommonJS output / Node-20 runtime globals — see `feedback_vercel_node_module_config`) is cleared: the new endpoints **load and execute** on the real preview.
- **WS1 refund**: no-auth → 401; bad UUID → 400 `Invalid order id`; missing order → 404 `Order not found`. By-PaymentIntent GET → `{orders:[]}` (is_test-scoped).
- **WS2 coupons** (full round-trip): create with `expires_date:2026-06-25` → `expires_display:"Jun 25, 2026, 11:59 PM EDT"` (endOfDayET computed the correct EDT/-4 offset); list returns `expires_display` + `min_display:"$50.00"` + `amount_display:"$5.00"` (minimum no longer write-only); deactivate → `active:false`. Test coupon cleaned up.
- **WS3 attach**: empty refs → 400; missing slug → 400; >10 → 400 (handleAttachedRefs loaded).
- **WS6**: `record_sale(uuid[])` RPC → 204 (exists, signature correct).

## Deviations from IMPLEMENT
1. **WS5 assets are minimal working placeholders, not the spec'd renders** (deliberate — these are your design render-tune content step per HUMAN_STEPS):
   - **Hero `-v2`**: shipped as clean versioned-key **copies** of the current hero MP4 + poster — proves the `-v2` swap mechanism and keeps the preview intact, but the HyperFrames **warm-grain re-render** (grain/halation/weave/flicker/vignette + warm grade) and the **re-graded poster** are NOT applied. Render-tune via the `hyperframes` workflow.
   - **Lottie title write-on**: **no JSON shipped** — the hero renders the real styled `<h1>` (the graceful fallback path). Per the "placeholders must be production-grade via the AI pipeline, not improvised" rule, I did NOT hand-roll a low-fidelity Lottie (a non-text one would have hidden the real `<h1>` behind meaningless shapes). The write-on JSON is authored via the `text-to-lottie` skill as a render-tune step; until then the code falls back cleanly (verified path).
2. **`button.danger:hover`** uses `filter: brightness(0.92)` instead of a darker hex — the DESIGN spec gave `.danger`→`--c-danger` but no hover token, and item-24 forbids a bare hex. Functionally equivalent darken, token-free.
3. **Item-24 bare-hex grep — benign non-style hits to expect** (the gate's intent — no bare hex *color* in component styles — is met): the `:root` token definitions (the palette source), `var(--token,#hex)` fallbacks (the WS1-3 render-before-§4.1 pattern), the one allowed `.skeleton #e9ecef`, the pre-existing `#a8c` example inside the Homepage-Theme **placeholder text** (not a style), and AR-tag references in comments (`AR#F16`/`#F13`/`#F19` — match the hex charset but are review tags). No bare hex color literal remains in any component rule.

## Pre-existing observation (not introduced, not in scope)
- `v2_0_0_GPT_SCHEMA.txt:85` — the `listProducts` response **items object** `description` is 356 chars (pre-existing in HEAD, shipping since v2.0.0). OpenAI's 300-char cap is on operation summaries/descriptions (all of mine are < 300); a schema object/property description is not gated the same way. Left untouched (rewriting a live schema field is out of scope + a behavior change). Flagging so a static gate run that greps *all* descriptions doesn't read it as a v3.3 regression.

## Remaining — your touchpoints (all post-build per HUMAN_STEPS)
- **Decide: push `dev`?** The git-dev preview alias + the Stripe webhook point at `dev`'s last *pushed* state (pre-v3.3). Webhook-driven E2E (real test purchase → `record_sale` decrement; full-refund `charge.refunded` flip) needs `dev` pushed so that alias rebuilds with v3.3 — or the webhook repointed. The **CLI preview URL above already serves v3.3** for everything except the webhook (admin UI, homepage, GPT Actions).
- **GPT client check** (Em's ChatGPT account — the one surface I can't drive): repoint to the Preview URL + Preview `PRODUCT_API_KEY`, Web Browsing ON; re-paste the updated **schema** (`refundOrder` + `uploadImages` + `expires_date`) and the **Phase 3.9 instructions**; spot-check refund / coupon / attach in chat (the Actions are proven via curl above).
- **Live E2E** (Stripe test mode): seed 3 test pieces, run the multi-cart refund headline (no over-refund + sub-subtab independence), inventory decrement/atomicity, idempotency — per `v3_3_0_ADDENDUM_TESTING.md` items 1-8, 32-35.
- **Design render-tune** (your eye): /admin neutral-template look (accent/spacing/type; the P0 edits-precedence flag); homepage Lottie write-on (author the JSON) + old-film hero (HyperFrames grade) + re-graded poster.
- **After sign-off**: as-built doc-sync (a FRESH agent, per the method in IMPLEMENT) → opens v4.0.0; then `dev → main` + tag; repoint the GPT back to production.
