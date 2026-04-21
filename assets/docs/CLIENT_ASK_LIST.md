# Client Setup Checklist — Everlastings by Emaline

**For**: Emy
**From**: Sean
**Purpose**: One-stop list of everything I need you to confirm, create, or share so I can finish wiring up `everlastingsbyemaline.com` on my end. This replaces pinging you one-at-a-time.

Each item tells you (a) **what** to do, (b) **why** we need it, (c) **roughly how long** it takes, (d) **what to send me** when you're done.

Nothing here involves code. Most items are clicks in a dashboard. If anything feels fuzzy, text me and I'll walk through it live.

---

## 0. Supabase access (do this first — it's already waiting for you)

Supabase is the database that holds all your products, customers, and orders. I need you to create an account on it and accept the invite I already sent, so you can see admin data if you ever need to.

  1. **Find the invite email**: check your inbox for the subject line **"admin has invited you to join Everlastings by Emaline"**.
  2. **Create a Supabase account** at `supabase.com` using `emyh@everlastingsbyemaline.com` as the login email.
  3. **Confirm your email**: check your inbox for the subject line **"Confirm your email and launch your projects on Supabase"** → click the confirm link.
  4. **Let me know**: email or message me at `sean@everlastingsbyemaline.com` saying "Supabase invite accepted." Then I'll add you to the Everlastings project on my end (Project Settings → Manage Members). You don't need to do anything else on the Supabase side after that.

  + **Time**: 5 minutes.
  + **Why it matters**: If there's ever a weird order or missing product, you or I can log in and look directly. It's also required if you want backup access in case something happens to me. There's nothing for you to *do* in Supabase day-to-day — the admin panel on the site handles everything.

---

## 1. Meta / Instagram Shopping setup

This is the biggest bucket and it unlocks Instagram Shopping (shoppable tags on posts, product catalog in your profile). It's a multi-step chain — each step has to happen in order before the next works.

### 1a. Confirm your Meta Business Manager access
  + **What**: Go to `business.facebook.com` and log in. Confirm you see the "Everlastings by Emaline" (or similar) business.
  + **Why**: Every Instagram Shopping piece sits under this account.
  + **Time**: 2 minutes.
  + **Send me**: A screenshot confirming you're in, or say "confirmed, I can log in."

### 1b. Instagram account → Business profile
  + **What**: In the Instagram app → Settings → Account → Switch to Professional Account → Business.
  + **Why**: Personal accounts can't connect to a shopping catalog.
  + **Time**: 3 minutes.
  + **Send me**: Say "done" when it's switched.

### 1c. Connect Instagram to your Facebook Page
  + **What**: In your Business Manager → Accounts → Instagram → Add → link your IG to the Everlastings FB Page (not your personal page).
  + **Why**: Instagram Shopping needs the FB Page as the commercial "home."
  + **Time**: 5 minutes.
  + **Send me**: Say "done" or screenshot if anything looked off.

### 1d. Create a Commerce Manager catalog
  + **What**: Go to `business.facebook.com/commerce` → Create catalog → **Type: E-commerce** (not a different type — this one matters).
  + **Why**: The catalog is where your products get listed for Instagram to tag. It starts empty; the site will fill it automatically later.
  + **Time**: 5 minutes.
  + **Send me**: The catalog name (so I can confirm I'm looking at the right one).

### 1e. Create a Meta Pixel
  + **What**: In Business Manager → Events Manager → Data Sources → Add → Web → create a pixel named "Everlastings Website" (or similar).
  + **Why**: This lets us see which Instagram/Facebook ads bring shoppers to the site, and lets us do retargeting (showing ads to people who visited but didn't buy).
  + **Time**: 3 minutes.
  + **Send me**: The **Pixel ID** (a long number string shown right after creation).

### 1f. Generate a Meta system-user access token
  + **What**: Business Manager → System Users → Add → name it "Everlastings Feed" → Generate New Token → scope: `catalog_management` only.
  + **Why**: The site needs permission to push your product catalog to Meta automatically.
  + **Time**: 5 minutes. This one's fiddly — ping me and I'll screen-share if needed.
  + **Send me**: The token (paste it into a private note, don't email it plaintext — send via signal/password manager).

### 1g. Domain verification
  + **What**: This is a two-part dance. I'll give you a verification code; you paste it into a Meta setting; I add a matching record to our DNS.
  + **Why**: Meta requires it before Instagram Shopping goes live.
  + **Time**: 10 minutes of coordination with me.
  + **When**: Wait for me to start this one — I'll reach out to coordinate the handoff.

### 1h. Submit shop for Commerce review
  + **What**: Once 1a–1g are done, Commerce Manager will offer a "Submit for review" button on your catalog. Click it.
  + **Why**: Meta reviews new shops (usually 1–2 weeks) before letting you tag products in Instagram posts.
  + **Time**: 2 minutes to submit; then a waiting period on their end.
  + **Send me**: Screenshot of the "submitted" confirmation.

---

## 2. Shippo (USPS label printing)

Shippo handles the actual shipping label printing for orders. Free tier gives us 30 labels/month — more than enough for v1.

  + **What**:
    1. Go to `goshippo.com` → Sign up → choose the free **Starter** plan.
    2. Link your USPS account (there's a prompt that walks you through it — no USPS fee).
    3. Confirm your shipping-from address matches your real shipping location.
  + **Why**: When an order comes in, you'll log in to Shippo, paste the shipping address I surface in your admin panel, print the label. Then paste the tracking number back into the site — the customer gets a branded tracking email.
  + **Time**: 15 minutes including USPS link.
  + **Send me**: Say "Shippo ready, USPS linked" when done. No keys or tokens needed — you use their web dashboard only.

---

## 3. Stripe account (payments)

Stripe processes the actual credit card transactions.

### 3a. Confirm account ownership
  + **What**: Decide if the Stripe account should be owned by you (Emy, personally or via Everlastings LLC/sole prop) or by me on your behalf. For a real business you almost certainly want it in your name — that's where payouts go.
  + **Why**: Stripe payouts land in a bank account tied to the account holder. It also determines whose tax ID is on file.
  + **Send me**: "I'll own it" or "you own it on my behalf" — then I'll hand off the next steps accordingly.

### 3b. Provide account profile info (if you own it)
  + **What**: Stripe will ask for: business name, address, phone, EIN or SSN (for payouts), bank account details.
  + **Why**: Regulatory requirement — Stripe is a regulated money-transmitter and needs to verify who's receiving payments.
  + **Time**: 20 minutes once you're ready. They do ask for real documents (ID, maybe business registration).
  + **Send me**: Confirm when signup + bank verification is done. I don't need any keys or secrets — I'll grab those from the dashboard.

---

## 4. Content (optional — separate track)

Not blocking the build, but the sooner these exist, the sooner the site stops showing placeholders.

  + **Photos**: 7–15 per product (hero, gallery, thumbnail, maybe a video or two).
  + **Story cards**: 2–8 short paragraphs per product. Poetic / evocative. The Custom GPT I'm building for you will help draft these.
  + **About page**: Your origin story, philosophy, mission. ~300–500 words.
  + **Send me**: Upload to a shared folder (or Google Drive link) whenever a product is ready to go live. We don't need all of them at once.

---

## Quick recap — what you're sending me

When you finish each piece, here's the cheat sheet of what lands back in my inbox:

| Item                           | What to send me                               |
| ------------------------------ | --------------------------------------------- |
| 0 — Supabase invite accepted   | "Supabase invite accepted"                    |
| 1a — Business Manager access   | "Confirmed" + screenshot                      |
| 1b — IG Business profile       | "Done"                                        |
| 1c — IG connected to FB Page   | "Done"                                        |
| 1d — Commerce catalog created  | Catalog name                                  |
| 1e — Meta Pixel created        | **Pixel ID** (number string)                  |
| 1f — System-user token         | **Token** (via private channel)               |
| 1g — Domain verification       | Coordinate with me — wait for my signal       |
| 1h — Shop submitted for review | Screenshot of "submitted" confirmation        |
| 2  — Shippo ready              | "Shippo ready, USPS linked"                   |
| 3a — Stripe ownership decision | "I'll own it" or "you own it"                 |
| 3b — Stripe signup done        | "Stripe ready, bank verified"                 |
| 4  — Content                   | Shared folder or Drive link                   |

---

## Things I'm handling — no action needed from you

Just so you know where the line is:

  + Supabase (database)
  + Cloudflare R2 (image hosting)
  + Cloudinary (image resizing)
  + Resend (email sending)
  + GA4 + Search Console (analytics)
  + Domain DNS (Cloudflare)
  + All the code + checkout flow + admin panel
  + All email templates + copy
  + Deploy + launch
