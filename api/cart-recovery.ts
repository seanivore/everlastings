import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest } from './_lib/env';
import { cartRecoveryCouponEmailHtml, sendEmail } from './_emails/index';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

interface LostItemInput {
  slug?: unknown;
  title?: unknown;
}

interface NormalizedLostItem {
  slug: string;
  title: string;
}

const PERCENT_OFF = 10;
const EXPIRES_IN_DAYS = 30;

function normalizeLostItems(input: unknown): NormalizedLostItem[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: NormalizedLostItem[] = [];
  for (const raw of input as LostItemInput[]) {
    if (!raw || typeof raw !== 'object') return null;
    const slug = typeof raw.slug === 'string' ? raw.slug.trim() : '';
    if (!slug) return null;
    const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : slug;
    out.push({ slug, title });
  }
  return out;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const lostItems = normalizeLostItems(body?.lost_items);

    if (!email || !email.includes('@')) {
      return Response.json(
        { error: 'Valid email required' },
        { status: 400, headers: corsHeaders(request) },
      );
    }

    if (!lostItems) {
      return Response.json(
        { error: 'lost_items must be a non-empty array of { slug, title? }' },
        { status: 400, headers: corsHeaders(request) },
      );
    }

    const expiresAtMs = Date.now() + EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;
    const expiresAtIso = new Date(expiresAtMs).toISOString();

    const promotionCode = await stripe.promotionCodes.create({
      coupon: 'cart-recovery-10',
      max_redemptions: 1,
      expires_at: Math.floor(expiresAtMs / 1000),
      metadata: {
        source: 'cart-recovery',
        email,
        lost_items: JSON.stringify(lostItems),
      },
    });

    try {
      const { error: upsertError } = await supabase
        .from('subscribers')
        .upsert(
          {
            email,
            source: 'cart-recovery',
            is_test: isTest,
            promo_code: promotionCode.code,
            promo_code_expires_at: expiresAtIso,
          },
          { onConflict: 'email' },
        );
      if (upsertError) {
        console.error('cart-recovery: subscriber upsert failed:', upsertError);
      }
    } catch (upsertErr) {
      console.error('cart-recovery: subscriber upsert threw:', upsertErr);
    }

    try {
      const { subject, html } = cartRecoveryCouponEmailHtml({
        promoCode: promotionCode.code,
        lostItems,
        percentOff: PERCENT_OFF,
        expiresInDays: EXPIRES_IN_DAYS,
      });
      const { error: sendError } = await sendEmail({ to: email, subject, html });
      if (sendError) {
        console.error('cart-recovery: email send failed:', sendError);
      }
    } catch (sendErr) {
      console.error('cart-recovery: email send threw:', sendErr);
    }

    return Response.json(
      {
        code: promotionCode.code,
        percent_off: PERCENT_OFF,
        expires_in_days: EXPIRES_IN_DAYS,
      },
      { headers: corsHeaders(request) },
    );
  } catch (err) {
    console.error('Cart recovery error:', err);
    return Response.json(
      { error: 'Failed to generate discount' },
      { status: 500, headers: corsHeaders(request) },
    );
  }
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}
