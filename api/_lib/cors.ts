// Reflects request Origin if it matches the allowlist; otherwise omits the header (browser blocks).
// Wildcard *.vercel.app is matched as a pattern, not echoed literally.
const ALLOWED = [
  /^https:\/\/everlastingsbyemaline\.com$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost:3000$/,
];

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED.some((re) => re.test(origin));
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, stripe-signature',
    'Access-Control-Max-Age': '86400',
  };
}

export function preflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
