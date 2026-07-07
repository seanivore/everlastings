import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from './_lib/cors';
import { isTest } from './_lib/env';
import { logActivity } from './_lib/activityLog';
import { stripe } from './_lib/stripe';
import { sendEmail } from './_emails/index';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!,
);

// Single service-role client (bypasses RLS) shared by BOTH cron-gated jobs: the scheduled-publish scan
// (below, sees due-but-still-unpublished rows the anon feed client can't) and the §7.3 reconciliation
// (reads the authenticated-only orders table). Same key api/webhook.ts:7-11 uses. The feed query itself
// keeps the publishable client above. DECLARE ONCE — §7.3 reuses this const, never a second client.
const feedAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// v3.5 scheduled publish (no new cron): the cron-gated feed run publishes any product whose
// scheduled_publish_at has passed. is_test-scoped (Vercel's daily cron runs against prod = Live; a
// preview cron hit scans TEST) so the isTest boundary holds. Reuses /api/products?_action=publish
// (Stripe create + validation + token/schedule clear) via an authenticated self-call, so there is no
// publish logic here. Best-effort per row: a failure is logged and skipped so one bad row never blocks
// the feed. Runs ONLY inside the §7.3c isCronRequest gate — never on a bare public GET.
async function publishDueScheduled(req: Request): Promise<void> {
  // v3.6.2 — runtime-gate the PostgREST .or() negation form; a supabase-js/PostgREST version bump could
  // silently narrow the query, so ship the fallback as a mechanism, not a build-time note. `title` for
  // the A2-4 skipped-summary log below.
  let dueRes = await feedAdmin
    .from('products')
    .select('id, title')
    .eq('is_test', isTest)
    .is('archived_at', null)
    .not('scheduled_publish_at', 'is', null)
    .lte('scheduled_publish_at', new Date().toISOString())
    .or('is_published.eq.false,draft.not.is.null');
  if (dueRes.error) {
    // .or() negation form unsupported on this stack — fall back to unpublished-only + WARN once per cold start.
    if (!(globalThis as { __postgrestOrWarned?: boolean }).__postgrestOrWarned) {
      console.warn('Scheduled-publish: PostgREST .or() negation unsupported on this stack; staged-edit auto-publish disabled — schedule only fires for unpublished drafts.');
      (globalThis as { __postgrestOrWarned?: boolean }).__postgrestOrWarned = true;
    }
    dueRes = await feedAdmin
      .from('products')
      .select('id, title')
      .eq('is_test', isTest)
      .is('archived_at', null)
      .not('scheduled_publish_at', 'is', null)
      .lte('scheduled_publish_at', new Date().toISOString())
      .eq('is_published', false);
  }
  const { data: due, error } = dueRes;
  if (error) {
    console.error('Scheduled-publish scan failed:', error.message);
    return;
  }
  const origin = new URL(req.url).origin;
  for (const row of (due ?? []) as Array<{ id: string; title: string | null }>) {
    try {
      const res = await fetch(`${origin}/api/products?_action=publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PRODUCT_API_KEY}`,
          'X-Actor': 'cron', // v3.6.6 — attribute this scheduled auto-publish to 'cron', not 'gpt'; resolveActor honors it ONLY on a valid PRODUCT_API_KEY self-call
        },
        body: JSON.stringify({ id: row.id }),
      });
      if (!res.ok) {
        await logActivity({ actor: 'cron', action: 'product.schedule_skipped', summary: `Scheduled publish skipped — "${row.title ?? 'piece'}" not publish-ready`, entityId: row.id });
        console.error('Scheduled publish failed for', row.id, await res.text());
      }
    } catch (err) {
      console.error('Scheduled publish threw for', row.id, err);
    }
  }
}

type FeedRow = {
  slug: string;
  title: string | null;
  description: string | null;
  price: number | null;
  available: boolean | null;
  thumbnail: string | null;
};

// Vercel Cron auth (documented): when CRON_SECRET is set, Vercel adds `Authorization: Bearer <secret>`
// to the cron request only. The product feed is PUBLIC (Google/Meta poll it), so we gate reconciliation
// on this header — a public feed hit never triggers it, and no secret configured = never runs (safe).
function isCronRequest(req: Request): boolean {
  const secret = (process.env.CRON_SECRET ?? '').trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

// Reconcile Stripe's source-of-truth against our orders table. A paid+completed checkout session with
// NO matching orders row = a completion webhook that never landed (one cart = one session spanning N
// sibling rows sharing stripe_session_id). We do NOT inspect signature-400s — those are bot/replay
// noise; Stripe's completed-session list is the authoritative ledger. Scoped by isTest; the Stripe key
// is already env-scoped (test vs live), so on the prod cron both sides are LIVE data.
async function reconcileOrders(): Promise<void> {
  const sinceUnix = Math.floor(Date.now() / 1000) - 26 * 60 * 60; // 26h overlaps the 24h cadence
  const sessions = await stripe.checkout.sessions.list({
    created: { gte: sinceUnix },
    status: 'complete',
    limit: 100,
  });
  const paid = sessions.data.filter((s) => s.payment_status === 'paid');
  if (paid.length === 0) return;

  const sessionIds = paid.map((s) => s.id);
  const { data: rows, error } = await feedAdmin
    .from('orders')
    .select('stripe_session_id')
    .eq('is_test', isTest)
    .in('stripe_session_id', sessionIds);
  if (error) {
    console.error('Reconciliation: orders lookup failed:', error);
    return;
  }

  const haveOrder = new Set((rows ?? []).map((r) => r.stripe_session_id));
  const gaps = paid.filter((s) => !haveOrder.has(s.id));
  if (gaps.length === 0) {
    console.log(`Reconciliation OK: ${paid.length} paid session(s), all have orders.`);
    return;
  }

  const alertTo = (process.env.RECONCILE_ALERT_EMAIL || process.env.ORDER_NOTIFY_EMAIL || '').trim();
  if (!alertTo) {
    console.error(`Reconciliation: ${gaps.length} gap(s) but no alert address configured.`);
    return;
  }

  // Auto-replay path: Stripe Dashboard -> Developers -> Events -> the session's checkout.session.completed
  // -> Resend. The webhook's idempotency claim (webhook_events, webhook.ts:50) makes a resend safe and it
  // rebuilds the missing orders row(s). (A future step could POST the event back to /api/webhook directly.)
  const items = gaps
    .map((s) => {
      const pi = typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent?.id ?? 'unknown');
      const amt = ((s.amount_total ?? 0) / 100).toFixed(2);
      const email = s.customer_details?.email ?? 'unknown buyer';
      return `<li>Session <code>${s.id}</code> — $${amt} — PI <code>${pi}</code> — ${email}</li>`;
    })
    .join('');
  const html = `<p>${gaps.length} Stripe checkout session(s) completed &amp; paid in the last 26h with NO matching orders row (${isTest ? 'TEST' : 'LIVE'} data). The completion webhook likely never landed:</p>
<ul>${items}</ul>
<p><strong>Replay:</strong> Stripe Dashboard → Developers → Events → find each session's <code>checkout.session.completed</code> → Resend. The webhook is idempotent, so a resend safely rebuilds the missing order(s).</p>`;
  await sendEmail({ to: alertTo, subject: `Reconciliation: ${gaps.length} paid session(s) missing an order`, html });
  console.error(`Reconciliation: emailed ${gaps.length} gap(s) to ${alertTo}.`);
}

export async function GET(req: Request) {
  // Cron-gated jobs (#227 reconcile + v3.5 scheduled-publish). Gated to the authenticated cron hit so
  // the PUBLIC feed never triggers them; a public/preview poll runs neither. A failure in either must
  // never break the feed response. Publish first so due rows appear in this same run.
  if (isCronRequest(req)) {
    try {
      await publishDueScheduled(req); // v3.5: auto-publish any scheduled-and-due rows (is_test-scoped)
    } catch (err) {
      console.error('Scheduled-publish job failed (non-fatal):', err);
    }
    try {
      await reconcileOrders();
    } catch (err) {
      console.error('Reconciliation job failed (non-fatal):', err);
    }
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('slug, title, description, price, available, thumbnail')
    .eq('is_test', false)
    .eq('is_published', true)
    .is('archived_at', null);

  if (error) {
    console.error('Product feed query failed:', error);
    return new Response('error', {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'text/plain' },
    });
  }

  const header = 'id,title,description,availability,condition,price,link,image_link,brand';
  const esc = (s: string | null | undefined) =>
    `"${(s ?? '').replace(/"/g, '""')}"`;

  const rows = ((products ?? []) as FeedRow[]).map((p) => {
    const avail = p.available ? 'in stock' : 'out of stock';
    const priceCents = typeof p.price === 'number' ? p.price : 0;
    const price = `${(priceCents / 100).toFixed(2)} USD`;
    const link = `https://everlastingsbyemaline.com/product/${p.slug}`;
    return [
      p.slug,
      esc(p.title),
      esc(p.description),
      avail,
      'new',
      price,
      link,
      p.thumbnail ?? '',
      'Everlastings by Emaline',
    ].join(',');
  });

  return new Response([header, ...rows].join('\n'), {
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'text/csv',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function OPTIONS(req: Request) {
  return preflight(req)!;
}
