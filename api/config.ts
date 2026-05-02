import { corsHeaders, preflight } from './_lib/cors';

export async function GET(req: Request) {
  return Response.json(
    {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      supabaseUrl: process.env.SUPABASE_URL,
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
      metaPixelId: process.env.META_PIXEL_ID || null,
    },
    { headers: corsHeaders(req) },
  );
}

export async function OPTIONS(req: Request) {
  return preflight(req)!;
}
