# Everlastings v1.4.3 Implementation Guide

**Version**: v1.4.3
**Status**: Phase 0 complete; implementation guide split into three track-specific guides for parallel orchestrator-agent execution. This file remains in place as the chronological landmark per `.agent/DEV_RULES.md`'s archive-by-design convention.
**Architecture**: Vercel + Supabase + Cloudflare R2 + Stripe + Cloudinary + Resend + Shippo
**Architecture Reference**: `assets/docs/EVERLASTINGS_STORE.md`
**Design Reference**: `assets/docs/BRAND.md`

---

## Document Split Notice (2026-04-29)

The original 4,188-line combined implementation guide was split into three self-sufficient, track-specific guides. Reference material that was previously consolidated in pre-track and post-track sections has been distributed inline into the track guide where it is actually used (e.g., Webhook Contract → Track A's `webhook.ts` section, Error States → Tracks B and C, GA4 events → Track C). Architecture-level reference (33-item Architecture Reference, Plain-English Glossary, Stripe Sync Rules) lives in `EVERLASTINGS_STORE.md`, which is auto-loaded into every orchestrator session via `.claude/CLAUDE.md`.

**Track guides:**

  - [`v1_4_3_A_IMPLEMENT.md`](./v1_4_3_A_IMPLEMENT.md) — Foundation + Backend (~2,400 lines)
  - [`v1_4_3_B_IMPLEMENT.md`](./v1_4_3_B_IMPLEMENT.md) — Frontend Design (~655 lines)
  - [`v1_4_3_C_IMPLEMENT.md`](./v1_4_3_C_IMPLEMENT.md) — Integration (~980 lines)

**Companion files:**

  - [`v1_4_3_INIT_PROMPTS.md`](./v1_4_3_INIT_PROMPTS.md) — Track-specific orchestrator initiation prompts
  - [`v1_4_3_META_SETUP.md`](./v1_4_3_META_SETUP.md) — Step-by-step Meta Business Page + Pixel + Conversions API setup
  - [`v1_4_3_SHIPPO_REPLY.md`](./v1_4_3_SHIPPO_REPLY.md) — Drafted reply to Shippo Trust & Safety verification email
  - [`v1_4_3_PREP.md`](./v1_4_3_PREP.md) — Pre-implementation prep notes (the document that triggered this split)

**Cross-track sequencing:**

```
Phase 0 ✓ → Track A (backend) ─┐
                               ├──→ Track C (integration) → Launch
            Track B (frontend) ┘
```

A and B run in parallel (independent sessions). C cannot start until both A's `A2 API endpoints` and B's full set of placeholder pages are complete. C ends with the `dev` → `main` PR, which is the launch gate.

---

## Phase 0 Status (2026-04-29)

Verified via bash inspection on 2026-04-29: branches `dev` + `main` both local and remote, `everlastings` branch deleted, all 4 root config files present (`vercel.json`, `tsconfig.json`, `package.json`, `.env.example`), 3 schema migrations staged in `supabase/migrations/`, brand assets in `assets/brand/`, no premature `api/` or `admin/` or `assets/css/` or `assets/js/` directories (correct — Tracks A and B will create these).

### Done (Pass 1 — Service accounts + keys)

- [x] **Repo scaffolding** — `.env.example`, `.env.local`, `.gitignore` updated
- [x] **Supabase** — DB password rotated, Auth users added (admin/Sean/Emy), keys loaded to `.env.local` + Vercel Production/Development scopes, CLI installed + linked (`rvnxftbfeaxymhzxxhjm`)
- [x] **Vercel** — account, login, `vercel link --yes`, project visible on dashboard
- [x] **Cloudinary** — account, `CLOUDINARY_URL` loaded
- [x] **Stripe** — account, test keys + receipt emails enabled + test webhook secret captured + loaded to Development scope; live keys saved to secure notes for Pass 2
- [x] **Cloudflare R2** — `everlastings` bucket with custom domain `cdn.everlastingsbyemaline.com`, S3-format API token (R2-specific path, not the `cfat_` form), all 5 vars loaded
- [x] **Resend** — account, domain verified, `RESEND_API_KEY` + `RESEND_FROM_EMAIL` + `RESEND_REPLY_TO_EMAIL` loaded
- [x] **Shippo** — Starter (free tier, 30 USPS labels/mo); v1 uses web UI only
- [x] **Google Analytics** — GA4 property created, `GA4_MEASUREMENT_ID` loaded, Search Console verified, Google Signals on
- [x] **Product API** — Development key generated and loaded

### Done (Pass 2 — Branch reconciliation)

- [x] **Branch reconciliation** — `everlastings` merged → `main`, `dev` created from `main`, `everlastings` deleted (verified: `git branch -a` shows only `dev` + `main` locally and on origin)
- [x] **Vercel Production Branch** — set to `main` in Vercel dashboard (confirm visually if uncertain)

### Done (Pass 3 — Agent bootstrap, partial)

- [x] **Config files in repo root** — `vercel.json`, `tsconfig.json`, `package.json` (last session's agent created these; bash inspection confirmed presence on 2026-04-29)
- [x] **Schema migrations staged** — `supabase/migrations/20260421000001_initial_schema.sql`, `..._rls_policies.sql`, `..._stripe_sync_webhook.sql` present (last session's agent staged these)

### Deferred — non-blocking for v1.4.3 implementation

These items are intentionally not done and are addressed elsewhere or at a later phase. None block the parallel implementation tracks.

- [ ] **Emy Supabase member access** — waiting on Emy to accept Auth invite + create Supabase account; Sean adds via Project Settings > Members. Tracked in `assets/docs/CLIENT_ASK_LIST.md` § 0.
- [ ] **USPS account + Shippo linking** — deferred to v1.1+ when label volume justifies; v1 uses Shippo's free Starter UI. Reply to Shippo Trust & Safety queued in [`v1_4_3_SHIPPO_REPLY.md`](./v1_4_3_SHIPPO_REPLY.md).
- [ ] **Meta Business assets + tokens** — `META_ACCESS_TOKEN` + `META_PIXEL_ID` not yet generated. Step-by-step setup guide produced as [`v1_4_3_META_SETUP.md`](./v1_4_3_META_SETUP.md). Sean to execute when convenient; Tracks A/B can proceed without these (placeholder env vars OK during dev).
- [ ] **Stripe live keys + live webhook (Production scope)** — addressed in Track C C4 launch sequence (live keys go in only at launch). Test keys are sufficient for dev + preview deployments throughout Tracks A, B, C.
- [ ] **Stripe coupon bootstrap** — `api/_bootstrap/coupons.ts` script does not exist yet; Track A creates it during A1 Stripe section and runs it once. Idempotent.
- [ ] **Supabase DB webhook configuration** — Studio UI step (Database > Webhooks → POST to `/api/stripe-sync` on `products` INSERT). Track A A1 verifies/creates this.
- [ ] **Preview CORS smoke test** — Track A A4 runs this once API endpoints exist. Cannot run earlier.
- [ ] **Preview-scope env var backfill** (Supabase, Stripe test, Cloudinary, R2, Resend, GA4, Meta, Product API Preview key) — Track A A1's first action is `vercel env ls` to confirm. If gaps are found, the agent fills them inline using the branch-specific `vercel env add VAR preview dev --value "$val" --yes` form (the form that works with the Claude-Code Vercel plugin).

### Pass 3 verification handoff to Track A A1

When the Track A orchestrator starts, its first action is:

```bash
git branch -a
ls vercel.json tsconfig.json package.json .env.example
ls supabase/migrations/
vercel env ls
```

Plus a Supabase MCP `list_tables` call to confirm whether `supabase db push` has been run against the linked project. If the Pass 3 items above show as not-yet-applied, A1 applies them inline before proceeding to A2 endpoint work.

---

## What changed between v1.4.0 → v1.4.3

The v1.4.0 architecture is unchanged — same 8 tables, same data flow, same source-of-truth hierarchy. v1.4.3 captures three operational evolutions:

1. **Phase 0 fully executed.** Last session's agent completed Pass 1, Pass 2 branch work, and the staged-files portion of Pass 3. Remaining Pass 3 items are agent tasks that fold naturally into Track A's A1 verification.
2. **Implementation guide split into self-sufficient track guides** with reference material distributed inline (so orchestrator agents need no external lookups during execution).
3. **Architecture Reference (33 items), Plain-English Glossary, and Stripe Sync Rules** moved to `EVERLASTINGS_STORE.md` as the canonical reference (auto-loaded in every session). Track guides cite these as "AR #N".

---

## Reference Documents

  - **Architecture primer**: `assets/docs/EVERLASTINGS_STORE.md`
  - **Brand guide**: `assets/docs/BRAND.md`
  - **Workflow protocol**: `.agent/DEV_RULES.md`
  - **Agent instructions**: `.agent/AGENTS.md`
  - **Project README**: `README.md`
  - **Mobile design specs**: `.agent/2026_MOBILE_DESIGN_SPECS.md`
  - **Product Protocol**: `assets/docs/PRODUCT_PROTOCOL.md`
  - **Client ask list**: `assets/docs/CLIENT_ASK_LIST.md`

---

*Originally drafted 2026-04-16 as `v1_4_2_IMPL_GUIDE.md`; renamed and revised through `v1_4_3_IMPLEMENT.md` over several Phase 0 sessions; condensed and split 2026-04-29 in preparation for parallel implementation tracks.*
