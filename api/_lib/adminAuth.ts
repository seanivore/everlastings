import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { corsHeaders } from './cors';

export type RequireAdminResult =
  | { user: User; supabase: SupabaseClient }
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

  const jwt = authHeader.slice(7).trim();
  if (!jwt) {
    return { error: unauthorized('Unauthorized') };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data?.user) {
    return { error: unauthorized('Unauthorized') };
  }

  return { user: data.user, supabase };
}
