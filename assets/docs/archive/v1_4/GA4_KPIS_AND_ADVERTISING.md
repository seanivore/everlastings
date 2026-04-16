# Measuring What Matters: GA4 KPIs + The Case for Paid Media

**Prepared by**: Sean August Horvath ([august.style](https://august.style) [sean@august.style](mailto:sean@august.style))
**For**: Everlastings by Emaline
**Version**: v1.0 
**Created**: 2026-04-16 08:42
**Updated**: 2026-04-16 09:28 
**Companion to**: `assets/docs/EVERLASTINGS_STORE.md` & `assets/docs/archive/v1_4/v1_4_0_IMPL_GUIDE.md`

---

## Executive Summary

A beautiful storefront without traffic sells nothing. We've built Everlastings to measure every meaningful interaction — from the first product view to the final purchase, from newsletter capture to Instagram Shopping attribution. But measurement alone doesn't move revenue. This document lays out:

  1. **What the site already tracks** — every KPI is built in, zero additional setup required
  2. **What questions the data can answer** — so decisions are driven by evidence, not guesses
  3. **Why paid media isn't optional for artisan brands in 2026** — organic reach has collapsed to ~3.5% and continues to decline
  4. **A concrete first-90-days advertising plan** — starting with retargeting (highest ROI, lowest risk)
  5. **Budget scenarios** with projected outcomes at the $100, $500, and $2,000/mo tiers

The goal is not to sell advertising — it's to make the economics legible so the right decision can be made with open eyes.

---

## Table of Contents

  1. [What the Site Already Tracks](#1-what-the-site-already-tracks)
  2. [What Questions the Data Can Answer](#2-what-questions-the-data-can-answer)
  3. [Why Paid Media Is No Longer Optional](#3-why-paid-media-is-no-longer-optional)
  4. [Expected Performance by Budget Tier](#4-expected-performance-by-budget-tier)
  5. [The First 90 Days — A Concrete Plan](#5-the-first-90-days--a-concrete-plan)
  6. [What Good Looks Like: KPI Targets](#6-what-good-looks-like-kpi-targets)

---

## 1. What the Site Already Tracks

Every event below fires automatically on the live site — no additional engineering is required. Reporting is available in Google Analytics 4 under Reports → Monetization (e-commerce) and Reports → Engagement (behavior).

### 1.1 The Full Purchase Funnel

GA4's enhanced e-commerce events fire at every step, with full product metadata attached:

| Stage     | Event                   | What It Tells Us                                             |
| --------- | ----------------------- | ------------------------------------------------------------ |
| Discovery | `page_view` (automatic) | Traffic source, entry page, device, geography                |
| Browse    | `view_item_list`        | Which collections get browsed                                |
| Interest  | `view_item`             | Which specific pieces are viewed — and by whom               |
| Intent    | `add_to_cart`           | The moment a piece becomes a candidate, not just a curiosity |
| Decision  | `begin_checkout`        | User committed enough to click CHECKOUT on /cart             |
| Commit    | `purchase`              | Transaction complete, with full item + revenue attribution   |

Because every e-commerce event includes the `items` array with `item_id`, `item_name`, `item_category`, `item_category2` (series), and `price`, GA4 automatically builds:
  - Product performance reports (views / cart adds / purchases per product)
  - Revenue by category or series
  - Purchase journey funnel with drop-off rates per stage

### 1.2 Email Capture — Every Touchpoint Measured

| Event                   | Fires On                                          | Why It Matters                              |
| ----------------------- | ------------------------------------------------- | ------------------------------------------- |
| `newsletter_signup`     | Footer/homepage forms                             | Baseline organic list growth                |
| `email_cta_capture`     | Product interest / cart exit / contemplation CTAs | Capture-rate on each specific funnel moment |
| `customer_email_linked` | When a purchase email matches a prior subscriber  | Subscriber → customer conversion rate       |

These three events together answer: "Is the email list actually producing revenue, or just growing?"

### 1.3 Engagement Signals

| Event                      | Signal                                                 |
| -------------------------- | ------------------------------------------------------ |
| `scroll_depth` (automatic) | Are product stories read, or skimmed?                  |
| `gallery_open`             | Lightbox opens — high-intent product engagement        |
| `video_play`               | Product videos actually watched (not just loaded)      |
| `search_filter`            | What collectors filter for (discovery preference data) |
| `commission_inquiry`       | Custom-work demand                                     |

### 1.4 Acquisition Attribution

  - **UTM tags** on every ad URL — Meta, Pinterest, email campaigns all tracked to source/medium/campaign
  - **Meta Pixel** (browser-side) + **Meta Conversions API** (server-side from the webhook) — dual tracking for iOS/ad-blocker resilience
  - **Instagram Shopping** — Meta catalog polls `/api/product-feed` daily; tags in Instagram posts drive measurable attribution

---

## 2. What Questions the Data Can Answer

### "Which pieces actually sell versus just get viewed?"

GA4 → Reports → Monetization → Item list. Sort by `view_item` descending. The ratio of `add_to_cart` / `view_item` is interest-quality; `purchase` / `view_item` is conversion-quality. A piece with high views and low cart-adds has a conversion problem (photography, price, story). A piece with high cart-adds and low purchases has a checkout-friction or price-sensitivity problem.

### "Where do my best customers come from?"

GA4 → Reports → Acquisition → Traffic acquisition, segmented by "conversions" (purchase). Paid social, organic social, direct, and email will each show their share. This is the north star for budget allocation.

### "Is my email list producing revenue?"

The ratio of `customer_email_linked` events to total `newsletter_signup` events is the subscriber→customer conversion rate. If 200 people sign up and 6 become customers within 90 days, that's a 3% conversion — healthy for a DTC brand in this price range.

### "Does this Instagram campaign pay for itself?"

GA4 + Meta Ads Manager cross-referenced by UTM: `purchase` event count × average order value ÷ ad spend = ROAS (Return on Ad Spend). The calculation is done automatically; Meta Ads Manager displays it in the campaign dashboard.

### "Is my checkout losing people?"

GA4 → Reports → Monetization → Purchase journey. This shows the drop-off between `begin_checkout` and `purchase`. On this site, we've engineered the checkout to reduce the historical "sold while entering payment" shock (409 availability check now fires on `/cart.html` before any PII is entered). Drop-off at the payment stage is usually price, not UX.

---

## 3. Why Paid Media Is No Longer Optional

This section isn't a sales pitch — it's the current state of social media reach, sourced from 2025-2026 industry data.

### 3.1 Organic Reach on Instagram Has Collapsed

  + Average Instagram post now reaches just 3.5% of a brand's followers down from 10–15% in 2020. 
    - [social.plus, 2025](https://www.social.plus/blog/only-3-5-of-followers-see-your-instagram-posts---why-organic-reach-is-no-longer-a-growth-strategy)
  
  + 87% of businesses report important reach decline in the past 18 months. 
    - [Sprout Social / social.plus, 2025](https://www.social.plus/blog/only-3-5-of-followers-see-your-instagram-posts---why-organic-reach-is-no-longer-a-growth-strategy)
  
  + Business accounts over 10,000 followers frequently see under 1% reach. 
    - [Jasmine Directory, 2025](https://www.jasminedirectory.com/blog/instagrams-algorithm-changes-death-blow-to-small-business-reach/)
  
  + Engagement rates that were once 3–5% are now celebrated at 1%. 
    - [Jasmine Directory, 2025](https://www.jasminedirectory.com/blog/instagrams-algorithm-changes-death-blow-to-small-business-reach/)

What this means in plain numbers: if Emaline has 1,000 Instagram followers and posts a new piece, approximately **35 of them will see it**. At a 2% purchase rate among engaged followers, that's less than 1 sale per post. This is the structural limit of relying on organic social for an artisan brand.

### 3.2 Retargeting — The Most Efficient Ad Dollar

Retargeting means showing ads specifically to people who already visited the site. They've seen the work, they know the brand — they just didn't buy yet. Every Meta Pixel event we're already tracking populates retargeting audiences automatically.

  + Retargeted ads convert 2–4x higher than cold traffic**. 
    - [Triple Whale, 2025](https://www.triplewhale.com/blog/ecommerce-benchmarks) 
    - [NewswireJet, 2025](https://newswirejet.com/retargeting-statistics/)

  + Cold social traffic typically converts at 0.5–1.5%. 
    - [Digital Web Solutions, 2025](https://www.digitalwebsolutions.com/blog/ecommerce-conversion-rate-statistics/)

  + Standard advice: allocate 15–30% of total ad budget to retargeting, with short (7–14 day) windows outperforming longer windows by ~30%. 
    - [Triple Whale, 2025](https://www.triplewhale.com/blog/ecommerce-benchmarks)

Because retargeting relies on the Meta Pixel already being installed (we've built it in from day one), we can start running retargeting the day the first ad-free traffic visits the site. Zero additional engineering, zero setup friction.

### 3.3 Category-Specific Ad Performance

For the Home & Interior / Art Decor categories most adjacent to Everlastings:

  + Home & Interior Design benchmark ROAS: 13.9x in 2025 (high-end, visually-driven). 
    - [WebFX, 2026](https://www.webfx.com/blog/social-media/meta-benchmarks/)

  + Home & Garden category ROAS: 2.18 with an 18.47% year-over-year conversion rate improvement. 
    - [Enrich Labs, 2026](https://www.enrichlabs.ai/blog/meta-ads-benchmarks-2025)

  + Art and Home Decor leads in click-through rate at 2.92% — the highest of any category. 
    - [Enrich Labs, 2026](https://www.enrichlabs.ai/blog/meta-ads-benchmarks-2025)

  + Meta commands 68.31% of total DTC ad budgets — because it works. 
    - [Triple Whale, 2025](https://www.triplewhale.com/blog/facebook-ads-benchmarks)

A well-run artisan home-goods campaign should expect 2.5–4x ROAS in the first 60 days and improve from there. A 4x ROAS at a $245 average order value means every $60 in ad spend produces a sale.

### 3.4 Creative Matters More Than Targeting

  + 70–80% of Meta ad performance is now driven by creative quality 
    - AppsFlyer research, cited in [Triple Whale, 2025](https://www.triplewhale.com/blog/facebook-ads-benchmarks)

  + Top DTC brands using UGC (user-generated content) + retargeting report 4–6x ROAS. 
    - [Triple Whale, 2025](https://www.triplewhale.com/blog/facebook-ads-benchmarks)

Everlastings has a structural advantage here: the work is inherently photogenic, each piece has a poetic story, and the brand voice is distinctive. These are exactly the creative assets Meta's algorithm rewards. We don't need to manufacture "content" — we already have it.

---

## 4. Expected Performance by Budget Tier

These projections assume:
  - Average order value: $245 (midpoint of Everlastings' current price range)
  - Blended ROAS starting at 2.5x, maturing to 4x by month 3 with optimization
  - 30% of budget on retargeting (highest-converting), 70% on prospecting (wider reach)
  - Creative refreshed every 2-3 weeks

### $100 / month

**Realistic outcome**: 1-2 additional sales/month from paid traffic.

  - Remarketing budget: $30. Hits ~30 people/day who've viewed the site
  - Prospecting: $70 to reach ~2,500 new people/month in targeted interests (interior design, handmade gifts, memorial art)
  - Expected ROAS: 2.0–2.5x. Revenue: $200–$250/mo. **Net after ad spend: $100–$150/mo.**

At this tier, ads mostly pay for themselves while building the retargeting audience. It's a "keep the lights on" floor, not a growth lever.

### $500 / month

**Realistic outcome**: 5-8 additional sales/month.

  - Remarketing: $150. Daily frequency to ~200 past viewers — this is where ROAS compounds
  - Prospecting: $350 on lookalike audiences built from the customer list + interest-targeted cold traffic
  - Expected ROAS: 3x by month 2. Revenue: $1,500/mo. **Net: $1,000/mo after spend.**

This is the inflection point where ads become a meaningful revenue channel rather than a maintenance cost. At this tier, a data-driven operator can also start A/B testing creative and audience segments to drive continuous improvement.

### $2,000 / month

**Realistic outcome**: 20-35 additional sales/month.

  - Remarketing: $400 (daily saturation of past viewers)
  - Prospecting: $800 on proven lookalike audiences
  - Top-of-funnel brand: $400 on video content / Reels ads (building long-term brand recall)
  - Creative refresh: $400 (producing 3–4 new ad creative variants/month)
  - Expected ROAS: 3.5–4x by month 3. Revenue: $7,000–$8,000/mo. **Net: $5,000+/mo after spend.**

At this tier, the business is actively scaling. Sean's ongoing role becomes weekly optimization, monthly creative production, and quarterly strategic review.

### The Compounding Case

The compounding effect of sustained ad spend is where the math becomes irresistible:

  - Month 1 at $500: 1,500 new site visitors → retargeting pool grows
  - Month 3 at $500: retargeting pool now holds 4,500+ past viewers → retargeting ROAS climbs to 6x+
  - Month 6: customer list hits 100+ → lookalike audiences become Meta's highest-performing targeting input
  - Month 12: email list (auto-captured via the three CTAs) holds 500+ → free revenue channel on every product drop

Stopping paid media mid-growth resets this compounding. **The real cost isn't the monthly ad spend — it's the revenue left uncaptured by not doing it.**

---

## 5. The First 90 Days — A Concrete Plan

### Month 1: Retargeting Only

**Budget**: $100–$300 total, all retargeting.

**Why**: Retargeting requires zero audience research. Meta Pixel is already firing; the audience (past site visitors) builds itself. Retargeting converts 2–4x higher than cold, so the first dollars spent are the highest-ROAS dollars we'll ever spend.

**Setup**:
  - 1 campaign: "Retargeting — past 14 days"
  - 2–3 ad creatives featuring the highest-viewed product from GA4 data
  - Dynamic product ads (pulls directly from the Meta catalog we've already configured)

**Success metric**: 3x+ ROAS by end of month.

### Month 2: Add Lookalike Audiences

**Budget**: Scale to $300–$700 if Month 1 ROAS hit target; pause if not.

**Why**: By month 2, we'll have enough customer data (5-10+ purchases) to build a Meta lookalike audience — "people similar to Emaline's actual customers." This is Meta's single most powerful cold-audience targeting tool.

**Setup**:
  - Keep retargeting campaign running (now scaled up)
  - New campaign: "Lookalike — 1% of customer list"
  - New creative: 2–3 ads featuring brand story, not just product

**Success metric**: Lookalike campaign hits 2x+ ROAS within 14 days; scale budget to winners.

### Month 3: Scale Winners, Kill Losers, Evaluate Continuation

**Budget**: $500–$2,000+ depending on Month 2 results.

**Why**: By now we have 8+ weeks of performance data per ad. Meta's algorithm has learned who converts. We cut the bottom 30% of creative/audience combos and 2x the top 20%.

**Setup**:
  - Creative refresh (burnout sets in around 4-6 weeks per ad)
  - Launch Instagram Reels ad placement (cheaper CPM, rising returns)
  - Start tagging organic Instagram posts with shopping (leveraging the Meta catalog)

**Success metric**: Clear pattern of winners producing 4x+ ROAS. Scale them, maintain rest.

### Ongoing: The Pattern

After month 3, the rhythm stabilizes:
  - Weekly: Check ROAS, pause losers, increase budget on winners
  - Bi-weekly: Creative refresh (new photo, new video, new angle)
  - Monthly: Audit audience performance, add new lookalikes from fresh customer data
  - Quarterly: Strategic review — budget allocation, new channels (Pinterest, TikTok)

This is what Sean's ongoing retainer would cover.

---

## 6. What Good Looks Like: KPI Targets

At 3 months post-launch with active advertising, these are the numbers that indicate everything is working:

| KPI                     | Baseline (no ads) | With $500/mo ads | Source                                    |
| ----------------------- | ----------------- | ---------------- | ----------------------------------------- |
| Monthly unique visitors | 500-1,000         | 2,500-5,000      | GA4 → Audience                            |
| `view_item` per visit   | 2.5               | 3.0              | GA4 Monetization                          |
| `add_to_cart` rate      | 4-6% of views     | 6-8%             | GA4 funnel                                |
| `begin_checkout` rate   | 50% of carts      | 55%              | GA4 funnel                                |
| `purchase` rate         | 1.5-2%            | 2.5-3.5%         | GA4 Monetization                          |
| Email list growth       | ~20/mo            | 80-150/mo        | `newsletter_signup` + `email_cta_capture` |
| Subscriber → Customer   | 3-5%              | 5-8%             | `customer_email_linked` ratio             |
| Blended ROAS            | N/A               | 3-4x             | Meta Ads Manager                          |
| Monthly revenue         | $500-$1,500       | $3,000-$8,000    | Orders table                              |

Industry benchmarks for these rates come from the sources cited throughout this document, primarily [Triple Whale's 2025 Ecommerce Benchmarks](https://www.triplewhale.com/blog/ecommerce-benchmarks) and [Enrich Labs' 2026 Meta Ads Benchmarks](https://www.enrichlabs.ai/blog/meta-ads-benchmarks-2025).

---

## A Closing Note on Artisan Brands

There's a quiet truth about handmade, story-driven brands that most marketing advice misses: the emotional proposition is the hardest part, and Everlastings has already done it. The work is real, the story is real, the audience exists. What's left is arithmetic — showing it to enough of the right people.

Paid media is arithmetic.

Organic reach at 3.5% means for every 100 people who follow Emaline today, only 3-4 see each new piece. For this brand to grow past a plateau of 1-2 sales per month, the math demands a reliable way to reach new collectors every week. Ads are that way. They're not a vanity layer or a "nice to have" — at this moment in 2026, for this category, they're table stakes.

The good news: the infrastructure is built. The Pixel is firing. The catalog syncs to Instagram daily. Every KPI is tracked. The only remaining question is whether to activate it.

---

## Sources

  - [social.plus — Only 3.5% of Followers See Your Instagram Posts (2025)](https://www.social.plus/blog/only-3-5-of-followers-see-your-instagram-posts---why-organic-reach-is-no-longer-a-growth-strategy)
  - [Jasmine Directory — Instagram's Algorithm Changes (2025)](https://www.jasminedirectory.com/blog/instagrams-algorithm-changes-death-blow-to-small-business-reach/)
  - [Triple Whale — Ecommerce Benchmarks 2025](https://www.triplewhale.com/blog/ecommerce-benchmarks)
  - [Triple Whale — Facebook Ad Benchmarks by Industry](https://www.triplewhale.com/blog/facebook-ads-benchmarks)
  - [Enrich Labs — Meta Ads Benchmarks 2026](https://www.enrichlabs.ai/blog/meta-ads-benchmarks-2025)
  - [WebFX — Meta Marketing Benchmarks 2026](https://www.webfx.com/blog/social-media/meta-benchmarks/)
  - [Digital Web Solutions — E-commerce Conversion Rate Statistics 2025](https://www.digitalwebsolutions.com/blog/ecommerce-conversion-rate-statistics/)
  - [NewswireJet — 9 Retargeting Statistics for 2025](https://newswirejet.com/retargeting-statistics/)

---
*This document is meant to support an informed business decision. The numbers are real, the plan is conservative, and the infrastructure is already built. The rest is a conversation.*