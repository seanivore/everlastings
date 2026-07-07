-- v3.5 — audit trail behind the Account activity card. Admin-only; one row per mutating action.
create table activity_log (
  id         uuid default gen_random_uuid() primary key,
  at         timestamptz not null default now(),
  actor      text,                          -- signed-in email (JWT) or 'gpt' (PRODUCT_API_KEY)
  action     text not null,                 -- machine key: product.* | sale.* | order.* (prefix → dot color)
  summary    text not null,                 -- human one-liner rendered on the card
  entity_id  text,                          -- product/order uuid OR Stripe promo id (mixed → text)
  meta       jsonb,
  is_test    boolean not null default false
);

-- Read pattern: newest-first, capped, scoped by env.
create index idx_activity_log_recent on activity_log (is_test, at desc);

-- Admin-only: service-role writes/reads bypass RLS; anon/authenticated get nothing (mirrors webhook_events).
alter table activity_log enable row level security;
create policy "Service role can manage activity log"
  on activity_log for all to service_role using (true) with check (true);
