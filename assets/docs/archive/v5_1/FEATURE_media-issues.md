# Media pipeline — what still hurts, and what must be fixed to sell this

**Status:** open · **Raised:** 2026-07-14, during v4.1.2 · **Scope:** the media ingress path (`api/upload.ts`, the `/admin` media modal, the Custom GPT actions)

## Why this doc exists

Everything below was found by actually pushing real files through the thing — Sean's phone footage, a real Google Drive share link, a 13 MB photo, a 7.5 MB headshot. Most of it was found *after* we thought media was done.

This is not a bug list for Emy. Emy has an Android, shoots modest clips, and the v4.1.2 fixes cover her. **This is the list that decides whether this codebase can be handed to a stranger.** A creator with an iPhone and a Drive folder — i.e. the median person you would sell this to — walks into most of these on their first afternoon.

The through-line: **the media pipeline was built for the Custom GPT first, and the GPT is a very forgiving client.** OpenAI hands us files with honest metadata. Real users hand us links from Google, files from Apple, and footage from a phone — none of which behave. Every bug below is the same shape: *we trusted something the platform never promised us.*

---

## The hard constraint everything else orbits

**Vercel refuses any request body over 4.5 MB at the edge, before our function runs.**

Not our limit, not configurable, not catchable. The request 413s with a non-JSON body, so the handler never executes and has nothing useful to say.

Proven by hand (2026-07-14): a 7.5 MB photo and a 5.4 MB photo both failed; 4.5 MB went through. The handler's own `maxSize` checks (10 MB images / 200 MB video) are **unreachable dead code on the multipart path**. They only ever bind on the by-link path, where the *server* does the fetching.

This single fact is why there are two completely different ingress routes with two different capability sets:

| | dropped / picked (multipart) | pasted link (server-fetched) |
|---|---|---|
| Ceiling | **4.5 MB, hard** (Vercel edge) | 10 MB images · 200 MB video (ours) |
| Photos | resized in-browser to fit (v4.1.2) | must already be under 10 MB |
| Video | **impossible** — any real clip exceeds it | the only route that works |
| Verified | 13 MB photo → resized → uploaded | 80 MB mp4 → uploaded in 6.1s |

**A user cannot be expected to know which of these they are using.** They see one modal.

---

## Fixed in v4.1.2 — record them so they aren't re-broken

- **Photos over 4.3 MB are resized in-browser** before upload (longest edge → 2400 px). Lossless for our purposes: every crop the site outputs is ≤1200 px wide, so 2400 px is still 2× the largest output, and it stays the *full uncropped frame* so each role still crops from the original. A prompt asks first.
- **Google Drive `confirm=t`.** The old `/uc?export=download` form returns Google's virus-scan interstitial (HTML) for anything over ~25 MB. Every real video is over 25 MB. Now uses `drive.usercontent.google.com/download?…&confirm=t`.
- **Dropbox normalization.** A share link renders an HTML *page*. Now forces `dl=1` and drops the stale `st=` token, preserving `rlkey=`.
- **Byte sniffing (`resolveFetchedType`).** See "Drive lies" below.
- **`GET /api/upload?probe=` .** Classifies a link (64-byte Range request) so the modal knows image vs video before Apply.
- **Video cap 50 MB → 200 MB.** 50 MB rejected Emy's own 54 MB clip.
- **Errors name the file and the reason**, and stay on screen 14s with a dismiss ✕ (they were 2.6s — unreadable).

---

## Still broken. Must fix before this is a product.

### 1 · iPhone photos are rejected outright — **HEIC is not in `ALLOWED_MIME`**

`ALLOWED_MIME` is `jpeg, png, webp, gif, mp4, webm`. **iOS photographs in HEIC by default.** A creator who drags photos straight off an iPhone gets *"File type not allowed"* on every single one.

This is the highest-severity item in this doc and it is invisible to us because our test images all came from a Mac (which silently converts on export) or from a canvas.

- Cloudinary ingests HEIC/HEIF fine — the server side is a one-line allow-list change plus `MIME_TO_EXT`.
- The wrinkle is the **client-side resizer**: `createImageBitmap` decodes HEIC in Safari but **not in Chrome**. Most HEICs are 2–3 MB (under the cap) so they'd never need resizing — but a large one on Chrome would fail to resize and must fall through to a clear error rather than a crash.
- **Verify with a real HEIC off a real iPhone, in Chrome AND Safari.** Do not trust a converted file.

### 2 · iPhone *video* is `.MOV`, and we reject it

Sean's clip: `ftyp` brand `qt  ` — a QuickTime container, not mp4. `video/quicktime` isn't in `ALLOWED_MIME`, and rightly so: Chrome and Firefox will not reliably play a QuickTime container, so silently storing it would look fine to the store owner and be **broken for a chunk of their shoppers**.

v4.1.2 detects it at paste time and refuses with a reason ("export as .mp4, or use YouTube"). That's honest, but it is a **refusal, not a feature**. Sean converts in DaVinci Resolve. You cannot ship "buy DaVinci" as the answer.

**The fix is transcoding — see §5.**

### 3 · Google Drive lies about every file it serves

Drive answers **every** download with `content-type: application/octet-stream`. It never tells you what the file is.

The by-link path checked that header against the allow-list, so **it rejected every Drive link ever pasted — images too.** This was live from the day the admin panel shipped and nobody caught it, because Drive "worked with the GPT" — which it did, for a completely different reason: **ChatGPT *attaches* the file and hands us OpenAI's own download link, which carries a real content-type.** The paste-a-link path never had that and inherited a check that only ever worked by luck.

Fixed by sniffing the container from the file's own first bytes, with Drive's `content-disposition` filename as a fallback. **Both ingress paths now share `resolveFetchedType`.**

> **The rule this establishes:** *any* new way a file can enter the system must go through `resolveFetchedType`. Never trust an upstream `content-type`. Apple, Google and Dropbox each break it in a different way.

Related: a Drive/Dropbox URL has **no file extension**, so the client cannot classify it at all — it used to guess "image", which is why pasting a Drive *video* offered Hero/Gallery/Thumbnail toggles. It now asks the server (`?probe=`). Any future link source (OneDrive, WeTransfer, iCloud) needs the same treatment.

### 4 · Screen recordings don't stream — `moov` at the end

Some encoders write the MP4 index (`moov`) *after* the video data, so a browser must download the **entire file** before showing frame one. All 12 walkthrough videos had this; the fix was an `ffmpeg -movflags +faststart` remux.

**This is NOT just screen recorders.** Phone/camera video is usually fine (`ftyp,moov,moof,mdat` — verified), but the first real product video that went through the pipeline — a *rendered* mp4 from a Drive link — came out `ftyp,free,mdat,moov`, i.e. index last. It's only 500 KB, so nobody noticed. **At 54 MB it would be a long stare at a black box**, and the owner would have no idea why.

You cannot predict this from the source. Nothing in the pipeline checks it, and nothing fixes it. It must be part of transcoding (§5) — Cloudinary emits faststart mp4 by default, which is one more reason that is the right move.

### 5 · **The real fix: run video through Cloudinary, like images**

Today video sets `skip_transform` and goes straight to R2 untouched. That single decision is the root of §2, §4, and most of the size pain. Cloudinary is already integrated, already paid for, and already does exactly this for every image.

Routing video through it (`resource_type: video`, eager `f_mp4,vc_h264,q_auto,c_limit,w_1280`) collapses the whole list:

- **`.MOV` → `.mp4`** — §2 disappears; iPhone footage just works.
- **faststart** — §4 disappears; Cloudinary outputs streamable mp4.
- **compression** — 25 MB → a few MB; a 1 GB raw clip becomes usable. Size stops being the user's problem.
- **poster frame** — extract one automatically instead of demanding the owner supply an image role.

Costs and cautions, honestly:
- Cloudinary's **free tier caps video upload around 100 MB** and video transformations burn credits far faster than image ones. Needs a real look at the plan before committing.
- Transcoding is slow (tens of seconds), so it cannot sit inside the request. It needs `eager_async` + a webhook, or a job/poll. **That is the actual engineering work**, and it's why this wasn't done in v4.1.2.
- Fully sidesteps the 4.5 MB cap only if paired with §6.

### 6 · Presigned direct-to-R2 upload — the structural answer to the 4.5 MB cap

The browser PUTs straight to R2 with a signed URL; Vercel is never in the middle; the edge cap vanishes for **both** photos and video. Cloudinary can then pull from R2 rather than receiving bytes through us.

This removes the two-routes-with-different-rules problem entirely — the thing a user can't be expected to understand. It's the difference between "drop anything" and "drop anything under 4.5 MB unless it's a photo in which case we'll shrink it, unless it's a video in which case paste a link instead."

Requires: `@aws-sdk/s3-request-presigner`, a small mint-a-URL endpoint, and **an R2 CORS policy allowing PUT from the app origin** (the easy thing to forget).

### 7 · The server buffers whole files in memory

`Buffer.from(await mediaRes.arrayBuffer())` holds the entire file. At the new 200 MB video cap that is a 200 MB allocation inside the function, and nothing enforces headroom. It has not fallen over, but it hasn't been pushed either — the largest thing actually tested is 80 MB.

Stream to R2 (or do §6 and never touch the bytes) before anyone relies on the 200 MB ceiling.

---

## Smaller, but they'll be noticed

- **Cloudinary `authorize` costs a Supabase round-trip per upload** (~63–106 ms measured) on the admin's JWT path. The GPT's static API key is a string compare. Negligible per file, real across a batch. Deliberately left alone — caching a token verification for speed is a bad trade.
- **`/api/products?_action=active_sale` sets `s-maxage=30` but the response comes back `max-age=0, must-revalidate`, `x-vercel-cache: MISS` every time.** The edge cache it was written for isn't working, so every page view hits Stripe. Only ~190 ms, but it isn't doing what the code says.
- **Concurrency is tuned by measurement, not taste** — 13 files: pool 5 = 8.6 s, pool 8 = 6.3 s (zero cold starts), pool 13 = 4.8 s but 5 cold starts. It is set to 8. If per-file cost changes, re-measure; don't guess.
- **Role numbering is pre-assigned before upload** (`gallery-NN`), because the numbering can't wait on prior uploads finishing. Any change to the upload pool must preserve that.

---

## The invariant nobody is allowed to break

**Every role is cropped from the ORIGINAL, full-frame bytes — never re-cropped from another role's derivative.**

Hero and gallery are 4:5, the SEO thumbnail is 16:9, the checkout image is 1:1. A 4:5 crop re-cropped to 16:9 would cut the subject's head off, and it would happen silently. This is why each role is its own upload, and why the in-browser resize caps at 2400 px (the *full frame*, just smaller) rather than cropping.

Verified after every change to this pipeline, by uploading one landscape source under all four roles and measuring the output dimensions: `1200×1500`, `1200×1500`, `1200×675`, `600×600`.

---

## If you only do three things

1. **Accept HEIC.** An iPhone owner cannot upload a single photo today. (§1)
2. **Transcode video through Cloudinary.** It closes `.MOV`, faststart, compression, and posters in one move. (§5)
3. **Presigned direct-to-R2.** It deletes the 4.5 MB cliff and the two-routes-with-different-rules confusion that sits behind half of this document. (§6)
