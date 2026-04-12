# Cloudflare Domain Setup 

## Overview

The domain `everlastingsbyemaline.com` is currently managed by Squarespace and uses Google Workspace for email. The goal is to move the DNS management to Cloudflare. When we build the new site it will be hosted on Vercel and we'll be using a CDN through Cloudflare. 

### TL:DR 

The main rule is: Add domain to Cloudflare, let it move records, then confirm or recreate the email-related DNS records in Cloudflare. 

Before you switch nameservers, make sure these are present and correct in Cloudflare: 

  + MX records for Google Workspace (the ⁠ASPMX.L.GOOGLE.COM⁠ set)
  + SPF TXT (currently ⁠v=spf1 include:_spf.google.com ~all⁠)
  + DKIM TXT (the ⁠google._domainkey⁠ record you see in Squarespace)
  + Optional but recommended: DMARC TXT (⁠_dmarc⁠) if you want better deliverability

Then change nameservers at Squarespace to the Cloudflare pair. After propagation, the domain will be managed by Cloudflare and Squarespace records can be deleted. 

## Add Domain To Cloudflare

  + In Cloudflare, add `everlastingsbyemaline.com` as a site. 
  + Cloudflare will scan existing DNS records; you'll see a list that should include:
    - The Squarespace A records and CNAME for `www`
    - The Google TXT (SPF) record
    - The Google DKIM TXT (google._domainkey⁠)
    - The MX record(s)

### Adjust DNS Records For Google Workspace 

In Cloudflare's DNS page:

  1. Make sure MX records match Google's current recommended set from the Admin help docs 
     - They're usually multiple ⁠ASPMX.L.GOOGLE.COM⁠ hosts with different priorities 
     - Don't rely on the ⁠smtp.google.com⁠ shorthand 
     - Copy from Google's docs/Admin Console 

    **CONFIRMED**: Google Workspace now just uses the `⁠smtp.google.com⁠` as priority 1 and nothing else. 

  2. Add/verify DNS records 
     - TXT ⁠@⁠ → ⁠v=spf1 include:_spf.google.com ~all⁠
     - TXT ⁠google._domainkey⁠ → that long DKIM key (or regenerate in Google Admin if you want)
     - Optional: TXT ⁠_dmarc⁠ → something like ⁠v=DMARC1; p=none; rua=mailto:…⁠ if you want DMARC.

  3. Copy any other records you care about 
     - If there were any other custom DNS entries in Squarespace 
     - These would be subdomains, verification records, etc.
     - Make sure they exist in Cloudflare as well 

  4. After DNS is correct in Cloudflare, change nameservers at Squarespace 
     - Cloudflare will give you two nameservers 
     - E.g., alice.ns.cloudflare.com, bob.ns.cloudflare.com 
     - Switch Squarespace defaults / "managed by Google Workspace" to custom nameservers
     - Save and wait for propagation (during which some resolvers may still use the Squarespace records)

## Pointing Website To Vercel

Once DNS is fully on Cloudflare and the Vercel project is ready follow Vercel's "Custom Domain with Cloudflare" instructions. 

  + Point ⁠www⁠ to a Vercel-hosted CNAME
  + Optionally make the root (⁠@⁠) either redirect to ⁠www⁠ (via a page rule/redirect in Cloudflare) or use whatever Vercel recommends (flattened CNAME, etc.).

At that point the old Squarespace A records are no longer needed and can be replaced or deleted, since you're no longer using Squarespace for hosting.

---