# GPT Direct Image Upload (chat-attach) — push-toward-exclusively-executable

**Version**: v3.0.0 (preliminary tier — sits beside `v3_0_0_HOMEPAGE_EXPERIENCE.md`). **Status**: written *as executable as the platform allows* and **gate-ready under this name**; rename to `v3_0_0_GPT_DIRECT_IMG_UPLOAD_IMPLEMENT.md` (or fold into a `_IMPLEMENT`) only once the active **v2.0.0** build is done — we don't stand up a competing IMPLEMENT mid-build. **Initiative**: let Em hand the GPT product photos the *normal* way — **attach them in the chat** (any device) — instead of forcing a Google Drive / direct-URL link. **Net feature set:** a new `uploadImages` Action that accepts OpenAI's `openaiFileIdRefs` (chat-attached files), fetches each through the **existing** Cloudinary→R2 pipeline, and returns one CDN url per file; the by-link path stays as the deliberate backstop; the GPT stops rejecting pasted photos. **No new Vercel function, no DB migration.** **Required reading**: `api/upload.ts`, `assets/docs/archive/v3_3/v3_3_0_GPT_SCHEMA.txt`, `assets/docs/gpt/product-reference.md`, and this doc.

> **How to use this doc (anti-fragility rule).** Every code edit quotes a **CURRENT** block (the locator) and a **NEW** block. **Line numbers are hints; the quoted CURRENT text is the anchor.** If a CURRENT block doesn't match the working tree byte-for-byte, **STOP and reconcile** — never guess. Where a decision is genuinely empirical (model behavior — see §1.4), it's flagged for the gate/live-test, not silently resolved.

> ## ⭐ Product North Star (the lens for every decision)
> **Minimize the owner's friction to manage her store by chatting with her Custom GPT** — the GPT should do anything a capable agent could on her behalf. The relevant question here: *"Can Em give the GPT a photo the way she'd give any chatbot a photo — by attaching it?"* Today the honest answer is "no, only by link." This feature makes the answer "yes," while keeping the link path as a fallback.

> ## What this supersedes (do NOT edit those docs yet)
> The v2.0.0 docs assert a **structural limit**: *"a Custom GPT Action sends JSON and cannot forward a file a user pastes into the ChatGPT thread … so media arrives by link"* (`v2_0_0_IMPLEMENT.md:8` North Star + `:55`; echoed in `EVERLASTINGS_STORE.md`, `GPT_SETUP.md`, `product-reference.md`, and the GPT instructions). **That premise is outdated** — OpenAI's `openaiFileIdRefs` is the documented path for exactly this (§1.1). Promoting this doc to an IMPLEMENT includes updating that premise line in those docs to "**native chat-attach via `openaiFileIdRefs`, with by-link as the fallback**." **Leave the v2.0.0 docs untouched until that build ships** (the orchestrator owns them; no mixed-truth churn mid-build).

---

## Invariants to preserve (every phase)

- **CommonJS / tsc-clean.** Run `npx tsc --noEmit -p tsconfig.json` after the `api/upload.ts` edits; clean.
- **No new Vercel function.** Everything folds into the existing `api/upload.ts`; the new Action path reaches it via a `vercel.json` rewrite (Phase 3), exactly like `/api/products/publish` → `/api/products?_action=publish`. Function count unchanged.
- **No DB migration.** The `download_link`s arrive in the request; nothing is persisted beyond the CDN object the pipeline already writes. No `upload_sessions` table, no token.
- **The by-link path stays.** `uploadImage` (Drive / direct URL) is the **backstop** for platform flakiness (§1.4) and the path for video + bulk/desktop. Dual path by design — never removed.
- **`is_test` isolation holds.** The new path reuses the same pipeline, so filenames/keys stay `test/…` vs `products/…` per `isTest` (`api/_lib/env.ts:2`). Never user-editable.
- **SSRF guard holds.** Every fetched `download_link` runs through the existing `isPublicHttpUrl` (`api/upload.ts:100`) before fetch — `files.oaiusercontent.com` is public https, so it passes; private/loopback hosts stay blocked.
- **Auth unchanged.** `authorize()` (`api/upload.ts:24`) already accepts `PRODUCT_API_KEY` **or** a Supabase JWT; the new path needs nothing new.

---

# Part 1 — Decisions & architecture (the why)

## 1.1 The mechanism — `openaiFileIdRefs` (documented, with sources)

OpenAI Custom GPT Actions support receiving files the user attached to the chat (also DALL·E images / Code Interpreter files) via a specially-named request-body property, **`openaiFileIdRefs`** (case-sensitive, literal name):

- **Schema:** declared as `type: array, items: { type: string }`, but **at runtime each element is an object** `{ name, id, mime_type, download_link }`. Other properties (`slug`, `roles`) **may coexist** in the same `requestBody` schema.
- **Delivery:** the endpoint **downloads the bytes** from `download_link` (an `https://files.oaiusercontent.com/…` URL). It is **not** inline base64 (base64 is unreliable — the model can't emit a long-enough string).
- **Limits:** **≤ 10 files per request**; each `download_link` is **valid ~5 minutes** — fetch promptly (we do, synchronously).
- **Return-files-to-GPT** (`openaiFileResponse`) is the inverse direction — **not used here** (we return JSON urls).

Sources:
- Official: <https://developers.openai.com/api/docs/actions/sending-files>
- Real-world finickiness (blank `openaiFileIdRefs`, `422`s): community threads [581228](https://community.openai.com/t/how-to-send-image-as-an-input-from-custom-gpt-to-an-external-api/581228), [1191007](https://community.openai.com/t/file-upload-with-gpt-action-calling-api-endpoint/1191007), [519589](https://community.openai.com/t/uploading-files-uploaded-to-chatgpt-to-an-external-server-via-actions/519589).

## 1.2 Dual path by design — native primary, link backstop

The chat-attach path (`uploadImages`) is the *primary, normal-UX* path. The by-link path (`uploadImage`) is **kept** as the backstop because `openaiFileIdRefs` is documented-but-finicky (§1.4) — and a boring, reliable fallback for a flaky platform feature is the right posture (it's literally why Drive support exists). The two paths share the same server pipeline and the same CDN naming, so a product can be built from either.

## 1.3 Images attach; video + bulk stay on links

`openaiFileIdRefs` is image-oriented (the user attaches photos) and capped at 10/request. Product MP4s are larger and rarer, and Em already prefers Drive for video. So: **images → chat-attach (primary)**; **video + 10+ image bulk → by-link**. The GPT instructions reflect this split (Phase 4).

## 1.4 Role mapping — the one empirically-uncertain bit (gate question #1)

A product needs ≥ 7 photos with **roles** (`hero`, `gallery-01…`, etc.). When Em attaches a batch, two things are uncertain *and can't be settled by planning* — only a live probe (the gate/test) can:
1. Does the model reliably populate `openaiFileIdRefs` at all?
2. Does a parallel `roles[]` the model writes stay **aligned** with the platform-injected file order?

**Resolution that keeps the endpoint deterministic regardless** (so the *builder* decides nothing): the request carries `openaiFileIdRefs` + `slug` + an **optional** `roles[]`. The server resolves each file's role as `roles[i]` **if present and valid**, else a **positional default**: index `0` → `hero`, indices `1…` → `gallery-01`, `gallery-02`, … (≤ `gallery-15`). `thumbnail` is **not** required as its own upload — the GPT reuses the hero url for `thumbnail` on `createProduct` (the create allows that). Every resolved role is validated against the existing `ROLE_PATTERN` (`api/upload.ts:52`). So the endpoint is well-defined for `roles` present, absent, or short — and **the live test decides** whether to trust `roles[]` or fall back to positional + an owner confirm. *(Gate may revisit: per-file calls vs the batch + `roles[]`.)*

## 1.5 New `uploadImages` operation vs extending `uploadImage`

**Decision: a separate `uploadImages` operation** (a distinct path so OpenAPI allows a second POST), reached by a `vercel.json` rewrite to the same `api/upload.ts` function. Rationale: a dedicated operation with a clear summary ("for photos the owner **attached to the chat**") gives the model a clean routing signal and keeps each operation's `required` fields uncluttered. *(Alternative the gate could revisit: one polymorphic `uploadImage` accepting `url` XOR `openaiFileIdRefs`. Rejected for now — muddier `required` + model routing.)*

## 1.6 Reuse surface (precise)

- **The whole pipeline** — `api/upload.ts`: the JSON-intake branch (`129–174`), `normalizeMediaUrl` (`81`), `isPublicHttpUrl` (`100`), the fetch + content-type guard (`145–171`), `ALLOWED_MIME`/`MIME_TO_EXT` (`34–50`), `ROLE_PATTERN` (`52`), the Cloudinary transform + R2 put + filename/key scheme (`220–316`), `authorize` (`24`). The new path is a second front door on this exact machinery.
- **Schema** — `assets/docs/archive/v3_3/v3_3_0_GPT_SCHEMA.txt` (the `uploadImage` op at `266–284`; **no `securitySchemes` block** — auth is configured in the GPT-builder Actions UI, not the schema). Mind the **300-char `summary` cap** per operation; `description` fields are uncapped.
- **GPT brain** — `assets/docs/archive/v3_3/v3_3_0_GPT_INSTRUCTIONS_TRIMMED.txt` (MEDIA + LINK TROUBLE lines) + `GPT_SETUP.md §2A/§2B` + `assets/docs/gpt/product-reference.md` (Photos `56–61`, Media `115–119`).
- **Conventions** — `api/_lib/cors.ts` (`corsHeaders`/`preflight`, the `*.vercel.app` allowlist) and `api/_lib/env.ts` (`isTest`, `env`). All responses spread `corsHeaders(request)`.
- **Admin reference (not edited)** — `admin/index.html:189–229` + `assets/js/admin.js:358–400` show the multipart upload the pipeline already serves.

---

# Part 2 — Phased implementation (the how)

## Phase 1 — `api/upload.ts`: add the `openaiFileIdRefs` batch intake

**1a. Extract the per-file tail into a helper.** The current single-file validation + pipeline + success return (the block from the `if (!slug || !role)` recheck through the success `return jsonResponse(...)`, **current lines `195–316`**) **moves verbatim** into a new `processOne` that returns a result object instead of calling `jsonResponse`. Swap each `return jsonResponse(request, { error: … }, status)` in that block for `return { ok: false as const, error: …, status }`, and the final success `return jsonResponse(request, { url: publicUrl, filename })` for `return { ok: true as const, url: publicUrl, filename }`.

**NEW — the helper signature (the moved body fills the middle):**
```ts
type UploadResult = { ok: true; url: string; filename: string } | { ok: false; error: string; status: number };

async function processOne(file: File, slug: string, role: string, skipTransformField: string | null): Promise<UploadResult> {
  if (!slug || !role) return { ok: false, error: 'Missing file, slug, or role', status: 400 };
  if (!ROLE_PATTERN.test(role)) return { ok: false, error: 'Invalid role', status: 400 };
  // … the existing lines 202–316 body, verbatim, with the two return-swaps described above …
}
```

**1b. Branch the JSON intake to the batch path.** **CURRENT (`api/upload.ts:129–138`):**
```ts
  if ((request.headers.get('content-type') ?? '').includes('application/json')) {
    let body: { url?: unknown; slug?: unknown; role?: unknown; skip_transform?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return jsonResponse(request, { error: 'Invalid JSON body' }, 400);
    }
    if (typeof body.url !== 'string' || typeof body.slug !== 'string' || typeof body.role !== 'string') {
      return jsonResponse(request, { error: 'Missing url, slug, or role' }, 400);
    }
```
**NEW:**
```ts
  if ((request.headers.get('content-type') ?? '').includes('application/json')) {
    let body: {
      url?: unknown; slug?: unknown; role?: unknown; skip_transform?: unknown;
      openaiFileIdRefs?: unknown; roles?: unknown;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return jsonResponse(request, { error: 'Invalid JSON body' }, 400);
    }

    // Custom GPT chat-attach path. OpenAI populates `openaiFileIdRefs` with an array of
    // { name, id, mime_type, download_link } objects (download_link valid ~5 min, ≤10 files).
    // We fetch each link through the SAME pipeline and return one entry per file.
    if (Array.isArray(body.openaiFileIdRefs)) {
      return await handleAttachedRefs(request, body.openaiFileIdRefs, body.slug, body.roles);
    }

    if (typeof body.url !== 'string' || typeof body.slug !== 'string' || typeof body.role !== 'string') {
      return jsonResponse(request, { error: 'Missing url, slug, or role' }, 400);
    }
```
*(The single-file path that follows now ends by calling the helper: build `file/slug/role/skipTransformField` as today, then `const r = await processOne(file, slug, role, skipTransformField); return r.ok ? jsonResponse(request, { url: r.url, filename: r.filename }) : jsonResponse(request, { error: r.error }, r.status);` — replacing the inlined tail that moved into `processOne`. The multipart branch is unchanged up to that same shared call.)*

**1c. The batch handler (new function).**
```ts
type FileRef = { name?: string; id?: string; mime_type?: string; download_link?: string };

function positionalRole(i: number): string {
  if (i === 0) return 'hero';
  const n = String(i).padStart(2, '0'); // 1 → gallery-01 …
  return `gallery-${n}`;
}

async function handleAttachedRefs(request: Request, refs: unknown[], slugRaw: unknown, rolesRaw: unknown): Promise<Response> {
  if (typeof slugRaw !== 'string' || !slugRaw.trim()) {
    return jsonResponse(request, { error: 'Missing slug' }, 400);
  }
  if (refs.length === 0) return jsonResponse(request, { error: 'No files attached. Ask Em to attach the photos to the message.' }, 400);
  if (refs.length > 10) return jsonResponse(request, { error: 'Up to 10 files per message — send them in batches.' }, 400);
  const slug = slugRaw.trim();
  const roles = Array.isArray(rolesRaw) ? rolesRaw : [];

  const uploads: Array<{ url: string; filename: string; role: string }> = [];
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i] as FileRef;
    const link = typeof ref?.download_link === 'string' ? ref.download_link : '';
    const role = (typeof roles[i] === 'string' && ROLE_PATTERN.test((roles[i] as string).trim()))
      ? (roles[i] as string).trim()
      : positionalRole(i);
    if (!isPublicHttpUrl(link)) {
      return jsonResponse(request, { error: `File ${i + 1} had no usable download link (it may have expired — links last ~5 min; re-attach and try again).` }, 400);
    }
    let mediaRes: Response;
    try { mediaRes = await fetch(link, { redirect: 'follow' }); } catch {
      return jsonResponse(request, { error: `Could not fetch attached file ${i + 1}.` }, 400);
    }
    const fetchedType = (mediaRes.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!mediaRes.ok || !ALLOWED_MIME.has(fetchedType)) {
      return jsonResponse(request, { error: `Attached file ${i + 1} wasn't an allowed image/video (got "${fetchedType || 'unknown'}").` }, 400);
    }
    const bytes = Buffer.from(await mediaRes.arrayBuffer());
    const file = new File([bytes], `upload.${MIME_TO_EXT[fetchedType] ?? 'bin'}`, { type: fetchedType });
    const isVid = fetchedType.startsWith('video/');
    const r = await processOne(file, slug, role, isVid ? 'true' : null);
    if (!r.ok) return jsonResponse(request, { error: `File ${i + 1}: ${r.error}` }, r.status);
    uploads.push({ url: r.url, filename: r.filename, role });
  }
  return jsonResponse(request, { uploads });
}
```
*(Note: `processOne`, `handleAttachedRefs`, `positionalRole` are module-level helpers placed beside the existing `sha1Hex`/`normalizeMediaUrl`/`isPublicHttpUrl` helpers, above `export async function POST`.)*

## Phase 2 — GPT Action schema: add `uploadImages`

**CURRENT (`v3_3_0_GPT_SCHEMA.txt:266–284`, the whole `uploadImage` op).** **NEW: keep `uploadImage` as-is and insert a sibling op right after it** (before `/api/orders` at `285`):
```yaml
  /api/upload/attach:
    post:
      operationId: uploadImages
      summary: "Upload one or more photos the owner ATTACHED to this chat (not a link). Call this with their attached images, then put each returned url into images[]/thumbnail on createProduct/editProduct. For media she gives as a Drive/direct LINK, or for video, use uploadImage instead."
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [openaiFileIdRefs, slug]
              properties:
                openaiFileIdRefs:
                  type: array
                  items: { type: string }
                  description: "The photos the owner attached to the chat. Leave the values to the platform — just include this property so the attached files are forwarded. Up to 10 per call."
                slug: { type: string, description: "The product's slug (lowercase-hyphenated title). Names the files on the CDN. Same value you'll use on createProduct." }
                roles:
                  type: array
                  items: { type: string }
                  description: "Optional, same order as the attached photos: what each is — hero, gallery-01..15, detail-01..05. If omitted, the first becomes hero and the rest gallery-01, gallery-02, … You can reuse the hero url for thumbnail on createProduct."
      responses:
        '200': { description: "Returns { uploads: [{ url, role, filename }, …] } — one per attached file. Use each url verbatim in the product fields." }
        '400': { description: "No files attached, a link expired (re-attach — links last ~5 min), more than 10 files, or a file wasn't an allowed image. Relay plainly and ask Em to re-attach." }
```
Also update the **`uploadImage` summary** (`:269`) to point at the new op for attachments — **CURRENT:** `…Media comes as a LINK (a Drive share or direct URL); you can't forward a pasted file.` → **NEW:** `…For media given as a LINK (a Drive share or direct URL) or for video. If she ATTACHED photos to the chat, use uploadImages instead.` *(Keep under 300 chars.)*

## Phase 3 — `vercel.json`: the attach rewrite

**CURRENT (`vercel.json:19`):**
```json
    { "source": "/api/coupons/deactivate", "destination": "/api/products?_action=coupon_deactivate" },
```
**NEW (add directly after it):**
```json
    { "source": "/api/coupons/deactivate", "destination": "/api/products?_action=coupon_deactivate" },
    { "source": "/api/upload/attach", "destination": "/api/upload" },
```
*(`upload.ts` branches on the body's `openaiFileIdRefs`, so the same function serves both `/api/upload` and `/api/upload/attach`; no query flag needed.)*

## Phase 4 — GPT instructions + product-reference: flip "reject pasted file" → "attach them"

**4a. Trimmed instructions (`v3_3_0_GPT_INSTRUCTIONS_TRIMMED.txt`) + `GPT_SETUP.md §2A`.** The MEDIA + LINK TROUBLE guidance currently says photos arrive as links only and a pasted file → ask for a link. **NEW behavior to encode** (keep it terse — the 8k Instructions cap still applies):
- Photos: if she **attaches** them to the chat, call **`uploadImages`** (pass `openaiFileIdRefs`; optionally `roles[]` in the order shown); if she gives a **Drive/direct link**, call `uploadImage`. Either way, ≥ 1 hero + ≥ 5 gallery; reuse the hero url for `thumbnail`.
- Video: by **link** (`uploadImage`, `skip_transform`) — attachments are for photos.
- LINK TROUBLE: drop "a pasted photo → say you can't use it." Replace with: an attached photo → `uploadImages`; only ask for a link if an attachment fails (e.g. expired — links last ~5 min — re-attach) or for video/bulk.

**4b. `product-reference.md`.** Update **Photos `56–61`** ("Em just sends the photos") to state both intake methods (attach in chat → `uploadImages`; or a link → `uploadImage`) and the positional-role default; leave the **Media `115–119`** video-by-link guidance intact.

## Phase 5 — GPT config (Sean, by hand) + setup notes

No new capability toggles. After the schema is re-pasted (Phase 2) and instructions updated (Phase 4): re-test in the GPT builder. The `servers:` URL + the `PRODUCT_API_KEY` scope rules are unchanged (preview URL + Preview key to test; production + Production key for handoff). Auth stays Bearer `PRODUCT_API_KEY`.

---

## Testing (sketch → becomes `…_ADDENDUM_TESTING.md` on promotion)

Against the **dev preview** (Preview key, SSO off — same setup as the v2.0.0 GPT tests):
- **Attach 1 photo (desktop):** GPT calls `uploadImages`; returns one CDN url; page/preview shows it.
- **Attach a 7-photo batch:** 7 uploads back; first = `hero`, rest = `gallery-0N`; createProduct succeeds reusing hero for thumbnail.
- **`roles[]` honored:** attach 3 + tell the GPT which is the hero / a detail; confirm the returned roles match (validates §1.4 assumption #2).
- **Blank-refs / fallback:** if `openaiFileIdRefs` comes empty (the known finicky case), GPT falls back to asking for a Drive/direct link → `uploadImage` still works.
- **> 10 files:** GPT batches (two `uploadImages` calls).
- **5-min expiry:** stall, then upload; confirm the friendly "re-attach" error, then success on re-attach.
- **Mobile attach (iOS/Android ChatGPT app):** the headline cross-device case.
- **Invariants:** `npx tsc --noEmit` clean; CORS unaffected; `is_test` keys land under `test/…` on preview.

## Open questions for the push-to-executable gate

1. **Role mapping reliability** (§1.4) — does the model reliably populate `openaiFileIdRefs`, and does `roles[]` stay aligned with attach order? Decide trust-`roles[]` vs positional-default-then-confirm from the live probe.
2. **New op vs polymorphic `uploadImage`** (§1.5) — revisit if the model mis-routes between the two ops.
3. **Coaching** — does the GPT need an explicit "ask her to attach, then call uploadImages" beat, or does it infer from the op summary?
4. **Max attachment size** via `download_link` (undocumented) vs the pipeline's 10 MB image / 50 MB video caps — probe and document.
5. **Premise-update sweep** — the exact CURRENT/NEW edits to the v2.0.0 docs' "media arrives by link" line (deferred until that build ships).

## Sources

- OpenAI — *Sending and returning files with GPT Actions*: <https://developers.openai.com/api/docs/actions/sending-files>
- OpenAI Developer Community — file-upload-to-Action threads: [581228](https://community.openai.com/t/how-to-send-image-as-an-input-from-custom-gpt-to-an-external-api/581228), [1191007](https://community.openai.com/t/file-upload-with-gpt-action-calling-api-endpoint/1191007), [519589](https://community.openai.com/t/uploading-files-uploaded-to-chatgpt-to-an-external-server-via-actions/519589)
