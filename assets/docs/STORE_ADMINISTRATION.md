# Running Your Store — Everlastings by Emaline

A plain, step-by-step guide for the everyday things: adding pieces, taking them down, shipping orders, and handling refunds. Keep it nearby; you don't have to read it front to back — jump to the part you need.

---

## Three ways to do everything

You have three tools. They all change the same store — pick whichever is easiest in the moment.

| Tool                                | What it is                                      | Best for                        | When you'd reach for it                                                                                                 |
| ----------------------------------- | ----------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **The Sunkeeper** (your Custom GPT) | A ChatGPT that talks to your store              | Everything, hands-free          | Your default. Just chat.                                                                                                |
| **Creator Portal**                     | A dashboard at `everlastingsbyemaline.com/admin` | Forms + buttons, no chat        | When you'd rather click than type; if a helper is doing it for you; if ChatGPT is down or you're on a device without it |
| **Supabase Studio**                 | The raw database behind the store               | Quick fixes (nudge a stock count) | Last resort / power user — least guardrails, so go slow                                                                 |

**The short version:** chat with **The Sunkeeper** for almost everything. The **Creator Portal** does the exact same jobs with forms — it's your backup, and the place to send a contractor. **Supabase Studio** is the database itself; lovely for a quick flip, but easy to fumble, so only when you need it.

**Inside the Creator Portal** (`/admin`): four sections in the side menu — **Products** (your pieces, as a spreadsheet-style list of rows), **Orders** (sales to ship + refund), **Sales** (discounts + the store-wide sale), and **Account** (sign in/out + a running activity log). You sign in once at `/admin/account`. Each product row shows a small **colored light** on the left for its state — **green** = live, **yellow** = draft, **orange** = edits waiting, **blue** = sold, **grey** = archived.

**What the Sunkeeper handles vs. "let's set that up with Sean":** the Sunkeeper runs everything about your **pieces** — adding, editing, photos, prices, sales, and orders. The **look of the site itself** (the homepage mood, the hero, the static pages) is a *set-up-with-Sean* job, not a chat change — so "redo the front page" gets "let's set that up together," not a vague attempt.

> Logins live at the very bottom of this guide.

---

# Part 1 — Products

> **The big idea:** when you add or change a piece's words or photos, it doesn't go live instantly — the change is **staged** and you get a **preview** first (a real page, exactly how shoppers will see it). Look it over, then tap **Publish** (or tell the Sunkeeper "publish"). Until you do, the live store is untouched. A brand-new piece **must be previewed once** before its Publish button turns on. The only things that change *immediately* (no preview) are the **price**, the **stock count**, and the **Available** switch — those are true-right-away facts, not copy.

> **Starting vs. finishing a piece:** *starting* one is easy — a **title and a price** is enough to save a draft, so you can begin now and come back later. *Publishing* is where the full check happens: a piece needs its story, details, and photos complete before it can go live (the exact list is just below). The chat and the portal enforce the **same** checklist — neither is looser than the other.

## Add a new piece

**What a finished piece needs (the publish checklist).** You can save a draft with just a **title + price**, but to actually **publish** it, a piece needs all of:
- the **title**, a short **headline** (tagline), the **story**, and a **description**
- the **details**: **features**, **materials**, **care**, **shipping**, **dimensions** (W × D × H), and **weight**
- a **price** and a **quantity** (usually 1 — these are one-of-a-kind)
- photos: **one hero shot + at least 5 gallery photos** (6 minimum), and **every photo and video needs alt text** (a short description — it helps screen readers and search)

*The behind-the-scenes SEO + checkout wording writes itself at publish — you never fill those in, and they never hold you up.*

### With The Sunkeeper (easiest)
1. Open **The Sunkeeper** in your ChatGPT sidebar.
2. Say what you're adding — title, price, the story, the details. Talk naturally; it drafts all the wording for you (including the behind-the-scenes SEO + checkout text). It saves a partial draft to start, then walks you through anything the publish checklist still needs.
3. **Send your photos** — a clear hero shot plus **at least 5 more** (angles, details, a size reference). Easiest: **attach them right in the chat** and the Sunkeeper uploads them. Or share them as **links** — it'll ask, and a Google Drive / direct link is best for video or a big batch. The link taps:
   - **iPhone:** open the photo in Photos → **Share** → **Save to Files** (or the Drive app) → in **Google Drive**, long-press the file → **Share / Manage access** → **"Anyone with the link"** → **Copy link** → paste it to the Sunkeeper.
   - **Android:** open the photo → **Share** → **Drive** → open it in Drive → **⋮** → **Manage access / Share** → **"Anyone with the link"** → **Copy link** → paste it.
   - You can paste **several links in one message** — it adds them all.
4. It hands you a **preview** — open it and read the page (especially the **price**).
5. Tap **Publish** on that page (or say "publish"). It goes live + buyable, and the old preview link stops working.

*It never changes your price on its own, never skips the preview, and never publishes a piece that's missing a required field or a photo's alt text.*

### With the Creator Portal
1. Go to `everlastingsbyemaline.com/admin` and sign in (at `/admin/account`).
2. **Products → New** → fill the fields (same checklist as above) → open the **media box** to add photos and video → **Save.** A title + price is enough to save the draft; the rest can follow.
3. Tap **Preview** (required the first time — the Publish button stays greyed until you've looked once), then **Publish.** (Same draft → preview → publish habit everywhere.)

## Edit a piece — *the Sunkeeper can edit now!*

Just tell it what to change — "change the Lantern Cottage's story to…", "swap the second photo", "fix the price to $290." It **stages** the change and hands you a fresh **preview**; the live page stays exactly as it is until you **Publish**. Changed your mind on a previewed edit? Say **"discard"** and the live page is untouched. (The Creator Portal does the same: open the piece → edit → Preview → Publish.)

- **Price:** just say the new price — it updates **in place** on the same page and link, **right away** (no preview). It's a price change, not a new listing.
- **Stock / "it sold":** "restock to 3" sets the count. A piece with **0 left shows as _Sold_** and moves to the **Sold** tab — still browsable, still on its page, until you archive it. A real purchase drops the count for you, so a one-of-a-kind piece flips to Sold on its own. Setting the count is immediate (no preview).
- **Take it off the shop for now (Available):** flip **Available** off and the piece moves to **Drafts** (hidden) — *not* Sold. It's the "not right now" shelf. Flip Available back on and it re-runs the publish check to go live again. (Sold only ever means "someone bought it," never a switch you throw.)
- **Photos (the media box):** open a piece's media to add, replace, or reorder images and video. Drop files in, paste links (Google Drive, a direct URL, or a **YouTube** link for video), and **drag gallery photos to reorder** — the order you set is the order shoppers see, and it **saves with the piece** (the little number on each thumb is just a name tag, not its position). Mark one photo the **hero** (the main shot), the rest **gallery**; you can also set a **share** image (for links / social) and a **checkout** image. Every photo needs **alt text**. Heads-up: the **checkout image locks** the first time a piece publishes (like its checkout name) — the gallery and share image you can still change anytime.
- **Schedule a publish:** on a piece that's *ready to go live*, you'll see **"Schedule publish…"** — pick a **date** and it goes live on its own that morning. (It only appears once a piece passes the publish checklist, so a scheduled piece always actually publishes; it's by the day, not the minute.) Ask the Sunkeeper "schedule the Cottage for Friday morning" and it does the same — it reads the date back to you first.

## Sales & coupons

Two kinds of discount, both easy — run either from the **Sales** page in the portal or just by asking the Sunkeeper:

- **A code you share** (a coupon): *"Make a 15%-off code HOLIDAY15."* Shoppers type it at checkout. Percent-off or amount-off, store-wide or specific pieces, with an optional expiry or redemption cap.
- **An automatic store-wide sale:** *"Put the whole shop 20% off."* This is the no-code kind — the site shows **struck-through prices** everywhere, drops a little **sale bar** at the top plus a one-time welcome popup, and **applies the discount at checkout by itself** (nobody types anything). It's percent-off and store-wide by nature.

*"What sales are running?"* lists them; *"end the sale"* / *"end HOLIDAY15"* (or **Deactivate** on the Sales page) stops it on the spot. The Sunkeeper only ever touches **your** sales (the store's built-in welcome / cart codes are left alone). Stripe allows **one discount per order**, so if a shopper has a personal code during a store-wide sale, their code simply takes its place — nothing to worry about. (No "buy-one-get-one" — that one it can't do.)

## Take a piece down (archive — it's reversible)

"Take the Cottage down" / "remove it" **archives** the piece: it leaves the shop and its page, but it's **kept** — bring it back anytime with "resurface it." **Nothing is ever truly deleted.** (Different from *sold*, which keeps the piece visible with a Sold note.)

## What the little labels mean

Every piece is in one state — shown by the **colored light** on its row (and by the tab it lives under):
- **Live** (green) — on the store, buyable.
- **Draft** (yellow) — created, or taken off with the Available switch; hidden from the shop.
- **Edits waiting** (orange) — live, with a change you previewed but haven't published yet (still filed under the **Live** tab).
- **Sold** (blue) — someone bought it (0 left); stays on its page and in the **Sold** tab until you archive it.
- **Archived** (grey) — taken down, out of the shop, resurfaceable anytime.

The Products list has a tab for each: **Live · Drafts · Sold · Archived · All.**

## What the shop is set up for

Right now the store sells your **miniatures**. Adding a different *kind* of product (prints, storybooks, etc.) is a project to set up with Sean — not something the Sunkeeper can add on its own yet. So if you ask it for a "printable" and it says it can't, that's why.

---

# Part 2 — Orders, shipping & customers

## See your orders

- **Sunkeeper:** "Show me orders that need shipping." (Or "what's been shipped," or "find the order from jane@…")
- **Creator Portal:** `…/admin` → **Orders**. Filter by **Unfulfilled / Shipped / All**, or search by name, email, or order number. Each order shows the piece, the customer, and the **shipping address** (with a **Copy address** button).

> **You'll know when a new order lands.** The **Orders** item in the portal menu gets a small **dot** when there are orders you haven't looked at yet, plus a **number badge** for how many still need shipping — on every page, so nothing slips by. Opening Orders clears the dot.

## Ship an order (and tell the buyer)

You make the label yourself (Shippo or whatever you prefer), package the piece, then record the tracking so the buyer gets notified:

- **Sunkeeper:** "Mark order … shipped — USPS, tracking 9400…." It confirms with you, then **emails the buyer their tracking link automatically.**
- **Creator Portal:** Orders → find the order → type the **tracking number**, pick the **carrier** (USPS / UPS / FedEx / DHL) → **Mark shipped.** It emails the buyer their tracking link as it saves.

*Either way, the buyer gets a branded "your haven is on its way" email with a tracking link. You don't send anything by hand.*

> A **refunded** order **can't** be marked shipped — both the portal and the Sunkeeper stop you, so you never email a tracking number for money you've already given back.

> A **new-order email** also lands in your inbox (`orders@everlastingsbyemaline.com`) the moment someone buys, with the order details and these same shipping steps — so you don't have to go looking.

## Refund someone

You can issue a refund right in the **Creator Portal** *or* by asking **The Sunkeeper** — both do the real Stripe refund, and Stripe emails the customer automatically.

- **In the portal:** open the order → **Refund this purchase…** → a panel lists **every piece in that purchase** (they can span several orders on one payment). Tap **+ Add** on each piece you're refunding to sum its price into the **amount** (edit the amount freely for a partial or goodwill refund). Flip the separate **Relist** switch on any piece that physically **came back** — that puts it back on sale. Then **Refund**.
- **With the Sunkeeper:** "refund jane@…'s order for the Cottage" → it reads back the piece(s), the amount, and the buyer, waits for your **yes**, then issues it. Name **one** piece on a multi-piece purchase and it defaults to just that piece and its amount — it never quietly swaps in a different piece or number.

A few things to know:
- **One purchase can be several pieces** sharing one payment, so a refund is an **amount** — it refunds only the pieces you mark, never the whole cart by surprise.
- **Re-listing a returned piece is a separate yes.** In the portal it's the **Relist** switch; in chat the Sunkeeper asks piece by piece. Yes = the piece goes **back on sale** (adds 1 to its stock so it's live again). A refund never re-lists on its own — amount and relist are independent choices, so a goodwill refund with nothing relisted is fine.
- A **full** refund flips the order to **Refunded** in your list; a **partial** one usually won't change the status (refunding the full cart total does) — check Stripe if unsure. (A refunded order can no longer be marked shipped.)
- Stripe is still home for **payouts and payment history** (`dashboard.stripe.com`); the Sunkeeper can walk you through anything there (it web-looks-up the current steps).

> **One operator at a time.** The store is built for a single person managing it at once — don't drive refunds or edits from two tabs (or two people) simultaneously. A second seat is a future feature, not supported today.

## A customer has a question (where did it ship, what did they order, etc.)

- **Sunkeeper:** just ask — "What did jane@… order, and did her tracking email go out?" It reads it back to you.
- **Creator Portal:** Orders → search their name/email → the card shows the piece, address, tracking, and whether the tracking email was sent.

## Your account & the activity log

The **Account** page (in the portal menu) is where you **sign in and out**, see whether the store is in **Test** or **Live** mode, and jump to **View Site**. It also keeps a running **activity log** — a newest-first list of what's changed the store (a piece published, a sale started, an order refunded) — so you can glance back at what happened and when.

---

# Supabase Studio — a gentle primer

Studio is the **database itself** — the spreadsheet-like source behind your whole store. It's the most powerful tool and the one with the fewest guardrails, so it's best for **small, quick changes** (like flipping a piece to sold) rather than adding whole products.

**Opening it**
1. Go to the Studio link (bottom of this guide) and log in.
2. Left sidebar → **Table Editor**.
3. Pick the **products** table (your pieces) or **orders** (sales).

**Making a quick change** (example: mark a piece sold)
1. In **products**, find the piece's row (search the **title** or **slug** column).
2. Click the **quantity** cell → set it to `0`. (0 left = **Sold** — that's the signal the store actually reads for "it sold.")
3. Click the green **Save** when prompted.

**Go slow:**
- Change only the cell you mean to. Other columns (like the Stripe IDs or the slug) keep the store working — leave them alone.
- Don't delete rows unless you're sure. **Archive** (via the Sunkeeper / portal) is the proper "take it down."
- **Availability + publishing are best flipped in the portal, not here.** The **Available** switch there does the right thing (moves a piece to Drafts and keeps Stripe in sync); a raw `available` / `is_published` flip in Studio skips that and can leave the store and Stripe out of step.
- **Never *publish* from Studio.** Flipping `is_published` to true here (or adding a row to make it live) skips the safety checks + the Stripe link, leaving an invisible, unbuyable piece. Publish from the **Creator Portal** ("Publish") or the **Sunkeeper**.
- Prices, full new products, and photos are much safer through the Sunkeeper or the Creator Portal.

---

# Quick reference — logins & links

- **The Sunkeeper:** in your ChatGPT sidebar (My GPTs). Sean set it up; bookmark it.
- **Creator Portal:** `https://everlastingsbyemaline.com/admin` — sign in at `/admin/account` with your admin email + password. Sections: **Products · Orders · Sales · Account.**
- **Stripe dashboard:** `https://dashboard.stripe.com` — for refunds and payment history.
- **Supabase Studio:** `https://supabase.com/dashboard/project/rvnxftbfeaxymhzxxhjm` — the database (Table Editor → products / orders).
- **Your store inboxes** (all reach you): `admin@`, `orders@`, `hello@`, `shipping@everlastingsbyemaline.com`.

# If something feels off

- The Sunkeeper says *"the connection key needs Sean's attention"* → text Sean.
- A piece won't save, an email didn't go out, or a number looks wrong → take a screenshot and text Sean.
- You're not sure which tool to use → use the Sunkeeper; it can almost always help, or tell you to use the Creator Portal.
- **The whole store or admin won't load** (products missing, errors everywhere, or a "project paused" notice) → the database may have gone to sleep after a quiet stretch. **Text Sean — he wakes it back up.** You don't need to, and neither the Sunkeeper nor the Creator Portal can. *(For Sean/a contractor: Supabase dashboard → the project → **Restore**, or the Management API. A daily keep-alive cron normally prevents this — see the architecture doc.)*

*This guide is yours — Sean keeps it current. Questions: sean@august.style*
