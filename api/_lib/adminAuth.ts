import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { corsHeaders } from './cors';
import { env } from './env';

export type RequireAdminResult =
  | { user: User; supabase: SupabaseClient; viaApiKey?: false }
  | { supabase: SupabaseClient; viaApiKey: true }
  | { error: Response };

export async function requireAdmin(request: Request): Promise<RequireAdminResult> {
  const unauthorized = (message: string): Response =>
    new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
    });

  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { error: unauthorized('Unauthorized') };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { error: unauthorized('Unauthorized') };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Path 1 — server-to-server / Custom GPT via PRODUCT_API_KEY (service-role client).
  // Compare against the TRIMMED value via env(): this project's Vercel env vars were imported with
  // trailing newlines (api/_lib/env.ts), and the two sibling key-consumers — products.ts:22 and
  // upload.ts:29 — already compare against env('PRODUCT_API_KEY'). A raw process.env read here would
  // make the check "<typed key>" === "<key>\n" → false → fall through to the JWT path → a silent,
  // scope-local 401 that breaks the GPT order pipeline (and can pass a preview-only curl while
  // failing in production). env() returns '' for unset, so the `apiKey &&` guard still holds.
  const apiKey = env('PRODUCT_API_KEY');
  if (apiKey && token === apiKey) {
    console.log('requireAdmin: authorized via PRODUCT_API_KEY');
    return { supabase, viaApiKey: true };
  }

  // Path 2 — admin UI via Supabase JWT.
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { error: unauthorized('Unauthorized') };
  }
  return { user: data.user, supabase };
}
