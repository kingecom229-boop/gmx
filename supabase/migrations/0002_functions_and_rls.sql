-- ============================================================================
-- GMX Motors — Migration 0002 : fonctions, triggers et Row Level Security
-- ============================================================================
-- Principes de sécurité :
--   * RLS activée sur TOUTES les tables du schéma public.
--   * Le privilège administrateur n'est JAMAIS déduit d'un champ modifiable
--     par l'utilisateur : il exige à la fois profiles.role = 'admin' ET
--     app_metadata.role = 'admin' dans le JWT (cf. public.is_admin()).
--   * Les visiteurs anonymes ne peuvent ni lire les devis, ni modifier le
--     catalogue, ni lire la configuration sensible.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Fonctions d'autorisation
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active
      and p.role = 'admin'
      and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active
      and p.role in ('admin', 'commercial')
      and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'commercial')
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
revoke execute on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Création automatique du profil à l'inscription
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.user_role;
begin
  -- Le rôle provient UNIQUEMENT des métadonnées posées côté serveur
  -- (script d'initialisation ou invitation administrateur). Une inscription
  -- publique produit toujours un profil « client ».
  if coalesce(new.raw_app_meta_data ->> 'role', '') = 'admin' then
    v_role := 'admin';
  elsif coalesce(new.raw_app_meta_data ->> 'role', '') = 'commercial' then
    v_role := 'commercial';
  else
    v_role := 'client';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Empêche un utilisateur de modifier son propre rôle ou celui d'un autre.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  if new.is_active is distinct from old.is_active and not public.is_admin() then
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- Référence de devis lisible : GMX-AAAA-000123
-- ---------------------------------------------------------------------------
create or replace function public.assign_quote_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null then
    new.reference := 'GMX-' || to_char(now(), 'YYYY') || '-' ||
                     lpad(nextval('public.quote_reference_seq')::text, 6, '0');
  end if;
  new.email := lower(btrim(new.email));
  return new;
end;
$$;

drop trigger if exists trg_quote_reference on public.quote_requests;
create trigger trg_quote_reference
  before insert on public.quote_requests
  for each row execute function public.assign_quote_reference();

-- ---------------------------------------------------------------------------
-- Journal d'audit
-- ---------------------------------------------------------------------------
create or replace function public.log_audit(
  p_action text,
  p_entity text default null,
  p_entity_id text default null,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_logs (actor_id, action, entity, entity_id, payload)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_payload, '{}'::jsonb));
end;
$$;

revoke execute on function public.log_audit(text, text, text, jsonb) from public;
grant execute on function public.log_audit(text, text, text, jsonb) to authenticated, service_role;

-- Journalisation des changements de statut de devis
create or replace function public.log_quote_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    insert into public.quote_events (quote_request_id, actor_id, action, detail)
    values (new.id, auth.uid(), 'statut',
            coalesce(old.status::text, '') || ' → ' || new.status::text);
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.quote_events (quote_request_id, actor_id, action, detail)
    values (new.id, auth.uid(), 'attribution', coalesce(new.assigned_to::text, 'non attribué'));
  end if;
  if new.internal_notes is distinct from old.internal_notes then
    insert into public.quote_events (quote_request_id, actor_id, action, detail)
    values (new.id, auth.uid(), 'note', 'Note interne mise à jour');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quote_status_change on public.quote_requests;
create trigger trg_quote_status_change
  after update on public.quote_requests
  for each row execute function public.log_quote_status_change();

-- ---------------------------------------------------------------------------
-- Promotions actives (utilisée par le front pour n'afficher que le réel)
-- ---------------------------------------------------------------------------
create or replace function public.active_promotions()
returns setof public.promotions
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select *
  from public.promotions p
  where p.is_active
    and (p.starts_at is null or p.starts_at <= now())
    and (p.ends_at is null or p.ends_at > now());
$$;

-- ---------------------------------------------------------------------------
-- Activation de la RLS
-- ---------------------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.categories              enable row level security;
alter table public.brands                  enable row level security;
alter table public.products                enable row level security;
alter table public.product_images          enable row level security;
alter table public.product_attributes      enable row level security;
alter table public.promotions              enable row level security;
alter table public.promotion_products      enable row level security;
alter table public.quote_requests          enable row level security;
alter table public.quote_items             enable row level security;
alter table public.quote_events            enable row level security;
alter table public.email_outbox            enable row level security;
alter table public.site_settings           enable row level security;
alter table public.navigation_items        enable row level security;
alter table public.pages                   enable row level security;
alter table public.faqs                    enable row level security;
alter table public.testimonials            enable row level security;
alter table public.contact_messages        enable row level security;
alter table public.newsletter_subscribers  enable row level security;
alter table public.audit_logs              enable row level security;
alter table public.admin_bootstrap_tokens  enable row level security;

-- Suppression des politiques préexistantes (rend la migration rejouable)
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ===========================================================================
-- CATALOGUE : lecture publique, écriture administrateur uniquement
-- ===========================================================================
create policy catalog_read_categories on public.categories
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

create policy catalog_write_categories on public.categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy catalog_read_brands on public.brands
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

create policy catalog_write_brands on public.brands
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy catalog_read_products on public.products
  for select to anon, authenticated
  using ((is_active = true and is_archived = false) or public.is_admin());

create policy catalog_write_products on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy catalog_read_product_images on public.product_images
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.is_active and not p.is_archived
    )
  );

create policy catalog_write_product_images on public.product_images
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy catalog_read_product_attributes on public.product_attributes
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_attributes.product_id
        and p.is_active and not p.is_archived
    )
  );

create policy catalog_write_product_attributes on public.product_attributes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy catalog_read_promotions on public.promotions
  for select to anon, authenticated
  using (
    public.is_admin()
    or (
      is_active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    )
  );

create policy catalog_write_promotions on public.promotions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy catalog_read_promotion_products on public.promotion_products
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.promotions pr
      where pr.id = promotion_products.promotion_id
        and pr.is_active
        and (pr.starts_at is null or pr.starts_at <= now())
        and (pr.ends_at is null or pr.ends_at > now())
    )
  );

create policy catalog_write_promotion_products on public.promotion_products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- CONTENU : lecture publique (publié), écriture administrateur
-- ===========================================================================
create policy content_read_pages on public.pages
  for select to anon, authenticated
  using (is_published = true or public.is_admin());

create policy content_write_pages on public.pages
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy content_read_faqs on public.faqs
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

create policy content_write_faqs on public.faqs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy content_read_navigation on public.navigation_items
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

create policy content_write_navigation on public.navigation_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy content_read_site_settings on public.site_settings
  for select to anon, authenticated
  using (true);

create policy content_write_site_settings on public.site_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy content_read_testimonials on public.testimonials
  for select to anon, authenticated
  using (is_approved = true or public.is_admin());

create policy content_write_testimonials on public.testimonials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- PROFILS : l'utilisateur voit son profil, l'admin voit tout
-- ===========================================================================
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (public.is_admin());

create policy profiles_delete_admin on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- ===========================================================================
-- DEVIS : aucun accès public en lecture ; insertion contrôlée côté serveur
-- ===========================================================================
-- Les visiteurs ne peuvent PAS lire les devis (ni les leurs via cette table :
-- la confirmation s'appuie sur la référence retournée par l'API).
create policy quotes_select_staff on public.quote_requests
  for select to authenticated
  using (
    public.is_staff()
    or (auth.uid() is not null and owner_id = auth.uid())
  );

-- L'insertion est ouverte aux rôles anon/authenticated : elle n'est utilisée
-- que par le serveur API (validations, anti-spam, débit, prix relus en base).
-- Les contraintes CHECK de la table bornent strictement les données.
create policy quotes_insert_public on public.quote_requests
  for insert to anon, authenticated
  with check (true);

-- Aucune modification ni suppression par un visiteur.
create policy quotes_update_staff on public.quote_requests
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy quotes_delete_admin on public.quote_requests
  for delete to authenticated
  using (public.is_admin());

create policy quote_items_select_staff on public.quote_items
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.quote_requests q
      where q.id = quote_items.quote_request_id
        and q.owner_id = auth.uid()
    )
  );

create policy quote_items_insert_public on public.quote_items
  for insert to anon, authenticated
  with check (true);

create policy quote_items_update_staff on public.quote_items
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy quote_items_delete_staff on public.quote_items
  for delete to authenticated
  using (public.is_staff());

create policy quote_events_select_staff on public.quote_events
  for select to authenticated
  using (public.is_staff());

create policy quote_events_write_staff on public.quote_events
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ===========================================================================
-- OUTBOX / AUDIT / BOOTSTRAP : strictement réservés au service ou à l'admin
-- ===========================================================================
create policy outbox_all_admin on public.email_outbox
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy audit_select_admin on public.audit_logs
  for select to authenticated
  using (public.is_admin());

create policy audit_insert_staff on public.audit_logs
  for insert to authenticated
  with check (public.is_staff());

-- admin_bootstrap_tokens : RLS activée, aucune politique = accès refusé à
-- anon/authenticated. Seul le rôle service (clé secrète) peut l'utiliser.

-- ===========================================================================
-- FORMULAIRES PUBLICS
-- ===========================================================================
create policy contact_insert_public on public.contact_messages
  for insert to anon, authenticated
  with check (true);

create policy contact_select_admin on public.contact_messages
  for select to authenticated
  using (public.is_staff());

create policy contact_update_admin on public.contact_messages
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy newsletter_insert_public on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (true);

create policy newsletter_select_admin on public.newsletter_subscribers
  for select to authenticated
  using (public.is_staff());

create policy newsletter_update_admin on public.newsletter_subscribers
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy newsletter_delete_admin on public.newsletter_subscribers
  for delete to authenticated
  using (public.is_admin());
