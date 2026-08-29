create extension if not exists vector with schema extensions;

create table categories (
  slug text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table feature_definitions (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null references categories(slug) on delete cascade,
  feature_key text not null,
  label text not null,
  data_type text not null check (
    data_type in ('string', 'number', 'boolean', 'string_array')
  ),
  unit text,
  required boolean not null default false,
  demand_weight double precision not null check (demand_weight between 0 and 1),
  constraint_importance double precision not null check (
    constraint_importance between 0 and 1
  ),
  competitive_coverage double precision not null check (
    competitive_coverage between 0 and 1
  ),
  competitive_direction text not null check (
    competitive_direction in ('lower', 'higher', 'neutral')
  ),
  answerability double precision not null check (answerability between 0 and 1),
  evidence_required boolean not null default false,
  synonyms text[] not null default '{}',
  unique (category_slug, feature_key)
);

create index feature_definitions_category_idx
on feature_definitions(category_slug);

create or replace function immutable_text_array_to_string(input_values text[])
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $function$
  select pg_catalog.array_to_string(input_values, ' ');
$function$;

create table market_signals (
  id text primary key,
  category_slug text not null references categories(slug) on delete cascade,
  signal_type text not null check (
    signal_type in ('user_query', 'competitor_observation')
  ),
  raw_text text not null,
  parsed_intent jsonb,
  feature_keys text[] not null default '{}',
  feature_values jsonb not null default '{}',
  frequency integer not null default 1 check (frequency >= 0),
  source_label text not null,
  source_url text,
  observed_at timestamptz not null,
  embedding extensions.vector(1536) not null,
  fts tsvector generated always as (
    to_tsvector(
      'english',
      raw_text || ' ' || public.immutable_text_array_to_string(feature_keys)
    )
  ) stored
);

create index market_signals_category_idx on market_signals(category_slug);
create index market_signals_fts_idx on market_signals using gin(fts);
create index market_signals_embedding_idx on market_signals
using hnsw (embedding vector_cosine_ops);

create table products (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  category_slug text not null references categories(slug),
  raw_listing text not null,
  price numeric check (price is null or price >= 0),
  currency text check (currency is null or char_length(currency) = 3),
  source_type text not null check (
    source_type in ('text', 'json', 'csv', 'challenge_database')
  ),
  passport jsonb,
  original_passport jsonb,
  evaluation jsonb,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('english', name || ' ' || raw_listing)
  ) stored
);

create index products_category_idx on products(category_slug);
create index products_fts_idx on products using gin(fts);
create index products_embedding_idx on products
using hnsw (embedding vector_cosine_ops);
create index products_created_at_idx on products(created_at desc);
create index products_updated_at_idx on products(updated_at desc);

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create trigger products_touch_updated_at
before update on products
for each row execute function touch_updated_at();

create or replace function import_products(input_products jsonb)
returns setof products
language sql
volatile
set search_path = public
as $function$
  insert into products (
    external_id,
    name,
    category_slug,
    raw_listing,
    price,
    currency,
    source_type
  )
  select
    input.external_id,
    input.name,
    input.category_slug,
    input.raw_listing,
    input.price,
    input.currency,
    input.source_type
  from jsonb_to_recordset(input_products) as input(
    external_id text,
    name text,
    category_slug text,
    raw_listing text,
    price numeric,
    currency text,
    source_type text
  )
  returning products.*;
$function$;

create or replace function save_product_passport(
  input_product_id uuid,
  input_passport jsonb
)
returns uuid
language plpgsql
volatile
set search_path = public
as $function$
declare
  saved_product_id uuid;
begin
  update products
  set
    passport = input_passport,
    original_passport = coalesce(original_passport, input_passport)
  where id = input_product_id
  returning id into saved_product_id;

  if saved_product_id is null then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  return saved_product_id;
end;
$function$;

create or replace function match_products(
  query_category text,
  query_embedding extensions.vector(1536),
  result_limit integer
)
returns table (
  id uuid,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $function$
  select
    products.id,
    1 - (products.embedding <=> query_embedding) as similarity
  from products
  where products.category_slug = query_category
    and products.embedding is not null
  order by products.embedding <=> query_embedding
  limit greatest(result_limit, 0);
$function$;

create table product_claims (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  feature_key text not null,
  value jsonb,
  unit text,
  status text not null check (
    status in ('verified', 'seller_declared', 'ai_inferred', 'missing')
  ),
  confidence double precision not null check (confidence between 0 and 1),
  evidence_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, feature_key)
);

create trigger product_claims_touch_updated_at
before update on product_claims
for each row execute function touch_updated_at();

create index product_claims_product_idx on product_claims(product_id);

create table evaluations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index evaluations_product_created_idx
on evaluations(product_id, created_at desc);

create or replace function save_product_evaluation(
  input_product_id uuid,
  input_evaluation jsonb
)
returns uuid
language plpgsql
volatile
set search_path = public
as $function$
declare
  saved_product_id uuid;
begin
  update products
  set evaluation = input_evaluation
  where id = input_product_id
  returning id into saved_product_id;

  if saved_product_id is null then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into evaluations (product_id, payload)
  values (saved_product_id, input_evaluation);

  return saved_product_id;
end;
$function$;

create table interview_sessions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  asked_feature_keys text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index interview_sessions_product_idx
on interview_sessions(product_id);

create table interview_messages (
  id uuid primary key,
  session_id uuid not null references interview_sessions(id) on delete cascade,
  role text not null check (role in ('assistant', 'seller')),
  content text not null,
  feature_key text,
  created_at timestamptz not null
);

create index interview_messages_session_created_idx
on interview_messages(session_id, created_at);

create table recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  query text not null,
  intent jsonb not null,
  before_result jsonb not null,
  after_result jsonb not null,
  scoring_version text not null,
  created_at timestamptz not null default now()
);

create index recommendation_runs_product_created_idx
on recommendation_runs(product_id, created_at desc);

create or replace function hybrid_market_search(
  query_category text,
  query_text text,
  query_embedding extensions.vector(1536),
  result_limit integer
)
returns table (
  id text,
  category_slug text,
  signal_type text,
  raw_text text,
  parsed_intent jsonb,
  feature_keys text[],
  feature_values jsonb,
  frequency integer,
  source_label text,
  source_url text,
  observed_at timestamptz,
  score double precision
)
language sql
stable
set search_path = public, extensions
as $function$
  with semantic as (
    select
      market_signals.id,
      row_number() over (
        order by market_signals.embedding <=> query_embedding
      ) as rank
    from market_signals
    where market_signals.category_slug = query_category
    order by market_signals.embedding <=> query_embedding
    limit greatest(result_limit, 0) * 4
  ),
  lexical as (
    select
      market_signals.id,
      row_number() over (
        order by ts_rank_cd(
          market_signals.fts,
          websearch_to_tsquery('english', query_text)
        ) desc
      ) as rank
    from market_signals
    where market_signals.category_slug = query_category
      and market_signals.fts @@ websearch_to_tsquery('english', query_text)
    limit greatest(result_limit, 0) * 4
  ),
  fused as (
    select
      coalesce(semantic.id, lexical.id) as id,
      coalesce(1.0 / (60 + semantic.rank), 0.0)
        + coalesce(1.0 / (60 + lexical.rank), 0.0) as score
    from semantic
    full join lexical on semantic.id = lexical.id
  )
  select
    market_signals.id,
    market_signals.category_slug,
    market_signals.signal_type,
    market_signals.raw_text,
    market_signals.parsed_intent,
    market_signals.feature_keys,
    market_signals.feature_values,
    market_signals.frequency,
    market_signals.source_label,
    market_signals.source_url,
    market_signals.observed_at,
    fused.score
  from fused
  join market_signals on market_signals.id = fused.id
  order by fused.score desc
  limit greatest(result_limit, 0);
$function$;

alter table categories enable row level security;
alter table feature_definitions enable row level security;
alter table market_signals enable row level security;
alter table products enable row level security;
alter table product_claims enable row level security;
alter table evaluations enable row level security;
alter table interview_sessions enable row level security;
alter table interview_messages enable row level security;
alter table recommendation_runs enable row level security;

create policy categories_block_client_access on categories
for all to anon, authenticated using (false) with check (false);
create policy feature_definitions_block_client_access on feature_definitions
for all to anon, authenticated using (false) with check (false);
create policy market_signals_block_client_access on market_signals
for all to anon, authenticated using (false) with check (false);
create policy products_block_client_access on products
for all to anon, authenticated using (false) with check (false);
create policy product_claims_block_client_access on product_claims
for all to anon, authenticated using (false) with check (false);
create policy evaluations_block_client_access on evaluations
for all to anon, authenticated using (false) with check (false);
create policy interview_sessions_block_client_access on interview_sessions
for all to anon, authenticated using (false) with check (false);
create policy interview_messages_block_client_access on interview_messages
for all to anon, authenticated using (false) with check (false);
create policy recommendation_runs_block_client_access on recommendation_runs
for all to anon, authenticated using (false) with check (false);
