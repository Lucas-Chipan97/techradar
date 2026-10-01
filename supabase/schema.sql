-- =====================================================================
-- TechRadar France : schéma MVP (à exécuter dans Supabase > SQL Editor)
-- Inspiré des sections 05, 07 et 08 du dossier projet.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Registre des sources : inventaire de couverture (privé)
-- ---------------------------------------------------------------------
create table if not exists public.source_registry (
  source_id          uuid primary key default gen_random_uuid(),
  name               text not null,
  url                text not null unique,
  domain             text not null,
  source_type        text not null check (source_type in ('marketplace','organizer','community','institution')),
  collection_method  text not null check (collection_method in ('api','html','rss','ical','jsonld','devevents')),  scope              text not null default 'national' check (scope in ('national','regional','city','organizer')),
  refresh_frequency  interval not null default interval '24 hours',
  status             text not null default 'active' check (status in ('active','paused','broken')),
  last_success_at    timestamptz,
  last_error_at      timestamptz,
  last_error         text,
  terms_reviewed_at  date,
  quality_score      numeric(3,2) check (quality_score between 0 and 1),
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Événements canoniques (lecture publique)
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  title              text not null,
  summary            text,
  description        text,
  start_at           timestamptz not null,
  end_at             timestamptz,
  timezone           text not null default 'Europe/Paris',
  status             text not null default 'scheduled'
                     check (status in ('scheduled','postponed','cancelled','completed','registration_closed')),
  format             text not null default 'in_person' check (format in ('in_person','online','hybrid')),
  language           text default 'fr',

  -- lieu
  city               text,
  venue              text,
  address            text,
  postal_code        text,
  latitude           double precision,
  longitude          double precision,

  -- classification
  primary_category   text not null,
  topics             text[] not null default '{}',
  technologies       text[] not null default '{}',
  audience           text[] not null default '{}',
  level              text,

  -- prix
  is_free            boolean not null default false,
  price_min          numeric(10,2),
  price_max          numeric(10,2),
  currency           text not null default 'EUR',

  organizer_name     text,
  canonical_url      text not null,

  -- gouvernance
  confidence_score   numeric(3,2),
  dedupe_cluster_id  uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- recherche plein texte en français
  search tsvector generated always as (
    setweight(to_tsvector('french'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('french'::regconfig, coalesce(organizer_name, '')), 'B') ||
    setweight(to_tsvector('french'::regconfig, coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('french'::regconfig, coalesce(description, '')), 'C')
  ) stored,

  constraint end_after_start check (end_at is null or end_at >= start_at)
);

create index if not exists events_start_at_idx on public.events (start_at);
create index if not exists events_city_idx on public.events (city);
create index if not exists events_category_idx on public.events (primary_category);
create index if not exists events_search_idx on public.events using gin (search);
create index if not exists events_technologies_idx on public.events using gin (technologies);

-- ---------------------------------------------------------------------
-- Occurrences d'un événement sur chaque source (traçabilité, privé)
-- ---------------------------------------------------------------------
create table if not exists public.event_sources (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events(id) on delete cascade,
  source_id        uuid not null references public.source_registry(source_id),
  source_event_id  text not null,          -- UID iCal ou URL de la page
  source_url       text not null,
  collected_at     timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  raw_hash         text,
  unique (source_id, source_event_id)
);

create index if not exists event_sources_event_idx on public.event_sources (event_id);

-- ---------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Sécurité (RLS) : le site lit events, rien d'autre.
-- Les scripts de collecte écrivent avec la clé service_role (qui contourne RLS).
-- ---------------------------------------------------------------------
alter table public.events          enable row level security;
alter table public.source_registry enable row level security;
alter table public.event_sources   enable row level security;

drop policy if exists "Lecture publique des événements" on public.events;
create policy "Lecture publique des événements" on public.events
  for select to anon, authenticated using (true);

-- Droits explicites (utile si l'exposition automatique des tables est désactivée)
grant usage on schema public to anon, authenticated, service_role;
grant select on public.events to anon, authenticated;
grant all on public.events, public.source_registry, public.event_sources to service_role;

-- Recharge le cache de l'API pour qu'elle voie les nouvelles tables tout de suite
notify pgrst, 'reload schema';
