-- EDGE ATLAS — 001 : journal des agents H1 et portefeuille FICTIF.
-- À coller dans le SQL Editor d'un projet Supabase DÉDIÉ à EDGE ATLAS
-- (jamais la base de production de SECOTO). Rejouable sans risque.
--
-- Pourquoi : la tâche Netlify agents-h1 tourne toutes les heures, même
-- téléphone éteint. Chaque vote et chaque position fictive est conservé pour
-- mesurer, après plusieurs mois, si l'accord des agents vaut quelque chose.
--
-- Sécurité : RLS activé SANS politique. Seules les fonctions Netlify, avec la
-- clé secrète, lisent et écrivent ; la clé publique ne voit rien.

create table if not exists public.agent_runs (
  id bigint generated always as identity primary key,
  heure timestamptz not null unique,            -- une seule exécution par heure
  cree_le timestamptz not null default now(),
  macro jsonb,                                  -- régime (refuge / risque / neutre) et raisons
  erreurs jsonb not null default '[]'::jsonb,   -- sources indisponibles pendant l'heure
  resume text
);

create table if not exists public.agent_votes (
  id bigint generated always as identity primary key,
  run_id bigint not null references public.agent_runs(id) on delete cascade,
  actif text not null,
  agent text not null check (agent in ('tendance', 'momentum', 'macro', 'volatilite', 'risque', 'comite')),
  vote smallint not null check (vote between -1 and 1),
  veto boolean not null default false,
  raisons jsonb not null default '[]'::jsonb,
  unique (run_id, actif, agent)
);

create table if not exists public.paper_trades (
  id bigint generated always as identity primary key,
  run_id bigint references public.agent_runs(id) on delete set null,
  actif text not null,
  sens smallint not null check (sens in (-1, 1)),
  accord smallint not null check (accord in (2, 3)),   -- nombre d'agents d'accord sur le sens
  ouverte_le timestamptz not null,
  entree numeric not null,
  stop numeric not null,
  cible numeric not null,
  quantite numeric not null check (quantite > 0),
  frais_bps numeric not null default 0,
  statut text not null default 'ouverte' check (statut in ('ouverte', 'fermee')),
  fermee_le timestamptz,
  sortie numeric,
  raison_sortie text,
  pnl numeric,                                  -- en unité de compte fictive, frais déduits
  r numeric,                                    -- résultat en multiples du risque initial
  unique (actif, ouverte_le)
);

-- Une seule position ouverte par actif
create unique index if not exists paper_trades_une_ouverte on public.paper_trades (actif) where statut = 'ouverte';
create index if not exists agent_votes_run on public.agent_votes (run_id);
create index if not exists paper_trades_fermee_le on public.paper_trades (fermee_le) where statut = 'fermee';

alter table public.agent_runs enable row level security;
alter table public.agent_votes enable row level security;
alter table public.paper_trades enable row level security;

-- Vérification : doit lister les 3 tables avec rowsecurity = true
select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename in ('agent_runs', 'agent_votes', 'paper_trades');
