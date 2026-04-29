# Shippo Trust & Safety — Response Draft

**Status**: LOW PRIORITY — Shippo's free Starter plan covers v1 launch (30 USPS labels/month via the web UI). API access is a v1.1+ upgrade for direct UPS account linking, multi-user logins, and label automation. Send this when convenient; not blocking for v1.4.3 implementation.

**Reply-to context**: original Shippo email dated 2026-04-21 (Trust & Safety Team). Send from `admin@everlastingsbyemaline.com` (Emy's master admin alias) or whichever address Emy received the original on.

---

## Subject

`Re: Welcome to Shippo — additional info for verification`

## Body

Hi Shippo team,

Thanks for following up. Happy to share more about the business.

**Business**

Everlastings by Emaline (LLC) is a small handcrafted-goods studio operated by artist Emaline Hoff. We design and produce one-of-a-kind miniature dioramas, book nooks, and story lofts — collectible art objects that range roughly from $150 to $600 per piece. The studio is US-based and currently sells direct-to-consumer through our website, `everlastingsbyemaline.com`.

**How we plan to use Shippo**

We are integrating Shippo into our own e-commerce platform via the Shippo API. The integration covers:
- Creating shipping labels from order data captured at checkout (USPS primarily, with UPS as a secondary carrier we plan to connect via our own UPS account)
- Retrieving tracking numbers and rate information programmatically so they can be passed into customer-facing tracking emails
- Address validation on orders to reduce delivery failures

The store backend is a TypeScript service running on Vercel; Shippo is one of several APIs (Stripe for payments, Resend for transactional email, Cloudflare R2 for CDN) wired into that backend.

**Shipments**

- **Items**: handcrafted miniatures and small artwork — fragile, low-volume, packaged in custom boxes with protective interior
- **Customers**: individual collectors and gift buyers, primarily US
- **Primary regions**: United States to start; we expect occasional international (Canada, UK, EU) but those are likely <10% of volume in year one
- **Volume estimate**: under 30 shipments/month at launch, growing modestly

**Business registration**

I can provide our Articles of Organization and an EIN letter as proof of registration. Please let me know whether you'd like me to upload those through a portal or attach them directly in reply to this email.

Happy to answer any further questions.

Best,
Emaline Hoff
Everlastings by Emaline
everlastingsbyemaline.com

---

## Attachment Checklist (before sending)

- [ ] Articles of Organization (LLC formation document) — PDF
- [ ] EIN confirmation letter from IRS — PDF
- [ ] Optional: brief one-pager about the business with product photos (not required, but Shippo Trust & Safety teams often respond faster when the brand looks legitimate at a glance)

## Notes

- Tone deliberately matches the existing `BRAND.md` voice on the lower-emotion end of the spectrum — this is operational/legal correspondence, not marketing copy. Warm but factual.
- Mentions UPS account linking specifically since it's one of the API-tier benefits noted in the prep doc.
- "Under 30 shipments/month at launch" stays inside the free Starter cap so Shippo sees a realistic, not inflated, profile.
