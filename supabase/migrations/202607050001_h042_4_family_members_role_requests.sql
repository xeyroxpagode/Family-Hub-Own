-- Migration H-042.4B - Family Members Backend Final
-- Tabla: household_role_change_requests
--
-- Permite a miembros solicitar cambio de rol y a coordinadores aprobar/rechazar.

create extension if not exists "pgcrypto";

-- Tabla principal
create table if not exists public.household_role_change_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  membership_id uuid not null references public.household_members(id) on delete cascade,
  requested_by_member_id uuid not null references public.household_members(id),
  from_role text not null,
  requested_role text not null,
  reason text null,
  status text not null default 'pending',
  reviewed_by_member_id uuid null references public.household_members(id),
  reviewed_at timestamptz null,
  resolution_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraints
  constraint household_role_change_requests_status_check
    check (status in ('pending', 'approved', 'rejected', 'canceled')),
  constraint household_role_change_requests_from_role_check
    check (from_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')),
  constraint household_role_change_requests_requested_role_check
    check (requested_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')),
  constraint household_role_change_requests_role_changed_check
    check (requested_role <> from_role)
);

-- Índices
create index if not exists idx_role_requests_household_id
  on public.household_role_change_requests(household_id);

create index if not exists idx_role_requests_membership_id
  on public.household_role_change_requests(membership_id);

create index if not exists idx_role_requests_status
  on public.household_role_change_requests(status);

create index if not exists idx_role_requests_created_at
  on public.household_role_change_requests(created_at);

-- Única pending por membership
create unique index if not exists idx_role_requests_unique_pending
  on public.household_role_change_requests(membership_id)
  where status = 'pending';

-- Validacion cross-row: Postgres no permite subqueries en CHECK constraints.
create or replace function public.validate_household_role_change_request_memberships()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.household_members%rowtype;
  v_requester public.household_members%rowtype;
begin
  select *
  into v_target
  from public.household_members
  where id = new.membership_id;

  if not found then
    raise exception 'membership_not_found' using errcode = 'P0001';
  end if;

  select *
  into v_requester
  from public.household_members
  where id = new.requested_by_member_id;

  if not found then
    raise exception 'requester_membership_not_found' using errcode = 'P0001';
  end if;

  if v_target.household_id <> new.household_id or v_requester.household_id <> new.household_id then
    raise exception 'membership_household_mismatch' using errcode = '23514';
  end if;

  if new.reviewed_by_member_id is not null and not exists (
    select 1
    from public.household_members reviewer
    where reviewer.id = new.reviewed_by_member_id
      and reviewer.household_id = new.household_id
  ) then
    raise exception 'reviewer_membership_household_mismatch' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_role_requests_validate_memberships on public.household_role_change_requests;
create trigger trg_role_requests_validate_memberships
  before insert or update on public.household_role_change_requests
  for each row execute procedure public.validate_household_role_change_request_memberships();

-- Trigger updated_at
drop trigger if exists trg_role_requests_updated_at on public.household_role_change_requests;
create trigger trg_role_requests_updated_at
  before update on public.household_role_change_requests
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.household_role_change_requests enable row level security;

-- Políticas
drop policy if exists "role_requests_select_coordinator_or_self" on public.household_role_change_requests;
create policy "role_requests_select_coordinator_or_self"
  on public.household_role_change_requests for select to authenticated
  using (
    -- Coordinador del hogar ve todas
    public.is_active_household_coordinator(household_id)
    -- Miembro ve sus propias solicitudes
    or requested_by_member_id in (
      select id
      from public.household_members
      where person_id = public.current_person_id()
    )
  );

drop policy if exists "role_requests_insert_self" on public.household_role_change_requests;
create policy "role_requests_insert_self"
  on public.household_role_change_requests for insert to authenticated
  with check (
    -- Solo puede crear para su propia membership
    membership_id = requested_by_member_id
    and from_role <> requested_role
    and status = 'pending'
    and reviewed_by_member_id is null
    and reviewed_at is null
    and requested_by_member_id in (
      select hm.id
      from public.household_members hm
      join public.people p on p.id = hm.person_id
      where p.auth_user_id = public.effective_uid()
        and hm.household_id = public.household_role_change_requests.household_id
        and hm.status = 'active'
    )
  );

drop policy if exists "role_requests_update_coordinator" on public.household_role_change_requests;
create policy "role_requests_update_coordinator"
  on public.household_role_change_requests for update to authenticated
  using (public.is_active_household_coordinator(household_id))
  with check (public.is_active_household_coordinator(household_id));

drop policy if exists "role_requests_delete_blocked" on public.household_role_change_requests;
create policy "role_requests_delete_blocked"
  on public.household_role_change_requests for delete to authenticated
  using (false);

-- Función auxiliar: verificar si alguien es miembro activo del hogar
create or replace function public.is_household_member_active(p_household_id uuid, p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.person_id = p_person_id
      and hm.status = 'active'
  )
$$;

grant execute on function public.is_household_member_active(uuid, uuid) to authenticated;

create or replace function public.change_household_member_role(
  p_household_id uuid,
  p_membership_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.household_members%rowtype;
  v_target public.household_members%rowtype;
  v_active_coordinators_count integer;
begin
  if public.effective_uid() is null or public.current_person_id() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_role not in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest') then
    raise exception 'invalid_membership_role' using errcode = '22023';
  end if;

  select *
  into v_actor
  from public.household_members
  where household_id = p_household_id
    and person_id = public.current_person_id()
    and status = 'active';

  if not found then
    raise exception 'membership_not_active' using errcode = '22023';
  end if;

  if v_actor.role <> 'coordinator' then
    raise exception 'not_household_coordinator' using errcode = '42501';
  end if;

  select *
  into v_target
  from public.household_members
  where id = p_membership_id
    and household_id = p_household_id
  for update;

  if not found then
    raise exception 'membership_not_found' using errcode = 'P0001';
  end if;

  if v_target.status <> 'active' then
    raise exception 'target_membership_not_active' using errcode = '22023';
  end if;

  if v_target.role = p_role then
    raise exception 'same_membership_role' using errcode = '22023';
  end if;

  if v_target.role = 'coordinator' and p_role <> 'coordinator' then
    select count(*)
    into v_active_coordinators_count
    from public.household_members
    where household_id = p_household_id
      and status = 'active'
      and role = 'coordinator';

    if coalesce(v_active_coordinators_count, 0) <= 1 then
      raise exception 'cannot_leave_household_without_coordinator' using errcode = '22023';
    end if;
  end if;

  update public.household_members
  set role = p_role
  where id = p_membership_id
  returning * into v_target;

  update public.household_role_change_requests
  set status = 'approved',
      reviewed_by_member_id = v_actor.id,
      reviewed_at = now(),
      resolution_note = coalesce(resolution_note, 'approved_by_manual_role_change')
  where household_id = p_household_id
    and membership_id = p_membership_id
    and requested_role = p_role
    and status = 'pending';

  return jsonb_build_object('membership', to_jsonb(v_target), 'error', null);
end;
$$;

create or replace function public.create_household_role_change_request(
  p_household_id uuid,
  p_requested_role text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.household_members%rowtype;
  v_request public.household_role_change_requests%rowtype;
  v_active_coordinators_count integer;
begin
  if public.effective_uid() is null or public.current_person_id() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_requested_role not in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest') then
    raise exception 'invalid_membership_role' using errcode = '22023';
  end if;

  select *
  into v_actor
  from public.household_members
  where household_id = p_household_id
    and person_id = public.current_person_id()
    and status = 'active'
  for update;

  if not found then
    raise exception 'membership_not_active' using errcode = '22023';
  end if;

  if v_actor.role = p_requested_role then
    raise exception 'same_membership_role' using errcode = '22023';
  end if;

  if v_actor.role = 'coordinator' and p_requested_role <> 'coordinator' then
    select count(*)
    into v_active_coordinators_count
    from public.household_members
    where household_id = p_household_id
      and status = 'active'
      and role = 'coordinator';

    if coalesce(v_active_coordinators_count, 0) <= 1 then
      raise exception 'cannot_leave_household_without_coordinator' using errcode = '22023';
    end if;
  end if;

  if exists (
    select 1
    from public.household_role_change_requests
    where membership_id = v_actor.id
      and status = 'pending'
  ) then
    raise exception 'pending_role_request_exists' using errcode = '23505';
  end if;

  insert into public.household_role_change_requests (
    household_id,
    membership_id,
    requested_by_member_id,
    from_role,
    requested_role,
    reason
  )
  values (
    p_household_id,
    v_actor.id,
    v_actor.id,
    v_actor.role,
    p_requested_role,
    nullif(btrim(coalesce(p_reason, '')), '')
  )
  returning * into v_request;

  return jsonb_build_object('role_request', to_jsonb(v_request), 'error', null);
end;
$$;

create or replace function public.approve_household_role_change_request(
  p_household_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.household_members%rowtype;
  v_request public.household_role_change_requests%rowtype;
  v_target public.household_members%rowtype;
  v_active_coordinators_count integer;
begin
  if public.effective_uid() is null or public.current_person_id() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select *
  into v_actor
  from public.household_members
  where household_id = p_household_id
    and person_id = public.current_person_id()
    and status = 'active';

  if not found then
    raise exception 'membership_not_active' using errcode = '22023';
  end if;

  if v_actor.role <> 'coordinator' then
    raise exception 'not_household_coordinator' using errcode = '42501';
  end if;

  select *
  into v_request
  from public.household_role_change_requests
  where id = p_request_id
    and household_id = p_household_id
  for update;

  if not found then
    raise exception 'role_request_not_found' using errcode = 'P0001';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'role_request_not_pending' using errcode = '22023';
  end if;

  select *
  into v_target
  from public.household_members
  where id = v_request.membership_id
    and household_id = p_household_id
  for update;

  if not found then
    raise exception 'membership_not_found' using errcode = 'P0001';
  end if;

  if v_target.status <> 'active' then
    raise exception 'target_membership_not_active' using errcode = '22023';
  end if;

  if v_target.role = 'coordinator' and v_request.requested_role <> 'coordinator' then
    select count(*)
    into v_active_coordinators_count
    from public.household_members
    where household_id = p_household_id
      and status = 'active'
      and role = 'coordinator';

    if coalesce(v_active_coordinators_count, 0) <= 1 then
      raise exception 'cannot_leave_household_without_coordinator' using errcode = '22023';
    end if;
  end if;

  update public.household_members
  set role = v_request.requested_role
  where id = v_target.id
  returning * into v_target;

  update public.household_role_change_requests
  set status = 'approved',
      reviewed_by_member_id = v_actor.id,
      reviewed_at = now()
  where id = v_request.id
  returning * into v_request;

  return jsonb_build_object(
    'role_request', to_jsonb(v_request),
    'membership', to_jsonb(v_target),
    'error', null
  );
end;
$$;

create or replace function public.reject_household_role_change_request(
  p_household_id uuid,
  p_request_id uuid,
  p_resolution_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.household_members%rowtype;
  v_request public.household_role_change_requests%rowtype;
begin
  if public.effective_uid() is null or public.current_person_id() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select *
  into v_actor
  from public.household_members
  where household_id = p_household_id
    and person_id = public.current_person_id()
    and status = 'active';

  if not found then
    raise exception 'membership_not_active' using errcode = '22023';
  end if;

  if v_actor.role <> 'coordinator' then
    raise exception 'not_household_coordinator' using errcode = '42501';
  end if;

  select *
  into v_request
  from public.household_role_change_requests
  where id = p_request_id
    and household_id = p_household_id
  for update;

  if not found then
    raise exception 'role_request_not_found' using errcode = 'P0001';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'role_request_not_pending' using errcode = '22023';
  end if;

  update public.household_role_change_requests
  set status = 'rejected',
      reviewed_by_member_id = v_actor.id,
      reviewed_at = now(),
      resolution_note = nullif(btrim(coalesce(p_resolution_note, '')), '')
  where id = v_request.id
  returning * into v_request;

  return jsonb_build_object('role_request', to_jsonb(v_request), 'error', null);
end;
$$;

create or replace function public.cancel_household_role_change_request(
  p_household_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.household_members%rowtype;
  v_request public.household_role_change_requests%rowtype;
begin
  if public.effective_uid() is null or public.current_person_id() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select *
  into v_actor
  from public.household_members
  where household_id = p_household_id
    and person_id = public.current_person_id()
    and status = 'active';

  if not found then
    raise exception 'membership_not_active' using errcode = '22023';
  end if;

  select *
  into v_request
  from public.household_role_change_requests
  where id = p_request_id
    and household_id = p_household_id
  for update;

  if not found then
    raise exception 'role_request_not_found' using errcode = 'P0001';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'role_request_not_pending' using errcode = '22023';
  end if;

  if v_request.requested_by_member_id <> v_actor.id then
    raise exception 'not_role_request_owner' using errcode = '42501';
  end if;

  update public.household_role_change_requests
  set status = 'canceled'
  where id = v_request.id
  returning * into v_request;

  return jsonb_build_object('role_request', to_jsonb(v_request), 'error', null);
end;
$$;

grant execute on function public.change_household_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.create_household_role_change_request(uuid, text, text) to authenticated;
grant execute on function public.approve_household_role_change_request(uuid, uuid) to authenticated;
grant execute on function public.reject_household_role_change_request(uuid, uuid, text) to authenticated;
grant execute on function public.cancel_household_role_change_request(uuid, uuid) to authenticated;

-- Comentarios
comment on table public.household_role_change_requests is
  'Solicitudes de cambio de rol dentro de un hogar. Los miembros pueden solicitar cambios y los coordinadores aprueban/rechazan.';

comment on column public.household_role_change_requests.status is
  'pending: solicitud activa, approved: aprobada y aplicada, rejected: rechazada, canceled: cancelada por solicitante.';

comment on column public.household_role_change_requests.resolution_note is
  'Nota opcional del coordinador al aprobar/rechazar.';
