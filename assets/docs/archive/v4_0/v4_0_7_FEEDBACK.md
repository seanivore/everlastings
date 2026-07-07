# v4.0 — Feedback & Still-to-Do

Human-formatted, Sean-facing. Running list for after Em plays with the dev store. Not a build gate — the site is live; these are polish + open questions. (Naming: the 7 = the bugs caught in this build — 3 in verification, 4 in Sean's review; see the BUILD_REPORT.)

## Fix next

  + Checkout price display
    - The /checkout summary shows one total line, and on a sale it reads the pre-discount amount
    - The correct, discounted amount IS charged — this is display only
    - Want: show list price and discounted price at the same time (Subtotal / Discount −$X / Total)
    - The fields already exist on the checkout session (subtotal, discount, total) — just render all three

## Still to test / open questions

  + Autofill helper fields
    - How the auto-fill helpers behave — and exactly when each should fill vs stay empty
    - Sean to add the specifics

  + SEO text didn't preview
    - Had SEO title/description written, but it didn't show in the preview
    - For the list — investigate later (does the preview page read the SEO fields?)

  + Mobile portal view
    - Possible mobile layout issue on the dashboard
    - Sean checking against the design with Claude Design

## Deferred edge — flag only if it bites

  + Stale dashboard tab after a GPT publish
    - The publish flow reconciles the dashboard tab that opened the preview
    - But if Em publishes a piece via the GPT while you ALSO have the dashboard open in a separate window, that other tab never gets the reconcile message
    - Editing that piece in the stale tab could re-trigger the write-back that un-publishes it (the bug #7 mechanism)
    - Rare. The clean fix (refetch when the tab regains focus) risks wiping out an open editor mid-edit, so it's left out for now
    - Revisit only if it actually happens

## Confirmed OK (checked this pass)

  + Media alt text
    - GPT is instructed to write descriptive alt for every image + thumbnail_alt
    - Backend blocks publish if any image/video alt is blank — can't go live without it
