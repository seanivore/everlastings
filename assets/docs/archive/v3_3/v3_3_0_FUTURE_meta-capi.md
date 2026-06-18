# FUTURE spec — Meta Conversions API (server-side Purchase events)

> **Not part of the v3.3.0 build.** This is a "what's needed" spec to fold into a later exclusively-executable IMPLEMENT. The v3.3.0 executor should ignore it.

## The gap

The server-side Meta Conversions API (CAPI) code path **already exists and is guarded** — it just never fires because its two env vars are unset in every scope.

- `api/webhook.ts:259` → `if (process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN) { … }` posts a Purchase event to `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events`, with `access_token` and (in test mode) `test_event_code` from `META_TEST_EVENT_CODE`.
- `vercel env ls` shows **no** `META_PIXEL_ID`, `META_ACCESS_TOKEN`, or `META_TEST_EVENT_CODE` in any scope → the guard is always false → no server events.

So the build work is small; the real blocker is **obtaining the credential**, and that's where the original instruction was stale.

## Why it stalled (the credential)

The original note assumed Meta hands out a plain long-lived "access token / key." It doesn't anymore — the Business Center / Events Manager flow now issues a **System User access token** (or a Conversions-API-specific token generated in Events Manager), scoped to the dataset/pixel, not a simple key you copy once.

**Do not hardcode a click-path here** — Meta's UI moves. At build time, confirm the current path (it's some variant of: Business Settings → Users → **System Users** → add/select a system user → **Generate token** scoped to the app + the pixel/dataset with the events permission; *or* Events Manager → the dataset → **Settings → Conversions API → Generate access token**). Capture the actual steps you used in the build report so the next person isn't guessing.

## What's needed (executable later)

1. **Obtain** a long-lived System User access token with permission on the pixel/dataset, plus the **pixel (dataset) ID**.
2. **Set env vars via the Vercel CLI** in all scopes (Production + Preview + Development):
   - `META_PIXEL_ID`
   - `META_ACCESS_TOKEN`
   - `META_TEST_EVENT_CODE` (optional — only used when `isTest`; lets you watch events land in Events Manager → Test Events on the preview before going live).
3. **No code change required** for the basic path — the guard flips true and Purchase events start firing. Verify in Events Manager → Test Events (preview) then live traffic.

## Worth deciding at build time

- **Graph version:** the code pins `v19.0` (`webhook.ts:265`). Confirm it's still supported when you wire this; bump if Meta has deprecated it.
- **Client-side Pixel:** server CAPI is separate from the browser Pixel. Confirm whether a client-side Pixel is wired in the pages (the `_components.html` styleguide references a `meta-pixel-init` slot) and whether you want event **deduplication** (shared `event_id`) between the browser Pixel and the server CAPI event to avoid double-counting Purchases.
- **Event coverage:** today only Purchase fires server-side. Decide if you also want server-side `InitiateCheckout` / `AddToCart` (the browser Pixel may already cover those).
- **Data hashing:** if you start sending customer email/name for match quality, Meta requires SHA-256 hashing of PII — add that before sending any user identifiers.
