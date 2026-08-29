create or replace function match_products_with_rows(
  query_category text,
  query_embedding extensions.vector(1536),
  result_limit integer
)
returns table (
  id uuid,
  external_id text,
  name text,
  category_slug text,
  raw_listing text,
  price numeric,
  currency text,
  source_type text,
  passport jsonb,
  original_passport jsonb,
  evaluation jsonb,
  embedding extensions.vector(1536),
  created_at timestamptz,
  updated_at timestamptz,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $function$
  select
    products.id,
    products.external_id,
    products.name,
    products.category_slug,
    products.raw_listing,
    products.price,
    products.currency,
    products.source_type,
    products.passport,
    products.original_passport,
    products.evaluation,
    products.embedding,
    products.created_at,
    products.updated_at,
    1 - (products.embedding <=> query_embedding) as similarity
  from products
  where products.category_slug = query_category
    and products.embedding is not null
  order by products.embedding <=> query_embedding
  limit greatest(result_limit, 0);
$function$;
