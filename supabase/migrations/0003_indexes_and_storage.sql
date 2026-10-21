-- ============================================================================
-- GMX Motors — Migration 0003 : index, recherche et stockage
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Index de recherche et de relations
-- ---------------------------------------------------------------------------
create index if not exists idx_products_category    on public.products (category_id);
create index if not exists idx_products_subcategory on public.products (subcategory_id);
create index if not exists idx_products_brand       on public.products (brand_id);
create index if not exists idx_products_active      on public.products (is_active, is_archived);
create index if not exists idx_products_featured    on public.products (is_featured) where is_featured;
create index if not exists idx_products_popularity  on public.products (popularity desc);
create index if not exists idx_products_created     on public.products (created_at desc);
create index if not exists idx_products_price       on public.products (price_public);

create index if not exists idx_products_name_trgm on public.products using gin (name extensions.gin_trgm_ops);
create index if not exists idx_products_sku_trgm  on public.products using gin (sku extensions.gin_trgm_ops);
create index if not exists idx_brands_name_trgm   on public.brands using gin (name extensions.gin_trgm_ops);

create index if not exists idx_categories_parent on public.categories (parent_id);
create index if not exists idx_categories_active on public.categories (is_active, sort_order);

create index if not exists idx_product_images_product on public.product_images (product_id, sort_order);
create index if not exists idx_product_attributes_product on public.product_attributes (product_id, sort_order);
create index if not exists idx_promotion_products_product on public.promotion_products (product_id);

create index if not exists idx_quotes_status    on public.quote_requests (status);
create index if not exists idx_quotes_created   on public.quote_requests (created_at desc);
create index if not exists idx_quotes_reference on public.quote_requests (reference);
create index if not exists idx_quotes_email     on public.quote_requests (lower(email));
create index if not exists idx_quotes_assigned  on public.quote_requests (assigned_to);
create index if not exists idx_quote_items_quote on public.quote_items (quote_request_id);
create index if not exists idx_quote_events_quote on public.quote_events (quote_request_id, created_at);

create index if not exists idx_outbox_pending on public.email_outbox (status, next_attempt_at);
create index if not exists idx_audit_created  on public.audit_logs (created_at desc);
create index if not exists idx_navigation_placement on public.navigation_items (placement, sort_order);
create index if not exists idx_faqs_active on public.faqs (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- Recherche plein texte en français
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('french', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(sku, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(model, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(short_description, '')), 'C')
  ) stored;

create index if not exists idx_products_search on public.products using gin (search_vector);

-- ---------------------------------------------------------------------------
-- Bucket Storage : images du catalogue
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogue',
  'catalogue',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Lecture publique du bucket catalogue
drop policy if exists catalogue_read on storage.objects;
create policy catalogue_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'catalogue');

-- Écriture réservée aux administrateurs (aucun upload public)
drop policy if exists catalogue_insert_admin on storage.objects;
create policy catalogue_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'catalogue'
    and public.is_admin()
    and lower(coalesce(storage.extension(name), '')) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
  );

drop policy if exists catalogue_update_admin on storage.objects;
create policy catalogue_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'catalogue' and public.is_admin())
  with check (bucket_id = 'catalogue' and public.is_admin());

drop policy if exists catalogue_delete_admin on storage.objects;
create policy catalogue_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalogue' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Privilèges explicites
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on public.categories, public.brands, public.products,
  public.product_images, public.product_attributes, public.promotions,
  public.promotion_products, public.pages, public.faqs, public.navigation_items,
  public.site_settings, public.testimonials to anon, authenticated;
grant usage, select on sequence public.quote_reference_seq to anon, authenticated, service_role;
