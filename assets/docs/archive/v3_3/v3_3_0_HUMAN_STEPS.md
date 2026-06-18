# Your Steps — v3.3.0 Build (batched at the end; no mid-build pauses)

The build runs start-to-finish on its own. The agent now owns the operational steps that used to land on you — applying the migration, seeding test data, the homepage assets, env + webhook config — and proves everything it can headlessly on the `dev` preview (its own 35-item plan lives in `v3_3_0_ADDENDUM_TESTING.md`). **Your involvement is batched for after the build deploys to the preview, and none of it stops the build.**

> **One thing to hold: the Custom GPT has ONE server URL.** Right now (the v2.0.0 go-live) it points at **production**. To test v3.3.0's new Actions you repoint it to **preview**, then back to **production** after v3.3.0 ships. While it points at preview, the live store is GPT-dark — manage it from /admin, and keep the preview-test window tight. (This is your end-of-build GPT step below.)

---

## The agent handles these now (used to be "your steps" — listed so you know they're covered)

  - Applies the **WS6 migration** itself via the linked Supabase CLI (`supabase db push` — the safe `record_sale` function only; the destructive cutover stays gated and is a no-op on test data).
  - **Seeds** the test products the refund + inventory tests need.
  - Ensures **`charge.refunded`** is on the preview webhook (adds it via the Stripe API if missing).
  - Produces the **homepage** Lottie title + old-film hero as concrete placeholders (renders, drops to R2, makes the 3 `index.html` URL edits).
  - Verifies **env scoping** (`vercel env ls`) — which you already confirmed is automatic per branch.

---

## Your part — after the build deploys to the preview (no rush, nothing mid-build)

  + [ ] **GPT check** — the one surface the agent can't drive (it's in Em's ChatGPT account):
    - repoint the GPT to the **Preview** URL + the **Preview** `PRODUCT_API_KEY`, confirm **Web Browsing is ON**;
    - re-paste the updated Action **schema** (`refundOrder` + `uploadImages` + `expires_date`) and **instructions** (the Phase 3.9 text);
    - spot-check the new actions in chat (issue a refund, make a coupon, attach an image). The agent has already proven these work via direct API calls — this just confirms the GPT-as-client.
  + [ ] **Design feedback** — whenever you like, comment on the homepage (Lottie title + old-film hero) and the /admin polish. The agent folds your notes — design is treated like functionality, not frozen.

---

## After you sign off

  + [ ] Re-ship `dev → main` + tag (the next bump from `v2.0.0`) per `v2_0_0_GO_LIVE.md` §2.
  + [ ] Repoint the GPT **back to production** (prod URL + the **Production** `PRODUCT_API_KEY`) and re-paste the schema + instructions there.

---

## Not part of this build (here so it isn't a surprise later)

  - The **real-catalog inventory cutover** (the one-time `quantity = 0` data-fix) only matters once there are real *sold* products in the live store. It's a no-op on the test preview, so it does not apply now. When it does, the agent runs the SELECT, surfaces the rows for your eyeball, and you approve the single UPDATE — that one stays gated to you on purpose.
