---
title: Cookie Consent — Research Input for v1.4.3 Track B (B1.5)
date: 2026-05-02
version: research input for v1.4.3 Track B B1.5 cookie banner build
status: research / decision-input (no code changes proposed in this doc)
audience: Sean (decision-maker), Track B implementer, Track C wirer
---

# v1.4.3 Track B — Cookie Consent Research

This is the research input for the cookie consent UX in `everlastings-website`. Written specifically for the brand's context: US-only shipping, ~$200–$700 handcrafted miniature dioramas, low traffic, **Meta Pixel + GA4 only (no Google Ads at launch)**, Meta Conversions API on the server, Stripe Custom Checkout. Brand voice is warm and poetic per `assets/docs/BRAND.md`.

The goal is the **minimum-friction consent UX that satisfies the rules that actually apply** to this site, optimized for "carefree user trades data for experience" with a clean opt-out path for those who want it. Not a maximalist privacy posture. But also not naive — there is one US-specific litigation risk (CIPA) that changes the calculus and is documented below.

Findings are written so the answer ("do we need a banner?") can survive a skeptical re-read in six months.

---

## 1. Legal Floor for This Context

### 1.1. California (CCPA / CPRA) — the binding case

**Applicability thresholds (2026):** A for-profit business is a "covered business" under CCPA only if it meets *one* of:
- Annual gross revenue **> $26,625,000** (the inflation-adjusted figure for 2026; original $25M);
- Buys, sells, or shares the personal information of **≥ 100,000 California consumers or households per year**;
- Derives **≥ 50%** of annual revenue from selling/sharing personal information.

Sources:
- [California Privacy Protection Agency — Updated Monetary Thresholds in CCPA](https://cppa.ca.gov/regulations/cpi_adjustment.html)
- [California AG — CCPA homepage](https://oag.ca.gov/privacy/ccpa)
- [Clym — CCPA Applicability 2026 Guide](https://www.clym.io/blog/ccpa-applicability-guide)
- [CookieYes — Who does CCPA apply to?](https://www.cookieyes.com/blog/who-does-ccpa-apply-to/)

**The 100,000 trap.** "Consumers" is counted by *unique identifier* (cookie, device ID, IP) — not unique customers. A widely cited rule of thumb: roughly **275 California visitors/day** crosses the threshold over a year ([CookieYes](https://www.cookieyes.com/blog/who-does-ccpa-apply-to/)). Everlastings is projected to be far below this. So as a covered business under CCPA's enumerated thresholds, **the site is not currently covered**.

**But — and this is the load-bearing caveat — see CIPA in §1.5 below.** Even non-covered businesses face California-specific exposure from a different statute.

**"Sale or share" definition under CPRA.** The CPRA broadened "sale" to include "sharing" — defined as disclosing personal information *to a third party for cross-context behavioral advertising*, whether or not money changes hands ([Clym](https://www.clym.io/blog/ccpa-selling-and-sharing-what-counts-as-a-sale-or-share); [TrueVault](https://www.truevault.com/learn/is-sharing-the-same-as-selling-under-the-ccpa)). **Meta Pixel is consistently described in legal commentary as a "share" under CPRA** because it sends identifiers to a third party (Meta) for cross-context behavioral advertising ([Clym](https://www.clym.io/blog/what-counts-as-sharing-personal-information-under-the-ccpa); [TermsFeed — Facebook Retargeting Under CCPA](https://www.termsfeed.com/blog/ccpa-facebook-retargeting-ldu/)). This means **if** the business were covered, a "Do Not Sell or Share My Personal Information" link would be required.

**Global Privacy Control (GPC).** California requires covered businesses to honor the GPC browser signal as a valid opt-out request. Sephora was fined $1.2M in 2022 specifically for failing to honor GPC; Disney settled for $2.75M in February 2026 on related grounds ([CA AG — GPC](https://oag.ca.gov/privacy/ccpa/gpc); [Nelson Mullins — GPC alert](https://www.nelsonmullins.com/insights/alerts/privacy_and_data_security_alert/all/get-to-know-the-global-privacy-control-gpc-state-attorneys-general-remind-consumers-of-their-right-to-opt-out-of-the-sale-or-sharing-of-personal-information)). Because Everlastings is below the covered-business threshold, the strict GPC obligation does not currently apply, but honoring it is a low-cost defensive posture.

### 1.2. Other US state privacy laws (VCDPA, CPA, CTDPA, UCPA, OCPA, TDPSA)

Each state's law has its own threshold. For an artisan shop with low US-wide traffic and no data sales, none are likely triggered:

- **Virginia (VCDPA):** ≥ 100,000 consumers, OR ≥ 25,000 consumers + ≥ 50% revenue from data sales.
- **Colorado (CPA):** ≥ 100,000 Colorado residents, OR ≥ 25,000 + revenue from data sales.
- **Connecticut (CTDPA):** Threshold lowered effective **July 1, 2026** to 35,000 consumers; or any business that processes sensitive personal data; or offers PI for sale.
- **Utah (UCPA):** Adds a $25M annual revenue floor *plus* a volume threshold — narrowest scope of the bunch.
- **Oregon (OCPA), Texas (TDPSA):** "Conducts business in the state" + 100,000-consumer threshold; Texas notably has *no* small-business revenue floor but does have a small-business exception by SBA definition.

Sources:
- [Usercentrics — US State Data Privacy Effective Dates and Thresholds](https://usercentrics.com/us/knowledge-hub/us-state-data-privacy-effective-dates-and-thresholds/)
- [Feroot — When Do U.S. State Privacy Laws Apply?](https://www.feroot.com/blog/when-do-u-s-state-privacy-laws-apply-scope-and-thresholds/)
- [Recording Law — US State Privacy Laws Comparison Chart 2026](https://www.recordinglaw.com/us-laws/data-privacy-laws/us-state-privacy-laws-comparison/)
- [Reinhart Boerner Van Deuren — Preparing for 2026 amendments](https://www.reinhartlaw.com/news-insights/preparing-for-new-and-amended-comprehensive-state-data-privacy-laws-in-2026)

**Bottom line:** A small handcraft brand selling ~$200–$700 pieces, with low traffic, and no data-sale business model, **does not meet the applicability thresholds of any current US state privacy law as of 2026-05-02**. Twenty states have comprehensive laws as of January 1, 2026, and the brand is below the threshold of all of them.

### 1.3. Federal — FTC Section 5, COPPA

**FTC Section 5** prohibits "unfair or deceptive acts or practices." The FTC's pixel-tracking enforcement (BetterHelp, GoodRx, Premom, Avast — see [FTC blog post](https://www.ftc.gov/business-guidance/blog/2023/09/companies-warned-about-consequences-loose-use-consumers-confidential-data)) has so far focused on:
- Sensitive data (health, financial), or
- Affirmative misrepresentation in a privacy policy.

A miniature-diorama shop with a privacy policy that honestly says "we use Meta Pixel and Google Analytics" is not the FTC's target profile. Section 5 risk for this site reduces to: **"don't lie in the privacy policy."** Don't claim "we don't track you" while running Meta Pixel.

**COPPA** (Children's Online Privacy Protection Act) only applies if the site knowingly collects data from children under 13 or is "directed to children." Everlastings' brand language ("for those processing grief," $200–$700 collectibles) is unambiguously adult-directed. Low risk.

### 1.4. GDPR / UK GDPR exposure

GDPR Article 3(2) applies extraterritorially when the controller is "offering goods or services" to data subjects in the EU/UK. The EDPB's key test is **intention to target** ([IAPP — Territorial scope of the GDPR](https://iapp.org/news/a/territorial-scope-of-the-gdpr-from-a-us-perspective); [EDPB Guidelines 3/2018 referenced via TermsFeed](https://www.termsfeed.com/blog/gdpr-territorial-applicability/)).

The EDPB (and the underlying GDPR recital 23) explicitly state:

> "the mere accessibility of the controller's website in the union, of an email address or of other contact details, or the use of a language generally used in the third country where the controller is established, is insufficient to ascertain such intention." ([TermsFeed citing GDPR recital text](https://www.termsfeed.com/blog/gdpr-territorial-applicability/))

A US-only-shipping site that:
- Uses English (US-default),
- Prices in USD,
- Restricts shipping via Stripe's `allowed_countries: ['US']`,
- Does no advertising directed at the EU,

…**does not target EU residents** under the EDPB's test. EU/UK GDPR does not apply.

This is the strongest legal posture available: hard-coding shipping country = hard-coding "we are not targeting you." A coincidental EU visitor does not pull the site into scope.

### 1.5. The CIPA wiretap risk — California-specific litigation, NOT statute applicability

This is the one finding that bends the recommendation. Even though Everlastings is **not** a CCPA-covered business by threshold, California's Invasion of Privacy Act (CIPA, Cal. Penal Code §§ 631 / 638.51) has been the basis for an explosion of plaintiff-bar lawsuits since 2023 against sites that fire Meta Pixel, Google Analytics, or session-replay tools without first obtaining user consent.

Key facts:
- Plaintiffs argue Meta Pixel / GA / TikTok Pixel function as "pen registers" or "wiretaps" capturing communications without consent.
- Statutory damages: **up to $5,000 per violation** + attorney's fees. Class-action structure makes this a numbers game for the plaintiff bar, not a sensitive-data question.
- Small businesses are routinely targeted with demand letters, not just F500.
- California SB 690 (which would have created a clear "consent via privacy notice" defense) was held as a "two-year bill" in 2025 and has not taken effect. Window for plaintiff filings remains open through at least January 2027.
- Courts have entertained the "user consented via cookie banner" defense — *but only when consent was clear, affirmative, and prior to firing the pixel*.

Sources:
- [Inside Class Actions — Website Wiretapping Roundup 2025](https://www.insideclassactions.com/2026/01/27/2025-website-wiretapping-roundup/)
- [Shumaker Loop & Kendrick — Website Tracking and Privacy Lawsuits Surge in 2026](https://www.shumaker.com/insight/client-alert-website-tracking-and-privacy-lawsuits-predicted-to-surge-in-2026-practical-steps-to-mitigate-risk/)
- [Fisher Phillips — California Cookie Litigation SB 690 stalled](https://www.fisherphillips.com/en/news-insights/california-proposal-to-curb-website-cookie-litigation-stalls.html)
- [Coblentz Law — CIPA, VPPA, and California's SB 690 (2024-2025)](https://www.coblentzlaw.com/news/developments-in-digital-privacy-litigation-in-2024-2025-cipa-vppa-and-californias-sb-690/)
- [Fox Rothschild — Your Website's Pixels May Be Wiretaps](https://dataprivacy.foxrothschild.com/2026/04/articles/general-privacy-data-security-news-developments/your-websites-pixels-may-be-wiretaps-10-questions-every-business-should-ask-about-cipa/)
- [Jackson Walker — CIPA Claims Surge](https://www.jw.com/news/insights-california-invasion-privacy-act-claims-surge/)

**Implication:** the most defensible posture against CIPA is "Meta Pixel does not fire on first paint; it fires only after the user accepts." That's an opt-in (or at minimum dismiss-to-accept) consent UX *for California traffic specifically*. The good news: a single banner that defaults Meta Pixel + GA off, then turns them on after dismiss/accept, satisfies CIPA defense for *all* US visitors at no additional UX cost.

This is the reason the recommendation lands on "yes, ship a banner" rather than "no banner needed."

---

## 2. Meta (Facebook) Pixel & CAPI Requirements

### 2.1. What Meta's terms actually say

**Meta Business Tools Terms** ([facebook.com/legal/technology_terms](https://www.facebook.com/legal/technology_terms)): the advertiser **represents and warrants** they have "all necessary rights and permissions and a lawful basis for the disclosure and use of Business Tool Data, in compliance with all applicable laws, regulations and industry guidelines."

Meta does **not** prescribe a specific UX (banner, modal, etc.). Meta pushes the legal burden to the advertiser: *you* must make sure your disclosure satisfies whatever law applies to your visitors. This is consistent across the [Business Tools Terms](https://www.facebook.com/legal/technology_terms) and Meta's [Conversions API guidance](https://www.adamigo.ai/blog/how-to-disclose-data-use-in-meta-ads).

**Translation:** Meta does not require you to put up a banner. Meta requires you to be lawful. In US-only-shipping context with no covered-business status under any state law (§1.1–1.2), the lawful baseline is "tell users in the privacy policy what's tracked, don't lie." The CIPA risk in §1.5 is what pushes the bar higher.

### 2.2. Limited Data Use (LDU) flag for California

Meta introduced LDU in July 2020 specifically for CCPA. Setting `fbq('dataProcessingOptions', ['LDU'], 0, 0)` tells Meta: "this user appears to be in California — process this event under restricted CCPA-mode rules" (no cross-context retargeting, no expansion into Custom Audiences) ([TermsFeed — Facebook Retargeting Under CCPA](https://www.termsfeed.com/blog/ccpa-facebook-retargeting-ldu/); [Transcend — Facebook Limited Data Use](https://transcend.io/glossary/facebook-limited-data-use); [Wpromote — Meta LDU](https://www.wpromote.com/blog/digital-intelligence/facebook-ldu/)).

LDU is essentially a **soft kill switch** for California-resident events. You can:
- Pass `0, 0` → Meta auto-detects geo and applies LDU only if the user is in CA;
- Pass explicit country/state codes → manual override;
- Apply LDU site-wide → kills retargeting universally for the conservative posture.

For Everlastings, the right call is **Option A** (auto-geo): apply LDU when Meta's geo says CA, leave it off elsewhere. This costs nothing at the UX level — it's a flag in the `fbq` call. The CCPA-non-covered-business status (§1.1) means LDU is not legally required, but applying it is **almost free** and meaningfully reduces both CCPA risk if traffic ever crosses the threshold *and* provides a paper-trail defense in CIPA matters.

Wired in **Track C**, not Track B.

### 2.3. Conversions API (CAPI) — controller / processor

When the site sends server-side Purchase events to Meta via CAPI, Meta is described in their Data Processing Terms as a **processor** acting on the advertiser's instructions for events the advertiser sends, and a **controller** for what Meta then does with that data internally for ads optimization ([adamigo.ai — Meta Conversion Data Compliance](https://www.adamigo.ai/blog/meta-conversion-data-compliance-best-practices)). Practically: customer email/phone must be SHA-256 hashed before transmission. Stripe webhooks already give us hashed-able fields server-side, so this is straightforward in Track C.

### 2.4. iOS App Tracking Transparency (ATT) — confirms Sean's intuition

**Sean's read is essentially correct for the *website* surface.** ATT applies to *apps*, not websites. The IDFA-prompt and "ask app not to track" toggle are device-level, mediated between Apple and Meta's app, not between Apple and a Shopify-style website. ([Apple Developer — User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/); [Adjust — ATT framework](https://help.adjust.com/en/article/app-tracking-transparency-att-framework))

What ATT *does* do that incidentally affects this site:
- iOS Safari users opted into "Limit Ad Tracking" or who use Mail Privacy Protection have email-open and IDFA visibility neutered for Meta. This shows up as lower Pixel match quality. Server-side CAPI partly recovers this. No website-side disclosure is required by ATT.
- ATT obligations attach to *app* publishers, not website operators.

So the assumption "Meta-side opt-out is handled at the user's device + Meta-account level" is correct **for the iOS-app pathway**. It does *not* relieve the website-side obligation under CIPA / CCPA "share" rules — those operate independently of ATT.

### 2.5. Instagram Shopping / Meta Commerce Catalog

The [Commerce Product Merchant Agreement](https://www.facebook.com/legal/commerce_product_merchant_agreement) layers on top of the ad-side terms. Key obligations:
- Honest privacy policy + terms of sale.
- Cooperate with Meta on user-privacy and data-incident matters.
- Don't sell or misuse User Data from the Shop.

It does **not** add a website-banner requirement beyond what Meta's Business Tools Terms already say. The Catalog feed itself is product data, not visitor data — no consent UX implication on the website side. ([Meta — Commerce Eligibility Requirements](https://help.instagram.com/1627591223954487))

---

## 3. Google Analytics 4 + Google Consent Mode v2

### 3.1. Where Consent Mode v2 is actually required

Consent Mode v2 became required in March 2024 **for advertisers running Google Ads or relying on Google audience features in the EEA / UK / Switzerland**. Outside those geographies, Consent Mode v2 is *recommended* by Google but **not legally mandated** ([Google for Developers — Set up consent mode](https://developers.google.com/tag-platform/security/guides/consent); [August Ash — Consent Mode v2 in 2026](https://augustash.com/blog/digital-strategy/google-consent-mode-v2-2026-what-businesses-need-know-about-tracking-privacy); [Cookiebot — About Google consent mode](https://support.cookiebot.com/hc/en-us/articles/12756353963292-About-Google-consent-mode)).

For a **US-only site running GA4 + no Google Ads**, Consent Mode v2 is **not required** by Google's enforcement policy. GA4's Google Signals can be toggled on/off per property — and if not enabled, GA4 operates as a relatively first-party analytics tool.

### 3.2. What changes when Google Ads is added later

The moment the brand starts running Google Ads (likely a year-out consideration per Sean's note), three things shift:
1. **Consent Mode v2 becomes required** for Google Ads remarketing in the EEA, and effectively required in any geography where Google's remarketing audience features are used.
2. **Google Signals interaction:** if Signals is enabled for cross-device reporting, GA4 starts sharing data with Google's signed-in-user pool — at that point GA4's data flow looks more like an ad cookie than first-party analytics, and Consent Mode v2's `ad_storage` flag becomes the gating control as of June 15, 2026 ([Google for Developers — Set up consent mode](https://developers.google.com/tag-platform/security/guides/consent)).
3. The privacy policy needs an updated paragraph mentioning Google Ads remarketing.

**Practical recommendation:** Wire the consent shape in Track B/C to be **Consent Mode v2-compatible from day one** (using the standard `analytics_storage` / `ad_storage` / `ad_user_data` / `ad_personalization` flags). Then when Google Ads is added later, only the Google Ads tag itself needs to be added — no consent-architecture rework.

### 3.3. For the current launch (US-only, GA4 + Meta Pixel only, no Google Ads)

Google Consent Mode v2 is not legally required. But because the implementation cost is essentially zero (it's the same gtag.js function call with different parameters), **build it in now**. The same `gtag('consent', 'default', {...})` call that defends against CIPA also primes GA4 for a clean Google Ads addition later.

---

## 4. UX Patterns from Comparable Brands

### 4.1. Methodology note

The original research plan called for first-hand visits to ~10 sites. The available tool surface in this session blocked direct fetches of those sites, so this section relies on:
- Documentation of how the major CMP vendors (OneTrust, Cookiebot, CookieYes, Osano) deploy on these sites (visible in their case studies);
- Industry analyst commentary;
- Published audits and research papers covering the artisan / DTC / lifestyle tier.

This is sufficient for pattern identification but is weaker than a live visit. **Sean — flag in §8.** A live walk-through of ~6 sites in browser would meaningfully tighten the pattern map.

### 4.2. The pattern map (synthesis)

Three banner archetypes appear in the small-artisan-to-mid-DTC space:

**A. The "compliant default" — full CMP banner with Reject-All button.**
- Position: bottom-strip or modal.
- Buttons: "Accept All" / "Reject All" (symmetrical) / "Manage Preferences."
- Default state: opt-in (cookies blocked until accepted) for EU IPs, opt-out for US IPs (geo-based serving).
- Wording: legalistic.
- Used by: most large DTC brands (Brooklinen, Parachute, Anthropologie tier) and any site running OneTrust / Cookiebot / Osano. Consistent with the [CookieYes CCPA banner guidance](https://www.cookieyes.com/blog/ccpa-cookie-banner-requirements/) and the [California CPPA's symmetrical-choice expectation](https://usercentrics.com/us/knowledge-hub/ccpa-cookie-banner/).

**B. The "soft notice" — bottom-strip informational with single dismiss button.**
- Position: bottom-strip, narrow.
- Buttons: a single "Got it" / "Close" / "OK."
- Default state: **opt-out** (cookies fire on page load; banner is informational).
- Wording: brand-voiced, short.
- Used by: many Shopify-default storefronts and small artisan shops that adopted Shopify's [native Customer Privacy banner](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings) without configuring the rejection path.
- **Compliance status:** Not GDPR-compliant for EU; legally fine in most US states for non-covered businesses; CIPA-vulnerable because cookies fire pre-consent.

**C. The "footer-only" — no banner; "Privacy preferences" link in footer.**
- Position: footer.
- Default state: opt-out (everything fires; user must affirmatively go find the link).
- Used by: many very small Etsy storefronts, single-artist shops, and brands that have made an explicit "we're below the threshold" call.
- **Compliance status:** Legal in most US-only contexts for non-covered businesses; CIPA-vulnerable for California traffic; would not survive GDPR if EU traffic were targeted.

A fourth pattern is observable in EU-based artisan shops:

**D. The "EU strict" — full modal blocker, opt-in default, rejection mandatory and equal-prominence.**
- Used by EU-established artisan shops (e.g., Bristol/Dublin/Berlin-based Etsy-alternatives).
- Hard CLS / LCP penalty on first paint.
- Conversion impact studied below in §5.

### 4.3. Frequency observation (qualitative, vendor-CMP penetration data)

In the **small-artisan tier** (one-artist shops, low traffic, US-focused), Pattern C ("footer-only") and Pattern B ("soft notice") dominate. Many of these shops use Shopify's native banner only because Shopify's Customer Privacy setting nudged them into it.

In the **mid-DTC tier** (Brooklinen, Parachute, Olive & June, Anthropologie), Pattern A dominates — these brands are at scale, run paid ads in the EEA, and meet at least one US state's threshold.

In the **EU-established artisan tier**, Pattern D is universal because GDPR ([EDPB consent guidance](https://gdpr.eu/)) is non-negotiable.

Sources:
- [Shopify Customer Privacy Settings docs](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings)
- [Shopify.dev — Add a cookie compliance banner to your theme](https://shopify.dev/docs/themes/trust-security/cookie-banner)
- [OneTrust Cookie Banner Gallery](https://www.onetrust.com/cookie-banner-gallery/) — illustrative range
- [DL.ACM — A Cross-Country Analysis of GDPR Cookie Banners (CHI 2025)](https://dl.acm.org/doi/10.1145/3706598.3713648)

---

## 5. Bounce Rate / Conversion Impact Data

The published numbers cluster roughly as follows. Treat the numbers as directional — most are vendor-published rather than peer-reviewed academic studies, and the best academic study ([CHI 2025 paper](https://dl.acm.org/doi/10.1145/3706598.3713648)) focuses on the EU rather than US contexts.

| Banner pattern              | Bounce-rate impact (vs. no banner) | Conversion impact    | Source                                                                                                                                                               |
| --------------------------- | ---------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full-screen modal blocker   | +15-20%                            | -10 to -25%          | [Analytics-Alternatives — Cookie Consent Banner Hurting Conversions](https://analytics-alternatives.com/cookie-consent-banner-hurting-conversions-heres-what-to-do/) |
| Bottom-bar with Reject All  | +5-10%                             | -3 to -10%           | [2Point Agency — Can Cookie Banners Affect Bounce Rates](https://www.2pointagency.com/glossary/can-cookie-banners-affect-website-bounce-rates/)                      |
| Soft notice (single button) | +0-5%                              | minimal              | [Elementor — Reduce Bounce Rate from Cookie Banners](https://elementor.com/blog/ultimate-how-reduce-bounce-rate-from/)                                               |
| Footer-only / no banner     | baseline                           | baseline (CIPA risk) | (no banner = no banner impact, but plaintiff exposure)                                                                                                               |

**Mobile penalty.** The same source ([analytics-alternatives.com](https://analytics-alternatives.com/cookie-consent-banner-hurting-conversions-heres-what-to-do/)) reports the conversion penalty roughly doubles on mobile, where a banner that occupies 30% of desktop viewport occupies 60% of mobile viewport.

**Core Web Vitals.** Banners injected at first paint can balloon LCP and CLS. Best practice ([web.dev — Best practices for cookie notices](https://web.dev/articles/cookie-notice-best-practices); [DebugBear — Cookie Consent Banner Performance](https://www.debugbear.com/blog/cookie-consent-banner-performance); [SpeedCurve — Five ways cookie consent managers hurt web performance](https://www.speedcurve.com/blog/web-performance-cookie-consent/)):
- Reserve banner space in CSS so it doesn't shift layout (`position: fixed; bottom: 0;` with no flow impact).
- Render banner *after* hero LCP element resolves.
- Lazy-load any analytics scripts gated by consent.

**Consent fatigue.** Most users spend < 3 seconds on cookie decisions ([Cookie Banner — Consent Rate](https://cookiebanner.com/blog/consent-rate-why-it-matters-and-how-to-improve-it/)). The "minimum-friction-for-a-decisive-user" banner — bottom-strip, brand-voiced, two visible buttons — outperforms the "GDPR-paranoid modal" by every measured metric.

**Consent rate data.** Well-designed bottom-strip banners with symmetrical buttons see **acceptance rates of 50-70%** ([Cookie-Script — Improve Cookie Banner Acceptance Rate](https://cookie-script.com/blog/how-to-improve-cookie-banner-acceptance-rate)). Modal blockers in the EU see acceptance rates as low as 3-7% on cold traffic ([Cookiebot — Consent banner best practices](https://support.cookiebot.com/hc/en-us/articles/4401873267090-Consent-banner-best-practices-for-GDPR-compliance)).

---

## 6. Recommendation

### 6.1. The verdict

Ship a **bottom-strip soft-prompt banner** with **two equally weighted buttons** ("Accept" / "Decline"), **brand-voiced wording**, and a footer "Privacy preferences" link that re-opens the same banner. Default consent state is **denied** until the user clicks Accept, and the banner does not block content (LCP-safe, CLS-safe).

This sits between Pattern A and Pattern B in §4.2 — it has the symmetrical-choice CIPA defense of Pattern A and the warmth + low-friction of Pattern B. It is *not* a footer-only Pattern C (which is CIPA-vulnerable) and not a Pattern D modal (which kills conversion).

### 6.2. Specifics

**Banner pattern:** bottom-strip, full-width on desktop, full-width on mobile, slides up after hero LCP completes (~500ms after `DOMContentLoaded`). Position `fixed; bottom: 0;` reserved space so no CLS. Dismissable by click-outside is **not** offered (CIPA-defense — must be explicit choice). Persists on every page until decision is made.

**Default state:** **denied**. `gtag('consent', 'default', {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'})` fires *before* gtag.js loads. Meta Pixel is not loaded into the DOM until Accept fires (Track C). This is the critical CIPA defense.

**Wording style:** brand-voiced. Reference BRAND.md's "warm, poetic, never clinical" guidance, and the "tone for transactional contexts" row ("Clear, warm, reassuring"). Suggested copy:

> *"A small note: we use light tracking — through Meta and Google Analytics — to find collectors who might love these havens. Your visit helps us make this place better. You can decline if you'd rather not, and revisit your choice anytime in our footer."*
>
> [ Decline ] [ Accept ]
>
> Small link beneath: *"Read our privacy approach →"*

This is longer than typical legalistic copy because the brand voice rewards explanation. Sean and Emy can shorten further:

> *"We use Meta and Google Analytics to find collectors who'd love these havens. Decline if you'd rather not."*
>
> [ Decline ] [ Accept ]

Either version satisfies the symmetric-choice CIPA-defense expectation. Both avoid the words "cookie" and "GDPR" — which the brand-voice guide would call clinical.

**What gets wired (Track C will do this):**
- On Accept → `gtag('consent', 'update', {analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted'})` + `fbq('consent', 'grant')` + Meta Pixel script injected.
- On Decline → `gtag('consent', 'update', {...})` with all four set to `'denied'` + `fbq('consent', 'revoke')`. Meta Pixel script *not* injected.
- For California-detected visitors who Accept → also set `fbq('dataProcessingOptions', ['LDU'], 0, 0)` (auto-geo). This is the LDU defensive layer.
- For visitors with the GPC HTTP header → treat as Decline by default; honor as a courtesy even though the brand is below the CCPA-covered threshold (cheap defensive posture).

**Meta-required minimum disclosure:** A **paragraph in the privacy policy** naming Meta Pixel + Conversions API + GA4, plus a **footer link** to that policy. Meta does not require a banner; it requires "lawful basis." With the CIPA-defensive banner + an honest privacy policy paragraph, Meta's contractual disclosure expectation is exceeded.

**California "Do Not Sell or Share My Personal Information" link:** **Not required at current scale** because the brand is below CCPA's covered-business thresholds (§1.1). But two cheap defensive moves:
- The footer "Privacy preferences" link doubles as a soft "Do Not Sell or Share" mechanism if the threshold is crossed later.
- The privacy policy can include a section titled "Your California Privacy Rights" that explains the brand currently sits below the covered-business thresholds and how to opt out anyway.

If/when traffic crosses the 100,000-California-visitor mark (very unlikely for an artisan shop in year 1), the footer link should be re-labeled "Do Not Sell or Share My Personal Information" verbatim — that exact phrase is the regulatory expectation.

### 6.3. Why this is the right risk posture

The recommendation accepts these risks:

1. **Some bounce-rate impact** (~3-5% per §5 data, vs. ~15-20% for a modal). The conversion math on $200-$700 pieces is unforgiving; we're trading ~3% of bounce for the CIPA shield.
2. **Some Meta Pixel signal loss** for the ~30-40% of users who'll Decline (per typical bottom-strip data). Server-side CAPI partially recovers this — Purchase events still fire from the Stripe webhook server-to-server, regardless of banner choice. So the loss is mostly upper-funnel signal (PageView, ViewContent, AddToCart) on declined sessions, not Purchase signal.
3. **No GDPR-grade UX.** A coincidental EU visitor will *see* the same banner as a US visitor — no separate strict-modal path. This is defensible because the brand isn't targeting EU residents (§1.4), so GDPR doesn't apply, and the banner does grant the EU visitor a clear opt-out.

The recommendation rejects these risks:

1. **CIPA plaintiff exposure.** A footer-only or no-banner posture leaves the brand open to a CIPA demand letter from any California resident who lands on the site. Statutory damages of $5,000/violation make even a *single* demand letter expensive to settle, let alone a class action. The banner is the cheapest defense.
2. **FTC Section 5 risk for "we don't track" misstatements** — solved by an honest privacy policy paragraph regardless of banner choice.
3. **Meta contractual breach risk** — solved by the privacy-policy paragraph; banner is a bonus.

The brand size is *exactly* in the band where CIPA litigation concentrates: small enough that "we'd never be sued" feels intuitive, but visible enough (paid Meta + Instagram Shopping) to surface in plaintiff scrapers. The CIPA shield is the load-bearing rationale.

---

## 7. What Track B Builds vs. What Track C Wires

### 7.1. Track B (this current track) — DOM, CSS, persistence, dispatch

Track B builds:

1. **Banner DOM + CSS**
   - HTML structure for bottom-strip banner with two buttons.
   - CSS positioning that's LCP/CLS-safe (`position: fixed; bottom: 0;` with `transform: translateY(100%)` initial state, slid in via class toggle after hero loads).
   - Mobile-responsive — banner shrinks to a single column with tap-friendly buttons.
   - Brand-voiced copy per §6.2 (final wording is Sean's call).

2. **Default-deny `gtag('consent', ...)` call BEFORE gtag.js loads**
   - Inline `<script>` block in canonical `<head>`, positioned *before* the `gtag.js` external script tag.
   - Calls `gtag('consent', 'default', {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500})`.
   - This ensures GA4 collects nothing until the user accepts; the `wait_for_update` value gives the user 500ms to click before GA4 sends the first beacon (defensible, see [Google for Developers — consent reference](https://developers.google.com/tag-platform/security/guides/consent)).

3. **localStorage persistence layer**
   - Key: `everlastings.consent`
   - Value shape:
     ```json
     {
       "analytics": "granted" | "denied",
       "advertising": "granted" | "denied",
       "timestamp": "2026-05-02T14:30:00.000Z",
       "version": 1
     }
     ```
   - **Why two flags rather than one:** California "Do Not Sell or Share" is conceptually advertising-only; analytics can be granted independently. Even though the v1 banner is a single Accept/Decline pair, the storage shape supports a granular opt-out without migration if Sean later wants a "Manage preferences" pop-out.
   - **Why `version`:** future-proof for re-prompting if consent shape changes (e.g., adding a fourth "personalization" flag if email/SMS marketing is added).
   - **Reading on subsequent page-loads:** if `everlastings.consent` exists, banner is hidden and Track C re-fires the appropriate consent state on page-load.

4. **Footer "Privacy preferences" link**
   - Anchor in footer that, when clicked, re-shows the banner with current state pre-populated.
   - Same component, just re-opened. No separate modal.

5. **`CustomEvent('consent-change')` dispatch**
   - When user clicks Accept or Decline, dispatch:
     ```js
     window.dispatchEvent(new CustomEvent('consent-change', {
       detail: { analytics: 'granted', advertising: 'granted', timestamp: ... }
     }));
     ```
   - Track C's listener picks this up and runs the actual gtag/fbq calls.

### 7.2. Track C (next track) — wires the actual analytics + pixel state changes

Track C builds:

1. **Listener** for `consent-change` on `window`.
2. On `consent.advertising === 'granted'`:
   - `gtag('consent', 'update', {ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted'})`
   - Inject Meta Pixel script tag if not already injected; then `fbq('consent', 'grant')`.
   - For California-detected visitors: also set `fbq('dataProcessingOptions', ['LDU'], 0, 0)` (auto-geo).
3. On `consent.analytics === 'granted'`:
   - `gtag('consent', 'update', {analytics_storage: 'granted'})`.
4. On Decline of either:
   - The respective `'denied'` updates and `fbq('consent', 'revoke')`.
5. **GPC handling (server-side or client-side, both fine):**
   - On page-load, check `navigator.globalPrivacyControl` (and HTTP `Sec-GPC: 1` header server-side).
   - If true and no localStorage decision yet, treat as a Decline default and skip showing the banner. Document this in the privacy policy as honoring GPC.
6. **Re-fire on page-load:** if `everlastings.consent` already exists, run the appropriate `gtag('consent', 'update', ...)` + `fbq('consent', ...)` calls on every page-load before any tracking events fire. Banner is not shown.
7. **Server-side CAPI (Track C scope, not banner-related):** this fires from the Stripe webhook regardless of banner state, since by the time the webhook runs the customer has explicitly transacted. Document in privacy policy.

### 7.3. localStorage shape — final

```json
{
  "analytics": "granted" | "denied",
  "advertising": "granted" | "denied",
  "timestamp": "<ISO 8601 string>",
  "version": 1
}
```

Key: `everlastings.consent`. Two flags (analytics, advertising) maps cleanly onto Google Consent Mode v2's four-flag model (analytics_storage; ad_storage + ad_user_data + ad_personalization slaved together as one "advertising" decision). Granular enough to support a future "I want analytics but not retargeting" preference, simple enough that a v1 single-Accept/Decline banner sets both at once.

---

## 8. Open Questions for Sean

1. **Google Ads in the next 6-12 months?** If yes, Consent Mode v2 wiring becomes harder-required (still the same Track C work, just the legal floor moves). The recommendation already wires it Consent Mode v2-compatible from day one, so no rework — but Sean's answer affects the privacy-policy wording.

2. **Confirm "we are not targeting EU residents."** The CCPA/CPRA / CIPA analysis above assumes English-only, USD-only, US-only-shipping targeting (which Stripe's `allowed_countries: ['US']` enforces). If the brand later runs Meta ads with EU-targeted audiences, GDPR exposure re-engages and the banner needs an EU-strict path. Confirm this is not on the near-term roadmap.

3. **Banner copy — final voice call.** Section §6.2 offers two drafts. The longer version is more on-brand; the shorter version converts better. This is Emy's voice call. Recommendation: the longer version with the secondary "Read our privacy approach →" link, keeping the page-feel consistent with the BRAND.md "let white space breathe" directive.

4. **Footer link text.** Two options:
   - "Privacy preferences" (brand-voice-aligned, soft).
   - "Privacy preferences / Do Not Sell or Share My Personal Information" (CCPA-aligned-just-in-case).
   Recommendation: **just "Privacy preferences"** for v1; switch to the longer label only if/when the brand crosses a state-law threshold.

5. **GPC honoring — confirm the defensive posture.** The recommendation is to honor GPC even though the brand is below the CCPA-covered threshold. The cost is essentially zero, the upside is a clear "we're acting in good faith" defense if a CIPA letter ever lands. Confirm this is the desired posture.

6. **California "Do Not Sell" verbatim text.** If Sean wants to include a California-rights paragraph in the privacy policy preemptively (recommended — costs nothing, looks professional), the standard verbatim phrasing per [California AG guidance](https://oag.ca.gov/privacy/ccpa) is "Do Not Sell or Share My Personal Information." Confirm Emy is OK with that phrase appearing in the privacy policy footer area — it's clinical but it's the regulatory standard. The cookie-banner copy can stay brand-voiced; the privacy-policy section should use the legal phrase.

7. **Live-site audit (§4.2 methodology gap).** A 30-minute walk-through of 6 reference sites in a browser would tighten the §4 pattern map. Suggested shortlist for a follow-up audit: a small Etsy/Shopify artisan shop, an EU-based artisan shop, Brooklinen, Anthropologie, Goop, Magnolia. This research note is shippable without it, but the §4 conclusions would be firmer with first-hand observation.

---

*End of research input — ready for Track B B1.5 implementation.*
