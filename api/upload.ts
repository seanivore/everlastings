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
  /^(hero|thumbnail|gallery-(0[1-9]|1[0-5])|video-0[1-5]|detail-0[1-5]|gif-0[1-5])$/;

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

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse(request, { error: 'Invalid multipart form' }, 400);
  }

  const file = formData.get('file');
  const slugField = formData.get('slug');
  const roleField = formData.get('role');
  const skipTransformField = formData.get('skip_transform');

  if (!(file instanceof File) || typeof slugField !== 'string' || typeof roleField !== 'string') {
    return jsonResponse(request, { error: 'Missing file, slug, or role' }, 400);
  }

  const slug = slugField.trim();
  const role = roleField.trim();
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

      const uploadForm = new FormData();
      uploadForm.append('file', new Blob([imageBuffer], { type: file.type }));
      uploadForm.append('upload_preset', 'unsigned_temp');
      uploadForm.append('api_key', cloud.apiKey);

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

      const isThumb = role.startsWith('thumbnail');
      const width = isThumb ? 600 : 1200;
      const transformUrl = `https://res.cloudinary.com/${cloud.cloudName}/image/upload/c_fill,ar_4:5,w_${width},f_webp,q_auto,g_auto/${publicId}`;

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
