// Consolidates orders list + per-id update into one Vercel function.
// Public URLs preserved via vercel.json rewrites:
//   GET   /api/orders                     → list orders (admin)
//   PATCH /api/orders/:id                 → ?id=:id   (record tracking, fire email)
import { corsHeaders, preflight } from './_lib/cors';
import { requireAdmin } from './_lib/adminAuth';
import { isTest } from './_lib/env';
import { stripe } from './_lib/stripe';
import { sendEmail, trackingEmailHtml, trackingUrl } from './_emails/index';
import { logActivity } from './_lib/activityLog';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// v3.5: per-env last-viewed key for the Orders-nav unseen blink. site_config has no is_test column
// (a non-transactional table — initial_schema :169), so the ENV lives in the key, not a column.
const ORDERS_LAST_VIEWED_KEY = isTest ? 'orders_last_viewed_test' : 'orders_last_viewed_live';

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

  // Refund panel: load a cart's FULL sibling set by PaymentIntent, independent of the shipping subtab
  // (siblings can straddle needs_shipping/shipped) — round-4 breadth-pass fix.
  const paymentIntent = url.searchParams.get('payment_intent');
  if (paymentIntent) query = query.eq('stripe_payment_intent', paymentIntent);

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

  // v3.5: unseen-order signal for the Orders-nav blink. Count completed, unshipped orders created AFTER
  // the owner last viewed Orders (site_config, per-env). Independent of the list filter.
  const { data: lv } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', ORDERS_LAST_VIEWED_KEY)
    .maybeSingle();
  const lastViewed = (lv?.value as { at?: string } | null)?.at ?? null;
  let unseenQuery = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('is_test', isTest)
    .is('shipped_at', null)
    .eq('status', 'completed');
  if (lastViewed) unseenQuery = unseenQuery.gt('created_at', lastViewed);
  const { count: unseenCount } = await unseenQuery;

  return jsonResponse(request, { orders: data ?? [], unseen_count: unseenCount ?? 0, last_viewed: lastViewed });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;
  const actor = 'user' in auth ? (auth.user.email ?? auth.user.id) : 'gpt';

  // Rewrite /api/orders/:id → /api/orders?id=:id surfaces the id in the query.
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!id || !UUID_RE.test(id)) {
    return jsonResponse(request, { error: 'Invalid order id' }, 400);
  }

  // Never ship (or re-email) a refunded order — mirror the refund handler's 409 guard (:280-282).
  // A refunded piece must not trigger a tracking email to the buyer.
  const { data: existing, error: existingErr } = await supabase
    .from('orders')
    .select('status')
    .eq('id', id)
    .eq('is_test', isTest)
    .single();
  if (existingErr || !existing) {
    return jsonResponse(request, { error: 'Order not found' }, 404);
  }
  if (existing.status === 'refunded') {
    return jsonResponse(request, { error: "This order is refunded — it can't be shipped." }, 409);
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

  await logActivity({
    actor,
    action: 'order.ship',
    summary: `Marked order #${order.id.slice(0, 8)} shipped`,
    entityId: order.id,
  });

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

// POST /api/orders/:id/refund  (vercel rewrite → ?id=:id&_action=refund) — owner-issued refund.
// A Stripe refund is an AMOUNT against the PaymentIntent (refunds aren't line-item-aware), and one
// cart = one PI spanning N sibling `orders` rows (webhook.ts:185 writes one row per product). So we
// refund `amount_cents` (default = THIS order's line amount → the common single-item case).
// Three INDEPENDENT per-piece choices, none derivable from the others (the amount can be any value):
//   • resolved_product_ids — mark a piece 'resolved' (off the shipping queue; no longer needs shipping)
//   • relist_product_ids   — put a piece back on sale (restock; relisting ALSO implies resolved)
//   • amount_cents         — how much money to return (partial / goodwill / full)
// We flip the UNION(resolved, relist) to 'resolved' (honest — a kept restocking fee isn't a clean
// 'refunded') and restock only the relisted subset. charge.refunded (webhook.ts:60) still upgrades a
// piece to 'refunded' when the WHOLE PI is refunded — that stays the accurate full-money-back marker.
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;
  const actor = 'user' in auth ? (auth.user.email ?? auth.user.id) : 'gpt';

  const url = new URL(request.url);
  const action = url.searchParams.get('_action');

  // v3.5: mark Orders as seen — stamp a per-env last-viewed time in site_config so the Orders-nav blink
  // clears. Single-admin, so one timestamp per env is the whole mechanism.
  if (action === 'seen') {
    const { error: seenErr } = await supabase
      .from('site_config')
      .upsert({ key: ORDERS_LAST_VIEWED_KEY, value: { at: new Date().toISOString() } }, { onConflict: 'key' });
    if (seenErr) {
      console.error('Orders seen-stamp failed:', seenErr.message);
      return jsonResponse(request, { error: 'Failed to record the view' }, 500);
    }
    return jsonResponse(request, { ok: true });
  }

  if (action !== 'refund') {
    return jsonResponse(request, { error: 'Unknown action' }, 400);
  }
  const id = url.searchParams.get('id') ?? '';
  if (!id || !UUID_RE.test(id)) {
    return jsonResponse(request, { error: 'Invalid order id' }, 400);
  }

  // Optional JSON body: amount_cents (a custom/partial amount) + relist_product_ids + resolved_product_ids.
  // No body = refund this order's full line amount + relist (and thus resolve) this one piece — the GPT's
  // simple {id} call. Explicit empty arrays = a goodwill/partial amount, nothing relisted or resolved.
  let body: { amount_cents?: unknown; relist_product_ids?: unknown; resolved_product_ids?: unknown } = {};
  try { body = (await request.json()) as typeof body; } catch { /* no body → per-line defaults */ }

  const { data: order, error: loadErr } = await supabase
    .from('orders')
    .select('id, status, amount, product_id, stripe_payment_intent')
    .eq('id', id)
    .eq('is_test', isTest)
    .single();
  if (loadErr || !order) return jsonResponse(request, { error: 'Order not found' }, 404);
  if (order.status === 'refunded') {
    return jsonResponse(request, { error: 'This order is already refunded.' }, 409);
  }
  if (!order.stripe_payment_intent) {
    return jsonResponse(request, { error: 'This order has no payment to refund.' }, 409);
  }

  const refundAmount = typeof body.amount_cents === 'number' && Number.isInteger(body.amount_cents) && body.amount_cents > 0
    ? body.amount_cents
    : (order.amount as number | null);
  if (typeof refundAmount !== 'number' || refundAmount <= 0) {
    return jsonResponse(request, { error: 'Could not determine the refund amount — pass amount_cents.' }, 400);
  }
  // Relisted pieces (→ restock; relisting also implies resolved). Explicit [] = nothing relisted.
  // Undefined (the GPT's simple {id} call) = just this order's piece.
  const relistIds = Array.isArray(body.relist_product_ids)
    ? (body.relist_product_ids as unknown[]).filter((x): x is string => typeof x === 'string')
    : [order.product_id as string];
  // Resolved pieces (→ 'resolved' status, off the shipping queue; NO restock). Independent of relist.
  const resolvedIds = Array.isArray(body.resolved_product_ids)
    ? (body.resolved_product_ids as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  // The union leaves the shipping queue; `relistIds` is the subset we also put back on sale.
  const flipIds = [...new Set([...relistIds, ...resolvedIds])];

  const pi = order.stripe_payment_intent as string;
  try {
    await stripe.refunds.create(
      { payment_intent: pi, amount: refundAmount },
      { idempotencyKey: `refund-${pi}-${refundAmount}-${[...relistIds].sort().join('.')}` },
    );
  } catch (err) {
    console.error(`Refund failed for order ${id} (PI ${pi}):`, err);
    return jsonResponse(request, { error: 'Stripe refund failed — check the amount, then the Stripe dashboard.' }, 502);
  }

  // Flip the union to 'resolved' + hand back the relisted subset for the client to restock. Sibling
  // orders on this PI (product_ids are unique per cart, so one row each). The embed resolves for
  // archived pieces too (service-role client).
  const relist: Array<{ product_id: string; slug: string; title: string; available: boolean; quantity: number; archived: boolean }> = [];
  if (flipIds.length) {
    const { data: siblings } = await supabase
      .from('orders')
      .select('id, product_id, products(id, slug, title, available, quantity, archived_at)')
      .eq('stripe_payment_intent', pi)
      .eq('is_test', isTest)
      .in('product_id', flipIds);
    const rows = (siblings ?? []) as unknown as Array<{
      id: string;
      product_id: string;
      products?: { id: string; slug: string; title: string; available: boolean; quantity: number | null; archived_at: string | null };
    }>;
    const flippedRowIds = rows.map((r) => r.id);
    if (flippedRowIds.length) {
      // Optimistic flip to 'resolved' (off the shipping queue). The webhook upgrades to 'refunded' on a
      // full-PI refund. Non-fatal if it lags.
      const { error: updErr } = await supabase.from('orders').update({ status: 'resolved' }).in('id', flippedRowIds);
      if (updErr) console.error(`Refund status flip lagged for PI ${pi}:`, updErr.message);
    }
    const relistSet = new Set(relistIds);
    for (const r of rows) {
      if (!r.products) continue;
      if (!relistSet.has(r.product_id)) continue; // resolved-only pieces don't go back on sale
      relist.push({
        product_id: r.products.id, slug: r.products.slug, title: r.products.title,
        available: r.products.available, quantity: r.products.quantity ?? 0, archived: !!r.products.archived_at,
      });
    }
  }
  // (Nothing relisted or resolved = goodwill/partial → NO status flip, empty relist; the response `status`
  // mirrors that — 'resolved' only when pieces actually flipped, else the order's unchanged status, so the
  // field never lies to the GPT. A full-PI refund still upgrades every sibling to 'refunded' via charge.refunded.)
  await logActivity({
    actor,
    action: 'order.refund',
    summary: `Refunded $${(refundAmount / 100).toFixed(2)} on order #${id.slice(0, 8)}`,
    entityId: id,
  });
  return jsonResponse(request, { ok: true, status: flipIds.length ? 'resolved' : order.status, relist });
}
