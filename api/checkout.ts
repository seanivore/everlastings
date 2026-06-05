// Consolidates three checkout endpoints into one Vercel function.
// Public URLs preserved via vercel.json rewrites:
//   POST /api/checkout                  → ?_action=session         (Stripe session create)
//   POST /api/checkout/reserve          → ?_action=reserve         (cart hold + availability)
//   GET  /api/session-status?session_id → ?_action=session-status  (return-page status)
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest } from './_lib/env';
import { stripe } from './_lib/stripe';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const HOLD_TTL_MINUTES = 15;

interface CartItem {
  product_id: string;
  slug: string;
  stripe_price_id?: string;
}

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function handleSession(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      items?: CartItem[];
      session_id?: string;
    };
    const { items, session_id } = body;

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
      // v1: static $0 "Free shipping" — keeps the total resolvable so canConfirm works.
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'usd' },
            display_name: 'Free shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        },
      ],
      // Phone: the shipping element rejects `fields` (Phase 0), so collect phone server-side.
      phone_number_collection: { enabled: true },
      // customer_creation: OMITTED (Phase 0). Not verified to populate session.customer under
      // ui_mode:'custom' without a pre-made customer, and forcing it risked the 500 that burned
      // past rounds. Safe to omit: the webhook null-guards stripe_customer_id and derives
      // customer_id from the email-keyed customers upsert. (Re-add + verify in v1.1 if wanted.)
      metadata: {
        items: JSON.stringify(itemsMeta),
        session_id,
      },
      return_url: `${getBaseUrl(request)}/complete?session_id={CHECKOUT_SESSION_ID}`,
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

async function handleReserve(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      items?: { product_id: string; slug: string }[];
      session_id?: string;
      email?: string;
      name?: string;
    };
    const { items, session_id, email, name } = body;

    if (!Array.isArray(items) || items.length === 0 || !session_id || typeof session_id !== 'string') {
      return Response.json(
        { error: 'Missing items or session_id' },
        { status: 400, headers: corsHeaders(request) },
      );
    }

    const productIds = items.map((i) => i.product_id);

    if (email && typeof email === 'string' && email.includes('@')) {
      try {
        await supabase
          .from('subscribers')
          .upsert(
            { email, source: 'checkout-started', is_test: isTest },
            { onConflict: 'email', ignoreDuplicates: true },
          );
      } catch (subErr) {
        console.error('Reserve: subscriber upsert failed (non-fatal):', subErr);
      }
    }

    const nowIso = new Date().toISOString();

    const [{ data: products, error: productsError }, { data: activeHolds, error: holdsError }] =
      await Promise.all([
        supabase
          .from('products')
          .select('id, slug, available, quantity, series')
          .in('id', productIds),
        supabase
          .from('cart_holds')
          .select('product_id, session_id')
          .in('product_id', productIds)
          .gt('expires_at', nowIso),
      ]);

    if (productsError) throw productsError;
    if (holdsError) throw holdsError;

    const productMap = new Map((products || []).map((p) => [p.id, p]));

    const unavailable = items
      .filter((item) => {
        const product = productMap.get(item.product_id);
        if (!product || product.available !== true || (product.quantity ?? 0) < 1) return true;
        const conflict = (activeHolds || []).some(
          (h) => h.product_id === item.product_id && h.session_id !== session_id,
        );
        return conflict;
      })
      .map((item) => ({ product_id: item.product_id, slug: item.slug }));

    if (unavailable.length > 0) {
      const unavailableProductIds = new Set(unavailable.map((u) => u.product_id));
      const seriesValues = Array.from(
        new Set(
          unavailable
            .map((u) => productMap.get(u.product_id)?.series)
            .filter((s): s is string => typeof s === 'string' && s.length > 0),
        ),
      );

      let related: Array<{ product_id: string; slug: string; available: boolean }> = [];

      if (seriesValues.length > 0) {
        const { data: seriesRelated } = await supabase
          .from('products')
          .select('id, slug, available, series')
          .in('series', seriesValues)
          .eq('available', true)
          .eq('is_test', isTest)
          .limit(12);

        related = (seriesRelated || [])
          .filter((p) => !unavailableProductIds.has(p.id))
          .map((p) => ({ product_id: p.id, slug: p.slug, available: p.available === true }));
      }

      if (related.length === 0) {
        const { data: fallback } = await supabase
          .from('products')
          .select('id, slug, available')
          .eq('available', true)
          .eq('is_test', isTest)
          .limit(6);
        related = (fallback || [])
          .filter((p) => !unavailableProductIds.has(p.id))
          .map((p) => ({ product_id: p.id, slug: p.slug, available: p.available === true }));
      }

      return Response.json(
        { error: 'unavailable', unavailable, related },
        { status: 409, headers: corsHeaders(request) },
      );
    }

    const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: deleteError } = await supabase
      .from('cart_holds')
      .delete()
      .eq('session_id', session_id)
      .in('product_id', productIds);

    if (deleteError) throw deleteError;

    const holdRows = items.map((i) => ({
      session_id,
      product_id: i.product_id,
      expires_at: expiresAt,
      is_test: isTest,
    }));

    const { error: insertError } = await supabase.from('cart_holds').insert(holdRows);
    if (insertError) throw insertError;

    let customerPrefill: { email: string | null; name: string | null; phone: string | null; shipping_address: unknown } = {
      email: email ?? null,
      name: name ?? null,
      phone: null,
      shipping_address: null,
    };

    if (email && typeof email === 'string' && email.includes('@')) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('email, name, phone, shipping_address')
        .eq('email', email)
        .eq('is_test', isTest)
        .maybeSingle();

      if (existingCustomer) {
        customerPrefill = {
          email: existingCustomer.email ?? email,
          name: existingCustomer.name ?? name ?? null,
          phone: existingCustomer.phone ?? null,
          shipping_address: existingCustomer.shipping_address ?? null,
        };
      }
    }

    return Response.json(
      {
        ok: true,
        expires_at: expiresAt,
        customer_prefill: customerPrefill,
      },
      { headers: corsHeaders(request) },
    );
  } catch (err) {
    console.error('Reserve error:', err);
    return Response.json(
      { error: 'Failed to reserve cart' },
      { status: 500, headers: corsHeaders(request) },
    );
  }
}

async function handleSessionStatus(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
      return Response.json(
        { error: 'Missing session_id' },
        { status: 400, headers: corsHeaders(request) },
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    });

    // Pair metadata.items (creation order) with line_items.data (same order)
    // to recover slug + title + per-line price for the success page.
    let metaItems: Array<{ id: string; slug: string }> = [];
    try {
      metaItems = JSON.parse(session.metadata?.items || '[]') as Array<{ id: string; slug: string }>;
    } catch {
      metaItems = [];
    }
    const lines = session.line_items?.data ?? [];
    const items = lines.map((li, i) => ({
      slug: metaItems[i]?.slug ?? null,
      title: li.description ?? null,
      price: li.amount_total ?? 0,
    }));

    return Response.json(
      {
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email ?? session.customer_email ?? null,
        customer_name: session.customer_details?.name ?? null,
        amount_total: session.amount_total ?? 0,
        shipping_cost: { amount_total: session.shipping_cost?.amount_total ?? 0 },
        items,
        stripe_event_id: session.id,
      },
      { headers: corsHeaders(request) },
    );
  } catch (err) {
    console.error('Session status error:', err);
    return Response.json(
      { error: 'Failed to retrieve session' },
      { status: 500, headers: corsHeaders(request) },
    );
  }
}

export async function POST(request: Request) {
  const action = new URL(request.url).searchParams.get('_action');
  if (action === 'reserve') return handleReserve(request);
  // Default POST → create Stripe session (preserves /api/checkout direct POST)
  if (action === null || action === 'session') return handleSession(request);
  return Response.json(
    { error: 'Unknown checkout action' },
    { status: 404, headers: corsHeaders(request) },
  );
}

export async function GET(request: Request) {
  const action = new URL(request.url).searchParams.get('_action');
  if (action === 'session-status') return handleSessionStatus(request);
  return Response.json(
    { error: 'Unknown checkout action' },
    { status: 404, headers: corsHeaders(request) },
  );
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}
