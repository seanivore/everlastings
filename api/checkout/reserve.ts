import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from '../_lib/cors';
import { isTest } from '../_lib/env';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const HOLD_TTL_MINUTES = 15;

interface CartItem {
  product_id: string;
  slug: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      items?: CartItem[];
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

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}
