# v1.4.3 — Meta Setup: Pixel + Conversions API for Everlastings

**Goal:** Get a `META_PIXEL_ID` and a long-lived `META_ACCESS_TOKEN` (system-user token) so the website can fire browser events (Pixel) and server-side events (Conversions API / CAPI) for Emaline's handcrafted miniature collectibles.

**Setup order (do not skip):** Personal account → Facebook Page → Instagram Business → Business Portfolio → Pixel → System User Token → Domain Verification → (later) Page transfer.

**Before you start, have ready:**
- Sean's personal FB account logged in on a desktop browser (transfers cannot be done on mobile).
- A phone capable of receiving SMS or running an authenticator app (2FA will be enforced before you can finish CAPI setup).
- DNS access for `everlastings.com` (or whatever domain ships) — needed for Step 6.
- Business name spelled exactly as it should appear publicly: "Everlastings by Emaline" (or final version).
- Emaline's email for the eventual Page transfer (Step 7) — she does NOT need an account ready right now.

**Reality check on Meta UI in 2026:** Business Manager and Business Suite have been merged/renamed multiple times. The backend is now officially called **Meta Business Portfolio**, but the URL is still `business.facebook.com` and you'll see "Business Suite," "Business Manager," and "Business Portfolio" used interchangeably across Meta's own help pages. Treat them as the same product. Pixels are now wrapped inside **Datasets** — when docs say "Pixel ID" they mean the Dataset ID; they are the same number.

---

## 1. Account / Page Creation

**Why:** A Page is the prerequisite asset for everything else (Pixel, ad account, IG link, CAPI). It's owned by Sean's personal account at first; ownership moves to Emaline in Step 7.

1. **Log into Sean's personal account** at `https://facebook.com` on a desktop browser.
2. **Pre-flight: confirm 2FA is on.** Click profile photo (top right) → Settings & privacy → Settings → Accounts Center → Password and security → Two-factor authentication. If it's not on, turn it on now (authenticator app preferred over SMS). If you skip this you'll hit a wall in Step 5.
3. **Create the Page.** Go directly to `https://facebook.com/pages/create`. (If left-nav shows a "Pages" icon, that also works — but the direct URL skips the redesign roulette.)
4. **Fill the form:**
   - **Page name:** `Everlastings by Emaline` (exact business name — this drives search).
   - **Category:** start typing "Arts & Crafts Store" or "Gift Shop" and pick the suggestion. You can edit this later.
   - **Bio (optional, ≤ 255 chars):** short description. Skip if not finalized — you can edit anytime.
5. Click **Create Page**.
6. **Skip** the prompts to add profile photo / cover / WhatsApp / boost — those can wait. Click **Save** or **Done** to land on the Page.
7. **Capture the Page URL** (e.g. `facebook.com/everlastingsbyemaline`) — you'll need it later.

**If you see Y instead of X:**
- If `/pages/create` shows a "Choose a Page type" splash with **Business or Brand** vs **Community or Public Figure** — pick **Business or Brand**. Meta sometimes A/B tests this splash; sometimes it's gone entirely.
- If you're dropped straight into the **New Pages Experience** with no role selection screen — that's expected. New Pages Experience is the only option for new Pages since 2022. You will NOT see "Admin/Editor/Moderator" roles anymore; access is now **Full Control / Partial Control** (relevant in Step 7).
- If you see a "Switch into Page" prompt and your personal news feed disappears — that's also expected. To get back to your personal feed: profile photo → **See all profiles** → pick Sean's personal profile.

**Verification requirements:** None at Page creation. Meta only asks for ID later if you (a) apply for a verified badge, or (b) trip a security flag during ad spend or business verification.

**Sources:**
- https://www.facebook.com/business/help/473994396650734
- https://www.facebook.com/help/104002523024878
- https://www.socialmediaexaminer.com/updating-to-the-new-facebook-page-experience-what-you-need-to-know/

---

## 2. Instagram Business Profile

**Why:** Linking IG to the Page lets you (a) run IG ads from the same ad account, (b) manage IG DMs in the Page inbox, and (c) include IG events in the Conversions API dataset.

**Prerequisites:**
- The IG account must be **Professional** (Business or Creator). A personal IG account cannot be linked to a Page for ads/CAPI purposes. **Use Business**, not Creator — Creator hides some shopping features.
- Sean must be admin of the Page (he already is, since he just created it).

**If Emaline has no IG yet (most likely):**
1. On a phone, install Instagram and create a new account with an email Sean controls (or a shared inbox). Username should match `@everlastingsbyemaline` if available.
2. In the IG app: profile (bottom right) → hamburger menu (top right) → **Settings and privacy** → scroll to **For professionals** → **Account type and tools** → **Switch to professional account** → choose **Business** → pick category (Arts & Crafts) → fill contact info.
3. During the "Connect to Facebook" step in that flow, sign in with Sean's personal FB credentials and select the **Everlastings by Emaline** Page. This links them in one move.

**If the IG already exists and is personal:** same as above, just skip the create step.

**To verify or fix the link from desktop (Meta Business Suite path):**
1. Go to `https://business.facebook.com`.
2. Top-left: make sure the Page selector shows **Everlastings by Emaline**.
3. Left nav → **Settings** (gear icon, bottom-left). If you don't see a gear, click **All tools** (hamburger) → Settings.
4. Settings → **Linked accounts** (or **Accounts** → **Instagram accounts** depending on which redesign variant you land on).
5. Click **Connect** → enter IG username/password.

**If you see Y instead of X:**
- If Settings shows **"Business assets"** instead of **"Linked accounts"**, navigate Business assets → Instagram accounts → Add. Same outcome.
- If the in-app IG flow refuses to connect to the Page ("This Page is already connected to another account"), it usually means a half-finished connection from a previous attempt. Disconnect from `business.facebook.com` → Linked accounts first, then retry.

**Verification requirements:** IG may ask for SMS verification when switching to Professional. Have the phone ready.

**Sources:**
- https://www.facebook.com/business/help/connect-instagram-to-page
- https://www.facebook.com/business/help/620548115562686
- https://www.facebook.com/business/help/428687951269163

---

## 3. Meta Business Portfolio (formerly Business Manager / Business Suite backend)

**Why:** The Business Portfolio is the container that owns the Pixel, Ad Account, and System User. Without it you cannot create a system-user token. You also need it for domain verification and to assign CAPI permissions.

**The naming mess (ignore this and just follow steps):** "Business Manager," "Business Suite," and "Business Portfolio" are all the same thing now. The product lives at `business.facebook.com`. Meta calls the backend "Business Portfolio" in 2026 docs but most UI strings still say "Business Suite."

1. Go to `https://business.facebook.com/overview`.
2. If you've never created a portfolio: you'll see **Create account** or **Create a business portfolio**. Click it.
3. Fill in:
   - **Business name:** `Everlastings by Emaline LLC` (use the legal LLC name — this is what shows on receipts and ad disclosures).
   - **Your name:** Sean's name.
   - **Business email:** an email Sean controls. Meta sends a confirmation link.
4. Click **Submit**. Confirm via the email link.
5. **Add the Page to the portfolio.** Left nav → **Settings** (gear) → **Business assets** (or **Accounts** → **Pages** depending on variant) → **Add** → **Add a Page** (NOT "Request access" or "Create new"). Enter the Page name or URL → confirm. Because Sean is the Page admin, this is instant; no approval needed.
6. **Confirm portfolio 2FA enforcement.** Settings → **Security Center** (or **Business portfolio info** → Security) → set **Two-factor authentication** to **Admins only** at minimum. This will be required when generating the system-user token in Step 5.

**If you see Y instead of X:**
- If the create flow says **"You already have a business portfolio"** — skip the create step; you already have one. Pick it from the dropdown at top-left of `business.facebook.com`.
- If "Add a Page" hangs forever — refresh and retry. If it still fails, log out, log back in, and use **Settings → Pages → Add → Claim a Page**.
- "Business Settings" (`business.facebook.com/settings`) is the legacy backend URL and **still works**. If the modern Business Suite UI confuses you, just bookmark `business.facebook.com/settings` and use the older settings panel directly.

**Verification requirements:** Email confirmation. ID is NOT required to create a portfolio — it's only required if you later apply for **Business Verification** (needed for branded content, some commerce features, advanced API access — NOT for basic Pixel + CAPI).

**Sources:**
- https://www.facebook.com/business/help/2058515294227817
- https://www.facebook.com/business/help/865384580786591
- https://www.leadsie.com/blog/meta-business-manager-vs-meta-business-suite-differences

---

## 4. Meta Pixel Creation (get the `META_PIXEL_ID`)

**Why:** The Pixel ID is needed in browser-side JS to fire `PageView`, `AddToCart`, `Purchase` events. The same ID (now called Dataset ID) is also referenced by the server-side CAPI calls so events deduplicate.

1. Go to `https://business.facebook.com/events_manager2` (Events Manager).
2. Make sure the Business Portfolio at top-left is **Everlastings by Emaline LLC**.
3. Left nav → **Connect data** (or **Connect Data Sources** — green button on Overview). If you see **Data Sources** in the left nav with no "Connect" CTA, click **Data Sources** → **+ Add** → **Connect data source**.
4. Choose **Web** → click **Connect**.
5. Choose **Meta Pixel** as the connection method (NOT "Conversions API only" — you want both browser + server, and creating from the Pixel side gives you both).
6. **Name the pixel:** `Everlastings Website Pixel`.
7. **Enter your website URL:** `https://everlastings.com` (or whatever the production domain will be; you can change later).
8. Click **Continue** → **Create pixel**.
9. **Copy the Pixel ID immediately.** It's a 15–16 digit number shown at the top of the new Dataset page. This is your `META_PIXEL_ID`. Paste into:
   - Local `.env.local` as `META_PIXEL_ID=<id>` and `NEXT_PUBLIC_META_PIXEL_ID=<id>` (browser-side needs the `NEXT_PUBLIC_` prefix in Next.js).
   - Vercel project → Settings → Environment Variables → add for **Development**, **Preview**, **Production** scopes.
10. **Skip** the "Install code yourself / Use a partner integration" wizard for now — the code lives in the website repo and gets injected in the layout.

**If you see Y instead of X:**
- If the screen shows **Datasets** instead of **Pixels**, you're on the right page. Meta renamed Pixels → Datasets in 2024; the Dataset ID is the same number used in `fbq('init', '<id>')`.
- If you don't see **Connect data** because the left nav is collapsed, click the hamburger or look for a green **+** button. Or jump straight to `https://business.facebook.com/events_manager2/list/dataset` and click **Add new data source**.
- If you accidentally created the Pixel under the wrong Business Portfolio, you cannot move it. Delete it and create a new one under the right portfolio.

**Verification requirements:** None for Pixel creation itself.

**Sources:**
- https://www.facebook.com/business/help/952192354843755
- https://www.shopify.com/blog/72787269-relax-advertising-on-facebook-just-got-a-lot-easier
- https://benly.ai/learn/meta-ads/pixel-setup-guide

---

## 5. Long-Lived Access Token for Conversions API (`META_ACCESS_TOKEN`)

**Why:** Server-side CAPI calls need an access token. User tokens expire in 60 days and are tied to one human's session — bad for production. **System User tokens can be set to never expire** and are tied to the Business Portfolio, not a human. This is what you want.

There are two paths. Path A is the new "easy button" Meta added in 2023 inside Events Manager. Path B is the classic way through Business Settings. **Path B is more reliable for never-expiring tokens; Path A sometimes generates tokens that quietly expire.** Do Path B.

### Path B: System User in Business Settings (recommended)

1. Go to `https://business.facebook.com/settings` (the legacy Business Settings URL — still works and is clearer than the Suite redesign).
2. Confirm the top-left selector shows **Everlastings by Emaline LLC**.
3. Left nav → **Users** → **System Users** → click **Add** (top of the page).
4. **Name:** `everlastings-capi-server`. **Role:** **Admin** (you need Admin so the token can manage the pixel asset; Employee role works too but has more friction). Click **Create System User**.
5. (You may be prompted to accept Meta's non-discrimination policy — accept.)
6. **Assign assets to the system user.** With the new system user selected → click **Add Assets** (top right of system user detail).
   - **Pixels** (or **Datasets**) → check `Everlastings Website Pixel` → toggle **Manage Pixel** ON → **Save Changes**.
   - (Optional but recommended for future ad-tracking flexibility) **Pages** → check `Everlastings by Emaline` → toggle **Manage Page** ON.
   - (Optional, only if/when you create an ad account) **Ad Accounts** → toggle **Manage ad account** ON.
7. **Generate the token.** Back on the system user detail page → **Generate New Token**.
   - **App:** the system user dialog requires picking an "app" to scope the token. If you don't see a Meta app listed: open `https://developers.facebook.com/apps` in another tab, click **Create App** → **Other** → **Business** → app name `Everlastings CAPI` → create. Return to Business Settings → System Users → Generate New Token → pick `Everlastings CAPI`.
   - **Token expiration:** choose **Never**.
   - **Scopes (check these boxes — exact names as shown):**
     - `ads_management` — required for the CAPI to write events to a pixel.
     - `business_management` — required for system-user token validation.
     - `pages_read_engagement` — needed if/when you fire Page-context events; cheap to include now.
     - `pages_manage_metadata` — only needed if you'll programmatically manage Page details. Skip unless you know you need it.
   - Click **Generate Token**.
8. **Copy the token immediately.** It's a long string starting with `EAA...`. This is your `META_ACCESS_TOKEN`. **Meta will not show it again.** Paste into:
   - `.env.local` as `META_ACCESS_TOKEN=<token>` (NO `NEXT_PUBLIC_` prefix — server-only).
   - Vercel → Settings → Environment Variables → **Production** + **Preview** scopes (NOT Development unless Sean wants to fire events from local dev). Mark as **Sensitive**.
9. **Test the token before declaring victory.** From a terminal:
   ```bash
   curl -G "https://graph.facebook.com/v19.0/<META_PIXEL_ID>" \
     -d "access_token=<META_ACCESS_TOKEN>"
   ```
   Should return JSON with the Pixel name. If it returns an `OAuthException`, the token is wrong or scopes are missing — regenerate.

### Path A (fallback): Events Manager auto-generated token

Use this only if Path B's app-creation step is blocking you.

1. Events Manager → pick the Pixel → **Settings** tab → scroll to **Conversions API** section → click **Generate access token** (under "Set up manually" / "Implementation via direct integration").
2. Copy the token from the popup. **One-time display.**
3. This auto-creates a hidden Conversions API system user behind the scenes. Tokens generated this way are also long-lived but Meta does not formally guarantee "never expires" — be ready to regenerate if events stop firing months from now.

**If you see Y instead of X:**
- If **Generate access token** is missing from the Pixel Settings page: that link only shows for users with **Developer** role on the Business Portfolio. Go to Business Settings → Users → People → find Sean → toggle **Developer** access ON. Reload Events Manager.
- If the System User dialog has no **Token expiration** dropdown: that means you didn't create an app yet (Step 7 sub-step). The "Never" option only appears after a Meta app is selected.
- If the scope checkboxes are listed under different headings (e.g., "Ads" vs "Business") — same scopes, different grouping. Just match the strings.

**Verification requirements:** 2FA on Sean's personal account is enforced before token generation. Have the authenticator open.

**Where to paste in code:** server-side code path — typically a `lib/meta-capi.ts` or `app/api/track/route.ts` that reads `process.env.META_ACCESS_TOKEN` and POSTs events to `https://graph.facebook.com/v19.0/<META_PIXEL_ID>/events`. NEVER expose this to client code. NEVER commit to git.

**Source conflict flag:** Path A (Events Manager direct) and Path B (Business Settings system user) both generate working CAPI tokens. Some 2026 third-party guides (Cometly, Funnelfox) recommend Path A for speed; Meta's own developer docs and official Marketing API guides still describe Path B as the "production" approach. **Going with Path B because:** explicit "Never" expiration, clearer permission audit trail, and the system user survives if Sean's personal account is ever locked.

**Sources:**
- https://developers.facebook.com/docs/marketing-api/conversions-api/get-started/
- https://developers.facebook.com/docs/business-management-apis/system-users/install-apps-and-generate-tokens/
- https://docs.getelevar.com/docs/how-to-create-facebook-conversion-api-token
- https://developers.facebook.com/docs/marketing-api/guides/smb/system-user-access-token-handling/v3.0

---

## 6. Domain Verification

**Why:** Required for **Aggregated Event Measurement (AEM)** — Meta's iOS 14.5+ tracking workaround. Without domain verification, you can prioritize a maximum of zero conversion events for iOS users, and CAPI events from your domain may be silently dropped or attributed inconsistently. Do this before launching ads.

1. Go to `https://business.facebook.com/settings`.
2. Left nav → **Brand Safety and Suitability** → **Domains**.
   - If left nav shows **Brand Safety** without "and Suitability," same thing.
   - If you don't see Brand Safety at all, scroll the left nav — it's usually below **Accounts**, **Users**, **Data Sources**, **Brand Safety**.
3. Click **Add** → enter the apex domain WITHOUT `https://` and WITHOUT `www.`. For Vercel, also add the production domain Vercel assigns if different. Example: `everlastings.com`.
4. Pick a verification method. **Two practical options for this stack:**
   - **DNS TXT record (recommended for Vercel-hosted sites)** — set-and-forget, survives any frontend redeploy.
     1. Click **DNS Verification** tab.
     2. Copy the TXT record value (looks like `facebook-domain-verification=abc123def456`).
     3. Go to your DNS provider (whoever owns the `everlastings.com` zone — likely Cloudflare, Namecheap, or Vercel DNS).
     4. Add a TXT record: **Name/Host** = `@` (or root domain), **Value** = the string from Meta, **TTL** = default. Save.
     5. Wait 5–60 minutes. Click **Verify** in Meta. If it fails, wait longer (DNS can take up to 72h but usually it's under an hour).
   - **Meta-tag (HTML meta tag in `<head>`)** — fastest, but means every domain change = re-verify.
     1. Click **Meta-tag Verification** tab.
     2. Copy the `<meta name="facebook-domain-verification" content="...">` line.
     3. Add it to the site's root `<head>` — in Next.js App Router that's `app/layout.tsx` inside the `<head>` of the Root Layout, OR via the `metadata.other` field.
     4. Deploy to production.
     5. Click **Verify** in Meta. Usually instant.
5. After verification: while still in **Domains**, click the verified domain → **Assigned Assets** → assign the Pixel (`Everlastings Website Pixel`). Without this, AEM still won't work even though the green checkmark says "Verified." This is the step almost everyone misses.

**If you see Y instead of X:**
- If "Brand Safety" is named **"Brand Safety and Suitability"** — same place, same thing.
- If your DNS provider doesn't support multiple TXT records on `@` — most do, but if not, use the meta-tag method instead.
- If verification says "Failed" but `dig TXT everlastings.com` shows the record present, click Verify again in 10 minutes. Meta caches DNS lookups internally.

**Verification requirements:** Admin access on the Business Portfolio. No ID required.

**Sources:**
- https://www.facebook.com/business/help/321167023127050
- https://www.facebook.com/business/help/2086293468348582
- https://qtonix.com/blog/how-to-verify-your-domain-in-meta-business-manager-step-by-step-guide/

---

## 7. Future Page Ownership Transfer (Sean → Emaline)

**Why:** The LLC is Emaline's. Long-term she should own the Page, the Business Portfolio, the Pixel, and the IG account. Sean is bootstrapping because Emaline doesn't have the technical chops to walk through Steps 1–6 without thrashing.

**Two transfer scenarios — pick which applies when the time comes:**

### Scenario A: Transfer Page only, keep Business Portfolio with Sean (simpler, more common)

Use this if Sean continues to manage ads/CAPI on Emaline's behalf and only the public-facing Page identity needs to live "with Emaline."

**Prerequisites:**
- Emaline has a personal Facebook account (she does NOT need one to view the Page, but she needs one to be granted Full Control).
- Sean has been Page admin for at least 7 days. (Met automatically — by the time you transfer, this is months later.)
- 2FA is enabled on Emaline's personal FB account before she accepts. Meta enforces this for Full Control accepts.

**Steps (must be done on desktop, not mobile):**
1. Sean: `https://business.facebook.com/settings` → **Accounts** → **Pages** → click **Everlastings by Emaline**.
2. Right pane → **People with Facebook Access** → **Add new** → enter Emaline's email or FB profile URL.
3. **Toggle "Allow this person to have Full Control of this Page" ON.** Click **Give access**. Re-enter Sean's password.
4. Emaline gets a notification on her personal FB. She has **30 days to accept**.
5. Once Emaline accepts, wait **7 days** (Meta's mandatory cooling-off — she cannot remove other admins or delete the Page during this period; designed to deter takeover scams).
6. After 7 days, Sean removes himself: same screen → click his own name → **Remove access**. (Or leave Sean as a backup admin — totally fine.)

### Scenario B: Transfer everything to Emaline's own Business Portfolio (full handoff)

Use this if Emaline (or her accountant) wants the LLC to fully own the Meta assets — typical when she's the one paying for ads from her own card.

1. Emaline creates her own Business Portfolio at `business.facebook.com` (Step 3 process).
2. Sean (still owner of current portfolio) → Business Settings → Pages → select Page → **More options** → **Request to transfer assets**. Enter Emaline's portfolio ID (she finds this in her own portfolio's Business Info page).
3. Emaline accepts the transfer in her portfolio.
4. **Re-do Step 5** in her portfolio: she'll need a new system user, new token. The Pixel ID in Scenario B carries over IF the Pixel is part of the transfer; otherwise it stays with Sean's portfolio. Confirm before transfer to avoid orphan-Pixel scenarios.
5. The IG link to the Page is preserved through the transfer.

**Recommended:** Scenario A. Lower risk, fewer moving parts, Sean stays operationally in control of CAPI without needing Emaline involved every time a token rotates.

**If you see Y instead of X:**
- If you don't see **People with Facebook Access** — you're in the **Classic Page** UI. New Pages Experience uses **Page access** under Professional Dashboard → Page access. Same outcome. (Pages created in 2026 are always New Pages Experience, so this should not happen here.)
- If "Give Full Control" is greyed out, Sean's account is missing 2FA or the Page is < 7 days old. Fix and retry.
- If Emaline never receives the notification, she should check `facebook.com/pages` while logged in — pending invites also surface there.

**Verification requirements:**
- Sean: 2FA enabled (already done in Step 1 prep).
- Emaline: 2FA enabled on her personal account before she can accept Full Control.
- Neither needs government ID for this transfer (ID only kicks in if Meta's anti-fraud trips, e.g. transferring a high-spend ad account internationally).

**Sources:**
- https://www.facebook.com/help/1843115515813561
- https://socialrails.com/blog/how-to-transfer-facebook-page-ownership
- https://www.leadsie.com/blog/request-access-to-facebook-page

---

## Quick Reference — Final Env Vars

After all 7 steps, the website's environment should have:

```
META_PIXEL_ID=<15-16 digit number from Step 4>
NEXT_PUBLIC_META_PIXEL_ID=<same number — for browser fbq init>
META_ACCESS_TOKEN=<EAA... long string from Step 5, system-user, Never-expires>
```

`META_ACCESS_TOKEN` is server-only. Never `NEXT_PUBLIC_` it. Never commit it. Rotate annually even if "Never" is set, just on principle.

## Recovery / Rotation Playbook

- **Token compromised:** Business Settings → Users → System Users → `everlastings-capi-server` → **Regenerate Token**. Old token instantly dies. Update Vercel env vars. Redeploy.
- **Sean locked out of personal FB:** the system user keeps working as long as the Business Portfolio survives. Recover personal FB via account.facebook.com — system-user tokens are NOT bound to Sean's session. This is the whole point of doing Step 5 Path B over Path A.
- **Need to add second domain (e.g. staging):** Step 6 again for the new domain. Each domain needs its own verification record.
