begin;

-- These profiles are a fictional demo directory. Accounts will get a separate
-- auth-linked profiles table so a seed never overwrites a real person's account.
create table if not exists public.residents (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 80),
  age_range text not null,
  participant_group text not null check (participant_group in ('young-adult', 'adult', 'senior', 'family')),
  block text not null,
  languages text[] not null check (cardinality(languages) > 0 and languages <@ array['english', 'mandarin', 'tamil', 'malay', 'hokkien']::text[]),
  bio text not null,
  -- Roles are attached to activities, not age groups. JSON keeps this two-day
  -- prototype small while the application validates every nested record.
  intents jsonb not null check (jsonb_typeof(intents) = 'array' and jsonb_array_length(intents) > 0),
  availability jsonb not null check (jsonb_typeof(availability) = 'array'),
  is_demo boolean not null default true check (is_demo = true)
);

create table if not exists public.facilities (
  id uuid primary key,
  name text not null,
  activities text[] not null check (cardinality(activities) > 0),
  openings jsonb not null check (jsonb_typeof(openings) = 'array'),
  is_demo boolean not null default true check (is_demo = true)
);

create table if not exists public.interests (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  resident_id uuid not null references public.residents(id),
  request jsonb not null check (jsonb_typeof(request) = 'object'),
  suggested_slot jsonb check (suggested_slot is null or jsonb_typeof(suggested_slot) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists interests_resident_id_idx on public.interests(resident_id);

-- Only server routes may access these tables. No user-facing interest list is
-- exposed until accounts and ownership policies are implemented.
alter table public.residents enable row level security;
alter table public.facilities enable row level security;
alter table public.interests enable row level security;
revoke all on table public.residents, public.facilities, public.interests from public, anon, authenticated;
grant select, insert, update, delete on table public.residents, public.facilities, public.interests to service_role;

commit;
