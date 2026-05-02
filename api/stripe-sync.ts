import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type ProductRecord = {
  id: string;
  title: string;
  price: number;
  slug?: string | null;
  sku?: string | null;
  description?: string | null;
  headline?: string | null;
  images?: Array<{ url: string }> | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
};

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: ProductRecord;
};

function isProductInsert(payload: WebhookPayload): payload is Required<Pick<WebhookPayload, 'type' | 'table' | 'record'>> {
  if (payload.type !== 'INSERT' || payload.table !== 'products') return false;
  const r = payload.record;
  if (!r || typeof r !== 'object') return false;
  if (!r.id || !r.title || typeof r.price !== 'number') return false;
  return true;
}

export async function POST(request: Request) {
  const headers = { ...corsHeaders(request), 'Content-Type': 'application/json' };

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  if (!isProductInsert(payload)) {
    return new Response(JSON.stringify({ error: 'Ignored: not a products INSERT' }), { status: 400, headers });
  }

  const product = payload.record;

  if (product.stripe_product_id) {
    return new Response(JSON.stringify({ success: true, no_op: true }), { status: 200, headers });
  }

  try {
    const stripeProduct = await stripe.products.create({
      name: product.title,
      description: product.description || product.headline || undefined,
      images: product.images?.slice(0, 8).map((img) => img.url) ?? [],
      metadata: {
        supabase_id: product.id,
        slug: product.slug ?? '',
        sku: product.sku ?? '',
      },
    });

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: product.price,
      currency: 'usd',
    });

    const { error } = await supabase
      .from('products')
      .update({
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
      })
      .eq('id', product.id);

    if (error) {
      console.error('Failed to write Stripe IDs back:', error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
      }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error('Stripe sync error:', err);
    return new Response(JSON.stringify({ error: 'Stripe sync failed' }), { status: 500, headers });
  }
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}
