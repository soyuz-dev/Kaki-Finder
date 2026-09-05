begin;

-- Publication is an explicit choice. Existing accounts start private.
alter table public.profiles add column if not exists discoverable boolean not null default false;
alter table public.profiles add column if not exists intents jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists availability jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists directory_id uuid not null default gen_random_uuid();
create unique index if not exists profiles_directory_id_idx on public.profiles(directory_id);

create or replace function public.valid_discovery_details(intents jsonb, availability jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(intents) <> 'array' or jsonb_typeof(availability) <> 'array' then return false; end if;
  if jsonb_array_length(intents) > 20 or jsonb_array_length(availability) > 21 then return false; end if;
  for item in select value from jsonb_array_elements(intents) loop
    if jsonb_typeof(item) <> 'object' or not (item ?& array['activity','role','skill']) then return false; end if;
    if (item - array['activity','role','skill']) <> '{}'::jsonb then return false; end if;
    if (item->>'activity') is null or (item->>'activity') not in ('chess','cooking','gardening','language','dance','badminton','coding','guitar','fitness','photography','jogging') then return false; end if;
    if (item->>'role') is null or (item->>'role') not in ('teacher','learner','partner') then return false; end if;
    if item->'skill' <> 'null'::jsonb and (jsonb_typeof(item->'skill') <> 'string' or char_length(btrim(item->>'skill')) not between 1 and 120) then return false; end if;
  end loop;
  for item in select value from jsonb_array_elements(availability) loop
    if jsonb_typeof(item) <> 'object' or not (item ?& array['day','start','end']) then return false; end if;
    if (item - array['day','start','end']) <> '{}'::jsonb then return false; end if;
    if jsonb_typeof(item->'day') <> 'number' or (item->>'day') !~ '^[1-7]$' then return false; end if;
    if jsonb_typeof(item->'start') <> 'string' or jsonb_typeof(item->'end') <> 'string' then return false; end if;
    if (item->>'start') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or (item->>'end') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or (item->>'start') >= (item->>'end') then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.valid_discovery_details(jsonb,jsonb) from public;
grant execute on function public.valid_discovery_details(jsonb,jsonb) to authenticated, service_role;
alter table public.profiles drop constraint if exists profiles_discovery_details_check;
alter table public.profiles add constraint profiles_discovery_details_check check (public.valid_discovery_details(intents, availability));
alter table public.profiles drop constraint if exists profiles_publication_check;
alter table public.profiles add constraint profiles_publication_check check (not discoverable or (jsonb_array_length(intents) > 0 and jsonb_array_length(availability) > 0 and char_length(btrim(bio)) > 0));

alter table public.residents drop constraint if exists residents_is_demo_check;
alter table public.residents add column if not exists owner_id uuid unique references auth.users(id) on delete set null;
alter table public.residents add column if not exists is_active boolean not null default true;

-- A separate public ID avoids exposing auth IDs. Clients cannot choose or change it.
revoke insert, update on public.profiles from authenticated;
grant insert(id,name,block,participant_group,languages,bio,discoverable,intents,availability) on public.profiles to authenticated;
grant update(id,name,block,participant_group,languages,bio,discoverable,intents,availability) on public.profiles to authenticated;

-- Only this trigger can project private profile fields into the server-only directory.
-- The fixed search path prevents caller-created objects from changing its behaviour.
create or replace function public.sync_discoverable_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    update public.residents set is_active = false where id = old.directory_id;
    return old;
  end if;
  if not new.discoverable then
    update public.residents set is_active = false where id = new.directory_id;
    return new;
  end if;
  insert into public.residents(id,owner_id,name,age_range,participant_group,block,languages,bio,intents,availability,is_demo,is_active)
  values(new.directory_id,new.id,new.name,
    case new.participant_group when 'young-adult' then '20–40' when 'adult' then '41–64' when 'senior' then '65+' else 'Family (adult-managed)' end,
    new.participant_group,new.block,new.languages,new.bio,new.intents,new.availability,false,true)
  on conflict(id) do update set name=excluded.name, age_range=excluded.age_range,
    participant_group=excluded.participant_group, block=excluded.block, languages=excluded.languages,
    bio=excluded.bio, intents=excluded.intents, availability=excluded.availability, is_active=true
  where public.residents.owner_id = new.id;
  return new;
end;
$$;
revoke all on function public.sync_discoverable_profile() from public, anon, authenticated;
drop trigger if exists sync_discoverable_profile on public.profiles;
create trigger sync_discoverable_profile after insert or update or delete on public.profiles for each row execute function public.sync_discoverable_profile();

-- Lock the target during insertion so hiding and expressing interest cannot race.
create or replace function public.check_interest_target()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target public.residents%rowtype;
begin
  select * into target from public.residents where id = new.resident_id for share;
  if not found or not target.is_active or (new.user_id is not null and target.owner_id = new.user_id) then
    raise exception 'This neighbour is no longer available' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.check_interest_target() from public, anon, authenticated;
drop trigger if exists check_interest_target on public.interests;
create trigger check_interest_target before insert on public.interests for each row execute function public.check_interest_target();
commit;
notify pgrst, 'reload schema';
