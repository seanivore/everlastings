import Stripe from 'stripe';
import { corsHeaders, preflight } from './_lib/cors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
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
      expand: ['payment_intent'],
    });

    return Response.json(
      {
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email ?? session.customer_email ?? null,
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

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}
