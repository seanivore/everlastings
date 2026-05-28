import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest } from './_lib/env';
import { stripe } from './_lib/stripe';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY!);

function generateCode(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${rand}`;
}

export async function POST(request: Request) {
  try {
    const { email, source } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return Response.json(
        { error: 'Valid email required' },
        { status: 400, headers: corsHeaders(request) },
      );
    }

    const normalizedSource: string = (source && typeof source === 'string') ? source : 'footer';
    const isContemplation = normalizedSource === 'contemplation-offer';

    let promoCode: string | null = null;
    let promoCodeExpiresAt: string | null = null;

    if (isContemplation) {
      const expiresAtMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const code = generateCode('WELCOME5');
      try {
        await stripe.promotionCodes.create({
          coupon: 'newsletter-welcome-5',
          code,
          max_redemptions: 1,
          expires_at: Math.floor(expiresAtMs / 1000),
        });
        promoCode = code;
        promoCodeExpiresAt = new Date(expiresAtMs).toISOString();
      } catch (err) {
        console.error('Stripe promotion code creation failed:', err);
      }
    }

    const insertPayload: Record<string, unknown> = {
      email,
      source: normalizedSource,
      is_test: isTest,
    };
    if (promoCode) insertPayload.promo_code = promoCode;
    if (promoCodeExpiresAt) insertPayload.promo_code_expires_at = promoCodeExpiresAt;

    const { error } = await supabase.from('subscribers').insert(insertPayload);

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return Response.json(
          { message: 'Already subscribed' },
          { status: 200, headers: corsHeaders(request) },
        );
      }
      throw error;
    }

    // TODO: enable after api/_emails/index.ts lands (Wave 3 Group 6)
    // sendWelcomeEmail({ email, source: normalizedSource, promoCode, promoCodeExpiresAt });
    try {
      const subject = promoCode
        ? 'Welcome — your 5% code is inside'
        : 'Welcome to Everlastings by Emaline';
      const html = promoCode
        ? `<p>Welcome — your first email will arrive soon.</p><p>Your 5% welcome code: <strong>${promoCode}</strong>. It expires in 30 days.</p>`
        : `<p>Welcome — your first email will arrive soon.</p>`;

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: email,
        replyTo: process.env.RESEND_REPLY_TO_EMAIL!,
        subject,
        html,
      });
    } catch (mailErr) {
      console.error('Welcome email send failed:', mailErr);
    }

    return Response.json(
      { message: 'Subscribed', ...(promoCode ? { promoCode } : {}) },
      { headers: corsHeaders(request) },
    );
  } catch (err) {
    console.error('Subscribe error:', err);
    return Response.json(
      { error: 'Subscription failed' },
      { status: 500, headers: corsHeaders(request) },
    );
  }
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}
