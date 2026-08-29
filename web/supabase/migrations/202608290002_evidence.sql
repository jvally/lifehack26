create table evidence_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  feature_key text not null,
  original_name text,
  media_type text not null,
  storage_path text,
  extracted_text text not null,
  supported boolean not null,
  supporting_excerpt text,
  created_at timestamptz not null default now()
);

alter table evidence_records enable row level security;
create index evidence_records_product_idx on evidence_records(product_id);

create policy evidence_records_block_client_access on evidence_records
for all to anon, authenticated using (false) with check (false);
