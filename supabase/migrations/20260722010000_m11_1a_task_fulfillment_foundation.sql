-- M11.1A - Task fulfillment data and security foundation.
-- Additive compatibility layer: Planner V0 columns remain available while
-- assignment and fulfillment become the canonical operational records.

begin;

-- --------------------------------------------------------------------------
-- Capability parity for the limited M11.1A security slice.
-- Household config.permissions is authoritative when it contains a boolean.
-- Otherwise this mirrors the existing Planner V0 backend defaults only for
-- capabilities exercised by this migration.
-- --------------------------------------------------------------------------

create or replace function public.planner_current_actor_has_capability(
  p_household_id uuid,
  p_capability text
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role text;
  v_config jsonb;
  v_configured jsonb;
begin
  select hm.role, h.config
  into v_role, v_config
  from public.household_members hm
  join public.households h on h.id = hm.household_id
  where hm.household_id = p_household_id
    and hm.person_id = public.current_person_id()
    and hm.status = 'active'
  limit 1;

  if v_role is null then
    return false;
  end if;

  v_configured := v_config -> 'permissions' -> p_capability -> v_role;
  if jsonb_typeof(v_configured) = 'boolean' then
    return (v_configured #>> '{}')::boolean;
  end if;

  return case p_capability
    when 'planner.view' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.create_household' then v_role in ('coordinator', 'adult', 'adolescent', 'senior')
    when 'task.complete_assigned' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.complete_unassigned' then v_role = 'coordinator'
    when 'task.complete_any' then v_role = 'coordinator'
    when 'task.verify' then v_role in ('coordinator', 'adult', 'senior')
    when 'task.edit_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.edit_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'task.cancel_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.cancel_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'task.restore' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    when 'goal.restore' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    else false
  end;
end;
$$;

revoke all on function public.planner_current_actor_has_capability(uuid, text)
from public, anon;
grant execute on function public.planner_current_actor_has_capability(uuid, text)
to authenticated, service_role;

-- Reject inconsistent legacy rows before adding relational constraints or
-- copying data. NULL member actors remain reportable only when a person actor
-- exists; a concrete member must always match household and person.
do $$
begin
  if exists (
    select 1
    from public.planner_tasks t
    where t.created_by_member_id is null
       or t.created_by_person_id is null
  ) then
    raise exception 'M11.1A backfill blocked: creator member/person is required';
  end if;

  if exists (
    select 1
    from public.planner_tasks t
    join public.household_members hm on hm.id = t.assigned_to_member_id
    where hm.household_id <> t.household_id
  ) then
    raise exception 'M11.1A backfill blocked: assigned member belongs to another household';
  end if;

  if exists (
    select 1
    from public.planner_tasks t
    join public.household_members hm on hm.id = t.completed_by_member_id
    where hm.household_id <> t.household_id
  ) then
    raise exception 'M11.1A backfill blocked: completion member belongs to another household';
  end if;

  if exists (
    select 1
    from public.planner_tasks t
    join public.household_members hm on hm.id = t.verified_by_member_id
    where hm.household_id <> t.household_id
  ) then
    raise exception 'M11.1A backfill blocked: verification member belongs to another household';
  end if;

  if exists (
    select 1
    from public.planner_tasks t
    join public.household_members hm on hm.id = t.cancelled_by_member_id
    where hm.household_id <> t.household_id
  ) then
    raise exception 'M11.1A backfill blocked: cancellation member belongs to another household';
  end if;

  if exists (
    select 1
    from public.planner_tasks t
    join public.household_members hm on hm.id = t.trashed_by_member_id
    where hm.household_id <> t.household_id
  ) then
    raise exception 'M11.1A backfill blocked: trash member belongs to another household';
  end if;

  if exists (
    select 1
    from public.planner_tasks t
    join public.household_members hm on hm.id = t.created_by_member_id
    where hm.household_id <> t.household_id
      or hm.person_id <> t.created_by_person_id
  ) then
    raise exception 'M11.1A backfill blocked: creator member/person/household mismatch';
  end if;

  if exists (
    select 1
    from public.planner_tasks t
    join public.household_members hm on hm.id = t.completed_by_member_id
    where t.completed_by_person_id is null
      or hm.person_id <> t.completed_by_person_id
  ) then
    raise exception 'M11.1A backfill blocked: completion member/person mismatch';
  end if;

  if exists (
    select 1
    from public.planner_tasks t
    join public.household_members hm on hm.id = t.verified_by_member_id
    where t.verified_by_person_id is null
      or hm.person_id <> t.verified_by_person_id
  ) then
    raise exception 'M11.1A backfill blocked: verification member/person mismatch';
  end if;

  if exists (
    select 1 from public.planner_tasks t
    where t.status = 'pending' and (
      t.completed_by_member_id is not null or t.completed_by_person_id is not null
      or t.completed_at is not null or t.verified_by_member_id is not null
      or t.verified_by_person_id is not null or t.verified_at is not null
      or t.cancelled_at is not null or t.cancelled_by_member_id is not null
      or t.cancelled_reason is not null or t.cancelled_from_status is not null
    )
  ) then
    raise exception 'M11.1A backfill blocked: pending task has terminal metadata';
  end if;

  if exists (
    select 1 from public.planner_tasks t
    where t.status = 'completed' and (
      t.completed_by_person_id is null or t.completed_at is null
      or t.verified_by_member_id is not null or t.verified_by_person_id is not null
      or t.verified_at is not null
      or t.cancelled_at is not null or t.cancelled_by_member_id is not null
      or t.cancelled_reason is not null or t.cancelled_from_status is not null
    )
  ) then
    raise exception 'M11.1A backfill blocked: completed task is inconsistent';
  end if;

  if exists (
    select 1 from public.planner_tasks t
    where t.status = 'awaiting_verification' and (
      t.completed_by_person_id is null or t.completed_at is null
      or t.verified_by_member_id is not null or t.verified_by_person_id is not null
      or t.verified_at is not null
      or t.cancelled_at is not null or t.cancelled_by_member_id is not null
      or t.cancelled_reason is not null or t.cancelled_from_status is not null
    )
  ) then
    raise exception 'M11.1A backfill blocked: awaiting_verification task is inconsistent';
  end if;

  if exists (
    select 1 from public.planner_tasks t
    where t.status = 'verified' and (
      t.completed_by_person_id is null or t.completed_at is null
      or t.verified_by_person_id is null or t.verified_at is null
      or t.cancelled_at is not null or t.cancelled_by_member_id is not null
      or t.cancelled_reason is not null or t.cancelled_from_status is not null
    )
  ) then
    raise exception 'M11.1A backfill blocked: verified task is inconsistent';
  end if;

  if exists (
    select 1 from public.planner_tasks t
    where t.status = 'cancelled' and (
      t.cancelled_at is null or t.cancelled_from_status is null
      or t.cancelled_from_status not in ('pending', 'completed', 'awaiting_verification', 'verified')
      or (
        t.cancelled_from_status = 'pending' and (
          t.completed_by_member_id is not null or t.completed_by_person_id is not null
          or t.completed_at is not null or t.verified_by_member_id is not null
          or t.verified_by_person_id is not null or t.verified_at is not null
        )
      )
      or (
        t.cancelled_from_status in ('completed', 'awaiting_verification', 'verified')
        and (t.completed_by_person_id is null or t.completed_at is null)
      )
      or (
        t.cancelled_from_status in ('completed', 'awaiting_verification') and (
          t.verified_by_member_id is not null or t.verified_by_person_id is not null
          or t.verified_at is not null
        )
      )
      or (
        t.cancelled_from_status = 'verified'
        and (t.verified_by_person_id is null or t.verified_at is null)
      )
    )
  ) then
    raise exception 'M11.1A backfill blocked: cancelled task is inconsistent';
  end if;
end;
$$;

-- Composite keys make household scope a relational invariant rather than a
-- convention enforced only by services.
alter table public.household_members
  add constraint household_members_id_household_id_key unique (id, household_id),
  add constraint household_members_id_person_household_id_key unique (id, person_id, household_id);

alter table public.planner_tasks
  add constraint planner_tasks_id_household_id_key unique (id, household_id),
  add constraint planner_tasks_assignee_household_fkey
    foreign key (assigned_to_member_id, household_id)
    references public.household_members(id, household_id) on delete restrict,
  add constraint planner_tasks_creator_actor_fkey
    foreign key (created_by_member_id, created_by_person_id, household_id)
    references public.household_members(id, person_id, household_id) on delete restrict,
  add constraint planner_tasks_completion_actor_fkey
    foreign key (completed_by_member_id, completed_by_person_id, household_id)
    references public.household_members(id, person_id, household_id) on delete restrict,
  add constraint planner_tasks_verification_actor_fkey
    foreign key (verified_by_member_id, verified_by_person_id, household_id)
    references public.household_members(id, person_id, household_id) on delete restrict,
  add constraint planner_tasks_cancel_actor_household_fkey
    foreign key (cancelled_by_member_id, household_id)
    references public.household_members(id, household_id) on delete restrict,
  add constraint planner_tasks_trash_actor_household_fkey
    foreign key (trashed_by_member_id, household_id)
    references public.household_members(id, household_id) on delete restrict,
  add constraint planner_tasks_actor_pair_shape_check check (
    (created_by_member_id is not null and created_by_person_id is not null)
    and (completed_by_member_id is null or completed_by_person_id is not null)
    and (verified_by_member_id is null or verified_by_person_id is not null)
  ),
  add constraint planner_tasks_cancellation_lifecycle_shape_check check (
    (
      status = 'cancelled'
      and cancelled_at is not null
      and cancelled_from_status is not null
      and cancelled_from_status in ('pending', 'completed', 'awaiting_verification', 'verified')
    )
    or (
      status <> 'cancelled'
      and cancelled_at is null
      and cancelled_by_member_id is null
      and cancelled_reason is null
      and cancelled_from_status is null
    )
  );

-- Direct Task access must make the same capability decisions as the backend.
drop policy if exists "planner_tasks_select_active_household" on public.planner_tasks;
create policy "planner_tasks_select_capability"
  on public.planner_tasks for select to authenticated
  using (
    public.is_active_household_member(household_id)
    and public.planner_current_actor_has_capability(household_id, 'planner.view')
  );

drop policy if exists "planner_tasks_insert_active_household" on public.planner_tasks;
create policy "planner_tasks_insert_capability"
  on public.planner_tasks for insert to authenticated
  with check (
    public.is_active_household_member(household_id)
    and public.planner_current_actor_has_capability(household_id, 'task.create_household')
    and created_by_member_id = public.current_household_member_id(household_id)
    and created_by_person_id = public.current_person_id()
    and status = 'pending'
    and completed_by_member_id is null
    and completed_by_person_id is null
    and completed_at is null
    and verified_by_member_id is null
    and verified_by_person_id is null
    and verified_at is null
    and cancelled_at is null
    and cancelled_by_member_id is null
    and cancelled_reason is null
    and cancelled_from_status is null
    and trashed_at is null
    and trashed_by_member_id is null
    and (
      assigned_to_member_id is null
      or exists (
        select 1 from public.household_members hm
        where hm.id = assigned_to_member_id
          and hm.household_id = planner_tasks.household_id
          and hm.status = 'active'
      )
    )
  );

drop policy if exists "planner_tasks_update_active_household" on public.planner_tasks;
create policy "planner_tasks_update_capability"
  on public.planner_tasks for update to authenticated
  using (
    public.is_active_household_member(household_id)
    and public.planner_current_actor_has_capability(household_id, 'planner.view')
    and (
      (
        created_by_member_id = public.current_household_member_id(household_id)
        and (
          public.planner_current_actor_has_capability(household_id, 'task.edit_own')
          or public.planner_current_actor_has_capability(household_id, 'task.cancel_own')
          or public.planner_current_actor_has_capability(household_id, 'task.restore')
        )
      )
      or (
        created_by_member_id is distinct from public.current_household_member_id(household_id)
        and (
          public.planner_current_actor_has_capability(household_id, 'task.edit_any')
          or public.planner_current_actor_has_capability(household_id, 'task.cancel_any')
          or public.planner_current_actor_has_capability(household_id, 'task.restore')
        )
      )
    )
  )
  with check (
    public.is_active_household_member(household_id)
    and public.planner_current_actor_has_capability(household_id, 'planner.view')
    and (
      assigned_to_member_id is null
      or exists (
        select 1 from public.household_members hm
        where hm.id = assigned_to_member_id
          and hm.household_id = planner_tasks.household_id
          and hm.status = 'active'
      )
    )
  );

-- --------------------------------------------------------------------------
-- Assignment model.
-- legacy_unassigned is migration-only and cannot be inserted by clients.
-- --------------------------------------------------------------------------

create table public.planner_task_assignment_configs (
  task_id uuid primary key,
  household_id uuid not null,
  assignment_kind text not null,
  fulfillment_mode text not null default 'shared_once',
  legacy_backfill boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_task_assignment_kind_check check (
    assignment_kind in ('anyone', 'members', 'legacy_unassigned')
  ),
  constraint planner_task_assignment_fulfillment_mode_check check (
    fulfillment_mode in ('shared_once', 'each_person')
  ),
  constraint planner_task_assignment_shape_check check (
    (assignment_kind = 'members')
    or fulfillment_mode = 'shared_once'
  ),
  constraint planner_task_assignment_legacy_check check (
    (assignment_kind = 'legacy_unassigned') = legacy_backfill
  ),
  constraint planner_task_assignment_task_household_fkey
    foreign key (task_id, household_id)
    references public.planner_tasks(id, household_id) on delete cascade,
  constraint planner_task_assignment_version_positive check (version >= 1)
);

create table public.planner_task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  household_id uuid not null,
  member_id uuid not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz null,
  constraint planner_task_assignees_task_household_fkey
    foreign key (task_id, household_id)
    references public.planner_tasks(id, household_id) on delete cascade,
  constraint planner_task_assignees_member_household_fkey
    foreign key (member_id, household_id)
    references public.household_members(id, household_id) on delete restrict,
  constraint planner_task_assignees_version_positive check (version >= 1)
);

create unique index planner_task_assignees_active_member_uidx
  on public.planner_task_assignees (task_id, member_id)
  where revoked_at is null;
create index planner_task_assignees_household_member_idx
  on public.planner_task_assignees (household_id, member_id)
  where revoked_at is null;

-- --------------------------------------------------------------------------
-- Fulfillment model. retired_at preserves obligations replaced by assignment
-- edits; inactive_at keeps cancelled Tasks out of the active obligation set.
-- --------------------------------------------------------------------------

create table public.planner_task_fulfillments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  household_id uuid not null,
  fulfillment_scope text not null,
  responsible_member_id uuid null,
  status text not null default 'pending',
  completed_by_member_id uuid null,
  completed_by_person_id uuid null references public.people(id) on delete set null,
  completed_at timestamptz null,
  verified_by_member_id uuid null,
  verified_by_person_id uuid null references public.people(id) on delete set null,
  verified_at timestamptz null,
  correction_requested_by_member_id uuid null,
  correction_requested_at timestamptz null,
  correction_comment text null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  inactive_at timestamptz null,
  retired_at timestamptz null,
  constraint planner_task_fulfillment_scope_check check (
    fulfillment_scope in ('shared', 'individual')
  ),
  constraint planner_task_fulfillment_scope_member_check check (
    (fulfillment_scope = 'shared' and responsible_member_id is null)
    or (fulfillment_scope = 'individual' and responsible_member_id is not null)
  ),
  constraint planner_task_fulfillment_task_household_fkey
    foreign key (task_id, household_id)
    references public.planner_tasks(id, household_id) on delete cascade,
  constraint planner_task_fulfillment_responsible_household_fkey
    foreign key (responsible_member_id, household_id)
    references public.household_members(id, household_id) on delete restrict,
  constraint planner_task_fulfillment_completion_actor_fkey
    foreign key (completed_by_member_id, completed_by_person_id, household_id)
    references public.household_members(id, person_id, household_id) on delete restrict,
  constraint planner_task_fulfillment_verification_actor_fkey
    foreign key (verified_by_member_id, verified_by_person_id, household_id)
    references public.household_members(id, person_id, household_id) on delete restrict,
  constraint planner_task_fulfillment_correction_actor_fkey
    foreign key (correction_requested_by_member_id, household_id)
    references public.household_members(id, household_id) on delete restrict,
  constraint planner_task_fulfillment_actor_pair_shape_check check (
    (completed_by_member_id is null or completed_by_person_id is not null)
    and (verified_by_member_id is null or verified_by_person_id is not null)
  ),
  constraint planner_task_fulfillment_status_check check (
    status in ('pending', 'completed', 'awaiting_verification', 'correction_requested', 'verified')
  ),
  constraint planner_task_fulfillment_state_actor_check check (
    (
      status = 'pending'
      and completed_by_member_id is null and completed_by_person_id is null and completed_at is null
      and verified_by_member_id is null and verified_by_person_id is null and verified_at is null
      and correction_requested_by_member_id is null and correction_requested_at is null
      and correction_comment is null
    )
    or (
      status = 'completed'
      and completed_by_person_id is not null and completed_at is not null
      and verified_by_member_id is null and verified_by_person_id is null and verified_at is null
      and correction_requested_by_member_id is null and correction_requested_at is null
      and correction_comment is null
    )
    or (
      status = 'awaiting_verification'
      and completed_by_person_id is not null and completed_at is not null
      and verified_by_member_id is null and verified_by_person_id is null and verified_at is null
      and correction_requested_by_member_id is null and correction_requested_at is null
      and correction_comment is null
    )
    or (
      status = 'correction_requested'
      and completed_by_person_id is not null and completed_at is not null
      and verified_by_member_id is null and verified_by_person_id is null and verified_at is null
      and correction_requested_by_member_id is not null and correction_requested_at is not null
    )
    or (
      status = 'verified'
      and completed_by_person_id is not null and completed_at is not null
      and verified_by_person_id is not null and verified_at is not null
    )
  ),
  constraint planner_task_fulfillment_version_positive check (version >= 1),
  constraint planner_task_fulfillment_correction_comment_check check (
    correction_comment is null or length(btrim(correction_comment)) > 0
  )
);

create unique index planner_task_fulfillments_current_shared_uidx
  on public.planner_task_fulfillments (task_id)
  where fulfillment_scope = 'shared' and retired_at is null;
create unique index planner_task_fulfillments_current_individual_uidx
  on public.planner_task_fulfillments (task_id, responsible_member_id)
  where fulfillment_scope = 'individual' and retired_at is null;
create index planner_task_fulfillments_household_status_idx
  on public.planner_task_fulfillments (household_id, status)
  where retired_at is null and inactive_at is null;
create index planner_task_fulfillments_responsible_idx
  on public.planner_task_fulfillments (responsible_member_id, status)
  where retired_at is null and inactive_at is null and responsible_member_id is not null;

-- Deferred cross-table invariant. Every transaction must finish with exactly
-- one assignment configuration and one current fulfillment shape matching it.
create or replace function public.planner_assert_task_fulfillment_invariants(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_task public.planner_tasks%rowtype;
  v_config public.planner_task_assignment_configs%rowtype;
  v_assignees integer;
  v_shared integer;
  v_individual integer;
  v_missing integer;
begin
  select * into v_task from public.planner_tasks where id = p_task_id;
  if not found then
    return;
  end if;

  select * into v_config
  from public.planner_task_assignment_configs
  where task_id = p_task_id;
  if not found then
    raise exception 'task assignment config missing'
      using errcode = '23514', constraint = 'planner_task_foundation_shape';
  end if;

  if v_config.household_id <> v_task.household_id then
    raise exception 'task assignment household mismatch'
      using errcode = '23514', constraint = 'planner_task_foundation_shape';
  end if;

  select count(*) into v_assignees
  from public.planner_task_assignees
  where task_id = p_task_id and revoked_at is null;

  select
    count(*) filter (where fulfillment_scope = 'shared'),
    count(*) filter (where fulfillment_scope = 'individual')
  into v_shared, v_individual
  from public.planner_task_fulfillments
  where task_id = p_task_id and retired_at is null;

  if v_config.assignment_kind in ('anyone', 'legacy_unassigned') then
    if v_assignees <> 0 or v_config.fulfillment_mode <> 'shared_once'
      or v_shared <> 1 or v_individual <> 0
      or v_task.assigned_to_member_id is not null
    then
      raise exception 'non-member assignment requires one shared fulfillment and no assignees'
        using errcode = '23514', constraint = 'planner_task_foundation_shape';
    end if;
  elsif v_config.assignment_kind = 'members' then
    if v_assignees = 0 then
      raise exception 'members assignment requires active assignees'
        using errcode = '23514', constraint = 'planner_task_foundation_shape';
    end if;

    if v_task.assigned_to_member_id is not null and not exists (
      select 1 from public.planner_task_assignees a
      where a.task_id = p_task_id
        and a.member_id = v_task.assigned_to_member_id
        and a.revoked_at is null
    ) then
      raise exception 'V0 assignee must remain in the canonical assignment'
        using errcode = '23514', constraint = 'planner_task_foundation_shape';
    end if;

    if v_config.fulfillment_mode = 'shared_once' then
      if v_shared <> 1 or v_individual <> 0 then
        raise exception 'members shared_once requires exactly one shared fulfillment'
          using errcode = '23514', constraint = 'planner_task_foundation_shape';
      end if;
    else
      if v_shared <> 0 or v_individual <> v_assignees then
        raise exception 'members each_person requires one individual fulfillment per assignee'
          using errcode = '23514', constraint = 'planner_task_foundation_shape';
      end if;

      select count(*) into v_missing
      from public.planner_task_assignees a
      where a.task_id = p_task_id and a.revoked_at is null
        and not exists (
          select 1 from public.planner_task_fulfillments f
          where f.task_id = p_task_id
            and f.responsible_member_id = a.member_id
            and f.fulfillment_scope = 'individual'
            and f.retired_at is null
        );
      if v_missing <> 0 then
        raise exception 'each_person fulfillment set does not match active assignees'
          using errcode = '23514', constraint = 'planner_task_foundation_shape';
      end if;
    end if;
  end if;

  if v_task.status = 'cancelled' and exists (
    select 1 from public.planner_task_fulfillments
    where task_id = p_task_id and retired_at is null and inactive_at is null
  ) then
    raise exception 'cancelled task cannot retain an operational fulfillment'
      using errcode = '23514', constraint = 'planner_task_foundation_shape';
  end if;

  if v_task.status <> 'cancelled' and exists (
    select 1 from public.planner_task_fulfillments
    where task_id = p_task_id and retired_at is null and inactive_at is not null
  ) then
    raise exception 'active task cannot retain an inactive current fulfillment'
      using errcode = '23514', constraint = 'planner_task_foundation_shape';
  end if;
end;
$$;

create or replace function public.planner_enforce_task_fulfillment_invariants()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.planner_assert_task_fulfillment_invariants(old.task_id);
  end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.task_id is distinct from old.task_id) then
    perform public.planner_assert_task_fulfillment_invariants(new.task_id);
  end if;
  return null;
end;
$$;

create or replace function public.planner_enforce_task_row_foundation_invariants()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op <> 'DELETE' then
    perform public.planner_assert_task_fulfillment_invariants(new.id);
  end if;
  return null;
end;
$$;

create constraint trigger planner_task_config_shape_constraint
  after insert or update or delete on public.planner_task_assignment_configs
  deferrable initially deferred for each row
  execute function public.planner_enforce_task_fulfillment_invariants();
create constraint trigger planner_task_assignee_shape_constraint
  after insert or update or delete on public.planner_task_assignees
  deferrable initially deferred for each row
  execute function public.planner_enforce_task_fulfillment_invariants();
create constraint trigger planner_task_fulfillment_shape_constraint
  after insert or update or delete on public.planner_task_fulfillments
  deferrable initially deferred for each row
  execute function public.planner_enforce_task_fulfillment_invariants();
create constraint trigger planner_task_row_foundation_shape_constraint
  after insert or update on public.planner_tasks
  deferrable initially deferred for each row
  execute function public.planner_enforce_task_row_foundation_invariants();

drop trigger if exists trg_planner_task_assignment_configs_updated_at
on public.planner_task_assignment_configs;
create trigger trg_planner_task_assignment_configs_updated_at
  before update on public.planner_task_assignment_configs
  for each row execute function public.set_updated_at();
drop trigger if exists trg_planner_task_assignment_configs_increment_version
on public.planner_task_assignment_configs;
create trigger trg_planner_task_assignment_configs_increment_version
  before update on public.planner_task_assignment_configs
  for each row execute function public.increment_planner_version();

drop trigger if exists trg_planner_task_assignees_updated_at
on public.planner_task_assignees;
create trigger trg_planner_task_assignees_updated_at
  before update on public.planner_task_assignees
  for each row execute function public.set_updated_at();
drop trigger if exists trg_planner_task_assignees_increment_version
on public.planner_task_assignees;
create trigger trg_planner_task_assignees_increment_version
  before update on public.planner_task_assignees
  for each row execute function public.increment_planner_version();

drop trigger if exists trg_planner_task_fulfillments_updated_at
on public.planner_task_fulfillments;
create trigger trg_planner_task_fulfillments_updated_at
  before update on public.planner_task_fulfillments
  for each row execute function public.set_updated_at();
drop trigger if exists trg_planner_task_fulfillments_increment_version
on public.planner_task_fulfillments;
create trigger trg_planner_task_fulfillments_increment_version
  before update on public.planner_task_fulfillments
  for each row execute function public.increment_planner_version();

alter table public.planner_task_assignment_configs enable row level security;
alter table public.planner_task_assignees enable row level security;
alter table public.planner_task_fulfillments enable row level security;

revoke all on public.planner_task_assignment_configs from public, anon, authenticated;
revoke all on public.planner_task_assignees from public, anon, authenticated;
revoke all on public.planner_task_fulfillments from public, anon, authenticated;
grant select on public.planner_task_assignment_configs to authenticated;
grant select on public.planner_task_assignees to authenticated;
grant select on public.planner_task_fulfillments to authenticated;
grant all on public.planner_task_assignment_configs to service_role;
grant all on public.planner_task_assignees to service_role;
grant all on public.planner_task_fulfillments to service_role;

create policy "planner_task_assignment_configs_select"
  on public.planner_task_assignment_configs for select to authenticated
  using (
    public.is_active_household_member(household_id)
    and public.planner_current_actor_has_capability(household_id, 'planner.view')
  );
create policy "planner_task_assignees_select"
  on public.planner_task_assignees for select to authenticated
  using (
    public.is_active_household_member(household_id)
    and public.planner_current_actor_has_capability(household_id, 'planner.view')
  );
create policy "planner_task_fulfillments_select"
  on public.planner_task_fulfillments for select to authenticated
  using (
    public.is_active_household_member(household_id)
    and public.planner_current_actor_has_capability(household_id, 'planner.view')
  );

-- --------------------------------------------------------------------------
-- Legacy backfill validations. Unsafe cross-household relationships abort the
-- migration. Person-only historical actors remain explicit and reportable.
-- --------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from public.planner_tasks t
    join public.household_members hm on hm.id = t.assigned_to_member_id
    where t.assigned_to_member_id is not null
      and hm.household_id <> t.household_id
  ) then
    raise exception 'M11.1A backfill blocked: assigned member belongs to another household';
  end if;

  if exists (
    select 1 from public.planner_tasks
    where status in ('completed', 'awaiting_verification', 'verified')
      and completed_at is null
  ) then
    raise exception 'M11.1A backfill blocked: completed legacy state without completed_at';
  end if;

  if exists (
    select 1 from public.planner_tasks
    where status = 'verified' and verified_at is null
  ) then
    raise exception 'M11.1A backfill blocked: verified legacy state without verified_at';
  end if;
end;
$$;

insert into public.planner_task_assignment_configs (
  task_id, household_id, assignment_kind, fulfillment_mode, legacy_backfill,
  version, created_at, updated_at
)
select
  t.id,
  t.household_id,
  case when t.assigned_to_member_id is null then 'legacy_unassigned' else 'members' end,
  'shared_once',
  t.assigned_to_member_id is null,
  greatest(t.version, 1),
  t.created_at,
  t.updated_at
from public.planner_tasks t;

insert into public.planner_task_assignees (
  task_id, household_id, member_id, version, created_at, updated_at
)
select
  t.id, t.household_id, t.assigned_to_member_id, greatest(t.version, 1),
  t.created_at, t.updated_at
from public.planner_tasks t
where t.assigned_to_member_id is not null;

insert into public.planner_task_fulfillments (
  task_id, household_id, fulfillment_scope, responsible_member_id, status,
  completed_by_member_id, completed_by_person_id, completed_at,
  verified_by_member_id, verified_by_person_id, verified_at,
  version, created_at, updated_at, inactive_at
)
select
  t.id,
  t.household_id,
  'shared',
  null,
  case
    when t.status = 'cancelled' then
      case
        when t.cancelled_from_status in ('completed', 'awaiting_verification', 'verified')
          then t.cancelled_from_status
        else 'pending'
      end
    else t.status
  end,
  t.completed_by_member_id,
  t.completed_by_person_id,
  t.completed_at,
  t.verified_by_member_id,
  t.verified_by_person_id,
  t.verified_at,
  greatest(t.version, 1),
  t.created_at,
  t.updated_at,
  case when t.status = 'cancelled' then coalesce(t.cancelled_at, t.updated_at) else null end
from public.planner_tasks t;

do $$
declare
  v_tasks bigint;
  v_configs bigint;
  v_fulfillments bigint;
begin
  select count(*) into v_tasks from public.planner_tasks;
  select count(*) into v_configs from public.planner_task_assignment_configs;
  select count(*) into v_fulfillments
  from public.planner_task_fulfillments where retired_at is null;

  if v_tasks <> v_configs or v_tasks <> v_fulfillments then
    raise exception 'M11.1A backfill count mismatch tasks %, configs %, fulfillments %',
      v_tasks, v_configs, v_fulfillments;
  end if;
end;
$$;

-- A stable verification query for migration tests and the implementation report.
create or replace function public.planner_m11_1a_backfill_report()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with task_categories as (
    select
      t.id,
      (t.created_by_member_id is null or t.created_by_person_id is null) as creator_unmappable,
      exists (
        select 1 from public.household_members hm
        where hm.id = t.assigned_to_member_id and hm.household_id <> t.household_id
      ) as assignee_cross_household,
      exists (
        select 1 from public.household_members hm
        where hm.id = t.completed_by_member_id and hm.household_id <> t.household_id
      ) as completion_cross_household,
      exists (
        select 1 from public.household_members hm
        where hm.id = t.verified_by_member_id and hm.household_id <> t.household_id
      ) as verification_cross_household,
      exists (
        select 1 from public.household_members hm
        where hm.id = t.cancelled_by_member_id and hm.household_id <> t.household_id
      ) as cancellation_cross_household,
      exists (
        select 1 from public.household_members hm
        where hm.id = t.trashed_by_member_id and hm.household_id <> t.household_id
      ) as trash_cross_household,
      exists (
        select 1 from public.household_members hm
        where (hm.id = t.created_by_member_id and (
                 hm.person_id is distinct from t.created_by_person_id
                 or hm.household_id is distinct from t.household_id
               ))
           or (hm.id = t.completed_by_member_id and hm.person_id is distinct from t.completed_by_person_id)
           or (hm.id = t.verified_by_member_id and hm.person_id is distinct from t.verified_by_person_id)
      ) as member_person_mismatch,
      (t.status = 'pending' and (
        (
          (
            t.completed_by_member_id is not null or t.completed_by_person_id is not null
            or t.completed_at is not null or t.verified_by_member_id is not null
            or t.verified_by_person_id is not null or t.verified_at is not null
          )
          and not exists (
            select 1 from public.planner_task_assignment_configs c
            where c.task_id = t.id and c.fulfillment_mode = 'each_person'
          )
        )
        or t.cancelled_at is not null or t.cancelled_by_member_id is not null
        or t.cancelled_reason is not null or t.cancelled_from_status is not null
      )) as pending_terminal_metadata,
      (t.status = 'completed' and (
        t.completed_by_person_id is null or t.completed_at is null
        or ((t.verified_by_member_id is not null or t.verified_by_person_id is not null
          or t.verified_at is not null) and not exists (
            select 1 from public.planner_task_assignment_configs c
            where c.task_id = t.id and c.fulfillment_mode = 'each_person'
          ))
        or t.cancelled_at is not null or t.cancelled_by_member_id is not null
        or t.cancelled_reason is not null or t.cancelled_from_status is not null
      )) as completed_inconsistent,
      (t.status = 'awaiting_verification' and (
        t.completed_by_person_id is null or t.completed_at is null
        or ((t.verified_by_member_id is not null or t.verified_by_person_id is not null
          or t.verified_at is not null) and not exists (
            select 1 from public.planner_task_assignment_configs c
            where c.task_id = t.id and c.fulfillment_mode = 'each_person'
          ))
        or t.cancelled_at is not null or t.cancelled_by_member_id is not null
        or t.cancelled_reason is not null or t.cancelled_from_status is not null
      )) as awaiting_verification_inconsistent,
      (t.status = 'verified' and (
        t.completed_by_person_id is null or t.completed_at is null
        or t.verified_by_person_id is null or t.verified_at is null
        or t.cancelled_at is not null or t.cancelled_by_member_id is not null
        or t.cancelled_reason is not null or t.cancelled_from_status is not null
      )) as verified_inconsistent,
      (t.status = 'cancelled' and (
        t.cancelled_at is null or t.cancelled_from_status is null
        or t.cancelled_from_status not in ('pending', 'completed', 'awaiting_verification', 'verified')
        or (t.cancelled_from_status = 'pending' and (
          t.completed_by_member_id is not null or t.completed_by_person_id is not null
          or t.completed_at is not null or t.verified_by_member_id is not null
          or t.verified_by_person_id is not null or t.verified_at is not null
        ))
        or (t.cancelled_from_status in ('completed', 'awaiting_verification', 'verified') and (
          t.completed_by_person_id is null or t.completed_at is null
        ))
        or (t.cancelled_from_status in ('completed', 'awaiting_verification') and (
          t.verified_by_member_id is not null or t.verified_by_person_id is not null
          or t.verified_at is not null
        ))
        or (t.cancelled_from_status = 'verified' and (
          t.verified_by_person_id is null or t.verified_at is null
        ))
      )) as cancelled_inconsistent,
      (
        exists (select 1 from public.planner_task_assignment_configs c where c.task_id = t.id and c.household_id <> t.household_id)
        or exists (select 1 from public.planner_task_assignees a where a.task_id = t.id and a.household_id <> t.household_id)
        or exists (select 1 from public.planner_task_fulfillments f where f.task_id = t.id and f.household_id <> t.household_id)
      ) as derived_household_inconsistent,
      (
        (select count(*) from public.planner_task_assignment_configs c where c.task_id = t.id) <> 1
        or not exists (
          select 1
          from public.planner_task_assignment_configs c
          where c.task_id = t.id
            and (
              (c.assignment_kind in ('anyone', 'legacy_unassigned')
                and c.fulfillment_mode = 'shared_once'
                and (select count(*) from public.planner_task_assignees a where a.task_id = t.id and a.revoked_at is null) = 0
                and (select count(*) from public.planner_task_fulfillments f where f.task_id = t.id and f.retired_at is null and f.fulfillment_scope = 'shared') = 1
                and (select count(*) from public.planner_task_fulfillments f where f.task_id = t.id and f.retired_at is null and f.fulfillment_scope = 'individual') = 0)
              or
              (c.assignment_kind = 'members' and c.fulfillment_mode = 'shared_once'
                and (select count(*) from public.planner_task_assignees a where a.task_id = t.id and a.revoked_at is null) > 0
                and (select count(*) from public.planner_task_fulfillments f where f.task_id = t.id and f.retired_at is null and f.fulfillment_scope = 'shared') = 1
                and (select count(*) from public.planner_task_fulfillments f where f.task_id = t.id and f.retired_at is null and f.fulfillment_scope = 'individual') = 0)
              or
              (c.assignment_kind = 'members' and c.fulfillment_mode = 'each_person'
                and (select count(*) from public.planner_task_assignees a where a.task_id = t.id and a.revoked_at is null) > 0
                and (select count(*) from public.planner_task_fulfillments f where f.task_id = t.id and f.retired_at is null and f.fulfillment_scope = 'shared') = 0
                and not exists (
                  select 1 from public.planner_task_assignees a
                  where a.task_id = t.id and a.revoked_at is null
                    and not exists (
                      select 1 from public.planner_task_fulfillments f
                      where f.task_id = t.id and f.retired_at is null
                        and f.fulfillment_scope = 'individual'
                        and f.responsible_member_id = a.member_id
                    )
                )
                and (select count(*) from public.planner_task_fulfillments f where f.task_id = t.id and f.retired_at is null and f.fulfillment_scope = 'individual')
                  = (select count(*) from public.planner_task_assignees a where a.task_id = t.id and a.revoked_at is null))
            )
        )
        or (t.status = 'cancelled' and exists (
          select 1 from public.planner_task_fulfillments f
          where f.task_id = t.id and f.retired_at is null and f.inactive_at is null
        ))
        or (t.status <> 'cancelled' and exists (
          select 1 from public.planner_task_fulfillments f
          where f.task_id = t.id and f.retired_at is null and f.inactive_at is not null
        ))
      ) as count_inconsistent
    from public.planner_tasks t
  ), categorized as (
    select tc.*,
      (
        creator_unmappable or assignee_cross_household or completion_cross_household
        or verification_cross_household or cancellation_cross_household
        or trash_cross_household or member_person_mismatch
        or pending_terminal_metadata or completed_inconsistent
        or awaiting_verification_inconsistent or verified_inconsistent
        or cancelled_inconsistent or derived_household_inconsistent or count_inconsistent
      ) as blocking
    from task_categories tc
  )
  select jsonb_build_object(
    'tasks_total', (select count(*) from public.planner_tasks),
    'assignment_configs', (select count(*) from public.planner_task_assignment_configs),
    'assignees_active', (select count(*) from public.planner_task_assignees where revoked_at is null),
    'fulfillments_current', (select count(*) from public.planner_task_fulfillments where retired_at is null),
    'legacy_unassigned', (select count(*) from public.planner_task_assignment_configs where assignment_kind = 'legacy_unassigned'),
    'unmappable_actors', (select count(*) from public.planner_tasks t where t.created_by_member_id is null or (t.completed_by_person_id is not null and t.completed_by_member_id is null) or (t.verified_by_person_id is not null and t.verified_by_member_id is null)),
    'creator_unmappable', (select count(*) from categorized where creator_unmappable),
    'unmapped_completed_actors', (select count(*) from public.planner_tasks where completed_by_person_id is not null and completed_by_member_id is null),
    'unmapped_verified_actors', (select count(*) from public.planner_tasks where verified_by_person_id is not null and verified_by_member_id is null),
    'assignee_cross_household', (select count(*) from categorized where assignee_cross_household),
    'completion_actor_cross_household', (select count(*) from categorized where completion_cross_household),
    'verification_actor_cross_household', (select count(*) from categorized where verification_cross_household),
    'cancellation_actor_cross_household', (select count(*) from categorized where cancellation_cross_household),
    'trash_actor_cross_household', (select count(*) from categorized where trash_cross_household),
    'actors_cross_household', (select count(*) from categorized where assignee_cross_household or completion_cross_household or verification_cross_household or cancellation_cross_household or trash_cross_household),
    'member_person_mismatch', (select count(*) from categorized where member_person_mismatch),
    'member_person_inconsistent', (select count(*) from categorized where creator_unmappable or member_person_mismatch),
    'pending_terminal_metadata', (select count(*) from categorized where pending_terminal_metadata),
    'completed_inconsistent', (select count(*) from categorized where completed_inconsistent),
    'awaiting_verification_inconsistent', (select count(*) from categorized where awaiting_verification_inconsistent),
    'verified_inconsistent', (select count(*) from categorized where verified_inconsistent),
    'cancelled_inconsistent', (select count(*) from categorized where cancelled_inconsistent),
    'state_timestamp_inconsistent', (select count(*) from categorized where pending_terminal_metadata or completed_inconsistent or awaiting_verification_inconsistent or verified_inconsistent or cancelled_inconsistent),
    'derived_household_inconsistent', (select count(*) from categorized where derived_household_inconsistent),
    'count_inconsistent', (select count(*) from categorized where count_inconsistent),
    'blocking_rows', (select count(*) from categorized where blocking),
    'cancelled_inactive', (select count(*) from public.planner_task_fulfillments where retired_at is null and inactive_at is not null)
  )
$$;
revoke all on function public.planner_m11_1a_backfill_report() from public, anon, authenticated;
grant execute on function public.planner_m11_1a_backfill_report() to service_role;

-- --------------------------------------------------------------------------
-- Internal compatibility helpers.
-- --------------------------------------------------------------------------

create or replace function public.planner_create_current_task_fulfillments(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_config public.planner_task_assignment_configs%rowtype;
  v_task public.planner_tasks%rowtype;
  v_count integer;
  v_status text;
  v_inactive_at timestamptz;
begin
  select * into v_config
  from public.planner_task_assignment_configs
  where task_id = p_task_id;

  if not found then
    raise exception 'task assignment config missing' using errcode = '23514';
  end if;

  select * into v_task from public.planner_tasks where id = p_task_id;
  if not found or v_task.household_id <> v_config.household_id then
    raise exception 'task/config household mismatch' using errcode = '23514';
  end if;

  v_status := case
    when v_task.status = 'cancelled' then
      case
        when v_task.cancelled_from_status in ('completed', 'awaiting_verification', 'verified')
          then v_task.cancelled_from_status
        else 'pending'
      end
    else v_task.status
  end;
  v_inactive_at := case when v_task.status = 'cancelled'
    then coalesce(v_task.cancelled_at, v_task.updated_at) else null end;

  select count(*) into v_count
  from public.planner_task_assignees
  where task_id = p_task_id and revoked_at is null;

  if v_config.assignment_kind = 'members' and v_count = 0 then
    raise exception 'members assignment requires at least one active assignee' using errcode = '23514';
  end if;
  if v_config.assignment_kind <> 'members' and v_count <> 0 then
    raise exception 'non-member assignment cannot contain active assignees' using errcode = '23514';
  end if;

  if v_config.assignment_kind = 'members' and v_config.fulfillment_mode = 'each_person' then
    insert into public.planner_task_fulfillments (
      task_id, household_id, fulfillment_scope, responsible_member_id, status,
      completed_by_member_id, completed_by_person_id, completed_at,
      verified_by_member_id, verified_by_person_id, verified_at, inactive_at
    )
    select p_task_id, v_config.household_id, 'individual', a.member_id, v_status,
      v_task.completed_by_member_id, v_task.completed_by_person_id, v_task.completed_at,
      v_task.verified_by_member_id, v_task.verified_by_person_id, v_task.verified_at,
      v_inactive_at
    from public.planner_task_assignees a
    where a.task_id = p_task_id and a.revoked_at is null
    on conflict do nothing;
  else
    insert into public.planner_task_fulfillments (
      task_id, household_id, fulfillment_scope, responsible_member_id, status,
      completed_by_member_id, completed_by_person_id, completed_at,
      verified_by_member_id, verified_by_person_id, verified_at, inactive_at
    ) values (
      p_task_id, v_config.household_id, 'shared', null, v_status,
      v_task.completed_by_member_id, v_task.completed_by_person_id, v_task.completed_at,
      v_task.verified_by_member_id, v_task.verified_by_person_id, v_task.verified_at,
      v_inactive_at
    )
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.planner_bootstrap_task_foundation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.planner_task_assignment_configs (
    task_id, household_id, assignment_kind, fulfillment_mode, legacy_backfill
  ) values (
    new.id,
    new.household_id,
    case when new.assigned_to_member_id is null then 'anyone' else 'members' end,
    'shared_once',
    false
  );

  if new.assigned_to_member_id is not null then
    insert into public.planner_task_assignees (task_id, household_id, member_id)
    values (new.id, new.household_id, new.assigned_to_member_id);
  end if;

  perform public.planner_create_current_task_fulfillments(new.id);

  return new;
end;
$$;

create trigger trg_planner_tasks_bootstrap_foundation
  after insert on public.planner_tasks
  for each row execute function public.planner_bootstrap_task_foundation();

create or replace function public.planner_sync_task_foundation_from_v0()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_has_history boolean;
begin
  if current_setting('homeplus.planner_internal_projection', true) = 'on' then
    return new;
  end if;

  if new.assigned_to_member_id is distinct from old.assigned_to_member_id then
    select exists (
      select 1 from public.planner_task_fulfillments
      where task_id = new.id and retired_at is null
        and (
          status <> 'pending'
          or completed_by_member_id is not null
          or completed_by_person_id is not null
          or completed_at is not null
          or verified_by_member_id is not null
          or verified_by_person_id is not null
          or verified_at is not null
          or correction_requested_by_member_id is not null
          or correction_requested_at is not null
          or correction_comment is not null
        )
    ) into v_has_history;

    if v_has_history then
      raise exception 'assignment_history_requires_explicit_transition'
        using errcode = 'P0001', detail = 'assignment_history_requires_explicit_transition';
    end if;

    update public.planner_task_assignment_configs
    set assignment_kind = case when new.assigned_to_member_id is null then 'anyone' else 'members' end,
        fulfillment_mode = 'shared_once',
        legacy_backfill = false
    where task_id = new.id;

    update public.planner_task_assignees
    set revoked_at = now()
    where task_id = new.id and revoked_at is null;

    if new.assigned_to_member_id is not null then
      insert into public.planner_task_assignees (task_id, household_id, member_id)
      values (new.id, new.household_id, new.assigned_to_member_id);
    end if;

    update public.planner_task_fulfillments
    set retired_at = now()
    where task_id = new.id and retired_at is null;
    perform public.planner_create_current_task_fulfillments(new.id);
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.planner_task_fulfillments
    set inactive_at = coalesce(new.cancelled_at, now())
    where task_id = new.id and retired_at is null and inactive_at is null;
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    update public.planner_task_fulfillments
    set inactive_at = null
    where task_id = new.id and retired_at is null;
  end if;

  return new;
end;
$$;

create trigger trg_planner_tasks_sync_foundation_from_v0
  after update of assigned_to_member_id, requires_verification, status
  on public.planner_tasks
  for each row execute function public.planner_sync_task_foundation_from_v0();

-- Direct clients may not spoof fulfillment actors or move the legacy status
-- graph. Canonical complete/verify RPCs set an internal transaction-local flag.
create or replace function public.planner_guard_task_fulfillment_projection()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_member_id uuid;
  v_is_own boolean;
  v_internal boolean;
  v_ordinary_edit boolean;
begin
  v_internal := current_setting('homeplus.planner_internal_projection', true) = 'on';

  if new.id is distinct from old.id or new.household_id is distinct from old.household_id then
    raise exception 'task household and identity are immutable'
      using errcode = '42501';
  end if;

  if new.created_by_member_id is distinct from old.created_by_member_id
    or new.created_by_person_id is distinct from old.created_by_person_id
  then
    raise exception 'task creator is immutable' using errcode = '42501';
  end if;

  if new.version is distinct from old.version then
    raise exception 'task version is managed internally' using errcode = '42501';
  end if;

  if new.assigned_to_member_id is not null and not exists (
    select 1 from public.household_members hm
    where hm.id = new.assigned_to_member_id
      and hm.household_id = new.household_id
      and hm.status = 'active'
  ) then
    raise exception 'assigned member must be active in the task household'
      using errcode = '23514';
  end if;

  if v_internal then
    return new;
  end if;

  v_actor_member_id := public.current_household_member_id(old.household_id);
  if v_actor_member_id is null then
    raise exception 'active authenticated membership required' using errcode = '42501';
  end if;
  v_is_own := old.created_by_member_id = v_actor_member_id;

  if new.completed_by_member_id is distinct from old.completed_by_member_id
    or new.completed_by_person_id is distinct from old.completed_by_person_id
    or new.completed_at is distinct from old.completed_at
    or new.verified_by_member_id is distinct from old.verified_by_member_id
    or new.verified_by_person_id is distinct from old.verified_by_person_id
    or new.verified_at is distinct from old.verified_at
  then
    raise exception 'fulfillment projection is read-only; use Planner RPC'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      if new.cancelled_at is null
        or new.cancelled_by_member_id is distinct from v_actor_member_id
        or new.cancelled_from_status is distinct from old.status
      then
        raise exception 'invalid task cancellation metadata' using errcode = '23514';
      end if;
      if not public.planner_current_actor_has_capability(
        old.household_id, case when v_is_own then 'task.cancel_own' else 'task.cancel_any' end
      ) then
        raise exception 'task cancellation forbidden' using errcode = '42501';
      end if;
    elsif old.status = 'cancelled'
      and new.status = coalesce(old.cancelled_from_status, 'pending')
    then
      if new.cancelled_at is not null or new.cancelled_by_member_id is not null
        or new.cancelled_reason is not null or new.cancelled_from_status is not null
      then
        raise exception 'invalid task reactivation metadata' using errcode = '23514';
      end if;
      if not public.planner_current_actor_has_capability(
        old.household_id, case when v_is_own then 'task.cancel_own' else 'task.cancel_any' end
      ) then
        raise exception 'task reactivation forbidden' using errcode = '42501';
      end if;
    else
      raise exception 'fulfillment projection is read-only; use Planner RPC'
        using errcode = '42501';
    end if;
  elsif new.cancelled_at is distinct from old.cancelled_at
    or new.cancelled_by_member_id is distinct from old.cancelled_by_member_id
    or new.cancelled_reason is distinct from old.cancelled_reason
    or new.cancelled_from_status is distinct from old.cancelled_from_status
  then
    raise exception 'task cancellation metadata is lifecycle-managed' using errcode = '42501';
  end if;

  if new.trashed_at is distinct from old.trashed_at then
    if not public.planner_current_actor_has_capability(old.household_id, 'task.restore') then
      raise exception 'task trash/restore forbidden' using errcode = '42501';
    end if;
    if new.trashed_at is not null and new.trashed_by_member_id is distinct from v_actor_member_id then
      raise exception 'invalid task trash actor' using errcode = '23514';
    end if;
    if new.trashed_at is null and new.trashed_by_member_id is not null then
      raise exception 'invalid task restore metadata' using errcode = '23514';
    end if;
  elsif new.trashed_by_member_id is distinct from old.trashed_by_member_id then
    raise exception 'task trash metadata is lifecycle-managed' using errcode = '42501';
  end if;

  v_ordinary_edit :=
    new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.priority is distinct from old.priority
    or new.template_key is distinct from old.template_key
    or new.category is distinct from old.category
    or new.due_date is distinct from old.due_date
    or new.due_time is distinct from old.due_time
    or new.requires_verification is distinct from old.requires_verification
    or new.assigned_to_member_id is distinct from old.assigned_to_member_id
    or new.origin_module is distinct from old.origin_module
    or new.origin_entity_type is distinct from old.origin_entity_type
    or new.origin_entity_id is distinct from old.origin_entity_id
    or new.origin_reason is distinct from old.origin_reason
    or new.goal_id is distinct from old.goal_id;

  if v_ordinary_edit and not public.planner_current_actor_has_capability(
    old.household_id, case when v_is_own then 'task.edit_own' else 'task.edit_any' end
  ) then
    raise exception 'task edit forbidden' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger trg_planner_tasks_guard_fulfillment_projection
  before update on public.planner_tasks
  for each row execute function public.planner_guard_task_fulfillment_projection();

create or replace function public.planner_refresh_task_v0_projection(p_task_id uuid)
returns public.planner_tasks
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_task public.planner_tasks%rowtype;
  v_status text;
  v_total integer;
  v_pending integer;
  v_waiting integer;
  v_verified integer;
  v_correction integer;
  v_completed_member uuid;
  v_completed_person uuid;
  v_completed_at timestamptz;
  v_verified_member uuid;
  v_verified_person uuid;
  v_verified_at timestamptz;
begin
  select * into v_task from public.planner_tasks where id = p_task_id for update;
  if not found then
    raise exception 'task not found' using errcode = 'P0002';
  end if;

  select
    count(*),
    count(*) filter (where status = 'pending'),
    count(*) filter (where status = 'awaiting_verification'),
    count(*) filter (where status = 'verified'),
    count(*) filter (where status = 'correction_requested')
  into v_total, v_pending, v_waiting, v_verified, v_correction
  from public.planner_task_fulfillments
  where task_id = p_task_id and retired_at is null and inactive_at is null;

  if v_total = 0 then
    v_status := 'pending';
  elsif v_correction > 0 or v_pending > 0 then
    v_status := 'pending';
  elsif v_waiting > 0 then
    v_status := 'awaiting_verification';
  elsif v_verified = v_total then
    v_status := 'verified';
  else
    v_status := 'completed';
  end if;

  select completed_by_member_id, completed_by_person_id, completed_at
  into v_completed_member, v_completed_person, v_completed_at
  from public.planner_task_fulfillments
  where task_id = p_task_id and retired_at is null and completed_at is not null
  order by completed_at desc limit 1;

  select verified_by_member_id, verified_by_person_id, verified_at
  into v_verified_member, v_verified_person, v_verified_at
  from public.planner_task_fulfillments
  where task_id = p_task_id and retired_at is null and verified_at is not null
  order by verified_at desc limit 1;

  perform set_config('homeplus.planner_internal_projection', 'on', true);
  begin
    update public.planner_tasks
    set status = v_status,
        completed_by_member_id = v_completed_member,
        completed_by_person_id = v_completed_person,
        completed_at = v_completed_at,
        verified_by_member_id = v_verified_member,
        verified_by_person_id = v_verified_person,
        verified_at = v_verified_at
    where id = p_task_id
    returning * into v_task;
  exception when others then
    perform set_config('homeplus.planner_internal_projection', 'off', true);
    raise;
  end;
  perform set_config('homeplus.planner_internal_projection', 'off', true);

  return v_task;
end;
$$;

-- --------------------------------------------------------------------------
-- Canonical V0 completion and verification operations.
-- Actor ids in the compatibility signature are validated but never trusted.
-- --------------------------------------------------------------------------

create or replace function public.complete_planner_task_with_audit(
  p_household_id uuid,
  p_task_id uuid,
  p_expected_version integer,
  p_actor_membership_id uuid,
  p_actor_account_id uuid,
  p_request_id text,
  p_mutation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_task public.planner_tasks%rowtype;
  v_updated public.planner_tasks%rowtype;
  v_config public.planner_task_assignment_configs%rowtype;
  v_fulfillment public.planner_task_fulfillments%rowtype;
  v_actor_account_id uuid;
  v_actor_person_id uuid;
  v_actor_member_id uuid;
  v_next_status text;
  v_audit_id uuid;
  v_is_assignee boolean;
begin
  v_actor_account_id := auth.uid();
  v_actor_person_id := public.current_person_id();
  v_actor_member_id := public.current_household_member_id(p_household_id);

  if v_actor_account_id is null or v_actor_person_id is null or v_actor_member_id is null then
    raise exception 'active authenticated membership required' using errcode = '42501';
  end if;
  if not public.planner_current_actor_has_capability(p_household_id, 'planner.view') then
    raise exception 'task completion forbidden' using errcode = '42501';
  end if;
  if p_actor_account_id is distinct from v_actor_account_id
    or p_actor_membership_id is distinct from v_actor_member_id
  then
    raise exception 'actor spoofing rejected' using errcode = '42501';
  end if;
  if p_expected_version is null then
    raise exception 'expected version required' using errcode = '22023';
  end if;

  select * into v_task
  from public.planner_tasks
  where id = p_task_id and household_id = p_household_id and trashed_at is null
  for update;
  if not found then return jsonb_build_object('outcome', 'not_found'); end if;
  if v_task.status = 'cancelled' then
    return jsonb_build_object('outcome', 'noop', 'task', to_jsonb(v_task), 'audit_event_id', null);
  end if;

  select * into v_config
  from public.planner_task_assignment_configs
  where task_id = p_task_id and household_id = p_household_id;
  if not found then
    raise exception 'task assignment config missing' using errcode = '23514';
  end if;

  select exists (
    select 1 from public.planner_task_assignees
    where task_id = p_task_id and member_id = v_actor_member_id and revoked_at is null
  ) into v_is_assignee;

  if v_config.assignment_kind = 'legacy_unassigned' then
    if not (
      public.planner_current_actor_has_capability(p_household_id, 'task.complete_unassigned')
      or public.planner_current_actor_has_capability(p_household_id, 'task.complete_any')
    ) then raise exception 'task completion forbidden' using errcode = '42501'; end if;
  elsif v_config.assignment_kind = 'anyone' then
    if not public.planner_current_actor_has_capability(p_household_id, 'task.complete_assigned') then
      raise exception 'task completion forbidden' using errcode = '42501';
    end if;
  elsif v_is_assignee then
    if not public.planner_current_actor_has_capability(p_household_id, 'task.complete_assigned') then
      raise exception 'task completion forbidden' using errcode = '42501';
    end if;
  elsif not public.planner_current_actor_has_capability(p_household_id, 'task.complete_any') then
    raise exception 'task completion forbidden' using errcode = '42501';
  end if;

  if v_config.fulfillment_mode = 'each_person' then
    select * into v_fulfillment
    from public.planner_task_fulfillments
    where task_id = p_task_id
      and responsible_member_id = v_actor_member_id
      and retired_at is null and inactive_at is null
    for update;
  else
    select * into v_fulfillment
    from public.planner_task_fulfillments
    where task_id = p_task_id and retired_at is null and inactive_at is null
    order by case when responsible_member_id = v_actor_member_id then 0 else 1 end
    limit 1
    for update;
  end if;

  if not found then
    raise exception 'active fulfillment missing' using errcode = '23514';
  end if;

  if v_task.version <> p_expected_version then
    if v_config.fulfillment_mode = 'shared_once'
      and v_fulfillment.status in ('completed', 'awaiting_verification', 'verified')
    then
      return jsonb_build_object(
        'outcome', 'noop', 'task', to_jsonb(v_task),
        'fulfillment_id', v_fulfillment.id, 'audit_event_id', null
      );
    end if;
    return jsonb_build_object('outcome', 'version_conflict', 'current_version', v_task.version);
  end if;

  if v_fulfillment.status in ('completed', 'awaiting_verification', 'verified') then
    return jsonb_build_object('outcome', 'noop', 'task', to_jsonb(v_task), 'audit_event_id', null);
  end if;

  v_next_status := case when v_task.requires_verification
    then 'awaiting_verification' else 'completed' end;
  update public.planner_task_fulfillments
  set status = v_next_status,
      completed_by_member_id = v_actor_member_id,
      completed_by_person_id = v_actor_person_id,
      completed_at = now(),
      verified_by_member_id = null,
      verified_by_person_id = null,
      verified_at = null,
      correction_requested_by_member_id = null,
      correction_requested_at = null,
      correction_comment = null
  where id = v_fulfillment.id;

  v_updated := public.planner_refresh_task_v0_projection(p_task_id);

  insert into public.audit_events (
    household_id, actor_membership_id, actor_account_id, domain, action,
    aggregate_type, aggregate_id, result, request_id, mutation_id,
    metadata_version, metadata
  ) values (
    p_household_id, v_actor_member_id, v_actor_account_id, 'planner', 'task.completed',
    'task', p_task_id, 'succeeded', p_request_id, p_mutation_id, 1,
    jsonb_build_object('from_status', v_task.status, 'to_status', v_updated.status)
  ) returning id into v_audit_id;

  return jsonb_build_object(
    'outcome', 'updated', 'task', to_jsonb(v_updated),
    'fulfillment_id', v_fulfillment.id, 'audit_event_id', v_audit_id
  );
end;
$$;

create or replace function public.verify_planner_task_fulfillment_with_audit(
  p_household_id uuid,
  p_task_id uuid,
  p_expected_version integer,
  p_request_id text,
  p_mutation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_task public.planner_tasks%rowtype;
  v_updated public.planner_tasks%rowtype;
  v_fulfillment public.planner_task_fulfillments%rowtype;
  v_actor_account_id uuid;
  v_actor_person_id uuid;
  v_actor_member_id uuid;
  v_audit_id uuid;
begin
  v_actor_account_id := auth.uid();
  v_actor_person_id := public.current_person_id();
  v_actor_member_id := public.current_household_member_id(p_household_id);

  if v_actor_account_id is null or v_actor_person_id is null or v_actor_member_id is null
    or not public.planner_current_actor_has_capability(p_household_id, 'planner.view')
    or not public.planner_current_actor_has_capability(p_household_id, 'task.verify')
  then raise exception 'task verification forbidden' using errcode = '42501'; end if;
  if p_expected_version is null then
    raise exception 'expected version required' using errcode = '22023';
  end if;

  select * into v_task
  from public.planner_tasks
  where id = p_task_id and household_id = p_household_id and trashed_at is null
  for update;
  if not found then return jsonb_build_object('outcome', 'not_found'); end if;
  if v_task.version <> p_expected_version then
    return jsonb_build_object('outcome', 'version_conflict', 'current_version', v_task.version);
  end if;

  select * into v_fulfillment
  from public.planner_task_fulfillments
  where task_id = p_task_id
    and status = 'awaiting_verification'
    and retired_at is null and inactive_at is null
  order by completed_at asc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('outcome', 'invalid_state');
  end if;
  if v_fulfillment.completed_by_member_id = v_actor_member_id
    or (
      v_fulfillment.completed_by_member_id is null
      and v_fulfillment.completed_by_person_id = v_actor_person_id
    )
  then return jsonb_build_object('outcome', 'self_verification'); end if;

  update public.planner_task_fulfillments
  set status = 'verified',
      verified_by_member_id = v_actor_member_id,
      verified_by_person_id = v_actor_person_id,
      verified_at = now()
  where id = v_fulfillment.id;

  v_updated := public.planner_refresh_task_v0_projection(p_task_id);

  insert into public.audit_events (
    household_id, actor_membership_id, actor_account_id, domain, action,
    aggregate_type, aggregate_id, result, request_id, mutation_id,
    metadata_version, metadata
  ) values (
    p_household_id, v_actor_member_id, v_actor_account_id, 'planner', 'task.verified',
    'task', p_task_id, 'succeeded', p_request_id, p_mutation_id, 1,
    jsonb_build_object('from_status', v_task.status, 'to_status', v_updated.status)
  ) returning id into v_audit_id;

  return jsonb_build_object(
    'outcome', 'updated', 'task', to_jsonb(v_updated),
    'fulfillment_id', v_fulfillment.id, 'audit_event_id', v_audit_id
  );
end;
$$;

revoke all on function public.complete_planner_task_with_audit(uuid, uuid, integer, uuid, uuid, text, text)
from public, anon;
grant execute on function public.complete_planner_task_with_audit(uuid, uuid, integer, uuid, uuid, text, text)
to authenticated, service_role;
revoke all on function public.verify_planner_task_fulfillment_with_audit(uuid, uuid, integer, text, text)
from public, anon;
grant execute on function public.verify_planner_task_fulfillment_with_audit(uuid, uuid, integer, text, text)
to authenticated, service_role;

-- --------------------------------------------------------------------------
-- Goal and Milestone restore: authenticated actor is derived internally.
-- Compatibility p_member_id remains in the signature but is never trusted.
-- --------------------------------------------------------------------------

create or replace function public.restore_goal_rpc(
  p_goal_id uuid,
  p_expected_version integer default null,
  p_member_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_goal public.planner_goals%rowtype;
  v_actor_member_id uuid;
begin
  if auth.uid() is null or public.current_person_id() is null then
    raise exception 'authenticated actor required' using errcode = '42501';
  end if;
  if p_expected_version is null then
    raise exception 'expected version required' using errcode = '22023';
  end if;

  select * into v_goal from public.planner_goals where id = p_goal_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'goal_not_found');
  end if;

  v_actor_member_id := public.current_household_member_id(v_goal.household_id);
  if v_actor_member_id is null
    or not public.planner_current_actor_has_capability(v_goal.household_id, 'goal.restore')
    or (v_goal.visibility = 'personal' and v_goal.created_by_member_id <> v_actor_member_id)
  then raise exception 'goal restore forbidden' using errcode = '42501'; end if;
  if p_member_id is not null and p_member_id <> v_actor_member_id then
    raise exception 'actor spoofing rejected' using errcode = '42501';
  end if;
  if v_goal.version <> p_expected_version then
    raise exception 'goal version conflict' using errcode = '40007';
  end if;
  if v_goal.trashed_at is null then
    return jsonb_build_object(
      'success', true, 'id', v_goal.id, 'version', v_goal.version, 'already_restored', true
    );
  end if;

  update public.planner_goals
  set trashed_at = null, trashed_by_member_id = null, deleted_at = null
  where id = p_goal_id
  returning * into v_goal;

  return jsonb_build_object('success', true, 'id', v_goal.id, 'version', v_goal.version);
end;
$$;

create or replace function public.restore_milestone_rpc(
  p_goal_id uuid,
  p_milestone_id uuid,
  p_expected_version integer default null,
  p_member_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_goal public.planner_goals%rowtype;
  v_milestone public.planner_goal_milestones%rowtype;
  v_actor_member_id uuid;
begin
  if auth.uid() is null or public.current_person_id() is null then
    raise exception 'authenticated actor required' using errcode = '42501';
  end if;
  if p_expected_version is null then
    raise exception 'expected version required' using errcode = '22023';
  end if;

  select * into v_goal from public.planner_goals where id = p_goal_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'goal_not_found');
  end if;
  if v_goal.trashed_at is not null then
    raise exception 'parent goal is in trash' using errcode = '55000';
  end if;

  v_actor_member_id := public.current_household_member_id(v_goal.household_id);
  if v_actor_member_id is null
    or not public.planner_current_actor_has_capability(v_goal.household_id, 'goal.restore')
    or (v_goal.visibility = 'personal' and v_goal.created_by_member_id <> v_actor_member_id)
  then raise exception 'milestone restore forbidden' using errcode = '42501'; end if;
  if p_member_id is not null and p_member_id <> v_actor_member_id then
    raise exception 'actor spoofing rejected' using errcode = '42501';
  end if;

  select * into v_milestone
  from public.planner_goal_milestones
  where id = p_milestone_id and goal_id = p_goal_id
  for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'milestone_not_found');
  end if;
  if v_milestone.version <> p_expected_version then
    raise exception 'milestone version conflict' using errcode = '40007';
  end if;
  if v_milestone.trashed_at is null then
    return jsonb_build_object(
      'success', true, 'id', v_milestone.id, 'version', v_milestone.version,
      'already_restored', true
    );
  end if;

  update public.planner_goal_milestones
  set trashed_at = null, trashed_by_member_id = null, deleted_at = null
  where id = p_milestone_id and goal_id = p_goal_id
  returning * into v_milestone;

  return jsonb_build_object(
    'success', true, 'id', v_milestone.id, 'version', v_milestone.version
  );
end;
$$;

revoke all on function public.restore_goal_rpc(uuid, integer, uuid) from public, anon;
grant execute on function public.restore_goal_rpc(uuid, integer, uuid) to authenticated, service_role;
revoke all on function public.restore_milestone_rpc(uuid, uuid, integer, uuid) from public, anon;
grant execute on function public.restore_milestone_rpc(uuid, uuid, integer, uuid) to authenticated, service_role;

-- Internal helpers are not callable through PostgREST.
revoke all on function public.planner_create_current_task_fulfillments(uuid)
from public, anon, authenticated;
revoke all on function public.planner_bootstrap_task_foundation()
from public, anon, authenticated;
revoke all on function public.planner_sync_task_foundation_from_v0()
from public, anon, authenticated;
revoke all on function public.planner_guard_task_fulfillment_projection()
from public, anon, authenticated;
revoke all on function public.planner_refresh_task_v0_projection(uuid)
from public, anon, authenticated;
revoke all on function public.planner_assert_task_fulfillment_invariants(uuid)
from public, anon, authenticated;
revoke all on function public.planner_enforce_task_fulfillment_invariants()
from public, anon, authenticated;
revoke all on function public.planner_enforce_task_row_foundation_invariants()
from public, anon, authenticated;

comment on table public.planner_task_assignment_configs is
  'M11.1A canonical Task assignment semantics. legacy_unassigned is backfill-only.';
comment on table public.planner_task_fulfillments is
  'M11.1A canonical Task fulfillment obligations; Planner V0 task fields are a compatibility projection.';
comment on function public.planner_m11_1a_backfill_report() is
  'Verification-only counts for M11.1A backfill and unresolved legacy ambiguity.';

commit;
