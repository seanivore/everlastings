import { corsHeaders, preflight } from './_lib/cors';
import { syncProductToStripe, SyncableProduct } from './_lib/stripeSync';

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: SyncableProduct;
};

function isProductInsert(
  payload: WebhookPayload,
): payload is Required<Pick<WebhookPayload, 'type' | 'table' | 'record'>> {
  if (payload.type !== 'INSERT' || payload.table !== 'products') return false;
  const r = payload.record;
  if (!r || typeof r !== 'object') return false;
  if (!r.id || !r.title || typeof r.price !== 'number') return false;
  return true;
}

export async function POST(request: Request) {
  const headers = { ...corsHeaders(request), 'Content-Type': 'application/json' };

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  if (!isProductInsert(payload)) {
    return new Response(JSON.stringify({ error: 'Ignored: not a products INSERT' }), { status: 400, headers });
  }

  try {
    const result = await syncProductToStripe(payload.record);
    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (err) {
    console.error('Stripe sync error:', err);
    return new Response(JSON.stringify({ error: 'Stripe sync failed' }), { status: 500, headers });
  }
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}
