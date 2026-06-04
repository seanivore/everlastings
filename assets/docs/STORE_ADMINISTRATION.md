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

> Logins live at the very bottom of this guide.

---

# Part 1 — Products

## Add a new piece

### With The Sunkeeper (easiest)
1. Open **The Sunkeeper** in your ChatGPT sidebar.
2. Say what you're adding — title, price, the story, the details. Talk naturally; it'll ask for anything it needs.
3. **Drag your photos into the chat** — at least 7 (one clear front shot, plus angles, details, a size reference).
4. It shows you a **preview**. Read it — especially the **price**.
5. Say "looks good" and it creates the piece. You'll get a link to the live page in a few seconds.

*It will never change your price, never skip the preview, and never post with fewer than 7 photos.*

### With the Admin panel
1. Go to `everlastingsbyemaline.com/admin` and log in.
2. Click **New Product**.
3. Fill in the fields (they match what you'd tell the Sunkeeper: title, headline, story, description, features, price, etc.).
4. **Upload your photos** right in the form.
5. Click **Save** — it's live immediately. Use **Preview** first if you want to see it.

### With Supabase Studio
Adding a *whole* piece here is fiddly (photos, lists, and the Stripe link all have to be just right), so **use the Sunkeeper or Admin panel to add pieces.** Studio is for quick edits (below), not full adds.

---

## Take a piece down / mark it sold

When something sells in person, or you want to retire it:

- **Sunkeeper:** "Mark *The Sunkeeper* as sold." (Or ask it to take the piece down.)
- **Admin panel:** open the product → **Edit** → set **Available** to off (and quantity to 0) → **Save.**
- **Supabase Studio:** Table Editor → **products** → find the row → set **available** to `false` → save. (See the Studio primer below.)

*(When a piece sells through the website, it's marked sold automatically — you don't have to do anything.)*

## Change or replace a piece

- **Edit what's there** (fix a typo, new price, new photo): **Admin panel** → find the product → **Edit** → change → **Save.** (A price change quietly updates Stripe for you.) The Sunkeeper can't *edit* existing pieces yet — use the Admin panel for edits.
- **Swap one piece for another:** take the old one down (above), then **add the new piece** (Sunkeeper or Admin panel).

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

**Important:** a refund does **not** automatically put the piece back up for sale. If you want it available again, **relist it**: Admin panel → the product → **Edit** → set **Available** back on → **Save** (or ask a quick Studio flip). The Sunkeeper can guide you through a refund, but it can't do the refund for you.

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
- Don't delete rows unless you're sure; "set available to false" is the safe way to hide a piece.
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
