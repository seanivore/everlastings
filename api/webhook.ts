import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest } from './_lib/env';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type CartItemMeta = { id: string; slug: string };

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}

export async function POST(request: Request) {
  const pre = preflight(request);
  if (pre) return pre;

  const headers = { ...corsHeaders(request), 'Content-Type': 'application/json' };

  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 400, headers });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers });
  }

  // Idempotency claim (AR #21): INSERT-as-claim before any side effect.
  // 23505 = unique_violation → another delivery already processed (or is processing) this event.
  const claim = await supabase.from('webhook_events').insert({ event_id: event.id });
  if (claim.error) {
    if (claim.error.code === '23505') {
      console.log(`Duplicate webhook event ignored: ${event.id}`);
      return new Response(JSON.stringify({ received: true, no_op: true }), { status: 200, headers });
    }
    console.error(`Failed to claim webhook event ${event.id}:`, claim.error);
    return new Response(JSON.stringify({ error: 'Idempotency claim failed' }), { status: 500, headers });
  }

  if (event.type !== 'checkout.session.completed') {
    console.log(`Webhook event ${event.id} (${event.type}) recorded, no-op handler`);
    return new Response(JSON.stringify({ received: true }), { status: 200, headers });
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;

    let items: CartItemMeta[] = [];
    try {
      items = JSON.parse(session.metadata?.items || '[]') as CartItemMeta[];
    } catch (err) {
      console.error(`Failed to parse items metadata for ${event.id}:`, err);
      return new Response(JSON.stringify({ received: true, no_op: true }), { status: 200, headers });
    }

    if (!items.length) {
      console.error(`No items in session metadata for ${event.id}`);
      return new Response(JSON.stringify({ received: true, no_op: true }), { status: 200, headers });
    }

    const customerEmail = session.customer_details?.email ?? null;
    const stripeCustomerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? null;
    const shippingAddress = session.shipping_details?.address ?? null;
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

    let customerId: string | null = null;
    if (customerEmail) {
      const { data: customer, error: customerErr } = await supabase
        .from('customers')
        .upsert(
          {
            email: customerEmail,
            name: session.customer_details?.name ?? null,
            phone: session.customer_details?.phone ?? null,
            shipping_address: shippingAddress,
            stripe_customer_id: stripeCustomerId,
            source: 'checkout',
            is_test: isTest,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' },
        )
        .select('id')
        .single();

      if (customerErr) {
        console.error(`Customer upsert failed for ${event.id}:`, customerErr);
      } else {
        customerId = customer?.id ?? null;
      }

      const { error: subscriberLinkErr } = await supabase
        .from('subscribers')
        .update({ source: 'customer' })
        .eq('email', customerEmail);
      if (subscriberLinkErr) {
        console.error(`Subscriber link update failed for ${event.id}:`, subscriberLinkErr);
      }
    }

    const productIds = items.map((i) => i.id);
    const { error: productUpdateErr } = await supabase
      .from('products')
      .update({ available: false })
      .in('id', productIds);
    if (productUpdateErr) {
      console.error(`Product mark-sold failed for ${event.id}:`, productUpdateErr);
    }

    // Per-line-item amount: prefer Stripe's authoritative line items; fall back to splitting amount_total.
    const perItemAmounts: Record<string, number> = {};
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      for (const li of lineItems.data) {
        const supabaseId = li.price?.product && typeof li.price.product !== 'string'
          ? (li.price.product as Stripe.Product).metadata?.supabase_id
          : undefined;
        if (supabaseId && typeof li.amount_total === 'number') {
          perItemAmounts[supabaseId] = li.amount_total;
        }
      }
    } catch (err) {
      console.error(`Line item fetch failed for ${event.id} (falling back to amount_total split):`, err);
    }

    const totalAmount = session.amount_total ?? 0;
    const fallbackEach = items.length > 0 ? Math.floor(totalAmount / items.length) : 0;
    const fallbackRemainder = totalAmount - fallbackEach * items.length;

    const orderRows = items.map((item, idx) => {
      const explicit = perItemAmounts[item.id];
      const amount = typeof explicit === 'number'
        ? explicit
        : fallbackEach + (idx === 0 ? fallbackRemainder : 0);
      return {
        stripe_session_id: session.id,
        stripe_payment_intent: paymentIntentId,
        product_id: item.id,
        customer_id: customerId,
        customer_email: customerEmail,
        amount,
        status: 'completed',
        shipping_address: shippingAddress,
        is_test: isTest,
      };
    });

    const { error: orderInsertErr } = await supabase.from('orders').insert(orderRows);
    if (orderInsertErr) {
      console.error(`Orders insert failed for ${event.id}:`, orderInsertErr);
    }

    const holdSessionId = session.metadata?.hold_session_id ?? session.metadata?.session_id ?? null;
    if (holdSessionId) {
      const { error: holdsErr } = await supabase
        .from('cart_holds')
        .delete()
        .eq('session_id', holdSessionId);
      if (holdsErr) {
        console.error(`Cart holds clear failed for ${event.id} (session ${holdSessionId}):`, holdsErr);
      }
    }

    if (process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN) {
      try {
        const emailHash = customerEmail ? [await sha256Hex(customerEmail)] : [];
        const phoneHash = session.customer_details?.phone
          ? [await sha256Hex(session.customer_details.phone.replace(/\D/g, ''))]
          : [];
        await fetch(`https://graph.facebook.com/v19.0/${process.env.META_PIXEL_ID}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [
              {
                event_name: 'Purchase',
                event_time: Math.floor(Date.now() / 1000),
                event_id: event.id,
                action_source: 'website',
                user_data: {
                  em: emailHash,
                  ph: phoneHash,
                },
                custom_data: {
                  currency: (session.currency || 'usd').toUpperCase(),
                  value: (session.amount_total || 0) / 100,
                  content_ids: items.map((i) => i.slug),
                  content_type: 'product',
                  num_items: items.length,
                },
              },
            ],
            access_token: process.env.META_ACCESS_TOKEN,
            ...(isTest ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
          }),
        });
      } catch (err) {
        console.error(`Meta CAPI error for ${event.id} (non-blocking):`, err);
      }
    }

    console.log(`Order completed (${event.id}): ${items.map((i) => i.slug).join(', ')} -> ${customerEmail ?? 'unknown'}`);
  } catch (err) {
    // Idempotency claim already inserted; do NOT 5xx (would trigger Stripe retry that we'd then no-op).
    // Log loudly with the event id so it's grep-able for manual reconciliation.
    console.error(`Webhook handler error after claim for ${event.id} (returning 200 to prevent retry):`, err);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers });
}
