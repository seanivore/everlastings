// Consolidates orders list + per-id update into one Vercel function.
// Public URLs preserved via vercel.json rewrites:
//   GET   /api/orders                     → list orders (admin)
//   PATCH /api/orders/:id                 → ?id=:id   (record tracking, fire email)
import { corsHeaders, preflight } from './_lib/cors';
import { requireAdmin } from './_lib/adminAuth';
import { isTest } from './_lib/env';
import { sendEmail, trackingEmailHtml, trackingUrl } from './_emails/index';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CARRIER_CANONICAL: Record<string, 'USPS' | 'UPS' | 'FedEx' | 'DHL'> = {
  USPS: 'USPS',
  UPS: 'UPS',
  FEDEX: 'FedEx',
  DHL: 'DHL',
};

interface PatchBody {
  tracking_number?: unknown;
  tracking_carrier?: unknown;
  shipped_at?: unknown;
}

interface OrderRow {
  id: string;
  customer_email: string | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  shipped_at: string | null;
  tracking_email_sent_at: string | null;
  status: string | null;
  products: { title: string | null; thumbnail: string | null; slug: string | null } | null;
  customers: { name: string | null; email: string | null } | null;
  [key: string]: unknown;
}

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

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  // Rewrite /api/orders/:id → /api/orders?id=:id surfaces the id in the query.
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!id || !UUID_RE.test(id)) {
    return jsonResponse(request, { error: 'Invalid order id' }, 400);
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonResponse(request, { error: 'Invalid JSON' }, 400);
  }

  const trackingNumber =
    typeof body.tracking_number === 'string' ? body.tracking_number.trim() : '';
  if (!trackingNumber) {
    return jsonResponse(request, { error: 'tracking_number required' }, 400);
  }

  const carrierRaw =
    typeof body.tracking_carrier === 'string' ? body.tracking_carrier.trim() : '';
  if (!carrierRaw) {
    return jsonResponse(request, { error: 'tracking_carrier required' }, 400);
  }
  const carrier = CARRIER_CANONICAL[carrierRaw.toUpperCase()];
  if (!carrier) {
    return jsonResponse(
      request,
      { error: 'tracking_carrier must be one of USPS, UPS, FedEx, DHL' },
      400,
    );
  }

  let shippedAtIso: string;
  if (body.shipped_at === undefined || body.shipped_at === null || body.shipped_at === '') {
    shippedAtIso = new Date().toISOString();
  } else if (typeof body.shipped_at === 'string') {
    const parsed = new Date(body.shipped_at);
    if (Number.isNaN(parsed.getTime())) {
      return jsonResponse(request, { error: 'shipped_at must be a valid ISO timestamp' }, 400);
    }
    shippedAtIso = parsed.toISOString();
  } else {
    return jsonResponse(request, { error: 'shipped_at must be a string' }, 400);
  }

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({
      tracking_number: trackingNumber,
      tracking_carrier: carrier,
      shipped_at: shippedAtIso,
      status: 'shipped',
    })
    .eq('id', id)
    .select(
      '*, products(title, slug, thumbnail), customers(name, email, phone, shipping_address)',
    )
    .single();

  if (updateError || !updated) {
    if (updateError) console.error('Order PATCH update failed:', updateError.message);
    return jsonResponse(request, { error: updateError?.message ?? 'Order not found' }, 404);
  }

  const order = updated as unknown as OrderRow;

  const recipient = order.customers?.email ?? order.customer_email ?? null;
  const customerName = order.customers?.name ?? undefined;
  const productTitle = order.products?.title ?? 'your haven';

  const trackUrl = trackingUrl(carrier, trackingNumber);

  if (!trackUrl) {
    return jsonResponse(request, {
      ok: true,
      order,
      email_sent: false,
      email_skipped: 'unknown_carrier',
    });
  }

  if (!recipient) {
    return jsonResponse(request, {
      ok: true,
      order,
      email_sent: false,
      email_skipped: 'no_recipient',
    });
  }

  const { subject, html } = trackingEmailHtml({
    orderId: order.id,
    productTitle,
    trackingNumber,
    trackingCarrier: carrier,
    trackingUrl: trackUrl,
    customerName: customerName ?? undefined,
  });

  const sendResult = await sendEmail({ to: recipient, subject, html });

  if (sendResult.error || !sendResult.id) {
    const message =
      sendResult.error instanceof Error
        ? sendResult.error.message
        : typeof sendResult.error === 'string'
          ? sendResult.error
          : 'Email send failed';
    console.error('Order PATCH tracking email failed:', message);
    return jsonResponse(request, {
      ok: true,
      order,
      email_sent: false,
      email_error: message,
    });
  }

  const sentAtIso = new Date().toISOString();
  const { data: stamped, error: stampError } = await supabase
    .from('orders')
    .update({ tracking_email_sent_at: sentAtIso })
    .eq('id', id)
    .select(
      '*, products(title, slug, thumbnail), customers(name, email, phone, shipping_address)',
    )
    .single();

  if (stampError || !stamped) {
    if (stampError) console.error('Order PATCH timestamp write failed:', stampError.message);
    order.tracking_email_sent_at = sentAtIso;
    return jsonResponse(request, { ok: true, order, email_sent: true });
  }

  return jsonResponse(request, { ok: true, order: stamped, email_sent: true });
}
