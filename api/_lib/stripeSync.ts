import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import { stripe } from './stripe';

const supabase = createClient(
  env('SUPABASE_URL'),
  env('SUPABASE_SECRET_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export type SyncableProduct = {
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

export type StripeSyncResult = {
  success: true;
  no_op: boolean;
  stripe_product_id: string;
  stripe_price_id: string | null;
};

// Idempotency: if either the payload or a fresh DB read shows stripe_product_id,
// skip create. The DB re-read defends against a concurrent caller that has
// already written IDs back between this caller's payload-snapshot and now —
// the original webhook-only flow lacked this guard, allowing a duplicate
// retry path to orphan a Stripe product.
export async function syncProductToStripe(product: SyncableProduct): Promise<StripeSyncResult> {
  if (product.stripe_product_id) {
    return {
      success: true,
      no_op: true,
      stripe_product_id: product.stripe_product_id,
      stripe_price_id: product.stripe_price_id ?? null,
    };
  }

  const { data: current } = await supabase
    .from('products')
    .select('stripe_product_id, stripe_price_id')
    .eq('id', product.id)
    .maybeSingle();

  if (current?.stripe_product_id) {
    return {
      success: true,
      no_op: true,
      stripe_product_id: current.stripe_product_id,
      stripe_price_id: current.stripe_price_id ?? null,
    };
  }

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

  return {
    success: true,
    no_op: false,
    stripe_product_id: stripeProduct.id,
    stripe_price_id: stripePrice.id,
  };
}
