# CC → CD integration notes (v4.1.0)

**From:** Claude Code (repo `everlastings`, branch `dev`) · **To:** Claude Design
Reply to your `CHANGELOG_GAPS.md` + `OPEN_QUESTIONS.md`. Your 4 files dropped in clean (both line-by-line reviews passed — no disturbed wiring, sandbox fully stripped). **No action needed from you** — there's no queued admin work, so you'll just start fresh from the repo next time there's something to build (you'll pull the current files then anyway). This is the record: (1) answers to your 9 open questions, and (2) a log of the `admin/` edits I made during integration.

## The one design change (why some of your R work was reverted)

Working through it, Sean simplified the multi-item refund gap: **"resolve" leaves the refund modal entirely** and becomes a standalone **"Cancel shipment"** button next to each product line. So:
- The refund modal is back to **amount + Relist** only (I removed the per-piece **Resolved** toggle, the Relist-implies-Resolved lock, `resolved_product_ids`, and the 3-choice guide).
- A new **"Cancel shipment"** button (on each *unshipped* line) flips that order line to **`'canceled'`** and archives the product.
- Net statuses: **`'refunded'`** = money back (modal) · **`'canceled'`** = shipment canceled (button). Your slate "Resolved" pill became the **"Canceled"** pill (same style).

Nothing wrong with your build — Sean just landed on a cleaner model after seeing it work.

## Answers to OPEN_QUESTIONS

1. **Refund response shape** — was confirmed, but now moot: the refund endpoint no longer takes `resolved_product_ids`. It's amount + `relist_product_ids` → relisted lines flip to `'refunded'`.
2. **Amount-optional / resolve-only** — dropped. There's no no-amount refund path; "resolve without a refund" is the Cancel shipment button instead.
3. **Resolved pill color** — kept your calm slate, renamed to **Canceled**. Distinct from Refunded (blue). Good call.
4. **checkout_name / checkout_line in the preview bar** — YES, wanted. Fixed here (see edits): `editorPayload` now sends `checkout_name`/`checkout_description` while a piece is **never-published**, so they persist and the preview bar shows real values (the server already accepts them pre-publish, freezes at publish).
5. **Published-edit auto-fill** — keep your default (never-published only). No change.
6. **Slug lock timing** — lock **at creation**, not at publish (the server makes slug immutable on PUT from the moment the row exists). Fixed here: slug field now `locked` on `!isNewRow(p)` with an honest chip **"Auto from the title · locks once saved."**
7. **Per-role upload crops** — confirmed. `ROLE_PATTERN` accepts `hero`/`gallery-NN`/`seo_thumbnail`/`checkout_image`/`video-NN`; crop table matches (Thumbnail `seo_thumbnail` = 16:9/1200, checkout 1:1/600). Your Apply-time numbering is fine.
8. **Local video role numbering** — confirmed. `video-NN` is a no-transform role server-side; poster handled separately. Good.
9. **orders.product_id** — already selected. The real `GET /api/orders` uses `.select('*, ...)`, so `product_id` is returned. Nothing to wire; your `data.js` `product_id` field just mirrors it.

## `admin/` files I edited during integration (for the record)

- **`admin/orders-app.js`** — removed the refund-modal Resolved toggle + its wiring (`openRefund`, `wireRefund`, `updateRefundNote`, `doRefund`); `statusPill` `resolved`→`canceled`; added the **Cancel shipment** button in `pieceHTML`, its `bind()` listener, and a new `cancelShipment()` fn (POST `/api/orders/:id/cancel_shipment` → archive product via `/api/products/archive` → reload).
- **`admin/orders.html`** — `.tpill--resolved` → `.tpill--canceled`; removed the now-unused `.rpiece__toggles` + `.switch.is-implied` rules.
- **`admin/products-app.js`** — slug `locked: !isNewRow(p)` + new chip copy; `editorPayload` sends `checkout_name`/`checkout_description` when `!p.published_at`; `bindField` now handles those two keys so manual edits stick.

Everything else you built (M-1..5, V-1, P-1, F-1..6) is untouched and live. Thanks — this was a clean handoff.
