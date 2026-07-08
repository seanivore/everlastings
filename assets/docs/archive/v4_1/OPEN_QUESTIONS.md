# OPEN QUESTIONS — v4.0.9 admin/ batch (needs a backend answer or Sean's call)

**NOTE**: UI updates and completion of other bug reports drove v4.0.9 -> v4.1.0

Companion to `CHANGELOG_GAPS.md`. These are the touch-points where a UI change here implies a
backend decision or confirmation. Nothing below was implemented on the backend — flagging per the
handoff's "hunt for backend work a UX change silently created."

> Context: this is the sandboxed Claude Design mirror. "Here"/`admin/` = sandbox; "there" = the
> `everlastings` repo. See `admin/SANDBOX_NOTES.md`.

## R — Refund / Resolved (Contract A)

1. **Response shape confirm.** The UI now expects `POST /api/orders/:id/refund` to accept
   `resolved_product_ids` (+ existing `relist_product_ids`, `amount_cents`) and to flip those
   lines to **`status: "resolved"`**, returning `{ ok, status, relist:[...] }`. Please confirm the
   endpoint returns `resolved` (not `refunded`) for a resolved/relisted line, and that the
   per-piece `resolved` status is what a subsequent `GET /api/orders` reports.
2. **Amount-optional / resolve-only.** The modal can now submit with **no `amount_cents`**
   (resolve or relist a lingering piece without a money refund — Sean's exact gap). Confirm the
   endpoint accepts a resolve-only call (no Stripe refund, just the status flip). If a $0 Stripe
   refund is disallowed, our omitting `amount_cents` should be the correct signal.
3. **Resolved pill color.** We gave "Resolved" a slate pill distinct from Refunded (blue),
   Shipped (green), Needs-shipping (orange). Sean — does that read right, or do you want Resolved
   to look closer to Refunded (both "closed")?

## F-1 — On-blur field generation

4. **checkout_name / checkout_line in the preview bar.** We generate + show these in the *editor*
   on title blur, but `editorPayload` deliberately omits `checkout_*` (they "auto-generate at
   publish then freeze"), so they are **not persisted pre-publish** — the storefront preview bar
   still shows them via page-copy fallback rather than a stored value. To make the bar show real
   stored values before publish, the backend needs to either (a) accept `checkout_name` /
   `checkout_description` on the pre-publish PUT/POST, or (b) run the publish-time generator at
   preview time. **slug + seo_title + seo_description DO persist** (slug on create, SEO via
   `editorPayload`), so those three already populate the preview bar. Which do you want for checkout?
5. **Published-edit edge.** We gated on-blur generation to **never-published** pieces only, so
   focusing through fields on a live piece can't silently spawn a draft. If you want blank SEO/
   checkout fields to also auto-fill (and persist as staged edits) on an already-published piece,
   that's a deliberate extra — say the word.

## F-4 — Slug lock

6. **Slug edit after create, before publish.** `editorPayload` omits `slug` (immutable on PUT per
   `products.ts:414`), and slug is sent only on create. So a slug edited after the row exists but
   before publish won't persist. We show the field as editable until `everPublished` with a "Locks
   after publish" chip. Confirm that's the intended behavior, or should the field lock as soon as
   the row is created (`!isNewRow`) to match the server's immutability?

## M — Media (Contract B)

7. **Per-role upload on Apply — confirm crops.** Uploads now fire on **Apply**, one multipart
   `POST /api/upload` per assigned role (role values `hero` / `gallery-NN` / `seo_thumbnail` /
   `checkout_image` / `video-NN`, `skip_transform` for video). Please confirm this matches the
   server's per-role crop table (esp. Thumbnail = **16:9 / 1200**) and that gallery/video `-NN`
   numbering computed at Apply won't collide with existing R2 keys.
8. **Local video role numbering.** Local video files now upload on Apply with a `video-NN` role
   computed from existing `p.media` + in-batch items. Confirm the server treats `video-NN` the
   same as the old on-drop path (no transform, poster handled separately).

## data.js — SEAM

9. **orders.product_id.** We added `product_id` to the mock order rows so Resolved/Relist work in
   the sandbox. Confirm the real `GET /api/orders` selects `product_id` on each line (Relist/
   Resolved both key off it). If it's already there, nothing to do.
