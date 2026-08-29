create table attribution_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  source text not null check (source in ('retail_ready_simulator', 'chatgpt', 'shopping_agent', 'other')),
  event_type text not null check (event_type in ('recommendation_served', 'product_view', 'conversion')),
  referral_token text not null,
  query text,
  created_at timestamptz not null default now()
);

create index attribution_events_product_created_idx
on attribution_events(product_id, created_at desc);

alter table attribution_events enable row level security;

create policy attribution_events_block_client_access on attribution_events
for all using (false) with check (false);
