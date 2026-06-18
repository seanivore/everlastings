-- CUTOVER DATA-FIX (run once, before the function): pre-WS6, a sale flipped available=false but never
-- decremented quantity, so an already-sold piece sits at available:false, quantity:1. Post-WS6 a refund
-- relist does quantity+1 = 2 → a phantom unit. Align quantity with the sold state first so relist lands
-- at 1, not 2. SCOPED to actually-SOLD rows via `exists (orders)` so a manually-paused or
-- never-sold piece the owner left in stock is NOT silently zeroed (design for the
-- template "User" with a real catalog, not Emy's all-qty-1 store; an owner's intentional pause is intent
-- we must not overwrite). The `exists` is HARD-SCOPED to the env dimension too — `and o.is_test =
-- p.is_test` (both columns are `NOT NULL DEFAULT false`; initial_schema :172 products / :174 orders) —
-- because the shared Supabase project always carries test orders, so the dimension match must be in the
-- SQL, not a comment the operator might skip. EYEBALL FIRST — and the UPDATE below ships COMMENTED on
-- purpose (AR#C-R2-1): `supabase db push` then applies ONLY the safe record_sale function and never
-- auto-zeroes stock. A doc-only "remember to eyeball" gate doesn't bind the template "User" the project
-- designs for — a multi-stock catalog can hold an intentionally-paused-but-previously-sold piece that a
-- blind apply would wrongly zero. So: run the SELECT, confirm the rows it lists are genuinely sold (not
-- a paused-with-stock piece), THEN uncomment + run the UPDATE once, by hand.
--   select id, slug, title, quantity from products p
--     where p.available = false and p.quantity > 0
--       and exists (select 1 from orders o where o.product_id = p.id and o.is_test = p.is_test);
-- update products p set quantity = 0
--   where p.available = false and p.quantity > 0
--     and exists (select 1 from orders o where o.product_id = p.id and o.is_test = p.is_test);

-- A sale decrements OUR stock and derives availability, atomically per row (the money path: two
-- near-simultaneous completions must not race a read-modify-write of the same count). archived_at
-- is untouched — a sale is never an archive. available follows the POST-decrement quantity.
create or replace function record_sale(p_ids uuid[])
returns void language sql as $$
  -- Count each id's multiplicity so an N-of-one-piece line would decrement by N, not 1. Today p_ids
  -- never has duplicates (see the invariant note below) — grouping is identical for unique ids — but
  -- this is strictly correct if a multi-buy cart is ever added, at zero cost.
  with counts as (select id, count(*)::int as n from unnest(p_ids) as id group by id)
  update products p
  -- both SET expressions read the OLD row (Postgres UPDATE semantics) → available = (new_qty > 0). F17.
  set quantity  = greatest(coalesce(p.quantity, 0) - c.n, 0),
      available = greatest(coalesce(p.quantity, 0) - c.n, 0) > 0
  from counts c
  where p.id = c.id;
$$;
