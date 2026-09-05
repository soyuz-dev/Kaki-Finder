begin;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  block text not null check (char_length(block) between 1 and 20),
  participant_group text not null check (participant_group in ('young-adult', 'adult', 'senior', 'family')),
  languages text[] not null check (cardinality(languages) between 1 and 5 and languages <@ array['english','mandarin','tamil','malay','hokkien']::text[]),
  bio text not null default '' check (char_length(bio) <= 600)
);
-- Existing guest interests remain unowned. Names and blocks are not proof of identity.
alter table public.interests add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists interests_user_created_idx on public.interests(user_id, created_at desc);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select, insert, delete on public.interests to authenticated;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists interests_read_own on public.interests;
create policy interests_read_own on public.interests for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists interests_insert_own on public.interests;
create policy interests_insert_own on public.interests for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists interests_delete_own on public.interests;
create policy interests_delete_own on public.interests for delete to authenticated using ((select auth.uid()) = user_id);
commit;
notify pgrst, 'reload schema';
