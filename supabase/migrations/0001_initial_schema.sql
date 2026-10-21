-- ============================================================================
-- GMX Motors — Migration 0001 : schéma de base
-- ============================================================================
-- Cible : PostgreSQL 15+ (Supabase)
-- Rejouable : oui (tous les objets utilisent IF NOT EXISTS / OR REPLACE)
--
-- Contenu : extensions, types énumérés, tables du catalogue, des devis,
--           du contenu éditorial et de la journalisation.
-- ============================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;
create extension if not exists "unaccent" with schema extensions;

-- ---------------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.product_condition as enum ('neuf', 'occasion');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_availability as enum ('en_stock', 'sur_commande', 'a_confirmer', 'indisponible');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.promotion_kind as enum
    ('promotion', 'remise', 'lot', 'pack_entretien', 'offre_pro', 'destockage', 'saisonniere');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discount_type as enum ('pourcentage', 'montant', 'aucune');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quote_status as enum
    ('nouveau', 'en_cours', 'devis_prepare', 'envoye', 'accepte', 'refuse', 'cloture');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_status as enum ('en_attente', 'envoye', 'echec', 'ignore');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum ('admin', 'commercial', 'client');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at : colonne + trigger générique
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profils (miroir de auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  full_name     text,
  phone         text,
  role          public.user_role not null default 'client',
  is_active     boolean not null default true,
  last_sign_in  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Catégories (hiérarchiques)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  description     text,
  parent_id       uuid references public.categories (id) on delete set null,
  image_url       text,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  show_on_home    boolean not null default false,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_no_self_parent check (parent_id is null or parent_id <> id)
);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Marques
-- ---------------------------------------------------------------------------
create table if not exists public.brands (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  logo_url   text,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create trigger trg_brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Produits
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  sku               text not null unique,
  slug              text not null unique,
  name              text not null,
  model             text,
  brand_id          uuid references public.brands (id) on delete set null,
  category_id       uuid references public.categories (id) on delete set null,
  subcategory_id    uuid references public.categories (id) on delete set null,
  condition         public.product_condition not null default 'neuf',
  availability      public.product_availability not null default 'a_confirmer',
  price_public      numeric(12,2) check (price_public is null or price_public >= 0),
  price_on_quote    boolean not null default true,
  short_description text,
  description       text,
  specs             jsonb not null default '{}'::jsonb,
  warranty_text     text,
  delivery_text     text,
  is_featured       boolean not null default false,
  is_active         boolean not null default true,
  is_archived       boolean not null default false,
  is_demo           boolean not null default false,
  view_count        integer not null default 0,
  popularity        integer not null default 0,
  seo_title         text,
  seo_description   text,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint products_sku_not_blank check (btrim(sku) <> ''),
  constraint products_name_not_blank check (btrim(name) <> ''),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_subcategory_differs check (subcategory_id is null or subcategory_id <> category_id)
);

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Images produit
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url        text not null,
  alt        text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Attributs techniques structurés
-- ---------------------------------------------------------------------------
create table if not exists public.product_attributes (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  group_name  text not null default 'Caractéristiques',
  label       text not null,
  value       text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint product_attributes_label_not_blank check (btrim(label) <> '')
);

-- ---------------------------------------------------------------------------
-- Promotions / opérations commerciales
-- ---------------------------------------------------------------------------
create table if not exists public.promotions (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  title           text not null,
  description     text,
  kind            public.promotion_kind not null default 'promotion',
  discount_type   public.discount_type not null default 'aucune',
  discount_value  numeric(12,2) check (discount_value is null or discount_value >= 0),
  starts_at       timestamptz,
  ends_at         timestamptz,
  is_active       boolean not null default true,
  banner_image_url text,
  conditions_text text,
  show_on_home    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint promotions_code_not_blank check (btrim(code) <> ''),
  constraint promotions_period_valid check (starts_at is null or ends_at is null or ends_at > starts_at),
  constraint promotions_discount_requires_value
    check (discount_type = 'aucune' or discount_value is not null)
);

create trigger trg_promotions_updated_at
  before update on public.promotions
  for each row execute function public.set_updated_at();

-- Produits concernés par une promotion (+ prix promotionnel éventuel)
create table if not exists public.promotion_products (
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete cascade,
  promo_price  numeric(12,2) check (promo_price is null or promo_price >= 0),
  created_at   timestamptz not null default now(),
  primary key (promotion_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Demandes de devis
-- ---------------------------------------------------------------------------
create sequence if not exists public.quote_reference_seq start 1 increment 1;

create table if not exists public.quote_requests (
  id                   uuid primary key default gen_random_uuid(),
  reference            text unique,
  first_name           text not null,
  last_name            text not null,
  company              text,
  email                text not null,
  phone                text not null,
  postal_code          text not null,
  city                 text not null,
  project_type         text,
  message              text,
  contact_preference   text,
  consent              boolean not null default false,
  status               public.quote_status not null default 'nouveau',
  assigned_to          uuid references public.profiles (id) on delete set null,
  internal_notes       text,
  owner_id             uuid references auth.users (id) on delete set null,
  ip_hash              text,
  user_agent           text,
  notification_status  public.notification_status not null default 'en_attente',
  notification_sent_at timestamptz,
  notification_error   text,
  ack_status           public.notification_status not null default 'en_attente',
  ack_error            text,
  idempotency_key      text unique,
  source               text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint quotes_consent_required check (consent = true),
  constraint quotes_first_name_len check (char_length(btrim(first_name)) between 1 and 80),
  constraint quotes_last_name_len check (char_length(btrim(last_name)) between 1 and 80),
  constraint quotes_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  constraint quotes_phone_len check (char_length(btrim(phone)) between 6 and 32),
  constraint quotes_postal_code_len check (char_length(btrim(postal_code)) between 2 and 12),
  constraint quotes_city_len check (char_length(btrim(city)) between 1 and 80),
  constraint quotes_message_len check (message is null or char_length(message) <= 5000),
  constraint quotes_status_requires_consent check (consent = true)
);

create trigger trg_quotes_updated_at
  before update on public.quote_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Lignes de devis
-- ---------------------------------------------------------------------------
create table if not exists public.quote_items (
  id                    uuid primary key default gen_random_uuid(),
  quote_request_id      uuid not null references public.quote_requests (id) on delete cascade,
  product_id            uuid references public.products (id) on delete set null,
  sku                   text,
  name                  text not null,
  quantity              integer not null check (quantity > 0 and quantity <= 9999),
  note                  text,
  unit_price_indicative numeric(12,2) check (unit_price_indicative is null or unit_price_indicative >= 0),
  price_on_quote        boolean not null default true,
  product_snapshot      jsonb not null default '{}'::jsonb,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  constraint quote_items_name_not_blank check (btrim(name) <> ''),
  constraint quote_items_note_len check (note is null or char_length(note) <= 1000)
);

-- ---------------------------------------------------------------------------
-- Historique des actions sur un devis
-- ---------------------------------------------------------------------------
create table if not exists public.quote_events (
  id               uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests (id) on delete cascade,
  actor_id         uuid references public.profiles (id) on delete set null,
  action           text not null,
  detail           text,
  created_at       timestamptz not null default now(),
  constraint quote_events_action_not_blank check (btrim(action) <> '')
);

-- ---------------------------------------------------------------------------
-- File d'attente d'envoi (outbox) — garantit la reprise après échec
-- ---------------------------------------------------------------------------
create table if not exists public.email_outbox (
  id               uuid primary key default gen_random_uuid(),
  quote_request_id uuid references public.quote_requests (id) on delete set null,
  kind             text not null,
  to_email         text not null,
  subject          text not null,
  body_html        text not null,
  status           public.notification_status not null default 'en_attente',
  attempts         integer not null default 0,
  last_error       text,
  next_attempt_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  sent_at          timestamptz,
  constraint outbox_kind_allowed check (kind in ('quote_notification', 'quote_ack', 'generic'))
);

-- ---------------------------------------------------------------------------
-- Contenu éditorial & configuration du site
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint site_settings_key_not_blank check (btrim(key) <> '')
);

create trigger trg_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create table if not exists public.navigation_items (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  url        text not null,
  placement  text not null default 'header' check (placement in ('header', 'footer')),
  parent_id  uuid references public.navigation_items (id) on delete set null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint navigation_label_not_blank check (btrim(label) <> '')
);

create trigger trg_navigation_updated_at
  before update on public.navigation_items
  for each row execute function public.set_updated_at();

create table if not exists public.pages (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  content         text not null default '',
  is_published    boolean not null default true,
  indexable       boolean not null default true,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint pages_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create trigger trg_pages_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

create table if not exists public.faqs (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text not null,
  category   text,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faqs_question_not_blank check (btrim(question) <> '')
);

create trigger trg_faqs_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();

create table if not exists public.testimonials (
  id         uuid primary key default gen_random_uuid(),
  author     text not null,
  role       text,
  company    text,
  content    text not null,
  rating     integer check (rating is null or (rating >= 1 and rating <= 5)),
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_testimonials_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  subject    text,
  message    text not null,
  status     text not null default 'nouveau' check (status in ('nouveau', 'traite', 'archive')),
  ip_hash    text,
  created_at timestamptz not null default now(),
  constraint contact_name_len check (char_length(btrim(name)) between 1 and 120),
  constraint contact_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint contact_message_len check (char_length(message) between 1 and 5000)
);

create table if not exists public.newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  is_confirmed  boolean not null default false,
  confirmed_at  timestamptz,
  source        text,
  ip_hash       text,
  created_at    timestamptz not null default now(),
  constraint newsletter_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- ---------------------------------------------------------------------------
-- Journal d'audit des opérations administratives sensibles
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid,
  action     text not null,
  entity     text,
  entity_id  text,
  payload    jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Token d'initialisation du premier administrateur
-- ---------------------------------------------------------------------------
create table if not exists public.admin_bootstrap_tokens (
  token_hash text primary key,
  used_by    uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
