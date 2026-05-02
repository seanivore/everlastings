import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!,
);

type FeedRow = {
  slug: string;
  title: string | null;
  description: string | null;
  price: number | null;
  available: boolean | null;
  thumbnail: string | null;
};

export async function GET(req: Request) {
  const { data: products, error } = await supabase
    .from('products')
    .select('slug, title, description, price, available, thumbnail')
    .eq('is_test', false);

  if (error) {
    console.error('Product feed query failed:', error);
    return new Response('error', {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'text/plain' },
    });
  }

  const header = 'id,title,description,availability,condition,price,link,image_link,brand';
  const esc = (s: string | null | undefined) =>
    `"${(s ?? '').replace(/"/g, '""')}"`;

  const rows = ((products ?? []) as FeedRow[]).map((p) => {
    const avail = p.available ? 'in stock' : 'out of stock';
    const priceCents = typeof p.price === 'number' ? p.price : 0;
    const price = `${(priceCents / 100).toFixed(2)} USD`;
    const link = `https://everlastingsbyemaline.com/product/${p.slug}`;
    return [
      p.slug,
      esc(p.title),
      esc(p.description),
      avail,
      'new',
      price,
      link,
      p.thumbnail ?? '',
      'Everlastings by Emaline',
    ].join(',');
  });

  return new Response([header, ...rows].join('\n'), {
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'text/csv',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function OPTIONS(req: Request) {
  return preflight(req)!;
}
