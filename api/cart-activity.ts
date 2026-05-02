import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

export async function POST(request: Request) {
  try {
    const { slug } = await request.json();
    if (!slug || typeof slug !== 'string') {
      return Response.json({ ok: true }, { headers: corsHeaders(request) });
    }

    const { data: interests } = await supabase
      .from('product_interests')
      .select('email')
      .eq('product_slug', slug)
      .eq('notified', false);

    if (interests && interests.length > 0) {
      console.log(`Cart activity: ${slug} — ${interests.length} interested subscriber(s)`);
    }

    return Response.json({ ok: true }, { headers: corsHeaders(request) });
  } catch {
    return Response.json({ ok: true }, { headers: corsHeaders(request) });
  }
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}
