import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

interface CartItem {
  product_id: string;
  slug: string;
  stripe_price_id?: string;
}

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      items?: CartItem[];
      session_id?: string;
      email?: string;
      name?: string;
    };
    const { items, session_id, email } = body;

    if (!Array.isArray(items) || items.length === 0 || !session_id || typeof session_id !== 'string') {
      return Response.json(
        { error: 'Cart is empty or session missing' },
        { status: 400, headers: corsHeaders(request) },
      );
    }

    const productIds = items.map((i) => i.product_id);
    const nowIso = new Date().toISOString();

    const { data: holds, error: holdsError } = await supabase
      .from('cart_holds')
      .select('product_id, session_id')
      .in('product_id', productIds)
      .gt('expires_at', nowIso);

    if (holdsError) throw holdsError;

    const ownHeldIds = new Set(
      (holds || [])
        .filter((h) => h.session_id === session_id)
        .map((h) => h.product_id),
    );
    const missingHolds = productIds.filter((id) => !ownHeldIds.has(id));

    if (missingHolds.length > 0) {
      return Response.json(
        { error: 'hold_expired' },
        { status: 410, headers: corsHeaders(request) },
      );
    }

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, slug, stripe_price_id, available, quantity')
      .in('id', productIds);

    if (productsError) throw productsError;

    const productMap = new Map((products || []).map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product || product.available !== true || (product.quantity ?? 0) < 1) {
        return Response.json(
          { error: 'hold_expired' },
          { status: 410, headers: corsHeaders(request) },
        );
      }
      if (!product.stripe_price_id) {
        console.error('Checkout: product missing stripe_price_id', item.product_id);
        return Response.json(
          { error: 'Product is not yet available for purchase' },
          { status: 500, headers: corsHeaders(request) },
        );
      }
    }

    const line_items = items.map((item) => {
      const product = productMap.get(item.product_id)!;
      return { price: product.stripe_price_id!, quantity: 1 };
    });

    const itemsMeta = items.map((i) => ({ id: i.product_id, slug: i.slug }));

    const stripeSession = await stripe.checkout.sessions.create({
      ui_mode: 'custom',
      mode: 'payment',
      line_items,
      allow_promotion_codes: true,
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      customer_creation: 'always',
      ...(email && typeof email === 'string' && email.includes('@') ? { customer_email: email } : {}),
      metadata: {
        items: JSON.stringify(itemsMeta),
        session_id,
      },
      return_url: `${getBaseUrl(request)}/complete.html?session_id={CHECKOUT_SESSION_ID}`,
    });

    return Response.json(
      { clientSecret: stripeSession.client_secret },
      { headers: corsHeaders(request) },
    );
  } catch (err) {
    console.error('Checkout error:', err);
    return Response.json(
      { error: 'Failed to create checkout session' },
      { status: 500, headers: corsHeaders(request) },
    );
  }
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}
