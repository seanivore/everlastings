import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest, env } from './_lib/env';
import { stripe } from './_lib/stripe';
import { syncProductToStripe, StripeSyncResult, SyncableProduct } from './_lib/stripeSync';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type ImageEntry = { url: string; alt?: string };

// Accepts either:
//   - Bearer ${PRODUCT_API_KEY}        (AI agents / curl)
//   - Bearer <Supabase JWT>            (admin UI authenticated user)
async function authorize(request: Request): Promise<boolean> {
  const auth = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  if (token === env('PRODUCT_API_KEY')) return true;
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data?.user;
}

function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  });
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const id = url.searchParams.get('id');
  const isAuthorized = await authorize(request);

  if (slug) {
    let query = supabase.from('products').select('*').eq('slug', slug);
    if (!isAuthorized) {
      query = query.eq('is_test', false);
    } else {
      query = query.eq('is_test', isTest);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('Product GET (slug) failed:', error.message);
      return jsonResponse(request, { error: 'Failed to load product' }, 500);
    }
    if (!data) return jsonResponse(request, { error: 'Product not found' }, 404);
    return jsonResponse(request, data);
  }

  if (id) {
    if (!isAuthorized) {
      return jsonResponse(request, { error: 'Unauthorized' }, 401);
    }
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_test', isTest)
      .maybeSingle();
    if (error) {
      console.error('Product GET (id) failed:', error.message);
      return jsonResponse(request, { error: 'Failed to load product' }, 500);
    }
    if (!data) return jsonResponse(request, { error: 'Product not found' }, 404);
    return jsonResponse(request, data);
  }

  let listQuery = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (!isAuthorized) {
    listQuery = listQuery.eq('is_test', false);
  } else {
    listQuery = listQuery.eq('is_test', isTest);
  }

  const { data, error } = await listQuery;
  if (error) {
    console.error('Product GET (list) failed:', error.message);
    return jsonResponse(request, { error: 'Failed to load products' }, 500);
  }
  return jsonResponse(request, { products: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }

  let product: Record<string, unknown>;
  try {
    product = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(request, { error: 'Invalid JSON' }, 400);
  }

  const required = ['title', 'description', 'price', 'product_type', 'headline', 'story_card'];
  const missing = required.filter((f) => {
    const v = product[f];
    if (v === undefined || v === null) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  });
  if (missing.length) {
    return jsonResponse(
      request,
      { error: `Missing required fields: ${missing.join(', ')}` },
      400,
    );
  }

  if (!Number.isInteger(product.price) || (product.price as number) <= 0) {
    return jsonResponse(
      request,
      { error: 'Price must be a positive integer in cents' },
      400,
    );
  }

  const images = Array.isArray(product.images) ? (product.images as ImageEntry[]) : null;
  if (!images || images.length === 0) {
    return jsonResponse(request, { error: 'images array is required' }, 400);
  }

  const filenameOf = (img: ImageEntry): string => {
    const u = typeof img?.url === 'string' ? img.url : '';
    return u.split('/').pop() ?? '';
  };
  // Strip `test_` prefix before role-matching so URLs returned by /api/upload
  // in test mode (which prepends `test_` for R2 namespacing) validate identically
  // to live-mode URLs. Without this, every test-mode product create fails the
  // hero/gallery presence checks even though the images uploaded fine.
  const roleName = (img: ImageEntry): string => filenameOf(img).replace(/^test_/, '');
  const heroImages = images.filter((img) => roleName(img).startsWith('hero-'));
  const galleryImages = images.filter((img) => roleName(img).startsWith('gallery-'));

  if (heroImages.length < 1) {
    return jsonResponse(request, { error: 'At least 1 hero image required' }, 400);
  }
  if (typeof product.thumbnail !== 'string' || !product.thumbnail.trim()) {
    return jsonResponse(request, { error: 'Thumbnail URL required' }, 400);
  }
  if (galleryImages.length < 5) {
    return jsonResponse(request, { error: 'Minimum 5 gallery images required' }, 400);
  }

  const title = String(product.title).trim();
  const slug =
    typeof product.slug === 'string' && product.slug.trim()
      ? product.slug.trim()
      : title.toLowerCase().replace(/ /g, '-');
  product.slug = slug;

  const { data: existing, error: lookupError } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (lookupError) {
    console.error('Slug lookup failed:', lookupError.message);
    return jsonResponse(request, { error: 'Failed to verify slug' }, 500);
  }
  if (existing) {
    return jsonResponse(request, { error: 'slug_conflict' }, 409);
  }

  const insertRow = { ...product, is_test: isTest };

  const { data, error } = await supabase
    .from('products')
    .insert(insertRow)
    .select()
    .single();

  if (error) {
    console.error('Product insert failed:', error.message);
    return jsonResponse(request, { error: error.message }, 400);
  }

  // Inline Stripe sync: callers (Custom GPT, curl protocol, admin UI) opt in
  // with `?sync=true` to receive Stripe IDs in the create response rather than
  // wait for the Supabase database webhook. The sync helper is idempotent,
  // so the database webhook firing afterward is a safe no-op.
  const url = new URL(request.url);
  let stripeSync: StripeSyncResult | null = null;
  if (url.searchParams.get('sync') === 'true' && data) {
    try {
      stripeSync = await syncProductToStripe(data as SyncableProduct);
    } catch (err) {
      console.error('Inline Stripe sync failed (product row was created):', err);
    }
  }

  return jsonResponse(request, {
    success: true,
    product: data,
    ...(stripeSync ? { stripe_sync: stripeSync } : {}),
  });
}

export async function PUT(request: Request) {
  if (!(await authorize(request))) {
    return jsonResponse(request, { error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return jsonResponse(request, { error: 'Missing id parameter' }, 400);
  }

  let updates: Record<string, unknown>;
  try {
    updates = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(request, { error: 'Invalid JSON' }, 400);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'slug')) {
    return jsonResponse(request, { error: 'slug is immutable' }, 400);
  }

  if (updates.price !== undefined) {
    if (!Number.isInteger(updates.price) || (updates.price as number) <= 0) {
      return jsonResponse(
        request,
        { error: 'Price must be a positive integer in cents' },
        400,
      );
    }

    const { data: current, error: currentError } = await supabase
      .from('products')
      .select('price, stripe_product_id, stripe_price_id')
      .eq('id', id)
      .maybeSingle();

    if (currentError) {
      console.error('Product price lookup failed:', currentError.message);
      return jsonResponse(request, { error: 'Failed to load product' }, 500);
    }
    if (!current) {
      return jsonResponse(request, { error: 'Product not found' }, 404);
    }

    if (
      current.price !== updates.price &&
      current.stripe_product_id &&
      current.stripe_price_id
    ) {
      try {
        await stripe.prices.update(current.stripe_price_id, { active: false });
        const newPrice = await stripe.prices.create({
          product: current.stripe_product_id,
          unit_amount: updates.price as number,
          currency: 'usd',
        });
        updates.stripe_price_id = newPrice.id;
      } catch (err) {
        console.error('Stripe price rotation failed:', err);
        return jsonResponse(request, { error: 'Failed to update Stripe price' }, 502);
      }
    }
  }

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Product update failed:', error.message);
    return jsonResponse(request, { error: error.message }, 400);
  }

  return jsonResponse(request, { success: true, product: data });
}
