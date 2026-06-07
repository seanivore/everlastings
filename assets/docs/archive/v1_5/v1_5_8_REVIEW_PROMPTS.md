# v1.5.x — Gap-review prompts (fresh instances)

All three angles review the **single living plan** `assets/docs/archive/v1_5/v1_5_8_IMPLEMENT.md`. Adapted from `.agent/DEV_RULES.md` §The Gap-Review Gate. **Effort: maximum. A new instance per pass** (no context contamination). Reviewers change **nothing** — output is findings only.

> ## ⭐ The review lens (give this to EVERY reviewer — subagent breadth AND cold A/B/C)
> **The product North Star is: minimize the owner's friction to manage her entire digital product — the
> site, the store, and her sales — by offloading the work to her Custom GPT.** Em runs everything by
> chatting with the GPT (OpenAI web / iOS / Android); the GPT should be able to do anything a capable
> agent (e.g. Claude Code with skills + MCPs) could do on her behalf. **Judge every gap against this**,
> not against whether the two documents are internally consistent — a capability can read as "covered"
> in the docs yet be undriveable by the GPT in practice (as the photo-upload path was before v1.5.5: it
> was asserted, but `/api/upload` was multipart-only and no `uploadImage` Action existed, so Em could
> not actually do it by chat). For each capability ask: **"can Em do this by chatting with the GPT, with
> the least friction — and if not, does the plan say so honestly and give the lowest-friction path?"**
> The one structural limit to hold reviewers to: a Custom GPT **Action** sends JSON and cannot forward a
> file pasted into the ChatGPT thread (Code Interpreter has no network) — so media must arrive by
> **link** (the GPT fetches a Drive/direct URL), and the GPT asks for a link when a file is pasted. A
> finding that "X technically works but Em can't trigger it by chat" is a **real gap**, not a nitpick.

> **A has run seven times.** Pass 1 (`v1_5_1_GAP_REVIEW_A.md`, 22 findings) → v1.5.2; pass 2
> (`v1_5_2_GAP_REVIEW_A.md`, 16 incl. one real blocker G1) → v1.5.3; pass 3 (`v1_5_3_GAP_REVIEW_A.md`,
> 10, no code-breaking logic bug; +discard Q2 + price-rotation Q1) → v1.5.4; pass 4
> (`v1_5_4_GAP_REVIEW_A.md`, **no build-breaking error, landmines held**) → v1.5.5: one real code bug
> (price-rotation **ordering** — now create→write→deactivate-best-effort), one doc bug (Studio
> INSERT-vs-flag-flip-UPDATE), one scope decision (**D1** media-by-link `uploadImage`), one fold (**D2**
> `charge.refunded`). Pass 5 (`v1_5_5_GAP_REVIEW_A.md`, **NEEDS ANOTHER PASS but narrow**) → **v1.5.6**:
> a real self-contradiction (the "make `available` live" fold had missed two staging-language spots) + a
> buggy curl recipe, plus decisions: **`quantity` now applies LIVE too**, and **`sku` is DB-generated**
> (not in `CREATE_FIELDS`); + `getProduct`→`listProducts` fallback and refund-by-chat kept in Stripe.
> Pass 6 (`v1_5_6_GAP_REVIEW_A.md`, **NEEDS ANOTHER PASS but narrow — same doc/instruction class, no
> architecture gap, all 20 landmines held**) → **v1.5.7**, folding: (RANK 1) the real one — the `slug`
> schema↔instruction contradiction (schema marks `slug` required + the GPT computes it for `uploadImage`,
> yet prose said "system handles slug, never set"); fixed by instructing the GPT to **derive the slug
> once and reuse it** + a **server-side `slugify`** in `products.ts` (URL-safe, reconstructable). (RANK 2)
> the coupon **owner-sale isolation** now byte-anchors the three system coupon-create call sites
> (`cart.ts`/`subscribe.ts`/`_bootstrap`) proving none tags a coupon `owner_sale`. (RANK 3) **first-publish
> now re-validates** with the same `validateProductRules` create uses (extracted to module scope) so an
> edit can't ship a malformed product. (RANK 4) the publish panel surfaces a **preserved pending draft**
> on a live-only edit. (RANK 5) preview Buy/cart controls **disabled ("Preview only")**. (RANK 6) the
> webhook idempotency-claim block + an admin `state.client` grep hard-gate are now quoted.
> Pass 7 (`v1_5_7_GAP_REVIEW_A.md`, **NEEDS ANOTHER PASS but narrow — no architecture gap, store fully
> chat-drivable**) → **v1.5.8**, folding two real code bugs + anchors/primer fixes: (RANK 1) the
> published-PUT staged a **phantom copy draft** on an availability/price/quantity-only admin save (the
> admin's `buildProductPayload` re-sends the full payload; the draftable pick was presence-only) — fixed
> with **value-level change-detection** (`JSON.stringify` vs the effective draft-or-live value), so a
> live-only edit stages nothing and the panel says "live now — nothing to publish." (RANK 2) **edit-publish
> now re-validates** the merged row with the same `validateProductRules` — first-publish already did, but
> the edit-publish branch applied the draft unvalidated (and Test #25 missed it), so a draft that blanked
> `story_card`/`images` could ship a malformed live product; new Test #26 covers it. (RANK 3) the
> preview-disable now **anchors the real `<button>` markup** (`product.html:289-290`). (RANK 4) the upload
> auth gate (`upload.ts:81`) is anchored **before** the new server-side URL fetch. (RANK 5) the NEW
> `createProduct` schema is **quoted verbatim** (single locate-and-replace). (RANK 6/7) the STORE primer's
> **slug ARs #7/#23** + the **system-diagram stripe-sync block** are added to Phase 10, and every Phase 10
> line hint is **re-anchored** to the reflowed STORE. (RANK 8) the `product_type` enum is **narrowed to
> `[miniature]`** (printable/storybook deferred). **This is the re-run of A against v1.5.8.** Landmines
> 7–27 below are the recent fixes/changes — confirm they hold; don't re-raise the originals.

> **Before this A-pass:** a fast in-house **subagent breadth pass** (owner-journey completeness +
> integration/state-machine, **through the review lens above**) runs against `v1_5_8_IMPLEMENT.md` to
> clear the obvious; cold A then does the thorough self-containment/completeness gate. (Subagents are
> pre-gate breadth — never the gate itself; per DEV_RULES.)

## Sequencing (per Sean's gap-review flow)

1. **A first** (cold / out-of-repo — the holistic gate). Fold findings → bump the doc (`v1_5_8_IMPLEMENT.md`…) → **re-run A** until a fresh A pass finds nothing load-bearing. Big-picture functionality gaps must surface here, before the detailed reviews.
2. **B + C** (in repo) — run consecutively, fold both at once, re-run if either finds something load-bearing.
3. All three clean → **Sean approves** → a fresh agent executes on the dev preview.

## What to hand each reviewer

- **A:** `v1_5_8_IMPLEMENT.md` **+ `assets/docs/EVERLASTINGS_STORE.md`** — and **no repo**. (The architecture doc is what lets a cold reviewer judge *functionality completeness*, not just self-containment. Paste both into a non-Claude tool or a no-filesystem session.) The review lens + landmines are **inlined in each prompt block below** — no separate paste needed.
- **B / C:** the repo + `v1_5_8_IMPLEMENT.md`; **C** also reads `EVERLASTINGS_STORE.md` first.

## Landmines — given to EVERY reviewer (validate against reality, not training data)

These are inlined verbatim into each prompt block below. Items 7–21 are the most recent fixes/changes — confirm they hold rather than re-flagging.

- The Postgres **INSERT trigger** `notify_stripe_sync` (`supabase/migrations/20260421000003_*`) auto-creates Stripe objects — it is a **SQL trigger, not a Supabase Studio webhook**, and it is **AFTER INSERT only** (a flag-flip UPDATE does NOT fire it); drafts must skip it (Phase 1) and Stripe is created **only at publish**.
- Public reads go via the **anon client + RLS**, not the API → hiding drafts/archived is the RLS change (Phase 1); **`is_test` is filtered in `main.js`** (Phase 4.5), *not* by RLS; **preview reads go through the service-role API** (Phase 3.2 / Phase 7), never the anon client. Client identities are anchored in the pre-flight: `products.ts` + `checkout.ts` = service-role (`SUPABASE_SECRET_KEY`), `product-feed.ts` = anon (`SUPABASE_PUBLISHABLE_KEY`), admin reads/archives via the service-role API.
- **Stripe-lock (Q1):** the checkout *identity* fields (`checkout_name`/`checkout_description`/ `checkout_image`) + `sku` are frozen after publish; **`price` ROTATES in place** — but the **order is load-bearing (4th Gap A #2): create the new Price → write the DB → deactivate the old Price best-effort.** A draft's `price`/`checkout_*` are freely editable until first publish.
- **Archive, never hard-delete:** "remove" = `archived_at` + Stripe `active:false` (reversible); archived rows are hidden everywhere public; order history is FK-protected (no `ON DELETE CASCADE`).
- **No new functions** — publish / coupon / archive / **discard** are `?_action=` rewrites; the `uploadImage` URL branch edits the existing `upload.ts`; the `charge.refunded` branch edits the existing `webhook.ts`; the purge is `pg_cron`; the Vercel Hobby cap is **11/12**.
- **`is_test`** is never user-editable; every new read/write stays scoped to `isTest`.
- **(G1, confirm it holds)** the published-edit **frozen-field guard rejects only a CHANGED frozen value, not mere presence** — the admin always re-sends `checkout_*` (and `price`); `price` is excluded from the guard (it rotates). The admin-published-edit path must be tested.
- **(G2, confirm it holds)** the RLS swap is name-keyed and carries a **self-checking guard** — the migration RAISEs if any `products` SELECT policy still has `qual = 'true'`.
- **(Q2) Discard exists:** `?_action=discard` clears `draft` + `preview_token` on a published row; **auth-only** (no token path); GPT `discardEdits`, admin "Discard pending edits" button.
- **(allow-list) Create is allow-listed:** the create insert is built from an explicit field allow-list; system columns can't be injected. The **normalized `slug` is set onto `product` upstream** (see the slug landmine #21) so the allow-list captures it; `slug` IS in `CREATE_FIELDS` (the GPT supplies it). **`sku` is DB-generated** (`sku text UNIQUE NOT NULL DEFAULT ('EVE-'||substr(uuid,1,8))`, initial schema) → it is **deliberately NOT in `CREATE_FIELDS`** (allow-listing a caller `sku` would risk a UNIQUE collision); the GPT `createProduct` schema has no `sku` either. (5th Gap A #4.)
- **(preview_url) `getProduct` returns an origin-correct `preview_url`** from `new URL(request.url).origin` when a `preview_token` exists; the GPT relays that link (never hardcodes a host). The origin premise is recorded + tested (4th Gap A #10).
- **(coupons) `listCoupons` auto-paginates** (`for await` over `promotionCodes.list`, scan-capped) so owner sales aren't truncated; the `owner_sale` filter still excludes cart-recovery/newsletter codes. A **product-scoped** coupon needs a PUBLISHED product (a draft has no `stripe_product_id`) — the GPT is told (4th Gap A #8).
- **(D1 — media-by-link, NEW) `uploadImage` takes a JSON `{url, slug, role, skip_transform}`** and the server fetches the URL (a Drive share link is normalized to direct-download), validates mime/size, and runs the SAME Cloudinary→R2 pipeline as the multipart path. The `/api/upload` Action now EXISTS in the Phase 9 schema. A file pasted into chat can't be forwarded → the GPT asks for a link. Confirm this is genuinely by-chat-driveable.
- **(D2 — refunds, NEW) `webhook.ts` handles `charge.refunded`** (before the no-op guard, after the idempotency claim) → sets `orders.status='refunded'` on a FULL refund, matched by `stripe_payment_intent`; partial logs only. Requires `charge.refunded` enabled on the Stripe endpoint.
- **(#3, NEW) The Studio operator note** splits the two failure modes: a Studio INSERT with `is_published=true` fires the trigger but bypasses `handlePublish`; a Studio UPDATE flag-flip does NOT fire the AFTER-INSERT trigger → a published-but-no-Stripe zombie. Never publish from Studio.
- **(#7) Admin live-only edit** shows "<X> change is live now — nothing to publish" and **no** Publish button (a price / availability / quantity-only change stages nothing).
- **(THREE live-apply fields, v1.5.6) `price`, `available`, AND `quantity` apply LIVE immediately** on a published row (no preview/publish) — all three gate purchasability (`checkout.ts:79` `available !== true || (quantity ?? 0) < 1`), and `available` is also flipped live by a real purchase (`webhook.ts:128`), so staging any of them is an oversell/stale-stock trap. All three are **change-detected** (`updates.x !== current.x`) so a no-op admin re-send doesn't write or report a spurious update; all three are excluded from the draft staging filter on the published branch. Everything else stages. `quantity`-live is latent today (only qty-1 `miniature` exists) but prevents the trap for a future multi-qty `product_type`. (5th Gap A #1/#2/#8.) The plan must say this consistently across §1.3, the PUT, §9.2, §9.5, §10b, and the admin panel — confirm no surface still says `available`/`quantity` "stages until publish."
- **(getProduct fallback, v1.5.6) If `getProduct` 404s** (a title with an apostrophe/ampersand makes a slug the GPT can't reconstruct), the GPT must fall back to `listProducts` and match by title — never report "not found" without listing first. (5th Gap A #3.)
- **(refunds-by-chat, v1.5.6) Refunds stay in the Stripe dashboard** (no refund Action in v1.5) — the GPT WALKS Em through the current dashboard steps and **uses web search to confirm the steps** as Stripe's UI drifts. This requires the GPT's **web-browsing capability ENABLED** (it was OFF before — a `GPT_SETUP.md` config requirement). A FULL refund reflects via `charge.refunded`; partial does not. (5th Gap A #6.)
- **(`uploadImage` roles, v1.5.6) `ROLE_PATTERN` is extended** in Phase 5 to include `checkout_image` and `seo_thumbnail` (the two NEW v1.5 roles) alongside `hero|thumbnail|gallery-NN|video-0N|detail-0N|gif-0N` — both the multipart and URL-intake guards use it, and the new transform crops handle those two roles. The GPT may also send **several media links in one message** (it loops `uploadImage`). (5th Gap A #10 + lens note.)
- **(#21 slug — derive once + server-normalize, v1.5.7) The `slug` is GPT-supplied, not system-filled.** The `createProduct` schema marks `slug` **required** AND the GPT computes it for every `uploadImage` call (photos upload before the row exists) — so any prose saying "the system handles slug / never set it" is the false half (6th Gap A RANK 1, now fixed). The plan instructs the GPT to **derive the slug ONCE** from the title (lowercase, spaces→`-`, strip non-`[a-z0-9-]`, collapse repeats) and reuse the SAME string for uploads + create; and `products.ts` runs a server-side `slugify` on both the caller-supplied and title-derived slug so it's always URL-safe + reconstructable (also softens the #18 apostrophe/ampersand fallback at the source). Confirm no surviving "system handles slug, never set" in any GPT-facing NEW block, and that `slug` stays required in the schema.
- **(#22 first-publish re-validates, v1.5.7) `handlePublish`'s first-publish branch re-runs the SAME per-type rules as create** via a shared module-scope `validateProductRules` (extracted from the inline create checks) BEFORE the Stripe create — so an edit that blanked `story_card`/`images` on an unpublished draft can't ship a malformed product (6th Gap A RANK 3). Confirm create and publish call the one shared validator (no divergent copies) and the function count still reads 11/12 (it's a helper, not an endpoint). **(v1.5.8: edit-publish ALSO re-validates — see #27; the two branches together close the malformed-product hole.)**
- **(#23 coupon owner-sale isolation is byte-anchored, v1.5.7) `listCoupons`/`deactivateCoupon` key on `pc.coupon?.metadata?.source === 'owner_sale'`** — the plan now QUOTES the three system coupon-create call sites (`cart.ts` tags the *promotion code* `source:'cart-recovery'`; `subscribe.ts` tags nothing; `_bootstrap/coupons.ts` creates the base coupons with no metadata) proving **no system coupon carries `owner_sale`** (6th Gap A RANK 2). Invariant: the bootstrap must never tag a coupon `owner_sale`.
- **(#24 panel honesty on a live-only edit over a pending draft, v1.5.7) `renderPublishPanel`** now checks `body.product.draft`: a price/availability/quantity-only change that PRESERVES an earlier staged copy edit shows "…live now — but you still have edits pending" + the preview link + Publish/Discard, instead of "nothing to publish" (6th Gap A RANK 4) — so the panel never contradicts the list pill.
- **(#25 preview Buy disabled, v1.5.7) On a preview load (`previewToken` present)** the product page disables + relabels the cart/buy controls "Preview only" — so an EDIT preview of a *published* product can't transact at the live price under the "Draft preview — not yet live" banner (6th Gap A RANK 5; full visual styling still deferred to Part 3). **(v1.5.8: the disable now anchors the real `<button>` markup — `product.html:289-290`, both `<button type="button">` — so `btn.disabled` is provably sufficient, 7th Gap A RANK 3.)**
- **(#26 draftable change-detection — the admin live-only path, v1.5.8) The published PUT value-compares each draftable key** before staging: a key is staged only when `JSON.stringify(updates[k]) !== JSON.stringify(effective(k))` where `effective` is the staged-draft value if present else the live column (plain `!==` is wrong — DRAFTABLE is mostly jsonb/array, a reference compare always-true). The admin's `buildProductPayload` re-sends the FULL payload every save, so without this an availability/price/quantity-only admin save would stage a **phantom no-op copy draft** and the panel would wrongly show "Preview · Publish/Discard" instead of "live now — nothing to publish" — i.e. #7 would fail on the admin path. (7th Gap A RANK 1.) Confirm a live-only admin save stages nothing (`hasDraftable=false`) while a genuine copy edit still stages and merges over any prior draft; Tests #6/#23 cover it.
- **(#27 edit-publish re-validates, v1.5.8) `handlePublish`'s edit-publish branch validates the MERGED row** (`{...row, ...draft}`) with the same `validateProductRules` before applying the draft to the live columns — so a staged draft that blanked `story_card`/`images` (admin clears a field → `… || null`) can't ship a malformed, purchasable live product. First-publish already did this (#22); edit-publish did NOT, and Test #25 covered only first-publish, so it would have shipped silently. New Test #26 exercises it (published → stage invalid draft → publish → 400, live row unchanged). (7th Gap A RANK 2 — "if you fix one thing.") Confirm both publish branches call the one shared validator.

---

## Angle A — cold / out-of-repo (self-containment + completeness)  — RUN FIRST

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT change anything —
your only output is findings (write them to v1_5_8_GAP_REVIEW_A.md, or print the full file contents
if you have no filesystem).

THE REVIEW LENS (judge every gap against this, not against doc-internal consistency)
- North Star: minimize the owner's friction to manage her ENTIRE digital product — site, store, sales —
  by offloading to her Custom GPT. Em does everything by chatting with the GPT (OpenAI web/iOS/Android);
  the GPT should be able to do what a capable agent (Claude Code + skills/MCPs) could do for her.
- For each capability ask "can Em do this by chat, with the least friction — and if not, does the plan
  say so honestly with the lowest-friction path?" A capability that reads as covered in the docs but
  can't actually be triggered by the GPT is a REAL gap.
- Structural limit to hold the plan to: a Custom GPT Action sends JSON and CANNOT forward a file pasted
  into the chat (Code Interpreter has no network) → media arrives by LINK (the GPT fetches a Drive/direct
  URL); the GPT asks for a link when a file is pasted.

CONTEXT
- You are given TWO documents and NO repository: (1) v1_5_8_IMPLEMENT.md — a single living plan a
  FRESH agent will execute against the repo, then test on the dev preview; it is meant to be
  "exclusively executable" (it embeds the exact current code and exact replacement for every edit, so
  the builder only LOCATES and APPLIES — never DISCOVERS or DECIDES). (2) EVERLASTINGS_STORE.md — the
  store's architecture/state doc, so you can judge whether the plan covers everything the store needs.
- This is the EIGHTH A-pass; the plan has absorbed seven prior ones. The 7th was NEEDS-ANOTHER-PASS but
  NARROW (no architecture gap, store fully chat-drivable): it found TWO real code bugs — a phantom-draft
  on the admin live-only PUT (RANK 1) and an unvalidated edit-publish branch (RANK 2) — plus
  anchor/primer reconciliations and the enum narrowing; all are folded into v1.5.8. Landmines 7-27 are
  the most recent fixes/changes — confirm they hold rather than re-raising the originals.
- Landmines to respect (validate the plan against these, not your training data):
  1. The Postgres INSERT trigger notify_stripe_sync (migration 20260421000003) auto-creates Stripe
     objects — a SQL TRIGGER, not a Studio webhook, and AFTER INSERT ONLY (a flag-flip UPDATE doesn't
     fire it); drafts must skip it and Stripe is created ONLY at publish.
  2. Public reads go via the anon Supabase client + RLS, not the API. Hiding drafts/archived is the RLS
     change; is_test is filtered in main.js (Phase 4.5), NOT by RLS; preview reads go through the
     service-role API, never the anon client.
  3. Stripe-lock: checkout_* identity + sku frozen after publish; PRICE ROTATES in place — and the ORDER
     matters: create the new Price, write the DB, THEN deactivate the old Price (best-effort). Same
     slug/URL; not a new product. A draft's price/checkout_* are editable until first publish.
  4. Archive, never hard-delete: "remove" sets archived_at + Stripe active:false (reversible); archived
     rows hidden everywhere public; order history FK-protected.
  5. No new functions: publish/coupon/archive/discard are ?_action= rewrites; uploadImage's URL branch
     and the charge.refunded branch edit EXISTING files; purge is pg_cron; cap 11/12.
  6. is_test is never user-editable; every new read/write stays scoped to isTest.
  7. (validate) The published-edit frozen-field guard rejects only a CHANGED frozen value, NOT presence;
     price is excluded (it rotates). The admin-published-edit path is tested.
  8. (validate) The RLS swap is name-keyed with a self-checking guard that RAISEs if any products SELECT
     policy still has qual='true'.
  9. (validate) Discard exists: ?_action=discard clears draft + preview_token on a published row,
     auth-only; GPT discardEdits + admin button.
  10. (validate) Create is allow-listed (system columns can't be injected); the GPT-supplied, server-
     normalized slug lands on `product` so the allow-list captures it (slug IS in CREATE_FIELDS — see #21).
     sku is DB-GENERATED (UNIQUE NOT NULL DEFAULT 'EVE-'||uuid8) → NOT in CREATE_FIELDS and not in the GPT
     schema (a caller sku could collide). [5th-A corrected the prior "caller-supplied" claim.]
  11. (validate) getProduct returns an origin-correct preview_url when a preview_token exists; the GPT
     relays it rather than hardcoding a host.
  12. (validate) listCoupons auto-paginates so owner sales aren't truncated; a product-scoped coupon
     needs a PUBLISHED product (a draft has no stripe_product_id) and the GPT is told.
  13. (NEW — D1) uploadImage takes JSON {url, slug, role, skip_transform}; the server fetches the URL
     (Drive share link normalized to direct-download), validates mime/size, runs the same Cloudinary→R2
     pipeline; the /api/upload Action exists in the schema; a pasted file → the GPT asks for a link.
  14. (NEW — D2) webhook.ts handles charge.refunded → orders.status='refunded' on a full refund (matched
     by stripe_payment_intent); partial logs only; requires the event enabled on the Stripe endpoint.
  15. (NEW) The Studio note splits Studio-INSERT (fires trigger, bypasses handlePublish) vs Studio-UPDATE
     flag-flip (doesn't fire the AFTER-INSERT trigger → published-but-no-Stripe zombie). Never publish
     from Studio.
  16. Admin live-only edit shows "<X> change is live now — nothing to publish" and no Publish button.
  17. (v1.5.6) THREE fields apply LIVE immediately on a published row — price, available, AND quantity.
     All three gate checkout (checkout.ts:79 available!==true || (quantity??0)<1); available is also
     flipped by a real purchase (webhook.ts:128), so staging any is an oversell/stale-stock trap. (Note:
     the webhook does NOT yet decrement quantity — qty-1 today; wire on the first multi-qty type.) All
     three are CHANGE-DETECTED
     (updates.x !== current.x) and excluded from the draft staging filter. Everything else stages. The
     plan must say this consistently across §1.3 / PUT / §9.2 / §9.5 / §10b / admin panel — flag any
     surface still saying available/quantity "stages until publish" (the 5th A's headline finding).
  18. (v1.5.6) If getProduct 404s (apostrophe/ampersand titles make an unreconstructable slug), the GPT
     falls back to listProducts and matches by title — never "not found" without listing first.
  19. (v1.5.6) Refunds stay in Stripe (no refund Action) — the GPT walks Em through the dashboard steps
     and uses WEB SEARCH to confirm current steps (Stripe UI drifts); this needs the GPT's web-browsing
     capability ENABLED (a GPT_SETUP.md config requirement; it was off before). Full refund reflects via
     charge.refunded; partial does not.
  20. (v1.5.6) ROLE_PATTERN is extended to include checkout_image + seo_thumbnail (the two new v1.5 roles)
     so uploadImage accepts them; the GPT may send several media links in one message (loops uploadImage).
  21. (v1.5.7) slug is GPT-SUPPLIED, not system-filled: the createProduct schema marks slug REQUIRED and
     the GPT computes it for every uploadImage (photos upload before the row exists), so any "system
     handles slug / never set it" prose is the false half (6th-A RANK 1, fixed). The GPT derives the slug
     ONCE (lowercase, spaces→-, strip non-[a-z0-9-], collapse repeats) and reuses it for uploads + create;
     products.ts runs a server-side slugify on caller/derived slug so it's always URL-safe + reconstructable
     (also softens #18). Confirm no surviving "system handles slug, never set" in any GPT-facing block, and
     slug stays required in the schema.
  22. (v1.5.7) First-publish re-validates: handlePublish's first-publish branch runs the SAME per-type rules
     as create via a shared module-scope validateProductRules (extracted from the inline create checks),
     before the Stripe create — so an edit that blanked story_card/images can't ship a malformed product
     (6th-A RANK 3). One shared validator (no divergent copies); function count still 11/12.
  23. (v1.5.7) Coupon owner-sale isolation is byte-anchored: listCoupons/deactivateCoupon key on
     coupon.metadata.source==='owner_sale'; the plan QUOTES the three system coupon-create sites (cart.ts
     tags the PROMO CODE 'cart-recovery'; subscribe.ts tags nothing; _bootstrap creates coupons with no
     metadata) proving no system coupon carries owner_sale (6th-A RANK 2). Bootstrap must never tag a
     coupon owner_sale.
  24. (v1.5.7) Panel honesty: renderPublishPanel checks body.product.draft — a price/availability/quantity-
     only change that PRESERVES an earlier staged copy edit shows "live now — but edits still pending" +
     preview link + Publish/Discard, not "nothing to publish" (6th-A RANK 4); never contradicts the list
     pill.
  25. (v1.5.7) Preview Buy disabled: on a preview load (previewToken present) the product page disables +
     relabels the cart/buy controls "Preview only" so an EDIT preview of a PUBLISHED product can't transact
     at the live price under the "not yet live" banner (6th-A RANK 5; full visual styling deferred to
     Part 3). (v1.5.8: the disable anchors the real <button> markup — product.html:289-290, both
     <button type="button"> — so btn.disabled is provably sufficient, 7th-A RANK 3.)
  26. (v1.5.8) Draftable change-detection on the published PUT: a draftable key is staged only when
     JSON.stringify(updates[k]) !== JSON.stringify(effective(k)) (effective = staged-draft value if present
     else live column; plain !== is wrong — DRAFTABLE is mostly jsonb/array, reference-compare always true).
     The admin's buildProductPayload re-sends the FULL payload every save, so without this an availability/
     price/quantity-only admin save stages a PHANTOM no-op draft and the panel wrongly shows Publish/Discard
     instead of "live now — nothing to publish" (i.e. #16 fails on the admin path). (7th-A RANK 1.) Confirm
     a live-only admin save stages nothing while a real copy edit still stages + merges over any prior draft.
  27. (v1.5.8) Edit-publish re-validates: handlePublish's edit-publish branch validates the MERGED row
     ({...row, ...draft}) with the same validateProductRules before applying the draft to live columns — so
     a staged draft that blanked story_card/images can't ship a malformed, purchasable live product. #22
     (first-publish) already did this; edit-publish did NOT and Test #25 covered only first-publish, so it
     would have shipped silently; new Test #26 covers it (7th-A RANK 2 — "if you fix one thing"). Both
     publish branches call the one shared validator.

ANGLE A — cold / out-of-repo. Your lack of a repo is the point. Two jobs:
1. SELF-CONTAINMENT: find every place the builder would have to open a file, guess, recall a
   library's behaviour, or make a decision the plan didn't make for it.
2. COMPLETENESS / ARCHITECTURE (the holistic pass, through THE REVIEW LENS): using EVERLASTINGS_STORE.md,
   judge whether the plan lets the owner FULLY run the store BY CHAT. Cross-check the "Custom GPT
   capability outline" (§1.10) against everything a non-technical owner needs end-to-end — create, find,
   edit, preview, publish, re-price (in-place rotation), discard staged edits, sales/coupons,
   archive/resurface, PHOTOS/MEDIA (by link — confirm uploadImage is genuinely driveable from chat,
   including her likely "I pasted the photo" and "here's the Drive link" attempts), orders, status
   visibility (incl. refunds now reflected). Stress the system design: the preview-token capability
   model; the draft→publish state machine (create vs edit; publish vs discard; partial-publish / failure
   recovery); the price-rotation invariant + its FAILURE ordering (a mid-rotation Stripe error must never
   leave a live product unbuyable); the archive model; is_test integrity across the new columns/actions
   AND the public main.js path (1.11); the 11/12 function cap; and whether the GPT knowledge makes it
   genuinely helpful vs. clunky-enough-that-DIY-wins.

OUTPUT
- A gap list RANKED by how likely each is to derail the build or leave a capability missing:
  location (section/phase), what's wrong or missing, the concrete fix. Flag any capability that the GPT
  can't actually drive by chat (the lens) even if the docs imply it's covered.
- The single most important "if you fix one thing" insight.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
Be concrete: "§1.10 lists listProducts but no way for the GPT to deactivate a coupon she made"
beats "coupons look incomplete."
```

## Angle B — fidelity (repo)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT change code or docs —
output findings only (write them to v1_5_8_GAP_REVIEW_B.md).

THE REVIEW LENS: the North Star is to minimize the owner's friction to run her whole store by chat via
her Custom GPT (which should match what an agent like Claude Code could do). Fidelity matters because a
CURRENT block that no longer matches means the builder DISCOVERS/DECIDES — friction that breaks the
"exclusively executable" promise. Remember the structural limit: a GPT Action is JSON-only and can't
forward a pasted file, so media comes by URL.

CONTEXT
- v1_5_8_IMPLEMENT.md (Part 2) is an exclusively-executable build a FRESH agent will apply to THIS
  repo, then test on the dev preview. Every CODE edit quotes a CURRENT block (locator) + a NEW block;
  the doc-edit phases (9 / 10 / 10b) are line-hinted prose, NOT byte-anchored (the plan says so) — so
  treat a CURRENT line-ref there as a locator to confirm, not a hard byte match.
- Landmines (validate against the repo, not training data):
  1. The INSERT trigger notify_stripe_sync (migration 20260421000003) is a SQL TRIGGER (not a Studio
     webhook), AFTER INSERT only; confirm the plan's quoted CURRENT trigger matches and the only change
     is the added guard line.
  2. Public reads go via the anon client + RLS; is_test is filtered in main.js (Phase 4.5), not RLS;
     preview reads go through the service-role API. Confirm the pre-flight's quoted client identities:
     products.ts/checkout.ts = SUPABASE_SECRET_KEY (6-8 / 10-12); product-feed.ts = SUPABASE_PUBLISHABLE_KEY
     (4-6); admin loadProducts (218-222) + onArchiveToggle via fetch('/api/products…'), not state.client.
  3. Stripe-lock: checkout_* + sku frozen after publish; price ROTATES. Confirm Phase 3.4's published
     branch removes price from FROZEN_AFTER_PUBLISH and runs the rotation in the ORDER the plan specifies:
     create the new Price FIRST, write the DB, THEN deactivate the old Price in a best-effort try/catch
     AFTER the DB commit (capturing oldPriceIdToDeactivate). A create failure must 502 with the DB
     untouched (old price still active+referenced).
  4. Archive = archived_at + Stripe active:false (reversible); no hard delete; order FK has no CASCADE.
  5. No new api/*.ts files: publish/coupon/archive/discard are ?_action= rewrites; the uploadImage URL
     branch edits upload.ts; the charge.refunded branch edits webhook.ts; purge is pg_cron; cap 11/12.
     Confirm the new /api/products/discard rewrite + the action dispatch line, and the new /api/upload
     Action path in the OpenAPI schema.
  6. is_test is never user-editable.
  7. (G1) Phase 3.4's frozen guard compares updates[f] !== current[f] (CHANGE), not hasOwnProperty;
     price is no longer frozen — confirm.
  8. (G2) Phase 1's migration contains the DO-block that RAISEs on a leftover qual='true' products SELECT
     policy — confirm it's valid PL/pgSQL and queries pg_policies correctly.

ANGLE B — fidelity. Open every file the plan edits and verify:
- Every CURRENT block matches the working tree BYTE-FOR-BYTE (whitespace, line content). Line numbers
  are hints; the quoted text is the anchor — flag any CURRENT block that no longer matches. (The
  product.html media block, the products.ts import cluster (1-5), the vercel.json rewrites array, the
  admin price helpers, the product-feed query (19-22), the create insert / PUT current blocks, the
  upload.ts multipart-parse block (85-105) + sha1Hex helper + ROLE_PATTERN + transform, and the
  webhook.ts no-op guard (60-63) are quoted — confirm each.)
- Every NEW block applies cleanly (no overlapping/ambiguous matches; imports resolve; the migration is
  valid SQL incl. the DO-block guard; the OpenAPI YAML is well-formed incl. the discardEdits AND the new
  uploadImage paths; vercel.json stays valid JSON). Confirm the price-rotation reorder, the upload.ts
  dual-intake branch (+ normalizeMediaUrl helper, new File() from a fetched Buffer), and the
  charge.refunded branch are syntactically sound and reference only existing helpers/types (stripe, pick,
  previewUrl, isTest, the imported Stripe type, ALLOWED_MIME, MIME_TO_EXT).
- The tsc-clean + 11/12-function claims hold (no new api/*.ts file; removed imports aren't still
  referenced; added/used symbols resolve — randomUUID, the Stripe type, isTest, File global,
  Stripe.Charge; the `import type Stripe from 'stripe'` does NOT collide with the lowercase `stripe`
  instance; stripe.prices.* is USED by the PUT rotation; charge.payment_intent narrowing is handled).
- The create allow-list (CREATE_FIELDS) references DRAFTABLE at request time (no TDZ), the slug lands on
  `product` upstream so the allow-list captures it, and the for-await coupon pagination is valid SDK use.

OUTPUT
- Ranked list: location, the mismatch, the corrected anchor/fix.
- The single most important fix.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
```

## Angle C — integration (repo + architecture)

```
You are a senior engineer doing a pre-build gap review. Effort: maximum. Do NOT change code or docs —
output findings only (write them to v1_5_8_GAP_REVIEW_C.md).

THE REVIEW LENS: the North Star is to minimize the owner's friction to run her ENTIRE store (site,
store, sales) by chatting with her Custom GPT — which should be able to do what an agent like Claude
Code (+ skills/MCPs) could. Hunt integration gaps THROUGH this lens: a locally-correct edit that, in the
wider system, makes a by-chat capability fail or leak. Structural limit: a GPT Action is JSON-only and
can't forward a pasted file → media comes by URL (the GPT fetches a Drive/direct link).

CONTEXT
- Read EVERLASTINGS_STORE.md FIRST, then v1_5_8_IMPLEMENT.md. A FRESH agent will apply Part 2 to this
  repo and test on the dev preview.
- Landmines (validate against reality, not training data):
  1. INSERT trigger notify_stripe_sync (migration 20260421000003) is a SQL TRIGGER, not a Studio webhook,
     AFTER INSERT only; drafts skip it; Stripe created only at publish.
  2. Public reads go via the anon client + RLS; is_test is filtered in main.js (Phase 4.5), not RLS;
     preview reads go through the service-role API. (products.ts/checkout.ts = service-role;
     product-feed.ts = anon, now also explicitly filtering is_published/archived_at; admin via the API.)
  3. Stripe-lock: checkout_* + sku frozen after publish; PRICE rotates in place (new Price on the same
     product; live immediately; same slug/URL) — and the rotation ORDER (create→write→deactivate) must
     keep the product buyable through any single Stripe failure.
  4. Archive = archived_at + Stripe active:false (reversible); hidden everywhere public; order FK-protected.
  5. No new functions: publish/coupon/archive/discard are ?_action= rewrites; uploadImage's URL branch +
     charge.refunded edit existing files; purge is pg_cron; cap 11/12.
  6. is_test is never user-editable.
  7. (G1) The published-edit guard rejects only CHANGED frozen fields — the admin (re-sending the full
     payload incl. unchanged checkout_* + price) edits a published product's copy without a 400; a price
     CHANGE is accepted + rotated, not 400'd.
  8. (G4/G5, already-handled — don't re-flag) product-feed.ts already filters .eq('is_test', false) and
     now also .eq('is_published', true).is('archived_at', null); shop.js / homepage.js / product.js +
     renderRelatedProducts all route through main.js getProducts/getProductBySlug.
  9. (NEW — D1) uploadImage URL branch reuses the same pipeline (multipart still works for admin/curl).
  10. (NEW — D2) charge.refunded sets orders.status='refunded' on full refund, matched by
     stripe_payment_intent.

ANGLE C — integration / system fit (through the lens). Hunt for gaps where an edit is locally correct
but breaks the wider system OR a by-chat capability:
- MEDIA-BY-CHAT END TO END (D1): can the GPT actually get Em's photo/MP4 onto the CDN from a chat? Trace
  uploadImage({url,slug,role}) → server fetch (Drive normalization; non-direct link → friendly 400 the
  GPT relays) → Cloudinary→R2 → the returned URL flowing into images[]/thumbnail/checkout_image/
  seo_thumbnail/media[] → createProduct/editProduct. Confirm the multipart path (admin/curl) still works
  and the dual intake feeds the SAME size/mime/transform logic (incl. the 50MB MP4 passthrough).
- is_test scoping holds across every new read/write/action (preview, publish, coupon, archive, discard,
  list, upload, refund) AND the public main.js path filters is_test (1.11) — prod shows only live,
  non-test, non-archived rows; the dev preview still renders a published test product; the Meta feed
  never emits a test/draft/archived row.
- Price rotation integration (Q1 + ordering): after a published price change, checkout.ts charges the NEW
  price; the old Price is active:false; a Session opened before the change keeps its locked price; the DB
  price + stripe_price_id stay consistent; and a mid-rotation Stripe failure leaves the product buyable
  (DB untouched, old price still active+referenced) — never a live row pointing at an inactive Price.
- Refund integration (D2): a full dashboard refund → charge.refunded → orders.status='refunded' (the GPT
  then reports it truthfully via listOrders); a duplicate event is de-duped by the existing idempotency
  claim; a partial refund doesn't corrupt status. Confirm the branch sits before the no-op guard and
  never 5xx's after the claim.
- The admin path (G1 + #7): admin create AND edit of a PUBLISHED product go through the same draft→publish
  gate and must NOT 400 on unchanged frozen fields; a price change rotates live + stages copy as a draft
  in the same save; a price-ONLY change shows "live now — nothing to publish" and no Publish button.
- Idempotency / state machine: re-publishing; publishing a draft with no changes; a stale/rotated
  preview_token; edit staged then re-edited; discard (auth-only) then re-edit; archiving then unarchiving;
  publishing an archived piece (409); Studio INSERT vs flag-flip UPDATE (the zombie case).
- The RLS change vs. every reader (anon client, product-feed, homepage, checkout, admin, GPT) — does
  anything that should see drafts/archived now can't, or vice-versa?
- Coupon isolation: listCoupons/deactivateCoupon touch only owner_sale-tagged codes, never the system
  cart-recovery/newsletter promotion codes (api/cart.ts, api/subscribe.ts); pagination still excludes
  system codes; a product-scoped coupon on a draft (no stripe_product_id) is handled/guided.
- Resource caps (11/12 functions), conventions (cleanUrls rewrites must drop .html; CORS per-route),
  AR conflicts, and stale pointers (docs that still say "GPT can't edit" / "create auto-syncs Stripe" /
  "adding a product makes it live immediately" / "price change = new product" / "upload by chat" /
  "refunds don't reflect" after Phases 9–10b).

OUTPUT
- Ranked list: location, the integration risk, the concrete fix.
- The single most important fix.
- One-line verdict: READY TO BUILD or NEEDS ANOTHER PASS.
```
