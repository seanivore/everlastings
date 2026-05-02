import { corsHeaders, preflight } from './_lib/cors';
import { requireAdmin } from './_lib/adminAuth';
import { isTest } from './_lib/env';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  });
}

function escapeOrLiteral(input: string): string {
  return input.replace(/[(),]/g, '\\$&');
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const q = url.searchParams.get('q')?.trim() ?? '';

  let query = supabase
    .from('orders')
    .select(
      '*, products(title, slug, thumbnail, thumbnail_alt), customers(name, email, phone, shipping_address)',
    )
    .eq('is_test', isTest)
    .order('created_at', { ascending: false });

  if (status === 'needs_shipping') {
    query = query.is('shipped_at', null).eq('status', 'completed');
  } else if (status === 'shipped') {
    query = query.not('shipped_at', 'is', null);
  }

  if (q) {
    const orFilters: string[] = [];
    const safe = escapeOrLiteral(q);
    if (UUID_RE.test(q)) {
      orFilters.push(`id.eq.${q}`);
    } else {
      orFilters.push(`id.ilike.${safe}%`);
    }
    orFilters.push(`customer_email.ilike.%${safe}%`);
    orFilters.push(`tracking_number.ilike.%${safe}%`);
    query = query.or(orFilters.join(','));
  }

  const { data, error } = await query;
  if (error) {
    console.error('Orders GET failed:', error.message);
    return jsonResponse(request, { error: 'Failed to load orders' }, 500);
  }

  return jsonResponse(request, { orders: data ?? [] });
}
