# Your Steps — v3.3.0 Build (What You Handle, In Order)

The orchestrating agent does all the code. These are the points where it needs *you* — a dashboard, the Supabase CLI, the GPT builder, your render-tune eye — listed in the order they come up, with when each is needed. The agent's own checklist (the static gate + the 35 test items) lives in `v3_3_0_ADDENDUM_TESTING.md`; this is only the human half.

> **Hold one thing in your head the whole time: the Custom GPT has ONE server URL.** Right now (the v2.0.0 go-live) it points at **production**. To test v3.3.0's new Actions you repoint it to **preview**, then back to **production** after v3.3.0 ships. While it points at preview, the live store is GPT-dark — manage it from /admin, and keep the preview-test window tight.

---

## Before the Build

  + [ ] Confirm the build + test target is the **Vercel `dev` preview**, never localhost.
  + [ ] Confirm the preview env is set up for testing:
    - Stripe **test mode** keys in the Preview env scope
    - the **Preview** `PRODUCT_API_KEY`
    - `VERCEL_ENV` is not `production` (so `is_test` media keys stay under `test/…`)

---

## During the Build — the Database Migration (you run it)

The agent writes the WS6 migration but cannot apply it — the Supabase MCP rejects writes, so it's the CLI.

  + [ ] After the WS6 code lands, apply the migration with the Supabase CLI:
    - the agent writes `supabase/migrations/…_inventory_decrement.sql` (it renumbers the timestamp prefix if a newer migration already exists, so it stays last)
    - run `supabase db push` — this applies **only** the safe `record_sale` function
    - the destructive cutover `UPDATE quantity = 0` ships **commented out** on purpose, so the push never auto-zeroes stock
  + [ ] Do the cutover by hand (only matters on a real catalog — on the seeded test preview it's a no-op):
    - run the commented **SELECT** first; eyeball every row it lists
    - confirm each is genuinely *sold* (not a piece you paused-but-still-have-in-stock)
    - then uncomment the **UPDATE** and run it **once**

  When: as WS6 lands, before the inventory tests (TESTING 32–34).

---

## During the Build — Homepage Content (you + the skills)

Real content isn't a build gate — placeholders stand in — but these are the steps that turn the placeholders into the real thing, with your eye on them.

  + [ ] **Lottie title** — author + ship the write-on:
    - author the JSON in the `text-to-lottie` skill's Skottie harness
    - verify it once in lottie-web's SVG renderer before shipping (the harness is broader than the player)
    - drop it at `assets/lottie/hero-title-writeon.json`
  + [ ] **Old-film hero** — render + drop the graded MP4:
    - render with the `hyperframes` skill (`warm-grain`) → a versioned MP4 + a re-graded poster
    - drop both to the R2 CDN under a **versioned key** (per `reference_cdn_r2_drop` — the objects are `immutable, max-age=1yr`, so a new key, not an overwrite)
    - the agent makes the 3 URL edits in `index.html` to point at the new key

  When: during WS5; bless the look before the go-live (below).

---

## Before Testing — Preview Test-Env Setup

Do these once the build is deployed to the preview, before any GPT-surface or webhook test.

  + [ ] **Turn OFF Vercel Deployment Protection (SSO)** on the preview for the test run.
    - this is what lets Stripe webhooks + the GPT actually reach the preview
    - turn it back on when testing is done
  + [ ] **Seed 3 live test products** on the preview (the headline multi-cart refund test needs three different pieces in one cart).
  + [ ] **Subscribe `charge.refunded`** on the **preview** webhook endpoint:
    - Stripe Dashboard → Developers → Webhooks → the preview endpoint → **+ Add events** → `charge.refunded` → Save
    - without it, the refund reconciliation test (TESTING item 8) never fires
  + [ ] **Repoint the Custom GPT at the preview** (Em's account — walk her through it):
    - Action server URL → the **Preview** URL
    - auth → the **Preview** `PRODUCT_API_KEY`
    - confirm **Web Browsing is ON**
  + [ ] **Re-paste the GPT Action schema + instructions** into the GPT builder:
    - the build updated the schema (`refundOrder` + `uploadImages` + `expires_date`) and the instructions file (the Phase 3.9 text, 7788/8000)
    - paste both; test against preview first, production on the next ship

  When: after the preview deploy, before TESTING items that touch the GPT or the webhook.

---

## Render-Tune Blessings (your eye, on the live preview)

Design ships a concrete default, then your pass — like functionality, not frozen.

  + [ ] **/admin polish** — accent, spacing, type to taste on the live preview.
  + [ ] **Homepage** — bless the Lottie title write-on and the old-film hero grade.

  When: during/after WS4–WS5, on the preview.

---

## After v3.3.0 Is Tested + Blessed — Re-Ship + Restore

  + [ ] Re-run the go-live flow in `v2_0_0_GO_LIVE.md` §2 (`dev → main`); the next tag bumps from `v2.0.0`.
  + [ ] Confirm `charge.refunded` is on the **production** webhook endpoint (mirror of the preview step; it may already be done).
  + [ ] **Repoint the GPT back to production** — production URL + the **Production** `PRODUCT_API_KEY` — and re-paste the schema + instructions there.
  + [ ] **Re-enable SSO** on the preview if you turned it off.

  When: after sign-off, once v3.3.0 is verified on the preview.
