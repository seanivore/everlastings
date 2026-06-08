import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest, env } from './_lib/env';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env('R2_ACCESS_KEY_ID'),
    secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
  },
});

const supabaseAuthClient = createClient(
  env('SUPABASE_URL'),
  env('SUPABASE_SECRET_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Accepts either:
//   - Bearer ${PRODUCT_API_KEY}        (AI agents / curl)
//   - Bearer <Supabase JWT>            (admin UI authenticated user)
async function authorize(request: Request): Promise<boolean> {
  const auth = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  if (token === env('PRODUCT_API_KEY')) return true;
  const { data, error } = await supabaseAuthClient.auth.getUser(token);
  return !error && !!data?.user;
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

const ROLE_PATTERN =
  /^(hero|thumbnail|gallery-(0[1-9]|1[0-5])|video-0[1-5]|detail-0[1-5]|gif-0[1-5]|checkout_image|seo_thumbnail)$/;

function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  });
}

function getCloudinaryConfig(): { apiKey: string; apiSecret: string; cloudName: string } {
  const url = env('CLOUDINARY_URL');
  const match = url.match(/^cloudinary:\/\/(\d+):([^@]+)@(.+)$/);
  if (!match) throw new Error('Invalid CLOUDINARY_URL');
  return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
}

async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Google Drive "share" URLs (…/file/d/<id>/view, …/open?id=<id>, …/uc?id=<id>) serve an HTML page,
// not the bytes. Rewrite them to the direct-download form. Any non-Drive URL passes through unchanged.
// NOTE: very large Drive files (videos > ~25 MB) hit Google's virus-scan interstitial and return HTML,
// not the file — the content-type check in POST catches that and returns a friendly "share as a direct
// link" error. Em's typical product clips are small; flag a confirm-token follow-up for v1.1 if needed.
function normalizeMediaUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.hostname !== 'drive.google.com') return raw;
    const pathMatch = u.pathname.match(/\/file\/d\/([^/]+)/);
    const id = pathMatch?.[1] ?? u.searchParams.get('id');
    return id ? `https://drive.google.com/uc?export=download&id=${id}` : raw;
  } catch {
    return raw; // not a parseable URL — let the fetch fail with the friendly error
  }
}

// SSRF guard for the server-side media fetch (the JSON/by-link path). The route is already behind the
// `authorize` gate and the response body is never echoed to the caller (only the stored R2 url is), and
// Vercel serverless has no IMDS metadata endpoint — so severity is low — but the fetch still takes an
// arbitrary owner-supplied URL, so we reject non-https and any host that is a literal loopback / private /
// link-local IP before fetching. Drive-normalized and CDN links are all https public hosts → unaffected.
// Accepted residual (low, auth-gated, body-never-echoed): a public host that DNS-resolves or 302-redirects
// to a private IP. Closing that needs DNS resolution + manual-redirect re-checks — deferred to v1.1.
function isPublicHttpUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, ''); // strip [] from IPv6 literals
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return false;        // loopback / private / link-local v4
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;                      // 172.16/12 private v4
  // v6 checks gate on `:` (an IPv6 literal) so a public HOSTNAME starting fc/fd/fe (e.g. "fcdn.example.com") isn't blocked
  if (host.includes(':') && (host === '::1' || /^(fc|fd|fe80)/.test(host))) return false; // loopback / ULA / link-local v6
  return true;
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }

  // dual intake. JSON {url,...} = the Custom GPT path (Actions are JSON-only and
  // can't forward a pasted file); multipart = admin UI / curl. Both yield a `File` for the pipeline.
  let file: File;
  let slug: string;
  let role: string;
  let skipTransformField: string | null = null;

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
    // validate the role BEFORE fetching, so a bad role can't trigger a server-side
    // fetch of an arbitrary owner-supplied URL (the multipart path checks ROLE_PATTERN downstream too).
    if (!ROLE_PATTERN.test(body.role.trim())) {
      return jsonResponse(request, { error: 'Invalid role' }, 400);
    }
    // SSRF guard (see isPublicHttpUrl): https-only, no loopback/private/link-local hosts.
    const safeUrl = normalizeMediaUrl(body.url.trim());
    if (!isPublicHttpUrl(safeUrl)) {
      return jsonResponse(request, { error: 'Media link must be a public https URL (no local or internal addresses).' }, 400);
    }
    let mediaRes: Response;
    try {
      mediaRes = await fetch(safeUrl, { redirect: 'follow' });
    } catch {
      return jsonResponse(request, { error: 'Could not fetch that media link' }, 400);
    }
    if (!mediaRes.ok) {
      return jsonResponse(
        request,
        { error: `That link isn't directly downloadable (HTTP ${mediaRes.status}). Share it as "anyone with the link," or give me a direct file URL.` },
        400,
      );
    }
    const fetchedType = (mediaRes.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_MIME.has(fetchedType)) {
      return jsonResponse(
        request,
        { error: `That link didn't return an allowed image/video (got "${fetchedType || 'unknown'}") — it may be a share page, not the file itself. Share it as "anyone with the link," or send a direct file URL.` },
        400,
      );
    }
    const bytes = Buffer.from(await mediaRes.arrayBuffer());
    file = new File([bytes], `upload.${MIME_TO_EXT[fetchedType] ?? 'bin'}`, { type: fetchedType });
    slug = body.slug.trim();
    role = body.role.trim();
    skipTransformField = body.skip_transform === true || body.skip_transform === 'true' ? 'true' : null;
  } else {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonResponse(request, { error: 'Invalid multipart form' }, 400);
    }
    const fileField = formData.get('file');
    const slugField = formData.get('slug');
    const roleField = formData.get('role');
    const stf = formData.get('skip_transform');
    skipTransformField = typeof stf === 'string' ? stf : null;
    if (!(fileField instanceof File) || typeof slugField !== 'string' || typeof roleField !== 'string') {
      return jsonResponse(request, { error: 'Missing file, slug, or role' }, 400);
    }
    file = fileField;
    slug = slugField.trim();
    role = roleField.trim();
  }

  if (!slug || !role) {
    return jsonResponse(request, { error: 'Missing file, slug, or role' }, 400);
  }
  if (!ROLE_PATTERN.test(role)) {
    return jsonResponse(request, { error: 'Invalid role' }, 400);
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return jsonResponse(
      request,
      { error: 'File type not allowed. Accepted: JPEG, PNG, WebP, GIF, MP4, WebM' },
      400,
    );
  }

  const isVideo = file.type.startsWith('video/');
  const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return jsonResponse(
      request,
      { error: `File too large. Max: ${isVideo ? '50MB' : '10MB'}` },
      400,
    );
  }

  const skipTransform =
    typeof skipTransformField === 'string' && skipTransformField === 'true';
  const isImageMime = file.type.startsWith('image/') && file.type !== 'image/gif';
  const shouldTransform = isImageMime && !skipTransform;

  let finalBuffer: Buffer;
  let contentType: string;
  let extension: string;

  try {
    if (shouldTransform) {
      const cloud = getCloudinaryConfig();
      const imageBuffer = Buffer.from(await file.arrayBuffer());

      // Signed upload: Cloudinary verifies api_key + timestamp + signature
      // against the account secret. Avoids any dependency on dashboard-side
      // upload presets (the destroy call below uses the same signature pattern).
      const uploadTimestamp = Math.floor(Date.now() / 1000);
      const uploadSigString = `timestamp=${uploadTimestamp}${cloud.apiSecret}`;
      const uploadSignature = await sha1Hex(uploadSigString);

      const uploadForm = new FormData();
      uploadForm.append('file', new Blob([imageBuffer], { type: file.type }));
      uploadForm.append('api_key', cloud.apiKey);
      uploadForm.append('timestamp', String(uploadTimestamp));
      uploadForm.append('signature', uploadSignature);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud.cloudName}/image/upload`,
        { method: 'POST', body: uploadForm },
      );
      if (!uploadRes.ok) {
        const detail = await uploadRes.text();
        console.error('Cloudinary upload failed:', detail);
        return jsonResponse(request, { error: 'Cloudinary upload failed' }, 502);
      }
      const uploadData = (await uploadRes.json()) as { public_id?: string };
      const publicId = uploadData.public_id;
      if (!publicId) {
        return jsonResponse(request, { error: 'Cloudinary upload returned no public_id' }, 502);
      }

      let aspectRatio = '4:5';
      let width = role.startsWith('thumbnail') ? 600 : 1200;
      if (role === 'seo_thumbnail') { aspectRatio = '1.91:1'; width = 1200; } // OG / Twitter card
      else if (role === 'checkout_image') { aspectRatio = '1:1'; width = 600; } // Stripe product image
      const transformUrl = `https://res.cloudinary.com/${cloud.cloudName}/image/upload/c_fill,ar_${aspectRatio},w_${width},f_webp,q_auto,g_auto/${publicId}`;

      const transformedRes = await fetch(transformUrl);
      if (!transformedRes.ok) {
        console.error('Cloudinary transform fetch failed:', transformedRes.status);
        return jsonResponse(request, { error: 'Cloudinary transform failed' }, 502);
      }
      finalBuffer = Buffer.from(await transformedRes.arrayBuffer());
      contentType = 'image/webp';
      extension = 'webp';

      const timestamp = Math.floor(Date.now() / 1000);
      const sigString = `public_id=${publicId}&timestamp=${timestamp}${cloud.apiSecret}`;
      const signature = await sha1Hex(sigString);
      const destroyForm = new FormData();
      destroyForm.append('public_id', publicId);
      destroyForm.append('api_key', cloud.apiKey);
      destroyForm.append('timestamp', String(timestamp));
      destroyForm.append('signature', signature);

      const destroyRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud.cloudName}/image/destroy`,
        { method: 'POST', body: destroyForm },
      );
      if (!destroyRes.ok) {
        console.error('Cloudinary destroy failed (non-fatal):', await destroyRes.text());
      }
    } else {
      finalBuffer = Buffer.from(await file.arrayBuffer());
      contentType = file.type;
      extension = MIME_TO_EXT[file.type] ?? 'bin';
    }

    const filename = isTest
      ? `test_${role}-${slug}.${extension}`
      : `${role}-${slug}.${extension}`;
    const key = isTest
      ? `test/${slug}/${filename}`
      : `products/${slug}/${filename}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: env('R2_BUCKET_NAME'),
        Key: key,
        Body: finalBuffer,
        ContentType: contentType,
      }),
    );

    const publicUrl = `${env('R2_PUBLIC_URL')}/${key}`;
    return jsonResponse(request, { url: publicUrl, filename });
  } catch (err) {
    console.error('Upload error:', err);
    return jsonResponse(request, { error: 'Upload failed' }, 500);
  }
}
