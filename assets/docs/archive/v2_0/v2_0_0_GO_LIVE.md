# Go-Live — ship the current store to production (`main`)

Ships the current, tested version of the store (live on the `dev` preview) → `main` / production, tagged **`v2.0.0`** (the repo's first tag). This is **independent of the v3.3.0 build**, which keeps going on `dev` and ships the same way later. Versioning is **git-tag-only** (there is no `package.json` version to bump).

> **Heads-up on the merge:** `main` is *not* a clean fast-forward from `dev` — `main` carries one older README commit (`ff4829a`, a v1.4.9-era showcase draft) and `dev` is ~313 commits ahead. **dev's README is the current public-facing v2.0 version** (confirmed — already rewritten for launch), so we **overwrite** `main` with `dev` (dev's README wins, main's older draft is discarded). That's a force-push, handled in §2.

---

> If we end up needed to update any of the secrets in Vercel because we can't confirm them, I don't want to add them as being security blocked any more. I am the only one with access to Vercel and I want to be able to copy the keys from that resource in the future instead of making new keys every time we're unsure of the values.

---

## 1. Pre-flight — do these first (dashboards / setup)

Set production env + services **before** pushing, so the production deploy doesn't go out with missing keys.

- [ ] **Content placeholders cleared** — `grep -rn 'PLACEHOLDER:' . --exclude-dir=node_modules --exclude-dir=.git` returns **0**.
- [ ] **Live Stripe keys** in Vercel **Production** env scope — secret/restricted key (`sk_live…` / `rk_live…`), publishable key, and the **webhook signing secret** for the live endpoint.
- [ ] **Live-mode coupon bootstrap** — recreate any system/owner coupons in live mode (test-mode coupons don't carry over).
- [x] **`charge.refunded` on the live webhook endpoint** — done (you mirrored the test-mode config).
- [ ] **Point the GPT at production** — production URL in the Action schema `servers:` + the **Production** `PRODUCT_API_KEY` (not the preview key). Confirm Web Browsing stays ON.
- [ ] **Admin logins** — add the remaining admins in Supabase Auth.
- [ ] **Stripe receipt / branding** — set the business name/branding on emailed receipts.
- [ ] **DNS** — point the custom domain at the production deployment. (The prod custom domain is unprotected by design; Preview keeps Deployment Protection.)
- [x] **Docs current** — `EVERLASTINGS_STORE.md` / `README.md` reflect the shipped state; SESSION footers done.

---

## 2. Ship — `dev` → `main` (overwrites main's README, per your call)

First make sure `dev` is clean: **commit or stash any in-progress work** (otherwise uncommitted changes follow you onto `main` during the checkout). Then, from the repo root:

```
git fetch origin && git checkout main
git reset --hard dev                       # main := dev (discards main's README-only ff4829a)
git push --force-with-lease origin main     # safe overwrite — refuses if origin moved under you
git tag v2.0.0 && git push origin v2.0.0    # git-tag-only versioning — the repo's first tag
git checkout dev                            # back to dev to keep building v3.3.0
```

- `--force-with-lease` overwrites remote `main` but **refuses** if someone else pushed since your last `fetch` (safer than `--force`).
- After this, `main == dev`; Vercel deploys `main` → production.
- `dev`'s README is the public version (the v2.0 showcase) — it replaces main's older `ff4829a` draft, which is what you want.
- The launch tag is **`v2.0.0`** (your call — simple, the repo's first tag).

---

## 3. After the push — verify

- [ ] Production URL loads; a product page + `/shop` render; no console errors.
- [ ] A **real** (live-mode) test purchase end-to-end → order appears in /admin → tracking email sends.
- [ ] A live refund in Stripe flips the order to `refunded` (the live webhook).
- [ ] The GPT (pointed at production + prod key) can list/create against the live store.

---

## 4. After this — the v3.3.0 build (full runbook in its own doc)

The v3.3.0 build happens on `dev` and is mostly hands-off until each piece is ready to bless or deploy. **Your full, chronological build + test runbook is `assets/docs/archive/v3_3/v3_3_0_HUMAN_STEPS.md`** — the migration you run by hand, the GPT re-paste, the homepage renders to bless, the preview test-env setup, and the re-ship. The short version:

- **One GPT, one server URL — you repoint it three times.** Now (this go-live) → **production**. To test v3.3.0's new Actions → **preview**. After v3.3.0 ships → **production** again. While it points at preview, manage the live store via /admin (not the GPT), so keep that test window tight.
- **GPT builder re-paste** — when the refund + chat-attach Actions land, re-paste the updated Action **schema** + **Instructions** into the GPT (test against **preview** first; prod on the next ship).
- **Bless the homepage renders** — the Lottie title write-on + the old-film hero MP4 each ship a concrete default + a render-tune pass with your eye before going live.
- **Re-test parity** — refunds + coupons from **both** /admin and the GPT on the dev preview.
- Then ship `dev → main` again the same way (§2) when v3.3.0 is ready (next tag bumps from `v2.0.0`).
