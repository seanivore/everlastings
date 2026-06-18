# FUTURE spec — small design-polish gaps (sitewide)

> **Not part of the v3.3.0 build.** A collector for small, standalone design bugs found outside the v3.3.0 design scope (which is /admin + the homepage). Kept OUT of the v3.3.0 execution guide; fold into a later build. The v3.3.0 executor should ignore it.

## 1. Consent row — flexbox `gap` is spacing every word/link

**Symptom:** in the Firelight Council signup (and the inline interest forms), the consent line renders with big gaps between the pieces — `☐  I agree to   Terms   &   Privacy Policy   .` — the links, the "&", and the trailing "." all float apart.

**Cause:** the row is `<label class="checkbox-label">` and that class is a flex container with a gap:
```
/* assets/css/styles.css:544 */
.checkbox-label { display: flex; align-items: flex-start; gap: var(--space-sm); … }
```
The label's children are the checkbox **plus the raw inline content** — `I agree to`, `<a>Terms</a>`, `&amp;`, `<a>Privacy Policy</a>`, `.` — and flexbox makes each `<a>` a flex item while each bare text segment becomes an *anonymous* flex item. So `gap: var(--space-sm)` is inserted between **all** of them, not just between the checkbox and the sentence.

**Fix (executable):** wrap everything after the checkbox in a single inline element, so the flex row has exactly two children — `[checkbox] [sentence]` — and normal inline word-spacing governs inside the sentence:
```html
<label class="checkbox-label">
  <input type="checkbox" required>
  <span>I agree to <a href="/terms">Terms</a> &amp; <a href="/privacy">Privacy Policy</a>.</span>
</label>
```
No CSS change needed (the `gap` now only separates the checkbox from the span). Optionally add `.checkbox-label > span { … }` if any tuning is wanted.

**Locations (both consent variants, every page that has these forms):**
- Canonical: `_template.html` (~`:224` the "Please email me. I agree to…" inline-interest variant, and ~`:238` the bare "I agree to…" popup variant).
- Per page (same two variants each): `index.html` (`:521`, `:535`), `product.html` (`:545`, `:559`), `contact.html` (`:322`, `:336`), `about.html` (`:304`, `:318`), `complete.html` (`:327`, `:341`). Check `shop.html` / `policies.html` / `shipping.html` / `terms.html` / `privacy.html` / `faq.html` for the same footer-popup markup.
- Styleguide reference `_components.html:221` can be updated to match (optional — it's the dev styleguide).

**Note:** mechanical, repeated edit — a good candidate to delegate to one subagent across all files, since the change is identical (`wrap the post-checkbox sentence in <span>…</span>`).
