import { createClient } from '@supabase/supabase-js';
import { env, isTest } from './env';

// Own service-role client (mirrors _lib/stripeSync.ts) — the audit write must not depend on a
// request-scoped client, and service-role bypasses RLS on the admin-only activity_log table.
const supabase = createClient(
  env('SUPABASE_URL'),
  env('SUPABASE_SECRET_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export type ActivityEntry = {
  actor: string;
  action: string;                     // machine key, e.g. 'product.publish' — the prefix drives the dot color
  summary: string;                    // human one-liner rendered on the Account card
  entityId?: string | null;           // product/order uuid, or a Stripe promo id — text, not uuid (mixed sources)
  meta?: Record<string, unknown> | null;
};

// Best-effort audit write. NEVER throws and NEVER fails the caller's mutation — a logging outage must not
// block a publish/refund/ship. AWAIT it (don't fire-and-forget): a Vercel function can freeze once the
// Response resolves, dropping an un-awaited insert.
export async function logActivity(entry: ActivityEntry): Promise<void> {
  try {
    const { error } = await supabase.from('activity_log').insert({
      actor: entry.actor,
      action: entry.action,
      summary: entry.summary,
      entity_id: entry.entityId ?? null,
      meta: entry.meta ?? null,
      is_test: isTest,
    });
    if (error) console.error('activity_log insert failed (non-fatal):', error.message);
  } catch (err) {
    console.error('activity_log insert threw (non-fatal):', err);
  }
}

// Resolve the acting identity for products.ts call sites, where authorize() returns only a boolean.
// PRODUCT_API_KEY (GPT/curl) → 'gpt' with no round-trip; an admin JWT → the signed-in email (falls back
// to the user id, then 'admin'). One extra getUser on the JWT path is acceptable — logging is best-effort
// and this is single-admin, low-traffic. (orders.ts skips this — requireAdmin already returns the user.)
export async function resolveActor(request: Request): Promise<string> {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  const token = header && header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return 'unknown';
  if (token === env('PRODUCT_API_KEY')) {
    // v3.6.6 — the scheduled-publish cron self-call (product-feed.ts §2.6) sets X-Actor:cron so its
    // publish activity attributes to 'cron', not 'gpt'. Honored ONLY alongside a valid PRODUCT_API_KEY
    // (a trusted internal caller); a real GPT publish never sets it. Single-admin, so a key-holder
    // mislabeling its OWN action is negligible.
    return request.headers.get('x-actor') === 'cron' ? 'cron' : 'gpt';
  }
  const { data } = await supabase.auth.getUser(token);
  return data?.user?.email ?? data?.user?.id ?? 'admin';
}
