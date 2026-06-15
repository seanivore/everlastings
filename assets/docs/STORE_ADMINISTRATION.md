# Running Your Store — Everlastings by Emaline

A plain, step-by-step guide for the everyday things: adding pieces, taking them down, shipping orders, and handling refunds. Keep it nearby; you don't have to read it front to back — jump to the part you need.

---

## Three ways to do everything

You have three tools. They all change the same store — pick whichever is easiest in the moment.

| Tool                                | What it is                                      | Best for                        | When you'd reach for it                                                                                                 |
| ----------------------------------- | ----------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **The Sunkeeper** (your Custom GPT) | A ChatGPT that talks to your store              | Everything, hands-free          | Your default. Just chat.                                                                                                |
| **Admin panel**                     | A web page at `everlastingsbyemaline.com/admin` | Forms + buttons, no chat        | When you'd rather click than type; if a helper is doing it for you; if ChatGPT is down or you're on a device without it |
| **Supabase Studio**                 | The raw database behind the store               | Quick fixes (mark a piece sold) | Last resort / power user — least guardrails, so go slow                                                                 |

**The short version:** chat with **The Sunkeeper** for almost everything. The **Admin panel** does the exact same jobs with forms — it's your backup, and the place to send a contractor. **Supabase Studio** is the database itself; lovely for a quick flip, but easy to fumble, so only when you need it.

**What the Sunkeeper handles vs. "let's set that up with Sean":** the Sunkeeper runs everything about your **pieces** — adding, editing, photos, prices, sales, and orders. The **look of the site itself** (the homepage mood, the hero, the static pages) is a *set-up-with-Sean* job, not a chat change — so "redo the front page" gets "let's set that up together," not a vague attempt.

> Logins live at the very bottom of this guide.

---

# Part 1 — Products

> **The big idea (new):** when you add or change a piece, it doesn't go live instantly — you get a **preview link** first (a real page, exactly how shoppers will see it). Look it over, then tap **Publish** (or tell the Sunkeeper "publish"). Until you do, the live store is untouched. The only things that change *immediately* (no preview) are the **price**, marking a piece **sold**, and the **stock count** — those need to be true right away.

## Add a new piece

### With The Sunkeeper (easiest)
1. Open **The Sunkeeper** in your ChatGPT sidebar.
2. Say what you're adding — title, price, the story, the details. Talk naturally; it drafts all the wording for you (including the behind-the-scenes SEO + checkout text).
3. **Share your photos as links** — at least 7 (one clear front shot, plus angles, details, a size reference). A ChatGPT GPT can't grab a photo you paste *straight* into the chat, so it comes by link (it'll ask). The taps:
   - **iPhone:** open the photo in Photos → **Share** → **Save to Files** (or the Drive app) → in **Google Drive**, long-press the file → **Share / Manage access** → **"Anyone with the link"** → **Copy link** → paste it to the Sunkeeper.
   - **Android:** open the photo → **Share** → **Drive** → open it in Drive → **⋮** → **Manage access / Share** → **"Anyone with the link"** → **Copy link** → paste it.
   - You can paste **several links in one message** — it adds them all.
4. It hands you a **preview link** — open it and read the page (especially the **price**).
5. Tap **Publish** on that page (or say "publish"). It goes live + buyable, and the old preview link stops working.

*It never changes your price on its own, never skips the preview, and never posts with fewer than 7 photos.*

### With the Admin panel
1. Go to `everlastingsbyemaline.com/admin` and log in.
2. **New Product** → fill the fields (same as you'd tell the Sunkeeper) → **upload photos** in the form → **Save draft.**
3. Open the **preview**, then **Publish now.** (Same draft → preview → publish habit everywhere.)

## Edit a piece — *the Sunkeeper can edit now!*

Just tell it what to change — "change the Lantern Cottage's story to…", "swap the second photo", "fix the price to $290." It **stages** the change and hands you a fresh **preview link**; the live page stays exactly as it is until you **Publish**. Changed your mind on a previewed edit? Say **"discard"** and the live page is untouched. (The Admin panel does the same: Edit → Save draft → preview → Publish now.)

- **Price:** just say the new price — it updates **in place** on the same page and link, **right away** (no preview). It's a price change, not a new listing.
- **Mark a piece sold / change stock:** "mark the Cottage sold" or "restock to 3" applies **immediately** (no preview/publish) — a sold piece shows as *sold* but stays on its page. (A real purchase marks it sold automatically — you do nothing.)

## Sales & coupons (by chat)

Start a sale whenever the mood strikes: *"Make a 15%-off code HOLIDAY15."* The Sunkeeper sets up the code. *"What sales are running?"* lists them; *"end the HOLIDAY15 sale"* stops it on the spot. It only ever touches **your** sales (the store's automatic welcome/cart codes are left alone). Percent-off or amount-off, store-wide or specific pieces, with an optional expiry or redemption cap. (No "buy-one-get-one" — that one it can't do.)

## Take a piece down (archive — it's reversible)

"Take the Cottage down" / "remove it" **archives** the piece: it leaves the shop and its page, but it's **kept** — bring it back anytime with "resurface it." **Nothing is ever truly deleted.** (Different from *sold*, which keeps the piece visible with a Sold note.)

## What the little labels mean

A piece (in the admin list, or when you ask the Sunkeeper) is one of: **Live** (on the store) · **Draft** (created, not published yet) · **Live · edits pending** (live, with a change you previewed but haven't published) · **Archived** (taken down, resurfaceable).

## What the shop is set up for

Right now the store sells your **miniatures**. Adding a different *kind* of product (prints, storybooks, etc.) is a project to set up with Sean — not something the Sunkeeper can add on its own yet. So if you ask it for a "printable" and it says it can't, that's why.

---

# Part 2 — Orders, shipping & customers

## See your orders

- **Sunkeeper:** "Show me orders that need shipping." (Or "what's been shipped," or "find the order from jane@…")
- **Admin panel:** `…/admin` → **Orders** tab. Filter by **Needs shipping / Shipped / All**, or search by name, email, or order number. Each order shows the piece, the customer, and the **shipping address** (with a **Copy address** button).

## Ship an order (and tell the buyer)

You make the label yourself (Shippo or whatever you prefer), package the piece, then record the tracking so the buyer gets notified:

- **Sunkeeper:** "Mark order … shipped — USPS, tracking 9400…." It confirms with you, then **emails the buyer their tracking link automatically.**
- **Admin panel:** Orders → find the order → type the **tracking number**, pick the **carrier** (USPS / UPS / FedEx / DHL) → **Mark as shipped.** It asks you to confirm (because it emails the buyer), then sends the tracking email.

*Either way, the buyer gets a branded "your haven is on its way" email with a tracking link. You don't send anything by hand.*

> A **new-order email** also lands in your inbox (`orders@everlastingsbyemaline.com`) the moment someone buys, with the order details and these same shipping steps — so you don't have to go looking.

## Refund someone

Refunds happen in **Stripe** (not the Sunkeeper or Admin panel):
1. Log in to the **Stripe dashboard**.
2. **Payments** → find the payment → **Refund**.
3. Stripe **emails the customer** the refund confirmation automatically.

**The Sunkeeper can walk you through it** — ask "how do I refund jane@…'s order?" and it talks you through the current Stripe steps (it looks them up, since Stripe's screens change over time). It can't *do* the refund for you — that lives in Stripe, where you sign in for payouts anyway. A **full** refund automatically flips the order to **Refunded** in your orders list; a *partial* one won't change the status, so check Stripe for those.

**Want the piece available again?** A refund does **not** relist it. Just tell the Sunkeeper "mark the Cottage available again" (or Admin panel → Edit → Available on) — immediate, no preview.

## A customer has a question (where did it ship, what did they order, etc.)

- **Sunkeeper:** just ask — "What did jane@… order, and did her tracking email go out?" It reads it back to you.
- **Admin panel:** Orders → search their name/email → the card shows the piece, address, tracking, and whether the tracking email was sent.

---

# Supabase Studio — a gentle primer

Studio is the **database itself** — the spreadsheet-like source behind your whole store. It's the most powerful tool and the one with the fewest guardrails, so it's best for **small, quick changes** (like flipping a piece to sold) rather than adding whole products.

**Opening it**
1. Go to the Studio link (bottom of this guide) and log in.
2. Left sidebar → **Table Editor**.
3. Pick the **products** table (your pieces) or **orders** (sales).

**Making a quick change** (example: mark a piece sold)
1. In **products**, find the piece's row (search the **title** or **slug** column).
2. Click the **available** cell → set it to `false`.
3. Click the green **Save** when prompted.

**Go slow:**
- Change only the cell you mean to. Other columns (like the Stripe IDs or the slug) keep the store working — leave them alone.
- Don't delete rows unless you're sure; "set available to false" hides a piece, and **Archive** (via the Sunkeeper/Admin) is the proper "take it down."
- **Never *publish* from Studio.** Flipping `is_published` to true here (or adding a row to make it live) skips the safety checks + the Stripe link, leaving an invisible, unbuyable piece. Publish from the **Admin panel** ("Publish now") or the **Sunkeeper**.
- Prices, full new products, and photos are much safer through the Sunkeeper or Admin panel.

---

# Quick reference — logins & links

- **The Sunkeeper:** in your ChatGPT sidebar (My GPTs). Sean set it up; bookmark it.
- **Admin panel:** `https://everlastingsbyemaline.com/admin` — your admin email + password.
- **Stripe dashboard:** `https://dashboard.stripe.com` — for refunds and payment history.
- **Supabase Studio:** `https://supabase.com/dashboard/project/rvnxftbfeaxymhzxxhjm` — the database (Table Editor → products / orders).
- **Your store inboxes** (all reach you): `admin@`, `orders@`, `hello@`, `shipping@everlastingsbyemaline.com`.

# If something feels off

- The Sunkeeper says *"the connection key needs Sean's attention"* → text Sean.
- A piece won't save, an email didn't go out, or a number looks wrong → take a screenshot and text Sean.
- You're not sure which tool to use → use the Sunkeeper; it can almost always help, or tell you to use the Admin panel.
- **The whole store or admin won't load** (products missing, errors everywhere, or a "project paused" notice) → the database may have gone to sleep after a quiet stretch. **Text Sean — he wakes it back up.** You don't need to, and neither the Sunkeeper nor the Admin panel can. *(For Sean/a contractor: Supabase dashboard → the project → **Restore**, or the Management API. A daily keep-alive cron normally prevents this — see the architecture doc.)*

*This guide is yours — Sean keeps it current. Questions: sean@august.style*
