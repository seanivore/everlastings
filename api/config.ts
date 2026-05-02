import { corsHeaders, preflight } from './_lib/cors';
import { env } from './_lib/env';

export async function GET(req: Request) {
  return Response.json(
    {
      publishableKey: env('STRIPE_PUBLISHABLE_KEY'),
      supabaseUrl: env('SUPABASE_URL'),
      supabasePublishableKey: env('SUPABASE_PUBLISHABLE_KEY'),
      metaPixelId: env('META_PIXEL_ID') || null,
    },
    { headers: corsHeaders(req) },
  );
}

export async function OPTIONS(req: Request) {
  return preflight(req)!;
}
