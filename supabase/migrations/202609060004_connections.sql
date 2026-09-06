begin;
create or replace function public.valid_connection_slot(slot jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if slot is null then return true; end if;
  if jsonb_typeof(slot) <> 'object' or not (slot ?& array['facilityId','facilityName','startAt','endAt','needsConfirmation']) then return false; end if;
  if slot - array['facilityId','facilityName','startAt','endAt','needsConfirmation'] <> '{}'::jsonb then return false; end if;
  if (slot->>'facilityId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or jsonb_typeof(slot->'facilityId') <> 'string' then return false; end if;
  if jsonb_typeof(slot->'facilityName') <> 'string' or char_length(slot->>'facilityName') not between 1 and 100 or jsonb_typeof(slot->'needsConfirmation') <> 'boolean' then return false; end if;
  if jsonb_typeof(slot->'startAt') <> 'string' or jsonb_typeof(slot->'endAt') <> 'string' then return false; end if;
  if (slot->>'startAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$' or (slot->>'endAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$' then return false; end if;
  return (slot->>'endAt')::timestamptz - (slot->>'startAt')::timestamptz = interval '1 hour';
exception when others then return false;
end;
$$;

-- New requests are separate from yesterday's private interest saves. No backfill
-- sends a request to someone who never received an explicit connection action.
create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  resident_id uuid not null references public.residents(id),
  sender_name text not null check(char_length(btrim(sender_name)) between 1 and 80),
  sender_group text not null check(sender_group in ('young-adult','adult','senior','family')),
  recipient_name text not null check(char_length(recipient_name) between 1 and 80),
  activity text not null check(activity in ('chess','cooking','gardening','language','dance','badminton','coding','guitar','fitness','photography','jogging')),
  role text not null check(role in ('teacher','learner','partner')),
  skill text check(skill is null or char_length(btrim(skill)) between 1 and 120),
  suggested_slot jsonb check(public.valid_connection_slot(suggested_slot)),
  status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(sender_id <> recipient_id)
);
create index if not exists connections_recipient_idx on public.connection_requests(recipient_id,created_at desc);
create index if not exists connections_sender_idx on public.connection_requests(sender_id,created_at desc);
create unique index if not exists connections_one_open_idx on public.connection_requests(sender_id,recipient_id,activity) where status in ('pending','accepted');
alter table public.connection_requests enable row level security;
revoke all on public.connection_requests from public,anon,authenticated;
grant select on public.connection_requests to authenticated;
grant all on public.connection_requests to service_role;
drop policy if exists connections_participant_read on public.connection_requests;
create policy connections_participant_read on public.connection_requests for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

-- Session identity, recipient and transitions are set in controlled functions.
-- Direct writes are denied even if a caller bypasses the app and uses REST.
create or replace function public.create_connection_request(
  p_client_request_id uuid, p_resident_id uuid, p_sender_name text, p_sender_group text,
  p_activity text, p_role text, p_skill text, p_suggested_slot jsonb
) returns public.connection_requests language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target public.residents%rowtype; result public.connection_requests%rowtype;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  -- Serialize one sender's retries and simultaneous tabs without locking other senders.
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select * into result from public.connection_requests where client_request_id=p_client_request_id and sender_id=actor;
  if found then
    if result.resident_id is distinct from p_resident_id or result.sender_name is distinct from p_sender_name
      or result.sender_group is distinct from p_sender_group or result.activity is distinct from p_activity
      or result.role is distinct from p_role or result.skill is distinct from p_skill
      or result.suggested_slot is distinct from p_suggested_slot then
      raise exception 'Request ID already used' using errcode='23505';
    end if;
    return result;
  end if;
  select * into target from public.residents where id=p_resident_id for share;
  if not found or target.is_demo or not target.is_active or target.owner_id is null or target.owner_id=actor then
    raise exception 'Neighbour unavailable' using errcode='23514';
  end if;
  if not exists(select 1 from jsonb_array_elements(target.intents) item where item->>'activity'=p_activity
    and item->>'role'=case p_role when 'teacher' then 'learner' when 'learner' then 'teacher' when 'partner' then 'partner' end) then
    raise exception 'Activity no longer matches' using errcode='23514';
  end if;
  if not public.valid_connection_slot(p_suggested_slot) then raise exception 'Invalid proposal' using errcode='23514'; end if;
  if p_suggested_slot is not null then
    if not exists(select 1 from public.facilities where id=(p_suggested_slot->>'facilityId')::uuid
      and name=p_suggested_slot->>'facilityName' and p_activity=any(activities))
      or (p_suggested_slot->>'startAt')::timestamptz <= now()
      or (p_suggested_slot->>'startAt')::timestamptz > now()+interval '14 days' then
      raise exception 'Proposal no longer available' using errcode='23514';
    end if;
  end if;
  insert into public.connection_requests(client_request_id,sender_id,recipient_id,resident_id,sender_name,sender_group,recipient_name,activity,role,skill,suggested_slot)
    values(p_client_request_id,actor,target.owner_id,target.id,p_sender_name,p_sender_group,target.name,p_activity,p_role,p_skill,p_suggested_slot)
    returning * into result;
  return result;
end;
$$;

create or replace function public.respond_connection_request(p_id uuid,p_status text)
returns public.connection_requests language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result public.connection_requests%rowtype;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into result from public.connection_requests where id=p_id and (sender_id=actor or recipient_id=actor) for update;
  if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
  if p_status in ('accepted','declined') then
    if actor <> result.recipient_id then raise exception 'Only recipient can respond' using errcode='42501'; end if;
    if result.status=p_status then return result; end if;
    if result.status <> 'pending' then raise exception 'Request already changed' using errcode='P0001'; end if;
  elsif p_status='cancelled' then
    if result.status='cancelled' then return result; end if;
    if not ((actor=result.sender_id and result.status='pending') or result.status='accepted') then
      raise exception 'Request cannot be cancelled' using errcode='P0001';
    end if;
  else raise exception 'Invalid response' using errcode='23514';
  end if;
  update public.connection_requests set status=p_status,updated_at=now() where id=p_id returning * into result;
  return result;
end;
$$;
revoke all on function public.valid_connection_slot(jsonb) from public,anon,authenticated;
revoke all on function public.create_connection_request(uuid,uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.respond_connection_request(uuid,text) from public,anon,authenticated;
grant execute on function public.create_connection_request(uuid,uuid,text,text,text,text,text,jsonb) to authenticated;
grant execute on function public.respond_connection_request(uuid,text) to authenticated;
grant execute on function public.valid_connection_slot(jsonb) to service_role;
commit;
notify pgrst,'reload schema';
