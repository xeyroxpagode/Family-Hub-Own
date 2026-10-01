-- P0-002A+B: Planner Idempotency Keys
-- Stores per-operation idempotency state for create mutations.
-- response_status uses 0 as in-flight placeholder, 100..599 for stored responses.

-- ============================================================================
-- PART A: planner_idempotency_keys table
-- ============================================================================

create table if not exists public.planner_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_member_id uuid not null references public.household_members(id) on delete cascade,
  idempotency_key text not null,
  operation text not null,
  request_hash text not null,
  response_status integer not null default 0,
  response_body jsonb not null default jsonb_build_object('__inflight', true),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);

-- ============================================================================
-- PART B: Constraints (idempotent via DO blocks)
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planner_idempotency_keys_idempotency_key_not_blank'
      and conrelid = 'public.planner_idempotency_keys'::regclass
  ) then
    alter table public.planner_idempotency_keys
      add constraint planner_idempotency_keys_idempotency_key_not_blank
      check (length(btrim(idempotency_key)) > 0);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planner_idempotency_keys_operation_not_blank'
      and conrelid = 'public.planner_idempotency_keys'::regclass
  ) then
    alter table public.planner_idempotency_keys
      add constraint planner_idempotency_keys_operation_not_blank
      check (length(btrim(operation)) > 0);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planner_idempotency_keys_response_status_valid'
      and conrelid = 'public.planner_idempotency_keys'::regclass
  ) then
    alter table public.planner_idempotency_keys
      add constraint planner_idempotency_keys_response_status_valid
      check (
        response_status = 0
        or (response_status >= 100 and response_status < 600)
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'planner_idempotency_keys_household_actor_op_key_uidx'
  ) then
    alter table public.planner_idempotency_keys
      add constraint planner_idempotency_keys_household_actor_op_key_uidx
      unique (household_id, actor_member_id, idempotency_key, operation);
  end if;
end;
$$;

-- ============================================================================
-- PART C: Indexes (idempotent via create index if not exists)
-- ============================================================================

create index if not exists planner_idempotency_keys_household_expires_idx
  on public.planner_idempotency_keys (household_id, expires_at);

create index if not exists planner_idempotency_keys_actor_expires_idx
  on public.planner_idempotency_keys (actor_member_id, expires_at);

create index if not exists planner_idempotency_keys_expires_idx
  on public.planner_idempotency_keys (expires_at);

-- ============================================================================
-- PART D: RLS
-- ============================================================================

alter table public.planner_idempotency_keys enable row level security;

drop policy if exists "planner_idempotency_keys_select_active_member"
on public.planner_idempotency_keys;
create policy "planner_idempotency_keys_select_active_member"
on public.planner_idempotency_keys
for select
to authenticated
using (
  public.is_active_household_member(household_id)
);

drop policy if exists "planner_idempotency_keys_insert_owner"
on public.planner_idempotency_keys;
create policy "planner_idempotency_keys_insert_owner"
on public.planner_idempotency_keys
for insert
to authenticated
with check (
  public.is_active_household_member(household_id)
  and actor_member_id = public.current_household_member_id(household_id)
);

drop policy if exists "planner_idempotency_keys_update_owner"
on public.planner_idempotency_keys;
create policy "planner_idempotency_keys_update_owner"
on public.planner_idempotency_keys
for update
to authenticated
using (
  public.is_active_household_member(household_id)
  and actor_member_id = public.current_household_member_id(household_id)
)
with check (
  public.is_active_household_member(household_id)
  and actor_member_id = public.current_household_member_id(household_id)
);

-- ============================================================================
-- PART E: Grants (no DELETE for authenticated)
-- ============================================================================

grant select, insert, update on public.planner_idempotency_keys to authenticated;

-- ============================================================================
-- PART F: RPC functions
-- ============================================================================

-- reserve_planner_idempotency_key
-- Creates/reuses an in-flight placeholder or returns replay state.
-- Raises 42501 on auth failure and 40007 on key conflict (mapped to 409 by backend).
create or replace function public.reserve_planner_idempotency_key(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_idempotency_key text,
  p_operation text,
  p_request_hash text,
  p_ttl_seconds integer default 86400
)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_existing record;
  v_expires_at timestamptz;
begin
  -- Validate required inputs
  if p_household_id is null then
    raise exception 'household_id es obligatorio.' using errcode = '42501';
  end if;
  if p_actor_member_id is null then
    raise exception 'actor_member_id es obligatorio.' using errcode = '42501';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key es obligatorio.' using errcode = '42501';
  end if;
  if p_operation is null or length(btrim(p_operation)) = 0 then
    raise exception 'operation es obligatorio.' using errcode = '42501';
  end if;
  if p_request_hash is null or length(btrim(p_request_hash)) = 0 then
    raise exception 'request_hash es obligatorio.' using errcode = '42501';
  end if;
  if p_ttl_seconds is null or p_ttl_seconds < 60 or p_ttl_seconds > 604800 then
    raise exception 'ttl_seconds debe estar entre 60 y 604800.' using errcode = '42501';
  end if;

  -- Validate active household member
  if not public.is_active_household_member(p_household_id) then
    raise exception 'No sos miembro activo del household.' using errcode = '42501';
  end if;

  -- Validate caller matches actor
  if p_actor_member_id <> public.current_household_member_id(p_household_id) then
    raise exception 'actor_member_id no coincide con el miembro actual.' using errcode = '42501';
  end if;

  v_expires_at := now() + (p_ttl_seconds || ' seconds')::interval;

  -- Lock existing row for the same key/operation scope
  select *
  into v_existing
  from public.planner_idempotency_keys
  where household_id = p_household_id
    and actor_member_id = p_actor_member_id
    and idempotency_key = p_idempotency_key
    and operation = p_operation
  for update;

  if v_existing is not null then
    -- Expired -> delete existing, insert fresh placeholder
    if v_existing.expires_at < now() then
      delete from public.planner_idempotency_keys
      where id = v_existing.id;

      insert into public.planner_idempotency_keys (
        household_id, actor_member_id, idempotency_key, operation,
        request_hash, response_status, response_body, expires_at
      ) values (
        p_household_id, p_actor_member_id, p_idempotency_key, p_operation,
        p_request_hash, 0, jsonb_build_object('__inflight', true), v_expires_at
      );

      return jsonb_build_object(
        'status', 'reserved',
        'response_status', 0,
        'response_body', jsonb_build_object('__inflight', true)
      );
    end if;

    -- Active existing row: same request_hash or conflict
    if v_existing.request_hash = p_request_hash then
      -- Touch last_seen_at
      update public.planner_idempotency_keys
      set last_seen_at = now()
      where id = v_existing.id;

      if v_existing.response_status = 0 then
        return jsonb_build_object(
          'status', 'in_flight',
          'response_status', 0,
          'response_body', jsonb_build_object('__inflight', true)
        );
      end if;

      return jsonb_build_object(
        'status', 'replay',
        'response_status', v_existing.response_status,
        'response_body', v_existing.response_body
      );
    end if;

    -- Different request_hash -> key already used with other payload
    -- Use errcode 40007 so backend can map to 409 idempotency_key_conflict.
    raise exception
      'La operacion ya fue procesada con otros datos.'
      using errcode = '40007';
  end if;

  -- Not found -> insert placeholder
  insert into public.planner_idempotency_keys (
    household_id, actor_member_id, idempotency_key, operation,
    request_hash, response_status, response_body, expires_at
  ) values (
    p_household_id, p_actor_member_id, p_idempotency_key, p_operation,
    p_request_hash, 0, jsonb_build_object('__inflight', true), v_expires_at
  );

  return jsonb_build_object(
    'status', 'reserved',
    'response_status', 0,
    'response_body', jsonb_build_object('__inflight', true)
  );
end;
$$;

-- complete_planner_idempotency_key
-- Stores final 2xx (or allowed) response on a previously reserved row.
create or replace function public.complete_planner_idempotency_key(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_idempotency_key text,
  p_operation text,
  p_response_status integer,
  p_response_body jsonb
)
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  -- Validate required inputs
  if p_household_id is null then
    raise exception 'household_id es obligatorio.' using errcode = '42501';
  end if;
  if p_actor_member_id is null then
    raise exception 'actor_member_id es obligatorio.' using errcode = '42501';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key es obligatorio.' using errcode = '42501';
  end if;
  if p_operation is null or length(btrim(p_operation)) = 0 then
    raise exception 'operation es obligatorio.' using errcode = '42501';
  end if;
  if p_response_status is null or p_response_status < 200 or p_response_status > 599 then
    raise exception 'response_status debe estar entre 200 y 599.' using errcode = '42501';
  end if;

  -- Validate active household member
  if not public.is_active_household_member(p_household_id) then
    raise exception 'No sos miembro activo del household.' using errcode = '42501';
  end if;
  if p_actor_member_id <> public.current_household_member_id(p_household_id) then
    raise exception 'actor_member_id no coincide con el miembro actual.' using errcode = '42501';
  end if;

  update public.planner_idempotency_keys
  set response_status = p_response_status,
      response_body = p_response_body,
      last_seen_at = now()
  where household_id = p_household_id
    and actor_member_id = p_actor_member_id
    and idempotency_key = p_idempotency_key
    and operation = p_operation;
end;
$$;

grant execute on function public.reserve_planner_idempotency_key(uuid, uuid, text, text, text, integer)
to authenticated;

grant execute on function public.complete_planner_idempotency_key(uuid, uuid, text, text, integer, jsonb)
to authenticated;
